/**
 * src/auth/spending-limits.test.ts — Tests for Sovereignty-Based Spending Limits
 *
 * Verifies:
 * - Quadratic sovereignty-to-limit mapping
 * - Boundary conditions (0.0, 1.0 sovereignty)
 * - Milestone level classification
 * - Budget status calculation
 * - Recovery path generation
 * - Report formatting
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDailyLimit,
  calculateSpendingLimit,
  getSovereigntyLevel,
  calculateBudgetStatus,
  sovereigntyNeededForLimit,
  calculateSpendingRecoveryPath,
  formatSpendingLimitReport,
  formatRecoveryRecommendations,
  MIN_DAILY_LIMIT,
  MAX_DAILY_LIMIT,
  SOVEREIGNTY_MILESTONES,
  type SovereigntyCalculation,
} from './spending-limits.js';

describe('calculateDailyLimit', () => {
  it('should return minimum limit at 0.0 sovereignty', () => {
    expect(calculateDailyLimit(0.0)).toBe(MIN_DAILY_LIMIT);
  });

  it('should return maximum limit at 1.0 sovereignty', () => {
    expect(calculateDailyLimit(1.0)).toBe(MAX_DAILY_LIMIT);
  });

  it('should use quadratic scaling (not linear)', () => {
    // At 0.5 sovereignty, quadratic gives 28.75, linear would give 52.5
    const limit = calculateDailyLimit(0.5);
    expect(limit).toBeCloseTo(28.75, 2);
    expect(limit).toBeLessThan(52.5); // Verify it's not linear
  });

  it('should return expected values at key sovereignty points', () => {
    expect(calculateDailyLimit(0.3)).toBeCloseTo(13.55, 2);
    expect(calculateDailyLimit(0.5)).toBeCloseTo(28.75, 2);
    expect(calculateDailyLimit(0.7)).toBeCloseTo(51.55, 2);
    expect(calculateDailyLimit(0.9)).toBeCloseTo(81.95, 2);
  });

  it('should clamp negative sovereignty to 0', () => {
    expect(calculateDailyLimit(-0.5)).toBe(MIN_DAILY_LIMIT);
  });

  it('should clamp sovereignty above 1.0 to 1.0', () => {
    expect(calculateDailyLimit(1.5)).toBe(MAX_DAILY_LIMIT);
  });

  it('should be monotonically increasing', () => {
    const points = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
    for (let i = 1; i < points.length; i++) {
      const prev = calculateDailyLimit(points[i - 1]);
      const curr = calculateDailyLimit(points[i]);
      expect(curr).toBeGreaterThan(prev);
    }
  });

  it('should produce continuous values (no sudden jumps)', () => {
    const limit1 = calculateDailyLimit(0.500);
    const limit2 = calculateDailyLimit(0.501);
    const diff = Math.abs(limit2 - limit1);
    expect(diff).toBeLessThan(0.2); // Small sovereignty change = small limit change
  });
});

describe('getSovereigntyLevel', () => {
  it('should classify sovereignty scores into correct levels', () => {
    expect(getSovereigntyLevel(0.0)).toBe('CRITICAL');
    expect(getSovereigntyLevel(0.29)).toBe('CRITICAL');
    expect(getSovereigntyLevel(0.3)).toBe('RESTRICTED');
    expect(getSovereigntyLevel(0.49)).toBe('RESTRICTED');
    expect(getSovereigntyLevel(0.5)).toBe('BASIC');
    expect(getSovereigntyLevel(0.69)).toBe('BASIC');
    expect(getSovereigntyLevel(0.7)).toBe('TRUSTED');
    expect(getSovereigntyLevel(0.89)).toBe('TRUSTED');
    expect(getSovereigntyLevel(0.9)).toBe('EXCELLENT');
    expect(getSovereigntyLevel(0.99)).toBe('EXCELLENT');
    expect(getSovereigntyLevel(1.0)).toBe('PERFECT');
  });
});

describe('calculateSpendingLimit', () => {
  it('should calculate complete spending limit details', () => {
    const sovereigntyCalc: SovereigntyCalculation = {
      score: 0.7,
      grade: 'B',
      gradeEmoji: '🟡',
      trustDebtUnits: 1200,
      driftEvents: 2,
      rawScore: 0.72,
      driftReduction: 2.78,
      categoryScores: {},
      timestamp: new Date().toISOString(),
    };

    const result = calculateSpendingLimit(sovereigntyCalc);

    expect(result.sovereignty).toBe(0.7);
    expect(result.dailyLimit).toBeCloseTo(51.55, 2);
    expect(result.level).toBe('TRUSTED');
    expect(result.levelEmoji).toBe('🟢');
    expect(result.percentOfMax).toBeCloseTo(51.55, 1);
    expect(result.nextLevel).toBe('EXCELLENT');
    expect(result.nextLevelSovereignty).toBe(0.9);
    expect(result.marginToNextLevel).toBeGreaterThan(0);
  });

  it('should handle perfect sovereignty', () => {
    const sovereigntyCalc: SovereigntyCalculation = {
      score: 1.0,
      grade: 'A',
      gradeEmoji: '🟢',
      trustDebtUnits: 0,
      driftEvents: 0,
      rawScore: 1.0,
      driftReduction: 0,
      categoryScores: {},
      timestamp: new Date().toISOString(),
    };

    const result = calculateSpendingLimit(sovereigntyCalc);

    expect(result.sovereignty).toBe(1.0);
    expect(result.dailyLimit).toBe(MAX_DAILY_LIMIT);
    expect(result.level).toBe('PERFECT');
    expect(result.nextLevel).toBeNull();
    expect(result.marginToNextLevel).toBeNull();
  });

  it('should handle critical sovereignty', () => {
    const sovereigntyCalc: SovereigntyCalculation = {
      score: 0.1,
      grade: 'D',
      gradeEmoji: '🔴',
      trustDebtUnits: 2800,
      driftEvents: 10,
      rawScore: 0.15,
      driftReduction: 33.33,
      categoryScores: {},
      timestamp: new Date().toISOString(),
    };

    const result = calculateSpendingLimit(sovereigntyCalc);

    expect(result.sovereignty).toBe(0.1);
    expect(result.dailyLimit).toBeCloseTo(5.95, 2);
    expect(result.level).toBe('CRITICAL');
    expect(result.nextLevel).toBe('RESTRICTED');
  });
});

describe('calculateBudgetStatus', () => {
  it('should return ok status when under 70% of limit', () => {
    const status = calculateBudgetStatus(30, 50);

    expect(status.alertLevel).toBe('ok');
    expect(status.alert).toBe(false);
    expect(status.percentUsed).toBe(60);
    expect(status.remaining).toBe(20);
  });

  it('should return warning status when 70-90% of limit used', () => {
    const status = calculateBudgetStatus(40, 50);

    expect(status.alertLevel).toBe('warning');
    expect(status.alert).toBe(true);
    expect(status.percentUsed).toBe(80);
  });

  it('should return critical status when 90-100% of limit used', () => {
    const status = calculateBudgetStatus(47, 50);

    expect(status.alertLevel).toBe('critical');
    expect(status.alert).toBe(true);
    expect(status.percentUsed).toBe(94);
  });

  it('should return exceeded status when over limit', () => {
    const status = calculateBudgetStatus(60, 50);

    expect(status.alertLevel).toBe('exceeded');
    expect(status.alert).toBe(true);
    expect(status.percentUsed).toBe(120);
    expect(status.remaining).toBe(0);
  });

  it('should handle zero limit gracefully', () => {
    const status = calculateBudgetStatus(10, 0);

    expect(status.percentUsed).toBe(0);
    expect(status.remaining).toBe(0);
  });
});

describe('sovereigntyNeededForLimit', () => {
  it('should calculate sovereignty needed to reach target limit', () => {
    const currentSovereignty = 0.5; // $28.75/day
    const targetLimit = 50.0; // ~$50/day

    const needed = sovereigntyNeededForLimit(currentSovereignty, targetLimit);

    expect(needed).not.toBeNull();
    expect(needed).toBeGreaterThan(0);
    expect(needed).toBeCloseTo(0.19, 2); // ~0.69 total - 0.5 current
  });

  it('should return null if already at or above target', () => {
    const currentSovereignty = 0.9; // $81.55/day
    const targetLimit = 50.0; // Lower than current

    const needed = sovereigntyNeededForLimit(currentSovereignty, targetLimit);

    expect(needed).toBeNull();
  });

  it('should cap target at maximum limit', () => {
    const currentSovereignty = 0.5;
    const targetLimit = 200.0; // Above max

    const needed = sovereigntyNeededForLimit(currentSovereignty, targetLimit);

    expect(needed).not.toBeNull();
    // Should calculate based on MAX_DAILY_LIMIT (100), not 200
    expect(needed).toBeCloseTo(0.5, 2);
  });
});

describe('calculateSpendingRecoveryPath', () => {
  it('should generate recovery path for low sovereignty', () => {
    const path = calculateSpendingRecoveryPath(0.2);

    expect(path.length).toBeGreaterThan(0);
    expect(path[0].level).toBe('RESTRICTED');
    expect(path[0].sovereigntyNeeded).toBeGreaterThan(0);
    expect(path[0].limitGain).toBeGreaterThan(0);
    expect(path[0].percentIncrease).toBeGreaterThan(0);
  });

  it('should include all higher milestones', () => {
    const path = calculateSpendingRecoveryPath(0.2);

    const levels = path.map(p => p.level);
    expect(levels).toContain('RESTRICTED');
    expect(levels).toContain('BASIC');
    expect(levels).toContain('TRUSTED');
    expect(levels).toContain('EXCELLENT');
    expect(levels).toContain('PERFECT');
  });

  it('should return empty path for perfect sovereignty', () => {
    const path = calculateSpendingRecoveryPath(1.0);

    expect(path.length).toBe(0);
  });

  it('should show increasing limit gains', () => {
    const path = calculateSpendingRecoveryPath(0.2);

    for (let i = 1; i < path.length; i++) {
      // Each milestone should have larger absolute gain
      expect(path[i].limitGain).toBeGreaterThan(path[i - 1].limitGain);
    }
  });

  it('should calculate percentage increases correctly', () => {
    const currentSovereignty = 0.5;
    const currentLimit = calculateDailyLimit(currentSovereignty);
    const path = calculateSpendingRecoveryPath(currentSovereignty);

    const firstMilestone = path[0];
    const targetLimit = calculateDailyLimit(
      SOVEREIGNTY_MILESTONES[firstMilestone.level].threshold,
    );
    const expectedGain = targetLimit - currentLimit;
    const expectedPercent = (expectedGain / currentLimit) * 100;

    expect(firstMilestone.limitGain).toBeCloseTo(expectedGain, 2);
    expect(firstMilestone.percentIncrease).toBeCloseTo(expectedPercent, 1);
  });
});

describe('formatSpendingLimitReport', () => {
  it('should format report with all required information', () => {
    const calc = calculateSpendingLimit({
      score: 0.7,
      grade: 'B',
      gradeEmoji: '🟡',
      trustDebtUnits: 1200,
      driftEvents: 2,
      rawScore: 0.72,
      driftReduction: 2.78,
      categoryScores: {},
      timestamp: new Date().toISOString(),
    });

    const report = formatSpendingLimitReport(calc);

    expect(report).toContain('TRUSTED');
    expect(report).toContain('$51.55');
    expect(report).toContain('0.700');
    expect(report).toContain('EXCELLENT');
  });

  it('should show congratulations at max sovereignty', () => {
    const calc = calculateSpendingLimit({
      score: 1.0,
      grade: 'A',
      gradeEmoji: '🟢',
      trustDebtUnits: 0,
      driftEvents: 0,
      rawScore: 1.0,
      driftReduction: 0,
      categoryScores: {},
      timestamp: new Date().toISOString(),
    });

    const report = formatSpendingLimitReport(calc);

    expect(report).toContain('Maximum sovereignty level reached');
    expect(report).not.toContain('Next Level');
  });
});

describe('formatRecoveryRecommendations', () => {
  it('should format recovery recommendations', () => {
    const recommendations = formatRecoveryRecommendations(0.3);

    expect(recommendations).toContain('Recovery Path');
    expect(recommendations).toContain('BASIC');
    expect(recommendations).toContain('sovereignty increase');
  });

  it('should show no recovery needed at max sovereignty', () => {
    const recommendations = formatRecoveryRecommendations(1.0);

    expect(recommendations).toContain('No recovery needed');
    expect(recommendations).toContain('maximum sovereignty');
  });
});

describe('Integration: Sovereignty Milestones', () => {
  it('should have consistent milestone limits', () => {
    for (const [level, data] of Object.entries(SOVEREIGNTY_MILESTONES)) {
      const calculatedLimit = calculateDailyLimit(data.threshold);
      expect(calculatedLimit).toBeCloseTo(data.limit, 2);
    }
  });

  it('should have monotonically increasing thresholds', () => {
    const levels = Object.values(SOVEREIGNTY_MILESTONES);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i].threshold).toBeGreaterThan(levels[i - 1].threshold);
      expect(levels[i].limit).toBeGreaterThan(levels[i - 1].limit);
    }
  });
});
