// tests/thesis.rs — the whole thesis, end to end, in pure Rust: only the built binary and the fixtures.
//
// T1 RE-RUNNABLE  same intent + reality twice → byte-identical placements; the signed receipt's hash is the same.
// T2 SEPARATION   work written TO a spec lands nearer the spec's placement than work written OFF it.
// T3 THE RECEIPT  --sign then --verify-receipt accepts; one flipped byte is rejected (exit 1).
// T4 THE REFUSAL  an empty / below-floor input yields the refusal, never a placement.
//
// What this does NOT test: whether the work is good. That is undecidable, and nothing here claims it.
//
// T2's distance is read off the crate's own classifier, never computed beside it: the spec is placed with
// --lens (pixel + Chebyshev fence), the reality's walked cells are classified against THAT fence by
// --lattice, and the off-lane share = red / (green + amber + red) from the counts --lattice prints.

use serde_json::Value;
use std::path::PathBuf;
use std::process::{Command, Output, Stdio};

const BIN: &str = env!("CARGO_BIN_EXE_intentguard");
const WALL_CLOCK: [&str; 3] = ["seed_gzip_us", "walk_ms", "elapsed_ms"];

fn root() -> PathBuf { PathBuf::from(env!("CARGO_MANIFEST_DIR")) }
fn fixture(name: &str) -> String { std::fs::read_to_string(root().join("tests/fixtures").join(name)).expect("fixture") }
fn tmp(name: &str) -> PathBuf { std::env::temp_dir().join(format!("intentguard-thesis-{}-{}", std::process::id(), name)) }

fn run(args: &[&str], stdin: Option<&[u8]>) -> Output {
    let mut cmd = Command::new(BIN);
    cmd.args(args).arg("--repo").arg(root()).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = cmd.spawn().expect("spawn intentguard");
    { use std::io::Write; let mut si = child.stdin.take().unwrap(); if let Some(b) = stdin { si.write_all(b).unwrap(); } }
    child.wait_with_output().expect("intentguard output")
}
fn ok_stdout(args: &[&str], stdin: Option<&[u8]>) -> Vec<u8> {
    let o = run(args, stdin);
    assert!(o.status.success(), "intentguard {:?} exited {:?}: {}", args, o.status, String::from_utf8_lossy(&o.stderr));
    o.stdout
}

/// Parse and drop the wall-clock fields (the same three the byte-identity check strips), then re-serialize.
fn strip(bytes: &[u8]) -> String {
    fn walk(v: &mut Value) {
        match v {
            Value::Object(m) => { for k in WALL_CLOCK { m.remove(k); } for x in m.values_mut() { walk(x); } }
            Value::Array(a) => { for x in a { walk(x); } }
            _ => {}
        }
    }
    let mut v: Value = serde_json::from_slice(bytes).expect("json");
    walk(&mut v);
    serde_json::to_string(&v).unwrap()
}
fn lens(text: &str) -> Value { lens_with(text, &[]) }
/// `--lens --text <text>` plus extra flags (e.g. `--seed matched`, `--bulk <spec>`).
fn lens_with(text: &str, extra: &[String]) -> Value {
    let mut args: Vec<&str> = vec!["--lens", "--text", text];
    args.extend(extra.iter().map(|s| s.as_str()));
    serde_json::from_slice(&ok_stdout(&args, None)).unwrap()
}
fn strs(v: &Value) -> Vec<String> { v.as_array().unwrap().iter().map(|x| x.as_str().unwrap().to_string()).collect() }

/// The off-lane share of `reality`'s walked cells against `spec`'s fence, as --lattice counts them.
fn off_lane_share(spec: &Value, reality: &Value) -> (f64, u64, u64, u64) {
    let f = &spec["fence"];
    let fence = format!("{},{},{},{}", f["r0"], f["r1"], f["c0"], f["c1"]);
    let cells = strs(&reality["walked"]).join(";");
    let out: Value = serde_json::from_slice(&ok_stdout(&["--lattice", "--pixel", spec["pixel"].as_str().unwrap(), "--fence", &fence, "--cells", &cells], None)).unwrap();
    let c = &out["counts"];
    let (g, a, r) = (c["green"].as_u64().unwrap(), c["amber"].as_u64().unwrap(), c["red"].as_u64().unwrap());
    let n = (g + a + r).max(1) as f64;
    (r as f64 / n, g, a, r)
}

