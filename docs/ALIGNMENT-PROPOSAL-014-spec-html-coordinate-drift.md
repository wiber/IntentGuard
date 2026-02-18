# Alignment Proposal #014 — Migration Spec HTML Coordinate & Axis Naming Drift

**Date:** 2026-02-18
**Analyst:** Claude Opus 4.6 (Recursive Documentation Mode)
**Room:** 📐::architect | A2 Strategy.Goal
**Patent Reference:** IAMFIM (20-dim geometric auth), Tesseract Coordinate Grid
**Severity:** HIGH (routing corruption risk — spec is the onboarding document for all new agents)
**Overall Drift:** ~12%

---

## Executive Summary

A recursive cross-reference of `intentguard-migration-spec.html` against `src/` and `docs/ARCHITECTURAL-DECISIONS.md` reveals that **the migration spec HTML — the primary onboarding document — contains stale coordinate mappings and axis nomenclature** that contradict the canonical code and living spec.

This is distinct from all prior Alignment Proposals (001-013) because the drift is **in the spec itself**, not in the code. New agents, swarm workers, or human contributors reading the spec will receive incorrect routing information. Any agent that trusts the spec's room-to-cell table will misroute Voice and Navigator messages.

| Finding | Spec HTML Says | Code/Arch Decisions Say | Impact |
|---------|---------------|------------------------|--------|
| Voice room grid cell | **B1** Opp:Law | **B3** Tactics.Signal | Voice memos routed to wrong grid cell |
| Navigator room grid cell | **B3** Opp:Signal | **B1** Tactics.Speed | Explorer/scouting signals misrouted |
| B-row axis names | Opp:Law / Opp:Opp / Opp:Signal | Tactics.Speed / Tactics.Deal / Tactics.Signal | Semantic confusion for new agents |
| A-row axis names | Law:Law / Law:Opportunity / Law:Signal | Strategy.Law / Strategy.Goal / Strategy.Fund | 6 cells mislabeled |
| C-row axis names | Grid:Law / Grid:Opportunity / Grid:Signal | Operations.Grid / Operations.Loop / Operations.Flow | 6 cells mislabeled |
| 3-Tier LLM model | "Tier 2: Human admin blessing" | Code: Tier 2 = Opus (via gateway) | Model routing ambiguity |

---

## Finding 1: Voice ↔ Navigator Cell Swap (HIGH)

### What the Spec HTML Says

In the "Cognitive Rooms → Discord Channels" section of `intentguard-migration-spec.html`:

```
🎤 Voice    → B1 Opp:Law
🧭 Navigator → B3 Opp:Signal
```

### What the Code Says (5 independent sources confirm)

**`src/discord/shortrank-notation.ts:47-49`** (canonical grid definition):
```typescript
B1: { ..., name: 'Speed', fullName: 'Tactics.Speed', room: 'navigator' },
B3: { ..., name: 'Signal', fullName: 'Tactics.Signal', room: 'voice' },
```

**`src/discord/channel-manager.ts:47,50`** (Discord channel descriptions):
```typescript
'terminal-voice':    'Content & voice memos (Terminal) — B3',
'rio-navigator':     'Exploration & browsing (rio) — B1',
```

**`src/grid/spec-drift-detector.ts:113-131`** (drift detector cell definitions):
```typescript
{ cellId: 'B1', ..., room: 'navigator' },
{ cellId: 'B3', ..., room: 'voice' },
```

**`src/skills/thetasteer-categorize.ts:149,151`** (categorization routing):
```typescript
'B1': 'navigator',
'B3': 'voice',
```

**`docs/ARCHITECTURAL-DECISIONS.md:73,76`** (living spec mirror):
```
navigator → B1 Tactics.Speed
voice     → B3 Tactics.Signal
```

**All 5 code sources agree: Voice=B3, Navigator=B1.** The spec HTML is wrong.

### Consequences

1. Any new swarm agent bootstrapping from the spec HTML will route Voice memos to B1 (Speed) instead of B3 (Signal)
2. Navigator/scouting signals would route to B3 (Signal) instead of B1 (Speed)
3. The spec is the document shown to humans and used for onboarding — it creates a false mental model
4. The grid's ThetaSteer categorization, shortrank notation, and channel descriptions are all internally consistent — only the spec HTML disagrees

### Concrete Patch

In `intentguard-migration-spec.html`, in the Cognitive Rooms section, swap:

```html
<!-- BEFORE (incorrect): -->
🎤 Voice      → B1 Opp:Law
🧭 Navigator  → B3 Opp:Signal

<!-- AFTER (correct): -->
🎤 Voice      → B3 Tactics.Signal
🧭 Navigator  → B1 Tactics.Speed
```

---

## Finding 2: Axis Nomenclature Drift — "Law/Opportunity/Signal" vs "Law/Goal/Fund" etc. (MEDIUM)

### What the Spec HTML Says

The grid in `intentguard-migration-spec.html` uses an **older naming scheme**:

```
Columns: Strategy (Law) | Tactics (Opportunity) | Operations (Signal)
Rows:    A (Law), B (Opportunity), C (Grid)
```

Cell names: "Law:Law", "Law:Opportunity", "Opp:Law", "Grid:Signal", etc.

