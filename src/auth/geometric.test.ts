/**
 * src/auth/geometric.test.ts — Geometric Permission Engine Tests
 *
 * Comprehensive tests for 20-dimensional vector math:
 *   - Dot product computation
 *   - Vector magnitude (L2 norm)
 *   - Cosine similarity
 *   - Permission overlap calculation
 *   - Edge cases (zero vectors, orthogonal, opposite)
 */

import { describe, it, expect } from 'vitest';
import {
  TRUST_DEBT_CATEGORIES,
  type TrustDebtCategory,
  type IdentityVector,
  type ActionRequirement,
  identityToVector,
  requirementToVector,
  dotProduct,
  magnitude,
  cosineSimilarity,
  computeOverlap,
  computeOverlapThreshold,
  checkPermission,
} from './geometric';

// ─── Test Fixtures ──────────────────────────────────────────────────────

const createIdentity = (scores: Partial<Record<TrustDebtCategory, number>>): IdentityVector => ({
  userId: 'test-user',
  categoryScores: scores,
  sovereigntyScore: 0.7,
  lastUpdated: '2026-02-15T00:00:00Z',
});

const createRequirement = (
  toolName: string,
  scores: Partial<Record<TrustDebtCategory, number>>,
): ActionRequirement => ({
  toolName,
  requiredScores: scores,
  minSovereignty: 0.5,
  description: `Test requirement for ${toolName}`,
});

// ─── Vector Conversion Tests ────────────────────────────────────────────

describe('identityToVector', () => {
  it('converts identity to 20-dimensional vector', () => {
    const identity = createIdentity({
      security: 0.8,
      reliability: 0.6,
      code_quality: 0.9,
    });

    const vec = identityToVector(identity);

    expect(vec).toHaveLength(20);
    expect(vec[0]).toBe(0.8); // security is first category
    expect(vec[1]).toBe(0.6); // reliability is second
    expect(vec[4]).toBe(0.9); // code_quality is fifth
  });

  it('fills missing categories with 0.0', () => {
    const identity = createIdentity({ security: 0.5 });
    const vec = identityToVector(identity);

    expect(vec).toHaveLength(20);
    expect(vec[0]).toBe(0.5); // security present
    expect(vec[1]).toBe(0); // reliability missing
    expect(vec[19]).toBe(0); // ethical_alignment missing
  });

  it('handles empty identity', () => {
    const identity = createIdentity({});
    const vec = identityToVector(identity);

    expect(vec).toHaveLength(20);
    expect(vec.every(v => v === 0)).toBe(true);
  });
});

describe('requirementToVector', () => {
  it('converts requirement to 20-dimensional vector', () => {
    const requirement = createRequirement('test', {
      security: 0.7,
      testing: 0.5,
    });

    const vec = requirementToVector(requirement);

    expect(vec).toHaveLength(20);
    expect(vec[0]).toBe(0.7); // security
    expect(vec[5]).toBe(0.5); // testing
  });

  it('fills missing categories with 0.0', () => {
    const requirement = createRequirement('test', { security: 0.8 });
    const vec = requirementToVector(requirement);

    expect(vec).toHaveLength(20);
    expect(vec[0]).toBe(0.8);
    expect(vec.slice(1).every(v => v === 0)).toBe(true);
  });
});

// ─── Dot Product Tests ──────────────────────────────────────────────────

describe('dotProduct', () => {
  it('computes dot product of identical vectors', () => {
    const a = [1, 2, 3, 4];
    const b = [1, 2, 3, 4];

    const result = dotProduct(a, b);

    // 1*1 + 2*2 + 3*3 + 4*4 = 1 + 4 + 9 + 16 = 30
    expect(result).toBe(30);
  });

  it('computes dot product of different vectors', () => {
    const a = [2, 3, 1];
    const b = [1, 4, 2];

    const result = dotProduct(a, b);

    // 2*1 + 3*4 + 1*2 = 2 + 12 + 2 = 16
    expect(result).toBe(16);
  });

  it('computes dot product with negative values', () => {
    const a = [1, -2, 3];
    const b = [4, 5, -6];

    const result = dotProduct(a, b);

    // 1*4 + (-2)*5 + 3*(-6) = 4 - 10 - 18 = -24
    expect(result).toBe(-24);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];

    const result = dotProduct(a, b);

    expect(result).toBe(0);
  });

  it('handles zero vectors', () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];

    const result = dotProduct(a, b);

    expect(result).toBe(0);
  });

  it('throws on dimension mismatch', () => {
    const a = [1, 2, 3];
    const b = [1, 2];

    expect(() => dotProduct(a, b)).toThrow('Vector dimension mismatch');
  });

  it('handles 20-dimensional vectors', () => {
    const a = Array(20).fill(0.5);
    const b = Array(20).fill(0.6);

    const result = dotProduct(a, b);

    // 20 * (0.5 * 0.6) = 20 * 0.3 = 6.0
    expect(result).toBeCloseTo(6.0, 5);
  });
});

