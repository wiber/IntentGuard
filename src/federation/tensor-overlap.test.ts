/**
 * tensor-overlap.test.ts — Comprehensive tests for Tensor Overlap System
 *
 * Tests geometric similarity computation between bot identity vectors
 * using cosine similarity as defined in auth/geometric.ts.
 *
 * Run with: npx tsx src/federation/tensor-overlap.test.ts
 */

import { strict as assert } from 'assert';
import {
  computeTensorOverlap,
  isCompatible,
  geometryHash,
  ALIGNMENT_THRESHOLD,
  DIVERGENCE_THRESHOLD,
  TRUST_THRESHOLD,
} from './tensor-overlap';
import { TRUST_DEBT_CATEGORIES, TrustDebtCategory } from '../auth/geometric';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error: any) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    process.exit(1);
  }
}

console.log('=== Running Tensor Overlap Tests ===\n');

// ─── Test 1: Identical geometries have perfect overlap ─────────────────────

test('computeTensorOverlap() — identical geometries return overlap = 1.0', () => {
  const geometry: Partial<Record<TrustDebtCategory, number>> = {};
  TRUST_DEBT_CATEGORIES.forEach(cat => {
    geometry[cat] = 0.8;
  });

  const result = computeTensorOverlap(geometry, geometry);

  assert(Math.abs(result.overlap - 1.0) < 1e-10, `Identical geometries should have overlap ≈ 1.0, got ${result.overlap}`);
  assert.strictEqual(result.aligned.length, 20, 'All 20 categories should be aligned');
  assert.strictEqual(result.divergent.length, 0, 'No categories should be divergent');
});

// ─── Test 2: Similar geometries have high overlap ──────────────────────────

test('computeTensorOverlap() — similar geometries have overlap > 0.95', () => {
  const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
  const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

  TRUST_DEBT_CATEGORIES.forEach(cat => {
    geometryA[cat] = 0.8;
    geometryB[cat] = 0.85; // +0.05 difference (within alignment threshold)
  });

  const result = computeTensorOverlap(geometryA, geometryB);

  assert(result.overlap > 0.95, `Similar geometries should have overlap > 0.95, got ${result.overlap}`);
  assert(result.aligned.length >= 15, `Most categories should be aligned, got ${result.aligned.length}`);
  assert(result.divergent.length === 0, 'No categories should be divergent with small differences');
});

// ─── Test 3: Orthogonal geometries have low overlap ────────────────────────

test('computeTensorOverlap() — orthogonal geometries have overlap ≈ 0', () => {
  const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
  const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

  TRUST_DEBT_CATEGORIES.forEach((cat, idx) => {
    geometryA[cat] = idx < 10 ? 1.0 : 0.0; // First half high, second half zero
    geometryB[cat] = idx >= 10 ? 1.0 : 0.0; // First half zero, second half high
  });

  const result = computeTensorOverlap(geometryA, geometryB);

  assert(result.overlap < 0.1, `Orthogonal geometries should have overlap < 0.1, got ${result.overlap}`);
  assert(result.aligned.length === 0, 'No categories should be aligned for orthogonal vectors');
  assert(result.divergent.length >= 10, `Many categories should be divergent, got ${result.divergent.length}`);
});

// ─── Test 4: Array input (20-dimensional vectors) ──────────────────────────

test('computeTensorOverlap() — accepts 20-dimensional array input', () => {
  const vectorA = new Array(20).fill(0.7);
  const vectorB = new Array(20).fill(0.8);

  const result = computeTensorOverlap(vectorA, vectorB);

  assert(result.overlap > 0.95, 'Similar array vectors should have high overlap');
  assert(result.aligned.length >= 15, 'Most categories should be aligned');
  assert.strictEqual(result.divergent.length, 0, 'No categories should be divergent');
});

// ─── Test 5: Mixed sparse and dense input ──────────────────────────────────

test('computeTensorOverlap() — handles sparse geometries (missing categories default to 0)', () => {
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

  assert(result.overlap >= 0.0 && result.overlap <= 1.0, 'Overlap should be in [0, 1]');
  assert(result.aligned.length < 20, 'Not all categories should be aligned with sparse input');
});

// ─── Test 6: Empty geometries ───────────────────────────────────────────────

test('computeTensorOverlap() — empty geometries return overlap = 0', () => {
  const result = computeTensorOverlap({}, {});

  assert.strictEqual(result.overlap, 0.0, 'Empty geometries should have overlap = 0');
  assert.strictEqual(result.aligned.length, 20, 'All categories should be aligned at 0');
  assert.strictEqual(result.divergent.length, 0, 'No divergence when all are 0');
});

