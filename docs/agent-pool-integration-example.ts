/**
 * docs/agent-pool-integration-example.ts
 *
 * Example showing how to integrate the Claude Flow Agent Pool (50 concurrent)
 * with the IntentGuard CEO loop for parallel task execution.
 *
 * This demonstrates the integration pattern for the autonomous builder agent.
 */

import {
  getPoolManager,
  executeParallel,
  canExecuteParallel,
  getPoolStats,
  suggestParallelTasks,
  type ParallelTaskRequest,
} from '../src/swarm/index.js';
import type { SkillContext } from '../src/types.js';

// ═══════════════════════════════════════════════════════════════
// CEO Loop Integration Example
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize the agent pool during CEO loop startup
 */
export async function initializeAgentPool(ctx: SkillContext): Promise<void> {
  ctx.log.info('🚀 Initializing Claude Flow Agent Pool (50 concurrent)...');

  const poolManager = getPoolManager();
  await poolManager.initialize(ctx);

  const stats = getPoolStats();
  ctx.log.info(
    `✅ Agent pool ready: ${stats?.totalAgents} agents (${stats?.idleAgents} idle)`
  );
}

/**
 * Shutdown the agent pool gracefully
 */
export async function shutdownAgentPool(ctx: SkillContext): Promise<void> {
  ctx.log.info('🛑 Shutting down agent pool...');

  const poolManager = getPoolManager();
  await poolManager.shutdown();

  ctx.log.info('✅ Agent pool shutdown complete');
}

/**
 * Example: Detect and execute parallel opportunities from migration spec
 */
export async function executeParallelFromSpec(
  ctx: SkillContext,
  sovereigntyScore: number
): Promise<void> {
  const specPath = 'intentguard-migration-spec.html';
  const repoRoot = process.cwd();

  // Find parallelizable tasks in spec
  const suggestions = await suggestParallelTasks(specPath, repoRoot);

  ctx.log.info(`📋 Found ${suggestions.length} parallel task opportunities`);

  for (const suggestion of suggestions) {
    // Check if we can execute this operation
    const check = canExecuteParallel(
      suggestion.operation,
      sovereigntyScore,
      getPoolManager().isInitialized()
    );

    if (!check.allowed) {
      ctx.log.warn(
        `⏭️  Skipping "${suggestion.description}": ${check.reason}`
      );
      continue;
    }

    ctx.log.info(
      `🚀 Executing parallel ${suggestion.operation}: ${suggestion.description}`
    );

    try {
      const result = await executeParallel(suggestion, ctx, sovereigntyScore);

      ctx.log.info(
        `✅ Parallel task completed: ${result.completedCount}/${result.subtasks.length} succeeded ` +
          `(${(result.totalDurationMs / 1000).toFixed(1)}s)`
      );

      if (result.failedCount > 0) {
        ctx.log.warn(`⚠️  ${result.failedCount} subtasks failed`);
      }
    } catch (error) {
      ctx.log.error(`❌ Parallel execution failed: ${error}`);
    }
  }
}

/**
 * Example: Manual parallel execution for a specific task
 */
export async function executeSpecificParallelTask(
  ctx: SkillContext,
  sovereigntyScore: number
): Promise<void> {
  const request: ParallelTaskRequest = {
    description: 'Implement authentication system',
    targetFiles: [
      'src/auth/login.ts',
      'src/auth/logout.ts',
      'src/auth/session.ts',
      'src/auth/middleware.ts',
      'src/auth/tokens.ts',
      'src/auth/validation.ts',
    ],
    operation: 'implement',
    priority: 'high',
    maxConcurrency: 6, // All 6 files in parallel
  };

  // Verify sovereignty requirement
  const check = canExecuteParallel(
    request.operation,
    sovereigntyScore,
    getPoolManager().isInitialized()
  );

  if (!check.allowed) {
    ctx.log.error(`❌ Cannot execute: ${check.reason}`);
    return;
  }

  ctx.log.info(`🚀 Starting parallel implementation (${request.targetFiles.length} files)`);

  const result = await executeParallel(request, ctx, sovereigntyScore);

  // Log detailed results
  for (const subtask of result.subtasks) {
    if (subtask.status === 'completed') {
      ctx.log.info(`  ✅ ${subtask.description}`);
    } else {
      ctx.log.error(`  ❌ ${subtask.description}: ${subtask.error}`);
    }
  }

  ctx.log.info(
    `\n📊 Results: ${result.completedCount}/${result.subtasks.length} succeeded ` +
      `in ${(result.totalDurationMs / 1000).toFixed(1)}s`
  );
}

