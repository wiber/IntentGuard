# Cross-Channel Integration Guide

Complete setup instructions for integrating WhatsApp and Telegram with IntentGuard's Discord cognitive rooms.

## Quick Start

### 1. Install Dependencies

```bash
npm install whatsapp-web.js node-telegram-bot-api
# or
pnpm add whatsapp-web.js node-telegram-bot-api
```

### 2. Environment Setup

Create `.env`:

```bash
# Telegram Bot Token (required for Telegram)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Discord credentials (existing)
DISCORD_TOKEN=your_discord_token
DISCORD_GUILD_ID=your_guild_id
```

### 3. Main Bot Integration

In your main bot file (e.g., `src/index.ts`):

```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import { ChannelManager } from './discord/channel-manager.js';
import { WhatsAppAdapter } from './channels/whatsapp-adapter.js';
import { TelegramAdapter } from './channels/telegram-adapter.js';
import { setupCrossChannelRouting } from './channels/cross-channel-example.js';

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize channel manager
const channelManager = new ChannelManager(client, log, process.cwd());

// Setup cross-channel routing
await setupCrossChannelRouting(client, channelManager, log);

// Ready!
client.login(process.env.DISCORD_TOKEN);
```

## Configuration

### WhatsApp Group Mappings

1. **Get Group IDs**: Run the bot once with WhatsApp adapter enabled. It will log all groups:

```
[INFO] Group: Builder Team, ID: 120363012345678901@g.us
[INFO] Group: Architecture Discussion, ID: 120363019876543210@g.us
```

2. **Configure Mappings**:

```typescript
const whatsappMappings = [
  { groupId: '120363012345678901@g.us', room: 'builder' },
  { groupId: '120363019876543210@g.us', room: 'architect' },
  { groupId: '120363011111111111@g.us', room: 'operator' },
];

const whatsappAdapter = new WhatsAppAdapter(log, whatsappMappings);
await whatsappAdapter.initialize();
channelManager.registerAdapter(whatsappAdapter);
```

3. **QR Code Authentication**: On first run, scan the QR code shown in the console with WhatsApp app (Settings → Linked Devices).

### Telegram Group Mappings

1. **Create Bot**: Talk to [@BotFather](https://t.me/botfather) on Telegram:
   - `/newbot` → Follow prompts
   - Copy the token: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
   - Add to `.env` as `TELEGRAM_BOT_TOKEN`

2. **Get Group IDs**: Run the bot, add it to your Telegram groups, send a message. It will log:

```
[INFO] Group: Vault Security, ID: -1001234567890
[INFO] Group: Voice Team, ID: -1009876543210
```

3. **Configure Mappings**:

```typescript
const telegramMappings = [
  { groupId: '-1001234567890', room: 'vault' },
  { groupId: '-1009876543210', room: 'voice' },
  { groupId: '-1005555555555', room: 'laboratory' },
];

const telegramAdapter = new TelegramAdapter(
  log,
  process.env.TELEGRAM_BOT_TOKEN!,
  telegramMappings,
);
await telegramAdapter.initialize();
channelManager.registerAdapter(telegramAdapter);
```

## Message Routing

### External → Discord (Automatic)

When a message is sent in a mapped WhatsApp/Telegram group:

1. Adapter receives message
2. Maps group ID → cognitive room
3. Forwards to Discord channel
4. Format: `**[whatsapp]** John: Hello from WhatsApp!`

### Discord → External (Manual Setup)

Add to your Discord message handler:

```typescript
client.on('messageCreate', async (message) => {
  // Skip bot messages
  if (message.author.bot) return;

  // Get cognitive room
  const room = channelManager.getRoomForChannel(message.channelId);
  if (!room) return;

  // Forward to WhatsApp
  const adapters = channelManager.getAdapters();
  const whatsapp = adapters.get('whatsapp') as WhatsAppAdapter;
  const whatsappGroupId = whatsapp?.getGroupIdForRoom(room);

  if (whatsappGroupId && whatsapp?.status === 'connected') {
    await channelManager.sendToExternalChannel(
      'whatsapp',
      whatsappGroupId,
      `[Discord] ${message.author.username}: ${message.content}`,
    );
  }

  // Forward to Telegram
  const telegram = adapters.get('telegram') as TelegramAdapter;
  const telegramGroupId = telegram?.getGroupIdForRoom(room);

  if (telegramGroupId && telegram?.status === 'connected') {
    await channelManager.sendToExternalChannel(
      'telegram',
      telegramGroupId,
      `[Discord] ${message.author.username}: ${message.content}`,
    );
  }
});
```

## Advanced Features

### Custom Message Handlers

Integrate with orchestrator instead of forwarding to Discord:

```typescript
channelManager.registerMessageHandler('whatsapp', (msg) => {
  // Send to orchestrator instead of Discord
  orchestrator.createTask({
    room: msg.targetRoom,
    prompt: msg.content,
    source: 'whatsapp',
    author: msg.author,
    metadata: {
      sourceId: msg.sourceId,
      timestamp: msg.timestamp,
    },
  });
});
```

### Runtime Mapping Commands

Add Discord commands to manage mappings:

```typescript
// Command: !map-whatsapp <groupId> <room>
if (message.content.startsWith('!map-whatsapp')) {
  const [, groupId, room] = message.content.split(' ');

  const adapters = channelManager.getAdapters();
  const whatsapp = adapters.get('whatsapp') as WhatsAppAdapter;

  if (whatsapp) {
    whatsapp.addMapping(groupId, room);
    await message.reply(`✓ Mapped WhatsApp group ${groupId} → #${room}`);
  } else {
    await message.reply('✗ WhatsApp adapter not available');
  }
}

