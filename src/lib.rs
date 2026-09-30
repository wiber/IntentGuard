// src/lib.rs — IntentGuard as a library (C461): the same placement, walk, signature and verification the
// CLI runs, as functions that take inputs and RETURN values. Nothing on this path prints or exits; the
// CLI (main.rs) prints what these return, byte for byte what it printed before the split, and the Node
// addon (napi/) calls them in-process.
//
// The doors:
//   lens(text, &LensOpts)            → the placement JSON (`--lens`)
//   card / card_signed               → the canonical card (`--card`), unsigned / signed
//   open_spec(bulk) → SpecHandle     → the spec opened once; handle.place(text) = card_signed(text, bulk)
//   handle.place_chained / chain     → receipts linked by seq + prev under the signature; a missing one is a counted gap
//   walk / walk_signed / walk_stream → the ballistic frames (`--ballistic`, `--sign`, `--stream`)
//   sign(payload) / sign_receipt     → the attestation line / payload + line (`--sign`'s tail)
//   verify(receipt)                  → the verdict (`--verify-receipt`)
//
// What the receipt proves: WHERE this landed is re-runnable from the same bytes; WHETHER the work is good
// is undecidable, and nothing here claims it.

pub mod aperture;
pub mod attest;
pub mod ballistic;
pub mod boundary_probe;
pub mod lattice;
pub mod lens;
pub mod ops;
pub mod png;
pub mod pointer_chase;
pub mod regions;
pub mod sense;
pub mod signature;

pub use attest::KeySource;
pub use ballistic::{WalkOpts, CELLS, SHORTLEX};
pub use lens::{LensOpts, Targets};

/// The 144-anchor vocabulary compiled INTO the crate itself — the same bytes `data/snippet-library-144.json`
/// holds at build time. `card()` and the napi addon's `lens`/`card` doors use this (never a path), so a
/// Linux server with no repo checkout on disk still produces the same bytes (spec row C460). The CLI's
/// `--lens` keeps reading the path by default so `--targets` overrides keep working; `--card` always uses
/// this constant, on every platform, so the card is reproducible independent of what's on disk.
pub const LIBRARY_JSON: &str = include_str!("../data/snippet-library-144.json");

/// `--lens`: the placement of `text`, serialized exactly as the CLI prints it (without the trailing '\n').
pub fn lens(text: &str, opts: &LensOpts) -> Result<String, String> {
    lens::lens(text, opts).map(|v| serde_json::to_string(&v).expect("serialize lens"))
}

fn hex_sha256(data: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    Sha256::digest(data).iter().map(|b| format!("{b:02x}")).collect()
}

/// `--card`: ONE canonical, byte-reproducible artifact — the placement of `text` (measured against `bulk`
/// when given, exactly as `--bulk` selects the matched seed), with every `lens` field EXCEPT the two
/// wall-clock ones (`seed_gzip_us`, `walk_ms` — timings, never re-runnable), plus the engine identity and
/// the sha256 of the inputs: `{"v":"intentguard-card/1","engine":{"crate":...,"version":...},
/// "input_sha256":<hex>,"bulk_sha256":<hex|null>, …every kept lens field}`. The walk's own time budget is
/// disabled here (`budget_ms` set to its max) so `time_budget_tripped` cannot vary run to run. Always the
/// EMBEDDED vocabulary (`LIBRARY_JSON`), never a path on disk. Serialized with `serde_json::to_vec`: keys
/// come out in sorted order because this crate never enables serde_json's `preserve_order` feature, so
/// `serde_json::Map` is a `BTreeMap` (see Cargo.toml) — that ordering is the canonical one, not an
/// incidental one, and nothing here reorders it by hand. No target triple, no timestamp: the payload hash
/// is a pure function of `(text, bulk)`. Ends in exactly one '\n'.
pub fn card(text: &str, bulk: Option<String>) -> Result<Vec<u8>, String> {
    let bulk_sha = bulk.as_ref().map(|b| hex_sha256(b.as_bytes()));
    card_bytes(card_object(text, bulk, bulk_sha)?)
}

