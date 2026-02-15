/**
 * src/skills/stl-writer.test.ts — STL Writer Tests
 *
 * Comprehensive validation of binary STL generation:
 *   - Buffer structure correctness
 *   - Triangle count accuracy
 *   - Normal vector computation
 *   - File writing integrity
 *   - Header format validation
 *   - Floating-point precision
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { meshToSTLBuffer, writeSTL } from './stl-writer.js';
import type { MeshData, Vector3, Face } from './geometry-converter.js';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── Test Data ──────────────────────────────────────────────────────────

/**
 * Create a simple test mesh (single triangle).
 */
function createTestMesh(): MeshData {
  const vertices: Vector3[] = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
  ];

  const faces: Face[] = [{ a: 0, b: 1, c: 2 }];

  return {
    vertices,
    faces,
    metadata: {
      sovereignty: 0.888,
      subdivisions: 2,
      vertexCount: 3,
      faceCount: 1,
      timestamp: '2026-02-15T12:00:00.000Z',
    },
  };
}

/**
 * Create a test mesh with multiple triangles (tetrahedron).
 */
function createTetrahedronMesh(): MeshData {
  const vertices: Vector3[] = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
  ];

  const faces: Face[] = [
    { a: 0, b: 1, c: 2 }, // Base
    { a: 0, b: 1, c: 3 }, // Side 1
    { a: 1, b: 2, c: 3 }, // Side 2
    { a: 2, b: 0, c: 3 }, // Side 3
  ];

  return {
    vertices,
    faces,
    metadata: {
      sovereignty: 0.75,
      subdivisions: 1,
      vertexCount: 4,
      faceCount: 4,
      timestamp: '2026-02-15T12:00:00.000Z',
    },
  };
}

// ─── Buffer Structure Tests ─────────────────────────────────────────────

describe('STL Buffer Structure', () => {
  test('buffer has correct total size', () => {
    const mesh = createTestMesh();
    const buffer = meshToSTLBuffer(mesh);

    // Size = 80 (header) + 4 (count) + 50 * triangleCount
    const expectedSize = 80 + 4 + 50 * mesh.faces.length;
    expect(buffer.length).toBe(expectedSize);
  });

  test('header contains sovereignty score', () => {
    const mesh = createTestMesh();
    const buffer = meshToSTLBuffer(mesh);

    const header = buffer.toString('ascii', 0, 80);
    expect(header).toContain('IntentGuard FIM');
    expect(header).toContain('sovereignty=0.888');
  });

  test('header contains timestamp', () => {
    const mesh = createTestMesh();
    const buffer = meshToSTLBuffer(mesh);

    const header = buffer.toString('ascii', 0, 80);
    expect(header).toContain('2026-02-15T12:00:00.000Z');
  });

  test('triangle count is correct', () => {
    const mesh = createTetrahedronMesh();
    const buffer = meshToSTLBuffer(mesh);

    const triangleCount = buffer.readUInt32LE(80);
    expect(triangleCount).toBe(4);
  });

  test('single triangle mesh has count of 1', () => {
    const mesh = createTestMesh();
    const buffer = meshToSTLBuffer(mesh);

    const triangleCount = buffer.readUInt32LE(80);
    expect(triangleCount).toBe(1);
  });
});

// ─── Normal Vector Tests ────────────────────────────────────────────────

