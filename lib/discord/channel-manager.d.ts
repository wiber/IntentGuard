/**
 * src/discord/channel-manager.ts — Discord Channel ↔ Cognitive Room Mapping
 *
 * Ported from thetadrivencoach/openclaw/src/channel-manager.ts
 * Extended with #trust-debt-public for transparency engine.
 *
 * Creates/finds 10 Discord channels:
 *   9 cognitive rooms + 1 trust-debt-public
 */
import { Client } from 'discord.js';
import type { Logger } from '../types.js';
import type { ChannelAdapter, CrossChannelMessage } from '../channels/types.js';
export declare class ChannelManager {
    private client;
    private log;
    private contextDir;
    private mapFile;
    private channelToRoom;
    private roomToChannel;
    private trustDebtPublicChannelId;
    private tesseractNuChannelId;
    private xPostsChannelId;
    private opsBoardChannelId;
    private adapters;
    private messageHandlers;
    constructor(client: Client, log: Logger, rootDir: string);
    initialize(guildId: string, categoryName: string): Promise<void>;
    getRoomForChannel(channelId: string): string | null;
    getChannelForRoom(room: string): string | null;
    getTrustDebtPublicChannelId(): string | undefined;
    getTesseractNuChannelId(): string | undefined;
    getXPostsChannelId(): string | undefined;
    getOpsBoardChannelId(): string | undefined;
    isXPostsChannel(channelId: string): boolean;
    isOpsBoardChannel(channelId: string): boolean;
    isRoomChannel(channelId: string): boolean;
    getRooms(): string[];
    getRoomContext(room: string): string;
    updateRoomContext(room: string, output: string): void;
    clearRoomContext(room: string): void;
    private loadMap;
    private saveMap;
    /**
     * Register a channel adapter (WhatsApp, Telegram, etc.)
     * and wire it to receive messages from the corresponding room.
     */
    registerAdapter(adapter: ChannelAdapter): void;
    /**
     * Route a message from an external channel to a Discord cognitive room.
     * If a handler is registered, it gets the message first (e.g., orchestrator).
     */
    routeMessage(source: string, sourceId: string, content: string, author: string, targetRoom: string): void;
    /**
     * Send a message from Discord to an external channel (e.g., WhatsApp, Telegram).
     */
    sendToExternalChannel(adapterName: string, chatId: string, content: string): Promise<void>;
    /**
     * Register a custom message handler for a specific source.
     * Useful for orchestrator or other processing logic.
     */
    registerMessageHandler(source: string, handler: (msg: CrossChannelMessage) => void): void;
    /**
     * Get all registered adapters.
     */
    getAdapters(): Map<string, ChannelAdapter>;
    /**
     * Get adapter status summary for monitoring.
     */
    getAdapterStatus(): {
        name: string;
        status: string;
    }[];
}
//# sourceMappingURL=channel-manager.d.ts.map