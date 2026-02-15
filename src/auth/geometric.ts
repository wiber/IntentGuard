/**
 * src/auth/geometric.ts — FIM Geometric Permission Engine
 *
 * The "Guard" in IntentGuard. Permission = tensor overlap.
 *
 * EQUATION:
 *   Permission(user, action) = Identity(user) ∩ Requirement(action) >= Threshold
 *
 * IMPLEMENTATION:
 *   Identity vector = 20-dimensional (one score per trust-debt category, 0.0-1.0)
 *   Action requirement = sparse vector (only relevant categories, with minimums)
 *   Overlap = weighted proportion of categories meeting their minimum
 *   Sovereignty = aggregated trust score from pipeline step 4
 *
 * INPUTS:
 *   - Trust-debt pipeline (steps 0-7) produces category scores + sovereignty
 *   - Action requirement map defines what tools need what scores
 *
 * STATUS: v0.1 — threshold-based overlap. Cosine similarity planned for v0.2.
 */

// ─── Types ──────────────────────────────────────────────────────────────

/** The 20 trust-debt categories that form the identity vector space */
export const TRUST_DEBT_CATEGORIES = [
  'security', 'reliability', 'data_integrity', 'process_adherence',
  'code_quality', 'testing', 'documentation', 'communication',
  'time_management', 'resource_efficiency', 'risk_assessment', 'compliance',
  'innovation', 'collaboration', 'accountability', 'transparency',
  'adaptability', 'domain_expertise', 'user_focus', 'ethical_alignment',
] as const;

export type TrustDebtCategory = typeof TRUST_DEBT_CATEGORIES[number];

/** User identity — scores from the trust-debt pipeline */
export interface IdentityVector {
  userId: string;
  categoryScores: Partial<Record<TrustDebtCategory, number>>;
  sovereigntyScore: number;
  lastUpdated: string;
}

/** What a tool requires to be executed */
export interface ActionRequirement {
  toolName: string;
  requiredScores: Partial<Record<TrustDebtCategory, number>>;
  minSovereignty: number;
  description: string;
}

/** Result of a permission check */
export interface PermissionResult {
  allowed: boolean;
  overlap: number;
  sovereignty: number;
  threshold: number;
  minSovereignty: number;
  failedCategories: string[];
  timestamp: string;
}

// ─── Vector Math Utilities ──────────────────────────────────────────────

/**
 * Convert identity to full 20-dimensional vector.
 * Missing categories default to 0.0.
 */
export function identityToVector(identity: IdentityVector): number[] {
  return TRUST_DEBT_CATEGORIES.map(cat => identity.categoryScores[cat] ?? 0);
}

/**
 * Convert action requirement to full 20-dimensional vector.
 * Missing categories default to 0.0.
 */
export function requirementToVector(requirement: ActionRequirement): number[] {
  return TRUST_DEBT_CATEGORIES.map(cat => requirement.requiredScores[cat] ?? 0);
}

/**
 * Compute dot product of two 20-dimensional vectors.
 *
 * Dot product: A · B = Σ(A[i] × B[i])
 *
 * @returns Sum of component-wise products
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}

/**
 * Compute magnitude (L2 norm) of a vector.
 *
 * Magnitude: ||A|| = √(Σ(A[i]²))
 *
 * @returns Euclidean length of the vector
 */
export function magnitude(v: number[]): number {
  return Math.sqrt(dotProduct(v, v));
}

