/**
 * Identity Vector Loader
 *
 * Loads identity vectors from Trust Debt pipeline step-4 output.
 * Converts 20-category grades to 20-dimensional float vectors.
 *
 * @module identity-vector
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TRUST_DEBT_CATEGORIES, type TrustDebtCategory, type IdentityVector } from './geometric.js';

// ─── Types ──────────────────────────────────────────────────────────────

/** Step-4 pipeline output structure */
interface Step4Output {
  metadata: {
    agent: string;
    timestamp: string;
  };
  trust_debt_calculation: {
    total_units: number;
    grade: string;
    grade_emoji: string;
  };
  category_performance: Record<string, {
    units: number;
    percentage: string;
    grade: string;
    status: string;
    subcategories?: Record<string, number>;
  }>;
  statistical_analysis?: {
    orthogonality_score?: number;
  };
  process_health?: {
    orthogonality_score?: number;
  };
}

/** Cache entry for loaded identity vectors */
interface CacheEntry {
  vector: IdentityVector;
  loadedAt: number;
  sourceFile: string;
}

// ─── Constants ──────────────────────────────────────────────────────────

/**
 * Mapping from trust-debt pipeline categories to TRUST_DEBT_CATEGORIES.
 * The pipeline output has 6 main categories (A-F), but we normalize to 20 standard dimensions.
 */
const PIPELINE_CATEGORY_MAPPING: Record<string, TrustDebtCategory[]> = {
  // A🚀_CoreEngine → core technical capabilities
  'A🚀_CoreEngine': ['code_quality', 'testing', 'innovation', 'domain_expertise'],
  // B🔒_Documentation → communication and transparency
  'B🔒_Documentation': ['documentation', 'communication', 'transparency', 'user_focus'],
  // C💨_Visualization → user experience and collaboration
  'C💨_Visualization': ['user_focus', 'collaboration', 'adaptability', 'innovation'],
  // D🧠_Integration → reliability and data integrity
  'D🧠_Integration': ['reliability', 'data_integrity', 'process_adherence', 'risk_assessment'],
  // E🎨_BusinessLayer → strategy and accountability
  'E🎨_BusinessLayer': ['accountability', 'time_management', 'resource_efficiency', 'ethical_alignment'],
  // F⚡_Agents → security and compliance
  'F⚡_Agents': ['security', 'compliance', 'process_adherence', 'risk_assessment'],
};

/**
 * Grade to score conversion (lower trust debt = higher score).
 * Grades: A (0-500 units), B (501-1500), C (1501-3000), D (3001+)
 */
const GRADE_TO_SCORE: Record<string, number> = {
  'A': 1.0,   // Excellent
  'B': 0.75,  // Good
  'C': 0.5,   // Needs attention
  'D': 0.25,  // Requires work
};

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

// ─── Cache ──────────────────────────────────────────────────────────────

const cache = new Map<string, CacheEntry>();

/**
 * Clear expired cache entries.
 */
function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.loadedAt > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

/**
 * Get cached identity vector if available and fresh.
 */
function getCached(cacheKey: string): IdentityVector | null {
  clearExpiredCache();
  const entry = cache.get(cacheKey);
  if (entry && Date.now() - entry.loadedAt < CACHE_TTL_MS) {
    return entry.vector;
  }
  return null;
}

/**
 * Store identity vector in cache.
 */
function setCache(cacheKey: string, vector: IdentityVector, sourceFile: string): void {
  cache.set(cacheKey, {
    vector,
    loadedAt: Date.now(),
    sourceFile,
  });
}

// ─── Core Functions ─────────────────────────────────────────────────────

/**
 * Load identity vector from step-4 pipeline output.
 *
 * @param step4Path - Path to 4-grades-statistics.json file
 * @param userId - User identifier (defaults to 'system')
 * @returns Identity vector with 20-dimensional category scores
 *
 * @example
 * ```ts
 * const vector = loadIdentityVector('./4-grades-statistics.json');
 * console.log(vector.categoryScores.security); // 0.75
 * ```
 */
