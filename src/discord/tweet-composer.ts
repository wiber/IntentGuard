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

export class TweetComposer {
  private log: Logger;
  private discord: DiscordHelper | undefined;
  private primaryChannelId: string | undefined;
  private gameChannelId: string | undefined;
  private history: TweetMessage[] = [];
  private counter = 0;

  constructor(log: Logger) {
    this.log = log;
  }

  /**
   * Bind to Discord channels.
   */
  bind(discord: DiscordHelper, primaryChannelId: string, gameChannelId?: string): void {
    this.discord = discord;
    this.primaryChannelId = primaryChannelId;
    this.gameChannelId = gameChannelId;
    this.log.info(`TweetComposer bound → primary: ${primaryChannelId}${gameChannelId ? `, game: ${gameChannelId}` : ''}`);
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

    if (full.length <= 280) return full;

    // Truncate text to fit
    const maxText = 280 - header.length - footer.length - 6; // \n x2 + "..."
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
   * Handle a reaction on a tweet message.
   * 🐦 = queue for X/Twitter
   * 🔄 = repost to #tesseract-nu
   */
  async handleReaction(messageId: string, emoji: string, isAdmin: boolean): Promise<string | null> {
    if (!isAdmin) return null;

    const tweet = this.history.find(t => t.discordMessageId === messageId);
    if (!tweet) return null;

    if (emoji === '🐦' || emoji === '🕊️') {
      // Queue for X/Twitter (future: POST to thetadriven.com/api/tweet)
      this.log.info(`[Tweet] Queued for X/Twitter: ${tweet.id}`);
      // For now, log it — API integration comes when thetadriven.com/api/tweet exists
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
   * Get recent tweets.
   */
  getRecent(limit: number = 10): TweetMessage[] {
    return this.history.slice(-limit);
  }
}
