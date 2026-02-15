/**
 * src/pipeline/utils.ts — Pipeline Utilities
 *
 * JSONL reader/writer, validation helpers, and shared utilities
 * for the Trust Debt pipeline.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type {
  JSONLEvent,
  ValidationError,
  ValidationResult,
  TrustDebtGrade,
  RawMaterials,
  ProcessingResult,
  OrganicExtraction,
  FrequencyAnalysis,
  GradesStatistics,
  GoalAlignmentResult,
  SymmetricMatrix,
  FinalReport,
} from './types.js';

// ─── JSONL Operations ────────────────────────────────────────

/**
 * Read and parse a JSONL file into an array of events.
 * Each line is parsed as JSON. Invalid lines are skipped with optional logging.
 */
export function readJSONL<T extends JSONLEvent = JSONLEvent>(
  filePath: string,
  options?: { skipInvalid?: boolean; onError?: (line: string, error: Error) => void }
): T[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  const events: T[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      events.push(parsed as T);
    } catch (error) {
      if (options?.onError) {
        options.onError(line, error as Error);
      }
      if (!options?.skipInvalid) {
        throw new Error(`Invalid JSONL line: ${line.slice(0, 100)}...`);
      }
    }
  }

  return events;
}

/**
 * Write an array of events to a JSONL file.
 * Each event is stringified and written on a separate line.
 */
export function writeJSONL<T extends JSONLEvent = JSONLEvent>(
  filePath: string,
  events: T[],
  options?: { append?: boolean }
): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const lines = events.map(event => JSON.stringify(event)).join('\n') + '\n';

  if (options?.append) {
    appendFileSync(filePath, lines);
  } else {
    writeFileSync(filePath, lines);
  }
}

/**
 * Append a single event to a JSONL file.
 * Creates the file and parent directories if they don't exist.
 */
export function appendJSONL<T extends JSONLEvent = JSONLEvent>(
  filePath: string,
  event: T
): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const line = JSON.stringify(event) + '\n';
  appendFileSync(filePath, line);
}

/**
 * Read the most recent N events from a JSONL file.
 * Returns events in chronological order (oldest first).
 */
export function readRecentJSONL<T extends JSONLEvent = JSONLEvent>(
  filePath: string,
  count: number
): T[] {
  const allEvents = readJSONL<T>(filePath, { skipInvalid: true });
  return allEvents.slice(-count);
}

/**
 * Filter JSONL events by a predicate function.
 */
export function filterJSONL<T extends JSONLEvent = JSONLEvent>(
  filePath: string,
  predicate: (event: T) => boolean
): T[] {
  const allEvents = readJSONL<T>(filePath, { skipInvalid: true });
  return allEvents.filter(predicate);
}

// ─── Validation Helpers ───────────────────────────────────────

/**
 * Validate that a pipeline step output exists and is well-formed JSON.
 */
