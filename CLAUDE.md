# Claude Instructions for IntentGuard

## IMPORTANT: When User Types "intentguard X"

**IMMEDIATE ACTION REQUIRED:** When a user types `intentguard 0`, `intentguard 1`, etc., they want you to execute that specific pipeline agent directly using your tools.

**DO NOT** just run the shell command - that only produces placeholder data.

**DO THIS INSTEAD:**
1. Run `./agent-context.sh X` to get the agent's full context and instructions
2. **REFINE YOUR UNDERSTANDING** using the Agent Refinement Protocol (see agent-refinement-protocol.md)
3. Follow the agent's specific instructions using your available tools (Read, Write, Grep, etc.)
4. **END WITH ONE CRITICAL QUESTION** to improve pipeline coherence
5. Produce the actual output file specified in the instructions

**IMPORTANT**: When multiple Claude instances run agents simultaneously, each should ask one critical question about their pipeline stage to identify improvements needed for a watertight system.

## Multi-Agent Pipeline System

IntentGuard includes a sophisticated 8-agent pipeline system for Trust Debt analysis. When a user types `intentguard 0` (or any number 0-7), they are requesting to run a specific pipeline agent.

### Agent Commands

**Direct Agent Commands:**
- `intentguard 0` → Run Agent 0: Outcome Requirements Parser
- `intentguard 1` → Run Agent 1: Database Indexer & Keyword Extractor  
- `intentguard 2` → Run Agent 2: Category Generator & Orthogonality Validator
- `intentguard 3` → Run Agent 3: ShortLex Validator & Matrix Builder
- `intentguard 4` → Run Agent 4: Grades & Statistics Calculator
- `intentguard 5` → Run Agent 5: Timeline & Historical Analyzer
- `intentguard 6` → Run Agent 6: Analysis & Narrative Generator
- `intentguard 7` → Run Agent 7: Report Generator & Final Auditor

**Pipeline Commands:**
- `intentguard pipeline` → Run full sequential pipeline (0→1→2→3→4→5→6→7)
- `intentguard pipeline --from 3` → Start pipeline from Agent 3

**Alternative Commands:**
- `npm run 0` through `npm run 7` → Local npm script versions
- `intentguard agent 0` → Explicit agent command format

### Agent System Overview

Each agent is a specialized component in the Trust Debt analysis pipeline:

1. **Agent 0**: Parses existing HTML reports to extract all outcome requirements
2. **Agent 1**: Builds SQLite database index and extracts keywords with hybrid LLM-regex
3. **Agent 2**: Generates semantically orthogonal categories with balanced distribution
4. **Agent 3**: Validates ShortLex sorting and populates presence matrix
5. **Agent 4**: Calculates Trust Debt grades, Process Health scores, legitimacy metrics
6. **Agent 5**: Analyzes timeline evolution and historical trends from git data
7. **Agent 6**: Generates cold spot analysis, asymmetric patterns, actionable recommendations
8. **Agent 7**: Compiles final HTML report and validates entire pipeline integrity

### Agent Configuration

All agents are defined in `trust-debt-pipeline-coms.txt` with:
- Specific keywords and responsibilities
- File paths and internal API mappings
- Validation criteria and success metrics
- Input/output data bucket specifications

### How to Respond

When a user requests `intentguard X`, you have two execution options:

**Option 1: Execute Agent Logic Directly**
1. **Get agent context**: Run `./agent-context.sh X` to get full agent instructions
2. **Parse the context**: Extract agent responsibilities, tools, and validation criteria
3. **Execute using tools**: Use Read, Write, Grep, etc. to implement the agent logic
4. **Produce real output**: Create the actual JSON bucket or HTML report
5. **Validate results**: Ensure output meets the specified criteria

**Option 2: Run Shell Command** 
1. **Execute**: Run `intentguard X` command via Bash tool
2. **Report results**: Show command output and created files
3. **Note limitations**: Shell version produces placeholder data only

**Recommended: Use Option 1** for real agent work that produces actual analysis results.

### Pipeline Data Flow

Each agent produces an auditable JSON output bucket:
- `0-outcome-requirements.json` (Agent 0 output)
- `1-indexed-keywords.json` (Agent 1 output)
- `2-categories-balanced.json` (Agent 2 output)
- `3-presence-matrix.json` (Agent 3 output)
- `4-grades-statistics.json` (Agent 4 output)
- `5-timeline-history.json` (Agent 5 output)
- `6-analysis-narratives.json` (Agent 6 output)
- `trust-debt-report.html` (Agent 7 final output)

### Development Context

This pipeline system transforms IntentGuard from a monolithic tool into a transparent, auditable, self-healing multi-agent system where each stage validates its inputs and produces verifiable outputs for downstream processing.

When users reference agent numbers, they're working with this sophisticated pipeline architecture designed for legitimacy, maintainability, and reproducible Trust Debt analysis.