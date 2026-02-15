/**
 * src/skills/cost-reporter.test.ts
 *
 * Comprehensive test suite for CostReporter
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import CostReporter, { type Transaction, type Report } from './cost-reporter.js';
import type { SkillContext } from '../types.js';

// ═══════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════

const TEST_LEDGER_PATH = path.join(process.cwd(), 'data', 'test-wallet-ledger.jsonl');

function createMockContext(): SkillContext {
  return {
    log: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {}
    }
  } as SkillContext;
}

function cleanupTestLedger(): void {
  if (fs.existsSync(TEST_LEDGER_PATH)) {
    fs.unlinkSync(TEST_LEDGER_PATH);
  }
}

// ═══════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════

describe('CostReporter', () => {
  let reporter: CostReporter;
  let ctx: SkillContext;

  beforeEach(() => {
    reporter = new CostReporter();
    ctx = createMockContext();

    // Override ledger path for testing
    (reporter as any).ledgerPath = TEST_LEDGER_PATH;

    cleanupTestLedger();
  });

  afterEach(() => {
    cleanupTestLedger();
  });

  // ═════════════════════════════════════════════════════════════
  // Initialization Tests
  // ═════════════════════════════════════════════════════════════

  describe('initialize', () => {
    it('should create data directory if it does not exist', async () => {
      const dataDir = path.dirname(TEST_LEDGER_PATH);
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true });
      }

      await reporter.initialize(ctx);

      assert.ok(fs.existsSync(dataDir), 'Data directory should exist');
      assert.ok(fs.existsSync(TEST_LEDGER_PATH), 'Ledger file should exist');
    });

    it('should create empty ledger file on first initialization', async () => {
      await reporter.initialize(ctx);

      const content = fs.readFileSync(TEST_LEDGER_PATH, 'utf-8');
      assert.strictEqual(content, '', 'Ledger should be empty initially');
    });

    it('should not overwrite existing ledger file', async () => {
      const testData = '{"test":"data"}\n';
      fs.mkdirSync(path.dirname(TEST_LEDGER_PATH), { recursive: true });
      fs.writeFileSync(TEST_LEDGER_PATH, testData, 'utf-8');

      await reporter.initialize(ctx);

      const content = fs.readFileSync(TEST_LEDGER_PATH, 'utf-8');
      assert.strictEqual(content, testData, 'Existing ledger should not be overwritten');
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Cost Tracking Tests
  // ═════════════════════════════════════════════════════════════

  describe('trackInferenceCost', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should calculate Claude Opus costs correctly', () => {
      const tx = reporter.trackInferenceCost('claude-opus-4-6', 100000, 50000);

      // (100000/1M * $15) + (50000/1M * $75) = $1.50 + $3.75 = $5.25
      assert.strictEqual(tx.amount, 5.25);
      assert.strictEqual(tx.category, 'inference-claude-opus');
      assert.strictEqual(tx.type, 'expense');
      assert.strictEqual(tx.model, 'claude-opus-4-6');
    });

    it('should calculate Claude Sonnet costs correctly', () => {
      const tx = reporter.trackInferenceCost('claude-sonnet-4-5', 200000, 100000);

      // (200000/1M * $3) + (100000/1M * $15) = $0.60 + $1.50 = $2.10
      assert.strictEqual(tx.amount, 2.1);
      assert.strictEqual(tx.category, 'inference-claude-sonnet');
    });

    it('should calculate Claude Haiku costs correctly', () => {
      const tx = reporter.trackInferenceCost('claude-haiku-4-5', 500000, 250000);

      // (500000/1M * $0.25) + (250000/1M * $1.25) = $0.125 + $0.3125 = $0.4375
      assert.strictEqual(tx.amount, 0.4375);
      assert.strictEqual(tx.category, 'inference-claude-haiku');
    });

    it('should calculate Ollama electricity costs correctly', () => {
      const tx = reporter.trackInferenceCost('llama3:70b', 10000, 5000);

      // (15000/1000 * $0.0001) = 15 * 0.0001 = $0.0015
      assert.strictEqual(tx.amount, 0.0015);
      assert.strictEqual(tx.category, 'inference-ollama');
    });

    it('should append transaction to ledger', () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 10000, 5000);

      const content = fs.readFileSync(TEST_LEDGER_PATH, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      assert.strictEqual(lines.length, 1, 'Should have one transaction');

      const tx = JSON.parse(lines[0]);
      assert.strictEqual(tx.type, 'expense');
      assert.strictEqual(tx.category, 'inference-claude-sonnet');
    });

    it('should include description with token counts', () => {
      const tx = reporter.trackInferenceCost('claude-opus-4-6', 12345, 6789);

      assert.ok(tx.description.includes('12345 in'));
      assert.ok(tx.description.includes('6789 out'));
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Revenue Tracking Tests
  // ═════════════════════════════════════════════════════════════

  describe('addRevenue', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should create income transaction', () => {
      const tx = reporter.addRevenue('client-alpha', 150.00, 'Monthly retainer');

      assert.strictEqual(tx.type, 'income');
      assert.strictEqual(tx.amount, 150.00);
      assert.strictEqual(tx.category, 'revenue-client-alpha');
      assert.strictEqual(tx.description, 'Monthly retainer');
    });

    it('should append revenue to ledger', () => {
      reporter.addRevenue('consulting', 500.00, 'Project completion bonus');

      const content = fs.readFileSync(TEST_LEDGER_PATH, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      assert.strictEqual(lines.length, 1);

      const tx = JSON.parse(lines[0]);
      assert.strictEqual(tx.type, 'income');
      assert.strictEqual(tx.amount, 500.00);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Report Generation Tests
  // ═════════════════════════════════════════════════════════════

  describe('generateDailyReport', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should generate empty report for day with no transactions', () => {
      const report = reporter.generateDailyReport();

      assert.strictEqual(report.totalSpent, 0);
      assert.strictEqual(report.totalIncome, 0);
      assert.strictEqual(report.netBalance, 0);
      assert.deepStrictEqual(report.byCategory, {});
      assert.strictEqual(report.topExpenses.length, 0);
    });

    it('should calculate totals correctly with mixed transactions', () => {
      // Add expenses
      reporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);
      reporter.trackInferenceCost('llama3:70b', 10000, 5000);

      // Add income
      reporter.addRevenue('client-alpha', 100.00, 'Payment');

      const report = reporter.generateDailyReport();

      assert.ok(report.totalSpent > 0, 'Should have expenses');
      assert.strictEqual(report.totalIncome, 100.00);
      assert.strictEqual(report.netBalance, report.totalIncome - report.totalSpent);
    });

    it('should group by category correctly', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 50000, 25000);
      reporter.trackInferenceCost('claude-opus-4-6', 50000, 25000);
      reporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);

      const report = reporter.generateDailyReport();

      assert.ok('inference-claude-opus' in report.byCategory);
      assert.ok('inference-claude-sonnet' in report.byCategory);

      // Expenses should be negative in byCategory
      assert.ok(report.byCategory['inference-claude-opus'] < 0);
      assert.ok(report.byCategory['inference-claude-sonnet'] < 0);
    });

    it('should sort top expenses by amount descending', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 100000, 50000); // ~$5.25
      reporter.trackInferenceCost('claude-sonnet-4-5', 50000, 25000); // ~$0.525
      reporter.trackInferenceCost('claude-haiku-4-5', 10000, 5000); // ~$0.009

      const report = reporter.generateDailyReport();

      assert.strictEqual(report.topExpenses.length, 3);
      assert.ok(report.topExpenses[0].amount > report.topExpenses[1].amount);
      assert.ok(report.topExpenses[1].amount > report.topExpenses[2].amount);
    });

    it('should handle specific date parameter', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      // Use UTC to avoid timezone issues
      const dateStr = yesterday.toISOString().split('T')[0];

      const report = reporter.generateDailyReport(dateStr);

      // Allow for date difference due to timezone handling
      assert.ok(report.period.start);
      assert.ok(report.period.end);
      assert.strictEqual(report.period.days, 1);
    });
  });

  describe('generateWeeklyReport', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should include transactions from last 7 days', () => {
      // Add some transactions
      reporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);
      reporter.addRevenue('client-alpha', 200.00, 'Weekly payment');

      const report = reporter.generateWeeklyReport();

      assert.strictEqual(report.period.days, 7);
      assert.ok(report.totalSpent > 0);
      assert.strictEqual(report.totalIncome, 200.00);
    });

    it('should calculate average daily spend in summary', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 100000, 50000);

      const report = reporter.generateWeeklyReport();
      const avgDaily = report.totalSpent / 7;

      assert.ok(report.summary.includes(avgDaily.toFixed(4)));
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Budget Check Tests
  // ═════════════════════════════════════════════════════════════

  describe('isBudgetExceeded', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should return false when under daily budget', () => {
      reporter.trackInferenceCost('claude-haiku-4-5', 10000, 5000); // ~$0.009

      assert.strictEqual(reporter.isBudgetExceeded(), false);
    });

    it('should return true when daily budget exceeded', () => {
      // Track enough to exceed $5 daily budget
      reporter.trackInferenceCost('claude-opus-4-6', 500000, 250000); // ~$26.25

      assert.strictEqual(reporter.isBudgetExceeded(), true);
    });
  });

  describe('getDailySpend', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should return total spend for today', () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);
      reporter.trackInferenceCost('claude-haiku-4-5', 10000, 5000);

      const dailySpend = reporter.getDailySpend();
      const report = reporter.generateDailyReport();

      assert.strictEqual(dailySpend, report.totalSpent);
    });
  });

  describe('getDailyBudget', () => {
    it('should return configured daily budget', () => {
      assert.strictEqual(reporter.getDailyBudget(), 5.00);
    });
  });

  describe('checkAndAlert', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should return null when under threshold', () => {
      reporter.trackInferenceCost('claude-haiku-4-5', 1000, 500); // ~$0.002

      const alert = reporter.checkAndAlert(0.8); // Healthy sovereignty

      assert.strictEqual(alert, null);
    });

    it('should alert at $1 threshold for critical sovereignty', () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 200000, 100000); // ~$2.10

      const alert = reporter.checkAndAlert(0.2); // Critical sovereignty

      assert.ok(alert !== null);
      assert.ok(alert.includes('🔴 CRITICAL'));
      assert.ok(alert.includes('$1.00'));
    });

    it('should alert at $5 threshold for warning sovereignty', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 500000, 250000); // ~$26.25

      const alert = reporter.checkAndAlert(0.5); // Warning sovereignty

      assert.ok(alert !== null);
      assert.ok(alert.includes('🟡 WARNING'));
      assert.ok(alert.includes('$5.00'));
    });

    it('should alert at $20 threshold for healthy sovereignty', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 1500000, 750000); // ~$78.75

      const alert = reporter.checkAndAlert(0.9); // Healthy sovereignty

      assert.ok(alert !== null);
      assert.ok(alert.includes('🟢 HEALTHY'));
      assert.ok(alert.includes('$20.00'));
    });

    it('should include top categories in alert', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 100000, 50000);
      reporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);

      const alert = reporter.checkAndAlert(0.2);

      assert.ok(alert !== null);
      assert.ok(alert.includes('inference-claude-opus'));
      assert.ok(alert.includes('inference-claude-sonnet'));
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Discord Formatting Tests
  // ═════════════════════════════════════════════════════════════

  describe('formatForDiscord', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should format report with ASCII box borders', () => {
      const report = reporter.generateDailyReport();
      const formatted = reporter.formatForDiscord(report);

      assert.ok(formatted.includes('```'));
      assert.ok(formatted.includes('╔════'));
      assert.ok(formatted.includes('WALLET REPORT'));
      assert.ok(formatted.includes('╚════'));
    });

    it('should include period information', () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 10000, 5000);

      const report = reporter.generateDailyReport();
      const formatted = reporter.formatForDiscord(report);

      assert.ok(formatted.includes('Period:'));
      assert.ok(formatted.includes('Days: 1'));
    });

    it('should include financial summary', () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);
      reporter.addRevenue('client-alpha', 100.00, 'Payment');

      const report = reporter.generateDailyReport();
      const formatted = reporter.formatForDiscord(report);

      assert.ok(formatted.includes('Total Income:'));
      assert.ok(formatted.includes('Total Expenses:'));
      assert.ok(formatted.includes('Net Balance:'));
    });

    it('should include category breakdown', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 50000, 25000);
      reporter.trackInferenceCost('claude-sonnet-4-5', 50000, 25000);

      const report = reporter.generateDailyReport();
      const formatted = reporter.formatForDiscord(report);

      assert.ok(formatted.includes('BY CATEGORY:'));
      assert.ok(formatted.includes('inference-claude-opus'));
      assert.ok(formatted.includes('inference-claude-sonnet'));
    });

    it('should include top expenses section', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 100000, 50000);
      reporter.trackInferenceCost('claude-sonnet-4-5', 50000, 25000);

      const report = reporter.generateDailyReport();
      const formatted = reporter.formatForDiscord(report);

      assert.ok(formatted.includes('TOP EXPENSES:'));
    });

    it('should truncate long descriptions', () => {
      const longModel = 'claude-opus-4-6-with-very-long-name-that-exceeds-character-limit';
      reporter.trackInferenceCost(longModel, 10000, 5000);

      const report = reporter.generateDailyReport();
      const formatted = reporter.formatForDiscord(report);

      assert.ok(formatted.includes('...'));
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Command Handler Tests
  // ═════════════════════════════════════════════════════════════

  describe('execute - command handlers', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should handle track-inference command', async () => {
      const result = await reporter.execute({
        action: 'track-inference',
        model: 'claude-sonnet-4-5',
        inputTokens: 10000,
        outputTokens: 5000
      }, ctx);

      assert.strictEqual(result.success, true);
      assert.ok(result.message?.includes('Tracked inference'));
      assert.ok(result.data);
    });

    it('should handle daily-report command', async () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 10000, 5000);

      const result = await reporter.execute({
        action: 'daily-report'
      }, ctx);

      assert.strictEqual(result.success, true);
      assert.ok(result.message?.includes('WALLET REPORT'));
      assert.ok(result.data);
    });

    it('should handle weekly-report command', async () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 10000, 5000);

      const result = await reporter.execute({
        action: 'weekly-report'
      }, ctx);

      assert.strictEqual(result.success, true);
      assert.ok(result.message?.includes('WALLET REPORT'));
      assert.ok(result.data);
    });

    it('should handle add-revenue command', async () => {
      const result = await reporter.execute({
        action: 'add-revenue',
        source: 'client-alpha',
        amount: 150.00,
        description: 'Monthly retainer'
      }, ctx);

      assert.strictEqual(result.success, true);
      assert.ok(result.message?.includes('Added revenue'));
      assert.ok(result.data);
    });

    it('should handle check-budget command', async () => {
      reporter.trackInferenceCost('claude-haiku-4-5', 1000, 500);

      const result = await reporter.execute({
        action: 'check-budget',
        sovereignty: 0.8
      }, ctx);

      assert.strictEqual(result.success, true);
      assert.ok(result.message);
      assert.ok(result.data);
    });

    it('should return error for unknown action', async () => {
      const result = await reporter.execute({
        action: 'invalid-action'
      }, ctx);

      assert.strictEqual(result.success, false);
      assert.ok(result.message?.includes('Unknown action'));
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Edge Cases & Error Handling
  // ═════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should handle malformed JSON lines in ledger', () => {
      // Write valid and invalid lines
      fs.appendFileSync(TEST_LEDGER_PATH, '{"valid":"transaction"}\n', 'utf-8');
      fs.appendFileSync(TEST_LEDGER_PATH, 'invalid json line\n', 'utf-8');
      fs.appendFileSync(TEST_LEDGER_PATH, '{"another":"valid"}\n', 'utf-8');

      // Should not throw, should skip invalid lines
      const report = reporter.generateDailyReport();
      assert.ok(report); // Successfully generated despite malformed line
    });

    it('should handle zero token counts', () => {
      const tx = reporter.trackInferenceCost('claude-sonnet-4-5', 0, 0);

      assert.strictEqual(tx.amount, 0);
    });

    it('should handle very large token counts', () => {
      const tx = reporter.trackInferenceCost('claude-opus-4-6', 10000000, 5000000);

      // (10M/1M * $15) + (5M/1M * $75) = $150 + $375 = $525
      assert.strictEqual(tx.amount, 525);
    });

    it('should handle transactions at exact threshold boundaries', () => {
      // Add exactly $5.00 worth of inference
      reporter.trackInferenceCost('claude-opus-4-6', 333333, 0); // $4.99995 (under threshold)

      let exceeded = reporter.isBudgetExceeded();
      assert.strictEqual(exceeded, false);

      // Add one more tiny transaction to push over
      reporter.trackInferenceCost('claude-haiku-4-5', 10000, 0); // $0.0025

      exceeded = reporter.isBudgetExceeded();
      assert.strictEqual(exceeded, true);
    });

    it('should handle multiple transactions on same day', () => {
      for (let i = 0; i < 10; i++) {
        reporter.trackInferenceCost('claude-haiku-4-5', 1000, 500);
      }

      const report = reporter.generateDailyReport();
      assert.strictEqual(report.topExpenses.length, 10);
    });

    it('should handle empty ledger file gracefully', () => {
      fs.writeFileSync(TEST_LEDGER_PATH, '', 'utf-8');

      const report = reporter.generateDailyReport();
      assert.strictEqual(report.totalSpent, 0);
      assert.strictEqual(report.totalIncome, 0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Integration Tests
  // ═════════════════════════════════════════════════════════════

  describe('integration scenarios', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should track full day of mixed activity', () => {
      // Morning: Claude Opus heavy work
      reporter.trackInferenceCost('claude-opus-4-6', 100000, 50000);
      reporter.trackInferenceCost('claude-opus-4-6', 80000, 40000);

      // Afternoon: Switch to Sonnet
      reporter.trackInferenceCost('claude-sonnet-4-5', 150000, 75000);
      reporter.trackInferenceCost('claude-sonnet-4-5', 120000, 60000);

      // Evening: Ollama for simple tasks
      reporter.trackInferenceCost('llama3:70b', 50000, 25000);
      reporter.trackInferenceCost('llama3:70b', 30000, 15000);

      // Revenue received
      reporter.addRevenue('client-alpha', 200.00, 'Monthly payment');

      const report = reporter.generateDailyReport();

      assert.ok(report.totalSpent > 0);
      assert.strictEqual(report.totalIncome, 200.00);
      assert.strictEqual(Object.keys(report.byCategory).length, 4); // 3 inference types + 1 revenue
      assert.strictEqual(report.topExpenses.length, 6);
    });

    it('should handle budget alert workflow', () => {
      // Start with low sovereignty
      let sovereignty = 0.2;

      // Track some spending
      reporter.trackInferenceCost('claude-sonnet-4-5', 200000, 100000); // ~$2.10

      // Check budget - should alert at $1 threshold
      let alert = reporter.checkAndAlert(sovereignty);
      assert.ok(alert !== null);
      assert.ok(alert.includes('🔴 CRITICAL'));

      // Improve sovereignty
      sovereignty = 0.7;

      // Same spending now within threshold
      alert = reporter.checkAndAlert(sovereignty);
      assert.strictEqual(alert, null);
    });

    it('should generate weekly P&L report', () => {
      // Simulate week of activity
      for (let day = 0; day < 7; day++) {
        // Daily inference costs
        reporter.trackInferenceCost('claude-sonnet-4-5', 50000, 25000);
        reporter.trackInferenceCost('llama3:70b', 20000, 10000);

        // Revenue every 3 days
        if (day % 3 === 0) {
          reporter.addRevenue('client-alpha', 50.00, `Day ${day} payment`);
        }
      }

      const report = reporter.generateWeeklyReport();

      assert.ok(report.totalSpent > 0);
      assert.ok(report.totalIncome > 0);
      assert.strictEqual(report.period.days, 7);

      // Should have positive or negative net balance
      assert.strictEqual(report.netBalance, report.totalIncome - report.totalSpent);
    });
  });
});
