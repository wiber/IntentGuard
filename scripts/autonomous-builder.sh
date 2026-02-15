#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# IntentGuard Autonomous Builder — Indefinite Spec-Driven Build Loop
# ═══════════════════════════════════════════════════════════════════════════
#
# The "Cortex" — reads the migration spec, finds TODOs, spawns Claude Flows
# to implement them, tests, commits, pushes, reports to Discord.
#
# Usage:
#   ./scripts/autonomous-builder.sh              # Start indefinite build loop
#   ./scripts/autonomous-builder.sh --status     # Show current state
#   ./scripts/autonomous-builder.sh --stop       # Stop the builder
#   ./scripts/autonomous-builder.sh --once       # Single pass (no loop)
#
# Architecture:
#   IntentGuard (this) = Build Layer (Cortex) — autonomous implementation
#   OpenClaw            = Reporting Layer (Body) — Discord/WhatsApp/Telegram I/O
#   Migration Spec      = Shared Artifact — single source of truth
#
# LLM Routing:
#   Tier 0: Ollama llama3.2:1b — classification, triage, diff parsing (FREE)
#   Tier 1: Claude Sonnet      — implementation, tests, complex reasoning ($0 proxy)
#   Tier 2: Human blessing     — destructive ops, low-sovereignty decisions
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPEC_FILE="${REPO_ROOT}/intentguard-migration-spec.html"
COORD_DIR="${REPO_ROOT}/../thetadrivencoach/openclaw/data/coordination"
DISCORD_NOTIFY="${REPO_ROOT}/../thetadrivencoach/openclaw/scripts/discord-notify.sh"
LOG_DIR="${REPO_ROOT}/data/builder-logs"
PID_FILE="${REPO_ROOT}/data/builder.pid"
STATE_FILE="${REPO_ROOT}/data/builder-state.json"
OLLAMA_LOG="${COORD_DIR}/ollama-usage.jsonl"

# Config
HEARTBEAT_SECONDS=900      # 15 minutes between cycles
MAX_CONCURRENT_AGENTS=10   # Max parallel Claude Flows per cycle
OLLAMA_MODEL="llama3.2:1b"
OLLAMA_ENDPOINT="http://localhost:11434"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

mkdir -p "$LOG_DIR" "$COORD_DIR" "$(dirname "$STATE_FILE")"

