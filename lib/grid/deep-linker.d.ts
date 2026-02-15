/**
 * deep-linker.ts — Tesseract Deep Link Generator
 *
 * Generates deep links to tesseract.nu grid cells and Discord messages.
 * Enables direct navigation from events to visual grid representation.
 */
/**
 * DeepLinker — Generate links to tesseract.nu and Discord
 */
export declare class DeepLinker {
    private readonly tesseractBaseUrl;
    private readonly discordBaseUrl;
    constructor(tesseractBaseUrl?: string, discordBaseUrl?: string);
    /**
     * Generate tesseract.nu deep link with cell focus
     *
     * @param cell - Cell ID (e.g., 'A1', 'B2', 'C3')
     * @param context - Optional context string (will be URL encoded)
     * @returns Full tesseract.nu URL
     *
     * @example
     * generateDeepLink('A2', 'Task completed: Phase 0')
     * // Returns: https://tesseract.nu/grid?focus=A2&context=Task%20completed%3A%20Phase%200
     */
    generateDeepLink(cell: string, context?: string): string;
    /**
     * Generate Discord message link
     *
     * @param cell - Cell ID (for reference)
     * @param messageId - Discord message ID
     * @param channelId - Discord channel ID (optional, defaults to general)
     * @param guildId - Discord guild/server ID (optional)
     * @returns Full Discord message URL
     *
     * @example
     * generateDiscordLink('A2', '1234567890', '9876543210', '1111111111')
     * // Returns: https://discord.com/channels/1111111111/9876543210/1234567890
     */
    generateDiscordLink(cell: string, messageId?: string, channelId?: string, guildId?: string): string;
    /**
     * Generate multi-cell comparison link
     *
     * @param cells - Array of cell IDs
     * @param mode - Comparison mode ('overlay', 'split', 'sequence')
     * @returns Tesseract URL with multi-cell view
     *
     * @example
     * generateComparisonLink(['A1', 'B2', 'C3'], 'overlay')
     * // Returns: https://tesseract.nu/grid?compare=A1,B2,C3&mode=overlay
     */
    generateComparisonLink(cells: string[], mode?: 'overlay' | 'split' | 'sequence'): string;
    /**
     * Generate room-focused link (all cells in a room)
     *
     * @param room - Room name (e.g., '#legal-room', '#strategy-room')
     * @param highlight - Optional cell to highlight
     * @returns Tesseract URL with room view
     *
     * @example
     * generateRoomLink('#strategy-room', 'A2')
     * // Returns: https://tesseract.nu/grid?room=strategy-room&highlight=A2
     */
    generateRoomLink(room: string, highlight?: string): string;
    /**
     * Generate event timeline link
     *
     * @param cell - Cell ID
     * @param startTime - Start timestamp (ISO string or Date)
     * @param endTime - End timestamp (ISO string or Date)
     * @returns Tesseract URL with timeline view
     *
     * @example
     * generateTimelineLink('A2', '2026-02-14T00:00:00Z', '2026-02-14T23:59:59Z')
     * // Returns: https://tesseract.nu/grid?focus=A2&timeline=start-end
     */
    generateTimelineLink(cell: string, startTime: string | Date, endTime: string | Date): string;
    /**
     * Generate markdown link for documentation
     *
     * @param cell - Cell ID
     * @param label - Link label (defaults to cell ID)
     * @param context - Optional context
     * @returns Markdown formatted link
     *
     * @example
     * generateMarkdownLink('A2', 'Strategy Goal')
     * // Returns: [Strategy Goal](https://tesseract.nu/grid?focus=A2)
     */
    generateMarkdownLink(cell: string, label?: string, context?: string): string;
    /**
     * Parse tesseract.nu URL to extract cell and context
     *
     * @param url - Tesseract URL
     * @returns Parsed data or null if invalid
     *
     * @example
     * parseDeepLink('https://tesseract.nu/grid?focus=A2&context=Test')
     * // Returns: { cell: 'A2', context: 'Test' }
     */
    parseDeepLink(url: string): {
        cell: string;
        context?: string;
    } | null;
    /**
     * Generate QR code data URL for cell link (for mobile scanning)
     *
     * @param cell - Cell ID
     * @param context - Optional context
     * @returns Data URL for QR code (requires qrcode library in production)
     *
     * Note: This is a placeholder. In production, integrate with a QR library like 'qrcode'
     */
    generateQRCode(cell: string, context?: string): string;
    /**
     * Generate embed data for rich previews
     *
     * @param cell - Cell ID
     * @param context - Optional context
     * @returns Embed metadata object
     */
    generateEmbedData(cell: string, context?: string): {
        title: string;
        url: string;
        description: string;
        thumbnail?: string;
    };
}
/**
 * Singleton instance for easy import
 */
export declare const deepLinker: DeepLinker;
/**
 * Cell name reference for convenience
 */
export declare const CELL_NAMES: Record<string, string>;
/**
 * Room to cells mapping for reverse lookup
 */
export declare const ROOM_TO_CELLS: Record<string, string[]>;
//# sourceMappingURL=deep-linker.d.ts.map