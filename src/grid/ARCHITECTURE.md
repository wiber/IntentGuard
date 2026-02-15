# Tesseract Grid - System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Discord Bot (IntentGuard)                │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Slash        │  │ CEO Loop     │  │ Event Handlers  │  │
│  │ Commands     │  │ Tasks        │  │ (Voice/React)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│         │                 │                    │            │
│         └─────────────────┼────────────────────┘            │
│                           ▼                                 │
│              ┌────────────────────────┐                     │
│              │   Grid Module (NEW)    │                     │
│              └────────────────────────┘                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌───────────────┐ ┌────────────┐ ┌──────────────┐
│ Event Bridge  │ │ Hot Cell   │ │ ASCII        │
│ (Local)       │ │ Router     │ │ Renderer     │
└───────┬───────┘ └─────┬──────┘ └──────┬───────┘
        │               │                │
        ▼               ▼                ▼
┌────────────────────────────────────────────────┐
│         data/grid-events.jsonl (Local)        │
└────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────┐
│         Tesseract Client (HTTP)               │
└───────────────────┬────────────────────────────┘
                    │
                    ▼
        ╔═══════════════════════╗
        ║  tesseract.nu API     ║
        ║  (External Service)   ║
        ╚═══════════════════════╝
```

---

## Module Interaction Flow

### 1. Task Completion Flow

```
CEO Loop Task Completes
        │
        ▼
┌─────────────────────┐
│  Event Bridge       │  Phase 0 → A2:Goal
│  onTaskComplete()   │  Phase 1 → B3:Signal
└──────────┬──────────┘  Phase 2 → A1:Law
           │              ... etc
           ▼
┌─────────────────────────────┐
│  grid-events.jsonl          │  {"timestamp":"...","type":"POINTER_CREATE","cell":"A2",...}
│  (Append-only JSONL)        │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────┐
│  Tesseract Client   │  POST /api/grid/pointer
│  pushPointerEvent() │  { cellId: "A2", eventType: "task-complete", ... }
└──────────┬──────────┘
           │
           ▼
      tesseract.nu API
```

### 2. Grid Display Flow

```
Discord Command: /grid show
        │
        ▼
┌─────────────────────┐
│  Tesseract Client   │  GET /api/grid/state
│  fetchGridState()   │  → { cellPressures: { A1: 0.25, ... } }
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Hot Cell Router    │  updatePressures()
│  (Local analysis)   │  → Merge API + local event data
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  ASCII Renderer     │  renderGrid(pressures)
│  (ANSI coloring)    │  → Discord code block
└──────────┬──────────┘
           │
           ▼
   Discord Channel
```

### 3. Hot Cell Alert Flow

```
Periodic Check (Cron/Timer)
        │
        ▼
┌─────────────────────┐
│  Hot Cell Router    │  updatePressures()
│  getHotCells(0.7)   │  → ['A2', 'B2']
└──────────┬──────────┘
           │
           ▼  (If hot cells detected)
┌─────────────────────┐
│  Hot Cell Router    │  routeToRoom(hotCells)
│  (Routing logic)    │  → { room: '#strategy-room', ... }
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Deep Linker        │  generateDeepLink('A2')
│  (URL generation)   │  → https://tesseract.nu/grid?focus=A2
└──────────┬──────────┘
           │
           ▼
   Alert Message to Discord
   (Routed to appropriate channel)
```

---

## Data Flow Diagram

```
┌──────────────┐
│  Discord     │
│  Events      │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│            Grid Module                      │
│                                             │
│  ┌────────────┐      ┌──────────────┐      │
│  │ Event      │◄─────┤ Task Input   │      │
│  │ Bridge     │      └──────────────┘      │
│  └─────┬──────┘                            │
│        │                                   │
│        ▼                                   │
│  ┌────────────┐      ┌──────────────┐     │
│  │ Local      │◄────►│ Hot Cell     │     │
│  │ JSONL      │      │ Router       │     │
│  └─────┬──────┘      └──────┬───────┘     │
│        │                    │              │
│        ▼                    ▼              │
│  ┌──────────────────────────────────┐     │
│  │     Tesseract Client             │     │
│  │     (Sync with API)              │     │
│  └──────────┬───────────────────────┘     │
│             │                              │
└─────────────┼──────────────────────────────┘
              │
              ▼
      ┌──────────────┐
      │ tesseract.nu │
      │     API      │
      └──────┬───────┘
             │
             ▼
      ┌──────────────┐
      │   Render     │
      │   Display    │
      └──────┬───────┘
             │
             ▼
       Discord Output
