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
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
// ─── Constants ──────────────────────────────────────────────────────────
/** Stability window in days */
export const STABILITY_WINDOW_DAYS = 30;
/** Maximum allowed variance for stability (±5%) */
export const STABILITY_THRESHOLD = 0.05;
/** Minimum sovereignty score to trigger artifact (avoid commemorating low scores) */
export const MIN_ARTIFACT_SOVEREIGNTY = 0.6;
// ─── File Paths ─────────────────────────────────────────────────────────
function getHistoryPath(repoRoot) {
    return join(repoRoot, 'data', 'sovereignty-history.jsonl');
}
function getMilestonesPath(repoRoot) {
    return join(repoRoot, 'data', 'stability-milestones.json');
}
function getPipelineStatsPath(repoRoot) {
    return join(repoRoot, '4-grades-statistics.json');
}
// ─── History Management ─────────────────────────────────────────────────
/**
 * Load sovereignty history from JSONL file.
 * Returns snapshots sorted by date (oldest first).
 */
export function loadHistory(repoRoot) {
    const path = getHistoryPath(repoRoot);
    if (!existsSync(path))
        return [];
    const lines = readFileSync(path, 'utf-8').split('\n').filter(Boolean);
    const snapshots = lines.map(line => JSON.parse(line));
    // Sort by date
    return snapshots.sort((a, b) => a.date.localeCompare(b.date));
}
/**
 * Append a sovereignty snapshot to history.
 * Uses JSONL format for append-only logging.
 */
export function appendSnapshot(repoRoot, snapshot) {
    const path = getHistoryPath(repoRoot);
    const line = JSON.stringify(snapshot) + '\n';
    appendFileSync(path, line, 'utf-8');
}
/**
 * Get today's snapshot date string (YYYY-MM-DD).
 */
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}
/**
 * Check if we already have a snapshot for today.
 */
function hasSnapshotForToday(history) {
    const today = getTodayDate();
    return history.some(s => s.date === today);
}
/**
 * Record today's sovereignty score from pipeline output.
 * Idempotent: won't duplicate if already recorded today.
 */
export function recordTodaySnapshot(repoRoot, log) {
    const history = loadHistory(repoRoot);
    // Don't duplicate today's snapshot
    if (hasSnapshotForToday(history)) {
        log.debug('Sovereignty snapshot already recorded for today');
        return null;
    }
    // Read latest pipeline output
    const statsPath = getPipelineStatsPath(repoRoot);
    if (!existsSync(statsPath)) {
        log.warn('Pipeline stats not found, cannot record sovereignty snapshot');
        return null;
    }
    const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));
    const snapshot = {
        date: getTodayDate(),
        timestamp: new Date().toISOString(),
        score: stats.sovereignty_score || 0,
        grade: stats.grade || 'D',
        trustDebtUnits: stats.total_units || 0,
        driftEvents: stats.drift_events || 0,
        source: 'pipeline',
    };
    appendSnapshot(repoRoot, snapshot);
    log.info(`Sovereignty snapshot recorded: ${snapshot.date} σ=${snapshot.score.toFixed(3)} grade=${snapshot.grade}`);
    return snapshot;
}
// ─── Stability Detection ────────────────────────────────────────────────
/**
 * Analyze recent history for stability windows.
 * Returns the longest consecutive stable period ending today.
 */
export function detectStability(history, windowDays = STABILITY_WINDOW_DAYS, threshold = STABILITY_THRESHOLD) {
    if (history.length === 0) {
        return { consecutiveDays: 0, averageSovereignty: 0, isStable: false };
    }
    // Start from most recent and work backwards
    const recent = history.slice(-windowDays);
    if (recent.length < 2) {
        return { consecutiveDays: recent.length, averageSovereignty: recent[0]?.score || 0, isStable: false };
    }
    // Use most recent score as baseline
    const baseline = recent[recent.length - 1].score;
    let consecutiveDays = 1; // Today counts
    let sum = baseline;
    // Walk backwards to find consecutive stable days
    for (let i = recent.length - 2; i >= 0; i--) {
        const snapshot = recent[i];
        const delta = Math.abs(snapshot.score - baseline);
        if (delta <= threshold) {
            consecutiveDays++;
            sum += snapshot.score;
        }
        else {
            break; // Stability window broken
        }
    }
    const averageSovereignty = sum / consecutiveDays;
    const isStable = consecutiveDays >= windowDays;
    return { consecutiveDays, averageSovereignty, isStable };
}
// ─── Milestone Management ───────────────────────────────────────────────
/**
 * Load stability milestones from JSON file.
 */
