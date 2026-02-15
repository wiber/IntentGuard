/**
 * src/wrapper.ts — IntentGuard Parent Process
 *
 * Spawns OpenClaw as a child process, connects via WebSocket,
 * and interposes the FIM auth layer on tool calls.
 *
 * ARCHITECTURE:
 *   IntentGuard (this process)
 *     └─ spawns OpenClaw gateway (child process at ws://127.0.0.1:18789)
 *     └─ connects via GatewayClient for RPC
 *     └─ installs FIM auth plugin for tool call interception
 *
 * USAGE:
 *   npx tsx src/wrapper.ts                     # Start with defaults
 *   npx tsx src/wrapper.ts --port 18789        # Custom port
 *   OPENCLAW_GATEWAY_TOKEN=xxx npx tsx src/wrapper.ts  # With auth
 */

import { spawn, type ChildProcess } from 'child_process';
import { resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { createRequire } from 'module';

// ─── Types ──────────────────────────────────────────────────────────────

interface WrapperConfig {
  port: number;
  verbose: boolean;
  token?: string;
  configPath?: string;
  installFimPlugin: boolean;
}

interface GatewayHandle {
  process: ChildProcess;
  port: number;
  stop: () => Promise<void>;
}

// ─── Configuration ──────────────────────────────────────────────────────

function loadConfig(): WrapperConfig {
  return {
    port: parseInt(process.env.OPENCLAW_GATEWAY_PORT ?? '18789', 10),
    verbose: process.env.OPENCLAW_VERBOSE === '1' || process.argv.includes('--verbose'),
    token: process.env.OPENCLAW_GATEWAY_TOKEN,
    configPath: process.env.OPENCLAW_CONFIG_PATH,
    installFimPlugin: process.argv.includes('--no-fim') ? false : true,
  };
}

// ─── FIM Plugin Installation ────────────────────────────────────────────

/**
 * Installs the FIM auth plugin into ~/.openclaw/plugins/ so OpenClaw
 * auto-loads it on startup. The plugin hooks into before_tool_call
 * to check geometric permissions.
 */
function installFimPlugin(): void {
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? '/tmp';
  const pluginDir = resolve(homeDir, '.openclaw', 'plugins');

  if (!existsSync(pluginDir)) {
    mkdirSync(pluginDir, { recursive: true });
  }

  const pluginPath = resolve(pluginDir, 'intentguard-fim-auth.js');

  // Generate the plugin from our auth module
  const pluginCode = `
/**
 * IntentGuard FIM Auth Plugin — Auto-installed by wrapper.ts
 *
 * Hooks into OpenClaw's before_tool_call to check geometric permissions.
 * Uses the trust-debt pipeline's sovereignty scores as the identity vector.
 *
 * Plugin hook: before_tool_call
 * - Loads user identity from trust-debt SQLite DB
 * - Checks overlap with action requirements
 * - Blocks tool calls that fail the FIM threshold
 */

const path = require('path');

// Action requirements map — which tools need which trust scores
const ACTION_REQUIREMENTS = {
  shell_execute: {
    requiredScores: { security: 0.7, reliability: 0.5 },
    minSovereignty: 0.6,
  },
  crm_update_lead: {
    requiredScores: { data_integrity: 0.5, process_adherence: 0.4 },
    minSovereignty: 0.3,
  },
  git_push: {
    requiredScores: { code_quality: 0.7, testing: 0.6, security: 0.5 },
    minSovereignty: 0.7,
  },
  file_write: {
    requiredScores: { reliability: 0.4 },
    minSovereignty: 0.2,
  },
};

// Compute overlap between identity vector and action requirement
function computeOverlap(identityScores, requirement) {
  if (!requirement) return 1.0; // No requirement = allow (fail-open for undefined tools)

  const entries = Object.entries(requirement.requiredScores);
  if (entries.length === 0) return 1.0;

  let metCount = 0;
  for (const [category, minScore] of entries) {
    if ((identityScores[category] ?? 0) >= minScore) {
      metCount++;
    }
  }
  return metCount / entries.length;
}

// Plugin export: OpenClaw calls this before every tool execution
exports.onBeforeToolCall = async function(context) {
  const { tool, params, sessionKey } = context;

  const requirement = ACTION_REQUIREMENTS[tool];
  if (!requirement) {
    // No FIM requirement for this tool — allow
    return { allowed: true, params };
  }

  // TODO: Load real identity from trust-debt SQLite DB
  // For now, use a permissive default identity (sovereignty = 0.8)
  const identityScores = {
    security: 0.8,
    reliability: 0.8,
    data_integrity: 0.7,
    process_adherence: 0.7,
    code_quality: 0.7,
    testing: 0.6,
  };
  const sovereigntyScore = 0.8;

  const overlap = computeOverlap(identityScores, requirement);

  if (overlap >= 0.8 && sovereigntyScore >= requirement.minSovereignty) {
    console.log('[FIM] ALLOWED:', tool, 'overlap=' + overlap.toFixed(2));
    return { allowed: true, params };
  } else {
    console.log('[FIM] DENIED:', tool, 'overlap=' + overlap.toFixed(2), 'sovereignty=' + sovereigntyScore);
    return {
      allowed: false,
      reason: 'FIM: Insufficient geometric overlap (' + overlap.toFixed(2) + ' < 0.8)',
    };
  }
};

exports.pluginName = 'intentguard-fim-auth';
exports.pluginVersion = '0.1.0';
`;

  writeFileSync(pluginPath, pluginCode, 'utf-8');
  console.log(`[IntentGuard] FIM plugin installed: ${pluginPath}`);
}

// ─── Gateway Spawning ───────────────────────────────────────────────────

function resolveOpenClawBin(): string {
  // Resolve from project-local node_modules
  const localBin = resolve(process.cwd(), 'node_modules', 'openclaw', 'openclaw.mjs');
  if (existsSync(localBin)) return localBin;

  // Try require.resolve
  const require_ = createRequire(import.meta.url);
  try {
    const pkgPath = require_.resolve('openclaw/package.json');
    return resolve(pkgPath, '..', 'openclaw.mjs');
  } catch {
    throw new Error('Cannot find openclaw binary. Run: npm install openclaw');
  }
}

async function spawnGateway(config: WrapperConfig): Promise<GatewayHandle> {
  const bin = resolveOpenClawBin();
  console.log(`[IntentGuard] OpenClaw binary: ${bin}`);

  const args = [bin, 'gateway', '--port', String(config.port)];
  if (config.verbose) args.push('--verbose');

  const env = { ...process.env };
  if (config.token) env.OPENCLAW_GATEWAY_TOKEN = config.token;
  if (config.configPath) env.OPENCLAW_CONFIG_PATH = config.configPath;

  const child = spawn('node', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
    cwd: process.cwd(),
  });

  // Forward child output with prefix
  child.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      console.log(`[OpenClaw] ${line}`);
    }
  });

  child.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      console.error(`[OpenClaw:err] ${line}`);
    }
  });

  child.on('exit', (code, signal) => {
    console.log(`[IntentGuard] OpenClaw exited: code=${code} signal=${signal}`);
  });

  // Wait for gateway to be ready
  console.log(`[IntentGuard] Waiting for gateway on port ${config.port}...`);
  await waitForPort(config.port, 30);
  console.log(`[IntentGuard] Gateway ready at ws://127.0.0.1:${config.port}`);

  return {
    process: child,
    port: config.port,
    async stop() {
      child.kill('SIGTERM');
      await new Promise<void>(resolve => {
        child.once('exit', () => resolve());
        setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 5000);
      });
    },
  };
}

