/**
 * src/skills/cost-reporter-scheduler.ts
 *
 * Scheduled Cost Reporter for Discord Integration
 *
 * Features:
 * - Daily P&L reports to #trust-debt-public (09:00 UTC)
 * - Weekly P&L summaries (Mondays at 09:00 UTC)
 * - Configurable schedule and reporting intervals
 * - Integration with TransparencyEngine for public visibility
 * - Automated financial transparency for IAMFIM sovereignty
 *
 * Usage:
 * - Called by scheduler.ts or ceo-loop.ts
 * - Posts formatted reports to Discord via TransparencyEngine
 * - Tracks posting history to prevent duplicates
 */
import type { Logger, DiscordHelper } from '../types.js';
import CostReporter from './cost-reporter.js';
export interface CostReporterSchedulerConfig {
    enabled: boolean;
    dailyReportHour: number;
    weeklyReportDay: number;
    weeklyReportHour: number;
    minIntervalBetweenReportsMs: number;
    logReports: boolean;
}
export interface ReportHistory {
    timestamp: string;
    reportType: 'daily' | 'weekly';
    posted: boolean;
    error?: string;
}
/**
 * CostReporterScheduler — Automates daily/weekly P&L posting to #trust-debt-public
 */
export declare class CostReporterScheduler {
    private log;
    private costReporter;
    private discord;
    private channelId;
    private config;
    private reportHistory;
    private historyPath;
    private dailyTimer;
    private weeklyTimer;
    private lastDailyReportDate;
    private lastWeeklyReportDate;
    constructor(log: Logger, costReporter: CostReporter, dataDir: string, config?: Partial<CostReporterSchedulerConfig>);
    /**
     * Start automated daily/weekly reporting.
     * Requires Discord helper and channel ID for posting.
     */
    start(discord: DiscordHelper, channelId: string): void;
    /**
     * Stop automated reporting.
     */
    stop(): void;
    /**
     * Manually trigger a daily report (bypasses schedule).
     */
    triggerDailyReport(): Promise<void>;
    /**
     * Manually trigger a weekly report (bypasses schedule).
     */
    triggerWeeklyReport(): Promise<void>;
    /**
     * Check if it's time to post daily report (at configured hour UTC).
     */
    private checkAndPostDailyReport;
    /**
     * Check if it's time to post weekly report (at configured day and hour UTC).
     */
    private checkAndPostWeeklyReport;
    /**
     * Post daily P&L report to #trust-debt-public.
     */
    private postDailyReport;
    /**
     * Post weekly P&L report to #trust-debt-public.
     */
    private postWeeklyReport;
    /**
     * Format daily report with enhanced Discord styling for #trust-debt-public.
     */
    private formatDailyReportForDiscord;
    /**
     * Format weekly report with enhanced Discord styling for #trust-debt-public.
     */
    private formatWeeklyReportForDiscord;
    /**
     * Post message to Discord channel.
     */
    private postToChannel;
    /**
     * Record report posting to history file.
     */
    private recordReportHistory;
    /**
     * Load report history from JSONL file.
     */
    private loadReportHistory;
    /**
     * Get report history for analysis.
     */
    getReportHistory(limit?: number): ReportHistory[];
    /**
     * Get report statistics.
     */
    getReportStats(): {
        totalDailyReports: number;
        totalWeeklyReports: number;
        lastDailyReport: string | null;
        lastWeeklyReport: string | null;
        failedPosts: number;
    };
    /**
     * Get day name from day number.
     */
    private getDayName;
}
//# sourceMappingURL=cost-reporter-scheduler.d.ts.map