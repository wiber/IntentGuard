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

## Semantic Governance Architecture

IntentGuard operates as a sophisticated **5-pillar semantic governance system** that coordinates multiple agent swarms across orthogonal categories. The Trust Debt pipeline (Agents 0-7) runs within the **A🛡️ Security & Trust Governance** category as part of a larger coordinated ecosystem.

### Current Production Architecture:
- **A🛡️ Security & Trust Governance** (180 units, 21% - EXCELLENT): 8-agent Trust Debt pipeline, SQL database, claude-flow orchestration
- **B⚡ Performance & Optimization** (120 units, 14% - VERY GOOD): Database optimization, algorithm efficiency, resource management  
- **C🎨 User Experience & Interfaces** (280 units, 33% - NEEDS ATTENTION): Visual design, CLI interfaces, documentation UX
- **D🔧 Development & Integration** (80 units, 9% - EXCELLENT): Code quality, multi-agent coordination, JSON validation
- **E💼 Business & Strategy** (200 units, 23% - GOOD): Market analysis, product strategy, competitive advantage

**Current Grade:** B (860 units) - Sophisticated architecture with clear path to Grade A (500 units)

## Multi-Agent Pipeline System (A🛡️.1📊 Trust Debt Analysis)

The Trust Debt pipeline operates within the Security & Trust Governance semantic category. When a user types `intentguard 0` (or any number 0-7), they are requesting to run a specific pipeline agent within this category.

### Agent Commands

**Direct Agent Commands (Claude Interactive):**
- `intentguard 0` → Launch Claude for Agent 0: Outcome Requirements Parser
- `intentguard 1` → Launch Claude for Agent 1: Database Indexer & Keyword Extractor  
- `intentguard 2` → Launch Claude for Agent 2: Category Generator & Orthogonality Validator
- `intentguard 3` → Launch Claude for Agent 3: ShortLex Validator & Matrix Builder
- `intentguard 4` → Launch Claude for Agent 4: Grades & Statistics Calculator
- `intentguard 5` → Launch Claude for Agent 5: Timeline & Historical Analyzer
- `intentguard 6` → Launch Claude for Agent 6: Analysis & Narrative Generator
- `intentguard 7` → Launch Claude for Agent 7: Report Generator & Final Auditor
- `intentguard q` → **Claude Quick Pipeline Mode**: Execute ALL agents 0-7 sequentially using Claude's tools directly with REAL COMS.txt data (not shell commands), stay active after completion, and automatically open the final HTML report

## IMPORTANT: `intentguard q` Execution Protocol

When a user types `intentguard q`, you must:

1. **Get the pipeline instructions**: Run `./agent-context.sh q` first to see the execution plan
2. **Execute agents sequentially**: For each agent 0-7:
   - Run `./agent-context.sh N` to get agent context
   - Read `trust-debt-pipeline-coms.txt` for agent-specific data
   - Use your tools (Read, Write, Grep, etc.) to implement agent logic
   - Produce REAL JSON output files (not placeholder data)
3. **Complete the pipeline**: Generate final `trust-debt-report.html`
4. **Stay active**: Open the HTML report and remain available for questions

**This is CLAUDE CONTEXT EXECUTION** - you use your direct tools to analyze real codebase data and produce legitimate Trust Debt analysis, not shell command placeholders.

**Shell Mode Commands (Legacy):**
- `intentguard 0 --shell` → Run Agent 0 in shell mode (placeholder data)
- `intentguard 1 --shell` → Run Agent 1 in shell mode (placeholder data)
- `intentguard [2-7] --shell` → Run agent in shell mode (placeholder data)

**Pipeline Commands:**
- `intentguard pipeline` → Run full sequential pipeline (0→1→2→3→4→5→6→7)
- `intentguard pipeline --from 3` → Start pipeline from Agent 3

**Claude Bootstrap Scripts:**
- `npm run c:0` through `npm run c:7` → Direct Claude launch with context
- `pnpm c:0` through `pnpm c:7` → Same as above with pnpm

**Alternative Commands:**
- `npm run 0` through `npm run 7` → Local npm script shell versions
- `intentguard claude 0` → Explicit Claude launch command
- `intentguard agent 0` → Explicit agent command format (shell mode)

**Restart & Refocus Commands:**
- `intentguard restart 0` → Complete refocus using restart protocol
- `./agent-context.sh 0 restart` → Context with restart mode  
- **Use when**: Agent needs comprehensive refocus on maintaining + developing + integrating their stage

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