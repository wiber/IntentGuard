/**
 * tests/integration/fim-proxy.test.ts
 *
 * Integration test for FIM Geometric Permission Engine
 * Tests the core permission checking logic with various identity vectors
 * and action requirements.
 */

import { describe, it, expect } from 'vitest';
import {
  computeOverlap,
  checkPermission,
  DEFAULT_REQUIREMENTS,
  getRequirement,
  type IdentityVector,
  type ActionRequirement,
  TRUST_DEBT_CATEGORIES,
} from '../../src/auth/geometric.js';

// --- Test Utilities ---

function createIdentity(scoreValue: number, sovereignty: number = 0.7): IdentityVector {
  const categoryScores: Partial<Record<typeof TRUST_DEBT_CATEGORIES[number], number>> = {};
  for (const cat of TRUST_DEBT_CATEGORIES) {
    categoryScores[cat] = scoreValue;
  }
  return {
    userId: 'test-user',
    categoryScores,
    sovereigntyScore: sovereignty,
    lastUpdated: new Date().toISOString(),
  };
}

// --- Test Suite ---

describe('FIM Geometric Permission Engine', () => {
  describe('computeOverlap', () => {
    it('should produce 100% overlap with high scores (0.9)', () => {
      const highIdentity = createIdentity(0.9, 0.9);
      const requirement: ActionRequirement = {
        toolName: 'test_tool',
        requiredScores: {
          security: 0.7,
          reliability: 0.5,
          data_integrity: 0.6,
        },
        minSovereignty: 0.5,
        description: 'Test requirement',
      };

      const overlap = computeOverlap(highIdentity, requirement);
      expect(overlap).toBeCloseTo(1.0, 2);
    });

    it('should produce 0% overlap with low scores (0.1)', () => {
      const lowIdentity = createIdentity(0.1, 0.1);
      const requirement: ActionRequirement = {
        toolName: 'test_tool',
        requiredScores: {
          security: 0.7,
          reliability: 0.5,
          data_integrity: 0.6,
        },
        minSovereignty: 0.5,
        description: 'Test requirement',
      };

      const overlap = computeOverlap(lowIdentity, requirement);
      expect(overlap).toBeCloseTo(0.0, 2);
    });

    it('should produce ~67% overlap with mixed scores (2/3 categories met)', () => {
      const mixedIdentity: IdentityVector = {
        userId: 'test-user',
        categoryScores: {
          security: 0.8,        // meets 0.7
          reliability: 0.4,     // fails 0.5
          data_integrity: 0.7,  // meets 0.6
        },
        sovereigntyScore: 0.6,
        lastUpdated: new Date().toISOString(),
      };
      const requirement: ActionRequirement = {
        toolName: 'test_tool',
        requiredScores: {
          security: 0.7,
          reliability: 0.5,
          data_integrity: 0.6,
        },
        minSovereignty: 0.5,
        description: 'Test requirement',
      };

      const overlap = computeOverlap(mixedIdentity, requirement);
      expect(overlap).toBeCloseTo(0.667, 2);
    });

    it('should produce 100% overlap for empty requirement', () => {
      const identity = createIdentity(0.5);
      const emptyReq: ActionRequirement = {
        toolName: 'noop',
        requiredScores: {},
        minSovereignty: 0.0,
        description: 'No requirements',
      };

      const overlap = computeOverlap(identity, emptyReq);
      expect(overlap).toBeCloseTo(1.0, 2);
    });

    it('should handle all 20 categories required with perfect identity', () => {
      const perfectIdentity = createIdentity(1.0, 1.0);
      const allCategoriesReq: ActionRequirement = {
        toolName: 'super_admin',
        requiredScores: Object.fromEntries(
          TRUST_DEBT_CATEGORIES.map(cat => [cat, 0.9])
        ) as Partial<Record<typeof TRUST_DEBT_CATEGORIES[number], number>>,
        minSovereignty: 0.9,
        description: 'Requires all categories',
      };

      const overlap = computeOverlap(perfectIdentity, allCategoriesReq);
      expect(overlap).toBeCloseTo(1.0, 2);
    });
  });

  describe('checkPermission', () => {
    it('should allow passing identity for file_write', () => {
      const passingIdentity: IdentityVector = {
        userId: 'test-user',
        categoryScores: {
          reliability: 0.5,
          data_integrity: 0.4,
          security: 0.8,
        },
        sovereigntyScore: 0.5,
        lastUpdated: new Date().toISOString(),
      };

      const fileWriteReq = getRequirement('file_write');
      expect(fileWriteReq).toBeDefined();

      const result = checkPermission(passingIdentity, fileWriteReq!);
      expect(result.allowed).toBe(true);
      expect(result.overlap).toBeCloseTo(1.0, 2);
      expect(result.failedCategories.length).toBe(0);
    });

    it('should deny failing identity for file_write', () => {
      const failingIdentity: IdentityVector = {
        userId: 'test-user',
        categoryScores: {
          reliability: 0.5,
          data_integrity: 0.1,
        },
        sovereigntyScore: 0.5,
        lastUpdated: new Date().toISOString(),
      };

      const fileWriteReq = getRequirement('file_write');
      expect(fileWriteReq).toBeDefined();

      const result = checkPermission(failingIdentity, fileWriteReq!);
      expect(result.allowed).toBe(false);
      expect(result.failedCategories.length).toBeGreaterThan(0);
      expect(result.failedCategories.some(cat => cat.includes('data_integrity'))).toBe(true);
    });

    it('should always pass empty requirement', () => {
      const identity = createIdentity(0.5);
      const emptyReq: ActionRequirement = {
        toolName: 'noop',
        requiredScores: {},
        minSovereignty: 0.0,
        description: 'No requirements',
      };

      const result = checkPermission(identity, emptyReq);
      expect(result.allowed).toBe(true);
    });

    it('should pass all-category requirement with perfect identity', () => {
      const perfectIdentity = createIdentity(1.0, 1.0);
      const allCategoriesReq: ActionRequirement = {
        toolName: 'super_admin',
        requiredScores: Object.fromEntries(
          TRUST_DEBT_CATEGORIES.map(cat => [cat, 0.9])
        ) as Partial<Record<typeof TRUST_DEBT_CATEGORIES[number], number>>,
        minSovereignty: 0.9,
        description: 'Requires all categories',
      };

      const result = checkPermission(perfectIdentity, allCategoriesReq);
      expect(result.allowed).toBe(true);
    });

    it('should fail zero sovereignty even if categories pass', () => {
      const zeroSovereigntyIdentity: IdentityVector = {
        userId: 'test-user',
        categoryScores: {
          security: 0.9,
          reliability: 0.9,
        },
        sovereigntyScore: 0.0,
        lastUpdated: new Date().toISOString(),
      };

      const requirement: ActionRequirement = {
        toolName: 'test_tool',
        requiredScores: {
          security: 0.7,
          reliability: 0.5,
        },
        minSovereignty: 0.5,
        description: 'Test requirement',
      };

      const overlap = computeOverlap(zeroSovereigntyIdentity, requirement);
      expect(overlap).toBeCloseTo(1.0, 2);

      const result = checkPermission(zeroSovereigntyIdentity, requirement);
      expect(result.allowed).toBe(false);
      expect(result.sovereignty).toBe(0.0);
    });

    it('should respect custom threshold parameter', () => {
      const identity: IdentityVector = {
        userId: 'test-user',
        categoryScores: {
          security: 0.8,
          reliability: 0.4,
          data_integrity: 0.7,
        },
        sovereigntyScore: 0.7,
        lastUpdated: new Date().toISOString(),
      };

      const requirement: ActionRequirement = {
        toolName: 'test_tool',
        requiredScores: {
          security: 0.7,
          reliability: 0.5,
          data_integrity: 0.6,
        },
        minSovereignty: 0.5,
        description: 'Test requirement',
      };

      const resultPass = checkPermission(identity, requirement, 0.6);
      expect(resultPass.allowed).toBe(true);

      const resultFail = checkPermission(identity, requirement, 0.8);
      expect(resultFail.allowed).toBe(false);
    });
  });

  describe('DEFAULT_REQUIREMENTS', () => {
    it('should have at least 5 entries', () => {
      expect(DEFAULT_REQUIREMENTS.length).toBeGreaterThanOrEqual(5);

      const expectedTools = ['shell_execute', 'file_write', 'file_delete', 'git_push', 'git_force_push'];
      for (const toolName of expectedTools) {
        const req = getRequirement(toolName);
        expect(req).toBeDefined();
      }
    });

    it('should have strict requirements for git_force_push', () => {
      const forcePushReq = getRequirement('git_force_push');
      expect(forcePushReq).toBeDefined();

      expect(forcePushReq!.minSovereignty).toBeGreaterThanOrEqual(0.8);

      const reqScores = forcePushReq!.requiredScores;
      expect(Object.keys(reqScores).length).toBeGreaterThanOrEqual(3);

      const hasHighReq = Object.values(reqScores).some(score => score >= 0.8);
      expect(hasHighReq).toBe(true);
    });

    it('should allow deploy for high-trust identity', () => {
      const deployReq = getRequirement('deploy');
      expect(deployReq).toBeDefined();

      const highTrustIdentity = createIdentity(0.85, 0.85);
      const result = checkPermission(highTrustIdentity, deployReq!);
      expect(result.allowed).toBe(true);
    });
  });
});
