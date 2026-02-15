/**
 * 01-architecture.tsx — Two-Repo Architecture & Wrapper Pattern
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Defines the IntentGuard(parent) → OpenClaw(child) → Channels pattern.
 * DEPENDS ON: Nothing
 * EDITED BY: Architect agent (medium risk — defines system topology)
 *
 * KEY DECISION: Wrapper > Fork (reversible, upstream updates)
 * RISK FLAG: MCP proxy interception has no standard pattern (see debate notes)
 */

export const SECTION_ID = '01-architecture';
export const SECTION_TITLE = 'Two-Repo Architecture';

export interface WrapperLayer {
  name: string;
  role: string;
  components: Array<{ name: string; description: string }>;
}

export interface ChannelDef {
  emoji: string;
  name: string;
  active: boolean;
}

export const parentLayer: WrapperLayer = {
  name: 'INTENTGUARD',
  role: 'Parent Process — Bot CEO',
  components: [
    { name: 'FIM Auth Layer', description: 'Geometric permissions, tensor overlap check' },
    { name: 'Trust-Debt Engine', description: 'Sovereignty scoring, 20-category pipeline' },
    { name: 'MCP Proxy', description: 'Intercepts tool calls, pre-exec FIM check' },
  ],
};

export const gatewayLayer: WrapperLayer = {
  name: 'OPENCLAW',
  role: 'Child Process — Gateway',
  components: [
    { name: 'Agent Runtime', description: 'LLM agent execution loop' },
    { name: 'Tool Router', description: 'MCP tool registration and dispatch' },
    { name: 'Session Manager', description: 'User sessions and context' },
    { name: 'Model Router', description: 'Claude/GPT model selection' },
  ],
};

export const channels: ChannelDef[] = [
  { emoji: '💬', name: 'Discord', active: true },
  { emoji: '📱', name: 'WhatsApp', active: false },
  { emoji: '✈️', name: 'Telegram', active: false },
  { emoji: '🔒', name: 'Signal', active: false },
  { emoji: '💬', name: 'iMessage', active: false },
  { emoji: '👔', name: 'Teams', active: false },
  { emoji: '🌐', name: 'Web UI', active: true },
  { emoji: '📧', name: 'Email', active: false },
];

/**
 * DEBATE NOTE (skeptic raised):
 * "MCP does not have a standard proxy interception API."
 *
 * Options for implementing the proxy:
 * 1. Run IntentGuard as a separate MCP server wrapping every tool
 * 2. Use OpenClaw's middleware/extension system (if it has one)
 * 3. Intercept at the WebSocket transport layer (ws://127.0.0.1:18789)
 *
 * TODO: Investigate OpenClaw's extension API before committing to approach.
 */
export const DEBATE_FLAGS = {
  mcpProxy: 'No standard MCP proxy pattern exists. Investigate OpenClaw extensions first.',
  latency: 'Proxy adds ~50-200ms per tool call. Benchmark before deploying.',
  failureMode: 'If proxy crashes, does OpenClaw fail-open or fail-closed? Define this.',
};
