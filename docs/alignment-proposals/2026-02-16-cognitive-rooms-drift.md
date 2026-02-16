# Alignment Proposal: Cognitive Rooms Module Centralization

**Date:** 2026-02-16
**Author:** Claude Opus 4.6 (Recursive Documentation Mode)
**Drift Detected:** 60% (highest negative drift in codebase)
**Priority:** HIGH - Architectural coherence gap
**Patent Reference:** IAMFIM Geometric Auth (FIM tensor space, 20-dimensional coordinate system)

---

## 1. What the Spec Says

The Migration Spec (`intentguard-migration-spec.html`, Module Migration Status section) defines:

- **Component:** Cognitive Rooms
- **Status:** `building`
- **Risk:** HIGH
- **Description:** "9 rooms: Builder(iTerm), Architect(VSCode), Operator(Kitty), Vault(WezTerm), Voice(Terminal), Laboratory(Cursor), Performer(Alacritty), Network(Messages), Navigator(Rio)"
- **Migration path:** `.workflow/rooms/ (9 HTML rooms + dashboard)` -> `intentguard/src/rooms/`

The spec implies a dedicated, centralized `src/rooms/` module that:
- Defines all 9 cognitive rooms with their terminal bindings
- Maps rooms to Tesseract grid coordinates (A1-C3)
- Provides IPC protocol abstraction per terminal type
- Integrates with Discord channel routing
- Houses room HTML files or references to them

## 2. What the Code Does

**`src/rooms/` does not exist.** Room logic is scattered across 5+ files:

| File | Room Responsibility |
|------|-------------------|
| `src/skills/claude-flow-bridge.ts:23-33` | `TERMINALS` record: 9 rooms with emoji, app, processName, ipc, windowHint |
| `src/skills/claude-flow-bridge.ts:36-45` | `ROOM_TO_AGENT_TYPE` mapping (builder->coder, architect->planner, etc.) |
| `src/cron/scheduler.ts` | `ROOM_HTML_MAP` referencing external `.workflow/rooms/*.html` files |
| `src/discord/channel-manager.ts` | Room-to-Discord-channel mapping |
| `src/discord/shortrank-notation.ts` | Tesseract grid cell detection with room references |
| `src/grid/hot-cell-router.ts` | Grid pressure routing that references room coordinates |

**Key problems:**
1. **No single source of truth** for room definitions - the `TERMINALS` constant in claude-flow-bridge.ts is the closest, but it's buried inside a skill
2. **Performer terminal mismatch:** Spec says "Alacritty" but `claude-flow-bridge.ts:30` maps Performer to `Terminal.app`
3. **Room HTML files** are external dependencies (`../thetadrivencoach/.workflow/rooms/`) with no local fallback
4. **No room type exports** - other files re-define room constants independently

## 3. Concrete Patch

### 3.1 Create `src/rooms/index.ts` (Single Source of Truth)

