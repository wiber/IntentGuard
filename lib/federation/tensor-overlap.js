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
import { TRUST_DEBT_CATEGORIES } from '../auth/geometric';
// ─── Constants ──────────────────────────────────────────────────────────
const ALIGNMENT_THRESHOLD = 0.2; // Max difference for "aligned" category
const DIVERGENCE_THRESHOLD = 0.4; // Min difference for "divergent" category
const TRUST_THRESHOLD = 0.8; // Default federation trust threshold
// ─── Core Computations ──────────────────────────────────────────────────
/**
 * Normalize a sparse geometry map to a full 20-dimensional vector.
 * Missing categories default to 0.0.
 */
function normalizeGeometry(geometry) {
    return TRUST_DEBT_CATEGORIES.map(cat => geometry[cat] ?? 0.0);
}
/**
 * Compute dot product of two vectors.
 */
function dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
}
/**
 * Compute magnitude (L2 norm) of a vector.
 */
function magnitude(v) {
    return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}
/**
 * Compute cosine similarity between two vectors.
 * Returns value in [0, 1] (absolute value, ignoring direction).
 */
function cosineSimilarity(a, b) {
    const dot = dotProduct(a, b);
    const magA = magnitude(a);
    const magB = magnitude(b);
    if (magA === 0 || magB === 0)
        return 0.0;
    // Use absolute value to normalize to [0, 1]
    return Math.abs(dot / (magA * magB));
}
/**
 * Compute tensor overlap between two bot geometries.
 *
 * @param geometryA - First bot's 20-dimensional identity vector (can be sparse)
 * @param geometryB - Second bot's 20-dimensional identity vector (can be sparse)
 * @returns Overlap result with similarity score and category analysis
 */
export function computeTensorOverlap(geometryA, geometryB) {
    // Convert to full 20-dimensional vectors
    const vecA = Array.isArray(geometryA)
        ? geometryA
        : normalizeGeometry(geometryA);
    const vecB = Array.isArray(geometryB)
        ? geometryB
        : normalizeGeometry(geometryB);
    // Ensure both vectors are 20-dimensional
    if (vecA.length !== 20 || vecB.length !== 20) {
        throw new Error(`Invalid geometry dimensions: expected 20, got ${vecA.length} and ${vecB.length}`);
    }
    // Compute cosine similarity
    const overlap = cosineSimilarity(vecA, vecB);
    // Analyze category-wise alignment
    const aligned = [];
    const divergent = [];
    for (let i = 0; i < TRUST_DEBT_CATEGORIES.length; i++) {
        const category = TRUST_DEBT_CATEGORIES[i];
        const diff = Math.abs(vecA[i] - vecB[i]);
        if (diff <= ALIGNMENT_THRESHOLD) {
            aligned.push(category);
        }
        else if (diff > DIVERGENCE_THRESHOLD) {
            divergent.push(category);
        }
    }
    return { overlap, aligned, divergent };
}
/**
 * Check if two bot geometries are compatible for federation.
 *
 * @param geometryA - First bot's identity vector
 * @param geometryB - Second bot's identity vector
 * @param threshold - Minimum overlap required (default 0.8)
 * @returns True if overlap >= threshold
 */
export function isCompatible(geometryA, geometryB, threshold = TRUST_THRESHOLD) {
    const result = computeTensorOverlap(geometryA, geometryB);
    return result.overlap >= threshold;
}
/**
 * Compute hash of a geometry vector for storage/comparison.
 * Uses SHA-256 of the serialized vector.
 */
export function geometryHash(geometry) {
    const crypto = require('crypto');
    const vec = Array.isArray(geometry)
        ? geometry
        : normalizeGeometry(geometry);
    const serialized = vec.map(v => v.toFixed(6)).join(',');
    return crypto.createHash('sha256').update(serialized).digest('hex');
}
// ─── Exports ────────────────────────────────────────────────────────────
export { ALIGNMENT_THRESHOLD, DIVERGENCE_THRESHOLD, TRUST_THRESHOLD, };
//# sourceMappingURL=tensor-overlap.js.map