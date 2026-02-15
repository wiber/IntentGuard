# Tesseract Playground Bot

**Phase:** Phase 5 — Open Playground
**Status:** ✅ Implemented

## Overview

The Tesseract Playground Bot integrates the tesseract.nu HTTP playground server with the IntentGuard Discord bot runtime. It provides a public-facing web interface and REST API for real-time visualization of the bot's tesseract grid state.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    IntentGuard Runtime                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         TesseractPlaygroundBot                       │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │   TesseractPlayground HTTP Server             │ │  │
│  │  │   • GET /playground → Web UI                  │ │  │
│  │  │   • GET /api/grid/state → Grid state JSON    │ │  │
│  │  │   • POST /api/grid/pointer → Push events     │ │  │
│  │  │   • GET /api/health → Health check           │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │                       │                              │  │
│  │                       ↓                              │  │
│  │         GridEventBridge (event sync)                │  │
│  │                       │                              │  │
│  │                       ↓                              │  │
│  │         TesseractClient (grid state fetch)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Discord Bot ←→ Commands (!playground status, etc.)        │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. **Automatic Lifecycle Management**
- Starts with the bot runtime
- Graceful shutdown on bot termination
- Health monitoring and status reporting

### 2. **Discord Command Integration**
```
!playground status    → Show server status and uptime
!playground start     → Start the playground server
!playground stop      → Stop the playground server
!playground restart   → Restart the playground server
!playground url       → Get playground URLs
!playground help      → Show command help
```

### 3. **Grid State Synchronization**
- Optional periodic sync with Discord events
- Real-time grid state updates via HTTP API
- Bi-directional communication (Discord ↔ Playground)

### 4. **Public API**
- **GET** `/api/grid/state` — Fetch current grid cell pressures
- **POST** `/api/grid/pointer` — Push pointer event
- **POST** `/api/grid/pointer/batch` — Batch push events
- **GET** `/api/health` — Health check
- **GET** `/playground` — Interactive web UI

## Installation

### 1. Add to Runtime Configuration

Edit `intentguard.json`:

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

### 2. Wire into Runtime

Add to `src/runtime.ts`:

```typescript
import { createPlaygroundBot, autoStartPlaygroundBot, registerPlaygroundBotCleanup } from './bot/runtime-integration.js';

// In IntentGuardRuntime constructor:
private playgroundBot!: TesseractPlaygroundBot;

// In start() method:
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

// Auto-start if enabled
if (config.playground?.autoStart) {
  await autoStartPlaygroundBot(this.playgroundBot, this.logger);
}

// Register cleanup
registerPlaygroundBotCleanup(this.playgroundBot, this.logger);

// In handleCommand() method:
case '!playground': {
  await playgroundCommandHandler(message, args);
  break;
}

// In stop() method:
await this.playgroundBot.stop();
```

## Usage

### Starting the Playground

**Option 1: Auto-start with bot**
```bash
npm run start  # Playground starts automatically
```

**Option 2: Manual start via Discord**
```
!playground start
```

### Accessing the Playground

Once started, access the playground at:
- **Web UI:** `http://localhost:3456/playground`
- **API:** `http://localhost:3456/api/grid/state`

### Checking Status

```
!playground status
```

Output:
```
🟢 Tesseract Playground — Online
🔗 URL: http://0.0.0.0:3456/playground
⏱️ Uptime: 2.3h
🔄 Grid Sync: Enabled
📊 Last Sync: 3:45:12 PM
```

### Getting URLs

```
!playground url
```

Output:
```
🔗 Tesseract Playground URLs
Playground UI: http://0.0.0.0:3456/playground
API Endpoint: http://0.0.0.0:3456/api/grid/state
Health Check: http://0.0.0.0:3456/api/health
```

## Configuration

### Environment Variables

```bash
# Playground server port
TESSERACT_PLAYGROUND_PORT=3456

# Playground server host (use 0.0.0.0 for public access)
TESSERACT_PLAYGROUND_HOST=0.0.0.0

# Tesseract API URL (for grid state fetching)
TESSERACT_API_URL=https://tesseract.nu/api
```

### Config Options

```typescript
interface PlaygroundBotConfig {
  enabled: boolean;           // Enable/disable the playground bot
  port: number;               // HTTP server port (default: 3456)
  host: string;               // HTTP server host (default: 0.0.0.0)
  autoStart: boolean;         // Auto-start with bot runtime
  syncWithDiscord: boolean;   // Enable grid state sync
  corsOrigins?: string[];     // CORS allowed origins (default: ['*'])
}
```

## Grid State Synchronization

When `syncWithDiscord: true`, the bot periodically fetches grid state and syncs it with Discord events.

