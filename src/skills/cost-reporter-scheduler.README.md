# Cost Reporter Scheduler

**Phase 6 — Economic Sovereignty (Wallet Skill)**

Automated daily/weekly P&L reporting to #trust-debt-public for financial transparency.

## Overview

The Cost Reporter Scheduler automates the posting of financial reports to Discord's `#trust-debt-public` channel, providing:

- **Daily P&L Reports**: Posted at 09:00 UTC every day
- **Weekly P&L Summaries**: Posted on Mondays at 09:00 UTC
- **Automated Transparency**: Financial data publicly visible for IAMFIM sovereignty
- **Historical Tracking**: All reports logged to JSONL for audit trail

## Architecture

```
CostReporterScheduler
  ├─ CostReporter (generates financial reports)
  ├─ TransparencyEngine (posts to #trust-debt-public)
  ├─ WalletLedger (reads transaction data)
  └─ Scheduler (cron-style timing)
```

## Usage

### Basic Setup

```typescript
import { CostReporterScheduler } from './skills/cost-reporter-scheduler.js';
import CostReporter from './skills/cost-reporter.js';

// Create cost reporter
const costReporter = new CostReporter();
await costReporter.initialize(ctx);

// Create scheduler
const scheduler = new CostReporterScheduler(
  logger,
  costReporter,
  dataDir
);

// Start automated reporting
scheduler.start(discordHelper, channelId);
```

### Custom Configuration

```typescript
const scheduler = new CostReporterScheduler(
  logger,
  costReporter,
  dataDir,
  {
    enabled: true,
    dailyReportHour: 9,        // 09:00 UTC
    weeklyReportDay: 1,        // Monday (0=Sunday, 1=Monday, etc.)
    weeklyReportHour: 9,       // 09:00 UTC
    minIntervalBetweenReportsMs: 3600_000, // 1 hour cooldown
    logReports: true           // Log to cost-report-history.jsonl
  }
);
```

### Manual Triggers

```typescript
// Trigger daily report immediately
await scheduler.triggerDailyReport();

// Trigger weekly report immediately
await scheduler.triggerWeeklyReport();

// Get report statistics
const stats = scheduler.getReportStats();
console.log(`Total daily reports: ${stats.totalDailyReports}`);
console.log(`Total weekly reports: ${stats.totalWeeklyReports}`);
console.log(`Last daily report: ${stats.lastDailyReport}`);
console.log(`Failed posts: ${stats.failedPosts}`);
```

### Integration with Runtime

```typescript
// In src/runtime.ts or src/cron/scheduler.ts

import { CostReporterScheduler } from './skills/cost-reporter-scheduler.js';

class IntentGuardRuntime {
  private costReporterScheduler: CostReporterScheduler | undefined;

  async initialize() {
    // Initialize cost reporter
    const costReporter = new CostReporter();
    await costReporter.initialize(this.ctx);

    // Initialize scheduler
    this.costReporterScheduler = new CostReporterScheduler(
      this.logger,
      costReporter,
      path.join(process.cwd(), 'data')
    );

    // Start automated reporting to #trust-debt-public
    const channelId = this.findChannel('trust-debt-public');
    if (channelId) {
      this.costReporterScheduler.start(this.discord, channelId);
    }
  }

  async shutdown() {
    if (this.costReporterScheduler) {
      this.costReporterScheduler.stop();
    }
  }
}
```

## Report Format

### Daily Report

```
📈 **DAILY P&L REPORT** — 2026-02-15

**FINANCIAL SUMMARY:**
• Income: $150.0000
• Expenses: $3.2500
• Net Balance: $146.7500 ✅ POSITIVE

**TOP CATEGORIES:**
• inference-claude-opus: -$2.1000
• inference-claude-sonnet: -$0.9000
• inference-ollama: -$0.2500
• revenue-client-alpha: +$150.0000

**TOP EXPENSES:**
• $2.1000 — claude-opus-4-6: 100000 in + 50000 out tokens
• $0.9000 — claude-sonnet-4-5: 200000 in + 100000 out tokens
• $0.2500 — llama3:70b: 50000 in + 25000 out tokens

**INSIGHT:**
✅ 15 transactions over 1 day(s) | Average daily spend: $3.2500 | Net positive: +$146.7500

_Automated daily financial transparency — Phase 6: Economic Sovereignty_
```