// ─── Magnitude Tests ────────────────────────────────────────────────────

describe('magnitude', () => {
  it('computes magnitude of unit vector', () => {
    const v = [1, 0, 0];
    expect(magnitude(v)).toBe(1);
  });

  it('computes magnitude of 3-4-5 triangle', () => {
    const v = [3, 4];

    // √(3² + 4²) = √(9 + 16) = √25 = 5
    expect(magnitude(v)).toBe(5);
  });

  it('computes magnitude of general vector', () => {
    const v = [1, 2, 2];

    // √(1² + 2² + 2²) = √(1 + 4 + 4) = √9 = 3
    expect(magnitude(v)).toBe(3);
  });

  it('returns 0 for zero vector', () => {
    const v = [0, 0, 0];
    expect(magnitude(v)).toBe(0);
  });

  it('handles 20-dimensional vector', () => {
    const v = Array(20).fill(0.1);

    // √(20 * 0.1²) = √(20 * 0.01) = √0.2 ≈ 0.4472
    expect(magnitude(v)).toBeCloseTo(0.4472, 4);
  });
});

// ─── Cosine Similarity Tests ────────────────────────────────────────────

describe('cosineSimilarity', () => {
  it('returns 1.0 for identical vectors', () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];

    const similarity = cosineSimilarity(a, b);

    expect(similarity).toBeCloseTo(1.0, 5);
  });

  it('returns 1.0 for scaled identical vectors', () => {
    const a = [1, 2, 3];
    const b = [2, 4, 6]; // 2x scaled

    const similarity = cosineSimilarity(a, b);

    expect(similarity).toBeCloseTo(1.0, 5);
  });

  it('returns 0.0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];

    const similarity = cosineSimilarity(a, b);

    expect(similarity).toBeCloseTo(0.0, 5);
  });

  it('returns -1.0 for opposite vectors', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];

    const similarity = cosineSimilarity(a, b);

    expect(similarity).toBeCloseTo(-1.0, 5);
  });

  it('computes partial similarity correctly', () => {
    const a = [1, 0];
    const b = [1, 1];

    // cos(45°) = 1/√2 ≈ 0.7071
    const similarity = cosineSimilarity(a, b);

    expect(similarity).toBeCloseTo(0.7071, 4);
  });

  it('handles zero magnitude vectors', () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];

    const similarity = cosineSimilarity(a, b);

    expect(similarity).toBe(0);
  });

  it('handles both zero vectors', () => {
    const a = [0, 0, 0];
    const b = [0, 0, 0];

    const similarity = cosineSimilarity(a, b);

    expect(similarity).toBe(0);
  });

  it('computes similarity for 20-dimensional vectors', () => {
    // Create two similar but not identical vectors
    const a = TRUST_DEBT_CATEGORIES.map((_, i) => (i % 2 === 0 ? 0.8 : 0.3));
    const b = TRUST_DEBT_CATEGORIES.map((_, i) => (i % 2 === 0 ? 0.7 : 0.4));

    const similarity = cosineSimilarity(a, b);

    // Should be high but not 1.0
    expect(similarity).toBeGreaterThan(0.9);
    expect(similarity).toBeLessThan(1.0);
  });

  it('clamps values to [-1, 1] range', () => {
    // Even with floating point errors, result should be in valid range
    const a = [0.1, 0.2, 0.3];
    const b = [0.15, 0.25, 0.35];

    const similarity = cosineSimilarity(a, b);

    expect(similarity).toBeGreaterThanOrEqual(-1);
    expect(similarity).toBeLessThanOrEqual(1);
  });
});

// ─── Overlap Computation Tests ──────────────────────────────────────────

