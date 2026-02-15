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
 * Run: npx vitest run src/federation/integration.test.ts
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

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

describe('Federation Integration', () => {
  beforeEach(() => {
    // Setup: Clean test directory
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
    mkdirSync(TEST_DATA_DIR, { recursive: true });
  });

  afterAll(() => {
    // Cleanup
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  it('should export all federation modules', () => {
    expect(typeof FederationHandshake).toBe('function');
    expect(typeof FederationRegistry).toBe('function');
    expect(typeof computeTensorOverlap).toBe('function');
    expect(typeof isCompatible).toBe('function');
    expect(typeof geometryHash).toBe('function');
    expect(typeof TRUST_THRESHOLD).toBe('number');
    expect(typeof QUARANTINE_THRESHOLD).toBe('number');
  });

  it('should compute tensor overlap correctly', () => {
    const overlapAB = computeTensorOverlap(BOT_A_GEOMETRY, BOT_B_GEOMETRY);
    expect(overlapAB.overlap).toBeGreaterThanOrEqual(0);
    expect(overlapAB.overlap).toBeLessThanOrEqual(1);
    expect(overlapAB.overlap).toBeGreaterThanOrEqual(TRUST_THRESHOLD);
    expect(Array.isArray(overlapAB.aligned)).toBe(true);
    expect(Array.isArray(overlapAB.divergent)).toBe(true);

    const overlapAC = computeTensorOverlap(BOT_A_GEOMETRY, BOT_C_GEOMETRY);
    expect(overlapAC.overlap).toBeLessThan(TRUST_THRESHOLD);
    expect(overlapAC.divergent.length).toBeGreaterThan(0);
  });

  it('should determine compatibility correctly', () => {
    expect(isCompatible(BOT_A_GEOMETRY, BOT_B_GEOMETRY)).toBe(true);
    expect(isCompatible(BOT_A_GEOMETRY, BOT_C_GEOMETRY)).toBe(false);
  });

  it('should produce consistent geometry hashes', () => {
    const hashA1 = geometryHash(BOT_A_GEOMETRY);
    const hashA2 = geometryHash(BOT_A_GEOMETRY);
    const hashB = geometryHash(BOT_B_GEOMETRY);

    expect(hashA1).toBe(hashA2);
    expect(hashA1).not.toBe(hashB);
    expect(hashA1.length).toBe(64);
  });

  it('should manage federation registry correctly', () => {
    const registry = new FederationRegistry(TEST_DATA_DIR, BOT_A_GEOMETRY);

    // Register Bot B (should be trusted)
    const entryB = registry.registerBot('bot-b-001', 'Bot B', BOT_B_GEOMETRY);
    expect(entryB.status).toBe('trusted');
    expect(entryB.overlap).toBeGreaterThanOrEqual(TRUST_THRESHOLD);

    // Register Bot C (should be quarantined)
    const entryC = registry.registerBot('bot-c-001', 'Bot C', BOT_C_GEOMETRY);
    expect(entryC.status).toBe('quarantined');
    expect(entryC.overlap).toBeLessThan(QUARANTINE_THRESHOLD);

    // Get stats
    const stats = registry.getStats();
    expect(stats.total).toBe(2);
    expect(stats.trusted).toBe(1);
    expect(stats.quarantined).toBe(1);

    // Test persistence
    const registryPath = join(TEST_DATA_DIR, 'federation-registry.json');
    expect(existsSync(registryPath)).toBe(true);
  });

  it('should handle handshake protocol correctly', () => {
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
    expect(responseB.accepted).toBe(true);
    expect(responseB.status).toBe('trusted');

    // Handshake with Bot C (should fail)
    const requestC: HandshakeRequest = {
      botId: 'bot-c-001',
      botName: 'Bot C',
      geometry: BOT_C_GEOMETRY,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    const responseC = handshake.initiateHandshake(requestC);
    expect(responseC.accepted).toBe(false);
    expect(responseC.status).toBe('quarantined');

    // Check active channels
    const channels = handshake.listChannels();
    expect(channels.length).toBe(1);
    expect(channels[0].remoteBotId).toBe('bot-b-001');
  });

  it('should detect drift correctly', () => {
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

    expect(drift.drifted).toBe(true);
    expect(drift.newOverlap).toBeLessThan(drift.oldOverlap);
    expect(drift.reason).toBeDefined();

    // Check if channel was closed (should be quarantined)
    const channel = handshake.getChannel('bot-b-drift-test');
    expect(channel).toBeNull();
  });

  it('should support Discord command integration', () => {
    const handshake = new FederationHandshake(
      'intentguard-bot-001',
      'IntentGuard Production Bot',
      BOT_A_GEOMETRY,
      TEST_DATA_DIR,
    );

    // Simulate !federation status
    const stats = handshake.getStats();
    expect(typeof stats.activeChannels).toBe('number');
    expect(typeof stats.registeredBots).toBe('number');
    expect(typeof stats.trusted).toBe('number');
    expect(typeof stats.quarantined).toBe('number');
    expect(typeof stats.unknown).toBe('number');

    // Simulate !federation list
    const registry = handshake.getRegistry();
    const bots = registry.listBots();
    expect(Array.isArray(bots)).toBe(true);

    // Simulate !federation channels
    const channels = handshake.listChannels();
    expect(Array.isArray(channels)).toBe(true);
  });
});
