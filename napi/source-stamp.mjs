#!/usr/bin/env node
// napi/source-stamp.mjs — C481 WHICH SOURCE WERE THESE ADDONS BUILT FROM?
//
// napi/dist/*.node are build artefacts (gitignored), so a checkout of a commit does not carry them and a guard that
// reads them must be told where a build lives. That is only honest when the build is of THE SAME SOURCE the guard is
// judging. This file is the one definition of "the same source" — build-all.sh stamps with it, the guard checks with it:
//
//   sourceHash(root)   sha256 over every file the addon compiles from (the crate and napi/ manifests, lockfiles,
//                      build scripts, src/, vendor/, data/), path + content, sorted — read from DISK, so it is the
//                      same number for a working tree and for a `git archive` extract of a commit with those bytes
//   napi/dist/BUILD-STAMP.json   { source, addons: { <platform>: sha256(.node) } } — written by build-all.sh for the
//                      legs it actually built; a leg that SKIPPED is absent, a stale .node from an older build does not
//                      match its hash
//
// SUFFICIENT FOR: these .node files were produced by a build that read these source bytes (as far as the stamp that the
// build wrote says). NOT SUFFICIENT FOR: whether the toolchain was honest or the binary is right (Rice).
//
// Usage:
//   node napi/source-stamp.mjs [root]                             print sourceHash(root)
//   node napi/source-stamp.mjs --write <source> <platform>...     stamp napi/dist for the platforms just built
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCES = ['Cargo.toml', 'Cargo.lock', 'build.rs', 'src', 'vendor', 'data', 'napi/Cargo.toml', 'napi/Cargo.lock', 'napi/build.rs', 'napi/src'];
export const PLATFORMS = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64'];
export const STAMP = 'BUILD-STAMP.json';

const sha = (b) => createHash('sha256').update(b).digest('hex');

function walk(root, rel, out) {
  const abs = join(root, rel);
  if (!existsSync(abs)) return;
  if (statSync(abs).isDirectory()) {
    for (const n of readdirSync(abs).sort()) if (!n.startsWith('.') && n !== 'target') walk(root, `${rel}/${n}`, out);
  } else out.push(`${rel}\0${sha(readFileSync(abs))}\n`);
}

export function sourceHash(root) {
  const lines = [];
  for (const s of SOURCES) walk(root, s, lines);
  return sha(lines.sort().join(''));
}

export const addonHash = (file) => sha(readFileSync(file));

/** Stamp `dist` for `built` platforms under `source`. Entries kept from an earlier stamp of the SAME source only while their file still matches. */
export function writeStamp(dist, source, built) {
  let prev = {};
  try { const s = JSON.parse(readFileSync(join(dist, STAMP), 'utf8')); if (s.source === source) prev = s.addons || {}; } catch { /* none yet */ }
  const addons = {};
  for (const p of PLATFORMS) {
    const f = join(dist, `intentguard.${p}.node`);
    if (!existsSync(f)) continue;
    const h = addonHash(f);
    if (built.includes(p) || prev[p] === h) addons[p] = h;
  }
  writeFileSync(join(dist, STAMP), JSON.stringify({ source, addons }, null, 2) + '\n');
  return addons;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  if (args[0] === '--write') {
    const [, source, ...built] = args;
    const now = sourceHash(root);
    if (now !== source) { console.error(`NOT STAMPED: the source changed during the build (${source.slice(0, 12)} → ${now.slice(0, 12)}) — run napi/build-all.sh again`); process.exit(1); }
    const a = writeStamp(join(root, 'napi', 'dist'), source, built);
    console.log(`STAMPED source ${source.slice(0, 12)}: ${Object.keys(a).join(', ') || 'no addon'}`);
  } else {
    console.log(sourceHash(args[0] ? resolve(args[0]) : root));
  }
}
