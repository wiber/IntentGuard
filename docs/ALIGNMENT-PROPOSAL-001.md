# Alignment Proposal #001: CEO Loop Agent Pool Integration

**Date:** 2026-02-15
**Priority:** CRITICAL
**Drift Percentage:** ~18% (CEO Loop dispatch path diverges from spec-mandated architecture)
**Patent Reference:** IAMFIM Geometric Permission System — Tensor Overlap Model

---

## Summary

The migration spec mandates a "Claude Flow agent pool (50 concurrent) for task subdivision" wired into the CEO Loop. The agent pool module exists (`src/swarm/agent-pool.ts`, 50-slot architecture) but the CEO Loop (`src/ceo-loop.ts`) dispatches tasks via inline handlers (skeleton creators, shell runners) — never routing through the pool. This creates a fundamental architectural gap where the spec's parallelism vision is implemented as infrastructure but not connected.

---

## What the Spec Says

### Phase 3 — Multi-Channel + X Publishing (checked "done"):
> "Add Claude Flow agent pool (50 concurrent) for task subdivision"

### Phase 9 — Autonomous Night Operations (checked "done"):
> "Wire Claude Flow agent pool for parallel task execution"

### End-State Vision:
> "While you sleep, 50 Claude Flow agents operate in a highly subdivided, asynchronous swarm."

### Repo Split Guide (check-todo, NOT done):
> "Claude Flow agent pool (50 concurrent)" — listed as the ONLY unchecked item in the IntentGuard column

---

## What the Code Does

### `src/ceo-loop.ts` (lines 94-98):
```typescript
const DEFAULT_CONFIG: CeoConfig = {
  maxConcurrent: 5,  // <-- NOT 50
  // ...
};
```

### `src/ceo-loop.ts` dispatch() (lines 225-261):
Tasks are dispatched via pattern-matched inline handlers:
- `createSkeleton()` — direct file writes
- `addDiscordCommand()` — regex-based runtime.ts edits
- `runShellTask()` — child_process spawn
- `createBuildTask()` — file creation
- `addChannel()` — regex-based channel-manager edits

**No call to `AgentPool.submitTask()` exists anywhere in ceo-loop.ts.**

### `src/swarm/agent-pool.ts` (exists, 50-slot):
```typescript
// Pool of 50 agent slots (1-50)
// Task queue with priority levels
// File claim coordination
```
This module is fully built with queue, priority, file claims, retry logic — but orphaned. Only referenced from `src/swarm/pool-integration.ts` (also not wired to CEO loop).

---

## Drift Impact

| Area | Spec | Code | Severity |
|------|------|------|----------|
| Max concurrency | 50 agents | 5 inline | CRITICAL |
| Dispatch mechanism | Agent pool queue | Pattern-matched inline | HIGH |
| Task subdivision | Pool decomposes large tasks | CEO loop subdivides, executes serially | MEDIUM |
| File claim coordination | Agent pool prevents conflicts | No coordination | MEDIUM |
| Phase 3 checkbox | "done" | Not wired | INTEGRITY |

---

## Additional Drift Findings

### 2. FIM Plugin Divergence (MEDIUM, ~8% drift)
**Spec:** "20-dimensional tensor overlap (0.0004ms)"
**wrapper.ts plugin (line 135-143):** Simplified category-counting overlap:
```javascript
function computeOverlap(identityScores, requirement) {
  let met = 0;
  for (const [cat, min] of entries) {
    if ((identityScores[cat] ?? 0) >= min) met++;
  }
  return met / entries.length;  // <-- counting, not geometric
}
```
**geometric.ts:** Proper 20-dim vector math with dot product and cosine similarity.

The wrapper's runtime plugin uses a simplified approximation while the standalone module has the full implementation. The plugin should delegate to the compiled geometric module.

### 3. Skill Count Mismatch (LOW, ~3% drift)
**Spec:** "6 Custom Skills"
**wrapper.ts:** Registers 8 skills (added system-control + tesseract-trainer beyond original 6).
**Verdict:** Code exceeds spec — acceptable improvement, but spec should be updated.

### 4. Agent 7 Output Format (LOW, ~2% drift)
**Spec (line 604):** "7-audit-log.json"
**Pipeline CLAUDE.md:** "trust-debt-report.html" (Agent 7 is Report Generator)
**Verdict:** Spec section uses legacy naming. Pipeline COMS defines the canonical format.

---

## Concrete Patch (Highest Priority)

### Step 1: Wire AgentPool into CEO Loop dispatch

```typescript
// In ceo-loop.ts, add import:
import { AgentPool } from './swarm/agent-pool.js';

// In ceoLoop(), after Discord connect:
const pool = new AgentPool(logger);
await pool.initialize();

// Replace dispatch() with pool-aware routing:
async function dispatch(todo: SpecTodo): Promise<TaskResult> {
  // Simple inline tasks stay inline (skeleton, command stubs)
  if (isInlineTask(todo)) return dispatchInline(todo);

  // Complex tasks go through the agent pool
  const taskId = await pool.submitTask({
    description: todo.text,
    priority: scoreTodo(todo) > 90 ? 'high' : 'normal',
    files: extractAffectedFiles(todo),
    phase: todo.phaseName,
  });

  return pool.waitForTask(taskId);
}
```

### Step 2: Update maxConcurrent default

```typescript
const DEFAULT_CONFIG: CeoConfig = {
  maxConcurrent: 50,  // Align with spec
  // ...
};
```

### Step 3: Wire pool-integration.ts to ceo-loop

The `src/swarm/pool-integration.ts` already provides `CEOLoopPoolBridge` — connect it.

---

## Drift Summary

| # | Area | Drift % | Priority |
|---|------|---------|----------|
| 1 | CEO Loop → Agent Pool integration | 18% | CRITICAL |
| 2 | FIM plugin simplified vs geometric.ts | 8% | MEDIUM |
| 3 | Skill count spec says 6, code has 8 | 3% | LOW |
| 4 | Agent 7 output naming | 2% | LOW |
| **Total weighted drift** | | **~12%** | |

---

## Recommendation

Fix #1 first. The agent pool is built and tested. The CEO loop dispatch is the bottleneck. Wiring them connects the spec's "50 concurrent agents" vision to reality. Estimated effort: 2-3 hours of integration work, primarily in `ceo-loop.ts` dispatch routing.

---

*Generated by Recursive Documentation Mode — IntentGuard Cortex*
*Cross-referenced: intentguard-migration-spec.html (27 sections) × src/ (90+ TypeScript modules)*
