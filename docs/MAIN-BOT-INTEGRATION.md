# Main Bot Integration Guide

How to integrate cross-channel routing into your main Discord bot file.

## Complete Integration Example

Create or update your main bot file (e.g., `src/main.ts` or `src/index.ts`):

```typescript
/**
 * IntentGuard Main Bot
 * Discord + WhatsApp + Telegram Multi-Channel Orchestration
 */

import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import { ChannelManager } from './discord/channel-manager.js';
import { WhatsAppAdapter } from './channels/whatsapp-adapter.js';
import { TelegramAdapter } from './channels/telegram-adapter.js';
import type { Logger } from './types.js';

// Load environment variables
config();

// ═══════════════════════════════════════════════════════════════
// Logger Setup
// ═══════════════════════════════════════════════════════════════

const logger: Logger = {
  debug: (msg: string) => console.log(`[DEBUG] ${msg}`),
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

// ═══════════════════════════════════════════════════════════════
// Discord Client Setup
// ═══════════════════════════════════════════════════════════════

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// Initialize channel manager
const channelManager = new ChannelManager(client, logger, process.cwd());

// ═══════════════════════════════════════════════════════════════
// Cross-Channel Routing Setup
// ═══════════════════════════════════════════════════════════════

async function setupCrossChannelRouting() {
  logger.info('Initializing cross-channel routing...');

  // ─────────────────────────────────────────────────────────────
  // WhatsApp Adapter
  // ─────────────────────────────────────────────────────────────

  const whatsappMappings = [
    { groupId: '120363012345678901@g.us', room: 'builder' },
    { groupId: '120363019876543210@g.us', room: 'architect' },
    { groupId: '120363011111111111@g.us', room: 'operator' },
  ];

  const whatsappAdapter = new WhatsAppAdapter(logger, whatsappMappings);

  try {
    await whatsappAdapter.initialize();
    channelManager.registerAdapter(whatsappAdapter);
    logger.info(`WhatsApp adapter registered (status: ${whatsappAdapter.status})`);
  } catch (err) {
    logger.error(`WhatsApp adapter initialization failed: ${err}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Telegram Adapter
  // ─────────────────────────────────────────────────────────────

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!telegramToken) {
    logger.warn('TELEGRAM_BOT_TOKEN not set, skipping Telegram adapter');
  } else {
    const telegramMappings = [
      { groupId: '-1001234567890', room: 'vault' },
      { groupId: '-1009876543210', room: 'voice' },
      { groupId: '-1005555555555', room: 'laboratory' },
    ];

    const telegramAdapter = new TelegramAdapter(logger, telegramToken, telegramMappings);

    try {
      await telegramAdapter.initialize();
      channelManager.registerAdapter(telegramAdapter);
      logger.info(`Telegram adapter registered (status: ${telegramAdapter.status})`);
    } catch (err) {
      logger.error(`Telegram adapter initialization failed: ${err}`);
    }
  }

  logger.info('Cross-channel routing setup complete');
}

// ═══════════════════════════════════════════════════════════════
// Discord Message Handler (Bidirectional Routing)
// ═══════════════════════════════════════════════════════════════

