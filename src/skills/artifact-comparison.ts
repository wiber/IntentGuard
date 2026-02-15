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

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { MeshData, Vector3 } from './geometry-converter.js';

// ─── Types ──────────────────────────────────────────────────────────────

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
  snapshot1: string; // timestamp of first artifact
  snapshot2: string; // timestamp of second artifact
  metrics: {
    sovereigntyDelta: number;
    vertexCountDelta: number;
    faceCountDelta: number;
    volumeDelta: number; // Approximate volume change
    geometricDistance: number; // RMS distance between corresponding vertices
  };
  summary: string;
}

// ─── Storage Configuration ──────────────────────────────────────────────

const ARTIFACTS_DIR = join(process.cwd(), 'data', 'artifacts');

/**
 * Ensure artifacts directory exists.
 */
function ensureArtifactsDir(): void {
  if (!existsSync(ARTIFACTS_DIR)) {
    mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
}

// ─── Snapshot Management ────────────────────────────────────────────────

/**
 * Save an artifact snapshot to disk.
 *
 * Filename format: {timestamp}-{sovereignty}.json
 * Example: 2026-02-15T18-30-45-123Z-0.850.json
 *
 * @param mesh - The mesh data to snapshot
 * @returns The created snapshot object
 */
export function saveArtifactSnapshot(mesh: MeshData): ArtifactSnapshot {
  ensureArtifactsDir();

  const timestamp = new Date().toISOString();
  const sovereignty = mesh.metadata.sovereignty;

  // Compute bounding box
  const boundingBox = computeBoundingBox(mesh.vertices);

  const snapshot: ArtifactSnapshot = {
    timestamp,
    sovereignty,
    mesh,
    metadata: {
      vertexCount: mesh.vertices.length,
      faceCount: mesh.faces.length,
      boundingBox,
    },
  };

  // Sanitize timestamp for filename (replace colons with dashes)
  const fileTimestamp = timestamp.replace(/:/g, '-');
  const filename = `${fileTimestamp}-${sovereignty.toFixed(3)}.json`;
  const filepath = join(ARTIFACTS_DIR, filename);

  writeFileSync(filepath, JSON.stringify(snapshot, null, 2), 'utf-8');

  return snapshot;
}

/**
 * Load an artifact snapshot by timestamp.
 *
 * @param timestamp - ISO timestamp or filename (with/without .json extension)
 * @returns The loaded snapshot, or null if not found
 */
export function loadArtifactSnapshot(timestamp: string): ArtifactSnapshot | null {
  ensureArtifactsDir();

  // Try exact match first
  let filename = timestamp;
  if (!filename.endsWith('.json')) {
    filename += '.json';
  }

  let filepath = join(ARTIFACTS_DIR, filename);
  if (existsSync(filepath)) {
    const data = readFileSync(filepath, 'utf-8');
    return JSON.parse(data) as ArtifactSnapshot;
  }

  // Try with sanitized timestamp
  const fileTimestamp = timestamp.replace(/:/g, '-');
  const files = readdirSync(ARTIFACTS_DIR);
  const match = files.find(f => f.startsWith(fileTimestamp));

  if (match) {
    filepath = join(ARTIFACTS_DIR, match);
    const data = readFileSync(filepath, 'utf-8');
    return JSON.parse(data) as ArtifactSnapshot;
  }

  return null;
}

/**
 * List all artifact snapshots, sorted by timestamp (newest first).
 *
 * @returns Array of snapshot metadata (without full mesh data)
 */
export function listArtifactSnapshots(): Array<{ timestamp: string; sovereignty: number; filename: string }> {
  ensureArtifactsDir();

  const files = readdirSync(ARTIFACTS_DIR).filter(f => f.endsWith('.json'));
  const snapshots = files
    .map(filename => {
      try {
        const filepath = join(ARTIFACTS_DIR, filename);
        const data = JSON.parse(readFileSync(filepath, 'utf-8')) as ArtifactSnapshot;
        return {
          timestamp: data.timestamp,
          sovereignty: data.sovereignty,
          filename,
        };
      } catch {
        return null;
      }
    })
    .filter((s): s is { timestamp: string; sovereignty: number; filename: string } => s !== null);

  // Sort newest first
  snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return snapshots;
}

// ─── Geometric Utilities ────────────────────────────────────────────────

/**
 * Compute bounding box for a set of vertices.
 */
function computeBoundingBox(vertices: Vector3[]): { min: Vector3; max: Vector3 } {
  if (vertices.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    };
  }

  const min: Vector3 = { ...vertices[0] };
  const max: Vector3 = { ...vertices[0] };

  for (const v of vertices) {
    min.x = Math.min(min.x, v.x);
    min.y = Math.min(min.y, v.y);
    min.z = Math.min(min.z, v.z);
    max.x = Math.max(max.x, v.x);
    max.y = Math.max(max.y, v.y);
    max.z = Math.max(max.z, v.z);
  }

  return { min, max };
}

