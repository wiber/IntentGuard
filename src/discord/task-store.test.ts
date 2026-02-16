/**
 * src/discord/task-store.test.ts — Tests for TaskStore JSONL persistence
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TaskStore } from './task-store.js';
import type { Logger, ShellExecutor } from '../types.js';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('TaskStore', () => {
  let store: TaskStore;
  let mockLogger: Logger;
  let mockShell: ShellExecutor;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'task-store-test-'));
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    mockShell = {
      exec: vi.fn(async () => ({ stdout: '', stderr: '', code: 0 })),
    };
    store = new TaskStore(mockLogger, mockShell, tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates a task with pending status', () => {
    const id = store.create('room-1', 'chan-1', 'do something');
    const task = store.get(id);
    expect(task).toBeDefined();
    expect(task!.status).toBe('pending');
    expect(task!.room).toBe('room-1');
    expect(task!.channelId).toBe('chan-1');
    expect(task!.prompt).toBe('do something');
    expect(task!.output).toBe('');
  });

  it('updates task status', () => {
    const id = store.create('room-1', 'chan-1', 'test');
    store.updateStatus(id, 'running');
    expect(store.get(id)!.status).toBe('running');
  });

  it('sets completedAt for terminal statuses', () => {
    const id = store.create('room-1', 'chan-1', 'test');
    store.updateStatus(id, 'complete');
    expect(store.get(id)!.completedAt).toBeDefined();
  });

  it('applies extra fields on updateStatus', () => {
    const id = store.create('room-1', 'chan-1', 'test');
    store.updateStatus(id, 'running', { dispatchedAt: '2024-01-01' });
    expect(store.get(id)!.dispatchedAt).toBe('2024-01-01');
  });

  it('ignores updateStatus for unknown id', () => {
    expect(() => store.updateStatus('nope', 'running')).not.toThrow();
  });

  it('appends output', () => {
    const id = store.create('room-1', 'chan-1', 'test');
    store.appendOutput(id, 'hello ');
    store.appendOutput(id, 'world');
    const task = store.get(id)!;
    expect(task.output).toBe('hello world');
    expect(task.lastOutputLength).toBe(11);
    expect(task.lastOutputAt).toBeDefined();
  });

  it('sets baseline', () => {
    const id = store.create('room-1', 'chan-1', 'test');
    store.setBaseline(id, 'base');
    expect(store.get(id)!.baseline).toBe('base');
  });

  it('sets discord message id', () => {
    const id = store.create('room-1', 'chan-1', 'test');
    store.setDiscordMessageId(id, 'msg-456');
    expect(store.get(id)!.discordMessageId).toBe('msg-456');
  });

  it('filters by status', () => {
    const id1 = store.create('room-1', 'chan-1', 'a');
    const id2 = store.create('room-1', 'chan-1', 'b');
    store.updateStatus(id1, 'running');
    store.updateStatus(id2, 'complete');
    const running = store.getByStatus('running');
    expect(running).toHaveLength(1);
    expect(running[0].id).toBe(id1);
  });

  it('finds running task for room', () => {
    const id = store.create('room-a', 'chan-1', 'test');
    store.updateStatus(id, 'dispatched');
    expect(store.getRunningTaskForRoom('room-a')?.id).toBe(id);
    expect(store.getRunningTaskForRoom('room-b')).toBeUndefined();
  });

  it('returns recent tasks limited by count', () => {
    store.create('r', 'c', 'first');
    store.create('r', 'c', 'second');
    store.create('r', 'c', 'third');
    const recent = store.getRecent(2);
    expect(recent).toHaveLength(2);
    // All created in same tick so sort is stable; just verify limit works
    const all = store.getRecent(10);
    expect(all).toHaveLength(3);
  });

  it('kills running task in room', async () => {
    const id = store.create('room-x', 'chan-1', 'test');
    store.updateStatus(id, 'running');
    const killed = await store.killRoom('room-x');
    expect(killed).toBe(true);
    expect(store.get(id)!.status).toBe('killed');
  });

  it('returns false when no running task to kill', async () => {
    expect(await store.killRoom('empty-room')).toBe(false);
  });

  it('persists and replays from JSONL journal', () => {
    const id = store.create('room-1', 'chan-1', 'persist me');
    store.updateStatus(id, 'running');

    // Create a new store from the same directory — should replay
    const store2 = new TaskStore(mockLogger, mockShell, tempDir);
    const task = store2.get(id);
    expect(task).toBeDefined();
    expect(task!.status).toBe('running');
    expect(task!.prompt).toBe('persist me');
  });

  it('writes JSONL entries to disk', () => {
    store.create('r', 'c', 'test');
    const journalPath = join(tempDir, 'data', 'tasks.jsonl');
    const content = readFileSync(journalPath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const entry = JSON.parse(lines[0]);
    expect(entry.type).toBe('create');
    expect(entry.ts).toBeDefined();
  });
});
