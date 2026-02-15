# FIM Sovereignty → Spending Limits Architecture

## Overview

This document describes how FIM (Fractal Identity Map) sovereignty scores are wired to dynamic spending limits, creating an economic governance layer where **high trust = high spending authority**.

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                    TRUST DEBT PIPELINE                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Agent 0  │→ │ Agent 1  │→ │ Agent 2  │→ │ Agent 3  │           │
│  │Requirements│ │Keyword DB│ │Categories│ │ShortLex  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
│                                                  ↓                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Agent 7  │← │ Agent 6  │← │ Agent 5  │← │ Agent 4  │           │
│  │HTML      │  │Analysis  │  │Timeline  │  │Statistics│           │
│  │Report    │  │Narrative │  │History   │  │& Grades  │           │
│  └──────────┘  └──────────┘  └──────────┘  └────┬─────┘           │
└──────────────────────────────────────────────────┼─────────────────┘
                                                    ↓
                              ┌─────────────────────────────────────┐
                              │ 4-grades-statistics.json            │
                              │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
                              │ total_units: 860                    │
                              │ grade: "B"                          │
                              │ category_performance: {             │
                              │   A🛡️_Security: { units: 180 }     │
                              │   B⚡_Performance: { units: 120 }   │
                              │   C🎨_UX: { units: 280 }            │
                              │   D🔧_Development: { units: 80 }    │
                              │   E💼_Business: { units: 200 }      │
                              │ }                                   │
                              └──────────┬──────────────────────────┘
                                         ↓
┌────────────────────────────────────────────────────────────────────┐
│                  SOVEREIGNTY CALCULATION                            │
│                  (src/auth/sovereignty.ts)                          │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Formula: sovereignty = 1.0 - (units / MAX_UNITS)             │ │
│  │          with drift reduction: × (1 - k_E)^driftEvents        │ │
│  │                                                               │ │
│  │ MAX_UNITS = 3000 (Grade D boundary)                          │ │
│  │ k_E = 0.003 (entropic drift rate)                            │ │
│  │                                                               │ │
│  │ Example: 860 units, 0 drift events                           │ │
│  │   → raw = 1.0 - (860 / 3000) = 0.713                         │ │
│  │   → final = 0.713 × (1 - 0.003)^0 = 0.713                    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                         ↓                                          │
│              sovereigntyScore: 0.713                               │
│              grade: "B"                                            │
│              level: "TRUSTED"                                      │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│                  SPENDING LIMITS CALCULATION                        │
│                  (src/auth/spending-limits.ts)                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Formula: dailyLimit = MIN + (MAX - MIN) × sovereignty²       │ │
│  │                                                               │ │
│  │ MIN = $5.00/day (operational minimum)                        │ │
│  │ MAX = $100.00/day (full autonomy)                            │ │
│  │ RANGE = $95.00                                               │ │
│  │                                                               │ │
│  │ Example: sovereignty = 0.713                                 │ │
│  │   → limit = 5 + 95 × (0.713)² = 5 + 95 × 0.508               │ │
│  │   → limit = 5 + 48.26 = $53.26/day                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                         ↓                                          │
│         ┌───────────────────────────────────┐                      │
│         │ SpendingLimitCalculation {        │                      │
│         │   dailyLimit: 53.26,              │                      │
│         │   sovereignty: 0.713,             │                      │
│         │   level: "TRUSTED",               │                      │
│         │   levelEmoji: "🟢",               │                      │
│         │   percentOfMax: 53.3,             │                      │
│         │   marginToNextLevel: 28.29,       │                      │
│         │   nextLevel: "EXCELLENT",         │                      │
│         │   nextLevelSovereignty: 0.900     │                      │
│         │ }                                 │                      │
│         └───────────────────────────────────┘                      │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│                    WALLET ENFORCEMENT                               │
│                    (src/skills/wallet-ledger.ts)                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ checkBudgetAlert(sovereignty: 0.713)                          │ │
│  │   ├─> getDailyLimit(0.713) → $53.26                          │ │
│  │   ├─> getTodaySpending() → $35.20                            │ │
│  │   ├─> remaining = $53.26 - $35.20 = $18.06                   │ │
│  │   ├─> percentUsed = 35.20 / 53.26 = 66.1%                    │ │
│  │   └─> alertLevel = "ok" (< 70% threshold)                    │ │
│  │                                                               │ │
│  │ appendTransaction('expense', 10, 'inference', ...)            │ │
│  │   ├─> Check: $35.20 + $10 = $45.20 < $53.26? ✅ YES          │ │
│  │   └─> ALLOWED - Record transaction                           │ │
│  │                                                               │ │
│  │ appendTransaction('expense', 25, 'infrastructure', ...)       │ │
│  │   ├─> Check: $35.20 + $25 = $60.20 < $53.26? ❌ NO           │ │
│  │   └─> BLOCKED - Budget exceeded                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

