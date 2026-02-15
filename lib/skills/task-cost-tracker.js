/**
 * src/skills/task-cost-tracker.ts — Per-Task Inference Cost Tracking
 *
 * Phase: Phase 6 — Economic Sovereignty (Wallet Skill)
 *
 * Extends cost-reporter.ts and wallet-ledger.ts with task-level granularity.
 * Tracks inference costs per task (agent, command, skill invocation) for
 * detailed cost attribution and optimization.
 *
 * Features:
 * - Track costs per task/agent/command
 * - Ollama electricity estimates (local inference)
 * - API credit tracking (Claude, GPT-4, etc.)
 * - Task-level P&L breakdown
 * - Cost attribution by task type
 * - Integration with existing wallet-ledger
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ═══════════════════════════════════════════════════════════════
// Pricing Constants
// ═══════════════════════════════════════════════════════════════
const PRICING = {
    // Claude API (per 1M tokens)
    'claude-opus-4': { input: 15.00, output: 75.00 },
    'claude-sonnet-4': { input: 3.00, output: 15.00 },
    'claude-haiku-4': { input: 0.25, output: 1.25 },
    // OpenAI API (per 1M tokens)
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-3.5': { input: 1.50, output: 2.00 },
    // Ollama electricity estimate
    // Assumes: average GPU power draw 300W, inference throughput 100 tokens/sec
    // Cost per kWh: $0.15 (US average)
    'ollama': {
        powerWatts: 300,
        tokensPerSecond: 100,
        electricityCostPerKWh: 0.15,
    },
};
// ═══════════════════════════════════════════════════════════════
// TaskCostTracker Class
// ═══════════════════════════════════════════════════════════════
export default class TaskCostTracker {
    logPath;
    constructor(dataDir) {
        const baseDir = dataDir || path.join(__dirname, '..', '..', 'data');
        // Ensure data directory exists
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        this.logPath = path.join(baseDir, 'task-costs.jsonl');
        // Create log file if it doesn't exist
        if (!fs.existsSync(this.logPath)) {
            fs.writeFileSync(this.logPath, '', 'utf-8');
        }
    }
    /**
     * Track inference cost for a specific task
     */
    trackTaskInference(taskId, taskType, taskName, model, backend, inputTokens, outputTokens, metadata) {
        const costUSD = this.calculateCost(model, backend, inputTokens, outputTokens);
        const electricityKWh = backend === 'ollama'
            ? this.calculateElectricity(inputTokens + outputTokens)
            : undefined;
        const entry = {
            timestamp: new Date().toISOString(),
            taskId,
            taskType,
            taskName,
            model,
            backend,
            inputTokens,
            outputTokens,
            costUSD,
            electricityKWh,
            metadata,
        };
        this.appendEntry(entry);
        return entry;
    }
    /**
     * Calculate cost in USD for a model inference
     */
    calculateCost(model, backend, inputTokens, outputTokens) {
        const modelLower = model.toLowerCase();
        // Ollama is free (local inference) - but we track electricity separately
        if (backend === 'ollama' || modelLower.includes('llama')) {
            return 0;
        }
        // Claude models
        if (modelLower.includes('opus')) {
            const pricing = PRICING['claude-opus-4'];
            return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
        }
        if (modelLower.includes('sonnet')) {
            const pricing = PRICING['claude-sonnet-4'];
            return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
        }
        if (modelLower.includes('haiku')) {
            const pricing = PRICING['claude-haiku-4'];
            return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
        }
        // OpenAI models
        if (modelLower.includes('gpt-4')) {
            const pricing = PRICING['gpt-4'];
            return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
        }
        if (modelLower.includes('gpt-3.5')) {
            const pricing = PRICING['gpt-3.5'];
            return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
        }
        // Default estimate for unknown models
        return (inputTokens / 1_000_000) * 10.0 + (outputTokens / 1_000_000) * 30.0;
    }
    /**
     * Calculate electricity consumption in kWh for Ollama inference
     *
     * Formula:
     * - Power draw: 300W (average GPU during inference)
     * - Throughput: 100 tokens/sec (model dependent, this is conservative)
     * - Time = totalTokens / tokensPerSecond
     * - Energy (kWh) = (powerWatts * timeSeconds) / (1000 * 3600)
     */
    calculateElectricity(totalTokens) {
        const { powerWatts, tokensPerSecond } = PRICING.ollama;
        const timeSeconds = totalTokens / tokensPerSecond;
        const energyKWh = (powerWatts * timeSeconds) / (1000 * 3600);
        return parseFloat(energyKWh.toFixed(6));
    }
    /**
     * Estimate electricity cost in USD for Ollama inference
     */
    estimateOllamaElectricityCost(totalTokens) {
        const kWh = this.calculateElectricity(totalTokens);
        return kWh * PRICING.ollama.electricityCostPerKWh;
    }
    /**
     * Get cost summary for a specific task
     */
    getTaskSummary(taskId) {
        const entries = this.readEntries().filter(e => e.taskId === taskId);
        if (entries.length === 0)
            return null;
        const totalCost = entries.reduce((sum, e) => sum + e.costUSD, 0);
        const totalTokens = entries.reduce((sum, e) => sum + e.inputTokens + e.outputTokens, 0);
        const electricityKWh = entries.reduce((sum, e) => sum + (e.electricityKWh || 0), 0);
        const models = {};
        const backends = {};
        for (const entry of entries) {
            models[entry.model] = (models[entry.model] || 0) + entry.costUSD;
            backends[entry.backend] = (backends[entry.backend] || 0) + entry.costUSD;
        }
        return {
            taskId,
            taskType: entries[0].taskType,
            taskName: entries[0].taskName,
            totalCost,
            totalTokens,
            inferenceCount: entries.length,
            avgCostPerInference: totalCost / entries.length,
            models,
            backends,
            electricityKWh,
        };
    }
    /**
     * Get cost breakdown for a time period
     */
    getCostBreakdown(startTime, endTime) {
        const startISO = startTime.toISOString();
        const endISO = endTime.toISOString();
        const entries = this.readEntries().filter(e => e.timestamp >= startISO && e.timestamp <= endISO);
        const byTaskType = {};
        const byModel = {};
        const byBackend = {};
        const taskSummaries = new Map();
        let totalCost = 0;
        let totalElectricity = 0;
        for (const entry of entries) {
            totalCost += entry.costUSD;
            totalElectricity += entry.electricityKWh || 0;
            byTaskType[entry.taskType] = (byTaskType[entry.taskType] || 0) + entry.costUSD;
            byModel[entry.model] = (byModel[entry.model] || 0) + entry.costUSD;
            byBackend[entry.backend] = (byBackend[entry.backend] || 0) + entry.costUSD;
            // Update task summary
            if (!taskSummaries.has(entry.taskId)) {
                taskSummaries.set(entry.taskId, {
                    taskId: entry.taskId,
                    taskType: entry.taskType,
                    taskName: entry.taskName,
                    totalCost: 0,
                    totalTokens: 0,
                    inferenceCount: 0,
                    avgCostPerInference: 0,
                    models: {},
                    backends: {},
                    electricityKWh: 0,
                });
            }
            const summary = taskSummaries.get(entry.taskId);
            summary.totalCost += entry.costUSD;
            summary.totalTokens += entry.inputTokens + entry.outputTokens;
            summary.inferenceCount += 1;
            summary.electricityKWh += entry.electricityKWh || 0;
            summary.models[entry.model] = (summary.models[entry.model] || 0) + entry.costUSD;
            summary.backends[entry.backend] = (summary.backends[entry.backend] || 0) + entry.costUSD;
        }
        // Calculate averages for task summaries
        for (const summary of taskSummaries.values()) {
            summary.avgCostPerInference = summary.totalCost / summary.inferenceCount;
        }
        return {
            byTaskType,
            byModel,
            byBackend,
            byTask: Array.from(taskSummaries.values()).sort((a, b) => b.totalCost - a.totalCost),
            totalCost,
            totalElectricity,
            period: {
                start: startISO,
                end: endISO,
            },
        };
    }
    /**
     * Get daily cost breakdown
     */
    getDailyBreakdown(date) {
        const targetDate = date || new Date();
        const start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);
        return this.getCostBreakdown(start, end);
    }
    /**
     * Get weekly cost breakdown (last 7 days)
     */
    getWeeklyBreakdown() {
        const end = new Date();
        const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        return this.getCostBreakdown(start, end);
    }
    /**
     * Get all cost entries (for debugging/export)
     */
    getAllEntries() {
        return this.readEntries();
    }
    /**
     * Get log file path
     */
    getLogPath() {
        return this.logPath;
    }
    // ═══════════════════════════════════════════════════════════════
    // Internal Helpers
    // ═══════════════════════════════════════════════════════════════
    appendEntry(entry) {
        const line = JSON.stringify(entry) + '\n';
        fs.appendFileSync(this.logPath, line, 'utf-8');
    }
    readEntries() {
        if (!fs.existsSync(this.logPath)) {
            return [];
        }
        const content = fs.readFileSync(this.logPath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        const entries = [];
        for (const line of lines) {
            try {
                entries.push(JSON.parse(line));
            }
            catch (err) {
                // Skip malformed lines silently
                continue;
            }
        }
        return entries;
    }
}
//# sourceMappingURL=task-cost-tracker.js.map