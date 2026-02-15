/**
 * src/federation/registry.ts — Federation Registry
 *
 * Maintains a persistent registry of known federated bots.
 * Tracks geometric compatibility, quarantine status, and drift detection.
 *
 * STORAGE:
 *   - data/federation-registry.json (auto-created)
 *   - JSON format with bot entries
 *
 * STATUS LEVELS:
 *   - trusted: Overlap >= 0.8, no drift
 *   - quarantined: Manual quarantine or overlap < 0.6
 *   - unknown: New bot, not yet validated
 *
 * DRIFT DETECTION:
 *   - Auto-quarantine if overlap drops below 0.6
 *   - Warns on significant overlap changes
 */
import { TrustDebtCategory } from '../auth/geometric';
export type BotStatus = 'trusted' | 'quarantined' | 'unknown';
export interface BotEntry {
    id: string;
    name: string;
    lastSeen: string;
    geometryHash: string;
    overlap: number;
    status: BotStatus;
    quarantineReason?: string;
    registeredAt: string;
}
export interface DriftCheck {
    drifted: boolean;
    oldOverlap: number;
    newOverlap: number;
    reason?: string;
}
declare const QUARANTINE_THRESHOLD = 0.6;
declare const DRIFT_WARNING_THRESHOLD = 0.15;
export declare class FederationRegistry {
    private registryPath;
    private data;
    private localGeometry;
    constructor(dataDir?: string, localGeometry?: Partial<Record<TrustDebtCategory, number>>);
    /**
     * Load registry from disk. Creates empty registry if none exists.
     */
    private load;
    /**
     * Save registry to disk. Creates data directory if needed.
     */
    private save;
    /**
     * Register a new bot or update existing bot.
     *
     * @param id - Bot identifier (e.g., "bot-alpha-123")
     * @param name - Human-readable name (e.g., "Alpha Federation Bot")
     * @param geometry - Bot's 20-dimensional identity vector
     * @returns The registered bot entry
     */
    registerBot(id: string, name: string, geometry: Partial<Record<TrustDebtCategory, number>> | number[]): BotEntry;
    /**
     * Get bot status by ID.
     *
     * @param id - Bot identifier
     * @returns Bot entry or null if not found
     */
    getBotStatus(id: string): BotEntry | null;
    /**
     * List all registered bots.
     *
     * @returns Array of all bot entries
     */
    listBots(): BotEntry[];
    /**
     * Manually quarantine a bot.
     *
     * @param id - Bot identifier
     * @param reason - Reason for quarantine
     * @returns True if bot was quarantined, false if not found
     */
    quarantineBot(id: string, reason: string): boolean;
    /**
     * Check if a bot's geometry has drifted significantly.
     *
     * @param id - Bot identifier
     * @param newGeometry - Bot's current identity vector
     * @returns Drift analysis with old/new overlap
     */
    checkDrift(id: string, newGeometry: Partial<Record<TrustDebtCategory, number>> | number[]): DriftCheck;
    /**
     * Update local geometry (used for overlap calculations).
     *
     * @param geometry - New local bot identity vector
     */
    setLocalGeometry(geometry: Partial<Record<TrustDebtCategory, number>>): void;
    /**
     * Remove a bot from the registry.
     *
     * @param id - Bot identifier
     * @returns True if bot was removed, false if not found
     */
    removeBot(id: string): boolean;
    /**
     * Get registry statistics.
     */
    getStats(): {
        total: number;
        trusted: number;
        quarantined: number;
        unknown: number;
    };
}
export { QUARANTINE_THRESHOLD, DRIFT_WARNING_THRESHOLD };
//# sourceMappingURL=registry.d.ts.map