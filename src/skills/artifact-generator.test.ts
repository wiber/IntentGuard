/**
 * artifact-generator.test.ts — Integration tests for ArtifactGenerator
 *
 * Tests the full pipeline: identity vector → mesh → STL → ASCII preview
 *
 * Run with: npx tsx src/skills/artifact-generator.test.ts
 */

import ArtifactGenerator from './artifact-generator.js';
import { strict as assert } from 'assert';
import { existsSync, unlinkSync, rmSync } from 'fs';
import { resolve } from 'path';
import type { SkillContext, Logger } from '../types.js';
import type { IdentityVector } from '../auth/geometric.js';

// ─── Test Helpers ───────────────────────────────────────────────────

function test(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
      console.log(`✓ ${name}`);
    } catch (error: unknown) {
      console.error(`✗ ${name}`);
      if (error instanceof Error) {
        console.error(`  ${error.message}`);
      } else {
        console.error(`  ${String(error)}`);
      }
      process.exit(1);
    }
  };
}

// Mock logger
const mockLogger: Logger = {
  info: (msg: string) => {}, // Silent during tests
  warn: (msg: string) => console.warn(`  [WARN] ${msg}`),
  error: (msg: string) => console.error(`  [ERROR] ${msg}`),
  debug: (msg: string) => {},
};

