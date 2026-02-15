/**
 * src/skills/artifact-comparison.ts — Artifact Comparison & History System
 *
 * Provides visual diffing of geometric states (artifacts), historical tracking,
 * and ASCII preview generation for Discord reporting.
 *
 * CAPABILITIES:
 *   - Compare two MeshData artifacts and generate diff metrics
 *   - Store artifact snapshots with timestamps in data/artifacts/
 *   - Generate visual ASCII diff showing changes between states
 *   - Track artifact evolution over time
 *   - Query artifact history and retrieve snapshots
 *
 * STORAGE FORMAT:
 *   data/artifacts/{timestamp}-{sovereignty}.json
 *   {
 *     "timestamp": "2026-02-15T...",
 *     "sovereignty": 0.85,
 *     "mesh": {...},
 *     "metadata": {...}
 *   }
 *
 * NO EXTERNAL DEPS — Pure TypeScript with fs operations.
 */
import type { MeshData, Vector3 } from './geometry-converter.js';
export interface ArtifactSnapshot {
    timestamp: string;
    sovereignty: number;
    mesh: MeshData;
    metadata: {
        vertexCount: number;
        faceCount: number;
        boundingBox: {
            min: Vector3;
            max: Vector3;
        };
    };
}
export interface ArtifactDiff {
    timestamp: string;
    snapshot1: string;
    snapshot2: string;
    metrics: {
        sovereigntyDelta: number;
        vertexCountDelta: number;
        faceCountDelta: number;
        volumeDelta: number;
        geometricDistance: number;
    };
    summary: string;
}
/**
 * Save an artifact snapshot to disk.
 *
 * Filename format: {timestamp}-{sovereignty}.json
 * Example: 2026-02-15T18-30-45-123Z-0.850.json
 *
 * @param mesh - The mesh data to snapshot
 * @returns The created snapshot object
 */
export declare function saveArtifactSnapshot(mesh: MeshData): ArtifactSnapshot;
/**
 * Load an artifact snapshot by timestamp.
 *
 * @param timestamp - ISO timestamp or filename (with/without .json extension)
 * @returns The loaded snapshot, or null if not found
 */
export declare function loadArtifactSnapshot(timestamp: string): ArtifactSnapshot | null;
/**
 * List all artifact snapshots, sorted by timestamp (newest first).
 *
 * @returns Array of snapshot metadata (without full mesh data)
 */
export declare function listArtifactSnapshots(): Array<{
    timestamp: string;
    sovereignty: number;
    filename: string;
}>;
/**
 * Compare two artifact snapshots and generate diff metrics.
 *
 * @param snapshot1 - First snapshot (baseline)
 * @param snapshot2 - Second snapshot (comparison)
 * @returns Diff metrics and summary
 */
export declare function compareArtifacts(snapshot1: ArtifactSnapshot, snapshot2: ArtifactSnapshot): ArtifactDiff;
/**
 * Generate ASCII diff visualization showing changes between two artifacts.
 *
 * Displays side-by-side projections with change indicators.
 *
 * Format:
 *   BEFORE (sovereignty=0.75)    AFTER (sovereignty=0.85)
 *   ┌────────┐                   ┌────────┐
 *   │   ●    │                   │  ●●●   │
 *   │  ●●●   │                   │ ●●●●●  │
 *   │   ●    │                   │  ●●●   │
 *   └────────┘                   └────────┘
 *
 *   Δ Sovereignty: +0.100  Δ Vertices: +30  Geometric Distance: 0.123
 */
export declare function generateAsciiDiff(snapshot1: ArtifactSnapshot, snapshot2: ArtifactSnapshot): string;
/**
 * Get artifact evolution over time.
 *
 * @param limit - Maximum number of snapshots to return (default: 10)
 * @returns Array of snapshots sorted by timestamp (newest first)
 */
export declare function getArtifactHistory(limit?: number): ArtifactSnapshot[];
/**
 * Get the most recent artifact snapshot.
 *
 * @returns Latest snapshot, or null if no snapshots exist
 */
export declare function getLatestArtifact(): ArtifactSnapshot | null;
/**
 * Compare the current state against the most recent snapshot.
 *
 * @param currentMesh - The current mesh state
 * @returns Diff against latest snapshot, or null if no history exists
 */
export declare function compareAgainstHistory(currentMesh: MeshData): ArtifactDiff | null;
//# sourceMappingURL=artifact-comparison.d.ts.map