### What the Code Says

`src/discord/shortrank-notation.ts` and `docs/ARCHITECTURAL-DECISIONS.md` both use:

```
A1: Strategy.Law     B1: Tactics.Speed    C1: Operations.Grid
A2: Strategy.Goal    B2: Tactics.Deal     C2: Operations.Loop
A3: Strategy.Fund    B3: Tactics.Signal   C3: Operations.Flow
```

These names carry **semantic meaning** that the old names don't:
- "Goal" ≠ "Opportunity" — Goal is about strategic objectives, not generic opportunity
- "Fund" ≠ "Signal" — Fund is specifically about financial/budget, not signal
- "Speed" ≠ "Law" — Speed is about velocity/performance, not governance
- "Loop" ≠ "Opportunity" — Loop is specifically about operational cycles

### Consequences

1. The spec HTML teaches agents a vocabulary that no code uses
2. When a spec reader sees "B1 Opp:Law" and the code says "B1 Tactics.Speed", they cannot map between them
3. This is especially dangerous for the ThetaSteer categorization skill, which uses the newer names for keyword matching

### Concrete Patch

Update the `intentguard-migration-spec.html` grid table and all room descriptions to use the canonical axis names from `ARCHITECTURAL-DECISIONS.md`.

---

## Finding 3: 3-Tier LLM Routing — Tier 2 Identity Mismatch (LOW)

### What the Spec HTML Says

```
Tier 0: Ollama llama3.2:1b (fast local)
Tier 1: Claude Sonnet via proxy ($0)
Tier 2: Human admin blessing
```

### What the Code Says

**`docs/ARCHITECTURAL-DECISIONS.md:44`**:
```
| 5 | Opus (via gateway) | Novel, creative, research |
```

**`src/skills/llm-controller.ts:26`**:
```typescript
backend?: 'ollama' | 'sonnet' | 'opus' | 'both' | 'auto';
```

The code supports an `opus` backend. The ARCHITECTURAL-DECISIONS doc maps hardness 5 to Opus. The spec HTML says Tier 2 is "Human admin blessing" — which is a different concept (approval gate, not an LLM tier).

### Consequences

1. Tier confusion: is Tier 2 an LLM (Opus) or a human gate?
2. Both concepts exist in the code — Opus routing AND human blessing — but the spec conflates them into a single tier
3. The actual tier hierarchy appears to be: Tier 0: Ollama → Tier 1: Sonnet → Tier 1.5: Opus → Tier 2: Human

### Concrete Patch

Update spec to show 4 tiers or clarify that "Tier 2" is a human escalation gate that applies independently of model routing.

---

## Root Cause Analysis

The migration spec HTML was written early in the project (v2.5.0 header) as a planning document. As the code evolved — particularly the grid axis renaming and the Voice/Navigator cell assignment — the spec was not regenerated. The TSX section build system (`spec/render.tsx`) exists but the room/grid sections were not updated.

This is a **documentation governance gap**: the spec describes itself as the "source of truth" and is the onboarding entry point, but it has diverged from the actual source of truth (`ARCHITECTURAL-DECISIONS.md` + `src/discord/shortrank-notation.ts`).

---

## Drift Percentage Calculation

| Component | Spec HTML Claims | Canonical Source | Drift |
|-----------|-----------------|------------------|-------|
| Voice cell | B1 | B3 (5 code sources) | 100% wrong |
| Navigator cell | B3 | B1 (5 code sources) | 100% wrong |
| Axis naming (18 cells) | Old scheme (Law/Opp/Signal) | New scheme (Law/Goal/Fund etc.) | ~66% of cell names outdated |
| LLM Tier 2 | "Human admin blessing" | Opus + Human (separate) | Partial |

**Weighted overall drift: ~12%** (spec HTML is read frequently but routing logic lives in code; cell swap is most dangerous)

---

## Priority Sequencing

1. **Finding 1** (Voice/Navigator swap) — **IMMEDIATE**: This is a factual error that causes concrete misrouting if any agent trusts the spec HTML. Fix: 2 lines in HTML.
2. **Finding 2** (Axis naming) — **NEXT SESSION**: Requires updating ~18 cell references in the HTML. Should be done as part of a full spec regeneration.
3. **Finding 3** (LLM tier) — **LOW**: Clarification only; no routing impact.

---

## Intelligence Burst (for #trust-debt-public)

```
🛡️ ALIGNMENT PROPOSAL #014 — Spec HTML Coordinate & Axis Naming Drift

Drift: 12% | Migration spec HTML has stale grid mappings
HIGH: Voice=B1/Navigator=B3 in spec, but code says Voice=B3/Navigator=B1 (5 sources confirm)
MEDIUM: Spec uses old axis names (Law/Opp/Signal) vs code (Law/Goal/Fund + Speed/Deal/Signal)
LOW: Tier 2 LLM identity ambiguous (Opus vs Human blessing)

Root cause: spec HTML not regenerated after grid axis rename + cell reassignment
Impact: Any agent bootstrapping from spec gets wrong routing table
Patches: 3 proposed (cell swap fix, axis rename, tier clarification)
Patent: IAMFIM, Tesseract Coordinate Grid

📐::architect | A🛡️ Security & Trust Governance
```
