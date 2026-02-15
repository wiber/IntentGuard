/**
 * example-usage.ts — Usage examples for grid modules
 *
 * Demonstrates how to use the ASCII renderer and tesseract client
 * in Discord bot commands.
 */

import {
  fetchGridState,
  pushPointerEvent,
  checkHealth,
  renderGrid,
  renderGridEmbed,
  type RecentEvent,
} from './index.js';

// ═══════════════════════════════════════════════════════════════
// Example 1: Simple Grid Display Command
// ═══════════════════════════════════════════════════════════════

export async function handleGridCommand(): Promise<string> {
  // Fetch current grid state
  const cellPressures = await fetchGridState();

  // Render as ASCII for Discord code block
  const asciiGrid = renderGrid(cellPressures);

  return asciiGrid;
}

// ═══════════════════════════════════════════════════════════════
// Example 2: Grid Embed with Recent Events
// ═══════════════════════════════════════════════════════════════

export async function handleGridEmbedCommand(recentEvents?: RecentEvent[]) {
  // Fetch current grid state
  const cellPressures = await fetchGridState();

  // Create embed data
  const embed = renderGridEmbed(cellPressures, recentEvents);

  return embed;
}

// ═══════════════════════════════════════════════════════════════
// Example 3: Push Pointer Event After Bot Action
// ═══════════════════════════════════════════════════════════════

export async function recordBotAction(
  cellId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  // Push event to tesseract.nu
  const response = await pushPointerEvent(cellId, action, metadata);

  if (response.success) {
    console.log(`✓ Recorded ${action} in ${cellId}`);
    return true;
  } else {
    console.error(`✗ Failed to record ${action}:`, response.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Example 4: Health Check Before Operations
// ═══════════════════════════════════════════════════════════════

export async function ensureApiHealth(): Promise<boolean> {
  const health = await checkHealth();

  if (health.healthy) {
    console.log(`✓ API healthy (latency: ${health.latencyMs}ms)`);
    return true;
  } else {
    console.error(`✗ API unhealthy (latency: ${health.latencyMs}ms)`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Example 5: Complete Discord Command Handler
// ═══════════════════════════════════════════════════════════════

export async function handleCompleteGridInteraction() {
  // 1. Check API health
  const healthy = await ensureApiHealth();
  if (!healthy) {
    return {
      content: '⚠️ Tesseract API unavailable. Using cached data.',
      ephemeral: true,
    };
  }

  // 2. Fetch grid state
  const cellPressures = await fetchGridState();

  // 3. Generate ASCII display
  const asciiGrid = renderGrid(cellPressures);

  // 4. Create embed with context
  const recentEvents: RecentEvent[] = [
    {
      cellId: 'B2',
      type: 'deal-negotiated',
      timestamp: new Date(Date.now() - 5 * 60000), // 5 min ago
      description: 'Partnership agreement signed',
    },
    {
      cellId: 'C2',
      type: 'loop-iteration',
      timestamp: new Date(Date.now() - 15 * 60000), // 15 min ago
      description: 'CEO loop cycle completed',
    },
  ];

  const embed = renderGridEmbed(cellPressures, recentEvents);

  // 5. Return both ASCII and embed
  return {
    content: asciiGrid,
    embeds: [embed],
  };
}

// ═══════════════════════════════════════════════════════════════
// Example 6: Cell-Specific Pressure Query
// ═══════════════════════════════════════════════════════════════

export async function getCellPressure(cellId: string): Promise<number | null> {
  const cellPressures = await fetchGridState();
  return cellPressures[cellId] ?? null;
}

// ═══════════════════════════════════════════════════════════════
// Example 7: Record Multiple Actions in Batch
// ═══════════════════════════════════════════════════════════════

export async function recordBatchActions() {
  const { pushPointerEvents } = await import('./index.js');

  const events = [
    { cellId: 'A1', eventType: 'law-compliance-check', data: { status: 'passed' } },
    { cellId: 'B1', eventType: 'speed-optimization', data: { improvement: '15%' } },
    { cellId: 'C1', eventType: 'grid-update', data: { cells_modified: 3 } },
  ];

  const results = await pushPointerEvents(events);

  const successCount = results.filter(r => r.success).length;
  console.log(`✓ Recorded ${successCount}/${events.length} events`);

  return successCount === events.length;
}

// ═══════════════════════════════════════════════════════════════
// Example 8: Formatted Status Message
// ═══════════════════════════════════════════════════════════════

export async function getGridStatusMessage(): Promise<string> {
  const cellPressures = await fetchGridState();

  // Find hottest cell
  let hottestCell = 'A1';
  let maxPressure = 0;

  for (const [cellId, pressure] of Object.entries(cellPressures)) {
    if (pressure > maxPressure) {
      maxPressure = pressure;
      hottestCell = cellId;
    }
  }

  // Calculate average
  const pressureValues = Object.values(cellPressures);
  const avgPressure = pressureValues.reduce((sum, p) => sum + p, 0) / pressureValues.length;

  // Generate status
  let status = '🟢 All systems nominal';
  if (avgPressure > 0.7) {
    status = '🔴 CRITICAL: Grid under high pressure';
  } else if (avgPressure > 0.3) {
    status = '🟡 ELEVATED: Increased activity detected';
  }

  return `
**Tesseract Grid Status**

${status}

📊 **Metrics:**
• Average Pressure: ${avgPressure.toFixed(2)}
• Hottest Cell: ${hottestCell} (${maxPressure.toFixed(2)})
• Last Updated: ${new Date().toLocaleString()}

Use \`/grid show\` for detailed view.
  `.trim();
}
