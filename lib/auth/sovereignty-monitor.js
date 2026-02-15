/**
 * src/auth/sovereignty-monitor.ts — 30-Day Sovereignty Stability Monitor
 *
 * Tracks sovereignty score history and triggers artifact generation when
 * the score remains stable (within ±0.05) for 30 consecutive days.
 *
 * INTEGRATION POINTS:
 *   - Reads from: 4-grades-statistics.json (trust debt pipeline)
 *   - Writes to: data/sovereignty-history.jsonl (append-only log)
 *   - Triggers: artifact-generator.ts (on 30-day stability)
 *   - Called by: cron/scheduler.ts (daily check)
 *
 * STABILITY CRITERIA:
 *   - Score variance ≤ 0.05 for 30 consecutive days
 *   - Minimum 30 data points (one per day)
 *   - No significant drift events during stability period
 *
 * ARTIFACT TRIGGER:
 *   - Special "stability milestone" artifact generated
 *   - Posted to #trust-debt-public with ceremony message
 *   - Includes stability duration, score, and trend analysis
 *
 * STATUS: v1.0 — Initial implementation for Phase 7 Task 10
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
// ─── Constants ──────────────────────────────────────────────────────
/** Stability threshold: ±5% variance */
export const STABILITY_THRESHOLD = 0.05;
/** Stability period: 30 days */
export const STABILITY_PERIOD_DAYS = 30;
/** History file path (resolved at call time to support test overrides of process.cwd) */
function getHistoryFile() {
    return join(process.cwd(), 'data', 'sovereignty-history.jsonl');
}
/** Milestone tracking file (resolved at call time to support test overrides of process.cwd) */
function getMilestoneFile() {
    return join(process.cwd(), 'data', 'sovereignty-milestones.json');
}
// ─── Default Configuration ──────────────────────────────────────────
export const DEFAULT_MONITOR_CONFIG = {
    enabled: true,
    checkIntervalHours: 24, // Check daily
    autoGenerateArtifact: true,
    notifyDiscord: true,
    stabilityThreshold: STABILITY_THRESHOLD,
    stabilityPeriodDays: STABILITY_PERIOD_DAYS,
};
// ─── History Management ─────────────────────────────────────────────
/**
 * Ensure data directory exists.
 */
function ensureDataDir() {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
}
/**
 * Record a sovereignty measurement to history.
 *
 * Appends to sovereignty-history.jsonl in JSONL format.
 *
 * @param measurement - Sovereignty measurement to record
 */
export function recordMeasurement(measurement) {
    ensureDataDir();
    const line = JSON.stringify(measurement) + '\n';
    appendFileSync(getHistoryFile(), line, 'utf-8');
}
/**
 * Load sovereignty history from JSONL file.
 *
 * @param days - Number of days to load (default: 90)
 * @returns Array of measurements, newest first
 */
export function loadHistory(days = 90) {
    if (!existsSync(getHistoryFile())) {
        return [];
    }
    const content = readFileSync(getHistoryFile(), 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);
    const measurements = lines
        .map(line => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    })
        .filter((m) => m !== null);
    // Filter to last N days
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const filtered = measurements.filter(m => new Date(m.timestamp).getTime() >= cutoff);
    // Sort newest first
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return filtered;
}
/**
 * Get the most recent sovereignty measurement.
 *
 * @returns Latest measurement, or null if no history
 */
export function getLatestMeasurement() {
    const history = loadHistory(1);
    return history.length > 0 ? history[0] : null;
}
// ─── Stability Analysis ─────────────────────────────────────────────
/**
 * Calculate stability metrics from sovereignty history.
 *
 * Checks if sovereignty has been stable within ±STABILITY_THRESHOLD
 * for STABILITY_PERIOD_DAYS consecutive days.
 *
 * @param config - Monitor configuration
 * @returns Stability analysis result
 */
