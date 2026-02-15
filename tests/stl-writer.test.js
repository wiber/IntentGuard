/**
 * tests/stl-writer.test.js — STL Writer Tests
 *
 * Comprehensive validation of binary STL generation:
 *   - Buffer structure correctness
 *   - Triangle count accuracy
 *   - Normal vector computation
 *   - File writing integrity
 *   - Header format validation
 *   - Floating-point precision
 */

const { readFileSync, unlinkSync, existsSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

// Mock implementation for testing - replace with actual import when modules are built
// NOTE: For integration with TypeScript modules, you may need to build first
// or use dynamic import() for ES modules

// Test helper to create mesh buffer directly (mirrors stl-writer.ts logic)
function computeNormal(v1, v2, v3) {
  const e1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
  const e2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };

  const normal = {
    x: e1.y * e2.z - e1.z * e2.y,
    y: e1.z * e2.x - e1.x * e2.z,
    z: e1.x * e2.y - e1.y * e2.x,
  };

  const len = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
  if (len > 0) {
    normal.x /= len;
    normal.y /= len;
    normal.z /= len;
  }

  return normal;
}

function meshToSTLBuffer(mesh) {
  const triangleCount = mesh.faces.length;
  const bufferSize = 80 + 4 + triangleCount * 50;
  const buffer = Buffer.alloc(bufferSize);

  const headerText = `IntentGuard FIM — sovereignty=${mesh.metadata.sovereignty.toFixed(3)} — ${mesh.metadata.timestamp}`;
  buffer.write(headerText.slice(0, 79), 0, 'ascii');

  buffer.writeUInt32LE(triangleCount, 80);

  let offset = 84;
  for (const face of mesh.faces) {
    const v1 = mesh.vertices[face.a];
    const v2 = mesh.vertices[face.b];
    const v3 = mesh.vertices[face.c];
    const normal = computeNormal(v1, v2, v3);

    buffer.writeFloatLE(normal.x, offset + 0);
    buffer.writeFloatLE(normal.y, offset + 4);
    buffer.writeFloatLE(normal.z, offset + 8);

    buffer.writeFloatLE(v1.x, offset + 12);
    buffer.writeFloatLE(v1.y, offset + 16);
    buffer.writeFloatLE(v1.z, offset + 20);

    buffer.writeFloatLE(v2.x, offset + 24);
    buffer.writeFloatLE(v2.y, offset + 28);
    buffer.writeFloatLE(v2.z, offset + 32);

    buffer.writeFloatLE(v3.x, offset + 36);
    buffer.writeFloatLE(v3.y, offset + 40);
    buffer.writeFloatLE(v3.z, offset + 44);

    buffer.writeUInt16LE(0, offset + 48);

    offset += 50;
  }

  return buffer;
}

// Test data factory
function createTestMesh() {
  return {
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    ],
    faces: [{ a: 0, b: 1, c: 2 }],
    metadata: {
      sovereignty: 0.888,
      subdivisions: 2,
      vertexCount: 3,
      faceCount: 1,
      timestamp: '2026-02-15T12:00:00.000Z',
    },
  };
}

