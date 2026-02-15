/**
 * tests/auth/audit-logger.test.js — FIM Audit Logger Tests
 *
 * Test suite for comprehensive FIM audit logging.
 *
 * COVERAGE:
 *   - ALLOW decision logging
 *   - DENY decision logging
 *   - Query filtering (decision, tool, skill, user, session, time range)
 *   - Statistics computation (counts, rates, averages, top denied)
 *   - JSONL append-only format
 *   - Session ID generation
 *   - Error handling (missing files, malformed JSON)
 */

const { unlinkSync, existsSync, mkdirSync, rmdirSync } = require('fs');
const { join } = require('path');
const { FimAuditLogger } = require('../../src/auth/audit-logger');

const TEST_DATA_DIR = join(process.cwd(), 'test-audit-data');
const TEST_AUDIT_PATH = join(TEST_DATA_DIR, 'fim-audit.jsonl');

// ─── Test Fixtures ──────────────────────────────────────────────────────

const mockAllowResult = {
  allowed: true,
  overlap: 0.85,
  sovereignty: 0.72,
  threshold: 0.8,
  minSovereignty: 0.6,
  failedCategories: [],
  timestamp: '2026-02-15T10:00:00.000Z',
};

const mockDenyResult = {
  allowed: false,
  overlap: 0.65,
  sovereignty: 0.55,
  threshold: 0.8,
  minSovereignty: 0.6,
  failedCategories: ['security: 0.60 < 0.70', 'reliability: 0.45 < 0.50'],
  timestamp: '2026-02-15T10:05:00.000Z',
};

// ─── Test Setup ─────────────────────────────────────────────────────────

