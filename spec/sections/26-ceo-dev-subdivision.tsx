/**
 * 26-ceo-dev-subdivision.tsx — CEO / Dev Subdivision — Dual-Sonnet Architecture
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Two Sonnet instances coordinating via proposals queue.
 * DEPENDS ON: 25-openclaw-npm-integration (proxy layer)
 * EDITED BY: Architect agent
 *
 * Added: 2026-02-15
 */

export const SECTION_ID = '26-ceo-dev-subdivision';
export const SECTION_TITLE = 'CEO / Dev Subdivision — Dual-Sonnet Architecture';

export const callout = 'Two Sonnet instances running simultaneously at $0/token. The always-on OpenClaw CEO thinks proactively about the spec and codebase. The terminal-based Claude Flow Dev executes changes. They coordinate via a proposals queue — CEO writes proposals, Dev implements them. No file conflicts. Maximum velocity.';

export const whyThisWorks = 'With claude-max-api-proxy, every Sonnet token is free (Max subscription flat rate). The bottleneck is no longer cost — it\'s utilization. Right now, Sonnet only runs when someone sends a Discord message. The rest of the time, those tokens sit unused. Cron-driven isolated sessions turn idle time into proactive analysis.';

export interface RoleDefinition {
  name: string;
  title: string;
  subtitle: string;
  properties: Array<{ label: string; value: string }>;
}

export const roles: RoleDefinition[] = [
  {
    name: 'CEO',
    title: 'CEO (OpenClaw, Always-On)',
    subtitle: 'Proactive Thinker — Reads, Analyzes, Proposes',
    properties: [
      { label: 'Trigger', value: 'Cron schedule (every 2-6 hours) + Discord events' },
      { label: 'Mode', value: 'Isolated agent turns — full Sonnet with tool access' },
      { label: 'Writes to', value: '~/.openclaw/workspace/proposals/ (staging area)' },
      { label: 'Reads from', value: 'Spec, source code, logs, git history, proposals archive' },
      { label: 'Git access', value: 'READ ONLY — never commits directly' },
      { label: 'Reports to', value: 'Discord #architect channel' },
    ],
  },
  {
    name: 'DEV',
    title: 'DEV (Claude Flow, Terminal)',
    subtitle: 'Active Builder — Codes, Tests, Commits',
    properties: [
      { label: 'Trigger', value: 'Human-initiated sessions, proposal queue' },
      { label: 'Mode', value: 'Interactive coding with multi-agent swarms' },
      { label: 'Writes to', value: 'Source code, tests, configs, git commits' },
      { label: 'Reads from', value: 'Everything + proposals queue from CEO' },
      { label: 'Git access', value: 'READ + WRITE — full commit/push authority' },
      { label: 'Reports to', value: 'Terminal + Discord #builder channel' },
    ],
  },
];

export interface BoundaryRow {
  resource: string;
  ceo: string;
  ceoAccess: 'READ' | 'WRITE';
  dev: string;
  devAccess: 'READ' | 'WRITE';
}

export const boundaries: BoundaryRow[] = [
  { resource: 'Migration spec HTML', ceo: 'READ + propose edits', ceoAccess: 'READ', dev: 'WRITE (implements proposals)', devAccess: 'WRITE' },
  { resource: 'Source code (src/)', ceo: 'READ + analyze', ceoAccess: 'READ', dev: 'WRITE (implements changes)', devAccess: 'WRITE' },
  { resource: 'Proposals directory', ceo: 'WRITE (creates proposals)', ceoAccess: 'WRITE', dev: 'READ (picks up, marks done)', devAccess: 'READ' },
  { resource: 'Git repo', ceo: 'READ (log, diff, blame)', ceoAccess: 'READ', dev: 'WRITE (commit, branch, push)', devAccess: 'WRITE' },
  { resource: 'OpenClaw workspace', ceo: 'WRITE (workspace files)', ceoAccess: 'WRITE', dev: 'READ (context)', devAccess: 'READ' },
  { resource: 'Discord', ceo: 'WRITE (analysis reports)', ceoAccess: 'WRITE', dev: 'READ (notifications)', devAccess: 'READ' },
  { resource: 'Trust Debt pipeline', ceo: 'READ (trigger analysis)', ceoAccess: 'READ', dev: 'WRITE (run agents 0-7)', devAccess: 'WRITE' },
];

