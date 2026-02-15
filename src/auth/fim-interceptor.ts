/**
 * src/auth/fim-interceptor.ts — FIM Permission Enforcement
 *
 * Wraps skill execution with geometric permission checks.
 * On deny: records trust-debt spike, posts to transparency engine.
 * On allow: passes through to skill execution.
 *
 * EQUATION ENFORCED:
 *   Permission(u,a) = Identity_Fractal(u) ∩ Coordinate_Required(a) >= Sovereignty_Threshold
 *
 * DRIFT FEEDBACK:
 *   Consecutive denials increment a counter.
 *   At threshold (3), triggers pipeline re-run → sovereignty update.
 */

import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import {
  checkPermission,
  getRequirement,
  loadIdentityFromPipeline,
  type IdentityVector,
  type PermissionResult,
  type ActionRequirement,
} from './geometric.js';
import type { Logger, SkillResult } from '../types.js';

/** Map skill names to FIM tool names for permission checks */
const SKILL_TO_TOOL: Record<string, string> = {
  'claude-flow-bridge': 'shell_execute',
  'system-control': 'shell_execute',
  'email-outbound': 'send_email',
  'artifact-generator': 'file_write',
  'wallet-ledger': 'file_write',
};

/** Skills that bypass FIM (internal-only, no side effects) */
const FIM_EXEMPT = new Set([
  'thetasteer-categorize',
  'tesseract-trainer',
  'llm-controller',
  'cost-reporter',
  'voice-memo-reactor',
]);

const DENIAL_THRESHOLD = 3;

export interface FimDenialEvent {
  toolName: string;
  skillName: string;
  overlap: number;
  sovereignty: number;
  threshold: number;
  failedCategories: string[];
  timestamp: string;
}

export class FimInterceptor {
  private log: Logger;
  private dataDir: string;
  private identity: IdentityVector;
  private consecutiveDenials = 0;
  private totalDenials = 0;

  /** Called when FIM denies a tool call */
  onDenial?: (event: FimDenialEvent) => Promise<void>;
  /** Called when consecutive denials hit threshold → trigger pipeline re-run */
  onDriftThreshold?: () => Promise<void>;

  constructor(log: Logger, dataDir: string) {
    this.log = log;
    this.dataDir = dataDir;
    this.identity = this.loadLatestIdentity();
  }

  /**
   * Load identity from the most recent pipeline run.
   */
  private loadLatestIdentity(): IdentityVector {
    const runsDir = join(this.dataDir, 'pipeline-runs');
    if (!existsSync(runsDir)) {
      this.log.warn('FIM: No pipeline-runs directory, using permissive defaults');
      return loadIdentityFromPipeline(runsDir);
    }

    // Find latest run directory
    const runs = readdirSync(runsDir)
      .filter(d => d.startsWith('run-'))
      .sort()
      .reverse();

    if (runs.length === 0) {
      this.log.warn('FIM: No pipeline runs found, using permissive defaults');
      return loadIdentityFromPipeline(runsDir);
    }

    const latestRun = join(runsDir, runs[0]);
    const identity = loadIdentityFromPipeline(latestRun);
    this.log.info(`FIM: Loaded identity from ${runs[0]} (sovereignty: ${identity.sovereigntyScore.toFixed(3)})`);
    return identity;
  }

  /**
   * Reload identity after pipeline re-run.
   */
  reloadIdentity(): void {
    this.identity = this.loadLatestIdentity();
    this.consecutiveDenials = 0;
  }

