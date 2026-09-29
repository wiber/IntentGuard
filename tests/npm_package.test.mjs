// tests/npm_package.test.mjs — C481 INTENTGUARD 2.x IS A PACKAGE ANY NODE CAN INSTALL.
//
// `npm i intentguard@2` must load the addon built for the host and hand back the same bytes the addon gives
// in-process (and so the CLI's --card, which napi/test.mjs pins). What each test holds:
//   1. package.json names intentguard at a 2.x version, with an entry and a bin
//   2. `npm pack --dry-run --json` lists that version and all four addons (napi/dist is gitignored, so this
//      is the only proof the tarball carries them), plus the entry and the bin — and nothing from target/
//      or node_modules/
//   3. the PACKED tarball, extracted and required in a fresh node, returns a card whose bytes equal the napi
//      addon's own (required straight from napi/dist) — naked and with a bulk
//   4. the packed bin `intentguard --card --text T` writes those same bytes; cardSigned from the packed
//      entry verifies, and its payload line is the card
// Needs the four addons (napi/build-all.sh). A missing one is a failure, never a skip.
//
// WHERE THE ADDONS COME FROM. They are build artefacts (napi/dist is gitignored), so a checkout of a commit — the
// verify door's `git archive` extract — does not carry them. The build is located through ONE named input:
// INTENTGUARD_NAPI_DIST (the verify door sets it from build-outputs.json to the live checkout's napi/dist), else this
// tree's napi/dist. Either way it is TRUSTED ONLY when its BUILD-STAMP.json (written by build-all.sh) names the same
// source hash as THIS tree's crate sources (napi/source-stamp.mjs) and every addon's sha256 matches the stamp — a build
// of the commit's own sources, never stale working-tree state. Otherwise tests 2–4 fail
// "UNMEASURED: addons not built for <sha> — run napi/build-all.sh". When the build lives outside this tree, the four
// verified files are copied into this tree's napi/dist for `npm pack` (refused if one is already there) and removed after.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync, realpathSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { sourceHash, addonHash, STAMP } from '../napi/source-stamp.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLATFORMS = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64'];
const HOST = `${process.platform}-${process.arch}`;
const PKG = join(ROOT, 'package.json');
const fx = (n) => readFileSync(join(ROOT, 'tests/fixtures', `${n}.txt`), 'utf8');
const TEST_SEED = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';   // a fixed TEST seed, never a real key

// The pack commands run with a clean npm environment: no inherited npm_config_* from a parent `npm test`.
const npmEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^npm_/i.test(k)));
const npm = (args, cwd = ROOT) => execFileSync('npm', args, { cwd, env: npmEnv(), encoding: 'utf8', maxBuffer: 64 << 20 });

// The build this tree's addons are read from, checked against this tree's sources (see the header).
const LOCAL_DIST = join(ROOT, 'napi', 'dist');
const DIST = process.env.INTENTGUARD_NAPI_DIST ? resolve(process.env.INTENTGUARD_NAPI_DIST) : LOCAL_DIST;
function atCommit() {
  if (process.env.VNA_GUARD_COMMIT) return process.env.VNA_GUARD_COMMIT;
  if (existsSync(join(ROOT, '.git'))) { try { return execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* no git */ } }
  return 'this tree';
}
let addonsOk, staged;
function addons() {
  if (addonsOk) return addonsOk;
  const source = sourceHash(ROOT);
  const unmeasured = (why) => assert.fail(`UNMEASURED: addons not built for ${atCommit()} (source ${source.slice(0, 12)}) — run napi/build-all.sh · ${why}`);
  let stamp;
  try { stamp = JSON.parse(readFileSync(join(DIST, STAMP), 'utf8')); } catch { unmeasured(`no ${STAMP} in ${DIST}`); }
  if (stamp.source !== source) unmeasured(`${DIST} holds a build of source ${String(stamp.source).slice(0, 12)}`);
  for (const p of PLATFORMS) {
    const f = join(DIST, `intentguard.${p}.node`);
    if (!existsSync(f)) unmeasured(`${f} missing`);
    if (!stamp.addons || stamp.addons[p] !== addonHash(f)) unmeasured(`${p}: the .node is not the one this source's build stamped`);
  }
  if (resolve(DIST) !== resolve(LOCAL_DIST)) {
    assert.ok(!existsSync(LOCAL_DIST), `ambiguous: ${LOCAL_DIST} exists and INTENTGUARD_NAPI_DIST=${DIST} — the tarball would carry the first`);
    mkdirSync(LOCAL_DIST, { recursive: true }); staged = LOCAL_DIST;
    for (const p of PLATFORMS) copyFileSync(join(DIST, `intentguard.${p}.node`), join(LOCAL_DIST, `intentguard.${p}.node`));
  }
  return (addonsOk = DIST);
}
test.after(() => { if (staged) rmSync(staged, { recursive: true, force: true }); });

let packed;   // { dir, entry, bin } — the real tarball, extracted once
function unpack() {
  if (packed) return packed;
  addons();
  const dir = mkdtempSync(join(tmpdir(), 'intentguard-pack-'));
  const [info] = JSON.parse(npm(['pack', '--json', '--pack-destination', dir]));
  execFileSync('tar', ['-xzf', join(dir, info.filename), '-C', dir]);
  const pkg = JSON.parse(readFileSync(join(dir, 'package', 'package.json'), 'utf8'));
  packed = { dir, root: join(dir, 'package'), entry: join(dir, 'package', pkg.main), bin: join(dir, 'package', pkg.bin.intentguard) };
  return packed;
}
test.after(() => { if (packed) rmSync(packed.dir, { recursive: true, force: true }); });

