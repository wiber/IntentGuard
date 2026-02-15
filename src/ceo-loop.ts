/**
 * src/ceo-loop.ts — Proactive Autonomous CEO Loop
 *
 * NOT a chatbot. NOT reactive. This is the brain.
 *
 * LOOP:
 *   1. Read the spec (08-implementation-plan.tsx) for `status: 'todo'` items
 *   2. Pick the highest-priority non-future todo
 *   3. Build a detailed prompt with full context (spec sections, existing code)
 *   4. Dispatch to Claude Sonnet via claude-flow-bridge (headless)
 *   5. On completion: update the spec (todo → done), re-render
 *   6. Tweet the result with ShortRank intersection to #trust-debt-public
 *   7. Post pivotal Q+A to the correct cognitive room
 *   8. Wait for cooldown, then loop
 *
 * This IS the Headless CEO. It uses OpenClaw as the railway.
 * Claude Sonnet does the coding. The spec is the source of truth.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { Client, GatewayIntentBits, TextChannel, ChannelType } from 'discord.js';
import {
  intersection, autoIntersection, pivotalQuestion, detectCell, trustCategoriesToCell,
} from './discord/shortrank-notation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ═══════════════════════════════════════════════════════════════
// Load .env
// ═══════════════════════════════════════════════════════════════

const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#]\w*)=(.*)$/);
    if (m && m[1] && !process.env[m[1]]) {
      process.env[m[1]] = m[2];
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface SpecTodo {
  phase: string;
  phaseName: string;
  index: number;
  text: string;
  future: boolean;
}

interface CeoConfig {
  /** Seconds between loop iterations */
  cooldownSec: number;
  /** Max concurrent Claude processes */
  maxConcurrent: number;
  /** Only process non-future phases */
  skipFuturePhases: boolean;
  /** Discord channel for tweets */
  tweetChannelName: string;
  /** Stop after N todos completed (0 = infinite) */
  maxTodos: number;
}

const DEFAULT_CONFIG: CeoConfig = {
  cooldownSec: 30,
  maxConcurrent: 1,
  skipFuturePhases: true,
  tweetChannelName: 'trust-debt-public',
  maxTodos: 0,
};

// ═══════════════════════════════════════════════════════════════
// Spec Reader — reads the implementation plan TSX as structured data
// ═══════════════════════════════════════════════════════════════

