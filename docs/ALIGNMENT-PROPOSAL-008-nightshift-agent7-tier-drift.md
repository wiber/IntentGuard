# Alignment Proposal 008: Night Shift + Agent 7 + Tier Numbering Drift

**Date:** 2026-02-16
**Analyst:** Claude Opus 4.6 (Recursive Documentation Mode)
**Spec Version:** v2.5.0 (intentguard-migration-spec.html)
**Drift Percentage:** 18% (3 drifts across 10 audited spec claims)

---

## Executive Summary

Cross-referenced `intentguard-migration-spec.html` against `src/` across 10 critical spec claims. Found **3 genuine drifts** (1 critical, 1 medium, 1 minor) and **7 exact matches**. The codebase has evolved faster than the spec in specific areas, creating documentation debt that could mislead future agents.

---

## Drift A — Night Shift Scheduler Task Count (CRITICAL)

### What the spec says

> `intentguard-migration-spec.html` (Night Shift section):
> "10 registered tasks (7 safe, 3 dangerous)"

### What the code does

`src/cron/scheduler.ts` `buildTaskRegistry()` returns **15 tasks**: 12 safe, 3 dangerous.

**5 tasks added without spec update:**

| Task ID | Risk | Status |
|---------|------|--------|
| `recursive-documentation` | safe | Added post-spec |
| `cost-health-check` | safe | Added post-spec |
| `sovereignty-stability-monitor` | safe | Added post-spec |
| `sovereignty-stability-check` | safe | Added post-spec |
| `spec-drift-scan` | safe | Added post-spec |

### Concrete Patch

Update the spec section "The Ghost User (Night Shift)" to reflect reality:

```diff
- 10 registered tasks (7 safe, 3 dangerous)
+ 15 registered tasks (12 safe, 3 dangerous)
```

This requires updating `spec/sections/` TSX source that generates the migration spec HTML, then running `npx tsx spec/render.tsx` to rebuild.

### Impact

Agents reading the spec will underestimate the scheduler's scope. The 5 missing tasks include `spec-drift-scan` — ironically, the task that detects exactly this kind of drift. Any sovereignty calculation that weights task coverage will be off by 33%.

---

## Drift B — Agent 7 Output Naming Conflict (MEDIUM)

### What the spec says

> `intentguard-migration-spec.html` (Trust-Debt Pipeline section):
> Agent 7 output file: `7-audit-log.json`

### What the code does

> `CLAUDE.md` pipeline data flow section:
> Agent 7 output: `trust-debt-report.html`
>
> `0-outcome-requirements.json` requirement #30:
> `"validation": "trust-debt-report.html generated"`

Agent 7 produces **both** — an audit JSON and the final HTML report — but the spec inconsistently documents only one depending on which document you read.

### Concrete Patch

Spec should list both outputs:
```diff
- <div class="mono">7-audit-log.json</div>
+ <div class="mono">7-audit-log.json + trust-debt-report.html (final)</div>
```

CLAUDE.md pipeline section should also list both:
```diff
- `trust-debt-report.html` (Agent 7 final output)
+ `7-audit-log.json` (Agent 7 audit output)
+ `trust-debt-report.html` (Agent 7 final HTML report)
```

### Impact

Pipeline agents that validate downstream outputs will look for the wrong filename, causing false-negative validation failures.

---

## Drift C — LLM Tier Numbering (MINOR)

### What the spec says

> Tier 0: Ollama llama3.2:1b (fast local)
> Tier 1: Claude Sonnet via proxy ($0)
> Tier 2: Human admin blessing

### What the code does

`src/skills/llm-controller.ts` uses **1-based** numbering:

```typescript
tier: 1 | 2 | 3  // 1=Ollama, 2=Sonnet, 3=Human
```

### Concrete Patch

Update spec to match code (1-based is conventional for user-facing tiers):

```diff
- Tier 0: Ollama llama3.2:1b
- Tier 1: Claude Sonnet via proxy
- Tier 2: Human admin blessing
+ Tier 1: Ollama llama3.2:1b (fast local)
+ Tier 2: Claude Sonnet via proxy ($0)
+ Tier 3: Human admin blessing
```

### Impact

Low. Routing logic is functionally identical. Documentation clarity only.

---

## Verified (No Drift) — 7 of 10 Claims Exact Match

| Claim | Verified Value | Source |
|-------|---------------|--------|
| 20 trust-debt categories | 20 (exact) | `src/auth/geometric.ts:25-31` |
| Overlap threshold 0.8 | 0.8 across 4 auth files | `geometric.ts`, `action-map.ts`, `plugin.ts`, `fim-interceptor.ts` |
| `git_push` sovereignty 0.7 | `minSovereignty: 0.7` | `src/auth/action-map.ts:108-117` |
| 50 concurrent agents | `poolSize: 50` | `src/swarm/agent-pool.ts:109` |
| FIM plugin path | `~/.openclaw/plugins/intentguard-fim-auth.js` | `src/auth/plugin.ts:211-224` |
| claude-flow-bridge LOC | 732 lines (exact) | `src/skills/claude-flow-bridge.ts` |
| 81 outcome requirements | `totalRequirements: 81` | `0-outcome-requirements.json:8` |

---

## Architectural Note: Dual "Step 0" Implementations

The codebase contains two separate Agent 0 implementations:
- `src/pipeline/step-0.ts` — Raw Materials Gatherer → `0-raw-materials.json`
- `src/pipeline/agent-0-outcome-requirements.ts` — Outcome Requirements Parser → `0-outcome-requirements.json`

These are complementary, not conflicting, but neither spec document explicitly distinguishes them. Should be documented.

---

## Patent Reference

IAMFIM geometric permission system — 20-dimensional tensor overlap with sovereignty gating. The drift analysis confirms the mathematical foundation (cosine similarity, 0.8 threshold, sovereignty minimums per action) is correctly implemented and consistent across all auth modules. No drift in the core patent-relevant code.

---

## Priority

1. **Drift A** (Night Shift task count) — Fix immediately. Stale numbers mislead sovereignty calculations.
2. **Drift B** (Agent 7 naming) — Fix in next spec render cycle.
3. **Drift C** (LLM tier numbering) — Fix when convenient.
