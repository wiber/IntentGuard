/**
 * src/channels/telegram-adapter.ts — Telegram Bot API Adapter
 *
 * Bridges Telegram groups to cognitive rooms via channel-manager.
 * Uses node-telegram-bot-api with graceful fallback if not installed.
 */
export class TelegramAdapter {
    name = 'telegram';
    status = 'disconnected';
    log;
    bot; // TelegramBot instance
    messageCallback;
    groupToRoomMap = new Map();
    roomToGroupMap = new Map();
    botToken;
    constructor(log, botToken, groupMappings) {
        this.log = log;
        this.botToken = botToken;
        // Initialize group mappings
        if (groupMappings) {
            for (const mapping of groupMappings) {
                this.groupToRoomMap.set(mapping.groupId, mapping.room);
                this.roomToGroupMap.set(mapping.room, mapping.groupId);
            }
        }
    }
    async initialize() {
        try {
            // Dynamic import with fallback
            const TelegramBot = await import('node-telegram-bot-api')
                .then((m) => m.default)
                .catch(() => {
                this.log.warn('node-telegram-bot-api not installed, adapter running in stub mode');
                throw new Error('STUB_MODE');
            });
            this.bot = new TelegramBot(this.botToken, { polling: true });
            // Ready event
            this.bot.on('polling_error', (error) => {
                this.log.error(`Telegram polling error: ${error.message}`);
                this.status = 'error';
            });
            // Message event
            this.bot.on('message', (msg) => {
                try {
                    // Only process group/supergroup messages
                    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
                        return;
                    }
                    const groupId = String(msg.chat.id);
                    const targetRoom = this.groupToRoomMap.get(groupId);
                    if (!targetRoom) {
                        this.log.debug(`Ignoring message from unmapped Telegram group: ${msg.chat.title}`);
                        return;
                    }
                    // Skip commands (starting with /)
                    if (msg.text && msg.text.startsWith('/')) {
                        return;
                    }
                    // Forward to channel manager
                    if (this.messageCallback && msg.text) {
                        this.messageCallback({
                            source: 'telegram',
                            sourceId: groupId,
                            targetRoom,
                            content: msg.text,
                            author: msg.from?.username || msg.from?.first_name || 'unknown',
                            timestamp: new Date(msg.date * 1000),
                            sourceMessageId: String(msg.message_id),
                        });
                    }
                }
                catch (err) {
                    this.log.error(`Telegram message handler error: ${err}`);
                }
            });
            // Get bot info to confirm connection
            const me = await this.bot.getMe();
            this.status = 'connected';
            this.log.info(`Telegram bot connected: @${me.username}`);
        }
        catch (err) {
            if (err.message === 'STUB_MODE') {
                this.status = 'disconnected';
                this.log.info('Telegram adapter initialized in stub mode (node-telegram-bot-api not installed)');
            }
            else {
                this.status = 'error';
                this.log.error(`Telegram initialization failed: ${err}`);
                throw err;
            }
        }
    }
    async sendMessage(chatId, text) {
        if (this.status !== 'connected' || !this.bot) {
            this.log.warn(`Cannot send Telegram message, status: ${this.status}`);
            return;
        }
        try {
            await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
            this.log.debug(`Telegram message sent to ${chatId}`);
        }
        catch (err) {
            this.log.error(`Telegram sendMessage failed: ${err}`);
            throw err;
        }
    }
    onMessage(callback) {
        this.messageCallback = callback;
    }
    async disconnect() {
        if (this.bot) {
            await this.bot.stopPolling();
            this.status = 'disconnected';
            this.log.info('Telegram bot disconnected');
        }
    }
    /** Add a group-to-room mapping at runtime */
    addMapping(groupId, room) {
        this.groupToRoomMap.set(groupId, room);
        this.roomToGroupMap.set(room, groupId);
        this.log.info(`Telegram mapping added: ${groupId} -> #${room}`);
    }
    /** Get the group ID for a cognitive room */
    getGroupIdForRoom(room) {
        return this.roomToGroupMap.get(room);
    }
    /** Send a message to a specific room's mapped Telegram group */
    async sendToRoom(room, text) {
        const groupId = this.roomToGroupMap.get(room);
        if (!groupId) {
            this.log.warn(`No Telegram group mapped to room: ${room}`);
            return;
        }
        await this.sendMessage(groupId, text);
    }
}
//# sourceMappingURL=telegram-adapter.js.map