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
export const DEFAULT_COST_REPORT_CONFIG = {
    enabled: true,
    dailyHour: 23, // 11 PM
    dailyMinute: 30,
    weeklyDay: 0, // Sunday
    weeklyHour: 23, // 11 PM
    weeklyMinute: 45,
    checkIntervalMs: 60_000, // Check every minute
};
export class CostReportScheduler {
    log;
    costReporter;
    discord;
    channelId;
    config;
    checkTimer;
    lastDailyReport = ''; // Date string YYYY-MM-DD
    lastWeeklyReport = ''; // Date string YYYY-MM-DD
    constructor(log, costReporter, config = {}) {
        this.log = log;
        this.costReporter = costReporter;
        this.config = { ...DEFAULT_COST_REPORT_CONFIG, ...config };
    }
    /**
     * Start the scheduler with Discord integration.
     */
    start(discord, channelId) {
        if (!this.config.enabled) {
            this.log.info('CostReportScheduler disabled in config');
            return;
        }
        this.discord = discord;
        this.channelId = channelId;
        // Start periodic checks
        this.checkTimer = setInterval(() => {
            this.checkAndPostReports().catch(err => this.log.error(`Cost report check failed: ${err}`));
        }, this.config.checkIntervalMs);
        this.log.info(`CostReportScheduler started → #trust-debt-public ` +
            `(daily: ${this.config.dailyHour}:${String(this.config.dailyMinute).padStart(2, '0')}, ` +
            `weekly: Sun ${this.config.weeklyHour}:${String(this.config.weeklyMinute).padStart(2, '0')})`);
    }
    /**
     * Stop the scheduler.
     */
    stop() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = undefined;
        }
        this.log.info('CostReportScheduler stopped');
    }
    /**
     * Check if reports should be posted and post them.
     */
    async checkAndPostReports() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const hour = now.getHours();
        const minute = now.getMinutes();
        const dayOfWeek = now.getDay();
        // Check if daily report should be posted
        if (this.lastDailyReport !== dateStr &&
            hour === this.config.dailyHour &&
            minute === this.config.dailyMinute) {
            await this.postDailyReport();
            this.lastDailyReport = dateStr;
        }
        // Check if weekly report should be posted
        if (this.lastWeeklyReport !== dateStr &&
            dayOfWeek === this.config.weeklyDay &&
            hour === this.config.weeklyHour &&
            minute === this.config.weeklyMinute) {
            await this.postWeeklyReport();
            this.lastWeeklyReport = dateStr;
        }
    }
    /**
     * Generate and post daily cost report to Discord.
     */
    async postDailyReport() {
        try {
            const report = this.costReporter.generateDailyReport();
            const formatted = this.costReporter.formatForDiscord(report);
            // Add header for Discord
            const message = [
                '📊 **DAILY COST REPORT**',
                '',
                formatted,
                '',
                `*Daily budget: $${this.costReporter.getDailyBudget().toFixed(2)} | ` +
                    `Economic sovereignty tracking enabled*`,
            ].join('\n');
            await this.postToChannel(message);
            this.log.info(`Posted daily cost report: spent=$${report.totalSpent.toFixed(4)}, ` +
                `income=$${report.totalIncome.toFixed(4)}, net=$${report.netBalance.toFixed(4)}`);
        }
        catch (err) {
            this.log.error(`Failed to post daily cost report: ${err}`);
        }
    }
    /**
     * Generate and post weekly cost report to Discord.
     */
    async postWeeklyReport() {
        try {
            const report = this.costReporter.generateWeeklyReport();
            const formatted = this.costReporter.formatForDiscord(report);
            // Add header for Discord
            const message = [
                '📊 **WEEKLY COST REPORT**',
                '',
                formatted,
                '',
                `*7-day financial overview | Economic sovereignty tracking enabled*`,
            ].join('\n');
            await this.postToChannel(message);
            this.log.info(`Posted weekly cost report: spent=$${report.totalSpent.toFixed(4)}, ` +
                `income=$${report.totalIncome.toFixed(4)}, net=$${report.netBalance.toFixed(4)}`);
        }
        catch (err) {
            this.log.error(`Failed to post weekly cost report: ${err}`);
        }
    }
    /**
     * Manually trigger a daily report (for testing or on-demand).
     */
    async triggerDailyReport() {
        await this.postDailyReport();
        this.lastDailyReport = new Date().toISOString().split('T')[0];
    }
    /**
     * Manually trigger a weekly report (for testing or on-demand).
     */
    async triggerWeeklyReport() {
        await this.postWeeklyReport();
        this.lastWeeklyReport = new Date().toISOString().split('T')[0];
    }
    /**
     * Post message to Discord channel.
     */
    async postToChannel(content) {
        if (!this.discord?.sendToChannel || !this.channelId) {
            this.log.warn('Cannot post cost report: Discord not initialized');
            return;
        }
        try {
            await this.discord.sendToChannel(this.channelId, content);
        }
        catch (err) {
            this.log.error(`Failed to post cost report to Discord: ${err}`);
        }
    }
    /**
     * Get scheduler status for debugging.
     */
    getStatus() {
        const now = new Date();
        // Calculate next daily report time
        const nextDaily = new Date(now);
        nextDaily.setHours(this.config.dailyHour, this.config.dailyMinute, 0, 0);
        if (nextDaily <= now) {
            nextDaily.setDate(nextDaily.getDate() + 1);
        }
        // Calculate next weekly report time
        const nextWeekly = new Date(now);
        nextWeekly.setHours(this.config.weeklyHour, this.config.weeklyMinute, 0, 0);
        const daysUntilWeekly = (this.config.weeklyDay - now.getDay() + 7) % 7 || 7;
        nextWeekly.setDate(nextWeekly.getDate() + daysUntilWeekly);
        return {
            enabled: this.config.enabled,
            lastDailyReport: this.lastDailyReport || 'never',
            lastWeeklyReport: this.lastWeeklyReport || 'never',
            nextDailyTime: nextDaily.toISOString(),
            nextWeeklyTime: nextWeekly.toISOString(),
        };
    }
}
//# sourceMappingURL=cost-report-scheduler.js.map