export function analyzeStability(config = DEFAULT_MONITOR_CONFIG) {
    const history = loadHistory(config.stabilityPeriodDays + 30); // Load extra for context
    if (history.length === 0) {
        return {
            isStable: false,
            stableDays: 0,
            requiredDays: config.stabilityPeriodDays,
            currentScore: 0,
            averageScore: 0,
            scoreVariance: 0,
            trendDirection: 'stable',
            trendStrength: 0,
            lastStabilityCheck: new Date().toISOString(),
            nextCheckDue: new Date(Date.now() + config.checkIntervalHours * 60 * 60 * 1000).toISOString(),
            message: 'No sovereignty history available',
        };
    }
    const currentScore = history[0].score;
    const threshold = config.stabilityThreshold;
    // Find consecutive stable period
    let stableDays = 0;
    let sumScores = 0;
    let minScore = currentScore;
    let maxScore = currentScore;
    for (const measurement of history) {
        const delta = Math.abs(measurement.score - currentScore);
        if (delta <= threshold) {
            stableDays++;
            sumScores += measurement.score;
            minScore = Math.min(minScore, measurement.score);
            maxScore = Math.max(maxScore, measurement.score);
        }
        else {
            break; // Stability broken
        }
    }
    const averageScore = stableDays > 0 ? sumScores / stableDays : currentScore;
    const scoreVariance = maxScore - minScore;
    const isStable = stableDays >= config.stabilityPeriodDays;
    // Calculate trend direction (using linear regression approximation)
    const trendWindow = Math.min(stableDays, 7); // Look at last 7 days for trend
    let trendDirection = 'stable';
    let trendStrength = 0;
    if (trendWindow >= 3) {
        const recentScores = history.slice(0, trendWindow).map(m => m.score);
        const firstScore = recentScores[recentScores.length - 1];
        const lastScore = recentScores[0];
        const scoreDelta = lastScore - firstScore;
        if (Math.abs(scoreDelta) > 0.01) {
            trendDirection = scoreDelta > 0 ? 'up' : 'down';
            trendStrength = Math.min(1, Math.abs(scoreDelta) / 0.1);
        }
    }
    // Generate message
    let message;
    if (isStable) {
        message = `🎉 Sovereignty stable for ${stableDays} days at σ=${currentScore.toFixed(3)} (variance: ${(scoreVariance * 100).toFixed(1)}%)`;
    }
    else {
        const remaining = config.stabilityPeriodDays - stableDays;
        message = `⏳ Stability progress: ${stableDays}/${config.stabilityPeriodDays} days (${remaining} days remaining)`;
    }
    return {
        isStable,
        stableDays,
        requiredDays: config.stabilityPeriodDays,
        currentScore,
        averageScore,
        scoreVariance,
        trendDirection,
        trendStrength,
        lastStabilityCheck: new Date().toISOString(),
        nextCheckDue: new Date(Date.now() + config.checkIntervalHours * 60 * 60 * 1000).toISOString(),
        message,
    };
}
// ─── Milestone Management ───────────────────────────────────────────
/**
 * Load milestone records.
 *
 * @returns Array of milestones, newest first
 */
export function loadMilestones() {
    if (!existsSync(getMilestoneFile())) {
        return [];
    }
    try {
        const content = readFileSync(getMilestoneFile(), 'utf-8');
        const data = JSON.parse(content);
        return Array.isArray(data) ? data : [];
    }
    catch {
        return [];
    }
}
/**
 * Save milestone records.
 *
 * @param milestones - Array of milestones to save
 */
function saveMilestones(milestones) {
    ensureDataDir();
    writeFileSync(getMilestoneFile(), JSON.stringify(milestones, null, 2), 'utf-8');
}
/**
 * Record a new stability milestone.
 *
 * @param milestone - Milestone to record
 */
export function recordMilestone(milestone) {
    const milestones = loadMilestones();
    milestones.unshift(milestone); // Add to front (newest first)
    saveMilestones(milestones);
}
/**
 * Check if a milestone was already achieved recently.
 *
 * Prevents duplicate artifact generation.
 *
 * @param withinDays - Check within this many days (default: 30)
 * @returns True if milestone exists within time window
 */
