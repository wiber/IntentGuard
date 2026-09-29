// src/main.rs — IntentGuard: the boundary-legibility core, on the metal. THE CLI, and only the CLI.
//
// Walk the declared intent and the reality onto the same 144×144 lattice with the ballistic walk,
// place each with the gzip-NCD sensor, find the encircled regions, encode the panel PNG, and sign
// the exact bytes emitted so anyone can re-hash and verify them. LLM-free; same bytes in, same bytes out.
//
// Since C461 the work lives in the library (src/lib.rs); this file reads arguments and stdin, prints
// what the library returns, and owns every exit code. Its output is byte-identical to the pre-split
// binary on every kept mode (guard: tests/lib_api.rs).
//
// Carved from ThetaCog's pmu-onchip crate: every mode kept here prints what pmu-onchip prints for
// the same input. Build: cargo build --release   Run: target/release/intentguard --help

use intentguard::{aperture, attest, ballistic, boundary_probe, lattice, lens, ops, png, pointer_chase, regions};

const USAGE: &str = "intentguard — boundary legibility: where the work landed against where it was declared

placement   --lens [--text T | stdin] [--targets lib.json]    gzip-NCD seed → definer walk → σ → fence
                   [--bulk T | --bulk-file p] [--seed matched] [--perm K]   the matched seed: your context as the
                   mass, targets cut to the intent's length, gain calibrated against the shuffled line; seed_fit
                   says whether the placement is admissible (unmeasured rows have no pixel worth reading)
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
    if has("--definer-walk") { run_definer_walk(&args); }
    else if has("--lens") { run_lens(&args); }
    else if has("--walk") { run_walk(&args); }
    else if has("--project-xor") { run_project_xor(&args); }
    else if has("--aperture") { run_aperture(&args); }
    else if has("--sense") { run_sense(&args); }
    else if has("--encode-png") { run_encode_png(&args); }
    else if has("--regions") { run_regions(&args); }
    else if has("--shortlex") { println!("{}", serde_json::to_string(&ballistic::SHORTLEX[..]).expect("serialize shortlex")); }
    else if has("--lattice") { println!("{}", lattice::lattice_json_from_args(&args)); }
    else if has("--verify-receipt") { run_verify_receipt(&args); }
    else if has("--ballistic") { run_ballistic(&args); }
    else if has("--byte-footprint") { run_byte_footprint(&args); }
    else if has("--boundary-probe") { run_boundary_probe(&args); }
    else if has("--pointer-chase") { run_pointer_chase(); }
    else { println!("{}", USAGE); }
}

fn flag(args: &[String], name: &str) -> Option<String> {
    args.iter().position(|a| a == name).and_then(|i| args.get(i + 1)).cloned()
}

/// Print a library error the way the CLI always has: the message on stderr, exit 2.
fn die(msg: String) -> ! {
    eprintln!("{}", msg);
    std::process::exit(2);
}

fn stdin_string() -> String {
    use std::io::Read;
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).expect("Failed to read from stdin");
    s
}

fn run_lens(args: &[String]) {
    let text = match flag(args, "--text") {
        Some(t) => t,
        None => {
            use std::io::Read;
            let mut s = String::new();
            std::io::stdin().read_to_string(&mut s).unwrap_or(0);
            s
        }
    };
    let opts = intentguard::LensOpts::from_args(args).unwrap_or_else(|e| die(e));
    println!("{}", intentguard::lens(&text, &opts).unwrap_or_else(|e| die(e)));
}

fn run_definer_walk(args: &[String]) {
    let v = lens::definer_walk_value(args).unwrap_or_else(|e| die(e));
    println!("{}", serde_json::to_string(&v).expect("serialize walk"));
}

fn run_aperture(_args: &[String]) {
    let mut buf = String::new();
    if std::io::Read::read_to_string(&mut std::io::stdin(), &mut buf).is_err() {
        die("--aperture: could not read stdin".into());
    }
    println!("{}", aperture::aperture_json(&buf).unwrap_or_else(|e| die(e)));
}

fn run_regions(_args: &[String]) {
    use std::io::Read;
    let mut buf = Vec::new();
    std::io::stdin().read_to_end(&mut buf).expect("read cls bitmap from stdin");
    assert_eq!(buf.len(), 144 * 144, "expected {} cls bytes (144×144), got {}", 144 * 144, buf.len());
    println!("{}", regions::regions_json(&buf));
}

// `intentguard --encode-png --rgba <raw> --width W --height H --out <png>`
// Exists so the byte-identity guard can drive BOTH encoders over the same buffer and diff the
// output. It is deliberately dumb: raw RGBA in, PNG out, no walk, no rendering, no interpretation.
fn run_encode_png(args: &[String]) {
    let rgba_path = flag(args, "--rgba").unwrap_or_else(|| die("--encode-png requires --rgba <path>".into()));
    let out_path = flag(args, "--out").unwrap_or_else(|| die("--encode-png requires --out <path>".into()));
    let w: usize = flag(args, "--width").and_then(|s| s.parse().ok()).unwrap_or(0);
    let h: usize = flag(args, "--height").and_then(|s| s.parse().ok()).unwrap_or(0);
    if w == 0 || h == 0 { die("--encode-png requires --width and --height".into()); }
    let rgba = std::fs::read(&rgba_path).unwrap_or_else(|e| die(format!("cannot read {}: {}", rgba_path, e)));
    if rgba.len() != w * h * 4 {
        die(format!("rgba is {} bytes, expected {} for {}x{}", rgba.len(), w * h * 4, w, h));
    }
    let png = png::png_from_rgba(&rgba, w, h);
    if let Err(e) = std::fs::write(&out_path, &png) { die(format!("cannot write {}: {}", out_path, e)); }
    println!("{{\"ok\":true,\"bytes\":{},\"width\":{},\"height\":{},\"out\":{:?}}}", png.len(), w, h, out_path);
}

