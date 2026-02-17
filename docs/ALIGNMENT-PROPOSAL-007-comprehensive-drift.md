# Alignment Proposal 007: Comprehensive Spec-to-Code Drift Audit

**Date:** 2026-02-16
**Analyst:** Claude Opus 4.6 (Recursive Documentation Mode)
**Spec Version:** v2.5.0 (intentguard-migration-spec.html)
**Drift Percentage:** ~18% (7 material findings across 16 audited claims)
**Patent Reference:** IAMFIM (Fractal Identity Map) — 20-dim geometric permission system

---

## Executive Summary

A recursive documentation audit cross-referencing `intentguard-migration-spec.html` (v2.5.0) against `src/` reveals **7 material drift items** out of 16 audited spec claims. The overall architecture is sound — the FIM geometric auth, trust-debt pipeline, steering loop, and federation handshake all match spec. However, the spec over-claims test coverage, mischaracterizes integration boundaries, and marks stubs as complete in several places.

**Overall Grade: B+ (82% alignment)**

---

## Drift Findings (Ranked by Severity)

### CRITICAL — D1: system-control.ts test count overclaimed 2x

| | |
|---|---|
| **Spec says** | `system-control.test.ts`: 433 LOC, **80+ test cases** |
| **Code does** | 491 LOC, **37 test cases** (`grep -c "it(" system-control.test.ts = 37`) |
| **Impact** | Spec claims 2.16x more tests than exist. Creates false confidence in macOS native control coverage |

**Concrete Patch:**
Update spec Section "Skills Inventory" system-control card:
```diff
- <span class="mono">intentguard/src/skills/system-control.ts</span> | 481 LOC + 433 LOC tests
+ <span class="mono">intentguard/src/skills/system-control.ts</span> | 480 LOC + 491 LOC tests (37 test cases)
```
Remove "80+ test cases" claim from the detail line, or add 43+ more tests to reach the claim.

---

### HIGH — D2: Pipeline steps 4 and 5 have ZERO test files

| | |
|---|---|
| **Spec says** | Trust-Debt Pipeline steps 0-7: all marked `badge-done` |
| **Code does** | `step-4.ts` (578 LOC) and `step-5.ts` (337 LOC) exist but have **no test files** |
| **Impact** | Grades & Statistics (step 4) and Timeline & Historical Analyzer (step 5) are untested. Pipeline runner accepts `placeholder` status as success. |

**Concrete Patch:**
1. Create `src/pipeline/step-4.test.ts` covering grade calculation, edge cases (zero scores, missing categories)
2. Create `src/pipeline/step-5.test.ts` covering timeline generation, historical trend detection
3. Or: change spec badges from `badge-done` to `badge-wip` for steps 4-5

---

### HIGH — D3: wrapper.ts does NOT include CEO loop v2

| | |
|---|---|
| **Spec says** | wrapper.ts: "NOW LIVE: wrapper.ts unified entry point with FIM plugin v2.0, Night Shift scheduler, CEO loop v2" |
| **Code does** | `wrapper.ts` (630 LOC) has FIM plugin and WebSocket hook. **Zero references to CEO loop.** `ceo-loop.ts` (844 LOC) is a standalone CLI script with its own `ceoLoop(config).catch(...)` entry. |
| **Impact** | The "unified entry point" is not unified — CEO loop runs as a separate process. Architecture split is undocumented. |

**Concrete Patch:**
Update spec End-State Vision Cortex card:
```diff
- NOW LIVE: wrapper.ts unified entry point with FIM plugin v2.0, Night Shift scheduler, CEO loop v2.
+ NOW LIVE: wrapper.ts unified entry point with FIM plugin v2.0. Night Shift scheduler wired via runtime.ts. CEO loop v2 runs as standalone process (src/ceo-loop.ts).
```

---

### HIGH — D4: FIM interceptor is skill-level wrapper, not MCP proxy

| | |
|---|---|
| **Spec says** | "Build MCP proxy interceptor (OpenClaw plugin hook)" — Phase 2 checklist, marked done |
| **Code does** | `fim-interceptor.ts` wraps **skill execution** only. Maps 5 skills to tool names (`SKILL_TO_TOOL`). Many skills are `FIM_EXEMPT`. Does NOT intercept at MCP protocol level. Zero references to "MCP" or "protocol" in the file. |
| **Impact** | The spec's MCP interception pseudocode (Section "IAMFIM") describes protocol-level interception. The implementation is application-level. External MCP tools bypass FIM entirely. |

**Concrete Patch:**
Update spec Phase 2 checklist:
```diff
- check-done: Build MCP proxy interceptor (OpenClaw plugin hook)
+ check-done: Build skill-level FIM interceptor (5 skills mapped, internal only)
+ check-todo: Extend to MCP protocol-level interception via OpenClaw plugin hook
```

---

### MEDIUM — D5: CEO loop Discord commands are stubs

