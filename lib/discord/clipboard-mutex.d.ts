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
declare class ClipboardMutex {
    private holder;
    private queue;
    private releaseTimer;
    acquire(room: string): Promise<void>;
    release(room: string): void;
    isLocked(): boolean;
    currentHolder(): string | null;
    queueLength(): number;
    private startAutoRelease;
    private removeFromQueue;
}
export declare const clipboardMutex: ClipboardMutex;
export {};
//# sourceMappingURL=clipboard-mutex.d.ts.map