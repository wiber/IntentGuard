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
export declare function runBenchmarkSuite(): Promise<{
    results: BenchmarkResult[];
    timestamp: string;
    summary: {
        allPassed: boolean;
        totalChecks: number;
        totalTimeMs: number;
        overallThroughput: number;
    };
}>;
//# sourceMappingURL=benchmark.d.ts.map