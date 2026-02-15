/**
 * 18-business-objectives.tsx — Business Objectives (Inferred from Codebase)
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Patents, revenue strategy, competitive advantage.
 * DEPENDS ON: Nothing
 * EDITED BY: Architect agent
 */

export const SECTION_ID = '18-business-objectives';
export const SECTION_TITLE = 'Business Objectives (Inferred from Codebase)';

export interface PatentFiling {
  number: string;
  date: string;
  title: string;
  strategicValue: string;
}

export const coreThesis = 'IntentGuard quantifies "Trust Debt" — the measurable gap between what you intended to build and what you actually built. This becomes infrastructure for AI safety compliance (EU AI Act Article 6, August 2025 enforcement).';

export const patents: PatentFiling[] = [
  { number: '63/782,569', date: 'Dec 2023', title: 'Unity Architecture: Position-Meaning Correspondence', strategicValue: 'The math foundation — S=P=H' },
  { number: '63/854,530', date: 'Apr 2024', title: 'Cognitive Prosthetic Amplification via Unity Architecture', strategicValue: 'The application layer — AI augmenting human decision-making' },
  { number: '63/XXX,XXX', date: 'Jan 2025', title: 'Asymmetric Matrix Trust Debt Calculation System', strategicValue: 'The measurement engine — 20-category trust scoring' },
  { number: '63/XXX,XXX', date: 'Feb 2025', title: 'Real-Time AI Behavior Drift Detection System', strategicValue: 'The guard — FIM permission gating on every tool call' },
];

export interface RevenuePhase {
  name: string;
  status: 'current' | 'planned';
  color: string;
  description: string;
  revenue: string;
  metric: string;
  source?: string;
}

export const revenuePhases: RevenuePhase[] = [
  {
    name: 'Phase 1: Open-Source Proof',
    status: 'current',
    color: 'var(--green)',
    description: 'Free git-based Trust Debt analysis. MIT License. Proves the math works on real repositories. Nature/Science paper submission for scientific credibility.',
    revenue: '$0 (credibility building)',
    metric: '10,000+ repos analyzed',
    source: '../intentguard/docs/patents/NATURE_PAPER_STRATEGY.md',
  },
  {
    name: 'Phase 2: SaaS Platform',
    status: 'planned',
    color: 'var(--yellow)',
    description: 'AI output trust measurement platform. Patent-protected. Every AI system needs Trust Debt scoring for EU AI Act compliance. $420B+ addressable market.',
    revenue: 'SaaS subscription',
    metric: 'Patent portfolio + scientific publication',
  },
  {
    name: 'Phase 3: Regulatory Authority',
    status: 'planned',
    color: 'var(--purple)',
    description: 'Nature/Science paper establishes IntentGuard as the reference standard for AI compliance measurement. Regulatory bodies adopt Trust Debt terminology.',
    revenue: 'Enterprise licensing + consulting',
    metric: 'Scientific authority + patent lock',
    source: '../intentguard/docs/01-business/INTENTGUARD_BUSINESS_PLAN.md',
  },
];

export const competitiveAdvantage = [
  { label: 'Self-referential', detail: 'IntentGuard runs on itself. The Sovereign Engine measures its own trust debt while operating. The product is its own proof-of-concept.' },
  { label: 'Public audit trail', detail: '#trust-debt-public Discord channel shows real-time drift catches. Anyone can verify the Guard works.' },
  { label: 'Voice memo training signal', detail: 'Every human reaction (fire/zap/thumbsup/ice) on voice memos trains the geometric identity. The training data is the actual business operation — not synthetic benchmarks.' },
  { label: 'Open-source trust', detail: 'Fork IntentGuard, run your own Sovereign Engine. The patent protects the SaaS measurement service, not the self-driving bot.' },
];
