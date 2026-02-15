#!/bin/bash
# scripts/generate-swarm-scripts.sh — Generate swarm-launch-N.sh scripts
#
# Creates 50 swarm launch scripts in the coordination directory.
# Each script launches a Claude instance with proper isolation and coordination.

set -euo pipefail

COORDINATION_DIR="${1:-../thetadrivencoach/openclaw/data/coordination}"
POOL_SIZE="${2:-50}"

echo "🔨 Generating $POOL_SIZE swarm launch scripts in $COORDINATION_DIR"

# Create coordination directory if it doesn't exist
mkdir -p "$COORDINATION_DIR"

# Generate launch scripts
for i in $(seq 1 "$POOL_SIZE"); do
  SCRIPT_PATH="$COORDINATION_DIR/swarm-launch-$i.sh"

  cat > "$SCRIPT_PATH" <<'EOF'
#!/bin/bash
# Auto-generated swarm launch script for agent ${AGENT_ID}
# DO NOT EDIT MANUALLY - regenerate with scripts/generate-swarm-scripts.sh

set -euo pipefail

AGENT_ID="${AGENT_ID}"
COORDINATION_DIR="$(dirname "$0")"
REPO_ROOT="${REPO_ROOT:-$(pwd)}"
PROMPT_FILE="$COORDINATION_DIR/swarm-prompt-$AGENT_ID.txt"
OUTPUT_FILE="$COORDINATION_DIR/swarm-output-$AGENT_ID.log"
MARKER_FILE="data/builder-logs/agent-$AGENT_ID-done.marker"

# Check if prompt file exists
if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "❌ Prompt file not found: $PROMPT_FILE"
  exit 1
fi

# Read prompt
PROMPT=$(cat "$PROMPT_FILE")

# Log start
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | agent-$AGENT_ID | Starting task" >> "$COORDINATION_DIR/swarm-memory.jsonl"

# Launch Claude with isolation
cd "$REPO_ROOT"

# Environment isolation to prevent recursive spawning
export CLAUDE_FLOW_WORKER=1
export CLAUDE_FLOW_NO_SPAWN=1
export MCP_DISABLE_CLAUDE_FLOW=1
unset CLAUDECODE
unset CLAUDE_DEV

# Execute Claude
claude -p "$PROMPT" \
  --model claude-sonnet-4-5-20250929 \
  --max-turns 25 \
  --dangerously-skip-permissions \
  > "$OUTPUT_FILE" 2>&1

EXIT_CODE=$?

# Log completion
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | agent-$AGENT_ID | Task completed" >> "$COORDINATION_DIR/swarm-memory.jsonl"

  # Write success marker
  cat > "$MARKER_FILE" <<MARKER
Agent $AGENT_ID completed successfully
Exit code: $EXIT_CODE
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Output: $OUTPUT_FILE
MARKER
else
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | agent-$AGENT_ID | Task failed (exit $EXIT_CODE)" >> "$COORDINATION_DIR/swarm-memory.jsonl"

  # Write failure marker
  cat > "$MARKER_FILE" <<MARKER
Agent $AGENT_ID failed
Exit code: $EXIT_CODE
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Output: $OUTPUT_FILE
MARKER
fi

exit $EXIT_CODE
EOF

  # Substitute agent ID
  sed -i '' "s/\${AGENT_ID}/$i/g" "$SCRIPT_PATH"

  # Make executable
  chmod +x "$SCRIPT_PATH"

  echo "  ✅ Created swarm-launch-$i.sh"
done

echo "🎉 Generated $POOL_SIZE swarm launch scripts"
echo ""
echo "Usage:"
echo "  1. Pool manager writes prompt to: swarm-prompt-N.txt"
echo "  2. Pool manager executes: swarm-launch-N.sh"
echo "  3. Agent writes completion marker: data/builder-logs/agent-N-done.marker"
echo "  4. Agent logs to: swarm-memory.jsonl"