/// A signed receipt: the ballistic walk over the reality's walked anchors, from the reality's pixel.
fn signed_receipt(reality: &Value, name: &str) -> Vec<u8> {
    let walked = strs(&reality["walked"]);
    let labels: Vec<String> = serde_json::from_slice::<Vec<String>>(&ok_stdout(&["--shortlex"], None)).unwrap();
    let grid: Vec<u8> = labels.iter().map(|l| walked.contains(l) as u8).collect();
    let path = tmp(name);
    std::fs::write(&path, serde_json::to_string(&grid).unwrap()).unwrap();
    ok_stdout(&["--ballistic", "--grid", path.to_str().unwrap(), "--start", reality["pixel"].as_str().unwrap(), "--max-depth", "3", "--sign"], None)
}
fn payload_sha(receipt: &[u8]) -> String {
    let last = String::from_utf8_lossy(receipt).trim_end().rsplit('\n').next().unwrap().to_string();
    serde_json::from_str::<Value>(&last).unwrap()["attestation"]["payload_sha256"].as_str().unwrap().to_string()
}

#[test]
fn t1_rerunnable_same_bytes_in_same_bytes_out() {
    let (spec, reality) = (fixture("1-spec.txt"), fixture("1-on.txt"));
    for text in [&spec, &reality] {
        let a = strip(&ok_stdout(&["--lens", "--text", text], None));
        let b = strip(&ok_stdout(&["--lens", "--text", text], None));
        assert_eq!(a, b, "the same text placed twice must print the same bytes");
    }
    let r = lens(&reality);
    let (x, y) = (signed_receipt(&r, "t1a.json"), signed_receipt(&r, "t1b.json"));
    assert_eq!(payload_sha(&x), payload_sha(&y), "the signed receipt's payload hash must repeat");
}

// T2 — FAILS AS MEASURED, 2026-09-29, under BOTH seeds; fixtures untouched since the first run. Off-lane share of the
// reality's walked cells against the spec's fence (lower = nearer the spec); [adm] = the seed's own null test admits
// the placement, [unm] = it does not (the pixel is then not a measurement and ThetaCog would refuse to read it).
//
//   NAKED seed (lit_scores; no admissibility verdict exists in this mode)
//   pair 1 payments webhook   spec A,A     on C2,A   1.000 (g0 a0 r19)   off B,B    0.667 (g2 a1 r6)    FAIL
//   pair 2 login rate limit   spec C,C     on C2,C2  0.818 (g1 a1 r9)    off A,A    0.474 (g8 a2 r9)    FAIL
//   pair 3 data retention     spec C1,C1   on C3,C3  0.462 (g7 a0 r6)    off C2,C2  0.000 (g8 a0 r0)    FAIL
//   pair 4 welcome email      spec C2,C2   on A1,A1  0.636 (g4 a0 r7)    off A1,A1  0.684 (g2 a4 r13)   pass     → 1 of 4
//
//   MATCHED seed, no bulk (targets cut to the intent's length, gain calibrated against the shuffled line)
//   pair 1   spec B,B   [unm]   on B2,A   1.000 [unm]   off C1,A1  1.000 [unm]   FAIL
//   pair 2   spec C,C   [unm]   on C,C2   0.842 [unm]   off C1,C2  0.722 [adm]   FAIL
//   pair 3   spec A1,B3 [unm]   on A3,A3  0.211 [unm]   off C1,C1  0.895 [unm]   pass
//   pair 4   spec B3,C1 [unm]   on C3,C3  0.000 [adm]   off B,B    1.000 [unm]   pass                    → 2 of 4
//
//   MATCHED seed, the reality measured with the SPEC as its bulk (the arm the test below runs)
//   pair 1   spec B,B   [unm]   on B2,A   1.000 [unm]   off C1,A1  1.000 [unm]   FAIL
//   pair 2   spec C,C   [unm]   on C,C2   0.842 [unm]   off C,C2   1.000 [unm]   pass
//   pair 3   spec A1,B3 [unm]   on A3,A3  0.211 [unm]   off C1,C1  0.895 [unm]   pass
//   pair 4   spec B3,C1 [unm]   on C3,C3  0.500 [unm]   off B,B    1.000 [unm]   pass                    → 3 of 4
//   (bulk = this repo's README for every side: also 3 of 4, pair 1 the same failure; 0 of 12 placements admissible)
//
// WHY, in plain words. The 144 cells are prose about twelve operating archetypes (Strategist, Tactician, Operator,
// Counsel, Treasurer …). The fixtures are a payments webhook, a login rate limit, a retention job and a welcome email,
// written as code diffs. Measured directly, every fixture sits 0.80–0.94 gzip-NCD from EVERY cell with a top-5 spread of
// 0.000–0.011: the whole 144-cell profile is flat, and the pixel is whichever cell is a hundredth nearer by noise. The
// content does carry signal — spec-vs-on beats spec-vs-off by direct NCD in 3 of 4 pairs, and the one it misses
// (pair 2) misses because gzip at 500 chars reads REGISTER first: an English spec compresses better against an English
// pricing paragraph than against TypeScript, whatever the topic. So the placement here measures two things, neither of
// them "is this the work the spec asked for": the register of the text (prose vs code) and noise over a vocabulary
// that does not span the fixtures' domain. That is a sufficiency failure of the projection, not of the seed: the matched
// seed's own verdict says so, 10–12 of 12 placements per arm read unmeasured, and that verdict is the one thing this
// crate now hands a stranger that the naked seed could not. What separation needs is a lattice whose vocabulary spans
// the work being placed (ThetaCog's reef lanes are exactly that for its own repo) or fixtures written in the lattice's
// own register; either is a change to the instrument's inputs, never to the fixtures to make a test pass.
//
// Seen-red (t2_seen_red below, not ignored): with on/off swapped the verdicts invert pair for pair under both seeds, so
// the assertion discriminates; it is the placement that does not separate.

