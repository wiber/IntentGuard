/**
 * src/pipeline/step-3.test.ts — Tests for ShortLex Validation & Matrix Building
 *
 * Test coverage:
 * 1. ShortLex ordering validation (correct and incorrect cases)
 * 2. Matrix dimensions and cell count validation
 * 3. Asymmetric matrix structure (Upper△, Lower△, Diagonal)
 * 4. Asymmetry ratio calculation (12.98x target)
 * 5. Double-walled submatrix identification
 * 6. Category sorting by ShortLex rules
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { run } from './step-3.js';

const TEST_RUN_DIR = '/tmp/intentguard-test-run';
const TEST_STEP_DIR = '/tmp/intentguard-test-step-3';

describe('Agent 3: ShortLex Validation & Matrix Building', () => {
  beforeEach(() => {
    // Clean up test directories
    [TEST_RUN_DIR, TEST_STEP_DIR].forEach((dir) => {
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
    });
  });

  describe('ShortLex Ordering', () => {
    it('should validate correct ShortLex ordering (A → A.1 → A.2 → B)', () => {
      const categories = [
        { id: 'A🚀', name: 'CoreEngine', emoji: '🚀', fullName: 'A🚀 CoreEngine', position: 1, trustDebtUnits: 100, percentage: 20 },
        { id: 'A🚀.1⚡', name: 'Algorithm', emoji: '⚡', fullName: 'A🚀.1⚡ Algorithm', position: 2, parentId: 'A🚀', trustDebtUnits: 50, percentage: 10 },
        { id: 'A🚀.2🔥', name: 'Performance', emoji: '🔥', fullName: 'A🚀.2🔥 Performance', position: 3, parentId: 'A🚀', trustDebtUnits: 50, percentage: 10 },
        { id: 'B🔒', name: 'Security', emoji: '🔒', fullName: 'B🔒 Security', position: 4, trustDebtUnits: 100, percentage: 20 },
      ];

      // Create step-2 output with correct ordering
      const step2Dir = join(TEST_RUN_DIR, '2-categories-balanced');
      mkdirSync(step2Dir, { recursive: true });
      writeFileSync(
        join(step2Dir, '2-categories-balanced.json'),
        JSON.stringify({ step: 2, categories }, null, 2),
      );

      // Run step 3
      expect(async () => await run(TEST_RUN_DIR, TEST_STEP_DIR)).not.toThrow();

      // Read output
      const output = JSON.parse(readFileSync(join(TEST_STEP_DIR, '3-presence-matrix.json'), 'utf-8'));

      // Validate ShortLex ordering
      expect(output.validation.shortLexOrdering).toBe(true);
    });

    it('should reject incorrect ShortLex ordering (A.1 → A)', () => {
      const categories = [
        { id: 'A🚀.1⚡', name: 'Algorithm', emoji: '⚡', fullName: 'A🚀.1⚡ Algorithm', position: 1, parentId: 'A🚀', trustDebtUnits: 50, percentage: 10 },
        { id: 'A🚀', name: 'CoreEngine', emoji: '🚀', fullName: 'A🚀 CoreEngine', position: 2, trustDebtUnits: 100, percentage: 20 },
      ];

      // Create step-2 output with incorrect ordering
      const step2Dir = join(TEST_RUN_DIR, '2-categories-balanced');
      mkdirSync(step2Dir, { recursive: true });
      writeFileSync(
        join(step2Dir, '2-categories-balanced.json'),
        JSON.stringify({ step: 2, categories }, null, 2),
      );

      // Run step 3 - should auto-fix by sorting
      await run(TEST_RUN_DIR, TEST_STEP_DIR);

      // Read output
      const output = JSON.parse(readFileSync(join(TEST_STEP_DIR, '3-presence-matrix.json'), 'utf-8'));

      // After auto-sorting, validation should pass
      expect(output.validation.shortLexOrdering).toBe(true);

      // Verify correct order after sorting
      expect(output.categories[0].id).toBe('A🚀');
      expect(output.categories[1].id).toBe('A🚀.1⚡');
    });

    it('should sort categories by ShortLex: shorter first, then alphabetical', () => {
      const categories = [
        { id: 'C💨', name: 'Speed', emoji: '💨', fullName: 'C💨 Speed', position: 1, trustDebtUnits: 100, percentage: 20 },
        { id: 'A🚀', name: 'CoreEngine', emoji: '🚀', fullName: 'A🚀 CoreEngine', position: 2, trustDebtUnits: 100, percentage: 20 },
        { id: 'B🔒.1🔐', name: 'Encryption', emoji: '🔐', fullName: 'B🔒.1🔐 Encryption', position: 3, parentId: 'B🔒', trustDebtUnits: 50, percentage: 10 },
        { id: 'B🔒', name: 'Security', emoji: '🔒', fullName: 'B🔒 Security', position: 4, trustDebtUnits: 100, percentage: 20 },
      ];

      // Create step-2 output
      const step2Dir = join(TEST_RUN_DIR, '2-categories-balanced');
      mkdirSync(step2Dir, { recursive: true });
      writeFileSync(
        join(step2Dir, '2-categories-balanced.json'),
        JSON.stringify({ step: 2, categories }, null, 2),
      );

      // Run step 3
      await run(TEST_RUN_DIR, TEST_STEP_DIR);

      // Read output
      const output = JSON.parse(readFileSync(join(TEST_STEP_DIR, '3-presence-matrix.json'), 'utf-8'));

      // Expected order: A🚀, B🔒, C💨, B🔒.1🔐 (parents first, then alphabetical, then children)
      const ids = output.categories.map((c: any) => c.id);
      expect(ids[0]).toBe('A🚀');
      expect(ids[1]).toBe('B🔒');
      expect(ids[2]).toBe('C💨');
      expect(ids[3]).toBe('B🔒.1🔐');
    });
  });

  describe('Matrix Dimensions', () => {
    it('should build NxN matrix with correct cell count', () => {
      const categories = createTestCategories(5);

      // Create step-2 output
      const step2Dir = join(TEST_RUN_DIR, '2-categories-balanced');
      mkdirSync(step2Dir, { recursive: true });
      writeFileSync(
        join(step2Dir, '2-categories-balanced.json'),
        JSON.stringify({ step: 2, categories }, null, 2),
      );

      // Run step 3
      await run(TEST_RUN_DIR, TEST_STEP_DIR);

      // Read output
      const output = JSON.parse(readFileSync(join(TEST_STEP_DIR, '3-presence-matrix.json'), 'utf-8'));

      // Validate dimensions
      expect(output.matrix.dimensions.rows).toBe(5);
      expect(output.matrix.dimensions.cols).toBe(5);
      expect(output.matrix.dimensions.totalCells).toBe(25);
      expect(output.matrix.cells.length).toBe(25);
      expect(output.validation.cellCount).toBe(true);
    });

    it('should support 25x25 matrix', () => {
      const categories = createTestCategories(25);

      // Create step-2 output
      const step2Dir = join(TEST_RUN_DIR, '2-categories-balanced');
      mkdirSync(step2Dir, { recursive: true });
      writeFileSync(
        join(step2Dir, '2-categories-balanced.json'),
        JSON.stringify({ step: 2, categories }, null, 2),
      );

      // Run step 3
      await run(TEST_RUN_DIR, TEST_STEP_DIR);

      // Read output
      const output = JSON.parse(readFileSync(join(TEST_STEP_DIR, '3-presence-matrix.json'), 'utf-8'));

      expect(output.matrix.dimensions.rows).toBe(25);
      expect(output.matrix.dimensions.cols).toBe(25);
      expect(output.matrix.cells.length).toBe(625);
      expect(output.validation.matrixDimensions).toBe(true);
    });
  });

  describe('Asymmetric Matrix Structure', () => {
    it('should populate Upper△, Lower△, and Diagonal correctly', () => {
      const categories = createTestCategories(5);

      // Create step-2 output
      const step2Dir = join(TEST_RUN_DIR, '2-categories-balanced');
      mkdirSync(step2Dir, { recursive: true });
      writeFileSync(
        join(step2Dir, '2-categories-balanced.json'),
        JSON.stringify({ step: 2, categories }, null, 2),
      );

      // Run step 3
      await run(TEST_RUN_DIR, TEST_STEP_DIR);

      // Read output
      const output = JSON.parse(readFileSync(join(TEST_STEP_DIR, '3-presence-matrix.json'), 'utf-8'));

      // Count cells by triangle
      const upperCells = output.matrix.cells.filter((c: any) => c.triangle === 'upper');
      const lowerCells = output.matrix.cells.filter((c: any) => c.triangle === 'lower');
      const diagonalCells = output.matrix.cells.filter((c: any) => c.triangle === 'diagonal');

      // For 5x5 matrix: Upper = 10, Lower = 10, Diagonal = 5
      expect(upperCells.length).toBe(10);
      expect(lowerCells.length).toBe(10);
      expect(diagonalCells.length).toBe(5);

      // Validate that upper triangle has more reality than intent
      const avgUpperReality = upperCells.reduce((sum: number, c: any) => sum + c.realityValue, 0) / upperCells.length;
      const avgUpperIntent = upperCells.reduce((sum: number, c: any) => sum + c.intentValue, 0) / upperCells.length;
      expect(avgUpperReality).toBeGreaterThan(avgUpperIntent);

      // Validate that lower triangle has more intent than reality
      const avgLowerIntent = lowerCells.reduce((sum: number, c: any) => sum + c.intentValue, 0) / lowerCells.length;
      const avgLowerReality = lowerCells.reduce((sum: number, c: any) => sum + c.realityValue, 0) / lowerCells.length;
      expect(avgLowerIntent).toBeGreaterThan(avgLowerReality);
    });

    it('should calculate asymmetry ratio close to 12.98x target', () => {
      const categories = createTestCategories(45);

      // Create step-2 output
      const step2Dir = join(TEST_RUN_DIR, '2-categories-balanced');
      mkdirSync(step2Dir, { recursive: true });
      writeFileSync(
        join(step2Dir, '2-categories-balanced.json'),
        JSON.stringify({ step: 2, categories }, null, 2),
      );

      // Run step 3
      await run(TEST_RUN_DIR, TEST_STEP_DIR);

      // Read output
      const output = JSON.parse(readFileSync(join(TEST_STEP_DIR, '3-presence-matrix.json'), 'utf-8'));

      // Asymmetry ratio should be close to 12.98x
      expect(output.matrix.statistics.targetAsymmetryRatio).toBe(12.98);
      expect(output.matrix.statistics.asymmetryRatio).toBeGreaterThan(10);
      expect(output.matrix.statistics.asymmetryRatio).toBeLessThan(15);

      // Asymmetry error should be < 1%
      expect(output.matrix.statistics.asymmetryError).toBeLessThan(0.01);
      expect(output.validation.asymmetryRatioValid).toBe(true);
    });
  });

  describe('Double-Walled Submatrices', () => {
    it('should identify parent category boundaries', () => {
      const categories = [
        { id: 'A🚀', name: 'CoreEngine', emoji: '🚀', fullName: 'A🚀 CoreEngine', position: 1, trustDebtUnits: 100, percentage: 20 },
        { id: 'A🚀.1⚡', name: 'Algorithm', emoji: '⚡', fullName: 'A🚀.1⚡ Algorithm', position: 2, parentId: 'A🚀', trustDebtUnits: 50, percentage: 10 },
        { id: 'A🚀.2🔥', name: 'Performance', emoji: '🔥', fullName: 'A🚀.2🔥 Performance', position: 3, parentId: 'A🚀', trustDebtUnits: 50, percentage: 10 },
        { id: 'B🔒', name: 'Security', emoji: '🔒', fullName: 'B🔒 Security', position: 4, trustDebtUnits: 100, percentage: 20 },
        { id: 'B🔒.1🔐', name: 'Encryption', emoji: '🔐', fullName: 'B🔒.1🔐 Encryption', position: 5, parentId: 'B🔒', trustDebtUnits: 50, percentage: 10 },
      ];

      // Create step-2 output
      const step2Dir = join(TEST_RUN_DIR, '2-categories-balanced');
      mkdirSync(step2Dir, { recursive: true });
      writeFileSync(
        join(step2Dir, '2-categories-balanced.json'),
        JSON.stringify({ step: 2, categories }, null, 2),
      );

      // Run step 3
      await run(TEST_RUN_DIR, TEST_STEP_DIR);

      // Read output
      const output = JSON.parse(readFileSync(join(TEST_STEP_DIR, '3-presence-matrix.json'), 'utf-8'));

      // Should identify 2 submatrices: A🚀 (rows 0-2) and B🔒 (rows 3-4)
      expect(output.doubleWalledSubmatrices.length).toBe(2);

      const aSubmatrix = output.doubleWalledSubmatrices.find((s: any) => s.parentId === 'A🚀');
      expect(aSubmatrix).toBeDefined();
      expect(aSubmatrix.startRow).toBe(0);
      expect(aSubmatrix.endRow).toBe(2);
      expect(aSubmatrix.color).toBe('#ff6b6b');

      const bSubmatrix = output.doubleWalledSubmatrices.find((s: any) => s.parentId === 'B🔒');
      expect(bSubmatrix).toBeDefined();
      expect(bSubmatrix.startRow).toBe(3);
      expect(bSubmatrix.endRow).toBe(4);
      expect(bSubmatrix.color).toBe('#4ecdc4');

      expect(output.validation.doubleWalledSubmatrices).toBe(true);
    });

    it('should assign correct colors to matrix cells', () => {
      const categories = [
        { id: 'A🚀', name: 'CoreEngine', emoji: '🚀', fullName: 'A🚀 CoreEngine', position: 1, trustDebtUnits: 100, percentage: 20 },
        { id: 'A🚀.1⚡', name: 'Algorithm', emoji: '⚡', fullName: 'A🚀.1⚡ Algorithm', position: 2, parentId: 'A🚀', trustDebtUnits: 50, percentage: 10 },
      ];

      // Create step-2 output
      const step2Dir = join(TEST_RUN_DIR, '2-categories-balanced');
      mkdirSync(step2Dir, { recursive: true });
      writeFileSync(
        join(step2Dir, '2-categories-balanced.json'),
        JSON.stringify({ step: 2, categories }, null, 2),
      );

      // Run step 3
      await run(TEST_RUN_DIR, TEST_STEP_DIR);

      // Read output
      const output = JSON.parse(readFileSync(join(TEST_STEP_DIR, '3-presence-matrix.json'), 'utf-8'));

      // All cells should have A🚀 parent color
      const allCellsHaveColor = output.matrix.cells.every((c: any) => c.cellColor === '#ff6b6b');
      expect(allCellsHaveColor).toBe(true);
    });
  });

  describe('Integration with Pipeline', () => {
    it('should produce valid JSON output for Agent 4', () => {
      const categories = createTestCategories(25);

      // Create step-2 output
      const step2Dir = join(TEST_RUN_DIR, '2-categories-balanced');
      mkdirSync(step2Dir, { recursive: true });
      writeFileSync(
        join(step2Dir, '2-categories-balanced.json'),
        JSON.stringify({ step: 2, categories }, null, 2),
      );

      // Run step 3
      await run(TEST_RUN_DIR, TEST_STEP_DIR);

      // Read output
      const output = JSON.parse(readFileSync(join(TEST_STEP_DIR, '3-presence-matrix.json'), 'utf-8'));

      // Validate output structure for Agent 4
      expect(output.step).toBe(3);
      expect(output.name).toBe('presence-matrix');
      expect(output.timestamp).toBeDefined();
      expect(output.categories).toBeInstanceOf(Array);
      expect(output.matrix).toBeDefined();
      expect(output.matrix.cells).toBeInstanceOf(Array);
      expect(output.matrix.statistics).toBeDefined();
      expect(output.validation).toBeDefined();
      expect(output.doubleWalledSubmatrices).toBeInstanceOf(Array);

      // All validation checks should pass for 25x25 matrix
      expect(output.validation.shortLexOrdering).toBe(true);
      expect(output.validation.matrixDimensions).toBe(true);
      expect(output.validation.cellCount).toBe(true);
    });
  });
});

// Helper function to create test categories
function createTestCategories(n: number): any[] {
  const categories = [];
  const parentCount = Math.min(5, Math.ceil(n / 5));
  const childrenPerParent = Math.floor((n - parentCount) / parentCount);

  const parentIds = ['A🚀', 'B🔒', 'C💨', 'D🧠', 'E🎨'];
  const parentNames = ['CoreEngine', 'Security', 'Speed', 'Intelligence', 'Design'];
  const childEmojis = ['⚡', '🔥', '💎', '🎯', '🌟', '🔧', '📊', '🎨'];

  let position = 1;

  // Create parent categories
  for (let i = 0; i < parentCount; i++) {
    categories.push({
      id: parentIds[i],
      name: parentNames[i],
      emoji: parentIds[i].replace(/[^🚀🔒💨🧠🎨]/g, ''),
      fullName: `${parentIds[i]} ${parentNames[i]}`,
      position: position++,
      trustDebtUnits: 100,
      percentage: 100 / n,
    });

    // Create children for this parent
    for (let j = 0; j < childrenPerParent; j++) {
      if (categories.length >= n) break;

      const childId = `${parentIds[i]}.${j + 1}${childEmojis[j % childEmojis.length]}`;
      categories.push({
        id: childId,
        name: `Child${j + 1}`,
        emoji: childEmojis[j % childEmojis.length],
        fullName: `${childId} Child${j + 1}`,
        position: position++,
        parentId: parentIds[i],
        trustDebtUnits: 50,
        percentage: 50 / n,
      });
    }
  }

  return categories.slice(0, n);
}
