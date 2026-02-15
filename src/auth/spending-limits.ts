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

// ─── Constants ──────────────────────────────────────────────────────────

/** Minimum daily spending limit (even at 0.0 sovereignty) */
export const MIN_DAILY_LIMIT = 5.0;

/** Maximum daily spending limit (at 1.0 sovereignty) */
export const MAX_DAILY_LIMIT = 100.0;

/** Spending limit range (for calculation) */
const LIMIT_RANGE = MAX_DAILY_LIMIT - MIN_DAILY_LIMIT; // $95

// ─── Sovereignty Milestone Levels ───────────────────────────────────────

/**
 * Semantic sovereignty levels with their spending limits.
 * Used for reporting and UI display.
 */
export const SOVEREIGNTY_MILESTONES = {
  CRITICAL: { threshold: 0.0, limit: 5.0, emoji: '🔴', label: 'CRITICAL' },
  RESTRICTED: { threshold: 0.3, limit: 13.55, emoji: '🟠', label: 'RESTRICTED' },
  BASIC: { threshold: 0.5, limit: 28.75, emoji: '🟡', label: 'BASIC' },
  TRUSTED: { threshold: 0.7, limit: 51.55, emoji: '🟢', label: 'TRUSTED' },
  EXCELLENT: { threshold: 0.9, limit: 81.95, emoji: '💚', label: 'EXCELLENT' },
  PERFECT: { threshold: 1.0, limit: 100.0, emoji: '✨', label: 'PERFECT' },
} as const;

export type SovereigntyLevel = keyof typeof SOVEREIGNTY_MILESTONES;

// ─── Types ──────────────────────────────────────────────────────────────

/** Spending limit calculation result */
export interface SpendingLimitCalculation {
  dailyLimit: number; // Daily spending limit in USD
  sovereignty: number; // Current sovereignty score (0.0-1.0)
  level: SovereigntyLevel; // Semantic level (CRITICAL, RESTRICTED, etc.)
  levelEmoji: string; // Emoji for UI display
  percentOfMax: number; // Percentage of maximum limit (0-100)
  marginToNextLevel: number | null; // USD increase to reach next level
  nextLevel: SovereigntyLevel | null; // Next milestone level
  nextLevelSovereignty: number | null; // Sovereignty needed for next level
}

/** Budget status for current spending */
export interface BudgetStatus {
  spent: number; // Amount spent today (USD)
  limit: number; // Daily limit (USD)
  remaining: number; // Remaining budget (USD)
  percentUsed: number; // Percentage of limit used (0-100)
  alert: boolean; // True if budget exceeded or nearly exceeded
  alertLevel: 'ok' | 'warning' | 'critical' | 'exceeded';
  message: string; // Human-readable status message
}

// ─── Core Calculation ───────────────────────────────────────────────────

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
export function calculateDailyLimit(sovereignty: number): number {
  // Handle NaN — treat as zero sovereignty
  if (Number.isNaN(sovereignty)) {
    return MIN_DAILY_LIMIT;
  }

  // Clamp sovereignty to valid range
  const s = Math.max(0, Math.min(1, sovereignty));

  // Quadratic scaling: limit = BASE + RANGE * sovereignty^2
  const limit = MIN_DAILY_LIMIT + LIMIT_RANGE * Math.pow(s, 2);

  return Number(limit.toFixed(2));
}

/**
 * Calculate complete spending limit details from sovereignty calculation.
 *
 * Provides spending limit, current level, and path to next milestone.
 *
 * @param sovereigntyCalc Sovereignty calculation from sovereignty.ts
 * @returns Complete spending limit calculation
 */
export function calculateSpendingLimit(
  sovereigntyCalc: SovereigntyCalculation,
): SpendingLimitCalculation {
  const sovereignty = sovereigntyCalc.score;
  const dailyLimit = calculateDailyLimit(sovereignty);
  const level = getSovereigntyLevel(sovereignty);
  const milestone = SOVEREIGNTY_MILESTONES[level];
  const percentOfMax = (dailyLimit / MAX_DAILY_LIMIT) * 100;

  // Find next milestone
  const nextMilestone = getNextMilestone(level);
  const marginToNextLevel = nextMilestone
    ? calculateDailyLimit(nextMilestone.threshold) - dailyLimit
    : null;

  return {
    dailyLimit,
    sovereignty,
    level,
    levelEmoji: milestone.emoji,
    percentOfMax,
    marginToNextLevel,
    nextLevel: nextMilestone ? getLevelName(nextMilestone.threshold) : null,
    nextLevelSovereignty: nextMilestone?.threshold ?? null,
  };
}

