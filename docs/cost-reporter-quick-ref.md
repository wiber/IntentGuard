# CostReporter Quick Reference

## Pricing Table

| Model Type | Input Cost | Output Cost | Notes |
|------------|-----------|-------------|-------|
| Claude Sonnet | $3/1M tokens | $15/1M tokens | High quality |
| Claude Haiku | $0.25/1M tokens | $1.25/1M tokens | Fast & cheap |
| Ollama (all) | ~$0.0001/1K tokens | ~$0.0001/1K tokens | Electricity estimate |

## Budget Alert Thresholds

| Sovereignty Level | Status | Daily Threshold | Use Case |
|------------------|--------|----------------|----------|
| 0.0 - 0.3 | 🔴 Critical | $1.00/day | Bootstrap/testing |
| 0.3 - 0.6 | 🟡 Warning | $5.00/day | Development |
| 0.6 - 1.0 | 🟢 Healthy | $20.00/day | Production |

## Command Quick Reference

```typescript
// Track inference
reporter.trackInferenceCost('claude-sonnet', 5000, 2000);

// Daily report
const report = reporter.generateDailyReport();

// Weekly report
const weekReport = reporter.generateWeeklyReport();

// Discord format
const msg = reporter.formatForDiscord(report);

// Add revenue
reporter.addRevenue('consulting', 100, 'Client payment');

// Budget alert
const alert = reporter.checkAndAlert(0.5);
```

## Cost Calculation Examples

### Example 1: Claude Sonnet Call
- Input: 5,000 tokens
- Output: 2,000 tokens
- Cost: (5000/1M × $3) + (2000/1M × $15) = **$0.045**

### Example 2: Claude Haiku Call
- Input: 10,000 tokens
- Output: 3,000 tokens
- Cost: (10000/1M × $0.25) + (3000/1M × $1.25) = **$0.00625**

### Example 3: Ollama Model
- Input: 1,000 tokens
- Output: 500 tokens
- Cost: (1500/1000 × $0.0001) = **$0.00015**

## Report Format

```
╔════════════════════════════════════════╗
║     WALLET REPORT — COST ANALYSIS      ║
╚════════════════════════════════════════╝

Period: 2026-02-14 → 2026-02-14
Days: 1

──────────────────────────────────────────
Total Income:   $100.0000
Total Expenses: $0.0456
Net Balance:    $99.9544
──────────────────────────────────────────

BY CATEGORY:
  revenue-consulting             +$100.0000
  inference-claude-sonnet        -$0.0450
  inference-claude-haiku         -$0.0006

TOP EXPENSES:
  2026-02-14 $0.0450 claude-sonnet-4-5: 5000 in + 2000...
  2026-02-14 $0.0006 claude-haiku: 10000 in + 3000 out...

✅ 3 transactions over 1 day(s) | Average daily spend: $0.0456 | Net positive: +$99.9544
```

## Integration Patterns

### Pattern 1: Automatic Tracking
```typescript
async function callLLM(model: string, prompt: string) {
  const response = await llm.complete(prompt);
  reporter.trackInferenceCost(model, response.inputTokens, response.outputTokens);
  return response;
}
```

### Pattern 2: Hourly Budget Check
```typescript
setInterval(() => {
  const alert = reporter.checkAndAlert(sovereignty);
  if (alert) notifyAdmin(alert);
}, 3600000);
```

### Pattern 3: Weekly Discord Report
```typescript
// Every Monday at 9am
if (isMonday() && hour === 9) {
  const report = reporter.generateWeeklyReport();
  await discord.sendToChannel(channelId, reporter.formatForDiscord(report));
}
```

## File Structure

```
data/
  wallet-ledger.jsonl          # Transaction log (JSONL format)

src/skills/
  cost-reporter.ts             # Main CostReporter class

docs/
  cost-reporter-usage.md       # Full documentation
  cost-reporter-quick-ref.md   # This file

test-cost-reporter.ts          # Test suite
```

## Testing

```bash
# Run full test suite
npx tsx test-cost-reporter.ts

# Type check
npx tsc --noEmit src/skills/cost-reporter.ts

# View ledger
cat data/wallet-ledger.jsonl | jq .
```

## Common Issues

| Problem | Solution |
|---------|----------|
| "Ledger not found" | Run `initialize()` first |
| "Wrong costs" | Verify model name matches pricing keys |
| "Empty report" | Check date range and ledger contents |
| "Alert not firing" | Verify sovereignty level and daily spend |

## Pro Tips

1. **Use Haiku for simple tasks** - 5x cheaper than Sonnet
2. **Batch requests** to reduce per-call overhead
3. **Review weekly reports** to spot trends
4. **Set sovereignty conservatively** when starting
5. **Track revenue** to calculate true ROI
