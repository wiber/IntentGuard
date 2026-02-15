/**
 * src/monitor/sovereignty-monitor.test.ts — Tests for Sovereignty Monitor
 *
 * Tests 30-day stability detection, milestone recording, and artifact triggering.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  loadHistory,
  appendSnapshot,
  recordTodaySnapshot,
  detectStability,
  loadMilestones,
  recordMilestone,
  markArtifactTriggered,
  monitorSovereignty,
  triggerStabilityArtifact,
  generateStabilityReport,
  generateMilestonesSummary,
  STABILITY_WINDOW_DAYS,
  STABILITY_THRESHOLD,
  MIN_ARTIFACT_SOVEREIGNTY,
  type SovereigntySnapshot,
  type StabilityMilestone,
} from './sovereignty-monitor.js';

// Test logger
const testLog = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

// Test directory
const testRoot = join(process.cwd(), 'test-tmp', 'sovereignty-monitor');

describe('sovereignty-monitor', () => {
  beforeEach(() => {
    // Clean and create test directory
    rmSync(testRoot, { recursive: true, force: true });
    mkdirSync(join(testRoot, 'data'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testRoot, { recursive: true, force: true });
  });

  describe('History Management', () => {
    it('should initialize empty history', () => {
      const history = loadHistory(testRoot);
      expect(history).toEqual([]);
    });

    it('should append and load snapshots', () => {
      const snapshot: SovereigntySnapshot = {
        date: '2026-01-01',
        timestamp: '2026-01-01T00:00:00Z',
        score: 0.75,
        grade: 'B',
        trustDebtUnits: 1200,
        driftEvents: 0,
        source: 'pipeline',
      };

      appendSnapshot(testRoot, snapshot);
      const history = loadHistory(testRoot);

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(snapshot);
    });

    it('should sort snapshots by date', () => {
      const snapshot1: SovereigntySnapshot = {
        date: '2026-01-15',
        timestamp: '2026-01-15T00:00:00Z',
        score: 0.8,
        grade: 'B',
        trustDebtUnits: 1000,
        driftEvents: 0,
        source: 'pipeline',
      };

      const snapshot2: SovereigntySnapshot = {
        date: '2026-01-10',
        timestamp: '2026-01-10T00:00:00Z',
        score: 0.75,
        grade: 'B',
        trustDebtUnits: 1200,
        driftEvents: 0,
        source: 'pipeline',
      };

      appendSnapshot(testRoot, snapshot1);
      appendSnapshot(testRoot, snapshot2);

      const history = loadHistory(testRoot);
      expect(history).toHaveLength(2);
      expect(history[0].date).toBe('2026-01-10'); // Older first
      expect(history[1].date).toBe('2026-01-15');
    });

    it('should record today snapshot from pipeline stats', () => {
      // Create mock pipeline stats
      const stats = {
        sovereignty_score: 0.82,
        grade: 'B',
        total_units: 950,
        drift_events: 2,
      };
      writeFileSync(
        join(testRoot, '4-grades-statistics.json'),
        JSON.stringify(stats),
        'utf-8'
      );

      const snapshot = recordTodaySnapshot(testRoot, testLog);

      expect(snapshot).not.toBeNull();
      expect(snapshot!.score).toBe(0.82);
      expect(snapshot!.grade).toBe('B');
      expect(snapshot!.trustDebtUnits).toBe(950);
      expect(snapshot!.driftEvents).toBe(2);
      expect(snapshot!.source).toBe('pipeline');

      // Verify it was saved
      const history = loadHistory(testRoot);
      expect(history).toHaveLength(1);
    });

    it('should not duplicate today snapshot', () => {
      const stats = {
        sovereignty_score: 0.75,
        grade: 'B',
        total_units: 1200,
        drift_events: 0,
      };
      writeFileSync(
        join(testRoot, '4-grades-statistics.json'),
        JSON.stringify(stats),
        'utf-8'
      );

      // Record once
      recordTodaySnapshot(testRoot, testLog);

      // Try to record again
      const duplicate = recordTodaySnapshot(testRoot, testLog);
      expect(duplicate).toBeNull();

      // Should still only have one snapshot
      const history = loadHistory(testRoot);
      expect(history).toHaveLength(1);
    });
  });

  describe('Stability Detection', () => {
    it('should detect no stability with empty history', () => {
      const result = detectStability([]);
      expect(result.consecutiveDays).toBe(0);
      expect(result.isStable).toBe(false);
    });

    it('should detect single day', () => {
      const history: SovereigntySnapshot[] = [
        {
          date: '2026-01-01',
          timestamp: '2026-01-01T00:00:00Z',
          score: 0.75,
          grade: 'B',
          trustDebtUnits: 1200,
          driftEvents: 0,
          source: 'pipeline',
        },
      ];

      const result = detectStability(history);
      expect(result.consecutiveDays).toBe(1);
      expect(result.isStable).toBe(false); // Need 30 days
    });

    it('should detect 30-day stable period', () => {
      const history: SovereigntySnapshot[] = [];
      const baseScore = 0.75;

      // Generate 30 days of stable data with fixed variance
      for (let i = 0; i < 30; i++) {
        const date = new Date(Date.UTC(2026, 0, i + 1)).toISOString().split('T')[0];
        // Use deterministic variance within threshold
        const variance = ((i % 5) - 2) * 0.01; // -0.02, -0.01, 0, 0.01, 0.02
        history.push({
          date,
          timestamp: `${date}T00:00:00Z`,
          score: baseScore + variance, // Within ±0.05 threshold
          grade: 'B',
          trustDebtUnits: 1200,
          driftEvents: 0,
          source: 'pipeline',
        });
      }

      const result = detectStability(history);
      expect(result.consecutiveDays).toBe(30);
      expect(result.isStable).toBe(true);
      expect(result.averageSovereignty).toBeCloseTo(baseScore, 1);
    });

    it('should detect stability break', () => {
      const history: SovereigntySnapshot[] = [];
      const baseScore = 0.75;

      // Generate 25 stable days
      for (let i = 0; i < 25; i++) {
        const date = new Date(2026, 0, i + 1).toISOString().split('T')[0];
        history.push({
          date,
          timestamp: `${date}T00:00:00Z`,
          score: baseScore + 0.02,
          grade: 'B',
          trustDebtUnits: 1200,
          driftEvents: 0,
          source: 'pipeline',
        });
      }

      // Add a day with big variance (breaks stability)
      history.push({
        date: '2026-01-26',
        timestamp: '2026-01-26T00:00:00Z',
        score: baseScore + 0.15, // Outside ±0.05 threshold
        grade: 'B',
        trustDebtUnits: 800,
        driftEvents: 0,
        source: 'pipeline',
      });

      // Add 5 more stable days (recent window)
      for (let i = 26; i < 31; i++) {
        const date = new Date(2026, 0, i + 1).toISOString().split('T')[0];
        history.push({
          date,
          timestamp: `${date}T00:00:00Z`,
          score: baseScore + 0.15, // New baseline after break
          grade: 'B',
          trustDebtUnits: 800,
          driftEvents: 0,
          source: 'pipeline',
        });
      }

      const result = detectStability(history);
      expect(result.consecutiveDays).toBeLessThan(30); // Stability broken
      expect(result.isStable).toBe(false);
    });

    it('should use custom window and threshold', () => {
      const history: SovereigntySnapshot[] = [];

      // Generate 10 days of stable data
      for (let i = 0; i < 10; i++) {
        const date = new Date(2026, 0, i + 1).toISOString().split('T')[0];
        history.push({
          date,
          timestamp: `${date}T00:00:00Z`,
          score: 0.75 + 0.01,
          grade: 'B',
          trustDebtUnits: 1200,
          driftEvents: 0,
          source: 'pipeline',
        });
      }

      // With 10-day window
      const result = detectStability(history, 10, 0.05);
      expect(result.consecutiveDays).toBe(10);
      expect(result.isStable).toBe(true);
    });
  });

  describe('Milestone Management', () => {
    it('should initialize empty milestones', () => {
      const milestones = loadMilestones(testRoot);
      expect(milestones).toEqual([]);
    });

    it('should record stability milestone', () => {
      const history: SovereigntySnapshot[] = [];
      const baseScore = 0.82;

      // Generate 30 days of stable data with fixed variance
      for (let i = 0; i < 30; i++) {
        const date = new Date(Date.UTC(2026, 0, i + 1)).toISOString().split('T')[0];
        // Use deterministic variance within threshold
        const variance = ((i % 5) - 2) * 0.01; // -0.02, -0.01, 0, 0.01, 0.02
        history.push({
          date,
          timestamp: `${date}T00:00:00Z`,
          score: baseScore + variance,
          grade: 'B',
          trustDebtUnits: 950,
          driftEvents: 2,
          source: 'pipeline',
        });
      }

      const milestone = recordMilestone(testRoot, history, testLog);

      expect(milestone).not.toBeNull();
      expect(milestone!.durationDays).toBe(30);
      expect(milestone!.averageSovereignty).toBeCloseTo(baseScore, 1);
      expect(milestone!.minSovereignty).toBeLessThanOrEqual(milestone!.maxSovereignty);
      expect(milestone!.variance).toBeLessThanOrEqual(STABILITY_THRESHOLD);
      expect(milestone!.artifactTriggered).toBe(false);

      // Verify it was saved
      const milestones = loadMilestones(testRoot);
      expect(milestones).toHaveLength(1);
    });

    it('should not duplicate milestone for same period', () => {
      const history: SovereigntySnapshot[] = [];

      // Generate 30 days of stable data
      for (let i = 0; i < 30; i++) {
        const date = new Date(2026, 0, i + 1).toISOString().split('T')[0];
        history.push({
          date,
          timestamp: `${date}T00:00:00Z`,
          score: 0.8,
          grade: 'B',
          trustDebtUnits: 1000,
          driftEvents: 0,
          source: 'pipeline',
        });
      }

      // Record once
      recordMilestone(testRoot, history, testLog);

      // Try to record again
      const duplicate = recordMilestone(testRoot, history, testLog);
      expect(duplicate).toBeNull();

      // Should still only have one milestone
      const milestones = loadMilestones(testRoot);
      expect(milestones).toHaveLength(1);
    });

    it('should mark artifact triggered', () => {
      const milestone: StabilityMilestone = {
        achievedAt: '2026-01-30T00:00:00Z',
        startDate: '2026-01-01',
        endDate: '2026-01-30',
        durationDays: 30,
        averageSovereignty: 0.82,
        minSovereignty: 0.78,
        maxSovereignty: 0.86,
        variance: 0.08,
        artifactTriggered: false,
      };

      // Save milestone
      writeFileSync(
        join(testRoot, 'data', 'stability-milestones.json'),
        JSON.stringify([milestone]),
        'utf-8'
      );

      // Mark artifact triggered
      markArtifactTriggered(testRoot, milestone, '/tmp/artifact-stability.stl');

      // Verify
      const milestones = loadMilestones(testRoot);
      expect(milestones[0].artifactTriggered).toBe(true);
      expect(milestones[0].artifactPath).toBe('/tmp/artifact-stability.stl');
    });
  });

  describe('Monitor Function', () => {
    it('should monitor and detect new milestone', async () => {
      // Create mock pipeline stats
      const stats = {
        sovereignty_score: 0.8,
        grade: 'B',
        total_units: 1000,
        drift_events: 0,
      };
      writeFileSync(
        join(testRoot, '4-grades-statistics.json'),
        JSON.stringify(stats),
        'utf-8'
      );

      // Generate 29 days of historical data
      for (let i = 0; i < 29; i++) {
        const date = new Date(2026, 0, i + 1).toISOString().split('T')[0];
        const snapshot: SovereigntySnapshot = {
          date,
          timestamp: `${date}T00:00:00Z`,
          score: 0.8 + 0.01,
          grade: 'B',
          trustDebtUnits: 1000,
          driftEvents: 0,
          source: 'pipeline',
        };
        appendSnapshot(testRoot, snapshot);
      }

      // Monitor (will add 30th day)
      const result = await monitorSovereignty(testRoot, testLog);

      expect(result.consecutiveStableDays).toBe(30);
      expect(result.isStable).toBe(true);
      expect(result.milestoneAchieved).toBe(true);
      expect(result.milestone).toBeDefined();
      expect(result.daysRemaining).toBe(0);
    });

    it('should monitor without milestone', async () => {
      // Create mock pipeline stats
      const stats = {
        sovereignty_score: 0.75,
        grade: 'B',
        total_units: 1200,
        drift_events: 0,
      };
      writeFileSync(
        join(testRoot, '4-grades-statistics.json'),
        JSON.stringify(stats),
        'utf-8'
      );

      // Generate only 15 days of data
      for (let i = 0; i < 15; i++) {
        const date = new Date(2026, 0, i + 1).toISOString().split('T')[0];
        const snapshot: SovereigntySnapshot = {
          date,
          timestamp: `${date}T00:00:00Z`,
          score: 0.75,
          grade: 'B',
          trustDebtUnits: 1200,
          driftEvents: 0,
          source: 'pipeline',
        };
        appendSnapshot(testRoot, snapshot);
      }

      const result = await monitorSovereignty(testRoot, testLog);

      expect(result.consecutiveStableDays).toBe(16); // 15 + today
      expect(result.isStable).toBe(false);
      expect(result.milestoneAchieved).toBe(false);
      expect(result.daysRemaining).toBe(14);
    });
  });

  describe('Artifact Triggering', () => {
    it('should trigger artifact for high sovereignty milestone', async () => {
      const milestone: StabilityMilestone = {
        achievedAt: '2026-01-30T00:00:00Z',
        startDate: '2026-01-01',
        endDate: '2026-01-30',
        durationDays: 30,
        averageSovereignty: 0.82, // Above MIN_ARTIFACT_SOVEREIGNTY
        minSovereignty: 0.78,
        maxSovereignty: 0.86,
        variance: 0.08,
        artifactTriggered: false,
      };

      const result = await triggerStabilityArtifact(testRoot, milestone, testLog);

      expect(result).not.toBeNull();
      expect(result).toContain('stability-milestone');
      expect(result).toContain('2026-01-01');
    });

    it('should not trigger artifact for low sovereignty milestone', async () => {
      const milestone: StabilityMilestone = {
        achievedAt: '2026-01-30T00:00:00Z',
        startDate: '2026-01-01',
        endDate: '2026-01-30',
        durationDays: 30,
        averageSovereignty: 0.5, // Below MIN_ARTIFACT_SOVEREIGNTY
        minSovereignty: 0.48,
        maxSovereignty: 0.52,
        variance: 0.04,
        artifactTriggered: false,
      };

      const result = await triggerStabilityArtifact(testRoot, milestone, testLog);

      expect(result).toBeNull();
    });
  });

  describe('Reporting', () => {
    it('should generate stability report for stable state', () => {
      const result = {
        currentScore: 0.82,
        consecutiveStableDays: 30,
        isStable: true,
        daysRemaining: 0,
        milestoneAchieved: true,
        milestone: {
          achievedAt: '2026-01-30T00:00:00Z',
          startDate: '2026-01-01',
          endDate: '2026-01-30',
          durationDays: 30,
          averageSovereignty: 0.82,
          minSovereignty: 0.78,
          maxSovereignty: 0.86,
          variance: 0.08,
          artifactTriggered: true,
          artifactPath: '/tmp/artifact.stl',
        },
      };

      const report = generateStabilityReport(result);

      expect(report).toContain('Sovereignty Stability Monitor');
      expect(report).toContain('0.820');
      expect(report).toContain('30 / 30');
      expect(report).toContain('STABILITY ACHIEVED');
      expect(report).toContain('Commemorative artifact generated');
    });

    it('should generate stability report for unstable state', () => {
      const result = {
        currentScore: 0.75,
        consecutiveStableDays: 15,
        isStable: false,
        daysRemaining: 15,
        milestoneAchieved: false,
      };

      const report = generateStabilityReport(result);

      expect(report).toContain('15 / 30');
      expect(report).toContain('15 days until stability milestone');
      expect(report).not.toContain('STABILITY ACHIEVED');
    });

    it('should generate milestones summary', () => {
      const milestones: StabilityMilestone[] = [
        {
          achievedAt: '2026-01-30T00:00:00Z',
          startDate: '2026-01-01',
          endDate: '2026-01-30',
          durationDays: 30,
          averageSovereignty: 0.82,
          minSovereignty: 0.78,
          maxSovereignty: 0.86,
          variance: 0.08,
          artifactTriggered: true,
        },
        {
          achievedAt: '2026-03-15T00:00:00Z',
          startDate: '2026-02-14',
          endDate: '2026-03-15',
          durationDays: 30,
          averageSovereignty: 0.88,
          minSovereignty: 0.85,
          maxSovereignty: 0.91,
          variance: 0.06,
          artifactTriggered: false,
        },
      ];

      writeFileSync(
        join(testRoot, 'data', 'stability-milestones.json'),
        JSON.stringify(milestones),
        'utf-8'
      );

      const summary = generateMilestonesSummary(testRoot);

      expect(summary).toContain('Stability Milestones History');
      expect(summary).toContain('30 days');
      expect(summary).toContain('🎨'); // Artifact triggered
      expect(summary).toContain('📍'); // No artifact
    });

    it('should handle empty milestones', () => {
      const summary = generateMilestonesSummary(testRoot);
      expect(summary).toContain('No stability milestones recorded yet');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing pipeline stats gracefully', () => {
      const snapshot = recordTodaySnapshot(testRoot, testLog);
      expect(snapshot).toBeNull();
    });

    it('should handle malformed history file', () => {
      writeFileSync(
        join(testRoot, 'data', 'sovereignty-history.jsonl'),
        'invalid json\n',
        'utf-8'
      );

      expect(() => loadHistory(testRoot)).toThrow();
    });

    it('should handle stability detection with gaps in history', () => {
      const history: SovereigntySnapshot[] = [
        {
          date: '2026-01-01',
          timestamp: '2026-01-01T00:00:00Z',
          score: 0.8,
          grade: 'B',
          trustDebtUnits: 1000,
          driftEvents: 0,
          source: 'pipeline',
        },
        {
          date: '2026-01-15', // 14-day gap
          timestamp: '2026-01-15T00:00:00Z',
          score: 0.8,
          grade: 'B',
          trustDebtUnits: 1000,
          driftEvents: 0,
          source: 'pipeline',
        },
      ];

      const result = detectStability(history);
      // Should only count consecutive days, not total days
      expect(result.consecutiveDays).toBeLessThanOrEqual(2);
    });
  });
});
