/**
 * src/federation/integration.test.ts — Federation Integration Test
 *
 * Tests the complete federation system integration:
 *   - Module exports
 *   - Registry persistence
 *   - Handshake protocol
 *   - Drift detection
 *   - Discord command integration (mock)
 *
 * USAGE:
 *   npx tsx src/federation/integration.test.ts
 */

import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { strict as assert } from 'assert';

// Import all federation modules
import {
  FederationHandshake,
  FederationRegistry,
  computeTensorOverlap,
  isCompatible,
  geometryHash,
  TRUST_THRESHOLD,
  QUARANTINE_THRESHOLD,
  type HandshakeRequest,
  type BotEntry,
} from './index';

import { TRUST_DEBT_CATEGORIES, type TrustDebtCategory } from '../auth/geometric';

// ═══════════════════════════════════════════════════════════════════════
// Test Configuration
// ═══════════════════════════════════════════════════════════════════════

const TEST_DATA_DIR = './data-integration-test';

// Mock geometries for testing
const BOT_A_GEOMETRY: Partial<Record<TrustDebtCategory, number>> = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  if (cat === 'security') acc[cat] = 0.9;
  else if (cat === 'testing') acc[cat] = 0.7;
  else if (cat === 'code_quality') acc[cat] = 0.8;
  else acc[cat] = 0.75;
  return acc;
}, {} as Partial<Record<TrustDebtCategory, number>>);

const BOT_B_GEOMETRY: Partial<Record<TrustDebtCategory, number>> = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  if (cat === 'security') acc[cat] = 0.95;
  else if (cat === 'reliability') acc[cat] = 0.9;
  else if (cat === 'code_quality') acc[cat] = 0.85;
  else if (cat === 'testing') acc[cat] = 0.85;
  else acc[cat] = 0.8;
  return acc;
}, {} as Partial<Record<TrustDebtCategory, number>>);

const BOT_C_GEOMETRY: Partial<Record<TrustDebtCategory, number>> = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  // Use zeros to create minimal overlap (cosine similarity with all zeros = 0)
  acc[cat] = 0.0;
  return acc;
}, {} as Partial<Record<TrustDebtCategory, number>>);

// ═══════════════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════════════

