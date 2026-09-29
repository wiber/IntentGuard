// src/lens.rs — `intentguard --lens` and `--definer-walk`: THE PLACEMENT, IN ONE PROCESS.
//
// gzip-NCD seed over the 144 lattice targets → the recursive guided definer walk (row → transpose →
// row; each hop's row read is an in-crate ballistic_walk call) → σ (z-margin over the walk heat) →
// the Chebyshev fence in 12×12 block space → the in_role / out_of_role partition of the walked cells.
//
// gzip parity: node bundles CHROMIUM's zlib fork, whose hardware-CRC insert_string emits different
// deflate bytes than stock zlib/miniz — vendor/zlib (see build.rs) is that exact fork, so
// node_gzip_len here equals node:zlib gzipSync().length byte-for-byte (289/289 measured).
//
// Carved from ThetaCog's pmu-onchip lens.rs. Kept byte-identical in what it prints for the naked seed and for
// the matched seed with a caller-supplied bulk (--bulk / --bulk-file, one rung, Bonferroni or --perm null); the
// reef ladder, guided passes, ring walkers, the session thread and the terminal/room label stay in ThetaCog.
//
// @forbidden-alternative any analytic shortcut · weight-sorted following · a flood walk · an LLM
//                        anywhere in this path (the receipt is LLM-free)

use crate::ballistic::{self, CELLS, GRID, SHORTLEX};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::path::{Path, PathBuf};

/// The 144-anchor lattice vocabulary, relative to the repo root (override with --targets).
pub const LIBRARY: &str = "data/snippet-library-144.json";
use std::time::Instant;

// ── the vendored Node/Chromium zlib (deflate side), linked by build.rs ──────────────────
// ONE declaration of the vendored-zlib FFI for the whole crate. png.rs deflates PNG IDAT with the
// same symbols at different settings (zlib wrapper, level 9); declaring them twice with two
// different ZStream types produced a clashing_extern_declarations warning — layout-identical and
// therefore harmless today, and exactly the kind of thing that stops being harmless quietly.
#[repr(C)]
pub(crate) struct ZStream {
    pub(crate) next_in: *mut u8,
    pub(crate) avail_in: u32,
    pub(crate) total_in: std::ffi::c_ulong,
    pub(crate) next_out: *mut u8,
    pub(crate) avail_out: u32,
    pub(crate) total_out: std::ffi::c_ulong,
    pub(crate) msg: *mut std::ffi::c_char,
    pub(crate) state: *mut std::ffi::c_void,
    pub(crate) zalloc: Option<extern "C" fn()>,
    pub(crate) zfree: Option<extern "C" fn()>,
    pub(crate) opaque: *mut std::ffi::c_void,
    pub(crate) data_type: i32,
    pub(crate) adler: std::ffi::c_ulong,
    pub(crate) reserved: std::ffi::c_ulong,
}

extern "C" {
    pub(crate) fn deflateInit2_(
        strm: *mut ZStream,
        level: i32,
        method: i32,
        window_bits: i32,
        mem_level: i32,
        strategy: i32,
        version: *const std::ffi::c_char,
        stream_size: i32,
    ) -> i32;
    pub(crate) fn deflate(strm: *mut ZStream, flush: i32) -> i32;
    pub(crate) fn deflateEnd(strm: *mut ZStream) -> i32;
    pub(crate) fn deflateBound(strm: *mut ZStream, source_len: std::ffi::c_ulong) -> std::ffi::c_ulong;
}

const Z_DEFAULT_COMPRESSION: i32 = -1; // node gzipSync default level
const Z_DEFLATED: i32 = 8;
const Z_DEFAULT_STRATEGY: i32 = 0;
const Z_FINISH: i32 = 4;
const Z_OK: i32 = 0;
const Z_STREAM_END: i32 = 1;
const GZIP_WINDOW_BITS: i32 = 15 + 16; // gzip wrapper, node default windowBits 15
const MEM_LEVEL: i32 = 8; // node default

/// gzip length EXACTLY as node's `gzipSync(Buffer.from(s,'utf8')).length` computes it.
pub fn node_gzip_len(data: &[u8]) -> usize {
    unsafe {
        let mut s: ZStream = std::mem::zeroed();
        let version = b"1.3.1\0";
        let rc = deflateInit2_(
            &mut s,
            Z_DEFAULT_COMPRESSION,
            Z_DEFLATED,
            GZIP_WINDOW_BITS,
            MEM_LEVEL,
            Z_DEFAULT_STRATEGY,
            version.as_ptr() as *const std::ffi::c_char,
            std::mem::size_of::<ZStream>() as i32,
        );
        assert_eq!(rc, Z_OK, "deflateInit2 failed ({})", rc);
        let cap = deflateBound(&mut s, data.len() as std::ffi::c_ulong) as usize + 32;
        let mut out = vec![0u8; cap];
        s.next_in = data.as_ptr() as *mut u8;
        s.avail_in = data.len() as u32;
        s.next_out = out.as_mut_ptr();
        s.avail_out = cap as u32;
        let rc = deflate(&mut s, Z_FINISH);
        assert_eq!(rc, Z_STREAM_END, "deflate(Z_FINISH) failed ({})", rc);
        let len = s.total_out as usize;
        deflateEnd(&mut s);
        len
    }
}

// ── ShortLex rank axes (shortlex-coords.mjs AX) ─────────────────────────────────────────
const AX: [&str; 12] = ["A", "B", "C", "A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"];
const NB: i64 = 12;

fn rank_to_index(rank: &str) -> i64 {
    AX.iter().position(|a| *a == rank.trim()).map(|i| i as i64).unwrap_or(-1)
}

/// shortlex-coords.mjs shortLexToBlock: "R,C" → (br, bc); unknown rank → -1 (the JS
/// caller keeps (0,0) on a throw — we mirror that at the call site).
pub(crate) fn shortlex_to_block(coord: &str) -> (i64, i64) {
    let mut parts = coord.split(',');
    let r = parts.next().unwrap_or("");
    let c = parts.next().unwrap_or("");
    (rank_to_index(r), rank_to_index(c))
}

// ── the 144 targets + coords from the snippet library ─────────────────────
struct Library {
    coords: Vec<String>,  // 144 — anchors[r*12+c].coord, '' where absent
    targets: Vec<String>, // 144 — snippet || seed, '' where absent
}

fn load_library(path: &Path) -> Result<Library, String> {
    let text = std::fs::read_to_string(path)
        .map_err(|e| format!("cannot read snippet library {}: {}", path.display(), e))?;
    parse_library(&text, &path.display().to_string())
}

