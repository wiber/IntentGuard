# Alignment Proposal #001: Discord Adapter Extraction

**Date:** 2026-02-15
**Drift Severity:** HIGH
**Drift Percentage:** 5% (1 of 18 verified modules missing at specified path)
**Patent Reference:** IAMFIM Geometric Auth — 20-dimensional tensor overlap model

---

## What the Spec Says

The migration spec (intentguard-migration-spec.html, Section "Module Migration Status") declares:

> **Discord Integration** — Status: `building`
> `openclaw/src/runtime.ts (837 lines, discord.js v14)` → `intentguard/src/channels/discord.ts`

The spec envisions Discord as a **channel adapter** conforming to the same `ChannelAdapter` interface
(defined in `src/channels/types.ts`) that WhatsApp and Telegram already implement. The architecture
diagram shows channel adapters as pluggable, swappable components beneath the `MessageRouter`
(`src/channels/router.ts`).

---

## What the Code Does

Discord logic was **never extracted** into `src/channels/discord.ts`. Instead, it lives monolithically
inside `src/runtime.ts` (1,664 lines), which directly imports `discord.js` and embeds:

- Discord.js `Client` instantiation and gateway intent configuration (line 23-26)
- 9 cognitive room channel lookups (via `ChannelManager`)
- 20+ `!commands` (lines 842-1,497): `!ping`, `!stop`, `!status`, `!tasks`, `!rooms`, `!handles`,
  `!trust`, `!predictions`, `!abort`, `!tweet`, `!sovereignty`, `!grid`, `!wallet`, `!artifact`,
  `!heartbeat`, `!budget`, `!ceo-status`, `!federation`, `!fim`, `!capabilities`, `!pipeline`
- Voice memo attachment detection and reaction handling (lines 1,500-1,605)
- Message routing with authorized handles (lines 714-840)

Meanwhile, `src/channels/` contains a well-defined adapter pattern:
- `types.ts` — `ChannelAdapter` interface with `initialize()`, `sendMessage()`, `onMessage()`, `disconnect()`
- `router.ts` — `MessageRouter` with room-based routing, bidirectional flow
- `whatsapp-adapter.ts` — Implements `ChannelAdapter`
- `telegram-adapter.ts` — Implements `ChannelAdapter`
- **No `discord.ts`** — Discord is the only channel that never conformed to its own adapter pattern

---

## Impact

1. **Architectural inconsistency**: Discord is a special case hardcoded into the orchestrator while
   WhatsApp/Telegram are clean adapters. Adding a new channel requires understanding two different patterns.

2. **runtime.ts bloat**: At 1,664 lines (2x what spec claims), the file mixes orchestration concerns
   with Discord-specific message handling, command parsing, and reaction logic.

3. **Testing friction**: Discord behavior can only be tested by mocking the entire runtime, whereas
   WhatsApp/Telegram adapters are independently testable.

4. **Cross-channel routing gap**: The `MessageRouter` can route WhatsApp/Telegram messages to rooms,
   but Discord messages bypass the router entirely (handled inline in `runtime.ts`).

---

## Concrete Patch

### Phase 1: Extract `src/channels/discord-adapter.ts`

Create a `DiscordAdapter` class implementing `ChannelAdapter` from `src/channels/types.ts`:

```typescript
// src/channels/discord-adapter.ts
import { Client, GatewayIntentBits, Partials, Events, type Message, TextChannel } from 'discord.js';
import type { ChannelAdapter, CrossChannelMessage, ChannelStatus } from './types.js';

export class DiscordAdapter implements ChannelAdapter {
  name = 'discord';
  status: ChannelStatus = 'disconnected';

  private client: Client;
  private messageCallbacks: Array<(msg: CrossChannelMessage) => void> = [];
  private roomChannelMap: Map<string, string>; // roomName → channelId

  constructor(private config: { token: string; guildId: string; roomChannelMap: Record<string, string> }) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [Partials.Message, Partials.Reaction],
    });
    this.roomChannelMap = new Map(Object.entries(config.roomChannelMap));
  }

  async initialize(): Promise<void> {
    await this.client.login(this.config.token);
    this.status = 'connected';

    this.client.on(Events.MessageCreate, (msg: Message) => {
      if (msg.author.bot) return;
      const room = this.resolveRoom(msg.channelId);
      const crossMsg: CrossChannelMessage = {
        source: 'discord',
        sourceId: msg.channelId,
        targetRoom: room || 'builder',
        content: msg.content,
        author: msg.author.username,
        timestamp: msg.createdAt,
        sourceMessageId: msg.id,
      };
      for (const cb of this.messageCallbacks) cb(crossMsg);
    });
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    const channel = await this.client.channels.fetch(chatId);
    if (channel?.isTextBased()) {
      await (channel as TextChannel).send(text);
    }
  }

  onMessage(callback: (message: CrossChannelMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  async disconnect(): Promise<void> {
    await this.client.destroy();
    this.status = 'disconnected';
  }

  private resolveRoom(channelId: string): string | null {
    for (const [room, id] of this.roomChannelMap) {
      if (id === channelId) return room;
    }
    return null;
  }
}
```

### Phase 2: Extract command handlers from `runtime.ts`

Move the 20+ `!commands` into a `src/discord/command-handler.ts` that receives the adapter
and orchestrator context, reducing `runtime.ts` from ~1,664 to ~600 lines.

### Phase 3: Wire `DiscordAdapter` through `MessageRouter`

Register the `DiscordAdapter` with the existing `MessageRouter` in `src/channels/router.ts`,
giving Discord the same routing path as WhatsApp and Telegram.

---

## Risk Assessment

- **Risk:** LOW — extraction is purely structural, no behavior change
- **Reversibility:** HIGH — if extraction causes issues, revert the commit
- **Test strategy:** Existing `runtime.ts` behavior must be preserved; add adapter-level unit tests

---

## Recommendation

Execute Phase 1 first as a standalone PR. This unblocks cross-channel routing parity without
touching `runtime.ts` command logic (Phase 2 can follow separately).

Overall codebase drift: **5%** — the spec is remarkably accurate. This is the only structural
divergence worth addressing.
