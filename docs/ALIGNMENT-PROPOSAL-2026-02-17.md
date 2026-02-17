# Alignment Proposal: Migration Spec vs Source Code Drift (Recursive Audit)

**Date:** 2026-02-17
**Auditor:** Claude Opus 4.6 (Recursive Documentation Mode)
**Spec Version:** v2.5.0 (intentguard-migration-spec.html)
**Drift Percentage:** 31% (5 of 16 tracked modules show moderate-to-severe drift)

---

## Executive Summary

Cross-referencing `intentguard-migration-spec.html` (v2.5.0) against `src/` reveals **11 of 16 modules with zero drift** and **5 modules with actionable drift**. The highest-priority drift is a **pipeline bucket naming inconsistency** that causes a runtime path resolution bug between pipeline steps.

---

## Drift Classification

### CRITICAL: Pipeline Bucket Name Mismatch (Internal Inconsistency)

**What the spec says:**
- Step 0 produces `0-outcome-requirements.json`
- Step 7 produces `trust-debt-report.html`

**What the code does:**
- `src/pipeline/step-0.ts:246` writes `0-raw-materials.json`
- `src/pipeline/step-7.ts:570` writes `7-final-report.html`
- BUT `src/pipeline/step-4.ts:379` reads from `0-outcome-requirements/0-outcome-requirements.json`
- AND `src/pipeline/step-6.ts:434` reads from `0-outcome-requirements.json`

**Impact:** Steps 4 and 6 reference a file path that Step 0 never creates. This is a **latent runtime bug** — the pipeline will fail at Step 4 if Step 0's output directory uses the actual name (`0-raw-materials`) rather than the spec name (`0-outcome-requirements`).

**Concrete Patch:**

Option A (align code to spec): Rename Step 0 output from `0-raw-materials.json` to `0-outcome-requirements.json` in `step-0.ts:246` and update `runner.test.ts` + `step-7.test.ts`.

Option B (align spec + downstream to code): Update `step-4.ts:379` and `step-6.ts:434` to read `0-raw-materials/0-raw-materials.json`, and update the spec's bucket naming table.

**Recommended:** Option A. The spec name `0-outcome-requirements` is semantically accurate (Step 0 parses outcome requirements). The code name `0-raw-materials` is vague.

```diff
--- a/src/pipeline/step-0.ts
+++ b/src/pipeline/step-0.ts
@@ -246 +246 @@
-    join(stepDir, '0-raw-materials.json'),
+    join(stepDir, '0-outcome-requirements.json'),
```

---

### SEVERE: `src/rooms/` Directory Missing

**What the spec says:**
- `.workflow/rooms/ (9 HTML rooms + dashboard)` migrates to `intentguard/src/rooms/`
- Status: `building` (implies active work)

**What the code does:**
- No `src/rooms/` directory exists
- Cognitive room routing is distributed across `src/grid/hot-cell-router.ts` and `src/channels/types.ts` (which has a `room: string` field)

**Recommendation:** Update the spec to reflect that rooms are a routing concept within `src/grid/` rather than a standalone module. The grid-based architecture is more cohesive.

---

### SEVERE: `src/mcp/crm.ts` Missing

**What the spec says:**
- `packages/crm-mcp/ (thetacoach-crm npm)` migrates to `intentguard/src/mcp/crm.ts`
- 8 CRM tools, Supabase backend
- Status: `pending`

**What the code does:**
- No `src/mcp/` directory exists
- No CRM implementation found anywhere in `src/`

**Recommendation:** Spec correctly marks this as `pending`. Add a `blocked-by: supabase-config` annotation to clarify the dependency chain.

---

### MODERATE: Discord Integration Path Wrong

**What the spec says:**
- Migrates to `intentguard/src/channels/discord.ts` (single file)

**What the code does:**
- No `src/channels/discord.ts` exists
- Discord is a full 24-file module at `src/discord/` (steering-loop, channel-manager, task-store, transparency-engine, etc.)

**Recommendation:** Update spec target from `src/channels/discord.ts` to `src/discord/` (multi-file module).

---

### MODERATE: Tesseract Path Wrong

**What the spec says:**
- Migrates to `intentguard/src/tesseract/`

**What the code does:**
- No `src/tesseract/` directory exists
- Logic distributed: `src/grid/tesseract-client.ts`, `src/skills/tesseract-trainer.ts`, `src/api/tesseract-playground.ts`

**Recommendation:** Update spec to reflect the distributed tesseract implementation.

---

## Zero-Drift Modules (Confirmed Aligned)

| Module | Spec Path | Verification |
|--------|-----------|-------------|
| FIM Geometric Auth | `src/auth/geometric.ts` | 373 LOC, 44 tests passing |
| FIM Plugin | `src/auth/plugin.ts` | 224 LOC, 16 tests passing |
| Voice Memo Reactor | `src/skills/voice-memo-reactor.ts` | 248 LOC (spec: 249) |
| Claude Flow Bridge | `src/skills/claude-flow-bridge.ts` | 732 LOC + 606 LOC tests |
| CEO Loop | `src/ceo-loop.ts` | 844 LOC, matches description |
| WebSocket Parasite | `src/wrapper.ts` | 630 LOC, named "parasite hook" |
| Night Shift Scheduler | `src/cron/scheduler.ts` | Fully implemented |
| 3-Tier LLM Grounding | `src/wrapper.ts` | All 3 tiers present |
| Steering Loop | `src/discord/steering-loop.ts` | Ask-and-Predict with countdowns |
| Pipeline Directory | `src/pipeline/` | 8 steps, all TypeScript |
| Grid Directory | `src/grid/` | 20 files |

---

## Priority Action Items

| Priority | Action | Files Affected |
|----------|--------|----------------|
| P0 | Fix pipeline bucket naming bug (steps 4/6 reference non-existent `0-outcome-requirements.json`) | `step-0.ts`, `step-4.ts`, `step-6.ts`, `runner.test.ts`, `step-7.test.ts` |
| P1 | Update spec: Discord path, Tesseract path, Step 7 output name | `intentguard-migration-spec.html` |
| P2 | Decide rooms architecture: create `src/rooms/` or update spec | spec or new directory |
| P3 | Track CRM MCP blocked-by annotation | spec |
