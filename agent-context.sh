#!/bin/bash

# CLAUDE: When user types "intentguard X", run this script first!
# This provides the context you need to execute the agent directly
# Usage: ./agent-context.sh 0
# Then follow the instructions to implement the agent logic yourself

AGENT_NUMBER=$1
MODE=$2

if [ -z "$AGENT_NUMBER" ] || ! [[ "$AGENT_NUMBER" =~ ^[0-7]$ ]]; then
    echo "Usage: ./agent-context.sh <agent_number> [restart|refocus]"
    echo "Example: ./agent-context.sh 0"
    echo "         ./agent-context.sh 2 restart"
    exit 1
fi

# Check for restart mode
if [ "$MODE" = "restart" ] || [ "$MODE" = "refocus" ]; then
    echo "🔄 AGENT $AGENT_NUMBER RESTART MODE ACTIVATED"
    echo "=========================================="
    echo ""
    echo "📖 COMPREHENSIVE REFOCUS PROTOCOL:"
    echo "Read agent-restart-refocus-protocol.md for complete 5-phase instructions"
    echo ""
    echo "🎯 CRITICAL MISSION: Maintain + Develop + Integrate your pipeline stage"
    echo "✅ DELIVERABLES: Updated COMS.txt + Valid JSON + Critical question + Report"
    echo ""
    echo "🧠 RESTART CONTEXT:"
    echo "- Trust Debt Grade: D (318,225 units) - UNINSURABLE"
    echo "- Process Health: F (34.7%) - Below legitimacy threshold"  
    echo "- Your role: Both developer AND maintainer of your stage"
    echo "- Integration focus: Sequential handoff + pipeline coherence"
    echo ""
fi

echo "🤖 AGENT $AGENT_NUMBER CONTEXT FOR CLAUDE EXECUTION"
echo "=================================================="

# Get agent context from dispatcher
node src/claude-agent-dispatcher.js $AGENT_NUMBER

echo ""
echo "📋 CLAUDE: Execute the above agent instructions using the specified tools."
echo "📁 Working Directory: $(pwd)"
echo "📄 Available files: trust-debt-report.html, trust-debt-pipeline-coms.txt"
echo ""

# Add learning prompt for pipeline refinement
if [ -f "src/agent-learning-prompts.js" ]; then
    echo "🧠 LEARNING PROMPT FOR PIPELINE REFINEMENT:"
    echo "════════════════════════════════════════"
    node src/agent-learning-prompts.js $AGENT_NUMBER | jq -r '.critical_question'
    echo ""
    echo "📝 Before executing, consider asking this question to refine your approach."
    echo "🔗 Learn from previous agents' outputs and ensure coherence with downstream agents."
    echo ""
fi

echo "🎯 YOUR AGENT EXECUTION WORKFLOW:"
echo "1. UNDERSTAND your role and context above"
echo "2. READ agent-refinement-protocol.md for the learning framework"  
echo "3. LEARN from other agents' outputs for pipeline coherence"
echo "4. FIND the specific code files you will use (src/, scripts/, etc.)"
echo "5. DOCUMENT the code paths in your COMS.txt section"
echo "6. UPDATE trust-debt-pipeline-coms.txt with your REFINED UNDERSTANDING section"
echo "7. EXECUTE your agent logic using the specified tools (SQLite + JSON output)"
echo "8. PRODUCE your output file with real data (not placeholder)"
echo "9. REPORT what you completed and learned"
echo "10. ASK ONE DEVELOPMENT QUESTION with substantiation for improvement"
echo ""
echo "🔄 LEARNING LOOP: SQLite for fast processing → JSON buckets for pipeline handoff"
echo "✅ Success criteria: Code documented + COMS.txt updated + Real output + Report + Dev question"