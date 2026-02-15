/**
 * src/auth/sovereignty.test.ts — Sovereignty Score Calculator Tests
 *
 * Tests the sovereignty calculation formula, drift reduction, and category scoring.
 */

import { describe, it, expect } from 'vitest';
import {
  K_E,
  MAX_TRUST_DEBT_UNITS,
  GRADE_BOUNDARIES,
  calculateRawSovereignty,
  applyDriftReduction,
  unitsToGrade,
  extractCategoryScores,
  calculateSovereignty,
  driftEventsUntilZero,
  calculateRecoveryPath,
  type TrustDebtStats,
  type Grade,
} from './sovereignty.js';

// ─── Constants Tests ────────────────────────────────────────────────────

describe('Sovereignty Constants', () => {
  it('should have correct drift rate', () => {
    expect(K_E).toBe(0.003);
  });

  it('should have correct max units boundary', () => {
    expect(MAX_TRUST_DEBT_UNITS).toBe(3000);
  });

  it('should have correct grade boundaries', () => {
    expect(GRADE_BOUNDARIES.A.max).toBe(500);
    expect(GRADE_BOUNDARIES.B.max).toBe(1500);
    expect(GRADE_BOUNDARIES.C.max).toBe(3000);
    expect(GRADE_BOUNDARIES.D.min).toBe(3001);
  });
});

// ─── Raw Sovereignty Calculation ────────────────────────────────────────

describe('calculateRawSovereignty', () => {
  it('should return 1.0 for zero trust debt', () => {
    expect(calculateRawSovereignty(0)).toBe(1.0);
  });

  it('should return 0.833 for Grade A max (500 units)', () => {
    const sovereignty = calculateRawSovereignty(500);
    expect(sovereignty).toBeCloseTo(0.833, 2);
  });

  it('should return 0.5 for Grade B max (1500 units)', () => {
    const sovereignty = calculateRawSovereignty(1500);
    expect(sovereignty).toBeCloseTo(0.5, 2);
  });

  it('should return 0.0 for Grade C max (3000 units)', () => {
    expect(calculateRawSovereignty(3000)).toBe(0.0);
  });

  it('should return 0.0 for Grade D (3000+ units)', () => {
    expect(calculateRawSovereignty(5000)).toBe(0.0);
    expect(calculateRawSovereignty(8130)).toBe(0.0);
  });

  it('should handle fractional units correctly', () => {
    const sovereignty = calculateRawSovereignty(750); // Mid Grade B
    expect(sovereignty).toBeCloseTo(0.75, 2);
  });
});

// ─── Drift Reduction ────────────────────────────────────────────────────

describe('applyDriftReduction', () => {
  it('should return unchanged sovereignty with zero drift events', () => {
    expect(applyDriftReduction(0.8, 0)).toBe(0.8);
  });

  it('should reduce sovereignty by 0.3% per drift event', () => {
    const rawSovereignty = 1.0;
    const reduced = applyDriftReduction(rawSovereignty, 1);
    expect(reduced).toBeCloseTo(0.997, 3);
  });

  it('should compound drift reduction exponentially', () => {
    const rawSovereignty = 1.0;

    // 10 drift events
    const reduced10 = applyDriftReduction(rawSovereignty, 10);
    expect(reduced10).toBeCloseTo(0.970, 3); // (1 - 0.003)^10

    // 100 drift events
    const reduced100 = applyDriftReduction(rawSovereignty, 100);
    expect(reduced100).toBeCloseTo(0.740, 3); // (1 - 0.003)^100
  });

  it('should match drift-vs-steering scenario (1000 ops)', () => {
    // After 1000 operations: (0.997)^1000 = 4.9% chance still aligned
    const rawSovereignty = 1.0;
    const reduced = applyDriftReduction(rawSovereignty, 1000);
    expect(reduced).toBeCloseTo(0.049, 2); // 4.9%
  });

  it('should handle partial sovereignty with drift', () => {
    const rawSovereignty = 0.5;
    const reduced = applyDriftReduction(rawSovereignty, 50);
    expect(reduced).toBeCloseTo(0.430, 3); // 0.5 * (0.997)^50
  });
});

