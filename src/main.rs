// src/main.rs — IntentGuard: the boundary-legibility core, on the metal.
//
// Walk the declared intent and the reality onto the same 144×144 lattice with the ballistic walk,
// place each with the gzip-NCD sensor, find the encircled regions, encode the panel PNG, and sign
// the exact bytes emitted so anyone can re-hash and verify them. LLM-free; same bytes in, same bytes out.
//
// Carved from ThetaCog's pmu-onchip crate: every mode kept here prints what pmu-onchip prints for
// the same input. Build: cargo build --release   Run: target/release/intentguard --help

mod aperture;
mod attest;
mod ballistic;
mod boundary_probe;
mod lattice;
mod lens;
mod png;
mod pointer_chase;
mod regions;
mod sense;
mod signature;

use serde::{Deserialize, Serialize};

const USAGE: &str = "intentguard — boundary legibility: where the work landed against where it was declared

placement   --lens [--text T | stdin] [--targets lib.json]    gzip-NCD seed → definer walk → σ → fence
            --definer-walk --seeds 3,17 [--grid g.json]        the panel walk from given anchors
            --aperture  < {intent:[{path,text}],reality:[…]}   matched corpora + the 220-byte mass floor
            --sense     < {claims,targets,target_lens}         SimHash + gzip-NCD per anchor
            --walk / --project-xor  < JSON                     heatmap walk · intent⊕reality friction
panel       --regions < 144×144 class bytes                    encircled drift regions (JSON)
            --encode-png --rgba f --width W --height H --out p  the panel PNG (node-identical deflate)
            --lattice --pixel R,C --fence r0,r1,c0,c1 --cells …  the 12×12 cell states
            --shortlex                                         the canonical 144 labels
receipt     --ballistic [--grid g.json] [--start R,C] [--sign] [--stream]
            --verify-receipt <file>                            re-hash + check the signature line
AXIOM 0     --pointer-chase · --boundary-probe [--runs N] [--json] · --byte-footprint < {doc}";

#[derive(Deserialize)]
struct SenseInput {
    claims: Vec<String>,
    targets: Vec<String>,
    target_lens: Vec<usize>,
    // SimHash-only (skip gzip-NCD) — set for 20,736-cell resolution where the
    // ~5M NCD pairs would cost ~60s; the 144-node canonical case leaves it false.
    #[serde(default)]
    simhash_only: bool,
    // Shingler for the SimHash witness. ABSENT/"" /"char" = the historical
    // char-4-gram path — the EXPLICIT default so every existing caller
    // (commit-triptych ingest et al.) stays bit-identical. "word" = the
    // wordShingles port (the JS production-ingest path: word unigrams +
    // bigrams, STOPWORDS stripped) — opt-in, bit-exact with
    // simhash(text, 64, wordShingles) in signature.mjs.
    #[serde(default)]
    shingle_mode: String,
}

// On-chip sense output. `scores` is the PRIMARY witness (SimHash); `ncd_scores`
// the cheap secondary; `best_idx` the claim fragment each anchor matched (feeds
// the hover payload); `agreement` the scale-free dual-witness hallucination flag
// (both witnesses agreeing on the same fragment).
#[derive(Serialize)]
struct SenseOutput {
    scores: Vec<f32>,
    ncd_scores: Vec<f32>,
    best_idx: Vec<usize>,
    agreement: Vec<bool>,
    // Competitive inversion (per claim): the anchor it matches best + that score.
    // JS inverts this to assign each anchor a DISTINCT fragment for the hover.
    claim_best_anchor: Vec<usize>,
    claim_best_score: Vec<f32>,
}

#[derive(Deserialize)]
struct ByteFootprintInput {
    doc: String,
}

#[derive(Serialize)]
struct ByteFootprintOut {
    doc_len: usize,
    ns_l2: f64,
    ns_slc: f64,
    ns_dram: f64,
    method: &'static str,
}

