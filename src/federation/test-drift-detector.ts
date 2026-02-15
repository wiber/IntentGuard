/**
 * Test script for drift-detector.ts
 * Run with: npx tsx src/federation/test-drift-detector.ts
 */

import { DriftDetector, DRIFT_THRESHOLD } from './drift-detector';
import { FederationRegistry } from './registry';
import { TrustDebtCategory, TRUST_DEBT_CATEGORIES } from '../auth/geometric';
import { rmSync, existsSync } from 'fs';

console.log('=== Testing Drift Detector ===\n');

// ─── Test Helpers ───────────────────────────────────────────────────────

const TEST_DATA_DIR = './test-data-drift';

function cleanupTestData() {
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
}

/**
 * Generate a random 20-dimensional geometry vector.
 */
function randomGeometry(): Partial<Record<TrustDebtCategory, number>> {
  const geometry: Partial<Record<TrustDebtCategory, number>> = {};
  for (const cat of TRUST_DEBT_CATEGORIES) {
    geometry[cat] = Math.random();
  }
  return geometry;
}

/**
 * Create a geometry similar to another (high overlap).
 */
function similarGeometry(
  base: Partial<Record<TrustDebtCategory, number>>,
  noise: number = 0.05,
): Partial<Record<TrustDebtCategory, number>> {
  const geometry: Partial<Record<TrustDebtCategory, number>> = {};
  for (const cat of TRUST_DEBT_CATEGORIES) {
    const val = base[cat] ?? 0;
    geometry[cat] = val + (Math.random() - 0.5) * noise;
  }
  return geometry;
}

/**
 * Apply drift to a geometry vector (deterministic version for testing).
 */