// ─── Test 7: Alignment threshold boundary ──────────────────────────────────

test('computeTensorOverlap() — alignment threshold boundary (0.2)', () => {
  const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
  const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

  TRUST_DEBT_CATEGORIES.forEach(cat => {
    geometryA[cat] = 0.5;
    geometryB[cat] = 0.5 + ALIGNMENT_THRESHOLD; // Exactly at alignment boundary
  });

  const result = computeTensorOverlap(geometryA, geometryB);

  assert.strictEqual(result.aligned.length, 20, 'All categories should be aligned at threshold');
  assert.strictEqual(result.divergent.length, 0, 'No divergence at alignment threshold');
});

// ─── Test 8: Divergence threshold boundary ─────────────────────────────────

test('computeTensorOverlap() — divergence threshold boundary (0.4)', () => {
  const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
  const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

  TRUST_DEBT_CATEGORIES.forEach(cat => {
    geometryA[cat] = 0.5;
    geometryB[cat] = 0.5 + DIVERGENCE_THRESHOLD + 0.01; // Just over divergence threshold
  });

  const result = computeTensorOverlap(geometryA, geometryB);

  assert.strictEqual(result.divergent.length, 20, 'All categories should be divergent above threshold');
  assert.strictEqual(result.aligned.length, 0, 'No alignment above divergence threshold');
});

// ─── Test 9: isCompatible() with default threshold ─────────────────────────

test('isCompatible() — returns true when overlap >= 0.8 (default)', () => {
  const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
  const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

  TRUST_DEBT_CATEGORIES.forEach(cat => {
    geometryA[cat] = 0.8;
    geometryB[cat] = 0.85;
  });

  const compatible = isCompatible(geometryA, geometryB);

  assert.strictEqual(compatible, true, 'High overlap geometries should be compatible');
});

// ─── Test 10: isCompatible() with custom threshold ─────────────────────────

test('isCompatible() — accepts custom threshold parameter', () => {
  // Create geometries with moderate overlap (around 0.7)
  const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
  const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

  TRUST_DEBT_CATEGORIES.forEach((cat, idx) => {
    // Create some aligned and some divergent categories
    geometryA[cat] = idx < 15 ? 0.8 : 0.3;
    geometryB[cat] = idx < 15 ? 0.85 : 0.7;
  });

  const result = computeTensorOverlap(geometryA, geometryB);
  const actualOverlap = result.overlap;

  // With high threshold above actual overlap, should be incompatible
  assert.strictEqual(
    isCompatible(geometryA, geometryB, actualOverlap + 0.1),
    false,
    'Should be incompatible when threshold > overlap'
  );

  // With low threshold below actual overlap, should be compatible
  assert.strictEqual(
    isCompatible(geometryA, geometryB, actualOverlap - 0.1),
    true,
    'Should be compatible when threshold < overlap'
  );
});

// ─── Test 11: isCompatible() rejects orthogonal geometries ─────────────────

test('isCompatible() — rejects orthogonal geometries', () => {
  const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
  const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

  TRUST_DEBT_CATEGORIES.forEach((cat, idx) => {
    geometryA[cat] = idx < 10 ? 1.0 : 0.0;
    geometryB[cat] = idx >= 10 ? 1.0 : 0.0;
  });

  const compatible = isCompatible(geometryA, geometryB);

  assert.strictEqual(compatible, false, 'Orthogonal geometries should be incompatible');
});

// ─── Test 12: geometryHash() produces consistent hashes ────────────────────

test('geometryHash() — produces consistent hashes for identical geometries', () => {
  const geometry: Partial<Record<TrustDebtCategory, number>> = {};
  TRUST_DEBT_CATEGORIES.forEach(cat => {
    geometry[cat] = 0.8;
  });

  const hash1 = geometryHash(geometry);
  const hash2 = geometryHash(geometry);

  assert.strictEqual(hash1, hash2, 'Same geometry should produce same hash');
  assert.strictEqual(hash1.length, 64, 'SHA-256 hash should be 64 hex characters');
});

// ─── Test 13: geometryHash() produces different hashes ─────────────────────

