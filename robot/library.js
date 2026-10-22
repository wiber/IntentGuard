// robot/library.js — C1190 THE DEPLOYER'S OWN CATEGORIES, AS THE 144-ANCHOR LIBRARY openSpec(bulk, targets) READS.
// A deployer writes a handful of named categories, each with REAL example replies (their own approved and refused work, in the
// register of the work being placed — META-BULK: naked one-line rules are length noise, so a category under MIN_EXAMPLE_CHARS is
// refused here, never placed). Each category sits at one coordinate; every other anchor is empty, so nothing of ours is in the
// vocabulary a deployer's work lands on.
//   buildLibrary(categories) → the JSON text for openSpec(spec, targets)
//   verdict(card, categories) → 'in_scope' (admitted, top seed on an in-scope category) · 'flagged' (admitted elsewhere)
//                               · 'unmeasured' (the null test did not admit it). Green is earned, never defaulted.
// SUFFICIENT FOR: which of YOUR declared categories a turn landed on, re-runnable from (text, spec, categories). NOT: whether the
// turn was good (Rice). An unmeasured turn is never in scope.
'use strict';
const RANKS = ['A', 'B', 'C', 'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];   // ShortLex, the order the lattice indexes
const BASE = RANKS.flatMap((row) => RANKS.map((col) => ({ coord: `${row},${col}`, row, col })));
const MIN_EXAMPLE_CHARS = 300;

function buildLibrary(categories) {
  if (!Array.isArray(categories) || !categories.length) throw new Error('categories: a non-empty array of { name, in_scope, coord, examples }');
  const byCoord = new Map();
  for (const c of categories) {
    if (!c || typeof c.examples !== 'string' || !c.coord) throw new Error(`category ${c && c.name}: needs coord and examples`);
    if (c.examples.length < MIN_EXAMPLE_CHARS) throw new Error(`category ${c.name}: ${c.examples.length} chars of examples, under ${MIN_EXAMPLE_CHARS} — give it real replies, not a rule`);
    if (byCoord.has(c.coord)) throw new Error(`category ${c.name}: coord ${c.coord} already holds ${byCoord.get(c.coord).name}`);
    if (!BASE.some((a) => a.coord === c.coord)) throw new Error(`category ${c.name}: ${c.coord} is not one of the 144 coordinates`);
    byCoord.set(c.coord, c);
  }
  return JSON.stringify(BASE.map((a) => ({ coord: a.coord, row: a.row, col: a.col, snippet: byCoord.has(a.coord) ? byCoord.get(a.coord).examples : '' })));
}

function verdict(card, categories) {
  const c = typeof card === 'string' || Buffer.isBuffer(card) ? JSON.parse(String(card).split('\n')[0]) : card;
  if (!c || !c.ratchet || !c.ratchet.admissible) return { state: 'unmeasured', category: null };
  const top = (c.seed_coords || [])[0];
  const cat = categories.find((k) => k.coord === top) || null;
  return { state: cat && cat.in_scope ? 'in_scope' : 'flagged', category: cat ? cat.name : top };
}

module.exports = { buildLibrary, verdict, MIN_EXAMPLE_CHARS };