```typescript
// src/rooms/index.ts - Cognitive Room Registry
// Single source of truth for all 9 cognitive rooms

export interface CognitiveRoom {
  id: string;
  emoji: string;
  app: string;
  processName: string;
  ipc: 'iterm' | 'system-events' | 'kitty' | 'wezterm' | 'terminal';
  gridCoord: string;         // Tesseract coordinate (e.g., 'C1', 'A2')
  gridLabel: string;         // Human label (e.g., 'Grid:Law')
  agentType: string;         // Claude Flow agent type
  discordChannel?: string;   // Discord channel name
  sees: string[];            // What this room processes
  ignores: string[];         // What this room filters out
  handoffs: Record<string, string>; // room -> reason
}

export const ROOMS: Record<string, CognitiveRoom> = {
  builder: {
    id: 'builder', emoji: '🔨', app: 'iTerm2', processName: 'iTerm2',
    ipc: 'iterm', gridCoord: 'C1', gridLabel: 'Grid:Law', agentType: 'coder',
    sees: ['Code architecture', 'Build systems', 'Feature implementation', 'Bug fixes'],
    ignores: ['Sales strategy', 'Legal review', 'Demo scripts'],
    handoffs: { architect: 'Architecture question', operator: 'Deploy this' },
  },
  architect: {
    id: 'architect', emoji: '📐', app: 'VS Code', processName: 'Code',
    ipc: 'system-events', gridCoord: 'A2', gridLabel: 'Law:Opportunity', agentType: 'planner',
    sees: ['Strategic sequencing', 'System design', 'Pricing strategy', 'GTM directives'],
    ignores: ['Implementation details', 'CRM stages', 'Voice content'],
    handoffs: { builder: 'Implement this design', operator: 'Execute outreach' },
  },
  operator: {
    id: 'operator', emoji: '🎩', app: 'kitty', processName: 'kitty',
    ipc: 'kitty', gridCoord: 'C3', gridLabel: 'Grid:Signal', agentType: 'coder',
    sees: ['CRM stages', 'Deal velocity', 'Battle cards', 'Outreach copy'],
    ignores: ['Code architecture', 'Strategic sequencing', 'Patent language'],
    handoffs: { architect: 'Strategy question', builder: 'Feature request' },
  },
  vault: {
    id: 'vault', emoji: '🔒', app: 'WezTerm', processName: 'WezTerm',
    ipc: 'wezterm', gridCoord: 'A1', gridLabel: 'Law:Law', agentType: 'reviewer',
    sees: ['Contracts', 'Legal language', 'Patent claims', 'Compliance'],
    ignores: ['Sales tactics', 'Code', 'Content creation'],
    handoffs: { architect: 'Strategic review', operator: 'Contract ready' },
  },
  voice: {
    id: 'voice', emoji: '🎤', app: 'Terminal.app', processName: 'Terminal',
    ipc: 'terminal', gridCoord: 'B1', gridLabel: 'Opp:Law', agentType: 'researcher',
    sees: ['Content creation', 'LinkedIn posts', 'Thought leadership', 'Warm leads'],
    ignores: ['Code', 'Legal', 'Deployment'],
    handoffs: { operator: 'Warm lead from post', architect: 'Content strategy' },
  },
  laboratory: {
    id: 'laboratory', emoji: '🧪', app: 'Cursor', processName: 'Cursor',
    ipc: 'system-events', gridCoord: 'C2', gridLabel: 'Grid:Opportunity', agentType: 'tester',
    sees: ['Experiments', 'A/B tests', 'Research', 'Prototypes'],
    ignores: ['Production code', 'Sales', 'Legal'],
    handoffs: { builder: 'Experiment succeeded', architect: 'Research findings' },
  },
  performer: {
    id: 'performer', emoji: '🎭', app: 'Alacritty', processName: 'Alacritty',
    ipc: 'system-events', gridCoord: 'A3', gridLabel: 'Law:Signal', agentType: 'coder',
    sees: ['Demo scripts', 'Presentations', 'Live performances', 'Video content'],
    ignores: ['Code', 'CRM', 'Research'],
    handoffs: { operator: 'Demo converted', architect: 'Demo feedback' },
  },
  network: {
    id: 'network', emoji: '☕', app: 'Messages', processName: 'Messages',
    ipc: 'system-events', gridCoord: 'B2', gridLabel: 'Opp:Opportunity', agentType: 'researcher',
    sees: ['Relationships', 'Introductions', 'Community', 'Warm connections'],
    ignores: ['Code', 'Legal', 'Experiments'],
    handoffs: { operator: 'Warm intro for deal', voice: 'Content collaboration' },
  },
  navigator: {
    id: 'navigator', emoji: '🧭', app: 'Rio', processName: 'rio',
    ipc: 'system-events', gridCoord: 'B3', gridLabel: 'Opp:Signal', agentType: 'planner',
    sees: ['Context switching', 'Routing decisions', 'Exploration', 'Discovery'],
    ignores: ['Deep implementation', 'Closing deals', 'Legal review'],
    handoffs: { architect: 'Found strategic opportunity', builder: 'Found useful tool/library' },
  },
};

/** Get room by Tesseract grid coordinate */
export function roomByCoord(coord: string): CognitiveRoom | undefined {
  return Object.values(ROOMS).find(r => r.gridCoord === coord);
}

/** Get all rooms that use a specific IPC method */
export function roomsByIpc(ipc: CognitiveRoom['ipc']): CognitiveRoom[] {
  return Object.values(ROOMS).filter(r => r.ipc === ipc);
}

/** Room IDs list */
export const ROOM_IDS = Object.keys(ROOMS) as Array<keyof typeof ROOMS>;
```

