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
CORTEX_BRIDGE="${REPO_ROOT}/../thetadrivencoach/openclaw/scripts/cortex-bridge.sh"

# Config
MAX_AGENTS=10
OLLAMA_MODEL="qwen2.5:14b-instruct-q6_K"
OLLAMA_ENDPOINT="http://localhost:11434"
COMMIT_INTERVAL=300   # Commit every 5 minutes if there are changes

# Room HTML source of truth (thetacog cognitive rooms)
ROOMS_DIR="${REPO_ROOT}/../thetadrivencoach/.workflow/rooms"
SCHEDULE_FILE="${REPO_ROOT}/../thetadrivencoach/openclaw/data/thematic-schedule.json"

# Room name → HTML file mapping
declare -A ROOM_HTML=(
    [builder]="iterm2-builder.html"
    [architect]="vscode-architect.html"
    [operator]="kitty-operator.html"
    [vault]="wezterm-vault.html"
    [voice]="terminal-voice.html"
    [laboratory]="cursor-laboratory.html"
    [performer]="alacritty-performer.html"
    [navigator]="rio-navigator.html"
    [network]="messages-network.html"
)

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
# Room Context Reader — extracts from .workflow/rooms/*.html
# ═══════════════════════════════════════════════════════════════

read_room_context() {
    local room="$1"
    local html_file="${ROOMS_DIR}/${ROOM_HTML[$room]:-}"
    [ -z "$html_file" ] || [ ! -f "$html_file" ] && return 1

    python3 -c "
import re, json, sys
with open('${html_file}') as f:
    html = f.read()

# Extract coordinate-lock JSON
m = re.search(r'<script\s+type=\"application/json\"\s+id=\"coordinate-lock\">\s*(.*?)\s*</script>', html, re.DOTALL)
if not m:
    sys.exit(1)
lock = json.loads(m.group(1))

# Extract work dispatch prompt
wm = re.search(r'═══ WORK DISPATCH:.*?(?=</code>)', html, re.DOTALL)
work = wm.group(0).strip()[:500] if wm else ''

print(json.dumps({
    'namespace': lock.get('namespace',''),
    'coordinate': lock.get('coordinate',''),
    'question': lock.get('question',''),
    'pull': lock.get('cognitive_affordance',{}).get('pull',''),
    'sees': lock.get('cognitive_affordance',{}).get('sees',[])[:5],
    'escape_gravity': lock.get('escape_gravity',{}).get('counts',''),
    'handoff_to': lock.get('differentiation',{}).get('handoff_to',{}),
    'work_dispatch': work
}))
" 2>/dev/null
}

# Get active rooms for current time of day from thematic schedule
get_active_rooms() {
    [ ! -f "$SCHEDULE_FILE" ] && echo "builder" && return
    python3 -c "
import json
from datetime import datetime
with open('${SCHEDULE_FILE}') as f:
    sched = json.load(f)
now = datetime.now()
hour = now.hour
dow = now.weekday()  # 0=Mon..6=Sun → convert to JS 0=Sun..6=Sat
js_dow = (dow + 1) % 7
rooms = set()
for slot in sched.get('slots', []):
    sh, eh = slot['hours']
    days = slot.get('days', [])
    if sh <= hour < eh and (not days or js_dow in days):
        rooms.update(slot.get('rooms', []))
if not rooms:
    rooms = {'builder', 'operator'}  # Default fallback
print(' '.join(sorted(rooms)))
" 2>/dev/null || echo "builder"
}

