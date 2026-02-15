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
import type { AgentSkill, SkillContext, SkillResult } from '../types.js';
export default class ClaudeFlowBridgeSkill implements AgentSkill {
    name: string;
    description: string;
    private projectDir;
    private workerModel;
    private workerMaxTurns;
    private claudeFlowAvailable;
    onTaskDispatched?: (room: string, prompt: string) => Promise<{
        taskId: string;
        baseline: string;
    } | null>;
    getRoomContext?: (room: string) => string;
    onProcessOutput?: (room: string, data: string) => void;
    onProcessSpawned?: (room: string, pid: number) => void;
    onProcessComplete?: (room: string, output: string, code: number) => void;
    /** Discord messaging hook — post to room channel */
    onDiscordMessage?: (channelId: string, content: string) => Promise<string | null>;
    initialize(ctx: SkillContext): Promise<void>;
    execute(command: unknown, ctx: SkillContext): Promise<SkillResult>;
    private routeTask;
    private tierToRoom;
    private sendToRoom;
    private sendStdin;
    private broadcast;
    private listTerminals;
    private listAgents;
    /**
     * Dispatch via Claude Flow: task create → agent spawn → assign → poll
     */
    private dispatchViaClaudeFlow;
    /**
     * Background poll: check task status until complete/failed/timeout.
     * Calls onProcessComplete when done.
     */
    private pollTaskCompletion;
    /**
     * Fallback: spawn `claude -p` subprocess when Claude Flow is unavailable.
     */
    private dispatchViaCLI;
    private systemEventsLock;
    /**
     * Send text to a running terminal via IPC (for STDIN input).
     * This uses the physical terminal, not Claude Flow.
     */
    private sendViaTerminalIPC;
    private sendViaITerm;
    private sendViaTerminalApp;
    private sendViaKitty;
    private sendViaWezTerm;
    private sendViaSystemEvents;
    private keystrokeIntoApp;
    /**
     * Paste text into a System Events app via clipboard (faster for long text).
     */
    private clipboardPasteIntoApp;
    private escapeAppleScript;
    private runAppleScript;
}
//# sourceMappingURL=claude-flow-bridge.d.ts.map