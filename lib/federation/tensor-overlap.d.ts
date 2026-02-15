/**
 * src/federation/tensor-overlap.ts — Tensor Overlap Computation for Federation
 *
 * Computes geometric similarity between bot identity vectors using cosine similarity.
 * Used by the federation handshake protocol to determine if two bots can federate.
 *
 * MATHEMATICS:
 *   - Identity vectors are 20-dimensional (one per trust-debt category)
 *   - Cosine similarity = dot(A,B) / (||A|| * ||B||)
 *   - Normalized to [0, 1] range
 *   - Threshold: 0.8 = trusted, below = reject
 *
 * ALIGNMENT LOGIC:
 *   - aligned: categories where both bots agree (difference <= 0.2)
 *   - divergent: categories where bots disagree (difference > 0.4)
 */
import { TrustDebtCategory } from '../auth/geometric';
export interface TensorOverlapResult {
    overlap: number;
    aligned: string[];
    divergent: string[];
}
declare const ALIGNMENT_THRESHOLD = 0.2;
declare const DIVERGENCE_THRESHOLD = 0.4;
declare const TRUST_THRESHOLD = 0.8;
/**
 * Compute tensor overlap between two bot geometries.
 *
 * @param geometryA - First bot's 20-dimensional identity vector (can be sparse)
 * @param geometryB - Second bot's 20-dimensional identity vector (can be sparse)
 * @returns Overlap result with similarity score and category analysis
 */
export declare function computeTensorOverlap(geometryA: Partial<Record<TrustDebtCategory, number>> | number[], geometryB: Partial<Record<TrustDebtCategory, number>> | number[]): TensorOverlapResult;
/**
 * Check if two bot geometries are compatible for federation.
 *
 * @param geometryA - First bot's identity vector
 * @param geometryB - Second bot's identity vector
 * @param threshold - Minimum overlap required (default 0.8)
 * @returns True if overlap >= threshold
 */
export declare function isCompatible(geometryA: Partial<Record<TrustDebtCategory, number>> | number[], geometryB: Partial<Record<TrustDebtCategory, number>> | number[], threshold?: number): boolean;
/**
 * Compute hash of a geometry vector for storage/comparison.
 * Uses SHA-256 of the serialized vector.
 */
export declare function geometryHash(geometry: Partial<Record<TrustDebtCategory, number>> | number[]): string;
export { ALIGNMENT_THRESHOLD, DIVERGENCE_THRESHOLD, TRUST_THRESHOLD, };
//# sourceMappingURL=tensor-overlap.d.ts.map