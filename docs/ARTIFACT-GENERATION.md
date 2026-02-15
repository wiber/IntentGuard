# IntentGuard Artifact Generation System

## Overview

The IntentGuard Artifact Generation system converts 20-dimensional trust-debt identity vectors into 3D-printable STL files. Each user's unique sovereignty profile becomes a physical manifestation—a tangible representation of their trust score and permission topology.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Artifact Generation Pipeline                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Identity Vector (20D)                                        │
│     ↓                                                            │
│  2. Sovereignty Score (0.0-1.0)                                  │
│     ↓                                                            │
│  3. Geometry Converter → Mesh (vertices + faces)                 │
│     ↓                                                            │
│  4. STL Writer → Binary STL file                                 │
│     ↓                                                            │
│  5. Artifacts stored in data/artifacts/                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. geometry-converter.ts

Converts identity vectors into 3D mesh geometry.

**Algorithm:**
1. Start with base icosahedron (12 vertices, 20 faces)
2. Apply identity vector (20 dimensions) to displace vertices along normals
3. Subdivide based on sovereignty score
4. Generate MeshData: vertices, faces, metadata

**Sovereignty Mapping:**
- **High sovereignty (>0.8)**: Smooth sphere-like mesh (3 subdivisions → 656 vertices, 1280 faces)
- **Medium sovereignty (0.5-0.8)**: Faceted polyhedron (1 subdivision → 44 vertices, 80 faces)
- **Low sovereignty (<0.5)**: Jagged icosahedron (0 subdivisions → 12 vertices, 20 faces)

**Functions:**
- `sovereigntyToMesh(identityVector, sovereignty)` — Core converter
- `generateAsciiPreview(mesh)` — Terminal/Discord preview

### 2. stl-writer.ts

Writes MeshData to binary STL format for 3D printing.

**Binary STL Format:**
```
┌─────────────────────────────────────────────────────────────┐
│ 80 bytes: Header (ASCII)                                    │
│ "IntentGuard FIM Artifact — sovereignty={score} — {time}"   │
├─────────────────────────────────────────────────────────────┤
│ 4 bytes: Triangle count (uint32, little-endian)             │
├─────────────────────────────────────────────────────────────┤
│ Per triangle (50 bytes each):                               │
│   - 12 bytes: Normal vector (3× float32)                    │
│   - 12 bytes: Vertex 1 (x,y,z float32)                      │
│   - 12 bytes: Vertex 2 (x,y,z float32)                      │
│   - 12 bytes: Vertex 3 (x,y,z float32)                      │
│   - 2 bytes: Attribute (uint16, unused)                     │
└─────────────────────────────────────────────────────────────┘
```

**Functions:**
- `meshToSTLBuffer(mesh)` — Convert MeshData to Buffer
- `writeSTL(mesh, filepath)` — Write to file

### 3. artifact-generator.ts

Skill class that orchestrates artifact generation.

**Commands:**
```typescript
// Generate artifact
{
  action: 'generate',
  identity: IdentityVector
}

// Compare artifacts
{
  action: 'compare',
  pathA: string, // Path to metadata JSON
  pathB: string
}
```

**Output Structure:**
```
data/artifacts/
├── {userId}-{timestamp}.stl      # 3D model
└── {userId}-{timestamp}.json     # Metadata
```

## Usage

### Basic Test

```bash
npx tsx src/skills/test-artifact-generation.ts
```

### Programmatic Usage

```typescript
import { sovereigntyToMesh, generateAsciiPreview } from './geometry-converter.js';
import { writeSTL } from './stl-writer.js';

// Define identity vector (20 dimensions, 0.0-1.0 per category)
const identityVector = [
  0.9,  // security
  0.85, // reliability
  0.8,  // data_integrity
  // ... 17 more categories
];

const sovereignty = 0.88;

// Generate mesh
const mesh = sovereigntyToMesh(identityVector, sovereignty);

// Write STL
writeSTL(mesh, '/path/to/artifact.stl');

// Generate ASCII preview
console.log(generateAsciiPreview(mesh));
```

### Integration with artifact-generator Skill

```typescript
import ArtifactGenerator from './artifact-generator.js';
import type { IdentityVector } from '../auth/geometric.js';

const generator = new ArtifactGenerator();
await generator.initialize(ctx);

const identity: IdentityVector = {
  userId: 'alice',
  categoryScores: {
    security: 0.9,
    reliability: 0.85,
    // ... other categories
  },
  sovereigntyScore: 0.88,
  lastUpdated: new Date().toISOString(),
};

const result = await generator.execute({ action: 'generate', identity }, ctx);

console.log(result.data.stlPath); // → data/artifacts/alice-2026-02-15T02-56-24-584Z.stl
console.log(result.data.asciiPreview); // → ASCII art preview
```

## Test Results

The test suite generates three reference artifacts:

| Artifact | Sovereignty | Vertices | Faces | File Size |
|----------|-------------|----------|-------|-----------|
| High sovereignty (smooth sphere) | 0.880 | 656 | 1280 | 63 KB |
| Medium sovereignty (faceted polyhedron) | 0.650 | 44 | 80 | 4.0 KB |
| Low sovereignty (jagged icosahedron) | 0.350 | 12 | 20 | 1.1 KB |

