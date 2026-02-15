/**
 * ascii-renderer.test.ts — Tests for Discord ASCII Grid Renderer
 *
 * Test suite covers:
 * - Heat color mapping (cold/warm/hot)
 * - ASCII grid rendering with ANSI codes
 * - Discord embed generation
 * - Timestamp formatting
 * - Edge cases (empty pressures, invalid values)
 */

import { describe, it, expect } from 'vitest';
import {
  renderGrid,
  renderGridEmbed,
  GRID_CELLS,
  ROW_LABELS,
  type RecentEvent,
} from './ascii-renderer';

// ═══════════════════════════════════════════════════════════════
// Test Data
// ═══════════════════════════════════════════════════════════════

const SAMPLE_PRESSURES = {
  // Strategy row - mixed heat
  A1: 0.15, // Cold
  A2: 0.45, // Warm
  A3: 0.85, // Hot
  A4: 0.25, // Cold

  // Tactics row - medium heat
  B1: 0.50, // Warm
  B2: 0.60, // Warm
  B3: 0.40, // Warm
  B4: 0.55, // Warm

  // Operations row - low heat
  C1: 0.10, // Cold
  C2: 0.20, // Cold
  C3: 0.15, // Cold
  C4: 0.05, // Cold
};

const SAMPLE_EVENTS: RecentEvent[] = [
  {
    cellId: 'A3',
    type: 'pressure-spike',
    timestamp: new Date(Date.now() - 300000), // 5 minutes ago
    description: 'Funding pressure increased',
  },
  {
    cellId: 'B2',
    type: 'task-completed',
    timestamp: new Date(Date.now() - 600000), // 10 minutes ago
    description: 'Deal negotiation complete',
  },
  {
    cellId: 'C1',
    type: 'grid-update',
    timestamp: new Date(Date.now() - 60000), // 1 minute ago
    description: 'Grid layout recalculated',
  },
];

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('Grid Constants', () => {
  it('should define exactly 12 grid cells', () => {
    expect(GRID_CELLS.length).toBe(12);
  });

  it('should have cells in 3x4 layout', () => {
    const rowCounts = [0, 1, 2].map(
      row => GRID_CELLS.filter(c => c.row === row).length
    );
    expect(rowCounts).toEqual([4, 4, 4]);
  });

  it('should have correct row labels', () => {
    expect(ROW_LABELS).toEqual(['A Strategy', 'B Tactics', 'C Operations']);
  });

  it('should have unique cell IDs', () => {
    const ids = GRID_CELLS.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(12);
  });

  it('should have all cells with valid coordinates', () => {
    GRID_CELLS.forEach(cell => {
      expect(cell.row).toBeGreaterThanOrEqual(0);
      expect(cell.row).toBeLessThan(3);
      expect(cell.col).toBeGreaterThanOrEqual(0);
      expect(cell.col).toBeLessThan(4);
      expect(cell.label.length).toBeGreaterThan(0);
    });
  });
});

