# Cost Report Scheduler

**Location:** `src/cron/cost-report-scheduler.ts`

**Phase:** Phase 6 — Economic Sovereignty (Wallet Skill)

## Overview

The Cost Report Scheduler automatically posts daily and weekly P&L reports to the `#trust-debt-public` Discord channel. This provides transparent, public financial accountability showing exactly how much the bot is spending on inference costs.

## Features

- **Daily Reports**: Posted every day at 11:30 PM with full P&L breakdown
- **Weekly Reports**: Posted every Sunday at 11:45 PM with 7-day overview
- **Category Breakdown**: Shows spending by model type (Opus, Sonnet, Haiku, Ollama)
- **Top Expenses**: Highlights the most expensive inference calls
- **Budget Health**: Displays budget limits and sovereignty adjustments
- **Revenue Tracking**: Includes income from future revenue sources
- **Discord Integration**: Posts formatted reports to #trust-debt-public

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         CostReportScheduler                         │
│                                                     │
│  ┌──────────────┐        ┌──────────────┐         │
│  │ Daily Check  │───────▶│ Post Daily   │         │
│  │ (23:30)      │        │ Report       │         │
│  └──────────────┘        └──────────────┘         │
│                                 │                   │
│  ┌──────────────┐              │                   │
│  │ Weekly Check │              ▼                   │
│  │ (Sun 23:45)  │        ┌──────────────┐         │
│  └──────────────┘───────▶│ Discord      │         │
│                           │ #trust-debt- │         │
│                           │ public       │         │
│                           └──────────────┘         │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              CostReporter                           │
│  • generateDailyReport()                            │
│  • generateWeeklyReport()                           │
│  • formatForDiscord()                               │
│  • Read from wallet-ledger.jsonl                    │
└─────────────────────────────────────────────────────┘
```

## Usage

### Integration into Runtime

```typescript
import { CostReportScheduler } from './cron/cost-report-scheduler.js';
import CostReporter from './skills/cost-reporter.js';

// Initialize cost reporter
const costReporter = new CostReporter();
await costReporter.initialize(ctx);

// Initialize scheduler
const costScheduler = new CostReportScheduler(
  log,
  costReporter,
  {
    enabled: true,
    dailyHour: 23,      // 11 PM
    dailyMinute: 30,
    weeklyDay: 0,       // Sunday
    weeklyHour: 23,
    weeklyMinute: 45,
    checkIntervalMs: 60_000, // Check every minute
  }
);

// Start scheduler with Discord integration
const channelId = await channelManager.ensureChannel('trust-debt-public');
costScheduler.start(discord, channelId);
```

### Manual Triggers

```typescript
// Trigger daily report on demand
await costScheduler.triggerDailyReport();

// Trigger weekly report on demand
await costScheduler.triggerWeeklyReport();

// Check scheduler status
const status = costScheduler.getStatus();
console.log(`Last daily report: ${status.lastDailyReport}`);
console.log(`Next report: ${status.nextDailyTime}`);
```

### Discord Commands

Users can trigger reports manually via Discord:

```
!cost-report daily   → Post today's cost report
!cost-report weekly  → Post last 7 days cost report
!cost-status         → Show scheduler status
```

## Report Format

### Daily Report Example

```
📊 **DAILY COST REPORT**

```
╔════════════════════════════════════════╗
║     WALLET REPORT — COST ANALYSIS      ║
╚════════════════════════════════════════╝

Period: 2026-02-15 → 2026-02-15
Days: 1

──────────────────────────────────────────
Total Income:   $0.0000
Total Expenses: $2.6250
Net Balance:    -$2.6250
──────────────────────────────────────────

BY CATEGORY:
  inference-claude-opus          -$1.5000
  inference-claude-sonnet        -$0.9000
  inference-ollama               -$0.2250

TOP EXPENSES:
  2026-02-15 $1.5000 claude-opus-4-6: 100000 in + 50000 out...
  2026-02-15 $0.9000 claude-sonnet-4-5: 200000 in + 100000...
  2026-02-15 $0.2250 llama3:70b: 150000 in + 75000 out tokens

✅ 12 transactions over 1 day(s) | Average daily spend: $2.6250 | Net deficit: -$2.6250
```

*Daily budget: $5.00 | Economic sovereignty tracking enabled*
```

### Weekly Report Example

```
📊 **WEEKLY COST REPORT**

```
╔════════════════════════════════════════╗
║     WALLET REPORT — COST ANALYSIS      ║
╚════════════════════════════════════════╝

Period: 2026-02-09 → 2026-02-15
Days: 7

──────────────────────────────────────────
Total Income:   $150.0000
Total Expenses: $18.7500
Net Balance:    $131.2500
──────────────────────────────────────────

BY CATEGORY:
  inference-claude-opus          -$10.5000
  inference-claude-sonnet        -$6.3000
  inference-ollama               -$1.9500
  revenue-client-alpha           +$150.0000

✅ 84 transactions over 7 day(s) | Average daily spend: $2.6786 | Net positive: +$131.2500
```

