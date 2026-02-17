/**
 * deep-linker.test.ts — Tests for Tesseract Deep Link Generator
 */

import { describe, it, expect } from 'vitest';
import { DeepLinker, deepLinker, CELL_NAMES, ROOM_TO_CELLS } from './deep-linker';

describe('DeepLinker', () => {
  const linker = new DeepLinker();

  describe('generateDeepLink', () => {
    it('generates a basic deep link with cell focus', () => {
      const url = linker.generateDeepLink('A2');
      expect(url).toBe('https://tesseract.nu/grid?focus=A2');
    });

    it('includes URL-encoded context when provided', () => {
      const url = linker.generateDeepLink('A2', 'Task completed: Phase 0');
      expect(url).toContain('focus=A2');
      expect(url).toContain('context=Task+completed');
    });

    it('works without context', () => {
      const url = linker.generateDeepLink('C3');
      expect(url).toBe('https://tesseract.nu/grid?focus=C3');
      expect(url).not.toContain('context');
    });
  });

  describe('generateDiscordLink', () => {
    it('generates a full message link with all IDs', () => {
      const url = linker.generateDiscordLink('A2', '1234567890', '9876543210', '1111111111');
      expect(url).toBe('https://discord.com/channels/1111111111/9876543210/1234567890');
    });

    it('falls back to @me and general when IDs are missing', () => {
      const url = linker.generateDiscordLink('A2');
      expect(url).toBe('https://discord.com/channels/@me/general');
    });

    it('generates channel link without message ID', () => {
      const url = linker.generateDiscordLink('A2', undefined, 'chan123', 'guild456');
      expect(url).toBe('https://discord.com/channels/guild456/chan123');
    });
  });

  describe('generateComparisonLink', () => {
    it('generates comparison link with default overlay mode', () => {
      const url = linker.generateComparisonLink(['A1', 'B2', 'C3']);
      expect(url).toContain('compare=A1%2CB2%2CC3');
      expect(url).toContain('mode=overlay');
    });

    it('supports split mode', () => {
      const url = linker.generateComparisonLink(['A1', 'B2'], 'split');
      expect(url).toContain('mode=split');
    });

    it('supports sequence mode', () => {
      const url = linker.generateComparisonLink(['A1', 'B2'], 'sequence');
      expect(url).toContain('mode=sequence');
    });
  });

  describe('generateRoomLink', () => {
    it('strips # prefix and -room suffix from room name', () => {
      const url = linker.generateRoomLink('#strategy-room');
      expect(url).toContain('room=strategy');
    });

    it('includes highlight cell when provided', () => {
      const url = linker.generateRoomLink('#strategy-room', 'A2');
      expect(url).toContain('room=strategy');
      expect(url).toContain('highlight=A2');
    });

    it('handles plain room names', () => {
      const url = linker.generateRoomLink('legal');
      expect(url).toContain('room=legal');
    });
  });

  describe('generateTimelineLink', () => {
    it('generates timeline link with string timestamps', () => {
      const url = linker.generateTimelineLink('A2', '2026-02-14T00:00:00Z', '2026-02-14T23:59:59Z');
      expect(url).toContain('focus=A2');
      expect(url).toContain('timeline=');
      expect(url).toContain('2026-02-14');
    });

    it('converts Date objects to ISO strings', () => {
      const start = new Date('2026-01-01T00:00:00Z');
      const end = new Date('2026-01-02T00:00:00Z');
      const url = linker.generateTimelineLink('B1', start, end);
      expect(url).toContain('focus=B1');
      expect(url).toContain('2026-01-01');
      expect(url).toContain('2026-01-02');
    });
  });

  describe('generateMarkdownLink', () => {
    it('generates markdown with custom label', () => {
      const md = linker.generateMarkdownLink('A2', 'Strategy Goal');
      expect(md).toMatch(/^\[Strategy Goal\]\(https:\/\/tesseract\.nu\/grid\?focus=A2\)$/);
    });

    it('uses cell ID as default label', () => {
      const md = linker.generateMarkdownLink('B3');
      expect(md.startsWith('[B3]')).toBe(true);
    });

    it('includes context in URL', () => {
      const md = linker.generateMarkdownLink('A1', 'Law', 'test context');
      expect(md).toContain('context=');
    });
  });

  describe('parseDeepLink', () => {
    it('parses a valid tesseract.nu URL', () => {
      const result = linker.parseDeepLink('https://tesseract.nu/grid?focus=A2&context=Test');
      expect(result).toEqual({ cell: 'A2', context: 'Test' });
    });

    it('returns null for non-tesseract URLs', () => {
      const result = linker.parseDeepLink('https://example.com/grid?focus=A2');
      expect(result).toBeNull();
    });

    it('returns null for URLs without focus param', () => {
      const result = linker.parseDeepLink('https://tesseract.nu/grid?mode=overlay');
      expect(result).toBeNull();
    });

    it('returns null for invalid URLs', () => {
      const result = linker.parseDeepLink('not a url');
      expect(result).toBeNull();
    });

    it('returns undefined context when not present', () => {
      const result = linker.parseDeepLink('https://tesseract.nu/grid?focus=C1');
      expect(result).toEqual({ cell: 'C1', context: undefined });
    });
  });

  describe('generateEmbedData', () => {
    it('returns embed with known cell name', () => {
      const embed = linker.generateEmbedData('A2', 'Some context');
      expect(embed.title).toBe('Tesseract Cell: A2 (Goal)');
      expect(embed.url).toContain('focus=A2');
      expect(embed.description).toBe('Some context');
      expect(embed.thumbnail).toContain('/api/cell-thumbnail/A2');
    });

    it('falls back to cell ID for unknown cells', () => {
      const embed = linker.generateEmbedData('Z9');
      expect(embed.title).toBe('Tesseract Cell: Z9 (Z9)');
      expect(embed.description).toContain('Z9');
    });
  });

  describe('custom base URLs', () => {
    it('uses custom tesseract base URL', () => {
      const custom = new DeepLinker('https://custom.example.com');
      const url = custom.generateDeepLink('A1');
      expect(url.startsWith('https://custom.example.com/grid?')).toBe(true);
    });

    it('uses custom discord base URL', () => {
      const custom = new DeepLinker(undefined, 'https://ptb.discord.com/channels');
      const url = custom.generateDiscordLink('A1', 'msg1', 'chan1', 'guild1');
      expect(url.startsWith('https://ptb.discord.com/channels/')).toBe(true);
    });
  });
});

describe('exports', () => {
  it('exports a singleton deepLinker instance', () => {
    expect(deepLinker).toBeInstanceOf(DeepLinker);
  });

  it('exports CELL_NAMES with all 9 cells', () => {
    expect(Object.keys(CELL_NAMES)).toHaveLength(9);
    expect(CELL_NAMES.A2).toBe('Goal');
    expect(CELL_NAMES.C3).toBe('Flow');
  });

  it('exports ROOM_TO_CELLS mapping', () => {
    expect(ROOM_TO_CELLS['#strategy-room']).toEqual(['A2']);
    expect(ROOM_TO_CELLS['#flow-room']).toEqual(['C3']);
  });
});
