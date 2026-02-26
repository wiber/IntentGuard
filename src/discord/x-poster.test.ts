/**
 * src/discord/x-poster.test.ts — Tests for X/Twitter Post Coordinator
 *
 * Tests the brain-side logic: validation, queue management, Discord reactions,
 * and task-queue delegation to OpenClaw's browser-poster skill.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Logger } from '../types.js';
import { XPoster, RECIPES } from './x-poster.js';

// Mock logger
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

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

// Mock fs for task queue writes
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  const written: string[] = [];
  return {
    ...actual,
    appendFileSync: vi.fn((path: string, data: string) => {
      written.push(data);
    }),
    readFileSync: vi.fn((path: string) => {
      if (path.includes('browser-post-state.json')) {
        return JSON.stringify({ status: 'posted', text: 'Test tweet' });
      }
      return '';
    }),
    mkdirSync: vi.fn(),
    existsSync: vi.fn(() => true),
    _getWritten: () => written,
    _clearWritten: () => { written.length = 0; },
  };
});

describe('XPoster', () => {
  let poster: XPoster;
  let discord: MockDiscord;

  beforeEach(() => {
    poster = new XPoster(mockLogger);
    discord = new MockDiscord();
    poster.setDiscord(discord as any, 'x-posts-123');
  });

  afterEach(() => {
    poster.destroy();
    vi.clearAllMocks();
  });

  describe('recipe validation', () => {
    test('has recipes for x, bluesky, linkedin', () => {
      expect(RECIPES.x).toBeDefined();
      expect(RECIPES.bluesky).toBeDefined();
      expect(RECIPES.linkedin).toBeDefined();
    });

    test('x recipe has 280 char limit', () => {
      expect(RECIPES.x.maxChars).toBe(280);
    });

    test('bluesky recipe has 300 char limit', () => {
      expect(RECIPES.bluesky.maxChars).toBe(300);
    });

    test('rejects unknown target', async () => {
      const result = await poster.post('Test', 'msg-1', 'mastodon');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown target');
    });
  });

  describe('280-character validation', () => {
    test('rejects tweet over 280 characters', async () => {
      const longTweet = 'A'.repeat(281);
      const result = await poster.post(longTweet, 'msg-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Too long');
      expect(result.message).toContain('281');
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

  describe('OpenClaw delegation', () => {
    test('writes task to poster.jsonl on post', async () => {
      const { appendFileSync } = await import('fs');

      await poster.post('Test tweet', 'msg-123');

      expect(appendFileSync).toHaveBeenCalled();
      const calls = (appendFileSync as any).mock.calls;
      const posterCall = calls.find((c: any[]) => String(c[0]).includes('poster.jsonl'));
      expect(posterCall).toBeDefined();

      const task = JSON.parse(posterCall[1].trim());
      expect(task.action).toBe('post.auto');
      expect(task.text).toBe('Test tweet');
      expect(task.recipe).toBe('x');
      expect(task.discordMessageId).toBe('msg-123');
    });

    test('writes tab close task to poster.jsonl', async () => {
      const { appendFileSync } = await import('fs');

      await poster.closeTabs('x.com');

      const calls = (appendFileSync as any).mock.calls;
      const posterCall = calls.find((c: any[]) => String(c[0]).includes('poster.jsonl'));
      expect(posterCall).toBeDefined();

      const task = JSON.parse(posterCall[1].trim());
      expect(task.action).toBe('tabs.close');
      expect(task.target).toBe('x.com');
    });
  });

  describe('state reading', () => {
    test('readState reads from browser-post-state.json', () => {
      const state = poster.readState();
      expect(state.status).toBe('posted');
    });
  });

  describe('handles missing Discord client gracefully', () => {
    test('posts without Discord set', async () => {
      const isolatedPoster = new XPoster(mockLogger);

      const result = await isolatedPoster.post('No Discord', 'msg-123');

      // Should still attempt dispatch
      expect(result).toBeDefined();
      isolatedPoster.destroy();
    });
  });
});
