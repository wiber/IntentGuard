# CostReporter Usage Guide

## Overview

The **CostReporter** skill tracks inference costs, generates financial reports, and provides budget alerts for the IntentGuard wallet system. It supports both local Ollama models (electricity estimates) and Claude API models (actual API costs).

## Features

1. **Inference Cost Tracking**
   - Ollama models: ~$0.0001 per 1K tokens (electricity estimate)
   - Claude Sonnet: $3/1M input, $15/1M output tokens
   - Claude Haiku: $0.25/1M input, $1.25/1M output tokens

2. **Financial Reports**
   - Daily reports with category breakdowns
   - Weekly reports (7-day rolling window)
   - Top expense tracking
   - Income vs expense analysis

3. **Budget Alerts**
   - Sovereignty-based thresholds
   - Automatic overspending detection
   - Category-wise spending breakdown

4. **Data Storage**
   - JSONL ledger format (append-only for audit trail)
   - Located at: `data/wallet-ledger.jsonl`
   - No external dependencies

## API Reference

### Methods

#### `trackInferenceCost(model: string, inputTokens: number, outputTokens: number): Transaction`

Tracks the cost of an inference operation.

**Parameters:**
- `model`: Model name (e.g., "claude-sonnet", "claude-haiku", "llama3.2")
- `inputTokens`: Number of input tokens
- `outputTokens`: Number of output tokens

**Returns:** Transaction object with calculated cost

**Example:**
```typescript
const tx = reporter.trackInferenceCost('claude-sonnet-4-5', 5000, 2000);
// Cost: $0.045 ($0.015 input + $0.030 output)
```

#### `generateDailyReport(date?: string): Report`

Generates a financial report for a specific day.

**Parameters:**
- `date` (optional): Date string (ISO format). Defaults to today.

**Returns:** Report object with summary and breakdowns

**Example:**
```typescript
const report = reporter.generateDailyReport('2026-02-14');
console.log(`Total spent: $${report.totalSpent}`);
console.log(`Net balance: $${report.netBalance}`);
```

#### `generateWeeklyReport(): Report`

Generates a financial report for the last 7 days.

**Returns:** Report object covering 7-day period

**Example:**
```typescript
const report = reporter.generateWeeklyReport();
console.log(`7-day spend: $${report.totalSpent}`);
```

#### `formatForDiscord(report: Report): string`

Formats a report for Discord display with ASCII art borders.

**Parameters:**
- `report`: Report object from `generateDailyReport()` or `generateWeeklyReport()`

**Returns:** Discord-friendly formatted string

**Example:**
```typescript
const report = reporter.generateDailyReport();
const formatted = reporter.formatForDiscord(report);
await discord.sendToChannel(channelId, formatted);
```

#### `addRevenue(source: string, amount: number, description: string): Transaction`

Records revenue (stub for future expansion).

**Parameters:**
- `source`: Revenue source identifier
- `amount`: Revenue amount in USD
- `description`: Human-readable description

**Returns:** Transaction object

**Example:**
```typescript
const tx = reporter.addRevenue('consulting', 100.00, 'Client project payment');
```

#### `checkAndAlert(sovereignty: number): string | null`

Checks budget and returns alert message if overspending.

**Parameters:**
- `sovereignty`: Economic sovereignty level (0.0 - 1.0)

**Returns:** Alert message string or null if within budget

**Thresholds:**
- 0.0-0.3 (🔴 Critical): Alert at $1/day
- 0.3-0.6 (🟡 Warning): Alert at $5/day
- 0.6-1.0 (🟢 Healthy): Alert at $20/day

**Example:**
```typescript
const alert = reporter.checkAndAlert(0.2);
if (alert) {
  console.log('BUDGET ALERT:', alert);
}
```

## Command Interface

The CostReporter can be invoked via the `execute()` method with action commands:

### Track Inference

```typescript
await reporter.execute({
  action: 'track-inference',
  model: 'claude-sonnet',
  inputTokens: 5000,
  outputTokens: 2000
}, ctx);
```

### Daily Report

```typescript
await reporter.execute({
  action: 'daily-report',
  date: '2026-02-14' // optional
}, ctx);
```

### Weekly Report

