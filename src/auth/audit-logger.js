/**
 * src/auth/audit-logger.js — FIM Audit Logger
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

const { appendFileSync, readFileSync, existsSync } = require('fs');
const { join } = require('path');

// ─── FIM Audit Logger ───────────────────────────────────────────────────

class FimAuditLogger {
  /**
   * Create a new FIM audit logger.
   *
   * @param {string} dataDir - Directory containing data files (e.g., /Users/.../data)
   * @param {string} [userId='default'] - User identifier
   * @param {string} [sessionId] - Session identifier (default: generated UUID)
   */
  constructor(dataDir, userId = 'default', sessionId) {
    this.auditPath = join(dataDir, 'fim-audit.jsonl');
    this.userId = userId;
    this.sessionId = sessionId ?? this.generateSessionId();
  }

  /**
   * Log an ALLOW decision.
   *
   * @param {string} toolName - Tool name (e.g., "shell_execute")
   * @param {string} skillName - Skill name (e.g., "claude-flow-bridge")
   * @param {Object} result - Permission result from geometric.checkPermission()
   */
  logAllow(toolName, skillName, result) {
    const record = {
      timestamp: result.timestamp,
      decision: 'ALLOW',
      toolName,
      skillName,
      overlap: result.overlap,
      sovereignty: result.sovereignty,
      threshold: result.threshold,
      minSovereignty: result.minSovereignty,
      failedCategories: [],
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.appendRecord(record);
  }

  /**
   * Log a DENY decision.
   *
   * @param {string} toolName - Tool name (e.g., "shell_execute")
   * @param {string} skillName - Skill name (e.g., "claude-flow-bridge")
   * @param {Object} result - Permission result from geometric.checkPermission()
   */
  logDeny(toolName, skillName, result) {
    const record = {
      timestamp: result.timestamp,
      decision: 'DENY',
      toolName,
      skillName,
      overlap: result.overlap,
      sovereignty: result.sovereignty,
      threshold: result.threshold,
      minSovereignty: result.minSovereignty,
      failedCategories: result.failedCategories,
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.appendRecord(record);
  }

  /**
   * Append a record to the audit log (JSONL format).
   *
   * @private
   * @param {Object} record - Audit record to append
   */
  appendRecord(record) {
    try {
      const line = JSON.stringify(record) + '\n';
      appendFileSync(this.auditPath, line, { encoding: 'utf-8' });
    } catch (err) {
      // Non-critical — fail silently (audit logging should never break execution)
      console.error(`[FIM Audit] Failed to log record: ${err}`);
    }
  }

  /**
   * Query the audit log with filters.
   *
   * Returns all records matching the given filters.
   *
   * @param {Object} [filters={}] - Query filters
   * @param {string} [filters.decision] - Filter by decision (ALLOW or DENY)
   * @param {string} [filters.toolName] - Filter by tool name
   * @param {string} [filters.skillName] - Filter by skill name
   * @param {string} [filters.userId] - Filter by user ID
   * @param {string} [filters.sessionId] - Filter by session ID
   * @param {string} [filters.startTime] - Filter by start time (ISO 8601)
   * @param {string} [filters.endTime] - Filter by end time (ISO 8601)
   * @returns {Array} Array of matching audit records
   */
  query(filters = {}) {
    if (!existsSync(this.auditPath)) return [];

    try {
      const content = readFileSync(this.auditPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const records = lines.map(line => JSON.parse(line));

      return records.filter(record => {
        // Filter by decision
        if (filters.decision && record.decision !== filters.decision) return false;

        // Filter by tool name
        if (filters.toolName && record.toolName !== filters.toolName) return false;

        // Filter by skill name
        if (filters.skillName && record.skillName !== filters.skillName) return false;

        // Filter by user ID
        if (filters.userId && record.userId !== filters.userId) return false;

        // Filter by session ID
        if (filters.sessionId && record.sessionId !== filters.sessionId) return false;

        // Filter by start time
        if (filters.startTime && record.timestamp < filters.startTime) return false;

        // Filter by end time
        if (filters.endTime && record.timestamp > filters.endTime) return false;

        return true;
      });
    } catch (err) {
      console.error(`[FIM Audit] Query failed: ${err}`);
      return [];
    }
  }

  /**
   * Get audit statistics.
   *
   * @param {Object} [filters={}] - Query filters (same as query())
   * @returns {Object} Statistics object with counts, rates, and top denied items
   */
  getStats(filters = {}) {
    const records = this.query(filters);

    if (records.length === 0) {
      return {
        totalDecisions: 0,
        allowCount: 0,
        denyCount: 0,
        allowRate: 0,
        averageOverlap: 0,
        averageSovereignty: 0,
        topDeniedTools: [],
        topDeniedSkills: [],
      };
    }

    const allowCount = records.filter(r => r.decision === 'ALLOW').length;
    const denyCount = records.filter(r => r.decision === 'DENY').length;

    const totalOverlap = records.reduce((sum, r) => sum + r.overlap, 0);
    const totalSovereignty = records.reduce((sum, r) => sum + r.sovereignty, 0);

    // Count denials by tool
    const denialsByTool = new Map();
    const denialsBySkill = new Map();

    records.filter(r => r.decision === 'DENY').forEach(r => {
      denialsByTool.set(r.toolName, (denialsByTool.get(r.toolName) ?? 0) + 1);
      denialsBySkill.set(r.skillName, (denialsBySkill.get(r.skillName) ?? 0) + 1);
    });

    const topDeniedTools = Array.from(denialsByTool.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topDeniedSkills = Array.from(denialsBySkill.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalDecisions: records.length,
      allowCount,
      denyCount,
      allowRate: allowCount / records.length,
      averageOverlap: totalOverlap / records.length,
      averageSovereignty: totalSovereignty / records.length,
      topDeniedTools,
      topDeniedSkills,
    };
  }

  /**
   * Get the current session ID.
   *
   * @returns {string} Session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Generate a unique session ID (simple UUID v4).
   *
   * @private
   * @returns {string} UUID v4
   */
  generateSessionId() {
    // Simple UUID v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

module.exports = { FimAuditLogger };
