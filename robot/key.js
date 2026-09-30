// robot/key.js — `require('intentguard/robot/key')`: ONE KEY PER ROBOT, minted on the device (C493, R4 of the robot
// ecosystem spec, 2026-09-30). A robot runs Node on Linux, where there is no macOS host key to derive from, so the addon's
// only key source is INTENTGUARD_SIGNING_SEED. This module is where that seed comes from and the one place it is held:
//
//   mintKey({ home })          first boot: 32 random bytes → $INTENTGUARD_HOME/robot.key (hex, mode 0600, created with
//                              O_EXCL so two processes racing the first boot keep ONE key). Every later call reads the same
//                              file back — minting is idempotent. Returns the PUBLIC identity only, never the seed.
//   publicKey({ home })        the same identity, never minting (throws when there is no key yet)
//   signingEnv({ home })       { INTENTGUARD_SIGNING_SEED } — the only function that returns the seed, so a harness can hand
//                              it to the addon through the environment (a child's env, or process.env for the in-process
//                              addon). It is never printed, never logged, never part of any request body.
//   registrationBody({ home, licence, at })   the body POST /api/notary/keys takes: { pubkey, at, sig } — sig is ed25519
//                              over registrationBytes({ pubkey, licence, at }), proof that whoever registers the key holds it
//   registerKey({ endpoint, licence, fetch, home })   POST that body with `Authorization: Bearer <licence>`; the licence is
//                              the entitlement the site minted. Returns { status, body }. Nothing here posts on its own.
//
// SUFFICIENT FOR: "this receipt was signed by the key minted on this robot, and the notary knows which licence it belongs
// to". NOT SUFFICIENT FOR: hardware custody — the seed is a file readable by this user, not a TPM (an open question in the
// spec); nor for anything about what the robot did beyond the bytes it signed.
'use strict';
const { randomBytes, createPrivateKey, createPublicKey, createHash, sign } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SEED_ENV = 'INTENTGUARD_SIGNING_SEED';
const HOME_ENV = 'INTENTGUARD_HOME';
const KEY_FILE = 'robot.key';
const REGISTER_OP = 'register-robot-key';
const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');   // Ed25519 PKCS#8 wrapper for a 32-byte seed

function keyHome({ home, env = process.env } = {}) { return home || env[HOME_ENV] || path.join(os.homedir(), '.intentguard'); }
function keyPath(opts = {}) { return path.join(keyHome(opts), KEY_FILE); }

function privateKeyOf(seedHex) { return createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, Buffer.from(seedHex, 'hex')]), format: 'der', type: 'pkcs8' }); }
function identityOf(seedHex, file, minted) {
  const raw = createPublicKey(privateKeyOf(seedHex)).export({ format: 'der', type: 'spki' }).subarray(-32);
  return {
    minted, path: file,
    pubkey: raw.toString('hex'),                                     // what POST /api/notary/keys registers
    pubkeyB64: raw.toString('base64'),                               // what the addon writes as pubkey_b64 on every attestation line
    fingerprint: createHash('sha256').update(raw).digest('hex').slice(0, 16),   // the notary's fingerprintOf: sha256(raw pubkey)[:16]
  };
}

// read the seed back, refusing a file anyone but this user can read: a loose key is a leaked key, never used quietly
function readSeed(file) {
  const st = fs.statSync(file);
  if (st.mode & 0o077) throw new Error(`${file} is readable beyond its owner (mode ${(st.mode & 0o777).toString(8)}) — chmod 600 it, or treat the key as leaked and mint a new one`);
  const seed = fs.readFileSync(file, 'utf8').trim();
  if (!/^[0-9a-f]{64}$/.test(seed)) throw new Error(`${file} does not hold a 32-byte hex seed`);
  return seed;
}

function mintKey(opts = {}) {
  const file = keyPath(opts);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  let fd = null;
  try { fd = fs.openSync(file, 'wx', 0o600); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  if (fd === null) return identityOf(readSeed(file), file, false);
  const seed = randomBytes(32).toString('hex');
  try { fs.writeSync(fd, seed + '\n'); fs.fchmodSync(fd, 0o600); } finally { fs.closeSync(fd); }   // fchmod: the umask never widens it
  return identityOf(readSeed(file), file, true);
}

function publicKey(opts = {}) {
  const file = keyPath(opts);
  if (!fs.existsSync(file)) throw new Error(`no robot key at ${file} — mintKey() first`);
  return identityOf(readSeed(file), file, false);
}

function signingEnv(opts = {}) { return { [SEED_ENV]: readSeed(keyPath(opts)) }; }

// the bytes the registration signs — sorted keys, no whitespace (gateway.mjs canonicalBytes); robot-keys.mjs rebuilds them
function registrationBytes({ pubkey, licence, at }) { return JSON.stringify({ at, licence, op: REGISTER_OP, pubkey }); }

// the licence fingerprint the entitlement names (its payload, read — the notary verifies the signature, not us)
function licenceOf(jwt) {
  const parts = String(jwt || '').split('.');
  if (parts.length !== 3) throw new Error('the licence is not an entitlement JWT (three dot-separated parts)');
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (!/^[0-9a-f]{16}$/.test(String(claims.pubkey_fingerprint || ''))) throw new Error('the entitlement names no licence key fingerprint');
  return claims.pubkey_fingerprint;
}

function registrationBody({ licence, at = new Date().toISOString(), ...opts } = {}) {
  const seed = readSeed(keyPath(opts)); const id = identityOf(seed, keyPath(opts), false);
  const licenceFp = /^[0-9a-f]{16}$/.test(String(licence)) ? licence : licenceOf(licence);
  const sig = sign(null, Buffer.from(registrationBytes({ pubkey: id.pubkey, licence: licenceFp, at })), privateKeyOf(seed)).toString('hex');
  return { pubkey: id.pubkey, at, sig };
}

async function registerKey({ endpoint, licence, fetch: f = globalThis.fetch, ...opts } = {}) {
  if (!endpoint) throw new Error('registerKey needs the endpoint (…/api/notary/keys)');
  if (!licence) throw new Error('registerKey needs the licence (the entitlement JWT) — the key is registered against it');
  const body = registrationBody({ licence, ...opts });
  const res = await f(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${licence}` }, body: JSON.stringify(body) });
  let out = null; try { out = await res.json(); } catch { out = null; }
  return { status: res.status, body: out };
}

module.exports = { SEED_ENV, HOME_ENV, KEY_FILE, REGISTER_OP, keyHome, keyPath, mintKey, publicKey, signingEnv, registrationBytes, registrationBody, registerKey, licenceOf };
