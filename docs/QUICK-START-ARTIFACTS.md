# Quick Start: IntentGuard Artifacts

## TL;DR

```bash
# 1. Run test suite (generates 3 reference artifacts)
npx tsx src/skills/test-artifact-generation.ts

# 2. Check output
ls -lh data/artifacts/*.stl

# 3. Open in 3D viewer (Windows: 3D Viewer, Mac: Preview, Linux: MeshLab)
open data/artifacts/high-sovereignty-smooth-sphere-.stl
```

## Generate Custom Artifact

```typescript
import { sovereigntyToMesh, generateAsciiPreview } from './src/skills/geometry-converter.js';
import { writeSTL } from './src/skills/stl-writer.js';

// Define your identity (20 dimensions, 0.0-1.0)
const identityVector = [
  0.9,  // security
  0.85, // reliability
  0.8,  // data_integrity
  0.9,  // process_adherence
  0.88, // code_quality
  0.92, // testing
  0.87, // documentation
  0.9,  // communication
  0.85, // time_management
  0.83, // resource_efficiency
  0.91, // risk_assessment
  0.89, // compliance
  0.86, // innovation
  0.9,  // collaboration
  0.88, // accountability
  0.87, // transparency
  0.85, // adaptability
  0.9,  // domain_expertise
  0.84, // user_focus
  0.91, // ethical_alignment
];

const sovereignty = 0.88;

// Generate mesh
const mesh = sovereigntyToMesh(identityVector, sovereignty);

// Preview in terminal
console.log(generateAsciiPreview(mesh));

// Write STL
writeSTL(mesh, 'data/artifacts/my-artifact.stl');
```

## Sovereignty Levels

| Sovereignty | Mesh Type | Vertices | Faces | Visual |
|-------------|-----------|----------|-------|--------|
| 0.9 - 1.0 | Smooth sphere | 656 | 1280 | ●●●●●● |
| 0.8 - 0.9 | Smooth sphere | 656 | 1280 | ●●●●●● |
| 0.5 - 0.8 | Faceted polyhedron | 44 | 80 | ●  ●  ● |
| 0.0 - 0.5 | Jagged icosahedron | 12 | 20 | ●    ● |

## 3D Printing Settings

**Recommended**:
- Material: PLA or PETG
- Layer height: 0.2mm
- Infill: 15%
- Supports: Auto-generate
- Scale: 100% (40mm diameter)

**Advanced**:
- Material: Resin (ultra-smooth surface)
- Layer height: 0.05mm
- Post-processing: Sand + polish

## File Structure

```
data/artifacts/
├── high-sovereignty-smooth-sphere-.stl       (63 KB, 656 vertices)
├── medium-sovereignty-faceted-polyhedron-.stl (4.0 KB, 44 vertices)
├── low-sovereignty-jagged-icosahedron-.stl   (1.1 KB, 12 vertices)
└── {userId}-{timestamp}.stl                  (your artifacts)
```

## API Reference

### Core Functions

```typescript
// 1. Generate mesh
sovereigntyToMesh(identityVector: number[], sovereignty: number): MeshData

// 2. ASCII preview
generateAsciiPreview(mesh: MeshData): string

// 3. Write STL
writeSTL(mesh: MeshData, filepath: string): void

// 4. Full pipeline (via skill class)
const generator = new ArtifactGenerator();
await generator.initialize(ctx);
await generator.execute({ action: 'generate', identity }, ctx);
```

### Types

```typescript
interface MeshData {
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

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Face {
  a: number; // vertex index
  b: number;
  c: number;
}
```

## Troubleshooting

### Issue: STL file won't open in slicer

**Solution**: Verify binary format
```bash
hexdump -C data/artifacts/your-file.stl | head -5
# Should show: "IntentGuard FIM" in first 16 bytes
```

### Issue: Mesh looks wrong in preview

**Solution**: Check identity vector length
```typescript
if (identityVector.length !== 20) {
  throw new Error('Identity vector must be 20-dimensional');
}
```

### Issue: File size too large

**Solution**: Reduce sovereignty (fewer subdivisions)
```typescript
// High sovereignty (656 vertices) = 63 KB
// Medium sovereignty (44 vertices) = 4.0 KB
// Low sovereignty (12 vertices) = 1.1 KB
```

## Next Steps

1. ✓ Generate test artifacts
2. ✓ Verify in 3D viewer
3. → Integrate with trust-debt pipeline
4. → Print physical artifacts
5. → Compare sovereignty evolution

## Documentation

- **Full guide**: `/docs/ARTIFACT-GENERATION.md`
- **API reference**: `/src/skills/README.md`
- **Geometric auth**: `/src/auth/geometric.ts`

## Support

Issues: https://github.com/yourusername/IntentGuard/issues

---

**Generated**: 2026-02-15 | **Version**: 1.0.0
