/**
 * src/skills/cost-reporter-scheduler.example.ts
 *
 * Example integration of CostReporterScheduler into IntentGuard runtime
 *
 * This shows how to:
 * 1. Initialize the cost reporter scheduler
 * 2. Wire it into the Discord bot
 * 3. Add manual trigger commands
 * 4. Monitor scheduling health
 */

import { CostReporterScheduler } from './cost-reporter-scheduler.js';
import CostReporter from './cost-reporter.js';
import type { Logger, DiscordHelper, SkillContext } from '../types.js';
import path from 'path';

// ═══════════════════════════════════════════════════════════════
// Example 1: Basic Integration
// ═══════════════════════════════════════════════════════════════

async function basicIntegration(
  logger: Logger,
  discord: DiscordHelper,
  ctx: SkillContext
): Promise<void> {
  // Initialize cost reporter
  const costReporter = new CostReporter();
  await costReporter.initialize(ctx);

  // Create scheduler with default config
  const dataDir = path.join(process.cwd(), 'data');
  const scheduler = new CostReporterScheduler(logger, costReporter, dataDir);

  // Find #trust-debt-public channel
  const channelId = await discord.findChannelByName('trust-debt-public');
  if (!channelId) {
    logger.error('Cannot start cost reporter: #trust-debt-public not found');
    return;
  }

  // Start automated reporting
  scheduler.start(discord, channelId);
  logger.info('Cost reporter scheduler started successfully');

  // Cleanup on shutdown
  process.on('SIGINT', () => {
    scheduler.stop();
    logger.info('Cost reporter scheduler stopped');
    process.exit(0);
  });
}

// ═══════════════════════════════════════════════════════════════
// Example 2: Custom Configuration
// ═══════════════════════════════════════════════════════════════

async function customConfiguration(
  logger: Logger,
  discord: DiscordHelper,
  ctx: SkillContext
): Promise<void> {
  const costReporter = new CostReporter();
  await costReporter.initialize(ctx);

  // Custom schedule: Daily at 12:00 UTC, Weekly on Wednesday at 15:00 UTC
  const scheduler = new CostReporterScheduler(
    logger,
    costReporter,
    path.join(process.cwd(), 'data'),
    {
      enabled: true,
      dailyReportHour: 12,        // 12:00 UTC (noon)
      weeklyReportDay: 3,         // Wednesday (0=Sunday, 3=Wednesday)
      weeklyReportHour: 15,       // 15:00 UTC (3pm)
      minIntervalBetweenReportsMs: 1800_000, // 30 minutes
      logReports: true
    }
  );

  const channelId = await discord.findChannelByName('trust-debt-public');
  if (channelId) {
    scheduler.start(discord, channelId);
  }
}

// ═══════════════════════════════════════════════════════════════
// Example 3: Integration with Runtime Class
// ═══════════════════════════════════════════════════════════════

class IntentGuardRuntimeWithReporting {
  private logger: Logger;
  private discord: DiscordHelper;
  private costReporter: CostReporter | undefined;
  private reportScheduler: CostReporterScheduler | undefined;

  constructor(logger: Logger, discord: DiscordHelper) {
    this.logger = logger;
    this.discord = discord;
  }

  async initialize(ctx: SkillContext): Promise<void> {
    // Initialize cost reporter
    this.costReporter = new CostReporter();
    await this.costReporter.initialize(ctx);

    // Initialize scheduler
    const dataDir = path.join(process.cwd(), 'data');
    this.reportScheduler = new CostReporterScheduler(
      this.logger,
      this.costReporter,
      dataDir
    );

    // Find channel and start
    const channelId = await this.discord.findChannelByName('trust-debt-public');
    if (channelId) {
      this.reportScheduler.start(this.discord, channelId);
      this.logger.info('Automated P&L reporting enabled');
    } else {
      this.logger.warn('#trust-debt-public not found, P&L reports disabled');
    }
  }

  async shutdown(): Promise<void> {
    if (this.reportScheduler) {
      this.reportScheduler.stop();
    }
  }

  // Manual trigger methods
  async triggerDailyReport(): Promise<void> {
    if (!this.reportScheduler) {
      throw new Error('Report scheduler not initialized');
    }
    await this.reportScheduler.triggerDailyReport();
  }

