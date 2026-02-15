# Tesseract Grid Module

Complete grid system for Discord bot integration with tesseract.nu.

## Overview

The grid module provides five integrated capabilities:

1. **ASCII Renderer** - Discord-friendly ANSI colored grid visualization
2. **Tesseract Client** - HTTP client for tesseract.nu API
3. **Event Bridge** - Track task completions and emit grid events ✨ NEW
4. **Hot Cell Router** - Calculate pressure and route to cognitive rooms ✨ NEW
5. **Deep Linker** - Generate navigation links to tesseract.nu ✨ NEW

## 🆕 Event System (New Features)

### Event Bridge

Wire task completions to grid cells with automatic phase-to-cell mapping:

```typescript
import { gridEventBridge } from './grid';

// Emit event on task completion
const event = gridEventBridge.onTaskComplete(
  0, // Phase 0 → A2:Goal
  'Define quarterly goals',
  { priority: 'high' }
);
```

**Phase-to-Cell Mapping:**
- Phase 0 → A2:Goal (Goal setting)
- Phase 1 → B3:Signal (Signal detection)
- Phase 2 → A1:Law (Legal/Rules)
- Phase 3 → B1:Speed (Velocity)
- Phase 4 → C1:Grid (Grid operations)
- Phase 6 → A3:Fund (Finance)
- Phase 7 → C3:Flow (Flow state)
- Phase 8 → B2:Deal (Transactions)
- Phase 9 → C2:Loop (Feedback loops)

Events stored in `data/grid-events.jsonl`:
```jsonl
{"timestamp":"2026-02-14T20:00:00.000Z","type":"POINTER_CREATE","cell":"A2","phase":0,"task":"Define quarterly goals","intersection":"TASK:A2:Goal"}
```

### Hot Cell Router

Calculate pressure and route priority to cognitive rooms:

```typescript
import { hotCellRouter } from './grid';

// Update pressures from events
const pressures = hotCellRouter.updatePressures();
// Returns: { A2: 0.85, B3: 0.72, C1: 0.45, ... }

// Get hot cells above threshold
const hotCells = hotCellRouter.getHotCells(0.7);
// Returns: ['A2', 'B3']

// Get routing recommendation
const routing = hotCellRouter.routeToRoom(hotCells);
// Returns: { room: '#strategy-room', cells: ['A2'], ... }

// Get summary report
console.log(hotCellRouter.getSummary());
```

**Cell-to-Room Mapping:**
- A1:Law → #legal-room
- A2:Goal → #strategy-room
- A3:Fund → #finance-room
- B1:Speed → #speed-room
- B2:Deal → #deals-room
- B3:Signal → #signal-room
- C1:Grid → #ops-room
- C2:Loop → #loop-room
- C3:Flow → #flow-room

**Pressure Calculation:**
- Recent events (last hour): 1.0 weight
- Events in last 6 hours: 0.5 weight
- Events in last 24 hours: 0.2 weight
- Normalized to 0.0-1.0 scale

### Deep Linker

Generate navigation links to tesseract.nu and Discord:

```typescript
import { deepLinker } from './grid';

// Basic cell link
const url = deepLinker.generateDeepLink('A2', 'Quarterly planning');
// https://tesseract.nu/grid?focus=A2&context=Quarterly%20planning

// Multi-cell comparison
const compareUrl = deepLinker.generateComparisonLink(['A2', 'B3'], 'overlay');

// Room-focused view
const roomUrl = deepLinker.generateRoomLink('#strategy-room', 'A2');

// Timeline view
const timelineUrl = deepLinker.generateTimelineLink('A2', start, end);

// Discord message link
const discordUrl = deepLinker.generateDiscordLink('A2', msgId, channelId);

// Markdown link
const mdLink = deepLinker.generateMarkdownLink('A2', 'Strategy Goal');

// Parse existing link
const parsed = deepLinker.parseDeepLink(url);
```

## Grid Structure

### 12-Cell Tesseract Grid

```
        Col 1      Col 2      Col 3      Col 4
    ┌──────────┬──────────┬──────────┬──────────┐
A   │ A1 Law   │ A2 Goal  │ A3 Fund  │ A4 Ethics│  Strategy
    ├──────────┼──────────┼──────────┼──────────┤
B   │ B1 Speed │ B2 Deal  │ B3 Signal│ B4 Proof │  Tactics
    ├──────────┼──────────┼──────────┼──────────┤
C   │ C1 Grid  │ C2 Loop  │ C3 Flow  │ C4 Safe  │  Operations
    └──────────┴──────────┴──────────┴──────────┘
```

### Heat Map Coloring

- 🟢 **Cold** (0.00-0.30) - Green - Normal operations
- 🟡 **Warm** (0.30-0.70) - Yellow - Elevated activity
- 🔴 **Hot** (0.70-1.00) - Red - Critical attention needed

## Usage

### Basic Grid Display

