/**
 * 12-drift-vs-steering.tsx — The Case: Drift vs Self-Driving
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Derived from Appendix H of the Tesseract book.
 * DEPENDS ON: 05-fim-auth.tsx, 06-trust-debt.tsx
 * EDITED BY: Architect agent (physics argument)
 *
 * Systems suffer 0.3% per-operation entropic drift (k_E = 0.003).
 * Without geometric permissions, bot CEO hallucinated into bankruptcy.
 */

export const SECTION_ID = '12-drift-vs-steering';
export const SECTION_TITLE = 'Drift vs Self-Driving';

export interface DriftScenario {
  name: string;
  emoji: string;
  approach: string;
  probability: string;
  outcome: string;
  operations: string;
  catastrophicAt: string;
}

export const scenarios: DriftScenario[] = [
  {
    name: 'Traditional Bot (Drift)',
    emoji: '🌊',
    approach: 'Probability-based (P < 1). No geometric guard. Trust the LLM output.',
    probability: 'P = 0.997 per operation (99.7% correct)',
    outcome: 'After 1000 operations: (0.997)^1000 = 4.9% chance still aligned',
    operations: '1000 ops/day for always-on bot',
    catastrophicAt: '~230 operations (50% drift probability)',
  },
  {
    name: 'IntentGuard (Self-Driving)',
    emoji: '🛡️',
    approach: 'Certainty-based (P = 1). IAMFIM geometric permission. Trust-debt throttling.',
    probability: 'P = 1.0 per authorized operation (tensor overlap verified)',
    outcome: 'Drift detected at 0.003 divergence. Auto-throttle. Self-correct.',
    operations: 'Same 1000 ops/day, but each gated by FIM',
    catastrophicAt: 'Never — drift triggers permission reduction before damage',
  },
];

export const driftConstants = {
  k_E: 0.003, // Entropic drift rate per operation
  k_S: 361,   // Sorting efficiency multiplier (ShortRank)
  driftThreshold: 0.003, // Divergence that triggers throttle
  safetyFractal: 'The region in trust-debt space where sovereignty score > action requirement',
};

export const steeringMechanism = {
  title: 'The Steering Loop',
  steps: [
    { step: 1, action: 'Tool call arrives at MCP Proxy', component: 'OpenClaw → IntentGuard' },
    { step: 2, action: 'Load identity vector from trust-debt pipeline', component: 'Pipeline Step 4' },
    { step: 3, action: 'Compute tensor overlap with action requirement', component: 'geometric.ts' },
    { step: 4, action: 'If overlap < 0.8 OR sovereignty < minimum: DENY', component: 'FIM Guard' },
    { step: 5, action: 'If denied, record to trust-debt pipeline as drift event', component: 'Pipeline Step 7' },
    { step: 6, action: 'Drift events reduce sovereignty score for future operations', component: 'Pipeline Step 4 recalc' },
    { step: 7, action: 'Bot auto-throttles: fewer permissions until trust rebuilds', component: 'Self-correction' },
    { step: 8, action: 'Transparency Engine reports drift catch to public Discord', component: 'Open trust' },
  ],
};

export const thetaSteerAsIAMFIM = {
  title: 'ThetaSteer → IAMFIM Bootstrap',
  description: 'ThetaSteer already categorizes every inbound signal into RED/BLUE/GREEN/PURPLE/CYAN/AMBER/INDIGO/TEAL tiers. This IS the beginning of IAMFIM — the categorization of the mailbox pattern into the 20-dimensional trust-debt space.',
  mapping: [
    { tier: 'RED', color: '#dc2626', category: 'security', room: 'vault', description: 'Legal, compliance, patent, security audit' },
    { tier: 'BLUE', color: '#3b82f6', category: 'code_quality', room: 'builder', description: 'Implementation, bug fixes, build systems' },
    { tier: 'GREEN', color: '#22c55e', category: 'process_adherence', room: 'operator', description: 'CRM, pipeline, deals, operations' },
    { tier: 'PURPLE', color: '#a855f7', category: 'communication', room: 'voice', description: 'Content, blog, book, thought leadership' },
    { tier: 'CYAN', color: '#06b6d4', category: 'innovation', room: 'laboratory', description: 'Experiments, prototypes, research' },
    { tier: 'AMBER', color: '#f59e0b', category: 'domain_expertise', room: 'performer', description: 'Demos, pitches, performances, revenue conversion' },
    { tier: 'INDIGO', color: '#6366f1', category: 'risk_assessment', room: 'architect', description: 'Strategy, roadmap, sequencing, design' },
    { tier: 'TEAL', color: '#0d9488', category: 'adaptability', room: 'navigator', description: 'Fast scouting, unblocking, cache hits' },
  ],
};
