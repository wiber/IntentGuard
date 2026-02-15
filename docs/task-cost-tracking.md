# Task-Level Inference Cost Tracking

**Status:** ✅ Complete
**Phase:** Phase 6 — Economic Sovereignty (Wallet Skill)
**Feature:** Track inference costs per task (Ollama electricity estimate, API credits)

## Overview

IntentGuard now tracks inference costs at **task granularity** — every agent execution, skill invocation, command, pipeline run, and CEO loop operation is tracked with precise cost attribution.

### Key Features

1. **Per-Task Cost Attribution** - Track costs by task ID, not just daily totals
2. **Ollama Electricity Estimates** - Calculate real electricity consumption (kWh) and cost for local inference
3. **API Credit Tracking** - Precise token-based pricing for Claude, GPT-4, and other API models
4. **Cost Breakdown Reports** - View costs by task type, model, backend, and time period
5. **Integration with Wallet Ledger** - Seamless integration with existing economic sovereignty system

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Task Cost Tracker                          │
│  (src/skills/task-cost-tracker.ts)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─> data/task-costs.jsonl (append-only log)
                            │
                            ├─> Integrates with:
                            │   • wallet-ledger.ts (economic sovereignty)
                            │   • cost-reporter.ts (daily/weekly P&L)
                            │   • llm-controller.ts (3-tier routing)
                            │
                            └─> Used by:
                                • Agent pipeline (Agents 0-7)
                                • CEO loop & night shift
                                • Skill invocations
                                • Discord commands
```

## Cost Calculation

### Claude API Models

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| claude-opus-4 | $15.00 | $75.00 |
| claude-sonnet-4 | $3.00 | $15.00 |
| claude-haiku-4 | $0.25 | $1.25 |

### OpenAI API Models

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| gpt-4 | $30.00 | $60.00 |
| gpt-3.5 | $1.50 | $2.00 |

### Ollama (Local Inference)

**API Cost:** $0 (free local inference)
**Electricity Cost:** Calculated based on:
- **GPU Power Draw:** 300W (average during inference)
- **Throughput:** 100 tokens/sec (conservative estimate)
- **Electricity Rate:** $0.15/kWh (US average)

**Formula:**
```typescript
timeSeconds = totalTokens / 100
energyKWh = (300W * timeSeconds) / (1000 * 3600)
costUSD = energyKWh * 0.15
```

**Example:** 15,000 token inference
- Time: 15,000 / 100 = 150 seconds
- Energy: (300 * 150) / 3,600,000 = 0.0125 kWh
- Cost: 0.0125 * $0.15 = **$0.001875** (~0.2¢)

## Usage

### Basic Tracking

```typescript
import TaskCostTracker from './skills/task-cost-tracker.js';

const tracker = new TaskCostTracker();

// Track an agent execution
const entry = tracker.trackTaskInference(
  'agent-0-run-1',           // taskId
  'agent',                    // taskType
  'Agent 0: Outcome Parser',  // taskName
  'claude-sonnet-4-5',        // model
  'anthropic-api',            // backend
  50000,                      // inputTokens
  25000,                      // outputTokens
  {                           // optional metadata
    agentNumber: 0,
    userId: 'user123',
    complexity: 3,
    latencyMs: 1234
  }
);

console.log(`Cost: $${entry.costUSD}`);
// Cost: $0.525
```

### Get Task Summary

```typescript
// Get aggregated cost for a specific task
const summary = tracker.getTaskSummary('agent-0-run-1');

console.log(`Task: ${summary.taskName}`);
console.log(`Total Cost: $${summary.totalCost}`);
console.log(`Inferences: ${summary.inferenceCount}`);
console.log(`Avg Cost: $${summary.avgCostPerInference}`);
console.log(`Total Tokens: ${summary.totalTokens}`);
console.log(`Electricity: ${summary.electricityKWh} kWh`);
console.log(`Models: ${Object.keys(summary.models).join(', ')}`);
```

### Daily Cost Breakdown

```typescript
// Get today's cost breakdown
const dailyBreakdown = tracker.getDailyBreakdown();