/**
 * Example: Monitor pool health and utilization
 */
export function logPoolStatus(ctx: SkillContext): void {
  const stats = getPoolStats();

  if (!stats) {
    ctx.log.warn('⚠️  Agent pool not initialized');
    return;
  }

  const utilization = ((stats.busyAgents / stats.totalAgents) * 100).toFixed(1);

  ctx.log.info(`
📊 Agent Pool Status:
  Agents: ${stats.busyAgents}/${stats.totalAgents} busy (${utilization}% utilization)
  Failed: ${stats.failedAgents}

  Tasks: ${stats.runningTasks} running, ${stats.pendingTasks} pending
  Completed: ${stats.completedTasks} succeeded, ${stats.failedTasks} failed
`);
}

/**
 * Example: CEO loop decision logic for when to use parallel execution
 */
export async function shouldUseParallelExecution(
  task: {
    description: string;
    files: string[];
    operation: 'implement' | 'test' | 'document' | 'refactor' | 'analyze';
  },
  sovereigntyScore: number,
  ctx: SkillContext
): Promise<boolean> {
  // Criteria for parallel execution:
  // 1. Multiple files (at least 2)
  // 2. Agent pool is initialized
  // 3. Sovereignty requirement met
  // 4. Pool has available capacity

  if (task.files.length < 2) {
    ctx.log.debug('Task has < 2 files, using sequential execution');
    return false;
  }

  const check = canExecuteParallel(
    task.operation,
    sovereigntyScore,
    getPoolManager().isInitialized()
  );

  if (!check.allowed) {
    ctx.log.warn(`Cannot use parallel execution: ${check.reason}`);
    return false;
  }

  const stats = getPoolStats();
  if (!stats || stats.idleAgents < 2) {
    ctx.log.warn('Insufficient idle agents for parallel execution');
    return false;
  }

  ctx.log.info(
    `✅ Using parallel execution for "${task.description}" ` +
      `(${task.files.length} files, ${stats.idleAgents} agents available)`
  );

  return true;
}

/**
 * Example: Full CEO loop integration pattern
 */
export async function ceoLoopWithParallelExecution(
  ctx: SkillContext,
  sovereigntyScore: number
): Promise<void> {
  // 1. Initialize pool on startup
  await initializeAgentPool(ctx);

  // 2. Parse migration spec for TODO items
  const todoItems = await parseMigrationSpec('intentguard-migration-spec.html');

  for (const item of todoItems) {
    // 3. Decide: parallel or sequential?
    const useParallel = await shouldUseParallelExecution(item, sovereigntyScore, ctx);

    if (useParallel) {
      // 4. Execute via agent pool
      const result = await executeParallel(
        {
          description: item.description,
          targetFiles: item.files,
          operation: item.operation,
          priority: item.priority || 'normal',
        },
        ctx,
        sovereigntyScore
      );

      ctx.log.info(`Parallel task: ${result.completedCount}/${result.subtasks.length} succeeded`);
    } else {
      // 5. Execute sequentially (existing CEO loop logic)
      ctx.log.info(`Sequential execution for: ${item.description}`);
      // ... existing sequential implementation ...
    }

    // 6. Monitor pool health
    logPoolStatus(ctx);
  }

  // 7. Shutdown pool on completion
  await shutdownAgentPool(ctx);
}

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

interface TodoItem {
  description: string;
  files: string[];
  operation: 'implement' | 'test' | 'document' | 'refactor' | 'analyze';
  priority?: 'critical' | 'high' | 'normal' | 'low';
}

async function parseMigrationSpec(specPath: string): Promise<TodoItem[]> {
  // Placeholder: Parse spec and extract TODO items
  // In production, use cheerio or similar to parse HTML
  return [
    {
      description: 'Add Claude Flow agent pool',
      files: ['src/swarm/agent-pool.ts', 'src/swarm/pool-integration.ts'],
      operation: 'implement',
      priority: 'high',
    },
    // ... more items ...
  ];
}

// ═══════════════════════════════════════════════════════════════
// Usage Example in Main
// ═══════════════════════════════════════════════════════════════

/*
async function main() {
  const ctx: SkillContext = createSkillContext();
  const sovereigntyScore = await calculateSovereigntyScore();

  await ceoLoopWithParallelExecution(ctx, sovereigntyScore);
}

main().catch(console.error);
*/
