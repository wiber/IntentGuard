/**
 * src/pipeline/step-6.ts — Symmetric Matrix
 *
 * Builds a 20x20 cosine similarity matrix between trust-debt categories.
 * Shows which categories co-occur (correlated) and which are orthogonal.
 *
 * INPUTS:  step-2 organic extraction (per-document signals)
 * OUTPUTS: step-6-symmetric-matrix.json (20x20 correlation matrix)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TRUST_DEBT_CATEGORIES, type TrustDebtCategory } from '../auth/geometric.js';

interface MatrixCell {
  row: TrustDebtCategory;
  col: TrustDebtCategory;
  similarity: number;
  coOccurrences: number;
  isDiagonal: boolean;
}

interface MatrixResult {
  step: 6;
  name: 'symmetric-matrix';
  timestamp: string;
  matrix: number[][]; // 20x20 similarity values
  labels: TrustDebtCategory[];
  cells: MatrixCell[];
  correlations: {
    strongPositive: Array<{ pair: [string, string]; similarity: number }>;
    strongNegative: Array<{ pair: [string, string]; similarity: number }>;
    orthogonal: Array<{ pair: [string, string]; similarity: number }>;
  };
  stats: {
    matrixSize: number;
    avgSimilarity: number;
    maxOffDiagonal: number;
    minOffDiagonal: number;
    orthogonalPairs: number;
    correlatedPairs: number;
  };
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

/**
 * Run step 6: build symmetric correlation matrix.
 */
export async function run(runDir: string, stepDir: string): Promise<void> {
  console.log('[step-6] Building symmetric matrix...');

  // Load step 2 output
  const extractionPath = join(runDir, '2-organic-extraction', '2-organic-extraction.json');
  const extraction = JSON.parse(readFileSync(extractionPath, 'utf-8'));

  const n = TRUST_DEBT_CATEGORIES.length; // 20
  const docCount = extraction.documents.length;

  // Build document-category vectors
  // Each category gets a vector of length docCount (strength per document)
  const categoryVectors: Record<string, number[]> = {};
  for (const cat of TRUST_DEBT_CATEGORIES) {
    categoryVectors[cat] = new Array(docCount).fill(0);
  }

  for (let d = 0; d < docCount; d++) {
    const doc = extraction.documents[d];
    for (const signal of doc.signals) {
      if (categoryVectors[signal.category]) {
        categoryVectors[signal.category][d] = signal.strength;
      }
    }
  }

  // Build 20x20 similarity matrix
  const matrix: number[][] = [];
  const cells: MatrixCell[] = [];
  let totalOffDiag = 0;
  let countOffDiag = 0;
  let maxOffDiag = -1;
  let minOffDiag = 2;

  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const sim = cosineSimilarity(
        categoryVectors[TRUST_DEBT_CATEGORIES[i]],
        categoryVectors[TRUST_DEBT_CATEGORIES[j]],
      );
      const rounded = Math.round(sim * 1000) / 1000;
      row.push(rounded);

      // Count co-occurrences
      let coOccurrences = 0;
      for (let d = 0; d < docCount; d++) {
        if (categoryVectors[TRUST_DEBT_CATEGORIES[i]][d] > 0 &&
            categoryVectors[TRUST_DEBT_CATEGORIES[j]][d] > 0) {
          coOccurrences++;
        }
      }

      cells.push({
        row: TRUST_DEBT_CATEGORIES[i],
        col: TRUST_DEBT_CATEGORIES[j],
        similarity: rounded,
        coOccurrences,
        isDiagonal: i === j,
      });

      if (i !== j) {
        totalOffDiag += rounded;
        countOffDiag++;
        maxOffDiag = Math.max(maxOffDiag, rounded);
        minOffDiag = Math.min(minOffDiag, rounded);
      }
    }
    matrix.push(row);
  }

  // Find notable correlations
  const strongPositive: MatrixResult['correlations']['strongPositive'] = [];
  const strongNegative: MatrixResult['correlations']['strongNegative'] = [];
  const orthogonal: MatrixResult['correlations']['orthogonal'] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = matrix[i][j];
      const pair: [string, string] = [TRUST_DEBT_CATEGORIES[i], TRUST_DEBT_CATEGORIES[j]];

      if (sim > 0.5) {
        strongPositive.push({ pair, similarity: sim });
      } else if (sim < -0.3) {
        strongNegative.push({ pair, similarity: sim });
      } else if (Math.abs(sim) < 0.05) {
        orthogonal.push({ pair, similarity: sim });
      }
    }
  }

  strongPositive.sort((a, b) => b.similarity - a.similarity);
  strongNegative.sort((a, b) => a.similarity - b.similarity);

  const avgSimilarity = countOffDiag > 0 ? totalOffDiag / countOffDiag : 0;

  const result: MatrixResult = {
    step: 6,
    name: 'symmetric-matrix',
    timestamp: new Date().toISOString(),
    matrix,
    labels: [...TRUST_DEBT_CATEGORIES],
    cells,
    correlations: {
      strongPositive: strongPositive.slice(0, 10),
      strongNegative: strongNegative.slice(0, 10),
      orthogonal: orthogonal.slice(0, 10),
    },
    stats: {
      matrixSize: n,
      avgSimilarity: Math.round(avgSimilarity * 1000) / 1000,
      maxOffDiagonal: maxOffDiag === -1 ? 0 : maxOffDiag,
      minOffDiagonal: minOffDiag === 2 ? 0 : minOffDiag,
      orthogonalPairs: orthogonal.length,
      correlatedPairs: strongPositive.length,
    },
  };

  writeFileSync(
    join(stepDir, '6-symmetric-matrix.json'),
    JSON.stringify(result, null, 2),
  );

  console.log(`[step-6] 20x20 matrix built — avg similarity: ${avgSimilarity.toFixed(3)}, ${strongPositive.length} correlated pairs, ${orthogonal.length} orthogonal pairs`);
}
