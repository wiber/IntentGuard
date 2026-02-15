/**
 * src/discord/transparency-engine.ts — Public Trust-Debt Reporting
 *
 * The bot self-documents trust-debt spikes to a public Discord channel.
 * Anyone can see when the system's trust scores change significantly.
 *
 * CHANNEL: #trust-debt-public
 *
 * REPORTS:
 *   - Trust-debt spikes (delta > threshold)
 *   - Periodic summaries (every N minutes)
 *   - Permission denials (FIM blocked a tool call)
 *   - Category health changes
 *
 * WHY:
 *   The Transparency Engine is how IntentGuard proves it's not a black box.
 *   Every significant trust-debt change is visible to the public channel.
 *   This is the foundation of IAMFIM — the system can show its work.
 */
import type { TrustDebtSpike, TransparencyConfig, Logger, DiscordHelper } from '../types.js';
export declare class TransparencyEngine {
    private log;
    private discord;
    private config;
    private channelId;
    private spikeHistory;
    private reportTimer;
    constructor(log: Logger, config?: Partial<TransparencyConfig>);
    /**
     * Bind to Discord and start periodic reporting.
     */
    start(discord: DiscordHelper, channelId: string): void;
    /**
     * Stop periodic reporting.
     */
    stop(): void;
    /**
     * Record a trust-debt spike. Posts to Discord if above threshold.
     */
    recordSpike(spike: TrustDebtSpike): Promise<void>;
    /**
     * Record a FIM permission denial with Discord embed formatting.
     * Posts to #trust-debt-public with tool name, overlap score, sovereignty, and resolution.
     */
    recordDenial(toolName: string, skillName: string, overlap: number, sovereignty: number, threshold: number, failedCategories: string[], resolution: string): Promise<void>;
    /**
     * Post a spike event to the public channel.
     */
    private postSpike;
    /**
     * Post periodic summary of trust-debt health.
     */
    private postPeriodicSummary;
    /**
     * Post to the public trust-debt channel.
     */
    private postToChannel;
    /**
     * Get spike history for analysis.
     */
    getHistory(limit?: number): TrustDebtSpike[];
}
//# sourceMappingURL=transparency-engine.d.ts.map