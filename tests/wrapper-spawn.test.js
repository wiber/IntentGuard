/**
 * tests/wrapper-spawn.test.js — Test: OpenClaw starts as child process
 *
 * Verifies that the IntentGuard wrapper can spawn OpenClaw's gateway
 * binary as a child process, matching the spawn logic in src/wrapper.ts.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Resolve the OpenClaw binary the same way wrapper.ts does
function resolveOpenClawBin() {
  const localBin = path.resolve(process.cwd(), 'node_modules', 'openclaw', 'openclaw.mjs');
  if (fs.existsSync(localBin)) return localBin;

  try {
    const pkgPath = require.resolve('openclaw/package.json');
    return path.resolve(pkgPath, '..', 'openclaw.mjs');
  } catch {
    return null;
  }
}

describe('OpenClaw Child Process Spawn', () => {
  const TEST_PORT = 19789; // Use non-default port to avoid conflicts
  let child;

  afterEach(async () => {
    if (child && !child.killed && child.exitCode === null) {
      child.removeAllListeners();
      child.stdout?.removeAllListeners();
      child.stderr?.removeAllListeners();
      const exitPromise = new Promise((resolve) => {
        child.once('exit', () => {
          child = null;
          resolve();
        });
      });
      child.kill('SIGTERM');
      const timeout = setTimeout(() => {
        if (child && !child.killed) child.kill('SIGKILL');
      }, 3000);
      await exitPromise;
      clearTimeout(timeout);
    } else {
      child = null;
    }
  });

  test('OpenClaw binary exists and is resolvable', () => {
    const bin = resolveOpenClawBin();
    expect(bin).not.toBeNull();
    expect(fs.existsSync(bin)).toBe(true);
  });

  test('OpenClaw spawns as a child process without crashing', async () => {
    const bin = resolveOpenClawBin();
    if (!bin) {
      throw new Error('OpenClaw binary not found');
    }

    // Spawn exactly as wrapper.ts does: node <openclaw.mjs> gateway --port <port>
    child = spawn('node', [bin, 'gateway', '--port', String(TEST_PORT)], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      cwd: process.cwd(),
    });

    expect(child).toBeDefined();
    expect(child.pid).toBeDefined();
    expect(typeof child.pid).toBe('number');
    expect(child.pid).toBeGreaterThan(0);

    await new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let settled = false;

      const settle = (err) => {
        if (settled) return;
        settled = true;
        if (err) reject(err);
        else resolve();
      };

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > 0 && !settled) {
          settle();
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        settle(new Error(`Failed to spawn OpenClaw: ${err.message}`));
      });

      child.on('exit', (code, signal) => {
        if (!settled && code !== 0 && code !== null) {
          settle(new Error(
            `OpenClaw exited prematurely: code=${code} signal=${signal}\nstderr: ${stderr}`
          ));
        }
      });

      setTimeout(() => {
        if (!settled) {
          if (!child.killed && child.exitCode === null) {
            settle();
          } else {
            settle(new Error(`OpenClaw not running after timeout. stderr: ${stderr}`));
          }
        }
      }, 8000);
    });
  }, 15000);

  test('child process has valid stdio streams', () => {
    const bin = resolveOpenClawBin();
    if (!bin) return;

    child = spawn('node', [bin, 'gateway', '--port', String(TEST_PORT + 1)], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      cwd: process.cwd(),
    });

    // Verify stdio streams are writable/readable as expected
    expect(child.stdin).toBeDefined();
    expect(child.stdout).toBeDefined();
    expect(child.stderr).toBeDefined();
    expect(child.stdin.writable).toBe(true);
    expect(child.stdout.readable).toBe(true);
    expect(child.stderr.readable).toBe(true);
  });

  test('child process can be stopped gracefully', async () => {
    const bin = resolveOpenClawBin();
    if (!bin) return;

    child = spawn('node', [bin, 'gateway', '--port', String(TEST_PORT + 2)], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      cwd: process.cwd(),
    });

    // Wait briefly for process to start, then kill it
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await new Promise((resolve) => {
      child.on('exit', (code, signal) => {
        // SIGTERM should cause exit
        expect(child.killed || signal === 'SIGTERM' || code !== null).toBe(true);
        resolve();
      });
      child.kill('SIGTERM');
    });
  }, 10000);
});
