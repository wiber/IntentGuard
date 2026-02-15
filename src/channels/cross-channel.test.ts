/**
 * src/channels/cross-channel.test.ts — Cross-Channel Routing Tests
 *
 * Tests Discord message routing through cognitive rooms with mocked external APIs.
 */

import { describe, it, expect } from 'vitest';
import { MessageRouter } from './router.js';
import type { CrossChannelMessage, ChannelAdapter, ChannelRoutingRule } from './types.js';
import type { Logger } from '../types.js';

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
// Mock Discord Adapter
// ═══════════════════════════════════════════════════════════════

class MockDiscordAdapter implements ChannelAdapter {
  name = 'discord';
  status: 'connected' | 'disconnected' | 'qr-pending' | 'error' = 'connected';

  private messageCallback?: (message: CrossChannelMessage) => void;
  public sentMessages: Array<{ chatId: string; text: string }> = [];

  async initialize(): Promise<void> {
    this.status = 'connected';
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    this.sentMessages.push({ chatId, text });
  }

  onMessage(callback: (message: CrossChannelMessage) => void): void {
    this.messageCallback = callback;
  }

  // Test helper: simulate incoming message
  simulateIncomingMessage(message: CrossChannelMessage): void {
    if (this.messageCallback) {
      this.messageCallback(message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Mock WhatsApp Adapter
// ═══════════════════════════════════════════════════════════════

class MockWhatsAppAdapter implements ChannelAdapter {
  name = 'whatsapp';
  status: 'connected' | 'disconnected' | 'qr-pending' | 'error' = 'connected';

  private messageCallback?: (message: CrossChannelMessage) => void;
  public sentMessages: Array<{ chatId: string; text: string }> = [];

  async initialize(): Promise<void> {
    this.status = 'connected';
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    this.sentMessages.push({ chatId, text });
  }

  onMessage(callback: (message: CrossChannelMessage) => void): void {
    this.messageCallback = callback;
  }

  // Test helper: simulate incoming message
  simulateIncomingMessage(sourceId: string, content: string, author: string, targetRoom: string): void {
    if (this.messageCallback) {
      this.messageCallback({
        source: 'whatsapp',
        sourceId,
        targetRoom,
        content,
        author,
        timestamp: new Date(),
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Mock Channel Manager
// ═══════════════════════════════════════════════════════════════

class MockChannelManager {
  private router: MessageRouter;
  private adapters = new Map<string, ChannelAdapter>();
  private discordRooms = new Map<string, string[]>(); // room -> [channelIds]
  private roomMessages = new Map<string, string[]>(); // room -> [messages]

  constructor(router: MessageRouter) {
    this.router = router;

    // Initialize cognitive rooms
    const rooms = ['builder', 'architect', 'operator', 'vault', 'voice', 'laboratory', 'performer', 'navigator', 'network'];
    rooms.forEach(room => {
      this.discordRooms.set(room, [`discord-${room}-id`]);
      this.roomMessages.set(room, []);
    });
  }

  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.name, adapter);

    // Wire adapter messages to router
    adapter.onMessage((msg: CrossChannelMessage) => {
      const targetRoom = this.router.route(msg);
      if (targetRoom) {
        this.deliverToRoom(targetRoom, msg);
      }
    });
  }

  private deliverToRoom(room: string, message: CrossChannelMessage): void {
    const messages = this.roomMessages.get(room);
    if (messages) {
      const formatted = `[${message.source}] ${message.author}: ${message.content}`;
      messages.push(formatted);
    }
  }

  async sendFromRoomToExternal(room: string, content: string, author: string): Promise<void> {
    // Find all external channels that should receive this message
    const sources = this.router.getSourceIdsForRoom(room);

    for (const { adapter: adapterName, sourceId } of sources) {
      const adapter = this.adapters.get(adapterName);
      if (adapter && adapter.status === 'connected') {
        const transformed = this.router.transformMessage(
          {
            source: 'discord',
            sourceId: `discord-${room}-id`,
            targetRoom: room,
            content,
            author,
            timestamp: new Date(),
          },
          adapterName,
        );
        await adapter.sendMessage(sourceId, transformed);
      }
    }
  }

  getRoomMessages(room: string): string[] {
    return this.roomMessages.get(room) || [];
  }

  getAdapter(name: string): ChannelAdapter | undefined {
    return this.adapters.get(name);
  }
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('MessageRouter', () => {
  it('should configure basic rules', () => {
    const router = new MessageRouter(mockLogger);

    router.configure({
      rules: [
        { sourceId: 'test-group-1@g.us', adapter: 'whatsapp', targetRoom: 'builder' },
        { sourceId: 'test-group-2@g.us', adapter: 'whatsapp', targetRoom: 'architect' },
      ],
      defaultRoom: 'operator',
      bidirectional: true,
    });

    const rule = router.getRule('whatsapp', 'test-group-1@g.us');
    expect(rule).not.toBeNull();
    expect(rule!.targetRoom).toBe('builder');
    expect(router.isBidirectional()).toBe(true);
  });

  it('should route message to correct room', () => {
    const router = new MessageRouter(mockLogger);

    router.configure({
      rules: [
        { sourceId: 'builder-group@g.us', adapter: 'whatsapp', targetRoom: 'builder' },
      ],
    });

    const message: CrossChannelMessage = {
      source: 'whatsapp',
      sourceId: 'builder-group@g.us',
      targetRoom: '',
      content: 'Test message',
      author: 'TestUser',
      timestamp: new Date(),
    };

    const targetRoom = router.route(message);
    expect(targetRoom).toBe('builder');
  });

  it('should use default room when no rule matches', () => {
    const router = new MessageRouter(mockLogger);

    router.configure({
      rules: [],
      defaultRoom: 'operator',
    });

    const message: CrossChannelMessage = {
      source: 'whatsapp',
      sourceId: 'unknown-group@g.us',
      targetRoom: '',
      content: 'Test message',
      author: 'TestUser',
      timestamp: new Date(),
    };

    const targetRoom = router.route(message);
    expect(targetRoom).toBe('operator');
  });

  it('should return null when no route found', () => {
    const router = new MessageRouter(mockLogger);

    router.configure({
      rules: [],
    });

    const message: CrossChannelMessage = {
      source: 'whatsapp',
      sourceId: 'unknown-group@g.us',
      targetRoom: '',
      content: 'Test message',
      author: 'TestUser',
      timestamp: new Date(),
    };

    const targetRoom = router.route(message);
    expect(targetRoom).toBeNull();
  });

  it('should add and remove rules dynamically', () => {
    const router = new MessageRouter(mockLogger);

    router.addRule({ sourceId: 'test-1@g.us', adapter: 'whatsapp', targetRoom: 'vault' });

    const rule = router.getRule('whatsapp', 'test-1@g.us');
    expect(rule).not.toBeNull();
    expect(rule!.targetRoom).toBe('vault');

    const removed = router.removeRule('whatsapp', 'test-1@g.us');
    expect(removed).toBe(true);

    const removedRule = router.getRule('whatsapp', 'test-1@g.us');
    expect(removedRule).toBeNull();
  });

  it('should perform reverse lookup (room -> sourceId)', () => {
    const router = new MessageRouter(mockLogger);

    router.configure({
      rules: [
        { sourceId: 'group-1@g.us', adapter: 'whatsapp', targetRoom: 'builder' },
        { sourceId: 'group-2@g.us', adapter: 'whatsapp', targetRoom: 'architect' },
      ],
    });

    const sourceId = router.getSourceIdForRoom('whatsapp', 'builder');
    expect(sourceId).toBe('group-1@g.us');

    const sources = router.getSourceIdsForRoom('builder');
    expect(sources.length).toBe(1);
    expect(sources[0].adapter).toBe('whatsapp');
    expect(sources[0].sourceId).toBe('group-1@g.us');
  });

  it('should transform message for different adapters', () => {
    const router = new MessageRouter(mockLogger);

    const message: CrossChannelMessage = {
      source: 'whatsapp',
      sourceId: 'test@g.us',
      targetRoom: 'builder',
      content: 'Hello World',
      author: 'Alice',
      timestamp: new Date(),
    };

    const discordFormat = router.transformMessage(message, 'discord');
    expect(discordFormat).toContain('**[whatsapp] Alice:**');
    expect(discordFormat).toContain('Hello World');

    const whatsappFormat = router.transformMessage(message, 'whatsapp');
    expect(whatsappFormat).toContain('*[whatsapp] Alice:*');
    expect(whatsappFormat).toContain('Hello World');
  });
});

describe('Cross-channel routing', () => {
  it('should route WhatsApp -> Discord -> Room', async () => {
    const router = new MessageRouter(mockLogger);
    router.configure({
      rules: [
        { sourceId: 'builder-group@g.us', adapter: 'whatsapp', targetRoom: 'builder' },
      ],
    });

    const channelManager = new MockChannelManager(router);
    const whatsappAdapter = new MockWhatsAppAdapter();

    await whatsappAdapter.initialize();
    channelManager.registerAdapter(whatsappAdapter);

    // Simulate incoming WhatsApp message
    whatsappAdapter.simulateIncomingMessage(
      'builder-group@g.us',
      'Deploy the new feature!',
      'ProductManager',
      'builder',
    );

    // Verify message reached correct room
    const roomMessages = channelManager.getRoomMessages('builder');
    expect(roomMessages.length).toBe(1);
    expect(roomMessages[0]).toContain('[whatsapp]');
    expect(roomMessages[0]).toContain('ProductManager');
    expect(roomMessages[0]).toContain('Deploy the new feature!');
  });

  it('should handle Discord -> WhatsApp bidirectional', async () => {
    const router = new MessageRouter(mockLogger);
    router.configure({
      rules: [
        { sourceId: 'builder-group@g.us', adapter: 'whatsapp', targetRoom: 'builder', bidirectional: true },
      ],
      bidirectional: true,
    });

    const channelManager = new MockChannelManager(router);
    const whatsappAdapter = new MockWhatsAppAdapter();

    await whatsappAdapter.initialize();
    channelManager.registerAdapter(whatsappAdapter);

    // Send message from Discord room to WhatsApp
    await channelManager.sendFromRoomToExternal('builder', 'Feature deployed!', 'EngineerBot');

    // Verify message was sent via WhatsApp adapter
    expect(whatsappAdapter.sentMessages.length).toBe(1);
    expect(whatsappAdapter.sentMessages[0].chatId).toBe('builder-group@g.us');
    expect(whatsappAdapter.sentMessages[0].text).toContain('Feature deployed!');
  });

  it('should handle multiple adapters to same room', async () => {
    const router = new MessageRouter(mockLogger);
    router.configure({
      rules: [
        { sourceId: 'builder-whatsapp@g.us', adapter: 'whatsapp', targetRoom: 'builder' },
        { sourceId: 'builder-discord-123', adapter: 'discord', targetRoom: 'builder' },
      ],
    });

    const channelManager = new MockChannelManager(router);
    const whatsappAdapter = new MockWhatsAppAdapter();
    const discordAdapter = new MockDiscordAdapter();

    await whatsappAdapter.initialize();
    await discordAdapter.initialize();
    channelManager.registerAdapter(whatsappAdapter);
    channelManager.registerAdapter(discordAdapter);

    // Send messages from both sources
    whatsappAdapter.simulateIncomingMessage('builder-whatsapp@g.us', 'From WhatsApp', 'Alice', 'builder');
    discordAdapter.simulateIncomingMessage({
      source: 'discord',
      sourceId: 'builder-discord-123',
      targetRoom: 'builder',
      content: 'From Discord',
      author: 'Bob',
      timestamp: new Date(),
    });

    // Both messages should reach the same room
    const roomMessages = channelManager.getRoomMessages('builder');
    expect(roomMessages.length).toBe(2);
    expect(roomMessages[0]).toContain('[whatsapp]');
    expect(roomMessages[0]).toContain('Alice');
    expect(roomMessages[1]).toContain('[discord]');
    expect(roomMessages[1]).toContain('Bob');
  });

  it('should handle message routing with targetRoom override', () => {
    const router = new MessageRouter(mockLogger);
    router.configure({
      rules: [
        { sourceId: 'test@g.us', adapter: 'whatsapp', targetRoom: 'builder' },
      ],
    });

    // Message with explicit targetRoom should override routing rule
    const message: CrossChannelMessage = {
      source: 'whatsapp',
      sourceId: 'test@g.us',
      targetRoom: 'architect', // Override
      content: 'Test',
      author: 'User',
      timestamp: new Date(),
    };

    const targetRoom = router.route(message);
    expect(targetRoom).toBe('architect');
  });

  it('should respect adapter status for message sending', async () => {
    const router = new MessageRouter(mockLogger);
    router.configure({
      rules: [
        { sourceId: 'test@g.us', adapter: 'whatsapp', targetRoom: 'builder' },
      ],
      bidirectional: true,
    });

    const channelManager = new MockChannelManager(router);
    const whatsappAdapter = new MockWhatsAppAdapter();

    await whatsappAdapter.initialize();
    channelManager.registerAdapter(whatsappAdapter);

    // Disconnect adapter
    whatsappAdapter.status = 'disconnected';

    // Try to send message
    await channelManager.sendFromRoomToExternal('builder', 'Test message', 'Bot');

    // Message should not be sent when adapter is disconnected
    expect(whatsappAdapter.sentMessages.length).toBe(0);
  });
});
