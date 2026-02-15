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

import { AgentPool, subdivideTask } from './agent-pool.js';
import type { Logger, SkillContext } from '../types.js';
import type { TaskPriority, SubTask } from './agent-pool.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// Pool Manager Singleton
// ═══════════════════════════════════════════════════════════════

class PoolManager {
  private pool?: AgentPool;
  private logger?: Logger;
  private initialized = false;

  async initialize(ctx: SkillContext): Promise<void> {
    if (this.initialized) return;

    this.logger = ctx.log;

    const coordinationDir = ctx.config.get('integrations.agentPool.coordinationDir') as string
      || join(process.cwd(), '../thetadrivencoach/openclaw/data/coordination');

    const poolSize = ctx.config.get('integrations.agentPool.poolSize') as number || 50;
    const maxRetries = ctx.config.get('integrations.agentPool.maxRetries') as number || 3;
    const taskTimeoutMs = ctx.config.get('integrations.agentPool.taskTimeoutMs') as number || 10 * 60 * 1000;

    this.pool = new AgentPool(
      {
        poolSize,
        maxRetries,
        taskTimeoutMs,
        healthCheckIntervalMs: 30 * 1000,
        coordinationDir,
        repoRoot: process.cwd(),
      },
      this.logger
    );

    await this.pool.initialize();
    this.initialized = true;

    this.logger.info(`Agent pool manager initialized (size=${poolSize})`);
  }

  async shutdown(): Promise<void> {
    if (this.pool) {
      await this.pool.shutdown();
      this.initialized = false;
    }
  }

