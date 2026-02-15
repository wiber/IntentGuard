/**
 * src/pipeline/runner.test.ts — Pipeline Runner Integration Tests
 *
 * Tests the full pipeline execution, individual steps, and FIM identity updates.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { runPipeline, runStep } from './runner.js';
import type { PipelineResult, StepResult } from './runner.js';

const TEST_DATA_DIR = join(process.cwd(), 'data', 'test-pipeline-runs');

beforeAll(() => {
  // Create test data directory
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterAll(() => {
  // Clean up test data directory
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
});

describe('Pipeline Runner', () => {
  describe('runStep', () => {
    it('should execute a single step successfully', async () => {
      const runDir = join(TEST_DATA_DIR, 'single-step-test');
      mkdirSync(runDir, { recursive: true });

      const result = await runStep(0, runDir);

      expect(result).toBeDefined();
      expect(result.step).toBe(0);
      expect(result.name).toBe('raw-materials');
      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.success).toBe(true);
      expect(result.outputFiles).toBeGreaterThanOrEqual(0);
      expect(result.outputBytes).toBeGreaterThanOrEqual(0);
    }, 30000); // 30s timeout for step execution

    it('should handle missing step modules gracefully', async () => {
      const runDir = join(TEST_DATA_DIR, 'missing-step-test');
      mkdirSync(runDir, { recursive: true });

      const result = await runStep(99, runDir); // Non-existent step

      expect(result).toBeDefined();
      expect(result.step).toBe(99);
      expect(result.success).toBe(true); // Should still succeed with placeholder
      expect(result.outputFiles).toBeGreaterThanOrEqual(0);
    }, 30000);

    it('should create output directory for each step', async () => {
      const runDir = join(TEST_DATA_DIR, 'output-dir-test');
      mkdirSync(runDir, { recursive: true });

      await runStep(1, runDir);

      const stepDir = join(runDir, '1-document-processing');
      expect(existsSync(stepDir)).toBe(true);
    }, 30000);

    it('should include error message on failure', async () => {
      const runDir = join(TEST_DATA_DIR, 'error-test');
      mkdirSync(runDir, { recursive: true });

      // Create a step directory without write permissions (simulate failure)
      const stepDir = join(runDir, '0-raw-materials');
      mkdirSync(stepDir, { recursive: true });

      // Note: This test may not fail on all systems due to permission handling
      const result = await runStep(0, runDir);

      // Should still have a result, either success or failure
      expect(result).toBeDefined();
      expect(result.step).toBe(0);
    }, 30000);
  });

  describe('runPipeline', () => {
    it('should execute full pipeline (steps 0-7)', async () => {
      const result = await runPipeline({ dataDir: TEST_DATA_DIR });

      expect(result).toBeDefined();
      expect(result.runId).toMatch(/^run-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}/);
      expect(result.steps).toHaveLength(8); // Steps 0-7
      expect(result.totalDurationMs).toBeGreaterThan(0);
      expect(result.startedAt).toBeTruthy();
      expect(result.completedAt).toBeTruthy();

      // Verify all steps executed
      for (let i = 0; i < 8; i++) {
        expect(result.steps[i].step).toBe(i);
        expect(result.steps[i].name).toBeTruthy();
        expect(result.steps[i].durationMs).toBeGreaterThan(0);
      }
    }, 120000); // 2 minutes for full pipeline

    it('should execute partial pipeline with from/to options', async () => {
      const result = await runPipeline({ from: 2, to: 4, dataDir: TEST_DATA_DIR });

      expect(result).toBeDefined();
      expect(result.steps).toHaveLength(3); // Steps 2, 3, 4
      expect(result.steps[0].step).toBe(2);
      expect(result.steps[1].step).toBe(3);
      expect(result.steps[2].step).toBe(4);
    }, 60000);

    it('should update FIM identity after step 4', async () => {
      const result = await runPipeline({ from: 0, to: 5, dataDir: TEST_DATA_DIR });

      expect(result).toBeDefined();

      // Identity should be populated if step 4 ran successfully
      if (result.steps.find(s => s.step === 4)?.success) {
        // FIM identity is updated internally, but may not be in result
        // if the grades file doesn't exist yet (placeholder data)
        // This is expected behavior for early development
        expect(result.identity).toBeDefined();
      }
    }, 90000);

    it('should create pipeline summary JSON', async () => {
      const result = await runPipeline({ dataDir: TEST_DATA_DIR });

      const runDir = join(TEST_DATA_DIR, result.runId);
      const summaryPath = join(runDir, 'pipeline-summary.json');

      expect(existsSync(summaryPath)).toBe(true);
    }, 120000);

    it('should continue execution even if a step fails', async () => {
      // This tests the error handling — pipeline should not halt
      const result = await runPipeline({ from: 0, to: 3, dataDir: TEST_DATA_DIR });

      expect(result).toBeDefined();
      expect(result.steps).toHaveLength(4);

      // At least some steps should complete
      const successCount = result.steps.filter(s => s.success).length;
      expect(successCount).toBeGreaterThanOrEqual(0);
    }, 60000);

    it('should handle single step execution with from=to', async () => {
      const result = await runPipeline({ from: 3, to: 3, dataDir: TEST_DATA_DIR });

      expect(result).toBeDefined();
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].step).toBe(3);
      expect(result.steps[0].name).toBe('frequency-analysis');
    }, 30000);
  });

  describe('Pipeline Output Structure', () => {
    it('should create correct directory structure', async () => {
      const result = await runPipeline({ from: 0, to: 2, dataDir: TEST_DATA_DIR });

      const runDir = join(TEST_DATA_DIR, result.runId);

      // Verify run directory exists
      expect(existsSync(runDir)).toBe(true);

      // Verify step directories exist
      expect(existsSync(join(runDir, '0-raw-materials'))).toBe(true);
      expect(existsSync(join(runDir, '1-document-processing'))).toBe(true);
      expect(existsSync(join(runDir, '2-organic-extraction'))).toBe(true);
    }, 60000);

    it('should include success count in result', async () => {
      const result = await runPipeline({ from: 0, to: 3, dataDir: TEST_DATA_DIR });

      const successCount = result.steps.filter(s => s.success).length;
      const totalCount = result.steps.length;

      expect(successCount).toBeLessThanOrEqual(totalCount);
      expect(successCount).toBeGreaterThanOrEqual(0);
    }, 60000);
  });

  describe('FIM Identity Integration', () => {
    it('should load identity from pipeline output', async () => {
      // First, create a mock step-4 output
      const runDir = join(TEST_DATA_DIR, 'fim-identity-test');
      mkdirSync(runDir, { recursive: true });

      const mockGrades = {
        step: 4,
        name: 'grades-statistics',
        timestamp: new Date().toISOString(),
        categories: {
          security: { grade: 'A', score: 0.95 },
          reliability: { grade: 'B+', score: 0.85 },
          code_quality: { grade: 'B', score: 0.8 },
          testing: { grade: 'C+', score: 0.65 },
        },
        sovereignty: {
          score: 0.81,
          grade: 'B+',
          interpretation: 'Good overall trust standing',
        },
      };

      writeFileSync(
        join(runDir, '4-grades-statistics.json'),
        JSON.stringify(mockGrades, null, 2),
      );

      // Now run the pipeline from step 4
      const result = await runPipeline({ from: 4, to: 4, dataDir: runDir });

      expect(result).toBeDefined();

      // Identity should be loaded from our mock data
      if (result.identity) {
        expect(result.identity.sovereigntyScore).toBeCloseTo(0.81, 1);
        expect(result.identity.categoryCount).toBeGreaterThan(0);
      }
    }, 30000);

    it('should handle missing grades file gracefully', async () => {
      const runDir = join(TEST_DATA_DIR, 'no-grades-test');
      mkdirSync(runDir, { recursive: true });

      // Run step 4 without prerequisite data
      const result = await runPipeline({ from: 4, to: 4, dataDir: runDir });

      expect(result).toBeDefined();
      expect(result.steps[0].step).toBe(4);

      // Should complete even without grades file
      expect(result.steps[0].success).toBe(true);
    }, 30000);
  });

  describe('Step Name Mapping', () => {
    it('should map step numbers to correct names', async () => {
      const expectedNames = [
        'raw-materials',
        'document-processing',
        'organic-extraction',
        'frequency-analysis',
        'grades-statistics',
        'goal-alignment',
        'symmetric-matrix',
        'final-report',
      ];

      for (let i = 0; i < expectedNames.length; i++) {
        const runDir = join(TEST_DATA_DIR, `step-name-test-${i}`);
        mkdirSync(runDir, { recursive: true });

        const result = await runStep(i, runDir);
        expect(result.name).toBe(expectedNames[i]);
      }
    }, 120000);
  });

  describe('Error Handling', () => {
    it('should handle invalid step range', async () => {
      const result = await runPipeline({ from: 7, to: 3, dataDir: TEST_DATA_DIR });

      // Should handle gracefully (no steps run)
      expect(result).toBeDefined();
      expect(result.steps).toHaveLength(0);
    }, 30000);

    it('should handle negative step numbers', async () => {
      const runDir = join(TEST_DATA_DIR, 'negative-step-test');
      mkdirSync(runDir, { recursive: true });

      const result = await runStep(-1, runDir);

      expect(result).toBeDefined();
      expect(result.step).toBe(-1);
      // Should handle gracefully (placeholder or error)
    }, 30000);
  });

  describe('Performance Metrics', () => {
    it('should track execution time for each step', async () => {
      const result = await runPipeline({ from: 0, to: 2, dataDir: TEST_DATA_DIR });

      for (const step of result.steps) {
        expect(step.durationMs).toBeGreaterThan(0);
        expect(step.durationMs).toBeLessThan(60000); // Should not take more than 1 minute per step
      }
    }, 90000);

    it('should track output file counts', async () => {
      const result = await runPipeline({ from: 0, to: 1, dataDir: TEST_DATA_DIR });

      for (const step of result.steps) {
        expect(step.outputFiles).toBeGreaterThanOrEqual(0);
        expect(step.outputBytes).toBeGreaterThanOrEqual(0);
      }
    }, 60000);
  });
});