// ─── Grade Mapping ──────────────────────────────────────────────────────

describe('unitsToGrade', () => {
  it('should return A for 0-500 units', () => {
    expect(unitsToGrade(0)).toBe('A');
    expect(unitsToGrade(250)).toBe('A');
    expect(unitsToGrade(500)).toBe('A');
  });

  it('should return B for 501-1500 units', () => {
    expect(unitsToGrade(501)).toBe('B');
    expect(unitsToGrade(1000)).toBe('B');
    expect(unitsToGrade(1500)).toBe('B');
  });

  it('should return C for 1501-3000 units', () => {
    expect(unitsToGrade(1501)).toBe('C');
    expect(unitsToGrade(2250)).toBe('C');
    expect(unitsToGrade(3000)).toBe('C');
  });

  it('should return D for 3001+ units', () => {
    expect(unitsToGrade(3001)).toBe('D');
    expect(unitsToGrade(5000)).toBe('D');
    expect(unitsToGrade(8130)).toBe('D');
  });
});

// ─── Category Score Extraction ──────────────────────────────────────────

describe('extractCategoryScores', () => {
  it('should map Grade A categories to 0.9-1.0 scores', () => {
    const categoryPerformance = {
      'B🔒_Documentation': { units: 250, percentage: '10%', grade: 'A' as Grade },
    };
    const scores = extractCategoryScores(categoryPerformance);
    expect(scores.documentation).toBeGreaterThanOrEqual(0.9);
    expect(scores.documentation).toBeLessThanOrEqual(1.0);
  });

  it('should map Grade B categories to 0.7-0.9 scores', () => {
    const categoryPerformance = {
      'C💨_Visualization': { units: 1000, percentage: '15%', grade: 'B' as Grade },
    };
    const scores = extractCategoryScores(categoryPerformance);
    expect(scores.user_focus).toBeGreaterThanOrEqual(0.7);
    expect(scores.user_focus).toBeLessThanOrEqual(0.9);
  });

  it('should map Grade C categories to 0.5-0.7 scores', () => {
    const categoryPerformance = {
      'E🎨_BusinessLayer': { units: 2000, percentage: '20%', grade: 'C' as Grade },
    };
    const scores = extractCategoryScores(categoryPerformance);
    expect(scores.domain_expertise).toBeGreaterThanOrEqual(0.5);
    expect(scores.domain_expertise).toBeLessThanOrEqual(0.7);
  });

  it('should map Grade D categories to 0.0-0.5 scores', () => {
    const categoryPerformance = {
      'D🧠_Integration': { units: 4184, percentage: '50%', grade: 'D' as Grade },
    };
    const scores = extractCategoryScores(categoryPerformance);
    expect(scores.reliability).toBeGreaterThanOrEqual(0.0);
    expect(scores.reliability).toBeLessThanOrEqual(0.5);
  });

  it('should handle multiple categories', () => {
    const categoryPerformance = {
      'A🚀_CoreEngine': { units: 705, percentage: '8.7%', grade: 'D' as Grade },
      'B🔒_Documentation': { units: 411, percentage: '5.1%', grade: 'A' as Grade },
      'C💨_Visualization': { units: 532, percentage: '6.5%', grade: 'B' as Grade },
      'D🧠_Integration': { units: 4184, percentage: '51.5%', grade: 'D' as Grade },
      'E🎨_BusinessLayer': { units: 1829, percentage: '22.5%', grade: 'C' as Grade },
      'F⚡_Agents': { units: 469, percentage: '5.7%', grade: 'A' as Grade },
    };
    const scores = extractCategoryScores(categoryPerformance);

    expect(scores.code_quality).toBeDefined();
    expect(scores.documentation).toBeDefined();
    expect(scores.user_focus).toBeDefined();
    expect(scores.reliability).toBeDefined();
    expect(scores.domain_expertise).toBeDefined();
    expect(scores.process_adherence).toBeDefined();
  });

  it('should ignore unmapped categories', () => {
    const categoryPerformance = {
      'Z💥_Unknown': { units: 100, percentage: '5%', grade: 'A' as Grade },
    };
    const scores = extractCategoryScores(categoryPerformance);
    expect(Object.keys(scores).length).toBe(0);
  });
});

