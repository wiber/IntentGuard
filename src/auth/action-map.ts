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

// ─── Types ──────────────────────────────────────────────────────────────

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

// ─── Action Coordinate Map ──────────────────────────────────────────────

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
export const ACTION_MAP: Record<string, ActionRequirement> = {
  // ─── Shell & System ─────────────────────────────────────────────────

  shell_execute: {
    toolName: 'shell_execute',
    requiredScores: {
      security: 0.7,
      reliability: 0.5,
    },
    minSovereignty: 0.6,
    description: 'Execute arbitrary shell commands',
  },

  // ─── File System ────────────────────────────────────────────────────

  file_write: {
    toolName: 'file_write',
    requiredScores: {
      reliability: 0.4,
      data_integrity: 0.3,
    },
    minSovereignty: 0.2,
    description: 'Write files to disk',
  },

  file_delete: {
    toolName: 'file_delete',
    requiredScores: {
      security: 0.6,
      reliability: 0.6,
    },
    minSovereignty: 0.5,
    description: 'Delete files from disk (partially reversible)',
  },

  file_read: {
    toolName: 'file_read',
    requiredScores: {
      security: 0.3,
    },
    minSovereignty: 0.1,
    description: 'Read files from disk',
  },

  // ─── Git Operations ─────────────────────────────────────────────────

  git_push: {
    toolName: 'git_push',
    requiredScores: {
      code_quality: 0.7,
      testing: 0.6,
      security: 0.5,
    },
    minSovereignty: 0.7,
    description: 'Push commits to git remote',
  },

  git_force_push: {
    toolName: 'git_force_push',
    requiredScores: {
      code_quality: 0.9,
      testing: 0.8,
      security: 0.8,
      reliability: 0.7,
    },
    minSovereignty: 0.9,
    description: 'Force push to git remote (destructive, rewrites history)',
  },

  git_commit: {
    toolName: 'git_commit',
    requiredScores: {
      code_quality: 0.5,
      documentation: 0.4,
    },
    minSovereignty: 0.4,
    description: 'Create local git commit',
  },

  git_branch_delete: {
    toolName: 'git_branch_delete',
    requiredScores: {
      reliability: 0.6,
      code_quality: 0.5,
    },
    minSovereignty: 0.6,
    description: 'Delete git branch (partially reversible)',
  },

  // ─── CRM & Data ─────────────────────────────────────────────────────

  crm_update_lead: {
    toolName: 'crm_update_lead',
    requiredScores: {
      data_integrity: 0.5,
      process_adherence: 0.4,
    },
    minSovereignty: 0.3,
    description: 'Update CRM lead data',
  },

  crm_delete_lead: {
    toolName: 'crm_delete_lead',
    requiredScores: {
      data_integrity: 0.7,
      security: 0.5,
      accountability: 0.6,
    },
    minSovereignty: 0.6,
    description: 'Delete CRM lead (destructive)',
  },

  crm_create_lead: {
    toolName: 'crm_create_lead',
    requiredScores: {
      data_integrity: 0.4,
      process_adherence: 0.3,
    },
    minSovereignty: 0.2,
    description: 'Create new CRM lead',
  },

  database_write: {
    toolName: 'database_write',
    requiredScores: {
      data_integrity: 0.7,
      security: 0.6,
      reliability: 0.5,
    },
    minSovereignty: 0.6,
    description: 'Write to database (INSERT/UPDATE)',
  },

  database_delete: {
    toolName: 'database_delete',
    requiredScores: {
      data_integrity: 0.8,
      security: 0.7,
      accountability: 0.7,
    },
    minSovereignty: 0.7,
    description: 'Delete from database (destructive)',
  },

  // ─── Communication ──────────────────────────────────────────────────

  send_message: {
    toolName: 'send_message',
    requiredScores: {
      communication: 0.5,
      accountability: 0.4,
    },
    minSovereignty: 0.3,
    description: 'Send message to external channel (Discord, Slack, etc)',
  },

  send_email: {
    toolName: 'send_email',
    requiredScores: {
      communication: 0.6,
      accountability: 0.5,
      transparency: 0.4,
    },
    minSovereignty: 0.5,
    description: 'Send outbound email via thetadriven.com',
  },

  post_tweet: {
    toolName: 'post_tweet',
    requiredScores: {
      communication: 0.7,
      accountability: 0.6,
      transparency: 0.5,
    },
    minSovereignty: 0.6,
    description: 'Post tweet to X/Twitter',
  },

  send_sms: {
    toolName: 'send_sms',
    requiredScores: {
      communication: 0.6,
      accountability: 0.5,
    },
    minSovereignty: 0.5,
    description: 'Send SMS message',
  },

  // ─── Deployment & Infrastructure ────────────────────────────────────

  deploy: {
    toolName: 'deploy',
    requiredScores: {
      code_quality: 0.8,
      testing: 0.7,
      security: 0.6,
      reliability: 0.7,
    },
    minSovereignty: 0.8,
    description: 'Deploy to production',
  },

  deploy_staging: {
    toolName: 'deploy_staging',
    requiredScores: {
      code_quality: 0.6,
      testing: 0.5,
      security: 0.5,
    },
    minSovereignty: 0.5,
    description: 'Deploy to staging environment',
  },

  restart_service: {
    toolName: 'restart_service',
    requiredScores: {
      reliability: 0.7,
      security: 0.5,
    },
    minSovereignty: 0.6,
    description: 'Restart production service',
  },

  modify_config: {
    toolName: 'modify_config',
    requiredScores: {
      security: 0.7,
      reliability: 0.6,
      process_adherence: 0.5,
    },
    minSovereignty: 0.6,
    description: 'Modify production configuration',
  },

  // ─── API & External Systems ─────────────────────────────────────────

  api_call_mutating: {
    toolName: 'api_call_mutating',
    requiredScores: {
      data_integrity: 0.5,
      security: 0.5,
      reliability: 0.4,
    },
    minSovereignty: 0.4,
    description: 'Make mutating API call (POST/PUT/DELETE)',
  },

  api_call_readonly: {
    toolName: 'api_call_readonly',
    requiredScores: {
      security: 0.3,
    },
    minSovereignty: 0.2,
    description: 'Make read-only API call (GET)',
  },

  webhook_trigger: {
    toolName: 'webhook_trigger',
    requiredScores: {
      reliability: 0.5,
      accountability: 0.5,
    },
    minSovereignty: 0.4,
    description: 'Trigger external webhook',
  },

  // ─── Payment & Financial ────────────────────────────────────────────

  payment_initiate: {
    toolName: 'payment_initiate',
    requiredScores: {
      data_integrity: 0.9,
      security: 0.9,
      accountability: 0.8,
      compliance: 0.8,
    },
    minSovereignty: 0.9,
    description: 'Initiate payment transaction (critical)',
  },

  payment_refund: {
    toolName: 'payment_refund',
    requiredScores: {
      data_integrity: 0.8,
      security: 0.7,
      accountability: 0.7,
      compliance: 0.7,
    },
    minSovereignty: 0.8,
    description: 'Process payment refund',
  },

  wallet_transfer: {
    toolName: 'wallet_transfer',
    requiredScores: {
      data_integrity: 0.8,
      security: 0.8,
      accountability: 0.7,
    },
    minSovereignty: 0.7,
    description: 'Transfer funds between wallets',
  },

  // ─── User Management ────────────────────────────────────────────────

  user_create: {
    toolName: 'user_create',
    requiredScores: {
      security: 0.5,
      data_integrity: 0.4,
      compliance: 0.4,
    },
    minSovereignty: 0.4,
    description: 'Create new user account',
  },

  user_delete: {
    toolName: 'user_delete',
    requiredScores: {
      security: 0.8,
      data_integrity: 0.7,
      accountability: 0.7,
      compliance: 0.7,
    },
    minSovereignty: 0.8,
    description: 'Delete user account (destructive)',
  },

  permission_grant: {
    toolName: 'permission_grant',
    requiredScores: {
      security: 0.8,
      accountability: 0.7,
      compliance: 0.6,
    },
    minSovereignty: 0.7,
    description: 'Grant permissions to user',
  },

  permission_revoke: {
    toolName: 'permission_revoke',
    requiredScores: {
      security: 0.7,
      accountability: 0.6,
    },
    minSovereignty: 0.6,
    description: 'Revoke permissions from user',
  },
};

