/**
 * 16-openclaw-integration.tsx — Cortex+Body Wrapper Architecture
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Documents how IntentGuard wraps OpenClaw as a child process.
 * DEPENDS ON: 01-architecture.tsx (layer definitions)
 * EDITED BY: Architect or Operator agent
 *
 * KEY FILE: src/wrapper.ts — the unified entry point
 *
 * REPO STRUCTURE (corrected 2026-02-14):
 *   thetadrivencoach = SOURCE REPO (Next.js, blog, book, tesseract UI, FIM artifacts)
 *   intentguard      = RUNTIME REPO (OpenClaw gateway, Sovereign Engine — will be public)
 */

export const SECTION_ID = '16-openclaw-integration';
export const SECTION_TITLE = 'OpenClaw Integration — Cortex+Body Pattern';

// ─────────────────────────────────────────────────
// 1. The Wrapper Pattern
// ─────────────────────────────────────────────────

export interface WrapperStep {
  order: number;
  name: string;
  description: string;
  file: string;
  status: 'done' | 'wip' | 'todo';
}

export const wrapperSteps: WrapperStep[] = [
  {
    order: 1,
    name: 'Install FIM Auth Plugin',
    description: 'Writes ~/.openclaw/plugins/intentguard-fim-auth.js with 20-dim tensor overlap checks. Reads sovereignty from pipeline data. Defines ACTION_REQUIREMENTS map (shell_execute, git_push, file_delete, etc.)',
    file: 'src/wrapper.ts → installFimPlugin()',
    status: 'done',
  },
  {
    order: 2,
    name: 'Register Custom Skills',
    description: 'Creates 6 skill directories in ~/.openclaw/workspace/skills/ with manifest.json + index.js. Each index.js delegates to our TypeScript implementations via dynamic import.',
    file: 'src/wrapper.ts → registerSkills()',
    status: 'done',
  },
  {
    order: 3,
    name: 'Wire LLM Backends',
    description: 'Updates ~/.openclaw/openclaw.json with Ollama (primary, Tier 0 fast) and Anthropic Claude Sonnet (fallback, Tier 1 deep). Backs up existing config first.',
    file: 'src/wrapper.ts → wireLlmBackends()',
    status: 'done',
  },
  {
    order: 4,
    name: 'Spawn or Connect Gateway',
    description: 'Resolves openclaw binary from node_modules, spawns as child process with --port 18789. Or connects to existing gateway with --no-gateway flag. Waits for port ready.',
    file: 'src/wrapper.ts → spawnGateway()',
    status: 'done',
  },
  {
    order: 5,
    name: 'WebSocket Parasite Hook',
    description: 'Connects ws://127.0.0.1:18789/ws and subscribes to message_received, tool_call, session_start events. Runs 3-tier grounding on every inbound message.',
    file: 'src/wrapper.ts → connectWebSocket()',
    status: 'done',
  },
];

// ─────────────────────────────────────────────────
// 2. Registered Skills (OpenClaw Workspace)
// ─────────────────────────────────────────────────

export interface RegisteredSkill {
  id: string;
  name: string;
  tools: string[];
  implementation: string;
  status: 'done' | 'wip' | 'todo';
}

export const registeredSkills: RegisteredSkill[] = [
  {
    id: 'intentguard-llm-controller',
    name: 'LLM Controller (3-Tier Grounding)',
    tools: ['llm_categorize', 'llm_reason', 'llm_transcribe'],
    implementation: 'src/skills/llm-controller.ts',
    status: 'done',
  },
  {
    id: 'intentguard-thetasteer',
    name: 'ThetaSteer Categorize (IAMFIM)',
    tools: ['thetasteer_categorize'],
    implementation: 'src/skills/thetasteer-categorize.ts',
    status: 'done',
  },
  {
    id: 'intentguard-voice-reactor',
    name: 'Voice Memo Reactor',
    tools: ['voice_react'],
    implementation: 'src/skills/voice-memo-reactor.ts',
    status: 'done',
  },
  {
    id: 'intentguard-claude-flow-bridge',
    name: 'Claude Flow Bridge',
    tools: ['bridge_dispatch', 'bridge_stdin'],
    implementation: 'src/skills/claude-flow-bridge.ts',
    status: 'done',
  },
  {
    id: 'intentguard-email-outbound',
    name: 'Email Outbound',
    tools: ['email_send'],
    implementation: 'src/skills/email-outbound.ts',
    status: 'done',
  },
  {
    id: 'intentguard-night-shift',
    name: 'Night Shift Scheduler',
    tools: ['nightshift_status', 'nightshift_trigger'],
    implementation: 'src/cron/scheduler.ts',
    status: 'done',
  },
];

// ─────────────────────────────────────────────────
// 3. LLM Grounding Protocol (3-Tier)
// ─────────────────────────────────────────────────

export interface LlmTier {
  tier: number;
  name: string;
  model: string;
  latency: string;
  role: string;
  when: string;
}

