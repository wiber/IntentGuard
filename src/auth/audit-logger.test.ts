/**
 * src/auth/audit-logger.test.ts — FIM Audit Logger Tests
 *
 * Tests for JSONL audit logging, query filtering, and statistics.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { PermissionResult } from './geometric.js';
import { FimAuditLogger } from './audit-logger.js';

// ─── Helpers ─────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<PermissionResult> = {}): PermissionResult {
  return {
    allowed: true,
    overlap: 0.85,
    sovereignty: 0.72,
    threshold: 0.8,
    minSovereignty: 0.6,
    failedCategories: [],
    timestamp: '2026-02-15T12:00:00Z',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('FimAuditLogger', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fim-audit-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('generates a session ID when none provided', () => {
      const logger = new FimAuditLogger(tmpDir);
      expect(logger.getSessionId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('uses the provided session ID', () => {
      const logger = new FimAuditLogger(tmpDir, 'user-1', 'my-session');
      expect(logger.getSessionId()).toBe('my-session');
    });
  });

  describe('logAllow', () => {
    it('appends an ALLOW record to the JSONL file', () => {
      const logger = new FimAuditLogger(tmpDir, 'default', 'sess-1');
      logger.logAllow('shell_execute', 'claude-flow-bridge', makeResult());

      const auditPath = join(tmpDir, 'fim-audit.jsonl');
      expect(existsSync(auditPath)).toBe(true);

      const lines = readFileSync(auditPath, 'utf-8').trim().split('\n');
      expect(lines).toHaveLength(1);

      const record = JSON.parse(lines[0]);
      expect(record.decision).toBe('ALLOW');
      expect(record.toolName).toBe('shell_execute');
      expect(record.skillName).toBe('claude-flow-bridge');
      expect(record.overlap).toBe(0.85);
      expect(record.failedCategories).toEqual([]);
    });
  });

  describe('logDeny', () => {
    it('appends a DENY record with failed categories', () => {
      const logger = new FimAuditLogger(tmpDir, 'default', 'sess-1');
      logger.logDeny(
        'file_write',
        'stl-writer',
        makeResult({
          allowed: false,
          overlap: 0.5,
          failedCategories: ['security: 0.65 < 0.7'],
        }),
      );

      const lines = readFileSync(join(tmpDir, 'fim-audit.jsonl'), 'utf-8')
        .trim()
        .split('\n');
      const record = JSON.parse(lines[0]);
      expect(record.decision).toBe('DENY');
      expect(record.failedCategories).toEqual(['security: 0.65 < 0.7']);
    });
  });

  describe('query', () => {
    it('returns empty array when audit file does not exist', () => {
      const logger = new FimAuditLogger(tmpDir, 'default', 'sess-1');
      expect(logger.query()).toEqual([]);
    });

    it('returns all records when no filters given', () => {
      const logger = new FimAuditLogger(tmpDir, 'default', 'sess-1');
      logger.logAllow('tool-a', 'skill-a', makeResult());
      logger.logDeny('tool-b', 'skill-b', makeResult({ allowed: false }));

      const results = logger.query();
      expect(results).toHaveLength(2);
    });

    it('filters by decision', () => {
      const logger = new FimAuditLogger(tmpDir, 'default', 'sess-1');
      logger.logAllow('t', 's', makeResult());
      logger.logDeny('t', 's', makeResult({ allowed: false }));

      expect(logger.query({ decision: 'ALLOW' })).toHaveLength(1);
      expect(logger.query({ decision: 'DENY' })).toHaveLength(1);
    });

    it('filters by toolName', () => {
      const logger = new FimAuditLogger(tmpDir, 'default', 'sess-1');
      logger.logAllow('shell', 'a', makeResult());
      logger.logAllow('file', 'b', makeResult());

      expect(logger.query({ toolName: 'shell' })).toHaveLength(1);
    });

    it('filters by time range', () => {
      const logger = new FimAuditLogger(tmpDir, 'default', 'sess-1');
      logger.logAllow('t', 's', makeResult({ timestamp: '2026-02-14T00:00:00Z' }));
      logger.logAllow('t', 's', makeResult({ timestamp: '2026-02-15T00:00:00Z' }));
      logger.logAllow('t', 's', makeResult({ timestamp: '2026-02-16T00:00:00Z' }));

      const results = logger.query({
        startTime: '2026-02-14T12:00:00Z',
        endTime: '2026-02-15T12:00:00Z',
      });
      expect(results).toHaveLength(1);
      expect(results[0].timestamp).toBe('2026-02-15T00:00:00Z');
    });
  });

  describe('getStats', () => {
    it('returns zeroed stats when no records exist', () => {
      const logger = new FimAuditLogger(tmpDir, 'default', 'sess-1');
      const stats = logger.getStats();
      expect(stats.totalDecisions).toBe(0);
      expect(stats.allowRate).toBe(0);
      expect(stats.topDeniedTools).toEqual([]);
    });

    it('computes correct statistics', () => {
      const logger = new FimAuditLogger(tmpDir, 'default', 'sess-1');

      // 2 allows, 1 deny
      logger.logAllow('t1', 's1', makeResult({ overlap: 0.9, sovereignty: 0.8 }));
      logger.logAllow('t2', 's2', makeResult({ overlap: 0.8, sovereignty: 0.7 }));
      logger.logDeny('t3', 's3', makeResult({ overlap: 0.5, sovereignty: 0.4, allowed: false }));

      const stats = logger.getStats();
      expect(stats.totalDecisions).toBe(3);
      expect(stats.allowCount).toBe(2);
      expect(stats.denyCount).toBe(1);
      expect(stats.allowRate).toBeCloseTo(2 / 3);
      expect(stats.averageOverlap).toBeCloseTo((0.9 + 0.8 + 0.5) / 3);
      expect(stats.averageSovereignty).toBeCloseTo((0.8 + 0.7 + 0.4) / 3);
      expect(stats.topDeniedTools).toEqual([{ tool: 't3', count: 1 }]);
      expect(stats.topDeniedSkills).toEqual([{ skill: 's3', count: 1 }]);
    });

    it('ranks top denied tools by count descending', () => {
      const logger = new FimAuditLogger(tmpDir, 'default', 'sess-1');
      const deny = makeResult({ allowed: false });

      logger.logDeny('shell', 'a', deny);
      logger.logDeny('shell', 'b', deny);
      logger.logDeny('shell', 'c', deny);
      logger.logDeny('file', 'a', deny);

      const stats = logger.getStats();
      expect(stats.topDeniedTools[0]).toEqual({ tool: 'shell', count: 3 });
      expect(stats.topDeniedTools[1]).toEqual({ tool: 'file', count: 1 });
    });
  });
});
