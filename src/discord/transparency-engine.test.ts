/**
 * src/discord/transparency-engine.test.ts — Tests for TransparencyEngine
 *
 * Tests FIM denial reporting to #trust-debt-public with Discord embed formatting.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransparencyEngine } from './transparency-engine.js';
import type { Logger, DiscordHelper, TrustDebtSpike } from '../types.js';

describe('TransparencyEngine', () => {
  let engine: TransparencyEngine;
  let mockLogger: Logger;
  let mockDiscord: DiscordHelper;
  let sentMessages: string[];

  beforeEach(() => {
    sentMessages = [];
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    mockDiscord = {
      reply: vi.fn(),
      sendToChannel: vi.fn(async (_channelId: string, content: string) => {
        sentMessages.push(content);
        return 'msg-123';
      }),
    };

    engine = new TransparencyEngine(mockLogger, {
      enabled: true,
      publicChannelName: 'trust-debt-public',
      spikeThreshold: 0.1,
      reportIntervalMs: 0, // Disable periodic reports for tests
      autoPost: false,
    });

    engine.start(mockDiscord, 'channel-123');
  });

  describe('recordDenial', () => {
    it('posts FIM denial with embed formatting', async () => {
      await engine.recordDenial(
        'shell_execute',
        'system-control',
        0.25,
        0.65,
        0.5,
        ['security', 'operations'],
        'Denial logged, monitoring for drift pattern (1 consecutive)'
      );

      expect(sentMessages).toHaveLength(1);
      const message = sentMessages[0];

      // Check embed structure
      expect(message).toContain('🛡️ **FIM PERMISSION DENIED**');
      expect(message).toContain('**Tool:** `shell_execute` (skill: `system-control`)');
      expect(message).toContain('**Overlap Score:** 25% (threshold: 50%)');
      expect(message).toContain('**Sovereignty:** 0.650');
      expect(message).toContain('**Failed Categories:** security, operations');
      expect(message).toContain('**Resolution:** Denial logged, monitoring for drift pattern (1 consecutive)');
      expect(message).toContain('**Time:**');
      expect(message).toContain('*This denial was logged to fim-denials.jsonl and triggered heat map update.*');
    });

    it('assigns correct hardness level for H1-CRITICAL', async () => {
      await engine.recordDenial(
        'shell_execute',
        'system-control',
        0.15, // < 0.3 = H1-CRITICAL
        0.45,
        0.5,
        ['security'],
        'Critical overlap deficit'
      );

      const message = sentMessages[0];
      expect(message).toContain('**Hardness:** H1-CRITICAL');
    });

    it('assigns correct hardness level for H2-HIGH', async () => {
      await engine.recordDenial(
        'file_write',
        'artifact-generator',
        0.35, // 0.3-0.5 = H2-HIGH
        0.75,
        0.5,
        [],
        'High overlap deficit'
      );

      const message = sentMessages[0];
      expect(message).toContain('**Hardness:** H2-HIGH');
    });

    it('assigns correct hardness level for H3-MEDIUM', async () => {
      await engine.recordDenial(
        'send_email',
        'email-outbound',
        0.55, // >= 0.5 = H3-MEDIUM
        0.8,
        0.5,
        [],
        'Medium overlap deficit'
      );

      const message = sentMessages[0];
      expect(message).toContain('**Hardness:** H3-MEDIUM');
    });

    it('handles empty failed categories', async () => {
      await engine.recordDenial(
        'file_write',
        'wallet-ledger',
        0.4,
        0.7,
        0.5,
        [],
        'No category failures, sovereignty threshold issue'
      );

      const message = sentMessages[0];
      expect(message).toContain('**Failed Categories:** N/A');
    });

    it('handles drift threshold resolution', async () => {
      await engine.recordDenial(
        'shell_execute',
        'claude-flow-bridge',
        0.2,
        0.5,
        0.5,
        ['operations', 'deployment'],
        'Drift threshold reached — pipeline re-run triggered'
      );

      const message = sentMessages[0];
      expect(message).toContain('**Resolution:** Drift threshold reached — pipeline re-run triggered');
    });

    it('does not crash if Discord is unavailable', async () => {
      const engineNoDiscord = new TransparencyEngine(mockLogger, {
        enabled: true,
        publicChannelName: 'trust-debt-public',
        spikeThreshold: 0.1,
        reportIntervalMs: 0,
        autoPost: false,
      });

      // No start() called — discord is undefined
      await expect(
        engineNoDiscord.recordDenial(
          'shell_execute',
          'system-control',
          0.25,
          0.65,
          0.5,
          ['security'],
          'Test'
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('recordSpike', () => {
    it('posts spike above threshold', async () => {
      const spike: TrustDebtSpike = {
        timestamp: new Date().toISOString(),
        category: 'security',
        delta: 0.15,
        previousScore: 0.5,
        newScore: 0.65,
        source: 'pipeline-run',
        details: 'Added new security controls',
      };

      await engine.recordSpike(spike);

      expect(sentMessages).toHaveLength(1);
      const message = sentMessages[0];
      expect(message).toContain('**Trust-Debt Spike**');
      expect(message).toContain('`security`');
      expect(message).toContain('Score: 0.500 → 0.650 (+0.150)');
    });

    it('does not post spike below threshold', async () => {
      const spike: TrustDebtSpike = {
        timestamp: new Date().toISOString(),
        category: 'performance',
        delta: 0.05, // Below default 0.1 threshold
        previousScore: 0.6,
        newScore: 0.65,
        source: 'pipeline-run',
        details: 'Minor optimization',
      };

      await engine.recordSpike(spike);

      expect(sentMessages).toHaveLength(0);
    });
  });

  describe('getHistory', () => {
    it('returns spike history', async () => {
      const spike1: TrustDebtSpike = {
        timestamp: new Date().toISOString(),
        category: 'security',
        delta: 0.15,
        previousScore: 0.5,
        newScore: 0.65,
        source: 'pipeline-run',
        details: 'Test 1',
      };

      const spike2: TrustDebtSpike = {
        timestamp: new Date().toISOString(),
        category: 'performance',
        delta: 0.2,
        previousScore: 0.7,
        newScore: 0.9,
        source: 'pipeline-run',
        details: 'Test 2',
      };

      await engine.recordSpike(spike1);
      await engine.recordSpike(spike2);

      const history = engine.getHistory(10);
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(spike1);
      expect(history[1]).toEqual(spike2);
    });

    it('limits history to specified count', async () => {
      for (let i = 0; i < 100; i++) {
        await engine.recordSpike({
          timestamp: new Date().toISOString(),
          category: 'test',
          delta: 0.01,
          previousScore: 0.5,
          newScore: 0.51,
          source: 'test',
          details: `Spike ${i}`,
        });
      }

      const history = engine.getHistory(20);
      expect(history).toHaveLength(20);
    });
  });

  describe('stop', () => {
    it('clears periodic report timer', () => {
      engine.stop();
      // No error should occur
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('TransparencyEngine started')
      );
    });
  });
});