// run_byte_footprint — the candidate independent physical witness. Reads {doc} from stdin.
fn run_byte_footprint(_args: &[String]) {
    #[derive(serde::Deserialize)]
    struct ByteFootprintInput { doc: String }
    let buffer = stdin_string();
    let input: ByteFootprintInput = serde_json::from_str(&buffer).expect("Failed to parse JSON");
    println!("{}", ops::byte_footprint_json(&input.doc));
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
    let path = flag(args, "--verify-receipt").unwrap_or_default();
    let bytes = std::fs::read(&path).unwrap_or_else(|e| die(format!("--verify-receipt: cannot read {:?}: {}", path, e)));
    let (ok, line) = intentguard::verify_json(&bytes);
    println!("{}", line);
    if !ok { std::process::exit(1); }
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
    // --decay tunes the per-ply geometric decay (default 0.5).
    if let Some(v) = flag(args, "--decay").and_then(|s| s.parse::<f64>().ok()) { opts.decay_factor = v; }
    if let Some(v) = flag(args, "--max-depth").and_then(|s| s.parse::<usize>().ok()) { opts.max_depth = v; }
    // --budget-ms <N> — the IN-BINARY time bound: elapsed is checked before every fan-out ply; when spent,
    // the walk emits ONE terminal frame with "budgetExhausted":true, then stops. Absent = unbounded.
    if let Some(v) = flag(args, "--budget-ms").and_then(|s| s.parse::<u64>().ok()) { opts.budget_ms = Some(v); }
    let start_idx = flag(args, "--start").and_then(|s| intentguard::start_index(&s));
    // --sign: the binary signs SHA-256 of the EXACT bytes it emits and appends ONE trailing attestation
    // line. Key: INTENTGUARD_SIGNING_SEED when set, else the macOS host-derived key. Key failure is a HARD
    // exit 2, never a silent unsigned run.
    let sign = args.iter().any(|a| a == "--sign");
    // --stream: NDJSON — one frame per line, flushed as each ply completes.
    if args.iter().any(|a| a == "--stream") {
        use std::io::Write;
        let key = if sign { Some(attest::signing_key().unwrap_or_else(|e| die(format!("intentguard --sign: {}", e)))) } else { None };
        let stdout = std::io::stdout();
        let mut lock = stdout.lock();
        intentguard::walk_stream(&grid, start_idx, &opts, key.as_ref(), &mut |line: &str| {
            writeln!(lock, "{}", line).expect("write frame");
            lock.flush().expect("flush frame");
        });
        return;
    }
    if sign {
        use std::io::Write;
        let bytes = intentguard::walk_signed(&grid, start_idx, &opts).unwrap_or_else(|e| die(format!("intentguard --sign: {}", e)));
        let stdout = std::io::stdout();
        let mut lock = stdout.lock();
        lock.write_all(&bytes).expect("write signed frames");
        lock.flush().expect("flush");
        return;
    }
    println!("{}", intentguard::walk(&grid, start_idx, &opts));
}

// Reads a JSON array from --grid <path|->: 144 ints expand to diagonal hits, 20,736 are used directly.
// An unreadable file falls back to the demo grid (None), as it always has; a malformed one exits 2.
fn grid_from_args(args: &[String]) -> Option<([u8; 20736], usize)> {
    let path = flag(args, "--grid")?;
    let text = if path == "-" {
        use std::io::Read;
        let mut s = String::new();
        std::io::stdin().read_to_string(&mut s).ok()?;
        s
    } else {
        std::fs::read_to_string(&path).ok()?
    };
    Some(ops::grid_from_json(&text).unwrap_or_else(|e| die(format!("intentguard --grid: {}", e))))
}

fn run_walk(_args: &[String]) {
    let buffer = stdin_string();
    let input: ops::WalkInput = serde_json::from_str(&buffer).expect("Failed to parse JSON");
    println!("{}", ops::walk_heatmap_json(&input));
}

fn run_project_xor(_args: &[String]) {
    use std::io::Read;
    let mut buffer = String::new();
    std::io::stdin().read_to_string(&mut buffer).unwrap();
    let input: ops::ProjectXorInput = serde_json::from_str(&buffer).unwrap();
    println!("{}", ops::project_xor_json(&input));
}

fn run_sense(_args: &[String]) {
    let buffer = stdin_string();
    let input: ops::SenseInput = serde_json::from_str(&buffer).expect("Failed to parse JSON");
    println!("{}", ops::sense_json(&input).unwrap_or_else(|e| die(e)));
}
