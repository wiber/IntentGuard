// src/ops.rs — the stdin-JSON modes as pure functions: --walk (heatmap), --project-xor, --sense,
// --byte-footprint, plus the --grid parser. Moved out of main.rs (C461) so the CLI, the Node addon
// and any server wrapper call one implementation; the CLI keeps only reading stdin and printing.

use crate::{ballistic, pointer_chase, sense, signature};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct SenseInput {
    pub claims: Vec<String>,
    pub targets: Vec<String>,
    pub target_lens: Vec<usize>,
    // SimHash-only (skip gzip-NCD) — set for 20,736-cell resolution where the
    // ~5M NCD pairs would cost ~60s; the 144-node canonical case leaves it false.
    #[serde(default)]
    pub simhash_only: bool,
    // Shingler for the SimHash witness. ABSENT/"" /"char" = the historical
    // char-4-gram path — the EXPLICIT default so every existing caller
    // (commit-triptych ingest et al.) stays bit-identical. "word" = the
    // wordShingles port (the JS production-ingest path: word unigrams +
    // bigrams, STOPWORDS stripped) — opt-in, bit-exact with
    // simhash(text, 64, wordShingles) in signature.mjs.
    #[serde(default)]
    pub shingle_mode: String,
}

// On-chip sense output. `scores` is the PRIMARY witness (SimHash); `ncd_scores`
// the cheap secondary; `best_idx` the claim fragment each anchor matched (feeds
// the hover payload); `agreement` the scale-free dual-witness hallucination flag
// (both witnesses agreeing on the same fragment).
#[derive(Serialize)]
pub struct SenseOutput {
    pub scores: Vec<f32>,
    pub ncd_scores: Vec<f32>,
    pub best_idx: Vec<usize>,
    pub agreement: Vec<bool>,
    // Competitive inversion (per claim): the anchor it matches best + that score.
    // JS inverts this to assign each anchor a DISTINCT fragment for the hover.
    pub claim_best_anchor: Vec<usize>,
    pub claim_best_score: Vec<f32>,
}

/// `--sense`: Err (the CLI's stderr line, exit 2) on an unknown shingle_mode — two sensors must never blur.
pub fn sense_json(input: &SenseInput) -> Result<String, String> {
    let mode = match input.shingle_mode.as_str() {
        "" | "char" => signature::ShingleMode::Char,
        "word" => signature::ShingleMode::Word,
        other => return Err(format!("intentguard --sense: unknown shingle_mode {:?} (use \"char\" or \"word\")", other)),
    };
    let res = sense::sense_lattice(&input.claims, &input.targets, &input.target_lens, input.simhash_only, mode);
    let output = SenseOutput {
        scores:     res.rows.iter().map(|r| r.score).collect(),
        ncd_scores: res.rows.iter().map(|r| r.ncd).collect(),
        best_idx:   res.rows.iter().map(|r| r.best_idx).collect(),
        agreement:  res.rows.iter().map(|r| r.agreement).collect(),
        claim_best_anchor: res.claim_best_anchor,
        claim_best_score:  res.claim_best_score,
    };
    Ok(serde_json::to_string(&output).unwrap())
}

#[derive(Serialize)]
struct ByteFootprintOut {
    doc_len: usize,
    ns_l2: f64,
    ns_slc: f64,
    ns_dram: f64,
    method: &'static str,
}

// byte_footprint_json — the candidate independent physical witness: byte-locality cache timing at
// L2/SLC/DRAM working-set sizes (see pointer_chase::byte_footprint), as JSON. A timing, so never re-runnable.
pub fn byte_footprint_json(doc: &str) -> String {
    let bytes = doc.as_bytes();
    let out = ByteFootprintOut {
        doc_len: bytes.len(),
        ns_l2: pointer_chase::byte_footprint(bytes, 256),
        ns_slc: pointer_chase::byte_footprint(bytes, 8 * 1024),
        ns_dram: pointer_chase::byte_footprint(bytes, 64 * 1024),
        method: "byte-window-hash locality walk (untimed hash, timed access)",
    };
    serde_json::to_string(&out).expect("serialize")
}

