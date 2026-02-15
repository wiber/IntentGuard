#!/usr/bin/env npx tsx
/**
 * tests/integration/fim-proxy.test.js
 *
 * Integration test for FIM Geometric Permission Engine
 * Tests the core permission checking logic with various identity vectors
 * and action requirements.
 *
 * Run: npx tsx tests/integration/fim-proxy.test.js
 */

import {
  computeOverlap,
  checkPermission,
  DEFAULT_REQUIREMENTS,
  getRequirement,
  type IdentityVector,
  type ActionRequirement,
  TRUST_DEBT_CATEGORIES,
} from '../../src/auth/geometric.ts';

// ─── Test Utilities ─────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
  passed++;
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    console.error(`❌ FAIL: ${message} (expected ${expected}, got ${actual})`);
    failed++;
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
  passed++;
}

function createIdentity(scoreValue: number, sovereignty: number = 0.7): IdentityVector {
  const categoryScores: Partial<Record<typeof TRUST_DEBT_CATEGORIES[number], number>> = {};
  for (const cat of TRUST_DEBT_CATEGORIES) {
    categoryScores[cat] = scoreValue;
  }
  return {
    userId: 'test-user',
    categoryScores,
    sovereigntyScore: sovereignty,
    lastUpdated: new Date().toISOString(),
  };
}

// ─── Test Suite ─────────────────────────────────────────────────────────

console.log('\n🧪 FIM Geometric Permission Engine Integration Tests\n');

// ─── Test 1: computeOverlap() with high scores ──────────────────────────

console.log('📊 Test 1: computeOverlap() with high scores (0.9)');
try {
  const highIdentity = createIdentity(0.9, 0.9);
  const requirement: ActionRequirement = {
    toolName: 'test_tool',
    requiredScores: {
      security: 0.7,
      reliability: 0.5,
      data_integrity: 0.6,
    },
    minSovereignty: 0.5,
    description: 'Test requirement',
  };

  const overlap = computeOverlap(highIdentity, requirement);
  assertApprox(overlap, 1.0, 0.01, 'High identity scores should produce 100% overlap');
} catch (e) {
  console.error('Test 1 failed:', e);
}

// ─── Test 2: computeOverlap() with low scores ───────────────────────────

console.log('\n📊 Test 2: computeOverlap() with low scores (0.1)');
try {
  const lowIdentity = createIdentity(0.1, 0.1);
  const requirement: ActionRequirement = {
    toolName: 'test_tool',
    requiredScores: {
      security: 0.7,
      reliability: 0.5,
      data_integrity: 0.6,
    },
    minSovereignty: 0.5,
    description: 'Test requirement',
  };

  const overlap = computeOverlap(lowIdentity, requirement);
  assertApprox(overlap, 0.0, 0.01, 'Low identity scores should produce 0% overlap');
} catch (e) {
  console.error('Test 2 failed:', e);
}

// ─── Test 3: computeOverlap() with mixed scores ─────────────────────────

console.log('\n📊 Test 3: computeOverlap() with mixed scores');
try {
  const mixedIdentity: IdentityVector = {
    userId: 'test-user',
    categoryScores: {
      security: 0.8,        // meets 0.7
      reliability: 0.4,     // fails 0.5
      data_integrity: 0.7,  // meets 0.6
    },
    sovereigntyScore: 0.6,
    lastUpdated: new Date().toISOString(),
  };
  const requirement: ActionRequirement = {
    toolName: 'test_tool',
    requiredScores: {
      security: 0.7,
      reliability: 0.5,
      data_integrity: 0.6,
    },
    minSovereignty: 0.5,
    description: 'Test requirement',
  };

  const overlap = computeOverlap(mixedIdentity, requirement);
  // 2 out of 3 categories met = 0.667
  assertApprox(overlap, 0.667, 0.01, 'Mixed scores should produce ~67% overlap (2/3 categories met)');
} catch (e) {
  console.error('Test 3 failed:', e);
}

// ─── Test 4: checkPermission() with passing identity ────────────────────

