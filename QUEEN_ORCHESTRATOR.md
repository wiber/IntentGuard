# Queen Orchestrator - Pipeline Controller System

The Queen Orchestrator (`intentguard q`) is the Pipeline Controller that manages the complete Trust Debt analysis pipeline with validation, integration, and iterative refinement capabilities.

## Overview

The Queen Orchestrator transforms IntentGuard from a collection of individual agent scripts into a **self-correcting, fully automated system** that:

1. **Sequential Execution**: Runs each agent (0-7) in order with proper validation
2. **Claude Integration**: Launches Claude with comprehensive context for each agent
3. **Validation Hand-off**: Validates each agent's output before proceeding
4. **Dynamic Code Integration**: Automatically integrates agent outputs into the codebase
5. **Pipeline Coherence**: Ensures all agents work together as a unified system

## Usage

### Basic Commands

```bash
# Run full pipeline with Claude agents
intentguard q

# Validate current pipeline state only
intentguard q --validate-only

# Run specific agent range  
intentguard q --from 2 --to 5

# NPM shortcuts
npm run q
npm run queen
```

### Command Options

- `--validate-only`: Only validate current pipeline state without execution
- `--from <agent>`: Start from specific agent (default: 0)
- `--to <agent>`: End at specific agent (default: 7)
- `-d, --dir <path>`: Project directory (default: current)

## How It Works

### 1. Pipeline Validation

Before execution, the Queen validates:
- ✅ `trust-debt-report.html` exists and is substantial
- ✅ `trust-debt-pipeline-coms.txt` configuration is present
- ✅ `agent-context.sh` script is available
- ✅ Existing agent output files are valid JSON

### 2. Agent Execution Flow

For each agent (0-7), the Queen:

1. **Prepares Context**: Creates Queen-specific context file
2. **Launches Claude**: Uses existing `claude-agent-bootstrap.sh` mechanism
3. **Interactive Mode**: Claude runs with full agent context and tools
4. **Validates Output**: Checks that expected output files are created
5. **Integrates Code**: Modifies trust-debt-*.js files to use agent bucket data
6. **Continues Pipeline**: Moves to next agent with validation results

### 3. Color-Coded Agent Display

Each agent has a unique color for easy visual tracking:
- 🟦 **Agent 0** (Cyan): Outcome Requirements Parser
- 🟩 **Agent 1** (Green): Database Indexer & Keyword Extractor
- 🟨 **Agent 2** (Yellow): Category Generator & Orthogonality Validator
- 🟦 **Agent 3** (Blue): ShortLex Validator & Matrix Builder
- 🟪 **Agent 4** (Magenta): Grades & Statistics Calculator
- 🟥 **Agent 5** (Red): Timeline & Historical Analyzer
- ⬜ **Agent 6** (Gray): Analysis & Narrative Generator
- ⬜ **Agent 7** (White): Report Generator & Final Auditor

## Dynamic Code Integration

The Queen's key innovation is **Dynamic Code Integration** - automatically modifying IntentGuard's core files to use agent bucket data instead of hardcoded values:

### Agent 0: Outcome Requirements
- **Output**: `0-outcome-requirements.json`
- **Integrates into**: `trust-debt-final.js`, `trust-debt-html-generator.js`
- **Purpose**: Load outcome requirements from bucket

### Agent 1: Keywords & Database
- **Output**: `1-indexed-keywords.json`
- **Integrates into**: `trust-debt-matrix-generator.js`, `trust-debt-final.js`
- **Purpose**: Use keyword bucket for SQLite and extraction logic

### Agent 2: Categories & Balance
- **Output**: `2-categories-balanced.json`
- **Integrates into**: `trust-debt-matrix-generator.js`, `trust-debt-final.js`
- **Purpose**: Apply balanced categories to matrix generation

### Agent 3: Matrix & ShortLex
- **Output**: `3-presence-matrix.json`
- **Integrates into**: `trust-debt-final.js`, `trust-debt-matrix-generator.js`
- **Purpose**: Use matrix data for core trust-debt calculations