export const llmTiers: LlmTier[] = [
  {
    tier: 0,
    name: 'Ollama (Local)',
    model: 'llama3.2:1b',
    latency: '~200ms',
    role: 'Fast categorization into trust-debt dimensions',
    when: 'Every inbound message — runs in WebSocket parasite hook',
  },
  {
    tier: 1,
    name: 'Claude Sonnet (API)',
    model: 'claude-sonnet-4-20250514',
    latency: '~2-5s',
    role: 'Complex reasoning, steering decisions, tweet composition',
    when: 'Steering loop predictions, dangerous task assessment, admin questions',
  },
  {
    tier: 2,
    name: 'Human Admin (Discord)',
    model: 'N/A — thumbs-up blessing',
    latency: 'Minutes to hours',
    role: 'Final authority on dangerous actions',
    when: 'Dangerous tasks with sovereignty < 0.9, non-admin suggestions, X posting',
  },
];

// ─────────────────────────────────────────────────
// 4. FIM Plugin Action Requirements
// ─────────────────────────────────────────────────

export interface ActionRequirement {
  tool: string;
  requiredScores: Record<string, number>;
  minSovereignty: number;
}

export const actionRequirements: ActionRequirement[] = [
  { tool: 'shell_execute', requiredScores: { security: 0.7, reliability: 0.5 }, minSovereignty: 0.6 },
  { tool: 'crm_update_lead', requiredScores: { data_integrity: 0.5, process_adherence: 0.4 }, minSovereignty: 0.3 },
  { tool: 'git_push', requiredScores: { code_quality: 0.7, testing: 0.6, security: 0.5 }, minSovereignty: 0.7 },
  { tool: 'file_write', requiredScores: { reliability: 0.4 }, minSovereignty: 0.2 },
  { tool: 'file_delete', requiredScores: { reliability: 0.7, security: 0.6 }, minSovereignty: 0.8 },
  { tool: 'browser_navigate', requiredScores: { security: 0.3 }, minSovereignty: 0.3 },
  { tool: 'send_message', requiredScores: { communication: 0.3 }, minSovereignty: 0.2 },
];

// ─────────────────────────────────────────────────
// 5. Entry Points
// ─────────────────────────────────────────────────

export const entryPoints = {
  wrapper: {
    command: 'npx tsx src/wrapper.ts',
    description: 'Unified Cortex+Body: spawns OpenClaw, installs FIM, registers skills, wires LLM, connects WebSocket',
    flags: ['--no-fim', '--no-gateway', '--no-skills', '--no-llm', '--verbose'],
  },
  runtime: {
    command: 'npx tsx src/runtime.ts',
    description: 'Discord-first runtime: bot login, cognitive rooms, steering loop, Night Shift, CEO loop',
    note: 'Does NOT spawn OpenClaw — focuses on Discord orchestration',
  },
  ceoLoop: {
    command: 'npx tsx src/ceo-loop.ts',
    description: 'Standalone CEO: reads spec, prioritizes, subdivides, implements, commits',
    flags: ['--no-commit', '--dry-run'],
  },
};

// ─────────────────────────────────────────────────
// 6. Remaining Integration Tasks
// ─────────────────────────────────────────────────

export interface IntegrationTask {
  text: string;
  status: 'done' | 'wip' | 'todo';
  phase: string;
}

export const integrationTasks: IntegrationTask[] = [
  { text: 'wrapper.ts spawns OpenClaw as child process', status: 'done', phase: 'Phase 0' },
  { text: 'FIM auth plugin installed via wrapper', status: 'done', phase: 'Phase 2' },
  { text: '6 skills registered in OpenClaw workspace', status: 'done', phase: 'Phase 1' },
  { text: 'LLM backends wired (Ollama + Sonnet)', status: 'done', phase: 'Phase 1' },
  { text: 'WebSocket parasite hook connected', status: 'done', phase: 'Phase 0' },
  { text: 'runtime.ts wired to Night Shift scheduler', status: 'done', phase: 'Phase 9' },
  { text: 'Merge wrapper.ts + runtime.ts into single entry point', status: 'todo', phase: 'Phase 3' },
  { text: 'WhatsApp adapter wired to channel-manager', status: 'todo', phase: 'Phase 3' },
  { text: 'Telegram adapter wired to channel-manager', status: 'todo', phase: 'Phase 3' },
  { text: 'Claude Flow agent pool (50 concurrent) for task subdivision', status: 'todo', phase: 'Phase 9' },
  { text: 'Test cross-channel room routing (Discord → WhatsApp → Telegram)', status: 'todo', phase: 'Phase 3' },
  { text: 'Build ASCII grid renderer for #ops-board', status: 'todo', phase: 'Phase 4' },
  { text: 'Wire task completions to POINTER_CREATE events on tesseract grid', status: 'todo', phase: 'Phase 4' },
];
