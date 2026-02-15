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
import type { Logger, ShellExecutor } from '../types.js';
export interface CapturedOutput {
    room: string;
    content: string;
    timestamp: string;
    delta: string;
}
export declare class OutputCapture {
    private log;
    private shell;
    constructor(log: Logger, shell: ShellExecutor);
    capture(room: string): Promise<CapturedOutput>;
    captureWithDelta(room: string, baseline: string): Promise<CapturedOutput>;
    private readTerminal;
    private readITerm;
    private readTerminalApp;
    private readKitty;
    private readWezTerm;
    private readViaClipboard;
}
//# sourceMappingURL=output-capture.d.ts.map