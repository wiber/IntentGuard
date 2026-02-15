/**
 * Example usage of the IntentGuard Federation System
 *
 * This demonstrates how two IntentGuard bot instances can federate
 * based on their geometric identity tensors.
 */

import {
  FederationHandshake,
  HandshakeRequest,
  computeTensorOverlap,
  isCompatible,
} from './index';
import { TRUST_DEBT_CATEGORIES } from '../auth/geometric';

// ═══════════════════════════════════════════════════════════════════════
// SCENARIO: Two IntentGuard bots want to federate
// ═══════════════════════════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         IntentGuard Federation Example                       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// ─── Bot A: Local Development Bot ──────────────────────────────────────

console.log('📍 Bot A: Local Development Bot');
console.log('   Purpose: Development & testing');
console.log('   Trust Profile: High security, moderate testing\n');

const botA_geometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  // High security, moderate elsewhere
  if (cat === 'security') acc[cat] = 0.9;
  else if (cat === 'testing') acc[cat] = 0.7;
  else if (cat === 'code_quality') acc[cat] = 0.8;
  else acc[cat] = 0.75;
  return acc;
}, {} as any);

// ─── Bot B: Production Deployment Bot ──────────────────────────────────

console.log('📍 Bot B: Production Deployment Bot');
console.log('   Purpose: Manage production deployments');
console.log('   Trust Profile: Very high security, high reliability\n');

const botB_geometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  // Very high security, high reliability, high code quality
  if (cat === 'security') acc[cat] = 0.95;
  else if (cat === 'reliability') acc[cat] = 0.9;
  else if (cat === 'code_quality') acc[cat] = 0.85;
  else if (cat === 'testing') acc[cat] = 0.85;
  else acc[cat] = 0.8;
  return acc;
}, {} as any);

// ─── Bot C: Malicious Bot ───────────────────────────────────────────────

console.log('📍 Bot C: Malicious Bot (Adversarial)');
console.log('   Purpose: Attempt to infiltrate federation');
console.log('   Trust Profile: Low security, low reliability\n');

const botC_geometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  // Low trust across the board
  if (cat === 'security') acc[cat] = 0.2;
  else if (cat === 'reliability') acc[cat] = 0.3;
  else if (cat === 'data_integrity') acc[cat] = 0.1;
  else acc[cat] = 0.4;
  return acc;
}, {} as any);

console.log('═══════════════════════════════════════════════════════════════\n');

// ─── Initialize Bot A's Federation Handshake ────────────────────────────

const botA_handshake = new FederationHandshake(
  'bot-dev-001',
  'Local Development Bot',
  botA_geometry,
  './data-example',
);

console.log('✓ Bot A initialized federation protocol\n');

// ═══════════════════════════════════════════════════════════════════════
// HANDSHAKE 1: Bot A ↔ Bot B (Should succeed)
// ═══════════════════════════════════════════════════════════════════════

console.log('─────────────────────────────────────────────────────────────────');
console.log('🤝 HANDSHAKE 1: Bot A ↔ Bot B');
console.log('─────────────────────────────────────────────────────────────────\n');

// First, check compatibility directly
console.log('Step 1: Check tensor overlap...');
const overlapAB = computeTensorOverlap(botA_geometry, botB_geometry);
console.log(`   Overlap: ${overlapAB.overlap.toFixed(3)}`);
console.log(`   Aligned categories: ${overlapAB.aligned.length}`);
console.log(`   Divergent categories: ${overlapAB.divergent.length}`);
console.log(`   Compatible: ${isCompatible(botA_geometry, botB_geometry) ? '✓' : '✗'}\n`);

// Bot B sends handshake request to Bot A
const botB_request: HandshakeRequest = {
  botId: 'bot-prod-001',
  botName: 'Production Deployment Bot',
  geometry: botB_geometry,
  timestamp: new Date().toISOString(),
  version: '1.0.0',
};

console.log('Step 2: Bot B initiates handshake...');
const responseAB = botA_handshake.initiateHandshake(botB_request);

console.log(`   Accepted: ${responseAB.accepted ? '✓ YES' : '✗ NO'}`);
console.log(`   Overlap: ${responseAB.overlap.toFixed(3)}`);
console.log(`   Threshold: ${responseAB.threshold}`);
console.log(`   Status: ${responseAB.status}`);
console.log(`   Message: ${responseAB.message}`);

if (responseAB.accepted) {
  console.log('\n✓ Federation channel opened!');
  console.log(`   Aligned on: ${responseAB.aligned.slice(0, 5).join(', ')}...`);
  if (responseAB.divergent.length > 0) {
    console.log(`   Divergent on: ${responseAB.divergent.join(', ')}`);
  }
}

