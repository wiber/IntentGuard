/**
 * src/channels/whatsapp-adapter.ts — WhatsApp Web.js Adapter
 *
 * Bridges WhatsApp groups to cognitive rooms via channel-manager.
 * Uses whatsapp-web.js with graceful fallback if not installed.
 */

import type { Logger } from '../types.js';
import type { ChannelAdapter, ChannelStatus, CrossChannelMessage } from './types.js';

type MessageCallback = (message: CrossChannelMessage) => void;

export class WhatsAppAdapter implements ChannelAdapter {
  name = 'whatsapp';
  status: ChannelStatus = 'disconnected';

  private log: Logger;
  private client: any; // whatsapp-web.js Client
  private messageCallback?: MessageCallback;
  private groupToRoomMap = new Map<string, string>();
  private roomToGroupMap = new Map<string, string>();

  constructor(log: Logger, groupMappings?: { groupId: string; room: string }[]) {
    this.log = log;

    // Initialize group mappings
    if (groupMappings) {
      for (const mapping of groupMappings) {
        this.groupToRoomMap.set(mapping.groupId, mapping.room);
        this.roomToGroupMap.set(mapping.room, mapping.groupId);
      }
    }
  }

  async initialize(): Promise<void> {
    try {
      // Dynamic import with fallback
      const { Client, LocalAuth } = await import('whatsapp-web.js').catch(() => {
        this.log.warn('whatsapp-web.js not installed, adapter running in stub mode');
        throw new Error('STUB_MODE');
      });

      this.status = 'qr-pending';

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'intentguard-whatsapp',
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      });

      // QR code event for initial authentication
      this.client.on('qr', (qr: string) => {
        this.log.info('WhatsApp QR code received, scan with your phone');
        this.log.info(`QR Code: ${qr}`);
        // TODO: Optionally generate QR code image and post to Discord
      });

      // Ready event
      this.client.on('ready', () => {
        this.status = 'connected';
        this.log.info('WhatsApp client ready');
      });

      // Disconnected event
      this.client.on('disconnected', (reason: string) => {
        this.status = 'disconnected';
        this.log.warn(`WhatsApp disconnected: ${reason}`);
      });

      // Message event
      this.client.on('message', async (msg: any) => {
        try {
          const chat = await msg.getChat();
          const contact = await msg.getContact();

          // Only process group messages
          if (!chat.isGroup) return;

          const groupId = chat.id._serialized;
          const targetRoom = this.groupToRoomMap.get(groupId);

          if (!targetRoom) {
            this.log.debug(`Ignoring message from unmapped WhatsApp group: ${chat.name}`);
            return;
          }

          // Forward to channel manager
          if (this.messageCallback) {
            this.messageCallback({
              source: 'whatsapp',
              sourceId: groupId,
              targetRoom,
              content: msg.body,
              author: contact.pushname || contact.number,
              timestamp: new Date(msg.timestamp * 1000),
              sourceMessageId: msg.id._serialized,
            });
          }
        } catch (err) {
          this.log.error(`WhatsApp message handler error: ${err}`);
        }
      });

      await this.client.initialize();

    } catch (err) {
      if ((err as Error).message === 'STUB_MODE') {
        this.status = 'disconnected';
        this.log.info('WhatsApp adapter initialized in stub mode (whatsapp-web.js not installed)');
      } else {
        this.status = 'error';
        this.log.error(`WhatsApp initialization failed: ${err}`);
        throw err;
      }
    }
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (this.status !== 'connected' || !this.client) {
      this.log.warn(`Cannot send WhatsApp message, status: ${this.status}`);
      return;
    }

    try {
      await this.client.sendMessage(chatId, text);
      this.log.debug(`WhatsApp message sent to ${chatId}`);
    } catch (err) {
      this.log.error(`WhatsApp sendMessage failed: ${err}`);
      throw err;
    }
  }

  onMessage(callback: MessageCallback): void {
    this.messageCallback = callback;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.status = 'disconnected';
      this.log.info('WhatsApp client disconnected');
    }
  }

  /** Add a group-to-room mapping at runtime */
  addMapping(groupId: string, room: string): void {
    this.groupToRoomMap.set(groupId, room);
    this.roomToGroupMap.set(room, groupId);
    this.log.info(`WhatsApp mapping added: ${groupId} -> #${room}`);
  }

  /** Get the group ID for a cognitive room */
  getGroupIdForRoom(room: string): string | undefined {
    return this.roomToGroupMap.get(room);
  }
}