#[derive(Deserialize)]
pub struct ProjectXorInput {
    pub intent_bits: Vec<u8>,
    pub reality_bits: Vec<u8>,
}

#[derive(Serialize)]
struct ProjectXorOutput {
    intent_bitmap_b64: String,
    reality_bitmap_b64: String,
    friction_bitmap_b64: String,
    friction_nodes: usize,
}

#[derive(Deserialize)]
pub struct WalkInput {
    pub grid_b64: String, // Packed bitmap (2592 bytes)
    pub decay: f64,
    pub depth: usize,
    // "" / "traversal" = the lit-graph ballistic walk (support = lit cells,
    // intensity = path-convergence weight). "diffusion" = additionally spread
    // weight to ShortLex-adjacent UNLIT neighbours, so the cloud smooths beyond
    // the binaries (decorrelates from the XOR). See pmu-pipeline-flow.md.
    #[serde(default)]
    pub mode: String,
}

// diffuse — donate a fraction of each cell's weight to its 4 grid neighbours
// (grid adjacency IS ShortLex adjacency, since cells are ShortLex-ordered).
// Repeated `iters` times, this spreads the lit-cell mass into the surrounding
// region — the "true diffusion" cloud, distinct from the lit-graph traversal.
fn diffuse(heatmap: &mut [f32], n: usize, iters: usize, rate: f32) {
    for _ in 0..iters {
        let src = heatmap.to_vec();
        for i in 0..n {
            for j in 0..n {
                let w = src[i * n + j];
                if w <= 0.0 { continue; }
                let share = w * rate;
                if i > 0 { heatmap[(i - 1) * n + j] += share; }
                if i + 1 < n { heatmap[(i + 1) * n + j] += share; }
                if j > 0 { heatmap[i * n + (j - 1)] += share; }
                if j + 1 < n { heatmap[i * n + (j + 1)] += share; }
            }
        }
    }
}

// converge — the INFINITE-reach fixed point. A decaying frontier propagates to
// neighbours, accumulating into the heatmap, until the frontier mass is
// negligible. With 4·rate < 1 the geometric series Σ (decay·M)^k converges:
// the result is the resolvent (I − decay·M)⁻¹ applied to the seed — the heat
// kernel where EVERY cell is defined by every other (weight = decay^distance to
// the lit set). Each step propagates less; reach is effectively infinite.
// Returns the number of plies it took to converge. rate must be < 0.25.
fn converge(heatmap: &mut [f32], n: usize, rate: f32) -> usize {
    let len = heatmap.len();
    let mut frontier = heatmap.to_vec();
    let mut plies = 0;
    for _ in 0..512 {
        let mut next = vec![0.0f32; len];
        for i in 0..n {
            for j in 0..n {
                let w = frontier[i * n + j];
                if w <= 0.0 { continue; }
                let share = w * rate;
                if i > 0 { next[(i - 1) * n + j] += share; }
                if i + 1 < n { next[(i + 1) * n + j] += share; }
                if j > 0 { next[i * n + (j - 1)] += share; }
                if j + 1 < n { next[i * n + (j + 1)] += share; }
            }
        }
        let mass: f32 = next.iter().sum();
        for k in 0..len { heatmap[k] += next[k]; }
        frontier = next;
        plies += 1;
        if mass < 1e-3 { break; } // frontier negligible → fixed point reached
    }
    plies
}

#[derive(Serialize)]
struct WalkOutput {
    heatmap_b64: String, // Packed f32 array
    lit_nodes: usize,
}

