// napi/src/lib.rs — IntentGuard in-process for Node (C461): the node extension and the server wrapper
// call the same library the CLI prints from, with no child process and no stdout parsing.
//
//   lens(text, bulk?, seed?)            → the placement JSON string, byte-identical to `intentguard --lens`
//   walk(grid, start?, maxDepth?, decay?) → the frames JSON string, byte-identical to `--ballistic`
//   sign(payload)                        → the attestation line over the payload's exact bytes
//   signReceipt(payload)                 → payload + attestation line + '\n' (what verify reads)
//   verify(receipt)                      → { ok, payloadBytes, pubkeyB64 } or { ok: false, reason }
//   openSpec(bulk?)                      → SpecHandle { specSha256, place(text) → Buffer, card(text) → Buffer }
//
// The vocabulary (data/snippet-library-144.json) is compiled INTO the .node file, so a deployed addon
// needs no data directory. The signing key is INTENTGUARD_SIGNING_SEED when set (a server: no ioreg), else
// the macOS host-derived key. `binary_sha256` in every attestation is the hash of THIS .node file (found
// with dladdr), never of the node executable that loaded it.

use intentguard::{attest, LensOpts, Targets, WalkOpts, LIBRARY_JSON};
use napi::bindgen_prelude::{Buffer, Either};
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
    let text = format!("[{}]", grid.iter().map(|v| v.to_string()).collect::<Vec<_>>().join(","));
    let (g, _) = intentguard::ops::grid_from_json(&text).map_err(err)?;
    let mut opts = WalkOpts::default();
    if let Some(d) = max_depth { opts.max_depth = d as usize; }
    if let Some(d) = decay { opts.decay_factor = d; }
    let start_idx = match start {
        Some(s) => Some(intentguard::start_index(&s).ok_or_else(|| err(format!("unknown ShortLex label {s:?}")))?),
        None => None,
    };
    Ok(intentguard::walk(&g, start_idx, &opts))
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
