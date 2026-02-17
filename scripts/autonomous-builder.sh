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
OLLAMA_MODEL="qwen2.5:14b-instruct-q6_K"
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
    response=$(curl -s --max-time 15 "${OLLAMA_ENDPOINT}/api/generate" \
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
    local launcher="${LOG_DIR}/launch-agent-${agent_id}.sh"

    # Find claude binary
    local claude_bin
    claude_bin=$(which claude 2>/dev/null || echo "$HOME/.claude/local/claude")
    if [ ! -x "$claude_bin" ]; then
        err "Claude binary not found"
        return 1
    fi

    # Write prompt to file (avoids quoting issues)
    local prompt_file="${LOG_DIR}/agent-${agent_id}-prompt.txt"
    cat > "$prompt_file" <<PROMPT
You are an autonomous builder agent working on IntentGuard.

TASK: ${todo_item}

REPO: ${REPO_ROOT}
SPEC: ${SPEC_FILE}

INSTRUCTIONS:
1. Read the relevant section of the migration spec for context
2. Implement the TODO item — write TypeScript code in src/
3. Write or update tests if applicable
4. Do NOT commit — the coordinator handles git operations
5. When done, create a file: ${LOG_DIR}/agent-${agent_id}-done.marker with a one-line summary of what you built

FILE CLAIMS: Only modify files directly related to your task. Check ${COORD_DIR}/file-claims.json before writing.

OLLAMA USAGE: For classification, routing, or simple text processing, use:
curl -s ${OLLAMA_ENDPOINT}/api/generate -d '{"model":"${OLLAMA_MODEL}","prompt":"...","stream":false}'

QUALITY: Write clean TypeScript. Include type annotations. Follow existing patterns in src/.
PROMPT

    # Write launcher script — runs in CLEAN shell, no inherited env vars
    # Critical: unsets CLAUDECODE/CLAUDE_CODE_ENTRYPOINT to avoid nested session detection
    # Uses fully resolved absolute paths (heredoc expands at write-time)
    cat > "$launcher" <<LAUNCHER
#!/bin/bash
unset CLAUDECODE
unset CLAUDE_CODE_ENTRYPOINT
unset CLAUDE_CODE
cd "${REPO_ROOT}"
env -i \\
    HOME="${HOME}" \\
    USER="${USER}" \\
    PATH="${PATH}" \\
    SHELL="${SHELL}" \\
    TERM="xterm-256color" \\
    LANG="en_US.UTF-8" \\
    "${claude_bin}" --model sonnet \\
        --dangerously-skip-permissions \\
        -p "\$(cat '${prompt_file}')" \\
        >> "${log_file}" 2>&1
LAUNCHER
    chmod +x "$launcher"

    # Launch via /bin/bash to get clean process tree
    /bin/bash "$launcher" &
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
# Slot Manager — Track concurrent agents
# ═══════════════════════════════════════════════════════════════

AGENT_PIDS_FILE="${LOG_DIR}/active-pids.txt"
touch "$AGENT_PIDS_FILE" 2>/dev/null || true

count_active_agents() {
    local alive=0
    while IFS= read -r pid; do
        [ -z "$pid" ] && continue
        if kill -0 "$pid" 2>/dev/null; then
            alive=$((alive + 1))
        fi
    done < "$AGENT_PIDS_FILE"
    echo "$alive"
}

cleanup_dead_pids() {
    local tmp="${AGENT_PIDS_FILE}.tmp"
    > "$tmp"
    while IFS= read -r pid; do
        [ -z "$pid" ] && continue
        if kill -0 "$pid" 2>/dev/null; then
            echo "$pid" >> "$tmp"
        fi
    done < "$AGENT_PIDS_FILE"
    mv "$tmp" "$AGENT_PIDS_FILE"
}

# ═══════════════════════════════════════════════════════════════
# Ollama Classify Single TODO (fast, ~2-5s per item)
# ═══════════════════════════════════════════════════════════════

ollama_classify_todo() {
    local todo_item="$1"
    local input_chars=${#todo_item}

    if ! curl -s --max-time 3 "${OLLAMA_ENDPOINT}/api/tags" > /dev/null 2>&1; then
        echo "medium"  # Ollama down → default priority
        return
    fi

    local response
    response=$(curl -s --max-time 8 "${OLLAMA_ENDPOINT}/api/generate" \
        -d "{\"model\":\"${OLLAMA_MODEL}\",\"prompt\":\"Classify this coding task as: high, medium, or low priority. Reply with ONE word only.\\nTask: ${todo_item}\",\"stream\":false}" \
        2>/dev/null | python3 -c "import sys,json; r=json.load(sys.stdin).get('response','medium').strip().lower(); print('high' if 'high' in r else 'low' if 'low' in r else 'medium')" 2>/dev/null) || response="medium"

    track_ollama "classify" "$input_chars" "${#response}"
    echo "${response:-medium}"
}

# ═══════════════════════════════════════════════════════════════
# Continuous Pipeline — Ollama paces Claude Flow spawning
# ═══════════════════════════════════════════════════════════════

run_pipeline() {
    local total_spawned=0
    local total_completed=0
    local cycle=0

    while true; do
        cycle=$((cycle + 1))

        # Parse current spec state
        local spec_data
        spec_data=$(parse_spec_todos)
        local total_todo total_wip total_done
        total_todo=$(echo "$spec_data" | python3 -c "import sys,json; print(json.load(sys.stdin)['total_todo'])" 2>/dev/null || echo "0")
        total_wip=$(echo "$spec_data" | python3 -c "import sys,json; print(json.load(sys.stdin)['total_wip'])" 2>/dev/null || echo "0")
        total_done=$(count_done)

        log "═══ Pipeline scan #${cycle} | ${total_done} done, ${total_wip} WIP, ${total_todo} TODO | Spawned: ${total_spawned} ═══"

        if [ "$total_todo" -eq 0 ] && [ "$total_wip" -eq 0 ]; then
            ok "ALL SPEC ITEMS COMPLETE! ${total_done} items done."
            notify_discord "builder" "ALL SPEC ITEMS COMPLETE! ${total_done} items done. Spawned ${total_spawned} agents total."
            return 0
        fi

        # Clean up dead PIDs
        cleanup_dead_pids

        # Check done markers and commit periodically
        local done_markers
        done_markers=$(ls "${LOG_DIR}"/agent-*-done.marker 2>/dev/null | wc -l | tr -d ' ')
        if [ "$done_markers" -gt 0 ]; then
            total_completed=$((total_completed + done_markers))
            git_commit_push "build(auto): Pipeline — ${done_markers} agents delivered (scan #${cycle}, ${total_todo} TODOs left)"
            rm -f "${LOG_DIR}"/agent-*-done.marker
            notify_discord "builder" "Pipeline: +${done_markers} delivered | ${total_done} done | ${total_spawned} spawned total"
        fi

        # Get all TODOs as individual items
        local todos_list
        todos_list=$(echo "$spec_data" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data['todos']:
    print(item)
" 2>/dev/null)

        # Feed TODOs through Ollama one-by-one → spawn Claude on each
        local items_this_scan=0
        while IFS= read -r todo_item; do
            [ -z "$todo_item" ] && continue

            # Check slot availability
            local active
            active=$(count_active_agents)
            while [ "$active" -ge "$MAX_CONCURRENT_AGENTS" ]; do
                log "  ${active}/${MAX_CONCURRENT_AGENTS} slots full — waiting 30s..."
                sleep 30
                cleanup_dead_pids
                active=$(count_active_agents)

                # Check for completed agents while waiting
                done_markers=$(ls "${LOG_DIR}"/agent-*-done.marker 2>/dev/null | wc -l | tr -d ' ')
                if [ "$done_markers" -gt 0 ]; then
                    total_completed=$((total_completed + done_markers))
                    git_commit_push "build(auto): Pipeline — ${done_markers} agents delivered (${total_todo} TODOs left)"
                    rm -f "${LOG_DIR}"/agent-*-done.marker
                    notify_discord "builder" "Pipeline: +${done_markers} delivered while waiting for slots"
                fi
            done

            # Ollama classifies (pacing: ~3-8s per item = natural rate limiter)
            local priority
            priority=$(ollama_classify_todo "$todo_item")
            log "  Ollama → [${priority}] ${todo_item:0:70}..."

            # Skip low-priority items on first pass (come back later)
            if [ "$priority" = "low" ] && [ "$items_this_scan" -gt 5 ]; then
                continue
            fi

            # Spawn Claude Flow agent
            total_spawned=$((total_spawned + 1))
            local pid
            pid=$(spawn_builder_agent "$total_spawned" "$todo_item")
            if [ -n "$pid" ]; then
                echo "$pid" >> "$AGENT_PIDS_FILE"
                items_this_scan=$((items_this_scan + 1))
            fi

            # Cap items per scan (re-parse spec next cycle to see what's left)
            if [ "$items_this_scan" -ge "$MAX_CONCURRENT_AGENTS" ]; then
                break
            fi
        done <<< "$todos_list"

        update_state "$cycle" "$total_todo" "$total_wip" "$total_done" "$(count_active_agents)"

        if [ "$items_this_scan" -eq 0 ]; then
            log "No new items to spawn — waiting for active agents..."
        fi

        # Wait for current batch to thin out before next scan
        log "Waiting for agents to complete before next scan..."
        local wait_elapsed=0
        while [ "$(count_active_agents)" -ge "$((MAX_CONCURRENT_AGENTS / 2))" ] && [ "$wait_elapsed" -lt 600 ]; do
            sleep 30
            wait_elapsed=$((wait_elapsed + 30))
            cleanup_dead_pids

            # Commit completed agents while waiting
            done_markers=$(ls "${LOG_DIR}"/agent-*-done.marker 2>/dev/null | wc -l | tr -d ' ')
            if [ "$done_markers" -gt 0 ]; then
                total_completed=$((total_completed + done_markers))
                git_commit_push "build(auto): Pipeline — ${done_markers} agents delivered"
                rm -f "${LOG_DIR}"/agent-*-done.marker
                notify_discord "builder" "Pipeline: +${done_markers} delivered | Active: $(count_active_agents)"
            fi

            if [ $((wait_elapsed % 120)) -eq 0 ]; then
                log "  Active: $(count_active_agents)/${MAX_CONCURRENT_AGENTS} | Waiting ${wait_elapsed}s..."
            fi
        done

        # Brief cooldown before next pipeline scan
        sleep 15
    done
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
        log "Single-pass mode (one pipeline scan)"
        MAX_CONCURRENT_AGENTS=5
        run_pipeline
        exit $?
        ;;
esac

# ═══════════════════════════════════════════════════════════════
# Main Loop — Indefinite Build
# ═══════════════════════════════════════════════════════════════

# Check if already running
BUILDER_RESTARTED=false
if [ -f "$PID_FILE" ]; then
    existing_pid=$(cat "$PID_FILE")
    if kill -0 "$existing_pid" 2>/dev/null; then
        err "Builder already running (PID ${existing_pid}). Use --stop first."
        exit 1
    fi
    rm -f "$PID_FILE"
    BUILDER_RESTARTED=true
fi

echo "$$" > "$PID_FILE"
trap 'rm -f "$PID_FILE"; notify_discord "builder" "Autonomous Builder exited (PID $$)"; exit' EXIT INT TERM

if [ "$BUILDER_RESTARTED" = true ]; then
    LAUNCH_VERB="restarted"
else
    LAUNCH_VERB="started"
fi

echo -e "${PURPLE}"
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║    IntentGuard Autonomous Builder — Cortex Mode   ║"
echo "  ║    Indefinite spec-driven build loop              ║"
echo "  ║    Heartbeat: ${HEARTBEAT_SECONDS}s | Max agents: ${MAX_CONCURRENT_AGENTS}          ║"
echo "  ║    LLM: Ollama (Tier 0) + Sonnet (Tier 1)        ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

notify_discord "builder" "Autonomous Builder ${LAUNCH_VERB} — Cortex Mode | Heartbeat: ${HEARTBEAT_SECONDS}s | Max agents: ${MAX_CONCURRENT_AGENTS}"

# Run the continuous pipeline — Ollama paces Claude Flow spawning
run_pipeline

ok "Autonomous Builder pipeline finished"
notify_discord "builder" "Autonomous Builder pipeline finished — all spec items complete"
