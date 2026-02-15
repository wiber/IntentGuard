/**
 * src/channels/telegram-integration.test.ts — Telegram Channel Manager Integration Test
 *
 * Tests Telegram adapter's integration with channel-manager routing system.
 * Verifies message flow: Telegram -> ChannelManager -> Discord room routing.
 *
 * Run: npx vitest run src/channels/telegram-integration.test.ts
 */

import { describe, it, expect } from 'vitest';
import { TelegramAdapter } from './telegram-adapter.js';
import type { Logger } from '../types.js';
import type { CrossChannelMessage, ChannelAdapter } from './types.js';

// ═══════════════════════════════════════════════════════════════
// Mock Logger
// ═══════════════════════════════════════════════════════════════

const mockLogger: Logger = {
  debug: (msg: string) => {},
  info: (msg: string) => {},
  warn: (msg: string) => {},
  error: (msg: string) => {},
};

// ═══════════════════════════════════════════════════════════════
// Mock Channel Manager
// ═══════════════════════════════════════════════════════════════

class MockChannelManager {
  private adapters = new Map<string, ChannelAdapter>();
  private routedMessages: CrossChannelMessage[] = [];

  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.name, adapter);

    // Wire message routing (mimics channel-manager.ts:220-222)
    adapter.onMessage((msg: CrossChannelMessage) => {
      this.routeMessage(msg);
    });
  }

  routeMessage(msg: CrossChannelMessage): void {
    this.routedMessages.push(msg);
  }

  getRoutedMessages(): CrossChannelMessage[] {
    return this.routedMessages;
  }

  getAdapters(): Map<string, ChannelAdapter> {
    return this.adapters;
  }
}

// ═══════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════

describe('Telegram Channel Manager Integration', () => {
  it('should register adapter with channel manager', async () => {
    const channelManager = new MockChannelManager();
    const telegramAdapter = new TelegramAdapter(mockLogger, 'test-token', [
      { groupId: '-1001234567890', room: 'builder' },
      { groupId: '-1009876543210', room: 'vault' },
    ]);

    channelManager.registerAdapter(telegramAdapter);

    const adapters = channelManager.getAdapters();
    expect(adapters.has('telegram')).toBe(true);
    expect(telegramAdapter.name).toBe('telegram');
  });

  it('should route messages through channel manager', async () => {
    const channelManager = new MockChannelManager();
    const telegramAdapter = new TelegramAdapter(mockLogger, 'test-token', [
      { groupId: '-1001111111111', room: 'architect' },
      { groupId: '-1002222222222', room: 'operator' },
    ]);

    channelManager.registerAdapter(telegramAdapter);

    const testMessage: CrossChannelMessage = {
      source: 'telegram',
      sourceId: '-1001111111111',
      targetRoom: 'architect',
      content: 'Test message from Telegram',
      author: 'testuser',
      timestamp: new Date(),
      sourceMessageId: '12345',
    };

    // Trigger the onMessage callback directly
    telegramAdapter.onMessage((msg: CrossChannelMessage) => {
      channelManager.routeMessage(msg);
    });

    // Simulate message event by calling the registered callback
    const messageCallback = (telegramAdapter as any).messageCallback;
    if (messageCallback) {
      messageCallback(testMessage);
    }

    const routedMessages = channelManager.getRoutedMessages();
    expect(routedMessages.length).toBeGreaterThan(0);
    expect(routedMessages[0]?.targetRoom).toBe('architect');
  });

  it('should map groups to rooms correctly', async () => {
    const telegramAdapter = new TelegramAdapter(mockLogger, 'test-token', [
      { groupId: '-1001111111111', room: 'vault' },
      { groupId: '-1002222222222', room: 'voice' },
    ]);

    expect(telegramAdapter.getGroupIdForRoom('vault')).toBe('-1001111111111');
    expect(telegramAdapter.getGroupIdForRoom('voice')).toBe('-1002222222222');
    expect(telegramAdapter.getGroupIdForRoom('nonexistent')).toBeUndefined();

    // Test runtime mapping addition
    telegramAdapter.addMapping('-1003333333333', 'laboratory');
    expect(telegramAdapter.getGroupIdForRoom('laboratory')).toBe('-1003333333333');
  });

  it('should send to room without throwing in stub mode', async () => {
    const telegramAdapter = new TelegramAdapter(mockLogger, 'test-token', [
      { groupId: '-1001234567890', room: 'builder' },
    ]);

    // sendToRoom when disconnected should warn, not throw
    await expect(
      telegramAdapter.sendToRoom('builder', 'Test outbound message')
    ).resolves.not.toThrow();
  });

  it('should comply with ChannelAdapter interface', async () => {
    const adapter = new TelegramAdapter(mockLogger, 'test-token');

    const requiredMethods = ['initialize', 'sendMessage', 'onMessage', 'disconnect'];
    const requiredProperties = ['name', 'status'];

    for (const prop of requiredProperties) {
      expect(prop in adapter).toBe(true);
    }

    for (const method of requiredMethods) {
      expect(typeof (adapter as any)[method]).toBe('function');
    }
  });

  it('should handle initialization failure gracefully', async () => {
    const adapter = new TelegramAdapter(mockLogger, 'test-token');

    await adapter.initialize();
    expect(adapter.status).toBe('disconnected');
  });
});