// run_byte_footprint — the candidate independent physical witness. Reads {doc}
// from stdin, measures byte-locality cache timing at L2/SLC/DRAM working-set
// sizes (see pointer_chase::byte_footprint), emits the footprint as JSON.
fn run_byte_footprint(_args: &[String]) {
    use std::io::Read;
    let mut buffer = String::new();
    std::io::stdin()
        .read_to_string(&mut buffer)
        .expect("Failed to read from stdin");
    let input: ByteFootprintInput = serde_json::from_str(&buffer).expect("Failed to parse JSON");
    let bytes = input.doc.as_bytes();
    let out = ByteFootprintOut {
        doc_len: bytes.len(),
        ns_l2: pointer_chase::byte_footprint(bytes, 256),
        ns_slc: pointer_chase::byte_footprint(bytes, 8 * 1024),
        ns_dram: pointer_chase::byte_footprint(bytes, 64 * 1024),
        method: "byte-window-hash locality walk (untimed hash, timed access)",
    };
    println!("{}", serde_json::to_string(&out).expect("serialize"));
}

// run_boundary_probe — rung 3 of the AXIOM 0 extension ladder (CLAUDE.md). Chases the
// SAME number of loads over the SAME bytes in the SAME seeded permuted line
// order, varying only whether consecutive steps stay inside a 64-byte line (PACKED)
// or cross one (CROSSING). The ns/access ratio is the physical cost of a cache-line
// boundary crossing, read off the metal from userspace — no privileged counter needed.
// Default sizes name the axiom's own reproduction: an in-cache CONTROL (well inside
// L1/L2 — expect ratio ~1.000, no boundary cost when resident), 8MiB, 128MiB.
//
// MEASUREMENT PROTOCOL (added 2026-08-19, see boundary_probe.rs): one probe() call is
// one sample from a machine that is not always quiet, so this runner repeats the sweep
// --runs times (default 5) and reports median + spread per size, then checks the
// CONTROL size's median against a physical-expectation band (see CONTROL_TOLERANCE) —
// if the control itself drifted, the machine wasn't quiet enough to trust the other
// rows either, and that verdict is printed and carried in --json rather than hidden.
//
// Exit code is ALWAYS 0 for a normal run, admissible or not — a measurement tool that
// exits non-zero on a noisy machine invites `|| true` somewhere downstream and then
// nobody ever reads it again. The admissibility verdict travels in the output, not the
// exit status: read the LOW CONFIDENCE marker, don't rely on $?.
fn run_boundary_probe(args: &[String]) {
    fn get_sizes(args: &[String], name: &str, default: &[usize]) -> Vec<usize> {
        args.iter().position(|a| a == name)
            .and_then(|i| args.get(i + 1))
            .map(|s| s.split(',').filter_map(|p| p.trim().parse().ok()).collect())
            .unwrap_or_else(|| default.to_vec())
    }
    fn get_usize(args: &[String], name: &str, default: usize) -> usize {
        args.iter().position(|a| a == name)
            .and_then(|i| args.get(i + 1))
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(default)
    }

    let sizes = get_sizes(args, "--kib", &[16, 8 * 1024, 128 * 1024]);
    let runs = get_usize(args, "--runs", 5);
    let control_kib = get_usize(args, "--control-kib", sizes.first().copied().unwrap_or(16));
    let emit_json = args.iter().any(|a| a == "--json");

    let stats: Vec<boundary_probe::BoundaryRunStats> =
        sizes.iter().map(|&kib| boundary_probe::probe_runs(kib, runs)).collect();

    // The control is whichever charted size equals control_kib, if present; otherwise
    // it's measured separately so the verdict never silently falls back to an
    // uncontrolled size.
    let control_stats = stats
        .iter()
        .find(|s| s.kib == control_kib)
        .cloned()
        .unwrap_or_else(|| boundary_probe::probe_runs(control_kib, runs));
    let verdict = boundary_probe::control_verdict(&control_stats, boundary_probe::CONTROL_TOLERANCE);

    println!("boundary-crossing probe — same loads · same bytes · same permuted line order;");
    println!("only variable: PACKED (8 slots/line, sequential) vs CROSSING (1 slot/line, every hop crosses a 64B boundary)");
    println!("{runs} run(s) per size — reporting median, with the observed [min, max] spread beside it");
    for s in &stats {
        println!(
            "  {:>7} KiB  ({:>7} lines)  n={:<3} packed={:>9.3} ns  crossing={:>9.3} ns  ratio(median)={:.3}x  [{:.3}x, {:.3}x]",
            s.kib, s.lines, s.runs, s.packed_ns_median, s.crossing_ns_median, s.ratio_median, s.ratio_min, s.ratio_max
        );
    }
    println!();
    if verdict.admissible {
        println!("ADMISSIBLE — {}", verdict.reason);
    } else {
        println!("LOW CONFIDENCE / NOT ADMISSIBLE — {}", verdict.reason);
    }

    if emit_json {
        let out = serde_json::json!({
            "runs": runs,
            "results": stats,
            "control": verdict,
        });
        println!("{}", serde_json::to_string(&out).expect("serialize"));
    }
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let has = |f: &str| args.iter().any(|a| a == f);
    if has("--definer-walk") { lens::run_definer_walk(&args); }
    else if has("--lens") { lens::run(&args); }
    else if has("--walk") { run_walk(&args); }
    else if has("--project-xor") { run_project_xor(&args); }
    else if has("--aperture") { aperture::run(&args); }
    else if has("--sense") { run_sense(&args); }
    else if has("--encode-png") { png::run(&args); }
    else if has("--regions") { regions::run(&args); }
    else if has("--shortlex") { println!("{}", serde_json::to_string(&ballistic::SHORTLEX[..]).expect("serialize shortlex")); }
    else if has("--lattice") { lattice::run(&args); }
    else if has("--verify-receipt") { run_verify_receipt(&args); }
    else if has("--ballistic") { run_ballistic(&args); }
    else if has("--byte-footprint") { run_byte_footprint(&args); }
    else if has("--boundary-probe") { run_boundary_probe(&args); }
    else if has("--pointer-chase") { run_pointer_chase(); }
    else { println!("{}", USAGE); }
}

