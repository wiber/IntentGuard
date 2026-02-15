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
const AUTO_RELEASE_MS = 30_000;
class ClipboardMutex {
    holder = null;
    queue = [];
    releaseTimer = null;
    async acquire(room) {
        if (this.holder === null) {
            this.holder = room;
            this.startAutoRelease(room);
            return;
        }
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                this.removeFromQueue(room);
                resolve();
            }, AUTO_RELEASE_MS);
            this.queue.push({ room, resolve, timer });
        });
    }
    release(room) {
        if (this.holder !== room)
            return;
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
    isLocked() { return this.holder !== null; }
    currentHolder() { return this.holder; }
    queueLength() { return this.queue.length; }
    startAutoRelease(room) {
        this.releaseTimer = setTimeout(() => {
            if (this.holder === room)
                this.release(room);
        }, AUTO_RELEASE_MS);
    }
    removeFromQueue(room) {
        const idx = this.queue.findIndex((e) => e.room === room);
        if (idx !== -1) {
            clearTimeout(this.queue[idx].timer);
            this.queue.splice(idx, 1);
        }
    }
}
export const clipboardMutex = new ClipboardMutex();
//# sourceMappingURL=clipboard-mutex.js.map