describe('renderGrid', () => {
  it('should return a Discord code block with ANSI codes', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    expect(result).toContain('```ansi');
    expect(result).toContain('```');
    expect(result).toContain('\u001b['); // Contains ANSI escape codes
  });

  it('should include all 12 cell IDs in output', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    GRID_CELLS.forEach(cell => {
      expect(result).toContain(cell.id);
    });
  });

  it('should include all cell labels', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    GRID_CELLS.forEach(cell => {
      expect(result).toContain(cell.label);
    });
  });

  it('should show pressure values with 2 decimal places', () => {
    const result = renderGrid({ A1: 0.123456 });
    expect(result).toContain('0.12');
  });

  it('should include header with title', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    expect(result).toContain('TESSERACT GRID');
    expect(result).toContain('12-CELL PRESSURE MAP');
  });

  it('should include legend with heat descriptions', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    expect(result).toContain('Legend:');
    expect(result).toContain('Cold');
    expect(result).toContain('Warm');
    expect(result).toContain('Hot');
    expect(result).toContain('0.00-0.30');
    expect(result).toContain('0.30-0.70');
    expect(result).toContain('0.70-1.00');
  });

  it('should include heat emojis', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    expect(result).toContain('\u{1F7E2}'); // Green circle
    expect(result).toContain('\u{1F7E1}'); // Yellow circle
    expect(result).toContain('\u{1F534}'); // Red circle
  });

  it('should handle empty pressures object', () => {
    const result = renderGrid({});
    expect(result).toContain('```ansi');
    GRID_CELLS.forEach(cell => {
      expect(result).toContain(cell.id);
      expect(result).toContain('0.00'); // Default to 0
    });
  });

  it('should handle missing cell pressures (default to 0)', () => {
    const partialPressures = { A1: 0.5, B2: 0.7 };
    const result = renderGrid(partialPressures);
    expect(result).toContain('A1');
    expect(result).toContain('B2');
    expect(result).toContain('0.50');
    expect(result).toContain('0.70');
  });

  it('should include grid borders and separators', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    expect(result).toContain('\u2554'); // top-left double
    expect(result).toContain('\u2557'); // top-right double
    expect(result).toContain('\u255A'); // bottom-left double
    expect(result).toContain('\u255D'); // bottom-right double
    expect(result).toContain('\u250C'); // top-left single
    expect(result).toContain('\u2510'); // top-right single
    expect(result).toContain('\u251C'); // left tee
    expect(result).toContain('\u2524'); // right tee
    expect(result).toContain('\u2514'); // bottom-left single
    expect(result).toContain('\u2518'); // bottom-right single
  });

  it('should include row labels', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    expect(result).toContain('A Strategy');
    expect(result).toContain('B Tactics');
    expect(result).toContain('C Operations');
  });

  it('should handle extreme pressure values', () => {
    const extremes = {
      A1: 0.0,
      A2: 0.29,
      A3: 0.30,
      A4: 0.69,
      B1: 0.70,
      B2: 1.0,
      B3: 0.5,
      B4: 0.5,
      C1: 0.5,
      C2: 0.5,
      C3: 0.5,
      C4: 0.5,
    };
    const result = renderGrid(extremes);
    expect(result).toContain('0.00');
    expect(result).toContain('0.29');
    expect(result).toContain('0.30');
    expect(result).toContain('1.00');
  });
});

