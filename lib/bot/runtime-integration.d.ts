/**
 * bot/runtime-integration.ts — Runtime Integration for Playground Bot
 * Phase: Phase 5 — Open Playground
 *
 * Provides helpers to integrate TesseractPlaygroundBot into the main runtime.
 * This module is imported by src/runtime.ts to wire up the playground server.
 */
import TesseractPlaygroundBot from './tesseract-playground-bot.js';
import type { Logger } from '../types.js';
import type { Message } from 'discord.js';
export interface PlaygroundBotIntegration {
    bot: TesseractPlaygroundBot;
    handleCommand: (message: Message, args: string[]) => Promise<void>;
}
/**
 * Create and initialize playground bot for runtime
 */
export declare function createPlaygroundBot(logger: Logger, config?: {
    enabled?: boolean;
    port?: number;
    host?: string;
    autoStart?: boolean;
    syncWithDiscord?: boolean;
}): PlaygroundBotIntegration;
/**
 * Auto-start playground bot if configured
 */
export declare function autoStartPlaygroundBot(bot: TesseractPlaygroundBot, logger: Logger): Promise<void>;
/**
 * Register cleanup handler for graceful shutdown
 */
export declare function registerPlaygroundBotCleanup(bot: TesseractPlaygroundBot, logger: Logger): void;
//# sourceMappingURL=runtime-integration.d.ts.map