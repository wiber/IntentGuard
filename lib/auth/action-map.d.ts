/**
 * src/auth/action-map.ts — Action Coordinate Map
 *
 * Defines which trust-debt dimensions each tool requires for execution.
 * This is the "requirement" side of the FIM permission equation:
 *
 *   Permission(user, action) = Identity(user) ∩ Requirement(action) >= Threshold
 *
 * Each action specifies:
 *   - requiredScores: Map of trust-debt categories to minimum scores (0.0-1.0)
 *   - minSovereignty: Overall trust threshold for this action
 *   - description: Human-readable explanation of what the tool does
 *
 * USAGE:
 *   import { ACTION_MAP, getActionRequirement } from './action-map';
 *   const req = getActionRequirement('shell_execute');
 *   if (req) {
 *     const result = checkPermission(identity, req);
 *     if (result.allowed) { // execute }
 *   }
 *
 * MAINTENANCE:
 *   When adding new tools to OpenClaw, add corresponding entries here.
 *   Consider the blast radius and reversibility of each action when
 *   setting minimum scores.
 */
import type { TrustDebtCategory } from './geometric';
/**
 * Requirement for a single action/tool.
 * Defines minimum scores across trust-debt dimensions.
 */
export interface ActionRequirement {
    /** The tool/action name (must match OpenClaw tool registry) */
    toolName: string;
    /** Minimum scores required for relevant trust-debt categories */
    requiredScores: Partial<Record<TrustDebtCategory, number>>;
    /** Minimum overall sovereignty score (0.0-1.0) */
    minSovereignty: number;
    /** Human-readable description */
    description: string;
}
/**
 * The complete action coordinate map.
 * Maps tool names to their geometric permission requirements.
 *
 * RISK LEVELS (by minSovereignty):
 *   0.2-0.3: Low risk, reversible (file read, basic queries)
 *   0.4-0.6: Medium risk, some impact (file write, non-critical updates)
 *   0.7-0.8: High risk, significant impact (git push, deployments, CRM)
 *   0.9+:    Critical risk, destructive (force push, production changes)
 */
export declare const ACTION_MAP: Record<string, ActionRequirement>;
/**
 * Get action requirement by tool name.
 * Returns undefined if the tool is not registered.
 */
export declare function getActionRequirement(toolName: string): ActionRequirement | undefined;
/**
 * Check if a tool is registered in the action map.
 */
export declare function hasActionRequirement(toolName: string): boolean;
/**
 * Get all registered tool names.
 */
export declare function getAllToolNames(): string[];
/**
 * Get all action requirements (useful for validation/testing).
 */
export declare function getAllRequirements(): ActionRequirement[];
/**
 * Get actions by minimum sovereignty threshold.
 * Useful for showing what a user can/cannot do at their current sovereignty level.
 */
export declare function getActionsBySovereignty(minSovereignty: number): ActionRequirement[];
/**
 * Get actions requiring a specific trust-debt category.
 * Useful for impact analysis when a category score changes.
 */
export declare function getActionsByCategory(category: TrustDebtCategory): ActionRequirement[];
/** The default overlap threshold for permission checks (can be overridden) */
export declare const DEFAULT_OVERLAP_THRESHOLD = 0.8;
/** Sovereignty levels with semantic names */
export declare const SOVEREIGNTY_LEVELS: {
    readonly RESTRICTED: 0.3;
    readonly BASIC: 0.5;
    readonly TRUSTED: 0.7;
    readonly ADMIN: 0.9;
};
/**
 * Risk categories based on sovereignty threshold.
 * Helps with UI and logging.
 */
export declare function getRiskLevel(minSovereignty: number): 'low' | 'medium' | 'high' | 'critical';
//# sourceMappingURL=action-map.d.ts.map