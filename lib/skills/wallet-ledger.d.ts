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
    private ledgerPath;
    constructor(dataDir?: string);
    /**
     * Append a transaction to the ledger
     */
    appendTransaction(type: 'income' | 'expense', amount: number, category: string, description: string, sovereigntyAtTime: number): void;
    /**
     * Read all transactions from ledger
     */
    private readTransactions;
    /**
     * Get current balance (income - expenses)
     */
    getBalance(): number;
    /**
     * Get daily P&L for a specific date
     */
    getDailyPnL(date: Date): number;
    /**
     * Get weekly P&L (last 7 days from now)
     */
    getWeeklyPnL(): number;
    /**
     * Get expenses grouped by category
     */
    getExpensesByCategory(): Record<string, number>;
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
    private getDailyLimit;
    /**
     * Get today's spending
     */
    private getTodaySpending;
    /**
     * Check if spending exceeds budget based on sovereignty
     */
    checkBudgetAlert(sovereignty: number): BudgetAlert;
    /**
     * Estimate Ollama inference cost
     *
     * Ollama is free/local, but we track token usage for monitoring.
     * Assumed cost: $0 (local inference)
     */
    estimateOllamaCost(tokens: number): number;
    /**
     * Estimate API inference cost based on model and tokens
     *
     * Pricing (approximate, as of 2025):
     * - GPT-4: $0.03/1K input tokens, $0.06/1K output tokens (avg: $0.045/1K)
     * - GPT-3.5: $0.0015/1K input tokens, $0.002/1K output tokens (avg: $0.00175/1K)
     * - Claude Opus: $0.015/1K input tokens, $0.075/1K output tokens (avg: $0.045/1K)
     * - Claude Sonnet: $0.003/1K input tokens, $0.015/1K output tokens (avg: $0.009/1K)
     */
    estimateApiCost(model: string, tokens: number): number;
    /**
     * Track an inference cost as an expense
     */
    trackInferenceCost(model: string, tokens: number, sovereignty: number, isOllama?: boolean): void;
    /**
     * Get all transactions (useful for debugging/export)
     */
    getAllTransactions(): Transaction[];
    /**
     * Get ledger file path (useful for debugging)
     */
    getLedgerPath(): string;
}
export {};
//# sourceMappingURL=wallet-ledger.d.ts.map