  getPool(): AgentPool | undefined {
    return this.pool;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

const poolManager = new PoolManager();

/**
 * Get the global agent pool manager
 */
export function getPoolManager(): PoolManager {
  return poolManager;
}

// ═══════════════════════════════════════════════════════════════
// High-Level API
// ═══════════════════════════════════════════════════════════════

/**
 * Execute a task in parallel across the agent pool
 */
export async function executeParallel(
  request: ParallelTaskRequest,
  ctx: SkillContext,
  currentSovereignty: number
): Promise<ParallelTaskResult> {
  const pool = poolManager.getPool();
  if (!pool) {
    throw new Error('Agent pool not initialized. Call getPoolManager().initialize(ctx) first.');
  }

  // Check sovereignty requirements
  const requiredSovereignty = request.sovereigntyRequired || getSovereigntyRequirement(request.operation);
  if (currentSovereignty < requiredSovereignty) {
    throw new Error(
      `Insufficient sovereignty for parallel ${request.operation}. ` +
      `Required: ${requiredSovereignty}, Current: ${currentSovereignty}`
    );
  }

  ctx.log.info(
    `Starting parallel ${request.operation}: ${request.description} ` +
    `(${request.targetFiles.length} files, sovereignty=${currentSovereignty.toFixed(2)})`
  );

  const startTime = Date.now();

  // Subdivide the task
  const subtaskSpecs = await subdivideTask({
    description: request.description,
    targetFiles: request.targetFiles,
    repoRoot: process.cwd(),
  });

  ctx.log.info(`Task subdivided into ${subtaskSpecs.length} subtasks`);

  // Limit concurrency if specified
  const maxConcurrency = request.maxConcurrency || subtaskSpecs.length;
  const subtaskResults: SubTask[] = [];

  // Submit subtasks in batches
  for (let i = 0; i < subtaskSpecs.length; i += maxConcurrency) {
    const batch = subtaskSpecs.slice(i, i + maxConcurrency);
    const batchTaskIds: string[] = [];

    // Submit batch
    for (const spec of batch) {
      const prompt = generatePrompt(request.operation, spec.description, spec.files);
      const taskId = await pool.submitTask({
        description: spec.description,
        priority: request.priority || 'normal',
        files: spec.files,
        prompt,
      });
      batchTaskIds.push(taskId);
    }

    // Wait for batch to complete
    const batchResults = await Promise.allSettled(
      batchTaskIds.map(taskId => pool.waitForTask(taskId))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        subtaskResults.push(result.value);
      }
    }

    ctx.log.info(`Batch ${Math.floor(i / maxConcurrency) + 1} completed (${batchResults.length} tasks)`);
  }

  const totalDurationMs = Date.now() - startTime;
  const completedCount = subtaskResults.filter(t => t.status === 'completed').length;
  const failedCount = subtaskResults.filter(t => t.status === 'failed').length;

  const result: ParallelTaskResult = {
    taskId: `parallel_${Date.now()}`,
    subtasks: subtaskResults,
    allSucceeded: failedCount === 0 && completedCount === subtaskResults.length,
    completedCount,
    failedCount,
    totalDurationMs,
  };

  ctx.log.info(
    `Parallel ${request.operation} completed: ${completedCount}/${subtaskResults.length} succeeded ` +
    `(${(totalDurationMs / 1000).toFixed(1)}s)`
  );

  return result;
}

/**
 * Check if parallel execution is possible for a given operation
 */
export function canExecuteParallel(
  operation: ParallelTaskRequest['operation'],
  currentSovereignty: number,
  poolAvailable: boolean
): { allowed: boolean; reason?: string } {
  if (!poolAvailable) {
    return { allowed: false, reason: 'Agent pool not available' };
  }

  const requiredSovereignty = getSovereigntyRequirement(operation);
  if (currentSovereignty < requiredSovereignty) {
    return {
      allowed: false,
      reason: `Insufficient sovereignty (required: ${requiredSovereignty}, current: ${currentSovereignty.toFixed(2)})`,
    };
  }

  return { allowed: true };
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  const pool = poolManager.getPool();
  if (!pool) {
    return null;
  }

  return pool.getStats();
}

/**
 * Suggest parallel execution opportunities from a spec file
 */
export async function suggestParallelTasks(
  specPath: string,
  repoRoot: string
): Promise<ParallelTaskRequest[]> {
  if (!existsSync(specPath)) {
    return [];
  }

  const suggestions: ParallelTaskRequest[] = [];

  try {
    const specContent = readFileSync(specPath, 'utf-8');

    // Look for TODO/WIP items that mention multiple files
    const todoPattern = /check-(todo|wip).*?<li>(.*?)<\/li>/gis;
    const matches = Array.from(specContent.matchAll(todoPattern));

    for (const match of matches) {
      const description = match[2].replace(/<[^>]+>/g, '').trim();

      // Look for file patterns
      const filePattern = /src\/[a-zA-Z0-9/_.-]+\.ts/g;
      const files = Array.from(description.matchAll(filePattern)).map(m => m[0]);

      if (files.length > 1) {
        // Multiple files mentioned - good candidate for parallelization
        suggestions.push({
          description,
          targetFiles: files,
          operation: inferOperation(description),
          priority: 'normal',
        });
      }
    }
  } catch (error) {
    // Spec parsing failed, return empty
  }

  return suggestions;
}

// ═══════════════════════════════════════════════════════════════
// Private Helpers
// ═══════════════════════════════════════════════════════════════

function getSovereigntyRequirement(operation: ParallelTaskRequest['operation']): number {
  switch (operation) {
    case 'analyze':
      return 0.5; // Very safe
    case 'test':
      return 0.6; // Safe
    case 'document':
      return 0.6; // Safe
    case 'implement':
      return 0.8; // Code modification
    case 'refactor':
      return 0.9; // Dangerous
    default:
      return 0.8;
  }
}

function generatePrompt(
  operation: ParallelTaskRequest['operation'],
  description: string,
  files: string[]
): string {
  const fileList = files.map(f => `- ${f}`).join('\n');

  const operationInstructions = {
    implement: `Implement the following functionality in the specified files. Write clean, type-safe TypeScript code that follows existing patterns.`,
    test: `Write comprehensive unit tests for the specified files using Vitest. Ensure high code coverage and test edge cases.`,
    document: `Generate clear, comprehensive documentation for the specified files. Include JSDoc comments, usage examples, and architectural notes.`,
    refactor: `Refactor the specified files to improve code quality, maintainability, and performance. Preserve existing functionality.`,
    analyze: `Analyze the specified files for potential issues, improvements, and technical debt. Generate a detailed report.`,
  };

  return `
TASK: ${description}

OPERATION: ${operation}

${operationInstructions[operation]}

TARGET FILES:
${fileList}

CONSTRAINTS:
1. Only modify the specified files
2. Check file claims before starting work
3. Write completion summary to data/builder-logs/agent-{N}-done.marker
4. Do NOT commit changes - coordinator handles git operations
5. Run tests if applicable before marking complete

QUALITY REQUIREMENTS:
- Clean, readable code with proper type annotations
- Follow existing patterns in the codebase
- Add error handling where appropriate
- Write clear commit-ready code

When complete, write a summary to data/builder-logs/agent-{N}-done.marker with:
- What was implemented/changed
- Files modified
- Any issues encountered
- Next steps or blockers
`.trim();
}

function inferOperation(description: string): ParallelTaskRequest['operation'] {
  const lower = description.toLowerCase();

  if (lower.includes('test') || lower.includes('spec')) {
    return 'test';
  }

  if (lower.includes('document') || lower.includes('doc') || lower.includes('readme')) {
    return 'document';
  }

  if (lower.includes('refactor') || lower.includes('clean up')) {
    return 'refactor';
  }

  if (lower.includes('analyze') || lower.includes('review') || lower.includes('audit')) {
    return 'analyze';
  }

  // Default to implement
  return 'implement';
}

// ═══════════════════════════════════════════════════════════════
// Scheduler Integration
// ═══════════════════════════════════════════════════════════════

/**
 * Register parallel task opportunities with the proactive scheduler
 */
export async function registerParallelTasksWithScheduler(
  specPath: string,
  repoRoot: string,
  onTaskReady: (request: ParallelTaskRequest) => Promise<void>
): Promise<void> {
  const suggestions = await suggestParallelTasks(specPath, repoRoot);

  if (suggestions.length > 0) {
    console.log(`[AgentPool] Found ${suggestions.length} parallel task opportunities`);

    for (const suggestion of suggestions) {
      await onTaskReady(suggestion);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Export for Testing
// ═══════════════════════════════════════════════════════════════

export { PoolManager };
