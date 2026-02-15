/**
 * src/pipeline/step-4.ts — Grades & Statistics Calculator
 *
 * Assigns letter grades per trust-debt category using CALIBRATED boundaries.
 * This step produces the FIM Identity Vector — the core of geometric auth.
 *
 * INPUTS:  step-3 frequency analysis, step-2 process health, step-0 outcomes
 * OUTPUTS: 4-grades-statistics.json (letter grades + scores per category)
 *
 * CALIBRATED GRADE BOUNDARIES (from trust-debt-pipeline-coms.txt):
 * - Grade A (🟢 EXCELLENT): 0-500 units - Outstanding alignment, exemplary project
 * - Grade B (🟡 GOOD): 501-1500 units - Solid project with minor attention areas
 * - Grade C (🟠 NEEDS ATTENTION): 1501-3000 units - Clear work needed but achievable
 * - Grade D (🔴 REQUIRES WORK): 3001+ units - Significant systematic improvement needed
 *
 * CRITICAL: This step feeds directly into FIM geometric auth.
 * The identity vector IS the pipeline output. No manual override. Immutable.
 */
/**
 * Run step 4: compute grades and statistics using CALIBRATED boundaries.
 */
export declare function run(runDir: string, stepDir: string): Promise<void>;
//# sourceMappingURL=step-4.d.ts.map