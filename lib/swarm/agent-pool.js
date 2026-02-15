/**
 * src/swarm/agent-pool.ts — Claude Flow Agent Pool (50 concurrent)
 *
 * Manages a pool of up to 50 concurrent Claude agents for task subdivision.
 * Each agent is launched via the swarm-launch-N.sh scripts in the coordination directory.
 *
 * ARCHITECTURE:
 *   - Pool of 50 agent slots (1-50)
 *   - Task queue with priority levels
 *   - File claim coordination to prevent conflicts
 *   - Shared memory JSONL for cross-agent communication
 *   - Automatic retry on failure with exponential backoff
 *
 * TASK SUBDIVISION:
 *   Large tasks are automatically decomposed into subtasks that can run in parallel.
 *   Each subtask is assigned to an available agent from the pool.
 *
 * FILE CLAIMS:
 *   Before assigning work, check ../thetadrivencoach/openclaw/data/coordination/file-claims.json
 *   to ensure no agent is working on conflicting files.
 *
 * USAGE:
 *   const pool = new AgentPool();
 *   await pool.initialize();
 *   const taskId = await pool.submitTask({
 *     description: 'Implement user authentication',
 *     priority: 'high',
 *     files: ['src/auth/login.ts'],
 *   });
 *   const result = await pool.waitForTask(taskId);
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { spawn } from 'child_process';
import { join } from 'path';
// ═══════════════════════════════════════════════════════════════
// Agent Pool Implementation
// ═══════════════════════════════════════════════════════════════
export class AgentPool {
    config;
    agents;
    tasks;
    taskQueue;
    logger;
    healthCheckTimer;
    constructor(config, logger) {
        this.config = {
            poolSize: 50,
            maxRetries: 3,
            taskTimeoutMs: 10 * 60 * 1000, // 10 minutes
            healthCheckIntervalMs: 30 * 1000, // 30 seconds
            coordinationDir: join(process.cwd(), '../thetadrivencoach/openclaw/data/coordination'),
            repoRoot: process.cwd(),
            ...config,
        };
        this.agents = new Map();
        this.tasks = new Map();
        this.taskQueue = [];
        this.logger = logger || {
            debug: (msg) => console.log(`[DEBUG] ${msg}`),
            info: (msg) => console.log(`[INFO] ${msg}`),
            warn: (msg) => console.warn(`[WARN] ${msg}`),
            error: (msg) => console.error(`[ERROR] ${msg}`),
        };
    }
    /**
     * Initialize the agent pool and restore state from coordination directory
     */
    async initialize() {
        this.logger.info(`Initializing agent pool (size=${this.config.poolSize})`);
        // Initialize all agent slots
        for (let i = 1; i <= this.config.poolSize; i++) {
            this.agents.set(i, {
                id: i,
                status: 'idle',
                claimedFiles: [],
                lastHealthCheck: new Date(),
            });
        }
        // Restore state from swarm memory
        await this.restoreStateFromMemory();
        // Start health check timer
        this.startHealthCheck();
        this.logger.info(`Agent pool initialized: ${this.agents.size} agents ready`);
    }
    /**
     * Shutdown the agent pool gracefully
     */
    async shutdown() {
        this.logger.info('Shutting down agent pool...');
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        // Cancel all running tasks
        const runningTasks = Array.from(this.tasks.values()).filter(t => t.status === 'running' || t.status === 'assigned');
        for (const task of runningTasks) {
            await this.cancelTask(task.id);
        }
        // Clear all file claims
        await this.clearAllFileClaims();
        this.logger.info('Agent pool shutdown complete');
    }
    /**
     * Submit a new task to the pool
     */
    async submitTask(params) {
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const task = {
            id: taskId,
            description: params.description,
            priority: params.priority,
            files: params.files,
            prompt: params.prompt,
            status: 'pending',
            submittedAt: new Date(),
            retries: 0,
        };
        this.tasks.set(taskId, task);
        this.taskQueue.push(task);
        // Sort queue by priority
        this.sortQueue();
        this.logger.info(`Task submitted: ${taskId} (${params.priority}, ${params.files.length} files)`);
        // Try to assign immediately
        await this.assignTasks();
        return taskId;
    }
    /**
     * Wait for a task to complete
     */
    async waitForTask(taskId, timeoutMs) {
        const timeout = timeoutMs || this.config.taskTimeoutMs;
        const startTime = Date.now();
        return new Promise((resolve, reject) => {
            const check = () => {
                const task = this.tasks.get(taskId);
                if (!task) {
                    reject(new Error(`Task not found: ${taskId}`));
                    return;
                }
                if (task.status === 'completed') {
                    resolve(task);
                    return;
                }
                if (task.status === 'failed' || task.status === 'cancelled') {
                    reject(new Error(`Task ${task.status}: ${task.error || 'Unknown error'}`));
                    return;
                }
                if (Date.now() - startTime > timeout) {
                    this.cancelTask(taskId);
                    reject(new Error(`Task timeout after ${timeout}ms`));
                    return;
                }
                setTimeout(check, 1000);
            };
            check();
        });
    }
    /**
     * Get task status
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    /**
     * Cancel a running task
     */
    async cancelTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            this.logger.warn(`Task not found for cancellation: ${taskId}`);
            return;
        }
        if (task.agentId) {
            const agent = this.agents.get(task.agentId);
            if (agent) {
                // Release agent and clear file claims
                agent.status = 'idle';
                agent.currentTask = undefined;
                await this.releaseFileClaims(task.agentId);
            }
        }
        task.status = 'cancelled';
        this.logger.info(`Task cancelled: ${taskId}`);
    }
    /**
     * Get pool statistics
     */
    getStats() {
        const agents = Array.from(this.agents.values());
        const tasks = Array.from(this.tasks.values());
        return {
            totalAgents: agents.length,
            idleAgents: agents.filter(a => a.status === 'idle').length,
            busyAgents: agents.filter(a => a.status === 'busy').length,
            failedAgents: agents.filter(a => a.status === 'failed').length,
            pendingTasks: tasks.filter(t => t.status === 'pending').length,
            runningTasks: tasks.filter(t => t.status === 'running' || t.status === 'assigned').length,
            completedTasks: tasks.filter(t => t.status === 'completed').length,
            failedTasks: tasks.filter(t => t.status === 'failed').length,
        };
    }
    // ═══════════════════════════════════════════════════════════════
    // Private Methods
    // ═══════════════════════════════════════════════════════════════
    /**
     * Assign pending tasks to idle agents
     */
    async assignTasks() {
        const idleAgents = Array.from(this.agents.values()).filter(a => a.status === 'idle');
        if (idleAgents.length === 0)
            return;
        const pendingTasks = this.taskQueue.filter(t => t.status === 'pending');
        if (pendingTasks.length === 0)
            return;
        for (const task of pendingTasks) {
            const agent = idleAgents.shift();
            if (!agent)
                break;
            // Check file conflicts
            const hasConflict = await this.hasFileConflict(task.files);
            if (hasConflict) {
                this.logger.warn(`Task ${task.id} has file conflicts, delaying assignment`);
                continue;
            }
            // Assign task to agent
            await this.assignTaskToAgent(task, agent);
        }
    }
    /**
     * Assign a specific task to a specific agent
     */
    async assignTaskToAgent(task, agent) {
        this.logger.info(`Assigning task ${task.id} to agent ${agent.id}`);
        // Update task state
        task.status = 'assigned';
        task.agentId = agent.id;
        task.startedAt = new Date();
        // Update agent state
        agent.status = 'busy';
        agent.currentTask = task.id;
        // Claim files
        await this.claimFiles(agent.id, task.files);
        // Write task prompt to swarm prompt file
        const promptPath = join(this.config.coordinationDir, `swarm-prompt-${agent.id}.txt`);
        writeFileSync(promptPath, task.prompt, 'utf-8');
        // Log to swarm memory
        await this.logToSwarmMemory({
            ts: new Date().toISOString(),
            agent: agent.id,
            group: 'agent-pool',
            event: 'task_assigned',
            task: task.id,
            files: task.files,
        });
        // Launch agent process
        const launched = await this.launchAgent(agent.id);
        if (launched) {
            task.status = 'running';
            this.logger.info(`Agent ${agent.id} launched for task ${task.id}`);
        }
        else {
            task.status = 'failed';
            task.error = 'Failed to launch agent process';
            agent.status = 'failed';
            this.logger.error(`Failed to launch agent ${agent.id} for task ${task.id}`);
        }
        // Remove from queue
        this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
    }
    /**
     * Launch an agent process via swarm-launch-N.sh
     */
    async launchAgent(agentId) {
        const launchScript = join(this.config.coordinationDir, `swarm-launch-${agentId}.sh`);
        if (!existsSync(launchScript)) {
            this.logger.error(`Launch script not found: ${launchScript}`);
            return false;
        }
        return new Promise((resolve) => {
            const child = spawn('bash', [launchScript], {
                cwd: this.config.repoRoot,
                detached: true,
                stdio: 'ignore',
            });
            const agent = this.agents.get(agentId);
            if (agent) {
                agent.processId = child.pid;
            }
            child.on('spawn', () => {
                child.unref();
                resolve(true);
            });
            child.on('error', (err) => {
                this.logger.error(`Agent ${agentId} spawn error: ${err.message}`);
                resolve(false);
            });
            // Don't wait for completion, agent runs independently
            setTimeout(() => resolve(true), 500);
        });
    }
    /**
     * Check if task files conflict with currently claimed files
     */
    async hasFileConflict(files) {
        const claims = await this.readFileClaims();
        for (const file of files) {
            for (const [agentId, claimedFiles] of Object.entries(claims)) {
                if (claimedFiles.includes(file)) {
                    this.logger.debug(`File conflict: ${file} claimed by agent ${agentId}`);
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Claim files for an agent
     */
    async claimFiles(agentId, files) {
        const claims = await this.readFileClaims();
        const agentKey = `agent-${agentId}`;
        claims[agentKey] = files.join(' ');
        const claimsPath = join(this.config.coordinationDir, 'swarm-claims.json');
        writeFileSync(claimsPath, JSON.stringify(claims, null, 2), 'utf-8');
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.claimedFiles = files;
        }
    }
    /**
     * Release file claims for an agent
     */
    async releaseFileClaims(agentId) {
        const claims = await this.readFileClaims();
        const agentKey = `agent-${agentId}`;
        delete claims[agentKey];
        const claimsPath = join(this.config.coordinationDir, 'swarm-claims.json');
        writeFileSync(claimsPath, JSON.stringify(claims, null, 2), 'utf-8');
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.claimedFiles = [];
        }
    }
    /**
     * Clear all file claims
     */
    async clearAllFileClaims() {
        const claimsPath = join(this.config.coordinationDir, 'swarm-claims.json');
        writeFileSync(claimsPath, '{}', 'utf-8');
    }
    /**
     * Read file claims from coordination directory
     */
    async readFileClaims() {
        const claimsPath = join(this.config.coordinationDir, 'swarm-claims.json');
        if (!existsSync(claimsPath)) {
            return {};
        }
        try {
            const content = readFileSync(claimsPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            this.logger.warn(`Failed to read file claims: ${error}`);
            return {};
        }
    }
    /**
     * Log event to swarm memory JSONL
     */
    async logToSwarmMemory(entry) {
        const memoryPath = join(this.config.coordinationDir, 'swarm-memory.jsonl');
        const line = JSON.stringify(entry) + '\n';
        try {
            appendFileSync(memoryPath, line, 'utf-8');
        }
        catch (error) {
            this.logger.warn(`Failed to log to swarm memory: ${error}`);
        }
    }
    /**
     * Restore state from swarm memory on initialization
     */
    async restoreStateFromMemory() {
        const memoryPath = join(this.config.coordinationDir, 'swarm-memory.jsonl');
        if (!existsSync(memoryPath)) {
            this.logger.info('No swarm memory found, starting fresh');
            return;
        }
        try {
            const content = readFileSync(memoryPath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.length > 0);
            // Process last N entries to restore agent states
            const recentEntries = lines.slice(-100).map(line => JSON.parse(line));
            const agentLastEvents = new Map();
            for (const entry of recentEntries) {
                if (entry.agent && entry.group === 'agent-pool') {
                    agentLastEvents.set(entry.agent, entry);
                }
            }
            // Update agent states based on last known events
            for (const [agentId, event] of agentLastEvents) {
                const agent = this.agents.get(agentId);
                if (!agent)
                    continue;
                if (event.event === 'task_assigned' && event.task) {
                    agent.status = 'busy';
                    agent.currentTask = event.task;
                    this.logger.info(`Restored agent ${agentId}: busy with task ${event.task}`);
                }
                else if (event.event === 'done') {
                    agent.status = 'idle';
                    agent.currentTask = undefined;
                }
            }
            this.logger.info(`Restored state from ${recentEntries.length} swarm memory entries`);
        }
        catch (error) {
            this.logger.warn(`Failed to restore from swarm memory: ${error}`);
        }
    }
    /**
     * Sort task queue by priority
     */
    sortQueue() {
        const priorityOrder = {
            critical: 0,
            high: 1,
            normal: 2,
            low: 3,
        };
        this.taskQueue.sort((a, b) => {
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            // Same priority: FIFO
            return a.submittedAt.getTime() - b.submittedAt.getTime();
        });
    }
    /**
     * Start periodic health check
     */
    startHealthCheck() {
        this.healthCheckTimer = setInterval(() => this.performHealthCheck(), this.config.healthCheckIntervalMs);
    }
    /**
     * Perform health check on all agents
     */
    async performHealthCheck() {
        const now = new Date();
        for (const agent of this.agents.values()) {
            agent.lastHealthCheck = now;
            // Check for stuck tasks (running too long)
            if (agent.status === 'busy' && agent.currentTask) {
                const task = this.tasks.get(agent.currentTask);
                if (task && task.startedAt) {
                    const runningTime = now.getTime() - task.startedAt.getTime();
                    if (runningTime > this.config.taskTimeoutMs) {
                        this.logger.warn(`Task ${task.id} on agent ${agent.id} timed out (${runningTime}ms)`);
                        // Mark as failed and retry if under limit
                        task.status = 'failed';
                        task.error = 'Timeout';
                        agent.status = 'idle';
                        agent.currentTask = undefined;
                        await this.releaseFileClaims(agent.id);
                        if (task.retries < this.config.maxRetries) {
                            task.retries++;
                            task.status = 'pending';
                            this.taskQueue.push(task);
                            this.logger.info(`Retrying task ${task.id} (attempt ${task.retries + 1}/${this.config.maxRetries})`);
                        }
                    }
                }
            }
        }
        // Try to assign pending tasks after health check
        await this.assignTasks();
    }
}
// ═══════════════════════════════════════════════════════════════
// Task Subdivision Helper
// ═══════════════════════════════════════════════════════════════
/**
 * Decompose a large task into smaller subtasks based on file analysis
 */
export async function subdivideTask(params) {
    // Simple heuristic-based subdivision
    // In production, this could use LLM-based analysis via Ollama
    const subtasks = [];
    // Group files by directory
    const filesByDir = new Map();
    for (const file of params.targetFiles) {
        const dir = file.split('/').slice(0, -1).join('/') || '.';
        if (!filesByDir.has(dir)) {
            filesByDir.set(dir, []);
        }
        filesByDir.get(dir).push(file);
    }
    // Create subtasks per directory
    for (const [dir, files] of filesByDir) {
        subtasks.push({
            description: `${params.description} - ${dir}`,
            files,
            priority: 'normal',
        });
    }
    // If only one subtask, check if files can be split further
    if (subtasks.length === 1 && params.targetFiles.length > 3) {
        // Split into groups of 3 files max
        const chunks = [];
        for (let i = 0; i < params.targetFiles.length; i += 3) {
            chunks.push(params.targetFiles.slice(i, i + 3));
        }
        return chunks.map((files, idx) => ({
            description: `${params.description} - Part ${idx + 1}`,
            files,
            priority: 'normal',
        }));
    }
    return subtasks;
}
//# sourceMappingURL=agent-pool.js.map