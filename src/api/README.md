# Tesseract.nu Playground API

**Phase 5 — Open Playground**: Public IAMFIM implementation playground

## Overview

The Tesseract Playground hosts a public HTTP API that exposes IntentGuard's tesseract grid state and allows external integrations to interact with the bot's reality bridge.

This enables:
- **Public visibility** into the bot's operational state across 12 tesseract cells
- **External integrations** that can push pointer events to update grid state
- **Interactive playground UI** for exploring the tesseract grid in real-time
- **API-driven architecture** for building third-party tools and visualizations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Tesseract Playground                      │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   HTTP API   │───▶│  Grid State  │◀───│ Event Bridge │  │
│  │  (Express)   │    │   Manager    │    │   (Local)    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Playground  │    │   Rate       │    │   Grid       │  │
│  │     UI       │    │  Limiter     │    │  Events      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  tesseract.nu API    │
              │  (Remote Backend)    │
              └──────────────────────┘
```

## API Endpoints

### GET `/api/grid/state`

Fetch current grid cell pressures for all 12 tesseract cells.

**Response:**
```json
{
  "cellPressures": {
    "A1": 0.0, "A2": 0.0, "A3": 0.0, "A4": 0.0,
    "B1": 0.0, "B2": 0.0, "B3": 0.0, "B4": 0.0,
    "C1": 0.0, "C2": 0.0, "C3": 0.0, "C4": 0.0
  },
  "timestamp": "2026-02-15T12:00:00.000Z",
  "version": "1.0.0"
}
```

### POST `/api/grid/pointer`

Push a pointer event to update grid state.

**Request:**
```json
{
  "cellId": "A1",
  "eventType": "task-complete",
  "data": {
    "phase": 0,
    "task": "Example task",
    "metadata": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pointer event processed",
  "gridState": {
    "cellPressures": { ... },
    "timestamp": "2026-02-15T12:00:00.000Z"
  }
}
```

### POST `/api/grid/pointer/batch`

Batch push multiple pointer events in a single request.

**Request:**
```json
{
  "events": [
    { "cellId": "A1", "eventType": "task-complete", "data": {} },
    { "cellId": "B2", "eventType": "deployment", "data": {} },
    { "cellId": "C3", "eventType": "test-pass", "data": {} }
  ]
}
```

**Response:**
```json
{
  "results": [
    { "success": true, "message": "..." },
    { "success": true, "message": "..." },
    { "success": true, "message": "..." }
  ]
}
```

### GET `/api/health`

Health check endpoint for monitoring.

**Response:**
```json
{
  "healthy": true,
  "version": "1.0.0",
  "timestamp": "2026-02-15T12:00:00.000Z",
  "uptime": 3600
}
```

### GET `/playground` or `/`

Interactive HTML playground UI for visualizing and interacting with the tesseract grid.

Features:
- **Live grid visualization** with real-time pressure updates
- **Click-to-interact** — send pointer events by clicking cells
- **Auto-refresh mode** — polls grid state every 5 seconds
- **API documentation** embedded in the UI
- **Dark theme** with gradient accents

## Usage

### Standalone Server

Run the playground as a standalone HTTP server:

```bash
npx tsx src/api/tesseract-playground.ts
```

**Environment Variables:**
```bash
TESSERACT_PLAYGROUND_PORT=3456
TESSERACT_PLAYGROUND_HOST=0.0.0.0
TESSERACT_PLAYGROUND_CORS=http://localhost:3000,https://example.com
TESSERACT_PLAYGROUND_RATE_LIMIT=true
TESSERACT_PLAYGROUND_RATE_LIMIT_MAX=60
TESSERACT_PLAYGROUND_AUTH=false
TESSERACT_PLAYGROUND_API_KEYS=key1,key2,key3
TESSERACT_API_URL=https://tesseract.nu/api
```

### Integrated with Bot Runtime

The playground automatically starts when the bot launches (if enabled):

```typescript
import { initializePlayground } from './api/playground-integration.js';

// In runtime.ts
const playgroundManager = await initializePlayground({
  enabled: true,
  autoStart: true,
  port: 3456,
  host: '0.0.0.0',
  publicUrl: 'https://tesseract.nu/playground',
  discordNotifications: {
    enabled: true,
    channelId: process.env.TRUST_DEBT_PUBLIC_CHANNEL_ID,
  },
});
```

### Discord Commands

Control the playground from Discord:

```
!playground                  # Show status
!playground status           # Show detailed status
!playground start            # Start the playground server
!playground stop             # Stop the playground server
!playground restart          # Restart the playground server
!playground url              # Get the playground URL
```

### Programmatic API

Use the playground manager in your code:

```typescript
import { getPlaygroundManager } from './api/playground-integration.js';

const manager = getPlaygroundManager();

// Start
await manager.start();

// Check status
const status = manager.getStatus();
console.log(`Running: ${status.running}, URL: ${status.url}`);

// Stop
await manager.stop();
```

## Security

### Rate Limiting

The playground includes built-in rate limiting:
- **Default:** 60 requests per minute per IP
- **Configurable** via `TESSERACT_PLAYGROUND_RATE_LIMIT_MAX`
- **Automatic cleanup** of expired rate limit entries

### CORS

Cross-Origin Resource Sharing is configurable:
- **Default:** Allow all origins (`*`)
- **Production:** Specify allowed origins via `TESSERACT_PLAYGROUND_CORS`
- **Preflight:** Automatic handling of OPTIONS requests

### Authentication (Optional)

API key authentication can be enabled:
- Set `TESSERACT_PLAYGROUND_AUTH=true`
- Provide comma-separated keys: `TESSERACT_PLAYGROUND_API_KEYS=key1,key2`
- Include `Authorization: Bearer <key>` header in requests

## Testing

Run the test suite:

```bash
npx tsx --test src/api/tesseract-playground.test.ts
```

Tests cover:
- Server lifecycle (start/stop)
- API endpoints (health, grid state, pointer events)
- Rate limiting
- CORS handling
- Error scenarios
- Concurrent requests
- Batch operations

## Deployment

### Local Development

```bash
npm run start:playground
# or
npx tsx src/api/tesseract-playground.ts
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3456
CMD ["npx", "tsx", "src/api/tesseract-playground.ts"]
```

### Systemd Service

```ini
[Unit]
Description=Tesseract Playground
After=network.target

[Service]
Type=simple
User=intentguard
WorkingDirectory=/opt/intentguard
Environment="NODE_ENV=production"
Environment="TESSERACT_PLAYGROUND_PORT=3456"
ExecStart=/usr/bin/npx tsx src/api/tesseract-playground.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name tesseract.nu;

    location / {
        proxy_pass http://localhost:3456;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Integration Examples

### Fetch Grid State (JavaScript)

```javascript
const response = await fetch('https://tesseract.nu/api/grid/state');
const { cellPressures, timestamp } = await response.json();

console.log('Grid state at', timestamp);
console.log('Cell A1 pressure:', cellPressures.A1);
```

### Push Pointer Event (cURL)

```bash
curl -X POST https://tesseract.nu/api/grid/pointer \
  -H "Content-Type: application/json" \
  -d '{
    "cellId": "A1",
    "eventType": "deployment",
    "data": {
      "service": "auth-service",
      "version": "1.2.3"
    }
  }'
```

### Batch Push (Python)

```python
import requests

events = [
    {"cellId": "A1", "eventType": "test-pass", "data": {}},
    {"cellId": "B2", "eventType": "deploy", "data": {}},
    {"cellId": "C3", "eventType": "monitor", "data": {}},
]

response = requests.post(
    "https://tesseract.nu/api/grid/pointer/batch",
    json={"events": events}
)

results = response.json()["results"]
print(f"Processed {len(results)} events")
```

## Troubleshooting

### Server won't start

**Problem:** Port already in use

**Solution:**
```bash
# Check what's using the port
lsof -i :3456

# Change the port
export TESSERACT_PLAYGROUND_PORT=3457
```

### Rate limit errors

**Problem:** Too many requests from same IP

**Solution:**
```bash
# Increase rate limit
export TESSERACT_PLAYGROUND_RATE_LIMIT_MAX=120

# Or disable rate limiting (not recommended in production)
export TESSERACT_PLAYGROUND_RATE_LIMIT=false
```

### CORS errors in browser

**Problem:** Cross-origin requests blocked

**Solution:**
```bash
# Add your origin to allowed list
export TESSERACT_PLAYGROUND_CORS=http://localhost:3000,https://myapp.com
```

### Grid state always returns zeros

**Problem:** tesseract.nu backend API not available

**Solution:**
- Check `TESSERACT_API_URL` environment variable
- Verify tesseract.nu backend is deployed and accessible
- The playground will return default zero values as fallback

## Future Enhancements

- [ ] **WebSocket support** for real-time grid state updates
- [ ] **GraphQL API** for flexible querying
- [ ] **Historical data** — query past grid states
- [ ] **Metrics dashboard** — view grid pressure trends over time
- [ ] **Alerts** — configure notifications for pressure thresholds
- [ ] **Authentication** — OAuth2/JWT for secure access
- [ ] **Multi-tenant** — support multiple bot instances
- [ ] **Plugin system** — custom visualizations and integrations

## Related Files

- `src/api/tesseract-playground.ts` — Main playground server implementation
- `src/api/playground-integration.ts` — Bot runtime integration
- `src/api/tesseract-playground.test.ts` — Test suite
- `src/grid/tesseract-client.ts` — HTTP client for tesseract.nu API
- `src/grid/event-bridge.ts` — Local grid event management

## License

MIT — See LICENSE file for details
