#!/bin/bash
# scripts/bootstrap.sh — IntentGuard Bootstrap
#
# Phase 0: Verify prerequisites
# Phase 1: Install dependencies
# Phase 2: Validate config
# Phase 3: Start OpenClaw gateway via wrapper
# Phase 4: Start IntentGuard runtime
#
# USAGE:
#   ./scripts/bootstrap.sh              # Full bootstrap
#   ./scripts/bootstrap.sh --runtime    # Skip gateway, runtime only
#   ./scripts/bootstrap.sh --check      # Verify only, don't start

set -euo pipefail
cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🛡️  IntentGuard Bootstrap${NC}"
echo "========================================"
echo ""

# ─── Phase 0: Prerequisites ───────────────────────────────────
echo -e "${YELLOW}Phase 0: Checking prerequisites...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found${NC}"
  exit 1
fi
echo -e "  ✅ Node.js $(node -v)"

# npm packages
if [ ! -d "node_modules" ]; then
  echo -e "  📦 Installing dependencies..."
  npm install
fi
echo -e "  ✅ node_modules present"

# Discord.js
if [ ! -d "node_modules/discord.js" ]; then
  echo -e "  📦 Installing discord.js..."
  npm install discord.js
fi
echo -e "  ✅ discord.js installed"

# OpenClaw
if [ ! -d "node_modules/openclaw" ]; then
  echo -e "  📦 Installing openclaw..."
  npm install openclaw@latest
fi
OPENCLAW_VERSION=$(node -e "console.log(require('./node_modules/openclaw/package.json').version)" 2>/dev/null || echo "unknown")
echo -e "  ✅ openclaw@${OPENCLAW_VERSION}"

# Config
if [ ! -f "intentguard.json" ]; then
  echo -e "${RED}❌ intentguard.json not found${NC}"
  exit 1
fi
echo -e "  ✅ intentguard.json present"

# .env
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}  ⚠️  .env not found — creating template...${NC}"
  cat > .env << 'ENVEOF'
# IntentGuard Environment Variables
# Fill these in before starting the runtime

DISCORD_BOT_TOKEN=
DISCORD_APPLICATION_ID=
THETADRIVEN_GUILD_ID=
ELIAS_DISCORD_ID=
THETAKING_DISCORD_ID=

# Optional — uses Claude CLI OAuth if not set
ANTHROPIC_API_KEY=

# OpenClaw
OPENCLAW_GATEWAY_PORT=18789
ENVEOF
  echo -e "${YELLOW}  📝 Fill in .env with your credentials${NC}"
fi

echo ""

# ─── Phase 1: Validate TypeScript ─────────────────────────────
echo -e "${YELLOW}Phase 1: Validating TypeScript...${NC}"

# Quick import check
npx tsx --eval "
  import './src/types.ts';
  import './src/auth/geometric.ts';
  import './src/discord/authorized-handles.ts';
  import './src/discord/transparency-engine.ts';
  console.log('  ✅ All modules import successfully');
" 2>&1

echo ""

# ─── Phase 2: Directory structure ─────────────────────────────
echo -e "${YELLOW}Phase 2: Creating data directories...${NC}"
mkdir -p data/attention-corpus data/room-context data/audio-tmp logs
echo -e "  ✅ data/ directories ready"
echo ""

# ─── Phase 3: Summary ─────────────────────────────────────────
echo -e "${GREEN}========================================"
echo "IntentGuard Bootstrap Complete"
echo "========================================"
echo ""
echo "Files:"
echo "  src/runtime.ts          — Main orchestrator"
echo "  src/wrapper.ts          — OpenClaw gateway spawner"
echo "  src/auth/geometric.ts   — FIM permission engine"
echo "  src/skills/             — 4 ported skills"
echo "  src/discord/            — Channel manager, task store, transparency"
echo "  intentguard.json        — Configuration"
echo ""
echo "To start:"
echo "  1. Fill in .env with Discord credentials"
echo "  2. npx tsx src/wrapper.ts    # Start OpenClaw gateway"
echo "  3. npx tsx src/runtime.ts    # Start IntentGuard runtime"
echo ""
echo "Or for development (no Discord):"
echo "  npx tsx --eval \"import { IntentGuardRuntime } from './src/runtime.ts'\""
echo -e "${NC}"

if [ "${1:-}" = "--check" ]; then
  echo "Check mode — not starting services"
  exit 0
fi

if [ "${1:-}" = "--runtime" ]; then
  echo -e "${GREEN}Starting IntentGuard Runtime...${NC}"
  exec npx tsx src/runtime.ts
fi
