/**
 * src/cron/cost-report-scheduler.ts — Daily/Weekly Cost Report Scheduler
 *
 * Automatically posts cost reports to #trust-debt-public on a schedule:
 * - Daily report: Posted at end of day (11:30 PM)
 * - Weekly report: Posted every Sunday at 11:45 PM
 *
 * Features:
 * - Discord integration via TransparencyEngine
 * - Formatted reports with P&L breakdown
 * - Category analysis and top expenses
 * - Budget health tracking
 * - Sovereignty-aware alerts
 */
import type { Logger, DiscordHelper } from '../types.js';
import CostReporter from '../skills/cost-reporter.js';
export interface CostReportSchedulerConfig {
    enabled: boolean;
    dailyHour: number;
    dailyMinute: number;
    weeklyDay: number;
    weeklyHour: number;
    weeklyMinute: number;
    checkIntervalMs: number;
}
export declare const DEFAULT_COST_REPORT_CONFIG: CostReportSchedulerConfig;
export declare class CostReportScheduler {
    private log;
    private costReporter;
    private discord;
    private channelId;
    private config;
    private checkTimer;
    private lastDailyReport;
    private lastWeeklyReport;
    constructor(log: Logger, costReporter: CostReporter, config?: Partial<CostReportSchedulerConfig>);
    /**
     * Start the scheduler with Discord integration.
     */
    start(discord: DiscordHelper, channelId: string): void;
    /**
     * Stop the scheduler.
     */
    stop(): void;
    /**
     * Check if reports should be posted and post them.
     */
    private checkAndPostReports;
    /**
     * Generate and post daily cost report to Discord.
     */
    postDailyReport(): Promise<void>;
    /**
     * Generate and post weekly cost report to Discord.
     */
    postWeeklyReport(): Promise<void>;
    /**
     * Manually trigger a daily report (for testing or on-demand).
     */
    triggerDailyReport(): Promise<void>;
    /**
     * Manually trigger a weekly report (for testing or on-demand).
     */
    triggerWeeklyReport(): Promise<void>;
    /**
     * Post message to Discord channel.
     */
    private postToChannel;
    /**
     * Get scheduler status for debugging.
     */
    getStatus(): {
        enabled: boolean;
        lastDailyReport: string;
        lastWeeklyReport: string;
        nextDailyTime: string;
        nextWeeklyTime: string;
    };
}
//# sourceMappingURL=cost-report-scheduler.d.ts.map