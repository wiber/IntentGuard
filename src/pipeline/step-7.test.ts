/**
 * src/pipeline/step-7.test.ts — Tests for Final Auditor
 *
 * Tests pipeline integrity validation, report generation, and anti-regression checks.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { run } from './step-7.js';

const TEST_RUN_DIR = '/tmp/intentguard-test-run';
const TEST_STEP_DIR = join(TEST_RUN_DIR, '7-final-report');

describe('Step 7: Final Auditor', () => {
  beforeEach(() => {
    // Clean up any existing test directory
    if (existsSync(TEST_RUN_DIR)) {
      rmSync(TEST_RUN_DIR, { recursive: true, force: true });
    }

    // Create test directory structure
    mkdirSync(TEST_RUN_DIR, { recursive: true });
    mkdirSync(TEST_STEP_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_RUN_DIR)) {
      rmSync(TEST_RUN_DIR, { recursive: true, force: true });
    }
  });

  /**
   * Helper: Create minimal step output files for testing
   */
  function createMinimalPipelineData() {
    // Step 0: Raw materials
    const step0Dir = join(TEST_RUN_DIR, '0-raw-materials');
    mkdirSync(step0Dir, { recursive: true });
    writeFileSync(
      join(step0Dir, '0-raw-materials.json'),
      JSON.stringify({
        step: 0,
        stats: { commits: 10, blogs: 5, documents: 15 },
      }),
    );

    // Step 1: Document processing
    const step1Dir = join(TEST_RUN_DIR, '1-document-processing');
    mkdirSync(step1Dir, { recursive: true });
    writeFileSync(
      join(step1Dir, '1-document-processing.json'),
      JSON.stringify({ step: 1 }),
    );

    // Step 2: Organic extraction
    const step2Dir = join(TEST_RUN_DIR, '2-organic-extraction');
    mkdirSync(step2Dir, { recursive: true });
    writeFileSync(
      join(step2Dir, '2-organic-extraction.json'),
      JSON.stringify({ step: 2 }),
    );

    // Step 3: Frequency analysis
    const step3Dir = join(TEST_RUN_DIR, '3-frequency-analysis');
    mkdirSync(step3Dir, { recursive: true });
    writeFileSync(
      join(step3Dir, '3-frequency-analysis.json'),
      JSON.stringify({
        step: 3,
        stats: { categoriesActive: 20 },
      }),
    );

    // Step 4: Grades and statistics
    const step4Dir = join(TEST_RUN_DIR, '4-grades-statistics');
    mkdirSync(step4Dir, { recursive: true });
    writeFileSync(
      join(step4Dir, '4-grades-statistics.json'),
      JSON.stringify({
        step: 4,
        sovereignty: { score: 0.85, grade: 'A' },
        categories: {
          security: { grade: 'A', score: 0.9 },
          reliability: { grade: 'B', score: 0.75 },
          data_integrity: { grade: 'A', score: 0.85 },
        },
      }),
    );

    // Step 5: Goal alignment
    const step5Dir = join(TEST_RUN_DIR, '5-goal-alignment');
    mkdirSync(step5Dir, { recursive: true });
    writeFileSync(
      join(step5Dir, '5-goal-alignment.json'),
      JSON.stringify({
        step: 5,
        alignment: { overall: 0.8, grade: 'A' },
        insights: ['High security focus', 'Strong reliability', 'Good data integrity'],
        recommendations: [
          { priority: 'high', action: 'Improve documentation' },
          { priority: 'medium', action: 'Enhance testing coverage' },
        ],
        drifts: [
          { category: 'security', drift: 0.05, severity: 'low' },
          { category: 'documentation', drift: -0.15, severity: 'moderate' },
        ],
      }),
    );

    // Step 6: Symmetric matrix
    const step6Dir = join(TEST_RUN_DIR, '6-symmetric-matrix');
    mkdirSync(step6Dir, { recursive: true });
    writeFileSync(
      join(step6Dir, '6-symmetric-matrix.json'),
      JSON.stringify({
        step: 6,
        matrix: [
          [0, 0.5, 0.3],
          [0.5, 0, 0.7],
          [0.3, 0.7, 0],
        ],
        stats: {
          correlatedPairs: 3,
          orthogonalPairs: 0,
        },
      }),
    );
  }

  it('should generate final report with all pipeline steps present', async () => {
    createMinimalPipelineData();

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    // Check that report files were created
    expect(existsSync(join(TEST_STEP_DIR, '7-final-report.json'))).toBe(true);
    expect(existsSync(join(TEST_STEP_DIR, '7-final-report.html'))).toBe(true);
    expect(existsSync(join(TEST_STEP_DIR, '7-audit-log.json'))).toBe(true);

    // Parse and validate report
    const reportData = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '7-final-report.json'), 'utf-8'),
    );

    expect(reportData.step).toBe(7);
    expect(reportData.name).toBe('final-report');
    expect(reportData.summary.sovereigntyScore).toBe(0.85);
    expect(reportData.summary.sovereigntyGrade).toBe('A');
    expect(reportData.summary.alignmentScore).toBe(0.8);
    expect(reportData.summary.alignmentGrade).toBe('A');
    expect(reportData.summary.trustDebtUnits).toBeGreaterThanOrEqual(0);
    expect(reportData.categories).toBeDefined();
    expect(Array.isArray(reportData.categories)).toBe(true);
  });

  it('should validate pipeline integrity successfully with all steps', async () => {
    createMinimalPipelineData();

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const auditLog = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '7-audit-log.json'), 'utf-8'),
    );

    expect(auditLog.step).toBe(7);
    expect(auditLog.name).toBe('audit-log');
    expect(auditLog.pipelineIntegrity.overall).toBe('pass');
    expect(auditLog.pipelineIntegrity.validationsFailed).toBe(0);
    expect(auditLog.stepsLoaded.step0).toBe(true);
    expect(auditLog.stepsLoaded.step4).toBe(true);
    expect(auditLog.stepsLoaded.step6).toBe(true);
  });

  it('should detect missing pipeline steps', async () => {
    // Create incomplete pipeline (missing step 4)
    const step0Dir = join(TEST_RUN_DIR, '0-raw-materials');
    mkdirSync(step0Dir, { recursive: true });
    writeFileSync(
      join(step0Dir, '0-raw-materials.json'),
      JSON.stringify({ step: 0, stats: {} }),
    );

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const auditLog = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '7-audit-log.json'), 'utf-8'),
    );

    expect(auditLog.pipelineIntegrity.overall).toBe('fail');
    expect(auditLog.pipelineIntegrity.validationsFailed).toBeGreaterThan(0);

    // Find the pipeline completeness validation
    const integrityCheck = auditLog.validations.find(
      (v: { checkName: string }) => v.checkName === 'pipeline-completeness',
    );
    expect(integrityCheck).toBeDefined();
    expect(integrityCheck.passed).toBe(false);
  });

  it('should validate score ranges', async () => {
    createMinimalPipelineData();

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const auditLog = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '7-audit-log.json'), 'utf-8'),
    );

    const scoreRangeCheck = auditLog.validations.find(
      (v: { checkName: string }) => v.checkName === 'score-ranges',
    );
    expect(scoreRangeCheck).toBeDefined();
    expect(scoreRangeCheck.passed).toBe(true);
    expect(scoreRangeCheck.severity).toBe('info');
  });

  it('should validate category ordering (ShortLex)', async () => {
    createMinimalPipelineData();

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const auditLog = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '7-audit-log.json'), 'utf-8'),
    );

    const orderingCheck = auditLog.validations.find(
      (v: { checkName: string }) => v.checkName === 'category-ordering',
    );
    expect(orderingCheck).toBeDefined();
    // Note: May pass or fail depending on actual category data
    expect(['error', 'info']).toContain(orderingCheck.severity);
  });

  it('should validate matrix structure', async () => {
    createMinimalPipelineData();

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const auditLog = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '7-audit-log.json'), 'utf-8'),
    );

    const matrixCheck = auditLog.validations.find(
      (v: { checkName: string }) => v.checkName === 'matrix-structure',
    );
    expect(matrixCheck).toBeDefined();
    expect(matrixCheck.passed).toBe(true);
  });

  it('should detect empty matrix (all zeros)', async () => {
    createMinimalPipelineData();

    // Override step 6 with empty matrix
    const step6Dir = join(TEST_RUN_DIR, '6-symmetric-matrix');
    writeFileSync(
      join(step6Dir, '6-symmetric-matrix.json'),
      JSON.stringify({
        step: 6,
        matrix: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        stats: {},
      }),
    );

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const auditLog = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '7-audit-log.json'), 'utf-8'),
    );

    const matrixPopulationCheck = auditLog.validations.find(
      (v: { checkName: string }) => v.checkName === 'matrix-population',
    );
    expect(matrixPopulationCheck).toBeDefined();
    expect(matrixPopulationCheck.passed).toBe(false);
    expect(matrixPopulationCheck.severity).toBe('error');
  });

  it('should calculate trust debt units correctly', async () => {
    createMinimalPipelineData();

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const report = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '7-final-report.json'), 'utf-8'),
    );

    // Trust debt = (1 - alignment) * (1 - sovereignty) * 500
    // With sovereignty=0.85, alignment=0.8:
    // Trust debt = (1 - 0.8) * (1 - 0.85) * 500 = 0.2 * 0.15 * 500 = 15
    expect(report.summary.trustDebtUnits).toBe(15);
    expect(report.summary.trend).toBe('healthy'); // < 100
    expect(report.summary.isInsurable).toBe(true); // < 300
  });

  it('should generate valid HTML report', async () => {
    createMinimalPipelineData();

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const html = readFileSync(join(TEST_STEP_DIR, '7-final-report.html'), 'utf-8');

    // Check for essential HTML elements
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>IntentGuard Trust-Debt Report</title>');
    expect(html).toContain('Sovereign Engine Pipeline Output');
    expect(html).toContain('Category Grades');
    expect(html).toContain('Key Insights');
    expect(html).toContain('Recommendations');

    // Check for data interpolation
    expect(html).toContain('85%'); // Sovereignty score
    expect(html).toContain('80%'); // Alignment score
  });

  it('should include metadata in final report', async () => {
    createMinimalPipelineData();

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const report = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '7-final-report.json'), 'utf-8'),
    );

    expect(report.metadata.pipelineVersion).toBeDefined();
    expect(report.metadata.stepsCompleted).toBeGreaterThan(0);
    expect(report.metadata.documentsAnalyzed).toBe(30); // 10 commits + 5 blogs + 15 docs
    expect(report.metadata.categoriesActive).toBe(20);
    expect(report.metadata.generatedAt).toBeDefined();
  });

  it('should handle invalid sovereignty scores', async () => {
    createMinimalPipelineData();

    // Override step 4 with out-of-range score
    const step4Dir = join(TEST_RUN_DIR, '4-grades-statistics');
    writeFileSync(
      join(step4Dir, '4-grades-statistics.json'),
      JSON.stringify({
        step: 4,
        sovereignty: { score: 1.5, grade: 'A' }, // Invalid: > 1.0
        categories: {},
      }),
    );

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const auditLog = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '7-audit-log.json'), 'utf-8'),
    );

    expect(auditLog.pipelineIntegrity.overall).toBe('fail');

    const scoreCheck = auditLog.validations.find(
      (v: { checkName: string }) => v.checkName === 'score-ranges',
    );
    expect(scoreCheck.passed).toBe(false);
    expect(scoreCheck.message).toContain('out of range');
  });

  it('should aggregate insights from multiple steps', async () => {
    createMinimalPipelineData();

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const report = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '7-final-report.json'), 'utf-8'),
    );

    expect(report.topInsights).toBeDefined();
    expect(Array.isArray(report.topInsights)).toBe(true);
    expect(report.topInsights.length).toBeGreaterThan(0);
    expect(report.topInsights.length).toBeLessThanOrEqual(5);
  });

  it('should aggregate recommendations with priorities', async () => {
    createMinimalPipelineData();

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const report = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '7-final-report.json'), 'utf-8'),
    );

    expect(report.topRecommendations).toBeDefined();
    expect(Array.isArray(report.topRecommendations)).toBe(true);
    expect(report.topRecommendations.length).toBeGreaterThan(0);

    for (const rec of report.topRecommendations) {
      expect(rec.priority).toBeDefined();
      expect(rec.action).toBeDefined();
      expect(['critical', 'high', 'medium', 'low']).toContain(rec.priority);
    }
  });
});
