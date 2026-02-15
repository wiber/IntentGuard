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
// Core agent pool
export { AgentPool, subdivideTask, } from './agent-pool.js';
// Integration layer
export { getPoolManager, executeParallel, canExecuteParallel, getPoolStats, suggestParallelTasks, registerParallelTasksWithScheduler, } from './pool-integration.js';
//# sourceMappingURL=index.js.map