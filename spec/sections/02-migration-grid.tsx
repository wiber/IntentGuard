/**
 * 02-migration-grid.tsx — Module Migration Status Tiles
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Each tile = one module being extracted from ThetaDriven → IntentGuard.
 * DEPENDS ON: Nothing
 * EDITED BY: Any agent (update status as modules migrate)
 *
 * STATUS VALUES: 'complete' | 'building' | 'pending' | 'planned'
 * UPDATE RULE: Only change status when code is committed, not when planning.
 */

export const SECTION_ID = '02-migration-grid';
export const SECTION_TITLE = 'Module Migration Status';

export type ModuleStatus = 'complete' | 'building' | 'pending' | 'planned';

export interface MigrationModule {
  id: string;
  emoji: string;
  name: string;
  status: ModuleStatus;
  source: string;
  target: string;
  description: string;
  files: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export const modules: MigrationModule[] = [
  {
    id: 'openclaw-gateway',
    emoji: '🐾',
    name: 'OpenClaw Gateway',
    status: 'complete',
    source: 'thetadrivencoach/openclaw/ (custom discord.js bot)',
    target: 'intentguard/node_modules/openclaw (v2026.2.13)',
    description: 'Open-source multi-channel AI gateway replaces custom Discord bot. Gains: WhatsApp, Telegram, Signal, iMessage, Teams, browser automation, voice.',
    files: 'openclaw.mjs, dist/, skills/, extensions/',
    riskLevel: 'low',
  },
  {
    id: 'discord-integration',
    emoji: '💬',
    name: 'Discord Integration',
    status: 'building',
    source: 'openclaw/src/runtime.ts (837 lines, discord.js v14)',
    target: 'intentguard/src/channels/discord.ts',
    description: 'Custom bot commands (!ping, !stop, !status, !tasks, !history, !clear, !rooms) + cognitive room channel mapping + voice memo pipeline → OpenClaw Discord channel adapter.',
    files: 'runtime.ts, channel-manager.ts, task-store.ts, output-capture.ts, output-poller.ts',
    riskLevel: 'medium',
  },
  {
    id: 'cognitive-rooms',
    emoji: '🏠',
    name: 'Cognitive Rooms',
    status: 'building',
    source: '.workflow/rooms/ (9 HTML rooms + dashboard)',
    target: 'intentguard/src/rooms/',
    description: '9 rooms: Builder(iTerm), Architect(VSCode), Operator(Kitty), Vault(WezTerm), Voice(Terminal), Laboratory(Cursor), Performer(Alacritty), Network(Messages), Navigator(Rio).',
    files: '9 room HTML files, cognitive-dashboard.html, channel-map.json',
    riskLevel: 'high', // skeptic flag: 7 macOS apps, not portable
  },
  {
    id: 'voice-memo',
    emoji: '🎤',
    name: 'Voice Memo Pipeline',
    status: 'pending',
    source: 'openclaw/skills/voice-memo-reactor.ts',
    target: 'intentguard/src/skills/voice-memo.ts',
    description: 'Discord voice memos → FFmpeg → transcription (Whisper→Anthropic→Claude CLI cascade) → categorization → tesseract training.',
    files: 'voice-memo-reactor.ts, llm-controller.ts, ffmpeg-static',
    riskLevel: 'medium',
  },
  {
    id: 'claude-flow-bridge',
    emoji: '🌊',
    name: 'Claude Flow Bridge',
    status: 'pending',
    source: 'openclaw/skills/claude-flow-bridge.ts',
    target: 'intentguard/src/skills/claude-flow-bridge.ts',
    description: 'Bidirectional pipe: Discord ↔ Claude Code terminals. Room-aware dispatch, STDIN forwarding, background process management, output capture.',
    files: 'claude-flow-bridge.ts, output-capture.ts, output-poller.ts',
    riskLevel: 'high', // skeptic flag: terminal IPC is macOS-only
  },
  {
    id: 'trust-debt',
    emoji: '📊',
    name: 'Trust-Debt Pipeline',
    status: 'complete',
    source: 'intentguard/ (already here — 0-7 JSON pipeline)',
    target: 'intentguard/src/pipeline/',
    description: '8-step pipeline: outcomes→keywords→categories(20)→presence-matrix→grades→timeline→narratives→audit. Queen orchestrator + SQLite DB.',
    files: 'agent1-*.js through agent7-*.js, unified-trust-debt-pipeline.js',
    riskLevel: 'low',
  },
  {
    id: 'fim-auth',
    emoji: '🔐',
    name: 'FIM Geometric Auth (IAMFIM)',
    status: 'building',
    source: 'intentguard/src/ (trust-debt math)',
    target: 'intentguard/src/auth/geometric.ts',
    description: 'Fractal Identity Map permissions. Tensor overlap model. CRITICAL: Currently pseudocode only — needs actual math implementation with tests.',
    files: 'intent-reality-calculator.js, trust-debt-categories.json',
    riskLevel: 'critical', // skeptic flag: zero implementation exists
  },
  {
    id: 'crm-mcp',
    emoji: '🤝',
    name: 'CRM MCP Server',
    status: 'pending',
    source: 'packages/crm-mcp/ (thetacoach-crm npm)',
    target: 'intentguard/src/mcp/crm.ts',
    description: '8 CRM tools: list/get/create/update leads, create/update cards, update checklist, next. Supabase backend.',
    files: 'packages/crm-mcp/src/, docs/crm/ONE-SHOT-CRM-SETUP.sql',
    riskLevel: 'low',
  },
  {
    id: 'tesseract-grid',
    emoji: '🧊',
    name: 'Tesseract Grid',
    status: 'pending',
    source: 'src/app/tesseract/ (Next.js pages)',
    target: 'intentguard/src/tesseract/',
    description: '3x3 coordinate namespace. Deep-link purchase flows. Headless version for bot to query/update grid state at tesseract.nu.',
    files: 'src/app/tesseract/page.tsx, src/app/api/tesseract/',
    riskLevel: 'medium',
  },
  {
    id: 'battle-cards',
    emoji: '⚔️',
    name: 'Battle Cards → OpenClaw Skills',
    status: 'planned',
    source: 'docs/05-content/battle-cards/',
    target: 'intentguard/skills/battle-cards/',
    description: 'Convert Challenger methodology battle cards to OpenClaw SKILL.md format.',
    files: 'docs/05-content/battle-cards/*.md',
    riskLevel: 'low',
  },
  {
    id: 'overnight-reports',
    emoji: '🌙',
    name: 'Overnight Reports',
    status: 'building',
    source: 'openclaw/data/overnight-reports/',
    target: 'intentguard/data/overnight-reports/',
    description: 'Always-on Mac Mini generates overnight intelligence reports. HTML summaries = CEO morning briefing.',
    files: 'overnight-report-001.html, coordination/, task-queue/',
    riskLevel: 'low',
  },
];

// Computed stats for rendering
export function getStats() {
  const counts: Record<ModuleStatus, number> = { complete: 0, building: 0, pending: 0, planned: 0 };
  modules.forEach(m => counts[m.status]++);
  return counts;
}