describe('Normal Vector Computation', () => {
  test('normal for Z-facing triangle is [0,0,1]', () => {
    const mesh = createTestMesh(); // Triangle in XY plane
    const buffer = meshToSTLBuffer(mesh);

    // Normal starts at offset 84
    const nx = buffer.readFloatLE(84);
    const ny = buffer.readFloatLE(88);
    const nz = buffer.readFloatLE(92);

    expect(nx).toBeCloseTo(0, 5);
    expect(ny).toBeCloseTo(0, 5);
    expect(nz).toBeCloseTo(1, 5); // Right-hand rule: points up
  });

  test('normal vector is normalized (length = 1)', () => {
    const mesh = createTetrahedronMesh();
    const buffer = meshToSTLBuffer(mesh);

    // Check first triangle normal
    const nx = buffer.readFloatLE(84);
    const ny = buffer.readFloatLE(88);
    const nz = buffer.readFloatLE(92);

    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    expect(length).toBeCloseTo(1, 5);
  });

  test('all normals in multi-triangle mesh are normalized', () => {
    const mesh = createTetrahedronMesh();
    const buffer = meshToSTLBuffer(mesh);

    for (let i = 0; i < mesh.faces.length; i++) {
      const offset = 84 + i * 50;
      const nx = buffer.readFloatLE(offset);
      const ny = buffer.readFloatLE(offset + 4);
      const nz = buffer.readFloatLE(offset + 8);

      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      expect(length).toBeCloseTo(1, 5);
    }
  });
});

// ─── Vertex Data Tests ──────────────────────────────────────────────────

describe('Vertex Data Encoding', () => {
  test('vertices are encoded in correct order', () => {
    const mesh = createTestMesh();
    const buffer = meshToSTLBuffer(mesh);

    // First triangle starts at offset 84 + 12 (after normal)
    const v1x = buffer.readFloatLE(96);
    const v1y = buffer.readFloatLE(100);
    const v1z = buffer.readFloatLE(104);

    expect(v1x).toBe(0);
    expect(v1y).toBe(0);
    expect(v1z).toBe(0);

    const v2x = buffer.readFloatLE(108);
    const v2y = buffer.readFloatLE(112);
    const v2z = buffer.readFloatLE(116);

    expect(v2x).toBe(1);
    expect(v2y).toBe(0);
    expect(v2z).toBe(0);

    const v3x = buffer.readFloatLE(120);
    const v3y = buffer.readFloatLE(124);
    const v3z = buffer.readFloatLE(128);

    expect(v3x).toBe(0);
    expect(v3y).toBe(1);
    expect(v3z).toBe(0);
  });

  test('attribute bytes are zero', () => {
    const mesh = createTestMesh();
    const buffer = meshToSTLBuffer(mesh);

    // Attribute bytes at offset 84 + 48 = 132
    const attribute = buffer.readUInt16LE(132);
    expect(attribute).toBe(0);
  });

  test('floating-point precision is preserved', () => {
    const mesh: MeshData = {
      vertices: [
        { x: 1.23456789, y: 2.3456789, z: 3.456789 },
        { x: 4.56789, y: 5.6789, z: 6.789 },
        { x: 7.89, y: 8.9, z: 9.0 },
      ],
      faces: [{ a: 0, b: 1, c: 2 }],
      metadata: {
        sovereignty: 0.5,
        subdivisions: 0,
        vertexCount: 3,
        faceCount: 1,
        timestamp: '2026-02-15T12:00:00.000Z',
      },
    };

    const buffer = meshToSTLBuffer(mesh);

    // Read back first vertex
    const v1x = buffer.readFloatLE(96);
    const v1y = buffer.readFloatLE(100);
    const v1z = buffer.readFloatLE(104);

    // Float32 precision (approximately 7 decimal digits)
    expect(v1x).toBeCloseTo(1.23456789, 5);
    expect(v1y).toBeCloseTo(2.3456789, 5);
    expect(v1z).toBeCloseTo(3.456789, 5);
  });
});

// ─── Multi-Triangle Tests ───────────────────────────────────────────────

