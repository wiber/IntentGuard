/**
 * 08-implementation-plan.tsx — Phased Implementation Timeline
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Step-by-step migration phases with checklists.
 * DEPENDS ON: 02-migration-grid.tsx (module statuses)
 * EDITED BY: Architect or Operator agent
 *
 * REVISED per debate: Phase 0 is smaller. FIM auth builds standalone first.
 */

export const SECTION_ID = '08-implementation-plan';
export const SECTION_TITLE = 'Phased Implementation';

export type CheckStatus = 'done' | 'wip' | 'todo';

export interface CheckItem {
  text: string;
  status: CheckStatus;
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  future: boolean;
  checklist: CheckItem[];
}

export const phases: Phase[] = [
  {
    id: 'phase-0',
    name: 'Phase 0 — Foundation',
    description: 'OpenClaw + IntentGuard Wrapper (minimal)',
    future: false,
    checklist: [
      { text: 'Install openclaw@2026.2.13 as npm dependency', status: 'done' },
      { text: 'Verify Node 24.13.1 compatibility', status: 'done' },
      { text: 'Build migration spec HTML (this document)', status: 'done' },
      { text: 'Create modular TSX section files', status: 'done' },
      { text: 'Run openclaw onboard --install-daemon', status: 'done' },
      { text: 'Create intentguard/src/wrapper.ts (minimal parent process)', status: 'done' },
      { text: 'Build spec/render.tsx (compile sections to HTML)', status: 'done' },
      { text: 'Create intentguard.json config', status: 'done' },
      { text: 'Build scripts/bootstrap.sh', status: 'done' },
      { text: 'Test: OpenClaw starts as child process', status: 'done' },
    ],
  },
  {
    id: 'phase-1',
    name: 'Phase 1 — Discord + Rooms',
    description: 'Migrate Cognitive Rooms to OpenClaw Channels',
    future: false,
    checklist: [
      { text: 'Map 9 rooms to OpenClaw channel adapters', status: 'done' },
      { text: 'Port channel-manager.ts with #trust-debt-public', status: 'done' },
      { text: 'Port task-store.ts (JSONL persistence)', status: 'done' },
      { text: 'Port room context + handoff rules to IntentGuard config', status: 'done' },
      { text: 'Implement bot commands (!ping, !stop, !status, !tasks, !rooms, !handles, !trust)', status: 'done' },
      { text: 'Build authorized-handles.ts (thetaking, mortarcombat = instant-execute)', status: 'done' },
      { text: 'Build transparency-engine.ts (public trust-debt reporting)', status: 'done' },
      { text: 'Port voice-memo-reactor.ts', status: 'done' },
      { text: 'Port claude-flow-bridge.ts (headless dispatch)', status: 'done' },
      { text: 'Port thetasteer-categorize.ts (with IAMFIM trust mapping)', status: 'done' },
      { text: 'Port llm-controller.ts (Whisper + Ollama + Sonnet)', status: 'done' },
      { text: 'Build src/runtime.ts (main orchestrator)', status: 'done' },
      { text: 'Build src/types.ts (shared types)', status: 'done' },
      { text: 'Wire outbound email via thetadriven.com API', status: 'done' },
      { text: 'Build steering-loop.ts (Ask-and-Predict protocol)', status: 'done' },
      { text: 'Build tweet-composer.ts (280-char Discord updates)', status: 'done' },
      { text: 'Wire steering loop into runtime.ts', status: 'done' },
      { text: 'Add #tesseract-nu game channel', status: 'done' },
      { text: 'Sovereignty-based countdown (5s/30s/60s)', status: 'done' },
      { text: 'Admin thumbs-up blessing for non-admin suggestions', status: 'done' },
      { text: 'Port trust-debt pipeline steps 0-7', status: 'done' },
      { text: 'Pipeline runner with FIM identity update', status: 'done' },
      { text: 'Bot commands: !predictions, !abort, !tweet, !sovereignty, !pipeline', status: 'done' },
      { text: 'Tweet cross-post reactions (🐦 → Twitter, 🔄 → #tesseract-nu)', status: 'done' },
      { text: 'Test bidirectional Discord ↔ terminal pipe', status: 'done' },
      { text: 'Fill .env and test full Discord round-trip', status: 'done' },
    ],
  },
  {
    id: 'phase-2',
    name: 'Phase 2 — FIM Auth (Standalone First)',
    description: 'Build geometric permission module with tests BEFORE integrating',
    future: false,
    checklist: [
      { text: 'Define vector space (20 trust-debt categories as dimensions)', status: 'done' },
      { text: 'Implement computeOverlap() with concrete math', status: 'done' },
      { text: 'Write unit tests: allowed/denied scenarios with real numbers', status: 'done' },
      { text: 'Benchmark: latency of overlap computation', status: 'done' },
      { text: 'Build MCP proxy interceptor (OpenClaw plugin hook)', status: 'done' },
      { text: 'Define action coordinate map (tool → required scores)', status: 'done' },
      { text: 'Integration test: proxy intercepts tool call, checks FIM, forwards', status: 'done' },
    ],
  },
  {
    id: 'phase-3',
    name: 'Phase 3 — Multi-Channel + X Publishing',
    description: 'Expand beyond Discord, browser-based X/Twitter posting',
    future: false,
    checklist: [
      { text: 'Add #x-posts Discord channel for tweet staging', status: 'done' },
      { text: 'Build x-poster.ts (Claude Flow browser automation → X/Twitter)', status: 'done' },
      { text: 'Wire thumbs-up reaction on #x-posts to browser publish to X', status: 'done' },
      { text: 'Forward all tweet-composer output to #x-posts as drafts', status: 'done' },
      { text: 'Build always-running CEO loop with infinite watch mode', status: 'todo' },
      { text: 'Add Claude Flow agent pool (50 concurrent) for task subdivision', status: 'todo' },
      { text: 'Wire CEO loop idle mode: scan spec every 60s for new todos', status: 'todo' },
      { text: 'Auto-commit completed work from CEO loop', status: 'todo' },
      { text: 'Discord status heartbeat every 5 minutes when idle', status: 'todo' },
      { text: 'Enable WhatsApp channel adapter', status: 'todo' },
      { text: 'Enable Telegram channel adapter', status: 'todo' },
      { text: 'Test cross-channel room routing', status: 'todo' },
      { text: 'Deploy as always-on daemon on Mac Mini', status: 'done' },
    ],
  },
  {
    id: 'phase-4',
    name: 'Phase 4 — Tesseract Grid Integration (Reality Bridge)',
    description: 'Map real company state to 12-cell tesseract grid — the Ops-Board',
    future: false,
    checklist: [
      { text: 'Create tesseract-client.ts HTTP client for tesseract.nu API', status: 'todo' },
      { text: 'Map 12 grid cells to real company metrics (server load, deal flow, legal)', status: 'todo' },
      { text: 'Build grid-state-reader.ts: fetch current cell pressures from tesseract.nu', status: 'todo' },
      { text: 'Build grid-state-writer.ts: push pointer events from bot actions', status: 'todo' },
      { text: 'Wire task completions to POINTER_CREATE events on grid', status: 'todo' },
      { text: 'Grid state to room routing: hot cells prioritize dispatches', status: 'todo' },
      { text: 'Deep-link generation from bot conversations to grid cells', status: 'todo' },
      { text: 'Add #ops-board Discord channel showing live grid heatmap', status: 'todo' },
      { text: 'Build ASCII grid renderer for Discord (12-cell with heat colors)', status: 'todo' },
      { text: 'Add !grid command showing current tesseract state', status: 'todo' },
    ],
  },
  {
    id: 'phase-5',
    name: 'Phase 5 — Open Playground',
    description: 'Public IAMFIM implementation playground',
    future: true,
    checklist: [
      { text: 'Open-source the FIM auth layer', status: 'todo' },
      { text: 'Publish IntentGuard as npm package', status: 'todo' },
      { text: 'Host tesseract.nu playground through bot', status: 'todo' },
    ],
  },
  {
    id: 'phase-6',
    name: 'Phase 6 — Economic Sovereignty (Wallet Skill)',
    description: 'Give the Headless CEO its own P&L — from Trust to Solvency',
    future: false,
    checklist: [
      { text: 'Create src/skills/wallet.ts skeleton with balance tracking', status: 'todo' },
      { text: 'Define wallet schema: income sources, expense categories, limits', status: 'todo' },
      { text: 'Wire FIM sovereignty score to spending limits (high trust = high limit)', status: 'todo' },
      { text: 'Track inference costs per task (Ollama electricity estimate, API credits)', status: 'todo' },
      { text: 'Build cost reporter: daily/weekly P&L to #trust-debt-public', status: 'todo' },
      { text: 'Create wallet-ledger.ts: JSONL append-only transaction log', status: 'todo' },
      { text: 'Add !wallet command showing balance, income, expenses', status: 'todo' },
      { text: 'Wire ShortRank A3 Strategy.Fund cell to wallet events', status: 'todo' },
      { text: 'Budget alerts when spending exceeds sovereignty-adjusted threshold', status: 'todo' },
      { text: 'Build revenue intake stub: placeholder for future crypto/service income', status: 'todo' },
    ],
  },
  {
    id: 'phase-7',
    name: 'Phase 7 — Physical Manifestation (Artifact Skill)',
    description: 'Make Trust tangible — sovereign geometry to 3D artifacts',
    future: false,
    checklist: [
      { text: 'Create src/skills/artifact-generator.ts skeleton', status: 'todo' },
      { text: 'Map 20-dim identity vector to geometric mesh parameters', status: 'todo' },
      { text: 'Build sovereignty-to-geometry converter (high trust = smooth, low = jagged)', status: 'todo' },
      { text: 'Generate .stl file from current geometric state', status: 'todo' },
      { text: 'Wire sovereignty score monitoring: trigger artifact on 30-day stability', status: 'todo' },
      { text: 'Post artifact preview (ASCII art) to #trust-debt-public on generation', status: 'todo' },
      { text: 'Add !artifact command to manually generate current-state STL', status: 'todo' },
      { text: 'Wire ShortRank C3 Operations.Flow cell to artifact generation events', status: 'todo' },
      { text: 'Store artifact history in data/artifacts/ with timestamped filenames', status: 'todo' },
      { text: 'Build artifact comparison: diff two geometric states visually', status: 'todo' },
    ],
  },
  {
    id: 'phase-8',
    name: 'Phase 8 — Fractal Federation (Handshake Protocol)',
    description: 'Bot-to-bot trust via tensor overlap — Web of Trust from math',
    future: false,
    checklist: [
      { text: 'Define handshake protocol spec: identity vector exchange format', status: 'todo' },
      { text: 'Build src/federation/handshake.ts: swap identity fractals between bots', status: 'todo' },
      { text: 'Implement tensor overlap calculation between two distinct geometries', status: 'todo' },
      { text: 'Define trust threshold (0.8 overlap = open channel, below = reject)', status: 'todo' },
      { text: 'Build secure channel opener: encrypted pipe between compatible bots', status: 'todo' },
      { text: 'Create federation registry: known bots with last-seen geometry hashes', status: 'todo' },
      { text: 'Wire drift detection to auto-quarantine: geometry no longer fits network', status: 'todo' },
      { text: 'Add !federation command showing known bots and overlap scores', status: 'todo' },
      { text: 'Build federation heartbeat: periodic geometry sync with peers', status: 'todo' },
      { text: 'Wire ShortRank B2 Tactics.Deal cell to federation handshake events', status: 'todo' },
    ],
  },
  {
    id: 'phase-9',
    name: 'Phase 9 — Autonomous Night Operations',
    description: 'Always-on proactive CEO that makes progress while you sleep',
    future: false,
    checklist: [
      { text: 'Rewrite CEO loop for infinite operation with idle watch mode', status: 'todo' },
      { text: 'Build task auto-subdivider: break vague todos into 3-5 concrete subtasks', status: 'todo' },
      { text: 'Wire Claude Flow agent pool for parallel task execution', status: 'todo' },
      { text: 'Build progress tracker: completed/total/blocked counts per phase', status: 'todo' },
      { text: 'Implement priority scoring: urgency x impact x dependency-free', status: 'todo' },
      { text: 'Add git auto-commit after each completed task batch', status: 'todo' },
      { text: 'Build nightly summary tweet: what was accomplished while you slept', status: 'todo' },
      { text: 'Wire CEO loop to spec watcher: inotify/fswatch for spec changes', status: 'todo' },
      { text: 'Add circuit breaker: stop after 3 consecutive failures', status: 'todo' },
      { text: 'Build !ceo-status command showing loop state, queue depth, completion rate', status: 'todo' },
    ],
  },
];
