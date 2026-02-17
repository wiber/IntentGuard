/**
 * src/federation/drift-detector.test.ts — Tests for DriftDetector
 *
 * Tests drift detection, auto-quarantine, batch checks, and stats tracking.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DriftDetector, DRIFT_THRESHOLD } from './drift-detector.js';
import type { DriftCheckResult } from './drift-detector.js';

// ─── Mocks ───────────────────────────────────────────────────────────────

vi.mock('../auth/geometric', () => ({
  TrustDebtCategory: {},
  TRUST_DEBT_CATEGORIES: ['cat-a', 'cat-b', 'cat-c'],
}));

vi.mock('./tensor-overlap', () => ({
  computeTensorOverlap: vi.fn((_local: any, remote: any) => {
    // Return overlap based on a marker value we set in tests
    const overlap = remote?.__testOverlap ?? 0.95;
    return { overlap, distance: 1 - overlap };
  }),
  geometryHash: vi.fn((geo: any) => {
    return geo?.__testHash ?? `hash-${JSON.stringify(geo).length}`;
  }),
}));

function createMockRegistry({
  bot = null as any,
  localGeometry = { 'cat-a': 0.5, 'cat-b': 0.5 },
  bots = [] as any[],
} = {}) {
  return {
    localGeometry,
    getBotStatus: vi.fn(() => bot),
    quarantineBot: vi.fn(),
    listBots: vi.fn(() => bots),
  } as any;
}

function makeBotEntry(overrides: Record<string, any> = {}) {
  return {
    id: 'bot-1',
    name: 'TestBot',
    overlap: 0.95,
    geometryHash: 'hash-old',
    status: 'active',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('DriftDetector', () => {
  let detector: DriftDetector;
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    registry = createMockRegistry({
      bot: makeBotEntry(),
    });
    detector = new DriftDetector(registry);
  });

  describe('checkBot', () => {
    it('returns not-drifted for unregistered bot', () => {
      registry.getBotStatus.mockReturnValue(null);
      const result = detector.checkBot('unknown', { 'cat-a': 0.5 });
      expect(result.drifted).toBe(false);
      expect(result.quarantined).toBe(false);
      expect(result.reason).toBe('Bot not registered');
    });

    it('returns not-drifted when geometry hash unchanged', () => {
      // Same hash means no geometry change
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ geometryHash: 'hash-13' }),
      );
      const geo = { 'cat-a': 0.5 };
      const result = detector.checkBot('bot-1', geo);
      expect(result.drifted).toBe(false);
      expect(result.reason).toContain('No geometry change');
    });

    it('detects drift when delta exceeds threshold', () => {
      // Bot has overlap 0.95, new geometry will compute to different overlap
      const newGeo = { __testOverlap: 0.90, __testHash: 'hash-new' } as any;
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old' }),
      );

      const result = detector.checkBot('bot-1', newGeo);

      // delta = |0.90 - 0.95| = 0.05, well above 0.003 threshold
      expect(result.drifted).toBe(true);
      expect(result.delta).toBeCloseTo(0.05, 4);
      expect(result.oldOverlap).toBe(0.95);
      expect(result.newOverlap).toBe(0.90);
    });

    it('auto-quarantines on drift detection', () => {
      const newGeo = { __testOverlap: 0.90, __testHash: 'hash-new' } as any;
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old', status: 'active' }),
      );

      const result = detector.checkBot('bot-1', newGeo);
      expect(result.quarantined).toBe(true);
      expect(registry.quarantineBot).toHaveBeenCalledWith('bot-1', expect.stringContaining('drift'));
    });

    it('does not re-quarantine already quarantined bot', () => {
      const newGeo = { __testOverlap: 0.90, __testHash: 'hash-new' } as any;
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old', status: 'quarantined' }),
      );

      const result = detector.checkBot('bot-1', newGeo);
      expect(result.drifted).toBe(true);
      expect(result.quarantined).toBe(false);
      expect(result.reason).toContain('already quarantined');
      expect(registry.quarantineBot).not.toHaveBeenCalled();
    });

    it('allows geometry change within tolerance', () => {
      // Delta = |0.9505 - 0.95| = 0.0005, below 0.003 threshold
      const newGeo = { __testOverlap: 0.9505, __testHash: 'hash-new' } as any;
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old' }),
      );

      const result = detector.checkBot('bot-1', newGeo);
      expect(result.drifted).toBe(false);
      expect(result.quarantined).toBe(false);
      expect(result.reason).toContain('within tolerance');
    });

    it('respects custom threshold', () => {
      const newGeo = { __testOverlap: 0.90, __testHash: 'hash-new' } as any;
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old' }),
      );

      // With very high threshold, 0.05 delta should not trigger drift
      const result = detector.checkBot('bot-1', newGeo, 0.1);
      expect(result.drifted).toBe(false);
    });
  });

  describe('checkBatch', () => {
    it('checks multiple bots and returns results', () => {
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old' }),
      );

      const checks: [string, any][] = [
        ['bot-1', { __testOverlap: 0.90, __testHash: 'hash-a' }],
        ['bot-2', { __testOverlap: 0.94, __testHash: 'hash-b' }],
      ];

      const results = detector.checkBatch(checks);
      expect(results).toHaveLength(2);
    });
  });

  describe('monitorAll', () => {
    it('checks only bots with provided geometries', () => {
      registry.listBots.mockReturnValue([
        { id: 'bot-1' },
        { id: 'bot-2' },
        { id: 'bot-3' },
      ]);
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old' }),
      );

      const geometries = new Map<string, any>([
        ['bot-1', { __testOverlap: 0.95, __testHash: 'hash-old' }],
        ['bot-3', { __testOverlap: 0.95, __testHash: 'hash-old' }],
      ]);

      const results = detector.monitorAll(geometries);
      expect(results).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    it('starts with zeroed stats', () => {
      const stats = detector.getStats();
      expect(stats.totalChecks).toBe(0);
      expect(stats.driftsDetected).toBe(0);
      expect(stats.botsQuarantined).toBe(0);
      expect(stats.averageDelta).toBe(0);
      expect(stats.maxDelta).toBe(0);
      expect(stats.recentEvents).toHaveLength(0);
    });

    it('tracks stats after checks', () => {
      const newGeo = { __testOverlap: 0.90, __testHash: 'hash-new' } as any;
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old', status: 'active' }),
      );

      detector.checkBot('bot-1', newGeo);
      const stats = detector.getStats();

      expect(stats.totalChecks).toBe(1);
      expect(stats.driftsDetected).toBe(1);
      expect(stats.botsQuarantined).toBe(1);
      expect(stats.maxDelta).toBeCloseTo(0.05, 4);
      expect(stats.recentEvents).toHaveLength(1);
    });

    it('computes averageDelta across multiple drifts', () => {
      // First drift: delta=0.05
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old', status: 'active' }),
      );
      detector.checkBot('bot-1', { __testOverlap: 0.90, __testHash: 'hash-1' } as any);

      // Second drift: delta=0.10
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old', status: 'active' }),
      );
      detector.checkBot('bot-2', { __testOverlap: 0.85, __testHash: 'hash-2' } as any);

      const stats = detector.getStats();
      expect(stats.driftsDetected).toBe(2);
      expect(stats.averageDelta).toBeCloseTo(0.075, 4); // (0.05 + 0.10) / 2
      expect(stats.maxDelta).toBeCloseTo(0.10, 4);
    });
  });

  describe('getRecentEvents', () => {
    it('returns events in reverse chronological order', () => {
      registry.getBotStatus
        .mockReturnValueOnce(makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old', status: 'active' }))
        .mockReturnValueOnce(makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old', status: 'active' }));

      detector.checkBot('bot-A', { __testOverlap: 0.90, __testHash: 'hash-a' } as any);
      detector.checkBot('bot-B', { __testOverlap: 0.85, __testHash: 'hash-b' } as any);

      const events = detector.getRecentEvents(10);
      expect(events).toHaveLength(2);
      expect(events[0].botId).toBe('bot-B'); // most recent first
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        registry.getBotStatus.mockReturnValue(
          makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old', status: 'active' }),
        );
        detector.checkBot(`bot-${i}`, { __testOverlap: 0.90, __testHash: `h-${i}` } as any);
      }

      const events = detector.getRecentEvents(2);
      expect(events).toHaveLength(2);
    });
  });

  describe('reset', () => {
    it('clears all stats and events', () => {
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old', status: 'active' }),
      );
      detector.checkBot('bot-1', { __testOverlap: 0.90, __testHash: 'hash-new' } as any);

      detector.reset();

      const stats = detector.getStats();
      expect(stats.totalChecks).toBe(0);
      expect(stats.driftsDetected).toBe(0);
      expect(stats.recentEvents).toHaveLength(0);
    });
  });

  describe('exportEvents', () => {
    it('returns valid JSON with stats and events', () => {
      registry.getBotStatus.mockReturnValue(
        makeBotEntry({ overlap: 0.95, geometryHash: 'hash-old', status: 'active' }),
      );
      detector.checkBot('bot-1', { __testOverlap: 0.90, __testHash: 'hash-new' } as any);

      const exported = detector.exportEvents();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('exported');
      expect(parsed).toHaveProperty('stats');
      expect(parsed).toHaveProperty('events');
      expect(parsed.events).toHaveLength(1);
      expect(parsed.stats.driftsDetected).toBe(1);
    });
  });

  describe('DRIFT_THRESHOLD constant', () => {
    it('is 0.003', () => {
      expect(DRIFT_THRESHOLD).toBe(0.003);
    });
  });
});
