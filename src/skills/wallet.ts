/**
 * src/skills/wallet.ts — Economic Sovereignty Wallet Skill
 * Phase: Phase 6 — Economic Sovereignty (Wallet Skill)
 *
 * Features:
 * - Balance tracking with income/expense categorization
 * - FIM sovereignty-based spending limits
 * - Daily/weekly P&L reports
 * - Budget alerts and spending analytics
 * - Income source tracking
 * - Expense category analysis
 * - Inference cost tracking (Ollama + API)
 *
 * Integration:
 * - Uses WalletLedger for append-only JSONL transaction log
 * - Wires FIM sovereignty score to spending limits
 * - Provides economic self-awareness for autonomous agents
 */

import type { Logger, SkillContext, SkillResult } from '../types.js';
import WalletLedger from './wallet-ledger.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Income source categories for tracking revenue streams
 */
export enum IncomeSource {
  GRANT = 'grant',
  CONSULTING = 'consulting',
  API_REVENUE = 'api_revenue',
  SUBSCRIPTION = 'subscription',
  INVESTMENT = 'investment',
  DONATION = 'donation',
  OTHER = 'other',
}

/**
 * Expense categories for tracking spending patterns
 */
export enum ExpenseCategory {
  INFERENCE = 'inference',        // LLM API costs
  INFRASTRUCTURE = 'infrastructure', // Servers, hosting
  DEVELOPMENT = 'development',     // Tools, licenses
  RESEARCH = 'research',           // Papers, datasets
  OPERATIONS = 'operations',       // General ops
  MARKETING = 'marketing',         // Outreach, ads
  LEGAL = 'legal',                 // Compliance, contracts
  OTHER = 'other',
}

/**
 * Wallet command interface
 */
interface WalletCommand {
  action: 'balance' | 'income' | 'expense' | 'report' | 'alert' | 'analytics' | 'inference' | 'history';
  amount?: number;
  category?: string;
  description?: string;
  model?: string;
  tokens?: number;
  isOllama?: boolean;
  period?: 'daily' | 'weekly' | 'monthly';
  date?: string;
}

/**
 * Analytics report structure
 */
interface WalletAnalytics {
  balance: number;
  dailyPnL: number;
  weeklyPnL: number;
  topExpenseCategories: Array<{ category: string; amount: number; percentage: number }>;
  topIncomeSource: { source: string; amount: number } | null;
  sovereigntyScore: number;
  spendingLimit: number;
  spendingToday: number;
  remainingToday: number;
  budgetHealthPercentage: number;
}

export default class Wallet {
  name = 'wallet';
  description = 'Economic sovereignty wallet with balance tracking, income sources, expense categories, and FIM-based spending limits';
  private log!: Logger;
  private ledger!: WalletLedger;
  private dataDir!: string;

  async initialize(ctx: SkillContext): Promise<void> {
    this.log = ctx.log;

    // Determine data directory from config or use default
    const configDataDir = ctx.config.get('dataDir') as string | undefined;
    this.dataDir = configDataDir || join(process.cwd(), 'data');

    // Initialize wallet ledger
    this.ledger = new WalletLedger(this.dataDir);

    this.log.info(`Wallet initialized (ledger: ${this.ledger.getLedgerPath()})`);
  }

