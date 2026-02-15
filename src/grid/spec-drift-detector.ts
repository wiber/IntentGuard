/**
 * spec-drift-detector.ts — 12×12 Spec Drift Signal for Trust Debt
 *
 * Maps each tesseract grid cell to:
 *   1. What the spec says is important NOW (intent)
 *   2. What the repo actually shows (reality)
 *   3. Where drift exists (the signal)
 *
 * Grid layout: 3 rows (Strategy, Tactics, Operations) × 4 cols = 12 cells
 * Output: per-cell drift score + overall focus recommendations
 *
 * This is the "holama running nonstop" — designed to be called by the
 * scheduler (cron) to continuously detect where we're drifting from the spec.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface CellMapping {
  cellId: string;
  label: string;
  fullName: string;
  row: string;       // 'Strategy' | 'Tactics' | 'Operations'
  specKeywords: string[];       // what the spec says matters
  repoPaths: string[];          // where to look in the repo
  room: string;                 // cognitive room
}

export interface CellIntent {
  cellId: string;
  specMentions: number;         // how often spec references this domain
  specStatus: 'active' | 'completed' | 'pending' | 'not_mentioned';
  specPriorities: string[];     // specific items the spec says matter NOW
  lastSpecUpdate: string;       // when the spec last mentioned this cell
}

export interface CellReality {
  cellId: string;
  recentCommits: number;        // commits touching this domain (last 30 days)
  fileCount: number;            // files in this domain
  lastModified: string;         // most recent file change
  testCoverage: 'has_tests' | 'no_tests' | 'unknown';
  linesOfCode: number;
}

export interface CellDrift {
  cellId: string;
  label: string;
  fullName: string;
  room: string;
  intent: CellIntent;
  reality: CellReality;
  driftScore: number;           // 0 = perfect alignment, 1 = maximum drift
  driftDirection: 'spec_ahead' | 'repo_ahead' | 'aligned' | 'both_cold';
  focusNeeded: boolean;
  recommendation: string;
}

export interface DriftSignal {
  timestamp: string;
  specSource: string;
  repoRoot: string;
  cells: CellDrift[];
  overallDrift: number;
  hotCells: string[];           // cells needing immediate attention
  coldCells: string[];          // cells with no activity
  focusRecommendation: string;  // top-level "where to focus"
  gridAscii: string;            // visual representation
}

// ═══════════════════════════════════════════════════════════════
// Cell-to-Domain Mapping
// ═══════════════════════════════════════════════════════════════

const CELL_MAPPINGS: CellMapping[] = [
  // Row A — Strategy
  {
    cellId: 'A1', label: 'Law', fullName: 'Strategy.Law',
    row: 'Strategy',
    specKeywords: ['law', 'legal', 'compliance', 'eu ai act', 'liability', 'regulation', 'sovereign'],
    repoPaths: ['src/auth', 'src/auth/sovereignty.ts', 'src/auth/fim-interceptor.ts'],
    room: 'vault',
  },
  {
    cellId: 'A2', label: 'Goal', fullName: 'Strategy.Goal',
    row: 'Strategy',
    specKeywords: ['goal', 'roadmap', 'milestone', 'phase', 'target', 'vision', 'architecture'],
    repoPaths: ['docs', 'CLAUDE.md', 'trust-debt-pipeline-coms.txt', 'spec'],
    room: 'architect',
  },
  {
    cellId: 'A3', label: 'Fund', fullName: 'Strategy.Fund',
    row: 'Strategy',
    specKeywords: ['fund', 'revenue', 'cost', 'budget', 'wallet', 'spending', 'financial'],
    repoPaths: ['src/skills/wallet.ts', 'src/skills/wallet-ledger.ts', 'src/skills/revenue-intake.ts', 'src/skills/spending-limits.ts'],
    room: 'performer',
  },
  {
    cellId: 'A4', label: 'Ethics', fullName: 'Strategy.Ethics',
    row: 'Strategy',
    specKeywords: ['ethics', 'trust', 'safety', 'audit', 'integrity', 'legitimacy'],
    repoPaths: ['src/auth/sovereignty-monitor.ts', 'src/auth/identity-vector.test.ts', 'src/auth/geometric.ts'],
    room: 'vault',
  },

  // Row B — Tactics
  {
    cellId: 'B1', label: 'Speed', fullName: 'Tactics.Speed',
    row: 'Tactics',
    specKeywords: ['speed', 'performance', 'fast', 'latency', 'optimize', 'efficient'],
    repoPaths: ['src/pipeline', 'src/cron', 'src/skills/llm-controller.ts'],
    room: 'navigator',
  },
  {
    cellId: 'B2', label: 'Deal', fullName: 'Tactics.Deal',
    row: 'Tactics',
    specKeywords: ['deal', 'partner', 'network', 'channel', 'integration', 'federation'],
    repoPaths: ['src/federation', 'src/channels', 'src/discord'],
    room: 'network',
  },
  {
    cellId: 'B3', label: 'Signal', fullName: 'Tactics.Signal',
    row: 'Tactics',
    specKeywords: ['signal', 'categorize', 'dispatch', 'route', 'hardness', 'tesseract', 'voice'],
    repoPaths: ['src/skills/thetasteer-categorize.ts', 'src/skills/voice-memo-reactor.ts', 'src/grid'],
    room: 'voice',
  },
  {
    cellId: 'B4', label: 'Proof', fullName: 'Tactics.Proof',
    row: 'Tactics',
    specKeywords: ['proof', 'test', 'benchmark', 'validate', 'verify', 'coverage'],
    repoPaths: ['tests', 'src/**/*.test.ts', 'reports/coverage'],
    room: 'navigator',
  },

  // Row C — Operations
  {
    cellId: 'C1', label: 'Grid', fullName: 'Operations.Grid',
    row: 'Operations',
    specKeywords: ['grid', 'tesseract', 'cell', 'pressure', 'pointer', 'event'],
    repoPaths: ['src/grid', 'src/grid-state-reader.ts', 'src/grid-state-writer.ts'],
    room: 'builder',
  },
  {
    cellId: 'C2', label: 'Loop', fullName: 'Operations.Loop',
    row: 'Operations',
    specKeywords: ['loop', 'ceo', 'steering', 'runtime', 'scheduler', 'cron', 'heartbeat'],
    repoPaths: ['src/ceo-loop.ts', 'src/runtime.ts', 'src/cron/scheduler.ts'],
    room: 'laboratory',
  },
  {
    cellId: 'C3', label: 'Flow', fullName: 'Operations.Flow',
    row: 'Operations',
    specKeywords: ['flow', 'pipeline', 'agent', 'swarm', 'orchestrat', 'claude-flow'],
    repoPaths: ['src/pipeline', 'src/swarm', 'agent-context.sh'],
    room: 'operator',
  },
  {
    cellId: 'C4', label: 'Safe', fullName: 'Operations.Safe',
    row: 'Operations',
    specKeywords: ['safe', 'backup', 'recovery', 'monitor', 'health', 'graceful', 'shutdown'],
    repoPaths: ['src/monitor', 'src/auth/sovereignty-monitor.ts'],
    room: 'operator',
  },
];

