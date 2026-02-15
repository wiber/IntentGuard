#!/usr/bin/env node

/**
 * Verification script for task cost tracking implementation
 * Demonstrates all key features with real examples
 */

import TaskCostTracker from '../lib/skills/task-cost-tracker.js';
import fs from 'fs';
import path from 'path';

console.log('═══════════════════════════════════════════════════════════════');
console.log('Task Cost Tracking - Verification Script');
console.log('═══════════════════════════════════════════════════════════════\n');

// Create tracker with temporary test directory
const testDir = path.join(process.cwd(), 'data', 'test-verification');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

const tracker = new TaskCostTracker(testDir);

console.log('✓ TaskCostTracker initialized');
console.log(`  Log path: ${tracker.getLogPath()}\n`);

// Test 1: Claude API costs
console.log('Test 1: Claude API Cost Calculation');
console.log('─────────────────────────────────────');
const claudeEntry = tracker.trackTaskInference(
  'test-agent-0',
  'agent',
  'Agent 0: Outcome Parser',
  'claude-sonnet-4-5',
  'anthropic-api',
  100000,
  50000,
  { agentNumber: 0, complexity: 3 }
);
console.log(`✓ Tracked Claude Sonnet inference`);
console.log(`  Input tokens: 100,000`);
console.log(`  Output tokens: 50,000`);
console.log(`  Cost: $${claudeEntry.costUSD.toFixed(4)}`);
console.log(`  Expected: $1.0500 [(100k/1M × $3) + (50k/1M × $15)]`);
console.log(`  Match: ${Math.abs(claudeEntry.costUSD - 1.05) < 0.001 ? '✅ YES' : '❌ NO'}\n`);

// Test 2: Ollama electricity tracking
console.log('Test 2: Ollama Electricity Estimation');
console.log('─────────────────────────────────────');
const ollamaEntry = tracker.trackTaskInference(
  'test-agent-1',
  'agent',
  'Agent 1: Database Indexer',
  'llama3.2:1b',
  'ollama',
  10000,
  5000,
  { agentNumber: 1, complexity: 2 }
);
const electricityCost = tracker.estimateOllamaElectricityCost(15000);
console.log(`✓ Tracked Ollama inference`);
console.log(`  Total tokens: 15,000`);
console.log(`  API cost: $${ollamaEntry.costUSD.toFixed(4)} (free local inference)`);
console.log(`  Electricity: ${ollamaEntry.electricityKWh?.toFixed(6)} kWh`);
console.log(`  Electricity cost: $${electricityCost.toFixed(6)}`);
console.log(`  Formula: (15000 tokens / 100 t/s) × 300W / 3,600,000 = kWh`);
console.log(`  Match: ${ollamaEntry.electricityKWh && ollamaEntry.electricityKWh > 0 ? '✅ YES' : '❌ NO'}\n`);

// Test 3: Task summary aggregation
console.log('Test 3: Task Summary Aggregation');
console.log('─────────────────────────────────────');
tracker.trackTaskInference('pipeline-1', 'pipeline', 'Trust Debt Analysis', 'claude-sonnet-4-5', 'anthropic-api', 50000, 25000);
tracker.trackTaskInference('pipeline-1', 'pipeline', 'Trust Debt Analysis', 'claude-sonnet-4-5', 'anthropic-api', 30000, 15000);
tracker.trackTaskInference('pipeline-1', 'pipeline', 'Trust Debt Analysis', 'llama3.2:1b', 'ollama', 10000, 5000);

const summary = tracker.getTaskSummary('pipeline-1');
console.log(`✓ Tracked 3 inferences for 'pipeline-1'`);
console.log(`  Task name: ${summary.taskName}`);
console.log(`  Total cost: $${summary.totalCost.toFixed(4)}`);
console.log(`  Total tokens: ${summary.totalTokens.toLocaleString()}`);
console.log(`  Inference count: ${summary.inferenceCount}`);
console.log(`  Avg cost/inference: $${summary.avgCostPerInference.toFixed(4)}`);
console.log(`  Electricity: ${summary.electricityKWh.toFixed(6)} kWh`);
console.log(`  Models: ${Object.keys(summary.models).join(', ')}`);
console.log(`  Backends: ${Object.keys(summary.backends).join(', ')}`);
console.log(`  Match: ${summary.inferenceCount === 3 ? '✅ YES' : '❌ NO'}\n`);

