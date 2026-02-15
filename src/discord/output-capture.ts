/**
 * Output Capture — Ported from thetadrivencoach/openclaw/src/output-capture.ts
 *
 * Reads terminal output back from each room's terminal using the
 * appropriate IPC method. The "eyes" of the Sovereign Engine.
 *
 * IPC methods:
 *   iTerm     → AppleScript `contents of session` (no focus)
 *   Terminal  → AppleScript `history of tab` (no focus)
 *   kitty     → `kitty @ get-text --extent all` (no focus)
 *   WezTerm   → `wezterm cli get-text` (no focus)
 *   System Events → clipboard capture: Cmd+A, Cmd+C, pbpaste (NEEDS FOCUS + MUTEX)
 */

import type { IpcMethod, Logger, ShellExecutor } from '../types.js';
import { clipboardMutex } from './clipboard-mutex.js';

export interface CapturedOutput {
  room: string;
  content: string;
  timestamp: string;
  delta: string;
}

interface RoomIpcEntry {
  ipc: IpcMethod;
  app: string;
  processName: string;
  windowHint: string;
}

const ROOM_IPC: Record<string, RoomIpcEntry> = {
  builder:    { ipc: 'iterm',         app: 'iTerm',    processName: 'iTerm2',   windowHint: 'builder' },
  architect:  { ipc: 'system-events', app: 'Code',     processName: 'Code',     windowHint: 'architect' },
  operator:   { ipc: 'kitty',         app: 'kitty',    processName: 'kitty',    windowHint: 'operator' },
  vault:      { ipc: 'wezterm',       app: 'WezTerm',  processName: 'WezTerm',  windowHint: 'vault' },
  voice:      { ipc: 'terminal',      app: 'Terminal',  processName: 'Terminal', windowHint: 'voice' },
  laboratory: { ipc: 'system-events', app: 'Cursor',   processName: 'Cursor',   windowHint: 'laboratory' },
  performer:  { ipc: 'terminal',      app: 'Terminal',  processName: 'Terminal', windowHint: 'performer' },
  navigator:  { ipc: 'system-events', app: 'rio',      processName: 'rio',      windowHint: 'navigator' },
  network:    { ipc: 'system-events', app: 'Messages', processName: 'Messages', windowHint: 'network' },
};

export class OutputCapture {
  private log: Logger;
  private shell: ShellExecutor;

  constructor(log: Logger, shell: ShellExecutor) {
    this.log = log;
    this.shell = shell;
  }

  async capture(room: string): Promise<CapturedOutput> {
    const entry = ROOM_IPC[room];
    if (!entry) {
      return { room, content: '', timestamp: new Date().toISOString(), delta: '' };
    }

    try {
      const content = await this.readTerminal(room, entry);
      return { room, content, timestamp: new Date().toISOString(), delta: '' };
    } catch (err) {
      this.log.error(`Output capture failed for ${room}: ${err}`);
      return { room, content: '', timestamp: new Date().toISOString(), delta: '' };
    }
  }

  async captureWithDelta(room: string, baseline: string): Promise<CapturedOutput> {
    const result = await this.capture(room);
    if (result.content.length > baseline.length) {
      result.delta = result.content.slice(baseline.length);
    } else if (result.content !== baseline) {
      result.delta = result.content;
    }
    return result;
  }

  private async readTerminal(room: string, entry: RoomIpcEntry): Promise<string> {
    switch (entry.ipc) {
      case 'iterm':        return this.readITerm(entry);
      case 'terminal':     return this.readTerminalApp(entry);
      case 'kitty':        return this.readKitty(entry);
      case 'wezterm':      return this.readWezTerm(entry);
      case 'system-events': return this.readViaClipboard(room, entry);
    }
  }

  // ─── iTerm: `contents of session` (no focus needed) ────────────

  private async readITerm(entry: RoomIpcEntry): Promise<string> {
    const script = `
tell application "iTerm"
  set targetSession to missing value
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if name of s contains "${entry.windowHint}" then
          set targetSession to s
          exit repeat
        end if
      end repeat
      if targetSession is not missing value then exit repeat
    end repeat
    if targetSession is not missing value then exit repeat
  end repeat
  if targetSession is missing value then
    set targetSession to current session of first window
  end if
  contents of targetSession
end tell`;
    const { stdout, code } = await this.shell.exec(
      `osascript -e '${script.replace(/'/g, "'\\''")}'`
    );
    return code === 0 ? stdout : '';
  }

  // ─── Terminal.app: `contents of tab` (no focus needed) ─────────

  private async readTerminalApp(entry: RoomIpcEntry): Promise<string> {
    const script = `
tell application "Terminal"
  set targetTab to missing value
  repeat with w in windows
    if name of w contains "${entry.windowHint}" then
      set targetTab to selected tab of w
      exit repeat
    end if
  end repeat
  if targetTab is missing value then
    if (count of windows) > 0 then
      set targetTab to selected tab of first window
    else
      return ""
    end if
  end if
  contents of targetTab
end tell`;
    const { stdout, code } = await this.shell.exec(
      `osascript -e '${script.replace(/'/g, "'\\''")}'`
    );
    return code === 0 ? stdout : '';
  }

  // ─── kitty: `kitty @ get-text` (no focus needed) ──────────────

  private async readKitty(entry: RoomIpcEntry): Promise<string> {
    const sock = '/tmp/kitty-operator.sock';
    const { stdout, code } = await this.shell.exec(
      `kitty @ --to unix:${sock} get-text --extent all --match 'title:${entry.windowHint}' 2>/dev/null || ` +
      `kitty @ --to unix:${sock} get-text --extent all 2>/dev/null || ` +
      `kitty @ get-text --extent all 2>/dev/null`
    );
    return code === 0 ? stdout : '';
  }

  // ─── WezTerm: `wezterm cli get-text` (no focus needed) ────────

  private async readWezTerm(entry: RoomIpcEntry): Promise<string> {
    const { stdout: paneList } = await this.shell.exec(
      `wezterm cli list --format json 2>/dev/null`
    );
    let paneArg = '';
    try {
      const panes = JSON.parse(paneList) as Array<{ pane_id: number; title: string }>;
      const match = panes.find((p) => p.title.includes(entry.windowHint));
      if (match) paneArg = `--pane-id ${match.pane_id}`;
    } catch { /* use default */ }

    const { stdout, code } = await this.shell.exec(
      `wezterm cli get-text ${paneArg} 2>/dev/null`
    );
    return code === 0 ? stdout : '';
  }

  // ─── System Events: clipboard capture (NEEDS FOCUS + MUTEX) ───

  private async readViaClipboard(room: string, entry: RoomIpcEntry): Promise<string> {
    await clipboardMutex.acquire(room);
    try {
      const activateScript = `
tell application "${entry.app}" to activate
delay 0.3
tell application "System Events"
  tell process "${entry.processName}"
    set frontmost to true
    delay 0.2
    keystroke "a" using command down
    delay 0.1
    keystroke "c" using command down
    delay 0.2
  end tell
end tell`;
      await this.shell.exec(`osascript -e '${activateScript.replace(/'/g, "'\\''")}'`);
      const { stdout } = await this.shell.exec('pbpaste');
      return stdout;
    } finally {
      clipboardMutex.release(room);
    }
  }
}
