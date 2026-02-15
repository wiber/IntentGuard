/**
 * 21-ceo-night-shift.tsx — CEO Loop & Night Shift Architecture
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: State machine for autonomous loop, task classification, auto-commit.
 * DEPENDS ON: 17-night-shift (proactive tasks), 16-openclaw-integration (wrapper)
 * EDITED BY: Architect or Operator agent
 */

export const SECTION_ID = '21-ceo-night-shift';
export const SECTION_TITLE = 'CEO Loop & Night Shift Architecture';

export const callout = 'The CEO Loop is the heartbeat of autonomous operation. It never stops. When there\'s work, it dispatches. When there\'s no work, it watches. At midnight, it summarizes. This is the "self-driving" in "full practical self-driving."';

export interface StateMachineState {
  name: string;
  badge: string;
  badgeClass: string;
  steps: string[];
  source: string;
  color: string;
}

export const stateMachineStates: StateMachineState[] = [
  {
    name: 'ACTIVE',
    badge: '15s cooldown',
    badgeClass: 'complete',
    color: 'var(--green)',
    steps: [
      'Read spec file → find actionable todos (non-future, not failed, not blocked)',
      'Score: urgency × impact × dependency-free',
      'If too vague → subdivide into 3-5 concrete subtasks',
      'Dispatch via Claude Flow agent pool (max 5 concurrent)',
      'On complete: mark done, auto-commit, tweet ShortRank',
      'On failure: skip, record, circuit breaker at 3 consecutive',
    ],
    source: '../intentguard/src/ceo-loop.ts:623-750',
  },
  {
    name: 'IDLE',
    badge: '60s scan',
    badgeClass: 'building',
    color: 'var(--yellow)',
    steps: [
      'All todos done → watch spec every 60s',
      'Heartbeat every 5min to Discord',
      'Ghost User (scheduler) injects synthetic tasks after 5min idle',
      'New todo appears → switch to ACTIVE',
    ],
    source: '../intentguard/src/cron/scheduler.ts',
  },
];

export const ceoLoopConfig = `{
  "cooldownSec": 15,           // Wait between task dispatches
  "idleScanIntervalSec": 60,   // Scan spec when idle
  "heartbeatIntervalSec": 300, // Post status every 5 min
  "maxConcurrent": 5,          // Max parallel Claude Flow agents
  "skipFuturePhases": true,    // Ignore future-dated todos
  "maxConsecutiveFailures": 3, // Circuit breaker
  "autoCommit": true,          // Auto git-commit on completion
  "nightlySummary": true       // Summary at midnight
}`;

export const ceoLoopConfigSource = '../intentguard/src/ceo-loop.ts:93-101';

export const safeTasks = [
  'Write unit tests for untested modules',
  'Scan spec for stale/blocked items',
  'Generate trust-debt reports',
  'Check dead links in docs',
  'Update room context summaries',
  'Run FIM benchmark',
  'Tweet heartbeat status',
];

export const dangerousTasks = [
  'Refactor core modules',
  'Modify runtime configuration',
  'Deploy / push to remote',
  'Delete files',
  'Modify auth/permission logic',
];

export const autoCommitProtocol = {
  when: 'CEO loop task completes successfully',
  how: 'git add -A && git commit -m "${message}\\n\\nCo-Authored-By: IntentGuard CEO Loop <ceo@intentguard.local>"',
  push: 'DANGEROUS — only with sovereignty > 0.9 or explicit admin blessing',
  audit: 'Session stats saved to data/ceo-session-stats.json, log to logs/ceo-loop.log',
  source: '../intentguard/src/ceo-loop.ts:589-617',
};