export interface CronJob {
  name: string;
  schedule: string;
  description: string;
  config: string;
}

export const cronJobs: CronJob[] = [
  {
    name: 'Spec Drift Detector',
    schedule: 'Every 4h',
    description: 'Reads intentguard-migration-spec.html and compares against actual source files. Identifies sections that are out of date, features claimed as "live" that aren\'t implemented, and TODOs that have been completed but not updated. Writes drift report to proposals/.',
    config: `{
  "name": "spec-drift-detector",
  "schedule": { "kind": "cron", "expr": "0 */4 * * *" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Read /Users/thetadriven/github/IntentGuard/intentguard-migration-spec.html. Compare each claimed status (live/building/planned) against the actual files in the repo. Write a drift report to ~/.openclaw/workspace/proposals/spec-drift-YYYY-MM-DD.md listing: (1) claims that are now stale, (2) features that are live but still marked building, (3) sections that need updating. Be specific with file:line references.",
    "thinking": "high",
    "timeoutSeconds": 300
  },
  "delivery": { "mode": "announce", "channel": "discord" }
}`,
  },
  {
    name: 'Code Review Scout',
    schedule: 'Every 6h',
    description: 'Analyzes recent git commits for code quality issues, security concerns, missing tests, and architectural drift. Writes review findings as proposals for the Dev to act on.',
    config: `{
  "name": "code-review-scout",
  "schedule": { "kind": "cron", "expr": "0 */6 * * *" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Run git log --oneline -20 in /Users/thetadriven/github/IntentGuard to see recent commits. For each commit, review the diff for: security issues (OWASP top 10), missing error handling, code that contradicts the spec, and opportunities for improvement. Write findings to ~/.openclaw/workspace/proposals/code-review-YYYY-MM-DD.md with specific file:line references and suggested fixes.",
    "thinking": "medium",
    "timeoutSeconds": 300
  },
  "delivery": { "mode": "announce", "channel": "discord" }
}`,
  },
  {
    name: 'Task Planner',
    schedule: 'Every 8h',
    description: 'Reads the spec\'s "next steps" sections, open GitHub issues, and proposal backlog. Prioritizes and writes a task list for the Dev\'s next session. Considers dependencies and optimal execution order.',
    config: `{
  "name": "task-planner",
  "schedule": { "kind": "cron", "expr": "0 6,14,22 * * *" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Read the migration spec at /Users/thetadriven/github/IntentGuard/intentguard-migration-spec.html. Read all files in ~/.openclaw/workspace/proposals/. Read the overnight progress report at ~/.openclaw/workspace/overnight-progress.md. Synthesize a prioritized task list for the next development session. Consider: what's blocking, what's highest impact, and what has dependencies. Write to ~/.openclaw/workspace/proposals/task-plan-YYYY-MM-DD.md.",
    "thinking": "high",
    "timeoutSeconds": 300
  },
  "delivery": { "mode": "announce", "channel": "discord" }
}`,
  },
  {
    name: 'Trust Debt Monitor',
    schedule: 'Daily 3AM',
    description: 'Runs a lightweight Trust Debt analysis — checks sovereignty scores, alignment metrics, and drift indicators. Reports anomalies. The full 8-agent pipeline remains a Dev task.',
    config: `{
  "name": "trust-debt-monitor",
  "schedule": { "kind": "cron", "expr": "0 3 * * *" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Read the Trust Debt pipeline configuration in /Users/thetadriven/github/IntentGuard/trust-debt-pipeline-coms.txt. Check the most recent pipeline output files (0-outcome-requirements.json through 6-analysis-narratives.json). Assess: are scores drifting? Are any categories showing degradation? Write a brief trust debt status report to ~/.openclaw/workspace/proposals/trust-debt-status-YYYY-MM-DD.md.",
    "thinking": "medium",
    "timeoutSeconds": 300
  },
  "delivery": { "mode": "announce", "channel": "discord" }
}`,
  },
];

export interface ProposalStep {
  step: number;
  title: string;
  detail: string;
}