// run_pointer_chase — rung 2 of AXIOM 0: a dependent load's latency IS the read-out (unprefetchable chase).
fn run_pointer_chase() {
    println!("cache hierarchy (pointer-chase · dependent loads · unprefetchable):");
    let tiers = [pointer_chase::chase(16, "L1"), pointer_chase::chase(256, "L2"), pointer_chase::chase(8 * 1024, "SLC"), pointer_chase::chase(128 * 1024, "DRAM")];
    for t in &tiers {
        println!("  {:<5} {:>9} KiB    {:>7.2} ns / access", t.label, t.kib, t.ns_per_access);
    }
    println!("  miss penalty: {:.1}x   (DRAM / L1)", tiers[3].ns_per_access / tiers[0].ns_per_access.max(1e-9));
}

// run_verify_receipt — `--verify-receipt <file>`: the file is a signed output (--ballistic --sign): every
// line the binary emitted, then ONE attestation line. Re-hash the payload bytes and check the signature.
// Exit 0 = verifies, 1 = does not, 2 = unreadable. The verdict never depends on a clock or a model.
fn run_verify_receipt(args: &[String]) {
    let path = args.iter().position(|a| a == "--verify-receipt").and_then(|i| args.get(i + 1)).cloned().unwrap_or_default();
    let bytes = std::fs::read(&path).unwrap_or_else(|e| { eprintln!("--verify-receipt: cannot read {:?}: {}", path, e); std::process::exit(2); });
    let body = bytes.strip_suffix(b"\n").unwrap_or(&bytes);
    let cut = body.iter().rposition(|&b| b == b'\n').map(|i| i + 1).unwrap_or(0);
    let (payload, line) = (&bytes[..cut], String::from_utf8_lossy(&body[cut..]).to_string());
    match attest::verify_attestation(payload, &line) {
        Ok(pk) => println!("{}", serde_json::json!({ "ok": true, "payload_bytes": payload.len(), "pubkey_b64": pk })),
        Err(e) => { println!("{}", serde_json::json!({ "ok": false, "reason": e })); std::process::exit(1); }
    }
}

