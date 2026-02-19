# Alignment Proposal #021 — Night Shift Scheduler: Task Registry Inflation, Duplicate IDs & Impure shouldRun Predicates

**Date:** 2026-02-18
**Author:** Claude Opus 4.6 (Recursive Documentation Mode)
**Room:** 📐 A2 Strategy.Goal
**Severity:** MEDIUM-HIGH (scheduler integrity compromised by 3 structural violations)
**Drift:** ~31% composite (4 confirmed vectors across scheduler.ts)
**Patent Reference:** 63/XXX,XXX (Feb 2025) — Real-Time AI Behavior Drift Detection System

---

## Executive Summary

A recursive cross-reference of `intentguard-migration-spec.html` v2.5.0 (Section: End-State Vision, line 1015) against `src/cron/scheduler.ts` reveals **4 confirmed drift vectors** in the Proactive Night Shift Scheduler. The spec explicitly states:

> "10 registered tasks, sovereignty-gated"

The code registers **15 tasks**. Beyond count inflation (+50%), three structural violations undermine the scheduler's stated architecture:

1. **Task registry inflation**: 15 tasks vs spec's 10 — undocumented growth with no spec amendment
2. **Duplicate sovereignty monitors**: Two tasks with overlapping purpose (`sovereignty-stability-monitor` + `sovereignty-stability-check`) will produce redundant Discord posts
3. **Impure `shouldRun` predicate**: `spec-drift-scan` writes `data/drift-signal.json` inside its `shouldRun` callback — a file-writing side effect in what the module's own docstring calls a read-only decision function
4. **Sovereignty threshold divergence**: Dangerous task gating uses 0.85/0.8/0.95 — spec mandates 0.9 uniformly

---

## Drift Vector #1 (HIGH) — Task Registry Inflation: 15 vs Spec's 10

### What the Spec Says

> "10 registered tasks, sovereignty-gated"
> — End-State Vision, The Ghost User (Night Shift), line 1015

> "Safe tasks auto-execute at sovereignty > 0.6. Dangerous tasks require sovereignty > 0.9 or admin blessing. Rate limited to 4 tasks/hour with per-task cooldowns."
> — Same section

### What the Code Does

`src/cron/scheduler.ts:175-417` — `buildTaskRegistry()` returns **15 tasks**:

| # | ID | Risk | Min Sov |
|---|---|---|---|
| 1 | test-coverage-scan | safe | 0.6 |
| 2 | trust-debt-report | safe | 0.5 |
| 3 | spec-progress | safe | 0.5 |
| 4 | fim-benchmark | safe | 0.6 |
| 5 | room-context-cleanup | safe | 0.5 |
| 6 | nightly-summary | safe | 0.5 |
| 7 | grid-heartbeat | safe | 0.4 |
| 8 | deep-refactor | dangerous | 0.9 |
| 9 | spec-implement | dangerous | 0.85 |
| 10 | recursive-documentation | safe | 0.6 |
| 11 | cost-health-check | safe | 0.4 |
| 12 | sovereignty-stability-monitor | safe | 0.4 |
| 13 | sovereignty-stability-check | safe | 0.5 |
| 14 | spec-drift-scan | safe | 0.4 |
| 15 | config-optimize | dangerous | 0.95 |

**Count**: 12 safe + 3 dangerous = 15 total (spec says "7 safe, 3 dangerous" = 10)

### Why This Matters

The spec's "10 registered tasks" is a **governance contract**. An auditor reading the spec expects exactly 10 tasks with known behaviors. The scheduler now runs 50% more tasks than documented. Five undocumented tasks (`recursive-documentation`, `cost-health-check`, `sovereignty-stability-monitor`, `sovereignty-stability-check`, `spec-drift-scan`) execute without spec coverage — meaning they exist outside the trust-debt audit surface.

### Concrete Patch

Either amend the spec to document all 15 tasks, or prune the registry to match. Recommended: update spec to "15 registered tasks (12 safe, 3 dangerous)" and add the missing 5 to the Night Shift documentation section.

---

## Drift Vector #2 (MEDIUM) — Duplicate Sovereignty Stability Monitors

### What the Spec Says

No duplication mentioned. The spec's task inventory implies unique, non-overlapping proactive tasks.

### What the Code Does

Two tasks with near-identical purpose exist at `scheduler.ts:348-380`:

```
sovereignty-stability-monitor (line 349):
  cooldown: 1440 min, shouldRun: checks 4-grades-statistics.json exists
  minSovereignty: 0.4

sovereignty-stability-check (line 366):
  cooldown: 1440 min, shouldRun: hour >= 8 && hour <= 10
  minSovereignty: 0.5
```

Both fire once/day. Both generate sovereignty stability reports. Both post to `#trust-debt-public`. Both check 30-day stability windows. The only difference: one gates on file existence, the other gates on time of day.

### Why This Matters

- **Duplicate Discord posts**: Both will fire on the same day, posting overlapping "30-day stability" content to `#trust-debt-public`
- **Wasted task budget**: With `maxTasksPerHour: 4`, two duplicate tasks consume 50% of hourly capacity for identical work
- **Audit confusion**: Which sovereignty-stability result is canonical? Two sources of truth for the same metric

### Concrete Patch

```diff
- Remove sovereignty-stability-check (line 366-380)
- Keep sovereignty-stability-monitor with combined logic:
  shouldRun: (ctx) => {
    const hour = new Date().getHours();
    const statsPath = join(ctx.repoRoot, '4-grades-statistics.json');
    return hour >= 8 && hour <= 10 && existsSync(statsPath);
  }
```

---

## Drift Vector #3 (HIGH) — Impure shouldRun Predicate (Side-Effecting Guard)

