/**
 * 25-openclaw-npm-integration.tsx — OpenClaw NPM Gateway Integration
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Documents the migration from custom runtime to OpenClaw NPM package.
 * DEPENDS ON: 16-openclaw-integration
 * EDITED BY: Architect or Operator agent
 *
 * Added: 2026-02-15
 */

export const SECTION_ID = '25-openclaw-npm-integration';
export const SECTION_TITLE = 'OpenClaw NPM Gateway Integration (2026-02-15)';

export const callout = 'Migration from custom runtime to OpenClaw NPM package complete. The 3,418 LOC custom code is now complemented by OpenClaw\'s 196K-star production gateway. Custom skills ported to workspace format. Sonnet 4 connected via claude-max-api-proxy at $0/token.';

export interface ArchitectureLayer {
  layer: number;
  component: string;
  port: string;
  manager: string;
  status: 'Building' | 'Installed' | 'Live';
}

export const architectureLayers: ArchitectureLayer[] = [
  { layer: 1, component: 'IntentGuard (Bot CEO)', port: '-', manager: 'Manual', status: 'Building' },
  { layer: 2, component: 'Claude Flow v3 (90 MCP tools)', port: '-', manager: 'CLI', status: 'Installed' },
  { layer: 3, component: 'OpenClaw Gateway (54 skills)', port: '18789', manager: 'launchd', status: 'Live' },
  { layer: 4, component: 'claude-max-api-proxy (Sonnet 4)', port: '3456', manager: 'launchd', status: 'Live' },
];

export interface PortedSkill {
  name: string;
  source: string;
  format: string;
  status: string;
}

export const portedSkills: PortedSkill[] = [
  { name: 'terminal-dispatch', source: 'Custom TypeScript (286 LOC)', format: 'SKILL.md + dispatch.sh', status: 'Ready' },
  { name: 'output-capture', source: 'Custom TypeScript (232 LOC)', format: 'SKILL.md + capture.sh', status: 'Ready' },
  { name: 'thetasteer-categorize', source: 'Custom TypeScript (423 LOC)', format: 'SKILL.md (prompt-based)', status: 'Ready' },
  { name: 'claude-flow-bridge', source: 'New', format: 'SKILL.md (CLI wrapper)', status: 'Ready' },
];

export const bundledSkills = [
  'coding-agent', 'github', 'tmux', 'openai-whisper-api', 'session-logs',
  '1password', 'healthcheck', 'himalaya', 'skill-creator', 'video-frames',
  'weather', 'openai-image-whisper',
];
export const bundledSkillsMore = 37;

export interface WorkspaceFile {
  file: string;
  purpose: string;
}

export const workspaceFiles: WorkspaceFile[] = [
  { file: 'BOOTSTRAP.md', purpose: 'Operating instructions — categorize, route, dispatch, capture, respond sequence' },
  { file: 'IDENTITY.md', purpose: 'Tesseract identity — cognitive room orchestrator' },
  { file: 'USER.md', purpose: 'Elias profile — projects, preferences, Discord IDs' },
  { file: 'TOOLS.md', purpose: 'Environment notes — terminal apps, services, paths, models' },
  { file: 'SOUL.md', purpose: 'Behavioral guidelines (OpenClaw default, customized)' },
];

export interface PersistentService {
  service: string;
  launchdLabel: string;
  port: string | number;
  what: string;
}

export const persistentServices: PersistentService[] = [
  { service: 'OpenClaw Gateway', launchdLabel: 'ai.openclaw.gateway', port: 18789, what: 'AI gateway + Discord + dashboard + 54 skills' },
  { service: 'claude-max-api-proxy', launchdLabel: 'com.claude-max-api', port: 3456, what: 'Claude Max subscription as OpenAI-compatible API' },
  { service: 'Ollama', launchdLabel: '(homebrew)', port: 11434, what: 'Local LLM fallback (llama3.2:1b)' },
];

export const llmRoutingConfig = `{
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai/claude-sonnet-4",
        "fallbacks": ["ollama/llama3.2:1b"]
      }
    }
  },
  "models": {
    "providers": {
      "openai": {
        "baseUrl": "http://localhost:3456/v1",
        "apiKey": "not-needed",
        "models": [
          { "id": "claude-sonnet-4", "contextWindow": 200000, "cost": { "input": 0, "output": 0 } },
          { "id": "claude-opus-4",   "contextWindow": 200000, "cost": { "input": 0, "output": 0 } }
        ]
      }
    }
  }
}`;

export interface ResolvedIssue {
  issue: string;
  before: string;
  after: string;
}

export const resolvedIssues: ResolvedIssue[] = [
  { issue: 'ISS-01: ffmpeg missing', before: 'No voice memo transcription', after: 'openai-whisper-api skill bundled' },
  { issue: 'ISS-02: heat.json corruption', before: '[object Object] keys', after: 'File not found (clean slate)' },
  { issue: 'ISS-04: No graceful shutdown', before: 'Custom SIGTERM handler needed', after: 'launchd manages lifecycle' },
  { issue: 'ISS-05: No Discord rate limiting', before: 'Custom implementation needed', after: 'Built into OpenClaw Discord channel' },
];

export interface GainCard {
  title: string;
  detail: string;
}

export const gains: GainCard[] = [
  { title: 'Playwright Browser Automation', detail: 'Full computer use via Playwright — click, type, screenshot, navigate. 2 browser profiles ready. NOT Anthropic computer use — OpenClaw\'s own implementation.' },
  { title: '54 Skills Ecosystem', detail: 'GitHub, tmux, Whisper, 1Password, email (himalaya), session logs, skill creator, coding agent, video frames, weather, and 37 more installable via clawhub.' },
  { title: 'Dashboard + Web UI', detail: 'Full session viewer, skill browser, config editor, agent status at http://127.0.0.1:18789. Canvas support for visual outputs.' },
  { title: '21+ Messaging Channels', detail: 'Discord (live), WhatsApp, Telegram, Signal, iMessage, Teams, Slack, email, SMS, and more. Each just a config entry away.' },
];

export const preserved: GainCard[] = [
  { title: '9 Cognitive Rooms', detail: 'All room-to-terminal mappings preserved in terminal-dispatch skill. Same IPC methods (AppleScript, kitty socket, WezTerm CLI, System Events).' },
  { title: 'ThetaSteer Categorization', detail: 'Full 12-category grid (A/B/C x 1/2/3) with confidence tiers and hardness routing. Now prompt-based instead of TypeScript class.' },
  { title: 'Output Capture + Polling', detail: 'Per-terminal capture with delta detection, stabilization, and poll/wait mode. Clipboard mutex for System Events serialization.' },
  { title: 'Kill Switch', detail: 'Ctrl+C dispatch to any room via terminal-dispatch --kill. Works across all IPC methods.' },
];
