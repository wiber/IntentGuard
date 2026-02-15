/**
 * src/pipeline/step-2.test.ts — Tests for Category Generator & Orthogonality Validator
 *
 * Tests Agent 2 functionality:
 * - 20-category generation
 * - Orthogonality validation (target: <1% correlation)
 * - Balance distribution (Gini coefficient)
 * - Trust debt unit distribution
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { run } from './step-2.js';

const TEST_RUN_DIR = '/tmp/intentguard-test-step2';
const STEP_1_DIR = join(TEST_RUN_DIR, '1-document-processing');
const STEP_2_DIR = join(TEST_RUN_DIR, '2-categories-balanced');

describe('Agent 2: Category Generator & Orthogonality Validator', () => {
  beforeEach(() => {
    // Clean up
    if (existsSync(TEST_RUN_DIR)) {
      rmSync(TEST_RUN_DIR, { recursive: true, force: true });
    }

    // Create test directories
    mkdirSync(STEP_1_DIR, { recursive: true });
    mkdirSync(STEP_2_DIR, { recursive: true });

    // Create mock step-1 output
    const mockStep1 = {
      step: 1,
      name: 'document-processing',
      timestamp: new Date().toISOString(),
      documents: [
        {
          id: 'doc1',
          type: 'README',
          title: 'Project README',
          wordCount: 500,
          normalizedContent: 'security authentication encryption testing documentation process workflow',
        },
        {
          id: 'doc2',
          type: 'CODE',
          title: 'main.ts',
          wordCount: 300,
          normalizedContent: 'refactor clean code quality performance optimize reliable uptime',
        },
      ],
      totalTrustDebtUnits: 10000,
      stats: {
        documentsProcessed: 2,
        totalWords: 800,
      },
    };

    writeFileSync(
      join(STEP_1_DIR, '1-document-processing.json'),
      JSON.stringify(mockStep1, null, 2),
    );
  });

  it('should generate exactly 20 categories', async () => {
    await run(TEST_RUN_DIR, STEP_2_DIR);

    const outputPath = join(STEP_2_DIR, '2-categories-balanced.json');
    expect(existsSync(outputPath)).toBe(true);

    const result = JSON.parse(require('fs').readFileSync(outputPath, 'utf-8'));
    expect(result.categories).toHaveLength(20);
    expect(result.stats.totalCategories).toBe(20);
  });

  it('should include required category properties', async () => {
    await run(TEST_RUN_DIR, STEP_2_DIR);

    const outputPath = join(STEP_2_DIR, '2-categories-balanced.json');
    const result = JSON.parse(require('fs').readFileSync(outputPath, 'utf-8'));

    const category = result.categories[0];
    expect(category).toHaveProperty('id');
    expect(category).toHaveProperty('name');
    expect(category).toHaveProperty('description');
    expect(category).toHaveProperty('keywords');
    expect(category).toHaveProperty('weight');
    expect(category).toHaveProperty('trustDebtUnits');
    expect(category).toHaveProperty('percentage');
    expect(category).toHaveProperty('color');

    expect(Array.isArray(category.keywords)).toBe(true);
    expect(category.keywords.length).toBeGreaterThan(0);
  });

  it('should validate orthogonality and provide metrics', async () => {
    await run(TEST_RUN_DIR, STEP_2_DIR);

    const outputPath = join(STEP_2_DIR, '2-categories-balanced.json');
    const result = JSON.parse(require('fs').readFileSync(outputPath, 'utf-8'));

    expect(result.orthogonality).toBeDefined();
    expect(result.orthogonality.score).toBeGreaterThanOrEqual(0);
    expect(result.orthogonality.score).toBeLessThanOrEqual(1);
    expect(result.orthogonality.correlationMatrix).toBeDefined();
    expect(result.orthogonality.correlationMatrix).toHaveLength(20);
    expect(result.orthogonality.correlationMatrix[0]).toHaveLength(20);
    expect(result.orthogonality).toHaveProperty('passed');
    expect(typeof result.orthogonality.passed).toBe('boolean');
  });

  it('should calculate balance metrics', async () => {
    await run(TEST_RUN_DIR, STEP_2_DIR);

    const outputPath = join(STEP_2_DIR, '2-categories-balanced.json');
    const result = JSON.parse(require('fs').readFileSync(outputPath, 'utf-8'));

    expect(result.balance).toBeDefined();
    expect(result.balance.giniCoefficient).toBeGreaterThanOrEqual(0);
    expect(result.balance.giniCoefficient).toBeLessThanOrEqual(1);
    expect(result.balance.minPercentage).toBeGreaterThan(0);
    expect(result.balance.maxPercentage).toBeLessThanOrEqual(100);
    expect(result.balance.stdDeviation).toBeGreaterThanOrEqual(0);
    expect(result.balance).toHaveProperty('balanced');
    expect(typeof result.balance.balanced).toBe('boolean');
  });

  it('should distribute trust debt units correctly', async () => {
    await run(TEST_RUN_DIR, STEP_2_DIR);

    const outputPath = join(STEP_2_DIR, '2-categories-balanced.json');
    const result = JSON.parse(require('fs').readFileSync(outputPath, 'utf-8'));

    const totalUnits = result.categories.reduce(
      (sum: number, cat: any) => sum + cat.trustDebtUnits,
      0,
    );

    // Should match input (10000 units)
    expect(totalUnits).toBe(10000);

    // Each category should have > 0 units
    result.categories.forEach((cat: any) => {
      expect(cat.trustDebtUnits).toBeGreaterThan(0);
      expect(cat.percentage).toBeGreaterThan(0);
    });

    // Percentages should sum to 100
    const totalPercentage = result.categories.reduce(
      (sum: number, cat: any) => sum + cat.percentage,
      0,
    );
    expect(Math.abs(totalPercentage - 100)).toBeLessThan(0.1); // Allow rounding error
  });

  it('should produce valid correlation matrix', async () => {
    await run(TEST_RUN_DIR, STEP_2_DIR);

    const outputPath = join(STEP_2_DIR, '2-categories-balanced.json');
    const result = JSON.parse(require('fs').readFileSync(outputPath, 'utf-8'));

    const matrix = result.orthogonality.correlationMatrix;

    // Diagonal should be 1.0 (self-correlation)
    for (let i = 0; i < 20; i++) {
      expect(matrix[i][i]).toBe(1.0);
    }

    // Off-diagonal should be 0-1 (Jaccard similarity)
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        if (i !== j) {
          expect(matrix[i][j]).toBeGreaterThanOrEqual(0);
          expect(matrix[i][j]).toBeLessThanOrEqual(1);
        }
      }
    }

    // Matrix should be symmetric (Jaccard is symmetric)
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        expect(Math.abs(matrix[i][j] - matrix[j][i])).toBeLessThan(0.001);
      }
    }
  });

  it('should have low average correlation for orthogonality', async () => {
    await run(TEST_RUN_DIR, STEP_2_DIR);

    const outputPath = join(STEP_2_DIR, '2-categories-balanced.json');
    const result = JSON.parse(require('fs').readFileSync(outputPath, 'utf-8'));

    // With well-designed categories, correlation should be low
    // Target: <1% (0.01) for true orthogonality
    // Realistic: <5% (0.05) for semantic separation
    expect(result.orthogonality.avgCorrelation).toBeLessThan(0.05);
  });

  it('should include all 20 standard trust-debt categories', async () => {
    await run(TEST_RUN_DIR, STEP_2_DIR);

    const outputPath = join(STEP_2_DIR, '2-categories-balanced.json');
    const result = JSON.parse(require('fs').readFileSync(outputPath, 'utf-8'));

    const expectedCategories = [
      'security',
      'reliability',
      'data_integrity',
      'process_adherence',
      'code_quality',
      'testing',
      'documentation',
      'communication',
      'time_management',
      'resource_efficiency',
      'risk_assessment',
      'compliance',
      'innovation',
      'collaboration',
      'accountability',
      'transparency',
      'adaptability',
      'domain_expertise',
      'user_focus',
      'ethical_alignment',
    ];

    const actualIds = result.categories.map((cat: any) => cat.id);
    expectedCategories.forEach(expected => {
      expect(actualIds).toContain(expected);
    });
  });

  it('should assign colors to all categories', async () => {
    await run(TEST_RUN_DIR, STEP_2_DIR);

    const outputPath = join(STEP_2_DIR, '2-categories-balanced.json');
    const result = JSON.parse(require('fs').readFileSync(outputPath, 'utf-8'));

    result.categories.forEach((cat: any) => {
      expect(cat.color).toBeDefined();
      expect(cat.color).toMatch(/^#[0-9a-f]{6}$/i); // Valid hex color
    });
  });

  it('should provide comprehensive stats', async () => {
    await run(TEST_RUN_DIR, STEP_2_DIR);

    const outputPath = join(STEP_2_DIR, '2-categories-balanced.json');
    const result = JSON.parse(require('fs').readFileSync(outputPath, 'utf-8'));

    expect(result.stats.totalCategories).toBe(20);
    expect(result.stats.totalTrustDebtUnits).toBe(10000);
    expect(result.stats.totalKeywords).toBeGreaterThan(0);
    expect(result.stats.avgKeywordsPerCategory).toBeGreaterThan(0);
  });
});
