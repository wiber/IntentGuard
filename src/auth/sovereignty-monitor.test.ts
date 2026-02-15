/**
 * src/auth/sovereignty-monitor.test.ts — Tests for Sovereignty Monitor
 *
 * Tests 30-day stability detection, artifact triggering, and history management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  SovereigntyMonitor,
  recordMeasurement,
  loadHistory,
  getLatestMeasurement,
  analyzeStability,
  recordMilestone,
  loadMilestones,
  hasRecentMilestone,
  generateHistoryReport,
  exportHistoryCSV,
  DEFAULT_MONITOR_CONFIG,
  type SovereigntyMeasurement,
  type StabilityMilestone,
} from './sovereignty-monitor.js';

// ─── Test Utilities ─────────────────────────────────────────────────

const TEST_DATA_DIR = join(process.cwd(), 'data-test-sovereignty');

const originalCwd = process.cwd.bind(process);

function setupTestEnv() {
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true });
  }
  mkdirSync(TEST_DATA_DIR, { recursive: true });

  // Create data subdirectory that the monitor expects
  const dataDir = join(TEST_DATA_DIR, 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir);
  }

  // Override process.cwd for testing
  process.cwd = () => TEST_DATA_DIR;
}

function cleanupTestEnv() {
  // Restore original cwd
  process.cwd = originalCwd;

  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true });
  }
}

function createMockMeasurement(daysAgo: number, score: number): SovereigntyMeasurement {
  const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    timestamp,
    score,
    grade: score > 0.8 ? 'A' : score > 0.5 ? 'B' : 'C',
    trustDebtUnits: Math.round((1 - score) * 1000),
    driftEvents: 0,
    source: 'pipeline',
  };
}

const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

// ─── Tests ──────────────────────────────────────────────────────────

describe('Sovereignty Monitor', () => {
  describe('Record and load measurements', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should record and load measurements correctly', () => {
      const m1 = createMockMeasurement(0, 0.85);
      const m2 = createMockMeasurement(1, 0.84);
      const m3 = createMockMeasurement(2, 0.86);

      recordMeasurement(m1);
      recordMeasurement(m2);
      recordMeasurement(m3);

      const history = loadHistory(30);
      expect(history.length).toBe(3);
      expect(history[0].score).toBe(0.85);
      expect(history[2].score).toBe(0.86);
    });
  });

  describe('Get latest measurement', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should return null when no history', () => {
      const latest = getLatestMeasurement();
      expect(latest).toBeNull();
    });

    it('should return latest measurement', () => {
      const m1 = createMockMeasurement(0, 0.75);
      recordMeasurement(m1);

      const latest = getLatestMeasurement();
      expect(latest).not.toBeNull();
      expect(latest!.score).toBe(0.75);
    });
  });

  describe('Stability detection - stable case', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should detect stability with 30 days of consistent measurements', () => {
      for (let i = 0; i < 30; i++) {
        const score = 0.80 + (Math.random() * 0.04 - 0.02);
        const m = createMockMeasurement(29 - i, score);
        recordMeasurement(m);
      }

      const analysis = analyzeStability(DEFAULT_MONITOR_CONFIG);
      expect(analysis.isStable).toBe(true);
      expect(analysis.stableDays).toBeGreaterThanOrEqual(30);
      expect(analysis.scoreVariance).toBeLessThanOrEqual(0.05);
    });
  });

  describe('Stability detection - unstable case', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should not detect stability with volatile measurements', () => {
      // 15 days stable, then 15 days volatile
      for (let i = 0; i < 15; i++) {
        const score = 0.80 + (Math.random() * 0.04 - 0.02);
        const m = createMockMeasurement(29 - i, score);
        recordMeasurement(m);
      }
      for (let i = 15; i < 30; i++) {
        const score = 0.60 + Math.random() * 0.3;
        const m = createMockMeasurement(29 - i, score);
        recordMeasurement(m);
      }

      const analysis = analyzeStability(DEFAULT_MONITOR_CONFIG);
      expect(analysis.isStable).toBe(false);
      expect(analysis.stableDays).toBeLessThan(30);
    });
  });

  describe('Trend detection - upward', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should detect upward trend', () => {
      for (let i = 0; i < 30; i++) {
        const score = 0.70 + (i * 0.005);
        const m = createMockMeasurement(29 - i, score);
        recordMeasurement(m);
      }

      const analysis = analyzeStability(DEFAULT_MONITOR_CONFIG);
      expect(analysis.trendDirection).toBe('up');
      expect(analysis.trendStrength).toBeGreaterThan(0);
    });
  });

  describe('Trend detection - downward', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should detect downward trend', () => {
      for (let i = 0; i < 30; i++) {
        const score = 0.80 - (i * 0.005);
        const m = createMockMeasurement(29 - i, score);
        recordMeasurement(m);
      }

      const analysis = analyzeStability(DEFAULT_MONITOR_CONFIG);
      expect(analysis.trendDirection).toBe('down');
      expect(analysis.trendStrength).toBeGreaterThan(0);
    });
  });

  describe('Milestone recording', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should record and load milestones', () => {
      const milestone: StabilityMilestone = {
        achievedAt: new Date().toISOString(),
        score: 0.85,
        stableDays: 30,
        artifactGenerated: true,
        artifactPath: '/tmp/test-artifact.stl',
        notificationSent: true,
      };

      recordMilestone(milestone);
      const milestones = loadMilestones();

      expect(milestones.length).toBe(1);
      expect(milestones[0].score).toBe(0.85);
      expect(milestones[0].artifactGenerated).toBe(true);
    });
  });

  describe('Recent milestone detection', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should detect recent milestones', () => {
      expect(hasRecentMilestone(30)).toBe(false);

      const milestone: StabilityMilestone = {
        achievedAt: new Date().toISOString(),
        score: 0.85,
        stableDays: 30,
        artifactGenerated: false,
        notificationSent: false,
      };

      recordMilestone(milestone);
      expect(hasRecentMilestone(30)).toBe(true);
      // 0 days means cutoff = Date.now(); the milestone was created moments before,
      // so it may or may not match depending on timing. Use a very small window instead.
      // A milestone created "now" is not within 0 past days reliably.
      expect(hasRecentMilestone(1)).toBe(true); // Within last 1 day: yes
    });
  });

  describe('Monitor class - artifact callback', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should trigger artifact callback on stability milestone', async () => {
      let artifactGenerated = false;
      let artifactScore = 0;

      const monitor = new SovereigntyMonitor(mockLogger, DEFAULT_MONITOR_CONFIG);
      monitor.bindArtifactGenerator(async (score, days) => {
        artifactGenerated = true;
        artifactScore = score;
        return `/tmp/artifact-${score}.stl`;
      });

      for (let i = 0; i < 30; i++) {
        const m = createMockMeasurement(29 - i, 0.85);
        recordMeasurement(m);
      }

      await monitor.checkStability();

      expect(artifactGenerated).toBe(true);
      expect(artifactScore).toBe(0.85);
    });
  });

  describe('Monitor class - notification callback', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should trigger notification on stability milestone', async () => {
      let notificationSent = false;
      let notificationMessage = '';

      const monitor = new SovereigntyMonitor(mockLogger, DEFAULT_MONITOR_CONFIG);
      monitor.bindNotification(async (message) => {
        notificationSent = true;
        notificationMessage = message;
      });
      monitor.bindArtifactGenerator(async () => '/tmp/test.stl');

      for (let i = 0; i < 30; i++) {
        const m = createMockMeasurement(29 - i, 0.85);
        recordMeasurement(m);
      }

      await monitor.checkStability();

      expect(notificationSent).toBe(true);
      expect(notificationMessage).toContain('STABILITY MILESTONE');
      expect(notificationMessage).toContain('0.850');
    });
  });

  describe('History report generation', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should generate history report', () => {
      for (let i = 0; i < 10; i++) {
        const m = createMockMeasurement(9 - i, 0.75 + i * 0.01);
        recordMeasurement(m);
      }

      const report = generateHistoryReport(10);
      expect(report).toContain('Sovereignty History Report');
      expect(report).toContain('Current Score:');
      expect(report).toContain('Stable Days:');
    });
  });

  describe('CSV export', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should export history as CSV', () => {
      for (let i = 0; i < 5; i++) {
        const m = createMockMeasurement(4 - i, 0.80);
        recordMeasurement(m);
      }

      const csv = exportHistoryCSV(10);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('timestamp,score,grade,trustDebtUnits,driftEvents,source');
      expect(lines.length).toBe(6);
      expect(lines[1]).toContain('0.8');
    });
  });

  describe('Monitor status', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should return correct status', () => {
      const monitor = new SovereigntyMonitor(mockLogger, DEFAULT_MONITOR_CONFIG);

      for (let i = 0; i < 15; i++) {
        const m = createMockMeasurement(14 - i, 0.85);
        recordMeasurement(m);
      }

      const status = monitor.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.latestScore).toBe(0.85);
      expect(status.stableDays).toBe(15);
      expect(status.requiredDays).toBe(30);
      expect(status.isStable).toBe(false);
    });
  });

  describe('No duplicate artifact generation', () => {
    beforeEach(() => setupTestEnv());
    afterEach(() => cleanupTestEnv());

    it('should only generate artifact once', async () => {
      let artifactCount = 0;
      const monitor = new SovereigntyMonitor(mockLogger, DEFAULT_MONITOR_CONFIG);
      monitor.bindArtifactGenerator(async () => {
        artifactCount++;
        return '/tmp/test.stl';
      });

      for (let i = 0; i < 30; i++) {
        const m = createMockMeasurement(29 - i, 0.85);
        recordMeasurement(m);
      }

      await monitor.checkStability();
      await monitor.checkStability(); // Second check should not trigger

      expect(artifactCount).toBe(1);
    });
  });
});
