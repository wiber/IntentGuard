/**
 * Test script for registry.ts
 * Run with: npx tsx src/federation/test-registry.ts
 */

import { FederationRegistry } from './registry';
import { TRUST_DEBT_CATEGORIES } from '../auth/geometric';
import { existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';

console.log('=== Testing Federation Registry ===\n');

// Clean up any existing test registry
const testDataDir = './test-data';
const testRegistryPath = resolve(testDataDir, 'federation-registry.json');
if (existsSync(testRegistryPath)) {
  unlinkSync(testRegistryPath);
  console.log('Cleaned up existing test registry\n');
}

// Create local geometry
const localGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.8;
  return acc;
}, {} as any);

// Initialize registry
const registry = new FederationRegistry(testDataDir, localGeometry);
console.log('Test 1: Registry Initialization');
console.log(`  Registry path: ${testRegistryPath}`);
console.log(`  Initial bots: ${registry.listBots().length}\n`);

// Test 2: Register trusted bot (high overlap)
console.log('Test 2: Register Trusted Bot');
const trustedGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.82; // Very similar to local
  return acc;
}, {} as any);

const trustedBot = registry.registerBot('bot-alpha', 'Alpha Bot', trustedGeometry);
console.log(`  Bot ID: ${trustedBot.id}`);
console.log(`  Name: ${trustedBot.name}`);
console.log(`  Overlap: ${trustedBot.overlap.toFixed(3)}`);
console.log(`  Status: ${trustedBot.status} (expected: trusted)`);
console.log(`  Geometry Hash: ${trustedBot.geometryHash.substring(0, 16)}...\n`);

// Test 3: Register quarantined bot (low overlap)
console.log('Test 3: Register Quarantined Bot');
const quarantinedGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat, idx) => {
  acc[cat] = idx < 10 ? 1.0 : 0.0; // Very different from local
  return acc;
}, {} as any);

const quarantinedBot = registry.registerBot('bot-beta', 'Beta Bot', quarantinedGeometry);
console.log(`  Bot ID: ${quarantinedBot.id}`);
console.log(`  Name: ${quarantinedBot.name}`);
console.log(`  Overlap: ${quarantinedBot.overlap.toFixed(3)}`);
console.log(`  Status: ${quarantinedBot.status} (expected: quarantined)`);
console.log(`  Quarantine Reason: ${quarantinedBot.quarantineReason}\n`);

// Test 4: Register unknown bot (medium overlap)
console.log('Test 4: Register Unknown Bot');
const unknownGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.7; // Medium similarity
  return acc;
}, {} as any);

const unknownBot = registry.registerBot('bot-gamma', 'Gamma Bot', unknownGeometry);
console.log(`  Bot ID: ${unknownBot.id}`);
console.log(`  Name: ${unknownBot.name}`);
console.log(`  Overlap: ${unknownBot.overlap.toFixed(3)}`);
console.log(`  Status: ${unknownBot.status} (expected: unknown)\n`);

// Test 5: Get bot status
console.log('Test 5: Get Bot Status');
const alphaStatus = registry.getBotStatus('bot-alpha');
console.log(`  Alpha status: ${alphaStatus?.status}`);
console.log(`  Alpha overlap: ${alphaStatus?.overlap.toFixed(3)}`);

const nonExistent = registry.getBotStatus('bot-nonexistent');
console.log(`  Non-existent bot: ${nonExistent}\n`);

// Test 6: List all bots
console.log('Test 6: List All Bots');
const allBots = registry.listBots();
console.log(`  Total bots: ${allBots.length}`);
for (const bot of allBots) {
  console.log(`    - ${bot.id}: ${bot.name} (${bot.status}, overlap=${bot.overlap.toFixed(3)})`);
}
console.log();

// Test 7: Manual quarantine
console.log('Test 7: Manual Quarantine');
const quarantined = registry.quarantineBot('bot-gamma', 'Manual quarantine for testing');
console.log(`  Quarantine successful: ${quarantined}`);
const gammaStatus = registry.getBotStatus('bot-gamma');
console.log(`  Gamma status: ${gammaStatus?.status} (expected: quarantined)`);
console.log(`  Quarantine reason: ${gammaStatus?.quarantineReason}\n`);

// Test 8: Drift detection (no drift)
console.log('Test 8: Drift Detection - No Drift');
const noDrift = registry.checkDrift('bot-alpha', trustedGeometry);
console.log(`  Drifted: ${noDrift.drifted} (expected: false)`);
console.log(`  Old overlap: ${noDrift.oldOverlap.toFixed(3)}`);
console.log(`  New overlap: ${noDrift.newOverlap.toFixed(3)}\n`);

// Test 9: Drift detection (significant drift)
console.log('Test 9: Drift Detection - Significant Drift');
const driftedGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.5; // Much lower than before
  return acc;
}, {} as any);

const drifted = registry.checkDrift('bot-alpha', driftedGeometry);
console.log(`  Drifted: ${drifted.drifted} (expected: true)`);
console.log(`  Old overlap: ${drifted.oldOverlap.toFixed(3)}`);
console.log(`  New overlap: ${drifted.newOverlap.toFixed(3)}`);
console.log(`  Reason: ${drifted.reason}`);

const alphaAfterDrift = registry.getBotStatus('bot-alpha');
console.log(`  Alpha status after drift: ${alphaAfterDrift?.status} (expected: quarantined)\n`);

// Test 10: Registry statistics
console.log('Test 10: Registry Statistics');
const stats = registry.getStats();
console.log(`  Total bots: ${stats.total}`);
console.log(`  Trusted: ${stats.trusted}`);
console.log(`  Quarantined: ${stats.quarantined}`);
console.log(`  Unknown: ${stats.unknown}\n`);

// Test 11: Remove bot
console.log('Test 11: Remove Bot');
const removed = registry.removeBot('bot-beta');
console.log(`  Remove successful: ${removed}`);
const afterRemove = registry.listBots();
console.log(`  Bots after removal: ${afterRemove.length}\n`);

// Test 12: Persistence (registry should be saved to disk)
console.log('Test 12: Persistence');
console.log(`  Registry file exists: ${existsSync(testRegistryPath)}`);
if (existsSync(testRegistryPath)) {
  const { readFileSync } = require('fs');
  const raw = readFileSync(testRegistryPath, 'utf-8');
  const data = JSON.parse(raw);
  console.log(`  Saved bots: ${data.bots.length}`);
  console.log(`  Version: ${data.version}`);
  console.log(`  Last updated: ${data.lastUpdated}\n`);
}

console.log('=== All Registry Tests Complete ===');
console.log('\nClean up test data with:');
console.log(`  rm -rf ${testDataDir}`);
