/**
 * src/skills/claude-flow-bridge.ts — Claude Flow Orchestration Bridge
 *
 * Dispatches prompts through Claude Flow's agent/task system,
 * NOT raw `claude -p` subprocesses.
 *
 * DISPATCH PIPELINE:
 *   1. claude-flow task create → registers tracked task
 *   2. claude-flow agent spawn → Opus worker for the task
 *   3. claude-flow task assign → binds worker to task
 *   4. Polls task status until complete/failed/timeout
 *   5. Posts results to Discord via onProcessComplete hook
 *
 * FALLBACK: If Claude Flow is unavailable, falls back to direct
 * `claude -p` subprocess (the old behavior).
 *
 * TERMINAL IPC: The Output Poller (output-poller.ts) handles reading
 * terminal content. This bridge only dispatches; the poller observes.
 */

import type { AgentSkill, SkillContext, SkillResult, TerminalEntry } from '../types.js';

const TERMINALS: Record<string, TerminalEntry> = {
  builder:    { room: 'builder',    emoji: '🔨', app: 'iTerm',    processName: 'iTerm2',   ipc: 'iterm',         windowHint: 'builder' },
  architect:  { room: 'architect',  emoji: '📐', app: 'Code',     processName: 'Code',     ipc: 'system-events', windowHint: 'architect' },
  operator:   { room: 'operator',   emoji: '🎩', app: 'kitty',    processName: 'kitty',    ipc: 'kitty',         windowHint: 'operator' },
  vault:      { room: 'vault',      emoji: '🔒', app: 'WezTerm',  processName: 'WezTerm',  ipc: 'wezterm',       windowHint: 'vault' },
  voice:      { room: 'voice',      emoji: '🎤', app: 'Terminal',  processName: 'Terminal', ipc: 'terminal',      windowHint: 'voice' },
  laboratory: { room: 'laboratory', emoji: '🧪', app: 'Cursor',   processName: 'Cursor',   ipc: 'system-events', windowHint: 'laboratory' },
  performer:  { room: 'performer',  emoji: '🎬', app: 'Terminal',  processName: 'Terminal', ipc: 'terminal',      windowHint: 'performer' },
  navigator:  { room: 'navigator',  emoji: '🧭', app: 'rio',      processName: 'rio',      ipc: 'system-events', windowHint: 'navigator' },
  network:    { room: 'network',    emoji: '🌐', app: 'Messages', processName: 'Messages', ipc: 'system-events', windowHint: 'network' },
};

/** Map rooms to Claude Flow agent types */
const ROOM_TO_AGENT_TYPE: Record<string, string> = {
  builder:    'coder',
  architect:  'planner',
  operator:   'ops',
  vault:      'security',
  voice:      'writer',
  laboratory: 'researcher',
  performer:  'coder',
  navigator:  'researcher',
  network:    'writer',
};

/** Map priority numbers to Claude Flow priority strings */
const PRIORITY_MAP: Record<number, string> = {
  1: 'critical',
  2: 'high',
  3: 'normal',
  4: 'low',
  5: 'low',
};

const DEFAULT_ROOM = 'builder';
const TASK_POLL_INTERVAL_MS = 5000;
const TASK_POLL_TIMEOUT_MS = 120000;

interface ClaudeFlowCommand {
  action: string;
  payload: Record<string, unknown>;
}

interface ClaudeFlowTaskResult {
  taskId: string;
  agentId: string;
  status: string;
  output: string;
}

export default class ClaudeFlowBridgeSkill implements AgentSkill {
  name = 'claude-flow-bridge';
  description = 'Route prompts through Claude Flow agent orchestration (Opus workers, Discord messaging)';

  private projectDir = '';
  private workerModel: 'opus' | 'sonnet' | 'haiku' = 'opus';
  private workerMaxTurns = 25;
  private claudeFlowAvailable = false;

  // External hooks — set by runtime
  public onTaskDispatched?: (room: string, prompt: string) => Promise<{ taskId: string; baseline: string } | null>;
  public getRoomContext?: (room: string) => string;
  public onProcessOutput?: (room: string, data: string) => void;
  public onProcessSpawned?: (room: string, pid: number) => void;
  public onProcessComplete?: (room: string, output: string, code: number) => void;
  /** Discord messaging hook — post to room channel */
  public onDiscordMessage?: (channelId: string, content: string) => Promise<string | null>;

