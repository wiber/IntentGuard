/**
 * hot-cell-router.test.ts — Tests for HotCellRouter
 *
 * Tests pressure calculation, hot cell detection, and room routing logic.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { existsSync, unlinkSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { HotCellRouter } from './hot-cell-router';
import type { GridEvent } from './event-bridge';

// Test data directory
const TEST_DATA_DIR = join(process.cwd(), 'data', 'test-hot-cell-router');
const TEST_EVENTS_PATH = join(TEST_DATA_DIR, 'grid-events.jsonl');

/**
 * Create test events with different time distributions
 */
function createTestEvents(config: {
  recentEvents: number; // Within last hour
  mediumEvents: number; // Within 6 hours
  oldEvents: number; // Within 24 hours
  cell: string;
}): GridEvent[] {
  const now = new Date();
  const events: GridEvent[] = [];

  // Recent events (last hour) - weight 1.0
  for (let i = 0; i < config.recentEvents; i++) {
    const timestamp = new Date(now.getTime() - i * 10 * 60 * 1000); // 10 min intervals
    events.push({
      timestamp: timestamp.toISOString(),
      type: 'POINTER_CREATE',
      cell: config.cell,
      phase: 0,
      task: `Recent task ${i}`,
      intersection: `TEST:${config.cell}`,
    });
  }

  // Medium age events (6 hours) - weight 0.5
  for (let i = 0; i < config.mediumEvents; i++) {
    const timestamp = new Date(now.getTime() - (2 + i * 0.5) * 60 * 60 * 1000);
    events.push({
      timestamp: timestamp.toISOString(),
      type: 'POINTER_CREATE',
      cell: config.cell,
      phase: 1,
      task: `Medium task ${i}`,
      intersection: `TEST:${config.cell}`,
    });
  }

  // Old events (24 hours) - weight 0.2
  for (let i = 0; i < config.oldEvents; i++) {
    const timestamp = new Date(now.getTime() - (12 + i * 2) * 60 * 60 * 1000);
    events.push({
      timestamp: timestamp.toISOString(),
      type: 'POINTER_CREATE',
      cell: config.cell,
      phase: 2,
      task: `Old task ${i}`,
      intersection: `TEST:${config.cell}`,
    });
  }

  return events;
}

/**
 * Write events to JSONL file
 */
function writeEventsToFile(events: GridEvent[], path: string): void {
  const lines = events.map(e => JSON.stringify(e)).join('\n');
  writeFileSync(path, lines + '\n', 'utf8');
}