describe('renderGridEmbed', () => {
  it('should return a valid embed object', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    expect(embed.title).toBeDefined();
    expect(embed.description).toBeDefined();
    expect(typeof embed.color).toBe('number');
    expect(embed.footer).toBeDefined();
    expect(embed.timestamp).toBeDefined();
  });

  it('should calculate green color for low average pressure', () => {
    const lowPressures = {
      A1: 0.1, A2: 0.15, A3: 0.2, A4: 0.1,
      B1: 0.05, B2: 0.1, B3: 0.15, B4: 0.2,
      C1: 0.1, C2: 0.15, C3: 0.1, C4: 0.05,
    };
    const embed = renderGridEmbed(lowPressures);
    expect(embed.color).toBe(0x00ff00); // Green
  });

  it('should calculate yellow color for medium average pressure', () => {
    const mediumPressures = {
      A1: 0.4, A2: 0.5, A3: 0.6, A4: 0.4,
      B1: 0.5, B2: 0.5, B3: 0.5, B4: 0.5,
      C1: 0.4, C2: 0.5, C3: 0.5, C4: 0.4,
    };
    const embed = renderGridEmbed(mediumPressures);
    expect(embed.color).toBe(0xffff00); // Yellow
  });

  it('should calculate red color for high average pressure', () => {
    const highPressures = {
      A1: 0.8, A2: 0.9, A3: 0.85, A4: 0.75,
      B1: 0.8, B2: 0.85, B3: 0.9, B4: 0.8,
      C1: 0.75, C2: 0.8, C3: 0.85, C4: 0.9,
    };
    const embed = renderGridEmbed(highPressures);
    expect(embed.color).toBe(0xff0000); // Red
  });

  it('should include all cell IDs in description', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    GRID_CELLS.forEach(cell => {
      expect(embed.description).toContain(cell.id);
    });
  });

  it('should include pressure values in description', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    expect(embed.description).toContain('0.15');
    expect(embed.description).toContain('0.45');
    expect(embed.description).toContain('0.85');
  });

  it('should include recent events in fields', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES, SAMPLE_EVENTS);
    expect(embed.fields).toBeDefined();
    expect(embed.fields!.length).toBeGreaterThan(0);

    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    expect(eventField).toBeDefined();
    expect(eventField!.value).toContain('A3');
    expect(eventField!.value).toContain('B2');
    expect(eventField!.value).toContain('C1');
  });

  it('should limit events to 5 most recent', () => {
    const manyEvents: RecentEvent[] = Array.from({ length: 10 }, (_, i) => ({
      cellId: `A${(i % 4) + 1}`,
      type: 'test-event',
      timestamp: new Date(Date.now() - i * 60000),
      description: `Event ${i}`,
    }));

    const embed = renderGridEmbed(SAMPLE_PRESSURES, manyEvents);
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    expect(eventField).toBeDefined();

    // Count bullet points (should be max 5)
    const bulletCount = (eventField!.value.match(/\u2022/g) || []).length;
    expect(bulletCount).toBeLessThanOrEqual(5);
  });

  it('should handle no recent events', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES, []);
    expect(embed.fields).toBeDefined();
    // Should not have events field or have empty value
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    if (eventField) {
      expect(eventField.value).toContain('No recent events');
    }
  });

  it('should include average pressure in footer', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    expect(embed.footer).toBeDefined();
    expect(embed.footer!.text).toContain('Average Pressure');
    expect(embed.footer!.text).toMatch(/\d+\.\d{2}/); // Contains a decimal number
  });

  it('should include valid ISO timestamp', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    expect(embed.timestamp).toBeDefined();

    const date = new Date(embed.timestamp!);
    expect(date.getTime()).not.toBeNaN();
    expect(date.getTime()).toBeGreaterThan(Date.now() - 10000); // Within last 10 seconds
  });

  it('should handle empty pressures', () => {
    const embed = renderGridEmbed({});
    expect(embed.color).toBe(0x00ff00); // Default to green (avg 0)
    expect(embed.footer!.text).toContain('0.00');
  });

  it('should include heat emojis in description', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    expect(embed.description).toContain('\u{1F7E2}');
    expect(embed.description).toContain('\u{1F7E1}');
    expect(embed.description).toContain('\u{1F534}');
  });

  it('should include row section headers', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    expect(embed.description).toContain('**A Strategy**');
    expect(embed.description).toContain('**B Tactics**');
    expect(embed.description).toContain('**C Operations**');
  });
});

describe('Heat Mapping', () => {
  it('should map cold pressure (0-0.29) to green emoji', () => {
    const coldPressures = { A1: 0.0, A2: 0.15, A3: 0.29 };
    const result = renderGrid(coldPressures);

    // Should have green emojis for these cells
    const lines = result.split('\n');
    const a1Line = lines.find(l => l.includes('A1'));
    expect(a1Line).toBeDefined();
    expect(a1Line).toContain('\u{1F7E2}');
  });

  it('should map warm pressure (0.3-0.69) to yellow emoji', () => {
    const warmPressures = { B1: 0.3, B2: 0.5, B3: 0.69 };
    const result = renderGrid(warmPressures);

    const lines = result.split('\n');
    const b1Line = lines.find(l => l.includes('B1'));
    expect(b1Line).toBeDefined();
    expect(b1Line).toContain('\u{1F7E1}');
  });

  it('should map hot pressure (0.7-1.0) to red emoji', () => {
    const hotPressures = { C1: 0.7, C2: 0.85, C3: 1.0 };
    const result = renderGrid(hotPressures);

    const lines = result.split('\n');
    const c1Line = lines.find(l => l.includes('C1'));
    expect(c1Line).toBeDefined();
    expect(c1Line).toContain('\u{1F534}');
  });

  it('should handle boundary values correctly', () => {
    const boundaries = {
      A1: 0.299, // Cold (just below 0.3)
      A2: 0.300, // Warm (exactly 0.3)
      A3: 0.699, // Warm (just below 0.7)
      A4: 0.700, // Hot (exactly 0.7)
    };
    const result = renderGrid(boundaries);

    // Check that emojis follow boundary rules
    expect(result).toContain('\u{1F7E2}'); // For 0.299
    expect(result).toContain('\u{1F7E1}'); // For 0.3 and 0.699
    expect(result).toContain('\u{1F534}'); // For 0.7
  });
});

