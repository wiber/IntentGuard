# Alignment Proposal AP-001: Cognitive Rooms Module Extraction

**Date:** 2026-02-17
**Drift Severity:** CRITICAL
**Spec Section:** "Cognitive Rooms -> Discord Channels" + Module Migration Status
**Patent Reference:** IAMFIM Geometric Permission Model (20-dim coordinate space)

---

## Spec vs Code Drift Summary

**Overall drift percentage: ~18%** (2 critical, 2 moderate, 3 minor across 12 audited spec claims)

### Highest-Priority Drift: Missing `src/rooms/` Module

**What the spec says:**
The migration spec (Section "Module Migration Status", "Cognitive Rooms" tile) defines:
- Target path: `intentguard/src/rooms/`
- Status: `building`
- Risk: `high`
- Description: "9 rooms: Builder(iTerm), Architect(VSCode), Operator(Kitty), Vault(WezTerm), Voice(Terminal), Laboratory(Cursor), Performer(Alacritty), Network(Messages), Navigator(Rio)"
- Source: `.workflow/rooms/ (9 HTML rooms + dashboard)`

The spec also defines per-room properties:
- Tesseract Grid coordinates (A1-C3 in Law/Opportunity/Signal space)
- IPC mechanisms per terminal (applescript, kitty-socket, wezterm-cli, system-events)
- Content routing rules (sees/ignores/handoff per room)
- Handoff protocols between rooms

**What the code actually does:**
The `src/rooms/` directory **does not exist**. Room configuration is scattered across three unrelated files as hardcoded constants:

| Location | What it holds |
|---|---|
| `src/skills/claude-flow-bridge.ts:23-33` | `TERMINALS` object: room name, emoji, app, processName, IPC type, windowHint |
| `src/cron/scheduler.ts:45-55` | `ROOM_HTML_MAP` object: room name -> HTML filename for coordinate-lock data |
| `src/discord/channel-manager.ts:24-27` | `ROOMS` array + `ROOM_DESCRIPTIONS` object for Discord channel creation |

There is no:
- Shared room type definition
- Room-level sees/ignores/handoff routing logic
- Tesseract coordinate mapping per room
- Room lifecycle management
- Content routing filter implementation

The three files independently define the same 9 rooms with no shared contract, creating a maintenance hazard where rooms could diverge across files.

---

## Concrete Patch

### 1. Create `src/rooms/types.ts`

```typescript
/**
 * src/rooms/types.ts - Cognitive Room definitions
 * Single source of truth for the 9-room coordinate system.
 */

export type IpcType = 'iterm' | 'system-events' | 'kitty' | 'wezterm' | 'terminal';

export type TesseractAxis = 'Law' | 'Opportunity' | 'Signal';
export type TesseractRow = 'A' | 'B' | 'C';
export type TesseractCol = '1' | '2' | '3';

export interface TesseractCoordinate {
  row: TesseractRow;
  col: TesseractCol;
  rowAxis: TesseractAxis;
  colAxis: TesseractAxis;
  label: string; // e.g. "Law:Law", "Grid:Signal"
}

export interface HandoffRule {
  target: string;   // room name
  emoji: string;    // room emoji
  trigger: string;  // e.g. "Architecture question"
}

export interface CognitiveRoom {
  name: string;
  emoji: string;
  app: string;
  processName: string;
  ipc: IpcType;
  windowHint: string;
  coordinate: TesseractCoordinate;
  htmlFile: string;
  description: string;
  sees: string[];
  ignores: string[];
  handoffs: HandoffRule[];
}
```

### 2. Create `src/rooms/registry.ts`

```typescript
/**
 * src/rooms/registry.ts - The 9 cognitive rooms as a single canonical registry.
 * All room data that currently lives in claude-flow-bridge.ts, scheduler.ts,
 * and channel-manager.ts gets consolidated here.
 */

import { CognitiveRoom } from './types';

export const COGNITIVE_ROOMS: Record<string, CognitiveRoom> = {
  builder: {
    name: 'builder', emoji: '🔨', app: 'iTerm', processName: 'iTerm2',
    ipc: 'iterm', windowHint: 'builder',
    coordinate: { row: 'C', col: '1', rowAxis: 'Signal', colAxis: 'Law', label: 'Grid:Law' },
    htmlFile: 'iterm2-builder.html',
    description: 'Implementation & code generation (iTerm)',
    sees: ['Code architecture', 'Build systems', 'Feature implementation', 'Bug fixes'],
    ignores: ['Sales strategy', 'Legal review', 'Demo scripts'],
    handoffs: [
      { target: 'architect', emoji: '📐', trigger: 'Architecture question' },
      { target: 'operator', emoji: '🎩', trigger: 'Deploy this' },
    ],
  },
  // ... (8 more rooms following same pattern from spec)
};

export const ROOM_NAMES = Object.keys(COGNITIVE_ROOMS);

export function getRoomByName(name: string): CognitiveRoom | undefined {
  return COGNITIVE_ROOMS[name];
}

export function getRoomsByIpc(ipc: string): CognitiveRoom[] {
  return Object.values(COGNITIVE_ROOMS).filter(r => r.ipc === ipc);
}

export function getParallelRooms(): CognitiveRoom[] {
  return Object.values(COGNITIVE_ROOMS).filter(r => r.ipc !== 'system-events');
}
```