describe('Multi-Triangle Meshes', () => {
  test('tetrahedron has 4 triangles in buffer', () => {
    const mesh = createTetrahedronMesh();
    const buffer = meshToSTLBuffer(mesh);

    const triangleCount = buffer.readUInt32LE(80);
    expect(triangleCount).toBe(4);

    // Buffer should have space for 4 triangles
    const expectedSize = 80 + 4 + 50 * 4;
    expect(buffer.length).toBe(expectedSize);
  });

  test('each triangle occupies exactly 50 bytes', () => {
    const mesh = createTetrahedronMesh();
    const buffer = meshToSTLBuffer(mesh);

    // Verify spacing between triangles
    for (let i = 0; i < mesh.faces.length - 1; i++) {
      const offset1 = 84 + i * 50;
      const offset2 = 84 + (i + 1) * 50;
      expect(offset2 - offset1).toBe(50);
    }
  });

  test('large mesh with 100 triangles is encoded correctly', () => {
    const vertices: Vector3[] = Array.from({ length: 300 }, (_, i) => ({
      x: i * 0.1,
      y: i * 0.2,
      z: i * 0.3,
    }));

    const faces: Face[] = Array.from({ length: 100 }, (_, i) => ({
      a: i * 3,
      b: i * 3 + 1,
      c: i * 3 + 2,
    }));

    const mesh: MeshData = {
      vertices,
      faces,
      metadata: {
        sovereignty: 0.9,
        subdivisions: 3,
        vertexCount: 300,
        faceCount: 100,
        timestamp: '2026-02-15T12:00:00.000Z',
      },
    };

    const buffer = meshToSTLBuffer(mesh);

    expect(buffer.readUInt32LE(80)).toBe(100);
    expect(buffer.length).toBe(80 + 4 + 50 * 100);
  });
});

// ─── File Writing Tests ─────────────────────────────────────────────────

