// napi/src/lib.rs — IntentGuard in-process for Node (C461): the node extension and the server wrapper
// call the same library the CLI prints from, with no child process and no stdout parsing.
//
//   lens(text, bulk?, seed?)            → the placement JSON string, byte-identical to `intentguard --lens`
//   walk(grid, start?, maxDepth?, decay?) → the frames JSON string, byte-identical to `--ballistic`
//   sign(payload)                        → the attestation line over the payload's exact bytes
//   signReceipt(payload)                 → payload + attestation line + '\n' (what verify reads)
//   verify(receipt)                      → { ok, payloadBytes, pubkeyB64 } or { ok: false, reason }
//   openSpec(bulk?)                      → SpecHandle { specSha256, place(text) → Buffer, card(text) → Buffer,
//                                           placeChained(text, prev|null, seq) → Buffer }
//   receiptSha256(receipt)               → the hash the next chained receipt carries as prev
//   chain(receipts[])                    → { ok, n, gaps[], gapCount, broken[{index, seq, reason}], firstSeq, lastSeq, tipSha256 }
//   walkStream(grid, start?, maxDepth?, decay?, sign?, onLine?) → one frame line per call of onLine (count), or string[]
//
// The vocabulary (data/snippet-library-144.json) is compiled INTO the .node file, so a deployed addon
// needs no data directory. The signing key is INTENTGUARD_SIGNING_SEED when set (a server: no ioreg), else
// the macOS host-derived key. `binary_sha256` in every attestation is the hash of THIS .node file (found
// with dladdr), never of the node executable that loaded it.

use intentguard::{attest, LensOpts, Targets, WalkOpts, LIBRARY_JSON};
use napi::bindgen_prelude::{Buffer, Either};
use napi::{Env, JsFunction};
use napi_derive::napi;

fn err(e: String) -> napi::Error { napi::Error::from_reason(e) }

fn bytes_of(p: &Either<String, Buffer>) -> Vec<u8> {
    match p {
        Either::A(s) => s.as_bytes().to_vec(),
        Either::B(b) => b.to_vec(),
    }
}

/// The path of the loaded .node file, from the address of one of its own functions.
fn addon_path() -> Option<std::path::PathBuf> {
    unsafe {
        let mut info: libc::Dl_info = std::mem::zeroed();
        if libc::dladdr(addon_path as *const libc::c_void, &mut info) == 0 || info.dli_fname.is_null() {
            return None;
        }
        let c = std::ffi::CStr::from_ptr(info.dli_fname);
        Some(std::path::PathBuf::from(c.to_string_lossy().into_owned()))
    }
}

fn fix_binary_identity() {
    static ONCE: std::sync::Once = std::sync::Once::new();
    ONCE.call_once(|| {
        if let Some(p) = addon_path() {
            attest::set_binary_path(&p);
        }
    });
}

/// Place `text` on the 144×144 lattice. `bulk` is your context (a spec, a README); giving one selects the
/// matched seed, as `--bulk` does. `seed` forces "matched" or "naked".
#[napi]
pub fn lens(text: String, bulk: Option<String>, seed: Option<String>) -> napi::Result<String> {
    let mut o = LensOpts::default().with_targets(Targets::Json(LIBRARY_JSON.to_string())).with_bulk(bulk);
    o.seed = seed;
    intentguard::lens(&text, &o).map_err(err)
}

/// The canonical, byte-reproducible IntentGuard Card for `text` (measured against `bulk` when given) — the
/// same bytes `intentguard --card` prints. Always the embedded vocabulary, so this addon needs no repo on
/// disk (a Linux server, a CI runner).
#[napi]
pub fn card(text: String, bulk: Option<String>) -> napi::Result<Buffer> {
    intentguard::card(&text, bulk).map(Buffer::from).map_err(err)
}

/// `card()`, signed: the card bytes, then the attestation line over those exact bytes.
#[napi]
pub fn card_signed(text: String, bulk: Option<String>) -> napi::Result<Buffer> {
    fix_binary_identity();
    intentguard::card_signed(&text, bulk).map(Buffer::from).map_err(err)
}

