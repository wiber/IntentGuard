/**
 * event-system-examples.ts — Examples for Tesseract Grid Event System
 *
 * Demonstrates:
 * 1. Task completion wiring to grid events
 * 2. Hot-cell pressure analysis and routing
 * 3. Deep link generation for navigation
 */

import {
  gridEventBridge,
  hotCellRouter,
  deepLinker,
  type GridEvent,
} from './index';

/**
 * Example 1: Wire task completions to grid events
 */
export function exampleTaskCompletion() {
  console.log('🔧 Example 1: Task Completion Wiring\n');

  // Simulate task completions across different phases
  const tasks = [
    { phase: 0, text: 'Define quarterly goals for team expansion' },
    { phase: 1, text: 'Detect market signal: competitor launched new feature' },
    { phase: 2, text: 'Review legal compliance for new data policy' },
    { phase: 3, text: 'Optimize deployment pipeline speed' },
    { phase: 4, text: 'Integrate tesseract grid event system' },
    { phase: 6, text: 'Secure Series A funding: $5M committed' },
    { phase: 7, text: 'Enter flow state: 4-hour coding session' },
    { phase: 8, text: 'Close deal with Fortune 500 client' },
    { phase: 9, text: 'Complete feedback loop: customer survey results' },
  ];

  console.log('📊 Emitting events for task completions:');
  for (const task of tasks) {
    const event = gridEventBridge.onTaskComplete(task.phase, task.text, {
      timestamp: new Date().toISOString(),
      priority: 'high',
    });

    if (event) {
      console.log(`  ✓ Phase ${event.phase} → ${event.cell}: ${task.text.substring(0, 50)}...`);
    }
  }

  console.log(`\n📂 Events stored in: ${gridEventBridge.getEventsPath()}\n`);
}

/**
 * Example 2: Hot-cell pressure analysis and routing
 */
export function exampleHotCellRouting() {
  console.log('🔥 Example 2: Hot-Cell Pressure Analysis\n');

  // Update pressures based on recent events
  const pressures = hotCellRouter.updatePressures();

  console.log('📊 Cell Pressures:');
  for (const [cell, pressure] of Object.entries(pressures)) {
    const bar = '█'.repeat(Math.floor(pressure * 20));
    console.log(`  ${cell}: ${bar} ${(pressure * 100).toFixed(0)}%`);
  }

  // Get hot cells above threshold
  const hotCells = hotCellRouter.getHotCells(0.5);
  console.log(`\n🔥 Hot Cells (>50%): ${hotCells.join(', ')}`);

  // Get routing recommendation
  const recommendation = hotCellRouter.routeToRoom(hotCells);
  console.log(`\n🎯 Routing Recommendation:`);
  console.log(`  Room: ${recommendation.room}`);
  console.log(`  Cells: ${recommendation.cells.join(', ')}`);
  console.log(`  Total Pressure: ${(recommendation.totalPressure * 100).toFixed(0)}%`);
  console.log(`  Reason: ${recommendation.reason}\n`);

  // Print full summary
  console.log(hotCellRouter.getSummary());
}

/**
 * Example 3: Deep link generation
 */
export function exampleDeepLinks() {
  console.log('🔗 Example 3: Deep Link Generation\n');

  // Generate tesseract.nu links
  console.log('📍 Tesseract.nu Links:');
  console.log(`  A2 (Goal): ${deepLinker.generateDeepLink('A2', 'Quarterly planning session')}`);
  console.log(`  B3 (Signal): ${deepLinker.generateDeepLink('B3', 'Market intelligence update')}`);
  console.log(`  C2 (Loop): ${deepLinker.generateDeepLink('C2', 'Feedback cycle complete')}`);

  // Multi-cell comparison
  console.log('\n🔍 Comparison Link:');
  const comparisonUrl = deepLinker.generateComparisonLink(['A2', 'B3', 'C2'], 'overlay');
  console.log(`  ${comparisonUrl}`);

  // Room-focused link
  console.log('\n🏠 Room Link:');
  const roomUrl = deepLinker.generateRoomLink('#strategy-room', 'A2');
  console.log(`  ${roomUrl}`);

  // Timeline link
  console.log('\n⏰ Timeline Link:');
  const start = new Date('2026-02-14T00:00:00Z');
  const end = new Date('2026-02-14T23:59:59Z');
  const timelineUrl = deepLinker.generateTimelineLink('A2', start, end);
  console.log(`  ${timelineUrl}`);

  // Markdown link
  console.log('\n📝 Markdown Link:');
  const mdLink = deepLinker.generateMarkdownLink('A2', 'Strategy Goal', 'Q1 2026 Planning');
  console.log(`  ${mdLink}`);

  // Parse link
  console.log('\n🔍 Parse Link:');
  const parsed = deepLinker.parseDeepLink(deepLinker.generateDeepLink('A2', 'Test context'));
  console.log(`  Parsed: ${JSON.stringify(parsed, null, 2)}`);

  // Discord link
  console.log('\n💬 Discord Link:');
  const discordUrl = deepLinker.generateDiscordLink('A2', '1234567890', '9876543210', '1111111111');
  console.log(`  ${discordUrl}`);

  // Embed data
  console.log('\n📦 Embed Data:');
  const embedData = deepLinker.generateEmbedData('A2', 'Strategy planning session');
  console.log(`  Title: ${embedData.title}`);
  console.log(`  URL: ${embedData.url}`);
  console.log(`  Description: ${embedData.description}\n`);
}

/**
 * Example 4: Complete workflow simulation
 */
export function exampleCompleteWorkflow() {
  console.log('🌊 Example 4: Complete Workflow Simulation\n');

  // Step 1: Emit task completions
  console.log('Step 1: Task completions');
  gridEventBridge.onTaskComplete(0, 'Define Q1 goals');
  gridEventBridge.onTaskComplete(1, 'Market signal detected');
  gridEventBridge.onTaskComplete(4, 'Grid integration complete');

  // Step 2: Analyze pressure
  console.log('\nStep 2: Pressure analysis');
  hotCellRouter.updatePressures();
  const hotCells = hotCellRouter.getHotCells(0.5);
  console.log(`Hot cells: ${hotCells.join(', ')}`);

  // Step 3: Get routing recommendation
  console.log('\nStep 3: Routing recommendation');
  const routing = hotCellRouter.routeToRoom(hotCells);
  console.log(`Recommended room: ${routing.room}`);

  // Step 4: Generate navigation links
  console.log('\nStep 4: Navigation links');
  for (const cell of routing.cells) {
    const link = deepLinker.generateDeepLink(cell, `Priority routing to ${routing.room}`);
    console.log(`  ${cell}: ${link}`);
  }

  console.log('\n✅ Workflow complete!\n');
}

/**
 * Main entry point
 */
function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   TESSERACT GRID EVENT SYSTEM - EXAMPLES');
  console.log('═══════════════════════════════════════════════════════════\n');

  exampleTaskCompletion();
  console.log('─'.repeat(63) + '\n');

  exampleHotCellRouting();
  console.log('─'.repeat(63) + '\n');

  exampleDeepLinks();
  console.log('─'.repeat(63) + '\n');

  exampleCompleteWorkflow();
}

// Run if executed directly
if (require.main === module) {
  main();
}
