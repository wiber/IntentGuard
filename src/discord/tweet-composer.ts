/**
 * src/discord/tweet-composer.ts — Tweet-Style Discord Updates
 *
 * Every significant bot action generates a "tweet" — a short, punchy
 * Discord message that can be reacted to for cross-posting to X/Twitter.
 *
 * FORMAT:
 *   280 chars max. No markdown code blocks. Just impact.
 *   Includes: action, result, sovereignty score, hashtags.
 *
 * REACTION FLOW:
 *   Bot posts tweet → Admin reacts with 🐦 → Tweet queued for X/Twitter
 *   Bot posts tweet → Admin reacts with 🔄 → Repost to #tesseract-nu
 *
 * CHANNELS:
 *   Source:       Any cognitive room
 *   Display:      #trust-debt-public (primary), #tesseract-nu (game updates)
 *   Cross-post:   X/Twitter via thetadriven.com/api/tweet (future)
 */

import type { Logger, DiscordHelper } from '../types.js';
import {
  autoIntersection, intersection, detectCell, trustCategoriesToCell,
  formatTweetWithIntersection, pivotalQuestion, cellToRoom,
  type ShortRankIntersection,
} from './shortrank-notation.js';

export interface TweetData {
  /** The core message — max 280 chars */
  text: string;
  /** Which cognitive room generated this */
  room: string;
  /** Sovereignty score at time of generation */
  sovereignty: number;
  /** Category tags */
  categories: string[];
  /** Source event type */
  source: 'pipeline' | 'task-complete' | 'fim-denial' | 'steering-prediction'
    | 'voice-memo' | 'admin-command' | 'drift-detection' | 'status';
  /** Optional: explicit source cell code (e.g. 'B3') */
  sourceCell?: string;
  /** Optional: explicit target cell code (e.g. 'C1') */
  targetCell?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface TweetMessage {
  id: string;
  tweet: TweetData;
  discordMessageId?: string;
  channelId: string;
  postedAt: string;
  crossPosted: boolean;
  crossPostedTo?: string[];
}

/** Pending tweet draft awaiting approval in #x-posts */
export interface TweetDraft {
  id: string;
  text: string;
  topic: string;
  source: 'command' | 'scheduler' | 'auto';
  discordMessageId?: string;
  charCount: number;
  rewriteHistory: string[];
  createdAt: string;
}

const OLLAMA_ENDPOINT = 'http://localhost:11434';

export class TweetComposer {
  private log: Logger;
  private discord: DiscordHelper | undefined;
  private primaryChannelId: string | undefined;
  private gameChannelId: string | undefined;
  private xPostsChannelId: string | undefined;
  private history: TweetMessage[] = [];
  private counter = 0;

  /** Pending drafts awaiting approval — keyed by Discord message ID */
  readonly drafts = new Map<string, TweetDraft>();
  private draftCounter = 0;
  private dailyPostCount = 0;
  private dailyResetDate = '';
  readonly MAX_DAILY_POSTS = 10;

  constructor(log: Logger) {
    this.log = log;
  }

  // ─── Qwen 14B Drafting ───────────────────────────────────────

