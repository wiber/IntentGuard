/**
 * src/skills/geometry-converter.test.ts — Tests for Sovereignty-to-Geometry Converter
 *
 * Tests the conversion of IntentGuard identity vectors to 3D mesh geometry.
 */

import { describe, it, expect } from 'vitest';
import {
  sovereigntyToMesh,
  generateAsciiPreview,
  type MeshData,
  type Vector3,
} from './geometry-converter';

describe('geometry-converter', () => {
  // ─── Test Data ──────────────────────────────────────────────────────────

  const createTestIdentityVector = (seed: number = 0.5): number[] => {
    return Array.from({ length: 20 }, (_, i) => (seed + i * 0.02) % 1.0);
  };

  const zeroVector: number[] = Array(20).fill(0);
  const highTrustVector: number[] = Array(20).fill(0.8);
  const lowTrustVector: number[] = Array(20).fill(0.2);

  // ─── Basic Mesh Generation ─────────────────────────────────────────────

  describe('sovereigntyToMesh', () => {
    it('should generate a mesh with low sovereignty (jagged, 0 subdivisions)', () => {
      const mesh = sovereigntyToMesh(createTestIdentityVector(), 0.3);

      expect(mesh.metadata.sovereignty).toBe(0.3);
      expect(mesh.metadata.subdivisions).toBe(0);
      expect(mesh.metadata.vertexCount).toBe(12); // Base icosahedron
      expect(mesh.metadata.faceCount).toBe(20);
      expect(mesh.vertices.length).toBe(12);
      expect(mesh.faces.length).toBe(20);
    });

    it('should generate a mesh with medium sovereignty (faceted, 1 subdivision)', () => {
      const mesh = sovereigntyToMesh(createTestIdentityVector(), 0.6);

      expect(mesh.metadata.sovereignty).toBe(0.6);
      expect(mesh.metadata.subdivisions).toBe(1);
      expect(mesh.metadata.vertexCount).toBe(44); // After 1 subdivision
      expect(mesh.metadata.faceCount).toBe(80); // 20 * 4
      expect(mesh.vertices.length).toBe(44);
      expect(mesh.faces.length).toBe(80);
    });

    it('should generate a mesh with high sovereignty (smooth, 3 subdivisions)', () => {
      const mesh = sovereigntyToMesh(createTestIdentityVector(), 0.9);

      expect(mesh.metadata.sovereignty).toBe(0.9);
      expect(mesh.metadata.subdivisions).toBe(3);
      expect(mesh.metadata.vertexCount).toBe(656); // After 3 subdivisions
      expect(mesh.metadata.faceCount).toBe(1280); // 20 * 4^3
      expect(mesh.vertices.length).toBe(656);
      expect(mesh.faces.length).toBe(1280);
    });

    it('should handle sovereignty boundary at 0.5', () => {
      const meshJustBelow = sovereigntyToMesh(zeroVector, 0.49);
      const meshJustAbove = sovereigntyToMesh(zeroVector, 0.51);

      expect(meshJustBelow.metadata.subdivisions).toBe(0);
      expect(meshJustAbove.metadata.subdivisions).toBe(1);
    });

    it('should handle sovereignty boundary at 0.8', () => {
      const meshJustBelow = sovereigntyToMesh(zeroVector, 0.79);
      const meshJustAbove = sovereigntyToMesh(zeroVector, 0.81);

      expect(meshJustBelow.metadata.subdivisions).toBe(1);
      expect(meshJustAbove.metadata.subdivisions).toBe(3);
    });

    it('should include ISO 8601 timestamp in metadata', () => {
      const mesh = sovereigntyToMesh(zeroVector, 0.7);

      expect(mesh.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      const timestamp = new Date(mesh.metadata.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  // ─── Identity Vector Displacement ───────────────────────────────────────

  describe('identity vector displacement', () => {
    it('should apply zero vector with no displacement', () => {
      const mesh = sovereigntyToMesh(zeroVector, 0.3);

      // With zero displacement, vertices should be approximately on unit sphere
      for (const v of mesh.vertices) {
        const magnitude = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        expect(magnitude).toBeCloseTo(1.0, 5);
      }
    });

    it('should apply positive displacement to expand vertices', () => {
      const meshZero = sovereigntyToMesh(zeroVector, 0.3);
      const meshHigh = sovereigntyToMesh(highTrustVector, 0.3);

      // High trust vector should expand the mesh
      for (let i = 0; i < meshZero.vertices.length; i++) {
        const v0 = meshZero.vertices[i];
        const v1 = meshHigh.vertices[i];

        const mag0 = Math.sqrt(v0.x * v0.x + v0.y * v0.y + v0.z * v0.z);
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);

        // High trust should expand vertices outward
        expect(mag1).toBeGreaterThan(mag0);
      }
    });

    it('should cycle through 20-dimensional vector for vertices', () => {
      const vector = Array.from({ length: 20 }, (_, i) => i / 20); // 0, 0.05, 0.1, ...
      const mesh = sovereigntyToMesh(vector, 0.3);

      expect(mesh.vertices.length).toBe(12);

      // First vertex uses vector[0], second uses vector[1], etc.
      // We can't check exact values due to normalization, but we can verify
      // that displacement was applied
      const magnitudes = mesh.vertices.map(v =>
        Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
      );

      // Magnitudes should vary based on the identity vector
      const uniqueMagnitudes = new Set(magnitudes.map(m => m.toFixed(5)));
      expect(uniqueMagnitudes.size).toBeGreaterThan(1);
    });

    it('should throw error for non-20-dimensional identity vector', () => {
      const invalidVector = Array(15).fill(0.5);

      expect(() => sovereigntyToMesh(invalidVector, 0.5)).toThrow(
        'Identity vector must be 20-dimensional, got 15'
      );
    });
  });

  // ─── Mesh Structure Validation ──────────────────────────────────────────

  describe('mesh structure', () => {
    it('should generate valid face indices', () => {
      const mesh = sovereigntyToMesh(createTestIdentityVector(), 0.7);

      for (const face of mesh.faces) {
        expect(face.a).toBeGreaterThanOrEqual(0);
        expect(face.a).toBeLessThan(mesh.vertices.length);
        expect(face.b).toBeGreaterThanOrEqual(0);
        expect(face.b).toBeLessThan(mesh.vertices.length);
        expect(face.c).toBeGreaterThanOrEqual(0);
        expect(face.c).toBeLessThan(mesh.vertices.length);

        // Face indices should be distinct
        expect(face.a).not.toBe(face.b);
        expect(face.b).not.toBe(face.c);
        expect(face.c).not.toBe(face.a);
      }
    });

    it('should have approximately spherical distribution after subdivision', () => {
      const mesh = sovereigntyToMesh(zeroVector, 0.9); // High subdivision

      const magnitudes = mesh.vertices.map(v =>
        Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
      );

      const avgMagnitude = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;

      // With zero displacement and subdivision, all vertices should be ~1.0 from origin
      expect(avgMagnitude).toBeCloseTo(1.0, 5);

      // Standard deviation should be very small (tight distribution)
      const variance = magnitudes.reduce((sum, m) => sum + (m - avgMagnitude) ** 2, 0) / magnitudes.length;
      const stdDev = Math.sqrt(variance);
      expect(stdDev).toBeLessThan(0.01);
    });

    it('should preserve vertex count relationships across subdivisions', () => {
      const mesh0 = sovereigntyToMesh(zeroVector, 0.3); // 0 subdivisions
      const mesh1 = sovereigntyToMesh(zeroVector, 0.6); // 1 subdivision
      const mesh3 = sovereigntyToMesh(zeroVector, 0.9); // 3 subdivisions

      // Each subdivision quadruples the face count
      expect(mesh1.metadata.faceCount).toBe(mesh0.metadata.faceCount * 4);

      // 3 subdivisions = 4^3 = 64x face count
      expect(mesh3.metadata.faceCount).toBe(mesh0.metadata.faceCount * 64);
    });
  });

  // ─── ASCII Preview ──────────────────────────────────────────────────────

  describe('generateAsciiPreview', () => {
    it('should generate ASCII art with border', () => {
      const mesh = sovereigntyToMesh(createTestIdentityVector(), 0.7);
      const preview = generateAsciiPreview(mesh);

      const lines = preview.split('\n');

      // Should have 22 lines (top border + 20 rows + bottom border)
      expect(lines.length).toBe(22);

      // First line should start with ┌
      expect(lines[0]).toMatch(/^┌─+┐$/);

      // Last line should start with └
      expect(lines[21]).toMatch(/^└─+┘$/);

      // Middle lines should start with │
      for (let i = 1; i < 21; i++) {
        expect(lines[i]).toMatch(/^│.+│$/);
      }
    });

    it('should contain vertex markers (●)', () => {
      const mesh = sovereigntyToMesh(createTestIdentityVector(), 0.7);
      const preview = generateAsciiPreview(mesh);

      // Should contain at least some vertex markers
      expect(preview).toContain('●');

      // Count markers
      const markerCount = (preview.match(/●/g) || []).length;
      expect(markerCount).toBeGreaterThan(0);
      expect(markerCount).toBeLessThanOrEqual(mesh.vertices.length);
    });

    it('should render different densities for different sovereignties', () => {
      const meshLow = sovereigntyToMesh(createTestIdentityVector(), 0.3);
      const meshHigh = sovereigntyToMesh(createTestIdentityVector(), 0.9);

      const previewLow = generateAsciiPreview(meshLow);
      const previewHigh = generateAsciiPreview(meshHigh);

      const countMarkers = (preview: string) => (preview.match(/●/g) || []).length;

      // High sovereignty should have more visible vertices
      expect(countMarkers(previewHigh)).toBeGreaterThan(countMarkers(previewLow));
    });

    it('should fit within 40×20 character grid', () => {
      const mesh = sovereigntyToMesh(createTestIdentityVector(), 0.7);
      const preview = generateAsciiPreview(mesh);

      const lines = preview.split('\n');

      // Check width (42 chars including borders)
      for (const line of lines) {
        expect(line.length).toBe(42);
      }
    });
  });

  // ─── Real-World Scenarios ───────────────────────────────────────────────

  describe('real-world scenarios', () => {
    it('should handle IntentGuard CEO identity vector', () => {
      // Simulate a high-trust CEO identity
      const ceoVector = Array.from({ length: 20 }, (_, i) => 0.75 + Math.sin(i) * 0.1);
      const mesh = sovereigntyToMesh(ceoVector, 0.85);

      expect(mesh.metadata.sovereignty).toBe(0.85);
      expect(mesh.metadata.subdivisions).toBe(3); // Smooth, high-trust mesh
      expect(mesh.vertices.length).toBe(656);
    });

    it('should handle low-trust experimental agent identity', () => {
      // Simulate a low-trust experimental agent
      const expVector = Array.from({ length: 20 }, (_, i) => 0.2 + Math.random() * 0.3);
      const mesh = sovereigntyToMesh(expVector, 0.35);

      expect(mesh.metadata.sovereignty).toBe(0.35);
      expect(mesh.metadata.subdivisions).toBe(0); // Jagged, low-trust mesh
      expect(mesh.vertices.length).toBe(12); // Base icosahedron
    });

    it('should produce deterministic results for same inputs', () => {
      const vector = createTestIdentityVector(0.6);
      const mesh1 = sovereigntyToMesh(vector, 0.7);
      const mesh2 = sovereigntyToMesh(vector, 0.7);

      // Timestamps will differ, but structure should be identical
      expect(mesh1.vertices.length).toBe(mesh2.vertices.length);
      expect(mesh1.faces.length).toBe(mesh2.faces.length);
      expect(mesh1.metadata.subdivisions).toBe(mesh2.metadata.subdivisions);

      // Vertex coordinates should match exactly
      for (let i = 0; i < mesh1.vertices.length; i++) {
        expect(mesh1.vertices[i].x).toBeCloseTo(mesh2.vertices[i].x, 10);
        expect(mesh1.vertices[i].y).toBeCloseTo(mesh2.vertices[i].y, 10);
        expect(mesh1.vertices[i].z).toBeCloseTo(mesh2.vertices[i].z, 10);
      }
    });

    it('should support STL export pipeline (validates mesh data structure)', () => {
      const mesh = sovereigntyToMesh(createTestIdentityVector(), 0.8);

      // Mesh should be ready for STL conversion
      expect(mesh.vertices).toBeInstanceOf(Array);
      expect(mesh.faces).toBeInstanceOf(Array);

      // Each face should reference 3 valid vertices
      for (const face of mesh.faces) {
        const v1 = mesh.vertices[face.a];
        const v2 = mesh.vertices[face.b];
        const v3 = mesh.vertices[face.c];

        expect(v1).toBeDefined();
        expect(v2).toBeDefined();
        expect(v3).toBeDefined();

        expect(typeof v1.x).toBe('number');
        expect(typeof v1.y).toBe('number');
        expect(typeof v1.z).toBe('number');
      }
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle sovereignty = 0.0', () => {
      const mesh = sovereigntyToMesh(zeroVector, 0.0);
      expect(mesh.metadata.subdivisions).toBe(0);
      expect(mesh.vertices.length).toBe(12);
    });

    it('should handle sovereignty = 1.0', () => {
      const mesh = sovereigntyToMesh(zeroVector, 1.0);
      expect(mesh.metadata.subdivisions).toBe(3);
      expect(mesh.vertices.length).toBe(656);
    });

    it('should handle identity vector at maximum displacement', () => {
      const maxVector = Array(20).fill(1.0);
      const mesh = sovereigntyToMesh(maxVector, 0.5);

      // Max displacement is 0.3 (30%), so magnitude should be ~1.3
      for (const v of mesh.vertices) {
        const magnitude = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        expect(magnitude).toBeCloseTo(1.3, 5);
      }
    });

    it('should handle identity vector at minimum displacement', () => {
      const minVector = Array(20).fill(0.0);
      const mesh = sovereigntyToMesh(minVector, 0.5);

      // Zero displacement means magnitude should be ~1.0
      for (const v of mesh.vertices) {
        const magnitude = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        expect(magnitude).toBeCloseTo(1.0, 5);
      }
    });

    it('should handle negative displacement gracefully', () => {
      // Identity vector with "negative" trust (should shrink mesh)
      const negVector = Array(20).fill(-0.5);
      const mesh = sovereigntyToMesh(negVector, 0.5);

      // Negative displacement contracts vertices inward
      for (const v of mesh.vertices) {
        const magnitude = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        // -0.5 * 0.3 = -0.15, so magnitude should be 1 - 0.15 = 0.85
        expect(magnitude).toBeCloseTo(0.85, 5);
      }
    });
  });
});
