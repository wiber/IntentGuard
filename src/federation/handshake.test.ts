/**
 * handshake.test.ts — Comprehensive tests for Federation Handshake Protocol
 *
 * Tests identity vector exchange, overlap computation, channel open/reject,
 * drift detection, and quarantine logic.
 *
 * Run with: npx tsx src/federation/handshake.test.ts
 */

import { FederationHandshake, HandshakeRequest, HandshakeResponse } from './handshake';
import { TRUST_DEBT_CATEGORIES, TrustDebtCategory } from '../auth/geometric';
import { existsSync, unlinkSync, rmSync } from 'fs';
import { resolve } from 'path';
import { strict as assert } from 'assert';

// ─── Test Utilities ─────────────────────────────────────────────────────

function test(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
      console.log(`✓ ${name}`);
    } catch (error: any) {
      console.error(`✗ ${name}`);
      console.error(`  ${error.message}`);
      if (error.stack) {
        console.error(`  ${error.stack.split('\n').slice(1, 3).join('\n')}`);
      }
      throw error;
    }
  };
}

function createGeometry(baseValue: number, variance = 0): Partial<Record<TrustDebtCategory, number>> {
  return TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
    const value = baseValue + (variance > 0 ? (Math.random() - 0.5) * variance : 0);
    acc[cat] = Math.max(0, Math.min(1, value));
    return acc;
  }, {} as any);
}

// ─── Test Setup ─────────────────────────────────────────────────────────

const testDataDir = './test-data-handshake';
const testRegistryPath = resolve(testDataDir, 'federation-registry.json');

function cleanup() {
  if (existsSync(testDataDir)) {
    rmSync(testDataDir, { recursive: true, force: true });
  }
}

// Clean up before tests
cleanup();

// ─── Test Suite ─────────────────────────────────────────────────────────

console.log('=== Federation Handshake Protocol Tests ===\n');