### ASCII Preview Example (High Sovereignty)

```
┌────────────────────────────────────────┐
│                   ●                    │
│           ●●●●●●● ● ●●●●●●●            │
│         ●●●●●● ●  ●  ● ●●●●●●●         │
│     ●●●●●● ● ● ●● ● ●● ● ● ●●●●●●      │
│    ●●   ● ● ●   ●   ●   ● ● ●●  ●●     │
│  ●●  ● ●   ●  ●●  ●  ●●  ●   ● ●  ●●   │
│ ●●●●●●●  ● ● ●    ●    ●  ●●  ●● ●●●●  │
│ ●  ●● ● ●    ● ●  ●  ● ● ●  ●   ●●   ● │
│●●●● ● ●   ●  ● ●     ● ●  ●   ● ●●●●●● │
│●●● ●● ● ● ●  ● ●  ●  ●    ● ● ●● ● ●●●●│
│●●●● ●   ●    ●    ●    ●    ●   ●  ●●● │
│●●● ●● ● ● ●    ●  ●  ●    ● ● ●  ● ●   │
│ ●●● ● ●   ●  ● ●    ●● ● ●● ● ● ●●●●   │
│●●  ●●   ●  ● ● ●  ●  ● ● ●  ●   ●●     │
│ ●●●●●●●  ● ● ● ●  ●   ●● ● ●  ●● ●●    │
│  ●●  ● ●   ●  ●●  ●  ●●  ● ● ● ●● ●    │
│    ●●  ●● ● ●   ●●  ●  ●● ● ● ● ●●     │
│     ●●● ●● ● ● ●● ● ●● ● ● ●●●●●●      │
│        ●●●●●●●●●  ●  ● ●●●●●●●         │
│           ●●●●●●●●● ●●●●●●●            │
└────────────────────────────────────────┘
```

## 3D Printing

The generated STL files are ready for 3D printing without modification. Recommended settings:

- **Material**: PLA, PETG, or resin
- **Layer height**: 0.2mm (standard) or 0.1mm (high detail)
- **Infill**: 15-20% (artifacts are decorative, not structural)
- **Supports**: Required for high-sovereignty spherical artifacts
- **Scale**: Default size is ~40mm diameter (scale as needed)

## Metadata Format

Each STL file has a corresponding JSON metadata file:

```json
{
  "userId": "alice",
  "sovereignty": 0.88,
  "vertexCount": 656,
  "faceCount": 1280,
  "subdivisions": 3,
  "timestamp": "2026-02-15T02:56:24.584Z",
  "identityVector": [0.9, 0.85, 0.8, ...],
  "categoryScores": {
    "security": 0.9,
    "reliability": 0.85,
    ...
  }
}
```

## Comparison Feature

The artifact generator includes a comparison tool for tracking sovereignty evolution:

```typescript
const result = await generator.execute({
  action: 'compare',
  pathA: 'data/artifacts/alice-old.json',
  pathB: 'data/artifacts/alice-new.json',
}, ctx);

console.log(result.data.description);
```

**Output:**
```
Comparison: alice vs alice
Sovereignty: 0.650 → 0.880 (Δ +0.230)
Vertices: 44 → 656 (Δ +612)
Faces: 80 → 1280 (Δ +1200)
Subdivisions: 1 → 3

→ Artifact B shows HIGHER sovereignty (smoother, more spherical)
```

## Mathematical Details

### Icosahedron Base

- **Vertices**: 12 (positioned at golden ratio intersections)
- **Faces**: 20 (equilateral triangles)
- **Radius**: 1.0 (unit sphere)

### Subdivision Algorithm

Each subdivision splits each triangle into 4 smaller triangles:
- **Level 0**: 12 vertices, 20 faces
- **Level 1**: 42 vertices, 80 faces
- **Level 2**: 162 vertices, 320 faces
- **Level 3**: 642 vertices, 1280 faces

Formula: `vertices = 10 × 4^n + 2`, `faces = 20 × 4^n`

### Identity Vector Displacement

Each dimension of the 20D identity vector modulates a vertex displacement:

```
displacement = identityVector[i % 20] × 0.3
newVertex = oldVertex × (1 + displacement)
```

This creates a unique "fingerprint" where:
- High scores (0.8-1.0) push vertices outward (protrusions)
- Low scores (0.0-0.4) pull vertices inward (indentations)
- Medium scores (0.4-0.6) maintain base shape

## Dependencies

**Zero external dependencies.** Pure Node.js built-ins:
- `fs` (file operations)
- `path` (path resolution)
- `Buffer` (binary STL encoding)
- Math.sqrt, Math.floor, etc. (geometry)

## Future Enhancements

1. **Color mapping**: Embed category scores as vertex colors (AMF/3MF format)
2. **Texture mapping**: UV coordinates for trust-debt category visualization
3. **Animation**: Generate time-series artifacts showing sovereignty evolution
4. **Multi-material printing**: Different colors for different score ranges
5. **QR code embedding**: Base64-encoded identity vector on artifact surface

## License

Part of IntentGuard — FIM-based permission system.

---

**Generated by**: IntentGuard Artifact Generation System
**Version**: 1.0.0
**Date**: 2026-02-15