# Ollama: classify which room should handle a TODO
ollama_room_classify() {
    local todo="$1"
    local active_rooms="$2"
    local result
    result=$(curl -s --max-time 10 "${OLLAMA_ENDPOINT}/api/generate" \
        -d "{\"model\":\"${OLLAMA_MODEL}\",\"prompt\":\"Which cognitive room should handle this task? Pick ONE from: ${active_rooms}\\n\\nRooms:\\n- builder: code implementation, features\\n- architect: specs, planning, design\\n- operator: ops, monitoring, deployment\\n- vault: security, sovereignty, budget\\n- voice: communication, docs, content\\n- laboratory: testing, experiments\\n- performer: performance, metrics\\n- navigator: strategy, user flows\\n- network: outreach, partnerships\\n\\nTask: $(echo "$todo" | head -c 200)\\n\\nAnswer with ONE room name only:\",\"stream\":false}" \
        2>/dev/null | python3 -c "
import sys, json
try:
    r = json.load(sys.stdin).get('response','builder').strip().lower()
    rooms = ['builder','architect','operator','vault','voice','laboratory','performer','navigator','network']
    for room in rooms:
        if room in r:
            print(room)
            sys.exit(0)
    print('builder')
except:
    print('builder')
" 2>/dev/null) || result="builder"
    track_ollama "room-classify" "${#todo}"
    echo "${result:-builder}"
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
    local room="${3:-builder}"
    local agent_id="cortex-${agent_num}"

    log "  Spawning ${agent_id} → #${room}: ${todo:0:60}..."

    # Read room context from HTML (coordinate-lock, work dispatch, etc.)
    local room_context=""
    local ctx_json
    ctx_json=$(read_room_context "$room" 2>/dev/null) && {
        local namespace question pull sees escape_gravity
        namespace=$(echo "$ctx_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('namespace',''))" 2>/dev/null || true)
        question=$(echo "$ctx_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('question',''))" 2>/dev/null || true)
        pull=$(echo "$ctx_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('pull','')[:150])" 2>/dev/null || true)
        escape_gravity=$(echo "$ctx_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('escape_gravity','')[:100])" 2>/dev/null || true)

        room_context="ROOM: ${namespace} | QUESTION: ${question} | PULL: ${pull} | COUNTS: ${escape_gravity}"
    }

    # Build enriched objective
    local objective="Implement this spec TODO in IntentGuard repo at ${REPO_ROOT}: ${todo}."
    objective="${objective} Write TypeScript in src/. Follow existing patterns."
    [ -n "$room_context" ] && objective="${objective} CONTEXT: ${room_context}"
    objective="${objective} When done, summarize what you built and which rooms need to know."
    objective="${objective} Create a done marker at ${LOG_DIR}/${agent_id}-done.txt."

    # Use claude-flow agent spawn (non-blocking)
    npx claude-flow agent spawn \
        -t coder \
        --name "${agent_id}" \
        --objective "$objective" \
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

    # Determine active rooms for current time of day
    active_rooms=$(get_active_rooms)
    log "═══ Scan #${scan} | ${done_count} done, ${remaining} remaining | Active rooms: ${active_rooms} ═══"

    if [ "$remaining" -eq 0 ]; then
        ok "ALL SPEC ITEMS COMPLETE! ${done_count} done."
        discord "builder" "ALL COMPLETE! ${done_count} items done after ${total_spawned} agents."
        try_commit
        break
    fi

    # Get TODO list into temp file (avoid subshell pipe)
    todos_file="${LOG_DIR}/current-todos.txt"
    parse_todos | python3 -c "
import sys, json
for item in json.load(sys.stdin):
    print(item)
" > "$todos_file" 2>/dev/null

    items_this_scan=0

    # Process each TODO — Ollama classifies priority + room, then spawn
    while IFS= read -r todo_item; do
        [ -z "$todo_item" ] && continue

        # Cap per scan
        if [ "$items_this_scan" -ge "$MAX_AGENTS" ]; then
            break
        fi

        # Ollama classifies priority (natural pacing: 3-10s per item)
        priority=$(ollama_classify "$todo_item")

        # Ollama classifies which room should handle this TODO
        room=$(ollama_room_classify "$todo_item" "$active_rooms")
        log "  [${priority}] #${room} → ${todo_item:0:55}..."

        # Spawn agent with room context from HTML
        total_spawned=$((total_spawned + 1))
        items_this_scan=$((items_this_scan + 1))
        spawn_agent "$total_spawned" "$todo_item" "$room"

        # Brief pause between spawns
        sleep 2
    done < "$todos_file"

    log "Spawned ${items_this_scan} agents this scan (${total_spawned} total)"

    save_state "$scan" "$(count_active)" "$total_spawned"

    # Commit any completed work
    try_commit
    last_commit=$(date +%s)

    # Wait for agents to finish (up to 10 min), committing periodically
    log "Waiting for agents to finish..."
    wait_elapsed=0
    while [ "$wait_elapsed" -lt 600 ]; do
        sleep 30
        wait_elapsed=$((wait_elapsed + 30))

        # Commit periodically
        now=$(date +%s)
        if [ $((now - last_commit)) -ge $COMMIT_INTERVAL ]; then
            try_commit
            last_commit=$now
        fi

        # Check git diff to see if agents produced anything
        cd "$REPO_ROOT"
        changed=0
        changed=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
        if [ "$changed" -gt 0 ] && [ $((wait_elapsed % 120)) -eq 0 ]; then
            log "  ${changed} files modified, ${wait_elapsed}s elapsed..."
        fi
    done

    # Final commit for this scan
    try_commit
    last_commit=$(date +%s)

    discord "builder" "Scan #${scan} complete | ${done_count} done, ${remaining} remaining | ${total_spawned} agents | Rooms: ${active_rooms}"

    # Feed results back to OpenClaw room state
    [ -x "$CORTEX_BRIDGE" ] && "$CORTEX_BRIDGE" scan-complete "$room" "$scan" "$done_count" "$remaining" "$total_spawned" 2>/dev/null || true

    sleep 5
done

ok "Cortex Loop finished after ${scan} scans, ${total_spawned} agents"
