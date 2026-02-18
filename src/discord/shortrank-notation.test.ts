/**
 * src/discord/shortrank-notation.test.ts — Tests for ShortRank Intersection Notation
 */

import { describe, it, expect } from 'vitest';
import {
  TESSERACT_CELLS,
  detectCell,
  trustCategoriesToCell,
  intersection,
  autoIntersection,
  formatTweetWithIntersection,
  pivotalQuestion,
  cellToRoom,
  roomToCell,
} from './shortrank-notation.js';

describe('TESSERACT_CELLS', () => {
  it('contains all 12 cells', () => {
    const expected = ['A', 'B', 'C', 'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
    for (const code of expected) {
      expect(TESSERACT_CELLS[code]).toBeDefined();
      expect(TESSERACT_CELLS[code].code).toBe(code);
    }
  });

  it('each cell has required fields', () => {
    for (const cell of Object.values(TESSERACT_CELLS)) {
      expect(cell.code).toBeTruthy();
      expect(cell.emoji).toBeTruthy();
      expect(cell.parent).toBeTruthy();
      expect(cell.name).toBeTruthy();
      expect(cell.fullName).toBeTruthy();
      expect(cell.trustCategories).toBeInstanceOf(Array);
      expect(cell.room).toBeTruthy();
    }
  });
});

describe('detectCell', () => {
  it('detects security-related text as C1', () => {
    const result = detectCell('We need to improve security and authentication');
    expect(result.cell).toBe('C1');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects testing-related text as C2', () => {
    const result = detectCell('Add more tests and improve code quality with refactor');
    expect(result.cell).toBe('C2');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects budget-related text as A3', () => {
    const result = detectCell('We need to manage the budget and reduce cost');
    expect(result.cell).toBe('A3');
  });

  it('prefers specific cells over parent cells', () => {
    // 'strategy' matches A (parent), 'compliance' matches A1 (specific)
    const result = detectCell('compliance regulation');
    expect(result.cell).toBe('A1');
  });

  it('returns default B3 with low confidence when no keywords match', () => {
    const result = detectCell('xyzzy nothing relevant here');
    expect(result.cell).toBe('B3');
    expect(result.confidence).toBe(0.1);
  });

  it('caps confidence at 1.0', () => {
    // Many keywords for one cell
    const result = detectCell('test iterate ci review process quality refactor loop');
    expect(result.confidence).toBeLessThanOrEqual(1.0);
  });
});

describe('trustCategoriesToCell', () => {
  it('maps security categories to C1', () => {
    expect(trustCategoriesToCell(['security', 'reliability'])).toBe('C1');
  });

  it('maps compliance categories to A1', () => {
    expect(trustCategoriesToCell(['compliance', 'ethical_alignment'])).toBe('A1');
  });

  it('returns B3 for empty categories', () => {
    expect(trustCategoriesToCell([])).toBe('B3');
  });

  it('picks the cell with most votes', () => {
    // Two votes for B2, one for A2
    expect(trustCategoriesToCell(['communication', 'collaboration', 'domain_expertise'])).toBe('B2');
  });

  it('falls back to B3 for unknown categories', () => {
    expect(trustCategoriesToCell(['unknown_category'])).toBe('B3');
  });
});

describe('intersection', () => {
  it('creates intersection from valid cell codes', () => {
    const ix = intersection('B3', 'C1');
    expect(ix.source.code).toBe('B3');
    expect(ix.target.code).toBe('C1');
    expect(ix.compact).toBe('B3:C1');
    expect(ix.isSelfRef).toBe(false);
    expect(ix.notation).toContain('B3');
    expect(ix.notation).toContain('C1');
    expect(ix.notation).toContain('Tactics.Signal');
    expect(ix.notation).toContain('Operations.Grid');
  });

  it('detects self-reference', () => {
    const ix = intersection('A1', 'A1');
    expect(ix.isSelfRef).toBe(true);
    expect(ix.compact).toBe('A1:A1');
  });

  it('falls back to B3 for unknown cell codes', () => {
    const ix = intersection('ZZ', 'XX');
    expect(ix.source.code).toBe('B3');
    expect(ix.target.code).toBe('B3');
  });
});

describe('autoIntersection', () => {
  it('detects two different cells from mixed text', () => {
    const ix = autoIntersection('deploy the security pipeline and test the quality');
    expect(ix.source).toBeDefined();
    expect(ix.target).toBeDefined();
    expect(ix.compact).toMatch(/^[A-C]\d?:[A-C]\d?$/);
  });

  it('creates self-ref when only one cell matches', () => {
    const ix = autoIntersection('compliance regulation policy');
    expect(ix.isSelfRef).toBe(true);
  });

  it('defaults to B3 self-ref when nothing matches', () => {
    const ix = autoIntersection('xyzzy completely irrelevant');
    expect(ix.compact).toBe('B3:B3');
    expect(ix.isSelfRef).toBe(true);
  });
});

describe('formatTweetWithIntersection', () => {
  it('formats tweet with green emoji for high sovereignty', () => {
    const tweet = formatTweetWithIntersection('Pipeline complete.', 'B3', 'C1', 0.85);
    expect(tweet).toContain('🟢');
    expect(tweet).toContain('S:85%');
    expect(tweet).toContain('#IntentGuard');
    expect(tweet).toContain('Pipeline complete.');
    expect(tweet).toContain('Tactics.Signal');
  });

  it('formats tweet with yellow emoji for medium sovereignty', () => {
    const tweet = formatTweetWithIntersection('Status update.', 'A2', 'B1', 0.65);
    expect(tweet).toContain('🟡');
    expect(tweet).toContain('S:65%');
  });

  it('formats tweet with red emoji for low sovereignty', () => {
    const tweet = formatTweetWithIntersection('Warning.', 'C2', 'C3', 0.4);
    expect(tweet).toContain('🔴');
    expect(tweet).toContain('S:40%');
  });

  it('handles boundary at 0.8', () => {
    const tweet = formatTweetWithIntersection('Test.', 'A', 'B', 0.8);
    expect(tweet).toContain('🟢');
  });

  it('handles boundary at 0.6', () => {
    const tweet = formatTweetWithIntersection('Test.', 'A', 'B', 0.6);
    expect(tweet).toContain('🟡');
  });
});

describe('pivotalQuestion', () => {
  it('returns a question for a known cell', () => {
    const pq = pivotalQuestion('C1', 'deploying');
    expect(pq.question).toContain('secure');
    expect(pq.room).toBe('builder');
    expect(pq.predictedAnswer).toBeTruthy();
  });

  it('returns B3 template for unknown cell code', () => {
    const pq = pivotalQuestion('ZZ', 'anything');
    expect(pq.question).toContain('transparently');
    expect(pq.room).toBe('navigator');
  });

  it('returns correct room for each cell', () => {
    for (const [code, cell] of Object.entries(TESSERACT_CELLS)) {
      const pq = pivotalQuestion(code, 'context');
      expect(pq.room).toBe(cell.room);
    }
  });
});

describe('cellToRoom', () => {
  it('maps known cells to their rooms', () => {
    expect(cellToRoom('A1')).toBe('vault');
    expect(cellToRoom('B1')).toBe('navigator');
    expect(cellToRoom('B3')).toBe('voice');
    expect(cellToRoom('C2')).toBe('laboratory');
  });

  it('returns navigator for unknown cell', () => {
    expect(cellToRoom('ZZ')).toBe('navigator');
  });
});

describe('roomToCell', () => {
  it('finds cell by room name', () => {
    const cell = roomToCell('vault');
    expect(cell).toBeDefined();
    expect(cell!.code).toBe('A1');
  });

  it('returns undefined for unknown room', () => {
    expect(roomToCell('nonexistent')).toBeUndefined();
  });
});
