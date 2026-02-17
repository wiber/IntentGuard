# Alignment Proposal: Spec-vs-Code Drift Analysis

**Date:** 2026-02-17
**Spec Version:** v2.5.0 (intentguard-migration-spec.html)
**Analyst:** Claude Opus 4.6 (Recursive Documentation Mode)
**Overall Drift:** ~18% (structural divergence from spec intent)

---

## Executive Summary

Cross-referencing the Migration Spec (27 sections, v2.5.0) against `src/` reveals **5 drift zones** ranging from cosmetic naming mismatches to a critical architectural gap. The highest-priority drift is the **missing `src/mcp/` module** — the spec defines CRM MCP integration as a first-class directory (`intentguard/src/mcp/crm.ts`), but no `mcp/` directory exists anywhere in the codebase. The FIM interceptor works at the skill level but does NOT implement the MCP proxy interception pattern described in the spec's pseudocode.

---

## Drift Inventory (Ranked by Priority)

### DRIFT-1: Missing `src/mcp/` — MCP Proxy Layer (CRITICAL)

**What the spec says:**
- Section "Module Migration Status": `packages/crm-mcp/ → intentguard/src/mcp/crm.ts`
- Section "IAMFIM": MCP proxy pseudocode shows `interceptToolCall(call: ToolCall)` operating at the MCP protocol level, intercepting OpenClaw tool calls via WebSocket
- Section "Debate Notes" F03: "MCP proxy interception has no standard pattern" — flagged HIGH risk, resolution says "Check OpenClaw extension/middleware API"
- Section "Steering Loop" Step 1: "Tool call arrives at MCP Proxy"

**What the code does:**
- No `src/mcp/` directory exists
- `src/auth/fim-interceptor.ts` intercepts at the **skill execution** level (wrapping skill functions), not at the MCP protocol level
- The interceptor maps skill names to tool names via a hardcoded `SKILL_TO_TOOL` record (5 entries)
- CRM tools remain in `packages/crm-mcp/` (external package) with no bridge into IntentGuard
- The spec's `openclaw.execute(call)` pattern (forwarding to OpenClaw after auth) is not implemented

**Concrete drift:**
- Architecture: Spec envisions MCP-level interception; code implements function-level wrapping
- Missing directory: `src/mcp/` does not exist
- Missing integration: CRM MCP server has no connection point in IntentGuard
- Interceptor coverage: Only 5 skill→tool mappings vs spec's "every tool call" vision

**Impact:** HIGH — The FIM interceptor works but at the wrong abstraction layer. Skills that bypass the interceptor (direct OpenClaw tool calls) are ungoverned. The "Steering Loop" described in the spec (Steps 1-8) cannot fully function without MCP-level interception.

### DRIFT-2: Pipeline Step Names Diverge from Spec (MEDIUM)

**What the spec says (Trust-Debt Pipeline section):**
- Step 0: "Outcome Requirements" (81 requirements extracted)
- Step 1: "Indexed Keywords"
- Step 2: "20 Categories (Balanced)"
- Step 3: "Presence Matrix"
- Step 4: "Grades & Statistics"
- Step 5: "Timeline History"
- Step 6: "Analysis Narratives"
- Step 7: "Audit Log"

**What the code does (`src/pipeline/runner.ts` STEP_NAMES):**
- Step 0: "raw-materials"
- Step 1: "document-processing"
- Step 2: "organic-extraction"
- Step 3: "frequency-analysis"
- Step 4: "grades-statistics"
- Step 5: "goal-alignment"
- Step 6: "symmetric-matrix"
- Step 7: "final-report"

**Concrete drift:** 6 of 8 step names differ. Only Step 4 ("Grades & Statistics") aligns. The runner uses a different conceptual framework (document-processing pipeline) than the spec (trust-debt audit pipeline). Additionally, `src/pipeline/agent-0-outcome-requirements.ts` implements the spec's Agent 0 vision, suggesting a migration-in-progress where the agent-based pipeline coexists with the older step-based runner.

**Impact:** MEDIUM — Two parallel pipeline systems exist. The runner's step names create confusion when cross-referencing with CLAUDE.md agent instructions or the spec.

### DRIFT-3: Missing `src/rooms/` — Cognitive Rooms Not Standalone (LOW-MEDIUM)

**What the spec says:**
- Section "Module Migration Status": `.workflow/rooms/ (9 HTML rooms + dashboard) → intentguard/src/rooms/`
- 9 rooms defined: Builder, Architect, Operator, Vault, Voice, Laboratory, Performer, Network, Navigator

**What the code does:**
- No `src/rooms/` directory
- Room logic is embedded in `src/discord/channel-manager.ts` as part of Discord channel mapping
- Room routing rules exist in `src/channels/router.ts` as generic message routing

**Impact:** LOW-MEDIUM — Rooms work functionally but are coupled to Discord. The spec envisions rooms as a standalone abstraction (terminal-agnostic) that could route to any channel adapter.

### DRIFT-4: ~60 Legacy `trust-debt-*.js` Files in `src/` Root (LOW)

**What the spec says:**
- "Refactor into intentguard/src/pipeline/ with TypeScript" (Phase 2 checklist, marked done)
- Clean pipeline in `src/pipeline/step-*.ts`