```

---

## Component Architecture

### ASCII Renderer

```
renderGrid(pressures)
    │
    ├─► Header (ANSI cyan, bold)
    ├─► Column labels (gray)
    ├─► Row loop (A, B, C)
    │   ├─► Row label (Strategy/Tactics/Operations)
    │   └─► Cell loop (1, 2, 3, 4)
    │       ├─► Heat color (green/yellow/red)
    │       ├─► Emoji (🟢/🟡/🔴)
    │       └─► Cell data (A1 Law 0.42)
    ├─► Borders (gray box drawing)
    └─► Legend (color descriptions)

    Output: ```ansi\n...\n```
```

### Tesseract Client

```
API Functions
    │
    ├─► fetchGridState()
    │   └─► GET /api/grid/state → Record<string, number>
    │
    ├─► pushPointerEvent(cellId, type, data)
    │   └─► POST /api/grid/pointer → PointerEventResponse
    │
    ├─► pushPointerEvents(events[])
    │   └─► POST /api/grid/pointer/batch → PointerEventResponse[]
    │
    └─► checkHealth()
        └─► GET /api/health → HealthStatus

Features:
- Timeout handling (10s default)
- Error recovery (fallback to defaults)
- Native fetch (Node 18+)
```

### Event Bridge

```
Phase-to-Cell Mapping
    │
    ├─► Phase 0 → A2:Goal   (Strategy)
    ├─► Phase 1 → B3:Signal (Tactics)
    ├─► Phase 2 → A1:Law    (Strategy)
    ├─► Phase 3 → B1:Speed  (Tactics)
    ├─► Phase 4 → C1:Grid   (Operations)
    ├─► Phase 6 → A3:Fund   (Strategy)
    ├─► Phase 7 → C3:Flow   (Operations)
    ├─► Phase 8 → B2:Deal   (Tactics)
    └─► Phase 9 → C2:Loop   (Operations)

Event Structure:
{
  timestamp: "ISO-8601",
  type: "POINTER_CREATE" | "PRESSURE_UPDATE" | "CELL_ACTIVATE",
  cell: "A1" | "B2" | ...,
  phase: 0-9,
  task: "Task description",
  intersection: "SOURCE:TARGET",
  metadata: {...}
}

Storage: data/grid-events.jsonl (append-only)
```

### Hot Cell Router

```
Pressure Calculation
    │
    ├─► Load events from JSONL
    │
    ├─► Time-weighted scoring
    │   ├─► Last 1 hour:   weight = 1.0
    │   ├─► Last 6 hours:  weight = 0.5
    │   └─► Last 24 hours: weight = 0.2
    │
    ├─► Normalize to 0.0-1.0 scale
    │   └─► pressure = score / maxScore
    │
    ├─► Hot cell detection (threshold: 0.7)
    │
    └─► Room routing
        └─► Group by room, select highest total pressure

Cell-to-Room Mapping:
A1:Law    → #legal-room
A2:Goal   → #strategy-room
A3:Fund   → #finance-room
B1:Speed  → #speed-room
B2:Deal   → #deals-room
B3:Signal → #signal-room
C1:Grid   → #ops-room
C2:Loop   → #loop-room
C3:Flow   → #flow-room
```

### Deep Linker

```
URL Generation
    │
    ├─► generateDeepLink(cell, context)
    │   └─► https://tesseract.nu/grid?focus=A2&context=...
    │
    ├─► generateComparisonLink(cells[], mode)
    │   └─► https://tesseract.nu/grid?compare=A1,B2,C3&mode=overlay
    │
    ├─► generateRoomLink(room, highlight)
    │   └─► https://tesseract.nu/grid?room=strategy&highlight=A2
    │
    ├─► generateTimelineLink(cell, start, end)
    │   └─► https://tesseract.nu/grid?focus=A2&timeline=...
    │
    ├─► generateDiscordLink(cell, msgId, channelId, guildId)
    │   └─► https://discord.com/channels/guild/channel/message
    │
    └─► generateMarkdownLink(cell, label, context)
        └─► [label](url)

