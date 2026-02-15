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
// ─── Icosahedron Base ───────────────────────────────────────────────────
/**
 * Generate the base icosahedron (12 vertices, 20 faces).
 * Radius = 1.0, centered at origin.
 *
 * Golden ratio-based construction for even distribution.
 */
function createIcosahedron() {
    const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
    const a = 1.0;
    const b = 1.0 / phi;
    const vertices = [
        // Rectangle in xy plane
        { x: 0, y: b, z: -a },
        { x: b, y: a, z: 0 },
        { x: -b, y: a, z: 0 },
        { x: 0, y: b, z: a },
        { x: 0, y: -b, z: a },
        { x: -a, y: 0, z: b },
        { x: 0, y: -b, z: -a },
        { x: a, y: 0, z: -b },
        { x: a, y: 0, z: b },
        { x: -a, y: 0, z: -b },
        { x: b, y: -a, z: 0 },
        { x: -b, y: -a, z: 0 },
    ];
    // Normalize to unit sphere
    for (const v of vertices) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        v.x /= len;
        v.y /= len;
        v.z /= len;
    }
    const faces = [
        // 5 faces around point 0
        { a: 0, b: 1, c: 2 },
        { a: 1, b: 0, c: 7 },
        { a: 2, b: 1, c: 3 },
        { a: 3, b: 2, c: 5 },
        { a: 4, b: 3, c: 8 },
        // 5 adjacent faces
        { a: 3, b: 5, c: 4 },
        { a: 2, b: 9, c: 5 },
        { a: 0, b: 2, c: 9 },
        { a: 1, b: 7, c: 8 },
        { a: 3, b: 1, c: 8 },
        // 5 faces around point 11
        { a: 4, b: 10, c: 11 },
        { a: 6, b: 11, c: 10 },
        { a: 9, b: 6, c: 11 },
        { a: 7, b: 6, c: 10 },
        { a: 5, b: 9, c: 11 },
        // 5 adjacent faces
        { a: 10, b: 4, c: 8 },
        { a: 11, b: 10, c: 8 },
        { a: 6, b: 7, c: 0 },
        { a: 9, b: 6, c: 0 },
        { a: 11, b: 8, c: 5 },
    ];
    return { vertices, faces };
}
// ─── Subdivision ────────────────────────────────────────────────────────
/**
 * Subdivide a mesh by splitting each face into 4 smaller faces.
 * Midpoints are projected onto the unit sphere for smooth spherical surface.
 */
function subdivideMesh(vertices, faces) {
    const newVertices = [...vertices];
    const newFaces = [];
    const midpointCache = new Map();
    const getMidpoint = (a, b) => {
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (midpointCache.has(key))
            return midpointCache.get(key);
        const va = vertices[a];
        const vb = vertices[b];
        const mid = {
            x: (va.x + vb.x) / 2,
            y: (va.y + vb.y) / 2,
            z: (va.z + vb.z) / 2,
        };
        // Project onto unit sphere
        const len = Math.sqrt(mid.x * mid.x + mid.y * mid.y + mid.z * mid.z);
        mid.x /= len;
        mid.y /= len;
        mid.z /= len;
        const idx = newVertices.length;
        newVertices.push(mid);
        midpointCache.set(key, idx);
        return idx;
    };
    for (const face of faces) {
        const m0 = getMidpoint(face.a, face.b);
        const m1 = getMidpoint(face.b, face.c);
        const m2 = getMidpoint(face.c, face.a);
        newFaces.push({ a: face.a, b: m0, c: m2 }, { a: face.b, b: m1, c: m0 }, { a: face.c, b: m2, c: m1 }, { a: m0, b: m1, c: m2 });
    }
    return { vertices: newVertices, faces: newFaces };
}
// ─── Identity Vector Displacement ───────────────────────────────────────
/**
 * Apply identity vector (20 dimensions) to displace vertices along normals.
 *
 * Each dimension modulates a vertex displacement. With 20 dimensions and
 * potentially more vertices (after subdivision), we cycle through the vector.
 *
 * Displacement magnitude = identityVector[i % 20] * 0.3 (30% of radius)
 */
function applyIdentityVector(vertices, identityVector) {
    if (identityVector.length !== 20) {
        throw new Error(`Identity vector must be 20-dimensional, got ${identityVector.length}`);
    }
    return vertices.map((v, i) => {
        const displacement = identityVector[i % 20] * 0.3; // Max 30% displacement
        return {
            x: v.x * (1 + displacement),
            y: v.y * (1 + displacement),
            z: v.z * (1 + displacement),
        };
    });
}
// ─── Sovereignty-to-Mesh Converter ──────────────────────────────────────
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
export function sovereigntyToMesh(identityVector, sovereignty) {
    // 1. Start with base icosahedron
    let { vertices, faces } = createIcosahedron();
    // 2. Determine subdivisions based on sovereignty
    let subdivisions = 0;
    if (sovereignty > 0.8) {
        subdivisions = 3; // Smooth sphere-like (12 → 42 → 162 → 642 vertices)
    }
    else if (sovereignty > 0.5) {
        subdivisions = 1; // Faceted polyhedron (12 → 42 vertices)
    }
    else {
        subdivisions = 0; // Jagged base icosahedron (12 vertices)
    }
    // 3. Subdivide
    for (let i = 0; i < subdivisions; i++) {
        const result = subdivideMesh(vertices, faces);
        vertices = result.vertices;
        faces = result.faces;
    }
    // 4. Apply identity vector displacement
    vertices = applyIdentityVector(vertices, identityVector);
    // 5. Return MeshData
    return {
        vertices,
        faces,
        metadata: {
            sovereignty,
            subdivisions,
            vertexCount: vertices.length,
            faceCount: faces.length,
            timestamp: new Date().toISOString(),
        },
    };
}
// ─── ASCII Preview ──────────────────────────────────────────────────────
/**
 * Generate a simple ASCII art preview of the mesh (top-down projection).
 *
 * Projects vertices onto the XY plane and renders as a 40×20 character grid.
 * Useful for Discord/terminal previews.
 */
export function generateAsciiPreview(mesh) {
    const width = 40;
    const height = 20;
    const grid = Array.from({ length: height }, () => Array(width).fill(' '));
    // Find bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of mesh.vertices) {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    // Project vertices onto grid
    for (const v of mesh.vertices) {
        const x = Math.floor(((v.x - minX) / rangeX) * (width - 1));
        const y = Math.floor(((v.y - minY) / rangeY) * (height - 1));
        if (x >= 0 && x < width && y >= 0 && y < height) {
            grid[height - 1 - y][x] = '●'; // Flip Y for top-down view
        }
    }
    // Render as string
    const lines = [
        '┌' + '─'.repeat(width) + '┐',
        ...grid.map(row => '│' + row.join('') + '│'),
        '└' + '─'.repeat(width) + '┘',
    ];
    return lines.join('\n');
}
//# sourceMappingURL=geometry-converter.js.map