**Sync Interval:** 30 seconds (configurable)

**Benefits:**
- Real-time grid state updates
- Bi-directional event flow (Discord → Playground)
- Grid event logging for debugging

## Security Considerations

### Rate Limiting
- Max 60 requests per minute per IP
- Automatic IP-based throttling

### CORS Configuration
- Default: Allow all origins (`['*']`)
- Production: Restrict to specific domains

### Authentication
- Currently disabled (public playground)
- Future: API key-based auth for write operations

## Testing

Run the test suite:

```bash
npm test src/bot/tesseract-playground-bot.test.ts
```

Test coverage:
- ✅ Initialization and configuration
- ✅ Lifecycle management (start/stop)
- ✅ Status reporting
- ✅ URL helpers
- ✅ Grid sync
- ✅ Error handling

## Troubleshooting

### Playground Won't Start

**Symptom:** `!playground start` fails with error

**Solutions:**
1. Check if port is already in use:
   ```bash
   lsof -i :3456
   ```
2. Try a different port:
   ```
   TESSERACT_PLAYGROUND_PORT=3457 npm run start
   ```
3. Check logs for detailed error:
   ```bash
   tail -f logs/runtime.log
   ```

### Grid State Not Syncing

**Symptom:** Playground UI shows stale data

**Solutions:**
1. Verify sync is enabled:
   ```
   !playground status
   ```
   Should show: `🔄 Grid Sync: Enabled`

2. Check API connectivity:
   ```bash
   curl http://localhost:3456/api/health
   ```

3. Restart the playground:
   ```
   !playground restart
   ```

### Cannot Access from External Network

**Symptom:** Playground works on localhost but not from other machines

**Solutions:**
1. Set host to `0.0.0.0`:
   ```bash
   TESSERACT_PLAYGROUND_HOST=0.0.0.0 npm run start
   ```

2. Check firewall rules:
   ```bash
   sudo ufw allow 3456/tcp
   ```

3. Verify the bot is listening on all interfaces:
   ```bash
   netstat -tuln | grep 3456
   ```

## API Documentation

### GET /api/grid/state

**Description:** Fetch current grid cell pressures

**Response:**
```json
{
  "cellPressures": {
    "A1": 0.75,
    "A2": 0.50,
    "A3": 0.25,
    ...
  },
  "timestamp": "2026-02-15T12:00:00.000Z",
  "version": "1.0.0"
}
```

### POST /api/grid/pointer

**Description:** Push a pointer event to update grid state

**Request:**
```json
{
  "cellId": "A1",
  "eventType": "task-complete",
  "data": {
    "phase": 0,
    "task": "Example task"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event processed",
  "gridState": { ... }
}
```

### GET /api/health

**Description:** Health check endpoint

**Response:**
```json
{
  "healthy": true,
  "version": "1.0.0",
  "timestamp": "2026-02-15T12:00:00.000Z",
  "uptime": 8640
}
```

## Integration with Phase 5 Goals

This implementation completes **Phase 5 — Open Playground** by:

1. ✅ **Hosting tesseract.nu playground through bot**
   - HTTP server integrated into bot runtime
   - Public web UI for grid visualization
   - REST API for external integrations

2. ✅ **Discord command integration**
   - Full lifecycle management via Discord
   - Status monitoring and health checks
   - URL sharing for easy access

3. ✅ **Grid state synchronization**
   - Real-time grid state updates
   - Bi-directional event flow
   - Automatic sync with Discord events

4. ✅ **Production-ready deployment**
   - Graceful shutdown handling
   - Error recovery and logging
   - Rate limiting and CORS support

## Future Enhancements

### Short-term (Phase 5 continuation)
- [ ] Discord embed visualization (render grid in Discord)
- [ ] Webhook support for external event triggers
- [ ] GraphQL API for advanced queries

### Long-term (Phase 6+)
- [ ] Authentication and authorization
- [ ] WebSocket support for real-time updates
- [ ] Grid history and time-series data
- [ ] Multi-bot federation support

## Contributing

When extending the playground bot:

1. **Add new commands** in `runtime-integration.ts`
2. **Add new API endpoints** in `src/api/tesseract-playground.ts`
3. **Add tests** in `tesseract-playground-bot.test.ts`
4. **Update this README** with new features

## License

MIT — See root LICENSE file

## Related Files

- `src/bot/tesseract-playground-bot.ts` — Main bot implementation
- `src/bot/runtime-integration.ts` — Runtime wiring helpers
- `src/api/tesseract-playground.ts` — HTTP server implementation
- `src/grid/tesseract-client.ts` — Grid state client
- `src/grid/event-bridge.ts` — Event synchronization
