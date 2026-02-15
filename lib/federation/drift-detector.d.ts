/**
 * src/federation/drift-detector.ts — High-Precision Drift Detection
 *
 * Monitors bot geometry changes with high-sensitivity threshold (0.003).
 * Auto-quarantines bots that exceed drift tolerance to maintain federation trust.
 *
 * DRIFT DETECTION:
 *   - Threshold: 0.003 cosine similarity change (extremely sensitive)
 *   - Monitors all federated bots on heartbeat/check-in
 *   - Auto-quarantines on drift detection
 *   - Logs drift events for audit trail
 *
 * USAGE:
 *   const detector = new DriftDetector(registry);
 *   const result = await detector.checkBot(botId, newGeometry);
 *   if (result.quarantined) {
 *     console.log(`Bot ${botId} auto-quarantined: ${result.reason}`);
 *   }
 */
import { TrustDebtCategory } from '../auth/geometric';
import { FederationRegistry } from './registry';
/**
 * High-precision drift threshold: 0.003 cosine similarity change.
 * This is ~50x more sensitive than the registry's warning threshold (0.15).
 */
export declare const DRIFT_THRESHOLD = 0.003;
export interface DriftCheckResult {
    /** Bot identifier */
    botId: string;
    /** Was drift detected? */
    drifted: boolean;
    /** Was bot auto-quarantined? */
    quarantined: boolean;
    /** Old overlap value */
    oldOverlap: number;
    /** New overlap value */
    newOverlap: number;
    /** Absolute change in overlap */
    delta: number;
    /** Drift threshold used */
    threshold: number;
    /** Old geometry hash */
    oldHash: string;
    /** New geometry hash */
    newHash: string;
    /** Reason for drift/quarantine */
    reason?: string;
    /** Timestamp of check */
    timestamp: string;
}
export interface DriftEvent {
    botId: string;
    botName: string;
    timestamp: string;
    oldOverlap: number;
    newOverlap: number;
    delta: number;
    quarantined: boolean;
    reason: string;
}
export interface DriftStats {
    totalChecks: number;
    driftsDetected: number;
    botsQuarantined: number;
    averageDelta: number;
    maxDelta: number;
    recentEvents: DriftEvent[];
}
export declare class DriftDetector {
    private registry;
    private events;
    private checks;
    private drifts;
    private quarantines;
    private totalDelta;
    private maxDelta;
    constructor(registry: FederationRegistry);
    /**
     * Check if a bot's geometry has drifted beyond threshold.
     *
     * @param botId - Bot identifier
     * @param newGeometry - Bot's current identity vector
     * @param threshold - Drift threshold (default 0.003)
     * @returns Drift check result with quarantine decision
     */
    checkBot(botId: string, newGeometry: Partial<Record<TrustDebtCategory, number>> | number[], threshold?: number): DriftCheckResult;
    /**
     * Check multiple bots for drift.
     *
     * @param checks - Array of [botId, newGeometry] tuples
     * @param threshold - Drift threshold (default 0.003)
     * @returns Array of drift check results
     */
    checkBatch(checks: Array<[string, Partial<Record<TrustDebtCategory, number>> | number[]]>, threshold?: number): DriftCheckResult[];
    /**
     * Monitor all registered bots for drift.
     * Useful for periodic sweep operations.
     *
     * @param geometries - Map of botId to current geometry
     * @param threshold - Drift threshold (default 0.003)
     * @returns Array of drift check results
     */
    monitorAll(geometries: Map<string, Partial<Record<TrustDebtCategory, number>> | number[]>, threshold?: number): DriftCheckResult[];
    /**
     * Log a drift event to the internal audit trail.
     */
    private logEvent;
    /**
     * Get drift detection statistics.
     */
    getStats(): DriftStats;
    /**
     * Get recent drift events.
     *
     * @param limit - Maximum number of events to return (default 10)
     * @returns Array of drift events, most recent first
     */
    getRecentEvents(limit?: number): DriftEvent[];
    /**
     * Clear drift statistics and event log.
     */
    reset(): void;
    /**
     * Export drift events to JSON for audit trail.
     */
    exportEvents(): string;
}
export { DRIFT_THRESHOLD as DEFAULT_DRIFT_THRESHOLD };
//# sourceMappingURL=drift-detector.d.ts.map