/**
 * src/types.ts — IntentGuard Shared Types
 *
 * Ported from thetadrivencoach/openclaw/src/types.ts
 * Extended with transparency engine and authorized handles.
 */
export interface SkillContext {
    config: ConfigHelper;
    log: Logger;
    fs: FileSystem;
    http: HttpClient;
    shell: ShellExecutor;
    discord?: DiscordHelper;
    callSkill: (name: string, payload: unknown) => Promise<SkillResult>;
}
export interface SkillResult {
    success: boolean;
    message: string;
    data?: unknown;
}
export interface AgentSkill {
    name: string;
    description: string;
    initialize?: (ctx: SkillContext) => Promise<void>;
    execute?: (command: unknown, ctx: SkillContext) => Promise<SkillResult>;
    onVoiceMemo?: (memo: VoiceMemoEvent, ctx: SkillContext) => Promise<SkillResult>;
    onReaction?: (reaction: ReactionEvent, ctx: SkillContext) => Promise<SkillResult>;
    categorize?: (text: string, ctx: SkillContext) => Promise<SkillResult>;
    train?: (signal: unknown, ctx: SkillContext) => Promise<SkillResult>;
}
export interface VoiceMemoEvent {
    messageId: string;
    channelId: string;
    guildId: string;
    audioUrl: string;
    duration: number;
    author: {
        id: string;
        username: string;
    };
}
export interface ReactionEvent {
    messageId: string;
    emoji: string;
    userId: string;
    timestamp: Date;
}
export interface ConfigHelper {
    get(path: string): unknown;
}
export interface Logger {
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}
export interface FileSystem {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
}
export interface HttpClient {
    post(url: string, body: unknown, options?: {
        headers?: Record<string, string>;
    }): Promise<unknown>;
    get(url: string, options?: {
        headers?: Record<string, string>;
    }): Promise<unknown>;
}
export interface ShellExecutor {
    exec(command: string): Promise<{
        stdout: string;
        stderr: string;
        code: number;
    }>;
}
export interface DiscordHelper {
    reply(messageId: string, options: {
        content: string;
    }): Promise<void>;
    sendToChannel?(channelId: string, content: string): Promise<string | null>;
    editMessage?(channelId: string, messageId: string, content: string): Promise<void>;
    sendFile?(channelId: string, content: string, filename: string): Promise<void>;
}
export type TaskStatus = 'pending' | 'dispatched' | 'running' | 'complete' | 'failed' | 'timeout' | 'killed';
export interface OrchestratorTask {
    id: string;
    room: string;
    channelId: string;
    prompt: string;
    status: TaskStatus;
    output: string;
    baseline: string;
    createdAt: string;
    dispatchedAt?: string;
    completedAt?: string;
    discordMessageId?: string;
    lastOutputAt?: string;
    lastOutputLength: number;
}
export interface OrchestratorConfig {
    enabled: boolean;
    channelCategory: string;
    pollIntervalMs: number;
    taskTimeoutMs: number;
    stabilizationMs: number;
}
export type IpcMethod = 'iterm' | 'terminal' | 'kitty' | 'wezterm' | 'system-events';
export interface TerminalEntry {
    room: string;
    emoji: string;
    app: string;
    processName: string;
    ipc: IpcMethod;
    windowHint: string;
}
/** Authorized Discord handles — messages from these are executed instantly */
export interface AuthorizedHandle {
    username: string;
    discordId?: string;
    policy: 'instant-execute' | 'confirm-first' | 'read-only';
    rooms: string[] | 'all';
}
/** Trust-debt spike event for transparency engine */
export interface TrustDebtSpike {
    timestamp: string;
    category: string;
    delta: number;
    previousScore: number;
    newScore: number;
    source: string;
    details: string;
}
/** Transparency engine config */
export interface TransparencyConfig {
    enabled: boolean;
    publicChannelName: string;
    spikeThreshold: number;
    reportIntervalMs: number;
    autoPost: boolean;
}
//# sourceMappingURL=types.d.ts.map