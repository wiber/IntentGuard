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
import type { Logger } from '../types.js';
export interface PlaygroundBotConfig {
    enabled: boolean;
    port: number;
    host: string;
    autoStart: boolean;
    syncWithDiscord: boolean;
    corsOrigins?: string[];
}
export interface PlaygroundStatus {
    running: boolean;
    uptime?: number;
    port?: number;
    url?: string;
    gridState?: Record<string, number>;
    lastSync?: string;
}
export declare class TesseractPlaygroundBot {
    private playground;
    private config;
    private logger;
    private startTime;
    private lastSync;
    private syncInterval;
    constructor(logger: Logger, config?: Partial<PlaygroundBotConfig>);
    /**
     * Start the playground server
     */
    start(): Promise<void>;
    /**
     * Stop the playground server
     */
    stop(): Promise<void>;
    /**
     * Get current playground status
     */
    getStatus(): Promise<PlaygroundStatus>;
    /**
     * Start periodic grid state synchronization
     */
    private startGridSync;
    /**
     * Wire grid event bridge to log playground events
     */
    private wireGridEvents;
    /**
     * Format status for Discord display
     */
    formatStatusMessage(): string;
    /**
     * Check if the playground is running
     */
    isRunning(): boolean;
    /**
     * Get the playground URL
     */
    getUrl(): string | null;
    /**
     * Get the API base URL
     */
    getApiUrl(): string | null;
}
export default TesseractPlaygroundBot;
//# sourceMappingURL=tesseract-playground-bot.d.ts.map