console.log('=== Daily Cost Breakdown ===');
console.log(`Total Cost: $${dailyBreakdown.totalCost}`);
console.log(`Total Electricity: ${dailyBreakdown.totalElectricity} kWh`);

console.log('\nBy Task Type:');
for (const [type, cost] of Object.entries(dailyBreakdown.byTaskType)) {
  console.log(`  ${type}: $${cost.toFixed(4)}`);
}

console.log('\nBy Model:');
for (const [model, cost] of Object.entries(dailyBreakdown.byModel)) {
  console.log(`  ${model}: $${cost.toFixed(4)}`);
}

console.log('\nTop 5 Tasks by Cost:');
for (const task of dailyBreakdown.byTask.slice(0, 5)) {
  console.log(`  ${task.taskName}: $${task.totalCost.toFixed(4)} (${task.inferenceCount} inferences)`);
}
```

### Weekly Cost Breakdown

```typescript
const weeklyBreakdown = tracker.getWeeklyBreakdown();

console.log('=== Weekly Cost Report (Last 7 Days) ===');
console.log(`Total Spent: $${weeklyBreakdown.totalCost.toFixed(2)}`);
console.log(`Electricity: ${weeklyBreakdown.totalElectricity.toFixed(4)} kWh`);
console.log(`Tasks Tracked: ${weeklyBreakdown.byTask.length}`);

// Calculate average daily spend
const avgDaily = weeklyBreakdown.totalCost / 7;
console.log(`Average Daily: $${avgDaily.toFixed(2)}`);
```

## Integration Examples

### Agent Pipeline Integration

```typescript
// In src/pipeline/runner.ts
import TaskCostTracker from '../skills/task-cost-tracker.js';

const tracker = new TaskCostTracker();

async function runAgent(agentNumber: number, input: string) {
  const taskId = `pipeline-${Date.now()}-agent-${agentNumber}`;

  // Call LLM
  const response = await callClaude(input);

  // Track cost
  tracker.trackTaskInference(
    taskId,
    'agent',
    `Agent ${agentNumber}`,
    'claude-sonnet-4-5',
    'anthropic-api',
    response.usage.input_tokens,
    response.usage.output_tokens,
    { agentNumber }
  );

  return response.output;
}
```

### CEO Loop Integration

```typescript
// In src/ceo-loop.ts
import TaskCostTracker from './skills/task-cost-tracker.js';

const tracker = new TaskCostTracker();

async function ceoLoopIteration(task: string) {
  const taskId = `ceo-loop-${Date.now()}`;

  // Try Ollama first (cheap)
  const ollamaResponse = await callOllama(task);
  tracker.trackTaskInference(
    taskId,
    'ceo-loop',
    'Strategic Planning',
    'llama3.2:1b',
    'ollama',
    estimateTokens(task),
    estimateTokens(ollamaResponse),
    { complexity: 2 }
  );

  // Escalate to Claude if needed
  if (needsReasoning(ollamaResponse)) {
    const claudeResponse = await callClaude(task);
    tracker.trackTaskInference(
      taskId,
      'ceo-loop',
      'Strategic Planning',
      'claude-sonnet-4-5',
      'anthropic-api',
      claudeResponse.usage.input_tokens,
      claudeResponse.usage.output_tokens,
      { complexity: 4 }
    );
  }
}
```

### Skill Invocation Integration

```typescript
// In src/skills/voice-memo-reactor.ts
import TaskCostTracker from './task-cost-tracker.js';

const tracker = new TaskCostTracker();