/// The library from its JSON text (`label` names it in an error) — the in-memory door the Node addon
/// uses to carry the vocabulary inside the .node file instead of reading it off disk.
fn parse_library(text: &str, label: &str) -> Result<Library, String> {
    let raw: Value =
        serde_json::from_str(text).map_err(|e| format!("bad JSON in {}: {}", label, e))?;
    let arr: Vec<Value> = if let Some(a) = raw.as_array() {
        a.clone()
    } else {
        raw.get("anchors")
            .or_else(|| raw.get("nodes"))
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default()
    };
    let mut coords = vec![String::new(); GRID];
    let mut targets = vec![String::new(); GRID];
    for a in &arr {
        let row = a.get("row").and_then(|v| v.as_str()).unwrap_or("");
        let col = a.get("col").and_then(|v| v.as_str()).unwrap_or("");
        let (r, c) = (rank_to_index(row), rank_to_index(col));
        if r >= 0 && c >= 0 {
            let idx = (r * 12 + c) as usize;
            coords[idx] = a.get("coord").and_then(|v| v.as_str()).unwrap_or("").to_string();
            targets[idx] = a
                .get("snippet")
                .or_else(|| a.get("seed"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
        }
    }
    Ok(Library { coords, targets })
}

// ── the directed connectivity grid (buildDirected): the in-memory build from the library coords ──
fn load_directed_grid(coords: &[String]) -> Box<[u8; CELLS]> {
    // buildDirected(): diagonal lit; i→j (j>i) lit when they share the row OR column axis.
    let ax: Vec<(String, String)> = coords
        .iter()
        .map(|c| {
            let s = if c.is_empty() { "A,A" } else { c.as_str() };
            let mut p = s.split(',');
            (
                p.next().unwrap_or("").to_string(),
                p.next().unwrap_or("").to_string(),
            )
        })
        .collect();
    let mut g = Box::new([0u8; CELLS]);
    for i in 0..GRID {
        g[i * GRID + i] = 1;
        for j in (i + 1)..GRID {
            if ax[i].0 == ax[j].0 || ax[i].1 == ax[j].1 {
                g[i * GRID + j] = 1;
            }
        }
    }
    g
}

// ── seeding: litScores + topSeeds (unified-drift.mjs, gzip-NCD, SEED_K = 3) ─────────────
fn ncd_sim(doc_z: usize, doc: &str, snip: &str, snip_z: usize) -> f64 {
    if snip.is_empty() {
        return 0.0;
    }
    let joined = format!("{}\n{}", doc, snip);
    let join_z = node_gzip_len(joined.as_bytes());
    let denom = doc_z.max(snip_z);
    if denom == 0 {
        return 0.0;
    }
    (1.0 - (join_z as f64 - doc_z.min(snip_z) as f64) / denom as f64).max(0.0)
}

fn lit_scores(text: &str, targets: &[String]) -> Vec<f64> {
    if text.trim().is_empty() {
        return vec![0.0; GRID];
    }
    let doc_z = node_gzip_len(text.as_bytes());
    let snip_z: Vec<usize> = targets
        .iter()
        .map(|t| if t.is_empty() { 0 } else { node_gzip_len(t.as_bytes()) })
        .collect();
    targets
        .iter()
        .enumerate()
        .map(|(i, t)| ncd_sim(doc_z, text, t, snip_z[i]))
        .collect()
}

fn top_seeds(scores: &[f64], coords: &[String], k: usize) -> Vec<usize> {
    let mut xs: Vec<(f64, usize)> = scores
        .iter()
        .enumerate()
        .filter(|(i, v)| !coords[*i].is_empty() && **v > 0.0)
        .map(|(i, v)| (*v, i))
        .collect();
    // JS: .sort((a,b) => b[0]-a[0] || a[1]-b[1]) — score DESC, index ASC on ties.
    xs.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap().then(a.1.cmp(&b.1)));
    xs.into_iter().take(k).map(|x| x.1).collect()
}

// ── THE MATCHED SEED — META-BULK applied to the seed itself (ported verbatim from ThetaCog's lens.rs) ──
// The naked gzip-NCD of a short text against a 700–800-char cell snippet is length noise: on 25–123-char
// prompts it returned the diagonal magnets (C,C · C2,C2 · A,A) with top-5 spreads < 0.002. The matched seed
// answers that in three moves, none of which needs ThetaCog:
//   1. BULK: the caller's context (--bulk / --bulk-file) rides with the text, capped at BULK_MAX_RATIO × the text.
//      In ThetaCog the bulk is the routed reef lane's mass (its template + rules). Here it is whatever the caller
//      hands over — a spec, a README, house rules — and nothing is supplied by default.
//   2. COARSE eye (BULK_EYE_COARSE) over all 144 → the top-K region; FINE eye (BULK_EYE_FINE) over the region, each
//      target CUT to the intent's own length (aperture::matched_cut) so equal chars meet equal chars.
//   3. CALIBRATION: each fine score minus the same cell's score for a same-mass NULL — the LINE's words shuffled by
//      the seeded LCG, the bulk kept byte for byte. What survives is what the line's ORDER adds against that cell.
// The fit (gain, margin, z over the region, better_than_random = gain ≥ FIT_MIN_GAIN and z ≥ 2) is the seed's own
// verdict on whether the placement is a measurement; a row that fails it is UNMEASURED, and a caller must treat the
// pixel as absent rather than read it.
pub const BULK_EYE_COARSE: usize = 320;
pub const BULK_EYE_FINE: usize = 900;
pub const BULK_TOP_K: usize = 12;
pub const BULK_MAX_RATIO: usize = 2;
pub const FIT_MIN_GAIN: f64 = 0.015;

/// z required for ONE rung to be admissible (the historical z ≥ 2, one-sided p = 0.02275) when n rungs were drawn:
/// the family-wise threshold Φ⁻¹(1 − 0.02275 / n) (Bonferroni; Abramowitz–Stegun 26.2.23 for the inverse normal).
pub fn z_required(n: usize) -> f64 {
    let p = 0.02275f64 / (n.max(1) as f64);
    let t = (-2.0 * p.ln()).sqrt();
    t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1.0 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t)
}

/// The paired permutation verdict (--perm K): the real winner is admissible iff it beats every shuffled winner
/// (exceed = 0) and stands two null standard deviations above their mean.
#[allow(dead_code)]   // `n` is the draw count a caller reads back; the CLI prints k instead
pub struct PermVerdict { pub n: usize, pub mean: f64, pub std: f64, pub w_max: f64, pub exceed: usize, pub z: f64, pub p: f64, pub ok: bool }
pub fn perm_verdict(w_real: f64, w_null: &[f64]) -> PermVerdict {
    let n = w_null.len() as f64;
    let mean = w_null.iter().sum::<f64>() / n;
    let std = (w_null.iter().map(|w| (w - mean) * (w - mean)).sum::<f64>() / n).sqrt().max(1e-9);
    let w_max = w_null.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let exceed = w_null.iter().filter(|w| **w >= w_real).count();
    let z = (w_real - mean) / std;
    let p = (1.0 + exceed as f64) / (n + 1.0);
    PermVerdict { n: w_null.len(), mean, std, w_max, exceed, z, p, ok: exceed == 0 && z >= 2.0 }
}

fn cut(s: &str, n: usize) -> &str { match s.char_indices().nth(n) { Some((i, _)) => &s[..i], None => s } }

/// The same LCG as the JS, seeded. Seed 7 is THE calibrating null; the permutation ratchet draws its K further
/// shuffles from other seeds — the same generator, so a row is re-runnable byte for byte.
pub fn shuffle_words_seeded(s: &str, seed0: u64) -> String {
    let mut w: Vec<&str> = s.split_whitespace().collect();
    let mut seed: u64 = seed0 % 233280;
    if w.len() > 1 { for i in (1..w.len()).rev() { seed = (seed * 9301 + 49297) % 233280; let j = (seed % (i as u64 + 1)) as usize; w.swap(i, j); } }
    w.join(" ")
}
/// THE NULL IS THE LINE'S: when `text` is a thread (line + priors) only the line's words are shuffled and the rest is
/// kept byte for byte. With no thread (line == text, the only case in this crate) this is shuffle_words_seeded.
pub fn shuffle_line_in(text: &str, line: &str, seed: u64) -> String {
    if !line.is_empty() && line != text && text.starts_with(line) { format!("{}{}", shuffle_words_seeded(line, seed), &text[line.len()..]) } else { shuffle_words_seeded(text, seed) }
}

