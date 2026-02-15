# Cross-Channel Routing System

Multi-platform messaging bridge for IntentGuard's cognitive room architecture.

## Architecture

```
WhatsApp Groups ──┐
                  │
Telegram Groups ──┼──> Channel Manager ──> Discord Cognitive Rooms
                  │                              │
Discord Channels ─┘                              │
                                                 └──> Orchestrator
```

## Components

### 1. Channel Adapters

Located in `/src/channels/`:

- **`types.ts`** — Interface definitions for all adapters
- **`whatsapp-adapter.ts`** — WhatsApp Web.js integration
- **`telegram-adapter.ts`** — Telegram Bot API integration

Each adapter implements the `ChannelAdapter` interface:

```typescript
interface ChannelAdapter {
  name: string;
  status: 'connected' | 'disconnected' | 'qr-pending' | 'error';
  initialize(): Promise<void>;
  sendMessage(chatId: string, text: string): Promise<void>;
  onMessage(callback: (msg: CrossChannelMessage) => void): void;
  disconnect?(): Promise<void>;
}
```

### 2. Channel Manager

Extended in `/src/discord/channel-manager.ts`:

**New Methods:**
- `registerAdapter(adapter: ChannelAdapter)` — Register WhatsApp/Telegram
- `routeMessage(source, sourceId, content, author, targetRoom)` — Route external → Discord
- `sendToExternalChannel(adapterName, chatId, content)` — Route Discord → external
- `registerMessageHandler(source, handler)` — Custom processing (orchestrator)
- `getAdapterStatus()` — Monitoring endpoint

## Setup

### 1. Install Dependencies

```bash
npm install whatsapp-web.js node-telegram-bot-api
# or
pnpm add whatsapp-web.js node-telegram-bot-api
```

### 2. Environment Variables

Create `.env`:

```bash
# Telegram Bot Token (get from @BotFather)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# WhatsApp uses QR code authentication (no token needed)
```

### 3. Initialize in Main Bot

```typescript
import { Client } from 'discord.js';
import { ChannelManager } from './discord/channel-manager.js';
import { WhatsAppAdapter } from './channels/whatsapp-adapter.js';
import { TelegramAdapter } from './channels/telegram-adapter.js';
import type { Logger } from './types.js';

async function setupCrossChannel(
  client: Client,
  channelManager: ChannelManager,
  log: Logger,
) {
  // WhatsApp
  const whatsappAdapter = new WhatsAppAdapter(log, [
    { groupId: 'GROUP_ID@g.us', room: 'builder' },
  ]);
  await whatsappAdapter.initialize();
  channelManager.registerAdapter(whatsappAdapter);

  // Telegram
  const telegramAdapter = new TelegramAdapter(
    log,
    process.env.TELEGRAM_BOT_TOKEN!,
    [{ groupId: '-1001234567890', room: 'operator' }],
  );
  await telegramAdapter.initialize();
  channelManager.registerAdapter(telegramAdapter);

  log.info('Cross-channel routing active');
}
```

## Message Flow

### External → Discord

1. WhatsApp group message received
2. Adapter maps group ID → cognitive room
3. `routeMessage()` forwards to Discord `#builder`
4. Format: `**[whatsapp]** Username: Message text`

### Discord → External (Bidirectional)

```typescript
client.on('messageCreate', async (message) => {
  const room = channelManager.getRoomForChannel(message.channelId);
  if (!room) return;

  // Get WhatsApp group for this room
  const whatsappGroupId = whatsappAdapter.getGroupIdForRoom(room);
  if (whatsappGroupId) {
    await channelManager.sendToExternalChannel(
      'whatsapp',
      whatsappGroupId,
      `[Discord] ${message.author.username}: ${message.content}`,
    );
  }
});
```

## Configuration

### WhatsApp Group IDs

**Finding group IDs:**

