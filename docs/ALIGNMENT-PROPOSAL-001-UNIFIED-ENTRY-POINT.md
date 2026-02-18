# Alignment Proposal 001: Unified Entry Point Drift

**Date:** 2026-02-17
**Severity:** CRITICAL
**Drift Category:** A.1 Security & Trust Governance — Architectural Spine
**Patent Reference:** IAMFIM Geometric Permission System (Sovereign Engine Architecture)
**Drift Percentage:** ~38% (core orchestration layer disconnected from 4/6 subsystems)

---

## What the Spec Says

The Migration Spec v2.5.0 (Section: End-State Vision, line 970) declares:

> "NOW LIVE: wrapper.ts unified entry point with FIM plugin v2.0,
> Night Shift scheduler, CEO loop v2."

The spec mandates a single architectural spine:

```
wrapper.ts (Cortex / Parent Process)
  ├── spawns OpenClaw gateway (child process)
  ├── connects via WebSocket parasite hook
  ├── installs FIM auth plugin
  ├── wires Steering Loop (Ask-and-Predict protocol)
  ├── wires Night Shift scheduler (ProactiveScheduler)
  ├── wires CEO Loop v2 (autonomous operation)
  └── wires 3-tier LLM grounding
```

The Bootstrap Protocol (Section: Bootstrap Protocol, line 1186) confirms:
- Step 2: "Start IntentGuard wrapper (npx tsx src/wrapper.ts)"

This implies `wrapper.ts` is THE single entry point that boots the entire system.

## What the Code Does

In reality, there are **four disconnected entry points** with zero cross-imports:

### wrapper.ts (792 LOC)
```typescript
// ONLY imports node builtins + WebSocket
import { spawn, type ChildProcess } from 'child_process';
import WebSocket from 'ws';
// Does NOT import: runtime.ts, ceo-loop.ts, steering-loop.ts, scheduler.ts
```

**Actual scope:** Spawns OpenClaw gateway, connects WebSocket, installs FIM plugin,
registers skills as OpenClaw workspace entries. That's it.

### runtime.ts (1700+ LOC)
```typescript
// Imports everything wrapper.ts should orchestrate
import { SteeringLoop } from './discord/steering-loop.js';
import { ProactiveScheduler } from './cron/scheduler.js';
import { FimInterceptor } from './auth/fim-interceptor.js';
import { ChannelManager } from './discord/channel-manager.js';
// ... 10+ more subsystem imports
// Does NOT import wrapper.ts
```

**Actual scope:** The real orchestrator — Discord bot, steering loop, scheduler,
transparency engine, tweet composer, channel management.

### ceo-loop.ts (994 LOC)
```typescript
// Imports discord.js directly, duplicates Discord client setup
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
// Does NOT import runtime.ts or wrapper.ts
```

**Actual scope:** Standalone autonomous loop that creates its own Discord client,
reads spec, prioritizes tasks, subdivides, implements, commits.

### cron/scheduler.ts (400+ LOC)
```typescript
// Imported BY runtime.ts, but not by wrapper.ts
export class ProactiveScheduler { ... }
```

**Actual scope:** Ghost User task injection, sovereignty-gated. Works when
imported by runtime.ts but completely invisible to wrapper.ts.

## The Drift

| Spec Claim | Code Reality | Gap |
|------------|-------------|-----|
| wrapper.ts = unified entry point | wrapper.ts only handles OpenClaw gateway | Missing orchestration |
| wrapper.ts wires Night Shift | No import of scheduler.ts in wrapper.ts | Disconnected |
| wrapper.ts wires CEO Loop v2 | ceo-loop.ts is standalone, creates own Discord client | Duplicated state |
| wrapper.ts wires Steering Loop | No import of steering-loop.ts in wrapper.ts | Disconnected |
| wrapper.ts wires FIM plugin | FIM plugin installed, but runtime auth not wired | Partial |
| Single boot command | 3 separate `npx tsx` commands needed | Fragmented |

**Impact:** Running `npx tsx src/wrapper.ts` starts the OpenClaw gateway but
NOT the Discord bot, NOT the steering loop, NOT the CEO loop, NOT the night
shift scheduler. The system requires manually launching multiple processes,
which contradicts the "always-on daemon" spec.

## Concrete Patch

### Option A: wrapper.ts imports and boots runtime.ts (Recommended)

```typescript
// Add to wrapper.ts after gateway connection succeeds:
import { IntentGuardRuntime } from './runtime.js';

async function main() {
  const config = loadConfig();
  const gateway = await spawnGateway(config);    // existing
  await installFimPlugin(config);                 // existing
  await registerSkills(config);                   // existing

  // NEW: Boot the runtime orchestrator
  const runtime = new IntentGuardRuntime({
    gateway,
    discordToken: process.env.DISCORD_BOT_TOKEN,
    enableSteering: true,
    enableNightShift: true,
    enableCeoLoop: !process.argv.includes('--no-ceo'),
  });
  await runtime.start();
}
```

### Option B: runtime.ts absorbs wrapper.ts gateway logic

Move the OpenClaw spawning into runtime.ts so there's only one entry point.
Less modular but eliminates the split entirely.

### Required Follow-up for Either Option

1. **Deduplicate Discord client:** ceo-loop.ts creates its own `discord.js` Client.
   It should receive the client from runtime.ts instead.
2. **Wire scheduler to wrapper:** ProactiveScheduler must be reachable from the
   boot sequence, not just from runtime.ts internal wiring.
3. **Single launchd plist:** The daemon config should launch ONE process
   (`npx tsx src/wrapper.ts`) that boots everything.
4. **Update spec accuracy:** If Option B is chosen, update spec to say
   "runtime.ts unified entry point" instead of "wrapper.ts."

## Risk Assessment

- **Blast radius:** Medium — this is wiring, not logic. All subsystems work
  individually; they just aren't connected through the declared entry point.
- **Regression risk:** Low — adding imports and boot calls doesn't change
  subsystem internals.
- **Test impact:** Existing tests pass because they test subsystems in isolation.
  New integration test needed: "wrapper.ts boots all subsystems."

## Verification Criteria

After patching, running `npx tsx src/wrapper.ts` should:
1. Spawn OpenClaw gateway at ws://127.0.0.1:18789
2. Install FIM auth plugin
3. Start Discord bot with 9 cognitive room channels
4. Activate SteeringLoop (Ask-and-Predict)
5. Start ProactiveScheduler (Night Shift)
6. Enter CEO Loop idle mode (scan spec every 60s)
7. Report heartbeat to #trust-debt-public every 5 minutes

---

## Intelligence Burst — #trust-debt-public

```
DRIFT DETECTED | 38% | A.1 Security & Trust Governance

wrapper.ts claims "unified entry point" but imports 0/4 subsystems.
runtime.ts, ceo-loop.ts, scheduler.ts all operate as disconnected
processes. Spec says single boot → full system. Code requires 3
manual launches. CEO loop duplicates Discord client state.

Alignment Proposal: wrapper.ts imports runtime.ts, boots all
subsystems from single entry. Dedup Discord client in ceo-loop.ts.

Patent ref: IAMFIM Sovereign Engine Architecture — single Cortex
process holding sovereignty score must orchestrate all subsystems
through one process boundary.

Fix: ~50 LOC import wiring + 1 integration test.
Status: PROPOSAL FILED | docs/ALIGNMENT-PROPOSAL-001
```