### Agent 4: Grades & Statistics
- **Output**: `4-grades-statistics.json`
- **Integrates into**: `trust-debt-final.js`, `trust-debt-html-generator.js`
- **Purpose**: Apply grade calculations to final scoring

### Agent 5: Timeline & History
- **Output**: `5-timeline-history.json`
- **Integrates into**: `trust-debt-html-generator.js`, `trust-debt-final.js`
- **Purpose**: Include timeline analysis in historical reporting

### Agent 6: Analysis & Narratives
- **Output**: `6-analysis-narratives.json`
- **Integrates into**: `trust-debt-html-generator.js`, `trust-debt-final.js`
- **Purpose**: Add analysis narratives to report generation

### Agent 7: Final Report
- **Output**: `trust-debt-report.html`
- **Validation**: Checks report size and content quality
- **Purpose**: Final comprehensive Trust Debt report

## Queen Orchestrator Features

### Validation System
- Validates JSON structure and content for all agent outputs
- Checks file sizes and basic content requirements
- Ensures pipeline coherence across agent handoffs

### Integration Tracking
- Records all code modification actions taken
- Logs integration status for debugging
- Provides detailed action reports

### Error Recovery
- Identifies failed agents with specific error messages
- Provides troubleshooting suggestions
- Allows partial pipeline execution with `--from` and `--to`

### Comprehensive Reporting
- Generates `queen-orchestrator-report.json` with full pipeline status
- Includes validation results, integration status, and recommendations
- Tracks output file sizes and agent completion metrics

## Architecture Benefits

### Self-Correcting Pipeline
The Queen enables the pipeline to:
- **Detect Empty Reports**: Catches when trust-debt-report.html is suspiciously small
- **Validate Agent Outputs**: Ensures all JSON buckets contain real data
- **Iterative Refinement**: Each run improves pipeline coherence
- **Code Integration**: Eliminates hardcoded values through dynamic bucket loading

### Centralized Control
- **Single Command**: Run entire pipeline with `intentguard q`
- **Traceable Execution**: Complete audit trail of all agent actions
- **Quality Gates**: Each agent must pass validation before proceeding
- **Self-Healing**: System adapts and improves with each execution

### Claude Integration
- **Interactive Agents**: Each agent runs in Claude with full context
- **Real Analysis**: No placeholder data - agents produce actual results
- **Context Sharing**: Agents learn from previous agent outputs
- **Critical Questions**: Each agent contributes pipeline improvement insights

## Files Created

The Queen Orchestrator creates several files during execution:

- `.queen-context-agent-N.md`: Queen-specific context for each agent
- `queen-orchestrator-report.json`: Complete pipeline execution report
- `logs/claude-agent-N-context-TIMESTAMP.md`: Agent context logs (from bootstrap)

## Troubleshooting

### Common Issues

1. **Empty Report Error**
   - Ensure `trust-debt-report.html` exists and is > 1KB
   - Run `intentguard analyze` first to generate initial report

2. **Agent Validation Failures**
   - Check that agent output files are valid JSON
   - Verify agents are producing real data, not placeholders

3. **Claude Launch Issues**
   - Ensure Claude CLI is installed: `npm install -g @anthropic/claude-cli`
   - Verify `scripts/claude-agent-bootstrap.sh` exists and is executable

4. **Integration Failures**
   - Check that target files in `src/` directory exist
   - Review integration actions in Queen report for details

## Comparison to Pipeline Command

| Feature | `intentguard pipeline` | `intentguard q` (Queen) |
|---------|----------------------|--------------------------|
| Execution | Shell scripts with placeholder data | Claude agents with real analysis |
| Validation | Basic completion check | Comprehensive JSON and content validation |
| Integration | Manual code updates required | Automatic dynamic code integration |
| Error Handling | Stops on first failure | Detailed error reporting and recovery |
| Agent Context | Limited context sharing | Full pipeline state and agent learning |
| Output Quality | Placeholder/demo data | Real analysis with quality gates |

The Queen Orchestrator represents the **final evolution** of the IntentGuard pipeline system - transforming it from a collection of scripts into a self-organizing, self-correcting, intelligent multi-agent system.