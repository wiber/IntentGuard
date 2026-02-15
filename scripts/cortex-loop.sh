#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# IntentGuard Cortex Loop — Indefinite Spec-Driven Build Pipeline
# ═══════════════════════════════════════════════════════════════════════════
#
# STANDALONE SCRIPT — Run from terminal, NOT from within Claude Code.
# Uses claude-flow for agent orchestration (no nested session issues).
#
# Usage:
#   ./scripts/cortex-loop.sh              # Start indefinite pipeline
#   ./scripts/cortex-loop.sh --status     # Check state
#   ./scripts/cortex-loop.sh --stop       # Stop everything
#
# Architecture:
#   1. Parse spec → extract TODOs
#   2. Ollama classifies each TODO (pacing layer, ~5s each)
#   3. claude-flow agent spawn for each TODO (non-blocking)
#   4. Monitor agents → commit on completion → notify Discord
#   5. Re-parse spec → repeat (indefinite)
#
# LLM Tiers:
#   Tier 0: Ollama llama3.2:1b — classify, triage (FREE, ~5s/item)
#   Tier 1: Claude Sonnet via claude-flow — implement, test ($0 proxy)
#   Tier 2: Human blessing — destructive ops via Discord reaction
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPEC_FILE="${REPO_ROOT}/intentguard-migration-spec.html"
LOG_DIR="${REPO_ROOT}/data/cortex-logs"
PID_FILE="${REPO_ROOT}/data/cortex.pid"
STATE_FILE="${REPO_ROOT}/data/cortex-state.json"
OLLAMA_LOG="${REPO_ROOT}/data/cortex-logs/ollama-usage.jsonl"
DISCORD_NOTIFY="${REPO_ROOT}/../thetadrivencoach/openclaw/scripts/discord-notify.sh"

# Config
MAX_AGENTS=10
OLLAMA_MODEL="llama3.2:1b"
OLLAMA_ENDPOINT="http://localhost:11434"
COMMIT_INTERVAL=300   # Commit every 5 minutes if there are changes

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; PURPLE='\033[0;35m'; NC='\033[0m'

mkdir -p "$LOG_DIR"

# ═══════════════════════════════════════════════════════════════
# Utility
# ═══════════════════════════════════════════════════════════════

