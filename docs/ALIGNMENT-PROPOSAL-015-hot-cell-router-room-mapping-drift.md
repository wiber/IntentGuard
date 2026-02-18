# Alignment Proposal #015 — Hot-Cell Router Room Mapping Drift

**Date:** 2026-02-18
**Author:** Claude Opus 4.6 (Recursive Documentation Mode)
**Room:** 📐 A2 Strategy.Goal
**Severity:** CRITICAL
**Drift:** ~100% (hot-cell-router uses a completely phantom room namespace)
**Patent Reference:** 63/XXX,XXX (Feb 2025) — Real-Time AI Behavior Drift Detection System

---

## Executive Summary

The `HotCellRouter` — the system responsible for routing grid pressure signals to cognitive rooms — uses a **completely fabricated room namespace** (`#legal-room`, `#strategy-room`, `#finance-room`, etc.) that exists **nowhere else in the codebase**. No Discord channel, no `channel-manager.ts` entry, no `steering-loop.ts` handler, and no spec reference maps to these names. Every pressure-based routing decision from `hot-cell-router.ts` routes to rooms that don't exist, making the entire cell-pressure → room dispatch pipeline a dead path.

---

## What the Spec Says

The migration spec v2.5.0 defines exactly **9 cognitive rooms**, each mapped to a terminal application and Discord channel:

| Cell | Spec Room Name | Discord Channel | Terminal |
|------|---------------|-----------------|----------|
| A1 | vault | `#wezterm-vault` | WezTerm |
| A2 | architect | `#vscode-architect` | VS Code |
| A3 | performer | `#terminal-performer` | Alacritty |
| B1 | voice/navigator* | `#terminal-voice` / `#rio-navigator` | Terminal/Rio |
| B2 | network | `#messages-network` | Messages |
| B3 | navigator/voice* | `#rio-navigator` / `#terminal-voice` | Rio/Terminal |
| C1 | builder | `#iterm-builder` | iTerm2 |
| C2 | laboratory | `#cursor-laboratory` | Cursor |
| C3 | operator | `#kitty-operator` | Kitty |

*Note: B1/B3 ↔ voice/navigator assignment is itself drifted (see AP-014), but the **names** vault/architect/builder/etc. are authoritative.*

The `channel-manager.ts` (the canonical room registry) implements these exact names:
```typescript
const ROOMS = [
  'iterm-builder', 'vscode-architect', 'kitty-operator', 'wezterm-vault',
  'terminal-voice', 'cursor-laboratory', 'terminal-performer',
  'rio-navigator', 'messages-network',
];
```

The `shortrank-notation.ts` uses the legacy keys: `vault`, `architect`, `performer`, `voice`, `network`, `navigator`, `builder`, `laboratory`, `operator`.

The `spec-drift-detector.ts` uses the same legacy keys: `vault`, `architect`, `performer`, `navigator`, `network`, `voice`, `builder`, `laboratory`, `operator`.

---

## What the Code Does

`src/grid/hot-cell-router.ts:15-25` defines:

```typescript
const CELL_TO_ROOM: Record<string, string> = {
  A1: '#legal-room',
  A2: '#strategy-room',
  A3: '#finance-room',
  B1: '#speed-room',
  B2: '#deals-room',
  B3: '#signal-room',
  C1: '#ops-room',
  C2: '#loop-room',
  C3: '#flow-room',
};
```

### Cross-Reference: No Consumer Exists

Searched for all 9 phantom room names across the entire `src/` tree:

| Phantom Name | Occurrences Outside hot-cell-router.ts |
|---|---|
| `#legal-room` | 0 (only in hot-cell-router.ts, its test, and markdown docs) |
| `#strategy-room` | 1 (cron/scheduler.ts default room — also wrong) |
| `#finance-room` | 0 |
| `#speed-room` | 0 |
| `#deals-room` | 0 |
| `#signal-room` | 0 |
| `#ops-room` | 0 |
| `#loop-room` | 0 |
| `#flow-room` | 0 |

The `ProactiveScheduler` in `src/cron/scheduler.ts` defaults to `#strategy-room` — a name that also doesn't exist in `channel-manager.ts`. This means the Night Shift Ghost User's default target room is also a phantom.

---

## Impact Analysis

### Severity: CRITICAL

1. **Cell pressure → room routing is completely broken.** When `HotCellRouter.getRoutingRecommendation()` returns `{ room: '#legal-room', ... }`, no downstream system can resolve this to a Discord channel or steering-loop target. The entire hot-cell pressure system is decorative.