/// The card as a JSON object, before serialization. `bulk_sha256` is the hex sha256 of `bulk` (the caller
/// passes it so a `SpecHandle` computes it once, at open). `card()` and `SpecHandle` both come through here,
/// which is what makes a handle's card the one-shot card byte for byte.
fn card_object(text: &str, bulk: Option<String>, bulk_sha256: Option<String>) -> Result<serde_json::Value, String> {
    let mut opts = LensOpts::default()
        .with_targets(Targets::Json(LIBRARY_JSON.to_string()))
        .with_bulk(bulk);
    opts.budget_ms = u128::MAX;
    let mut v = lens::lens(text, &opts)?;
    let obj = v
        .as_object_mut()
        .ok_or_else(|| "intentguard --card: lens did not return a JSON object".to_string())?;
    obj.remove("seed_gzip_us");
    obj.remove("walk_ms");
    obj.insert("v".to_string(), serde_json::json!("intentguard-card/1"));
    obj.insert(
        "engine".to_string(),
        serde_json::json!({ "crate": "intentguard", "version": env!("CARGO_PKG_VERSION") }),
    );
    obj.insert("input_sha256".to_string(), serde_json::json!(hex_sha256(text.as_bytes())));
    obj.insert(
        "bulk_sha256".to_string(),
        match bulk_sha256 {
            Some(h) => serde_json::json!(h),
            None => serde_json::Value::Null,
        },
    );
    Ok(v)
}

/// A card object → its canonical bytes (sorted keys, see `card`) + exactly one '\n'.
fn card_bytes(v: serde_json::Value) -> Result<Vec<u8>, String> {
    let mut out = serde_json::to_vec(&v).map_err(|e| format!("intentguard --card: serialize: {e}"))?;
    out.push(b'\n');
    Ok(out)
}

/// `card()`, signed: the card bytes, then the attestation line over those exact bytes + '\n' — what
/// `verify`/`--verify-receipt` reads. Errors carry the CLI's "intentguard --sign: " prefix.
pub fn card_signed(text: &str, bulk: Option<String>) -> Result<Vec<u8>, String> {
    let bytes = card(text, bulk)?;
    sign_receipt(&bytes).map_err(|e| format!("intentguard --sign: {e}"))
}

/// THE SPEC HANDLE (C491, R2 of the robot ecosystem spec): open the declared spec ONCE, then place every action
/// against it. A robot places hundreds of short actions against one spec; the handle holds the bulk and fixes its
/// sha256 at open, so `place` never re-reads or re-hashes it and the spec a card names cannot change mid-run.
/// `place(text)` is `card_signed(text, bulk)` byte for byte (same key, same second) and `card(text)` is
/// `card(text, bulk)` byte for byte — both go through the one `card_object`.
/// SUFFICIENT FOR: the placement cost per action and WHERE each action landed against the declared spec.
/// NOT SUFFICIENT FOR: whether the action was good (Rice) — nothing here claims it.
#[derive(Clone, Debug)]
pub struct SpecHandle {
    bulk: Option<String>,
    spec_sha256: Option<String>,
}

/// Open `bulk` (the declared spec; None = no spec, the naked seed) as a handle. The sha256 is taken here, once.
pub fn open_spec(bulk: Option<String>) -> SpecHandle {
    let spec_sha256 = bulk.as_ref().map(|b| hex_sha256(b.as_bytes()));
    SpecHandle { bulk, spec_sha256 }
}

impl SpecHandle {
    /// The hex sha256 of the spec bytes, fixed at open (None when opened without a spec). Every card this handle
    /// places carries it as `bulk_sha256`.
    pub fn spec_sha256(&self) -> Option<&str> {
        self.spec_sha256.as_deref()
    }

