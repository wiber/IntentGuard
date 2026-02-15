/**
 * src/federation/registry.test.ts — Federation Registry Comprehensive Tests
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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FederationRegistry, BotEntry, BotStatus } from './registry';
import { TrustDebtCategory, TRUST_DEBT_CATEGORIES } from '../auth/geometric';
import { existsSync, unlinkSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

// ─── Test Fixtures ──────────────────────────────────────────────────

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

// ─── Test Setup & Cleanup ───────────────────────────────────────────

function setupTest(): FederationRegistry {
  if (!existsSync(TEST_DATA_DIR)) {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  if (existsSync(TEST_REGISTRY_PATH)) {
    unlinkSync(TEST_REGISTRY_PATH);
  }
  return new FederationRegistry(TEST_DATA_DIR, LOCAL_GEOMETRY);
}

function cleanupTest(): void {
  if (existsSync(TEST_REGISTRY_PATH)) {
    unlinkSync(TEST_REGISTRY_PATH);
  }
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe('Federation Registry', () => {
  afterEach(() => {
    cleanupTest();
  });

  it('Test 1: Bot Registration - High Overlap (Trusted Status)', () => {
    const registry = setupTest();
    const bot = registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);

    expect(bot.id).toBe('bot-alpha');
    expect(bot.name).toBe('Alpha Bot');
    expect(bot.status).toBe('trusted');
    expect(bot.overlap).toBeGreaterThanOrEqual(0.8);
    expect(bot.geometryHash).toHaveLength(64);
    expect(bot.lastSeen).toBeDefined();
    expect(bot.registeredAt).toBeDefined();
    expect(bot.quarantineReason).toBeUndefined();
  });

  it('Test 2: Bot Registration - Low Overlap (Quarantined Status)', () => {
    const registry = setupTest();
    const bot = registry.registerBot('bot-beta', 'Beta Bot', DIVERGENT_GEOMETRY);

    expect(bot.id).toBe('bot-beta');
    expect(bot.status).toBe('quarantined');
    expect(bot.overlap).toBeLessThan(0.6);
    expect(bot.quarantineReason).toBeDefined();
    expect(bot.quarantineReason).toContain('Low overlap');
  });

  it('Test 3: Bot Registration - Medium Overlap (Unknown Status)', () => {
    const registry = setupTest();
    const bot = registry.registerBot('bot-gamma', 'Gamma Bot', MEDIUM_GEOMETRY);

    expect(bot.status).toBe('unknown');
    expect(bot.overlap).toBeGreaterThanOrEqual(0.6);
    expect(bot.overlap).toBeLessThan(0.8);
  });

  it('Test 4: Bot Registration - Update Existing Bot', () => {
    const registry = setupTest();

    const bot1 = registry.registerBot('bot-delta', 'Delta Bot v1', SIMILAR_GEOMETRY);
    const originalRegisteredAt = bot1.registeredAt;

    const bot2 = registry.registerBot('bot-delta', 'Delta Bot v2', MEDIUM_GEOMETRY);

    expect(bot2.name).toBe('Delta Bot v2');
    expect(bot2.registeredAt).toBe(originalRegisteredAt);
    // lastSeen may or may not differ if both calls happen within the same ms
    expect(bot2.lastSeen).toBeDefined();
    expect(bot2.overlap).not.toBe(bot1.overlap);
  });

  it('Test 5: Empty Geometry Handling', () => {
    const registry = setupTest();
    const bot = registry.registerBot('bot-empty', 'Empty Bot', EMPTY_GEOMETRY);

    expect(bot.status).toBe('quarantined');
    expect(bot.overlap).toBeLessThanOrEqual(0.1);
  });

  it('Test 6: Array Geometry Format Support', () => {
    const registry = setupTest();
    const arrayGeometry = new Array(20).fill(0.7);
    const bot = registry.registerBot('bot-array', 'Array Bot', arrayGeometry);

    expect(bot.geometryHash).toHaveLength(64);
    expect(bot.overlap).toBeGreaterThan(0);
  });

  it('Test 7: Get Bot Status', () => {
    const registry = setupTest();
    registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);
    registry.registerBot('bot-beta', 'Beta Bot', DIVERGENT_GEOMETRY);

    const alphaStatus = registry.getBotStatus('bot-alpha');
    expect(alphaStatus).not.toBeNull();
    expect(alphaStatus?.name).toBe('Alpha Bot');

    const nonExistent = registry.getBotStatus('bot-nonexistent');
    expect(nonExistent).toBeNull();
  });

  it('Test 8: List All Bots', () => {
    const registry = setupTest();

    expect(registry.listBots()).toHaveLength(0);

    registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);
    registry.registerBot('bot-beta', 'Beta Bot', DIVERGENT_GEOMETRY);
    registry.registerBot('bot-gamma', 'Gamma Bot', MEDIUM_GEOMETRY);

    const bots = registry.listBots();
    expect(bots).toHaveLength(3);
    expect(bots.map(b => b.id)).toContain('bot-alpha');
    expect(bots.map(b => b.id)).toContain('bot-beta');
    expect(bots.map(b => b.id)).toContain('bot-gamma');
  });

  it('Test 9: Manual Quarantine', () => {
    const registry = setupTest();
    registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);

    const success = registry.quarantineBot('bot-alpha', 'Security audit failed');
    expect(success).toBe(true);

    const bot = registry.getBotStatus('bot-alpha');
    expect(bot?.status).toBe('quarantined');
    expect(bot?.quarantineReason).toBe('Security audit failed');

    const failedQuarantine = registry.quarantineBot('bot-nonexistent', 'Test');
    expect(failedQuarantine).toBe(false);
  });

  it('Test 10: Drift Detection - No Drift (Minor Changes)', () => {
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
    expect(drift.drifted).toBe(false);
    expect(drift.reason).toBeUndefined();
  });

  it('Test 11: Drift Detection - Significant Overlap Change', () => {
    const registry = setupTest();
    registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);

    const significantChange: Partial<Record<TrustDebtCategory, number>> = {
      security: 0.5,
      reliability: 0.45,
      data_integrity: 0.4,
    };

    const drift = registry.checkDrift('bot-alpha', significantChange);
    const deltaOverlap = Math.abs(drift.newOverlap - drift.oldOverlap);

    expect(deltaOverlap > 0.15 || drift.newOverlap < 0.6).toBe(true);
    expect(drift.drifted).toBe(true);
    expect(drift.reason).toBeDefined();
  });

  it('Test 12: Drift Detection - Auto-Quarantine on Low Overlap', () => {
    const registry = setupTest();
    registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);

    const drift = registry.checkDrift('bot-alpha', DIVERGENT_GEOMETRY);

    expect(drift.drifted).toBe(true);
    expect(drift.newOverlap).toBeLessThan(0.6);

    const bot = registry.getBotStatus('bot-alpha');
    expect(bot?.status).toBe('quarantined');
    expect(bot?.quarantineReason).toContain('Drift detected');
  });

  it('Test 13: Drift Detection - Unregistered Bot', () => {
    const registry = setupTest();

    const drift = registry.checkDrift('bot-nonexistent', SIMILAR_GEOMETRY);
    expect(drift.drifted).toBe(false);
    expect(drift.reason).toBe('Bot not registered');
  });

  it('Test 14: Bot Removal', () => {
    const registry = setupTest();
    registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);
    registry.registerBot('bot-beta', 'Beta Bot', DIVERGENT_GEOMETRY);

    const success = registry.removeBot('bot-alpha');
    expect(success).toBe(true);
    expect(registry.getBotStatus('bot-alpha')).toBeNull();
    expect(registry.listBots()).toHaveLength(1);

    const failedRemove = registry.removeBot('bot-nonexistent');
    expect(failedRemove).toBe(false);
  });

  it('Test 15: Local Geometry Update', () => {
    const registry = setupTest();

    const newGeometry: Partial<Record<TrustDebtCategory, number>> = {
      security: 0.95,
      reliability: 0.9,
      data_integrity: 0.85,
    };

    registry.setLocalGeometry(newGeometry);

    const bot = registry.registerBot('bot-test', 'Test Bot', newGeometry);
    expect(bot.overlap).toBeCloseTo(1.0, 1);
  });

  it('Test 16: Registry Statistics', () => {
    const registry = setupTest();

    const emptyStats = registry.getStats();
    expect(emptyStats.total).toBe(0);
    expect(emptyStats.trusted).toBe(0);

    registry.registerBot('bot-trusted-1', 'Trusted 1', SIMILAR_GEOMETRY);
    registry.registerBot('bot-trusted-2', 'Trusted 2', SIMILAR_GEOMETRY);
    registry.registerBot('bot-quarantined-1', 'Quarantined 1', DIVERGENT_GEOMETRY);
    registry.registerBot('bot-unknown-1', 'Unknown 1', MEDIUM_GEOMETRY);

    const stats = registry.getStats();
    expect(stats.total).toBe(4);
    expect(stats.trusted).toBe(2);
    expect(stats.quarantined).toBe(1);
    expect(stats.unknown).toBe(1);
  });

  it('Test 17: Persistence - Save to Disk', () => {
    const registry = setupTest();
    registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);

    expect(existsSync(TEST_REGISTRY_PATH)).toBe(true);

    const raw = readFileSync(TEST_REGISTRY_PATH, 'utf-8');
    const data = JSON.parse(raw);
    expect(data.bots).toHaveLength(1);
    expect(data.version).toBe('1.0.0');
    expect(data.lastUpdated).toBeDefined();
  });

  it('Test 18: Persistence - Load from Disk', () => {
    const registry1 = setupTest();
    registry1.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);
    registry1.registerBot('bot-beta', 'Beta Bot', DIVERGENT_GEOMETRY);

    const registry2 = new FederationRegistry(TEST_DATA_DIR, LOCAL_GEOMETRY);

    expect(registry2.listBots()).toHaveLength(2);
    expect(registry2.getBotStatus('bot-alpha')).not.toBeNull();
    expect(registry2.getBotStatus('bot-beta')).not.toBeNull();
  });

  it('Test 19: Persistence - Corrupted File Handling', () => {
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
    writeFileSync(TEST_REGISTRY_PATH, 'INVALID JSON{{{', 'utf-8');

    const registry = new FederationRegistry(TEST_DATA_DIR, LOCAL_GEOMETRY);
    expect(registry.listBots()).toHaveLength(0);
  });

  it('Test 20: Geometry Hash - Consistency', () => {
    const registry = setupTest();

    const bot1 = registry.registerBot('bot-1', 'Bot 1', SIMILAR_GEOMETRY);
    const bot2 = registry.registerBot('bot-2', 'Bot 2', SIMILAR_GEOMETRY);

    expect(bot1.geometryHash).toBe(bot2.geometryHash);

    const bot3 = registry.registerBot('bot-3', 'Bot 3', DIVERGENT_GEOMETRY);
    expect(bot1.geometryHash).not.toBe(bot3.geometryHash);
  });

  it('Test 21: Geometry Hash - Change Detection', () => {
    const registry = setupTest();

    const bot1 = registry.registerBot('bot-alpha', 'Alpha Bot', SIMILAR_GEOMETRY);
    const originalHash = bot1.geometryHash;

    const bot2 = registry.registerBot('bot-alpha', 'Alpha Bot', DIVERGENT_GEOMETRY);

    expect(bot2.geometryHash).not.toBe(originalHash);
  });

  it('Test 22: Edge Case - Special Characters in Bot ID', () => {
    const registry = setupTest();
    const bot = registry.registerBot('bot-special!@#$%^&*()', 'Special Bot', SIMILAR_GEOMETRY);

    expect(bot.id).toBe('bot-special!@#$%^&*()');
    expect(registry.getBotStatus('bot-special!@#$%^&*()')).not.toBeNull();
  });

  it('Test 23: Edge Case - Very Long Bot Name', () => {
    const registry = setupTest();
    const longName = 'A'.repeat(500);
    const bot = registry.registerBot('bot-long', longName, SIMILAR_GEOMETRY);

    expect(bot.name).toHaveLength(500);
    expect(bot.name).toBe(longName);
  });

  it('Test 24: Edge Case - Zero Vector Geometry', () => {
    const registry = setupTest();
    const zeroGeometry = new Array(20).fill(0);
    const bot = registry.registerBot('bot-zero', 'Zero Bot', zeroGeometry);

    expect(bot.overlap).toBeLessThanOrEqual(0.01);
    expect(bot.status).toBe('quarantined');
  });

  it('Test 25: Edge Case - Maximum Vector Geometry', () => {
    const registry = setupTest();
    const maxGeometry = new Array(20).fill(1.0);
    const bot = registry.registerBot('bot-max', 'Max Bot', maxGeometry);

    expect(bot.overlap).toBeGreaterThan(0);
    expect(bot.geometryHash).toHaveLength(64);
  });
});
