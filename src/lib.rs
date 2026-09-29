// src/lib.rs — IntentGuard as a library (C461): the same placement, walk, signature and verification the
// CLI runs, as functions that take inputs and RETURN values. Nothing on this path prints or exits; the
// CLI (main.rs) prints what these return, byte for byte what it printed before the split, and the Node
// addon (napi/) calls them in-process.
//
// The four doors:
//   lens(text, &LensOpts)            → the placement JSON (`--lens`)
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
    let mut opts = LensOpts::default()
        .with_targets(Targets::Json(LIBRARY_JSON.to_string()))
        .with_bulk(bulk.clone());
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
        match &bulk {
            Some(b) => serde_json::json!(hex_sha256(b.as_bytes())),
            None => serde_json::Value::Null,
        },
    );
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
