/**
 * src/swarm/agent-pool.ts — Claude Flow Agent Pool (50 concurrent)
 *
 * Manages a pool of up to 50 concurrent Claude agents for task subdivision.
 * Each agent is launched via the swarm-launch-N.sh scripts in the coordination directory.
 *
 * ARCHITECTURE:
 *   - Pool of 50 agent slots (1-50)
 *   - Task queue with priority levels
 *   - File claim coordination to prevent conflicts
 *   - Shared memory JSONL for cross-agent communication
 *   - Automatic retry on failure with exponential backoff
 *
 * TASK SUBDIVISION:
 *   Large tasks are automatically decomposed into subtasks that can run in parallel.
 *   Each subtask is assigned to an available agent from the pool.
 *
 * FILE CLAIMS:
 *   Before assigning work, check ../thetadrivencoach/openclaw/data/coordination/file-claims.json
 *   to ensure no agent is working on conflicting files.
 *
 * USAGE:
 *   const pool = new AgentPool();
 *   await pool.initialize();
 *   const taskId = await pool.submitTask({
 *     description: 'Implement user authentication',
 *     priority: 'high',
 *     files: ['src/auth/login.ts'],
 *   });
 *   const result = await pool.waitForTask(taskId);
 */
import type { Logger } from '../types.js';
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';
export type TaskStatus = 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AgentStatus = 'idle' | 'busy' | 'failed';
export interface SubTask {
    id: string;
    description: string;
    priority: TaskPriority;
    files: string[];
    prompt: string;
    status: TaskStatus;
    agentId?: number;
    submittedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    result?: string;
    error?: string;
    retries: number;
}
export interface AgentSlot {
    id: number;
    status: AgentStatus;
    currentTask?: string;
    claimedFiles: string[];
    lastHealthCheck: Date;
    processId?: number;
}
export interface AgentPoolConfig {
    poolSize: number;
    maxRetries: number;
    taskTimeoutMs: number;
    healthCheckIntervalMs: number;
    coordinationDir: string;
    repoRoot: string;
}
export declare class AgentPool {
    private config;
    private agents;
    private tasks;
    private taskQueue;
    private logger;
    private healthCheckTimer?;
    constructor(config?: Partial<AgentPoolConfig>, logger?: Logger);
    /**
     * Initialize the agent pool and restore state from coordination directory
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the agent pool gracefully
     */
    shutdown(): Promise<void>;
    /**
     * Submit a new task to the pool
     */
    submitTask(params: {
        description: string;
        priority: TaskPriority;
        files: string[];
        prompt: string;
    }): Promise<string>;
    /**
     * Wait for a task to complete
     */
    waitForTask(taskId: string, timeoutMs?: number): Promise<SubTask>;
    /**
     * Get task status
     */
    getTask(taskId: string): SubTask | undefined;
    /**
     * Cancel a running task
     */
    cancelTask(taskId: string): Promise<void>;
    /**
     * Get pool statistics
     */
    getStats(): {
        totalAgents: number;
        idleAgents: number;
        busyAgents: number;
        failedAgents: number;
        pendingTasks: number;
        runningTasks: number;
        completedTasks: number;
        failedTasks: number;
    };
    /**
     * Assign pending tasks to idle agents
     */
    private assignTasks;
    /**
     * Assign a specific task to a specific agent
     */
    private assignTaskToAgent;
    /**
     * Launch an agent process via swarm-launch-N.sh
     */
    private launchAgent;
    /**
     * Check if task files conflict with currently claimed files
     */
    private hasFileConflict;
    /**
     * Claim files for an agent
     */
    private claimFiles;
    /**
     * Release file claims for an agent
     */
    private releaseFileClaims;
    /**
     * Clear all file claims
     */
    private clearAllFileClaims;
    /**
     * Read file claims from coordination directory
     */
    private readFileClaims;
    /**
     * Log event to swarm memory JSONL
     */
    private logToSwarmMemory;
    /**
     * Restore state from swarm memory on initialization
     */
    private restoreStateFromMemory;
    /**
     * Sort task queue by priority
     */
    private sortQueue;
    /**
     * Start periodic health check
     */
    private startHealthCheck;
    /**
     * Perform health check on all agents
     */
    private performHealthCheck;
}
/**
 * Decompose a large task into smaller subtasks based on file analysis
 */
export declare function subdivideTask(params: {
    description: string;
    targetFiles: string[];
    repoRoot: string;
}): Promise<Array<{
    description: string;
    files: string[];
    priority: TaskPriority;
}>>;
//# sourceMappingURL=agent-pool.d.ts.map