    /// The unsigned card for `text` against this spec: `card(text, bulk)` byte for byte.
    pub fn card(&self, text: &str) -> Result<Vec<u8>, String> {
        card_bytes(card_object(text, self.bulk.clone(), self.spec_sha256.clone())?)
    }

    /// The signed card for `text` against this spec: `card_signed(text, bulk)` byte for byte.
    pub fn place(&self, text: &str) -> Result<Vec<u8>, String> {
        let bytes = self.card(text)?;
        sign_receipt(&bytes).map_err(|e| format!("intentguard --sign: {e}"))
    }

    /// C492 A CHAINED RECEIPT: the card for `text` with `seq` and `prev` (the `receipt_sha256` of the receipt before
    /// it; None only for the first) written INTO the card object, then signed — so the link is under the signature and
    /// cannot be edited without the receipt failing `verify`. `place`/`card` bytes are untouched: only a chained card
    /// carries these two keys. `prev` must be 64 lowercase hex.
    pub fn place_chained(&self, text: &str, prev: Option<&str>, seq: u64) -> Result<Vec<u8>, String> {
        if let Some(p) = prev {
            if p.len() != 64 || !p.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)) {
                return Err(format!("intentguard --chain: prev must be 64 lowercase hex (a receipt_sha256), got {p:?}"));
            }
        }
        let mut v = card_object(text, self.bulk.clone(), self.spec_sha256.clone())?;
        let obj = v.as_object_mut().expect("card_object returns an object");
        obj.insert("seq".to_string(), serde_json::json!(seq));
        obj.insert("prev".to_string(), match prev { Some(p) => serde_json::json!(p), None => serde_json::Value::Null });
        sign_receipt(&card_bytes(v)?).map_err(|e| format!("intentguard --sign: {e}"))
    }
}

/// The hash a chained receipt's successor carries as `prev`: sha256 over the receipt's bytes with exactly one trailing
/// '\n' (a tape that split receipts on newlines and dropped the last one hashes the same).
pub fn receipt_sha256(receipt: &[u8]) -> String {
    let mut body = receipt;
    while let Some(b) = body.strip_suffix(b"\n") { body = b; }
    let mut bytes = body.to_vec();
    bytes.push(b'\n');
    hex_sha256(&bytes)
}

/// One link `chain` could not accept: the receipt's position in the input, its seq when it had one, and why.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BrokenLink {
    pub index: usize,
    pub seq: Option<u64>,
    pub reason: String,
}

/// `chain`'s verdict. `gaps` are the seqs missing between the lowest and highest seq present (a removed action, counted,
/// never silence — AXIOM 1 W5), listed up to `GAP_LIST_MAX`; `gap_count` is all of them. `broken` names every receipt
/// that does not verify, carries no chain link, repeats a seq, arrives out of order, or whose `prev` is not the hash
/// of the receipt before it. `ok` = no gaps and nothing broken. `tip_sha256` is the last receipt's hash (what the
/// next action chains to). What a chain can NOT see: an action removed after the last receipt — seal the tip.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ChainReport {
    pub ok: bool,
    pub n: usize,
    pub gaps: Vec<u64>,
    pub gap_count: u64,
    pub broken: Vec<BrokenLink>,
    pub first_seq: Option<u64>,
    pub last_seq: Option<u64>,
    pub tip_sha256: Option<String>,
}

pub const GAP_LIST_MAX: usize = 10_000;

