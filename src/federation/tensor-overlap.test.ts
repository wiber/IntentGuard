/**
 * tensor-overlap.test.ts — Comprehensive tests for Tensor Overlap System
 *
 * Tests geometric similarity computation between bot identity vectors
 * using cosine similarity as defined in auth/geometric.ts.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTensorOverlap,
  isCompatible,
  geometryHash,
  ALIGNMENT_THRESHOLD,
  DIVERGENCE_THRESHOLD,
  TRUST_THRESHOLD,
} from './tensor-overlap';
import { TRUST_DEBT_CATEGORIES, TrustDebtCategory } from '../auth/geometric';

describe('Tensor Overlap', () => {
  // Test 1: Identical geometries have perfect overlap
  it('computeTensorOverlap() — identical geometries return overlap = 1.0', () => {
    const geometry: Partial<Record<TrustDebtCategory, number>> = {};
    TRUST_DEBT_CATEGORIES.forEach(cat => {
      geometry[cat] = 0.8;
    });

    const result = computeTensorOverlap(geometry, geometry);

    expect(Math.abs(result.overlap - 1.0)).toBeLessThan(1e-10);
    expect(result.aligned).toHaveLength(20);
    expect(result.divergent).toHaveLength(0);
  });

  // Test 2: Similar geometries have high overlap
  it('computeTensorOverlap() — similar geometries have overlap > 0.95', () => {
    const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
    const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

    TRUST_DEBT_CATEGORIES.forEach(cat => {
      geometryA[cat] = 0.8;
      geometryB[cat] = 0.85;
    });

    const result = computeTensorOverlap(geometryA, geometryB);

    expect(result.overlap).toBeGreaterThan(0.95);
    expect(result.aligned.length).toBeGreaterThanOrEqual(15);
    expect(result.divergent).toHaveLength(0);
  });

  // Test 3: Orthogonal geometries have low overlap
  it('computeTensorOverlap() — orthogonal geometries have overlap near 0', () => {
    const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
    const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

    TRUST_DEBT_CATEGORIES.forEach((cat, idx) => {
      geometryA[cat] = idx < 10 ? 1.0 : 0.0;
      geometryB[cat] = idx >= 10 ? 1.0 : 0.0;
    });

    const result = computeTensorOverlap(geometryA, geometryB);

    expect(result.overlap).toBeLessThan(0.1);
    expect(result.aligned).toHaveLength(0);
    expect(result.divergent.length).toBeGreaterThanOrEqual(10);
  });

  // Test 4: Array input (20-dimensional vectors)
  it('computeTensorOverlap() — accepts 20-dimensional array input', () => {
    const vectorA = new Array(20).fill(0.7);
    const vectorB = new Array(20).fill(0.8);

    const result = computeTensorOverlap(vectorA, vectorB);

    expect(result.overlap).toBeGreaterThan(0.95);
    expect(result.aligned.length).toBeGreaterThanOrEqual(15);
    expect(result.divergent).toHaveLength(0);
  });

  // Test 5: Mixed sparse and dense input
  it('computeTensorOverlap() — handles sparse geometries (missing categories default to 0)', () => {
    const sparseA: Partial<Record<TrustDebtCategory, number>> = {
      security: 0.9,
      reliability: 0.8,
      code_quality: 0.7,
    };

    const denseB: Partial<Record<TrustDebtCategory, number>> = {};
    TRUST_DEBT_CATEGORIES.forEach(cat => {
      denseB[cat] = 0.5;
    });

    const result = computeTensorOverlap(sparseA, denseB);

    expect(result.overlap).toBeGreaterThanOrEqual(0.0);
    expect(result.overlap).toBeLessThanOrEqual(1.0);
    expect(result.aligned.length).toBeLessThan(20);
  });

  // Test 6: Empty geometries
  it('computeTensorOverlap() — empty geometries return overlap = 0', () => {
    const result = computeTensorOverlap({}, {});

    expect(result.overlap).toBe(0.0);
    expect(result.aligned).toHaveLength(20);
    expect(result.divergent).toHaveLength(0);
  });

  // Test 7: Alignment threshold boundary
  it('computeTensorOverlap() — alignment threshold boundary (0.2)', () => {
    const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
    const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

    TRUST_DEBT_CATEGORIES.forEach(cat => {
      geometryA[cat] = 0.5;
      geometryB[cat] = 0.5 + ALIGNMENT_THRESHOLD;
    });

    const result = computeTensorOverlap(geometryA, geometryB);

    expect(result.aligned).toHaveLength(20);
    expect(result.divergent).toHaveLength(0);
  });

  // Test 8: Divergence threshold boundary
  it('computeTensorOverlap() — divergence threshold boundary (0.4)', () => {
    const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
    const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

    TRUST_DEBT_CATEGORIES.forEach(cat => {
      geometryA[cat] = 0.5;
      geometryB[cat] = 0.5 + DIVERGENCE_THRESHOLD + 0.01;
    });

    const result = computeTensorOverlap(geometryA, geometryB);

    expect(result.divergent).toHaveLength(20);
    expect(result.aligned).toHaveLength(0);
  });

  // Test 9: isCompatible() with default threshold
  it('isCompatible() — returns true when overlap >= 0.8 (default)', () => {
    const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
    const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

    TRUST_DEBT_CATEGORIES.forEach(cat => {
      geometryA[cat] = 0.8;
      geometryB[cat] = 0.85;
    });

    expect(isCompatible(geometryA, geometryB)).toBe(true);
  });

  // Test 10: isCompatible() with custom threshold
  it('isCompatible() — accepts custom threshold parameter', () => {
    const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
    const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

    TRUST_DEBT_CATEGORIES.forEach((cat, idx) => {
      geometryA[cat] = idx < 15 ? 0.8 : 0.3;
      geometryB[cat] = idx < 15 ? 0.85 : 0.7;
    });

    const result = computeTensorOverlap(geometryA, geometryB);
    const actualOverlap = result.overlap;

    expect(isCompatible(geometryA, geometryB, actualOverlap + 0.1)).toBe(false);
    expect(isCompatible(geometryA, geometryB, actualOverlap - 0.1)).toBe(true);
  });

  // Test 11: isCompatible() rejects orthogonal geometries
  it('isCompatible() — rejects orthogonal geometries', () => {
    const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
    const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

    TRUST_DEBT_CATEGORIES.forEach((cat, idx) => {
      geometryA[cat] = idx < 10 ? 1.0 : 0.0;
      geometryB[cat] = idx >= 10 ? 1.0 : 0.0;
    });

    expect(isCompatible(geometryA, geometryB)).toBe(false);
  });

  // Test 12: geometryHash() produces consistent hashes
  it('geometryHash() — produces consistent hashes for identical geometries', () => {
    const geometry: Partial<Record<TrustDebtCategory, number>> = {};
    TRUST_DEBT_CATEGORIES.forEach(cat => {
      geometry[cat] = 0.8;
    });

    const hash1 = geometryHash(geometry);
    const hash2 = geometryHash(geometry);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  // Test 13: geometryHash() produces different hashes
  it('geometryHash() — produces different hashes for different geometries', () => {
    const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
    const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

    TRUST_DEBT_CATEGORIES.forEach(cat => {
      geometryA[cat] = 0.8;
      geometryB[cat] = 0.9;
    });

    expect(geometryHash(geometryA)).not.toBe(geometryHash(geometryB));
  });

  // Test 14: geometryHash() handles array input
  it('geometryHash() — handles array input', () => {
    const vector = new Array(20).fill(0.8);
    const hash = geometryHash(vector);

    expect(hash).toHaveLength(64);
    expect(typeof hash).toBe('string');
  });

  // Test 15: Error handling for invalid dimensions
  it('computeTensorOverlap() — throws error for invalid dimensions', () => {
    const shortVector = new Array(10).fill(0.8);
    const validVector = new Array(20).fill(0.8);

    expect(() => computeTensorOverlap(shortVector, validVector)).toThrow(/Invalid geometry dimensions/);
  });

  // Test 16: Cosine similarity normalization
  it('computeTensorOverlap() — cosine similarity is normalized to [0, 1]', () => {
    const testCases = [
      { a: new Array(20).fill(1.0), b: new Array(20).fill(1.0) },
      { a: new Array(20).fill(0.0), b: new Array(20).fill(0.0) },
      { a: new Array(20).fill(0.5), b: new Array(20).fill(0.9) },
    ];

    testCases.forEach(({ a, b }) => {
      const result = computeTensorOverlap(a, b);
      expect(result.overlap).toBeGreaterThanOrEqual(0.0);
      expect(result.overlap).toBeLessThanOrEqual(1.0);
    });
  });

  // Test 17: Realistic bot federation scenario
  it('Realistic bot federation scenario — trust debt profiles', () => {
    const botA: Partial<Record<TrustDebtCategory, number>> = {
      security: 0.9,
      reliability: 0.85,
      code_quality: 0.8,
      testing: 0.75,
      innovation: 0.4,
      adaptability: 0.45,
    };

    const botB: Partial<Record<TrustDebtCategory, number>> = {
      security: 0.88,
      reliability: 0.83,
      code_quality: 0.78,
      testing: 0.72,
      innovation: 0.42,
      adaptability: 0.48,
    };

    const result = computeTensorOverlap(botA, botB);

    expect(result.overlap).toBeGreaterThan(0.8);
    expect(result.aligned).toContain('security');
    expect(result.aligned).toContain('reliability');
  });

  // Test 18: Sparse vs full geometry compatibility
  it('Sparse geometry (3 categories) vs full geometry (20 categories)', () => {
    const sparse: Partial<Record<TrustDebtCategory, number>> = {
      security: 0.9,
      reliability: 0.8,
      testing: 0.7,
    };

    const full: Partial<Record<TrustDebtCategory, number>> = {};
    TRUST_DEBT_CATEGORIES.forEach(cat => {
      full[cat] = 0.6;
    });

    const result = computeTensorOverlap(sparse, full);

    expect(result.overlap).toBeGreaterThanOrEqual(0.0);
    expect(result.overlap).toBeLessThanOrEqual(1.0);
    expect(result.aligned.length).toBeGreaterThan(0);
  });

  // Test 19: Constants are exported correctly
  it('Constants are exported and have correct values', () => {
    expect(ALIGNMENT_THRESHOLD).toBe(0.2);
    expect(DIVERGENCE_THRESHOLD).toBe(0.4);
    expect(TRUST_THRESHOLD).toBe(0.8);
  });

  // Test 20: Performance test
  it('Performance — compute 1000 overlaps in reasonable time', () => {
    const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
    const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

    TRUST_DEBT_CATEGORIES.forEach(cat => {
      geometryA[cat] = Math.random();
      geometryB[cat] = Math.random();
    });

    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      computeTensorOverlap(geometryA, geometryB);
    }
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(1000);
  });
});
