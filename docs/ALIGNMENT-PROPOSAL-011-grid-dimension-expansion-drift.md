# Alignment Proposal #011: Grid Dimension Expansion Drift (3x3 → 3x4)

**Date:** 2026-02-18
**Room:** 📐::architect | A2 Strategy.Goal
**Priority:** HIGH — spec/code structural divergence across grid topology
**Drift Percentage:** 31.8% overall (drift-signal.json), 25% grid topology mismatch (3 phantom cells)
**Patent Reference:** IAMFIM geometric auth (20-dim tensor overlap), Tesseract Coordinate Grid (Appendix H)

---

## Executive Summary

A recursive documentation scan of `intentguard-migration-spec.html` cross-referenced against `src/discord/shortrank-notation.ts` and `data/drift-signal.json` reveals a **grid dimension expansion drift**. The migration spec defines a **3x3 Tesseract Coordinate Grid** (9 cells: A1-C3), but the live drift detection system (`data/drift-signal.json`) operates on a **3x4 grid** (12 cells: A1-C4). Three cells — **A4 (Strategy.Ethics)**, **B4 (Tactics.Proof)**, **C4 (Operations.Safe)** — exist in the drift detector's reality but are absent from both the migration spec and `src/discord/shortrank-notation.ts`.

This creates a **shadow topology**: the drift detector tracks cells that the ShortRank notation system cannot tag, the channel-manager cannot route, and the tweet-composer cannot annotate. Trust-debt signals generated in A4/B4/C4 fall into a routing black hole.

---

## Full Drift Inventory (Grid-Specific)

| Cell | Spec Grid | ShortRank Code | drift-signal.json | Drift Score | Status |
|------|-----------|----------------|-------------------|-------------|--------|
| A1 Law | YES | YES | YES (0.27) | repo_ahead | ALIGNED |
| A2 Goal | YES | YES | YES (0.07) | aligned | ALIGNED |
| A3 Fund | YES | YES | YES (0.29) | repo_ahead | ALIGNED |
| **A4 Ethics** | **NO** | **NO** | **YES (0.56)** | spec_ahead | **PHANTOM — focusNeeded: true** |
| B1 Speed | YES | YES | YES (0.43) | repo_ahead | ALIGNED |
| B2 Deal | YES | YES | YES (0.33) | repo_ahead | ALIGNED |
| B3 Signal | YES | YES | YES (0.12) | aligned | ALIGNED |
| **B4 Proof** | **NO** | **NO** | **YES (0.53)** | repo_ahead | **PHANTOM** |
| C1 Grid | YES | YES | YES (0.18) | spec_ahead | ALIGNED |
| C2 Loop | YES | YES | YES (0.77) | repo_ahead | ALIGNED (HIGH DRIFT) |
| C3 Flow | YES | YES | YES (0.09) | aligned | ALIGNED |
| **C4 Safe** | **NO** | **NO** | **YES (0.17)** | spec_ahead | **PHANTOM — focusNeeded: true** |

**Aligned cells:** 9/12 (75%) — **Phantom cells:** 3/12 (25%)

---

## What the Spec Says

### Migration Spec: Tesseract Coordinate Grid (Section ~line 470)

The spec defines a 3x3 grid:

```
            Strategy (Law)    Tactics (Opportunity)    Operations (Signal)
A (Law)     ⚖️ Vault (A1)     🔮 Architect (A2)        💰 Performer (A3)
B (Opp)     🔀 Voice (B1)     🎯 Network (B2)          📡 Navigator (B3)
C (Grid)    🔌 Builder (C1)   🧪 Laboratory (C2)       🌊 Operator (C3)
```

No 4th column exists. The grid is 3 rows × 3 columns = 9 cells.

### ShortRank Notation (`src/discord/shortrank-notation.ts:40-53`)

Defines exactly 12 entries: 3 parents (A, B, C) + 9 cells (A1-C3). Matches the 3x3 spec. No A4, B4, or C4.

---

## What the Code Does

### Drift Detector (`data/drift-signal.json`)

The live drift detection system — the actual telemetry ground truth — operates on 12 cells including:

- **A4 (Strategy.Ethics)**: 44 spec mentions, 6 commits, 1299 LOC, drift 0.56, `focusNeeded: true`
- **B4 (Tactics.Proof)**: 14 spec mentions, 30 commits, 10304 LOC, drift 0.53
- **C4 (Operations.Safe)**: 17 spec mentions, 2 commits, 1675 LOC, drift 0.17, `focusNeeded: true`

These cells are actively being tracked. The drift detector uses them to compute `overallDrift: 0.3176` and identifies `hotCells: ["A4", "C4"]` — meaning the system's own attention mechanism flags phantom cells as requiring focus.

### The Routing Black Hole

When the drift detector flags A4 (Ethics) as `focusNeeded`, the system should route attention to that cell. But:

