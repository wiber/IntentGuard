/**
 * src/pipeline/step-6.ts — Analysis & Narrative Generator
 *
 * Generates cold spot analysis, asymmetric patterns, and actionable narratives.
 * Identifies regions where Intent-Reality alignment is weak and provides
 * business context for Trust Debt findings.
 *
 * INPUTS:  All previous steps (0-5)
 * OUTPUTS: 6-analysis-narratives.json (cold spots, patterns, recommendations)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TRUST_DEBT_CATEGORIES, type TrustDebtCategory } from '../auth/geometric.js';

interface ColdSpot {
  category: TrustDebtCategory;
  severity: 'frozen' | 'arctic' | 'cold' | 'cool';
  temperature: string; // emoji
  score: number; // 0.0-1.0, lower is colder
  interpretation: string;
  evidence: string[];
}

interface AsymmetricPattern {
  type: 'diagonal' | 'vertical' | 'horizontal' | 'cluster' | 'cross-cutting';
  title: string;
  categories: TrustDebtCategory[];
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
}

interface NarrativeSection {
  title: string;
  emoji: string;
  content: string[];
  recommendations?: string[];
}

interface AnalysisResult {
  step: 6;
  name: 'analysis-narratives';
  timestamp: string;
  metadata: {
    agent: string;
    analysis_type: string;
    input_files: string[];
    framework: string;
  };
  executive_summary: {
    grade: string;
    trust_debt_units: number;
    grade_description: string;
    legitimacy_score: string;
    process_health: string;
    critical_finding: string;
    business_impact: string;
  };
  cold_spots: {
    total: number;
    by_severity: Record<string, number>;
    top_10: ColdSpot[];
  };
  asymmetric_patterns: AsymmetricPattern[];
  narratives: NarrativeSection[];
  zero_multiplier_analysis: {
    core_principle: string;
    calculation: {
      process_health: string;
      outcome_reality: number;
      legitimacy_score: number;
      interpretation: string;
    };
    mathematical_foundation: {
      legitimacy_formula: string;
      current_calculation: string;
      theoretical_maximum: string;
      improvement_potential: string;
    };
  };
  recommendations: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    action: string;
    impact: string;
    units_reduction: number;
  }>;
  stats: {
    total_cold_spots: number;
    critical_patterns: number;
    legitimacy_score: number;
    orthogonality_score: number;
  };
}

/**
 * Calculate temperature emoji and severity for a score.
 */
function getTemperature(score: number): { emoji: string; severity: ColdSpot['severity'] } {
  if (score < 0.25) return { emoji: '🧊', severity: 'frozen' };
  if (score < 0.40) return { emoji: '❄️', severity: 'arctic' };
  if (score < 0.60) return { emoji: '🌨️', severity: 'cold' };
  return { emoji: '🌥️', severity: 'cool' };
}

/**
 * Identify cold spots (categories with low alignment).
 */
function findColdSpots(grades: any, alignment: any): ColdSpot[] {
  const spots: ColdSpot[] = [];

  for (const cat of TRUST_DEBT_CATEGORIES) {
    const catGrade = grades.by_category?.find((c: any) => c.category === cat);
    const catAlign = alignment.drifts?.find((d: any) => d.category === cat);

    if (!catGrade) continue;

    // Score based on grade performance (0.0 = worst, 1.0 = best)
    const gradeScore = Math.max(0, 1 - (catGrade.units / 1000));
    const alignScore = catAlign ? (1 - Math.abs(catAlign.drift)) : 0.5;
    const overallScore = (gradeScore + alignScore) / 2;

    if (overallScore < 0.65) {
      const { emoji, severity } = getTemperature(overallScore);

      spots.push({
        category: cat,
        severity,
        temperature: emoji,
        score: Math.round(overallScore * 1000) / 1000,
        interpretation: interpretColdSpot(cat, overallScore, catGrade, catAlign),
        evidence: buildEvidence(catGrade, catAlign),
      });
    }
  }

  return spots.sort((a, b) => a.score - b.score);
}