/// C492 READ A CHAIN OF RECEIPTS, in the order given (the tape's order). Each must verify and carry `seq` and `prev` in
/// its signed card line. Needs no key and no clock; which signer to honour is the caller's call (`verify` per receipt).
pub fn chain(receipts: &[&[u8]]) -> ChainReport {
    use std::collections::BTreeSet;
    struct Link { index: usize, seq: u64, prev: Option<String>, hash: String }
    let mut broken = Vec::new();
    let mut links: Vec<Link> = Vec::new();
    for (index, r) in receipts.iter().enumerate() {
        let first_line = r.split(|&b| b == b'\n').next().unwrap_or(&[]);
        let parsed: Option<serde_json::Value> = serde_json::from_slice(first_line).ok();
        let seq = parsed.as_ref().and_then(|v| v.get("seq")).and_then(|s| s.as_u64());
        if let Err(e) = verify(r) {
            broken.push(BrokenLink { index, seq, reason: format!("does not verify: {e}") });
            continue;
        }
        let Some(v) = parsed else {
            broken.push(BrokenLink { index, seq: None, reason: "the signed payload's first line is not JSON".into() });
            continue;
        };
        let (Some(seq), Some(prev)) = (seq, v.get("prev")) else {
            broken.push(BrokenLink { index, seq, reason: "not a chained receipt (no seq/prev in the signed card)".into() });
            continue;
        };
        let prev = match prev {
            serde_json::Value::Null => None,
            serde_json::Value::String(s) => Some(s.clone()),
            _ => { broken.push(BrokenLink { index, seq: Some(seq), reason: "prev is neither a hash nor null".into() }); continue; }
        };
        links.push(Link { index, seq, prev, hash: receipt_sha256(r) });
    }
    let present: BTreeSet<u64> = links.iter().map(|l| l.seq).collect();
    let (first_seq, last_seq) = (present.iter().next().copied(), present.iter().next_back().copied());
    let (mut gaps, mut gap_count) = (Vec::new(), 0u64);
    if let Some(lo) = first_seq {
        let mut expect = lo;
        for &s in &present {
            if s > expect {
                gap_count += s - expect;
                let mut g = expect;
                while g < s && gaps.len() < GAP_LIST_MAX { gaps.push(g); g += 1; }
            }
            expect = s.saturating_add(1);
        }
    }
    for w in links.windows(2) {
        let (a, b) = (&w[0], &w[1]);
        let reason = if b.seq == a.seq {
            Some(format!("seq {} repeats", b.seq))
        } else if b.seq < a.seq {
            Some(format!("out of order: seq {} follows seq {}", b.seq, a.seq))
        } else if b.seq == a.seq + 1 {
            (b.prev.as_deref() != Some(a.hash.as_str())).then(|| format!("prev is not the hash of seq {} before it", a.seq))
        } else if present.range(a.seq + 1..b.seq).next().is_some() {
            Some(format!("out of order: seq {} follows seq {} while seqs between them arrive elsewhere", b.seq, a.seq))
        } else {
            None   // a jump over seqs present nowhere: counted in gaps, not a broken link
        };
        if let Some(reason) = reason { broken.push(BrokenLink { index: b.index, seq: Some(b.seq), reason }); }
    }
    broken.sort_by_key(|l| l.index);
    ChainReport {
        ok: gap_count == 0 && broken.is_empty(),
        n: receipts.len(),
        gaps,
        gap_count,
        broken,
        first_seq,
        last_seq,
        tip_sha256: receipts.last().map(|r| receipt_sha256(r)),
    }
}

/// A ShortLex label ("C2,A") → its anchor index, the CLI's `--start` resolution.
pub fn start_index(label: &str) -> Option<usize> {
    SHORTLEX.iter().position(|x| *x == label)
}

/// `--ballistic`: the frames JSON array for `grid` (from `start`, or every occupied anchor when None),
/// without the trailing '\n'.
pub fn walk(grid: &[u8; CELLS], start: Option<usize>, opts: &WalkOpts) -> String {
    let frames = match start {
        Some(s) => ballistic::ballistic_walk(grid, s, opts),
        None => ballistic::ballistic_walk_all(grid, opts),
    };
    ballistic::frames_to_json(&frames)
}