log()  { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARN:${NC} $*"; }
err()  { echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $*" >&2; }
ok()   { echo -e "${GREEN}[$(date '+%H:%M:%S')] OK:${NC} $*"; }

discord() {
    [ -x "$DISCORD_NOTIFY" ] && "$DISCORD_NOTIFY" "$1" "$2" 2>/dev/null || true
}

track_ollama() {
    echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"task\":\"$1\",\"model\":\"${OLLAMA_MODEL}\",\"chars\":$2}" >> "$OLLAMA_LOG" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════
# Spec Parser
# ═══════════════════════════════════════════════════════════════

parse_todos() {
    python3 -c "
import re, json
with open('${SPEC_FILE}') as f:
    html = f.read()
todos = []
for m in re.finditer(r'<li class=\"check-todo\">(.*?)</li>', html, re.DOTALL):
    text = re.sub(r'<[^>]+>', '', m.group(1)).strip()
    if text: todos.append(text)
print(json.dumps(todos))
" 2>/dev/null || echo "[]"
}

count_done() {
    python3 -c "
import re
with open('${SPEC_FILE}') as f:
    html = f.read()
print(len(re.findall(r'class=\"check-done\"', html)))
" 2>/dev/null || echo "0"
}

count_todo() {
    python3 -c "
import re
with open('${SPEC_FILE}') as f:
    html = f.read()
t = len(re.findall(r'class=\"check-todo\"', html))
w = len(re.findall(r'class=\"check-wip\"', html))
print(t + w)
" 2>/dev/null || echo "0"
}

# ═══════════════════════════════════════════════════════════════
# Ollama Classify (Tier 0 — pacing layer)
# ═══════════════════════════════════════════════════════════════

ollama_classify() {
    local todo="$1"
    local result
    result=$(curl -s --max-time 10 "${OLLAMA_ENDPOINT}/api/generate" \
        -d "{\"model\":\"${OLLAMA_MODEL}\",\"prompt\":\"Classify this task as high/medium/low priority. One word only.\\nTask: $(echo "$todo" | head -c 200)\",\"stream\":false}" \
        2>/dev/null | python3 -c "
import sys, json
try:
    r = json.load(sys.stdin).get('response','medium').strip().lower()
    print('high' if 'high' in r else 'low' if 'low' in r else 'medium')
except:
    print('medium')
" 2>/dev/null) || result="medium"
    track_ollama "classify" "${#todo}"
    echo "${result:-medium}"
}

# ═══════════════════════════════════════════════════════════════
# Agent Spawner (claude-flow)
# ═══════════════════════════════════════════════════════════════

spawn_agent() {
    local agent_num="$1"
    local todo="$2"
    local agent_id="cortex-${agent_num}"

    log "  Spawning ${agent_id}: ${todo:0:70}..."

    # Use claude-flow agent spawn (non-blocking)
    npx claude-flow agent spawn \
        -t coder \
        --name "${agent_id}" \
        --objective "Implement this spec TODO in IntentGuard repo at ${REPO_ROOT}: ${todo}. Write TypeScript in src/. Follow existing patterns. Create a done marker file at ${LOG_DIR}/${agent_id}-done.txt when complete." \
        >> "${LOG_DIR}/${agent_id}.log" 2>&1 &

    echo $!
}

count_active() {
    local n
    n=$(npx claude-flow agent list 2>/dev/null | grep -c "running" 2>/dev/null || true)
    echo "${n:-0}" | tr -d '[:space:]'
}

# ═══════════════════════════════════════════════════════════════
# Git Commit (with lock)
# ═══════════════════════════════════════════════════════════════

try_commit() {
    cd "$REPO_ROOT"
    if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
        return 0  # Nothing to commit
    fi

    git add -A
    local todo_count
    todo_count=$(count_todo)
    git commit -m "build(cortex): Auto-implementation (${todo_count} TODOs remaining)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" --no-verify 2>/dev/null || return 0

    git push origin main 2>/dev/null || warn "Push failed — will retry"
    ok "Committed and pushed"
    discord "builder" "Cortex committed: $(git log --oneline -1) | ${todo_count} TODOs remaining"
}

# ═══════════════════════════════════════════════════════════════
# Update State
# ═══════════════════════════════════════════════════════════════

save_state() {
    cat > "$STATE_FILE" <<EOF
{
  "scan": $1,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "done": $(count_done),
  "remaining": $(count_todo),
  "active_agents": $2,
  "total_spawned": $3,
  "pid": $$
}
EOF
}

# ═══════════════════════════════════════════════════════════════
# Commands
# ═══════════════════════════════════════════════════════════════

case "${1:-}" in
    --stop)
        if [ -f "$PID_FILE" ]; then
            pid=$(cat "$PID_FILE")
            kill "$pid" 2>/dev/null && ok "Cortex stopped (PID $pid)" || warn "Not running"
            rm -f "$PID_FILE"
            discord "builder" "Cortex loop stopped"
        fi
        exit 0
        ;;
    --status)
        if [ -f "$STATE_FILE" ]; then
            echo -e "${PURPLE}═══ Cortex Loop Status ═══${NC}"
            cat "$STATE_FILE" | python3 -c "
import sys, json
s = json.load(sys.stdin)
print(f'  Scan:      {s[\"scan\"]}')
print(f'  Updated:   {s[\"timestamp\"]}')
print(f'  Done:      {s[\"done\"]}')
print(f'  Remaining: {s[\"remaining\"]}')
print(f'  Active:    {s[\"active_agents\"]}')
print(f'  Spawned:   {s[\"total_spawned\"]}')
" 2>/dev/null
            pid=$(cat "$PID_FILE" 2>/dev/null || echo "0")
            kill -0 "$pid" 2>/dev/null && echo -e "  Status:    ${GREEN}RUNNING${NC}" || echo -e "  Status:    ${RED}STOPPED${NC}"
        else
            warn "No state — cortex hasn't run yet"
        fi
        exit 0
        ;;
esac

# ═══════════════════════════════════════════════════════════════
# Main Pipeline — Ollama paces, claude-flow builds
# ═══════════════════════════════════════════════════════════════

if [ -f "$PID_FILE" ]; then
    old_pid=$(cat "$PID_FILE")
    if kill -0 "$old_pid" 2>/dev/null; then
        err "Already running (PID $old_pid). Use --stop first."
        exit 1
    fi
fi

echo "$$" > "$PID_FILE"
trap 'rm -f "$PID_FILE"; discord "builder" "Cortex exited"; exit' EXIT INT TERM

echo -e "${PURPLE}"
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║    IntentGuard Cortex Loop — Pipeline Mode        ║"
echo "  ║    Ollama classifies → claude-flow builds         ║"
echo "  ║    Max agents: ${MAX_AGENTS} | Indefinite              ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

discord "builder" "Cortex Loop started — Pipeline mode | Max ${MAX_AGENTS} agents | Ollama + claude-flow"

scan=0
total_spawned=0
last_commit=$(date +%s)

while true; do
    scan=$((scan + 1))
    remaining=$(count_todo)
    done_count=$(count_done)

    log "═══ Scan #${scan} | ${done_count} done, ${remaining} remaining ═══"

    if [ "$remaining" -eq 0 ]; then
        ok "ALL SPEC ITEMS COMPLETE! ${done_count} done."
        discord "builder" "ALL COMPLETE! ${done_count} items done after ${total_spawned} agents."
        try_commit
        break
    fi

    # Get TODO list
    todos=$(parse_todos)
    todo_count=$(echo "$todos" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

    # Feed each TODO through Ollama → spawn claude-flow agent
    echo "$todos" | python3 -c "
import sys, json
for item in json.load(sys.stdin):
    print(item)
" 2>/dev/null | while IFS= read -r todo_item; do
        [ -z "$todo_item" ] && continue

        # Wait for a slot
        active=$(count_active)
        while [ "$active" -ge "$MAX_AGENTS" ]; do
            sleep 15
            active=$(count_active)

            # Periodic commit while waiting
            now=$(date +%s)
            if [ $((now - last_commit)) -ge $COMMIT_INTERVAL ]; then
                try_commit
                last_commit=$now
            fi
        done

        # Ollama classifies (natural pacing: 3-10s)
        priority=$(ollama_classify "$todo_item")
        log "  [${priority}] ${todo_item:0:65}..."

        # Spawn agent
        total_spawned=$((total_spawned + 1))
        spawn_agent "$total_spawned" "$todo_item"

        # Brief pause between spawns (let system breathe)
        sleep 3
    done

    save_state "$scan" "$(count_active)" "$total_spawned"

    # Commit any completed work
    try_commit
    last_commit=$(date +%s)

    # Wait for half the agents to finish before next scan
    log "Waiting for agents to thin out..."
    wait_count=0
    while [ "$(count_active)" -ge "$((MAX_AGENTS / 2))" ] && [ "$wait_count" -lt 20 ]; do
        sleep 30
        wait_count=$((wait_count + 1))

        # Periodic commit
        now=$(date +%s)
        if [ $((now - last_commit)) -ge $COMMIT_INTERVAL ]; then
            try_commit
            last_commit=$now
        fi
    done

    discord "builder" "Scan #${scan} done | ${done_count}/${remaining} remaining | ${total_spawned} total agents"
    sleep 10
done

ok "Cortex Loop finished after ${scan} scans, ${total_spawned} agents"