async function processVoiceMemo(audioUrl: string) {
  const taskId = `voice-memo-${Date.now()}`;

  // Transcribe with Whisper (local, electricity only)
  const transcript = await whisper(audioUrl);
  tracker.trackTaskInference(
    taskId,
    'skill',
    'voice-memo-reactor',
    'whisper-large-v3',
    'whisper-local',
    0,
    estimateTokens(transcript)
  );

  // Categorize with Ollama
  const category = await categorize(transcript);
  tracker.trackTaskInference(
    taskId,
    'skill',
    'voice-memo-reactor',
    'llama3.2:1b',
    'ollama',
    estimateTokens(transcript),
    estimateTokens(category)
  );
}
```

## Cost Optimization Strategies

### 1. Tier-Based Routing (Already Implemented)

Use `llm-controller.ts` 3-tier routing:
- **Tier 1:** Ollama (complexity ≤ 2) - Free local inference
- **Tier 2:** Claude Sonnet (complexity 3-4) - $3-15 per 1M tokens
- **Tier 3:** Human review (complexity > 4) - Manual escalation

### 2. Cost Monitoring & Alerts

```typescript
// Check if agent is exceeding budget
const summary = tracker.getTaskSummary('agent-pipeline-today');
if (summary.totalCost > 5.00) {
  console.warn(`⚠️ Pipeline cost exceeded $5: $${summary.totalCost}`);
  // Switch to Ollama for remaining agents
}
```

### 3. Electricity-Aware Scheduling

```typescript
// Schedule heavy Ollama inference during off-peak hours
const breakdown = tracker.getDailyBreakdown();
if (breakdown.totalElectricity > 1.0) { // 1 kWh threshold
  console.log('High electricity usage detected, deferring non-urgent tasks');
}
```

## Data Storage

### Log File Format (JSONL)

```jsonl
{"timestamp":"2026-02-15T10:30:00Z","taskId":"agent-0-run-1","taskType":"agent","taskName":"Agent 0: Outcome Parser","model":"claude-sonnet-4-5","backend":"anthropic-api","inputTokens":50000,"outputTokens":25000,"costUSD":0.525,"metadata":{"agentNumber":0,"complexity":3}}
{"timestamp":"2026-02-15T10:31:00Z","taskId":"agent-1-run-1","taskType":"agent","taskName":"Agent 1: Database Indexer","model":"llama3.2:1b","backend":"ollama","inputTokens":10000,"outputTokens":5000,"costUSD":0,"electricityKWh":0.0125,"metadata":{"agentNumber":1}}
```

**Path:** `data/task-costs.jsonl`
**Format:** Append-only JSONL (JSON Lines)
**Retention:** Permanent (audit trail)

## Testing

Run comprehensive test suite:

```bash
npm test src/skills/task-cost-tracker.test.ts
```

**Test Coverage:**
- ✅ Cost calculation for all model types
- ✅ Electricity estimation for Ollama
- ✅ Task summary aggregation
- ✅ Cost breakdown by type/model/backend
- ✅ Daily/weekly reporting
- ✅ Metadata tracking
- ✅ Edge cases (zero tokens, huge tokens, unknown models)
- ✅ Integration scenarios (pipeline, CEO loop, hybrid usage)

## Future Enhancements

1. **Real-Time Cost Dashboard** - Web UI for live cost monitoring
2. **Cost Predictions** - ML model to predict task costs before execution
3. **Budget Enforcement** - Hard limits per task type with auto-throttle
4. **Cost Attribution to Users** - Track spending per Discord user
5. **Electricity Optimization** - Schedule heavy inference during cheap electricity hours
6. **Carbon Footprint Tracking** - Convert electricity to CO2 emissions

## Related Documentation

- [Cost Reporter](../src/skills/cost-reporter.ts) - Daily/weekly P&L reports
- [Wallet Ledger](../src/skills/wallet-ledger.ts) - Transaction log and budget alerts
- [LLM Controller](../src/skills/llm-controller.ts) - 3-tier routing with cost governance
- [Migration Spec](../intentguard-migration-spec.html) - Phase 6 requirements

## Questions?

See existing tests for comprehensive usage examples. All cost tracking is **append-only** for audit trail integrity.