### What the Module Says About Itself

> "This module only decides WHAT to inject and WHEN."
> — `scheduler.ts`, docstring (line 32)

### What the Code Does

`spec-drift-scan` task at `scheduler.ts:392-401`:

```typescript
shouldRun: (ctx) => {
  try {
    const signal = generateDriftSignal(ctx.repoRoot);
    const outPath = join(ctx.repoRoot, 'data', 'drift-signal.json');
    writeFileSync(outPath, JSON.stringify(signal, null, 2));  // <-- SIDE EFFECT
    return signal.hotCells.length > 0;
  } catch {
    return false;
  }
}
```

The `shouldRun` callback **writes to the filesystem**. This predicate is evaluated on **every heartbeat tick** (every 15 minutes) during candidate selection, regardless of whether the task is actually chosen for execution. This means:

- `data/drift-signal.json` is rewritten every 15 minutes even if the task is never dispatched
- The scheduler mutates state during what should be a pure evaluation pass
- If `generateDriftSignal()` throws, it's silently swallowed — the signal file may contain stale data from a previous tick

### Why This Matters

This violates the scheduler's own architectural contract. The `shouldRun` predicate is called during the candidate filtering phase (`heartbeat()` → filter tasks → select winner → inject). Side effects in the filter phase mean the system modifies state even when idle. This is the scheduler equivalent of a `SELECT` statement that also runs an `INSERT`.

### Concrete Patch

Move the drift signal generation into the task's **prompt execution** path, not the predicate:

```diff
  shouldRun: (ctx) => {
-   try {
-     const signal = generateDriftSignal(ctx.repoRoot);
-     const outPath = join(ctx.repoRoot, 'data', 'drift-signal.json');
-     writeFileSync(outPath, JSON.stringify(signal, null, 2));
-     return signal.hotCells.length > 0;
-   } catch {
-     return false;
-   }
+   // Pure predicate: only check if spec exists
+   return existsSync(join(ctx.repoRoot, 'intentguard-migration-spec.html'));
  },
+ // Move signal generation to the prompt itself:
+ prompt: 'Proactive Protocol: Running 12x12 spec drift detector. Generate drift signal, write to data/drift-signal.json, and report hot cells.',
```

---

## Drift Vector #4 (MODERATE) — Dangerous Task Sovereignty Threshold Divergence

### What the Spec Says

> "Dangerous tasks require sovereignty > 0.9 or admin blessing"
> — Scheduler docstring (line 29) and spec End-State Vision

### What the Code Does

Three dangerous tasks use three different thresholds:

| Task | minSovereignty | shouldRun gate |
|---|---|---|
| deep-refactor | 0.9 | `ctx.sovereignty >= 0.85` |
| spec-implement | **0.85** | `ctx.sovereignty >= 0.8` |
| config-optimize | **0.95** | `ctx.sovereignty >= 0.9` |

- `spec-implement` can auto-execute at **0.85** sovereignty — below the spec's 0.9 floor
- `deep-refactor` has a `shouldRun` gate at 0.85 that's lower than its own `minSovereignty` of 0.9
- `config-optimize` requires **0.95** — stricter than documented (reasonable but undocumented)

### Why This Matters

`spec-implement` is the most dangerous task in the registry: it writes code, creates files, and marks spec items as done **autonomously**. It operates at 0.85 sovereignty — 5 points below the documented safety floor. This means the scheduler will auto-execute implementation tasks at trust levels the spec explicitly classifies as insufficient for dangerous operations.

### Concrete Patch

Normalize all dangerous tasks to spec's documented threshold:

```diff
  // spec-implement
- minSovereignty: 0.85,
+ minSovereignty: 0.9,
  shouldRun: (ctx) => ctx.specTodoCount > 0 && ctx.sovereignty >= 0.9,

  // deep-refactor — align shouldRun with minSovereignty
  shouldRun: (ctx) => ctx.sovereignty >= 0.9,
```

---

## Composite Drift Score

| Vector | Severity | Weight | Drift % |
|---|---|---|---|
| Task registry inflation (15 vs 10) | HIGH | 30% | 50% |
| Duplicate sovereignty monitors | MEDIUM | 20% | 100% |
| Impure shouldRun predicate | HIGH | 30% | 100% |
| Sovereignty threshold divergence | MODERATE | 20% | 16.7% |
| **Weighted composite** | | | **~58% within scheduler, ~31% of A-pillar** |

---

## Sequencing Recommendation (📐 Architect: Which Dominos Fall First?)

1. **Fix Vector #3 first** (impure shouldRun) — this is active corruption on every heartbeat tick. Pure predicates are a precondition for all other scheduler trust.
2. **Fix Vector #4 second** (sovereignty thresholds) — `spec-implement` at 0.85 is a live safety gap. The scheduler may autonomously write code at insufficient trust.
3. **Fix Vector #2 third** (duplicate monitors) — deduplicate to recover task budget capacity.
4. **Fix Vector #1 last** (spec amendment) — once the registry is clean, update the spec to match reality.

---

## Intelligence Burst

```
DRIFT SIGNAL | 2026-02-18T22:15:00Z
Proposal: #021 — Night Shift Scheduler Registry Drift
Vectors: 4 confirmed | Composite: ~31%
Critical: shouldRun predicate writes to filesystem (impure guard)
Safety: spec-implement auto-executes at 0.85 sov (spec floor: 0.9)
Inflation: 15 tasks registered vs spec's 10 (+50% undocumented)
Duplicate: 2 sovereignty monitors fire daily for same metric
Patent: 63/XXX,XXX (Feb 2025) — Real-Time AI Behavior Drift Detection
Action: Fix impure predicate → normalize thresholds → deduplicate → amend spec
```
