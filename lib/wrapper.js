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
import { spawn } from 'child_process';
import { resolve, join, dirname } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OPENCLAW_HOME = join(process.env.HOME ?? '/tmp', '.openclaw');
// ═══════════════════════════════════════════════════════════════
// Load .env
// ═══════════════════════════════════════════════════════════════
const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
        const m = line.match(/^([^#]\w*)=(.*)$/);
        if (m && m[1] && !process.env[m[1]])
            process.env[m[1]] = m[2];
    }
}
// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════
function loadConfig() {
    // Read OpenClaw config for gateway token
    let token = process.env.OPENCLAW_GATEWAY_TOKEN ?? '';
    try {
        const ocConfig = JSON.parse(readFileSync(join(OPENCLAW_HOME, 'openclaw.json'), 'utf-8'));
        if (!token && ocConfig.gateway?.auth?.token)
            token = ocConfig.gateway.auth.token;
    }
    catch { }
    return {
        port: parseInt(process.env.OPENCLAW_GATEWAY_PORT ?? '18789', 10),
        verbose: process.argv.includes('--verbose'),
        token,
        installFimPlugin: !process.argv.includes('--no-fim'),
        spawnGateway: !process.argv.includes('--no-gateway'),
        registerSkills: !process.argv.includes('--no-skills'),
        wireLlm: !process.argv.includes('--no-llm'),
    };
}
// ═══════════════════════════════════════════════════════════════
// 1. FIM Auth Plugin
// ═══════════════════════════════════════════════════════════════
function installFimPlugin() {
    const pluginDir = join(OPENCLAW_HOME, 'plugins');
    if (!existsSync(pluginDir))
        mkdirSync(pluginDir, { recursive: true });
    // Read sovereignty from pipeline data
    let sovereignty = 0.7;
    try {
        const { loadIdentityFromPipeline } = require('./auth/geometric.ts');
        const identity = loadIdentityFromPipeline(join(ROOT, 'data', 'pipeline-runs'));
        sovereignty = identity.sovereigntyScore;
    }
    catch { }
    const pluginCode = `
/**
 * IntentGuard FIM Auth Plugin — Auto-installed by wrapper.ts
 * Hooks into OpenClaw before_tool_call for geometric permission checks.
 * Sovereignty: ${sovereignty.toFixed(3)}
 */

const ACTION_REQUIREMENTS = {
  shell_execute: { requiredScores: { security: 0.7, reliability: 0.5 }, minSovereignty: 0.6 },
  crm_update_lead: { requiredScores: { data_integrity: 0.5, process_adherence: 0.4 }, minSovereignty: 0.3 },
  git_push: { requiredScores: { code_quality: 0.7, testing: 0.6, security: 0.5 }, minSovereignty: 0.7 },
  file_write: { requiredScores: { reliability: 0.4 }, minSovereignty: 0.2 },
  file_delete: { requiredScores: { reliability: 0.7, security: 0.6 }, minSovereignty: 0.8 },
  browser_navigate: { requiredScores: { security: 0.3 }, minSovereignty: 0.3 },
  send_message: { requiredScores: { communication: 0.3 }, minSovereignty: 0.2 },
};

function computeOverlap(identityScores, requirement) {
  if (!requirement) return 1.0;
  const entries = Object.entries(requirement.requiredScores);
  if (entries.length === 0) return 1.0;
  let met = 0;
  for (const [cat, min] of entries) {
    if ((identityScores[cat] ?? 0) >= min) met++;
  }
  return met / entries.length;
}

// Live sovereignty score — updated by IntentGuard runtime
let currentSovereignty = ${sovereignty};
let identityScores = {
  security: 0.8, reliability: 0.8, data_integrity: 0.7,
  process_adherence: 0.7, code_quality: 0.7, testing: 0.6,
  communication: 0.9, transparency: 0.9,
};

// Accept sovereignty updates from parent process
exports.onConfigUpdate = function(update) {
  if (update.sovereignty !== undefined) currentSovereignty = update.sovereignty;
  if (update.identityScores) identityScores = update.identityScores;
};

exports.onBeforeToolCall = async function(context) {
  const { tool, params } = context;
  const requirement = ACTION_REQUIREMENTS[tool];
  if (!requirement) return { allowed: true, params };

  const overlap = computeOverlap(identityScores, requirement);
  if (overlap >= 0.8 && currentSovereignty >= requirement.minSovereignty) {
    return { allowed: true, params };
  } else {
    console.log('[FIM] DENIED:', tool, 'overlap=' + overlap.toFixed(2), 'sov=' + currentSovereignty.toFixed(2));
    return { allowed: false, reason: 'FIM: overlap=' + overlap.toFixed(2) + ' sovereignty=' + currentSovereignty.toFixed(2) };
  }
};

exports.pluginName = 'intentguard-fim-auth';
exports.pluginVersion = '2.0.0';
`;
    writeFileSync(join(pluginDir, 'intentguard-fim-auth.js'), pluginCode);
    console.log('[IntentGuard] FIM plugin v2.0 installed');
}
// ═══════════════════════════════════════════════════════════════
// 2. Skill Registration — port our skills into OpenClaw workspace
// ═══════════════════════════════════════════════════════════════
function registerSkills() {
    const skillsDir = join(OPENCLAW_HOME, 'workspace', 'skills');
    if (!existsSync(skillsDir))
        mkdirSync(skillsDir, { recursive: true });
    const skills = [
        {
            id: 'intentguard-llm-controller',
            name: 'LLM Controller (3-Tier Grounding)',
            description: 'Tier 0: Ollama (fast), Tier 1: Sonnet (deep), Tier 2: Human (admin)',
            tools: [
                { name: 'llm_categorize', description: 'Categorize text via Ollama llama3.2:1b', params: { text: { type: 'string' } } },
                { name: 'llm_reason', description: 'Complex reasoning via Claude Sonnet', params: { prompt: { type: 'string' }, system: { type: 'string' } } },
                { name: 'llm_transcribe', description: 'Transcribe audio via Whisper', params: { audioUrl: { type: 'string' } } },
            ],
        },
        {
            id: 'intentguard-thetasteer',
            name: 'ThetaSteer Categorize (IAMFIM)',
            description: 'Maps input to 20 trust-debt dimensions via FIM alignment',
            tools: [
                { name: 'thetasteer_categorize', description: 'Categorize text into trust-debt categories', params: { text: { type: 'string' } } },
            ],
        },
        {
            id: 'intentguard-voice-reactor',
            name: 'Voice Memo Reactor',
            description: 'React to audio attachments with transcription + categorization',
            tools: [
                { name: 'voice_react', description: 'Process voice memo attachment', params: { audioUrl: { type: 'string' }, channelId: { type: 'string' } } },
            ],
        },
        {
            id: 'intentguard-claude-flow-bridge',
            name: 'Claude Flow Bridge',
            description: 'Dispatch prompts to 9 cognitive room terminals via Claude Code',
            tools: [
                { name: 'bridge_dispatch', description: 'Send prompt to cognitive room', params: { room: { type: 'string' }, prompt: { type: 'string' } } },
                { name: 'bridge_stdin', description: 'Send input to running room process', params: { room: { type: 'string' }, text: { type: 'string' } } },
            ],
        },
        {
            id: 'intentguard-email-outbound',
            name: 'Email Outbound',
            description: 'Send emails via thetadriven.com API',
            tools: [
                { name: 'email_send', description: 'Send an email', params: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } } },
            ],
        },
        {
            id: 'intentguard-night-shift',
            name: 'Night Shift Scheduler',
            description: 'Proactive task injection when system is idle',
            tools: [
                { name: 'nightshift_status', description: 'Get scheduler status', params: {} },
                { name: 'nightshift_trigger', description: 'Manually trigger a proactive task', params: { taskId: { type: 'string' } } },
            ],
        },
        {
            id: 'intentguard-system-control',
            name: 'System Control (macOS Native)',
            description: 'Mouse, keyboard, screen capture, browser, app, clipboard automation via JXA/CoreGraphics/AppleScript. Uses /usr/sbin/screencapture (macOS built-in).',
            tools: [
                { name: 'mouse_click', description: 'Click at x,y', params: { x: { type: 'number' }, y: { type: 'number' } } },
                { name: 'mouse_move', description: 'Move cursor to x,y', params: { x: { type: 'number' }, y: { type: 'number' } } },
                { name: 'key_type', description: 'Type text', params: { text: { type: 'string' } } },
                { name: 'key_press', description: 'Press key combo', params: { key: { type: 'string' }, modifiers: { type: 'array' } } },
                { name: 'screen_capture', description: 'Capture screen', params: { path: { type: 'string' } } },
                { name: 'browser_open', description: 'Open URL in browser', params: { url: { type: 'string' } } },
                { name: 'app_activate', description: 'Activate app by name', params: { name: { type: 'string' } } },
                { name: 'clipboard_get', description: 'Get clipboard contents', params: {} },
                { name: 'clipboard_set', description: 'Set clipboard contents', params: { text: { type: 'string' } } },
            ],
        },
        {
            id: 'intentguard-tesseract-trainer',
            name: 'Tesseract Trainer (Geometric IAM)',
            description: 'Feed attention signals into IAM training corpus. Emoji-weighted, confidence-gated Supabase pointers.',
            tools: [
                { name: 'train_signal', description: 'Train with attention signal', params: { content: { type: 'string' }, category: { type: 'object' }, reaction: { type: 'object' } } },
                { name: 'train_heat_update', description: 'Update heat map for tile', params: { tile_id: { type: 'string' }, weight: { type: 'number' } } },
            ],
        },
    ];
    for (const skill of skills) {
        const skillDir = join(skillsDir, skill.id);
        if (!existsSync(skillDir))
            mkdirSync(skillDir, { recursive: true });
        // Write manifest
        writeFileSync(join(skillDir, 'manifest.json'), JSON.stringify({
            id: skill.id,
            name: skill.name,
            version: '2.0.0',
            description: skill.description,
            author: 'IntentGuard Sovereign Engine',
            tools: skill.tools,
        }, null, 2));
        // Write index.js that delegates to our TypeScript skill implementations
        writeFileSync(join(skillDir, 'index.js'), `
/**
 * ${skill.id} — OpenClaw Workspace Skill
 * Delegates to IntentGuard TypeScript implementation.
 * Auto-generated by wrapper.ts
 */
const path = require('path');
const INTENTGUARD_ROOT = '${ROOT}';

module.exports = class ${skill.id.replace(/-/g, '_')} {
  constructor() {
    this.name = '${skill.id}';
    this._impl = null;
  }

  async initialize(context) {
    // Lazy-load the TypeScript implementation
    try {
      const skillName = '${skill.id}'.replace('intentguard-', '');
      const skillPath = path.join(INTENTGUARD_ROOT, 'src', 'skills', skillName + '.ts');
      // Note: tsx must be available for TypeScript imports
      this._impl = await import(skillPath).then(m => new m.default());
      if (this._impl.initialize) {
        await this._impl.initialize(context);
      }
      console.log('[IntentGuard] Skill loaded: ${skill.id}');
    } catch (err) {
      console.warn('[IntentGuard] Skill ${skill.id} init failed:', err.message);
    }
  }

  async execute(tool, params, context) {
    if (this._impl && this._impl.execute) {
      return this._impl.execute({ action: tool, payload: params }, context);
    }
    return { success: false, message: 'Skill not initialized' };
  }
};
`);
    }
    console.log(`[IntentGuard] ${skills.length} skills registered in OpenClaw workspace`);
}
// ═══════════════════════════════════════════════════════════════
// 3. LLM Backend Configuration — wire Ollama + Sonnet into OpenClaw
// ═══════════════════════════════════════════════════════════════
function wireLlmBackends() {
    const ocConfigPath = join(OPENCLAW_HOME, 'openclaw.json');
    let config = {};
    try {
        config = JSON.parse(readFileSync(ocConfigPath, 'utf-8'));
    }
    catch { }
    // Add model configuration for the main agent
    const agentDefaults = config.agents?.defaults ?? {};
    agentDefaults.model = {
        primary: {
            provider: 'ollama',
            model: 'llama3.2:1b',
            endpoint: 'http://localhost:11434',
            description: 'Tier 0: Fast local categorization (~200ms)',
        },
        fallback: {
            provider: 'anthropic',
            model: 'claude-sonnet-4-20250514',
            apiKey: process.env.ANTHROPIC_API_KEY || '${process.env.ANTHROPIC_API_KEY || ""}',
            description: 'Tier 1: Complex reasoning via API',
        },
    };
    if (!config.agents)
        config.agents = {};
    config.agents.defaults = agentDefaults;
    // Backup and write
    if (existsSync(ocConfigPath)) {
        copyFileSync(ocConfigPath, ocConfigPath + '.bak');
    }
    writeFileSync(ocConfigPath, JSON.stringify(config, null, 2));
    console.log('[IntentGuard] LLM backends wired: Ollama (Tier 0) + Sonnet (Tier 1)');
}
// ═══════════════════════════════════════════════════════════════
// 4. Gateway Spawning
// ═══════════════════════════════════════════════════════════════
function resolveOpenClawBin() {
    const localBin = resolve(process.cwd(), 'node_modules', 'openclaw', 'openclaw.mjs');
    if (existsSync(localBin))
        return localBin;
    const require_ = createRequire(import.meta.url);
    try {
        const pkgPath = require_.resolve('openclaw/package.json');
        return resolve(pkgPath, '..', 'openclaw.mjs');
    }
    catch {
        throw new Error('Cannot find openclaw binary. Run: npm install openclaw');
    }
}
async function spawnGateway(config) {
    let child = null;
    if (config.spawnGateway) {
        const bin = resolveOpenClawBin();
        console.log(`[IntentGuard] OpenClaw binary: ${bin}`);
        const args = [bin, 'gateway', '--port', String(config.port)];
        if (config.verbose)
            args.push('--verbose');
        const env = { ...process.env };
        if (config.token)
            env.OPENCLAW_GATEWAY_TOKEN = config.token;
        child = spawn('node', args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env,
            cwd: process.cwd(),
        });
        child.stdout?.on('data', (data) => {
            for (const line of data.toString().split('\n').filter(Boolean)) {
                console.log(`[OpenClaw] ${line}`);
            }
        });
        child.stderr?.on('data', (data) => {
            for (const line of data.toString().split('\n').filter(Boolean)) {
                console.error(`[OpenClaw:err] ${line}`);
            }
        });
        child.on('exit', (code, signal) => {
            console.log(`[IntentGuard] OpenClaw exited: code=${code} signal=${signal}`);
        });
        console.log(`[IntentGuard] Waiting for gateway on port ${config.port}...`);
        await waitForPort(config.port, 30);
    }
    else {
        console.log(`[IntentGuard] Connecting to existing gateway on port ${config.port}`);
        await waitForPort(config.port, 10);
    }
    console.log(`[IntentGuard] Gateway ready at ws://127.0.0.1:${config.port}`);
    // Connect WebSocket "parasite" hook
    let ws = null;
    try {
        ws = await connectWebSocket(config.port, config.token);
        console.log('[IntentGuard] WebSocket parasite hook connected');
    }
    catch (err) {
        console.warn(`[IntentGuard] WebSocket connection failed: ${err}. Running without live hooks.`);
    }
    return {
        process: child,
        port: config.port,
        ws,
        async stop() {
            if (ws) {
                ws.close();
                ws = null;
            }
            if (child) {
                child.kill('SIGTERM');
                await new Promise(resolve => {
                    child.once('exit', () => resolve());
                    setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000);
                });
            }
        },
    };
}
// ═══════════════════════════════════════════════════════════════
// 5. WebSocket Parasite Hook — intercept messages and inject LLM
// ═══════════════════════════════════════════════════════════════
async function connectWebSocket(port, token) {
    return new Promise((resolve, reject) => {
        const url = `ws://127.0.0.1:${port}/ws${token ? `?token=${token}` : ''}`;
        const ws = new WebSocket(url);
        ws.on('open', () => {
            console.log('[IntentGuard] WebSocket connected to gateway');
            // Subscribe to all events
            ws.send(JSON.stringify({
                type: 'subscribe',
                events: ['message_received', 'tool_call', 'agent_response', 'session_start', 'session_end'],
            }));
            resolve(ws);
        });
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                handleGatewayMessage(ws, msg);
            }
            catch { }
        });
        ws.on('error', (err) => {
            console.error('[IntentGuard] WebSocket error:', err.message);
            reject(err);
        });
        ws.on('close', () => {
            console.log('[IntentGuard] WebSocket disconnected');
        });
        setTimeout(() => reject(new Error('WebSocket timeout')), 10000);
    });
}
/**
 * Handle messages from the OpenClaw gateway.
 * This is where the 3-tier grounding protocol lives.
 */
