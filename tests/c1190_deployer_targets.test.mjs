// tests/c1190_deployer_targets.test.mjs — C1190 THE DEPLOYER'S OWN CATEGORIES THROUGH openSpec(bulk, targets).
// The worked example is examples/pipewell: a plumbing company's customer-service chatbot, its spec, five categories built from its own
// replies (three in scope, two it never sends), and fourteen replies — six plumber turns, two demolisher turns, then six held out
// (three of each) that share no wording with the categories. Run against the embedded vocabulary every one of these read UNMEASURED;
// against the deployer's categories the plumber turns earn green and NO demolisher turn does.
// Run: INTENTGUARD_ADDON=napi/intentguard.<plat>.node node --test --test-concurrency=2 tests/c1190_deployer_targets.test.mjs (or after the dist rebuild).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ig = require('../index.js');
const { buildLibrary, verdict } = require('../robot/library.js');
const ex = (f) => readFileSync(new URL(`../examples/pipewell/${f}`, import.meta.url), 'utf8');
const SPEC = ex('spec.md'); const CATS = JSON.parse(ex('categories.json')); const REPLIES = JSON.parse(ex('replies.json'));
const line = (b) => JSON.parse(String(b).split('\n')[0]);

test('no targets: the card is the embedded-vocabulary card and carries no targets_sha256', () => {
  const c = line(ig.openSpec(SPEC).card(REPLIES[0].text));
  assert.equal('targets_sha256' in c, false);
  assert.equal(JSON.stringify(c), JSON.stringify(line(ig.card(REPLIES[0].text, SPEC))));
});

test('a library that is not JSON is refused at open, never mid-run; a one-line rule is refused at build', () => {
  assert.throws(() => ig.openSpec(SPEC, '{not json'));
  assert.throws(() => buildLibrary([{ name: 'rule', in_scope: false, coord: 'A,A', examples: 'never demolish walls' }]), /real replies/);
});

test('with targets: every card names the library by sha256', () => {
  const h = ig.openSpec(SPEC, buildLibrary(CATS));
  assert.match(h.targetsSha256, /^[0-9a-f]{64}$/);
  assert.equal(line(h.card(REPLIES[0].text)).targets_sha256, h.targetsSha256);
});

test('the pipewell run: every in-sample plumber turn is in scope, and no demolisher turn is ever in scope', () => {
  const h = ig.openSpec(SPEC, buildLibrary(CATS));
  const v = REPLIES.map((r) => ({ ...r, ...verdict(h.card(r.text), CATS) }));
  for (const r of v.filter((x) => x.expect === 'out-of-scope')) assert.notEqual(r.state, 'in_scope', `false green: ${r.text.slice(0, 60)}`);
  for (const r of v.filter((x) => x.expect === 'in-scope' && !x.held_out)) assert.equal(r.state, 'in_scope', `plumber turn not green: ${r.text.slice(0, 60)}`);
});

test('the harness passes targets through: its cards carry the library sha', async () => {
  const { mkdtempSync, readFileSync: rf } = await import('node:fs'); const { tmpdir } = await import('node:os'); const { join } = await import('node:path');
  const { createHarness } = require('../robot/harness.js');
  const dir = mkdtempSync(join(tmpdir(), 'c1190-'));
  const h = createHarness({ spec: SPEC, targets: buildLibrary(CATS), tapePath: join(dir, 't.ndjson'), keyHome: join(dir, 'k') });
  await h.withReceipt(REPLIES[0].text, () => 'sent');
  const row = JSON.parse(rf(join(dir, 't.ndjson'), 'utf8').trim());
  assert.match(line(row.receipt).targets_sha256 || '', /^[0-9a-f]{64}$/);
});

test('C1191 intentguard --try: the pipewell run prints every reply and the three checks, and exits 0 (no false green)', async () => {
  const { tryIt } = require('../robot/try.js');
  let text = ''; const code = await tryIt(undefined, { ig, out: { write: (s) => { text += s; } } });
  assert.equal(code, 0, text);
  assert.equal((text.match(/^ {2}(GREEN|FLAGGED|NOT GREEN) /gm) || []).length, REPLIES.length);
  assert.match(text, /after the fact .*: caught/); assert.match(text, /a counted gap at seq \d+: caught/); assert.match(text, /same bytes (\d+)\/\1/);
  assert.match(text, /did not earn green: your categories hold no replies like/);
});
