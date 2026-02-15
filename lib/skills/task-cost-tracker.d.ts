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
export interface TaskCostEntry {
    timestamp: string;
    taskId: string;
    taskType: 'agent' | 'skill' | 'command' | 'pipeline' | 'ceo-loop' | 'night-shift';
    taskName: string;
    model: string;
    backend: 'ollama' | 'anthropic-api' | 'openai-api' | 'claude-cli' | 'whisper-local';
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
    electricityKWh?: number;
    metadata?: {
        agentNumber?: number;
        skillName?: string;
        commandName?: string;
        userId?: string;
        channelId?: string;
        complexity?: number;
        latencyMs?: number;
    };
}
export interface TaskCostSummary {
    taskId: string;
    taskType: string;
    taskName: string;
    totalCost: number;
    totalTokens: number;
    inferenceCount: number;
    avgCostPerInference: number;
    models: Record<string, number>;
    backends: Record<string, number>;
    electricityKWh: number;
}
export interface CostBreakdown {
    byTaskType: Record<string, number>;
    byModel: Record<string, number>;
    byBackend: Record<string, number>;
    byTask: TaskCostSummary[];
    totalCost: number;
    totalElectricity: number;
    period: {
        start: string;
        end: string;
    };
}
export default class TaskCostTracker {
    private logPath;
    constructor(dataDir?: string);
    /**
     * Track inference cost for a specific task
     */
    trackTaskInference(taskId: string, taskType: TaskCostEntry['taskType'], taskName: string, model: string, backend: TaskCostEntry['backend'], inputTokens: number, outputTokens: number, metadata?: TaskCostEntry['metadata']): TaskCostEntry;
    /**
     * Calculate cost in USD for a model inference
     */
    private calculateCost;
    /**
     * Calculate electricity consumption in kWh for Ollama inference
     *
     * Formula:
     * - Power draw: 300W (average GPU during inference)
     * - Throughput: 100 tokens/sec (model dependent, this is conservative)
     * - Time = totalTokens / tokensPerSecond
     * - Energy (kWh) = (powerWatts * timeSeconds) / (1000 * 3600)
     */
    private calculateElectricity;
    /**
     * Estimate electricity cost in USD for Ollama inference
     */
    estimateOllamaElectricityCost(totalTokens: number): number;
    /**
     * Get cost summary for a specific task
     */
    getTaskSummary(taskId: string): TaskCostSummary | null;
    /**
     * Get cost breakdown for a time period
     */
    getCostBreakdown(startTime: Date, endTime: Date): CostBreakdown;
    /**
     * Get daily cost breakdown
     */
    getDailyBreakdown(date?: Date): CostBreakdown;
    /**
     * Get weekly cost breakdown (last 7 days)
     */
    getWeeklyBreakdown(): CostBreakdown;
    /**
     * Get all cost entries (for debugging/export)
     */
    getAllEntries(): TaskCostEntry[];
    /**
     * Get log file path
     */
    getLogPath(): string;
    private appendEntry;
    private readEntries;
}
//# sourceMappingURL=task-cost-tracker.d.ts.map