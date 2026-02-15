/**
 * src/discord/channel-manager.test.ts — Tests for Discord Channel Manager
 *
 * Tests channel creation, room mapping, cross-channel routing, and adapter integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChannelManager } from './channel-manager.js';
import { Client, Guild, ChannelType, Collection } from 'discord.js';
import type { Logger } from '../types.js';
import type { ChannelAdapter, CrossChannelMessage } from '../channels/types.js';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

// Mock logger
const mockLogger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Test data directory
const TEST_ROOT_DIR = join(process.cwd(), 'test-data-channel-manager');

describe('ChannelManager', () => {
  let channelManager: ChannelManager;
  let mockClient: Client;
  let mockGuild: Guild;

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(TEST_ROOT_DIR)) {
      rmSync(TEST_ROOT_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_ROOT_DIR, { recursive: true });

    // Reset mocks
    vi.clearAllMocks();

    // Create mock client
    mockClient = {
      guilds: {
        cache: new Map(),
      },
      channels: {
        cache: new Map(),
      },
    } as any;

    // Create mock guild
    mockGuild = {
      id: 'test-guild-id',
      channels: {
        cache: new Collection(),
        create: vi.fn().mockImplementation(async (options: any) => {
          const channel = {
            id: `channel-${Math.random().toString(36).substring(7)}`,
            name: options.name,
            type: options.type,
            parentId: options.parent,
            topic: options.topic,
            send: vi.fn().mockResolvedValue({}),
          };
          mockGuild.channels.cache.set(channel.id, channel as any);
          return channel;
        }),
      },
    } as any;

    mockClient.guilds.cache.set(mockGuild.id, mockGuild as any);

    channelManager = new ChannelManager(mockClient as any, mockLogger, TEST_ROOT_DIR);
  });

  describe('Initialization', () => {
    it('should create all 9 cognitive room channels', async () => {
      await channelManager.initialize(mockGuild.id, 'Cognitive Rooms');

      const rooms = channelManager.getRooms();
      expect(rooms).toHaveLength(9);
      expect(rooms).toContain('builder');
      expect(rooms).toContain('architect');
      expect(rooms).toContain('operator');
      expect(rooms).toContain('vault');
      expect(rooms).toContain('voice');
      expect(rooms).toContain('laboratory');
      expect(rooms).toContain('performer');
      expect(rooms).toContain('navigator');
      expect(rooms).toContain('network');
    });

    it('should create trust-debt-public channel', async () => {
      await channelManager.initialize(mockGuild.id, 'Cognitive Rooms');

      const channelId = channelManager.getTrustDebtPublicChannelId();
      expect(channelId).toBeDefined();
      expect(channelId).toBeTruthy();
    });

    it('should create x-posts channel', async () => {
      await channelManager.initialize(mockGuild.id, 'Cognitive Rooms');

      const channelId = channelManager.getXPostsChannelId();
      expect(channelId).toBeDefined();
      expect(channelId).toBeTruthy();
    });

    it('should create ops-board channel', async () => {
      await channelManager.initialize(mockGuild.id, 'Cognitive Rooms');

      const channelId = channelManager.getOpsBoardChannelId();
      expect(channelId).toBeDefined();
      expect(channelId).toBeTruthy();
    });

    it('should create tesseract-nu channel', async () => {
      await channelManager.initialize(mockGuild.id, 'Cognitive Rooms');

      const channelId = channelManager.getTesseractNuChannelId();
      expect(channelId).toBeDefined();
      expect(channelId).toBeTruthy();
    });

    it('should create category if it does not exist', async () => {
      await channelManager.initialize(mockGuild.id, 'New Category');

      expect(mockGuild.channels.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Category',
          type: ChannelType.GuildCategory,
        }),
      );
    });

    it('should log initialization success', async () => {
      await channelManager.initialize(mockGuild.id, 'Cognitive Rooms');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Channel manager initialized'),
      );
    });
  });

  describe('Room Mapping', () => {
    beforeEach(async () => {
      await channelManager.initialize(mockGuild.id, 'Cognitive Rooms');
    });

    it('should map channel ID to room name', () => {
      const builderChannelId = channelManager.getChannelForRoom('builder');
      expect(builderChannelId).toBeDefined();

      const room = channelManager.getRoomForChannel(builderChannelId!);
      expect(room).toBe('builder');
    });

    it('should return null for unknown channel ID', () => {
      const room = channelManager.getRoomForChannel('unknown-id');
      expect(room).toBeNull();
    });

    it('should return null for unknown room name', () => {
      const channelId = channelManager.getChannelForRoom('unknown-room');
      expect(channelId).toBeNull();
    });

    it('should identify room channels correctly', () => {
      const builderChannelId = channelManager.getChannelForRoom('builder');
      expect(channelManager.isRoomChannel(builderChannelId!)).toBe(true);
      expect(channelManager.isRoomChannel('random-id')).toBe(false);
    });

    it('should identify x-posts channel correctly', () => {
      const xPostsChannelId = channelManager.getXPostsChannelId();
      expect(channelManager.isXPostsChannel(xPostsChannelId!)).toBe(true);
      expect(channelManager.isXPostsChannel('random-id')).toBe(false);
    });

    it('should identify ops-board channel correctly', () => {
      const opsBoardChannelId = channelManager.getOpsBoardChannelId();
      expect(channelManager.isOpsBoardChannel(opsBoardChannelId!)).toBe(true);
      expect(channelManager.isOpsBoardChannel('random-id')).toBe(false);
    });
  });

  describe('Room Context Management', () => {
    beforeEach(async () => {
      await channelManager.initialize(mockGuild.id, 'Cognitive Rooms');
    });

    it('should update room context', () => {
      const testOutput = 'Test output line 1\nTest output line 2';
      channelManager.updateRoomContext('builder', testOutput);

      const context = channelManager.getRoomContext('builder');
      expect(context).toContain('Test output line 1');
      expect(context).toContain('Test output line 2');
    });

    it('should limit context to 50 lines', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`);
      channelManager.updateRoomContext('builder', lines.join('\n'));

      const context = channelManager.getRoomContext('builder');
      const contextLines = context.split('\n').filter(Boolean);
      expect(contextLines.length).toBeLessThanOrEqual(50);
      expect(context).toContain('Line 100'); // Should have last line
      // Lines 51-100 are retained (last 50 lines)
      expect(context).toContain('Line 51'); // Should have 51st line
    });

    it('should clear room context', () => {
      channelManager.updateRoomContext('builder', 'Test content');
      channelManager.clearRoomContext('builder');

      const context = channelManager.getRoomContext('builder');
      expect(context).toBe('');
    });

    it('should return empty string for nonexistent context', () => {
      const context = channelManager.getRoomContext('nonexistent-room');
      expect(context).toBe('');
    });
  });

  describe('Cross-Channel Routing', () => {
    let mockAdapter: ChannelAdapter;
    let onMessageCallback: ((msg: CrossChannelMessage) => void) | null = null;

    beforeEach(async () => {
      await channelManager.initialize(mockGuild.id, 'Cognitive Rooms');

      mockAdapter = {
        name: 'whatsapp',
        status: 'connected',
        initialize: vi.fn().mockResolvedValue(undefined),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        onMessage: vi.fn((callback) => {
          onMessageCallback = callback;
        }),
      };
    });

    it('should register adapter', () => {
      channelManager.registerAdapter(mockAdapter);

      const adapters = channelManager.getAdapters();
      expect(adapters.has('whatsapp')).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Adapter registered: whatsapp'),
      );
    });

    it('should route external message to Discord room', () => {
      channelManager.registerAdapter(mockAdapter);

      const builderChannelId = channelManager.getChannelForRoom('builder');
      const mockChannel = mockGuild.channels.cache.get(builderChannelId!) as any;

      // Wire the mock channel into the client's cache so routeMessage can find it
      mockClient.channels.cache.set(builderChannelId!, mockChannel);

      channelManager.routeMessage(
        'whatsapp',
        'test-chat-id',
        'Hello from WhatsApp',
        'John Doe',
        'builder',
      );

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.stringContaining('Hello from WhatsApp'),
      );
    });

    it('should send message to external adapter', async () => {
      channelManager.registerAdapter(mockAdapter);

      await channelManager.sendToExternalChannel(
        'whatsapp',
        'test-chat-id',
        'Hello from Discord',
      );

      expect(mockAdapter.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        'Hello from Discord',
      );
    });

    it('should not send if adapter not connected', async () => {
      mockAdapter.status = 'disconnected';
      channelManager.registerAdapter(mockAdapter);

      await channelManager.sendToExternalChannel(
        'whatsapp',
        'test-chat-id',
        'Hello',
      );

      expect(mockAdapter.sendMessage).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cannot send message'),
      );
    });

    it('should register custom message handler', () => {
      const customHandler = vi.fn();
      channelManager.registerMessageHandler('whatsapp', customHandler);

      channelManager.routeMessage(
        'whatsapp',
        'test-chat-id',
        'Test message',
        'John',
        'builder',
      );

      expect(customHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'whatsapp',
          content: 'Test message',
          author: 'John',
          targetRoom: 'builder',
        }),
      );
    });

    it('should return adapter status summary', () => {
      channelManager.registerAdapter(mockAdapter);

      const statuses = channelManager.getAdapterStatus();
      expect(statuses).toHaveLength(1);
      expect(statuses[0]).toEqual({
        name: 'whatsapp',
        status: 'connected',
      });
    });

    it('should wire adapter onMessage to routeMessage', () => {
      channelManager.registerAdapter(mockAdapter);

      const builderChannelId = channelManager.getChannelForRoom('builder');
      const mockChannel = mockGuild.channels.cache.get(builderChannelId!) as any;

      // Wire the mock channel into the client's cache so routeMessage can find it
      mockClient.channels.cache.set(builderChannelId!, mockChannel);

      // Simulate incoming message from adapter
      if (onMessageCallback) {
        onMessageCallback({
          source: 'whatsapp',
          sourceId: 'chat-123',
          targetRoom: 'builder',
          content: 'External message',
          author: 'Alice',
          timestamp: new Date(),
        });
      }

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.stringContaining('External message'),
      );
    });
  });

  describe('Persistence', () => {
    it('should persist channel-to-room mapping to disk', async () => {
      await channelManager.initialize(mockGuild.id, 'Cognitive Rooms');

      // Create new manager instance - should load from disk
      const newManager = new ChannelManager(mockClient as any, mockLogger, TEST_ROOT_DIR);

      const rooms = newManager.getRooms();
      expect(rooms).toHaveLength(9);
    });
  });

  describe('Error Handling', () => {
    it('should handle guild not found gracefully', async () => {
      await channelManager.initialize('nonexistent-guild', 'Cognitive Rooms');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Guild not found'),
      );
    });

    it('should handle missing adapter gracefully', async () => {
      await channelManager.sendToExternalChannel(
        'nonexistent-adapter',
        'chat-id',
        'Hello',
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Adapter not found'),
      );
    });

    it('should handle routing to unknown room', () => {
      channelManager.routeMessage(
        'whatsapp',
        'chat-id',
        'Hello',
        'John',
        'unknown-room',
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No Discord channel mapped to room'),
      );
    });
  });
});