pub struct SeedFit { pub gain: f64, pub margin: f64, pub z_fine: f64, pub better_than_random: bool, pub region: Vec<usize>, pub mass_prompt: usize, pub mass_bulk: usize, pub mass_intent: usize, pub matched_cut: bool, pub coarse_cut: usize, pub fine_cut: usize }

/// matched_cut — cut the TARGET side down to the intent's own length at both eyes (equal chars = fit). ONE aperture
/// rule in the crate: aperture.rs (MATCHED = cut the larger side, ADMISSIBLE = the 220 floor, CUT NEVER GROW).
pub struct SeedAperture { pub matched_cut: bool }
impl Default for SeedAperture { fn default() -> Self { SeedAperture { matched_cut: true } } }
// The three doors below are the library API ThetaCog's ratchet calls; the CLI here reaches matched_seed_parts_line
// directly (one rung, the line named), so the binary build sees them only from the in-crate tests.
#[allow(dead_code)]
pub fn matched_seed(text: &str, bulk: &str, targets: &[String]) -> (Vec<f64>, SeedFit) { matched_seed_with(text, bulk, targets, &SeedAperture::default()) }
#[allow(dead_code)]
pub fn matched_seed_with(text: &str, bulk: &str, targets: &[String], ap: &SeedAperture) -> (Vec<f64>, SeedFit) {
    matched_seed_parts(text, &[(None, bulk.to_string())], targets, ap)
}

/// THE PARTS-AWARE SEED: the mass is a list of parts; a part tagged with a target index is that target's own snippet
/// and is LEFT OUT of the intent when that target is scored — a hat can widen the aperture for every other cell and
/// can never score its own cell (the fence against the leak the JS prototype had: 76% false green from feeding the
/// evaluator's own targets back as intent). Nothing in this crate tags a part today; the fence stays because the
/// function is the same one ThetaCog runs, byte for byte.
#[allow(dead_code)]
pub fn matched_seed_parts(text: &str, parts: &[(Option<usize>, String)], targets: &[String], ap: &SeedAperture) -> (Vec<f64>, SeedFit) { matched_seed_parts_line(text, text, parts, targets, ap, 7) }
/// The seed with the LINE named: the null shuffles only `line` inside `text` with `null_seed` (7 = the calibrating null).
pub fn matched_seed_parts_line(text: &str, line: &str, parts: &[(Option<usize>, String)], targets: &[String], ap: &SeedAperture, null_seed: u64) -> (Vec<f64>, SeedFit) {
    let prompt = text;
    let pchars = prompt.chars().count();
    let allow = pchars * BULK_MAX_RATIO;
    // the intent for target i: prompt + every part except the one tagged i, cut at the bulk allowance and the fine eye
    let build = |skip: Option<usize>| -> (String, String, usize) {
        let mut b = String::new();
        for (tag, p) in parts { if tag.is_some() && *tag == skip { continue; } if p.trim().is_empty() { continue; } if !b.is_empty() { b.push('\n'); } b.push_str(p); }
        let bulk_cut = cut(&b, allow).to_string();
        let intent_full = if bulk_cut.is_empty() { prompt.to_string() } else { format!("{}\n{}", prompt, bulk_cut) };
        let intent = cut(&intent_full, BULK_EYE_FINE).to_string();
        let bulk_chars = bulk_cut.chars().count();
        (intent, bulk_cut, bulk_chars)
    };
    let (intent, bulk_cut, _) = build(None);
    let tagged: HashSet<usize> = parts.iter().filter_map(|(t, _)| *t).collect();
    // per-target intent variants exist only for tagged targets (a handful); everyone else shares the full intent
    let variant = |i: usize| -> Option<String> { if tagged.contains(&i) { Some(build(Some(i)).0) } else { None } };
    let d_c = cut(&intent, BULK_EYE_COARSE).to_string();
    let d_cz = node_gzip_len(d_c.as_bytes());
    let coarse_cut = if ap.matched_cut { crate::aperture::matched_budget(d_c.len()).min(BULK_EYE_COARSE * 4) } else { BULK_EYE_COARSE };
    let fine_cut = if ap.matched_cut { crate::aperture::matched_budget(intent.len()).min(BULK_EYE_FINE * 4) } else { BULK_EYE_FINE };
    let target_cut = |t: &str, eye: usize, budget: usize| -> String { if ap.matched_cut { crate::aperture::matched_cut(cut(t, eye), budget) } else { cut(t, eye).to_string() } };
    let mut coarse: Vec<(f64, usize)> = targets.iter().enumerate().map(|(i, t)| {
        let (dc, dcz) = match variant(i) { Some(v) => { let c = cut(&v, BULK_EYE_COARSE).to_string(); let z = node_gzip_len(c.as_bytes()); (c, z) } None => (d_c.clone(), d_cz) };
        let sn = target_cut(t, BULK_EYE_COARSE, dc.len());
        (ncd_sim(dcz, &dc, &sn, if sn.is_empty() { 0 } else { node_gzip_len(sn.as_bytes()) }), i)
    }).collect();
    coarse.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap().then(a.1.cmp(&b.1)));
    let region: Vec<usize> = coarse.iter().take(BULK_TOP_K).map(|x| x.1).collect();
    let d_fz = node_gzip_len(intent.as_bytes());
    // THE NULL IS THE LINE'S: shuffle ONLY the prompt's words and keep the mass intact. Shuffling the whole intent let
    // the MASS's word order carry the score; now the calibrated gain is what the ordered LINE adds over its own shuffle
    // against the same mass — a meaningless line adds nothing and reads gain ≈ 0 whatever mass surrounds it.
    let null_of = |full_intent: &str, skip: Option<usize>| -> String { let shuffled = shuffle_line_in(prompt, line, null_seed); let (_, b, _) = build(skip); let n = if b.is_empty() { shuffled } else { format!("{}\n{}", shuffled, b) }; let _ = full_intent; cut(&n, BULK_EYE_FINE).to_string() };
    let null_doc = null_of(&intent, None);
    let null_z = node_gzip_len(null_doc.as_bytes());
    let mut fine: Vec<(f64, usize)> = region.iter().map(|&i| {
        let (di, diz, nd, nz) = match variant(i) { Some(v) => { let z = node_gzip_len(v.as_bytes()); let n = null_of(&v, Some(i)); let nz = node_gzip_len(n.as_bytes()); (v, z, n, nz) } None => (intent.clone(), d_fz, null_doc.clone(), null_z) };
        let sn = target_cut(&targets[i], BULK_EYE_FINE, di.len());
        let sz = if sn.is_empty() { 0 } else { node_gzip_len(sn.as_bytes()) };
        (ncd_sim(diz, &di, &sn, sz) - ncd_sim(nz, &nd, &sn, sz), i)
    }).collect();
    fine.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap().then(a.1.cmp(&b.1)));
    let gains: Vec<f64> = fine.iter().map(|x| x.0).collect();
    let n = gains.len().max(1) as f64;
    let mean = gains.iter().sum::<f64>() / n;
    let std = (gains.iter().map(|g| (g - mean) * (g - mean)).sum::<f64>() / n).sqrt().max(1e-9);
    let top = fine.first().map(|x| x.0).unwrap_or(0.0);
    let second = fine.get(1).map(|x| x.0).unwrap_or(top);
    let z = (top - mean) / std;
    let mut scores = vec![0.0; targets.len()];
    for (g, i) in &fine { scores[*i] = g.max(0.0) + 1e-6; }   // > 0 so top_seeds admits region cells; order = calibrated gain
    (scores, SeedFit { gain: top, margin: top - second, z_fine: z, better_than_random: top >= FIT_MIN_GAIN && z >= 2.0, region, mass_prompt: prompt.chars().count(), mass_bulk: bulk_cut.chars().count(), mass_intent: intent.chars().count(), matched_cut: ap.matched_cut, coarse_cut, fine_cut })
}

