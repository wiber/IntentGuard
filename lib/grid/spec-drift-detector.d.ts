/**
 * spec-drift-detector.ts — 12×12 Spec Drift Signal for Trust Debt
 *
 * Maps each tesseract grid cell to:
 *   1. What the spec says is important NOW (intent)
 *   2. What the repo actually shows (reality)
 *   3. Where drift exists (the signal)
 *
 * Grid layout: 3 rows (Strategy, Tactics, Operations) × 4 cols = 12 cells
 * Output: per-cell drift score + overall focus recommendations
 *
 * This is the "holama running nonstop" — designed to be called by the
 * scheduler (cron) to continuously detect where we're drifting from the spec.
 */
export interface CellMapping {
    cellId: string;
    label: string;
    fullName: string;
    row: string;
    specKeywords: string[];
    repoPaths: string[];
    room: string;
}
export interface CellIntent {
    cellId: string;
    specMentions: number;
    specStatus: 'active' | 'completed' | 'pending' | 'not_mentioned';
    specPriorities: string[];
    lastSpecUpdate: string;
}
export interface CellReality {
    cellId: string;
    recentCommits: number;
    fileCount: number;
    lastModified: string;
    testCoverage: 'has_tests' | 'no_tests' | 'unknown';
    linesOfCode: number;
}
export interface CellDrift {
    cellId: string;
    label: string;
    fullName: string;
    room: string;
    intent: CellIntent;
    reality: CellReality;
    driftScore: number;
    driftDirection: 'spec_ahead' | 'repo_ahead' | 'aligned' | 'both_cold';
    focusNeeded: boolean;
    recommendation: string;
}
export interface DriftSignal {
    timestamp: string;
    specSource: string;
    repoRoot: string;
    cells: CellDrift[];
    overallDrift: number;
    hotCells: string[];
    coldCells: string[];
    focusRecommendation: string;
    gridAscii: string;
}
declare const CELL_MAPPINGS: CellMapping[];
export declare function generateDriftSignal(repoRoot: string, specPath?: string, comsPath?: string): DriftSignal;
export { CELL_MAPPINGS };
//# sourceMappingURL=spec-drift-detector.d.ts.map