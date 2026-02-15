/**
 * Test script for handshake.ts
 * Run with: npx tsx src/federation/test-handshake.ts
 */

import { FederationHandshake, HandshakeRequest } from './handshake';
import { TRUST_DEBT_CATEGORIES } from '../auth/geometric';
import { existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';

console.log('=== Testing Federation Handshake Protocol ===\n');

// Clean up any existing test registry
const testDataDir = './test-data-handshake';
const testRegistryPath = resolve(testDataDir, 'federation-registry.json');
if (existsSync(testRegistryPath)) {
  unlinkSync(testRegistryPath);
  console.log('Cleaned up existing test registry\n');
}

// Create local bot geometry
const localGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.8;
  return acc;
}, {} as any);

// Initialize handshake protocol
const handshake = new FederationHandshake(
  'bot-local',
  'Local IntentGuard Bot',
  localGeometry,
  testDataDir,
);

console.log('Test 1: Handshake Initialization');
console.log(`  Local Bot ID: bot-local`);
console.log(`  Local Bot Name: Local IntentGuard Bot`);
console.log(`  Data Directory: ${testDataDir}`);
const initialStats = handshake.getStats();
console.log(`  Active Channels: ${initialStats.activeChannels}`);
console.log(`  Registered Bots: ${initialStats.registeredBots}\n`);

// Test 2: Successful handshake (high overlap)
console.log('Test 2: Successful Handshake (High Overlap)');
const trustedGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.82; // Very similar to local
  return acc;
}, {} as any);

const trustedRequest: HandshakeRequest = {
  botId: 'bot-alpha',
  botName: 'Alpha Federation Bot',
  geometry: trustedGeometry,
  timestamp: new Date().toISOString(),
  version: '1.0.0',
};

const trustedResponse = handshake.initiateHandshake(trustedRequest);
console.log(`  Accepted: ${trustedResponse.accepted} (expected: true)`);
console.log(`  Overlap: ${trustedResponse.overlap.toFixed(3)}`);
console.log(`  Threshold: ${trustedResponse.threshold}`);
console.log(`  Status: ${trustedResponse.status}`);
console.log(`  Aligned Categories: ${trustedResponse.aligned.length}`);
console.log(`  Divergent Categories: ${trustedResponse.divergent.length}`);
console.log(`  Message: ${trustedResponse.message}\n`);

// Test 3: Rejected handshake (low overlap)
console.log('Test 3: Rejected Handshake (Low Overlap)');
const untrustedGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat, idx) => {
  acc[cat] = idx < 10 ? 1.0 : 0.0; // Very different from local
  return acc;
}, {} as any);

const untrustedRequest: HandshakeRequest = {
  botId: 'bot-beta',
  botName: 'Beta Federation Bot',
  geometry: untrustedGeometry,
  timestamp: new Date().toISOString(),
  version: '1.0.0',
};

const untrustedResponse = handshake.initiateHandshake(untrustedRequest);
console.log(`  Accepted: ${untrustedResponse.accepted} (expected: false)`);
console.log(`  Overlap: ${untrustedResponse.overlap.toFixed(3)}`);
console.log(`  Threshold: ${untrustedResponse.threshold}`);
console.log(`  Status: ${untrustedResponse.status}`);
console.log(`  Message: ${untrustedResponse.message}\n`);

// Test 4: Borderline handshake (medium overlap)
console.log('Test 4: Borderline Handshake (Medium Overlap)');
const mediumGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.75; // Slightly different
  return acc;
}, {} as any);

const mediumRequest: HandshakeRequest = {
  botId: 'bot-gamma',
  botName: 'Gamma Federation Bot',
  geometry: mediumGeometry,
  timestamp: new Date().toISOString(),
  version: '1.0.0',
};

const mediumResponse = handshake.initiateHandshake(mediumRequest);
console.log(`  Accepted: ${mediumResponse.accepted}`);
console.log(`  Overlap: ${mediumResponse.overlap.toFixed(3)}`);
console.log(`  Message: ${mediumResponse.message}\n`);

