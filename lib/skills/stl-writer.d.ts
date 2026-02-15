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
import type { MeshData } from './geometry-converter.js';
/**
 * Convert MeshData to a binary STL buffer.
 *
 * Binary format: 80-byte header + 4-byte count + (50 bytes × triangle count).
 */
export declare function meshToSTLBuffer(mesh: MeshData): Buffer;
/**
 * Write MeshData to a binary STL file.
 *
 * @param mesh - Mesh data from geometry-converter
 * @param filepath - Absolute path to output .stl file
 */
export declare function writeSTL(mesh: MeshData, filepath: string): void;
//# sourceMappingURL=stl-writer.d.ts.map