console.log('\n');

// ═══════════════════════════════════════════════════════════════════════
// HANDSHAKE 2: Bot A ↔ Bot C (Should fail)
// ═══════════════════════════════════════════════════════════════════════

console.log('─────────────────────────────────────────────────────────────────');
console.log('🤝 HANDSHAKE 2: Bot A ↔ Bot C (Malicious)');
console.log('─────────────────────────────────────────────────────────────────\n');

// Check compatibility directly
console.log('Step 1: Check tensor overlap...');
const overlapAC = computeTensorOverlap(botA_geometry, botC_geometry);
console.log(`   Overlap: ${overlapAC.overlap.toFixed(3)}`);
console.log(`   Aligned categories: ${overlapAC.aligned.length}`);
console.log(`   Divergent categories: ${overlapAC.divergent.length}`);
console.log(`   Compatible: ${isCompatible(botA_geometry, botC_geometry) ? '✓' : '✗'}\n`);

// Bot C sends handshake request to Bot A
const botC_request: HandshakeRequest = {
  botId: 'bot-malicious-001',
  botName: 'Malicious Bot',
  geometry: botC_geometry,
  timestamp: new Date().toISOString(),
  version: '1.0.0',
};

console.log('Step 2: Bot C attempts handshake...');
const responseAC = botA_handshake.initiateHandshake(botC_request);

console.log(`   Accepted: ${responseAC.accepted ? '✓ YES' : '✗ NO'}`);
console.log(`   Overlap: ${responseAC.overlap.toFixed(3)}`);
console.log(`   Threshold: ${responseAC.threshold}`);
console.log(`   Status: ${responseAC.status}`);
console.log(`   Message: ${responseAC.message}`);

if (!responseAC.accepted) {
  console.log('\n✗ Federation rejected! (Security threshold not met)');
  console.log(`   Divergent on: ${responseAC.divergent.slice(0, 5).join(', ')}...`);
}

console.log('\n');

// ═══════════════════════════════════════════════════════════════════════
// FEDERATION STATUS
// ═══════════════════════════════════════════════════════════════════════

console.log('─────────────────────────────────────────────────────────────────');
console.log('📊 Federation Status');
console.log('─────────────────────────────────────────────────────────────────\n');

const stats = botA_handshake.getStats();
console.log(`Active Channels: ${stats.activeChannels}`);
console.log(`Registered Bots: ${stats.registeredBots}`);
console.log(`   Trusted: ${stats.trusted}`);
console.log(`   Quarantined: ${stats.quarantined}`);
console.log(`   Unknown: ${stats.unknown}\n`);

// List all channels
const channels = botA_handshake.listChannels();
console.log('Active Channels:');
for (const channel of channels) {
  console.log(`   ✓ ${channel.remoteBotName} (overlap=${channel.overlap.toFixed(3)})`);
}

// List all registered bots
console.log('\nRegistered Bots:');
const registry = botA_handshake.getRegistry();
const allBots = registry.listBots();
for (const bot of allBots) {
  const statusIcon = bot.status === 'trusted' ? '✓' : bot.status === 'quarantined' ? '✗' : '?';
  console.log(`   ${statusIcon} ${bot.name} (${bot.status}, overlap=${bot.overlap.toFixed(3)})`);
}

console.log('\n═══════════════════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════════════════
// DRIFT DETECTION
// ═══════════════════════════════════════════════════════════════════════

console.log('─────────────────────────────────────────────────────────────────');
console.log('🔍 Drift Detection');
console.log('─────────────────────────────────────────────────────────────────\n');

// Simulate Bot B's geometry drifting (security drops)
console.log('Scenario: Bot B\'s security score drops from 0.95 to 0.5\n');

const botB_drifted = { ...botB_geometry, security: 0.5 };

const drift = botA_handshake.checkChannelDrift('bot-prod-001', botB_drifted);

console.log(`Drifted: ${drift.drifted ? '✓ YES' : '✗ NO'}`);
console.log(`Old Overlap: ${drift.oldOverlap.toFixed(3)}`);
console.log(`New Overlap: ${drift.newOverlap.toFixed(3)}`);
if (drift.reason) {
  console.log(`Reason: ${drift.reason}`);
}

// Check if channel was closed
const botB_channel = botA_handshake.getChannel('bot-prod-001');
if (!botB_channel) {
  console.log('\n✗ Channel automatically closed due to drift\n');
} else {
  console.log(`\n✓ Channel still open (status: ${botB_channel.status})\n`);
}

console.log('═══════════════════════════════════════════════════════════════\n');

console.log('✓ Example complete!\n');
console.log('Clean up test data with: rm -rf ./data-example\n');
