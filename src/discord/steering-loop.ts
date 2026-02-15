/**
 * src/discord/steering-loop.ts — Ask-and-Predict Autonomous Execution
 *
 * The "Permissionless but Supervised" protocol for the Sovereign Engine.
 *
 * TIERS:
 *   Admin (instant-execute)  → Any message dispatches immediately
 *   Trusted (ask-and-predict) → Bot posts intent, 30s countdown, auto-execute
 *   General (suggestion only) → Only executes when Admin thumbs-up blesses it
 *
 * SIGNAL PRIORITY:
 *   1. Admin Message (instant)
 *   2. Voice Memo Redirect (abort + replan)
 *   3. Admin Thumbs-Up (validation)
 *   4. Bot Prediction Timeout (auto-execute)
 *
 * CONFLICT:
 *   Latest signal wins, but contradictions are logged to #vault as "Strategic Pivot"
 */

import type { Logger } from '../types.js';

export type ExecutionTier = 'admin' | 'trusted' | 'general';

export interface PredictionEntry {
  id: string;
  room: string;
  channelId: string;
  prompt: string;
  tier: ExecutionTier;
  author: { id: string; username: string };
  predictedAction: string;
  alignedCategories: string[];
  createdAt: number;
  timeoutMs: number;
  timer: ReturnType<typeof setTimeout> | null;
  status: 'pending' | 'executing' | 'aborted' | 'redirected' | 'completed';
  messageId?: string;  // The prediction message in Discord
  abortReason?: string;
}

export interface SteeringConfig {
  askPredictTimeoutMs: number;
  redirectGracePeriodMs: number;
  maxConcurrentPredictions: number;
}

export type ExecuteCallback = (room: string, prompt: string) => Promise<boolean>;
export type PostCallback = (channelId: string, content: string) => Promise<string | null>;
export type EditCallback = (channelId: string, messageId: string, content: string) => Promise<void>;

export class SteeringLoop {
  private predictions: Map<string, PredictionEntry> = new Map();
  private log: Logger;
  private config: SteeringConfig;
  private executeCallback: ExecuteCallback;
  private postCallback: PostCallback;
  private editCallback: EditCallback;
  private counter = 0;

  constructor(
    log: Logger,
    config: SteeringConfig,
    executeCallback: ExecuteCallback,
    postCallback: PostCallback,
    editCallback: EditCallback,
  ) {
    this.log = log;
    this.config = config;
    this.executeCallback = executeCallback;
    this.postCallback = postCallback;
    this.editCallback = editCallback;
  }

  /**
   * Handle an incoming message based on the author's tier.
   *
   * Admin → instant execute
   * Trusted → ask and predict (30s countdown)
   * General → queue as suggestion (needs admin thumbs-up)
   */
  async handleMessage(
    tier: ExecutionTier,
    room: string,
    channelId: string,
    prompt: string,
    author: { id: string; username: string },
    categories: string[] = [],
  ): Promise<PredictionEntry> {
    const id = `pred-${++this.counter}-${Date.now()}`;

    const entry: PredictionEntry = {
      id,
      room,
      channelId,
      prompt,
      tier,
      author,
      predictedAction: prompt.substring(0, 100),
      alignedCategories: categories,
      createdAt: Date.now(),
      timeoutMs: this.config.askPredictTimeoutMs,
      timer: null,
      status: 'pending',
    };

    // Admin → instant execute
    if (tier === 'admin') {
      this.log.info(`[Steering] ADMIN instant-execute [${room}]: "${prompt.substring(0, 60)}"`);
      entry.status = 'executing';
      const success = await this.executeCallback(room, prompt);
      entry.status = success ? 'completed' : 'aborted';
      entry.abortReason = success ? undefined : 'Execution failed';
      return entry;
    }

    // Check concurrent limit
    const active = [...this.predictions.values()].filter(p => p.status === 'pending');
    if (active.length >= this.config.maxConcurrentPredictions) {
      this.log.warn(`[Steering] Max concurrent predictions (${this.config.maxConcurrentPredictions}) reached — queueing`);
    }

    this.predictions.set(id, entry);

    if (tier === 'trusted') {
      // Ask and Predict — post intent, start countdown
      await this.startPrediction(entry);
    } else {
      // General — post as suggestion only
      const msgId = await this.postCallback(
        channelId,
        `💡 **Suggestion from @${author.username}:**\n\`${prompt.substring(0, 200)}\`\n\n_Awaiting Admin reaction to execute._`,
      );
      if (msgId) entry.messageId = msgId;
      this.log.info(`[Steering] GENERAL suggestion queued [${room}]: "${prompt.substring(0, 60)}"`);
    }

    return entry;
  }

