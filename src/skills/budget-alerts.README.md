# Budget Alerts System

**Agent #46 (wallet group)** — Sovereignty-Adjusted Budget Monitoring

## Overview

The Budget Alerts system monitors daily spending against sovereignty-adjusted thresholds and posts warnings to Discord's `#trust-debt-public` channel when limits are exceeded. This prevents runaway costs while allowing higher spending for trusted operations.

## Files

- **`budget-alerts.ts`** (390 lines) — Core implementation
- **`budget-alerts.test.ts`** (20 tests) — Comprehensive test suite
- **`budget-alerts.example.ts`** — Usage examples and integration patterns

## Architecture

### Sovereignty-Based Thresholds

Daily spending limits are dynamically adjusted based on the current FIM sovereignty score:

| Sovereignty | Daily Limit | Trust Level |
|-------------|-------------|-------------|
| > 0.9 | $100/day | High trust — trusted spending |
| > 0.7 | $50/day | Moderate trust |
| > 0.5 | $20/day | Low trust |
| ≤ 0.5 | $5/day | Restricted spending |

### Alert Flow

```
WalletLedger.appendTransaction()
    ↓
BudgetAlerts.checkBudgetAndAlert(sovereignty)
    ↓
Check: spent >= dailyLimit?
    ↓ YES (and cooldown expired)
postBudgetAlert()
    ↓
Discord.sendToChannel(#trust-debt-public)
    ↓
Log to budget-alerts.jsonl
```

### Cooldown Mechanism

Prevents alert spam by enforcing a minimum time between alerts:

- **Default:** 1 hour cooldown
- **Configurable:** Set via `cooldownMs` in config
- **Bypass:** Use `triggerAlert()` for manual/emergency alerts

## Integration

### Quick Start

```typescript
import { BudgetAlerts } from './skills/budget-alerts.js';
import WalletLedger from './skills/wallet-ledger.js';

// Initialize
const wallet = new WalletLedger(dataDir);
const budgetAlerts = new BudgetAlerts(logger, wallet, dataDir, {
  enabled: true,
  cooldownMs: 3600_000, // 1 hour
  checkIntervalMs: 300_000, // Check every 5 minutes
  logAlerts: true,
});

// Start monitoring (requires Discord helper + channel ID)
budgetAlerts.start(discordHelper, trustDebtPublicChannelId);
```

### Runtime Integration

The system is designed to integrate with `runtime.ts`:

```typescript
// Track an API call and check budget
wallet.trackInferenceCost('claude-sonnet-4', tokens, sovereignty, false);
await budgetAlerts.checkBudgetAndAlert(sovereignty);
```

### Manual Checks

```typescript
// Get status without triggering alerts
const status = budgetAlerts.getBudgetStatus(sovereignty);
console.log(`Spent: $${status.spent}, Remaining: $${status.remaining}`);

// Manually trigger alert (bypasses cooldown)
await budgetAlerts.triggerAlert(sovereignty);
```

## API Reference

### `BudgetAlerts` Class

#### Constructor

```typescript
constructor(
  log: Logger,
  wallet: WalletLedger,
  dataDir: string,
  config?: Partial<BudgetAlertConfig>
)
```

#### Methods

- **`start(discord, channelId)`** — Start monitoring with Discord integration
- **`stop()`** — Stop monitoring
- **`checkBudgetAndAlert(sovereignty?)`** — Check budget and post alert if exceeded
- **`triggerAlert(sovereignty)`** — Manually trigger alert (bypasses cooldown)
- **`getBudgetStatus(sovereignty)`** — Get current budget status
- **`getAlertHistory(limit?)`** — Get alert history
- **`getAlertStats()`** — Get alert statistics
- **`clearAlertHistory()`** — Clear alert history

### Configuration

```typescript
interface BudgetAlertConfig {
  enabled: boolean;           // Enable/disable system
  cooldownMs: number;         // Minimum time between alerts (default: 1 hour)
  checkIntervalMs: number;    // How often to check budget (default: 5 minutes)
  logAlerts: boolean;         // Log alerts to JSONL file (default: true)
}
```

### Status Object

```typescript
interface BudgetStatus {
  withinBudget: boolean;      // Is spending within limit?
  sovereignty: number;        // Current sovereignty score
  spent: number;              // Amount spent today
  limit: number;              // Daily limit based on sovereignty
  remaining: number;          // Amount remaining (negative if exceeded)
  percentUsed: number;        // Percentage of limit used
}
```

### Alert Event

```typescript
interface BudgetAlertEvent {
  timestamp: string;          // ISO timestamp
  sovereignty: number;        // Sovereignty at alert time
  spent: number;              // Amount spent
  limit: number;              // Daily limit
  exceededBy: number;         // Amount over limit
  percentOfLimit: number;     // Percentage of limit
  message: string;            // Full Discord message
}
```

## Discord Alert Format

Alerts posted to `#trust-debt-public` use CEO-grade Intelligence Burst formatting:

```
🟠 **BUDGET LIMIT EXCEEDED**

**Daily Spending:** $60.00
**Daily Limit:** $50.00 (sovereignty: 0.750)
**Exceeded By:** $10.00 (20% over)
**Hardness:** H3-MEDIUM
**Time:** 2026-02-15T18:30:00.000Z

*Sovereignty-adjusted spending limits prevent runaway costs. Review wallet ledger for details.*

**Budget Thresholds:**
• Sovereignty > 0.9: $100/day (high trust)
• Sovereignty > 0.7: $50/day (moderate trust)
• Sovereignty > 0.5: $20/day (low trust)
• Sovereignty ≤ 0.5: $5/day (restricted)
```

### Severity Indicators

- 🔴 **H1-CRITICAL:** Exceeded by ≥50% of limit
- 🟡 **H2-HIGH:** Exceeded by ≥25% of limit
- 🟠 **H3-MEDIUM:** Exceeded by <25% of limit

## Data Storage

### Alert Log

**File:** `data/budget-alerts.jsonl`

Append-only JSONL log of all budget alerts:

```jsonl
{"timestamp":"2026-02-15T18:30:00.000Z","sovereignty":0.75,"spent":60,"limit":50,"exceededBy":10,"percentOfLimit":120,"message":"..."}
{"timestamp":"2026-02-15T20:00:00.000Z","sovereignty":0.75,"spent":65,"limit":50,"exceededBy":15,"percentOfLimit":130,"message":"..."}
```

### Wallet Ledger Integration

Budget alerts read from `data/wallet-ledger.jsonl` maintained by `WalletLedger` class.

## Testing

Run tests with your preferred test runner:

```bash
# Example with vitest
npx vitest src/skills/budget-alerts.test.ts

# Example with jest
npx jest src/skills/budget-alerts.test.ts
```

### Test Coverage

- ✅ Budget threshold detection (4 sovereignty levels)
- ✅ Discord alert posting
- ✅ Cooldown mechanism
- ✅ Alert history tracking
- ✅ Statistics calculation
- ✅ JSONL logging
- ✅ Edge cases (zero spending, default sovereignty)
- ✅ Severity indicators
- ✅ Manual trigger
- ✅ Status queries without alerts

## Analytics

### Alert Statistics

```typescript
const stats = budgetAlerts.getAlertStats();
console.log(`Total alerts: ${stats.totalAlerts}`);
console.log(`Last alert: ${stats.lastAlertTime}`);
console.log(`Avg exceeded by: $${stats.averageExceededBy}`);
console.log(`Max exceeded by: $${stats.maxExceededBy}`);
```

### Alert History

```typescript
const history = budgetAlerts.getAlertHistory(10); // Last 10 alerts
for (const alert of history) {
  console.log(`${alert.timestamp}: $${alert.spent} / $${alert.limit}`);
}
```

## Monitoring Dashboard Example

```typescript
function displayBudgetDashboard(
  budgetAlerts: BudgetAlerts,
  sovereignty: number
): void {
  const status = budgetAlerts.getBudgetStatus(sovereignty);
  const stats = budgetAlerts.getAlertStats();

  console.log('=== BUDGET DASHBOARD ===');
  console.log(`Status: ${status.withinBudget ? '✅ OK' : '⚠️  EXCEEDED'}`);
  console.log(`Spent: $${status.spent.toFixed(2)} / $${status.limit.toFixed(2)}`);
  console.log(`Remaining: $${status.remaining.toFixed(2)}`);
  console.log(`Used: ${status.percentUsed.toFixed(0)}%`);
  console.log(`Sovereignty: ${status.sovereignty.toFixed(3)}`);
  console.log('');
  console.log('=== ALERT HISTORY ===');
  console.log(`Total Alerts: ${stats.totalAlerts}`);
  console.log(`Last Alert: ${stats.lastAlertTime || 'Never'}`);
  console.log(`Avg Exceeded By: $${stats.averageExceededBy.toFixed(2)}`);
  console.log(`Max Exceeded By: $${stats.maxExceededBy.toFixed(2)}`);
}
```

## Phase 6 Integration

This implementation completes the **Phase 6 — Economic Sovereignty (Wallet Skill)** milestone:

- ✅ Sovereignty-based spending limits
- ✅ Budget alerts when spending exceeds threshold
- ✅ Discord #trust-debt-public integration
- ✅ Comprehensive test coverage
- ✅ Alert history and analytics

## Future Enhancements

Potential improvements:

1. **Weekly/Monthly Budgets:** Track longer time periods beyond daily
2. **Category-Specific Limits:** Different limits per expense category
3. **Predictive Alerts:** Warn before reaching limit based on spending rate
4. **Budget Recommendations:** Suggest sovereignty score adjustments based on spending patterns
5. **Multi-Channel Routing:** Route different alert severities to different channels
6. **Slack/Email Integration:** Support additional notification channels beyond Discord

## References

- **WalletLedger:** `src/skills/wallet-ledger.ts` — Transaction logging
- **TransparencyEngine:** `src/discord/transparency-engine.ts` — Trust debt reporting pattern
- **ChannelManager:** `src/discord/channel-manager.ts` — Discord channel management
- **Spec:** `intentguard-migration-spec.html` — Phase 6 requirements

---

**Built by:** Agent #46 (wallet group)
**Date:** 2026-02-15
**Commits:** e8fb23b, 4e7911a
**Status:** ✅ Complete