// ── run_ballistic — emit JSON frames suitable for the Cloud Bridge ────
//
// Reads the grid from --grid (path or "-" for stdin) when supplied so the
// chip ↔ cloud rails walk THE SAME lattice — the same 144-int array the
// JS side emitted. Falls back to the fixed demo_grid() when no
// --grid is given, so the binary is still self-runnable for benches.
fn run_ballistic(args: &[String]) {
    let (grid, _len) = grid_from_args(args).unwrap_or_else(|| (ballistic::demo_grid(), 20736));
    let mut opts = ballistic::WalkOpts::default();
    // --decay tunes the per-ply geometric decay (default 0.5). Lowering
    // it (e.g. 0.25, 0.15) makes the walk die out faster — only the
    // first few plies contribute meaningful weight. Used in the doc-
    // heatmap experiment to test whether structured (semantically
    // adjacent) grids produce more localized heat clouds than random.
    if let Some(i) = args.iter().position(|a| a == "--decay") {
        if let Some(v) = args.get(i + 1).and_then(|s| s.parse::<f64>().ok()) {
            opts.decay_factor = v;
        }
    }
    if let Some(i) = args.iter().position(|a| a == "--max-depth") {
        if let Some(v) = args.get(i + 1).and_then(|s| s.parse::<usize>().ok()) {
            opts.max_depth = v;
        }
    }
    // --budget-ms <N> — the IN-BINARY time bound (the standing operator TODO:
    // "the on-chip part must be TIME-BOUNDED — assert"). Hard-bounds each
    // walk's wall time inside the binary: elapsed is checked before every
    // fan-out ply; when spent, the walk emits ONE terminal frame with the
    // painted-so-far state and "budgetExhausted":true, then stops. Absent =
    // unbounded (the historical behavior — no caller changes). Without
    // --start, ballistic_walk_all runs each occupied anchor with its OWN
    // budget (the bound is per-walk, not per-process).
    if let Some(i) = args.iter().position(|a| a == "--budget-ms") {
        if let Some(v) = args.get(i + 1).and_then(|s| s.parse::<u64>().ok()) {
            opts.budget_ms = Some(v);
        }
    }
    let start_idx = args.iter().position(|a| a == "--start").and_then(|i| {
        args.get(i + 1).and_then(|s| ballistic::SHORTLEX.iter().position(|x| *x == s.as_str()))
    });
    // --sign — G1 (the formerly-last-open Rust gap): the binary signs SHA-256
    // of the EXACT bytes it emits (frames JSON + '\n', or every NDJSON line
    // including its '\n') with the hw-derived daemon key, and appends ONE
    // trailing attestation line. Opt-in: without the flag the output is
    // byte-identical to the pre-G1 binary (pinned by the JS proving test).
    // Key derivation failure is a HARD exit 2, never a silent unsigned run.
    let sign_key = if args.iter().any(|a| a == "--sign") {
        match attest::host_signing_key() {
            Ok(k) => Some(k),
            Err(e) => {
                eprintln!("intentguard --sign: {}", e);
                std::process::exit(2);
            }
        }
    } else {
        None
    };
    // --stream: NDJSON — one frame per line, flushed as each ply completes,
    // so a receiver renders the walk LIVE instead of waiting for exit.
    // Default (no flag) stays the single buffered JSON array for existing
    // execSync callers (definer-walk-144.mjs et al).
    if args.iter().any(|a| a == "--stream") {
        use sha2::Digest;
        use std::io::Write;
        let stdout = std::io::stdout();
        let mut lock = stdout.lock();
        // Incremental digest over exactly the bytes written (line + '\n' per
        // frame) — equals the buffered hash of the concatenation (pinned by
        // attest::streamed_incremental_digest_equals_buffered_digest).
        let mut hasher: Option<sha2::Sha256> = sign_key.as_ref().map(|_| sha2::Sha256::new());
        let mut emit = |f: &ballistic::Frame| {
            let line = ballistic::frame_to_json(f);
            writeln!(lock, "{}", line).expect("write frame");
            lock.flush().expect("flush frame");
            if let Some(h) = hasher.as_mut() {
                h.update(line.as_bytes());
                h.update(b"\n");
            }
        };
        match start_idx {
            Some(s) => ballistic::ballistic_walk_with(&grid, s, &opts, &mut emit),
            None    => ballistic::ballistic_walk_all_with(&grid, &opts, &mut emit),
        }
        if let (Some(key), Some(h)) = (sign_key.as_ref(), hasher) {
            let digest: [u8; 32] = h.finalize().into();
            writeln!(lock, "{}", attest::attestation_line_for_digest(&digest, key, &chrono_like_ts()))
                .expect("write attestation");
            lock.flush().expect("flush attestation");
        }
        return;
    }
    let frames = match start_idx {
        Some(s) => ballistic::ballistic_walk(&grid, s, &opts),
        None    => ballistic::ballistic_walk_all(&grid, &opts),
    };
    let body = ballistic::frames_to_json(&frames);
    println!("{}", body);
    if let Some(key) = sign_key.as_ref() {
        // payload = exactly what println! wrote: the body plus its '\n'.
        let mut payload = body.into_bytes();
        payload.push(b'\n');
        println!("{}", attest::attestation_line(&payload, key, &chrono_like_ts()));
    }
}