  /**
   * Start the ask-and-predict countdown for a trusted user's message.
   */
  private async startPrediction(entry: PredictionEntry): Promise<void> {
    const timeoutSec = entry.timeoutMs / 1000;
    const categoriesStr = entry.alignedCategories.length > 0
      ? entry.alignedCategories.join(', ')
      : 'general';

    // Post the prediction
    const msgId = await this.postCallback(
      entry.channelId,
      `🔮 **PREDICTION** [${entry.room}]\n` +
      `Action: \`${entry.predictedAction}\`\n` +
      `Aligned with: [${categoriesStr}]\n` +
      `⏱️ Proceeding in **${timeoutSec}s** — send message or voice memo to redirect.`,
    );
    if (msgId) entry.messageId = msgId;

    this.log.info(`[Steering] TRUSTED ask-and-predict [${entry.room}] (${timeoutSec}s): "${entry.predictedAction}"`);

    // Start countdown timer
    entry.timer = setTimeout(async () => {
      // Check if still pending (not aborted/redirected)
      if (entry.status !== 'pending') return;

      entry.status = 'executing';
      this.log.info(`[Steering] Prediction ${entry.id} executing (timeout reached)`);

      // Update the Discord message
      if (entry.messageId) {
        await this.editCallback(
          entry.channelId,
          entry.messageId,
          `⚡ **EXECUTING** [${entry.room}]\n` +
          `Action: \`${entry.predictedAction}\`\n` +
          `_No intervention received — proceeding autonomously._`,
        );
      }

      const success = await this.executeCallback(entry.room, entry.prompt);
      entry.status = success ? 'completed' : 'aborted';
      this.predictions.delete(entry.id);
    }, entry.timeoutMs);
  }

  /**
   * Redirect a pending prediction with a new signal.
   * Called when a voice memo or text message arrives during countdown.
   */
  async redirect(
    room: string,
    newPrompt: string,
    source: 'voice-memo' | 'text' | 'admin-override',
  ): Promise<PredictionEntry | null> {
    // Find pending prediction for this room
    const pending = [...this.predictions.values()].find(
      p => p.room === room && p.status === 'pending',
    );

    if (!pending) return null;

    // Abort the current prediction
    if (pending.timer) clearTimeout(pending.timer);
    pending.status = 'redirected';
    pending.abortReason = `Redirected by ${source}: ${newPrompt.substring(0, 60)}`;

    this.log.info(`[Steering] Prediction ${pending.id} REDIRECTED by ${source}`);

    // Update Discord message
    if (pending.messageId) {
      await this.editCallback(
        pending.channelId,
        pending.messageId,
        `🔄 **REDIRECTED** [${pending.room}]\n` +
        `Original: \`${pending.predictedAction}\`\n` +
        `Redirect: \`${newPrompt.substring(0, 100)}\`\n` +
        `Source: ${source}`,
      );
    }

    this.predictions.delete(pending.id);

    // Re-plan with the new signal
    const newEntry: PredictionEntry = {
      id: `pred-${++this.counter}-${Date.now()}`,
      room,
      channelId: pending.channelId,
      prompt: newPrompt,
      tier: pending.tier,
      author: pending.author,
      predictedAction: newPrompt.substring(0, 100),
      alignedCategories: pending.alignedCategories,
      createdAt: Date.now(),
      timeoutMs: this.config.askPredictTimeoutMs,
      timer: null,
      status: 'pending',
    };

    this.predictions.set(newEntry.id, newEntry);
    await this.startPrediction(newEntry);
    return newEntry;
  }

  /**
   * Handle Admin Thumbs-Up on a suggestion message.
   * This "blesses" a non-admin suggestion and triggers immediate execution.
   */
  async adminBless(
    messageId: string,
    adminUsername: string,
  ): Promise<boolean> {
    // Find the suggestion by its Discord message ID
    const entry = [...this.predictions.values()].find(
      p => p.messageId === messageId && p.tier === 'general' && p.status === 'pending',
    );

    if (!entry) return false;

    // Clear any timer
    if (entry.timer) clearTimeout(entry.timer);
    entry.status = 'executing';

    this.log.info(`[Steering] Admin @${adminUsername} blessed suggestion ${entry.id} — instant-execute`);

    // Update Discord message
    await this.editCallback(
      entry.channelId,
      messageId,
      `👍 **ADMIN BLESSED** by @${adminUsername}\n` +
      `Action: \`${entry.predictedAction}\`\n` +
      `_Executing immediately._`,
    );

    const success = await this.executeCallback(entry.room, entry.prompt);
    entry.status = success ? 'completed' : 'aborted';
    this.predictions.delete(entry.id);
    return success;
  }

  /**
   * Abort all pending predictions (emergency stop).
   */
  abortAll(): number {
    let count = 0;
    for (const [id, entry] of this.predictions) {
      if (entry.status === 'pending') {
        if (entry.timer) clearTimeout(entry.timer);
        entry.status = 'aborted';
        entry.abortReason = 'Emergency stop';
        count++;
      }
      this.predictions.delete(id);
    }
    this.log.info(`[Steering] Aborted ${count} pending predictions`);
    return count;
  }

  /**
   * Get active predictions for status reporting.
   */
  getActivePredictions(): PredictionEntry[] {
    return [...this.predictions.values()].filter(p => p.status === 'pending');
  }

  /**
   * Check if a room has a pending prediction.
   */
  hasPendingPrediction(room: string): boolean {
    return [...this.predictions.values()].some(
      p => p.room === room && p.status === 'pending',
    );
  }
}