/// C491 THE SPEC HANDLE: the declared spec opened once. `place(text)` is `cardSigned(text, bulk)` byte for byte,
/// `card(text)` is `card(text, bulk)` byte for byte, and `specSha256` is fixed at open.
#[napi]
pub struct SpecHandle {
    inner: intentguard::SpecHandle,
}

#[napi]
impl SpecHandle {
    /// The hex sha256 of the spec, fixed when it was opened (null when opened without one).
    #[napi(getter)]
    pub fn spec_sha256(&self) -> Option<String> {
        self.inner.spec_sha256().map(str::to_string)
    }

    /// The signed card for `text` against this spec: the card line, then the attestation line.
    #[napi]
    pub fn place(&self, text: String) -> napi::Result<Buffer> {
        fix_binary_identity();
        self.inner.place(&text).map(Buffer::from).map_err(err)
    }

    /// The unsigned card for `text` against this spec.
    #[napi]
    pub fn card(&self, text: String) -> napi::Result<Buffer> {
        self.inner.card(&text).map(Buffer::from).map_err(err)
    }

    /// C492: the signed card with `seq` and `prev` (receiptSha256 of the receipt before it; null for the first) inside
    /// the signed line — the link cannot be edited without the receipt failing verify.
    #[napi]
    pub fn place_chained(&self, text: String, prev: Option<String>, seq: i64) -> napi::Result<Buffer> {
        if seq < 0 { return Err(err(format!("seq must be ≥ 0, got {seq}"))); }
        fix_binary_identity();
        self.inner.place_chained(&text, prev.as_deref(), seq as u64).map(Buffer::from).map_err(err)
    }
}

/// C492: the hash a chained receipt's successor carries as `prev` (sha256 over the receipt with one trailing '\n').
#[napi]
pub fn receipt_sha256(receipt: Either<String, Buffer>) -> String {
    intentguard::receipt_sha256(&bytes_of(&receipt))
}

#[napi(object)]
pub struct BrokenLink {
    pub index: u32,
    pub seq: Option<i64>,
    pub reason: String,
}

#[napi(object)]
pub struct ChainReport {
    pub ok: bool,
    pub n: u32,
    pub gaps: Vec<i64>,
    pub gap_count: i64,
    pub broken: Vec<BrokenLink>,
    pub first_seq: Option<i64>,
    pub last_seq: Option<i64>,
    pub tip_sha256: Option<String>,
}

/// C492: read receipts in tape order — every one must verify and carry seq/prev; a missing seq is a counted gap,
/// a wrong link or an out-of-order receipt is named in `broken`.
#[napi]
pub fn chain(receipts: Vec<Either<String, Buffer>>) -> ChainReport {
    let owned: Vec<Vec<u8>> = receipts.iter().map(bytes_of).collect();
    let refs: Vec<&[u8]> = owned.iter().map(|v| v.as_slice()).collect();
    let r = intentguard::chain(&refs);
    ChainReport {
        ok: r.ok,
        n: r.n as u32,
        gaps: r.gaps.iter().map(|&g| g as i64).collect(),
        gap_count: r.gap_count as i64,
        broken: r.broken.into_iter().map(|b| BrokenLink { index: b.index as u32, seq: b.seq.map(|s| s as i64), reason: b.reason }).collect(),
        first_seq: r.first_seq.map(|s| s as i64),
        last_seq: r.last_seq.map(|s| s as i64),
        tip_sha256: r.tip_sha256,
    }
}

/// Open `bulk` (the declared spec) once; place every action against the returned handle.
#[napi]
pub fn open_spec(bulk: Option<String>) -> SpecHandle {
    SpecHandle { inner: intentguard::open_spec(bulk) }
}

/// The ballistic walk over a 144-int (diagonal) or 20,736-int grid, from `start` (a ShortLex label such as
/// "C2,A") or from every occupied anchor when absent.
#[napi]
pub fn walk(grid: Vec<i64>, start: Option<String>, max_depth: Option<u32>, decay: Option<f64>) -> napi::Result<String> {
    let (g, start_idx, opts) = walk_inputs(&grid, start, max_depth, decay)?;
    Ok(intentguard::walk(&g, start_idx, &opts))
}