## Sovereignty Tiers & Spending Power

| Sovereignty | Grade | Level | Emoji | Daily Limit | Use Case |
|-------------|-------|-------|-------|-------------|----------|
| 0.00-0.30 | D | CRITICAL | 🔴 | $5.00-$13.55 | Survival mode, read-only |
| 0.30-0.50 | C | RESTRICTED | 🟠 | $13.55-$28.75 | Basic operations |
| 0.50-0.70 | C/B | BASIC | 🟡 | $28.75-$51.55 | Standard workflow |
| 0.70-0.90 | B | TRUSTED | 🟢 | $51.55-$81.55 | Elevated privileges |
| 0.90-1.00 | A | EXCELLENT | 💚 | $81.55-$100.00 | Full autonomy |
| 1.00 | A+ | PERFECT | ✨ | $100.00 | Maximum spending power |

## Quadratic Scaling Explained

### Why Quadratic?

Linear scaling (`limit = 5 + 95 × sovereignty`) would give equal rewards at all levels:
- 0.5 → 0.6 = +$9.50 gain
- 0.8 → 0.9 = +$9.50 gain

Quadratic scaling (`limit = 5 + 95 × sovereignty²`) rewards high sovereignty more:
- 0.5 → 0.6 = +$10.45 gain
- 0.8 → 0.9 = +$16.15 gain

### Incentive Structure

```
Sovereignty Improvement → Spending Gain
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0.3 → 0.5 (+0.2):  $13.55 → $28.75 (+$15.20, +112%)
0.5 → 0.7 (+0.2):  $28.75 → $51.55 (+$22.80, +79%)
0.7 → 0.9 (+0.2):  $51.55 → $81.55 (+$30.00, +58%)

Total 0.3 → 0.9:   $13.55 → $81.55 (+$68.00, +502%)
```

**Result:** Strong economic incentive to maintain high trust debt grades.

## Budget Alert Thresholds

| % Used | Alert Level | Emoji | Action |
|--------|-------------|-------|--------|
| 0-70% | OK | ✅ | Normal operations |
| 70-90% | WARNING | ⚠️ | Monitor spending |
| 90-100% | CRITICAL | 🚨 | Restrict non-essential |
| >100% | EXCEEDED | 🔴 | Block all expenses |

## Drift Event Impact

Each FIM denial event reduces sovereignty by 0.3%:

```
Base Sovereignty: 0.713
Drift Events: 5

Reduced = 0.713 × (1 - 0.003)^5
        = 0.713 × 0.985
        = 0.702

Impact:
  Before: $53.26/day
  After:  $51.73/day
  Loss:   -$1.53/day (-2.9%)
```

**Continuous denials → progressive sovereignty loss → tighter spending limits**

## Integration Points

### 1. Trust Debt Pipeline → Sovereignty
```typescript
// src/pipeline/step-4.ts
const trustDebtStats = calculateTrustDebt(categories);
const sovereignty = calculateSovereignty(trustDebtStats, driftEvents);
```

### 2. Sovereignty → Spending Limits
```typescript
// src/auth/spending-limits.ts
const spendingLimit = calculateSpendingLimit(sovereignty);
// Returns: { dailyLimit: 53.26, level: "TRUSTED", ... }
```

### 3. Spending Limits → Wallet Enforcement
```typescript
// src/skills/wallet-ledger.ts
const limit = getDailyLimit(sovereignty);
const spent = getTodaySpending();
const remaining = limit - spent;

if (amount > remaining) {
  throw new Error('Budget exceeded');
}
```

### 4. FIM Interceptor → Drift Tracking
```typescript
// src/auth/fim-interceptor.ts
if (!result.allowed) {
  recordDriftEvent({ sovereignty, toolName, ... });
  // Triggers sovereignty recalculation
}
```

## File Structure

```
src/
├── auth/
│   ├── sovereignty.ts              ← Trust debt → sovereignty
│   ├── spending-limits.ts          ← Sovereignty → $ limits
│   ├── spending-limits.test.ts     ← Unit tests
│   ├── spending-limits-integration.test.ts ← Integration tests
│   ├── fim-interceptor.ts          ← Drift event tracking
│   └── index.ts                    ← Public API exports
│
├── skills/
│   ├── wallet-ledger.ts            ← Budget enforcement
│   ├── wallet-ledger.test.ts       ← Wallet tests
│   ├── wallet.ts                   ← User-facing commands
│   └── budget-alerts.ts            ← Proactive monitoring
│
└── pipeline/
    └── step-4.ts                   ← Trust debt stats output
```

## API Usage Examples

