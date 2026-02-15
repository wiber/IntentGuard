/**
 * src/skills/claude-flow-bridge.ts — Headless Terminal Router
 *
 * Ported from thetadrivencoach/openclaw/skills/claude-flow-bridge.ts
 * Adapted for IntentGuard's headless always-on operation.
 *
 * Routes prompts to cognitive room terminals via:
 *   - Background Claude CLI subprocess (default, headless)
 *   - AppleScript IPC for terminal apps with native support
 *   - System Events keystroke for apps needing focus
 *
 * Each ThetaCog room maps to a terminal app.
 * Messages in room channels dispatch to terminals.
 * Terminal output is captured and posted back.
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

const DEFAULT_ROOM = 'builder';

interface ClaudeFlowCommand {
  action: string;
  payload: Record<string, unknown>;
}

export default class ClaudeFlowBridgeSkill implements AgentSkill {
  name = 'claude-flow-bridge';
  description = 'Route prompts to cognitive room terminals (headless, parallel-safe)';

  private projectDir = '';

  // External hooks — set by runtime
  public onTaskDispatched?: (room: string, prompt: string) => Promise<{ taskId: string; baseline: string } | null>;
  public getRoomContext?: (room: string) => string;
  public onProcessOutput?: (room: string, data: string) => void;
  public onProcessSpawned?: (room: string, pid: number) => void;
  public onProcessComplete?: (room: string, output: string, code: number) => void;

  async initialize(ctx: SkillContext): Promise<void> {
    this.projectDir = ctx.config.get('integrations.claudeFlow.projectDir') as string
      || process.cwd();

    ctx.log.info(`ClaudeFlowBridge initialized, project: ${this.projectDir}`);
  }

  async execute(command: unknown, ctx: SkillContext): Promise<SkillResult> {
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

    return this.sendToRoom(room, prompt, ctx);
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

  private async sendToRoom(room: string, prompt: string, ctx: SkillContext): Promise<SkillResult> {
    if (!prompt) return { success: false, message: 'No prompt provided' };

    const terminal = TERMINALS[room];
    if (!terminal) {
      ctx.log.warn(`Unknown room "${room}", falling back to ${DEFAULT_ROOM}`);
      return this.sendToRoom(DEFAULT_ROOM, prompt, ctx);
    }

    let fullPrompt = prompt;
    if (this.getRoomContext) {
      const context = this.getRoomContext(room);
      if (context) fullPrompt = `[Previous output context]\n${context}\n[End context]\n\n${prompt}`;
    }

    const cleanPrompt = fullPrompt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    ctx.log.info(`${terminal.emoji} → ${terminal.app} [${room}] (${cleanPrompt.length} chars)`);

    // Log to corpus
    await ctx.fs.write(
      'data/attention-corpus/prompts.jsonl',
      JSON.stringify({ timestamp: new Date().toISOString(), room, terminal: terminal.app, prompt: cleanPrompt.substring(0, 500) }) + '\n',
    ).catch(() => {});

    // Register task with orchestrator
    let taskId: string | undefined;
    if (this.onTaskDispatched) {
      const taskInfo = await this.onTaskDispatched(room, prompt);
      if (taskInfo) taskId = taskInfo.taskId;
    }

    try {
      const result = await this.dispatch(terminal, cleanPrompt, ctx);
      return { ...result, data: { ...result.data as Record<string, unknown>, taskId } };
    } catch (error) {
      return { success: false, message: `Dispatch to ${room} failed: ${error}` };
    }
  }

  private async sendStdin(room: string, text: string, ctx: SkillContext): Promise<SkillResult> {
    if (!text) return { success: false, message: 'No text provided for STDIN' };
    const terminal = TERMINALS[room];
    if (!terminal) return { success: false, message: `Unknown room: ${room}` };

    try {
      const result = await this.dispatch(terminal, text, ctx);
      return { ...result, message: `STDIN sent to ${room}` };
    } catch (error) {
      return { success: false, message: `STDIN to ${room} failed: ${error}` };
    }
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
    }));
    return { success: true, message: `${entries.length} terminals registered`, data: entries };
  }

  /**
   * Dispatch: background Claude CLI subprocess (headless, default).
   */
  private async dispatch(terminal: TerminalEntry, prompt: string, ctx: SkillContext): Promise<SkillResult> {
    const escaped = prompt.replace(/'/g, "'\\''");
    const cmd = `cd "${this.projectDir}" && claude -p '${escaped}' --dangerously-skip-permissions 2>&1`;

    ctx.log.info(`${terminal.emoji} BG process [${terminal.room}]: spawning claude CLI`);

    const { spawn } = await import('child_process');

    return new Promise<SkillResult>((resolve) => {
      const child = spawn('bash', ['-c', cmd], {
        cwd: this.projectDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
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
            message: `Background process started for ${terminal.room} (PID: ${child.pid})`,
            data: { room: terminal.room, pid: child.pid, mode: 'background' },
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
}