test('geometryHash() — produces different hashes for different geometries', () => {
  const geometryA: Partial<Record<TrustDebtCategory, number>> = {};
  const geometryB: Partial<Record<TrustDebtCategory, number>> = {};

  TRUST_DEBT_CATEGORIES.forEach(cat => {
    geometryA[cat] = 0.8;
    geometryB[cat] = 0.9;
  });

  const hashA = geometryHash(geometryA);
  const hashB = geometryHash(geometryB);

  assert.notStrictEqual(hashA, hashB, 'Different geometries should produce different hashes');
});

// ─── Test 14: geometryHash() handles array input ───────────────────────────

test('geometryHash() — handles array input', () => {
  const vector = new Array(20).fill(0.8);
  const hash = geometryHash(vector);

  assert.strictEqual(hash.length, 64, 'Array input should produce valid hash');
  assert.strictEqual(typeof hash, 'string', 'Hash should be a string');
});

// ─── Test 15: Error handling for invalid dimensions ────────────────────────

test('computeTensorOverlap() — throws error for invalid dimensions', () => {
  const shortVector = new Array(10).fill(0.8);
  const validVector = new Array(20).fill(0.8);

  assert.throws(
    () => computeTensorOverlap(shortVector, validVector),
    /Invalid geometry dimensions/,
    'Should throw error for mismatched dimensions'
  );
});

// ─── Test 16: Cosine similarity normalization ───────────────────────────────

test('computeTensorOverlap() — cosine similarity is normalized to [0, 1]', () => {
  // Test with various geometries to ensure overlap stays in [0, 1]
  const testCases = [
    { a: new Array(20).fill(1.0), b: new Array(20).fill(1.0) }, // All max
    { a: new Array(20).fill(0.0), b: new Array(20).fill(0.0) }, // All zero
    { a: new Array(20).fill(0.5), b: new Array(20).fill(0.9) }, // Mixed
  ];

  testCases.forEach(({ a, b }, idx) => {
    const result = computeTensorOverlap(a, b);
    assert(
      result.overlap >= 0.0 && result.overlap <= 1.0,
      `Test case ${idx}: Overlap ${result.overlap} should be in [0, 1]`
    );
  });
});

// ─── Test 17: Realistic bot federation scenario ────────────────────────────

test('Realistic bot federation scenario — trust debt profiles', () => {
  // Bot A: Strong in security, weak in innovation
  const botA: Partial<Record<TrustDebtCategory, number>> = {
    security: 0.9,
    reliability: 0.85,
    code_quality: 0.8,
    testing: 0.75,
    innovation: 0.4,
    adaptability: 0.45,
  };

  // Bot B: Similar security profile, slightly different priorities
  const botB: Partial<Record<TrustDebtCategory, number>> = {
    security: 0.88,
    reliability: 0.83,
    code_quality: 0.78,
    testing: 0.72,
    innovation: 0.42,
    adaptability: 0.48,
  };

  const result = computeTensorOverlap(botA, botB);

  assert(result.overlap > 0.8, 'Similar bot profiles should be compatible');
  assert(result.aligned.includes('security'), 'Security should be aligned');
  assert(result.aligned.includes('reliability'), 'Reliability should be aligned');
});

// ─── Test 18: Sparse vs full geometry compatibility ────────────────────────

test('Sparse geometry (3 categories) vs full geometry (20 categories)', () => {
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

  // Sparse geometry has mostly zeros, full has all 0.6
  // Overlap will be low but not zero
  assert(result.overlap >= 0.0 && result.overlap <= 1.0, 'Overlap should be valid');
  assert(result.aligned.length > 0, 'Some categories should align');
});

// ─── Test 19: Constants are exported correctly ──────────────────────────────

test('Constants are exported and have correct values', () => {
  assert.strictEqual(ALIGNMENT_THRESHOLD, 0.2, 'ALIGNMENT_THRESHOLD should be 0.2');
  assert.strictEqual(DIVERGENCE_THRESHOLD, 0.4, 'DIVERGENCE_THRESHOLD should be 0.4');
  assert.strictEqual(TRUST_THRESHOLD, 0.8, 'TRUST_THRESHOLD should be 0.8');
});

// ─── Test 20: Performance test ──────────────────────────────────────────────

test('Performance — compute 1000 overlaps in reasonable time', () => {
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

  assert(elapsed < 1000, `1000 computations should take < 1000ms, took ${elapsed}ms`);
  console.log(`  → 1000 computations: ${elapsed}ms (${(elapsed / 1000).toFixed(2)}ms per computation)`);
});

console.log('\n=== All Tests Passed ✓ ===\n');
