#!/usr/bin/env tsx
/**
 * Manual test for event-bridge.ts integration
 *
 * Tests:
 * 1. Create GridEventBridge instance
 * 2. Emit task completion events
 * 3. Verify JSONL persistence
 * 4. Test batch operations
 */

import { gridEventBridge, GridEventBridge } from './event-bridge.js';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), 'data', 'test-event-bridge-manual');

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

function cleanup(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  console.log('🧹 Cleaned up test directory');
}

function setup(): GridEventBridge {
  cleanup();
  mkdirSync(TEST_DIR, { recursive: true });
  return new GridEventBridge(TEST_DIR);
}

console.log('\n🧪 Event Bridge Manual Test Suite\n');
console.log('='.repeat(60));

// Test 1: Basic task completion
console.log('\n📍 Test 1: Basic task completion event');
{
  const bridge = setup();
  const event = bridge.onTaskComplete(0, 'Test task for phase 0');

  assert(event !== null, 'Event should not be null');
  assert(event?.type === 'POINTER_CREATE', 'Event type should be POINTER_CREATE');
  assert(event?.cell === 'A2', 'Phase 0 should map to cell A2');
  assert(event?.phase === 0, 'Phase should be 0');
  assert(event?.task === 'Test task for phase 0', 'Task text should match');
  assert(event?.intersection === 'TASK:A2:Goal', 'Intersection should be TASK:A2:Goal');

  cleanup();
}

// Test 2: All phase mappings
console.log('\n📍 Test 2: All phase-to-cell mappings');
{
  const bridge = setup();
  const mappings = [
    { phase: 0, cell: 'A2', name: 'Goal' },
    { phase: 1, cell: 'B3', name: 'Signal' },
    { phase: 2, cell: 'A1', name: 'Law' },
    { phase: 3, cell: 'B1', name: 'Speed' },
    { phase: 4, cell: 'C1', name: 'Grid' },
    { phase: 6, cell: 'A3', name: 'Fund' },
    { phase: 7, cell: 'C3', name: 'Flow' },
    { phase: 8, cell: 'B2', name: 'Deal' },
    { phase: 9, cell: 'C2', name: 'Loop' },
  ];

  for (const { phase, cell, name } of mappings) {
    const event = bridge.onTaskComplete(phase, `Task ${phase}`);
    assert(event?.cell === cell, `Phase ${phase} should map to ${cell}`);
    assert(event?.intersection.includes(name), `Intersection should include ${name}`);
  }

  cleanup();
}

// Test 3: Invalid phase handling
console.log('\n📍 Test 3: Invalid phase handling');
{
  const bridge = setup();
  const event = bridge.onTaskComplete(99, 'Invalid phase task');
  assert(event === null, 'Invalid phase should return null');
  cleanup();
}

// Test 4: JSONL persistence
console.log('\n📍 Test 4: JSONL persistence');
{
  const bridge = setup();
  const eventsPath = bridge.getEventsPath();

  bridge.onTaskComplete(0, 'First task');
  bridge.onTaskComplete(1, 'Second task');
  bridge.onTaskComplete(2, 'Third task');

  assert(existsSync(eventsPath), 'Events file should exist');

  const content = readFileSync(eventsPath, 'utf-8');
  const lines = content.trim().split('\n');

  assert(lines.length === 3, 'Should have 3 event lines');

  const events = lines.map(line => JSON.parse(line));
  assert(events[0].task === 'First task', 'First event should match');
  assert(events[1].task === 'Second task', 'Second event should match');
  assert(events[2].task === 'Third task', 'Third event should match');

  cleanup();
}

// Test 5: Metadata handling
console.log('\n📍 Test 5: Metadata handling');
{
  const bridge = setup();
  const metadata = {
    userId: 'user-123',
    channelId: 'channel-456',
    priority: 'high',
    tags: ['urgent', 'production'],
  };

  const event = bridge.onTaskComplete(0, 'Task with metadata', metadata);
  assert(event?.metadata !== undefined, 'Event should have metadata');
  assert(JSON.stringify(event?.metadata) === JSON.stringify(metadata), 'Metadata should match');

  cleanup();
}

// Test 6: Batch emission
console.log('\n📍 Test 6: Batch emission');
{
  const bridge = setup();
  const events = [
    {
      timestamp: new Date().toISOString(),
      type: 'POINTER_CREATE' as const,
      cell: 'A1',
      phase: 2,
      task: 'Batch task 1',
      intersection: 'TASK:A1:Law',
    },
    {
      timestamp: new Date().toISOString(),
      type: 'POINTER_CREATE' as const,
      cell: 'B1',
      phase: 3,
      task: 'Batch task 2',
      intersection: 'TASK:B1:Speed',
    },
  ];

  bridge.emitBatch(events);

  const content = readFileSync(bridge.getEventsPath(), 'utf-8');
  const lines = content.trim().split('\n');

  assert(lines.length === 2, 'Should have 2 batch events');

  const parsed = lines.map(line => JSON.parse(line));
  assert(parsed[0].task === 'Batch task 1', 'First batch event should match');
  assert(parsed[1].task === 'Batch task 2', 'Second batch event should match');

  cleanup();
}

// Test 7: Custom events
console.log('\n📍 Test 7: Custom events');
{
  const bridge = setup();

  const event1 = bridge.createEvent('POINTER_CREATE', 'A2', 0, 'Custom pointer');
  assert(event1.type === 'POINTER_CREATE', 'Should create POINTER_CREATE event');
  assert(event1.intersection.includes('CUSTOM'), 'Should mark as CUSTOM');

  const event2 = bridge.createEvent('PRESSURE_UPDATE', 'B3', 1, 'Pressure spike');
  assert(event2.type === 'PRESSURE_UPDATE', 'Should create PRESSURE_UPDATE event');

  const event3 = bridge.createEvent('CELL_ACTIVATE', 'C1', 4, 'Cell activation');
  assert(event3.type === 'CELL_ACTIVATE', 'Should create CELL_ACTIVATE event');

  cleanup();
}

// Test 8: Singleton instance
console.log('\n📍 Test 8: Singleton instance');
{
  const event = gridEventBridge.onTaskComplete(0, 'Singleton test');
  assert(event !== null, 'Singleton should work');
  assert(event?.cell === 'A2', 'Singleton should use correct mapping');
}

// Test 9: Performance test
console.log('\n📍 Test 9: Performance test (100 events)');
{
  const bridge = setup();
  const startTime = Date.now();

  for (let i = 0; i < 100; i++) {
    const phase = [0, 1, 2, 3, 4, 6, 7, 8, 9][i % 9];
    bridge.onTaskComplete(phase, `Performance test task ${i}`);
  }

  const duration = Date.now() - startTime;
  console.log(`  ⏱️  Duration: ${duration}ms`);

  assert(duration < 2000, 'Should complete in under 2 seconds');

  const content = readFileSync(bridge.getEventsPath(), 'utf-8');
  const lines = content.trim().split('\n');
  assert(lines.length === 100, 'Should have 100 events');

  cleanup();
}

console.log('\n' + '='.repeat(60));
console.log('✅ All tests passed!\n');