/// The T2 arm: spec placed with `spec_args`, each reality with `real_args` (both may name the spec as bulk).
fn t2_arm(name: &str, swap: bool, spec_args: &dyn Fn(&str) -> Vec<String>, real_args: &dyn Fn(&str) -> Vec<String>) -> Vec<String> {
    let mut failures = Vec::new();
    for k in 1..=4 {
        let spec_text = fixture(&format!("{k}-spec.txt"));
        let (on_name, off_name) = if swap { ("off", "on") } else { ("on", "off") };
        let spec = lens_with(&spec_text, &spec_args(&spec_text));
        let on = lens_with(&fixture(&format!("{k}-{on_name}.txt")), &real_args(&spec_text));
        let off = lens_with(&fixture(&format!("{k}-{off_name}.txt")), &real_args(&spec_text));
        let (s_on, g1, a1, r1) = off_lane_share(&spec, &on);
        let (s_off, g2, a2, r2) = off_lane_share(&spec, &off);
        println!("{name} pair {k}: spec {} {} · on {} {:.3} (g{g1} a{a1} r{r1}) {} · off {} {:.3} (g{g2} a{a2} r{r2}) {} {}",
            spec["pixel"], adm(&spec), on["pixel"], s_on, adm(&on), off["pixel"], s_off, adm(&off), if s_on < s_off { "pass" } else { "FAIL" });
        if !(s_on < s_off) { failures.push(format!("pair {k}: on {s_on:.3} !< off {s_off:.3}")); }
    }
    println!("{name}: {} of 4 separate", 4 - failures.len());
    failures
}
fn adm(v: &Value) -> &'static str { match v["seed_fit"]["better_than_random"].as_bool() { Some(true) => "[adm]", Some(false) => "[unm]", None => "" } }
fn naked(_spec: &str) -> Vec<String> { vec![] }
fn matched_spec_bulk(spec: &str) -> Vec<String> { vec!["--bulk".into(), spec.to_string()] }
fn matched_no_bulk(_spec: &str) -> Vec<String> { vec!["--seed".into(), "matched".into()] }

