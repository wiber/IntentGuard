/**
 * src/cron/scheduler.ts — Proactive Night Shift Scheduler
 *
 * The "Ghost User" that keeps the bot moving when the system is quiet.
 * Injects synthetic prompts into the SteeringLoop based on time, state, and sovereignty.
 *
 * ARCHITECTURE:
 *   Heartbeat (configurable interval) → Check state → Classify task → Inject or wait
 *
 * SAFE TASKS (auto-execute if sovereignty > 0.6):
 *   - Write unit tests for untested modules
 *   - Scan spec for stale/blocked items
 *   - Generate trust-debt reports
 *   - Check dead links in docs
 *   - Update room context summaries
 *   - Run FIM benchmark
 *   - Tweet heartbeat status
 *
 * DANGEROUS TASKS (requires admin blessing or sovereignty > 0.9):
 *   - Refactor core modules
 *   - Modify runtime configuration
 *   - Deploy / push to remote
 *   - Delete files
 *   - Modify auth/permission logic
 *
 * RISK GATING:
 *   Safe + sovereignty > 0.6     → tier='trusted' (auto-execute after countdown)
 *   Safe + sovereignty < 0.6     → tier='general' (suggestion, needs admin 👍)
 *   Dangerous + sovereignty > 0.9 → tier='trusted' (auto-execute after countdown)
 *   Dangerous + sovereignty < 0.9 → tier='general' (suggestion only)
 *
 * The SteeringLoop handles the actual execution/abort/redirect logic.
 * This module only decides WHAT to inject and WHEN.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { Logger } from '../types.js';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type TaskRisk = 'safe' | 'dangerous';

export interface ProactiveTask {
  id: string;
  description: string;
  prompt: string;
  risk: TaskRisk;
  room: string;
  /** Categories for ShortRank mapping */
  categories: string[];
  /** Minimum sovereignty score to auto-execute */
  minSovereignty: number;
  /** Cooldown: don't repeat this task within N minutes */
  cooldownMinutes: number;
  /** Check function: should this task run now? */
  shouldRun: (ctx: SchedulerContext) => boolean;
}

export interface SchedulerConfig {
  /** Heartbeat interval in milliseconds */
  heartbeatMs: number;
  /** Minimum idle time before proactive tasks trigger (ms) */
  minIdleMs: number;
  /** Maximum proactive tasks per hour */
  maxTasksPerHour: number;
  /** Enable/disable the scheduler */
  enabled: boolean;
}

export interface SchedulerContext {
  sovereignty: number;
  lastMessageTime: number;
  lastTaskTime: number;
  repoRoot: string;
  specTodoCount: number;
  runningTaskCount: number;
}

type InjectCallback = (
  tier: 'trusted' | 'general',
  room: string,
  prompt: string,
  categories: string[],
) => Promise<void>;

type SovereigntyGetter = () => number;
type IdleChecker = () => { idleMs: number; runningTasks: number };
type SpecScanner = () => number;

// ═══════════════════════════════════════════════════════════════
// Default Config
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  heartbeatMs: 15 * 60 * 1000,    // 15 minutes
  minIdleMs: 10 * 60 * 1000,      // 10 minutes idle before proactive
  maxTasksPerHour: 4,
  enabled: true,
};

// ═══════════════════════════════════════════════════════════════
// Proactive Task Registry
// ═══════════════════════════════════════════════════════════════

