# Alignment Proposal #012 — Skills Inventory Explosion + Cron Architecture Divergence

**Date:** 2026-02-18
**Analyst:** Claude Opus 4.6 (Recursive Documentation Mode)
**Room:** 📐::architect | A🛡️ Security & Trust Governance
**Patent Reference:** IAMFIM, Tesseract Coordinate Grid
**Severity:** HIGH (skills) + MEDIUM (cron)
**Overall Drift:** ~22%

---

## Executive Summary

Two interrelated drifts have compounded since the migration spec was last updated:

1. **Skills Inventory Explosion**: Spec documents 13 skills; code contains 20+ skill files (7 unspec'd), representing a 54% overshoot in the skills layer.
2. **Cron Architecture Divergence**: Spec defines 4 isolated Claude-session cron jobs with fixed schedules; code implements a single `ProactiveScheduler` class with 14 heartbeat-driven tasks and fundamentally different scheduling semantics.

These drifts are `repo_ahead` — the code has evolved beyond the spec, not behind it. The risk is not broken functionality but **ungoverned growth**: skills and scheduled tasks that bypass spec review, trust-debt categorization, and FIM permission mapping.

---

## Finding 1: Skills Inventory Drift (HIGH)

### What the Spec Says

The migration spec (§Skills Inventory) enumerates exactly **13 skills**:

| # | Skill | Source | Status |
|---|-------|--------|--------|
| 1 | claude-flow-bridge | Ported | Live |
| 2 | voice-memo-reactor | Ported | Live |
| 3 | thetasteer-categorize | Ported | Live |
| 4 | llm-controller | Ported | Live |
| 5 | system-control | Ported | Live |
| 6 | tesseract-trainer | Ported | Live |
| 7 | email-outbound | Native | Live |
| 8 | artifact-generator | Native | Live |
| 9 | cost-reporter | Native | Live |
| 10 | wallet-ledger | Native | Live |
| 11 | geometry-converter | Native | Live |
| 12 | stl-writer | Native | Live |
| 13 | wallet | Native | Skeleton |

### What the Code Does

`src/skills/` contains **20 non-test `.ts` files**. The following 7 files exist in code but NOT in the spec:

| File | LOC | Phase | Risk |
|------|-----|-------|------|
| `budget-alerts.ts` | ~180 | Phase 6 | Sovereignty-adjusted spending thresholds — interacts with FIM layer |
| `artifact-comparison.ts` | ~150 | Phase 7 | Compares 3D artifacts across time — no FIM mapping |
| `cost-reporter-scheduler.ts` | ~120 | Phase 6 | Daily/weekly cost report posting — duplicates logic now in `src/cron/` |
| `task-cost-tracker.ts` | ~200 | Phase 6 | Per-task inference cost tracking — financial data, needs audit trail |
| `revenue-intake.ts` | ~180 | Phase 6 | Revenue intake stub with crypto wallet types — future economic surface |
| `budget-alerts.example.ts` | ~40 | Phase 6 | Example file (should not be in src/) |
| `cost-reporter-scheduler.example.ts` | ~40 | Phase 6 | Example file (should not be in src/) |

**Additionally**: `wallet-ledger.ts` IS in the spec table but was added after the initial 13-skill inventory was written, and `wallet.ts` is listed as "skeleton" but is actually a 478-LOC complete implementation (already noted in AP-2026-02-17-comprehensive).

### Why This Matters

- **FIM gap**: `budget-alerts.ts` and `task-cost-tracker.ts` handle financial data and interact with sovereignty scores, but have no FIM `actionRequirement` mapping in `src/auth/geometric.ts`. They operate outside the permission gate.
- **Spec-as-governance**: The spec is the contract for what the system does. 7 unspec'd skills mean 7 capabilities that haven't been reviewed against the 20-dimensional trust-debt categories.
- **Example files in src/**: `*.example.ts` files belong in `examples/` or `docs/`, not `src/skills/`.

---

## Finding 2: Cron Architecture Divergence (MEDIUM)

### What the Spec Says

The spec (§CEO Proactive Analysis — Cron Jobs) defines **4 cron jobs**:

| Job | Schedule | Session Type | Timeout |
|-----|----------|-------------|---------|
| Spec Drift Detector | Every 4h | Isolated Claude session | 300s |
| Code Review Scout | Every 6h | Isolated Claude session | 300s |
| Task Planner | 6AM, 2PM, 10PM | Isolated Claude session | 300s |
| Trust Debt Monitor | Daily 3AM | Isolated Claude session | 300s |

Each job is described as an **isolated Claude session** that writes a proposal to `~/.openclaw/workspace/proposals/`.

### What the Code Does

`src/cron/scheduler.ts` implements a **ProactiveScheduler** class with:
- **14 registered tasks** (not 4)
- A **15-minute heartbeat** loop (not fixed schedules)
- **Cooldown-based** scheduling (not cron expressions)
- Tasks are **injected into the SteeringLoop** (not isolated sessions)
- No proposal file writing to `~/.openclaw/workspace/proposals/`

The 14 tasks include the spec's 4 jobs but also 10 additional tasks:

| Task ID | Cooldown | Spec Equivalent |
|---------|----------|-----------------|
| `trust-debt-report` | 6h | Trust Debt Monitor ≈ |
| `spec-progress` | 3h | ~ Spec Drift Detector |
| `spec-drift-scan` | 1h | Spec Drift Detector (different impl) |
| `recursive-documentation` | 1h | ❌ Not in spec |
| `test-coverage-scan` | 2h | ❌ Not in spec |
| `fim-benchmark` | 8h | ❌ Not in spec |
| `room-context-cleanup` | 4h | ❌ Not in spec |
| `nightly-summary` | 24h | ❌ Not in spec |
| `grid-heartbeat` | 30min | ❌ Not in spec |
| `deep-refactor` | 12h | ❌ Not in spec (dangerous) |
| `spec-implement` | 1h | ❌ Not in spec (dangerous) |
| `cost-health-check` | 2h | ❌ Not in spec |
| `sovereignty-stability-monitor` | 24h | ❌ Not in spec |
| `sovereignty-stability-check` | 24h | ❌ DUPLICATE of above |
| `config-optimize` | 24h | ❌ Not in spec (dangerous) |

### Additional Cron Issues

1. **Duplicate tasks**: `sovereignty-stability-monitor` and `sovereignty-stability-check` have identical descriptions ("Monitor sovereignty score for 30-day stability"), different IDs, and slightly different `shouldRun` logic. One runs at any time; the other only between 8-10 AM.
2. **12×12 grid reference**: Task `spec-drift-scan` references "12×12 grid" but the spec defines a 3×3 grid (expanded to 3×4 per AP-011). The `12×12` claim appears to be aspirational, not implemented.
3. **Missing Code Review Scout**: The spec's "Code Review Scout" (every 6h, analyze git commits) has no direct equivalent in the task registry.
4. **Missing Task Planner**: The spec's "Task Planner" (6AM/2PM/10PM, prioritize next session) has no equivalent.
5. **Cost report scheduler duplication**: `src/cron/cost-report-scheduler.ts` AND `src/skills/cost-reporter-scheduler.ts` both implement cost report scheduling — two files doing the same job.

---

## Concrete Patch

### Patch A: Update Spec Skills Table (Recommended)

Add the 5 legitimate new skills to the spec (exclude example files):

```diff
 | 13 | wallet              | Native | Complete |
+| 14 | budget-alerts       | Native | Live     |
+| 15 | artifact-comparison | Native | Live     |
+| 16 | task-cost-tracker   | Native | Live     |
+| 17 | revenue-intake      | Native | Stub     |
+| 18 | wallet-ledger       | Native | Live     |
```

Update wallet status from "Skeleton" to "Complete" (478 LOC).

### Patch B: Move Example Files

```bash
mkdir -p examples/skills
mv src/skills/budget-alerts.example.ts examples/skills/
mv src/skills/cost-reporter-scheduler.example.ts examples/skills/
mv src/skills/artifact-comparison-example.ts examples/skills/
```

### Patch C: Deduplicate Cost Report Scheduler

Delete `src/skills/cost-reporter-scheduler.ts` — the canonical implementation lives in `src/cron/cost-report-scheduler.ts`. Update any imports.

### Patch D: Deduplicate Sovereignty Tasks

Merge `sovereignty-stability-monitor` and `sovereignty-stability-check` into a single task with the 8-10 AM window from the latter.

### Patch E: Update Spec Cron Section

Replace the 4-job cron table with the actual ProactiveScheduler architecture:

```diff
-### CEO Proactive Analysis (Cron Jobs)
-| Job | Schedule | Session | Timeout |
-| Spec Drift Detector | Every 4h | Isolated | 300s |
-| Code Review Scout | Every 6h | Isolated | 300s |
-| Task Planner | 6AM, 2PM, 10PM | Isolated | 300s |
-| Trust Debt Monitor | Daily 3AM | Isolated | 300s |
+### Night Shift — ProactiveScheduler
+| Architecture | Heartbeat-driven, 15-min interval, cooldown-based |
+| Location | src/cron/scheduler.ts |
+| Tasks | 14 registered (11 safe, 3 dangerous) |
+| Injection | SteeringLoop (not isolated sessions) |
+| Rate Limit | 4 tasks/hour max |
```

### Patch F: Add FIM Action Requirements for Financial Skills

```typescript
// src/auth/geometric.ts — add to ACTION_REQUIREMENTS
'budget_alert': {
  minSovereignty: 0.5,
  required: { resource_efficiency: 0.6, transparency: 0.5 }
},
'task_cost_track': {
  minSovereignty: 0.4,
  required: { resource_efficiency: 0.5, data_integrity: 0.6 }
},
'revenue_record': {
  minSovereignty: 0.6,
  required: { data_integrity: 0.7, accountability: 0.6, compliance: 0.5 }
}
```

### Patch G: Fix 12×12 Grid Reference

Update `spec-drift-scan` task description from "12×12" to "3×4" to match AP-011's expanded grid.

---

## Drift Percentage Calculation

| Category | Spec Items | Code Items | Delta | Drift |
|----------|-----------|------------|-------|-------|
| Skills | 13 | 20 | +7 | 54% overshoot |
| Cron jobs | 4 | 14 | +10 | 250% overshoot |
| Cron architecture | isolated sessions | heartbeat class | fundamental | 100% divergent |
| FIM mappings for new skills | expected 5 | actual 0 | -5 | 100% gap |

**Weighted overall drift: ~22%** (skills layer is 14% of codebase weight, cron is 8%)

---

## Priority

1. **Patch F** (FIM mappings) — CRITICAL: financial skills operating outside permission gate
2. **Patch D** (deduplicate sovereignty tasks) — HIGH: duplicate scheduled task is a correctness issue
3. **Patch C** (deduplicate cost scheduler) — HIGH: two files doing the same job
4. **Patch E** (update spec cron) — MEDIUM: spec-as-governance integrity
5. **Patch A** (update spec skills) — MEDIUM: spec-as-governance integrity
6. **Patch G** (fix 12×12) — LOW: cosmetic
7. **Patch B** (move examples) — LOW: file organization

---

## Intelligence Burst (for #trust-debt-public)

```
🛡️ ALIGNMENT PROPOSAL #012 — Skills & Cron Architecture Drift

Drift: 22% | Skills: 13 spec → 20 code (+54%) | Cron: 4 spec → 14 code (+250%)
CRITICAL: 5 financial skills operating outside FIM permission gate
Duplicate: sovereignty-stability-monitor × 2, cost-report-scheduler × 2

Patches: 7 proposed (FIM mapping, dedup, spec update)
Patent: IAMFIM, Tesseract Coordinate Grid

📐 Recursive Documentation Mode — AP-012 committed locally
```
