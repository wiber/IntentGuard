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
    name: 'Phase 3 — Multi-Channel',
    description: 'Expand beyond Discord',
    future: true,
    checklist: [
      { text: 'Enable WhatsApp channel adapter', status: 'todo' },
      { text: 'Enable Telegram channel adapter', status: 'todo' },
      { text: 'Test cross-channel room routing', status: 'todo' },
      { text: 'Deploy as always-on daemon on Mac Mini', status: 'done' },
    ],
  },
  {
    id: 'phase-4',
    name: 'Phase 4 — Tesseract Integration',
    description: 'Connect grid state to bot intelligence',
    future: true,
    checklist: [
      { text: 'Headless tesseract.nu API client', status: 'todo' },
      { text: 'Grid state → room routing decisions', status: 'todo' },
      { text: 'Deep-link generation from bot conversations', status: 'todo' },
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
];
