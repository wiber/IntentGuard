#!/usr/bin/env node
// bin/intentguard.js — the npm bin: `intentguard --card [--text T | stdin] [--bulk T] [--sign]`, the same bytes
// the crate's CLI writes for --card, through the addon index.js loads for this host. `--verify-receipt <file>`
// checks a signed card. `--lane --tolerance PCT` (C593) writes the same card and EXITS with the turn's lane state —
// 0 in lane · 3 out of lane · 4 unmeasured — with one JSON event line on stderr for 3 and 4 (lane.js). The halt is
// yours to wire: what a process manager does with exit 3 is the deployer's, and nothing here does it. Documented in LANE.md.
// Everything else lives in the Rust CLI (cargo build --release; see README.md).
'use strict';
const { readFileSync } = require('node:fs');
const ig = require('..');
const { laneReading, eventLine } = require('../lane.js');

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined; };
const die = (msg) => { process.stderr.write(`intentguard: ${msg}\n`); process.exit(1); };
const USAGE = `intentguard (npm) — the card, in-process, through the napi addon for ${process.platform}-${process.arch}

  --card [--text T | stdin] [--bulk T] [--sign]   ONE canonical byte-reproducible artifact (the CLI's --card bytes)
  --verify-receipt <file>                         re-hash a signed card and check its attestation line
  --lane --tolerance PCT [--card-file F | --text T | stdin] [--bulk T] [--sign]
                                                  the card on stdout, and the turn's lane state as the exit code:
                                                  0 in lane · 3 out of lane · 4 unmeasured (1 = error), with one
                                                  JSON line on stderr for 3 and 4: {"event":"intentguard.out_of_lane",...}
                                                  The tolerance is yours to declare; the halt is yours to wire (LANE.md).

The rest (--lens, --ballistic, panels, probes) is the Rust CLI: cargo build --release.
`;

if (!args.length || args.includes('--help') || args.includes('-h')) { process.stdout.write(USAGE); process.exit(0); }
const needsAddon = !(args.includes('--lane') && flag('--card-file') !== undefined);
if (ig.unavailable && needsAddon) die(`UNMEASURED: ${ig.unavailable}`);

try {
  if (args.includes('--lane')) {
    const tol = flag('--tolerance');
    if (tol === undefined) die('--lane needs --tolerance <percent> — the tolerance is yours to declare, there is no default');
    const file = flag('--card-file');
    let out;
    if (file !== undefined) out = readFileSync(file);
    else {
      const text = flag('--text') ?? readFileSync(0, 'utf8');
      const bulk = flag('--bulk');
      out = args.includes('--sign') ? ig.cardSigned(text, bulk) : ig.card(text, bulk);
    }
    const reading = laneReading(out, tol);
    process.stdout.write(out);
    const line = eventLine(reading);
    if (line) process.stderr.write(line + '\n');
    process.exitCode = reading.exit;
  } else if (args.includes('--card')) {
    const text = flag('--text') ?? readFileSync(0, 'utf8');
    const bulk = flag('--bulk');
    process.stdout.write(args.includes('--sign') ? ig.cardSigned(text, bulk) : ig.card(text, bulk));
  } else if (args.includes('--verify-receipt')) {
    const file = flag('--verify-receipt');
    if (!file) die('--verify-receipt needs a file');
    const v = ig.verify(readFileSync(file));
    process.stdout.write(JSON.stringify(v) + '\n');
    process.exit(v.ok ? 0 : 1);
  } else {
    die(`unknown arguments: ${args.join(' ')} (this bin carries --card, --lane and --verify-receipt; see --help)`);
  }
} catch (e) {
  die(e && e.message ? e.message : String(e));
}
