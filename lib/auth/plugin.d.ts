/**
 * src/auth/plugin.ts — OpenClaw FIM Auth Plugin Generator
 *
 * Generates the ~/.openclaw/plugins/intentguard-fim-auth.js plugin file
 * that hooks into OpenClaw's onBeforeToolCall lifecycle to enforce
 * geometric permission checks.
 *
 * ARCHITECTURE:
 *   - This module exports plugin generation utilities
 *   - The generated plugin is a standalone JS module loaded by OpenClaw
 *   - Plugin reads identity from geometric.ts computations
 *   - Enforces tensor overlap + sovereignty thresholds
 *
 * USAGE:
 *   import { generatePluginCode, installPlugin } from './auth/plugin.ts';
 *   installPlugin(pluginDir, identity); // Writes intentguard-fim-auth.js
 */
import type { IdentityVector, ActionRequirement } from './geometric.js';
/**
 * OpenClaw plugin lifecycle hooks.
 * Plugins export these functions to intercept tool execution.
 */
export interface OpenClawPlugin {
    /** Plugin metadata */
    pluginName: string;
    pluginVersion: string;
    /**
     * Called before every tool execution.
     * Return { allowed: true, params } to permit.
     * Return { allowed: false, reason } to deny.
     */
    onBeforeToolCall: (context: {
        tool: string;
        params: Record<string, unknown>;
    }) => Promise<{
        allowed: boolean;
        params?: Record<string, unknown>;
        reason?: string;
    }>;
    /**
     * Called when plugin config is updated.
     * IntentGuard sends sovereignty + identity updates via this hook.
     */
    onConfigUpdate?: (update: {
        sovereignty?: number;
        identityScores?: Record<string, number>;
    }) => void;
}
/**
 * Generate the OpenClaw plugin code as a standalone JS module.
 *
 * The plugin is written in plain JavaScript (not TypeScript) because
 * OpenClaw loads it via require() without transpilation.
 *
 * @param identity - Current user identity vector from trust-debt pipeline
 * @param requirements - Action requirements map (defaults to DEFAULT_REQUIREMENTS)
 * @param threshold - Overlap threshold for permission (default 0.8)
 * @returns JavaScript source code string
 */
export declare function generatePluginCode(identity: IdentityVector, requirements?: ActionRequirement[], threshold?: number): string;
/**
 * Install the FIM auth plugin into OpenClaw's plugins directory.
 *
 * Creates ~/.openclaw/plugins/ if needed, generates plugin code,
 * and writes intentguard-fim-auth.js.
 *
 * @param pluginDir - Path to OpenClaw plugins directory (default ~/.openclaw/plugins)
 * @param identity - Current identity vector from trust-debt pipeline
 * @param requirements - Optional custom requirements (defaults to DEFAULT_REQUIREMENTS)
 * @param threshold - Optional custom threshold (default 0.8)
 * @returns Path to installed plugin file
 */
export declare function installPlugin(pluginDir: string, identity: IdentityVector, requirements?: ActionRequirement[], threshold?: number): string;
/**
 * Get the default OpenClaw plugin directory path.
 * Returns ~/.openclaw/plugins
 */
export declare function getDefaultPluginDir(): string;
//# sourceMappingURL=plugin.d.ts.map