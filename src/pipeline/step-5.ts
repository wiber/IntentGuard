/**
 * src/pipeline/step-5.ts — Goal Alignment
 *
 * Aligns trust-debt grades with declared goals.
 * Detects drift between stated intent and actual execution.
 *
 * Core thesis: When git commits drift from documentation,
 * products drift from user goals at the exact same rate.
 *
 * INPUTS:  step-4 grades, step-0 raw materials
 * OUTPUTS: step-5-goal-alignment.json (drift analysis)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TRUST_DEBT_CATEGORIES, type TrustDebtCategory } from '../auth/geometric.js';

interface GoalDrift {
  category: TrustDebtCategory;
  intentScore: number;  // What docs say we should focus on
  realityScore: number; // What pipeline says we actually do
  drift: number;        // intent - reality (positive = underfocused)
  severity: 'aligned' | 'minor' | 'significant' | 'critical';
}

interface AlignmentResult {
  step: 5;
  name: 'goal-alignment';
  timestamp: string;
  alignment: {
    overall: number; // 0.0-1.0
    grade: string;
    interpretation: string;
  };
  drifts: GoalDrift[];
  insights: string[];
  recommendations: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    action: string;
    impact: string;
  }>;
  stats: {
    alignedCategories: number;
    driftingCategories: number;
    maxDrift: number;
    avgDrift: number;
  };
}

/**
 * Infer intent scores from document content patterns.
 * Documents that mention a category more = higher intent for that category.
 */
function inferIntentScores(rawMaterials: { documents: Array<{ type: string; content: string }> }): Record<TrustDebtCategory, number> {
  const scores: Record<string, number> = {};
  for (const cat of TRUST_DEBT_CATEGORIES) {
    scores[cat] = 0;
  }

  // Only use tracked documents (not commits) for intent
  const intentDocs = rawMaterials.documents.filter(d => d.type === 'document' || d.type === 'blog');
  if (intentDocs.length === 0) {
    // Default: assume equal intent across all categories
    for (const cat of TRUST_DEBT_CATEGORIES) {
      scores[cat] = 0.5;
    }
    return scores as Record<TrustDebtCategory, number>;
  }

  // Simple keyword frequency for intent inference
  const INTENT_KEYWORDS: Partial<Record<TrustDebtCategory, string[]>> = {
    security: ['security', 'auth', 'protect', 'safe'],
    reliability: ['reliable', 'uptime', 'available', 'stable'],
    code_quality: ['quality', 'clean', 'refactor', 'maintainable'],
    testing: ['test', 'coverage', 'verify', 'validate'],
    documentation: ['document', 'guide', 'readme', 'spec'],
    communication: ['communicate', 'notify', 'update', 'report'],
    innovation: ['innovate', 'novel', 'breakthrough', 'patent'],
    accountability: ['accountable', 'measure', 'track', 'deliver'],
    transparency: ['transparent', 'open', 'visible', 'public'],
    user_focus: ['user', 'customer', 'experience', 'feedback'],
  };

  const totalContent = intentDocs.map(d => d.content.toLowerCase()).join(' ');
  let maxCount = 0;

  for (const [cat, keywords] of Object.entries(INTENT_KEYWORDS)) {
    let count = 0;
    for (const kw of keywords!) {
      const matches = totalContent.match(new RegExp(kw, 'gi'));
      count += matches?.length || 0;
    }
    scores[cat] = count;
    maxCount = Math.max(maxCount, count);
  }

  // Normalize to 0.0-1.0
  if (maxCount > 0) {
    for (const cat of TRUST_DEBT_CATEGORIES) {
      scores[cat] = Math.min(1.0, (scores[cat] || 0) / maxCount);
      // Categories without keywords default to 0.5
      if (!INTENT_KEYWORDS[cat]) scores[cat] = 0.5;
    }
  }

  return scores as Record<TrustDebtCategory, number>;
}

/**
 * Run step 5: goal alignment analysis.
 */
