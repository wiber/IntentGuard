# Alignment Proposal #017 — Wrapper Entry Point & Cortex Worker Architectural Drift

**Date:** 2026-02-18
**Author:** Claude Opus 4.6 (Recursive Documentation Mode)
**Room:** 📐 A2 Strategy.Goal
**Severity:** CRITICAL (spec describes architecture that doesn't match running system)
**Drift:** ~31% composite (5 confirmed vectors, 2 critical, 2 moderate, 1 low)
**Patent Reference:** 63/XXX,XXX (Feb 2025) — Real-Time AI Behavior Drift Detection System

---

## Executive Summary

A recursive audit of `intentguard-migration-spec.html` v2.5.0 against `src/` reveals **5 confirmed drift vectors** centered on the system's entry point architecture. The most severe: the spec's "NOW LIVE" summary (line 970) claims `wrapper.ts` is the **unified entry point** containing FIM plugin v2.0 + Night Shift scheduler + CEO loop v2. In reality, `wrapper.ts` contains only FIM + skill registration. Night Shift lives in `runtime.ts`. CEO Loop is a standalone process. And a fully functional `cortex-worker.ts` — a queue-consumer architecture that *replaces* the CEO Loop model — exists with zero spec coverage. Any operator bootstrapping from the spec will misconfigure the system.

---

## Drift Vector #1 (CRITICAL) — wrapper.ts "NOW LIVE" Claims Are False

### What the Spec Says

> "NOW LIVE: wrapper.ts unified entry point with FIM plugin v2.0, Night Shift scheduler, CEO loop v2."
> — Migration Spec v2.5.0, line 970

The spec presents `wrapper.ts` as the single sovereign engine combining all three subsystems.

### What the Code Does

`src/wrapper.ts` (631 lines) contains:
- FIM Auth Plugin v2.0 installation → `~/.openclaw/plugins/intentguard-fim-auth.js`
- 8 skill registrations (spec says 6)
- LLM backend wiring (Ollama + Sonnet)
- OpenClaw gateway child process spawning
- WebSocket parasite hook

**Missing from wrapper.ts:**
- No `import` of `ProactiveScheduler` (Night Shift) — that lives in `runtime.ts:39`
- No `import` of `ceoLoop` — that lives in `ceo-loop.ts:841` as standalone CLI
- No `startCeoLoop()` or `startScheduler()` calls

### Impact

Any agent, operator, or automated system reading the spec will expect `npx tsx src/wrapper.ts` to start the full Sovereign Engine. It does not. Three separate processes must be launched independently:
1. `npx tsx src/wrapper.ts` — FIM + skills + OpenClaw gateway
2. `npx tsx src/runtime.ts` — Discord + Night Shift + steering loop
3. `npx tsx src/ceo-loop.ts` — autonomous task execution

The spec's own integration checklist (line 1672) marks "Merge wrapper.ts + runtime.ts into single entry point" as `check-todo`, acknowledging the split — but this contradicts the "NOW LIVE" summary above it.

### Concrete Patch

**Option A (Documentation fix — minimum viable):**
Update spec line 970 to:
```
"NOW LIVE: Three-process architecture:
 - wrapper.ts (FIM + skills + gateway)
 - runtime.ts (Discord + Night Shift + steering)
 - ceo-loop.ts (autonomous task execution, standalone)"
```

**Option B (Code fix — complete the merge):**
Add to `wrapper.ts`:
```typescript
import { ProactiveScheduler } from './cron/scheduler.js';
import { ceoLoop } from './ceo-loop.js';

// In startSovereignEngine():
const scheduler = new ProactiveScheduler({ ... });
scheduler.start();
if (config.enableCeoLoop) ceoLoop(ceoConfig);
```

**Recommendation:** Option A first (immediate spec accuracy), Option B as tracked task.

---

## Drift Vector #2 (CRITICAL) — cortex-worker.ts Is Undocumented Architectural Evolution

### What the Spec Says

Nothing. `cortex-worker.ts` does not appear anywhere in the migration spec's 3,241 lines.

### What the Code Does

`src/cortex-worker.ts` (353 lines) is a fully implemented queue consumer:
- Polls `openclaw/data/task-queue/cortex.jsonl` every 30s for pending tasks
- Claims tasks with worker ID + timestamp (atomic JSONL append)
- Executes via dispatch handlers (skeleton creation, shell commands, wiring)
- Writes results to `IntentGuard/data/shared/cortex-results.jsonl`
- Has its own circuit breaker (`maxConsecutiveFailures: 5`)

The file's own header comment says:
> "Replaces the always-on CEO Loop with a queue consumer model."

### Impact

This represents an **architectural fork**: the spec describes a CEO-loop-centric architecture (scan spec → subdivide → execute → heartbeat), while the code has evolved toward a queue-consumer model (OpenClaw dispatches → Cortex claims → executes → reports). These are fundamentally different coordination patterns:

| Dimension | CEO Loop (spec) | Cortex Worker (code) |
|-----------|----------------|---------------------|
| Initiative | Pull (scan spec) | Push (queue from OpenClaw) |
| Scheduling | Self-directed (60s poll) | External dispatch |
| Circuit breaker | 3 failures | 5 failures |
| Task source | `intentguard-migration-spec.html` | `cortex.jsonl` queue |
| Cross-repo | Reads local spec | Reads OpenClaw queue file |

Both exist simultaneously with no coordination mechanism. An operator cannot know which to run.

### Concrete Patch

**Minimum viable:**
Add to spec Section "Module Migration Status" a new tile:
```html
<div class="card">
  <div class="card-header">
    <span>🧠 <strong>Cortex Worker</strong></span>
    <span class="badge badge-building">building</span>
  </div>
  <div class="detail">Queue consumer model — receives tasks from OpenClaw dispatch.
    Alternative to CEO Loop polling. 353 LOC, circuit breaker, JSONL persistence.</div>
  <div style="margin-top:0.5rem;font-size:0.8rem">
    <span class="mono">intentguard/src/cortex-worker.ts</span>
  </div>
  <div style="margin-top:0.3rem"><span class="badge badge-high">risk: high</span></div>
</div>
```

**Full fix:** Decide whether Cortex Worker replaces CEO Loop or they coexist. Document the decision in `docs/ARCHITECTURAL-DECISIONS.md`.

---

## Drift Vector #3 (MODERATE) — Night Shift Task Count Expansion

### What the Spec Says

- Line 1015: "10 registered tasks (7 safe, 3 dangerous)"
- Line 2843: "12 registered tasks" (updated claim)
- Line 2930: "498 lines, fully implemented"

### What the Code Does

`src/cron/scheduler.ts` (625 lines, not 498) registers **15 tasks (12 safe, 3 dangerous)**:

| Task ID | Risk | Spec Coverage |
|---------|------|---------------|
| test-coverage-scan | safe | In spec |
| trust-debt-report | safe | In spec |
| spec-progress | safe | In spec |
| fim-benchmark | safe | In spec |
| room-context-cleanup | safe | In spec |
| nightly-summary | safe | In spec |
| grid-heartbeat | safe | In spec |
| deep-refactor | dangerous | In spec |
| spec-implement | dangerous | In spec |
| recursive-documentation | safe | **NOT in spec** |
| cost-health-check | safe | **NOT in spec** |
| sovereignty-stability-monitor | safe | **NOT in spec** |
| sovereignty-stability-check | safe | **NOT in spec** |
| spec-drift-scan | safe | **NOT in spec** |
| config-optimize | dangerous | **NOT in spec** |

5 tasks were added without spec updates. Risk gating logic matches correctly (safe → sovereignty > 0.6, dangerous → sovereignty > 0.9). Rate limiting matches (4/hour).

### Concrete Patch

Update spec line 1015 to: "15 registered tasks (12 safe, 3 dangerous)" and line 2930 to "625 lines".

---

## Drift Vector #4 (MODERATE) — CEO Loop inotify/fswatch Claim

### What the Spec Says

> "Wire CEO loop to spec watcher: inotify/fswatch for spec changes" — marked `check-done`

### What the Code Does

`src/ceo-loop.ts` uses a `setTimeout` polling loop at line 674, calling `readSpecTodos()` every 60s. No `fs.watch()`, no `chokidar`, no `fswatch` subprocess exists anywhere in the file. The comment at line 7 says "watching spec for changes every 60s" — which is polling, not event-driven.

### Impact

Polling works fine for the current use case. But the spec's claim of `inotify/fswatch` is factually incorrect — this is documented capability that doesn't exist. The checklist item should be unchecked or the description changed to "polling."

### Concrete Patch

Change spec Phase 9 checklist item from:
```
✅ Wire CEO loop to spec watcher: inotify/fswatch for spec changes
```
to:
```
✅ Wire CEO loop to spec watcher: 60s polling interval (inotify/fswatch deferred)
```

---

## Drift Vector #5 (LOW) — Grid State Writer Remote Push Bypass

### What the Spec Says

Phase 4 checklist (line 795): "Wire task completions to POINTER_CREATE events on grid" — marked `check-done`.
Integration checklist (line 1672): Same item — marked `check-todo`.

Internal contradiction in spec.

### What the Code Does

- `src/grid-state-writer.ts` re-exports from `src/grid/event-bridge.ts` and `src/grid/tesseract-client.ts`
- `recordTaskCompletion()` emits local POINTER_CREATE events AND pushes to remote tesseract.nu
- `ceo-loop.ts:773` calls `gridEventBridge.onTaskComplete()` directly — bypassing the remote push path
- Local events work; remote tesseract.nu push is functionally unhooked

### Concrete Patch

In `ceo-loop.ts`, change line 773 from:
```typescript
gridEventBridge.onTaskComplete(task);
```
to:
```typescript
await recordTaskCompletion(task);
```
This hooks both local event emission and remote POINTER_CREATE push.

---

## Composite Drift Score

| Vector | Severity | Weight | Score |
|--------|----------|--------|-------|
| #1 wrapper.ts false claims | CRITICAL | 10 | 10 |
| #2 cortex-worker.ts undocumented | CRITICAL | 10 | 10 |
| #3 Night Shift task count | MODERATE | 5 | 5 |
| #4 inotify/fswatch claim | MODERATE | 5 | 5 |
| #5 Grid remote push bypass | LOW | 3 | 1 |

**Total: 31/100 = 31% composite drift**

---

## Priority Sequence (Dominos)

1. **FIX SPEC LINE 970** — Remove false "NOW LIVE" unified claim. Document 3-process reality.
2. **ADD cortex-worker.ts to spec** — Acknowledge the architectural fork. Decide CEO Loop vs Queue Consumer.
3. **UPDATE task counts** — 15 tasks (12 safe, 3 dangerous), 625 lines.
4. **CORRECT inotify claim** — Change to "polling" or implement real fswatch.
5. **WIRE remote push** — `recordTaskCompletion()` instead of `gridEventBridge.onTaskComplete()`.

---

## Intelligence Burst (for #trust-debt-public)

```
🛡️ DRIFT DETECTED — AP-017
📐 wrapper.ts entry point architecture
📊 31% composite drift (5 vectors, 2 critical)
🔴 Spec claims wrapper.ts = unified engine (FIM + Night Shift + CEO Loop)
🔴 Reality: 3 separate processes, no in-process integration
🔴 cortex-worker.ts (353 LOC) exists with ZERO spec coverage
🟡 Night Shift grew from 10→15 tasks without spec update
🟡 inotify/fswatch claim is polling in disguise
⚡ Patent: 63/XXX,XXX — Real-Time AI Behavior Drift Detection
🎯 Fix sequence: spec line 970 → add cortex-worker → update counts → wire grid push
```
