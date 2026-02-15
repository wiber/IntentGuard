/**
 * src/discord/tweet-composer.test.ts — Tests for Tweet Composer
 *
 * Tests:
 * - 280-character constraint enforcement
 * - #x-posts staging workflow
 * - Thumbs-up reaction handling
 * - Tweet composition with ShortRank intersections
 * - Cross-posting to game channel
 */

import { describe, test, expect, beforeEach } from 'vitest';
import type { Logger, DiscordHelper } from '../types.js';
import { TweetComposer, type TweetData, type TweetMessage } from './tweet-composer.js';

// Mock logger
const mockLogger: Logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
};

// Mock Discord helper
class MockDiscordHelper implements DiscordHelper {
  private messages: Array<{ channelId: string; text: string; id: string }> = [];
  private reactions: Array<{ channelId: string; messageId: string; emoji: string }> = [];

  async sendToChannel(channelId: string, text: string): Promise<string | null> {
    const id = `msg-${Date.now()}-${Math.random()}`;
    this.messages.push({ channelId, text, id });
    return id;
  }

  async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    this.reactions.push({ channelId, messageId, emoji });
  }

  getMessages() {
    return this.messages;
  }

  getReactions() {
    return this.reactions;
  }

  reset() {
    this.messages = [];
    this.reactions = [];
  }
}

