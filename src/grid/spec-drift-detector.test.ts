/**
 * spec-drift-detector.test.ts — Tests for 12×12 spec drift signal
 */

import { describe, it, expect } from 'vitest';
import { generateDriftSignal, CELL_MAPPINGS } from './spec-drift-detector.js';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '..', '..');

describe('spec-drift-detector', () => {
  it('should define exactly 12 cell mappings', () => {
    expect(CELL_MAPPINGS).toHaveLength(12);
  });

  it('should cover all 3 rows (Strategy, Tactics, Operations)', () => {
    const rows = new Set(CELL_MAPPINGS.map(m => m.row));
    expect(rows).toEqual(new Set(['Strategy', 'Tactics', 'Operations']));
  });

  it('should have unique cell IDs', () => {
    const ids = CELL_MAPPINGS.map(m => m.cellId);
    expect(new Set(ids).size).toBe(12);
  });

  it('should map all cells to cognitive rooms', () => {
    for (const mapping of CELL_MAPPINGS) {
      expect(mapping.room).toBeTruthy();
      expect(typeof mapping.room).toBe('string');
    }
  });

  it('should generate a drift signal from repo root', () => {
    const signal = generateDriftSignal(REPO_ROOT);

    expect(signal.timestamp).toBeTruthy();
    expect(signal.cells).toHaveLength(12);
    expect(typeof signal.overallDrift).toBe('number');
    expect(signal.overallDrift).toBeGreaterThanOrEqual(0);
    expect(signal.overallDrift).toBeLessThanOrEqual(1);
    expect(signal.gridAscii).toContain('Strategy');
    expect(signal.gridAscii).toContain('Tactics');
    expect(signal.gridAscii).toContain('Operations');
    expect(signal.focusRecommendation).toBeTruthy();
  });

  it('should produce valid drift scores for each cell', () => {
    const signal = generateDriftSignal(REPO_ROOT);

    for (const cell of signal.cells) {
      expect(cell.driftScore).toBeGreaterThanOrEqual(0);
      expect(cell.driftScore).toBeLessThanOrEqual(1);
      expect(['spec_ahead', 'repo_ahead', 'aligned', 'both_cold']).toContain(cell.driftDirection);
      expect(cell.recommendation).toBeTruthy();
    }
  });

  it('should identify hot cells (spec > repo)', () => {
    const signal = generateDriftSignal(REPO_ROOT);
    // Hot cells should be a subset of all cell IDs
    const allIds = signal.cells.map(c => c.cellId);
    for (const hot of signal.hotCells) {
      expect(allIds).toContain(hot);
    }
  });

  it('should include intent data with spec mentions', () => {
    const signal = generateDriftSignal(REPO_ROOT);
    // At least some cells should have spec mentions (we have a spec)
    const totalMentions = signal.cells.reduce((sum, c) => sum + c.intent.specMentions, 0);
    expect(totalMentions).toBeGreaterThan(0);
  });

  it('should include reality data with file counts', () => {
    const signal = generateDriftSignal(REPO_ROOT);
    // At least some cells should have files (we have a repo)
    const totalFiles = signal.cells.reduce((sum, c) => sum + c.reality.fileCount, 0);
    expect(totalFiles).toBeGreaterThan(0);
  });

  it('should render ASCII grid with all 12 cells', () => {
    const signal = generateDriftSignal(REPO_ROOT);
    const grid = signal.gridAscii;

    // Check all cell labels appear
    for (const mapping of CELL_MAPPINGS) {
      expect(grid).toContain(mapping.label);
    }
  });
});
