/**
 * Tests for Agent 0: Outcome Requirements Parser
 */

import { run } from './agent-0-outcome-requirements';
import { readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_OUTPUT_DIR = join(__dirname, '..', '..', 'test-output');

describe('Agent 0: Outcome Requirements Parser', () => {
  beforeAll(() => {
    if (!existsSync(TEST_OUTPUT_DIR)) {
      mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  test('should parse COMS.txt and extract requirements', async () => {
    await run(TEST_OUTPUT_DIR);

    const outputPath = join(TEST_OUTPUT_DIR, '0-outcome-requirements.json');
    expect(existsSync(outputPath)).toBe(true);

    const output = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(output.step).toBe(0);
    expect(output.name).toBe('outcome-requirements');
    expect(output.requirements).toBeInstanceOf(Array);
    expect(output.requirements.length).toBeGreaterThan(0);
  });

  test('should extract grade system metadata', async () => {
    await run(TEST_OUTPUT_DIR);

    const outputPath = join(TEST_OUTPUT_DIR, '0-outcome-requirements.json');
    const output = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(output.metadata.gradeSystem).toBeDefined();
    expect(output.metadata.gradeSystem.A).toContain('500');
    expect(output.metadata.gradeSystem.B).toContain('1500');
    expect(output.metadata.gradeSystem.C).toContain('3000');
    expect(output.metadata.gradeSystem.D).toContain('3001');
  });

  test('should define SQLite schema requirements', async () => {
    await run(TEST_OUTPUT_DIR);

    const outputPath = join(TEST_OUTPUT_DIR, '0-outcome-requirements.json');
    const output = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(output.schemaRequirements).toBeInstanceOf(Array);
    expect(output.schemaRequirements.length).toBeGreaterThan(0);

    const categoriesTable = output.schemaRequirements.find(
      (s: any) => s.table === 'categories'
    );
    expect(categoriesTable).toBeDefined();
    expect(categoriesTable.columns).toBeInstanceOf(Array);
    expect(categoriesTable.indexes).toBeInstanceOf(Array);

    const keywordsTable = output.schemaRequirements.find(
      (s: any) => s.table === 'keywords'
    );
    expect(keywordsTable).toBeDefined();

    const matrixTable = output.schemaRequirements.find(
      (s: any) => s.table === 'matrix_cells'
    );
    expect(matrixTable).toBeDefined();
  });

  test('should group requirements by responsible agent', async () => {
    await run(TEST_OUTPUT_DIR);

    const outputPath = join(TEST_OUTPUT_DIR, '0-outcome-requirements.json');
    const output = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(output.agentResponsibilities).toBeDefined();
    expect(typeof output.agentResponsibilities).toBe('object');

    // Check that agents 0-7 have responsibilities
    for (let i = 0; i <= 7; i++) {
      if (output.agentResponsibilities[i]) {
        expect(output.agentResponsibilities[i]).toBeInstanceOf(Array);
      }
    }
  });

  test('should calculate statistics correctly', async () => {
    await run(TEST_OUTPUT_DIR);

    const outputPath = join(TEST_OUTPUT_DIR, '0-outcome-requirements.json');
    const output = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(output.stats).toBeDefined();
    expect(output.stats.totalRequirements).toBeGreaterThan(0);
    expect(output.stats.implemented).toBeGreaterThanOrEqual(0);
    expect(output.stats.partial).toBeGreaterThanOrEqual(0);
    expect(output.stats.missing).toBeGreaterThanOrEqual(0);
    expect(output.stats.criticalRequirements).toBeGreaterThan(0);

    // Total should equal sum of statuses
    const sum = output.stats.implemented + output.stats.partial + output.stats.missing;
    expect(sum).toBe(output.stats.totalRequirements);
  });

  test('should extract patent formula from COMS', async () => {
    await run(TEST_OUTPUT_DIR);

    const outputPath = join(TEST_OUTPUT_DIR, '0-outcome-requirements.json');
    const output = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(output.metadata.patentFormula).toBeDefined();
    expect(output.metadata.patentFormula).toContain('Intent');
    expect(output.metadata.patentFormula).toContain('Reality');
  });

  test('should identify critical visual coherence requirements', async () => {
    await run(TEST_OUTPUT_DIR);

    const outputPath = join(TEST_OUTPUT_DIR, '0-outcome-requirements.json');
    const output = JSON.parse(readFileSync(outputPath, 'utf-8'));

    const visualReq = output.requirements.find(
      (r: any) => r.id === 'REQ-VISUAL-1'
    );
    expect(visualReq).toBeDefined();
    expect(visualReq.priority).toBe('critical');
    expect(visualReq.responsibleAgent).toBe(7);
  });

  test('should identify ShortLex validation requirements', async () => {
    await run(TEST_OUTPUT_DIR);

    const outputPath = join(TEST_OUTPUT_DIR, '0-outcome-requirements.json');
    const output = JSON.parse(readFileSync(outputPath, 'utf-8'));

    const shortlexReq = output.requirements.find(
      (r: any) => r.id === 'REQ-SHORTLEX-1'
    );
    expect(shortlexReq).toBeDefined();
    expect(shortlexReq.priority).toBe('critical');
    expect(shortlexReq.responsibleAgent).toBe(3);
  });

  test('should extract orthogonality target', async () => {
    await run(TEST_OUTPUT_DIR);

    const outputPath = join(TEST_OUTPUT_DIR, '0-outcome-requirements.json');
    const output = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(output.metadata.orthogonalityTarget).toBeDefined();
    expect(output.metadata.orthogonalityTarget).toMatch(/<?\d+%/);
  });

  test('should output valid JSON', async () => {
    await run(TEST_OUTPUT_DIR);

    const outputPath = join(TEST_OUTPUT_DIR, '0-outcome-requirements.json');
    const content = readFileSync(outputPath, 'utf-8');

    // Should not throw
    expect(() => JSON.parse(content)).not.toThrow();

    const output = JSON.parse(content);
    expect(output).toBeDefined();
    expect(typeof output).toBe('object');
  });
});
