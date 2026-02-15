/**
 * src/discord/channel-manager.ts — Discord Channel ↔ Cognitive Room Mapping
 *
 * Ported from thetadrivencoach/openclaw/src/channel-manager.ts
 * Extended with #trust-debt-public for transparency engine.
 *
 * Creates/finds 10 Discord channels:
 *   9 cognitive rooms + 1 trust-debt-public
 */
import { ChannelType, } from 'discord.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
const ROOMS = [
    'builder', 'architect', 'operator', 'vault', 'voice',
    'laboratory', 'performer', 'navigator', 'network',
];
const ROOM_DESCRIPTIONS = {
    builder: 'Implementation & code generation (iTerm)',
    architect: 'Planning & architecture (VS Code)',
    operator: 'Operations & deployment (kitty)',
    vault: 'Security & secrets (WezTerm)',
    voice: 'Content & voice memos (Terminal)',
    laboratory: 'Experiments & research (Cursor)',
    performer: 'Delivery & performance (Terminal)',
    navigator: 'Exploration & browsing (rio)',
    network: 'Communication & messaging (Messages)',
};
const EXTRA_CHANNELS = [
    { name: 'trust-debt-public', description: 'Transparency Engine — public trust-debt reporting' },
    { name: 'tesseract-nu', description: 'tesseract.nu game updates — always-on ticker via OpenClaw' },
    { name: 'x-posts', description: 'Draft tweets — react 👍 to publish to X/Twitter via browser' },
    { name: 'ops-board', description: 'Live tesseract grid heatmap — company ops dashboard' },
];
const CONTEXT_MAX_LINES = 50;
export class ChannelManager {
    client;
    log;
    contextDir;
    mapFile;
    channelToRoom = new Map();
    roomToChannel = new Map();
    trustDebtPublicChannelId;
    tesseractNuChannelId;
    xPostsChannelId;
    opsBoardChannelId;
    // Cross-channel routing
    adapters = new Map();
    messageHandlers = new Map();
    constructor(client, log, rootDir) {
        this.client = client;
        this.log = log;
        this.contextDir = join(rootDir, 'data', 'room-context');
        this.mapFile = join(rootDir, 'data', 'channel-map.json');
        for (const dir of [join(rootDir, 'data'), this.contextDir]) {
            if (!existsSync(dir))
                mkdirSync(dir, { recursive: true });
        }
        this.loadMap();
    }
    async initialize(guildId, categoryName) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
            this.log.error(`Guild not found: ${guildId}`);
            return;
        }
        // Find or create category
        let category = guild.channels.cache.find(ch => ch.type === ChannelType.GuildCategory && ch.name === categoryName);
        if (!category) {
            this.log.info(`Creating category: ${categoryName}`);
            category = await guild.channels.create({
                name: categoryName, type: ChannelType.GuildCategory,
            });
        }
        // Create room channels
        for (const room of ROOMS) {
            let channel = guild.channels.cache.find(ch => ch.type === ChannelType.GuildText && ch.name === room && ch.parentId === category.id);
            if (!channel) {
                this.log.info(`Creating channel: #${room}`);
                channel = await guild.channels.create({
                    name: room, type: ChannelType.GuildText,
                    parent: category.id,
                    topic: ROOM_DESCRIPTIONS[room] || `Cognitive room: ${room}`,
                });
            }
            this.channelToRoom.set(channel.id, room);
            this.roomToChannel.set(room, channel.id);
        }
        // Create extra channels (trust-debt-public)
        for (const extra of EXTRA_CHANNELS) {
            let channel = guild.channels.cache.find(ch => ch.type === ChannelType.GuildText && ch.name === extra.name && ch.parentId === category.id);
            if (!channel) {
                this.log.info(`Creating channel: #${extra.name}`);
                channel = await guild.channels.create({
                    name: extra.name, type: ChannelType.GuildText,
                    parent: category.id, topic: extra.description,
                });
            }
            if (extra.name === 'trust-debt-public') {
                this.trustDebtPublicChannelId = channel.id;
            }
            if (extra.name === 'tesseract-nu') {
                this.tesseractNuChannelId = channel.id;
            }
            if (extra.name === 'x-posts') {
                this.xPostsChannelId = channel.id;
            }
            if (extra.name === 'ops-board') {
                this.opsBoardChannelId = channel.id;
            }
        }
        this.saveMap();
        this.log.info(`Channel manager initialized: ${ROOMS.length} rooms + ${EXTRA_CHANNELS.length} extra channels`);
    }
    getRoomForChannel(channelId) {
        return this.channelToRoom.get(channelId) || null;
    }
    getChannelForRoom(room) {
        return this.roomToChannel.get(room) || null;
    }
    getTrustDebtPublicChannelId() {
        return this.trustDebtPublicChannelId;
    }
    getTesseractNuChannelId() {
        return this.tesseractNuChannelId;
    }
    getXPostsChannelId() {
        return this.xPostsChannelId;
    }
    getOpsBoardChannelId() {
        return this.opsBoardChannelId;
    }
    isXPostsChannel(channelId) {
        return this.xPostsChannelId === channelId;
    }
    isOpsBoardChannel(channelId) {
        return this.opsBoardChannelId === channelId;
    }
    isRoomChannel(channelId) {
        return this.channelToRoom.has(channelId);
    }
    getRooms() { return [...ROOMS]; }
    getRoomContext(room) {
        const file = join(this.contextDir, `${room}.txt`);
        if (!existsSync(file))
            return '';
        try {
            return readFileSync(file, 'utf-8');
        }
        catch {
            return '';
        }
    }
    updateRoomContext(room, output) {
        const lines = output.split('\n').slice(-CONTEXT_MAX_LINES);
        try {
            writeFileSync(join(this.contextDir, `${room}.txt`), lines.join('\n'));
        }
        catch (err) {
            this.log.error(`Room context write failed: ${err}`);
        }
    }
    clearRoomContext(room) {
        try {
            writeFileSync(join(this.contextDir, `${room}.txt`), '');
        }
        catch { }
    }
    loadMap() {
        if (!existsSync(this.mapFile))
            return;
        try {
            const data = JSON.parse(readFileSync(this.mapFile, 'utf-8'));
            for (const entry of data) {
                this.channelToRoom.set(entry.channelId, entry.room);
                this.roomToChannel.set(entry.room, entry.channelId);
            }
        }
        catch { }
    }
    saveMap() {
        const data = [];
        for (const [channelId, room] of this.channelToRoom) {
            data.push({ channelId, room });
        }
        try {
            writeFileSync(this.mapFile, JSON.stringify(data, null, 2));
        }
        catch { }
    }
    // ═══════════════════════════════════════════════════════════════
    // Cross-Channel Routing
    // ═══════════════════════════════════════════════════════════════
    /**
     * Register a channel adapter (WhatsApp, Telegram, etc.)
     * and wire it to receive messages from the corresponding room.
     */
    registerAdapter(adapter) {
        this.adapters.set(adapter.name, adapter);
        this.log.info(`Adapter registered: ${adapter.name} (status: ${adapter.status})`);
        // Set up message forwarding from adapter -> Discord room
        adapter.onMessage((msg) => {
            this.routeMessage(msg.source, msg.sourceId, msg.content, msg.author, msg.targetRoom);
        });
    }
    /**
     * Route a message from an external channel to a Discord cognitive room.
     * If a handler is registered, it gets the message first (e.g., orchestrator).
     */
    routeMessage(source, sourceId, content, author, targetRoom) {
        this.log.info(`Routing ${source} message to #${targetRoom}: ${content.substring(0, 50)}...`);
        // Check if a message handler is registered for this source
        const handler = this.messageHandlers.get(source);
        if (handler) {
            handler({
                source,
                sourceId,
                targetRoom,
                content,
                author,
                timestamp: new Date(),
            });
            return;
        }
        // Default: forward to Discord channel
        const channelId = this.roomToChannel.get(targetRoom);
        if (!channelId) {
            this.log.warn(`No Discord channel mapped to room: ${targetRoom}`);
            return;
        }
        const channel = this.client.channels.cache.get(channelId);
        if (!channel) {
            this.log.warn(`Discord channel not found: ${channelId}`);
            return;
        }
        // Send message to Discord
        channel.send(`**[${source}]** ${author}: ${content}`).catch((err) => {
            this.log.error(`Failed to send cross-channel message to Discord: ${err}`);
        });
    }
    /**
     * Send a message from Discord to an external channel (e.g., WhatsApp, Telegram).
     */
    async sendToExternalChannel(adapterName, chatId, content) {
        const adapter = this.adapters.get(adapterName);
        if (!adapter) {
            this.log.warn(`Adapter not found: ${adapterName}`);
            return;
        }
        if (adapter.status !== 'connected') {
            this.log.warn(`Cannot send message, adapter ${adapterName} status: ${adapter.status}`);
            return;
        }
        try {
            await adapter.sendMessage(chatId, content);
            this.log.debug(`Message sent via ${adapterName} to ${chatId}`);
        }
        catch (err) {
            this.log.error(`Failed to send message via ${adapterName}: ${err}`);
        }
    }
    /**
     * Register a custom message handler for a specific source.
     * Useful for orchestrator or other processing logic.
     */
    registerMessageHandler(source, handler) {
        this.messageHandlers.set(source, handler);
        this.log.info(`Message handler registered for source: ${source}`);
    }
    /**
     * Get all registered adapters.
     */
    getAdapters() {
        return this.adapters;
    }
    /**
     * Get adapter status summary for monitoring.
     */
    getAdapterStatus() {
        const statuses = [];
        for (const [name, adapter] of this.adapters) {
            statuses.push({ name, status: adapter.status });
        }
        return statuses;
    }
}
//# sourceMappingURL=channel-manager.js.map