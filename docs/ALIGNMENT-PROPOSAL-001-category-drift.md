# Alignment Proposal 001: Category Structure Drift

**Date:** 2026-02-17
**Priority:** CRITICAL
**Drift Percentage:** 38%
**Patent Reference:** `|Intent - Reality|^2 x CategoryWeight x ProcessHealth`
**Affected Agents:** 1, 2, 3, 4
**Affected Files:** `src/pipeline/step-1.ts`, `src/pipeline/step-3.ts`, `src/auth/geometric.ts`

---

## What the Spec Says

The migration spec (`intentguard-migration-spec.html`) and `BALANCED_20_CATEGORY_SPECIFICATION.md` define:

- **20 categories total**: 4 parent categories + 16 children (4 per parent)
- **Parents:** A (Security & Trust), B (Performance & Integration), C (Experience & Interfaces), D (Strategy & Business)
- **Matrix dimensions:** 20x20 = 400 cells
- **Target distribution:** ~200 mentions per category (balanced)
- **FIM identity vector:** 20 dimensions (one per category)

The 20 categories used in FIM auth (`src/auth/geometric.ts:25-31`):
```
security, reliability, data_integrity, process_adherence,
code_quality, testing, documentation, communication,
time_management, resource_efficiency, risk_assessment, compliance,
innovation, collaboration, accountability, transparency,
adaptability, domain_expertise, user_focus, ethical_alignment
```

## What the Code Does

`src/pipeline/step-1.ts` (lines 73-128) implements a **45-category hierarchical structure**:

- **45 categories total**: 5 parent categories + 40 children (8 per parent)
- **Parents:** A CoreEngine, B Security, C Performance, D Integration, E BusinessLayer
- **Matrix dimensions:** 45x45 = 2,025 cells
- **SQLite schema:** Built for 45 categories

The pipeline stages are internally inconsistent:
- **Step 1** creates 45-category SQLite schema
- **Step 2** generates balanced 20 categories
- **Step 3** builds matrix expecting 45x45
- **Step 4** references `TRUST_DEBT_CATEGORIES` (20 categories) for FIM grading
- **FIM Auth** uses 20-dimensional identity vector

## The Drift

| Aspect | Spec | Implementation | Delta |
|--------|------|----------------|-------|
| Category count | 20 | 45 (step-1) / 20 (FIM) | +125% / 0% |
| Parent count | 4 | 5 | +25% |
| Children per parent | 4 | 8 | +100% |
| Matrix cells | 400 | 2,025 | +406% |
| Identity dimensions | 20 | 20 | 0% |

**Root cause:** Step 1 was built with a 45-category structure (likely an earlier iteration), while Steps 2 and 4 were built against the finalized 20-category spec. The FIM auth layer correctly uses 20 categories.

## Concrete Patch

### Option A: Converge on 20 Categories (Recommended)

Align step-1.ts to the 20-category spec, which matches FIM auth and the balanced category specification.

**Changes required:**

1. **`src/pipeline/step-1.ts`** — Replace the 45-category hierarchy (lines 73-128) with the 20-category structure from `TRUST_DEBT_CATEGORIES`. Map the 134 keywords to 20 categories instead of 45. Update SQLite schema to insert 20 categories.

2. **`src/pipeline/step-3.ts`** — Update matrix dimensions from 45x45 to 20x20. Update validation targets: upper triangle 190 cells, lower triangle 190 cells, diagonal 20 cells. Remove 45-specific ShortLex positions.

3. **`src/pipeline/types.ts`** — Update type definitions that reference 45-category counts to 20.

4. **Keyword remapping:** Consolidate the 134 keywords from 45 categories into 20 categories. The 5-parent hierarchy maps naturally:
   - A CoreEngine (9 children) → code_quality, process_adherence, innovation
   - B Security (9 children) → security, compliance, risk_assessment, testing
   - C Performance (9 children) → reliability, resource_efficiency, adaptability, time_management
   - D Integration (9 children) → communication, collaboration, data_integrity, domain_expertise
   - E BusinessLayer (9 children) → accountability, transparency, user_focus, documentation, ethical_alignment

### Option B: Converge on 45 Categories

Expand FIM auth and step-2/step-4 to use 45-category structure. **Not recommended** because:
- Breaks the spec-defined 20-dimensional identity vector
- Requires rewriting geometric permission checks
- Federation protocol assumes 20-dimensional overlap computation
- More categories = sparser matrix = less meaningful statistical analysis

## Impact Assessment

- **Pipeline coherence:** Currently broken between steps 1→2→3→4 due to dimension mismatch
- **FIM auth:** Correctly uses 20 categories; no change needed with Option A
- **Federation:** Correctly uses 20-dimensional vectors; no change needed with Option A
- **Grading:** Step 4 grade boundaries (A:0-500, B:501-1500, etc.) calibrated for 20-category system
- **Report generation:** Steps 6 and 7 consume upstream data; will auto-correct when upstream aligns

## Verification Criteria

After patch:
1. `step-1.ts` produces SQLite DB with exactly 20 categories
2. `step-3.ts` produces 20x20 matrix (400 cells)
3. `step-4.ts` grades all 20 categories consistently
4. `geometric.ts` identity vector dimensions match pipeline output
5. ShortLex ordering valid for 20 categories (A→A.1→A.2→A.3→A.4→B→B.1→...)
6. Pipeline runs end-to-end without dimension mismatch errors
