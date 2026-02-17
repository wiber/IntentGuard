/**
 * src/discord/output-capture.test.ts — Tests for OutputCapture terminal reading
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutputCapture } from './output-capture.js';
import type { Logger, ShellExecutor } from '../types.js';
import { clipboardMutex } from './clipboard-mutex.js';

vi.mock('./clipboard-mutex.js', () => ({
  clipboardMutex: {
    acquire: vi.fn(async () => {}),
    release: vi.fn(),
  },
}));

describe('OutputCapture', () => {
  let capture: OutputCapture;
  let mockLogger: Logger;
  let mockShell: ShellExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    mockShell = {
      exec: vi.fn(async () => ({ stdout: '', stderr: '', code: 0 })),
    };
    capture = new OutputCapture(mockLogger, mockShell);
  });

  describe('capture', () => {
    it('returns empty content for unknown room', async () => {
      const result = await capture.capture('nonexistent');
      expect(result.room).toBe('nonexistent');
      expect(result.content).toBe('');
      expect(result.delta).toBe('');
      expect(result.timestamp).toBeTruthy();
      expect(mockShell.exec).not.toHaveBeenCalled();
    });

    it('captures iTerm room (builder) via osascript', async () => {
      vi.mocked(mockShell.exec).mockResolvedValueOnce({
        stdout: 'hello from builder',
        stderr: '',
        code: 0,
      });

      const result = await capture.capture('builder');
      expect(result.room).toBe('builder');
      expect(result.content).toBe('hello from builder');
      expect(mockShell.exec).toHaveBeenCalledOnce();
      const cmd = vi.mocked(mockShell.exec).mock.calls[0][0];
      expect(cmd).toContain('osascript');
      expect(cmd).toContain('iTerm');
    });

    it('captures Terminal.app room (voice) via osascript', async () => {
      vi.mocked(mockShell.exec).mockResolvedValueOnce({
        stdout: 'voice output',
        stderr: '',
        code: 0,
      });

      const result = await capture.capture('voice');
      expect(result.content).toBe('voice output');
      const cmd = vi.mocked(mockShell.exec).mock.calls[0][0];
      expect(cmd).toContain('Terminal');
    });

    it('captures kitty room (operator) via kitty @', async () => {
      vi.mocked(mockShell.exec).mockResolvedValueOnce({
        stdout: 'kitty text',
        stderr: '',
        code: 0,
      });

      const result = await capture.capture('operator');
      expect(result.content).toBe('kitty text');
      const cmd = vi.mocked(mockShell.exec).mock.calls[0][0];
      expect(cmd).toContain('kitty @');
    });

    it('captures WezTerm room (vault) with pane matching', async () => {
      vi.mocked(mockShell.exec)
        .mockResolvedValueOnce({
          stdout: JSON.stringify([{ pane_id: 42, title: 'vault-session' }]),
          stderr: '',
          code: 0,
        })
        .mockResolvedValueOnce({
          stdout: 'vault output',
          stderr: '',
          code: 0,
        });

      const result = await capture.capture('vault');
      expect(result.content).toBe('vault output');
      const secondCmd = vi.mocked(mockShell.exec).mock.calls[1][0];
      expect(secondCmd).toContain('--pane-id 42');
    });

    it('captures system-events room (architect) via clipboard', async () => {
      vi.mocked(mockShell.exec)
        .mockResolvedValueOnce({ stdout: '', stderr: '', code: 0 })
        .mockResolvedValueOnce({ stdout: 'clipboard text', stderr: '', code: 0 });

      const result = await capture.capture('architect');
      expect(result.content).toBe('clipboard text');
      expect(clipboardMutex.acquire).toHaveBeenCalledWith('architect');
      expect(clipboardMutex.release).toHaveBeenCalledWith('architect');
    });

    it('releases clipboard mutex even on error', async () => {
      vi.mocked(mockShell.exec).mockRejectedValueOnce(new Error('osascript failed'));

      const result = await capture.capture('architect');
      expect(result.content).toBe('');
      expect(clipboardMutex.release).toHaveBeenCalledWith('architect');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('returns empty on non-zero exit code', async () => {
      vi.mocked(mockShell.exec).mockResolvedValueOnce({
        stdout: '',
        stderr: 'error',
        code: 1,
      });

      const result = await capture.capture('builder');
      expect(result.content).toBe('');
    });

    it('handles WezTerm with invalid pane JSON gracefully', async () => {
      vi.mocked(mockShell.exec)
        .mockResolvedValueOnce({ stdout: 'not json', stderr: '', code: 0 })
        .mockResolvedValueOnce({ stdout: 'fallback output', stderr: '', code: 0 });

      const result = await capture.capture('vault');
      expect(result.content).toBe('fallback output');
      const secondCmd = vi.mocked(mockShell.exec).mock.calls[1][0];
      expect(secondCmd).not.toContain('--pane-id');
    });
  });

  describe('captureWithDelta', () => {
    it('computes delta when content extends baseline', async () => {
      vi.mocked(mockShell.exec).mockResolvedValueOnce({
        stdout: 'hello world new stuff',
        stderr: '',
        code: 0,
      });

      const result = await capture.captureWithDelta('builder', 'hello world ');
      expect(result.content).toBe('hello world new stuff');
      expect(result.delta).toBe('new stuff');
    });

    it('returns full content as delta when content differs but is shorter', async () => {
      vi.mocked(mockShell.exec).mockResolvedValueOnce({
        stdout: 'new',
        stderr: '',
        code: 0,
      });

      const result = await capture.captureWithDelta('builder', 'old content');
      expect(result.delta).toBe('new');
    });

    it('returns empty delta when content equals baseline', async () => {
      vi.mocked(mockShell.exec).mockResolvedValueOnce({
        stdout: 'same',
        stderr: '',
        code: 0,
      });

      const result = await capture.captureWithDelta('builder', 'same');
      expect(result.delta).toBe('');
    });

    it('returns empty delta for unknown room', async () => {
      const result = await capture.captureWithDelta('unknown', 'baseline');
      expect(result.delta).toBe('');
    });
  });
});
