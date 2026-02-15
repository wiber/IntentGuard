/**
 * src/channels/types.ts — Channel Adapter Interface
 *
 * Defines the contract for cross-channel messaging adapters
 * (Discord, WhatsApp, Telegram) to integrate with channel-manager.
 */

export type ChannelStatus = 'connected' | 'disconnected' | 'qr-pending' | 'error';

export interface ChannelAdapter {
  /** Unique adapter name (e.g., 'whatsapp', 'telegram') */
  name: string;

  /** Current connection status */
  status: ChannelStatus;

  /** Initialize the adapter (connect to service, authenticate, etc.) */
  initialize(): Promise<void>;

  /** Send a message to a chat/channel */
  sendMessage(chatId: string, text: string): Promise<void>;

  /** Register a callback for incoming messages */
  onMessage(callback: (message: CrossChannelMessage) => void): void;

  /** Gracefully disconnect */
  disconnect?(): Promise<void>;
}

export interface CrossChannelMessage {
  /** Source adapter name (e.g., 'whatsapp', 'telegram', 'discord') */
  source: string;

  /** Source-specific chat/channel ID */
  sourceId: string;

  /** Target cognitive room (e.g., 'builder', 'architect') */
  targetRoom: string;

  /** Message content */
  content: string;

  /** Author username or display name */
  author: string;

  /** Message timestamp */
  timestamp: Date;

  /** Optional: source message ID for threading */
  sourceMessageId?: string;
}

export interface ChannelRoutingRule {
  /** Source chat ID (e.g., WhatsApp group ID) */
  sourceId: string;

  /** Adapter name */
  adapter: string;

  /** Target cognitive room */
  targetRoom: string;

  /** Optional: bidirectional (send responses back to source) */
  bidirectional?: boolean;
}
