/**
 * src/federation/registry.test.ts — Federation Registry Comprehensive Tests
 *
 * Run with: npx tsx src/federation/registry.test.ts
 *
 * Tests for the Federation Registry system including:
 * - Bot registration and updates
 * - Geometry hash tracking
 * - Overlap score computation
 * - Drift detection and auto-quarantine
 * - Status management (trusted, quarantined, unknown)
 * - Persistence and data loading
 * - Edge cases and error handling
 */

import { FederationRegistry, BotEntry, BotStatus } from './registry';
import { TrustDebtCategory, TRUST_DEBT_CATEGORIES } from '../auth/geometric';
import { existsSync, unlinkSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

// ─── Test Utilities ─────────────────────────────────────────────────────

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    testsPassed++;
    console.log(`  ✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`  ✗ ${message}`);
  }
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string): void {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    testsPassed++;
    console.log(`  ✓ ${message} (${actual.toFixed(3)} ≈ ${expected.toFixed(3)})`);
  } else {
    testsFailed++;
    console.error(`  ✗ ${message} (${actual.toFixed(3)} ≠ ${expected.toFixed(3)}, diff=${diff.toFixed(3)})`);
  }
}

// ─── Test Fixtures ──────────────────────────────────────────────────────

const TEST_DATA_DIR = resolve(__dirname, '../../test-data/federation-registry');
const TEST_REGISTRY_PATH = resolve(TEST_DATA_DIR, 'federation-registry.json');

// Sample bot geometries
const LOCAL_GEOMETRY: Partial<Record<TrustDebtCategory, number>> = {
  security: 0.9,
  reliability: 0.85,
  data_integrity: 0.8,
  code_quality: 0.75,
  testing: 0.7,
  documentation: 0.65,
  communication: 0.6,
  process_adherence: 0.55,
};

const SIMILAR_GEOMETRY: Partial<Record<TrustDebtCategory, number>> = {
  security: 0.88,
  reliability: 0.83,
  data_integrity: 0.82,
  code_quality: 0.77,
  testing: 0.72,
  documentation: 0.63,
  communication: 0.58,
  process_adherence: 0.53,
};

const DIVERGENT_GEOMETRY: Partial<Record<TrustDebtCategory, number>> = {
  security: 0.3,
  reliability: 0.2,
  data_integrity: 0.1,
  innovation: 0.9,
  collaboration: 0.8,
  adaptability: 0.85,
  domain_expertise: 0.75,
};

const MEDIUM_GEOMETRY: Partial<Record<TrustDebtCategory, number>> = {
  security: 0.7,
  reliability: 0.65,
  data_integrity: 0.6,
  code_quality: 0.55,
};

const EMPTY_GEOMETRY: Partial<Record<TrustDebtCategory, number>> = {};

// ─── Test Setup & Cleanup ───────────────────────────────────────────────

function setupTest(): FederationRegistry {
  // Create test data directory
  if (!existsSync(TEST_DATA_DIR)) {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
  }

  // Clean up any existing test registry
  if (existsSync(TEST_REGISTRY_PATH)) {
    unlinkSync(TEST_REGISTRY_PATH);
  }

  // Initialize registry with test directory
  return new FederationRegistry(TEST_DATA_DIR, LOCAL_GEOMETRY);
}

function cleanupTest(): void {
  // Clean up test files
  if (existsSync(TEST_REGISTRY_PATH)) {
    unlinkSync(TEST_REGISTRY_PATH);
  }
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
}

// ─── Test Suite ─────────────────────────────────────────────────────────

console.log('=== Federation Registry Comprehensive Tests ===\n');

// Test 1: Bot Registration with High Overlap
console.log('Test 1: Bot Registration - High Overlap (Trusted Status)');
{
  const registry = setupTest();
  const bot = registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);

  assert(bot.id === 'bot-alpha', 'Bot ID is correct');
  assert(bot.name === 'Alpha Bot', 'Bot name is correct');
  assert(bot.status === 'trusted', 'Bot status is trusted');
  assert(bot.overlap >= 0.8, `Bot overlap >= 0.8 (actual: ${bot.overlap.toFixed(3)})`);
  assert(bot.geometryHash.length === 64, 'Geometry hash is SHA-256 (64 chars)');
  assert(bot.lastSeen !== undefined, 'Last seen timestamp exists');
  assert(bot.registeredAt !== undefined, 'Registered at timestamp exists');
  assert(bot.quarantineReason === undefined, 'No quarantine reason for trusted bot');

  cleanupTest();
}
console.log();

// Test 2: Bot Registration with Low Overlap
console.log('Test 2: Bot Registration - Low Overlap (Quarantined Status)');
{
  const registry = setupTest();
  const bot = registry.registerBot('bot-beta', 'Beta Bot', DIVERGENT_GEOMETRY);

  assert(bot.id === 'bot-beta', 'Bot ID is correct');
  assert(bot.status === 'quarantined', 'Bot status is quarantined');
  assert(bot.overlap < 0.6, `Bot overlap < 0.6 (actual: ${bot.overlap.toFixed(3)})`);
  assert(bot.quarantineReason !== undefined, 'Quarantine reason provided');
  assert(bot.quarantineReason?.includes('Low overlap'), 'Quarantine reason mentions low overlap');

  cleanupTest();
}
console.log();

// Test 3: Bot Registration with Medium Overlap
console.log('Test 3: Bot Registration - Medium Overlap (Unknown Status)');
{
  const registry = setupTest();
  const bot = registry.registerBot('bot-gamma', 'Gamma Bot', MEDIUM_GEOMETRY);

  assert(bot.status === 'unknown', 'Bot status is unknown');
  assert(bot.overlap >= 0.6 && bot.overlap < 0.8,
    `Bot overlap in range [0.6, 0.8) (actual: ${bot.overlap.toFixed(3)})`);

  cleanupTest();
}
console.log();

// Test 4: Bot Registration Update
console.log('Test 4: Bot Registration - Update Existing Bot');
{
  const registry = setupTest();

  const bot1 = registry.registerBot('bot-delta', 'Delta Bot v1', SIMILAR_GEOMETRY);
  const originalRegisteredAt = bot1.registeredAt;

  // Small delay to ensure timestamps differ
  const bot2 = registry.registerBot('bot-delta', 'Delta Bot v2', MEDIUM_GEOMETRY);

  assert(bot2.name === 'Delta Bot v2', 'Bot name was updated');
  assert(bot2.registeredAt === originalRegisteredAt, 'Registered timestamp preserved');
  assert(bot2.lastSeen !== bot1.lastSeen, 'Last seen timestamp updated');
  assert(bot2.overlap !== bot1.overlap, 'Overlap recalculated with new geometry');

  cleanupTest();
}
console.log();

// Test 5: Empty Geometry Handling
console.log('Test 5: Empty Geometry Handling');
{
  const registry = setupTest();
  const bot = registry.registerBot('bot-empty', 'Empty Bot', EMPTY_GEOMETRY);

  assert(bot.status === 'quarantined', 'Empty geometry bot is quarantined');
  assert(bot.overlap <= 0.1, `Empty geometry has very low overlap (${bot.overlap.toFixed(3)})`);

  cleanupTest();
}
console.log();

// Test 6: Array Geometry Format
console.log('Test 6: Array Geometry Format Support');
{
  const registry = setupTest();
  const arrayGeometry = new Array(20).fill(0.7);
  const bot = registry.registerBot('bot-array', 'Array Bot', arrayGeometry);

  assert(bot.geometryHash.length === 64, 'Array geometry produces valid hash');
  assert(bot.overlap > 0, 'Array geometry produces valid overlap');

  cleanupTest();
}
console.log();

// Test 7: Get Bot Status
console.log('Test 7: Get Bot Status');
{
  const registry = setupTest();
  registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);
  registry.registerBot('bot-beta', 'Beta Bot', DIVERGENT_GEOMETRY);

  const alphaStatus = registry.getBotStatus('bot-alpha');
  assert(alphaStatus !== null, 'Alpha bot found');
  assert(alphaStatus?.name === 'Alpha Bot', 'Alpha bot name correct');

  const nonExistent = registry.getBotStatus('bot-nonexistent');
  assert(nonExistent === null, 'Non-existent bot returns null');

  cleanupTest();
}
console.log();

// Test 8: List All Bots
console.log('Test 8: List All Bots');
{
  const registry = setupTest();

  assert(registry.listBots().length === 0, 'Empty registry has no bots');

  registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);
  registry.registerBot('bot-beta', 'Beta Bot', DIVERGENT_GEOMETRY);
  registry.registerBot('bot-gamma', 'Gamma Bot', MEDIUM_GEOMETRY);

  const bots = registry.listBots();
  assert(bots.length === 3, 'List returns all 3 bots');
  assert(bots.map(b => b.id).includes('bot-alpha'), 'List contains bot-alpha');
  assert(bots.map(b => b.id).includes('bot-beta'), 'List contains bot-beta');
  assert(bots.map(b => b.id).includes('bot-gamma'), 'List contains bot-gamma');

  cleanupTest();
}
console.log();

// Test 9: Manual Quarantine
console.log('Test 9: Manual Quarantine');
{
  const registry = setupTest();
  registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);

  const success = registry.quarantineBot('bot-alpha', 'Security audit failed');
  assert(success === true, 'Quarantine operation successful');

  const bot = registry.getBotStatus('bot-alpha');
  assert(bot?.status === 'quarantined', 'Bot is now quarantined');
  assert(bot?.quarantineReason === 'Security audit failed', 'Quarantine reason saved');

  const failedQuarantine = registry.quarantineBot('bot-nonexistent', 'Test');
  assert(failedQuarantine === false, 'Quarantining non-existent bot returns false');

  cleanupTest();
}
console.log();

// Test 10: Drift Detection - No Drift
console.log('Test 10: Drift Detection - No Drift (Minor Changes)');
{
  const registry = setupTest();
  registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);

  const slightChange: Partial<Record<TrustDebtCategory, number>> = {
    security: 0.87,
    reliability: 0.84,
    data_integrity: 0.81,
    code_quality: 0.76,
    testing: 0.71,
    documentation: 0.64,
    communication: 0.59,
    process_adherence: 0.54,
  };

  const drift = registry.checkDrift('bot-alpha', slightChange);
  assert(drift.drifted === false, 'Minor changes do not trigger drift');
  assert(drift.reason === undefined, 'No drift reason provided');

  cleanupTest();
}
console.log();

// Test 11: Drift Detection - Significant Change
console.log('Test 11: Drift Detection - Significant Overlap Change');
{
  const registry = setupTest();
  registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);

  const significantChange: Partial<Record<TrustDebtCategory, number>> = {
    security: 0.5,
    reliability: 0.45,
    data_integrity: 0.4,
  };

  const drift = registry.checkDrift('bot-alpha', significantChange);
  const deltaOverlap = Math.abs(drift.newOverlap - drift.oldOverlap);

  assert(deltaOverlap > 0.15 || drift.newOverlap < 0.6,
    `Significant change detected (delta=${deltaOverlap.toFixed(3)})`);
  assert(drift.drifted === true, 'Drift flag is true');
  assert(drift.reason !== undefined, 'Drift reason provided');

  cleanupTest();
}
console.log();

// Test 12: Drift Detection - Auto-Quarantine
console.log('Test 12: Drift Detection - Auto-Quarantine on Low Overlap');
{
  const registry = setupTest();
  registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);

  const drift = registry.checkDrift('bot-alpha', DIVERGENT_GEOMETRY);

  assert(drift.drifted === true, 'Drift detected');
  assert(drift.newOverlap < 0.6, `New overlap below quarantine threshold (${drift.newOverlap.toFixed(3)})`);

  const bot = registry.getBotStatus('bot-alpha');
  assert(bot?.status === 'quarantined', 'Bot auto-quarantined after drift');
  assert(bot?.quarantineReason?.includes('Drift detected'), 'Quarantine reason mentions drift');

  cleanupTest();
}
console.log();

// Test 13: Drift Detection - Unregistered Bot
console.log('Test 13: Drift Detection - Unregistered Bot');
{
  const registry = setupTest();

  const drift = registry.checkDrift('bot-nonexistent', SIMILAR_GEOMETRY);
  assert(drift.drifted === false, 'Unregistered bot returns no drift');
  assert(drift.reason === 'Bot not registered', 'Correct reason for unregistered bot');

  cleanupTest();
}
console.log();

// Test 14: Bot Removal
console.log('Test 14: Bot Removal');
{
  const registry = setupTest();
  registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);
  registry.registerBot('bot-beta', 'Beta Bot', DIVERGENT_GEOMETRY);

  const success = registry.removeBot('bot-alpha');
  assert(success === true, 'Remove operation successful');
  assert(registry.getBotStatus('bot-alpha') === null, 'Bot is removed from registry');
  assert(registry.listBots().length === 1, 'Bot count decremented');

  const failedRemove = registry.removeBot('bot-nonexistent');
  assert(failedRemove === false, 'Removing non-existent bot returns false');

  cleanupTest();
}
console.log();

// Test 15: Local Geometry Update
console.log('Test 15: Local Geometry Update');
{
  const registry = setupTest();

  const newGeometry: Partial<Record<TrustDebtCategory, number>> = {
    security: 0.95,
    reliability: 0.9,
    data_integrity: 0.85,
  };

  registry.setLocalGeometry(newGeometry);

  // Register a bot with the same geometry - should have ~100% overlap
  const bot = registry.registerBot('bot-test', 'Test Bot', newGeometry);
  assertApprox(bot.overlap, 1.0, 0.01, 'Bot with same geometry has ~100% overlap');

  cleanupTest();
}
console.log();

// Test 16: Registry Statistics
console.log('Test 16: Registry Statistics');
{
  const registry = setupTest();

  const emptyStats = registry.getStats();
  assert(emptyStats.total === 0, 'Empty registry has zero total');
  assert(emptyStats.trusted === 0, 'Empty registry has zero trusted');

  registry.registerBot('bot-trusted-1', 'Trusted 1', SIMILAR_GEOMETRY);
  registry.registerBot('bot-trusted-2', 'Trusted 2', SIMILAR_GEOMETRY);
  registry.registerBot('bot-quarantined-1', 'Quarantined 1', DIVERGENT_GEOMETRY);
  registry.registerBot('bot-unknown-1', 'Unknown 1', MEDIUM_GEOMETRY);

  const stats = registry.getStats();
  assert(stats.total === 4, 'Total bots count is correct');
  assert(stats.trusted === 2, 'Trusted bots count is correct');
  assert(stats.quarantined === 1, 'Quarantined bots count is correct');
  assert(stats.unknown === 1, 'Unknown bots count is correct');

  cleanupTest();
}
console.log();

// Test 17: Persistence - Save to Disk
console.log('Test 17: Persistence - Save to Disk');
{
  const registry = setupTest();
  registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);

  assert(existsSync(TEST_REGISTRY_PATH), 'Registry file created on disk');

  const raw = readFileSync(TEST_REGISTRY_PATH, 'utf-8');
  const data = JSON.parse(raw);
  assert(data.bots.length === 1, 'Registry file contains 1 bot');
  assert(data.version === '1.0.0', 'Registry version is correct');
  assert(data.lastUpdated !== undefined, 'Last updated timestamp exists');

  cleanupTest();
}
console.log();

// Test 18: Persistence - Load from Disk
console.log('Test 18: Persistence - Load from Disk');
{
  const registry1 = setupTest();
  registry1.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);
  registry1.registerBot('bot-beta', 'Beta Bot', DIVERGENT_GEOMETRY);

  // Create new registry instance with same data directory
  const registry2 = new FederationRegistry(TEST_DATA_DIR, LOCAL_GEOMETRY);

  assert(registry2.listBots().length === 2, 'Loaded registry has 2 bots');
  assert(registry2.getBotStatus('bot-alpha') !== null, 'Alpha bot loaded');
  assert(registry2.getBotStatus('bot-beta') !== null, 'Beta bot loaded');

  cleanupTest();
}
console.log();

// Test 19: Persistence - Corrupted File
console.log('Test 19: Persistence - Corrupted File Handling');
{
  if (!existsSync(TEST_DATA_DIR)) {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  writeFileSync(TEST_REGISTRY_PATH, 'INVALID JSON{{{', 'utf-8');

  // Should create empty registry instead of crashing
  const registry = new FederationRegistry(TEST_DATA_DIR, LOCAL_GEOMETRY);
  assert(registry.listBots().length === 0, 'Corrupted file results in empty registry');

  cleanupTest();
}
console.log();

// Test 20: Geometry Hash Consistency
console.log('Test 20: Geometry Hash - Consistency');
{
  const registry = setupTest();

  const bot1 = registry.registerBot('bot-1', 'Bot 1', SIMILAR_GEOMETRY);
  const bot2 = registry.registerBot('bot-2', 'Bot 2', SIMILAR_GEOMETRY);

  assert(bot1.geometryHash === bot2.geometryHash,
    'Same geometry produces same hash');

  const bot3 = registry.registerBot('bot-3', 'Bot 3', DIVERGENT_GEOMETRY);
  assert(bot1.geometryHash !== bot3.geometryHash,
    'Different geometries produce different hashes');

  cleanupTest();
}
console.log();

// Test 21: Geometry Hash - Change Detection
console.log('Test 21: Geometry Hash - Change Detection');
{
  const registry = setupTest();

  const bot1 = registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);
  const originalHash = bot1.geometryHash;

  // Re-register with different geometry
  const bot2 = registry.registerBot('bot-alpha', 'Alpha Bot', DIVERGENT_GEOMETRY);

  assert(bot2.geometryHash !== originalHash,
    'Hash changes when geometry changes');

  cleanupTest();
}
console.log();

// Test 22: Edge Case - Special Characters in ID
console.log('Test 22: Edge Case - Special Characters in Bot ID');
{
  const registry = setupTest();
  const bot = registry.registerBot('bot-special!@#$%^&*()', 'Special Bot', SIMILAR_GEOMETRY);

  assert(bot.id === 'bot-special!@#$%^&*()', 'Special characters preserved in ID');
  assert(registry.getBotStatus('bot-special!@#$%^&*()') !== null, 'Bot retrievable with special ID');

  cleanupTest();
}
console.log();

// Test 23: Edge Case - Very Long Name
console.log('Test 23: Edge Case - Very Long Bot Name');
{
  const registry = setupTest();
  const longName = 'A'.repeat(500);
  const bot = registry.registerBot('bot-long', longName, SIMILAR_GEOMETRY);

  assert(bot.name.length === 500, 'Long name preserved');
  assert(bot.name === longName, 'Long name matches input');

  cleanupTest();
}
console.log();

// Test 24: Edge Case - Zero Vector
console.log('Test 24: Edge Case - Zero Vector Geometry');
{
  const registry = setupTest();
  const zeroGeometry = new Array(20).fill(0);
  const bot = registry.registerBot('bot-zero', 'Zero Bot', zeroGeometry);

  assert(bot.overlap === 0 || bot.overlap <= 0.01,
    `Zero vector has zero overlap (${bot.overlap.toFixed(3)})`);
  assert(bot.status === 'quarantined', 'Zero vector bot is quarantined');

  cleanupTest();
}
console.log();

// Test 25: Edge Case - Maximum Vector
console.log('Test 25: Edge Case - Maximum Vector Geometry');
{
  const registry = setupTest();
  const maxGeometry = new Array(20).fill(1.0);
  const bot = registry.registerBot('bot-max', 'Max Bot', maxGeometry);

  assert(bot.overlap > 0, 'Maximum vector has non-zero overlap');
  assert(bot.geometryHash.length === 64, 'Maximum vector produces valid hash');

  cleanupTest();
}
console.log();

// ─── Test Summary ───────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════');
console.log(`\nTest Results:`);
console.log(`  ✓ Passed: ${testsPassed}`);
console.log(`  ✗ Failed: ${testsFailed}`);
console.log(`  Total:    ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log(`\n🎉 All tests passed!`);
  process.exit(0);
} else {
  console.error(`\n❌ ${testsFailed} test(s) failed`);
  process.exit(1);
}
