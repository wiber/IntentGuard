// tests/lib_api.rs — the C461 guard: the library IS the binary.
//
// L1 BYTE-IDENTITY   intentguard::lens(text) + '\n' equals `intentguard --lens --text text` byte for byte on
//                    all 12 thesis fixtures, naked and matched (bulk = the spec), after stripping only the
//                    wall-clock fields (seed_gzip_us, walk_ms, elapsed_ms) — the same three tests/thesis.rs strips.
// L2 PRE-SPLIT PIN   on the parity platform (aarch64 macOS) those same stripped bytes hash to what the binary
//                    printed BEFORE the library split (captured from HEAD 3d00eb3), so lib and bin cannot drift
//                    together unnoticed.
// L3 WALK            intentguard::walk equals `--ballistic` byte for byte.
// L4 VERIFY          intentguard::verify accepts the CLI's signed receipt and rejects a one-bit forge.
// L5 ENV SEED        with INTENTGUARD_SIGNING_SEED set and PATH emptied (no `ioreg` reachable), `--sign` signs,
//                    the receipt verifies (library and CLI), and the pubkey is the seed's own. Seen red: the
//                    same run WITHOUT the seed exits 2, because the macOS path needs ioreg.
//
// What this does NOT test: whether a placement is right. That is undecidable, and nothing here claims it.

use intentguard::{LensOpts, Targets};
use std::path::PathBuf;
use std::process::{Command, Output, Stdio};

const BIN: &str = env!("CARGO_BIN_EXE_intentguard");
const WALL_CLOCK: [&str; 3] = ["seed_gzip_us", "walk_ms", "elapsed_ms"];
const FIXTURES: [&str; 12] = ["1-spec", "1-on", "1-off", "2-spec", "2-on", "2-off", "3-spec", "3-on", "3-off", "4-spec", "4-on", "4-off"];
/// A fixed test seed (never a real key): bytes 0x00..0x1f.
const TEST_SEED: &str = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

fn root() -> PathBuf { PathBuf::from(env!("CARGO_MANIFEST_DIR")) }
fn fixture(name: &str) -> String { std::fs::read_to_string(root().join("tests/fixtures").join(format!("{name}.txt"))).expect("fixture") }
fn tmp(name: &str) -> PathBuf { std::env::temp_dir().join(format!("intentguard-libapi-{}-{}", std::process::id(), name)) }

fn run_env(args: &[&str], env: &[(&str, &str)], clear_seed: bool) -> Output {
    let mut cmd = Command::new(BIN);
    cmd.args(args).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());
    if clear_seed { cmd.env_remove("INTENTGUARD_SIGNING_SEED"); }
    for (k, v) in env { cmd.env(k, v); }
    cmd.output().expect("spawn intentguard")
}
fn bin_stdout(args: &[&str]) -> Vec<u8> {
    let o = run_env(args, &[], true);
    assert!(o.status.success(), "intentguard {:?} exited {:?}: {}", args, o.status, String::from_utf8_lossy(&o.stderr));
    o.stdout
}

/// Byte-level strip: `"key":<number>` → `"key":X` for the wall-clock keys. No re-serialisation, so every
/// other byte is compared as emitted.
fn strip(s: &str) -> String {
    let mut out = s.to_string();
    for k in WALL_CLOCK {
        let needle = format!("\"{k}\":");
        let mut from = 0;
        while let Some(i) = out[from..].find(&needle) {
            let v0 = from + i + needle.len();
            let v1 = v0 + out[v0..].bytes().take_while(|b| b.is_ascii_digit() || b"-+.eE".contains(b)).count();
            out.replace_range(v0..v1, "X");
            from = v0 + 1;
        }
    }
    out
}
fn sha256_hex(parts: &[String]) -> String {
    use sha2::{Digest, Sha256};
    let mut h = Sha256::new();
    for p in parts { h.update(p.as_bytes()); }
    h.finalize().iter().map(|b| format!("{b:02x}")).collect()
}
fn repo_opts() -> LensOpts { LensOpts::default().with_targets(Targets::Path(root().join(intentguard::lens::LIBRARY))) }

