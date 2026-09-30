// tests/limits.rs — C490 THE LIMITS A DEPENDENT RELIES ON. IntentGuard is meant to be a Cargo dependency of
// ThetaCog's pmu-onchip, and a library inside someone else's process has a stricter contract than a CLI: it may
// refuse, but it may not panic on input, may not answer differently under threads, and its verifier may not accept
// a receipt whose signed parts were touched. Each test below is one of those limits, measured on the embedded
// vocabulary (no path on disk). The CLI cases run the built binary: bytes that are not UTF-8 are refused by name.
//
// SUFFICIENT FOR: these inputs, these threads, these flips. NOT SUFFICIENT FOR: every input (Rice), or the claims on
// the attestation line outside the signature — ts, binary_sha256, hw, kdf, note are the signer's word, and
// `the_line_metadata_is_outside_the_signature` pins that limit so it is flipped on purpose the day it closes.

use intentguard::*;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::process::{Command, Stdio};

fn fx(n: &str) -> String {
    std::fs::read_to_string(format!("{}/tests/fixtures/{n}.txt", env!("CARGO_MANIFEST_DIR"))).expect("fixture")
}
fn opts() -> LensOpts {
    let mut o = LensOpts::default().with_targets(Targets::Json(LIBRARY_JSON.to_string()));
    o.budget_ms = u128::MAX;
    o
}
// The wall-clock fields and the terminal label are not functions of the input.
fn stable(s: &str) -> String {
    let mut v: serde_json::Value = serde_json::from_str(s).expect("lens json");
    let o = v.as_object_mut().expect("object");
    for k in ["seed_gzip_us", "walk_ms", "running_in"] { o.remove(k); }
    v.to_string()
}
const FIXTURES: [&str; 8] = ["1-on", "1-off", "2-on", "2-off", "3-on", "3-off", "4-on", "4-off"];

#[test]
fn threads_answer_what_one_thread_answers() {
    let serial: Vec<(String, Vec<u8>)> =
        FIXTURES.iter().map(|n| (stable(&lens(&fx(n), &opts()).unwrap()), card(&fx(n), None).unwrap())).collect();
    let handles: Vec<_> = (0..32)
        .map(|i| {
            let n = FIXTURES[i % FIXTURES.len()];
            std::thread::spawn(move || (i % FIXTURES.len(), stable(&lens(&fx(n), &opts()).unwrap()), card(&fx(n), None).unwrap()))
        })
        .collect();
    for h in handles {
        let (k, l, c) = h.join().expect("a lens/card thread panicked");
        assert_eq!(l, serial[k].0, "{}: threaded lens differs from serial", FIXTURES[k]);
        assert_eq!(c, serial[k].1, "{}: threaded card differs from serial", FIXTURES[k]);
    }
}

#[test]
fn hostile_text_is_placed_or_refused_never_a_panic() {
    let multibyte = "語".repeat(5000) + &"é".repeat(3001) + "🟩";
    let cases: Vec<(&str, String)> = vec![
        ("empty", String::new()),
        ("whitespace", " \n\t\r ".repeat(500)),
        ("punctuation", "!?.,;:".repeat(300)),
        ("newlines", "\n".repeat(10_000)),
        ("bom", "\u{FEFF}".repeat(300)),
        ("combining", "e\u{0301}\u{0302}".repeat(400)),
        ("nul", "\0".repeat(1000)),
        ("multibyte", multibyte.clone()),
        ("one_word_200k", "a".repeat(200_000)),
        ("at_the_floor", "b".repeat(220)),
        ("zwj", "👩‍👩‍👧‍👦".repeat(200)),
    ];
    let mut panics = vec![];
    for (name, t) in &cases {
        for bulk in [None, Some(multibyte.clone()), Some(String::new())] {
            let tag = format!("{name} bulk={:?}", bulk.as_ref().map(|b| b.len()));
            if catch_unwind(AssertUnwindSafe(|| lens(t, &opts().with_bulk(bulk.clone())))).is_err() { panics.push(format!("lens {tag}")); }
            if catch_unwind(AssertUnwindSafe(|| card(t, bulk.clone()))).is_err() { panics.push(format!("card {tag}")); }
        }
        // the entropy-density window cuts at char boundaries on every budget near an edge
        for budget in [1usize, 2, 3, 4, 219, 220, 221, 1000] {
            if catch_unwind(|| aperture::matched_cut(t, budget)).is_err() { panics.push(format!("matched_cut {name} {budget}")); }
        }
    }
    assert!(panics.is_empty(), "panicked on: {panics:?}");
}