export function hasRecentMilestone(withinDays = 30) {
    const milestones = loadMilestones();
    if (milestones.length === 0)
        return false;
    const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
    return milestones.some(m => new Date(m.achievedAt).getTime() >= cutoff);
}
// ─── Stability Monitor ──────────────────────────────────────────────
export class SovereigntyMonitor {
    log;
    config;
    artifactCallback = null;
    notifyCallback = null;
    constructor(log, config = DEFAULT_MONITOR_CONFIG) {
        this.log = log;
        this.config = config;
    }
    /**
     * Bind artifact generation callback.
     *
     * Called when 30-day stability is achieved.
     *
     * @param callback - Function to generate artifact, returns artifact path
     */
    bindArtifactGenerator(callback) {
        this.artifactCallback = callback;
    }
    /**
     * Bind Discord notification callback.
     *
     * Called when milestones are achieved.
     *
     * @param callback - Function to send Discord message
     */
    bindNotification(callback) {
        this.notifyCallback = callback;
    }
    /**
     * Record current sovereignty from pipeline.
     *
     * Call this after pipeline step 4 completes.
     *
     * @param calculation - Sovereignty calculation from pipeline
     */
    recordFromPipeline(calculation) {
        const measurement = {
            timestamp: calculation.timestamp,
            score: calculation.score,
            grade: calculation.grade,
            trustDebtUnits: calculation.trustDebtUnits,
            driftEvents: calculation.driftEvents,
            source: 'pipeline',
        };
        recordMeasurement(measurement);
        this.log.info(`[SovereigntyMonitor] Recorded: σ=${calculation.score.toFixed(3)} grade=${calculation.grade}`);
    }
    /**
     * Check for 30-day stability and trigger artifact if achieved.
     *
     * Call this daily from the scheduler.
     *
     * @returns Stability analysis result
     */
    async checkStability() {
        if (!this.config.enabled) {
            this.log.debug('[SovereigntyMonitor] Disabled, skipping check');
            return analyzeStability(this.config);
        }
        const analysis = analyzeStability(this.config);
        this.log.info(`[SovereigntyMonitor] ${analysis.message}`);
        // Check if 30-day stability achieved
        if (analysis.isStable && !hasRecentMilestone(this.config.stabilityPeriodDays)) {
            this.log.info('[SovereigntyMonitor] 🎉 30-day stability milestone achieved!');
            // Generate artifact
            let artifactPath;
            if (this.config.autoGenerateArtifact && this.artifactCallback) {
                try {
                    artifactPath = await this.artifactCallback(analysis.currentScore, analysis.stableDays);
                    this.log.info(`[SovereigntyMonitor] Artifact generated: ${artifactPath}`);
                }
                catch (error) {
                    this.log.error(`[SovereigntyMonitor] Artifact generation failed: ${error}`);
                }
            }
            // Record milestone
            const milestone = {
                achievedAt: new Date().toISOString(),
                score: analysis.currentScore,
                stableDays: analysis.stableDays,
                artifactGenerated: !!artifactPath,
                artifactPath,
                notificationSent: false,
            };
            recordMilestone(milestone);
            // Send notification
            if (this.config.notifyDiscord && this.notifyCallback) {
                const message = this.buildMilestoneMessage(analysis, artifactPath);
                try {
                    await this.notifyCallback(message);
                    milestone.notificationSent = true;
                    recordMilestone(milestone); // Update with notification status
                    this.log.info('[SovereigntyMonitor] Discord notification sent');
                }
                catch (error) {
                    this.log.error(`[SovereigntyMonitor] Discord notification failed: ${error}`);
                }
            }
        }
        return analysis;
    }
    /**
     * Build Discord message for stability milestone.
     *
     * @param analysis - Stability analysis result
     * @param artifactPath - Path to generated artifact (if any)
     * @returns Formatted Discord message
     */
    buildMilestoneMessage(analysis, artifactPath) {
        const lines = [
            '🎉 **STABILITY MILESTONE ACHIEVED** 🎉',
            '',
            `**Sovereignty Score:** ${analysis.currentScore.toFixed(3)}`,
            `**Stable Duration:** ${analysis.stableDays} days`,
            `**Average Score:** ${analysis.averageScore.toFixed(3)}`,
            `**Score Variance:** ${(analysis.scoreVariance * 100).toFixed(2)}%`,
            `**Trend:** ${analysis.trendDirection} (${(analysis.trendStrength * 100).toFixed(0)}% strength)`,
            '',
        ];
        if (artifactPath) {
            lines.push('**Artifact Generated:** ✅');
            lines.push(`\`${artifactPath}\``);
            lines.push('');
        }
        lines.push('**Ceremony Message:**');
        lines.push('> Thirty days of unwavering sovereignty. The Fractal Identity has proven itself.');
        lines.push('> Trust debt remains stable. The system holds its shape. This moment is worthy of record.');
        lines.push('');
        lines.push('*Sovereign stability: the foundation of autonomous operation.*');
        return lines.join('\n');
    }
    /**
     * Get monitoring status.
     *
     * @returns Current status and configuration
     */
    getStatus() {
        const latest = getLatestMeasurement();
        const analysis = analyzeStability(this.config);
        const milestones = loadMilestones();
        return {
            enabled: this.config.enabled,
            checkIntervalHours: this.config.checkIntervalHours,
            latestScore: latest?.score ?? null,
            stableDays: analysis.stableDays,
            requiredDays: this.config.stabilityPeriodDays,
            isStable: analysis.isStable,
            milestones: milestones.length,
            lastMilestone: milestones[0]?.achievedAt ?? null,
        };
    }
}
// ─── Utility Functions ──────────────────────────────────────────────
/**
 * Generate sovereignty history report for Discord.
 *
 * @param days - Number of days to include (default: 30)
 * @returns Formatted report
 */
export function generateHistoryReport(days = 30) {
    const history = loadHistory(days);
    const analysis = analyzeStability();
    if (history.length === 0) {
        return '📊 **Sovereignty History:** No data available';
    }
    const lines = [
        '📊 **Sovereignty History Report**',
        '',
        `**Current Score:** ${analysis.currentScore.toFixed(3)}`,
        `**Stable Days:** ${analysis.stableDays}/${analysis.requiredDays}`,
        `**Trend:** ${analysis.trendDirection} (${(analysis.trendStrength * 100).toFixed(0)}%)`,
        '',
        '**Recent Measurements:**',
    ];
    for (const m of history.slice(0, 10)) {
        const date = new Date(m.timestamp).toLocaleDateString();
        const emoji = m.score > 0.8 ? '🟢' : m.score > 0.5 ? '🟡' : '🔴';
        lines.push(`${emoji} ${date}: σ=${m.score.toFixed(3)} (${m.grade})`);
    }
    return lines.join('\n');
}
/**
 * Export sovereignty data for external analysis.
 *
 * @param days - Number of days to export (default: 90)
 * @returns CSV formatted data
 */
export function exportHistoryCSV(days = 90) {
    const history = loadHistory(days);
    const lines = [
        'timestamp,score,grade,trustDebtUnits,driftEvents,source',
    ];
    for (const m of history) {
        lines.push(`${m.timestamp},${m.score},${m.grade},${m.trustDebtUnits},${m.driftEvents},${m.source}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=sovereignty-monitor.js.map