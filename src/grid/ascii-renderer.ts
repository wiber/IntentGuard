/**
 * ascii-renderer.ts — Discord ASCII Grid Renderer
 *
 * Renders the 12-cell tesseract grid with ANSI heat coloring for Discord.
 * Grid layout: 3 rows (Strategy, Tactics, Operations) x 4 columns
 * Heat mapping: green (cold 0-0.3), yellow (warm 0.3-0.7), red (hot 0.7-1.0)
 */

// ═══════════════════════════════════════════════════════════════
// Grid Cell Definitions
// ═══════════════════════════════════════════════════════════════

interface GridCell {
  id: string;
  label: string;
  row: number;
  col: number;
}

const GRID_CELLS: GridCell[] = [
  // Row A - Strategy
  { id: 'A1', label: 'Law', row: 0, col: 0 },
  { id: 'A2', label: 'Goal', row: 0, col: 1 },
  { id: 'A3', label: 'Fund', row: 0, col: 2 },
  { id: 'A4', label: 'Ethics', row: 0, col: 3 },

  // Row B - Tactics
  { id: 'B1', label: 'Speed', row: 1, col: 0 },
  { id: 'B2', label: 'Deal', row: 1, col: 1 },
  { id: 'B3', label: 'Signal', row: 1, col: 2 },
  { id: 'B4', label: 'Proof', row: 1, col: 3 },

  // Row C - Operations
  { id: 'C1', label: 'Grid', row: 2, col: 0 },
  { id: 'C2', label: 'Loop', row: 2, col: 1 },
  { id: 'C3', label: 'Flow', row: 2, col: 2 },
  { id: 'C4', label: 'Safe', row: 2, col: 3 },
];

const ROW_LABELS = ['A Strategy', 'B Tactics', 'C Operations'];

// ═══════════════════════════════════════════════════════════════
// ANSI Color Codes for Discord
// ═══════════════════════════════════════════════════════════════

const ANSI = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',

  // Heat colors
  green: '\u001b[32m',      // Cold (0-0.3)
  yellow: '\u001b[33m',     // Warm (0.3-0.7)
  red: '\u001b[31m',        // Hot (0.7-1.0)

  // UI colors
  cyan: '\u001b[36m',       // Headers
  gray: '\u001b[90m',       // Borders/labels
  white: '\u001b[37m',      // Default text
};

// ═══════════════════════════════════════════════════════════════
// Heat Coloring Logic
// ═══════════════════════════════════════════════════════════════

function getHeatColor(pressure: number): string {
  if (pressure < 0.3) return ANSI.green;
  if (pressure < 0.7) return ANSI.yellow;
  return ANSI.red;
}

function getHeatEmoji(pressure: number): string {
  if (pressure < 0.3) return '🟢';
  if (pressure < 0.7) return '🟡';
  return '🔴';
}

// ═══════════════════════════════════════════════════════════════
// ASCII Grid Rendering
// ═══════════════════════════════════════════════════════════════

export interface RecentEvent {
  cellId: string;
  type: string;
  timestamp: Date;
  description?: string;
}

export function renderGrid(cellPressures: Record<string, number>): string {
  const lines: string[] = [];

  // Header
  lines.push(`${ANSI.cyan}${ANSI.bold}╔════════════════════════════════════════════════════╗${ANSI.reset}`);
  lines.push(`${ANSI.cyan}${ANSI.bold}║  TESSERACT GRID - 12-CELL PRESSURE MAP            ║${ANSI.reset}`);
  lines.push(`${ANSI.cyan}${ANSI.bold}╚════════════════════════════════════════════════════╝${ANSI.reset}`);
  lines.push('');

  // Column headers
  lines.push(`${ANSI.gray}        Col 1      Col 2      Col 3      Col 4${ANSI.reset}`);
  lines.push(`${ANSI.gray}    ┌──────────┬──────────┬──────────┬──────────┐${ANSI.reset}`);

  // Render each row
  for (let row = 0; row < 3; row++) {
    const rowLabel = ROW_LABELS[row];
    const cells = GRID_CELLS.filter(c => c.row === row);

    // Row label
    lines.push(`${ANSI.gray}${rowLabel.padEnd(4)}│${ANSI.reset}${renderRow(cells, cellPressures)}`);

    // Separator (except after last row)
    if (row < 2) {
      lines.push(`${ANSI.gray}    ├──────────┼──────────┼──────────┼──────────┤${ANSI.reset}`);
    }
  }

  // Bottom border
  lines.push(`${ANSI.gray}    └──────────┴──────────┴──────────┴──────────┘${ANSI.reset}`);
  lines.push('');

  // Legend
  lines.push(`${ANSI.bold}Legend:${ANSI.reset}`);
  lines.push(`  ${ANSI.green}🟢 Cold${ANSI.reset}   (0.00-0.30) - Normal operations`);
  lines.push(`  ${ANSI.yellow}🟡 Warm${ANSI.reset}   (0.30-0.70) - Elevated activity`);
  lines.push(`  ${ANSI.red}🔴 Hot${ANSI.reset}    (0.70-1.00) - Critical attention needed`);

  return `\`\`\`ansi\n${lines.join('\n')}\n\`\`\``;
}