  async initialize(ctx: SkillContext): Promise<void> {
    this.projectDir = ctx.config.get('integrations.claudeFlow.projectDir') as string
      || process.cwd();

    const modelConfig = ctx.config.get('integrations.claudeFlow.workerModel') as string || 'claude-opus-4-6';
    if (modelConfig.includes('opus')) this.workerModel = 'opus';
    else if (modelConfig.includes('haiku')) this.workerModel = 'haiku';
    else this.workerModel = 'sonnet';

    this.workerMaxTurns = (ctx.config.get('integrations.claudeFlow.workerMaxTurns') as number)
      || 25;

    // Check if Claude Flow is available
    const { code } = await ctx.shell.exec('npx claude-flow status 2>/dev/null');
    this.claudeFlowAvailable = code === 0;

    ctx.log.info(
      `ClaudeFlowBridge initialized | project: ${this.projectDir} | ` +
      `model: ${this.workerModel} | maxTurns: ${this.workerMaxTurns} | ` +
      `claude-flow: ${this.claudeFlowAvailable ? '✅ available' : '⚠️ unavailable (fallback to CLI)'}`
    );
  }

  async execute(command: unknown, ctx: SkillContext): Promise<SkillResult> {
    // RECURSION GUARD: If we're already inside a Claude Flow worker, refuse to spawn
    if (process.env.CLAUDE_FLOW_WORKER === '1' || process.env.CLAUDE_FLOW_NO_SPAWN === '1') {
      ctx.log.warn('⛔ RECURSION GUARD: claude-flow-bridge blocked — already inside a Claude Flow worker');
      return { success: false, message: 'Blocked: recursive Claude Flow spawn detected. This process is already a Claude Flow worker.' };
    }

    const cmd = command as ClaudeFlowCommand;

    switch (cmd.action) {
      case 'create_task':
        return this.routeTask(cmd.payload, ctx);
      case 'prompt':
        return this.sendToRoom(cmd.payload.room as string || DEFAULT_ROOM, cmd.payload.prompt as string, ctx);
      case 'stdin':
        return this.sendStdin(cmd.payload.room as string || DEFAULT_ROOM, cmd.payload.text as string, ctx);
      case 'broadcast':
        return this.broadcast(cmd.payload.prompt as string, cmd.payload.rooms as string[], ctx);
      case 'list_terminals':
        return this.listTerminals();
      case 'list_agents':
        return this.listAgents(ctx);
      default:
        return this.sendToRoom(DEFAULT_ROOM, JSON.stringify(cmd), ctx);
    }
  }

  private async routeTask(payload: Record<string, unknown>, ctx: SkillContext): Promise<SkillResult> {
    const source = payload.source as Record<string, unknown> | undefined;
    const priority = payload.priority as number || 3;
    const category = source?.category as { tile_id: string; tier: string } | undefined;
    const transcription = source?.transcription as { text: string } | undefined;

    const room = this.tierToRoom(category?.tier);
    const prompt = `Voice memo task (priority ${priority}, category ${category?.tile_id || 'general'}): "${transcription?.text || 'No transcription'}" Implement the requested changes.`;

    return this.sendToRoom(room, prompt, ctx, priority);
  }

  private tierToRoom(tier?: string): string {
    switch (tier?.toUpperCase()) {
      case 'RED':    return 'vault';
      case 'BLUE':   return 'builder';
      case 'GREEN':  return 'operator';
      case 'PURPLE': return 'voice';
      case 'CYAN':   return 'laboratory';
      case 'AMBER':  return 'performer';
      case 'INDIGO': return 'architect';
      case 'TEAL':   return 'navigator';
      default:       return DEFAULT_ROOM;
    }
  }

