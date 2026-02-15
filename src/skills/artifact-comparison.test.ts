/**
 * src/skills/artifact-comparison.test.ts — Tests for Artifact Comparison
 *
 * Tests cover:
 *   - Snapshot save/load
 *   - Artifact history tracking
 *   - Geometric diff calculations
 *   - ASCII diff visualization
 *   - Edge cases (empty meshes, identical artifacts, etc.)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { existsSync, rmSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import type { MeshData } from './geometry-converter.js';
import {
  saveArtifactSnapshot,
  loadArtifactSnapshot,
  listArtifactSnapshots,
  compareArtifacts,
  generateAsciiDiff,
  getArtifactHistory,
  getLatestArtifact,
  compareAgainstHistory,
  type ArtifactSnapshot,
} from './artifact-comparison.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────

const TEST_ARTIFACTS_DIR = join(process.cwd(), 'data', 'artifacts');

/**
 * Create a minimal test mesh.
 */
function createTestMesh(sovereignty: number, vertexCount: number): MeshData {
  const vertices = [];
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * 2 * Math.PI;
    vertices.push({
      x: Math.cos(angle) * (1 + sovereignty * 0.2),
      y: Math.sin(angle) * (1 + sovereignty * 0.2),
      z: sovereignty * 0.5,
    });
  }

  const faces = [];
  for (let i = 1; i < vertexCount - 1; i++) {
    faces.push({ a: 0, b: i, c: i + 1 });
  }

  return {
    vertices,
    faces,
    metadata: {
      sovereignty,
      subdivisions: sovereignty > 0.5 ? 1 : 0,
      vertexCount: vertices.length,
      faceCount: faces.length,
      timestamp: new Date().toISOString(),
    },
  };
}

// ─── Setup/Teardown ─────────────────────────────────────────────────────

beforeAll(() => {
  // Ensure test directory exists
  if (!existsSync(TEST_ARTIFACTS_DIR)) {
    mkdirSync(TEST_ARTIFACTS_DIR, { recursive: true });
  }
});

afterAll(() => {
  // Clean up test artifacts (optional - keep for inspection)
  // if (existsSync(TEST_ARTIFACTS_DIR)) {
  //   rmSync(TEST_ARTIFACTS_DIR, { recursive: true, force: true });
  // }
});

// ─── Tests ──────────────────────────────────────────────────────────────

describe('Artifact Snapshot Management', () => {
  it('should save and load artifact snapshots', () => {
    const mesh = createTestMesh(0.75, 12);
    const snapshot = saveArtifactSnapshot(mesh);

    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.sovereignty).toBe(0.75);
    expect(snapshot.mesh.vertices.length).toBe(12);

    const loaded = loadArtifactSnapshot(snapshot.timestamp);
    expect(loaded).not.toBeNull();
    expect(loaded!.sovereignty).toBe(0.75);
    expect(loaded!.mesh.vertices.length).toBe(12);
  });

  it('should list artifact snapshots in chronological order', async () => {
    // Create multiple snapshots with small delays
    const mesh1 = createTestMesh(0.5, 10);
    saveArtifactSnapshot(mesh1);

    await new Promise(resolve => setTimeout(resolve, 10));

    const mesh2 = createTestMesh(0.7, 15);
    saveArtifactSnapshot(mesh2);

    await new Promise(resolve => setTimeout(resolve, 10));

    const mesh3 = createTestMesh(0.9, 20);
    saveArtifactSnapshot(mesh3);

    const list = listArtifactSnapshots();
    expect(list.length).toBeGreaterThanOrEqual(3);

    // Check newest first ordering
    const timestamps = list.map(s => new Date(s.timestamp).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
    }
  });

  it('should retrieve latest artifact', () => {
    const mesh = createTestMesh(0.85, 12);
    saveArtifactSnapshot(mesh);

    const latest = getLatestArtifact();
    expect(latest).not.toBeNull();
    expect(latest!.sovereignty).toBe(0.85);
  });

  it('should handle missing snapshots gracefully', () => {
    const loaded = loadArtifactSnapshot('nonexistent-timestamp');
    expect(loaded).toBeNull();
  });
});