// Command: !map-telegram <groupId> <room>
if (message.content.startsWith('!map-telegram')) {
  const [, groupId, room] = message.content.split(' ');

  const adapters = channelManager.getAdapters();
  const telegram = adapters.get('telegram') as TelegramAdapter;

  if (telegram) {
    telegram.addMapping(groupId, room);
    await message.reply(`✓ Mapped Telegram group ${groupId} → #${room}`);
  } else {
    await message.reply('✗ Telegram adapter not available');
  }
}

// Command: !adapter-status
if (message.content === '!adapter-status') {
  const statuses = channelManager.getAdapterStatus();
  const lines = statuses.map((s) => `${s.name}: ${s.status}`);
  await message.reply(`**Adapter Status**\n${lines.join('\n')}`);
}
```

### Monitoring Dashboard

```typescript
// Periodic status check (every 30 seconds)
setInterval(() => {
  const statuses = channelManager.getAdapterStatus();
  for (const { name, status } of statuses) {
    if (status === 'error' || status === 'disconnected') {
      log.error(`Adapter ${name} is ${status}, attempting reconnect...`);
      // Trigger reconnect logic
    }
  }
}, 30000);
```

## Security Best Practices

### 1. Room Filtering

Only allow cross-channel routing to cognitive rooms:

```typescript
const ALLOWED_ROOMS = [
  'builder', 'architect', 'operator', 'vault', 'voice',
  'laboratory', 'performer', 'navigator', 'network',
];

channelManager.registerMessageHandler('whatsapp', (msg) => {
  if (!ALLOWED_ROOMS.includes(msg.targetRoom)) {
    log.warn(`Blocked message to restricted room: ${msg.targetRoom}`);
    return;
  }
  // Process message...
});
```

### 2. Rate Limiting

```typescript
const messageRateLimiter = new Map<string, number[]>();

channelManager.registerMessageHandler('whatsapp', (msg) => {
  const key = `${msg.source}:${msg.sourceId}`;
  const now = Date.now();

  // Get recent timestamps
  const timestamps = messageRateLimiter.get(key) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < 60000); // Last minute

  if (recentTimestamps.length >= 30) {
    log.warn(`Rate limit exceeded for ${key}`);
    return;
  }

  recentTimestamps.push(now);
  messageRateLimiter.set(key, recentTimestamps);

  // Process message...
});
```

### 3. Credential Management

```bash
# .env (never commit)
TELEGRAM_BOT_TOKEN=xxx
DISCORD_TOKEN=xxx

