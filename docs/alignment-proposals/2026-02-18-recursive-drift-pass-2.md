# Alignment Proposal #020 — Recursive Drift Pass 2: Phantom Dispatch, Dormant Pool & Stub Channels

**Date:** 2026-02-18
**Analyst:** Claude Opus 4.6 (Recursive Documentation Mode)
**Room Context:** 📐::architect | A2 Strategy.Goal
**Spec Version:** v2.5.0 (intentguard-migration-spec.html)
**Previous Analysis:** AP-2026-02-17 (5 drifts, 87.6% alignment)
**New Drift Findings:** 7 new + 1 resolved
**Updated Drift Percentage:** 18.2% (12 drift areas across 55 cross-referenced checkpoints)
**Updated Drift Grade:** B- (81.8% alignment)

---

## Executive Summary

Second recursive pass against `intentguard-migration-spec.html` v2.5.0 reveals **7 new drift areas** not covered in the 2026-02-17 analysis. DRIFT-1 (pipeline step names) from the previous pass is now **RESOLVED** — the patch was applied. The remaining 4 prior drifts persist (DRIFT-2 through DRIFT-5).

The two HIGH-priority findings expose a **structural gap**: the CEO Loop and Agent Pool are documented as a multi-agent dispatch system but operate as single-threaded local file manipulation. This is the dominant domino — fixing it sequences everything downstream.

---

## New Drift Inventory

### DRIFT-NEW-1: CEO Loop Dispatch Is Single-Threaded, Not Multi-Agent (Priority: HIGH)

**What the spec says:**
`src/ceo-loop.ts` header (lines 2-25) describes:
> DISPATCH: Claude Flow MCP (agent_spawn + task_create) first
> 4. Dispatch via Claude Flow agent pool (up to 5 concurrent)

`DEFAULT_CONFIG` at line 98 declares `maxConcurrent: 5`.

**What the code does:**
`dispatch()` (lines 225-261) is a pure keyword-matching router to 5 inline local handlers (`createSkeleton`, `addDiscordCommand`, `wireShortRankCell`, `runShellTask`, `createBuildTask`). Zero imports from `./swarm/agent-pool`. No Claude Flow MCP calls (`agent_spawn`, `task_create`). No concurrency — tasks execute sequentially in the main loop (lines 750-780). `maxConcurrent: 5` is declared but never consulted.

**Concrete Patch:**
Either:
- (a) Wire `AgentPool.dispatch()` into `ceo-loop.ts` dispatch function, or
- (b) Update the header comment and config to accurately describe single-threaded local dispatch

**Impact:** Highest. This is the gap between "Headless CEO" as described and as implemented.

---

### DRIFT-NEW-2: Scheduler Test Asserts Old Floor (Priority: MEDIUM)

**What the spec says:** 10 registered tasks (7 safe, 3 dangerous)
**What the code does:** 15 tasks (12 safe, 3 dangerous) — confirmed
**What the test does:** `src/cron/scheduler.test.ts` line 253: `expect(status.registeredTasks).toBeGreaterThanOrEqual(10)` — passes but won't catch accidental task removal down to 10.

**Concrete Patch:**
```diff
- expect(status.registeredTasks).toBeGreaterThanOrEqual(10);
+ expect(status.registeredTasks).toBeGreaterThanOrEqual(15);
```

Also update the spec: "15 registered tasks (12 safe, 3 dangerous)."

---

### DRIFT-NEW-3: Steering Loop Sovereignty Timeouts Are Opt-In, Not Default (Priority: MEDIUM)

**What the spec says:**
> Ask-and-Predict protocol with countdown timers (5s/30s/60s sovereignty-based)

Implies sovereignty-based timing is always-on.

**What the code does:**
`src/discord/steering-loop.ts` line 46: `useSovereigntyTimeouts?: boolean` — optional, defaults to `undefined` (falsy). The 5s/30s/60s path only activates when this flag is explicitly `true` AND user tier is `'trusted'`. Otherwise flat `askPredictTimeoutMs` applies.

**Concrete Patch:**
Either:
- (a) Set `useSovereigntyTimeouts: true` in the default config / runtime.ts constructor, or
- (b) Update spec to note sovereignty timeouts require explicit opt-in

---

### DRIFT-NEW-4: Channel Adapters — WhatsApp/Telegram Are Stubs, Email Absent (Priority: MEDIUM)

**What the spec says:**
Status bar marks WhatsApp, Telegram, Email as "active" channels.

**What the code does:**
- `src/channels/whatsapp-adapter.ts`: Dynamic import of `whatsapp-web.js` with stub fallback. Package is NOT in `package.json`. Always runs in stub mode.
- `src/channels/telegram-adapter.ts`: Same pattern with `node-telegram-bot-api`. Not installed. Stub mode.
- Email adapter: **Does not exist** anywhere in `src/channels/`. Only `send_email` as an outbound FIM action in `src/auth/action-map.ts`.

**Concrete Patch:**
Update spec status bar: WhatsApp → "building", Telegram → "building", Email → "planned". Add note that adapters require optional dependency installation.

---