// The addon's own card, required straight from the verified build — the bytes the package must reproduce.
const own = () => createRequire(import.meta.url)(join(addons(), `intentguard.${HOST}.node`));

// A fresh node that requires the packed entry and prints base64 of one call — a second process, so the packed
// addon and napi/dist's are never dlopen'd into the same one.
function viaPacked(entry, js, env = {}) {
  const r = spawnSync(process.execPath, ['-e', `const ig = require(${JSON.stringify(entry)}); const fx = JSON.parse(process.env.FX); process.stdout.write(Buffer.from(${js}).toString('base64'))`],
    { env: { ...process.env, INTENTGUARD_ADDON: '', ...env, FX: JSON.stringify({ on: fx('2-on'), spec: fx('2-spec') }) }, encoding: 'utf8', maxBuffer: 64 << 20 });
  assert.equal(r.status, 0, `the packed entry failed: ${r.stderr}`);
  return Buffer.from(r.stdout, 'base64');
}

test('1. package.json: intentguard at a 2.x version, with an entry and a bin', () => {
  assert.ok(existsSync(PKG), 'no package.json — intentguard 2.x is not a package any node can install');
  const pkg = JSON.parse(readFileSync(PKG, 'utf8'));
  assert.equal(pkg.name, 'intentguard');
  assert.match(pkg.version, /^2\.\d+\.\d+$/, `version ${pkg.version} is not 2.x`);
  assert.ok(pkg.main && existsSync(join(ROOT, pkg.main)), `the entry ${pkg.main} is not on disk`);
  assert.ok(pkg.bin && pkg.bin.intentguard && existsSync(join(ROOT, pkg.bin.intentguard)), 'no intentguard bin on disk');
});

test('2. npm pack --dry-run lists version 2.x and all four addons, the entry and the bin, and no build junk', () => {
  addons();
  const [info] = JSON.parse(npm(['pack', '--dry-run', '--json']));
  assert.equal(info.name, 'intentguard');
  assert.match(info.version, /^2\.\d+\.\d+$/, `packed version ${info.version} is not 2.x`);
  const files = info.files.map((f) => f.path);
  for (const p of PLATFORMS) assert.ok(files.includes(`napi/dist/intentguard.${p}.node`), `the tarball does not carry the ${p} addon: ${files.join(', ')}`);
  const pkg = JSON.parse(readFileSync(PKG, 'utf8'));
  for (const f of [pkg.main, pkg.bin.intentguard, 'package.json', 'LICENSE', 'README.md']) assert.ok(files.includes(f), `the tarball is missing ${f}`);
  const junk = files.filter((f) => /^(target|node_modules|napi\/target)\//.test(f));
  assert.deepEqual(junk, [], `the tarball carries build output: ${junk.join(', ')}`);
});

test(`3. the packed entry on this host (${HOST}) returns a card whose bytes equal the napi addon's own`, () => {
  const { entry } = unpack();
  const ig = own();
  const naked = viaPacked(entry, 'ig.card(fx.on)');
  assert.ok(naked.length > 100, 'the packed card is empty');
  assert.ok(naked.equals(Buffer.from(ig.card(fx('2-on')))), 'packed card(text) ≠ the addon\'s card(text)');
  const bulk = viaPacked(entry, 'ig.card(fx.on, fx.spec)');
  assert.ok(bulk.equals(Buffer.from(ig.card(fx('2-on'), fx('2-spec')))), 'packed card(text, bulk) ≠ the addon\'s card(text, bulk)');
  assert.ok(!naked.equals(bulk), 'the bulk did not reach the card');
  const where = viaPacked(entry, 'ig.addonPath');
  assert.ok(realpathSync(where.toString()).startsWith(realpathSync(dirname(entry))), `the packed entry loaded an addon from outside the package: ${where}`);
});

test('4. the packed bin writes the same card bytes; cardSigned verifies and carries the card as its payload', () => {
  const { entry, bin } = unpack();
  const ig = own();
  const r = spawnSync(process.execPath, [bin, '--card', '--text', fx('2-on'), '--bulk', fx('2-spec')], { env: { ...process.env, INTENTGUARD_ADDON: '' }, maxBuffer: 64 << 20 });
  assert.equal(r.status, 0, `the bin failed: ${r.stderr}`);
  assert.ok(r.stdout.equals(Buffer.from(ig.card(fx('2-on'), fx('2-spec')))), 'bin --card ≠ the addon\'s card');
  const signed = viaPacked(entry, 'ig.cardSigned(fx.on)', { INTENTGUARD_SIGNING_SEED: TEST_SEED });
  const card = Buffer.from(ig.card(fx('2-on')));
  assert.ok(signed.subarray(0, card.length).equals(card), 'the signed card does not start with the card');
  process.env.INTENTGUARD_SIGNING_SEED = TEST_SEED;
  assert.equal(ig.verify(signed).ok, true, 'the addon does not verify the packed cardSigned');
  const flipped = Buffer.from(signed); flipped[5] ^= 1;
  assert.equal(ig.verify(flipped).ok, false, 'a flipped bit still verifies');
});
