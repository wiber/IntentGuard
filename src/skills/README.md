# IntentGuard Skills

This directory contains the skill modules for IntentGuard's FIM-based permission system.

## Core Skills

### artifact-generator.ts

**Purpose**: Generate 3D-printable STL files from identity vectors.

**Commands**:
- `generate` — Convert identity vector → 3D mesh → STL file
- `compare` — Compare two artifacts (sovereignty evolution)

**Output**:
- `data/artifacts/{userId}-{timestamp}.stl` (3D model)
- `data/artifacts/{userId}-{timestamp}.json` (metadata)

**Features**:
- Sovereignty-based mesh smoothness (high = sphere, low = jagged)
- ASCII preview for Discord/terminal
- Artifact comparison with diff analysis

---

## Supporting Modules

### geometry-converter.ts

**Purpose**: Convert 20D identity vectors into 3D mesh geometry.

**Key Functions**:
```typescript
sovereigntyToMesh(identityVector: number[], sovereignty: number): MeshData
generateAsciiPreview(mesh: MeshData): string
```

**Algorithm**:
1. Base icosahedron (12 vertices, 20 faces)
2. Subdivide based on sovereignty (0-3 levels)
3. Apply identity vector as vertex displacement
4. Return mesh data (vertices + faces)

**Sovereignty Mapping**:
- `>0.8` → 3 subdivisions (656 vertices, 1280 faces) — smooth sphere
- `0.5-0.8` → 1 subdivision (44 vertices, 80 faces) — faceted polyhedron
- `<0.5` → 0 subdivisions (12 vertices, 20 faces) — jagged icosahedron

---

### stl-writer.ts

**Purpose**: Write MeshData to binary STL format.

**Key Functions**:
```typescript
meshToSTLBuffer(mesh: MeshData): Buffer
writeSTL(mesh: MeshData, filepath: string): void
```

**Binary STL Format**:
- 80-byte header: `"IntentGuard FIM — sovereignty={score}"`
- 4-byte triangle count (uint32 LE)
- Per-triangle (50 bytes): normal + 3 vertices + attribute

**3D Print Ready**: Output files work directly with slicers (Cura, PrusaSlicer, etc.)

---

## Testing

### test-artifact-generation.ts

**Purpose**: Validate the complete artifact generation pipeline.

**Usage**:
```bash
npx tsx src/skills/test-artifact-generation.ts
```

**Test Cases**:
1. High sovereignty (0.88) → smooth sphere (63 KB)
2. Medium sovereignty (0.65) → faceted polyhedron (4.0 KB)
3. Low sovereignty (0.35) → jagged icosahedron (1.1 KB)

**Validation**:
- ✓ Mesh generation (vertices, faces, subdivisions)
- ✓ ASCII preview rendering
- ✓ Binary STL file output
- ✓ File size verification
- ✓ Header format validation

---

## Integration with IntentGuard

### Identity Vector (20 Dimensions)

The artifact generator consumes identity vectors from the geometric permission engine:

```typescript
import { loadIdentityFromPipeline } from '../auth/geometric.js';

const identity = loadIdentityFromPipeline('data/pipeline-runs/latest', 'alice');

// identity.categoryScores → 20D vector
// identity.sovereigntyScore → mesh smoothness
```

**20 Trust-Debt Categories**:
```
security, reliability, data_integrity, process_adherence,
code_quality, testing, documentation, communication,
time_management, resource_efficiency, risk_assessment, compliance,
innovation, collaboration, accountability, transparency,
adaptability, domain_expertise, user_focus, ethical_alignment
```

### Permission System Integration

```typescript
import ArtifactGenerator from './artifact-generator.js';
import { checkPermission, getRequirement } from '../auth/geometric.js';

// 1. Check permission
const result = checkPermission(identity, getRequirement('git_push'));

if (result.allowed) {
  // 2. Generate artifact (physical manifestation of permission)
  const artifact = await generator.execute({ action: 'generate', identity }, ctx);

  console.log(`Permission granted — artifact generated: ${artifact.data.stlPath}`);
}
```

---

## File Structure

```
src/skills/
├── artifact-generator.ts       # Main skill class
├── geometry-converter.ts       # Identity → mesh converter
├── stl-writer.ts               # Mesh → STL writer
├── test-artifact-generation.ts # Validation test suite
└── README.md                   # This file

data/artifacts/
├── high-sovereignty-smooth-sphere-.stl
├── medium-sovereignty-faceted-polyhedron-.stl
├── low-sovereignty-jagged-icosahedron-.stl
└── {userId}-{timestamp}.stl    # User artifacts
└── {userId}-{timestamp}.json   # Metadata
```

---

## Dependencies

**Zero external dependencies.** Pure Node.js built-ins:
- `fs` — File operations
- `path` — Path resolution
- `Buffer` — Binary STL encoding
- Standard Math — Geometry calculations

---

## Design Principles

### 1. Sovereignty = Smoothness

