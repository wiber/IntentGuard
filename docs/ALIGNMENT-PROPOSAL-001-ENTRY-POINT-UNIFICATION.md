# Alignment Proposal #001: Entry Point Unification & Agent Pool Gap

**Date:** 2026-02-17
**Drift Score:** 34% (3 CRITICAL, 2 HIGH across 8 audited areas)
**Patent Reference:** IAMFIM Geometric Auth — 20-dim tensor overlap model
**Status:** PROPOSED

---

## Executive Summary

Recursive documentation analysis of `intentguard-migration-spec.html` against `src/` reveals
a 34% spec-code drift concentrated in two areas:

1. **Split Brain (CRITICAL):** `wrapper.ts` and `runtime.ts` are two independent entry points
   that never import or coordinate with each other, contradicting the spec's "unified Cortex" architecture.
2. **Phantom Agent Pool (HIGH):** `ceo-loop.ts` claims "Claude Flow agent pool (up to 5 concurrent)"
   in comments but dispatches all tasks inline/shell. Zero calls to `claude-flow` MCP exist.

---

## Area-by-Area Drift Analysis

| Area | Spec Says | Code Does | Severity |
|---|---|---|---|
| Entry Points | Single unified Cortex (wrapper.ts) orchestrates everything | wrapper.ts (OpenClaw gateway) and runtime.ts (Discord bot) are independent processes; neither starts the other | CRITICAL |
| CEO Loop Agent Pool | "Claude Flow agent pool (up to 5 concurrent)" | `dispatch()` at line 225 uses string matching to route tasks to inline file writes or `execSync` shell calls. No `claude-flow` invocations exist | HIGH |
| Channel Adapters | WhatsApp + Telegram adapters "building" | Both are real code (161/159 LOC) but npm deps not installed, not wired into runtime.ts, never activate | HIGH |
| FIM Plugin Link | Plugin calls `computeOverlap()` from geometric.ts | wrapper.ts generates inline JS plugin (lines 118-176) with `require('./auth/geometric.ts')` inside try/catch — silently falls back to hardcoded 0.7 in CommonJS plugin context | CRITICAL |
| Pipeline Naming | Agents 0-7: "Outcome Requirements Parser", "Database Indexer", etc. | runner.ts step names: "raw-materials", "document-processing", "organic-extraction", etc. — naming mismatch | MEDIUM |
| Night Shift | Integrated into unified Cortex | Properly wired in runtime.ts only; absent from wrapper.ts | CRITICAL |
| Skills | claude-flow-bridge 732 LOC (real) | Confirmed 732 LOC, real implementation with Claude Flow fallback to `claude -p` | OK |
| Scheduler | Real proactive scheduler | Real, correctly wired in runtime.ts; cross-repo room context path is soft dependency | OK |

---

## Highest-Priority Drift: Split Brain Architecture

### What the Spec Says

> IntentGuard (Cortex) -> Claude Flow v3 (Orchestrator) -> OpenClaw (Body)

The spec describes ONE parent process (`wrapper.ts`) that:
1. Spawns OpenClaw as child process
2. Connects WebSocket parasite hook
3. Installs FIM plugin
4. Runs Night Shift scheduler
5. Runs CEO Loop v2
6. Serves as the Discord bot

### What the Code Does

**`wrapper.ts`** (631 LOC) — Does items 1-3 only:
- Spawns OpenClaw gateway
- Connects WebSocket
- Installs FIM plugin (with broken TS import path)
- Does NOT start Discord bot, scheduler, or CEO loop

**`runtime.ts`** (1,664 LOC) — Does items 4-6 only:
- Runs Discord bot with 9 cognitive rooms
- Wires FIM interceptor at skill level
- Starts Night Shift scheduler
- Does NOT spawn OpenClaw or connect WebSocket

**`ceo-loop.ts`** (845 LOC) — Standalone third process:
- Infinite autonomous loop
- Dispatches inline/shell (no Claude Flow MCP)
- Independent Discord connection (separate bot instance)