```typescript
// Add temporary listener in initialize()
this.client.on('message', async (msg) => {
  const chat = await msg.getChat();
  if (chat.isGroup) {
    console.log(`Group: ${chat.name}, ID: ${chat.id._serialized}`);
  }
});
```

Format: `120363012345678901@g.us`

### Telegram Group IDs

**Finding group IDs:**

```typescript
// Add temporary listener in initialize()
this.bot.on('message', (msg) => {
  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    console.log(`Group: ${msg.chat.title}, ID: ${msg.chat.id}`);
  }
});
```

Format: `-1001234567890` (negative integer)

## Runtime Mapping

Add mappings dynamically via Discord commands:

```typescript
// Discord command: !map-whatsapp <groupId> <room>
if (message.content.startsWith('!map-whatsapp')) {
  const [, groupId, room] = message.content.split(' ');
  whatsappAdapter.addMapping(groupId, room);
  await message.reply(`Mapped WhatsApp group ${groupId} → #${room}`);
}

// Discord command: !map-telegram <groupId> <room>
if (message.content.startsWith('!map-telegram')) {
  const [, groupId, room] = message.content.split(' ');
  telegramAdapter.addMapping(groupId, room);
  await message.reply(`Mapped Telegram group ${groupId} → #${room}`);
}
```

## Graceful Fallbacks

Adapters use dynamic imports with try/catch:

```typescript
// If whatsapp-web.js is not installed
const { Client } = await import('whatsapp-web.js').catch(() => {
  this.log.warn('whatsapp-web.js not installed, adapter running in stub mode');
  throw new Error('STUB_MODE');
});
```

Bot will start successfully even if packages are missing (adapter status: `disconnected`).

## Monitoring

```typescript
// Get adapter status
const statuses = channelManager.getAdapterStatus();
// [{ name: 'whatsapp', status: 'connected' }, { name: 'telegram', status: 'qr-pending' }]

// Check individual adapter
const adapters = channelManager.getAdapters();
const whatsapp = adapters.get('whatsapp');
console.log(whatsapp?.status); // 'connected' | 'disconnected' | 'qr-pending' | 'error'
```

## Security Notes

- **WhatsApp QR Code:** Logs to console on first run, scan with phone
- **Telegram Token:** Store in `.env`, never commit to git
- **Group Access:** Only messages from mapped groups are processed
- **Commands:** Telegram adapter ignores messages starting with `/`

## Troubleshooting

### WhatsApp stuck in "qr-pending"

- Check console for QR code ASCII art
- Scan with WhatsApp app (Settings → Linked Devices)
- Authentication session saved in `.wwebjs_auth/`

### Telegram "polling_error"

- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check bot is added to target groups as admin
- Ensure only one bot instance is running (polling conflicts)

### Messages not routing

```typescript
// Enable debug logging
this.log.debug(`Received message from ${source}: ${content}`);
this.log.debug(`Mapped to room: ${targetRoom}`);
this.log.debug(`Discord channel ID: ${channelId}`);
```

## Integration with Orchestrator

```typescript
// Register custom handler for WhatsApp messages
channelManager.registerMessageHandler('whatsapp', (msg) => {
  // Instead of forwarding to Discord, send to orchestrator
  orchestrator.createTask({
    room: msg.targetRoom,
    prompt: msg.content,
    source: 'whatsapp',
    author: msg.author,
  });
});
```

## Future Extensions

- **Slack Adapter** — Slack Bolt SDK
- **Matrix Adapter** — matrix-js-sdk
- **SMS Adapter** — Twilio API
- **Email Adapter** — IMAP/SMTP bridge

All follow the same `ChannelAdapter` interface pattern.

## Files

- `/src/channels/types.ts` — Interface definitions
- `/src/channels/whatsapp-adapter.ts` — WhatsApp implementation
- `/src/channels/telegram-adapter.ts` — Telegram implementation
- `/src/channels/cross-channel-example.ts` — Integration example
- `/src/discord/channel-manager.ts` — Extended with routing methods

## License

Same as IntentGuard project.
