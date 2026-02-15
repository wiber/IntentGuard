/**
 * Test script for tensor-overlap.ts
 * Run with: npx tsx src/federation/test-tensor-overlap.ts
 */

import { computeTensorOverlap, isCompatible, geometryHash } from './tensor-overlap';
import { TRUST_DEBT_CATEGORIES } from '../auth/geometric';

console.log('=== Testing Tensor Overlap System ===\n');

// Test 1: Identical geometries (should have overlap = 1.0)
console.log('Test 1: Identical Geometries');
const geometry1 = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.8;
  return acc;
}, {} as any);

const result1 = computeTensorOverlap(geometry1, geometry1);
console.log(`  Overlap: ${result1.overlap.toFixed(3)} (expected: 1.000)`);
console.log(`  Aligned: ${result1.aligned.length} categories`);
console.log(`  Divergent: ${result1.divergent.length} categories`);
console.log(`  Compatible: ${isCompatible(geometry1, geometry1)}\n`);

// Test 2: Slightly different geometries (should be aligned)
console.log('Test 2: Slightly Different Geometries');
const geometry2A = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.8;
  return acc;
}, {} as any);

const geometry2B = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.85; // +0.05 difference
  return acc;
}, {} as any);

const result2 = computeTensorOverlap(geometry2A, geometry2B);
console.log(`  Overlap: ${result2.overlap.toFixed(3)} (expected: ~0.999)`);
console.log(`  Aligned: ${result2.aligned.length} categories (most should be aligned)`);
console.log(`  Divergent: ${result2.divergent.length} categories`);
console.log(`  Compatible: ${isCompatible(geometry2A, geometry2B)}\n`);

// Test 3: Divergent geometries (should have low overlap)
console.log('Test 3: Divergent Geometries');
const geometry3A = TRUST_DEBT_CATEGORIES.reduce((acc, cat, idx) => {
  acc[cat] = idx < 10 ? 1.0 : 0.0; // First half high, second half low
  return acc;
}, {} as any);

const geometry3B = TRUST_DEBT_CATEGORIES.reduce((acc, cat, idx) => {
  acc[cat] = idx >= 10 ? 1.0 : 0.0; // First half low, second half high
  return acc;
}, {} as any);

const result3 = computeTensorOverlap(geometry3A, geometry3B);
console.log(`  Overlap: ${result3.overlap.toFixed(3)} (expected: <0.5)`);
console.log(`  Aligned: ${result3.aligned.length} categories`);
console.log(`  Divergent: ${result3.divergent.length} categories (many should be divergent)`);
console.log(`  Compatible: ${isCompatible(geometry3A, geometry3B)} (expected: false)\n`);

// Test 4: Array input (20-dimensional vector)
console.log('Test 4: Array Input (20-dimensional vectors)');
const vector4A = new Array(20).fill(0.7);
const vector4B = new Array(20).fill(0.8);

const result4 = computeTensorOverlap(vector4A, vector4B);
console.log(`  Overlap: ${result4.overlap.toFixed(3)} (expected: ~0.999)`);
console.log(`  Aligned: ${result4.aligned.length} categories`);
console.log(`  Divergent: ${result4.divergent.length} categories`);
console.log(`  Compatible: ${isCompatible(vector4A, vector4B)}\n`);

// Test 5: Geometry hashing
console.log('Test 5: Geometry Hashing');
const hash1 = geometryHash(geometry1);
const hash2 = geometryHash(geometry1); // Same geometry
const hash3 = geometryHash(geometry2A); // Different geometry

console.log(`  Hash 1: ${hash1.substring(0, 16)}...`);
console.log(`  Hash 2: ${hash2.substring(0, 16)}... (should match Hash 1)`);
console.log(`  Hash 3: ${hash3.substring(0, 16)}... (should differ from Hash 1)`);
console.log(`  Hash 1 === Hash 2: ${hash1 === hash2}`);
console.log(`  Hash 1 === Hash 3: ${hash1 === hash3}\n`);

// Test 6: Edge case - empty geometries
console.log('Test 6: Edge Case - Empty Geometries');
try {
  const result6 = computeTensorOverlap({}, {});
  console.log(`  Overlap: ${result6.overlap.toFixed(3)} (zero vectors)`);
  console.log(`  Aligned: ${result6.aligned.length} categories (all should be aligned at 0)`);
  console.log(`  Divergent: ${result6.divergent.length} categories\n`);
} catch (error: any) {
  console.log(`  Error: ${error.message}\n`);
}

console.log('=== All Tests Complete ===');
