/**
 * src/cortex-worker.ts — On-Demand Cortex Worker
 *
 * Replaces the always-on CEO Loop (ceo-loop.ts) with a queue consumer model.
 *
 * THE RULE: OpenClaw is the only clock. This worker NEVER independently schedules.
 * It polls a shared JSONL queue for tasks dispatched by OpenClaw's ThematicScheduler
 * when hardness >= 4 (Opus-tier deep work).
 *
 * FLOW:
 *   1. Poll openclaw/data/task-queue/cortex.jsonl for pending tasks
 *   2. Claim task (set status: "claimed", claimedBy, claimedAt)
 *   3. Execute via dispatch handlers (skeleton creation, wiring, shell, etc.)
 *   4. Write result to IntentGuard/data/shared/cortex-results.jsonl
 *   5. OpenClaw reads results, formats via TweetComposer, posts to Discord
 *
 * NO DISCORD CLIENT. NO INDEPENDENT SCHEDULING. NO while(true) spec scanning.
 * This is the Cortex — it does deep work when the Body asks.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OPENCLAW_ROOT = join(ROOT, '..', 'thetadrivencoach', 'openclaw');

// ═══════════════════════════════════════════════════════════════
// Load .env
// ═══════════════════════════════════════════════════════════════

const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#]\w*)=(.*)$/);
    if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface CortexTask {
  id: string;
  room: string;
  prompt: string;
  hardness: number;
  sovereignty: number;
  categories: string[];
  tesseractCell: string;
  themeSlot: string;
  createdAt: string;
  status: 'pending' | 'claimed' | 'completed' | 'failed';
  claimedBy: string | null;
  claimedAt: string | null;
}

interface CortexResult {
  id: string;
  status: 'completed' | 'failed';
  result: {
    summary: string;
    filesChanged: string[];
    testsRun: number;
    testsPassed: number;
    commitHash: string | null;
    linesAdded: number;
    linesRemoved: number;
  };
  targetCell: string;
  error: string | null;
  durationMs: number;
  completedAt: string;
}

interface WorkerConfig {
  pollIntervalMs: number;
  maxConsecutiveFailures: number;
  workerId: string;
}

const DEFAULT_CONFIG: WorkerConfig = {
  pollIntervalMs: 30_000,  // 30 seconds — not 15s like CEO loop
  maxConsecutiveFailures: 5,
  workerId: `cortex-${process.pid}`,
};

// ═══════════════════════════════════════════════════════════════
// Queue Operations
// ═══════════════════════════════════════════════════════════════

const CORTEX_QUEUE = join(OPENCLAW_ROOT, 'data', 'task-queue', 'cortex.jsonl');
const RESULTS_FILE = join(ROOT, 'data', 'shared', 'cortex-results.jsonl');

function readPendingTasks(): CortexTask[] {
  if (!existsSync(CORTEX_QUEUE)) return [];

  const lines = readFileSync(CORTEX_QUEUE, 'utf-8').split('\n').filter(l => l.trim());
  const tasks: CortexTask[] = [];

  for (const line of lines) {
    try {
      const task = JSON.parse(line) as CortexTask;
      if (task.status === 'pending') tasks.push(task);
    } catch { /* skip malformed lines */ }
  }

  return tasks;
}

function claimTask(taskId: string, workerId: string): boolean {
  if (!existsSync(CORTEX_QUEUE)) return false;

  const lines = readFileSync(CORTEX_QUEUE, 'utf-8').split('\n');
  const updated: string[] = [];
  let claimed = false;

  for (const line of lines) {
    if (!line.trim()) { updated.push(line); continue; }
    try {
      const task = JSON.parse(line) as CortexTask;
      if (task.id === taskId && task.status === 'pending') {
        task.status = 'claimed';
        task.claimedBy = workerId;
        task.claimedAt = new Date().toISOString();
        claimed = true;
      }
      updated.push(JSON.stringify(task));
    } catch {
      updated.push(line);
    }
  }

  if (claimed) {
    writeFileSync(CORTEX_QUEUE, updated.join('\n'));
  }
  return claimed;
}

function markTaskDone(taskId: string, status: 'completed' | 'failed'): void {
  if (!existsSync(CORTEX_QUEUE)) return;

  const lines = readFileSync(CORTEX_QUEUE, 'utf-8').split('\n');
  const updated: string[] = [];

  for (const line of lines) {
    if (!line.trim()) { updated.push(line); continue; }
    try {
      const task = JSON.parse(line) as CortexTask;
      if (task.id === taskId) {
        task.status = status;
      }
      updated.push(JSON.stringify(task));
    } catch {
      updated.push(line);
    }
  }

  writeFileSync(CORTEX_QUEUE, updated.join('\n'));
}

