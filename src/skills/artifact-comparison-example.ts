/**
 * src/skills/artifact-comparison-example.ts — Usage Examples
 *
 * Demonstrates how to integrate the artifact comparison system with
 * artifact generation workflow and Discord reporting.
 */

import { sovereigntyToMesh } from './geometry-converter.js';
import { writeSTL } from './stl-writer.js';
import {
  saveArtifactSnapshot,
  loadArtifactSnapshot,
  compareArtifacts,
  generateAsciiDiff,
  getLatestArtifact,
  compareAgainstHistory,
  listArtifactSnapshots,
} from './artifact-comparison.js';

// ─── Example 1: Basic Artifact Generation with History ─────────────────

/**
 * Generate an artifact and save it to history.
 * Call this whenever a new artifact is generated.
 */
export function generateAndSaveArtifact(identityVector: number[], sovereignty: number): void {
  // 1. Generate mesh geometry
  const mesh = sovereigntyToMesh(identityVector, sovereignty);

  // 2. Save snapshot to history
  const snapshot = saveArtifactSnapshot(mesh);

  console.log(`📦 Artifact saved: ${snapshot.timestamp}`);
  console.log(`   Sovereignty: ${sovereignty.toFixed(3)}`);
  console.log(`   Vertices: ${mesh.vertices.length}`);
  console.log(`   Faces: ${mesh.faces.length}`);

  // 3. Optional: Write STL file
  const stlPath = `/tmp/artifact-${Date.now()}.stl`;
  writeSTL(mesh, stlPath);
  console.log(`   STL: ${stlPath}`);
}

// ─── Example 2: Compare Current State with History ─────────────────────

/**
 * Compare the current sovereignty state against the most recent snapshot.
 * Use this to detect significant changes before generating a new artifact.
 */
export function checkForSignificantChange(
  identityVector: number[],
  sovereignty: number
): { hasChanged: boolean; summary: string } {
  const currentMesh = sovereigntyToMesh(identityVector, sovereignty);
  const diff = compareAgainstHistory(currentMesh);

  if (!diff) {
    return { hasChanged: false, summary: 'No history to compare against' };
  }

  // Define thresholds for significant change
  const significantSovereigntyDelta = 0.05; // 5% change
  const significantGeometricDistance = 0.1; // 0.1 units RMS

  const hasChanged =
    Math.abs(diff.metrics.sovereigntyDelta) > significantSovereigntyDelta ||
    diff.metrics.geometricDistance > significantGeometricDistance;

  return {
    hasChanged,
    summary: diff.summary,
  };
}

// ─── Example 3: Discord Reporting ───────────────────────────────────────

/**
 * Generate Discord-friendly report comparing two artifacts.
 * Post this to #trust-debt-public or #ops-board.
 */
export function generateDiscordReport(timestamp1: string, timestamp2: string): string {
  const snapshot1 = loadArtifactSnapshot(timestamp1);
  const snapshot2 = loadArtifactSnapshot(timestamp2);

  if (!snapshot1 || !snapshot2) {
    return '❌ Could not load snapshots for comparison';
  }

  const ascii = generateAsciiDiff(snapshot1, snapshot2);
  const diff = compareArtifacts(snapshot1, snapshot2);

  return `
🔍 **Artifact Evolution Report**

${ascii}

**Analysis:**
${diff.summary}

**Timestamps:**
Before: ${new Date(snapshot1.timestamp).toLocaleString()}
After: ${new Date(snapshot2.timestamp).toLocaleString()}

**Files:**
\`${timestamp1.replace(/:/g, '-')}-${snapshot1.sovereignty.toFixed(3)}.json\`
\`${timestamp2.replace(/:/g, '-')}-${snapshot2.sovereignty.toFixed(3)}.json\`
`.trim();
}

// ─── Example 4: Artifact History Summary ────────────────────────────────