export async function run(runDir: string, stepDir: string): Promise<void> {
  console.log('[step-5] Analyzing goal alignment...');

  // Load step 4 grades and step 0 raw materials
  const gradesPath = join(runDir, '4-grades-statistics', '4-grades-statistics.json');
  const rawPath = join(runDir, '0-raw-materials', '0-raw-materials.json');

  const grades = JSON.parse(readFileSync(gradesPath, 'utf-8'));
  const rawMaterials = JSON.parse(readFileSync(rawPath, 'utf-8'));

  // Infer intent from documents
  const intentScores = inferIntentScores(rawMaterials);

  // Calculate drift per category
  const drifts: GoalDrift[] = [];
  let totalDrift = 0;

  for (const cat of TRUST_DEBT_CATEGORIES) {
    const intentScore = intentScores[cat] || 0.5;
    const realityScore = grades.categories[cat]?.score || 0;
    const drift = intentScore - realityScore;
    const absDrift = Math.abs(drift);

    const severity: GoalDrift['severity'] =
      absDrift < 0.1 ? 'aligned' :
      absDrift < 0.25 ? 'minor' :
      absDrift < 0.5 ? 'significant' : 'critical';

    drifts.push({ category: cat, intentScore, realityScore, drift, severity });
    totalDrift += absDrift;
  }

  // Sort by absolute drift descending
  drifts.sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));

  // Overall alignment
  const avgDrift = totalDrift / TRUST_DEBT_CATEGORIES.length;
  const overall = Math.max(0, 1 - avgDrift);
  const alignedCount = drifts.filter(d => d.severity === 'aligned').length;

  // Generate insights
  const insights: string[] = [];
  const criticalDrifts = drifts.filter(d => d.severity === 'critical');
  const significantDrifts = drifts.filter(d => d.severity === 'significant');

  if (criticalDrifts.length > 0) {
    insights.push(`${criticalDrifts.length} categories with critical drift — intent-reality gap exceeds 50%`);
  }
  if (overall > 0.8) {
    insights.push('Strong overall alignment between stated goals and execution');
  } else if (overall < 0.5) {
    insights.push('Severe misalignment — documentation does not match implementation patterns');
  }

  // Top underfocused categories (positive drift = docs say important but low execution)
  const underfocused = drifts.filter(d => d.drift > 0.2);
  if (underfocused.length > 0) {
    insights.push(`Underfocused: ${underfocused.map(d => d.category).join(', ')} — mentioned in docs but lacking in execution`);
  }

  // Top overfocused categories (negative drift = lots of execution but not in docs)
  const overfocused = drifts.filter(d => d.drift < -0.2);
  if (overfocused.length > 0) {
    insights.push(`Overfocused: ${overfocused.map(d => d.category).join(', ')} — heavy execution without documentation backing`);
  }

  // Recommendations
  const recommendations = drifts
    .filter(d => d.severity !== 'aligned')
    .slice(0, 5)
    .map(d => ({
      priority: d.severity === 'critical' ? 'critical' as const :
                d.severity === 'significant' ? 'high' as const : 'medium' as const,
      category: d.category,
      action: d.drift > 0
        ? `Increase execution focus on ${d.category} — intent exceeds reality by ${(d.drift * 100).toFixed(0)}%`
        : `Document or deprioritize ${d.category} — execution exceeds stated intent by ${(Math.abs(d.drift) * 100).toFixed(0)}%`,
      impact: `Reduces drift from ${(Math.abs(d.drift) * 100).toFixed(0)}% to alignment`,
    }));

  const gradeStr =
    overall >= 0.9 ? 'A' :
    overall >= 0.8 ? 'B' :
    overall >= 0.7 ? 'C' :
    overall >= 0.5 ? 'D' : 'F';

  const result: AlignmentResult = {
    step: 5,
    name: 'goal-alignment',
    timestamp: new Date().toISOString(),
    alignment: {
      overall: Math.round(overall * 1000) / 1000,
      grade: gradeStr,
      interpretation: overall >= 0.8 ? 'Strong alignment — autonomous operation viable'
        : overall >= 0.6 ? 'Moderate alignment — supervised autonomy recommended'
        : 'Weak alignment — manual oversight required',
    },
    drifts,
    insights,
    recommendations,
    stats: {
      alignedCategories: alignedCount,
      driftingCategories: TRUST_DEBT_CATEGORIES.length - alignedCount,
      maxDrift: Math.round(Math.abs(drifts[0]?.drift || 0) * 1000) / 1000,
      avgDrift: Math.round(avgDrift * 1000) / 1000,
    },
  };

  writeFileSync(
    join(stepDir, '5-goal-alignment.json'),
    JSON.stringify(result, null, 2),
  );

  console.log(`[step-5] Alignment: ${(overall * 100).toFixed(1)}% (${gradeStr}) — ${alignedCount} aligned, ${criticalDrifts.length} critical, ${significantDrifts.length} significant`);
}
