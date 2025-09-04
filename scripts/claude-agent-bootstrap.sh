#!/bin/bash

# IntentGuard Claude Agent Bootstrap
# Launches Claude with full agent context for interactive work

set -e

AGENT_NUM=$1
if [ -z "$AGENT_NUM" ]; then
    echo "Usage: $0 <agent-number>"
    echo "Agent numbers: 0-7"
    exit 1
fi

if ! [[ "$AGENT_NUM" =~ ^[0-7]$ ]]; then
    echo "Error: Agent number must be 0-7"
    exit 1
fi

# Project root detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🤖 IntentGuard Agent $AGENT_NUM Claude Bootstrap"
echo "================================================"

# Check for Claude CLI
if ! command -v claude &> /dev/null; then
    echo "❌ Claude CLI not found. Install with:"
    echo "   npm install -g @anthropic/claude-cli"
    exit 1
fi

# Get agent context
if [ ! -f "./agent-context.sh" ]; then
    echo "❌ agent-context.sh not found in project root"
    exit 1
fi

# Create comprehensive context
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTEXT_FILE="logs/claude-agent-${AGENT_NUM}-context-${TIMESTAMP}.md"
mkdir -p logs

echo "📋 Building comprehensive agent context..."

# Start building context
cat > "$CONTEXT_FILE" << EOF
# IntentGuard Agent $AGENT_NUM Context - $(date)

## Agent Role & Mission
EOF

# Get agent context from agent-context.sh
./agent-context.sh "$AGENT_NUM" >> "$CONTEXT_FILE" 2>&1 || true

cat >> "$CONTEXT_FILE" << EOF

## Current Pipeline State

### Available Agent Outputs
EOF

# List existing agent outputs
echo "**JSON Buckets Available:**" >> "$CONTEXT_FILE"
for i in {0..7}; do
    if [ -f "${i}-"*.json ] 2>/dev/null; then
        for file in ${i}-*.json; do
            if [ -f "$file" ]; then
                size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
                echo "- $file ($(($size / 1024))KB)" >> "$CONTEXT_FILE"
            fi
        done
    else
        echo "- Agent $i: No output yet" >> "$CONTEXT_FILE"
    fi
done

# Add pipeline status
cat >> "$CONTEXT_FILE" << EOF

### Trust Debt Report Status
EOF

if [ -f "trust-debt-report.html" ]; then
    size=$(stat -f%z "trust-debt-report.html" 2>/dev/null || stat -c%s "trust-debt-report.html" 2>/dev/null || echo "0")
    echo "- trust-debt-report.html exists ($(($size / 1024))KB)" >> "$CONTEXT_FILE"
else
    echo "- trust-debt-report.html: Not generated yet" >> "$CONTEXT_FILE"
fi

# Add COMS.txt context
cat >> "$CONTEXT_FILE" << EOF

### COMS.txt Pipeline Configuration
EOF

if [ -f "trust-debt-pipeline-coms.txt" ]; then
    echo "**Current COMS.txt status:**" >> "$CONTEXT_FILE"
    grep -A 10 "AGENT $AGENT_NUM:" trust-debt-pipeline-coms.txt >> "$CONTEXT_FILE" 2>/dev/null || echo "Agent $AGENT_NUM section not found" >> "$CONTEXT_FILE"
else
    echo "- trust-debt-pipeline-coms.txt: Missing" >> "$CONTEXT_FILE"
fi

# Add git status for context
cat >> "$CONTEXT_FILE" << EOF

### Git Status
\`\`\`
$(git status --short 2>/dev/null || echo "Not a git repository")
\`\`\`

### Recent Commits (Last 5)
\`\`\`
$(git log --oneline -5 2>/dev/null || echo "No git history")
\`\`\`

## Working Directory
Current directory: $PROJECT_ROOT
Agent outputs to watch for:
EOF

# List expected inputs/outputs for this agent
case $AGENT_NUM in
    0)
        echo "- Input: trust-debt-report.html (existing report to parse)" >> "$CONTEXT_FILE"
        echo "- Output: 0-outcome-requirements.json" >> "$CONTEXT_FILE"
        ;;
    1)
        echo "- Input: Repository files, git history" >> "$CONTEXT_FILE"
        echo "- Output: 1-indexed-keywords.json" >> "$CONTEXT_FILE"
        ;;
    2)
        echo "- Input: 1-indexed-keywords.json" >> "$CONTEXT_FILE"
        echo "- Output: 2-categories-balanced.json" >> "$CONTEXT_FILE"
        ;;
    3)
        echo "- Input: 2-categories-balanced.json" >> "$CONTEXT_FILE"
        echo "- Output: 3-presence-matrix.json" >> "$CONTEXT_FILE"
        ;;
    4)
        echo "- Input: 3-presence-matrix.json" >> "$CONTEXT_FILE"
        echo "- Output: 4-grades-statistics.json" >> "$CONTEXT_FILE"
        ;;
    5)
        echo "- Input: 1-indexed-keywords.json, 4-grades-statistics.json" >> "$CONTEXT_FILE"
        echo "- Output: 5-timeline-history.json" >> "$CONTEXT_FILE"
        ;;
    6)
        echo "- Input: All agent outputs 0-5" >> "$CONTEXT_FILE"
        echo "- Output: 6-analysis-narratives.json" >> "$CONTEXT_FILE"
        ;;
    7)
        echo "- Input: All agent outputs 0-6" >> "$CONTEXT_FILE"
        echo "- Output: trust-debt-report.html, 7-audit-log.json" >> "$CONTEXT_FILE"
        ;;
esac

cat >> "$CONTEXT_FILE" << EOF

## Action Required

You are Agent $AGENT_NUM in the IntentGuard Trust Debt Pipeline. Your task is to:

1. **Execute your agent logic** using available tools (Read, Write, Grep, etc.)
2. **Update COMS.txt** with your refined understanding
3. **Produce real output files** (not placeholder data)
4. **Ask one critical question** to improve pipeline coherence

**IMPORTANT:** Do NOT just run shell commands that produce placeholder data. Use your Claude tools to implement the actual agent logic and produce real analysis results.

Ready to begin Agent $AGENT_NUM execution!
EOF

# Display context summary
echo "📊 Context Summary:"
echo "   Agent: $AGENT_NUM"
echo "   Context: $CONTEXT_FILE ($(wc -l < "$CONTEXT_FILE") lines)"
echo "   Working Dir: $PROJECT_ROOT"
echo ""

# Build the prompt for Claude
PROMPT="$(cat "$CONTEXT_FILE")

AGENT BOOTSTRAP COMPLETE - Ready for Agent $AGENT_NUM execution!"

echo "🚀 Launching Claude with Agent $AGENT_NUM context..."
echo "   Context file saved: $CONTEXT_FILE"
echo ""

# Launch Claude with context and stay interactive
# The key: no --print flag, use stdio: 'inherit' equivalent
exec claude "$PROMPT"