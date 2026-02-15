/**
 * src/pipeline/utils.test.ts — Pipeline Utils Tests
 *
 * Simple validation tests that can be run directly with tsx.
 * Run with: npx tsx src/pipeline/utils.test.ts
 */

import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
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

// Simple test runner
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`✅ ${message}`);
  } else {
    failed++;
    console.error(`❌ ${message}`);
  }
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  assert(match, `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertApproxEquals(actual: number, expected: number, tolerance: number, message: string): void {
  const match = Math.abs(actual - expected) <= tolerance;
  assert(match, `${message}: expected ~${expected}, got ${actual}`);
}

// Setup
console.log('\n🧪 Pipeline Utils Test Suite\n');

if (existsSync(TEST_DIR)) {
  rmSync(TEST_DIR, { recursive: true, force: true });
}
mkdirSync(TEST_DIR, { recursive: true });

// ─── JSONL Operations Tests ──────────────────────────────────

console.log('📝 Testing JSONL Operations...\n');

// Test 1: Write and read JSONL
const testFile1 = join(TEST_DIR, 'test1.jsonl');
const events1: JSONLEvent[] = [
  { ts: '2026-02-15T10:00:00Z', type: 'test', value: 1 },
  { ts: '2026-02-15T10:01:00Z', type: 'test', value: 2 },
];
writeJSONL(testFile1, events1);
const read1 = readJSONL(testFile1);
assertEquals(read1.length, 2, 'Read correct number of events');
assertEquals(read1[0].value, 1, 'Read first event value');

// Test 2: Append JSONL
const testFile2 = join(TEST_DIR, 'test2.jsonl');
appendJSONL(testFile2, { ts: '2026-02-15T10:00:00Z', type: 'event1' });
appendJSONL(testFile2, { ts: '2026-02-15T10:01:00Z', type: 'event2' });
const read2 = readJSONL(testFile2);
assertEquals(read2.length, 2, 'Append creates multiple events');

// Test 3: Read recent events
const testFile3 = join(TEST_DIR, 'test3.jsonl');
const events3: JSONLEvent[] = [
  { ts: '2026-02-15T10:00:00Z', type: 'old1' },
  { ts: '2026-02-15T10:01:00Z', type: 'old2' },
  { ts: '2026-02-15T10:02:00Z', type: 'new1' },
  { ts: '2026-02-15T10:03:00Z', type: 'new2' },
];
writeJSONL(testFile3, events3);
const recent = readRecentJSONL(testFile3, 2);
assertEquals(recent.length, 2, 'Read recent returns correct count');
assertEquals(recent[0].type, 'new1', 'Recent events are last N');

// Test 4: Filter JSONL
const testFile4 = join(TEST_DIR, 'test4.jsonl');
const events4: JSONLEvent[] = [
  { ts: '2026-02-15T10:00:00Z', type: 'include', value: 1 },
  { ts: '2026-02-15T10:01:00Z', type: 'exclude', value: 2 },
  { ts: '2026-02-15T10:02:00Z', type: 'include', value: 3 },
];
writeJSONL(testFile4, events4);
const filtered = filterJSONL(testFile4, (e) => e.type === 'include');
assertEquals(filtered.length, 2, 'Filter returns correct count');

// Test 5: Read non-existent file
const nonExistent = readJSONL(join(TEST_DIR, 'nonexistent.jsonl'));
assertEquals(nonExistent.length, 0, 'Non-existent file returns empty array');

// ─── Validation Tests ─────────────────────────────────────────

console.log('\n✅ Testing Validation Helpers...\n');

// Test grades
assert(validateGrade('A'), 'Grade A is valid');
assert(validateGrade('B'), 'Grade B is valid');
assert(validateGrade('C'), 'Grade C is valid');
assert(validateGrade('D'), 'Grade D is valid');
assert(!validateGrade('E'), 'Grade E is invalid');
assert(!validateGrade(1), 'Number is not a grade');

// Test grade calculation
assertEquals(calculateGrade(0), 'A', 'Calculate grade A (0 units)');
assertEquals(calculateGrade(500), 'A', 'Calculate grade A (500 units)');
assertEquals(calculateGrade(501), 'B', 'Calculate grade B (501 units)');
assertEquals(calculateGrade(1500), 'B', 'Calculate grade B (1500 units)');
assertEquals(calculateGrade(1501), 'C', 'Calculate grade C (1501 units)');
assertEquals(calculateGrade(3000), 'C', 'Calculate grade C (3000 units)');
assertEquals(calculateGrade(3001), 'D', 'Calculate grade D (3001 units)');

// Test grade labels
assertEquals(getGradeLabel('A'), '🟢 EXCELLENT', 'Grade A label');
assertEquals(getGradeLabel('B'), '🟡 GOOD', 'Grade B label');
assertEquals(getGradeLabel('C'), '🟠 NEEDS ATTENTION', 'Grade C label');
assertEquals(getGradeLabel('D'), '🔴 REQUIRES WORK', 'Grade D label');

// ─── Formatting Tests ─────────────────────────────────────────

console.log('\n🎨 Testing Formatting Utilities...\n');

assertEquals(formatNumber(1000), '1,000', 'Format 1000');
assertEquals(formatNumber(1234567), '1,234,567', 'Format millions');

assertEquals(formatBytes(500), '500 B', 'Format bytes');
assertEquals(formatBytes(1024), '1.0 KB', 'Format KB');
assertEquals(formatBytes(1024 * 1024), '1.0 MB', 'Format MB');

assertEquals(formatDuration(500), '500ms', 'Format milliseconds');
assertEquals(formatDuration(1500), '1.5s', 'Format seconds');
assertEquals(formatDuration(65000), '1.1m', 'Format minutes');

assertEquals(truncate('short', 10), 'short', 'No truncation needed');
assertEquals(truncate('this is a long string', 10), 'this is...', 'Truncate long string');

assertEquals(generateId('Test Name'), 'test-name', 'Generate ID from name');
assertEquals(generateId('Hello World!'), 'hello-world', 'Generate ID with punctuation');

// ─── Statistical Tests ────────────────────────────────────────

console.log('\n📊 Testing Statistical Functions...\n');

assertEquals(average([1, 2, 3, 4, 5]), 3, 'Calculate average');
assertEquals(average([]), 0, 'Average of empty array');

assertEquals(median([1, 2, 3, 4, 5]), 3, 'Calculate median odd');
assertEquals(median([1, 2, 3, 4]), 2.5, 'Calculate median even');
assertEquals(median([]), 0, 'Median of empty array');

assertApproxEquals(stdDev([1, 2, 3, 4, 5]), 1.414, 0.01, 'Calculate standard deviation');
assertEquals(stdDev([10, 10, 10]), 0, 'StdDev of constant array');

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
assertEquals(percentile(data, 50), 5.5, 'Calculate 50th percentile');
assertApproxEquals(percentile(data, 25), 3.25, 0.01, 'Calculate 25th percentile');

// ─── Timestamp Tests ──────────────────────────────────────────

console.log('\n⏰ Testing Timestamp Functions...\n');

const timestamp = now();
assert(timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) !== null, 'Now returns ISO timestamp');

const date = parseTimestamp('2026-02-15T10:00:00Z');
assertEquals(date.getFullYear(), 2026, 'Parse year');
assertEquals(date.getMonth(), 1, 'Parse month (0-indexed)');
assertEquals(date.getDate(), 15, 'Parse day');

const diff = timeDiff('2026-02-15T10:00:00Z', '2026-02-15T10:01:00Z');
assertEquals(diff, 60000, 'Calculate time difference');

// ─── Cleanup ──────────────────────────────────────────────────

if (existsSync(TEST_DIR)) {
  rmSync(TEST_DIR, { recursive: true, force: true });
}

// ─── Results ──────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ All tests passed!\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed\n');
  process.exit(1);
}
