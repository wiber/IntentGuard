/**
 * src/pipeline/utils.ts — Pipeline Utilities
 *
 * JSONL reader/writer, validation helpers, and shared utilities
 * for the Trust Debt pipeline.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
// ─── JSONL Operations ────────────────────────────────────────
/**
 * Read and parse a JSONL file into an array of events.
 * Each line is parsed as JSON. Invalid lines are skipped with optional logging.
 */
export function readJSONL(filePath, options) {
    if (!existsSync(filePath)) {
        return [];
    }
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const events = [];
    for (const line of lines) {
        try {
            const parsed = JSON.parse(line);
            events.push(parsed);
        }
        catch (error) {
            if (options?.onError) {
                options.onError(line, error);
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
export function writeJSONL(filePath, events, options) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    const lines = events.map(event => JSON.stringify(event)).join('\n') + '\n';
    if (options?.append) {
        appendFileSync(filePath, lines);
    }
    else {
        writeFileSync(filePath, lines);
    }
}
/**
 * Append a single event to a JSONL file.
 * Creates the file and parent directories if they don't exist.
 */
export function appendJSONL(filePath, event) {
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
export function readRecentJSONL(filePath, count) {
    const allEvents = readJSONL(filePath, { skipInvalid: true });
    return allEvents.slice(-count);
}
/**
 * Filter JSONL events by a predicate function.
 */
export function filterJSONL(filePath, predicate) {
    const allEvents = readJSONL(filePath, { skipInvalid: true });
    return allEvents.filter(predicate);
}
// ─── Validation Helpers ───────────────────────────────────────
/**
 * Validate that a pipeline step output exists and is well-formed JSON.
 */
export function validateStepOutput(stepDir, stepNum, expectedKeys) {
    const errors = [];
    const warnings = [];
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
    let outputFile = null;
    const { readdirSync } = require('fs');
    try {
        const files = readdirSync(stepDir);
        outputFile = files.find((f) => f.endsWith('.json') && (f.startsWith(`${stepNum}-`) || f.startsWith('step-')));
    }
    catch (error) {
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
    }
    catch (error) {
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
export function validateGrade(grade) {
    return typeof grade === 'string' && ['A', 'B', 'C', 'D'].includes(grade);
}
/**
 * Calculate Trust Debt grade from total units.
 */
export function calculateGrade(totalUnits) {
    if (totalUnits <= 500)
        return 'A';
    if (totalUnits <= 1500)
        return 'B';
    if (totalUnits <= 3000)
        return 'C';
    return 'D';
}
/**
 * Get grade label and emoji.
 */
export function getGradeLabel(grade) {
    const labels = {
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
export function validatePipelineIntegrity(runDir, expectedSteps = [0, 1, 2, 3, 4, 5, 6, 7]) {
    const errors = [];
    const warnings = [];
    for (const step of expectedSteps) {
        const stepDirs = [
            join(runDir, `${step}-*`),
            join(runDir, `step-${step}`),
        ];
        let found = false;
        const { readdirSync } = require('fs');
        try {
            const dirs = readdirSync(runDir);
            found = dirs.some((d) => d.startsWith(`${step}-`) || d === `step-${step}`);
        }
        catch {
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
export function loadStepOutput(stepDir, stepNum) {
    const { readdirSync } = require('fs');
    const files = readdirSync(stepDir);
    const outputFile = files.find((f) => f.endsWith('.json') && (f.startsWith(`${stepNum}-`) || f.startsWith('step-')));
    if (!outputFile) {
        throw new Error(`No output file found for step ${stepNum} in ${stepDir}`);
    }
    const content = readFileSync(join(stepDir, outputFile), 'utf-8');
    return JSON.parse(content);
}
/**
 * Load all step outputs from a pipeline run.
 */
export function loadPipelineOutputs(runDir) {
    const outputs = {};
    const { readdirSync } = require('fs');
    try {
        const dirs = readdirSync(runDir);
        for (let i = 0; i <= 7; i++) {
            const stepDir = dirs.find((d) => d.startsWith(`${i}-`));
            if (stepDir) {
                try {
                    const output = loadStepOutput(join(runDir, stepDir), i);
                    outputs[`step${i}`] = output;
                }
                catch {
                    // Skip missing or invalid step
                }
            }
        }
    }
    catch {
        // Directory doesn't exist
    }
    return outputs;
}
// ─── String & Number Utilities ────────────────────────────────
/**
 * Format a number with thousands separators.
 */
export function formatNumber(n) {
    return n.toLocaleString('en-US');
}
/**
 * Format bytes as human-readable size.
 */
export function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
/**
 * Format milliseconds as human-readable duration.
 */
export function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000)
        return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
}
/**
 * Truncate string to max length with ellipsis.
 */
export function truncate(str, maxLength) {
    if (str.length <= maxLength)
        return str;
    return str.slice(0, maxLength - 3) + '...';
}
/**
 * Generate a deterministic ID from a string.
 */
export function generateId(input) {
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
export function average(numbers) {
    if (numbers.length === 0)
        return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}
/**
 * Calculate median of an array of numbers.
 */
export function median(numbers) {
    if (numbers.length === 0)
        return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}
/**
 * Calculate standard deviation.
 */
export function stdDev(numbers) {
    if (numbers.length === 0)
        return 0;
    const avg = average(numbers);
    const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
    return Math.sqrt(average(squareDiffs));
}
/**
 * Calculate percentile (0-100).
 */
export function percentile(numbers, p) {
    if (numbers.length === 0)
        return 0;
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
export function now() {
    return new Date().toISOString();
}
/**
 * Parse ISO timestamp to Date.
 */
export function parseTimestamp(ts) {
    return new Date(ts);
}
/**
 * Format timestamp for display.
 */
export function formatTimestamp(ts) {
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
export function timeDiff(start, end) {
    return parseTimestamp(end).getTime() - parseTimestamp(start).getTime();
}
//# sourceMappingURL=utils.js.map