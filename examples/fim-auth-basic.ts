/**
 * FIM Auth - Basic Usage Example
 *
 * This example demonstrates the core FIM authentication workflow:
 * 1. Load identity vector from trust-debt pipeline
 * 2. Check permission for a specific action
 * 3. Handle allow/deny results
 */

import {
  checkPermission,
  loadIdentityFromPipeline,
  getActionRequirement,
  type IdentityVector,
  type PermissionResult,
} from '../src/auth/index.js';

// Example: Check if we have permission to push to git
async function checkGitPushPermission() {
  console.log('🔐 FIM Auth - Basic Example\n');

  // 1. Load identity from trust-debt pipeline
  console.log('Step 1: Loading identity from pipeline...');
  const identity: IdentityVector = loadIdentityFromPipeline(
    './data/pipeline-runs/latest',
    'system'
  );

  console.log('✅ Identity loaded:');
  console.log('   User ID:', identity.userId);
  console.log('   Sovereignty score:', identity.sovereigntyScore.toFixed(3));
  console.log('   Last updated:', identity.lastUpdated);
  console.log('   Category scores:');
  console.log('     security:', identity.categoryScores.security?.toFixed(3));
  console.log('     reliability:', identity.categoryScores.reliability?.toFixed(3));
  console.log('     code_quality:', identity.categoryScores.code_quality?.toFixed(3));
  console.log('     testing:', identity.categoryScores.testing?.toFixed(3));
  console.log('');

  // 2. Get action requirement
  console.log('Step 2: Looking up action requirement for git_push...');
  const requirement = getActionRequirement('git_push');

  if (!requirement) {
    console.error('❌ Action requirement not found for git_push');
    return;
  }

  console.log('✅ Action requirement found:');
  console.log('   Tool name:', requirement.toolName);
  console.log('   Min sovereignty:', requirement.minSovereignty);
  console.log('   Required scores:', JSON.stringify(requirement.requiredScores, null, 2));
  console.log('');

  // 3. Check permission
  console.log('Step 3: Checking permission...');
  const result: PermissionResult = checkPermission(identity, requirement);

  console.log('');
  if (result.allowed) {
    console.log('✅ PERMISSION GRANTED');
    console.log('   Overlap:', result.overlap.toFixed(3), '>=', result.threshold);
    console.log('   Sovereignty:', result.sovereignty.toFixed(3), '>=', result.minSovereignty);
    console.log('');
    console.log('🚀 You can now execute: git push');
  } else {
    console.log('❌ PERMISSION DENIED');
    console.log('   Overlap:', result.overlap.toFixed(3), '<', result.threshold);
    console.log('   Sovereignty:', result.sovereignty.toFixed(3), '<', result.minSovereignty);
    console.log('   Failed categories:');
    result.failedCategories.forEach((cat) => {
      console.log('     -', cat);
    });
    console.log('');
    console.log('⚠️  Cannot execute git push - trust-debt requirements not met');
    console.log('💡 Run trust-debt pipeline to improve scores:');
    console.log('   npm run pipeline');
  }
}

// Run the example
checkGitPushPermission().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