client.on('messageCreate', async (message) => {
  // Skip bot messages
  if (message.author.bot) return;

  // Get cognitive room for this channel
  const room = channelManager.getRoomForChannel(message.channelId);
  if (!room) return;

  // ─────────────────────────────────────────────────────────────
  // Discord Commands
  // ─────────────────────────────────────────────────────────────

  // Command: !adapter-status
  if (message.content === '!adapter-status') {
    const statuses = channelManager.getAdapterStatus();
    const lines = statuses.map((s) => `${s.name}: ${s.status}`);
    await message.reply(`**Adapter Status**\n${lines.join('\n')}`);
    return;
  }

  // Command: !map-whatsapp <groupId> <room>
  if (message.content.startsWith('!map-whatsapp')) {
    const [, groupId, targetRoom] = message.content.split(' ');
    if (!groupId || !targetRoom) {
      await message.reply('Usage: !map-whatsapp <groupId> <room>');
      return;
    }

    const adapters = channelManager.getAdapters();
    const whatsapp = adapters.get('whatsapp') as WhatsAppAdapter | undefined;

    if (whatsapp) {
      whatsapp.addMapping(groupId, targetRoom);
      await message.reply(`✓ Mapped WhatsApp group ${groupId} → #${targetRoom}`);
    } else {
      await message.reply('✗ WhatsApp adapter not available');
    }
    return;
  }

  // Command: !map-telegram <groupId> <room>
  if (message.content.startsWith('!map-telegram')) {
    const [, groupId, targetRoom] = message.content.split(' ');
    if (!groupId || !targetRoom) {
      await message.reply('Usage: !map-telegram <groupId> <room>');
      return;
    }

    const adapters = channelManager.getAdapters();
    const telegram = adapters.get('telegram') as TelegramAdapter | undefined;

    if (telegram) {
      telegram.addMapping(groupId, targetRoom);
      await message.reply(`✓ Mapped Telegram group ${groupId} → #${targetRoom}`);
    } else {
      await message.reply('✗ Telegram adapter not available');
    }
    return;
  }

  // ─────────────────────────────────────────────────────────────
  // Forward Discord message to external channels
  // ─────────────────────────────────────────────────────────────

  await forwardToExternalChannels(room, message.content, message.author.username);
});

