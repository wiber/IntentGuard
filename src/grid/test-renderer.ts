/**
 * test-renderer.ts — Quick test of ASCII renderer
 *
 * Run with: npx tsx src/grid/test-renderer.ts
 */

import { renderGrid, renderGridEmbed, type RecentEvent } from './ascii-renderer.js';

// Test data: 12 cells with varying pressures
const testPressures: Record<string, number> = {
  // Strategy row (A) - Cold to warm
  A1: 0.15, // Law - Cold
  A2: 0.42, // Goal - Warm
  A3: 0.28, // Fund - Cold
  A4: 0.55, // Ethics - Warm

  // Tactics row (B) - Mix
  B1: 0.68, // Speed - Warm
  B2: 0.85, // Deal - Hot!
  B3: 0.31, // Signal - Warm
  B4: 0.19, // Proof - Cold

  // Operations row (C) - Mostly cold
  C1: 0.22, // Grid - Cold
  C2: 0.76, // Loop - Hot!
  C3: 0.45, // Flow - Warm
  C4: 0.12, // Safe - Cold
};

const testEvents: RecentEvent[] = [
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
  {
    cellId: 'B1',
    type: 'speed-optimization',
    timestamp: new Date(Date.now() - 30 * 60000), // 30 min ago
    description: 'Performance boost applied',
  },
];

console.log('🎯 Testing ASCII Grid Renderer\n');
console.log('═'.repeat(60));

// Test 1: ASCII Grid
console.log('\n📊 TEST 1: ASCII Grid Rendering\n');
const asciiGrid = renderGrid(testPressures);
console.log(asciiGrid);

// Test 2: Discord Embed
console.log('\n📊 TEST 2: Discord Embed Generation\n');
const embed = renderGridEmbed(testPressures, testEvents);
console.log('Embed data:');
console.log(JSON.stringify(embed, null, 2));

console.log('\n═'.repeat(60));
console.log('✅ All tests completed successfully!');
