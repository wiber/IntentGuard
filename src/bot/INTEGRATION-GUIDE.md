# Playground Bot Integration Guide

**For Coordinator:** Quick guide to wire playground bot into `src/runtime.ts`

## Step 1: Import the Integration Helper

Add to the imports section of `src/runtime.ts`:

```typescript
import { createPlaygroundBot, autoStartPlaygroundBot, registerPlaygroundBotCleanup } from './bot/runtime-integration.js';
import type TesseractPlaygroundBot from './bot/tesseract-playground-bot.js';
```

## Step 2: Add Property to IntentGuardRuntime Class

In the `IntentGuardRuntime` class, add:

```typescript
export class IntentGuardRuntime {
  // ... existing properties ...
  private playgroundBot!: TesseractPlaygroundBot;
```

## Step 3: Initialize in start() Method

In the `async start()` method, after initializing other modules (around line 350):

```typescript
// Initialize playground bot
const { bot: playgroundBot, handleCommand: playgroundCommandHandler } = createPlaygroundBot(
  this.logger,
  {
    enabled: true,
    port: parseInt(process.env.TESSERACT_PLAYGROUND_PORT || '3456'),
    host: process.env.TESSERACT_PLAYGROUND_HOST || '0.0.0.0',
    autoStart: true,
    syncWithDiscord: true,
  }
);
this.playgroundBot = playgroundBot;
this.playgroundCommandHandler = playgroundCommandHandler;

// Auto-start playground
await autoStartPlaygroundBot(this.playgroundBot, this.logger);

// Register cleanup
registerPlaygroundBotCleanup(this.playgroundBot, this.logger);
```

## Step 4: Add Command Handler Property

Add to class properties:

```typescript
private playgroundCommandHandler!: (message: Message, args: string[]) => Promise<void>;
```

## Step 5: Wire Command in handleCommand() Method

In the `handleCommand()` method (around line 840), add:

```typescript
case '!playground': {
  await this.playgroundCommandHandler(message, args);
  break;
}
```

## Step 6: Add Cleanup in stop() Method

In the `stop()` method (around line 1625), add:

```typescript
async stop(): Promise<void> {
  this.logger.info('Stopping IntentGuard Runtime...');

  // Stop playground bot
  if (this.playgroundBot) {
    await this.playgroundBot.stop();
  }

  // ... rest of existing cleanup ...
}
```

## Step 7: Optional - Add to intentguard.json

Add configuration to `intentguard.json`:

```json
{
  "playground": {
    "enabled": true,
    "port": 3456,
    "host": "0.0.0.0",
    "autoStart": true,
    "syncWithDiscord": true
  }
}
```

Then update step 3 to read from config:

```typescript
const playgroundConfig = this.config.playground || {};
const { bot: playgroundBot, handleCommand: playgroundCommandHandler } = createPlaygroundBot(
  this.logger,
  {
    enabled: playgroundConfig.enabled ?? true,
    port: playgroundConfig.port ?? 3456,
    host: playgroundConfig.host ?? '0.0.0.0',
    autoStart: playgroundConfig.autoStart ?? true,
    syncWithDiscord: playgroundConfig.syncWithDiscord ?? true,
  }
);
```

## Testing

1. **Start the runtime:**
   ```bash
   npm run start
   ```

2. **Check playground status in Discord:**
   ```
   !playground status
   ```

   Expected output:
   ```
   🟢 Tesseract Playground — Online
   🔗 URL: http://0.0.0.0:3456/playground
   ⏱️ Uptime: 2m
   🔄 Grid Sync: Enabled
   ```

3. **Get playground URL:**
   ```
   !playground url
   ```

4. **Visit playground in browser:**
   Open: `http://localhost:3456/playground`

5. **Test API endpoint:**
   ```bash
   curl http://localhost:3456/api/health
   ```

## Troubleshooting

### Port Already in Use

If port 3456 is already in use:

```bash
# Find process using port
lsof -i :3456

# Kill it
kill -9 <PID>

# Or use different port
TESSERACT_PLAYGROUND_PORT=3457 npm run start
```

### Playground Not Starting

Check logs:
```bash
tail -f logs/runtime.log | grep PlaygroundBot
```

### Cannot Access from External Network

Verify host is set to 0.0.0.0:
```bash
# Check environment
echo $TESSERACT_PLAYGROUND_HOST

# Set if needed
export TESSERACT_PLAYGROUND_HOST=0.0.0.0
```

## Production Deployment

### Environment Variables

```bash
# .env file
TESSERACT_PLAYGROUND_PORT=3456
TESSERACT_PLAYGROUND_HOST=0.0.0.0
TESSERACT_API_URL=https://tesseract.nu/api
```

### Firewall Configuration

Open port 3456:
```bash
sudo ufw allow 3456/tcp
```

### Reverse Proxy (Optional)

Use nginx for HTTPS:
```nginx
server {
    listen 443 ssl;
    server_name playground.yourdomain.com;

    location / {
        proxy_pass http://localhost:3456;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Complete Integration Example

```typescript
// src/runtime.ts

import { createPlaygroundBot, autoStartPlaygroundBot, registerPlaygroundBotCleanup } from './bot/runtime-integration.js';
import type TesseractPlaygroundBot from './bot/tesseract-playground-bot.js';

export class IntentGuardRuntime {
  // Add property
  private playgroundBot!: TesseractPlaygroundBot;
  private playgroundCommandHandler!: (message: Message, args: string[]) => Promise<void>;

  async start(): Promise<void> {
    // ... existing initialization ...

    // Initialize playground bot
    const { bot: playgroundBot, handleCommand: playgroundCommandHandler } = createPlaygroundBot(
      this.logger,
      {
        enabled: true,
        port: 3456,
        host: '0.0.0.0',
        autoStart: true,
        syncWithDiscord: true,
      }
    );
    this.playgroundBot = playgroundBot;
    this.playgroundCommandHandler = playgroundCommandHandler;

    // Auto-start
    await autoStartPlaygroundBot(this.playgroundBot, this.logger);

    // Register cleanup
    registerPlaygroundBotCleanup(this.playgroundBot, this.logger);

    // ... rest of existing code ...
  }

  private async handleCommand(message: Message): Promise<void> {
    const [cmd, ...args] = message.content.split(/\s+/);

    switch (cmd) {
      // ... existing commands ...

      case '!playground': {
        await this.playgroundCommandHandler(message, args);
        break;
      }

      // ... rest of commands ...
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping IntentGuard Runtime...');

    // Stop playground bot
    if (this.playgroundBot) {
      await this.playgroundBot.stop();
    }

    // ... rest of cleanup ...
  }
}
```

## Verification Checklist

- [ ] Runtime starts without errors
- [ ] `!playground status` shows server online
- [ ] `!playground url` returns correct URLs
- [ ] Playground UI loads at `http://localhost:3456/playground`
- [ ] API endpoint responds: `curl http://localhost:3456/api/health`
- [ ] Grid state fetches: `curl http://localhost:3456/api/grid/state`
- [ ] Playground stops gracefully on bot shutdown (Ctrl+C)

## Next Steps

After integration:
1. Test all Discord commands
2. Verify external access (if needed)
3. Set up monitoring/alerts
4. Configure firewall rules
5. Update deployment documentation

---

**Questions?** See `src/bot/PLAYGROUND-BOT-README.md` for full documentation.