/// (library stripped, binary stripped) for one fixture under one arm.
fn both(name: &str, bulk: Option<&str>) -> (String, String) {
    let text = fixture(name);
    let lib = intentguard::lens(&text, &repo_opts().with_bulk(bulk.map(str::to_string))).expect("library lens") + "\n";
    let root_s = root().to_string_lossy().to_string();
    let mut args = vec!["--lens", "--text", &text, "--repo", &root_s];
    if let Some(b) = bulk { args.extend(["--bulk", b]); }
    let bin = String::from_utf8(bin_stdout(&args)).unwrap();
    (strip(&lib), strip(&bin))
}

#[test]
fn l1_l2_library_lens_is_the_binary_byte_for_byte() {
    let mut naked = Vec::new();
    for n in FIXTURES {
        let (lib, bin) = both(n, None);
        assert_eq!(lib, bin, "naked lens differs on {n}");
        naked.push(bin);
    }
    let mut bulk = Vec::new();
    for k in 1..=4 {
        let spec = fixture(&format!("{k}-spec"));
        for s in ["on", "off"] {
            let (lib, bin) = both(&format!("{k}-{s}"), Some(&spec));
            assert_eq!(lib, bin, "matched (bulk=spec) lens differs on {k}-{s}");
            bulk.push(bin);
        }
    }
    // L2 — the pre-split pin (captured from the HEAD-3d00eb3 binary, 2026-09-29). gzip lengths come from the
    // vendored Chromium zlib, whose SIMD path is per-arch, so the pin is only asserted on the parity platform.
    if cfg!(all(target_arch = "aarch64", target_os = "macos")) {
        assert_eq!(sha256_hex(&naked), "79b93b6caf12da7e29c7d2b1930238e259b9b0e4fe3387335514c573cf3f9224", "naked lens bytes drifted from the pre-split binary");
        assert_eq!(sha256_hex(&bulk), "57f2b472404c2a69123fb009de937817d9be78d74b6f02d24f1bf84a53dc3856", "matched lens bytes drifted from the pre-split binary");
    }
}

#[test]
fn l1_library_errors_are_the_cli_stderr_lines() {
    let e = intentguard::LensOpts::from_args(&["--lens".into(), "--session".into(), "x".into()]).unwrap_err();
    let o = run_env(&["--lens", "--text", "x", "--session", "x"], &[], true);
    assert_eq!(o.status.code(), Some(2));
    assert_eq!(String::from_utf8_lossy(&o.stderr), format!("{e}\n"));
}

/// The grid the thesis uses: the reality's walked anchors as a 144-int array.
fn reality_grid() -> (Vec<u8>, String, PathBuf) {
    let v: serde_json::Value = serde_json::from_str(&intentguard::lens(&fixture("1-on"), &repo_opts()).unwrap()).unwrap();
    let walked: Vec<&str> = v["walked"].as_array().unwrap().iter().map(|x| x.as_str().unwrap()).collect();
    let grid: Vec<u8> = intentguard::SHORTLEX.iter().map(|l| walked.contains(l) as u8).collect();
    let path = tmp("grid.json");
    std::fs::write(&path, serde_json::to_string(&grid).unwrap()).unwrap();
    (grid, v["pixel"].as_str().unwrap().to_string(), path)
}

#[test]
fn l3_library_walk_is_the_binary() {
    let (grid144, pixel, path) = reality_grid();
    let (grid, _) = intentguard::ops::grid_from_json(&serde_json::to_string(&grid144).unwrap()).unwrap();
    let opts = intentguard::WalkOpts { max_depth: 3, ..Default::default() };
    let lib = intentguard::walk(&grid, intentguard::start_index(&pixel), &opts) + "\n";
    let bin = bin_stdout(&["--ballistic", "--grid", path.to_str().unwrap(), "--start", &pixel, "--max-depth", "3"]);
    assert_eq!(lib.as_bytes(), &bin[..], "library walk must equal --ballistic byte for byte");
    if cfg!(all(target_arch = "aarch64", target_os = "macos")) {
        assert_eq!(sha256_hex(&[lib]), "8609ca8c67370a4c5e981a66a5c8a86b28d15a82ca9ff8e1dee2993881571958", "walk bytes drifted from the pre-split binary");
    }
}

fn signed_with_seed(path: &PathBuf, pixel: &str, env: &[(&str, &str)]) -> Output {
    run_env(&["--ballistic", "--grid", path.to_str().unwrap(), "--start", pixel, "--max-depth", "3", "--sign"], env, true)
}

