/**
 * integration-example.ts — Complete Grid Module Integration
 *
 * Demonstrates how all grid modules work together:
 * - Event Bridge: Track task completions
 * - Hot Cell Router: Calculate pressures and route to rooms
 * - Tesseract Client: Sync with tesseract.nu API
 * - ASCII Renderer: Display grid in Discord
 * - Deep Linker: Generate navigation links
 */

import {
  gridEventBridge,
  hotCellRouter,
  fetchGridState,
  pushPointerEvent,
  renderGrid,
  renderGridEmbed,
  deepLinker,
  type RecentEvent,
} from './index.js';

// ═══════════════════════════════════════════════════════════════
// Example 1: Complete Task Completion Flow
// ═══════════════════════════════════════════════════════════════

export async function handleTaskCompletion(
  phase: number,
  taskText: string,
  discordChannelId: string,
  discordMessageId: string
) {
  console.log(`\n🎯 Task Completion Flow Started`);
  console.log(`Phase: ${phase}, Task: "${taskText}"`);

  // 1. Emit local grid event
  const gridEvent = gridEventBridge.onTaskComplete(phase, taskText, {
    discordChannelId,
    discordMessageId,
  });

  if (!gridEvent) {
    console.error('❌ No cell mapping found for phase');
    return;
  }

  console.log(`✓ Local event emitted: ${gridEvent.cell}`);

  // 2. Push to tesseract.nu
  const response = await pushPointerEvent(gridEvent.cell, 'task-complete', {
    phase,
    task: taskText,
    timestamp: gridEvent.timestamp,
  });

  if (response.success) {
    console.log(`✓ Synced to tesseract.nu`);
  } else {
    console.warn(`⚠ Sync failed: ${response.message}`);
  }

  // 3. Update hot cell pressures
  const pressures = hotCellRouter.updatePressures();
  console.log(`✓ Pressures updated: ${Object.keys(pressures).length} cells`);

  // 4. Check if this created a hot cell
  const hotCells = hotCellRouter.getHotCells(0.7);
  if (hotCells.length > 0) {
    console.log(`🔥 HOT CELLS: ${hotCells.join(', ')}`);

    // 5. Get routing recommendation
    const routing = hotCellRouter.routeToRoom(hotCells);
    console.log(`📍 Route to: ${routing.room} (${routing.reason})`);
  }

  // 6. Generate deep link for this event
  const deepLink = deepLinker.generateDeepLink(gridEvent.cell, taskText);
  console.log(`🔗 Deep link: ${deepLink}`);

  return {
    gridEvent,
    syncSuccess: response.success,
    hotCells,
    deepLink,
  };
}

// ═══════════════════════════════════════════════════════════════
// Example 2: Discord Grid Status Command
// ═══════════════════════════════════════════════════════════════

export async function handleGridStatusCommand() {
  console.log(`\n📊 Grid Status Command`);

  // 1. Fetch live state from tesseract.nu
  const cellPressures = await fetchGridState();
  console.log(`✓ Fetched state from API`);

  // 2. Update local pressure calculations
  const localPressures = hotCellRouter.updatePressures();
  console.log(`✓ Updated local pressures`);

  // 3. Merge API and local data (prefer API)
  const mergedPressures = { ...localPressures, ...cellPressures };

  // 4. Generate ASCII grid
  const asciiGrid = renderGrid(mergedPressures);
  console.log(`✓ Generated ASCII grid`);

  // 5. Get recent events for embed
  const recentEvents: RecentEvent[] = hotCellRouter
    .getAllPressures()
    .slice(0, 5)
    .map(cell => ({
      cellId: cell.cell,
      type: 'pressure-update',
      timestamp: new Date(cell.lastEvent),
      description: `Pressure: ${(cell.pressure * 100).toFixed(0)}%`,
    }));

  // 6. Generate embed
  const embed = renderGridEmbed(mergedPressures, recentEvents);
  console.log(`✓ Generated embed`);

  return {
    ascii: asciiGrid,
    embed,
    pressures: mergedPressures,
  };
}

// ═══════════════════════════════════════════════════════════════
// Example 3: Hot Cell Alert System
// ═══════════════════════════════════════════════════════════════

export async function checkForHotCells(): Promise<{
  hasHotCells: boolean;
  alertMessage?: string;
  routing?: any;
}> {
  console.log(`\n🔥 Hot Cell Check`);

  // 1. Update pressures
  const pressures = hotCellRouter.updatePressures();

  // 2. Get hot cells (threshold: 0.7)
  const hotCells = hotCellRouter.getHotCells(0.7);

  if (hotCells.length === 0) {
    console.log(`✓ No hot cells detected`);
    return { hasHotCells: false };
  }

  console.log(`🔥 ALERT: ${hotCells.length} hot cells`);

  // 3. Get routing recommendation
  const routing = hotCellRouter.routeToRoom(hotCells);

  // 4. Build alert message with deep links
  const cellLinks = hotCells.map(cell => {
    const cellData = hotCellRouter.getCellPressure(cell);
    const link = deepLinker.generateMarkdownLink(cell);
    const pressure = cellData ? (cellData.pressure * 100).toFixed(0) : 'N/A';
    return `• ${link}: ${pressure}% pressure (${cellData?.eventCount || 0} events)`;
  });

  const roomLink = deepLinker.generateRoomLink(routing.room);

  const alertMessage = `
🔥 **HOT CELL ALERT**

**Detected Hot Cells:**
${cellLinks.join('\n')}

**Routing Recommendation:**
Room: [${routing.room}](${roomLink})
Reason: ${routing.reason}

**Action Required:**
Route priority tasks to ${routing.room} for immediate attention.
  `.trim();

  console.log(`✓ Alert generated`);

  return {
    hasHotCells: true,
    alertMessage,
    routing,
  };
}