/// `--ballistic --sign`: the exact bytes the CLI writes — the frames JSON + '\n', then the attestation
/// line over those bytes + '\n'. The key is `attest::signing_key()` (INTENTGUARD_SIGNING_SEED, else the
/// macOS host key); Err is the reason no key could be had (the CLI prefixes "intentguard --sign: ").
pub fn walk_signed(grid: &[u8; CELLS], start: Option<usize>, opts: &WalkOpts) -> Result<Vec<u8>, String> {
    let (key, source) = attest::signing_key()?;
    let mut payload = walk(grid, start, opts).into_bytes();
    payload.push(b'\n');
    let line = attest::attestation_line_from(&payload, &key, source, &ops::chrono_like_ts());
    payload.extend_from_slice(line.as_bytes());
    payload.push(b'\n');
    Ok(payload)
}

/// `--ballistic --stream [--sign]`: NDJSON, one frame per call of `emit` (each string is one line WITHOUT
/// its '\n'; the caller writes the '\n' and flushes). With `key`, the digest runs over exactly line+'\n' per
/// frame and one attestation line is emitted last — equal to signing the buffered concatenation.
pub fn walk_stream(
    grid: &[u8; CELLS],
    start: Option<usize>,
    opts: &WalkOpts,
    key: Option<&(ed25519_dalek::SigningKey, KeySource)>,
    emit: &mut dyn FnMut(&str),
) {
    use sha2::Digest;
    let mut hasher: Option<sha2::Sha256> = key.map(|_| sha2::Sha256::new());
    {
        let mut on_frame = |f: &ballistic::Frame| {
            let line = ballistic::frame_to_json(f);
            emit(&line);
            if let Some(h) = hasher.as_mut() {
                h.update(line.as_bytes());
                h.update(b"\n");
            }
        };
        match start {
            Some(s) => ballistic::ballistic_walk_with(grid, s, opts, &mut on_frame),
            None => ballistic::ballistic_walk_all_with(grid, opts, &mut on_frame),
        }
    }
    if let (Some((k, src)), Some(h)) = (key, hasher) {
        let digest: [u8; 32] = h.finalize().into();
        emit(&attest::attestation_line_for_digest_from(&digest, k, *src, &ops::chrono_like_ts()));
    }
}

/// Sign `payload` (the exact bytes to vouch for): the one attestation line, without '\n'.
pub fn sign(payload: &[u8]) -> Result<String, String> {
    let (key, source) = attest::signing_key()?;
    Ok(attest::attestation_line_from(payload, &key, source, &ops::chrono_like_ts()))
}

/// A complete receipt file: `payload` (which should end in '\n'), then the attestation line + '\n' —
/// the shape `verify` and `--verify-receipt` read.
pub fn sign_receipt(payload: &[u8]) -> Result<Vec<u8>, String> {
    let line = sign(payload)?;
    let mut out = payload.to_vec();
    out.extend_from_slice(line.as_bytes());
    out.push(b'\n');
    Ok(out)
}

/// A receipt that verified: how many payload bytes it covers and the key that signed them. Which keys
/// to honour is the verifier's own call.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Verified {
    pub payload_bytes: usize,
    pub pubkey_b64: String,
}

/// `--verify-receipt`: re-hash the payload (every byte before the last line) and check the signature in
/// that last line. Needs no key of its own and no clock.
pub fn verify(receipt: &[u8]) -> Result<Verified, String> {
    let (payload, line) = attest::split_receipt(receipt);
    attest::verify_attestation(payload, &line).map(|pk| Verified { payload_bytes: payload.len(), pubkey_b64: pk })
}

/// `verify` as the JSON line the CLI prints; the bool is the verdict (the CLI exits 1 when false).
pub fn verify_json(receipt: &[u8]) -> (bool, String) {
    match verify(receipt) {
        Ok(v) => (true, serde_json::json!({ "ok": true, "payload_bytes": v.payload_bytes, "pubkey_b64": v.pubkey_b64 }).to_string()),
        Err(e) => (false, serde_json::json!({ "ok": false, "reason": e }).to_string()),
    }
}