describe('Artifact Comparison', () => {
  it('should compute diff metrics between two artifacts', () => {
    const mesh1 = createTestMesh(0.60, 12);
    const snapshot1 = saveArtifactSnapshot(mesh1);

    const mesh2 = createTestMesh(0.80, 20);
    const snapshot2 = saveArtifactSnapshot(mesh2);

    const diff = compareArtifacts(snapshot1, snapshot2);

    expect(diff.metrics.sovereigntyDelta).toBeCloseTo(0.20, 2);
    expect(diff.metrics.vertexCountDelta).toBe(8);
    expect(diff.metrics.geometricDistance).toBeGreaterThan(0);
    expect(diff.summary).toContain('Sovereignty increased');
    expect(diff.summary).toContain('vertices added');
  });

  it('should detect no changes for identical artifacts', () => {
    const mesh = createTestMesh(0.75, 12);
    const snapshot1 = saveArtifactSnapshot(mesh);
    const snapshot2 = saveArtifactSnapshot(mesh);

    const diff = compareArtifacts(snapshot1, snapshot2);

    expect(diff.metrics.sovereigntyDelta).toBeCloseTo(0, 5);
    expect(diff.metrics.vertexCountDelta).toBe(0);
    expect(diff.metrics.geometricDistance).toBeCloseTo(0, 5);
    expect(diff.summary).toContain('No significant changes');
  });

  it('should detect sovereignty decrease', () => {
    const mesh1 = createTestMesh(0.90, 12);
    const snapshot1 = saveArtifactSnapshot(mesh1);

    const mesh2 = createTestMesh(0.60, 12);
    const snapshot2 = saveArtifactSnapshot(mesh2);

    const diff = compareArtifacts(snapshot1, snapshot2);

    expect(diff.metrics.sovereigntyDelta).toBeCloseTo(-0.30, 2);
    expect(diff.summary).toContain('decreased');
  });

  it('should compare against history', () => {
    const mesh1 = createTestMesh(0.70, 12);
    saveArtifactSnapshot(mesh1);

    const mesh2 = createTestMesh(0.85, 15);
    const diff = compareAgainstHistory(mesh2);

    expect(diff).not.toBeNull();
    expect(diff!.metrics.sovereigntyDelta).toBeGreaterThan(0);
    expect(diff!.metrics.vertexCountDelta).toBeGreaterThan(0);
  });
});

describe('ASCII Diff Visualization', () => {
  it('should generate ASCII diff for two artifacts', () => {
    const mesh1 = createTestMesh(0.50, 8);
    const snapshot1 = saveArtifactSnapshot(mesh1);

    const mesh2 = createTestMesh(0.80, 16);
    const snapshot2 = saveArtifactSnapshot(mesh2);

    const ascii = generateAsciiDiff(snapshot1, snapshot2);

    expect(ascii).toContain('BEFORE');
    expect(ascii).toContain('AFTER');
    expect(ascii).toContain('σ=0.500');
    expect(ascii).toContain('σ=0.800');
    expect(ascii).toContain('Δ Sovereignty:');
    expect(ascii).toContain('Δ Vertices:');
    expect(ascii).toContain('Distance:');
    expect(ascii).toContain('Summary:');
    expect(ascii).toContain('●'); // Should have vertex markers
  });

  it('should handle empty meshes in ASCII diff', () => {
    const emptyMesh: MeshData = {
      vertices: [],
      faces: [],
      metadata: {
        sovereignty: 0.5,
        subdivisions: 0,
        vertexCount: 0,
        faceCount: 0,
        timestamp: new Date().toISOString(),
      },
    };

    const snapshot1 = saveArtifactSnapshot(emptyMesh);
    const snapshot2 = saveArtifactSnapshot(emptyMesh);

    const ascii = generateAsciiDiff(snapshot1, snapshot2);

    expect(ascii).toContain('BEFORE');
    expect(ascii).toContain('AFTER');
    expect(ascii).toContain('No significant changes');
  });
});

