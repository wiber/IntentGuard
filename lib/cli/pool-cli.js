#!/usr/bin/env node
/**
 * src/cli/pool-cli.ts — Agent Pool CLI Management Tool
 *
 * Command-line interface for managing the 50-agent Claude Flow pool.
 *
 * COMMANDS:
 *   pool status              - Show pool statistics
 *   pool submit <task>       - Submit a new task to the pool
 *   pool list                - List all tasks (pending/running/completed)
 *   pool cancel <task-id>    - Cancel a running task
 *   pool suggest             - Suggest parallel task opportunities from spec
 *   pool execute <operation> - Execute parallel operation on multiple files
 *   pool health              - Run health check on all agents
 *   pool clear               - Clear all file claims and reset pool
 *
 * EXAMPLES:
 *   pool status
 *   pool submit "Write tests for auth module" --files src/auth/*.ts --priority high
 *   pool execute implement --files "src/api/*.ts" --description "Add API endpoints"
 *   pool suggest --spec intentguard-migration-spec.html
 */
import { Command } from 'commander';
import { getPoolManager, executeParallel, getPoolStats, suggestParallelTasks, canExecuteParallel, } from '../swarm/pool-integration.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
// ═══════════════════════════════════════════════════════════════
// CLI Setup
// ═══════════════════════════════════════════════════════════════
const program = new Command();
program
    .name('pool')
    .description('Claude Flow Agent Pool Management CLI')
    .version('1.0.0');
