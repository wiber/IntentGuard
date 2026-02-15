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
// Regex patterns that indicate a shell prompt (command finished)
const PROMPT_PATTERNS = [
    /\$\s*$/m, // bash $ prompt
    /❯\s*$/m, // starship ❯
    /➜\s*$/m, // oh-my-zsh ➜
    />\s*$/m, // generic >
    /\(base\)\s*[\$#>]\s*$/m, // conda (base) $
    /%\s*$/m, // zsh %
];
const DISCORD_MAX_LENGTH = 1900; // Leave room for formatting
export class OutputPoller {
    log;
    taskStore;
    outputCapture;
    channelManager;
    discord;
    config;
    interval = null;
    polling = false;
    constructor(log, taskStore, outputCapture, channelManager, discord, config) {
        this.log = log;
        this.taskStore = taskStore;
        this.outputCapture = outputCapture;
        this.channelManager = channelManager;
        this.discord = discord;
        this.config = config;
    }
    /**
     * Start the background polling loop.
     */
    start() {
        if (this.interval)
            return;
        this.log.info(`Output poller started (${this.config.pollIntervalMs}ms interval)`);
        this.interval = setInterval(() => this.poll(), this.config.pollIntervalMs);
    }
    /**
     * Stop the polling loop.
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            this.log.info('Output poller stopped');
        }
    }
    /**
     * Single poll iteration. Checks all active tasks.
     */
    async poll() {
        if (this.polling)
            return; // Prevent overlapping polls
        this.polling = true;
        try {
            const activeTasks = this.taskStore.getByStatus('dispatched', 'running');
            for (const task of activeTasks) {
                await this.pollTask(task);
            }
        }
        catch (err) {
            this.log.error(`Poller error: ${err}`);
        }
        finally {
            this.polling = false;
        }
    }
    /**
     * Poll a single task for output changes.
     */
    async pollTask(task) {
        const now = Date.now();
        const created = new Date(task.createdAt).getTime();
        const age = now - created;
        // Check timeout
        if (age > this.config.taskTimeoutMs) {
            this.log.warn(`Task ${task.id} timed out after ${Math.round(age / 1000)}s`);
            this.taskStore.updateStatus(task.id, 'timeout');
            await this.postOutput(task, 'timeout');
            return;
        }
        // Capture output
        const captured = await this.outputCapture.captureWithDelta(task.room, task.baseline);
        if (captured.delta && captured.delta.length > 0) {
            // New output detected
            this.taskStore.appendOutput(task.id, captured.delta);
            // Update baseline to current content for next poll
            this.taskStore.setBaseline(task.id, captured.content);
            if (task.status === 'dispatched') {
                this.taskStore.updateStatus(task.id, 'running');
            }
            this.log.info(`Task ${task.id} [${task.room}]: +${captured.delta.length} chars (total: ${task.output.length + captured.delta.length})`);
        }
        // Check stabilization (no new output for stabilizationMs)
        if (task.status === 'running' && task.lastOutputAt) {
            const lastOutput = new Date(task.lastOutputAt).getTime();
            const stableFor = now - lastOutput;
            if (stableFor >= this.config.stabilizationMs) {
                // Check if output ends with a shell prompt
                const hasPrompt = PROMPT_PATTERNS.some((p) => p.test(task.output));
                if (hasPrompt || stableFor >= this.config.stabilizationMs * 2) {
                    this.log.info(`Task ${task.id} stabilized (${Math.round(stableFor / 1000)}s, prompt: ${hasPrompt})`);
                    this.taskStore.updateStatus(task.id, 'complete');
                    this.channelManager.updateRoomContext(task.room, task.output);
                    await this.postOutput(task, 'complete');
                }
            }
        }
    }
    /**
     * Post task output to its Discord channel.
     */
    async postOutput(task, reason) {
        const channelId = task.channelId;
        if (!channelId || !this.discord.sendToChannel)
            return;
        const statusEmoji = reason === 'complete' ? '✅' : reason === 'timeout' ? '⏰' : '🛑';
        const header = `${statusEmoji} **Task ${task.id}** — ${reason}\n`;
        const output = task.output.trim();
        if (!output) {
            await this.discord.sendToChannel(channelId, `${header}_(no output captured)_`);
            return;
        }
        if (output.length <= DISCORD_MAX_LENGTH) {
            await this.discord.sendToChannel(channelId, `${header}\`\`\`\n${output}\n\`\`\``);
        }
        else {
            // Send as file attachment for long output
            await this.discord.sendToChannel(channelId, `${header}_(output: ${output.length} chars, see attachment)_`);
            if (this.discord.sendFile) {
                await this.discord.sendFile(channelId, output, `task-${task.id}-output.txt`);
            }
        }
    }
}
//# sourceMappingURL=output-poller.js.map