/**
 * Map sovereignty score to semantic level.
 *
 * @param sovereignty Sovereignty score (0.0-1.0)
 * @returns Semantic level name
 */
export function getSovereigntyLevel(sovereignty: number): SovereigntyLevel {
  if (sovereignty >= 1.0) return 'PERFECT';
  if (sovereignty >= 0.9) return 'EXCELLENT';
  if (sovereignty >= 0.7) return 'TRUSTED';
  if (sovereignty >= 0.5) return 'BASIC';
  if (sovereignty >= 0.3) return 'RESTRICTED';
  return 'CRITICAL';
}

/**
 * Get level name from sovereignty threshold.
 * Helper for reverse lookups.
 */
function getLevelName(threshold: number): SovereigntyLevel {
  for (const [name, data] of Object.entries(SOVEREIGNTY_MILESTONES)) {
    if (data.threshold === threshold) {
      return name as SovereigntyLevel;
    }
  }
  return 'CRITICAL';
}

/**
 * Get next milestone above current level.
 * Returns null if already at maximum.
 */
function getNextMilestone(
  currentLevel: SovereigntyLevel,
): typeof SOVEREIGNTY_MILESTONES[SovereigntyLevel] | null {
  const levels: SovereigntyLevel[] = [
    'CRITICAL',
    'RESTRICTED',
    'BASIC',
    'TRUSTED',
    'EXCELLENT',
    'PERFECT',
  ];

  const currentIndex = levels.indexOf(currentLevel);
  if (currentIndex === -1 || currentIndex >= levels.length - 1) {
    return null;
  }

  const nextLevel = levels[currentIndex + 1];
  return SOVEREIGNTY_MILESTONES[nextLevel];
}

// ─── Budget Status ──────────────────────────────────────────────────────

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
export function calculateBudgetStatus(
  spent: number,
  limit: number,
): BudgetStatus {
  const remaining = Math.max(0, limit - spent);
  const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;

  let alertLevel: BudgetStatus['alertLevel'];
  let message: string;
  let alert: boolean;

  if (percentUsed >= 100) {
    alertLevel = 'exceeded';
    message = `🚨 BUDGET EXCEEDED: Spent $${spent.toFixed(2)} of $${limit.toFixed(2)} limit (${percentUsed.toFixed(1)}% used)`;
    alert = true;
  } else if (percentUsed >= 90) {
    alertLevel = 'critical';
    message = `⚠️ BUDGET CRITICAL: Spent $${spent.toFixed(2)} of $${limit.toFixed(2)} limit (${percentUsed.toFixed(1)}% used, $${remaining.toFixed(2)} remaining)`;
    alert = true;
  } else if (percentUsed >= 70) {
    alertLevel = 'warning';
    message = `⚠️ BUDGET WARNING: Spent $${spent.toFixed(2)} of $${limit.toFixed(2)} limit (${percentUsed.toFixed(1)}% used, $${remaining.toFixed(2)} remaining)`;
    alert = true;
  } else {
    alertLevel = 'ok';
    message = `✅ Budget healthy: Spent $${spent.toFixed(2)} of $${limit.toFixed(2)} limit (${percentUsed.toFixed(1)}% used, $${remaining.toFixed(2)} remaining)`;
    alert = false;
  }

  return {
    spent,
    limit,
    remaining,
    percentUsed,
    alert,
    alertLevel,
    message,
  };
}

// ─── Forecasting & Recovery ─────────────────────────────────────────────

/**
 * Calculate how much sovereignty increase is needed to reach target spending limit.
 *
 * Useful for forecasting and goal-setting.
 *
 * @param currentSovereignty Current sovereignty score
 * @param targetLimit Target daily limit (USD)
 * @returns Sovereignty increase needed, or null if already at/above target
 */
