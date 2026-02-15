/**
 * src/discord/steering-loop.test.ts — Ask-and-Predict Protocol Tests
 *
 * Tests for the SteeringLoop class including:
 * - Sovereignty-based countdown timers (5s/30s/60s)
 * - Admin instant execution
 * - Trusted ask-and-predict flow
 * - General suggestion queue
 * - Admin blessing mechanism
 * - Redirect/abort logic
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SteeringLoop, type SteeringConfig, type ExecutionTier } from './steering-loop.js';
import type { Logger } from '../types.js';

// Mock logger
const mockLogger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Helper to create mock callbacks
function createMockCallbacks() {
  const executeCallback = vi.fn().mockResolvedValue(true);
  const postCallback = vi.fn().mockResolvedValue('msg-123');
  const editCallback = vi.fn().mockResolvedValue(undefined);
  return { executeCallback, postCallback, editCallback };
}

describe('SteeringLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Sovereignty-Based Countdown Timers', () => {
    it('should use 5s timeout for high sovereignty (>=0.8)', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
        useSovereigntyTimeouts: true,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();
      const sovereigntyGetter = vi.fn().mockReturnValue(0.85);

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
        sovereigntyGetter,
      );

      const entry = await loop.handleMessage(
        'trusted',
        'builder',
        'channel-123',
        'Build JWT rotation module',
        { id: 'user-1', username: 'alice' },
        ['security', 'auth'],
      );

      expect(entry.timeoutMs).toBe(5000);
      expect(postCallback).toHaveBeenCalledWith(
        'channel-123',
        expect.stringContaining('🟢 High trust — 5s'),
      );

      // Fast-forward 5s and check execution
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();

      expect(executeCallback).toHaveBeenCalledWith('builder', 'Build JWT rotation module');
    });

    it('should use 30s timeout for moderate sovereignty (>=0.6, <0.8)', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
        useSovereigntyTimeouts: true,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();
      const sovereigntyGetter = vi.fn().mockReturnValue(0.7);

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
        sovereigntyGetter,
      );

      const entry = await loop.handleMessage(
        'trusted',
        'builder',
        'channel-123',
        'Add logging to auth module',
        { id: 'user-2', username: 'bob' },
      );

      expect(entry.timeoutMs).toBe(30000);
      expect(postCallback).toHaveBeenCalledWith(
        'channel-123',
        expect.stringContaining('🟡 Moderate — 30s'),
      );

      // Fast-forward 30s and check execution
      vi.advanceTimersByTime(30000);
      await vi.runAllTimersAsync();

      expect(executeCallback).toHaveBeenCalledWith('builder', 'Add logging to auth module');
    });

    it('should use 60s timeout for low sovereignty (<0.6)', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
        useSovereigntyTimeouts: true,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();
      const sovereigntyGetter = vi.fn().mockReturnValue(0.4);

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
        sovereigntyGetter,
      );

      const entry = await loop.handleMessage(
        'trusted',
        'builder',
        'channel-123',
        'Refactor core module',
        { id: 'user-3', username: 'charlie' },
      );

      expect(entry.timeoutMs).toBe(60000);
      expect(postCallback).toHaveBeenCalledWith(
        'channel-123',
        expect.stringContaining('🔴 Low trust — 60s'),
      );

      // Fast-forward 60s and check execution
      vi.advanceTimersByTime(60000);
      await vi.runAllTimersAsync();

      expect(executeCallback).toHaveBeenCalledWith('builder', 'Refactor core module');
    });

    it('should use config timeout when useSovereigntyTimeouts is false', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 15000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
        useSovereigntyTimeouts: false,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();
      const sovereigntyGetter = vi.fn().mockReturnValue(0.9);

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
        sovereigntyGetter,
      );

      const entry = await loop.handleMessage(
        'trusted',
        'builder',
        'channel-123',
        'Some task',
        { id: 'user-4', username: 'dave' },
      );

      expect(entry.timeoutMs).toBe(15000);
      expect(sovereigntyGetter).not.toHaveBeenCalled();
    });
  });

  describe('Admin Instant Execution', () => {
    it('should execute admin messages immediately without countdown', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
        useSovereigntyTimeouts: true,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      const entry = await loop.handleMessage(
        'admin',
        'operator',
        'channel-123',
        'Deploy to production',
        { id: 'admin-1', username: 'operator' },
      );

      expect(entry.status).toBe('completed');
      expect(executeCallback).toHaveBeenCalledWith('operator', 'Deploy to production');
      expect(postCallback).not.toHaveBeenCalled(); // No prediction message
    });

    it('should mark admin execution as aborted on failure', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
      };
      const { postCallback, editCallback } = createMockCallbacks();
      const executeCallback = vi.fn().mockResolvedValue(false);

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      const entry = await loop.handleMessage(
        'admin',
        'operator',
        'channel-123',
        'Deploy to production',
        { id: 'admin-1', username: 'operator' },
      );

      expect(entry.status).toBe('aborted');
      expect(entry.abortReason).toBe('Execution failed');
    });
  });

  describe('Trusted Ask-and-Predict Flow', () => {
    it('should post prediction message and auto-execute after countdown', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
        useSovereigntyTimeouts: false,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      const entry = await loop.handleMessage(
        'trusted',
        'builder',
        'channel-123',
        'Write unit tests for auth module',
        { id: 'user-1', username: 'alice' },
        ['testing', 'quality'],
      );

      expect(entry.status).toBe('pending');
      expect(postCallback).toHaveBeenCalledWith(
        'channel-123',
        expect.stringContaining('🔮 **PREDICTION**'),
      );
      expect(postCallback).toHaveBeenCalledWith(
        'channel-123',
        expect.stringContaining('testing, quality'),
      );

      // Fast-forward past countdown
      vi.advanceTimersByTime(30000);
      await vi.runAllTimersAsync();

      expect(editCallback).toHaveBeenCalledWith(
        'channel-123',
        'msg-123',
        expect.stringContaining('⚡ **EXECUTING**'),
      );
      expect(executeCallback).toHaveBeenCalledWith('builder', 'Write unit tests for auth module');
    });

    it('should not execute if aborted before countdown completes', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      await loop.handleMessage(
        'trusted',
        'builder',
        'channel-123',
        'Some task',
        { id: 'user-1', username: 'alice' },
      );

      // Abort all before countdown
      vi.advanceTimersByTime(10000);
      loop.abortAll();

      // Complete countdown
      vi.advanceTimersByTime(20000);
      await vi.runAllTimersAsync();

      expect(executeCallback).not.toHaveBeenCalled();
    });
  });

  describe('General Suggestion Queue', () => {
    it('should post suggestion without auto-execution', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      const entry = await loop.handleMessage(
        'general',
        'builder',
        'channel-123',
        'Add dark mode support',
        { id: 'user-1', username: 'alice' },
      );

      expect(entry.status).toBe('pending');
      expect(postCallback).toHaveBeenCalledWith(
        'channel-123',
        expect.stringContaining('💡 **Suggestion from @alice:**'),
      );
      expect(postCallback).toHaveBeenCalledWith(
        'channel-123',
        expect.stringContaining('_Awaiting Admin reaction to execute._'),
      );

      // Fast-forward — should NOT auto-execute
      vi.advanceTimersByTime(60000);
      await vi.runAllTimersAsync();

      expect(executeCallback).not.toHaveBeenCalled();
    });
  });

  describe('Admin Blessing Mechanism', () => {
    it('should execute general suggestion when admin blesses it', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      await loop.handleMessage(
        'general',
        'builder',
        'channel-123',
        'Add dark mode support',
        { id: 'user-1', username: 'alice' },
      );

      const success = await loop.adminBless('msg-123', 'operator');

      expect(success).toBe(true);
      expect(editCallback).toHaveBeenCalledWith(
        'channel-123',
        'msg-123',
        expect.stringContaining('👍 **ADMIN BLESSED** by @operator'),
      );
      expect(executeCallback).toHaveBeenCalledWith('builder', 'Add dark mode support');
    });

    it('should return false if blessing non-existent message', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      const success = await loop.adminBless('msg-999', 'operator');

      expect(success).toBe(false);
      expect(executeCallback).not.toHaveBeenCalled();
    });
  });

  describe('Redirect Logic', () => {
    it('should abort current prediction and start new one on redirect', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      await loop.handleMessage(
        'trusted',
        'builder',
        'channel-123',
        'Original task',
        { id: 'user-1', username: 'alice' },
      );

      // Advance halfway through countdown
      vi.advanceTimersByTime(15000);

      const redirected = await loop.redirect('builder', 'New redirected task', 'voice-memo');

      expect(redirected).not.toBeNull();
      expect(redirected?.prompt).toBe('New redirected task');
      expect(editCallback).toHaveBeenCalledWith(
        'channel-123',
        'msg-123',
        expect.stringContaining('🔄 **REDIRECTED**'),
      );

      // Complete new countdown
      vi.advanceTimersByTime(30000);
      await vi.runAllTimersAsync();

      expect(executeCallback).toHaveBeenCalledWith('builder', 'New redirected task');
      expect(executeCallback).not.toHaveBeenCalledWith('builder', 'Original task');
    });

    it('should return null if no pending prediction to redirect', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      const redirected = await loop.redirect('builder', 'New task', 'voice-memo');

      expect(redirected).toBeNull();
    });
  });

  describe('Emergency Abort', () => {
    it('should abort all pending predictions', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      await loop.handleMessage('trusted', 'builder', 'channel-1', 'Task 1', { id: '1', username: 'a' });
      await loop.handleMessage('trusted', 'operator', 'channel-2', 'Task 2', { id: '2', username: 'b' });
      await loop.handleMessage('general', 'builder', 'channel-3', 'Task 3', { id: '3', username: 'c' });

      const aborted = loop.abortAll();

      expect(aborted).toBe(3);

      // Advance timers — nothing should execute
      vi.advanceTimersByTime(60000);
      await vi.runAllTimersAsync();

      expect(executeCallback).not.toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should return active predictions', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      await loop.handleMessage('trusted', 'builder', 'channel-1', 'Task 1', { id: '1', username: 'a' });
      await loop.handleMessage('trusted', 'operator', 'channel-2', 'Task 2', { id: '2', username: 'b' });

      const active = loop.getActivePredictions();
      expect(active).toHaveLength(2);
    });

    it('should check if room has pending prediction', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 5,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      await loop.handleMessage('trusted', 'builder', 'channel-1', 'Task 1', { id: '1', username: 'a' });

      expect(loop.hasPendingPrediction('builder')).toBe(true);
      expect(loop.hasPendingPrediction('operator')).toBe(false);
    });
  });

  describe('Concurrent Predictions', () => {
    it('should warn when max concurrent predictions reached', async () => {
      const config: SteeringConfig = {
        askPredictTimeoutMs: 30000,
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 2,
      };
      const { executeCallback, postCallback, editCallback } = createMockCallbacks();

      const loop = new SteeringLoop(
        mockLogger,
        config,
        executeCallback,
        postCallback,
        editCallback,
      );

      await loop.handleMessage('trusted', 'builder', 'channel-1', 'Task 1', { id: '1', username: 'a' });
      await loop.handleMessage('trusted', 'operator', 'channel-2', 'Task 2', { id: '2', username: 'b' });
      await loop.handleMessage('trusted', 'builder', 'channel-3', 'Task 3', { id: '3', username: 'c' });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Max concurrent predictions (2) reached'),
      );
    });
  });
});
