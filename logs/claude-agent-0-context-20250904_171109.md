# IntentGuard Agent 0 Context - Thu Sep  4 17:11:09 CDT 2025

## Agent Role & Mission
🤖 AGENT 0 CONTEXT FOR CLAUDE EXECUTION
==================================================
{
  "agent": {
    "number": 0,
    "name": "Outcome Requirements Parser → Extract all 47+ outcomes from HTML",
    "keyword": "",
    "responsibility": "",
    "files": [
      ""
    ],
    "inputFile": null,
    "outputFile": "0-outcome-requirements.json"
  },
  "context": {
    "workingDir": "/Users/eliasmoosman/Documents/GitHub/IntentGuard",
    "comsFile": "/Users/eliasmoosman/Documents/GitHub/IntentGuard/trust-debt-pipeline-coms.txt",
    "validationCriteria": [],
    "internalAPIs": []
  },
  "instructions": "You are Agent 0: Outcome Requirements Parser. Your task is to:\n1. Read the current trust-debt-report.html file\n2. Extract ALL outcome requirements (47+ metrics, grades, features)\n3. Map each outcome to its responsible agent (1-7) \n4. Create 0-outcome-requirements.json with complete objective mapping\n5. Ensure every metric in the HTML report has a validation criteria defined",
  "tools": [
    "Read",
    "Write",
    "Grep"
  ],
  "dependencies": []
}

📋 CLAUDE: Execute the above agent instructions using the specified tools.
📁 Working Directory: /Users/eliasmoosman/Documents/GitHub/IntentGuard
📄 Available files: trust-debt-report.html, trust-debt-pipeline-coms.txt

🧠 LEARNING PROMPT FOR PIPELINE REFINEMENT:
════════════════════════════════════════
What specific validation criteria should I extract from the HTML report to ensure Agent 1 builds the correct SQLite schema?

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
- trust-debt-report.html exists (118KB)

### COMS.txt Pipeline Configuration
**Current COMS.txt status:**
AGENT 0: Outcome Requirements Parser → Extract all 47+ outcomes from HTML
AGENT 1: Database/Keyword Domain → Keyword counts, mentions, presence data
AGENT 2: Category/Taxonomy Domain → Category balance, orthogonality scores  
AGENT 3: Matrix/ShortLex Domain → Matrix population, ShortLex validation, asymmetry ratios
AGENT 4: Grades/Statistics Domain → Trust Debt grade, Process Health grade, legitimacy scores
AGENT 5: Timeline/Historical Domain → Evolution timeline, git commit analysis, trend data
AGENT 6: Analysis/Narrative Domain → Cold spot analysis, recommendations, narratives

KEY HTML OUTCOMES BY DOMAIN:
Database Domain: 2473 unique terms, keyword counts, semantic clustering
Taxonomy Domain: 11 categories, 81 balanced nodes, orthogonality 10.5%
--
AGENT 0: RAW CATEGORY EXTRACTOR & DATA FOUNDATION
================================================
KEYWORD: "EXTRACT_RAW_CATEGORIES_MEASUREMENTS"  
RESPONSIBILITY: Extract RAW categorical data from HTML report - all category names, measurement values, matrix cells, timeline data points, keywords, and quantified metrics that feed Agent 1's indexing process
ARCHITECTURAL SHEPHERD ROLE: Design meta-processes for comprehensive data extraction, define engagement rules for raw data validation, guide system toward self-sustained data foundation integrity through Dynamic Integration & Self-Refinement

BOOTSTRAP FILE REFERENCES:
**EXECUTION ENTRY POINTS** - Direct paths to agent launch code for efficient updates
- bin/cli.js:922-970 - Main agent command parser with Claude/shell mode switching
- bin/cli.js:924 - .command(i.toString()) registration for `intentguard 0`
- bin/cli.js:933-941 - Claude bootstrap launch logic (!options.shell branch)

### Git Status
```
 M .claude-flow/metrics/system-metrics.json
 M .trust-debt-cache/categories.json
 M .trust-debt-cache/matrix.json
 M 0-.json
 M 1-.json
 M 1-indexed-keywords.json
 M 2-.json
 M 3-.json
 M 4-.json
 M 5-.json
 M 5-timeline-history.json
 M 6-.json
 M 7-generate-report-audit-pipeline.json
 M bin/cli.js
 M package.json
 M src/trust-debt-final.js
 M src/trust-debt-html-generator.js
 M src/trust-debt-matrix-generator.js
 M trust-debt-final.html
 M trust-debt-final.json
 M trust-debt-pipeline-coms.txt
 M trust-debt-report.html
?? .queen-context-agent-0.md
?? QUEEN_ORCHESTRATOR.md
?? logs/claude-agent-0-context-20250904_170000.md
?? logs/claude-agent-0-context-20250904_171109.md
?? src/queen-orchestrator.js
?? trust-debt-analysis.json
?? trust-debt-settings.json
```

### Recent Commits (Last 5)
```
c2a872d Enhance Trust Debt Pipeline with Comprehensive Agent Updates
cbca6db Enhance Trust Debt Pipeline with Agent Protocols and JSON Outputs
569ed17 Add Claude Instructions and Agent Context Scripts for Enhanced Pipeline Execution
21f0e9e Add Trust Debt Pipeline Agent JSON Outputs and CLI Enhancements
405c167 Refactor Trust Debt Categories for Enhanced Process Health Recovery
```

## Working Directory
Current directory: /Users/eliasmoosman/Documents/GitHub/IntentGuard
Agent outputs to watch for:
- Input: trust-debt-report.html (existing report to parse)
- Output: 0-outcome-requirements.json

## Action Required

You are Agent 0 in the IntentGuard Trust Debt Pipeline. Your task is to:

1. **Execute your agent logic** using available tools (Read, Write, Grep, etc.)
2. **Update COMS.txt** with your refined understanding
3. **Produce real output files** (not placeholder data)
4. **Ask one critical question** to improve pipeline coherence

**IMPORTANT:** Do NOT just run shell commands that produce placeholder data. Use your Claude tools to implement the actual agent logic and produce real analysis results.

Ready to begin Agent 0 execution!
