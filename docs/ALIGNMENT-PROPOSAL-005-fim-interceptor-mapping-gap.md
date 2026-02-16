# Alignment Proposal 005: FIM Interceptor Skill-to-Tool Mapping Gap

**Date:** 2026-02-16
**Priority:** MEDIUM (security-adjacent)
**Analyst:** Recursive Documentation Mode (Opus 4.6)
**Patent Reference:** IAMFIM 20-dim geometric permission enforcement

---

## What the Spec Says

The FIM auth MCP proxy pseudocode (Section: Fractal Identity Map) describes a system where **every tool call** is intercepted and checked against the identity vector:

```
async function interceptToolCall(call: ToolCall): Promise<ToolResult> {
  const identity = await getIdentityVector(call.session.userId);
  const requirement = getActionRequirement(call.toolName);
  if (!requirement) {
    return await openclaw.execute(call);  // fail-open for undefined tools
  }
  const overlap = computeOverlap(identity, requirement);
  if (overlap >= 0.8 && identity.sovereigntyScore >= requirement.minSovereignty) {
    return await openclaw.execute(call);
  } else {
    return { error: 'FIM: Insufficient overlap' };
  }
}
```

The `src/auth/action-map.ts` defines **30+ action requirements** across 8 categories (shell, git, CRM, communication, deployment, financial, database, system). The spec's End-State Vision says "Before OpenClaw executes git_push or file_delete, the plugin computes 20-dimensional tensor overlap."

## What the Code Does

`src/auth/fim-interceptor.ts` routes skills to FIM tool names via a **hardcoded mapping** (lines 29-35):

```typescript
const SKILL_TO_TOOL: Record<string, string> = {
  'claude-flow-bridge': 'shell_execute',
  'system-control': 'shell_execute',
  'email-outbound': 'send_email',
  'artifact-generator': 'file_write',
};
```

This maps only **4 skills** to **3 unique tool names**. The action map defines 30+ tools but only 3 are reachable through the interceptor.

Additionally, 5 skills are completely exempt from FIM checks (lines 38-44):

```typescript
const FIM_EXEMPT = new Set([
  'thetasteer-categorize',
  'tesseract-trainer',
  'llm-controller',
  'cost-reporter',
  'voice-memo-reactor',
]);
```

## The Gap

Skills that exist in the codebase but **bypass geometric permission checks entirely**:

| Skill | Expected Tool | Current Status | Risk |
|-------|--------------|----------------|------|
| `wallet-ledger` | `file_write` / `payment_initiate` | Falls through to fail-open | Financial operations unguarded |
| `x-poster` | `post_tweet` | Falls through to fail-open | Public communication unguarded |
| `tesseract-trainer` | `file_write` | FIM_EXEMPT | Writes to training corpus without check |
| CRM skills (via MCP) | `crm_update_lead` etc. | Not intercepted | Data operations unguarded |
| `cost-reporter-scheduler` | `file_write` | Not mapped | Writes budget data without check |

The fail-open behavior is **by design** (line 128: "FAIL-OPEN: Unknown skill — allowed by default") and is **logged** to `fim-fail-open.jsonl`. However, this means:

1. The `wallet-ledger` skill can execute without sovereignty gating
2. The `x-poster` skill can publish to X/Twitter without communication trust checks
3. The audit trail shows these as "fail-open" but doesn't prevent them

## Impact Assessment

The spec's drift-detection model relies on the equation:
```
Permission(u,a) = Identity_Fractal(u) ∩ Coordinate_Required(a) >= Sovereignty_Threshold
```

With only 3/30+ tools mapped, the geometric permission gate is applied to ~10% of the action space. The remaining 90% passes through unchecked. This doesn't violate the spec (fail-open is documented), but it **substantially weakens** the IAMFIM guarantee of "P=1 enforcement" described in the End-State Vision.

## Concrete Patch

### 1. Expand SKILL_TO_TOOL mapping

```diff
--- a/src/auth/fim-interceptor.ts
+++ b/src/auth/fim-interceptor.ts
@@ -29,6 +29,8 @@ const SKILL_TO_TOOL: Record<string, string> = {
   'system-control': 'shell_execute',
   'email-outbound': 'send_email',
   'artifact-generator': 'file_write',
+  'wallet-ledger': 'file_write',
+  'x-poster': 'post_tweet',
 };
```

### 2. Re-evaluate tesseract-trainer exemption

```diff
@@ -38,7 +40,6 @@ const FIM_EXEMPT = new Set([
   'thetasteer-categorize',
-  'tesseract-trainer',
   'llm-controller',
   'cost-reporter',
   'voice-memo-reactor',
 ]);
```

And add to SKILL_TO_TOOL:
```diff
+  'tesseract-trainer': 'file_write',
```

### 3. Add `post_tweet` to action-map.ts (if not already present)

Verify `post_tweet` exists in the action map. If missing, add:
```typescript
post_tweet: {
  toolName: 'post_tweet',
  requiredScores: {
    communication: 0.6,
    accountability: 0.5,
    transparency: 0.5,
  },
  minSovereignty: 0.5,
  description: 'Publish to X/Twitter (public communication)',
},
```

## Files Affected

- `src/auth/fim-interceptor.ts` — Expand SKILL_TO_TOOL, shrink FIM_EXEMPT
- `src/auth/action-map.ts` — Verify `post_tweet` requirement exists
- No test changes required (existing tests cover the interceptor logic)

## Risk

LOW for the patch itself (additive mapping, no behavioral change for already-mapped skills). The change tightens security by bringing 3 more skills under geometric permission enforcement.

---

## Intelligence Burst

```
A1∩C1 → Vault∩Builder
🔐 DRIFT-005: FIM interceptor maps 4/30+ skills → 90% action space ungated
💰 wallet-ledger bypasses sovereignty check (fail-open)
🐦 x-poster publishes to X without communication trust check
🧊 tesseract-trainer writes corpus files while FIM-exempt
PATCH: +3 skill mappings, -1 exemption → covers financial + public comms
🛡️ IAMFIM patent: P=1 enforcement requires full mapping coverage
🟡 S:72% | #fim-gap #security | #IntentGuard
```
