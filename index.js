// index.js — `npm i intentguard@2`: the Rust core, in-process, through the napi addon built for this host.
// One package carries all four addons (napi/dist/intentguard.<platform>-<arch>.node); this file picks the
// one for process.platform/process.arch and hands back its calls unchanged — card, cardSigned, lens, walk,
// sign, signReceipt, verify, openSpec, receiptSha256, chain, walkStream — so a caller here gets the same bytes the CLI and the Vercel door get.
//
// Search order (the same shape as the door's src/lib/intentguard/addon.mjs):
//   1. INTENTGUARD_ADDON   an explicit path to a .node file
//   2. napi/dist/intentguard.<platform>-<arch>.node inside this package
// A host with no addon is a fact, never a JS fallback that reimplements the walk: load() returns
// { addon: null, reason }, and every call throws that reason.
'use strict';
const { existsSync } = require('node:fs');
const { join } = require('node:path');

const PLATFORMS = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64'];
const CALLS = ['card', 'cardSigned', 'lens', 'walk', 'sign', 'signReceipt', 'verify', 'openSpec', 'receiptSha256', 'chain', 'walkStream'];

function addonFileName(platform = process.platform, arch = process.arch) {
  return `intentguard.${platform}-${arch}.node`;
}

function candidates() {
  const list = [];
  if (process.env.INTENTGUARD_ADDON) list.push({ path: process.env.INTENTGUARD_ADDON, label: 'INTENTGUARD_ADDON env' });
  list.push({ path: join(__dirname, 'napi', 'dist', addonFileName()), label: 'bundled' });
  return list;
}

/** Resolves and requires the addon for this host. Returns { addon, path } or { addon: null, reason }. Never throws. */
function load() {
  const tried = [];
  for (const c of candidates()) {
    if (!existsSync(c.path)) { tried.push(`${c.path} (${c.label}: not present)`); continue; }
    try {
      return { addon: require(c.path), path: c.path };
    } catch (e) {
      return { addon: null, reason: `${c.path} (${c.label}) failed to load: ${e && e.message ? e.message : e}` };
    }
  }
  return { addon: null, reason: `no IntentGuard addon for ${process.platform}-${process.arch} (built for ${PLATFORMS.join(', ')}) — checked: ${tried.join('; ')}` };
}

const loaded = load();
const api = { load, addonFileName, PLATFORMS, addonPath: loaded.path || null, unavailable: loaded.reason || null };
for (const name of CALLS) {
  api[name] = loaded.addon
    ? loaded.addon[name]
    : () => { throw new Error(`UNMEASURED: ${loaded.reason}`); };
}
// C494: the reference robot harness (robot/harness.js) — withReceipt/place/flush/stats over openSpec + placeChained + the robot key.
// Required lazily: the harness loads this file for the addon, and a caller that never builds a harness never loads it.
api.createHarness = (opts) => require('./robot/harness.js').createHarness(opts);
// C593: the lane reading (lane.js) — the out-of-lane state as a signal the deployer wires to their own halt.
const lane = require('./lane.js');
api.laneReading = lane.laneReading;
api.LANE_EVENTS = lane.EVENTS;
api.LANE_EXIT = lane.EXIT;
module.exports = api;
