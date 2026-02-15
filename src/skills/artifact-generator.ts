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

import { resolve } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import type { Logger, SkillContext, SkillResult } from '../types.js';
import type { IdentityVector } from '../auth/geometric.js';
import { sovereigntyToMesh, generateAsciiPreview, type MeshData } from './geometry-converter.js';
import { writeSTL } from './stl-writer.js';

// ─── Types ──────────────────────────────────────────────────────────────

interface ArtifactResult {
  stlPath: string;
  metadataPath: string;
  asciiPreview: string;
  metadata: {
    userId: string;
    sovereignty: number;
    vertexCount: number;
    faceCount: number;
    subdivisions: number;
    timestamp: string;
  };
}

interface ComparisonResult {
  vertexDiff: number;
  faceDiff: number;
  sovereigntyDiff: number;
  description: string;
}

// ─── Artifact Generator Class ──────────────────────────────────────────

export default class ArtifactGenerator {
  name = 'artifact-generator';
  description = 'Generate 3D-printable STL artifacts from identity vectors';
  private log!: Logger;
  private artifactDir!: string;

  async initialize(ctx: SkillContext): Promise<void> {
    this.log = ctx.log;
    this.artifactDir = resolve(process.cwd(), 'data', 'artifacts');

    // Ensure artifacts directory exists
    if (!existsSync(this.artifactDir)) {
      mkdirSync(this.artifactDir, { recursive: true });
      this.log.info(`Created artifacts directory: ${this.artifactDir}`);
    }

    this.log.info(`ArtifactGenerator initialized — storing artifacts in ${this.artifactDir}`);
  }

  /**
   * Execute artifact generation.
   *
   * Command format:
   *   { action: 'generate', identity: IdentityVector }
   *   { action: 'compare', pathA: string, pathB: string }
   */
  async execute(command: unknown, ctx: SkillContext): Promise<SkillResult> {
    const cmd = command as { action: string; [key: string]: unknown };

    switch (cmd.action) {
      case 'generate':
        return this.generateArtifact(cmd.identity as IdentityVector);
      case 'compare':
        return this.compareArtifacts(cmd.pathA as string, cmd.pathB as string);
      default:
        return { success: false, message: `Unknown action: ${cmd.action}` };
    }
  }

  // ─── Generate Artifact ───────────────────────────────────────────────

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
  async generateArtifact(identity: IdentityVector): Promise<SkillResult> {
    try {
      this.log.info(`Generating artifact for user: ${identity.userId}`);

      // 1. Convert identity to 20-dimensional vector
      const identityVector = this.identityToVector(identity);

      // 2. Generate mesh
      const mesh = sovereigntyToMesh(identityVector, identity.sovereigntyScore);
      this.log.info(`Mesh generated: ${mesh.vertices.length} vertices, ${mesh.faces.length} faces`);

      // 3. Write STL file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const basename = `${identity.userId}-${timestamp}`;
      const stlPath = resolve(this.artifactDir, `${basename}.stl`);
      writeSTL(mesh, stlPath);
      this.log.info(`STL written: ${stlPath}`);

      // 4. Generate ASCII preview
      const asciiPreview = generateAsciiPreview(mesh);

      // 5. Save metadata
      const metadataPath = resolve(this.artifactDir, `${basename}.json`);
      const metadata = {
        userId: identity.userId,
        sovereignty: identity.sovereigntyScore,
        vertexCount: mesh.vertices.length,
        faceCount: mesh.faces.length,
        subdivisions: mesh.metadata.subdivisions,
        timestamp: mesh.metadata.timestamp,
        identityVector,
        categoryScores: identity.categoryScores,
      };
      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      const result: ArtifactResult = {
        stlPath,
        metadataPath,
        asciiPreview,
        metadata: {
          userId: metadata.userId,
          sovereignty: metadata.sovereignty,
          vertexCount: metadata.vertexCount,
          faceCount: metadata.faceCount,
          subdivisions: metadata.subdivisions,
          timestamp: metadata.timestamp,
        },
      };

      return {
        success: true,
        message: `Artifact generated: ${stlPath}`,
        data: result,
      };
    } catch (error) {
      this.log.error(`Artifact generation failed: ${error}`);
      return {
        success: false,
        message: `Artifact generation failed: ${error}`,
      };
    }
  }

