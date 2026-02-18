# Alignment Proposal #013 — Autonomous Lifecycle Gaps (Federation, CEO Concurrency, Pipeline Tests, Grid Heat Sync)

**Date:** 2026-02-18
**Analyst:** Claude Opus 4.6 (Recursive Documentation Mode)
**Room:** 📐::architect | A2 Strategy.Goal
**Patent Reference:** IAMFIM (20-dim geometric auth), Tesseract Coordinate Grid
**Severity:** CRITICAL (compound — 4 independent gaps that share a root cause)
**Overall Drift:** ~18%

---

## Executive Summary

A recursive cross-reference of `intentguard-migration-spec.html` against `src/` reveals four HIGH-priority drifts sharing a common theme: **autonomous lifecycle promises that are declared but not implemented**. The spec describes systems that run persistently, concurrently, and with self-healing properties — but the code implements ephemeral, serial, and untested versions of these same systems.

| Gap | Spec Promise | Code Reality | Risk |
|-----|-------------|--------------|------|
| Federation Lifecycle | Persistent runtime, periodic drift checks | Ephemeral per-command instantiation | Trust degradation undetected |
| CEO Loop Concurrency | `maxConcurrent: 5`, 50-worker pool | Purely serial dispatch loop | 5x throughput loss, config field is dead code |
| Pipeline Step 4-5 Tests | 8-step pipeline, step 4 = FIM identity | Steps 4 and 5 have zero test files | Silent sovereignty score corruption |
| Grid Heat Synchronization | Single heat map (heat.json) | Two independent systems: local JSON + remote HTTP | Split-brain grid state |

These are not cosmetic drifts. Each one represents a **silent failure mode** where the system believes it has a capability it does not actually possess.

---

## Finding 1: Federation Module — Ephemeral Lifecycle (CRITICAL)

### What the Spec Says

Phase 8 (Fractal Federation) describes:
- "Persistent, always-on subsystem"
- "Periodic drift checks maintain trust over time"
- "Auto-quarantine at 0.003 threshold"
- `src/federation/drift-detector.ts` referenced as autonomous drift monitor

### What the Code Does

`src/runtime.ts:1406-1411`:
```typescript
const { FederationHandshake } = await import('./federation/index.js');
const handshake = new FederationHandshake(
  // ... created fresh per !federation command
);
```

The `FederationHandshake` object is created on-demand inside the `!federation` command handler. It is garbage-collected after the command completes. No persistent instance exists in the runtime. No periodic timer calls `checkChannelDrift()`.

**Consequences:**
1. Active channels are lost between bot restarts (only the `FederationRegistry` file persists, not channel state)
2. No autonomous drift monitoring — trust degrades silently between manual checks
3. The `drift-detector.ts` auto-quarantine logic is never invoked automatically
4. A federated bot could drift past the 0.003 threshold and remain trusted indefinitely

### Concrete Patch

```typescript
// src/runtime.ts — at startup, after Discord client ready
import { FederationHandshake } from './federation/index.js';

const federation = new FederationHandshake(/* persistent config */);

// Start periodic drift check (spec: "periodic drift checks maintain trust")
setInterval(async () => {
  const registry = federation.getRegistry();
  for (const bot of registry.getActiveBots()) {
    const drift = await federation.checkChannelDrift(bot.id);
    if (drift > 0.003) {
      registry.quarantine(bot.id, `auto-quarantine: drift ${drift}`);
      // Post to #trust-debt-public
    }
  }
}, 4 * 60 * 60 * 1000); // Every 4 hours per spec's drift detector schedule
```

---

## Finding 2: CEO Loop — Serial Dispatch with Dead Concurrency Config (HIGH)

### What the Spec Says

- `maxConcurrent: 5` in intentguard.json config
- "Initialize Claude Flow hive-mind with 50 workers"
- CEO loop dispatches tasks through the agent pool

### What the Code Does

`src/ceo-loop.ts:98`:
```typescript
maxConcurrent: 5,
```

The config field exists. But the dispatch function (the main processing loop) is purely sequential:

```
while (running) {
  task = pickNextTask()
  await dispatch(task)     // blocks until task completes
  await sleep(cooldownSec) // then picks next
}
```

