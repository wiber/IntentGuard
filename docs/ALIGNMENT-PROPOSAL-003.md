# Alignment Proposal 003: FIM Sovereignty Feedback Loop

**Date:** 2026-02-15
**Author:** Recursive Documentation Mode (Opus 4.6)
**Priority:** CRITICAL
**Drift area:** D7 — FIM Plugin Sovereignty Staleness
**Patent reference:** 63/XXX,XXX — Real-Time AI Behavior Drift Detection System
**Cross-reference:** ALIGNMENT-PROPOSAL-2026-02-15.md (prior analysis, ~29% drift)

---

## New Findings (Incremental to Prior Analysis)

This proposal identifies one **new critical drift** and updates three items from the prior analysis.

### Updated Drift Metrics (Combined)

| Metric | Prior Analysis | This Analysis | Delta |
|--------|---------------|---------------|-------|
| Total claims verified | 31 | 130+ | +99 |
| Discrepancies found | 9 | 11 | +2 |
| Overall drift % | 29% | 8.5% | -20.5% |
| Critical items | 1 | 2 | +1 |

Note: The drop in drift percentage is due to verifying many more spec items that are correctly aligned, particularly in Phases 0-4 where implementation is mature.

---

## CRITICAL: FIM Plugin Sovereignty is Static (NEW)

### What the spec says

The Steering Loop section (Steps 5-7) describes a **live feedback loop**:

> Step 5: "If denied, record to trust-debt pipeline as drift event"
> Step 6: "Drift events reduce sovereignty score for future operations"
> Step 7: "Bot auto-throttles: fewer permissions until trust rebuilds"

The IAMFIM equation requires a dynamic Sovereignty_Threshold:
> Permission(user, action) = Identity_Fractal(user) ∩ Coordinate_Required(action) >= **Sovereignty_Threshold**

### What the code does

Two parallel FIM implementations exist that **never communicate**:

**1. `src/wrapper.ts` (lines 106-180)** — Generates a static JS plugin:
```typescript
// Sovereignty loaded ONCE at install time
let sovereignty = 0.7;
try {
  const identity = loadIdentityFromPipeline(...);
  sovereignty = identity.sovereigntyScore;
} catch {}

// Baked into plugin as literal
const pluginCode = `let currentSovereignty = ${sovereignty};`;
```

The plugin exports `onConfigUpdate()` but **wrapper.ts never calls it**.

**2. `src/auth/fim-interceptor.ts` (lines 58-281)** — Proper OOP with:
- Live identity reloading (`reloadIdentity()`)
- Consecutive denial counting (threshold: 3)
- `onDriftThreshold` callback for pipeline re-runs
- Heat map updates
- Fail-open logging

But `FimInterceptor` is **not instantiated in wrapper.ts** and is not wired to the WebSocket gateway message handler.

### The architectural gap

```
SPEC DESIGN:
  tool_call → FIM check → deny → pipeline recalc → sovereignty drops → FIM tighter

ACTUAL BEHAVIOR:
  tool_call → FIM check (static) → deny logged → nothing happens → same sovereignty forever
```

### Why this is critical

The spec's Drift vs Self-Driving section claims:
> "Drift detected at 0.003 divergence. Auto-throttle. Self-correct."

Without the feedback loop, the system cannot self-correct. The k_E = 0.003 drift detection is **inert** — denials are logged but never fed back into the sovereignty calculation. This means:

1. A compromised bot with high initial sovereignty stays high forever
2. The "361x ShortRank multiplier" claim has no mechanism to degrade
3. The patent's core claim (real-time behavior drift detection) has no runtime implementation

### Concrete patch

In `src/wrapper.ts`, after the gateway connection (line 431), add:

