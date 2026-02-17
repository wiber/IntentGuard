/**
 * src/discord/clipboard-mutex.test.ts — Tests for ClipboardMutex
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ClipboardMutex is a singleton, so we re-import fresh each test suite
// by resetting modules. For unit tests we work with the exported instance.

describe('ClipboardMutex', () => {
  let clipboardMutex: typeof import('./clipboard-mutex.js')['clipboardMutex'];

  beforeEach(async () => {
    vi.useFakeTimers();
    // Get a fresh module instance per test
    vi.resetModules();
    const mod = await import('./clipboard-mutex.js');
    clipboardMutex = mod.clipboardMutex;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts unlocked', () => {
    expect(clipboardMutex.isLocked()).toBe(false);
    expect(clipboardMutex.currentHolder()).toBeNull();
    expect(clipboardMutex.queueLength()).toBe(0);
  });

  it('acquire sets the holder immediately when unlocked', async () => {
    await clipboardMutex.acquire('rio');
    expect(clipboardMutex.isLocked()).toBe(true);
    expect(clipboardMutex.currentHolder()).toBe('rio');
  });

  it('release clears the holder', async () => {
    await clipboardMutex.acquire('rio');
    clipboardMutex.release('rio');
    expect(clipboardMutex.isLocked()).toBe(false);
    expect(clipboardMutex.currentHolder()).toBeNull();
  });

  it('release from non-holder is a no-op', async () => {
    await clipboardMutex.acquire('rio');
    clipboardMutex.release('cursor');
    expect(clipboardMutex.currentHolder()).toBe('rio');
  });

  it('queues second acquirer until first releases', async () => {
    await clipboardMutex.acquire('rio');

    let secondAcquired = false;
    const secondPromise = clipboardMutex.acquire('cursor').then(() => {
      secondAcquired = true;
    });

    expect(clipboardMutex.queueLength()).toBe(1);
    expect(secondAcquired).toBe(false);

    clipboardMutex.release('rio');

    // Let microtasks flush
    await vi.advanceTimersByTimeAsync(0);

    expect(secondAcquired).toBe(true);
    expect(clipboardMutex.currentHolder()).toBe('cursor');
    expect(clipboardMutex.queueLength()).toBe(0);
  });

  it('processes queue in FIFO order', async () => {
    await clipboardMutex.acquire('rio');

    const order: string[] = [];
    clipboardMutex.acquire('cursor').then(() => order.push('cursor'));
    clipboardMutex.acquire('code').then(() => order.push('code'));

    expect(clipboardMutex.queueLength()).toBe(2);

    clipboardMutex.release('rio');
    await vi.advanceTimersByTimeAsync(0);

    expect(clipboardMutex.currentHolder()).toBe('cursor');
    expect(order).toEqual(['cursor']);

    clipboardMutex.release('cursor');
    await vi.advanceTimersByTimeAsync(0);

    expect(clipboardMutex.currentHolder()).toBe('code');
    expect(order).toEqual(['cursor', 'code']);
  });

  it('auto-releases holder after 30s', async () => {
    await clipboardMutex.acquire('rio');

    let secondAcquired = false;
    clipboardMutex.acquire('cursor').then(() => {
      secondAcquired = true;
    });

    // Advance past auto-release timeout
    await vi.advanceTimersByTimeAsync(30_000);

    expect(clipboardMutex.currentHolder()).toBe('cursor');
    expect(secondAcquired).toBe(true);
  });

  it('auto-releases queued entry after 30s timeout', async () => {
    await clipboardMutex.acquire('rio');

    let secondResolved = false;
    clipboardMutex.acquire('cursor').then(() => {
      secondResolved = true;
    });

    // Don't release rio — let the queued entry's own timer fire
    await vi.advanceTimersByTimeAsync(30_000);

    // Both the holder auto-release and queue entry timeout fire at 30s
    expect(secondResolved).toBe(true);
  });

  it('reports correct queueLength as entries are added and processed', async () => {
    await clipboardMutex.acquire('rio');

    clipboardMutex.acquire('cursor');
    clipboardMutex.acquire('code');
    clipboardMutex.acquire('messages');

    expect(clipboardMutex.queueLength()).toBe(3);

    clipboardMutex.release('rio');
    await vi.advanceTimersByTimeAsync(0);

    expect(clipboardMutex.queueLength()).toBe(2);
  });
});