*7-day financial overview | Economic sovereignty tracking enabled*
```

## Configuration

### Schedule Times

Default schedule:
- **Daily**: 11:30 PM local time
- **Weekly**: Sunday 11:45 PM local time

Customize via config:

```typescript
const config = {
  dailyHour: 23,      // Hour (0-23)
  dailyMinute: 30,    // Minute (0-59)
  weeklyDay: 0,       // Day of week (0=Sunday, 6=Saturday)
  weeklyHour: 23,
  weeklyMinute: 45,
};
```

### Check Interval

The scheduler checks if reports should be posted every minute by default:

```typescript
checkIntervalMs: 60_000  // 60 seconds
```

This ensures reports are posted within 1 minute of the scheduled time.

## Data Sources

Reports are generated from:
- **Transaction Ledger**: `data/wallet-ledger.jsonl`
- **Inference Tracking**: Automatic via LLM Controller
- **Revenue Records**: Manual entries or future automation

## Integration Points

### 1. Runtime Initialization

Wire into `src/runtime.ts`:

```typescript
// After cost reporter initialization
this.costScheduler = new CostReportScheduler(this.log, costReporter);
const trustDebtChannel = await this.channelManager.ensureChannel('trust-debt-public');
this.costScheduler.start(this.discord, trustDebtChannel);
```

### 2. Skill Commands

Add Discord commands in `src/runtime.ts`:

```typescript
case '!cost-report': {
  const subcommand = message.content.split(' ')[1];
  if (subcommand === 'daily') {
    await this.costScheduler.triggerDailyReport();
    await message.reply('✅ Daily cost report posted to #trust-debt-public');
  } else if (subcommand === 'weekly') {
    await this.costScheduler.triggerWeeklyReport();
    await message.reply('✅ Weekly cost report posted to #trust-debt-public');
  }
  break;
}

case '!cost-status': {
  const status = this.costScheduler.getStatus();
  await message.reply(
    `Cost Report Scheduler Status:\n` +
    `Enabled: ${status.enabled}\n` +
    `Last Daily: ${status.lastDailyReport}\n` +
    `Last Weekly: ${status.lastWeeklyReport}\n` +
    `Next Daily: ${new Date(status.nextDailyTime).toLocaleString()}\n` +
    `Next Weekly: ${new Date(status.nextWeeklyTime).toLocaleString()}`
  );
  break;
}
```

### 3. Shutdown Hook

Clean up on exit:

```typescript
process.on('SIGINT', () => {
  this.costScheduler?.stop();
  this.transparencyEngine?.stop();
  process.exit(0);
});
```

## Testing

Run the test suite:

```bash
npm test src/cron/cost-report-scheduler.test.ts
```

Test coverage includes:
- Initialization and configuration
- Start/stop lifecycle
- Manual report triggers
- Scheduled report timing
- Discord integration
- Error handling
- Edge cases (empty ledger, large reports, etc.)

## Monitoring

### Check Logs

```bash
# Watch for scheduled reports
tail -f logs/runtime.log | grep "Cost.*report"

# Expected output:
# [INFO] CostReportScheduler started → #trust-debt-public (daily: 23:30, weekly: Sun 23:45)
# [INFO] Posted daily cost report: spent=$2.6250, income=$0.0000, net=-$2.6250
# [INFO] Posted weekly cost report: spent=$18.7500, income=$150.0000, net=$131.2500
```

### Discord Verification

Check `#trust-debt-public` channel for:
- Daily reports at 11:30 PM
- Weekly reports on Sunday at 11:45 PM
- Proper formatting with ASCII boxes
- Correct financial calculations
- Category breakdowns

## Troubleshooting

### Reports Not Posting

1. **Check if scheduler is enabled**:
   ```typescript
   const status = costScheduler.getStatus();
   console.log(status.enabled);  // Should be true
   ```

2. **Verify Discord connection**:
   ```typescript
   // Check channel exists
   const channel = await channelManager.getChannel('trust-debt-public');
   console.log(channel?.id);
   ```

3. **Check timezone configuration**:
   - Scheduler uses local server time
   - Adjust `dailyHour` and `weeklyHour` for your timezone

### Empty Reports

If reports show no data:
- Check `data/wallet-ledger.jsonl` exists and has content
- Verify inference tracking is enabled in LLM Controller
- Ensure cost reporter is properly initialized

### Duplicate Reports

If reports post multiple times:
- Check for multiple runtime instances
- Verify `checkIntervalMs` is not too small
- Check `lastDailyReport` tracking is working

## Future Enhancements

- [ ] Configurable report formats (brief/detailed)
- [ ] Monthly/quarterly report aggregation
- [ ] Cost projections and trend analysis
- [ ] Budget threshold alerts in reports
- [ ] Export reports to CSV/JSON
- [ ] Multi-channel reporting (also post to #ops-board)
- [ ] Rich embeds with charts (Discord embeds)
- [ ] Slack/Teams integration

## Related Components

- **CostReporter**: `src/skills/cost-reporter.ts`
- **WalletLedger**: `src/skills/wallet-ledger.ts`
- **BudgetAlerts**: `src/skills/budget-alerts.ts`
- **TransparencyEngine**: `src/discord/transparency-engine.ts`
- **Scheduler**: `src/cron/scheduler.ts`

## See Also

- [Phase 6 Spec: Economic Sovereignty](../../intentguard-migration-spec.html#phase-6)
- [Wallet Skill Documentation](../skills/wallet-ledger.README.md)
- [Budget Alerts Documentation](../skills/budget-alerts.README.md)
- [Transparency Engine Documentation](../discord/transparency-engine.README.md)
