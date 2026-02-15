/**
 * src/discord/task-store.ts — JSONL Task Persistence
 *
 * Ported from thetadrivencoach/openclaw/src/task-store.ts
 *
 * States: pending -> dispatched -> running -> complete | failed | timeout | killed
 * Survives restart via JSONL replay.
 */
import type { OrchestratorTask, TaskStatus, Logger, ShellExecutor } from '../types.js';
export declare class TaskStore {
    private tasks;
    private log;
    private shell;
    private journalPath;
    constructor(log: Logger, shell: ShellExecutor, rootDir: string);
    create(room: string, channelId: string, prompt: string): string;
    updateStatus(id: string, status: TaskStatus, extra?: Partial<OrchestratorTask>): void;
    appendOutput(id: string, delta: string): void;
    setBaseline(id: string, baseline: string): void;
    setDiscordMessageId(id: string, messageId: string): void;
    get(id: string): OrchestratorTask | undefined;
    getByStatus(...statuses: TaskStatus[]): OrchestratorTask[];
    getRunningTaskForRoom(room: string): OrchestratorTask | undefined;
    getRecent(count?: number): OrchestratorTask[];
    killRoom(room: string): Promise<boolean>;
    private append;
    private replay;
}
//# sourceMappingURL=task-store.d.ts.map