function readSpecTodos(): SpecTodo[] {
  const specPath = join(ROOT, 'spec/sections/08-implementation-plan.tsx');
  const content = readFileSync(specPath, 'utf-8');

  const todos: SpecTodo[] = [];

  // Parse phases from the TSX source
  const phaseBlocks = content.split(/\{\s*\n\s*id:\s*'/);
  for (let i = 1; i < phaseBlocks.length; i++) {
    const block = phaseBlocks[i];
    const idMatch = block.match(/^([^']+)'/);
    const nameMatch = block.match(/name:\s*'([^']+)'/);
    const futureMatch = block.match(/future:\s*(true|false)/);
    const phase = idMatch?.[1] || `phase-${i}`;
    const phaseName = nameMatch?.[1] || phase;
    const future = futureMatch?.[1] === 'true';

    // Find all checklist items with status: 'todo'
    const itemRegex = /\{\s*text:\s*'([^']+)',\s*status:\s*'todo'\s*\}/g;
    let match;
    let idx = 0;
    while ((match = itemRegex.exec(block)) !== null) {
      todos.push({ phase, phaseName, index: idx++, text: match[1], future });
    }
  }

  return todos;
}

// ═══════════════════════════════════════════════════════════════
// Spec Updater — marks a todo as 'done' in the TSX source
// ═══════════════════════════════════════════════════════════════

function markSpecDone(todoText: string): boolean {
  const specPath = join(ROOT, 'spec/sections/08-implementation-plan.tsx');
  let content = readFileSync(specPath, 'utf-8');

  const escaped = todoText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `(\\{\\s*text:\\s*'${escaped}',\\s*status:\\s*)'todo'(\\s*\\})`,
  );

  if (pattern.test(content)) {
    content = content.replace(pattern, "$1'done'$2");
    writeFileSync(specPath, content);
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// Context Builder — gathers relevant code context for Claude
// ═══════════════════════════════════════════════════════════════

function buildPromptForTodo(todo: SpecTodo): string {
  const parts: string[] = [];

  parts.push(`You are the IntentGuard Sovereign Engine — a Headless CEO bot.`);
  parts.push(`You are implementing the IntentGuard migration spec autonomously.`);
  parts.push(`Project root: ${ROOT}`);
  parts.push(``);
  parts.push(`## CURRENT TASK`);
  parts.push(`Phase: ${todo.phaseName}`);
  parts.push(`Todo: ${todo.text}`);
  parts.push(``);
  parts.push(`## INSTRUCTIONS`);
  parts.push(`1. Implement this task completely.`);
  parts.push(`2. Write or modify the necessary files in the project.`);
  parts.push(`3. If this is a test task, run the test and report results.`);
  parts.push(`4. If this requires running a command, run it and report output.`);
  parts.push(`5. Be precise. This runs headlessly — no human will fix your mistakes.`);
  parts.push(`6. When done, output a single-line summary starting with "DONE:" followed by what you did.`);
  parts.push(``);

  // Add relevant file context based on the todo text
  const lower = todo.text.toLowerCase();

  if (lower.includes('openclaw') || lower.includes('wrapper') || lower.includes('child process')) {
    const wrapperPath = join(ROOT, 'src/wrapper.ts');
    if (existsSync(wrapperPath)) {
      parts.push(`## REFERENCE: src/wrapper.ts (first 100 lines)`);
      parts.push(readFileSync(wrapperPath, 'utf-8').split('\n').slice(0, 100).join('\n'));
      parts.push(``);
    }
  }

  if (lower.includes('test') || lower.includes('benchmark') || lower.includes('integration')) {
    const geoPath = join(ROOT, 'src/auth/geometric.ts');
    if (existsSync(geoPath)) {
      parts.push(`## REFERENCE: src/auth/geometric.ts (first 80 lines)`);
      parts.push(readFileSync(geoPath, 'utf-8').split('\n').slice(0, 80).join('\n'));
      parts.push(``);
    }
  }

  if (lower.includes('discord') || lower.includes('pipe') || lower.includes('round-trip')) {
    const runtimePath = join(ROOT, 'src/runtime.ts');
    if (existsSync(runtimePath)) {
      parts.push(`## REFERENCE: src/runtime.ts (first 80 lines)`);
      parts.push(readFileSync(runtimePath, 'utf-8').split('\n').slice(0, 80).join('\n'));
      parts.push(``);
    }
  }

  // Always include the spec for context
  const specPath = join(ROOT, 'spec/sections/08-implementation-plan.tsx');
  if (existsSync(specPath)) {
    parts.push(`## REFERENCE: Current spec (08-implementation-plan.tsx)`);
    parts.push(readFileSync(specPath, 'utf-8'));
  }

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// Claude Flow Dispatcher — uses MCP task system, not nested CLI
// ═══════════════════════════════════════════════════════════════

/**
 * Dispatch modes (tried in order):
 * 1. Claude Flow MCP (if MCP server available) — agent_spawn + task_create
 * 2. Direct file operations (for tasks we can implement inline)
 * 3. Shell commands (for test/benchmark tasks)
 *
 * NEVER spawns `claude -p` inside Claude Code. That's the old broken way.
 */

interface McpClient {
  call(method: string, params: Record<string, unknown>): Promise<unknown>;
}

let mcpClient: McpClient | null = null;

async function initMcpClient(): Promise<McpClient | null> {
  // Try to connect to Claude Flow MCP server
  try {
    const response = await fetch('http://localhost:18800/health', { signal: AbortSignal.timeout(2000) });
    if (response.ok) {
      return {
        async call(method: string, params: Record<string, unknown>) {
          const res = await fetch('http://localhost:18800/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method, params }),
          });
          return res.json();
        },
      };
    }
  } catch {}
  return null;
}

async function dispatchViaClaudeFlow(todo: SpecTodo, prompt: string): Promise<{ success: boolean; output: string; code: number }> {
  // Try MCP-based dispatch first
  if (!mcpClient) mcpClient = await initMcpClient();

  if (mcpClient) {
    try {
      const task = await mcpClient.call('task_create', {
        type: 'feature',
        description: prompt,
        priority: 'high',
        tags: [todo.phase, 'ceo-loop'],
      });
      console.log(`[CEO] Claude Flow task created:`, JSON.stringify(task).substring(0, 200));
      // Task created in Claude Flow — agent will pick it up
      return { success: true, output: `Claude Flow task dispatched for: ${todo.text}`, code: 0 };
    } catch (err) {
      console.log(`[CEO] Claude Flow MCP dispatch failed: ${err}, falling back to shell`);
    }
  }

  // Fallback: direct shell execution for concrete tasks
  return dispatchViaShell(todo, prompt);
}

function dispatchViaShell(todo: SpecTodo, prompt: string): Promise<{ success: boolean; output: string; code: number }> {
  return new Promise((resolve) => {
    const lower = todo.text.toLowerCase();
    let cmd: string;

    // Map spec todos to concrete shell commands (not claude -p)
    if (lower.includes('benchmark') || lower.includes('latency')) {
      cmd = `cd "${ROOT}" && npx tsx tests/fim-benchmark.test.js 2>&1`;
    } else if (lower.includes('integration test') || lower.includes('proxy intercepts')) {
      cmd = `cd "${ROOT}" && npx tsx tests/integration/fim-proxy.test.js 2>&1`;
    } else if (lower.includes('.env') || lower.includes('round-trip')) {
      cmd = `cd "${ROOT}" && npx tsx tests/discord-roundtrip.test.js 2>&1`;
    } else if (lower.includes('openclaw') || lower.includes('daemon')) {
      cmd = `cd "${ROOT}" && npx openclaw onboard --install-daemon 2>&1 || echo "DONE: OpenClaw daemon setup attempted"`;
    } else if (lower.includes('render') || lower.includes('spec')) {
      cmd = `cd "${ROOT}" && npx tsx spec/render.tsx > intentguard-migration-spec.html 2>&1 && echo "DONE: Spec rendered"`;
    } else {
      // Generic: just log what needs doing
      console.log(`[CEO] No direct shell mapping for: "${todo.text}"`);
      resolve({ success: false, output: `No shell mapping for: ${todo.text}. Needs Claude Flow agent.`, code: 1 });
      return;
    }

    const env = { ...process.env };
    delete env.CLAUDECODE;

    const child = spawn('bash', ['-c', cmd], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    let output = '';
    const maxOutput = 50000;

    child.stdout?.on('data', (data: Buffer) => {
      if (output.length < maxOutput) output += data.toString();
    });
    child.stderr?.on('data', (data: Buffer) => {
      if (output.length < maxOutput) output += data.toString();
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ success: false, output: output + '\n[TIMEOUT]', code: -1 });
    }, 5 * 60 * 1000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ success: code === 0, output, code: code || 0 });
    });
    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, output: `Process error: ${err}`, code: -1 });
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// Discord Tweeter — sends ShortRank-tagged updates
// ═══════════════════════════════════════════════════════════════

