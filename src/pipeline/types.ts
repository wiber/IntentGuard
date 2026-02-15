/**
 * src/pipeline/types.ts — Pipeline Type Definitions
 *
 * Shared TypeScript interfaces for the 8-step Trust Debt pipeline.
 * Used across all pipeline steps for type safety and validation.
 */

// ─── Step 0: Raw Materials ───────────────────────────────────

export interface RawDocument {
  id: string;
  type: 'commit' | 'blog' | 'document' | 'voice-memo';
  title: string;
  content: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface RawMaterials {
  step: 0;
  name: 'raw-materials';
  timestamp: string;
  documents: RawDocument[];
  stats: {
    commits: number;
    blogs: number;
    documents: number;
    voiceMemos: number;
    totalBytes: number;
  };
}

// ─── Step 1: Document Processing ─────────────────────────────

export interface ProcessedDocument {
  id: string;
  type: string;
  title: string;
  normalizedContent: string;
  sections: string[];
  keywords: string[];
  wordCount: number;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface ProcessingResult {
  step: 1;
  name: 'document-processing';
  timestamp: string;
  documents: ProcessedDocument[];
  stats: {
    totalProcessed: number;
    totalWords: number;
    avgWordCount: number;
    keywordFrequency: Record<string, number>;
  };
}

// ─── Step 2: Organic Extraction ──────────────────────────────

export interface TrustSignal {
  keyword: string;
  category: string;
  confidence: number;
  context: string;
  documentId: string;
  timestamp: string;
}

export interface OrganicExtraction {
  step: 2;
  name: 'organic-extraction';
  timestamp: string;
  signals: TrustSignal[];
  categories: string[];
  stats: {
    totalSignals: number;
    uniqueKeywords: number;
    avgConfidence: number;
    categoryDistribution: Record<string, number>;
  };
}

// ─── Step 3: Frequency Analysis ──────────────────────────────

export interface CategoryFrequency {
  category: string;
  count: number;
  keywords: string[];
  percentage: number;
  rank: number;
}

export interface FrequencyAnalysis {
  step: 3;
  name: 'frequency-analysis';
  timestamp: string;
  categories: CategoryFrequency[];
  totalSignals: number;
  stats: {
    topCategory: string;
    bottomCategory: string;
    avgFrequency: number;
    orthogonalityScore: number;
  };
}

// ─── Step 4: Grades & Statistics ─────────────────────────────

export type TrustDebtGrade = 'A' | 'B' | 'C' | 'D';

export interface CategoryScore {
  category: string;
  trustDebtUnits: number;
  grade: TrustDebtGrade;
  percentile: number;
  keywords: string[];
}

export interface GradesStatistics {
  step: 4;
  name: 'grades-statistics';
  timestamp: string;
  overallGrade: TrustDebtGrade;
  totalTrustDebtUnits: number;
  categories: CategoryScore[];
  gradeBoundaries: {
    A: { min: number; max: number; label: string };
    B: { min: number; max: number; label: string };
    C: { min: number; max: number; label: string };
    D: { min: number; max: number; label: string };
  };
  stats: {
    avgUnitsPerCategory: number;
    sovereigntyScore: number;
    processHealthScore: number;
    legitimacyScore: number;
  };
}

// ─── Step 5: Goal Alignment ──────────────────────────────────

export interface GoalAlignment {
  goal: string;
  category: string;
  alignmentScore: number;
  gap: number;
  recommendations: string[];
}

export interface GoalAlignmentResult {
  step: 5;
  name: 'goal-alignment';
  timestamp: string;
  declaredGoals: string[];
  alignments: GoalAlignment[];
  overallAlignment: number;
  stats: {
    wellAligned: number;
    needsAttention: number;
    misaligned: number;
    avgGap: number;
  };
}

// ─── Step 6: Symmetric Matrix ────────────────────────────────

export interface CategoryCorrelation {
  categoryA: string;
  categoryB: string;
  correlation: number;
  sharedKeywords: string[];
  orthogonalityScore: number;
}

export interface SymmetricMatrix {
  step: 6;
  name: 'symmetric-matrix';
  timestamp: string;
  dimensions: number;
  categories: string[];
  matrix: number[][]; // NxN correlation matrix
  correlations: CategoryCorrelation[];
  stats: {
    avgCorrelation: number;
    maxCorrelation: number;
    minCorrelation: number;
    orthogonalityTarget: number;
    orthogonalityActual: number;
  };
}

// ─── Step 7: Final Report ────────────────────────────────────

export interface ColdSpotAnalysis {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  gap: number;
  recommendations: string[];
}

export interface AsymmetricPattern {
  type: 'overclaimed' | 'underclaimed' | 'misaligned';
  categories: string[];
  description: string;
  impact: string;
}

export interface FinalReport {
  step: 7;
  name: 'final-report';
  timestamp: string;
  executiveSummary: {
    overallGrade: TrustDebtGrade;
    totalTrustDebtUnits: number;
    sovereigntyScore: number;
    keyFindings: string[];
  };
  coldSpots: ColdSpotAnalysis[];
  asymmetricPatterns: AsymmetricPattern[];
  actionableRecommendations: string[];
  timelineEvolution: {
    previousGrade?: TrustDebtGrade;
    currentGrade: TrustDebtGrade;
    trend: 'improving' | 'stable' | 'declining';
    deltaUnits: number;
  };
  validation: {
    pipelineIntegrity: boolean;
    dataQuality: number;
    completeness: number;
    errors: string[];
    warnings: string[];
  };
}

// ─── Pipeline Execution ──────────────────────────────────────

export interface StepResult {
  step: number;
  name: string;
  durationMs: number;
  outputFiles: number;
  outputBytes: number;
  success: boolean;
  error?: string;
}

export interface PipelineResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  steps: StepResult[];
  identity?: {
    sovereigntyScore: number;
    categoryCount: number;
  };
}

export interface PipelineOptions {
  from?: number;
  to?: number;
  dataDir?: string;
}

// ─── Validation & Error Handling ─────────────────────────────

export interface ValidationError {
  step: number;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ─── JSONL Event Types ───────────────────────────────────────

export interface JSONLEvent {
  ts: string;
  type: string;
  [key: string]: unknown;
}

export interface SwarmMemoryEvent extends JSONLEvent {
  agent?: number;
  group?: string;
  event: string;
  file?: string;
  status?: string;
}

export interface TaskEvent extends JSONLEvent {
  type: 'create' | 'update' | 'complete' | 'fail';
  id: string;
  task?: unknown;
  status?: string;
  extra?: Record<string, unknown>;
}

// ─── Type Guards ──────────────────────────────────────────────

export function isRawMaterials(obj: unknown): obj is RawMaterials {
  return typeof obj === 'object' && obj !== null &&
    'step' in obj && obj.step === 0 &&
    'documents' in obj && Array.isArray(obj.documents);
}

export function isProcessingResult(obj: unknown): obj is ProcessingResult {
  return typeof obj === 'object' && obj !== null &&
    'step' in obj && obj.step === 1 &&
    'documents' in obj && Array.isArray(obj.documents);
}

export function isOrganicExtraction(obj: unknown): obj is OrganicExtraction {
  return typeof obj === 'object' && obj !== null &&
    'step' in obj && obj.step === 2 &&
    'signals' in obj && Array.isArray(obj.signals);
}

export function isFrequencyAnalysis(obj: unknown): obj is FrequencyAnalysis {
  return typeof obj === 'object' && obj !== null &&
    'step' in obj && obj.step === 3 &&
    'categories' in obj && Array.isArray(obj.categories);
}

export function isGradesStatistics(obj: unknown): obj is GradesStatistics {
  return typeof obj === 'object' && obj !== null &&
    'step' in obj && obj.step === 4 &&
    'overallGrade' in obj;
}

export function isGoalAlignmentResult(obj: unknown): obj is GoalAlignmentResult {
  return typeof obj === 'object' && obj !== null &&
    'step' in obj && obj.step === 5 &&
    'alignments' in obj && Array.isArray(obj.alignments);
}

export function isSymmetricMatrix(obj: unknown): obj is SymmetricMatrix {
  return typeof obj === 'object' && obj !== null &&
    'step' in obj && obj.step === 6 &&
    'matrix' in obj && Array.isArray(obj.matrix);
}

export function isFinalReport(obj: unknown): obj is FinalReport {
  return typeof obj === 'object' && obj !== null &&
    'step' in obj && obj.step === 7 &&
    'executiveSummary' in obj;
}

export function isTrustDebtGrade(value: unknown): value is TrustDebtGrade {
  return typeof value === 'string' && ['A', 'B', 'C', 'D'].includes(value);
}
