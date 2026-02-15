/**
 * 14-thetasteer-iamfim.tsx — ThetaSteer as IAMFIM Bootstrap
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: ThetaSteer already categorizes every signal. This IS the beginning of IAMFIM.
 * DEPENDS ON: 05-fim-auth.tsx, 12-drift-vs-steering.tsx
 * EDITED BY: Architect agent (connecting categorization to geometric auth)
 *
 * The mailbox pattern: every action is categorized into the 20-dimensional
 * trust-debt space. ThetaSteer builds the identity fractal in real-time.
 */

export const SECTION_ID = '14-thetasteer-iamfim';
export const SECTION_TITLE = 'ThetaSteer → IAMFIM Pipeline';

export interface MailboxAction {
  source: string;
  examples: string[];
  categorizedAs: string;
  trustDimension: string;
  flowsTo: string;
}

export const mailboxPattern: MailboxAction[] = [
  {
    source: 'Discord message',
    examples: ['User asks to deploy', 'User requests CRM update', 'Voice memo about strategy'],
    categorizedAs: 'ThetaSteer tier (RED/BLUE/GREEN/...)',
    trustDimension: 'Maps to 1-3 of 20 trust-debt categories',
    flowsTo: 'Cognitive room → Terminal → Claude Flow agent',
  },
  {
    source: 'Tool call (MCP)',
    examples: ['shell_execute', 'git_push', 'crm_update_lead', 'file_write'],
    categorizedAs: 'Action requirement vector',
    trustDimension: 'Required scores per category (e.g., security >= 0.7)',
    flowsTo: 'FIM proxy → overlap check → allow/deny',
  },
  {
    source: 'Voice memo',
    examples: ['Sales call debrief', 'Architecture decision', 'Bug report'],
    categorizedAs: 'Whisper → ThetaSteer → tier assignment',
    trustDimension: 'Content maps to domain expertise + category scores',
    flowsTo: 'Attention corpus → tesseract training → identity fractal update',
  },
  {
    source: 'Git commit',
    examples: ['Feature commit', 'Bug fix', 'Documentation update'],
    categorizedAs: 'Pipeline Agent 1 (keyword extraction)',
    trustDimension: 'Builds presence matrix (step 3) → grades (step 4)',
    flowsTo: 'Sovereignty score update → FIM recalibration',
  },
  {
    source: 'Trust-debt spike',
    examples: ['Security category drops below 0.5', '3 consecutive FIM denials'],
    categorizedAs: 'CRITICAL drift event',
    trustDimension: 'Triggers sovereignty recalculation',
    flowsTo: 'Auto-throttle permissions + public Discord transparency report',
  },
];

export const identityFractalConstruction = {
  title: 'Building the Identity Fractal in Real-Time',
  description: 'The identity fractal is NOT a static configuration. It is a living 20-dimensional vector that updates with every categorized action.',
  phases: [
    {
      name: 'Intake',
      description: 'Every signal (message, tool call, voice memo, commit) enters the mailbox',
    },
    {
      name: 'Categorize',
      description: 'ThetaSteer assigns 1-3 trust-debt categories with confidence scores',
    },
    {
      name: 'Accumulate',
      description: 'Category scores update in the identity vector (exponential moving average)',
    },
    {
      name: 'Gate',
      description: 'FIM proxy checks overlap before every tool execution',
    },
    {
      name: 'Feedback',
      description: 'Denials reduce trust; successful operations build trust. The fractal sharpens.',
    },
  ],
};

export const thetaSteerConfig = {
  backends: [
    { name: 'ThetaSteer daemon', latency: '< 50ms', accuracy: 'HIGH', cost: 'FREE (local)' },
    { name: 'Ollama llama3.2:1b', latency: '< 200ms', accuracy: 'MEDIUM', cost: 'FREE (local)' },
    { name: 'Claude Sonnet API', latency: '< 2s', accuracy: 'HIGHEST', cost: '$0.003/call' },
  ],
  confidenceTiers: [
    { tier: 'GREEN', confidence: '>= 0.8', action: 'Auto-route to room, no human confirmation' },
    { tier: 'RED', confidence: '0.5 - 0.8', action: 'Route to room but flag for review' },
    { tier: 'BLUE', confidence: '< 0.5', action: 'Route to navigator for human decision' },
  ],
};