// [INTENT: C3.Operations.Flow] Generate a high-speed topological "fuzziness" to reveal strategic adjacency.
// [REALITY: --walk] Multi-core ballistic walk using Rayon to saturate M-series silicon.
pub fn walk_heatmap_json(input: &WalkInput) -> String {
    use base64::{engine::general_purpose, Engine as _};
    let bytes = general_purpose::STANDARD.decode(&input.grid_b64).expect("Failed to decode base64 grid");
    let mut grid = [0u8; 20736];
    for i in 0..20736 {
        if (bytes[i >> 3] & (1 << (7 - (i & 7)))) != 0 {
            grid[i] = 1;
        }
    }

    let mut opts = ballistic::WalkOpts::default();
    opts.decay_factor = input.decay;
    opts.max_depth = input.depth;

    let frames = ballistic::ballistic_walk_all(&grid, &opts);

    // Aggregate visits across all plies into a float heatmap
    let mut heatmap = vec![0.0f32; 20736];
    for frame in frames {
        for (&idx, &weight) in frame.visits.iter() {
            heatmap[idx] += weight as f32;
        }
    }

    // Diffusion mode: spread the lit-graph weight into ShortLex-adjacent unlit
    // neighbours so the cloud smooths BEYOND the binaries (the traversal alone
    // only re-weights lit cells). iters = depth, rate scaled from decay.
    if input.mode == "diffusion" {
        diffuse(&mut heatmap, 144, input.depth.max(1), (input.decay as f32) * 0.3);
    } else if input.mode == "converged" {
        // Infinite-reach fixed point: iterate the decaying frontier to
        // convergence so every cell is defined by every other (decay^distance).
        converge(&mut heatmap, 144, (input.decay as f32) * 0.3);
    }

    let output = WalkOutput {
        heatmap_b64: pack_f32_b64(&heatmap),
        lit_nodes: heatmap.iter().filter(|&&v| v > 0.0).count(),
    };
    serde_json::to_string(&output).unwrap()
}

fn pack_f32_b64(data: &[f32]) -> String {
    use base64::{engine::general_purpose, Engine as _};
    let bytes: &[u8] = unsafe {
        std::slice::from_raw_parts(data.as_ptr() as *const u8, data.len() * 4)
    };
    general_purpose::STANDARD.encode(bytes)
}

// [INTENT: B2.Tactics.Deal] Establish a bit-level standard for underwriting strategic agreement.
// [REALITY: --project-xor] Direct memory XOR between two 20,736-bit lattices. Zero Turing overhead.
pub fn project_xor_json(input: &ProjectXorInput) -> String {
    let n = input.intent_bits.len();
    let mut intent_lattice = vec![0u8; n * n];
    let mut reality_lattice = vec![0u8; n * n];
    let mut friction_lattice = vec![0u8; n * n];
    let mut friction_nodes = 0;

    for i in 0..n {
        for j in 0..n {
            let idx = i * n + j;
            // Logical expansion: interference i,j is 1 if both anchors are 1
            if input.intent_bits[i] == 1 && input.intent_bits[j] == 1 {
                intent_lattice[idx] = 1;
            }
            if input.reality_bits[i] == 1 && input.reality_bits[j] == 1 {
                reality_lattice[idx] = 1;
            }
            // XOR on the metal
            if intent_lattice[idx] != reality_lattice[idx] {
                friction_lattice[idx] = 1;
                friction_nodes += 1;
            }
        }
    }

    let output = ProjectXorOutput {
        intent_bitmap_b64: pack_bitmap_b64(&intent_lattice),
        reality_bitmap_b64: pack_bitmap_b64(&reality_lattice),
        friction_bitmap_b64: pack_bitmap_b64(&friction_lattice),
        friction_nodes,
    };
    serde_json::to_string(&output).unwrap()
}

pub fn pack_bitmap_b64(bits: &[u8]) -> String {
    use base64::{engine::general_purpose, Engine as _};
    let mut bytes = vec![0u8; (bits.len() + 7) / 8];
    for (i, &bit) in bits.iter().enumerate() {
        if bit != 0 {
            bytes[i >> 3] |= 1 << (7 - (i & 7));
        }
    }
    general_purpose::STANDARD.encode(bytes)
}

