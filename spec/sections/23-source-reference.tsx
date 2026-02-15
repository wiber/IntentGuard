/**
 * 23-source-reference.tsx — Source File Reference (Complete)
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Complete file reference for IntentGuard + OpenClaw codebases.
 * DEPENDS ON: Nothing
 * EDITED BY: Any agent
 */

export const SECTION_ID = '23-source-reference';
export const SECTION_TITLE = 'Source File Reference (Complete)';

export const pathNote = 'All paths relative to ../intentguard/ (the IntentGuard repo root). OpenClaw paths are ../thetadrivencoach/openclaw/.';

export interface FileRef {
  file: string;
  loc?: number | string;
  purpose: string;
  status?: 'live' | 'built' | 'partial' | 'todo';
}

export const coreFiles: FileRef[] = [
  { file: 'src/runtime.ts', loc: '1,035', purpose: 'Main orchestrator: Discord client, 9 rooms, task store, steering loop, transparency', status: 'live' },
  { file: 'src/wrapper.ts', loc: 629, purpose: 'Sovereign Engine: spawns OpenClaw gateway, registers skills, FIM auth plugin', status: 'live' },
  { file: 'src/ceo-loop.ts', loc: '750+', purpose: 'Always-on autonomous loop: scan spec → dispatch → commit → tweet', status: 'built' },
  { file: 'src/types.ts', loc: '~200', purpose: 'Shared TypeScript interfaces and types', status: 'live' },
  { file: 'src/auth/geometric.ts', loc: '~260', purpose: 'FIM permission engine: 20-dim identity, overlap computation, action requirements', status: 'built' },
  { file: 'src/pipeline/runner.ts', loc: '~80', purpose: '8-step trust-debt pipeline orchestrator', status: 'live' },
  { file: 'src/pipeline/step-0.ts — step-7.ts', loc: '~600', purpose: 'Individual pipeline stages', status: 'live' },
];

export const discordFiles: FileRef[] = [
  { file: 'src/discord/channel-manager.ts', purpose: '9 rooms + 4 extra channels, bidirectional mapping', status: 'live' },
  { file: 'src/discord/steering-loop.ts', purpose: 'Ask-and-Predict protocol, 3 execution tiers', status: 'built' },
  { file: 'src/discord/task-store.ts', purpose: 'JSONL persistence, replay, kill switch', status: 'live' },
  { file: 'src/discord/transparency-engine.ts', purpose: 'Public trust-debt reporting, spike detection', status: 'built' },
  { file: 'src/discord/authorized-handles.ts', purpose: 'Admin handles: thetaking, mortarcombat', status: 'live' },
  { file: 'src/discord/shortrank-notation.ts', purpose: 'ShortRank A-K formatting for Discord', status: 'live' },
  { file: 'src/discord/tweet-composer.ts', purpose: '280-char tweet generation', status: 'live' },
  { file: 'src/discord/x-poster.ts', purpose: 'X/Twitter cross-posting via browser', status: 'built' },
];

export interface SkillFileRef {
  file: string;
  loc: number | string;
  origin: string;
  status: 'live' | 'partial' | 'todo' | 'built';
}

export const skillFiles: SkillFileRef[] = [
  { file: 'src/skills/claude-flow-bridge.ts', loc: 729, origin: 'ported from openclaw', status: 'live' },
  { file: 'src/skills/voice-memo-reactor.ts', loc: 228, origin: 'ported from openclaw', status: 'live' },
  { file: 'src/skills/thetasteer-categorize.ts', loc: 382, origin: 'ported from openclaw', status: 'live' },
  { file: 'src/skills/llm-controller.ts', loc: 412, origin: 'ported from openclaw', status: 'partial' },
  { file: 'src/skills/system-control.ts', loc: 481, origin: 'ported from openclaw', status: 'live' },
  { file: 'src/skills/tesseract-trainer.ts', loc: 317, origin: 'ported from openclaw', status: 'live' },
  { file: 'src/skills/email-outbound.ts', loc: 165, origin: 'native', status: 'built' },
  { file: 'src/skills/artifact-generator.ts', loc: 256, origin: 'native', status: 'built' },
  { file: 'src/skills/cost-reporter.ts', loc: 480, origin: 'native', status: 'built' },
  { file: 'src/skills/wallet-ledger.ts', loc: 220, origin: 'native', status: 'built' },
  { file: 'src/skills/wallet.ts', loc: 20, origin: 'native (skeleton)', status: 'todo' },
  { file: 'src/skills/geometry-converter.ts', loc: 293, origin: 'native', status: 'built' },
  { file: 'src/skills/stl-writer.ts', loc: 119, origin: 'native', status: 'built' },
];

export const skillRegistryNote = 'Skill registry: ../intentguard/src/skills/registry.json | Sync script: ../intentguard/scripts/sync-skills.sh';

export interface SimpleFileRef {
  file: string;
  purpose: string;
}

export const federationGridFiles: SimpleFileRef[] = [
  { file: 'src/federation/tensor-overlap.ts', purpose: 'Cosine similarity between identity vectors' },
  { file: 'src/federation/handshake.ts', purpose: 'Bot-to-bot handshake protocol' },
  { file: 'src/federation/registry.ts', purpose: 'Federated bot registry with drift monitoring' },
  { file: 'src/grid/tesseract-client.ts', purpose: 'HTTP client for tesseract.nu API' },
  { file: 'src/grid/hot-cell-router.ts', purpose: 'Event routing based on grid pressure' },
  { file: 'src/grid/ascii-renderer.ts', purpose: 'Terminal grid visualization' },
  { file: 'src/grid/deep-linker.ts', purpose: 'URL generation for grid cells' },
];

export interface OpenClawFileRef {
  file: string;
  loc: number;
  purpose: string;
}

export const openclawFiles: OpenClawFileRef[] = [
  { file: 'src/runtime.ts', loc: 869, purpose: 'Discord.js v14 orchestrator, message routing, voice detection' },
  { file: 'src/channel-manager.ts', loc: 212, purpose: '9 room channels, bidirectional mapping, 50-line context buffer' },
  { file: 'src/task-store.ts', loc: 286, purpose: 'JSONL event sourcing, restart recovery, kill switch' },
  { file: 'src/output-capture.ts', loc: 232, purpose: 'Per-terminal IPC: iTerm, Terminal, Kitty, WezTerm, System Events' },
  { file: 'src/output-poller.ts', loc: 176, purpose: '2000ms polling, shell prompt regex, stabilization detection' },
  { file: 'src/clipboard-mutex.ts', loc: 116, purpose: 'Global async lock for System Events rooms' },
  { file: 'src/doctor.ts', loc: 208, purpose: 'Pre-flight health: Node>=22, config, env, skills, directories' },
  { file: 'src/types.ts', loc: 137, purpose: 'AgentSkill interface, SkillContext, task lifecycle types' },
];

export const configFiles: SimpleFileRef[] = [
  { file: '../intentguard/intentguard.json', purpose: 'IntentGuard config: 9 skills enabled, autoDiscover, shell/network allowlists' },
  { file: '../thetadrivencoach/openclaw/openclaw.json', purpose: 'OpenClaw config: 6 skills, orchestrator settings, permissions' },
  { file: '../intentguard/package.json', purpose: 'Dependencies: discord.js, openclaw, ws, better-sqlite3, cosine-similarity' },
  { file: '../intentguard/tsconfig.json', purpose: 'ES2022, ESNext modules, strict, bundler resolution' },
];
