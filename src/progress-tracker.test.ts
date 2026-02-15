/**
 * progress-tracker.test.ts — Integration tests for ProgressTracker
 *
 * Run with: npx vitest run src/progress-tracker.test.ts
 */

import { describe, it, expect } from 'vitest';
import ProgressTracker from './progress-tracker';

describe('ProgressTracker', () => {
  const tracker = new ProgressTracker();

  it('parseSpec() returns PhaseProgress array', () => {
    const phases = tracker.parseSpec();
    expect(Array.isArray(phases)).toBe(true);
    expect(phases.length).toBeGreaterThan(0);
    expect(phases[0].id).toBe('phase-0');
    expect(phases[0].name).toContain('Foundation');
  });

  it('getProgress() returns valid ProgressReport', () => {
    const report = tracker.getProgress();
    expect(typeof report.totalDone).toBe('number');
    expect(typeof report.totalWip).toBe('number');
    expect(typeof report.totalTodo).toBe('number');
    expect(typeof report.percentComplete).toBe('number');
    expect(report.percentComplete).toBeGreaterThanOrEqual(0);
    expect(report.percentComplete).toBeLessThanOrEqual(100);
    expect(Array.isArray(report.phases)).toBe(true);
  });

  it('formatForDiscord() returns formatted string', () => {
    const discord = tracker.formatForDiscord();
    expect(typeof discord).toBe('string');
    expect(discord.length).toBeGreaterThan(0);
    expect(discord).toContain('SOVEREIGN ENGINE PROGRESS');
    expect(discord).toContain('```');
  });

  it('formatForTweet() returns tweet under 280 chars', () => {
    const tweet = tracker.formatForTweet();
    expect(typeof tweet).toBe('string');
    expect(tweet.length).toBeGreaterThan(0);
    expect(tweet.length).toBeLessThanOrEqual(280);
    expect(tweet).toContain('Sovereign Engine');
  });

  it('getSummary() returns summary string', () => {
    const summary = tracker.getSummary();
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain('phases complete');
    expect(summary).toContain('tasks');
    expect(summary).toContain('%');
  });

  it('getNextTodos() returns priority-ordered TodoItems', () => {
    const todos = tracker.getNextTodos(5);
    expect(Array.isArray(todos)).toBe(true);
    expect(todos.length).toBeLessThanOrEqual(5);

    // Check priority ordering (lower = higher priority)
    for (let i = 1; i < todos.length; i++) {
      expect(todos[i].priority).toBeGreaterThanOrEqual(todos[i - 1].priority);
    }

    // Check structure
    if (todos.length > 0) {
      const todo = todos[0];
      expect(typeof todo.phase).toBe('string');
      expect(typeof todo.text).toBe('string');
      expect(typeof todo.priority).toBe('number');
    }
  });

  it('getPhaseStatus() returns phase data', () => {
    const phase0 = tracker.getPhaseStatus('phase-0');
    expect(phase0).not.toBeNull();
    expect(phase0!.id).toBe('phase-0');
    expect(phase0!.name).toContain('Foundation');
    expect(typeof phase0!.done).toBe('number');
    expect(typeof phase0!.total).toBe('number');
    expect(typeof phase0!.percent).toBe('number');

    const invalid = tracker.getPhaseStatus('phase-999');
    expect(invalid).toBeNull();
  });

  it('onTaskComplete() generates grid events correctly', () => {
    const testCases = [
      { phase: 'Phase 3 — Multi-Channel', expected: 'B1:Tactics.Speed' },
      { phase: 'Phase 4 — Tesseract Grid', expected: 'C1:Operations.Grid' },
      { phase: 'Phase 6 — Economic Sovereignty', expected: 'A3:Strategy.Fund' },
      { phase: 'Phase 7 — Physical Manifestation', expected: 'C3:Operations.Flow' },
      { phase: 'Phase 8 — Fractal Federation', expected: 'B2:Tactics.Deal' },
      { phase: 'Phase 9 — Autonomous Night', expected: 'C2:Operations.Loop' },
    ];

    testCases.forEach(({ phase, expected }) => {
      const event = tracker.onTaskComplete(phase, 'Test task');
      expect(event).not.toBeNull();
      expect(event!.cell).toBe(expected);
      expect(event!.eventType).toBe('POINTER_CREATE');
    });

    // Phases without mapping return null
    const noMapping = tracker.onTaskComplete('Phase 0 — Foundation', 'Test');
    expect(noMapping).toBeNull();
  });

  it('isTaskComplete() checks task status', () => {
    // Known completed task from phase 0
    const completed = tracker.isTaskComplete('Install openclaw@2026.2.13 as npm dependency');
    expect(completed).toBe(true);

    // Non-existent or incomplete task
    const incomplete = tracker.isTaskComplete('This task does not exist in the spec');
    expect(incomplete).toBe(false);
  });

  it('Phase progress percentages are calculated correctly', () => {
    const phases = tracker.parseSpec();

    phases.forEach(phase => {
      expect(phase.percent).toBeGreaterThanOrEqual(0);
      expect(phase.percent).toBeLessThanOrEqual(100);

      if (phase.total > 0) {
        const expectedPercent = Math.round((phase.done / phase.total) * 100);
        expect(phase.percent).toBe(expectedPercent);
      } else {
        expect(phase.percent).toBe(0);
      }
    });
  });

  it('Total counts match sum of phase counts', () => {
    const report = tracker.getProgress();
    const phases = report.phases;

    const sumDone = phases.reduce((sum, p) => sum + p.done, 0);
    const sumWip = phases.reduce((sum, p) => sum + p.wip, 0);
    const sumTodo = phases.reduce((sum, p) => sum + p.todo, 0);

    expect(report.totalDone).toBe(sumDone);
    expect(report.totalWip).toBe(sumWip);
    expect(report.totalTodo).toBe(sumTodo);
  });

  it('Constructor accepts custom spec path', () => {
    const customPath = '/Users/thetadriven/github/intentguard/spec/sections/08-implementation-plan.tsx';
    const customTracker = new ProgressTracker(customPath);

    const report = customTracker.getProgress();
    expect(report.phases.length).toBeGreaterThan(0);
  });
});
