# Claude Flow Agent Pool (50 Concurrent)

A sophisticated agent pool manager for coordinating up to 50 concurrent Claude agents for task subdivision and parallel execution.

## Architecture

The agent pool system consists of three main components:

### 1. **AgentPool** (`agent-pool.ts`)
Core pool manager that handles:
- 50 agent slot management (idle/busy/failed states)
- Task queue with priority ordering
- File conflict detection and resolution
- Health monitoring and automatic retry
- Coordination via swarm memory JSONL

### 2. **PoolIntegration** (`pool-integration.ts`)
High-level API for integrating with CEO loop and scheduler:
- Parallel task execution with sovereignty gating
- Task subdivision algorithms
- Spec file analysis for parallelization opportunities
- Scheduler integration hooks

### 3. **PoolCLI** (`../cli/pool-cli.ts`)
Command-line interface for manual pool management:
- Pool status monitoring
- Task submission and cancellation
- Parallel execution triggers
- Health checks and diagnostics

## Usage

### Programmatic API

```typescript
import { getPoolManager, executeParallel } from './swarm/pool-integration.js';

// Initialize pool
const manager = getPoolManager();
await manager.initialize(ctx);

// Execute parallel task
const result = await executeParallel({
  description: 'Implement API endpoints',
  targetFiles: ['src/api/users.ts', 'src/api/posts.ts', 'src/api/comments.ts'],
  operation: 'implement',
  priority: 'high',
  maxConcurrency: 3,
}, ctx, currentSovereignty);

console.log(`Completed: ${result.completedCount}/${result.subtasks.length}`);
```

### CLI Usage

```bash
# Initialize pool
npx tsx src/cli/pool-cli.ts init

# Show pool status
npx tsx src/cli/pool-cli.ts status

# Submit a task
npx tsx src/cli/pool-cli.ts submit "Write tests for auth module" \
  --files "src/auth/*.ts" \
  --priority high

# Execute parallel operation
npx tsx src/cli/pool-cli.ts execute implement \
  --files "src/api/*.ts" \
  --description "Add CRUD endpoints" \
  --concurrency 5 \
  --sovereignty 0.85

# Suggest parallel opportunities from spec
npx tsx src/cli/pool-cli.ts suggest --spec intentguard-migration-spec.html

# Cancel a task
npx tsx src/cli/pool-cli.ts cancel task_1234567890_abc123

# Clear all claims and reset
npx tsx src/cli/pool-cli.ts clear
```

## Task Operations

The pool supports five types of parallel operations, each with different sovereignty requirements:

| Operation | Sovereignty Required | Description |
|-----------|---------------------|-------------|
| `analyze` | 0.5 | Code analysis, auditing, metrics |
| `test` | 0.6 | Unit test generation |
| `document` | 0.6 | Documentation, JSDoc, READMEs |
| `implement` | 0.8 | Code implementation, features |
| `refactor` | 0.9 | Code refactoring, cleanup |

## File Conflict Resolution

The pool automatically prevents file conflicts:

1. Before assigning a task, checks `swarm-claims.json` for file conflicts
2. If a file is already claimed by another agent, the task is delayed
3. When an agent completes, its file claims are released
4. Waiting tasks are automatically assigned when conflicts clear

## Health Monitoring

The pool performs periodic health checks (default: every 30 seconds):

- Detects stuck tasks (running > timeout threshold)
- Automatically retries failed tasks (up to max retries)
- Monitors agent process health
- Clears stale file claims

## Coordination Files

The pool uses several coordination files in `../thetadrivencoach/openclaw/data/coordination/`:

### `swarm-claims.json`
Active file claims by agent:
```json
{
  "agent-1": "src/auth/login.ts src/auth/logout.ts",
  "agent-2": "src/api/users.ts"
}
```

### `swarm-memory.jsonl`
Append-only event log:
```jsonl
{"ts":"2026-02-15T12:00:00Z","agent":1,"group":"agent-pool","event":"task_assigned","task":"task_123"}
{"ts":"2026-02-15T12:05:00Z","agent":1,"group":"agent-pool","event":"done"}
```