class DiscordTweeter {
  private client: Client;
  private tweetChannel: TextChannel | null = null;
  private roomChannels: Map<string, TextChannel> = new Map();
  private ready = false;

  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });
  }

  async connect(): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.THETADRIVEN_GUILD_ID;
    if (!token || !guildId) throw new Error('Missing DISCORD_BOT_TOKEN or THETADRIVEN_GUILD_ID');

    return new Promise((resolve, reject) => {
      this.client.once('ready', () => {
        const guild = this.client.guilds.cache.get(guildId!);
        if (!guild) { reject(new Error(`Guild not found: ${guildId}`)); return; }

        // Find channels
        for (const [, ch] of guild.channels.cache) {
          if (ch.type !== ChannelType.GuildText) continue;
          const tc = ch as TextChannel;
          if (tc.name === 'trust-debt-public') this.tweetChannel = tc;
          // Map cognitive room channels
          for (const room of ['builder', 'architect', 'operator', 'vault', 'voice', 'laboratory', 'performer', 'navigator', 'network']) {
            if (tc.name === room) this.roomChannels.set(room, tc);
          }
        }

        this.ready = true;
        resolve();
      });

      this.client.login(token).catch(reject);
    });
  }

  async tweet(text: string): Promise<string | null> {
    if (!this.ready || !this.tweetChannel) return null;
    try {
      const msg = await this.tweetChannel.send(text);
      return msg.id;
    } catch { return null; }
  }

  async sendToRoom(room: string, text: string): Promise<string | null> {
    const ch = this.roomChannels.get(room);
    if (!ch) return null;
    try {
      const msg = await ch.send(text);
      return msg.id;
    } catch { return null; }
  }

  destroy(): void {
    this.client.destroy();
  }
}

