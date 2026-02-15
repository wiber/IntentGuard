/**
 * src/cron/scheduler.ts — Proactive Night Shift Scheduler
 *
 * The "Ghost User" that keeps the bot moving when the system is quiet.
 * Injects synthetic prompts into the SteeringLoop based on time, state, and sovereignty.
 *
 * ARCHITECTURE:
 *   Heartbeat (configurable interval) → Check state → Classify task → Inject or wait
 *
 * SAFE TASKS (auto-execute if sovereignty > 0.6):
 *   - Write unit tests for untested modules
 *   - Scan spec for stale/blocked items
 *   - Generate trust-debt reports
 *   - Check dead links in docs
 *   - Update room context summaries
 *   - Run FIM benchmark
 *   - Tweet heartbeat status
 *
 * DANGEROUS TASKS (requires admin blessing or sovereignty > 0.9):
 *   - Refactor core modules
 *   - Modify runtime configuration
 *   - Deploy / push to remote
 *   - Delete files
 *   - Modify auth/permission logic
 *
 * RISK GATING:
 *   Safe + sovereignty > 0.6     → tier='trusted' (auto-execute after countdown)
 *   Safe + sovereignty < 0.6     → tier='general' (suggestion, needs admin 👍)
 *   Dangerous + sovereignty > 0.9 → tier='trusted' (auto-execute after countdown)
 *   Dangerous + sovereignty < 0.9 → tier='general' (suggestion only)
 *
 * The SteeringLoop handles the actual execution/abort/redirect logic.
 * This module only decides WHAT to inject and WHEN.
 */
import type { Logger } from '../types.js';
export type TaskRisk = 'safe' | 'dangerous';
export interface ProactiveTask {
    id: string;
    description: string;
    prompt: string;
    risk: TaskRisk;
    room: string;
    /** Categories for ShortRank mapping */
    categories: string[];
    /** Minimum sovereignty score to auto-execute */
    minSovereignty: number;
    /** Cooldown: don't repeat this task within N minutes */
    cooldownMinutes: number;
    /** Check function: should this task run now? */
    shouldRun: (ctx: SchedulerContext) => boolean;
}
export interface SchedulerConfig {
    /** Heartbeat interval in milliseconds */
    heartbeatMs: number;
    /** Minimum idle time before proactive tasks trigger (ms) */
    minIdleMs: number;
    /** Maximum proactive tasks per hour */
    maxTasksPerHour: number;
    /** Enable/disable the scheduler */
    enabled: boolean;
}
export interface SchedulerContext {
    sovereignty: number;
    lastMessageTime: number;
    lastTaskTime: number;
    repoRoot: string;
    specTodoCount: number;
    runningTaskCount: number;
}
type InjectCallback = (tier: 'trusted' | 'general', room: string, prompt: string, categories: string[]) => Promise<void>;
type SovereigntyGetter = () => number;
type IdleChecker = () => {
    idleMs: number;
    runningTasks: number;
};
type SpecScanner = () => number;
export declare const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig;
export declare class ProactiveScheduler {
    private log;
    private config;
    private repoRoot;
    private tasks;
    private timer;
    private lastRunTimes;
    private tasksThisHour;
    private hourStart;
    private injectCallback;
    private getSovereignty;
    private checkIdle;
    private scanSpec;
    constructor(log: Logger, repoRoot: string, config?: SchedulerConfig);
    /**
     * Wire the scheduler to the runtime.
     */
    bind(inject: InjectCallback, getSovereignty: SovereigntyGetter, checkIdle: IdleChecker, scanSpec: SpecScanner): void;
    /**
     * Start the heartbeat loop.
     */
    start(): void;
    /**
     * Stop the scheduler.
     */
    stop(): void;
    /**
     * The heartbeat — the core of Night Shift.
     */
    private heartbeat;
    /**
     * Get scheduler status for !ceo-status command.
     */
    getStatus(): {
        enabled: boolean;
        tasksThisHour: number;
        maxPerHour: number;
        registeredTasks: number;
        nextEligible: string | null;
    };
}
export {};
//# sourceMappingURL=scheduler.d.ts.map