/**
 * src/auth/sovereignty.ts — Sovereignty Score Calculator
 *
 * Combines trust-debt category grades into a single 0-1 sovereignty score.
 * Implements drift reduction formula when drift events occur.
 *
 * EQUATION:
 *   Sovereignty = 1.0 - (TrustDebtUnits / MaxUnits) * (1 - k_E)^driftEvents
 *
 * WHERE:
 *   - TrustDebtUnits = total units from pipeline step 4
 *   - MaxUnits = boundary for Grade D (3000 units)
 *   - k_E = 0.003 (entropic drift rate per operation, from drift-vs-steering)
 *   - driftEvents = number of FIM deny events (drift catches)
 *
 * INTEGRATION:
 *   - Reads from: 4-grades-statistics.json (trust debt calculation)
 *   - Writes to: IdentityVector.sovereigntyScore (geometric.ts)
 *   - Triggered by: Pipeline Step 4, FIM drift events
 *
 * STATUS: v1.0 — Core sovereignty calculation with drift reduction
 */
import type { TrustDebtCategory } from './geometric.js';
/** Entropic drift rate per operation (from drift-vs-steering.tsx) */
export declare const K_E = 0.003;
/** Maximum units for Grade D boundary (3000 = upper bound of Grade C) */
export declare const MAX_TRUST_DEBT_UNITS = 3000;
/** Grade boundaries from the trust-debt pipeline */
export declare const GRADE_BOUNDARIES: {
    readonly A: {
        readonly min: 0;
        readonly max: 500;
        readonly emoji: "🟢";
        readonly description: "EXCELLENT";
    };
    readonly B: {
        readonly min: 501;
        readonly max: 1500;
        readonly emoji: "🟡";
        readonly description: "GOOD";
    };
    readonly C: {
        readonly min: 1501;
        readonly max: 3000;
        readonly emoji: "🟠";
        readonly description: "NEEDS ATTENTION";
    };
    readonly D: {
        readonly min: 3001;
        readonly max: number;
        readonly emoji: "🔴";
        readonly description: "REQUIRES WORK";
    };
};
export type Grade = keyof typeof GRADE_BOUNDARIES;
/** Trust debt statistics from pipeline step 4 */
export interface TrustDebtStats {
    total_units: number;
    grade: Grade;
    category_performance: Record<string, {
        units: number;
        percentage: string;
        grade: Grade;
    }>;
}
/** Drift event from FIM deny log */
export interface DriftEvent {
    timestamp: string;
    toolName: string;
    overlap: number;
    sovereignty: number;
    reason: string;
}
/** Complete sovereignty calculation result */
export interface SovereigntyCalculation {
    score: number;
    grade: Grade;
    gradeEmoji: string;
    trustDebtUnits: number;
    driftEvents: number;
    rawScore: number;
    driftReduction: number;
    categoryScores: Partial<Record<TrustDebtCategory, number>>;
    timestamp: string;
}
/**
 * Calculate raw sovereignty score from trust-debt units.
 *
 * Maps trust debt inversely to sovereignty:
 *   - 0 units → 1.0 sovereignty (perfect)
 *   - 500 units (Grade A max) → 0.833 sovereignty
 *   - 1500 units (Grade B max) → 0.5 sovereignty
 *   - 3000 units (Grade C max) → 0.0 sovereignty
 *   - 3000+ units (Grade D) → negative clamped to 0.0
 *
 * @param trustDebtUnits Total units from pipeline step 4
 * @returns Sovereignty score 0.0 - 1.0
 */
export declare function calculateRawSovereignty(trustDebtUnits: number): number;
/**
 * Apply drift reduction to sovereignty score.
 *
 * Each drift event reduces sovereignty by k_E (0.3%).
 * Uses exponential decay: sovereignty * (1 - k_E)^driftEvents
 *
 * This implements the steering loop step 6:
 * "Drift events reduce sovereignty score for future operations"
 *
 * @param rawSovereignty Sovereignty before drift reduction
 * @param driftEvents Number of FIM deny events
 * @returns Reduced sovereignty score
 */
export declare function applyDriftReduction(rawSovereignty: number, driftEvents: number): number;
/**
 * Map trust-debt units to letter grade.
 *
 * @param units Total trust-debt units
 * @returns Grade A/B/C/D
 */
export declare function unitsToGrade(units: number): Grade;
/**
 * Convert category performance from pipeline to normalized scores.
 *
 * Maps each category's grade to a normalized score:
 *   - Grade A → 0.9 - 1.0 (excellent)
 *   - Grade B → 0.7 - 0.9 (good)
 *   - Grade C → 0.5 - 0.7 (needs attention)
 *   - Grade D → 0.0 - 0.5 (requires work)
 *
 * Uses percentage within grade range for fine-grained scoring.
 *
 * @param categoryPerformance From 4-grades-statistics.json
 * @returns Normalized scores by category
 */
export declare function extractCategoryScores(categoryPerformance: TrustDebtStats['category_performance']): Partial<Record<TrustDebtCategory, number>>;
/**
 * Calculate complete sovereignty score from trust-debt stats and drift events.
 *
 * This is the main entry point for sovereignty calculation.
 * Integrates with the trust-debt pipeline and FIM guard.
 *
 * @param trustDebtStats From 4-grades-statistics.json
 * @param driftEvents Number of FIM deny events since last recalc
 * @returns Complete sovereignty calculation
 */
export declare function calculateSovereignty(trustDebtStats: TrustDebtStats, driftEvents?: number): SovereigntyCalculation;
/**
 * Count drift events from FIM deny log.
 *
 * In production, this would read from a persistent log.
 * For now, it's a placeholder for the integration point.
 *
 * @param since Only count events after this timestamp
 * @returns Number of drift events
 */
export declare function countDriftEvents(since?: string): number;
/**
 * Record a drift event to the FIM deny log.
 *
 * Called by geometric.ts when a permission check fails.
 * Triggers sovereignty recalculation in pipeline step 4.
 *
 * @param event Drift event details
 */
export declare function recordDriftEvent(event: DriftEvent): void;
/**
 * Calculate how many additional drift events would reduce sovereignty to zero.
 *
 * Useful for forecasting and alerting.
 *
 * @param currentSovereignty Current sovereignty score
 * @returns Number of drift events until sovereignty reaches 0
 */
export declare function driftEventsUntilZero(currentSovereignty: number): number;
/**
 * Calculate sovereignty recovery path.
 *
 * Shows how reducing trust-debt units affects sovereignty.
 *
 * @param currentUnits Current trust-debt units
 * @param driftEvents Current drift event count
 * @returns Recovery milestones
 */
export declare function calculateRecoveryPath(currentUnits: number, driftEvents: number): Array<{
    targetGrade: Grade;
    unitsNeeded: number;
    sovereigntyGain: number;
}>;
//# sourceMappingURL=sovereignty.d.ts.map