#[test]
fn l4_l5_env_seed_signs_without_ioreg_and_verifies() {
    let (_, pixel, path) = reality_grid();
    let empty = tmp("empty-path");
    std::fs::create_dir_all(&empty).unwrap();
    let no_ioreg = empty.to_str().unwrap();

    // Seen red: no seed + no ioreg on PATH → the macOS key path cannot run, --sign refuses (exit 2).
    let red = signed_with_seed(&path, &pixel, &[("PATH", no_ioreg)]);
    assert_eq!(red.status.code(), Some(2), "without the seed and without ioreg, --sign must refuse: {}", String::from_utf8_lossy(&red.stdout));

    // Green: the seed alone is enough.
    let o = signed_with_seed(&path, &pixel, &[("PATH", no_ioreg), ("INTENTGUARD_SIGNING_SEED", TEST_SEED)]);
    assert!(o.status.success(), "--sign with the seed must work without ioreg: {}", String::from_utf8_lossy(&o.stderr));
    let receipt = o.stdout;
    let out = String::from_utf8_lossy(&receipt).to_string();
    assert!(!out.contains(TEST_SEED), "the seed must never be printed");

    // The library verifies it, and the signer is the seed's own public key.
    let v = intentguard::verify(&receipt).expect("library verifies the env-seed receipt");
    let expect_pk = {
        use base64::{engine::general_purpose, Engine as _};
        general_purpose::STANDARD.encode(intentguard::attest::seed_from_hex(TEST_SEED).unwrap().verifying_key().to_bytes())
    };
    assert_eq!(v.pubkey_b64, expect_pk);
    let last: serde_json::Value = serde_json::from_str(out.trim_end().rsplit('\n').next().unwrap()).unwrap();
    assert_eq!(last["attestation"]["hw"], "env-seed", "the receipt names its key root");

    // The CLI verifies it too; one flipped bit is rejected by both.
    let good = tmp("seed-receipt.txt");
    std::fs::write(&good, &receipt).unwrap();
    assert!(run_env(&["--verify-receipt", good.to_str().unwrap()], &[], true).status.success());
    let mut forged = receipt.clone();
    forged[10] ^= 0x01;
    assert!(intentguard::verify(&forged).is_err(), "a one-bit forge must not verify");
    let bad = tmp("seed-forged.txt");
    std::fs::write(&bad, &forged).unwrap();
    assert_eq!(run_env(&["--verify-receipt", bad.to_str().unwrap()], &[], true).status.code(), Some(1));

    // The payload half of the receipt is exactly the unsigned --ballistic output.
    let unsigned = bin_stdout(&["--ballistic", "--grid", path.to_str().unwrap(), "--start", &pixel, "--max-depth", "3"]);
    assert_eq!(v.payload_bytes, unsigned.len());
    assert_eq!(&receipt[..unsigned.len()], &unsigned[..]);
}

#[test]
fn l5_malformed_seed_is_refused_and_never_echoed() {
    let (_, pixel, path) = reality_grid();
    let secret = "zz-not-hex-but-secret";
    let o = signed_with_seed(&path, &pixel, &[("INTENTGUARD_SIGNING_SEED", secret)]);
    assert_eq!(o.status.code(), Some(2), "a malformed seed is an error, never a silent fall-back to the host key");
    let all = format!("{}{}", String::from_utf8_lossy(&o.stdout), String::from_utf8_lossy(&o.stderr));
    assert!(!all.contains(secret), "the seed value must not appear in any output: {all}");
}

#[test]
fn l4_library_sign_receipt_round_trips_in_process() {
    // In-process, with a derived test key (no env mutation inside a threaded test binary).
    use intentguard::attest;
    let key = attest::seed_from_hex(TEST_SEED).unwrap();
    let payload = b"{\"pixel\":\"C2,A\"}\n";
    let line = attest::attestation_line_from(payload, &key, attest::KeySource::EnvSeed, "2026-09-29T00-00-00");
    let mut receipt = payload.to_vec();
    receipt.extend_from_slice(line.as_bytes());
    receipt.push(b'\n');
    let v = intentguard::verify(&receipt).unwrap();
    assert_eq!(v.payload_bytes, payload.len());
    let (ok, json) = intentguard::verify_json(&receipt);
    assert!(ok && json.contains("\"ok\":true"));
}
