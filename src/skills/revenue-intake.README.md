# Revenue Intake Stub

**Status**: 🚧 Stub Implementation (Future Integration Planned)

## Overview

The Revenue Intake module provides a placeholder architecture for future cryptocurrency and service income integration. This stub implementation establishes the foundation for:

- **Crypto wallet payments** (Bitcoin, Ethereum, Solana)
- **Service revenue tracking** (API usage, subscriptions, consulting)
- **Grant/funding intake management**
- **Invoice generation** (future PDF/HTML output)
- **Integration with wallet-ledger** for append-only transaction logging

## Current Status

### ✅ Implemented (Working Now)
- Revenue recording and tracking
- Integration with `WalletLedger` (JSONL append-only log)
- Revenue analytics by source
- Total revenue calculations
- Multiple revenue source support
- Transaction metadata support

### 🚧 Stubbed (Future Implementation)
- Crypto wallet address generation
- Payment webhook notifications
- Smart contract revenue collection
- API key generation and metering
- Subscription tier management
- Invoice PDF/HTML generation
- Payment processor integration (Stripe, etc.)
- tesseract.nu playground monetization
- Claude Flow agent pool fee collection

## Usage

### Basic Revenue Recording

```typescript
import RevenueIntake, { RevenueSource, PaymentMethod } from './skills/revenue-intake.js';

const revenueIntake = new RevenueIntake();
await revenueIntake.initialize(ctx);

// Record API usage revenue
revenueIntake.recordRevenue(
  RevenueSource.API_USAGE,
  25.50,
  'USD',
  PaymentMethod.CREDIT_CARD,
  'API usage for customer-123',
  { customerId: 'customer-123', requestCount: 1000 }
);

// Record crypto payment (stub - wallet integration pending)
revenueIntake.recordRevenue(
  RevenueSource.CRYPTO_WALLET,
  150.00,
  'USD',
  PaymentMethod.BITCOIN,
  'Bitcoin payment from client',
  {
    walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    transactionHash: '0x123abc...',
    confirmations: 6
  }
);

// Record subscription revenue
revenueIntake.recordRevenue(
  RevenueSource.SUBSCRIPTION,
  99.00,
  'USD',
  PaymentMethod.CREDIT_CARD,
  'Monthly subscription - Pro Plan',
  { tier: 'pro', period: 'monthly' }
);
```

### Revenue Analytics

```typescript
// Get revenue by source
const bySource = revenueIntake.getRevenueBySource();
console.log('API Usage:', bySource[RevenueSource.API_USAGE]);
console.log('Subscriptions:', bySource[RevenueSource.SUBSCRIPTION]);

// Get total revenue for period
const weeklyRevenue = revenueIntake.getTotalRevenue(7);  // Last 7 days
const monthlyRevenue = revenueIntake.getTotalRevenue(30); // Last 30 days

console.log('Weekly Revenue:', weeklyRevenue);
console.log('Monthly Revenue:', monthlyRevenue);
```

### Skill Command Interface

```typescript
// Record revenue via command
const result = await revenueIntake.execute({
  action: 'record',
  source: RevenueSource.API_USAGE,
  amount: 50.00,
  currency: 'USD',
  paymentMethod: PaymentMethod.CREDIT_CARD,
  description: 'API usage payment',
  metadata: { customerId: 'customer-456' }
}, ctx);

// Generate revenue analytics
const analytics = await revenueIntake.execute({
  action: 'analytics',
  period: 'weekly' // 'daily', 'weekly', or 'monthly'
}, ctx);

// Attempt crypto setup (returns stub message)
const cryptoSetup = await revenueIntake.execute({
  action: 'crypto-setup',
  metadata: { chain: 'ethereum' }
}, ctx);

// Attempt service configuration (returns stub message)
const serviceConfig = await revenueIntake.execute({
  action: 'service-config',
  metadata: { serviceType: 'api' }
}, ctx);

// Attempt invoice generation (returns stub message)
const invoice = await revenueIntake.execute({
  action: 'invoice',
  amount: 1000.00,
  description: 'Professional services',
  metadata: { customerId: 'customer-123' }
}, ctx);
```

## Revenue Sources

### Currently Supported

| Source | Description | Integration Status |
|--------|-------------|-------------------|
| `CRYPTO_WALLET` | Bitcoin/Ethereum/Solana wallet payments | 🚧 Stub (recording works, wallet integration pending) |
| `CRYPTO_SMART_CONTRACT` | Smart contract revenues | 🚧 Stub |
| `API_USAGE` | Pay-per-use API calls | ✅ Recording works, metering stub |
| `SUBSCRIPTION` | Monthly/annual subscriptions | ✅ Recording works, tier management stub |
| `CONSULTING` | Professional services | ✅ Full support |
| `SUPPORT` | Technical support contracts | ✅ Full support |
| `PLAYGROUND_USAGE` | tesseract.nu playground fees | 🚧 Stub |
| `AGENT_POOL_FEES` | Claude Flow agent pool usage | 🚧 Stub |
| `GRANT` | Research/development grants | ✅ Full support |
| `INVESTMENT` | Equity/token investments | ✅ Full support |
| `DONATION` | Open-source donations | ✅ Full support |
| `OTHER` | Other revenue sources | ✅ Full support |

