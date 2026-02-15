/**
 * src/pipeline/index.ts — Pipeline Runner Public API
 *
 * Exports the main pipeline runner functions and types.
 */
export { runPipeline, runStep } from './runner.js';
export type { StepResult, PipelineResult, } from './runner.js';
/**
 * Example usage:
 *
 * ```ts
 * import { runPipeline } from './pipeline/index.js';
 *
 * // Run full pipeline (steps 0-7)
 * const result = await runPipeline();
 *
 * // Run specific range
 * const partial = await runPipeline({ from: 3, to: 5 });
 *
 * // Run single step
 * import { runStep } from './pipeline/index.js';
 * await runStep(4, './data/pipeline-runs/my-run');
 * ```
 */
//# sourceMappingURL=index.d.ts.map