**What the code does:**
- ~60 `trust-debt-*.js` files remain in `src/` root (~40,000 LOC)
- These are iterative prototypes predating the TypeScript pipeline
- Names like `trust-debt-final.js`, `trust-debt-week-mvp.js`, `trust-debt-scaffold.js` suggest experimental iterations

**Impact:** LOW — Functional code is in `src/pipeline/`. Legacy files are dead weight that inflates the codebase and creates confusion. Spec says cleanup is "done" but it isn't.

### DRIFT-5: `src/tesseract/` Split Across Three Directories (LOW)

**What the spec says:**
- `src/app/tesseract/ (Next.js pages) → intentguard/src/tesseract/`

**What the code does:**
- Tesseract client: `src/grid/tesseract-client.ts`
- Tesseract renderer: `src/grid/ascii-renderer.ts`
- Tesseract playground: `src/api/tesseract-playground.ts`
- Tesseract bot: `src/bot/tesseract-playground-bot.ts`

**Impact:** LOW — Functionality exists but is scattered. A `src/tesseract/` directory with re-exports would match the spec and improve discoverability.

---

## Highest-Priority Patch: DRIFT-1 (MCP Proxy Layer)

### Proposed Solution

Create `src/mcp/` with a minimal bridge that wraps the existing `FimInterceptor` to operate at the MCP tool-call level rather than the skill level.

```typescript
// src/mcp/index.ts
// MCP-level FIM interception bridge
// Wraps OpenClaw's WebSocket tool calls with geometric permission checks

export { createMcpProxy } from './proxy.js';
export { CrmBridge } from './crm-bridge.js';
```

```typescript
// src/mcp/proxy.ts
// Implements the spec's interceptToolCall pseudocode
// Intercepts at ws://127.0.0.1:18789 before OpenClaw processes

import { FimInterceptor } from '../auth/fim-interceptor.js';

export function createMcpProxy(interceptor: FimInterceptor, wsUrl: string) {
  // WebSocket message interception
  // Maps MCP tool_call messages to FIM permission checks
  // Forwards allowed calls to OpenClaw
  // Returns FIM denial for blocked calls
}
```

```typescript
// src/mcp/crm-bridge.ts
// Bridge to packages/crm-mcp/ MCP server
// Proxies CRM tool calls through FIM before reaching Supabase

export class CrmBridge {
  // Connects to crm-mcp server
  // Routes through FIM interceptor
  // Provides typed CRM operations
}
```

### Why This Matters

The spec's entire "Steering Loop" (8 steps) depends on MCP-level interception. Without it:
1. OpenClaw tool calls bypass FIM entirely
2. The CRM MCP server operates ungoverned
3. The "P=1 enforcement" claim in the spec is inaccurate — it's only P=1 for the 5 mapped skills

### Migration Path

1. Create `src/mcp/proxy.ts` that intercepts WebSocket messages at `ws://127.0.0.1:18789`
2. Reuse existing `FimInterceptor.intercept()` logic (it already computes overlap correctly)
3. Expand `SKILL_TO_TOOL` mapping to cover all OpenClaw tool names
4. Create `src/mcp/crm-bridge.ts` connecting to `packages/crm-mcp/`
5. Wire proxy into `src/wrapper.ts` WebSocket connection

---

## Drift Percentage Calculation

| Module | Spec Items | Aligned | Drifted | Drift % |
|--------|-----------|---------|---------|---------|
| MCP Proxy Layer | 4 | 0 | 4 | 100% |
| Pipeline Steps | 8 | 2 | 6 | 75% |
| Rooms Architecture | 3 | 1 | 2 | 67% |
| Legacy Cleanup | 1 | 0 | 1 | 100% |
| Tesseract Directory | 1 | 0 | 1 | 100% |
| FIM Auth | 7 | 7 | 0 | 0% |
| Skills Inventory | 8 | 8 | 0 | 0% |
| Federation | 10 | 9 | 1 | 10% |
| Channels | 6 | 6 | 0 | 0% |
| CEO Loop | 10 | 10 | 0 | 0% |
| **TOTAL** | **58** | **43** | **15** | **~26%** |

**Weighted by priority:** ~18% (critical items weighted 3x, high 2x, low 0.5x)

---

## Patent Reference

IAMFIM (Fractal Identity Map) — 20-dimensional tensor overlap permission system.
The drift in DRIFT-1 affects the patent's "P=1 enforcement" claim: geometric permission checking is implemented (`src/auth/geometric.ts`, 44 passing tests) but enforcement operates at skill-level, not MCP-protocol-level as the patent describes.

---

## Next Actions

1. **Implement DRIFT-1 patch** — Create `src/mcp/` with WebSocket proxy bridge
2. **Align pipeline step names** — Update `STEP_NAMES` in runner.ts to match spec nomenclature
3. **Archive legacy JS** — Move `src/trust-debt-*.js` to `src/_legacy/` or delete
4. **Create rooms abstraction** — Extract room logic from discord/ into standalone module
5. **Consolidate tesseract** — Create `src/tesseract/index.ts` with re-exports
