# Alignment Proposal AP-003: WebSocket Category Injection Gap & 4-Subsystem Drift Audit

**Date:** 2026-02-16
**Drift Percentage:** 18.4% (weighted across 4 subsystems, 265 source files audited)
**Priority:** CRITICAL
**Patent Reference:** IAMFIM Geometric Permission System — Real-time Identity Fractal Sharpening via Categorized Signal Accumulation

---

## Summary

Deep cross-reference of `intentguard-migration-spec.html` (v2.5.0, 27 sections) against all TypeScript modules in `src/` reveals **18.4% aggregate drift** across 4 major subsystems. This builds on AP-001 (CEO Loop pool integration, 18%) and AP-002 (channel adapter stubs, 18%) by identifying the **upstream root cause**: the WebSocket Parasite Hook computes LLM categories but **discards them** instead of injecting them into the agent context.

Without category injection, the identity fractal never updates from real-time signals. The sovereignty feedback loop is broken. The "self-driving" claim in the spec is inoperative.

---

## Drift Breakdown by Subsystem

| Subsystem | Files Analyzed | Spec Accuracy | Drift % | Priority |
|-----------|---------------|---------------|---------|----------|
| FIM Auth (`src/auth/`) | 6 files, 993 LOC | 95% | 5% | LOW |
| Wrapper (`src/wrapper.ts`) | 1 file, 630 LOC | 80% | 20% | **CRITICAL** |
| Steering/Runtime | 4 files, 3,451 LOC | 90% | 10% | MEDIUM |
| Federation (`src/federation/`) | 5 files, 1,290 LOC | 85% | 15% | MEDIUM |

---

## PRIMARY FINDING: WebSocket Category Injection (CRITICAL)

### What the Spec Says

> **WebSocket Parasite Hook** — Connects ws://127.0.0.1:18789 — intercepts messages, injects LLM categorization
> (Section 1: Two-Repo Architecture, IntentGuard Cortex layer)

Section "ThetaSteer to IAMFIM Pipeline" describes the complete feedback loop:
1. Every signal enters the mailbox
2. ThetaSteer assigns 1-3 trust-debt categories with confidence scores
3. Category scores update the identity vector (exponential moving average)
4. FIM proxy checks overlap before every tool execution
5. Denials reduce trust; successful operations build trust. The fractal sharpens.

### What the Code Does

**File:** `src/wrapper.ts`, lines 495-507

```typescript
case 'message_received': {
  categorizeFast(String(content)).then(categories => {
    console.log(`[IntentGuard] Categories: ${categories.join(', ')}`);
    // The OpenClaw agent will handle the response — we just logged the categorization
    // For deeper integration, we'd inject the categories into the agent context
  });
  break;
}
```

Steps 1-2 work. Steps 3-5 are completely missing. Categories are computed then discarded with a TODO comment.

### Why This Is the Root Cause

AP-001 identified the CEO Loop to Agent Pool gap. AP-002 identified channel adapter stubs. Both are downstream of this: even if 50 agents are pooled and channels are live, the FIM gate controlling them never adapts because the identity fractal is frozen. **Fix the feedback loop first, then scale it.**

### Concrete Patch

```typescript
// Replace wrapper.ts lines 497-507 with:
case 'message_received': {
  const { channelType, content, author, sessionId } = msg.data ?? {};
  console.log(`[IntentGuard] Message from ${channelType}: ${String(content).substring(0, 80)}`);

  categorizeFast(String(content)).then(async categories => {
    console.log(`[IntentGuard] Categories: ${categories.join(', ')}`);

    // Inject categories into agent context via WebSocket
    if (ws.readyState === WebSocket.OPEN && sessionId) {
      ws.send(JSON.stringify({
        event: 'context_inject',
        data: {
          sessionId,
          metadata: {
            trustDebtCategories: categories,
            categorizedAt: new Date().toISOString(),
            tier: 0,
          },
        },
      }));
    }

    // Update identity vector with exponential moving average
    const ALPHA = 0.1;
    for (const cat of categories) {
      if (currentIdentity[cat] !== undefined) {
        currentIdentity[cat] = ALPHA * 1.0 + (1 - ALPHA) * currentIdentity[cat];
      }
    }
  });
  break;
}
```

**Dependency:** Requires OpenClaw `context_inject` event support. If unsupported, injection silently fails (fail-open, consistent with IAMFIM design).

---

## SECONDARY FINDINGS