/**
 * Compute approximate volume of a bounding box.
 */
function computeVolume(bbox: { min: Vector3; max: Vector3 }): number {
  const dx = bbox.max.x - bbox.min.x;
  const dy = bbox.max.y - bbox.min.y;
  const dz = bbox.max.z - bbox.min.z;
  return dx * dy * dz;
}

/**
 * Compute RMS distance between two vertex sets.
 * If vertex counts differ, only compare up to the smaller count.
 */
function computeGeometricDistance(vertices1: Vector3[], vertices2: Vector3[]): number {
  const count = Math.min(vertices1.length, vertices2.length);
  if (count === 0) return 0;

  let sumSquaredDistance = 0;
  for (let i = 0; i < count; i++) {
    const v1 = vertices1[i];
    const v2 = vertices2[i];
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const dz = v2.z - v1.z;
    sumSquaredDistance += dx * dx + dy * dy + dz * dz;
  }

  return Math.sqrt(sumSquaredDistance / count);
}

// ─── Artifact Comparison ────────────────────────────────────────────────

/**
 * Compare two artifact snapshots and generate diff metrics.
 *
 * @param snapshot1 - First snapshot (baseline)
 * @param snapshot2 - Second snapshot (comparison)
 * @returns Diff metrics and summary
 */
export function compareArtifacts(snapshot1: ArtifactSnapshot, snapshot2: ArtifactSnapshot): ArtifactDiff {
  const sovereigntyDelta = snapshot2.sovereignty - snapshot1.sovereignty;
  const vertexCountDelta = snapshot2.metadata.vertexCount - snapshot1.metadata.vertexCount;
  const faceCountDelta = snapshot2.metadata.faceCount - snapshot1.metadata.faceCount;

  const volume1 = computeVolume(snapshot1.metadata.boundingBox);
  const volume2 = computeVolume(snapshot2.metadata.boundingBox);
  const volumeDelta = volume2 - volume1;

  const geometricDistance = computeGeometricDistance(
    snapshot1.mesh.vertices,
    snapshot2.mesh.vertices
  );

  // Generate human-readable summary
  const parts: string[] = [];

  if (Math.abs(sovereigntyDelta) > 0.01) {
    parts.push(`Sovereignty ${sovereigntyDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(sovereigntyDelta).toFixed(3)}`);
  }

  if (vertexCountDelta !== 0) {
    parts.push(`${Math.abs(vertexCountDelta)} vertices ${vertexCountDelta > 0 ? 'added' : 'removed'}`);
  }

  if (geometricDistance > 0.01) {
    parts.push(`Geometric shift: ${geometricDistance.toFixed(3)} units RMS`);
  }

  const summary = parts.length > 0 ? parts.join('; ') : 'No significant changes';

  return {
    timestamp: new Date().toISOString(),
    snapshot1: snapshot1.timestamp,
    snapshot2: snapshot2.timestamp,
    metrics: {
      sovereigntyDelta,
      vertexCountDelta,
      faceCountDelta,
      volumeDelta,
      geometricDistance,
    },
    summary,
  };
}