/// The mass ladder as it stands without a reef: the caller's bulk, trimmed, or nothing. In ThetaCog this continues
/// given → lane:<lane> → reef:<domain> ranked by vocabulary overlap; the reef is ThetaCog's and stays there.
pub fn bulk_ladder(bulk: &str) -> Vec<(String, String)> {
    let m = bulk.trim();
    if m.is_empty() { Vec::new() } else { vec![("given".to_string(), m.to_string())] }
}

/// the 144-byte CellState array for this walk — the same classifier as --lattice, in the same call
fn lattice_cells(_coords: &[String], pixel: Option<&str>, fence: &Option<(i64, i64, i64, i64)>, walked: &[String]) -> Value {
    let px = pixel.and_then(crate::lattice::coord_rc);
    let fb = fence.map(|(r0, r1, c0, c1)| crate::lattice::FenceBox { r0: r0.max(0) as usize, r1: r1.max(0) as usize, c0: c0.max(0) as usize, c1: c1.max(0) as usize });
    let w: Vec<(usize, usize)> = walked.iter().filter_map(|c| crate::lattice::coord_rc(c)).collect();
    let l = crate::lattice::classify(px, fb, &w);
    json!({ "cells": l.cells.iter().map(|b| b.to_string()).collect::<Vec<_>>().join(""), "counts": { "green": l.green, "amber": l.amber, "red": l.red }, "pull_label": l.pull_target.map(|(r, c)| crate::ballistic::SHORTLEX[r * 12 + c]) })
}

// ── σ: zMargin over the RAW walk heat (unified-drift.mjs) ──────────────────────────────
fn z_margin(values: &[f64]) -> f64 {
    let mut xs: Vec<f64> = values.iter().cloned().filter(|v| *v > 0.0).collect();
    // JS sort desc is stable; Rust sort_by is stable — identical sequence, identical sums.
    xs.sort_by(|a, b| b.partial_cmp(a).unwrap());
    if xs.len() < 2 {
        return 0.0;
    }
    let top = xs[0];
    let rest = &xs[1..];
    let mean = rest.iter().sum::<f64>() / rest.len() as f64;
    let variance = rest.iter().map(|b| (b - mean) * (b - mean)).sum::<f64>() / rest.len() as f64;
    let std = variance.sqrt();
    if std > 0.0 {
        // JS +((top-mean)/std).toFixed(2)
        ((top - mean) / std * 100.0).round() / 100.0
    } else {
        0.0
    }
}

// ── THE WALK — definerWalk144 ported hop for hop; row reads are IN-CRATE calls ──────────
struct WalkOut {
    heat: Vec<f64>,
    ply: Vec<i32>,
    hops: usize,
    max_ply: usize,
    matrix: Vec<f64>,
    m_ply: Vec<i32>,
    time_budget_tripped: bool,
    hop_log: Vec<Value>,
}

struct WalkOpts {
    max_depth: usize,
    top_k: usize,
    budget: usize,
    budget_ms: u128,
    decay: f64,
}

/// One hop's row read: the SAME semantics as spawning `intentguard --ballistic --grid <tmp>
/// --start <coord> --max-depth 1` and taking the last frame's visits — but as a function
/// call on the grid already in memory. Mirrors main.rs run_ballistic: --start resolves
/// against SHORTLEX; an unresolvable coord falls through to the walk-all path (the JS
/// process would have, too — it cannot occur with a valid library).
fn row_read(grid: &[u8; CELLS], coord: &str) -> std::collections::BTreeMap<usize, f64> {
    let opts = ballistic::WalkOpts { max_depth: 1, ..ballistic::WalkOpts::default() };
    let frames = match SHORTLEX.iter().position(|x| *x == coord) {
        Some(s) => ballistic::ballistic_walk(grid, s, &opts),
        None => ballistic::ballistic_walk_all(grid, &opts),
    };
    frames.last().map(|f| f.visits.clone()).unwrap_or_default()
}

fn definer_walk(
    grid: &[u8; CELLS],
    coords: &[String],
    start_anchors: &[usize],
    o: &WalkOpts,
) -> WalkOut {
    let mut heat = vec![0.0f64; GRID];
    let mut ply = vec![-1i32; GRID];
    let mut matrix = vec![0.0f64; CELLS];
    let mut m_ply = vec![-1i32; CELLS];
    let mut hop_log: Vec<Value> = Vec::new();
    let mut seen: HashSet<usize> = HashSet::new();
    let mut queued: HashSet<usize> = HashSet::new();

    // frontier: unique seeds in order, valid + coord present (JS: new Set(...filter))
    let mut frontier: Vec<(usize, usize)> = Vec::new();
    let mut dedupe: HashSet<usize> = HashSet::new();
    for &a in start_anchors {
        if a < GRID && !coords[a].is_empty() && dedupe.insert(a) {
            frontier.push((a, 0));
        }
    }
    for (a, _) in &frontier {
        queued.insert(*a);
    }
    if let Some(&(s, _)) = frontier.first() {
        if ply[s] < 0 {
            ply[s] = 0;
        }
        heat[s] += 1.0;
    }
    let mut hops = 0usize;
    let mut max_ply = 0usize;
    let t0 = Instant::now();

    while !frontier.is_empty() && hops < o.budget && t0.elapsed().as_millis() < o.budget_ms {
        let mut batch: Vec<(usize, usize)> = Vec::new();
        for &(cur, d) in &frontier {
            if seen.contains(&cur) || d > o.max_depth {
                continue;
            }
            if hops + batch.len() >= o.budget {
                break;
            }
            seen.insert(cur);
            if ply[cur] < 0 {
                ply[cur] = d as i32;
            }
            if d > max_ply {
                max_ply = d;
            }
            batch.push((cur, d));
        }
        if batch.is_empty() {
            break;
        }
        // ONE row read per hop — the same reads the JS fired as processes, now in-crate.
        let reads: Vec<std::collections::BTreeMap<usize, f64>> =
            batch.iter().map(|&(cur, _)| row_read(grid, &coords[cur])).collect();
        hops += batch.len();
        let mut next: Vec<(usize, usize)> = Vec::new();
        for (b, &(cur, d)) in batch.iter().enumerate() {
            let visits = &reads[b];
            // rowCells: visits[cur*144+j] > 0, j != cur — ascending j IS ShortLex order
            // (gestalt-boundary-first), NEVER weight-sorted (AR: no weight-sorted ranking).
            let mut row_cells: Vec<(usize, f64)> = Vec::new();
            for j in 0..GRID {
                if j == cur {
                    continue;
                }
                let w = *visits.get(&(cur * GRID + j)).unwrap_or(&0.0);
                if w > 0.0 {
                    row_cells.push((j, w));
                }
            }
            let fade = o.decay.powi(d as i32);
            // the whole READ row paints the 20736 cloud, decayed by ply…
            for &(j, w) in &row_cells {
                let cell = cur * GRID + j;
                matrix[cell] += w * fade;
                if m_ply[cell] < 0 {
                    m_ply[cell] = d as i32;
                }
            }
            // …but only the TOP-K ranked UNSEEN∧UNQUEUED are FOLLOWED (the transpose:
            // column j → next row j) — guided, not flood. heat ONLY on followed anchors.
            let mut followed = 0usize;
            for &(j, _) in &row_cells {
                if followed >= o.top_k {
                    break;
                }
                if seen.contains(&j) || queued.contains(&j) {
                    continue;
                }
                if d + 1 > o.max_depth {
                    break;
                }
                if ply[j] < 0 {
                    ply[j] = (d + 1) as i32;
                }
                heat[j] += fade;
                next.push((j, d + 1));
                queued.insert(j);
                followed += 1;
            }
            hop_log.push(json!({ "hop": hops - batch.len() + b + 1, "anchor": coords[cur].clone(), "ply": d, "row_cells": row_cells.len(), "followed": row_cells.iter().take(o.top_k).map(|&(j, _)| coords[j].clone()).collect::<Vec<_>>(), "elapsed_ms": t0.elapsed().as_millis() as u64 }));
        }
        frontier = next;
    }
    // the wall valve fired before the WORK bound → not byte-recomputable; carry the flag.
    let time_budget_tripped =
        !frontier.is_empty() && hops < o.budget && t0.elapsed().as_millis() >= o.budget_ms;
    WalkOut { heat, ply, hops, max_ply, matrix, m_ply, time_budget_tripped, hop_log }
}

