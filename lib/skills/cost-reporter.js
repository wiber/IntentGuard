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
import * as fs from 'fs';
import * as path from 'path';
// ═══════════════════════════════════════════════════════════════
// Pricing Constants
// ═══════════════════════════════════════════════════════════════
const PRICING = {
    // Claude API (per 1M tokens)
    'claude-opus': { input: 15.00, output: 75.00 },
    'claude-sonnet': { input: 3.00, output: 15.00 },
    'claude-haiku': { input: 0.25, output: 1.25 },
    // Ollama models (electricity estimate per 1K tokens)
    'ollama': { perTokenK: 0.0001 }
};
/** Daily budget threshold — hard-switch to Ollama above this */
const DAILY_BUDGET_USD = 5.00;
// ═══════════════════════════════════════════════════════════════
// CostReporter Class
// ═══════════════════════════════════════════════════════════════
export default class CostReporter {
    name = 'cost-reporter';
    description = 'Tracks inference costs and generates financial reports';
    log;
    ledgerPath;
    constructor() {
        this.ledgerPath = path.join(process.cwd(), 'data', 'wallet-ledger.jsonl');
    }
    async initialize(ctx) {
        this.log = ctx.log;
        // Ensure data directory exists
        const dataDir = path.dirname(this.ledgerPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        // Create ledger if it doesn't exist
        if (!fs.existsSync(this.ledgerPath)) {
            fs.writeFileSync(this.ledgerPath, '', 'utf-8');
            this.log.info(`Created wallet ledger at ${this.ledgerPath}`);
        }
        this.log.info('CostReporter initialized');
    }
    async execute(command, ctx) {
        const cmd = command;
        switch (cmd.action) {
            case 'track-inference':
                return this.handleTrackInference(cmd, ctx);
            case 'daily-report':
                return this.handleDailyReport(cmd, ctx);
            case 'weekly-report':
                return this.handleWeeklyReport(ctx);
            case 'add-revenue':
                return this.handleAddRevenue(cmd, ctx);
            case 'check-budget':
                return this.handleCheckBudget(cmd, ctx);
            default:
                return { success: false, message: `Unknown action: ${cmd.action}` };
        }
    }
    // ═══════════════════════════════════════════════════════════════
    // Core Methods
    // ═══════════════════════════════════════════════════════════════
    /**
     * Track inference cost for a model
     */
    trackInferenceCost(model, inputTokens, outputTokens) {
        let amount = 0;
        let category = 'inference';
        if (model.includes('claude-opus') || model.includes('opus')) {
            // Claude Opus pricing
            amount = (inputTokens / 1_000_000 * PRICING['claude-opus'].input) +
                (outputTokens / 1_000_000 * PRICING['claude-opus'].output);
            category = 'inference-claude-opus';
        }
        else if (model.includes('claude-sonnet') || model.includes('sonnet')) {
            // Claude Sonnet pricing
            amount = (inputTokens / 1_000_000 * PRICING['claude-sonnet'].input) +
                (outputTokens / 1_000_000 * PRICING['claude-sonnet'].output);
            category = 'inference-claude-sonnet';
        }
        else if (model.includes('claude-haiku') || model.includes('haiku')) {
            // Claude Haiku pricing
            amount = (inputTokens / 1_000_000 * PRICING['claude-haiku'].input) +
                (outputTokens / 1_000_000 * PRICING['claude-haiku'].output);
            category = 'inference-claude-haiku';
        }
        else {
            // Ollama electricity estimate
            const totalTokens = inputTokens + outputTokens;
            amount = (totalTokens / 1000) * PRICING.ollama.perTokenK;
            category = 'inference-ollama';
        }
        const transaction = {
            timestamp: Date.now(),
            type: 'expense',
            amount: parseFloat(amount.toFixed(6)),
            category,
            description: `${model}: ${inputTokens} in + ${outputTokens} out tokens`,
            model
        };
        this.appendTransaction(transaction);
        return transaction;
    }
    /**
     * Generate daily report
     */
    generateDailyReport(date) {
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        return this.generateReport(startOfDay.getTime(), endOfDay.getTime(), 1);
    }
    /**
     * Generate weekly report (last 7 days)
     */
    generateWeeklyReport() {
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        return this.generateReport(sevenDaysAgo, now, 7);
    }
    /**
     * Format report for Discord
     */
    formatForDiscord(report) {
        const lines = [];
        lines.push('```');
        lines.push('╔════════════════════════════════════════╗');
        lines.push('║     WALLET REPORT — COST ANALYSIS      ║');
        lines.push('╚════════════════════════════════════════╝');
        lines.push('');
        lines.push(`Period: ${report.period.start} → ${report.period.end}`);
        lines.push(`Days: ${report.period.days}`);
        lines.push('');
        lines.push('──────────────────────────────────────────');
        lines.push(`Total Income:   $${report.totalIncome.toFixed(4)}`);
        lines.push(`Total Expenses: $${report.totalSpent.toFixed(4)}`);
        lines.push(`Net Balance:    $${report.netBalance.toFixed(4)}`);
        lines.push('──────────────────────────────────────────');
        lines.push('');
        // Category breakdown
        lines.push('BY CATEGORY:');
        const sortedCategories = Object.entries(report.byCategory)
            .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));
        for (const [category, amount] of sortedCategories) {
            const sign = amount >= 0 ? '+' : '-';
            lines.push(`  ${category.padEnd(30)} ${sign}$${Math.abs(amount).toFixed(4)}`);
        }
        lines.push('');
        // Top expenses
        if (report.topExpenses.length > 0) {
            lines.push('TOP EXPENSES:');
            for (const tx of report.topExpenses.slice(0, 5)) {
                const date = new Date(tx.timestamp).toISOString().split('T')[0];
                const desc = tx.description.length > 40
                    ? tx.description.substring(0, 37) + '...'
                    : tx.description;
                lines.push(`  ${date} $${tx.amount.toFixed(4)} ${desc}`);
            }
        }
        lines.push('');
        lines.push(report.summary);
        lines.push('```');
        return lines.join('\n');
    }
    /**
     * Add revenue (stub for future expansion)
     */
    addRevenue(source, amount, description) {
        const transaction = {
            timestamp: Date.now(),
            type: 'income',
            amount,
            category: `revenue-${source}`,
            description
        };
        this.appendTransaction(transaction);
        return transaction;
    }
    /**
     * Check budget and alert if overspending
     *
     * Sovereignty levels:
     * 0.0-0.3 = 🔴 Critical (alert at $1/day)
     * 0.3-0.6 = 🟡 Warning (alert at $5/day)
     * 0.6-1.0 = 🟢 Healthy (alert at $20/day)
     */
    checkAndAlert(sovereignty) {
        const report = this.generateDailyReport();
        let threshold = 1.0; // Default: critical
        let level = '🔴 CRITICAL';
        if (sovereignty >= 0.6) {
            threshold = 20.0;
            level = '🟢 HEALTHY';
        }
        else if (sovereignty >= 0.3) {
            threshold = 5.0;
            level = '🟡 WARNING';
        }
        if (report.totalSpent > threshold) {
            const overspend = report.totalSpent - threshold;
            return [
                `${level} BUDGET ALERT`,
                `Daily spend: $${report.totalSpent.toFixed(4)}`,
                `Threshold: $${threshold.toFixed(2)}`,
                `Overage: $${overspend.toFixed(4)}`,
                `Sovereignty: ${(sovereignty * 100).toFixed(1)}%`,
                '',
                'Top categories:',
                ...Object.entries(report.byCategory)
                    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                    .slice(0, 3)
                    .map(([cat, amt]) => `  - ${cat}: $${amt.toFixed(4)}`)
            ].join('\n');
        }
        return null;
    }
    /**
     * Check if daily budget is exceeded — used by LLM Controller for hard-switch to Ollama.
     */
    isBudgetExceeded() {
        const report = this.generateDailyReport();
        return report.totalSpent >= DAILY_BUDGET_USD;
    }
    /**
     * Get today's spend — for real-time governance display.
     */
    getDailySpend() {
        const report = this.generateDailyReport();
        return report.totalSpent;
    }
    /**
     * Get the daily budget limit.
     */
    getDailyBudget() {
        return DAILY_BUDGET_USD;
    }
    // ═══════════════════════════════════════════════════════════════
    // Internal Helpers
    // ═══════════════════════════════════════════════════════════════
    appendTransaction(tx) {
        const line = JSON.stringify(tx) + '\n';
        fs.appendFileSync(this.ledgerPath, line, 'utf-8');
    }
    readTransactions(startTime, endTime) {
        if (!fs.existsSync(this.ledgerPath)) {
            return [];
        }
        const content = fs.readFileSync(this.ledgerPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        const transactions = [];
        for (const line of lines) {
            try {
                const tx = JSON.parse(line);
                if (tx.timestamp >= startTime && tx.timestamp <= endTime) {
                    transactions.push(tx);
                }
            }
            catch (err) {
                // Skip malformed lines
                continue;
            }
        }
        return transactions;
    }
    generateReport(startTime, endTime, days) {
        const transactions = this.readTransactions(startTime, endTime);
        let totalSpent = 0;
        let totalIncome = 0;
        const byCategory = {};
        const expenses = [];
        for (const tx of transactions) {
            if (tx.type === 'expense') {
                totalSpent += tx.amount;
                expenses.push(tx);
            }
            else {
                totalIncome += tx.amount;
            }
            if (!byCategory[tx.category]) {
                byCategory[tx.category] = 0;
            }
            // Income adds positive, expenses add negative
            byCategory[tx.category] += tx.type === 'income' ? tx.amount : -tx.amount;
        }
        // Sort expenses by amount (descending)
        const topExpenses = expenses.sort((a, b) => b.amount - a.amount);
        const netBalance = totalIncome - totalSpent;
        const summary = this.generateSummary(transactions.length, totalSpent, totalIncome, netBalance, days);
        return {
            summary,
            totalSpent,
            totalIncome,
            netBalance,
            byCategory,
            topExpenses,
            period: {
                start: new Date(startTime).toISOString().split('T')[0],
                end: new Date(endTime).toISOString().split('T')[0],
                days
            }
        };
    }
    generateSummary(txCount, spent, income, net, days) {
        const avgDaily = spent / days;
        const status = net >= 0 ? '✅' : '⚠️';
        return [
            `${status} ${txCount} transactions over ${days} day(s)`,
            `Average daily spend: $${avgDaily.toFixed(4)}`,
            net >= 0
                ? `Net positive: +$${net.toFixed(4)}`
                : `Net deficit: -$${Math.abs(net).toFixed(4)}`
        ].join(' | ');
    }
    // ═══════════════════════════════════════════════════════════════
    // Command Handlers
    // ═══════════════════════════════════════════════════════════════
    async handleTrackInference(cmd, ctx) {
        try {
            const params = cmd;
            const tx = this.trackInferenceCost(params.model, params.inputTokens, params.outputTokens);
            return {
                success: true,
                message: `Tracked inference: $${tx.amount.toFixed(6)} for ${params.model}`,
                data: tx
            };
        }
        catch (err) {
            return {
                success: false,
                message: `Failed to track inference: ${err}`
            };
        }
    }
    async handleDailyReport(cmd, ctx) {
        try {
            const params = cmd;
            const report = this.generateDailyReport(params.date);
            const formatted = this.formatForDiscord(report);
            return {
                success: true,
                message: formatted,
                data: report
            };
        }
        catch (err) {
            return {
                success: false,
                message: `Failed to generate daily report: ${err}`
            };
        }
    }
    async handleWeeklyReport(ctx) {
        try {
            const report = this.generateWeeklyReport();
            const formatted = this.formatForDiscord(report);
            return {
                success: true,
                message: formatted,
                data: report
            };
        }
        catch (err) {
            return {
                success: false,
                message: `Failed to generate weekly report: ${err}`
            };
        }
    }
    async handleAddRevenue(cmd, ctx) {
        try {
            const params = cmd;
            const tx = this.addRevenue(params.source, params.amount, params.description);
            return {
                success: true,
                message: `Added revenue: $${tx.amount.toFixed(2)} from ${params.source}`,
                data: tx
            };
        }
        catch (err) {
            return {
                success: false,
                message: `Failed to add revenue: ${err}`
            };
        }
    }
    async handleCheckBudget(cmd, ctx) {
        try {
            const params = cmd;
            const alert = this.checkAndAlert(params.sovereignty);
            if (alert) {
                return {
                    success: true,
                    message: alert,
                    data: { alert: true }
                };
            }
            else {
                const report = this.generateDailyReport();
                return {
                    success: true,
                    message: `Budget OK: $${report.totalSpent.toFixed(4)} spent today`,
                    data: { alert: false, spent: report.totalSpent }
                };
            }
        }
        catch (err) {
            return {
                success: false,
                message: `Failed to check budget: ${err}`
            };
        }
    }
}
//# sourceMappingURL=cost-reporter.js.map