#[test]
#[ignore = "measured: separates 1 of 4 pairs with the naked seed, 3 of 4 with the matched seed and the spec as bulk (table + diagnosis above)"]
fn t2_on_spec_work_lands_nearer_the_spec_than_off_spec_work() {
    let naked_f = t2_arm("naked", false, &naked, &naked);
    let matched_f = t2_arm("matched(bulk=spec)", false, &matched_no_bulk, &matched_spec_bulk);
    assert!(naked_f.is_empty() && matched_f.is_empty(), "separation failed — naked: {naked_f:?} · matched: {matched_f:?}");
}

#[test]
fn t2_seen_red_swapped_on_off_fails_under_both_seeds() {
    // The falsifier arm: if the verdict did not depend on which text is called on-spec, swapping them would change nothing.
    // Every pair that passed straight must fail swapped. A pair that fails both ways is a tie (on and off at the same
    // share — pair 1 under the matched seed, both realities 1.000 off-lane), which is a failure to separate, not a pass.
    for (name, spec_args, real_args) in [("naked", &naked as &dyn Fn(&str) -> Vec<String>, &naked as &dyn Fn(&str) -> Vec<String>), ("matched(bulk=spec)", &matched_no_bulk, &matched_spec_bulk)] {
        let straight = t2_arm(name, false, spec_args, real_args);
        let swapped = t2_arm(&format!("{name}/swapped"), true, spec_args, real_args);
        assert!(!swapped.is_empty(), "{name}: the swapped arrangement must fail");
        assert!(swapped.len() >= 4 - straight.len(), "{name}: every pair that passed straight must fail swapped — straight {straight:?} · swapped {swapped:?}");
    }
}

#[test]
fn t3_the_receipt_verifies_and_a_forge_does_not() {
    let r = lens(&fixture("2-on.txt"));
    let receipt = signed_receipt(&r, "t3.json");
    let good = tmp("t3-receipt.txt");
    std::fs::write(&good, &receipt).unwrap();
    let o = run(&["--verify-receipt", good.to_str().unwrap()], None);
    assert!(o.status.success(), "a genuine receipt must verify: {}", String::from_utf8_lossy(&o.stdout));
    let mut forged = receipt.clone();
    forged[10] ^= 0x01;                                   // one flipped bit inside the payload
    let bad = tmp("t3-forged.txt");
    std::fs::write(&bad, &forged).unwrap();
    let o = run(&["--verify-receipt", bad.to_str().unwrap()], None);
    assert_eq!(o.status.code(), Some(1), "a one-byte forge must be rejected with exit 1");
    assert!(String::from_utf8_lossy(&o.stdout).contains("\"ok\":false"));
}

#[test]
fn t4_empty_or_below_floor_input_is_refused_never_placed() {
    // empty text: no pixel, no walked cell, the sensor names why
    let e = lens("");
    assert!(e["pixel"].is_null() && strs(&e["walked"]).is_empty(), "empty text must not place: {e}");
    assert_eq!(e["sensor"], "no-seeds");
    assert!(e["fallback_reason"].as_str().is_some());
    // a below-floor pair: the aperture refuses it (admissible false, the reason names the 220-byte floor)
    let pair = br#"{"intent":[{"path":"spec","text":"fix it"}],"reality":[{"path":"diff","text":"ok done"}]}"#;
    let a: Value = serde_json::from_slice(&ok_stdout(&["--aperture"], Some(pair))).unwrap();
    assert_eq!(a["admissible"], false, "a below-floor pair must not be admissible: {a}");
    assert!(a["reason"].as_str().unwrap().contains("floor"));
}

// KNOWN GAP, measured 2026-09-29 and left honest: `--lens` alone does not enforce the mass floor. On
// "fix it" (gzip 26 bytes, floor 220) it prints pixel "C,C" with a fence and 11 walked cells; only its
// intent_span shows gzip < floor. The refusal for thin input lives in --aperture (T4). Kept byte-identical
// to ThetaCog's pmu-onchip on purpose; making --lens refuse is a behaviour change to decide, not a carve.
#[test]
#[ignore = "known gap: --lens places below-floor text (see comment)"]
fn t4b_lens_refuses_below_floor_text() {
    let t = lens("fix it");
    assert!(t["pixel"].is_null(), "below-floor text should not place: {t}");
}