describe('Artifact History', () => {
  it('should retrieve artifact history with limit', () => {
    // Create several snapshots
    for (let i = 0; i < 5; i++) {
      const mesh = createTestMesh(0.5 + i * 0.1, 10 + i * 2);
      saveArtifactSnapshot(mesh);
    }

    const history = getArtifactHistory(3);
    expect(history.length).toBeLessThanOrEqual(3);

    // Verify chronological order (newest first)
    for (let i = 1; i < history.length; i++) {
      const t1 = new Date(history[i - 1].timestamp).getTime();
      const t2 = new Date(history[i].timestamp).getTime();
      expect(t1).toBeGreaterThanOrEqual(t2);
    }
  });

  it('should handle empty history', () => {
    // This test assumes fresh directory, might need adjustment
    const history = getArtifactHistory(10);
    expect(Array.isArray(history)).toBe(true);
  });
});

describe('Edge Cases', () => {
  it('should handle meshes with different vertex counts', () => {
    const mesh1 = createTestMesh(0.75, 10);
    const snapshot1 = saveArtifactSnapshot(mesh1);

    const mesh2 = createTestMesh(0.75, 50);
    const snapshot2 = saveArtifactSnapshot(mesh2);

    const diff = compareArtifacts(snapshot1, snapshot2);

    expect(diff.metrics.vertexCountDelta).toBe(40);
    expect(diff.metrics.geometricDistance).toBeGreaterThanOrEqual(0);
  });

  it('should compute bounding box correctly', () => {
    const mesh = createTestMesh(0.8, 12);
    const snapshot = saveArtifactSnapshot(mesh);

    const bbox = snapshot.metadata.boundingBox;
    expect(bbox.min.x).toBeLessThanOrEqual(bbox.max.x);
    expect(bbox.min.y).toBeLessThanOrEqual(bbox.max.y);
    expect(bbox.min.z).toBeLessThanOrEqual(bbox.max.z);
  });

  it('should handle single-vertex mesh', () => {
    const mesh: MeshData = {
      vertices: [{ x: 0, y: 0, z: 0 }],
      faces: [],
      metadata: {
        sovereignty: 0.5,
        subdivisions: 0,
        vertexCount: 1,
        faceCount: 0,
        timestamp: new Date().toISOString(),
      },
    };

    const snapshot = saveArtifactSnapshot(mesh);
    expect(snapshot.metadata.vertexCount).toBe(1);

    const loaded = loadArtifactSnapshot(snapshot.timestamp);
    expect(loaded).not.toBeNull();
    expect(loaded!.mesh.vertices.length).toBe(1);
  });
});

describe('Integration: Full Workflow', () => {
  it('should demonstrate complete artifact tracking workflow', async () => {
    // Step 1: Create initial artifact
    const mesh1 = createTestMesh(0.60, 12);
    const snapshot1 = saveArtifactSnapshot(mesh1);

    // Step 2: Wait and create evolved artifact
    await new Promise(resolve => setTimeout(resolve, 20));
    const mesh2 = createTestMesh(0.75, 18);
    const snapshot2 = saveArtifactSnapshot(mesh2);

    // Step 3: Compare artifacts
    const diff = compareArtifacts(snapshot1, snapshot2);
    expect(diff.metrics.sovereigntyDelta).toBeGreaterThan(0);

    // Step 4: Generate ASCII diff
    const ascii = generateAsciiDiff(snapshot1, snapshot2);
    expect(ascii).toContain('Sovereignty increased');

    // Step 5: Verify history tracking
    const latest = getLatestArtifact();
    expect(latest).not.toBeNull();
    expect(latest!.timestamp).toBe(snapshot2.timestamp);

    // Step 6: Compare new state against history
    const mesh3 = createTestMesh(0.90, 24);
    const diffAgainstHistory = compareAgainstHistory(mesh3);
    expect(diffAgainstHistory).not.toBeNull();
    expect(diffAgainstHistory!.metrics.sovereigntyDelta).toBeGreaterThan(0);
  });
});
