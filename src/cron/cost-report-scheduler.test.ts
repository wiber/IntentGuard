/**
 * src/cron/cost-report-scheduler.test.ts
 *
 * Test suite for CostReportScheduler
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CostReportScheduler, DEFAULT_COST_REPORT_CONFIG } from './cost-report-scheduler.js';
import CostReporter from '../skills/cost-reporter.js';
import type { Logger, DiscordHelper, SkillContext } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════

const TEST_LEDGER_PATH = path.join(process.cwd(), 'data', 'test-cost-scheduler-ledger.jsonl');

function createMockLogger(): Logger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };
}

function createMockDiscord(): DiscordHelper {
  const messages: string[] = [];
  return {
    sendToChannel: async (channelId: string, content: string) => {
      messages.push(content);
    },
    getMessages: () => messages,
  } as DiscordHelper & { getMessages: () => string[] };
}

function createMockContext(): SkillContext {
  return {
    log: createMockLogger(),
  } as SkillContext;
}

function cleanupTestLedger(): void {
  if (fs.existsSync(TEST_LEDGER_PATH)) {
    fs.unlinkSync(TEST_LEDGER_PATH);
  }
}

// ═══════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════

describe('CostReportScheduler', () => {
  let scheduler: CostReportScheduler;
  let costReporter: CostReporter;
  let log: Logger;
  let discord: DiscordHelper & { getMessages: () => string[] };
  let ctx: SkillContext;

  beforeEach(async () => {
    log = createMockLogger();
    discord = createMockDiscord() as DiscordHelper & { getMessages: () => string[] };
    ctx = createMockContext();

    costReporter = new CostReporter();
    (costReporter as any).ledgerPath = TEST_LEDGER_PATH;
    await costReporter.initialize(ctx);

    cleanupTestLedger();
  });

  afterEach(() => {
    if (scheduler) {
      scheduler.stop();
    }
    cleanupTestLedger();
  });

  // ═════════════════════════════════════════════════════════════
  // Initialization Tests
  // ═════════════════════════════════════════════════════════════

  describe('constructor', () => {
    it('should initialize with default config', () => {
      scheduler = new CostReportScheduler(log, costReporter);
      const status = scheduler.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.lastDailyReport).toBe('never');
      expect(status.lastWeeklyReport).toBe('never');
    });

    it('should accept custom config', () => {
      scheduler = new CostReportScheduler(log, costReporter, {
        enabled: false,
        dailyHour: 12,
        dailyMinute: 30,
      });

      const status = scheduler.getStatus();
      expect(status.enabled).toBe(false);
    });
  });

  describe('start/stop', () => {
    it('should start scheduler with Discord', () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');

      const status = scheduler.getStatus();
      expect(status.enabled).toBe(true);
    });

    it('should not start if disabled', () => {
      scheduler = new CostReportScheduler(log, costReporter, { enabled: false });
      scheduler.start(discord, 'test-channel-id');

      const status = scheduler.getStatus();
      expect(status.enabled).toBe(false);
    });

    it('should stop scheduler', () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');
      scheduler.stop();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Manual Report Tests
  // ═════════════════════════════════════════════════════════════

  describe('triggerDailyReport', () => {
    it('should post daily report to Discord', async () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');

      // Add some test data
      costReporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);
      costReporter.addRevenue('test-client', 100.00, 'Test payment');

      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0]).toContain('DAILY COST REPORT');
      expect(messages[0]).toContain('WALLET REPORT');
      expect(messages[0]).toContain('Total Income');
      expect(messages[0]).toContain('Total Expenses');
    });

    it('should include budget information in report', async () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');

      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      expect(messages[0]).toContain('Daily budget');
      expect(messages[0]).toContain('Economic sovereignty');
    });

    it('should handle empty ledger', async () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');

      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0]).toContain('DAILY COST REPORT');
    });
  });

  describe('triggerWeeklyReport', () => {
    it('should post weekly report to Discord', async () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');

      // Add some test data
      costReporter.trackInferenceCost('claude-opus-4-6', 50000, 25000);
      costReporter.trackInferenceCost('claude-sonnet-4-5', 100000, 50000);
      costReporter.addRevenue('test-client', 250.00, 'Weekly payment');

      await scheduler.triggerWeeklyReport();

      const messages = discord.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0]).toContain('WEEKLY COST REPORT');
      expect(messages[0]).toContain('WALLET REPORT');
      expect(messages[0]).toContain('Days: 7');
    });

    it('should include 7-day overview note', async () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');

      await scheduler.triggerWeeklyReport();

      const messages = discord.getMessages();
      expect(messages[0]).toContain('7-day financial overview');
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Status Tests
  // ═════════════════════════════════════════════════════════════

  describe('getStatus', () => {
    it('should return current status', () => {
      scheduler = new CostReportScheduler(log, costReporter);
      const status = scheduler.getStatus();

      expect(typeof status.enabled).toBe('boolean');
      expect(typeof status.lastDailyReport).toBe('string');
      expect(typeof status.lastWeeklyReport).toBe('string');
      expect(typeof status.nextDailyTime).toBe('string');
      expect(typeof status.nextWeeklyTime).toBe('string');
    });

    it('should calculate next report times correctly', () => {
      scheduler = new CostReportScheduler(log, costReporter, {
        dailyHour: 23,
        dailyMinute: 30,
        weeklyDay: 0, // Sunday
        weeklyHour: 23,
        weeklyMinute: 45,
      });

      const status = scheduler.getStatus();

      // Verify next times are ISO strings
      expect(status.nextDailyTime).toContain('T');
      expect(status.nextWeeklyTime).toContain('T');

      // Verify next daily is in the future
      const nextDaily = new Date(status.nextDailyTime);
      expect(nextDaily.getTime()).toBeGreaterThan(Date.now());

      // Verify next weekly is in the future
      const nextWeekly = new Date(status.nextWeeklyTime);
      expect(nextWeekly.getTime()).toBeGreaterThan(Date.now());
    });

    it('should show last report times after posting', async () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');

      await scheduler.triggerDailyReport();

      const status = scheduler.getStatus();
      expect(status.lastDailyReport).not.toBe('never');
      expect(status.lastDailyReport).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Integration Tests
  // ═════════════════════════════════════════════════════════════

  describe('integration scenarios', () => {
    it('should post both daily and weekly reports with different data', async () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');

      // Daily activity
      costReporter.trackInferenceCost('claude-sonnet-4-5', 10000, 5000);

      await scheduler.triggerDailyReport();

      // More activity for weekly
      costReporter.trackInferenceCost('claude-opus-4-6', 50000, 25000);
      costReporter.addRevenue('weekly-client', 500.00, 'Weekly retainer');

      await scheduler.triggerWeeklyReport();

      const messages = discord.getMessages();
      expect(messages.length).toBe(2);
      expect(messages[0]).toContain('DAILY');
      expect(messages[1]).toContain('WEEKLY');
    });

    it('should handle multiple inference types in report', async () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');

      // Track various models
      costReporter.trackInferenceCost('claude-opus-4-6', 100000, 50000);
      costReporter.trackInferenceCost('claude-sonnet-4-5', 200000, 100000);
      costReporter.trackInferenceCost('claude-haiku-4-5', 50000, 25000);
      costReporter.trackInferenceCost('llama3:70b', 30000, 15000);

      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      const report = messages[0];

      // Should show category breakdown
      expect(report).toContain('BY CATEGORY');
      expect(report.includes('inference-claude-opus') || report.includes('opus')).toBe(true);
      expect(report.includes('inference-claude-sonnet') || report.includes('sonnet')).toBe(true);
    });

    it('should format currency correctly', async () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');

      costReporter.trackInferenceCost('claude-opus-4-6', 100000, 50000); // ~$5.25
      costReporter.addRevenue('client', 123.456, 'Payment');

      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      const report = messages[0];

      // Should have dollar signs and decimal places
      expect(report).toContain('$');
      expect(report).toMatch(/\$\d+\.\d{2,4}/); // Currency format
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Edge Cases
  // ═════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle Discord not initialized gracefully', async () => {
      scheduler = new CostReportScheduler(log, costReporter);
      // Don't call start() to simulate Discord not being initialized

      // Should not throw
      await scheduler.triggerDailyReport();
      await scheduler.triggerWeeklyReport();

      expect(true).toBe(true);
    });

    it('should handle cost reporter errors gracefully', async () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');

      // Corrupt the ledger to cause an error
      fs.writeFileSync(TEST_LEDGER_PATH, 'invalid json data\n', 'utf-8');

      // Should not throw
      await scheduler.triggerDailyReport();

      expect(true).toBe(true);
    });

    it('should handle very large reports', async () => {
      scheduler = new CostReportScheduler(log, costReporter);
      scheduler.start(discord, 'test-channel-id');

      // Generate lots of transactions
      for (let i = 0; i < 100; i++) {
        costReporter.trackInferenceCost('claude-sonnet-4-5', 1000, 500);
      }

      await scheduler.triggerDailyReport();

      const messages = discord.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].length).toBeGreaterThan(0);
    });
  });
});
