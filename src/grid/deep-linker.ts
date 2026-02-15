/**
 * deep-linker.ts — Tesseract Deep Link Generator
 *
 * Generates deep links to tesseract.nu grid cells and Discord messages.
 * Enables direct navigation from events to visual grid representation.
 */

/**
 * DeepLinker — Generate links to tesseract.nu and Discord
 */
export class DeepLinker {
  private readonly tesseractBaseUrl: string;
  private readonly discordBaseUrl: string;

  constructor(
    tesseractBaseUrl: string = 'https://tesseract.nu',
    discordBaseUrl: string = 'https://discord.com/channels'
  ) {
    this.tesseractBaseUrl = tesseractBaseUrl;
    this.discordBaseUrl = discordBaseUrl;
  }

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
  generateDeepLink(cell: string, context?: string): string {
    const params = new URLSearchParams();
    params.set('focus', cell);

    if (context) {
      params.set('context', context);
    }

    return `${this.tesseractBaseUrl}/grid?${params.toString()}`;
  }

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
  generateDiscordLink(
    cell: string,
    messageId?: string,
    channelId?: string,
    guildId?: string
  ): string {
    if (!messageId) {
      // Return channel link if no message ID
      const guild = guildId || '@me';
      const channel = channelId || 'general';
      return `${this.discordBaseUrl}/${guild}/${channel}`;
    }

    const guild = guildId || '@me';
    const channel = channelId || 'general';
    return `${this.discordBaseUrl}/${guild}/${channel}/${messageId}`;
  }

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
  generateComparisonLink(cells: string[], mode: 'overlay' | 'split' | 'sequence' = 'overlay'): string {
    const params = new URLSearchParams();
    params.set('compare', cells.join(','));
    params.set('mode', mode);

    return `${this.tesseractBaseUrl}/grid?${params.toString()}`;
  }

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
  generateRoomLink(room: string, highlight?: string): string {
    const roomName = room.replace(/^#/, '').replace(/-room$/, '');
    const params = new URLSearchParams();
    params.set('room', roomName);

    if (highlight) {
      params.set('highlight', highlight);
    }

    return `${this.tesseractBaseUrl}/grid?${params.toString()}`;
  }

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
  generateTimelineLink(cell: string, startTime: string | Date, endTime: string | Date): string {
    const start = typeof startTime === 'string' ? startTime : startTime.toISOString();
    const end = typeof endTime === 'string' ? endTime : endTime.toISOString();

    const params = new URLSearchParams();
    params.set('focus', cell);
    params.set('timeline', `${start}_${end}`);

    return `${this.tesseractBaseUrl}/grid?${params.toString()}`;
  }

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
  generateMarkdownLink(cell: string, label?: string, context?: string): string {
    const url = this.generateDeepLink(cell, context);
    const linkLabel = label || cell;
    return `[${linkLabel}](${url})`;
  }

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
  parseDeepLink(url: string): { cell: string; context?: string } | null {
    try {
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes('tesseract.nu')) {
        return null;
      }

      const cell = urlObj.searchParams.get('focus');
      if (!cell) return null;

      const context = urlObj.searchParams.get('context') || undefined;

      return { cell, context };
    } catch {
      return null;
    }
  }

  /**
   * Generate QR code data URL for cell link (for mobile scanning)
   *
   * @param cell - Cell ID
   * @param context - Optional context
   * @returns Data URL for QR code (requires qrcode library in production)
   *
   * Note: This is a placeholder. In production, integrate with a QR library like 'qrcode'
   */
  generateQRCode(cell: string, context?: string): string {
    const url = this.generateDeepLink(cell, context);
    // Placeholder - integrate with QR library in production
    return `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=`;
  }

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
  } {
    const cellNames: Record<string, string> = {
      A1: 'Law',
      A2: 'Goal',
      A3: 'Fund',
      B1: 'Speed',
      B2: 'Deal',
      B3: 'Signal',
      C1: 'Grid',
      C2: 'Loop',
      C3: 'Flow',
    };

    const cellName = cellNames[cell] || cell;
    const url = this.generateDeepLink(cell, context);

    return {
      title: `Tesseract Cell: ${cell} (${cellName})`,
      url,
      description: context || `View ${cellName} cell in tesseract grid`,
      thumbnail: `${this.tesseractBaseUrl}/api/cell-thumbnail/${cell}`,
    };
  }
}

/**
 * Singleton instance for easy import
 */
export const deepLinker = new DeepLinker();

/**
 * Cell name reference for convenience
 */
export const CELL_NAMES: Record<string, string> = {
  A1: 'Law',
  A2: 'Goal',
  A3: 'Fund',
  B1: 'Speed',
  B2: 'Deal',
  B3: 'Signal',
  C1: 'Grid',
  C2: 'Loop',
  C3: 'Flow',
};

/**
 * Room to cells mapping for reverse lookup
 */
export const ROOM_TO_CELLS: Record<string, string[]> = {
  '#legal-room': ['A1'],
  '#strategy-room': ['A2'],
  '#finance-room': ['A3'],
  '#speed-room': ['B1'],
  '#deals-room': ['B2'],
  '#signal-room': ['B3'],
  '#ops-room': ['C1'],
  '#loop-room': ['C2'],
  '#flow-room': ['C3'],
};
