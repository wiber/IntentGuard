// tests/cross_arch.rs — the C460 guard: intentguard::card() and intentguard::walk() are byte-reproducible
// PER PLATFORM, pinned against fixed goldens.
//
// These goldens were computed on aarch64-apple-darwin (this operator's Mac) at IntentGuard HEAD 002f47b6,
// by running exactly this test file. `card()` always uses the crate's EMBEDDED vocabulary (LIBRARY_JSON)
// and the vendored Node/Chromium zlib fork build.rs compiles — whose deflate output is SIMD-path-specific
// per architecture (see build.rs: `aarch64` gets the NEON+CRC32 path, `x86_64` gets SSSE3-adler-only, no
// hardware CRC32 on x86 because node's own gyp disables it there too). Whether an x86_64-linux-gnu or
// aarch64-linux-gnu runner produces the SAME card bytes as this Mac is exactly what C460 measures.
//
// A DIFFERENT hash on Linux is the C460 FINDING, not a test to re-baseline — NEVER edit these constants to
// make a Linux mismatch pass; that hides the finding instead of reporting it. The only legitimate reason to
// recompute a golden is a real, intentional change to lens.rs / vendor/zlib / the card format on THIS
// platform, and the commit that does it must say so. Every case's own sha256 prints in the assertion
// message on failure, so the CI log carries the Linux values without anyone re-running by hand.
//
// This file spawns no binary (unlike tests/lib_api.rs) — it calls intentguard::card / intentguard::walk
// directly, so it pins the LIBRARY's own output, independent of the CLI's argument parsing.

use intentguard::{card, walk, WalkOpts, CELLS, SHORTLEX};

fn sha256_hex(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    Sha256::digest(bytes).iter().map(|b| format!("{b:02x}")).collect()
}

const T1_SPEC: &str = include_str!("fixtures/1-spec.txt");
const T1_ON: &str = include_str!("fixtures/1-on.txt");
const T1_OFF: &str = include_str!("fixtures/1-off.txt");
const T2_SPEC: &str = include_str!("fixtures/2-spec.txt");
const T2_ON: &str = include_str!("fixtures/2-on.txt");
const T2_OFF: &str = include_str!("fixtures/2-off.txt");
const T3_SPEC: &str = include_str!("fixtures/3-spec.txt");
const T3_ON: &str = include_str!("fixtures/3-on.txt");
const T3_OFF: &str = include_str!("fixtures/3-off.txt");
const T4_SPEC: &str = include_str!("fixtures/4-spec.txt");
const T4_ON: &str = include_str!("fixtures/4-on.txt");
const T4_OFF: &str = include_str!("fixtures/4-off.txt");