// ─── Full Sovereignty Calculation ──────────────────────────────────────

describe('calculateSovereignty', () => {
  it('should calculate sovereignty for Grade A project', () => {
    const trustDebtStats: TrustDebtStats = {
      total_units: 400,
      grade: 'A',
      category_performance: {
        'B🔒_Documentation': { units: 400, percentage: '100%', grade: 'A' },
      },
    };

    const result = calculateSovereignty(trustDebtStats, 0);

    expect(result.grade).toBe('A');
    expect(result.gradeEmoji).toBe('🟢');
    expect(result.trustDebtUnits).toBe(400);
    expect(result.driftEvents).toBe(0);
    expect(result.score).toBeCloseTo(0.867, 2); // 1 - (400/3000)
    expect(result.rawScore).toBe(result.score); // No drift
    expect(result.driftReduction).toBe(0);
  });

  it('should calculate sovereignty for Grade D project (IntentGuard current)', () => {
    const trustDebtStats: TrustDebtStats = {
      total_units: 8130,
      grade: 'D',
      category_performance: {
        'A🚀_CoreEngine': { units: 705, percentage: '8.7%', grade: 'D' },
        'B🔒_Documentation': { units: 411, percentage: '5.1%', grade: 'A' },
        'C💨_Visualization': { units: 532, percentage: '6.5%', grade: 'B' },
        'D🧠_Integration': { units: 4184, percentage: '51.5%', grade: 'D' },
        'E🎨_BusinessLayer': { units: 1829, percentage: '22.5%', grade: 'C' },
        'F⚡_Agents': { units: 469, percentage: '5.7%', grade: 'A' },
      },
    };

    const result = calculateSovereignty(trustDebtStats, 0);

    expect(result.grade).toBe('D');
    expect(result.gradeEmoji).toBe('🔴');
    expect(result.trustDebtUnits).toBe(8130);
    expect(result.score).toBe(0); // Over max units
    expect(Object.keys(result.categoryScores).length).toBe(6);
  });

  it('should apply drift reduction correctly', () => {
    const trustDebtStats: TrustDebtStats = {
      total_units: 1000,
      grade: 'B',
      category_performance: {
        'B🔒_Documentation': { units: 1000, percentage: '100%', grade: 'B' },
      },
    };

    const result = calculateSovereignty(trustDebtStats, 50);

    expect(result.driftEvents).toBe(50);
    expect(result.rawScore).toBeCloseTo(0.667, 2); // 1 - (1000/3000)
    expect(result.score).toBeLessThan(result.rawScore);
    expect(result.score).toBeCloseTo(0.574, 3); // 0.667 * (0.997)^50
    expect(result.driftReduction).toBeGreaterThan(0);
  });

  it('should include timestamp', () => {
    const trustDebtStats: TrustDebtStats = {
      total_units: 500,
      grade: 'A',
      category_performance: {},
    };

    const result = calculateSovereignty(trustDebtStats, 0);

    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
  });
});

// ─── Drift Forecasting ──────────────────────────────────────────────────

describe('driftEventsUntilZero', () => {
  it('should return 0 for zero sovereignty', () => {
    expect(driftEventsUntilZero(0)).toBe(0);
  });

  it('should calculate drift events until near-zero for full sovereignty', () => {
    const events = driftEventsUntilZero(1.0);
    expect(events).toBeGreaterThan(1500); // Takes many events to drift from 1.0 to 0.01
  });

  it('should calculate drift events for partial sovereignty', () => {
    const events = driftEventsUntilZero(0.5);
    expect(events).toBeGreaterThan(1000);
    expect(events).toBeLessThan(driftEventsUntilZero(1.0));
  });

  it('should match drift-vs-steering catastrophic threshold', () => {
    // "~230 operations (50% drift probability)"
    const eventsFrom1 = driftEventsUntilZero(1.0);
    const eventsTo50Percent = Math.log(0.5) / Math.log(1 - K_E);
    expect(Math.ceil(eventsTo50Percent)).toBeCloseTo(231, -1); // ~230
  });
});

