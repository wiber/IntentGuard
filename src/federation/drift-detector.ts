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
import { FederationRegistry, BotEntry } from './registry';
import { computeTensorOverlap, geometryHash } from './tensor-overlap';

// ─── Constants ──────────────────────────────────────────────────────────

/**
 * High-precision drift threshold: 0.003 cosine similarity change.
 * This is ~50x more sensitive than the registry's warning threshold (0.15).
 */
export const DRIFT_THRESHOLD = 0.003;

// ─── Types ──────────────────────────────────────────────────────────────

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

// ─── Drift Detector ─────────────────────────────────────────────────────

export class DriftDetector {
  private registry: FederationRegistry;
  private events: DriftEvent[] = [];
  private checks = 0;
  private drifts = 0;
  private quarantines = 0;
  private totalDelta = 0;
  private maxDelta = 0;

  constructor(registry: FederationRegistry) {
    this.registry = registry;
  }

  /**
   * Check if a bot's geometry has drifted beyond threshold.
   *
   * @param botId - Bot identifier
   * @param newGeometry - Bot's current identity vector
   * @param threshold - Drift threshold (default 0.003)
   * @returns Drift check result with quarantine decision
   */
  checkBot(
    botId: string,
    newGeometry: Partial<Record<TrustDebtCategory, number>> | number[],
    threshold: number = DRIFT_THRESHOLD,
  ): DriftCheckResult {
    this.checks++;

    const bot = this.registry.getBotStatus(botId);
    if (!bot) {
      return {
        botId,
        drifted: false,
        quarantined: false,
        oldOverlap: 0,
        newOverlap: 0,
        delta: 0,
        threshold,
        oldHash: '',
        newHash: geometryHash(newGeometry),
        reason: 'Bot not registered',
        timestamp: new Date().toISOString(),
      };
    }

    // Compute new overlap against local geometry
    const localGeometry = (this.registry as any).localGeometry;
    const { overlap: newOverlap } = computeTensorOverlap(localGeometry, newGeometry);

    const oldOverlap = bot.overlap;
    const delta = Math.abs(newOverlap - oldOverlap);

    const oldHash = bot.geometryHash;
    const newHash = geometryHash(newGeometry);

    // Check if geometry changed
    const geometryChanged = oldHash !== newHash;

    let drifted = false;
    let quarantined = false;
    let reason: string | undefined;

    // Drift detected if delta exceeds threshold AND geometry actually changed
    if (geometryChanged && delta > threshold) {
      drifted = true;
      this.drifts++;
      this.totalDelta += delta;
      this.maxDelta = Math.max(this.maxDelta, delta);

      // Auto-quarantine on drift
      if (bot.status !== 'quarantined') {
        this.registry.quarantineBot(
          botId,
          `High-precision drift detected: Δ=${delta.toFixed(6)} > ${threshold} (overlap ${oldOverlap.toFixed(6)} → ${newOverlap.toFixed(6)})`,
        );
        quarantined = true;
        this.quarantines++;
        reason = `Auto-quarantined: drift Δ=${delta.toFixed(6)} exceeds threshold ${threshold}`;
      } else {
        reason = `Drift detected: Δ=${delta.toFixed(6)} > ${threshold} (already quarantined)`;
      }

      // Log drift event
      this.logEvent({
        botId,
        botName: bot.name,
        timestamp: new Date().toISOString(),
        oldOverlap,
        newOverlap,
        delta,
        quarantined,
        reason: reason || 'Drift detected',
      });
    } else if (geometryChanged && delta <= threshold) {
      reason = `Geometry changed but within tolerance: Δ=${delta.toFixed(6)} <= ${threshold}`;
    } else if (!geometryChanged) {
      reason = 'No geometry change detected';
    }

    return {
      botId,
      drifted,
      quarantined,
      oldOverlap,
      newOverlap,
      delta,
      threshold,
      oldHash,
      newHash,
      reason,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check multiple bots for drift.
   *
   * @param checks - Array of [botId, newGeometry] tuples
   * @param threshold - Drift threshold (default 0.003)
   * @returns Array of drift check results
   */
  checkBatch(
    checks: Array<[string, Partial<Record<TrustDebtCategory, number>> | number[]]>,
    threshold: number = DRIFT_THRESHOLD,
  ): DriftCheckResult[] {
    return checks.map(([botId, geometry]) => this.checkBot(botId, geometry, threshold));
  }

  /**
   * Monitor all registered bots for drift.
   * Useful for periodic sweep operations.
   *
   * @param geometries - Map of botId to current geometry
   * @param threshold - Drift threshold (default 0.003)
   * @returns Array of drift check results
   */
  monitorAll(
    geometries: Map<string, Partial<Record<TrustDebtCategory, number>> | number[]>,
    threshold: number = DRIFT_THRESHOLD,
  ): DriftCheckResult[] {
    const bots = this.registry.listBots();
    const results: DriftCheckResult[] = [];

    for (const bot of bots) {
      const geometry = geometries.get(bot.id);
      if (geometry) {
        results.push(this.checkBot(bot.id, geometry, threshold));
      }
    }

    return results;
  }

  /**
   * Log a drift event to the internal audit trail.
   */
  private logEvent(event: DriftEvent): void {
    this.events.push(event);

    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events.shift();
    }
  }

  /**
   * Get drift detection statistics.
   */
  getStats(): DriftStats {
    return {
      totalChecks: this.checks,
      driftsDetected: this.drifts,
      botsQuarantined: this.quarantines,
      averageDelta: this.drifts > 0 ? this.totalDelta / this.drifts : 0,
      maxDelta: this.maxDelta,
      recentEvents: [...this.events].slice(-10), // Last 10 events
    };
  }

  /**
   * Get recent drift events.
   *
   * @param limit - Maximum number of events to return (default 10)
   * @returns Array of drift events, most recent first
   */
  getRecentEvents(limit: number = 10): DriftEvent[] {
    return [...this.events].slice(-limit).reverse();
  }

  /**
   * Clear drift statistics and event log.
   */
  reset(): void {
    this.checks = 0;
    this.drifts = 0;
    this.quarantines = 0;
    this.totalDelta = 0;
    this.maxDelta = 0;
    this.events = [];
  }

  /**
   * Export drift events to JSON for audit trail.
   */
  exportEvents(): string {
    return JSON.stringify(
      {
        exported: new Date().toISOString(),
        stats: this.getStats(),
        events: this.events,
      },
      null,
      2,
    );
  }
}

// ─── Exports ────────────────────────────────────────────────────────────

export { DRIFT_THRESHOLD as DEFAULT_DRIFT_THRESHOLD };