/// The --grid JSON (a 144- or 20,736-int array) → the 144×144 lattice. 144 expands to diagonal hits;
/// 20,736 is used directly. Err = the message the CLI prints after "intentguard --grid: ".
pub fn grid_from_json(text: &str) -> Result<([u8; 20736], usize), String> {
    let arr = parse_int_array(text)?;
    let mut g = [0u8; 20736];
    let len = arr.len();
    if len == 144 {
        // Expand 144-bit vector to diagonal hits on the 144x144 grid
        for (i, v) in arr.iter().enumerate() {
            if *v != 0 { g[i * 144 + i] = 1; }
        }
    } else if len == 20736 {
        for (k, v) in arr.iter().enumerate() {
            g[k] = if *v != 0 { 1 } else { 0 };
        }
    } else {
        return Err(format!("expected 144 or 20736 ints, got {}", len));
    }
    Ok((g, len))
}

// Tiny JSON int-array parser — zero deps. Accepts `[0,1,0,1,...]` with
// optional whitespace; everything else is a parse error.
pub fn parse_int_array(s: &str) -> Result<Vec<i64>, String> {
    let s = s.trim();
    if !s.starts_with('[') || !s.ends_with(']') {
        return Err("expected JSON array surrounded by [ ]".into());
    }
    let inner = &s[1..s.len() - 1];
    let mut out = Vec::with_capacity(144);
    for part in inner.split(',') {
        let p = part.trim();
        if p.is_empty() { continue; }
        let n: i64 = p.parse().map_err(|e| format!("not an int: {:?} ({})", p, e))?;
        out.push(n);
    }
    Ok(out)
}

/// UTC timestamp in YYYY-MM-DDTHH-MM-SS form. We avoid chrono to keep
/// the dependency surface minimal (rayon was the only addition for PRO-G).
pub fn chrono_like_ts() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    // Convert epoch seconds to UTC Y/M/D H/M/S.
    let days_since_epoch = (now / 86_400) as i64;
    let secs_today = (now % 86_400) as i64;
    let h = secs_today / 3600;
    let m = (secs_today % 3600) / 60;
    let s = secs_today % 60;
    let (y, mo, d) = civil_from_days(days_since_epoch);
    format!("{:04}-{:02}-{:02}T{:02}-{:02}-{:02}", y, mo, d, h, m, s)
}

/// civil_from_days — Hinnant's algorithm. Converts days-since-Unix-epoch
/// to (year, month, day) in the proleptic Gregorian calendar.
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

// ── tests ────────────────────────────────────────────────────────────
// The CLI wiring's pure pieces: the grid parser and the bitmap packer the
// JS↔Rust bridge depends on (--grid / --project-xor / --walk b64 framing).
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_int_array_accepts_and_rejects() {
        assert_eq!(parse_int_array("[0,1, 2 ,3]").unwrap(), vec![0, 1, 2, 3]);
        assert_eq!(parse_int_array("  [1]  ").unwrap(), vec![1]);
        assert!(parse_int_array("0,1,2").is_err());
        assert!(parse_int_array("[a,b]").is_err());
    }

    #[test]
    fn pack_bitmap_b64_msb_first_roundtrip() {
        use base64::{engine::general_purpose, Engine as _};
        // bit i lands at byte i>>3, mask 1<<(7-(i&7)) — the same framing
        // walk_heatmap_json uses to UNPACK grid_b64. Pack then unpack must be identity.
        let mut bits = vec![0u8; 20];
        bits[0] = 1; bits[7] = 1; bits[8] = 1; bits[19] = 1;
        let b64 = pack_bitmap_b64(&bits);
        let bytes = general_purpose::STANDARD.decode(&b64).unwrap();
        let mut back = vec![0u8; 20];
        for i in 0..20 {
            if (bytes[i >> 3] & (1 << (7 - (i & 7)))) != 0 { back[i] = 1; }
        }
        assert_eq!(back, bits, "pack/unpack framing must agree (MSB-first per byte)");
    }
}
