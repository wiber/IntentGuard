/**
 * src/pipeline/step-7.ts — Final Report & Pipeline Auditor
 *
 * Generates HTML and JSON reports from all pipeline steps.
 * This is the transparency output — the public-facing trust-debt report.
 * Also performs comprehensive pipeline integrity validation.
 *
 * INPUTS:  All previous steps (0-6)
 * OUTPUTS: 7-final-report.json + 7-final-report.html + 7-audit-log.json
 *
 * VALIDATION: Anti-regression framework ensuring pipeline coherence
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { TRUST_DEBT_CATEGORIES } from '../auth/geometric.js';

interface FinalReport {
  step: 7;
  name: 'final-report';
  timestamp: string;
  summary: {
    sovereigntyScore: number;
    sovereigntyGrade: string;
    alignmentScore: number;
    alignmentGrade: string;
    trustDebtUnits: number;
    trend: string;
    isInsurable: boolean;
  };
  categories: Array<{
    name: string;
    grade: string;
    score: number;
    drift: number;
    status: string;
  }>;
  topInsights: string[];
  topRecommendations: Array<{
    priority: string;
    action: string;
  }>;
  metadata: {
    pipelineVersion: string;
    stepsCompleted: number;
    documentsAnalyzed: number;
    categoriesActive: number;
    matrixSize: string;
    generatedAt: string;
  };
}

interface ValidationResult {
  passed: boolean;
  checkName: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface AuditLog {
  step: 7;
  name: 'audit-log';
  timestamp: string;
  pipelineIntegrity: {
    overall: 'pass' | 'fail' | 'warning';
    stepsValidated: number;
    validationsPassed: number;
    validationsFailed: number;
    validationsWarned: number;
  };
  validations: ValidationResult[];
  stepsLoaded: Record<string, boolean>;
  metadata: {
    auditVersion: string;
    generatedAt: string;
  };
}

// ─── Validation Functions ──────────────────────────────────────────────

/**
 * Validate that categories are properly sorted in ShortLex order.
 * ShortLex = sort by length first, then alphabetically within same length.
 */
function validateCategoryOrdering(categories: Array<{ name: string }>): ValidationResult {
  try {
    for (let i = 0; i < categories.length - 1; i++) {
      const current = categories[i].name;
      const next = categories[i + 1].name;

      // Rule 1: Length-first sorting
      if (current.length > next.length) {
        return {
          passed: false,
          checkName: 'category-ordering',
          message: `ShortLex violation: "${current}" (length ${current.length}) comes before "${next}" (length ${next.length})`,
          severity: 'warning',
        };
      }

      // Rule 2: Alphabetical within same length
      if (current.length === next.length && current > next) {
        return {
          passed: false,
          checkName: 'category-ordering',
          message: `Alphabetical violation: "${current}" must come after "${next}" within same length`,
          severity: 'warning',
        };
      }
    }

    return {
      passed: true,
      checkName: 'category-ordering',
      message: `All ${categories.length} categories properly ordered in ShortLex`,
      severity: 'info',
    };
  } catch (err) {
    return {
      passed: false,
      checkName: 'category-ordering',
      message: `Ordering validation error: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    };
  }
}

/**
 * Validate that matrix structure is coherent with categories.
 */
function validateMatrixStructure(
  matrix: Record<string, unknown> | null,
  categories: Array<{ name: string }>,
): ValidationResult {
  if (!matrix) {
    return {
      passed: false,
      checkName: 'matrix-presence',
      message: 'Matrix data not found (step 6 missing)',
      severity: 'error',
    };
  }

  try {
    const matrixData = matrix.matrix as unknown[][] | undefined;
    if (!matrixData || !Array.isArray(matrixData)) {
      return {
        passed: false,
        checkName: 'matrix-structure',
        message: 'Matrix data is not a valid array',
        severity: 'error',
      };
    }

    // Validate dimensions
    if (matrixData.length !== categories.length) {
      return {
        passed: false,
        checkName: 'matrix-dimensions',
        message: `Matrix dimension mismatch: ${matrixData.length}x${matrixData.length} matrix but ${categories.length} categories`,
        severity: 'error',
      };
    }

    // Check for populated cells (not all zeros)
    let totalValue = 0;
    for (const row of matrixData) {
      if (Array.isArray(row)) {
        for (const cell of row) {
          if (typeof cell === 'number') {
            totalValue += Math.abs(cell);
          } else if (cell && typeof cell === 'object' && 'value' in cell) {
            totalValue += Math.abs(Number((cell as { value: unknown }).value) || 0);
          }
        }
      }
    }

    if (totalValue === 0) {
      return {
        passed: false,
        checkName: 'matrix-population',
        message: 'Matrix is empty (all cells are zero) - no real Intent vs Reality data',
        severity: 'error',
      };
    }

    return {
      passed: true,
      checkName: 'matrix-structure',
      message: `Matrix structure valid: ${matrixData.length}x${matrixData.length} with populated cells`,
      severity: 'info',
    };
  } catch (err) {
    return {
      passed: false,
      checkName: 'matrix-structure',
      message: `Matrix validation error: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    };
  }
}

