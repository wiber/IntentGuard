/**
 * src/pipeline/step-3.ts — Frequency Analysis
 *
 * Computes category frequency counts across the entire corpus.
 * Builds the distribution that feeds into grading (step 4).
 *
 * INPUTS:  step-2 organic extraction
 * OUTPUTS: step-3-frequency-analysis.json (category distributions)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TRUST_DEBT_CATEGORIES, type TrustDebtCategory } from '../auth/geometric.js';

interface CategoryFrequency {
  category: TrustDebtCategory;
  totalStrength: number;
  documentCount: number;
  avgStrength: number;
  percentOfCorpus: number;
  rank: number;
  byType: Record<string, { count: number; avgStrength: number }>;
}

interface FrequencyResult {
  step: 3;
  name: 'frequency-analysis';
  timestamp: string;
  frequencies: CategoryFrequency[];
  distribution: {
    entropy: number;
    giniCoefficient: number;
    topHeavy: boolean;
    dominantCategories: string[];
    weakCategories: string[];
  };
  stats: {
    categoriesActive: number;
    categoriesInactive: number;
    totalStrength: number;
    maxStrength: number;
    minActiveStrength: number;
  };
}

/**
 * Calculate Shannon entropy of a distribution.
 */
function shannonEntropy(values: number[]): number {
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;

  let entropy = 0;
  for (const v of values) {
    if (v <= 0) continue;
    const p = v / total;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Calculate Gini coefficient (inequality measure).
 * 0 = perfect equality, 1 = perfect inequality
 */
function giniCoefficient(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;

  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  if (mean === 0) return 0;

  let sumDiff = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumDiff += Math.abs(sorted[i] - sorted[j]);
    }
  }

  return sumDiff / (2 * n * n * mean);
}

/**
 * Run step 3: frequency analysis.
 */
export async function run(runDir: string, stepDir: string): Promise<void> {
  console.log('[step-3] Running frequency analysis...');

  // Load step 2 output
  const extractionPath = join(runDir, '2-organic-extraction', '2-organic-extraction.json');
  const extraction = JSON.parse(readFileSync(extractionPath, 'utf-8'));

  // Build frequency map
  const freqMap = new Map<TrustDebtCategory, {
    totalStrength: number;
    documentCount: number;
    byType: Map<string, { count: number; totalStrength: number }>;
  }>();

  for (const cat of TRUST_DEBT_CATEGORIES) {
    freqMap.set(cat, { totalStrength: 0, documentCount: 0, byType: new Map() });
  }

  for (const doc of extraction.documents) {
    for (const signal of doc.signals) {
      const entry = freqMap.get(signal.category as TrustDebtCategory);
      if (!entry) continue;

      entry.totalStrength += signal.strength;
      entry.documentCount += 1;

      const typeKey = doc.documentType;
      if (!entry.byType.has(typeKey)) {
        entry.byType.set(typeKey, { count: 0, totalStrength: 0 });
      }
      const typeEntry = entry.byType.get(typeKey)!;
      typeEntry.count += 1;
      typeEntry.totalStrength += signal.strength;
    }
  }

  // Build sorted frequency list
  const totalStrength = [...freqMap.values()].reduce((s, e) => s + e.totalStrength, 0);

  const frequencies: CategoryFrequency[] = [...freqMap.entries()]
    .map(([category, data]) => ({
      category,
      totalStrength: Math.round(data.totalStrength * 1000) / 1000,
      documentCount: data.documentCount,
      avgStrength: data.documentCount > 0
        ? Math.round((data.totalStrength / data.documentCount) * 1000) / 1000
        : 0,
      percentOfCorpus: totalStrength > 0
        ? Math.round((data.totalStrength / totalStrength) * 1000) / 10
        : 0,
      rank: 0,
      byType: Object.fromEntries(
        [...data.byType.entries()].map(([type, td]) => [
          type,
          { count: td.count, avgStrength: Math.round((td.totalStrength / td.count) * 1000) / 1000 },
        ]),
      ),
    }))
    .sort((a, b) => b.totalStrength - a.totalStrength);

  // Assign ranks
  frequencies.forEach((f, i) => { f.rank = i + 1; });

  // Distribution analysis
  const strengths = frequencies.map(f => f.totalStrength);
  const entropy = shannonEntropy(strengths);
  const gini = giniCoefficient(strengths);
  const maxEntropy = Math.log2(TRUST_DEBT_CATEGORIES.length);

  const activeCategories = frequencies.filter(f => f.totalStrength > 0);
  const dominantCategories = frequencies.filter(f => f.percentOfCorpus > 10).map(f => f.category);
  const weakCategories = frequencies.filter(f => f.totalStrength > 0 && f.percentOfCorpus < 2).map(f => f.category);

  const result: FrequencyResult = {
    step: 3,
    name: 'frequency-analysis',
    timestamp: new Date().toISOString(),
    frequencies,
    distribution: {
      entropy: Math.round(entropy * 1000) / 1000,
      giniCoefficient: Math.round(gini * 1000) / 1000,
      topHeavy: entropy < maxEntropy * 0.6,
      dominantCategories,
      weakCategories,
    },
    stats: {
      categoriesActive: activeCategories.length,
      categoriesInactive: TRUST_DEBT_CATEGORIES.length - activeCategories.length,
      totalStrength: Math.round(totalStrength * 1000) / 1000,
      maxStrength: frequencies[0]?.totalStrength || 0,
      minActiveStrength: activeCategories.length > 0
        ? activeCategories[activeCategories.length - 1].totalStrength
        : 0,
    },
  };

  writeFileSync(
    join(stepDir, '3-frequency-analysis.json'),
    JSON.stringify(result, null, 2),
  );

  console.log(`[step-3] ${activeCategories.length}/${TRUST_DEBT_CATEGORIES.length} categories active, entropy=${entropy.toFixed(2)}/${maxEntropy.toFixed(2)}, gini=${gini.toFixed(3)}`);
}
