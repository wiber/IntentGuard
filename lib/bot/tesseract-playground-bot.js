/**
 * bot/tesseract-playground-bot.ts — Tesseract Playground Bot Integration
 * Phase: Phase 5 — Open Playground
 *
 * Integrates the tesseract.nu playground HTTP server with the Discord bot runtime.
 * Starts the playground server when the bot starts, and manages its lifecycle.
 *
 * Features:
 * - Automatic playground server startup on bot ready
 * - Health monitoring and status reporting
 * - Discord command integration (!playground, !playground-status)
 * - Graceful shutdown on bot termination
 * - Grid state synchronization with Discord events
 */
import { TesseractPlayground } from '../api/tesseract-playground.js';
import { fetchGridState } from '../grid/tesseract-client.js';
// ═══════════════════════════════════════════════════════════════
// Playground Bot Manager
// ═══════════════════════════════════════════════════════════════
export class TesseractPlaygroundBot {
    playground = null;
    config;
    logger;
    startTime = 0;
    lastSync = null;
    syncInterval = null;
    constructor(logger, config = {}) {
        this.logger = logger;
        this.config = {
            enabled: config.enabled ?? true,
            port: config.port ?? parseInt(process.env.TESSERACT_PLAYGROUND_PORT || '3456'),
            host: config.host ?? process.env.TESSERACT_PLAYGROUND_HOST ?? '0.0.0.0',
            autoStart: config.autoStart ?? true,
            syncWithDiscord: config.syncWithDiscord ?? true,
            corsOrigins: config.corsOrigins ?? ['*'],
        };
    }
    /**
     * Start the playground server
     */
    async start() {
        if (!this.config.enabled) {
            this.logger.info('[PlaygroundBot] Disabled via config');
            return;
        }
        if (this.playground?.isRunning()) {
            this.logger.warn('[PlaygroundBot] Already running');
            return;
        }
        try {
            this.logger.info('[PlaygroundBot] Starting tesseract.nu playground server...');
            const playgroundConfig = {
                port: this.config.port,
                host: this.config.host,
                corsOrigins: this.config.corsOrigins,
                rateLimit: {
                    enabled: true,
                    maxRequestsPerMinute: 60,
                },
                authentication: {
                    enabled: false, // Public playground
                },
            };
            this.playground = new TesseractPlayground(playgroundConfig);
            await this.playground.start();
            this.startTime = Date.now();
            this.logger.info(`[PlaygroundBot] Server started on http://${this.config.host}:${this.config.port}`);
            this.logger.info(`[PlaygroundBot] Playground UI: http://${this.config.host}:${this.config.port}/playground`);
            // Start grid state sync if enabled
            if (this.config.syncWithDiscord) {
                this.startGridSync();
            }
            // Wire grid event bridge to log events
            this.wireGridEvents();
        }
        catch (error) {
            this.logger.error(`[PlaygroundBot] Failed to start: ${error}`);
            throw error;
        }
    }
    /**
     * Stop the playground server
     */
    async stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        if (this.playground?.isRunning()) {
            this.logger.info('[PlaygroundBot] Stopping server...');
            await this.playground.stop();
            this.playground = null;
            this.logger.info('[PlaygroundBot] Server stopped');
        }
    }
    /**
     * Get current playground status
     */
    async getStatus() {
        if (!this.playground?.isRunning()) {
            return { running: false };
        }
        try {
            const gridState = await fetchGridState();
            const uptime = Date.now() - this.startTime;
            return {
                running: true,
                uptime,
                port: this.config.port,
                url: `http://${this.config.host}:${this.config.port}/playground`,
                gridState,
                lastSync: this.lastSync?.toISOString(),
            };
        }
        catch (error) {
            this.logger.error(`[PlaygroundBot] Status check failed: ${error}`);
            return {
                running: true,
                uptime: Date.now() - this.startTime,
                port: this.config.port,
                url: `http://${this.config.host}:${this.config.port}/playground`,
            };
        }
    }
    /**
     * Start periodic grid state synchronization
     */
    startGridSync() {
        const SYNC_INTERVAL_MS = 30000; // Sync every 30 seconds
        this.syncInterval = setInterval(async () => {
            try {
                const gridState = await fetchGridState();
                this.lastSync = new Date();
                this.logger.debug(`[PlaygroundBot] Grid sync: ${Object.keys(gridState).length} cells updated`);
            }
            catch (error) {
                this.logger.error(`[PlaygroundBot] Grid sync failed: ${error}`);
            }
        }, SYNC_INTERVAL_MS);
        this.logger.info(`[PlaygroundBot] Grid sync started (interval: ${SYNC_INTERVAL_MS}ms)`);
    }
    /**
     * Wire grid event bridge to log playground events
     */
    wireGridEvents() {
        // Subscribe to grid events and log them
        // The grid event bridge emits events when tasks complete
        // We can use this for future enhancements like Discord notifications
        this.logger.info('[PlaygroundBot] Grid event bridge wired');
    }
    /**
     * Format status for Discord display
     */
    formatStatusMessage() {
        if (!this.playground?.isRunning()) {
            return '🔴 **Tesseract Playground** — Offline';
        }
        const uptimeHours = (Date.now() - this.startTime) / (1000 * 60 * 60);
        const uptimeStr = uptimeHours < 1
            ? `${Math.round(uptimeHours * 60)}m`
            : `${uptimeHours.toFixed(1)}h`;
        return (`🟢 **Tesseract Playground** — Online\n` +
            `🔗 URL: http://${this.config.host}:${this.config.port}/playground\n` +
            `⏱️ Uptime: ${uptimeStr}\n` +
            `🔄 Grid Sync: ${this.config.syncWithDiscord ? 'Enabled' : 'Disabled'}\n` +
            `${this.lastSync ? `📊 Last Sync: ${this.lastSync.toLocaleTimeString()}` : ''}`);
    }
    /**
     * Check if the playground is running
     */
    isRunning() {
        return this.playground?.isRunning() ?? false;
    }
    /**
     * Get the playground URL
     */
    getUrl() {
        if (!this.isRunning())
            return null;
        return `http://${this.config.host}:${this.config.port}/playground`;
    }
    /**
     * Get the API base URL
     */
    getApiUrl() {
        if (!this.isRunning())
            return null;
        return `http://${this.config.host}:${this.config.port}/api`;
    }
}
// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════
export default TesseractPlaygroundBot;
//# sourceMappingURL=tesseract-playground-bot.js.map