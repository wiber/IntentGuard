# IntentGuard Agent 7 Context - Thu Sep  4 15:57:02 CDT 2025

## Agent Role & Mission
🤖 AGENT 7 CONTEXT FOR CLAUDE EXECUTION
==================================================
{
  "agent": {
    "number": 7,
    "name": "REPORT GENERATOR & FINAL AUDITOR",
    "keyword": "GENERATE_REPORT_AUDIT_PIPELINE",
    "responsibility": "Generate final HTML report using existing templates, validate entire pipeline integrity",
    "files": [
      "src/agents/report-generator.js",
      "src/audit/pipeline-validator.js"
    ],
    "inputFile": "6-analysis-narratives.json",
    "outputFile": "trust-debt-report.html"
  },
  "context": {
    "workingDir": "/Users/eliasmoosman/Documents/GitHub/IntentGuard",
    "comsFile": "/Users/eliasmoosman/Documents/GitHub/IntentGuard/trust-debt-pipeline-coms.txt",
    "validationCriteria": [
      "All intermediate JSON buckets validated and integrated",
      "HTML report matches existing template structure exactly",
      "All 47+ outcomes from Agent 0 requirements successfully populated",
      "Pipeline integrity confirmed across all stages"
    ],
    "internalAPIs": [
      "Uses: src/templates/trust-debt-report-template.html (existing IntentGuard template)",
      "Uses: src/audit/pipeline-integrity.js (full pipeline validation)",
      "Uses: src/output/html-generator.js (report compilation)"
    ]
  },
  "instructions": "You are Agent 7: Report Generator & Final Auditor. Your task is to:\n1. Read all agent outputs (0-6) \n2. Validate pipeline integrity and all outcome requirements\n3. Generate final HTML report using existing templates\n4. Ensure all 47+ outcomes from Agent 0 are populated\n5. Output trust-debt-report.html and 7-audit-log.json",
  "tools": [
    "Read",
    "Write",
    "MultiEdit"
  ],
  "dependencies": [
    "Agents 0-6"
  ]
}

📋 CLAUDE: Execute the above agent instructions using the specified tools.
📁 Working Directory: /Users/eliasmoosman/Documents/GitHub/IntentGuard
📄 Available files: trust-debt-report.html, trust-debt-pipeline-coms.txt

🧠 LEARNING PROMPT FOR PIPELINE REFINEMENT:
════════════════════════════════════════
How do I validate that all 52+ outcomes from Agent 0 are properly represented in the final report structure?

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
AGENT 7: REPORT GENERATOR & FINAL AUDITOR
========================================
KEYWORD: "GENERATE_REPORT_AUDIT_PIPELINE"
RESPONSIBILITY: Generate final HTML report using existing templates, validate entire pipeline integrity
ARCHITECTURAL SHEPHERD ROLE: Design meta-processes for report synthesis, define engagement rules for pipeline audit integration, guide system toward self-sustained report legitimacy through Dynamic Integration & Self-Refinement
FILES: src/agents/report-generator.js, src/audit/pipeline-validator.js
INTERNAL API MAPPING:
- Uses: src/templates/trust-debt-report-template.html (existing IntentGuard template)
- Uses: src/audit/pipeline-integrity.js (full pipeline validation)
- Uses: src/output/html-generator.js (report compilation)
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
- Input: All agent outputs 0-6
- Output: trust-debt-report.html, 7-audit-log.json

## Action Required

You are Agent 7 in the IntentGuard Trust Debt Pipeline. Your task is to:

1. **Execute your agent logic** using available tools (Read, Write, Grep, etc.)
2. **Update COMS.txt** with your refined understanding
3. **Produce real output files** (not placeholder data)
4. **Ask one critical question** to improve pipeline coherence

**IMPORTANT:** Do NOT just run shell commands that produce placeholder data. Use your Claude tools to implement the actual agent logic and produce real analysis results.

Ready to begin Agent 7 execution!
