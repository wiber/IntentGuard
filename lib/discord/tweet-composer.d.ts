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
import { type ShortRankIntersection } from './shortrank-notation.js';
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
    source: 'pipeline' | 'task-complete' | 'fim-denial' | 'steering-prediction' | 'voice-memo' | 'admin-command' | 'drift-detection' | 'status';
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
export declare class TweetComposer {
    private log;
    private discord;
    private primaryChannelId;
    private gameChannelId;
    private xPostsChannelId;
    private history;
    private counter;
    constructor(log: Logger);
    /**
     * Bind to Discord channels.
     * @param xPostsChannelId - Optional #x-posts channel for tweet staging and admin approval
     */
    bind(discord: DiscordHelper, primaryChannelId: string, gameChannelId?: string, xPostsChannelId?: string): void;
    /**
     * Resolve the ShortRank intersection for a tweet.
     * Uses explicit cells if provided, otherwise auto-detects from text + categories.
     */
    resolveIntersection(data: TweetData): ShortRankIntersection;
    /**
     * Compose a tweet from structured data.
     * Format: ShortRank intersection prefix + text + sovereignty footer.
     * CONSTRAINT: Maximum 280 characters (X/Twitter limit).
     */
    compose(data: TweetData): string;
    /**
     * Generate a pivotal question for the cognitive room this tweet maps to.
     */
    generatePivotalQuestion(data: TweetData): {
        question: string;
        predictedAnswer: string;
        room: string;
    };
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
    post(data: TweetData): Promise<TweetMessage | null>;
    /**
     * Cross-post a tweet to the game channel (#tesseract-nu).
     */
    crossPostToGame(tweetId: string): Promise<boolean>;
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
    handleReaction(messageId: string, emoji: string, isAdmin: boolean): Promise<string | null>;
    /**
     * Generate a tweet for a pipeline completion.
     */
    pipelineTweet(sovereigntyScore: number, alignmentPercent: number, trustDebtUnits: number, categoriesActive: number): TweetData;
    /**
     * Generate a tweet for a task completion.
     */
    taskTweet(room: string, taskSummary: string, success: boolean, sovereignty: number): TweetData;
    /**
     * Generate a tweet for a FIM denial.
     */
    fimDenialTweet(toolName: string, overlap: number, sovereignty: number): TweetData;
    /**
     * Generate a tweet for a steering prediction.
     */
    predictionTweet(room: string, action: string, timeoutSec: number, sovereignty: number): TweetData;
    /**
     * Generate a tweet for drift detection.
     */
    driftTweet(category: string, driftPercent: number, sovereignty: number): TweetData;
    /**
     * Generate an "Intelligence Burst" — CEO-grade sovereign report.
     * Format: Intersection | Hardness | FIM Overlap | Business Value | Result
     * Posted to #trust-debt-public as proof-of-work.
     */
    intelligenceBurst(room: string, action: string, result: {
        success: boolean;
        gitHash?: string;
        output?: string;
    }, sovereignty: number, hardnessTier: 'H1' | 'H2' | 'H3' | 'H4' | 'H5', fimOverlap: number, patentRef?: string): TweetData;
    /**
     * Generate a cost governor event tweet.
     */
    costGovernorTweet(dailySpend: number, budget: number, switchedTo: string, sovereignty: number): TweetData;
    /**
     * Generate a heartbeat status tweet — shows the bot is alive and sovereign.
     */
    heartbeatTweet(sovereignty: number, activeTasks: number, dailySpend: number, uptimeHours: number): TweetData;
    /**
     * Get recent tweets.
     */
    getRecent(limit?: number): TweetMessage[];
}
//# sourceMappingURL=tweet-composer.d.ts.map