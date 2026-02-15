/**
 * src/skills/geometry-converter.ts — Sovereignty-to-Geometry Converter
 *
 * Converts IntentGuard identity vectors (20-dimensional trust-debt scores) into
 * 3D mesh geometry suitable for physical artifact generation (3D printing).
 *
 * ALGORITHM:
 *   1. Start with base icosahedron (12 vertices, 20 faces)
 *   2. Apply identity vector (20 dimensions) to displace vertices along normals
 *   3. Subdivide based on sovereignty score (higher = smoother, more spherical)
 *   4. Generate mesh data: vertices, faces, metadata
 *
 * SOVEREIGNTY MAPPING:
 *   - High sovereignty (>0.8) = smooth sphere-like mesh (3 subdivisions)
 *   - Medium sovereignty (0.5-0.8) = faceted polyhedron (1 subdivision)
 *   - Low sovereignty (<0.5) = jagged, irregular mesh (0 subdivisions)
 *
 * OUTPUT:
 *   MeshData = { vertices: [x,y,z][], faces: [a,b,c][], metadata: {...} }
 *
 * NO EXTERNAL DEPS — Pure math and geometry.
 */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}
export interface Face {
    a: number;
    b: number;
    c: number;
}
export interface MeshData {
    vertices: Vector3[];
    faces: Face[];
    metadata: {
        sovereignty: number;
        subdivisions: number;
        vertexCount: number;
        faceCount: number;
        timestamp: string;
    };
}
/**
 * Convert identity vector and sovereignty score into a 3D mesh.
 *
 * ALGORITHM:
 *   1. Create base icosahedron
 *   2. Subdivide based on sovereignty (higher = more subdivisions)
 *   3. Apply identity vector as vertex displacement
 *   4. Return MeshData
 *
 * @param identityVector - 20-dimensional vector (0.0-1.0 per dimension)
 * @param sovereignty - Overall sovereignty score (0.0-1.0)
 */
export declare function sovereigntyToMesh(identityVector: number[], sovereignty: number): MeshData;
/**
 * Generate a simple ASCII art preview of the mesh (top-down projection).
 *
 * Projects vertices onto the XY plane and renders as a 40×20 character grid.
 * Useful for Discord/terminal previews.
 */
export declare function generateAsciiPreview(mesh: MeshData): string;
//# sourceMappingURL=geometry-converter.d.ts.map