async function runTests(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        Federation Integration Test Suite                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Setup: Clean test directory
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true });
  }
  mkdirSync(TEST_DATA_DIR, { recursive: true });

  let testsPassed = 0;
  let testsFailed = 0;

  // ─── Test 1: Module Exports ──────────────────────────────────────────

  try {
    console.log('Test 1: Module exports...');

    assert(typeof FederationHandshake === 'function', 'FederationHandshake should be exported');
    assert(typeof FederationRegistry === 'function', 'FederationRegistry should be exported');
    assert(typeof computeTensorOverlap === 'function', 'computeTensorOverlap should be exported');
    assert(typeof isCompatible === 'function', 'isCompatible should be exported');
    assert(typeof geometryHash === 'function', 'geometryHash should be exported');
    assert(typeof TRUST_THRESHOLD === 'number', 'TRUST_THRESHOLD should be exported');
    assert(typeof QUARANTINE_THRESHOLD === 'number', 'QUARANTINE_THRESHOLD should be exported');

    console.log('✅ PASS: All federation modules exported correctly\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAIL:', error instanceof Error ? error.message : error);
    testsFailed++;
  }

  // ─── Test 2: Tensor Overlap Computation ──────────────────────────────

  try {
    console.log('Test 2: Tensor overlap computation...');

    const overlapAB = computeTensorOverlap(BOT_A_GEOMETRY, BOT_B_GEOMETRY);
    assert(overlapAB.overlap >= 0 && overlapAB.overlap <= 1, 'Overlap should be in [0,1]');
    assert(overlapAB.overlap >= TRUST_THRESHOLD, 'Bot A and B should be compatible');
    assert(Array.isArray(overlapAB.aligned), 'aligned should be an array');
    assert(Array.isArray(overlapAB.divergent), 'divergent should be an array');

    const overlapAC = computeTensorOverlap(BOT_A_GEOMETRY, BOT_C_GEOMETRY);
    assert(overlapAC.overlap < TRUST_THRESHOLD, 'Bot A and C should NOT be compatible');
    assert(overlapAC.divergent.length > 0, 'Bot A and C should have divergent categories');

    console.log(`  Bot A ↔ B: overlap=${overlapAB.overlap.toFixed(3)} (compatible)`);
    console.log(`  Bot A ↔ C: overlap=${overlapAC.overlap.toFixed(3)} (incompatible)`);
    console.log('✅ PASS: Tensor overlap computation works correctly\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAIL:', error instanceof Error ? error.message : error);
    testsFailed++;
  }

  // ─── Test 3: isCompatible Helper ──────────────────────────────────────

  try {
    console.log('Test 3: isCompatible helper...');

    assert(isCompatible(BOT_A_GEOMETRY, BOT_B_GEOMETRY) === true, 'Bot A and B should be compatible');
    assert(isCompatible(BOT_A_GEOMETRY, BOT_C_GEOMETRY) === false, 'Bot A and C should NOT be compatible');

    console.log('✅ PASS: isCompatible helper works correctly\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAIL:', error instanceof Error ? error.message : error);
    testsFailed++;
  }

  // ─── Test 4: Geometry Hash ────────────────────────────────────────────

  try {
    console.log('Test 4: Geometry hash...');

    const hashA1 = geometryHash(BOT_A_GEOMETRY);
    const hashA2 = geometryHash(BOT_A_GEOMETRY);
    const hashB = geometryHash(BOT_B_GEOMETRY);

    assert(hashA1 === hashA2, 'Same geometry should produce same hash');
    assert(hashA1 !== hashB, 'Different geometries should produce different hashes');
    assert(hashA1.length === 64, 'Hash should be 64 characters (SHA-256)');

    console.log(`  Hash A: ${hashA1.substring(0, 16)}...`);
    console.log(`  Hash B: ${hashB.substring(0, 16)}...`);
    console.log('✅ PASS: Geometry hash works correctly\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAIL:', error instanceof Error ? error.message : error);
    testsFailed++;
  }

  // ─── Test 5: Federation Registry ──────────────────────────────────────

  try {
    console.log('Test 5: Federation registry...');

    const registry = new FederationRegistry(TEST_DATA_DIR, BOT_A_GEOMETRY);

    // Register Bot B (should be trusted)
    const entryB = registry.registerBot('bot-b-001', 'Bot B', BOT_B_GEOMETRY);
    assert(entryB.status === 'trusted', 'Bot B should be trusted');
    assert(entryB.overlap >= TRUST_THRESHOLD, 'Bot B overlap should be >= threshold');

    // Register Bot C (should be quarantined)
    const entryC = registry.registerBot('bot-c-001', 'Bot C', BOT_C_GEOMETRY);
    assert(entryC.status === 'quarantined', 'Bot C should be quarantined');
    assert(entryC.overlap < QUARANTINE_THRESHOLD, 'Bot C overlap should be < quarantine threshold');

    // Get stats
    const stats = registry.getStats();
    assert(stats.total === 2, 'Should have 2 registered bots');
    assert(stats.trusted === 1, 'Should have 1 trusted bot');
    assert(stats.quarantined === 1, 'Should have 1 quarantined bot');

    // Test persistence
    const registryPath = join(TEST_DATA_DIR, 'federation-registry.json');
    assert(existsSync(registryPath), 'Registry file should exist');

    console.log(`  Registered: ${stats.total} bots (${stats.trusted} trusted, ${stats.quarantined} quarantined)`);
    console.log('✅ PASS: Federation registry works correctly\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAIL:', error instanceof Error ? error.message : error);
    testsFailed++;
  }

  // ─── Test 6: Handshake Protocol ───────────────────────────────────────

  try {
    console.log('Test 6: Handshake protocol...');

    const handshake = new FederationHandshake(
      'bot-a-001',
      'Bot A',
      BOT_A_GEOMETRY,
      TEST_DATA_DIR,
    );

    // Handshake with Bot B (should succeed)
    const requestB: HandshakeRequest = {
      botId: 'bot-b-001',
      botName: 'Bot B',
      geometry: BOT_B_GEOMETRY,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    const responseB = handshake.initiateHandshake(requestB);
    assert(responseB.accepted === true, 'Bot B handshake should be accepted');
    assert(responseB.status === 'trusted', 'Bot B should be trusted');

    // Handshake with Bot C (should fail)
    const requestC: HandshakeRequest = {
      botId: 'bot-c-001',
      botName: 'Bot C',
      geometry: BOT_C_GEOMETRY,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    const responseC = handshake.initiateHandshake(requestC);
    assert(responseC.accepted === false, 'Bot C handshake should be rejected');
    assert(responseC.status === 'quarantined', 'Bot C should be quarantined');

    // Check active channels
    const channels = handshake.listChannels();
    assert(channels.length === 1, 'Should have 1 active channel (Bot B only)');
    assert(channels[0].remoteBotId === 'bot-b-001', 'Active channel should be with Bot B');

    console.log(`  Bot B: accepted=${responseB.accepted}, overlap=${responseB.overlap.toFixed(3)}`);
    console.log(`  Bot C: accepted=${responseC.accepted}, overlap=${responseC.overlap.toFixed(3)}`);
    console.log('✅ PASS: Handshake protocol works correctly\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAIL:', error instanceof Error ? error.message : error);
    testsFailed++;
  }

  // ─── Test 7: Drift Detection ──────────────────────────────────────────

  try {
    console.log('Test 7: Drift detection...');

    const handshake = new FederationHandshake(
      'bot-a-001',
      'Bot A',
      BOT_A_GEOMETRY,
      TEST_DATA_DIR,
    );

    // Register Bot B
    const requestB: HandshakeRequest = {
      botId: 'bot-b-drift-test',
      botName: 'Bot B Drift Test',
      geometry: BOT_B_GEOMETRY,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
    handshake.initiateHandshake(requestB);

    // Simulate Bot B drifting (ALL values drop to near-zero to ensure overlap < 0.6)
    const botB_drifted = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
      acc[cat] = 0.0;  // Complete drift - all trust categories drop to zero
      return acc;
    }, {} as Partial<Record<TrustDebtCategory, number>>);
    const drift = handshake.checkChannelDrift('bot-b-drift-test', botB_drifted);

    assert(drift.drifted === true, 'Drift should be detected');
    assert(drift.newOverlap < drift.oldOverlap, 'New overlap should be lower than old');
    assert(drift.reason !== undefined, 'Drift should have a reason');

    // Check if channel was closed (should be quarantined)
    const channel = handshake.getChannel('bot-b-drift-test');
    assert(channel === null, 'Channel should be closed due to quarantine');

    console.log(`  Old overlap: ${drift.oldOverlap.toFixed(3)}`);
    console.log(`  New overlap: ${drift.newOverlap.toFixed(3)}`);
    console.log(`  Reason: ${drift.reason}`);
    console.log('✅ PASS: Drift detection works correctly\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAIL:', error instanceof Error ? error.message : error);
    testsFailed++;
  }

  // ─── Test 8: Discord Command Integration (Mock) ──────────────────────

  try {
    console.log('Test 8: Discord command integration (mock)...');

    // This test verifies that the federation module can be imported
    // and used in the context expected by the Discord runtime
    const handshake = new FederationHandshake(
      'intentguard-bot-001',
      'IntentGuard Production Bot',
      BOT_A_GEOMETRY,
      TEST_DATA_DIR,
    );

    // Simulate !federation status
    const stats = handshake.getStats();
    assert(typeof stats.activeChannels === 'number', 'Stats should have activeChannels');
    assert(typeof stats.registeredBots === 'number', 'Stats should have registeredBots');
    assert(typeof stats.trusted === 'number', 'Stats should have trusted count');
    assert(typeof stats.quarantined === 'number', 'Stats should have quarantined count');
    assert(typeof stats.unknown === 'number', 'Stats should have unknown count');

    // Simulate !federation list
    const registry = handshake.getRegistry();
    const bots = registry.listBots();
    assert(Array.isArray(bots), 'listBots should return an array');

    // Simulate !federation channels
    const channels = handshake.listChannels();
    assert(Array.isArray(channels), 'listChannels should return an array');

    console.log('  Mock Discord commands validated');
    console.log('✅ PASS: Discord command integration works correctly\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAIL:', error instanceof Error ? error.message : error);
    testsFailed++;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Test Summary
  // ═══════════════════════════════════════════════════════════════════════

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    Test Results                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const total = testsPassed + testsFailed;
  console.log(`Total: ${total} tests`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Success Rate: ${((testsPassed / total) * 100).toFixed(1)}%\n`);

  // Cleanup
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true });
    console.log('🧹 Test data cleaned up\n');
  }

  if (testsFailed > 0) {
    console.error('❌ Integration test suite FAILED\n');
    process.exit(1);
  } else {
    console.log('✅ Integration test suite PASSED\n');
    process.exit(0);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Run Tests
// ═══════════════════════════════════════════════════════════════════════

runTests().catch((error) => {
  console.error('Fatal error during test execution:', error);
  process.exit(1);
});
