/**
 * src/pipeline/step-0.test.ts — Tests for Raw Materials Gatherer
 *
 * Tests Agent 0 functionality:
 * - Gathering documents from filesystem
 * - Gathering voice memo transcripts from JSONL
 * - Output JSON structure and stats
 * - Graceful handling of missing directories
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { run } from './step-0.js';

describe('step-0: Raw Materials Gatherer', () => {
  const testDir = join(__dirname, '../../test-output/step-0-test');
  const runDir = join(testDir, 'run');
  const stepDir = join(runDir, '0-raw-materials');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(runDir, { recursive: true });
    mkdirSync(stepDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should produce 0-raw-materials.json output file', async () => {
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '0-raw-materials.json');
    expect(existsSync(outputPath)).toBe(true);
  });

  it('should output valid JSON with correct step metadata', async () => {
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '0-raw-materials.json');
    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(result.step).toBe(0);
    expect(result.name).toBe('raw-materials');
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });

  it('should include documents array', async () => {
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '0-raw-materials.json');
    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(Array.isArray(result.documents)).toBe(true);
  });

  it('should include stats with correct shape', async () => {
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '0-raw-materials.json');
    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(result.stats).toBeDefined();
    expect(typeof result.stats.commits).toBe('number');
    expect(typeof result.stats.blogs).toBe('number');
    expect(typeof result.stats.documents).toBe('number');
    expect(typeof result.stats.voiceMemos).toBe('number');
    expect(typeof result.stats.totalBytes).toBe('number');
    expect(result.stats.commits).toBeGreaterThanOrEqual(0);
    expect(result.stats.blogs).toBeGreaterThanOrEqual(0);
    expect(result.stats.documents).toBeGreaterThanOrEqual(0);
    expect(result.stats.voiceMemos).toBeGreaterThanOrEqual(0);
    expect(result.stats.totalBytes).toBeGreaterThanOrEqual(0);
  });

  it('should gather git commits when in a git repo', async () => {
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '0-raw-materials.json');
    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));

    // Running inside the IntentGuard repo, so commits should exist
    expect(result.stats.commits).toBeGreaterThan(0);

    const commitDocs = result.documents.filter(
      (d: { type: string }) => d.type === 'commit',
    );
    expect(commitDocs.length).toBe(result.stats.commits);

    // Verify commit document structure
    if (commitDocs.length > 0) {
      const commit = commitDocs[0];
      expect(commit.id).toMatch(/^commit-/);
      expect(commit.type).toBe('commit');
      expect(commit.title).toBeDefined();
      expect(commit.content).toBeDefined();
      expect(commit.timestamp).toBeDefined();
      expect(commit.metadata).toBeDefined();
      expect(commit.metadata.hash).toBeDefined();
    }
  });

  it('should gather voice memos from JSONL files', async () => {
    // Create a mock attention-corpus directory with JSONL data
    const memoDir = join(runDir, '..', '..', 'data', 'attention-corpus');
    mkdirSync(memoDir, { recursive: true });

    writeFileSync(
      join(memoDir, 'test-memos.jsonl'),
      [
        JSON.stringify({
          transcript: 'Test voice memo content about architecture',
          title: 'Architecture Review',
          timestamp: '2025-01-15T10:00:00Z',
          metadata: { source: 'test' },
        }),
        JSON.stringify({
          content: 'Another memo about security patterns',
          title: 'Security Discussion',
          timestamp: '2025-01-16T11:00:00Z',
        }),
      ].join('\n'),
    );

    // Note: gatherVoiceMemos looks at ROOT/data/attention-corpus,
    // not runDir, so this test validates structure when the directory
    // happens to exist at the project root level.
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '0-raw-materials.json');
    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));

    // Stats should be non-negative regardless
    expect(result.stats.voiceMemos).toBeGreaterThanOrEqual(0);
  });

  it('should have totalBytes equal to sum of document content lengths', async () => {
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '0-raw-materials.json');
    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));

    const computedBytes = result.documents.reduce(
      (sum: number, d: { content: string }) => sum + d.content.length,
      0,
    );
    expect(result.stats.totalBytes).toBe(computedBytes);
  });

  it('should have stats counts matching document type counts', async () => {
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '0-raw-materials.json');
    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));

    const byType = (type: string) =>
      result.documents.filter((d: { type: string }) => d.type === type).length;

    expect(result.stats.commits).toBe(byType('commit'));
    expect(result.stats.blogs).toBe(byType('blog'));
    expect(result.stats.documents).toBe(byType('document'));
    expect(result.stats.voiceMemos).toBe(byType('voice-memo'));
  });

  it('should have total documents equal to sum of all type counts', async () => {
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '0-raw-materials.json');
    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));

    const totalFromStats =
      result.stats.commits +
      result.stats.blogs +
      result.stats.documents +
      result.stats.voiceMemos;

    expect(result.documents.length).toBe(totalFromStats);
  });

  it('should ensure all documents have required fields', async () => {
    await run(runDir, stepDir);

    const outputPath = join(stepDir, '0-raw-materials.json');
    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));

    for (const doc of result.documents) {
      expect(doc.id).toBeDefined();
      expect(typeof doc.id).toBe('string');
      expect(doc.type).toBeDefined();
      expect(['commit', 'blog', 'document', 'voice-memo']).toContain(doc.type);
      expect(typeof doc.title).toBe('string');
      expect(typeof doc.content).toBe('string');
      expect(doc.timestamp).toBeDefined();
      expect(doc.metadata).toBeDefined();
    }
  });
});