2. **Night Shift default room is phantom.** The `ProactiveScheduler` defaults to `#strategy-room`, which has no channel mapping. Ghost User tasks injected without explicit room targeting go nowhere.

3. **Three naming conventions coexist without a translator:**
   - `channel-manager.ts`: `iterm-builder`, `vscode-architect`, etc. (terminal-prefixed)
   - `shortrank-notation.ts` / `spec-drift-detector.ts`: `builder`, `architect`, etc. (legacy keys)
   - `hot-cell-router.ts`: `#legal-room`, `#strategy-room`, etc. (phantom names)

4. **Test files validate phantom behavior.** `hot-cell-router.test.ts` asserts routing to `#legal-room` etc., meaning the tests pass while verifying broken behavior.

---

## Root Cause

The `hot-cell-router.ts` was written with grid-semantic room names (descriptive of cell *function*: legal, strategy, finance) rather than the cognitive room names from the spec (descriptive of *terminal + role*: vault, architect, performer). The `ROOM_LEGACY` map in `channel-manager.ts` was never wired to `hot-cell-router.ts`.

---

## Concrete Patch

### Patch A — Fix HotCellRouter CELL_TO_ROOM (CRITICAL, ~5 LOC)

Replace the phantom names with the legacy room keys used by the rest of the system:

```typescript
const CELL_TO_ROOM: Record<string, string> = {
  A1: 'vault',
  A2: 'architect',
  A3: 'performer',
  B1: 'navigator',    // matches shortrank-notation.ts
  B2: 'network',
  B3: 'voice',        // matches shortrank-notation.ts
  C1: 'builder',
  C2: 'laboratory',
  C3: 'operator',
};
```

### Patch B — Fix ProactiveScheduler Default Room (HIGH, ~1 LOC)

In `src/cron/scheduler.ts`, change the default room from `#strategy-room` to `architect`:

```typescript
// Before:
private defaultRoom = '#strategy-room';
// After:
private defaultRoom = 'architect';
```

### Patch C — Update hot-cell-router.test.ts Assertions (HIGH, ~9 LOC)

Update all test assertions from phantom names to real room keys.

### Patch D — Add Room Name Resolver (MEDIUM, ~20 LOC)

Create a single canonical `CELL_TO_ROOM` constant in `src/grid/index.ts` that all consumers import. Currently this mapping is duplicated in:
- `hot-cell-router.ts` (wrong)
- `shortrank-notation.ts` (correct)
- `spec-drift-detector.ts` (correct)
- `thetasteer-categorize.ts` (correct)
- `channel-manager.ts` ROOM_DESCRIPTIONS (correct, terminal-prefixed)

A single source of truth prevents future drift.

### Patch E — Audit Deep-Linker ROOM_TO_CELLS (LOW)

Verify `deep-linker.ts`'s `ROOM_TO_CELLS` mapping is consistent with the canonical source.

---

## Drift Metrics

| Metric | Value |
|---|---|
| Files affected | 4 (hot-cell-router.ts, scheduler.ts, hot-cell-router.test.ts, + 1 new canonical constant) |
| Total phantom references | 10 (9 room names + 1 scheduler default) |
| Downstream systems silently broken | 2 (pressure routing, ghost user default) |
| Existing tests validating wrong behavior | 1 file (hot-cell-router.test.ts) |
| LOC to fix | ~35 |
| Risk if unfixed | Hot-cell pressure routing dead on arrival at runtime; ghost user tasks lost |

---

## Drift Classification

- **Direction:** `code_diverged` — The code invented room names that were never in the spec
- **Category:** Operations routing / room namespace fragmentation
- **Compound with:** AP-014 (Voice/Navigator cell swap affects which room B1/B3 resolves to once this is fixed)

---

## Recommended Execution Order

1. **AP-014 Patch 1 first** — Resolve Voice/Navigator swap so B1/B3 assignments are authoritative
2. **AP-015 Patch A** — Fix HotCellRouter with correct names
3. **AP-015 Patch B** — Fix scheduler default room
4. **AP-015 Patch C** — Fix test assertions
5. **AP-015 Patch D** — Extract canonical CELL_TO_ROOM constant

---

*Detected by Recursive Documentation Mode, Room 📐 A2 Strategy.Goal*
*IntentGuard Trust Debt Pipeline — Alignment Proposal #015*