| | |
|---|---|
| **Spec says** | Phase 1 checklist marks `!wallet`, `!artifact`, `!federation`, `!grid` as done |
| **Code does** | `ceo-loop.ts` lines ~336-357: all four return stub messages ("not yet connected") with `// TODO: Wire to X skill when ready` |
| **Impact** | Four bot commands are non-functional. Users see "Feature not yet connected" responses. |

**Concrete Patch:**
Change spec Phase 1 badge for these commands from `check-done` to `check-wip`, or wire the existing skill modules (`wallet.ts`, `artifact-generator.ts`, `federation/handshake.ts`, `grid/tesseract-client.ts`) into the CEO loop dispatch.

---

### MEDIUM — D6: FIM plugin version drift (v2.0.0 vs v2.1.0)

| | |
|---|---|
| **Spec says** | "FIM Auth Plugin v2.0" |
| **Code does** | `wrapper.ts` hardcodes `pluginVersion = '2.0.0'` in inline plugin. `src/auth/plugin.ts` (canonical generator) produces `2.1.0`. |
| **Impact** | Two codepaths generate different plugin versions. If wrapper installs first, v2.0.0 overwrites v2.1.0. |

**Concrete Patch:**
```diff
// wrapper.ts — align with plugin.ts canonical version
- const pluginVersion = '2.0.0';
+ const pluginVersion = '2.1.0';
```

---

### LOW — D7: geometric.ts status comment contradicts implementation

| | |
|---|---|
| **Spec says** | FIM auth: "Real 20-dim vector math, dot product, cosine similarity" — marked IMPLEMENTED |
| **Code does** | `geometric.ts` line 19: `STATUS: v0.1 — threshold-based overlap. Cosine similarity planned for v0.2.` But `cosineSimilarity()` IS implemented (line 125). Permission gate uses threshold scoring, not cosine. |
| **Impact** | Misleading developer comment. Cosine exists but isn't wired into permission check path. |

**Concrete Patch:**
```diff
// geometric.ts line 19
- * STATUS: v0.1 — threshold-based overlap. Cosine similarity planned for v0.2.
+ * STATUS: v0.2 — threshold-based overlap with cosine similarity available.
```

---

## Benign Discrepancies (No Action Needed)

| Claim | Reality | Note |
|-------|---------|------|
| voice-memo-reactor.test.ts: 438 LOC | 536 LOC (more) | Tests grew beyond spec snapshot |
| claude-flow-bridge.test.ts: 596 LOC | 606 LOC (more) | Tests grew beyond spec snapshot |
| llm-controller.test.ts: 378 LOC | 462 LOC (more) | Tests grew beyond spec snapshot |
| voice-memo-reactor.ts: 249 LOC | 248 LOC | Off by 1 |
| system-control.ts: 481 LOC | 480 LOC | Off by 1 |

---

## Claims That PASS Audit (9/16)

1. **geometric.ts**: 20-dim vectors, dot product, cosine similarity, 44 tests -- ALL CONFIRMED
2. **plugin.ts**: OpenClaw plugin generator, 16 tests -- CONFIRMED
3. **steering-loop.ts**: Ask-and-Predict, 5s/30s/60s sovereignty countdown -- CONFIRMED
4. **runtime.ts**: Main orchestrator with ProactiveScheduler, Discord, FIM, channels -- CONFIRMED
5. **cron/scheduler.ts**: Night Shift proactive injection -- CONFIRMED
6. **federation/handshake.ts**: Bot-to-bot trust, tensor overlap, 0.8 threshold -- CONFIRMED
7. **ceo-loop.ts**: Infinite loop, heartbeat, circuit breaker, nightly summary -- CONFIRMED
8. **claude-flow-bridge.ts**: 732 LOC, 9-room dispatch, recursion guard -- CONFIRMED
9. **Overlap threshold**: 0.8 in geometric.ts, wrapper.ts, plugin.ts -- CONFIRMED

---

## Recommended Priority

1. **D2** — Write tests for pipeline steps 4-5 (closes the biggest real coverage gap)
2. **D4** — Recharacterize FIM interceptor scope in spec (prevents false security assumptions)
3. **D1** — Fix system-control test count claim (prevents trust erosion)
4. **D6** — Align plugin version (prevents runtime version conflict)
5. **D3** — Document CEO loop as separate process (architecture clarity)
6. **D5** — Wire stub commands or mark as WIP (user-facing honesty)
7. **D7** — Fix status comment (developer clarity)

---

## Methodology

- Cross-referenced all 16 key spec claims against actual file contents
- Verified LOC counts with `wc -l`, test counts with `grep -c "it("`
- Searched for `TODO`, `stub`, `placeholder`, `Not implemented` patterns
- Checked import graphs to verify integration claims
- Confirmed threshold values (0.8 overlap, sovereignty tiers) match between spec pseudocode and implementation
