/**
 * src/auth/audit-logger.ts — FIM Audit Logger
 *
 * Comprehensive audit trail for all FIM permission decisions (ALLOW + DENY).
 * Every tool call is logged with timestamp, tool, overlap score, sovereignty, decision.
 *
 * AUDIT FORMAT (JSONL):
 *   {
 *     "timestamp": "2026-02-15T...",
 *     "decision": "ALLOW" | "DENY",
 *     "toolName": "shell_execute",
 *     "skillName": "claude-flow-bridge",
 *     "overlap": 0.85,
 *     "sovereignty": 0.72,
 *     "threshold": 0.8,
 *     "minSovereignty": 0.6,
 *     "failedCategories": ["security: 0.65 < 0.7"],
 *     "userId": "default",
 *     "sessionId": "uuid-v4"
 *   }
 *
 * INTEGRATION:
 *   - Called from fim-interceptor.ts after every permission check
 *   - Logs to data/fim-audit.jsonl (append-only)
 *   - Provides query interface for compliance reports
 *
 * STATUS: v0.1 — Audit logging + basic queries
 */
import type { PermissionResult } from './geometric.js';
/** Decision outcome */
export type FimDecision = 'ALLOW' | 'DENY';
/** Complete audit record for a FIM decision */
export interface FimAuditRecord {
    timestamp: string;
    decision: FimDecision;
    toolName: string;
    skillName: string;
    overlap: number;
    sovereignty: number;
    threshold: number;
    minSovereignty: number;
    failedCategories: string[];
    userId: string;
    sessionId: string;
}
/** Query filters for audit log */
export interface AuditQuery {
    decision?: FimDecision;
    toolName?: string;
    skillName?: string;
    userId?: string;
    sessionId?: string;
    startTime?: string;
    endTime?: string;
}
/** Audit statistics */
export interface AuditStats {
    totalDecisions: number;
    allowCount: number;
    denyCount: number;
    allowRate: number;
    averageOverlap: number;
    averageSovereignty: number;
    topDeniedTools: Array<{
        tool: string;
        count: number;
    }>;
    topDeniedSkills: Array<{
        skill: string;
        count: number;
    }>;
}
export declare class FimAuditLogger {
    private auditPath;
    private sessionId;
    private userId;
    /**
     * Create a new FIM audit logger.
     *
     * @param dataDir - Directory containing data files (e.g., /Users/.../data)
     * @param userId - User identifier (default: "default")
     * @param sessionId - Session identifier (default: generated UUID)
     */
    constructor(dataDir: string, userId?: string, sessionId?: string);
    /**
     * Log an ALLOW decision.
     */
    logAllow(toolName: string, skillName: string, result: PermissionResult): void;
    /**
     * Log a DENY decision.
     */
    logDeny(toolName: string, skillName: string, result: PermissionResult): void;
    /**
     * Append a record to the audit log (JSONL format).
     */
    private appendRecord;
    /**
     * Query the audit log with filters.
     *
     * Returns all records matching the given filters.
     */
    query(filters?: AuditQuery): FimAuditRecord[];
    /**
     * Get audit statistics.
     */
    getStats(filters?: AuditQuery): AuditStats;
    /**
     * Get the current session ID.
     */
    getSessionId(): string;
    /**
     * Generate a unique session ID (simple UUID v4).
     */
    private generateSessionId;
}
//# sourceMappingURL=audit-logger.d.ts.map