/**
 * Interpret what a cold spot means.
 */
function interpretColdSpot(
  category: string,
  score: number,
  gradeData: any,
  alignData: any,
): string {
  const pct = Math.round(score * 100);

  if (score < 0.25) {
    return `${category} is critically misaligned (${pct}%) - immediate attention required`;
  }
  if (score < 0.40) {
    return `${category} has severe alignment issues (${pct}%) - systematic problems detected`;
  }
  if (score < 0.60) {
    return `${category} is underperforming (${pct}%) - targeted improvements needed`;
  }
  return `${category} needs attention (${pct}%) - minor drift detected`;
}

/**
 * Build evidence list for a cold spot.
 */
function buildEvidence(gradeData: any, alignData: any): string[] {
  const evidence: string[] = [];

  if (gradeData?.units > 500) {
    evidence.push(`High trust debt: ${gradeData.units} units`);
  }
  if (alignData && Math.abs(alignData.drift) > 0.3) {
    evidence.push(`Significant drift: ${Math.abs(alignData.drift).toFixed(2)}`);
  }
  if (gradeData?.percentage > 15) {
    evidence.push(`Represents ${gradeData.percentage.toFixed(1)}% of total debt`);
  }

  return evidence;
}

/**
 * Identify asymmetric patterns (structural issues).
 */