// ─── Lookup Functions ───────────────────────────────────────────────────

/**
 * Get action requirement by tool name.
 * Returns undefined if the tool is not registered.
 */
export function getActionRequirement(toolName: string): ActionRequirement | undefined {
  return ACTION_MAP[toolName];
}

/**
 * Check if a tool is registered in the action map.
 */
export function hasActionRequirement(toolName: string): boolean {
  return toolName in ACTION_MAP;
}

/**
 * Get all registered tool names.
 */
export function getAllToolNames(): string[] {
  return Object.keys(ACTION_MAP);
}

/**
 * Get all action requirements (useful for validation/testing).
 */
export function getAllRequirements(): ActionRequirement[] {
  return Object.values(ACTION_MAP);
}

/**
 * Get actions by minimum sovereignty threshold.
 * Useful for showing what a user can/cannot do at their current sovereignty level.
 */
export function getActionsBySovereignty(minSovereignty: number): ActionRequirement[] {
  return getAllRequirements().filter(req => req.minSovereignty <= minSovereignty);
}

/**
 * Get actions requiring a specific trust-debt category.
 * Useful for impact analysis when a category score changes.
 */
export function getActionsByCategory(category: TrustDebtCategory): ActionRequirement[] {
  return getAllRequirements().filter(req => category in req.requiredScores);
}

// ─── Constants ──────────────────────────────────────────────────────────

/** The default overlap threshold for permission checks (can be overridden) */
export const DEFAULT_OVERLAP_THRESHOLD = 0.8;

/** Sovereignty levels with semantic names */
export const SOVEREIGNTY_LEVELS = {
  RESTRICTED: 0.3,   // Can only do low-risk actions
  BASIC: 0.5,        // Can do medium-risk actions
  TRUSTED: 0.7,      // Can do high-risk actions
  ADMIN: 0.9,        // Can do critical actions
} as const;

/**
 * Risk categories based on sovereignty threshold.
 * Helps with UI and logging.
 */
export function getRiskLevel(minSovereignty: number): 'low' | 'medium' | 'high' | 'critical' {
  if (minSovereignty >= 0.9) return 'critical';
  if (minSovereignty >= 0.7) return 'high';
  if (minSovereignty >= 0.4) return 'medium';
  return 'low';
}
