/**
 * src/pipeline/utils.ts — Pipeline Utilities
 *
 * JSONL reader/writer, validation helpers, and shared utilities
 * for the Trust Debt pipeline.
 */
import type { JSONLEvent, ValidationResult, TrustDebtGrade, RawMaterials, ProcessingResult, OrganicExtraction, FrequencyAnalysis, GradesStatistics, GoalAlignmentResult, SymmetricMatrix, FinalReport } from './types.js';
/**
 * Read and parse a JSONL file into an array of events.
 * Each line is parsed as JSON. Invalid lines are skipped with optional logging.
 */
export declare function readJSONL<T extends JSONLEvent = JSONLEvent>(filePath: string, options?: {
    skipInvalid?: boolean;
    onError?: (line: string, error: Error) => void;
}): T[];
/**
 * Write an array of events to a JSONL file.
 * Each event is stringified and written on a separate line.
 */
export declare function writeJSONL<T extends JSONLEvent = JSONLEvent>(filePath: string, events: T[], options?: {
    append?: boolean;
}): void;
/**
 * Append a single event to a JSONL file.
 * Creates the file and parent directories if they don't exist.
 */
export declare function appendJSONL<T extends JSONLEvent = JSONLEvent>(filePath: string, event: T): void;
/**
 * Read the most recent N events from a JSONL file.
 * Returns events in chronological order (oldest first).
 */
export declare function readRecentJSONL<T extends JSONLEvent = JSONLEvent>(filePath: string, count: number): T[];
/**
 * Filter JSONL events by a predicate function.
 */
export declare function filterJSONL<T extends JSONLEvent = JSONLEvent>(filePath: string, predicate: (event: T) => boolean): T[];
/**
 * Validate that a pipeline step output exists and is well-formed JSON.
 */
export declare function validateStepOutput(stepDir: string, stepNum: number, expectedKeys: string[]): ValidationResult;
/**
 * Validate Trust Debt grade value.
 */
export declare function validateGrade(grade: unknown): grade is TrustDebtGrade;
/**
 * Calculate Trust Debt grade from total units.
 */
export declare function calculateGrade(totalUnits: number): TrustDebtGrade;
/**
 * Get grade label and emoji.
 */
export declare function getGradeLabel(grade: TrustDebtGrade): string;
/**
 * Validate that all pipeline steps have completed successfully.
 */
export declare function validatePipelineIntegrity(runDir: string, expectedSteps?: number[]): ValidationResult;
/**
 * Load step output as typed JSON.
 */
export declare function loadStepOutput<T>(stepDir: string, stepNum: number): T;
/**
 * Load all step outputs from a pipeline run.
 */
export declare function loadPipelineOutputs(runDir: string): {
    step0?: RawMaterials;
    step1?: ProcessingResult;
    step2?: OrganicExtraction;
    step3?: FrequencyAnalysis;
    step4?: GradesStatistics;
    step5?: GoalAlignmentResult;
    step6?: SymmetricMatrix;
    step7?: FinalReport;
};
/**
 * Format a number with thousands separators.
 */
export declare function formatNumber(n: number): string;
/**
 * Format bytes as human-readable size.
 */
export declare function formatBytes(bytes: number): string;
/**
 * Format milliseconds as human-readable duration.
 */
export declare function formatDuration(ms: number): string;
/**
 * Truncate string to max length with ellipsis.
 */
export declare function truncate(str: string, maxLength: number): string;
/**
 * Generate a deterministic ID from a string.
 */
export declare function generateId(input: string): string;
/**
 * Calculate average of an array of numbers.
 */
export declare function average(numbers: number[]): number;
/**
 * Calculate median of an array of numbers.
 */
export declare function median(numbers: number[]): number;
/**
 * Calculate standard deviation.
 */
export declare function stdDev(numbers: number[]): number;
/**
 * Calculate percentile (0-100).
 */
export declare function percentile(numbers: number[], p: number): number;
/**
 * Get current ISO timestamp.
 */
export declare function now(): string;
/**
 * Parse ISO timestamp to Date.
 */
export declare function parseTimestamp(ts: string): Date;
/**
 * Format timestamp for display.
 */
export declare function formatTimestamp(ts: string): string;
/**
 * Calculate duration between two timestamps.
 */
export declare function timeDiff(start: string, end: string): number;
//# sourceMappingURL=utils.d.ts.map