#!/usr/bin/env node
// bin/intentguard.js — the npm bin: `intentguard --card [--text T | stdin] [--bulk T] [--sign]`, the same bytes
// the crate's CLI writes for --card, through the addon index.js loads for this host. `--verify-receipt <file>`
// checks a signed card. Everything else lives in the Rust CLI (cargo build --release; see README.md).
'use strict';
const { readFileSync } = require('node:fs');
const ig = require('..');

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined; };
const die = (msg) => { process.stderr.write(`intentguard: ${msg}\n`); process.exit(1); };
const USAGE = `intentguard (npm) — the card, in-process, through the napi addon for ${process.platform}-${process.arch}

  --card [--text T | stdin] [--bulk T] [--sign]   ONE canonical byte-reproducible artifact (the CLI's --card bytes)
  --verify-receipt <file>                         re-hash a signed card and check its attestation line

The rest (--lens, --ballistic, panels, probes) is the Rust CLI: cargo build --release.
`;

if (!args.length || args.includes('--help') || args.includes('-h')) { process.stdout.write(USAGE); process.exit(0); }
if (ig.unavailable) die(`UNMEASURED: ${ig.unavailable}`);

try {
  if (args.includes('--card')) {
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
    die(`unknown arguments: ${args.join(' ')} (this bin carries --card and --verify-receipt; see --help)`);
  }
} catch (e) {
  die(e && e.message ? e.message : String(e));
}