fn signed_card() -> Vec<u8> {
    let key = attest::seed_from_hex(&"11".repeat(32)).expect("test seed");
    let bytes = card(&fx("1-on"), None).unwrap();
    let line = attest::attestation_line_from(&bytes, &key, KeySource::EnvSeed, "2026-09-30T00-00-00");
    [bytes, line.into_bytes(), b"\n".to_vec()].concat()
}

#[test]
fn garbage_receipts_are_refused_never_a_panic() {
    let good = signed_card();
    assert!(verify(&good).is_ok(), "the genuine receipt must verify");
    let crlf: Vec<u8> = good.iter().flat_map(|&b| if b == b'\n' { vec![b'\r', b'\n'] } else { vec![b] }).collect();
    let garbage: Vec<Vec<u8>> = vec![vec![], b"\n".to_vec(), b"\n\n\n".to_vec(), vec![0xff; 4096], good[..good.len() / 2].to_vec(), crlf];
    for g in &garbage {
        match catch_unwind(|| verify(g)) {
            Err(_) => panic!("verify panicked on {} bytes of garbage", g.len()),
            Ok(Ok(_)) => panic!("verify accepted {} bytes of garbage", g.len()),
            Ok(Err(_)) => {}
        }
    }
}

#[test]
fn every_one_bit_flip_of_the_signed_parts_is_refused() {
    let good = signed_card();
    let cut = good[..good.len() - 1].iter().rposition(|&b| b == b'\n').unwrap() + 1;
    let line = std::str::from_utf8(&good[cut..]).unwrap();
    // the signed parts: every payload byte, and the values of payload_sha256, sig_b64, pubkey_b64 and alg
    let mut signed: Vec<usize> = (0..cut).collect();
    for key in ["payload_sha256", "sig_b64", "pubkey_b64", "alg"] {
        let open = format!("\"{key}\":\"");
        let at = line.find(&open).unwrap_or_else(|| panic!("no {key} on the line")) + open.len();
        let len = line[at..].find('"').unwrap();
        signed.extend((cut + at)..(cut + at + len));
    }
    let accepted: Vec<usize> = signed
        .into_iter()
        .filter(|&i| { let mut t = good.clone(); t[i] ^= 0x01; catch_unwind(|| verify(&t)).expect("verify panicked on a flip").is_ok() })
        .collect();
    assert!(accepted.is_empty(), "{} one-bit flips of signed bytes still verify, first at byte {:?}", accepted.len(), accepted.first());
}

#[test]
fn the_line_metadata_is_outside_the_signature() {
    let good = String::from_utf8(signed_card()).unwrap();
    for (from, to) in [("2026-09-30T00-00-00", "1999-01-01T00-00-00"), ("\"hw\":\"env-seed\"", "\"hw\":\"env-seee\"")] {
        let forged = good.replacen(from, to, 1);
        assert_ne!(forged, good, "the probe did not find {from}");
        assert!(verify(forged.as_bytes()).is_ok(), "{from} is now under the signature — flip this pin on purpose");
    }
}

#[test]
fn walk_every_start_on_empty_and_full_grids() {
    for grid in [[0u8; CELLS], [1u8; CELLS]] {
        for s in 0..SHORTLEX.len() {
            assert!(catch_unwind(|| walk(&grid, Some(s), &WalkOpts::default())).is_ok(), "walk panicked from {}", SHORTLEX[s]);
        }
    }
}

fn cli(args: &[&str], stdin: &[u8]) -> std::process::Output {
    use std::io::Write;
    let mut c = Command::new(env!("CARGO_BIN_EXE_intentguard"))
        .args(args)
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn intentguard");
    c.stdin.take().unwrap().write_all(stdin).unwrap();
    c.wait_with_output().unwrap()
}

#[test]
fn stdin_that_is_not_utf8_is_refused_by_name() {
    let bytes = [&[0xffu8, 0xfe][..], "placement of the work against the declared lane ".repeat(10).as_bytes()].concat();
    for door in [&["--lens"][..], &["--card"][..]] {
        let out = cli(door, &bytes);
        let err = String::from_utf8_lossy(&out.stderr);
        assert_eq!(out.status.code(), Some(2), "{door:?}: exit {:?}, stderr {err}", out.status.code());
        assert!(err.contains("not") || err.contains("UTF-8"), "{door:?}: the refusal does not say why: {err}");
        assert!(out.stdout.is_empty(), "{door:?}: printed a placement for bytes it could not read");
    }
}

#[test]
fn malformed_json_on_stdin_is_refused_never_a_panic() {
    for door in ["--walk", "--sense", "--project-xor", "--byte-footprint"] {
        let out = cli(&[door], b"not json");
        assert_eq!(out.status.code(), Some(2), "{door}: exit {:?} ({})", out.status.code(), String::from_utf8_lossy(&out.stderr));
    }
}
