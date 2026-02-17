# Alignment Proposal 009: Step 0 Dual Identity — Latent Pipeline Crash

**Date:** 2026-02-17
**Severity:** CRITICAL (P0)
**Drift Percentage:** 100% at Step 0 (two competing implementations)
**Patent Reference:** IAMFIM Trust-Debt Pipeline — 8-step sovereignty scoring chain

---

## Problem

Step 0 of the Trust-Debt Pipeline has **two competing implementations** that produce different output files. Downstream steps reference both inconsistently, guaranteeing a crash on any end-to-end pipeline run.

### The Two Implementations

| File | Purpose | Output | LOC | Tests |
|------|---------|--------|-----|-------|
| `src/pipeline/step-0.ts` | Raw materials gatherer (commits, blogs, docs) | `0-raw-materials.json` | 251 | 10 |
| `src/pipeline/agent-0-outcome-requirements.ts` | Outcome requirements parser (HTML report parser) | `0-outcome-requirements.json` | 414 | 10 |

### Downstream Reference Conflicts

| Consumer | Reads | Will crash if... |
|----------|-------|-----------------|
| `runner.ts:53` | Creates dir `0-raw-materials/` | `agent-0-*` ran instead |
| `step-4.ts:379` | `0-outcome-requirements/0-outcome-requirements.json` | `step-0.ts` ran (produces `0-raw-materials`) |
| `step-6.ts:434` | `0-outcome-requirements.json` | `step-0.ts` ran |
| `step-7.ts:404` | `0-raw-materials/0-raw-materials.json` | `agent-0-*` ran |

**Result:** No matter which Step 0 runs, at least two downstream steps will fail with `ENOENT`.

### Spec Position

CLAUDE.md and `intentguard-migration-spec.html` both specify:
- Agent 0: "Outcome Requirements Parser"
- Output: `0-outcome-requirements.json`
- `step-0.ts` is NOT mentioned in the spec; `agent-0-outcome-requirements.ts` matches spec semantics

### Runner Position

`runner.ts` STEP_NAMES[0] = `'raw-materials'` — it will invoke `step-0.ts`, not `agent-0-outcome-requirements.ts`.

---

## Root Cause

Two development tracks evolved independently:
1. The **pipeline runner** (`runner.ts`) was built with `step-0.ts` as a generic corpus gatherer
2. The **agent system** (`agent-0-outcome-requirements.ts`) was built to match the CLAUDE.md spec for targeted outcome parsing

Neither was deprecated. Both have test suites. The runner calls one; the spec describes the other.

---

## Concrete Patch

**Recommended: Merge into unified Step 0 matching spec**

### 1. Rename output in `step-0.ts`

```diff
--- a/src/pipeline/step-0.ts
+++ b/src/pipeline/step-0.ts
@@ -246 +246 @@
-    join(stepDir, '0-raw-materials.json'),
+    join(stepDir, '0-outcome-requirements.json'),
```

### 2. Update runner step name

```diff
--- a/src/pipeline/runner.ts
+++ b/src/pipeline/runner.ts
@@ -53 +53 @@
-  'raw-materials',
+  'outcome-requirements',
```

### 3. Update step-7 cross-reference

```diff
--- a/src/pipeline/step-7.ts
+++ b/src/pipeline/step-7.ts
@@ -404 +404 @@
-  const step0 = loadStep(runDir, 0, '0-raw-materials.json') as Record<string, unknown> | null;
+  const step0 = loadStep(runDir, 0, '0-outcome-requirements.json') as Record<string, unknown> | null;
```

### 4. Update test fixtures

- `step-0.test.ts`: All references to `0-raw-materials` → `0-outcome-requirements`
- `runner.test.ts:74,170`: `0-raw-materials` → `0-outcome-requirements`
- `step-7.test.ts:39,42,184,187`: `0-raw-materials` → `0-outcome-requirements`

### 5. Decide on agent-0 file

After unification, `agent-0-outcome-requirements.ts` should be either:
- **Merged** into `step-0.ts` (if its HTML-parsing logic adds value)
- **Archived** to `src/pipeline/_legacy/` with a deprecation note

---

## Files Affected

| File | Change |
|------|--------|
| `src/pipeline/step-0.ts` | Rename output |
| `src/pipeline/runner.ts` | Update STEP_NAMES[0] |
| `src/pipeline/step-7.ts` | Update cross-reference |
| `src/pipeline/step-0.test.ts` | Update fixtures |
| `src/pipeline/runner.test.ts` | Update fixtures |
| `src/pipeline/step-7.test.ts` | Update fixtures |

---

## Risk

- **Medium blast radius** — 6 files, but all within `src/pipeline/`
- **No production data loss** — pipeline runs are ephemeral
- **Test coverage exists** — both implementations have 10 tests each; renaming is mechanical