## Payment Methods

### Currently Supported

| Method | Description | Integration Status |
|--------|-------------|-------------------|
| `BITCOIN` | Bitcoin payments | 🚧 Stub (wallet integration pending) |
| `ETHEREUM` | Ethereum payments | 🚧 Stub (wallet integration pending) |
| `SOLANA` | Solana payments | 🚧 Stub (wallet integration pending) |
| `LIGHTNING` | Lightning Network payments | 🚧 Stub |
| `CREDIT_CARD` | Credit card payments | 🚧 Stub (Stripe integration pending) |
| `BANK_TRANSFER` | Bank wire transfers | 🚧 Stub |
| `PAYPAL` | PayPal payments | 🚧 Stub |
| `MANUAL` | Manual revenue recording | ✅ Full support |
| `OTHER` | Other payment methods | ✅ Full support |

## Integration with WalletLedger

All revenue records are automatically appended to the wallet ledger (`data/wallet-ledger.jsonl`) with:

- Transaction timestamp
- Revenue source
- Amount and currency
- Payment method
- Description
- FIM sovereignty score at time of transaction
- Custom metadata

This ensures:
- **Append-only audit trail** - no transaction can be deleted or modified
- **Integration with P&L reports** - revenue appears in daily/weekly reports
- **Budget tracking** - revenue increases available spending limits
- **Economic self-awareness** - autonomous agents see their income streams

## Future Roadmap

### Phase 1: Crypto Wallet Integration
- [ ] Bitcoin wallet address generation
- [ ] Ethereum smart contract deployment
- [ ] Solana wallet integration
- [ ] Lightning Network node setup
- [ ] Payment webhook notifications
- [ ] Multi-chain support

### Phase 2: Service Monetization
- [ ] API key generation and metering
- [ ] Subscription tier management (Basic, Pro, Enterprise)
- [ ] Usage-based billing automation
- [ ] Payment processor integration (Stripe, etc.)
- [ ] tesseract.nu playground billing
- [ ] Claude Flow agent pool fee collection

### Phase 3: Invoice & Accounting
- [ ] PDF invoice generation
- [ ] Email delivery
- [ ] Payment link generation (crypto + traditional)
- [ ] Invoice tracking and reminders
- [ ] Accounting system integration (QuickBooks, Xero)
- [ ] Tax reporting helpers

### Phase 4: Advanced Features
- [ ] Recurring revenue analytics
- [ ] Customer lifetime value tracking
- [ ] Revenue forecasting
- [ ] Multi-currency support
- [ ] Exchange rate tracking
- [ ] Automated revenue recognition

## Architecture Notes

### Why This Is a Stub

The Revenue Intake module is intentionally implemented as a stub because:

1. **Payment Integration Complexity**: Integrating with crypto wallets, payment processors, and banking systems requires extensive testing, security audits, and compliance work.

2. **Regulatory Requirements**: Different revenue sources (especially crypto) require different regulatory compliance approaches.

3. **Incremental Development**: By stubbing out the infrastructure now, we can:
   - Record revenue manually while building the automated integration
   - Design the data model and API correctly from the start
   - Avoid refactoring when real integrations are added later

4. **Future-Ready Design**: The stub includes all planned features as methods that return "not yet implemented" messages, making it clear what functionality is coming.

### Integration Points

When implementing real integrations, the following points need to be addressed:

1. **Crypto Wallets**:
   - Secure key management (HSM or multi-sig)
   - Webhook handlers for payment notifications
   - Exchange rate tracking for USD conversion
   - Transaction confirmation monitoring

2. **Service Revenue**:
   - API key generation and rotation
   - Rate limiting and quota management
   - Usage metering and aggregation
   - Billing cycle automation

3. **Invoice System**:
   - Template engine for PDF/HTML generation
   - Email delivery system
   - Payment link generation
   - Invoice status tracking

## Testing

Run comprehensive tests:

```bash
npx tsx src/skills/revenue-intake.test.ts
```

Test coverage includes:
- ✅ Revenue recording for all source types
- ✅ Payment method validation
- ✅ Analytics and reporting
- ✅ WalletLedger integration
- ✅ Stub functionality verification
- ✅ Real-world scenario testing

## Related Files

- `src/skills/revenue-intake.ts` - Main implementation
- `src/skills/revenue-intake.test.ts` - Comprehensive test suite
- `src/skills/wallet-ledger.ts` - Append-only transaction log
- `src/skills/wallet.ts` - Economic sovereignty wallet
- `src/skills/cost-reporter.ts` - P&L reporting

## Questions?

This is a **stub implementation** designed to establish the foundation for future revenue integration. When you're ready to implement real crypto wallets, payment processors, or service billing, refer to the planned features in the code comments and this documentation.

For issues or feature requests, see: https://github.com/anthropics/intentguard/issues
