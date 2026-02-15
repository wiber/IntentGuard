/**
 * src/auth/spending-limits.ts — Sovereignty-Based Spending Limits
 *
 * Maps FIM sovereignty scores to daily spending limits using a continuous function.
 * Implements economic governance where high trust = high spending authority.
 *
 * EQUATION:
 *   DailyLimit($) = BASE + (MAX - BASE) * sovereignty^2
 *
 * WHERE:
 *   - BASE = $5 (minimum daily limit, even at 0 sovereignty)
 *   - MAX = $100 (maximum daily limit at perfect 1.0 sovereignty)
 *   - sovereignty^2 = quadratic scaling (rewards high trust more than linear)
 *
 * RATIONALE:
 *   - Quadratic scaling creates strong incentive to maintain high sovereignty
 *   - Non-zero base ensures system remains operational even with low trust
 *   - $5-$100 range balances autonomy with financial risk management
 *
 * INTEGRATION:
 *   - Reads sovereignty from: sovereignty.ts (calculateSovereignty)
 *   - Used by: wallet-ledger.ts (checkBudgetAlert), wallet.ts (handleExpense)
 *   - Monitored by: cost-reporter.ts (checkAndAlert)
 *
 * STATUS: v1.0 — Core spending limit calculation with quadratic sovereignty mapping
 */
import type { SovereigntyCalculation } from './sovereignty.js';
/** Minimum daily spending limit (even at 0.0 sovereignty) */
export declare const MIN_DAILY_LIMIT = 5;
/** Maximum daily spending limit (at 1.0 sovereignty) */
export declare const MAX_DAILY_LIMIT = 100;
/**
 * Semantic sovereignty levels with their spending limits.
 * Used for reporting and UI display.
 */
export declare const SOVEREIGNTY_MILESTONES: {
    readonly CRITICAL: {
        readonly threshold: 0;
        readonly limit: 5;
        readonly emoji: "🔴";
        readonly label: "CRITICAL";
    };
    readonly RESTRICTED: {
        readonly threshold: 0.3;
        readonly limit: 13.55;
        readonly emoji: "🟠";
        readonly label: "RESTRICTED";
    };
    readonly BASIC: {
        readonly threshold: 0.5;
        readonly limit: 28.75;
        readonly emoji: "🟡";
        readonly label: "BASIC";
    };
    readonly TRUSTED: {
        readonly threshold: 0.7;
        readonly limit: 51.55;
        readonly emoji: "🟢";
        readonly label: "TRUSTED";
    };
    readonly EXCELLENT: {
        readonly threshold: 0.9;
        readonly limit: 81.95;
        readonly emoji: "💚";
        readonly label: "EXCELLENT";
    };
    readonly PERFECT: {
        readonly threshold: 1;
        readonly limit: 100;
        readonly emoji: "✨";
        readonly label: "PERFECT";
    };
};
export type SovereigntyLevel = keyof typeof SOVEREIGNTY_MILESTONES;
/** Spending limit calculation result */
export interface SpendingLimitCalculation {
    dailyLimit: number;
    sovereignty: number;
    level: SovereigntyLevel;
    levelEmoji: string;
    percentOfMax: number;
    marginToNextLevel: number | null;
    nextLevel: SovereigntyLevel | null;
    nextLevelSovereignty: number | null;
}
/** Budget status for current spending */
export interface BudgetStatus {
    spent: number;
    limit: number;
    remaining: number;
    percentUsed: number;
    alert: boolean;
    alertLevel: 'ok' | 'warning' | 'critical' | 'exceeded';
    message: string;
}
/**
 * Calculate daily spending limit from sovereignty score.
 *
 * Uses quadratic scaling to reward high sovereignty:
 *   - 0.0 sovereignty → $5/day
 *   - 0.3 sovereignty → $13.55/day
 *   - 0.5 sovereignty → $28.75/day
 *   - 0.7 sovereignty → $51.55/day
 *   - 0.9 sovereignty → $81.55/day
 *   - 1.0 sovereignty → $100/day
 *
 * Quadratic scaling creates strong incentive to maintain high trust debt grades.
 *
 * @param sovereignty Sovereignty score (0.0-1.0)
 * @returns Daily spending limit in USD
 */
export declare function calculateDailyLimit(sovereignty: number): number;
/**
 * Calculate complete spending limit details from sovereignty calculation.
 *
 * Provides spending limit, current level, and path to next milestone.
 *
 * @param sovereigntyCalc Sovereignty calculation from sovereignty.ts
 * @returns Complete spending limit calculation
 */
export declare function calculateSpendingLimit(sovereigntyCalc: SovereigntyCalculation): SpendingLimitCalculation;
/**
 * Map sovereignty score to semantic level.
 *
 * @param sovereignty Sovereignty score (0.0-1.0)
 * @returns Semantic level name
 */
export declare function getSovereigntyLevel(sovereignty: number): SovereigntyLevel;
/**
 * Calculate budget status from spending and limit.
 *
 * Alert levels:
 *   - ok: < 70% of limit used
 *   - warning: 70-90% of limit used
 *   - critical: 90-100% of limit used
 *   - exceeded: > 100% of limit used
 *
 * @param spent Amount spent today (USD)
 * @param limit Daily spending limit (USD)
 * @returns Budget status with alert level
 */
export declare function calculateBudgetStatus(spent: number, limit: number): BudgetStatus;
/**
 * Calculate how much sovereignty increase is needed to reach target spending limit.
 *
 * Useful for forecasting and goal-setting.
 *
 * @param currentSovereignty Current sovereignty score
 * @param targetLimit Target daily limit (USD)
 * @returns Sovereignty increase needed, or null if already at/above target
 */
export declare function sovereigntyNeededForLimit(currentSovereignty: number, targetLimit: number): number | null;
/**
 * Calculate spending limit recovery path.
 *
 * Shows how reducing trust-debt units affects spending limits.
 *
 * @param currentSovereignty Current sovereignty score
 * @param driftEvents Current drift event count
 * @returns Array of recovery milestones with spending limit gains
 */
export declare function calculateSpendingRecoveryPath(currentSovereignty: number): Array<{
    level: SovereigntyLevel;
    sovereigntyNeeded: number;
    limitGain: number;
    percentIncrease: number;
}>;
/**
 * Generate human-readable spending limit report.
 *
 * @param calc Spending limit calculation
 * @returns Formatted report string
 */
export declare function formatSpendingLimitReport(calc: SpendingLimitCalculation): string;
/**
 * Generate spending recovery recommendations.
 *
 * @param currentSovereignty Current sovereignty score
 * @returns Formatted recommendations
 */
export declare function formatRecoveryRecommendations(currentSovereignty: number): string;
//# sourceMappingURL=spending-limits.d.ts.map