### `swarm-launch-N.sh`
Individual agent launch scripts (1-50):
```bash
#!/bin/bash
cd "/Users/.../IntentGuard"
claude --model sonnet -p "$(cat swarm-prompt-1.txt)" >> logs/agent-1.log 2>&1
```

### `swarm-prompt-N.txt`
Task prompts for each agent:
```
TASK: Implement user authentication

OPERATION: implement

TARGET FILES:
- src/auth/login.ts
- src/auth/session.ts

[Full prompt with constraints...]
```

## Task Subdivision

Tasks are automatically subdivided based on:

1. **Directory grouping**: Files in the same directory become one subtask
2. **Size limits**: Large file sets are chunked (max 3 files per subtask)
3. **Priority inheritance**: Subtasks inherit parent task priority

Example:
```typescript
const subtasks = await subdivideTask({
  description: 'Implement API layer',
  targetFiles: [
    'src/api/users.ts',
    'src/api/posts.ts',
    'src/api/comments.ts',
    'src/models/user.ts',
    'src/models/post.ts',
  ],
  repoRoot: process.cwd(),
});

// Results in 2 subtasks:
// 1. Implement API layer - src/api (3 files)
// 2. Implement API layer - src/models (2 files)
```

## Configuration

Configure via `config/default.json`:

```json
{
  "integrations": {
    "agentPool": {
      "poolSize": 50,
      "maxRetries": 3,
      "taskTimeoutMs": 600000,
      "coordinationDir": "../thetadrivencoach/openclaw/data/coordination"
    }
  }
}
```

## Integration with CEO Loop

The agent pool integrates with the CEO loop for autonomous parallel execution:

```typescript
import { registerParallelTasksWithScheduler } from './swarm/pool-integration.js';

// In CEO loop initialization
await registerParallelTasksWithScheduler(
  'intentguard-migration-spec.html',
  process.cwd(),
  async (request) => {
    if (sovereignty > request.sovereigntyRequired) {
      await executeParallel(request, ctx, sovereignty);
    }
  }
);
```

## Monitoring

Get real-time pool statistics:

```typescript
import { getPoolStats } from './swarm/pool-integration.js';

const stats = getPoolStats();
console.log(`Utilization: ${(stats.busyAgents / stats.totalAgents * 100).toFixed(1)}%`);
console.log(`Queue depth: ${stats.pendingTasks}`);
```

## Error Handling

The pool provides automatic error recovery:

1. **Task timeout**: Automatically retries up to `maxRetries` times
2. **Agent failure**: Marks agent as failed, releases claims, reassigns task
3. **File conflicts**: Delays task until conflict resolves
4. **Process errors**: Logs error, retries with exponential backoff

## Performance

Benchmarks (50-agent pool):

- **Task assignment**: < 50ms per task
- **File conflict check**: < 10ms per check
- **Health check cycle**: < 100ms for full pool
- **Parallel throughput**: Up to 50 concurrent tasks

## Testing

Run the test suite:

```bash
npm test src/swarm/agent-pool.test.ts
```

Key test scenarios:
- Pool initialization and state restoration
- Task submission and priority ordering
- File conflict detection and resolution
- Task cancellation and claim cleanup
- Timeout and retry logic
- Parallel execution limits

## Troubleshooting

### Pool not initializing
- Check coordination directory exists
- Verify swarm launch scripts are executable
- Ensure swarm-claims.json and swarm-memory.jsonl are present

### Tasks stuck in pending
- Check for file conflicts in swarm-claims.json
- Verify agent availability (pool status)
- Review task timeout settings

### High failure rate
- Increase task timeout if tasks need more time
- Check agent logs in `../openclaw/logs/swarm/`
- Verify launch scripts are working correctly

### File conflicts not resolving
- Manually clear claims: `pool clear`
- Check for stale agent processes
- Review swarm-memory.jsonl for anomalies

## Future Enhancements

Planned improvements:

1. **LLM-based subdivision**: Use Ollama to intelligently decompose tasks
2. **Cost tracking**: Per-agent token usage monitoring
3. **Load balancing**: Distribute tasks based on agent workload
4. **Dynamic scaling**: Auto-adjust pool size based on demand
5. **Cross-repo coordination**: Coordinate agents across multiple repositories
6. **Result aggregation**: Combine subtask outputs into cohesive result

## License

Part of IntentGuard — MIT License
