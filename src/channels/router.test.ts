/**
 * src/channels/router.test.ts — Tests for Cross-Channel Message Router
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageRouter } from './router.js';
import type { CrossChannelMessage, ChannelRoutingRule } from './types.js';
import type { Logger } from '../types.js';

const mockLogger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

function makeMessage(overrides: Partial<CrossChannelMessage> = {}): CrossChannelMessage {
  return {
    source: 'whatsapp',
    sourceId: 'group-123',
    targetRoom: '',
    content: 'hello',
    author: 'alice',
    timestamp: new Date(),
    ...overrides,
  };
}

describe('MessageRouter', () => {
  let router: MessageRouter;

  const rules: ChannelRoutingRule[] = [
    { adapter: 'whatsapp', sourceId: 'group-123', targetRoom: 'builder' },
    { adapter: 'telegram', sourceId: 'chat-456', targetRoom: 'architect' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    router = new MessageRouter(mockLogger, { rules });
  });

  describe('configure', () => {
    it('sets up routing rules from config', () => {
      expect(router.getAllRules()).toHaveLength(2);
    });

    it('sets default room when provided', () => {
      router.configure({ rules: [], defaultRoom: 'general' });
      const msg = makeMessage({ source: 'unknown', sourceId: 'x', targetRoom: '' });
      expect(router.route(msg)).toBe('general');
    });

    it('clears previous rules on reconfigure', () => {
      router.configure({ rules: [rules[0]] });
      expect(router.getAllRules()).toHaveLength(1);
    });
  });

  describe('route', () => {
    it('routes by adapter+sourceId match', () => {
      const msg = makeMessage({ targetRoom: '' });
      expect(router.route(msg)).toBe('builder');
    });

    it('prioritises message-specified targetRoom', () => {
      const msg = makeMessage({ targetRoom: 'override-room' });
      expect(router.route(msg)).toBe('override-room');
    });

    it('falls back to default room when no rule matches', () => {
      router.configure({ rules, defaultRoom: 'lobby' });
      const msg = makeMessage({ source: 'slack', sourceId: 'no-match', targetRoom: '' });
      expect(router.route(msg)).toBe('lobby');
    });

    it('returns null when no route and no default', () => {
      const msg = makeMessage({ source: 'slack', sourceId: 'no-match', targetRoom: '' });
      expect(router.route(msg)).toBeNull();
    });
  });

  describe('addRule / removeRule', () => {
    it('adds a rule dynamically', () => {
      router.addRule({ adapter: 'slack', sourceId: 'chan-1', targetRoom: 'ops' });
      expect(router.getRule('slack', 'chan-1')).toEqual({
        adapter: 'slack',
        sourceId: 'chan-1',
        targetRoom: 'ops',
      });
    });

    it('removes a rule and returns true', () => {
      expect(router.removeRule('whatsapp', 'group-123')).toBe(true);
      expect(router.getRule('whatsapp', 'group-123')).toBeNull();
    });

    it('returns false when removing a non-existent rule', () => {
      expect(router.removeRule('unknown', 'x')).toBe(false);
    });
  });

  describe('getRule / getAllRules', () => {
    it('returns null for unknown rule', () => {
      expect(router.getRule('irc', 'nope')).toBeNull();
    });

    it('returns all rules', () => {
      const all = router.getAllRules();
      expect(all).toHaveLength(2);
      expect(all.map((r) => r.targetRoom).sort()).toEqual(['architect', 'builder']);
    });
  });

  describe('reverse lookup', () => {
    it('finds sourceId for a room', () => {
      expect(router.getSourceIdForRoom('whatsapp', 'builder')).toBe('group-123');
    });

    it('returns null for unknown room', () => {
      expect(router.getSourceIdForRoom('whatsapp', 'nonexistent')).toBeNull();
    });

    it('gets all source IDs for a room', () => {
      router.addRule({ adapter: 'telegram', sourceId: 'chat-789', targetRoom: 'builder' });
      const sources = router.getSourceIdsForRoom('builder');
      expect(sources).toHaveLength(2);
    });
  });

  describe('bidirectional', () => {
    it('defaults to false', () => {
      expect(router.isBidirectional()).toBe(false);
    });

    it('can be enabled via config', () => {
      router.configure({ rules: [], bidirectional: true });
      expect(router.isBidirectional()).toBe(true);
    });
  });

  describe('transformMessage', () => {
    const msg = makeMessage({ author: 'bob', content: 'test message' });

    it('formats for discord with bold', () => {
      expect(router.transformMessage(msg, 'discord')).toBe(
        '**[whatsapp] bob:** test message',
      );
    });

    it('formats for whatsapp with italic', () => {
      expect(router.transformMessage(msg, 'whatsapp')).toBe(
        '*[whatsapp] bob:* test message',
      );
    });

    it('formats for telegram with italic', () => {
      expect(router.transformMessage(msg, 'telegram')).toBe(
        '*[whatsapp] bob:* test message',
      );
    });

    it('uses plain text for unknown adapters', () => {
      expect(router.transformMessage(msg, 'irc')).toBe(
        '[whatsapp] bob: test message',
      );
    });
  });
});
