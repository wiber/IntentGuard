# Alignment Proposal 004: Steering Loop Adaptive Timeouts & Full Drift Audit

**Date:** 2026-02-16
**Author:** Recursive Documentation Mode (Opus 4.6)
**Priority:** CRITICAL
**Drift area:** Steering Loop timeout architecture + 5 additional drifts
**Patent reference:** IAMFIM Geometric Permission System (FIM Auth v2.0)
**Cross-reference:** AP-001 through AP-003 (prior analyses)

---

## Drift Summary

A full recursive audit of `intentguard-migration-spec.html` against `src/` reveals **75% drift** across 8 targeted specification claims. The codebase has evolved *beyond* the spec in several areas.

| Severity | Count | Items |
|----------|-------|-------|
| CRITICAL | 2 | Steering Loop Timeouts, Scheduler Task Count |
| MODERATE | 2 | Step-7 Outputs, Agent 7 Doc Conflict |
| MINOR | 1 | Wrapper Skill Count |
| ALIGNED | 3 | 20 Categories, ShortLex, ThetaSteer Tiers |

---

## Highest-Priority Drift: Steering Loop Adaptive Timeouts

### What The Spec Says

**Section 15 "Autonomous Steering Loop"** (spec HTML lines ~1420-1424):

```
Timeout: 30000ms | Redirect Grace: 5000ms | Max Concurrent: 3
```

A single fixed timeout of 30 seconds for all Ask-and-Predict cycles.

### What The Code Does

**`src/discord/steering-loop.ts:85-93`:**

```typescript
private getSovereigntyTimeout(): number {
  if (!this.config.useSovereigntyTimeouts) {
    return this.config.askPredictTimeoutMs;
  }
  const sovereignty = this.sovereigntyGetter();
  if (sovereignty >= 0.8) return 5000;   // High trust = 5s
  if (sovereignty >= 0.6) return 30000;  // Moderate = 30s
  return 60000;                           // Low = 60s
}
```

3-tier adaptive timeout gated by sovereignty score:

| Sovereignty Score | Timeout | Behavior |
|---|---|---|
| >= 0.8 (high trust) | 5s | Near-instant for proven alignment |
| >= 0.6 (moderate) | 30s | Standard Ask-and-Predict (matches spec) |
| < 0.6 (low trust) | 60s | Extended human intervention window |

Controlled by `useSovereigntyTimeouts` flag (default: off). Fixed 30s remains default.

### Why This Matters

The adaptive timeout is the **core IAMFIM feedback loop** in action: trust earned = faster execution, trust lost = slower execution with more human oversight. The spec presents a static system; the code implements the dynamic sovereignty-gated behavior that the patent describes. The spec should document this innovation, not hide it.

### Concrete Patch

**Update spec Section 15 config block:**

```html
<!-- BEFORE -->
<div class="config-block">
  <strong>Timeout:</strong> 30000ms |
  <strong>Redirect Grace:</strong> 5000ms |
  <strong>Max Concurrent:</strong> 3
</div>

<!-- AFTER -->
<div class="config-block">
  <strong>Base Timeout:</strong> 30000ms |
  <strong>Redirect Grace:</strong> 5000ms |
  <strong>Max Concurrent:</strong> 3 |
  <strong>Adaptive:</strong> sovereignty-based (5s/30s/60s)
</div>
```

**Add adaptive timeout table after Execution Tiers table:**

```html
<h3>Sovereignty-Adaptive Timeouts</h3>
<table>
  <thead>
    <tr><th>Sovereignty</th><th>Timeout</th><th>Rationale</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>>= 0.8</strong> (High Trust)</td>
      <td>5000ms</td>
      <td>Bot has proven alignment -- minimal oversight needed</td>
    </tr>
    <tr>
      <td><strong>>= 0.6</strong> (Moderate)</td>
      <td>30000ms</td>
      <td>Standard Ask-and-Predict cycle</td>
    </tr>
    <tr>
      <td><strong>< 0.6</strong> (Low Trust)</td>
      <td>60000ms</td>
      <td>Extended intervention window -- recent drift events</td>
    </tr>
  </tbody>
</table>
```

---

## Additional Drifts

### CRITICAL #2: Scheduler Task Count

**Spec says:** "10 registered tasks (7 safe, 3 dangerous)"
**Code says:** `src/cron/scheduler.ts` has **15 tasks (12 safe, 3 dangerous)**

5 undocumented safe tasks:
- `grid-heartbeat` (line ~276)
- `recursive-documentation` (line ~314)
- `cost-health-check` (line ~337)
- `sovereignty-stability-monitor` (line ~350)
- `spec-drift-scan` (line ~384)

**Patch:** Update spec's Night Shift section to reflect 15 tasks (12 safe + 3 dangerous).

### MODERATE #1: Step-7 Triple Output

**Spec says:** Agent 7 produces `7-audit-log.json`
**Code says:** `src/pipeline/step-7.ts` produces 3 files:
- `7-audit-log.json`
- `7-final-report.json`
- `7-final-report.html`

**Patch:** Update spec pipeline section to list all 3 outputs.

### MODERATE #2: Agent 7 Documentation Conflict

**Spec says:** Output is `7-audit-log.json`
**CLAUDE.md says:** Output is `trust-debt-report.html`
**Code says:** Both, plus `7-final-report.json`

**Patch:** Align both documents. CLAUDE.md pipeline data flow should list `7-audit-log.json` + `7-final-report.html`.

### MINOR: Wrapper Skill Count

**Spec says:** "6 Custom Skills"
**Code says:** 8 skills in `wrapper.ts:registerSkills()` (console acknowledges "6 ported + 2 new")

**Patch:** Update spec's INTENTGUARD layer description from "6 Custom Skills" to "8 Custom Skills".

---

## Methodology

1. Full read of `intentguard-migration-spec.html` (71K tokens, 27 sections)
2. Targeted cross-reference against `src/` TypeScript implementations
3. Verification against test files (`steering-loop.test.ts`, `step-7.test.ts`)
4. Priority ranking by architectural impact (behavioral > cosmetic)

---

## Aligned Claims (No Drift)

| Claim | Source | Verification |
|---|---|---|
| 20 orthogonal trust-debt categories | `src/auth/geometric.ts:25-31` | 20-element const array |
| Agent 3 ShortLex validation | `src/pipeline/step-3.ts:107-131` | Full implementation + tests |
| ThetaSteer 8-tier color mapping | `src/skills/thetasteer-categorize.ts:14-30` | All 8 tiers present |