beforeEach(() => {
  if (!existsSync(TEST_DATA_DIR)) {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  if (existsSync(TEST_AUDIT_PATH)) {
    unlinkSync(TEST_AUDIT_PATH);
  }
});

afterEach(() => {
  if (existsSync(TEST_AUDIT_PATH)) {
    unlinkSync(TEST_AUDIT_PATH);
  }
  if (existsSync(TEST_DATA_DIR)) {
    rmdirSync(TEST_DATA_DIR);
  }
});

// ─── Tests ──────────────────────────────────────────────────────────────

describe('FimAuditLogger', () => {
  describe('constructor', () => {
    it('should create logger with default userId and generated sessionId', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      expect(logger.getSessionId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should create logger with custom userId and sessionId', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR, 'user-123', 'session-456');
      expect(logger.getSessionId()).toBe('session-456');
    });
  });

  describe('logAllow', () => {
    it('should log ALLOW decision with all fields', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR, 'user-1', 'session-1');
      logger.logAllow('shell_execute', 'claude-flow-bridge', mockAllowResult);

      const records = logger.query();
      expect(records).toHaveLength(1);

      const record = records[0];
      expect(record.decision).toBe('ALLOW');
      expect(record.toolName).toBe('shell_execute');
      expect(record.skillName).toBe('claude-flow-bridge');
      expect(record.overlap).toBe(0.85);
      expect(record.sovereignty).toBe(0.72);
      expect(record.threshold).toBe(0.8);
      expect(record.minSovereignty).toBe(0.6);
      expect(record.failedCategories).toEqual([]);
      expect(record.userId).toBe('user-1');
      expect(record.sessionId).toBe('session-1');
      expect(record.timestamp).toBe('2026-02-15T10:00:00.000Z');
    });

    it('should append multiple ALLOW decisions', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR, 'user-1', 'session-1');

      logger.logAllow('shell_execute', 'system-control', mockAllowResult);
      logger.logAllow('file_write', 'artifact-generator', mockAllowResult);

      const records = logger.query();
      expect(records).toHaveLength(2);
      expect(records[0].skillName).toBe('system-control');
      expect(records[1].skillName).toBe('artifact-generator');
    });
  });

  describe('logDeny', () => {
    it('should log DENY decision with failed categories', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR, 'user-1', 'session-1');
      logger.logDeny('shell_execute', 'claude-flow-bridge', mockDenyResult);

      const records = logger.query();
      expect(records).toHaveLength(1);

      const record = records[0];
      expect(record.decision).toBe('DENY');
      expect(record.toolName).toBe('shell_execute');
      expect(record.skillName).toBe('claude-flow-bridge');
      expect(record.overlap).toBe(0.65);
      expect(record.sovereignty).toBe(0.55);
      expect(record.failedCategories).toEqual(['security: 0.60 < 0.70', 'reliability: 0.45 < 0.50']);
    });

    it('should append multiple DENY decisions', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR, 'user-1', 'session-1');

      logger.logDeny('shell_execute', 'system-control', mockDenyResult);
      logger.logDeny('git_force_push', 'deploy-tool', mockDenyResult);

      const records = logger.query();
      expect(records).toHaveLength(2);
      expect(records[0].toolName).toBe('shell_execute');
      expect(records[1].toolName).toBe('git_force_push');
    });
  });

  describe('query', () => {
    beforeEach(() => {
      const logger = new FimAuditLogger(TEST_DATA_DIR, 'user-1', 'session-1');
      logger.logAllow('shell_execute', 'system-control', mockAllowResult);
      logger.logAllow('file_write', 'artifact-generator', mockAllowResult);
      logger.logDeny('shell_execute', 'claude-flow-bridge', mockDenyResult);
    });

    it('should return all records with no filters', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const records = logger.query();
      expect(records).toHaveLength(3);
    });

    it('should filter by decision', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const allows = logger.query({ decision: 'ALLOW' });
      const denies = logger.query({ decision: 'DENY' });

      expect(allows).toHaveLength(2);
      expect(denies).toHaveLength(1);
      expect(allows.every(r => r.decision === 'ALLOW')).toBe(true);
      expect(denies.every(r => r.decision === 'DENY')).toBe(true);
    });

    it('should filter by toolName', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const records = logger.query({ toolName: 'shell_execute' });

      expect(records).toHaveLength(2);
      expect(records.every(r => r.toolName === 'shell_execute')).toBe(true);
    });

    it('should filter by skillName', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const records = logger.query({ skillName: 'claude-flow-bridge' });

      expect(records).toHaveLength(1);
      expect(records[0].skillName).toBe('claude-flow-bridge');
    });

    it('should filter by userId', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const records = logger.query({ userId: 'user-1' });

      expect(records).toHaveLength(3);
      expect(records.every(r => r.userId === 'user-1')).toBe(true);
    });

    it('should filter by sessionId', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const records = logger.query({ sessionId: 'session-1' });

      expect(records).toHaveLength(3);
      expect(records.every(r => r.sessionId === 'session-1')).toBe(true);
    });

    it('should filter by time range', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const records = logger.query({
        startTime: '2026-02-15T10:03:00.000Z',
        endTime: '2026-02-15T10:10:00.000Z',
      });

      expect(records).toHaveLength(1);
      expect(records[0].timestamp).toBe('2026-02-15T10:05:00.000Z');
    });

    it('should combine multiple filters', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const records = logger.query({
        decision: 'ALLOW',
        toolName: 'shell_execute',
      });

      expect(records).toHaveLength(1);
      expect(records[0].decision).toBe('ALLOW');
      expect(records[0].toolName).toBe('shell_execute');
    });

    it('should return empty array if no records match', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const records = logger.query({ toolName: 'nonexistent_tool' });

      expect(records).toEqual([]);
    });

    it('should return empty array if audit file does not exist', () => {
      unlinkSync(TEST_AUDIT_PATH);
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const records = logger.query();

      expect(records).toEqual([]);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      const logger = new FimAuditLogger(TEST_DATA_DIR, 'user-1', 'session-1');

      // Log 5 allows + 3 denies
      logger.logAllow('shell_execute', 'system-control', { ...mockAllowResult, overlap: 0.9 });
      logger.logAllow('file_write', 'artifact-generator', { ...mockAllowResult, overlap: 0.85 });
      logger.logAllow('send_message', 'discord-bot', { ...mockAllowResult, overlap: 0.95 });
      logger.logAllow('shell_execute', 'claude-flow-bridge', { ...mockAllowResult, overlap: 0.8 });
      logger.logAllow('git_push', 'deploy-tool', { ...mockAllowResult, overlap: 0.88 });

      logger.logDeny('shell_execute', 'system-control', { ...mockDenyResult, overlap: 0.6, sovereignty: 0.5 });
      logger.logDeny('git_force_push', 'deploy-tool', { ...mockDenyResult, overlap: 0.7, sovereignty: 0.55 });
      logger.logDeny('shell_execute', 'claude-flow-bridge', { ...mockDenyResult, overlap: 0.65, sovereignty: 0.52 });
    });

    it('should compute basic statistics', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const stats = logger.getStats();

      expect(stats.totalDecisions).toBe(8);
      expect(stats.allowCount).toBe(5);
      expect(stats.denyCount).toBe(3);
      expect(stats.allowRate).toBeCloseTo(0.625, 3);
    });

    it('should compute average overlap', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const stats = logger.getStats();

      // (0.9 + 0.85 + 0.95 + 0.8 + 0.88 + 0.6 + 0.7 + 0.65) / 8 = 0.79125
      expect(stats.averageOverlap).toBeCloseTo(0.79125, 3);
    });

    it('should compute average sovereignty', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const stats = logger.getStats();

      // 5 allows at 0.72 + 3 denies at 0.5, 0.55, 0.52
      // (0.72*5 + 0.5 + 0.55 + 0.52) / 8 = 0.64625
      expect(stats.averageSovereignty).toBeCloseTo(0.64625, 3);
    });

    it('should identify top denied tools', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const stats = logger.getStats();

      expect(stats.topDeniedTools).toHaveLength(2);
      expect(stats.topDeniedTools[0]).toEqual({ tool: 'shell_execute', count: 2 });
      expect(stats.topDeniedTools[1]).toEqual({ tool: 'git_force_push', count: 1 });
    });

    it('should identify top denied skills', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const stats = logger.getStats();

      expect(stats.topDeniedSkills).toHaveLength(3);
      expect(stats.topDeniedSkills.find(s => s.skill === 'system-control')).toEqual({ skill: 'system-control', count: 1 });
      expect(stats.topDeniedSkills.find(s => s.skill === 'deploy-tool')).toEqual({ skill: 'deploy-tool', count: 1 });
      expect(stats.topDeniedSkills.find(s => s.skill === 'claude-flow-bridge')).toEqual({ skill: 'claude-flow-bridge', count: 1 });
    });

    it('should return zero stats for empty audit log', () => {
      unlinkSync(TEST_AUDIT_PATH);
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const stats = logger.getStats();

      expect(stats.totalDecisions).toBe(0);
      expect(stats.allowCount).toBe(0);
      expect(stats.denyCount).toBe(0);
      expect(stats.allowRate).toBe(0);
      expect(stats.averageOverlap).toBe(0);
      expect(stats.averageSovereignty).toBe(0);
      expect(stats.topDeniedTools).toEqual([]);
      expect(stats.topDeniedSkills).toEqual([]);
    });

    it('should respect query filters', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const stats = logger.getStats({ decision: 'DENY' });

      expect(stats.totalDecisions).toBe(3);
      expect(stats.allowCount).toBe(0);
      expect(stats.denyCount).toBe(3);
      expect(stats.allowRate).toBe(0);
    });
  });

  describe('JSONL format', () => {
    it('should create valid JSONL (one JSON object per line)', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR, 'user-1', 'session-1');

      logger.logAllow('shell_execute', 'system-control', mockAllowResult);
      logger.logDeny('file_write', 'artifact-generator', mockDenyResult);

      const { readFileSync } = require('fs');
      const content = readFileSync(TEST_AUDIT_PATH, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);

      // Each line should be valid JSON
      const record1 = JSON.parse(lines[0]);
      const record2 = JSON.parse(lines[1]);

      expect(record1.decision).toBe('ALLOW');
      expect(record2.decision).toBe('DENY');
    });
  });

  describe('error handling', () => {
    it('should handle missing audit file gracefully in query', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const records = logger.query();

      expect(records).toEqual([]);
    });

    it('should not throw on append failure', () => {
      // Create logger with invalid path (simulate permission denied)
      const logger = new FimAuditLogger('/nonexistent/invalid/path');

      expect(() => {
        logger.logAllow('shell_execute', 'system-control', mockAllowResult);
      }).not.toThrow();
    });
  });

  describe('session ID generation', () => {
    it('should generate unique session IDs', () => {
      const logger1 = new FimAuditLogger(TEST_DATA_DIR);
      const logger2 = new FimAuditLogger(TEST_DATA_DIR);

      expect(logger1.getSessionId()).not.toBe(logger2.getSessionId());
    });

    it('should generate valid UUID v4 format', () => {
      const logger = new FimAuditLogger(TEST_DATA_DIR);
      const sessionId = logger.getSessionId();

      // UUID v4 regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(sessionId).toMatch(uuidRegex);
    });
  });
});
