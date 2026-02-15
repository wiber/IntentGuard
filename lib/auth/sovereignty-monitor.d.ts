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
import type { Logger } from '../types.js';
import type { SovereigntyCalculation } from './sovereignty.js';
/** Stability threshold: ±5% variance */
export declare const STABILITY_THRESHOLD = 0.05;
/** Stability period: 30 days */
export declare const STABILITY_PERIOD_DAYS = 30;
/** Single sovereignty measurement */
export interface SovereigntyMeasurement {
    timestamp: string;
    score: number;
    grade: string;
    trustDebtUnits: number;
    driftEvents: number;
    source: 'pipeline' | 'manual' | 'monitor';
}
/** Stability analysis result */
export interface StabilityAnalysis {
    isStable: boolean;
    stableDays: number;
    requiredDays: number;
    currentScore: number;
    averageScore: number;
    scoreVariance: number;
    trendDirection: 'up' | 'down' | 'stable';
    trendStrength: number;
    lastStabilityCheck: string;
    nextCheckDue: string;
    message: string;
}
/** Stability milestone record */
export interface StabilityMilestone {
    achievedAt: string;
    score: number;
    stableDays: number;
    artifactGenerated: boolean;
    artifactPath?: string;
    notificationSent: boolean;
}
/** Monitoring configuration */
export interface MonitorConfig {
    enabled: boolean;
    checkIntervalHours: number;
    autoGenerateArtifact: boolean;
    notifyDiscord: boolean;
    stabilityThreshold: number;
    stabilityPeriodDays: number;
}
export declare const DEFAULT_MONITOR_CONFIG: MonitorConfig;
/**
 * Record a sovereignty measurement to history.
 *
 * Appends to sovereignty-history.jsonl in JSONL format.
 *
 * @param measurement - Sovereignty measurement to record
 */
export declare function recordMeasurement(measurement: SovereigntyMeasurement): void;
/**
 * Load sovereignty history from JSONL file.
 *
 * @param days - Number of days to load (default: 90)
 * @returns Array of measurements, newest first
 */
export declare function loadHistory(days?: number): SovereigntyMeasurement[];
/**
 * Get the most recent sovereignty measurement.
 *
 * @returns Latest measurement, or null if no history
 */
export declare function getLatestMeasurement(): SovereigntyMeasurement | null;
/**
 * Calculate stability metrics from sovereignty history.
 *
 * Checks if sovereignty has been stable within ±STABILITY_THRESHOLD
 * for STABILITY_PERIOD_DAYS consecutive days.
 *
 * @param config - Monitor configuration
 * @returns Stability analysis result
 */
export declare function analyzeStability(config?: MonitorConfig): StabilityAnalysis;
/**
 * Load milestone records.
 *
 * @returns Array of milestones, newest first
 */
export declare function loadMilestones(): StabilityMilestone[];
/**
 * Record a new stability milestone.
 *
 * @param milestone - Milestone to record
 */
export declare function recordMilestone(milestone: StabilityMilestone): void;
/**
 * Check if a milestone was already achieved recently.
 *
 * Prevents duplicate artifact generation.
 *
 * @param withinDays - Check within this many days (default: 30)
 * @returns True if milestone exists within time window
 */
export declare function hasRecentMilestone(withinDays?: number): boolean;
export declare class SovereigntyMonitor {
    private log;
    private config;
    private artifactCallback;
    private notifyCallback;
    constructor(log: Logger, config?: MonitorConfig);
    /**
     * Bind artifact generation callback.
     *
     * Called when 30-day stability is achieved.
     *
     * @param callback - Function to generate artifact, returns artifact path
     */
    bindArtifactGenerator(callback: (score: number, stableDays: number) => Promise<string>): void;
    /**
     * Bind Discord notification callback.
     *
     * Called when milestones are achieved.
     *
     * @param callback - Function to send Discord message
     */
    bindNotification(callback: (message: string) => Promise<void>): void;
    /**
     * Record current sovereignty from pipeline.
     *
     * Call this after pipeline step 4 completes.
     *
     * @param calculation - Sovereignty calculation from pipeline
     */
    recordFromPipeline(calculation: SovereigntyCalculation): void;
    /**
     * Check for 30-day stability and trigger artifact if achieved.
     *
     * Call this daily from the scheduler.
     *
     * @returns Stability analysis result
     */
    checkStability(): Promise<StabilityAnalysis>;
    /**
     * Build Discord message for stability milestone.
     *
     * @param analysis - Stability analysis result
     * @param artifactPath - Path to generated artifact (if any)
     * @returns Formatted Discord message
     */
    private buildMilestoneMessage;
    /**
     * Get monitoring status.
     *
     * @returns Current status and configuration
     */
    getStatus(): {
        enabled: boolean;
        checkIntervalHours: number;
        latestScore: number | null;
        stableDays: number;
        requiredDays: number;
        isStable: boolean;
        milestones: number;
        lastMilestone: string | null;
    };
}
/**
 * Generate sovereignty history report for Discord.
 *
 * @param days - Number of days to include (default: 30)
 * @returns Formatted report
 */
export declare function generateHistoryReport(days?: number): string;
/**
 * Export sovereignty data for external analysis.
 *
 * @param days - Number of days to export (default: 90)
 * @returns CSV formatted data
 */
export declare function exportHistoryCSV(days?: number): string;
//# sourceMappingURL=sovereignty-monitor.d.ts.map