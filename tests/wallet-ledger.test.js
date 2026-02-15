/**
 * tests/wallet-ledger.test.js — Comprehensive tests for WalletLedger
 *
 * Tests cover:
 * - JSONL append-only transaction log
 * - FIM sovereignty-based spending limits
 * - Budget alerts
 * - Inference cost tracking
 * - P&L reports (daily, weekly)
 * - Category-based expense tracking
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Dynamic import for ES module
let WalletLedger;

beforeAll(async () => {
  const module = await import('../src/skills/wallet-ledger.js');
  WalletLedger = module.default;
});

describe('WalletLedger', () => {
  let ledger;
  let testDataDir;

  beforeEach(() => {
    // Create unique temporary test directory
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-ledger-js-test-'));
    ledger = new WalletLedger(testDataDir);
  });

  afterEach(() => {
    // Clean up test data
    if (testDataDir && fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('JSONL Append-Only Transaction Log', () => {
    test('should create ledger file on initialization', () => {
      const ledgerPath = ledger.getLedgerPath();
      expect(fs.existsSync(ledgerPath)).toBe(true);
    });

    test('should append transactions in JSONL format', () => {
      ledger.appendTransaction('income', 100, 'grant', 'Test grant', 0.8);
      ledger.appendTransaction('expense', 25, 'inference', 'API call', 0.8);

      const ledgerPath = ledger.getLedgerPath();
      const content = fs.readFileSync(ledgerPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);

      const tx1 = JSON.parse(lines[0]);
      expect(tx1.type).toBe('income');
      expect(tx1.amount).toBe(100);
      expect(tx1.category).toBe('grant');
      expect(tx1.sovereigntyAtTime).toBe(0.8);

      const tx2 = JSON.parse(lines[1]);
      expect(tx2.type).toBe('expense');
      expect(tx2.amount).toBe(25);
      expect(tx2.category).toBe('inference');
    });

    test('should preserve append-only property', () => {
      ledger.appendTransaction('income', 50, 'payment', 'Test', 0.7);
      const initialContent = fs.readFileSync(ledger.getLedgerPath(), 'utf-8');

      ledger.appendTransaction('expense', 10, 'api', 'Another test', 0.7);
      const finalContent = fs.readFileSync(ledger.getLedgerPath(), 'utf-8');

      expect(finalContent.startsWith(initialContent)).toBe(true);
      expect(finalContent.length).toBeGreaterThan(initialContent.length);
    });

    test('should store timestamps in ISO format', () => {
      ledger.appendTransaction('income', 100, 'test', 'Test transaction', 0.9);

      const transactions = ledger.getAllTransactions();
      const timestamp = transactions[0].timestamp;

      // Verify ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(() => new Date(timestamp)).not.toThrow();
    });
  });

  describe('Balance Calculations', () => {
    test('should calculate balance correctly with no transactions', () => {
      expect(ledger.getBalance()).toBe(0);
    });

    test('should calculate balance with income only', () => {
      ledger.appendTransaction('income', 100, 'grant', 'Test', 0.8);
      ledger.appendTransaction('income', 50, 'payment', 'Test', 0.8);

      expect(ledger.getBalance()).toBe(150);
    });

    test('should calculate balance with expenses only', () => {
      ledger.appendTransaction('expense', 30, 'api', 'Test', 0.8);
      ledger.appendTransaction('expense', 20, 'inference', 'Test', 0.8);

      expect(ledger.getBalance()).toBe(-50);
    });

    test('should calculate balance with mixed transactions', () => {
      ledger.appendTransaction('income', 200, 'grant', 'Initial funding', 0.9);
      ledger.appendTransaction('expense', 45, 'inference', 'API call', 0.9);
      ledger.appendTransaction('expense', 30, 'tools', 'Service', 0.9);
      ledger.appendTransaction('income', 50, 'donation', 'Support', 0.9);

      expect(ledger.getBalance()).toBe(175); // 200 - 45 - 30 + 50
    });
  });

  describe('FIM Sovereignty-Based Spending Limits', () => {
    test('should return $100 daily limit for high sovereignty (>0.9)', () => {
      ledger.appendTransaction('expense', 50, 'test', 'Test', 0.95);
      const alert = ledger.checkBudgetAlert(0.95);

      expect(alert.limit).toBe(100);
      expect(alert.spent).toBe(50);
      expect(alert.alert).toBe(false);
    });

    test('should return $50 daily limit for moderate sovereignty (>0.7)', () => {
      ledger.appendTransaction('expense', 30, 'test', 'Test', 0.8);
      const alert = ledger.checkBudgetAlert(0.8);

      expect(alert.limit).toBe(50);
      expect(alert.spent).toBe(30);
    });

    test('should return $20 daily limit for low sovereignty (>0.5)', () => {
      const alert = ledger.checkBudgetAlert(0.6);
      expect(alert.limit).toBe(20);
    });

    test('should return $5 daily limit for restricted sovereignty (<=0.5)', () => {
      const alert = ledger.checkBudgetAlert(0.4);
      expect(alert.limit).toBe(5);
    });

    test('should trigger alert when limit exceeded', () => {
      ledger.appendTransaction('expense', 60, 'test', 'Test', 0.8);
      const alert = ledger.checkBudgetAlert(0.8);

      expect(alert.alert).toBe(true);
      expect(alert.spent).toBe(60);
      expect(alert.limit).toBe(50);
      expect(alert.message).toContain('Budget limit reached');
    });

    test('should not trigger alert when under limit', () => {
      ledger.appendTransaction('expense', 25, 'test', 'Test', 0.8);
      const alert = ledger.checkBudgetAlert(0.8);

      expect(alert.alert).toBe(false);
      expect(alert.message).toContain('remaining today');
    });

    test('should only count today\'s spending', () => {
      // Add old transaction (simulate by reading/modifying timestamp)
      ledger.appendTransaction('expense', 100, 'old', 'Old expense', 0.9);

      // Manually edit the transaction timestamp to yesterday
      const ledgerPath = ledger.getLedgerPath();
      let content = fs.readFileSync(ledgerPath, 'utf-8');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      content = content.replace(/"timestamp":"[^"]+"/,
        `"timestamp":"${yesterday.toISOString()}"`);
      fs.writeFileSync(ledgerPath, content, 'utf-8');

      // Add today's expense
      ledger.appendTransaction('expense', 30, 'today', 'Today expense', 0.9);

      const alert = ledger.checkBudgetAlert(0.9);
      expect(alert.spent).toBe(30); // Should only count today
      expect(alert.alert).toBe(false);
    });
  });

  describe('Daily P&L Reports', () => {
    test('should calculate daily P&L correctly', () => {
      const today = new Date();

      ledger.appendTransaction('income', 100, 'grant', 'Test', 0.8);
      ledger.appendTransaction('expense', 30, 'inference', 'Test', 0.8);
      ledger.appendTransaction('expense', 20, 'tools', 'Test', 0.8);

      const pnl = ledger.getDailyPnL(today);
      expect(pnl).toBe(50); // 100 - 30 - 20
    });

    test('should return 0 for days with no transactions', () => {
      const randomDay = new Date('2025-01-15');
      const pnl = ledger.getDailyPnL(randomDay);
      expect(pnl).toBe(0);
    });

    test('should only include transactions from specified date', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      ledger.appendTransaction('income', 100, 'test', 'Today', 0.8);

      // Simulate yesterday's transaction
      const ledgerPath = ledger.getLedgerPath();
      const yesterdayTx = JSON.stringify({
        timestamp: yesterday.toISOString(),
        type: 'expense',
        amount: 50,
        category: 'test',
        description: 'Yesterday',
        sovereigntyAtTime: 0.8,
      }) + '\n';
      fs.appendFileSync(ledgerPath, yesterdayTx, 'utf-8');

      const todayPnL = ledger.getDailyPnL(today);
      const yesterdayPnL = ledger.getDailyPnL(yesterday);

      expect(todayPnL).toBe(100);
      expect(yesterdayPnL).toBe(-50);
    });
  });

  describe('Weekly P&L Reports', () => {
    test('should calculate weekly P&L for last 7 days', () => {
      ledger.appendTransaction('income', 200, 'grant', 'Week funding', 0.8);
      ledger.appendTransaction('expense', 50, 'inference', 'Week expense', 0.8);

      const weeklyPnL = ledger.getWeeklyPnL();
      expect(weeklyPnL).toBe(150);
    });

    test('should exclude transactions older than 7 days', () => {
      const ledgerPath = ledger.getLedgerPath();

      // Add old transaction (8 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 8);
      const oldTx = JSON.stringify({
        timestamp: oldDate.toISOString(),
        type: 'expense',
        amount: 100,
        category: 'old',
        description: 'Old',
        sovereigntyAtTime: 0.8,
      }) + '\n';
      fs.appendFileSync(ledgerPath, oldTx, 'utf-8');

      // Add recent transaction
      ledger.appendTransaction('income', 50, 'recent', 'Recent', 0.8);

      const weeklyPnL = ledger.getWeeklyPnL();
      expect(weeklyPnL).toBe(50); // Should not include old expense
    });
  });

  describe('Category-Based Expense Tracking', () => {
    test('should group expenses by category', () => {
      ledger.appendTransaction('expense', 30, 'inference', 'API call 1', 0.8);
      ledger.appendTransaction('expense', 20, 'inference', 'API call 2', 0.8);
      ledger.appendTransaction('expense', 15, 'tools', 'Service fee', 0.8);
      ledger.appendTransaction('expense', 10, 'storage', 'Database', 0.8);

      const byCategory = ledger.getExpensesByCategory();

      expect(byCategory['inference']).toBe(50);
      expect(byCategory['tools']).toBe(15);
      expect(byCategory['storage']).toBe(10);
    });

    test('should not include income in category totals', () => {
      ledger.appendTransaction('income', 100, 'grant', 'Funding', 0.8);
      ledger.appendTransaction('expense', 25, 'inference', 'API', 0.8);

      const byCategory = ledger.getExpensesByCategory();

      expect(byCategory['grant']).toBeUndefined();
      expect(byCategory['inference']).toBe(25);
    });

    test('should return empty object when no expenses', () => {
      ledger.appendTransaction('income', 100, 'grant', 'Only income', 0.8);

      const byCategory = ledger.getExpensesByCategory();
      expect(Object.keys(byCategory).length).toBe(0);
    });
  });

  describe('Inference Cost Tracking', () => {
    test('should estimate Ollama cost as $0 (local inference)', () => {
      const cost = ledger.estimateOllamaCost(10000);
      expect(cost).toBe(0);
    });

    test('should estimate GPT-4 costs correctly', () => {
      const cost = ledger.estimateApiCost('gpt-4', 10000);
      expect(cost).toBeCloseTo(0.45, 3); // 10K tokens * $0.045/1K
    });

    test('should estimate GPT-3.5 costs correctly', () => {
      const cost = ledger.estimateApiCost('gpt-3.5-turbo', 10000);
      expect(cost).toBeCloseTo(0.0175, 4);
    });

    test('should estimate Claude Opus costs correctly', () => {
      const cost = ledger.estimateApiCost('claude-opus-4', 10000);
      expect(cost).toBeCloseTo(0.45, 3);
    });

    test('should estimate Claude Sonnet costs correctly', () => {
      const cost = ledger.estimateApiCost('claude-sonnet-4', 10000);
      expect(cost).toBeCloseTo(0.09, 3);
    });

    test('should use default cost for unknown models', () => {
      const cost = ledger.estimateApiCost('unknown-model', 10000);
      expect(cost).toBeCloseTo(0.1, 3); // 10K tokens * $0.01/1K default
    });

    test('should track API inference costs as expenses', () => {
      ledger.trackInferenceCost('gpt-4', 5000, 0.8, false);

      const transactions = ledger.getAllTransactions();
      expect(transactions.length).toBe(1);
      expect(transactions[0].type).toBe('expense');
      expect(transactions[0].category).toBe('inference');
      expect(transactions[0].amount).toBeCloseTo(0.225, 3);
      expect(transactions[0].description).toContain('gpt-4');
      expect(transactions[0].description).toContain('5000 tokens');
    });

    test('should not log Ollama costs (free)', () => {
      ledger.trackInferenceCost('llama3.3', 10000, 0.8, true);

      const transactions = ledger.getAllTransactions();
      expect(transactions.length).toBe(0); // No transaction for $0 cost
    });

    test('should batch multiple inference costs', () => {
      ledger.trackInferenceCost('claude-sonnet-4', 2000, 0.9, false);
      ledger.trackInferenceCost('gpt-3.5-turbo', 3000, 0.9, false);

      const byCategory = ledger.getExpensesByCategory();
      expect(byCategory['inference']).toBeCloseTo(0.02325, 4);
    });
  });

  describe('Transaction Retrieval', () => {
    test('should retrieve all transactions in order', () => {
      ledger.appendTransaction('income', 100, 'grant', 'First', 0.8);
      ledger.appendTransaction('expense', 25, 'inference', 'Second', 0.8);
      ledger.appendTransaction('income', 50, 'payment', 'Third', 0.8);

      const transactions = ledger.getAllTransactions();

      expect(transactions.length).toBe(3);
      expect(transactions[0].description).toBe('First');
      expect(transactions[1].description).toBe('Second');
      expect(transactions[2].description).toBe('Third');
    });

    test('should handle empty ledger gracefully', () => {
      const transactions = ledger.getAllTransactions();
      expect(transactions).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero-amount transactions', () => {
      ledger.appendTransaction('expense', 0, 'test', 'Zero cost', 0.8);
      expect(ledger.getBalance()).toBe(0);

      const transactions = ledger.getAllTransactions();
      expect(transactions[0].amount).toBe(0);
    });

    test('should handle negative amounts (logged as-is, not validated)', () => {
      ledger.appendTransaction('expense', -10, 'refund', 'Negative', 0.8);
      expect(ledger.getBalance()).toBe(10); // expense of -10 adds to balance
    });

    test('should handle very large transaction amounts', () => {
      const largeAmount = 1_000_000;
      ledger.appendTransaction('income', largeAmount, 'grant', 'Large grant', 0.9);
      expect(ledger.getBalance()).toBe(largeAmount);
    });

    test('should handle special characters in descriptions', () => {
      const description = 'Test "quotes" & <html> {json}';
      ledger.appendTransaction('expense', 10, 'test', description, 0.8);

      const transactions = ledger.getAllTransactions();
      expect(transactions[0].description).toBe(description);
    });

    test('should handle sovereignty edge values', () => {
      expect(ledger.checkBudgetAlert(0).limit).toBe(5);
      expect(ledger.checkBudgetAlert(0.5).limit).toBe(5);
      expect(ledger.checkBudgetAlert(0.51).limit).toBe(20);
      expect(ledger.checkBudgetAlert(0.7).limit).toBe(20);
      expect(ledger.checkBudgetAlert(0.71).limit).toBe(50);
      expect(ledger.checkBudgetAlert(0.9).limit).toBe(50);
      expect(ledger.checkBudgetAlert(0.91).limit).toBe(100);
      expect(ledger.checkBudgetAlert(1.0).limit).toBe(100);
    });
  });
});