describe('computeOverlap', () => {
  it('returns 1.0 when all required dimensions are met (perfect match)', () => {
    const identity = createIdentity({
      security: 0.9,
      reliability: 0.8,
      code_quality: 0.85,
    });

    const requirement = createRequirement('test', {
      security: 0.7,
      reliability: 0.6,
      code_quality: 0.7,
    });

    const overlap = computeOverlap(identity, requirement);

    // All 3 dimensions pass: 3/3 = 1.0
    expect(overlap).toBe(1.0);
  });

  it('returns partial overlap when some dimensions fail', () => {
    const identity = createIdentity({
      security: 0.8,
      reliability: 0.3, // Below required 0.9
    });

    const requirement = createRequirement('test', {
      security: 0.5,
      reliability: 0.9, // Not met
    });

    const overlap = computeOverlap(identity, requirement);

    // 1 of 2 pass: 1/2 = 0.5
    expect(overlap).toBe(0.5);
  });

  it('returns 0.0 when no required dimensions are met (zero match)', () => {
    const identity = createIdentity({
      security: 0.3,
      reliability: 0.2,
    });

    const requirement = createRequirement('test', {
      security: 0.7,
      reliability: 0.5,
    });

    const overlap = computeOverlap(identity, requirement);

    // 0 of 2 pass: 0/2 = 0.0
    expect(overlap).toBe(0.0);
  });

  it('handles empty requirement (permissive) — returns 1.0', () => {
    const identity = createIdentity({ security: 0.5 });
    const requirement = createRequirement('test', {});

    const overlap = computeOverlap(identity, requirement);

    // No dimensions required = everything allowed
    expect(overlap).toBe(1.0);
  });

  it('handles empty identity — returns 0.0 when dimensions required', () => {
    const identity = createIdentity({});
    const requirement = createRequirement('test', { security: 0.7 });

    const overlap = computeOverlap(identity, requirement);

    // Identity has 0.0 for security, below 0.7: 0/1 = 0.0
    expect(overlap).toBe(0);
  });

  it('returns ~0.67 for mixed scores (2 of 3 pass)', () => {
    const identity = createIdentity({
      security: 0.9,
      reliability: 0.8,
      code_quality: 0.3, // Below required 0.7
    });

    const requirement = createRequirement('test', {
      security: 0.7,
      reliability: 0.6,
      code_quality: 0.7, // Not met
    });

    const overlap = computeOverlap(identity, requirement);

    // 2 of 3 pass: 2/3 ≈ 0.6667
    expect(overlap).toBeCloseTo(2 / 3, 5);
  });

  it('agrees with computeOverlapThreshold (same algorithm)', () => {
    const identity = createIdentity({
      security: 0.9,
      reliability: 0.3, // Fails threshold
    });

    const requirement = createRequirement('test', {
      security: 0.7,
      reliability: 0.5, // Not met
    });

    const overlapMain = computeOverlap(identity, requirement);
    const overlapThreshold = computeOverlapThreshold(identity, requirement);

    // Both use dimensional pass/fail: 1 of 2 met = 0.5
    expect(overlapMain).toBe(0.5);
    expect(overlapThreshold).toBe(0.5);
    expect(overlapMain).toBe(overlapThreshold);
  });
});

describe('computeOverlapThreshold (backward compatibility)', () => {
  it('returns 1.0 when all requirements met', () => {
    const identity = createIdentity({
      security: 0.8,
      reliability: 0.6,
    });

    const requirement = createRequirement('test', {
      security: 0.7,
      reliability: 0.5,
    });

    const overlap = computeOverlapThreshold(identity, requirement);

    expect(overlap).toBe(1.0);
  });

  it('returns 0.5 when half requirements met', () => {
    const identity = createIdentity({
      security: 0.8,
      reliability: 0.3, // Below threshold
    });

    const requirement = createRequirement('test', {
      security: 0.7,
      reliability: 0.5, // Not met
    });

    const overlap = computeOverlapThreshold(identity, requirement);

    expect(overlap).toBe(0.5);
  });

  it('returns 0.0 when no requirements met', () => {
    const identity = createIdentity({
      security: 0.3,
      reliability: 0.2,
    });

    const requirement = createRequirement('test', {
      security: 0.7,
      reliability: 0.5,
    });

    const overlap = computeOverlapThreshold(identity, requirement);

    expect(overlap).toBe(0.0);
  });

  it('returns 1.0 for empty requirement', () => {
    const identity = createIdentity({ security: 0.5 });
    const requirement = createRequirement('test', {});

    const overlap = computeOverlapThreshold(identity, requirement);

    expect(overlap).toBe(1.0);
  });
});

