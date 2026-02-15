/**
 * example-usage.ts — Usage examples for grid modules
 *
 * Demonstrates how to use the ASCII renderer and tesseract client
 * in Discord bot commands.
 */
import { type RecentEvent } from './index.js';
export declare function handleGridCommand(): Promise<string>;
export declare function handleGridEmbedCommand(recentEvents?: RecentEvent[]): Promise<import("./ascii-renderer.js").GridEmbed>;
export declare function recordBotAction(cellId: string, action: string, metadata?: Record<string, unknown>): Promise<boolean>;
export declare function ensureApiHealth(): Promise<boolean>;
export declare function handleCompleteGridInteraction(): Promise<{
    content: string;
    ephemeral: boolean;
    embeds?: undefined;
} | {
    content: string;
    embeds: import("./ascii-renderer.js").GridEmbed[];
    ephemeral?: undefined;
}>;
export declare function getCellPressure(cellId: string): Promise<number | null>;
export declare function recordBatchActions(): Promise<boolean>;
export declare function getGridStatusMessage(): Promise<string>;
//# sourceMappingURL=example-usage.d.ts.map