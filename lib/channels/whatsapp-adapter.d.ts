/**
 * src/channels/whatsapp-adapter.ts — WhatsApp Web.js Adapter
 *
 * Bridges WhatsApp groups to cognitive rooms via channel-manager.
 * Uses whatsapp-web.js with graceful fallback if not installed.
 */
import type { Logger } from '../types.js';
import type { ChannelAdapter, ChannelStatus, CrossChannelMessage } from './types.js';
type MessageCallback = (message: CrossChannelMessage) => void;
export declare class WhatsAppAdapter implements ChannelAdapter {
    name: string;
    status: ChannelStatus;
    private log;
    private client;
    private messageCallback?;
    private groupToRoomMap;
    private roomToGroupMap;
    constructor(log: Logger, groupMappings?: {
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
}
export {};
//# sourceMappingURL=whatsapp-adapter.d.ts.map