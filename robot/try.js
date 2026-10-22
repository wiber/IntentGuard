// robot/try.js — C1191 `intentguard --try [dir]`: THE FIRST FIVE MINUTES, IN THE DEPLOYER'S OWN WORLD.
// With no dir it plays examples/pipewell (a plumbing company's support chatbot); with a dir it plays YOURS — the same three files:
// spec.md (what the agent is for), categories.json (a few named categories, each with real example replies, in or out of scope),
// replies.json (the turns to place). Every reply goes through the robot harness onto a signed, chained tape; then the three checks a
// stranger can run without trusting us: edit a reply after the fact, delete one from the tape, re-run from the record.
// Prints one line per reply and one per check. Exit 0 when no reply you marked out-of-scope read green; 3 when one did.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildLibrary, verdict } = require('./library.js');
const { createHarness } = require('./harness.js');

const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s).padEnd(n);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const card = (receipt) => JSON.parse(String(receipt).split('\n')[0]);

async function tryIt(dir, { ig = require('../index.js'), out = process.stdout } = {}) {
  const d = dir ? path.resolve(dir) : path.join(__dirname, '..', 'examples', 'pipewell');
  const read = (f) => fs.readFileSync(path.join(d, f), 'utf8');
  const spec = read('spec.md'); const cats = JSON.parse(read('categories.json')); const replies = JSON.parse(read('replies.json'));
  const targets = buildLibrary(cats);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intentguard-try-'));
  const tapePath = path.join(tmp, 'tape.ndjson');
  const h = createHarness({ spec, targets, tapePath, keyHome: path.join(tmp, 'key'), addon: ig });
  const w = (s) => out.write(s + '\n');
  w(`${spec.split('\n')[0]}`);
  w(`${cats.filter((c) => c.in_scope).length} in-scope and ${cats.filter((c) => !c.in_scope).length} out-of-scope categories, built from your own replies. Green is earned, never the default.\n`);
  let falseGreen = 0, quietGood = 0;
  for (const r of replies) {
    await h.withReceipt(r.text, () => 'sent');
    const row = fs.readFileSync(tapePath, 'utf8').trim().split('\n').pop();
    const v = row && JSON.parse(row).receipt ? verdict(JSON.parse(row).receipt, cats) : { state: 'unmeasured', category: null };
    const label = v.state === 'in_scope' ? `GREEN      ${v.category}` : v.state === 'flagged' ? `FLAGGED    ${v.category}` : 'NOT GREEN  unmeasured';
    if (v.state === 'in_scope' && r.expect === 'out-of-scope') falseGreen++;
    if (v.state !== 'in_scope' && r.expect === 'in-scope') quietGood++;
    w(`  ${label.padEnd(26)} "${short(r.text, 64)}"${r.expect === 'out-of-scope' ? '  ← should never be green' : ''}`);
  }
  const rows = fs.readFileSync(tapePath, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const receipts = rows.map((x) => x.receipt).filter(Boolean);
  const i = Math.min(rows.length - 1, Math.max(0, replies.findIndex((r) => r.expect === 'out-of-scope')));
  const edited = rows[i].action + ' (edited)';
  w('');
  w(`  Edit reply ${i + 1} after the fact  → its hash no longer matches the signed record: ${card(rows[i].receipt).input_sha256 === sha(edited) ? 'MISSED' : 'caught'}`);
  const gap = ig.chain(receipts.filter((_, k) => k !== i));
  w(`  Delete reply ${i + 1} from the tape  → ${gap.gapCount ? `a counted gap at seq ${gap.gaps.join(',')}: caught` : 'MISSED'}`);
  const hs = ig.openSpec(spec, targets); const strip = (o) => { const x = { ...o }; delete x.seq; delete x.prev; return JSON.stringify(x); };
  const same = rows.filter((x) => x.receipt && strip(card(hs.card(x.action))) === strip(card(x.receipt))).length;
  w(`  Re-run every reply from the record → same bytes ${same}/${receipts.length}`);
  w('');
  w(falseGreen ? `${falseGreen} reply you marked out of scope read GREEN — add replies like it to an out-of-scope category and run again.`
               : 'No reply you marked out of scope read green.');
  if (quietGood) w(`${quietGood} good repl${quietGood === 1 ? 'y' : 'ies'} did not earn green: your categories hold no replies like ${quietGood === 1 ? 'it' : 'them'} yet. Add your own past replies and run again.`);
  w(dir ? `Tape: ${tapePath}` : `Now yours: copy ${d} to a folder, replace the three files with your agent's, run  intentguard --try <folder>`);
  return falseGreen ? 3 : 0;
}

module.exports = { tryIt };
