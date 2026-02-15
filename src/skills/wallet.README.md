# Wallet Skill — Economic Sovereignty

**Agent #43 (wallet group)** — Completed 2026-02-15

## Overview

The Wallet skill provides comprehensive economic sovereignty for autonomous agents through balance tracking, income/expense categorization, and FIM-based spending limits.

## Features

### Balance Tracking
- Real-time balance calculations (income - expenses)
- Transaction history with timestamps
- JSONL persistence for audit trail

### Income Source Tracking
Supported income sources:
- `grant` — Grant funding
- `consulting` — Consulting revenue
- `api_revenue` — API service revenue
- `subscription` — Subscription income
- `investment` — Investment returns
- `donation` — Donations
- `other` — Other sources

### Expense Categories
Supported expense categories:
- `inference` — LLM API costs (GPT-4, Claude, etc.)
- `infrastructure` — Servers, hosting, cloud services
- `development` — Tools, licenses, dependencies
- `research` — Papers, datasets, research materials
- `operations` — General operational costs
- `marketing` — Outreach, advertising
- `legal` — Compliance, contracts
- `other` — Other expenses

### FIM Sovereignty Integration

**Spending limits based on sovereignty score:**

| Sovereignty Score | Daily Limit | Description |
|------------------|-------------|-------------|
| > 0.9 | $100/day | High sovereignty — trusted spending |
| > 0.7 | $50/day | Moderate sovereignty |
| > 0.5 | $20/day | Low sovereignty |
| ≤ 0.5 | $5/day | Restricted spending |

Budget alerts automatically trigger when daily spending reaches or exceeds the limit.

### P&L Reporting
- **Daily P&L**: Income minus expenses for a specific date
- **Weekly P&L**: Income minus expenses for the last 7 days
- Expense breakdown by category
- Income breakdown by source

### Inference Cost Tracking
- Automatic tracking of LLM API costs
- Model-specific pricing (GPT-4, Claude Sonnet, etc.)
- Ollama tracking (free/local inference)
- Token usage monitoring

### Analytics
Comprehensive wallet analytics including:
- Current balance
- Daily/weekly P&L
- Top expense categories with percentages
- Top income source
- Sovereignty score
- Spending limit and remaining budget
- Budget health percentage

## Usage

### Initialize
```typescript
const wallet = new Wallet();
await wallet.initialize(ctx);
```

### Record Income
```typescript
await wallet.execute({
  action: 'income',
  amount: 500,
  category: 'consulting',
  description: 'Consulting project X'
}, ctx);
```

### Record Expense
```typescript
await wallet.execute({
  action: 'expense',
  amount: 25,
  category: 'inference',
  description: 'GPT-4 API call'
}, ctx);
```

### Check Balance
```typescript
const result = await wallet.execute({ action: 'balance' }, ctx);
// Returns: { success: true, message: "Current balance: $475.00", data: { balance: 475 } }
```

### Budget Alert
```typescript
const result = await wallet.execute({ action: 'alert' }, ctx);
// Returns spending status and sovereignty-based limit
```

### P&L Report
```typescript
// Daily report
await wallet.execute({ action: 'report', period: 'daily' }, ctx);

// Weekly report
await wallet.execute({ action: 'report', period: 'weekly' }, ctx);
```

### Analytics
```typescript
const result = await wallet.execute({ action: 'analytics' }, ctx);
// Returns comprehensive wallet analytics
```

### Inference Cost Tracking
```typescript
// Track API inference
await wallet.execute({
  action: 'inference',
  model: 'gpt-4',
  tokens: 1000,
  isOllama: false
}, ctx);

// Track Ollama inference (free)
await wallet.execute({
  action: 'inference',
  model: 'llama2',
  tokens: 5000,
  isOllama: true
}, ctx);
```

### Transaction History
```typescript
const result = await wallet.execute({ action: 'history' }, ctx);
// Returns last 10 transactions
```

## Implementation Details

### Architecture
- **wallet.ts**: Main skill class with command routing
- **wallet-ledger.ts**: Append-only JSONL transaction log
- **Data persistence**: `data/wallet-ledger.jsonl`

### FIM Integration
- Reads sovereignty score from most recent pipeline run
- Default sovereignty: 0.5 (moderate)
- Budget enforcement happens before expenses are recorded
- Expenses exceeding daily limit are blocked with budget alert

### Testing
- **13 passing integration tests** covering:
  - Balance tracking (4 tests)
  - Income sources (1 test)
  - Expense categories (1 test)
  - FIM sovereignty integration (2 tests)
  - P&L reports (2 tests)
  - Transaction history (2 tests)
  - JSONL format (1 test)

Run tests:
```bash
npm test -- wallet.test.js
```

## Data Format

### Transaction JSONL
```json
{
  "timestamp": "2026-02-15T17:30:00.000Z",
  "type": "income",
  "amount": 500,
  "category": "consulting",
  "description": "Consulting project X",
  "sovereigntyAtTime": 0.75
}
```

## Dependencies
- **WalletLedger**: Handles transaction persistence
- **FIM Pipeline**: Provides sovereignty score
- **Types**: Logger, SkillContext, SkillResult

## Economic Self-Awareness

The Wallet skill enables autonomous agents to:
1. **Track their economic state** (balance, P&L)
2. **Understand their spending patterns** (categories, trends)
3. **Respect sovereignty-based limits** (FIM enforcement)
4. **Make informed decisions** (budget health, remaining capacity)
5. **Audit their financial history** (JSONL transaction log)

This creates a foundation for truly sovereign economic actors that can manage their own resources responsibly.

## Future Enhancements
- Monthly P&L reports
- Budget forecasting based on trends
- Category-specific spending limits
- Multi-currency support
- Export to accounting formats (CSV, QBO)
- Integration with payment APIs
- Smart contract hooks for blockchain settlements

---

**Status**: ✅ Complete with 13 passing tests
**Agent**: #43 (wallet group)
**Date**: 2026-02-15
