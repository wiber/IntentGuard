/**
 * Output Poller — Ported from thetadrivencoach/openclaw/src/output-poller.ts
 *
 * Background polling loop that:
 *   1. Polls all active tasks for new terminal output
 *   2. Detects stabilization (no new output for N seconds)
 *   3. Posts output to the task's Discord channel
 *   4. Handles timeout (120s default)
 *   5. Chunks output >2000 chars into file attachments
 *
 * Shell prompt detection regex to identify when a command has finished.
 */
import type { OrchestratorConfig, Logger, DiscordHelper } from '../types.js';
import type { TaskStore } from './task-store.js';
import type { OutputCapture } from './output-capture.js';
import type { ChannelManager } from './channel-manager.js';
export declare class OutputPoller {
    private log;
    private taskStore;
    private outputCapture;
    private channelManager;
    private discord;
    private config;
    private interval;
    private polling;
    constructor(log: Logger, taskStore: TaskStore, outputCapture: OutputCapture, channelManager: ChannelManager, discord: DiscordHelper, config: OrchestratorConfig);
    /**
     * Start the background polling loop.
     */
    start(): void;
    /**
     * Stop the polling loop.
     */
    stop(): void;
    /**
     * Single poll iteration. Checks all active tasks.
     */
    private poll;
    /**
     * Poll a single task for output changes.
     */
    private pollTask;
    /**
     * Post task output to its Discord channel.
     */
    private postOutput;
}
//# sourceMappingURL=output-poller.d.ts.map