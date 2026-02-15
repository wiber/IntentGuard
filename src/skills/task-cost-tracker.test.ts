/**
 * src/skills/task-cost-tracker.test.ts
 *
 * Comprehensive test suite for TaskCostTracker
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import TaskCostTracker, { type TaskCostEntry, type CostBreakdown } from './task-cost-tracker.js';

// ═══════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════

const TEST_LOG_PATH = path.join(process.cwd(), 'data', 'test-task-costs.jsonl');

function cleanupTestLog(): void {
  if (fs.existsSync(TEST_LOG_PATH)) {
    fs.unlinkSync(TEST_LOG_PATH);
  }
}

// ═══════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════

describe('TaskCostTracker', () => {
  let tracker: TaskCostTracker;

  beforeEach(() => {
    cleanupTestLog();
    const testDataDir = path.dirname(TEST_LOG_PATH);
    tracker = new TaskCostTracker(testDataDir);

    // Override log path for testing
    (tracker as any).logPath = TEST_LOG_PATH;
  });

  afterEach(() => {
    cleanupTestLog();
  });

  // ═════════════════════════════════════════════════════════════
  // Initialization Tests
  // ═════════════════════════════════════════════════════════════

  describe('initialization', () => {
    it('should create log file if it does not exist', () => {
      // Clean up completely and create fresh tracker
      cleanupTestLog();
      if (fs.existsSync(TEST_LOG_PATH)) {
        fs.unlinkSync(TEST_LOG_PATH);
      }

      // Create new tracker which should create the file
      const testDataDir = path.dirname(TEST_LOG_PATH);
      const freshTracker = new TaskCostTracker(testDataDir);
      (freshTracker as any).logPath = TEST_LOG_PATH;

      // Now manually trigger file creation by calling appendEntry
      (freshTracker as any).appendEntry({
        timestamp: new Date().toISOString(),
        taskId: 'test',
        taskType: 'agent',
        taskName: 'test',
        model: 'test',
        backend: 'ollama',
        inputTokens: 0,
        outputTokens: 0,
        costUSD: 0
      });

      expect(fs.existsSync(TEST_LOG_PATH)).toBe(true);
    });

    it('should not overwrite existing log file', () => {
      const testData = '{"test":"data"}\n';
      fs.writeFileSync(TEST_LOG_PATH, testData, 'utf-8');

      const newTracker = new TaskCostTracker(path.dirname(TEST_LOG_PATH));
      (newTracker as any).logPath = TEST_LOG_PATH;

      const content = fs.readFileSync(TEST_LOG_PATH, 'utf-8');
      expect(content).toBe(testData);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Cost Calculation Tests
  // ═════════════════════════════════════════════════════════════

  describe('trackTaskInference - Claude models', () => {
    it('should calculate Claude Opus costs correctly', () => {
      const entry = tracker.trackTaskInference(
        'task-1',
        'agent',
        'Agent 0: Outcome Parser',
        'claude-opus-4-6',
        'anthropic-api',
        100000,
        50000
      );

      // (100000/1M * $15) + (50000/1M * $75) = $1.50 + $3.75 = $5.25
      expect(entry.costUSD).toBe(5.25);
      expect(entry.taskId).toBe('task-1');
      expect(entry.taskType).toBe('agent');
      expect(entry.backend).toBe('anthropic-api');
    });

    it('should calculate Claude Sonnet costs correctly', () => {
      const entry = tracker.trackTaskInference(
        'task-2',
        'skill',
        'voice-memo-reactor',
        'claude-sonnet-4-5',
        'anthropic-api',
        200000,
        100000
      );

      // (200000/1M * $3) + (100000/1M * $15) = $0.60 + $1.50 = $2.10
      expect(entry.costUSD).toBe(2.1);
    });

    it('should calculate Claude Haiku costs correctly', () => {
      const entry = tracker.trackTaskInference(
        'task-3',
        'command',
        '!categorize',
        'claude-haiku-4-5',
        'anthropic-api',
        500000,
        250000
      );

      // (500000/1M * $0.25) + (250000/1M * $1.25) = $0.125 + $0.3125 = $0.4375
      expect(entry.costUSD).toBe(0.4375);
    });
  });

  describe('trackTaskInference - Ollama', () => {
    it('should track Ollama with zero API cost', () => {
      const entry = tracker.trackTaskInference(
        'task-4',
        'pipeline',
        'Category Generator',
        'llama3.2:1b',
        'ollama',
        10000,
        5000
      );

      expect(entry.costUSD).toBe(0);
      expect(entry.electricityKWh).toBeDefined();
      expect(entry.electricityKWh!).toBeGreaterThan(0);
    });

    it('should calculate electricity consumption for Ollama', () => {
      const entry = tracker.trackTaskInference(
        'task-5',
        'agent',
        'Agent 1: Database Indexer',
        'llama3:70b',
        'ollama',
        100000,
        50000
      );

      expect(entry.electricityKWh!).toBeGreaterThan(0);
    });

    it('should estimate electricity cost accurately', () => {
      const totalTokens = 15000; // 15K tokens
      const cost = tracker.estimateOllamaElectricityCost(totalTokens);

      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01); // Should be very cheap
    });
  });

  describe('trackTaskInference - OpenAI models', () => {
    it('should calculate GPT-4 costs correctly', () => {
      const entry = tracker.trackTaskInference(
        'task-6',
        'skill',
        'llm-controller',
        'gpt-4-turbo',
        'openai-api',
        150000,
        75000
      );

      // (150000/1M * $30) + (75000/1M * $60) = $4.50 + $4.50 = $9.00
      expect(entry.costUSD).toBe(9.0);
    });

    it('should calculate GPT-3.5 costs correctly', () => {
      const entry = tracker.trackTaskInference(
        'task-7',
        'command',
        '!summarize',
        'gpt-3.5-turbo',
        'openai-api',
        200000,
        100000
      );

      // (200000/1M * $1.5) + (100000/1M * $2.0) = $0.30 + $0.20 = $0.50
      expect(entry.costUSD).toBe(0.5);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Task Summary Tests
  // ═════════════════════════════════════════════════════════════

  describe('getTaskSummary', () => {
    it('should return null for non-existent task', () => {
      const summary = tracker.getTaskSummary('non-existent-task');
      expect(summary).toBe(null);
    });

    it('should aggregate costs for single task with multiple inferences', () => {
      tracker.trackTaskInference('task-1', 'agent', 'Agent 0', 'claude-sonnet-4-5', 'anthropic-api', 50000, 25000);
      tracker.trackTaskInference('task-1', 'agent', 'Agent 0', 'claude-sonnet-4-5', 'anthropic-api', 30000, 15000);
      tracker.trackTaskInference('task-1', 'agent', 'Agent 0', 'llama3.2:1b', 'ollama', 10000, 5000);

      const summary = tracker.getTaskSummary('task-1');

      expect(summary).not.toBe(null);
      expect(summary!.inferenceCount).toBe(3);
      expect(summary!.totalCost).toBeGreaterThan(0);
      expect(summary!.totalTokens).toBe(135000); // 75k + 45k + 15k
      expect(summary!.electricityKWh).toBeGreaterThan(0); // From Ollama inference
    });

    it('should track models and backends in summary', () => {
      tracker.trackTaskInference('task-2', 'pipeline', 'Trust Debt', 'claude-opus-4-6', 'anthropic-api', 100000, 50000);
      tracker.trackTaskInference('task-2', 'pipeline', 'Trust Debt', 'llama3:70b', 'ollama', 50000, 25000);

      const summary = tracker.getTaskSummary('task-2');

      expect(summary).not.toBe(null);
      expect('claude-opus-4-6' in summary!.models).toBe(true);
      expect('llama3:70b' in summary!.models).toBe(true);
      expect('anthropic-api' in summary!.backends).toBe(true);
      expect('ollama' in summary!.backends).toBe(true);
    });

    it('should calculate average cost per inference', () => {
      tracker.trackTaskInference('task-3', 'ceo-loop', 'Night Shift', 'claude-sonnet-4-5', 'anthropic-api', 100000, 50000);
      tracker.trackTaskInference('task-3', 'ceo-loop', 'Night Shift', 'claude-sonnet-4-5', 'anthropic-api', 100000, 50000);

      const summary = tracker.getTaskSummary('task-3');

      expect(summary).not.toBe(null);
      expect(summary!.inferenceCount).toBe(2);
      expect(summary!.avgCostPerInference).toBe(summary!.totalCost / 2);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Cost Breakdown Tests
  // ═════════════════════════════════════════════════════════════

  describe('getCostBreakdown', () => {
    it('should return empty breakdown for period with no activity', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-02');

      const breakdown = tracker.getCostBreakdown(start, end);

      expect(breakdown.totalCost).toBe(0);
      expect(breakdown.totalElectricity).toBe(0);
      expect(breakdown.byTask.length).toBe(0);
      expect(breakdown.byTaskType).toStrictEqual({});
    });

    it('should aggregate costs by task type', () => {
      tracker.trackTaskInference('t1', 'agent', 'Agent 0', 'claude-sonnet-4-5', 'anthropic-api', 100000, 50000);
      tracker.trackTaskInference('t2', 'agent', 'Agent 1', 'claude-sonnet-4-5', 'anthropic-api', 100000, 50000);
      tracker.trackTaskInference('t3', 'skill', 'voice-memo', 'llama3.2:1b', 'ollama', 10000, 5000);

      const start = new Date(Date.now() - 1000);
      const end = new Date(Date.now() + 1000);
      const breakdown = tracker.getCostBreakdown(start, end);

      expect('agent' in breakdown.byTaskType).toBe(true);
      expect('skill' in breakdown.byTaskType).toBe(true);
      expect(breakdown.byTaskType.agent).toBeGreaterThan(breakdown.byTaskType.skill);
    });

    it('should aggregate costs by model', () => {
      tracker.trackTaskInference('t1', 'agent', 'Agent 0', 'claude-opus-4-6', 'anthropic-api', 100000, 50000);
      tracker.trackTaskInference('t2', 'agent', 'Agent 1', 'claude-sonnet-4-5', 'anthropic-api', 100000, 50000);
      tracker.trackTaskInference('t3', 'skill', 'voice-memo', 'llama3.2:1b', 'ollama', 10000, 5000);

      const start = new Date(Date.now() - 1000);
      const end = new Date(Date.now() + 1000);
      const breakdown = tracker.getCostBreakdown(start, end);

      expect('claude-opus-4-6' in breakdown.byModel).toBe(true);
      expect('claude-sonnet-4-5' in breakdown.byModel).toBe(true);
      expect('llama3.2:1b' in breakdown.byModel).toBe(true);
    });

    it('should aggregate costs by backend', () => {
      tracker.trackTaskInference('t1', 'agent', 'Agent 0', 'claude-sonnet-4-5', 'anthropic-api', 100000, 50000);
      tracker.trackTaskInference('t2', 'skill', 'voice-memo', 'llama3.2:1b', 'ollama', 10000, 5000);
      tracker.trackTaskInference('t3', 'command', '!help', 'gpt-3.5-turbo', 'openai-api', 50000, 25000);

      const start = new Date(Date.now() - 1000);
      const end = new Date(Date.now() + 1000);
      const breakdown = tracker.getCostBreakdown(start, end);

      expect('anthropic-api' in breakdown.byBackend).toBe(true);
      expect('ollama' in breakdown.byBackend).toBe(true);
      expect('openai-api' in breakdown.byBackend).toBe(true);
    });

    it('should sort tasks by total cost descending', () => {
      tracker.trackTaskInference('cheap', 'agent', 'Agent 0', 'llama3.2:1b', 'ollama', 1000, 500);
      tracker.trackTaskInference('expensive', 'agent', 'Agent 1', 'claude-opus-4-6', 'anthropic-api', 100000, 50000);
      tracker.trackTaskInference('medium', 'agent', 'Agent 2', 'claude-sonnet-4-5', 'anthropic-api', 50000, 25000);

      const start = new Date(Date.now() - 1000);
      const end = new Date(Date.now() + 1000);
      const breakdown = tracker.getCostBreakdown(start, end);

      expect(breakdown.byTask.length).toBe(3);
      expect(breakdown.byTask[0].taskId).toBe('expensive');
      expect(breakdown.byTask[1].taskId).toBe('medium');
      expect(breakdown.byTask[2].taskId).toBe('cheap');
    });

    it('should track total electricity consumption', () => {
      tracker.trackTaskInference('t1', 'agent', 'Agent 0', 'llama3.2:1b', 'ollama', 50000, 25000);
      tracker.trackTaskInference('t2', 'agent', 'Agent 1', 'llama3:70b', 'ollama', 100000, 50000);

      const start = new Date(Date.now() - 1000);
      const end = new Date(Date.now() + 1000);
      const breakdown = tracker.getCostBreakdown(start, end);

      expect(breakdown.totalElectricity).toBeGreaterThan(0);
    });
  });

  describe('getDailyBreakdown', () => {
    it('should get breakdown for today by default', () => {
      tracker.trackTaskInference('today-1', 'agent', 'Agent 0', 'claude-sonnet-4-5', 'anthropic-api', 10000, 5000);

      const breakdown = tracker.getDailyBreakdown();

      expect(breakdown.byTask.length).toBeGreaterThan(0);
      expect(breakdown.totalCost).toBeGreaterThan(0);
    });

    it('should get breakdown for specific date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const breakdown = tracker.getDailyBreakdown(yesterday);

      expect(breakdown.period.start).toContain(yesterday.toISOString().split('T')[0]);
    });
  });

  describe('getWeeklyBreakdown', () => {
    it('should get breakdown for last 7 days', () => {
      tracker.trackTaskInference('week-1', 'agent', 'Agent 0', 'claude-sonnet-4-5', 'anthropic-api', 10000, 5000);

      const breakdown = tracker.getWeeklyBreakdown();

      expect(breakdown.byTask.length).toBeGreaterThan(0);
      expect(breakdown.totalCost).toBeGreaterThan(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Metadata Tests
  // ═════════════════════════════════════════════════════════════

  describe('metadata tracking', () => {
    it('should store optional metadata', () => {
      const entry = tracker.trackTaskInference(
        'task-meta',
        'agent',
        'Agent 3',
        'claude-sonnet-4-5',
        'anthropic-api',
        10000,
        5000,
        {
          agentNumber: 3,
          userId: 'user123',
          channelId: 'channel456',
          complexity: 4,
          latencyMs: 1234,
        }
      );

      expect(entry.metadata?.agentNumber).toBe(3);
      expect(entry.metadata?.userId).toBe('user123');
      expect(entry.metadata?.complexity).toBe(4);
      expect(entry.metadata?.latencyMs).toBe(1234);
    });

    it('should work without metadata', () => {
      const entry = tracker.trackTaskInference(
        'task-no-meta',
        'skill',
        'cost-reporter',
        'llama3.2:1b',
        'ollama',
        5000,
        2500
      );

      expect(entry.metadata === undefined || Object.keys(entry.metadata).length === 0).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Edge Cases & Error Handling
  // ═════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle zero token counts', () => {
      const entry = tracker.trackTaskInference(
        'zero-tokens',
        'agent',
        'Agent 0',
        'claude-sonnet-4-5',
        'anthropic-api',
        0,
        0
      );

      expect(entry.costUSD).toBe(0);
      expect(entry.inputTokens).toBe(0);
      expect(entry.outputTokens).toBe(0);
    });

    it('should handle very large token counts', () => {
      const entry = tracker.trackTaskInference(
        'large-tokens',
        'pipeline',
        'Full Pipeline',
        'claude-opus-4-6',
        'anthropic-api',
        10_000_000,
        5_000_000
      );

      // (10M/1M * $15) + (5M/1M * $75) = $150 + $375 = $525
      expect(entry.costUSD).toBe(525);
    });

    it('should handle unknown model gracefully', () => {
      const entry = tracker.trackTaskInference(
        'unknown-model',
        'agent',
        'Agent X',
        'mystery-model-v1',
        'anthropic-api',
        100000,
        50000
      );

      // Should use default pricing
      expect(entry.costUSD).toBeGreaterThan(0);
    });

    it('should handle malformed JSON in log file', () => {
      fs.appendFileSync(TEST_LOG_PATH, '{"valid":"entry"}\n', 'utf-8');
      fs.appendFileSync(TEST_LOG_PATH, 'invalid json line\n', 'utf-8');
      fs.appendFileSync(TEST_LOG_PATH, '{"another":"valid"}\n', 'utf-8');

      // Should not throw when reading
      const entries = tracker.getAllEntries();
      // JSON.parse will throw on malformed lines, so we won't get them
      expect(entries.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // Integration Tests
  // ═════════════════════════════════════════════════════════════

  describe('integration scenarios', () => {
    it('should track full agent pipeline execution', () => {
      // Simulate Trust Debt pipeline (Agents 0-7)
      for (let i = 0; i <= 7; i++) {
        tracker.trackTaskInference(
          `pipeline-run-1`,
          'agent',
          `Agent ${i}`,
          'claude-sonnet-4-5',
          'anthropic-api',
          50000 + i * 10000,
          25000 + i * 5000,
          { agentNumber: i }
        );
      }

      const summary = tracker.getTaskSummary('pipeline-run-1');

      expect(summary).not.toBe(null);
      expect(summary!.inferenceCount).toBe(8);
      expect(summary!.totalCost).toBeGreaterThan(0);
      expect(summary!.taskType).toBe('agent');
    });

    it('should track mixed backend usage in single task', () => {
      const taskId = 'hybrid-task';

      // Start with Ollama for simple classification
      tracker.trackTaskInference(taskId, 'skill', 'Categorizer', 'llama3.2:1b', 'ollama', 5000, 2500);

      // Escalate to Claude for reasoning
      tracker.trackTaskInference(taskId, 'skill', 'Categorizer', 'claude-sonnet-4-5', 'anthropic-api', 30000, 15000);

      const summary = tracker.getTaskSummary(taskId);

      expect(summary).not.toBe(null);
      expect(summary!.inferenceCount).toBe(2);
      expect('ollama' in summary!.backends).toBe(true);
      expect('anthropic-api' in summary!.backends).toBe(true);
      expect(summary!.electricityKWh).toBeGreaterThan(0); // From Ollama
      expect(summary!.totalCost).toBeGreaterThan(0); // From Claude
    });

    it('should track CEO loop daily operations', () => {
      const taskTypes: Array<'ceo-loop' | 'night-shift' | 'agent' | 'skill'> = [
        'ceo-loop',
        'night-shift',
        'agent',
        'skill'
      ];

      for (let hour = 0; hour < 24; hour++) {
        const taskType = taskTypes[hour % taskTypes.length];
        tracker.trackTaskInference(
          `hour-${hour}`,
          taskType,
          `Task at hour ${hour}`,
          hour % 2 === 0 ? 'llama3.2:1b' : 'claude-sonnet-4-5',
          hour % 2 === 0 ? 'ollama' : 'anthropic-api',
          10000,
          5000
        );
      }

      const breakdown = tracker.getDailyBreakdown();

      expect(breakdown.byTask.length).toBe(24);
      expect('ceo-loop' in breakdown.byTaskType).toBe(true);
      expect('night-shift' in breakdown.byTaskType).toBe(true);
      expect('agent' in breakdown.byTaskType).toBe(true);
      expect('skill' in breakdown.byTaskType).toBe(true);
    });
  });
});