1. `shortrank-notation.ts` has no A4 entry → `TESSERACT_CELLS['A4']` returns `undefined`
2. `intersection('A4', 'C1')` falls back to B3 (Signal) → wrong cell tagged
3. Tweet-composer tags Ethics drift as Signal drift → misleading public reporting
4. Channel-manager has no room mapping for Ethics/Proof/Safe → no cognitive room dispatch

---

## Why This Is Critical

The drift detector is the system's **immune system** — it detects when intent diverges from reality. If the immune system tracks cells the body doesn't have, it generates phantom inflammation. Specifically:

1. **A4 Ethics (drift 0.56, focusNeeded)** represents pipeline integrity and EU AI Act compliance — the highest-value trust-debt signal — but it routes to the wrong ShortRank cell
2. **C4 Safe (drift 0.17, focusNeeded)** represents process health monitoring — the 0.0% process health crisis flagged in the spec — but has no operational routing
3. **B4 Proof (drift 0.53)** represents validation and testing infrastructure — 30 commits and 10304 LOC of code with no grid address

**Net effect:** 25% of the drift detector's topology is invisible to the sovereign engine.

---

## Concrete Patch (Two Options)

### Option A: Expand Grid to 3x4 (Recommended)

Update `src/discord/shortrank-notation.ts` to include the 4th column:

```typescript
// Add to TESSERACT_CELLS
A4: { code: 'A4', emoji: '🏛️', parent: 'Strategy',   name: 'Ethics',  fullName: 'Strategy.Ethics',    trustCategories: ['ethical_alignment', 'compliance', 'accountability'], room: 'vault' },
B4: { code: 'B4', emoji: '🔍', parent: 'Tactics',    name: 'Proof',   fullName: 'Tactics.Proof',      trustCategories: ['testing', 'code_quality', 'reliability'], room: 'laboratory' },
C4: { code: 'C4', emoji: '🛡️', parent: 'Operations', name: 'Safe',    fullName: 'Operations.Safe',    trustCategories: ['security', 'process_adherence', 'reliability'], room: 'operator' },
```

Update migration spec section "Tesseract Coordinate Grid" to show 3x4 grid.

**Effort:** ~30 LOC in shortrank-notation.ts + spec HTML update + 6 tests

### Option B: Collapse to 3x3 (Conservative)

Remove A4/B4/C4 from drift-signal.json generation. Merge their metrics into existing 3x3 cells:
- A4 Ethics → A1 Law (both compliance-focused)
- B4 Proof → C2 Loop (both testing/validation)
- C4 Safe → C1 Grid (both infrastructure/security)

**Effort:** ~50 LOC in drift detector + data migration

### Recommendation: Option A

The drift detector evolved the grid organically based on real codebase signals. The 4th column (Ethics, Proof, Safe) maps to trust-debt dimensions that don't cleanly fit the original 3x3. The spec should expand to match reality — this is `repo_ahead` drift, which means the code knows something the spec doesn't.

---

## Secondary Finding: C2 (Operations.Loop) — Highest Individual Drift

Cell C2 has drift score **0.77** (the highest of any cell) with `repo_ahead` direction. 25 recent commits and 3279 LOC, but the spec mentions it only 7 times with status `pending`. This means the ceo-loop, pipeline runners, and test infrastructure are far ahead of what the spec documents.

**Action:** Update spec Phase 9 (Autonomous Night Operations) to reflect actual C2 implementation status.

---

## Sequencing (Which Dominos Fall First)

1. **Grid Expansion** (this proposal) — unifies drift detector with ShortRank notation
2. **C2 Spec Update** — catches spec up to 25-commit reality
3. **Discord Adapter** (AP-001) — still the keystone for cross-channel routing
4. **Rooms Module Extraction** — centralizes room definitions

Grid expansion is upstream of Discord adapter — if we expand to 3x4 first, the Discord adapter can route to all 12 cells from day one.

---

## Intelligence Burst (for #trust-debt-public)

```
🔍 RECURSIVE DRIFT SCAN — 2026-02-18 | 📐 A2 Strategy.Goal

TOPOLOGY DRIFT: 3x3 spec grid vs 3x4 code reality
3 phantom cells: A4 Ethics (56%), B4 Proof (53%), C4 Safe (17%)
Overall drift: 31.8% | Hot cells: A4, C4 (focusNeeded)
Highest individual: C2 Loop at 77% (repo_ahead, 25 commits undocumented)

ShortRank routing black hole: phantom cells → B3 fallback → misleading tags
Patch: Expand shortrank-notation.ts to 3x4 (~30 LOC)

Aligned: A2 Goal (7%), B3 Signal (12%), C3 Flow (9%)
Patent ref: Appendix H — Geometric IAM (Tesseract Coordinate Grid)

📐::architect | A🛡️ Security & Trust Governance
```
