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
import type { SkillContext, SkillResult } from '../types.js';
/**
 * Income source categories for tracking revenue streams
 */
export declare enum IncomeSource {
    GRANT = "grant",
    CONSULTING = "consulting",
    API_REVENUE = "api_revenue",
    SUBSCRIPTION = "subscription",
    INVESTMENT = "investment",
    DONATION = "donation",
    OTHER = "other"
}
/**
 * Expense categories for tracking spending patterns
 */
export declare enum ExpenseCategory {
    INFERENCE = "inference",// LLM API costs
    INFRASTRUCTURE = "infrastructure",// Servers, hosting
    DEVELOPMENT = "development",// Tools, licenses
    RESEARCH = "research",// Papers, datasets
    OPERATIONS = "operations",// General ops
    MARKETING = "marketing",// Outreach, ads
    LEGAL = "legal",// Compliance, contracts
    OTHER = "other"
}
export default class Wallet {
    name: string;
    description: string;
    private log;
    private ledger;
    private dataDir;
    initialize(ctx: SkillContext): Promise<void>;
    execute(command: unknown, ctx: SkillContext): Promise<SkillResult>;
    /**
     * Get current balance
     */
    private handleBalance;
    /**
     * Record income transaction
     */
    private handleIncome;
    /**
     * Record expense transaction
     */
    private handleExpense;
    /**
     * Generate P&L report
     */
    private handleReport;
    /**
     * Check budget alert status
     */
    private handleBudgetAlert;
    /**
     * Generate comprehensive analytics
     */
    private handleAnalytics;
    /**
     * Track inference cost
     */
    private handleInferenceCost;
    /**
     * Get transaction history
     */
    private handleHistory;
    /**
     * Get current FIM sovereignty score
     *
     * Reads from most recent pipeline run or defaults to 0.5
     */
    private getSovereigntyScore;
}
//# sourceMappingURL=wallet.d.ts.map