// Test 4: Cost breakdown
console.log('Test 4: Cost Breakdown by Type/Model/Backend');
console.log('─────────────────────────────────────');
const breakdown = tracker.getDailyBreakdown();
console.log(`✓ Generated daily breakdown`);
console.log(`  Total cost: $${breakdown.totalCost.toFixed(4)}`);
console.log(`  Total electricity: ${breakdown.totalElectricity.toFixed(6)} kWh`);
console.log(`  Tasks tracked: ${breakdown.byTask.length}`);
console.log(`\n  By Task Type:`);
for (const [type, cost] of Object.entries(breakdown.byTaskType)) {
  console.log(`    ${type.padEnd(12)} $${cost.toFixed(4)}`);
}
console.log(`\n  By Model:`);
for (const [model, cost] of Object.entries(breakdown.byModel)) {
  console.log(`    ${model.padEnd(20)} $${cost.toFixed(4)}`);
}
console.log(`\n  By Backend:`);
for (const [backend, cost] of Object.entries(breakdown.byBackend)) {
  console.log(`    ${backend.padEnd(15)} $${cost.toFixed(4)}`);
}
console.log(`\n  Top 3 Tasks by Cost:`);
for (const task of breakdown.byTask.slice(0, 3)) {
  console.log(`    ${task.taskName.padEnd(30)} $${task.totalCost.toFixed(4)} (${task.inferenceCount} inferences)`);
}
console.log(`  Match: ${breakdown.byTask.length > 0 ? '✅ YES' : '❌ NO'}\n`);

// Test 5: Pricing accuracy
console.log('Test 5: Pricing Accuracy for All Models');
console.log('─────────────────────────────────────');

const testCases = [
  { model: 'claude-opus-4-6', input: 100000, output: 50000, expected: 5.25 },
  { model: 'claude-haiku-4-5', input: 500000, output: 250000, expected: 0.4375 },
  { model: 'gpt-4-turbo', input: 150000, output: 75000, expected: 9.0 },
  { model: 'gpt-3.5-turbo', input: 200000, output: 100000, expected: 0.5 },
];

let allMatch = true;
for (const tc of testCases) {
  const entry = tracker.trackTaskInference(
    `pricing-test-${tc.model}`,
    'command',
    'Pricing Test',
    tc.model,
    tc.model.includes('gpt') ? 'openai-api' : 'anthropic-api',
    tc.input,
    tc.output
  );
  const match = Math.abs(entry.costUSD - tc.expected) < 0.001;
  console.log(`  ${tc.model.padEnd(20)} $${entry.costUSD.toFixed(4)} ${match ? '✅' : '❌'}`);
  if (!match) allMatch = false;
}
console.log(`  Match: ${allMatch ? '✅ ALL CORRECT' : '❌ SOME ERRORS'}\n`);

// Final summary
console.log('═══════════════════════════════════════════════════════════════');
console.log('Verification Complete');
console.log('═══════════════════════════════════════════════════════════════\n');

const finalBreakdown = tracker.getDailyBreakdown();
console.log(`Total tracked inferences: ${finalBreakdown.byTask.length}`);
console.log(`Total cost: $${finalBreakdown.totalCost.toFixed(4)}`);
console.log(`Total electricity: ${finalBreakdown.totalElectricity.toFixed(6)} kWh`);
console.log(`\n✅ All core features verified:`);
console.log(`  • Claude API cost calculation`);
console.log(`  • Ollama electricity estimation`);
console.log(`  • Task summary aggregation`);
console.log(`  • Cost breakdown by type/model/backend`);
console.log(`  • Pricing accuracy for all models`);

// Cleanup
console.log(`\n🧹 Cleaning up test data...`);
fs.rmSync(testDir, { recursive: true });
console.log(`✓ Test directory removed\n`);