Higher trust scores produce smoother, more spherical artifacts. This visual metaphor represents:
- **Smooth sphere** → High trust, many capabilities, permissive
- **Faceted polyhedron** → Medium trust, balanced capabilities
- **Jagged icosahedron** → Low trust, restricted capabilities

### 2. Identity = Geometry

The 20-dimensional identity vector directly modulates the mesh:
- Each dimension affects vertex displacement
- High scores → protrusions (strengths)
- Low scores → indentations (weaknesses)
- Result: Unique "fingerprint" per user

### 3. Physical Manifestation

Artifacts are:
- **Tangible**: 3D-printable, holdable representations of trust
- **Unique**: No two users produce identical artifacts
- **Comparable**: Side-by-side comparison shows sovereignty evolution
- **Shareable**: STL files can be printed, distributed, displayed

---

## Mathematical Foundation

### Icosahedron Construction

```typescript
const phi = (1 + Math.sqrt(5)) / 2;  // Golden ratio
const vertices = [
  { x: 0, y: b, z: -a },
  { x: b, y: a, z: 0 },
  // ... 10 more vertices
];
```

Normalized to unit sphere for even distribution.

### Subdivision Algorithm

```typescript
function subdivideMesh(vertices, faces) {
  for (face of faces) {
    const m0 = getMidpoint(face.a, face.b);
    const m1 = getMidpoint(face.b, face.c);
    const m2 = getMidpoint(face.c, face.a);

    // 1 triangle → 4 triangles
    newFaces.push(
      { a: face.a, b: m0, c: m2 },
      { a: face.b, b: m1, c: m0 },
      { a: face.c, b: m2, c: m1 },
      { a: m0, b: m1, c: m2 },
    );
  }
}
```

### Displacement Calculation

```typescript
const displacement = identityVector[i % 20] * 0.3;
newVertex = {
  x: oldVertex.x * (1 + displacement),
  y: oldVertex.y * (1 + displacement),
  z: oldVertex.z * (1 + displacement),
};
```

---

## Example Workflows

### Workflow 1: Generate Artifact for New User

```typescript
import { loadIdentityFromPipeline } from '../auth/geometric.js';
import ArtifactGenerator from './artifact-generator.js';

// 1. Load identity from trust-debt pipeline
const identity = loadIdentityFromPipeline('data/pipeline-runs/latest', 'bob');

// 2. Generate artifact
const generator = new ArtifactGenerator();
await generator.initialize(ctx);

const result = await generator.execute({ action: 'generate', identity }, ctx);

// 3. Output
console.log(result.data.asciiPreview);  // Terminal preview
console.log(result.data.stlPath);       // data/artifacts/bob-{timestamp}.stl
```

### Workflow 2: Track Sovereignty Evolution

```typescript
// Generate artifact at T0
const artifact1 = await generator.execute({ action: 'generate', identity }, ctx);

// User completes tasks, trust-debt pipeline runs again
// Generate artifact at T1
const artifact2 = await generator.execute({ action: 'generate', updatedIdentity }, ctx);

// Compare
const comparison = await generator.execute({
  action: 'compare',
  pathA: artifact1.data.metadataPath,
  pathB: artifact2.data.metadataPath,
}, ctx);

console.log(comparison.data.description);
// → "Sovereignty: 0.650 → 0.880 (Δ +0.230)"
```

### Workflow 3: Batch Generate Artifacts

```bash
# Generate artifacts for all users
for user in alice bob charlie; do
  npx tsx -e "
    import { loadIdentityFromPipeline } from './src/auth/geometric.js';
    import ArtifactGenerator from './src/skills/artifact-generator.js';

    const identity = loadIdentityFromPipeline('data/pipeline-runs/latest', '$user');
    const generator = new ArtifactGenerator();
    await generator.initialize({ log: console });
    await generator.execute({ action: 'generate', identity }, { log: console });
  "
done
```

---

## Future Enhancements

### Short Term
1. **Color gradients** — Map category scores to vertex colors (requires AMF/3MF)
2. **Texture UVs** — Apply trust-debt category labels as textures
3. **Size scaling** — Auto-scale based on sovereignty (bigger = higher trust)

### Medium Term
4. **Multi-material printing** — Different filament colors for score ranges
5. **Animation support** — Generate time-series frames for sovereignty evolution
6. **QR code embedding** — Encode identity vector on artifact base

### Long Term
7. **Blockchain anchoring** — Cryptographic proof of artifact authenticity
8. **NFT integration** — Mint artifacts as non-fungible tokens
9. **AR visualization** — View artifacts in augmented reality before printing

---

## Documentation

- **Comprehensive guide**: `/docs/ARTIFACT-GENERATION.md`
- **Geometric permission system**: `/src/auth/geometric.ts`
- **Trust-debt pipeline**: `/docs/TRUST-DEBT-PIPELINE.md` (if exists)

---

**Last updated**: 2026-02-15
**Status**: ✅ Fully functional — zero external dependencies
