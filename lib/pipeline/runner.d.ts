/**
 * src/pipeline/runner.ts — Trust-Debt Pipeline Runner
 *
 * Executes the 8-step trust-debt pipeline in sequence.
 * After step 4, updates the FIM identity vector.
 * After step 7, posts summary to transparency engine.
 *
 * STEPS:
 *   0. Raw Materials (gather blog posts, commits, documents)
 *   1. Document Processing (parse and normalize)
 *   2. Organic Extraction (extract trust signals)
 *   3. Frequency Analysis (category frequency counts)
 *   4. Grades & Statistics (letter grades per category) → FIM IDENTITY
 *   5. Goal Alignment (align with declared goals)
 *   6. Symmetric Matrix (20x20 category correlations)
 *   7. Final Report (HTML/JSON output)
 *
 * USAGE:
 *   npx tsx src/pipeline/runner.ts                    # Run full pipeline
 *   npx tsx src/pipeline/runner.ts --step 4           # Run single step
 *   npx tsx src/pipeline/runner.ts --from 3 --to 7    # Run range
 */
export interface StepResult {
    step: number;
    name: string;
    durationMs: number;
    outputFiles: number;
    outputBytes: number;
    success: boolean;
    error?: string;
}
export interface PipelineResult {
    runId: string;
    startedAt: string;
    completedAt: string;
    totalDurationMs: number;
    steps: StepResult[];
    identity?: {
        sovereigntyScore: number;
        categoryCount: number;
    };
}
/**
 * Run the full trust-debt pipeline (steps 0-7).
 */
export declare function runPipeline(options?: {
    from?: number;
    to?: number;
    dataDir?: string;
}): Promise<PipelineResult>;
/**
 * Run a single pipeline step.
 */
export declare function runStep(stepNum: number, runDir: string): Promise<StepResult>;
//# sourceMappingURL=runner.d.ts.map