URL Parsing:
parseDeepLink(url) → { cell, context }
```

---

## State Management

### Local State (JSONL)

```
data/grid-events.jsonl
├─► Append-only log
├─► One JSON object per line
├─► No deletion (archive old data separately)
└─► Used by Hot Cell Router for pressure calculation

Example:
{"timestamp":"2026-02-14T20:00:00Z","type":"POINTER_CREATE","cell":"A2","phase":0,"task":"Define goals"}
{"timestamp":"2026-02-14T20:05:00Z","type":"POINTER_CREATE","cell":"B3","phase":1,"task":"Detect signals"}
```

### Remote State (tesseract.nu)

```
GET /api/grid/state
└─► Authoritative source for current pressures
    └─► Updated by all clients pushing events

POST /api/grid/pointer
└─► Push local event to remote
    └─► Remote recalculates pressures
        └─► Other clients see updated state
```

### Hybrid Approach

```
Local Events + Remote API = Complete Picture
    │
    ├─► Local: Fast, always available, detailed history
    └─► Remote: Authoritative, shared across clients, aggregated
```

---

## Error Handling

```
API Timeout (10s)
    │
    ├─► Retry (optional)
    └─► Fallback to local state

Network Error
    │
    ├─► Log warning
    └─► Continue with local-only mode

Invalid Cell ID
    │
    └─► Return null/error (fail fast)

Missing Events File
    │
    └─► Create empty file, continue

Parse Error (JSONL)
    │
    └─► Skip malformed line, log error
```

---

## Performance Characteristics

| Operation              | Time Complexity | Notes                          |
|------------------------|-----------------|--------------------------------|
| Load events            | O(n)            | n = lines in JSONL             |
| Update pressures       | O(n)            | n = events in last 24h         |
| Get hot cells          | O(m)            | m = number of cells (12)       |
| Render ASCII grid      | O(1)            | Fixed grid size                |
| API call (fetch)       | Network-bound   | ~100-500ms typical             |
| API call (push single) | Network-bound   | ~100-500ms typical             |
| API call (push batch)  | Network-bound   | ~200-800ms for 10 events       |

---

## Security Considerations

1. **API Authentication:** Not yet implemented (add Bearer tokens if needed)
2. **Input Validation:** Cell IDs validated against known set
3. **JSONL Injection:** JSON.stringify prevents injection
4. **URL Generation:** URLSearchParams prevents XSS
5. **Discord Permissions:** Bot should check channel permissions before posting

---

## Scalability

- **Local JSONL:** Scales to ~100k events before rotation recommended
- **API Calls:** Rate limiting not yet implemented (add if needed)
- **Memory Usage:** Minimal (streaming parsing, no full file load)
- **Concurrent Writes:** JSONL append is atomic on most filesystems

---

## Integration Points

### CEO Loop Integration

```typescript
import { gridEventBridge } from './grid';

// In CEO loop task completion handler
ceoLoop.on('task-complete', (phase, task) => {
  gridEventBridge.onTaskComplete(phase, task);
});
```

### Discord Command Integration

```typescript
import { fetchGridState, renderGrid } from './grid';

client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'grid') {
    const pressures = await fetchGridState();
    const ascii = renderGrid(pressures);
    await interaction.reply(ascii);
  }
});
```

### Cron Job Integration

```typescript
import { hotCellRouter, deepLinker } from './grid';

setInterval(async () => {
  hotCellRouter.updatePressures();
  const hotCells = hotCellRouter.getHotCells(0.7);

  if (hotCells.length > 0) {
    const routing = hotCellRouter.routeToRoom(hotCells);
    // Send alert to Discord
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

---

## Future Enhancements

1. **Real-time WebSocket** for live grid updates
2. **Authentication** for tesseract.nu API
3. **Rate limiting** for API calls
4. **Event archival** (rotate JSONL files)
5. **Analytics dashboard** (historical trends)
6. **Multi-tenant support** (per-guild grids)
7. **Custom pressure algorithms** (plugin system)
8. **Grid visualization** (web UI)

---

**Architecture Version:** 1.0.0
**Last Updated:** 2026-02-14
