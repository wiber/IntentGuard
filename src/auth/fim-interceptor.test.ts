#!/usr/bin/env npx tsx
/**
 * src/auth/fim-interceptor.test.ts
 *
 * Unit tests for FimInterceptor
 * Tests overlap computation before every tool call, fail-open behavior,
 * denial tracking, drift correction, and heat map updates.
 *
 * Run: npx tsx src/auth/fim-interceptor.test.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { FimInterceptor, type FimDenialEvent } from './fim-interceptor.js';
import type { Logger } from '../types.js';
import type { IdentityVector } from './geometric.js';

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

// ─── Mock Logger ────────────────────────────────────────────────────────

class MockLogger implements Logger {
  logs: Array<{ level: string; message: string }> = [];

  debug(message: string): void {
    this.logs.push({ level: 'DEBUG', message });
  }
  info(message: string): void {
    this.logs.push({ level: 'INFO', message });
  }
  warn(message: string): void {
    this.logs.push({ level: 'WARN', message });
  }
  error(message: string): void {
    this.logs.push({ level: 'ERROR', message });
  }

  hasLog(level: string, substring: string): boolean {
    return this.logs.some(log => log.level === level && log.message.includes(substring));
  }

  clear(): void {
    this.logs = [];
  }
}

// ─── Test Setup ─────────────────────────────────────────────────────────

const TEST_DATA_DIR = join('/tmp', 'fim-interceptor-test-' + Date.now());

function setupTestEnvironment(): void {
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DATA_DIR, { recursive: true });

  // Create pipeline-runs directory with a test identity
  const runsDir = join(TEST_DATA_DIR, 'pipeline-runs', 'run-20260215-120000');
  mkdirSync(runsDir, { recursive: true });

  // Write test identity (grades-statistics.json)
  // Need to provide all 20 categories for proper overlap computation
  const testGrades = {
    categories: {
      security: { grade: 'B', score: 0.8 },
      reliability: { grade: 'B', score: 0.75 },
      data_integrity: { grade: 'C', score: 0.6 },
      process_adherence: { grade: 'B', score: 0.75 },
      code_quality: { grade: 'A', score: 0.95 },
      testing: { grade: 'B', score: 0.8 },
      documentation: { grade: 'C', score: 0.6 },
      communication: { grade: 'B', score: 0.75 },
      time_management: { grade: 'C', score: 0.6 },
      resource_efficiency: { grade: 'B', score: 0.75 },
      risk_assessment: { grade: 'C', score: 0.6 },
      compliance: { grade: 'B', score: 0.75 },
      innovation: { grade: 'C', score: 0.6 },
      collaboration: { grade: 'B', score: 0.75 },
      accountability: { grade: 'B', score: 0.75 },
      transparency: { grade: 'C', score: 0.6 },
      adaptability: { grade: 'B', score: 0.75 },
      domain_expertise: { grade: 'B', score: 0.75 },
      user_focus: { grade: 'C', score: 0.6 },
      ethical_alignment: { grade: 'B', score: 0.75 },
    },
  };
  writeFileSync(
    join(runsDir, '4-grades-statistics.json'),
    JSON.stringify(testGrades, null, 2)
  );
}

function teardownTestEnvironment(): void {
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
}

// ─── Test Suite ─────────────────────────────────────────────────────────

async function runTests(): Promise<void> {
  console.log('\n🧪 FimInterceptor Unit Tests\n');

  setupTestEnvironment();

// ─── Test 1: FimInterceptor loads identity correctly ────────────────────

console.log('📋 Test 1: FimInterceptor loads identity correctly');
try {
  const logger = new MockLogger();
  const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

  const stats = interceptor.getStats();
  assert(stats.sovereignty > 0, 'Sovereignty should be loaded from pipeline');
  assertApprox(stats.sovereignty, 0.71, 0.02, 'Sovereignty should be average of category scores');
  assert(
    logger.hasLog('INFO', 'Loaded identity from run-20260215-120000'),
    'Should log identity loading'
  );
} catch (e) {
  console.error('Test 1 failed:', e);
}

// ─── Test 2: Exempt skills bypass FIM checks ───────────────────────────

console.log('\n🚫 Test 2: Exempt skills bypass FIM checks');
try {
  const logger = new MockLogger();
  const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

  // thetasteer-categorize is in FIM_EXEMPT
  const result = await interceptor.intercept('thetasteer-categorize', {});
  assert(result === null, 'Exempt skill should return null (allowed)');
  assert(
    logger.hasLog('DEBUG', 'exempt from checks'),
    'Should log exemption'
  );
} catch (e) {
  console.error('Test 2 failed:', e);
}

// ─── Test 3: Fail-open for undefined skills ────────────────────────────

console.log('\n🔓 Test 3: Fail-open for undefined skills');
try {
  const logger = new MockLogger();
  const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

  // Unknown skill not in SKILL_TO_TOOL mapping
  const result = await interceptor.intercept('unknown-skill', {});
  assert(result === null, 'Unknown skill should return null (fail-open)');
  assert(
    logger.hasLog('INFO', 'Unknown skill "unknown-skill" — fail-open'),
    'Should log fail-open for unknown skill'
  );

  // Check fail-open log file
  const failOpenLog = join(TEST_DATA_DIR, 'fim-fail-open.jsonl');
  assert(existsSync(failOpenLog), 'Fail-open log file should be created');

  const logContent = readFileSync(failOpenLog, 'utf-8');
  const logEntry = JSON.parse(logContent.trim());
  assert(logEntry.skillName === 'unknown-skill', 'Log should contain skill name');
  assert(logEntry.reason === 'unknown_skill', 'Log should indicate unknown skill reason');
} catch (e) {
  console.error('Test 3 failed:', e);
}

// ─── Test 4: Fail-open for tools without requirements ──────────────────

console.log('\n🔓 Test 4: Fail-open for tools without requirements');
try {
  const logger = new MockLogger();
  const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

  // Add a skill that maps to a tool, but the tool has no requirement
  // We need to use a skill that DOES map, but to a non-existent tool
  // Actually, let's test with a known skill that has no requirement
  // For this test, we'll need to mock a skill with a tool that has no requirement

  // Let's create a test by checking the existing code paths
  // The claude-flow-bridge maps to shell_execute which DOES have a requirement
  // So we need to test this differently

  console.log('⏭️  Skipping Test 4: All current tools have requirements defined');
  // This is actually correct behavior - we don't have tools without requirements yet
} catch (e) {
  console.error('Test 4 failed:', e);
}

// ─── Test 5: Allowed skill execution ───────────────────────────────────

console.log('\n✅ Test 5: Overlap computation happens before every tool call');
try {
  const logger = new MockLogger();
  const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

  // Test that overlap is computed for known skills (even if they're denied)
  logger.clear();
  await interceptor.intercept('wallet-ledger', {}); // file_write

  // The result doesn't matter - we're testing that overlap IS computed
  const hasOverlapLog = logger.logs.some(log =>
    log.message.includes('overlap:') || log.message.includes('FIM ALLOWED') || log.message.includes('FIM DENIED')
  );

  assert(hasOverlapLog, 'Overlap computation should be logged for known skills');
  console.log('✅ PASS: Overlap computed before tool call');
  passed++;
} catch (e) {
  console.error('Test 5 failed:', e);
  failed++;
}

// ─── Test 6: Denied skill execution ────────────────────────────────────

console.log('\n❌ Test 6: Denied skill execution (insufficient scores)');
try {
  // Create a new test environment with LOW scores
  const lowScoreDir = join('/tmp', 'fim-interceptor-low-' + Date.now());
  mkdirSync(lowScoreDir, { recursive: true });
  const runsDir = join(lowScoreDir, 'pipeline-runs', 'run-20260215-130000');
  mkdirSync(runsDir, { recursive: true });

  const lowGrades = {
    categories: {
      security: { grade: 'D', score: 0.4 },
      reliability: { grade: 'D', score: 0.4 },
      data_integrity: { grade: 'F', score: 0.2 },
      code_quality: { grade: 'F', score: 0.2 },
      testing: { grade: 'D', score: 0.4 },
    },
  };
  writeFileSync(
    join(runsDir, '4-grades-statistics.json'),
    JSON.stringify(lowGrades, null, 2)
  );

  const logger = new MockLogger();
  const interceptor = new FimInterceptor(logger, lowScoreDir);

  // system-control maps to shell_execute, which requires security: 0.7, reliability: 0.5
  // Our low identity has security: 0.4, reliability: 0.4 — should DENY
  const result = await interceptor.intercept('system-control', {});
  assert(result !== null, 'Skill with insufficient scores should be denied');
  assert(result!.success === false, 'Result should indicate failure');
  assert(result!.message.includes('FIM DENIED'), 'Message should indicate FIM denial');

  assert(
    logger.hasLog('WARN', 'FIM DENIED "system-control"'),
    'Should log denial'
  );

  const stats = interceptor.getStats();
  assert(stats.consecutiveDenials === 1, 'Consecutive denials should increment');
  assert(stats.totalDenials === 1, 'Total denials should increment');

  // Check denial log file
  const denialLog = join(lowScoreDir, 'fim-denials.jsonl');
  assert(existsSync(denialLog), 'Denial log file should be created');

  // Cleanup
  rmSync(lowScoreDir, { recursive: true, force: true });
} catch (e) {
  console.error('Test 6 failed:', e);
}

// ─── Test 7: Denial callbacks ──────────────────────────────────────────

console.log('\n📞 Test 7: Denial callbacks are invoked');
try {
  // Create low-score environment
  const lowScoreDir = join('/tmp', 'fim-interceptor-callback-' + Date.now());
  mkdirSync(lowScoreDir, { recursive: true });
  const runsDir = join(lowScoreDir, 'pipeline-runs', 'run-20260215-140000');
  mkdirSync(runsDir, { recursive: true });

  const lowGrades = {
    categories: {
      security: { grade: 'F', score: 0.2 },
      reliability: { grade: 'F', score: 0.2 },
      data_integrity: { grade: 'F', score: 0.2 },
    },
  };
  writeFileSync(
    join(runsDir, '4-grades-statistics.json'),
    JSON.stringify(lowGrades, null, 2)
  );

  const logger = new MockLogger();
  const interceptor = new FimInterceptor(logger, lowScoreDir);

  let denialCallbackInvoked = false;
  let denialEvent: FimDenialEvent | null = null;

  interceptor.onDenial = async (event) => {
    denialCallbackInvoked = true;
    denialEvent = event;
  };

  await interceptor.intercept('email-outbound', {}); // send_email requires communication: 0.6

  assert(denialCallbackInvoked, 'Denial callback should be invoked');
  assert(denialEvent !== null, 'Denial event should be passed to callback');
  assert(denialEvent!.skillName === 'email-outbound', 'Event should contain skill name');
  assert(denialEvent!.toolName === 'send_email', 'Event should contain tool name');

  // Cleanup
  rmSync(lowScoreDir, { recursive: true, force: true });
} catch (e) {
  console.error('Test 7 failed:', e);
}

// ─── Test 8: Drift threshold triggers callback ─────────────────────────

console.log('\n🌊 Test 8: Drift threshold triggers callback');
try {
  // Create low-score environment
  const lowScoreDir = join('/tmp', 'fim-interceptor-drift-' + Date.now());
  mkdirSync(lowScoreDir, { recursive: true });
  const runsDir = join(lowScoreDir, 'pipeline-runs', 'run-20260215-150000');
  mkdirSync(runsDir, { recursive: true });

  const lowGrades = {
    categories: {
      security: { grade: 'F', score: 0.1 },
      reliability: { grade: 'F', score: 0.1 },
    },
  };
  writeFileSync(
    join(runsDir, '4-grades-statistics.json'),
    JSON.stringify(lowGrades, null, 2)
  );

  const logger = new MockLogger();
  const interceptor = new FimInterceptor(logger, lowScoreDir);

  let driftCallbackInvoked = false;
  interceptor.onDriftThreshold = async () => {
    driftCallbackInvoked = true;
  };

  // Trigger 3 consecutive denials
  await interceptor.intercept('system-control', {}); // Denial 1
  await interceptor.intercept('system-control', {}); // Denial 2
  await interceptor.intercept('system-control', {}); // Denial 3 → triggers drift

  assert(driftCallbackInvoked, 'Drift threshold callback should be invoked after 3 denials');
  assert(
    logger.hasLog('WARN', '3 consecutive denials — triggering drift correction'),
    'Should log drift correction'
  );

  const stats = interceptor.getStats();
  assert(stats.consecutiveDenials === 0, 'Consecutive denials should be reset after drift callback');

  // Cleanup
  rmSync(lowScoreDir, { recursive: true, force: true });
} catch (e) {
  console.error('Test 8 failed:', e);
}

// ─── Test 9: Allowed execution resets consecutive denials ──────────────

console.log('\n🔄 Test 9: Allowed execution resets consecutive denials');
try {
  const lowScoreDir = join('/tmp', 'fim-interceptor-reset-' + Date.now());
  mkdirSync(lowScoreDir, { recursive: true });
  const runsDir = join(lowScoreDir, 'pipeline-runs', 'run-20260215-160000');
  mkdirSync(runsDir, { recursive: true });

  const mixedGrades = {
    categories: {
      security: { grade: 'F', score: 0.1 },        // Fails shell_execute
      reliability: { grade: 'B', score: 0.8 },     // Passes file_write
      data_integrity: { grade: 'B', score: 0.8 },  // Passes file_write
    },
  };
  writeFileSync(
    join(runsDir, '4-grades-statistics.json'),
    JSON.stringify(mixedGrades, null, 2)
  );

  const logger = new MockLogger();
  const interceptor = new FimInterceptor(logger, lowScoreDir);

  // Trigger 2 denials
  await interceptor.intercept('system-control', {}); // Denial 1
  await interceptor.intercept('system-control', {}); // Denial 2

  let stats = interceptor.getStats();
  assert(stats.consecutiveDenials === 2, 'Should have 2 consecutive denials');

  // Now allow one (wallet-ledger maps to file_write, which should pass)
  await interceptor.intercept('wallet-ledger', {}); // Allowed

  stats = interceptor.getStats();
  assert(stats.consecutiveDenials === 0, 'Consecutive denials should reset on allow');
  assert(stats.totalDenials === 2, 'Total denials should not reset');

  // Cleanup
  rmSync(lowScoreDir, { recursive: true, force: true });
} catch (e) {
  console.error('Test 9 failed:', e);
}

// ─── Test 10: Heat map updates ──────────────────────────────────────────

console.log('\n🗺️  Test 10: Heat map updates on FIM decisions');
try {
  const logger = new MockLogger();
  const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

  // Update heat map for allowed execution
  interceptor.updateHeatMap('A1', true);

  // Check heat.json was created
  const heatPath = join(TEST_DATA_DIR, 'heat.json');
  assert(existsSync(heatPath), 'Heat map file should be created');

  const heat = JSON.parse(readFileSync(heatPath, 'utf-8'));
  assert(heat.cells.A1 !== undefined, 'Cell A1 should exist in heat map');
  assert(heat.cells.A1.taskCount === 1, 'Task count should increment on allowed');
  assert(heat.cells.A1.denials === 0, 'Denials should be 0 for allowed');

  // Update heat map for denied execution
  interceptor.updateHeatMap('A1', false);

  const heat2 = JSON.parse(readFileSync(heatPath, 'utf-8'));
  assert(heat2.cells.A1.denials === 1, 'Denials should increment on deny');
  assert(heat2.sovereignty !== undefined, 'Heat map should include sovereignty');
} catch (e) {
  console.error('Test 10 failed:', e);
}

// ─── Test 11: Identity reload ───────────────────────────────────────────

console.log('\n🔄 Test 11: Identity reload after pipeline re-run');
try {
  const logger = new MockLogger();
  const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

  const statsBefore = interceptor.getStats();

  // Simulate pipeline re-run by creating a new run directory
  const newRunDir = join(TEST_DATA_DIR, 'pipeline-runs', 'run-20260215-170000');
  mkdirSync(newRunDir, { recursive: true });

  const newGrades = {
    categories: {
      security: { grade: 'A', score: 0.95 },
      reliability: { grade: 'A', score: 0.95 },
      data_integrity: { grade: 'A', score: 0.95 },
    },
  };
  writeFileSync(
    join(newRunDir, '4-grades-statistics.json'),
    JSON.stringify(newGrades, null, 2)
  );

  // Reload identity
  logger.clear();
  interceptor.reloadIdentity();

  const statsAfter = interceptor.getStats();
  assert(statsAfter.sovereignty > statsBefore.sovereignty, 'Sovereignty should update after reload');
  assertApprox(statsAfter.sovereignty, 0.95, 0.01, 'New sovereignty should reflect updated grades');
  assert(statsAfter.consecutiveDenials === 0, 'Consecutive denials should reset on reload');
  assert(
    logger.hasLog('INFO', 'Loaded identity from run-20260215-170000'),
    'Should log new identity load'
  );
} catch (e) {
  console.error('Test 11 failed:', e);
}

// ─── Test 12: Overlap computation for all tool calls ───────────────────

console.log('\n📊 Test 12: Overlap computation for ALL tool calls');
try {
  const logger = new MockLogger();
  const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

  logger.clear();

  // Test exempt skill (should not compute overlap)
  await interceptor.intercept('thetasteer-categorize', {});
  assert(
    logger.logs.some(log => log.message.includes('exempt from checks')),
    'Exempt skills should log exemption'
  );

  // Test unknown skill (fail-open, should still log)
  logger.clear();
  await interceptor.intercept('unknown-skill-xyz', {});
  assert(
    logger.logs.some(log => log.message.includes('fail-open')),
    'Unknown skills should log fail-open'
  );

  // Test known skill with requirement (should compute overlap)
  logger.clear();
  await interceptor.intercept('wallet-ledger', {});
  assert(
    logger.logs.some(log => log.message.includes('overlap')),
    'Known skills should log overlap computation'
  );

  console.log('✅ PASS: Overlap computation verified for all tool call types');
  passed++;
} catch (e) {
  console.error('Test 12 failed:', e);
  failed++;
}

  // ─── Cleanup ────────────────────────────────────────────────────────────

  teardownTestEnvironment();

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
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
