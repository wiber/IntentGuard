/**
 * 06-trust-debt.tsx — Trust-Debt Pipeline (Native to IntentGuard)
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: The 8-step pipeline that computes sovereignty scores. ALREADY BUILT.
 * DEPENDS ON: Nothing (this is the one thing that actually works)
 * EDITED BY: Any agent (low risk — documenting existing system)
 */

export const SECTION_ID = '06-trust-debt';
export const SECTION_TITLE = 'Trust-Debt Pipeline';

export interface PipelineStep {
  number: number;
  name: string;
  file: string;
  description: string;
}

export const pipelineSteps: PipelineStep[] = [
  { number: 0, name: 'Outcome Requirements', file: '0-outcome-requirements.json', description: '81 comprehensive outcome requirements extracted' },
  { number: 1, name: 'Indexed Keywords', file: '1-indexed-keywords.json', description: 'Keywords extracted from outcomes' },
  { number: 2, name: '20 Categories (Balanced)', file: '2-categories-balanced.json', description: 'Orthogonal category system with balanced weights' },
  { number: 3, name: 'Presence Matrix', file: '3-presence-matrix.json', description: 'Category presence per outcome requirement' },
  { number: 4, name: 'Grades & Statistics', file: '4-grades-statistics.json', description: 'Letter grades per category with statistical analysis' },
  { number: 5, name: 'Timeline History', file: '5-timeline-history.json', description: 'Historical progression of trust debt scores' },
  { number: 6, name: 'Analysis Narratives', file: '6-analysis-narratives.json', description: 'Human-readable analysis of each category' },
  { number: 7, name: 'Audit Log', file: '7-audit-log.json', description: 'Full audit trail of pipeline execution' },
];

export interface AgentDef {
  name: string;
  script: string;
  purpose: string;
  status: 'active' | 'inactive';
}

export const agents: AgentDef[] = [
  { name: 'Agent 1', script: 'agent-1-keyword-extractor.js', purpose: 'Extract keywords from outcome requirements', status: 'active' },
  { name: 'Agent 2', script: 'agent2-process-health-validator.js', purpose: 'Validate pipeline health', status: 'active' },
  { name: 'Agent 3', script: 'agent3-matrix-calculation-engine.js', purpose: 'Calculate presence matrix', status: 'active' },
  { name: 'Agent 4', script: 'agent4-integration-validator.js', purpose: 'Validate integration', status: 'active' },
  { name: 'Agent 6', script: 'comprehensive-trust-debt-analysis.js', purpose: 'Full analysis narratives', status: 'active' },
  { name: 'Agent 7', script: 'agent7-validation.js', purpose: 'Final validation + audit', status: 'active' },
  { name: 'Queen', script: 'unified-trust-debt-pipeline.js', purpose: 'Orchestrator — runs all agents in sequence', status: 'active' },
];
