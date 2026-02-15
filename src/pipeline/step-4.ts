/**
 * src/pipeline/step-4.ts — Grades & Statistics
 *
 * Assigns letter grades per trust-debt category based on frequency data.
 * This step produces the FIM Identity Vector — the core of geometric auth.
 *
 * INPUTS:  step-3 frequency analysis
 * OUTPUTS: 4-grades-statistics.json (letter grades + scores per category)
 *
 * CRITICAL: This step feeds directly into FIM geometric auth.
 * The identity vector IS the pipeline output. No manual override. Immutable.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TRUST_DEBT_CATEGORIES, type TrustDebtCategory } from '../auth/geometric.js';

interface CategoryGrade {
  category: TrustDebtCategory;
  grade: string;
  score: number; // 0.0-1.0
  percentile: number;
  trend: 'improving' | 'stable' | 'degrading';
  evidence: {
    totalStrength: number;
    documentCount: number;
    avgStrength: number;
    percentOfCorpus: number;
  };
}

interface GradesResult {
  step: 4;
  name: 'grades-statistics';
  timestamp: string;
  categories: Record<string, CategoryGrade>;
  sovereignty: {
    score: number;
    grade: string;
    interpretation: string;
  };
  distribution: {
    gradeDistribution: Record<string, number>;
    meanScore: number;
    medianScore: number;
    stdDeviation: number;
  };
  stats: {
    totalCategories: number;
    passingCategories: number;
    failingCategories: number;
    topCategory: string;
    bottomCategory: string;
  };
}

/** Map a 0.0-1.0 score to a letter grade */
function scoreToGrade(score: number): string {
  if (score >= 0.95) return 'A+';
  if (score >= 0.90) return 'A';
  if (score >= 0.85) return 'A-';
  if (score >= 0.80) return 'B+';
  if (score >= 0.75) return 'B';
  if (score >= 0.70) return 'B-';
  if (score >= 0.65) return 'C+';
  if (score >= 0.60) return 'C';
  if (score >= 0.55) return 'C-';
  if (score >= 0.45) return 'D+';
  if (score >= 0.40) return 'D';
  if (score >= 0.35) return 'D-';
  return 'F';
}

/** Calculate standard deviation */
function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Calculate median */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Run step 4: compute grades and statistics.
 */
export async function run(runDir: string, stepDir: string): Promise<void> {
  console.log('[step-4] Computing grades and statistics...');

  // Load step 3 output
  const freqPath = join(runDir, '3-frequency-analysis', '3-frequency-analysis.json');
  const freqData = JSON.parse(readFileSync(freqPath, 'utf-8'));

  const categories: Record<string, CategoryGrade> = {};
  const scores: number[] = [];

  // Find max strength for normalization
  const maxStrength = Math.max(
    ...freqData.frequencies.map((f: { totalStrength: number }) => f.totalStrength),
    0.001,
  );

  for (const freq of freqData.frequencies) {
    // Normalize to 0.0-1.0 using relative strength
    // Categories with higher document counts and strength get better scores
    const strengthScore = freq.totalStrength / maxStrength;
    const coverageScore = Math.min(1.0, freq.documentCount / Math.max(1, freqData.stats.categoriesActive));
    const avgScore = freq.avgStrength;

    // Weighted composite score
    const score = Math.min(1.0, (strengthScore * 0.4 + coverageScore * 0.3 + avgScore * 0.3));

    const grade = scoreToGrade(score);
    scores.push(score);

    categories[freq.category] = {
      category: freq.category,
      grade,
      score: Math.round(score * 1000) / 1000,
      percentile: 0, // Filled in after all scores computed
      trend: 'stable', // Would compare to previous run
      evidence: {
        totalStrength: freq.totalStrength,
        documentCount: freq.documentCount,
        avgStrength: freq.avgStrength,
        percentOfCorpus: freq.percentOfCorpus,
      },
    };
  }

  // Fill in categories that had no signals
  for (const cat of TRUST_DEBT_CATEGORIES) {
    if (!categories[cat]) {
      categories[cat] = {
        category: cat,
        grade: 'F',
        score: 0,
        percentile: 0,
        trend: 'stable',
        evidence: { totalStrength: 0, documentCount: 0, avgStrength: 0, percentOfCorpus: 0 },
      };
      scores.push(0);
    }
  }

  // Calculate percentiles
  const sortedScores = [...scores].sort((a, b) => a - b);
  for (const cat of Object.values(categories)) {
    const rank = sortedScores.findIndex(s => s >= cat.score);
    cat.percentile = Math.round((rank / Math.max(1, sortedScores.length - 1)) * 100);
  }

  // Sovereignty score = mean of all category scores
  const meanScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const sovereigntyGrade = scoreToGrade(meanScore);

  // Grade distribution
  const gradeDistribution: Record<string, number> = {};
  for (const cat of Object.values(categories)) {
    gradeDistribution[cat.grade] = (gradeDistribution[cat.grade] || 0) + 1;
  }

  // Find top and bottom categories
  const sorted = Object.values(categories).sort((a, b) => b.score - a.score);
  const passingCategories = sorted.filter(c => c.score >= 0.6).length;

  const result: GradesResult = {
    step: 4,
    name: 'grades-statistics',
    timestamp: new Date().toISOString(),
    categories,
    sovereignty: {
      score: Math.round(meanScore * 1000) / 1000,
      grade: sovereigntyGrade,
      interpretation: meanScore >= 0.8 ? 'High sovereignty — autonomous operation safe'
        : meanScore >= 0.6 ? 'Moderate sovereignty — supervised operation'
        : meanScore >= 0.4 ? 'Low sovereignty — restricted operation'
        : 'Critical — manual approval required for all actions',
    },
    distribution: {
      gradeDistribution,
      meanScore: Math.round(meanScore * 1000) / 1000,
      medianScore: Math.round(median(scores) * 1000) / 1000,
      stdDeviation: Math.round(stdDev(scores) * 1000) / 1000,
    },
    stats: {
      totalCategories: TRUST_DEBT_CATEGORIES.length,
      passingCategories,
      failingCategories: TRUST_DEBT_CATEGORIES.length - passingCategories,
      topCategory: sorted[0]?.category || 'none',
      bottomCategory: sorted[sorted.length - 1]?.category || 'none',
    },
  };

  writeFileSync(
    join(stepDir, '4-grades-statistics.json'),
    JSON.stringify(result, null, 2),
  );

  console.log(`[step-4] Sovereignty: ${meanScore.toFixed(3)} (${sovereigntyGrade}) — ${passingCategories}/${TRUST_DEBT_CATEGORIES.length} passing`);
}
