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
import { computeTensorOverlap, geometryHash } from './tensor-overlap';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
// ─── Constants ──────────────────────────────────────────────────────────
const QUARANTINE_THRESHOLD = 0.6; // Auto-quarantine below this overlap
const DRIFT_WARNING_THRESHOLD = 0.15; // Warn if overlap changes by this much
// ─── Federation Registry ────────────────────────────────────────────────
export class FederationRegistry {
    registryPath;
    data;
    localGeometry;
    constructor(dataDir = './data', localGeometry = {}) {
        this.registryPath = resolve(dataDir, 'federation-registry.json');
        this.localGeometry = localGeometry;
        this.data = this.load();
    }
    /**
     * Load registry from disk. Creates empty registry if none exists.
     */
    load() {
        try {
            if (!existsSync(this.registryPath)) {
                return {
                    bots: [],
                    version: '1.0.0',
                    lastUpdated: new Date().toISOString(),
                };
            }
            const raw = readFileSync(this.registryPath, 'utf-8');
            return JSON.parse(raw);
        }
        catch (error) {
            console.error(`Failed to load registry from ${this.registryPath}:`, error);
            return {
                bots: [],
                version: '1.0.0',
                lastUpdated: new Date().toISOString(),
            };
        }
    }
    /**
     * Save registry to disk. Creates data directory if needed.
     */
    save() {
        try {
            const dir = dirname(this.registryPath);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            this.data.lastUpdated = new Date().toISOString();
            writeFileSync(this.registryPath, JSON.stringify(this.data, null, 2), 'utf-8');
        }
        catch (error) {
            console.error(`Failed to save registry to ${this.registryPath}:`, error);
        }
    }
    /**
     * Register a new bot or update existing bot.
     *
     * @param id - Bot identifier (e.g., "bot-alpha-123")
     * @param name - Human-readable name (e.g., "Alpha Federation Bot")
     * @param geometry - Bot's 20-dimensional identity vector
     * @returns The registered bot entry
     */
    registerBot(id, name, geometry) {
        const hash = geometryHash(geometry);
        const { overlap } = computeTensorOverlap(this.localGeometry, geometry);
        const existingIndex = this.data.bots.findIndex(b => b.id === id);
        const now = new Date().toISOString();
        // Determine initial status
        let status = 'unknown';
        if (overlap >= 0.8) {
            status = 'trusted';
        }
        else if (overlap < QUARANTINE_THRESHOLD) {
            status = 'quarantined';
        }
        const entry = {
            id,
            name,
            lastSeen: now,
            geometryHash: hash,
            overlap,
            status,
            registeredAt: existingIndex >= 0 ? this.data.bots[existingIndex].registeredAt : now,
        };
        if (status === 'quarantined' && overlap < QUARANTINE_THRESHOLD) {
            entry.quarantineReason = `Low overlap: ${overlap.toFixed(3)} < ${QUARANTINE_THRESHOLD}`;
        }
        if (existingIndex >= 0) {
            this.data.bots[existingIndex] = entry;
        }
        else {
            this.data.bots.push(entry);
        }
        this.save();
        return entry;
    }
    /**
     * Get bot status by ID.
     *
     * @param id - Bot identifier
     * @returns Bot entry or null if not found
     */
    getBotStatus(id) {
        return this.data.bots.find(b => b.id === id) ?? null;
    }
    /**
     * List all registered bots.
     *
     * @returns Array of all bot entries
     */
    listBots() {
        return [...this.data.bots];
    }
    /**
     * Manually quarantine a bot.
     *
     * @param id - Bot identifier
     * @param reason - Reason for quarantine
     * @returns True if bot was quarantined, false if not found
     */
    quarantineBot(id, reason) {
        const index = this.data.bots.findIndex(b => b.id === id);
        if (index < 0)
            return false;
        this.data.bots[index].status = 'quarantined';
        this.data.bots[index].quarantineReason = reason;
        this.data.bots[index].lastSeen = new Date().toISOString();
        this.save();
        return true;
    }
    /**
     * Check if a bot's geometry has drifted significantly.
     *
     * @param id - Bot identifier
     * @param newGeometry - Bot's current identity vector
     * @returns Drift analysis with old/new overlap
     */
    checkDrift(id, newGeometry) {
        const bot = this.getBotStatus(id);
        if (!bot) {
            return {
                drifted: false,
                oldOverlap: 0,
                newOverlap: 0,
                reason: 'Bot not registered',
            };
        }
        const { overlap: newOverlap } = computeTensorOverlap(this.localGeometry, newGeometry);
        const oldOverlap = bot.overlap;
        const delta = Math.abs(newOverlap - oldOverlap);
        let drifted = false;
        let reason;
        // Auto-quarantine if overlap drops below threshold
        if (newOverlap < QUARANTINE_THRESHOLD && bot.status !== 'quarantined') {
            this.quarantineBot(id, `Drift detected: overlap dropped to ${newOverlap.toFixed(3)} < ${QUARANTINE_THRESHOLD}`);
            drifted = true;
            reason = 'Auto-quarantined due to low overlap';
        }
        // Warn on significant change
        else if (delta > DRIFT_WARNING_THRESHOLD) {
            drifted = true;
            reason = `Significant overlap change: ${oldOverlap.toFixed(3)} → ${newOverlap.toFixed(3)}`;
        }
        return {
            drifted,
            oldOverlap,
            newOverlap,
            reason,
        };
    }
    /**
     * Update local geometry (used for overlap calculations).
     *
     * @param geometry - New local bot identity vector
     */
    setLocalGeometry(geometry) {
        this.localGeometry = geometry;
    }
    /**
     * Remove a bot from the registry.
     *
     * @param id - Bot identifier
     * @returns True if bot was removed, false if not found
     */
    removeBot(id) {
        const index = this.data.bots.findIndex(b => b.id === id);
        if (index < 0)
            return false;
        this.data.bots.splice(index, 1);
        this.save();
        return true;
    }
    /**
     * Get registry statistics.
     */
    getStats() {
        const stats = {
            total: this.data.bots.length,
            trusted: 0,
            quarantined: 0,
            unknown: 0,
        };
        for (const bot of this.data.bots) {
            stats[bot.status]++;
        }
        return stats;
    }
}
// ─── Exports ────────────────────────────────────────────────────────────
export { QUARANTINE_THRESHOLD, DRIFT_WARNING_THRESHOLD };
//# sourceMappingURL=registry.js.map