/**
 * deep-linker.test.js — Comprehensive tests for Tesseract Deep Link Generator
 */

const { DeepLinker, deepLinker, CELL_NAMES, ROOM_TO_CELLS } = require('./deep-linker');

describe('DeepLinker', () => {
  let linker;

  beforeEach(() => {
    linker = new DeepLinker();
  });

  describe('generateDeepLink', () => {
    it('should generate basic deep link with cell focus', () => {
      const link = linker.generateDeepLink('A2');
      expect(link).toBe('https://tesseract.nu/grid?focus=A2');
    });

    it('should include context in deep link', () => {
      const link = linker.generateDeepLink('A2', 'Task completed: Phase 0');
      expect(link).toContain('focus=A2');
      expect(link).toContain('context=Task+completed');
    });

    it('should properly URL encode special characters in context', () => {
      const link = linker.generateDeepLink('B1', 'Test: 100% & success!');
      expect(link).toContain('context=');
      expect(link).toContain('Test');
    });

    it('should handle all valid cell IDs', () => {
      const cells = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
      cells.forEach(cell => {
        const link = linker.generateDeepLink(cell);
        expect(link).toContain(`focus=${cell}`);
      });
    });
  });

  describe('generateDiscordLink', () => {
    it('should generate Discord message link with all parameters', () => {
      const link = linker.generateDiscordLink('A2', '1234567890', '9876543210', '1111111111');
      expect(link).toBe('https://discord.com/channels/1111111111/9876543210/1234567890');
    });

    it('should use defaults when guild/channel not provided', () => {
      const link = linker.generateDiscordLink('A2', '1234567890');
      expect(link).toBe('https://discord.com/channels/@me/general/1234567890');
    });

    it('should return channel link when no message ID', () => {
      const link = linker.generateDiscordLink('A2', undefined, 'my-channel', 'my-guild');
      expect(link).toBe('https://discord.com/channels/my-guild/my-channel');
    });

    it('should handle @me DM links', () => {
      const link = linker.generateDiscordLink('A2', '1234567890', 'channel-id');
      expect(link).toBe('https://discord.com/channels/@me/channel-id/1234567890');
    });
  });

  describe('generateComparisonLink', () => {
    it('should generate comparison link with multiple cells', () => {
      const link = linker.generateComparisonLink(['A1', 'B2', 'C3']);
      expect(link).toContain('compare=A1%2CB2%2CC3');
      expect(link).toContain('mode=overlay');
    });

    it('should support different comparison modes', () => {
      const modes = ['overlay', 'split', 'sequence'];
      modes.forEach(mode => {
        const link = linker.generateComparisonLink(['A1', 'A2'], mode);
        expect(link).toContain(`mode=${mode}`);
      });
    });

    it('should handle single cell comparison', () => {
      const link = linker.generateComparisonLink(['A1']);
      expect(link).toContain('compare=A1');
    });
  });

  describe('generateRoomLink', () => {
    it('should generate room link with hash prefix', () => {
      const link = linker.generateRoomLink('#strategy-room');
      expect(link).toContain('room=strategy');
    });

    it('should generate room link without hash prefix', () => {
      const link = linker.generateRoomLink('legal-room');
      expect(link).toContain('room=legal');
    });

    it('should include highlight parameter', () => {
      const link = linker.generateRoomLink('#ops-room', 'C1');
      expect(link).toContain('room=ops');
      expect(link).toContain('highlight=C1');
    });

    it('should strip -room suffix correctly', () => {
      const link = linker.generateRoomLink('#signal-room');
      expect(link).toContain('room=signal');
      expect(link).not.toContain('signal-room');
    });
  });

  describe('generateTimelineLink', () => {
    it('should generate timeline link with string timestamps', () => {
      const link = linker.generateTimelineLink(
        'A2',
        '2026-02-14T00:00:00Z',
        '2026-02-14T23:59:59Z'
      );
      expect(link).toContain('focus=A2');
      expect(link).toContain('timeline=2026-02-14T00%3A00%3A00Z_2026-02-14T23%3A59%3A59Z');
    });

    it('should generate timeline link with Date objects', () => {
      const start = new Date('2026-02-14T00:00:00Z');
      const end = new Date('2026-02-14T23:59:59Z');
      const link = linker.generateTimelineLink('B1', start, end);
      expect(link).toContain('focus=B1');
      expect(link).toContain('timeline=');
    });

    it('should handle mixed Date and string timestamps', () => {
      const start = new Date('2026-02-14T00:00:00Z');
      const end = '2026-02-14T23:59:59Z';
      const link = linker.generateTimelineLink('C3', start, end);
      expect(link).toContain('focus=C3');
      expect(link).toContain('timeline=');
    });
  });

  describe('generateMarkdownLink', () => {
    it('should generate markdown link with custom label', () => {
      const link = linker.generateMarkdownLink('A2', 'Strategy Goal');
      expect(link).toBe('[Strategy Goal](https://tesseract.nu/grid?focus=A2)');
    });

    it('should use cell ID as label when not provided', () => {
      const link = linker.generateMarkdownLink('B2');
      expect(link).toBe('[B2](https://tesseract.nu/grid?focus=B2)');
    });

    it('should include context in URL', () => {
      const link = linker.generateMarkdownLink('C1', 'Grid Operations', 'Active task');
      expect(link).toContain('[Grid Operations]');
      expect(link).toContain('context=Active');
    });
  });

  describe('parseDeepLink', () => {
    it('should parse valid tesseract URL', () => {
      const result = linker.parseDeepLink('https://tesseract.nu/grid?focus=A2&context=Test');
      expect(result).toEqual({ cell: 'A2', context: 'Test' });
    });

    it('should parse URL without context', () => {
      const result = linker.parseDeepLink('https://tesseract.nu/grid?focus=B1');
      expect(result).toEqual({ cell: 'B1', context: undefined });
    });

    it('should return null for non-tesseract URL', () => {
      const result = linker.parseDeepLink('https://example.com/grid?focus=A1');
      expect(result).toBeNull();
    });

    it('should return null for URL without focus parameter', () => {
      const result = linker.parseDeepLink('https://tesseract.nu/grid?other=param');
      expect(result).toBeNull();
    });

    it('should return null for invalid URL', () => {
      const result = linker.parseDeepLink('not-a-url');
      expect(result).toBeNull();
    });

    it('should handle URL decoded context', () => {
      const result = linker.parseDeepLink('https://tesseract.nu/grid?focus=C2&context=Task%20complete');
      expect(result).toEqual({ cell: 'C2', context: 'Task complete' });
    });
  });

  describe('generateQRCode', () => {
    it('should return placeholder QR code data URL', () => {
      const qr = linker.generateQRCode('A1');
      expect(qr).toContain('data:image/svg+xml;base64,');
    });

    it('should handle cell and context', () => {
      const qr = linker.generateQRCode('B2', 'Deal tracking');
      expect(qr).toBeDefined();
      expect(typeof qr).toBe('string');
    });
  });

  describe('generateEmbedData', () => {
    it('should generate embed data for known cells', () => {
      const embed = linker.generateEmbedData('A2');
      expect(embed.title).toContain('A2');
      expect(embed.title).toContain('Goal');
      expect(embed.url).toContain('focus=A2');
      expect(embed.thumbnail).toContain('/api/cell-thumbnail/A2');
    });

    it('should include context in description', () => {
      const embed = linker.generateEmbedData('B1', 'Speed optimization complete');
      expect(embed.description).toBe('Speed optimization complete');
    });

    it('should handle unknown cells gracefully', () => {
      const embed = linker.generateEmbedData('Z9');
      expect(embed.title).toContain('Z9');
      expect(embed.url).toContain('focus=Z9');
    });

    it('should generate valid URLs in embed data', () => {
      const embed = linker.generateEmbedData('C3');
      expect(() => new URL(embed.url)).not.toThrow();
      expect(() => new URL(embed.thumbnail)).not.toThrow();
    });
  });

  describe('custom base URLs', () => {
    it('should use custom tesseract base URL', () => {
      const customLinker = new DeepLinker('https://custom.tesseract.io');
      const link = customLinker.generateDeepLink('A1');
      expect(link).toBe('https://custom.tesseract.io/grid?focus=A1');
    });

    it('should use custom Discord base URL', () => {
      const customLinker = new DeepLinker(undefined, 'https://custom.discord.app/channels');
      const link = customLinker.generateDiscordLink('A1', '123', '456', '789');
      expect(link).toBe('https://custom.discord.app/channels/789/456/123');
    });

    it('should use both custom base URLs', () => {
      const customLinker = new DeepLinker(
        'https://custom.tesseract.io',
        'https://custom.discord.app/channels'
      );
      const tessLink = customLinker.generateDeepLink('A1');
      const discordLink = customLinker.generateDiscordLink('A1', '123', '456', '789');

      expect(tessLink).toContain('custom.tesseract.io');
      expect(discordLink).toContain('custom.discord.app');
    });
  });
});

