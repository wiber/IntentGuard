// tests/boundary_probe_napi.test.mjs — C606a THE ADDON EXPORTS THE L1 BOUNDARY PROBE.
//
// AXIOM 0 rung 3 (the boundary-crossing cost, MEASURED: a median with its [min, max] spread and a control verdict) was
// reachable only through a CLI (`--boundary-probe --json`), so nothing on Vercel — where the napi addon is the only
// Rust — could take the reading. The addon now exports boundaryProbe(kib?, runs?, controlKib?), which calls
// boundary_probe::report, the same function both CLIs serialize, so the field names agree by construction.
//
// What each test holds (falsifier):
//   1. the locally built addon (index.js → napi/dist/intentguard.<host>.node) exports boundaryProbe, and
//      boundaryProbe([16, 1024], 3) returns every size with min ≤ median ≤ max for packed, crossing and ratio, a control
//      verdict (admissible + reason), runs, sizes and the host facts (os, arch, cpus)
//   2. the result's field names (top level, each result row, control, host) equal the CLI's
//      `intentguard --boundary-probe --kib 16,1024 --runs 3 --json` field names
//
// SUFFICIENT FOR: the addon and the CLI take the same reading through the same struct on this host. NOT SUFFICIENT FOR:
// whether this run was quiet (that is the control verdict's job, carried as data) or what a Linux host reads (C606b).
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const SIZES = [16, 1024];
const RUNS = 3;

const keysOf = (o) => Object.keys(o).sort();
function shape(r) {
  return {
    top: keysOf(r),
    row: [...new Set(r.results.flatMap((x) => keysOf(x)))].sort(),
    control: keysOf(r.control),
    host: keysOf(r.host),
  };
}

let napiReading;
test('C606a: the addon exports boundaryProbe and returns a median inside its [min, max] for every size', () => {
  const ig = require(join(ROOT, 'index.js'));
  assert.equal(ig.unavailable, null, `no addon for this host: ${ig.unavailable}`);
  const addon = require(ig.addonPath);
  assert.equal(typeof addon.boundaryProbe, 'function', `${ig.addonPath} does not export boundaryProbe (exports: ${Object.keys(addon).join(', ')})`);
  assert.equal(typeof ig.boundaryProbe, 'function', 'index.js does not expose boundaryProbe');

  const r = ig.boundaryProbe(SIZES, RUNS);
  napiReading = r;
  assert.equal(r.runs, RUNS);
  assert.deepEqual(r.sizes, SIZES);
  assert.deepEqual(r.results.map((x) => x.kib), SIZES);
  for (const s of r.results) {
    assert.equal(s.runs, RUNS, `${s.kib} KiB: runs`);
    for (const k of ['packed_ns', 'crossing_ns', 'ratio']) {
      const [lo, med, hi] = [s[`${k}_min`], s[`${k}_median`], s[`${k}_max`]];
      for (const v of [lo, med, hi]) assert.ok(Number.isFinite(v) && v > 0, `${s.kib} KiB ${k}: ${v} is not a positive number`);
      assert.ok(lo <= med && med <= hi, `${s.kib} KiB ${k}: min ${lo} ≤ median ${med} ≤ max ${hi} fails`);
    }
  }
  assert.equal(typeof r.control.admissible, 'boolean', 'control verdict missing');
  assert.equal(r.control.control_kib, 16);
  assert.match(r.control.reason, /control ratio .* (within|outside)/);
  assert.equal(r.host.os, process.platform === 'darwin' ? 'macos' : process.platform);
  assert.ok(typeof r.host.arch === 'string' && r.host.arch.length > 0);
  assert.ok(Number.isInteger(r.host.cpus) && r.host.cpus > 0);
});

test('C606a: the addon and the CLI --boundary-probe --json carry the same field names', () => {
  const out = execFileSync('cargo', ['run', '--release', '--quiet', '--bin', 'intentguard', '--',
    '--boundary-probe', '--kib', SIZES.join(','), '--runs', String(RUNS), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 << 20 });
  const line = out.trim().split('\n').filter((l) => l.startsWith('{')).pop();
  assert.ok(line, `the CLI printed no JSON line:\n${out}`);
  const cli = JSON.parse(line);
  const r = napiReading || require(join(ROOT, 'index.js')).boundaryProbe(SIZES, RUNS);
  assert.deepEqual(shape(r), shape(cli));
  assert.deepEqual(cli.sizes, r.sizes);
});