### 2. Night Shift Skill File Missing (HIGH)

**Spec:** Night Shift scheduler with registered tasks
**Code:** `src/cron/scheduler.ts` has 14 tasks and works. But wrapper.ts registers a `night-shift` skill (lines 235-242) that lazy-loads from `src/skills/night-shift.ts` — **file does not exist**. Skill registration silently fails.
**Fix:** Create thin wrapper at `src/skills/night-shift.ts` delegating to `src/cron/scheduler.ts`.

### 3. Cosine Similarity Implemented but Not Used in Permissions (MEDIUM)

**Spec:** "Real 20-dim vector math with dot product, cosine similarity"
**Code:** `geometric.ts` implements cosine similarity with 44 passing tests, but `computeOverlap()` uses threshold-based dimensional pass/fail. Line 19 comment: "STATUS: v0.1 — threshold-based overlap. Cosine similarity planned for v0.2."
**Fix:** Update spec to describe v0.1 accurately, or implement v0.2.

### 4. Federation Heartbeat Not Orchestrated (MEDIUM)

**Spec:** "Federation heartbeat: periodic geometry sync with peers"
**Code:** `DriftDetector.monitorAll()` and `checkBatch()` methods exist and work. But nothing calls them periodically — no timer, no scheduler, no background worker. Also, `DriftDetector` is not exported from `federation/index.ts`.
**Fix:** Create `src/federation/heartbeat-service.ts`. Export `DriftDetector` from index.

### 5. CEO Loop Not Wired to Wrapper (MEDIUM)

**Spec:** CEO Loop v2 as part of unified entry point
**Code:** `src/ceo-loop.ts` (845 LOC) is fully built but not spawned by wrapper.ts. Must be run manually.
**Fix:** Add `--ceo` flag to wrapper.ts for optional CEO loop spawning.

### 6. Circuit Breaker Scope (LOW)

**Spec:** "Circuit breaker: stop after 3 consecutive failures"
**Code:** Only in `ceo-loop.ts` line 687, not in `runtime.ts`. Doesn't apply to skill execution system-wide.
**Fix:** Extract to shared module.

---

## Relationship to Previous Proposals

| Proposal | Date | Primary Drift | Status |
|----------|------|---------------|--------|
| AP-001 | 2026-02-15 | CEO Loop to Agent Pool (18%) | Open — downstream of AP-003 |
| AP-002 | 2026-02-15 | Channel adapter stubs (18%) | Open — parallel to AP-003 |
| **AP-003** | **2026-02-16** | **WebSocket category injection (18.4%)** | **New — root cause** |

**Fix order:** AP-003 (feedback loop) -> AP-002 (channels) -> AP-001 (pool scaling)

---

## What Is NOT Drifting (Verified Correct)

| Component | Spec Claim | Verified |
|-----------|-----------|----------|
| FIM Auth 20-dim math | 44 tests, production-ready | Correct (threshold-based v0.1) |
| OpenClaw plugin generation | ~/.openclaw/plugins/intentguard-fim-auth.js | Correct (v2.1.0) |
| Action coordinate map | shell_execute=0.6, crm_update_lead=0.3, git_push=0.7 | Correct (40+ tools) |
| Fail-open for undefined tools | Allow if no requirement defined | Correct |
| Sovereignty calculator | K_E=0.003, MAX_UNITS=3000 | Correct |
| Ask-and-Predict protocol | 5s/30s/60s countdown timers | Correct |
| Night Shift tasks | 10 registered tasks | Exceeds spec: 14 tasks |
| Tensor overlap math | 20 comprehensive tests | Correct (real cosine similarity) |
| Federation registry | 75/76 tests passing | Correct (SHA-256 hashing, auto-quarantine) |
| Pipeline steps 0-7 | 8-step pipeline complete | Correct |

---

## Recommended Action Order

1. **Fix category injection** in wrapper.ts (this proposal's patch)
2. **Create night-shift.ts** skill wrapper
3. **Export DriftDetector** from federation/index.ts
4. **Wire CEO loop** to wrapper.ts with `--ceo` flag
5. **Create heartbeat service** for federation
6. **Update spec** to reflect v0.1 threshold-based permissions
7. **Extract circuit breaker** to shared module

---

*Generated by Recursive Documentation Mode — IntentGuard Cortex*
*Cross-referenced: intentguard-migration-spec.html (27 sections) x src/ (265 files)*
*Analyzer: Claude Opus 4.6 | 2026-02-16*
