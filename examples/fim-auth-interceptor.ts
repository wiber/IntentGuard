/**
 * FIM Auth - Runtime Interceptor Example
 *
 * This example demonstrates runtime permission enforcement with FimInterceptor:
 * 1. Create FIM interceptor with callbacks
 * 2. Intercept skill execution
 * 3. Handle denials and drift threshold
 */

import { FimInterceptor, type FimDenialEvent } from '../src/auth/index.js';
import type { Logger, SkillResult } from '../src/types.js';

// Create simple console logger
const logger: Logger = {
  info: (msg) => console.log('[INFO]', msg),
  warn: (msg) => console.warn('[WARN]', msg),
  error: (msg) => console.error('[ERROR]', msg),
  debug: (msg) => console.debug('[DEBUG]', msg),
};

// Example skills that might be executed
const skills: Record<string, (payload: unknown) => Promise<SkillResult>> = {
  'claude-flow-bridge': async (payload) => {
    console.log('⚙️  Executing claude-flow-bridge skill...');
    return { success: true, message: 'Bridge established' };
  },

  'email-outbound': async (payload) => {
    console.log('📧 Sending outbound email...');
    return { success: true, message: 'Email sent' };
  },

  'artifact-generator': async (payload) => {
    console.log('🎨 Generating artifact...');
    return { success: true, message: 'Artifact created' };
  },
};

async function runInterceptorExample() {
  console.log('🔐 FIM Auth - Runtime Interceptor Example\n');

  // 1. Create FIM interceptor
  console.log('Step 1: Creating FIM interceptor...');
  const interceptor = new FimInterceptor(logger, './data');
  console.log('✅ FIM interceptor created\n');

  // 2. Configure denial callback (transparency engine)
  interceptor.onDenial = async (event: FimDenialEvent) => {
    console.log('\n🔴 FIM DENIAL EVENT');
    console.log('   Tool:', event.toolName);
    console.log('   Skill:', event.skillName);
    console.log('   Overlap:', event.overlap.toFixed(3), '< 0.8');
    console.log('   Sovereignty:', event.sovereignty.toFixed(3));
    console.log('   Failed categories:');
    event.failedCategories.forEach((cat) => {
      console.log('     -', cat);
    });
    console.log('   Timestamp:', event.timestamp);
    console.log('');

    // In production, you would:
    // - Post to Discord #trust-debt-public
    // - Send alert to team
    // - Log to audit database
    // - Trigger incident response
    console.log('💡 In production, this would trigger:');
    console.log('   - Discord notification to #trust-debt-public');
    console.log('   - Audit log entry');
    console.log('   - Alert to team');
    console.log('');
  };

  // 3. Configure drift threshold callback (3 consecutive denials)
  interceptor.onDriftThreshold = async () => {
    console.log('\n⚠️  DRIFT THRESHOLD REACHED');
    console.log('   3 consecutive denials detected');
    console.log('   Triggering trust-debt pipeline re-run...');
    console.log('');

    // In production, you would:
    // - Run trust-debt pipeline agents 0-7
    // - Reload identity vector
    // - Post to Discord
    // - Update sovereignty score
    console.log('💡 In production, this would:');
    console.log('   1. Run trust-debt pipeline (agents 0-7)');
    console.log('   2. Reload identity vector with fresh scores');
    console.log('   3. Post recalibration notice to Discord');
    console.log('   4. Reset consecutive denial counter');
    console.log('');

    // Simulate identity reload
    interceptor.reloadIdentity();
    console.log('✅ Identity reloaded\n');
  };

  // 4. Execute skills with FIM interception
  console.log('Step 2: Executing skills with FIM interception...\n');

  const skillsToTest = [
    'claude-flow-bridge',
    'email-outbound',
    'artifact-generator',
  ];

  for (const skillName of skillsToTest) {
    console.log(`Testing skill: ${skillName}`);

    // Intercept skill execution
    const denial = await interceptor.intercept(skillName, {
      test: true,
      timestamp: new Date().toISOString(),
    });

    if (denial) {
      // Skill was denied by FIM
      console.log('❌ BLOCKED:', denial.message);
      console.log('');
    } else {
      // Skill is allowed - proceed with execution
      console.log('✅ ALLOWED - executing skill...');

      const skill = skills[skillName];
      if (skill) {
        const result = await skill({ test: true });
        console.log('📊 Result:', result.message);
      }
      console.log('');
    }
  }

  // 5. Display statistics
  console.log('Step 3: FIM statistics');
  const stats = interceptor.getStats();
  console.log('   Total denials:', stats.totalDenials);
  console.log('   Consecutive denials:', stats.consecutiveDenials);
  console.log('   Current sovereignty:', stats.sovereignty.toFixed(3));
  console.log('');
}

// Run the example
runInterceptorExample().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