// ─── ASCII Diff Visualization ───────────────────────────────────────────

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
export function generateAsciiDiff(snapshot1: ArtifactSnapshot, snapshot2: ArtifactSnapshot): string {
  const width = 20;
  const height = 12;

  // Generate projection for each snapshot
  const grid1 = projectToGrid(snapshot1.mesh.vertices, width, height);
  const grid2 = projectToGrid(snapshot2.mesh.vertices, width, height);

  const diff = compareArtifacts(snapshot1, snapshot2);

  // Build side-by-side display
  const lines: string[] = [];
  lines.push('');
  lines.push(`BEFORE (σ=${snapshot1.sovereignty.toFixed(3)})`.padEnd(width + 4) +
              `AFTER (σ=${snapshot2.sovereignty.toFixed(3)})`);
  lines.push('┌' + '─'.repeat(width) + '┐  ' + '┌' + '─'.repeat(width) + '┐');

  for (let y = 0; y < height; y++) {
    const row1 = '│' + grid1[y].join('') + '│';
    const row2 = '│' + grid2[y].join('') + '│';
    lines.push(row1 + '  ' + row2);
  }

  lines.push('└' + '─'.repeat(width) + '┘  ' + '└' + '─'.repeat(width) + '┘');
  lines.push('');

  // Add metrics
  lines.push(`Δ Sovereignty: ${diff.metrics.sovereigntyDelta >= 0 ? '+' : ''}${diff.metrics.sovereigntyDelta.toFixed(3)}  ` +
             `Δ Vertices: ${diff.metrics.vertexCountDelta >= 0 ? '+' : ''}${diff.metrics.vertexCountDelta}  ` +
             `Distance: ${diff.metrics.geometricDistance.toFixed(3)}`);
  lines.push('');
  lines.push(`Summary: ${diff.summary}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Project vertices onto a 2D ASCII grid (top-down XY projection).
 */
function projectToGrid(vertices: Vector3[], width: number, height: number): string[][] {
  const grid: string[][] = Array.from({ length: height }, () => Array(width).fill(' '));

  if (vertices.length === 0) return grid;

  // Find bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  // Project vertices onto grid
  for (const v of vertices) {
    const x = Math.floor(((v.x - minX) / rangeX) * (width - 1));
    const y = Math.floor(((v.y - minY) / rangeY) * (height - 1));
    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[height - 1 - y][x] = '●'; // Flip Y for top-down view
    }
  }

  return grid;
}

// ─── Artifact History Query ─────────────────────────────────────────────

/**
 * Get artifact evolution over time.
 *
 * @param limit - Maximum number of snapshots to return (default: 10)
 * @returns Array of snapshots sorted by timestamp (newest first)
 */
export function getArtifactHistory(limit: number = 10): ArtifactSnapshot[] {
  const list = listArtifactSnapshots();
  const snapshots: ArtifactSnapshot[] = [];

  for (let i = 0; i < Math.min(limit, list.length); i++) {
    const snapshot = loadArtifactSnapshot(list[i].timestamp);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  return snapshots;
}

/**
 * Get the most recent artifact snapshot.
 *
 * @returns Latest snapshot, or null if no snapshots exist
 */
export function getLatestArtifact(): ArtifactSnapshot | null {
  const list = listArtifactSnapshots();
  if (list.length === 0) return null;
  return loadArtifactSnapshot(list[0].timestamp);
}

/**
 * Compare the current state against the most recent snapshot.
 *
 * @param currentMesh - The current mesh state
 * @returns Diff against latest snapshot, or null if no history exists
 */
export function compareAgainstHistory(currentMesh: MeshData): ArtifactDiff | null {
  const latest = getLatestArtifact();
  if (!latest) return null;

  const currentSnapshot: ArtifactSnapshot = {
    timestamp: new Date().toISOString(),
    sovereignty: currentMesh.metadata.sovereignty,
    mesh: currentMesh,
    metadata: {
      vertexCount: currentMesh.vertices.length,
      faceCount: currentMesh.faces.length,
      boundingBox: computeBoundingBox(currentMesh.vertices),
    },
  };

  return compareArtifacts(latest, currentSnapshot);
}
