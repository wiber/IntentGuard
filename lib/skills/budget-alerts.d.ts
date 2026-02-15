/**
 * src/skills/budget-alerts.ts — Budget Alert System with Discord Integration
 * Phase: Phase 6 — Economic Sovereignty (Wallet Skill)
 *
 * Features:
 * - Sovereignty-adjusted spending threshold detection
 * - Discord #trust-debt-public warning posts
 * - Configurable alert frequency (prevent spam)
 * - Alert history tracking
 * - Integration with WalletLedger for spending data
 *
 * Alert Logic:
 * - Checks if daily spending >= sovereignty-based daily limit
 * - Posts warning to #trust-debt-public when threshold exceeded
 * - Respects cooldown period to avoid alert spam
 * - Tracks alert history for analytics
 */
import type { Logger, DiscordHelper } from '../types.js';
import WalletLedger from './wallet-ledger.js';
export interface BudgetAlertConfig {
    enabled: boolean;
    cooldownMs: number;
    checkIntervalMs: number;
    logAlerts: boolean;
}
export interface BudgetAlertEvent {
    timestamp: string;
    sovereignty: number;
    spent: number;
    limit: number;
    exceededBy: number;
    percentOfLimit: number;
    message: string;
}
export interface BudgetStatus {
    withinBudget: boolean;
    sovereignty: number;
    spent: number;
    limit: number;
    remaining: number;
    percentUsed: number;
}
export declare class BudgetAlerts {
    private log;
    private wallet;
    private discord;
    private channelId;
    private config;
    private alertHistory;
    private lastAlertTime;
    private alertLogPath;
    private checkTimer;
    constructor(log: Logger, wallet: WalletLedger, dataDir: string, config?: Partial<BudgetAlertConfig>);
    /**
     * Start budget monitoring with automatic checks.
     * Requires Discord helper and channel ID for posting alerts.
     */
    start(discord: DiscordHelper, channelId: string): void;
    /**
     * Stop budget monitoring.
     */
    stop(): void;
    /**
     * Check current budget status against sovereignty-adjusted threshold.
     * Posts alert to Discord if threshold exceeded and cooldown has passed.
     */
    checkBudgetAndAlert(sovereignty?: number): Promise<BudgetStatus>;
    /**
     * Manually trigger a budget alert (bypasses cooldown for testing/emergency).
     */
    triggerAlert(sovereignty: number): Promise<void>;
    /**
     * Get current budget status without triggering alerts.
     */
    getBudgetStatus(sovereignty: number): BudgetStatus;
    /**
     * Check if enough time has passed since last alert (cooldown).
     */
    private shouldPostAlert;
    /**
     * Post budget alert to Discord #trust-debt-public channel.
     */
    private postBudgetAlert;
    /**
     * Post message to Discord channel.
     */
    private postToChannel;
    /**
     * Log alert event to JSONL file.
     */
    private logAlertToFile;
    /**
     * Load alert history from JSONL file.
     */
    private loadAlertHistory;
    /**
     * Get alert history for analysis.
     */
    getAlertHistory(limit?: number): BudgetAlertEvent[];
    /**
     * Get alert statistics.
     */
    getAlertStats(): {
        totalAlerts: number;
        lastAlertTime: string | null;
        averageExceededBy: number;
        maxExceededBy: number;
    };
    /**
     * Clear alert history (for testing or reset).
     */
    clearAlertHistory(): void;
}
//# sourceMappingURL=budget-alerts.d.ts.map