// ═══════════════════════════════════════════════════════════════
// Spec Intent Scanner
// ═══════════════════════════════════════════════════════════════

function scanSpecIntent(
  specContent: string,
  comsContent: string,
  mapping: CellMapping
): CellIntent {
  const combined = `${specContent}\n${comsContent}`.toLowerCase();
  const lines = combined.split('\n');

  let mentions = 0;
  const priorities: string[] = [];

  for (const keyword of mapping.specKeywords) {
    const kw = keyword.toLowerCase();
    for (const line of lines) {
      if (line.includes(kw)) {
        mentions++;
        // Extract priority items (lines with checkboxes or status markers)
        if (line.includes('- [') || line.includes('✅') || line.includes('❌') ||
            line.includes('priority') || line.includes('critical') || line.includes('important')) {
          const trimmed = line.trim().slice(0, 120);
          if (!priorities.includes(trimmed)) {
            priorities.push(trimmed);
          }
        }
      }
    }
  }

  // Determine status from spec content
  let specStatus: CellIntent['specStatus'] = 'not_mentioned';
  if (mentions > 10) {
    // Check if there are active/pending items
    const hasActive = priorities.some(p =>
      p.includes('- [ ]') || p.includes('pending') || p.includes('critical') || p.includes('❌')
    );
    const hasCompleted = priorities.some(p =>
      p.includes('- [x]') || p.includes('✅') || p.includes('complete')
    );

    if (hasActive) specStatus = 'active';
    else if (hasCompleted) specStatus = 'completed';
    else specStatus = 'pending';
  } else if (mentions > 0) {
    specStatus = 'pending';
  }

  return {
    cellId: mapping.cellId,
    specMentions: mentions,
    specStatus,
    specPriorities: priorities.slice(0, 5),
    lastSpecUpdate: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// Repo Reality Scanner
// ═══════════════════════════════════════════════════════════════

function scanRepoReality(
  repoRoot: string,
  mapping: CellMapping
): CellReality {
  let recentCommits = 0;
  let fileCount = 0;
  let lastModified = '';
  let linesOfCode = 0;
  let hasTests = false;

  for (const repoPath of mapping.repoPaths) {
    // Skip glob patterns — resolve actual paths
    if (repoPath.includes('*')) continue;

    const fullPath = resolve(repoRoot, repoPath);
    if (!existsSync(fullPath)) continue;

    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Count files recursively
      try {
        const files = listFilesRecursive(fullPath);
        fileCount += files.length;

        for (const file of files) {
          if (file.endsWith('.test.ts') || file.endsWith('.test.js')) {
            hasTests = true;
          }
          try {
            const content = readFileSync(file, 'utf-8');
            linesOfCode += content.split('\n').length;
          } catch { /* skip unreadable */ }

          try {
            const fileStat = statSync(file);
            const mtime = fileStat.mtime.toISOString();
            if (!lastModified || mtime > lastModified) {
              lastModified = mtime;
            }
          } catch { /* skip */ }
        }
      } catch { /* skip inaccessible dirs */ }
    } else if (stat.isFile()) {
      fileCount++;
      if (repoPath.endsWith('.test.ts') || repoPath.endsWith('.test.js')) {
        hasTests = true;
      }
      try {
        const content = readFileSync(fullPath, 'utf-8');
        linesOfCode += content.split('\n').length;
      } catch { /* skip */ }

      const mtime = stat.mtime.toISOString();
      if (!lastModified || mtime > lastModified) {
        lastModified = mtime;
      }
    }
  }

  // Count recent git commits touching these paths (last 30 days)
  for (const repoPath of mapping.repoPaths) {
    if (repoPath.includes('*')) continue;
    try {
      const result = execSync(
        `git log --oneline --since="30 days ago" -- "${repoPath}" 2>/dev/null | wc -l`,
        { cwd: repoRoot, encoding: 'utf-8', timeout: 5000 }
      ).trim();
      recentCommits += parseInt(result, 10) || 0;
    } catch { /* git not available or path doesn't exist */ }
  }

  return {
    cellId: mapping.cellId,
    recentCommits,
    fileCount,
    lastModified: lastModified || 'never',
    testCoverage: hasTests ? 'has_tests' : fileCount > 0 ? 'no_tests' : 'unknown',
    linesOfCode,
  };
}

function listFilesRecursive(dir: string, maxDepth = 4, depth = 0): string[] {
  if (depth >= maxDepth) return [];
  const results: string[] = [];

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...listFilesRecursive(fullPath, maxDepth, depth + 1));
        } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.js') || entry.endsWith('.md'))) {
          results.push(fullPath);
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// Drift Calculation
// ═══════════════════════════════════════════════════════════════

