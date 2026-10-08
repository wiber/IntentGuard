// tests/no-infinity-family.test.mjs — INTENTGUARD TOO (operator 2026-10-08, verbatim: "Intent guard
// too"): the sibling thetadrivencoach repo retracted a family of overclaims about the 144x144 lattice
// (Katz centrality tied to a 0.05 damping constant, a pole at or just below one-twelfth, the "2.45"
// two-instruments handshake, and phase transition/lasing/ignition language) and replaced them with
// the grounding lead — "we do not own an infinity, we own the finite floor that stops one; every
// definition ends at an address within four steps, the same address on every machine (Harnad 1990,
// the dictionary regress, halted)." This repo IS that floor (ballistic.rs's CELLS = 20_736), so it
// gets the same sweep: the family must never land here, and the lead must be carried where the
// claim is made (README.md).
//
// Swept surfaces: README.md, docs/SHORTLEX-TEST-COVERAGE.md, and every crate doc comment
// (`// ` / `//! ` / `/// ` lines in src/**/*.rs).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(REPO, p), 'utf8');

function listRustFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...listRustFiles(p));
    else if (name.endsWith('.rs')) out.push(p);
  }
  return out;
}

// Each entry: [name, regex]. All regexes are anchored to the SPECIFIC claim (a number or term
// tied to its partner word), never a bare word that could land here for an unrelated reason.
export const FAMILY_PATTERNS = [
  ['katz-at-0.05', /\bkatz\b[\s\S]{0,120}\b0\.0[45]\d*\b|\b0\.0[45]\d*\b[\s\S]{0,120}\bkatz\b/i],
  ['pole-at-or-below-one-twelfth', /\bpole\b[\s\S]{0,120}(one[- ]twelfth|1\s*\/\s*12|0\.0[48]\d*)/i],
  ['2.45-two-instruments-handshake', /\b2\.45\d*\b[\s\S]{0,60}\bhandshake\b|\bhandshake\b[\s\S]{0,60}\b2\.45\d*\b/i],
  ['phase-transition-lasing-or-ignition', /\b(phase transition|lasing|ignition)\b/i],
];

export function familyViolations(text) {
  const hits = [];
  for (const [name, re] of FAMILY_PATTERNS) if (re.test(text)) hits.push(name);
  return hits;
}

test('firing: familyViolations catches each pattern on a synthetic bad string', () => {
  assert.deepEqual(familyViolations('the receipt rests on Katz centrality at damping 0.05'), ['katz-at-0.05']);
  assert.deepEqual(familyViolations('the spectral pole sits just below one-twelfth'), ['pole-at-or-below-one-twelfth']);
  assert.deepEqual(familyViolations('the 2.45 two-instruments handshake proves it'), ['2.45-two-instruments-handshake']);
  assert.deepEqual(familyViolations('the lattice undergoes a phase transition'), ['phase-transition-lasing-or-ignition']);
  assert.deepEqual(familyViolations('a wholly unrelated sentence about ballistic walks'), []);
});

test('firing: a bare test-timing line ("Time: 2.456 s") is never mistaken for the handshake', () => {
  assert.deepEqual(familyViolations('Time:        2.456 s\nTests:       112 passed'), []);
});

test('README.md carries the grounding lead and none of the retracted family', () => {
  const text = read('README.md');
  assert.deepEqual(familyViolations(text), [], 'README.md must never carry the retracted family');
  assert.match(text, /finite floor/i, 'README states the lead: we own the finite floor, not an infinity');
  assert.match(text, /dictionary regress/i, 'README names the halted regress (Harnad 1990)');
  assert.match(text, /Harnad/, 'README cites Harnad 1990');
});

// docs/SHORTLEX-TEST-COVERAGE.md is a gitignored pre-2.0 leftover (.gitignore: "kept on disk and out of
// the tree") — it is never in any commit, so a commit-archive witness (external-guard.mjs, AXIOM 1 W3)
// always reads it absent. Skip rather than ENOENT when it is not on this disk; check it when it is.
const COVERAGE_DOC = resolve(REPO, 'docs/SHORTLEX-TEST-COVERAGE.md');
test('docs/SHORTLEX-TEST-COVERAGE.md carries none of the retracted family', { skip: existsSync(COVERAGE_DOC) ? false : 'not on this disk (gitignored leftover, absent from every commit)' }, () => {
  assert.deepEqual(familyViolations(readFileSync(COVERAGE_DOC, 'utf8')), []);
});

test('every crate doc comment (src/**/*.rs) carries none of the retracted family', () => {
  const offenders = [];
  for (const file of listRustFiles(resolve(REPO, 'src'))) {
    const lines = readFileSync(file, 'utf8').split('\n');
    const docLines = lines.filter((l) => /^\s*\/\/(\/|!)?\s/.test(l));
    const hits = familyViolations(docLines.join('\n'));
    if (hits.length) offenders.push(`${file}: ${hits.join(', ')}`);
  }
  assert.deepEqual(offenders, [], `crate doc comments carry the retracted family: ${offenders.join('; ')}`);
});
