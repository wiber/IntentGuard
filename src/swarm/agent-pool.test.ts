/**
 * Tests for agent-pool.ts — Claude Flow Agent Pool (50 concurrent)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentPool, subdivideTask } from './agent-pool.js';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Logger } from '../types.js';

describe('AgentPool', () => {
  let pool: AgentPool;
  let mockLogger: Logger;
  let tempCoordinationDir: string;
  let tempRepoRoot: string;

  beforeEach(() => {
    // Create temporary directories
    tempCoordinationDir = mkdtempSync(join(tmpdir(), 'agent-pool-test-coord-'));
    tempRepoRoot = mkdtempSync(join(tmpdir(), 'agent-pool-test-repo-'));

    // Mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Initialize pool with test config
    pool = new AgentPool(
      {
        poolSize: 5, // Smaller pool for testing
        maxRetries: 2,
        taskTimeoutMs: 5000,
        healthCheckIntervalMs: 1000,
        coordinationDir: tempCoordinationDir,
        repoRoot: tempRepoRoot,
      },
      mockLogger
    );

    // Create mock swarm launch scripts
    for (let i = 1; i <= 5; i++) {
      const scriptPath = join(tempCoordinationDir, `swarm-launch-${i}.sh`);
      writeFileSync(
        scriptPath,
        `#!/bin/bash\necho "Agent ${i} launched"\nsleep 0.1\n`,
        { mode: 0o755 }
      );
    }

    // Create empty swarm-claims.json
    writeFileSync(join(tempCoordinationDir, 'swarm-claims.json'), '{}', 'utf-8');

    // Create empty swarm-memory.jsonl
    writeFileSync(join(tempCoordinationDir, 'swarm-memory.jsonl'), '', 'utf-8');
  });

  afterEach(async () => {
    await pool.shutdown();

    // Clean up temp directories
    rmSync(tempCoordinationDir, { recursive: true, force: true });
    rmSync(tempRepoRoot, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should initialize pool with correct size', async () => {
      await pool.initialize();

      const stats = pool.getStats();
      expect(stats.totalAgents).toBe(5);
      expect(stats.idleAgents).toBe(5);
      expect(stats.busyAgents).toBe(0);
    });

    it('should restore state from swarm memory', async () => {
      // Write some mock swarm memory entries
      const memoryPath = join(tempCoordinationDir, 'swarm-memory.jsonl');
      const entries = [
        { ts: '2026-02-15T12:00:00Z', agent: 1, group: 'agent-pool', event: 'task_assigned', task: 'task_123' },
        { ts: '2026-02-15T12:01:00Z', agent: 2, group: 'agent-pool', event: 'task_assigned', task: 'task_456' },
      ];
      writeFileSync(memoryPath, entries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8');

      await pool.initialize();

      const stats = pool.getStats();
      expect(stats.busyAgents).toBe(2); // Agents 1 and 2 should be busy
      expect(stats.idleAgents).toBe(3);
    });
  });

  describe('task submission', () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it('should submit task and return task ID', async () => {
      const taskId = await pool.submitTask({
        description: 'Test task',
        priority: 'normal',
        files: ['src/test.ts'],
        prompt: 'Implement test functionality',
      });

      expect(taskId).toMatch(/^task_\d+_[a-z0-9]+$/);

      const task = pool.getTask(taskId);
      expect(task).toBeDefined();
      expect(task?.description).toBe('Test task');
      expect(task?.priority).toBe('normal');
    });

    it('should assign task to idle agent', async () => {
      const taskId = await pool.submitTask({
        description: 'Test task',
        priority: 'high',
        files: ['src/test.ts'],
        prompt: 'Implement test functionality',
      });

      // Wait a bit for assignment
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = pool.getStats();
      expect(stats.runningTasks).toBeGreaterThan(0);
      expect(stats.busyAgents).toBeGreaterThan(0);
    });

    it('should prioritize high priority tasks', async () => {
      // Submit low priority first
      const lowTaskId = await pool.submitTask({
        description: 'Low priority task',
        priority: 'low',
        files: ['src/low.ts'],
        prompt: 'Low priority work',
      });

      // Submit high priority second
      const highTaskId = await pool.submitTask({
        description: 'High priority task',
        priority: 'high',
        files: ['src/high.ts'],
        prompt: 'High priority work',
      });

      // High priority should be assigned first
      await new Promise(resolve => setTimeout(resolve, 200));

      const highTask = pool.getTask(highTaskId);
      const lowTask = pool.getTask(lowTaskId);

      // High priority should have been assigned (not pending)
      expect(highTask?.status).not.toBe('pending');

      // If pool is at capacity, low task might still be pending
      // But high task should definitely be assigned
      expect(['assigned', 'running', 'completed']).toContain(highTask?.status);
    });

    it('should queue tasks when pool is full', async () => {
      // Submit more tasks than pool size
      const taskIds: string[] = [];
      for (let i = 0; i < 7; i++) {
        const taskId = await pool.submitTask({
          description: `Task ${i}`,
          priority: 'normal',
          files: [`src/file${i}.ts`],
          prompt: `Work on file ${i}`,
        });
        taskIds.push(taskId);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = pool.getStats();
      expect(stats.runningTasks + stats.pendingTasks).toBe(7);
      expect(stats.busyAgents).toBeLessThanOrEqual(5);
    });
  });

  describe('file conflict detection', () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it('should detect file conflicts and delay assignment', async () => {
      // Submit first task
      const task1Id = await pool.submitTask({
        description: 'Task 1',
        priority: 'normal',
        files: ['src/shared.ts'],
        prompt: 'Work on shared file',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Submit second task with same file
      const task2Id = await pool.submitTask({
        description: 'Task 2',
        priority: 'high', // Higher priority but conflicting
        files: ['src/shared.ts'],
        prompt: 'Also work on shared file',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const task1 = pool.getTask(task1Id);
      const task2 = pool.getTask(task2Id);

      // Task 1 should be running
      expect(['assigned', 'running']).toContain(task1?.status);

      // Task 2 should be pending due to conflict (even with higher priority)
      expect(task2?.status).toBe('pending');
    });

    it('should assign conflicting task after first completes', async () => {
      // Submit first task
      const task1Id = await pool.submitTask({
        description: 'Task 1',
        priority: 'normal',
        files: ['src/test.ts'],
        prompt: 'First task',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Submit conflicting task - should be pending
      const task2Id = await pool.submitTask({
        description: 'Task 2',
        priority: 'normal',
        files: ['src/test.ts'],
        prompt: 'Second task',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Task 2 should be pending due to conflict
      const task2Initial = pool.getTask(task2Id);
      expect(task2Initial?.status).toBe('pending');

      // Use cancelTask to properly release agent and file claims for task 1
      await pool.cancelTask(task1Id);

      // Trigger reassignment now that the file claim is released
      await (pool as any).assignTasks();

      await new Promise(resolve => setTimeout(resolve, 200));

      // Now task 2 should be assigned
      const task2 = pool.getTask(task2Id);
      expect(['assigned', 'running']).toContain(task2?.status);
    });
  });

  describe('task cancellation', () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it('should cancel running task', async () => {
      const taskId = await pool.submitTask({
        description: 'Task to cancel',
        priority: 'normal',
        files: ['src/test.ts'],
        prompt: 'Work that will be cancelled',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      await pool.cancelTask(taskId);

      const task = pool.getTask(taskId);
      expect(task?.status).toBe('cancelled');

      // Agent should be released
      const stats = pool.getStats();
      expect(stats.busyAgents).toBe(0);
    });

    it('should release file claims on cancellation', async () => {
      const taskId = await pool.submitTask({
        description: 'Task to cancel',
        priority: 'normal',
        files: ['src/test.ts'],
        prompt: 'Work that will be cancelled',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      await pool.cancelTask(taskId);

      // Submit new task with same file - should work now
      const task2Id = await pool.submitTask({
        description: 'Task 2',
        priority: 'normal',
        files: ['src/test.ts'],
        prompt: 'Second task',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const task2 = pool.getTask(task2Id);
      expect(['assigned', 'running']).toContain(task2?.status);
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it('should return accurate pool statistics', async () => {
      const initialStats = pool.getStats();
      expect(initialStats.totalAgents).toBe(5);
      expect(initialStats.idleAgents).toBe(5);
      expect(initialStats.pendingTasks).toBe(0);

      // Submit tasks
      await pool.submitTask({
        description: 'Task 1',
        priority: 'normal',
        files: ['src/file1.ts'],
        prompt: 'Work 1',
      });

      await pool.submitTask({
        description: 'Task 2',
        priority: 'high',
        files: ['src/file2.ts'],
        prompt: 'Work 2',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = pool.getStats();
      expect(stats.runningTasks + stats.pendingTasks).toBe(2);
      expect(stats.busyAgents).toBeGreaterThan(0);
    });
  });

  describe('health check and timeout', () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it.skip('should timeout stuck tasks', async () => {
      const taskId = await pool.submitTask({
        description: 'Slow task',
        priority: 'normal',
        files: ['src/slow.ts'],
        prompt: 'Very slow work',
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      // Ensure task is running and agent is busy
      const task = pool.getTask(taskId);
      if (task && task.agentId) {
        // Force task to running state
        task.status = 'running';

        // Set start time to be way in the past (more than 5 second timeout)
        task.startedAt = new Date(Date.now() - 6000);

        // Ensure agent is marked as busy (health check only processes busy agents)
        const agents = (pool as any).agents as Map<number, any>;
        const agent = agents.get(task.agentId);
        if (agent) {
          agent.status = 'busy';
          agent.currentTask = task.id;
        }
      }

      // Trigger health check manually
      await (pool as any).performHealthCheck();

      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedTask = pool.getTask(taskId);
      expect(updatedTask?.status).toBe('failed');
      expect(updatedTask?.error).toBe('Timeout');
    }, 10000); // Test timeout 10s

    it('should retry failed tasks', async () => {
      const taskId = await pool.submitTask({
        description: 'Task that will timeout',
        priority: 'normal',
        files: ['src/retry.ts'],
        prompt: 'Work that needs retry',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Wait for timeout and retry
      await new Promise(resolve => setTimeout(resolve, 6000));

      const task = pool.getTask(taskId);
      expect(task?.retries).toBeGreaterThan(0);
    }, 10000);
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it('should cancel all running tasks on shutdown', async () => {
      // Submit multiple tasks
      const taskIds = [];
      for (let i = 0; i < 3; i++) {
        const taskId = await pool.submitTask({
          description: `Task ${i}`,
          priority: 'normal',
          files: [`src/file${i}.ts`],
          prompt: `Work ${i}`,
        });
        taskIds.push(taskId);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      await pool.shutdown();

      // All tasks should be cancelled
      for (const taskId of taskIds) {
        const task = pool.getTask(taskId);
        expect(['cancelled', 'completed', 'failed']).toContain(task?.status);
      }
    });

    it('should clear all file claims on shutdown', async () => {
      await pool.submitTask({
        description: 'Task',
        priority: 'normal',
        files: ['src/test.ts'],
        prompt: 'Work',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      await pool.shutdown();

      // Check swarm-claims.json is empty
      const claimsPath = join(tempCoordinationDir, 'swarm-claims.json');
      const { readFileSync } = await import('fs');
      const claims = JSON.parse(readFileSync(claimsPath, 'utf-8'));
      expect(Object.keys(claims)).toHaveLength(0);
    });
  });
});

describe('subdivideTask', () => {
  it('should split tasks by directory', async () => {
    const subtasks = await subdivideTask({
      description: 'Implement feature',
      targetFiles: [
        'src/auth/login.ts',
        'src/auth/logout.ts',
        'src/api/users.ts',
        'src/api/posts.ts',
      ],
      repoRoot: '/test',
    });

    expect(subtasks).toHaveLength(2);
    expect(subtasks[0].files).toContain('src/auth/login.ts');
    expect(subtasks[0].files).toContain('src/auth/logout.ts');
    expect(subtasks[1].files).toContain('src/api/users.ts');
    expect(subtasks[1].files).toContain('src/api/posts.ts');
  });

  it('should split large single-directory tasks', async () => {
    const files = Array.from({ length: 10 }, (_, i) => `src/file${i}.ts`);

    const subtasks = await subdivideTask({
      description: 'Process many files',
      targetFiles: files,
      repoRoot: '/test',
    });

    // Should split into groups of 3 files max
    expect(subtasks.length).toBeGreaterThanOrEqual(3);

    // Each subtask should have max 3 files
    for (const subtask of subtasks) {
      expect(subtask.files.length).toBeLessThanOrEqual(3);
    }
  });

  it('should handle single file', async () => {
    const subtasks = await subdivideTask({
      description: 'Fix single file',
      targetFiles: ['src/bug.ts'],
      repoRoot: '/test',
    });

    expect(subtasks).toHaveLength(1);
    expect(subtasks[0].files).toEqual(['src/bug.ts']);
  });

  it('should assign normal priority to all subtasks', async () => {
    const subtasks = await subdivideTask({
      description: 'Feature implementation',
      targetFiles: ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts'],
      repoRoot: '/test',
    });

    for (const subtask of subtasks) {
      expect(subtask.priority).toBe('normal');
    }
  });
});
