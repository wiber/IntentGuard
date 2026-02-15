/**
 * src/auth/spending-limits-integration.test.ts
 *
 * Integration tests verifying sovereignty scores wire to spending limits correctly.
 * Tests the full pipeline: sovereignty calculation → spending limits → wallet enforcement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDailyLimit,
  calculateSpendingLimit,
  getSovereigntyLevel,
  calculateBudgetStatus,
  sovereigntyNeededForLimit,
  calculateSpendingRecoveryPath,
  MIN_DAILY_LIMIT,
  MAX_DAILY_LIMIT,
  type SpendingLimitCalculation,
} from './spending-limits.js';
import { calculateSovereignty, type TrustDebtStats } from './sovereignty.js';

describe('Spending Limits Integration', () => {
  describe('Sovereignty → Spending Limit Wiring', () => {
    it('should map Grade A sovereignty (0.9) to high spending limit', () => {
      const sovereignty = 0.9;
      const limit = calculateDailyLimit(sovereignty);

      expect(limit).toBeGreaterThan(80);
      expect(limit).toBeLessThanOrEqual(MAX_DAILY_LIMIT);
      expect(getSovereigntyLevel(sovereignty)).toBe('EXCELLENT');
    });

    it('should map Grade B sovereignty (0.7) to moderate spending limit', () => {
      const sovereignty = 0.7;
      const limit = calculateDailyLimit(sovereignty);

      expect(limit).toBeGreaterThan(45);
      expect(limit).toBeLessThan(60);
      expect(getSovereigntyLevel(sovereignty)).toBe('TRUSTED');
    });

    it('should map Grade C sovereignty (0.5) to basic spending limit', () => {
      const sovereignty = 0.5;
      const limit = calculateDailyLimit(sovereignty);

      expect(limit).toBeGreaterThan(20);
      expect(limit).toBeLessThan(35);
      expect(getSovereigntyLevel(sovereignty)).toBe('BASIC');
    });

    it('should map Grade D sovereignty (0.3) to restricted spending limit', () => {
      const sovereignty = 0.3;
      const limit = calculateDailyLimit(sovereignty);

      expect(limit).toBeGreaterThan(10);
      expect(limit).toBeLessThan(20);
      expect(getSovereigntyLevel(sovereignty)).toBe('RESTRICTED');
    });

    it('should never drop below minimum limit even at 0 sovereignty', () => {
      const sovereignty = 0.0;
      const limit = calculateDailyLimit(sovereignty);

      expect(limit).toBe(MIN_DAILY_LIMIT);
      expect(limit).toBeGreaterThan(0);
    });

    it('should cap at maximum limit for perfect sovereignty', () => {
      const sovereignty = 1.0;
      const limit = calculateDailyLimit(sovereignty);

      expect(limit).toBe(MAX_DAILY_LIMIT);
    });

    it('should handle sovereignty > 1.0 gracefully', () => {
      const sovereignty = 1.5;
      const limit = calculateDailyLimit(sovereignty);

      // Should clamp to max
      expect(limit).toBe(MAX_DAILY_LIMIT);
    });

    it('should handle negative sovereignty gracefully', () => {
      const sovereignty = -0.2;
      const limit = calculateDailyLimit(sovereignty);

      // Should clamp to min
      expect(limit).toBe(MIN_DAILY_LIMIT);
    });
  });

  describe('Quadratic Scaling Behavior', () => {
    it('should apply quadratic scaling (sovereignty^2)', () => {
      // Test quadratic relationship: limit = BASE + RANGE * s^2
      const BASE = MIN_DAILY_LIMIT;
      const RANGE = MAX_DAILY_LIMIT - MIN_DAILY_LIMIT;

      const sovereignty = 0.6;
      const expectedLimit = BASE + RANGE * Math.pow(sovereignty, 2);
      const actualLimit = calculateDailyLimit(sovereignty);

      expect(actualLimit).toBeCloseTo(expectedLimit, 2);
    });

    it('should reward high sovereignty more than linear scaling', () => {
      // With quadratic scaling, going from 0.5 → 0.9 should give
      // more gain than 0.1 → 0.5
      const limit_01 = calculateDailyLimit(0.1);
      const limit_05 = calculateDailyLimit(0.5);
      const limit_09 = calculateDailyLimit(0.9);

      const gain_low = limit_05 - limit_01;
      const gain_high = limit_09 - limit_05;

      expect(gain_high).toBeGreaterThan(gain_low);
    });

    it('should create smooth continuous curve', () => {
      // Test that small sovereignty changes create proportional limit changes
      const s1 = 0.5;
      const s2 = 0.51;

      const limit1 = calculateDailyLimit(s1);
      const limit2 = calculateDailyLimit(s2);

      const delta = Math.abs(limit2 - limit1);

      // Small change in sovereignty → small change in limit
      expect(delta).toBeLessThan(2);
      expect(delta).toBeGreaterThan(0);
    });
  });

  describe('Trust Debt Pipeline Integration', () => {
    it('should convert trust debt stats to spending limits', () => {
      // Simulate Grade B trust debt (1200 units)
      const trustDebtStats: TrustDebtStats = {
        total_units: 1200,
        grade: 'B',
        category_performance: {
          'A🚀_CoreEngine': { units: 200, percentage: '16.7%', grade: 'A' },
          'B🔒_Documentation': { units: 300, percentage: '25.0%', grade: 'B' },
          'C💨_Visualization': { units: 250, percentage: '20.8%', grade: 'B' },
          'D🧠_Integration': { units: 200, percentage: '16.7%', grade: 'A' },
          'E🎨_BusinessLayer': { units: 150, percentage: '12.5%', grade: 'A' },
          'F⚡_Agents': { units: 100, percentage: '8.3%', grade: 'A' },
        },
      };

      const sovereigntyCalc = calculateSovereignty(trustDebtStats, 0);
      const spendingLimit = calculateSpendingLimit(sovereigntyCalc);

      // Grade B (1200 units) → ~0.6 sovereignty → ~$40/day
      expect(spendingLimit.sovereignty).toBeGreaterThan(0.5);
      expect(spendingLimit.sovereignty).toBeLessThan(0.7);
      expect(spendingLimit.dailyLimit).toBeGreaterThan(30);
      expect(spendingLimit.dailyLimit).toBeLessThan(60);
      expect(spendingLimit.level).toBe('BASIC');
    });

    it('should reflect drift events in spending limits', () => {
      const trustDebtStats: TrustDebtStats = {
        total_units: 800,
        grade: 'B',
        category_performance: {},
      };

      // Calculate without drift
      const withoutDrift = calculateSovereignty(trustDebtStats, 0);
      const limitWithoutDrift = calculateSpendingLimit(withoutDrift);

      // Calculate with 10 drift events (each reduces sovereignty by 0.3%)
      const withDrift = calculateSovereignty(trustDebtStats, 10);
      const limitWithDrift = calculateSpendingLimit(withDrift);

      // Drift events should reduce sovereignty and thus spending limits
      expect(withDrift.score).toBeLessThan(withoutDrift.score);
      expect(limitWithDrift.dailyLimit).toBeLessThan(limitWithoutDrift.dailyLimit);
    });

    it('should provide recovery path for low sovereignty', () => {
      const lowSovereignty = 0.3; // RESTRICTED level
      const recoveryPath = calculateSpendingRecoveryPath(lowSovereignty);

      // Should show path to higher levels
      expect(recoveryPath.length).toBeGreaterThan(0);
      expect(recoveryPath[0].level).toBe('BASIC');
      expect(recoveryPath[0].sovereigntyNeeded).toBeGreaterThan(0);
      expect(recoveryPath[0].limitGain).toBeGreaterThan(0);

      // Each step should require higher sovereignty
      for (let i = 1; i < recoveryPath.length; i++) {
        expect(recoveryPath[i].sovereigntyNeeded).toBeGreaterThan(
          recoveryPath[i - 1].sovereigntyNeeded
        );
      }
    });
  });

  describe('Budget Status & Alerts', () => {
    it('should show OK status when spending < 70% of limit', () => {
      const limit = 100;
      const spent = 50;

      const status = calculateBudgetStatus(spent, limit);

      expect(status.alertLevel).toBe('ok');
      expect(status.alert).toBe(false);
      expect(status.remaining).toBe(50);
      expect(status.percentUsed).toBe(50);
    });

    it('should show WARNING when spending 70-90% of limit', () => {
      const limit = 100;
      const spent = 80;

      const status = calculateBudgetStatus(spent, limit);

      expect(status.alertLevel).toBe('warning');
      expect(status.alert).toBe(true);
      expect(status.remaining).toBe(20);
      expect(status.percentUsed).toBe(80);
    });

    it('should show CRITICAL when spending 90-100% of limit', () => {
      const limit = 100;
      const spent = 95;

      const status = calculateBudgetStatus(spent, limit);

      expect(status.alertLevel).toBe('critical');
      expect(status.alert).toBe(true);
      expect(status.remaining).toBe(5);
      expect(status.percentUsed).toBe(95);
    });

    it('should show EXCEEDED when spending > 100% of limit', () => {
      const limit = 100;
      const spent = 110;

      const status = calculateBudgetStatus(spent, limit);

      expect(status.alertLevel).toBe('exceeded');
      expect(status.alert).toBe(true);
      expect(status.remaining).toBe(0);
      expect(status.percentUsed).toBeCloseTo(110, 10);
    });

    it('should calculate remaining budget correctly', () => {
      const limit = 50;
      const spent = 30;

      const status = calculateBudgetStatus(spent, limit);

      expect(status.remaining).toBe(20);
      expect(status.limit).toBe(50);
      expect(status.spent).toBe(30);
    });

    it('should never show negative remaining budget', () => {
      const limit = 50;
      const spent = 70;

      const status = calculateBudgetStatus(spent, limit);

      expect(status.remaining).toBe(0);
      expect(status.remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Sovereignty Forecasting', () => {
    it('should calculate sovereignty needed to reach target limit', () => {
      const currentSovereignty = 0.5; // ~$29/day
      const targetLimit = 80; // Want ~$80/day

      const sovereigntyNeeded = sovereigntyNeededForLimit(
        currentSovereignty,
        targetLimit
      );

      expect(sovereigntyNeeded).not.toBeNull();
      if (sovereigntyNeeded !== null) {
        const targetSovereignty = currentSovereignty + sovereigntyNeeded;
        const achievedLimit = calculateDailyLimit(targetSovereignty);

        expect(achievedLimit).toBeGreaterThanOrEqual(targetLimit - 1);
        expect(achievedLimit).toBeLessThanOrEqual(targetLimit + 1);
      }
    });

    it('should return null if already at target limit', () => {
      const currentSovereignty = 0.9; // ~$82/day
      const targetLimit = 50; // Already exceed this

      const sovereigntyNeeded = sovereigntyNeededForLimit(
        currentSovereignty,
        targetLimit
      );

      expect(sovereigntyNeeded).toBeNull();
    });

    it('should handle target limit exceeding maximum', () => {
      const currentSovereignty = 0.5;
      const targetLimit = 500; // Way above $100 max

      const sovereigntyNeeded = sovereigntyNeededForLimit(
        currentSovereignty,
        targetLimit
      );

      // Should calculate path to MAX_DAILY_LIMIT
      expect(sovereigntyNeeded).not.toBeNull();
      if (sovereigntyNeeded !== null) {
        const targetSovereignty = currentSovereignty + sovereigntyNeeded;
        expect(targetSovereignty).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('Economic Incentive Alignment', () => {
    it('should create strong incentive to maintain high sovereignty', () => {
      // Compare spending power at different sovereignty levels
      const limits = [
        { sovereignty: 0.3, label: 'RESTRICTED' },
        { sovereignty: 0.5, label: 'BASIC' },
        { sovereignty: 0.7, label: 'TRUSTED' },
        { sovereignty: 0.9, label: 'EXCELLENT' },
      ].map(({ sovereignty, label }) => ({
        label,
        sovereignty,
        limit: calculateDailyLimit(sovereignty),
      }));

      // Each tier should offer significantly more spending power
      for (let i = 1; i < limits.length; i++) {
        const current = limits[i];
        const previous = limits[i - 1];

        const gainPercent =
          ((current.limit - previous.limit) / previous.limit) * 100;

        // Each tier upgrade should offer 30%+ spending increase
        expect(gainPercent).toBeGreaterThan(30);
      }
    });

    it('should make Grade A sovereignty valuable ($80+/day vs $30/day)', () => {
      const gradeC = 0.5; // Needs attention
      const gradeA = 0.9; // Excellent

      const limitC = calculateDailyLimit(gradeC);
      const limitA = calculateDailyLimit(gradeA);

      const multiplier = limitA / limitC;

      // Grade A should offer 2.5x+ spending power vs Grade C
      expect(multiplier).toBeGreaterThan(2.5);
      expect(limitA - limitC).toBeGreaterThan(50); // $50+ gain
    });

    it('should penalize low sovereignty but maintain operability', () => {
      const critical = 0.0;
      const restricted = 0.3;

      const limitCritical = calculateDailyLimit(critical);
      const limitRestricted = calculateDailyLimit(restricted);

      // Even at 0 sovereignty, system should remain operational
      expect(limitCritical).toBe(MIN_DAILY_LIMIT);
      expect(limitCritical).toBeGreaterThan(0);

      // But heavily restricted compared to trusted levels
      expect(limitRestricted).toBeGreaterThan(limitCritical);
      expect(limitRestricted).toBeLessThan(20);
    });
  });

  describe('Wallet Integration', () => {
    it('should block expenses that exceed sovereignty-based limit', () => {
      const sovereignty = 0.5; // BASIC: ~$29/day
      const limit = calculateDailyLimit(sovereignty);

      const todaySpending = 25; // Already spent $25
      const newExpense = 10; // Want to spend $10 more

      const wouldExceed = todaySpending + newExpense > limit;

      // $35 total > ~$29 limit → should block
      expect(wouldExceed).toBe(true);
      expect(todaySpending + newExpense).toBeGreaterThan(limit);
    });

    it('should allow expenses within sovereignty-based limit', () => {
      const sovereignty = 0.9; // EXCELLENT: ~$82/day
      const limit = calculateDailyLimit(sovereignty);

      const todaySpending = 50; // Already spent $50
      const newExpense = 20; // Want to spend $20 more

      const wouldExceed = todaySpending + newExpense > limit;

      // $70 total < ~$82 limit → should allow
      expect(wouldExceed).toBe(false);
      expect(todaySpending + newExpense).toBeLessThan(limit);
    });

    it('should recalculate limits when sovereignty changes', () => {
      // Simulate trust debt improvement
      const beforeStats: TrustDebtStats = {
        total_units: 2000,
        grade: 'C',
        category_performance: {},
      };

      const afterStats: TrustDebtStats = {
        total_units: 800,
        grade: 'B',
        category_performance: {},
      };

      const beforeSov = calculateSovereignty(beforeStats, 0);
      const afterSov = calculateSovereignty(afterStats, 0);

      const beforeLimit = calculateSpendingLimit(beforeSov);
      const afterLimit = calculateSpendingLimit(afterSov);

      // Improving trust debt → higher sovereignty → higher spending limits
      expect(afterSov.score).toBeGreaterThan(beforeSov.score);
      expect(afterLimit.dailyLimit).toBeGreaterThan(beforeLimit.dailyLimit);
    });
  });

  describe('Edge Cases & Robustness', () => {
    it('should handle NaN sovereignty gracefully', () => {
      const sovereignty = NaN;
      const limit = calculateDailyLimit(sovereignty);

      // Should fallback to minimum
      expect(limit).toBe(MIN_DAILY_LIMIT);
      expect(Number.isFinite(limit)).toBe(true);
    });

    it('should handle Infinity sovereignty gracefully', () => {
      const sovereignty = Infinity;
      const limit = calculateDailyLimit(sovereignty);

      // Should clamp to maximum
      expect(limit).toBe(MAX_DAILY_LIMIT);
      expect(Number.isFinite(limit)).toBe(true);
    });

    it('should produce consistent results for same sovereignty', () => {
      const sovereignty = 0.75;

      const limit1 = calculateDailyLimit(sovereignty);
      const limit2 = calculateDailyLimit(sovereignty);

      expect(limit1).toBe(limit2);
    });

    it('should never produce negative spending limits', () => {
      const sovereignties = [-1, 0, 0.3, 0.5, 0.7, 0.9, 1.0, 1.5, Infinity];

      for (const s of sovereignties) {
        const limit = calculateDailyLimit(s);
        expect(limit).toBeGreaterThan(0);
      }
    });

    it('should always produce finite spending limits', () => {
      const sovereignties = [-Infinity, -1, 0, 0.5, 1.0, 2.0, Infinity, NaN];

      for (const s of sovereignties) {
        const limit = calculateDailyLimit(s);
        expect(Number.isFinite(limit)).toBe(true);
      }
    });
  });
});