function writeResult(result: CortexResult): void {
  const dir = dirname(RESULTS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(RESULTS_FILE, JSON.stringify(result) + '\n');
}

// ═══════════════════════════════════════════════════════════════
// Task Execution — reuses dispatch logic from ceo-loop.ts
// ═══════════════════════════════════════════════════════════════

async function executeTask(task: CortexTask): Promise<{ success: boolean; summary: string; filesChanged: string[] }> {
  const prompt = task.prompt.toLowerCase();

  // Skeleton creation
  const pathMatch = task.prompt.match(/(?:src\/[\w\/-]+\.ts)/);
  if (pathMatch && (prompt.includes('skeleton') || prompt.includes('create src/'))) {
    const filePath = join(ROOT, pathMatch[0]);
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const className = pathMatch[0].split('/').pop()?.replace('.ts', '')
      ?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') || 'Module';

    const content = `/**\n * ${pathMatch[0]} — Generated by Cortex Worker\n * Task: ${task.prompt.substring(0, 120)}\n */\n\nexport default class ${className} {\n  name = '${className}';\n  // TODO: Implement\n}\n`;
    writeFileSync(filePath, content);
    return { success: true, summary: `Created skeleton: ${pathMatch[0]}`, filesChanged: [pathMatch[0]] };
  }

  // Test/benchmark tasks
  if (prompt.includes('test') || prompt.includes('benchmark')) {
    return runShell(task.prompt.substring(0, 200));
  }

  // Build/implement tasks — dispatch via Claude Flow if available
  if (prompt.includes('build') || prompt.includes('implement') || prompt.includes('wire')) {
    // For now, mark as needing Claude Flow agent
    return {
      success: false,
      summary: `Task needs Claude Flow agent dispatch: ${task.prompt.substring(0, 100)}`,
      filesChanged: [],
    };
  }

  return {
    success: false,
    summary: `No handler for task type: ${task.prompt.substring(0, 80)}`,
    filesChanged: [],
  };
}

function runShell(cmd: string): Promise<{ success: boolean; summary: string; filesChanged: string[] }> {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', `cd "${ROOT}" && ${cmd}`], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CLAUDECODE: undefined, CLAUDE_DEV: undefined },
    });

    let output = '';
    child.stdout?.on('data', (d: Buffer) => { if (output.length < 10000) output += d.toString(); });
    child.stderr?.on('data', (d: Buffer) => { if (output.length < 10000) output += d.toString(); });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ success: false, summary: `Shell timeout: ${cmd.substring(0, 60)}`, filesChanged: [] });
    }, 5 * 60_000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        success: code === 0,
        summary: output.substring(0, 200),
        filesChanged: [],
      });
    });
    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, summary: `Shell error: ${err}`, filesChanged: [] });
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// Worker Loop — polls queue, executes, writes results
// ═══════════════════════════════════════════════════════════════

async function cortexWorker(config: WorkerConfig = DEFAULT_CONFIG): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('  IntentGuard Cortex Worker — ON-DEMAND MODE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Worker ID: ${config.workerId}`);
  console.log(`Poll interval: ${config.pollIntervalMs}ms`);
  console.log(`Queue: ${CORTEX_QUEUE}`);
  console.log(`Results: ${RESULTS_FILE}`);
  console.log('');
  console.log('Waiting for tasks from OpenClaw...');
  console.log('');

  let consecutiveFailures = 0;
  let totalCompleted = 0;
  let totalFailed = 0;

  while (true) {
    // Poll for pending tasks
    const pending = readPendingTasks();

    if (pending.length === 0) {
      await new Promise(r => setTimeout(r, config.pollIntervalMs));
      continue;
    }

    // Take the first pending task
    const task = pending[0];
    console.log(`[Cortex] Picked: "${task.prompt.substring(0, 100)}" (room: ${task.room}, H${task.hardness})`);

    // Claim it
    if (!claimTask(task.id, config.workerId)) {
      console.log(`[Cortex] Could not claim task ${task.id} — already claimed?`);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    // Execute
    const start = Date.now();
    const execResult = await executeTask(task);
    const durationMs = Date.now() - start;

    // Write result
    const result: CortexResult = {
      id: task.id,
      status: execResult.success ? 'completed' : 'failed',
      result: {
        summary: execResult.summary,
        filesChanged: execResult.filesChanged,
        testsRun: 0,
        testsPassed: 0,
        commitHash: null,
        linesAdded: 0,
        linesRemoved: 0,
      },
      targetCell: task.tesseractCell || 'C1',
      error: execResult.success ? null : execResult.summary,
      durationMs,
      completedAt: new Date().toISOString(),
    };

    writeResult(result);
    markTaskDone(task.id, result.status);

    if (execResult.success) {
      totalCompleted++;
      consecutiveFailures = 0;
      console.log(`[Cortex] ✅ Done: "${task.prompt.substring(0, 80)}" (${durationMs}ms)`);
    } else {
      totalFailed++;
      consecutiveFailures++;
      console.log(`[Cortex] ❌ Failed: "${task.prompt.substring(0, 80)}" (${durationMs}ms)`);

      if (consecutiveFailures >= config.maxConsecutiveFailures) {
        console.log(`[Cortex] Circuit breaker: ${consecutiveFailures} consecutive failures. Cooling down 5 min...`);
        await new Promise(r => setTimeout(r, 5 * 60_000));
        consecutiveFailures = 0;
      }
    }

    console.log(`[Cortex] Stats: ${totalCompleted} completed, ${totalFailed} failed`);

    // Brief cooldown between tasks
    await new Promise(r => setTimeout(r, 5000));
  }
}

// ═══════════════════════════════════════════════════════════════
// CLI Entry Point
// ═══════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const config: WorkerConfig = { ...DEFAULT_CONFIG };

for (const arg of args) {
  if (arg.startsWith('--poll=')) config.pollIntervalMs = parseInt(arg.split('=')[1]) * 1000;
  if (arg.startsWith('--worker-id=')) config.workerId = arg.split('=')[1];
}

cortexWorker(config).catch((err) => {
  console.error('[Cortex] Fatal error:', err);
  process.exit(1);
});
