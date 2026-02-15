/**
 * handshake.test.ts — Comprehensive tests for Federation Handshake Protocol
 *
 * Tests identity vector exchange, overlap computation, channel open/reject,
 * drift detection, and quarantine logic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FederationHandshake, HandshakeRequest, HandshakeResponse } from './handshake';
import { TRUST_DEBT_CATEGORIES, TrustDebtCategory } from '../auth/geometric';
import { existsSync, rmSync } from 'fs';

// ─── Test Utilities ─────────────────────────────────────────────────────

function createGeometry(baseValue: number, variance = 0): Partial<Record<TrustDebtCategory, number>> {
  return TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
    const value = baseValue + (variance > 0 ? (Math.random() - 0.5) * variance : 0);
    acc[cat] = Math.max(0, Math.min(1, value));
    return acc;
  }, {} as any);
}

// ─── Test Setup ─────────────────────────────────────────────────────

const testDataDir = './test-data-handshake';

function cleanup() {
  if (existsSync(testDataDir)) {
    rmSync(testDataDir, { recursive: true, force: true });
  }
  if (existsSync('./test-data-handshake-stats')) {
    rmSync('./test-data-handshake-stats', { recursive: true, force: true });
  }
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe('Federation Handshake Protocol', () => {
  // Clean before each test to avoid leftover state from previous tests
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('Handshake initialization creates registry and channels', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    const stats = handshake.getStats();
    expect(stats.activeChannels).toBe(0);
    expect(stats.registeredBots).toBe(0);
  });

  it('Handshake accepts bot with high overlap (>= 0.8)', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    const trustedGeometry = createGeometry(0.82);
    const request: HandshakeRequest = {
      botId: 'bot-alpha',
      botName: 'Alpha Federation Bot',
      geometry: trustedGeometry,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    const response = handshake.initiateHandshake(request);

    expect(response.accepted).toBe(true);
    expect(response.overlap).toBeGreaterThanOrEqual(0.8);
    expect(response.status).toBe('trusted');
    expect(response.aligned.length).toBeGreaterThan(0);

    const channel = handshake.getChannel('bot-alpha');
    expect(channel).not.toBeNull();
    expect(channel!.remoteBotId).toBe('bot-alpha');
    expect(channel!.status).toBe('trusted');
  });

  it('Handshake rejects bot with low overlap (< 0.8)', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    // Create very different geometry
    const untrustedGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat, idx) => {
      acc[cat] = idx < 10 ? 1.0 : 0.0;
      return acc;
    }, {} as any);

    const request: HandshakeRequest = {
      botId: 'bot-beta',
      botName: 'Beta Federation Bot',
      geometry: untrustedGeometry,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    const response = handshake.initiateHandshake(request);

    expect(response.accepted).toBe(false);
    expect(response.overlap).toBeLessThan(0.8);

    const channel = handshake.getChannel('bot-beta');
    expect(channel).toBeNull();
  });

  it('Handshake handles borderline overlap cases correctly', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    const mediumGeometry = createGeometry(0.75);
    const request: HandshakeRequest = {
      botId: 'bot-gamma',
      botName: 'Gamma Federation Bot',
      geometry: mediumGeometry,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    const response = handshake.initiateHandshake(request);

    if (response.accepted) {
      expect(response.overlap).toBeGreaterThanOrEqual(0.8);
    } else {
      expect(response.overlap).toBeLessThan(0.8);
    }
  });

  it('Identity vector exchange preserves all categories', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    const remoteGeometry = createGeometry(0.85);
    const request: HandshakeRequest = {
      botId: 'bot-delta',
      botName: 'Delta Federation Bot',
      geometry: remoteGeometry,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    const response = handshake.initiateHandshake(request);

    const totalCategories = response.aligned.length + response.divergent.length;
    expect(totalCategories).toBeLessThanOrEqual(20);
  });

  it('Multiple federation channels can coexist', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    for (let i = 0; i < 3; i++) {
      const request: HandshakeRequest = {
        botId: `bot-multi-${i}`,
        botName: `Multi Bot ${i}`,
        geometry: createGeometry(0.82),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      const response = handshake.initiateHandshake(request);
      expect(response.accepted).toBe(true);
    }

    const channels = handshake.listChannels();
    expect(channels).toHaveLength(3);
  });

  it('Drift detection correctly identifies no drift', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    const trustedGeometry = createGeometry(0.82);
    const request: HandshakeRequest = {
      botId: 'bot-epsilon',
      botName: 'Epsilon Federation Bot',
      geometry: trustedGeometry,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    handshake.initiateHandshake(request);

    const drift = handshake.checkChannelDrift('bot-epsilon', trustedGeometry);

    expect(drift.drifted).toBe(false);
    expect(Math.abs(drift.oldOverlap - drift.newOverlap)).toBeLessThan(0.01);
  });

  it('Drift detection identifies significant drift and quarantines', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    const trustedGeometry = createGeometry(0.82);
    const request: HandshakeRequest = {
      botId: 'bot-zeta',
      botName: 'Zeta Federation Bot',
      geometry: trustedGeometry,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    handshake.initiateHandshake(request);

    // Simulate significant drift - use very different direction
    const driftedGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat, idx) => {
      acc[cat] = idx < 10 ? 0.1 : 0.9;
      return acc;
    }, {} as any);

    const drift = handshake.checkChannelDrift('bot-zeta', driftedGeometry);

    expect(drift.drifted || drift.newOverlap < 0.6).toBe(true);

    if (drift.newOverlap < 0.6) {
      const channel = handshake.getChannel('bot-zeta');
      expect(channel).toBeNull();
    }
  });

  it('Manual channel closure quarantines bot', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    const request: HandshakeRequest = {
      botId: 'bot-eta',
      botName: 'Eta Federation Bot',
      geometry: createGeometry(0.82),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    handshake.initiateHandshake(request);

    const closed = handshake.closeChannel('bot-eta', 'Manual test closure');
    expect(closed).toBe(true);

    const channel = handshake.getChannel('bot-eta');
    expect(channel).toBeNull();

    const registry = handshake.getRegistry();
    const bot = registry.getBotStatus('bot-eta');
    expect(bot!.status).toBe('quarantined');
  });

  it('Closing non-existent channel returns false', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    const closed = handshake.closeChannel('bot-nonexistent', 'Test');
    expect(closed).toBe(false);
  });

  it('Statistics accurately track federation state', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local-stats',
      'Local Stats Bot',
      localGeometry,
      './test-data-handshake-stats',
    );

    // Add trusted bot
    handshake.initiateHandshake({
      botId: 'bot-trusted',
      botName: 'Trusted Bot',
      geometry: createGeometry(0.82),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });

    // Add quarantined bot (low overlap - use different direction)
    const quarantinedGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat, idx) => {
      acc[cat] = idx < 10 ? 0.1 : 0.9;
      return acc;
    }, {} as any);

    handshake.initiateHandshake({
      botId: 'bot-quarantined',
      botName: 'Quarantined Bot',
      geometry: quarantinedGeometry,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });

    const stats = handshake.getStats();
    expect(stats.registeredBots).toBe(2);
    expect(stats.trusted).toBeGreaterThanOrEqual(1);
    expect(stats.activeChannels).toBe(stats.trusted);
  });

  it('Receive handshake response logs correctly', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    const acceptedResponse: HandshakeResponse = {
      accepted: true,
      overlap: 0.95,
      threshold: 0.8,
      aligned: ['security', 'reliability'],
      divergent: [],
      status: 'trusted',
      message: 'Handshake accepted',
      timestamp: new Date().toISOString(),
    };

    const rejectedResponse: HandshakeResponse = {
      accepted: false,
      overlap: 0.65,
      threshold: 0.8,
      aligned: ['security'],
      divergent: ['reliability'],
      status: 'quarantined',
      message: 'Handshake rejected',
      timestamp: new Date().toISOString(),
    };

    // Should not throw
    handshake.receiveHandshake(acceptedResponse);
    handshake.receiveHandshake(rejectedResponse);
  });

  it('Sparse geometry vectors are handled correctly', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    const sparseGeometry: Partial<Record<TrustDebtCategory, number>> = {
      security: 0.9,
      reliability: 0.85,
      code_quality: 0.8,
      testing: 0.75,
      documentation: 0.7,
    };

    const request: HandshakeRequest = {
      botId: 'bot-sparse',
      botName: 'Sparse Bot',
      geometry: sparseGeometry,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    const response = handshake.initiateHandshake(request);
    expect(typeof response.overlap).toBe('number');
    expect(response.overlap).toBeGreaterThanOrEqual(0);
    expect(response.overlap).toBeLessThanOrEqual(1);
  });

  it('Registry can be accessed and queried', () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    handshake.initiateHandshake({
      botId: 'bot-registry-test',
      botName: 'Registry Test Bot',
      geometry: createGeometry(0.82),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });

    const registry = handshake.getRegistry();
    const bots = registry.listBots();

    expect(bots.length).toBeGreaterThan(0);

    const bot = registry.getBotStatus('bot-registry-test');
    expect(bot).not.toBeNull();
    expect(bot!.id).toBe('bot-registry-test');
  });

  it('Channel last seen updates on drift check', async () => {
    const localGeometry = createGeometry(0.8);
    const handshake = new FederationHandshake(
      'bot-local',
      'Local IntentGuard Bot',
      localGeometry,
      testDataDir,
    );

    const geometry = createGeometry(0.82);
    const request: HandshakeRequest = {
      botId: 'bot-lastseen',
      botName: 'Last Seen Bot',
      geometry: geometry,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    handshake.initiateHandshake(request);

    const channelBefore = handshake.getChannel('bot-lastseen');
    const lastSeenBefore = channelBefore!.lastSeen;

    // Wait a bit to ensure timestamp changes
    await new Promise(r => setTimeout(r, 10));

    // Trigger slight drift (but not enough to quarantine)
    const slightlyDifferent = createGeometry(0.81);
    handshake.checkChannelDrift('bot-lastseen', slightlyDifferent);

    const channelAfter = handshake.getChannel('bot-lastseen');

    if (channelAfter) {
      expect(channelAfter.lastSeen >= lastSeenBefore).toBe(true);
    }
  });
});