### Weekly Report

```
📈 **WEEKLY P&L REPORT** — 2026-02-09 to 2026-02-15

**FINANCIAL SUMMARY (7 DAYS):**
• Total Income: $750.0000
• Total Expenses: $22.7500
• Net Balance: $727.2500 ✅ POSITIVE
• Avg Daily Spend: $3.2500

**CATEGORY BREAKDOWN:**
• inference-claude-opus: -$14.7000
• inference-claude-sonnet: -$6.3000
• inference-ollama: -$1.7500
• revenue-client-alpha: +$600.0000
• revenue-client-beta: +$150.0000

**TOP EXPENSES:**
• 2026-02-15: $2.1000 — claude-opus-4-6: 100000 in + 50000 out tokens
• 2026-02-14: $1.9500 — claude-opus-4-6: 95000 in + 45000 out tokens
• 2026-02-13: $1.8000 — claude-opus-4-6: 90000 in + 40000 out tokens
• 2026-02-12: $1.7000 — claude-sonnet-4-5: 300000 in + 150000 out tokens
• 2026-02-11: $1.5000 — claude-sonnet-4-5: 280000 in + 140000 out tokens

**WEEKLY INSIGHT:**
✅ 105 transactions over 7 day(s) | Average daily spend: $3.2500 | Net positive: +$727.2500

**PROJECTION:**
• Projected 30-day spend: $97.50

_Automated weekly financial transparency — Phase 6: Economic Sovereignty_
```

## Data Files

### cost-report-history.jsonl

Append-only log of all posted reports:

```jsonl
{"timestamp":"2026-02-15T09:00:00.000Z","reportType":"daily","posted":true}
{"timestamp":"2026-02-15T09:00:00.000Z","reportType":"weekly","posted":true}
{"timestamp":"2026-02-16T09:00:00.000Z","reportType":"daily","posted":true}
```

### Failed Posts

If a report fails to post, the error is recorded:

```jsonl
{"timestamp":"2026-02-15T09:00:00.000Z","reportType":"daily","posted":false,"error":"Network error"}
```

## Schedule Logic

### Daily Reports

- **Time**: 09:00 UTC
- **Check Interval**: Every 15 minutes
- **Duplicate Prevention**: Won't post twice on same date
- **Cooldown**: Minimum 1 hour between manual triggers

### Weekly Reports

- **Day**: Monday
- **Time**: 09:00 UTC
- **Check Interval**: Every 15 minutes
- **Duplicate Prevention**: Won't post twice in same week
- **Cooldown**: Minimum 1 hour between manual triggers

## Testing

Run the test suite:

```bash
npm test src/skills/cost-reporter-scheduler.test.ts
```

### Test Coverage

- ✅ Initialization and configuration
- ✅ Start/stop lifecycle
- ✅ Manual report triggers
- ✅ Daily report formatting
- ✅ Weekly report formatting
- ✅ History tracking and persistence
- ✅ Statistics collection
- ✅ Edge cases (empty ledger, missing Discord, malformed history)
- ✅ Integration scenarios

## Integration Points

### 1. CEO Loop (src/ceo-loop.ts)

Add to overnight schedule:

```typescript
{
  id: 'daily-pnl-report',
  description: 'Post daily P&L to #trust-debt-public',
  prompt: 'Trigger daily financial report',
  risk: 'safe',
  room: 'vault',
  categories: ['transparency', 'reporting'],
  minSovereignty: 0.5,
  cooldownMinutes: 1440, // Once per day
  shouldRun: () => true,
}
```

### 2. Scheduler (src/cron/scheduler.ts)

