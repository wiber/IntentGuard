// robot/harness.js — `require('intentguard').createHarness` / `require('intentguard/robot/harness')`: THE REFERENCE ROBOT
// HARNESS (C494, R5 of docs/specs/intentguard-robot-ecosystem-spec.md). TAPE, NOT BRAKE.
//
//   withReceipt(action, fn)   places the action text against the spec opened ONCE (openSpec, C491), chains it (seq + prev
//                             inside the signed card line, C492), signs it with the key minted on this robot (robot/key.js,
//                             C493), appends the receipt to a local ndjson tape — all before fn runs — then runs fn and hands
//                             back fn's result. The post to the witness is queued, never awaited: nothing on the network
//                             sits between the robot and its action.
//   place(action)             the same receipt without fn (an LLM call placed after it returns)
//   flush(timeoutMs)          wait for the queued posts (tests and shutdown only)
//   stats()                   { placed, posted, unwitnessed, specSha256, tipSha256 } (+ pending, unmeasured)
//
// C593 THE LANE SIGNAL: with opts.tolerance (percent, the deployer's to declare) every receipted placement also carries
// lane: laneReading(card, tolerance) (lane.js — in_lane · out_of_lane · unmeasured), and opts.onOutOfLane(reading,
// placement) is called for an out_of_lane turn AFTER its row is on the tape and BEFORE fn runs. What the callback does is
// the deployer's; an error it throws is recorded in stats().lastError and never stops the placement path.
//
// It never blocks, filters or halts an action. There is no throw on the placement path: an addon that will not load or a
// placement that fails is written to the tape as an UNMEASURED row (receipt null, the reason named) and fn runs anyway. The
// halt is the deployer's to wire, from the tape — never this file's.
//
// Tape row (one per action):  { job?, seq, action, receipt, ts, spec_sha256, witnessed }
//   `witnessed` is the state at append time, and the append comes before any post, so every row is written false. What the
//   witness answered is appended to the sidecar `<tape>.witness` (ndjson, not named .ndjson so a tape reader that globs a
//   directory never mistakes it for tape): { seq, sha256, witnessed, status|error, tries, ts }. A receipt with no witnessed
//   sidecar row is unwitnessed; the count is stats().unwitnessed.
// Restart: seq and prev resume from the tape's last rows, so a restart is not a gap. An UNMEASURED row takes a seq and
// leaves prev where it was, so chain() over the tape counts it as a gap: the action happened, the receipt does not exist.
//
// SUFFICIENT FOR: "this robot placed and signed every action it took, in order, before taking it; which receipts the witness
// holds". NOT SUFFICIENT FOR: whether any action was good (Rice), or an action taken outside withReceipt/place.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const key = require('./key.js');
const { laneReading } = require('../lane.js');