describe('Singleton instance', () => {
  it('should export singleton deepLinker instance', () => {
    expect(deepLinker).toBeInstanceOf(DeepLinker);
  });

  it('should be reusable across imports', () => {
    const link1 = deepLinker.generateDeepLink('A1');
    const link2 = deepLinker.generateDeepLink('A2');
    expect(link1).toContain('A1');
    expect(link2).toContain('A2');
  });
});

describe('CELL_NAMES constant', () => {
  it('should contain all 9 cells', () => {
    expect(Object.keys(CELL_NAMES)).toHaveLength(9);
  });

  it('should map cells to expected names', () => {
    expect(CELL_NAMES['A1']).toBe('Law');
    expect(CELL_NAMES['A2']).toBe('Goal');
    expect(CELL_NAMES['A3']).toBe('Fund');
    expect(CELL_NAMES['B1']).toBe('Speed');
    expect(CELL_NAMES['B2']).toBe('Deal');
    expect(CELL_NAMES['B3']).toBe('Signal');
    expect(CELL_NAMES['C1']).toBe('Grid');
    expect(CELL_NAMES['C2']).toBe('Loop');
    expect(CELL_NAMES['C3']).toBe('Flow');
  });
});

describe('ROOM_TO_CELLS constant', () => {
  it('should map rooms to cells', () => {
    expect(ROOM_TO_CELLS['#legal-room']).toEqual(['A1']);
    expect(ROOM_TO_CELLS['#strategy-room']).toEqual(['A2']);
    expect(ROOM_TO_CELLS['#finance-room']).toEqual(['A3']);
    expect(ROOM_TO_CELLS['#speed-room']).toEqual(['B1']);
    expect(ROOM_TO_CELLS['#deals-room']).toEqual(['B2']);
    expect(ROOM_TO_CELLS['#signal-room']).toEqual(['B3']);
    expect(ROOM_TO_CELLS['#ops-room']).toEqual(['C1']);
    expect(ROOM_TO_CELLS['#loop-room']).toEqual(['C2']);
    expect(ROOM_TO_CELLS['#flow-room']).toEqual(['C3']);
  });

  it('should have 9 room mappings', () => {
    expect(Object.keys(ROOM_TO_CELLS)).toHaveLength(9);
  });
});