export function loadMilestones(repoRoot) {
    const path = getMilestonesPath(repoRoot);
    if (!existsSync(path))
        return [];
    const data = readFileSync(path, 'utf-8');
    return JSON.parse(data);
}
/**
 * Save stability milestones to JSON file.
 */
function saveMilestones(repoRoot, milestones) {
    const path = getMilestonesPath(repoRoot);
    writeFileSync(path, JSON.stringify(milestones, null, 2), 'utf-8');
}
/**
 * Check if we've already recorded a milestone for this stability period.
 * Prevents duplicate milestones for the same stable window.
 */
function hasMilestoneForPeriod(milestones, startDate, endDate) {
    return milestones.some(m => m.startDate === startDate && m.endDate === endDate);
}
/**
 * Record a new stability milestone.
 */
export function recordMilestone(repoRoot, history, log) {
    const stability = detectStability(history);
    if (!stability.isStable) {
        return null; // Not stable yet
    }
    // Extract the stable window
    const stableSnapshots = history.slice(-stability.consecutiveDays);
    const startDate = stableSnapshots[0].date;
    const endDate = stableSnapshots[stableSnapshots.length - 1].date;
    // Check for duplicate
    const milestones = loadMilestones(repoRoot);
    if (hasMilestoneForPeriod(milestones, startDate, endDate)) {
        log.debug('Milestone already recorded for this stability period');
        return null;
    }
    // Calculate statistics
    const scores = stableSnapshots.map(s => s.score);
    const averageSovereignty = scores.reduce((a, b) => a + b, 0) / scores.length;
    const minSovereignty = Math.min(...scores);
    const maxSovereignty = Math.max(...scores);
    const variance = maxSovereignty - minSovereignty;
    const milestone = {
        achievedAt: new Date().toISOString(),
        startDate,
        endDate,
        durationDays: stability.consecutiveDays,
        averageSovereignty,
        minSovereignty,
        maxSovereignty,
        variance,
        artifactTriggered: false, // Will be set when artifact is generated
    };
    milestones.push(milestone);
    saveMilestones(repoRoot, milestones);
    log.info(`🎉 Stability milestone achieved! ${stability.consecutiveDays} days at σ=${averageSovereignty.toFixed(3)} ` +
        `(${startDate} to ${endDate})`);
    return milestone;
}
/**
 * Mark a milestone as having triggered artifact generation.
 */
export function markArtifactTriggered(repoRoot, milestone, artifactPath) {
    const milestones = loadMilestones(repoRoot);
    const target = milestones.find(m => m.achievedAt === milestone.achievedAt &&
        m.startDate === milestone.startDate);
    if (target) {
        target.artifactTriggered = true;
        target.artifactPath = artifactPath;
        saveMilestones(repoRoot, milestones);
    }
}
// ─── Main Monitor Function ──────────────────────────────────────────────
/**
 * Monitor sovereignty score and detect stability milestones.
 * This is the main entry point called by CEO loop or proactive scheduler.
 *
 * @param repoRoot Repository root path
 * @param log Logger instance
 * @returns Monitoring result with stability status
 */
