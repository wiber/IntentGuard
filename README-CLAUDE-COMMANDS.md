# IntentGuard Claude Agent Commands

## Quick Reference

### 🤖 Interactive Claude Mode (Default)
```bash
# Launch Claude with full agent context - stays in Claude for real work
intentguard 0     # Agent 0: Outcome Requirements Parser  
intentguard 1     # Agent 1: Database Indexer & Keyword Extractor
intentguard 2     # Agent 2: Category Generator & Orthogonality Validator
intentguard 3     # Agent 3: ShortLex Validator & Matrix Builder
intentguard 4     # Agent 4: Grades & Statistics Calculator
intentguard 5     # Agent 5: Timeline & Historical Analyzer
intentguard 6     # Agent 6: Analysis & Narrative Generator
intentguard 7     # Agent 7: Report Generator & Final Auditor
```

### 🔧 Shell Mode (Legacy/Placeholder)
```bash
# Run agent in shell mode - returns placeholder data
intentguard 0 --shell
intentguard 1 --shell
# ... etc
```

### 📊 Pipeline Commands
```bash
# Run full pipeline
intentguard pipeline

# Start from specific agent
intentguard pipeline --from 3
```

### 🎯 Alternative Methods

**NPM Scripts (Claude):**
```bash
npm run c:0    # Same as intentguard 0 (Claude mode)
pnpm c:1       # Same as intentguard 1 (Claude mode)
```

**NPM Scripts (Shell):**
```bash
npm run 0      # Same as intentguard 0 --shell
npm run 1      # Same as intentguard 1 --shell
```

**Explicit Commands:**
```bash
intentguard claude 0    # Explicit Claude launch
intentguard agent 0     # Explicit shell mode
```

## Key Differences

| Mode | Command | Behavior | Output |
|------|---------|----------|--------|
| **Claude** | `intentguard 0` | Launches Claude with context, stays interactive | Real analysis results |
| **Shell** | `intentguard 0 --shell` | Runs in shell, returns immediately | Placeholder JSON |

## What Happens in Claude Mode

1. **Context Building**: Gathers current pipeline state, agent outputs, git status
2. **Claude Launch**: Launches Claude with comprehensive context using `exec claude "$PROMPT"`
3. **Interactive Work**: You stay in Claude and can execute real agent logic
4. **Real Output**: Produces actual analysis results, not placeholder data

## Bootstrap Pattern

Following the same pattern as your other commands:
- `pnpm biz` → SQLite + Claude business analysis
- `pnpm c:copy` → Copy optimization cycle  
- `intentguard 0` → Agent execution with Claude

All use `stdio: 'inherit'` to stay in Claude for continued work.