/**
 * src/swarm/pool-integration.ts — Agent Pool Integration with CEO Loop
 *
 * Connects the Claude Flow Agent Pool with the existing scheduler and CEO loop.
 * Provides high-level API for task subdivision and parallel execution.
 *
 * INTEGRATION POINTS:
 *   - ProactiveScheduler: Inject agent pool tasks as proactive work
 *   - CEO Loop: Break down large tasks into parallel subtasks
 *   - Discord Orchestrator: Multi-room parallel execution
 *
 * TASK TYPES:
 *   - Parallel Implementation: Multiple files/modules simultaneously
 *   - Test Suite Generation: Tests for multiple modules in parallel
 *   - Documentation Generation: Parallel doc writing for different sections
 *   - Refactoring: Parallel refactor of multiple modules
 *
 * SOVEREIGNTY GATING:
 *   - Safe parallelization (tests, docs, analysis): sovereignty > 0.6
 *   - Code modification parallelization: sovereignty > 0.8
 *   - Dangerous operations (refactor, delete): sovereignty > 0.9
 */
import { AgentPool } from './agent-pool.js';
import type { SkillContext } from '../types.js';
import type { TaskPriority, SubTask } from './agent-pool.js';
export interface ParallelTaskRequest {
    description: string;
    targetFiles: string[];
    operation: 'implement' | 'test' | 'document' | 'refactor' | 'analyze';
    priority?: TaskPriority;
    sovereigntyRequired?: number;
    maxConcurrency?: number;
}
export interface ParallelTaskResult {
    taskId: string;
    subtasks: SubTask[];
    allSucceeded: boolean;
    completedCount: number;
    failedCount: number;
    totalDurationMs: number;
}
declare class PoolManager {
    private pool?;
    private logger?;
    private initialized;
    initialize(ctx: SkillContext): Promise<void>;
    shutdown(): Promise<void>;
    getPool(): AgentPool | undefined;
    isInitialized(): boolean;
}
/**
 * Get the global agent pool manager
 */
export declare function getPoolManager(): PoolManager;
/**
 * Execute a task in parallel across the agent pool
 */
export declare function executeParallel(request: ParallelTaskRequest, ctx: SkillContext, currentSovereignty: number): Promise<ParallelTaskResult>;
/**
 * Check if parallel execution is possible for a given operation
 */
export declare function canExecuteParallel(operation: ParallelTaskRequest['operation'], currentSovereignty: number, poolAvailable: boolean): {
    allowed: boolean;
    reason?: string;
};
/**
 * Get pool statistics
 */
export declare function getPoolStats(): {
    totalAgents: number;
    idleAgents: number;
    busyAgents: number;
    failedAgents: number;
    pendingTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
} | null;
/**
 * Suggest parallel execution opportunities from a spec file
 */
export declare function suggestParallelTasks(specPath: string, repoRoot: string): Promise<ParallelTaskRequest[]>;
/**
 * Register parallel task opportunities with the proactive scheduler
 */
export declare function registerParallelTasksWithScheduler(specPath: string, repoRoot: string, onTaskReady: (request: ParallelTaskRequest) => Promise<void>): Promise<void>;
export { PoolManager };
//# sourceMappingURL=pool-integration.d.ts.map