// Reads a JSON array from --grid <path|->.
// If length is 144, it expands to diagonal hits on the 144x144 grid.
// If length is 20736, it's used directly.
fn grid_from_args(args: &[String]) -> Option<([u8; 20736], usize)> {
    let i = args.iter().position(|a| a == "--grid")?;
    let path = args.get(i + 1)?;
    let text = if path == "-" {
        use std::io::Read;
        let mut s = String::new();
        std::io::stdin().read_to_string(&mut s).ok()?;
        s
    } else {
        std::fs::read_to_string(path).ok()?
    };
    let arr = parse_int_array(&text).unwrap_or_else(|e| {
        eprintln!("intentguard --grid: {}", e);
        std::process::exit(2);
    });
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
        eprintln!("intentguard --grid: expected 144 or 20736 ints, got {}", len);
        std::process::exit(2);
    }
    Some((g, len))
}

#[derive(Deserialize)]
struct ProjectXorInput {
    intent_bits: Vec<u8>,
    reality_bits: Vec<u8>,
}

#[derive(Serialize)]
struct ProjectXorOutput {
    intent_bitmap_b64: String,
    reality_bitmap_b64: String,
    friction_bitmap_b64: String,
    friction_nodes: usize,
}

#[derive(Deserialize)]
struct WalkInput {
    grid_b64: String, // Packed bitmap (2592 bytes)
    decay: f64,
    depth: usize,
    // "" / "traversal" = the lit-graph ballistic walk (support = lit cells,
    // intensity = path-convergence weight). "diffusion" = additionally spread
    // weight to ShortLex-adjacent UNLIT neighbours, so the cloud smooths beyond
    // the binaries (decorrelates from the XOR). See pmu-pipeline-flow.md.
    #[serde(default)]
    mode: String,
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
fn run_walk(_args: &[String]) {
    use std::io::Read;
    use base64::{engine::general_purpose, Engine as _};
    
    let mut buffer = String::new();
    std::io::stdin().read_to_string(&mut buffer).expect("Failed to read from stdin");
    let input: WalkInput = serde_json::from_str(&buffer).expect("Failed to parse JSON");

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
    println!("{}", serde_json::to_string(&output).unwrap());
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
fn run_project_xor(_args: &[String]) {
    use std::io::Read;
    let mut buffer = String::new();
    std::io::stdin().read_to_string(&mut buffer).unwrap();
    let input: ProjectXorInput = serde_json::from_str(&buffer).unwrap();

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
    println!("{}", serde_json::to_string(&output).unwrap());
}

fn pack_bitmap_b64(bits: &[u8]) -> String {
    use base64::{engine::general_purpose, Engine as _};
    let mut bytes = vec![0u8; (bits.len() + 7) / 8];
    for (i, &bit) in bits.iter().enumerate() {
        if bit != 0 {
            bytes[i >> 3] |= 1 << (7 - (i & 7));
        }
    }
    general_purpose::STANDARD.encode(bytes)
}

fn run_sense(_args: &[String]) {
    use std::io::Read;
    let mut buffer = String::new();
    std::io::stdin().read_to_string(&mut buffer).expect("Failed to read from stdin");
    let input: SenseInput = serde_json::from_str(&buffer).expect("Failed to parse JSON");

    // Map the stdin field to the featurizer. Unknown values are a hard error
    // (exit 2) rather than a silent fallback — two sensors must never blur.
    let mode = match input.shingle_mode.as_str() {
        "" | "char" => signature::ShingleMode::Char,
        "word" => signature::ShingleMode::Word,
        other => {
            eprintln!("intentguard --sense: unknown shingle_mode {:?} (use \"char\" or \"word\")", other);
            std::process::exit(2);
        }
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
    println!("{}", serde_json::to_string(&output).unwrap());
}

/// UTC timestamp in YYYY-MM-DDTHH-MM-SS form. We avoid chrono to keep
/// the dependency surface minimal (rayon was the only addition for PRO-G).
fn chrono_like_ts() -> String {
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

// Tiny JSON int-array parser — zero deps. Accepts `[0,1,0,1,...]` with
// optional whitespace; everything else is a parse error.
fn parse_int_array(s: &str) -> Result<Vec<i64>, String> {
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
        // run_walk uses to UNPACK grid_b64. Pack then unpack must be identity.
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