type WalkInputs = ([u8; intentguard::CELLS], Option<usize>, WalkOpts);

fn walk_inputs(grid: &[i64], start: Option<String>, max_depth: Option<u32>, decay: Option<f64>) -> napi::Result<WalkInputs> {
    let text = format!("[{}]", grid.iter().map(|v| v.to_string()).collect::<Vec<_>>().join(","));
    let (g, _) = intentguard::ops::grid_from_json(&text).map_err(err)?;
    let mut opts = WalkOpts::default();
    if let Some(d) = max_depth { opts.max_depth = d as usize; }
    if let Some(d) = decay { opts.decay_factor = d; }
    let start_idx = match start {
        Some(s) => Some(intentguard::start_index(&s).ok_or_else(|| err(format!("unknown ShortLex label {s:?}")))?),
        None => None,
    };
    Ok((g, start_idx, opts))
}

/// C492: the walk as a STREAM — one frame JSON line per frame (`--ballistic --stream`), and with `sign` one
/// attestation line last, over exactly the lines + '\n' each (so lines.join('\n') + '\n' verifies). With `onLine`, each
/// line is handed to it as it is produced and the call returns the number of lines; without it, the lines come back as
/// an array. A throw inside onLine stops the calls and is rethrown when the walk returns.
#[napi]
pub fn walk_stream(
    env: Env,
    grid: Vec<i64>,
    start: Option<String>,
    max_depth: Option<u32>,
    decay: Option<f64>,
    sign: Option<bool>,
    on_line: Option<JsFunction>,
) -> napi::Result<Either<u32, Vec<String>>> {
    let (g, start_idx, opts) = walk_inputs(&grid, start, max_depth, decay)?;
    let key = if sign.unwrap_or(false) {
        fix_binary_identity();
        Some(attest::signing_key().map_err(|e| err(format!("intentguard --sign: {e}")))?)
    } else {
        None
    };
    let mut lines: Vec<String> = Vec::new();
    let mut count: u32 = 0;
    let mut failed: Option<napi::Error> = None;
    {
        let mut emit = |line: &str| {
            count += 1;
            match &on_line {
                Some(f) => {
                    if failed.is_some() { return; }
                    let r = env.create_string(line).and_then(|s| f.call(None, &[s]));
                    if let Err(e) = r { failed = Some(e); }
                }
                None => lines.push(line.to_string()),
            }
        };
        intentguard::walk_stream(&g, start_idx, &opts, key.as_ref(), &mut emit);
    }
    if let Some(e) = failed { return Err(e); }
    Ok(if on_line.is_some() { Either::A(count) } else { Either::B(lines) })
}

/// The attestation line over `payload`'s exact bytes (a string is taken as its UTF-8 bytes).
#[napi]
pub fn sign(payload: Either<String, Buffer>) -> napi::Result<String> {
    fix_binary_identity();
    intentguard::sign(&bytes_of(&payload)).map_err(err)
}

/// A whole receipt: the payload, then the attestation line and '\n'.
#[napi]
pub fn sign_receipt(payload: Either<String, Buffer>) -> napi::Result<Buffer> {
    fix_binary_identity();
    intentguard::sign_receipt(&bytes_of(&payload)).map(Buffer::from).map_err(err)
}

#[napi(object)]
pub struct Verdict {
    pub ok: bool,
    pub payload_bytes: Option<u32>,
    pub pubkey_b64: Option<String>,
    pub reason: Option<String>,
}

/// Re-hash the receipt's payload and check the signature in its last line. Needs no key and no clock.
#[napi]
pub fn verify(receipt: Either<String, Buffer>) -> Verdict {
    match intentguard::verify(&bytes_of(&receipt)) {
        Ok(v) => Verdict { ok: true, payload_bytes: Some(v.payload_bytes as u32), pubkey_b64: Some(v.pubkey_b64), reason: None },
        Err(e) => Verdict { ok: false, payload_bytes: None, pubkey_b64: None, reason: Some(e) },
    }
}
