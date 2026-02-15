/**
 * 17-night-shift.tsx — Ghost User & Proactive Scheduler
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Documents the Night Shift system that makes the bot proactive.
 * DEPENDS ON: 15-autonomous-steering.tsx (steering loop injection target)
 * EDITED BY: Operator agent
 *
 * KEY FILE: src/cron/scheduler.ts
 *
 * CONCEPT: The "Ghost User" — a synthetic Discord user that sends prompts
 * into the SteeringLoop when the system is idle. This transforms the bot
 * from reactive (waits for messages) to proactive (works while you sleep).
 */

export const SECTION_ID = '17-night-shift';
export const SECTION_TITLE = 'Night Shift — The Ghost User';

// ─────────────────────────────────────────────────
// 1. Proactive Task Registry
// ─────────────────────────────────────────────────

export type RiskLevel = 'safe' | 'dangerous';

export interface ProactiveTask {
  id: string;
  name: string;
  risk: RiskLevel;
  cooldown: string;
  description: string;
  categories: string[];
}

export const proactiveTasks: ProactiveTask[] = [
  {
    id: 'test-coverage-scan',
    name: 'Test Coverage Scan',
    risk: 'safe',
    cooldown: '4h',
    description: 'Scan for untested functions and generate test stubs',
    categories: ['testing', 'code_quality'],
  },
  {
    id: 'trust-debt-report',
    name: 'Trust-Debt Report',
    risk: 'safe',
    cooldown: '6h',
    description: 'Generate trust-debt summary and post to #trust-debt-public',
    categories: ['transparency', 'process_adherence'],
  },
  {
    id: 'spec-progress',
    name: 'Spec Progress Check',
    risk: 'safe',
    cooldown: '2h',
    description: 'Count done/wip/todo across all spec phases, post status update',
    categories: ['planning', 'transparency'],
  },
  {
    id: 'fim-benchmark',
    name: 'FIM Benchmark',
    risk: 'safe',
    cooldown: '12h',
    description: 'Re-run FIM overlap benchmarks, report if latency drifted',
    categories: ['performance', 'security'],
  },
  {
    id: 'room-context-cleanup',
    name: 'Room Context Cleanup',
    risk: 'safe',
    cooldown: '8h',
    description: 'Prune stale context from cognitive room state files',
    categories: ['operations', 'reliability'],
  },
  {
    id: 'nightly-summary',
    name: 'Nightly Summary',
    risk: 'safe',
    cooldown: '24h',
    description: 'Compile what was accomplished today, tweet + Discord post',
    categories: ['communication', 'transparency'],
  },
  {
    id: 'grid-heartbeat',
    name: 'Grid Heartbeat',
    risk: 'safe',
    cooldown: '30m',
    description: 'Read current tesseract grid state, post to #ops-board if changed',
    categories: ['operations'],
  },
  {
    id: 'deep-refactor',
    name: 'Deep Refactor',
    risk: 'dangerous',
    cooldown: '24h',
    description: 'Identify code smell patterns and propose refactoring plan',
    categories: ['architecture', 'code_quality'],
  },
  {
    id: 'spec-implement',
    name: 'Spec Implementation',
    risk: 'dangerous',
    cooldown: '2h',
    description: 'Pick next todo from spec and implement it (like CEO loop)',
    categories: ['planning', 'architecture'],
  },
  {
    id: 'config-optimize',
    name: 'Config Optimization',
    risk: 'dangerous',
    cooldown: '12h',
    description: 'Analyze runtime performance and suggest config changes',
    categories: ['performance', 'operations'],
  },
];

// ─────────────────────────────────────────────────
// 2. Risk Gating Rules
// ─────────────────────────────────────────────────

export interface GatingRule {
  risk: RiskLevel;
  sovereigntyThreshold: number;
  tier: 'trusted' | 'general';
  description: string;
}

export const gatingRules: GatingRule[] = [
  {
    risk: 'safe',
    sovereigntyThreshold: 0.6,
    tier: 'trusted',
    description: 'Safe task + sovereignty > 0.6 = auto-execute via trusted tier (5s countdown)',
  },
  {
    risk: 'safe',
    sovereigntyThreshold: 0.0,
    tier: 'general',
    description: 'Safe task + sovereignty < 0.6 = needs admin thumbs-up (60s countdown)',
  },
  {
    risk: 'dangerous',
    sovereigntyThreshold: 0.9,
    tier: 'trusted',
    description: 'Dangerous task + sovereignty > 0.9 = auto-execute (rare — requires very high trust)',
  },
  {
    risk: 'dangerous',
    sovereigntyThreshold: 0.0,
    tier: 'general',
    description: 'Dangerous task + sovereignty < 0.9 = needs admin thumbs-up (30s+ countdown)',
  },
];

// ─────────────────────────────────────────────────
// 3. Scheduler Configuration
// ─────────────────────────────────────────────────

export const schedulerConfig = {
  heartbeatInterval: '15 minutes',
  maxTasksPerHour: 4,
  idleThreshold: '5 minutes since last human message',
  injectionTarget: 'SteeringLoop.handleMessage() as synthetic user "NightShift"',
  defaultRoom: '#strategy-room',
};

// ─────────────────────────────────────────────────
// 4. CEO Loop v2 (Companion System)
// ─────────────────────────────────────────────────

export interface CeoLoopFeature {
  name: string;
  description: string;
  status: 'done' | 'wip' | 'todo';
}

export const ceoLoopFeatures: CeoLoopFeature[] = [
  { name: 'Infinite operation', description: 'Never stops — watches for new todos after completing all', status: 'done' },
  { name: 'Priority scoring', description: 'urgency x impact x dependency-free ranking', status: 'done' },
  { name: 'Auto-subdivide', description: 'Breaks vague todos into 3-5 concrete subtasks', status: 'done' },
  { name: 'Circuit breaker', description: '3 consecutive failures → 5min cooldown → reset', status: 'done' },
  { name: 'Auto-commit', description: 'git add + commit every 3 completed tasks', status: 'done' },
  { name: 'Nightly summary tweet', description: 'Compiles completed work at midnight, posts to #x-posts', status: 'done' },
  { name: 'Heartbeat', description: 'Status message to Discord every 5 minutes when idle', status: 'done' },
  { name: 'Spec watcher', description: 'Scans spec TSX files for new todo items on each cycle', status: 'done' },
  { name: 'Claude Flow agent pool', description: '50 concurrent agents for parallel task execution', status: 'todo' },
  { name: 'Progress tracker', description: 'completed/total/blocked counts per phase', status: 'todo' },
];