// ─── Recovery Path ──────────────────────────────────────────────────────

describe('calculateRecoveryPath', () => {
  it('should calculate milestones for Grade D project', () => {
    const path = calculateRecoveryPath(8130, 0);

    expect(path.length).toBeGreaterThan(0);
    expect(path[0].targetGrade).toBe('C');
    expect(path[0].unitsNeeded).toBe(8130 - GRADE_BOUNDARIES.C.min);
    expect(path[0].sovereigntyGain).toBeGreaterThan(0);
  });

  it('should include all reachable grades', () => {
    const path = calculateRecoveryPath(5000, 0);

    const grades = path.map(m => m.targetGrade);
    expect(grades).toContain('C');
    expect(grades).toContain('B');
    expect(grades).toContain('A');
  });

  it('should calculate sovereignty gain for each milestone', () => {
    const path = calculateRecoveryPath(2000, 0);

    for (const milestone of path) {
      expect(milestone.sovereigntyGain).toBeGreaterThan(0);
      expect(milestone.unitsNeeded).toBeGreaterThan(0);
    }
  });

  it('should account for drift events in recovery', () => {
    const pathNoDrift = calculateRecoveryPath(2000, 0);
    const pathWithDrift = calculateRecoveryPath(2000, 100);

    // Sovereignty gain should be smaller with drift
    expect(pathWithDrift[0].sovereigntyGain).toBeLessThan(pathNoDrift[0].sovereigntyGain);
  });

  it('should return empty path for Grade A project', () => {
    const path = calculateRecoveryPath(400, 0);
    expect(path.length).toBe(0); // Already at Grade A
  });
});

// ─── Integration Scenarios ──────────────────────────────────────────────

describe('Integration Scenarios', () => {
  it('should support FIM guard integration', () => {
    // Scenario: Bot with Grade B trust, 10 drift events
    const trustDebtStats: TrustDebtStats = {
      total_units: 1200,
      grade: 'B',
      category_performance: {
        'D🧠_Integration': { units: 1200, percentage: '100%', grade: 'B' },
      },
    };

    const sovereignty = calculateSovereignty(trustDebtStats, 10);

    // FIM guard checks: sovereignty.score >= actionRequirement.minSovereignty
    expect(sovereignty.score).toBeGreaterThan(0);
    expect(sovereignty.score).toBeLessThan(1);

    // Should be around 0.6 * (0.997)^10 ≈ 0.582
    expect(sovereignty.score).toBeCloseTo(0.582, 2);
  });

  it('should support pipeline step 4 recalculation', () => {
    // Scenario: Pipeline recalc after drift event
    const trustDebtStats: TrustDebtStats = {
      total_units: 1500,
      grade: 'B',
      category_performance: {
        'B🔒_Documentation': { units: 1500, percentage: '100%', grade: 'B' },
      },
    };

    const beforeDrift = calculateSovereignty(trustDebtStats, 0);
    const afterDrift = calculateSovereignty(trustDebtStats, 1);

    expect(afterDrift.score).toBeLessThan(beforeDrift.score);
    expect(afterDrift.driftReduction).toBeCloseTo(0.3, 1); // 0.3% reduction
  });

  it('should support transparency engine reporting', () => {
    // Scenario: Format for Discord embed
    const trustDebtStats: TrustDebtStats = {
      total_units: 2500,
      grade: 'C',
      category_performance: {
        'E🎨_BusinessLayer': { units: 2500, percentage: '100%', grade: 'C' },
      },
    };

    const sovereignty = calculateSovereignty(trustDebtStats, 25);

    // Discord embed fields
    expect(sovereignty.gradeEmoji).toBe('🟠');
    expect(sovereignty.score).toBeGreaterThan(0);
    expect(sovereignty.driftEvents).toBe(25);
    expect(sovereignty.driftReduction).toBeGreaterThan(0);

    // Should be suitable for display
    const displayScore = (sovereignty.score * 100).toFixed(1) + '%';
    expect(displayScore).toMatch(/^\d+\.\d%$/);
  });
});