function renderRow(cells: GridCell[], pressures: Record<string, number>): string {
  const cellStrings = cells.map(cell => {
    const pressure = pressures[cell.id] ?? 0;
    const color = getHeatColor(pressure);
    const emoji = getHeatEmoji(pressure);
    const pressureStr = pressure.toFixed(2);

    // Format: "A1 Law 0.42" with color
    const content = `${cell.id} ${cell.label} ${pressureStr}`;
    return `${color}${emoji}${content.padEnd(9)}${ANSI.reset}`;
  });

  return cellStrings.join(`${ANSI.gray}│${ANSI.reset}`);
}

// ═══════════════════════════════════════════════════════════════
// Discord Embed Rendering
// ═══════════════════════════════════════════════════════════════

export interface GridEmbed {
  title: string;
  description: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

export function renderGridEmbed(
  cellPressures: Record<string, number>,
  recentEvents?: RecentEvent[]
): GridEmbed {
  // Calculate overall grid health
  const pressureValues = Object.values(cellPressures);
  const avgPressure = pressureValues.length > 0
    ? pressureValues.reduce((sum, p) => sum + p, 0) / pressureValues.length
    : 0;

  // Determine embed color based on average pressure
  let embedColor: number;
  if (avgPressure < 0.3) {
    embedColor = 0x00ff00; // Green
  } else if (avgPressure < 0.7) {
    embedColor = 0xffff00; // Yellow
  } else {
    embedColor = 0xff0000; // Red
  }

  // Build description with grid summary
  const description = buildGridDescription(cellPressures);

  // Add recent events as fields
  const fields: Array<{ name: string; value: string; inline: boolean }> = [];

  if (recentEvents && recentEvents.length > 0) {
    const eventsText = recentEvents
      .slice(0, 5)
      .map(e => {
        const timeStr = formatTimestamp(e.timestamp);
        return `• **${e.cellId}** ${e.type} - ${e.description || 'Event'} (${timeStr})`;
      })
      .join('\n');

    fields.push({
      name: '📊 Recent Events',
      value: eventsText || 'No recent events',
      inline: false,
    });
  }

  return {
    title: '🎯 Tesseract Grid Status',
    description,
    color: embedColor,
    fields,
    footer: { text: `Average Pressure: ${avgPressure.toFixed(2)} | Updated` },
    timestamp: new Date().toISOString(),
  };
}

function buildGridDescription(cellPressures: Record<string, number>): string {
  const lines: string[] = [];

  for (let row = 0; row < 3; row++) {
    const rowLabel = ROW_LABELS[row];
    const cells = GRID_CELLS.filter(c => c.row === row);

    lines.push(`**${rowLabel}**`);

    const cellLines = cells.map(cell => {
      const pressure = cellPressures[cell.id] ?? 0;
      const emoji = getHeatEmoji(pressure);
      return `${emoji} ${cell.id} ${cell.label}: ${pressure.toFixed(2)}`;
    });

    lines.push(cellLines.join(' • '));
    lines.push('');
  }

  return lines.join('\n');
}

function formatTimestamp(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

export { GRID_CELLS, ROW_LABELS };
