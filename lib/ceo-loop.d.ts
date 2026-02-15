/**
 * src/ceo-loop.ts — Always-On Autonomous CEO Loop v2
 *
 * NEVER STOPS. Runs all night. Makes progress while you sleep.
 *
 * MODES:
 *   Active — picking todos, dispatching Claude Flow agents, implementing
 *   Idle   — all todos done, watching spec for changes every 60s, heartbeat to Discord
 *
 * LOOP:
 *   1. Read spec → find actionable todos (non-future, not failed, not blocked)
 *   2. Score by priority (urgency × impact × dependency-free)
 *   3. Subdivide if too vague → create 3-5 concrete subtasks in spec
 *   4. Dispatch via Claude Flow agent pool (up to 5 concurrent)
 *   5. On completion: mark done, auto-commit, tweet ShortRank, pivotal Q+A
 *   6. On failure: skip, record, tweet failure, move on (circuit breaker at 3 consecutive)
 *   7. Idle watch: scan spec every 60s, heartbeat every 5 min
 *   8. Nightly summary at midnight: what was accomplished
 *
 * DISPATCH:
 *   - Claude Flow MCP (agent_spawn + task_create) first
 *   - Direct shell for tests/benchmarks
 *   - Inline file operations for simple tasks
 *   - NEVER spawns claude -p inside Claude Code
 */
export {};
//# sourceMappingURL=ceo-loop.d.ts.map