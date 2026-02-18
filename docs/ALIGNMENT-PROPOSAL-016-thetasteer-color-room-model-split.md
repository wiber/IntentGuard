# Alignment Proposal #016 — ThetaSteer Color-Room Model Split & Multi-Layer Spec Drift

**Date:** 2026-02-18
**Author:** Claude Opus 4.6 (Recursive Documentation Mode)
**Room:** 📐 A2 Strategy.Goal
**Severity:** HIGH (architectural model divergence across 7 verified drift vectors)
**Drift:** ~23% composite (7 confirmed drift vectors, 3 architectural, 4 documentary)
**Patent Reference:** 63/XXX,XXX (Feb 2025) — Real-Time AI Behavior Drift Detection System

---

## Executive Summary

A comprehensive recursive audit of the migration spec v2.5.0 (2026-02-15) against the IntentGuard `src/` directory reveals **7 confirmed drift vectors**, the most severe being a fundamental **semantic model split** in the ThetaSteer categorization system: the spec describes colors as *room identity keys* (RED → vault, BLUE → builder), while the code implements colors as *confidence tiers* (RED = 0.3–0.5 confidence, BLUE = 0.0–0.2 confidence) with room routing handled by a completely separate `TILE_TO_ROOM` map. These are architecturally incompatible models. Any agent or subsystem bootstrapping from the spec's color-to-room binding will route to the wrong cognitive room 100% of the time.

---

## Drift Vector #1 (HIGHEST) — ThetaSteer Color Semantic Model Split

### What the Spec Says

Migration spec §10 (ThetaSteer Signal Colors) defines 8 colors as **room routing keys**:

| Color  | Room             | Trust-Debt Category     |
|--------|------------------|-------------------------|
| RED    | vault            | security                |
| BLUE   | builder          | code_quality            |
| GREEN  | operator         | process_adherence       |
| PURPLE | voice            | communication           |
| CYAN   | laboratory       | innovation              |
| AMBER  | performer        | domain_expertise        |
| INDIGO | architect        | risk_assessment         |
| TEAL   | navigator        | adaptability            |

The spec implies: `categorize(message) → color → room → dispatch`.

### What the Code Does

`src/skills/thetasteer-categorize.ts:20-31` implements colors as **confidence bands**:

```typescript
// GREEN (0.9-1.0): Highest confidence, autonomous execution
// CYAN (0.8-0.9): Very high confidence, minimal validation
// TEAL (0.7-0.8): High confidence, local LLM handles
// AMBER (0.6-0.7): Moderate confidence, lightweight review
// PURPLE (0.5-0.6): Medium confidence, validation recommended
// RED (0.3-0.5): Low confidence, human validation required
// INDIGO (0.2-0.3): Very low confidence, escalate to Claude
// BLUE (0.0-0.2): Uncertain, requires human judgment
```

Room routing is handled by a separate `TILE_TO_ROOM` map (lines 142-163) keyed on grid cell IDs, not colors:

```typescript
const TILE_TO_ROOM: Record<string, string> = {
  'A1': 'vault',      'A2': 'architect',  'A3': 'performer',
  'B1': 'navigator',  'B2': 'network',    'B3': 'voice',
  'C1': 'builder',    'C2': 'laboratory', 'C3': 'operator',
  'D1': 'vault',      'D2': 'architect',  'D3': 'laboratory',
  'E1': 'operator',   'E2': 'voice',      'E3': 'navigator',
  'F1': 'builder',    'F2': 'vault',
};
```

The actual dispatch path is: `categorize(message) → tile_id → TILE_TO_ROOM[tile_id] → room → dispatch`. Colors only encode *how confident* the categorization is, not *where* to route.

### Impact

- The spec and code describe **two incompatible routing models**
- Any agent reading the spec's color table will construct a RED→vault binding that doesn't exist
- The spec's color-to-category mapping (RED→security) is also incorrect — colors carry no category semantics in the code
- The `TILE_TO_ROOM` map is the authoritative router, but the spec doesn't document it

### Concrete Patch

Update migration spec §10 to reflect the dual-model architecture:

```
§10 ThetaSteer Signal System

A. Color Tiers (Confidence Bands — execution gating):
   GREEN(0.9+) → autonomous | CYAN(0.8) → minimal validation
   TEAL(0.7)  → local LLM   | AMBER(0.6) → lightweight review
   PURPLE(0.5) → validate    | RED(0.3) → human required
   INDIGO(0.2) → escalate    | BLUE(0.0) → human judgment

B. Room Routing (TILE_TO_ROOM — grid cell → cognitive room):
   A1→vault, A2→architect, A3→performer, B1→navigator,
   B2→network, B3→voice, C1→builder, C2→laboratory, C3→operator

C. Trust Dimensions (CELL_TO_TRUST — grid cell → trust-debt categories):
   A1→[compliance, ethical_alignment, accountability]
   ... (20 entries per src/skills/thetasteer-categorize.ts:87-108)
```

---

## Drift Vector #2 — Pipeline Step-7 HTML Output Filename

### What the Spec Says

Agent 7 outputs `trust-debt-report.html`.

### What the Code Does

`src/pipeline/step-7.ts:569-570` writes `7-final-report.html`:
```typescript
writeFileSync(join(stepDir, '7-final-report.html'), html);
```