  /** Generate a tweet draft using Qwen 14B (local, free) */
  async draftWithQwen(topic: string): Promise<string> {
    const prompt = `You are a tweet writer for IntentGuard — an AI sovereignty project.
Write one punchy tweet about: ${topic}

Rules:
- Under 200 characters (leave room for hashtags)
- Technical but accessible
- Present tense, active voice
- No hashtags, no quotes, no emojis at start
- One clear insight or observation
- Just the tweet text, nothing else`;

    const raw = await this.callQwen(prompt);
    // Clean up: remove quotes, trim, enforce limit
    let draft = raw.replace(/^["']|["']$/g, '').trim();
    if (draft.length > 200) draft = draft.substring(0, 197) + '...';
    return draft;
  }

  /** Rewrite a tweet based on feedback using Qwen 14B */
  async rewriteWithQwen(currentText: string, feedback: string): Promise<string> {
    const prompt = `Rewrite this tweet based on the feedback.

Current tweet: "${currentText}"
Feedback: "${feedback}"

Rules:
- Under 200 characters
- Apply the feedback precisely
- Keep the core message
- No quotes, no hashtags
- Just the rewritten tweet text, nothing else`;

    const raw = await this.callQwen(prompt);
    let rewrite = raw.replace(/^["']|["']$/g, '').trim();
    if (rewrite.length > 200) rewrite = rewrite.substring(0, 197) + '...';
    return rewrite;
  }

  private async callQwen(prompt: string): Promise<string> {
    try {
      const resp = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:14b-instruct-q6_K',
          prompt,
          stream: false,
          options: { temperature: 0.7, num_predict: 100 },
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await resp.json() as { response?: string };
      return (data.response || '').trim();
    } catch (err) {
      this.log.error(`[TweetComposer] Qwen call failed: ${err}`);
      return '';
    }
  }

  // ─── Draft Queue ─────────────────────────────────────────────

  /** Create a draft, generate with Qwen, post embed to #x-posts */
  async createDraft(topic: string, source: TweetDraft['source']): Promise<TweetDraft | null> {
    if (!this.canPost()) {
      this.log.warn(`[TweetComposer] Rate limit: ${this.dailyPostCount}/${this.MAX_DAILY_POSTS} today`);
      return null;
    }

    const text = await this.draftWithQwen(topic);
    if (!text) return null;

    const id = `draft-${++this.draftCounter}-${Date.now()}`;
    const draft: TweetDraft = {
      id, text, topic, source,
      charCount: text.length,
      rewriteHistory: [],
      createdAt: new Date().toISOString(),
    };

    // Post to #x-posts as staging embed
    if (this.discord && this.xPostsChannelId) {
      const embed = this.formatDraftEmbed(draft);
      const msgId = await this.discord.sendToChannel(this.xPostsChannelId, embed);
      if (msgId) {
        draft.discordMessageId = msgId;
        this.drafts.set(msgId, draft);
      }
    }

    this.log.info(`[TweetComposer] Draft ${id}: "${text.substring(0, 60)}..."`);
    return draft;
  }

  /** Find a draft by its Discord message ID */
  findDraftByMessageId(messageId: string): TweetDraft | undefined {
    return this.drafts.get(messageId);
  }

  /** Get all pending drafts */
  getPendingDrafts(): TweetDraft[] {
    return Array.from(this.drafts.values());
  }

  /** Update draft text after rewrite */
  async updateDraft(messageId: string, newText: string, feedback: string): Promise<void> {
    const draft = this.drafts.get(messageId);
    if (!draft) return;

    draft.rewriteHistory.push(draft.text);
    draft.text = newText;
    draft.charCount = newText.length;

    // Edit the Discord message
    if (this.discord && this.xPostsChannelId && draft.discordMessageId) {
      try {
        await this.discord.editMessage?.(
          this.xPostsChannelId,
          draft.discordMessageId,
          this.formatDraftEmbed(draft),
        );
      } catch (err) {
        this.log.warn(`[TweetComposer] Failed to edit draft embed: ${err}`);
      }
    }
  }

  /** Remove draft after posting or killing */
  removeDraft(messageId: string): void {
    this.drafts.delete(messageId);
  }

  /** Check daily rate limit */
  canPost(): boolean {
    const today = new Date().toDateString();
    if (this.dailyResetDate !== today) {
      this.dailyPostCount = 0;
      this.dailyResetDate = today;
    }
    return this.dailyPostCount < this.MAX_DAILY_POSTS;
  }

  /** Increment daily post counter */
  markPosted(): void {
    this.dailyPostCount++;
  }

  /** Format a draft as Discord embed text */
  private formatDraftEmbed(draft: TweetDraft): string {
    const bar = draft.charCount <= 200 ? '🟢' : draft.charCount <= 250 ? '🟡' : '🔴';
    return [
      `🐦 **Tweet Draft** — React 👍 to publish to X | 🗑️ to kill`,
      `> ${draft.text}`,
      `${bar} ${draft.charCount}/280 chars | Topic: ${draft.topic} | ID: \`${draft.id}\``,
      draft.rewriteHistory.length > 0
        ? `📝 Rewritten ${draft.rewriteHistory.length}x — reply with feedback to rewrite again`
        : `💬 Reply with feedback to rewrite`,
    ].join('\n');
  }

  /**
   * Bind to Discord channels.
   * @param xPostsChannelId - Optional #x-posts channel for tweet staging and admin approval
   */
  bind(discord: DiscordHelper, primaryChannelId: string, gameChannelId?: string, xPostsChannelId?: string): void {
    this.discord = discord;
    this.primaryChannelId = primaryChannelId;
    this.gameChannelId = gameChannelId;
    this.xPostsChannelId = xPostsChannelId;
    this.log.info(`TweetComposer bound → primary: ${primaryChannelId}${gameChannelId ? `, game: ${gameChannelId}` : ''}${xPostsChannelId ? `, x-posts: ${xPostsChannelId}` : ''}`);
  }

  /**
   * Resolve the ShortRank intersection for a tweet.
   * Uses explicit cells if provided, otherwise auto-detects from text + categories.
   */
  resolveIntersection(data: TweetData): ShortRankIntersection {
    // Explicit cells override auto-detection
    if (data.sourceCell && data.targetCell) {
      return intersection(data.sourceCell, data.targetCell);
    }

    // Use trust-debt categories to find source cell, text detection for target
    if (data.categories.length > 0) {
      const sourceCode = trustCategoriesToCell(data.categories);
      const detected = detectCell(data.text);
      const targetCode = detected.confidence > 0.2 ? detected.cell : sourceCode;
      return intersection(sourceCode, targetCode);
    }

    // Fallback: auto-detect from text
    return autoIntersection(data.text);
  }

  /**
   * Compose a tweet from structured data.
   * Format: ShortRank intersection prefix + text + sovereignty footer.
   * CONSTRAINT: Maximum 280 characters (X/Twitter limit).
   */
  compose(data: TweetData): string {
    const ix = this.resolveIntersection(data);
    const sovereigntyEmoji = data.sovereignty >= 0.8 ? '🟢'
      : data.sovereignty >= 0.6 ? '🟡' : '🔴';

    const tags = data.categories.slice(0, 3).map(c => `#${c}`).join(' ');
    const sovereigntyStr = `${sovereigntyEmoji} S:${(data.sovereignty * 100).toFixed(0)}%`;

    // Build tweet with ShortRank intersection prefix
    const header = ix.notation;
    const footer = `${sovereigntyStr} | ${tags} | #IntentGuard`;

    // Full format: intersection\ntext\nfooter
    const full = `${header}\n${data.text}\n${footer}`;

    // Enforce 280-character limit (X/Twitter constraint)
    if (full.length <= 280) return full;

    // Truncate text to fit within 280 chars
    const maxText = 280 - header.length - footer.length - 6; // \n x2 + "..."
    if (maxText < 10) {
      // If we can't fit meaningful text, just use minimal format
      const minimal = `${data.text.substring(0, 240)}... | ${sovereigntyStr}`;
      return minimal.substring(0, 280);
    }
    return `${header}\n${data.text.substring(0, maxText)}...\n${footer}`;
  }

  /**
   * Generate a pivotal question for the cognitive room this tweet maps to.
   */
  generatePivotalQuestion(data: TweetData): { question: string; predictedAnswer: string; room: string } {
    const ix = this.resolveIntersection(data);
    return pivotalQuestion(ix.source.code, data.text);
  }

  /**
   * Callback to send pivotal questions to cognitive rooms.
   * Set by runtime after construction.
   */
  onPivotalQuestion?: (room: string, question: string, predictedAnswer: string) => Promise<void>;

  /**
   * Callback to forward tweet drafts to #x-posts for admin approval.
   * Set by runtime. When admin reacts 👍 → browser posts to X.
   */
  onTweetPosted?: (tweetText: string) => Promise<void>;

  /**
   * Post a tweet to the primary channel.
   * Also generates and sends a pivotal question to the relevant cognitive room.
   */
  async post(data: TweetData): Promise<TweetMessage | null> {
    if (!this.discord || !this.primaryChannelId) return null;

    const text = this.compose(data);
    const id = `tweet-${++this.counter}-${Date.now()}`;

    try {
      const msgId = await this.discord.sendToChannel(this.primaryChannelId, text);

      const message: TweetMessage = {
        id,
        tweet: data,
        discordMessageId: msgId || undefined,
        channelId: this.primaryChannelId,
        postedAt: new Date().toISOString(),
        crossPosted: false,
      };

      this.history.push(message);
      if (this.history.length > 500) this.history = this.history.slice(-250);

      this.log.info(`[Tweet] Posted ${id}: "${data.text.substring(0, 60)}..."`);

      // Forward draft to #x-posts for admin approval → X publishing
      if (this.xPostsChannelId && this.discord) {
        const stagingMsg = `🐦 **Tweet Draft** (React 👍 to publish to X)\n\n${text}`;
        const stagingMsgId = await this.discord.sendToChannel(this.xPostsChannelId, stagingMsg);
        if (stagingMsgId) {
          message.metadata = { ...message.metadata, xPostsStagingMsgId: stagingMsgId };
          this.log.info(`[Tweet] Staged in #x-posts: ${stagingMsgId}`);
        }
      }

      // Legacy callback for external integrations
      if (this.onTweetPosted) {
        await this.onTweetPosted(text);
      }

      // Generate and send pivotal question to the relevant cognitive room
      if (this.onPivotalQuestion) {
        const pq = this.generatePivotalQuestion(data);
        await this.onPivotalQuestion(
          pq.room,
          `**Pivotal Question:** ${pq.question}`,
          `**Predicted Answer:** ${pq.predictedAnswer}`,
        );
      }

      return message;
    } catch (err) {
      this.log.error(`[Tweet] Post failed: ${err}`);
      return null;
    }
  }

  /**
   * Cross-post a tweet to the game channel (#tesseract-nu).
   */
  async crossPostToGame(tweetId: string): Promise<boolean> {
    if (!this.discord || !this.gameChannelId) return false;

    const tweet = this.history.find(t => t.id === tweetId);
    if (!tweet) return false;

    const text = `🎮 ${this.compose(tweet.tweet)}`;
    await this.discord.sendToChannel(this.gameChannelId, text);
    tweet.crossPosted = true;
    tweet.crossPostedTo = [...(tweet.crossPostedTo || []), 'tesseract-nu'];
    return true;
  }

  /**
   * Callback for X posting when admin approves with 👍 reaction.
   * Set by runtime after XPoster is initialized.
   */
  onXPost?: (tweetText: string, discordMessageId: string) => Promise<void>;

  /**
   * Handle a reaction on a tweet message.
   * 👍 = publish to X/Twitter (on #x-posts staging messages)
   * 🐦 = queue for X/Twitter (legacy)
   * 🔄 = repost to #tesseract-nu
   */
  async handleReaction(messageId: string, emoji: string, isAdmin: boolean): Promise<string | null> {
    if (!isAdmin) return null;

    // Check if this is a staging message in #x-posts
    const stagingTweet = this.history.find(t => t.metadata?.xPostsStagingMsgId === messageId);

    if (stagingTweet && emoji === '👍') {
      // Admin approved with thumbs-up → publish to X
      const tweetText = this.compose(stagingTweet.tweet);
      this.log.info(`[Tweet] Admin approved with 👍 → publishing to X: ${stagingTweet.id}`);

      if (this.onXPost) {
        await this.onXPost(tweetText, messageId);
        return `published-to-x:${stagingTweet.id}`;
      }
      return `x-post-requested:${stagingTweet.id}`;
    }

    // Handle reactions on primary channel tweets
    const tweet = this.history.find(t => t.discordMessageId === messageId);
    if (!tweet) return null;

    if (emoji === '🐦' || emoji === '🕊️') {
      // Legacy: Queue for X/Twitter
      this.log.info(`[Tweet] Queued for X/Twitter: ${tweet.id}`);
      return `queued-twitter:${tweet.id}`;
    }

    if (emoji === '🔄') {
      const success = await this.crossPostToGame(tweet.id);
      return success ? `crossposted:${tweet.id}` : null;
    }

    return null;
  }

  // ─── Pre-Built Tweet Templates ────────────────────────────────

  /**
   * Generate a tweet for a pipeline completion.
   */
  pipelineTweet(sovereigntyScore: number, alignmentPercent: number, trustDebtUnits: number, categoriesActive: number): TweetData {
    return {
      text: `Pipeline complete. Sovereignty: ${(sovereigntyScore * 100).toFixed(0)}% | Alignment: ${alignmentPercent.toFixed(0)}% | Trust Debt: ${trustDebtUnits} units | ${categoriesActive}/20 active.`,
      room: 'operator',
      sovereignty: sovereigntyScore,
      categories: ['trust_debt', 'transparency', 'accountability'],
      source: 'pipeline',
      sourceCell: 'C2',  // Operations.Loop — pipeline is a loop
      targetCell: 'B3',  // Tactics.Signal — reporting results
    };
  }

  /**
   * Generate a tweet for a task completion.
   */
  taskTweet(room: string, taskSummary: string, success: boolean, sovereignty: number): TweetData {
    return {
      text: success
        ? `Task in #${room} completed: ${taskSummary}`
        : `Task in #${room} failed: ${taskSummary}`,
      room,
      sovereignty,
      categories: ['reliability', 'accountability'],
      source: 'task-complete',
      sourceCell: 'C1',  // Operations.Grid — task execution
      // targetCell auto-detected from text
    };
  }

  /**
   * Generate a tweet for a FIM denial.
   */
  fimDenialTweet(toolName: string, overlap: number, sovereignty: number): TweetData {
    return {
      text: `FIM DENIED "${toolName}" — overlap ${(overlap * 100).toFixed(0)}% below threshold. The geometry held.`,
      room: 'vault',
      sovereignty,
      categories: ['security', 'transparency'],
      source: 'fim-denial',
      sourceCell: 'A1',  // Strategy.Law — compliance check
      targetCell: 'C1',  // Operations.Grid — infrastructure security
    };
  }

  /**
   * Generate a tweet for a steering prediction.
   */
  predictionTweet(room: string, action: string, timeoutSec: number, sovereignty: number): TweetData {
    return {
      text: `Predicting: "${action}" in #${room}. ${timeoutSec}s unless redirected.`,
      room,
      sovereignty,
      categories: ['accountability', 'transparency'],
      source: 'steering-prediction',
      sourceCell: 'B3',  // Tactics.Signal — broadcasting prediction
      // targetCell auto-detected from action text
    };
  }

  /**
   * Generate a tweet for drift detection.
   */
  driftTweet(category: string, driftPercent: number, sovereignty: number): TweetData {
    return {
      text: `Drift in "${category}" — ${driftPercent.toFixed(0)}% gap intent vs reality. Steering correction initiated.`,
      room: 'architect',
      sovereignty,
      categories: [category, 'accountability'],
      source: 'drift-detection',
      sourceCell: 'A2',  // Strategy.Goal — goal alignment
      targetCell: 'C2',  // Operations.Loop — feedback loop
    };
  }

  /**
   * Generate an "Intelligence Burst" — CEO-grade sovereign report.
   * Format: Intersection | Hardness | FIM Overlap | Business Value | Result
   * Posted to #trust-debt-public as proof-of-work.
   */
  intelligenceBurst(
    room: string,
    action: string,
    result: { success: boolean; gitHash?: string; output?: string },
    sovereignty: number,
    hardnessTier: 'H1' | 'H2' | 'H3' | 'H4' | 'H5',
    fimOverlap: number,
    patentRef?: string,
  ): TweetData {
    const status = result.success ? '✅' : '❌';
    const proactive = action.startsWith('Proactive') ? 'Proactive' : 'Reactive';
    const hash = result.gitHash ? ` → ${result.gitHash.substring(0, 7)}` : '';
    const patent = patentRef || 'Appendix H — Geometric IAM';

    return {
      text: [
        `📡 ${hardnessTier} | 🎯 Overlap: ${(fimOverlap * 100).toFixed(0)}%`,
        `${status} ${proactive}: ${action.substring(0, 80)}`,
        `PATENT: ${patent}${hash}`,
      ].join('\n'),
      room,
      sovereignty,
      categories: ['accountability', 'transparency', 'trust_debt'],
      source: 'task-complete',
      metadata: { hardnessTier, fimOverlap, patentRef, gitHash: result.gitHash },
    };
  }

  /**
   * Generate a cost governor event tweet.
   */
  costGovernorTweet(dailySpend: number, budget: number, switchedTo: string, sovereignty: number): TweetData {
    return {
      text: `💰 ECONOMIC SOVEREIGNTY: Daily spend $${dailySpend.toFixed(2)}/$${budget.toFixed(2)}. Hard-switch → ${switchedTo}. Budget is law.`,
      room: 'vault',
      sovereignty,
      categories: ['resource_efficiency', 'accountability'],
      source: 'status',
      sourceCell: 'A3',  // Strategy.Fund
      targetCell: 'C3',  // Operations.Flow
    };
  }

  /**
   * Generate a heartbeat status tweet — shows the bot is alive and sovereign.
   */
  heartbeatTweet(sovereignty: number, activeTasks: number, dailySpend: number, uptimeHours: number, gpuUtil?: string): TweetData {
    return {
      text: `🫀 Heartbeat | S:${(sovereignty * 100).toFixed(0)}% | Tasks:${activeTasks} | Spend:$${dailySpend.toFixed(2)} | ${gpuUtil ?? 'GPU:N/A'} | Uptime:${uptimeHours.toFixed(0)}h | Sovereign Engine active.`,
      room: 'operator',
      sovereignty,
      categories: ['reliability', 'transparency'],
      source: 'status',
      sourceCell: 'C2',  // Operations.Loop
      targetCell: 'B3',  // Tactics.Signal
    };
  }

  /**
   * Get recent tweets.
   */
  getRecent(limit: number = 10): TweetMessage[] {
    return this.history.slice(-limit);
  }
}