export function validateStepOutput(
  stepDir: string,
  stepNum: number,
  expectedKeys: string[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check if step directory exists
  if (!existsSync(stepDir)) {
    errors.push({
      step: stepNum,
      field: 'directory',
      message: `Step directory does not exist: ${stepDir}`,
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  // Find output file
  const outputFiles = [
    join(stepDir, `${stepNum}-*.json`),
    join(stepDir, `step-${stepNum}.json`),
  ];

  let outputFile: string | null = null;
  const { readdirSync } = require('fs');

  try {
    const files = readdirSync(stepDir);
    outputFile = files.find((f: string) =>
      f.endsWith('.json') && (f.startsWith(`${stepNum}-`) || f.startsWith('step-'))
    );
  } catch (error) {
    errors.push({
      step: stepNum,
      field: 'output',
      message: `Cannot read step directory: ${error}`,
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  if (!outputFile) {
    errors.push({
      step: stepNum,
      field: 'output',
      message: `No output JSON file found in ${stepDir}`,
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  // Parse and validate JSON
  const fullPath = join(stepDir, outputFile);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(content);

    // Check for expected keys
    for (const key of expectedKeys) {
      if (!(key in data)) {
        errors.push({
          step: stepNum,
          field: key,
          message: `Missing required field: ${key}`,
          severity: 'error',
        });
      }
    }

    // Check step number matches
    if (data.step !== undefined && data.step !== stepNum) {
      warnings.push({
        step: stepNum,
        field: 'step',
        message: `Step number mismatch: expected ${stepNum}, got ${data.step}`,
        severity: 'warning',
      });
    }

  } catch (error) {
    errors.push({
      step: stepNum,
      field: 'json',
      message: `Invalid JSON: ${error}`,
      severity: 'error',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Trust Debt grade value.
 */
export function validateGrade(grade: unknown): grade is TrustDebtGrade {
  return typeof grade === 'string' && ['A', 'B', 'C', 'D'].includes(grade);
}

/**
 * Calculate Trust Debt grade from total units.
 */
export function calculateGrade(totalUnits: number): TrustDebtGrade {
  if (totalUnits <= 500) return 'A';
  if (totalUnits <= 1500) return 'B';
  if (totalUnits <= 3000) return 'C';
  return 'D';
}

/**
 * Get grade label and emoji.
 */
export function getGradeLabel(grade: TrustDebtGrade): string {
  const labels: Record<TrustDebtGrade, string> = {
    A: '🟢 EXCELLENT',
    B: '🟡 GOOD',
    C: '🟠 NEEDS ATTENTION',
    D: '🔴 REQUIRES WORK',
  };
  return labels[grade];
}

/**
 * Validate that all pipeline steps have completed successfully.
 */
export function validatePipelineIntegrity(
  runDir: string,
  expectedSteps: number[] = [0, 1, 2, 3, 4, 5, 6, 7]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (const step of expectedSteps) {
    const stepDirs = [
      join(runDir, `${step}-*`),
      join(runDir, `step-${step}`),
    ];

    let found = false;
    const { readdirSync } = require('fs');

    try {
      const dirs = readdirSync(runDir);
      found = dirs.some((d: string) =>
        d.startsWith(`${step}-`) || d === `step-${step}`
      );
    } catch {
      // Directory doesn't exist
    }

    if (!found) {
      errors.push({
        step,
        field: 'directory',
        message: `Step ${step} output directory not found`,
        severity: 'error',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Data Loading Helpers ─────────────────────────────────────

/**
 * Load step output as typed JSON.
 */
export function loadStepOutput<T>(stepDir: string, stepNum: number): T {
  const { readdirSync } = require('fs');
  const files = readdirSync(stepDir);
  const outputFile = files.find((f: string) =>
    f.endsWith('.json') && (f.startsWith(`${stepNum}-`) || f.startsWith('step-'))
  );

  if (!outputFile) {
    throw new Error(`No output file found for step ${stepNum} in ${stepDir}`);
  }

  const content = readFileSync(join(stepDir, outputFile), 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Load all step outputs from a pipeline run.
 */
export function loadPipelineOutputs(runDir: string): {
  step0?: RawMaterials;
  step1?: ProcessingResult;
  step2?: OrganicExtraction;
  step3?: FrequencyAnalysis;
  step4?: GradesStatistics;
  step5?: GoalAlignmentResult;
  step6?: SymmetricMatrix;
  step7?: FinalReport;
} {
  const outputs: Record<string, unknown> = {};
  const { readdirSync } = require('fs');

  try {
    const dirs = readdirSync(runDir);

    for (let i = 0; i <= 7; i++) {
      const stepDir = dirs.find((d: string) => d.startsWith(`${i}-`));
      if (stepDir) {
        try {
          const output = loadStepOutput(join(runDir, stepDir), i);
          outputs[`step${i}`] = output;
        } catch {
          // Skip missing or invalid step
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return outputs as ReturnType<typeof loadPipelineOutputs>;
}

// ─── String & Number Utilities ────────────────────────────────

/**
 * Format a number with thousands separators.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Format bytes as human-readable size.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format milliseconds as human-readable duration.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Truncate string to max length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Generate a deterministic ID from a string.
 */
export function generateId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

// ─── Statistical Helpers ──────────────────────────────────────

/**
 * Calculate average of an array of numbers.
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Calculate median of an array of numbers.
 */
export function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate standard deviation.
 */
export function stdDev(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const avg = average(numbers);
  const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
  return Math.sqrt(average(squareDiffs));
}

/**
 * Calculate percentile (0-100).
 */
export function percentile(numbers: number[], p: number): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// ─── Timestamp Helpers ────────────────────────────────────────

/**
 * Get current ISO timestamp.
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Parse ISO timestamp to Date.
 */
export function parseTimestamp(ts: string): Date {
  return new Date(ts);
}

/**
 * Format timestamp for display.
 */
export function formatTimestamp(ts: string): string {
  const date = parseTimestamp(ts);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate duration between two timestamps.
 */
export function timeDiff(start: string, end: string): number {
  return parseTimestamp(end).getTime() - parseTimestamp(start).getTime();
}