async function forwardToExternalChannels(
  room: string,
  content: string,
  author: string,
): Promise<void> {
  const formattedContent = `[Discord] ${author}: ${content}`;
  const adapters = channelManager.getAdapters();

  // Forward to WhatsApp
  const whatsapp = adapters.get('whatsapp') as WhatsAppAdapter | undefined;
  if (whatsapp && whatsapp.status === 'connected') {
    const groupId = whatsapp.getGroupIdForRoom(room);
    if (groupId) {
      await channelManager.sendToExternalChannel('whatsapp', groupId, formattedContent);
    }
  }

  // Forward to Telegram
  const telegram = adapters.get('telegram') as TelegramAdapter | undefined;
  if (telegram && telegram.status === 'connected') {
    const groupId = telegram.getGroupIdForRoom(room);
    if (groupId) {
      await channelManager.sendToExternalChannel('telegram', groupId, formattedContent);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Discord Ready Event
// ═══════════════════════════════════════════════════════════════

client.once('ready', async () => {
  logger.info(`Discord bot ready: ${client.user?.tag}`);

  // Initialize Discord channels
  const guildId = process.env.DISCORD_GUILD_ID;
  if (guildId) {
    await channelManager.initialize(guildId, 'IntentGuard');
    logger.info('Channel manager initialized');
  }

  // Setup cross-channel routing
  await setupCrossChannelRouting();

  // Status monitoring (every 30 seconds)
  setInterval(() => {
    const statuses = channelManager.getAdapterStatus();
    for (const { name, status } of statuses) {
      if (status !== 'connected') {
        logger.warn(`Adapter ${name} is ${status}`);
      }
    }
  }, 30000);

  logger.info('IntentGuard fully initialized!');
});

// ═══════════════════════════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════════════════════════

client.on('error', (error) => {
  logger.error(`Discord client error: ${error.message}`);
});

process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error}`);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');

  // Disconnect adapters
  const adapters = channelManager.getAdapters();
  for (const [name, adapter] of adapters) {
    if (adapter.disconnect) {
      await adapter.disconnect();
      logger.info(`Disconnected ${name} adapter`);
    }
  }

  // Disconnect Discord
  client.destroy();
  logger.info('Discord client disconnected');

  process.exit(0);
});

// ═══════════════════════════════════════════════════════════════
// Start Bot
// ═══════════════════════════════════════════════════════════════

const token = process.env.DISCORD_TOKEN;
if (!token) {
  logger.error('DISCORD_TOKEN not set in environment variables');
  process.exit(1);
}

client.login(token).catch((error) => {
  logger.error(`Failed to login: ${error.message}`);
  process.exit(1);
});
```

## Environment Variables

Create `.env`:

```bash
# Discord (required)
DISCORD_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_guild_id

# Telegram (optional)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# WhatsApp (no token needed, uses QR code)
```

## Running the Bot

```bash
# Install dependencies
npm install discord.js dotenv
npm install whatsapp-web.js node-telegram-bot-api  # Optional

# Build (if using TypeScript)
npm run build

# Run
node dist/main.js
# or
npx tsx src/main.ts
```

## First Run Checklist

1. **Discord**: Bot starts, logs "Discord bot ready"
2. **Channels**: 9 cognitive rooms + extra channels created
3. **WhatsApp**: QR code appears in console → scan with phone
4. **Telegram**: Bot connects, logs "@YourBot connected"
5. **Status**: Run `!adapter-status` in Discord to verify

## Testing Message Flow

### Test 1: External → Discord

1. Send message in mapped WhatsApp group
2. Check Discord `#builder` channel
3. Should see: `**[whatsapp]** Username: Message text`

### Test 2: Discord → External

1. Send message in Discord `#builder` channel
2. Check WhatsApp group
3. Should see: `[Discord] Username: Message text`

## Advanced Integration

### With Orchestrator

```typescript
import { Orchestrator } from './orchestrator/orchestrator.js';

const orchestrator = new Orchestrator(/* ... */);

// Route WhatsApp messages to orchestrator instead of Discord
channelManager.registerMessageHandler('whatsapp', (msg) => {
  orchestrator.createTask({
    room: msg.targetRoom,
    prompt: msg.content,
    source: 'whatsapp',
    author: msg.author,
  });
});
```

### With Rate Limiting

```typescript
const rateLimiter = new Map<string, number[]>();

async function forwardToExternalChannels(
  room: string,
  content: string,
  author: string,
): Promise<void> {
  const key = `discord:${room}`;
  const now = Date.now();

  const timestamps = rateLimiter.get(key) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < 60000);

  if (recentTimestamps.length >= 30) {
    logger.warn(`Rate limit exceeded for ${key}`);
    return;
  }

  recentTimestamps.push(now);
  rateLimiter.set(key, recentTimestamps);

  // Forward messages...
}
```

### With Message Filtering

```typescript
const BLOCKED_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
];

async function forwardToExternalChannels(
  room: string,
  content: string,
  author: string,
): Promise<void> {
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      logger.warn(`Blocked message containing sensitive data: ${pattern}`);
      return;
    }
  }

  // Forward messages...
}
```

## Deployment

### PM2 (Production)

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start dist/main.js --name intentguard

# Monitor
pm2 logs intentguard
pm2 status

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Systemd Service

Create `/etc/systemd/system/intentguard.service`:

```ini
[Unit]
Description=IntentGuard Discord Bot
After=network.target

[Service]
Type=simple
User=intentguard
WorkingDirectory=/opt/intentguard
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable intentguard
sudo systemctl start intentguard
sudo systemctl status intentguard
```

## Monitoring

### Health Check Endpoint

```typescript
import express from 'express';

const app = express();

app.get('/health', (req, res) => {
  const statuses = channelManager.getAdapterStatus();
  const allHealthy = statuses.every((s) => s.status === 'connected');

  res.json({
    status: allHealthy ? 'healthy' : 'degraded',
    adapters: statuses,
    uptime: process.uptime(),
  });
});

app.listen(3000);
```

### Metrics Collection

```typescript
const metrics = {
  messagesRouted: 0,
  errorCount: 0,
  lastError: null as string | null,
};

channelManager.registerMessageHandler('whatsapp', (msg) => {
  metrics.messagesRouted++;
  // Process message...
});

// Report metrics every 5 minutes
setInterval(() => {
  logger.info(`Metrics: ${JSON.stringify(metrics)}`);
}, 300000);
```

## Summary

Complete working example of IntentGuard bot with:

- Discord cognitive room management
- WhatsApp group integration
- Telegram group integration
- Bidirectional message routing
- Runtime configuration commands
- Status monitoring
- Graceful error handling
- Production deployment guides

Copy this template, update group IDs and tokens, and you're ready to go!
