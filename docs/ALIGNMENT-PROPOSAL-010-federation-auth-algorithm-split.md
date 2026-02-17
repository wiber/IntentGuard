# Alignment Proposal 010: Federation vs Auth Algorithm Split + CEO Concurrency Gap

**Date:** 2026-02-17
**Analyst:** Claude Opus 4.6 (Recursive Documentation Mode)
**Spec Version:** v2.5.0 — Modular TSX Spec (27 sections)
**Drift Percentage:** ~18% (5 confirmed divergences, 2 nominal, across 7 audit points)
**Patent Reference:** IAMFIM 20-dim tensor overlap — the "Guard" equation has two competing definitions of "overlap"

---

## Executive Summary

Prior proposals (001-FIM-OVERLAP) identified that `computeOverlap()` uses pass/fail ratio instead of cosine similarity. This proposal identifies a **new compounding problem**: `src/federation/tensor-overlap.ts` implements the *correct* cosine similarity algorithm but **duplicates the math helpers** instead of importing them from `geometric.ts`. The system now has two parallel "overlap" definitions that produce different numbers for the same inputs, with no shared code path.

Additionally, the spec's "50 concurrent agents" claim is architecturally true (`AgentPool`) but operationally false (`ceo-loop.ts` caps at 5).

---

## Finding 1 (CRITICAL): Duplicated Math Helpers — Two Implementations, No Shared Code

### What the Spec Says

The spec describes ONE tensor overlap system:
> "Implemented: Real 20-dimensional vector math with dot product, cosine similarity"

Federation and FIM auth both reference "tensor overlap" as a unified concept.

### What the Code Does

**`src/auth/geometric.ts`** exports:
- `dotProduct(a, b)` — with dimension mismatch validation (line 88)
- `magnitude(v)` — uses `dotProduct(v, v)` (line 108)
- `cosineSimilarity(a, b)` — clamps to [-1, 1] (line 125-137)
- `computeOverlap()` — uses **pass/fail ratio**, NOT cosine similarity (line 159)

**`src/federation/tensor-overlap.ts`** re-implements:
- `dotProduct(a, b)` — local copy, NO dimension check (line 47-49)
- `magnitude(v)` — local copy, NOT using dotProduct internally (line 54-56)
- `cosineSimilarity(a, b)` — uses `Math.abs()` to force [0,1] range (line 62-71)
- `computeTensorOverlap()` — uses TRUE cosine similarity (line 98)

The federation module imports `TRUST_DEBT_CATEGORIES` from `geometric.ts` (line 18) but **does not import** the math helpers, instead providing its own copies.

### Why This Matters

1. **Behavioral divergence**: `geometric.ts` `cosineSimilarity()` returns [-1, 1] with clamping. `tensor-overlap.ts` returns [0, 1] via `Math.abs()`. For anti-correlated vectors, geometric.ts returns negative; tensor-overlap.ts returns positive. A bot with an *inverted* trust profile would be rejected by `geometric.ts` but accepted by `tensor-overlap.ts`.

2. **Robustness divergence**: `geometric.ts` `dotProduct()` throws on dimension mismatch. `tensor-overlap.ts` `dotProduct()` silently returns wrong values on mismatched dimensions.

3. **Maintenance hazard**: A fix to one `dotProduct()` does not propagate to the other.

### Concrete Patch

```diff
--- a/src/federation/tensor-overlap.ts
+++ b/src/federation/tensor-overlap.ts
@@ -16,38 +16,9 @@

-import { TRUST_DEBT_CATEGORIES, TrustDebtCategory } from '../auth/geometric';
+import {
+  TRUST_DEBT_CATEGORIES,
+  TrustDebtCategory,
+  dotProduct,
+  magnitude,
+  cosineSimilarity as rawCosineSimilarity,
+  identityToVector,
+} from '../auth/geometric.js';

 // ... types unchanged ...

-const ALIGNMENT_THRESHOLD = 0.2;
-const DIVERGENCE_THRESHOLD = 0.4;
-const TRUST_THRESHOLD = 0.8;
-
-function normalizeGeometry(geometry: Partial<Record<TrustDebtCategory, number>>): number[] {
-  return TRUST_DEBT_CATEGORIES.map(cat => geometry[cat] ?? 0.0);
-}
-
-function dotProduct(a: number[], b: number[]): number {
-  return a.reduce((sum, val, i) => sum + val * b[i], 0);
-}
-
-function magnitude(v: number[]): number {
-  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
-}
-
-function cosineSimilarity(a: number[], b: number[]): number {
-  const dot = dotProduct(a, b);
-  const magA = magnitude(a);
-  const magB = magnitude(b);
-  if (magA === 0 || magB === 0) return 0.0;
-  return Math.abs(dot / (magA * magB));
-}
+const ALIGNMENT_THRESHOLD = 0.2;
+const DIVERGENCE_THRESHOLD = 0.4;
+const TRUST_THRESHOLD = 0.8;
+
+function normalizeGeometry(geometry: Partial<Record<TrustDebtCategory, number>>): number[] {
+  return TRUST_DEBT_CATEGORIES.map(cat => geometry[cat] ?? 0.0);
+}
+
+/** Federation uses absolute cosine similarity (always [0, 1]) */
+function cosineSimilarity(a: number[], b: number[]): number {
+  return Math.abs(rawCosineSimilarity(a, b));
+}
```