### Check Current Spending Limit
```typescript
import { calculateSpendingLimit, loadSovereigntyFromPipeline } from './auth';

const sovereignty = loadSovereigntyFromPipeline('./data');
const limit = calculateSpendingLimit(sovereignty);

console.log(`Daily Limit: $${limit.dailyLimit.toFixed(2)}`);
console.log(`Level: ${limit.levelEmoji} ${limit.level}`);
```

### Enforce Budget Before Expense
```typescript
import WalletLedger from './skills/wallet-ledger';

const ledger = new WalletLedger('./data');
const sovereignty = 0.713;

const alert = ledger.checkBudgetAlert(sovereignty);

if (alert.alert) {
  console.error(`🚨 ${alert.message}`);
  // Block expense
} else {
  ledger.appendTransaction('expense', amount, category, description, sovereignty);
}
```

### Show Recovery Path
```typescript
import { calculateSpendingRecoveryPath } from './auth';

const path = calculateSpendingRecoveryPath(0.5);

for (const milestone of path) {
  console.log(`${milestone.level}: +$${milestone.limitGain.toFixed(2)}/day`);
  console.log(`  Requires: +${milestone.sovereigntyNeeded.toFixed(3)} sovereignty`);
}
```

## Economic Feedback Loop

```
┌─────────────────────────────────────────────────────────────┐
│                   POSITIVE FEEDBACK LOOP                     │
│                                                              │
│  Improve Code Quality                                       │
│         ↓                                                    │
│  Reduce Trust Debt Units                                    │
│         ↓                                                    │
│  Increase Sovereignty Score                                 │
│         ↓                                                    │
│  Higher Spending Limits                                     │
│         ↓                                                    │
│  More API Calls, Inference Tokens                           │
│         ↓                                                    │
│  Greater Autonomy, More Complex Tasks                       │
│         ↓                                                    │
│  Higher Value Output                                        │
│         ↓                                                    │
│  (Cycle repeats with compound benefits)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   NEGATIVE FEEDBACK LOOP                     │
│                                                              │
│  Poor Code Quality / FIM Denials                            │
│         ↓                                                    │
│  High Trust Debt / Drift Events                             │
│         ↓                                                    │
│  Low Sovereignty Score                                      │
│         ↓                                                    │
│  Restricted Spending Limits                                 │
│         ↓                                                    │
│  Limited API Calls, Token Budget                            │
│         ↓                                                    │
│  Reduced Capabilities, Simpler Tasks                        │
│         ↓                                                    │
│  Incentive to Improve (break cycle)                         │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. **Non-Zero Minimum ($5/day)**
- Even at 0 sovereignty, system remains operational
- Prevents complete lockout
- Allows recovery path from low trust states

### 2. **Quadratic Scaling**
- Creates strong incentive for high trust
- Rewards excellence more than mediocrity
- Natural economic pressure toward Grade A

### 3. **Real-Time Enforcement**
- Pre-spend validation prevents budget overruns
- No post-hoc reconciliation needed
- Immediate feedback on spending decisions

### 4. **Drift Event Penalties**
- Each FIM denial reduces sovereignty
- Cumulative drift events compound reduction
- Self-correcting: forces quality improvement

### 5. **Dynamic Recalculation**
- Limits update when sovereignty changes
- Trust improvements immediately reward with higher budgets
- System adapts to current trust state

## Testing Strategy

### Unit Tests (`spending-limits.test.ts`)
- Basic formula correctness
- Tier boundary mappings
- Edge cases (NaN, Infinity, negative)

### Integration Tests (`spending-limits-integration.test.ts`)
- Full pipeline: trust debt → sovereignty → limits
- Budget enforcement scenarios
- Drift event impact
- Economic incentive validation
- Wallet integration

### Manual Testing Checklist
- [ ] Pipeline run produces valid sovereignty scores
- [ ] Spending limits calculate correctly for each tier
- [ ] Wallet blocks expenses exceeding limit
- [ ] Budget alerts trigger at correct thresholds
- [ ] Drift events reduce sovereignty and limits
- [ ] Trust improvements increase limits

## Future Enhancements

1. **Multi-Resource Limits**
   - Extend beyond currency to API calls, tokens, file ops
   - Separate limits per resource type
   - Unified sovereignty-based scaling

2. **Time Window Flexibility**
   - Hourly, daily, weekly, monthly budgets
   - Rolling windows vs fixed periods
   - Budget carryover options

3. **Emergency Overrides**
   - Reserved budget for critical operations
   - Time-limited sovereignty boost
   - Requires justification + audit trail

4. **Spending Analytics**
   - Trend analysis over time
   - Cost attribution per task/agent
   - ROI calculation per spending category

5. **Tiered Overage Policy**
   - Allow small overages with sovereignty penalty
   - Grace period for transient spikes
   - Progressive penalties for repeated violations

---

**Status:** ✅ Production Ready
**Version:** 1.0.0
**Last Updated:** 2026-02-15
**Maintainer:** Agent 5 (Autonomous Builder)