export async function monitorSovereignty(repoRoot, log) {
    // Record today's snapshot if needed
    recordTodaySnapshot(repoRoot, log);
    // Load full history
    const history = loadHistory(repoRoot);
    // Detect current stability
    const stability = detectStability(history);
    // Check for new milestone
    const milestone = stability.isStable
        ? recordMilestone(repoRoot, history, log)
        : null;
    const result = {
        currentScore: history.length > 0 ? history[history.length - 1].score : 0,
        consecutiveStableDays: stability.consecutiveDays,
        isStable: stability.isStable,
        daysRemaining: Math.max(0, STABILITY_WINDOW_DAYS - stability.consecutiveDays),
        milestoneAchieved: milestone !== null,
        milestone: milestone || undefined,
    };
    return result;
}
/**
 * Trigger artifact generation for stability milestone.
 * This should be called by the artifact generation system when a milestone is achieved.
 *
 * @param repoRoot Repository root path
 * @param milestone Stability milestone that triggered the artifact
 * @param log Logger instance
 * @returns Path to generated artifact
 */
export async function triggerStabilityArtifact(repoRoot, milestone, log) {
    // Only trigger for high-quality sovereignty
    if (milestone.averageSovereignty < MIN_ARTIFACT_SOVEREIGNTY) {
        log.info(`Stability milestone achieved but sovereignty too low (${milestone.averageSovereignty.toFixed(3)} < ${MIN_ARTIFACT_SOVEREIGNTY}), ` +
            'skipping commemorative artifact');
        return null;
    }
    log.info(`🎨 Triggering commemorative artifact for ${milestone.durationDays}-day stability milestone ` +
        `(σ=${milestone.averageSovereignty.toFixed(3)})`);
    // The artifact-generator.ts will handle the actual generation
    // This function just returns the signal to trigger it
    // Integration point: CEO loop should call artifact-generator.ts with special flag
    return `stability-milestone-${milestone.startDate}-to-${milestone.endDate}`;
}
// ─── Reporting ──────────────────────────────────────────────────────────
/**
 * Generate a Discord-friendly stability status report.
 * Suitable for posting to #trust-debt-public.
 */
export function generateStabilityReport(result) {
    const emoji = result.currentScore >= 0.8 ? '🟢' : result.currentScore >= 0.6 ? '🟡' : '🔴';
    const lines = [
        `${emoji} **Sovereignty Stability Monitor**`,
        '',
        `Current Score: ${result.currentScore.toFixed(3)}`,
        `Consecutive Stable Days: ${result.consecutiveStableDays} / ${STABILITY_WINDOW_DAYS}`,
    ];
    if (result.isStable) {
        lines.push('', '✅ **STABILITY ACHIEVED!**');
        if (result.milestone) {
            lines.push(`Period: ${result.milestone.startDate} to ${result.milestone.endDate}`, `Average: σ=${result.milestone.averageSovereignty.toFixed(3)}`, `Range: ${result.milestone.minSovereignty.toFixed(3)} - ${result.milestone.maxSovereignty.toFixed(3)}`, `Variance: ±${(result.milestone.variance * 100).toFixed(1)}%`);
            if (result.milestone.artifactTriggered) {
                lines.push('', '🎨 Commemorative artifact generated');
            }
        }
    }
    else {
        lines.push('', `⏳ ${result.daysRemaining} days until stability milestone`);
    }
    return lines.join('\n');
}
/**
 * Generate a summary of all stability milestones.
 * Useful for historical reporting.
 */
export function generateMilestonesSummary(repoRoot) {
    const milestones = loadMilestones(repoRoot);
    if (milestones.length === 0) {
        return '📊 No stability milestones recorded yet';
    }
    const lines = [
        '📊 **Stability Milestones History**',
        '',
    ];
    for (const m of milestones.slice(-5)) { // Last 5 milestones
        const date = new Date(m.achievedAt).toLocaleDateString();
        const emoji = m.artifactTriggered ? '🎨' : '📍';
        lines.push(`${emoji} ${date}: ${m.durationDays} days at σ=${m.averageSovereignty.toFixed(3)}`);
    }
    if (milestones.length > 5) {
        lines.push('', `... and ${milestones.length - 5} more`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=sovereignty-monitor.js.map