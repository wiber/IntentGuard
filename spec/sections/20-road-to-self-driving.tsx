/**
 * 20-road-to-self-driving.tsx — Road to Full Practical Self-Driving
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Green/yellow/red status of all systems needed for 24/7 autonomy.
 * DEPENDS ON: 16-openclaw-integration, 17-night-shift
 * EDITED BY: Architect or Operator agent
 */

export const SECTION_ID = '20-road-to-self-driving';
export const SECTION_TITLE = 'Road to Full Practical Self-Driving';

export const definition = '"Full practical self-driving" means the bot operates 24/7 with zero human intervention for routine tasks, sovereignty-gated autonomy for risky tasks, and voice memo steering for strategic pivots. The human CEO checks Discord once per morning.';

export interface SystemStatus {
  name: string;
  description: string;
  source: string;
  status: 'green' | 'yellow' | 'red';
  blocker?: string;
  fix?: string;
  modifyFiles?: string;
}

export const greenSystems: SystemStatus[] = [
  { name: 'Voice Memo → Terminal Dispatch', description: '14-step pipeline: Discord attachment → Whisper → ThetaSteer → model routing → background Claude CLI → output capture → Discord reply. Fully autonomous after reaction trigger.', source: '../intentguard/src/skills/voice-memo-reactor.ts + ../thetadrivencoach/openclaw/src/runtime.ts', status: 'green' },
  { name: 'Text → Room Dispatch', description: '5-step: message in room channel → categorize → dispatch → poll → post output. STDIN mode for running tasks.', source: '../thetadrivencoach/openclaw/src/runtime.ts:601-657', status: 'green' },
  { name: '9 Cognitive Rooms', description: 'Builder, Architect, Operator, Vault, Voice, Laboratory, Performer, Network, Navigator. Each with sees/ignores/handoff rules.', source: '../thetadrivencoach/openclaw/src/channel-manager.ts', status: 'green' },
  { name: 'ThetaSteer Categorization', description: '12x12 tesseract grid, confidence tiers (GREEN/RED/BLUE), hardness 1-5, model routing. Cascading backends: daemon → ollama → API.', source: '../intentguard/src/skills/thetasteer-categorize.ts (382 LOC)', status: 'green' },
  { name: 'Trust-Debt Pipeline (8 Steps)', description: 'Outcome requirements → keywords → categories → presence matrix → grades → timeline → narratives → audit. Queen orchestrator.', source: '../intentguard/src/pipeline/runner.ts + step-0.ts through step-7.ts', status: 'green' },
  { name: 'Attention Corpus Training', description: 'Every voice memo + text message feeds into heat map. Emoji-weighted confidence scoring. Supabase pointers for high-confidence entries.', source: '../intentguard/src/skills/tesseract-trainer.ts (317 LOC)', status: 'green' },
];

export const yellowSystems: SystemStatus[] = [
  { name: 'CEO Loop', description: 'Always-on autonomous loop: scan spec → find todos → score priority → dispatch Claude Flow agents → auto-commit → tweet. 15s cooldown, 5 concurrent max, circuit breaker at 3 failures.', source: '../intentguard/src/ceo-loop.ts (750+ LOC)', status: 'yellow', blocker: 'Needs .env filled + Discord round-trip tested' },
  { name: 'Night Shift Scheduler', description: 'Ghost User that injects synthetic prompts when system is quiet. Safe tasks (tests, reports, dead link scans) auto-execute if sovereignty > 0.6. Dangerous tasks need admin blessing.', source: '../intentguard/src/cron/scheduler.ts', status: 'yellow', blocker: 'CEO Loop must be running first' },
  { name: 'FIM Geometric Auth', description: '20-dimensional identity vector, computeOverlap(), action requirement map, sovereignty scoring from pipeline step 4. Default action thresholds defined.', source: '../intentguard/src/auth/geometric.ts', status: 'yellow', blocker: 'Needs integration test — proxy intercepts tool call, checks FIM, forwards' },
  { name: 'Steering Loop (Ask-and-Predict)', description: 'Three tiers: Admin (instant), Trusted (30s countdown), General (suggestion only). Voice memo redirect aborts + replans. Conflict logged to #vault.', source: '../intentguard/src/discord/steering-loop.ts', status: 'yellow', blocker: 'Needs authorized-handles.ts wired + Discord gateway intent' },
  { name: 'Federation Handshake', description: 'Two bots exchange identity vectors, compute cosine similarity, accept if overlap >= 0.8. Registry tracks federated bots with periodic drift checks.', source: '../intentguard/src/federation/handshake.ts + tensor-overlap.ts + registry.ts', status: 'yellow', blocker: 'No second bot to federate with yet' },
  { name: 'Tesseract Grid Client', description: 'HTTP client for tesseract.nu API. Fetches grid state (cell pressures), pushes pointer events (bot actions → grid updates).', source: '../intentguard/src/grid/tesseract-client.ts + hot-cell-router.ts + ascii-renderer.ts', status: 'yellow', blocker: 'tesseract.nu API not yet deployed' },
];

