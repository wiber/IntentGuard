/**
 * Identity Vector Validation Script
 *
 * Quick validation that the identity vector loader works correctly.
 * Run with: npx tsx src/auth/identity-vector-validate.ts
 */

import { loadIdentityVector, normalizeRawVector, vectorToRaw, getCacheStats } from './identity-vector.js';
import { TRUST_DEBT_CATEGORIES } from './geometric.js';
import { join } from 'path';

console.log('🔍 Identity Vector Loader Validation\n');

// Test 1: Load from existing step-4 file
console.log('Test 1: Load from step-4 output');
try {
  const step4Path = join(process.cwd(), '4-grades-statistics.json');
  const vector = loadIdentityVector(step4Path);

  console.log('✅ Successfully loaded identity vector');
  console.log(`   User ID: ${vector.userId}`);
  console.log(`   Sovereignty Score: ${vector.sovereigntyScore.toFixed(3)}`);
  console.log(`   Category Scores: ${Object.keys(vector.categoryScores).length} dimensions`);
  console.log(`   Last Updated: ${vector.lastUpdated}`);

  // Verify all 20 categories present
  if (Object.keys(vector.categoryScores).length !== 20) {
    throw new Error(`Expected 20 categories, got ${Object.keys(vector.categoryScores).length}`);
  }

  // Verify scores in valid range
  for (const [cat, score] of Object.entries(vector.categoryScores)) {
    if (score! < 0 || score! > 1) {
      throw new Error(`Invalid score for ${cat}: ${score}`);
    }
  }

  console.log('✅ All 20 categories present with valid scores\n');
} catch (err: any) {
  console.error(`❌ Test 1 failed: ${err.message}\n`);
  process.exit(1);
}

// Test 2: Raw vector conversion
console.log('Test 2: Raw vector conversion');
try {
  const step4Path = join(process.cwd(), '4-grades-statistics.json');
  const vector = loadIdentityVector(step4Path);

  const raw = vectorToRaw(vector);
  console.log('✅ Converted to raw array');
  console.log(`   Length: ${raw.length}`);
  console.log(`   First 5 values: [${raw.slice(0, 5).map(v => v.toFixed(2)).join(', ')}]`);

  if (raw.length !== 20) {
    throw new Error(`Expected 20-dimensional array, got ${raw.length}`);
  }

  console.log('✅ Raw vector has correct dimensions\n');
} catch (err: any) {
  console.error(`❌ Test 2 failed: ${err.message}\n`);
  process.exit(1);
}

// Test 3: Normalize raw vector
console.log('Test 3: Normalize raw vector');
try {
  const raw = Array(20).fill(0.8);
  const vector = normalizeRawVector(raw, 'test-user');

  console.log('✅ Normalized raw vector');
  console.log(`   User ID: ${vector.userId}`);
  console.log(`   Sovereignty Score: ${vector.sovereigntyScore.toFixed(3)}`);
  console.log(`   Category Scores: ${Object.keys(vector.categoryScores).length} dimensions`);

  if (vector.userId !== 'test-user') {
    throw new Error(`Expected userId 'test-user', got '${vector.userId}'`);
  }

  if (Math.abs(vector.sovereigntyScore - 0.8) > 0.001) {
    throw new Error(`Expected sovereignty 0.8, got ${vector.sovereigntyScore}`);
  }

  console.log('✅ Normalization correct\n');
} catch (err: any) {
  console.error(`❌ Test 3 failed: ${err.message}\n`);
  process.exit(1);
}

// Test 4: Cache functionality
console.log('Test 4: Cache functionality');
try {
  const step4Path = join(process.cwd(), '4-grades-statistics.json');
  const vector1 = loadIdentityVector(step4Path, 'cache-test');
  const vector2 = loadIdentityVector(step4Path, 'cache-test');

  if (vector1 !== vector2) {
    throw new Error('Vectors should be cached (same reference)');
  }

  console.log('✅ Cache working correctly');

  const stats = getCacheStats();
  console.log(`   Cache size: ${stats.size}`);
  console.log(`   Cache entries: ${stats.entries.length}`);

  console.log('✅ Cache stats available\n');
} catch (err: any) {
  console.error(`❌ Test 4 failed: ${err.message}\n`);
  process.exit(1);
}

// Test 5: Category mapping validation
console.log('Test 5: Category mapping validation');
try {
  const step4Path = join(process.cwd(), '4-grades-statistics.json');
  const vector = loadIdentityVector(step4Path);

  // Verify specific category mappings
  const expectedCategories = [
    'security', 'reliability', 'data_integrity', 'process_adherence',
    'code_quality', 'testing', 'documentation', 'communication',
    'time_management', 'resource_efficiency', 'risk_assessment', 'compliance',
    'innovation', 'collaboration', 'accountability', 'transparency',
    'adaptability', 'domain_expertise', 'user_focus', 'ethical_alignment'
  ];

  for (const cat of expectedCategories) {
    if (!(cat in vector.categoryScores)) {
      throw new Error(`Missing category: ${cat}`);
    }
  }

  console.log('✅ All expected categories mapped correctly');
  console.log(`   Sample scores:`);
  console.log(`   - security: ${vector.categoryScores.security!.toFixed(3)}`);
  console.log(`   - code_quality: ${vector.categoryScores.code_quality!.toFixed(3)}`);
  console.log(`   - documentation: ${vector.categoryScores.documentation!.toFixed(3)}`);
  console.log(`   - collaboration: ${vector.categoryScores.collaboration!.toFixed(3)}`);

  console.log('\n✅ All validation tests passed! 🎉');
} catch (err: any) {
  console.error(`❌ Test 5 failed: ${err.message}\n`);
  process.exit(1);
}
