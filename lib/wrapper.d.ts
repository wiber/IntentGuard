/**
 * src/wrapper.ts — IntentGuard Sovereign Engine (Unified Entry Point)
 *
 * The "Cortex" that wraps OpenClaw as a "Body."
 *
 * ARCHITECTURE:
 *   IntentGuard (this process) = Parent / Cortex
 *     ├─ spawns OpenClaw gateway (child process at ws://127.0.0.1:18789)
 *     ├─ connects via WebSocket as "parasite" hook
 *     ├─ installs FIM auth plugin for tool call interception
 *     ├─ registers custom skills into OpenClaw workspace
 *     └─ wires 3-tier LLM grounding:
 *        Tier 0: Ollama (local, fast categorization)
 *        Tier 1: Claude Sonnet (API, complex reasoning)
 *        Tier 2: Human (Discord admin blessing)
 *
 * WHY THIS EXISTS:
 *   OpenClaw has the dashboard, channels, and agent orchestration.
 *   IntentGuard has the FIM auth, trust-debt, sovereignty, and skills.
 *   This wrapper connects the brain (IntentGuard) to the body (OpenClaw).
 *
 * USAGE:
 *   npx tsx src/wrapper.ts                  # Start unified system
 *   npx tsx src/wrapper.ts --no-fim         # Skip FIM plugin
 *   npx tsx src/wrapper.ts --no-gateway     # Connect to existing gateway
 */
export {};
//# sourceMappingURL=wrapper.d.ts.map