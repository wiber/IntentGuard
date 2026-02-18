/**
 * 22-geometric-iam.tsx — Geometric IAM Integration Map
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Wiring diagram showing how FIM, ThetaSteer, Trust-Debt, and Federation connect.
 * DEPENDS ON: 05-fim-auth, 14-thetasteer-iamfim, 06-trust-debt
 * EDITED BY: Architect agent
 */

export const SECTION_ID = '22-geometric-iam';
export const SECTION_TITLE = 'Geometric IAM Integration Map';

export const callout = 'How FIM, ThetaSteer, Trust-Debt, and Federation actually connect. This is the wiring diagram — not pseudocode, but the real data flow between existing TypeScript modules.';

export interface DataFlowStep {
  step: number;
  title: string;
  details: string[];
  sources: string[];
}

export const dataFlowSteps: DataFlowStep[] = [
  {
    step: 1,
    title: 'Signal arrives (voice memo, text, tool call, git commit)',
    details: [],
    sources: ['../intentguard/src/runtime.ts'],
  },
  {
    step: 2,
    title: 'ThetaSteer categorizes → returns {tile_id, confidence, tier, hardness, trustDimensions[]}',
    details: [
      'Maps tile to 2-3 of 20 trust-debt categories (e.g., B2 → communication, collaboration, user_focus)',
    ],
    sources: ['../intentguard/src/skills/thetasteer-categorize.ts:29-42', '../intentguard/src/skills/thetasteer-categorize.ts:45-55'],
  },
  {
    step: 3,
    title: 'Tesseract trainer updates heat map — weight = confidence × emoji_weight × source_weight',
    details: ['Corpus entry saved to data/attention-corpus/'],
    sources: ['../intentguard/src/skills/tesseract-trainer.ts'],
  },
  {
    step: 4,
    title: 'Trust-Debt Pipeline runs (periodically or on-demand) → outputs grades per category',
    details: ['Grades map to sovereignty: A+=1.0, B=0.8, C=0.6, D=0.4, F=0.2'],
    sources: ['../intentguard/src/pipeline/runner.ts', '4-grades-statistics.json'],
  },
  {
    step: 5,
    title: 'Identity vector loads from pipeline → 20-dimensional vector (one score per trust-debt category)',
    details: ['Called at startup'],
    sources: ['../intentguard/src/auth/geometric.ts:204-261', '../intentguard/src/runtime.ts:38'],
  },
  {
    step: 6,
    title: 'Tool call triggers FIM check — computeOverlap(identity, actionRequirement)',
    details: [
      'Action requirements: geometric.ts:128-189 (shell_execute, git_push, git_force_push, deploy, etc.)',
      'Check: overlap >= 0.8 AND sovereignty >= minSovereignty → ALLOW, else → DENY',
    ],
    sources: ['../intentguard/src/auth/geometric.ts:97-123'],
  },
  {
    step: 7,
    title: 'Denial feeds back into pipeline — drift event recorded, sovereignty recalculated',
    details: ['Transparency engine posts to #trust-debt-public'],
    sources: ['../intentguard/src/discord/transparency-engine.ts'],
  },
];

export const trustDebtCategories = [
  'security', 'reliability', 'data_integrity', 'process_adherence',
  'code_quality', 'testing', 'documentation', 'communication',
  'time_management', 'resource_efficiency', 'risk_assessment', 'compliance',
  'innovation', 'collaboration', 'accountability', 'transparency',
  'adaptability', 'domain_expertise', 'user_focus', 'ethical_alignment',
];

export interface TileMapping {
  tile: string;
  gridName: string;
  categories: string;
  primaryRoom: string;
}

export const tileMappings: TileMapping[] = [
  { tile: 'A1', gridName: 'Strategy.Law', categories: 'compliance, security, risk_assessment', primaryRoom: 'vault' },
  { tile: 'A2', gridName: 'Strategy.Goal', categories: 'accountability, time_management', primaryRoom: 'architect' },
  { tile: 'A3', gridName: 'Strategy.Fund', categories: 'resource_efficiency, domain_expertise', primaryRoom: 'performer' },
  { tile: 'B1', gridName: 'Tactics.Speed', categories: 'adaptability, reliability', primaryRoom: 'navigator' },
  { tile: 'B2', gridName: 'Tactics.Deal', categories: 'communication, collaboration, user_focus', primaryRoom: 'network' },
  { tile: 'B3', gridName: 'Tactics.Signal', categories: 'transparency, ethical_alignment', primaryRoom: 'voice' },
  { tile: 'C1', gridName: 'Operations.Grid', categories: 'code_quality, testing, data_integrity', primaryRoom: 'builder' },
  { tile: 'C2', gridName: 'Operations.Loop', categories: 'process_adherence, innovation', primaryRoom: 'laboratory' },
  { tile: 'C3', gridName: 'Operations.Flow', categories: 'reliability, documentation', primaryRoom: 'operator' },
];

export const tileMappingExplanation = 'This is how voice memos become identity updates: reaction on voice memo → ThetaSteer categorizes → maps to trust-debt categories → heat map updates → pipeline re-runs → sovereignty recalculates → FIM permissions shift.';

export const federation = {
  handshake: 'Two bots exchange 20-dimensional identity vectors',
  overlap: 'Cosine similarity computed — threshold 0.8 for trust, <0.8 rejected',
  alignment: 'Categories within 0.2 difference = aligned. >0.4 = divergent.',
  driftMonitoring: 'Periodic re-checks. If overlap drops below threshold → quarantine.',
  useCase: 'Two IntentGuard instances running in different companies can federate — sharing categorization insights while maintaining sovereignty.',
  sources: [
    '../intentguard/src/federation/tensor-overlap.ts',
    '../intentguard/src/federation/handshake.ts:88-129',
    '../intentguard/src/federation/registry.ts',
  ],
};
