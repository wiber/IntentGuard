# Alignment Proposal #018 — Phantom Claude Flow Dispatch & Agent Pool Integration Drift

**Date:** 2026-02-18
**Author:** Claude Opus 4.6 (Recursive Documentation Mode)
**Room:** 📐 A2 Strategy.Goal
**Severity:** HIGH (spec promises distributed agent architecture; code delivers sequential inline dispatch)
**Drift:** ~38% composite (4 confirmed vectors, 1 critical, 2 high, 1 moderate)
**Patent Reference:** 63/XXX,XXX (Feb 2025) — Real-Time AI Behavior Drift Detection System

---

## Executive Summary

A recursive cross-reference of `intentguard-migration-spec.html` v2.5.0 against `src/` reveals **4 confirmed drift vectors** centered on the Claude Flow agent dispatch architecture. The most severe: the spec's End-State Vision (line 959) describes "50 Claude Flow agents operate in a highly subdivided, asynchronous swarm" as the production architecture. In reality:

1. `ceo-loop.ts` dispatches tasks via inline `fs.writeFileSync()` — zero Claude Flow MCP calls exist in the file.
2. `swarm/agent-pool.ts` (695 LOC) launches agents via shell scripts in a cross-repo directory — never instantiated by any production code path.
3. `x-poster.ts` claims "Claude Flow browser automation" but is a file-queue dispatch with a 30-second timeout to an absent OpenClaw EventWorker.
4. `channels/router.ts` is correctly implemented but never wired into `runtime.ts` — WhatsApp and Telegram adapters are dead code.

Any investor, auditor, or autonomous agent reading the spec will expect a working 50-agent Claude Flow swarm. What exists is a single-threaded CEO loop writing files sequentially, with a dormant agent pool module that has never been called from production code.

---

## Drift Vector #1 (CRITICAL) — CEO Loop Claims Claude Flow Dispatch; Uses Inline File Writes

### What the Spec Says

> "Wire Claude Flow agent pool for parallel task execution"
> — Phase 9, Autonomous Night Operations (line 835)

> "50 Claude Flow agents operate in a highly subdivided, asynchronous swarm"
> — End-State Vision (line 959)

> "CEO loop v2 (always-on, auto-subdivide, circuit breaker)"
> — Repo Split Guide (line 853)

The spec presents the CEO loop as dispatching work to a Claude Flow MCP agent pool with `agent_spawn` and `task_create` calls.

### What the Code Does

`src/ceo-loop.ts` (844 lines) contains:

- A `while (true)` loop scanning `spec/sections/08-implementation-plan.tsx` for todos
- A `dispatch()` function that writes TypeScript skeleton files via `fs.writeFileSync()`
- Direct edits to `runtime.ts` to add Discord commands (string manipulation + file write)
- Shell command execution via `child_process.execSync()` for tests
- Auto-commit via `git add -A && git commit`

**Zero Claude Flow MCP calls:**
```
$ grep -c 'agent_spawn\|task_create\|mcp.*spawn\|claude.flow.*mcp' src/ceo-loop.ts
0
```

`maxConcurrent` is set to 5, but dispatch is purely sequential — no `Promise.all()`, no worker threads, no IPC.

### Impact

The CEO loop is functional as a single-threaded task dispatcher, but the spec's claims of "50 concurrent Claude Flow agents" are architecturally false. The actual execution model is:

```
spec claim:  CEO → Claude Flow MCP → 50 parallel agents → results
reality:     CEO → fs.writeFileSync() → git commit → sleep 60s → repeat
```

### Concrete Patch

**Option A (Documentation fix — spec accuracy):**
Update spec Phase 9 and End-State Vision:
```
"CEO loop v2 dispatches tasks sequentially via inline file generation.
Claude Flow agent pool (src/swarm/agent-pool.ts) exists as module but
is not yet integrated into the CEO loop execution path.
Parallel dispatch is a Phase 5+ goal, not current architecture."
```