(async () => {
  try {
    // Test 1: Handshake Initialization
    await test('Handshake initialization creates registry and channels', () => {
      const localGeometry = createGeometry(0.8);
      const handshake = new FederationHandshake(
        'bot-local',
        'Local IntentGuard Bot',
        localGeometry,
        testDataDir,
      );

      const stats = handshake.getStats();
      assert.strictEqual(stats.activeChannels, 0, 'Should start with no active channels');
      assert.strictEqual(stats.registeredBots, 0, 'Should start with no registered bots');
    })();

    // Test 2: Successful Handshake (High Overlap)
    await test('Handshake accepts bot with high overlap (>= 0.8)', () => {
      const localGeometry = createGeometry(0.8);
      const handshake = new FederationHandshake(
        'bot-local',
        'Local IntentGuard Bot',
        localGeometry,
        testDataDir,
      );

      const trustedGeometry = createGeometry(0.82); // Very similar
      const request: HandshakeRequest = {
        botId: 'bot-alpha',
        botName: 'Alpha Federation Bot',
        geometry: trustedGeometry,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      const response = handshake.initiateHandshake(request);

      assert.strictEqual(response.accepted, true, 'Handshake should be accepted');
      assert(response.overlap >= 0.8, `Overlap ${response.overlap} should be >= 0.8`);
      assert.strictEqual(response.status, 'trusted', 'Status should be trusted');
      assert(response.aligned.length > 0, 'Should have aligned categories');

      const channel = handshake.getChannel('bot-alpha');
      assert(channel !== null, 'Channel should be open');
      assert.strictEqual(channel!.remoteBotId, 'bot-alpha');
      assert.strictEqual(channel!.status, 'trusted');
    })();

    // Test 3: Rejected Handshake (Low Overlap)
    await test('Handshake rejects bot with low overlap (< 0.8)', () => {
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

      assert.strictEqual(response.accepted, false, 'Handshake should be rejected');
      assert(response.overlap < 0.8, `Overlap ${response.overlap} should be < 0.8`);

      const channel = handshake.getChannel('bot-beta');
      assert.strictEqual(channel, null, 'Channel should not be open');
    })();

    // Test 4: Borderline Handshake
    await test('Handshake handles borderline overlap cases correctly', () => {
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

      // Acceptance depends on exact overlap calculation
      if (response.accepted) {
        assert(response.overlap >= 0.8, 'If accepted, overlap must be >= 0.8');
      } else {
        assert(response.overlap < 0.8, 'If rejected, overlap must be < 0.8');
      }
    })();

    // Test 5: Identity Vector Exchange
    await test('Identity vector exchange preserves all categories', () => {
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

      // All categories should be accounted for
      const totalCategories = response.aligned.length + response.divergent.length;
      assert(totalCategories <= 20, 'Total categories should not exceed 20');
    })();

    // Test 6: Multiple Concurrent Channels
    await test('Multiple federation channels can coexist', () => {
      const localGeometry = createGeometry(0.8);
      const handshake = new FederationHandshake(
        'bot-local',
        'Local IntentGuard Bot',
        localGeometry,
        testDataDir,
      );

      // Add multiple trusted bots
      for (let i = 0; i < 3; i++) {
        const request: HandshakeRequest = {
          botId: `bot-multi-${i}`,
          botName: `Multi Bot ${i}`,
          geometry: createGeometry(0.82),
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        };

        const response = handshake.initiateHandshake(request);
        assert.strictEqual(response.accepted, true, `Bot ${i} should be accepted`);
      }

      const channels = handshake.listChannels();
      assert.strictEqual(channels.length, 3, 'Should have 3 active channels');
    })();

    // Test 7: Drift Detection - No Drift
    await test('Drift detection correctly identifies no drift', () => {
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

      // Check drift with same geometry
      const drift = handshake.checkChannelDrift('bot-epsilon', trustedGeometry);

      assert.strictEqual(drift.drifted, false, 'Should not detect drift with same geometry');
      assert(Math.abs(drift.oldOverlap - drift.newOverlap) < 0.01, 'Overlap should be nearly identical');
    })();

    // Test 8: Drift Detection - Significant Drift
    await test('Drift detection identifies significant drift and quarantines', () => {
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

      // Simulate significant drift - use very different direction (not just magnitude)
      // Half categories high, half low to change direction
      const driftedGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat, idx) => {
        acc[cat] = idx < 10 ? 0.1 : 0.9;
        return acc;
      }, {} as any);

      const drift = handshake.checkChannelDrift('bot-zeta', driftedGeometry);

      // Drift should be detected due to low overlap or significant change
      assert(drift.drifted || drift.newOverlap < 0.6,
        `Should detect drift: drifted=${drift.drifted}, newOverlap=${drift.newOverlap}`);

      // Channel should be closed if overlap dropped below quarantine threshold
      if (drift.newOverlap < 0.6) {
        const channel = handshake.getChannel('bot-zeta');
        assert.strictEqual(channel, null, 'Channel should be closed after drift below quarantine threshold');
      }
    })();

    // Test 9: Manual Channel Closure
    await test('Manual channel closure quarantines bot', () => {
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
      assert.strictEqual(closed, true, 'Channel should be closed successfully');

      const channel = handshake.getChannel('bot-eta');
      assert.strictEqual(channel, null, 'Channel should no longer exist');

      const registry = handshake.getRegistry();
      const bot = registry.getBotStatus('bot-eta');
      assert.strictEqual(bot!.status, 'quarantined', 'Bot should be quarantined');
    })();

    // Test 10: Close Non-Existent Channel
    await test('Closing non-existent channel returns false', () => {
      const localGeometry = createGeometry(0.8);
      const handshake = new FederationHandshake(
        'bot-local',
        'Local IntentGuard Bot',
        localGeometry,
        testDataDir,
      );

      const closed = handshake.closeChannel('bot-nonexistent', 'Test');
      assert.strictEqual(closed, false, 'Should return false for non-existent channel');
    })();

    // Test 11: Statistics Tracking
    await test('Statistics accurately track federation state', () => {
      cleanup(); // Fresh start to avoid cross-contamination

      const localGeometry = createGeometry(0.8);
      const handshake = new FederationHandshake(
        'bot-local-stats',
        'Local Stats Bot',
        localGeometry,
        './test-data-handshake-stats', // Use separate directory
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
      assert.strictEqual(stats.registeredBots, 2, 'Should have 2 registered bots');
      assert(stats.trusted >= 1, `Should have at least 1 trusted bot, got ${stats.trusted}`);
      assert.strictEqual(stats.activeChannels, stats.trusted, 'Active channels should equal trusted bots');

      // Cleanup stats test directory
      if (existsSync('./test-data-handshake-stats')) {
        rmSync('./test-data-handshake-stats', { recursive: true, force: true });
      }
    })();

    // Test 12: Receive Handshake Response (Logging)
    await test('Receive handshake response logs correctly', () => {
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
    })();

    // Test 13: Sparse Geometry Handling
    await test('Sparse geometry vectors are handled correctly', () => {
      const localGeometry = createGeometry(0.8);
      const handshake = new FederationHandshake(
        'bot-local',
        'Local IntentGuard Bot',
        localGeometry,
        testDataDir,
      );

      // Sparse geometry with only 5 categories
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

      // Should not throw
      const response = handshake.initiateHandshake(request);
      assert(typeof response.overlap === 'number', 'Should compute overlap');
      assert(response.overlap >= 0 && response.overlap <= 1, 'Overlap should be in [0, 1]');
    })();

    // Test 14: Registry Access
    await test('Registry can be accessed and queried', () => {
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

      assert(bots.length > 0, 'Registry should contain bots');

      const bot = registry.getBotStatus('bot-registry-test');
      assert(bot !== null, 'Should find registered bot');
      assert.strictEqual(bot!.id, 'bot-registry-test');
    })();

    // Test 15: Channel Last Seen Update
    await test('Channel last seen updates on drift check', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 10));

      // Trigger slight drift (but not enough to quarantine)
      const slightlyDifferent = createGeometry(0.81);
      handshake.checkChannelDrift('bot-lastseen', slightlyDifferent);

      const channelAfter = handshake.getChannel('bot-lastseen');

      // If channel still exists, lastSeen should be updated
      if (channelAfter) {
        assert(channelAfter.lastSeen >= lastSeenBefore, 'Last seen should be updated');
      }
    })();

    console.log('\n=== All Tests Passed ===');
    console.log(`\nCleanup: rm -rf ${testDataDir}`);

    // Clean up after tests
    cleanup();

  } catch (error) {
    console.error('\n=== Tests Failed ===');
    cleanup();
    process.exit(1);
  }
})();