describe('Integration tests', () => {
  it('should handle round-trip link generation and parsing', () => {
    const cell = 'A2';
    const context = 'Integration test';
    const link = deepLinker.generateDeepLink(cell, context);
    const parsed = deepLinker.parseDeepLink(link);

    expect(parsed).toEqual({ cell, context });
  });

  it('should handle complex workflow: room → cell → markdown', () => {
    const room = '#strategy-room';
    const cell = 'A2';

    const roomLink = deepLinker.generateRoomLink(room, cell);
    expect(roomLink).toContain('room=strategy');
    expect(roomLink).toContain('highlight=A2');

    const cellLink = deepLinker.generateDeepLink(cell, 'From room view');
    expect(cellLink).toContain('focus=A2');

    const markdown = deepLinker.generateMarkdownLink(cell, 'Strategy Goal');
    expect(markdown).toContain('[Strategy Goal]');
  });

  it('should support multi-cell comparison workflow', () => {
    const cells = ['A1', 'A2', 'A3']; // Law, Goal, Fund column
    const comparisonLink = deepLinker.generateComparisonLink(cells, 'split');

    expect(comparisonLink).toContain('compare=A1%2CA2%2CA3');
    expect(comparisonLink).toContain('mode=split');
  });

  it('should generate embed data with valid thumbnail URLs', () => {
    const cells = ['A1', 'B2', 'C3'];
    cells.forEach(cell => {
      const embed = deepLinker.generateEmbedData(cell);
      expect(() => new URL(embed.thumbnail)).not.toThrow();
      expect(embed.thumbnail).toContain(cell);
    });
  });

  it('should handle timeline links for historical analysis', () => {
    const start = '2026-02-01T00:00:00Z';
    const end = '2026-02-14T23:59:59Z';

    const link = deepLinker.generateTimelineLink('B1', start, end);
    const parsed = deepLinker.parseDeepLink(link);

    expect(parsed?.cell).toBe('B1');
  });
});

describe('Edge cases and error handling', () => {
  it('should handle empty context string', () => {
    const link = deepLinker.generateDeepLink('A1', '');
    expect(link).toBe('https://tesseract.nu/grid?focus=A1');
  });

  it('should handle very long context strings', () => {
    const longContext = 'A'.repeat(1000);
    const link = deepLinker.generateDeepLink('A1', longContext);
    expect(link).toContain('focus=A1');
    expect(link).toContain('context=');
  });

  it('should handle special characters in cell IDs gracefully', () => {
    const link = deepLinker.generateDeepLink('A1+B2'); // Invalid but should not crash
    expect(link).toContain('focus=A1%2BB2');
  });

  it('should handle malformed URLs in parseDeepLink', () => {
    const malformed = [
      'http://',
      'ftp://tesseract.nu',
      'javascript:alert(1)',
      '',
      'tesseract.nu/grid?focus=A1', // Missing protocol
    ];

    malformed.forEach(url => {
      const result = deepLinker.parseDeepLink(url);
      expect(result).toBeNull();
    });
  });

  it('should handle empty cell array in comparison', () => {
    const link = deepLinker.generateComparisonLink([]);
    expect(link).toContain('compare=');
    expect(link).toContain('mode=overlay');
  });

  it('should handle duplicate cells in comparison', () => {
    const link = deepLinker.generateComparisonLink(['A1', 'A1', 'A2']);
    expect(link).toContain('compare=A1%2CA1%2CA2');
  });
});