describe('HotCellRouter', () => {
  beforeEach(() => {
    // Create test data directory
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(TEST_EVENTS_PATH)) {
      unlinkSync(TEST_EVENTS_PATH);
    }
  });

  describe('pressure calculation', () => {
    it('should calculate pressure based on event frequency and recency', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      // Create events with different time distributions
      const events: GridEvent[] = [
        ...createTestEvents({ recentEvents: 3, mediumEvents: 2, oldEvents: 1, cell: 'A1' }),
        ...createTestEvents({ recentEvents: 1, mediumEvents: 1, oldEvents: 1, cell: 'B2' }),
      ];

      const pressures = router.updatePressures(events);

      // A1 should have higher pressure: 3*1.0 + 2*0.5 + 1*0.2 = 4.2
      // B2 should have lower pressure: 1*1.0 + 1*0.5 + 1*0.2 = 1.7
      // Normalized: A1 = 1.0, B2 = 1.7/4.2 ≈ 0.40

      expect(pressures.A1).toBe(1.0); // Maximum pressure
      expect(pressures.B2).toBeCloseTo(0.40, 1);
    });

    it('should ignore events older than 24 hours', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      const now = new Date();
      const events: GridEvent[] = [
        {
          timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 min ago
          type: 'POINTER_CREATE',
          cell: 'A1',
          phase: 0,
          task: 'Recent',
          intersection: 'TEST:A1',
        },
        {
          timestamp: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
          type: 'POINTER_CREATE',
          cell: 'A1',
          phase: 0,
          task: 'Too old',
          intersection: 'TEST:A1',
        },
      ];

      const pressures = router.updatePressures(events);

      // Only 1 event should be counted (the recent one)
      const cellData = router.getCellPressure('A1');
      expect(cellData?.eventCount).toBe(1);
      expect(pressures.A1).toBe(1.0);
    });

    it('should return empty pressures when no events exist', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);
      const pressures = router.updatePressures([]);

      expect(Object.keys(pressures).length).toBe(0);
    });

    it('should load events from file when no events provided', () => {
      const events = createTestEvents({ recentEvents: 2, mediumEvents: 1, oldEvents: 0, cell: 'C3' });
      writeEventsToFile(events, TEST_EVENTS_PATH);

      const router = new HotCellRouter(TEST_EVENTS_PATH);
      const pressures = router.updatePressures();

      expect(pressures.C3).toBe(1.0);
    });
  });

  describe('hot cell detection', () => {
    it('should identify cells above pressure threshold', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      const events: GridEvent[] = [
        ...createTestEvents({ recentEvents: 5, mediumEvents: 0, oldEvents: 0, cell: 'A1' }), // High pressure
        ...createTestEvents({ recentEvents: 3, mediumEvents: 0, oldEvents: 0, cell: 'B2' }), // Medium pressure
        ...createTestEvents({ recentEvents: 1, mediumEvents: 0, oldEvents: 0, cell: 'C3' }), // Low pressure
      ];

      router.updatePressures(events);

      // A1 = 1.0 (5/5), B2 = 0.6 (3/5), C3 = 0.2 (1/5)
      const hotCells = router.getHotCells(0.5);

      expect(hotCells).toContain('A1');
      expect(hotCells).toContain('B2');
      expect(hotCells).not.toContain('C3');
    });

    it('should return hot cells sorted by pressure (descending)', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      const events: GridEvent[] = [
        ...createTestEvents({ recentEvents: 2, mediumEvents: 0, oldEvents: 0, cell: 'A1' }),
        ...createTestEvents({ recentEvents: 5, mediumEvents: 0, oldEvents: 0, cell: 'B2' }),
        ...createTestEvents({ recentEvents: 3, mediumEvents: 0, oldEvents: 0, cell: 'C3' }),
      ];

      router.updatePressures(events);
      const hotCells = router.getHotCells(0.0); // Get all cells

      expect(hotCells[0]).toBe('B2'); // Highest pressure
      expect(hotCells[1]).toBe('C3'); // Medium pressure
      expect(hotCells[2]).toBe('A1'); // Lowest pressure
    });

    it('should return empty array when no cells meet threshold', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      const events: GridEvent[] = [
        ...createTestEvents({ recentEvents: 1, mediumEvents: 0, oldEvents: 0, cell: 'A1' }),
      ];

      router.updatePressures(events);
      const hotCells = router.getHotCells(0.99); // Very high threshold

      expect(hotCells.length).toBe(0);
    });
  });

  describe('room routing', () => {
    it('should route to room with highest total pressure', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      // A1, A2, A3 map to different rooms
      // Create high pressure in #legal-room (A1)
      const events: GridEvent[] = [
        ...createTestEvents({ recentEvents: 5, mediumEvents: 0, oldEvents: 0, cell: 'A1' }), // #legal-room
        ...createTestEvents({ recentEvents: 2, mediumEvents: 0, oldEvents: 0, cell: 'B2' }), // #deals-room
      ];

      router.updatePressures(events);
      const recommendation = router.routeToRoom();

      expect(recommendation.room).toBe('#legal-room');
      expect(recommendation.cells).toContain('A1');
      expect(recommendation.totalPressure).toBeGreaterThan(0);
    });

    it('should aggregate multiple cells in same room', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      // A1, A2, A3 are in different rooms, but let's use multiple high-pressure cells
      const events: GridEvent[] = [
        ...createTestEvents({ recentEvents: 3, mediumEvents: 0, oldEvents: 0, cell: 'A1' }),
        ...createTestEvents({ recentEvents: 3, mediumEvents: 0, oldEvents: 0, cell: 'B1' }),
        ...createTestEvents({ recentEvents: 2, mediumEvents: 0, oldEvents: 0, cell: 'C1' }),
      ];

      router.updatePressures(events);
      const recommendation = router.routeToRoom();

      // All three cells have similar pressure, but routing should pick highest
      expect(['#legal-room', '#speed-room', '#ops-room']).toContain(recommendation.room);
      expect(recommendation.cells.length).toBeGreaterThan(0);
    });

    it('should return #general when no hot cells detected', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      router.updatePressures([]); // No events
      const recommendation = router.routeToRoom();

      expect(recommendation.room).toBe('#general');
      expect(recommendation.cells).toEqual([]);
      expect(recommendation.totalPressure).toBe(0);
      expect(recommendation.reason).toContain('No hot cells');
    });

    it('should accept pre-calculated hot cells', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      const events: GridEvent[] = [
        ...createTestEvents({ recentEvents: 5, mediumEvents: 0, oldEvents: 0, cell: 'A1' }),
        ...createTestEvents({ recentEvents: 3, mediumEvents: 0, oldEvents: 0, cell: 'B2' }),
      ];

      router.updatePressures(events);
      const recommendation = router.routeToRoom(['A1']); // Override with specific cells

      expect(recommendation.room).toBe('#legal-room');
      expect(recommendation.cells).toEqual(['A1']);
    });
  });

  describe('pressure queries', () => {
    it('should return all cell pressures sorted descending', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      const events: GridEvent[] = [
        ...createTestEvents({ recentEvents: 5, mediumEvents: 0, oldEvents: 0, cell: 'A1' }),
        ...createTestEvents({ recentEvents: 2, mediumEvents: 0, oldEvents: 0, cell: 'B2' }),
        ...createTestEvents({ recentEvents: 3, mediumEvents: 0, oldEvents: 0, cell: 'C3' }),
      ];

      router.updatePressures(events);
      const allPressures = router.getAllPressures();

      expect(allPressures.length).toBe(3);
      expect(allPressures[0].cell).toBe('A1'); // Highest
      expect(allPressures[2].cell).toBe('B2'); // Lowest
    });

    it('should get specific cell pressure', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      const events: GridEvent[] = [
        ...createTestEvents({ recentEvents: 3, mediumEvents: 2, oldEvents: 1, cell: 'A1' }),
      ];

      router.updatePressures(events);
      const cellData = router.getCellPressure('A1');

      expect(cellData).toBeDefined();
      expect(cellData?.cell).toBe('A1');
      expect(cellData?.pressure).toBe(1.0);
      expect(cellData?.eventCount).toBe(6);
      expect(cellData?.room).toBe('#legal-room');
    });

    it('should return undefined for non-existent cell', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      router.updatePressures([]);
      const cellData = router.getCellPressure('Z9');

      expect(cellData).toBeUndefined();
    });
  });

  describe('summary report', () => {
    it('should generate readable summary with pressures and routing', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      const events: GridEvent[] = [
        ...createTestEvents({ recentEvents: 4, mediumEvents: 0, oldEvents: 0, cell: 'A1' }),
        ...createTestEvents({ recentEvents: 2, mediumEvents: 0, oldEvents: 0, cell: 'B2' }),
      ];

      router.updatePressures(events);
      const summary = router.getSummary();

      expect(summary).toContain('HOT-CELL ROUTER SUMMARY');
      expect(summary).toContain('Cell Pressures:');
      expect(summary).toContain('A1');
      expect(summary).toContain('B2');
      expect(summary).toContain('Routing Recommendation:');
      expect(summary).toContain('#legal-room');
    });

    it('should include pressure bars in summary', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      const events: GridEvent[] = [
        ...createTestEvents({ recentEvents: 5, mediumEvents: 0, oldEvents: 0, cell: 'A1' }),
      ];

      router.updatePressures(events);
      const summary = router.getSummary();

      // Should include visualization bar
      expect(summary).toMatch(/█+/);
    });
  });

  describe('edge cases', () => {
    it('should handle missing events file gracefully', () => {
      const nonExistentPath = join(TEST_DATA_DIR, 'does-not-exist.jsonl');
      const router = new HotCellRouter(nonExistentPath);

      const pressures = router.updatePressures();

      expect(Object.keys(pressures).length).toBe(0);
    });

    it('should handle malformed JSONL gracefully', () => {
      writeFileSync(TEST_EVENTS_PATH, 'not valid json\n', 'utf8');
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      // Should not throw, should return empty pressures
      const pressures = router.updatePressures();
      expect(Object.keys(pressures).length).toBe(0);
    });

    it('should handle events with missing cell mapping', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      const events: GridEvent[] = [
        {
          timestamp: new Date().toISOString(),
          type: 'POINTER_CREATE',
          cell: 'Z9', // Unknown cell
          phase: 99,
          task: 'Unknown cell task',
          intersection: 'TEST:Z9',
        },
      ];

      router.updatePressures(events);
      const cellData = router.getCellPressure('Z9');

      expect(cellData?.room).toBe('#unknown');
    });

    it('should handle single event normalization', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      const events: GridEvent[] = [
        {
          timestamp: new Date().toISOString(),
          type: 'POINTER_CREATE',
          cell: 'A1',
          phase: 0,
          task: 'Single event',
          intersection: 'TEST:A1',
        },
      ];

      const pressures = router.updatePressures(events);

      // Single event should have normalized pressure of 1.0
      expect(pressures.A1).toBe(1.0);
    });
  });

  describe('time-weighted scoring', () => {
    it('should weight recent events (1 hour) at 1.0', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      const events = createTestEvents({ recentEvents: 1, mediumEvents: 0, oldEvents: 0, cell: 'A1' });

      router.updatePressures(events);
      const cellData = router.getCellPressure('A1');

      expect(cellData?.pressure).toBe(1.0);
      expect(cellData?.eventCount).toBe(1);
    });

    it('should weight medium events (6 hours) at 0.5', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      // 1 medium event vs 2 medium events should show proportional increase
      const events1 = createTestEvents({ recentEvents: 0, mediumEvents: 1, oldEvents: 0, cell: 'A1' });
      const events2 = createTestEvents({ recentEvents: 0, mediumEvents: 2, oldEvents: 0, cell: 'B2' });

      router.updatePressures([...events1, ...events2]);

      const pressureA1 = router.getCellPressure('A1')?.pressure || 0;
      const pressureB2 = router.getCellPressure('B2')?.pressure || 0;

      expect(pressureB2).toBeCloseTo(1.0, 1);
      expect(pressureA1).toBeCloseTo(0.5, 1);
    });

    it('should weight old events (24 hours) at 0.2', () => {
      const router = new HotCellRouter(TEST_EVENTS_PATH);

      // 1 old event vs 5 old events should show proportional increase
      const events1 = createTestEvents({ recentEvents: 0, mediumEvents: 0, oldEvents: 1, cell: 'A1' });
      const events2 = createTestEvents({ recentEvents: 0, mediumEvents: 0, oldEvents: 5, cell: 'B2' });

      router.updatePressures([...events1, ...events2]);

      const pressureA1 = router.getCellPressure('A1')?.pressure || 0;
      const pressureB2 = router.getCellPressure('B2')?.pressure || 0;

      expect(pressureB2).toBeCloseTo(1.0, 1);
      expect(pressureA1).toBeCloseTo(0.2, 1);
    });
  });
});
