/**
 * playground-integration.ts — Integration of Tesseract Playground into Bot Runtime
 * Phase: Phase 5 — Open Playground
 *
 * Wires the playground server into the IntentGuard runtime:
 * - Automatically starts playground server when bot starts
 * - Syncs grid state from local event bridge to playground
 * - Provides Discord commands to control playground
 * - Reports playground status to #trust-debt-public
 */
import { TesseractPlayground, type PlaygroundConfig, startPlaygroundServer } from './tesseract-playground.js';
export interface PlaygroundIntegrationConfig {
    enabled: boolean;
    autoStart: boolean;
    port: number;
    host: string;
    publicUrl?: string;
    discordNotifications: {
        enabled: boolean;
        channelId?: string;
    };
}
export declare class PlaygroundManager {
    private playground;
    private config;
    private eventListeners;
    constructor(config?: Partial<PlaygroundIntegrationConfig>);
    /**
     * Initialize the playground (called by runtime.ts on startup)
     */
    initialize(): Promise<void>;
    /**
     * Start the playground server
     */
    start(): Promise<void>;
    /**
     * Stop the playground server
     */
    stop(): Promise<void>;
    /**
     * Restart the playground server
     */
    restart(): Promise<void>;
    /**
     * Get playground status
     */
    getStatus(): {
        running: boolean;
        url: string | null;
        config: PlaygroundIntegrationConfig;
    };
    /**
     * Get the public-facing playground URL
     */
    getPlaygroundUrl(): string;
    /**
     * Setup event synchronization from grid-event-bridge to playground
     */
    private setupEventSync;
    /**
     * Notify Discord about playground status
     */
    private notifyDiscord;
}
/**
 * Get or create the global playground manager
 */
export declare function getPlaygroundManager(config?: Partial<PlaygroundIntegrationConfig>): PlaygroundManager;
/**
 * Initialize playground for runtime.ts
 */
export declare function initializePlayground(config?: Partial<PlaygroundIntegrationConfig>): Promise<PlaygroundManager>;
export interface PlaygroundCommandResult {
    success: boolean;
    message: string;
    data?: unknown;
}
/**
 * Handle !playground command
 */
export declare function handlePlaygroundCommand(args: string[]): Promise<PlaygroundCommandResult>;
export { TesseractPlayground, startPlaygroundServer };
export type { PlaygroundConfig };
//# sourceMappingURL=playground-integration.d.ts.map