export function loadIdentityVector(
  step4Path: string,
  userId: string = 'system'
): IdentityVector {
  // Check cache first
  const cacheKey = `${userId}:${step4Path}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // Validate file exists
  if (!existsSync(step4Path)) {
    throw new Error(`Step-4 output not found: ${step4Path}`);
  }

  // Load and parse JSON
  const rawData = readFileSync(step4Path, 'utf-8');
  const data: Step4Output = JSON.parse(rawData);

  // Initialize category scores (all 20 dimensions)
  const categoryScores: Partial<Record<TrustDebtCategory, number>> = {};
  const categoryContributions: Partial<Record<TrustDebtCategory, number[]>> = {};

  // Process each pipeline category
  for (const [pipelineCat, perf] of Object.entries(data.category_performance)) {
    const mappedCategories = PIPELINE_CATEGORY_MAPPING[pipelineCat];
    if (!mappedCategories) {
      console.warn(`Unknown pipeline category: ${pipelineCat}`);
      continue;
    }

    const score = GRADE_TO_SCORE[perf.grade] ?? 0.25;

    // Distribute score to mapped trust-debt categories
    for (const trustCat of mappedCategories) {
      if (!categoryContributions[trustCat]) {
        categoryContributions[trustCat] = [];
      }
      categoryContributions[trustCat].push(score);
    }
  }

  // Average contributions for each category
  for (const cat of TRUST_DEBT_CATEGORIES) {
    const contributions = categoryContributions[cat];
    if (contributions && contributions.length > 0) {
      categoryScores[cat] = contributions.reduce((a, b) => a + b, 0) / contributions.length;
    } else {
      // Default score if no mapping exists
      categoryScores[cat] = 0.5;
    }
  }

  // Calculate sovereignty score (weighted by orthogonality and overall grade)
  const overallGrade = data.trust_debt_calculation.grade;
  const overallScore = GRADE_TO_SCORE[overallGrade] ?? 0.25;
  const rawOrthogonality = data.process_health?.orthogonality_score ??
                           data.statistical_analysis?.orthogonality_score ??
                           0;
  const orthogonalityScore = rawOrthogonality / 100;
  const sovereigntyScore = (overallScore * 0.7) + (orthogonalityScore * 0.3);

  const vector: IdentityVector = {
    userId,
    categoryScores,
    sovereigntyScore,
    lastUpdated: data.metadata.timestamp,
  };

  // Cache the result
  setCache(cacheKey, vector, step4Path);

  return vector;
}

/**
 * Load identity vector from default pipeline location.
 * Checks common locations for step-4 output.
 *
 * @param userId - User identifier (defaults to 'system')
 * @returns Identity vector or null if not found
 *
 * @example
 * ```ts
 * const vector = loadIdentityVectorDefault();
 * if (vector) {
 *   console.log('Sovereignty score:', vector.sovereigntyScore);
 * }
 * ```
 */
export function loadIdentityVectorDefault(userId: string = 'system'): IdentityVector | null {
  const possiblePaths = [
    '4-grades-statistics.json',
    join(process.cwd(), '4-grades-statistics.json'),
    join(process.cwd(), 'data', 'pipeline-output', '4-grades-statistics.json'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return loadIdentityVector(path, userId);
    }
  }

  return null;
}

/**
 * Normalize a raw 20-dimensional vector to match TRUST_DEBT_CATEGORIES order.
 *
 * @param rawVector - Array of 20 float values
 * @returns Identity vector with named categories
 *
 * @example
 * ```ts
 * const raw = [0.9, 0.8, 0.7, ...]; // 20 values
 * const vector = normalizeRawVector(raw);
 * console.log(vector.categoryScores.security); // 0.9
 * ```
 */
export function normalizeRawVector(
  rawVector: number[],
  userId: string = 'system'
): IdentityVector {
  if (rawVector.length !== 20) {
    throw new Error(`Expected 20-dimensional vector, got ${rawVector.length}`);
  }

  const categoryScores: Partial<Record<TrustDebtCategory, number>> = {};
  TRUST_DEBT_CATEGORIES.forEach((cat, i) => {
    categoryScores[cat] = rawVector[i];
  });

  // Sovereignty is the average of all category scores
  const sovereigntyScore = rawVector.reduce((a, b) => a + b, 0) / rawVector.length;

  return {
    userId,
    categoryScores,
    sovereigntyScore,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Convert identity vector to raw 20-dimensional array.
 *
 * @param vector - Identity vector with named categories
 * @returns Array of 20 float values in TRUST_DEBT_CATEGORIES order
 *
 * @example
 * ```ts
 * const vector = loadIdentityVector('./4-grades-statistics.json');
 * const raw = vectorToRaw(vector);
 * console.log(raw); // [0.75, 0.8, 0.6, ...]
 * ```
 */
export function vectorToRaw(vector: IdentityVector): number[] {
  return TRUST_DEBT_CATEGORIES.map(cat => vector.categoryScores[cat] ?? 0.5);
}

/**
 * Clear all cached identity vectors.
 * Useful for testing or forcing fresh loads.
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats() {
  clearExpiredCache();
  return {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([key, entry]) => ({
      key,
      sourceFile: entry.sourceFile,
      loadedAt: new Date(entry.loadedAt).toISOString(),
      age: Date.now() - entry.loadedAt,
    })),
  };
}
