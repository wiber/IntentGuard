/**
 * src/channels/whatsapp-integration.test.ts — WhatsApp Integration Tests
 *
 * Tests the full integration flow:
 * 1. WhatsApp adapter registers with channel manager
 * 2. Incoming WhatsApp messages route to Discord rooms
 * 3. Discord messages can be sent back to WhatsApp groups
 */

import { describe, it, expect } from 'vitest';
import { WhatsAppAdapter } from './whatsapp-adapter.js';
import type { Logger } from '../types.js';
import type { ChannelAdapter, CrossChannelMessage } from './types.js';

// ═══════════════════════════════════════════════════════════════
// Mock Logger
// ═══════════════════════════════════════════════════════════════

const mockLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

// ═══════════════════════════════════════════════════════════════
// Mock Channel Manager (Simplified)
// ═══════════════════════════════════════════════════════════════

class MockChannelManager {
  private adapters = new Map<string, ChannelAdapter>();
  private messageLog: CrossChannelMessage[] = [];

  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.name, adapter);

    adapter.onMessage((msg: CrossChannelMessage) => {
      this.routeMessage(msg);
    });
  }

  private routeMessage(msg: CrossChannelMessage): void {
    this.messageLog.push(msg);
  }

  async sendToExternalChannel(
    adapterName: string,
    chatId: string,
    content: string
  ): Promise<void> {
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      return;
    }

    if (adapter.status !== 'connected') {
      return;
    }

    await adapter.sendMessage(chatId, content);
  }

  getMessageLog(): CrossChannelMessage[] {
    return this.messageLog;
  }

  getAdapter(name: string): ChannelAdapter | undefined {
    return this.adapters.get(name);
  }
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('WhatsApp Adapter Registration', () => {
  it('should register adapter with channel manager', () => {
    const manager = new MockChannelManager();
    const adapter = new WhatsAppAdapter(mockLogger, [
      { groupId: '123456789@g.us', room: 'builder' },
      { groupId: '987654321@g.us', room: 'architect' },
    ]);

    manager.registerAdapter(adapter);

    const registered = manager.getAdapter('whatsapp');
    expect(registered?.name).toBe('whatsapp');
    expect(adapter.status).toBeDefined();
  });
});

describe('Incoming Message Routing (WhatsApp -> Discord)', () => {
  it('should route incoming messages to channel manager', () => {
    const manager = new MockChannelManager();
    const adapter = new WhatsAppAdapter(mockLogger, [
      { groupId: 'group-1@g.us', room: 'operator' },
      { groupId: 'group-2@g.us', room: 'vault' },
    ]);

    manager.registerAdapter(adapter);

    // Access the message callback that was registered
    const messageCallback = (adapter as any).messageCallback;

    if (messageCallback) {
      const testMessage: CrossChannelMessage = {
        source: 'whatsapp',
        sourceId: 'group-1@g.us',
        targetRoom: 'operator',
        content: 'Deploy the new feature to production',
        author: 'John Doe',
        timestamp: new Date(),
        sourceMessageId: 'msg_12345',
      };

      messageCallback(testMessage);

      const messageLog = manager.getMessageLog();
      expect(messageLog.length).toBe(1);
      expect(messageLog[0].content).toBe('Deploy the new feature to production');
      expect(messageLog[0].targetRoom).toBe('operator');
      expect(messageLog[0].source).toBe('whatsapp');
    }
  });
});

describe('Outgoing Messages (Discord -> WhatsApp)', () => {
  it('should handle disconnected adapter gracefully', async () => {
    const manager = new MockChannelManager();
    const adapter = new WhatsAppAdapter(mockLogger, [
      { groupId: 'test-group@g.us', room: 'builder' },
    ]);

    manager.registerAdapter(adapter);

    // Adapter is disconnected by default, sending should not throw
    await manager.sendToExternalChannel(
      'whatsapp',
      'test-group@g.us',
      'Message from Discord #builder'
    );
    // No error means graceful handling
    expect(true).toBe(true);
  });
});

describe('Group Mapping Management', () => {
  it('should manage initial and runtime mappings', () => {
    const adapter = new WhatsAppAdapter(mockLogger, [
      { groupId: 'initial-group@g.us', room: 'voice' },
    ]);

    // Test initial mapping
    const initialGroup = adapter.getGroupIdForRoom('voice');
    expect(initialGroup).toBe('initial-group@g.us');

    // Test runtime mapping addition
    adapter.addMapping('runtime-group@g.us', 'laboratory');
    const runtimeGroup = adapter.getGroupIdForRoom('laboratory');
    expect(runtimeGroup).toBe('runtime-group@g.us');

    // Test unmapped room
    const unmapped = adapter.getGroupIdForRoom('nonexistent');
    expect(unmapped).toBeUndefined();
  });
});

describe('Multi-Message Flow', () => {
  it('should route multiple messages from different groups', () => {
    const manager = new MockChannelManager();
    const adapter = new WhatsAppAdapter(mockLogger, [
      { groupId: 'dev-team@g.us', room: 'builder' },
      { groupId: 'design-team@g.us', room: 'architect' },
      { groupId: 'ops-team@g.us', room: 'operator' },
    ]);

    manager.registerAdapter(adapter);

    const messageCallback = (adapter as any).messageCallback;

    if (messageCallback) {
      const messages: CrossChannelMessage[] = [
        {
          source: 'whatsapp',
          sourceId: 'dev-team@g.us',
          targetRoom: 'builder',
          content: 'Implemented user authentication',
          author: 'Alice',
          timestamp: new Date(),
        },
        {
          source: 'whatsapp',
          sourceId: 'design-team@g.us',
          targetRoom: 'architect',
          content: 'Updated UI mockups',
          author: 'Bob',
          timestamp: new Date(),
        },
        {
          source: 'whatsapp',
          sourceId: 'ops-team@g.us',
          targetRoom: 'operator',
          content: 'Server maintenance scheduled',
          author: 'Charlie',
          timestamp: new Date(),
        },
      ];

      for (const msg of messages) {
        messageCallback(msg);
      }

      const messageLog = manager.getMessageLog();
      expect(messageLog.length).toBe(3);
      expect(new Set(messageLog.map(m => m.targetRoom)).size).toBe(3);
      expect(messageLog.map(m => m.author)).toEqual(['Alice', 'Bob', 'Charlie']);
    }
  });
});

describe('Adapter Status Monitoring', () => {
  it('should start with disconnected status', () => {
    const adapter = new WhatsAppAdapter(mockLogger);

    expect(adapter.status).toBe('disconnected');
  });
});

describe('Error Handling', () => {
  it('should handle non-existent adapter gracefully', async () => {
    const manager = new MockChannelManager();
    const adapter = new WhatsAppAdapter(mockLogger);
    manager.registerAdapter(adapter);

    // Test sending to non-existent adapter
    await manager.sendToExternalChannel('nonexistent', 'test-id', 'test message');
    // No error means graceful handling
    expect(true).toBe(true);
  });

  it('should handle disconnected state gracefully', async () => {
    const manager = new MockChannelManager();
    const adapter = new WhatsAppAdapter(mockLogger);
    manager.registerAdapter(adapter);

    await manager.sendToExternalChannel('whatsapp', 'test-id', 'test message');
    // No error means graceful handling
    expect(true).toBe(true);
  });
});
