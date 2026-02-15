# Cross-Channel Dependencies

Optional dependencies for WhatsApp and Telegram adapters.

## Installation

### Option 1: Install Both Adapters

```bash
npm install whatsapp-web.js node-telegram-bot-api
# or
pnpm add whatsapp-web.js node-telegram-bot-api
# or
yarn add whatsapp-web.js node-telegram-bot-api
```

### Option 2: Install Only What You Need

**WhatsApp only**:
```bash
npm install whatsapp-web.js
```

**Telegram only**:
```bash
npm install node-telegram-bot-api
```

## Type Definitions

Add TypeScript types (optional):

```bash
npm install -D @types/node-telegram-bot-api
```

Note: `whatsapp-web.js` includes its own TypeScript definitions.

## Package.json

Add to `package.json` as **optional dependencies**:

```json
{
  "dependencies": {
    "discord.js": "^14.14.1",
    "dotenv": "^16.4.5"
  },
  "optionalDependencies": {
    "whatsapp-web.js": "^1.25.0",
    "node-telegram-bot-api": "^0.66.0"
  },
  "devDependencies": {
    "@types/node-telegram-bot-api": "^0.64.7"
  }
}
```

Why `optionalDependencies`? Bot starts successfully even if they're not installed. Adapters run in "stub mode" with status: `disconnected`.

## Version Compatibility

| Package | Tested Version | Min Node.js | Notes |
|---------|---------------|-------------|-------|
| whatsapp-web.js | 1.25.0 | 18.0.0 | Requires Puppeteer (auto-installed) |
| node-telegram-bot-api | 0.66.0 | 16.0.0 | Long polling mode |
| discord.js | 14.14.1 | 16.11.0 | Already installed |

## Additional Dependencies (Auto-Installed)

When you install the adapters, these are pulled in automatically:

### whatsapp-web.js dependencies:
- `puppeteer` — Headless Chrome for WhatsApp Web
- `qrcode-terminal` — QR code display (optional)

### node-telegram-bot-api dependencies:
- `node-fetch` — HTTP client
- `file-type` — File detection

## Minimal Setup (No Install)

Bot runs without any adapter packages:

```typescript
// Adapters fail gracefully
const whatsapp = new WhatsAppAdapter(log);
await whatsapp.initialize(); // Logs: "running in stub mode"
console.log(whatsapp.status); // "disconnected"
```

No crashes, just logs a warning.

## Development Setup

For development/testing:

```bash
# Install all dependencies
npm install

# Install optional adapters
npm install whatsapp-web.js node-telegram-bot-api

# Install test runner
npm install -D tsx

# Run tests
npx tsx src/channels/test-adapters.ts
```

## Production Setup

### Dockerfile Example

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production deps
RUN npm ci --only=production

# Optionally install adapters
RUN npm install whatsapp-web.js node-telegram-bot-api

# Copy source
COPY . .

CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  intentguard:
    build: .
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
      - ./.wwebjs_auth:/app/.wwebjs_auth  # WhatsApp session
    restart: unless-stopped
```

## Troubleshooting

### Puppeteer Install Issues (WhatsApp)

If Puppeteer fails to download Chrome:

```bash
# Option 1: Use system Chrome
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install whatsapp-web.js

# Option 2: Manual Chromium install
npx puppeteer browsers install chrome
```

### ARM64/M1 Mac Issues

```bash
# Install with legacy peer deps
npm install --legacy-peer-deps whatsapp-web.js
```

### Alpine Linux (Docker)

```dockerfile
# Install Chromium dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## Verification

Check if packages are installed:

```bash
npm list whatsapp-web.js
npm list node-telegram-bot-api
```

Test imports:

```typescript
// test-imports.ts
import('whatsapp-web.js')
  .then(() => console.log('✓ whatsapp-web.js installed'))
  .catch(() => console.log('✗ whatsapp-web.js not installed'));

import('node-telegram-bot-api')
  .then(() => console.log('✓ node-telegram-bot-api installed'))
  .catch(() => console.log('✗ node-telegram-bot-api not installed'));
```

Run: `npx tsx test-imports.ts`

## Environment Variables

Create `.env`:

```bash
# Discord (required)
DISCORD_TOKEN=your_discord_token
DISCORD_GUILD_ID=your_guild_id

# Telegram (optional, only if using Telegram adapter)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# WhatsApp (no token needed, uses QR code auth)
```

## Uninstallation

Remove adapters:

```bash
npm uninstall whatsapp-web.js node-telegram-bot-api
```

Clean up WhatsApp session:

```bash
rm -rf .wwebjs_auth/
```

Bot continues to work without adapters (Discord only).

## Summary

- **Required**: discord.js
- **Optional**: whatsapp-web.js, node-telegram-bot-api
- **Graceful**: Bot works without optional deps
- **Minimal**: No adapters = Discord only
- **Full**: All adapters = Multi-platform routing

Install only what you need!
