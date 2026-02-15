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
export declare function setupCrossChannelRouting(client: Client, channelManager: ChannelManager, log: Logger): Promise<void>;
/**
 * Add a new WhatsApp group mapping at runtime.
 * Useful for Discord commands like: !map-whatsapp <groupId> <room>
 */
export declare function addWhatsAppMapping(channelManager: ChannelManager, groupId: string, room: string): void;
/**
 * Add a new Telegram group mapping at runtime.
 * Useful for Discord commands like: !map-telegram <groupId> <room>
 */
export declare function addTelegramMapping(channelManager: ChannelManager, groupId: string, room: string): void;
//# sourceMappingURL=cross-channel-example.d.ts.map