### DRIFT-NEW-5: X/Twitter Is File-Queue Dispatch, Not Browser Automation (Priority: MEDIUM)

**What the spec says:**
> X/Twitter (browser automation)

**What the code does:**
`src/discord/x-poster.ts` writes a task to `data/task-queue/poster.jsonl` and polls `data/browser-post-state.json` with 30s timeout. No browser automation code exists in IntentGuard — it delegates to OpenClaw's `browser-poster` skill. If OpenClaw is not running, posting times out silently.

Additionally, `tweet-composer.ts` line 18: `Cross-post: X/Twitter via thetadriven.com/api/tweet (future)` — direct API marked as future work.

**Concrete Patch:**
Update spec: "X/Twitter (file-queue dispatch to OpenClaw browser-poster skill; requires OpenClaw runtime)"

---

### DRIFT-NEW-6: runtime.ts Is 2,202 Lines, Not 837 (Priority: LOW)

**What the spec says:** `openclaw/src/runtime.ts (837 lines, discord.js v14)`
**What the code does:** `src/runtime.ts` is now 2,202 lines (+163%). Still discord.js v14.

**Concrete Patch:** Update spec line count reference to ~2,200 or remove specific LOC counts.

---

### DRIFT-NEW-7: Agent Pool Is Dormant Dead Code (Priority: HIGH)

**What the spec says:**
> Agent Swarms — Hierarchical mesh of 15+ agents for parallel task execution

`src/swarm/agent-pool.ts` header claims "Pool of 50 agent slots (1-50)."

**What the code does:**
`src/swarm/agent-pool.ts` (640 lines) and `src/swarm/pool-integration.ts` are fully implemented but **never imported** from `ceo-loop.ts`, `runtime.ts`, or any scheduler hook. The pool launches agents via `swarm-launch-N.sh` scripts in a cross-repo path that may not exist. Zero concurrent agents at runtime.

**Concrete Patch:**
Either:
- (a) Wire `AgentPool` into `ceo-loop.ts` dispatch (see DRIFT-NEW-1), or
- (b) Document that the pool is implemented but not yet integrated into the CEO Loop dispatch path

---

### DRIFT-1 (Previous): Pipeline Step Names — RESOLVED

`src/pipeline/runner.ts` lines 52-61 now correctly use `outcome-requirements`, `indexed-keywords`, `categories-balanced`, `presence-matrix`, `grades-statistics`, `timeline-history`, `analysis-narratives`, `final-report`. Patch applied. Closing DRIFT-1.

---

## Domino Sequence (A2 Strategy.Goal)

The indigo light shows what to sequence first:

1. **DRIFT-NEW-1 + DRIFT-NEW-7** (HIGH) — CEO Loop + Agent Pool integration is the **first domino**. The system claims multi-agent dispatch but runs single-threaded. Wiring `AgentPool.dispatch()` into `ceo-loop.ts` unblocks the "Headless CEO" value proposition.
2. **DRIFT-NEW-3** (MEDIUM) — Sovereignty timeouts should be default-on to match the spec's security posture.
3. **DRIFT-NEW-4** (MEDIUM) — Channel adapter status honesty. Mark stubs as "building" in the spec.
4. **DRIFT-NEW-5** (MEDIUM) — X posting dependency on OpenClaw should be explicit.
5. **DRIFT-NEW-2** (MEDIUM) — Test assertion tightening. Quick fix.
6. **DRIFT-NEW-6** (LOW) — LOC count. Cosmetic.

---

## Consolidated Drift Dashboard

| ID | Area | Priority | Status |
|----|------|----------|--------|
| DRIFT-1 | Pipeline step names | HIGH | **RESOLVED** |
| DRIFT-2 | Night Shift task count | MEDIUM | Open |
| DRIFT-3 | Line number references | LOW | Open |
| DRIFT-4 | Wrapper connectWebSocket | LOW | Open |
| DRIFT-5 | Extra skills undocumented | LOW | Open |
| DRIFT-NEW-1 | CEO Loop phantom dispatch | **HIGH** | **New** |
| DRIFT-NEW-2 | Scheduler test floor | MEDIUM | **New** |
| DRIFT-NEW-3 | Steering sovereignty opt-in | MEDIUM | **New** |
| DRIFT-NEW-4 | Channel adapter stubs | MEDIUM | **New** |
| DRIFT-NEW-5 | X posting file-queue | MEDIUM | **New** |
| DRIFT-NEW-6 | runtime.ts LOC count | LOW | **New** |
| DRIFT-NEW-7 | Agent pool dormant | **HIGH** | **New** |

**Open drifts:** 11 (2 HIGH, 4 MEDIUM, 5 LOW)
**Resolved:** 1 (DRIFT-1)

---

## Patent Reference

This analysis supports the IntentGuard sovereign governance architecture (FIM Auth Geometry, 20-dimensional tensor overlap, 0.0004ms computation). No drift found in the mathematical model — `src/auth/geometric.ts` remains spec-compliant. All drift is in the orchestration layer (CEO Loop dispatch, agent pool wiring, channel adapter status) and documentation metadata.

---

*Generated by Recursive Documentation Mode — Claude Opus 4.6*
*Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>*
