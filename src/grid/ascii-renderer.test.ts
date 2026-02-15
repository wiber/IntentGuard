/**
 * ascii-renderer.test.ts — Tests for Discord ASCII Grid Renderer
 *
 * Run with: npx tsx src/grid/ascii-renderer.test.ts
 *
 * Test suite covers:
 * - Heat color mapping (cold/warm/hot)
 * - ASCII grid rendering with ANSI codes
 * - Discord embed generation
 * - Timestamp formatting
 * - Edge cases (empty pressures, invalid values)
 */

import { strict as assert } from 'assert';
import {
  renderGrid,
  renderGridEmbed,
  GRID_CELLS,
  ROW_LABELS,
  type RecentEvent,
} from './ascii-renderer';

// ═══════════════════════════════════════════════════════════════
// Test Runner
// ═══════════════════════════════════════════════════════════════

let testCount = 0;
let passCount = 0;

function test(name: string, fn: () => void) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

function describe(suiteName: string, fn: () => void) {
  console.log(`\n${suiteName}:`);
  fn();
}

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

console.log('Running ASCII Grid Renderer Tests...');

describe('Grid Constants', () => {
  test('should define exactly 12 grid cells', () => {
    assert.equal(GRID_CELLS.length, 12);
  });

  test('should have cells in 3x4 layout', () => {
    const rowCounts = [0, 1, 2].map(
      row => GRID_CELLS.filter(c => c.row === row).length
    );
    assert.deepEqual(rowCounts, [4, 4, 4]);
  });

  test('should have correct row labels', () => {
    assert.deepEqual(ROW_LABELS, ['A Strategy', 'B Tactics', 'C Operations']);
  });

  test('should have unique cell IDs', () => {
    const ids = GRID_CELLS.map(c => c.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, 12);
  });

  test('should have all cells with valid coordinates', () => {
    GRID_CELLS.forEach(cell => {
      assert(cell.row >= 0 && cell.row < 3);
      assert(cell.col >= 0 && cell.col < 4);
      assert(cell.label.length > 0);
    });
  });
});

describe('renderGrid', () => {
  test('should return a Discord code block with ANSI codes', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    assert(result.includes('```ansi'));
    assert(result.includes('```'));
    assert(result.includes('\u001b[')); // Contains ANSI escape codes
  });

  test('should include all 12 cell IDs in output', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    GRID_CELLS.forEach(cell => {
      assert(result.includes(cell.id), `Missing cell ID: ${cell.id}`);
    });
  });

  test('should include all cell labels', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    GRID_CELLS.forEach(cell => {
      assert(result.includes(cell.label), `Missing label: ${cell.label}`);
    });
  });

  test('should show pressure values with 2 decimal places', () => {
    const result = renderGrid({ A1: 0.123456 });
    assert(result.includes('0.12'));
  });

  test('should include header with title', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    assert(result.includes('TESSERACT GRID'));
    assert(result.includes('12-CELL PRESSURE MAP'));
  });

  test('should include legend with heat descriptions', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    assert(result.includes('Legend:'));
    assert(result.includes('Cold'));
    assert(result.includes('Warm'));
    assert(result.includes('Hot'));
    assert(result.includes('0.00-0.30'));
    assert(result.includes('0.30-0.70'));
    assert(result.includes('0.70-1.00'));
  });

  test('should include heat emojis', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    assert(result.includes('🟢')); // Cold
    assert(result.includes('🟡')); // Warm
    assert(result.includes('🔴')); // Hot
  });

  test('should handle empty pressures object', () => {
    const result = renderGrid({});
    assert(result.includes('```ansi'));
    GRID_CELLS.forEach(cell => {
      assert(result.includes(cell.id));
      assert(result.includes('0.00')); // Default to 0
    });
  });

  test('should handle missing cell pressures (default to 0)', () => {
    const partialPressures = { A1: 0.5, B2: 0.7 };
    const result = renderGrid(partialPressures);
    assert(result.includes('A1'));
    assert(result.includes('B2'));
    assert(result.includes('0.50'));
    assert(result.includes('0.70'));
  });

  test('should include grid borders and separators', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    assert(result.includes('╔'));
    assert(result.includes('╗'));
    assert(result.includes('╚'));
    assert(result.includes('╝'));
    assert(result.includes('┌'));
    assert(result.includes('┐'));
    assert(result.includes('├'));
    assert(result.includes('┤'));
    assert(result.includes('└'));
    assert(result.includes('┘'));
  });

  test('should include row labels', () => {
    const result = renderGrid(SAMPLE_PRESSURES);
    assert(result.includes('A Strategy'));
    assert(result.includes('B Tactics'));
    assert(result.includes('C Operations'));
  });

  test('should handle extreme pressure values', () => {
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
    assert(result.includes('0.00'));
    assert(result.includes('0.29'));
    assert(result.includes('0.30'));
    assert(result.includes('1.00'));
  });
});