console.log('\n🔐 Test 4: checkPermission() with passing identity (file_write)');
try {
  const passingIdentity: IdentityVector = {
    userId: 'test-user',
    categoryScores: {
      reliability: 0.5,
      data_integrity: 0.4,
      security: 0.8,  // Added for completeness
    },
    sovereigntyScore: 0.5,
    lastUpdated: new Date().toISOString(),
  };

  const fileWriteReq = getRequirement('file_write');
  assert(fileWriteReq !== undefined, 'file_write requirement should exist');

  const result = checkPermission(passingIdentity, fileWriteReq!);
  assert(result.allowed === true, 'Passing identity should be allowed for file_write');
  assertApprox(result.overlap, 1.0, 0.01, 'Overlap should be 100% for passing identity');
  assert(result.failedCategories.length === 0, 'No categories should fail for passing identity');
} catch (e) {
  console.error('Test 4 failed:', e);
}

// ─── Test 5: checkPermission() with failing identity ────────────────────

console.log('\n🔐 Test 5: checkPermission() with failing identity (file_write)');
try {
  const failingIdentity: IdentityVector = {
    userId: 'test-user',
    categoryScores: {
      reliability: 0.5,
      data_integrity: 0.1,  // Fails minimum of 0.3
    },
    sovereigntyScore: 0.5,
    lastUpdated: new Date().toISOString(),
  };

  const fileWriteReq = getRequirement('file_write');
  assert(fileWriteReq !== undefined, 'file_write requirement should exist');

  const result = checkPermission(failingIdentity, fileWriteReq!);
  assert(result.allowed === false, 'Failing identity should be denied for file_write');
  assert(result.failedCategories.length > 0, 'Failed categories should be reported');
  assert(
    result.failedCategories.some(cat => cat.includes('data_integrity')),
    'data_integrity should be in failed categories'
  );
} catch (e) {
  console.error('Test 5 failed:', e);
}

// ─── Test 6: Verify ACTION_REQUIREMENTS has at least 5 entries ──────────

console.log('\n📋 Test 6: Verify DEFAULT_REQUIREMENTS has at least 5 entries');
try {
  assert(
    DEFAULT_REQUIREMENTS.length >= 5,
    `DEFAULT_REQUIREMENTS should have at least 5 entries (found ${DEFAULT_REQUIREMENTS.length})`
  );

  const expectedTools = ['shell_execute', 'file_write', 'file_delete', 'git_push', 'git_force_push'];
  for (const toolName of expectedTools) {
    const req = getRequirement(toolName);
    assert(req !== undefined, `Requirement for '${toolName}' should exist`);
  }
} catch (e) {
  console.error('Test 6 failed:', e);
}

// ─── Test 7: Edge case - empty requirement ──────────────────────────────

console.log('\n⚠️  Test 7: Edge case - empty requirement');
try {
  const identity = createIdentity(0.5);
  const emptyReq: ActionRequirement = {
    toolName: 'noop',
    requiredScores: {},
    minSovereignty: 0.0,
    description: 'No requirements',
  };

  const overlap = computeOverlap(identity, emptyReq);
  assertApprox(overlap, 1.0, 0.01, 'Empty requirement should produce 100% overlap');

  const result = checkPermission(identity, emptyReq);
  assert(result.allowed === true, 'Empty requirement should always pass');
} catch (e) {
  console.error('Test 7 failed:', e);
}

// ─── Test 8: Edge case - all categories required ────────────────────────

console.log('\n⚠️  Test 8: Edge case - all 20 categories required');
try {
  const perfectIdentity = createIdentity(1.0, 1.0);  // Set sovereignty to 1.0
  const allCategoriesReq: ActionRequirement = {
    toolName: 'super_admin',
    requiredScores: Object.fromEntries(
      TRUST_DEBT_CATEGORIES.map(cat => [cat, 0.9])
    ) as Partial<Record<typeof TRUST_DEBT_CATEGORIES[number], number>>,
    minSovereignty: 0.9,
    description: 'Requires all categories',
  };

  const overlap = computeOverlap(perfectIdentity, allCategoriesReq);
  assertApprox(overlap, 1.0, 0.01, 'Perfect identity should meet all 20 categories');

  const result = checkPermission(perfectIdentity, allCategoriesReq);
  assert(result.allowed === true, 'Perfect identity should pass all-category requirement');
} catch (e) {
  console.error('Test 8 failed:', e);
}