async function waitForPort(port: number, maxAttempts: number): Promise<void> {
  const { createConnection } = await import('net');

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = createConnection({ port, host: '127.0.0.1' }, () => {
          socket.destroy();
          resolve();
        });
        socket.on('error', reject);
        socket.setTimeout(500, () => {
          socket.destroy();
          reject(new Error('timeout'));
        });
      });
      return; // Connected
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`Gateway not ready on port ${port} after ${maxAttempts}s`);
}

// ─── Signal Handling ────────────────────────────────────────────────────

function setupSignalHandlers(gateway: GatewayHandle): void {
  const shutdown = async (signal: string) => {
    console.log(`\n[IntentGuard] Received ${signal}, shutting down...`);
    await gateway.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[IntentGuard] Starting — Headless CEO');
  console.log('[IntentGuard] v1.8.3 | Wrapper Pattern (Composition over Fork)');

  const config = loadConfig();

  // Install FIM auth plugin before spawning OpenClaw
  if (config.installFimPlugin) {
    installFimPlugin();
  }

  // Spawn OpenClaw as child process
  const gateway = await spawnGateway(config);
  setupSignalHandlers(gateway);

  console.log('[IntentGuard] ──────────────────────────────────────────');
  console.log(`[IntentGuard] Gateway: ws://127.0.0.1:${gateway.port}`);
  console.log(`[IntentGuard] FIM Auth: ${config.installFimPlugin ? 'enabled' : 'disabled'}`);
  console.log('[IntentGuard] Press Ctrl+C to stop');
  console.log('[IntentGuard] ──────────────────────────────────────────');
}

main().catch(err => {
  console.error('[IntentGuard] Fatal:', err.message);
  process.exit(1);
});
