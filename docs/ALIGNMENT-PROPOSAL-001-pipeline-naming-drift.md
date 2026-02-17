# Alignment Proposal 001: Pipeline Step Naming Drift

**Date:** 2026-02-16
**Severity:** HIGH
**Drift Percentage:** 75% (6 of 8 step names diverge)
**Patent Reference:** IAMFIM Geometric Auth / Trust-Debt Pipeline (8-step sovereignty scoring)

---

## What the Spec Says

The migration spec (`intentguard-migration-spec.html`) and `CLAUDE.md` define these canonical pipeline output buckets:

| Step | Spec Name                    | Output File                    |
|------|------------------------------|--------------------------------|
| 0    | Outcome Requirements         | `0-outcome-requirements.json`  |
| 1    | Indexed Keywords             | `1-indexed-keywords.json`      |
| 2    | Categories (Balanced)        | `2-categories-balanced.json`   |
| 3    | Presence Matrix              | `3-presence-matrix.json`       |
| 4    | Grades & Statistics          | `4-grades-statistics.json`     |
| 5    | Timeline History             | `5-timeline-history.json`      |
| 6    | Analysis Narratives          | `6-analysis-narratives.json`   |
| 7    | Audit Log                    | `7-audit-log.json`             |

## What the Code Does

`src/pipeline/runner.ts:52-61` defines `STEP_NAMES` used for directory creation:

```typescript
const STEP_NAMES = [
  'raw-materials',           // Step 0 — spec: "outcome-requirements"
  'document-processing',     // Step 1 — spec: "indexed-keywords"
  'organic-extraction',      // Step 2 — spec: "categories-balanced"
  'frequency-analysis',      // Step 3 — spec: "presence-matrix"
  'grades-statistics',       // Step 4 — ALIGNED
  'goal-alignment',          // Step 5 — spec: "timeline-history"
  'symmetric-matrix',        // Step 6 — spec: "analysis-narratives"
  'final-report',            // Step 7 — spec: "audit-log"
];
```

### Divergence Detail

| Step | Spec Name              | Runner STEP_NAME         | Aligned? |
|------|------------------------|--------------------------|----------|
| 0    | outcome-requirements   | raw-materials            | DRIFT    |
| 1    | indexed-keywords       | document-processing      | DRIFT    |
| 2    | categories-balanced    | organic-extraction       | DRIFT    |
| 3    | presence-matrix        | frequency-analysis       | DRIFT    |
| 4    | grades-statistics      | grades-statistics        | OK       |
| 5    | timeline-history       | goal-alignment           | DRIFT    |
| 6    | analysis-narratives    | symmetric-matrix         | DRIFT    |
| 7    | audit-log              | final-report             | DRIFT (partial) |

### Impact

The runner creates directories like `3-frequency-analysis/` but step-3.ts writes `3-presence-matrix.json` inside it. The **individual step modules** use the spec-correct names for their output files, but their parent directories use the runner's stale names. This creates a hybrid state:

- Directory: `3-frequency-analysis/3-presence-matrix.json` (incoherent)
- Cross-references in step-6.ts: `join(runDir, '4-grades-statistics', '4-grades-statistics.json')` (works because step 4 is aligned)
- Cross-references in step-6.ts: `join(runDir, '5-goal-alignment', '5-goal-alignment.json')` (works because step-5 outputs `5-goal-alignment.json` matching runner name, NOT spec name `5-timeline-history.json`)

**Root cause:** The runner's STEP_NAMES array was written early in development with working names. The spec was subsequently refined to use the canonical Trust-Debt pipeline names from `trust-debt-pipeline-coms.txt`. The step modules were updated to match the spec's output filenames, but the runner's directory names and step-5/step-7's actual output names were never reconciled.

### Secondary Drift: Step 5 and 7 Output Names

The step modules themselves have naming inconsistencies with the spec:

- `step-5.ts` outputs `5-goal-alignment.json` — spec says `5-timeline-history.json`
- `step-7.ts` outputs `7-final-report.json` + `7-final-report.html` — spec says `7-audit-log.json`

These are **functional** (the code works) but **semantically incoherent** with the spec's published pipeline definition.

## Concrete Patch

### Option A: Align Runner to Spec (Recommended)

Update `src/pipeline/runner.ts:52-61`:

```typescript
const STEP_NAMES = [
  'outcome-requirements',    // Step 0
  'indexed-keywords',        // Step 1
  'categories-balanced',     // Step 2
  'presence-matrix',         // Step 3
  'grades-statistics',       // Step 4
  'timeline-history',        // Step 5
  'analysis-narratives',     // Step 6
  'final-report',            // Step 7 (keep as "final-report" — more descriptive than "audit-log")
];
```

Then update all cross-references in step modules:
- `step-6.ts:412` — change `5-goal-alignment` to `5-timeline-history`
- `step-7.ts` — update all directory references to match new names
- `step-5.ts` — rename output from `5-goal-alignment.json` to `5-timeline-history.json`

Also update the spec to acknowledge step 7 outputs `7-final-report.json` (not `7-audit-log.json`) since the final step produces both a report and an audit log.

### Option B: Align Spec to Code

Update `intentguard-migration-spec.html` and `CLAUDE.md` to use the runner's current names. This is simpler but loses the semantic clarity of the canonical Trust-Debt vocabulary.

### Recommendation

**Option A** — The spec names are semantically richer and match the Trust-Debt Pipeline's published terminology. The code should follow the spec, not the other way around. The runner's STEP_NAMES are implementation-era working names that were never updated.

### Files Requiring Changes (Option A)

1. `src/pipeline/runner.ts` — STEP_NAMES array (lines 52-61)
2. `src/pipeline/step-5.ts` — output filename
3. `src/pipeline/step-6.ts` — cross-references to step 5 directory
4. `src/pipeline/step-7.ts` — cross-references to all previous step directories
5. `src/pipeline/step-7.test.ts` — test fixtures matching directory names
6. `src/pipeline/runner.test.ts` — test expectations

### Risk Assessment

- **Breakage risk:** Medium — existing pipeline-runs data uses old directory names
- **Mitigation:** Add a migration note in runner.ts that old runs use legacy names
- **Test impact:** 6 test files need directory name updates
- **No production data loss:** Pipeline runs are ephemeral (data/pipeline-runs/)

---

## Overall Spec-Code Drift Assessment

| Area                          | Drift | Notes                                |
|-------------------------------|-------|--------------------------------------|
| Pipeline step naming          | 75%   | This proposal (HIGH priority)        |
| FIM Geometric Auth            | 0%    | Perfect alignment, 44 tests pass     |
| OpenClaw Plugin               | 0%    | Perfect alignment, 16 tests pass     |
| Skills (4 modules)            | <1%   | LOC within 1% of spec claims         |
| Federation                    | 0%    | All modules present + bonus extras   |
| CEO Loop                      | 0%    | Exceeds spec (844 > 750+ LOC)        |
| Night Shift Scheduler         | 0%    | Present and integrated               |
| Wallet System                 | 0%    | Present with tests                   |
| Wrapper (entry point)         | 0%    | Comprehensive 630 LOC implementation |
| Runtime orchestrator          | ~1%   | 4 minor TODOs in non-critical paths  |

**Weighted Drift Score: ~8%** (pipeline naming is 75% drifted but localized; all other modules are <1% drifted)

**Overall Grade: A- (92% alignment)**
