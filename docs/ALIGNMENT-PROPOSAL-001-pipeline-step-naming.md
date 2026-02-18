# Alignment Proposal AP-001: Pipeline Step Naming Drift

**Date:** 2026-02-17
**Priority:** HIGH (affects pipeline data flow integrity)
**Drift Percentage:** ~38% (3 of 8 pipeline steps have naming mismatches)
**Patent Reference:** IAMFIM Trust-Debt Pipeline — 8-step sovereignty scoring

---

## Executive Summary

The migration spec (`intentguard-migration-spec.html`) defines an 8-step pipeline with specific step names and output filenames. The TypeScript implementation in `src/pipeline/` has diverged from these names, creating a naming schism that breaks cross-step data loading and makes the pipeline brittle to step insertion/reordering.

---

## What the Spec Says

The spec defines these pipeline steps and their output JSON filenames:

| Step | Spec Name | Spec Output File |
|------|-----------|-----------------|
| 0 | Outcome Requirements | `0-outcome-requirements.json` |
| 1 | Indexed Keywords | `1-indexed-keywords.json` |
| 2 | 20 Categories (Balanced) | `2-categories-balanced.json` |
| 3 | Presence Matrix | `3-presence-matrix.json` |
| 4 | Grades & Statistics | `4-grades-statistics.json` |
| 5 | Timeline History | `5-timeline-history.json` |
| 6 | Analysis Narratives | `6-analysis-narratives.json` |
| 7 | Audit Log | `7-audit-log.json` (+ `trust-debt-report.html`) |

The spec also lists agents referencing these exact files (CLAUDE.md Pipeline Data Flow section).

## What the Code Does

The `runner.ts` STEP_NAMES array (line 52-61) and actual step implementations use **different** names:

| Step | Code Name (runner.ts) | Code Output File | Code Step Dir |
|------|----------------------|-----------------|---------------|
| 0 | `outcome-requirements` | `0-raw-materials.json` | `0-raw-materials/` |
| 1 | `indexed-keywords` | `1-indexed-keywords.json` | `1-document-processing/` |
| 2 | `categories-balanced` | `2-categories-balanced.json` | `2-organic-extraction/` |
| 3 | `presence-matrix` | `3-presence-matrix.json` | `3-frequency-analysis/` |
| 4 | `grades-statistics` | `4-grades-statistics.json` | `4-grades-statistics/` |
| 5 | `timeline-history` | `5-timeline-history.json` | `5-timeline-history/` |
| 6 | `analysis-narratives` | `6-analysis-narratives.json` | `6-analysis-narratives/` (but type says `symmetric-matrix`) |
| 7 | `final-report` | `7-final-report.json` + `7-audit-log.json` | `7-final-report/` |

### Specific Drift Points

#### DRIFT 1 — Step 0: Dual Identity (CRITICAL)
- **Spec says:** "Outcome Requirements" → `0-outcome-requirements.json`
- **Code has TWO implementations:**
  - `step-0.ts` outputs `0-raw-materials.json` (name: `raw-materials`)
  - `agent-0-outcome-requirements.ts` outputs `0-outcome-requirements.json` (name: `outcome-requirements`)
- **Impact:** `runner.ts` STEP_NAMES[0] says `'outcome-requirements'` but imports `step-0.ts` which produces `raw-materials`. Downstream steps (step-4 at line 379, step-7 at line 404) look for `0-raw-materials/0-raw-materials.json`.
- **Root cause:** Two separate implementations exist for step 0 — the runner uses one, but CLAUDE.md references the other.

#### DRIFT 2 — Step Directory vs STEP_NAMES Mismatch (HIGH)
- `runner.ts` creates directories using `STEP_NAMES` (e.g., `0-outcome-requirements/`)
- But `step-0.ts` type definition says `name: 'raw-materials'`
- Steps 4, 5, 7 hardcode paths like `'0-raw-materials'` instead of using STEP_NAMES
- **Impact:** If runner names the directory `0-outcome-requirements/`, step-4 fails loading `0-raw-materials/0-raw-materials.json`

#### DRIFT 3 — `types.ts` Step Names vs Spec (MEDIUM)
- `src/pipeline/types.ts` defines step names that differ from both the runner AND the spec:
  - Step 0: `raw-materials` (not `outcome-requirements`)
  - Step 1: `document-processing` (not `indexed-keywords`)
  - Step 2: `organic-extraction` (not `categories-balanced`)
  - Step 3: `frequency-analysis` (not `presence-matrix`)
  - Step 5: `goal-alignment` (not `timeline-history`)
  - Step 6: `symmetric-matrix` (not `analysis-narratives`)
- **Impact:** Type definitions don't match runtime behavior. TypeScript types are documentation; if wrong, they mislead maintainers.

#### DRIFT 4 — Step 7 Output vs Spec (LOW)
- **Spec says:** Output is `7-audit-log.json`
- **Code says:** Output is `7-final-report.json` + `7-final-report.html` + `7-audit-log.json`
- **Impact:** Minimal — code produces a superset of what spec requires

---

## Concrete Patch Proposal

### Option A: Align Code to Spec (Recommended)

1. **Unify step-0** — Delete `step-0.ts` (raw-materials), rename `agent-0-outcome-requirements.ts` → `step-0.ts`. Output: `0-outcome-requirements.json`.

2. **Fix `types.ts`** — Rename all step name literals:
   ```typescript
   // Step 0: 'raw-materials' → 'outcome-requirements'
   // Step 1: 'document-processing' → 'indexed-keywords'
   // Step 2: 'organic-extraction' → 'categories-balanced'
   // Step 3: 'frequency-analysis' → 'presence-matrix'
   // Step 5: 'goal-alignment' → 'timeline-history'
   // Step 6: 'symmetric-matrix' → 'analysis-narratives'
   ```

3. **Fix cross-step path references** — All hardcoded paths in steps 4, 5, 6, 7 should use a shared `stepDirName(n)` helper that returns the canonical `${n}-${STEP_NAMES[n]}` format.

4. **Update tests** — All test files reference hardcoded directory/file names. These need updating to match.

### Option B: Align Spec to Code (Not Recommended)

Update the migration spec HTML to match current code naming. This is cheaper but wrong — the spec names are more descriptive and match the CLAUDE.md pipeline documentation that agents rely on.

### Estimated Effort

- Option A: ~2 hours (rename + path fixes + test updates)
- Option B: ~30 minutes (HTML text changes only)

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing pipeline runs | Medium | Old runs keep old names; only new runs use new names |
| Breaking downstream consumers | Low | No external consumers — internal pipeline only |
| Test failures during rename | Low | Tests need updating anyway; this is the fix |

---

## Decision

**Recommendation:** Execute Option A. The pipeline types file (`types.ts`) and the actual step implementations should match the spec. The CLAUDE.md agent definitions and the spec both use the canonical names. The code is the outlier.

**Next Step:** Implement the rename in a single atomic commit to avoid partial drift states.
