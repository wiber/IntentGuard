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
import { gridEventBridge } from '../grid/event-bridge.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

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

function loadConfigFromEnv(): Partial<PlaygroundConfig> {
  return {
    port: parseInt(process.env.TESSERACT_PLAYGROUND_PORT || '3456'),
    host: process.env.TESSERACT_PLAYGROUND_HOST || '0.0.0.0',
    corsOrigins: process.env.TESSERACT_PLAYGROUND_CORS?.split(',') || ['*'],
    rateLimit: {
      enabled: process.env.TESSERACT_PLAYGROUND_RATE_LIMIT !== 'false',
      maxRequestsPerMinute: parseInt(process.env.TESSERACT_PLAYGROUND_RATE_LIMIT_MAX || '60'),
    },
    authentication: {
      enabled: process.env.TESSERACT_PLAYGROUND_AUTH === 'true',
      apiKeys: process.env.TESSERACT_PLAYGROUND_API_KEYS?.split(','),
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Playground Manager
// ═══════════════════════════════════════════════════════════════

export class PlaygroundManager {
  private playground: TesseractPlayground | null = null;
  private config: PlaygroundIntegrationConfig;
  private eventListeners: Array<() => void> = [];

  constructor(config: Partial<PlaygroundIntegrationConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      autoStart: config.autoStart ?? true,
      port: config.port ?? 3456,
      host: config.host ?? '0.0.0.0',
      publicUrl: config.publicUrl,
      discordNotifications: {
        enabled: config.discordNotifications?.enabled ?? true,
        channelId: config.discordNotifications?.channelId,
      },
    };
  }

  /**
   * Initialize the playground (called by runtime.ts on startup)
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[PlaygroundManager] Playground is disabled via config');
      return;
    }

    if (this.config.autoStart) {
      await this.start();
    }

    // Subscribe to grid events to sync with playground
    this.setupEventSync();
  }

  /**
   * Start the playground server
   */
  async start(): Promise<void> {
    if (this.playground?.isRunning()) {
      throw new Error('Playground is already running');
    }

    const playgroundConfig = loadConfigFromEnv();
    this.playground = new TesseractPlayground(playgroundConfig);

    await this.playground.start();

    const url = this.getPlaygroundUrl();
    console.log(`[PlaygroundManager] Playground started at ${url}`);

    // Notify Discord if enabled
    if (this.config.discordNotifications.enabled) {
      await this.notifyDiscord(`🧊 Tesseract playground is now live at ${url}`);
    }
  }

  /**
   * Stop the playground server
   */
  async stop(): Promise<void> {
    if (!this.playground) {
      return;
    }

    await this.playground.stop();
    this.playground = null;

    console.log('[PlaygroundManager] Playground stopped');

    // Notify Discord if enabled
    if (this.config.discordNotifications.enabled) {
      await this.notifyDiscord('🧊 Tesseract playground has been stopped');
    }

    // Clean up event listeners
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
  }

  /**
   * Restart the playground server
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Get playground status
   */
  getStatus(): {
    running: boolean;
    url: string | null;
    config: PlaygroundIntegrationConfig;
  } {
    return {
      running: this.playground?.isRunning() ?? false,
      url: this.playground?.isRunning() ? this.getPlaygroundUrl() : null,
      config: this.config,
    };
  }

  /**
   * Get the public-facing playground URL
   */
  getPlaygroundUrl(): string {
    if (this.config.publicUrl) {
      return this.config.publicUrl;
    }

    const config = this.playground?.getConfig();
    if (!config) {
      return `http://${this.config.host}:${this.config.port}/playground`;
    }

    const host = config.host === '0.0.0.0' ? 'localhost' : config.host;
    return `http://${host}:${config.port}/playground`;
  }

  /**
   * Setup event synchronization from grid-event-bridge to playground
   */
  private setupEventSync(): void {
    // Subscribe to grid events
    const unsubscribe = gridEventBridge.subscribe(event => {
      console.log(`[PlaygroundManager] Grid event: ${event.type} in cell ${event.cell}`);
      // The event bridge already updates local state, which the playground API reads
      // No additional action needed here, but we log for visibility
    });

    this.eventListeners.push(unsubscribe);
  }

  /**
   * Notify Discord about playground status
   */
  private async notifyDiscord(message: string): Promise<void> {
    if (!this.config.discordNotifications.channelId) {
      return;
    }

    // This would integrate with the Discord client from runtime.ts
    // For now, we just log the message
    console.log(`[PlaygroundManager] Discord notification: ${message}`);

    // TODO: Import Discord client and send actual message
    // const channel = await client.channels.fetch(this.config.discordNotifications.channelId);
    // if (channel?.isTextBased()) {
    //   await channel.send(message);
    // }
  }
}

// ═══════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════

let playgroundManager: PlaygroundManager | null = null;

/**
 * Get or create the global playground manager
 */
export function getPlaygroundManager(config?: Partial<PlaygroundIntegrationConfig>): PlaygroundManager {
  if (!playgroundManager) {
    playgroundManager = new PlaygroundManager(config);
  }
  return playgroundManager;
}

/**
 * Initialize playground for runtime.ts
 */
export async function initializePlayground(config?: Partial<PlaygroundIntegrationConfig>): Promise<PlaygroundManager> {
  const manager = getPlaygroundManager(config);
  await manager.initialize();
  return manager;
}

// ═══════════════════════════════════════════════════════════════
// Discord Command Handlers
// ═══════════════════════════════════════════════════════════════

export interface PlaygroundCommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Handle !playground command
 */
export async function handlePlaygroundCommand(args: string[]): Promise<PlaygroundCommandResult> {
  const manager = getPlaygroundManager();
  const subcommand = args[0]?.toLowerCase();

  switch (subcommand) {
    case 'start':
      try {
        await manager.start();
        return {
          success: true,
          message: `✅ Playground started at ${manager.getPlaygroundUrl()}`,
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to start playground: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }

    case 'stop':
      try {
        await manager.stop();
        return {
          success: true,
          message: '✅ Playground stopped',
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to stop playground: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }

    case 'restart':
      try {
        await manager.restart();
        return {
          success: true,
          message: `✅ Playground restarted at ${manager.getPlaygroundUrl()}`,
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to restart playground: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }

    case 'status':
    case undefined:
      const status = manager.getStatus();
      return {
        success: true,
        message: status.running
          ? `🟢 Playground is running at ${status.url}`
          : '🔴 Playground is not running',
        data: status,
      };

    case 'url':
      const urlStatus = manager.getStatus();
      if (!urlStatus.running) {
        return {
          success: false,
          message: '❌ Playground is not running',
        };
      }
      return {
        success: true,
        message: `🔗 ${urlStatus.url}`,
      };

    default:
      return {
        success: false,
        message: `❌ Unknown subcommand: ${subcommand}. Available: start, stop, restart, status, url`,
      };
  }
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

export { TesseractPlayground, startPlaygroundServer };
export type { PlaygroundConfig };