// ── THE LIBRARY DOOR — inputs in, a value out; no printing, no exit ────────────────────
// The CLI (main.rs) and the Node addon (napi/) both call `lens` / `definer_walk_value`. Every error
// comes back as the exact message the CLI prints to stderr before its exit 2.

fn flag_val(args: &[String], flag: &str) -> Option<String> {
    args.iter().position(|a| a == flag).and_then(|i| args.get(i + 1)).cloned()
}

/// Repo root: --repo wins; else inferred from the binary's location (<repo>/target/release/intentguard); else the cwd.
pub fn resolve_repo(args: &[String]) -> PathBuf {
    if let Some(r) = flag_val(args, "--repo") {
        return PathBuf::from(r);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(root) = exe.ancestors().nth(3) {
            if root.join(LIBRARY).exists() {
                return root.to_path_buf();
            }
        }
    }
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

/// Where the 144-anchor vocabulary comes from: a file (the CLI default, `<repo>/data/…` or --targets),
/// or JSON text already in memory (the Node addon embeds it, so a deployed .node needs no data dir).
#[derive(Clone, Debug)]
pub enum Targets {
    Path(PathBuf),
    Json(String),
}

/// Every knob `--lens` reads. `LensOpts::default()` is the CLI with no flags beside `--text`, except
/// that the vocabulary is `Targets::Path(LIBRARY)` relative to the cwd — name it with `with_targets`.
#[derive(Clone, Debug)]
pub struct LensOpts {
    pub targets: Targets,
    pub max_depth: usize,
    pub top_k: usize,
    pub budget: usize,
    pub budget_ms: u128,
    pub decay: f64,
    pub floor: f64,
    pub radius: i64,
    /// `Some("matched")` / `Some("naked")`; None = matched when a bulk is given, else naked (the CLI rule).
    pub seed: Option<String>,
    /// The caller's context (the CLI's --bulk). `Some("")` still selects the matched seed, as --bulk "" does.
    pub bulk: Option<String>,
    /// --bulk-file: read inside `lens`, AFTER the vocabulary loads (the CLI's error order).
    pub bulk_file: Option<PathBuf>,
    pub matched_cut: bool,
    pub no_ladder: bool,
    pub ladder_always: bool,
    pub perm: usize,
}

impl Default for LensOpts {
    fn default() -> Self {
        LensOpts {
            targets: Targets::Path(PathBuf::from(LIBRARY)),
            max_depth: 8, top_k: 2, budget: 220, budget_ms: 600_000, decay: 0.5, floor: 0.30,
            radius: std::env::var("LENS_RADIUS").ok().and_then(|s| s.parse().ok()).unwrap_or(2),
            seed: None, bulk: None, bulk_file: None,
            matched_cut: SeedAperture::default().matched_cut, no_ladder: false, ladder_always: false, perm: 0,
        }
    }
}

impl LensOpts {
    pub fn with_targets(mut self, t: Targets) -> Self { self.targets = t; self }
    pub fn with_bulk(mut self, b: Option<String>) -> Self { self.bulk = b; self }

    /// The CLI's argument vector → options. Refuses (Err, the CLI's exact stderr line) the flags that read
    /// ThetaCog's own session receipts or reef.
    pub fn from_args(args: &[String]) -> Result<LensOpts, String> {
        // What stays in ThetaCog and is refused out loud rather than silently answered: the session thread (--session,
        // --receipts-dir, --before), the reef lanes (--lane, --reef), the guided passes and ring walkers (they read the
        // reef), and the thread-null arm. Each reads ThetaCog's own receipts or reef file; none has a stranger-side input.
        for f in ["--session", "--receipts-dir", "--before", "--lane", "--reef", "--ring-walkers", "--worms", "--perm-thread", "--ratchet-file"] {
            if args.iter().any(|a| a == f) {
                return Err(format!("intentguard --lens: {} reads ThetaCog's session receipts or reef and is not in this crate", f));
            }
        }
        let repo = resolve_repo(args);
        Ok(LensOpts {
            targets: Targets::Path(flag_val(args, "--targets").map(PathBuf::from).unwrap_or_else(|| repo.join(LIBRARY))),
            // WALK KNOBS — the default is the full walk (maxDepth 8 · topK 2 · budget 220 · budgetMs 600000 · decay 0.5).
            max_depth: flag_val(args, "--max-depth").and_then(|s| s.parse().ok()).unwrap_or(8usize),
            top_k: flag_val(args, "--top-k").and_then(|s| s.parse().ok()).unwrap_or(2usize),
            budget: flag_val(args, "--budget").and_then(|s| s.parse().ok()).unwrap_or(220usize),
            budget_ms: flag_val(args, "--budget-ms").and_then(|s| s.parse().ok()).unwrap_or(600_000u128),
            decay: flag_val(args, "--decay").and_then(|s| s.parse().ok()).unwrap_or(0.5f64),
            floor: flag_val(args, "--floor").and_then(|s| s.parse().ok()).unwrap_or(0.30f64),
            // Chebyshev fence radius in blocks.
            radius: flag_val(args, "--radius")
                .and_then(|s| s.parse().ok())
                .or_else(|| std::env::var("LENS_RADIUS").ok().and_then(|s| s.parse().ok()))
                .unwrap_or(2),
            seed: flag_val(args, "--seed"),
            bulk: flag_val(args, "--bulk"),
            bulk_file: flag_val(args, "--bulk-file").map(PathBuf::from),
            matched_cut: !args.iter().any(|a| a == "--no-matched-cut") && (args.iter().any(|a| a == "--matched-cut") || SeedAperture::default().matched_cut),
            no_ladder: args.iter().any(|a| a == "--no-ladder"),
            ladder_always: args.iter().any(|a| a == "--ladder-always"),
            perm: flag_val(args, "--perm").and_then(|s| s.parse().ok()).unwrap_or(0),
        })
    }
}

fn library_from(t: &Targets) -> Result<Library, String> {
    match t {
        Targets::Path(p) => load_library(p),
        Targets::Json(s) => parse_library(s, "the embedded snippet library"),
    }
}

/// `--lens`: place `text` on the 144×144 lattice. Returns the JSON object the CLI prints (serialize it with
/// `serde_json::to_string` for the CLI's exact bytes); Err carries the CLI's exact stderr line.
pub fn lens(text: &str, o: &LensOpts) -> Result<Value, String> {
    let text = text.to_string();
    let lib = library_from(&o.targets).map_err(|e| format!("intentguard --lens: {}", e))?;
    let (max_depth, top_k, budget, budget_ms, decay, floor, radius) = (o.max_depth, o.top_k, o.budget, o.budget_ms, o.decay, o.floor, o.radius);

    // ── SEED: gzip-NCD over the 144 targets (timed in μs) ──
    let t_seed = Instant::now();
    // --seed matched (the default when a bulk is given, or --seed matched) · naked = the original lit_scores.
    // THE BULK IS THE CALLER'S: --bulk <text> or --bulk-file <path>; nothing is supplied by default. It is the context
    // the intent is measured against — a spec, a README, house rules — capped at BULK_MAX_RATIO × the text inside
    // the seed. ThetaCog fills it from its routed reef lane; a stranger names it.
    let seed_mode = o.seed.clone().unwrap_or_else(|| if o.bulk.is_some() || o.bulk_file.is_some() { "matched".into() } else { "naked".into() });
    let bulk = match &o.bulk {
        Some(b) => b.clone(),
        None => match &o.bulk_file {
            Some(p) => std::fs::read_to_string(p).map_err(|e| format!("intentguard --lens: --bulk-file {}: {}", p.display(), e))?,
            None => String::new(),
        },
    };
    let ap = SeedAperture { matched_cut: o.matched_cut };
    // The intent span: the text alone, with its gzip mass against the aperture floor (one floor: aperture.rs).
    let line = text.clone();
    let intent_span = json!({ "prompts": 1, "chars": text.chars().count(), "gzip": node_gzip_len(text.as_bytes()), "floor": crate::aperture::MIN_GZIP_BYTES, "session": Value::Null, "thread": false });
    let grid = load_directed_grid(&lib.coords);
    let mut attempts: Vec<Value> = Vec::new();
    let mut ratchet_json = Value::Null;
    // The ladder runs on THIN lines (< BULK_EYE_COARSE chars) unless --ladder-always; --no-ladder is the parity config.
    // Without a reef the ladder is one rung at most (the given bulk, trimmed), so the ratchet here is that one rung,
    // then the null: Bonferroni z_required(1) by default, or the exact paired permutation under --perm K.
    let thin_line = line.chars().count() < BULK_EYE_COARSE;
    let no_ladder = o.no_ladder;
    let ladder_ok = thin_line || o.ladder_always;
    let (scores, seed_fit) = if seed_mode != "matched" { (lit_scores(&text, &lib.targets), None) } else {
        let mut ladder: Vec<(String, String)> = if ladder_ok && !no_ladder { bulk_ladder(&bulk) } else { Vec::new() };
        if ladder.is_empty() { ladder.push((if bulk.is_empty() { "none".to_string() } else { "given".to_string() }, bulk.clone())); }
        let mut best: Option<(Vec<f64>, SeedFit, String)> = None;
        let mut rung_log: Vec<Vec<(Option<usize>, String)>> = Vec::new();
        let mut steps = 0usize;
        for (label, mass) in &ladder {
            steps += 1;
            let parts: Vec<(Option<usize>, String)> = vec![(None, mass.clone())];
            let (s, f) = matched_seed_parts_line(&text, &line, &parts, &lib.targets, &ap, 7);
            rung_log.push(parts);
            let top = top_seeds(&s, &lib.coords, 1).first().map(|&i| lib.coords[i].clone());
            attempts.push(json!({ "label": label, "mass": mass.chars().count(), "hats": 0, "thread_prompts": 1, "gain": (f.gain * 1e4).round() / 1e4, "z": (f.z_fine * 100.0).round() / 100.0, "ok": f.better_than_random, "grip": Value::Null, "pixel": top, "sources": [format!("ladder:{}", label)] }));
            // the winner rule with no lane grip anywhere: an admissible rung beats an inadmissible one; between two of a kind the higher z
            let take = match &best { None => true, Some((_, bf, _)) => if f.better_than_random && bf.better_than_random { f.z_fine > bf.z_fine } else if f.better_than_random { true } else if bf.better_than_random { false } else { f.z_fine > bf.z_fine } };
            if take { best = Some((s, f, label.clone())); }
        }
        let (bs, mut bf, winner) = best.expect("at least one rung");
        let z_req = z_required(attempts.len());
        let raw_ok = bf.better_than_random;
        // THE PERMUTATION RATCHET (--perm K, 0 = off): the same rungs re-drawn K times with only the LINE's words shuffled
        // (seeds 7 + 97k), each draw's winner its best gain; the real winner must beat every draw and stand two null
        // standard deviations above their mean. Runs only when a rung already latched raw.
        let perm_k: usize = o.perm;
        let mut perm_json = Value::Null;
        let mut perm_ok: Option<bool> = None;
        if perm_k > 0 && raw_ok && !rung_log.is_empty() {
            use rayon::prelude::*;
            let w_real = attempts.iter().filter_map(|a| a.get("gain").and_then(|g| g.as_f64())).fold(f64::NEG_INFINITY, f64::max);
            let targets_p = &lib.targets; let ap_p = &ap; let line_p: &str = &line; let log_p = &rung_log;
            let w_null: Vec<f64> = (1..=perm_k).into_par_iter().map(|k| {
                let sline = shuffle_words_seeded(line_p, 7u64 + 97u64 * (k as u64));
                log_p.iter().map(|parts| matched_seed_parts_line(&sline, &sline, parts, targets_p, ap_p, 7).1.gain).fold(f64::NEG_INFINITY, f64::max)
            }).collect();
            let PermVerdict { n: _, mean, std, w_max, exceed, z: z_perm, p, ok } = perm_verdict(w_real, &w_null);
            perm_ok = Some(ok);
            let r4 = |x: f64| (x * 1e4).round() / 1e4;
            perm_json = json!({ "k": perm_k, "rungs": rung_log.len(), "w_real": r4(w_real), "w_null_max": r4(w_max), "w_null_mean": r4(mean), "w_null_std": r4(std), "exceed": exceed, "p": r4(p), "z": (z_perm * 100.0).round() / 100.0, "ok": ok, "null": "line" });
        } else if perm_k > 0 {
            perm_json = json!({ "k": perm_k, "rungs": rung_log.len(), "skipped": if raw_ok { "no-rungs" } else { "no-raw-latch" }, "null": "line" });
        }
        bf.better_than_random = match perm_ok { Some(ok) => raw_ok && ok, None => raw_ok && bf.z_fine >= z_req };
        ratchet_json = json!({ "steps": steps, "guided_passes": 0, "thread_stages": 1, "worms": Value::Null, "winner": winner, "admissible": bf.better_than_random, "raw_admissible": raw_ok, "z_required": (z_req * 100.0).round() / 100.0, "rungs": attempts.len(), "perm": perm_json, "perm_thread": Value::Null, "thread_admissible": false, "null": "line", "grip": Value::Null, "admissible_rungs": attempts.iter().filter(|a| a.get("ok").and_then(|o| o.as_bool()).unwrap_or(false)).count() });
        (bs, Some(bf))
    };
    let seed_gzip_us = t_seed.elapsed().as_micros();
    let seed = top_seeds(&scores, &lib.coords, 3);
    let seed_coords: Vec<&str> = seed.iter().map(|&i| lib.coords[i].as_str()).collect();
    let blank = text.trim().is_empty();

    // UNPLACED (unified-drift.mjs, the CATO fix): non-blank text lighting ZERO anchors is
    // an honest third state — σ SENTINEL 99, no drift claim either way. Blank text stays
    // the σ=0 no-seed fallback. PMU_UNPLACED_DRIFT=0 restores the legacy path.
    let unplaced_on = std::env::var("PMU_UNPLACED_DRIFT").map(|v| v != "0").unwrap_or(true);
    if seed.is_empty() {
        let (sigma, sensor, reason) = if unplaced_on && !blank {
            (99.0, "unplaced", "non-blank text, zero gzip-NCD lattice placement (off-domain / unknown vocabulary)")
        } else {
            (z_margin(&scores), "no-seeds", "no lit seeds (empty/blank text)")
        };
        return Ok(json!({
            "pixel": Value::Null, "block": [0, 0],
            "fence": { "r0": 0, "r1": (radius).min(NB - 1).max(0), "c0": 0, "c1": (radius).min(NB - 1).max(0) },
            "walked": [], "in_role": [], "out_of_role": [],
            "sigma": sigma, "sensor": sensor, "fallback_reason": reason,
            "hops": 0, "max_ply": 0, "fill_pct": 0.0, "time_budget_tripped": false,
            "seed_gzip_us": seed_gzip_us as u64, "walk_ms": 0.0, "attempts": attempts, "ratchet": ratchet_json, "intent_span": intent_span,
        }));
    }

    // ── THE WALK: the real recursive guided definer walk, all hops in this process ──
    let t_walk = Instant::now();
    let walk = definer_walk(
        &grid,
        &lib.coords,
        &seed,
        &WalkOpts { max_depth, top_k, budget, budget_ms, decay },
    );
    let walk_ms = t_walk.elapsed().as_secs_f64() * 1000.0;

    // ── SHAPE + σ (norm → floor → shape; zMargin over the RAW heat) ──
    let max_heat = walk.heat.iter().cloned().fold(0.0f64, f64::max);
    let denom = if max_heat == 0.0 { 1.0 } else { max_heat };
    let mut walked: Vec<&str> = Vec::new();
    let mut walked_idx: Vec<usize> = Vec::new();
    for i in 0..GRID {
        if walk.heat[i] / denom > floor {
            walked.push(lib.coords[i].as_str());
            walked_idx.push(i);
        }
    }
    let sigma = z_margin(&walk.heat);
    let matrix_cells = walk.matrix.iter().filter(|v| **v > 0.0).count();
    // JS: +(100 * matrixCells / 20736).toFixed(2)
    let fill_pct = (100.0 * matrix_cells as f64 / CELLS as f64 * 100.0).round() / 100.0;

    // ── FENCE: the Chebyshev box around the placed pixel (boundaryFromStubSpec) ──
    let pixel = seed_coords[0];
    let (mut br, mut bc) = shortlex_to_block(pixel);
    if br < 0 || bc < 0 {
        // JS catch { keep 0,0 }
        br = 0;
        bc = 0;
    }
    let fence = (
        (br - radius).max(0),
        (br + radius).min(NB - 1),
        (bc - radius).max(0),
        (bc + radius).min(NB - 1),
    );

    // ── PARTITION: walked coords inside/outside the fence (block space) ──
    let mut in_role: Vec<&str> = Vec::new();
    let mut out_of_role: Vec<&str> = Vec::new();
    for (&c, &_i) in walked.iter().zip(walked_idx.iter()) {
        let (wr, wc) = shortlex_to_block(c);
        if wr >= fence.0 && wr <= fence.1 && wc >= fence.2 && wc <= fence.3 {
            in_role.push(c);
        } else {
            out_of_role.push(c);
        }
    }

    let walked_owned: Vec<String> = walked.iter().map(|c| c.to_string()).collect();
    Ok(json!({
        "pixel": pixel,
        "block": [br, bc],
        "fence": { "r0": fence.0, "r1": fence.1, "c0": fence.2, "c1": fence.3 },
        "walked": walked,
        "in_role": in_role,
        "out_of_role": out_of_role,
        "sigma": sigma,
        "sensor": "metal",
        "hops": walk.hops,
        "max_ply": walk.max_ply,
        "fill_pct": fill_pct,
        "time_budget_tripped": walk.time_budget_tripped,
        "seed_gzip_us": seed_gzip_us as u64,
        "walk_ms": (walk_ms * 100.0).round() / 100.0,
        "seed_coords": seed_coords,
        "seed_mode": seed_mode,
        "attempts": attempts,
        "ratchet": ratchet_json,
        "intent_span": intent_span,
        "seed_fit": seed_fit.as_ref().map(|f| json!({ "gain": (f.gain * 1e4).round() / 1e4, "margin": (f.margin * 1e4).round() / 1e4, "z_fine": (f.z_fine * 100.0).round() / 100.0, "better_than_random": f.better_than_random, "region": f.region.iter().map(|&i| lib.coords[i].clone()).collect::<Vec<_>>(), "mass": { "prompt": f.mass_prompt, "bulk": f.mass_bulk, "intent": f.mass_intent }, "aperture": { "matched_cut": f.matched_cut, "coarse_cut": f.coarse_cut, "fine_cut": f.fine_cut, "rule": "aperture.rs" } })).unwrap_or(Value::Null),
        "cells": lattice_cells(&lib.coords, Some(pixel), &Some((fence.0 as i64, fence.1 as i64, fence.2 as i64, fence.3 as i64)), &walked_owned),
    }))
}

/// `--definer-walk --seeds 3,17 [--grid path.json] [walk knobs]` — THE PANEL WALK, in-process, as a value.
/// Output carries heat, ply, hops, max_ply, matrix, m_ply, time_budget_tripped, elapsed_ms and the hop log.
pub fn definer_walk_value(args: &[String]) -> Result<Value, String> {
    let repo = resolve_repo(args);
    let lib_path = flag_val(args, "--targets").map(PathBuf::from).unwrap_or_else(|| repo.join(LIBRARY));
    let lib = load_library(&lib_path).map_err(|e| format!("intentguard --definer-walk: {}", e))?;
    let grid: Box<[u8; CELLS]> = match flag_val(args, "--grid") {
        Some(p) => { let v: Value = std::fs::read_to_string(&p).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or(Value::Null); let mut g = Box::new([0u8; CELLS]); if let Value::Array(arr) = v { if arr.len() == CELLS { for (k, x) in arr.iter().enumerate() { g[k] = if x.as_f64().unwrap_or(0.0) != 0.0 { 1 } else { 0 }; } } } g }
        None => load_directed_grid(&lib.coords),
    };
    let seeds: Vec<usize> = flag_val(args, "--seeds").unwrap_or_default().split(',').filter_map(|s| s.trim().parse().ok()).collect();
    let o = WalkOpts {
        max_depth: flag_val(args, "--max-depth").and_then(|s| s.parse().ok()).unwrap_or(8usize),
        top_k: flag_val(args, "--top-k").and_then(|s| s.parse().ok()).unwrap_or(2usize),
        budget: flag_val(args, "--budget").and_then(|s| s.parse().ok()).unwrap_or(220usize),
        budget_ms: flag_val(args, "--budget-ms").and_then(|s| s.parse().ok()).unwrap_or(600_000u128),
        decay: flag_val(args, "--decay").and_then(|s| s.parse().ok()).unwrap_or(0.5f64),
    };
    let t0 = Instant::now();
    let w = definer_walk(&grid, &lib.coords, &seeds, &o);
    Ok(json!({ "heat": w.heat, "ply": w.ply, "hops": w.hops, "max_ply": w.max_ply, "matrix": w.matrix, "m_ply": w.m_ply, "time_budget_tripped": w.time_budget_tripped, "elapsed_ms": t0.elapsed().as_millis() as u64, "hop_log": w.hop_log, "knobs": { "maxDepth": o.max_depth, "topK": o.top_k, "budget": o.budget, "budgetMs": o.budget_ms as u64, "decay": o.decay } }))
}

// ── in-crate tests ───────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn node_gzip_len_is_rerunnable_and_gzip_shaped() {
        let d = b"fix the stripe webhook signature verification in the payments route";
        let a = node_gzip_len(d);
        assert_eq!(a, node_gzip_len(d));
        assert!(a > 18, "gzip header+trailer alone is 18 bytes");
    }

    #[test]
    fn z_margin_matches_js_shape() {
        // xs desc = [4, 2, 1, 1]; rest mean 4/3, var over rest, (top-mean)/std, 2dp
        let v = vec![1.0, 4.0, 2.0, 0.0, 1.0];
        let s = z_margin(&v);
        assert!((s - 5.66).abs() < 0.01, "got {}", s);
        assert_eq!(z_margin(&[1.0]), 0.0, "fewer than 2 positives → 0");
        assert_eq!(z_margin(&[2.0, 2.0, 2.0]), 0.0, "zero std → 0");
    }

    #[test]
    fn top_seeds_orders_desc_then_index_asc() {
        let coords: Vec<String> = (0..GRID).map(|i| SHORTLEX[i].to_string()).collect();
        let mut sc = vec![0.0; GRID];
        sc[5] = 0.9;
        sc[3] = 0.9;
        sc[7] = 0.5;
        sc[9] = 0.4;
        assert_eq!(top_seeds(&sc, &coords, 3), vec![3, 5, 7]);
    }

    #[test]
    fn a_hat_never_scores_its_own_target() {
        // three targets; target 1's snippet rides in the mass, tagged 1. Target 1's score must equal its score when the hat is absent.
        let targets = vec!["payments webhook signature verification for the stripe route and the raw event store".to_string(), "the ballistic walk on the lattice reads each row and follows the significant column by transpose".to_string(), "book chapter on the mailbox and the displacement receipt of the anvil".to_string()];
        let prompt = "verify the stripe webhook signature and keep the raw event";
        let ap = SeedAperture { matched_cut: true };
        let without = matched_seed_parts(prompt, &[(None, String::new())], &targets, &ap).0;
        let with_hat = matched_seed_parts(prompt, &[(Some(1), targets[1].clone())], &targets, &ap).0;
        assert!((without[1] - with_hat[1]).abs() < 1e-12, "target 1 scored with its own hat in the mass: {} vs {}", with_hat[1], without[1]);
        // the null shuffles only the LINE and holds the mass fixed, so an untagged hat cannot buy its own target a
        // calibrated gain beyond gzip granularity either; the tag stays as the second fence.
        let leaky = matched_seed_parts(prompt, &[(None, targets[1].clone())], &targets, &ap).0;
        assert!(leaky[1] <= without[1] + 0.02, "an UNTAGGED hat inflated its own target under the line-null: {} vs {}", leaky[1], without[1]);
        // the convenience doors are the one-part case of the same function
        let (a, fa) = matched_seed(prompt, &targets[2], &targets);
        let (b, fb) = matched_seed_with(prompt, &targets[2], &targets, &ap);
        assert_eq!(a, b); assert_eq!(fa.gain, fb.gain); assert_eq!(fa.mass_bulk, targets[2].chars().count());
    }

    #[test]
    fn the_null_shuffles_only_the_line_inside_a_thread() {
        let line = "verify the stripe webhook signature and keep the raw event";
        let priors = "\n\nmake the panel read the immutable commit\n\nemail me the versioned spec";
        let thread = format!("{}{}", line, priors);
        let n = shuffle_line_in(&thread, line, 7);
        assert!(n.ends_with(priors), "the priors must be kept byte for byte: {}", n);
        assert_ne!(&n[..line.len()], line, "the line must be shuffled");
        let mut a: Vec<&str> = n[..line.len()].split_whitespace().collect(); a.sort();
        let mut b: Vec<&str> = line.split_whitespace().collect(); b.sort();
        assert_eq!(a, b, "a shuffle keeps the words");
        assert_eq!(shuffle_line_in(line, line, 7), shuffle_words_seeded(line, 7), "no thread → the seed-7 whole-text shuffle");
    }

    #[test]
    fn perm_verdict_admits_only_a_winner_that_beats_every_draw() {
        let v = perm_verdict(0.05, &[0.01, 0.012, 0.009, 0.011]);
        assert_eq!(v.n, 4); assert_eq!(v.exceed, 0); assert!(v.ok && v.z > 2.0);
        let tie = perm_verdict(0.012, &[0.01, 0.012, 0.009, 0.011]);
        assert_eq!(tie.exceed, 1); assert!(!tie.ok, "a draw that equals the winner counts against it");
        assert!((z_required(1) - 2.0).abs() < 0.01, "one rung: the historical z ≥ 2, got {}", z_required(1));
        assert!(z_required(4) > z_required(1), "more rungs, higher bar");
    }

    #[test]
    fn walk_is_rerunnable_and_guided() {
        let coords: Vec<String> = (0..GRID).map(|i| SHORTLEX[i].to_string()).collect();
        let mut grid = Box::new([0u8; CELLS]);
        // diagonal + a couple of directed edges
        for i in 0..GRID {
            grid[i * GRID + i] = 1;
        }
        grid[0 * GRID + 5] = 1;
        grid[5 * GRID + 9] = 1;
        let o = WalkOpts { max_depth: 2, top_k: 3, budget: 120, budget_ms: 600_000, decay: 0.5 };
        let a = definer_walk(&grid, &coords, &[0], &o);
        let b = definer_walk(&grid, &coords, &[0], &o);
        assert_eq!(a.heat, b.heat);
        assert_eq!(a.hops, b.hops);
        assert!((a.heat[0] - 1.0).abs() < 1e-12, "seed heat 1.0");
        assert!(a.heat[5] > 0.0, "followed anchor gets heat");
        assert!(!a.time_budget_tripped);
    }
}
