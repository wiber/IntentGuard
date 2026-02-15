/**
 * Revenue Intake Usage Examples
 *
 * This file demonstrates how to use the revenue intake stub for future crypto/service income.
 */

import RevenueIntake, { RevenueSource, PaymentMethod } from './revenue-intake.js';
import type { SkillContext } from '../types.js';

// Example 1: Basic revenue recording
async function example1_BasicRevenueRecording() {
  const revenueIntake = new RevenueIntake();

  const ctx: SkillContext = {
    log: console,
    config: {
      get: (key: string) => {
        if (key === 'dataDir') return './data';
        return undefined;
      },
    },
  } as SkillContext;

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

  console.log('✅ API usage revenue recorded: $25.50');
}

// Example 2: Crypto payment (stub - wallet integration pending)
async function example2_CryptoPayment() {
  const revenueIntake = new RevenueIntake();

  const ctx: SkillContext = {
    log: console,
    config: { get: () => undefined },
  } as SkillContext;

  await revenueIntake.initialize(ctx);

  // Record crypto payment with full metadata
  const intake = revenueIntake.recordRevenue(
    RevenueSource.CRYPTO_WALLET,
    0.005, // BTC amount
    'BTC',
    PaymentMethod.BITCOIN,
    'Bitcoin payment for consulting',
    {
      walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      transactionHash: '0x123abc...',
      confirmations: 6,
      exchangeRate: 60000.00,
      usdValue: 300.00,
    }
  );

  console.log('✅ Crypto payment recorded:');
  console.log(`   Amount: ${intake.amount} ${intake.currency}`);
  console.log(`   USD Value: $${intake.metadata?.usdValue}`);
  console.log(`   Wallet: ${intake.metadata?.walletAddress}`);
}

// Example 3: Subscription revenue
async function example3_SubscriptionRevenue() {
  const revenueIntake = new RevenueIntake();

  const ctx: SkillContext = {
    log: console,
    config: { get: () => undefined },
  } as SkillContext;

  await revenueIntake.initialize(ctx);

  // Record monthly subscription payment
  revenueIntake.recordRevenue(
    RevenueSource.SUBSCRIPTION,
    99.00,
    'USD',
    PaymentMethod.CREDIT_CARD,
    'Monthly subscription - Pro Plan',
    {
      tier: 'pro',
      period: 'monthly',
      customerId: 'customer-456',
      subscriptionId: 'sub_1234567890',
    }
  );

  console.log('✅ Subscription revenue recorded: $99.00');
}

// Example 4: Revenue analytics
async function example4_RevenueAnalytics() {
  const revenueIntake = new RevenueIntake();

  const ctx: SkillContext = {
    log: console,
    config: { get: () => undefined },
  } as SkillContext;

  await revenueIntake.initialize(ctx);

  // Add some sample revenue
  revenueIntake.recordRevenue(RevenueSource.API_USAGE, 100.00, 'USD', PaymentMethod.CREDIT_CARD, 'API usage');
  revenueIntake.recordRevenue(RevenueSource.SUBSCRIPTION, 200.00, 'USD', PaymentMethod.CREDIT_CARD, 'Subscription');
  revenueIntake.recordRevenue(RevenueSource.CONSULTING, 1500.00, 'USD', PaymentMethod.BANK_TRANSFER, 'Consulting project');

  // Get analytics
  const bySource = revenueIntake.getRevenueBySource();
  const weeklyRevenue = revenueIntake.getTotalRevenue(7);

  console.log('📊 Revenue Analytics:');
  console.log(`   Total (7 days): $${weeklyRevenue.toFixed(2)}`);
  console.log('   By Source:');
  for (const [source, amount] of Object.entries(bySource)) {
    console.log(`     - ${source}: $${amount.toFixed(2)}`);
  }
}

// Example 5: Using the skill command interface
async function example5_SkillCommandInterface() {
  const revenueIntake = new RevenueIntake();

  const ctx: SkillContext = {
    log: console,
    config: { get: () => undefined },
  } as SkillContext;

  await revenueIntake.initialize(ctx);

  // Record revenue via command
  const result = await revenueIntake.execute({
    action: 'record',
    source: RevenueSource.API_USAGE,
    amount: 50.00,
    currency: 'USD',
    paymentMethod: PaymentMethod.CREDIT_CARD,
    description: 'API usage payment',
    metadata: { customerId: 'customer-789' },
  }, ctx);

  console.log('✅ Revenue recorded via command:');
  console.log(`   Success: ${result.success}`);
  console.log(`   Message: ${result.message}`);
}

// Example 6: Crypto wallet setup (stub)
async function example6_CryptoWalletSetup() {
  const revenueIntake = new RevenueIntake();

  const ctx: SkillContext = {
    log: console,
    config: { get: () => undefined },
  } as SkillContext;

  await revenueIntake.initialize(ctx);

  // Attempt to set up Bitcoin wallet (returns stub message)
  const result = await revenueIntake.execute({
    action: 'crypto-setup',
    metadata: { chain: 'bitcoin' },
  }, ctx);

  console.log('🚧 Crypto Wallet Setup (Stub):');
  console.log(`   Success: ${result.success}`);
  console.log(`   Message: ${result.message}`);
  console.log(`   Planned Features: ${result.data?.plannedFeatures.length}`);
}

// Example 7: Invoice generation (stub)
async function example7_InvoiceGeneration() {
  const revenueIntake = new RevenueIntake();

  const ctx: SkillContext = {
    log: console,
    config: { get: () => undefined },
  } as SkillContext;

  await revenueIntake.initialize(ctx);

  // Attempt to generate invoice (returns stub message)
  const result = await revenueIntake.execute({
    action: 'invoice',
    amount: 2500.00,
    description: 'Consulting project - Phase 1',
    metadata: {
      customerId: 'customer-456',
      projectId: 'proj-789',
    },
  }, ctx);

  console.log('🚧 Invoice Generation (Stub):');
  console.log(`   Success: ${result.success}`);
  console.log(`   Message: ${result.message}`);
  console.log(`   Preview Total: $${result.data?.invoicePreview?.total}`);
}

// Run examples (uncomment to execute)
// example1_BasicRevenueRecording();
// example2_CryptoPayment();
// example3_SubscriptionRevenue();
// example4_RevenueAnalytics();
// example5_SkillCommandInterface();
// example6_CryptoWalletSetup();
// example7_InvoiceGeneration();

export {
  example1_BasicRevenueRecording,
  example2_CryptoPayment,
  example3_SubscriptionRevenue,
  example4_RevenueAnalytics,
  example5_SkillCommandInterface,
  example6_CryptoWalletSetup,
  example7_InvoiceGeneration,
};