// ─── Test 9: Edge case - zero sovereignty ───────────────────────────────

console.log('\n⚠️  Test 9: Edge case - zero sovereignty');
try {
  const zeroSovereigntyIdentity: IdentityVector = {
    userId: 'test-user',
    categoryScores: {
      security: 0.9,
      reliability: 0.9,
    },
    sovereigntyScore: 0.0,  // Zero sovereignty
    lastUpdated: new Date().toISOString(),
  };

  const requirement: ActionRequirement = {
    toolName: 'test_tool',
    requiredScores: {
      security: 0.7,
      reliability: 0.5,
    },
    minSovereignty: 0.5,  // Requires sovereignty
    description: 'Test requirement',
  };

  const overlap = computeOverlap(zeroSovereigntyIdentity, requirement);
  assertApprox(overlap, 1.0, 0.01, 'Overlap should be 100% (categories met)');

  const result = checkPermission(zeroSovereigntyIdentity, requirement);
  assert(result.allowed === false, 'Zero sovereignty should fail even if categories pass');
  assert(result.sovereignty === 0.0, 'Sovereignty should be 0.0');
} catch (e) {
  console.error('Test 9 failed:', e);
}

// ─── Test 10: Test threshold parameter ──────────────────────────────────

console.log('\n🎯 Test 10: Test custom threshold parameter');
try {
  const identity: IdentityVector = {
    userId: 'test-user',
    categoryScores: {
      security: 0.8,        // meets
      reliability: 0.4,     // fails
      data_integrity: 0.7,  // meets
    },
    sovereigntyScore: 0.7,
    lastUpdated: new Date().toISOString(),
  };

  const requirement: ActionRequirement = {
    toolName: 'test_tool',
    requiredScores: {
      security: 0.7,
      reliability: 0.5,
      data_integrity: 0.6,
    },
    minSovereignty: 0.5,
    description: 'Test requirement',
  };

  // 2/3 categories met = 0.667 overlap
  // Should pass with threshold=0.6, fail with threshold=0.8
  const resultPass = checkPermission(identity, requirement, 0.6);
  assert(resultPass.allowed === true, 'Should pass with threshold=0.6 (overlap=0.667)');

  const resultFail = checkPermission(identity, requirement, 0.8);
  assert(resultFail.allowed === false, 'Should fail with threshold=0.8 (overlap=0.667)');
} catch (e) {
  console.error('Test 10 failed:', e);
}

// ─── Test 11: Verify git_force_push high requirements ───────────────────

console.log('\n🚀 Test 11: Verify git_force_push has strict requirements');
try {
  const forcePushReq = getRequirement('git_force_push');
  assert(forcePushReq !== undefined, 'git_force_push requirement should exist');

  // Verify it requires high scores
  assert(
    forcePushReq!.minSovereignty >= 0.8,
    'git_force_push should require high sovereignty (>=0.8)'
  );

  const reqScores = forcePushReq!.requiredScores;
  assert(
    Object.keys(reqScores).length >= 3,
    'git_force_push should require multiple categories'
  );

  // Check at least one category requires >= 0.8
  const hasHighReq = Object.values(reqScores).some(score => score >= 0.8);
  assert(hasHighReq, 'git_force_push should require at least one category >= 0.8');
} catch (e) {
  console.error('Test 11 failed:', e);
}

// ─── Test 12: Test deploy action requirements ───────────────────────────

console.log('\n🚢 Test 12: Test deploy action with high-trust identity');
try {
  const deployReq = getRequirement('deploy');
  assert(deployReq !== undefined, 'deploy requirement should exist');

  const highTrustIdentity = createIdentity(0.85, 0.85);
  const result = checkPermission(highTrustIdentity, deployReq!);
  assert(result.allowed === true, 'High-trust identity should be allowed to deploy');
} catch (e) {
  console.error('Test 12 failed:', e);
}

// ─── Summary ────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.error('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