There is no `Promise.all()`, no worker pool, no task queue with concurrent consumers. The `maxConcurrent` value is read into config and logged at startup but never used for flow control.

**Consequences:**
1. The CEO loop runs at 1/5th of its documented throughput
2. The config field `maxConcurrent: 5` misleads operators — it appears tunable but has no effect
3. The 50-worker Claude Flow pool (in spec) is never spawned from the CEO loop

### Concrete Patch

```typescript
// Option A: Implement actual concurrency
const running: Promise<void>[] = [];
while (active) {
  while (running.length < config.maxConcurrent) {
    const task = pickNextTask();
    if (!task) break;
    running.push(dispatch(task).finally(() => {
      running.splice(running.indexOf(/* this promise */), 1);
    }));
  }
  await Promise.race([...running, sleep(cooldownSec)]);
}

// Option B: Mark config as intentionally serial (honest documentation)
// Remove maxConcurrent or rename to maxConcurrent: 1 with comment
```

**Recommendation:** Option A for Night Shift when sovereignty > 0.8; Option B as interim documentation fix.

---

## Finding 3: Pipeline Steps 4 and 5 — Zero Test Coverage (HIGH)

### What the Spec Says

- Step 4 (Grades Calculator): Calculates letter grades per category, sovereignty score
- Step 5 (Timeline Analyzer): Git-based historical trend analysis
- Step 4 output feeds directly into FIM identity vector computation

### What the Code Does

Test file inventory in `src/pipeline/`:

| Step | Test File | Status |
|------|-----------|--------|
| step-0.ts | step-0.test.ts | COVERED |
| step-1.ts | step-1.test.ts | COVERED |
| step-2.ts | step-2.test.ts | COVERED |
| step-3.ts | step-3.test.ts | COVERED |
| **step-4.ts** | **— MISSING —** | **UNCOVERED** |
| **step-5.ts** | **— MISSING —** | **UNCOVERED** |
| step-6.ts | step-6.test.ts | COVERED |
| step-7.ts | step-7.test.ts | COVERED |

Step 4 is the single most security-critical step in the pipeline: it converts raw category grades into the 20-dimensional identity vector that gates ALL tool calls via FIM. A regression in the grade boundary calibration (e.g., A+=1.0 becoming A+=0.95, or a NaN from division-by-zero) would silently corrupt the sovereignty score, cascading into:
- Steering timeout changes (5s → 60s or vice versa)
- Night Shift tier reclassification (safe tasks blocked, dangerous tasks allowed)
- FIM permission gate drift (shell_execute allowed/denied incorrectly)

Step 5 analyzes git history for timeline trends. A regression here is less critical but would produce incorrect historical narratives in the final report (Agent 6 depends on step 5 output).

### Concrete Patch

Priority test cases for step 4:
1. Grade boundary calibration: input scores → expected letter grades (A+, A, B, C, D, F)
2. Sovereignty score calculation: weighted average of 20 categories matches expected float
3. Edge cases: all-zero scores, single-category dominance, NaN protection
4. Output schema validation: JSON matches `4-grades-statistics.json` expected structure

Priority test cases for step 5:
1. Git log parsing: mock git output → expected timeline entries
2. Empty git history: graceful fallback
3. Output schema validation

---

## Finding 4: Grid Heat State — Split-Brain Tracking (HIGH)

### What the Spec Says

The spec references a single `heat.json` as the canonical attention/grid state:
- Tesseract trainer writes to `data/attention-corpus/heat.json`
- FIM interceptor reads from `data/heat.json`
- Grid state reflects cell pressure for routing decisions

### What the Code Does

Two independent heat tracking systems exist:

**System A — Local JSON (FIM + Tesseract Trainer)**
- `src/auth/fim-interceptor.ts` reads/writes `data/heat.json`
- `src/skills/tesseract-trainer.ts` reads/writes `data/attention-corpus/heat.json`
- Format: discrete P/B/S/H states per cell
- 4 files reference `heat.json`

