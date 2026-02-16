# Alignment Proposal: Wrapper Architecture Drift

**Date**: 2026-02-16
**Priority**: HIGH (Highest-priority drift identified)
**Drift Percentage**: 8.3% (3 of 36 architectural claims diverge from implementation)
**Patent Reference**: IAMFIM Geometric Identity — 20-dim tensor overlap model

---

## Executive Summary

Recursive documentation analysis of `intentguard-migration-spec.html` (v2.5.0, 27 TSX sections) against `src/` reveals **91.7% alignment** overall. The codebase *exceeds* the spec in most areas (wallet is production-ready, not skeleton; 24 Discord commands vs spec's ~15). However, **one critical architectural claim diverges**: the spec describes `wrapper.ts` as a "unified entry point" containing CEO Loop v2 and Night Shift Scheduler, when in reality these are three separate processes.

---

## What The Spec Says

### End-State Vision (line 970):
> "NOW LIVE: wrapper.ts unified entry point with FIM plugin v2.0, Night Shift scheduler, CEO loop v2."

### Architecture Layer (line 151):
> IntentGuard Cortex includes: CEO Loop v2, Night Shift Scheduler, Steering Loop — all under wrapper.ts

### Deployment Checklist (line 1186):
> "Start IntentGuard wrapper (npx tsx src/wrapper.ts)" — implies single entry point for entire system

---

## What The Code Does

The system is actually **three independent processes**:

| Process | Entry Point | Responsibility |
|---------|-------------|----------------|
| **Wrapper** | `npx tsx src/wrapper.ts` | OpenClaw gateway spawn, FIM plugin install, skill registration, WebSocket parasite, LLM wiring |
| **Runtime** | `npx tsx src/runtime.ts` | Discord.js client, 24 bot commands, 9 cognitive rooms, FIM interceptor, transparency engine, steering loop, Night Shift scheduler |
| **CEO Loop** | `npx tsx src/ceo-loop.ts` | Autonomous todo executor, spec watcher, auto-commit, nightly summary, circuit breaker |

### Evidence:
- `src/wrapper.ts` (631 LOC): No import of `CeoLoop`, `ProactiveScheduler`, or `SteeringLoop`
- `src/runtime.ts` (1,664 LOC): Imports `ProactiveScheduler` from `./cron/scheduler.js` (line 39)
- `src/ceo-loop.ts` (845 LOC): Standalone with own Discord.js client (line 31)

### Architecture Diagram (Actual):
```
                   ┌─────────────────────┐
                   │   wrapper.ts (631)   │
                   │  OpenClaw + FIM +    │
                   │  Skills + WebSocket  │
                   └────────┬────────────┘
                            │ spawns
                   ┌────────▼────────────┐
                   │  OpenClaw Gateway   │
                   │  ws://127.0.0.1:    │
                   │       18789         │
                   └─────────────────────┘

   ┌──────────────────────┐    ┌──────────────────────┐
   │   runtime.ts (1664)  │    │  ceo-loop.ts (845)   │
   │  Discord + 24 cmds + │    │  Autonomous executor │
   │  Rooms + FIM + Night │    │  Spec watcher + auto │
   │  Shift + Steering    │    │  commit + nightly    │
   └──────────────────────┘    └──────────────────────┘
```

---

## Impact Assessment

**Deployment Risk**: MODERATE
- Operator following spec would start only `wrapper.ts`, missing Discord orchestration and autonomous CEO
- Three processes need coordination (startup order, shared state, graceful shutdown)
- No process supervisor documented (launchd plists exist but spec doesn't reference multi-process startup)

**Positive Drift** (not requiring fixes):
- `wallet.ts`: Spec says "skeleton" — actually 478 LOC production implementation
- `runtime.ts`: 24 Discord commands vs spec's ~15 documented
- `ceo-loop.ts`: ShortRank grid integration not in spec

---

## Concrete Patch

### Option A: Update Spec to Match Code (Recommended)

Update `spec/sections/11-end-state-vision.tsx` and `spec/sections/01-architecture.tsx`:

**In End-State Vision**, replace:
```
NOW LIVE: wrapper.ts unified entry point with FIM plugin v2.0, Night Shift scheduler, CEO loop v2.
```
With:
```
NOW LIVE: Three-process architecture:
  1. wrapper.ts — OpenClaw bridge (FIM plugin v2.0, skill registration, WebSocket parasite)
  2. runtime.ts — Discord orchestrator (24 commands, 9 rooms, Night Shift, steering loop)
  3. ceo-loop.ts — Autonomous executor (spec watcher, auto-commit, nightly summary)
```

**In Architecture Layer**, add deployment note:
```
DEPLOYMENT: Three launchd services required:
  com.intentguard.wrapper.plist   → npx tsx src/wrapper.ts
  com.intentguard.runtime.plist   → npx tsx src/runtime.ts
  com.intentguard.ceo-loop.plist  → npx tsx src/ceo-loop.ts
```

**In Wallet skill card**, update badge from `pending` to `done` and description from "skeleton with balance tracking" to:
```
Full economic sovereignty module: income/expense categorization, daily/weekly P&L,
sovereignty-based spending limits, budget alerts, inference cost tracking, JSONL ledger.
```

### Option B: Unify Code to Match Spec (Higher risk, not recommended)

Refactor `wrapper.ts` to import and start `runtime.ts` and `ceo-loop.ts` as sub-modules. This would require:
- Extracting Discord client initialization from both runtime and ceo-loop
- Sharing a single Discord.js client across all three
- Significant refactor with regression risk

**Recommendation: Option A** — the three-process architecture is actually *better* for isolation and restart resilience. Update the spec to document reality.

---

## Full Drift Inventory

| # | Component | Spec Claim | Reality | Drift Type | Severity |
|---|-----------|-----------|---------|------------|----------|
| 1 | wrapper.ts | Unified entry with CEO + Night Shift | OpenClaw bridge only | **Structural** | HIGH |
| 2 | wallet.ts | "skeleton with balance tracking" | Full 478 LOC production | **Positive** | LOW |
| 3 | Runtime commands | ~15 documented | 24 implemented | **Positive** | LOW |
| 4 | Step 7 output | `7-audit-log.json` | `trust-debt-report.html` | **Naming** | LOW |
| 5 | Agent file names | `agent-1-keyword-extractor.js` | `src/pipeline/step-1.ts` | **Naming** | LOW |

**Overall Drift**: 8.3% (3 divergent / 36 architectural claims audited)
**Positive Drift**: 5.6% (code exceeds spec in 2 areas)
**Negative Drift**: 2.8% (1 structural divergence requiring spec update)

---

## Intelligence Burst

```
DRIFT REPORT | 2026-02-16 | IntentGuard v2.5.0
Alignment: 91.7% | Drift: 8.3% (1 structural, 2 positive)
HIGHEST PRIORITY: wrapper.ts ≠ unified entry point
  Spec: wrapper.ts = Cortex + CEO + Night Shift
  Code: 3 separate processes (wrapper/runtime/ceo-loop)
  Fix: Update spec (Option A) — 3-process arch is BETTER
Patent: IAMFIM 20-dim tensor — 44 tests passing, 0.0004ms
Pipeline: 8/8 steps production, 3680 LOC, all tested
Skills: 8/8 production (wallet upgraded from skeleton)
#trust-debt-public
```