# .gitignore
.env
.env.*
.wwebjs_auth/  # WhatsApp session data
```

## Troubleshooting

### WhatsApp Issues

**Problem**: QR code not appearing

```typescript
// Enable verbose logging in adapter
this.client.on('qr', (qr) => {
  console.log('QR Code received:');
  console.log(qr);
  // Optionally use qrcode-terminal package
  // qrcode.generate(qr, { small: true });
});
```

**Problem**: Session expired

```bash
rm -rf .wwebjs_auth/  # Delete cached session
# Restart bot and rescan QR code
```

**Problem**: Messages not forwarding

```typescript
// Debug message handler
this.client.on('message', async (msg) => {
  const chat = await msg.getChat();
  console.log(`Received: ${msg.body}`);
  console.log(`From: ${chat.isGroup ? 'Group' : 'DM'}`);
  console.log(`Group ID: ${chat.id._serialized}`);
  console.log(`Mapped to room: ${this.groupToRoomMap.get(chat.id._serialized)}`);
});
```

### Telegram Issues

**Problem**: Polling error

```typescript
// Check bot configuration
const me = await this.bot.getMe();
console.log('Bot info:', me);

// Verify token format
console.log('Token format:', /^\d+:[A-Za-z0-9_-]+$/.test(token));
```

**Problem**: Bot not receiving messages

- Ensure bot is added to the group
- Check bot has "Privacy Mode" disabled in @BotFather settings
- Verify bot is an admin (required for some group types)

**Problem**: Multiple bots conflict

```bash
# Only one instance can poll at a time
pkill -f "node.*intentguard"  # Kill other instances
npm start  # Start fresh
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        IntentGuard                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────────┐                 │
│  │   WhatsApp   │────▶│  WhatsAppAdapter │                 │
│  │   Groups     │     └─────────┬────────┘                 │
│  └──────────────┘               │                           │
│                                  │                           │
│  ┌──────────────┐     ┌──────────▼──────┐                  │
│  │   Telegram   │────▶│ TelegramAdapter │                  │
│  │   Groups     │     └─────────┬────────┘                 │
│  └──────────────┘               │                           │
│                                  │                           │
│  ┌──────────────┐               │                           │
│  │   Discord    │               │                           │
│  │   Channels   │◀──────────────┴──────────┐               │
│  └──────────────┘                           │               │
│        ▲                                    │               │
│        │                             ┌──────▼──────┐        │
│        └─────────────────────────────│   Channel   │        │
│                                      │   Manager   │        │
│                                      └─────┬───────┘        │
│                                            │                │
│                                      ┌─────▼───────┐        │
│                                      │Orchestrator │        │
│                                      └─────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Testing

Run the test suite:

```bash
npx tsx src/channels/test-adapters.ts
```

Expected output:

```
Cross-Channel Adapter Test Suite
==================================================

=== Testing Interface Compliance ===

Checking whatsapp:
  name: ✓
  status: ✓
  initialize(): ✓
  sendMessage(): ✓
  onMessage(): ✓

Checking telegram:
  name: ✓
  status: ✓
  initialize(): ✓
  sendMessage(): ✓
  onMessage(): ✓

=== Test Summary ===
✓ Adapters instantiate without errors
✓ Interface compliance verified
✓ Graceful fallback when packages not installed
✓ Message handlers register correctly
✓ Mapping methods work as expected
```

## Next Steps

1. **Install Dependencies**: `npm install whatsapp-web.js node-telegram-bot-api`
2. **Configure Tokens**: Add `TELEGRAM_BOT_TOKEN` to `.env`
3. **Map Groups**: Get group IDs and configure mappings
4. **Test**: Run bot and verify messages route correctly
5. **Monitor**: Check adapter status periodically
6. **Extend**: Add custom handlers for orchestrator integration

## Support

- **Documentation**: `/src/channels/README.md`
- **Examples**: `/src/channels/cross-channel-example.ts`
- **Config**: `/config/cross-channel-config.example.json`
- **Tests**: `/src/channels/test-adapters.ts`

## License

Same as IntentGuard project.
