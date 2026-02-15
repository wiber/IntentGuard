/**
 * src/skills/cost-reporter-scheduler.test.ts
 *
 * Test suite for CostReporterScheduler
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { CostReporterScheduler } from './cost-reporter-scheduler.js';
import CostReporter from './cost-reporter.js';
import type { Logger, DiscordHelper, SkillContext } from '../types.js';

// ═══════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════

const TEST_DATA_DIR = path.join(process.cwd(), 'data', 'test-scheduler');
const TEST_HISTORY_PATH = path.join(TEST_DATA_DIR, 'cost-report-history.jsonl');
const TEST_LEDGER_PATH = path.join(TEST_DATA_DIR, 'wallet-ledger.jsonl');

function createMockLogger(): Logger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  };
}

function createMockDiscord(): DiscordHelper {
  const messages: string[] = [];
  return {
    sendToChannel: async (channelId: string, content: string) => {
      messages.push(content);
      return { success: true };
    },
    getMessages: () => messages,
    clearMessages: () => messages.splice(0, messages.length)
  } as any;
}

function createMockContext(): SkillContext {
  return {
    log: createMockLogger()
  } as SkillContext;
}

function cleanupTestData(): void {
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true });
  }
}

// ═══════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════

describe('CostReporterScheduler', () => {
  let scheduler: CostReporterScheduler;
  let costReporter: CostReporter;
  let logger: Logger;
  let discord: any;
  let ctx: SkillContext;

  beforeEach(async () => {
    cleanupTestData();

    // Create test directory
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    // Initialize dependencies
    logger = createMockLogger();
    discord = createMockDiscord();
    ctx = createMockContext();

    // Create cost reporter with test ledger path
    costReporter = new CostReporter();
    (costReporter as any).ledgerPath = TEST_LEDGER_PATH;
    await costReporter.initialize(ctx);

    // Add some test transactions
    costReporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);
    costReporter.trackInferenceCost('llama3:70b', 20000, 10000);
    costReporter.addRevenue('test-client', 50.00, 'Test payment');

    // Create scheduler
    scheduler = new CostReporterScheduler(logger, costReporter, TEST_DATA_DIR);
  });

  afterEach(() => {
    scheduler.stop();
    cleanupTestData();
  });

  // ═════════════════════════════════════════════════════════════
  // Initialization Tests
  // ═════════════════════════════════════════════════════════════

  describe('constructor', () => {
    it('should create scheduler with default config', () => {
      expect(scheduler).toBeDefined();
    });

    it('should create history file if it does not exist', () => {
      expect(fs.existsSync(TEST_HISTORY_PATH)).toBe(true);
    });

    it('should load history from existing file', () => {
      // Write some history
      const history = {
        timestamp: new Date().toISOString(),
        reportType: 'daily' as const,
        posted: true
      };
      fs.writeFileSync(TEST_HISTORY_PATH, JSON.stringify(history) + '\n', 'utf-8');

      // Create new scheduler
      const scheduler2 = new CostReporterScheduler(logger, costReporter, TEST_DATA_DIR);
      const stats = scheduler2.getReportStats();

      expect(stats.totalDailyReports).toBe(1);
    });

    it('should accept custom config', () => {
      const customScheduler = new CostReporterScheduler(
        logger,
        costReporter,
        TEST_DATA_DIR,
        {
          dailyReportHour: 12,
          weeklyReportDay: 3,
          weeklyReportHour: 15
        }
      );

      expect(customScheduler).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Start/Stop Tests
  // ═════════════════════════════════════════════════════════════

  describe('start/stop', () => {
    it('should start scheduler with Discord binding', () => {
      scheduler.start(discord, 'test-channel-id');
      // Should not throw
      expect(true).toBe(true);
    });

    it('should not start if disabled in config', () => {
      const disabledScheduler = new CostReporterScheduler(
        logger,
        costReporter,
        TEST_DATA_DIR,
        { enabled: false }
      );

      disabledScheduler.start(discord, 'test-channel-id');
      // Should not throw
      expect(true).toBe(true);
    });

    it('should stop scheduler cleanly', () => {
      scheduler.start(discord, 'test-channel-id');
      scheduler.stop();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Manual Trigger Tests
  // ═════════════════════════════════════════════════════════════

  describe('manual triggers', () => {
    beforeEach(() => {
      scheduler.start(discord, 'test-channel-id');
    });

    it('should trigger daily report manually', async () => {
      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0]).toContain('DAILY P&L REPORT');
    });

    it('should trigger weekly report manually', async () => {
      await scheduler.triggerWeeklyReport();

      const messages = discord.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0]).toContain('WEEKLY P&L REPORT');
    });

    it('should record daily report in history', async () => {
      await scheduler.triggerDailyReport();

      const stats = scheduler.getReportStats();
      expect(stats.totalDailyReports).toBe(1);
    });

    it('should record weekly report in history', async () => {
      await scheduler.triggerWeeklyReport();

      const stats = scheduler.getReportStats();
      expect(stats.totalWeeklyReports).toBe(1);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Report Formatting Tests
  // ═════════════════════════════════════════════════════════════

  describe('daily report formatting', () => {
    beforeEach(() => {
      scheduler.start(discord, 'test-channel-id');
    });

    it('should format daily report with financial summary', async () => {
      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      const report = messages[0];

      expect(report).toContain('DAILY P&L REPORT');
      expect(report).toContain('FINANCIAL SUMMARY');
      expect(report).toContain('Income:');
      expect(report).toContain('Expenses:');
      expect(report).toContain('Net Balance:');
    });

    it('should include category breakdown in daily report', async () => {
      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      const report = messages[0];

      expect(report).toContain('TOP CATEGORIES');
    });

    it('should include top expenses in daily report', async () => {
      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      const report = messages[0];

      expect(report).toContain('TOP EXPENSES');
    });

    it('should show positive status for profitable day', async () => {
      // Add more revenue than expenses
      costReporter.addRevenue('big-client', 500.00, 'Large payment');

      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      const report = messages[0];

      expect(report.includes('POSITIVE') || report.includes('📈')).toBe(true);
    });

    it('should show deficit status for unprofitable day', async () => {
      // Add large expense
      costReporter.trackInferenceCost('claude-opus-4-6', 1000000, 500000);

      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      const report = messages[0];

      expect(report.includes('DEFICIT') || report.includes('📉')).toBe(true);
    });
  });

  describe('weekly report formatting', () => {
    beforeEach(() => {
      scheduler.start(discord, 'test-channel-id');
    });

    it('should format weekly report with 7-day summary', async () => {
      await scheduler.triggerWeeklyReport();

      const messages = discord.getMessages();
      const report = messages[0];

      expect(report).toContain('WEEKLY P&L REPORT');
      expect(report).toContain('FINANCIAL SUMMARY (7 DAYS)');
      expect(report).toContain('Avg Daily Spend:');
    });

    it('should include projection in weekly report', async () => {
      await scheduler.triggerWeeklyReport();

      const messages = discord.getMessages();
      const report = messages[0];

      expect(report).toContain('PROJECTION');
      expect(report).toContain('Projected 30-day spend');
    });

    it('should show date range in weekly report', async () => {
      await scheduler.triggerWeeklyReport();

      const messages = discord.getMessages();
      const report = messages[0];

      expect(report).toContain(' to ');
    });
  });

  // ═════════════════════════════════════════════════════════════
  // History Tracking Tests
  // ═════════════════════════════════════════════════════════════

  describe('history tracking', () => {
    beforeEach(() => {
      scheduler.start(discord, 'test-channel-id');
    });

    it('should track successful report posts', async () => {
      await scheduler.triggerDailyReport();

      const history = scheduler.getReportHistory();
      expect(history.length).toBe(1);
      expect(history[0].reportType).toBe('daily');
      expect(history[0].posted).toBe(true);
    });

    it('should persist history to JSONL file', async () => {
      await scheduler.triggerDailyReport();
      await scheduler.triggerWeeklyReport();

      const content = fs.readFileSync(TEST_HISTORY_PATH, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      expect(lines.length).toBe(2);

      const entry1 = JSON.parse(lines[0]);
      const entry2 = JSON.parse(lines[1]);

      expect(entry1.reportType).toBe('daily');
      expect(entry2.reportType).toBe('weekly');
    });

    it('should load history on startup', async () => {
      await scheduler.triggerDailyReport();

      // Create new scheduler
      const scheduler2 = new CostReporterScheduler(logger, costReporter, TEST_DATA_DIR);
      const history = scheduler2.getReportHistory();

      expect(history.length).toBe(1);
      expect(history[0].reportType).toBe('daily');
    });

    it('should track failed posts with error message', async () => {
      // Mock Discord to throw error
      const failingDiscord = {
        sendToChannel: async () => {
          throw new Error('Network error');
        }
      };

      scheduler.start(failingDiscord as any, 'test-channel-id');

      try {
        await scheduler.triggerDailyReport();
      } catch {
        // Expected to fail
      }

      const history = scheduler.getReportHistory();
      expect(history.length).toBe(1);
      expect(history[0].posted).toBe(false);
      expect(history[0].error).toBeTruthy();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Statistics Tests
  // ═════════════════════════════════════════════════════════════

  describe('statistics', () => {
    beforeEach(() => {
      scheduler.start(discord, 'test-channel-id');
    });

    it('should return correct report counts', async () => {
      await scheduler.triggerDailyReport();
      await scheduler.triggerDailyReport();
      await scheduler.triggerWeeklyReport();

      const stats = scheduler.getReportStats();
      expect(stats.totalDailyReports).toBe(2);
      expect(stats.totalWeeklyReports).toBe(1);
    });

    it('should track last report timestamps', async () => {
      await scheduler.triggerDailyReport();
      await scheduler.triggerWeeklyReport();

      const stats = scheduler.getReportStats();
      expect(stats.lastDailyReport).toBeTruthy();
      expect(stats.lastWeeklyReport).toBeTruthy();
    });

    it('should count failed posts', async () => {
      // Mock Discord to fail
      const failingDiscord = {
        sendToChannel: async () => {
          throw new Error('Network error');
        }
      };

      scheduler.start(failingDiscord as any, 'test-channel-id');

      try {
        await scheduler.triggerDailyReport();
      } catch {
        // Expected
      }

      const stats = scheduler.getReportStats();
      expect(stats.failedPosts).toBe(1);
    });

    it('should return zero stats for empty history', () => {
      const stats = scheduler.getReportStats();

      expect(stats.totalDailyReports).toBe(0);
      expect(stats.totalWeeklyReports).toBe(0);
      expect(stats.lastDailyReport).toBe(null);
      expect(stats.lastWeeklyReport).toBe(null);
      expect(stats.failedPosts).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Edge Cases
  // ═════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle empty ledger gracefully', async () => {
      // Create scheduler with empty cost reporter
      const emptyReporter = new CostReporter();
      (emptyReporter as any).ledgerPath = path.join(TEST_DATA_DIR, 'empty-ledger.jsonl');
      await emptyReporter.initialize(ctx);

      const emptyScheduler = new CostReporterScheduler(logger, emptyReporter, TEST_DATA_DIR);
      emptyScheduler.start(discord, 'test-channel-id');

      await emptyScheduler.triggerDailyReport();

      const messages = discord.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0]).toContain('DAILY P&L REPORT');
    });

    it('should handle missing Discord gracefully', async () => {
      // Don't call start() - Discord should be undefined
      await scheduler.triggerDailyReport();
      // Should not throw
      expect(true).toBe(true);
    });

    it('should trim history to prevent unbounded growth', async () => {
      scheduler.start(discord, 'test-channel-id');

      // Add many reports (more than 1000)
      for (let i = 0; i < 1100; i++) {
        (scheduler as any).reportHistory.push({
          timestamp: new Date().toISOString(),
          reportType: 'daily',
          posted: true
        });
      }

      // Trigger one more to activate trimming
      await scheduler.triggerDailyReport();

      const history = scheduler.getReportHistory(10000);
      expect(history.length).toBeLessThanOrEqual(1000);
    });

    it('should handle malformed history file gracefully', async () => {
      // Write invalid JSON to history file
      fs.writeFileSync(TEST_HISTORY_PATH, 'invalid json\n{"valid":"json"}\n', 'utf-8');

      // Should not throw when creating scheduler
      const scheduler2 = new CostReporterScheduler(logger, costReporter, TEST_DATA_DIR);
      expect(scheduler2).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Integration Tests
  // ═════════════════════════════════════════════════════════════

  describe('integration scenarios', () => {
    beforeEach(() => {
      scheduler.start(discord, 'test-channel-id');
    });

    it('should post complete daily report with real data', async () => {
      // Add diverse transactions
      costReporter.trackInferenceCost('claude-opus-4-6', 100000, 50000);
      costReporter.trackInferenceCost('claude-sonnet-4-5', 200000, 100000);
      costReporter.trackInferenceCost('llama3:70b', 50000, 25000);
      costReporter.addRevenue('client-alpha', 150.00, 'Monthly payment');
      costReporter.addRevenue('client-beta', 75.00, 'Project fee');

      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      const report = messages[0];

      // Verify all sections present
      expect(report).toContain('DAILY P&L REPORT');
      expect(report).toContain('FINANCIAL SUMMARY');
      expect(report).toContain('TOP CATEGORIES');
      expect(report).toContain('TOP EXPENSES');
      expect(report).toContain('INSIGHT');
      expect(report).toContain('Economic Sovereignty');
    });

    it('should handle daily and weekly reports in sequence', async () => {
      await scheduler.triggerDailyReport();
      discord.clearMessages();
      await scheduler.triggerWeeklyReport();

      const messages = discord.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0]).toContain('WEEKLY P&L REPORT');

      const stats = scheduler.getReportStats();
      expect(stats.totalDailyReports).toBe(1);
      expect(stats.totalWeeklyReports).toBe(1);
    });

    it('should maintain history across multiple operations', async () => {
      await scheduler.triggerDailyReport();
      await scheduler.triggerWeeklyReport();
      await scheduler.triggerDailyReport();

      const history = scheduler.getReportHistory();
      expect(history.length).toBe(3);
      expect(history[0].reportType).toBe('daily');
      expect(history[1].reportType).toBe('weekly');
      expect(history[2].reportType).toBe('daily');
    });
  });
});