function applyDrift(
  base: Partial<Record<TrustDebtCategory, number>>,
  driftAmount: number,
): Partial<Record<TrustDebtCategory, number>> {
  const geometry: Partial<Record<TrustDebtCategory, number>> = {};
  let i = 0;
  for (const cat of TRUST_DEBT_CATEGORIES) {
    const val = base[cat] ?? 0;
    // Apply deterministic drift (alternating +/- pattern)
    const direction = i % 2 === 0 ? 1 : -1;
    geometry[cat] = val + direction * driftAmount;
    i++;
  }
  return geometry;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

// ─── Setup ──────────────────────────────────────────────────────────────

cleanupTestData();

// Create local geometry with high values (trusted bot)
const localGeometry: Partial<Record<TrustDebtCategory, number>> = {};
for (const cat of TRUST_DEBT_CATEGORIES) {
  localGeometry[cat] = 0.8 + Math.random() * 0.2; // 0.8-1.0 range
}

const registry = new FederationRegistry(TEST_DATA_DIR, localGeometry);
const detector = new DriftDetector(registry);

// ─── Test 1: No Drift Detection for Unregistered Bot ───────────────────

console.log('\n--- Test 1: Unregistered Bot ---');
const unknownGeometry = randomGeometry();
const result1 = detector.checkBot('unknown-bot', unknownGeometry);
assert(!result1.drifted, 'Unregistered bot should not show drift');
assert(!result1.quarantined, 'Unregistered bot should not be quarantined');
assert(result1.reason?.includes('not registered') ?? false, 'Should report bot not registered');

// ─── Test 2: No Drift When Geometry Unchanged ──────────────────────────

console.log('\n--- Test 2: Unchanged Geometry ---');
const geometry2 = similarGeometry(localGeometry, 0.05);
registry.registerBot('bot-1', 'Test Bot 1', geometry2);

const result2 = detector.checkBot('bot-1', geometry2);
assert(!result2.drifted, 'Same geometry should not show drift');
assert(!result2.quarantined, 'Same geometry should not be quarantined');
assert(result2.delta === 0, 'Delta should be zero for same geometry');

// ─── Test 3: No Drift When Change Within Tolerance ─────────────────────

console.log('\n--- Test 3: Within Tolerance ---');
const geometry3 = similarGeometry(localGeometry, 0.01);
registry.registerBot('bot-2', 'Test Bot 2', geometry3);

const tinydrift3 = applyDrift(geometry3, 0.001);
const result3 = detector.checkBot('bot-2', tinydrift3);
assert(!result3.drifted || result3.delta <= DRIFT_THRESHOLD, 'Tiny drift should stay within tolerance');

// ─── Test 4: Drift Detection Above Threshold ───────────────────────────

console.log('\n--- Test 4: Drift Detection ---');
const geometry4 = similarGeometry(localGeometry, 0.05);
registry.registerBot('bot-3', 'Test Bot 3', geometry4);

const drifted4 = applyDrift(geometry4, 0.3); // More aggressive drift
const result4 = detector.checkBot('bot-3', drifted4);
console.log(`  Delta: ${result4.delta.toFixed(6)}, Drifted: ${result4.drifted}`);
assert(result4.drifted, 'Large drift should be detected');
assert(result4.delta > DRIFT_THRESHOLD, 'Delta should exceed threshold');
assert(result4.oldHash !== result4.newHash, 'Geometry hash should change');

// ─── Test 5: Auto-Quarantine on Drift ──────────────────────────────────

console.log('\n--- Test 5: Auto-Quarantine ---');
const geometry5 = similarGeometry(localGeometry, 0.05);
registry.registerBot('bot-4', 'Test Bot 4', geometry5);

const drifted5 = applyDrift(geometry5, 0.3); // More aggressive drift
const result5 = detector.checkBot('bot-4', drifted5);
console.log(`  Delta: ${result5.delta.toFixed(6)}, Drifted: ${result5.drifted}, Quarantined: ${result5.quarantined}`);
console.log(`  Reason: ${result5.reason}`);
assert(result5.drifted, 'Drift should be detected');
assert(result5.quarantined, 'Bot should be auto-quarantined');
assert(result5.reason?.includes('Auto-quarantined') ?? false, 'Reason should mention auto-quarantine');

const bot4 = registry.getBotStatus('bot-4');
console.log(`  Bot status: ${bot4?.status}`);
assert(bot4?.status === 'quarantined', 'Bot should be quarantined in registry');

// ─── Test 6: Already Quarantined Bot ───────────────────────────────────

console.log('\n--- Test 6: Already Quarantined ---');
const geometry6 = similarGeometry(localGeometry, 0.05);
registry.registerBot('bot-5', 'Test Bot 5', geometry6);
registry.quarantineBot('bot-5', 'Manual quarantine');

const drifted6 = applyDrift(geometry6, 0.3);
const result6 = detector.checkBot('bot-5', drifted6);
console.log(`  Delta: ${result6.delta.toFixed(6)}, Drifted: ${result6.drifted}, Quarantined: ${result6.quarantined}`);
console.log(`  Reason: ${result6.reason}`);
assert(result6.drifted, 'Drift should still be detected');
assert(!result6.quarantined, 'Should not re-quarantine (already quarantined)');
assert(result6.reason?.includes('already quarantined') ?? false, 'Reason should mention already quarantined');

// ─── Test 7: Gradual Drift Simulation ──────────────────────────────────

console.log('\n--- Test 7: Gradual Drift Simulation ---');
const geometry7 = similarGeometry(localGeometry, 0.05);
registry.registerBot('bot-7', 'Test Bot 7', geometry7);

let current7 = geometry7;
let driftDetected = false;

for (let i = 0; i < 10; i++) {
  current7 = applyDrift(current7, 0.02);
  const result = detector.checkBot('bot-7', current7);
  if (result.drifted) {
    driftDetected = true;
    console.log(`  Drift detected at timestep ${i + 1}: Δ=${result.delta.toFixed(6)}`);
    break;
  }
}

assert(driftDetected, 'Gradual drift should eventually be detected');

// ─── Test 8: Sudden Drift Spike ────────────────────────────────────────

console.log('\n--- Test 8: Sudden Drift Spike ---');
const geometry8 = similarGeometry(localGeometry, 0.05);
registry.registerBot('bot-8', 'Test Bot 8', geometry8);

const spiked8 = applyDrift(geometry8, 0.5);
const result8 = detector.checkBot('bot-8', spiked8);
assert(result8.drifted, 'Sudden drift spike should be detected');
assert(result8.quarantined, 'Sudden drift spike should trigger quarantine');
assert(result8.delta > 0.01, 'Delta should be significant');
console.log(`  Spike delta: ${result8.delta.toFixed(6)}`);

// ─── Test 9: Batch Operations ──────────────────────────────────────────

console.log('\n--- Test 9: Batch Operations ---');
const checks: Array<[string, Partial<Record<TrustDebtCategory, number>>]> = [];

for (let i = 0; i < 3; i++) {
  const geom = similarGeometry(localGeometry, 0.05);
  registry.registerBot(`batch-bot-${i}`, `Batch Bot ${i}`, geom);

  const drifted = applyDrift(geom, 0.1 * (i + 1));
  checks.push([`batch-bot-${i}`, drifted]);
}

const batchResults = detector.checkBatch(checks);
assert(batchResults.length === 3, 'Batch should return 3 results');
assert(batchResults[2].delta > batchResults[0].delta, 'Higher drift should show larger delta');
console.log(`  Batch deltas: ${batchResults.map(r => r.delta.toFixed(6)).join(', ')}`);

// ─── Test 10: Monitor All Bots ─────────────────────────────────────────

console.log('\n--- Test 10: Monitor All Bots ---');
const geometries = new Map<string, Partial<Record<TrustDebtCategory, number>>>();

for (let i = 0; i < 4; i++) {
  const geom = similarGeometry(localGeometry, 0.05);
  registry.registerBot(`monitor-bot-${i}`, `Monitor Bot ${i}`, geom);

  const drifted = applyDrift(geom, 0.08 * (i + 1));
  geometries.set(`monitor-bot-${i}`, drifted);
}

const monitorResults = detector.monitorAll(geometries);
assert(monitorResults.length > 0, 'Monitor should return results');

const driftedBots = monitorResults.filter(r => r.drifted);
assert(driftedBots.length > 0, 'At least some bots should show drift');
console.log(`  Monitored ${monitorResults.length} bots, ${driftedBots.length} drifted`);

// ─── Test 11: Statistics Tracking ──────────────────────────────────────

console.log('\n--- Test 11: Statistics Tracking ---');
const stats = detector.getStats();
assert(stats.totalChecks > 0, 'Should have tracked checks');
assert(stats.driftsDetected > 0, 'Should have detected drifts');
assert(stats.botsQuarantined > 0, 'Should have quarantined bots');
assert(stats.maxDelta > 0, 'Should have max delta');
console.log(`  Stats: ${stats.totalChecks} checks, ${stats.driftsDetected} drifts, ${stats.botsQuarantined} quarantined`);
console.log(`  Max delta: ${stats.maxDelta.toFixed(6)}, Avg delta: ${stats.averageDelta.toFixed(6)}`);

// ─── Test 12: Event Logging ────────────────────────────────────────────

console.log('\n--- Test 12: Event Logging ---');
const events = detector.getRecentEvents(5);
assert(events.length > 0, 'Should have logged events');
assert(events[0].botId !== undefined, 'Event should have bot ID');
console.log(`  Recent events: ${events.length}`);
console.log(`  Latest event: bot=${events[0].botId}, quarantined=${events[0].quarantined}`);

// ─── Test 13: Export Events ────────────────────────────────────────────

console.log('\n--- Test 13: Export Events ---');
const exported = detector.exportEvents();
const parsed = JSON.parse(exported);
assert(parsed.exported !== undefined, 'Export should include timestamp');
assert(parsed.stats !== undefined, 'Export should include stats');
assert(Array.isArray(parsed.events), 'Export should include events array');
console.log(`  Exported ${parsed.events.length} events`);

// ─── Test 14: Custom Thresholds ────────────────────────────────────────

console.log('\n--- Test 14: Custom Thresholds ---');
const geometry14 = similarGeometry(localGeometry, 0.05);
registry.registerBot('custom-bot-1', 'Custom Bot 1', geometry14);

const drifted14 = applyDrift(geometry14, 0.02);

// Strict threshold
const resultStrict = detector.checkBot('custom-bot-1', drifted14, 0.001);
// Lenient threshold
const resultLenient = detector.checkBot('custom-bot-1', drifted14, 0.05);

console.log(`  Strict (0.001): drifted=${resultStrict.drifted}, delta=${resultStrict.delta.toFixed(6)}`);
console.log(`  Lenient (0.05): drifted=${resultLenient.drifted}, delta=${resultLenient.delta.toFixed(6)}`);

assert(resultStrict.threshold === 0.001, 'Strict result should use 0.001 threshold');
assert(resultLenient.threshold === 0.05, 'Lenient result should use 0.05 threshold');

// ─── Test 15: Reset Statistics ──────────────────────────────────────────

console.log('\n--- Test 15: Reset Statistics ---');
detector.reset();
const statsAfterReset = detector.getStats();
assert(statsAfterReset.totalChecks === 0, 'Checks should be reset to 0');
assert(statsAfterReset.driftsDetected === 0, 'Drifts should be reset to 0');
assert(statsAfterReset.botsQuarantined === 0, 'Quarantines should be reset to 0');
console.log('  Statistics reset successfully');

// ─── Test 16: Precise 0.003 Threshold Boundary ─────────────────────────

console.log('\n--- Test 16: Precise 0.003 Threshold ---');
const geometry16 = similarGeometry(localGeometry, 0.01);
registry.registerBot('bot-6', 'Test Bot 6', geometry16);

// Apply small drift to test boundary
const drifted16 = applyDrift(geometry16, 0.012);
const result16 = detector.checkBot('bot-6', drifted16, 0.003);
console.log(`  Delta: ${result16.delta.toFixed(6)}, Threshold: ${result16.threshold}`);
console.log(`  Drifted: ${result16.drifted}, Quarantined: ${result16.quarantined}`);

if (result16.delta > 0.003) {
  assert(result16.drifted, 'Should drift if delta > 0.003');
} else {
  assert(!result16.drifted, 'Should not drift if delta <= 0.003');
}

// ─── Cleanup ────────────────────────────────────────────────────────────

console.log('\n--- Cleanup ---');
cleanupTestData();
console.log('Test data cleaned up');

// ─── Summary ────────────────────────────────────────────────────────────

console.log('\n=== ✅ All Drift Detector Tests Passed! ===');
console.log(`Default drift threshold: ${DRIFT_THRESHOLD}`);
console.log('Drift detection system is operational and ready for production use.\n');