// ═══════════════════════════════════════════════════════════════
// Commands
// ═══════════════════════════════════════════════════════════════
program
    .command('status')
    .description('Show agent pool statistics')
    .action(async () => {
    const stats = getPoolStats();
    if (!stats) {
        console.log('⚠️  Agent pool not initialized');
        console.log('Run: pool init');
        return;
    }
    console.log('\n📊 Agent Pool Status\n');
    console.log(`Total Agents:    ${stats.totalAgents}`);
    console.log(`Idle:            ${stats.idleAgents} 🟢`);
    console.log(`Busy:            ${stats.busyAgents} 🔵`);
    console.log(`Failed:          ${stats.failedAgents} 🔴`);
    console.log('');
    console.log(`Pending Tasks:   ${stats.pendingTasks} ⏳`);
    console.log(`Running Tasks:   ${stats.runningTasks} ⚡`);
    console.log(`Completed:       ${stats.completedTasks} ✅`);
    console.log(`Failed:          ${stats.failedTasks} ❌`);
    console.log('');
    const utilization = ((stats.busyAgents / stats.totalAgents) * 100).toFixed(1);
    console.log(`Utilization:     ${utilization}%`);
    console.log('');
});
program
    .command('submit <description>')
    .description('Submit a new task to the pool')
    .option('-f, --files <pattern>', 'File glob pattern (e.g., src/auth/*.ts)')
    .option('-p, --priority <level>', 'Priority: critical|high|normal|low', 'normal')
    .option('--prompt <text>', 'Custom prompt for the task')
    .action(async (description, options) => {
    const manager = getPoolManager();
    if (!manager.isInitialized()) {
        console.log('⚠️  Initializing agent pool...');
        // Create mock context for CLI
        const mockContext = await createMockContext();
        await manager.initialize(mockContext);
    }
    const pool = manager.getPool();
    if (!pool) {
        console.error('❌ Failed to initialize pool');
        process.exit(1);
    }
    // Resolve file pattern
    const files = options.files
        ? await glob(options.files, { cwd: process.cwd() })
        : [];
    if (files.length === 0) {
        console.error('❌ No files matched the pattern');
        process.exit(1);
    }
    console.log(`\n📤 Submitting task: ${description}`);
    console.log(`   Files: ${files.length} files`);
    console.log(`   Priority: ${options.priority}`);
    const prompt = options.prompt || `${description}\n\nTarget files:\n${files.map(f => `- ${f}`).join('\n')}`;
    const taskId = await pool.submitTask({
        description,
        priority: options.priority,
        files,
        prompt,
    });
    console.log(`\n✅ Task submitted: ${taskId}`);
    console.log(`\nCheck status: pool list`);
});
program
    .command('list')
    .description('List all tasks')
    .option('-s, --status <status>', 'Filter by status (pending|running|completed|failed)')
    .action(async (options) => {
    const manager = getPoolManager();
    const pool = manager.getPool();
    if (!pool) {
        console.log('⚠️  Agent pool not initialized');
        return;
    }
    // Access internal task map (would need to expose via getter)
    console.log('\n📋 Task List\n');
    console.log('(Full task listing requires pool API extension)');
});
program
    .command('cancel <task-id>')
    .description('Cancel a running task')
    .action(async (taskId) => {
    const manager = getPoolManager();
    const pool = manager.getPool();
    if (!pool) {
        console.log('⚠️  Agent pool not initialized');
        return;
    }
    console.log(`\n🛑 Cancelling task: ${taskId}...`);
    await pool.cancelTask(taskId);
    console.log('✅ Task cancelled');
});
program
    .command('suggest')
    .description('Suggest parallel task opportunities from spec')
    .option('-s, --spec <file>', 'Spec file path', 'intentguard-migration-spec.html')
    .action(async (options) => {
    const specPath = join(process.cwd(), options.spec);
    if (!existsSync(specPath)) {
        console.error(`❌ Spec file not found: ${specPath}`);
        process.exit(1);
    }
    console.log(`\n🔍 Analyzing spec: ${options.spec}\n`);
    const suggestions = await suggestParallelTasks(specPath, process.cwd());
    if (suggestions.length === 0) {
        console.log('No parallel task opportunities found.');
        return;
    }
    console.log(`Found ${suggestions.length} parallel task opportunities:\n`);
    for (let i = 0; i < suggestions.length; i++) {
        const suggestion = suggestions[i];
        console.log(`${i + 1}. ${suggestion.operation.toUpperCase()}: ${suggestion.description}`);
        console.log(`   Files: ${suggestion.targetFiles.length} files`);
        console.log(`   Priority: ${suggestion.priority}`);
        console.log('');
    }
});
program
    .command('execute <operation>')
    .description('Execute parallel operation on multiple files')
    .requiredOption('-f, --files <pattern>', 'File glob pattern')
    .requiredOption('-d, --description <text>', 'Task description')
    .option('-p, --priority <level>', 'Priority level', 'normal')
    .option('-c, --concurrency <num>', 'Max concurrent agents', '50')
    .option('--sovereignty <score>', 'Current sovereignty score', '0.8')
    .action(async (operation, options) => {
    const validOperations = ['implement', 'test', 'document', 'refactor', 'analyze'];
    if (!validOperations.includes(operation)) {
        console.error(`❌ Invalid operation: ${operation}`);
        console.error(`Valid operations: ${validOperations.join(', ')}`);
        process.exit(1);
    }
    const manager = getPoolManager();
    if (!manager.isInitialized()) {
        console.log('⚠️  Initializing agent pool...');
        const mockContext = await createMockContext();
        await manager.initialize(mockContext);
    }
    const files = await glob(options.files, { cwd: process.cwd() });
    if (files.length === 0) {
        console.error('❌ No files matched the pattern');
        process.exit(1);
    }
    const sovereignty = parseFloat(options.sovereignty);
    const maxConcurrency = parseInt(options.concurrency, 10);
    const request = {
        description: options.description,
        targetFiles: files,
        operation: operation,
        priority: options.priority,
        maxConcurrency,
    };
    // Check if allowed
    const check = canExecuteParallel(request.operation, sovereignty, manager.isInitialized());
    if (!check.allowed) {
        console.error(`❌ Cannot execute: ${check.reason}`);
        process.exit(1);
    }
    console.log(`\n⚡ Executing parallel ${operation.toUpperCase()}`);
    console.log(`   Description: ${options.description}`);
    console.log(`   Files: ${files.length} files`);
    console.log(`   Concurrency: ${maxConcurrency}`);
    console.log(`   Sovereignty: ${sovereignty.toFixed(2)}`);
    console.log('');
    const mockContext = await createMockContext();
    try {
        const result = await executeParallel(request, mockContext, sovereignty);
        console.log('\n📊 Results\n');
        console.log(`Subtasks:        ${result.subtasks.length}`);
        console.log(`Completed:       ${result.completedCount} ✅`);
        console.log(`Failed:          ${result.failedCount} ❌`);
        console.log(`Duration:        ${(result.totalDurationMs / 1000).toFixed(1)}s`);
        console.log(`Success Rate:    ${((result.completedCount / result.subtasks.length) * 100).toFixed(1)}%`);
        console.log('');
        if (result.allSucceeded) {
            console.log('✅ All tasks completed successfully!');
        }
        else {
            console.log('⚠️  Some tasks failed. Check logs for details.');
        }
    }
    catch (error) {
        console.error(`❌ Execution failed: ${error}`);
        process.exit(1);
    }
});
program
    .command('health')
    .description('Run health check on all agents')
    .action(async () => {
    console.log('\n🔍 Running health check...\n');
    console.log('(Health check implementation pending)');
});
program
    .command('clear')
    .description('Clear all file claims and reset pool')
    .action(async () => {
    const manager = getPoolManager();
    const pool = manager.getPool();
    if (!pool) {
        console.log('⚠️  Agent pool not initialized');
        return;
    }
    console.log('\n🧹 Clearing file claims and resetting pool...');
    await pool.shutdown();
    console.log('✅ Pool reset complete');
});
program
    .command('init')
    .description('Initialize the agent pool')
    .action(async () => {
    const manager = getPoolManager();
    if (manager.isInitialized()) {
        console.log('✅ Agent pool already initialized');
        return;
    }
    console.log('\n🚀 Initializing agent pool...\n');
    const mockContext = await createMockContext();
    await manager.initialize(mockContext);
    console.log('✅ Agent pool initialized successfully');
    const stats = getPoolStats();
    if (stats) {
        console.log(`\n   Agents: ${stats.totalAgents}`);
        console.log(`   Ready: ${stats.idleAgents} 🟢`);
    }
});
// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
async function createMockContext() {
    const { default: ConfigManager } = await import('../config.js');
    const config = new ConfigManager();
    await config.load();
    return {
        config,
        log: {
            debug: (msg) => console.log(`[DEBUG] ${msg}`),
            info: (msg) => console.log(`[INFO] ${msg}`),
            warn: (msg) => console.warn(`[WARN] ${msg}`),
            error: (msg) => console.error(`[ERROR] ${msg}`),
        },
        fs: {
            read: async (path) => readFileSync(path, 'utf-8'),
            write: async (path, content) => {
                const { writeFileSync } = await import('fs');
                writeFileSync(path, content, 'utf-8');
            },
        },
        shell: {
            exec: async (cmd) => {
                const { exec } = await import('child_process');
                return new Promise((resolve) => {
                    exec(cmd, (error, stdout, stderr) => {
                        resolve({
                            stdout: stdout || '',
                            stderr: stderr || '',
                            code: error ? 1 : 0,
                        });
                    });
                });
            },
        },
        http: {
            get: async () => ({}),
            post: async () => ({}),
        },
        callSkill: async () => ({ success: true, message: '' }),
    };
}
// ═══════════════════════════════════════════════════════════════
// Execute CLI
// ═══════════════════════════════════════════════════════════════
program.parse();
//# sourceMappingURL=pool-cli.js.map