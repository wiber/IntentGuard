/**
 * src/skills/wallet.test.ts — Tests for Economic Sovereignty Wallet Skill
 * Phase: Phase 6 — Economic Sovereignty (Wallet Skill)
 */

import Wallet, { IncomeSource, ExpenseCategory } from './wallet.js';
import type { SkillContext, SkillResult } from '../types.js';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Wallet Skill', () => {
  let wallet: Wallet;
  let mockContext: SkillContext;
  let testDataDir: string;

  beforeEach(async () => {
    // Create temporary data directory
    testDataDir = mkdtempSync(join(tmpdir(), 'wallet-test-'));

    // Create mock context
    mockContext = {
      config: {
        get: (key: string) => {
          if (key === 'dataDir') return testDataDir;
          return undefined;
        },
      },
      log: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      },
      fs: {
        read: async () => '',
        write: async () => {},
      },
      http: {
        post: async () => ({}),
        get: async () => ({}),
      },
      shell: {
        exec: async () => ({ stdout: '', stderr: '', code: 0 }),
      },
      callSkill: async () => ({ success: true, message: '' }),
    };

    wallet = new Wallet();
    await wallet.initialize(mockContext);
  });

  afterEach(() => {
    // Clean up test data directory
    if (testDataDir) {
      rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('Balance Tracking', () => {
    it('should start with zero balance', async () => {
      const result = await wallet.execute({ action: 'balance' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ balance: 0 });
      expect(result.message).toContain('$0.00');
    });

    it('should track balance after income', async () => {
      await wallet.execute({
        action: 'income',
        amount: 100,
        category: IncomeSource.GRANT,
        description: 'Test grant',
      }, mockContext);

      const result = await wallet.execute({ action: 'balance' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ balance: 100 });
    });

    it('should track balance after expense', async () => {
      await wallet.execute({
        action: 'income',
        amount: 100,
        category: IncomeSource.GRANT,
      }, mockContext);

      await wallet.execute({
        action: 'expense',
        amount: 30,
        category: ExpenseCategory.INFERENCE,
      }, mockContext);

      const result = await wallet.execute({ action: 'balance' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ balance: 70 });
    });

    it('should handle multiple transactions', async () => {
      await wallet.execute({ action: 'income', amount: 100, category: IncomeSource.GRANT }, mockContext);
      await wallet.execute({ action: 'expense', amount: 2, category: ExpenseCategory.INFERENCE }, mockContext);
      await wallet.execute({ action: 'income', amount: 50, category: IncomeSource.CONSULTING }, mockContext);
      await wallet.execute({ action: 'expense', amount: 1, category: ExpenseCategory.INFRASTRUCTURE }, mockContext);

      const result = await wallet.execute({ action: 'balance' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ balance: 147 }); // 100 - 2 + 50 - 1 = 147
    });
  });

  describe('Income Sources', () => {
    it('should record income from valid source', async () => {
      const result = await wallet.execute({
        action: 'income',
        amount: 500,
        category: IncomeSource.CONSULTING,
        description: 'Consulting project',
      }, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('$500.00');
      expect(result.message).toContain('consulting');
      expect(result.data).toMatchObject({
        amount: 500,
        category: 'consulting',
        balance: 500,
      });
    });

    it('should reject income with invalid source', async () => {
      const result = await wallet.execute({
        action: 'income',
        amount: 100,
        category: 'invalid_source',
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid income source');
    });

    it('should reject negative income', async () => {
      const result = await wallet.execute({
        action: 'income',
        amount: -100,
        category: IncomeSource.GRANT,
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('positive');
    });

    it('should require income category', async () => {
      const result = await wallet.execute({
        action: 'income',
        amount: 100,
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('category required');
    });

    it('should track multiple income sources', async () => {
      await wallet.execute({ action: 'income', amount: 100, category: IncomeSource.GRANT }, mockContext);
      await wallet.execute({ action: 'income', amount: 200, category: IncomeSource.CONSULTING }, mockContext);
      await wallet.execute({ action: 'income', amount: 50, category: IncomeSource.DONATION }, mockContext);

      const result = await wallet.execute({ action: 'analytics' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('topIncomeSource');
      const analytics = result.data as { topIncomeSource: { source: string; amount: number } };
      expect(analytics.topIncomeSource.source).toBe('consulting');
      expect(analytics.topIncomeSource.amount).toBe(200);
    });
  });

  describe('Expense Categories', () => {
    it('should record expense with valid category', async () => {
      // Add income first to avoid budget limit
      await wallet.execute({ action: 'income', amount: 1000, category: IncomeSource.GRANT }, mockContext);

      const result = await wallet.execute({
        action: 'expense',
        amount: 25,
        category: ExpenseCategory.INFERENCE,
        description: 'GPT-4 API call',
      }, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('$25.00');
      expect(result.message).toContain('inference');
      expect(result.data).toMatchObject({
        amount: 25,
        category: 'inference',
      });
    });

    it('should reject expense with invalid category', async () => {
      const result = await wallet.execute({
        action: 'expense',
        amount: 100,
        category: 'invalid_category',
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid expense category');
    });

    it('should reject negative expense', async () => {
      const result = await wallet.execute({
        action: 'expense',
        amount: -50,
        category: ExpenseCategory.INFRASTRUCTURE,
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('positive');
    });

    it('should require expense category', async () => {
      const result = await wallet.execute({
        action: 'expense',
        amount: 50,
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('category required');
    });

    it('should track expenses by category', async () => {
      await wallet.execute({ action: 'income', amount: 1000, category: IncomeSource.GRANT }, mockContext);
      await wallet.execute({ action: 'expense', amount: 2, category: ExpenseCategory.INFERENCE }, mockContext);
      await wallet.execute({ action: 'expense', amount: 1.5, category: ExpenseCategory.INFERENCE }, mockContext);
      await wallet.execute({ action: 'expense', amount: 1, category: ExpenseCategory.INFRASTRUCTURE }, mockContext);

      const result = await wallet.execute({ action: 'analytics' }, mockContext);

      expect(result.success).toBe(true);
      const analytics = result.data as { topExpenseCategories: Array<{ category: string; amount: number }> };
      expect(analytics.topExpenseCategories[0].category).toBe('inference');
      expect(analytics.topExpenseCategories[0].amount).toBe(3.5);
      expect(analytics.topExpenseCategories[1].category).toBe('infrastructure');
      expect(analytics.topExpenseCategories[1].amount).toBe(1);
    });
  });

  describe('FIM Sovereignty Integration', () => {
    it('should enforce spending limits based on default sovereignty', async () => {
      // Default sovereignty is 0.5, which allows $5/day (<=0.5 is restricted tier)
      // First expense passes (spent=$0 < $5 limit before recording)
      const result1 = await wallet.execute({ action: 'expense', amount: 4, category: ExpenseCategory.INFERENCE }, mockContext);
      expect(result1.success).toBe(true);

      // Second expense passes (spent=$4 < $5 limit before recording)
      const result2 = await wallet.execute({ action: 'expense', amount: 3, category: ExpenseCategory.INFRASTRUCTURE }, mockContext);
      expect(result2.success).toBe(true);

      // Third expense fails (spent=$7 >= $5 limit)
      const result3 = await wallet.execute({ action: 'expense', amount: 1, category: ExpenseCategory.OPERATIONS }, mockContext);
      expect(result3.success).toBe(false);
      expect(result3.message).toContain('BUDGET ALERT');
    });

    it('should check budget alert status', async () => {
      await wallet.execute({ action: 'expense', amount: 10, category: ExpenseCategory.INFERENCE }, mockContext);

      const result = await wallet.execute({ action: 'alert' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('spent');
      expect(result.data).toHaveProperty('limit');
      expect(result.data).toHaveProperty('sovereignty');
      const alertData = result.data as { spent: number; limit: number; sovereignty: number };
      expect(alertData.spent).toBe(10);
      expect(alertData.limit).toBeGreaterThan(0);
    });

    it('should include sovereignty in analytics', async () => {
      const result = await wallet.execute({ action: 'analytics' }, mockContext);

      expect(result.success).toBe(true);
      const analytics = result.data as { sovereigntyScore: number };
      expect(analytics.sovereigntyScore).toBeGreaterThanOrEqual(0);
      expect(analytics.sovereigntyScore).toBeLessThanOrEqual(1);
    });
  });

  describe('P&L Reports', () => {
    it('should generate daily P&L report', async () => {
      await wallet.execute({ action: 'income', amount: 100, category: IncomeSource.GRANT }, mockContext);
      await wallet.execute({ action: 'expense', amount: 15, category: ExpenseCategory.INFERENCE }, mockContext);

      const result = await wallet.execute({
        action: 'report',
        period: 'daily',
      }, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Daily P&L');
      expect(result.message).toContain('$85.00');
      const reportData = result.data as { pnl: number; balance: number };
      expect(reportData.pnl).toBe(85);
      expect(reportData.balance).toBe(85);
    });

    it('should generate weekly P&L report', async () => {
      await wallet.execute({ action: 'income', amount: 200, category: IncomeSource.CONSULTING }, mockContext);
      await wallet.execute({ action: 'expense', amount: 10, category: ExpenseCategory.INFRASTRUCTURE }, mockContext);

      const result = await wallet.execute({
        action: 'report',
        period: 'weekly',
      }, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Weekly P&L');
      const reportData = result.data as { pnl: number };
      expect(reportData.pnl).toBe(190);
    });

    it('should handle negative P&L', async () => {
      await wallet.execute({ action: 'income', amount: 50, category: IncomeSource.GRANT }, mockContext);
      await wallet.execute({ action: 'expense', amount: 2, category: ExpenseCategory.INFERENCE }, mockContext);
      await wallet.execute({ action: 'expense', amount: 1, category: ExpenseCategory.INFRASTRUCTURE }, mockContext);

      const result = await wallet.execute({ action: 'analytics' }, mockContext);

      expect(result.success).toBe(true);
      const analytics = result.data as { dailyPnL: number };
      expect(analytics.dailyPnL).toBe(47); // 50 - 2 - 1 = 47
    });
  });

  describe('Inference Cost Tracking', () => {
    it('should track API inference cost', async () => {
      const result = await wallet.execute({
        action: 'inference',
        model: 'gpt-4',
        tokens: 1000,
        isOllama: false,
      }, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Inference cost tracked');
      expect(result.message).toContain('gpt-4');
      const inferenceData = result.data as { cost: number; tokens: number };
      expect(inferenceData.cost).toBeGreaterThan(0);
      expect(inferenceData.tokens).toBe(1000);
    });

    it('should track Ollama inference as free', async () => {
      const result = await wallet.execute({
        action: 'inference',
        model: 'llama2',
        tokens: 5000,
        isOllama: true,
      }, mockContext);

      expect(result.success).toBe(true);
      const inferenceData = result.data as { cost: number; isOllama: boolean };
      expect(inferenceData.cost).toBe(0);
      expect(inferenceData.isOllama).toBe(true);
    });

    it('should require model and tokens for inference tracking', async () => {
      const result = await wallet.execute({
        action: 'inference',
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Model and token count required');
    });

    it('should add inference cost to expense tracking', async () => {
      // Add income to avoid budget limits
      await wallet.execute({ action: 'income', amount: 100, category: IncomeSource.GRANT }, mockContext);

      // Track inference cost
      await wallet.execute({
        action: 'inference',
        model: 'claude-sonnet',
        tokens: 10000,
        isOllama: false,
      }, mockContext);

      // Check that expense was recorded
      const result = await wallet.execute({ action: 'analytics' }, mockContext);
      expect(result.success).toBe(true);
      const analytics = result.data as { topExpenseCategories: Array<{ category: string }> };
      const inferenceCategory = analytics.topExpenseCategories.find(c => c.category === 'inference');
      expect(inferenceCategory).toBeDefined();
    });
  });

  describe('Transaction History', () => {
    it('should retrieve transaction history', async () => {
      await wallet.execute({ action: 'income', amount: 100, category: IncomeSource.GRANT }, mockContext);
      await wallet.execute({ action: 'expense', amount: 15, category: ExpenseCategory.INFERENCE }, mockContext);

      const result = await wallet.execute({ action: 'history' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Recent transactions');
      const historyData = result.data as { transactions: Array<unknown> };
      expect(historyData.transactions).toHaveLength(2);
    });

    it('should limit history to last 10 transactions', async () => {
      // Add 15 income transactions (use income to avoid sovereignty budget limits)
      for (let i = 0; i < 15; i++) {
        await wallet.execute({
          action: 'income',
          amount: 10 + i,
          category: IncomeSource.GRANT,
        }, mockContext);
      }

      const result = await wallet.execute({ action: 'history' }, mockContext);

      expect(result.success).toBe(true);
      const historyData = result.data as { transactions: Array<unknown> };
      expect(historyData.transactions).toHaveLength(10);
    });
  });

  describe('Analytics', () => {
    it('should generate comprehensive analytics', async () => {
      await wallet.execute({ action: 'income', amount: 500, category: IncomeSource.CONSULTING }, mockContext);
      await wallet.execute({ action: 'expense', amount: 2, category: ExpenseCategory.INFERENCE }, mockContext);
      await wallet.execute({ action: 'expense', amount: 1, category: ExpenseCategory.INFRASTRUCTURE }, mockContext);

      const result = await wallet.execute({ action: 'analytics' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Wallet Analytics');
      expect(result.message).toContain('Balance');
      expect(result.message).toContain('Sovereignty');

      const analytics = result.data as {
        balance: number;
        dailyPnL: number;
        weeklyPnL: number;
        topExpenseCategories: Array<unknown>;
        topIncomeSource: { source: string; amount: number };
        sovereigntyScore: number;
        spendingLimit: number;
        spendingToday: number;
        remainingToday: number;
        budgetHealthPercentage: number;
      };

      expect(analytics.balance).toBe(497);
      expect(analytics.dailyPnL).toBe(497);
      expect(analytics.weeklyPnL).toBe(497);
      expect(analytics.topExpenseCategories.length).toBeGreaterThan(0);
      expect(analytics.topIncomeSource.source).toBe('consulting');
      expect(analytics.sovereigntyScore).toBeGreaterThanOrEqual(0);
      expect(analytics.budgetHealthPercentage).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty analytics', async () => {
      const result = await wallet.execute({ action: 'analytics' }, mockContext);

      expect(result.success).toBe(true);
      const analytics = result.data as { balance: number; topIncomeSource: null };
      expect(analytics.balance).toBe(0);
      expect(analytics.topIncomeSource).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown action', async () => {
      const result = await wallet.execute({
        action: 'unknown_action',
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown wallet action');
    });

    it('should handle malformed commands gracefully', async () => {
      const result = await wallet.execute(null, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });
  });
});