Register as periodic task:

```typescript
const costReporterScheduler = new CostReporterScheduler(
  logger,
  costReporter,
  dataDir
);
costReporterScheduler.start(discord, trustDebtPublicChannelId);
```

### 3. Discord Commands

Add manual trigger commands:

```typescript
// !pnl-daily
await costReporterScheduler.triggerDailyReport();

// !pnl-weekly
await costReporterScheduler.triggerWeeklyReport();

// !pnl-stats
const stats = costReporterScheduler.getReportStats();
await discord.sendToChannel(channelId, JSON.stringify(stats, null, 2));
```

## Benefits

### Transparency

- **Public Accountability**: All financial data visible in #trust-debt-public
- **Audit Trail**: Complete JSONL history of all reports
- **Trust Building**: Users see exactly how much the bot spends

### Economic Sovereignty

- **Budget Awareness**: Daily tracking prevents runaway costs
- **Revenue Visibility**: Show income sources and amounts
- **Projection**: Weekly reports include 30-day spending forecast

### IAMFIM Integration

- **Sovereignty Scoring**: Financial transparency contributes to trust score
- **FIM Enforcement**: Spending limits tied to sovereignty level
- **Geometric Overlap**: Financial health = geometric trust coherence

## Configuration Best Practices

### Production

```typescript
{
  enabled: true,
  dailyReportHour: 9,        // 09:00 UTC (morning for US)
  weeklyReportDay: 1,        // Monday (start of business week)
  weeklyReportHour: 9,       // 09:00 UTC
  minIntervalBetweenReportsMs: 3600_000, // 1 hour (prevent spam)
  logReports: true           // Enable audit trail
}
```

### Development

```typescript
{
  enabled: true,
  dailyReportHour: new Date().getUTCHours(), // Test now
  weeklyReportDay: new Date().getUTCDay(),   // Test now
  weeklyReportHour: new Date().getUTCHours(),
  minIntervalBetweenReportsMs: 60_000, // 1 minute (fast testing)
  logReports: true
}
```

## Monitoring

### Log Messages

```
[INFO] CostReporterScheduler started → #trust-debt-public (daily: 9:00 UTC, weekly: Monday 9:00 UTC)
[INFO] Daily P&L report posted to #trust-debt-public
[INFO] Weekly P&L report posted to #trust-debt-public
[ERROR] Failed to post daily report: Network error
[INFO] CostReporterScheduler stopped
```

### Health Check

```typescript
const stats = scheduler.getReportStats();

if (stats.failedPosts > 10) {
  logger.warn('High failure rate for cost reports');
}

if (stats.lastDailyReport) {
  const lastReportDate = new Date(stats.lastDailyReport);
  const hoursSinceLastReport = (Date.now() - lastReportDate.getTime()) / 1000 / 60 / 60;

  if (hoursSinceLastReport > 36) {
    logger.error('Daily report has not posted in over 36 hours');
  }
}
```

## Future Enhancements

- [ ] Slack integration for #trust-debt-public
- [ ] Twitter/X auto-post for transparency
- [ ] Email digest for stakeholders
- [ ] Chart generation (PNG embeds in Discord)
- [ ] Cost anomaly detection (spike alerts)
- [ ] Revenue forecasting (ML-based projections)
- [ ] Multi-currency support (crypto + fiat)
- [ ] Integration with accounting systems (QuickBooks, Xero)

## Related Files

- `src/skills/cost-reporter.ts` — Core financial report generator
- `src/skills/wallet-ledger.ts` — Transaction storage (JSONL)
- `src/skills/budget-alerts.ts` — Budget threshold monitoring
- `src/discord/transparency-engine.ts` — Public Discord posting
- `src/cron/scheduler.ts` — Task scheduling framework
- `data/wallet-ledger.jsonl` — Transaction log
- `data/cost-report-history.jsonl` — Report posting history

## License

Part of IntentGuard — Open-source IAMFIM implementation.