/**
 * Validate pipeline integrity - ensure all steps completed successfully.
 */
function validatePipelineIntegrity(
  stepsLoaded: Record<string, boolean>,
): ValidationResult {
  const requiredSteps = [0, 1, 2, 3, 4, 5, 6];
  const missingSteps = requiredSteps.filter((n) => !stepsLoaded[`step${n}`]);

  if (missingSteps.length > 0) {
    return {
      passed: false,
      checkName: 'pipeline-completeness',
      message: `Missing pipeline steps: ${missingSteps.join(', ')}`,
      severity: 'error',
    };
  }

  return {
    passed: true,
    checkName: 'pipeline-completeness',
    message: `All ${requiredSteps.length} pipeline steps loaded successfully`,
    severity: 'info',
  };
}

/**
 * Validate sovereignty and alignment scores are within expected ranges.
 */
function validateScoreRanges(
  sovereigntyScore: number,
  alignmentScore: number,
): ValidationResult {
  const issues: string[] = [];

  if (sovereigntyScore < 0 || sovereigntyScore > 1) {
    issues.push(`sovereignty score ${sovereigntyScore.toFixed(3)} out of range [0,1]`);
  }

  if (alignmentScore < 0 || alignmentScore > 1) {
    issues.push(`alignment score ${alignmentScore.toFixed(3)} out of range [0,1]`);
  }

  if (issues.length > 0) {
    return {
      passed: false,
      checkName: 'score-ranges',
      message: `Score validation failed: ${issues.join('; ')}`,
      severity: 'error',
    };
  }

  return {
    passed: true,
    checkName: 'score-ranges',
    message: `Sovereignty ${sovereigntyScore.toFixed(3)}, Alignment ${alignmentScore.toFixed(3)} - both in valid range`,
    severity: 'info',
  };
}

// ─── Data Loading ──────────────────────────────────────────────────────

/**
 * Safely load a step output file.
 */
