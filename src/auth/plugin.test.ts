/**
 * src/auth/plugin.test.ts — OpenClaw FIM Plugin Tests
 *
 * Tests plugin code generation, installation, and runtime behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generatePluginCode, installPlugin, getDefaultPluginDir } from './plugin';
import type { IdentityVector, ActionRequirement } from './geometric';
import { TRUST_DEBT_CATEGORIES } from './geometric';

describe('OpenClaw FIM Plugin', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'plugin-test-'));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ─── Plugin Code Generation Tests ──────────────────────────────────

  describe('generatePluginCode', () => {
    it('generates valid JavaScript plugin code', () => {
      const identity: IdentityVector = {
        userId: 'test-user',
        categoryScores: {
          security: 0.8,
          reliability: 0.7,
          data_integrity: 0.6,
        },
        sovereigntyScore: 0.75,
        lastUpdated: '2026-02-15T00:00:00Z',
      };

      const code = generatePluginCode(identity);

      // Check structure
      expect(code).toContain('ACTION_REQUIREMENTS');
      expect(code).toContain('computeOverlap');
      expect(code).toContain('exports.onBeforeToolCall');
      expect(code).toContain('exports.onConfigUpdate');
      expect(code).toContain('exports.pluginName');
      expect(code).toContain('exports.pluginVersion');

      // Check identity embedded
      expect(code).toContain('test-user');
      expect(code).toContain('0.75'); // sovereignty
      expect(code).toContain('2026-02-15T00:00:00Z');

      // Check category scores
      expect(code).toContain('"security": 0.8');
      expect(code).toContain('"reliability": 0.7');
      expect(code).toContain('"data_integrity": 0.6');
    });

    it('includes default action requirements', () => {
      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: {},
        sovereigntyScore: 0.7,
        lastUpdated: new Date().toISOString(),
      };

      const code = generatePluginCode(identity);

      // Check that default requirements are included
      expect(code).toContain('shell_execute');
      expect(code).toContain('git_push');
      expect(code).toContain('file_delete');
      expect(code).toContain('crm_update_lead');
    });

    it('supports custom requirements', () => {
      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: {},
        sovereigntyScore: 0.7,
        lastUpdated: new Date().toISOString(),
      };

      const customRequirements: ActionRequirement[] = [
        {
          toolName: 'custom_tool',
          requiredScores: { security: 0.9 },
          minSovereignty: 0.8,
          description: 'Custom tool',
        },
      ];

      const code = generatePluginCode(identity, customRequirements);

      expect(code).toContain('custom_tool');
      expect(code).toContain('"security": 0.9');
      expect(code).not.toContain('shell_execute'); // Default requirements not included
    });

    it('supports custom threshold', () => {
      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: {},
        sovereigntyScore: 0.7,
        lastUpdated: new Date().toISOString(),
      };

      const code = generatePluginCode(identity, undefined, 0.95);

      expect(code).toContain('overlap >= 0.95');
    });

    it('handles missing category scores gracefully', () => {
      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: {}, // Empty scores
        sovereigntyScore: 0.5,
        lastUpdated: new Date().toISOString(),
      };

      const code = generatePluginCode(identity);

      // Should generate valid code even with no scores
      expect(code).toContain('identityScores');
      expect(code).toContain('exports.onBeforeToolCall');
    });
  });

  // ─── Plugin Installation Tests ──────────────────────────────────────

  describe('installPlugin', () => {
    it('creates plugin directory if missing', () => {
      const pluginDir = join(tempDir, 'plugins');
      expect(existsSync(pluginDir)).toBe(false);

      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: { security: 0.7 },
        sovereigntyScore: 0.7,
        lastUpdated: new Date().toISOString(),
      };

      installPlugin(pluginDir, identity);

      expect(existsSync(pluginDir)).toBe(true);
    });

    it('writes plugin file to correct location', () => {
      const pluginDir = join(tempDir, 'plugins');
      mkdirSync(pluginDir, { recursive: true });

      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: { security: 0.7 },
        sovereigntyScore: 0.7,
        lastUpdated: new Date().toISOString(),
      };

      const pluginPath = installPlugin(pluginDir, identity);

      expect(pluginPath).toBe(join(pluginDir, 'intentguard-fim-auth.js'));
      expect(existsSync(pluginPath)).toBe(true);
    });

    it('writes valid JavaScript code', () => {
      const pluginDir = join(tempDir, 'plugins');

      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: { security: 0.8 },
        sovereigntyScore: 0.75,
        lastUpdated: new Date().toISOString(),
      };

      const pluginPath = installPlugin(pluginDir, identity);
      const code = readFileSync(pluginPath, 'utf-8');

      // Should be valid JS (basic syntax check)
      expect(() => {
        // eslint-disable-next-line no-new-func
        new Function(code);
      }).not.toThrow();
    });

    it('overwrites existing plugin', () => {
      const pluginDir = join(tempDir, 'plugins');
      mkdirSync(pluginDir, { recursive: true });

      const identity1: IdentityVector = {
        userId: 'user1',
        categoryScores: { security: 0.5 },
        sovereigntyScore: 0.5,
        lastUpdated: '2026-01-01T00:00:00Z',
      };

      const identity2: IdentityVector = {
        userId: 'user2',
        categoryScores: { security: 0.9 },
        sovereigntyScore: 0.9,
        lastUpdated: '2026-02-01T00:00:00Z',
      };

      // Install first version
      installPlugin(pluginDir, identity1);
      let code = readFileSync(join(pluginDir, 'intentguard-fim-auth.js'), 'utf-8');
      expect(code).toContain('user1');
      expect(code).toContain('0.5');

      // Install second version (should overwrite)
      installPlugin(pluginDir, identity2);
      code = readFileSync(join(pluginDir, 'intentguard-fim-auth.js'), 'utf-8');
      expect(code).toContain('user2');
      expect(code).toContain('0.9');
      expect(code).not.toContain('user1');
    });
  });

  // ─── Plugin Runtime Behavior Tests ──────────────────────────────────

  describe('plugin runtime behavior', () => {
    it('plugin exports correct interface', () => {
      const pluginDir = join(tempDir, 'plugins');

      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: { security: 0.8, reliability: 0.7 },
        sovereigntyScore: 0.75,
        lastUpdated: new Date().toISOString(),
      };

      const pluginPath = installPlugin(pluginDir, identity);

      // Load plugin (CommonJS style)
      const plugin = require(pluginPath);

      expect(plugin.pluginName).toBe('intentguard-fim-auth');
      expect(plugin.pluginVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(typeof plugin.onBeforeToolCall).toBe('function');
      expect(typeof plugin.onConfigUpdate).toBe('function');
    });

    it('plugin allows tool with sufficient permissions', async () => {
      const pluginDir = join(tempDir, 'plugins');

      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: {
          security: 0.9,
          reliability: 0.9,
          data_integrity: 0.9,
        },
        sovereigntyScore: 0.9,
        lastUpdated: new Date().toISOString(),
      };

      const pluginPath = installPlugin(pluginDir, identity);
      const plugin = require(pluginPath);

      // Try to execute a tool that should be allowed
      const result = await plugin.onBeforeToolCall({
        tool: 'file_write',
        params: { path: '/tmp/test.txt' },
      });

      expect(result.allowed).toBe(true);
      expect(result.params).toEqual({ path: '/tmp/test.txt' });
    });

    it('plugin denies tool with insufficient overlap', async () => {
      const pluginDir = join(tempDir, 'plugins');

      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: {
          security: 0.3, // Too low for git_push
          reliability: 0.3,
          code_quality: 0.3,
        },
        sovereigntyScore: 0.9, // High sovereignty but low category scores
        lastUpdated: new Date().toISOString(),
      };

      const pluginPath = installPlugin(pluginDir, identity);
      const plugin = require(pluginPath);

      // Try git_push (requires security: 0.5, code_quality: 0.7, testing: 0.6)
      const result = await plugin.onBeforeToolCall({
        tool: 'git_push',
        params: { remote: 'origin', branch: 'main' },
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('FIM permission denied');
    });

    it('plugin denies tool with insufficient sovereignty', async () => {
      const pluginDir = join(tempDir, 'plugins');

      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: {
          security: 0.9,
          reliability: 0.9,
          code_quality: 0.9,
          testing: 0.9,
        },
        sovereigntyScore: 0.3, // Too low for git_push (needs 0.7)
        lastUpdated: new Date().toISOString(),
      };

      const pluginPath = installPlugin(pluginDir, identity);
      const plugin = require(pluginPath);

      const result = await plugin.onBeforeToolCall({
        tool: 'git_push',
        params: { remote: 'origin', branch: 'main' },
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('sovereignty');
    });

    it('plugin allows unknown tools (fail-open)', async () => {
      const pluginDir = join(tempDir, 'plugins');

      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: {},
        sovereigntyScore: 0.1, // Very low
        lastUpdated: new Date().toISOString(),
      };

      const pluginPath = installPlugin(pluginDir, identity);
      const plugin = require(pluginPath);

      // Unknown tool should be allowed (fail-open)
      const result = await plugin.onBeforeToolCall({
        tool: 'unknown_tool_12345',
        params: { foo: 'bar' },
      });

      expect(result.allowed).toBe(true);
    });

    it('plugin updates state via onConfigUpdate', async () => {
      const pluginDir = join(tempDir, 'plugins');

      const identity: IdentityVector = {
        userId: 'test',
        categoryScores: { security: 0.3 },
        sovereigntyScore: 0.3, // Initially low
        lastUpdated: new Date().toISOString(),
      };

      const pluginPath = installPlugin(pluginDir, identity);
      const plugin = require(pluginPath);

      // Initially should be denied
      let result = await plugin.onBeforeToolCall({
        tool: 'git_push',
        params: {},
      });
      expect(result.allowed).toBe(false);

      // Update sovereignty
      plugin.onConfigUpdate({
        sovereignty: 0.9,
        identityScores: {
          security: 0.9,
          code_quality: 0.9,
          testing: 0.9,
        },
      });

      // Now should be allowed
      result = await plugin.onBeforeToolCall({
        tool: 'git_push',
        params: {},
      });
      expect(result.allowed).toBe(true);
    });
  });

  // ─── Utility Function Tests ─────────────────────────────────────────

  describe('getDefaultPluginDir', () => {
    it('returns ~/.openclaw/plugins path', () => {
      const dir = getDefaultPluginDir();
      expect(dir).toContain('.openclaw');
      expect(dir).toContain('plugins');
      expect(dir).toMatch(/\.openclaw[/\\]plugins$/);
    });
  });
});
