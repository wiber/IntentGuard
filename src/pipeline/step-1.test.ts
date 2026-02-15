/**
 * Tests for step-1.ts — Database Indexer & Keyword Extractor
 */

import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { run } from './step-1';

describe('step-1: Database Indexer & Keyword Extractor', () => {
  const testDir = join(__dirname, '../../test-output/step-1-test');
  const runDir = join(testDir, 'run');
  const stepDir = join(runDir, '1-indexed-keywords');
  const projectRoot = testDir;
  const docsDir = join(projectRoot, 'docs');
  const srcDir = join(projectRoot, 'src');
  const dbPath = join(runDir, 'trust-debt-pipeline.db');

  beforeEach(() => {
    // Clean and create test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(runDir, { recursive: true });
    mkdirSync(stepDir, { recursive: true });
    mkdirSync(docsDir, { recursive: true });
    mkdirSync(srcDir, { recursive: true });

    // Create test documents
    writeFileSync(
      join(docsDir, 'architecture.md'),
      '# System Architecture\n\nThis document describes the core architecture and algorithm design.\nWe prioritize security, authentication, and authorization.\nOur strategy focuses on performance optimization and caching.'
    );

    writeFileSync(
      join(docsDir, 'strategy.md'),
      '# Business Strategy\n\nOur governance model emphasizes quality metrics and documentation excellence.'
    );

    writeFileSync(
      join(srcDir, 'core.ts'),
      'export class CoreEngine {\n  // Core algorithm implementation\n  optimize() { /* optimization logic */ }\n}'
    );

    writeFileSync(
      join(srcDir, 'auth.ts'),
      'export class AuthService {\n  authenticate() { /* authentication */ }\n  authorize() { /* authorization */ }\n}'
    );

    writeFileSync(
      join(srcDir, 'database.ts'),
      'import Database from "better-sqlite3";\nexport class DatabaseManager { /* database integration */ }'
    );
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create SQLite database with correct schema', async () => {
    await run(runDir, stepDir);

    expect(existsSync(dbPath)).toBe(true);

    const db = new Database(dbPath, { readonly: true });

    // Check tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('categories');
    expect(tableNames).toContain('keywords');
    expect(tableNames).toContain('keyword_mappings');
    expect(tableNames).toContain('matrix_cells');

    db.close();
  });

  it('should populate exactly 45 categories in ShortLex order', async () => {
    await run(runDir, stepDir);

    const db = new Database(dbPath, { readonly: true });
    const categories = db.prepare('SELECT * FROM categories ORDER BY id').all() as Array<{
      id: number;
      code: string;
      name: string;
      parent_id: number | null;
    }>;

    expect(categories.length).toBe(45);

    // Verify first few categories follow ShortLex order
    expect(categories[0].code).toBe('A🚀');
    expect(categories[0].name).toBe('CoreEngine');
    expect(categories[0].parent_id).toBeNull();

    expect(categories[1].code).toBe('A🚀.1⚡');
    expect(categories[1].name).toBe('Algorithm');
    expect(categories[1].parent_id).toBe(1);

    expect(categories[9].code).toBe('B🔒');
    expect(categories[9].parent_id).toBeNull();

    // Verify last category
    expect(categories[44].code).toBe('E🎨.8🌟');
    expect(categories[44].name).toBe('Excellence');
    expect(categories[44].parent_id).toBe(37);

    db.close();
  });

  it('should initialize 45x45 asymmetric matrix (2025 cells)', async () => {
    await run(runDir, stepDir);

    const db = new Database(dbPath, { readonly: true });
    const cellCount = db.prepare('SELECT COUNT(*) as count FROM matrix_cells').get() as { count: number };

    expect(cellCount.count).toBe(2025); // 45 × 45

    // Verify triangle flags
    const upperCount = db.prepare('SELECT COUNT(*) as count FROM matrix_cells WHERE is_upper_triangle = 1').get() as { count: number };
    const lowerCount = db.prepare('SELECT COUNT(*) as count FROM matrix_cells WHERE is_lower_triangle = 1').get() as { count: number };
    const diagonalCount = db.prepare('SELECT COUNT(*) as count FROM matrix_cells WHERE is_diagonal = 1').get() as { count: number };

    expect(upperCount.count).toBe(990); // (45 × 44) / 2
    expect(lowerCount.count).toBe(990); // (45 × 44) / 2
    expect(diagonalCount.count).toBe(45);

    db.close();
  });

  it('should extract keywords from intent and reality sources', async () => {
    await run(runDir, stepDir);

    const db = new Database(dbPath, { readonly: true });
    const keywords = db.prepare('SELECT * FROM keywords WHERE total_count > 0 ORDER BY total_count DESC').all() as Array<{
      keyword: string;
      total_count: number;
    }>;

    expect(keywords.length).toBeGreaterThan(0);

    // Verify specific keywords are detected
    const keywordMap = new Map(keywords.map(k => [k.keyword, k.total_count]));
    expect(keywordMap.has('architecture')).toBe(true);
    expect(keywordMap.has('security')).toBe(true);
    expect(keywordMap.has('authentication')).toBe(true);
    expect(keywordMap.has('optimization')).toBe(true);

    db.close();
  });

  it('should create keyword mappings with intent/reality counts', async () => {
    await run(runDir, stepDir);

    const db = new Database(dbPath, { readonly: true });
    const mappings = db.prepare(`
      SELECT
        k.keyword,
        c.code as category_code,
        km.intent_count,
        km.reality_count,
        km.total_count
      FROM keyword_mappings km
      JOIN keywords k ON km.keyword_id = k.id
      JOIN categories c ON km.category_id = c.id
      WHERE km.total_count > 0
    `).all() as Array<{
      keyword: string;
      category_code: string;
      intent_count: number;
      reality_count: number;
      total_count: number;
    }>;

    expect(mappings.length).toBeGreaterThan(0);

    // Verify intent/reality split
    const authMapping = mappings.find(m => m.keyword === 'authentication');
    if (authMapping) {
      expect(authMapping.intent_count).toBeGreaterThan(0);
      expect(authMapping.reality_count).toBeGreaterThan(0);
      expect(authMapping.total_count).toBe(authMapping.intent_count + authMapping.reality_count);
    }

    db.close();
  });

  it('should generate 1-indexed-keywords.json with correct structure', async () => {
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '1-indexed-keywords.json');
    expect(existsSync(outputPath)).toBe(true);

    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(result.step).toBe(1);
    expect(result.name).toBe('database-indexing-keyword-extraction');
    expect(result.timestamp).toBeDefined();

    expect(result.database).toBeDefined();
    expect(result.database.categories).toBe(45);
    expect(result.database.keywords).toBeGreaterThan(0);
    expect(result.database.mappings).toBeGreaterThan(0);

    expect(result.statistics).toBeDefined();
    expect(result.statistics.intentOccurrences).toBeGreaterThan(0);
    expect(result.statistics.realityOccurrences).toBeGreaterThan(0);
    expect(result.statistics.asymmetryRatio).toBeGreaterThan(0);
    expect(result.statistics.categoryCoverage).toBeGreaterThan(0);

    expect(result.categories).toBeDefined();
    expect(result.categories.length).toBe(45);

    expect(result.topKeywords).toBeDefined();
    expect(Array.isArray(result.topKeywords)).toBe(true);
  });

  it('should calculate asymmetry ratio correctly', async () => {
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '1-indexed-keywords.json');
    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));

    const { intentOccurrences, realityOccurrences, asymmetryRatio } = result.statistics;

    expect(asymmetryRatio).toBeCloseTo(realityOccurrences / intentOccurrences, 2);
  });

  it('should create database indexes for performance', async () => {
    await run(runDir, stepDir);

    const db = new Database(dbPath, { readonly: true });
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>;
    const indexNames = indexes.map(i => i.name);

    expect(indexNames).toContain('idx_keywords_keyword');
    expect(indexNames).toContain('idx_mappings_keyword');
    expect(indexNames).toContain('idx_mappings_category');
    expect(indexNames).toContain('idx_matrix_row');
    expect(indexNames).toContain('idx_matrix_col');

    db.close();
  });

  it('should handle missing directories gracefully', async () => {
    // Remove docs and src directories
    rmSync(docsDir, { recursive: true, force: true });
    rmSync(srcDir, { recursive: true, force: true });

    await run(runDir, stepDir);

    // Should still create database with structure, just no keyword occurrences
    expect(existsSync(dbPath)).toBe(true);

    const db = new Database(dbPath, { readonly: true });
    const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
    expect(categories.count).toBe(45);

    db.close();
  });

  it('should produce consistent category structure', async () => {
    await run(runDir, stepDir);

    const db = new Database(dbPath, { readonly: true });

    // Verify parent-child relationships
    const coreEngineChildren = db.prepare(`
      SELECT code FROM categories WHERE parent_id = 1 ORDER BY id
    `).all() as Array<{ code: string }>;

    expect(coreEngineChildren.length).toBe(8);
    expect(coreEngineChildren[0].code).toBe('A🚀.1⚡');
    expect(coreEngineChildren[7].code).toBe('A🚀.8⚙️');

    // Verify all parent categories
    const parents = db.prepare(`
      SELECT code FROM categories WHERE parent_id IS NULL ORDER BY id
    `).all() as Array<{ code: string }>;

    expect(parents.length).toBe(5);
    expect(parents.map(p => p.code)).toEqual(['A🚀', 'B🔒', 'C💨', 'D🧠', 'E🎨']);

    db.close();
  });

  it('should track top keywords across categories', async () => {
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '1-indexed-keywords.json');
    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));

    const topKeywords = result.topKeywords;
    expect(topKeywords.length).toBeGreaterThan(0);
    expect(topKeywords.length).toBeLessThanOrEqual(20);

    // Verify structure
    for (const kw of topKeywords) {
      expect(kw.keyword).toBeDefined();
      expect(kw.count).toBeGreaterThan(0);
      expect(Array.isArray(kw.categories)).toBe(true);
      expect(kw.categories.length).toBeGreaterThan(0);
    }
  });
});