describe('TweetComposer', () => {
  let composer: TweetComposer;
  let discord: MockDiscordHelper;

  beforeEach(() => {
    composer = new TweetComposer(mockLogger);
    discord = new MockDiscordHelper();
  });

  describe('280-character constraint', () => {
    test('short tweet fits within 280 chars', () => {
      const data: TweetData = {
        text: 'Test tweet',
        room: 'operator',
        sovereignty: 0.85,
        categories: ['test'],
        source: 'status',
      };

      const tweet = composer.compose(data);
      expect(tweet.length).toBeLessThanOrEqual(280);
    });

    test('long tweet is truncated to 280 chars', () => {
      const longText = 'A'.repeat(300);
      const data: TweetData = {
        text: longText,
        room: 'operator',
        sovereignty: 0.85,
        categories: ['test', 'long', 'truncate'],
        source: 'status',
      };

      const tweet = composer.compose(data);
      expect(tweet.length).toBeLessThanOrEqual(280);
      expect(tweet).toContain('...');
    });

    test('tweet with long categories truncates text to fit', () => {
      const data: TweetData = {
        text: 'B'.repeat(250),
        room: 'operator',
        sovereignty: 0.75,
        categories: ['category_one', 'category_two', 'category_three'],
        source: 'status',
      };

      const tweet = composer.compose(data);
      expect(tweet.length).toBeLessThanOrEqual(280);
    });

    test('composed tweet includes sovereignty indicator', () => {
      const data: TweetData = {
        text: 'Test sovereignty',
        room: 'operator',
        sovereignty: 0.85,
        categories: ['test'],
        source: 'status',
      };

      const tweet = composer.compose(data);
      expect(tweet).toMatch(/🟢|🟡|🔴/);
      expect(tweet).toContain('S:85%');
    });

    test('high sovereignty shows green indicator', () => {
      const data: TweetData = {
        text: 'High sovereignty test',
        room: 'operator',
        sovereignty: 0.95,
        categories: ['test'],
        source: 'status',
      };

      const tweet = composer.compose(data);
      expect(tweet).toContain('🟢');
    });

    test('medium sovereignty shows yellow indicator', () => {
      const data: TweetData = {
        text: 'Medium sovereignty test',
        room: 'operator',
        sovereignty: 0.65,
        categories: ['test'],
        source: 'status',
      };

      const tweet = composer.compose(data);
      expect(tweet).toContain('🟡');
    });

    test('low sovereignty shows red indicator', () => {
      const data: TweetData = {
        text: 'Low sovereignty test',
        room: 'operator',
        sovereignty: 0.45,
        categories: ['test'],
        source: 'status',
      };

      const tweet = composer.compose(data);
      expect(tweet).toContain('🔴');
    });
  });

  describe('#x-posts staging workflow', () => {
    test('bind() accepts x-posts channel ID', () => {
      expect(() => {
        composer.bind(discord, 'primary-123', 'game-456', 'x-posts-789');
      }).not.toThrow();
    });

    test('post() sends staging message to #x-posts', async () => {
      composer.bind(discord, 'primary-123', 'game-456', 'x-posts-789');

      const data: TweetData = {
        text: 'Test staging',
        room: 'operator',
        sovereignty: 0.85,
        categories: ['test'],
        source: 'status',
      };

      await composer.post(data);

      const messages = discord.getMessages();
      const xPostsMessages = messages.filter(m => m.channelId === 'x-posts-789');

      expect(xPostsMessages.length).toBe(1);
      expect(xPostsMessages[0].text).toContain('🐦 **Tweet Draft**');
      expect(xPostsMessages[0].text).toContain('React 👍 to publish');
    });

    test('post() includes staging message ID in tweet metadata', async () => {
      composer.bind(discord, 'primary-123', undefined, 'x-posts-789');

      const data: TweetData = {
        text: 'Test metadata',
        room: 'operator',
        sovereignty: 0.85,
        categories: ['test'],
        source: 'status',
      };

      const tweetMessage = await composer.post(data);

      expect(tweetMessage).not.toBeNull();
      expect(tweetMessage?.metadata?.xPostsStagingMsgId).toBeDefined();
      expect(typeof tweetMessage?.metadata?.xPostsStagingMsgId).toBe('string');
    });

    test('post() without x-posts channel skips staging', async () => {
      composer.bind(discord, 'primary-123');

      const data: TweetData = {
        text: 'Test no staging',
        room: 'operator',
        sovereignty: 0.85,
        categories: ['test'],
        source: 'status',
      };

      await composer.post(data);

      const messages = discord.getMessages();
      const stagingMessages = messages.filter(m => m.text.includes('Tweet Draft'));

      expect(stagingMessages.length).toBe(0);
    });
  });

  describe('thumbs-up reaction handling', () => {
    test('handleReaction() with 👍 on staging message triggers onXPost callback', async () => {
      composer.bind(discord, 'primary-123', undefined, 'x-posts-789');

      const data: TweetData = {
        text: 'Test thumbs-up',
        room: 'operator',
        sovereignty: 0.85,
        categories: ['test'],
        source: 'status',
      };

      const tweetMessage = await composer.post(data);
      const stagingMsgId = tweetMessage?.metadata?.xPostsStagingMsgId as string;

      let xPostCalled = false;
      composer.onXPost = async (text, msgId) => {
        xPostCalled = true;
        expect(msgId).toBe(stagingMsgId);
        expect(text.length).toBeLessThanOrEqual(280);
      };

      const result = await composer.handleReaction(stagingMsgId, '👍', true);

      expect(xPostCalled).toBe(true);
      expect(result).toContain('published-to-x');
    });

    test('handleReaction() requires admin permission', async () => {
      composer.bind(discord, 'primary-123', undefined, 'x-posts-789');

      const data: TweetData = {
        text: 'Test admin required',
        room: 'operator',
        sovereignty: 0.85,
        categories: ['test'],
        source: 'status',
      };

      const tweetMessage = await composer.post(data);
      const stagingMsgId = tweetMessage?.metadata?.xPostsStagingMsgId as string;

      composer.onXPost = async () => {
        throw new Error('Should not be called');
      };

      // Non-admin reaction should be ignored
      const result = await composer.handleReaction(stagingMsgId, '👍', false);

      expect(result).toBeNull();
    });

    test('handleReaction() ignores non-thumbs-up emojis on staging messages', async () => {
      composer.bind(discord, 'primary-123', undefined, 'x-posts-789');

      const data: TweetData = {
        text: 'Test wrong emoji',
        room: 'operator',
        sovereignty: 0.85,
        categories: ['test'],
        source: 'status',
      };

      const tweetMessage = await composer.post(data);
      const stagingMsgId = tweetMessage?.metadata?.xPostsStagingMsgId as string;

      composer.onXPost = async () => {
        throw new Error('Should not be called');
      };

      const result = await composer.handleReaction(stagingMsgId, '❤️', true);

      // Should not trigger X posting with wrong emoji
      expect(result).toBeNull();
    });

    test('handleReaction() with 🔄 still works for game cross-posting', async () => {
      composer.bind(discord, 'primary-123', 'game-456');

      const data: TweetData = {
        text: 'Test cross-post',
        room: 'operator',
        sovereignty: 0.85,
        categories: ['test'],
        source: 'status',
      };

      const tweetMessage = await composer.post(data);
      const primaryMsgId = tweetMessage?.discordMessageId!;

      const result = await composer.handleReaction(primaryMsgId, '🔄', true);

      expect(result).toContain('crossposted');
    });
  });

  describe('pre-built tweet templates', () => {
    test('pipelineTweet() generates valid tweet under 280 chars', () => {
      const data = composer.pipelineTweet(0.85, 92.5, 450, 18);
      const tweet = composer.compose(data);

      expect(tweet.length).toBeLessThanOrEqual(280);
      expect(data.text).toContain('Pipeline complete');
      expect(data.text).toContain('85%');
    });

    test('heartbeatTweet() generates valid tweet under 280 chars', () => {
      const data = composer.heartbeatTweet(0.92, 5, 12.45, 48);
      const tweet = composer.compose(data);

      expect(tweet.length).toBeLessThanOrEqual(280);
      expect(data.text).toContain('Heartbeat');
      expect(data.text).toContain('$12.45');
    });

    test('fimDenialTweet() generates valid tweet under 280 chars', () => {
      const data = composer.fimDenialTweet('dangerous-tool', 0.35, 0.88);
      const tweet = composer.compose(data);

      expect(tweet.length).toBeLessThanOrEqual(280);
      expect(data.text).toContain('FIM DENIED');
      expect(data.text).toContain('dangerous-tool');
    });

    test('intelligenceBurst() generates valid tweet under 280 chars', () => {
      const data = composer.intelligenceBurst(
        'architect',
        'Proactive refactor of auth module',
        { success: true, gitHash: 'abc123def456' },
        0.90,
        'H3',
        0.82,
        'Appendix H — Geometric IAM'
      );
      const tweet = composer.compose(data);

      expect(tweet.length).toBeLessThanOrEqual(280);
      expect(data.text).toContain('H3');
      expect(data.text).toContain('82%');
    });
  });

  describe('tweet history', () => {
    test('getRecent() returns most recent tweets', async () => {
      composer.bind(discord, 'primary-123');

      for (let i = 0; i < 15; i++) {
        await composer.post({
          text: `Tweet ${i}`,
          room: 'operator',
          sovereignty: 0.85,
          categories: ['test'],
          source: 'status',
        });
      }

      const recent = composer.getRecent(10);
      expect(recent.length).toBe(10);
      expect(recent[recent.length - 1].tweet.text).toContain('Tweet 14');
    });

    test('history limits to prevent memory bloat', async () => {
      composer.bind(discord, 'primary-123');

      // Post 600 tweets to test trimming at 500
      for (let i = 0; i < 600; i++) {
        await composer.post({
          text: `Spam ${i}`,
          room: 'operator',
          sovereignty: 0.85,
          categories: ['test'],
          source: 'status',
        });
      }

      const all = composer.getRecent(1000);
      expect(all.length).toBeLessThanOrEqual(500);
    });
  });
});
