/**
 * src/monitor/sovereignty-monitor.ts — Sovereignty Score Stability Monitor
 *
 * Tracks sovereignty score over time and triggers special artifact generation
 * when the score remains stable for 30 consecutive days.
 *
 * ARCHITECTURE:
 *   - Reads sovereignty history from pipeline outputs (4-grades-statistics.json)
 *   - Tracks daily sovereignty snapshots in data/sovereignty-history.jsonl
 *   - Detects 30-day stability windows (within ±0.05 threshold)
 *   - Triggers special commemorative artifact on stability milestone
 *
 * STABILITY CRITERIA:
 *   - Window: 30 consecutive days
 *   - Threshold: ±0.05 (5% variance allowed)
 *   - Trigger: Once per stability period (no repeated triggers)
 *
 * INTEGRATION POINTS:
 *   - Called by: CEO loop, proactive scheduler
 *   - Reads: 4-grades-statistics.json, sovereignty-history.jsonl
 *   - Writes: sovereignty-history.jsonl, stability-milestones.json
 *   - Triggers: artifact-generator.ts for commemorative artifact
 *
 * STATUS: v1.0 — 30-day stability detection with artifact triggering
 */
import type { Logger } from '../types.js';
/** Stability window in days */
export declare const STABILITY_WINDOW_DAYS = 30;
/** Maximum allowed variance for stability (±5%) */
export declare const STABILITY_THRESHOLD = 0.05;
/** Minimum sovereignty score to trigger artifact (avoid commemorating low scores) */
export declare const MIN_ARTIFACT_SOVEREIGNTY = 0.6;
/** Daily sovereignty snapshot */
export interface SovereigntySnapshot {
    date: string;
    timestamp: string;
    score: number;
    grade: string;
    trustDebtUnits: number;
    driftEvents: number;
    source: 'pipeline' | 'manual';
}
/** Stability milestone record */
export interface StabilityMilestone {
    achievedAt: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    averageSovereignty: number;
    minSovereignty: number;
    maxSovereignty: number;
    variance: number;
    artifactTriggered: boolean;
    artifactPath?: string;
}
/** Monitoring result */
export interface MonitoringResult {
    currentScore: number;
    consecutiveStableDays: number;
    isStable: boolean;
    daysRemaining: number;
    milestoneAchieved: boolean;
    milestone?: StabilityMilestone;
}
/**
 * Load sovereignty history from JSONL file.
 * Returns snapshots sorted by date (oldest first).
 */
export declare function loadHistory(repoRoot: string): SovereigntySnapshot[];
/**
 * Append a sovereignty snapshot to history.
 * Uses JSONL format for append-only logging.
 */
export declare function appendSnapshot(repoRoot: string, snapshot: SovereigntySnapshot): void;
/**
 * Record today's sovereignty score from pipeline output.
 * Idempotent: won't duplicate if already recorded today.
 */
export declare function recordTodaySnapshot(repoRoot: string, log: Logger): SovereigntySnapshot | null;
/**
 * Analyze recent history for stability windows.
 * Returns the longest consecutive stable period ending today.
 */
export declare function detectStability(history: SovereigntySnapshot[], windowDays?: number, threshold?: number): {
    consecutiveDays: number;
    averageSovereignty: number;
    isStable: boolean;
};
/**
 * Load stability milestones from JSON file.
 */
export declare function loadMilestones(repoRoot: string): StabilityMilestone[];
/**
 * Record a new stability milestone.
 */
export declare function recordMilestone(repoRoot: string, history: SovereigntySnapshot[], log: Logger): StabilityMilestone | null;
/**
 * Mark a milestone as having triggered artifact generation.
 */
export declare function markArtifactTriggered(repoRoot: string, milestone: StabilityMilestone, artifactPath: string): void;
/**
 * Monitor sovereignty score and detect stability milestones.
 * This is the main entry point called by CEO loop or proactive scheduler.
 *
 * @param repoRoot Repository root path
 * @param log Logger instance
 * @returns Monitoring result with stability status
 */
export declare function monitorSovereignty(repoRoot: string, log: Logger): Promise<MonitoringResult>;
/**
 * Trigger artifact generation for stability milestone.
 * This should be called by the artifact generation system when a milestone is achieved.
 *
 * @param repoRoot Repository root path
 * @param milestone Stability milestone that triggered the artifact
 * @param log Logger instance
 * @returns Path to generated artifact
 */
export declare function triggerStabilityArtifact(repoRoot: string, milestone: StabilityMilestone, log: Logger): Promise<string | null>;
/**
 * Generate a Discord-friendly stability status report.
 * Suitable for posting to #trust-debt-public.
 */
export declare function generateStabilityReport(result: MonitoringResult): string;
/**
 * Generate a summary of all stability milestones.
 * Useful for historical reporting.
 */
export declare function generateMilestonesSummary(repoRoot: string): string;
//# sourceMappingURL=sovereignty-monitor.d.ts.map