const ROBOT_KIND = 'robot-receipt';
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const errText = (e) => String((e && e.message) || e);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// the last rows of the tape, read from the end in growing chunks: the last seq, and the last row that carries a receipt
function resumeFrom(tapePath) {
  let fd;
  try { fd = fs.openSync(tapePath, 'r'); } catch { return { lastSeq: -1, lastReceipt: null, rows: 0 }; }
  try {
    const size = fs.fstatSync(fd).size;
    let span = 64 * 1024, lastSeq = null, lastReceipt = null;
    while (true) {
      const start = Math.max(0, size - span);
      const buf = Buffer.alloc(size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      const lines = buf.toString('utf8').split('\n');
      if (start > 0) lines.shift();                                 // a partial first line: the next, larger chunk reads it whole
      for (let i = lines.length - 1; i >= 0; i--) {
        if (!lines[i].trim()) continue;
        let row; try { row = JSON.parse(lines[i]); } catch { continue; }   // a torn last write is skipped, never fatal
        if (lastSeq === null && Number.isInteger(row.seq)) lastSeq = row.seq;
        if (typeof row.receipt === 'string' && row.receipt) { lastReceipt = row.receipt; break; }
      }
      if (lastReceipt !== null || start === 0) break;
      span *= 4;
    }
    return { lastSeq: lastSeq === null ? -1 : lastSeq, lastReceipt };
  } finally { fs.closeSync(fd); }
}

function createHarness(opts = {}) {
  const { spec = '', tapePath, witnessUrl = null, licence = null, keyHome, job } = opts;
  const retry = { tries: 3, baseMs: 500, ...(opts.retry || {}) };
  const concurrency = Math.max(1, opts.concurrency || 8);
  const maxQueue = Math.max(1, opts.maxQueue || 10000);
  const postTimeoutMs = opts.postTimeoutMs || 30000;
  const fetchFn = opts.fetch || globalThis.fetch;
  const tape = path.resolve(tapePath || path.join(key.keyHome({ home: keyHome }), 'tape.ndjson'));
  const witnessLog = tape + '.witness';
  const bulk = String(spec);
  const tolerance = opts.tolerance === undefined || opts.tolerance === null ? null : opts.tolerance;
  const onOutOfLane = typeof opts.onOutOfLane === 'function' ? opts.onOutOfLane : null;
  const specSha = sha256(bulk);

  const st = { placed: 0, posted: 0, unwitnessed: 0, unmeasured: 0, tapeErrors: 0, lastError: null };
  let addon = null, handle = null, seedEnv = null, down = null;

  // ── open once: the addon, the spec handle, the robot key. Any failure is recorded in `down`, never thrown.
  try {
    addon = opts.addon || require('../index.js');
    handle = addon.openSpec(bulk);
    if (!handle || typeof handle.placeChained !== 'function') { down = 'UNMEASURED: the addon\'s spec handle has no placeChained (C492) — rebuild the addon'; handle = null; }
  } catch (e) { down = `UNMEASURED: ${errText(e)}`; handle = null; }
  try {
    key.mintKey({ home: keyHome });
    seedEnv = key.signingEnv({ home: keyHome });
  } catch (e) { down = down || `UNMEASURED: no robot key — ${errText(e)}`; seedEnv = null; }

  const receiptHash = (r) => {
    try { if (addon && typeof addon.receiptSha256 === 'function') return addon.receiptSha256(r); } catch { /* fall through */ }
    return sha256(r);
  };

  let resumed = { lastSeq: -1, lastReceipt: null };
  try { fs.mkdirSync(path.dirname(tape), { recursive: true }); resumed = resumeFrom(tape); }
  catch (e) { st.tapeErrors++; st.lastError = `tape unreadable: ${errText(e)}`; }
  let seq = resumed.lastSeq + 1;
  let prev = resumed.lastReceipt ? receiptHash(resumed.lastReceipt) : null;
  let tip = prev;

  const append = (file, row) => {
    try { fs.appendFileSync(file, JSON.stringify(row) + '\n'); return true; }
    catch (e) { st.tapeErrors++; st.lastError = `tape append failed: ${errText(e)}`; return false; }
  };

  // ── the witness queue: bounded, retried, never awaited by an action
  const queue = []; let inflight = 0; const waiters = [];
  const pending = () => queue.length + inflight;
  const settle = () => { if (pending() === 0) while (waiters.length) waiters.shift()(); };
  let registered = null;
  if (witnessUrl && licence) {
    const endpoint = opts.keysUrl || new URL('/api/notary/keys', witnessUrl).href;
    registered = key.registerKey({ endpoint, licence, fetch: fetchFn, home: keyHome }).catch((e) => ({ status: 0, error: errText(e) }));
  }

  async function postOnce(item) {
    const headers = { 'content-type': 'application/json' };
    if (licence) headers.authorization = `Bearer ${licence}`;
    const res = await fetchFn(witnessUrl, { method: 'POST', headers, body: JSON.stringify({ records: [{ kind: ROBOT_KIND, receipt: item.receipt }] }), signal: AbortSignal.timeout(postTimeoutMs) });
    try { await res.arrayBuffer(); } catch { /* the body is not ours to read */ }
    return res.status;
  }

  async function deliver(item) {
    if (registered) await registered;
    let tries = 0, status = null, error = null;
    while (tries < retry.tries) {
      tries++;
      try {
        status = await postOnce(item); error = null;
        if (status >= 200 && status < 300) break;
        if (status < 500 && status !== 429) break;                  // a refusal (403 unregistered key, 400) will not change on retry
      } catch (e) { status = null; error = errText(e); }
      if (tries < retry.tries) await sleep(retry.baseMs * 2 ** (tries - 1));
    }
    const ok = status !== null && status >= 200 && status < 300;
    if (ok) st.posted++; else st.unwitnessed++;
    append(witnessLog, { seq: item.seq, sha256: item.sha256, witnessed: ok, ...(error ? { error } : { status }), tries, ts: new Date().toISOString() });
  }

  function pump() {
    while (inflight < concurrency && queue.length) {
      const item = queue.shift(); inflight++;
      deliver(item).catch(() => { st.unwitnessed++; }).finally(() => { inflight--; pump(); settle(); });
    }
  }

  function enqueue(item) {
    if (!witnessUrl) { st.unwitnessed++; return; }                  // no witness configured: every receipt is on the tape only
    if (queue.length >= maxQueue) {                                  // bounded: the oldest queued post is dropped, its receipt stays on the tape
      const dropped = queue.shift(); st.unwitnessed++;
      append(witnessLog, { seq: dropped.seq, sha256: dropped.sha256, witnessed: false, error: `queue full (${maxQueue})`, tries: 0, ts: new Date().toISOString() });
    }
    queue.push(item); pump();
  }

  function place(action) {
    const text = String(action);
    const mySeq = seq++;
    const ts = new Date().toISOString();
    let receipt = null, reason = down;
    if (!reason) {
      const before = process.env[key.SEED_ENV];
      try {
        process.env[key.SEED_ENV] = seedEnv[key.SEED_ENV];
        receipt = Buffer.from(handle.placeChained(text, prev, mySeq)).toString('utf8');
      } catch (e) { reason = `UNMEASURED: placement failed — ${errText(e)}`; receipt = null; }
      finally { if (before === undefined) delete process.env[key.SEED_ENV]; else process.env[key.SEED_ENV] = before; }
    }
    const row = { ...(job !== undefined ? { job } : {}), seq: mySeq, action: text, receipt, ts, spec_sha256: specSha, witnessed: false };
    if (receipt === null) {
      st.unmeasured++; st.lastError = reason;
      append(tape, { ...row, unmeasured: reason });
      return { receipt: null, seq: mySeq, sha256: null, unmeasured: reason };
    }
    const h = receiptHash(receipt);
    prev = h; tip = h; st.placed++;
    append(tape, row);
    enqueue({ seq: mySeq, sha256: h, receipt });
    const placed = { receipt, seq: mySeq, sha256: h };
    if (tolerance !== null) {
      try { placed.lane = laneReading(receipt, tolerance); }
      catch (e) { st.lastError = `lane reading failed: ${errText(e)}`; }
      if (placed.lane && placed.lane.state === 'out_of_lane' && onOutOfLane) {
        try { onOutOfLane(placed.lane, placed); }
        catch (e) { st.lastError = `onOutOfLane threw: ${errText(e)}`; }
      }
    }
    return placed;
  }

  async function withReceipt(action, fn) {
    place(action);                                                   // synchronous: the receipt is on the tape before fn runs
    return fn();
  }

  function flush(timeoutMs = 30000) {
    return new Promise((resolve) => {
      const done = () => { clearTimeout(timer); resolve({ posted: st.posted, unwitnessed: st.unwitnessed, pending: pending() }); };
      const timer = setTimeout(done, timeoutMs); if (timer.unref) timer.unref();
      if (pending() === 0) done(); else waiters.push(done);
    });
  }

  function stats() {
    return { placed: st.placed, posted: st.posted, unwitnessed: st.unwitnessed, specSha256: handle && handle.specSha256 ? handle.specSha256 : specSha, tipSha256: tip,
      pending: pending(), unmeasured: st.unmeasured, tapeErrors: st.tapeErrors, down, lastError: st.lastError, tapePath: tape, witnessPath: witnessLog };
  }

  return { withReceipt, place, flush, stats };
}

module.exports = { createHarness, ROBOT_KIND };