// Mock skill context
const mockContext: SkillContext = {
  log: mockLogger,
  config: {} as any,
  emit: async () => {},
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

console.log('Running ArtifactGenerator Integration Tests...\n');

const generator = new ArtifactGenerator();
const testArtifactDir = resolve(process.cwd(), 'data', 'artifacts');

// Cleanup function
function cleanupTestArtifacts() {
  const patterns = ['test-user-001', 'test-user-002'];
  if (existsSync(testArtifactDir)) {
    const fs = require('fs');
    const files = fs.readdirSync(testArtifactDir);
    for (const file of files) {
      if (patterns.some(p => file.startsWith(p))) {
        unlinkSync(resolve(testArtifactDir, file));
      }
    }
  }
}

// ─── Tests ──────────────────────────────────────────────────────────

(async () => {

await test('initialize() creates artifacts directory', async () => {
  await generator.initialize(mockContext);
  assert(existsSync(testArtifactDir), 'Artifacts directory should exist');
})();

await test('generateArtifact() creates STL and metadata for high sovereignty', async () => {
  cleanupTestArtifacts();

  const result = await generator.execute(
    { action: 'generate', identity: testIdentity },
    mockContext
  );

  assert(result.success, 'Generation should succeed');
  assert(result.data, 'Result should contain data');

  const artifactResult = result.data as any;
  assert(existsSync(artifactResult.stlPath), 'STL file should exist');
  assert(existsSync(artifactResult.metadataPath), 'Metadata file should exist');

  assert(artifactResult.metadata.userId === 'test-user-001');
  assert(artifactResult.metadata.sovereignty === 0.85);
  assert(artifactResult.metadata.subdivisions === 3, 'High sovereignty should have 3 subdivisions');
  assert(artifactResult.metadata.vertexCount > 100, 'Subdivided mesh should have many vertices');

  assert(typeof artifactResult.asciiPreview === 'string');
  assert(artifactResult.asciiPreview.includes('─'), 'ASCII preview should have box drawing');
  assert(artifactResult.asciiPreview.includes('●'), 'ASCII preview should have vertex markers');
})();

await test('generateArtifact() creates STL for low sovereignty (jagged)', async () => {
  cleanupTestArtifacts();

  const result = await generator.execute(
    { action: 'generate', identity: lowSovereigntyIdentity },
    mockContext
  );

  assert(result.success, 'Generation should succeed');
  const artifactResult = result.data as any;

  assert(artifactResult.metadata.userId === 'test-user-002');
  assert(artifactResult.metadata.sovereignty === 0.35);
  assert(artifactResult.metadata.subdivisions === 0, 'Low sovereignty should have 0 subdivisions');
  assert(artifactResult.metadata.vertexCount === 12, 'Base icosahedron has 12 vertices');
  assert(artifactResult.metadata.faceCount === 20, 'Base icosahedron has 20 faces');
})();

await test('STL file has correct binary format', async () => {
  const result = await generator.execute(
    { action: 'generate', identity: testIdentity },
    mockContext
  );

  const artifactResult = result.data as any;
  const fs = require('fs');
  const buffer = fs.readFileSync(artifactResult.stlPath);

  // Binary STL format checks
  assert(buffer.length >= 84, 'STL file should have at least header + count');

  // Read triangle count (bytes 80-83, uint32 little-endian)
  const triangleCount = buffer.readUInt32LE(80);
  assert(triangleCount > 0, 'STL should have triangles');

  // Expected size: 80 (header) + 4 (count) + triangleCount * 50
  const expectedSize = 84 + triangleCount * 50;
  assert(buffer.length === expectedSize, `STL size should be ${expectedSize}, got ${buffer.length}`);

  // Header should contain "IntentGuard FIM"
  const headerText = buffer.toString('ascii', 0, 80);
  assert(headerText.includes('IntentGuard FIM'), 'Header should contain signature');
  assert(headerText.includes('sovereignty='), 'Header should contain sovereignty score');
})();

await test('compareArtifacts() returns correct diffs', async () => {
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

  assert(comparison.success, 'Comparison should succeed');
  const compResult = comparison.data as any;

  assert(typeof compResult.vertexDiff === 'number');
  assert(typeof compResult.faceDiff === 'number');
  assert(typeof compResult.sovereigntyDiff === 'number');
  assert(typeof compResult.description === 'string');

  // High sovereignty has more vertices than low sovereignty
  assert(compResult.vertexDiff < 0, 'User 2 (low) should have fewer vertices than User 1 (high)');
  assert(compResult.sovereigntyDiff < 0, 'User 2 should have lower sovereignty');

  assert(compResult.description.includes('test-user-001'));
  assert(compResult.description.includes('test-user-002'));
})();

await test('ASCII preview contains correct structure', async () => {
  const result = await generator.execute(
    { action: 'generate', identity: testIdentity },
    mockContext
  );

  const artifactResult = result.data as any;
  const preview = artifactResult.asciiPreview;

  const lines = preview.split('\n');
  assert(lines.length > 20, 'Preview should have multiple lines');

  // First line should be top border
  assert(lines[0].startsWith('┌'), 'First line should start with top-left corner');
  assert(lines[0].includes('─'), 'First line should have horizontal border');
  assert(lines[0].endsWith('┐'), 'First line should end with top-right corner');

  // Last line should be bottom border
  const lastLine = lines[lines.length - 1];
  assert(lastLine.startsWith('└'), 'Last line should start with bottom-left corner');
  assert(lastLine.endsWith('┘'), 'Last line should end with bottom-right corner');

  // Middle lines should have vertices
  const middleLines = lines.slice(1, -1);
  assert(middleLines.every(l => l.startsWith('│') && l.endsWith('│')), 'Middle lines should have vertical borders');
  assert(middleLines.some(l => l.includes('●')), 'Some lines should have vertex markers');
})();

await test('handles unknown action gracefully', async () => {
  const result = await generator.execute(
    { action: 'invalid-action' },
    mockContext
  );

  assert(!result.success, 'Unknown action should fail');
  assert(result.message?.includes('Unknown action'), 'Error message should mention unknown action');
})();

await test('metadata contains all expected fields', async () => {
  const result = await generator.execute(
    { action: 'generate', identity: testIdentity },
    mockContext
  );

  const artifactResult = result.data as any;
  const fs = require('fs');
  const metadata = JSON.parse(fs.readFileSync(artifactResult.metadataPath, 'utf-8'));

  assert(metadata.userId === 'test-user-001');
  assert(metadata.sovereignty === 0.85);
  assert(typeof metadata.vertexCount === 'number');
  assert(typeof metadata.faceCount === 'number');
  assert(typeof metadata.subdivisions === 'number');
  assert(typeof metadata.timestamp === 'string');
  assert(Array.isArray(metadata.identityVector));
  assert(metadata.identityVector.length === 20, 'Identity vector should have 20 dimensions');
  assert(typeof metadata.categoryScores === 'object');
})();

// ─── Cleanup ────────────────────────────────────────────────────────

console.log('\n✓ All tests passed!');
console.log('\nCleaning up test artifacts...');
cleanupTestArtifacts();
console.log('✓ Cleanup complete');

})().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