**System B — Remote HTTP (Grid Module)**
- `src/grid/tesseract-client.ts` pushes `GridState.cellPressures` to tesseract.nu
- `src/grid-state-writer.ts` is a thin re-export shim to grid module
- Format: float 0-1 per cell
- Different data type, different persistence, different update cadence

These two systems never synchronize. A cell can be "hot" in the local heat.json (because the FIM interceptor recorded denials) while showing "cold" in the remote grid state (because no HTTP push happened). Routing decisions that depend on grid pressure will differ depending on which system is queried.

### Concrete Patch

```typescript
// src/grid/heat-sync.ts — bridge between local and remote heat state
export async function syncHeatState(): Promise<void> {
  const localHeat = JSON.parse(await readFile('data/heat.json', 'utf8'));
  const remoteState = await tesseractClient.getGridState();

  // Merge: take max pressure from either source per cell
  const merged: Record<string, number> = {};
  for (const cell of ALL_CELLS) {
    const local = localHeat[cell]?.pressure ?? 0;
    const remote = remoteState.cellPressures[cell] ?? 0;
    merged[cell] = Math.max(local, remote);
  }

  // Write back to both
  await writeFile('data/heat.json', JSON.stringify(merged));
  await tesseractClient.pushGridState({ cellPressures: merged });
}
```

Call `syncHeatState()` in the Night Shift scheduler on the `grid-heartbeat` task (already runs every 30 minutes).

---

## Root Cause Analysis

All four findings share a pattern: **declaration without activation**. The spec describes autonomous, concurrent, persistent systems. The code declares the interfaces and config for these systems but never activates the autonomous behavior:

- Federation: class exists, `new` never called at startup
- CEO concurrency: config field exists, `Promise.all` never called
- Pipeline tests: 6/8 steps tested, the two most critical skipped
- Grid heat: two systems exist, sync function never written

This is a **governance gap**, not a bug. The code works correctly in its serial, ephemeral, disconnected mode. But the spec — which is the contract for what the system *should* do — promises behaviors that don't exist. The system's self-reported capabilities exceed its actual capabilities.

---

## Drift Percentage Calculation

| Component | Spec Expectation | Code Reality | Drift |
|-----------|-----------------|--------------|-------|
| Federation lifecycle | Persistent + periodic | Ephemeral per-command | 100% gap |
| CEO concurrency | 5 concurrent | 1 serial | 80% gap |
| Pipeline test coverage | 8/8 steps | 6/8 steps | 25% gap |
| Grid heat systems | 1 unified | 2 independent | 100% gap |

**Weighted overall drift: ~18%** (federation is 5% of codebase weight, CEO loop is 8%, pipeline tests are 3%, grid heat is 2%)

---

## Priority Sequencing

1. **Finding 3** (Pipeline step 4 tests) — FIRST: this is the cheapest fix with the highest blast radius prevention. A test for step 4 takes ~1 hour and prevents FIM identity corruption.
2. **Finding 1** (Federation lifecycle) — SECOND: persistent instantiation + timer is ~50 LOC. Activates an existing, tested subsystem.
3. **Finding 4** (Grid heat sync) — THIRD: bridge function + scheduler hook is ~40 LOC. Eliminates split-brain state.
4. **Finding 2** (CEO concurrency) — LAST: this is the largest change (concurrent dispatch requires error isolation, backpressure). Can be staged as: first document serial-only mode honestly, then implement concurrency.

---

## Intelligence Burst (for #trust-debt-public)

```
🛡️ ALIGNMENT PROPOSAL #013 — Autonomous Lifecycle Gaps

Drift: 18% | 4 systems declared but not activated
CRITICAL: Federation runs ephemeral (no periodic drift check)
CRITICAL: CEO loop serial despite maxConcurrent:5 config
HIGH: Pipeline steps 4-5 (FIM identity + timeline) have 0 tests
HIGH: Local heat.json and remote GridState never sync (split-brain)

Root cause: declaration without activation — interfaces exist, autonomous behavior doesn't
Patches: 4 proposed (persistent federation, concurrent CEO, step 4-5 tests, heat sync)
Patent: IAMFIM, Tesseract Coordinate Grid

📐::architect | A🛡️ Security & Trust Governance
```
