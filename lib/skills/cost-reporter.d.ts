/**
 * src/skills/cost-reporter.ts
 *
 * CostReporter — Tracks inference costs, generates reports, manages budget alerts
 *
 * Features:
 * - Track Ollama (electricity estimate) and Claude API costs
 * - Daily/weekly reports with category breakdowns
 * - Discord-friendly formatting
 * - Revenue tracking (stub)
 * - Budget alert integration with sovereignty levels
 * - JSONL ledger storage (append-only for audit trail)
 */
import type { SkillContext, SkillResult } from '../types.js';
export interface Transaction {
    timestamp: number;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
    model?: string;
}
export interface Report {
    summary: string;
    totalSpent: number;
    totalIncome: number;
    netBalance: number;
    byCategory: Record<string, number>;
    topExpenses: Transaction[];
    period: {
        start: string;
        end: string;
        days: number;
    };
}
export default class CostReporter {
    name: string;
    description: string;
    private log;
    private ledgerPath;
    constructor();
    initialize(ctx: SkillContext): Promise<void>;
    execute(command: unknown, ctx: SkillContext): Promise<SkillResult>;
    /**
     * Track inference cost for a model
     */
    trackInferenceCost(model: string, inputTokens: number, outputTokens: number): Transaction;
    /**
     * Generate daily report
     */
    generateDailyReport(date?: string): Report;
    /**
     * Generate weekly report (last 7 days)
     */
    generateWeeklyReport(): Report;
    /**
     * Format report for Discord
     */
    formatForDiscord(report: Report): string;
    /**
     * Add revenue (stub for future expansion)
     */
    addRevenue(source: string, amount: number, description: string): Transaction;
    /**
     * Check budget and alert if overspending
     *
     * Sovereignty levels:
     * 0.0-0.3 = 🔴 Critical (alert at $1/day)
     * 0.3-0.6 = 🟡 Warning (alert at $5/day)
     * 0.6-1.0 = 🟢 Healthy (alert at $20/day)
     */
    checkAndAlert(sovereignty: number): string | null;
    /**
     * Check if daily budget is exceeded — used by LLM Controller for hard-switch to Ollama.
     */
    isBudgetExceeded(): boolean;
    /**
     * Get today's spend — for real-time governance display.
     */
    getDailySpend(): number;
    /**
     * Get the daily budget limit.
     */
    getDailyBudget(): number;
    private appendTransaction;
    private readTransactions;
    private generateReport;
    private generateSummary;
    private handleTrackInference;
    private handleDailyReport;
    private handleWeeklyReport;
    private handleAddRevenue;
    private handleCheckBudget;
}
//# sourceMappingURL=cost-reporter.d.ts.map