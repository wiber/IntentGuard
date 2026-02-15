/**
 * bot/runtime-integration.ts — Runtime Integration for Playground Bot
 * Phase: Phase 5 — Open Playground
 *
 * Provides helpers to integrate TesseractPlaygroundBot into the main runtime.
 * This module is imported by src/runtime.ts to wire up the playground server.
 */
import TesseractPlaygroundBot from './tesseract-playground-bot.js';
/**
 * Create and initialize playground bot for runtime
 */
export function createPlaygroundBot(logger, config) {
    const bot = new TesseractPlaygroundBot(logger, config);
    /**
     * Handle Discord commands for playground management
     *
     * Commands:
     * - !playground status — Show playground status
     * - !playground start — Start the playground server
     * - !playground stop — Stop the playground server
     * - !playground restart — Restart the playground server
     * - !playground url — Get the playground URL
     */
    const handleCommand = async (message, args) => {
        const subcommand = args[0]?.toLowerCase() || 'status';
        switch (subcommand) {
            case 'status': {
                const statusMsg = bot.formatStatusMessage();
                await message.reply(statusMsg);
                break;
            }
            case 'start': {
                if (bot.isRunning()) {
                    await message.reply('🟡 Playground is already running');
                    return;
                }
                await message.reply('🚀 Starting tesseract.nu playground...');
                try {
                    await bot.start();
                    const url = bot.getUrl();
                    await message.reply(`✅ Playground started successfully!\n🔗 ${url || 'URL not available'}`);
                }
                catch (error) {
                    await message.reply(`❌ Failed to start playground: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
                break;
            }
            case 'stop': {
                if (!bot.isRunning()) {
                    await message.reply('🟡 Playground is not running');
                    return;
                }
                await message.reply('🛑 Stopping tesseract.nu playground...');
                try {
                    await bot.stop();
                    await message.reply('✅ Playground stopped');
                }
                catch (error) {
                    await message.reply(`❌ Failed to stop playground: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
                break;
            }
            case 'restart': {
                await message.reply('🔄 Restarting tesseract.nu playground...');
                try {
                    if (bot.isRunning()) {
                        await bot.stop();
                    }
                    await bot.start();
                    const url = bot.getUrl();
                    await message.reply(`✅ Playground restarted!\n🔗 ${url || 'URL not available'}`);
                }
                catch (error) {
                    await message.reply(`❌ Failed to restart playground: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
                break;
            }
            case 'url': {
                const url = bot.getUrl();
                const apiUrl = bot.getApiUrl();
                if (!url) {
                    await message.reply('❌ Playground is not running');
                    return;
                }
                await message.reply(`🔗 **Tesseract Playground URLs**\n` +
                    `Playground UI: ${url}\n` +
                    `API Endpoint: ${apiUrl}/grid/state\n` +
                    `Health Check: ${apiUrl}/health`);
                break;
            }
            case 'help':
            default: {
                await message.reply(`🧊 **Tesseract Playground Commands**\n\n` +
                    `\`!playground status\` — Show server status\n` +
                    `\`!playground start\` — Start the playground server\n` +
                    `\`!playground stop\` — Stop the playground server\n` +
                    `\`!playground restart\` — Restart the playground server\n` +
                    `\`!playground url\` — Get playground URLs\n` +
                    `\`!playground help\` — Show this help\n\n` +
                    `**About:**\n` +
                    `The tesseract.nu playground is a public HTTP API that exposes\n` +
                    `the bot's tesseract grid state. It provides a real-time web UI\n` +
                    `for visualizing grid cell pressures and allows external services\n` +
                    `to interact with the grid via REST API.`);
                break;
            }
        }
    };
    return { bot, handleCommand };
}
/**
 * Auto-start playground bot if configured
 */
export async function autoStartPlaygroundBot(bot, logger) {
    try {
        await bot.start();
        const url = bot.getUrl();
        logger.info(`[PlaygroundBot] Auto-started: ${url}`);
    }
    catch (error) {
        logger.error(`[PlaygroundBot] Auto-start failed: ${error}`);
    }
}
/**
 * Register cleanup handler for graceful shutdown
 */
export function registerPlaygroundBotCleanup(bot, logger) {
    const cleanup = async () => {
        logger.info('[PlaygroundBot] Shutting down...');
        await bot.stop();
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}
//# sourceMappingURL=runtime-integration.js.map