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
    author: {
        id: string;
        username: string;
    };
    predictedAction: string;
    alignedCategories: string[];
    createdAt: number;
    timeoutMs: number;
    timer: ReturnType<typeof setTimeout> | null;
    status: 'pending' | 'executing' | 'aborted' | 'redirected' | 'completed';
    messageId?: string;
    abortReason?: string;
}
export interface SteeringConfig {
    askPredictTimeoutMs: number;
    redirectGracePeriodMs: number;
    maxConcurrentPredictions: number;
    /** Optional override for sovereignty-based timeouts */
    useSovereigntyTimeouts?: boolean;
}
export type ExecuteCallback = (room: string, prompt: string) => Promise<boolean>;
export type PostCallback = (channelId: string, content: string) => Promise<string | null>;
export type EditCallback = (channelId: string, messageId: string, content: string) => Promise<void>;
export type SovereigntyGetter = () => number;
export declare class SteeringLoop {
    private predictions;
    private log;
    private config;
    private executeCallback;
    private postCallback;
    private editCallback;
    private sovereigntyGetter;
    private counter;
    constructor(log: Logger, config: SteeringConfig, executeCallback: ExecuteCallback, postCallback: PostCallback, editCallback: EditCallback, sovereigntyGetter?: SovereigntyGetter);
    /**
     * Calculate timeout based on sovereignty score.
     * High trust (>=0.8) = 5s, Moderate (>=0.6) = 30s, Low (<0.6) = 60s
     */
    private getSovereigntyTimeout;
    /**
     * Get timeout description for messaging.
     */
    private getTimeoutDescription;
    /**
     * Handle an incoming message based on the author's tier.
     *
     * Admin → instant execute
     * Trusted → ask and predict (sovereignty-based countdown: 5s/30s/60s)
     * General → queue as suggestion (needs admin thumbs-up)
     */
    handleMessage(tier: ExecutionTier, room: string, channelId: string, prompt: string, author: {
        id: string;
        username: string;
    }, categories?: string[]): Promise<PredictionEntry>;
    /**
     * Start the ask-and-predict countdown for a trusted user's message.
     */
    private startPrediction;
    /**
     * Redirect a pending prediction with a new signal.
     * Called when a voice memo or text message arrives during countdown.
     */
    redirect(room: string, newPrompt: string, source: 'voice-memo' | 'text' | 'admin-override'): Promise<PredictionEntry | null>;
    /**
     * Handle Admin Thumbs-Up on a suggestion message.
     * This "blesses" a non-admin suggestion and triggers immediate execution.
     */
    adminBless(messageId: string, adminUsername: string): Promise<boolean>;
    /**
     * Abort all pending predictions (emergency stop).
     */
    abortAll(): number;
    /**
     * Get active predictions for status reporting.
     */
    getActivePredictions(): PredictionEntry[];
    /**
     * Check if a room has a pending prediction.
     */
    hasPendingPrediction(room: string): boolean;
}
//# sourceMappingURL=steering-loop.d.ts.map