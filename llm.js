// llm.js — `require('intentguard/llm')`: ANY LLM WORKLOAD WRITES RECEIPTS (C498). The robot harness (C494,
// robot/harness.js) generalised to the model call: the call runs first and untouched, and when it returns its prompt and
// completion are placed against the declared spec, chained and signed, and appended to a local tape. TAPE, NOT BRAKE —
// nothing here blocks, filters, rewrites or halts a call.
//
//   receiptMiddleware({ spec, tape?, witness?, ... })   an AI SDK LanguageModelV1Middleware for wrapLanguageModel (the
//                             `ai` package): wrapGenerate places once doGenerate returns; wrapStream hands the provider's
//                             stream through a pass-through transform (every chunk forwarded as the same object, in order)
//                             and places once the stream finishes. Any provider behind the AI SDK.
//   placeLLM({ spec, prompt, completion, model, ... })  the same placement for any other client (OpenAI, Anthropic, fetch):
//                             call it after the model answered. Returns { receipt, seq, sha256 } or { unmeasured }.
//   flushAfterResponse(ms)    on Vercel, hands the queued witness posts to the request's waitUntil (the platform keeps the
//                             function alive after the response); elsewhere a no-op. The answer never waits for a post.
//   unavailable               null, or the UNMEASURED reason this runtime cannot place (the Edge runtime: a .node addon
//                             cannot load there). Said at import — never a silent pass.
//
// One harness per (spec sha, tape, witness, signer, addon), held at module scope: a warm serverless instance opens the spec
// once (openSpec, C491) and keeps one chain (placeChained, C492) across requests.
//
// SIGNING: the seed comes from `seed` or INTENTGUARD_SIGNING_SEED (on Vercel: a project env var), else a robot key minted
// on the device (`keyHome` or INTENTGUARD_HOME, C493). With none of them the call still returns its answer and the
// placement is UNMEASURED: "no signing seed". An addon without openSpec (the addon pinned before C491) places UNMEASURED
// with that reason — never a fallback walk in JS.
//
// SUFFICIENT FOR: "every model call through this module was placed, in order, against the spec declared before it ran, and
// signed". NOT SUFFICIENT FOR: whether any answer was right (Rice), or a model call made outside it.
// @guard tests/api/c498-any-llm-workload-on-vercel.test.mjs
'use strict';

const RUNTIME_WHY = (() => {
  if (typeof globalThis.EdgeRuntime === 'string') return `the Edge runtime (EdgeRuntime=${globalThis.EdgeRuntime})`;
  if (typeof process === 'undefined' || !process.versions || !process.versions.node) return 'a runtime with no Node (process.versions.node is absent)';
  if (process.env && process.env.NEXT_RUNTIME === 'edge') return 'the Edge runtime (NEXT_RUNTIME=edge)';
  return null;
})();
const unavailable = RUNTIME_WHY
  ? `UNMEASURED: intentguard/llm needs a Node function, and this is ${RUNTIME_WHY} — a .node addon cannot load there. Set \`export const runtime = 'nodejs'\` on the route; the model's answer is returned untouched and nothing is placed.`
  : null;
if (unavailable) { try { console.warn(`[intentguard/llm] ${unavailable}`); } catch { /* no console */ } }

const SEED_ENV = 'INTENTGUARD_SIGNING_SEED';
const NO_SEED = `no signing seed — set ${SEED_ENV} (a 32-byte hex seed; on Vercel a project env var) or pass keyHome (a robot key minted on this device, C493)`;
const PIN_HINT = 'on Vercel the addon comes from vendor/intentguard/ADDON-PIN.json — cut the new one with scripts/intentguard/cut-addon-release.sh (ADDON-PIN.next.json)';

// node built-ins, required only when this is a Node runtime (the Edge bundle never reaches these)
let N = null;
const node = () => N || (N = { fs: require('node:fs'), os: require('node:os'), path: require('node:path'), crypto: require('node:crypto') });
const sha256 = (s) => node().crypto.createHash('sha256').update(s).digest('hex');
const errText = (e) => String((e && e.message) || e);