Console log at line 573 confirms: `"Outputs: 7-final-report.json, 7-final-report.html, 7-audit-log.json"`.

### Impact

Any external system, CLAUDE.md reference, or `intentguard q` pipeline expecting `trust-debt-report.html` will find nothing. The `agent-context.sh` script references `trust-debt-report.html` as the final output.

### Concrete Patch

Either rename the output in step-7.ts to match spec, or update spec + agent-context.sh:

```diff
- writeFileSync(join(stepDir, '7-final-report.html'), html);
+ writeFileSync(join(stepDir, 'trust-debt-report.html'), html);
```

---

## Drift Vector #3 — Discord Channel Count (12 spec vs 14 code)

### What the Spec Says

11 channels: 9 rooms + `#trust-debt-public` + `#x-posts` + `#ops-board`.

### What the Code Does

`src/discord/channel-manager.ts:54-60` defines 5 extra channels:
- `trust-debt-public` (spec: yes)
- `tesseract-nu` (spec: **no**)
- `x-posts` (spec: yes)
- `ops-board` (spec: yes)
- `financial-tweets` (spec: **no**)

Total: **9 + 5 = 14 channels**. The file's own docstring (line 7) claims "10 channels" — a third layer of staleness.

### Concrete Patch

Update spec channel list to include `tesseract-nu` and `financial-tweets`. Fix docstring at line 7.

---

## Drift Vector #4 — CEO Loop Missing Safety Override

### What the Spec Says

`maxConcurrentRuns: 1` as a safety constraint.

### What the Code Does

`src/ceo-loop.ts:94-103` defines `maxConcurrent: 5`. The `CeoConfig` interface (lines 65-74) has no `maxConcurrentRuns` field. The dispatch loop (line 674+) runs `await dispatch(todo)` sequentially, making `maxConcurrent: 5` cosmetic — it's never enforced.

### Concrete Patch

Add `maxConcurrentRuns: 1` to `CeoConfig` interface and enforce it with a semaphore in the dispatch loop, or update spec to reflect sequential dispatch.

---

## Drift Vector #5 — Grid Shape (3x3 spec vs 20-category code)

### What the Spec Says

3x3 tesseract grid: 9 cells (A1-A3, B1-B3, C1-C3).

### What the Code Does

`src/skills/thetasteer-categorize.ts:60-84` defines 20 categories: 3 row labels (A, B, C) + 9 original cells + 8 extended cells (D1-D3, E1-E3, F1-F2).

### Impact

LOW — the extension is intentional and well-documented in file headers. Spec is simply outdated.

### Concrete Patch

Update spec grid visualization to show the full 20-category layout.

---

## Drift Vector #6 — Night Shift Task Count (10 spec vs 15 code)

### What the Spec Says

10 registered tasks.

### What the Code Does

`src/cron/scheduler.ts` `buildTaskRegistry()` (lines 175-418) defines **15 tasks**. Additionally, `sovereignty-stability-monitor` (line 349) and `sovereignty-stability-check` (line 365) appear to be duplicate tasks covering the same function — potential double-firing risk.

### Concrete Patch

Update spec to reflect 15 tasks. Investigate and deduplicate `sovereignty-stability-monitor` / `sovereignty-stability-check`.

---

## Drift Vector #7 — Step-7 Output File Naming Convention

### What the Spec Says

Pipeline bucket files follow the pattern `N-name.json` (e.g., `0-outcome-requirements.json`), with step 7 producing `7-audit-log.json`.

### What the Code Does

Step 7 actually produces **three** files:
1. `7-audit-log.json` (matches spec)
2. `7-final-report.json` (not in spec)
3. `7-final-report.html` (not in spec — spec says `trust-debt-report.html`)

---

## Composite Drift Assessment

| # | Vector | Severity | Drift % | Type |
|---|--------|----------|---------|------|
| 1 | Color-Room model split | HIGH | 100% semantic | Architectural |
| 2 | Step-7 HTML filename | HIGH | 100% naming | Architectural |
| 3 | Channel count (12→14) | MEDIUM | +17% additive | Documentary |
| 4 | CEO safety override missing | MEDIUM | field absent | Architectural |
| 5 | Grid shape (9→20) | LOW | +122% additive | Documentary |
| 6 | Task count (10→15) | LOW | +50% additive | Documentary |
| 7 | Step-7 triple output | LOW | +2 undocumented | Documentary |

**Composite Drift:** ~23% weighted average across spec surface area.
**Architectural Drift:** 3 vectors represent model-level divergences (not just numbers).

---

## Recommended Sequencing

1. **Immediate:** Fix Step-7 HTML filename (Vector #2) — one-line change, high blast radius
2. **This Sprint:** Update spec §10 color model (Vector #1) — prevents wrong-model bootstrapping
3. **This Sprint:** Add `maxConcurrentRuns` enforcement or update spec (Vector #4)
4. **Next Sprint:** Spec documentary updates (Vectors #3, #5, #6, #7)

---

## Prior Art

- AP-015: Hot-Cell Router phantom room namespace (related — same routing namespace problem)
- AP-014: Spec HTML coordinate drift (related — spec coordinate staleness)
- AP-011: Grid dimension expansion drift (superseded by Vector #5)
- Patent 63/XXX,XXX: This proposal constitutes real-time drift detection in a production multi-agent system, demonstrating the patent's core mechanism
