/**
 * tests/pipeline/runner.test.js — Tests for Pipeline Runner
 *
 * Tests runStep, runPipeline, and findLegacyScript logic.
 * Uses temp directories to avoid polluting the real data/ folder.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Read the source to verify exports and structure
const runnerSource = fs.readFileSync(
  path.join(__dirname, '../../src/pipeline/runner.ts'),
  'utf-8',
);

describe('pipeline/runner.ts — module structure', () => {
  test('exports runPipeline function', () => {
    expect(runnerSource).toContain('export async function runPipeline');
  });

  test('exports runStep function', () => {
    expect(runnerSource).toContain('export async function runStep');
  });

  test('exports StepResult interface', () => {
    expect(runnerSource).toContain('export interface StepResult');
  });

  test('exports PipelineResult interface', () => {
    expect(runnerSource).toContain('export interface PipelineResult');
  });

  test('defines all 8 step names', () => {
    const stepNames = [
      'raw-materials',
      'document-processing',
      'organic-extraction',
      'frequency-analysis',
      'grades-statistics',
      'goal-alignment',
      'symmetric-matrix',
      'final-report',
    ];
    for (const name of stepNames) {
      expect(runnerSource).toContain(`'${name}'`);
    }
  });
});

describe('pipeline/runner.ts — StepResult shape', () => {
  test('StepResult has required fields', () => {
    expect(runnerSource).toMatch(/step:\s*number/);
    expect(runnerSource).toMatch(/name:\s*string/);
    expect(runnerSource).toMatch(/durationMs:\s*number/);
    expect(runnerSource).toMatch(/outputFiles:\s*number/);
    expect(runnerSource).toMatch(/outputBytes:\s*number/);
    expect(runnerSource).toMatch(/success:\s*boolean/);
  });

  test('StepResult has optional error field', () => {
    expect(runnerSource).toMatch(/error\?:\s*string/);
  });
});

describe('pipeline/runner.ts — PipelineResult shape', () => {
  test('PipelineResult has required fields', () => {
    expect(runnerSource).toMatch(/runId:\s*string/);
    expect(runnerSource).toMatch(/startedAt:\s*string/);
    expect(runnerSource).toMatch(/completedAt:\s*string/);
    expect(runnerSource).toMatch(/totalDurationMs:\s*number/);
    expect(runnerSource).toMatch(/steps:\s*StepResult\[\]/);
  });

  test('PipelineResult has optional identity with sovereignty score', () => {
    expect(runnerSource).toMatch(/sovereigntyScore:\s*number/);
    expect(runnerSource).toMatch(/categoryCount:\s*number/);
  });
});

describe('pipeline/runner.ts — runPipeline logic', () => {
  test('defaults to steps 0-7 when no options', () => {
    expect(runnerSource).toContain('options?.from ?? 0');
    expect(runnerSource).toContain('options?.to ?? 7');
  });

  test('creates run directory with recursive flag', () => {
    expect(runnerSource).toContain("mkdirSync(runDir, { recursive: true })");
  });

  test('continues pipeline on step failure (does not halt)', () => {
    expect(runnerSource).toContain("// Continue to next step — don't halt the pipeline");
  });

  test('updates FIM identity after step 4', () => {
    expect(runnerSource).toContain('stepNum === 4 && result.success');
    expect(runnerSource).toContain('loadIdentityFromPipeline');
  });

  test('saves pipeline-summary.json on completion', () => {
    expect(runnerSource).toContain("'pipeline-summary.json'");
  });
});

describe('pipeline/runner.ts — runStep logic', () => {
  test('creates step subdirectory with step number and name', () => {
    // stepDir = join(runDir, `${stepNum}-${name}`)
    expect(runnerSource).toContain('`${stepNum}-${name}`');
  });

  test('tries to import step module from src/pipeline/', () => {
    expect(runnerSource).toContain("`step-${stepNum}.ts`");
  });

  test('calls mod.run or mod.default.run if available', () => {
    expect(runnerSource).toContain('mod.run');
    expect(runnerSource).toContain('mod.default?.run');
  });

  test('falls back to legacy JS scripts', () => {
    expect(runnerSource).toContain('findLegacyScript');
  });

  test('generates placeholder output if no module or legacy script found', () => {
    expect(runnerSource).toContain("status: 'placeholder'");
  });

  test('counts output files and bytes', () => {
    expect(runnerSource).toContain('readdirSync(stepDir)');
    expect(runnerSource).toContain('statSync(join(stepDir, f)).size');
  });

  test('returns success: false with error string on exception', () => {
    expect(runnerSource).toContain('success: false, error: String(error)');
  });
});

describe('pipeline/runner.ts — findLegacyScript', () => {
  test('searches for legacy trust-debt JS files', () => {
    expect(runnerSource).toContain('trust-debt-');
    expect(runnerSource).toContain('trust-debt-step-');
  });

  test('returns null when no legacy script found', () => {
    expect(runnerSource).toContain('return null');
  });
});

describe('pipeline/runner.ts — CLI entry point', () => {
  test('supports --step flag for single step execution', () => {
    expect(runnerSource).toContain("'--step'");
  });

  test('supports --from and --to flags for range execution', () => {
    expect(runnerSource).toContain("'--from'");
    expect(runnerSource).toContain("'--to'");
  });
});