// ── the text a call is placed as: the model, the prompt, the completion — plain lines, the same bytes for the same call
const jsonish = (v) => { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch { return String(v); } };
function partText(p) {
  if (p == null) return '';
  if (typeof p === 'string') return p;
  switch (p.type) {
    case 'text': case 'reasoning': return p.text ?? '';
    case 'redacted-reasoning': return '[redacted reasoning]';
    case 'image': case 'image_url': return '[image]';
    case 'file': return `[file ${p.mimeType || ''}]`.replace(' ]', ']');
    case 'tool-call': case 'tool_use': return `[tool-call ${p.toolName || p.name}] ${jsonish(p.args ?? p.input)}`;
    case 'tool-result': case 'tool_result': return `[tool-result ${p.toolName || p.tool_use_id || ''}] ${jsonish(p.result ?? p.content)}`;
    default: return typeof p.text === 'string' ? p.text : jsonish(p);
  }
}
function promptText(prompt) {
  if (prompt == null) return '';
  if (typeof prompt === 'string') return prompt;
  if (!Array.isArray(prompt)) return jsonish(prompt);
  return prompt.map((m) => {
    if (m == null || typeof m !== 'object') return String(m);
    const c = m.content;
    const body = typeof c === 'string' ? c : Array.isArray(c) ? c.map(partText).join('\n') : jsonish(c);
    return `${m.role || 'message'}: ${body}`;
  }).join('\n');
}
function completionText(completion) {
  if (completion == null) return '';
  if (typeof completion === 'string') return completion;
  if (Array.isArray(completion)) return completion.map(partText).join('\n');
  if (Array.isArray(completion.choices)) return completion.choices.map((c) => (c.message ? promptText([c.message]) : c.text ?? jsonish(c))).join('\n');   // OpenAI
  if (Array.isArray(completion.content)) return completion.content.map(partText).join('\n');                                                       // Anthropic
  if (typeof completion.text === 'string') return completion.text;
  return jsonish(completion);
}
const modelName = (m) => (m == null ? 'unknown' : typeof m === 'string' ? m : [m.provider, m.modelId].filter(Boolean).join(':') || 'unknown');
function actionText({ kind, model, prompt, completion }) {
  return `llm-call ${kind} model=${modelName(model)}\n--- prompt\n${promptText(prompt)}\n--- completion\n${completionText(completion)}`;
}

// ── the signer: an explicit seed or INTENTGUARD_SIGNING_SEED → a 0600 key file under the tmp dir (the harness reads its key
// from a file, C493); else a device key home; else none (UNMEASURED). The seed itself is never logged or returned.
function signerFor(opts) {
  if (opts.keyHome) return { keyHome: opts.keyHome, id: `home:${opts.keyHome}` };
  const seed = opts.seed != null ? String(opts.seed) : (process.env[SEED_ENV] || '');
  if (seed) {
    const s = seed.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(s)) return { reason: `${SEED_ENV} is not a 32-byte hex seed (64 hex characters)` };
    const { fs, os, path } = node();
    const fp = sha256(s).slice(0, 16);
    const home = path.join(os.tmpdir(), 'intentguard-llm', `signer-${fp}`);
    try {
      fs.mkdirSync(home, { recursive: true, mode: 0o700 });
      const file = path.join(home, 'robot.key');
      let fd = null;
      try { fd = fs.openSync(file, 'wx', 0o600); } catch (e) { if (e.code !== 'EEXIST') throw e; }
      if (fd !== null) { try { fs.writeSync(fd, s + '\n'); fs.fchmodSync(fd, 0o600); } finally { fs.closeSync(fd); } }
      else if (fs.readFileSync(file, 'utf8').trim() !== s) return { reason: `the signer file for ${SEED_ENV} (${file}) holds a different seed` };
    } catch (e) { return { reason: `the signing seed could not be held for the harness: ${errText(e)}` }; }
    return { keyHome: home, id: `seed:${fp}` };
  }
  if (process.env.INTENTGUARD_HOME) return { keyHome: process.env.INTENTGUARD_HOME, id: `home:${process.env.INTENTGUARD_HOME}` };
  return { reason: NO_SEED };
}

