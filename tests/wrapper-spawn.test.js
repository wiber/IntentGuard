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

  afterEach((done) => {
    if (child && !child.killed && child.exitCode === null) {
      child.removeAllListeners();
      child.stdout?.removeAllListeners();
      child.stderr?.removeAllListeners();
      child.once('exit', () => {
        child = null;
        done();
      });
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child && !child.killed) child.kill('SIGKILL');
      }, 3000);
    } else {
      child = null;
      done();
    }
  });

  test('OpenClaw binary exists and is resolvable', () => {
    const bin = resolveOpenClawBin();
    expect(bin).not.toBeNull();
    expect(fs.existsSync(bin)).toBe(true);
  });

  test('OpenClaw spawns as a child process without crashing', (done) => {
    const bin = resolveOpenClawBin();
    if (!bin) {
      done(new Error('OpenClaw binary not found'));
      return;
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

    let stdout = '';
    let stderr = '';
    let settled = false;

    const settle = (err) => {
      if (settled) return;
      settled = true;
      if (err) done(err);
      else done();
    };

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      // If we see any output, the process started successfully
      if (stdout.length > 0 && !settled) {
        // Process is alive and producing output — success
        settle();
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      // Some output on stderr is normal (e.g. startup logs)
      // Only fail if process exits with error before producing stdout
    });

    child.on('error', (err) => {
      settle(new Error(`Failed to spawn OpenClaw: ${err.message}`));
    });

    // If the process exits immediately with non-zero, that's a failure
    child.on('exit', (code, signal) => {
      if (!settled && code !== 0 && code !== null) {
        settle(new Error(
          `OpenClaw exited prematurely: code=${code} signal=${signal}\nstderr: ${stderr}`
        ));
      }
    });

    // Give it up to 8s to produce output, then check if still alive
    setTimeout(() => {
      if (!settled) {
        // Process is still alive after timeout — that counts as success
        // (gateway may be waiting silently for connections)
        if (!child.killed && child.exitCode === null) {
          settle(); // Still running = success
        } else {
          settle(new Error(`OpenClaw not running after timeout. stderr: ${stderr}`));
        }
      }
    }, 8000);
  }, 15000); // 15s jest timeout

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

  test('child process can be stopped gracefully', (done) => {
    const bin = resolveOpenClawBin();
    if (!bin) {
      done();
      return;
    }

    child = spawn('node', [bin, 'gateway', '--port', String(TEST_PORT + 2)], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      cwd: process.cwd(),
    });

    // Wait briefly for process to start, then kill it
    setTimeout(() => {
      child.on('exit', (code, signal) => {
        // SIGTERM should cause exit
        expect(child.killed || signal === 'SIGTERM' || code !== null).toBe(true);
        done();
      });
      child.kill('SIGTERM');
    }, 1000);
  }, 10000);
});
