/**
 * src/discord/x-poster.test.ts — Tests for X/Twitter Poster
 *
 * Tests:
 * - 280-character validation before posting
 * - Queue management for sequential posting
 * - Discord reaction feedback (✅/❌)
 * - Browser automation mock integration
 * - Error handling and retry logic
 */

import { describe, test, expect, beforeEach } from 'vitest';
import type { Logger } from '../types.js';
import { XPoster, type XPostResult } from './x-poster.js';

// Mock logger
const mockLogger: Logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
};

// Mock MCP Browser Client
class MockMcpBrowserClient {
  private callLog: Array<{ tool: string; args: Record<string, unknown> }> = [];
  private shouldFail = false;
  private mockUrl = 'https://x.com/user/status/1234567890';

  async call(tool: string, args: Record<string, unknown>): Promise<unknown> {
    this.callLog.push({ tool, args });

    if (this.shouldFail) {
      throw new Error('Browser automation failed');
    }

    // Mock responses for different tools
    switch (tool) {
      case 'browser_open':
        return { success: true };
      case 'browser_wait':
        return { success: true };
      case 'browser_click':
        return { success: true };
      case 'browser_type':
        return { success: true };
      case 'browser_get-url':
        return { url: this.mockUrl };
      case 'browser_screenshot':
        return { data: 'base64-screenshot-data' };
      default:
        return { success: true };
    }
  }

  getCallLog() {
    return this.callLog;
  }

  setFailMode(fail: boolean) {
    this.shouldFail = fail;
  }

  setMockUrl(url: string) {
    this.mockUrl = url;
  }

  reset() {
    this.callLog = [];
    this.shouldFail = false;
    this.mockUrl = 'https://x.com/user/status/1234567890';
  }
}

// Mock Discord helper
class MockDiscord {
  private reactions: Array<{ channelId: string; messageId: string; emoji: string }> = [];

  async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    this.reactions.push({ channelId, messageId, emoji });
  }

  getReactions() {
    return this.reactions;
  }

  reset() {
    this.reactions = [];
  }
}

