/**
 * src/skills/cost-reporter.test.ts
 *
 * Comprehensive test suite for CostReporter
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CostReporter, { type Transaction, type Report } from './cost-reporter.js';
import type { SkillContext } from '../types.js';

// ===================================================================
// Test Fixtures
// ===================================================================

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

// ===================================================================
// Test Suite
// ===================================================================

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

  // =================================================================
  // Initialization Tests
  // =================================================================

  describe('initialize', () => {
    it('should create data directory if it does not exist', async () => {
      const dataDir = path.dirname(TEST_LEDGER_PATH);
      if (fs.existsSync(dataDir)) {
        // Don't remove entire data dir as other tests may need it
      }

      await reporter.initialize(ctx);

      expect(fs.existsSync(dataDir)).toBe(true);
      expect(fs.existsSync(TEST_LEDGER_PATH)).toBe(true);
    });

    it('should create empty ledger file on first initialization', async () => {
      await reporter.initialize(ctx);

      const content = fs.readFileSync(TEST_LEDGER_PATH, 'utf-8');
      expect(content).toBe('');
    });

    it('should not overwrite existing ledger file', async () => {
      const testData = '{"test":"data"}\n';
      fs.mkdirSync(path.dirname(TEST_LEDGER_PATH), { recursive: true });
      fs.writeFileSync(TEST_LEDGER_PATH, testData, 'utf-8');

      await reporter.initialize(ctx);

      const content = fs.readFileSync(TEST_LEDGER_PATH, 'utf-8');
      expect(content).toBe(testData);
    });
  });

  // =================================================================
  // Cost Tracking Tests
  // =================================================================

  describe('trackInferenceCost', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should calculate Claude Opus costs correctly', () => {
      const tx = reporter.trackInferenceCost('claude-opus-4-6', 100000, 50000);

      // (100000/1M * $15) + (50000/1M * $75) = $1.50 + $3.75 = $5.25
      expect(tx.amount).toBe(5.25);
      expect(tx.category).toBe('inference-claude-opus');
      expect(tx.type).toBe('expense');
      expect(tx.model).toBe('claude-opus-4-6');
    });

    it('should calculate Claude Sonnet costs correctly', () => {
      const tx = reporter.trackInferenceCost('claude-sonnet-4-5', 200000, 100000);

      // (200000/1M * $3) + (100000/1M * $15) = $0.60 + $1.50 = $2.10
      expect(tx.amount).toBe(2.1);
      expect(tx.category).toBe('inference-claude-sonnet');
    });

    it('should calculate Claude Haiku costs correctly', () => {
      const tx = reporter.trackInferenceCost('claude-haiku-4-5', 500000, 250000);

      // (500000/1M * $0.25) + (250000/1M * $1.25) = $0.125 + $0.3125 = $0.4375
      expect(tx.amount).toBe(0.4375);
      expect(tx.category).toBe('inference-claude-haiku');
    });

    it('should calculate Ollama electricity costs correctly', () => {
      const tx = reporter.trackInferenceCost('llama3:70b', 10000, 5000);

      // (15000/1000 * $0.0001) = 15 * 0.0001 = $0.0015
      expect(tx.amount).toBe(0.0015);
      expect(tx.category).toBe('inference-ollama');
    });

    it('should append transaction to ledger', () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 10000, 5000);

      const content = fs.readFileSync(TEST_LEDGER_PATH, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      expect(lines.length).toBe(1);

      const tx = JSON.parse(lines[0]);
      expect(tx.type).toBe('expense');
      expect(tx.category).toBe('inference-claude-sonnet');
    });

    it('should include description with token counts', () => {
      const tx = reporter.trackInferenceCost('claude-opus-4-6', 12345, 6789);

      expect(tx.description).toContain('12345 in');
      expect(tx.description).toContain('6789 out');
    });
  });

  // =================================================================
  // Revenue Tracking Tests
  // =================================================================

  describe('addRevenue', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should create income transaction', () => {
      const tx = reporter.addRevenue('client-alpha', 150.00, 'Monthly retainer');

      expect(tx.type).toBe('income');
      expect(tx.amount).toBe(150.00);
      expect(tx.category).toBe('revenue-client-alpha');
      expect(tx.description).toBe('Monthly retainer');
    });

    it('should append revenue to ledger', () => {
      reporter.addRevenue('consulting', 500.00, 'Project completion bonus');

      const content = fs.readFileSync(TEST_LEDGER_PATH, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      expect(lines.length).toBe(1);

      const tx = JSON.parse(lines[0]);
      expect(tx.type).toBe('income');
      expect(tx.amount).toBe(500.00);
    });
  });

  // =================================================================
  // Report Generation Tests
  // =================================================================

  describe('generateDailyReport', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should generate empty report for day with no transactions', () => {
      const report = reporter.generateDailyReport();

      expect(report.totalSpent).toBe(0);
      expect(report.totalIncome).toBe(0);
      expect(report.netBalance).toBe(0);
      expect(report.byCategory).toEqual({});
      expect(report.topExpenses.length).toBe(0);
    });

    it('should calculate totals correctly with mixed transactions', () => {
      // Add expenses
      reporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);
      reporter.trackInferenceCost('llama3:70b', 10000, 5000);

      // Add income
      reporter.addRevenue('client-alpha', 100.00, 'Payment');

      const report = reporter.generateDailyReport();

      expect(report.totalSpent).toBeGreaterThan(0);
      expect(report.totalIncome).toBe(100.00);
      expect(report.netBalance).toBe(report.totalIncome - report.totalSpent);
    });

    it('should group by category correctly', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 50000, 25000);
      reporter.trackInferenceCost('claude-opus-4-6', 50000, 25000);
      reporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);

      const report = reporter.generateDailyReport();

      expect('inference-claude-opus' in report.byCategory).toBe(true);
      expect('inference-claude-sonnet' in report.byCategory).toBe(true);

      // Expenses should be negative in byCategory
      expect(report.byCategory['inference-claude-opus']).toBeLessThan(0);
      expect(report.byCategory['inference-claude-sonnet']).toBeLessThan(0);
    });

    it('should sort top expenses by amount descending', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 100000, 50000); // ~$5.25
      reporter.trackInferenceCost('claude-sonnet-4-5', 50000, 25000); // ~$0.525
      reporter.trackInferenceCost('claude-haiku-4-5', 10000, 5000); // ~$0.009

      const report = reporter.generateDailyReport();

      expect(report.topExpenses.length).toBe(3);
      expect(report.topExpenses[0].amount).toBeGreaterThan(report.topExpenses[1].amount);
      expect(report.topExpenses[1].amount).toBeGreaterThan(report.topExpenses[2].amount);
    });

    it('should handle specific date parameter', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      const report = reporter.generateDailyReport(dateStr);

      expect(report.period.start).toBeTruthy();
      expect(report.period.end).toBeTruthy();
      expect(report.period.days).toBe(1);
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

      expect(report.period.days).toBe(7);
      expect(report.totalSpent).toBeGreaterThan(0);
      expect(report.totalIncome).toBe(200.00);
    });

    it('should calculate average daily spend in summary', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 100000, 50000);

      const report = reporter.generateWeeklyReport();
      const avgDaily = report.totalSpent / 7;

      expect(report.summary).toContain(avgDaily.toFixed(4));
    });
  });

  // =================================================================
  // Budget Check Tests
  // =================================================================

  describe('isBudgetExceeded', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should return false when under daily budget', () => {
      reporter.trackInferenceCost('claude-haiku-4-5', 10000, 5000); // ~$0.009

      expect(reporter.isBudgetExceeded()).toBe(false);
    });

    it('should return true when daily budget exceeded', () => {
      // Track enough to exceed $5 daily budget
      reporter.trackInferenceCost('claude-opus-4-6', 500000, 250000); // ~$26.25

      expect(reporter.isBudgetExceeded()).toBe(true);
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

      expect(dailySpend).toBe(report.totalSpent);
    });
  });

  describe('getDailyBudget', () => {
    it('should return configured daily budget', () => {
      expect(reporter.getDailyBudget()).toBe(5.00);
    });
  });

  describe('checkAndAlert', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should return null when under threshold', () => {
      reporter.trackInferenceCost('claude-haiku-4-5', 1000, 500); // ~$0.002

      const alert = reporter.checkAndAlert(0.8); // Healthy sovereignty

      expect(alert).toBeNull();
    });

    it('should alert at $1 threshold for critical sovereignty', () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 200000, 100000); // ~$2.10

      const alert = reporter.checkAndAlert(0.2); // Critical sovereignty

      expect(alert).not.toBeNull();
      expect(alert).toContain('CRITICAL');
      expect(alert).toContain('$1.00');
    });

    it('should alert at $5 threshold for warning sovereignty', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 500000, 250000); // ~$26.25

      const alert = reporter.checkAndAlert(0.5); // Warning sovereignty

      expect(alert).not.toBeNull();
      expect(alert).toContain('WARNING');
      expect(alert).toContain('$5.00');
    });

    it('should alert at $20 threshold for healthy sovereignty', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 1500000, 750000); // ~$78.75

      const alert = reporter.checkAndAlert(0.9); // Healthy sovereignty

      expect(alert).not.toBeNull();
      expect(alert).toContain('HEALTHY');
      expect(alert).toContain('$20.00');
    });

    it('should include top categories in alert', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 100000, 50000);
      reporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);

      const alert = reporter.checkAndAlert(0.2);

      expect(alert).not.toBeNull();
      expect(alert).toContain('inference-claude-opus');
      expect(alert).toContain('inference-claude-sonnet');
    });
  });

  // =================================================================
  // Discord Formatting Tests
  // =================================================================

  describe('formatForDiscord', () => {
    beforeEach(async () => {
      await reporter.initialize(ctx);
    });

    it('should format report with ASCII box borders', () => {
      const report = reporter.generateDailyReport();
      const formatted = reporter.formatForDiscord(report);

      expect(formatted).toContain('```');
      expect(formatted).toContain('WALLET REPORT');
    });

    it('should include period information', () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 10000, 5000);

      const report = reporter.generateDailyReport();
      const formatted = reporter.formatForDiscord(report);

      expect(formatted).toContain('Period:');
      expect(formatted).toContain('Days: 1');
    });

    it('should include financial summary', () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);
      reporter.addRevenue('client-alpha', 100.00, 'Payment');

      const report = reporter.generateDailyReport();
      const formatted = reporter.formatForDiscord(report);

      expect(formatted).toContain('Total Income:');
      expect(formatted).toContain('Total Expenses:');
      expect(formatted).toContain('Net Balance:');
    });

    it('should include category breakdown', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 50000, 25000);
      reporter.trackInferenceCost('claude-sonnet-4-5', 50000, 25000);

      const report = reporter.generateDailyReport();
      const formatted = reporter.formatForDiscord(report);

      expect(formatted).toContain('BY CATEGORY:');
      expect(formatted).toContain('inference-claude-opus');
      expect(formatted).toContain('inference-claude-sonnet');
    });

    it('should include top expenses section', () => {
      reporter.trackInferenceCost('claude-opus-4-6', 100000, 50000);
      reporter.trackInferenceCost('claude-sonnet-4-5', 50000, 25000);

      const report = reporter.generateDailyReport();
      const formatted = reporter.formatForDiscord(report);

      expect(formatted).toContain('TOP EXPENSES:');
    });

    it('should truncate long descriptions', () => {
      const longModel = 'claude-opus-4-6-with-very-long-name-that-exceeds-character-limit';
      reporter.trackInferenceCost(longModel, 10000, 5000);

      const report = reporter.generateDailyReport();
      const formatted = reporter.formatForDiscord(report);

      expect(formatted).toContain('...');
    });
  });

  // =================================================================
  // Command Handler Tests
  // =================================================================

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

      expect(result.success).toBe(true);
      expect(result.message).toContain('Tracked inference');
      expect(result.data).toBeTruthy();
    });

    it('should handle daily-report command', async () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 10000, 5000);

      const result = await reporter.execute({
        action: 'daily-report'
      }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('WALLET REPORT');
      expect(result.data).toBeTruthy();
    });

    it('should handle weekly-report command', async () => {
      reporter.trackInferenceCost('claude-sonnet-4-5', 10000, 5000);

      const result = await reporter.execute({
        action: 'weekly-report'
      }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('WALLET REPORT');
      expect(result.data).toBeTruthy();
    });

    it('should handle add-revenue command', async () => {
      const result = await reporter.execute({
        action: 'add-revenue',
        source: 'client-alpha',
        amount: 150.00,
        description: 'Monthly retainer'
      }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Added revenue');
      expect(result.data).toBeTruthy();
    });

    it('should handle check-budget command', async () => {
      reporter.trackInferenceCost('claude-haiku-4-5', 1000, 500);

      const result = await reporter.execute({
        action: 'check-budget',
        sovereignty: 0.8
      }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toBeTruthy();
      expect(result.data).toBeTruthy();
    });

    it('should return error for unknown action', async () => {
      const result = await reporter.execute({
        action: 'invalid-action'
      }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown action');
    });
  });

  // =================================================================
  // Edge Cases & Error Handling
  // =================================================================

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
      expect(report).toBeTruthy(); // Successfully generated despite malformed line
    });

    it('should handle zero token counts', () => {
      const tx = reporter.trackInferenceCost('claude-sonnet-4-5', 0, 0);

      expect(tx.amount).toBe(0);
    });

    it('should handle very large token counts', () => {
      const tx = reporter.trackInferenceCost('claude-opus-4-6', 10000000, 5000000);

      // (10M/1M * $15) + (5M/1M * $75) = $150 + $375 = $525
      expect(tx.amount).toBe(525);
    });

    it('should handle transactions at exact threshold boundaries', () => {
      // Add exactly $5.00 worth of inference
      reporter.trackInferenceCost('claude-opus-4-6', 333333, 0); // $4.99995 (under threshold)

      let exceeded = reporter.isBudgetExceeded();
      expect(exceeded).toBe(false);

      // Add one more tiny transaction to push over
      reporter.trackInferenceCost('claude-haiku-4-5', 10000, 0); // $0.0025

      exceeded = reporter.isBudgetExceeded();
      expect(exceeded).toBe(true);
    });

    it('should handle multiple transactions on same day', () => {
      for (let i = 0; i < 10; i++) {
        reporter.trackInferenceCost('claude-haiku-4-5', 1000, 500);
      }

      const report = reporter.generateDailyReport();
      expect(report.topExpenses.length).toBe(10);
    });

    it('should handle empty ledger file gracefully', () => {
      fs.writeFileSync(TEST_LEDGER_PATH, '', 'utf-8');

      const report = reporter.generateDailyReport();
      expect(report.totalSpent).toBe(0);
      expect(report.totalIncome).toBe(0);
    });
  });

  // =================================================================
  // Integration Tests
  // =================================================================

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

      expect(report.totalSpent).toBeGreaterThan(0);
      expect(report.totalIncome).toBe(200.00);
      expect(Object.keys(report.byCategory).length).toBe(4); // 3 inference types + 1 revenue
      expect(report.topExpenses.length).toBe(6);
    });

    it('should handle budget alert workflow', () => {
      // Start with low sovereignty
      let sovereignty = 0.2;

      // Track some spending
      reporter.trackInferenceCost('claude-sonnet-4-5', 200000, 100000); // ~$2.10

      // Check budget - should alert at $1 threshold
      let alert = reporter.checkAndAlert(sovereignty);
      expect(alert).not.toBeNull();
      expect(alert).toContain('CRITICAL');

      // Improve sovereignty
      sovereignty = 0.7;

      // Same spending now within threshold
      alert = reporter.checkAndAlert(sovereignty);
      expect(alert).toBeNull();
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

      expect(report.totalSpent).toBeGreaterThan(0);
      expect(report.totalIncome).toBeGreaterThan(0);
      expect(report.period.days).toBe(7);

      // Should have positive or negative net balance
      expect(report.netBalance).toBe(report.totalIncome - report.totalSpent);
    });
  });
});
