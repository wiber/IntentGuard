/**
 * Identity Vector Loader
 *
 * Loads identity vectors from Trust Debt pipeline step-4 output.
 * Converts 20-category grades to 20-dimensional float vectors.
 *
 * @module identity-vector
 */
import { type IdentityVector } from './geometric.js';
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
export declare function loadIdentityVector(step4Path: string, userId?: string): IdentityVector;
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
export declare function loadIdentityVectorDefault(userId?: string): IdentityVector | null;
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
export declare function normalizeRawVector(rawVector: number[], userId?: string): IdentityVector;
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
export declare function vectorToRaw(vector: IdentityVector): number[];
/**
 * Clear all cached identity vectors.
 * Useful for testing or forcing fresh loads.
 */
export declare function clearCache(): void;
/**
 * Get cache statistics for monitoring.
 */
export declare function getCacheStats(): {
    size: number;
    entries: {
        key: string;
        sourceFile: string;
        loadedAt: string;
        age: number;
    }[];
};
//# sourceMappingURL=identity-vector.d.ts.map