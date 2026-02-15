/**
 * src/channels/cross-channel-example.ts — Example Integration
 *
 * Shows how to wire WhatsApp and Telegram adapters to ChannelManager
 * for cross-channel routing between Discord, WhatsApp, and Telegram.
 *
 * Usage in main bot file:
 *   import { setupCrossChannelRouting } from './channels/cross-channel-example.js';
 *   await setupCrossChannelRouting(client, channelManager, log);
 */

import type { Client } from 'discord.js';
import type { Logger } from '../types.js';
import type { ChannelManager } from '../discord/channel-manager.js';
import { WhatsAppAdapter } from './whatsapp-adapter.js';
import { TelegramAdapter } from './telegram-adapter.js';

export async function setupCrossChannelRouting(
  client: Client,
  channelManager: ChannelManager,
  log: Logger,
): Promise<void> {
  log.info('Setting up cross-channel routing...');

  // ───────────────────────────────────────────────────────────────
  // 1. WhatsApp Adapter
  // ───────────────────────────────────────────────────────────────

  const whatsappMappings = [
    { groupId: 'YOUR_WHATSAPP_GROUP_ID@g.us', room: 'builder' },
    { groupId: 'ANOTHER_GROUP_ID@g.us', room: 'architect' },
  ];

  const whatsappAdapter = new WhatsAppAdapter(log, whatsappMappings);

  try {
    await whatsappAdapter.initialize();
    channelManager.registerAdapter(whatsappAdapter);
    log.info('WhatsApp adapter registered successfully');
  } catch (err) {
    log.error(`WhatsApp adapter failed to initialize: ${err}`);
  }

  // ───────────────────────────────────────────────────────────────
  // 2. Telegram Adapter
  // ───────────────────────────────────────────────────────────────

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!telegramToken) {
    log.warn('TELEGRAM_BOT_TOKEN not set, skipping Telegram adapter');
  } else {
    const telegramMappings = [
      { groupId: '-1001234567890', room: 'operator' },
      { groupId: '-1009876543210', room: 'vault' },
    ];

    const telegramAdapter = new TelegramAdapter(log, telegramToken, telegramMappings);

    try {
      await telegramAdapter.initialize();
      channelManager.registerAdapter(telegramAdapter);
      log.info('Telegram adapter registered successfully');
    } catch (err) {
      log.error(`Telegram adapter failed to initialize: ${err}`);
    }
  }

  // ───────────────────────────────────────────────────────────────
  // 3. Bidirectional Message Handler (Discord → External)
  // ───────────────────────────────────────────────────────────────

  // When a message is sent in a Discord room, optionally forward it
  // to the corresponding WhatsApp/Telegram group.
  //
  // This would be hooked into your Discord message handler, e.g.:
  //
  // client.on('messageCreate', async (message) => {
  //   const room = channelManager.getRoomForChannel(message.channelId);
  //   if (room) {
  //     await forwardToExternalChannels(room, message.content, message.author.username);
  //   }
  // });

  const forwardToExternalChannels = async (
    room: string,
    content: string,
    author: string,
  ): Promise<void> => {
    const formattedContent = `[Discord] ${author}: ${content}`;

    // Forward to WhatsApp
    const whatsappGroupId = whatsappAdapter.getGroupIdForRoom(room);
    if (whatsappGroupId && whatsappAdapter.status === 'connected') {
      await channelManager.sendToExternalChannel('whatsapp', whatsappGroupId, formattedContent);
    }

    // Forward to Telegram
    const adapters = channelManager.getAdapters();
    const telegramAdapter = adapters.get('telegram') as TelegramAdapter | undefined;
    if (telegramAdapter) {
      const telegramGroupId = telegramAdapter.getGroupIdForRoom(room);
      if (telegramGroupId && telegramAdapter.status === 'connected') {
        await channelManager.sendToExternalChannel('telegram', telegramGroupId, formattedContent);
      }
    }
  };

  // Export for use in Discord message handlers
  (channelManager as any).forwardToExternalChannels = forwardToExternalChannels;

  log.info('Cross-channel routing setup complete');
}

// ═══════════════════════════════════════════════════════════════
// Runtime Mapping Management
// ═══════════════════════════════════════════════════════════════

/**
 * Add a new WhatsApp group mapping at runtime.
 * Useful for Discord commands like: !map-whatsapp <groupId> <room>
 */
export function addWhatsAppMapping(
  channelManager: ChannelManager,
  groupId: string,
  room: string,
): void {
  const adapters = channelManager.getAdapters();
  const whatsappAdapter = adapters.get('whatsapp') as WhatsAppAdapter | undefined;

  if (!whatsappAdapter) {
    throw new Error('WhatsApp adapter not registered');
  }

  whatsappAdapter.addMapping(groupId, room);
}

/**
 * Add a new Telegram group mapping at runtime.
 * Useful for Discord commands like: !map-telegram <groupId> <room>
 */
export function addTelegramMapping(
  channelManager: ChannelManager,
  groupId: string,
  room: string,
): void {
  const adapters = channelManager.getAdapters();
  const telegramAdapter = adapters.get('telegram') as TelegramAdapter | undefined;

  if (!telegramAdapter) {
    throw new Error('Telegram adapter not registered');
  }

  telegramAdapter.addMapping(groupId, room);
}