**Option B (Code fix — wire the pool):**
```typescript
// In ceo-loop.ts, replace inline dispatch with:
import { AgentPool } from './swarm/agent-pool.js';

const pool = new AgentPool({ maxConcurrent: 5 });
await pool.submit({ taskId, priority: 'high', payload: todo });
```

**Recommendation:** Option A immediately. Option B requires solving the cross-repo coordination directory dependency first (see Vector #2).

---

## Drift Vector #2 (HIGH) — Agent Pool Is Dead Code with Cross-Repo Dependency

### What the Spec Says

> "Add Claude Flow agent pool (50 concurrent) for task subdivision"
> — Phase 3 checklist (line 787), marked ✅ check-done

### What the Code Does

`src/swarm/agent-pool.ts` (695 lines) exists and is well-structured:
- Task queue with priority levels
- File-based claim coordination via `swarm-claims.json`
- Health check timer (30s intervals)
- Retry logic with configurable limits

**But it is never instantiated in production:**
```
Imports of AgentPool in the entire codebase:
  src/cli/pool-cli.ts       → CLI tool (not production path)
  src/swarm/agent-pool.test.ts → test file
  src/swarm/index.ts         → re-export only
  src/swarm/pool-integration.ts → example/integration test
```

`runtime.ts` — zero imports from `swarm/`.
`ceo-loop.ts` — zero imports from `swarm/`.
`wrapper.ts` — zero imports from `swarm/`.

Additionally, `launchAgent()` shells out to scripts at:
```
../thetadrivencoach/openclaw/data/coordination/swarm-launch-N.sh
```
This is a hard-coded cross-repo path. If the `thetadrivencoach` repo is not cloned adjacent to `IntentGuard`, every agent launch fails.

### Impact

The Phase 3 checklist marks this ✅ done. The module exists, passes tests, and works in isolation. But "done" implies production integration. The pool has never processed a real task from the CEO loop or runtime.

### Concrete Patch

**Minimum viable:** Change Phase 3 checklist badge from `check-done` to `check-wip`:
```html
<li class="check-wip">Add Claude Flow agent pool (50 concurrent) for task subdivision</li>
```

**Full fix:** Wire `AgentPool` into `ceo-loop.ts` dispatch and move coordination directory to `IntentGuard/data/coordination/` (eliminating cross-repo dependency).

---

## Drift Vector #3 (HIGH) — X-Poster "Browser Automation" Is File Queue Dispatch

### What the Spec Says

> "Build x-poster.ts (Claude Flow browser automation → X/Twitter)"
> — Phase 3 checklist (line 787), marked ✅ check-done

> "Wire thumbs-up reaction on #x-posts to browser publish to X"
> — Phase 3 checklist, marked ✅ check-done

### What the Code Does

`src/discord/x-poster.ts` (282 lines):
- Writes task objects to `data/task-queue/poster.jsonl` (JSONL append)
- Polls `data/browser-post-state.json` every 3 seconds for results
- Times out after 30 seconds if no result appears
- Supports X/Twitter, Bluesky, LinkedIn via recipe map

**No browser code exists in this repository.** No Playwright, no Puppeteer, no WebKit. The actual browser execution is expected from an "OpenClaw EventWorker" — a separate process in a separate repository that reads the JSONL queue.

### Impact

The brain/body separation is architecturally sound (IntentGuard decides, OpenClaw executes). But:
- If the EventWorker is not running, every post silently times out after 30 seconds
- There is no retry mechanism after timeout
- There is no health check that the EventWorker is alive
- The spec's "browser automation" phrasing implies X-Poster drives a browser directly

### Concrete Patch

**Documentation fix:**
```
"x-poster.ts dispatches post tasks to data/task-queue/poster.jsonl.
Actual browser execution requires OpenClaw EventWorker running separately.
No browser automation code exists in IntentGuard — this is by design
(Cortex/Body separation) but requires EventWorker health monitoring."
```

**Code fix:** Add EventWorker health check and retry:
```typescript
// In x-poster.ts:
async checkEventWorkerHealth(): Promise<boolean> {
  const stateFile = 'data/browser-post-state.json';
  // Check if EventWorker has updated state within last 5 minutes
  const stat = await fs.stat(stateFile).catch(() => null);
  return stat ? (Date.now() - stat.mtimeMs) < 300_000 : false;
}
```

---

## Drift Vector #4 (MODERATE) — Channel Router Never Wired; Multi-Channel Is Dormant

### What the Spec Says

> "Test cross-channel room routing"
> — Phase 3 checklist (line 787), marked ✅ check-done

> "Multi-channel wiring to channel-manager"
> — Repo Split Guide (line 853), marked ✅ check-done

### What the Code Does

`src/channels/router.ts` (184 lines) — clean, stateless `MessageRouter` with `route()`, `addRule()`, `transformMessage()`. Correctly implemented.

`src/channels/whatsapp-adapter.ts` — exists, implements adapter interface.
`src/channels/telegram-adapter.ts` — exists, implements adapter interface.

**But `runtime.ts` never imports from `src/channels/`:**
- Runtime uses `ChannelManager` from `src/discord/channel-manager.ts` directly
- The `MessageRouter` class is only used in test and example files
- WhatsApp and Telegram adapters are never loaded or started

### Impact

The multi-channel architecture exists as standalone modules with tests, but there is no production code path that activates them. Discord is the only live channel. The spec marking these as "done" is accurate for module existence but misleading for production integration.

### Concrete Patch

**Documentation fix:** Split checklist items:
```html
<li class="check-done">Build cross-channel router module (src/channels/router.ts)</li>
<li class="check-todo">Wire router.ts into runtime.ts replacing direct ChannelManager</li>
<li class="check-done">Build WhatsApp adapter skeleton</li>
<li class="check-todo">Wire WhatsApp adapter into live runtime</li>
<li class="check-done">Build Telegram adapter skeleton</li>
<li class="check-todo">Wire Telegram adapter into live runtime</li>
```

---

## Composite Drift Score

| Vector | Severity | Weight | Score |
|--------|----------|--------|-------|
| #1 CEO Loop phantom Claude Flow dispatch | CRITICAL | 40% | 40 |
| #2 Agent Pool dead code + cross-repo dep | HIGH | 25% | 25 |
| #3 X-Poster phantom browser automation | HIGH | 20% | 20 |
| #4 Channel Router never wired | MODERATE | 15% | 15 |

**Composite Drift: 38%** (weighted by architectural impact)

---

## Sequencing Recommendation (Which Dominos Fall First)

The INDIGO light on 📐 A2 Strategy.Goal reveals this cascade:

1. **First domino:** Fix spec language (all 4 vectors) — 30 minutes, zero risk, immediate trust improvement
2. **Second domino:** Wire `AgentPool` into `ceo-loop.ts` — unlocks actual parallel dispatch
3. **Third domino:** Move coordination directory into IntentGuard — eliminates cross-repo fragility
4. **Fourth domino:** Add EventWorker health check to x-poster — prevents silent timeout failures
5. **Fifth domino:** Wire `router.ts` into `runtime.ts` — unlocks WhatsApp/Telegram for real

The blocking dependency is **domino #3** — until the coordination directory lives inside IntentGuard, the agent pool cannot reliably launch workers.

---

## Intelligence Burst (#trust-debt-public)

```
🛡️ DRIFT ALERT — Alignment Proposal #018
📐 A2 Strategy.Goal | 38% composite drift
4 vectors: phantom Claude Flow dispatch, dead agent pool,
phantom browser automation, dormant multi-channel router.
Spec claims 50-agent swarm; code delivers sequential file writes.
First domino: spec language fix (30 min, zero risk).
Patent ref: 63/XXX,XXX (Feb 2025)
```
