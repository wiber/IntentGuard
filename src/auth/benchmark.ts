/**
 * src/auth/benchmark.ts — FIM Auth Layer Performance Benchmark
 *
 * Measures latency of the geometric overlap computation (core FIM auth check).
 * Target: <0.001ms (1 microsecond) per check for production viability.
 *
 * TESTS:
 *   1. Cold start: First 100 checks (cache warming)
 *   2. Hot path: 10000 checks with realistic identity/requirement pairs
 *   3. Worst case: Dense requirement vectors (all 20 categories)
 *   4. Best case: Sparse requirement vectors (1-3 categories)
 *
 * METRICS:
 *   - Mean latency (μs)
 *   - Median latency (μs)
 *   - P95/P99 latency (μs)
 *   - Min/max latency (μs)
 *   - Total throughput (checks/sec)
 */

import {
  computeOverlap,
  checkPermission,
  type IdentityVector,
  type ActionRequirement,
  TRUST_DEBT_CATEGORIES,
  type TrustDebtCategory,
} from './geometric.js';

// ─── Test Data Generation ───────────────────────────────────────────────

/**
 * Generate a realistic identity vector with random scores.
 */
function generateIdentity(userId: string = 'benchmark-user'): IdentityVector {
  const categoryScores: Partial<Record<TrustDebtCategory, number>> = {};

  // Generate random scores (0.0-1.0) with bias toward mid-range (0.4-0.8)
  for (const cat of TRUST_DEBT_CATEGORIES) {
    categoryScores[cat] = 0.4 + Math.random() * 0.4;
  }

  return {
    userId,
    categoryScores,
    sovereigntyScore: 0.5 + Math.random() * 0.3,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generate an action requirement with N random categories.
 */
function generateRequirement(
  toolName: string,
  numCategories: number,
): ActionRequirement {
  const requiredScores: Partial<Record<TrustDebtCategory, number>> = {};

  // Pick random categories
  const shuffled = [...TRUST_DEBT_CATEGORIES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(numCategories, 20); i++) {
    requiredScores[shuffled[i]] = 0.3 + Math.random() * 0.5;
  }

  return {
    toolName,
    requiredScores,
    minSovereignty: 0.2 + Math.random() * 0.5,
    description: `Benchmark requirement with ${numCategories} categories`,
  };
}

// ─── Benchmark Execution ────────────────────────────────────────────────

export interface BenchmarkResult {
  testName: string;
  iterations: number;
  totalTimeMs: number;
  meanLatencyUs: number;
  medianLatencyUs: number;
  p95LatencyUs: number;
  p99LatencyUs: number;
  minLatencyUs: number;
  maxLatencyUs: number;
  throughputPerSec: number;
  passedTarget: boolean;
}

/**
 * Run a benchmark test with N iterations.
 */
function runBenchmark(
  testName: string,
  iterations: number,
  identities: IdentityVector[],
  requirements: ActionRequirement[],
): BenchmarkResult {
  const latencies: number[] = [];

  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const identity = identities[i % identities.length];
    const requirement = requirements[i % requirements.length];

    const iterStart = performance.now();
    computeOverlap(identity, requirement);
    const iterEnd = performance.now();

    latencies.push((iterEnd - iterStart) * 1000); // Convert to microseconds
  }

  const endTime = performance.now();
  const totalTimeMs = endTime - startTime;

  // Sort latencies for percentile calculations
  latencies.sort((a, b) => a - b);

  const meanLatencyUs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const medianLatencyUs = latencies[Math.floor(latencies.length / 2)];
  const p95LatencyUs = latencies[Math.floor(latencies.length * 0.95)];
  const p99LatencyUs = latencies[Math.floor(latencies.length * 0.99)];
  const minLatencyUs = latencies[0];
  const maxLatencyUs = latencies[latencies.length - 1];
  const throughputPerSec = (iterations / totalTimeMs) * 1000;

  const passedTarget = meanLatencyUs < 1.0; // Target: <0.001ms = 1μs

  return {
    testName,
    iterations,
    totalTimeMs,
    meanLatencyUs,
    medianLatencyUs,
    p95LatencyUs,
    p99LatencyUs,
    minLatencyUs,
    maxLatencyUs,
    throughputPerSec,
    passedTarget,
  };
}

// ─── Main Benchmark Suite ───────────────────────────────────────────────

export async function runBenchmarkSuite(): Promise<{
  results: BenchmarkResult[];
  timestamp: string;
  summary: {
    allPassed: boolean;
    totalChecks: number;
    totalTimeMs: number;
    overallThroughput: number;
  };
}> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('FIM AUTH LAYER BENCHMARK');
  console.log('Target: <0.001ms (<1μs) per check');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results: BenchmarkResult[] = [];

  // ─── Test 1: Cold Start ───────────────────────────────────────────────

  console.log('Test 1: Cold Start (100 iterations)');
  const coldIdentities = Array.from({ length: 10 }, (_, i) => generateIdentity(`cold-${i}`));
  const coldRequirements = Array.from({ length: 10 }, (_, i) => generateRequirement(`cold-tool-${i}`, 5));

  const coldResult = runBenchmark('Cold Start', 100, coldIdentities, coldRequirements);
  results.push(coldResult);
  printResult(coldResult);

  // ─── Test 2: Hot Path (Realistic) ──────────────────────────────────────

  console.log('\nTest 2: Hot Path - Realistic (10,000 iterations)');
  const hotIdentities = Array.from({ length: 100 }, (_, i) => generateIdentity(`hot-${i}`));
  const hotRequirements = Array.from({ length: 50 }, (_, i) => generateRequirement(`hot-tool-${i}`, 3 + Math.floor(Math.random() * 5)));

  const hotResult = runBenchmark('Hot Path (Realistic)', 10000, hotIdentities, hotRequirements);
  results.push(hotResult);
  printResult(hotResult);

  // ─── Test 3: Worst Case (Dense Requirements) ───────────────────────────

  console.log('\nTest 3: Worst Case - Dense Requirements (10,000 iterations)');
  const denseIdentities = Array.from({ length: 100 }, (_, i) => generateIdentity(`dense-${i}`));
  const denseRequirements = Array.from({ length: 50 }, (_, i) => generateRequirement(`dense-tool-${i}`, 20));

  const denseResult = runBenchmark('Worst Case (Dense)', 10000, denseIdentities, denseRequirements);
  results.push(denseResult);
  printResult(denseResult);

  // ─── Test 4: Best Case (Sparse Requirements) ───────────────────────────

  console.log('\nTest 4: Best Case - Sparse Requirements (10,000 iterations)');
  const sparseIdentities = Array.from({ length: 100 }, (_, i) => generateIdentity(`sparse-${i}`));
  const sparseRequirements = Array.from({ length: 50 }, (_, i) => generateRequirement(`sparse-tool-${i}`, 1));

  const sparseResult = runBenchmark('Best Case (Sparse)', 10000, sparseIdentities, sparseRequirements);
  results.push(sparseResult);
  printResult(sparseResult);

  // ─── Test 5: Full Permission Check (with sovereignty) ──────────────────

  console.log('\nTest 5: Full Permission Check (10,000 iterations)');
  const fullIdentities = Array.from({ length: 100 }, (_, i) => generateIdentity(`full-${i}`));
  const fullRequirements = Array.from({ length: 50 }, (_, i) => generateRequirement(`full-tool-${i}`, 4));

  const fullLatencies: number[] = [];
  const fullStartTime = performance.now();

  for (let i = 0; i < 10000; i++) {
    const identity = fullIdentities[i % fullIdentities.length];
    const requirement = fullRequirements[i % fullRequirements.length];

    const iterStart = performance.now();
    checkPermission(identity, requirement);
    const iterEnd = performance.now();

    fullLatencies.push((iterEnd - iterStart) * 1000);
  }

  const fullEndTime = performance.now();
  fullLatencies.sort((a, b) => a - b);

  const fullResult: BenchmarkResult = {
    testName: 'Full Permission Check',
    iterations: 10000,
    totalTimeMs: fullEndTime - fullStartTime,
    meanLatencyUs: fullLatencies.reduce((a, b) => a + b, 0) / fullLatencies.length,
    medianLatencyUs: fullLatencies[Math.floor(fullLatencies.length / 2)],
    p95LatencyUs: fullLatencies[Math.floor(fullLatencies.length * 0.95)],
    p99LatencyUs: fullLatencies[Math.floor(fullLatencies.length * 0.99)],
    minLatencyUs: fullLatencies[0],
    maxLatencyUs: fullLatencies[fullLatencies.length - 1],
    throughputPerSec: (10000 / (fullEndTime - fullStartTime)) * 1000,
    passedTarget: fullLatencies.reduce((a, b) => a + b, 0) / fullLatencies.length < 1.0,
  };
  results.push(fullResult);
  printResult(fullResult);

  // ─── Summary ────────────────────────────────────────────────────────────

  const totalChecks = results.reduce((sum, r) => sum + r.iterations, 0);
  const totalTimeMs = results.reduce((sum, r) => sum + r.totalTimeMs, 0);
  const overallThroughput = (totalChecks / totalTimeMs) * 1000;
  const allPassed = results.every(r => r.passedTarget);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total checks: ${totalChecks.toLocaleString()}`);
  console.log(`Total time: ${totalTimeMs.toFixed(2)}ms`);
  console.log(`Overall throughput: ${overallThroughput.toLocaleString(undefined, { maximumFractionDigits: 0 })} checks/sec`);
  console.log(`\n✓ Target (<1μs): ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);

  if (!allPassed) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passedTarget).forEach(r => {
      console.log(`  - ${r.testName}: ${r.meanLatencyUs.toFixed(3)}μs (${(r.meanLatencyUs - 1.0).toFixed(3)}μs over target)`);
    });
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  return {
    results,
    timestamp: new Date().toISOString(),
    summary: {
      allPassed,
      totalChecks,
      totalTimeMs,
      overallThroughput,
    },
  };
}