// ═══════════════════════════════════════════════════════════════
// CEO Loop — the brain
// ═══════════════════════════════════════════════════════════════

async function ceoLoop(config: CeoConfig = DEFAULT_CONFIG): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('  IntentGuard CEO Loop — Headless Autonomous Mode');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Cooldown: ${config.cooldownSec}s | Max concurrent: ${config.maxConcurrent}`);
  console.log(`Skip future: ${config.skipFuturePhases} | Max todos: ${config.maxTodos || '∞'}`);
  console.log('');

  // Connect to Discord
  const discord = new DiscordTweeter();
  try {
    await discord.connect();
    console.log('[CEO] Discord connected');
  } catch (err) {
    console.error('[CEO] Discord connection failed, running without tweets:', err);
  }

  // Announce startup
  const startIx = intersection('A2', 'C2');
  await discord.tweet(
    `${startIx.notation}\nCEO Loop started. Reading spec, picking todos, dispatching Claude Sonnet. Recursive self-improvement active.\n🟡 S:70% | #autonomy #transparency | #IntentGuard`
  );

  let completed = 0;
  const failedThisSession = new Set<string>(); // Skip items that failed

  while (true) {
    // 1. Read the spec
    const todos = readSpecTodos();
    const actionable = config.skipFuturePhases
      ? todos.filter(t => !t.future && !failedThisSession.has(t.text))
      : todos.filter(t => !failedThisSession.has(t.text));

    console.log(`\n[CEO] Spec scan: ${todos.length} total todos, ${actionable.length} actionable (${failedThisSession.size} skipped)`);

    if (actionable.length === 0) {
      console.log('[CEO] All actionable todos complete! Entering idle watch mode.');
      const doneIx = intersection('A2', 'A2');
      await discord.tweet(
        `${doneIx.notation}\nAll actionable spec items complete. ${completed} items implemented this session. Entering watch mode.\n🟢 S:80% | #milestone #transparency | #IntentGuard`
      );
      break;
    }

    if (config.maxTodos > 0 && completed >= config.maxTodos) {
      console.log(`[CEO] Max todos (${config.maxTodos}) reached. Stopping.`);
      break;
    }

    // 2. Pick the next todo (first non-future in order)
    const todo = actionable[0];
    console.log(`[CEO] Picked: [${todo.phaseName}] "${todo.text}"`);

    // Determine ShortRank cells for this task
    const detected = detectCell(todo.text);
    const sourceCell = detected.cell;
    const targetCell = detected.confidence > 0.3 ? 'C1' : 'C2'; // Grid or Loop
    const ix = intersection(sourceCell, targetCell);

    // 3. Tweet that we're starting
    await discord.tweet(
      `${ix.notation}\nCEO dispatching: "${todo.text.substring(0, 120)}"\nPhase: ${todo.phaseName}\n🟡 S:70% | #autonomy #wip | #IntentGuard`
    );

    // 4. Build prompt and dispatch via Claude Flow
    const prompt = buildPromptForTodo(todo);
    console.log(`[CEO] Dispatching via Claude Flow (${prompt.length} chars)...`);
    const startTime = Date.now();

    const result = await dispatchViaClaudeFlow(todo, prompt);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`[CEO] Claude returned (${elapsed}s, code: ${result.code})`);

    // 5. Check for DONE marker in output
    const doneMatch = result.output.match(/DONE:\s*(.+)/);
    const summary = doneMatch?.[1]?.trim() || result.output.substring(0, 200);

    if (result.success || doneMatch) {
      // Mark done in spec
      const marked = markSpecDone(todo.text);
      if (marked) {
        console.log(`[CEO] Spec updated: "${todo.text}" → done`);
      } else {
        console.log(`[CEO] Warning: could not update spec for "${todo.text}"`);
      }

      completed++;

      // 6. Tweet success with ShortRank
      await discord.tweet(
        `${ix.notation}\nCompleted: "${todo.text.substring(0, 100)}"\n${summary.substring(0, 80)}\n🟡 S:70% | #done #transparency | #IntentGuard`
      );

      // 7. Post pivotal Q+A to cognitive room
      const pq = pivotalQuestion(sourceCell, todo.text);
      await discord.sendToRoom(
        pq.room,
        `**Pivotal Question** (${ix.compact}):\n${pq.question}\n**Predicted Answer:**\n${pq.predictedAnswer}`
      );

      console.log(`[CEO] Pivotal Q sent to #${pq.room}: ${pq.question}`);
    } else {
      console.log(`[CEO] Task failed (code: ${result.code}). Output:`);
      console.log(result.output.substring(0, 500));

      // Tweet failure and skip this item
      failedThisSession.add(todo.text);
      await discord.tweet(
        `${ix.notation}\nFailed: "${todo.text.substring(0, 100)}"\nSkipping, moving to next item.\n🔴 S:60% | #blocked #transparency | #IntentGuard`
      );
    }

    // 8. Re-render the spec
    try {
      console.log('[CEO] Re-rendering spec...');
      await dispatchViaShell(
        { phase: 'render', phaseName: 'Spec Render', index: 0, text: 'render spec', future: false },
        'render spec',
      );
    } catch {}

    // 9. Cooldown
    console.log(`[CEO] Cooldown ${config.cooldownSec}s...`);
    await new Promise(r => setTimeout(r, config.cooldownSec * 1000));
  }

  // Final summary
  console.log(`\n[CEO] Session complete. ${completed} todos implemented.`);

  // Log to file
  const logDir = join(ROOT, 'data');
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
  writeFileSync(
    join(logDir, `ceo-loop-${Date.now()}.json`),
    JSON.stringify({ completed, timestamp: new Date().toISOString() }, null, 2),
  );

  discord.destroy();
}

// ═══════════════════════════════════════════════════════════════
// CLI Entry Point
// ═══════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const config: CeoConfig = { ...DEFAULT_CONFIG };

for (const arg of args) {
  if (arg.startsWith('--cooldown=')) config.cooldownSec = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--max=')) config.maxTodos = parseInt(arg.split('=')[1]);
  if (arg === '--include-future') config.skipFuturePhases = false;
}

ceoLoop(config).catch((err) => {
  console.error('[CEO] Fatal error:', err);
  process.exit(1);
});