describe('Timestamp Formatting (via events)', () => {
  it('should format very recent events as "just now"', () => {
    const events: RecentEvent[] = [{
      cellId: 'A1',
      type: 'test',
      timestamp: new Date(Date.now() - 10000), // 10 seconds ago
      description: 'Recent event',
    }];

    const embed = renderGridEmbed(SAMPLE_PRESSURES, events);
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    expect(eventField).toBeDefined();
    expect(eventField!.value).toContain('just now');
  });

  it('should format events in minutes', () => {
    const events: RecentEvent[] = [{
      cellId: 'A1',
      type: 'test',
      timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
      description: 'Minutes ago',
    }];

    const embed = renderGridEmbed(SAMPLE_PRESSURES, events);
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    expect(eventField).toBeDefined();
    expect(eventField!.value).toMatch(/\d+m ago/);
  });

  it('should format events in hours', () => {
    const events: RecentEvent[] = [{
      cellId: 'A1',
      type: 'test',
      timestamp: new Date(Date.now() - 3 * 3600000), // 3 hours ago
      description: 'Hours ago',
    }];

    const embed = renderGridEmbed(SAMPLE_PRESSURES, events);
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    expect(eventField).toBeDefined();
    expect(eventField!.value).toMatch(/\d+h ago/);
  });

  it('should format events in days', () => {
    const events: RecentEvent[] = [{
      cellId: 'A1',
      type: 'test',
      timestamp: new Date(Date.now() - 2 * 86400000), // 2 days ago
      description: 'Days ago',
    }];

    const embed = renderGridEmbed(SAMPLE_PRESSURES, events);
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    expect(eventField).toBeDefined();
    expect(eventField!.value).toMatch(/\d+d ago/);
  });
});

describe('Edge Cases', () => {
  it('should handle negative pressure values', () => {
    const negativePressures = { A1: -0.5, A2: -1.0 };
    const result = renderGrid(negativePressures);
    expect(result).toContain('-0.50');
    expect(result).toContain('-1.00');
    // Should show as cold since negative < 0.3
    expect(result).toContain('\u{1F7E2}');
  });

  it('should handle pressure values above 1.0', () => {
    const highPressures = { A1: 1.5, A2: 2.0 };
    const result = renderGrid(highPressures);
    expect(result).toContain('1.50');
    expect(result).toContain('2.00');
    // Should show as hot since > 0.7
    expect(result).toContain('\u{1F534}');
  });

  it('should handle undefined cell IDs gracefully', () => {
    const invalidPressures = { Z99: 0.5 };
    const result = renderGrid(invalidPressures);
    // Should still render all valid cells with default 0.00
    GRID_CELLS.forEach(cell => {
      expect(result).toContain(cell.id);
    });
  });

  it('should handle events with missing descriptions', () => {
    const events: RecentEvent[] = [{
      cellId: 'A1',
      type: 'test',
      timestamp: new Date(),
      // No description
    }];

    const embed = renderGridEmbed(SAMPLE_PRESSURES, events);
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    expect(eventField).toBeDefined();
    expect(eventField!.value).toContain('Event'); // Default description
  });

  it('should produce consistent output for same input', () => {
    const result1 = renderGrid(SAMPLE_PRESSURES);
    const result2 = renderGrid(SAMPLE_PRESSURES);

    // Grid rendering should be identical
    const gridPart1 = result1.split('Legend:')[0];
    const gridPart2 = result2.split('Legend:')[0];
    expect(gridPart1).toBe(gridPart2);
  });
});
