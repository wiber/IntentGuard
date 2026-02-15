/**
 * tests/trust-debt-resolution-tracker.test.js
 * Unit tests for ResolutionTracker
 */

const fs = require('fs');

jest.mock('fs');
jest.mock('child_process');

const ResolutionTracker = require('../src/trust-debt-resolution-tracker');

describe('ResolutionTracker', () => {
  let tracker;

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => {});
    tracker = new ResolutionTracker();
  });

  describe('constructor', () => {
    it('initialises targets with correct patent claim structure', () => {
      expect(tracker.targets.querySpeed.baseline).toBe(100);
      expect(tracker.targets.querySpeed.target).toBe(0.1);
      expect(tracker.targets.querySpeed.unit).toBe('ms');

      expect(tracker.targets.multiplicativeGain.target).toBe(27);
      expect(tracker.targets.scalingFactor.target).toBe('O(1)');
      expect(tracker.targets.correlationDrift.target).toBe(0.01);
    });

    it('initialises proof points with zero values', () => {
      expect(tracker.proofPoints.userEngagement.multiplicative).toBe(0);
      expect(tracker.proofPoints.voiceSystem.multiplicative).toBe(0);
      expect(tracker.proofPoints.trustDebtImpact.multiplicative).toBe(0);
    });
  });

  describe('measureQuerySpeed', () => {
    it('returns improvement ratio and target checks', () => {
      const result = tracker.measureQuerySpeed();

      expect(result.traditional).toBe(100);
      expect(result.semantic).toBe(0.5);
      expect(result.improvement).toBe(200);
      expect(result.meetsTarget).toBe(true);   // 200 >= 100
      expect(result.exceedsTarget).toBe(false); // 200 < 1000
    });

    it('sets current query speed on targets', () => {
      tracker.measureQuerySpeed();
      expect(tracker.targets.querySpeed.current).toBe(0.5);
    });
  });

  describe('measureMultiplicativeGains', () => {
    it('returns default when categories file missing', () => {
      fs.existsSync.mockReturnValue(false);
      const result = tracker.measureMultiplicativeGains();

      expect(result.current).toBe(1);
      expect(result.target).toBe(27);
      expect(result.achieved).toBe(false);
    });

    it('parses categories file and computes orthogonality', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        correlationMatrix: {
          a: { a: 1, b: 0.05, c: 0.08 },
          b: { a: 0.05, b: 1, c: 0.03 },
          c: { a: 0.08, b: 0.03, c: 1 },
        },
        categories: { a: {}, b: {}, c: {} },
      }));

      const result = tracker.measureMultiplicativeGains();

      expect(result.factorCount).toBe(3);
      expect(result.avgCorrelation).toBeCloseTo(0.04, 1);
      expect(result.orthogonalityScore).toBeGreaterThan(0.9);
      expect(typeof result.multiplicativeGain).toBe('number');
      expect(result.multiplicativeGain).toBeGreaterThan(1);
    });
  });

  describe('measureScaling', () => {
    it('reports O(1) when semantic time is constant', () => {
      const result = tracker.measureScaling();

      expect(result.isConstant).toBe(true);
      expect(result.achieved).toBe(true);
      expect(result.measurements).toHaveLength(4);
      expect(tracker.targets.scalingFactor.current).toBe('O(1)');
    });

    it('measures increasing traditional time with size', () => {
      const result = tracker.measureScaling();
      const traditionalTimes = result.measurements.map(m => m.traditional);

      // Traditional should grow with size
      for (let i = 1; i < traditionalTimes.length; i++) {
        expect(traditionalTimes[i]).toBeGreaterThan(traditionalTimes[i - 1]);
      }
    });

    it('semantic time stays constant across sizes', () => {
      const result = tracker.measureScaling();
      expect(result.semanticVariance).toBeLessThan(0.1);
    });
  });

  describe('measureCorrelationDrift', () => {
    it('creates new history when file missing', () => {
      fs.existsSync.mockImplementation((p) =>
        !p.includes('correlation-history') && !p.includes('orthogonal-categories')
      );

      const result = tracker.measureCorrelationDrift();

      expect(result.measurements).toBe(1);
      expect(result.driftRate).toBe(0);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('computes drift from existing history', () => {
      const existingHistory = [
        { timestamp: '2026-01-01', correlation: 0.05 },
        { timestamp: '2026-01-15', correlation: 0.06 },
      ];

      fs.existsSync.mockImplementation((p) => {
        if (p.includes('correlation-history')) return true;
        return false;
      });
      fs.readFileSync.mockReturnValue(JSON.stringify(existingHistory));

      const result = tracker.measureCorrelationDrift();

      expect(result.measurements).toBe(3); // 2 existing + 1 new
      expect(typeof result.driftRate).toBe('number');
    });

    it('trims history to 30 entries', () => {
      const longHistory = Array.from({ length: 35 }, (_, i) => ({
        timestamp: `2026-01-${String(i + 1).padStart(2, '0')}`,
        correlation: 0.05,
      }));

      fs.existsSync.mockImplementation((p) => {
        if (p.includes('correlation-history')) return true;
        return false;
      });
      fs.readFileSync.mockReturnValue(JSON.stringify(longHistory));

      tracker.measureCorrelationDrift();

      const writeCall = fs.writeFileSync.mock.calls.find(c =>
        c[0].includes('correlation-history')
      );
      expect(writeCall).toBeDefined();
      const saved = JSON.parse(writeCall[1]);
      expect(saved.length).toBeLessThanOrEqual(30);
    });
  });

  describe('getNextMilestones', () => {
    it('suggests speed milestone when below 100x', () => {
      const report = {
        patentClaims: {
          claim1_querySpeed: { improvement: 50 },
          claim2_multiplicative: { multiplicativeGain: 10 },
          claim3_scaling: { achieved: false },
        },
        investorMetrics: { userActivation: 20, voiceAdoption: 10 },
      };

      const milestones = tracker.getNextMilestones(report);
      expect(milestones[0]).toContain('100x');
    });

    it('suggests 1000x when between 100x and 1000x', () => {
      const report = {
        patentClaims: {
          claim1_querySpeed: { improvement: 500 },
          claim2_multiplicative: { multiplicativeGain: 30 },
          claim3_scaling: { achieved: true },
        },
        investorMetrics: { userActivation: 60, voiceAdoption: 30 },
      };

      const milestones = tracker.getNextMilestones(report);
      expect(milestones[0]).toContain('1000x');
    });

    it('returns at most 3 milestones', () => {
      const report = {
        patentClaims: {
          claim1_querySpeed: { improvement: 10 },
          claim2_multiplicative: { multiplicativeGain: 5 },
          claim3_scaling: { achieved: false },
        },
        investorMetrics: { userActivation: 10, voiceAdoption: 5 },
      };

      const milestones = tracker.getNextMilestones(report);
      expect(milestones.length).toBeLessThanOrEqual(3);
    });
  });

  describe('calculateProofPoints', () => {
    it('returns default zeros when assessment file missing', () => {
      fs.existsSync.mockReturnValue(false);
      const points = tracker.calculateProofPoints();

      expect(points.userEngagement.multiplicative).toBe(0);
      expect(points.voiceSystem.multiplicative).toBe(0);
    });

    it('computes metrics from assessment data', () => {
      fs.existsSync.mockImplementation((p) => p.includes('two-layer'));
      fs.readFileSync.mockReturnValue(JSON.stringify({
        outcomeReality: { user: 60 },
        processHealth: { overall: 40 },
      }));

      const points = tracker.calculateProofPoints();

      expect(points.userEngagement.driftRecognition).toBe(48); // 60 * 0.8
      expect(points.voiceSystem.completionRate).toBe(98.9);
      expect(points.trustDebtImpact.velocityMultiplier).toBe(4); // 40 / 10
    });
  });
});
