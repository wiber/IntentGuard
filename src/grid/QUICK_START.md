# Tesseract Grid Event System - Quick Start

## Installation

No external dependencies required! Just import and use:

```typescript
import {
  gridEventBridge,
  hotCellRouter,
  deepLinker,
} from './src/grid';
```

## 🚀 Basic Usage

### 1. Wire Task Completion to Grid

```typescript
// When a task completes
const event = gridEventBridge.onTaskComplete(
  0, // Phase number (0-9)
  'Define Q1 revenue goals'
);

// Event is emitted and stored in data/grid-events.jsonl
console.log(event.cell); // 'A2'
console.log(event.intersection); // 'TASK:A2:Goal'
```

### 2. Calculate Hot Cell Pressures

```typescript
// Update pressures from recent events
const pressures = hotCellRouter.updatePressures();
// { A2: 0.85, B3: 0.72, C1: 0.45, ... }

// Get cells above threshold (default 0.7)
const hotCells = hotCellRouter.getHotCells();
// ['A2', 'B3']

// Get routing recommendation
const routing = hotCellRouter.routeToRoom(hotCells);
console.log(routing.room); // '#strategy-room'
console.log(routing.reason); // 'Highest pressure: A2 (0.85)'
```

### 3. Generate Deep Links

```typescript
// Basic cell link
const url = deepLinker.generateDeepLink('A2', 'Planning session');
// https://tesseract.nu/grid?focus=A2&context=Planning%20session

// Markdown link for Discord/Slack
const mdLink = deepLinker.generateMarkdownLink('A2', 'Strategy Goal');
// [Strategy Goal](https://tesseract.nu/grid?focus=A2)

// Discord message link
const discordUrl = deepLinker.generateDiscordLink('A2', messageId, channelId);
// https://discord.com/channels/guild/channel/message
```

## 📊 Phase-to-Cell Mapping

| Phase | Cell | Name   | Room            |
|-------|------|--------|-----------------|
| 0     | A2   | Goal   | #strategy-room  |
| 1     | B3   | Signal | #signal-room    |
| 2     | A1   | Law    | #legal-room     |
| 3     | B1   | Speed  | #speed-room     |
| 4     | C1   | Grid   | #ops-room       |
| 6     | A3   | Fund   | #finance-room   |
| 7     | C3   | Flow   | #flow-room      |
| 8     | B2   | Deal   | #deals-room     |
| 9     | C2   | Loop   | #loop-room      |

## 🔥 Hot Cell Detection

Pressure is calculated based on event frequency:
- **Last hour**: 1.0 weight
- **Last 6 hours**: 0.5 weight
- **Last 24 hours**: 0.2 weight

Thresholds:
- **Hot** (>0.7): Critical attention needed
- **Warm** (0.3-0.7): Elevated activity
- **Cold** (<0.3): Normal operations

## 📦 Complete Workflow Example

```typescript
import { gridEventBridge, hotCellRouter, deepLinker } from './src/grid';

async function handleTaskComplete(phase: number, taskText: string) {
  // 1. Emit grid event
  const event = gridEventBridge.onTaskComplete(phase, taskText);

  // 2. Update pressures
  hotCellRouter.updatePressures();

  // 3. Check for hot cells
  const hotCells = hotCellRouter.getHotCells(0.7);

  if (hotCells.length > 0) {
    // 4. Get routing recommendation
    const routing = hotCellRouter.routeToRoom(hotCells);

    // 5. Generate deep link
    const link = deepLinker.generateDeepLink(event.cell, taskText);

    // 6. Send notification
    console.log(`🔥 Hot cell detected: ${event.cell}`);
    console.log(`📍 Route to: ${routing.room}`);
    console.log(`🔗 View: ${link}`);
  }

  return event;
}

// Usage
await handleTaskComplete(0, 'Define quarterly goals');
```

## 🎯 Discord Bot Integration

```typescript
import { gridEventBridge, hotCellRouter, deepLinker } from './src/grid';

// On task completion command
client.on('taskComplete', async (interaction) => {
  const phase = interaction.options.getInteger('phase');
  const task = interaction.options.getString('task');

  // Emit event
  const event = gridEventBridge.onTaskComplete(phase, task);

  // Get routing
  const routing = hotCellRouter.routeToRoom();

  // Generate link
  const link = deepLinker.generateDeepLink(event.cell, task);

  // Reply
  await interaction.reply({
    content: `Task completed: ${task}`,
    embeds: [{
      title: `Grid Event: ${event.cell}`,
      description: `Routed to ${routing.room}`,
      url: link,
    }],
  });
});
```

## 📂 Data Storage

Events are stored in `data/grid-events.jsonl`:

```jsonl
{"timestamp":"2026-02-14T20:00:00.000Z","type":"POINTER_CREATE","cell":"A2","phase":0,"task":"Define goals","intersection":"TASK:A2:Goal"}
```

Location: `/Users/thetadriven/github/intentguard/data/grid-events.jsonl`

## 🔧 Advanced Usage

### Custom Event Types

```typescript
// Create custom event
gridEventBridge.createEvent(
  'PRESSURE_UPDATE',
  'A2',
  0,
  'Manual pressure update',
  { source: 'admin' }
);

// Batch emit events
const events = [event1, event2, event3];
gridEventBridge.emitBatch(events);
```

### Pressure Analysis

```typescript
// Get all pressures sorted
const allPressures = hotCellRouter.getAllPressures();

// Get specific cell
const cellData = hotCellRouter.getCellPressure('A2');
console.log(cellData.pressure); // 0.85
console.log(cellData.eventCount); // 12
console.log(cellData.lastEvent); // '2026-02-14T20:00:00.000Z'

// Get summary report
const summary = hotCellRouter.getSummary();
console.log(summary);
```

### Advanced Deep Links

```typescript
// Multi-cell comparison
const compareUrl = deepLinker.generateComparisonLink(
  ['A2', 'B3', 'C2'],
  'overlay'
);

// Room-focused view
const roomUrl = deepLinker.generateRoomLink('#strategy-room', 'A2');

// Timeline view
const timelineUrl = deepLinker.generateTimelineLink(
  'A2',
  new Date('2026-02-14'),
  new Date()
);

// Parse existing link
const parsed = deepLinker.parseDeepLink(url);
console.log(parsed.cell); // 'A2'
console.log(parsed.context); // 'Planning session'
```

## 🧪 Testing

Run examples:

```bash
# Event system examples
npx ts-node src/grid/event-system-examples.ts

# Integration examples
npx ts-node src/grid/integration-example.ts
```

## 📝 Notes

- **No external dependencies** - Pure TypeScript/Node.js
- **JSONL storage** - Events persist across restarts
- **Time-weighted scoring** - Recent events have higher impact
- **Singleton instances** - `gridEventBridge`, `hotCellRouter`, `deepLinker`
- **Type-safe** - Full TypeScript support

## 🔗 Related Files

- **event-bridge.ts** - Event emission and storage
- **hot-cell-router.ts** - Pressure calculation and routing
- **deep-linker.ts** - URL generation
- **integration-example.ts** - Complete workflows
- **event-system-examples.ts** - Basic examples
- **README.md** - Full documentation
