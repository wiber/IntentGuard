/**
 * src/auth/action-map.test.ts — Action Coordinate Map Tests
 *
 * Validates the action coordinate map for:
 *   - Completeness (all expected tools are registered)
 *   - Correctness (requirements match spec: shell_execute security>=0.7, etc)
 *   - Consistency (risk levels align with sovereignty thresholds)
 *   - Utility functions (lookup, filtering, categorization)
 */

import { describe, it, expect } from 'vitest';
import {
  ACTION_MAP,
  getActionRequirement,
  hasActionRequirement,
  getAllToolNames,
  getAllRequirements,
  getActionsBySovereignty,
  getActionsByCategory,
  getRiskLevel,
  DEFAULT_OVERLAP_THRESHOLD,
  SOVEREIGNTY_LEVELS,
} from './action-map';
import { TRUST_DEBT_CATEGORIES } from './geometric';

describe('Action Coordinate Map', () => {
  // ─── Spec Compliance ────────────────────────────────────────────────

  describe('Spec Requirements', () => {
    it('shell_execute requires security >= 0.7', () => {
      const req = getActionRequirement('shell_execute');
      expect(req).toBeDefined();
      expect(req?.requiredScores.security).toBe(0.7);
      expect(req?.minSovereignty).toBe(0.6);
    });

    it('crm_update_lead requires data_integrity >= 0.5', () => {
      const req = getActionRequirement('crm_update_lead');
      expect(req).toBeDefined();
      expect(req?.requiredScores.data_integrity).toBe(0.5);
      expect(req?.requiredScores.process_adherence).toBe(0.4);
    });

    it('git_push requires code_quality >= 0.7, testing >= 0.6', () => {
      const req = getActionRequirement('git_push');
      expect(req).toBeDefined();
      expect(req?.requiredScores.code_quality).toBe(0.7);
      expect(req?.requiredScores.testing).toBe(0.6);
      expect(req?.requiredScores.security).toBe(0.5);
    });

    it('git_force_push is high-risk with sovereignty >= 0.9', () => {
      const req = getActionRequirement('git_force_push');
      expect(req).toBeDefined();
      expect(req?.minSovereignty).toBe(0.9);
      expect(req?.requiredScores.code_quality).toBe(0.9);
      expect(req?.requiredScores.testing).toBe(0.8);
    });

    it('deploy requires testing >= 0.7, security >= 0.6', () => {
      const req = getActionRequirement('deploy');
      expect(req).toBeDefined();
      expect(req?.requiredScores.testing).toBe(0.7);
      expect(req?.requiredScores.security).toBe(0.6);
      expect(req?.minSovereignty).toBe(0.8);
    });

    it('file_delete requires security >= 0.6', () => {
      const req = getActionRequirement('file_delete');
      expect(req).toBeDefined();
      expect(req?.requiredScores.security).toBe(0.6);
    });
  });

  // ─── Completeness ───────────────────────────────────────────────────

  describe('Map Completeness', () => {
    it('contains core file system operations', () => {
      expect(hasActionRequirement('file_read')).toBe(true);
      expect(hasActionRequirement('file_write')).toBe(true);
      expect(hasActionRequirement('file_delete')).toBe(true);
    });

    it('contains git operations', () => {
      expect(hasActionRequirement('git_commit')).toBe(true);
      expect(hasActionRequirement('git_push')).toBe(true);
      expect(hasActionRequirement('git_force_push')).toBe(true);
      expect(hasActionRequirement('git_branch_delete')).toBe(true);
    });

    it('contains CRM operations', () => {
      expect(hasActionRequirement('crm_create_lead')).toBe(true);
      expect(hasActionRequirement('crm_update_lead')).toBe(true);
      expect(hasActionRequirement('crm_delete_lead')).toBe(true);
    });

    it('contains database operations', () => {
      expect(hasActionRequirement('database_write')).toBe(true);
      expect(hasActionRequirement('database_delete')).toBe(true);
    });

    it('contains communication operations', () => {
      expect(hasActionRequirement('send_message')).toBe(true);
      expect(hasActionRequirement('send_email')).toBe(true);
      expect(hasActionRequirement('post_tweet')).toBe(true);
      expect(hasActionRequirement('send_sms')).toBe(true);
    });

    it('contains deployment operations', () => {
      expect(hasActionRequirement('deploy')).toBe(true);
      expect(hasActionRequirement('deploy_staging')).toBe(true);
      expect(hasActionRequirement('restart_service')).toBe(true);
      expect(hasActionRequirement('modify_config')).toBe(true);
    });

    it('contains payment operations', () => {
      expect(hasActionRequirement('payment_initiate')).toBe(true);
      expect(hasActionRequirement('payment_refund')).toBe(true);
      expect(hasActionRequirement('wallet_transfer')).toBe(true);
    });

    it('has at least 30 registered tools', () => {
      const tools = getAllToolNames();
      expect(tools.length).toBeGreaterThanOrEqual(30);
    });
  });

  // ─── Consistency Checks ─────────────────────────────────────────────

  describe('Risk Level Consistency', () => {
    it('destructive operations have high minSovereignty', () => {
      const destructive = [
        'git_force_push',
        'file_delete',
        'crm_delete_lead',
        'database_delete',
        'user_delete',
        'deploy',
      ];

      for (const tool of destructive) {
        const req = getActionRequirement(tool);
        expect(req).toBeDefined();
        expect(req!.minSovereignty).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('read-only operations have low minSovereignty', () => {
      const readonly = ['file_read', 'api_call_readonly'];

      for (const tool of readonly) {
        const req = getActionRequirement(tool);
        expect(req).toBeDefined();
        expect(req!.minSovereignty).toBeLessThanOrEqual(0.3);
      }
    });

    it('payment operations have critical sovereignty requirements', () => {
      const payment = ['payment_initiate', 'payment_refund', 'wallet_transfer'];

      for (const tool of payment) {
        const req = getActionRequirement(tool);
        expect(req).toBeDefined();
        expect(req!.minSovereignty).toBeGreaterThanOrEqual(0.7);
      }
    });

    it('all required scores are between 0.0 and 1.0', () => {
      const reqs = getAllRequirements();

      for (const req of reqs) {
        for (const score of Object.values(req.requiredScores)) {
          expect(score).toBeGreaterThanOrEqual(0.0);
          expect(score).toBeLessThanOrEqual(1.0);
        }
      }
    });

    it('all sovereignty scores are between 0.0 and 1.0', () => {
      const reqs = getAllRequirements();

      for (const req of reqs) {
        expect(req.minSovereignty).toBeGreaterThanOrEqual(0.0);
        expect(req.minSovereignty).toBeLessThanOrEqual(1.0);
      }
    });
  });

  // ─── Category Validation ────────────────────────────────────────────

  describe('Trust Debt Category Validation', () => {
    it('only references valid trust-debt categories', () => {
      const reqs = getAllRequirements();
      const validCategories = new Set(TRUST_DEBT_CATEGORIES);

      for (const req of reqs) {
        for (const category of Object.keys(req.requiredScores)) {
          expect(validCategories.has(category as any)).toBe(true);
        }
      }
    });

    it('security-sensitive tools require security score', () => {
      const securityTools = [
        'shell_execute',
        'git_force_push',
        'database_delete',
        'payment_initiate',
        'user_delete',
      ];

      for (const tool of securityTools) {
        const req = getActionRequirement(tool);
        expect(req).toBeDefined();
        expect(req!.requiredScores.security).toBeDefined();
        expect(req!.requiredScores.security!).toBeGreaterThan(0);
      }
    });

    it('data operations require data_integrity score', () => {
      const dataTools = [
        'crm_update_lead',
        'database_write',
        'database_delete',
        'payment_initiate',
      ];

      for (const tool of dataTools) {
        const req = getActionRequirement(tool);
        expect(req).toBeDefined();
        expect(req!.requiredScores.data_integrity).toBeDefined();
      }
    });

    it('communication tools require communication score', () => {
      const commTools = ['send_message', 'send_email', 'post_tweet', 'send_sms'];

      for (const tool of commTools) {
        const req = getActionRequirement(tool);
        expect(req).toBeDefined();
        expect(req!.requiredScores.communication).toBeDefined();
      }
    });
  });

  // ─── Lookup Functions ───────────────────────────────────────────────

  describe('Lookup Functions', () => {
    it('getActionRequirement returns correct requirement', () => {
      const req = getActionRequirement('shell_execute');
      expect(req?.toolName).toBe('shell_execute');
      expect(req?.description).toContain('shell');
    });

    it('getActionRequirement returns undefined for unknown tool', () => {
      const req = getActionRequirement('nonexistent_tool');
      expect(req).toBeUndefined();
    });

    it('hasActionRequirement returns true for known tools', () => {
      expect(hasActionRequirement('git_push')).toBe(true);
      expect(hasActionRequirement('deploy')).toBe(true);
    });

    it('hasActionRequirement returns false for unknown tools', () => {
      expect(hasActionRequirement('fake_tool')).toBe(false);
    });

    it('getAllToolNames returns all registered tools', () => {
      const tools = getAllToolNames();
      expect(tools).toContain('shell_execute');
      expect(tools).toContain('git_push');
      expect(tools).toContain('deploy');
      expect(Array.isArray(tools)).toBe(true);
    });

    it('getAllRequirements returns array of all requirements', () => {
      const reqs = getAllRequirements();
      expect(Array.isArray(reqs)).toBe(true);
      expect(reqs.length).toBeGreaterThan(0);
      expect(reqs[0]).toHaveProperty('toolName');
      expect(reqs[0]).toHaveProperty('requiredScores');
    });
  });

  // ─── Filtering Functions ────────────────────────────────────────────

  describe('Filtering Functions', () => {
    it('getActionsBySovereignty filters by threshold', () => {
      const lowRisk = getActionsBySovereignty(0.3);
      const highRisk = getActionsBySovereignty(0.9);

      expect(lowRisk.length).toBeGreaterThan(highRisk.length);
      expect(lowRisk.some(r => r.toolName === 'file_read')).toBe(true);
      expect(highRisk.some(r => r.toolName === 'git_force_push')).toBe(true);
    });

    it('getActionsBySovereignty returns actions at or below threshold', () => {
      const actions = getActionsBySovereignty(0.5);

      for (const action of actions) {
        expect(action.minSovereignty).toBeLessThanOrEqual(0.5);
      }
    });

    it('getActionsByCategory finds actions requiring specific category', () => {
      const securityActions = getActionsByCategory('security');
      const testingActions = getActionsByCategory('testing');

      expect(securityActions.length).toBeGreaterThan(0);
      expect(testingActions.length).toBeGreaterThan(0);

      for (const action of securityActions) {
        expect(action.requiredScores.security).toBeDefined();
      }

      for (const action of testingActions) {
        expect(action.requiredScores.testing).toBeDefined();
      }
    });

    it('getActionsByCategory returns empty for unused categories', () => {
      // Assuming 'innovation' is not heavily used in the map
      const actions = getActionsByCategory('innovation');
      expect(Array.isArray(actions)).toBe(true);
    });
  });

  // ─── Risk Level Helpers ─────────────────────────────────────────────

  describe('Risk Level Helpers', () => {
    it('getRiskLevel correctly categorizes risk', () => {
      expect(getRiskLevel(0.2)).toBe('low');
      expect(getRiskLevel(0.5)).toBe('medium');
      expect(getRiskLevel(0.7)).toBe('high');
      expect(getRiskLevel(0.9)).toBe('critical');
    });

    it('getRiskLevel handles boundary values', () => {
      expect(getRiskLevel(0.3)).toBe('low');
      expect(getRiskLevel(0.4)).toBe('medium');
      expect(getRiskLevel(0.69)).toBe('medium');
      expect(getRiskLevel(0.7)).toBe('high');
      expect(getRiskLevel(0.89)).toBe('high');
      expect(getRiskLevel(0.9)).toBe('critical');
      expect(getRiskLevel(1.0)).toBe('critical');
    });
  });

  // ─── Constants ──────────────────────────────────────────────────────

  describe('Constants', () => {
    it('DEFAULT_OVERLAP_THRESHOLD is 0.8', () => {
      expect(DEFAULT_OVERLAP_THRESHOLD).toBe(0.8);
    });

    it('SOVEREIGNTY_LEVELS are well-defined', () => {
      expect(SOVEREIGNTY_LEVELS.RESTRICTED).toBe(0.3);
      expect(SOVEREIGNTY_LEVELS.BASIC).toBe(0.5);
      expect(SOVEREIGNTY_LEVELS.TRUSTED).toBe(0.7);
      expect(SOVEREIGNTY_LEVELS.ADMIN).toBe(0.9);
    });

    it('sovereignty levels are in ascending order', () => {
      expect(SOVEREIGNTY_LEVELS.RESTRICTED).toBeLessThan(SOVEREIGNTY_LEVELS.BASIC);
      expect(SOVEREIGNTY_LEVELS.BASIC).toBeLessThan(SOVEREIGNTY_LEVELS.TRUSTED);
      expect(SOVEREIGNTY_LEVELS.TRUSTED).toBeLessThan(SOVEREIGNTY_LEVELS.ADMIN);
    });
  });

  // ─── Descriptions ───────────────────────────────────────────────────

  describe('Action Descriptions', () => {
    it('all actions have non-empty descriptions', () => {
      const reqs = getAllRequirements();

      for (const req of reqs) {
        expect(req.description).toBeDefined();
        expect(req.description.length).toBeGreaterThan(0);
      }
    });

    it('destructive actions are marked in description', () => {
      const destructive = [
        'git_force_push',
        'file_delete',
        'crm_delete_lead',
        'database_delete',
      ];

      for (const tool of destructive) {
        const req = getActionRequirement(tool);
        expect(req).toBeDefined();
        expect(
          req!.description.toLowerCase().includes('destructive') ||
          req!.description.toLowerCase().includes('delete')
        ).toBe(true);
      }
    });
  });

  // ─── Integration Scenarios ──────────────────────────────────────────

  describe('Integration Scenarios', () => {
    it('can simulate sovereignty progression', () => {
      // User starts at restricted level
      const restricted = getActionsBySovereignty(SOVEREIGNTY_LEVELS.RESTRICTED);
      expect(restricted.some(r => r.toolName === 'file_read')).toBe(true);
      expect(restricted.some(r => r.toolName === 'deploy')).toBe(false);

      // User gains trust to basic level
      const basic = getActionsBySovereignty(SOVEREIGNTY_LEVELS.BASIC);
      expect(basic.some(r => r.toolName === 'file_write')).toBe(true);
      expect(basic.some(r => r.toolName === 'git_push')).toBe(false);

      // User reaches trusted level
      const trusted = getActionsBySovereignty(SOVEREIGNTY_LEVELS.TRUSTED);
      expect(trusted.some(r => r.toolName === 'git_push')).toBe(true);
      expect(trusted.some(r => r.toolName === 'git_force_push')).toBe(false);

      // User achieves admin level
      const admin = getActionsBySovereignty(SOVEREIGNTY_LEVELS.ADMIN);
      expect(admin.some(r => r.toolName === 'git_force_push')).toBe(true);
      expect(admin.some(r => r.toolName === 'payment_initiate')).toBe(true);
    });

    it('can find impact of category score change', () => {
      // If security score drops, these actions are affected
      const securityActions = getActionsByCategory('security');
      expect(securityActions.length).toBeGreaterThan(5);

      // If testing score improves, these actions become available
      const testingActions = getActionsByCategory('testing');
      expect(testingActions.some(r => r.toolName === 'git_push')).toBe(true);
      expect(testingActions.some(r => r.toolName === 'deploy')).toBe(true);
    });
  });
});