  async triggerWeeklyReport(): Promise<void> {
    if (!this.reportScheduler) {
      throw new Error('Report scheduler not initialized');
    }
    await this.reportScheduler.triggerWeeklyReport();
  }

  getReportStats(): any {
    if (!this.reportScheduler) {
      return null;
    }
    return this.reportScheduler.getReportStats();
  }
}

// ═══════════════════════════════════════════════════════════════
// Example 4: Discord Command Integration
// ═══════════════════════════════════════════════════════════════

async function addDiscordCommands(
  scheduler: CostReporterScheduler,
  discord: DiscordHelper,
  logger: Logger
): Promise<void> {
  // Register commands
  const commands = {
    // !pnl-daily — Trigger daily report immediately
    'pnl-daily': async (channelId: string) => {
      try {
        await scheduler.triggerDailyReport();
        await discord.sendToChannel(channelId, '✅ Daily P&L report posted to #trust-debt-public');
      } catch (err) {
        await discord.sendToChannel(channelId, `❌ Failed to generate daily report: ${err}`);
      }
    },

    // !pnl-weekly — Trigger weekly report immediately
    'pnl-weekly': async (channelId: string) => {
      try {
        await scheduler.triggerWeeklyReport();
        await discord.sendToChannel(channelId, '✅ Weekly P&L report posted to #trust-debt-public');
      } catch (err) {
        await discord.sendToChannel(channelId, `❌ Failed to generate weekly report: ${err}`);
      }
    },

    // !pnl-stats — Show report statistics
    'pnl-stats': async (channelId: string) => {
      try {
        const stats = scheduler.getReportStats();
        const message = [
          '**P&L Report Statistics**',
          '',
          `📊 Total Daily Reports: ${stats.totalDailyReports}`,
          `📊 Total Weekly Reports: ${stats.totalWeeklyReports}`,
          `📅 Last Daily Report: ${stats.lastDailyReport || 'Never'}`,
          `📅 Last Weekly Report: ${stats.lastWeeklyReport || 'Never'}`,
          `❌ Failed Posts: ${stats.failedPosts}`,
        ].join('\n');
        await discord.sendToChannel(channelId, message);
      } catch (err) {
        await discord.sendToChannel(channelId, `❌ Failed to get stats: ${err}`);
      }
    },

    // !pnl-history — Show recent report history
    'pnl-history': async (channelId: string) => {
      try {
        const history = scheduler.getReportHistory(10);
        if (history.length === 0) {
          await discord.sendToChannel(channelId, 'No report history available');
          return;
        }

        const lines = ['**Recent P&L Reports**', ''];
        for (const entry of history.reverse()) {
          const status = entry.posted ? '✅' : '❌';
          const date = new Date(entry.timestamp).toISOString().split('T')[0];
          const time = new Date(entry.timestamp).toISOString().split('T')[1].split('.')[0];
          lines.push(`${status} ${date} ${time} — ${entry.reportType}`);
          if (entry.error) {
            lines.push(`   Error: ${entry.error}`);
          }
        }

        await discord.sendToChannel(channelId, lines.join('\n'));
      } catch (err) {
        await discord.sendToChannel(channelId, `❌ Failed to get history: ${err}`);
      }
    },
  };

  logger.info('Registered P&L report commands: !pnl-daily, !pnl-weekly, !pnl-stats, !pnl-history');
}

// ═══════════════════════════════════════════════════════════════
// Example 5: Health Monitoring
// ═══════════════════════════════════════════════════════════════

async function monitorSchedulerHealth(
  scheduler: CostReporterScheduler,
  discord: DiscordHelper,
  logger: Logger
): Promise<void> {
  // Check health every hour
  setInterval(async () => {
    const stats = scheduler.getReportStats();

    // Check for high failure rate
    const totalReports = stats.totalDailyReports + stats.totalWeeklyReports;
    if (totalReports > 0) {
      const failureRate = stats.failedPosts / totalReports;
      if (failureRate > 0.2) { // More than 20% failures
        logger.warn(
          `High P&L report failure rate: ${(failureRate * 100).toFixed(1)}% ` +
          `(${stats.failedPosts}/${totalReports})`
        );

        // Alert to monitoring channel
        const alertChannelId = await discord.findChannelByName('operator');
        if (alertChannelId) {
          await discord.sendToChannel(
            alertChannelId,
            `⚠️ High P&L report failure rate: ${(failureRate * 100).toFixed(1)}%`
          );
        }
      }
    }

    // Check for stale reports
    if (stats.lastDailyReport) {
      const lastReportDate = new Date(stats.lastDailyReport);
      const hoursSinceLastReport = (Date.now() - lastReportDate.getTime()) / 1000 / 60 / 60;

      if (hoursSinceLastReport > 36) {
        logger.error(
          `Daily P&L report has not posted in ${hoursSinceLastReport.toFixed(1)} hours`
        );

        // Alert to monitoring channel
        const alertChannelId = await discord.findChannelByName('operator');
        if (alertChannelId) {
          await discord.sendToChannel(
            alertChannelId,
            `🚨 Daily P&L report stale: no reports in ${hoursSinceLastReport.toFixed(1)} hours`
          );
        }
      }
    }
  }, 3600_000); // Check every hour
}