export function sovereigntyNeededForLimit(
  currentSovereignty: number,
  targetLimit: number,
): number | null {
  if (targetLimit > MAX_DAILY_LIMIT) {
    targetLimit = MAX_DAILY_LIMIT;
  }

  const currentLimit = calculateDailyLimit(currentSovereignty);
  if (currentLimit >= targetLimit) {
    return null; // Already at or above target
  }

  // Solve: BASE + RANGE * s^2 = targetLimit
  // s^2 = (targetLimit - BASE) / RANGE
  // s = sqrt((targetLimit - BASE) / RANGE)
  const targetSovereignty = Math.sqrt((targetLimit - MIN_DAILY_LIMIT) / LIMIT_RANGE);

  return targetSovereignty - currentSovereignty;
}

/**
 * Calculate spending limit recovery path.
 *
 * Shows how reducing trust-debt units affects spending limits.
 *
 * @param currentSovereignty Current sovereignty score
 * @param driftEvents Current drift event count
 * @returns Array of recovery milestones with spending limit gains
 */
export function calculateSpendingRecoveryPath(
  currentSovereignty: number,
): Array<{
  level: SovereigntyLevel;
  sovereigntyNeeded: number;
  limitGain: number;
  percentIncrease: number;
}> {
  const currentLimit = calculateDailyLimit(currentSovereignty);
  const path: Array<{
    level: SovereigntyLevel;
    sovereigntyNeeded: number;
    limitGain: number;
    percentIncrease: number;
  }> = [];

  const levels: SovereigntyLevel[] = [
    'RESTRICTED',
    'BASIC',
    'TRUSTED',
    'EXCELLENT',
    'PERFECT',
  ];

  for (const level of levels) {
    const milestone = SOVEREIGNTY_MILESTONES[level];
    if (milestone.threshold > currentSovereignty) {
      const targetLimit = calculateDailyLimit(milestone.threshold);
      const limitGain = targetLimit - currentLimit;
      const percentIncrease = (limitGain / currentLimit) * 100;

      path.push({
        level,
        sovereigntyNeeded: milestone.threshold - currentSovereignty,
        limitGain,
        percentIncrease,
      });
    }
  }

  return path;
}

// ─── Reporting ──────────────────────────────────────────────────────────

/**
 * Generate human-readable spending limit report.
 *
 * @param calc Spending limit calculation
 * @returns Formatted report string
 */
export function formatSpendingLimitReport(
  calc: SpendingLimitCalculation,
): string {
  const lines: string[] = [];

  lines.push(`${calc.levelEmoji} Sovereignty Level: ${calc.level}`);
  lines.push(`Daily Spending Limit: $${calc.dailyLimit.toFixed(2)}`);
  lines.push(`Sovereignty Score: ${calc.sovereignty.toFixed(3)} (${calc.percentOfMax.toFixed(1)}% of max)`);

  if (calc.nextLevel && calc.marginToNextLevel !== null) {
    lines.push('');
    lines.push(`Next Level: ${calc.nextLevel} (sovereignty ${calc.nextLevelSovereignty?.toFixed(3)})`);
    lines.push(`Limit Increase: +$${calc.marginToNextLevel.toFixed(2)}/day`);
  } else {
    lines.push('');
    lines.push('🎉 Maximum sovereignty level reached!');
  }

  return lines.join('\n');
}

/**
 * Generate spending recovery recommendations.
 *
 * @param currentSovereignty Current sovereignty score
 * @returns Formatted recommendations
 */
export function formatRecoveryRecommendations(
  currentSovereignty: number,
): string {
  const path = calculateSpendingRecoveryPath(currentSovereignty);

  if (path.length === 0) {
    return '✅ No recovery needed — operating at maximum sovereignty';
  }

  const lines: string[] = ['📈 Spending Limit Recovery Path:', ''];

  for (const milestone of path) {
    lines.push(
      `${SOVEREIGNTY_MILESTONES[milestone.level].emoji} ${milestone.level}: ` +
      `+$${milestone.limitGain.toFixed(2)}/day (+${milestone.percentIncrease.toFixed(1)}%) ` +
      `— requires ${milestone.sovereigntyNeeded.toFixed(3)} sovereignty increase`,
    );
  }

  return lines.join('\n');
}