// ─── Permission Check Integration Tests ─────────────────────────────────

describe('checkPermission', () => {
  it('allows when overlap and sovereignty meet thresholds', () => {
    const identity = createIdentity({
      security: 0.9,
      reliability: 0.8,
      code_quality: 0.85,
    });
    identity.sovereigntyScore = 0.8;

    const requirement = createRequirement('git_push', {
      security: 0.7,
      reliability: 0.6,
      code_quality: 0.7,
    });
    requirement.minSovereignty = 0.7;

    const result = checkPermission(identity, requirement, 0.8);

    expect(result.allowed).toBe(true);
    expect(result.overlap).toBeGreaterThanOrEqual(0.8);
    expect(result.sovereignty).toBeGreaterThanOrEqual(0.7);
  });

  it('denies when overlap below threshold', () => {
    const identity = createIdentity({
      security: 0.5,
    });
    identity.sovereigntyScore = 0.9;

    const requirement = createRequirement('deploy', {
      security: 0.8,
      testing: 0.7,
      code_quality: 0.8,
    });

    const result = checkPermission(identity, requirement, 0.8);

    expect(result.allowed).toBe(false);
    expect(result.overlap).toBeLessThan(0.8);
  });

  it('denies when sovereignty below minimum', () => {
    const identity = createIdentity({
      security: 0.9,
      testing: 0.9,
      code_quality: 0.9,
    });
    identity.sovereigntyScore = 0.4; // Too low

    const requirement = createRequirement('deploy', {
      security: 0.7,
      testing: 0.7,
      code_quality: 0.7,
    });
    requirement.minSovereignty = 0.8;

    const result = checkPermission(identity, requirement, 0.8);

    expect(result.allowed).toBe(false);
    expect(result.sovereignty).toBeLessThan(requirement.minSovereignty);
  });

  it('includes timestamp in result', () => {
    const identity = createIdentity({ security: 0.7 });
    const requirement = createRequirement('test', { security: 0.5 });

    const result = checkPermission(identity, requirement);

    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── Real-World Scenario Tests ──────────────────────────────────────────

describe('real-world scenarios', () => {
  it('junior developer denied force push', () => {
    const juniorDev = createIdentity({
      code_quality: 0.5,
      testing: 0.4,
      security: 0.3,
      reliability: 0.4,
    });
    juniorDev.sovereigntyScore = 0.4;

    const forcePushReq = createRequirement('git_force_push', {
      code_quality: 0.9,
      testing: 0.8,
      security: 0.8,
      reliability: 0.7,
    });
    forcePushReq.minSovereignty = 0.9;

    const result = checkPermission(juniorDev, forcePushReq, 0.9);

    expect(result.allowed).toBe(false);
    expect(result.failedCategories.length).toBeGreaterThan(0);
  });

  it('senior developer allowed deploy', () => {
    const seniorDev = createIdentity({
      code_quality: 0.9,
      testing: 0.85,
      security: 0.8,
      reliability: 0.9,
    });
    seniorDev.sovereigntyScore = 0.85;

    const deployReq = createRequirement('deploy', {
      code_quality: 0.8,
      testing: 0.7,
      security: 0.6,
      reliability: 0.7,
    });
    deployReq.minSovereignty = 0.8;

    const result = checkPermission(seniorDev, deployReq, 0.8);

    expect(result.allowed).toBe(true);
    expect(result.failedCategories.length).toBe(0);
  });

  it('communication specialist allowed send_email', () => {
    const communicator = createIdentity({
      communication: 0.9,
      accountability: 0.8,
      transparency: 0.85,
    });
    communicator.sovereigntyScore = 0.7;

    const emailReq = createRequirement('send_email', {
      communication: 0.6,
      accountability: 0.5,
      transparency: 0.4,
    });
    emailReq.minSovereignty = 0.5;

    const result = checkPermission(communicator, emailReq, 0.7);

    expect(result.allowed).toBe(true);
  });
});
