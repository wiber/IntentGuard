/**
 * src/pipeline/utils.test.ts — Pipeline Utils Tests
 *
 * Vitest tests for JSONL operations, validation helpers, formatting,
 * statistical functions, and timestamp utilities.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  readJSONL,
  writeJSONL,
  appendJSONL,
  readRecentJSONL,
  filterJSONL,
  validateGrade,
  calculateGrade,
  getGradeLabel,
  formatNumber,
  formatBytes,
  formatDuration,
  truncate,
  generateId,
  average,
  median,
  stdDev,
  percentile,
  now,
  parseTimestamp,
  timeDiff,
} from './utils.js';
import type { JSONLEvent } from './types.js';

const TEST_DIR = join(import.meta.dirname || __dirname, '..', '..', 'test-data', 'pipeline-utils');

beforeEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('JSONL Operations', () => {
  it('should write and read JSONL', () => {
    const testFile = join(TEST_DIR, 'test1.jsonl');
    const events: JSONLEvent[] = [
      { ts: '2026-02-15T10:00:00Z', type: 'test', value: 1 },
      { ts: '2026-02-15T10:01:00Z', type: 'test', value: 2 },
    ];
    writeJSONL(testFile, events);
    const read = readJSONL(testFile);
    expect(read.length).toBe(2);
    expect(read[0].value).toBe(1);
  });

  it('should append JSONL events', () => {
    const testFile = join(TEST_DIR, 'test2.jsonl');
    appendJSONL(testFile, { ts: '2026-02-15T10:00:00Z', type: 'event1' });
    appendJSONL(testFile, { ts: '2026-02-15T10:01:00Z', type: 'event2' });
    const read = readJSONL(testFile);
    expect(read.length).toBe(2);
  });

  it('should read recent events', () => {
    const testFile = join(TEST_DIR, 'test3.jsonl');
    const events: JSONLEvent[] = [
      { ts: '2026-02-15T10:00:00Z', type: 'old1' },
      { ts: '2026-02-15T10:01:00Z', type: 'old2' },
      { ts: '2026-02-15T10:02:00Z', type: 'new1' },
      { ts: '2026-02-15T10:03:00Z', type: 'new2' },
    ];
    writeJSONL(testFile, events);
    const recent = readRecentJSONL(testFile, 2);
    expect(recent.length).toBe(2);
    expect(recent[0].type).toBe('new1');
  });

  it('should filter JSONL events', () => {
    const testFile = join(TEST_DIR, 'test4.jsonl');
    const events: JSONLEvent[] = [
      { ts: '2026-02-15T10:00:00Z', type: 'include', value: 1 },
      { ts: '2026-02-15T10:01:00Z', type: 'exclude', value: 2 },
      { ts: '2026-02-15T10:02:00Z', type: 'include', value: 3 },
    ];
    writeJSONL(testFile, events);
    const filtered = filterJSONL(testFile, (e) => e.type === 'include');
    expect(filtered.length).toBe(2);
  });

  it('should return empty array for non-existent file', () => {
    const nonExistent = readJSONL(join(TEST_DIR, 'nonexistent.jsonl'));
    expect(nonExistent.length).toBe(0);
  });
});

describe('Validation Helpers', () => {
  it('should validate correct grades', () => {
    expect(validateGrade('A')).toBe(true);
    expect(validateGrade('B')).toBe(true);
    expect(validateGrade('C')).toBe(true);
    expect(validateGrade('D')).toBe(true);
  });

  it('should reject invalid grades', () => {
    expect(validateGrade('E')).toBe(false);
    expect(validateGrade(1)).toBe(false);
  });

  it('should calculate grades from units', () => {
    expect(calculateGrade(0)).toBe('A');
    expect(calculateGrade(500)).toBe('A');
    expect(calculateGrade(501)).toBe('B');
    expect(calculateGrade(1500)).toBe('B');
    expect(calculateGrade(1501)).toBe('C');
    expect(calculateGrade(3000)).toBe('C');
    expect(calculateGrade(3001)).toBe('D');
  });

  it('should return correct grade labels', () => {
    expect(getGradeLabel('A')).toBe('\u{1F7E2} EXCELLENT');
    expect(getGradeLabel('B')).toBe('\u{1F7E1} GOOD');
    expect(getGradeLabel('C')).toBe('\u{1F7E0} NEEDS ATTENTION');
    expect(getGradeLabel('D')).toBe('\u{1F534} REQUIRES WORK');
  });
});

describe('Formatting Utilities', () => {
  it('should format numbers with thousands separators', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });

  it('should format duration', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(65000)).toBe('1.1m');
  });

  it('should truncate long strings', () => {
    expect(truncate('short', 10)).toBe('short');
    expect(truncate('this is a long string', 10)).toBe('this is...');
  });

  it('should generate IDs from strings', () => {
    expect(generateId('Test Name')).toBe('test-name');
    expect(generateId('Hello World!')).toBe('hello-world');
  });
});

describe('Statistical Functions', () => {
  it('should calculate average', () => {
    expect(average([1, 2, 3, 4, 5])).toBe(3);
    expect(average([])).toBe(0);
  });

  it('should calculate median', () => {
    expect(median([1, 2, 3, 4, 5])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it('should calculate standard deviation', () => {
    expect(stdDev([1, 2, 3, 4, 5])).toBeCloseTo(1.414, 2);
    expect(stdDev([10, 10, 10])).toBe(0);
  });

  it('should calculate percentiles', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(data, 50)).toBe(5.5);
    expect(percentile(data, 25)).toBeCloseTo(3.25, 2);
  });
});

describe('Timestamp Functions', () => {
  it('should return ISO timestamp from now()', () => {
    const timestamp = now();
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should parse timestamps correctly', () => {
    const date = parseTimestamp('2026-02-15T10:00:00Z');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBe(15);
  });

  it('should calculate time difference', () => {
    const diff = timeDiff('2026-02-15T10:00:00Z', '2026-02-15T10:01:00Z');
    expect(diff).toBe(60000);
  });
});
