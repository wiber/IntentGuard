/**
 * Clipboard Mutex — Ported from thetadrivencoach/openclaw/src/clipboard-mutex.ts
 *
 * Global async lock for macOS clipboard operations.
 * System Events rooms (rio, Cursor, Code, Messages) share the clipboard for both
 * input (paste text into app) and output (Cmd+A, Cmd+C, pbpaste).
 * Without serialization, concurrent rooms corrupt each other's data.
 *
 * Auto-release after 30s to prevent deadlocks from crashed tasks.
 */

interface QueueEntry {
  room: string;
  resolve: () => void;
  timer: ReturnType<typeof setTimeout>;
}

const AUTO_RELEASE_MS = 30_000;

class ClipboardMutex {
  private holder: string | null = null;
  private queue: QueueEntry[] = [];
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;

  async acquire(room: string): Promise<void> {
    if (this.holder === null) {
      this.holder = room;
      this.startAutoRelease(room);
      return;
    }

    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.removeFromQueue(room);
        resolve();
      }, AUTO_RELEASE_MS);

      this.queue.push({ room, resolve, timer });
    });
  }

  release(room: string): void {
    if (this.holder !== room) return;

    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    this.holder = null;

    const next = this.queue.shift();
    if (next) {
      clearTimeout(next.timer);
      this.holder = next.room;
      this.startAutoRelease(next.room);
      next.resolve();
    }
  }

  isLocked(): boolean { return this.holder !== null; }
  currentHolder(): string | null { return this.holder; }
  queueLength(): number { return this.queue.length; }

  private startAutoRelease(room: string): void {
    this.releaseTimer = setTimeout(() => {
      if (this.holder === room) this.release(room);
    }, AUTO_RELEASE_MS);
  }

  private removeFromQueue(room: string): void {
    const idx = this.queue.findIndex((e) => e.room === room);
    if (idx !== -1) {
      clearTimeout(this.queue[idx].timer);
      this.queue.splice(idx, 1);
    }
  }
}

export const clipboardMutex = new ClipboardMutex();
