// lane.js — `require('intentguard').laneReading` / `require('intentguard/lane')`: C593 THE OUT-OF-LANE READING AS A
// SIGNAL A DEPLOYER WIRES. The halt is yours to wire; this file only reads the card and says which of three states it is in.
//
//   laneReading(card, tolerancePct)  → { state, event, exit, off_pct, out_of_role, walked, tolerance_pct, pixel, input_sha256, bulk_sha256, why? }
//
// THE THREE STATES (one card, one tolerance the deployer declares — there is no default, because a tolerance this file
// picked would be a number nobody declared):
//   in_lane       the placement is admissible and off_pct < tolerance       exit 0   no event
//   out_of_lane   the placement is admissible and off_pct >= tolerance      exit 3   event "intentguard.out_of_lane"
//   unmeasured    the seed's own null test does not admit the placement,    exit 4   event "intentguard.unmeasured"
//                 or the card carries no walked cells
// off_pct is the card's own partition, the same quantity fleet-reading.mjs and walk-door.mjs read:
//   100 · |out_of_role| / (|in_role| + |out_of_role|)
// and "admissible" is card.seed_fit.better_than_random. An unmeasured card is never read as in lane: zero is a
// measurement, and an inadmissible placement has measured nothing.
//
// SUFFICIENT FOR: where this turn landed against the lane the spec declared, as a decidable state a process manager can
// act on. NOT SUFFICIENT FOR: whether the turn was good (Rice), or anything the agent did outside a placed turn. What a
// deployer does with exit 3 — page someone, pause a queue, stop a container — is theirs; nothing here does any of it.
'use strict';

const EVENTS = Object.freeze({ OUT_OF_LANE: 'intentguard.out_of_lane', UNMEASURED: 'intentguard.unmeasured' });
const EXIT = Object.freeze({ IN_LANE: 0, ERROR: 1, OUT_OF_LANE: 3, UNMEASURED: 4 });

/** The card object from a card buffer/string or a receipt (the card is its first line), or a parsed card. */
function cardOf(x) {
  if (x && typeof x === 'object' && !Buffer.isBuffer(x)) return x;
  const first = String(x).split('\n').find((l) => l.trim());
  if (!first) throw new Error('empty card');
  return JSON.parse(first);
}

function laneReading(input, tolerancePct) {
  const tol = Number(tolerancePct);
  if (tolerancePct === undefined || tolerancePct === null || tolerancePct === '' || !Number.isFinite(tol) || tol < 0 || tol > 100) {
    throw new Error('a tolerance in percent (0–100) is required — it is the deployer\'s to declare, there is no default');
  }
  const card = cardOf(input);
  const inN = Array.isArray(card.in_role) ? card.in_role.length : 0;
  const outN = Array.isArray(card.out_of_role) ? card.out_of_role.length : 0;
  const walked = inN + outN;
  const admissible = !!(card.seed_fit && card.seed_fit.better_than_random === true);
  const base = { tolerance_pct: tol, out_of_role: outN, walked, admissible, pixel: card.pixel ?? null,
    input_sha256: card.input_sha256 ?? null, bulk_sha256: card.bulk_sha256 ?? null };
  if (!admissible || walked === 0) {
    const why = !admissible ? 'the seed\'s own null test does not admit this placement' : 'the card has no walked cells';
    return { state: 'unmeasured', event: EVENTS.UNMEASURED, exit: EXIT.UNMEASURED, off_pct: null, ...base, why };
  }
  const off = (100 * outN) / walked;
  const offPct = Math.round(off * 100) / 100;
  if (off >= tol) return { state: 'out_of_lane', event: EVENTS.OUT_OF_LANE, exit: EXIT.OUT_OF_LANE, off_pct: offPct, ...base };
  return { state: 'in_lane', event: null, exit: EXIT.IN_LANE, off_pct: offPct, ...base };
}

/** The one stderr line the CLI writes for a reading that carries an event, or null for in_lane. */
function eventLine(reading) {
  if (!reading.event) return null;
  const { event, ...rest } = reading;
  return JSON.stringify({ event, ...rest });
}

module.exports = { laneReading, eventLine, cardOf, EVENTS, EXIT };
