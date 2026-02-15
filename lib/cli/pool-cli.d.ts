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
export {};
//# sourceMappingURL=pool-cli.d.ts.map