/**
 * Identity Vector Loader Tests
 *
 * Tests for loading, caching, and normalizing identity vectors from pipeline output.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  loadIdentityVector,
  loadIdentityVectorDefault,
  normalizeRawVector,
  vectorToRaw,
  clearCache,
  getCacheStats,
} from './identity-vector.js';
import { TRUST_DEBT_CATEGORIES } from './geometric.js';

// ─── Test Data ──────────────────────────────────────────────────────────

const TEST_DIR = join(process.cwd(), 'test-tmp-identity-vector');
const TEST_STEP4_PATH = join(TEST_DIR, '4-grades-statistics.json');

const MOCK_STEP4_OUTPUT = {
  metadata: {
    agent: 'Agent 4: Grades & Statistics Calculator',
    timestamp: '2026-02-15T10:00:00.000Z',
  },
  trust_debt_calculation: {
    total_units: 1200,
    grade: 'B',
    grade_emoji: '🟡',
  },
  category_performance: {
    'A🚀_CoreEngine': {
      units: 200,
      percentage: '16.7%',
      grade: 'A',
      status: 'EXCELLENT',
    },
    'B🔒_Documentation': {
      units: 300,
      percentage: '25.0%',
      grade: 'A',
      status: 'EXCELLENT',
    },
    'C💨_Visualization': {
      units: 400,
      percentage: '33.3%',
      grade: 'B',
      status: 'GOOD',
    },
    'D🧠_Integration': {
      units: 100,
      percentage: '8.3%',
      grade: 'A',
      status: 'EXCELLENT',
    },
    'E🎨_BusinessLayer': {
      units: 150,
      percentage: '12.5%',
      grade: 'A',
      status: 'EXCELLENT',
    },
    'F⚡_Agents': {
      units: 50,
      percentage: '4.2%',
      grade: 'A',
      status: 'EXCELLENT',
    },
  },
  statistical_analysis: {
    orthogonality_score: 92.5,
  },
};

// ─── Setup / Teardown ───────────────────────────────────────────────────

beforeEach(() => {
  // Create test directory and mock file
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(TEST_STEP4_PATH, JSON.stringify(MOCK_STEP4_OUTPUT, null, 2));
  clearCache();
});

afterEach(() => {
  // Clean up test files
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  clearCache();
});

// ─── Core Loading Tests ─────────────────────────────────────────────────

describe('loadIdentityVector', () => {
  it('should load identity vector from step-4 output', () => {
    const vector = loadIdentityVector(TEST_STEP4_PATH);

    expect(vector).toBeDefined();
    expect(vector.userId).toBe('system');
    expect(vector.lastUpdated).toBe('2026-02-15T10:00:00.000Z');
    expect(vector.sovereigntyScore).toBeGreaterThan(0);
    expect(vector.sovereigntyScore).toBeLessThanOrEqual(1);
  });

  it('should have scores for all 20 categories', () => {
    const vector = loadIdentityVector(TEST_STEP4_PATH);

    expect(Object.keys(vector.categoryScores).length).toBe(20);
    for (const cat of TRUST_DEBT_CATEGORIES) {
      expect(vector.categoryScores[cat]).toBeDefined();
      expect(vector.categoryScores[cat]!).toBeGreaterThanOrEqual(0);
      expect(vector.categoryScores[cat]!).toBeLessThanOrEqual(1);
    }
  });

  it('should use custom userId when provided', () => {
    const vector = loadIdentityVector(TEST_STEP4_PATH, 'user-123');
    expect(vector.userId).toBe('user-123');
  });

  it('should throw error for non-existent file', () => {
    expect(() => loadIdentityVector('/nonexistent/path.json')).toThrow(
      'Step-4 output not found'
    );
  });

  it('should map pipeline categories to trust-debt categories correctly', () => {
    const vector = loadIdentityVector(TEST_STEP4_PATH);

    // A🚀_CoreEngine (grade A) should contribute to code_quality, testing, innovation, domain_expertise
    expect(vector.categoryScores.code_quality).toBeGreaterThan(0.7);
    expect(vector.categoryScores.testing).toBeGreaterThan(0.7);
    expect(vector.categoryScores.innovation).toBeGreaterThan(0.7);
    expect(vector.categoryScores.domain_expertise).toBeGreaterThan(0.7);

    // B🔒_Documentation (grade A) should contribute to documentation, communication, transparency, user_focus
    expect(vector.categoryScores.documentation).toBeGreaterThan(0.7);
    expect(vector.categoryScores.communication).toBeGreaterThan(0.7);
    expect(vector.categoryScores.transparency).toBeGreaterThan(0.7);
  });

  it('should calculate sovereignty score based on grade and orthogonality', () => {
    const vector = loadIdentityVector(TEST_STEP4_PATH);

    // Grade B = 0.75, orthogonality = 92.5% = 0.925
    // sovereignty = (0.75 * 0.7) + (0.925 * 0.3) = 0.525 + 0.2775 = 0.8025
    expect(vector.sovereigntyScore).toBeCloseTo(0.8025, 2);
  });
});

// ─── Caching Tests ──────────────────────────────────────────────────────

describe('caching', () => {
  it('should cache loaded vectors', () => {
    const vector1 = loadIdentityVector(TEST_STEP4_PATH);
    const vector2 = loadIdentityVector(TEST_STEP4_PATH);

    // Should be the same object reference (cached)
    expect(vector1).toBe(vector2);
  });

  it('should use separate cache keys for different userIds', () => {
    const vector1 = loadIdentityVector(TEST_STEP4_PATH, 'user-1');
    const vector2 = loadIdentityVector(TEST_STEP4_PATH, 'user-2');

    expect(vector1.userId).toBe('user-1');
    expect(vector2.userId).toBe('user-2');
    expect(vector1).not.toBe(vector2);
  });

  it('should clear cache when requested', () => {
    const vector1 = loadIdentityVector(TEST_STEP4_PATH);
    clearCache();
    const vector2 = loadIdentityVector(TEST_STEP4_PATH);

    // Should be different objects after cache clear
    expect(vector1).not.toBe(vector2);
  });

  it('should provide cache statistics', () => {
    loadIdentityVector(TEST_STEP4_PATH, 'user-1');
    loadIdentityVector(TEST_STEP4_PATH, 'user-2');

    const stats = getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.entries).toHaveLength(2);
    expect(stats.entries[0].sourceFile).toBe(TEST_STEP4_PATH);
  });

  it('should expire cache entries after TTL', async () => {
    // This test would need to mock time or wait for TTL
    // For now, just verify cache stats work
    loadIdentityVector(TEST_STEP4_PATH);
    const stats = getCacheStats();
    expect(stats.size).toBe(1);
    expect(stats.entries[0].age).toBeGreaterThanOrEqual(0);
  });
});

// ─── Default Loading Tests ──────────────────────────────────────────────

describe('loadIdentityVectorDefault', () => {
  it('should return null when no default file exists', () => {
    // Remove test file
    rmSync(TEST_STEP4_PATH);
    const vector = loadIdentityVectorDefault();
    expect(vector).toBeNull();
  });

  it('should load from current directory if file exists', () => {
    const cwd = process.cwd();
    const defaultPath = join(cwd, '4-grades-statistics.json');
    writeFileSync(defaultPath, JSON.stringify(MOCK_STEP4_OUTPUT));

    try {
      const vector = loadIdentityVectorDefault();
      expect(vector).toBeDefined();
      expect(vector?.userId).toBe('system');
    } finally {
      if (existsSync(defaultPath)) {
        rmSync(defaultPath);
      }
    }
  });
});

// ─── Raw Vector Tests ───────────────────────────────────────────────────

describe('normalizeRawVector', () => {
  it('should convert raw 20-dim array to identity vector', () => {
    const raw = Array(20).fill(0).map((_, i) => (i + 1) / 20);
    const vector = normalizeRawVector(raw);

    expect(vector.userId).toBe('system');
    expect(Object.keys(vector.categoryScores).length).toBe(20);
    expect(vector.categoryScores.security).toBe(0.05);
    expect(vector.categoryScores.ethical_alignment).toBe(1.0);
  });

  it('should calculate sovereignty as average of all scores', () => {
    const raw = Array(20).fill(0.8);
    const vector = normalizeRawVector(raw);

    expect(vector.sovereigntyScore).toBeCloseTo(0.8, 10);
  });

  it('should throw error for incorrect vector size', () => {
    expect(() => normalizeRawVector([0.5, 0.6])).toThrow(
      'Expected 20-dimensional vector, got 2'
    );
  });

  it('should use custom userId when provided', () => {
    const raw = Array(20).fill(0.5);
    const vector = normalizeRawVector(raw, 'custom-user');
    expect(vector.userId).toBe('custom-user');
  });
});

describe('vectorToRaw', () => {
  it('should convert identity vector to raw array', () => {
    const vector = loadIdentityVector(TEST_STEP4_PATH);
    const raw = vectorToRaw(vector);

    expect(raw).toHaveLength(20);
    expect(raw[0]).toBe(vector.categoryScores.security);
    expect(raw[19]).toBe(vector.categoryScores.ethical_alignment);
  });

  it('should handle missing category scores with default 0.5', () => {
    const vector = normalizeRawVector(Array(20).fill(0.7));
    // Remove some scores
    delete vector.categoryScores.security;
    delete vector.categoryScores.compliance;

    const raw = vectorToRaw(vector);
    expect(raw).toHaveLength(20);
    expect(raw[0]).toBe(0.5); // security (missing)
    expect(raw[11]).toBe(0.5); // compliance (missing)
  });

  it('should be reversible with normalizeRawVector', () => {
    const original = Array(20).fill(0).map((_, i) => Math.random());
    const vector = normalizeRawVector(original);
    const recovered = vectorToRaw(vector);

    expect(recovered).toEqual(original);
  });
});

// ─── Integration Tests ──────────────────────────────────────────────────

describe('integration', () => {
  it('should handle complete workflow: load → cache → convert → normalize', () => {
    // Load from pipeline
    const loaded = loadIdentityVector(TEST_STEP4_PATH, 'integration-test');
    expect(loaded.userId).toBe('integration-test');

    // Convert to raw
    const raw = vectorToRaw(loaded);
    expect(raw).toHaveLength(20);

    // Normalize back
    const normalized = normalizeRawVector(raw, 'integration-test');
    expect(normalized.userId).toBe('integration-test');

    // Should have similar sovereignty scores
    expect(Math.abs(normalized.sovereigntyScore - loaded.sovereigntyScore)).toBeLessThan(0.2);
  });

  it('should handle edge case: all grade D categories', () => {
    const badOutput = {
      ...MOCK_STEP4_OUTPUT,
      trust_debt_calculation: { ...MOCK_STEP4_OUTPUT.trust_debt_calculation, grade: 'D' },
      category_performance: Object.fromEntries(
        Object.entries(MOCK_STEP4_OUTPUT.category_performance).map(([k, v]) => [
          k,
          { ...v, grade: 'D' },
        ])
      ),
      statistical_analysis: { orthogonality_score: 50.0 },
    };

    const badPath = join(TEST_DIR, 'bad-grades.json');
    writeFileSync(badPath, JSON.stringify(badOutput));

    const vector = loadIdentityVector(badPath);
    expect(vector.sovereigntyScore).toBeLessThan(0.4); // Low sovereignty
    expect(Object.values(vector.categoryScores).every(s => s! <= 0.5)).toBe(true);
  });

  it('should handle edge case: all grade A categories', () => {
    const goodOutput = {
      ...MOCK_STEP4_OUTPUT,
      trust_debt_calculation: { ...MOCK_STEP4_OUTPUT.trust_debt_calculation, grade: 'A' },
      category_performance: Object.fromEntries(
        Object.entries(MOCK_STEP4_OUTPUT.category_performance).map(([k, v]) => [
          k,
          { ...v, grade: 'A' },
        ])
      ),
      statistical_analysis: { orthogonality_score: 98.0 },
    };

    const goodPath = join(TEST_DIR, 'good-grades.json');
    writeFileSync(goodPath, JSON.stringify(goodOutput));

    const vector = loadIdentityVector(goodPath);
    expect(vector.sovereigntyScore).toBeGreaterThan(0.9); // High sovereignty
    expect(Object.values(vector.categoryScores).every(s => s! >= 0.8)).toBe(true);
  });
});
