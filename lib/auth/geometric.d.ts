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
/** The 20 trust-debt categories that form the identity vector space */
export declare const TRUST_DEBT_CATEGORIES: readonly ["security", "reliability", "data_integrity", "process_adherence", "code_quality", "testing", "documentation", "communication", "time_management", "resource_efficiency", "risk_assessment", "compliance", "innovation", "collaboration", "accountability", "transparency", "adaptability", "domain_expertise", "user_focus", "ethical_alignment"];
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
/**
 * Convert identity to full 20-dimensional vector.
 * Missing categories default to 0.0.
 */
export declare function identityToVector(identity: IdentityVector): number[];
/**
 * Convert action requirement to full 20-dimensional vector.
 * Missing categories default to 0.0.
 */
export declare function requirementToVector(requirement: ActionRequirement): number[];
/**
 * Compute dot product of two 20-dimensional vectors.
 *
 * Dot product: A · B = Σ(A[i] × B[i])
 *
 * @returns Sum of component-wise products
 */
export declare function dotProduct(a: number[], b: number[]): number;
/**
 * Compute magnitude (L2 norm) of a vector.
 *
 * Magnitude: ||A|| = √(Σ(A[i]²))
 *
 * @returns Euclidean length of the vector
 */
export declare function magnitude(v: number[]): number;
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
export declare function cosineSimilarity(a: number[], b: number[]): number;
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
export declare function computeOverlap(identity: IdentityVector, requirement: ActionRequirement): number;
/**
 * Compute threshold-based overlap (v0.1 backward compatibility).
 *
 * Proportion of required categories meeting minimums.
 * A category "meets" its requirement if identity[category] >= requirement[category].
 *
 * @deprecated Use computeOverlap() for geometric similarity
 */
export declare function computeOverlapThreshold(identity: IdentityVector, requirement: ActionRequirement): number;
/**
 * Check if a user has permission to execute a tool.
 *
 * Two conditions must be met:
 *   1. Category overlap >= threshold (default 0.8)
 *   2. Sovereignty score >= action's minSovereignty
 */
export declare function checkPermission(identity: IdentityVector, requirement: ActionRequirement, threshold?: number): PermissionResult;
/** Default action requirements — extend as tools are added */
export declare const DEFAULT_REQUIREMENTS: ActionRequirement[];
/** Lookup a requirement by tool name */
export declare function getRequirement(toolName: string): ActionRequirement | undefined;
/**
 * Load identity vector from trust-debt pipeline output.
 *
 * Reads step 4 (grades-statistics.json) from the pipeline data directory.
 * Falls back to a default permissive identity if the pipeline hasn't run.
 */
export declare function loadIdentityFromPipeline(pipelineDir: string, userId?: string): IdentityVector;
//# sourceMappingURL=geometric.d.ts.map