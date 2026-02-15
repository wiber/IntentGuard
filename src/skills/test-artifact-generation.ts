/**
 * src/skills/test-artifact-generation.ts — Test Artifact Generation
 *
 * Simple test script to validate the sovereignty-to-geometry converter and STL writer.
 *
 * USAGE:
 *   npx tsx src/skills/test-artifact-generation.ts
 */

import { sovereigntyToMesh, generateAsciiPreview } from './geometry-converter.js';
import { writeSTL } from './stl-writer.js';
import { resolve } from 'path';

// ─── Test Cases ─────────────────────────────────────────────────────────

const testCases = [
  {
    name: 'High Sovereignty (Smooth Sphere)',
    identityVector: [0.9, 0.85, 0.8, 0.9, 0.88, 0.92, 0.87, 0.9, 0.85, 0.83, 0.91, 0.89, 0.86, 0.9, 0.88, 0.87, 0.85, 0.9, 0.84, 0.91],
    sovereignty: 0.88,
  },
  {
    name: 'Medium Sovereignty (Faceted Polyhedron)',
    identityVector: [0.6, 0.65, 0.7, 0.55, 0.68, 0.62, 0.7, 0.65, 0.6, 0.58, 0.67, 0.63, 0.66, 0.64, 0.68, 0.61, 0.65, 0.69, 0.62, 0.67],
    sovereignty: 0.65,
  },
  {
    name: 'Low Sovereignty (Jagged Icosahedron)',
    identityVector: [0.3, 0.4, 0.35, 0.25, 0.38, 0.42, 0.3, 0.35, 0.4, 0.28, 0.37, 0.33, 0.36, 0.34, 0.38, 0.31, 0.35, 0.39, 0.32, 0.37],
    sovereignty: 0.35,
  },
];

// ─── Run Tests ──────────────────────────────────────────────────────────

console.log('🔬 Testing Sovereignty-to-Geometry Converter\n');

for (const test of testCases) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Test: ${test.name}`);
  console.log(`   Sovereignty: ${test.sovereignty.toFixed(3)}`);
  console.log(`${'='.repeat(60)}\n`);

  // 1. Generate mesh
  const mesh = sovereigntyToMesh(test.identityVector, test.sovereignty);
  console.log(`✓ Mesh generated:`);
  console.log(`  - Vertices: ${mesh.vertices.length}`);
  console.log(`  - Faces: ${mesh.faces.length}`);
  console.log(`  - Subdivisions: ${mesh.metadata.subdivisions}`);

  // 2. Generate ASCII preview
  const ascii = generateAsciiPreview(mesh);
  console.log(`\n✓ ASCII Preview:`);
  console.log(ascii);

  // 3. Write STL file
  const filename = test.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.stl';
  const filepath = resolve(process.cwd(), 'data', 'artifacts', filename);
  writeSTL(mesh, filepath);
  console.log(`\n✓ STL written: ${filepath}`);
}

console.log(`\n${'='.repeat(60)}`);
console.log('✅ All tests completed successfully!');
console.log(`${'='.repeat(60)}\n`);

// ─── Summary ────────────────────────────────────────────────────────────

console.log('📦 Generated Artifacts:');
console.log('  - data/artifacts/high-sovereignty-smooth-sphere.stl');
console.log('  - data/artifacts/medium-sovereignty-faceted-polyhedron.stl');
console.log('  - data/artifacts/low-sovereignty-jagged-icosahedron.stl');
console.log('\n🚀 Ready for 3D printing!');
