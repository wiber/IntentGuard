/**
 * src/auth/plugin-integration.test.ts — End-to-End Plugin Integration Tests
 *
 * Tests the complete flow:
 *   1. Load identity from pipeline data
 *   2. Generate plugin code
 *   3. Install to OpenClaw plugins directory
 *   4. Load and execute plugin runtime
 *   5. Verify permission checks work correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generatePluginCode, installPlugin } from './plugin';
import { loadIdentityFromPipeline } from './geometric';
import type { IdentityVector } from './geometric';

describe('Plugin Integration (End-to-End)', () => {
  let tempDir: string;
  let pipelineDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'plugin-integration-'));
    pipelineDir = join(tempDir, 'pipeline-data');
    mkdirSync(pipelineDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ─── Helper: Create Mock Pipeline Output ───────────────────────────

  function createMockPipelineData(grades: Record<string, string>) {
    const gradesData = {
      categories: Object.fromEntries(
        Object.entries(grades).map(([cat, grade]) => [cat, { grade }])
      ),
      overallGrade: 'B',
      timestamp: new Date().toISOString(),
    };

    writeFileSync(
      join(pipelineDir, '4-grades-statistics.json'),
      JSON.stringify(gradesData, null, 2)
    );
  }

  // ─── Integration Tests ──────────────────────────────────────────────

  it('loads identity from pipeline and generates working plugin', async () => {
    // Step 1: Create mock pipeline data
    createMockPipelineData({
      security: 'A',
      reliability: 'A',
      code_quality: 'B+',
      testing: 'B',
      data_integrity: 'A-',
    });

    // Step 2: Load identity from pipeline
    const identity = loadIdentityFromPipeline(pipelineDir, 'integration-test-user');

    expect(identity.userId).toBe('integration-test-user');
    expect(identity.sovereigntyScore).toBeGreaterThan(0.7);
    expect(identity.categoryScores.security).toBeGreaterThan(0.9);

    // Step 3: Generate and install plugin
    const pluginDir = join(tempDir, 'plugins');
    const pluginPath = installPlugin(pluginDir, identity);

    expect(existsSync(pluginPath)).toBe(true);

    // Step 4: Load plugin and test runtime
    const plugin = require(pluginPath);

    expect(plugin.pluginName).toBe('intentguard-fim-auth');
    expect(typeof plugin.onBeforeToolCall).toBe('function');

    // Step 5: Test permission checks
    // High-trust tool should be allowed with good identity
    const result1 = await plugin.onBeforeToolCall({
      tool: 'git_push',
      params: { remote: 'origin', branch: 'main' },
    });

    expect(result1.allowed).toBe(true);

    // Low-trust tool should definitely be allowed
    const result2 = await plugin.onBeforeToolCall({
      tool: 'file_write',
      params: { path: '/tmp/test.txt' },
    });

    expect(result2.allowed).toBe(true);
  });

  it('plugin denies actions when identity is insufficient', async () => {
    // Step 1: Create mock pipeline data with low grades
    createMockPipelineData({
      security: 'D',
      reliability: 'D',
      code_quality: 'C',
      testing: 'D',
    });

    // Step 2: Load low-quality identity
    const identity = loadIdentityFromPipeline(pipelineDir, 'low-trust-user');

    expect(identity.sovereigntyScore).toBeLessThan(0.6);

    // Step 3: Install plugin
    const pluginDir = join(tempDir, 'plugins');
    const pluginPath = installPlugin(pluginDir, identity);

    const plugin = require(pluginPath);

    // Step 4: High-trust actions should be denied
    const result = await plugin.onBeforeToolCall({
      tool: 'git_push',
      params: { remote: 'origin', branch: 'main' },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('FIM permission denied');
  });

  it('plugin updates state when onConfigUpdate is called', async () => {
    // Start with low-trust identity
    const lowIdentity: IdentityVector = {
      userId: 'updatable-user',
      categoryScores: {
        security: 0.3,
        reliability: 0.3,
        code_quality: 0.3,
      },
      sovereigntyScore: 0.3,
      lastUpdated: new Date().toISOString(),
    };

    const pluginDir = join(tempDir, 'plugins');
    const pluginPath = installPlugin(pluginDir, lowIdentity);
    const plugin = require(pluginPath);

    // Initially should deny git_push
    let result = await plugin.onBeforeToolCall({
      tool: 'git_push',
      params: {},
    });

    expect(result.allowed).toBe(false);

    // Update identity to high-trust
    plugin.onConfigUpdate({
      sovereignty: 0.9,
      identityScores: {
        security: 0.9,
        reliability: 0.9,
        code_quality: 0.9,
        testing: 0.9,
      },
    });

    // Now should allow git_push
    result = await plugin.onBeforeToolCall({
      tool: 'git_push',
      params: {},
    });

    expect(result.allowed).toBe(true);
  });

  it('plugin fails open for unknown tools', async () => {
    const identity: IdentityVector = {
      userId: 'test',
      categoryScores: {},
      sovereigntyScore: 0.1, // Very low
      lastUpdated: new Date().toISOString(),
    };

    const pluginDir = join(tempDir, 'plugins');
    const pluginPath = installPlugin(pluginDir, identity);
    const plugin = require(pluginPath);

    // Unknown tool should be allowed despite low sovereignty
    const result = await plugin.onBeforeToolCall({
      tool: 'unknown_custom_tool_xyz',
      params: { foo: 'bar' },
    });

    expect(result.allowed).toBe(true);
    expect(result.params).toEqual({ foo: 'bar' });
  });

  it('complete workflow: pipeline → identity → plugin → permission', async () => {
    // Simulate complete IntentGuard workflow

    // 1. Trust-debt pipeline generates grades
    createMockPipelineData({
      security: 'B+',
      reliability: 'B',
      code_quality: 'B',
      testing: 'B-',
      data_integrity: 'A-',
      process_adherence: 'B+',
      communication: 'A',
      transparency: 'A',
    });

    // 2. Load identity from pipeline
    const identity = loadIdentityFromPipeline(pipelineDir, 'production-user');

    // 3. Install plugin (happens at IntentGuard startup)
    const pluginDir = join(tempDir, 'plugins');
    installPlugin(pluginDir, identity);

    // 4. OpenClaw loads plugin (simulated)
    const plugin = require(join(pluginDir, 'intentguard-fim-auth.js'));

    // 5. User attempts various actions
    const actions = [
      { tool: 'file_write', expectAllowed: true }, // Low requirement
      { tool: 'shell_execute', expectAllowed: true }, // Medium requirement
      { tool: 'git_push', expectAllowed: true }, // High requirement but met
      { tool: 'git_force_push', expectAllowed: false }, // Very high requirement (needs 0.9 sovereignty)
      { tool: 'deploy', expectAllowed: true }, // High but B+ grades are sufficient
      { tool: 'crm_update_lead', expectAllowed: true }, // Medium requirement
    ];

    for (const action of actions) {
      const result = await plugin.onBeforeToolCall({
        tool: action.tool,
        params: {},
      });

      expect(result.allowed).toBe(action.expectAllowed);
    }
  });
});