  // ─── Compare Artifacts ───────────────────────────────────────────────

  /**
   * Compare two artifacts (by metadata JSON path).
   *
   * Returns vertex/face diffs and a human-readable description.
   */
  async compareArtifacts(pathA: string, pathB: string): Promise<SkillResult> {
    try {
      const metaA = JSON.parse(readFileSync(pathA, 'utf-8'));
      const metaB = JSON.parse(readFileSync(pathB, 'utf-8'));

      const vertexDiff = metaB.vertexCount - metaA.vertexCount;
      const faceDiff = metaB.faceCount - metaA.faceCount;
      const sovereigntyDiff = metaB.sovereignty - metaA.sovereignty;

      const description = this.generateComparisonDescription(metaA, metaB, {
        vertexDiff,
        faceDiff,
        sovereigntyDiff,
      });

      const result: ComparisonResult = {
        vertexDiff,
        faceDiff,
        sovereigntyDiff,
        description,
      };

      return {
        success: true,
        message: 'Artifact comparison complete',
        data: result,
      };
    } catch (error) {
      this.log.error(`Artifact comparison failed: ${error}`);
      return {
        success: false,
        message: `Artifact comparison failed: ${error}`,
      };
    }
  }

  // ─── Helper: Identity to Vector ──────────────────────────────────────

  /**
   * Convert IdentityVector (sparse category scores) to dense 20-dimensional vector.
   *
   * Uses 0.5 as default for missing categories.
   */
  private identityToVector(identity: IdentityVector): number[] {
    const categories = [
      'security', 'reliability', 'data_integrity', 'process_adherence',
      'code_quality', 'testing', 'documentation', 'communication',
      'time_management', 'resource_efficiency', 'risk_assessment', 'compliance',
      'innovation', 'collaboration', 'accountability', 'transparency',
      'adaptability', 'domain_expertise', 'user_focus', 'ethical_alignment',
    ];

    return categories.map(cat => identity.categoryScores[cat as keyof typeof identity.categoryScores] ?? 0.5);
  }

  // ─── Helper: Comparison Description ──────────────────────────────────

  private generateComparisonDescription(
    metaA: { userId: string; sovereignty: number; vertexCount: number; faceCount: number; subdivisions: number },
    metaB: { userId: string; sovereignty: number; vertexCount: number; faceCount: number; subdivisions: number },
    diff: { vertexDiff: number; faceDiff: number; sovereigntyDiff: number },
  ): string {
    const lines: string[] = [];

    lines.push(`Comparison: ${metaA.userId} vs ${metaB.userId}`);
    lines.push('');
    lines.push(`Sovereignty: ${metaA.sovereignty.toFixed(3)} → ${metaB.sovereignty.toFixed(3)} (Δ ${diff.sovereigntyDiff >= 0 ? '+' : ''}${diff.sovereigntyDiff.toFixed(3)})`);
    lines.push(`Vertices: ${metaA.vertexCount} → ${metaB.vertexCount} (Δ ${diff.vertexDiff >= 0 ? '+' : ''}${diff.vertexDiff})`);
    lines.push(`Faces: ${metaA.faceCount} → ${metaB.faceCount} (Δ ${diff.faceDiff >= 0 ? '+' : ''}${diff.faceDiff})`);
    lines.push(`Subdivisions: ${metaA.subdivisions} → ${metaB.subdivisions}`);
    lines.push('');

    if (diff.sovereigntyDiff > 0.1) {
      lines.push('→ Artifact B shows HIGHER sovereignty (smoother, more spherical)');
    } else if (diff.sovereigntyDiff < -0.1) {
      lines.push('→ Artifact A shows HIGHER sovereignty (smoother, more spherical)');
    } else {
      lines.push('→ Similar sovereignty levels (comparable mesh smoothness)');
    }

    return lines.join('\n');
  }
}

