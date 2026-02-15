/**
 * progress-tracker.test.ts — Integration tests for ProgressTracker
 *
 * Run with: npx tsx src/progress-tracker.test.ts
 */

import ProgressTracker from './progress-tracker';
import { strict as assert } from 'assert';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    process.exit(1);
  }
}

console.log('Running ProgressTracker Integration Tests...\n');

const tracker = new ProgressTracker();

// Test 1: parseSpec returns array of phases
test('parseSpec() returns PhaseProgress array', () => {
  const phases = tracker.parseSpec();
  assert(Array.isArray(phases));
  assert(phases.length > 0);
  assert(phases[0].id === 'phase-0');
  assert(phases[0].name.includes('Foundation'));
});

// Test 2: getProgress returns valid report
test('getProgress() returns valid ProgressReport', () => {
  const report = tracker.getProgress();
  assert(typeof report.totalDone === 'number');
  assert(typeof report.totalWip === 'number');
  assert(typeof report.totalTodo === 'number');
  assert(typeof report.percentComplete === 'number');
  assert(report.percentComplete >= 0 && report.percentComplete <= 100);
  assert(Array.isArray(report.phases));
});

// Test 3: formatForDiscord returns non-empty string
test('formatForDiscord() returns formatted string', () => {
  const discord = tracker.formatForDiscord();
  assert(typeof discord === 'string');
  assert(discord.length > 0);
  assert(discord.includes('SOVEREIGN ENGINE PROGRESS'));
  assert(discord.includes('```'));
});

// Test 4: formatForTweet returns <=280 chars
test('formatForTweet() returns tweet under 280 chars', () => {
  const tweet = tracker.formatForTweet();
  assert(typeof tweet === 'string');
  assert(tweet.length > 0);
  assert(tweet.length <= 280);
  assert(tweet.includes('Sovereign Engine'));
});

// Test 5: getSummary returns one-line string
test('getSummary() returns summary string', () => {
  const summary = tracker.getSummary();
  assert(typeof summary === 'string');
  assert(summary.length > 0);
  assert(summary.includes('phases complete'));
  assert(summary.includes('tasks'));
  assert(summary.includes('%'));
});

// Test 6: getNextTodos returns priority-ordered tasks
test('getNextTodos() returns priority-ordered TodoItems', () => {
  const todos = tracker.getNextTodos(5);
  assert(Array.isArray(todos));
  assert(todos.length <= 5);

  // Check priority ordering (lower = higher priority)
  for (let i = 1; i < todos.length; i++) {
    assert(todos[i].priority >= todos[i - 1].priority);
  }

  // Check structure
  if (todos.length > 0) {
    const todo = todos[0];
    assert(typeof todo.phase === 'string');
    assert(typeof todo.text === 'string');
    assert(typeof todo.priority === 'number');
  }
});

// Test 7: getPhaseStatus returns correct phase or null
test('getPhaseStatus() returns phase data', () => {
  const phase0 = tracker.getPhaseStatus('phase-0');
  assert(phase0 !== null);
  assert(phase0.id === 'phase-0');
  assert(phase0.name.includes('Foundation'));
  assert(typeof phase0.done === 'number');
  assert(typeof phase0.total === 'number');
  assert(typeof phase0.percent === 'number');

  const invalid = tracker.getPhaseStatus('phase-999');
  assert(invalid === null);
});

// Test 8: onTaskComplete generates correct grid events
test('onTaskComplete() generates grid events correctly', () => {
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
    assert(event !== null);
    assert(event.cell === expected);
    assert(event.eventType === 'POINTER_CREATE');
  });

  // Phases without mapping return null
  const noMapping = tracker.onTaskComplete('Phase 0 — Foundation', 'Test');
  assert(noMapping === null);
});

// Test 9: isTaskComplete checks task status
test('isTaskComplete() checks task status', () => {
  // Known completed task from phase 0
  const completed = tracker.isTaskComplete('Install openclaw@2026.2.13 as npm dependency');
  assert(completed === true);

  // Non-existent or incomplete task
  const incomplete = tracker.isTaskComplete('This task does not exist in the spec');
  assert(incomplete === false);
});

// Test 10: Phase progress percentages are valid
test('Phase progress percentages are calculated correctly', () => {
  const phases = tracker.parseSpec();

  phases.forEach(phase => {
    assert(phase.percent >= 0 && phase.percent <= 100);

    if (phase.total > 0) {
      const expectedPercent = Math.round((phase.done / phase.total) * 100);
      assert(phase.percent === expectedPercent);
    } else {
      assert(phase.percent === 0);
    }
  });
});

// Test 11: Total counts match sum of phases
test('Total counts match sum of phase counts', () => {
  const report = tracker.getProgress();
  const phases = report.phases;

  const sumDone = phases.reduce((sum, p) => sum + p.done, 0);
  const sumWip = phases.reduce((sum, p) => sum + p.wip, 0);
  const sumTodo = phases.reduce((sum, p) => sum + p.todo, 0);

  assert(report.totalDone === sumDone);
  assert(report.totalWip === sumWip);
  assert(report.totalTodo === sumTodo);
});

// Test 12: Custom spec path constructor
test('Constructor accepts custom spec path', () => {
  const customPath = '/Users/thetadriven/github/intentguard/spec/sections/08-implementation-plan.tsx';
  const customTracker = new ProgressTracker(customPath);

  const report = customTracker.getProgress();
  assert(report.phases.length > 0);
});

console.log('\n✓ All tests passed!');
console.log('\nCurrent Progress:');
console.log(tracker.getSummary());
