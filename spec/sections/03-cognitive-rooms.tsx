/**
 * 03-cognitive-rooms.tsx — 9 Cognitive Rooms → Discord Channels
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Maps rooms to Discord channels. Each room = terminal + coordinate + handoff rules.
 * DEPENDS ON: Nothing
 * EDITED BY: Architect or Operator agent
 *
 * RISK FLAG (from debate): 7 macOS apps via AppleScript — not portable.
 * Terminal IPC methods: iTerm AppleScript, Kitty socket, WezTerm CLI, System Events keystroke.
 * System Events rooms (architect, laboratory, navigator, network) require window focus = serialized.
 */

export const SECTION_ID = '03-cognitive-rooms';
export const SECTION_TITLE = 'Cognitive Rooms → Discord Channels';

export interface CognitiveRoom {
  id: string;
  emoji: string;
  name: string;
  terminal: string;
  ipcMethod: 'applescript' | 'kitty-socket' | 'wezterm-cli' | 'system-events';
  coordinate: string;
  gridPosition: string;
  color: string;
  sees: string[];
  ignores: string[];
  handoffTo: Record<string, string>;
}

export const rooms: CognitiveRoom[] = [
  {
    id: 'builder',
    emoji: '🔨',
    name: 'Builder',
    terminal: 'iTerm2',
    ipcMethod: 'applescript',
    coordinate: 'C1 Grid:Law',
    gridPosition: 'C1',
    color: '#3b82f6',
    sees: ['Code architecture', 'Build systems', 'Feature implementation', 'Bug fixes'],
    ignores: ['Sales strategy', 'Legal review', 'Demo scripts'],
    handoffTo: { '📐::architect': 'Architecture question', '🎩::operator': 'Deploy this' },
  },
  {
    id: 'architect',
    emoji: '📐',
    name: 'Architect',
    terminal: 'VS Code',
    ipcMethod: 'system-events',
    coordinate: 'A2 Law:Opportunity',
    gridPosition: 'A2',
    color: '#4f46e5',
    sees: ['Strategic sequencing', 'System design', 'Pricing strategy', 'GTM directives'],
    ignores: ['Implementation details', 'CRM stages', 'Voice content'],
    handoffTo: { '🔨::builder': 'Implement this design', '🎩::operator': 'Execute outreach' },
  },
  {
    id: 'operator',
    emoji: '🎩',
    name: 'Operator',
    terminal: 'Kitty',
    ipcMethod: 'kitty-socket',
    coordinate: 'C3 Grid:Signal',
    gridPosition: 'C3',
    color: '#22c55e',
    sees: ['CRM stages', 'Deal velocity', 'Battle cards', 'Outreach copy'],
    ignores: ['Code architecture', 'Strategic sequencing', 'Patent language'],
    handoffTo: { '📐::architect': 'Strategy question', '🔨::builder': 'Feature request' },
  },
  {
    id: 'vault',
    emoji: '🔒',
    name: 'Vault',
    terminal: 'WezTerm',
    ipcMethod: 'wezterm-cli',
    coordinate: 'A1 Law:Law',
    gridPosition: 'A1',
    color: '#ef4444',
    sees: ['Contracts', 'Legal language', 'Patent claims', 'Compliance'],
    ignores: ['Sales tactics', 'Code', 'Content creation'],
    handoffTo: { '📐::architect': 'Strategic review', '🎩::operator': 'Contract ready' },
  },
  {
    id: 'voice',
    emoji: '🎤',
    name: 'Voice',
    terminal: 'Terminal.app',
    ipcMethod: 'applescript',
    coordinate: 'B1 Opp:Law',
    gridPosition: 'B1',
    color: '#a855f7',
    sees: ['Content creation', 'LinkedIn posts', 'Thought leadership', 'Warm leads'],
    ignores: ['Code', 'Legal', 'Deployment'],
    handoffTo: { '🎩::operator': 'Warm lead from post', '📐::architect': 'Content strategy' },
  },
  {
    id: 'laboratory',
    emoji: '🧪',
    name: 'Laboratory',
    terminal: 'Cursor',
    ipcMethod: 'system-events',
    coordinate: 'C2 Grid:Opportunity',
    gridPosition: 'C2',
    color: '#06b6d4',
    sees: ['Experiments', 'A/B tests', 'Research', 'Prototypes'],
    ignores: ['Production code', 'Sales', 'Legal'],
    handoffTo: { '🔨::builder': 'Experiment succeeded, productionize', '📐::architect': 'Research findings' },
  },
  {
    id: 'performer',
    emoji: '🎭',
    name: 'Performer',
    terminal: 'Alacritty',
    ipcMethod: 'applescript',
    coordinate: 'A3 Law:Signal',
    gridPosition: 'A3',
    color: '#f59e0b',
    sees: ['Demo scripts', 'Presentations', 'Live performances', 'Video content'],
    ignores: ['Code', 'CRM', 'Research'],
    handoffTo: { '🎩::operator': 'Demo converted, close the deal', '📐::architect': 'Demo feedback' },
  },
  {
    id: 'network',
    emoji: '☕',
    name: 'Network',
    terminal: 'Messages',
    ipcMethod: 'system-events',
    coordinate: 'B2 Opp:Opportunity',
    gridPosition: 'B2',
    color: '#6366f1',
    sees: ['Relationships', 'Introductions', 'Community', 'Warm connections'],
    ignores: ['Code', 'Legal', 'Experiments'],
    handoffTo: { '🎩::operator': 'Warm intro for deal', '🎤::voice': 'Content collaboration' },
  },
  {
    id: 'navigator',
    emoji: '🧭',
    name: 'Navigator',
    terminal: 'Rio',
    ipcMethod: 'system-events',
    coordinate: 'B3 Opp:Signal',
    gridPosition: 'B3',
    color: '#0d9488',
    sees: ['Context switching', 'Routing decisions', 'Exploration', 'Discovery'],
    ignores: ['Deep implementation', 'Closing deals', 'Legal review'],
    handoffTo: { '📐::architect': 'Found strategic opportunity', '🔨::builder': 'Found useful tool/library' },
  },
];

// IPC method risk assessment
export const ipcRisks = {
  'applescript': { portable: false, focusRequired: false, reliability: 'high' },
  'kitty-socket': { portable: false, focusRequired: false, reliability: 'high' },
  'wezterm-cli': { portable: false, focusRequired: false, reliability: 'high' },
  'system-events': { portable: false, focusRequired: true, reliability: 'medium' },
};