// ═══════════════════════════════════════════════════════════════
// Example 6: Integration with CEO Loop
// ═══════════════════════════════════════════════════════════════

interface CEOTask {
  id: string;
  description: string;
  execute: () => Promise<void>;
  schedule: string; // cron-style
}

async function addCEOLoopTasks(
  scheduler: CostReporterScheduler,
  logger: Logger
): Promise<CEOTask[]> {
  return [
    {
      id: 'daily-pnl-report',
      description: 'Post daily P&L to #trust-debt-public',
      schedule: '0 9 * * *', // Every day at 09:00 UTC
      execute: async () => {
        try {
          await scheduler.triggerDailyReport();
          logger.info('CEO Loop: Daily P&L report posted');
        } catch (err) {
          logger.error(`CEO Loop: Daily P&L report failed: ${err}`);
        }
      }
    },
    {
      id: 'weekly-pnl-report',
      description: 'Post weekly P&L to #trust-debt-public',
      schedule: '0 9 * * 1', // Every Monday at 09:00 UTC
      execute: async () => {
        try {
          await scheduler.triggerWeeklyReport();
          logger.info('CEO Loop: Weekly P&L report posted');
        } catch (err) {
          logger.error(`CEO Loop: Weekly P&L report failed: ${err}`);
        }
      }
    }
  ];
}

// ═══════════════════════════════════════════════════════════════
// Example 7: Testing Helper
// ═══════════════════════════════════════════════════════════════

async function testSchedulerInDevelopment(
  scheduler: CostReporterScheduler,
  costReporter: CostReporter,
  discord: DiscordHelper
): Promise<void> {
  console.log('=== Cost Reporter Scheduler Test ===\n');

  // Add test transactions
  console.log('1. Adding test transactions...');
  costReporter.trackInferenceCost('claude-opus-4-6', 100000, 50000);
  costReporter.trackInferenceCost('claude-sonnet-4-5', 200000, 100000);
  costReporter.trackInferenceCost('llama3:70b', 50000, 25000);
  costReporter.addRevenue('test-client', 150.00, 'Test payment');
  console.log('   ✓ Added 4 test transactions\n');

  // Test daily report
  console.log('2. Triggering daily report...');
  await scheduler.triggerDailyReport();
  console.log('   ✓ Daily report posted\n');

  // Test weekly report
  console.log('3. Triggering weekly report...');
  await scheduler.triggerWeeklyReport();
  console.log('   ✓ Weekly report posted\n');

  // Show statistics
  console.log('4. Report statistics:');
  const stats = scheduler.getReportStats();
  console.log(`   Daily reports: ${stats.totalDailyReports}`);
  console.log(`   Weekly reports: ${stats.totalWeeklyReports}`);
  console.log(`   Failed posts: ${stats.failedPosts}`);
  console.log(`   Last daily: ${stats.lastDailyReport}`);
  console.log(`   Last weekly: ${stats.lastWeeklyReport}\n`);

  // Show history
  console.log('5. Recent history:');
  const history = scheduler.getReportHistory(5);
  for (const entry of history) {
    const status = entry.posted ? '✅' : '❌';
    console.log(`   ${status} ${entry.timestamp} — ${entry.reportType}`);
  }

  console.log('\n=== Test Complete ===');
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

export {
  basicIntegration,
  customConfiguration,
  IntentGuardRuntimeWithReporting,
  addDiscordCommands,
  monitorSchedulerHealth,
  addCEOLoopTasks,
  testSchedulerInDevelopment
};
