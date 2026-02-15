/**
 * src/skills/artifact-generator.ts — FIM Physical Artifact Generator
 *
 * Converts IntentGuard identity vectors (trust-debt scores) into 3D-printable
 * STL files. Each user's unique sovereignty profile becomes a physical artifact.
 *
 * WORKFLOW:
 *   1. Load identity vector from trust-debt pipeline
 *   2. Convert to 3D mesh (geometry-converter)
 *   3. Write binary STL file (stl-writer)
 *   4. Generate ASCII preview for Discord
 *   5. Store metadata for comparison
 *
 * ARTIFACTS STORED IN:
 *   data/artifacts/{userId}-{timestamp}.stl
 *   data/artifacts/{userId}-{timestamp}.json (metadata)
 */
import type { SkillContext, SkillResult } from '../types.js';
import type { IdentityVector } from '../auth/geometric.js';
export default class ArtifactGenerator {
    name: string;
    description: string;
    private log;
    private artifactDir;
    initialize(ctx: SkillContext): Promise<void>;
    /**
     * Execute artifact generation.
     *
     * Command format:
     *   { action: 'generate', identity: IdentityVector }
     *   { action: 'compare', pathA: string, pathB: string }
     */
    execute(command: unknown, ctx: SkillContext): Promise<SkillResult>;
    /**
     * Generate a 3D artifact from an identity vector.
     *
     * STEPS:
     *   1. Convert identity to 20-dimensional vector
     *   2. Generate mesh with sovereignty modulation
     *   3. Write STL file
     *   4. Generate ASCII preview
     *   5. Save metadata
     */
    generateArtifact(identity: IdentityVector): Promise<SkillResult>;
    /**
     * Compare two artifacts (by metadata JSON path).
     *
     * Returns vertex/face diffs and a human-readable description.
     */
    compareArtifacts(pathA: string, pathB: string): Promise<SkillResult>;
    /**
     * Convert IdentityVector (sparse category scores) to dense 20-dimensional vector.
     *
     * Uses 0.5 as default for missing categories.
     */
    private identityToVector;
    private generateComparisonDescription;
}
//# sourceMappingURL=artifact-generator.d.ts.map