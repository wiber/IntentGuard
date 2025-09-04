# AGENT REFINEMENT PROTOCOL

## For Each Claude Instance (intentguard 0-7)

When you run `intentguard X`, you are Agent X in the Trust Debt Pipeline. Your task is to:

### PHASE 1: UNDERSTAND YOUR ROLE
1. **Read** your context from the COMS.txt file
2. **Analyze** your current responsibilities and tools
3. **Study** the chat specifications for the pipeline architecture
4. **Review** existing outputs from previous agents (if Agent 1-7)

### PHASE 2: LEARN FROM OTHERS
1. **Read** other agents' output files to understand data flow:
   - Agent 0: `0-outcome-requirements.json`
   - Agent 1: `1-indexed-keywords.json`
   - Agent 2: `2-categories-balanced.json`
   - Agent 3: `3-presence-matrix.json`
   - Agent 4: `4-grades-statistics.json`
   - Agent 5: `5-timeline-history.json`
   - Agent 6: `6-analysis-narratives.json`
   - Agent 7: `trust-debt-report.html`

2. **Identify** potential gaps or misalignments in data flow
3. **Understand** what your downstream agents need from you

### PHASE 3: REFINE YOUR UNDERSTANDING
1. **Define** your exact input validation criteria
2. **Specify** your output data structure requirements  
3. **Identify** error conditions and recovery mechanisms
4. **Clarify** tool access and permission needs
5. **Optimize** for pipeline performance and coherence

### PHASE 4: UPDATE THE COMS.TXT FILE
**CRITICAL**: Update `trust-debt-pipeline-coms.txt` with your refined understanding:

1. **Find your agent section** (e.g., "AGENT 2: CATEGORY GENERATOR")
2. **Add a "REFINED UNDERSTANDING" subsection** with:
   - Specific input validation requirements
   - Exact output JSON structure  
   - Tool requirements and access patterns
   - Error detection and recovery mechanisms
   - Performance optimizations discovered
3. **Use the Edit tool** to update your section in the COMS.txt file
4. **Preserve other agents' sections** - only modify your own

**Example Update:**
```
AGENT 2: CATEGORY GENERATOR & ORTHOGONALITY VALIDATOR
[existing content...]

REFINED UNDERSTANDING (Updated by Agent 2):
- Input validation: Requires min 1000 keywords from Agent 1 for statistical significance  
- Output structure: JSON with categories array, health_metrics object, recommendations array
- Tool requirements: Need Bash access for SQLite queries, Write for JSON output
- Error detection: CV > 0.30 triggers rebalancing, orthogonality < 0.95 triggers regeneration
- Performance: Use SQLite indexes for keyword counting, cache similarity calculations
```

### PHASE 4: ASK ONE CRITICAL QUESTION
End with **exactly one question** that will make your pipeline stage watertight:

**Format:**
```
🔍 CRITICAL QUESTION FOR PIPELINE IMPROVEMENT:

[Your specific question about validation, data structure, error handling, tools, or coherence]

📋 SUBSTANTIATION:
- Current gap: [What specific problem this addresses]
- Impact: [How this affects downstream agents]
- Risk if unaddressed: [What could break in the pipeline]
- Proposed solution direction: [Your initial thoughts on resolution]
```

### EXAMPLE (Agent 3):
```
🔍 CRITICAL QUESTION FOR PIPELINE IMPROVEMENT:

Should I auto-correct ShortLex sorting errors silently, or halt the pipeline and require Agent 2 to fix category ordering before proceeding?

📋 SUBSTANTIATION:
- Current gap: COMS.txt says "auto-correct and log" but doesn't specify failure thresholds
- Impact: Agent 4 needs mathematically correct matrix for grade calculations
- Risk if unaddressed: Invalid grades could propagate through entire pipeline
- Proposed solution direction: Define error severity levels with different handling strategies
```

### SUCCESS CRITERIA:
Your question should make the **entire pipeline more robust** by addressing a specific weakness in your stage that could cascade to other agents.

## COORDINATION GOAL:
All 8 agents running simultaneously will identify the **8 most critical pipeline improvements** needed for a watertight system.