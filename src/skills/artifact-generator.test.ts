/**
 * artifact-generator.test.ts — Integration tests for ArtifactGenerator
 *
 * Tests the full pipeline: identity vector -> mesh -> STL -> ASCII preview
 *
 * Run with: npx vitest run src/skills/artifact-generator.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ArtifactGenerator from './artifact-generator.js';
import { existsSync, unlinkSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { SkillContext, Logger } from '../types.js';
import type { IdentityVector } from '../auth/geometric.js';

// ─── Test Helpers ───────────────────────────────────────────────────

// Mock logger
const mockLogger: Logger = {
  info: (_msg: string) => {},
  warn: (msg: string) => console.warn(`  [WARN] ${msg}`),
  error: (msg: string) => console.error(`  [ERROR] ${msg}`),
  debug: (_msg: string) => {},
};

// Mock skill context — provide all required fields from SkillContext
const mockContext: SkillContext = {
  log: mockLogger,
  config: { get: () => undefined } as any,
  fs: { read: async () => '', write: async () => {} } as any,
  http: { post: async () => ({}), get: async () => ({}) } as any,
  shell: { exec: async () => ({ stdout: '', stderr: '', code: 0 }) } as any,
  callSkill: async () => ({ success: false, message: 'not implemented' }),
};

// Test identity vector (high sovereignty user)
const testIdentity: IdentityVector = {
  userId: 'test-user-001',
  sovereigntyScore: 0.85,
  lastUpdated: new Date().toISOString(),
  categoryScores: {
    security: 0.9,
    reliability: 0.85,
    data_integrity: 0.88,
    process_adherence: 0.92,
    code_quality: 0.87,
    testing: 0.80,
    documentation: 0.75,
    communication: 0.90,
    time_management: 0.85,
    resource_efficiency: 0.88,
    risk_assessment: 0.91,
    compliance: 0.89,
    innovation: 0.82,
    collaboration: 0.87,
    accountability: 0.93,
    transparency: 0.90,
    adaptability: 0.84,
    domain_expertise: 0.86,
    user_focus: 0.88,
    ethical_alignment: 0.95,
  },
};

// Low sovereignty test identity
const lowSovereigntyIdentity: IdentityVector = {
  userId: 'test-user-002',
  sovereigntyScore: 0.35,
  lastUpdated: new Date().toISOString(),
  categoryScores: {
    security: 0.4,
    reliability: 0.3,
    data_integrity: 0.35,
    process_adherence: 0.4,
    code_quality: 0.3,
    testing: 0.25,
    documentation: 0.3,
    communication: 0.4,
    time_management: 0.35,
    resource_efficiency: 0.3,
    risk_assessment: 0.4,
    compliance: 0.35,
    innovation: 0.3,
    collaboration: 0.4,
    accountability: 0.35,
    transparency: 0.3,
    adaptability: 0.4,
    domain_expertise: 0.35,
    user_focus: 0.3,
    ethical_alignment: 0.4,
  },
};

// ─── Test Suite ─────────────────────────────────────────────────────

const generator = new ArtifactGenerator();
const testArtifactDir = resolve(process.cwd(), 'data', 'artifacts');

// Cleanup function
function cleanupTestArtifacts() {
  const patterns = ['test-user-001', 'test-user-002'];
  if (existsSync(testArtifactDir)) {
    const files = readdirSync(testArtifactDir);
    for (const file of files) {
      if (patterns.some(p => file.startsWith(p))) {
        unlinkSync(resolve(testArtifactDir, file));
      }
    }
  }
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('ArtifactGenerator', () => {
  beforeAll(async () => {
    await generator.initialize(mockContext);
  });

  afterAll(() => {
    cleanupTestArtifacts();
  });

  it('initialize() creates artifacts directory', () => {
    expect(existsSync(testArtifactDir)).toBe(true);
  });

  it('generateArtifact() creates STL and metadata for high sovereignty', async () => {
    cleanupTestArtifacts();

    const result = await generator.execute(
      { action: 'generate', identity: testIdentity },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const artifactResult = result.data as any;
    expect(existsSync(artifactResult.stlPath)).toBe(true);
    expect(existsSync(artifactResult.metadataPath)).toBe(true);

    expect(artifactResult.metadata.userId).toBe('test-user-001');
    expect(artifactResult.metadata.sovereignty).toBe(0.85);
    expect(artifactResult.metadata.subdivisions).toBe(3);
    expect(artifactResult.metadata.vertexCount).toBeGreaterThan(100);

    expect(typeof artifactResult.asciiPreview).toBe('string');
    expect(artifactResult.asciiPreview).toContain('─');
    expect(artifactResult.asciiPreview).toContain('●');
  });

  it('generateArtifact() creates STL for low sovereignty (jagged)', async () => {
    cleanupTestArtifacts();

    const result = await generator.execute(
      { action: 'generate', identity: lowSovereigntyIdentity },
      mockContext
    );

    expect(result.success).toBe(true);
    const artifactResult = result.data as any;

    expect(artifactResult.metadata.userId).toBe('test-user-002');
    expect(artifactResult.metadata.sovereignty).toBe(0.35);
    expect(artifactResult.metadata.subdivisions).toBe(0);
    expect(artifactResult.metadata.vertexCount).toBe(12);
    expect(artifactResult.metadata.faceCount).toBe(20);
  });

  it('STL file has correct binary format', async () => {
    const result = await generator.execute(
      { action: 'generate', identity: testIdentity },
      mockContext
    );

    const artifactResult = result.data as any;
    const buffer = readFileSync(artifactResult.stlPath);

    // Binary STL format checks
    expect(buffer.length).toBeGreaterThanOrEqual(84);

    // Read triangle count (bytes 80-83, uint32 little-endian)
    const triangleCount = buffer.readUInt32LE(80);
    expect(triangleCount).toBeGreaterThan(0);

    // Expected size: 80 (header) + 4 (count) + triangleCount * 50
    const expectedSize = 84 + triangleCount * 50;
    expect(buffer.length).toBe(expectedSize);

    // Header should contain "IntentGuard FIM"
    const headerText = buffer.toString('ascii', 0, 80);
    expect(headerText).toContain('IntentGuard FIM');
    expect(headerText).toContain('sovereignty=');
  });

  it('compareArtifacts() returns correct diffs', async () => {
    // Generate two artifacts
    const result1 = await generator.execute(
      { action: 'generate', identity: testIdentity },
      mockContext
    );

    const result2 = await generator.execute(
      { action: 'generate', identity: lowSovereigntyIdentity },
      mockContext
    );

    const meta1 = (result1.data as any).metadataPath;
    const meta2 = (result2.data as any).metadataPath;

    // Compare them
    const comparison = await generator.execute(
      { action: 'compare', pathA: meta1, pathB: meta2 },
      mockContext
    );

    expect(comparison.success).toBe(true);
    const compResult = comparison.data as any;

    expect(typeof compResult.vertexDiff).toBe('number');
    expect(typeof compResult.faceDiff).toBe('number');
    expect(typeof compResult.sovereigntyDiff).toBe('number');
    expect(typeof compResult.description).toBe('string');

    // High sovereignty has more vertices than low sovereignty
    expect(compResult.vertexDiff).toBeLessThan(0);
    expect(compResult.sovereigntyDiff).toBeLessThan(0);

    expect(compResult.description).toContain('test-user-001');
    expect(compResult.description).toContain('test-user-002');
  });

  it('ASCII preview contains correct structure', async () => {
    const result = await generator.execute(
      { action: 'generate', identity: testIdentity },
      mockContext
    );

    const artifactResult = result.data as any;
    const preview = artifactResult.asciiPreview;

    const lines = preview.split('\n');
    expect(lines.length).toBeGreaterThan(20);

    // First line should be top border
    expect(lines[0]).toMatch(/^┌/);
    expect(lines[0]).toContain('─');
    expect(lines[0]).toMatch(/┐$/);

    // Last line should be bottom border
    const lastLine = lines[lines.length - 1];
    expect(lastLine).toMatch(/^└/);
    expect(lastLine).toMatch(/┘$/);

    // Middle lines should have vertices
    const middleLines = lines.slice(1, -1);
    expect(middleLines.every((l: string) => l.startsWith('│') && l.endsWith('│'))).toBe(true);
    expect(middleLines.some((l: string) => l.includes('●'))).toBe(true);
  });

  it('handles unknown action gracefully', async () => {
    const result = await generator.execute(
      { action: 'invalid-action' },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown action');
  });

  it('metadata contains all expected fields', async () => {
    const result = await generator.execute(
      { action: 'generate', identity: testIdentity },
      mockContext
    );

    const artifactResult = result.data as any;
    const metadata = JSON.parse(readFileSync(artifactResult.metadataPath, 'utf-8'));

    expect(metadata.userId).toBe('test-user-001');
    expect(metadata.sovereignty).toBe(0.85);
    expect(typeof metadata.vertexCount).toBe('number');
    expect(typeof metadata.faceCount).toBe('number');
    expect(typeof metadata.subdivisions).toBe('number');
    expect(typeof metadata.timestamp).toBe('string');
    expect(Array.isArray(metadata.identityVector)).toBe(true);
    expect(metadata.identityVector.length).toBe(20);
    expect(typeof metadata.categoryScores).toBe('object');
  });
});
