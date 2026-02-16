# Alignment Proposal #001: Agent Pool Orphan (Critical Drift)

**Date:** 2026-02-16
**Drift Percentage:** ~38% (3 CRITICAL + 2 HIGH across 8 audited components)
**Priority:** P0 — Blocks autonomous CEO capability
**Patent Reference:** IAMFIM Geometric Auth (20-dim tensor overlap, 0.0004ms)

---

## Executive Summary

Recursive documentation analysis of `intentguard-migration-spec.html` vs `src/` reveals
**architecturally fragmented integration** — core modules are individually sound but
disconnected at the orchestration layer. The highest-priority drift is the **Agent Pool
Orphan**: `src/swarm/agent-pool.ts` (696 LOC, 50-slot pool) is fully implemented but
never instantiated by `src/runtime.ts` or `src/ceo-loop.ts`.

---

## Drift Report (8 Components Audited)

| Component | Spec Status | Code Reality | Severity |
|-----------|-------------|--------------|----------|
| `src/swarm/agent-pool.ts` | "50 concurrent for task subdivision" | Defined but **never called** | **CRITICAL** |
| `src/runtime.ts` | "Main orchestrator, spawn OpenClaw" | Discord OK; **no OpenClaw spawn; no pool** | **CRITICAL** |
| `src/ceo-loop.ts` | "Always-on with agent pool delegation" | Runs autonomously; **pool not wired** | **HIGH** |
| `src/pipeline/runner.ts` | "FIM identity update; steps 0-7" | FIM update works; **steps fallback to stubs** | **HIGH** |
| `src/wrapper.ts` | "Unified entry: FIM+CEO+NightShift" | FIM+OpenClaw OK; **CEO runs separately** | MEDIUM |
| `src/skills/llm-controller.ts` | "Confidence-based 3-tier routing" | All tiers work; confidence is regex heuristic | LOW |
| `src/discord/steering-loop.ts` | "Ask-Predict 5/30/60s countdown" | **Exact match** — fully compliant | NONE |
| `src/cron/scheduler.ts` | "10 sovereignty-gated tasks" | **16 tasks** — exceeds spec | NONE |

---

## Highest-Priority Drift: Agent Pool Orphan

### What the Spec Says

> "Claude Flow agent pool (50 concurrent) for task subdivision" — Phase 3, marked done
> "Wire Claude Flow agent pool for parallel task execution" — Phase 9, marked done
> "Task auto-subdivider: break vague todos into 3-5 concrete subtasks" — Phase 9, marked done

### What the Code Does

`src/swarm/agent-pool.ts` (696 LOC) implements:
- 50-slot agent pool with priority queue
- File claim coordination to prevent conflicts
- Swarm memory JSONL for cross-agent state
- Health checks on 30-second intervals
- Task subdivision via `subdivideTask()`

`src/swarm/pool-integration.ts` (bridge module) implements:
- `ParallelTaskRequest` interface for CEO/scheduler
- Sovereignty gating per operation type
- Connection points for ProactiveScheduler and CEO Loop

**However:**
- `AgentPool` is **never imported** by `src/runtime.ts` (0 references)
- `AgentPool` is **never imported** by `src/ceo-loop.ts` (0 references)
- `pool-integration.ts` is **never imported** by any orchestration module
- CEO loop task dispatcher (ceo-loop.ts:225-261) uses hardcoded handlers, not pool delegation

The pool infrastructure is complete but **electrically disconnected** from the execution path.

### Evidence

```
$ grep -r "AgentPool\|agent-pool\|agentPool" src/runtime.ts
(no results)

$ grep -r "AgentPool\|agent-pool\|agentPool" src/ceo-loop.ts
(no results)

$ grep -rl "AgentPool" src/
src/swarm/pool-integration.test.ts
src/cli/pool-cli.ts
src/index.ts               # re-export only
src/swarm/agent-pool.test.ts
src/swarm/index.ts          # re-export only
src/swarm/pool-integration.ts
src/swarm/agent-pool.ts
```

Zero references from runtime or CEO loop.

---

## Concrete Patch

### Phase A: Wire CEO Loop to Agent Pool (HIGH IMPACT)

In `src/ceo-loop.ts`, the task dispatcher at ~line 225 should delegate complex tasks:

```typescript
// BEFORE (current): hardcoded handlers that skip complex work
if (task.type === 'skeleton') { createSkeleton(task); }
else if (task.type === 'command') { addCommand(task); }
else { console.log(`No handler for ${task.type}`); } // <- falls through

// AFTER (proposed): delegate to agent pool for complex tasks
import { PoolIntegration } from '../swarm/pool-integration.js';

const pool = new PoolIntegration({ poolSize: 50, logger });

// In dispatch():
if (isSimpleTask(task)) {
  handleSimple(task);  // existing handlers
} else {
  const result = await pool.executeParallel({
    description: task.description,
    targetFiles: task.files,
    operation: classifyOperation(task),
    sovereigntyRequired: task.sovereignty || 0.6,
  });
  logger.info(`[CEO] Pool completed: ${result.completed}/${result.total}`);
}
```

### Phase B: Wire Runtime to Pool Status (MEDIUM IMPACT)

In `src/runtime.ts`, expose pool metrics via `!pool-status` Discord command:

```typescript
import { AgentPool } from '../swarm/agent-pool.js';

// In bot command handler:
case '!pool-status':
  const stats = pool.getStats();
  reply(`Agents: ${stats.active}/${stats.total} | Queue: ${stats.queued} | Completed: ${stats.completed}`);
  break;
```

### Phase C: Pipeline Step Completion (MEDIUM IMPACT)

Verify which `src/pipeline/step-N.ts` files have real `run()` exports vs. placeholder fallback:
- Steps with `run()`: Continue using
- Steps without: Pipeline runner falls back to placeholder JSON (runner.ts:170-181)
- Action: Prioritize porting steps 4 (grades) and 7 (report) — they feed FIM identity

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Pool spawns 50 Claude instances unexpectedly | Sovereignty gate: pool-integration.ts requires sov > 0.6 for safe ops |
| File conflicts from parallel agents | File claim system already built (agent-pool.ts:450-463) |
| Launch scripts missing | Create coordination directory scripts before first pool run |
| Cost explosion from parallel Sonnet calls | LLM controller cost governor caps daily spend (llm-controller.ts:88-98) |

---

## Compliant Components (No Action Needed)

- **Steering Loop** (`src/discord/steering-loop.ts`): 5/30/60s sovereignty countdown matches spec exactly
- **Night Shift Scheduler** (`src/cron/scheduler.ts`): 16 tasks (exceeds spec's 10), all sovereignty-gated
- **FIM Geometric Auth** (`src/auth/geometric.ts`): 20-dim vector math, 44 tests passing
- **LLM Controller** (`src/skills/llm-controller.ts`): 3-tier routing works; confidence heuristic is pragmatic

---

## Conclusion

The IntentGuard codebase has **sophisticated infrastructure** with a **wiring gap** at the
orchestration layer. The Agent Pool is the most valuable piece of dead code — connecting it
to the CEO loop transforms the system from "autonomous task monitor" to "autonomous task
executor" as the spec promises.

Estimated effort: ~200 LOC to wire Phase A (CEO pool integration).
