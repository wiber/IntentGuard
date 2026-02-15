/**
 * src/runtime-sovereignty-integration.ts — Sovereignty Monitor Integration
 *
 * Connects sovereignty monitor to runtime, artifact generator, and Discord.
 *
 * INTEGRATION:
 *   - Binds monitor to artifact generator
 *   - Binds monitor to Discord notifications
 *   - Wires scheduler task to daily stability check
 *   - Records sovereignty from pipeline step 4
 *
 * USAGE:
 *   Import and call initializeSovereigntyMonitor(runtime) during startup.
 */

import { SovereigntyMonitor, DEFAULT_MONITOR_CONFIG } from './auth/sovereignty-monitor.js';
import type { Logger } from './types.js';
import type { SovereigntyCalculation } from './auth/sovereignty.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ─── Integration Functions ──────────────────────────────────────────

/**
 * Initialize sovereignty monitor and bind to runtime.
 *
 * Call this during runtime startup to enable 30-day stability monitoring.
 *
 * @param log - Logger instance
 * @param artifactGenerator - Callback to generate artifact
 * @param discordNotify - Callback to send Discord message
 * @returns Configured SovereigntyMonitor instance
 */
export function initializeSovereigntyMonitor(
  log: Logger,
  artifactGenerator: (score: number, stableDays: number) => Promise<string>,
  discordNotify: (message: string) => Promise<void>,
): SovereigntyMonitor {
  const monitor = new SovereigntyMonitor(log, DEFAULT_MONITOR_CONFIG);

  // Bind artifact generation
  monitor.bindArtifactGenerator(artifactGenerator);

  // Bind Discord notifications
  monitor.bindNotification(discordNotify);

  log.info('[SovereigntyIntegration] Monitor initialized and bound');

  return monitor;
}

/**
 * Load latest sovereignty from pipeline and record to monitor.
 *
 * Call this after pipeline step 4 completes.
 *
 * @param monitor - SovereigntyMonitor instance
 * @param log - Logger instance
 */
export function recordSovereigntyFromPipeline(
  monitor: SovereigntyMonitor,
  log: Logger,
): void {
  const pipelinePath = join(process.cwd(), '4-grades-statistics.json');

  if (!existsSync(pipelinePath)) {
    log.warn('[SovereigntyIntegration] Pipeline step 4 output not found');
    return;
  }

  try {
    const content = readFileSync(pipelinePath, 'utf-8');
    const data = JSON.parse(content);

    // Extract sovereignty calculation
    const calculation: SovereigntyCalculation = {
      score: data.sovereignty_score || 0,
      grade: data.grade || 'D',
      gradeEmoji: data.grade_emoji || '🔴',
      trustDebtUnits: data.total_units || 0,
      driftEvents: 0, // TODO: Read from FIM deny log
      rawScore: data.sovereignty_score || 0,
      driftReduction: 0,
      categoryScores: {},
      timestamp: new Date().toISOString(),
    };

    monitor.recordFromPipeline(calculation);
    log.info(`[SovereigntyIntegration] Recorded from pipeline: σ=${calculation.score.toFixed(3)}`);
  } catch (error) {
    log.error(`[SovereigntyIntegration] Failed to read pipeline: ${error}`);
  }
}

/**
 * Scheduler task handler for daily stability check.
 *
 * Call this from the scheduler when sovereignty-stability-check task triggers.
 *
 * @param monitor - SovereigntyMonitor instance
 * @param log - Logger instance
 * @returns Stability analysis result message
 */
export async function handleStabilityCheck(
  monitor: SovereigntyMonitor,
  log: Logger,
): Promise<string> {
  log.info('[SovereigntyIntegration] Running daily stability check');

  try {
    // First, record current sovereignty from pipeline
    recordSovereigntyFromPipeline(monitor, log);

    // Then check for stability
    const analysis = await monitor.checkStability();

    // Build result message
    const lines = [
      '📊 **Sovereignty Stability Check**',
      '',
      analysis.message,
      '',
      `**Score:** ${analysis.currentScore.toFixed(3)}`,
      `**Stable Days:** ${analysis.stableDays}/${analysis.requiredDays}`,
      `**Trend:** ${analysis.trendDirection} (${(analysis.trendStrength * 100).toFixed(0)}%)`,
      `**Variance:** ${(analysis.scoreVariance * 100).toFixed(2)}%`,
    ];

    if (analysis.isStable) {
      lines.push('');
      lines.push('🎉 **30-day stability achieved! Artifact generated.**');
    }

    return lines.join('\n');
  } catch (error) {
    log.error(`[SovereigntyIntegration] Stability check failed: ${error}`);
    return `❌ **Stability check failed:** ${error}`;
  }
}

/**
 * Get sovereignty monitor status for dashboard/commands.
 *
 * @param monitor - SovereigntyMonitor instance
 * @returns Formatted status string
 */
export function getSovereigntyStatus(monitor: SovereigntyMonitor): string {
  const status = monitor.getStatus();

  const lines = [
    '📊 **Sovereignty Monitor Status**',
    '',
    `**Enabled:** ${status.enabled ? '✅' : '❌'}`,
    `**Check Interval:** Every ${status.checkIntervalHours} hours`,
    `**Latest Score:** ${status.latestScore?.toFixed(3) ?? 'N/A'}`,
    `**Stable Days:** ${status.stableDays}/${status.requiredDays}`,
    `**Status:** ${status.isStable ? '🟢 Stable' : '🟡 Monitoring'}`,
    `**Milestones:** ${status.milestones}`,
  ];

  if (status.lastMilestone) {
    const date = new Date(status.lastMilestone).toLocaleDateString();
    lines.push(`**Last Milestone:** ${date}`);
  }

  return lines.join('\n');
}

/**
 * Example integration with artifact generator.
 *
 * This shows how to wire the monitor to the artifact generation system.
 *
 * @param userId - User ID for artifact generation
 * @returns Path to generated artifact
 */
export async function generateStabilityArtifact(
  userId: string,
  score: number,
  stableDays: number,
): Promise<string> {
  // This would be implemented by calling the actual artifact generator
  // For now, return a placeholder path
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `${userId}-stability-${stableDays}d-${score.toFixed(3)}-${timestamp}.stl`;
  const artifactPath = join(process.cwd(), 'data', 'artifacts', filename);

  // TODO: Call actual artifact-generator.ts
  // const generator = new ArtifactGenerator();
  // await generator.initialize(ctx);
  // const identity = await loadIdentityFromPipeline(userId);
  // const result = await generator.execute({ action: 'generate', identity }, ctx);

  return artifactPath;
}

/**
 * Example integration with Discord notifications.
 *
 * This shows how to format and send stability milestone messages.
 *
 * @param message - Message to send
 * @returns Promise that resolves when sent
 */
export async function sendStabilityNotification(message: string): Promise<void> {
  // This would be implemented by calling the actual Discord client
  // For now, just log
  console.log('[SovereigntyIntegration] Discord notification:', message);

  // TODO: Call actual Discord API
  // await discordClient.channels.cache.get(trustDebtChannelId).send(message);
}