function loadStep(runDir: string, stepNum: number, fileName: string): Record<string, unknown> | null {
  const stepName = [
    'raw-materials', 'document-processing', 'organic-extraction',
    'frequency-analysis', 'grades-statistics', 'goal-alignment',
    'symmetric-matrix', 'final-report',
  ][stepNum];

  const path = join(runDir, `${stepNum}-${stepName}`, fileName);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Generate the HTML report.
 */
function generateHTML(report: FinalReport): string {
  const { summary, categories, topInsights, topRecommendations } = report;

  const scoreColor = summary.sovereigntyScore >= 0.8 ? '#10b981'
    : summary.sovereigntyScore >= 0.6 ? '#f59e0b'
    : '#ef4444';

  const categoryRows = categories.map(c => {
    const color = c.score >= 0.8 ? '#10b981' : c.score >= 0.6 ? '#f59e0b' : '#ef4444';
    const driftDir = c.drift > 0.1 ? 'underfocused' : c.drift < -0.1 ? 'overfocused' : 'aligned';
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #334155;">${c.name}</td>
        <td style="padding:8px;border-bottom:1px solid #334155;color:${color};font-weight:bold;">${c.grade}</td>
        <td style="padding:8px;border-bottom:1px solid #334155;">${(c.score * 100).toFixed(0)}%</td>
        <td style="padding:8px;border-bottom:1px solid #334155;">${(c.drift * 100).toFixed(0)}%</td>
        <td style="padding:8px;border-bottom:1px solid #334155;">${driftDir}</td>
      </tr>`;
  }).join('');

  const insightItems = topInsights.map(i => `<li style="margin:8px 0;">${i}</li>`).join('');
  const recItems = topRecommendations.map(r => {
    const borderColor = r.priority === 'critical' ? '#ef4444'
      : r.priority === 'high' ? '#f59e0b' : '#3b82f6';
    return `<div style="padding:12px;margin:8px 0;background:rgba(0,0,0,0.3);border-left:4px solid ${borderColor};border-radius:6px;">
      <strong>[${r.priority.toUpperCase()}]</strong> ${r.action}
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>IntentGuard Trust-Debt Report</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'SF Pro Display',-apple-system,sans-serif;background:linear-gradient(135deg,#0f0f23,#1a1a2e);color:#e2e8f0;padding:40px 20px}
    .container{max-width:1000px;margin:0 auto}
    .hero{text-align:center;padding:40px;background:rgba(30,41,59,0.6);border-radius:20px;border:1px solid rgba(139,92,246,0.2);margin-bottom:30px}
    .score{font-size:96px;font-weight:900;color:${scoreColor};text-shadow:0 0 30px ${scoreColor}40;margin:20px 0}
    .grade{font-size:48px;color:${scoreColor}}
    .section{background:rgba(30,41,59,0.6);border-radius:16px;padding:24px;margin:20px 0;border:1px solid rgba(139,92,246,0.15)}
    .section h2{color:#8b5cf6;margin-bottom:16px;font-size:20px}
    table{width:100%;border-collapse:collapse}
    th{padding:8px;text-align:left;border-bottom:2px solid #475569;color:#94a3b8;font-size:13px}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin:20px 0}
    .stat{background:rgba(30,41,59,0.8);padding:20px;border-radius:12px;text-align:center}
    .stat-value{font-size:32px;font-weight:bold;color:#8b5cf6}
    .stat-label{font-size:13px;color:#94a3b8;margin-top:4px}
    .footer{text-align:center;margin-top:40px;color:#64748b;font-size:13px}
    @media print{body{background:white!important;color:black!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1 style="font-size:36px;margin-bottom:8px;">IntentGuard Trust-Debt Report</h1>
      <p style="color:#94a3b8">Sovereign Engine Pipeline Output</p>
      <div class="score">${(summary.sovereigntyScore * 100).toFixed(0)}%</div>
      <div class="grade">${summary.sovereigntyGrade}</div>
      <p style="margin-top:16px;color:#94a3b8">
        Alignment: ${(summary.alignmentScore * 100).toFixed(0)}% |
        Trust Debt: ${summary.trustDebtUnits} units |
        ${summary.isInsurable ? 'Insurable' : 'Not Insurable'}
      </p>
    </div>

    <div class="stats">
      <div class="stat"><div class="stat-value">${summary.sovereigntyGrade}</div><div class="stat-label">Sovereignty</div></div>
      <div class="stat"><div class="stat-value">${summary.alignmentGrade}</div><div class="stat-label">Alignment</div></div>
      <div class="stat"><div class="stat-value">${summary.trustDebtUnits}</div><div class="stat-label">Trust Debt</div></div>
      <div class="stat"><div class="stat-value">${report.metadata.categoriesActive}/${TRUST_DEBT_CATEGORIES.length}</div><div class="stat-label">Active Categories</div></div>
    </div>

    <div class="section">
      <h2>Category Grades</h2>
      <table>
        <thead><tr><th>Category</th><th>Grade</th><th>Score</th><th>Drift</th><th>Status</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Key Insights</h2>
      <ul style="list-style:none;padding:0">${insightItems}</ul>
    </div>

    <div class="section">
      <h2>Recommendations</h2>
      ${recItems}
    </div>

    <div class="footer">
      Generated: ${report.metadata.generatedAt} |
      Pipeline v${report.metadata.pipelineVersion} |
      ${report.metadata.documentsAnalyzed} documents |
      ${report.metadata.matrixSize} matrix
    </div>
  </div>
</body>
</html>`;
}

/**
 * Run step 7: generate final report with validation.
 */
export async function run(runDir: string, stepDir: string): Promise<void> {
  console.log('[step-7] Generating final report with pipeline validation...');

  // Ensure output directory exists
  if (!existsSync(stepDir)) {
    mkdirSync(stepDir, { recursive: true });
  }

  // Load all previous step outputs
  const step0 = loadStep(runDir, 0, '0-raw-materials.json') as Record<string, unknown> | null;
  const step1 = loadStep(runDir, 1, '1-indexed-keywords.json') as Record<string, unknown> | null;
  const step2 = loadStep(runDir, 2, '2-categories-balanced.json') as Record<string, unknown> | null;
  const step3 = loadStep(runDir, 3, '3-presence-matrix.json') as Record<string, unknown> | null;
  const step4 = loadStep(runDir, 4, '4-grades-statistics.json') as Record<string, unknown> | null;
  const step5 = loadStep(runDir, 5, '5-timeline-history.json') as Record<string, unknown> | null;
  const step6 = loadStep(runDir, 6, '6-analysis-narratives.json') as Record<string, unknown> | null;

  // Track which steps loaded successfully
  const stepsLoaded = {
    step0: !!step0,
    step1: !!step1,
    step2: !!step2,
    step3: !!step3,
    step4: !!step4,
    step5: !!step5,
    step6: !!step6,
  };

  // Extract sovereignty from step 4
  const sovereignty = (step4 as Record<string, unknown>)?.sovereignty as { score: number; grade: string } | undefined;
  const sovereigntyScore = sovereignty?.score ?? 0.5;
  const sovereigntyGrade = sovereignty?.grade ?? 'C';

  // Extract alignment from step 5
  const alignment = (step5 as Record<string, unknown>)?.alignment as { overall: number; grade: string } | undefined;
  const alignmentScore = alignment?.overall ?? 0.5;
  const alignmentGrade = alignment?.grade ?? 'C';

  // Calculate trust debt units
  const misalignment = 1 - alignmentScore;
  const trustDebtUnits = Math.round(misalignment * (1 - sovereigntyScore) * 500);

  // Build category summaries
  const gradeCategories = (step4 as Record<string, unknown>)?.categories as Record<string, { grade: string; score: number }> | undefined;
  const drifts = ((step5 as Record<string, unknown>)?.drifts || []) as Array<{ category: string; drift: number; severity: string }>;

  const categories = TRUST_DEBT_CATEGORIES.map(cat => {
    const grade = gradeCategories?.[cat];
    const drift = drifts.find(d => d.category === cat);
    return {
      name: cat,
      grade: grade?.grade || 'F',
      score: grade?.score || 0,
      drift: drift?.drift || 0,
      status: drift?.severity || 'unknown',
    };
  }).sort((a, b) => b.score - a.score);

  // Gather insights
  const insights: string[] = [];
  const step5Insights = ((step5 as Record<string, unknown>)?.insights || []) as string[];
  insights.push(...step5Insights.slice(0, 3));

  if (step6) {
    const stats = (step6 as Record<string, unknown>).stats as { correlatedPairs: number; orthogonalPairs: number } | undefined;
    if (stats) {
      insights.push(`Matrix: ${stats.correlatedPairs} correlated pairs, ${stats.orthogonalPairs} orthogonal pairs`);
    }
  }

  // Gather recommendations
  const recs = ((step5 as Record<string, unknown>)?.recommendations || []) as Array<{ priority: string; action: string }>;

  const rawStats = (step0 as Record<string, unknown>)?.stats as { commits: number; blogs: number; documents: number } | undefined;
  const docsAnalyzed = (rawStats?.commits || 0) + (rawStats?.blogs || 0) + (rawStats?.documents || 0);

  const freqStats = (step3 as Record<string, unknown>)?.stats as { categoriesActive: number } | undefined;

  const report: FinalReport = {
    step: 7,
    name: 'final-report',
    timestamp: new Date().toISOString(),
    summary: {
      sovereigntyScore,
      sovereigntyGrade,
      alignmentScore,
      alignmentGrade,
      trustDebtUnits,
      trend: trustDebtUnits < 100 ? 'healthy' : trustDebtUnits < 200 ? 'moderate' : 'critical',
      isInsurable: trustDebtUnits < 300,
    },
    categories,
    topInsights: insights.slice(0, 5),
    topRecommendations: recs.slice(0, 5),
    metadata: {
      pipelineVersion: '2.0.0',
      stepsCompleted: [step0, step3, step4, step5, step6].filter(Boolean).length + 2, // +2 for steps 1,2
      documentsAnalyzed: docsAnalyzed,
      categoriesActive: freqStats?.categoriesActive || 0,
      matrixSize: '20x20',
      generatedAt: new Date().toISOString(),
    },
  };

  // ─── Pipeline Validation ─────────────────────────────────────────────

  const validations: ValidationResult[] = [];

  // Validation 1: Pipeline completeness
  validations.push(validatePipelineIntegrity(stepsLoaded));

  // Validation 2: Score ranges
  validations.push(validateScoreRanges(sovereigntyScore, alignmentScore));

  // Validation 3: Category ordering (ShortLex)
  validations.push(validateCategoryOrdering(categories));

  // Validation 4: Matrix structure
  validations.push(validateMatrixStructure(step6, categories));

  const validationsPassed = validations.filter((v) => v.passed).length;
  const validationsFailed = validations.filter((v) => !v.passed && v.severity === 'error').length;
  const validationsWarned = validations.filter((v) => !v.passed && v.severity === 'warning').length;

  const overallIntegrity = validationsFailed > 0 ? 'fail' : validationsWarned > 0 ? 'warning' : 'pass';

  // Generate audit log
  const auditLog: AuditLog = {
    step: 7,
    name: 'audit-log',
    timestamp: new Date().toISOString(),
    pipelineIntegrity: {
      overall: overallIntegrity,
      stepsValidated: Object.keys(stepsLoaded).length,
      validationsPassed,
      validationsFailed,
      validationsWarned,
    },
    validations,
    stepsLoaded,
    metadata: {
      auditVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
    },
  };

  // Write audit log
  writeFileSync(
    join(stepDir, '7-audit-log.json'),
    JSON.stringify(auditLog, null, 2),
  );

  // Log validation results
  console.log('[step-7] Pipeline validation results:');
  for (const v of validations) {
    const icon = v.passed ? '✅' : v.severity === 'error' ? '❌' : '⚠️';
    console.log(`  ${icon} ${v.checkName}: ${v.message}`);
  }

  if (overallIntegrity === 'fail') {
    console.error(`[step-7] ❌ Pipeline integrity check FAILED - ${validationsFailed} critical error(s)`);
  } else if (overallIntegrity === 'warning') {
    console.warn(`[step-7] ⚠️  Pipeline integrity check passed with ${validationsWarned} warning(s)`);
  } else {
    console.log(`[step-7] ✅ Pipeline integrity check PASSED - all validations successful`);
  }

  // Write JSON report
  writeFileSync(
    join(stepDir, '7-final-report.json'),
    JSON.stringify(report, null, 2),
  );

  // Write HTML report
  const html = generateHTML(report);
  writeFileSync(join(stepDir, '7-final-report.html'), html);

  console.log(`[step-7] Report generated — sovereignty: ${sovereigntyScore.toFixed(3)} (${sovereigntyGrade}), alignment: ${(alignmentScore * 100).toFixed(1)}%, trust debt: ${trustDebtUnits} units`);
  console.log(`[step-7] Outputs: 7-final-report.json, 7-final-report.html, 7-audit-log.json`);
}