### 3.2 Update `src/skills/claude-flow-bridge.ts` to import from rooms

Replace the inline `TERMINALS` and `ROOM_TO_AGENT_TYPE` constants with imports:

```diff
- const TERMINALS: Record<string, TerminalEntry> = {
-   builder:    { room: 'builder',    emoji: '🔨', app: 'iTerm',    ... },
-   // ... 9 entries
- };
- const ROOM_TO_AGENT_TYPE: Record<string, string> = { ... };
+ import { ROOMS, type CognitiveRoom } from '../rooms/index.js';
+ const TERMINALS = Object.fromEntries(
+   Object.entries(ROOMS).map(([id, r]) => [id, {
+     room: id, emoji: r.emoji, app: r.app,
+     processName: r.processName, ipc: r.ipc, windowHint: id,
+   }])
+ );
+ const ROOM_TO_AGENT_TYPE = Object.fromEntries(
+   Object.entries(ROOMS).map(([id, r]) => [id, r.agentType])
+ );
```

### 3.3 Fix Performer Terminal Mismatch

The spec says Performer uses **Alacritty**, but `claude-flow-bridge.ts:30` maps it to `Terminal.app`. The rooms module above corrects this to match the spec.

---

## 4. Secondary Drift: Stale Module Migration Statuses

The spec's "Module Migration Status" section (line ~186) shows stale badges:

| Component | Spec Badge | Actual State | Action |
|-----------|-----------|--------------|--------|
| Claude Flow Bridge | `pending` (line 242) | Done (skill fully implemented, 732 LOC + tests) | Update to `complete` |
| Discord Integration | `building` (line 206) | Substantially complete (steering loop, channels, notation) | Update to `complete` |
| Tesseract Grid | `pending` (line 291) | Substantially implemented (hot-cell router, deep-linker, drift detector) | Update to `building` |
| Cognitive Rooms | `building` (line 219) | No `src/rooms/` module exists | Accurate but needs implementation |

**Note:** The Skills Inventory section (line ~668) correctly shows Claude Flow Bridge as `done`, contradicting the Module Migration Status section. This internal spec inconsistency should be resolved.

---

## 5. Drift Summary

| Metric | Value |
|--------|-------|
| **Total components analyzed** | 12 |
| **Zero drift (perfect alignment)** | 7 (58%) |
| **Positive drift (code exceeds spec)** | 3 (25%) |
| **Negative drift (code behind spec)** | 1 (8%) |
| **Internal spec inconsistency** | 1 (8%) |
| **Overall codebase drift** | ~17% |
| **Highest-priority fix** | Create `src/rooms/` module |

---

## 6. Implementation Effort

- **Create `src/rooms/index.ts`:** ~80 LOC (30 min)
- **Create `src/rooms/rooms.test.ts`:** ~60 LOC (20 min)
- **Refactor claude-flow-bridge.ts imports:** ~15 LOC changed (15 min)
- **Update spec migration badges:** 4 badge changes (5 min)
- **Fix Performer terminal:** 1 line (already in rooms module)

**Total:** ~1 hour estimated, LOW risk, HIGH architectural value.
