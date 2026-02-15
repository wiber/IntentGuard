#!/bin/bash
# scripts/install-daemon.sh — Install IntentGuard as macOS daemon
#
# Creates a launchd plist so IntentGuard survives:
#   - Terminal close
#   - SSH disconnect
#   - System restart
#
# The Mac Mini becomes an always-on Sovereign Engine.
#
# USAGE:
#   ./scripts/install-daemon.sh          # Install and start
#   ./scripts/install-daemon.sh --stop   # Stop daemon
#   ./scripts/install-daemon.sh --remove # Uninstall

set -euo pipefail
cd "$(dirname "$0")/.."

LABEL="com.intentguard.runtime"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"
PROJECT_DIR="$(pwd)"
LOG_DIR="${PROJECT_DIR}/logs"
NODE_PATH="$(which node)"
TSX_PATH="$(which npx || echo '/usr/local/bin/npx')"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# ─── Stop ──────────────────────────────────────────────────────
if [ "${1:-}" = "--stop" ]; then
  echo -e "${YELLOW}Stopping IntentGuard daemon...${NC}"
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
  echo -e "${GREEN}Daemon stopped${NC}"
  exit 0
fi

# ─── Remove ────────────────────────────────────────────────────
if [ "${1:-}" = "--remove" ]; then
  echo -e "${YELLOW}Removing IntentGuard daemon...${NC}"
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
  rm -f "$PLIST_PATH"
  echo -e "${GREEN}Daemon removed${NC}"
  exit 0
fi

# ─── Install ───────────────────────────────────────────────────
echo -e "${GREEN}Installing IntentGuard as macOS daemon${NC}"
echo "================================================"
echo ""
echo "Project: ${PROJECT_DIR}"
echo "Node:    ${NODE_PATH}"
echo "Label:   ${LABEL}"
echo "Plist:   ${PLIST_PATH}"
echo ""

# Ensure log directory
mkdir -p "$LOG_DIR"

# Ensure LaunchAgents directory
mkdir -p "$HOME/Library/LaunchAgents"

# Source .env for environment variables
ENV_VARS=""
if [ -f "${PROJECT_DIR}/.env" ]; then
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    # Strip quotes from value
    value="${value%\"}"
    value="${value#\"}"
    if [ -n "$key" ] && [ -n "$value" ]; then
      ENV_VARS="${ENV_VARS}    <key>${key}</key><string>${value}</string>
"
    fi
  done < "${PROJECT_DIR}/.env"
fi

# Create plist
cat > "$PLIST_PATH" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${TSX_PATH}</string>
    <string>tsx</string>
    <string>src/runtime.ts</string>
  </array>

  <key>WorkingDirectory</key>
  <string>${PROJECT_DIR}</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:${HOME}/.nvm/versions/node/v24.13.1/bin</string>
    <key>HOME</key>
    <string>${HOME}</string>
    <key>OPENCLAW_GATEWAY_PORT</key>
    <string>18789</string>
${ENV_VARS}  </dict>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>

  <key>StandardOutPath</key>
  <string>${LOG_DIR}/daemon-stdout.log</string>

  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/daemon-stderr.log</string>

  <key>ThrottleInterval</key>
  <integer>10</integer>
</dict>
</plist>
PLISTEOF

echo -e "${GREEN}Plist created: ${PLIST_PATH}${NC}"

# Unload if already loaded
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# Load
launchctl load "$PLIST_PATH"

echo ""
echo -e "${GREEN}================================================"
echo "IntentGuard daemon installed and started"
echo "================================================"
echo ""
echo "Commands:"
echo "  launchctl list | grep intentguard   # Check status"
echo "  ./scripts/install-daemon.sh --stop  # Stop"
echo "  ./scripts/install-daemon.sh --remove # Uninstall"
echo "  tail -f logs/daemon-stdout.log      # Watch output"
echo "  tail -f logs/intentguard.log        # Watch runtime log"
echo -e "${NC}"
