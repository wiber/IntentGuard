/**
 * src/pipeline/step-5.ts — Timeline & Historical Analyzer
 *
 * Agent 5: Analyzes git commit history to show Trust Debt evolution over time.
 * Detects trends, regressions, and improvement patterns across categories.
 *
 * Core thesis: Git commit history reveals actual development priorities,
 * showing which categories receive sustained attention vs. neglect.
 *
 * INPUTS:  step-1 indexed keywords, step-4 grades
 * OUTPUTS: step-5-timeline-history.json (evolution analysis)
 */
/**
 * Run step 5: timeline and historical analysis.
 */
export declare function run(runDir: string, stepDir: string): Promise<void>;
//# sourceMappingURL=step-5.d.ts.map