export const redSystems: SystemStatus[] = [
  { name: 'Graceful Shutdown + PID Tracking', description: 'Background Claude CLI processes survive parent death. No process.on(\'exit\') handler. Child PIDs not tracked in task store. ISS-04.', source: '', status: 'red', fix: 'Add PID field to OrchestratorTask. process.on(\'exit\', killAllChildren). Track in JSONL.', modifyFiles: '../thetadrivencoach/openclaw/src/task-store.ts + ../thetadrivencoach/openclaw/src/runtime.ts' },
  { name: 'Discord Rate Limiter', description: 'No rate limiting on message posting. Swarm output bursts will hit 429. ISS-05.', source: '', status: 'red', fix: 'Token bucket with exponential backoff. discord.js built-in handles most, but custom posting (output-poller, ceo-loop) needs manual throttle.', modifyFiles: 'New file: ../intentguard/src/discord/rate-limiter.ts' },
  { name: 'launchd Daemon (Always-On)', description: 'No process supervisor. If IntentGuard crashes at 3am, it stays dead until morning. Mac Mini needs KeepAlive + RunAtLoad.', source: '', status: 'red', fix: 'Write com.intentguard.sovereign-engine.plist → ~/Library/LaunchAgents/. KeepAlive=true, RunAtLoad=true, StandardOutPath=logs/.', modifyFiles: 'New file: ../intentguard/scripts/install-daemon.sh + ../intentguard/config/launchd.plist' },
  { name: 'Reconnection Logic', description: 'Discord gateway disconnects are not handled. WebSocket to OpenClaw has no reconnect. WiFi blip = dead bot.', source: '', status: 'red', fix: 'discord.js has built-in reconnect. OpenClaw WS needs manual reconnect with exponential backoff (1s, 2s, 4s, 8s, max 60s).', modifyFiles: '../intentguard/src/wrapper.ts (WS reconnect) + ../intentguard/src/runtime.ts (Discord reconnect)' },
  { name: 'Cost Guard', description: 'No spending cap. CEO loop + night shift can burn unlimited Anthropic API credits overnight. Need daily/hourly budget with auto-throttle.', source: '', status: 'red', fix: 'cost-reporter.ts exists but not wired to enforcement. Add daily budget config, auto-switch to ollama when budget exceeded.', modifyFiles: '../intentguard/src/skills/cost-reporter.ts + ../intentguard/src/skills/llm-controller.ts' },
];

export interface ActivationStep {
  step: number;
  description: string;
}

export const activationSequence: ActivationStep[] = [
  { step: 1, description: 'Fill .env and test Discord round-trip — Bot joins server, creates 9 room channels, responds to !ping. Takes 30 minutes.' },
  { step: 2, description: 'brew install ffmpeg — Unblocks local Whisper transcription. Saves $0.003/call on every voice memo. ISS-01.' },
  { step: 3, description: 'Wire CEO loop to runtime.ts — Import ceo-loop.ts, call startCeoLoop() after Discord ready event. Reads spec, finds todos, dispatches agents.' },
  { step: 4, description: 'Wire night shift scheduler — Import scheduler.ts, inject into SteeringLoop. Ghost User generates safe tasks when system idle > 5 minutes.' },
  { step: 5, description: 'Integration test FIM proxy — Verify: tool call → geometric.ts overlap check → allow/deny → audit log. One passing test = green light.' },
  { step: 6, description: 'Install launchd daemon — Run scripts/install-daemon.sh. Verify: kill process → launchd restarts within 10s. KeepAlive proven.' },
  { step: 7, description: 'Add cost guard — Set daily budget ($5 default). Auto-fallback to ollama when budget exceeded. Test: burn $5 in test mode, verify throttle kicks in.' },
  { step: 8, description: '24h soak test — Run for 24 hours. Review: sovereignty stability, task completion rate, cost, Discord rate limit hits, crash count. Green if: 0 crashes, sovereignty stable, cost under $10.' },
];
