# CLAUDE: Execute Agent Directly

## When user types "intentguard X":

### STEP 1: Get Agent Context
```bash
./agent-context.sh X
```

### STEP 2: Follow Agent Instructions
Use the JSON instructions from step 1 to:
- Read required files
- Process data using your tools
- Create the specified output file

### STEP 3: Validate Results
Ensure the output file contains real data, not placeholders.

## Example for Agent 0:
User types: `intentguard 0`

You should:
1. Run `./agent-context.sh 0`
2. Read trust-debt-report.html
3. Extract all outcomes and metrics
4. Create 0-outcome-requirements.json with real data

**DO NOT just run `intentguard 0` shell command - that produces placeholders!**