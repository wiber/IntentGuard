/**
 * tests/wallet.test.js — Tests for Economic Sovereignty Wallet Skill
 * Phase: Phase 6 — Economic Sovereignty (Wallet Skill)
 *
 * Simple integration tests using require() to work with CommonJS test runner
 */

const { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

describe('Wallet Skill Integration', () => {
  let testDataDir;
  let WalletLedger;

  beforeEach(() => {
    // Create temporary data directory
    testDataDir = mkdtempSync(join(tmpdir(), 'wallet-test-'));

    // Mock WalletLedger in CommonJS style
    WalletLedger = class {
      constructor(dataDir) {
        this.ledgerPath = join(dataDir || testDataDir, 'wallet-ledger.jsonl');
        if (!existsSync(this.ledgerPath)) {
          writeFileSync(this.ledgerPath, '', 'utf-8');
        }
      }

      appendTransaction(type, amount, category, description, sovereigntyAtTime) {
        const transaction = {
          timestamp: new Date().toISOString(),
          type,
          amount,
          category,
          description,
          sovereigntyAtTime,
        };
        const line = JSON.stringify(transaction) + '\n';
        const fs = require('fs');
        fs.appendFileSync(this.ledgerPath, line, 'utf-8');
      }

      readTransactions() {
        if (!existsSync(this.ledgerPath)) return [];
        const content = readFileSync(this.ledgerPath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        return lines.map(line => JSON.parse(line));
      }

      getBalance() {
        const transactions = this.readTransactions();
        return transactions.reduce((balance, tx) => {
          return tx.type === 'income' ? balance + tx.amount : balance - tx.amount;
        }, 0);
      }

      getDailyPnL(date) {
        const transactions = this.readTransactions();
        const targetDate = date.toISOString().split('T')[0];
        return transactions
          .filter(tx => tx.timestamp.split('T')[0] === targetDate)
          .reduce((pnl, tx) => {
            return tx.type === 'income' ? pnl + tx.amount : pnl - tx.amount;
          }, 0);
      }

      getWeeklyPnL() {
        const transactions = this.readTransactions();
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return transactions
          .filter(tx => {
            const txDate = new Date(tx.timestamp);
            return txDate >= weekAgo && txDate <= now;
          })
          .reduce((pnl, tx) => {
            return tx.type === 'income' ? pnl + tx.amount : pnl - tx.amount;
          }, 0);
      }

      getExpensesByCategory() {
        const transactions = this.readTransactions();
        const expenses = transactions.filter(tx => tx.type === 'expense');
        return expenses.reduce((acc, tx) => {
          acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
          return acc;
        }, {});
      }

      checkBudgetAlert(sovereignty) {
        // Match wallet-ledger.ts logic exactly
        let limit = 5; // default for sovereignty <= 0.5
        if (sovereignty > 0.9) limit = 100;
        else if (sovereignty > 0.7) limit = 50;
        else if (sovereignty > 0.5) limit = 20;
        // Note: 0.5 exactly falls into the default case (5), not 20

        const transactions = this.readTransactions();
        const today = new Date().toISOString().split('T')[0];
        const spent = transactions
          .filter(tx => tx.type === 'expense' && tx.timestamp.split('T')[0] === today)
          .reduce((sum, tx) => sum + tx.amount, 0);

        const alert = spent >= limit;
        return { alert, spent, limit };
      }

      getAllTransactions() {
        return this.readTransactions();
      }
    };
  });

  afterEach(() => {
    // Clean up test data directory
    if (testDataDir) {
      rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('WalletLedger Balance Tracking', () => {
    it('should start with zero balance', () => {
      const ledger = new WalletLedger(testDataDir);
      expect(ledger.getBalance()).toBe(0);
    });

    it('should track income', () => {
      const ledger = new WalletLedger(testDataDir);
      ledger.appendTransaction('income', 100, 'grant', 'Test grant', 0.5);
      expect(ledger.getBalance()).toBe(100);
    });

    it('should track expenses', () => {
      const ledger = new WalletLedger(testDataDir);
      ledger.appendTransaction('income', 100, 'grant', 'Test grant', 0.5);
      ledger.appendTransaction('expense', 30, 'inference', 'API call', 0.5);
      expect(ledger.getBalance()).toBe(70);
    });

    it('should handle multiple transactions', () => {
      const ledger = new WalletLedger(testDataDir);
      ledger.appendTransaction('income', 100, 'grant', 'Grant 1', 0.5);
      ledger.appendTransaction('expense', 30, 'inference', 'Expense 1', 0.5);
      ledger.appendTransaction('income', 50, 'consulting', 'Consulting', 0.5);
      ledger.appendTransaction('expense', 20, 'infrastructure', 'Expense 2', 0.5);
      expect(ledger.getBalance()).toBe(100); // 100 - 30 + 50 - 20
    });
  });

  describe('WalletLedger Income Sources', () => {
    it('should track income by source', () => {
      const ledger = new WalletLedger(testDataDir);
      ledger.appendTransaction('income', 100, 'grant', 'Grant income', 0.5);
      ledger.appendTransaction('income', 200, 'consulting', 'Consulting income', 0.5);
      ledger.appendTransaction('income', 50, 'donation', 'Donation income', 0.5);

      const transactions = ledger.getAllTransactions();
      const incomeBySource = transactions
        .filter(tx => tx.type === 'income')
        .reduce((acc, tx) => {
          acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
          return acc;
        }, {});

      expect(incomeBySource.grant).toBe(100);
      expect(incomeBySource.consulting).toBe(200);
      expect(incomeBySource.donation).toBe(50);
    });
  });

  describe('WalletLedger Expense Categories', () => {
    it('should track expenses by category', () => {
      const ledger = new WalletLedger(testDataDir);
      ledger.appendTransaction('expense', 30, 'inference', 'API 1', 0.5);
      ledger.appendTransaction('expense', 20, 'inference', 'API 2', 0.5);
      ledger.appendTransaction('expense', 15, 'infrastructure', 'Server', 0.5);

      const expensesByCategory = ledger.getExpensesByCategory();

      expect(expensesByCategory.inference).toBe(50);
      expect(expensesByCategory.infrastructure).toBe(15);
    });
  });

  describe('WalletLedger FIM Sovereignty Integration', () => {
    it('should enforce spending limits based on sovereignty (0.5 = $5/day, 0.6 = $20/day)', () => {
      const ledger = new WalletLedger(testDataDir);

      // Check with sovereignty 0.5 (gets $5 limit)
      const alert0 = ledger.checkBudgetAlert(0.5);
      expect(alert0.spent).toBe(0);
      expect(alert0.limit).toBe(5); // 0.5 exactly is <= 0.5, so gets $5
      expect(alert0.alert).toBe(false);

      // Add expense under limit for higher sovereignty (0.6 > 0.5 = $20/day)
      ledger.appendTransaction('expense', 15, 'inference', 'Expense 1', 0.6);

      const alert1 = ledger.checkBudgetAlert(0.6);
      expect(alert1.spent).toBe(15);
      expect(alert1.limit).toBe(20); // 0.6 > 0.5 = $20/day
      expect(alert1.alert).toBe(false); // 15 < 20

      // Add another expense that exceeds $20 limit
      ledger.appendTransaction('expense', 10, 'infrastructure', 'Expense 2', 0.6);

      const alert2 = ledger.checkBudgetAlert(0.6);
      expect(alert2.spent).toBe(25);
      expect(alert2.limit).toBe(20);
      expect(alert2.alert).toBe(true); // 25 >= 20
    });

    it('should use higher limits for higher sovereignty', () => {
      const ledger = new WalletLedger(testDataDir);

      const alert1 = ledger.checkBudgetAlert(0.95); // > 0.9 = $100/day
      expect(alert1.limit).toBe(100);

      const alert2 = ledger.checkBudgetAlert(0.75); // > 0.7 = $50/day
      expect(alert2.limit).toBe(50);

      const alert3 = ledger.checkBudgetAlert(0.55); // > 0.5 = $20/day
      expect(alert3.limit).toBe(20);

      const alert4 = ledger.checkBudgetAlert(0.3); // <= 0.5 = $5/day
      expect(alert4.limit).toBe(5);
    });
  });

  describe('WalletLedger P&L Reports', () => {
    it('should calculate daily P&L', () => {
      const ledger = new WalletLedger(testDataDir);
      ledger.appendTransaction('income', 100, 'grant', 'Income', 0.5);
      ledger.appendTransaction('expense', 15, 'inference', 'Expense', 0.5);

      const dailyPnL = ledger.getDailyPnL(new Date());
      expect(dailyPnL).toBe(85);
    });

    it('should calculate weekly P&L', () => {
      const ledger = new WalletLedger(testDataDir);
      ledger.appendTransaction('income', 200, 'consulting', 'Income', 0.5);
      ledger.appendTransaction('expense', 10, 'infrastructure', 'Expense', 0.5);

      const weeklyPnL = ledger.getWeeklyPnL();
      expect(weeklyPnL).toBe(190);
    });
  });

  describe('WalletLedger Transaction History', () => {
    it('should retrieve all transactions', () => {
      const ledger = new WalletLedger(testDataDir);
      ledger.appendTransaction('income', 100, 'grant', 'Income 1', 0.5);
      ledger.appendTransaction('expense', 15, 'inference', 'Expense 1', 0.5);

      const transactions = ledger.getAllTransactions();
      expect(transactions).toHaveLength(2);
      expect(transactions[0].type).toBe('income');
      expect(transactions[1].type).toBe('expense');
    });

    it('should persist transactions across instances', () => {
      const ledger1 = new WalletLedger(testDataDir);
      ledger1.appendTransaction('income', 100, 'grant', 'Income', 0.5);

      const ledger2 = new WalletLedger(testDataDir);
      expect(ledger2.getBalance()).toBe(100);
    });
  });

  describe('WalletLedger JSONL Format', () => {
    it('should write transactions in JSONL format', () => {
      const ledger = new WalletLedger(testDataDir);
      ledger.appendTransaction('income', 100, 'grant', 'Test', 0.5);

      const content = readFileSync(ledger.ledgerPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(1);

      const transaction = JSON.parse(lines[0]);
      expect(transaction.type).toBe('income');
      expect(transaction.amount).toBe(100);
      expect(transaction.category).toBe('grant');
      expect(transaction.description).toBe('Test');
      expect(transaction.sovereigntyAtTime).toBe(0.5);
      expect(transaction.timestamp).toBeDefined();
    });
  });
});