function calculateDrift(intent: CellIntent, reality: CellReality): {
  driftScore: number;
  driftDirection: CellDrift['driftDirection'];
  focusNeeded: boolean;
  recommendation: string;
} {
  // Normalize intent: 0-1 based on spec mentions relative to max
  const intentSignal = Math.min(intent.specMentions / 30, 1);

  // Normalize reality: 0-1 based on recent activity
  const commitSignal = Math.min(reality.recentCommits / 20, 1);
  const codeSignal = Math.min(reality.linesOfCode / 2000, 1);
  const realitySignal = (commitSignal * 0.6) + (codeSignal * 0.4);

  // Drift = difference between intent and reality
  const rawDrift = Math.abs(intentSignal - realitySignal);

  // Direction
  let driftDirection: CellDrift['driftDirection'];
  if (intentSignal < 0.1 && realitySignal < 0.1) {
    driftDirection = 'both_cold';
  } else if (intentSignal > realitySignal + 0.15) {
    driftDirection = 'spec_ahead';
  } else if (realitySignal > intentSignal + 0.15) {
    driftDirection = 'repo_ahead';
  } else {
    driftDirection = 'aligned';
  }

  // Focus needed when spec says it's important but repo isn't keeping up
  const focusNeeded = driftDirection === 'spec_ahead' && intent.specStatus === 'active';

  // Generate recommendation
  let recommendation: string;
  switch (driftDirection) {
    case 'spec_ahead':
      recommendation = `Spec emphasizes ${intent.specPriorities[0] || 'this domain'} but repo has only ${reality.recentCommits} recent commits. Implementation needed.`;
      break;
    case 'repo_ahead':
      recommendation = `Repo has ${reality.recentCommits} recent commits and ${reality.linesOfCode} LOC but spec barely mentions this. Update spec to match reality.`;
      break;
    case 'both_cold':
      recommendation = `Neither spec nor repo show activity. Verify this cell is intentionally dormant.`;
      break;
    case 'aligned':
      recommendation = `Spec and repo are aligned. ${reality.recentCommits} recent commits match spec priority.`;
      break;
  }

  return { driftScore: rawDrift, driftDirection, focusNeeded, recommendation };
}