// ═══════════════════════════════════════════════════════════════
// Example 4: Batch Task Processing
// ═══════════════════════════════════════════════════════════════

export async function processBatchTasks(
  tasks: Array<{ phase: number; text: string }>
) {
  console.log(`\n📦 Batch Task Processing: ${tasks.length} tasks`);

  // 1. Emit local events for all tasks
  const gridEvents = tasks
    .map(task => gridEventBridge.onTaskComplete(task.phase, task.text))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  console.log(`✓ Emitted ${gridEvents.length} local events`);

  // 2. Batch push to tesseract.nu
  const { pushPointerEvents } = await import('./index.js');
  const pointerEvents = gridEvents.map(e => ({
    cellId: e.cell,
    eventType: 'task-complete',
    data: {
      phase: e.phase,
      task: e.task,
      timestamp: e.timestamp,
    },
  }));

  const responses = await pushPointerEvents(pointerEvents);
  const successCount = responses.filter(r => r.success).length;
  console.log(`✓ Synced ${successCount}/${responses.length} events to API`);

  // 3. Update pressures once after batch
  const pressures = hotCellRouter.updatePressures();
  console.log(`✓ Updated pressures: ${Object.keys(pressures).length} cells`);

  // 4. Check for hot cells
  const hotCells = hotCellRouter.getHotCells(0.7);
  if (hotCells.length > 0) {
    console.log(`🔥 Created ${hotCells.length} hot cells`);
  }

  return {
    processedCount: gridEvents.length,
    syncedCount: successCount,
    hotCells,
    pressures,
  };
}

// ═══════════════════════════════════════════════════════════════
// Example 5: Grid Timeline View
// ═══════════════════════════════════════════════════════════════

export async function generateTimelineView(
  cellId: string,
  hoursBack: number = 24
) {
  console.log(`\n📅 Timeline View: ${cellId} (last ${hoursBack}h)`);

  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const endTime = new Date();

  // 1. Generate timeline deep link
  const timelineLink = deepLinker.generateTimelineLink(
    cellId,
    startTime,
    endTime
  );

  // 2. Get current pressure
  const cellData = hotCellRouter.getCellPressure(cellId);

  // 3. Build timeline message
  const message = `
📅 **Timeline: ${cellId}**

**Period:** ${startTime.toLocaleString()} → ${endTime.toLocaleString()}

**Current Pressure:** ${cellData ? (cellData.pressure * 100).toFixed(0) : 'N/A'}%
**Events in Period:** ${cellData?.eventCount || 0}
**Last Event:** ${cellData?.lastEvent ? new Date(cellData.lastEvent).toLocaleString() : 'None'}

🔗 [View on tesseract.nu](${timelineLink})
  `.trim();

  console.log(`✓ Timeline generated`);

  return {
    message,
    timelineLink,
    cellData,
  };
}

// ═══════════════════════════════════════════════════════════════
// Example 6: Multi-Cell Comparison
// ═══════════════════════════════════════════════════════════════

export async function compareHotCells() {
  console.log(`\n🔍 Hot Cell Comparison`);

  // 1. Get hot cells
  const hotCells = hotCellRouter.getHotCells(0.5); // Lower threshold

  if (hotCells.length === 0) {
    console.log(`✓ No cells above threshold`);
    return { message: 'No hot cells to compare' };
  }

  console.log(`✓ Found ${hotCells.length} cells for comparison`);

  // 2. Generate comparison link
  const comparisonLink = deepLinker.generateComparisonLink(hotCells, 'overlay');

  // 3. Get pressure data for each cell
  const cellData = hotCells.map(cell => {
    const data = hotCellRouter.getCellPressure(cell);
    return {
      cell,
      pressure: data?.pressure || 0,
      events: data?.eventCount || 0,
      lastEvent: data?.lastEvent,
    };
  });

  // 4. Build comparison message
  const cellLines = cellData.map(
    c => `• **${c.cell}**: ${(c.pressure * 100).toFixed(0)}% (${c.events} events)`
  );

  const message = `
🔍 **Hot Cell Comparison**

${cellLines.join('\n')}

🔗 [Compare on tesseract.nu](${comparisonLink})
  `.trim();

  console.log(`✓ Comparison generated`);

  return {
    message,
    comparisonLink,
    cellData,
  };
}

// ═══════════════════════════════════════════════════════════════
// Example 7: Complete Integration Demo
// ═══════════════════════════════════════════════════════════════

export async function fullIntegrationDemo() {
  console.log('\n' + '═'.repeat(60));
  console.log('TESSERACT GRID - FULL INTEGRATION DEMO');
  console.log('═'.repeat(60));

  // 1. Simulate task completion
  await handleTaskCompletion(
    0,
    'Define Q1 revenue goals',
    'channel-123',
    'message-456'
  );

  // 2. Get grid status
  const status = await handleGridStatusCommand();
  console.log(`\n${status.ascii}`);

  // 3. Check for hot cells
  const hotCellCheck = await checkForHotCells();
  if (hotCellCheck.hasHotCells) {
    console.log(`\n${hotCellCheck.alertMessage}`);
  }

  // 4. Generate summary
  const summary = hotCellRouter.getSummary();
  console.log(`\n${summary}`);

  console.log('\n' + '═'.repeat(60));
  console.log('DEMO COMPLETE');
  console.log('═'.repeat(60));
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fullIntegrationDemo().catch(console.error);
}
