/**
 * src/pipeline-auto-continue.js — Auto-Continue Pipeline with Critical Stop Detection
 *
 * Instead of stalling between agents, the pipeline continues automatically.
 * A lightweight validation check runs between agents to detect critical stops.
 * Non-critical issues are routed to Discord for async review — no CLI blocking.
 *
 * FLOW:
 *   Agent N completes → quickValidate(N) → critical? STOP : continue → notify Discord → Agent N+1
 *
 * DISCORD ROUTING:
 *   - Critical stops → #trust-debt-public (blocks pipeline, pings admin)
 *   - Warnings → #trust-debt-public (non-blocking, logged)
 *   - Progress → #trust-debt-public (agent completions, timing)
 *   - Questions → #trust-debt-public (agent critical questions, async)
 */

const fs = require('fs');
const path = require('path');

/**
 * Severity levels for inter-agent validation.
 * Only 'critical' halts the pipeline.
 */
const Severity = {
  OK: 'ok',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

/**
 * Quick validation between agents — runs fast, decides continue vs stop.
 * This replaces the old "stalling" behavior with a lightweight gate.
 */
function quickValidate(agentNum, projectDir, expectedOutputs) {
  const outputFile = expectedOutputs[agentNum];
  const outputPath = path.join(projectDir, outputFile);
  const issues = [];

  // 1. Output file must exist
  if (!fs.existsSync(outputPath)) {
    return {
      severity: Severity.CRITICAL,
      agent: agentNum,
      issues: [`Output file missing: ${outputFile}`],
      canContinue: false,
    };
  }

  const content = fs.readFileSync(outputPath, 'utf8');

  // 2. JSON must parse (for .json outputs)
  if (outputFile.endsWith('.json')) {
    try {
      const data = JSON.parse(content);

      // 3. Not empty
      const keyCount = Array.isArray(data) ? data.length : Object.keys(data).length;
      if (keyCount === 0) {
        issues.push({ msg: `${outputFile} is empty (0 keys/items)`, severity: Severity.CRITICAL });
      }

      // 4. Warn on suspiciously small output
      if (content.length < 50) {
        issues.push({ msg: `${outputFile} is very small (${content.length} bytes)`, severity: Severity.WARNING });
      }
    } catch (e) {
      return {
        severity: Severity.CRITICAL,
        agent: agentNum,
        issues: [`Invalid JSON in ${outputFile}: ${e.message}`],
        canContinue: false,
      };
    }
  }

  // 5. HTML report minimum viability
  if (outputFile.endsWith('.html')) {
    if (content.length < 100 || !content.includes('<html')) {
      return {
        severity: Severity.CRITICAL,
        agent: agentNum,
        issues: [`Invalid HTML in ${outputFile}`],
        canContinue: false,
      };
    }
  }

  // Aggregate: any critical issue stops the pipeline
  const hasCritical = issues.some(i => i.severity === Severity.CRITICAL);
  const warnings = issues.filter(i => i.severity === Severity.WARNING);

  return {
    severity: hasCritical ? Severity.CRITICAL : warnings.length > 0 ? Severity.WARNING : Severity.OK,
    agent: agentNum,
    issues: issues.map(i => i.msg),
    canContinue: !hasCritical,
  };
}

/**
 * Format a Discord message for pipeline events.
 */
function formatDiscordMessage(event) {
  switch (event.type) {
    case 'agent_complete':
      return `✅ **Agent ${event.agent}** completed (${event.durationMs}ms)\nOutput: \`${event.outputFile}\``;

    case 'auto_continue':
      return `⏩ Auto-continuing to **Agent ${event.nextAgent}**${event.warnings.length > 0 ? `\n⚠️ Warnings: ${event.warnings.join(', ')}` : ''}`;

    case 'critical_stop':
      return `🛑 **PIPELINE STOPPED** at Agent ${event.agent}\n**Critical issues:**\n${event.issues.map(i => `- ${i}`).join('\n')}\n\n@admin — pipeline requires manual intervention`;

    case 'question':
      return `❓ **Agent ${event.agent} asks:** ${event.question}\n_(non-blocking — pipeline continued)_`;

    case 'pipeline_complete':
      return `🏁 **Pipeline complete** (Agents ${event.startAgent}→${event.endAgent})\nTotal: ${event.totalMs}ms | Report: \`trust-debt-report.html\``;

    default:
      return `📋 Pipeline event: ${JSON.stringify(event)}`;
  }
}

/**
 * Discord notifier — posts pipeline events to #trust-debt-public.
 * Falls back to console logging if Discord is unavailable.
 */
class PipelineDiscordNotifier {
  constructor(options = {}) {
    this.channelId = options.channelId || null;
    this.postCallback = options.postCallback || null;
    this.log = options.log || console;
    this.queue = [];
    this.enabled = !!(this.channelId && this.postCallback);
  }

  async notify(event) {
    const message = formatDiscordMessage(event);

    if (this.enabled) {
      try {
        await this.postCallback(this.channelId, message);
      } catch (err) {
        this.log.warn(`Discord notify failed: ${err.message}`);
        this.log.info(`[Pipeline] ${message}`);
      }
    } else {
      // Fallback: log to console (non-blocking)
      this.log.info(`[Pipeline→Discord] ${message}`);
    }

    // Always queue for later retrieval
    this.queue.push({ ...event, message, timestamp: Date.now() });
  }

  getQueue() {
    return this.queue;
  }
}

/**
 * Auto-continue controller — wraps the agent execution loop.
 * Replaces the blocking sequential loop with continue-unless-critical flow.
 */
class AutoContinueController {
  constructor(options = {}) {
    this.projectDir = options.projectDir || process.cwd();
    this.expectedOutputs = options.expectedOutputs || {};
    this.notifier = options.notifier || new PipelineDiscordNotifier();
    this.onCriticalStop = options.onCriticalStop || null;
    this.results = [];
  }

  /**
   * Run the auto-continue gate between agents.
   * Returns true if pipeline should continue, false if critical stop.
   */
  async gate(agentNum, agentStartTime, criticalQuestion) {
    const durationMs = Date.now() - agentStartTime;

    // Quick validation — the only thing that can stop the pipeline
    const validation = quickValidate(agentNum, this.projectDir, this.expectedOutputs);
    this.results.push({ agent: agentNum, validation, durationMs });

    // Notify completion
    await this.notifier.notify({
      type: 'agent_complete',
      agent: agentNum,
      durationMs,
      outputFile: this.expectedOutputs[agentNum],
    });

    // Route critical question to Discord (non-blocking)
    if (criticalQuestion) {
      await this.notifier.notify({
        type: 'question',
        agent: agentNum,
        question: criticalQuestion,
      });
    }

    if (!validation.canContinue) {
      // Critical stop — notify Discord and halt
      await this.notifier.notify({
        type: 'critical_stop',
        agent: agentNum,
        issues: validation.issues,
      });

      if (this.onCriticalStop) {
        this.onCriticalStop(agentNum, validation);
      }
      return false;
    }

    // Auto-continue — notify and proceed
    if (agentNum < 7) {
      await this.notifier.notify({
        type: 'auto_continue',
        nextAgent: agentNum + 1,
        warnings: validation.issues,
      });
    }

    return true;
  }

  /**
   * Notify pipeline completion.
   */
  async complete(startAgent, endAgent, totalStartTime) {
    await this.notifier.notify({
      type: 'pipeline_complete',
      startAgent,
      endAgent,
      totalMs: Date.now() - totalStartTime,
    });
  }

  getResults() {
    return this.results;
  }
}

module.exports = {
  Severity,
  quickValidate,
  formatDiscordMessage,
  PipelineDiscordNotifier,
  AutoContinueController,
};