/// (case name, text, bulk, golden sha256 of card() bytes) — one row per fixture arm: NAKED over every
/// fixture text (the spec text itself included, since it too can be placed), MATCHED (bulk = that
/// fixture's own N-spec) over the on/off arms — the same 12-naked/8-matched shape tests/lib_api.rs uses.
const CASES: &[(&str, &str, Option<&str>, &str)] = &[
    // ── naked (bulk = None) ──
    ("1-spec naked", T1_SPEC, None, "88c9d58f339549d93c1ba61b9c272aceb3c779a34e6f83d305154b2436a89321"),
    ("1-on naked", T1_ON, None, "f47bd9dd95f3be469ed51b1fea48527c11f09134fd689d11a09cd372ebf077c5"),
    ("1-off naked", T1_OFF, None, "8e4fe232bff46f1a1807556fa08f7fbf24d853e5291441634b9762a8fee01ff3"),
    ("2-spec naked", T2_SPEC, None, "75679097f6ae1ce3211d7f196e1a40afa0e543df8533ffa555947ef2ac4bd614"),
    ("2-on naked", T2_ON, None, "a5740cc52bf581270fac0c64fc1feb97a8b2b33c505a274c9e47fc81c1bf365f"),
    ("2-off naked", T2_OFF, None, "2c1ee52e2003401f5cb5c2e63835ba72ff0c67f9e351810075d1f0ab4cbd5192"),
    ("3-spec naked", T3_SPEC, None, "bb195bf6f9a6b2e4b67a520a1d0df3e658649fc7fed7cc54471dcd2d7bab8086"),
    ("3-on naked", T3_ON, None, "892fbac939b63f53bae245a6ed0acf0519b3d4d23598268452cf258d3441f615"),
    ("3-off naked", T3_OFF, None, "524fb690f83f55a5f0327e69063383b308b36e873d870f14949d0b4e16b75b78"),
    ("4-spec naked", T4_SPEC, None, "b5b958568769f06bc6e938dc3272a7bac6261e8bf95e4269a5908b04b75e6faf"),
    ("4-on naked", T4_ON, None, "da15e14085874248accb8ef9efbf94933686330e676f9b146438e777aeabb484"),
    ("4-off naked", T4_OFF, None, "598a076530c67eb56d2c0374f0b82868226dba2d70c020b330028699bf29610e"),
    // ── matched (bulk = this fixture's own spec) ──
    ("1-on matched", T1_ON, Some(T1_SPEC), "be6797bd2df0f88f0dd94b605b19848a06e34d65d5143e3a6c5ca63f72c4a7bd"),
    ("1-off matched", T1_OFF, Some(T1_SPEC), "72b8ff9d160558530e1480fb27ca7552ec67df3e584fa83d1dcecef9a8481e2b"),
    ("2-on matched", T2_ON, Some(T2_SPEC), "ac2451e8a6cd8672fb44f6f72235b587cb5d357dbd9c3da888cab61f6070fcb0"),
    ("2-off matched", T2_OFF, Some(T2_SPEC), "486bacf0b8ccf515287fa30a71a48f54e683e1eb604a6478e0e19733d357ab50"),
    ("3-on matched", T3_ON, Some(T3_SPEC), "37753e6c9a89a1602bdc33c31d6865b862f82b25f9599707cad2a47e56a299a6"),
    ("3-off matched", T3_OFF, Some(T3_SPEC), "f76a53ba7d808cf49cf8a2d9356939b6ec1613f3782c4172b3c03acd2586dc7b"),
    ("4-on matched", T4_ON, Some(T4_SPEC), "0c99cf2e12572246f238e99c9e708fcef365a05c8fea555071f9fc55a841ef3f"),
    ("4-off matched", T4_OFF, Some(T4_SPEC), "436d6ede88148830eefa9853392624e27e1caf02fd080b54e5ae5ce98196624b"),
];

#[test]
fn card_is_byte_reproducible_on_this_platform() {
    let mut failures = Vec::new();
    for (name, text, bulk, golden) in CASES {
        let bytes = card(text, bulk.map(str::to_string)).unwrap_or_else(|e| panic!("card({name}): {e}"));
        let got = sha256_hex(&bytes);
        if &got.as_str() != golden {
            failures.push(format!("  {name}: got {got}  want {golden}"));
        }
    }
    assert!(
        failures.is_empty(),
        "C460 finding — intentguard::card() diverged from the aarch64-apple-darwin goldens on this platform \
         (a Linux mismatch here is the measurement, never a golden to edit):\n{}",
        failures.join("\n")
    );
}

/// intentguard::walk() over a small fixed grid (no library, no gzip — pure ballistic-walk determinism),
/// pinned independent of the card path above.
#[test]
fn walk_is_byte_reproducible_on_this_platform() {
    let mut grid = Box::new([0u8; CELLS]);
    let n = SHORTLEX.len();
    for i in 0..n {
        grid[i * n + i] = 1;
    }
    grid[0 * n + 5] = 1;
    grid[5 * n + 9] = 1;
    grid[9 * n + 20] = 1;
    let opts = WalkOpts { max_depth: 3, ..Default::default() };
    let out = walk(&grid, Some(0), &opts);
    let got = sha256_hex(out.as_bytes());
    let golden = "50221ba57d592e36d1e2f15720e0a735adb8ac4c69cfbaf879f719633c95d5f2";
    assert_eq!(got, golden, "C460 finding — intentguard::walk() diverged from the aarch64-apple-darwin golden on this platform (bytes: {} len {})", got, out.len());
}