```typescript
import { fetchGridState, renderGrid } from './grid';

// Fetch and render
const cellPressures = await fetchGridState();
const asciiGrid = renderGrid(cellPressures);

// Send to Discord
await channel.send(asciiGrid);
```

### Discord Embed

```typescript
import { fetchGridState, renderGridEmbed } from './grid';

const cellPressures = await fetchGridState();
const recentEvents = [
  {
    cellId: 'B2',
    type: 'deal-negotiated',
    timestamp: new Date(),
    description: 'Partnership signed',
  },
];

const embed = renderGridEmbed(cellPressures, recentEvents);
await channel.send({ embeds: [embed] });
```

### Push Pointer Events

```typescript
import { pushPointerEvent } from './grid';

// Record bot action
await pushPointerEvent('C2', 'loop-iteration', {
  cycleNumber: 42,
  tasksCompleted: 5,
});
```

### Health Check

```typescript
import { checkHealth } from './grid';

const health = await checkHealth();
if (health.healthy) {
  console.log(`API latency: ${health.latencyMs}ms`);
}
```

## Configuration

Set the API URL via environment variable:

```bash
TESSERACT_API_URL=https://tesseract.nu/api
```

Default: `https://tesseract.nu/api`

## API Endpoints

### GET /api/grid/state

Returns current cell pressures:

```json
{
  "cellPressures": {
    "A1": 0.25,
    "A2": 0.42,
    "B1": 0.68,
    ...
  },
  "timestamp": "2026-02-14T20:55:00Z"
}
```

### POST /api/grid/pointer

Push pointer event:

```json
{
  "cellId": "B2",
  "eventType": "deal-negotiated",
  "data": { "value": 50000 },
  "timestamp": "2026-02-14T20:55:00Z",
  "source": "intentguard-bot"
}
```

Response:

```json
{
  "success": true,
  "message": "Event recorded",
  "gridState": { ... }
}
```

### POST /api/grid/pointer/batch

Push multiple events at once:

```json
{
  "events": [
    { "cellId": "A1", "eventType": "compliance-check", ... },
    { "cellId": "B1", "eventType": "speed-boost", ... }
  ]
}
```

### GET /api/health

Health check:

```json
{
  "healthy": true,
  "version": "1.0.0",
  "timestamp": "2026-02-14T20:55:00Z"
}
```

## Discord Bot Integration

See `example-usage.ts` for complete examples.

### Slash Command Example

```typescript
// /grid show
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'grid') {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'show') {
      const cellPressures = await fetchGridState();
      const asciiGrid = renderGrid(cellPressures);

      await interaction.reply(asciiGrid);
    }
  }
});
```

## Module Architecture

```
grid/
├── ascii-renderer.ts          - ANSI grid rendering for Discord
├── tesseract-client.ts        - HTTP API client
├── event-bridge.ts            - Task completion → Grid events ✨ NEW
├── hot-cell-router.ts         - Pressure calculation & routing ✨ NEW
├── deep-linker.ts             - URL generation for navigation ✨ NEW
├── index.ts                   - Module exports
├── example-usage.ts           - Basic usage examples
├── event-system-examples.ts   - Event system demos ✨ NEW
└── README.md                  - This file
```

## Complete Integration Flow

1. **Task completes** → Event Bridge emits `POINTER_CREATE`
2. **Event stored** → Local JSONL file (`data/grid-events.jsonl`)
3. **Sync to API** → Tesseract Client pushes to tesseract.nu
4. **Pressure calc** → Hot Cell Router analyzes event frequency
5. **Hot cell detection** → Cells above threshold trigger alerts
6. **Room routing** → Route priority to appropriate cognitive room
7. **Display** → ASCII Renderer shows grid in Discord
8. **Navigation** → Deep Linker generates tesseract.nu links

## Development

See `integration-example.ts` for complete workflows

## Testing

### Test Suite

Comprehensive test suite with 50+ test cases for tesseract-client.ts:

```bash
# Run tesseract-client tests
npm test -- src/grid/tesseract-client.test.ts

# Run with coverage
npm test -- --coverage src/grid/

# Watch mode during development
npm test -- --watch src/grid/
```

**Test Coverage:**
- ✅ `fetchGridState()` - Success, HTTP errors, network failures, timeouts
- ✅ `pushPointerEvent()` - Success, error handling, event structure validation
- ✅ `pushPointerEvents()` - Batch operations, partial success, empty arrays
- ✅ `checkHealth()` - Healthy/unhealthy states, latency measurement
- ✅ Configuration - Custom API URLs, environment variable handling
- ✅ Error scenarios - Malformed JSON, AbortError, network timeouts
- ✅ Integration - Sequential operations, state changes, partial batch success

All tests use Jest with mocked `fetch` responses. No real API calls are made.

### Type Checking

```bash
# Type check
npx tsc --noEmit src/grid/*.ts

# Run example
npx tsx src/grid/example-usage.ts
```

## License

MIT