// ═══════════════════════════════════════════════════════════════
// ASCII Grid Renderer (drift-aware)
// ═══════════════════════════════════════════════════════════════

function renderDriftGrid(cells: CellDrift[]): string {
  const cellMap = new Map(cells.map(c => [c.cellId, c]));

  const header = '            Col 1        Col 2        Col 3        Col 4';
  const divider = '          +------------+------------+------------+------------+';

  const rows = [
    { label: 'A Strategy  ', ids: ['A1', 'A2', 'A3', 'A4'] },
    { label: 'B Tactics   ', ids: ['B1', 'B2', 'B3', 'B4'] },
    { label: 'C Operations', ids: ['C1', 'C2', 'C3', 'C4'] },
  ];

  const lines: string[] = [header, divider];

  for (const row of rows) {
    let cellLine = row.label + '|';
    for (const id of row.ids) {
      const cell = cellMap.get(id);
      if (!cell) {
        cellLine += '    ???     |';
        continue;
      }

      const icon = driftIcon(cell.driftDirection);
      const score = (cell.driftScore * 100).toFixed(0).padStart(3);
      const label = cell.label.padEnd(5);
      cellLine += ` ${icon} ${label}${score}%|`;
    }
    lines.push(cellLine);
    lines.push(divider);
  }

  // Legend
  lines.push('');
  lines.push('Legend: \u2705 aligned  \u26a0\ufe0f spec>repo  \u2b06\ufe0f repo>spec  \u2744\ufe0f cold');

  return lines.join('\n');
}

function driftIcon(direction: CellDrift['driftDirection']): string {
  switch (direction) {
    case 'aligned': return '\u2705';
    case 'spec_ahead': return '\u26a0\ufe0f';
    case 'repo_ahead': return '\u2b06\ufe0f';
    case 'both_cold': return '\u2744\ufe0f';
  }
}

// ═══════════════════════════════════════════════════════════════
// Main: Generate Drift Signal
// ═══════════════════════════════════════════════════════════════

export function generateDriftSignal(
  repoRoot: string,
  specPath?: string,
  comsPath?: string,
): DriftSignal {
  const resolvedSpecPath = specPath || join(repoRoot, '..', 'thetadrivencoach', 'openclaw', 'data', 'spec.md');
  const resolvedComsPath = comsPath || join(repoRoot, 'trust-debt-pipeline-coms.txt');

  // Load spec and COMS
  const specContent = existsSync(resolvedSpecPath) ? readFileSync(resolvedSpecPath, 'utf-8') : '';
  const comsContent = existsSync(resolvedComsPath) ? readFileSync(resolvedComsPath, 'utf-8') : '';

  const cells: CellDrift[] = [];

  for (const mapping of CELL_MAPPINGS) {
    const intent = scanSpecIntent(specContent, comsContent, mapping);
    const reality = scanRepoReality(repoRoot, mapping);
    const drift = calculateDrift(intent, reality);

    cells.push({
      cellId: mapping.cellId,
      label: mapping.label,
      fullName: mapping.fullName,
      room: mapping.room,
      intent,
      reality,
      ...drift,
    });
  }

  // Aggregate
  const overallDrift = cells.reduce((sum, c) => sum + c.driftScore, 0) / cells.length;
  const hotCells = cells
    .filter(c => c.focusNeeded)
    .sort((a, b) => b.driftScore - a.driftScore)
    .map(c => c.cellId);
  const coldCells = cells
    .filter(c => c.driftDirection === 'both_cold')
    .map(c => c.cellId);

  // Focus recommendation
  let focusRecommendation: string;
  if (hotCells.length === 0) {
    focusRecommendation = 'No urgent drift detected. System is tracking spec well.';
  } else {
    const topCell = cells.find(c => c.cellId === hotCells[0])!;
    focusRecommendation = `Focus needed on ${topCell.fullName} (${topCell.room} room): ${topCell.recommendation}`;
  }

  return {
    timestamp: new Date().toISOString(),
    specSource: resolvedSpecPath,
    repoRoot,
    cells,
    overallDrift,
    hotCells,
    coldCells,
    focusRecommendation,
    gridAscii: renderDriftGrid(cells),
  };
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

export { CELL_MAPPINGS };
