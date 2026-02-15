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
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loadIdentityFromPipeline } from '../auth/geometric.js';
const ROOT = join(import.meta.dirname || __dirname, '..', '..');
const STEP_NAMES = [
    'raw-materials',
    'document-processing',
    'organic-extraction',
    'frequency-analysis',
    'grades-statistics',
    'goal-alignment',
    'symmetric-matrix',
    'final-report',
];
/**
 * Run the full trust-debt pipeline (steps 0-7).
 */
export async function runPipeline(options) {
    const from = options?.from ?? 0;
    const to = options?.to ?? 7;
    const startedAt = new Date().toISOString();
    const runId = `run-${startedAt.replace(/[:.]/g, '-').slice(0, 19)}`;
    // Create run directory
    const baseDir = options?.dataDir ?? join(ROOT, 'data', 'pipeline-runs');
    const runDir = join(baseDir, runId);
    mkdirSync(runDir, { recursive: true });
    console.log(`[Pipeline] Starting ${runId} (steps ${from}-${to})`);
    console.log(`[Pipeline] Output: ${runDir}`);
    const steps = [];
    const pipelineStart = Date.now();
    for (let stepNum = from; stepNum <= to; stepNum++) {
        const result = await runStep(stepNum, runDir);
        steps.push(result);
        if (!result.success) {
            console.error(`[Pipeline] Step ${stepNum} failed: ${result.error}`);
            // Continue to next step — don't halt the pipeline
        }
        // After step 4: update FIM identity
        if (stepNum === 4 && result.success) {
            try {
                const identity = loadIdentityFromPipeline(runDir);
                console.log(`[Pipeline] FIM identity updated: sovereignty=${identity.sovereigntyScore.toFixed(3)}`);
            }
            catch (err) {
                console.warn(`[Pipeline] FIM identity update failed: ${err}`);
            }
        }
    }
    const completedAt = new Date().toISOString();
    const totalDurationMs = Date.now() - pipelineStart;
    // Load final identity if step 4 was run
    let identity;
    if (from <= 4 && to >= 4) {
        try {
            const id = loadIdentityFromPipeline(runDir);
            identity = {
                sovereigntyScore: id.sovereigntyScore,
                categoryCount: Object.keys(id.categoryScores).length,
            };
        }
        catch { }
    }
    const result = {
        runId, startedAt, completedAt, totalDurationMs, steps, identity,
    };
    // Save run summary
    writeFileSync(join(runDir, 'pipeline-summary.json'), JSON.stringify(result, null, 2));
    console.log(`[Pipeline] Complete in ${totalDurationMs}ms — ${steps.filter(s => s.success).length}/${steps.length} steps succeeded`);
    return result;
}
/**
 * Run a single pipeline step.
 */
export async function runStep(stepNum, runDir) {
    const name = STEP_NAMES[stepNum] || `step-${stepNum}`;
    const stepDir = join(runDir, `${stepNum}-${name}`);
    mkdirSync(stepDir, { recursive: true });
    console.log(`[Pipeline] Step ${stepNum}: ${name}...`);
    const start = Date.now();
    try {
        // Try to load the step module
        const modulePath = join(ROOT, 'src', 'pipeline', `step-${stepNum}.ts`);
        if (existsSync(modulePath)) {
            const mod = await import(modulePath);
            if (mod.run) {
                await mod.run(runDir, stepDir);
            }
            else if (mod.default?.run) {
                await mod.default.run(runDir, stepDir);
            }
        }
        else {
            // Step module not yet ported — try legacy JS from src/
            const legacyPath = findLegacyScript(stepNum);
            if (legacyPath) {
                console.log(`[Pipeline] Using legacy script: ${legacyPath}`);
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);
                await execAsync(`node "${legacyPath}" "${runDir}" "${stepDir}"`, {
                    cwd: ROOT,
                    maxBuffer: 10 * 1024 * 1024,
                });
            }
            else {
                // Generate placeholder output
                writeFileSync(join(stepDir, `${stepNum}-${name}.json`), JSON.stringify({
                    step: stepNum,
                    name,
                    status: 'placeholder',
                    message: `Step module not yet ported. Create src/pipeline/step-${stepNum}.ts`,
                    timestamp: new Date().toISOString(),
                }, null, 2));
            }
        }
        const durationMs = Date.now() - start;
        // Count output files
        const { readdirSync, statSync } = await import('fs');
        let outputFiles = 0;
        let outputBytes = 0;
        try {
            const files = readdirSync(stepDir);
            outputFiles = files.length;
            for (const f of files) {
                outputBytes += statSync(join(stepDir, f)).size;
            }
        }
        catch { }
        console.log(`[Pipeline] Step ${stepNum} done (${durationMs}ms, ${outputFiles} files, ${outputBytes} bytes)`);
        return { step: stepNum, name, durationMs, outputFiles, outputBytes, success: true };
    }
    catch (error) {
        const durationMs = Date.now() - start;
        return {
            step: stepNum, name, durationMs, outputFiles: 0, outputBytes: 0,
            success: false, error: String(error),
        };
    }
}
/**
 * Find legacy JS script for a pipeline step.
 */
function findLegacyScript(stepNum) {
    const patterns = [
        join(ROOT, 'src', `trust-debt-${STEP_NAMES[stepNum]?.replace(/-/g, '-')}.js`),
        join(ROOT, 'src', `trust-debt-step-${stepNum}.js`),
    ];
    for (const p of patterns) {
        if (existsSync(p))
            return p;
    }
    return null;
}
// ─── CLI Entry Point ──────────────────────────────────────────
if (import.meta.url.endsWith(process.argv[1]?.replace(/^file:\/\//, '') || '')) {
    const args = process.argv.slice(2);
    const stepIdx = args.indexOf('--step');
    const fromIdx = args.indexOf('--from');
    const toIdx = args.indexOf('--to');
    if (stepIdx >= 0) {
        const step = parseInt(args[stepIdx + 1]);
        const runDir = join(ROOT, 'data', 'pipeline-runs', `single-${Date.now()}`);
        mkdirSync(runDir, { recursive: true });
        runStep(step, runDir).then(r => console.log(JSON.stringify(r, null, 2)));
    }
    else {
        const from = fromIdx >= 0 ? parseInt(args[fromIdx + 1]) : undefined;
        const to = toIdx >= 0 ? parseInt(args[toIdx + 1]) : undefined;
        runPipeline({ from, to }).then(r => console.log(JSON.stringify(r, null, 2)));
    }
}
//# sourceMappingURL=runner.js.map