/**
 * Print a single benchmark result.
 */
function printResult(result: BenchmarkResult): void {
  console.log(`  Iterations: ${result.iterations.toLocaleString()}`);
  console.log(`  Total time: ${result.totalTimeMs.toFixed(2)}ms`);
  console.log(`  Mean latency: ${result.meanLatencyUs.toFixed(3)}μs`);
  console.log(`  Median latency: ${result.medianLatencyUs.toFixed(3)}μs`);
  console.log(`  P95 latency: ${result.p95LatencyUs.toFixed(3)}μs`);
  console.log(`  P99 latency: ${result.p99LatencyUs.toFixed(3)}μs`);
  console.log(`  Min latency: ${result.minLatencyUs.toFixed(3)}μs`);
  console.log(`  Max latency: ${result.maxLatencyUs.toFixed(3)}μs`);
  console.log(`  Throughput: ${result.throughputPerSec.toLocaleString(undefined, { maximumFractionDigits: 0 })} checks/sec`);
  console.log(`  Target (<1μs): ${result.passedTarget ? '✅ PASSED' : '❌ FAILED'}`);
}

// ─── CLI Entry Point ────────────────────────────────────────────────────

if (require.main === module) {
  runBenchmarkSuite()
    .then(async ({ results, timestamp, summary }) => {
      // Write results to JSON
      const fs = require('fs');
      const path = require('path');

      const outputPath = path.join(__dirname, 'benchmark-results.json');
      const output = {
        timestamp,
        summary,
        results,
      };

      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`Results written to: ${outputPath}`);

      process.exit(summary.allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Benchmark failed:', err);
      process.exit(1);
    });
}
