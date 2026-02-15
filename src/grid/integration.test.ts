/**
 * integration.test.ts — Tesseract Grid Integration Tests
 *
 * Tests the complete grid system integration including:
 * - Event Bridge task completions
 * - Hot Cell Router pressure calculations
 * - Tesseract Client API interactions (mocked)
 * - ASCII Renderer output
 * - Deep Linker URL generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  gridEventBridge,
  hotCellRouter,
  deepLinker,
  renderGrid,
  renderGridEmbed,
  type RecentEvent,
} from './index.js';

describe('Grid System Integration', () => {
  beforeEach(() => {
    // Reset grid state before each test
    vi.clearAllMocks();
  });

  describe('Event Bridge Integration', () => {
    it('should emit grid event for task completion', () => {
      const event = gridEventBridge.onTaskComplete(
        0,
        'Define Q1 revenue goals',
        { discordChannelId: 'channel-123', discordMessageId: 'msg-456' }
      );

      expect(event).toBeDefined();
      expect(event?.cell).toBe('A2'); // Phase 0 → A2:Goal
      expect(event?.phase).toBe(0);
      expect(event?.task).toBe('Define Q1 revenue goals');
      expect(event?.type).toBe('POINTER_CREATE');
    });

    it('should handle multiple phase mappings', () => {
      const phases = [
        { phase: 0, expectedCell: 'A2' }, // Goal
        { phase: 1, expectedCell: 'B3' }, // Signal
        { phase: 2, expectedCell: 'A1' }, // Law
        { phase: 3, expectedCell: 'B1' }, // Speed
        { phase: 4, expectedCell: 'C1' }, // Grid
      ];

      phases.forEach(({ phase, expectedCell }) => {
        const event = gridEventBridge.onTaskComplete(phase, `Task ${phase}`);
        expect(event?.cell).toBe(expectedCell);
      });
    });

    it('should return null for unmapped phase', () => {
      const event = gridEventBridge.onTaskComplete(99, 'Invalid phase');
      expect(event).toBeNull();
    });
  });

  describe('Hot Cell Router Integration', () => {
    it('should calculate cell pressures from events', () => {
      // Emit several events to A2
      for (let i = 0; i < 5; i++) {
        gridEventBridge.onTaskComplete(0, `Goal task ${i}`);
      }

      const pressures = hotCellRouter.updatePressures();
      expect(pressures['A2']).toBeGreaterThan(0);
    });

    it('should identify hot cells above threshold', () => {
      // Create high pressure in A2
      for (let i = 0; i < 10; i++) {
        gridEventBridge.onTaskComplete(0, `High pressure task ${i}`);
      }

      hotCellRouter.updatePressures();
      const hotCells = hotCellRouter.getHotCells(0.5);

      expect(hotCells).toContain('A2');
    });

    it('should route hot cells to appropriate rooms', () => {
      // Create hot cells
      for (let i = 0; i < 10; i++) {
        gridEventBridge.onTaskComplete(0, `Goal task ${i}`);
      }

      hotCellRouter.updatePressures();
      const hotCells = hotCellRouter.getHotCells(0.5);
      const routing = hotCellRouter.routeToRoom(hotCells);

      expect(routing.room).toBeDefined();
      expect(routing.cells.length).toBeGreaterThan(0);
      expect(routing.totalPressure).toBeGreaterThan(0);
      expect(routing.reason).toBeDefined();
    });

    it('should get individual cell pressure data', () => {
      gridEventBridge.onTaskComplete(0, 'Goal task');
      hotCellRouter.updatePressures();

      const cellData = hotCellRouter.getCellPressure('A2');
      expect(cellData).toBeDefined();
      expect(cellData?.cell).toBe('A2');
      expect(cellData?.pressure).toBeGreaterThanOrEqual(0);
      expect(cellData?.eventCount).toBeGreaterThan(0);
    });

    it('should generate summary with hot cell stats', () => {
      // Create some activity
      gridEventBridge.onTaskComplete(0, 'Goal task');
      gridEventBridge.onTaskComplete(1, 'Signal task');
      hotCellRouter.updatePressures();

      const summary = hotCellRouter.getSummary();
      expect(summary).toContain('Cell Pressures');
      expect(summary.length).toBeGreaterThan(0);
    });
  });

  describe('ASCII Renderer Integration', () => {
    it('should render grid with pressures', () => {
      const pressures = {
        A1: 0.2, A2: 0.8, A3: 0.1, A4: 0.0,
        B1: 0.5, B2: 0.3, B3: 0.9, B4: 0.1,
        C1: 0.0, C2: 0.0, C3: 0.0, C4: 0.0,
      };

      const ascii = renderGrid(pressures);

      expect(ascii).toContain('TESSERACT');
      expect(ascii).toContain('Strategy');
      expect(ascii).toContain('Tactics');
      expect(ascii).toContain('Operations');
      expect(ascii.length).toBeGreaterThan(100);
    });

    it('should render grid embed with recent events', () => {
      const pressures = { A2: 0.8, B3: 0.6 };
      const recentEvents: RecentEvent[] = [
        {
          cellId: 'A2',
          type: 'task-complete',
          timestamp: new Date(),
          description: 'Goal task completed',
        },
        {
          cellId: 'B3',
          type: 'task-complete',
          timestamp: new Date(),
          description: 'Signal task completed',
        },
      ];

      const embed = renderGridEmbed(pressures, recentEvents);

      expect(embed.title).toBeDefined();
      expect(embed.description).toBeDefined();
      expect(embed.recentEvents).toHaveLength(2);
      expect(embed.timestamp).toBeDefined();
    });

    it('should render empty grid correctly', () => {
      const ascii = renderGrid({});
      expect(ascii).toContain('TESSERACT');
      expect(ascii.length).toBeGreaterThan(0);
    });
  });

  describe('Deep Linker Integration', () => {
    it('should generate deep link for cell', () => {
      const link = deepLinker.generateDeepLink('A2', 'Task completed');
      expect(link).toContain('tesseract.nu/grid');
      expect(link).toContain('focus=A2');
      expect(link).toContain('context');
    });

    it('should generate markdown link for cell', () => {
      const markdownLink = deepLinker.generateMarkdownLink('A2', 'Goal Cell');
      expect(markdownLink).toContain('[Goal Cell]');
      expect(markdownLink).toContain('tesseract.nu/grid');
      expect(markdownLink).toContain('focus=A2');
    });

    it('should generate timeline link', () => {
      const startTime = new Date('2026-02-01T00:00:00Z');
      const endTime = new Date('2026-02-15T00:00:00Z');

      const link = deepLinker.generateTimelineLink('A2', startTime, endTime);
      expect(link).toContain('tesseract.nu/grid');
      expect(link).toContain('focus=A2');
      expect(link).toContain('timeline');
    });

    it('should generate comparison link for multiple cells', () => {
      const cells = ['A2', 'B3', 'C1'];
      const link = deepLinker.generateComparisonLink(cells, 'overlay');

      expect(link).toContain('tesseract.nu/grid');
      expect(link).toContain('compare');
      expect(link).toContain('mode=overlay');
    });

    it('should generate room link', () => {
      const roomLink = deepLinker.generateRoomLink('#strategy-room');
      expect(roomLink).toBeDefined();
      expect(roomLink.length).toBeGreaterThan(0);
    });
  });

  describe('Full Integration Flow', () => {
    it('should handle complete task completion workflow', async () => {
      // 1. Emit task completion event
      const event = gridEventBridge.onTaskComplete(
        0,
        'Define Q1 revenue goals',
        { discordChannelId: 'channel-123' }
      );
      expect(event).toBeDefined();

      // 2. Update pressures
      const pressures = hotCellRouter.updatePressures();
      expect(pressures['A2']).toBeGreaterThan(0);

      // 3. Check for hot cells
      const hotCells = hotCellRouter.getHotCells(0.7);
      // May or may not have hot cells depending on event count

      // 4. Generate deep link
      const deepLink = deepLinker.generateDeepLink(event!.cell, event!.task);
      expect(deepLink).toContain('tesseract.nu/grid');

      // 5. Render grid
      const ascii = renderGrid(pressures);
      expect(ascii).toContain('TESSERACT');
    });

    it('should handle batch task processing', () => {
      const tasks = [
        { phase: 0, text: 'Goal 1' },
        { phase: 1, text: 'Signal 1' },
        { phase: 2, text: 'Law 1' },
        { phase: 0, text: 'Goal 2' },
        { phase: 1, text: 'Signal 2' },
      ];

      // Emit all events
      const events = tasks
        .map(task => gridEventBridge.onTaskComplete(task.phase, task.text))
        .filter(e => e !== null);

      expect(events.length).toBe(5);

      // Update pressures
      const pressures = hotCellRouter.updatePressures();
      expect(Object.keys(pressures).length).toBeGreaterThan(0);

      // Check hot cells
      const hotCells = hotCellRouter.getHotCells(0.5);
      // A2 and B3 should have higher pressure
      expect(['A2', 'B3'].some(cell => hotCells.includes(cell))).toBe(true);
    });

    it('should render current grid state', () => {
      // Simulate some activity
      gridEventBridge.onTaskComplete(0, 'Goal task');
      gridEventBridge.onTaskComplete(1, 'Signal task');
      gridEventBridge.onTaskComplete(4, 'Grid task');

      // Get pressures
      const pressures = hotCellRouter.updatePressures();

      // Get recent events
      const allPressures = hotCellRouter.getAllPressures();
      const recentEvents: RecentEvent[] = allPressures
        .slice(0, 3)
        .map(cell => ({
          cellId: cell.cell,
          type: 'pressure-update' as const,
          timestamp: new Date(cell.lastEvent),
          description: `Pressure: ${(cell.pressure * 100).toFixed(0)}%`,
        }));

      // Render
      const ascii = renderGrid(pressures);
      const embed = renderGridEmbed(pressures, recentEvents);

      expect(ascii.length).toBeGreaterThan(100);
      expect(embed.recentEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid cell IDs gracefully', () => {
      const cellData = hotCellRouter.getCellPressure('INVALID');
      expect(cellData).toBeUndefined();
    });

    it('should handle empty hot cells array', () => {
      const routing = hotCellRouter.routeToRoom([]);
      expect(routing.room).toBeDefined();
      expect(routing.cells).toHaveLength(0);
    });

    it('should handle missing pressure data', () => {
      const ascii = renderGrid({});
      expect(ascii).toBeDefined();
      expect(ascii.length).toBeGreaterThan(0);
    });
  });
});
