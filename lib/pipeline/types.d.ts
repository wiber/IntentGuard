/**
 * src/pipeline/types.ts — Pipeline Type Definitions
 *
 * Shared TypeScript interfaces for the 8-step Trust Debt pipeline.
 * Used across all pipeline steps for type safety and validation.
 */
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
        A: {
            min: number;
            max: number;
            label: string;
        };
        B: {
            min: number;
            max: number;
            label: string;
        };
        C: {
            min: number;
            max: number;
            label: string;
        };
        D: {
            min: number;
            max: number;
            label: string;
        };
    };
    stats: {
        avgUnitsPerCategory: number;
        sovereigntyScore: number;
        processHealthScore: number;
        legitimacyScore: number;
    };
}
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
    matrix: number[][];
    correlations: CategoryCorrelation[];
    stats: {
        avgCorrelation: number;
        maxCorrelation: number;
        minCorrelation: number;
        orthogonalityTarget: number;
        orthogonalityActual: number;
    };
}
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
export declare function isRawMaterials(obj: unknown): obj is RawMaterials;
export declare function isProcessingResult(obj: unknown): obj is ProcessingResult;
export declare function isOrganicExtraction(obj: unknown): obj is OrganicExtraction;
export declare function isFrequencyAnalysis(obj: unknown): obj is FrequencyAnalysis;
export declare function isGradesStatistics(obj: unknown): obj is GradesStatistics;
export declare function isGoalAlignmentResult(obj: unknown): obj is GoalAlignmentResult;
export declare function isSymmetricMatrix(obj: unknown): obj is SymmetricMatrix;
export declare function isFinalReport(obj: unknown): obj is FinalReport;
export declare function isTrustDebtGrade(value: unknown): value is TrustDebtGrade;
//# sourceMappingURL=types.d.ts.map