# ProgressTracker — Sovereign Engine Progress Analytics

Reads `spec/sections/08-implementation-plan.tsx` and provides comprehensive progress tracking, reporting, and grid event generation.

## Features

1. **Parse Implementation Spec** — Extracts phases and checklists from TypeScript source
2. **Progress Metrics** — Per-phase and total completion statistics
3. **Multi-format Reports** — Discord ASCII tables, tweets, summaries
4. **Priority Queue** — Get next highest-priority unfinished tasks
5. **Grid Event Wire** — Maps task completions to tesseract.nu POINTER_CREATE events
6. **Task Status** — Check completion status of specific tasks

## Installation

```bash
npm install
```

## CLI Usage

### Full Progress Report (Discord Format)

```bash
npx tsx src/progress-tracker.ts report
```

Output:
```
SOVEREIGN ENGINE PROGRESS
======================================================================

Phase                                Done   WIP  Todo  Total     %
----------------------------------------------------------------------
Foundation                             10     0     0     10  100%
Discord + Rooms                        26     0     0     26  100%
...
----------------------------------------------------------------------
TOTAL                                  87     0    31    118   74%
```

### Tweet Format (280 chars)

```bash
npx tsx src/progress-tracker.ts tweet
```

Output:
```
Sovereign Engine: 87/118 tasks done (74%). Foundation: 100%, Open: 0%. 0 in progress, 31 queued.
```

### Summary (One-line Status)

```bash
npx tsx src/progress-tracker.ts summary
```

Output:
```
3/10 phases complete | 87/118 tasks | 74% done
```

### Next Priority Tasks

```bash
npx tsx src/progress-tracker.ts next 5
```

Output:
```
Next 5 priority tasks:

1. [Phase 3 — Multi-Channel + X Publishing] Add Claude Flow agent pool (50 concurrent) for task subdivision
2. [Phase 3 — Multi-Channel + X Publishing] Test cross-channel room routing
...
```

### Phase Status

```bash
npx tsx src/progress-tracker.ts phase phase-4
```

Output:
```json
{
  "id": "phase-4",
  "name": "Phase 4 — Tesseract Grid Integration (Reality Bridge)",
  "done": 5,
  "wip": 0,
  "todo": 5,
  "total": 10,
  "percent": 50
}
```

### Grid Event Generation

```bash
npx tsx src/progress-tracker.ts event "Phase 3 — Multi-Channel" "Add Claude Flow agent pool"
```

Output:
```
POINTER_CREATE → B1:Tactics.Speed
```

## Programmatic API

### Basic Usage

```typescript
import ProgressTracker from './progress-tracker';

const tracker = new ProgressTracker();

// Get full progress report
const report = tracker.getProgress();
console.log(`Total: ${report.percentComplete}% complete`);
console.log(`Done: ${report.totalDone}, WIP: ${report.totalWip}, Todo: ${report.totalTodo}`);

// Per-phase breakdown
report.phases.forEach(phase => {
  console.log(`${phase.name}: ${phase.percent}%`);
});
```

### Format Reports

```typescript
// Discord ASCII table
const discordReport = tracker.formatForDiscord();

// 280-char tweet
const tweet = tracker.formatForTweet();

// One-line summary
const summary = tracker.getSummary();
```

### Priority Tasks

```typescript
// Get next 5 highest-priority tasks
const nextTasks = tracker.getNextTodos(5);

nextTasks.forEach(task => {
  console.log(`[${task.phase}] ${task.text}`);
  console.log(`Priority: ${task.priority}`);
});
```

Priority rules:
- Earlier phases = higher priority
- `wip` status > `todo` status
- Lower priority number = higher urgency

### Grid Event Generation

```typescript
// Wire task completion to tesseract.nu grid
const event = tracker.onTaskComplete(
  'Phase 3 — Multi-Channel + X Publishing',
  'Add Claude Flow agent pool'
);

if (event) {
  console.log(`Send ${event.eventType} to ${event.cell}`);
  // → Send POINTER_CREATE to B1:Tactics.Speed
}
```

Phase to Grid Cell Mapping:
- Phase 3 → B1:Tactics.Speed
- Phase 4 → C1:Operations.Grid
- Phase 6 → A3:Strategy.Fund
- Phase 7 → C3:Operations.Flow
- Phase 8 → B2:Tactics.Deal
- Phase 9 → C2:Operations.Loop

### Phase Status