```typescript
import { FimInterceptor } from './auth/fim-interceptor.js';

// After gateway is connected:
const interceptor = new FimInterceptor(
  { info: console.log, warn: console.warn, error: console.error, debug: console.log },
  join(ROOT, 'data'),
);

// Wire denial events to sovereignty updates
interceptor.onDenial = async (event) => {
  // Post denial to transparency engine
  if (gateway.ws) {
    gateway.ws.send(JSON.stringify({
      type: 'broadcast',
      channel: 'trust-debt-public',
      content: `FIM DENIED: ${event.skillName} (overlap: ${event.overlap.toFixed(2)}, sovereignty: ${event.sovereignty.toFixed(2)})`,
    }));
  }
};

interceptor.onDriftThreshold = async () => {
  // 3 consecutive denials → re-run pipeline step 4
  interceptor.reloadIdentity();
  const stats = interceptor.getStats();

  // Push updated sovereignty to plugin
  if (gateway.ws) {
    gateway.ws.send(JSON.stringify({
      type: 'plugin_config_update',
      plugin: 'intentguard-fim-auth',
      data: {
        sovereignty: stats.sovereignty,
      },
    }));
  }

  console.log(`[IntentGuard] Sovereignty updated to ${stats.sovereignty.toFixed(3)} after drift threshold`);
};

// In handleGatewayMessage, replace the tool_call case:
case 'tool_call': {
  const { tool, params } = msg.data ?? {};
  const denied = await interceptor.intercept(String(tool), params);
  if (denied) {
    ws.send(JSON.stringify({
      type: 'tool_call_response',
      id: msg.id,
      result: { allowed: false, reason: denied.message },
    }));
  }
  break;
}
```

**Effort estimate:** ~30 lines of wiring code. No new modules needed — all components exist, they just need to be connected.

---

## UPDATED: Revenue Intake Stub (Positive Drift)

The prior analysis didn't check this. The spec marks "Build revenue intake stub" as TODO, but `src/skills/revenue-intake.ts` exists with a comprehensive implementation including `RevenueSource` enum, wallet-ledger integration, and test coverage. **Spec should be updated to check-done.**

---

## UPDATED: Agent Pool 50-Concurrent (Stale Checklist)

The repo-split checklist marks "Claude Flow agent pool (50 concurrent)" as TODO, but `src/swarm/agent-pool.ts` exists with full implementation: 50 agent slots, file-claim coordination, pool status tracking, test suite, and README documentation. **Checklist item should be marked done.**

---

## CONFIRMED ALIGNED (Zero Drift)

These spec claims were verified as correctly implemented:

- Steering loop 5s/30s/60s sovereignty-based countdown (`steering-loop.ts:90-92`)
- Night Shift 7 safe + 3 dangerous task classification (`scheduler.ts:10-23`)
- Federation tensor overlap with 20-dim cosine similarity (`tensor-overlap.ts`)
- FIM geometric auth with 20-dim vector space (`auth/geometric.ts`)
- Cross-channel message router with bidirectional support (`channels/router.ts`)
- WebSocket parasite hook connecting to gateway (`wrapper.ts:454-489`)
- 3-tier LLM grounding: Ollama + Sonnet + Human (`wrapper.ts:530-553`)
- CEO loop infinite operation with circuit breaker at 3 failures (`ceo-loop.ts:687-695`)
- Auto-commit without push policy (`ceo-loop.ts:596-612`)
- Grid event bridge wired to task completions (`ceo-loop.ts:773-780`)

---

## Action Items

1. **Wire FimInterceptor into wrapper.ts** — closes the sovereignty feedback loop (CRITICAL)
2. **Update spec Phase 6 checklist** — mark revenue-intake as done
3. **Update repo-split checklist** — mark agent pool as done
4. **Update spec agent filenames** — reference `src/pipeline/step-N.ts` not legacy `.js`
5. **Update spec skill count** — "8 Custom Skills" not "6"

---

*Generated by Recursive Documentation Mode | IntentGuard Cortex*
*Overall drift: 8.5% | Priority fix: D7 FIM sovereignty feedback loop*
*Patent: 63/XXX,XXX — Real-Time AI Behavior Drift Detection System*
