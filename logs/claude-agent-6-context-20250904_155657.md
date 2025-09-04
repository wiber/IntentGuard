# IntentGuard Agent 6 Context - Thu Sep  4 15:56:57 CDT 2025

## Agent Role & Mission
🤖 AGENT 6 CONTEXT FOR CLAUDE EXECUTION
==================================================
{
  "agent": {
    "number": 6,
    "name": "Analysis/Narrative Domain → Cold spot analysis, recommendations, narratives",
    "keyword": "",
    "responsibility": "",
    "files": [
      ""
    ],
    "inputFile": "5-timeline-history.json",
    "outputFile": "6-analysis-narratives.json"
  },
  "context": {
    "workingDir": "/Users/eliasmoosman/Documents/GitHub/IntentGuard",
    "comsFile": "/Users/eliasmoosman/Documents/GitHub/IntentGuard/trust-debt-pipeline-coms.txt",
    "validationCriteria": [],
    "internalAPIs": []
  },
  "instructions": "You are Agent 6: Analysis & Narrative Generator. Your task is to:\n1. Read all previous agent outputs (0-5)\n2. Generate cold spot analysis from matrix sparse regions\n3. Detect asymmetric patterns with specific ratios\n4. Create actionable recommendations with priority levels\n5. Output 6-analysis-narratives.json with complete analysis",
  "tools": [
    "Read",
    "Write"
  ],
  "dependencies": [
    "Agents 0-5"
  ]
}

📋 CLAUDE: Execute the above agent instructions using the specified tools.
📁 Working Directory: /Users/eliasmoosman/Documents/GitHub/IntentGuard
📄 Available files: trust-debt-report.html, trust-debt-pipeline-coms.txt

🧠 LEARNING PROMPT FOR PIPELINE REFINEMENT:
════════════════════════════════════════
What specific analytical frameworks should I use to ensure Agent 7 can generate actionable recommendations from my analysis?

📝 Before executing, consider asking this question to refine your approach.
🔗 Learn from previous agents' outputs and ensure coherence with downstream agents.

🎯 YOUR ARCHITECTURAL SHEPHERD WORKFLOW:
1. UNDERSTAND your role and context above
2. READ agent-refinement-protocol.md for the learning framework
3. LEARN from other agents' outputs for pipeline coherence
4. FIND the specific code files you will use (src/, scripts/, etc.)
5. ANALYZE current intentguard audit execution vs your agent logic
6. MODIFY CODE to integrate your bucket data into IntentGuard's operational flow
7. UPDATE trust-debt-pipeline-coms.txt with your REFINED UNDERSTANDING section
8. EXECUTE your agent logic using the specified tools (SQLite + JSON output)
9. PRODUCE your output file with real data (not placeholder)
10. REPORT what you completed, integrated, and learned
11. BUILD EVIDENCE for integration challenges and gaps
12. ASK ONE CRITICAL INTEGRATION QUESTION with full substantiation

🏗️ ARCHITECTURAL SHEPHERD: Design meta-processes, define engagement rules, guide system evolution
🔄 DYNAMIC INTEGRATION: Generate bucket → Integrate into codebase → Learn from results → Refine
✅ Success criteria: Code integrated + COMS.txt updated + Real output + Evidence + Critical question

## Current Pipeline State

### Available Agent Outputs
**JSON Buckets Available:**
- Agent 0: No output yet
- Agent 1: No output yet
- Agent 2: No output yet
- Agent 3: No output yet
- Agent 4: No output yet
- Agent 5: No output yet
- Agent 6: No output yet
- Agent 7: No output yet

### Trust Debt Report Status
- trust-debt-report.html exists (29KB)

### COMS.txt Pipeline Configuration
**Current COMS.txt status:**
AGENT 6: Analysis/Narrative Domain → Cold spot analysis, recommendations, narratives

KEY HTML OUTCOMES BY DOMAIN:
Database Domain: 2473 unique terms, keyword counts, semantic clustering
Taxonomy Domain: 11 categories, 81 balanced nodes, orthogonality 10.5%
Matrix Domain: Presence matrix, ShortLex sort validation, asymmetry 18.00x
Grades Domain: Trust Debt Grade C, Process Health F (44.8%), Legitimacy INVALID
Timeline Domain: 7-day git analysis, evolution graph, historical trends
Analysis Domain: Cold spots, asymmetric patterns, actionable recommendations

AGENT DEFINITIONS:
--
AGENT 6: ANALYSIS & NARRATIVE DOMAIN
===================================  
KEYWORD: "GENERATE_ANALYSIS_NARRATIVES"
RESPONSIBILITY: Cold spot analysis, asymmetric patterns, actionable recommendations, narrative generation
ARCHITECTURAL SHEPHERD ROLE: Design meta-processes for analytical narrative generation, define engagement rules for recommendation integration, guide system toward self-sustained insight delivery through Dynamic Integration & Self-Refinement
FILES: src/agents/analysis-generator.js, src/narratives/cold-spot-analyzer.js
INTERNAL API MAPPING:
- Uses: src/analysis/cold-spot-detector.js (existing cold spot analysis)
- Uses: src/patterns/asymmetric-analyzer.js (asymmetric pattern detection)
- Uses: src/recommendations/action-generator.js (recommendation synthesis)
VALIDATION CRITERIA:

### Git Status
```
 M .claude-flow/metrics/system-metrics.json
 M 0-outcome-requirements.json
 M agent-context.sh
 M agent-restart-refocus-protocol.md
 M trust-debt-pipeline-coms.txt
?? agent-restart-refocus-protocol-v2.md
?? logs/
```

### Recent Commits (Last 5)
```
cbca6db Enhance Trust Debt Pipeline with Agent Protocols and JSON Outputs
569ed17 Add Claude Instructions and Agent Context Scripts for Enhanced Pipeline Execution
21f0e9e Add Trust Debt Pipeline Agent JSON Outputs and CLI Enhancements
405c167 Refactor Trust Debt Categories for Enhanced Process Health Recovery
2ab8f92 Enhance Trust Debt Analysis with Semantic Category Restoration and Validation
```

## Working Directory
Current directory: /Users/eliasmoosman/Documents/GitHub/IntentGuard
Agent outputs to watch for:
- Input: All agent outputs 0-5
- Output: 6-analysis-narratives.json

## Action Required

You are Agent 6 in the IntentGuard Trust Debt Pipeline. Your task is to:

1. **Execute your agent logic** using available tools (Read, Write, Grep, etc.)
2. **Update COMS.txt** with your refined understanding
3. **Produce real output files** (not placeholder data)
4. **Ask one critical question** to improve pipeline coherence

**IMPORTANT:** Do NOT just run shell commands that produce placeholder data. Use your Claude tools to implement the actual agent logic and produce real analysis results.

Ready to begin Agent 6 execution!
