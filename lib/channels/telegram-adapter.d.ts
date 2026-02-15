/**
 * src/channels/telegram-adapter.ts — Telegram Bot API Adapter
 *
 * Bridges Telegram groups to cognitive rooms via channel-manager.
 * Uses node-telegram-bot-api with graceful fallback if not installed.
 */
import type { Logger } from '../types.js';
import type { ChannelAdapter, ChannelStatus, CrossChannelMessage } from './types.js';
type MessageCallback = (message: CrossChannelMessage) => void;
export declare class TelegramAdapter implements ChannelAdapter {
    name: string;
    status: ChannelStatus;
    private log;
    private bot;
    private messageCallback?;
    private groupToRoomMap;
    private roomToGroupMap;
    private botToken;
    constructor(log: Logger, botToken: string, groupMappings?: {
        groupId: string;
        room: string;
    }[]);
    initialize(): Promise<void>;
    sendMessage(chatId: string, text: string): Promise<void>;
    onMessage(callback: MessageCallback): void;
    disconnect(): Promise<void>;
    /** Add a group-to-room mapping at runtime */
    addMapping(groupId: string, room: string): void;
    /** Get the group ID for a cognitive room */
    getGroupIdForRoom(room: string): string | undefined;
    /** Send a message to a specific room's mapped Telegram group */
    sendToRoom(room: string, text: string): Promise<void>;
}
export {};
//# sourceMappingURL=telegram-adapter.d.ts.map