```typescript
await reporter.execute({
  action: 'weekly-report'
}, ctx);
```

### Add Revenue

```typescript
await reporter.execute({
  action: 'add-revenue',
  source: 'consulting',
  amount: 100.00,
  description: 'Client payment'
}, ctx);
```

### Check Budget

```typescript
await reporter.execute({
  action: 'check-budget',
  sovereignty: 0.5
}, ctx);
```

## Data Format

### Transaction Type

```typescript
interface Transaction {
  timestamp: number;        // Unix timestamp (ms)
  type: 'income' | 'expense';
  amount: number;           // USD amount
  category: string;         // e.g., "inference-claude-sonnet"
  description: string;      // Human-readable description
  model?: string;           // Model name (for inference)
}
```

### Report Type

```typescript
interface Report {
  summary: string;                      // Human-readable summary
  totalSpent: number;                   // Total expenses
  totalIncome: number;                  // Total income
  netBalance: number;                   // Income - expenses
  byCategory: Record<string, number>;   // Category breakdown
  topExpenses: Transaction[];           // Sorted by amount
  period: {
    start: string;                      // ISO date
    end: string;                        // ISO date
    days: number;                       // Number of days
  };
}
```

### JSONL Ledger Format

Each line in `data/wallet-ledger.jsonl` is a JSON transaction:

```json
{"timestamp":1739577600000,"type":"expense","amount":0.045,"category":"inference-claude-sonnet","description":"claude-sonnet-4-5: 5000 in + 2000 out tokens","model":"claude-sonnet-4-5"}
{"timestamp":1739577601000,"type":"income","amount":100.00,"category":"revenue-consulting","description":"Client project payment"}
```

## Testing

Run the test suite:

```bash
npx tsx test-cost-reporter.ts
```

This will:
1. Track various inference types (Ollama, Claude Sonnet, Claude Haiku)
2. Add revenue
3. Generate daily and weekly reports
4. Test Discord formatting
5. Verify budget alerts at different sovereignty levels

## Integration Example

```typescript
import CostReporter from './src/skills/cost-reporter.js';

// Initialize
const reporter = new CostReporter();
await reporter.initialize(ctx);

// Track inference after every LLM call
async function callLLM(model: string, prompt: string) {
  const response = await llm.complete(prompt);

  // Track cost
  reporter.trackInferenceCost(
    model,
    response.inputTokens,
    response.outputTokens
  );

  return response;
}

// Daily budget check
setInterval(async () => {
  const alert = reporter.checkAndAlert(currentSovereignty);
  if (alert && ctx.discord) {
    await ctx.discord.sendToChannel(alertChannelId, alert);
  }
}, 3600000); // Every hour

// Weekly report (Monday mornings)
if (new Date().getDay() === 1) {
  const report = reporter.generateWeeklyReport();
  const formatted = reporter.formatForDiscord(report);
  await ctx.discord.sendToChannel(reportChannelId, formatted);
}
```

## Pricing Updates

To update model pricing, edit the `PRICING` constant in `cost-reporter.ts`:

```typescript
const PRICING = {
  'claude-sonnet': { input: 3.00, output: 15.00 },
  'claude-haiku': { input: 0.25, output: 1.25 },
  'ollama': { perTokenK: 0.0001 }
};
```

## Best Practices

1. **Always track inference costs** immediately after LLM calls
2. **Set appropriate sovereignty levels** based on your budget constraints
3. **Review weekly reports** to identify spending patterns
4. **Monitor budget alerts** to avoid unexpected overspending
5. **Keep the ledger file** for audit trails and historical analysis

## Troubleshooting

### Ledger file not created
- Ensure `data/` directory exists
- Check file permissions
- Verify initialize() was called

### Incorrect cost calculations
- Verify model name matches expected patterns
- Check token counts are accurate
- Review PRICING constants

### Reports show zero transactions
- Confirm ledger file exists and has data
- Check date range parameters
- Verify timestamp format is correct

## Future Enhancements

1. **Revenue tracking expansion** with source categories
2. **Budget forecasting** based on historical trends
3. **Cost optimization suggestions** (e.g., switch to Haiku)
4. **Integration with accounting systems** (QuickBooks, Xero)
5. **Multi-currency support** for international deployments
