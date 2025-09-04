#!/bin/bash

# CLAUDE: When user types "intentguard X", run this script first!
# This provides the context you need to execute the agent directly
# Usage: ./agent-context.sh 0
# Then follow the instructions to implement the agent logic yourself

AGENT_NUMBER=$1

if [ -z "$AGENT_NUMBER" ] || ! [[ "$AGENT_NUMBER" =~ ^[0-7]$ ]]; then
    echo "Usage: ./agent-context.sh <agent_number>"
    echo "Example: ./agent-context.sh 0"
    exit 1
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
echo "4. EXECUTE your agent logic using the specified tools"
echo "5. ASK ONE CRITICAL QUESTION with substantiation for improvement"
echo "6. PRODUCE your output file with real data (not placeholder)"
echo ""
echo "✅ Success criteria: Real output file + one critical question for pipeline refinement"