  private async sendToRoom(room: string, prompt: string, ctx: SkillContext, priority: number = 3): Promise<SkillResult> {
    if (!prompt) return { success: false, message: 'No prompt provided' };

    const terminal = TERMINALS[room];
    if (!terminal) {
      ctx.log.warn(`Unknown room "${room}", falling back to ${DEFAULT_ROOM}`);
      return this.sendToRoom(DEFAULT_ROOM, prompt, ctx, priority);
    }

    let fullPrompt = prompt;
    if (this.getRoomContext) {
      const context = this.getRoomContext(room);
      if (context) fullPrompt = `[Previous output context]\n${context}\n[End context]\n\n${prompt}`;
    }

    const cleanPrompt = fullPrompt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    ctx.log.info(`${terminal.emoji} → [${room}] via Claude Flow (${cleanPrompt.length} chars)`);

    // Log to attention corpus
    await ctx.fs.write(
      'data/attention-corpus/prompts.jsonl',
      JSON.stringify({ timestamp: new Date().toISOString(), room, terminal: terminal.app, prompt: cleanPrompt.substring(0, 500) }) + '\n',
    ).catch(() => {});

    // Register task with runtime orchestrator (Discord tracking)
    let runtimeTaskId: string | undefined;
    if (this.onTaskDispatched) {
      const taskInfo = await this.onTaskDispatched(room, prompt);
      if (taskInfo) runtimeTaskId = taskInfo.taskId;
    }

    try {
      const result = this.claudeFlowAvailable
        ? await this.dispatchViaClaudeFlow(terminal, cleanPrompt, priority, ctx)
        : await this.dispatchViaCLI(terminal, cleanPrompt, ctx);

      return { ...result, data: { ...result.data as Record<string, unknown>, runtimeTaskId } };
    } catch (error) {
      return { success: false, message: `Dispatch to ${room} failed: ${error}` };
    }
  }

  private async sendStdin(room: string, text: string, ctx: SkillContext): Promise<SkillResult> {
    if (!text) return { success: false, message: 'No text provided for STDIN' };
    const terminal = TERMINALS[room];
    if (!terminal) return { success: false, message: `Unknown room: ${room}` };

    // STDIN goes through terminal IPC, not Claude Flow
    return this.sendViaTerminalIPC(terminal, text, ctx);
  }

