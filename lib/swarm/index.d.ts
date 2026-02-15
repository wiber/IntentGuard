/**
 * src/swarm/index.ts — Agent Pool Module Exports
 *
 * Claude Flow Agent Pool for task subdivision and parallel execution.
 * Manages up to 50 concurrent Claude agents coordinating through file claims
 * and shared memory.
 *
 * USAGE:
 *   import { getPoolManager, executeParallel, getPoolStats } from './swarm/index.js';
 *
 *   // Initialize pool
 *   await getPoolManager().initialize(ctx);
 *
 *   // Execute parallel task
 *   const result = await executeParallel({
 *     description: 'Implement user authentication',
 *     targetFiles: ['src/auth/login.ts', 'src/auth/logout.ts'],
 *     operation: 'implement',
 *     priority: 'high',
 *   }, ctx, sovereigntyScore);
 *
 *   // Get pool statistics
 *   const stats = getPoolStats();
 */
export { AgentPool, subdivideTask, type TaskPriority, type TaskStatus, type AgentStatus, type SubTask, type AgentSlot, type AgentPoolConfig, } from './agent-pool.js';
export { getPoolManager, executeParallel, canExecuteParallel, getPoolStats, suggestParallelTasks, registerParallelTasksWithScheduler, type ParallelTaskRequest, type ParallelTaskResult, type PoolManager, } from './pool-integration.js';
//# sourceMappingURL=index.d.ts.map