// an addon that cannot place is handed to the harness as one whose openSpec throws the reason — the harness then writes
// every call as an UNMEASURED row (the call happened; the receipt does not exist), one seq each, never a fallback
const REFUSING = new Map();   // one refusing addon per reason, so its harness is cached like any other
const refusing = (reason) => { if (!REFUSING.has(reason)) REFUSING.set(reason, { openSpec() { throw new Error(reason); } }); return REFUSING.get(reason); };
function addonFor(opts) {
  if (opts.addon === undefined && opts.addonReason === undefined) {
    let bundled;
    try { bundled = require('./index.js'); } catch (e) { return { addon: refusing(`the intentguard package did not load: ${errText(e)}`), id: null }; }
    if (bundled.unavailable) return { addon: refusing(bundled.unavailable.replace(/^UNMEASURED:\s*/, '')), id: null };
    if (typeof bundled.openSpec !== 'function') return { addon: refusing(`the bundled addon (${bundled.addonPath}) has no openSpec (C491) — it predates the spec handle and chain (C491/C492); ${PIN_HINT}`), id: null };
    return { addon: bundled, id: 'bundled' };
  }
  const a = opts.addon;
  if (!a) return { addon: refusing(`no IntentGuard addon on this host (${opts.addonReason || 'not loaded'})`), id: null };
  if (typeof a.openSpec !== 'function') return { addon: refusing(`the loaded addon has no openSpec (C491) — it predates the spec handle and chain (C491/C492); ${PIN_HINT}`), id: null };
  return { addon: a, id: null };
}

// ── one harness per (spec, tape, witness, signer, addon), held at module scope for the life of the warm instance
const HARNESSES = new Map();
const addonIds = new WeakMap(); let nextAddonId = 1;
const addonKey = (a) => { if (!addonIds.has(a)) addonIds.set(a, `addon#${nextAddonId++}`); return addonIds.get(a); };

function defaultTape(specSha) {
  const { os, path } = node();
  const serverless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;   // /var/task is read-only: the tape is per instance
  const dir = serverless ? path.join(os.tmpdir(), 'intentguard-llm') : (process.env.INTENTGUARD_HOME || path.join(os.homedir(), '.intentguard'));
  return path.join(dir, `llm-${specSha.slice(0, 12)}.ndjson`);
}

function harnessFor(opts = {}) {
  if (unavailable) return { unmeasured: unavailable };
  if (typeof opts.spec !== 'string' || opts.spec.length === 0) return { unmeasured: 'UNMEASURED: no spec — pass the declared spec text (the lane every call is placed against)' };
  const specSha = sha256(opts.spec);
  const w = opts.witness;
  const witnessUrl = typeof w === 'string' ? w : (w && w.url) || null;
  const licence = (w && typeof w === 'object' && w.licence) || opts.licence || null;
  const tapePath = node().path.resolve(opts.tape || process.env.INTENTGUARD_TAPE || defaultTape(specSha));
  const signer = signerFor(opts);
  let { addon, id } = addonFor(opts);
  let keyHome = signer.keyHome;
  if (signer.reason) {   // no key to sign with: the harness keeps the chain of UNMEASURED rows; its throwaway key home signs nothing
    addon = refusing(signer.reason); id = null;
    keyHome = node().path.join(node().os.tmpdir(), 'intentguard-llm', 'unsigned');
  }
  const key = [specSha, tapePath, witnessUrl || '', licence ? sha256(licence).slice(0, 12) : '', signer.id || 'none', id || addonKey(addon)].join('|');
  let h = HARNESSES.get(key);
  if (!h) {
    const { createHarness } = require('./robot/harness.js');
    h = createHarness({ spec: opts.spec, tapePath, witnessUrl, licence, keyHome, addon, job: opts.job, retry: opts.retry, fetch: opts.fetch, postTimeoutMs: opts.postTimeoutMs });
    HARNESSES.set(key, h);
  }
  return { harness: h, key };
}

