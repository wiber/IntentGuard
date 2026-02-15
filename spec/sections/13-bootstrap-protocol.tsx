/**
 * 13-bootstrap-protocol.tsx — Bootstrap Protocol: Mac Mini 96GB
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: How the Claude Flow swarm bootstraps the always-on system.
 * DEPENDS ON: 08-implementation-plan.tsx, 11-end-state-vision.tsx
 * EDITED BY: Operator agent (execution protocol)
 *
 * We use OpenClaw itself to build the bridge.
 * Sessions output directly to Discord "War Room" channels.
 */

export const SECTION_ID = '13-bootstrap-protocol';
export const SECTION_TITLE = 'Bootstrap Protocol — Mac Mini 96GB';

export interface BootstrapPhase {
  id: string;
  name: string;
  description: string;
  agentCount: number;
  discordChannel: string;
  tasks: string[];
  status: 'done' | 'active' | 'queued';
}

export const bootstrapPhases: BootstrapPhase[] = [
  {
    id: 'boot-0',
    name: 'Phase 0 — Foundation',
    description: 'Mac Mini initializes daemon. OpenClaw starts headlessly. Claude Flow swarm initializes.',
    agentCount: 5,
    discordChannel: '#operator',
    tasks: [
      'openclaw onboard --install-daemon',
      'Start IntentGuard wrapper (npx tsx src/wrapper.ts)',
      'Verify OpenClaw gateway at ws://127.0.0.1:18789',
      'Initialize Claude Flow hive-mind with 50 workers',
      'Map 9 cognitive rooms to Discord channels',
    ],
    status: 'active',
  },
  {
    id: 'boot-1',
    name: 'Phase 1 — The Swarm',
    description: '50 Claude Flows cross-reference and implement. Each agent pulls a TSX tile, works autonomously, reports to Discord.',
    agentCount: 50,
    discordChannel: '#architect',
    tasks: [
      'Spawn spec-writer agents (11-15 TSX sections)',
      'Spawn cross-reference agents (267 blog posts → trust-debt categories)',
      'Spawn implementation agents (skills, wrapper, auth)',
      'Spawn documentation agents (render spec, update checklists)',
      'Output all progress to cognitive room Discord channels',
      'Re-render spec every 10 minutes: npx tsx spec/render.tsx',
    ],
    status: 'queued',
  },
  {
    id: 'boot-2',
    name: 'Phase 2 — The Clean-Up',
    description: 'Bot reaches back into thetadrivencoach, extracts working trust-debt agents, refines them into intentguard/src/pipeline/.',
    agentCount: 20,
    discordChannel: '#builder',
    tasks: [
      'Extract trust-debt agents (0-7) from thetadrivencoach',
      'Refactor into intentguard/src/pipeline/ with TypeScript',
      'Port voice-memo-reactor skill to OpenClaw format',
      'Port claude-flow-bridge skill to OpenClaw format',
      'Port system-control skill to OpenClaw format',
      'Clean up thetadrivencoach/openclaw/ (remove migrated code)',
      'Update all import paths and type definitions',
    ],
    status: 'queued',
  },
  {
    id: 'boot-3',
    name: 'Phase 3 — The Transparency Engine',
    description: 'Public trust-debt reporting to Discord. Bot self-documents drift catches. IAMFIM proof-of-concept.',
    agentCount: 10,
    discordChannel: '#vault',
    tasks: [
      'Create #trust-debt-public Discord channel',
      'Wire FIM deny events to public channel',
      'Format drift catches as embeds: tool, overlap, sovereignty, resolution',
      'Add ThetaSteer categorization to every tool call',
      'Build real-time sovereignty score dashboard',
      'Enable thetaking and mortarcombat handles (remove filters)',
    ],
    status: 'queued',
  },
];

export const discordWarRoom = {
  title: 'Discord War Room — 9 Cognitive Channels',
  channels: [
    { name: '#builder', emoji: '🔨', purpose: 'Implementation progress, build outputs', terminal: 'iTerm2' },
    { name: '#architect', emoji: '📐', purpose: 'Strategic decisions, spec updates', terminal: 'VS Code' },
    { name: '#operator', emoji: '🎩', purpose: 'CRM, pipeline, deal updates', terminal: 'Kitty' },
    { name: '#vault', emoji: '🔒', purpose: 'Security audits, FIM denials, trust-debt', terminal: 'WezTerm' },
    { name: '#voice', emoji: '🎤', purpose: 'Content, transcriptions, blog refs', terminal: 'Terminal' },
    { name: '#laboratory', emoji: '🧪', purpose: 'Experiments, A/B results', terminal: 'Cursor' },
    { name: '#performer', emoji: '🎭', purpose: 'Demo outputs, pitch prep', terminal: 'Alacritty' },
    { name: '#network', emoji: '☕', purpose: 'Relationship signals, intros', terminal: 'Messages' },
    { name: '#navigator', emoji: '🧭', purpose: 'Fast answers, unblocking', terminal: 'Rio' },
    { name: '#trust-debt-public', emoji: '🪞', purpose: 'PUBLIC: Bot drift catches, sovereignty scores', terminal: 'N/A' },
  ],
};

export const swarmConfig = {
  totalAgents: 50,
  topology: 'hierarchical',
  queen: 'intentguard-queen',
  specRenderInterval: '10 minutes',
  outputTarget: 'discord-cognitive-rooms',
  discordHandles: {
    authorized: ['thetaking', 'mortarcombat'],
    policy: 'instant-execute — messages from authorized handles are implemented immediately',
  },
};
