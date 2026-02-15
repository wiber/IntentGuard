/**
 * src/discord/task-store.ts — JSONL Task Persistence
 *
 * Ported from thetadrivencoach/openclaw/src/task-store.ts
 *
 * States: pending -> dispatched -> running -> complete | failed | timeout | killed
 * Survives restart via JSONL replay.
 */

import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import type { OrchestratorTask, TaskStatus, Logger, ShellExecutor } from '../types.js';

export class TaskStore {
  private tasks = new Map<string, OrchestratorTask>();
  private log: Logger;
  private shell: ShellExecutor;
  private journalPath: string;

  constructor(log: Logger, shell: ShellExecutor, rootDir: string) {
    this.log = log;
    this.shell = shell;
    this.journalPath = join(rootDir, 'data', 'tasks.jsonl');

    const dir = dirname(this.journalPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.replay();
  }

  create(room: string, channelId: string, prompt: string): string {
    const id = randomUUID().slice(0, 8);
    const task: OrchestratorTask = {
      id, room, channelId, prompt, status: 'pending',
      output: '', baseline: '', createdAt: new Date().toISOString(), lastOutputLength: 0,
    };
    this.tasks.set(id, task);
    this.append({ type: 'create', task });
    return id;
  }

  updateStatus(id: string, status: TaskStatus, extra?: Partial<OrchestratorTask>): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.status = status;
    if (extra) Object.assign(task, extra);
    if (['complete', 'failed', 'timeout', 'killed'].includes(status)) {
      task.completedAt = new Date().toISOString();
    }
    this.append({ type: 'update', id, status, extra });
  }

  appendOutput(id: string, delta: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.output += delta;
    task.lastOutputAt = new Date().toISOString();
    task.lastOutputLength = task.output.length;
  }

  setBaseline(id: string, baseline: string): void {
    const task = this.tasks.get(id);
    if (task) task.baseline = baseline;
  }

  setDiscordMessageId(id: string, messageId: string): void {
    const task = this.tasks.get(id);
    if (task) task.discordMessageId = messageId;
  }

  get(id: string): OrchestratorTask | undefined { return this.tasks.get(id); }

  getByStatus(...statuses: TaskStatus[]): OrchestratorTask[] {
    return [...this.tasks.values()].filter(t => statuses.includes(t.status));
  }

  getRunningTaskForRoom(room: string): OrchestratorTask | undefined {
    return [...this.tasks.values()].find(
      t => t.room === room && (t.status === 'dispatched' || t.status === 'running'),
    );
  }

  getRecent(count: number = 10): OrchestratorTask[] {
    return [...this.tasks.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, count);
  }

  async killRoom(room: string): Promise<boolean> {
    const task = this.getRunningTaskForRoom(room);
    if (!task) return false;
    this.updateStatus(task.id, 'killed');
    return true;
  }

  private append(entry: Record<string, unknown>): void {
    try {
      appendFileSync(this.journalPath, JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n');
    } catch {}
  }

  private replay(): void {
    if (!existsSync(this.journalPath)) return;
    try {
      const lines = readFileSync(this.journalPath, 'utf-8').trim().split('\n').filter(Boolean);
      for (const line of lines) {
        const entry = JSON.parse(line);
        if (entry.type === 'create' && entry.task) {
          this.tasks.set(entry.task.id, entry.task);
        } else if (entry.type === 'update' && entry.id) {
          const task = this.tasks.get(entry.id);
          if (task) { task.status = entry.status; if (entry.extra) Object.assign(task, entry.extra); }
        }
      }
      this.log.info(`Task store replayed ${lines.length} entries, ${this.tasks.size} tasks`);
    } catch {}
  }
}