/**
 * Compute cosine similarity between two vectors.
 *
 * Cosine similarity: cos(θ) = (A · B) / (||A|| × ||B||)
 *
 * Returns value in [-1, 1]:
 *   1.0 = vectors point in same direction (perfect alignment)
 *   0.0 = vectors are orthogonal (no overlap)
 *  -1.0 = vectors point in opposite directions
 *
 * For permission checks, we only use non-negative values (0.0-1.0).
 *
 * @returns Cosine similarity, or 0.0 if either vector has zero magnitude
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const magA = magnitude(a);
  const magB = magnitude(b);

  // Handle zero vectors (undefined angle)
  if (magA === 0 || magB === 0) return 0;

  const dot = dotProduct(a, b);
  const similarity = dot / (magA * magB);

  // Clamp to valid range to handle floating point errors
  return Math.max(-1, Math.min(1, similarity));
}

// ─── Overlap Computation ────────────────────────────────────────────────

/**
 * Compute the geometric overlap between an identity and a requirement.
 *
 * FIM dimensional pass/fail approach:
 *   - For each dimension in the requirement's requiredScores,
 *     check if the identity's score >= the required score
 *   - Overlap = (number of dimensions that pass) / (total required dimensions)
 *   - If no dimensions required, overlap = 1.0 (everything allowed)
 *
 * This aligns with the ThetaSteer categorization confidence-tier model:
 * each dimension either meets threshold or doesn't — binary per axis,
 * proportional across the full requirement vector.
 *
 * Returns value in [0.0, 1.0]:
 *   - 1.0 = all required dimensions met
 *   - 0.5 = half of required dimensions met
 *   - 0.0 = no required dimensions met
 */
export function computeOverlap(
  identity: IdentityVector,
  requirement: ActionRequirement,
): number {
  const entries = Object.entries(requirement.requiredScores) as [TrustDebtCategory, number][];

  // No dimensions required = everything allowed
  if (entries.length === 0) return 1.0;

  let met = 0;
  for (const [category, minScore] of entries) {
    const score = identity.categoryScores[category] ?? 0;
    if (score >= minScore) met++;
  }

  return met / entries.length;
}

/**
 * Compute threshold-based overlap (v0.1 backward compatibility).
 *
 * Proportion of required categories meeting minimums.
 * A category "meets" its requirement if identity[category] >= requirement[category].
 *
 * @deprecated Use computeOverlap() for geometric similarity
 */
export function computeOverlapThreshold(
  identity: IdentityVector,
  requirement: ActionRequirement,
): number {
  const entries = Object.entries(requirement.requiredScores) as [TrustDebtCategory, number][];

  if (entries.length === 0) return 1.0;

  let met = 0;
  for (const [category, minScore] of entries) {
    const score = identity.categoryScores[category] ?? 0;
    if (score >= minScore) met++;
  }

  return met / entries.length;
}

/**
 * Check if a user has permission to execute a tool.
 *
 * Two conditions must be met:
 *   1. Category overlap >= threshold (default 0.8)
 *   2. Sovereignty score >= action's minSovereignty
 */
export function checkPermission(
  identity: IdentityVector,
  requirement: ActionRequirement,
  threshold: number = 0.8,
): PermissionResult {
  const overlap = computeOverlap(identity, requirement);

  const failedCategories: string[] = [];
  for (const [category, minScore] of Object.entries(requirement.requiredScores)) {
    const score = identity.categoryScores[category as TrustDebtCategory] ?? 0;
    if (score < minScore) {
      failedCategories.push(`${category}: ${score.toFixed(2)} < ${minScore}`);
    }
  }

  const allowed = overlap >= threshold && identity.sovereigntyScore >= requirement.minSovereignty;

  return {
    allowed,
    overlap,
    sovereignty: identity.sovereigntyScore,
    threshold,
    minSovereignty: requirement.minSovereignty,
    failedCategories,
    timestamp: new Date().toISOString(),
  };
}

// ─── Action Requirements Registry ───────────────────────────────────────

