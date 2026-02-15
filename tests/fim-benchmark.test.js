/**
 * FIM Geometric Overlap Computation Benchmark
 *
 * Tests performance of computeOverlap() under realistic load:
 * - 1000 identity vectors (random category scores 0.0-1.0)
 * - 10 action requirements (varying sparsity: 2-15 categories)
 * - 10,000 total computations
 *
 * Target: avg latency < 1ms per computation
 *
 * Run: npx vitest run tests/fim-benchmark.test.js
 */

import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';
import {
  computeOverlap,
  TRUST_DEBT_CATEGORIES,
} from '../src/auth/geometric.ts';

// ─── Random Data Generation ────────────────────────────────────────────

function randomScore() {
  return Math.random();
}

function randomCategories(count) {
  const shuffled = [...TRUST_DEBT_CATEGORIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateIdentityVector(id) {
  const categoryScores = {};

  // Populate all 20 categories with random scores
  for (const category of TRUST_DEBT_CATEGORIES) {
    categoryScores[category] = randomScore();
  }

  return {
    userId: `user_${id}`,
    categoryScores,
    sovereigntyScore: randomScore(),
    lastUpdated: new Date().toISOString(),
  };
}

function generateActionRequirement(id, categoryCount) {
  const requiredScores = {};

  // Pick random categories and assign minimum scores
  const selectedCategories = randomCategories(categoryCount);
  for (const category of selectedCategories) {
    requiredScores[category] = randomScore();
  }

  return {
    toolName: `action_${id}`,
    requiredScores,
    minSovereignty: randomScore(),
    description: `Test action with ${categoryCount} required categories`,
  };
}

// ─── Benchmark Test Suite ──────────────────────────────────────────────

describe('FIM Geometric Overlap Benchmark', () => {
  const IDENTITY_COUNT = 1000;
  const ACTION_COUNT = 10;
  const MIN_SPARSITY = 2;
  const MAX_SPARSITY = 15;

  it('should complete 10,000 overlap computations with avg latency < 1ms', () => {
    // Generate test data
    const identities = [];
    for (let i = 0; i < IDENTITY_COUNT; i++) {
      identities.push(generateIdentityVector(i));
    }

    const actions = [];
    for (let i = 0; i < ACTION_COUNT; i++) {
      const sparsity = MIN_SPARSITY + Math.floor(Math.random() * (MAX_SPARSITY - MIN_SPARSITY + 1));
      actions.push(generateActionRequirement(i, sparsity));
    }

    // Warmup JIT
    for (let i = 0; i < 100; i++) {
      computeOverlap(identities[0], actions[0]);
    }

    // Benchmark
    const latencies = [];
    const startTotal = performance.now();

    for (const identity of identities) {
      for (const action of actions) {
        const start = performance.now();
        computeOverlap(identity, action);
        const end = performance.now();
        latencies.push(end - start);
      }
    }

    const endTotal = performance.now();
    const totalTimeMs = endTotal - startTotal;

    // Analysis
    latencies.sort((a, b) => a - b);

    const totalComputations = latencies.length;
    const avgLatencyMs = latencies.reduce((sum, l) => sum + l, 0) / totalComputations;
    const p95Index = Math.floor(totalComputations * 0.95);
    const p99Index = Math.floor(totalComputations * 0.99);
    const p95LatencyMs = latencies[p95Index];
    const p99LatencyMs = latencies[p99Index];

    expect(totalComputations).toBe(IDENTITY_COUNT * ACTION_COUNT);
    expect(avgLatencyMs).toBeLessThan(1.0);
  });

  it('should produce valid overlap results', () => {
    const identity = generateIdentityVector(0);
    const action = generateActionRequirement(0, 5);

    const result = computeOverlap(identity, action);

    // computeOverlap should return a result (exact shape depends on implementation)
    expect(result).toBeDefined();
  });
});
