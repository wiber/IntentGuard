/**
 * src/discord/output-poller.test.ts — Tests for OutputPoller background polling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OutputPoller } from './output-poller.js';
import type { Logger, OrchestratorTask, OrchestratorConfig, DiscordHelper } from '../types.js';
import type { TaskStore } from './task-store.js';
import type { OutputCapture } from './output-capture.js';
import type { ChannelManager } from './channel-manager.js';

function makeTask(overrides: Partial<OrchestratorTask> = {}): OrchestratorTask {
  return {
    id: 'task-001',
    room: 'goal',
    channelId: 'ch-123',
    prompt: 'run tests',
    status: 'running',
    output: '',
    baseline: '',
    createdAt: new Date().toISOString(),
    lastOutputLength: 0,
    ...overrides,
  };
}

describe('OutputPoller', () => {
  let poller: OutputPoller;
  let mockLogger: Logger;
  let mockTaskStore: Partial<TaskStore>;
  let mockOutputCapture: Partial<OutputCapture>;
  let mockChannelManager: Partial<ChannelManager>;
  let mockDiscord: DiscordHelper;
  let config: OrchestratorConfig;

  beforeEach(() => {
    vi.useFakeTimers();
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    mockTaskStore = {
      getByStatus: vi.fn(() => []),
      updateStatus: vi.fn(),
      appendOutput: vi.fn(),
      setBaseline: vi.fn(),
    };
    mockOutputCapture = {
      captureWithDelta: vi.fn(async () => ({ content: '', delta: '' })),
    };
    mockChannelManager = {
      updateRoomContext: vi.fn(),
    };
    mockDiscord = {
      sendToChannel: vi.fn(async () => null),
      sendFile: vi.fn(async () => {}),
      editMessage: vi.fn(async () => {}),
      reply: vi.fn(async () => {}),
    };
    config = {
      enabled: true,
      channelCategory: 'test',
      pollIntervalMs: 1000,
      taskTimeoutMs: 120000,
      stabilizationMs: 5000,
    };

    poller = new OutputPoller(
      mockLogger,
      mockTaskStore as TaskStore,
      mockOutputCapture as OutputCapture,
      mockChannelManager as ChannelManager,
      mockDiscord,
      config,
    );
  });

  afterEach(() => {
    poller.stop();
    vi.useRealTimers();
  });

  describe('start/stop', () => {
    it('starts polling at configured interval', () => {
      poller.start();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Output poller started'),
      );
    });

    it('does not start twice', () => {
      poller.start();
      poller.start();
      // Only one info log for start
      const startCalls = (mockLogger.info as ReturnType<typeof vi.fn>).mock.calls
        .filter((c: unknown[]) => (c[0] as string).includes('started'));
      expect(startCalls).toHaveLength(1);
    });

    it('stops cleanly', () => {
      poller.start();
      poller.stop();
      expect(mockLogger.info).toHaveBeenCalledWith('Output poller stopped');
    });

    it('stop is idempotent when not started', () => {
      poller.stop(); // Should not throw or log
      expect(mockLogger.info).not.toHaveBeenCalledWith('Output poller stopped');
    });
  });

  describe('polling', () => {
    it('polls active tasks on interval', async () => {
      const task = makeTask({ status: 'running' });
      (mockTaskStore.getByStatus as ReturnType<typeof vi.fn>).mockReturnValue([task]);
      (mockOutputCapture.captureWithDelta as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: 'hello',
        delta: 'hello',
      });

      poller.start();
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockTaskStore.getByStatus).toHaveBeenCalledWith('dispatched', 'running');
      expect(mockOutputCapture.captureWithDelta).toHaveBeenCalledWith('goal', '');
    });

    it('appends new output delta to task', async () => {
      const task = makeTask({ status: 'running' });
      (mockTaskStore.getByStatus as ReturnType<typeof vi.fn>).mockReturnValue([task]);
      (mockOutputCapture.captureWithDelta as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: 'full output',
        delta: 'new stuff',
      });

      poller.start();
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockTaskStore.appendOutput).toHaveBeenCalledWith('task-001', 'new stuff');
      expect(mockTaskStore.setBaseline).toHaveBeenCalledWith('task-001', 'full output');
    });

    it('transitions dispatched task to running on first output', async () => {
      const task = makeTask({ status: 'dispatched' });
      (mockTaskStore.getByStatus as ReturnType<typeof vi.fn>).mockReturnValue([task]);
      (mockOutputCapture.captureWithDelta as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: 'output',
        delta: 'output',
      });

      poller.start();
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockTaskStore.updateStatus).toHaveBeenCalledWith('task-001', 'running');
    });
  });

  describe('timeout', () => {
    it('times out tasks exceeding taskTimeoutMs', async () => {
      const oldDate = new Date(Date.now() - 130000).toISOString(); // 130s ago
      const task = makeTask({ status: 'running', createdAt: oldDate, channelId: 'ch-123' });
      (mockTaskStore.getByStatus as ReturnType<typeof vi.fn>).mockReturnValue([task]);

      poller.start();
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockTaskStore.updateStatus).toHaveBeenCalledWith('task-001', 'timeout');
      expect(mockDiscord.sendToChannel).toHaveBeenCalled();
    });
  });

  describe('stabilization', () => {
    it('marks task complete when output ends with shell prompt after stabilization', async () => {
      const staleTime = new Date(Date.now() - 6000).toISOString(); // 6s ago > 5s stabilization
      const task = makeTask({
        status: 'running',
        output: 'test output\n$ ',
        lastOutputAt: staleTime,
        channelId: 'ch-123',
      });
      (mockTaskStore.getByStatus as ReturnType<typeof vi.fn>).mockReturnValue([task]);
      (mockOutputCapture.captureWithDelta as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: '',
        delta: '',
      });

      poller.start();
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockTaskStore.updateStatus).toHaveBeenCalledWith('task-001', 'complete');
      expect(mockChannelManager.updateRoomContext).toHaveBeenCalledWith('goal', 'test output\n$ ');
    });

    it('marks task complete after 2x stabilization even without prompt', async () => {
      const staleTime = new Date(Date.now() - 11000).toISOString(); // 11s > 10s (2x5s)
      const task = makeTask({
        status: 'running',
        output: 'output without prompt',
        lastOutputAt: staleTime,
        channelId: 'ch-123',
      });
      (mockTaskStore.getByStatus as ReturnType<typeof vi.fn>).mockReturnValue([task]);
      (mockOutputCapture.captureWithDelta as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: '',
        delta: '',
      });

      poller.start();
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockTaskStore.updateStatus).toHaveBeenCalledWith('task-001', 'complete');
    });

    it('does not stabilize when output is still arriving', async () => {
      const recentTime = new Date(Date.now() - 1000).toISOString(); // 1s ago < 5s
      const task = makeTask({
        status: 'running',
        output: 'still going',
        lastOutputAt: recentTime,
        channelId: 'ch-123',
      });
      (mockTaskStore.getByStatus as ReturnType<typeof vi.fn>).mockReturnValue([task]);
      (mockOutputCapture.captureWithDelta as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: '',
        delta: '',
      });

      poller.start();
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockTaskStore.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('postOutput', () => {
    it('posts short output inline', async () => {
      const task = makeTask({
        status: 'running',
        output: 'short output',
        createdAt: new Date(Date.now() - 130000).toISOString(),
        channelId: 'ch-123',
      });
      (mockTaskStore.getByStatus as ReturnType<typeof vi.fn>).mockReturnValue([task]);

      poller.start();
      await vi.advanceTimersByTimeAsync(1000);

      const sentContent = (mockDiscord.sendToChannel as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(sentContent).toContain('short output');
      expect(sentContent).toContain('```');
    });

    it('posts long output as file attachment', async () => {
      const longOutput = 'x'.repeat(2000);
      const task = makeTask({
        status: 'running',
        output: longOutput,
        createdAt: new Date(Date.now() - 130000).toISOString(),
        channelId: 'ch-123',
      });
      (mockTaskStore.getByStatus as ReturnType<typeof vi.fn>).mockReturnValue([task]);

      poller.start();
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockDiscord.sendFile).toHaveBeenCalledWith(
        'ch-123',
        longOutput,
        'task-task-001-output.txt',
      );
    });

    it('posts empty output message', async () => {
      const task = makeTask({
        status: 'running',
        output: '',
        createdAt: new Date(Date.now() - 130000).toISOString(),
        channelId: 'ch-123',
      });
      (mockTaskStore.getByStatus as ReturnType<typeof vi.fn>).mockReturnValue([task]);

      poller.start();
      await vi.advanceTimersByTimeAsync(1000);

      const sentContent = (mockDiscord.sendToChannel as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(sentContent).toContain('no output captured');
    });

    it('skips posting when no channelId', async () => {
      const task = makeTask({
        status: 'running',
        output: 'test',
        createdAt: new Date(Date.now() - 130000).toISOString(),
        channelId: '',
      });
      (mockTaskStore.getByStatus as ReturnType<typeof vi.fn>).mockReturnValue([task]);

      poller.start();
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockDiscord.sendToChannel).not.toHaveBeenCalled();
    });
  });

  describe('prompt pattern detection', () => {
    const promptPatterns = [
      'output\n$ ',
      'output\n❯ ',
      'output\n➜ ',
      'output\n> ',
      'output\n(base) $ ',
      'output\n% ',
    ];

    for (const pattern of promptPatterns) {
      it(`detects shell prompt: "${pattern.split('\n').pop()?.trim()}"`, async () => {
        const staleTime = new Date(Date.now() - 6000).toISOString();
        const task = makeTask({
          status: 'running',
          output: pattern,
          lastOutputAt: staleTime,
          channelId: 'ch-123',
        });
        (mockTaskStore.getByStatus as ReturnType<typeof vi.fn>).mockReturnValue([task]);
        (mockOutputCapture.captureWithDelta as ReturnType<typeof vi.fn>).mockResolvedValue({
          content: '',
          delta: '',
        });

        poller.start();
        await vi.advanceTimersByTimeAsync(1000);

        expect(mockTaskStore.updateStatus).toHaveBeenCalledWith(task.id, 'complete');
        poller.stop();
      });
    }
  });
});