describe('renderGridEmbed', () => {
  test('should return a valid embed object', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    assert(embed.title);
    assert(embed.description);
    assert(typeof embed.color === 'number');
    assert(embed.footer);
    assert(embed.timestamp);
  });

  test('should calculate green color for low average pressure', () => {
    const lowPressures = {
      A1: 0.1, A2: 0.15, A3: 0.2, A4: 0.1,
      B1: 0.05, B2: 0.1, B3: 0.15, B4: 0.2,
      C1: 0.1, C2: 0.15, C3: 0.1, C4: 0.05,
    };
    const embed = renderGridEmbed(lowPressures);
    assert.equal(embed.color, 0x00ff00); // Green
  });

  test('should calculate yellow color for medium average pressure', () => {
    const mediumPressures = {
      A1: 0.4, A2: 0.5, A3: 0.6, A4: 0.4,
      B1: 0.5, B2: 0.5, B3: 0.5, B4: 0.5,
      C1: 0.4, C2: 0.5, C3: 0.5, C4: 0.4,
    };
    const embed = renderGridEmbed(mediumPressures);
    assert.equal(embed.color, 0xffff00); // Yellow
  });

  test('should calculate red color for high average pressure', () => {
    const highPressures = {
      A1: 0.8, A2: 0.9, A3: 0.85, A4: 0.75,
      B1: 0.8, B2: 0.85, B3: 0.9, B4: 0.8,
      C1: 0.75, C2: 0.8, C3: 0.85, C4: 0.9,
    };
    const embed = renderGridEmbed(highPressures);
    assert.equal(embed.color, 0xff0000); // Red
  });

  test('should include all cell IDs in description', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    GRID_CELLS.forEach(cell => {
      assert(embed.description.includes(cell.id), `Missing cell ID: ${cell.id}`);
    });
  });

  test('should include pressure values in description', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    assert(embed.description.includes('0.15'));
    assert(embed.description.includes('0.45'));
    assert(embed.description.includes('0.85'));
  });

  test('should include recent events in fields', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES, SAMPLE_EVENTS);
    assert(embed.fields);
    assert(embed.fields.length > 0);

    const eventField = embed.fields.find(f => f.name.includes('Recent Events'));
    assert(eventField);
    assert(eventField.value.includes('A3'));
    assert(eventField.value.includes('B2'));
    assert(eventField.value.includes('C1'));
  });

  test('should limit events to 5 most recent', () => {
    const manyEvents: RecentEvent[] = Array.from({ length: 10 }, (_, i) => ({
      cellId: `A${(i % 4) + 1}`,
      type: 'test-event',
      timestamp: new Date(Date.now() - i * 60000),
      description: `Event ${i}`,
    }));

    const embed = renderGridEmbed(SAMPLE_PRESSURES, manyEvents);
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    assert(eventField);

    // Count bullet points (should be max 5)
    const bulletCount = (eventField.value.match(/•/g) || []).length;
    assert(bulletCount <= 5, `Expected max 5 events, got ${bulletCount}`);
  });

  test('should handle no recent events', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES, []);
    assert(embed.fields);
    // Should not have events field or have empty value
    const eventField = embed.fields.find(f => f.name.includes('Recent Events'));
    if (eventField) {
      assert(eventField.value.includes('No recent events'));
    }
  });

  test('should include average pressure in footer', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    assert(embed.footer);
    assert(embed.footer.text.includes('Average Pressure'));
    assert(/\d+\.\d{2}/.test(embed.footer.text)); // Contains a decimal number
  });

  test('should include valid ISO timestamp', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    assert(embed.timestamp);

    const date = new Date(embed.timestamp);
    assert(!isNaN(date.getTime()));
    assert(date.getTime() > Date.now() - 10000); // Within last 10 seconds
  });

  test('should handle empty pressures', () => {
    const embed = renderGridEmbed({});
    assert.equal(embed.color, 0x00ff00); // Default to green (avg 0)
    assert(embed.footer!.text.includes('0.00'));
  });

  test('should include heat emojis in description', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    assert(embed.description.includes('🟢'));
    assert(embed.description.includes('🟡'));
    assert(embed.description.includes('🔴'));
  });

  test('should include row section headers', () => {
    const embed = renderGridEmbed(SAMPLE_PRESSURES);
    assert(embed.description.includes('**A Strategy**'));
    assert(embed.description.includes('**B Tactics**'));
    assert(embed.description.includes('**C Operations**'));
  });
});

