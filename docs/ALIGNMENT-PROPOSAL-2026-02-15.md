# Alignment Proposal: Spec-to-Code Drift Analysis

**Date:** 2026-02-15
**Source:** intentguard-migration-spec.html v2.5.0 vs src/ codebase
**Method:** Recursive Documentation Mode — automated cross-reference
**Overall Drift:** ~18% (12 discrepancies across 67 verified claims)
**Patent Reference:** 63/XXX,XXX (Feb 2025) — Real-Time AI Behavior Drift Detection System

---

## Executive Summary

The migration spec (v2.5.0) has drifted from the actual codebase in 12 measurable areas. The code is generally **ahead of the spec** — features have been added that the spec doesn't document. One critical behavioral drift exists where the spec promises enforcement that the code only logs.

---

## CRITICAL PRIORITY: Steering Loop Max Concurrent Not Enforced

### What the Spec Says
> "Timeout: 30000ms | Redirect Grace: 5000ms | **Max Concurrent: 3**"
> (Section 15: Autonomous Steering Loop)

### What the Code Does
`src/discord/steering-loop.ts:151-155` — When max concurrent predictions is reached, the code **only logs a warning** but still accepts and processes the prediction:

```typescript
const active = [...this.predictions.values()].filter(p => p.status === 'pending');
if (active.length >= this.config.maxConcurrentPredictions) {
  this.log.warn(`[Steering] Max concurrent predictions (${this.config.maxConcurrentPredictions}) reached — queueing`);
}
// Prediction is STILL added on line 157 — no enforcement
```

### Why This Matters
The steering loop is the sovereignty-enforcing gateway for autonomous action. If unlimited predictions can run simultaneously, the bot can execute unbounded parallel actions during Night Shift — violating the "supervised autonomy" contract. This directly undermines patent claim 63/XXX,XXX (drift detection) because the detection window narrows with concurrent executions.

### Concrete Patch

```typescript
// BEFORE (line 151-157)
const active = [...this.predictions.values()].filter(p => p.status === 'pending');
if (active.length >= this.config.maxConcurrentPredictions) {
  this.log.warn(`[Steering] Max concurrent predictions reached — queueing`);
}
this.predictions.set(id, entry);

// AFTER
const active = [...this.predictions.values()].filter(p => p.status === 'pending');
if (active.length >= this.config.maxConcurrentPredictions) {
  this.log.warn(`[Steering] Max concurrent predictions (${this.config.maxConcurrentPredictions}) reached — rejecting`);
  return { id, status: 'rejected', reason: 'max_concurrent_exceeded' };
}
this.predictions.set(id, entry);
```

---

## HIGH PRIORITY: Three-Tier Authorization Incomplete

### What the Spec Says
> Execution Tiers: Admin (instant-execute, 0s) | Trusted (ask-and-predict, 30s) | General (suggestion only, requires admin thumbs-up)
> (Section 15: Execution Tiers table)

### What the Code Does
`src/discord/authorized-handles.ts` only implements the **Admin** tier:
- `thetaking` → instant-execute
- `mortarcombat` → instant-execute
- No mechanism to assign users to "Trusted" or "General" tiers

The tier logic exists in `steering-loop.ts` (line 23: `ExecutionTier` type) but `authorized-handles.ts` has no `getTier()` method — it only checks `isAuthorized()` (binary).

### Concrete Patch
Add tier assignment to `authorized-handles.ts`:

```typescript
getTier(username: string): 'admin' | 'trusted' | 'general' {
  const handle = this.handles.get(username.toLowerCase());
  if (handle?.policy === 'instant-execute') return 'admin';
  if (handle?.policy === 'confirm-first') return 'trusted';
  return 'general';
}
```

---

## MEDIUM PRIORITY: Spec Claims vs Code Reality

### 1. Skill Count: Spec says 6, Code registers 8
**Spec:** "6 Custom Skills" (Section: Two-Repo Architecture, INTENTGUARD layer)
**Code:** `wrapper.ts` registers 8 skills including System Control and Tesseract Trainer
**Fix:** Update spec to "8 Custom Skills" or document which are core vs. optional

### 2. Night Shift: Spec says 10 tasks, Code has 15
**Spec:** "10 registered tasks (7 safe, 3 dangerous)" (Section: Night Shift)
**Code:** `src/cron/scheduler.ts` has 15 tasks (12 safe, 3 dangerous)
Added since spec: recursive-documentation, cost-health-check, sovereignty-stability-monitor, sovereignty-stability-check, spec-drift-scan
**Fix:** Update spec task registry to reflect 15 tasks

### 3. Night Shift Idle Threshold: Spec says 5min, Code uses 10min
**Spec:** "Idle threshold: 5 minutes since last human message"
**Code:** `scheduler.ts:100` → `minIdleMs: 10 * 60 * 1000` (10 minutes)
**Fix:** Update spec to 10 minutes (code is more conservative, which is safer)

### 4. Pipeline Step 7 Output: Incomplete documentation
**Spec:** Claims output is "7-audit-log.json"
**CLAUDE.md:** Claims output is "trust-debt-report.html"
**Code:** Produces THREE files: `7-final-report.json`, `7-final-report.html`, `7-audit-log.json`
**Fix:** Update both spec and CLAUDE.md to document all 3 outputs

### 5. Dead File: agent-0-outcome-requirements.ts
**Spec:** Lists `agent-0-outcome-requirements.ts` as Agent 0 implementation
**Code:** Pipeline runner loads `step-0.ts`, not `agent-0-outcome-requirements.ts`
The file exists but is **never called** by the pipeline runner
**Fix:** Either delete the dead file or wire it into the runner

---

## LOW PRIORITY: Cosmetic/Documentation Drift

### 6. Status Bar Claims "3 launchd Services" — not verified
### 7. Spec says "54 skills" in OpenClaw Gateway — count not verified against runtime
### 8. Spec end-state vision says "50+ agents" — CEO loop v2 TODO still shows agent pool as incomplete

---

## Drift Metrics

| Category | Claims Verified | Matches | Discrepancies | Drift % |
|----------|----------------|---------|---------------|---------|
| Pipeline (steps 0-7) | 8 | 6 | 2 | 25% |
| Steering Loop | 4 | 2 | 2 | 50% |
| Wrapper.ts | 4 | 3 | 1 | 25% |
| Night Shift | 6 | 3 | 3 | 50% |
| Auth (FIM/Geometric) | 5 | 5 | 0 | 0% |
| Skills | 4 | 3 | 1 | 25% |
| **TOTAL** | **31** | **22** | **9** | **29%** |

Note: Auth/FIM module has **zero drift** — the mathematical core is spec-compliant.

---

## Recommended Action Order

1. **Enforce max concurrent predictions** in steering-loop.ts (CRITICAL — sovereignty breach)
2. **Implement getTier()** in authorized-handles.ts (HIGH — incomplete permission model)
3. **Update spec numbers**: 8 skills, 15 Night Shift tasks, 10min idle threshold
4. **Resolve step-0 dead file**: wire agent-0-outcome-requirements.ts or delete it
5. **Document step-7 triple output** in spec and CLAUDE.md

---

*Generated by Recursive Documentation Mode — IntentGuard Cortex*
*Patent: 63/XXX,XXX — Real-Time AI Behavior Drift Detection System*