  /**
   * Check if a skill call is permitted.
   * Returns null if allowed, SkillResult if denied.
   */
  async intercept(skillName: string, payload: unknown): Promise<SkillResult | null> {
    // Exempt skills don't need FIM checks
    if (FIM_EXEMPT.has(skillName)) return null;

    // Map skill to FIM tool name
    const toolName = SKILL_TO_TOOL[skillName];
    if (!toolName) return null; // Unknown skill — allow by default

    const requirement = getRequirement(toolName);
    if (!requirement) return null; // No requirement defined — allow

    const result = checkPermission(this.identity, requirement);

    if (result.allowed) {
      this.consecutiveDenials = 0;
      return null; // Allowed — pass through
    }

    // DENIED
    this.consecutiveDenials++;
    this.totalDenials++;

    const event: FimDenialEvent = {
      toolName,
      skillName,
      overlap: result.overlap,
      sovereignty: result.sovereignty,
      threshold: result.threshold,
      failedCategories: result.failedCategories,
      timestamp: new Date().toISOString(),
    };

    this.log.warn(
      `FIM DENIED "${skillName}" (tool: ${toolName}) — ` +
      `overlap: ${result.overlap.toFixed(2)}, sovereignty: ${result.sovereignty.toFixed(3)}, ` +
      `failed: [${result.failedCategories.join(', ')}] ` +
      `(${this.consecutiveDenials} consecutive denials)`
    );

    // Notify denial callback
    if (this.onDenial) {
      await this.onDenial(event).catch(err =>
        this.log.error(`FIM denial callback failed: ${err}`)
      );
    }

    // Check drift threshold
    if (this.consecutiveDenials >= DENIAL_THRESHOLD && this.onDriftThreshold) {
      this.log.warn(`FIM: ${DENIAL_THRESHOLD} consecutive denials — triggering drift correction`);
      await this.onDriftThreshold().catch(err =>
        this.log.error(`FIM drift threshold callback failed: ${err}`)
      );
      this.consecutiveDenials = 0;
    }

    // Log denial to file
    this.logDenial(event);

    return {
      success: false,
      message: `FIM DENIED: "${skillName}" requires ${toolName} permission. Overlap: ${result.overlap.toFixed(2)} < ${result.threshold}. Sovereignty: ${result.sovereignty.toFixed(3)} < ${requirement.minSovereignty}. Failed: ${result.failedCategories.join(', ')}`,
    };
  }

  /**
   * Append denial to audit log.
   */
  private logDenial(event: FimDenialEvent): void {
    try {
      const logPath = join(this.dataDir, 'fim-denials.jsonl');
      const line = JSON.stringify(event) + '\n';
      writeFileSync(logPath, line, { flag: 'a' });
    } catch {
      // Non-critical — log and continue
    }
  }

  /**
   * Update heat map after FIM decision.
   */
  updateHeatMap(cell: string, allowed: boolean): void {
    try {
      const heatPath = join(this.dataDir, 'heat.json');
      let heat: Record<string, unknown> = {};
      if (existsSync(heatPath)) {
        heat = JSON.parse(readFileSync(heatPath, 'utf-8'));
      }

      const cells = (heat.cells || {}) as Record<string, { state: string; lastUpdate: string; taskCount: number; denials: number }>;
      if (!cells[cell]) {
        cells[cell] = { state: 'S', lastUpdate: new Date().toISOString(), taskCount: 0, denials: 0 };
      }

      cells[cell].lastUpdate = new Date().toISOString();
      if (allowed) {
        cells[cell].taskCount++;
        // Promote: S → B → P based on activity
        if (cells[cell].taskCount >= 10 && cells[cell].state === 'B') cells[cell].state = 'P';
        if (cells[cell].taskCount >= 3 && cells[cell].state === 'S') cells[cell].state = 'B';
      } else {
        cells[cell].denials++;
        // Demote on denials: P → B → S → H
        if (cells[cell].denials >= 5) cells[cell].state = 'H';
        else if (cells[cell].denials >= 3 && cells[cell].state !== 'H') cells[cell].state = 'S';
      }

      heat.cells = cells;
      heat.sovereignty = this.identity.sovereigntyScore;
      heat.lastUpdate = new Date().toISOString();

      writeFileSync(heatPath, JSON.stringify(heat, null, 2));
    } catch (err) {
      this.log.error(`FIM heat map update failed: ${err}`);
    }
  }

  /** Get stats for monitoring */
  getStats(): { totalDenials: number; consecutiveDenials: number; sovereignty: number } {
    return {
      totalDenials: this.totalDenials,
      consecutiveDenials: this.consecutiveDenials,
      sovereignty: this.identity.sovereigntyScore,
    };
  }
}
