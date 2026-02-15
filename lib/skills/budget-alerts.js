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
import fs from 'fs';
import path from 'path';
export class BudgetAlerts {
    log;
    wallet;
    discord;
    channelId;
    config;
    alertHistory = [];
    lastAlertTime = 0;
    alertLogPath;
    checkTimer;
    constructor(log, wallet, dataDir, config) {
        this.log = log;
        this.wallet = wallet;
        this.config = {
            enabled: config?.enabled ?? true,
            cooldownMs: config?.cooldownMs ?? 3600_000, // 1 hour default cooldown
            checkIntervalMs: config?.checkIntervalMs ?? 300_000, // Check every 5 minutes
            logAlerts: config?.logAlerts ?? true,
        };
        this.alertLogPath = path.join(dataDir, 'budget-alerts.jsonl');
        // Ensure alert log file exists
        if (!fs.existsSync(this.alertLogPath)) {
            fs.writeFileSync(this.alertLogPath, '', 'utf-8');
        }
        // Load last alert time from history
        this.loadAlertHistory();
    }
    /**
     * Start budget monitoring with automatic checks.
     * Requires Discord helper and channel ID for posting alerts.
     */
    start(discord, channelId) {
        if (!this.config.enabled) {
            this.log.info('BudgetAlerts disabled in config');
            return;
        }
        this.discord = discord;
        this.channelId = channelId;
        // Start periodic budget checks
        if (this.config.checkIntervalMs > 0) {
            this.checkTimer = setInterval(() => {
                this.checkBudgetAndAlert().catch(err => this.log.error(`Budget check failed: ${err}`));
            }, this.config.checkIntervalMs);
        }
        this.log.info(`BudgetAlerts started → #trust-debt-public (cooldown: ${this.config.cooldownMs / 1000 / 60}min, ` +
            `check interval: ${this.config.checkIntervalMs / 1000 / 60}min)`);
    }
    /**
     * Stop budget monitoring.
     */
    stop() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = undefined;
        }
        this.log.info('BudgetAlerts stopped');
    }
    /**
     * Check current budget status against sovereignty-adjusted threshold.
     * Posts alert to Discord if threshold exceeded and cooldown has passed.
     */
    async checkBudgetAndAlert(sovereignty) {
        // Default sovereignty to 0.5 if not provided (moderate trust)
        const sov = sovereignty ?? 0.5;
        const budgetCheck = this.wallet.checkBudgetAlert(sov);
        const status = {
            withinBudget: !budgetCheck.alert,
            sovereignty: sov,
            spent: budgetCheck.spent,
            limit: budgetCheck.limit,
            remaining: budgetCheck.limit - budgetCheck.spent,
            percentUsed: (budgetCheck.spent / budgetCheck.limit) * 100,
        };
        // If budget exceeded and cooldown has passed, post alert
        if (budgetCheck.alert && this.shouldPostAlert()) {
            await this.postBudgetAlert(sov, budgetCheck.spent, budgetCheck.limit);
        }
        return status;
    }
    /**
     * Manually trigger a budget alert (bypasses cooldown for testing/emergency).
     */
    async triggerAlert(sovereignty) {
        const budgetCheck = this.wallet.checkBudgetAlert(sovereignty);
        if (budgetCheck.alert) {
            await this.postBudgetAlert(sovereignty, budgetCheck.spent, budgetCheck.limit);
        }
        else {
            this.log.info(`No budget alert needed: $${budgetCheck.spent.toFixed(2)} < $${budgetCheck.limit.toFixed(2)}`);
        }
    }
    /**
     * Get current budget status without triggering alerts.
     */
    getBudgetStatus(sovereignty) {
        const budgetCheck = this.wallet.checkBudgetAlert(sovereignty);
        return {
            withinBudget: !budgetCheck.alert,
            sovereignty,
            spent: budgetCheck.spent,
            limit: budgetCheck.limit,
            remaining: budgetCheck.limit - budgetCheck.spent,
            percentUsed: (budgetCheck.spent / budgetCheck.limit) * 100,
        };
    }
    /**
     * Check if enough time has passed since last alert (cooldown).
     */
    shouldPostAlert() {
        const now = Date.now();
        const timeSinceLastAlert = now - this.lastAlertTime;
        return timeSinceLastAlert >= this.config.cooldownMs;
    }
    /**
     * Post budget alert to Discord #trust-debt-public channel.
     */
    async postBudgetAlert(sovereignty, spent, limit) {
        const exceededBy = spent - limit;
        const percentOfLimit = (spent / limit) * 100;
        // Determine severity based on how much the budget was exceeded
        const severity = exceededBy >= limit * 0.5 ? '🔴' : exceededBy >= limit * 0.25 ? '🟡' : '🟠';
        const hardness = exceededBy >= limit * 0.5 ? 'H1-CRITICAL' : exceededBy >= limit * 0.25 ? 'H2-HIGH' : 'H3-MEDIUM';
        // Format message in CEO-grade Intelligence Burst style (matching TransparencyEngine)
        const message = [
            `${severity} **BUDGET LIMIT EXCEEDED**`,
            ``,
            `**Daily Spending:** $${spent.toFixed(2)}`,
            `**Daily Limit:** $${limit.toFixed(2)} (sovereignty: ${sovereignty.toFixed(3)})`,
            `**Exceeded By:** $${exceededBy.toFixed(2)} (${(percentOfLimit - 100).toFixed(0)}% over)`,
            `**Hardness:** ${hardness}`,
            `**Time:** ${new Date().toISOString()}`,
            ``,
            `*Sovereignty-adjusted spending limits prevent runaway costs. Review wallet ledger for details.*`,
            ``,
            `**Budget Thresholds:**`,
            `• Sovereignty > 0.9: $100/day (high trust)`,
            `• Sovereignty > 0.7: $50/day (moderate trust)`,
            `• Sovereignty > 0.5: $20/day (low trust)`,
            `• Sovereignty ≤ 0.5: $5/day (restricted)`,
        ].join('\n');
        // Record alert event
        const alertEvent = {
            timestamp: new Date().toISOString(),
            sovereignty,
            spent,
            limit,
            exceededBy,
            percentOfLimit,
            message,
        };
        this.alertHistory.push(alertEvent);
        this.lastAlertTime = Date.now();
        // Log to file if enabled
        if (this.config.logAlerts) {
            this.logAlertToFile(alertEvent);
        }
        // Post to Discord
        await this.postToChannel(message);
        this.log.warn(`Budget alert posted: spent=$${spent.toFixed(2)}, limit=$${limit.toFixed(2)}, ` +
            `sovereignty=${sovereignty.toFixed(3)}`);
    }
    /**
     * Post message to Discord channel.
     */
    async postToChannel(content) {
        if (!this.discord?.sendToChannel || !this.channelId) {
            this.log.warn('Cannot post budget alert: Discord not initialized');
            return;
        }
        try {
            await this.discord.sendToChannel(this.channelId, content);
        }
        catch (err) {
            this.log.error(`Failed to post budget alert to Discord: ${err}`);
        }
    }
    /**
     * Log alert event to JSONL file.
     */
    logAlertToFile(event) {
        try {
            const line = JSON.stringify(event) + '\n';
            fs.appendFileSync(this.alertLogPath, line, 'utf-8');
        }
        catch (err) {
            this.log.error(`Failed to log budget alert to file: ${err}`);
        }
    }
    /**
     * Load alert history from JSONL file.
     */
    loadAlertHistory() {
        if (!fs.existsSync(this.alertLogPath))
            return;
        try {
            const content = fs.readFileSync(this.alertLogPath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            this.alertHistory = lines.map(line => JSON.parse(line));
            // Set last alert time from most recent alert
            if (this.alertHistory.length > 0) {
                const lastAlert = this.alertHistory[this.alertHistory.length - 1];
                this.lastAlertTime = new Date(lastAlert.timestamp).getTime();
            }
        }
        catch (err) {
            this.log.error(`Failed to load alert history: ${err}`);
        }
    }
    /**
     * Get alert history for analysis.
     */
    getAlertHistory(limit = 50) {
        return this.alertHistory.slice(-limit);
    }
    /**
     * Get alert statistics.
     */
    getAlertStats() {
        const totalAlerts = this.alertHistory.length;
        const lastAlertTime = totalAlerts > 0
            ? this.alertHistory[this.alertHistory.length - 1].timestamp
            : null;
        const exceededAmounts = this.alertHistory.map(a => a.exceededBy);
        const averageExceededBy = exceededAmounts.length > 0
            ? exceededAmounts.reduce((sum, val) => sum + val, 0) / exceededAmounts.length
            : 0;
        const maxExceededBy = exceededAmounts.length > 0
            ? Math.max(...exceededAmounts)
            : 0;
        return {
            totalAlerts,
            lastAlertTime,
            averageExceededBy,
            maxExceededBy,
        };
    }
    /**
     * Clear alert history (for testing or reset).
     */
    clearAlertHistory() {
        this.alertHistory = [];
        this.lastAlertTime = 0;
        if (fs.existsSync(this.alertLogPath)) {
            fs.writeFileSync(this.alertLogPath, '', 'utf-8');
        }
        this.log.info('Alert history cleared');
    }
}
//# sourceMappingURL=budget-alerts.js.map