This eliminates `dotProduct` and `magnitude` duplication while preserving federation's `Math.abs()` behavior as an intentional wrapper.

---

## Finding 2 (HIGH): CEO Loop Concurrency: 5 vs 50

### What the Spec Says

> "Add Claude Flow agent pool (50 concurrent) for task subdivision"
> "While you sleep, 50 Claude Flow agents operate in a highly subdivided, asynchronous swarm."

### What the Code Does

- `src/swarm/agent-pool.ts` line 109: `poolSize: 50` — the pool supports 50.
- `src/ceo-loop.ts` line 98: `maxConcurrent: 5` — the actual dispatch loop uses 5.
- The CEO loop does NOT import or reference `AgentPool`. It dispatches tasks sequentially via its own `dispatch()` function (line 758), one at a time. The `maxConcurrent: 5` config exists but the loop processes `actionable[0]` — always the single highest-priority task.

### Impact

The "50 agent" claim is architectural capacity that is never activated. The operational system runs tasks one-at-a-time with a 15-second cooldown between them.

### Concrete Patch

Wire AgentPool into CEO loop dispatch, or update spec to say "up to 5 concurrent (pool capacity: 50)."

```diff
--- a/src/ceo-loop.ts
+++ b/src/ceo-loop.ts
@@ -2,6 +2,7 @@
  * src/ceo-loop.ts — Always-On Autonomous CEO Loop v2
+ * NOTE: maxConcurrent=5 (not 50). AgentPool(50) is available but not wired.
```

---

## Finding 3 (MEDIUM): Night Shift Registry Outdated in Spec

### What the Spec Says

> "10 registered tasks, sovereignty-gated."

### What the Code Does

`src/cron/scheduler.ts` `buildTaskRegistry()` returns **15 tasks** (5 added since spec was written). Additionally, tasks `sovereignty-stability-monitor` and `sovereignty-stability-check` are near-duplicates with identical room, cooldown, and description patterns.

### Concrete Patch

Update spec section to "15 registered tasks" or deduplicate the two sovereignty tasks in `scheduler.ts`.

---

## Finding 4 (LOW): 0.8 Threshold in Three Locations

The overlap threshold `0.8` appears as:
1. `src/auth/geometric.ts:212` — default parameter in `checkPermission()`
2. `src/auth/action-map.ts:462` — `DEFAULT_OVERLAP_THRESHOLD = 0.8` (named constant)
3. `src/wrapper.ts:166` — hardcoded in generated plugin string

The named constant in `action-map.ts` is never used by `geometric.ts` or `fim-interceptor.ts`.

### Concrete Patch

Have `checkPermission()` import and use `DEFAULT_OVERLAP_THRESHOLD` from `action-map.ts`.

---

## Finding 5 (LOW): Step 7 Multi-Output Naming

The spec says output is `7-audit-log.json`. The pipeline (`step-7.ts`) produces three files: `7-audit-log.json`, `7-final-report.json`, `7-final-report.html`. The Claude interactive agents write `trust-debt-report.html` to root. No single canonical name.

---

## Intelligence Burst (for #trust-debt-public)

```
🛡️ RECURSIVE DRIFT SCAN #010 — 2026-02-17

18% divergence: 5/7 audit points show drift.

CRITICAL: Federation + FIM auth have TWO overlap algorithms.
geometric.ts = pass/fail ratio. tensor-overlap.ts = cosine similarity.
Math helpers (dotProduct, magnitude) duplicated, not shared.
Anti-correlated vectors: one rejects, other accepts.

HIGH: CEO loop runs 1 task at a time (maxConcurrent=5, serial dispatch).
Spec claims "50 concurrent agents." AgentPool exists but is unwired.

MEDIUM: Night Shift has 15 tasks, spec says 10. 2 near-duplicates.

Patent ref: IAMFIM 20-dim tensor overlap.
Alignment Proposal #010 committed.

🔴 S:65% | #drift-scan #alignment #010 | #IntentGuard
```