/**
 * Generate a summary of recent artifact evolution.
 * Useful for weekly reports or #trust-debt-public posts.
 */
export function generateHistorySummary(limit: number = 5): string {
  const snapshots = listArtifactSnapshots().slice(0, limit);

  if (snapshots.length === 0) {
    return '📦 No artifacts in history yet';
  }

  const lines = ['📦 **Recent Artifact History**', ''];

  for (let i = 0; i < snapshots.length; i++) {
    const s = snapshots[i];
    const date = new Date(s.timestamp).toLocaleString();
    const emoji = s.sovereignty > 0.8 ? '🟢' : s.sovereignty > 0.5 ? '🟡' : '🔴';
    lines.push(`${emoji} ${date} — σ=${s.sovereignty.toFixed(3)}`);
  }

  return lines.join('\n');
}

// ─── Example 5: Integration with CEO Loop ───────────────────────────────

/**
 * CEO loop hook: Check if it's time to generate a new artifact.
 * Generate only if significant change has occurred.
 */
export async function maybeGenerateArtifact(
  identityVector: number[],
  sovereignty: number,
  discordNotify: (message: string) => Promise<void>
): Promise<boolean> {
  const { hasChanged, summary } = checkForSignificantChange(identityVector, sovereignty);

  if (hasChanged) {
    console.log(`🔄 Significant change detected: ${summary}`);

    // Generate and save new artifact
    generateAndSaveArtifact(identityVector, sovereignty);

    // Get latest two snapshots for comparison
    const snapshots = listArtifactSnapshots();
    if (snapshots.length >= 2) {
      const report = generateDiscordReport(snapshots[1].timestamp, snapshots[0].timestamp);
      await discordNotify(report);
    }

    return true;
  }

  console.log(`✅ No significant change: ${summary}`);
  return false;
}

// ─── Example 6: Manual Comparison Command ───────────────────────────────

/**
 * Discord command: !compare-artifacts
 * Compare any two artifacts from history.
 */
export function handleCompareCommand(args: string[]): string {
  if (args.length < 2) {
    const snapshots = listArtifactSnapshots();
    if (snapshots.length < 2) {
      return '❌ Not enough artifacts to compare. Need at least 2 in history.';
    }
    // Default: compare latest two
    return generateDiscordReport(snapshots[1].timestamp, snapshots[0].timestamp);
  }

  const [ts1, ts2] = args;
  return generateDiscordReport(ts1, ts2);
}

// ─── Example 7: Stability Detection ─────────────────────────────────────

/**
 * Detect if sovereignty has been stable for N days.
 * Trigger special artifact generation on 30-day stability.
 */
export function checkStabilityMilestone(daysThreshold: number = 30): {
  isStable: boolean;
  duration: number;
  message: string;
} {
  const snapshots = listArtifactSnapshots();
  if (snapshots.length < 2) {
    return { isStable: false, duration: 0, message: 'Insufficient history' };
  }

  const latest = snapshots[0];
  const latestSovereignty = latest.sovereignty;

  // Check how long sovereignty has been within ±0.05 of current value
  let stableDuration = 0;
  let firstTimestamp = new Date(latest.timestamp);

  for (const snapshot of snapshots) {
    const delta = Math.abs(snapshot.sovereignty - latestSovereignty);
    if (delta <= 0.05) {
      const ts = new Date(snapshot.timestamp);
      stableDuration = (firstTimestamp.getTime() - ts.getTime()) / (1000 * 60 * 60 * 24);
    } else {
      break;
    }
  }

  const isStable = stableDuration >= daysThreshold;

  return {
    isStable,
    duration: stableDuration,
    message: isStable
      ? `🎉 Sovereignty stable for ${stableDuration.toFixed(1)} days at σ=${latestSovereignty.toFixed(3)}`
      : `⏳ Sovereignty stable for ${stableDuration.toFixed(1)} days (need ${daysThreshold})`,
  };
}
