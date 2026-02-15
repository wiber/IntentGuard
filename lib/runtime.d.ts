/**
 * src/runtime.ts — IntentGuard Runtime (Sovereign Engine)
 *
 * The main orchestrator. Wires together:
 *   - OpenClaw gateway (spawned as child process via wrapper.ts)
 *   - Discord.js client (9 cognitive rooms + #trust-debt-public)
 *   - FIM geometric auth (permission checks on every tool call)
 *   - Skills (voice-memo, claude-flow-bridge, thetasteer, llm-controller)
 *   - Transparency engine (public trust-debt reporting)
 *   - Authorized handles (thetaking, mortarcombat = instant execute)
 *
 * USAGE:
 *   npx tsx src/runtime.ts
 *
 * ENV VARS:
 *   DISCORD_BOT_TOKEN      — Discord bot token
 *   DISCORD_APPLICATION_ID — Discord app ID
 *   THETADRIVEN_GUILD_ID   — Discord server ID
 *   ANTHROPIC_API_KEY       — For Claude Sonnet (optional, uses CLI OAuth)
 *   OPENCLAW_GATEWAY_PORT   — Gateway port (default: 18789)
 */
export declare class IntentGuardRuntime {
    private config;
    private client;
    private skills;
    private pendingMemos;
    private logger;
    private context;
    private shellExecutor;
    private channelManager;
    private taskStore;
    private transparencyEngine;
    private handleAuthority;
    private discordHelper;
    private steeringLoop;
    private tweetComposer;
    private xPoster;
    private scheduler;
    private outputCapture;
    private outputPoller;
    private fimInterceptor;
    private lastMessageTime;
    private startTime;
    private currentSovereignty;
    private pidRegistry;
    private static MAX_TRACKED_PIDS;
    constructor();
    start(): Promise<void>;
    /**
     * Get timeout based on sovereignty score.
     * High trust = 5s, Moderate = 30s, Low = 60s.
     */
    private getSovereigntyTimeout;
    /**
     * Load latest sovereignty from pipeline output.
     */
    private loadSovereignty;
    private initFimInterceptor;
    private loadSkills;
    private wireOrchestratorHooks;
    private setupEventHandlers;
    private handleRoomMessage;
    private handleCommand;
    private handleVoiceMemo;
    private handleReaction;
    private callSkill;
    stop(): Promise<void>;
}
//# sourceMappingURL=runtime.d.ts.map