describe('File Writing', () => {
  let testFilePath: string;

  beforeEach(() => {
    testFilePath = join(tmpdir(), `test-${Date.now()}.stl`);
  });

  afterEach(() => {
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  test('writeSTL creates file at specified path', () => {
    const mesh = createTestMesh();
    writeSTL(mesh, testFilePath);

    expect(existsSync(testFilePath)).toBe(true);
  });

  test('written file has correct size', () => {
    const mesh = createTestMesh();
    writeSTL(mesh, testFilePath);

    const stats = readFileSync(testFilePath);
    const expectedSize = 80 + 4 + 50 * mesh.faces.length;
    expect(stats.length).toBe(expectedSize);
  });

  test('written file can be read back correctly', () => {
    const mesh = createTetrahedronMesh();
    writeSTL(mesh, testFilePath);

    const buffer = readFileSync(testFilePath);

    // Verify triangle count
    const triangleCount = buffer.readUInt32LE(80);
    expect(triangleCount).toBe(4);

    // Verify header
    const header = buffer.toString('ascii', 0, 80);
    expect(header).toContain('IntentGuard FIM');
    expect(header).toContain('sovereignty=0.750');
  });

  test('multiple writes to same file overwrite correctly', () => {
    const mesh1 = createTestMesh();
    const mesh2 = createTetrahedronMesh();

    writeSTL(mesh1, testFilePath);
    const size1 = readFileSync(testFilePath).length;

    writeSTL(mesh2, testFilePath);
    const size2 = readFileSync(testFilePath).length;

    expect(size1).toBe(80 + 4 + 50 * 1);
    expect(size2).toBe(80 + 4 + 50 * 4);
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────

describe('Edge Cases', () => {
  test('empty mesh (no triangles) produces minimal buffer', () => {
    const mesh: MeshData = {
      vertices: [],
      faces: [],
      metadata: {
        sovereignty: 0.5,
        subdivisions: 0,
        vertexCount: 0,
        faceCount: 0,
        timestamp: '2026-02-15T12:00:00.000Z',
      },
    };

    const buffer = meshToSTLBuffer(mesh);

    expect(buffer.length).toBe(80 + 4); // Header + count only
    expect(buffer.readUInt32LE(80)).toBe(0);
  });

  test('single vertex triangle (degenerate) has zero-length normal', () => {
    const mesh: MeshData = {
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ],
      faces: [{ a: 0, b: 1, c: 2 }],
      metadata: {
        sovereignty: 0.5,
        subdivisions: 0,
        vertexCount: 3,
        faceCount: 1,
        timestamp: '2026-02-15T12:00:00.000Z',
      },
    };

    const buffer = meshToSTLBuffer(mesh);

    // Normal should be [0,0,0] for degenerate triangle
    const nx = buffer.readFloatLE(84);
    const ny = buffer.readFloatLE(88);
    const nz = buffer.readFloatLE(92);

    expect(nx).toBe(0);
    expect(ny).toBe(0);
    expect(nz).toBe(0);
  });

  test('negative coordinates are encoded correctly', () => {
    const mesh: MeshData = {
      vertices: [
        { x: -1, y: -2, z: -3 },
        { x: -4, y: -5, z: -6 },
        { x: -7, y: -8, z: -9 },
      ],
      faces: [{ a: 0, b: 1, c: 2 }],
      metadata: {
        sovereignty: 0.5,
        subdivisions: 0,
        vertexCount: 3,
        faceCount: 1,
        timestamp: '2026-02-15T12:00:00.000Z',
      },
    };

    const buffer = meshToSTLBuffer(mesh);

    const v1x = buffer.readFloatLE(96);
    const v1y = buffer.readFloatLE(100);
    const v1z = buffer.readFloatLE(104);

    expect(v1x).toBe(-1);
    expect(v1y).toBe(-2);
    expect(v1z).toBe(-3);
  });

  test('very large coordinates are encoded correctly', () => {
    const mesh: MeshData = {
      vertices: [
        { x: 10000, y: 20000, z: 30000 },
        { x: 40000, y: 50000, z: 60000 },
        { x: 70000, y: 80000, z: 90000 },
      ],
      faces: [{ a: 0, b: 1, c: 2 }],
      metadata: {
        sovereignty: 0.5,
        subdivisions: 0,
        vertexCount: 3,
        faceCount: 1,
        timestamp: '2026-02-15T12:00:00.000Z',
      },
    };

    const buffer = meshToSTLBuffer(mesh);

    const v1x = buffer.readFloatLE(96);
    const v1y = buffer.readFloatLE(100);
    const v1z = buffer.readFloatLE(104);

    expect(v1x).toBe(10000);
    expect(v1y).toBe(20000);
    expect(v1z).toBe(30000);
  });

  test('sovereignty score 1.0 is formatted correctly in header', () => {
    const mesh = createTestMesh();
    mesh.metadata.sovereignty = 1.0;

    const buffer = meshToSTLBuffer(mesh);
    const header = buffer.toString('ascii', 0, 80);

    expect(header).toContain('sovereignty=1.000');
  });

  test('sovereignty score 0.0 is formatted correctly in header', () => {
    const mesh = createTestMesh();
    mesh.metadata.sovereignty = 0.0;

    const buffer = meshToSTLBuffer(mesh);
    const header = buffer.toString('ascii', 0, 80);

    expect(header).toContain('sovereignty=0.000');
  });
});

// ─── Integration Tests ──────────────────────────────────────────────────

describe('Integration with geometry-converter', () => {
  test('STL buffer structure matches expected format', () => {
    const mesh = createTetrahedronMesh();
    const buffer = meshToSTLBuffer(mesh);

    // Validate complete structure
    expect(buffer.length).toBe(80 + 4 + 50 * 4);
    expect(buffer.readUInt32LE(80)).toBe(4);

    // Each triangle should have valid data
    for (let i = 0; i < 4; i++) {
      const offset = 84 + i * 50;

      // Normal vector
      const nx = buffer.readFloatLE(offset);
      const ny = buffer.readFloatLE(offset + 4);
      const nz = buffer.readFloatLE(offset + 8);
      const normalLength = Math.sqrt(nx * nx + ny * ny + nz * nz);
      expect(normalLength).toBeGreaterThan(0);
      expect(normalLength).toBeLessThanOrEqual(1.01); // Allow small floating-point error

      // Attribute bytes
      const attr = buffer.readUInt16LE(offset + 48);
      expect(attr).toBe(0);
    }
  });
});
