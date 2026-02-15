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
import fs from 'fs';
import path from 'path';
/**
 * CostReporterScheduler — Automates daily/weekly P&L posting to #trust-debt-public
 */
export class CostReporterScheduler {
    log;
    costReporter;
    discord;
    channelId;
    config;
    reportHistory = [];
    historyPath;
    dailyTimer;
    weeklyTimer;
    lastDailyReportDate = '';
    lastWeeklyReportDate = '';
    constructor(log, costReporter, dataDir, config) {
        this.log = log;
        this.costReporter = costReporter;
        this.config = {
            enabled: config?.enabled ?? true,
            dailyReportHour: config?.dailyReportHour ?? 9, // 09:00 UTC
            weeklyReportDay: config?.weeklyReportDay ?? 1, // Monday
            weeklyReportHour: config?.weeklyReportHour ?? 9, // 09:00 UTC
            minIntervalBetweenReportsMs: config?.minIntervalBetweenReportsMs ?? 3600_000, // 1 hour
            logReports: config?.logReports ?? true,
        };
        this.historyPath = path.join(dataDir, 'cost-report-history.jsonl');
        // Ensure history file exists
        if (!fs.existsSync(this.historyPath)) {
            fs.writeFileSync(this.historyPath, '', 'utf-8');
        }
        // Load last report dates from history
        this.loadReportHistory();
    }
    /**
     * Start automated daily/weekly reporting.
     * Requires Discord helper and channel ID for posting.
     */
    start(discord, channelId) {
        if (!this.config.enabled) {
            this.log.info('CostReporterScheduler disabled in config');
            return;
        }
        this.discord = discord;
        this.channelId = channelId;
        // Check every 15 minutes if we should post a report
        const checkIntervalMs = 15 * 60 * 1000; // 15 minutes
        this.dailyTimer = setInterval(() => {
            this.checkAndPostDailyReport().catch(err => this.log.error(`Daily report check failed: ${err}`));
        }, checkIntervalMs);
        this.weeklyTimer = setInterval(() => {
            this.checkAndPostWeeklyReport().catch(err => this.log.error(`Weekly report check failed: ${err}`));
        }, checkIntervalMs);
        this.log.info(`CostReporterScheduler started → #trust-debt-public ` +
            `(daily: ${this.config.dailyReportHour}:00 UTC, ` +
            `weekly: ${this.getDayName(this.config.weeklyReportDay)} ${this.config.weeklyReportHour}:00 UTC)`);
    }
    /**
     * Stop automated reporting.
     */
    stop() {
        if (this.dailyTimer) {
            clearInterval(this.dailyTimer);
            this.dailyTimer = undefined;
        }
        if (this.weeklyTimer) {
            clearInterval(this.weeklyTimer);
            this.weeklyTimer = undefined;
        }
        this.log.info('CostReporterScheduler stopped');
    }
    /**
     * Manually trigger a daily report (bypasses schedule).
     */
    async triggerDailyReport() {
        await this.postDailyReport();
    }
    /**
     * Manually trigger a weekly report (bypasses schedule).
     */
    async triggerWeeklyReport() {
        await this.postWeeklyReport();
    }
    /**
     * Check if it's time to post daily report (at configured hour UTC).
     */
    async checkAndPostDailyReport() {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const todayDate = now.toISOString().split('T')[0];
        // Check if we're at the scheduled hour and haven't posted today yet
        if (currentHour === this.config.dailyReportHour && this.lastDailyReportDate !== todayDate) {
            await this.postDailyReport();
            this.lastDailyReportDate = todayDate;
        }
    }
    /**
     * Check if it's time to post weekly report (at configured day and hour UTC).
     */
    async checkAndPostWeeklyReport() {
        const now = new Date();
        const currentDay = now.getUTCDay();
        const currentHour = now.getUTCHours();
        const todayDate = now.toISOString().split('T')[0];
        // Check if we're on the scheduled day/hour and haven't posted this week yet
        if (currentDay === this.config.weeklyReportDay &&
            currentHour === this.config.weeklyReportHour &&
            this.lastWeeklyReportDate !== todayDate) {
            await this.postWeeklyReport();
            this.lastWeeklyReportDate = todayDate;
        }
    }
    /**
     * Post daily P&L report to #trust-debt-public.
     */
    async postDailyReport() {
        try {
            const report = this.costReporter.generateDailyReport();
            const formatted = this.formatDailyReportForDiscord(report);
            await this.postToChannel(formatted);
            // Record successful post
            const historyEntry = {
                timestamp: new Date().toISOString(),
                reportType: 'daily',
                posted: true,
            };
            this.recordReportHistory(historyEntry);
            this.log.info(`Daily P&L report posted to #trust-debt-public`);
        }
        catch (err) {
            this.log.error(`Failed to post daily report: ${err}`);
            // Record failed post
            const historyEntry = {
                timestamp: new Date().toISOString(),
                reportType: 'daily',
                posted: false,
                error: String(err),
            };
            this.recordReportHistory(historyEntry);
        }
    }
    /**
     * Post weekly P&L report to #trust-debt-public.
     */
    async postWeeklyReport() {
        try {
            const report = this.costReporter.generateWeeklyReport();
            const formatted = this.formatWeeklyReportForDiscord(report);
            await this.postToChannel(formatted);
            // Record successful post
            const historyEntry = {
                timestamp: new Date().toISOString(),
                reportType: 'weekly',
                posted: true,
            };
            this.recordReportHistory(historyEntry);
            this.log.info(`Weekly P&L report posted to #trust-debt-public`);
        }
        catch (err) {
            this.log.error(`Failed to post weekly report: ${err}`);
            // Record failed post
            const historyEntry = {
                timestamp: new Date().toISOString(),
                reportType: 'weekly',
                posted: false,
                error: String(err),
            };
            this.recordReportHistory(historyEntry);
        }
    }
    /**
     * Format daily report with enhanced Discord styling for #trust-debt-public.
     */
    formatDailyReportForDiscord(report) {
        const emoji = report.netBalance >= 0 ? '📈' : '📉';
        const status = report.netBalance >= 0 ? '✅ POSITIVE' : '⚠️ DEFICIT';
        const lines = [];
        // Header
        lines.push(`${emoji} **DAILY P&L REPORT** — ${report.period.start}`);
        lines.push('');
        // Financial summary
        lines.push('**FINANCIAL SUMMARY:**');
        lines.push(`• Income: $${report.totalIncome.toFixed(4)}`);
        lines.push(`• Expenses: $${report.totalSpent.toFixed(4)}`);
        lines.push(`• Net Balance: $${report.netBalance.toFixed(4)} ${status}`);
        lines.push('');
        // Category breakdown (top 5)
        if (Object.keys(report.byCategory).length > 0) {
            lines.push('**TOP CATEGORIES:**');
            const sortedCategories = Object.entries(report.byCategory)
                .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                .slice(0, 5);
            for (const [category, amount] of sortedCategories) {
                const sign = amount >= 0 ? '+' : '';
                lines.push(`• ${category}: ${sign}$${Math.abs(amount).toFixed(4)}`);
            }
            lines.push('');
        }
        // Top expenses (top 3)
        if (report.topExpenses.length > 0) {
            lines.push('**TOP EXPENSES:**');
            for (const tx of report.topExpenses.slice(0, 3)) {
                const desc = tx.description.length > 40
                    ? tx.description.substring(0, 37) + '...'
                    : tx.description;
                lines.push(`• $${tx.amount.toFixed(4)} — ${desc}`);
            }
            lines.push('');
        }
        // Summary insight
        lines.push('**INSIGHT:**');
        lines.push(report.summary);
        lines.push('');
        // Footer
        lines.push('_Automated daily financial transparency — Phase 6: Economic Sovereignty_');
        return lines.join('\n');
    }
    /**
     * Format weekly report with enhanced Discord styling for #trust-debt-public.
     */
    formatWeeklyReportForDiscord(report) {
        const emoji = report.netBalance >= 0 ? '📈' : '📉';
        const status = report.netBalance >= 0 ? '✅ POSITIVE' : '⚠️ DEFICIT';
        const lines = [];
        // Header
        lines.push(`${emoji} **WEEKLY P&L REPORT** — ${report.period.start} to ${report.period.end}`);
        lines.push('');
        // Financial summary
        lines.push('**FINANCIAL SUMMARY (7 DAYS):**');
        lines.push(`• Total Income: $${report.totalIncome.toFixed(4)}`);
        lines.push(`• Total Expenses: $${report.totalSpent.toFixed(4)}`);
        lines.push(`• Net Balance: $${report.netBalance.toFixed(4)} ${status}`);
        lines.push(`• Avg Daily Spend: $${(report.totalSpent / 7).toFixed(4)}`);
        lines.push('');
        // Category breakdown (top 5)
        if (Object.keys(report.byCategory).length > 0) {
            lines.push('**CATEGORY BREAKDOWN:**');
            const sortedCategories = Object.entries(report.byCategory)
                .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                .slice(0, 5);
            for (const [category, amount] of sortedCategories) {
                const sign = amount >= 0 ? '+' : '';
                lines.push(`• ${category}: ${sign}$${Math.abs(amount).toFixed(4)}`);
            }
            lines.push('');
        }
        // Top expenses (top 5 for weekly)
        if (report.topExpenses.length > 0) {
            lines.push('**TOP EXPENSES:**');
            for (const tx of report.topExpenses.slice(0, 5)) {
                const date = new Date(tx.timestamp).toISOString().split('T')[0];
                const desc = tx.description.length > 35
                    ? tx.description.substring(0, 32) + '...'
                    : tx.description;
                lines.push(`• ${date}: $${tx.amount.toFixed(4)} — ${desc}`);
            }
            lines.push('');
        }
        // Summary insight
        lines.push('**WEEKLY INSIGHT:**');
        lines.push(report.summary);
        lines.push('');
        // Budget projection
        const projectedMonthlySpend = (report.totalSpent / 7) * 30;
        lines.push('**PROJECTION:**');
        lines.push(`• Projected 30-day spend: $${projectedMonthlySpend.toFixed(2)}`);
        lines.push('');
        // Footer
        lines.push('_Automated weekly financial transparency — Phase 6: Economic Sovereignty_');
        return lines.join('\n');
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
            throw err;
        }
    }
    /**
     * Record report posting to history file.
     */
    recordReportHistory(entry) {
        this.reportHistory.push(entry);
        if (this.config.logReports) {
            try {
                const line = JSON.stringify(entry) + '\n';
                fs.appendFileSync(this.historyPath, line, 'utf-8');
            }
            catch (err) {
                this.log.error(`Failed to log report history: ${err}`);
            }
        }
        // Trim history to last 1000 entries
        if (this.reportHistory.length > 1000) {
            this.reportHistory = this.reportHistory.slice(-500);
        }
    }
    /**
     * Load report history from JSONL file.
     */
    loadReportHistory() {
        if (!fs.existsSync(this.historyPath))
            return;
        try {
            const content = fs.readFileSync(this.historyPath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            this.reportHistory = lines.map(line => JSON.parse(line));
            // Set last report dates from history
            const dailyReports = this.reportHistory.filter(r => r.reportType === 'daily' && r.posted);
            const weeklyReports = this.reportHistory.filter(r => r.reportType === 'weekly' && r.posted);
            if (dailyReports.length > 0) {
                const lastDaily = dailyReports[dailyReports.length - 1];
                this.lastDailyReportDate = lastDaily.timestamp.split('T')[0];
            }
            if (weeklyReports.length > 0) {
                const lastWeekly = weeklyReports[weeklyReports.length - 1];
                this.lastWeeklyReportDate = lastWeekly.timestamp.split('T')[0];
            }
        }
        catch (err) {
            this.log.error(`Failed to load report history: ${err}`);
        }
    }
    /**
     * Get report history for analysis.
     */
    getReportHistory(limit = 50) {
        return this.reportHistory.slice(-limit);
    }
    /**
     * Get report statistics.
     */
    getReportStats() {
        const dailyReports = this.reportHistory.filter(r => r.reportType === 'daily');
        const weeklyReports = this.reportHistory.filter(r => r.reportType === 'weekly');
        const failedPosts = this.reportHistory.filter(r => !r.posted).length;
        const lastDailyReport = dailyReports.length > 0
            ? dailyReports[dailyReports.length - 1].timestamp
            : null;
        const lastWeeklyReport = weeklyReports.length > 0
            ? weeklyReports[weeklyReports.length - 1].timestamp
            : null;
        return {
            totalDailyReports: dailyReports.length,
            totalWeeklyReports: weeklyReports.length,
            lastDailyReport,
            lastWeeklyReport,
            failedPosts,
        };
    }
    /**
     * Get day name from day number.
     */
    getDayName(dayNum) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayNum] || 'Unknown';
    }
}
//# sourceMappingURL=cost-reporter-scheduler.js.map