function findAsymmetricPatterns(
  coldSpots: ColdSpot[],
  grades: any,
  alignment: any,
): AsymmetricPattern[] {
  const patterns: AsymmetricPattern[] = [];

  // Diagonal failures (self-alignment issues)
  const diagonal = coldSpots.filter(cs => cs.severity === 'frozen' || cs.severity === 'arctic');
  if (diagonal.length > 0) {
    patterns.push({
      type: 'diagonal',
      title: 'Self-Alignment Failures',
      categories: diagonal.map(d => d.category),
      description: `${diagonal.length} categories failing to achieve their stated purpose`,
      severity: 'critical',
      impact: 'Core system integrity compromised',
    });
  }

  // Cluster patterns (related categories all cold)
  const clusters = findClusters(coldSpots);
  clusters.forEach(cluster => {
    patterns.push({
      type: 'cluster',
      title: 'Cold Region',
      categories: cluster,
      description: `${cluster.length} related categories showing coordinated underperformance`,
      severity: cluster.length >= 4 ? 'high' : 'medium',
      impact: 'Systemic issues affecting multiple areas',
    });
  });

  // High-debt categories
  const highDebt = grades.by_category
    ?.filter((c: any) => c.percentage > 20)
    .map((c: any) => c.category);
  if (highDebt && highDebt.length > 0) {
    patterns.push({
      type: 'vertical',
      title: 'Concentration Risk',
      categories: highDebt,
      description: 'Single category driving >20% of total debt',
      severity: 'high',
      impact: 'Risk concentration requiring architectural remediation',
    });
  }

  return patterns.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Find clusters of related cold categories.
 */
function findClusters(coldSpots: ColdSpot[]): TrustDebtCategory[][] {
  const clusters: TrustDebtCategory[][] = [];
  const processed = new Set<string>();

  for (const spot of coldSpots) {
    if (processed.has(spot.category)) continue;

    // Find neighbors (categories with similar prefixes or adjacent in list)
    const cluster = [spot.category];
    processed.add(spot.category);

    for (const other of coldSpots) {
      if (processed.has(other.category)) continue;

      // Simple adjacency check
      const idx1 = TRUST_DEBT_CATEGORIES.indexOf(spot.category);
      const idx2 = TRUST_DEBT_CATEGORIES.indexOf(other.category);

      if (Math.abs(idx1 - idx2) <= 2 && other.score < 0.6) {
        cluster.push(other.category);
        processed.add(other.category);
      }
    }

    if (cluster.length >= 3) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

/**
 * Generate narrative sections.
 */
function generateNarratives(
  grades: any,
  coldSpots: ColdSpot[],
  patterns: AsymmetricPattern[],
  alignment: any,
): NarrativeSection[] {
  const sections: NarrativeSection[] = [];

  // Executive Summary
  sections.push({
    title: 'Executive Summary',
    emoji: '📊',
    content: [
      `Project grade: ${grades.grade} (${grades.total_units} units)`,
      `Legitimacy score: ${calculateLegitimacy(grades, alignment)}%`,
      `${coldSpots.length} categories require attention`,
      `${patterns.filter(p => p.severity === 'critical').length} critical patterns identified`,
    ],
  });

  // Cold Spot Analysis
  if (coldSpots.length > 0) {
    sections.push({
      title: 'Cold Spot Analysis',
      emoji: '🧊',
      content: coldSpots.slice(0, 5).map(cs =>
        `${cs.temperature} ${cs.category}: ${cs.interpretation}`
      ),
      recommendations: [
        'Focus on frozen categories first for maximum impact',
        'Address clusters before individual spots',
        'Validate alignment between documentation and implementation',
      ],
    });
  }

  // Pattern Analysis
  if (patterns.length > 0) {
    sections.push({
      title: 'Asymmetric Patterns',
      emoji: '🔍',
      content: patterns.slice(0, 3).map(p =>
        `${p.title}: ${p.description} (${p.severity})`
      ),
    });
  }

  // Business Context
  sections.push({
    title: 'Business Impact',
    emoji: '💼',
    content: generateBusinessContext(grades),
  });

  return sections;
}

/**
 * Calculate legitimacy score.
 */
function calculateLegitimacy(grades: any, alignment: any): number {
  const processHealth = grades.grade === 'A' ? 1.0 : grades.grade === 'B' ? 0.7 : grades.grade === 'C' ? 0.5 : 0.3;
  const outcomeReality = Math.max(0, 1 - (grades.total_units / 10000));
  const orthogonality = alignment.alignment?.overall || 0.9;

  return Math.round(processHealth * outcomeReality * orthogonality * 100);
}

/**
 * Generate business context.
 */
function generateBusinessContext(grades: any): string[] {
  const context: string[] = [];

  if (grades.grade === 'A') {
    context.push('INSURABLE: Excellent alignment, market-ready');
    context.push('Competitive advantage: Strong technical foundation');
  } else if (grades.grade === 'B') {
    context.push('GOOD: Solid foundation with clear improvement path');
    context.push('Competitive position: Above average, minor gaps');
  } else if (grades.grade === 'C') {
    context.push('NEEDS ATTENTION: Clear work needed for market readiness');
    context.push('Risk: Medium - systematic improvements required');
  } else {
    context.push('UNINSURABLE: Systematic work needed across dimensions');
    context.push('Risk: High - architectural remediation required');
  }

  return context;
}

/**
 * Generate prioritized recommendations.
 */
function generateRecommendations(
  coldSpots: ColdSpot[],
  patterns: AsymmetricPattern[],
  grades: any,
): AnalysisResult['recommendations'] {
  const recs: AnalysisResult['recommendations'] = [];

  // Critical patterns first
  patterns.filter(p => p.severity === 'critical').forEach(p => {
    recs.push({
      priority: 'critical',
      category: p.categories[0],
      action: `Address ${p.title}: ${p.description}`,
      impact: p.impact,
      units_reduction: Math.round(grades.total_units * 0.3),
    });
  });

  // Coldest spots
  coldSpots.slice(0, 3).forEach(cs => {
    recs.push({
      priority: cs.severity === 'frozen' ? 'critical' : 'high',
      category: cs.category,
      action: cs.interpretation,
      impact: cs.evidence.join(', '),
      units_reduction: Math.round(grades.total_units * 0.15),
    });
  });

  return recs.slice(0, 5);
}

/**
 * Run step 6: analysis and narrative generation.
 */
export async function run(runDir: string, stepDir: string): Promise<void> {
  console.log('[step-6] Generating analysis narratives...');

  // Load previous steps
  const gradesPath = join(runDir, '4-grades-statistics', '4-grades-statistics.json');
  const alignmentPath = join(runDir, '5-goal-alignment', '5-goal-alignment.json');

  const grades = JSON.parse(readFileSync(gradesPath, 'utf-8'));
  const alignment = JSON.parse(readFileSync(alignmentPath, 'utf-8'));

  // Analyze
  const coldSpots = findColdSpots(grades, alignment);
  const patterns = findAsymmetricPatterns(coldSpots, grades, alignment);
  const narratives = generateNarratives(grades, coldSpots, patterns, alignment);
  const recommendations = generateRecommendations(coldSpots, patterns, grades);

  const legitimacy = calculateLegitimacy(grades, alignment);
  const processHealth = grades.grade === 'A' ? 'High' : grades.grade === 'B' ? 'Medium' : 'Low';

  const result: AnalysisResult = {
    step: 6,
    name: 'analysis-narratives',
    timestamp: new Date().toISOString(),
    metadata: {
      agent: 'Agent 6: Analysis & Narrative Generator',
      analysis_type: 'Cold Spot Analysis, Asymmetric Patterns & Business Context',
      input_files: [
        '0-outcome-requirements.json',
        '1-indexed-keywords.json',
        '2-categories-balanced.json',
        '3-presence-matrix.json',
        '4-grades-statistics.json',
        '5-goal-alignment.json',
      ],
      framework: 'Legitimacy Framework + Zero Multiplier Narrative + Business Context',
    },
    executive_summary: {
      grade: grades.grade,
      trust_debt_units: grades.total_units,
      grade_description: grades.description || '',
      legitimacy_score: `${legitimacy}%`,
      process_health: processHealth,
      critical_finding: coldSpots[0]?.interpretation || 'No critical issues',
      business_impact: generateBusinessContext(grades)[0] || '',
    },
    cold_spots: {
      total: coldSpots.length,
      by_severity: {
        frozen: coldSpots.filter(cs => cs.severity === 'frozen').length,
        arctic: coldSpots.filter(cs => cs.severity === 'arctic').length,
        cold: coldSpots.filter(cs => cs.severity === 'cold').length,
        cool: coldSpots.filter(cs => cs.severity === 'cool').length,
      },
      top_10: coldSpots.slice(0, 10),
    },
    asymmetric_patterns: patterns,
    narratives,
    zero_multiplier_analysis: {
      core_principle: 'Excellence in execution requires alignment across dimensions',
      calculation: {
        process_health: processHealth,
        outcome_reality: Math.max(0, 1 - (grades.total_units / 10000)),
        legitimacy_score: legitimacy / 100,
        interpretation: `${grades.grade} status (${grades.total_units} units) with ${legitimacy}% legitimacy`,
      },
      mathematical_foundation: {
        legitimacy_formula: 'ProcessHealth × OutcomeReality × OrthogonalityScore',
        current_calculation: `ProcessHealth(${processHealth}) × OutcomeReality × Orthogonality = ${legitimacy}%`,
        theoretical_maximum: '1.0 × 1.0 × 0.99 = 99% (with <1% correlation)',
        improvement_potential: `${100 - legitimacy}% legitimacy gain available`,
      },
    },
    recommendations,
    stats: {
      total_cold_spots: coldSpots.length,
      critical_patterns: patterns.filter(p => p.severity === 'critical').length,
      legitimacy_score: legitimacy,
      orthogonality_score: Math.round((alignment.alignment?.overall || 0.9) * 100),
    },
  };

  writeFileSync(
    join(stepDir, '6-analysis-narratives.json'),
    JSON.stringify(result, null, 2),
  );

  console.log(`[step-6] Generated narratives — ${coldSpots.length} cold spots, ${patterns.length} patterns, ${recommendations.length} recommendations`);
  console.log(`[step-6] Legitimacy: ${legitimacy}%, Process Health: ${processHealth}`);
}
