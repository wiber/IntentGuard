/**
 * progress-tracker.example.ts — Example usage of ProgressTracker
 *
 * Demonstrates all API methods and typical usage patterns
 */

import ProgressTracker from './progress-tracker';

async function main() {
  const tracker = new ProgressTracker();

  console.log('='.repeat(70));
  console.log('PROGRESS TRACKER EXAMPLE');
  console.log('='.repeat(70));
  console.log();

  // 1. Get full progress report
  console.log('1. Full Progress Report:');
  const report = tracker.getProgress();
  console.log(`   Total: ${report.totalDone}/${report.totalDone + report.totalWip + report.totalTodo} tasks (${report.percentComplete}%)`);
  console.log(`   Done: ${report.totalDone}, WIP: ${report.totalWip}, Todo: ${report.totalTodo}`);
  console.log(`   Phases: ${report.phases.length}`);
  console.log();

  // 2. Discord-formatted report
  console.log('2. Discord Format:');
  console.log(tracker.formatForDiscord());
  console.log();

  // 3. Tweet format
  console.log('3. Tweet Format (280 chars):');
  console.log(`   "${tracker.formatForTweet()}"`);
  console.log();

  // 4. Summary (one-line status)
  console.log('4. Summary:');
  console.log(`   ${tracker.getSummary()}`);
  console.log();

  // 5. Next priority tasks
  console.log('5. Next 3 Priority Tasks:');
  const nextTasks = tracker.getNextTodos(3);
  nextTasks.forEach((task, i) => {
    console.log(`   ${i + 1}. [${task.phase}]`);
    console.log(`      ${task.text}`);
  });
  console.log();

  // 6. Specific phase status
  console.log('6. Phase 4 Status:');
  const phase4 = tracker.getPhaseStatus('phase-4');
  if (phase4) {
    console.log(`   ${phase4.name}`);
    console.log(`   Progress: ${phase4.done}/${phase4.total} (${phase4.percent}%)`);
    console.log(`   Done: ${phase4.done}, WIP: ${phase4.wip}, Todo: ${phase4.todo}`);
  }
  console.log();

  // 7. Task completion events
  console.log('7. Grid Events (task completion → POINTER_CREATE):');
  const testCases = [
    { phase: 'Phase 3 — Multi-Channel', task: 'Test task' },
    { phase: 'Phase 4 — Tesseract Grid', task: 'Test task' },
    { phase: 'Phase 6 — Economic Sovereignty', task: 'Test task' },
    { phase: 'Phase 7 — Physical Manifestation', task: 'Test task' },
    { phase: 'Phase 8 — Fractal Federation', task: 'Test task' },
    { phase: 'Phase 9 — Autonomous Night', task: 'Test task' },
  ];

  testCases.forEach(({ phase, task }) => {
    const event = tracker.onTaskComplete(phase, task);
    if (event) {
      console.log(`   ${phase} → ${event.eventType} @ ${event.cell}`);
    }
  });
  console.log();

  // 8. Check if specific task is complete
  console.log('8. Task Completion Check:');
  const testTask = 'Build migration spec HTML (this document)';
  const isComplete = tracker.isTaskComplete(testTask);
  console.log(`   "${testTask}"`);
  console.log(`   Status: ${isComplete ? 'DONE ✓' : 'NOT DONE ✗'}`);
  console.log();

  console.log('='.repeat(70));
  console.log('Example complete!');
  console.log('='.repeat(70));
}

main().catch(console.error);
