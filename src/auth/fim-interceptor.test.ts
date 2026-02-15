/**
 * src/auth/fim-interceptor.test.ts
 *
 * Unit tests for FimInterceptor
 * Tests overlap computation before every tool call, fail-open behavior,
 * denial tracking, drift correction, and heat map updates.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { FimInterceptor, type FimDenialEvent } from './fim-interceptor.js';
import type { Logger } from '../types.js';
import type { IdentityVector } from './geometric.js';

// ─── Mock Logger ────────────────────────────────────────────────────────

class MockLogger implements Logger {
  logs: Array<{ level: string; message: string }> = [];

  debug(message: string): void {
    this.logs.push({ level: 'DEBUG', message });
  }
  info(message: string): void {
    this.logs.push({ level: 'INFO', message });
  }
  warn(message: string): void {
    this.logs.push({ level: 'WARN', message });
  }
  error(message: string): void {
    this.logs.push({ level: 'ERROR', message });
  }

  hasLog(level: string, substring: string): boolean {
    return this.logs.some(log => log.level === level && log.message.includes(substring));
  }

  clear(): void {
    this.logs = [];
  }
}

// ─── Test Setup ─────────────────────────────────────────────────────────

const TEST_DATA_DIR = join('/tmp', 'fim-interceptor-test-' + Date.now());

function setupTestEnvironment(): void {
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DATA_DIR, { recursive: true });

  // Create pipeline-runs directory with a test identity
  const runsDir = join(TEST_DATA_DIR, 'pipeline-runs', 'run-20260215-120000');
  mkdirSync(runsDir, { recursive: true });

  // Write test identity (grades-statistics.json)
  const testGrades = {
    categories: {
      security: { grade: 'B', score: 0.8 },
      reliability: { grade: 'B', score: 0.75 },
      data_integrity: { grade: 'C', score: 0.6 },
      process_adherence: { grade: 'B', score: 0.75 },
      code_quality: { grade: 'A', score: 0.95 },
      testing: { grade: 'B', score: 0.8 },
      documentation: { grade: 'C', score: 0.6 },
      communication: { grade: 'B', score: 0.75 },
      time_management: { grade: 'C', score: 0.6 },
      resource_efficiency: { grade: 'B', score: 0.75 },
      risk_assessment: { grade: 'C', score: 0.6 },
      compliance: { grade: 'B', score: 0.75 },
      innovation: { grade: 'C', score: 0.6 },
      collaboration: { grade: 'B', score: 0.75 },
      accountability: { grade: 'B', score: 0.75 },
      transparency: { grade: 'C', score: 0.6 },
      adaptability: { grade: 'B', score: 0.75 },
      domain_expertise: { grade: 'B', score: 0.75 },
      user_focus: { grade: 'C', score: 0.6 },
      ethical_alignment: { grade: 'B', score: 0.75 },
    },
  };
  writeFileSync(
    join(runsDir, '4-grades-statistics.json'),
    JSON.stringify(testGrades, null, 2)
  );
}

function teardownTestEnvironment(): void {
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
}

// ─── Test Suite ─────────────────────────────────────────────────────────

beforeAll(() => {
  setupTestEnvironment();
});

afterAll(() => {
  teardownTestEnvironment();
});

describe('FimInterceptor', () => {
  it('should load identity correctly', () => {
    const logger = new MockLogger();
    const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

    const stats = interceptor.getStats();
    expect(stats.sovereignty).toBeGreaterThan(0);
    expect(stats.sovereignty).toBeCloseTo(0.71, 1);
    expect(logger.hasLog('INFO', 'Loaded identity from run-20260215-120000')).toBe(true);
  });

  it('should bypass FIM checks for exempt skills', async () => {
    const logger = new MockLogger();
    const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

    // thetasteer-categorize is in FIM_EXEMPT
    const result = await interceptor.intercept('thetasteer-categorize', {});
    expect(result).toBeNull();
    expect(logger.hasLog('DEBUG', 'exempt from checks')).toBe(true);
  });

  it('should fail-open for undefined skills', async () => {
    const logger = new MockLogger();
    const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

    // Unknown skill not in SKILL_TO_TOOL mapping
    const result = await interceptor.intercept('unknown-skill', {});
    expect(result).toBeNull();
    expect(logger.hasLog('INFO', 'Unknown skill "unknown-skill" — fail-open')).toBe(true);

    // Check fail-open log file
    const failOpenLog = join(TEST_DATA_DIR, 'fim-fail-open.jsonl');
    expect(existsSync(failOpenLog)).toBe(true);

    const logContent = readFileSync(failOpenLog, 'utf-8');
    const logEntry = JSON.parse(logContent.trim());
    expect(logEntry.skillName).toBe('unknown-skill');
    expect(logEntry.reason).toBe('unknown_skill');
  });

  it('should compute overlap before every tool call', async () => {
    const logger = new MockLogger();
    const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

    logger.clear();
    await interceptor.intercept('wallet-ledger', {}); // file_write

    const hasOverlapLog = logger.logs.some(log =>
      log.message.includes('overlap:') || log.message.includes('FIM ALLOWED') || log.message.includes('FIM DENIED')
    );

    expect(hasOverlapLog).toBe(true);
  });

  it('should deny skill execution with insufficient scores', async () => {
    // Create a new test environment with LOW scores
    const lowScoreDir = join('/tmp', 'fim-interceptor-low-' + Date.now());
    mkdirSync(lowScoreDir, { recursive: true });
    const runsDir = join(lowScoreDir, 'pipeline-runs', 'run-20260215-130000');
    mkdirSync(runsDir, { recursive: true });

    const lowGrades = {
      categories: {
        security: { grade: 'D', score: 0.4 },
        reliability: { grade: 'D', score: 0.4 },
        data_integrity: { grade: 'F', score: 0.2 },
        code_quality: { grade: 'F', score: 0.2 },
        testing: { grade: 'D', score: 0.4 },
      },
    };
    writeFileSync(
      join(runsDir, '4-grades-statistics.json'),
      JSON.stringify(lowGrades, null, 2)
    );

    const logger = new MockLogger();
    const interceptor = new FimInterceptor(logger, lowScoreDir);

    // system-control maps to shell_execute, which requires security: 0.7, reliability: 0.5
    const result = await interceptor.intercept('system-control', {});
    expect(result).not.toBeNull();
    expect(result!.success).toBe(false);
    expect(result!.message).toContain('FIM DENIED');

    expect(logger.hasLog('WARN', 'FIM DENIED "system-control"')).toBe(true);

    const stats = interceptor.getStats();
    expect(stats.consecutiveDenials).toBe(1);
    expect(stats.totalDenials).toBe(1);

    // Check denial log file
    const denialLog = join(lowScoreDir, 'fim-denials.jsonl');
    expect(existsSync(denialLog)).toBe(true);

    // Cleanup
    rmSync(lowScoreDir, { recursive: true, force: true });
  });

  it('should invoke denial callbacks', async () => {
    const lowScoreDir = join('/tmp', 'fim-interceptor-callback-' + Date.now());
    mkdirSync(lowScoreDir, { recursive: true });
    const runsDir = join(lowScoreDir, 'pipeline-runs', 'run-20260215-140000');
    mkdirSync(runsDir, { recursive: true });

    const lowGrades = {
      categories: {
        security: { grade: 'F', score: 0.2 },
        reliability: { grade: 'F', score: 0.2 },
        data_integrity: { grade: 'F', score: 0.2 },
      },
    };
    writeFileSync(
      join(runsDir, '4-grades-statistics.json'),
      JSON.stringify(lowGrades, null, 2)
    );

    const logger = new MockLogger();
    const interceptor = new FimInterceptor(logger, lowScoreDir);

    let denialCallbackInvoked = false;
    let denialEvent: FimDenialEvent | null = null;

    interceptor.onDenial = async (event) => {
      denialCallbackInvoked = true;
      denialEvent = event;
    };

    await interceptor.intercept('email-outbound', {}); // send_email requires communication: 0.6

    expect(denialCallbackInvoked).toBe(true);
    expect(denialEvent).not.toBeNull();
    expect(denialEvent!.skillName).toBe('email-outbound');
    expect(denialEvent!.toolName).toBe('send_email');

    // Cleanup
    rmSync(lowScoreDir, { recursive: true, force: true });
  });

  it('should trigger drift threshold callback after 3 consecutive denials', async () => {
    const lowScoreDir = join('/tmp', 'fim-interceptor-drift-' + Date.now());
    mkdirSync(lowScoreDir, { recursive: true });
    const runsDir = join(lowScoreDir, 'pipeline-runs', 'run-20260215-150000');
    mkdirSync(runsDir, { recursive: true });

    const lowGrades = {
      categories: {
        security: { grade: 'F', score: 0.1 },
        reliability: { grade: 'F', score: 0.1 },
      },
    };
    writeFileSync(
      join(runsDir, '4-grades-statistics.json'),
      JSON.stringify(lowGrades, null, 2)
    );

    const logger = new MockLogger();
    const interceptor = new FimInterceptor(logger, lowScoreDir);

    let driftCallbackInvoked = false;
    interceptor.onDriftThreshold = async () => {
      driftCallbackInvoked = true;
    };

    // Trigger 3 consecutive denials
    await interceptor.intercept('system-control', {}); // Denial 1
    await interceptor.intercept('system-control', {}); // Denial 2
    await interceptor.intercept('system-control', {}); // Denial 3 -> triggers drift

    expect(driftCallbackInvoked).toBe(true);
    expect(logger.hasLog('WARN', '3 consecutive denials — triggering drift correction')).toBe(true);

    const stats = interceptor.getStats();
    expect(stats.consecutiveDenials).toBe(0);

    // Cleanup
    rmSync(lowScoreDir, { recursive: true, force: true });
  });

  it('should reset consecutive denials on allowed execution', async () => {
    const lowScoreDir = join('/tmp', 'fim-interceptor-reset-' + Date.now());
    mkdirSync(lowScoreDir, { recursive: true });
    const runsDir = join(lowScoreDir, 'pipeline-runs', 'run-20260215-160000');
    mkdirSync(runsDir, { recursive: true });

    const mixedGrades = {
      categories: {
        security: { grade: 'F', score: 0.1 },        // Fails shell_execute
        reliability: { grade: 'B', score: 0.8 },     // Passes file_write
        data_integrity: { grade: 'B', score: 0.8 },  // Passes file_write
      },
    };
    writeFileSync(
      join(runsDir, '4-grades-statistics.json'),
      JSON.stringify(mixedGrades, null, 2)
    );

    const logger = new MockLogger();
    const interceptor = new FimInterceptor(logger, lowScoreDir);

    // Trigger 2 denials
    await interceptor.intercept('system-control', {}); // Denial 1
    await interceptor.intercept('system-control', {}); // Denial 2

    let stats = interceptor.getStats();
    expect(stats.consecutiveDenials).toBe(2);

    // Now allow one (wallet-ledger maps to file_write, which should pass)
    await interceptor.intercept('wallet-ledger', {}); // Allowed

    stats = interceptor.getStats();
    expect(stats.consecutiveDenials).toBe(0);
    expect(stats.totalDenials).toBe(2);

    // Cleanup
    rmSync(lowScoreDir, { recursive: true, force: true });
  });

  it('should update heat map on FIM decisions', () => {
    const logger = new MockLogger();
    const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

    // Update heat map for allowed execution
    interceptor.updateHeatMap('A1', true);

    // Check heat.json was created
    const heatPath = join(TEST_DATA_DIR, 'heat.json');
    expect(existsSync(heatPath)).toBe(true);

    const heat = JSON.parse(readFileSync(heatPath, 'utf-8'));
    expect(heat.cells.A1).toBeDefined();
    expect(heat.cells.A1.taskCount).toBe(1);
    expect(heat.cells.A1.denials).toBe(0);

    // Update heat map for denied execution
    interceptor.updateHeatMap('A1', false);

    const heat2 = JSON.parse(readFileSync(heatPath, 'utf-8'));
    expect(heat2.cells.A1.denials).toBe(1);
    expect(heat2.sovereignty).toBeDefined();
  });

  it('should reload identity after pipeline re-run', () => {
    const logger = new MockLogger();
    const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

    const statsBefore = interceptor.getStats();

    // Simulate pipeline re-run by creating a new run directory
    const newRunDir = join(TEST_DATA_DIR, 'pipeline-runs', 'run-20260215-170000');
    mkdirSync(newRunDir, { recursive: true });

    const newGrades = {
      categories: {
        security: { grade: 'A', score: 0.95 },
        reliability: { grade: 'A', score: 0.95 },
        data_integrity: { grade: 'A', score: 0.95 },
      },
    };
    writeFileSync(
      join(newRunDir, '4-grades-statistics.json'),
      JSON.stringify(newGrades, null, 2)
    );

    // Reload identity
    logger.clear();
    interceptor.reloadIdentity();

    const statsAfter = interceptor.getStats();
    expect(statsAfter.sovereignty).toBeGreaterThan(statsBefore.sovereignty);
    expect(statsAfter.sovereignty).toBeCloseTo(0.95, 1);
    expect(statsAfter.consecutiveDenials).toBe(0);
    expect(logger.hasLog('INFO', 'Loaded identity from run-20260215-170000')).toBe(true);
  });

  it('should verify overlap computation for all tool call types', async () => {
    const logger = new MockLogger();
    const interceptor = new FimInterceptor(logger, TEST_DATA_DIR);

    logger.clear();

    // Test exempt skill (should not compute overlap)
    await interceptor.intercept('thetasteer-categorize', {});
    expect(logger.logs.some(log => log.message.includes('exempt from checks'))).toBe(true);

    // Test unknown skill (fail-open, should still log)
    logger.clear();
    await interceptor.intercept('unknown-skill-xyz', {});
    expect(logger.logs.some(log => log.message.includes('fail-open'))).toBe(true);

    // Test known skill with requirement (should compute overlap)
    logger.clear();
    await interceptor.intercept('wallet-ledger', {});
    expect(logger.logs.some(log => log.message.includes('overlap'))).toBe(true);
  });
});