function buildTaskRegistry(repoRoot: string): ProactiveTask[] {
  return [
    // ─── SAFE: Test Coverage ────────────────────────────
    {
      id: 'test-coverage-scan',
      description: 'Scan for modules without test coverage',
      prompt: 'Proactive Protocol: Idle detected. Scanning src/ for modules without corresponding test files. Generate a test file for the first untested module found.',
      risk: 'safe',
      room: 'laboratory',
      categories: ['reliability', 'testing'],
      minSovereignty: 0.6,
      cooldownMinutes: 120,
      shouldRun: (ctx) => {
        // Check if there are src files without test files
        const srcDir = join(ctx.repoRoot, 'src');
        if (!existsSync(srcDir)) return false;
        const srcFiles = readdirSync(srcDir, { recursive: true })
          .filter(f => String(f).endsWith('.ts') && !String(f).includes('.test.'));
        const testDir = join(ctx.repoRoot, 'tests');
        const testFiles = existsSync(testDir) ? readdirSync(testDir, { recursive: true }).map(String) : [];
        return srcFiles.length > testFiles.length;
      },
    },

    // ─── SAFE: Trust-Debt Report ────────────────────────
    {
      id: 'trust-debt-report',
      description: 'Generate trust-debt summary report',
      prompt: 'Proactive Protocol: Generating trust-debt summary. Run the pipeline and post results to #trust-debt-public with sovereignty score and category breakdown.',
      risk: 'safe',
      room: 'vault',
      categories: ['transparency', 'reporting'],
      minSovereignty: 0.5,
      cooldownMinutes: 360, // Every 6 hours
      shouldRun: () => true, // Always relevant
    },

    // ─── SAFE: Spec Progress Check ──────────────────────
    {
      id: 'spec-progress',
      description: 'Check spec implementation progress and report',
      prompt: 'Proactive Protocol: Checking implementation spec progress. Count done vs todo items across all phases. Post progress summary to #trust-debt-public.',
      risk: 'safe',
      room: 'architect',
      categories: ['planning', 'transparency'],
      minSovereignty: 0.5,
      cooldownMinutes: 180,
      shouldRun: (ctx) => ctx.specTodoCount > 0,
    },

    // ─── SAFE: FIM Benchmark ────────────────────────────
    {
      id: 'fim-benchmark',
      description: 'Run FIM overlap benchmark to verify performance',
      prompt: 'Proactive Protocol: Running FIM geometric overlap benchmark. Execute tests/fim-benchmark.test.js and report latency results.',
      risk: 'safe',
      room: 'laboratory',
      categories: ['performance', 'security'],
      minSovereignty: 0.6,
      cooldownMinutes: 480, // Every 8 hours
      shouldRun: (ctx) => existsSync(join(ctx.repoRoot, 'tests', 'fim-benchmark.test.js')),
    },

    // ─── SAFE: Room Context Cleanup ─────────────────────
    {
      id: 'room-context-cleanup',
      description: 'Trim and summarize room context files',
      prompt: 'Proactive Protocol: Cleaning room context files. Trim files over 50 lines to last 25 lines. Post cleanup summary to #operator.',
      risk: 'safe',
      room: 'operator',
      categories: ['operations', 'maintenance'],
      minSovereignty: 0.5,
      cooldownMinutes: 240,
      shouldRun: (ctx) => {
        const ctxDir = join(ctx.repoRoot, 'data', 'room-context');
        if (!existsSync(ctxDir)) return false;
        return readdirSync(ctxDir).some(f => {
          const stat = statSync(join(ctxDir, f));
          return stat.size > 5000;
        });
      },
    },

    // ─── SAFE: Nightly Summary ──────────────────────────
    {
      id: 'nightly-summary',
      description: 'Generate nightly activity summary',
      prompt: 'Proactive Protocol: Generating nightly summary. Compile all completed tasks, tweets, and trust-debt changes from the last 24 hours. Post to #trust-debt-public and draft a tweet for #x-posts.',
      risk: 'safe',
      room: 'voice',
      categories: ['reporting', 'communication'],
      minSovereignty: 0.5,
      cooldownMinutes: 1440, // Once per day
      shouldRun: () => {
        const hour = new Date().getHours();
        return hour >= 0 && hour <= 2; // Only run between midnight and 2am
      },
    },

    // ─── SAFE: Grid Heartbeat ───────────────────────────
    {
      id: 'grid-heartbeat',
      description: 'Push heartbeat pointer to tesseract grid',
      prompt: 'Proactive Protocol: Pushing heartbeat pointer to tesseract grid cell C2 (Operations.Loop). System alive and monitoring.',
      risk: 'safe',
      room: 'operator',
      categories: ['operations', 'monitoring'],
      minSovereignty: 0.4,
      cooldownMinutes: 30,
      shouldRun: () => true,
    },

    // ─── DANGEROUS: Deep Refactor ───────────────────────
    {
      id: 'deep-refactor',
      description: 'Identify and refactor high-debt modules',
      prompt: 'Proactive Protocol: Deep scan initiated. Analyzing src/ for modules with high cyclomatic complexity or duplicated logic. Proposing refactor for the worst offender.',
      risk: 'dangerous',
      room: 'architect',
      categories: ['architecture', 'technical-debt'],
      minSovereignty: 0.9,
      cooldownMinutes: 720, // Every 12 hours
      shouldRun: (ctx) => ctx.sovereignty >= 0.85,
    },

    // ─── DANGEROUS: Spec Implementation ─────────────────
    {
      id: 'spec-implement',
      description: 'Implement the next spec todo item',
      prompt: 'Proactive Protocol: Sovereignty high. Implementing next spec todo item autonomously. Will write code, create files, and mark spec as done.',
      risk: 'dangerous',
      room: 'builder',
      categories: ['implementation', 'autonomy'],
      minSovereignty: 0.85,
      cooldownMinutes: 60,
      shouldRun: (ctx) => ctx.specTodoCount > 0 && ctx.sovereignty >= 0.8,
    },

    // ─── DANGEROUS: Config Changes ──────────────────────
    {
      id: 'config-optimize',
      description: 'Optimize runtime configuration based on performance data',
      prompt: 'Proactive Protocol: Analyzing runtime performance metrics. Proposing configuration adjustments for improved throughput.',
      risk: 'dangerous',
      room: 'operator',
      categories: ['operations', 'optimization'],
      minSovereignty: 0.95,
      cooldownMinutes: 1440,
      shouldRun: (ctx) => ctx.sovereignty >= 0.9,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// Scheduler Class
// ═══════════════════════════════════════════════════════════════

export class ProactiveScheduler {
  private log: Logger;
  private config: SchedulerConfig;
  private repoRoot: string;
  private tasks: ProactiveTask[];
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRunTimes: Map<string, number> = new Map();
  private tasksThisHour: number = 0;
  private hourStart: number = Date.now();

  // Callbacks — set by runtime
  private injectCallback: InjectCallback | null = null;
  private getSovereignty: SovereigntyGetter = () => 0.7;
  private checkIdle: IdleChecker = () => ({ idleMs: 0, runningTasks: 0 });
  private scanSpec: SpecScanner = () => 0;

  constructor(log: Logger, repoRoot: string, config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG) {
    this.log = log;
    this.config = config;
    this.repoRoot = repoRoot;
    this.tasks = buildTaskRegistry(repoRoot);
    this.log.info(`ProactiveScheduler initialized: ${this.tasks.length} tasks registered, heartbeat ${config.heartbeatMs / 1000}s`);
  }

  /**
   * Wire the scheduler to the runtime.
   */
  bind(
    inject: InjectCallback,
    getSovereignty: SovereigntyGetter,
    checkIdle: IdleChecker,
    scanSpec: SpecScanner,
  ): void {
    this.injectCallback = inject;
    this.getSovereignty = getSovereignty;
    this.checkIdle = checkIdle;
    this.scanSpec = scanSpec;
    this.log.info('ProactiveScheduler bound to runtime');
  }

  /**
   * Start the heartbeat loop.
   */
  start(): void {
    if (!this.config.enabled) {
      this.log.info('ProactiveScheduler disabled');
      return;
    }
    if (this.timer) return;

    this.log.info(`ProactiveScheduler started: heartbeat every ${this.config.heartbeatMs / 1000}s`);

    // Initial delay: wait one interval before first check
    this.timer = setInterval(() => this.heartbeat(), this.config.heartbeatMs);
  }

  /**
   * Stop the scheduler.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.log.info('ProactiveScheduler stopped');
    }
  }

  /**
   * The heartbeat — the core of Night Shift.
   */
  private async heartbeat(): Promise<void> {
    if (!this.injectCallback) return;

    // Reset hourly counter
    if (Date.now() - this.hourStart > 60 * 60 * 1000) {
      this.tasksThisHour = 0;
      this.hourStart = Date.now();
    }

    // Check rate limit
    if (this.tasksThisHour >= this.config.maxTasksPerHour) {
      this.log.debug('ProactiveScheduler: hourly limit reached, skipping');
      return;
    }

    // Check idle state
    const idle = this.checkIdle();
    if (idle.idleMs < this.config.minIdleMs) {
      this.log.debug(`ProactiveScheduler: not idle enough (${Math.round(idle.idleMs / 1000)}s < ${this.config.minIdleMs / 1000}s)`);
      return;
    }

    // Don't inject if tasks are already running
    if (idle.runningTasks > 0) {
      this.log.debug(`ProactiveScheduler: ${idle.runningTasks} tasks running, waiting`);
      return;
    }

    // Build context
    const sovereignty = this.getSovereignty();
    const specTodoCount = this.scanSpec();
    const ctx: SchedulerContext = {
      sovereignty,
      lastMessageTime: Date.now() - idle.idleMs,
      lastTaskTime: Date.now() - idle.idleMs,
      repoRoot: this.repoRoot,
      specTodoCount,
      runningTaskCount: idle.runningTasks,
    };

    // Find eligible tasks
    const eligible = this.tasks.filter(task => {
      // Check cooldown
      const lastRun = this.lastRunTimes.get(task.id) || 0;
      if (Date.now() - lastRun < task.cooldownMinutes * 60 * 1000) return false;

      // Check sovereignty threshold
      if (sovereignty < task.minSovereignty) return false;

      // Check task-specific condition
      return task.shouldRun(ctx);
    });

    if (eligible.length === 0) {
      this.log.debug('ProactiveScheduler: no eligible tasks');
      return;
    }

    // Pick the best task: prefer safe, then by lowest cooldown (most urgent)
    eligible.sort((a, b) => {
      if (a.risk !== b.risk) return a.risk === 'safe' ? -1 : 1;
      return a.cooldownMinutes - b.cooldownMinutes;
    });

    const task = eligible[0];

    // Determine tier based on risk + sovereignty
    let tier: 'trusted' | 'general';
    if (task.risk === 'safe' && sovereignty >= 0.6) {
      tier = 'trusted'; // Auto-execute after countdown
    } else if (task.risk === 'dangerous' && sovereignty >= 0.9) {
      tier = 'trusted'; // High sovereignty = trusted even for dangerous
    } else {
      tier = 'general'; // Needs admin blessing
    }

    this.log.info(
      `[NightShift] Injecting: "${task.description}" | risk=${task.risk} tier=${tier} ` +
      `sovereignty=${(sovereignty * 100).toFixed(0)}% room=${task.room}`
    );

    // Inject into the steering loop
    try {
      await this.injectCallback(tier, task.room, task.prompt, task.categories);
      this.lastRunTimes.set(task.id, Date.now());
      this.tasksThisHour++;
    } catch (error) {
      this.log.error(`[NightShift] Injection failed: ${error}`);
    }
  }

  /**
   * Get scheduler status for !ceo-status command.
   */
  getStatus(): {
    enabled: boolean;
    tasksThisHour: number;
    maxPerHour: number;
    registeredTasks: number;
    nextEligible: string | null;
  } {
    const sovereignty = this.getSovereignty();
    const specTodoCount = this.scanSpec();
    const ctx: SchedulerContext = {
      sovereignty,
      lastMessageTime: Date.now(),
      lastTaskTime: Date.now(),
      repoRoot: this.repoRoot,
      specTodoCount,
      runningTaskCount: 0,
    };

    const eligible = this.tasks.filter(task => {
      const lastRun = this.lastRunTimes.get(task.id) || 0;
      if (Date.now() - lastRun < task.cooldownMinutes * 60 * 1000) return false;
      if (sovereignty < task.minSovereignty) return false;
      return task.shouldRun(ctx);
    });

    return {
      enabled: this.config.enabled,
      tasksThisHour: this.tasksThisHour,
      maxPerHour: this.config.maxTasksPerHour,
      registeredTasks: this.tasks.length,
      nextEligible: eligible.length > 0 ? eligible[0].description : null,
    };
  }
}
