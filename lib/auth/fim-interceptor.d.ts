/**
 * src/auth/fim-interceptor.ts — FIM Permission Enforcement
 *
 * Wraps skill execution with geometric permission checks.
 * On deny: records trust-debt spike, posts to transparency engine.
 * On allow: passes through to skill execution.
 *
 * EQUATION ENFORCED:
 *   Permission(u,a) = Identity_Fractal(u) ∩ Coordinate_Required(a) >= Sovereignty_Threshold
 *
 * DRIFT FEEDBACK:
 *   Consecutive denials increment a counter.
 *   At threshold (3), triggers pipeline re-run → sovereignty update.
 */
import type { Logger, SkillResult } from '../types.js';
export interface FimDenialEvent {
    toolName: string;
    skillName: string;
    overlap: number;
    sovereignty: number;
    threshold: number;
    failedCategories: string[];
    timestamp: string;
}
export declare class FimInterceptor {
    private log;
    private dataDir;
    private identity;
    private consecutiveDenials;
    private totalDenials;
    /** Called when FIM denies a tool call */
    onDenial?: (event: FimDenialEvent) => Promise<void>;
    /** Called when consecutive denials hit threshold → trigger pipeline re-run */
    onDriftThreshold?: () => Promise<void>;
    constructor(log: Logger, dataDir: string);
    /**
     * Load identity from the most recent pipeline run.
     */
    private loadLatestIdentity;
    /**
     * Reload identity after pipeline re-run.
     */
    reloadIdentity(): void;
    /**
     * Check if a skill call is permitted.
     * Returns null if allowed, SkillResult if denied.
     *
     * IMPORTANT: Computes overlap before EVERY tool call, including undefined tools.
     * Fail-open behavior: undefined tools are allowed but overlap is still logged.
     */
    intercept(skillName: string, payload: unknown): Promise<SkillResult | null>;
    /**
     * Append denial to audit log.
     */
    private logDenial;
    /**
     * Log fail-open event (undefined tool or requirement).
     * These are allowed but tracked for security monitoring.
     */
    private logFailOpen;
    /**
     * Update heat map after FIM decision.
     */
    updateHeatMap(cell: string, allowed: boolean): void;
    /** Get stats for monitoring */
    getStats(): {
        totalDenials: number;
        consecutiveDenials: number;
        sovereignty: number;
    };
}
//# sourceMappingURL=fim-interceptor.d.ts.map