export const proposalProtocol: ProposalStep[] = [
  { step: 1, title: 'CEO writes proposal', detail: 'Cron job runs → Sonnet analyzes → writes to ~/.openclaw/workspace/proposals/<type>-YYYY-MM-DD.md with YAML frontmatter: status (pending/accepted/rejected), priority (1-5), category, estimated effort.' },
  { step: 2, title: 'CEO announces to Discord', detail: 'Delivery mode "announce" posts a summary to #architect channel. Elias sees it in Discord, can react or respond.' },
  { step: 3, title: 'Dev picks up proposal', detail: 'Next Claude Flow session reads proposals/ directory. Pending proposals become the task backlog. Dev marks status as "accepted" and implements.' },
  { step: 4, title: 'Dev marks complete', detail: 'After implementation, Dev updates proposal YAML frontmatter to status: completed with implementation notes. CEO\'s next run sees the updated status.' },
];

export interface VelocityRow {
  without: string;
  withCeo: string;
  gain: string;
}

export const velocityAnalysis: VelocityRow[] = [
  { without: 'Dev discovers spec drift during coding', withCeo: 'CEO already identified drift 4h ago', gain: 'No context switching' },
  { without: 'Dev manually reviews recent commits', withCeo: 'CEO reviewed overnight, flagged issues', gain: 'Dev starts with known issues' },
  { without: 'Dev decides task priority ad-hoc', withCeo: 'CEO prepared prioritized task plan', gain: 'Instant session start' },
  { without: 'Security issues found in production', withCeo: 'CEO caught in code review scout', gain: 'Shift-left detection' },
  { without: 'Spec gets stale over days', withCeo: 'CEO proposes updates every 4h', gain: 'Living documentation' },
  { without: 'Trust Debt checked manually', withCeo: 'CEO monitors daily at 3AM', gain: 'Continuous governance' },
];

export const velocityEstimate = 'Estimated velocity increase: 2-3x — Dev sessions start pre-loaded with analysis, task plans, and known issues. No ramp-up time. No wasted cycles discovering what CEO already found. Both Sonnet instances cost $0.';

export const activationCommands = `# Create proposals directory
mkdir -p ~/.openclaw/workspace/proposals

# Add the 4 cron jobs
npx openclaw cron add --name "spec-drift-detector" \\
  --cron "0 */4 * * *" --session isolated \\
  --message "Read the migration spec at /Users/thetadriven/github/IntentGuard/intentguard-migration-spec.html. Compare each status against actual files. Write drift report to ~/.openclaw/workspace/proposals/spec-drift-$(date +%Y-%m-%d).md" \\
  --thinking high --announce --channel discord

npx openclaw cron add --name "code-review-scout" \\
  --cron "0 */6 * * *" --session isolated \\
  --message "Review recent git commits in IntentGuard for security, quality, and spec alignment. Write to ~/.openclaw/workspace/proposals/code-review-$(date +%Y-%m-%d).md" \\
  --thinking medium --announce --channel discord

npx openclaw cron add --name "task-planner" \\
  --cron "0 6,14,22 * * *" --session isolated \\
  --message "Read spec, proposals, and progress report. Write prioritized task plan to ~/.openclaw/workspace/proposals/task-plan-$(date +%Y-%m-%d).md" \\
  --thinking high --announce --channel discord

npx openclaw cron add --name "trust-debt-monitor" \\
  --cron "0 3 * * *" --session isolated \\
  --message "Check Trust Debt pipeline outputs for drift. Write status to ~/.openclaw/workspace/proposals/trust-debt-status-$(date +%Y-%m-%d).md" \\
  --thinking medium --announce --channel discord

# Verify
npx openclaw cron list`;

export const safetyGuardrails = [
  { label: 'No git writes', detail: 'CEO never commits, pushes, or modifies tracked files. Proposals directory is gitignored.' },
  { label: 'No external actions', detail: 'CEO reads and proposes only. No Discord DMs, no external API calls, no file modifications outside proposals/.' },
  { label: 'Timeout', detail: 'Each isolated session has a 300s timeout. If Sonnet spirals, it gets killed.' },
  { label: 'Backoff', detail: 'Consecutive errors trigger exponential backoff (30s → 1m → 5m → 15m → 60m). Auto-recovers on next success.' },
  { label: 'Concurrency', detail: 'maxConcurrentRuns: 1 — only one cron job runs at a time. No resource contention.' },
];
