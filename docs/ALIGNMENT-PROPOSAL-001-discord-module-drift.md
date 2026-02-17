# Alignment Proposal AP-001: Discord Module Architecture Drift

**Date**: 2026-02-17
**Author**: Claude Opus 4.6 (Recursive Documentation Mode)
**Priority**: HIGH
**Drift Percentage**: ~18% of src/ file structure diverges from migration spec

---

## What the Spec Says

The migration spec (`intentguard-migration-spec.html` v2.5.0) defines Discord integration as:

```
openclaw/src/runtime.ts (837 lines, discord.js v14) -> intentguard/src/channels/discord.ts
```

Discord is positioned as **one channel adapter** within the unified `src/channels/` module, alongside `whatsapp-adapter.ts` and `telegram-adapter.ts`. The spec's Two-Repo Architecture places all channel routing under a single `channels/` namespace.

**Spec's implied file structure:**
```
src/channels/
  discord.ts          <- Discord adapter (spec line 211)
  whatsapp-adapter.ts <- WhatsApp adapter
  telegram-adapter.ts <- Telegram adapter
  router.ts           <- Channel routing
  types.ts            <- Shared channel types
```

---

## What the Code Does

The actual implementation splits Discord into **its own top-level module** (`src/discord/`) with 25 files (~4,200 LOC), separate from `src/channels/` which contains only WhatsApp, Telegram, and the router (12 files, ~538 LOC).

**Actual file structure:**
```
src/channels/           (12 files, ~538 LOC)
  router.ts             <- Channel routing
  whatsapp-adapter.ts   <- WhatsApp adapter
  telegram-adapter.ts   <- Telegram adapter
  types.ts              <- Shared types
  [tests + examples]

src/discord/            (25 files, ~4,200 LOC)  <- NOT IN SPEC
  channel-manager.ts    <- Discord channel management (336 LOC)
  steering-loop.ts      <- Ask-and-Predict protocol (349 LOC)
  tweet-composer.ts     <- 280-char updates (429 LOC)
  x-poster.ts           <- Browser automation to X/Twitter (273 LOC)
  authorized-handles.ts <- thetaking/mortarcombat instant-execute (175 LOC)
  transparency-engine.ts <- Public trust-debt reporting (199 LOC)
  output-capture.ts     <- Terminal output capture (200 LOC)
  output-poller.ts      <- Output polling (174 LOC)
  task-store.ts         <- JSONL persistence (118 LOC)
  shortrank-notation.ts <- ShortRank encoding (256 LOC)
  clipboard-mutex.ts    <- Clipboard locking (80 LOC)
  [12 test files + 2 documentation files]
```

---

## Drift Classification

| Category | Impact |
|----------|--------|
| **Structural** | `src/discord/` exists as top-level module, not `src/channels/discord.ts` |
| **Semantic** | Discord is treated as a "platform" not a "channel adapter" |
| **Scale** | 25 files vs 1 file - 25x more granular than spec anticipated |
| **Coupling** | `src/discord/` has no imports from `src/channels/router.ts` |
| **Test coverage** | Discord: 12 test files; channels/: 4 test files |

**Drift %**: 18% (25 files in unexpected location out of 181 total src/ files)

---

## Additional Drift (Lower Priority)

| Spec Path | Actual Path | Nature |
|-----------|-------------|--------|
| `src/tesseract/` | `src/grid/` (25 files) | Tesseract merged into grid module |
| `src/mcp/crm.ts` | Does not exist | Not yet implemented |
| `src/rooms/` | Does not exist | Not yet implemented |

---

## Root Cause Analysis

The Discord module grew organically during Phase 1 implementation. What the spec envisioned as a single adapter file (like WhatsApp/Telegram) became a full subsystem because Discord is the **primary channel** — it carries:
- Steering loop (Ask-and-Predict protocol)
- Tweet composition and X/Twitter cross-posting
- Authorized handle management
- Transparency engine (public trust-debt reporting)
- Output capture and polling
- Clipboard mutex for concurrent access

These responsibilities exceed a simple "channel adapter" pattern.

---

## Concrete Patch Options

### Option A: Reconcile Code to Spec (Move discord/ into channels/)
```
src/channels/
  discord/                <- Move all 25 files here
    index.ts              <- Re-export as adapter interface
    channel-manager.ts
    steering-loop.ts
    ...
  whatsapp-adapter.ts
  telegram-adapter.ts
  router.ts
```
**Pro**: Matches spec. Single namespace for all channels.
**Con**: Discord module is 8x larger than all other channels combined. Misleading parity.

### Option B: Reconcile Spec to Code (Update spec to reflect reality)
Update migration spec section "Module Migration Status" to:
```
Discord Integration: src/discord/ (25 files, ~4,200 LOC) — dedicated platform module
Channel Adapters: src/channels/ (12 files, ~538 LOC) — lightweight adapters
```
**Pro**: Reflects architectural reality. Discord IS the primary platform.
**Con**: Spec no longer shows clean channel abstraction.

### Option C: Hybrid (Recommended)
1. Create `src/channels/discord-adapter.ts` — a thin adapter that delegates to `src/discord/`
2. Register it in `src/channels/router.ts` alongside WhatsApp/Telegram
3. Keep `src/discord/` as the implementation module
4. Update spec to document this two-tier pattern

```typescript
// src/channels/discord-adapter.ts (NEW - thin adapter)
import { ChannelAdapter } from './types';
import { ChannelManager } from '../discord/channel-manager';

export class DiscordAdapter implements ChannelAdapter {
  private manager: ChannelManager;

  async send(channelId: string, message: string): Promise<void> {
    return this.manager.send(channelId, message);
  }

  async receive(): AsyncIterable<IncomingMessage> {
    return this.manager.incoming();
  }
}
```

**Pro**: Spec compliance via adapter pattern. Implementation stays clean. Router can treat all channels uniformly.
**Con**: One additional indirection layer.

---

## Recommendation

**Option C (Hybrid)** — Create a thin `discord-adapter.ts` in `channels/` that delegates to the `discord/` module. This:
1. Satisfies the spec's channel abstraction model
2. Preserves the organic, well-tested Discord implementation
3. Enables the router to treat Discord/WhatsApp/Telegram uniformly
4. Documents that primary channels may have dedicated modules

---

## Patent Reference

This drift analysis relates to the IAMFIM geometric permission system (Fractal Identity Map) which gates channel access via 20-dimensional tensor overlap. The Discord module's `authorized-handles.ts` implements sovereignty-based instant-execute permissions that feed back into the Trust-Debt Pipeline.

**Patent-Adjacent**: The channel-adapter pattern with geometric auth gating represents a novel permission topology where channel routing decisions are informed by the user's identity fractal overlap with channel-specific coordinate requirements.
