/**
 * tests/trust-debt-unified-calculator.test.js
 * Unit tests for UnifiedTrustDebtCalculator (src/trust-debt-unified-calculator.js)
 */

const fs = require('fs');

jest.mock('fs');

// Mock fs.readFileSync for the constructor's settings load
fs.readFileSync.mockReturnValue(JSON.stringify({
  calculation: { commitWindow: 7, decayRate: 0.85 },
  thresholds: { trustDebt: { healthy: 100, warning: 200, critical: 300 } }
}));
fs.existsSync.mockReturnValue(false);

const UnifiedTrustDebtCalculator = require('../src/trust-debt-unified-calculator');

describe('UnifiedTrustDebtCalculator', () => {
  let calc;

  beforeEach(() => {
    fs.readFileSync.mockReturnValue(JSON.stringify({
      calculation: { commitWindow: 7, decayRate: 0.85 },
      thresholds: { trustDebt: { healthy: 100, warning: 200, critical: 300 } }
    }));
    fs.existsSync.mockReturnValue(false);
    calc = new UnifiedTrustDebtCalculator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateProcessHealth', () => {
    it('returns default crisis values when no assessment provided', () => {
      const result = calc.calculateProcessHealth(null);
      expect(result.measurement).toBe(3);
      expect(result.visualization).toBe(38);
      expect(result.enforcement).toBe(13);
      expect(result.overall).toBeCloseTo(0.15, 1);
    });

    it('extracts values from assessment', () => {
      const assessment = {
        processHealth: { measurement: 80, visualization: 60, enforcement: 40 }
      };
      const result = calc.calculateProcessHealth(assessment);
      expect(result.measurement).toBe(80);
      expect(result.visualization).toBe(60);
      expect(result.enforcement).toBe(40);
    });

    it('calculates multiplicative overall score', () => {
      const assessment = {
        processHealth: { measurement: 100, visualization: 100, enforcement: 100 }
      };
      const result = calc.calculateProcessHealth(assessment);
      expect(result.overall).toBe(100);
    });

    it('identifies correct bottleneck', () => {
      const assessment = {
        processHealth: { measurement: 10, visualization: 50, enforcement: 80 }
      };
      const result = calc.calculateProcessHealth(assessment);
      expect(result.bottleneck).toBe('Measurement');
    });
  });

  describe('calculateOutcomeReality', () => {
    it('returns defaults when no assessment provided', () => {
      const result = calc.calculateOutcomeReality(null);
      expect(result.userSuccess).toBe(0.3);
      expect(result.strategicValue).toBe(0.003);
      expect(result.ethicalCompliance).toBe(0.15);
    });

    it('calculates multiplicative overall', () => {
      const assessment = {
        outcomeReality: {
          userEngagement: 0.5,
          strategicFit: 0.5,
          ethicalIntegrity: 0.5
        }
      };
      const result = calc.calculateOutcomeReality(assessment);
      expect(result.overall).toBeCloseTo(0.125, 3);
    });

    it('uses 0.15 baseline when ethicalIntegrity is 0', () => {
      const assessment = {
        outcomeReality: {
          userEngagement: 0.5,
          strategicFit: 0.5,
          ethicalIntegrity: 0
        }
      };
      const result = calc.calculateOutcomeReality(assessment);
      expect(result.ethicalCompliance).toBe(0.15);
    });
  });

  describe('detectZeroMultipliers', () => {
    it('detects no zeros in healthy metrics', () => {
      const process = { measurement: 50, visualization: 50, enforcement: 50 };
      const outcome = { userSuccess: 0.5, strategicValue: 0.5, ethicalCompliance: 0.5 };
      const result = calc.detectZeroMultipliers(process, outcome);
      expect(result.hasZero).toBe(false);
      expect(result.zeros).toHaveLength(0);
    });

    it('detects zero in measurement', () => {
      const process = { measurement: 0, visualization: 50, enforcement: 50 };
      const outcome = { userSuccess: 0.5, strategicValue: 0.5, ethicalCompliance: 0.5 };
      const result = calc.detectZeroMultipliers(process, outcome);
      expect(result.hasZero).toBe(true);
      expect(result.zeros).toContain('Measurement');
    });

    it('detects multiple zeros', () => {
      const process = { measurement: 0, visualization: 0, enforcement: 50 };
      const outcome = { userSuccess: 0, strategicValue: 0.5, ethicalCompliance: 0.5 };
      const result = calc.detectZeroMultipliers(process, outcome);
      expect(result.zeros).toHaveLength(3);
      expect(result.impact).toBe('INFINITE');
    });
  });

  describe('calculateDiagonalHealth', () => {
    it('returns defaults for null matrix', () => {
      const result = calc.calculateDiagonalHealth(null);
      expect(result.average).toBe(20);
      expect(result.failingCount).toBe(0);
    });

    it('returns defaults for matrix without cells', () => {
      const result = calc.calculateDiagonalHealth({ nodes: [] });
      expect(result.failingCount).toBe(0);
    });

    it('counts failing diagonal cells correctly', () => {
      const matrix = {
        cells: [
          { row: 'A', col: 'A', value: 0.1 },  // failing (< 0.2)
          { row: 'B', col: 'B', value: 0.5 },  // passing
          { row: 'A', col: 'B', value: 0.8 },  // not diagonal
          { row: 'C', col: 'C', value: 0.05 }, // failing
        ]
      };
      const result = calc.calculateDiagonalHealth(matrix);
      expect(result.failingCount).toBe(2);
    });

    it('calculates average from diagonal cells only', () => {
      const matrix = {
        cells: [
          { row: 'A', col: 'A', value: 0.5 },
          { row: 'B', col: 'B', value: 1.0 },
          { row: 'A', col: 'B', value: 0.0 }, // non-diagonal, ignored
        ]
      };
      const result = calc.calculateDiagonalHealth(matrix);
      expect(result.average).toBe(75); // (50 + 100) / 2
    });
  });

  describe('identifyBottleneck', () => {
    it('identifies measurement as bottleneck', () => {
      expect(calc.identifyBottleneck(10, 50, 80)).toBe('Measurement');
    });

    it('identifies visualization as bottleneck', () => {
      expect(calc.identifyBottleneck(50, 10, 80)).toBe('Visualization');
    });

    it('identifies enforcement as bottleneck', () => {
      expect(calc.identifyBottleneck(50, 80, 10)).toBe('Enforcement');
    });
  });

  describe('formatCategoryName', () => {
    it('maps known names', () => {
      expect(calc.formatCategoryName('measurement')).toBe('Measurement');
      expect(calc.formatCategoryName('drift_detection')).toBe('Drift Detection');
      expect(calc.formatCategoryName('shortlex_axis')).toBe('ShortLex Axis');
    });

    it('capitalizes unknown names', () => {
      expect(calc.formatCategoryName('foobar')).toBe('Foobar');
    });

    it('returns Unknown for falsy input', () => {
      expect(calc.formatCategoryName(null)).toBe('Unknown');
      expect(calc.formatCategoryName('')).toBe('Unknown');
    });
  });

  describe('calculateTrend', () => {
    it('returns unknown for insufficient commits', () => {
      expect(calc.calculateTrend([])).toBe('unknown');
      expect(calc.calculateTrend([{ analysis: { trust: 50 } }])).toBe('unknown');
    });

    it('detects improving trend', () => {
      const commits = [
        // Recent 5 (high trust)
        ...Array(5).fill({ analysis: { trust: 80 } }),
        // Older 5 (low trust)
        ...Array(5).fill({ analysis: { trust: 30 } }),
      ];
      expect(calc.calculateTrend(commits)).toBe('improving');
    });

    it('detects degrading trend', () => {
      const commits = [
        // Recent 5 (low trust)
        ...Array(5).fill({ analysis: { trust: 30 } }),
        // Older 5 (high trust)
        ...Array(5).fill({ analysis: { trust: 80 } }),
      ];
      expect(calc.calculateTrend(commits)).toBe('degrading');
    });

    it('detects stable trend', () => {
      const commits = Array(10).fill({ analysis: { trust: 50 } });
      expect(calc.calculateTrend(commits)).toBe('stable');
    });
  });

  describe('averageTrustScore', () => {
    it('returns 50 for empty array', () => {
      expect(calc.averageTrustScore([])).toBe(50);
    });

    it('returns 50 for null', () => {
      expect(calc.averageTrustScore(null)).toBe(50);
    });

    it('averages trust scores', () => {
      const commits = [
        { analysis: { trust: 60 } },
        { analysis: { trust: 80 } },
      ];
      expect(calc.averageTrustScore(commits)).toBe(70);
    });

    it('defaults missing trust to 50', () => {
      const commits = [{ analysis: {} }, { analysis: {} }];
      expect(calc.averageTrustScore(commits)).toBe(50);
    });
  });

  describe('calculate (integration)', () => {
    it('returns crisis for default assessment (measurement below 5)', () => {
      // Default assessment has measurement=3, which triggers CRISIS_MEASUREMENT
      const result = calc.calculate({});
      expect(result.crisis).toBe(true);
      expect(result.status).toBe('CRISIS_MEASUREMENT');
      expect(result.score).toBe(999);
    });

    it('returns crisis when measurement below 5', () => {
      const result = calc.calculate({
        assessment: {
          processHealth: { measurement: 3, visualization: 50, enforcement: 50 },
          outcomeReality: { userEngagement: 0.5, strategicFit: 0.5, ethicalIntegrity: 0.5 }
        }
      });
      expect(result.crisis).toBe(true);
      expect(result.status).toBe('CRISIS_MEASUREMENT');
    });

    it('returns diagonal collapse crisis', () => {
      const failingCells = Array.from({ length: 15 }, (_, i) => ({
        row: `cat-${i}`, col: `cat-${i}`, value: 0.1
      }));
      const result = calc.calculate({
        assessment: {
          processHealth: { measurement: 80, visualization: 50, enforcement: 50 },
          outcomeReality: { userEngagement: 0.5, strategicFit: 0.5, ethicalIntegrity: 0.5 }
        },
        matrix: { cells: failingCells }
      });
      expect(result.crisis).toBe(true);
      expect(result.status).toBe('CRISIS_DIAGONAL_COLLAPSE');
    });

    it('returns non-crisis result with valid data', () => {
      const result = calc.calculate({
        assessment: {
          processHealth: { measurement: 80, visualization: 60, enforcement: 70 },
          outcomeReality: { userEngagement: 0.5, strategicFit: 0.5, ethicalIntegrity: 0.5 }
        }
      });
      expect(result.crisis).toBe(false);
      // Score is capped at 999; base debt defaults to 500 when no cold-spots/matrix data
      expect(result.score).toBeLessThanOrEqual(999);
      expect(['OPERATIONAL', 'ELEVATED', 'WARNING', 'CRITICAL']).toContain(result.status);
    });

    it('caps score at 999', () => {
      const result = calc.calculate({
        assessment: {
          processHealth: { measurement: 0, visualization: 0, enforcement: 0 },
          outcomeReality: { userEngagement: 0, strategicFit: 0, ethicalIntegrity: 0 }
        }
      });
      expect(result.score).toBeLessThanOrEqual(999);
    });

    it('includes isInsurable flag', () => {
      const result = calc.calculate({
        assessment: {
          processHealth: { measurement: 80, visualization: 60, enforcement: 70 },
          outcomeReality: { userEngagement: 0.5, strategicFit: 0.5, ethicalIntegrity: 0.5 }
        }
      });
      expect(typeof result.isInsurable).toBe('boolean');
    });
  });

  describe('interpretOutcomeReality', () => {
    it('flags low user engagement', () => {
      const result = calc.interpretOutcomeReality(0.2, 0.5, 0.8);
      expect(result).toContain('User engagement');
      expect(result).toContain('needs improvement');
    });

    it('flags low strategic value', () => {
      const result = calc.interpretOutcomeReality(0.8, 0.05, 0.8);
      expect(result).toContain('Strategic value');
      expect(result).toContain('implement revenue');
    });

    it('describes well substantiated credibility', () => {
      const result = calc.interpretOutcomeReality(0.8, 0.5, 0.8);
      expect(result).toContain('well substantiated');
    });

    it('describes partial substantiation for low ethical', () => {
      const result = calc.interpretOutcomeReality(0.8, 0.5, 0.2);
      expect(result).toContain('partial substantiation');
    });
  });
});