/** Place one model call. Never throws; returns { receipt, seq, sha256 } or { receipt: null, unmeasured }. */
function placeCall(opts, call) {
  let out;
  try {
    const got = harnessFor(opts);
    if (!got.harness) out = { receipt: null, seq: null, sha256: null, unmeasured: got.unmeasured };
    else out = got.harness.place(actionText(call));
  } catch (e) { out = { receipt: null, seq: null, sha256: null, unmeasured: `UNMEASURED: placement failed — ${errText(e)}` }; }
  if (typeof opts.onReceipt === 'function') { try { opts.onReceipt({ ...out, kind: call.kind, model: modelName(call.model) }); } catch { /* the caller's hook never reaches the call */ } }
  return out;
}

function placeLLM({ spec, prompt, completion, model, ...opts } = {}) {
  return placeCall({ spec, ...opts }, { kind: 'call', model, prompt, completion });
}

function generateCompletion(r) {
  const parts = [];
  if (r && r.reasoning) parts.push(`[reasoning] ${typeof r.reasoning === 'string' ? r.reasoning : completionText(r.reasoning)}`);
  if (r && typeof r.text === 'string') parts.push(r.text);
  for (const c of (r && r.toolCalls) || []) parts.push(`[tool-call ${c.toolName}] ${jsonish(c.args)}`);
  return parts.join('\n');
}

function receiptMiddleware(opts = {}) {
  return {
    middlewareVersion: 'v1',
    async wrapGenerate({ doGenerate, params, model }) {
      let result;
      try { result = await doGenerate(); }
      catch (e) { placeCall(opts, { kind: 'generate', model, prompt: params && params.prompt, completion: `[error] ${errText(e)}` }); throw e; }
      placeCall(opts, { kind: 'generate', model, prompt: params && params.prompt, completion: generateCompletion(result) });
      return result;                                                  // the provider's own object, never a copy
    },
    async wrapStream({ doStream, params, model }) {
      const out = await doStream();
      let text = '', placed = false; const extra = [];
      const finish = (tail) => {
        if (placed) return; placed = true;
        placeCall(opts, { kind: 'stream', model, prompt: params && params.prompt, completion: [text, ...extra, ...(tail ? [tail] : [])].filter((s) => s !== '').join('\n') });
      };
      const pass = new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk);                                  // forwarded first, as the same object
          try {
            if (chunk && chunk.type === 'text-delta') text += chunk.textDelta;
            else if (chunk && chunk.type === 'tool-call') extra.push(`[tool-call ${chunk.toolName}] ${chunk.args}`);
            else if (chunk && chunk.type === 'error') extra.push(`[error] ${errText(chunk.error)}`);
          } catch { /* reading a chunk never reaches the stream */ }
        },
        flush() { finish(''); },
        cancel(reason) { finish(`[stream cancelled] ${errText(reason)}`); },
      });
      return { ...out, stream: out.stream.pipeThrough(pass) };
    },
  };
}

/** Wait for every cached harness's queued witness posts (tests and shutdown). */
async function flush(timeoutMs = 30000) {
  const rs = await Promise.all([...HARNESSES.values()].map((h) => h.flush(timeoutMs)));
  return rs.reduce((a, r) => ({ posted: a.posted + r.posted, unwitnessed: a.unwitnessed + r.unwitnessed, pending: a.pending + (r.pending || 0) }), { posted: 0, unwitnessed: 0, pending: 0 });
}

/** On Vercel: keep the instance alive for the queued posts after the response (the request context's waitUntil). */
function flushAfterResponse(timeoutMs = 10000) {
  try {
    const ctx = globalThis[Symbol.for('@vercel/request-context')];
    const wu = ctx && typeof ctx.get === 'function' && ctx.get() && ctx.get().waitUntil;
    if (typeof wu === 'function') { wu(flush(timeoutMs)); return true; }
  } catch { /* no request context */ }
  return false;
}

function stats() { return [...HARNESSES.entries()].map(([key, h]) => ({ key, ...h.stats() })); }

module.exports = { receiptMiddleware, placeLLM, flush, flushAfterResponse, stats, actionText, unavailable, SEED_ENV };
