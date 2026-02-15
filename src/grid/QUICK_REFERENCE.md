# Tesseract Grid - Quick Reference Card

## Grid Layout (12 Cells)

```
        Col 1      Col 2      Col 3      Col 4
    ┌──────────┬──────────┬──────────┬──────────┐
A   │ A1 Law   │ A2 Goal  │ A3 Fund  │ A4 Ethics│  Strategy
B   │ B1 Speed │ B2 Deal  │ B3 Signal│ B4 Proof │  Tactics
C   │ C1 Grid  │ C2 Loop  │ C3 Flow  │ C4 Safe  │  Operations
    └──────────┴──────────┴──────────┴──────────┘
```

## Phase-to-Cell Mapping

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

## Heat Map Colors

| Range     | Color | Emoji | Status               |
|-----------|-------|-------|----------------------|
| 0.0 - 0.3 | Green | 🟢    | Cold (normal)        |
| 0.3 - 0.7 | Yellow| 🟡    | Warm (elevated)      |
| 0.7 - 1.0 | Red   | 🔴    | Hot (critical)       |

## Common Operations

### Display Grid

```typescript
import { fetchGridState, renderGrid } from './grid';

const pressures = await fetchGridState();
const ascii = renderGrid(pressures);
await channel.send(ascii);
```

### Record Task Completion

```typescript
import { gridEventBridge, pushPointerEvent } from './grid';

// Local event
const event = gridEventBridge.onTaskComplete(phase, taskText);

// Sync to API
await pushPointerEvent(event.cell, 'task-complete', metadata);
```

### Check Hot Cells

```typescript
import { hotCellRouter } from './grid';

hotCellRouter.updatePressures();
const hotCells = hotCellRouter.getHotCells(0.7);

if (hotCells.length > 0) {
  const routing = hotCellRouter.routeToRoom(hotCells);
  console.log(`Route to: ${routing.room}`);
}
```

### Generate Deep Link

```typescript
import { deepLinker } from './grid';

const link = deepLinker.generateDeepLink('A2', 'Q1 Goals');
// https://tesseract.nu/grid?focus=A2&context=Q1%20Goals
```

### Create Embed

```typescript
import { renderGridEmbed } from './grid';

const embed = renderGridEmbed(pressures, recentEvents);
await channel.send({ embeds: [embed] });
```

## File Locations

| Purpose                  | File                      |
|--------------------------|---------------------------|
| Grid state (read)        | `grid-state-reader.ts`    |
| Pointer events (write)   | `grid-state-writer.ts`    |
| Event log (JSONL)        | `data/grid-events.jsonl`  |

## Environment Variables

| Variable              | Default                    | Purpose           |
|-----------------------|----------------------------|-------------------|
| `TESSERACT_API_URL`   | `https://tesseract.nu/api` | API base URL      |

## API Endpoints

| Method | Endpoint               | Purpose                    |
|--------|------------------------|----------------------------|
| GET    | `/api/grid/state`      | Fetch cell pressures       |
| POST   | `/api/grid/pointer`    | Push single pointer event  |
| POST   | `/api/grid/pointer/batch` | Push multiple events    |
| GET    | `/api/health`          | Health check               |

## Event Types

| Event Type          | Description                  |
|---------------------|------------------------------|
| `task-complete`     | Task finished in CEO loop    |
| `pressure-update`   | Cell pressure changed        |
| `POINTER_CREATE`    | New pointer event emitted    |

## Discord Commands (Examples)

```typescript
// /grid show
const ascii = renderGrid(await fetchGridState());
await interaction.reply(ascii);

// /grid hot
const hotCells = hotCellRouter.getHotCells();
const routing = hotCellRouter.routeToRoom();
await interaction.reply(`Hot: ${hotCells.join(', ')} → ${routing.room}`);

// /grid status
const embed = renderGridEmbed(await fetchGridState());
await interaction.reply({ embeds: [embed] });
```

## Testing

```bash
# Test ASCII renderer
npx tsx src/grid/test-renderer.ts

# Run integration demo
npx tsx src/grid/integration-example.ts

# Type check
npx tsc --noEmit src/grid/*.ts
```

## Pressure Calculation

Weighted by event age:
- Last 1 hour: **1.0x** weight
- Last 6 hours: **0.5x** weight
- Last 24 hours: **0.2x** weight
- Older: **Ignored**

Normalized to 0.0-1.0 scale based on max score.

## Integration Pattern

```typescript
// 1. Task completes
const event = gridEventBridge.onTaskComplete(phase, text);

// 2. Sync to API
await pushPointerEvent(event.cell, 'task-complete');

// 3. Update pressures
hotCellRouter.updatePressures();

// 4. Check hot cells
const hotCells = hotCellRouter.getHotCells(0.7);

// 5. Route if needed
if (hotCells.length > 0) {
  const routing = hotCellRouter.routeToRoom();
  // Dispatch to routing.room
}
```

## Troubleshooting

| Issue                 | Solution                              |
|-----------------------|---------------------------------------|
| API timeout           | Check `TESSERACT_API_URL` config      |
| No events showing     | Verify `data/grid-events.jsonl` exists|
| Wrong pressures       | Run `updatePressures()` first         |
| ANSI not rendering    | Use Discord code block: \`\`\`ansi   |

## See Also

- `README.md` - Full documentation
- `example-usage.ts` - Basic examples
- `integration-example.ts` - Complete workflows
