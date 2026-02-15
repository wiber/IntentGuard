/**
 * src/skills/wallet-ledger.ts — Append-only JSONL transaction log
 * Phase: Phase 6 — Economic Sovereignty (Wallet Skill)
 *
 * Features:
 * - Append-only JSONL transaction log
 * - FIM sovereignty-based spending limits
 * - Budget alerts
 * - Inference cost tracking (Ollama + API)
 * - P&L reports (daily, weekly)
 * - Category-based expense tracking
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Transaction {
  timestamp: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  sovereigntyAtTime: number;
}

interface BudgetAlert {
  alert: boolean;
  message: string;
  spent: number;
  limit: number;
}

export default class WalletLedger {
  private ledgerPath: string;

  constructor(dataDir?: string) {
    const baseDir = dataDir || path.join(__dirname, '..', '..', 'data');

    // Ensure data directory exists
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    this.ledgerPath = path.join(baseDir, 'wallet-ledger.jsonl');

    // Create ledger file if it doesn't exist
    if (!fs.existsSync(this.ledgerPath)) {
      fs.writeFileSync(this.ledgerPath, '', 'utf-8');
    }
  }

  /**
   * Append a transaction to the ledger
   */
  appendTransaction(
    type: 'income' | 'expense',
    amount: number,
    category: string,
    description: string,
    sovereigntyAtTime: number
  ): void {
    const transaction: Transaction = {
      timestamp: new Date().toISOString(),
      type,
      amount,
      category,
      description,
      sovereigntyAtTime,
    };

    const line = JSON.stringify(transaction) + '\n';
    fs.appendFileSync(this.ledgerPath, line, 'utf-8');
  }

  /**
   * Read all transactions from ledger
   */
  private readTransactions(): Transaction[] {
    if (!fs.existsSync(this.ledgerPath)) {
      return [];
    }

    const content = fs.readFileSync(this.ledgerPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    return lines.map(line => JSON.parse(line) as Transaction);
  }

  /**
   * Get current balance (income - expenses)
   */
  getBalance(): number {
    const transactions = this.readTransactions();

    return transactions.reduce((balance, tx) => {
      return tx.type === 'income'
        ? balance + tx.amount
        : balance - tx.amount;
    }, 0);
  }

  /**
   * Get daily P&L for a specific date
   */
  getDailyPnL(date: Date): number {
    const transactions = this.readTransactions();
    const targetDate = date.toISOString().split('T')[0];

    return transactions
      .filter(tx => tx.timestamp.split('T')[0] === targetDate)
      .reduce((pnl, tx) => {
        return tx.type === 'income'
          ? pnl + tx.amount
          : pnl - tx.amount;
      }, 0);
  }

  /**
   * Get weekly P&L (last 7 days from now)
   */
  getWeeklyPnL(): number {
    const transactions = this.readTransactions();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return transactions
      .filter(tx => {
        const txDate = new Date(tx.timestamp);
        return txDate >= weekAgo && txDate <= now;
      })
      .reduce((pnl, tx) => {
        return tx.type === 'income'
          ? pnl + tx.amount
          : pnl - tx.amount;
      }, 0);
  }

  /**
   * Get expenses grouped by category
   */
  getExpensesByCategory(): Record<string, number> {
    const transactions = this.readTransactions();
    const expenses = transactions.filter(tx => tx.type === 'expense');

    return expenses.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Get daily spending limit based on FIM sovereignty score
   *
   * Uses tiered sovereignty-to-limit mapping:
   * - sovereignty > 0.9  → $100/day (high trust)
   * - sovereignty > 0.7  → $50/day  (moderate trust)
   * - sovereignty > 0.5  → $20/day  (low trust)
   * - sovereignty <= 0.5 → $5/day   (restricted)
   *
   * Clear thresholds make budget behavior predictable and auditable.
   */
  private getDailyLimit(sovereignty: number): number {
    // Tiered sovereignty-to-limit mapping:
    //   sovereignty > 0.9  → $100/day (high trust)
    //   sovereignty > 0.7  → $50/day  (moderate trust)
    //   sovereignty > 0.5  → $20/day  (low trust)
    //   sovereignty <= 0.5 → $5/day   (restricted)
    if (sovereignty > 0.9) return 100;
    if (sovereignty > 0.7) return 50;
    if (sovereignty > 0.5) return 20;
    return 5;
  }

  /**
   * Get today's spending
   */
  private getTodaySpending(): number {
    const transactions = this.readTransactions();
    const today = new Date().toISOString().split('T')[0];

    return transactions
      .filter(tx => tx.type === 'expense' && tx.timestamp.split('T')[0] === today)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  /**
   * Check if spending exceeds budget based on sovereignty
   */
  checkBudgetAlert(sovereignty: number): BudgetAlert {
    const limit = this.getDailyLimit(sovereignty);
    const spent = this.getTodaySpending();
    const alert = spent >= limit;

    let message = '';
    if (alert) {
      message = `Budget limit reached! Spent $${spent.toFixed(2)} of $${limit.toFixed(2)} daily limit (sovereignty: ${sovereignty.toFixed(2)})`;
    } else {
      const remaining = limit - spent;
      message = `$${remaining.toFixed(2)} remaining today (sovereignty: ${sovereignty.toFixed(2)}, limit: $${limit.toFixed(2)})`;
    }

    return {
      alert,
      message,
      spent,
      limit,
    };
  }

  /**
   * Estimate Ollama inference cost
   *
   * Ollama is free/local, but we track token usage for monitoring.
   * Assumed cost: $0 (local inference)
   */
  estimateOllamaCost(tokens: number): number {
    // Ollama is free, but we could track opportunity cost if desired
    return 0;
  }

  /**
   * Estimate API inference cost based on model and tokens
   *
   * Pricing (approximate, as of 2025):
   * - GPT-4: $0.03/1K input tokens, $0.06/1K output tokens (avg: $0.045/1K)
   * - GPT-3.5: $0.0015/1K input tokens, $0.002/1K output tokens (avg: $0.00175/1K)
   * - Claude Opus: $0.015/1K input tokens, $0.075/1K output tokens (avg: $0.045/1K)
   * - Claude Sonnet: $0.003/1K input tokens, $0.015/1K output tokens (avg: $0.009/1K)
   */
  estimateApiCost(model: string, tokens: number): number {
    const modelLower = model.toLowerCase();
    let costPer1K = 0;

    if (modelLower.includes('gpt-4')) {
      costPer1K = 0.045;
    } else if (modelLower.includes('gpt-3.5')) {
      costPer1K = 0.00175;
    } else if (modelLower.includes('claude-opus')) {
      costPer1K = 0.045;
    } else if (modelLower.includes('claude-sonnet')) {
      costPer1K = 0.009;
    } else {
      // Default estimate for unknown models
      costPer1K = 0.01;
    }

    return (tokens / 1000) * costPer1K;
  }

  /**
   * Track an inference cost as an expense
   */
  trackInferenceCost(
    model: string,
    tokens: number,
    sovereignty: number,
    isOllama: boolean = false
  ): void {
    const cost = isOllama
      ? this.estimateOllamaCost(tokens)
      : this.estimateApiCost(model, tokens);

    if (cost > 0) {
      this.appendTransaction(
        'expense',
        cost,
        'inference',
        `${model} inference (${tokens} tokens)`,
        sovereignty
      );
    }
  }

  /**
   * Get all transactions (useful for debugging/export)
   */
  getAllTransactions(): Transaction[] {
    return this.readTransactions();
  }

  /**
   * Get ledger file path (useful for debugging)
   */
  getLedgerPath(): string {
    return this.ledgerPath;
  }
}