### 3. Create `src/rooms/index.ts`

```typescript
export { COGNITIVE_ROOMS, ROOM_NAMES, getRoomByName, getRoomsByIpc, getParallelRooms } from './registry';
export type { CognitiveRoom, IpcType, TesseractCoordinate, HandoffRule } from './types';
```

### 4. Refactor consumers to import from `src/rooms/`

**`src/skills/claude-flow-bridge.ts`** - Replace `TERMINALS` constant:
```diff
-const TERMINALS: Record<string, TerminalEntry> = {
-  builder:    { room: 'builder',    emoji: '🔨', app: 'iTerm',    processName: 'iTerm2',   ipc: 'iterm',         windowHint: 'builder' },
-  // ... 8 more entries
-};
+import { COGNITIVE_ROOMS } from '../rooms';
+const TERMINALS = Object.fromEntries(
+  Object.entries(COGNITIVE_ROOMS).map(([k, v]) => [k, {
+    room: v.name, emoji: v.emoji, app: v.app,
+    processName: v.processName, ipc: v.ipc, windowHint: v.windowHint,
+  }])
+);
```

**`src/cron/scheduler.ts`** - Replace `ROOM_HTML_MAP`:
```diff
-const ROOM_HTML_MAP: Record<string, string> = {
-  builder: 'iterm2-builder.html',
-  // ... 8 more entries
-};
+import { COGNITIVE_ROOMS } from '../rooms';
+const ROOM_HTML_MAP = Object.fromEntries(
+  Object.entries(COGNITIVE_ROOMS).map(([k, v]) => [k, v.htmlFile])
+);
```

**`src/discord/channel-manager.ts`** - Replace `ROOMS` array and `ROOM_DESCRIPTIONS`:
```diff
-const ROOMS = [
-  'builder', 'architect', 'operator', 'vault', 'voice',
-  'laboratory', 'performer', 'navigator', 'network',
-];
-const ROOM_DESCRIPTIONS: Record<string, string> = { ... };
+import { ROOM_NAMES, COGNITIVE_ROOMS } from '../rooms';
+const ROOMS = ROOM_NAMES;
+const ROOM_DESCRIPTIONS = Object.fromEntries(
+  Object.entries(COGNITIVE_ROOMS).map(([k, v]) => [k, v.description])
+);
```

---

## Full Drift Audit (12 Claims Checked)

| # | Component | Spec Claim | Actual State | Drift |
|---|---|---|---|---|
| 1 | `src/rooms/` | 9-room module directory | **Does not exist** — scattered constants in 3 files | **CRITICAL** |
| 2 | `src/wrapper.ts` | FIM v2.0 + Night Shift + CEO loop | FIM v2.0 yes; Night Shift in runtime.ts; CEO loop standalone | MODERATE |
| 3 | `src/runtime.ts` | Main orchestrator, 1663 LOC | Real, all 21+ commands wired | None |
| 4 | `src/ceo-loop.ts` | Infinite op, idle watch, subdivider, circuit breaker | All 4 features present (844 LOC) | None |
| 5 | `llm-controller.ts` | 548 LOC, 378 LOC tests | 552 LOC src, 462 LOC tests (spec undercounts tests) | Minor |
| 6 | `claude-flow-bridge.ts` | 732 LOC, 596 LOC tests | 732 LOC src (exact), 606 LOC tests | None |
| 7 | `auth/geometric.ts` | 20-dim vectors, 44 tests | All math real, 44 test cases confirmed | None |
| 8 | `src/discord/` | Bot commands implemented | 21 commands in runtime.ts, discord/ is utility lib | Minor |
| 9 | `src/bot/` | Not described | Tesseract Playground bot (extra, unlisted) | Extra |
| 10 | `src/cron/` | 10 tasks, sovereignty-gated | 15 tasks (more than claimed), sovereignty gating real | Minor (favorable) |
| 11 | `steering-loop.ts` | Ask-and-Predict, 5/30/60s timers | Exact match at src/discord/steering-loop.ts (349 LOC) | None |
| 12 | Channel adapters | Real implementations | Architecturally complete, dependency-optional (stub fallback) | MODERATE |

---

## Impact Assessment

The rooms module drift is the highest-priority fix because:

1. **Three-way divergence risk**: Any room added/renamed must be updated in 3 files independently
2. **Missing routing logic**: The spec's sees/ignores/handoff rules have no code implementation
3. **No coordinate mapping**: Tesseract grid coordinates (A1-C3) exist only in the spec HTML, not in code
4. **Spec credibility**: The spec marks Cognitive Rooms as "building" but there's no `src/rooms/` at all

Estimated effort: 2-3 hours for extraction + consumer refactoring + tests.

---

## Spec Update Required

After implementing the rooms module, update `intentguard-migration-spec.html`:
- `wrapper.ts` description: remove "Night Shift scheduler, CEO loop v2" (those are in runtime.ts / ceo-loop.ts)
- Night Shift task count: update from "10 registered tasks" to "15 registered tasks"
- `llm-controller.ts` LOC: update to 552 src / 462 tests
- Channel adapters: add note about dependency-optional pattern
