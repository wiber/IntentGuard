/**
 * event-bridge.test.ts — Comprehensive tests for GridEventBridge
 *
 * Tests:
 * - Event emission on task completion
 * - Phase-to-cell mapping
 * - JSONL persistence
 * - Batch operations
 * - Custom event creation
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { GridEventBridge, type GridEvent } from './event-bridge.js';

const TEST_DATA_DIR = join(process.cwd(), 'data', 'test-grid-events');
const TEST_EVENTS_PATH = join(TEST_DATA_DIR, 'grid-events.jsonl');

describe('GridEventBridge', () => {
  let bridge: GridEventBridge;

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
    mkdirSync(TEST_DATA_DIR, { recursive: true });
    bridge = new GridEventBridge(TEST_DATA_DIR);
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  describe('constructor', () => {
    it('should create data directory if it does not exist', () => {
      expect(existsSync(TEST_DATA_DIR)).toBe(true);
    });

    it('should set correct events path', () => {
      expect(bridge.getEventsPath()).toBe(TEST_EVENTS_PATH);
    });
  });

  describe('onTaskComplete', () => {
    it('should emit POINTER_CREATE event for valid phase', () => {
      const event = bridge.onTaskComplete(0, 'Define Q1 goals');

      expect(event).not.toBeNull();
      expect(event?.type).toBe('POINTER_CREATE');
      expect(event?.cell).toBe('A2'); // Phase 0 → A2:Goal
      expect(event?.phase).toBe(0);
      expect(event?.task).toBe('Define Q1 goals');
      expect(event?.intersection).toBe('TASK:A2:Goal');
    });

    it('should map all valid phases to correct cells', () => {
      const phaseMapping = [
        { phase: 0, cell: 'A2', name: 'Goal' },
        { phase: 1, cell: 'B3', name: 'Signal' },
        { phase: 2, cell: 'A1', name: 'Law' },
        { phase: 3, cell: 'B1', name: 'Speed' },
        { phase: 4, cell: 'C1', name: 'Grid' },
        { phase: 6, cell: 'A3', name: 'Fund' },
        { phase: 7, cell: 'C3', name: 'Flow' },
        { phase: 8, cell: 'B2', name: 'Deal' },
        { phase: 9, cell: 'C2', name: 'Loop' },
      ];

      for (const { phase, cell, name } of phaseMapping) {
        const event = bridge.onTaskComplete(phase, `Test task ${phase}`);
        expect(event?.cell).toBe(cell);
        expect(event?.intersection).toBe(`TASK:${cell}:${name}`);
      }
    });

    it('should return null for invalid phase', () => {
      const event = bridge.onTaskComplete(99, 'Invalid phase task');
      expect(event).toBeNull();
    });

    it('should include metadata when provided', () => {
      const metadata = {
        userId: 'user-123',
        channelId: 'channel-456',
        priority: 'high',
      };
      const event = bridge.onTaskComplete(0, 'Task with metadata', metadata);

      expect(event?.metadata).toEqual(metadata);
    });

    it('should generate valid ISO timestamp', () => {
      const event = bridge.onTaskComplete(0, 'Timestamp test');
      expect(event?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should persist event to JSONL file', () => {
      bridge.onTaskComplete(0, 'Persisted task');

      expect(existsSync(TEST_EVENTS_PATH)).toBe(true);
      const content = readFileSync(TEST_EVENTS_PATH, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(1);

      const parsedEvent = JSON.parse(lines[0]);
      expect(parsedEvent.task).toBe('Persisted task');
      expect(parsedEvent.type).toBe('POINTER_CREATE');
    });

    it('should append multiple events to same file', () => {
      bridge.onTaskComplete(0, 'Task 1');
      bridge.onTaskComplete(1, 'Task 2');
      bridge.onTaskComplete(2, 'Task 3');

      const content = readFileSync(TEST_EVENTS_PATH, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(3);

      const tasks = lines.map(line => JSON.parse(line).task);
      expect(tasks).toEqual(['Task 1', 'Task 2', 'Task 3']);
    });
  });

  describe('createEvent', () => {
    it('should create custom POINTER_CREATE event', () => {
      const event = bridge.createEvent('POINTER_CREATE', 'A1', 2, 'Custom task');

      expect(event.type).toBe('POINTER_CREATE');
      expect(event.cell).toBe('A1');
      expect(event.phase).toBe(2);
      expect(event.task).toBe('Custom task');
      expect(event.intersection).toBe('CUSTOM:A1:Law');
    });

    it('should create PRESSURE_UPDATE event', () => {
      const event = bridge.createEvent('PRESSURE_UPDATE', 'B2', 8, 'Pressure spike');

      expect(event.type).toBe('PRESSURE_UPDATE');
      expect(event.intersection).toContain('CUSTOM:B2:Deal');
    });

    it('should create CELL_ACTIVATE event', () => {
      const event = bridge.createEvent('CELL_ACTIVATE', 'C3', 7, 'Cell activation');

      expect(event.type).toBe('CELL_ACTIVATE');
      expect(event.intersection).toContain('CUSTOM:C3:Flow');
    });

    it('should handle unknown cell gracefully', () => {
      const event = bridge.createEvent('POINTER_CREATE', 'Z9', 0, 'Unknown cell');
      expect(event.intersection).toContain('Unknown');
    });

    it('should persist custom events to JSONL', () => {
      bridge.createEvent('PRESSURE_UPDATE', 'A2', 0, 'Custom event');

      const content = readFileSync(TEST_EVENTS_PATH, 'utf-8');
      const parsedEvent = JSON.parse(content.trim());
      expect(parsedEvent.type).toBe('PRESSURE_UPDATE');
      expect(parsedEvent.task).toBe('Custom event');
    });
  });

  describe('emitBatch', () => {
    it('should emit multiple events in a single batch', () => {
      const events: GridEvent[] = [
        {
          timestamp: new Date().toISOString(),
          type: 'POINTER_CREATE',
          cell: 'A1',
          phase: 2,
          task: 'Batch task 1',
          intersection: 'TASK:A1:Law',
        },
        {
          timestamp: new Date().toISOString(),
          type: 'POINTER_CREATE',
          cell: 'B1',
          phase: 3,
          task: 'Batch task 2',
          intersection: 'TASK:B1:Speed',
        },
        {
          timestamp: new Date().toISOString(),
          type: 'PRESSURE_UPDATE',
          cell: 'C1',
          phase: 4,
          task: 'Batch task 3',
          intersection: 'TASK:C1:Grid',
        },
      ];

      bridge.emitBatch(events);

      const content = readFileSync(TEST_EVENTS_PATH, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(3);

      const parsedEvents = lines.map(line => JSON.parse(line));
      expect(parsedEvents[0].task).toBe('Batch task 1');
      expect(parsedEvents[1].task).toBe('Batch task 2');
      expect(parsedEvents[2].task).toBe('Batch task 3');
    });

    it('should handle empty batch', () => {
      bridge.emitBatch([]);
      expect(existsSync(TEST_EVENTS_PATH)).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid sequential task completions', () => {
      const tasks = [
        { phase: 0, text: 'Goal setting' },
        { phase: 1, text: 'Signal detection' },
        { phase: 2, text: 'Legal compliance' },
        { phase: 3, text: 'Speed optimization' },
        { phase: 4, text: 'Grid operations' },
      ];

      for (const task of tasks) {
        bridge.onTaskComplete(task.phase, task.text);
      }

      const content = readFileSync(TEST_EVENTS_PATH, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(5);
    });

    it('should maintain event ordering', () => {
      const startTime = Date.now();
      bridge.onTaskComplete(0, 'First');
      bridge.onTaskComplete(1, 'Second');
      bridge.onTaskComplete(2, 'Third');

      const content = readFileSync(TEST_EVENTS_PATH, 'utf-8');
      const lines = content.trim().split('\n');
      const events = lines.map(line => JSON.parse(line));

      expect(events[0].task).toBe('First');
      expect(events[1].task).toBe('Second');
      expect(events[2].task).toBe('Third');

      // Verify timestamps are in order
      const timestamps = events.map(e => new Date(e.timestamp).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it('should support mixed event types in same file', () => {
      bridge.onTaskComplete(0, 'Task completion');
      bridge.createEvent('PRESSURE_UPDATE', 'A2', 0, 'Pressure update');
      bridge.createEvent('CELL_ACTIVATE', 'B3', 1, 'Cell activation');

      const content = readFileSync(TEST_EVENTS_PATH, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(3);

      const types = lines.map(line => JSON.parse(line).type);
      expect(types).toEqual(['POINTER_CREATE', 'PRESSURE_UPDATE', 'CELL_ACTIVATE']);
    });

    it('should handle metadata-rich events', () => {
      const richMetadata = {
        userId: 'user-123',
        channelId: 'channel-456',
        messageId: 'message-789',
        priority: 'high',
        tags: ['urgent', 'production'],
        estimatedDurationMs: 5000,
        dependencies: ['task-001', 'task-002'],
      };

      bridge.onTaskComplete(0, 'Complex task', richMetadata);

      const content = readFileSync(TEST_EVENTS_PATH, 'utf-8');
      const event = JSON.parse(content.trim());
      expect(event.metadata).toEqual(richMetadata);
    });
  });

  describe('error handling', () => {
    it('should handle file write errors gracefully', () => {
      // Create a bridge with invalid path (read-only)
      const readOnlyBridge = new GridEventBridge('/invalid/readonly/path');

      // Should not throw
      expect(() => {
        readOnlyBridge.onTaskComplete(0, 'Test task');
      }).not.toThrow();
    });

    it('should handle invalid JSON in metadata', () => {
      const circularRef: any = { a: 1 };
      circularRef.self = circularRef;

      // Should not throw (JSON.stringify will handle circular refs)
      expect(() => {
        bridge.onTaskComplete(0, 'Circular metadata test', circularRef);
      }).not.toThrow();
    });
  });

  describe('performance', () => {
    it('should handle 1000 events efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const phase = [0, 1, 2, 3, 4, 6, 7, 8, 9][i % 9];
        bridge.onTaskComplete(phase, `Task ${i}`);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

      const content = readFileSync(TEST_EVENTS_PATH, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(1000);
    });

    it('should handle large batch emissions', () => {
      const events: GridEvent[] = [];
      for (let i = 0; i < 500; i++) {
        events.push({
          timestamp: new Date().toISOString(),
          type: 'POINTER_CREATE',
          cell: 'A2',
          phase: 0,
          task: `Batch task ${i}`,
          intersection: 'TASK:A2:Goal',
        });
      }

      const startTime = Date.now();
      bridge.emitBatch(events);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);

      const content = readFileSync(TEST_EVENTS_PATH, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(500);
    });
  });
});