// Test 5: Get channel
console.log('Test 5: Get Channel');
const alphaChannel = handshake.getChannel('bot-alpha');
if (alphaChannel) {
  console.log(`  Local Bot: ${alphaChannel.localBotId}`);
  console.log(`  Remote Bot: ${alphaChannel.remoteBotId}`);
  console.log(`  Remote Name: ${alphaChannel.remoteBotName}`);
  console.log(`  Overlap: ${alphaChannel.overlap.toFixed(3)}`);
  console.log(`  Status: ${alphaChannel.status}`);
  console.log(`  Opened At: ${alphaChannel.openedAt}`);
} else {
  console.log(`  Channel not found (unexpected)`);
}
console.log();

// Test 6: List all channels
console.log('Test 6: List All Channels');
const channels = handshake.listChannels();
console.log(`  Active Channels: ${channels.length}`);
for (const channel of channels) {
  console.log(`    - ${channel.remoteBotId}: ${channel.remoteBotName} (overlap=${channel.overlap.toFixed(3)})`);
}
console.log();

// Test 7: Check drift (no drift)
console.log('Test 7: Check Drift - No Drift');
const noDrift = handshake.checkChannelDrift('bot-alpha', trustedGeometry);
console.log(`  Drifted: ${noDrift.drifted} (expected: false)`);
console.log(`  Old Overlap: ${noDrift.oldOverlap.toFixed(3)}`);
console.log(`  New Overlap: ${noDrift.newOverlap.toFixed(3)}\n`);

// Test 8: Check drift (significant drift)
console.log('Test 8: Check Drift - Significant Drift');
const driftedGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.5; // Much lower
  return acc;
}, {} as any);

const drifted = handshake.checkChannelDrift('bot-alpha', driftedGeometry);
console.log(`  Drifted: ${drifted.drifted} (expected: true)`);
console.log(`  Old Overlap: ${drifted.oldOverlap.toFixed(3)}`);
console.log(`  New Overlap: ${drifted.newOverlap.toFixed(3)}`);
console.log(`  Reason: ${drifted.reason}`);

// Check if channel was closed
const alphaAfterDrift = handshake.getChannel('bot-alpha');
console.log(`  Channel still open: ${alphaAfterDrift !== null} (expected: false)\n`);

// Test 9: Close channel
console.log('Test 9: Close Channel');
const gammaChannel = handshake.getChannel('bot-gamma');
if (gammaChannel) {
  const closed = handshake.closeChannel('bot-gamma', 'Manual closure for testing');
  console.log(`  Close successful: ${closed}`);
  const gammaAfterClose = handshake.getChannel('bot-gamma');
  console.log(`  Channel still open: ${gammaAfterClose !== null} (expected: false)`);
} else {
  console.log(`  Gamma channel not open (overlap was below threshold)`);
}
console.log();

// Test 10: Get statistics
console.log('Test 10: Get Statistics');
const stats = handshake.getStats();
console.log(`  Active Channels: ${stats.activeChannels}`);
console.log(`  Registered Bots: ${stats.registeredBots}`);
console.log(`  Trusted: ${stats.trusted}`);
console.log(`  Quarantined: ${stats.quarantined}`);
console.log(`  Unknown: ${stats.unknown}\n`);

// Test 11: Access registry
console.log('Test 11: Access Registry');
const registry = handshake.getRegistry();
const allBots = registry.listBots();
console.log(`  Total bots in registry: ${allBots.length}`);
for (const bot of allBots) {
  console.log(`    - ${bot.id}: ${bot.name} (${bot.status}, overlap=${bot.overlap.toFixed(3)})`);
}
console.log();

// Test 12: Receive handshake response (logging test)
console.log('Test 12: Receive Handshake Response');
console.log('  Simulating accepted response:');
handshake.receiveHandshake(trustedResponse);
console.log('\n  Simulating rejected response:');
handshake.receiveHandshake(untrustedResponse);
console.log();

console.log('=== All Handshake Tests Complete ===');
console.log('\nClean up test data with:');
console.log(`  rm -rf ${testDataDir}`);
