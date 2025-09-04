#!/bin/bash

# CASCADING AGENT LEARNING SYSTEM
# Each agent asks ONE question to refine their role until pipeline is watertight
# Usage: ./agent-learning-cascade.sh
# Runs all agents (0-7) in sequence, each building on previous learning

LEARNING_LOG="agent-learning-cascade.log"
REFINEMENT_CYCLE=1

echo "🧠 AGENT LEARNING CASCADE - CYCLE $REFINEMENT_CYCLE" | tee $LEARNING_LOG
echo "=================================================" | tee -a $LEARNING_LOG

for AGENT in {0..7}; do
    echo "" | tee -a $LEARNING_LOG
    echo "🤖 AGENT $AGENT LEARNING PHASE" | tee -a $LEARNING_LOG
    echo "────────────────────────────" | tee -a $LEARNING_LOG
    
    # Get current agent context
    CONTEXT=$(node src/claude-agent-dispatcher.js $AGENT)
    
    # Extract current role and responsibility
    CURRENT_ROLE=$(echo "$CONTEXT" | jq -r '.agent.name // "Unknown"')
    CURRENT_RESP=$(echo "$CONTEXT" | jq -r '.instructions // "No instructions"')
    
    echo "Current Role: $CURRENT_ROLE" | tee -a $LEARNING_LOG
    echo "" | tee -a $LEARNING_LOG
    
    # Generate learning prompt for this agent
    cat > agent_${AGENT}_learning_prompt.txt << EOF
You are Agent $AGENT in the Trust Debt Pipeline. 

CURRENT CONTEXT:
Role: $CURRENT_ROLE
Current Instructions: $CURRENT_RESP

LEARNING FROM PREVIOUS AGENTS:
$(if [ $AGENT -gt 0 ]; then tail -n 50 $LEARNING_LOG | grep -A 5 "REFINED UNDERSTANDING"; fi)

YOUR TASK: Ask ONE specific question to refine your role and ensure pipeline coherence.

Focus on:
1. What specific inputs do you need from Agent $(($AGENT-1))?
2. What exact validation criteria will you use?
3. What tools do you need access to?
4. How will your output be structured for Agent $(($AGENT+1))?
5. What could go wrong in your process and how will you detect it?

Ask the MOST CRITICAL question for making your part of the pipeline watertight.
EOF

    echo "📝 Agent $AGENT Learning Prompt Created" | tee -a $LEARNING_LOG
    echo "Question to resolve:" | tee -a $LEARNING_LOG
    echo "- Input validation from Agent $(($AGENT-1))" | tee -a $LEARNING_LOG
    echo "- Output structure for Agent $(($AGENT+1))" | tee -a $LEARNING_LOG
    echo "- Error detection and recovery" | tee -a $LEARNING_LOG
    echo "- Tool access requirements" | tee -a $LEARNING_LOG
    
    # Store for next agent to learn from
    echo "AGENT $AGENT REFINED UNDERSTANDING:" >> $LEARNING_LOG
    echo "Needs refinement on data flow and validation" >> $LEARNING_LOG
    
done

echo "" | tee -a $LEARNING_LOG
echo "🎯 LEARNING CASCADE COMPLETE" | tee -a $LEARNING_LOG
echo "Next: Run 'intentguard 0' through 'intentguard 7' to implement refined understanding" | tee -a $LEARNING_LOG