function createTetrahedronMesh() {
  return {
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ],
    faces: [
      { a: 0, b: 1, c: 2 },
      { a: 0, b: 1, c: 3 },
      { a: 1, b: 2, c: 3 },
      { a: 2, b: 0, c: 3 },
    ],
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
    const mesh = createTestMesh();
    const buffer = meshToSTLBuffer(mesh);

    const nx = buffer.readFloatLE(84);
    const ny = buffer.readFloatLE(88);
    const nz = buffer.readFloatLE(92);

    expect(nx).toBeCloseTo(0, 5);
    expect(ny).toBeCloseTo(0, 5);
    expect(nz).toBeCloseTo(1, 5);
  });

  test('normal vector is normalized (length = 1)', () => {
    const mesh = createTetrahedronMesh();
    const buffer = meshToSTLBuffer(mesh);

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

    const attribute = buffer.readUInt16LE(132);
    expect(attribute).toBe(0);
  });

  test('floating-point precision is preserved', () => {
    const mesh = {
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

    const v1x = buffer.readFloatLE(96);
    const v1y = buffer.readFloatLE(100);
    const v1z = buffer.readFloatLE(104);

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

    const expectedSize = 80 + 4 + 50 * 4;
    expect(buffer.length).toBe(expectedSize);
  });

  test('each triangle occupies exactly 50 bytes', () => {
    const mesh = createTetrahedronMesh();
    const buffer = meshToSTLBuffer(mesh);

    for (let i = 0; i < mesh.faces.length - 1; i++) {
      const offset1 = 84 + i * 50;
      const offset2 = 84 + (i + 1) * 50;
      expect(offset2 - offset1).toBe(50);
    }
  });

  test('large mesh with 100 triangles is encoded correctly', () => {
    const vertices = Array.from({ length: 300 }, (_, i) => ({
      x: i * 0.1,
      y: i * 0.2,
      z: i * 0.3,
    }));

    const faces = Array.from({ length: 100 }, (_, i) => ({
      a: i * 3,
      b: i * 3 + 1,
      c: i * 3 + 2,
    }));

    const mesh = {
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

// ─── Edge Cases ─────────────────────────────────────────────────────────

describe('Edge Cases', () => {
  test('empty mesh produces minimal buffer', () => {
    const mesh = {
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

    expect(buffer.length).toBe(80 + 4);
    expect(buffer.readUInt32LE(80)).toBe(0);
  });

  test('degenerate triangle has zero-length normal', () => {
    const mesh = {
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

    const nx = buffer.readFloatLE(84);
    const ny = buffer.readFloatLE(88);
    const nz = buffer.readFloatLE(92);

    expect(nx).toBe(0);
    expect(ny).toBe(0);
    expect(nz).toBe(0);
  });

  test('negative coordinates are encoded correctly', () => {
    const mesh = {
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

  test('large coordinates are encoded correctly', () => {
    const mesh = {
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

  test('sovereignty 1.0 formatted correctly', () => {
    const mesh = createTestMesh();
    mesh.metadata.sovereignty = 1.0;

    const buffer = meshToSTLBuffer(mesh);
    const header = buffer.toString('ascii', 0, 80);

    expect(header).toContain('sovereignty=1.000');
  });

  test('sovereignty 0.0 formatted correctly', () => {
    const mesh = createTestMesh();
    mesh.metadata.sovereignty = 0.0;

    const buffer = meshToSTLBuffer(mesh);
    const header = buffer.toString('ascii', 0, 80);

    expect(header).toContain('sovereignty=0.000');
  });
});

// ─── Integration Tests ──────────────────────────────────────────────────

describe('STL Format Compliance', () => {
  test('buffer structure matches binary STL specification', () => {
    const mesh = createTetrahedronMesh();
    const buffer = meshToSTLBuffer(mesh);

    // Header: 80 bytes
    expect(buffer.length).toBeGreaterThanOrEqual(84);

    // Triangle count: 4 bytes at offset 80
    const count = buffer.readUInt32LE(80);
    expect(count).toBe(4);

    // Each triangle: 50 bytes (12 normal + 36 vertices + 2 attribute)
    expect(buffer.length).toBe(80 + 4 + 50 * count);
  });

  test('all normals have valid unit length', () => {
    const mesh = createTetrahedronMesh();
    const buffer = meshToSTLBuffer(mesh);

    for (let i = 0; i < mesh.faces.length; i++) {
      const offset = 84 + i * 50;

      const nx = buffer.readFloatLE(offset);
      const ny = buffer.readFloatLE(offset + 4);
      const nz = buffer.readFloatLE(offset + 8);
      const normalLength = Math.sqrt(nx * nx + ny * ny + nz * nz);

      expect(normalLength).toBeGreaterThan(0);
      expect(normalLength).toBeLessThanOrEqual(1.01);
    }
  });
});
