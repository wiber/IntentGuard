#!/usr/bin/env npx tsx

/**
 * FIM Geometric Overlap Computation Benchmark
 *
 * Tests performance of computeOverlap() under realistic load:
 * - 1000 identity vectors (random category scores 0.0-1.0)
 * - 10 action requirements (varying sparsity: 2-15 categories)
 * - 10,000 total computations
 *
 * Target: avg latency < 1ms per computation
 */

import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
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

// ─── Benchmark Runner ───────────────────────────────────────────────────

function runBenchmark() {
  console.log('🔬 FIM Geometric Overlap Benchmark\n');

  // ─── Setup ──────────────────────────────────────────────────────────
  console.log('📊 Generating test data...');

  const IDENTITY_COUNT = 1000;
  const ACTION_COUNT = 10;
  const MIN_SPARSITY = 2;
  const MAX_SPARSITY = 15;

  const identities = [];
  for (let i = 0; i < IDENTITY_COUNT; i++) {
    identities.push(generateIdentityVector(i));
  }

  const actions = [];
  for (let i = 0; i < ACTION_COUNT; i++) {
    const sparsity = MIN_SPARSITY + Math.floor(Math.random() * (MAX_SPARSITY - MIN_SPARSITY + 1));
    actions.push(generateActionRequirement(i, sparsity));
  }

  console.log(`✓ Generated ${IDENTITY_COUNT} identities`);
  console.log(`✓ Generated ${ACTION_COUNT} actions (sparsity: ${MIN_SPARSITY}-${MAX_SPARSITY} categories)\n`);

  // ─── Warmup ─────────────────────────────────────────────────────────
  console.log('🔥 Warming up JIT...');
  for (let i = 0; i < 100; i++) {
    computeOverlap(identities[0], actions[0]);
  }
  console.log('✓ Warmup complete\n');

  // ─── Benchmark ──────────────────────────────────────────────────────
  console.log('⏱️  Running benchmark...');

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

  // ─── Analysis ───────────────────────────────────────────────────────
  latencies.sort((a, b) => a - b);

  const totalComputations = latencies.length;
  const avgLatencyMs = latencies.reduce((sum, l) => sum + l, 0) / totalComputations;
  const p95Index = Math.floor(totalComputations * 0.95);
  const p99Index = Math.floor(totalComputations * 0.99);
  const p95LatencyMs = latencies[p95Index];
  const p99LatencyMs = latencies[p99Index];
  const throughputOpsPerSec = (totalComputations / totalTimeMs) * 1000;

  const passed = avgLatencyMs < 1.0;

  console.log(`✓ Completed ${totalComputations.toLocaleString()} computations in ${totalTimeMs.toFixed(2)}ms\n`);

  // ─── Results Table ──────────────────────────────────────────────────
  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│               BENCHMARK RESULTS                     │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│ Total Computations:    ${totalComputations.toLocaleString().padStart(24)} │`);
  console.log(`│ Total Time:            ${totalTimeMs.toFixed(2).padStart(20)} ms │`);
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│ Avg Latency:           ${avgLatencyMs.toFixed(4).padStart(20)} ms │`);
  console.log(`│ P95 Latency:           ${p95LatencyMs.toFixed(4).padStart(20)} ms │`);
  console.log(`│ P99 Latency:           ${p99LatencyMs.toFixed(4).padStart(20)} ms │`);
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│ Throughput:            ${throughputOpsPerSec.toFixed(0).padStart(17)} ops/sec │`);
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│ Target (< 1ms avg):    ${(passed ? '✓ PASS' : '✗ FAIL').padStart(24)} │`);
  console.log('└─────────────────────────────────────────────────────┘\n');

  // ─── Return Results ─────────────────────────────────────────────────
  return {
    totalComputations,
    totalTimeMs,
    avgLatencyMs,
    p95LatencyMs,
    p99LatencyMs,
    throughputOpsPerSec,
    passed,
    timestamp: new Date().toISOString(),
    config: {
      identityCount: IDENTITY_COUNT,
      actionCount: ACTION_COUNT,
      sparsityRange: [MIN_SPARSITY, MAX_SPARSITY],
    },
  };
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  const results = runBenchmark();

  // Write results to JSON
  const outputPath = path.resolve(__dirname, 'fim-benchmark-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`📝 Results written to: ${outputPath}\n`);

  // Exit with appropriate code
  if (!results.passed) {
    console.error('❌ Benchmark FAILED: Average latency exceeds 1ms threshold');
    process.exit(1);
  }

  console.log('✅ Benchmark PASSED');
  process.exit(0);
}

main().catch((error) => {
  console.error('💥 Benchmark error:', error);
  process.exit(1);
});
