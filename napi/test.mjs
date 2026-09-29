// napi/test.mjs — the addon is the CLI, in-process. Run: napi/build.sh && node napi/test.mjs
//
// 1. lens(): the addon's placement of a thesis fixture equals `intentguard --lens` on the same text, byte for
//    byte after stripping only the wall-clock fields (seed_gzip_us, walk_ms, elapsed_ms) — naked and with the
//    spec as bulk.
// 2. walk(): equals `--ballistic` byte for byte on the same grid.
// 3. sign()/verify(): with INTENTGUARD_SIGNING_SEED set, a receipt signs and verifies in-process, the CLI's
//    --verify-receipt accepts it, and one flipped bit is rejected.
// 4. card()/cardSigned(): the addon's card equals `intentguard --card` byte for byte (no strip — the card
//    has no wall-clock fields at all), naked and with the spec as bulk; cardSigned() verifies via verify().
// Exit 0 = all hold; 1 = a check failed (printed).
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { createHash, createPublicKey, createPrivateKey } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const addonPath = join(here, `intentguard.${process.platform}-${process.arch}.node`);
if (!existsSync(addonPath)) { console.error(`missing ${addonPath} — run napi/build.sh first`); process.exit(1); }
const ig = createRequire(import.meta.url)(addonPath);
const BIN = [join(ROOT, 'target/release/intentguard'), join(ROOT, 'target/debug/intentguard')].find(existsSync);
if (!BIN) { console.error('missing the CLI — cargo build --release first'); process.exit(1); }

const fx = (n) => readFileSync(join(ROOT, 'tests/fixtures', `${n}.txt`), 'utf8');
const strip = (s) => s.replace(/"(seed_gzip_us|walk_ms|elapsed_ms)":[0-9.eE+-]+/g, '"$1":X');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const cli = (args, env = {}) => spawnSync(BIN, args, { env: { ...process.env, ...env }, maxBuffer: 1 << 28 });
let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`); if (!ok) failed++; };

// 1. lens
for (const [name, bulk] of [['2-on', null], ['2-on', fx('2-spec')], ['1-off', null]]) {
  const fromAddon = strip(ig.lens(fx(name), bulk ?? undefined) + '\n');
  const r = cli(['--lens', '--text', fx(name), '--repo', ROOT, ...(bulk ? ['--bulk', bulk] : [])]);
  const fromCli = strip(r.stdout.toString('utf8'));
  check(`lens ${name}${bulk ? ' (bulk=spec)' : ''} == CLI`, r.status === 0 && fromAddon === fromCli, `sha256 ${sha(fromAddon).slice(0, 16)} vs ${sha(fromCli).slice(0, 16)} (${fromAddon.length} bytes)`);
}

// 2. walk
const placed = JSON.parse(ig.lens(fx('1-on')));
const labels = JSON.parse(cli(['--shortlex']).stdout.toString());
const grid = labels.map((l) => (placed.walked.includes(l) ? 1 : 0));
const dir = mkdtempSync(join(tmpdir(), 'intentguard-napi-'));
writeFileSync(join(dir, 'grid.json'), JSON.stringify(grid));
const walkAddon = ig.walk(grid, placed.pixel, 3) + '\n';
const walkCli = cli(['--ballistic', '--grid', join(dir, 'grid.json'), '--start', placed.pixel, '--max-depth', '3']).stdout.toString('utf8');
check('walk == CLI --ballistic', walkAddon === walkCli, `sha256 ${sha(walkAddon).slice(0, 16)} (${walkAddon.length} bytes)`);

// 3. sign / verify with a supplied seed (a fixed TEST seed, never a real key)
const SEED = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
process.env.INTENTGUARD_SIGNING_SEED = SEED;
const receipt = ig.signReceipt(walkAddon);
const v = ig.verify(receipt);
// the seed's own public key, computed by node:crypto from the PKCS#8 wrap of the raw seed
const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.from(SEED, 'hex')]);
const expectPk = createPublicKey(createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' })).export({ format: 'der', type: 'spki' }).subarray(12).toString('base64');
check('signReceipt → verify ok, signer = the seed\'s key', v.ok && v.pubkeyB64 === expectPk && v.payloadBytes === Buffer.byteLength(walkAddon), JSON.stringify(v));
const att = JSON.parse(receipt.toString('utf8').trimEnd().split('\n').pop()).attestation;
check('attestation names its root and this .node file', att.hw === 'env-seed' && att.binary_sha256 === sha(readFileSync(addonPath)), `hw=${att.hw} binary_sha256=${att.binary_sha256.slice(0, 16)}`);
check('seed never printed', !receipt.toString('utf8').includes(SEED));
writeFileSync(join(dir, 'receipt.txt'), receipt);
const cv = cli(['--verify-receipt', join(dir, 'receipt.txt')]);
check('CLI --verify-receipt accepts the addon\'s receipt', cv.status === 0, cv.stdout.toString().trim());
const forged = Buffer.from(receipt); forged[10] ^= 1;
const fv = ig.verify(forged);
check('one flipped bit is rejected', !fv.ok, fv.reason ?? '');
const line = ig.sign('hello\n');
check('sign(payload) returns one attestation line', JSON.parse(line).attestation.payload_sha256 === sha('hello\n'));

// 4. card() / cardSigned() — the embedded-vocabulary artifact, byte for byte against `--card` (no strip:
// the card carries no wall-clock field at all).
for (const [name, bulk] of [['2-on', null], ['2-on', fx('2-spec')], ['1-off', null]]) {
  const fromAddon = ig.card(fx(name), bulk ?? undefined).toString('utf8');
  const r = cli(['--card', '--text', fx(name), ...(bulk ? ['--bulk', bulk] : [])]);
  const fromCli = r.stdout.toString('utf8');
  check(`card ${name}${bulk ? ' (bulk=spec)' : ''} == CLI --card`, r.status === 0 && fromAddon === fromCli, `sha256 ${sha(fromAddon).slice(0, 16)} vs ${sha(fromCli).slice(0, 16)} (${fromAddon.length} bytes)`);
}
const cardReceipt = ig.cardSigned(fx('2-on'), fx('2-spec'));
const cardVerdict = ig.verify(cardReceipt);
check('cardSigned() → verify ok', cardVerdict.ok && cardVerdict.pubkeyB64 === expectPk, JSON.stringify(cardVerdict));
const cardBody = JSON.parse(cardReceipt.toString('utf8').split('\n')[0]);
check('card payload parses as the card object', cardBody.v === 'intentguard-card/1' && cardBody.engine.crate === 'intentguard');

console.log(failed ? `${failed} check(s) FAILED` : 'all checks hold');
process.exit(failed ? 1 : 0);