```typescript
// Get status of specific phase
const phase4 = tracker.getPhaseStatus('phase-4');

if (phase4) {
  console.log(`${phase4.name}: ${phase4.percent}% complete`);
  console.log(`${phase4.done}/${phase4.total} tasks done`);
}
```

### Task Completion Check

```typescript
// Check if specific task is complete
const isComplete = tracker.isTaskComplete('Build migration spec HTML (this document)');
console.log(isComplete ? 'DONE ✓' : 'NOT DONE ✗');
```

## Data Types

### PhaseProgress

```typescript
interface PhaseProgress {
  id: string;           // 'phase-0', 'phase-1', etc.
  name: string;         // 'Phase 0 — Foundation', etc.
  done: number;         // Count of completed tasks
  wip: number;          // Count of work-in-progress tasks
  todo: number;         // Count of todo tasks
  total: number;        // Total tasks in phase
  percent: number;      // Completion percentage (0-100)
}
```

### ProgressReport

```typescript
interface ProgressReport {
  phases: PhaseProgress[];    // Per-phase breakdown
  totalDone: number;           // Total completed tasks across all phases
  totalWip: number;            // Total WIP tasks
  totalTodo: number;           // Total todo tasks
  percentComplete: number;     // Overall completion percentage
}
```

### TodoItem

```typescript
interface TodoItem {
  phase: string;      // Full phase name
  text: string;       // Task description
  priority: number;   // Priority score (lower = higher priority)
}
```

### PointerEvent

```typescript
interface PointerEvent {
  cell: string;       // Grid cell (e.g., 'B1:Tactics.Speed')
  eventType: string;  // Always 'POINTER_CREATE'
}
```

## Integration Examples

### Discord Bot Integration

```typescript
import ProgressTracker from './progress-tracker';

// In your Discord command handler
if (message.content === '!progress') {
  const tracker = new ProgressTracker();
  const report = tracker.formatForDiscord();
  await message.channel.send(report);
}

if (message.content === '!next') {
  const tracker = new ProgressTracker();
  const nextTasks = tracker.getNextTodos(5);

  const response = nextTasks.map((task, i) =>
    `${i + 1}. **${task.phase}**\n   ${task.text}`
  ).join('\n\n');

  await message.channel.send(response);
}
```

### CEO Loop Integration

```typescript
import ProgressTracker from './progress-tracker';

async function ceoLoop() {
  const tracker = new ProgressTracker();

  while (true) {
    // Get next priority task
    const [nextTask] = tracker.getNextTodos(1);

    if (!nextTask) {
      console.log('All tasks complete!');
      break;
    }

    console.log(`Working on: ${nextTask.text}`);

    // Execute task...
    await executeTask(nextTask);

    // Generate grid event
    const event = tracker.onTaskComplete(nextTask.phase, nextTask.text);
    if (event) {
      await sendToTesseractGrid(event);
    }

    // Post progress update
    const summary = tracker.getSummary();
    await postToDiscord(`Progress: ${summary}`);
  }
}
```

### Nightly Summary Tweet

```typescript
import ProgressTracker from './progress-tracker';

async function nightlySummary() {
  const tracker = new ProgressTracker();

  // Generate tweet
  const tweet = tracker.formatForTweet();

  // Post to X/Twitter
  await postTweet(tweet);

  // Also post to Discord
  await postToDiscord(tweet);
}

// Run every night at midnight
schedule.scheduleJob('0 0 * * *', nightlySummary);
```

## Custom Spec Path

```typescript
// Use custom spec location
const tracker = new ProgressTracker('/path/to/custom/spec.tsx');
```

## Error Handling

```typescript
try {
  const tracker = new ProgressTracker();
  const report = tracker.getProgress();
  // ... use report
} catch (error) {
  if (error.message.includes('Could not find phases array')) {
    console.error('Spec file format invalid');
  } else if (error.code === 'ENOENT') {
    console.error('Spec file not found');
  } else {
    throw error;
  }
}
```

## Testing

Run the example file to verify all functionality:

```bash
npx tsx src/progress-tracker.example.ts
```

## Implementation Notes

- **Parser**: Uses regex to parse TypeScript object literals from `.tsx` files
- **Status Types**: Recognizes `'done'`, `'wip'`, `'todo'` status values
- **Grid Mapping**: Only phases 3, 4, 6, 7, 8, 9 map to grid cells (per ShortRank)
- **Priority Algorithm**: `priority = phaseIndex * 1000 + (status === 'wip' ? 0 : 500)`
- **Thread-safe**: All methods are synchronous and stateless (file reads on each call)

## License

MIT
