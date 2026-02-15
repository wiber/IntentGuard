/**
 * Integration tests for pool-integration.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getPoolManager,
  canExecuteParallel,
  type ParallelTaskRequest,
} from './pool-integration.js';
import type { SkillContext } from '../types.js';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Pool Integration', () => {
  let mockContext: SkillContext;
  let tempCoordinationDir: string;
  let tempRepoRoot: string;

  beforeEach(() => {
    // Create temporary directories
    tempCoordinationDir = mkdtempSync(join(tmpdir(), 'pool-integration-test-'));
    tempRepoRoot = mkdtempSync(join(tmpdir(), 'pool-integration-repo-'));

    // Mock SkillContext
    mockContext = {
      log: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      config: {
        get: (key: string) => {
          if (key === 'integrations.agentPool.coordinationDir') return tempCoordinationDir;
          if (key === 'integrations.agentPool.poolSize') return 5;
          if (key === 'integrations.agentPool.maxRetries') return 2;
          if (key === 'integrations.agentPool.taskTimeoutMs') return 5000;
          return undefined;
        },
      },
    } as any;

    // Create mock swarm launch scripts
    for (let i = 1; i <= 5; i++) {
      const scriptPath = join(tempCoordinationDir, `swarm-launch-${i}.sh`);
      writeFileSync(scriptPath, `#!/bin/bash\necho "Agent ${i}"\n`, { mode: 0o755 });
    }

    // Create empty coordination files
    writeFileSync(join(tempCoordinationDir, 'swarm-claims.json'), '{}', 'utf-8');
    writeFileSync(join(tempCoordinationDir, 'swarm-memory.jsonl'), '', 'utf-8');
  });

  afterEach(async () => {
    try {
      await getPoolManager().shutdown();
    } catch (error) {
      // Ignore shutdown errors in tests
    }

    // Clean up temp directories
    try {
      rmSync(tempCoordinationDir, { recursive: true, force: true });
      rmSync(tempRepoRoot, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('getPoolManager', () => {
    it('should return singleton pool manager', () => {
      const manager1 = getPoolManager();
      const manager2 = getPoolManager();

      expect(manager1).toBe(manager2);
    });

    it('should initialize pool manager', async () => {
      const manager = getPoolManager();
      expect(manager.isInitialized()).toBe(false);

      await manager.initialize(mockContext);
      expect(manager.isInitialized()).toBe(true);
    });

    it('should handle multiple initialize calls', async () => {
      const manager = getPoolManager();

      await manager.initialize(mockContext);
      await manager.initialize(mockContext); // Should be idempotent

      expect(manager.isInitialized()).toBe(true);
    });
  });

  describe('canExecuteParallel', () => {
    it('should reject when pool not available', () => {
      const result = canExecuteParallel('implement', 0.9, false);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('pool not available');
    });

    it('should reject when sovereignty too low', () => {
      const result = canExecuteParallel('implement', 0.5, true);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('sovereignty');
    });

    it('should allow safe operations with lower sovereignty', () => {
      const analyzeResult = canExecuteParallel('analyze', 0.5, true);
      expect(analyzeResult.allowed).toBe(true);

      const testResult = canExecuteParallel('test', 0.6, true);
      expect(testResult.allowed).toBe(true);

      const documentResult = canExecuteParallel('document', 0.6, true);
      expect(documentResult.allowed).toBe(true);
    });

    it('should require high sovereignty for code modification', () => {
      const implementLow = canExecuteParallel('implement', 0.7, true);
      expect(implementLow.allowed).toBe(false);

      const implementHigh = canExecuteParallel('implement', 0.8, true);
      expect(implementHigh.allowed).toBe(true);
    });

    it('should require very high sovereignty for refactoring', () => {
      const refactorMed = canExecuteParallel('refactor', 0.8, true);
      expect(refactorMed.allowed).toBe(false);

      const refactorHigh = canExecuteParallel('refactor', 0.9, true);
      expect(refactorHigh.allowed).toBe(true);
    });
  });

  describe('sovereignty requirements', () => {
    const operations: Array<{ op: ParallelTaskRequest['operation']; min: number }> = [
      { op: 'analyze', min: 0.5 },
      { op: 'test', min: 0.6 },
      { op: 'document', min: 0.6 },
      { op: 'implement', min: 0.8 },
      { op: 'refactor', min: 0.9 },
    ];

    it.each(operations)('should enforce sovereignty threshold for $op', ({ op, min }) => {
      // Just below threshold
      const below = canExecuteParallel(op, min - 0.01, true);
      expect(below.allowed).toBe(false);

      // At threshold
      const at = canExecuteParallel(op, min, true);
      expect(at.allowed).toBe(true);

      // Above threshold
      const above = canExecuteParallel(op, min + 0.1, true);
      expect(above.allowed).toBe(true);
    });
  });
});