Running the system requires launching 2-3 independent processes with no shared state.

### Concrete Patch

Unify by making `runtime.ts` the single entry point that optionally starts the wrapper's gateway logic:

```typescript
// In src/runtime.ts, add to start():
async start() {
  // Phase A: Gateway (what wrapper.ts does)
  if (this.config.spawnGateway !== false) {
    await this.spawnOpenClawGateway();   // Extract from wrapper.ts
    await this.connectWebSocket();        // Extract from wrapper.ts
    await this.installFimPlugin();        // Fix: use plugin.ts, not inline JS
  }

  // Phase B: Discord + Skills (existing runtime.ts logic)
  await this.client.login(this.config.token);
  await this.initializeSkills();
  this.fim = new FimInterceptor(/* ... */);

  // Phase C: Autonomous Loop (what ceo-loop.ts does)
  if (this.config.ceoLoop !== false) {
    this.ceoLoop = new CeoLoop(this.discordClient, this.agentPool);
    this.ceoLoop.start();
  }

  // Phase D: Scheduler (already wired)
  this.scheduler.start();
}
```

The FIM plugin fix replaces the inline JS generation with:
```typescript
// Fix: Use compiled geometric.ts output, not raw TS import
import { generatePluginCode } from './auth/plugin.js';
const pluginJs = generatePluginCode({
  geometricModulePath: join(ROOT, 'dist/auth/geometric.js'), // compiled
  defaultThreshold: 0.8
});
writeFileSync(pluginPath, pluginJs);
```

---

## Second Priority: CEO Loop Agent Pool

### What the Spec Says (ceo-loop.ts header, line 14)

> 4. Dispatch via Claude Flow agent pool (up to 5 concurrent)

### What the Code Does (line 225-261)

```typescript
async function dispatch(todo: SpecTodo): Promise<TaskResult> {
  const t = todo.text.toLowerCase();
  if (t.includes('skeleton') || t.includes('create src/'))
    return createSkeleton(todo, start);     // writeFileSync
  if (t.includes('test'))
    return runShellTask(todo, start);        // execSync
  if (t.includes('build '))
    return createBuildTask(todo, start);     // writeFileSync
  // ...
  return { success: false, output: `No handler for: ${todo.text}` };
}
```

Zero calls to `claude-flow task create`, `claude-flow agent spawn`, or any MCP tool.
The `src/swarm/agent-pool.ts` module exists but is never imported by `ceo-loop.ts`.

### Concrete Patch

Wire the existing `AgentPool` from `src/swarm/agent-pool.ts`:

```typescript
import { AgentPool } from './swarm/agent-pool.js';

const pool = new AgentPool({ maxConcurrent: 5 });

async function dispatch(todo: SpecTodo): Promise<TaskResult> {
  // Try Claude Flow first (as spec promises)
  if (pool.isAvailable()) {
    return pool.dispatch(todo.text, {
      room: todo.phaseName,
      timeout: 300_000,
    });
  }
  // Fallback to inline/shell (existing logic)
  // ...
}
```

---

## Drift Metrics

- **Files audited:** 12 core modules
- **Total spec claims:** 47 features across 10 phases
- **Implemented correctly:** 31 (66%)
- **Implemented but disconnected:** 6 (13%) — channels, agent pool, plugin.ts
- **Missing entirely:** 4 (8%) — unified entry, agent pool dispatch, cross-process coordination
- **Naming/path mismatches:** 6 (13%) — pipeline step names, import paths

**Overall Drift: 34%**

---

## Recommended Execution Order

1. **Unify entry points** — Merge wrapper.ts gateway logic into runtime.ts (eliminates split brain)
2. **Fix FIM plugin path** — Use `plugin.ts`'s `generatePluginCode()` with compiled JS path
3. **Wire agent pool** — Import `src/swarm/agent-pool.ts` into ceo-loop.ts dispatcher
4. **Install channel deps** — Add `whatsapp-web.js` and `node-telegram-bot-api` to package.json
5. **Align pipeline naming** — Match runner.ts step names to spec agent names
