/**
 * 10-debate-notes.tsx — FOR/AGAINST Debate Results
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Critical findings from the advocate and skeptic agents.
 * DEPENDS ON: All other sections (cross-references)
 * EDITED BY: Architect agent (updates as risks are resolved)
 *
 * PURPOSE: This section ensures we don't hand-wave past real risks.
 * Every CRITICAL or HIGH finding must have a resolution plan.
 */

export const SECTION_ID = '10-debate-notes';
export const SECTION_TITLE = 'Debate Notes — FOR/AGAINST';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'resolved';

export interface DebateFinding {
  id: string;
  severity: Severity;
  source: 'advocate' | 'skeptic';
  finding: string;
  detail: string;
  resolution?: string;
}

export const findings: DebateFinding[] = [
  {
    id: 'F01',
    severity: 'resolved',
    source: 'skeptic',
    finding: 'OpenClaw npm package does not exist',
    detail: 'Skeptic claimed openclaw was not on npm. This was incorrect.',
    resolution: 'RESOLVED: openclaw@2026.2.13 is installed and verified in node_modules. Binary works: npx openclaw --version returns 2026.2.13.',
  },
  {
    id: 'F02',
    severity: 'critical',
    source: 'skeptic',
    finding: 'FIM tensor overlap = ZERO implementation',
    detail: 'The entire geometric permission system exists only as pseudocode in HTML. No TypeScript. No tests. No concrete vector space definition. The "Guard" in IntentGuard is vaporware.',
    resolution: 'ACCEPTED: Must build standalone module (intentguard/src/auth/geometric.ts) with actual math and tests BEFORE integrating. Phase 2 is now "FIM Auth Standalone First".',
  },
  {
    id: 'F03',
    severity: 'high',
    source: 'skeptic',
    finding: 'MCP proxy interception has no standard pattern',
    detail: 'MCP defines tool registration, not tool interception. No documented middleware pattern exists. Proxy adds latency to every tool call.',
    resolution: 'INVESTIGATE: Check OpenClaw extension/middleware API before committing. May use WebSocket interception at ws://127.0.0.1:18789 instead.',
  },
  {
    id: 'F04',
    severity: 'high',
    source: 'skeptic',
    finding: '9 rooms depend on 7 macOS apps — not portable',
    detail: 'Terminal IPC via AppleScript/System Events works on exactly one Mac. System Events rooms require window focus and cannot run in parallel.',
    resolution: 'ACCEPTED RISK for Mac Mini deployment. Long-term: abstract IPC layer so rooms can work headlessly (tmux/screen) without macOS apps.',
  },
  {
    id: 'F05',
    severity: 'medium',
    source: 'skeptic',
    finding: 'Two-repo split is premature',
    detail: 'Shared types between repos. Skill development spans both codebases. Integration testing becomes harder. Lockstep versioning needed.',
    resolution: 'MITIGATE: Publish shared types as @thetadriven/types npm package. Use workspace protocol for local dev.',
  },
  {
    id: 'F06',
    severity: 'high',
    source: 'skeptic',
    finding: 'Migrating too much simultaneously',
    detail: 'Full platform migration + new auth system + new proxy layer + repo split — all at once. Working system is 837 lines.',
    resolution: 'ACCEPTED: Revised plan to be incremental. Phase 0 is minimal (just wrapper + OpenClaw child). FIM builds standalone. Skills port one at a time.',
  },
  {
    id: 'F07',
    severity: 'medium',
    source: 'skeptic',
    finding: 'Always-on Mac Mini = single point of failure',
    detail: 'No auto-scaling, no redundancy, hardware failure = total death, macOS updates can break AppleScript.',
    resolution: 'ACCEPTED for MVP. Mac Mini is the right choice for a single-user always-on bot. Cloud comes in Phase 5 if needed.',
  },
  // Advocate findings
  {
    id: 'A01',
    severity: 'low',
    source: 'advocate',
    finding: 'Wrapper > Fork (reversibility)',
    detail: 'If OpenClaw releases native geometric auth, we delete our shim. Fork commits to maintenance forever.',
    resolution: 'STRONG POINT: Two-way door. Keep.',
  },
  {
    id: 'A02',
    severity: 'low',
    source: 'advocate',
    finding: 'Trust-debt pipeline is proven and working',
    detail: '8 agents, 7 scripts, SQLite DB, full audit trail. This is the one real asset.',
    resolution: 'LEVERAGE: Make sovereignty score the input to FIM auth. Do not rewrite.',
  },
  {
    id: 'A03',
    severity: 'low',
    source: 'advocate',
    finding: 'OpenClaw gives multi-channel for free',
    detail: 'WhatsApp, Telegram, Signal, iMessage, Teams — all via npm dep, not custom code.',
    resolution: 'VALUE: This is why we chose OpenClaw over keeping custom discord.js.',
  },
];

// Summary statistics
export function getDebateSummary() {
  const bySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, resolved: 0 };
  findings.forEach(f => bySeverity[f.severity]++);
  return bySeverity;
}