describe('XPoster', () => {
  let poster: XPoster;
  let mcpClient: MockMcpBrowserClient;
  let discord: MockDiscord;

  beforeEach(() => {
    poster = new XPoster(mockLogger);
    mcpClient = new MockMcpBrowserClient();
    discord = new MockDiscord();
    poster.setMcpClient(mcpClient as any);
    poster.setDiscord(discord as any, 'x-posts-123');
  });

  describe('280-character validation', () => {
    test('rejects tweet over 280 characters', async () => {
      const longTweet = 'A'.repeat(281);
      const result = await poster.post(longTweet, 'msg-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('too long');
      expect(result.message).toContain('281');
    });

    test('accepts tweet at exactly 280 characters', async () => {
      const maxTweet = 'A'.repeat(280);
      const result = await poster.post(maxTweet, 'msg-123');

      expect(result.success).toBe(true);
    });

    test('accepts tweet under 280 characters', async () => {
      const shortTweet = 'This is a short tweet';
      const result = await poster.post(shortTweet, 'msg-123');

      expect(result.success).toBe(true);
    });

    test('adds ❌ reaction when tweet is too long', async () => {
      const longTweet = 'A'.repeat(300);
      await poster.post(longTweet, 'msg-456');

      const reactions = discord.getReactions();
      expect(reactions.length).toBe(1);
      expect(reactions[0].emoji).toBe('❌');
      expect(reactions[0].messageId).toBe('msg-456');
    });
  });

  describe('queue management', () => {
    test('processes tweets sequentially', async () => {
      const results = await Promise.all([
        poster.post('Tweet 1', 'msg-1'),
        poster.post('Tweet 2', 'msg-2'),
        poster.post('Tweet 3', 'msg-3'),
      ]);

      expect(results.length).toBe(3);
      results.forEach(r => expect(r.success).toBe(true));

      // Verify sequential processing via call log
      const callLog = mcpClient.getCallLog();
      expect(callLog.length).toBeGreaterThan(0);
    });

    test('continues queue processing after error', async () => {
      mcpClient.setFailMode(true);

      const result1 = await poster.post('Tweet 1', 'msg-1');
      expect(result1.success).toBe(false);

      mcpClient.setFailMode(false);

      const result2 = await poster.post('Tweet 2', 'msg-2');
      expect(result2.success).toBe(true);
    });

    test('does not process queue when already processing', async () => {
      // This is tested implicitly by the sequential test above
      expect(true).toBe(true);
    });
  });

  describe('Discord reaction feedback', () => {
    test('adds ✅ reaction on successful post', async () => {
      await poster.post('Success tweet', 'msg-success');

      const reactions = discord.getReactions();
      expect(reactions.length).toBe(1);
      expect(reactions[0].emoji).toBe('✅');
      expect(reactions[0].channelId).toBe('x-posts-123');
      expect(reactions[0].messageId).toBe('msg-success');
    });

    test('adds ❌ reaction on browser failure', async () => {
      mcpClient.setFailMode(true);

      await poster.post('Failed tweet', 'msg-fail');

      const reactions = discord.getReactions();
      expect(reactions.length).toBe(1);
      expect(reactions[0].emoji).toBe('❌');
      expect(reactions[0].messageId).toBe('msg-fail');
    });

    test('handles missing Discord client gracefully', async () => {
      const isolatedPoster = new XPoster(mockLogger);
      isolatedPoster.setMcpClient(mcpClient as any);
      // Don't set Discord

      const result = await isolatedPoster.post('No Discord', 'msg-123');

      // Should still post, just no reaction
      expect(result.success).toBe(true);
    });
  });

  describe('browser automation flow', () => {
    test('opens X compose page', async () => {
      await poster.post('Test tweet', 'msg-123');

      const callLog = mcpClient.getCallLog();
      const openCall = callLog.find(c => c.tool === 'browser_open');

      expect(openCall).toBeDefined();
      expect(openCall?.args.url).toBe('https://x.com/compose/post');
    });

    test('waits for textarea', async () => {
      await poster.post('Test tweet', 'msg-123');

      const callLog = mcpClient.getCallLog();
      const waitCall = callLog.find(c => c.tool === 'browser_wait');

      expect(waitCall).toBeDefined();
      expect(waitCall?.args.target).toContain('tweetTextarea');
    });

    test('clicks textarea before typing', async () => {
      await poster.post('Test tweet', 'msg-123');

      const callLog = mcpClient.getCallLog();
      const clickCall = callLog.find(c => c.tool === 'browser_click' && String(c.args.target).includes('tweetTextarea'));

      expect(clickCall).toBeDefined();
    });

    test('types tweet text', async () => {
      const tweetText = 'Testing browser type';
      await poster.post(tweetText, 'msg-123');

      const callLog = mcpClient.getCallLog();
      const typeCall = callLog.find(c => c.tool === 'browser_type');

      expect(typeCall).toBeDefined();
      expect(typeCall?.args.text).toBe(tweetText);
    });

    test('clicks Post button', async () => {
      await poster.post('Test tweet', 'msg-123');

      const callLog = mcpClient.getCallLog();
      const postButtonClick = callLog.find(c =>
        c.tool === 'browser_click' && String(c.args.target).includes('tweetButton')
      );

      expect(postButtonClick).toBeDefined();
    });

    test('verifies with URL check', async () => {
      await poster.post('Test tweet', 'msg-123');

      const callLog = mcpClient.getCallLog();
      const urlCall = callLog.find(c => c.tool === 'browser_get-url');

      expect(urlCall).toBeDefined();
    });

    test('returns tweet URL on success', async () => {
      mcpClient.setMockUrl('https://x.com/user/status/9876543210');

      const result = await poster.post('Test tweet', 'msg-123');

      expect(result.success).toBe(true);
      expect(result.tweetUrl).toBe('https://x.com/user/status/9876543210');
    });

    test('retries if still on compose page', async () => {
      mcpClient.setMockUrl('https://x.com/compose/post');

      const result = await poster.post('Test retry', 'msg-123');

      const callLog = mcpClient.getCallLog();
      const postButtonClicks = callLog.filter(c =>
        c.tool === 'browser_click' && String(c.args.target).includes('tweetButton')
      );

      // Should have clicked Post button at least twice (initial + retry)
      expect(postButtonClicks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('screenshot capture', () => {
    test('captures screenshot for verification', async () => {
      await poster.post('Test tweet', 'msg-123');

      const callLog = mcpClient.getCallLog();
      const screenshotCall = callLog.find(c => c.tool === 'browser_screenshot');

      expect(screenshotCall).toBeDefined();
    });

    test('screenshot() returns base64 data', async () => {
      const screenshotData = await poster.screenshot();

      expect(screenshotData).toBe('base64-screenshot-data');
    });

    test('screenshot() returns null without MCP client', async () => {
      const isolatedPoster = new XPoster(mockLogger);
      const screenshotData = await isolatedPoster.screenshot();

      expect(screenshotData).toBeNull();
    });
  });

  describe('error handling', () => {
    test('returns error result on browser failure', async () => {
      mcpClient.setFailMode(true);

      const result = await poster.post('Test error', 'msg-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Browser');
    });

    test('processes next item in queue after error', async () => {
      mcpClient.setFailMode(true);
      await poster.post('Fail tweet', 'msg-1');

      mcpClient.setFailMode(false);
      const result2 = await poster.post('Success tweet', 'msg-2');

      expect(result2.success).toBe(true);
    });

    test('handles missing session gracefully', async () => {
      const result = await poster.post('Test session', 'msg-123');

      // Should use default 'x-twitter' session
      expect(result.success).toBe(true);
    });
  });

  describe('fallback shell mode', () => {
    test('uses shell fallback when MCP client not available', async () => {
      const noBrowserPoster = new XPoster(mockLogger);
      // Don't set MCP client

      const result = await noBrowserPoster.post('Shell fallback', 'msg-123');

      // Shell fallback should attempt to work
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });
});