  private async broadcast(prompt: string, rooms: string[] | undefined, ctx: SkillContext): Promise<SkillResult> {
    if (!prompt) return { success: false, message: 'No prompt provided' };
    const targets = rooms || Object.keys(TERMINALS);

    const results = await Promise.allSettled(
      targets.map(room => this.sendToRoom(room, prompt, ctx))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    return {
      success: succeeded > 0,
      message: `Broadcast: ${succeeded}/${results.length} succeeded`,
      data: { targets, succeeded, failed: results.length - succeeded },
    };
  }

  private listTerminals(): SkillResult {
    const entries = Object.entries(TERMINALS).map(([room, t]) => ({
      room, emoji: t.emoji, app: t.app, ipc: t.ipc, parallel: t.ipc !== 'system-events',
      agentType: ROOM_TO_AGENT_TYPE[room] || 'coder',
    }));
    return { success: true, message: `${entries.length} terminals registered`, data: entries };
  }

  private async listAgents(ctx: SkillContext): Promise<SkillResult> {
    const { stdout, code } = await ctx.shell.exec('npx claude-flow agent list 2>/dev/null');
    if (code !== 0) return { success: false, message: 'Claude Flow not available' };
    return { success: true, message: stdout.trim(), data: { raw: stdout } };
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIMARY: Claude Flow Dispatch
  // ═══════════════════════════════════════════════════════════════

  /**
   * Dispatch via Claude Flow: task create → agent spawn → assign → poll
   */
  private async dispatchViaClaudeFlow(
    terminal: TerminalEntry,
    prompt: string,
    priority: number,
    ctx: SkillContext,
  ): Promise<SkillResult> {
    const agentType = ROOM_TO_AGENT_TYPE[terminal.room] || 'coder';
    const cfPriority = PRIORITY_MAP[priority] || 'normal';
    const escapedPrompt = prompt.replace(/'/g, "'\\''").replace(/"/g, '\\"');

    ctx.log.info(`${terminal.emoji} CF [${terminal.room}]: creating task (${agentType}, ${cfPriority}, model=${this.workerModel})`);

    // Step 1: Create Claude Flow task
    const taskCreate = await ctx.shell.exec(
      `npx claude-flow task create -t implementation -d "${escapedPrompt.substring(0, 500)}" --priority ${cfPriority} --tag room:${terminal.room} --tag model:${this.workerModel} 2>&1`
    );

    let cfTaskId = '';
    const taskIdMatch = taskCreate.stdout.match(/task[_-]([a-zA-Z0-9_-]+)/);
    if (taskIdMatch) {
      cfTaskId = taskIdMatch[0];
    } else {
      ctx.log.warn(`CF task create output: ${taskCreate.stdout.substring(0, 200)}`);
      // Fallback to CLI if task creation failed
      ctx.log.warn(`Claude Flow task create failed, falling back to CLI dispatch`);
      return this.dispatchViaCLI(terminal, prompt, ctx);
    }

    ctx.log.info(`${terminal.emoji} CF [${terminal.room}]: task ${cfTaskId} created`);

    // Step 2: Spawn agent for this task
    const agentSpawn = await ctx.shell.exec(
      `npx claude-flow agent spawn -t ${agentType} --model ${this.workerModel} --tag room:${terminal.room} 2>&1`
    );

    let cfAgentId = '';
    const agentIdMatch = agentSpawn.stdout.match(/agent[_-]([a-zA-Z0-9_-]+)/) || agentSpawn.stdout.match(/([a-zA-Z]+-[a-zA-Z0-9]+)/);
    if (agentIdMatch) {
      cfAgentId = agentIdMatch[0];
    } else {
      ctx.log.warn(`CF agent spawn output: ${agentSpawn.stdout.substring(0, 200)}`);
    }

    ctx.log.info(`${terminal.emoji} CF [${terminal.room}]: agent ${cfAgentId || 'unknown'} spawned (${this.workerModel})`);

    // Step 3: Assign task to agent
    if (cfAgentId && cfTaskId) {
      await ctx.shell.exec(
        `npx claude-flow task assign ${cfTaskId} --agent ${cfAgentId} 2>&1`
      );
      ctx.log.info(`${terminal.emoji} CF [${terminal.room}]: task ${cfTaskId} → agent ${cfAgentId}`);
    }

    // Notify hooks
    if (this.onProcessSpawned) this.onProcessSpawned(terminal.room, 0);

    // Step 4: Background poll for completion
    this.pollTaskCompletion(terminal, cfTaskId, cfAgentId, ctx);

    return {
      success: true,
      message: `Claude Flow task dispatched: ${cfTaskId} → ${cfAgentId} (${this.workerModel})`,
      data: {
        room: terminal.room,
        cfTaskId,
        cfAgentId,
        model: this.workerModel,
        mode: 'claude-flow',
      },
    };
  }

  /**
   * Background poll: check task status until complete/failed/timeout.
   * Calls onProcessComplete when done.
   */
  private async pollTaskCompletion(
    terminal: TerminalEntry,
    cfTaskId: string,
    cfAgentId: string,
    ctx: SkillContext,
  ): Promise<void> {
    const startTime = Date.now();

    const poll = async () => {
      const elapsed = Date.now() - startTime;

      if (elapsed > TASK_POLL_TIMEOUT_MS) {
        ctx.log.warn(`${terminal.emoji} CF [${terminal.room}]: task ${cfTaskId} timed out (${Math.round(elapsed / 1000)}s)`);
        if (this.onProcessComplete) this.onProcessComplete(terminal.room, `Task timed out after ${Math.round(elapsed / 1000)}s`, 1);
        // Cancel the timed-out task
        await ctx.shell.exec(`npx claude-flow task cancel ${cfTaskId} 2>/dev/null`);
        if (cfAgentId) await ctx.shell.exec(`npx claude-flow agent stop ${cfAgentId} 2>/dev/null`);
        return;
      }

      const { stdout } = await ctx.shell.exec(
        `npx claude-flow task status ${cfTaskId} 2>/dev/null`
      );

      const statusLower = stdout.toLowerCase();

      if (statusLower.includes('completed') || statusLower.includes('done') || statusLower.includes('success')) {
        ctx.log.info(`${terminal.emoji} CF [${terminal.room}]: task ${cfTaskId} completed (${Math.round(elapsed / 1000)}s)`);
        if (this.onProcessComplete) this.onProcessComplete(terminal.room, stdout, 0);
        return;
      }

      if (statusLower.includes('failed') || statusLower.includes('error') || statusLower.includes('cancelled')) {
        ctx.log.warn(`${terminal.emoji} CF [${terminal.room}]: task ${cfTaskId} failed`);
        if (this.onProcessComplete) this.onProcessComplete(terminal.room, stdout, 1);
        return;
      }

      // Still running — feed intermediate output
      if (stdout.trim() && this.onProcessOutput) {
        this.onProcessOutput(terminal.room, stdout);
      }

      // Schedule next poll
      setTimeout(poll, TASK_POLL_INTERVAL_MS);
    };

    // Start polling after initial delay
    setTimeout(poll, TASK_POLL_INTERVAL_MS);
  }

  // ═══════════════════════════════════════════════════════════════
  // FALLBACK: Direct CLI Dispatch
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fallback: spawn `claude -p` subprocess when Claude Flow is unavailable.
   */
  private async dispatchViaCLI(terminal: TerminalEntry, prompt: string, ctx: SkillContext): Promise<SkillResult> {
    const escaped = prompt.replace(/'/g, "'\\''");
    const modelFlag = this.workerModel === 'opus' ? 'claude-opus-4-6'
      : this.workerModel === 'haiku' ? 'claude-haiku-4-5-20251001'
      : 'claude-sonnet-4-5-20250929';
    const cmd = `cd "${this.projectDir}" && claude -p '${escaped}' --model ${modelFlag} --max-turns ${this.workerMaxTurns} --dangerously-skip-permissions 2>&1`;

    ctx.log.info(`${terminal.emoji} CLI [${terminal.room}]: fallback to claude -p (${modelFlag})`);

    const { spawn } = await import('child_process');

    return new Promise<SkillResult>((resolve) => {
      const child = spawn('bash', ['-c', cmd], {
        cwd: this.projectDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
        env: (() => {
          const env = {
            ...process.env,
            CLAUDE_FLOW_WORKER: '1',        // Prevent recursive spawning
            CLAUDE_FLOW_NO_SPAWN: '1',      // Belt-and-suspenders guard
            MCP_DISABLE_CLAUDE_FLOW: '1',   // Disable claude-flow MCP in child
          };
          delete env.CLAUDECODE;            // Prevent "cannot launch inside another session"
          delete env.CLAUDE_DEV;            // Same guard for dev mode
          return env;
        })(),
      });

      let output = '';
      let resolved = false;

      child.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        if (this.onProcessOutput) this.onProcessOutput(terminal.room, data.toString());
      });

      child.stderr?.on('data', (data: Buffer) => {
        output += data.toString();
        if (this.onProcessOutput) this.onProcessOutput(terminal.room, data.toString());
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (this.onProcessSpawned) this.onProcessSpawned(terminal.room, child.pid || 0);
          resolve({
            success: true,
            message: `CLI fallback: PID ${child.pid} for ${terminal.room}`,
            data: { room: terminal.room, pid: child.pid, mode: 'cli-fallback' },
          });
        }
      }, 500);

      child.on('close', (code) => {
        if (this.onProcessComplete) this.onProcessComplete(terminal.room, output, code || 0);
        if (!resolved) {
          resolved = true;
          resolve({ success: code === 0, message: `Process completed (code: ${code})`, data: { room: terminal.room, output: output.substring(0, 2000), code } });
        }
      });

      child.on('error', (err) => {
        if (!resolved) { resolved = true; resolve({ success: false, message: `Process error: ${err}` }); }
      });

      child.unref();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Terminal IPC: 9-room dispatch system
  // ═══════════════════════════════════════════════════════════════

  // System Events queue for focus-stealing terminals
  private systemEventsLock: Promise<void> = Promise.resolve();

  /**
   * Send text to a running terminal via IPC (for STDIN input).
   * This uses the physical terminal, not Claude Flow.
   */
  private async sendViaTerminalIPC(terminal: TerminalEntry, text: string, ctx: SkillContext): Promise<SkillResult> {
    switch (terminal.ipc) {
      case 'iterm':
        return this.sendViaITerm(terminal, text, ctx);
      case 'terminal':
        return this.sendViaTerminalApp(terminal, text, ctx);
      case 'kitty':
        return this.sendViaKitty(terminal, text, ctx);
      case 'wezterm':
        return this.sendViaWezTerm(terminal, text, ctx);
      case 'system-events':
        return this.sendViaSystemEvents(terminal, text, ctx);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // iTerm2 — `write text` to a session (no focus needed)
  // ─────────────────────────────────────────────────────────────

  private async sendViaITerm(terminal: TerminalEntry, prompt: string, ctx: SkillContext): Promise<SkillResult> {
    const escaped = this.escapeAppleScript(prompt);

    // Try to find a session whose name contains the room hint.
    // If not found, use the current session of the first window.
    const script = `
tell application "iTerm"
  set targetSession to missing value

  -- Search all windows/tabs/sessions for one matching the room
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if name of s contains "${terminal.windowHint}" then
          set targetSession to s
          exit repeat
        end if
      end repeat
      if targetSession is not missing value then exit repeat
    end repeat
    if targetSession is not missing value then exit repeat
  end repeat

  -- Fallback: first window, current session
  if targetSession is missing value then
    set targetSession to current session of first window
  end if

  tell targetSession
    write text "${escaped}"
  end tell
end tell
"sent"`;

    return this.runAppleScript(script, terminal, ctx);
  }

  // ─────────────────────────────────────────────────────────────
  // Terminal.app — `do script` in a tab (no focus needed)
  // ─────────────────────────────────────────────────────────────

  private async sendViaTerminalApp(terminal: TerminalEntry, prompt: string, ctx: SkillContext): Promise<SkillResult> {
    const escaped = this.escapeAppleScript(prompt);

    // Find a window/tab with the room hint in its name, or use the front tab
    const script = `
tell application "Terminal"
  set targetTab to missing value

  repeat with w in windows
    if name of w contains "${terminal.windowHint}" then
      set targetTab to selected tab of w
      exit repeat
    end if
  end repeat

  if targetTab is missing value then
    -- Fallback: use the first window's selected tab
    if (count of windows) > 0 then
      set targetTab to selected tab of first window
    else
      error "No Terminal windows open"
    end if
  end if

  do script "${escaped}" in targetTab
end tell
"sent"`;

    return this.runAppleScript(script, terminal, ctx);
  }

  // ─────────────────────────────────────────────────────────────
  // Kitty — `kitty @ send-text` via remote control
  // ─────────────────────────────────────────────────────────────

  private async sendViaKitty(terminal: TerminalEntry, prompt: string, ctx: SkillContext): Promise<SkillResult> {
    // Kitty remote control: send text to a window matching the title
    const escaped = prompt.replace(/'/g, "'\\''");
    const textWithReturn = escaped + "\r";

    // Use the unix socket so we don't need Kitty to be frontmost
    const sock = "/tmp/kitty-operator.sock";
    const { stdout, stderr, code } = await ctx.shell.exec(
      `kitty @ --to unix:${sock} send-text --match 'title:${terminal.windowHint}' '${textWithReturn}' 2>/dev/null || ` +
      `kitty @ --to unix:${sock} send-text '${textWithReturn}' 2>/dev/null || ` +
      `kitty @ send-text '${textWithReturn}'`
    );

    if (code !== 0 && !stdout.includes("sent")) {
      return { success: false, message: `Kitty send-text failed: ${stderr}` };
    }

    ctx.log.info(`${terminal.emoji} Kitty send-text to ${terminal.windowHint}`);
    return {
      success: true,
      message: `Sent to Kitty [${terminal.room}]`,
      data: { room: terminal.room, app: terminal.app, ipc: "kitty", length: prompt.length },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // WezTerm — `wezterm cli send-text` via CLI
  // ─────────────────────────────────────────────────────────────

  private async sendViaWezTerm(terminal: TerminalEntry, prompt: string, ctx: SkillContext): Promise<SkillResult> {
    // WezTerm CLI: list panes, find matching one, send text
    const escaped = prompt.replace(/'/g, "'\\''");

    // Try to find a pane with the room hint in its title
    const { stdout: paneList } = await ctx.shell.exec(
      `wezterm cli list --format json 2>/dev/null`
    );

    let paneId: string | null = null;
    try {
      const panes = JSON.parse(paneList) as Array<{ pane_id: number; title: string }>;
      const match = panes.find(p => p.title.includes(terminal.windowHint));
      if (match) paneId = String(match.pane_id);
    } catch {
      // pane list parse failed, use default
    }

    const paneArg = paneId ? `--pane-id ${paneId}` : "";
    const textWithNewline = escaped + "\n";

    const { stderr, code } = await ctx.shell.exec(
      `printf '%s' '${textWithNewline}' | wezterm cli send-text ${paneArg}`
    );

    if (code !== 0) {
      return { success: false, message: `WezTerm send-text failed: ${stderr}` };
    }

    ctx.log.info(`${terminal.emoji} WezTerm send-text to ${paneId || "active pane"}`);
    return {
      success: true,
      message: `Sent to WezTerm [${terminal.room}]`,
      data: { room: terminal.room, app: terminal.app, ipc: "wezterm", paneId, length: prompt.length },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // System Events — keystroke (needs focus, serialized)
  // ─────────────────────────────────────────────────────────────

  private async sendViaSystemEvents(terminal: TerminalEntry, prompt: string, ctx: SkillContext): Promise<SkillResult> {
    // Serialize all System Events dispatches to avoid focus races
    const resultPromise = new Promise<SkillResult>((resolve) => {
      this.systemEventsLock = this.systemEventsLock.then(async () => {
        const result = await this.keystrokeIntoApp(terminal, prompt, ctx);
        resolve(result);
      });
    });

    return resultPromise;
  }

  private async keystrokeIntoApp(terminal: TerminalEntry, prompt: string, ctx: SkillContext): Promise<SkillResult> {
    // For long text (>100 chars), use clipboard paste — much faster and more reliable
    if (prompt.length > 100) {
      return this.clipboardPasteIntoApp(terminal, prompt, ctx);
    }

    const escaped = this.escapeAppleScript(prompt);

    const script = `
tell application "${terminal.app}"
  activate
end tell

delay 0.3

tell application "System Events"
  tell process "${terminal.processName}"
    set frontmost to true
    delay 0.2
    keystroke "${escaped}"
    delay 0.2
    keystroke return
  end tell
end tell
"typed"`;

    return this.runAppleScript(script, terminal, ctx);
  }

  /**
   * Paste text into a System Events app via clipboard (faster for long text).
   */
  private async clipboardPasteIntoApp(terminal: TerminalEntry, prompt: string, ctx: SkillContext): Promise<SkillResult> {
    // Set clipboard
    const escaped = prompt.replace(/'/g, "'\\''");
    await ctx.shell.exec(`printf '%s' '${escaped}' | pbcopy`);

    // Activate app and paste
    const script = `
tell application "${terminal.app}"
  activate
end tell

delay 0.3

tell application "System Events"
  tell process "${terminal.processName}"
    set frontmost to true
    delay 0.2
    keystroke "v" using command down
    delay 0.3
    keystroke return
  end tell
end tell
"pasted"`;

    return this.runAppleScript(script, terminal, ctx);
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private escapeAppleScript(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
  }

  private async runAppleScript(script: string, terminal: TerminalEntry, ctx: SkillContext): Promise<SkillResult> {
    const { stdout, stderr, code } = await ctx.shell.exec(
      `osascript -e '${script.replace(/'/g, "'\\''")}'`
    );

    if (code !== 0) {
      return { success: false, message: `AppleScript failed for ${terminal.app}: ${stderr}` };
    }

    ctx.log.info(`${terminal.emoji} Dispatched to ${terminal.app} [${terminal.room}]`);
    return {
      success: true,
      message: `Sent to ${terminal.app} [${terminal.room}]`,
      data: { room: terminal.room, app: terminal.app, ipc: terminal.ipc },
    };
  }
}