  async execute(command: unknown, ctx: SkillContext): Promise<SkillResult> {
    const cmd = command as WalletCommand;

    try {
      switch (cmd.action) {
        case 'balance':
          return this.handleBalance();

        case 'income':
          return this.handleIncome(cmd);

        case 'expense':
          return this.handleExpense(cmd);

        case 'report':
          return this.handleReport(cmd);

        case 'alert':
          return this.handleBudgetAlert();

        case 'analytics':
          return this.handleAnalytics();

        case 'inference':
          return this.handleInferenceCost(cmd);

        case 'history':
          return this.handleHistory();

        default:
          return {
            success: false,
            message: `Unknown wallet action: ${cmd.action}`,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.error(`Wallet execution failed: ${errorMessage}`);
      return {
        success: false,
        message: `Wallet error: ${errorMessage}`,
      };
    }
  }

  /**
   * Get current balance
   */
  private handleBalance(): SkillResult {
    const balance = this.ledger.getBalance();

    return {
      success: true,
      message: `Current balance: $${balance.toFixed(2)}`,
      data: { balance },
    };
  }

  /**
   * Record income transaction
   */
  private handleIncome(cmd: WalletCommand): SkillResult {
    if (!cmd.amount || cmd.amount <= 0) {
      return {
        success: false,
        message: 'Income amount must be positive',
      };
    }

    if (!cmd.category) {
      return {
        success: false,
        message: 'Income category required',
      };
    }

    // Validate income source
    const validSources = Object.values(IncomeSource);
    if (!validSources.includes(cmd.category as IncomeSource)) {
      return {
        success: false,
        message: `Invalid income source. Valid: ${validSources.join(', ')}`,
      };
    }

    const sovereignty = this.getSovereigntyScore();
    const description = cmd.description || `Income from ${cmd.category}`;

    this.ledger.appendTransaction(
      'income',
      cmd.amount,
      cmd.category,
      description,
      sovereignty
    );

    const newBalance = this.ledger.getBalance();
    this.log.info(`Income recorded: +$${cmd.amount.toFixed(2)} (${cmd.category})`);

    return {
      success: true,
      message: `Income recorded: +$${cmd.amount.toFixed(2)} from ${cmd.category}. New balance: $${newBalance.toFixed(2)}`,
      data: { amount: cmd.amount, category: cmd.category, balance: newBalance },
    };
  }

  /**
   * Record expense transaction
   */
  private handleExpense(cmd: WalletCommand): SkillResult {
    if (!cmd.amount || cmd.amount <= 0) {
      return {
        success: false,
        message: 'Expense amount must be positive',
      };
    }

    if (!cmd.category) {
      return {
        success: false,
        message: 'Expense category required',
      };
    }

    // Validate expense category
    const validCategories = Object.values(ExpenseCategory);
    if (!validCategories.includes(cmd.category as ExpenseCategory)) {
      return {
        success: false,
        message: `Invalid expense category. Valid: ${validCategories.join(', ')}`,
      };
    }

    const sovereignty = this.getSovereigntyScore();
    const description = cmd.description || `Expense for ${cmd.category}`;

    // Check budget alert before spending
    const alert = this.ledger.checkBudgetAlert(sovereignty);
    if (alert.alert) {
      this.log.warn(`Budget limit reached: ${alert.message}`);
      return {
        success: false,
        message: `BUDGET ALERT: ${alert.message}. Expense blocked.`,
        data: { alert: alert.message, spent: alert.spent, limit: alert.limit },
      };
    }

    // Record expense
    this.ledger.appendTransaction(
      'expense',
      cmd.amount,
      cmd.category,
      description,
      sovereignty
    );

    const newBalance = this.ledger.getBalance();
    this.log.info(`Expense recorded: -$${cmd.amount.toFixed(2)} (${cmd.category})`);

    return {
      success: true,
      message: `Expense recorded: -$${cmd.amount.toFixed(2)} for ${cmd.category}. New balance: $${newBalance.toFixed(2)}`,
      data: { amount: cmd.amount, category: cmd.category, balance: newBalance },
    };
  }

  /**
   * Generate P&L report
   */
  private handleReport(cmd: WalletCommand): SkillResult {
    const period = cmd.period || 'weekly';
    let pnl = 0;
    let periodLabel = '';

    if (period === 'daily') {
      const date = cmd.date ? new Date(cmd.date) : new Date();
      pnl = this.ledger.getDailyPnL(date);
      periodLabel = `Daily P&L (${date.toISOString().split('T')[0]})`;
    } else if (period === 'weekly') {
      pnl = this.ledger.getWeeklyPnL();
      periodLabel = 'Weekly P&L (last 7 days)';
    } else {
      return {
        success: false,
        message: 'Invalid period. Use: daily, weekly',
      };
    }

    const balance = this.ledger.getBalance();
    const expensesByCategory = this.ledger.getExpensesByCategory();

    return {
      success: true,
      message: `${periodLabel}: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}. Balance: $${balance.toFixed(2)}`,
      data: {
        period,
        pnl,
        balance,
        expensesByCategory,
      },
    };
  }

  /**
   * Check budget alert status
   */
  private handleBudgetAlert(): SkillResult {
    const sovereignty = this.getSovereigntyScore();
    const alert = this.ledger.checkBudgetAlert(sovereignty);

    return {
      success: true,
      message: alert.message,
      data: {
        alert: alert.alert,
        spent: alert.spent,
        limit: alert.limit,
        sovereignty,
      },
    };
  }

  /**
   * Generate comprehensive analytics
   */
  private handleAnalytics(): SkillResult {
    const balance = this.ledger.getBalance();
    const dailyPnL = this.ledger.getDailyPnL(new Date());
    const weeklyPnL = this.ledger.getWeeklyPnL();
    const expensesByCategory = this.ledger.getExpensesByCategory();
    const sovereignty = this.getSovereigntyScore();
    const alert = this.ledger.checkBudgetAlert(sovereignty);

    // Calculate top expense categories
    const totalExpenses = Object.values(expensesByCategory).reduce((sum, amt) => sum + amt, 0);
    const topExpenseCategories = Object.entries(expensesByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Get income sources
    const transactions = this.ledger.getAllTransactions();
    const incomeBySource = transactions
      .filter(tx => tx.type === 'income')
      .reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
      }, {} as Record<string, number>);

    const topIncomeSource = Object.entries(incomeBySource).length > 0
      ? Object.entries(incomeBySource)
          .sort((a, b) => b[1] - a[1])[0]
          .map(([source, amount]) => ({ source, amount }))[0]
      : null;

    const analytics: WalletAnalytics = {
      balance,
      dailyPnL,
      weeklyPnL,
      topExpenseCategories,
      topIncomeSource,
      sovereigntyScore: sovereignty,
      spendingLimit: alert.limit,
      spendingToday: alert.spent,
      remainingToday: alert.limit - alert.spent,
      budgetHealthPercentage: alert.limit > 0 ? ((alert.limit - alert.spent) / alert.limit) * 100 : 100,
    };

    const summary = [
      `📊 Wallet Analytics`,
      `Balance: $${balance.toFixed(2)}`,
      `Daily P&L: ${dailyPnL >= 0 ? '+' : ''}$${dailyPnL.toFixed(2)}`,
      `Weekly P&L: ${weeklyPnL >= 0 ? '+' : ''}$${weeklyPnL.toFixed(2)}`,
      `Sovereignty: ${sovereignty.toFixed(3)}`,
      `Daily Limit: $${alert.limit.toFixed(2)} (${analytics.remainingToday.toFixed(2)} remaining)`,
      `Budget Health: ${analytics.budgetHealthPercentage.toFixed(1)}%`,
    ].join('\n');

    return {
      success: true,
      message: summary,
      data: analytics,
    };
  }

  /**
   * Track inference cost
   */
  private handleInferenceCost(cmd: WalletCommand): SkillResult {
    if (!cmd.model || !cmd.tokens || cmd.tokens <= 0) {
      return {
        success: false,
        message: 'Model and token count required for inference cost tracking',
      };
    }

    const sovereignty = this.getSovereigntyScore();
    const isOllama = cmd.isOllama ?? false;

    this.ledger.trackInferenceCost(cmd.model, cmd.tokens, sovereignty, isOllama);

    const cost = isOllama
      ? 0
      : this.ledger.estimateApiCost(cmd.model, cmd.tokens);

    this.log.info(`Inference cost tracked: ${cmd.model} (${cmd.tokens} tokens, $${cost.toFixed(4)})`);

    return {
      success: true,
      message: `Inference cost tracked: ${cmd.model} (${cmd.tokens} tokens, $${cost.toFixed(4)})`,
      data: { model: cmd.model, tokens: cmd.tokens, cost, isOllama },
    };
  }

  /**
   * Get transaction history
   */
  private handleHistory(): SkillResult {
    const transactions = this.ledger.getAllTransactions();
    const recentTransactions = transactions.slice(-10).reverse();

    const summary = recentTransactions
      .map(tx => {
        const sign = tx.type === 'income' ? '+' : '-';
        return `${tx.timestamp.split('T')[0]} | ${sign}$${tx.amount.toFixed(2)} | ${tx.category} | ${tx.description}`;
      })
      .join('\n');

    return {
      success: true,
      message: `Recent transactions (last ${recentTransactions.length}):\n${summary}`,
      data: { transactions: recentTransactions },
    };
  }

  /**
   * Get current FIM sovereignty score
   *
   * Reads from most recent pipeline run or defaults to 0.5
   */
  private getSovereigntyScore(): number {
    try {
      const pipelineRunsDir = join(this.dataDir, 'pipeline-runs');
      if (!existsSync(pipelineRunsDir)) {
        return 0.5; // Default moderate sovereignty
      }

      // Find most recent run
      const fs = require('fs');
      const runs = fs.readdirSync(pipelineRunsDir)
        .filter((d: string) => d.startsWith('run-'))
        .sort()
        .reverse();

      if (runs.length === 0) {
        return 0.5;
      }

      // Read sovereignty from identity vector
      const identityPath = join(pipelineRunsDir, runs[0], '4-grades-statistics.json');
      if (!existsSync(identityPath)) {
        return 0.5;
      }

      const identity = JSON.parse(readFileSync(identityPath, 'utf-8'));
      return identity.sovereigntyScore || 0.5;
    } catch (error) {
      this.log.warn(`Failed to read sovereignty score: ${error}`);
      return 0.5;
    }
  }
}
