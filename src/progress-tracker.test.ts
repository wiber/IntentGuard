/**
 * progress-tracker.test.ts — Unit tests for ProgressTracker
 *
 * Run with: npx vitest run src/progress-tracker.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import ProgressTracker from './progress-tracker';

vi.mock('fs');

const MOCK_SPEC = `
export const phases: Phase[] = [
  {
    id: 'phase-3',
    name: 'Phase 3 — Multi-Channel',
    checklist: [
      { text: 'Set up Discord bot', status: 'done' },
      { text: 'Add Telegram adapter', status: 'done' },
      { text: 'Add WhatsApp adapter', status: 'wip' },
      { text: 'Cross-channel routing', status: 'todo' },
    ],
  },
  {
    id: 'phase-4',
    name: 'Phase 4 — Grid Operations',
    checklist: [
      { text: 'Build tesseract client', status: 'done' },
      { text: 'Implement hot-cell routing', status: 'todo' },
      { text: 'Deep linker integration', status: 'todo' },
    ],
  },
];
`;

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    vi.mocked(fs.readFileSync).mockReturnValue(MOCK_SPEC);
    tracker = new ProgressTracker('/fake/spec.tsx');
  });

  describe('parseSpec', () => {
    it('extracts phases with correct counts', () => {
      const phases = tracker.parseSpec();
      expect(phases).toHaveLength(2);

      expect(phases[0]).toEqual({
        id: 'phase-3',
        name: 'Phase 3 — Multi-Channel',
        done: 2,
        wip: 1,
        todo: 1,
        total: 4,
        percent: 50,
      });

      expect(phases[1]).toEqual({
        id: 'phase-4',
        name: 'Phase 4 — Grid Operations',
        done: 1,
        wip: 0,
        todo: 2,
        total: 3,
        percent: 33,
      });
    });

    it('throws if phases array not found', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('no phases here');
      expect(() => tracker.parseSpec()).toThrow('Could not find phases array');
    });
  });

  describe('getProgress', () => {
    it('aggregates totals across phases', () => {
      const report = tracker.getProgress();
      expect(report.totalDone).toBe(3);
      expect(report.totalWip).toBe(1);
      expect(report.totalTodo).toBe(3);
      expect(report.percentComplete).toBe(43);
    });

    it('total counts match sum of phase counts', () => {
      const report = tracker.getProgress();
      const sumDone = report.phases.reduce((s, p) => s + p.done, 0);
      const sumWip = report.phases.reduce((s, p) => s + p.wip, 0);
      const sumTodo = report.phases.reduce((s, p) => s + p.todo, 0);
      expect(report.totalDone).toBe(sumDone);
      expect(report.totalWip).toBe(sumWip);
      expect(report.totalTodo).toBe(sumTodo);
    });
  });

  describe('formatForDiscord', () => {
    it('returns a code block with header and totals', () => {
      const output = tracker.formatForDiscord();
      expect(output).toContain('```');
      expect(output).toContain('SOVEREIGN ENGINE PROGRESS');
      expect(output).toContain('Multi-Channel');
      expect(output).toContain('Grid Operations');
      expect(output).toContain('TOTAL');
    });
  });

  describe('formatForTweet', () => {
    it('returns a string under 280 chars with stats', () => {
      const tweet = tracker.formatForTweet();
      expect(tweet.length).toBeLessThanOrEqual(280);
      expect(tweet).toContain('Sovereign Engine');
      expect(tweet).toContain('3/7');
    });

    it('handles no active phases', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(`
export const phases: Phase[] = [
  {
    id: 'phase-1',
    name: 'Phase 1 — Empty',
    checklist: [],
  },
];
`);
      const tweet = tracker.formatForTweet();
      expect(tweet).toContain('No active phases yet');
    });
  });

  describe('getNextTodos', () => {
    it('returns WIP items before TODO items', () => {
      const todos = tracker.getNextTodos(5);
      // 1 wip + 1 todo from phase-3, 2 todo from phase-4 = 4
      expect(todos).toHaveLength(4);
      // WIP from phase-3 should come first
      expect(todos[0].text).toBe('Add WhatsApp adapter');
      // Then TODO from same phase before later phases
      expect(todos[1].text).toBe('Cross-channel routing');
    });

    it('respects count limit', () => {
      expect(tracker.getNextTodos(1)).toHaveLength(1);
    });

    it('returns empty when no phases found', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('nothing');
      expect(tracker.getNextTodos(5)).toEqual([]);
    });
  });

  describe('onTaskComplete', () => {
    it('maps phase-3 to B1:Tactics.Speed', () => {
      const event = tracker.onTaskComplete('Phase 3 — Multi-Channel', 'task');
      expect(event).toEqual({ cell: 'B1:Tactics.Speed', eventType: 'POINTER_CREATE' });
    });

    it('maps phase-4 to C1:Operations.Grid', () => {
      const event = tracker.onTaskComplete('Phase 4 — Grid', 'task');
      expect(event).toEqual({ cell: 'C1:Operations.Grid', eventType: 'POINTER_CREATE' });
    });

    it('returns null for unmapped phases', () => {
      expect(tracker.onTaskComplete('Phase 1 — Setup', 'task')).toBeNull();
    });

    it('returns null for invalid format', () => {
      expect(tracker.onTaskComplete('invalid', 'task')).toBeNull();
    });
  });

  describe('getPhaseStatus', () => {
    it('returns matching phase', () => {
      const phase = tracker.getPhaseStatus('phase-3');
      expect(phase).not.toBeNull();
      expect(phase!.name).toBe('Phase 3 — Multi-Channel');
    });

    it('returns null for unknown phase', () => {
      expect(tracker.getPhaseStatus('phase-99')).toBeNull();
    });
  });

  describe('getSummary', () => {
    it('returns one-liner with stats', () => {
      const summary = tracker.getSummary();
      expect(summary).toContain('0/2 phases complete');
      expect(summary).toContain('3/7 tasks');
      expect(summary).toContain('43% done');
    });
  });

  describe('isTaskComplete', () => {
    it('returns true for done tasks', () => {
      expect(tracker.isTaskComplete('Set up Discord bot')).toBe(true);
    });

    it('returns false for non-done tasks', () => {
      expect(tracker.isTaskComplete('Add WhatsApp adapter')).toBe(false);
    });

    it('returns false for nonexistent tasks', () => {
      expect(tracker.isTaskComplete('does not exist')).toBe(false);
    });
  });

  describe('percentage calculation', () => {
    it('rounds correctly', () => {
      const phases = tracker.parseSpec();
      phases.forEach(phase => {
        if (phase.total > 0) {
          expect(phase.percent).toBe(Math.round((phase.done / phase.total) * 100));
        } else {
          expect(phase.percent).toBe(0);
        }
      });
    });
  });
});