function handleGatewayMessage(ws, msg) {
    switch (msg.event) {
        case 'message_received': {
            // A message came in from a channel (Discord, WhatsApp, etc.)
            const { channelType, content, author, sessionId } = msg.data ?? {};
            console.log(`[IntentGuard] Message from ${channelType}: ${String(content).substring(0, 80)}`);
            // Tier 0: Fast categorization via Ollama
            categorizeFast(String(content)).then(categories => {
                console.log(`[IntentGuard] Categories: ${categories.join(', ')}`);
                // The OpenClaw agent will handle the response — we just logged the categorization
                // For deeper integration, we'd inject the categories into the agent context
            });
            break;
        }
        case 'tool_call': {
            // FIM plugin handles this via before_tool_call hook
            // This is informational only
            const { tool, params } = msg.data ?? {};
            console.log(`[IntentGuard] Tool call: ${tool}`);
            break;
        }
        case 'session_start': {
            const { sessionId, channel } = msg.data ?? {};
            console.log(`[IntentGuard] Session started: ${sessionId} (${channel})`);
            break;
        }
    }
}
/**
 * Tier 0: Fast categorization via Ollama (llama3.2:1b)
 */
async function categorizeFast(text) {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2:1b',
                prompt: `Categorize this message into 1-3 of these categories: security, reliability, data_integrity, process_adherence, code_quality, testing, communication, transparency, architecture, performance, operations, planning. Respond with ONLY comma-separated category names.\n\nMessage: "${text.substring(0, 200)}"`,
                stream: false,
            }),
            signal: AbortSignal.timeout(5000),
        });
        const data = await response.json();
        return (data.response ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    }
    catch {
        // Fallback: keyword heuristic
        const categories = [];
        const t = text.toLowerCase();
        if (t.includes('test') || t.includes('bug'))
            categories.push('testing');
        if (t.includes('deploy') || t.includes('build'))
            categories.push('operations');
        if (t.includes('refactor') || t.includes('design'))
            categories.push('architecture');
        return categories.length > 0 ? categories : ['communication'];
    }
}
// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════
async function waitForPort(port, maxAttempts) {
    const { createConnection } = await import('net');
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await new Promise((resolve, reject) => {
                const socket = createConnection({ port, host: '127.0.0.1' }, () => { socket.destroy(); resolve(); });
                socket.on('error', reject);
                socket.setTimeout(500, () => { socket.destroy(); reject(new Error('timeout')); });
            });
            return;
        }
        catch {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    throw new Error(`Port ${port} not ready after ${maxAttempts}s`);
}
function setupSignalHandlers(gateway) {
    const shutdown = async (signal) => {
        console.log(`\n[IntentGuard] Received ${signal}, shutting down...`);
        await gateway.stop();
        process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}
// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  IntentGuard Sovereign Engine v2.0');
    console.log('  Cortex (IntentGuard) + Body (OpenClaw)');
    console.log('═══════════════════════════════════════════════════');
    const config = loadConfig();
    // Step 1: Install FIM auth plugin
    if (config.installFimPlugin)
        installFimPlugin();
    // Step 2: Register skills into OpenClaw workspace
    if (config.registerSkills)
        registerSkills();
    // Step 3: Wire LLM backends
    if (config.wireLlm)
        wireLlmBackends();
    // Step 4: Spawn or connect to gateway
    const gateway = await spawnGateway(config);
    setupSignalHandlers(gateway);
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Gateway:    ws://127.0.0.1:${gateway.port}`);
    console.log(`  Dashboard:  http://127.0.0.1:${gateway.port}/`);
    console.log(`  FIM Auth:   ${config.installFimPlugin ? 'enabled' : 'disabled'}`);
    console.log(`  Skills:     ${config.registerSkills ? '8 registered (6 ported + 2 new)' : 'skipped'}`);
    console.log(`  LLM:        ${config.wireLlm ? 'Ollama + Sonnet' : 'skipped'}`);
    console.log(`  WebSocket:  ${gateway.ws ? 'connected (parasite hook)' : 'not connected'}`);
    console.log(`  Registry:   src/skills/registry.json (13 skills tracked)`);
    console.log('═══════════════════════════════════════════════════');
    console.log('  Press Ctrl+C to stop');
    console.log('  Dashboard: http://127.0.0.1:18789/');
    console.log('  Sync:      ./scripts/sync-skills.sh --copy');
    console.log('═══════════════════════════════════════════════════');
    // Keep alive — the WebSocket and child process run in background
    await new Promise(() => { });
}
main().catch(err => {
    console.error('[IntentGuard] Fatal:', err.message);
    process.exit(1);
});
//# sourceMappingURL=wrapper.js.map