/** Default action requirements — extend as tools are added */
export const DEFAULT_REQUIREMENTS: ActionRequirement[] = [
  {
    toolName: 'shell_execute',
    requiredScores: { security: 0.7, reliability: 0.5 },
    minSovereignty: 0.6,
    description: 'Execute shell commands',
  },
  {
    toolName: 'file_write',
    requiredScores: { reliability: 0.4, data_integrity: 0.3 },
    minSovereignty: 0.2,
    description: 'Write files to disk',
  },
  {
    toolName: 'file_delete',
    requiredScores: { security: 0.6, reliability: 0.6 },
    minSovereignty: 0.5,
    description: 'Delete files from disk',
  },
  {
    toolName: 'git_push',
    requiredScores: { code_quality: 0.7, testing: 0.6, security: 0.5 },
    minSovereignty: 0.7,
    description: 'Push to git remote',
  },
  {
    toolName: 'git_force_push',
    requiredScores: { code_quality: 0.9, testing: 0.8, security: 0.8, reliability: 0.7 },
    minSovereignty: 0.9,
    description: 'Force push to git remote (destructive)',
  },
  {
    toolName: 'crm_update_lead',
    requiredScores: { data_integrity: 0.5, process_adherence: 0.4 },
    minSovereignty: 0.3,
    description: 'Update CRM lead data',
  },
  {
    toolName: 'crm_delete_lead',
    requiredScores: { data_integrity: 0.7, security: 0.5, accountability: 0.6 },
    minSovereignty: 0.6,
    description: 'Delete CRM lead (destructive)',
  },
  {
    toolName: 'send_message',
    requiredScores: { communication: 0.5, accountability: 0.4 },
    minSovereignty: 0.3,
    description: 'Send message to external channel',
  },
  {
    toolName: 'send_email',
    requiredScores: { communication: 0.6, accountability: 0.5, transparency: 0.4 },
    minSovereignty: 0.5,
    description: 'Send outbound email via thetadriven.com',
  },
  {
    toolName: 'deploy',
    requiredScores: { code_quality: 0.8, testing: 0.7, security: 0.6, reliability: 0.7 },
    minSovereignty: 0.8,
    description: 'Deploy to production',
  },
];

/** Lookup a requirement by tool name */
export function getRequirement(toolName: string): ActionRequirement | undefined {
  return DEFAULT_REQUIREMENTS.find(r => r.toolName === toolName);
}

// ─── Identity Loading ───────────────────────────────────────────────────

/**
 * Load identity vector from trust-debt pipeline output.
 *
 * Reads step 4 (grades-statistics.json) from the pipeline data directory.
 * Falls back to a default permissive identity if the pipeline hasn't run.
 */
export function loadIdentityFromPipeline(
  pipelineDir: string,
  userId: string = 'default',
): IdentityVector {
  try {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');

    const gradesPath = resolve(pipelineDir, '4-grades-statistics.json');
    const raw = readFileSync(gradesPath, 'utf-8');
    const grades = JSON.parse(raw);

    const categoryScores: Partial<Record<TrustDebtCategory, number>> = {};
    let total = 0;
    let count = 0;

    // Map pipeline grades to 0.0-1.0 scores
    // Pipeline uses letter grades: A=1.0, B=0.8, C=0.6, D=0.4, F=0.2
    const gradeMap: Record<string, number> = {
      'A+': 1.0, 'A': 0.95, 'A-': 0.9,
      'B+': 0.85, 'B': 0.8, 'B-': 0.75,
      'C+': 0.65, 'C': 0.6, 'C-': 0.55,
      'D+': 0.45, 'D': 0.4, 'D-': 0.35,
      'F': 0.2,
    };

    if (grades.categories) {
      for (const [cat, data] of Object.entries(grades.categories as Record<string, { grade?: string; score?: number }>)) {
        const normalizedCat = cat.toLowerCase().replace(/[- ]/g, '_') as TrustDebtCategory;
        if (TRUST_DEBT_CATEGORIES.includes(normalizedCat)) {
          const score = data.score ?? gradeMap[data.grade ?? 'C'] ?? 0.6;
          categoryScores[normalizedCat] = score;
          total += score;
          count++;
        }
      }
    }

    return {
      userId,
      categoryScores,
      sovereigntyScore: count > 0 ? total / count : 0.5,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    // Pipeline hasn't run — return permissive defaults
    const categoryScores: Partial<Record<TrustDebtCategory, number>> = {};
    for (const cat of TRUST_DEBT_CATEGORIES) {
      categoryScores[cat] = 0.7;
    }
    return {
      userId,
      categoryScores,
      sovereigntyScore: 0.7,
      lastUpdated: new Date().toISOString(),
    };
  }
}