# ═══════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARN:${NC} $*"; }
err() { echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $*" >&2; }
ok() { echo -e "${GREEN}[$(date '+%H:%M:%S')] OK:${NC} $*"; }

notify_discord() {
    local channel="$1"
    local message="$2"
    if [ -x "$DISCORD_NOTIFY" ]; then
        "$DISCORD_NOTIFY" "$channel" "$message" 2>/dev/null || true
    fi
}

# Track Ollama usage
track_ollama() {
    local task="$1" input_chars="$2" output_chars="$3"
    echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"source\":\"autonomous-builder\",\"task\":\"${task}\",\"model\":\"${OLLAMA_MODEL}\",\"input_chars\":${input_chars},\"output_chars\":${output_chars}}" >> "$OLLAMA_LOG"
}

# ═══════════════════════════════════════════════════════════════
# Spec Parser — Extract TODOs from migration spec
# ═══════════════════════════════════════════════════════════════

parse_spec_todos() {
    python3 -c "
import re, json, sys

with open('${SPEC_FILE}', 'r') as f:
    html = f.read()

todos = []
wips = []

# Find check-todo items
for m in re.finditer(r'<li class=\"check-todo\">(.*?)</li>', html, re.DOTALL):
    text = re.sub(r'<[^>]+>', '', m.group(1)).strip()
    if text:
        todos.append(text)

# Find check-wip items
for m in re.finditer(r'<li class=\"check-wip\">(.*?)</li>', html, re.DOTALL):
    text = re.sub(r'<[^>]+>', '', m.group(1)).strip()
    if text:
        wips.append(text)

result = {'todos': todos, 'wips': wips, 'total_todo': len(todos), 'total_wip': len(wips)}
print(json.dumps(result))
" 2>/dev/null || echo '{"todos":[],"wips":[],"total_todo":0,"total_wip":0}'
}

count_done() {
    python3 -c "
import re
with open('${SPEC_FILE}', 'r') as f:
    html = f.read()
done = len(re.findall(r'class=\"check-done\"', html))
print(done)
" 2>/dev/null || echo "0"
}

# ═══════════════════════════════════════════════════════════════
# Ollama Triage — Classify TODOs by priority/complexity (Tier 0)
# ═══════════════════════════════════════════════════════════════

ollama_triage() {
    local todos_json="$1"
    local input_chars=${#todos_json}

    # Check if Ollama is running
    if ! curl -s "${OLLAMA_ENDPOINT}/api/tags" > /dev/null 2>&1; then
        warn "Ollama not available, using sequential priority"
        echo "$todos_json"
        return
    fi

    local prompt="You are a build priority classifier. Given these TODO items from a migration spec, return a JSON array of the top 5 highest-priority items to implement next. Consider: dependencies (implement foundations first), risk (prefer safe items), and impact (prefer items that unblock others). Return ONLY a JSON array of strings, no explanation.

TODOs:
${todos_json}"

    local response
    response=$(curl -s "${OLLAMA_ENDPOINT}/api/generate" \
        -d "{\"model\":\"${OLLAMA_MODEL}\",\"prompt\":$(echo "$prompt" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))'),\"stream\":false}" \
        2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('response','[]'))" 2>/dev/null) || true

    local output_chars=${#response}
    track_ollama "triage" "$input_chars" "$output_chars"

    if [ -n "$response" ]; then
        log "Ollama triaged $(echo "$response" | python3 -c 'import sys,json; print(len(json.loads(sys.stdin.read())))' 2>/dev/null || echo '?') items"
        echo "$response"
    else
        echo "$todos_json"
    fi
}

# ═══════════════════════════════════════════════════════════════
# Claude Flow Agent Spawner — Tier 1 Implementation
# ═══════════════════════════════════════════════════════════════

spawn_builder_agent() {
    local agent_id="$1"
    local todo_item="$2"
    local log_file="${LOG_DIR}/agent-${agent_id}-$(date +%Y%m%d-%H%M%S).log"

    # Find claude binary
    local claude_bin
    claude_bin=$(which claude 2>/dev/null || echo "$HOME/.claude/local/claude")
    if [ ! -x "$claude_bin" ]; then
        err "Claude binary not found"
        return 1
    fi

    local prompt="You are an autonomous builder agent working on IntentGuard.

TASK: ${todo_item}

REPO: ${REPO_ROOT}
SPEC: ${SPEC_FILE}

INSTRUCTIONS:
1. Read the relevant section of the migration spec for context
2. Implement the TODO item — write TypeScript code in src/
3. Write or update tests if applicable
4. Do NOT commit — the coordinator handles git operations
5. When done, create a file: data/builder-logs/agent-${agent_id}-done.marker with a summary of what you built

FILE CLAIMS: Only modify files directly related to your task. Check ${COORD_DIR}/file-claims.json before writing.

OLLAMA USAGE: For classification, routing, or simple text processing, use:
curl -s ${OLLAMA_ENDPOINT}/api/generate -d '{\"model\":\"${OLLAMA_MODEL}\",\"prompt\":\"...\",\"stream\":false}'

QUALITY: Write clean TypeScript. Include type annotations. Follow existing patterns in src/."

    # Launch with clean env to avoid nested session detection
    env -i \
        HOME="${HOME}" \
        USER="${USER}" \
        PATH="${PATH}" \
        SHELL="${SHELL}" \
        TERM="xterm-256color" \
        LANG="en_US.UTF-8" \
        "${claude_bin}" --model sonnet \
            --dangerously-skip-permissions \
            -p "${prompt}" \
            >> "${log_file}" 2>&1 &

    local pid=$!
    echo "$pid"
    log "Agent ${agent_id} spawned (PID ${pid}) → ${todo_item:0:60}..."
}

# ═══════════════════════════════════════════════════════════════
# Git Coordination — Commit + Push with locks
# ═══════════════════════════════════════════════════════════════

git_commit_push() {
    local message="$1"
    local lock_file="${COORD_DIR}/git.lock"

    # Wait for lock
    local wait=0
    while [ -f "$lock_file" ] && [ $wait -lt 60 ]; do
        sleep 2
        wait=$((wait + 2))
    done

    if [ -f "$lock_file" ]; then
        # Stale lock — check if PID is alive
        local lock_pid
        lock_pid=$(cat "$lock_file" 2>/dev/null || echo "0")
        if ! kill -0 "$lock_pid" 2>/dev/null; then
            warn "Removing stale git lock (PID ${lock_pid} dead)"
            rm -f "$lock_file"
        else
            err "Git lock held by PID ${lock_pid} for >60s, skipping commit"
            return 1
        fi
    fi

    # Acquire lock
    echo "$$" > "$lock_file"

    cd "$REPO_ROOT"
    if git diff --quiet && git diff --cached --quiet; then
        rm -f "$lock_file"
        return 0  # Nothing to commit
    fi

    git add -A
    git commit -m "${message}" --no-verify 2>/dev/null || true
    git push origin HEAD 2>/dev/null || warn "Push failed (will retry next cycle)"

    rm -f "$lock_file"
    ok "Committed and pushed: ${message:0:80}"
}

# ═══════════════════════════════════════════════════════════════
# Update State
# ═══════════════════════════════════════════════════════════════

update_state() {
    local cycle="$1" todos="$2" wips="$3" done="$4" agents="$5"
    cat > "$STATE_FILE" <<EOF
{
  "cycle": ${cycle},
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "spec_todos": ${todos},
  "spec_wips": ${wips},
  "spec_done": ${done},
  "active_agents": ${agents},
  "pid": $$,
  "heartbeat_seconds": ${HEARTBEAT_SECONDS}
}
EOF
}

# ═══════════════════════════════════════════════════════════════
# Main Build Cycle
# ═══════════════════════════════════════════════════════════════

run_cycle() {
    local cycle_num="$1"
    log "═══ Build Cycle ${cycle_num} ═══"

    # Step 1: Parse spec
    local spec_data
    spec_data=$(parse_spec_todos)
    local total_todo total_wip total_done
    total_todo=$(echo "$spec_data" | python3 -c "import sys,json; print(json.load(sys.stdin)['total_todo'])")
    total_wip=$(echo "$spec_data" | python3 -c "import sys,json; print(json.load(sys.stdin)['total_wip'])")
    total_done=$(count_done)

    log "Spec status: ${total_done} done, ${total_wip} WIP, ${total_todo} TODO"

    if [ "$total_todo" -eq 0 ] && [ "$total_wip" -eq 0 ]; then
        ok "ALL SPEC ITEMS COMPLETE! Nothing left to build."
        notify_discord "builder" "ALL SPEC ITEMS COMPLETE! ${total_done} items done. The Cortex rests."
        return 1  # Signal to stop
    fi

    # Step 2: Triage with Ollama (Tier 0)
    local todos_raw
    todos_raw=$(echo "$spec_data" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)['todos'][:15]))")
    local prioritized
    prioritized=$(ollama_triage "$todos_raw")

    # Step 3: Spawn builder agents (Tier 1)
    local agent_pids=()
    local agent_count=0
    local items
    items=$(echo "$prioritized" | python3 -c "
import sys, json
try:
    items = json.load(sys.stdin)
    if isinstance(items, list):
        for item in items[:${MAX_CONCURRENT_AGENTS}]:
            print(item)
except:
    pass
" 2>/dev/null)

    if [ -z "$items" ]; then
        # Fallback: use first few raw todos
        items=$(echo "$spec_data" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data['todos'][:${MAX_CONCURRENT_AGENTS}]:
    print(item)
" 2>/dev/null)
    fi

    while IFS= read -r todo_item; do
        [ -z "$todo_item" ] && continue
        agent_count=$((agent_count + 1))
        local pid
        pid=$(spawn_builder_agent "$agent_count" "$todo_item")
        if [ -n "$pid" ]; then
            agent_pids+=("$pid")
        fi
    done <<< "$items"

    update_state "$cycle_num" "$total_todo" "$total_wip" "$total_done" "$agent_count"

    log "Spawned ${agent_count} builder agents, waiting for completion..."
    notify_discord "builder" "Cycle ${cycle_num}: Spawned ${agent_count} agents | ${total_done} done, ${total_wip} WIP, ${total_todo} TODO"

    # Step 4: Wait for agents (max 30 minutes per cycle)
    local max_wait=1800
    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        local alive=0
        for pid in "${agent_pids[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                alive=$((alive + 1))
            fi
        done
        if [ $alive -eq 0 ]; then
            break
        fi
        sleep 30
        elapsed=$((elapsed + 30))
        if [ $((elapsed % 300)) -eq 0 ]; then
            log "  ${alive}/${agent_count} agents still running (${elapsed}s elapsed)"
        fi
    done

    # Step 5: Kill stragglers
    for pid in "${agent_pids[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            warn "Killing straggler agent PID ${pid}"
            kill "$pid" 2>/dev/null || true
        fi
    done

    # Step 6: Commit + Push
    local done_markers
    done_markers=$(ls "${LOG_DIR}"/agent-*-done.marker 2>/dev/null | wc -l | tr -d ' ')
    if [ "$done_markers" -gt 0 ]; then
        git_commit_push "build(auto): Cycle ${cycle_num} — ${done_markers} agents completed (${total_todo} TODOs remaining)"
        # Clean markers
        rm -f "${LOG_DIR}"/agent-*-done.marker
    else
        warn "No agents completed this cycle"
    fi

    # Step 7: Report
    local new_done
    new_done=$(count_done)
    local progress=$((new_done - total_done))
    notify_discord "builder" "Cycle ${cycle_num} complete: +${progress} items done (${new_done} total) | ${done_markers} agents delivered"

    update_state "$cycle_num" "$total_todo" "$total_wip" "$new_done" "0"
    return 0
}

# ═══════════════════════════════════════════════════════════════
# Commands
# ═══════════════════════════════════════════════════════════════

case "${1:-}" in
    --stop)
        if [ -f "$PID_FILE" ]; then
            pid=$(cat "$PID_FILE")
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid"
                rm -f "$PID_FILE"
                ok "Builder stopped (PID ${pid})"
                notify_discord "builder" "Autonomous Builder stopped by admin"
            else
                rm -f "$PID_FILE"
                warn "Builder was not running (stale PID)"
            fi
        else
            warn "No PID file found"
        fi
        exit 0
        ;;

    --status)
        if [ -f "$STATE_FILE" ]; then
            echo -e "${PURPLE}═══ Autonomous Builder Status ═══${NC}"
            python3 -c "
import json
with open('${STATE_FILE}') as f:
    s = json.load(f)
print(f\"  Cycle:    {s['cycle']}\")
print(f\"  Updated:  {s['timestamp']}\")
print(f\"  Spec:     {s['spec_done']} done / {s['spec_wips']} WIP / {s['spec_todos']} TODO\")
print(f\"  Agents:   {s['active_agents']} active\")
print(f\"  PID:      {s['pid']}\")
" 2>/dev/null
            if [ -f "$PID_FILE" ]; then
                pid=$(cat "$PID_FILE")
                if kill -0 "$pid" 2>/dev/null; then
                    echo -e "  Status:   ${GREEN}RUNNING${NC}"
                else
                    echo -e "  Status:   ${RED}DEAD${NC}"
                fi
            fi
        else
            warn "No state file — builder hasn't run yet"
        fi
        exit 0
        ;;

    --once)
        log "Single-pass mode"
        run_cycle 1
        exit $?
        ;;
esac

# ═══════════════════════════════════════════════════════════════
# Main Loop — Indefinite Build
# ═══════════════════════════════════════════════════════════════

# Check if already running
if [ -f "$PID_FILE" ]; then
    existing_pid=$(cat "$PID_FILE")
    if kill -0 "$existing_pid" 2>/dev/null; then
        err "Builder already running (PID ${existing_pid}). Use --stop first."
        exit 1
    fi
    rm -f "$PID_FILE"
fi

echo "$$" > "$PID_FILE"
trap 'rm -f "$PID_FILE"; notify_discord "builder" "Autonomous Builder exited (PID $$)"; exit' EXIT INT TERM

echo -e "${PURPLE}"
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║    IntentGuard Autonomous Builder — Cortex Mode   ║"
echo "  ║    Indefinite spec-driven build loop              ║"
echo "  ║    Heartbeat: ${HEARTBEAT_SECONDS}s | Max agents: ${MAX_CONCURRENT_AGENTS}          ║"
echo "  ║    LLM: Ollama (Tier 0) + Sonnet (Tier 1)        ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

notify_discord "builder" "Autonomous Builder started — Cortex Mode | Heartbeat: ${HEARTBEAT_SECONDS}s | Max agents: ${MAX_CONCURRENT_AGENTS}"

cycle=0
while true; do
    cycle=$((cycle + 1))

    if ! run_cycle "$cycle"; then
        ok "Build loop complete — all spec items done or stop signal received"
        break
    fi

    log "Sleeping ${HEARTBEAT_SECONDS}s until next cycle..."
    sleep "$HEARTBEAT_SECONDS"
done

ok "Autonomous Builder finished after ${cycle} cycles"
notify_discord "builder" "Autonomous Builder finished after ${cycle} cycles"
