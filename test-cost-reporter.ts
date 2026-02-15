/**
 * test-cost-reporter.ts — Quick manual test for CostReporter
 * Run: npx tsx test-cost-reporter.ts
 */

import CostReporter from './src/skills/cost-reporter.js';
import type { SkillContext } from './src/types.js';

const mockLog = {
  debug: (msg: string) => console.log('[DEBUG]', msg),
  info: (msg: string) => console.log('[INFO]', msg),
  warn: (msg: string) => console.log('[WARN]', msg),
  error: (msg: string) => console.log('[ERROR]', msg),
};

const mockCtx = {
  log: mockLog,
} as unknown as SkillContext;

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('CostReporter Test Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  const reporter = new CostReporter();
  await reporter.initialize(mockCtx);

  // Test 1: Track Ollama inference
  console.log('\n[TEST 1] Track Ollama inference');
  const tx1 = reporter.trackInferenceCost('llama3.2', 1000, 500);
  console.log(`✓ Tracked: $${tx1.amount.toFixed(6)} for ${tx1.model}`);

  // Test 2: Track Claude Sonnet
  console.log('\n[TEST 2] Track Claude Sonnet inference');
  const tx2 = reporter.trackInferenceCost('claude-sonnet-4-5', 5000, 2000);
  console.log(`✓ Tracked: $${tx2.amount.toFixed(6)} for ${tx2.model}`);

  // Test 3: Track Claude Haiku
  console.log('\n[TEST 3] Track Claude Haiku inference');
  const tx3 = reporter.trackInferenceCost('claude-haiku', 10000, 3000);
  console.log(`✓ Tracked: $${tx3.amount.toFixed(6)} for ${tx3.model}`);

  // Test 4: Add revenue
  console.log('\n[TEST 4] Add revenue');
  const revenue = reporter.addRevenue('consulting', 100.00, 'Client project payment');
  console.log(`✓ Revenue added: $${revenue.amount.toFixed(2)} from ${revenue.category}`);

  // Test 5: Daily report
  console.log('\n[TEST 5] Generate daily report');
  const dailyReport = reporter.generateDailyReport();
  console.log('✓ Daily report generated');
  console.log(`  Transactions: ${dailyReport.topExpenses.length}`);
  console.log(`  Total spent: $${dailyReport.totalSpent.toFixed(6)}`);
  console.log(`  Total income: $${dailyReport.totalIncome.toFixed(2)}`);
  console.log(`  Net balance: $${dailyReport.netBalance.toFixed(2)}`);

  // Test 6: Discord formatting
  console.log('\n[TEST 6] Format for Discord');
  const formatted = reporter.formatForDiscord(dailyReport);
  console.log(formatted);

  // Test 7: Budget alert (critical sovereignty)
  console.log('\n[TEST 7] Budget alert check (critical sovereignty = 0.2)');
  const alert1 = reporter.checkAndAlert(0.2);
  if (alert1) {
    console.log('✓ Alert triggered:');
    console.log(alert1);
  } else {
    console.log('✓ No alert (under threshold)');
  }

  // Test 8: Budget alert (healthy sovereignty)
  console.log('\n[TEST 8] Budget alert check (healthy sovereignty = 0.8)');
  const alert2 = reporter.checkAndAlert(0.8);
  if (alert2) {
    console.log('✓ Alert triggered:');
    console.log(alert2);
  } else {
    console.log('✓ No alert (under threshold)');
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('All tests completed!');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
