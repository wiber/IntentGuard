/**
 * src/skills/stl-writer.ts — Binary STL File Writer
 *
 * Writes MeshData to binary STL format for 3D printing.
 *
 * BINARY STL FORMAT:
 *   - 80-byte header (ASCII)
 *   - 4-byte triangle count (uint32, little-endian)
 *   - Per triangle (50 bytes each):
 *     - 12 bytes: normal vector (3× float32)
 *     - 12 bytes: vertex 1 (3× float32)
 *     - 12 bytes: vertex 2 (3× float32)
 *     - 12 bytes: vertex 3 (3× float32)
 *     - 2 bytes: attribute (uint16, typically unused)
 *
 * HEADER FORMAT:
 *   "IntentGuard FIM Artifact — sovereignty={score} — {timestamp}"
 *
 * NO EXTERNAL DEPS — Pure Buffer operations and fs.
 */

import { writeFileSync } from 'fs';
import type { MeshData, Vector3 } from './geometry-converter.js';

// ─── Normal Computation ─────────────────────────────────────────────────

/**
 * Compute the surface normal of a triangle (right-hand rule).
 *
 * Normal = (v2 - v1) × (v3 - v1), normalized.
 */
function computeNormal(v1: Vector3, v2: Vector3, v3: Vector3): Vector3 {
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

// ─── STL Buffer Generation ──────────────────────────────────────────────

/**
 * Convert MeshData to a binary STL buffer.
 *
 * Binary format: 80-byte header + 4-byte count + (50 bytes × triangle count).
 */
export function meshToSTLBuffer(mesh: MeshData): Buffer {
  const triangleCount = mesh.faces.length;
  const bufferSize = 80 + 4 + triangleCount * 50;
  const buffer = Buffer.alloc(bufferSize);

  // ─── Header (80 bytes) ───
  const headerText = `IntentGuard FIM — sovereignty=${mesh.metadata.sovereignty.toFixed(3)} — ${mesh.metadata.timestamp}`;
  buffer.write(headerText.slice(0, 79), 0, 'ascii');

  // ─── Triangle count (4 bytes, uint32 little-endian) ───
  buffer.writeUInt32LE(triangleCount, 80);

  // ─── Per-triangle data (50 bytes each) ───
  let offset = 84;
  for (const face of mesh.faces) {
    const v1 = mesh.vertices[face.a];
    const v2 = mesh.vertices[face.b];
    const v3 = mesh.vertices[face.c];
    const normal = computeNormal(v1, v2, v3);

    // Normal (12 bytes)
    buffer.writeFloatLE(normal.x, offset + 0);
    buffer.writeFloatLE(normal.y, offset + 4);
    buffer.writeFloatLE(normal.z, offset + 8);

    // Vertex 1 (12 bytes)
    buffer.writeFloatLE(v1.x, offset + 12);
    buffer.writeFloatLE(v1.y, offset + 16);
    buffer.writeFloatLE(v1.z, offset + 20);

    // Vertex 2 (12 bytes)
    buffer.writeFloatLE(v2.x, offset + 24);
    buffer.writeFloatLE(v2.y, offset + 28);
    buffer.writeFloatLE(v2.z, offset + 32);

    // Vertex 3 (12 bytes)
    buffer.writeFloatLE(v3.x, offset + 36);
    buffer.writeFloatLE(v3.y, offset + 40);
    buffer.writeFloatLE(v3.z, offset + 44);

    // Attribute (2 bytes, unused)
    buffer.writeUInt16LE(0, offset + 48);

    offset += 50;
  }

  return buffer;
}

// ─── File Writer ────────────────────────────────────────────────────────

/**
 * Write MeshData to a binary STL file.
 *
 * @param mesh - Mesh data from geometry-converter
 * @param filepath - Absolute path to output .stl file
 */
export function writeSTL(mesh: MeshData, filepath: string): void {
  const buffer = meshToSTLBuffer(mesh);
  writeFileSync(filepath, buffer);
}