describe('Heat Mapping', () => {
  test('should map cold pressure (0-0.29) to green emoji', () => {
    const coldPressures = { A1: 0.0, A2: 0.15, A3: 0.29 };
    const result = renderGrid(coldPressures);

    // Should have green emojis for these cells
    const lines = result.split('\n');
    const a1Line = lines.find(l => l.includes('A1'));
    assert(a1Line);
    assert(a1Line.includes('🟢'));
  });

  test('should map warm pressure (0.3-0.69) to yellow emoji', () => {
    const warmPressures = { B1: 0.3, B2: 0.5, B3: 0.69 };
    const result = renderGrid(warmPressures);

    const lines = result.split('\n');
    const b1Line = lines.find(l => l.includes('B1'));
    assert(b1Line);
    assert(b1Line.includes('🟡'));
  });

  test('should map hot pressure (0.7-1.0) to red emoji', () => {
    const hotPressures = { C1: 0.7, C2: 0.85, C3: 1.0 };
    const result = renderGrid(hotPressures);

    const lines = result.split('\n');
    const c1Line = lines.find(l => l.includes('C1'));
    assert(c1Line);
    assert(c1Line.includes('🔴'));
  });

  test('should handle boundary values correctly', () => {
    const boundaries = {
      A1: 0.299, // Cold (just below 0.3)
      A2: 0.300, // Warm (exactly 0.3)
      A3: 0.699, // Warm (just below 0.7)
      A4: 0.700, // Hot (exactly 0.7)
    };
    const result = renderGrid(boundaries);

    // Check that emojis follow boundary rules
    assert(result.includes('🟢')); // For 0.299
    assert(result.includes('🟡')); // For 0.3 and 0.699
    assert(result.includes('🔴')); // For 0.7
  });
});

describe('Timestamp Formatting (via events)', () => {
  test('should format very recent events as "just now"', () => {
    const events: RecentEvent[] = [{
      cellId: 'A1',
      type: 'test',
      timestamp: new Date(Date.now() - 10000), // 10 seconds ago
      description: 'Recent event',
    }];

    const embed = renderGridEmbed(SAMPLE_PRESSURES, events);
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    assert(eventField);
    assert(eventField.value.includes('just now'));
  });

  test('should format events in minutes', () => {
    const events: RecentEvent[] = [{
      cellId: 'A1',
      type: 'test',
      timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
      description: 'Minutes ago',
    }];

    const embed = renderGridEmbed(SAMPLE_PRESSURES, events);
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    assert(eventField);
    assert(/\d+m ago/.test(eventField.value));
  });

  test('should format events in hours', () => {
    const events: RecentEvent[] = [{
      cellId: 'A1',
      type: 'test',
      timestamp: new Date(Date.now() - 3 * 3600000), // 3 hours ago
      description: 'Hours ago',
    }];

    const embed = renderGridEmbed(SAMPLE_PRESSURES, events);
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    assert(eventField);
    assert(/\d+h ago/.test(eventField.value));
  });

  test('should format events in days', () => {
    const events: RecentEvent[] = [{
      cellId: 'A1',
      type: 'test',
      timestamp: new Date(Date.now() - 2 * 86400000), // 2 days ago
      description: 'Days ago',
    }];

    const embed = renderGridEmbed(SAMPLE_PRESSURES, events);
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    assert(eventField);
    assert(/\d+d ago/.test(eventField.value));
  });
});

describe('Edge Cases', () => {
  test('should handle negative pressure values', () => {
    const negativePressures = { A1: -0.5, A2: -1.0 };
    const result = renderGrid(negativePressures);
    assert(result.includes('-0.50'));
    assert(result.includes('-1.00'));
    // Should show as cold since negative < 0.3
    assert(result.includes('🟢'));
  });

  test('should handle pressure values above 1.0', () => {
    const highPressures = { A1: 1.5, A2: 2.0 };
    const result = renderGrid(highPressures);
    assert(result.includes('1.50'));
    assert(result.includes('2.00'));
    // Should show as hot since > 0.7
    assert(result.includes('🔴'));
  });

  test('should handle undefined cell IDs gracefully', () => {
    const invalidPressures = { Z99: 0.5 };
    const result = renderGrid(invalidPressures);
    // Should still render all valid cells with default 0.00
    GRID_CELLS.forEach(cell => {
      assert(result.includes(cell.id));
    });
  });

  test('should handle events with missing descriptions', () => {
    const events: RecentEvent[] = [{
      cellId: 'A1',
      type: 'test',
      timestamp: new Date(),
      // No description
    }];

    const embed = renderGridEmbed(SAMPLE_PRESSURES, events);
    const eventField = embed.fields!.find(f => f.name.includes('Recent Events'));
    assert(eventField);
    assert(eventField.value.includes('Event')); // Default description
  });

  test('should produce consistent output for same input', () => {
    const result1 = renderGrid(SAMPLE_PRESSURES);
    const result2 = renderGrid(SAMPLE_PRESSURES);

    // Grid rendering should be identical
    const gridPart1 = result1.split('Legend:')[0];
    const gridPart2 = result2.split('Legend:')[0];
    assert.equal(gridPart1, gridPart2);
  });
});

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════

console.log(`\n${passCount}/${testCount} tests passed`);

if (passCount === testCount) {
  console.log('\n✅ All tests passed!');
} else {
  console.log(`\n❌ ${testCount - passCount} test(s) failed`);
  process.exit(1);
}
