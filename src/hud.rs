// src/hud.rs — the HUD reading's one home (C752): the window cut, the walk options, the fold, the colours, and the
// single-shot `reading` that composes them.
//
// pmu-onchip's own hud.rs (the bin crate, C748) runs the streaming server for `--hud-serve`: the debounce timer, the
// grid, the freeze gate, the restart caps. Those are a process, so they stay there. Everything that decides WHAT a
// reading says lives here, and the server imports it (`pub use intentguard::hud::{…}`), so `--hud-serve` and the napi
// addon's `hudReading` reach one window, one walk, one fold. A second copy of any of these would let the two doors print
// different heat hashes for the same text, which is the exact failure the contract's same-hash rule exists to catch
// (docs/specs/vna/HUD-NAPI-CONTRACT.md).
//
// Sufficient for: one window of text reaches the same walk and fold as one event of `--hud-serve` on that window.
// NOT sufficient for: the server's debounce decision (whether THIS window would have been walked at all), or whether
// either placement is right (Rice).

use crate::hud_config::{self, HudConfigFile};
use crate::lattice;
use crate::walk_lens::{self, LensOpts};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::path::Path;

pub fn sha12(s: &str) -> String {
    let mut h = Sha256::new();
    h.update(s.as_bytes());
    let d = h.finalize();
    d.iter().take(6).map(|b| format!("{:02x}", b)).collect()
}

/// The walk options every HUD reading runs: the full walk (the binary's own defaults) plus the seed aperture the walk door
/// passes for every non-commit source, source "hud". `budget_ms` bounds the walk (C751); the fold's top_k is the config's and
/// never the walk's --top-k.
pub fn lens_opts(repo: &Path, budget_ms: Option<u64>) -> LensOpts {
    let mut walk_args: Vec<String> = ["--lens", "--seed", "matched", "--guided-passes", "2", "--matched-cut", "--worms", "2", "--worms-orthogonal", "--perm", "8"].iter().map(|s| s.to_string()).collect();
    if let Some(b) = budget_ms { walk_args.push("--budget-ms".into()); walk_args.push(b.to_string()); }
    LensOpts { args: [walk_args, vec!["--repo".to_string(), repo.to_string_lossy().to_string()]].concat(), source: "hud".into() }
}

/// Trim to window_words words from the end, joined by single spaces, then cut to max_chars from the head (the walk door's own cap).
/// Returns the window and, when the cut dropped characters, how many the window held before the cut (the reading says so, C751).
pub fn window(text: &str, window_words: usize, max_chars: usize) -> (String, Option<usize>) {
    let words: Vec<&str> = text.split_whitespace().collect();
    let from = words.len().saturating_sub(window_words);
    let joined = words[from..].join(" ");
    let held = joined.chars().count();
    if held > max_chars { (joined.chars().take(max_chars).collect(), Some(held)) } else { (joined, None) }
}

/// The js band rule, ported exactly from scripts/vna/hud-read.mjs colourOf: share of the max heat above 0.66 is hot, above 0.33 warm, else cool; no max is cold.
pub fn band_of(v: f64, max: f64) -> &'static str {
    if max == 0.0 { "cold" } else if v / max > 0.66 { "hot" } else if v / max > 0.33 { "warm" } else { "cool" }
}

/// The grid colour: the 2x2 of (seed admissible) x (heat share above ncd_green). Admissible and above is green, neither is red,
/// either one alone is amber. The band (hot/warm/cool/cold, the js rule) rides on the cell beside it.
pub fn colour_of(admissible: bool, share: f64, ncd_green: f64) -> &'static str {
    match (admissible, share > ncd_green) { (true, true) => "green", (false, false) => "red", _ => "amber" }
}

// ── the three words of a cell (C754) ─────────────────────────────────────────────────────────────────────────────────
// The spec (operator 2026-10-12, the S-T-O triad): every cell shows three WORDS heard in the window, never a lane name —
// the Strategy word on top, the Tactics word in the centre beside the status emoji, the Operations word at the bottom (the
// concrete artifact). Each is picked from the window's own tokens by the canonical sensor, gzip-NCD (walk_lens::node_gzip_len),
// against two texts from the one snippet library the walk reads: the cell's own snippet and its tier anchor (A,A strategy ·
// B,B tactics · C,C operations). LLM-free, a pure function of (window, library, cell), so the receipt stays re-runnable.
// Sufficient for: which heard word sits nearest this cell and this tier. Not sufficient for: whether it is the right word (Rice).

const STOP: &[&str] = &["the", "and", "that", "this", "with", "from", "into", "have", "has", "had", "was", "were", "are", "for",
    "not", "but", "you", "your", "they", "them", "their", "what", "when", "where", "which", "who", "will", "would", "could",
    "should", "there", "here", "then", "than", "just", "like", "also", "only", "very", "some", "more", "most", "such", "each",
    "about", "over", "under", "been", "being", "does", "did", "doing", "can", "its", "it's", "our", "out", "all", "any", "one",
    "two", "how", "why", "because", "while", "these", "those", "make", "made", "get", "got", "let", "lets", "need", "want"];

/// The window's distinct candidate words, in order of first appearance: surrounding punctuation trimmed (inner . / _ : - kept,
/// so a path or a trait survives), at least three alphanumerics, no stopword.
pub fn tokens(window: &str) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    let mut out = vec![];
    for raw in window.split_whitespace() {
        let t = raw.trim_matches(|c: char| !(c.is_alphanumeric() || c == '/' || c == '_'));
        if t.chars().filter(|c| c.is_alphanumeric()).count() < 3 { continue; }
        let key = t.to_lowercase();
        if STOP.contains(&key.as_str()) || !seen.insert(key) { continue; }
        out.push(t.to_string());
    }
    out
}

/// An artifact token names code: a path, a module path, a snake_case or CamelCase identifier, or a file with an extension.
pub fn is_artifact(t: &str) -> bool {
    let inner_dot = t.char_indices().any(|(i, c)| c == '.' && i > 0 && t[i + 1..].chars().next().map_or(false, |n| n.is_alphanumeric()));
    let camel = t.chars().zip(t.chars().skip(1)).any(|(a, b)| a.is_lowercase() && b.is_uppercase());
    t.contains('/') || t.contains("::") || t.contains('_') || inner_dot || camel
}

fn gz(s: &str) -> f64 { walk_lens::node_gzip_len(s.as_bytes()) as f64 }
fn ncd(a: &str, ga: f64, b: &str, gb: f64) -> f64 {
    let gab = gz(&format!("{} {}", a, b));
    (gab - ga.min(gb)) / ga.max(gb).max(1.0)
}

/// The cell's three words: (strategy, tactics, operations). Each is the token with the least NCD to the cell's snippet plus
/// the tier anchor's; a word is used once per cell; Operations picks first, preferring artifact tokens, and falls back to any. None when the
/// window has no candidate word left.
pub fn cell_words(toks: &[String], cell: usize, lib: &walk_lens::Library, shown: &[String]) -> [Option<String>; 3] {
    let at = |coord: &str| lib.coords.iter().position(|c| c == coord).and_then(|i| lib.targets.get(i)).cloned().unwrap_or_default();
    let own = lib.targets.get(cell).cloned().unwrap_or_default();
    let tiers = [at("A,A"), at("B,B"), at("C,C")];
    let g_own = gz(&own);
    let scored: Vec<(String, f64)> = toks.iter().map(|t| (t.clone(), gz(t))).collect();
    let mut used: Vec<String> = vec![];
    let mut out: [Option<String>; 3] = [None, None, None];
    // Operations picks first so a code artifact heard in the window lands on the bottom line, never on the top two.
    for k in [2usize, 0, 1] {
        let tier = &tiers[k];
        let g_tier = gz(tier);
        let pick = |want_artifact: bool, used: &Vec<String>| -> Option<String> {
            // a word already shown in another slot is the last choice: fresh words first, then any (H2: slots differ where the window allows)
            let fresh = scored.iter().any(|(t, _)| !used.contains(t) && !shown.contains(t) && (!want_artifact || is_artifact(t)));
            scored.iter().filter(|(t, _)| !used.contains(t) && (!fresh || !shown.contains(t)) && (!want_artifact || is_artifact(t)))
                .map(|(t, g)| (t, ncd(t, *g, &own, g_own) + ncd(t, *g, tier, g_tier)))
                .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal).then(a.0.cmp(b.0)))
                .map(|(t, _)| t.clone())
        };
        let w = if k == 2 { pick(true, &used).or_else(|| pick(false, &used)) } else { pick(false, &used) };
        if let Some(x) = &w { used.push(x.clone()); }
        out[k] = w;
    }
    out
}

/// The tier of an axis label: A, A1, A2, A3 → 0 (Strategy) · B… → 1 (Tactics) · C… → 2 (Operations).
pub fn tier_of(axis: &str) -> usize { match axis.as_bytes().first() { Some(b'A') => 0, Some(b'B') => 1, _ => 2 } }
/// The three tier names, in slot order; the page paints them as the axis header outside the grid (H2).
pub const TIERS: [&str; 3] = ["Strategy", "Tactics", "Operations"];

/// Fold the 144 heat to the NINE tier intersections (H2, operator 2026-10-12: "the 3x3 are the intersections of strategy tactics
/// operations"): slot = row tier × 3 + column tier, always all nine, at fixed positions. A slot's heat is the sum of the 144 heat over
/// every cell whose row axis and column axis fall in that tier pair. Its three words are heard in `window` (cell_words, scored against
/// the tier-pair cell's own snippet, A,A … C,C); a word already shown in another slot is the last choice, so slots differ where the
/// window allows. Colour: seed admissible × the slot's share of the hottest slot above ncd_green. No library, or no word left, reads
/// UNMEASURED — never a lane name. The landed lane rides on the cell as `lane`. Returns None when the heat is not a 144-field.
pub fn fold(heat: &Value, result: &Value, ncd_green: f64, window: &str, lib: Option<&walk_lens::Library>) -> Option<Vec<Value>> {
    let arr = heat.as_array()?;
    if arr.len() != lattice::CELLS { return None; }
    let h: Vec<f64> = arr.iter().map(|x| x.as_f64().unwrap_or(0.0).abs()).collect();
    let mut pair = [0.0f64; 9];
    for (i, v) in h.iter().enumerate() {
        let (r, c) = (tier_of(lattice::AXES[i / lattice::SIDE]), tier_of(lattice::AXES[i % lattice::SIDE]));
        pair[r * 3 + c] += v;
    }
    let max = pair.iter().cloned().fold(0.0f64, f64::max);
    let lane: Option<String> = result.get("lane").and_then(Value::as_str).map(String::from)
        .or_else(|| result.get("ratchet").and_then(|r| r.get("winner")).and_then(Value::as_str).filter(|w| *w != "none").map(String::from));
    let ncd = result.get("ncd").and_then(Value::as_f64).or_else(|| result.get("seed_fit").and_then(|f| f.get("gain")).and_then(Value::as_f64));
    let admissible = result.get("seed_fit").and_then(|f| f.get("better_than_random")).and_then(Value::as_bool).unwrap_or(false);
    let toks = tokens(window);
    let mut shown: Vec<String> = vec![];
    Some((0..9).map(|slot| {
        let (r, c) = (slot / 3, slot % 3);
        let cell = r * lattice::SIDE + c;   // the tier-pair cell itself: A,A · A,B · … · C,C
        let words = match lib { Some(l) => cell_words(&toks, cell, l, &shown), None => [None, None, None] };
        for w in words.iter().flatten() { shown.push(w.clone()); }
        let word = |w: &Option<String>| w.clone().unwrap_or_else(|| "UNMEASURED".to_string());
        let share = if max > 0.0 { pair[slot] / max } else { 0.0 };
        json!({
            "slot": slot, "cell": cell, "coord": lattice::index_coord(cell), "tiers": [TIERS[r], TIERS[c]],
            "strategy": word(&words[0]), "tactics": word(&words[1]), "operations": word(&words[2]),
            "colour": colour_of(admissible, share, ncd_green), "band": band_of(pair[slot], max),
            "heat": (pair[slot] * 1e6).round() / 1e6, "ncd": ncd, "lane": lane,
            "why": format!("{} × {} · heat {:.3}{}", TIERS[r], TIERS[c], pair[slot], if admissible { "" } else { " · not admissible" }),
        })
    }).collect())
}

/// `hud::reading(text, config_json, repo)` — one text, one placement, no process: the config's window over `text`, the walk
/// `lens_opts` names, the fold to the config's top_k/ncd_green. `config_json` is the text of data/vna/hud-config.json; an empty
/// string reads the crate defaults and the reading says so (`config_loaded: false`). `heat_hash` is sha12 of the 144 heat as
/// `--hud-serve` prints it, so the two doors compare by one field.
pub fn reading(text: &str, config_json: &str, repo: &Path) -> Value {
    let (cfg, loaded): (HudConfigFile, bool) = if config_json.trim().is_empty() {
        (HudConfigFile::default(), false)
    } else {
        match serde_json::from_str::<Value>(config_json) {
            Ok(v) => (hud_config::from_value(&v), true),
            Err(e) => return json!({ "kind": "reading", "walk": { "ok": false, "why": format!("config is not JSON: {}", e) }, "cells": [] }),
        }
    };
    let (w, cut_from) = window(text, cfg.window_words, cfg.max_chars);
    if w.trim().is_empty() {
        return json!({ "kind": "reading", "walk": { "ok": false, "why": "empty window: nothing to walk" }, "cells": [], "config_loaded": loaded });
    }
    let t0 = std::time::Instant::now();
    match walk_lens::read_text(&w, &lens_opts(repo, None), repo) {
        Ok(result) => {
            let ms = t0.elapsed().as_secs_f64() * 1000.0;
            let heat = result.get("heat").cloned().unwrap_or(Value::Null);
            let lib = walk_lens::load_library(&repo.join("data/pmu/snippet-library-144.json")).ok();
            match fold(&heat, &result, cfg.grid().ncd_green, &w, lib.as_ref()) {
                Some(cells) => json!({
                    "kind": "reading", "window_sha": sha12(&w), "text_sha": sha12(&w), "words": w.split_whitespace().count(),
                    "cut_from_chars": cut_from, "config_loaded": loaded, "cells": cells,
                    "walk": { "ok": true, "why": Value::Null, "ms": ms, "pixel": result.get("pixel").cloned().unwrap_or(Value::Null) },
                    "heat_hash": sha12(&heat.to_string()), "result": result,
                }),
                None => json!({ "kind": "reading", "walk": { "ok": false, "why": "walk returned no 144-cell heat field", "ms": ms }, "cells": [], "result": result }),
            }
        }
        Err(e) => json!({ "kind": "reading", "walk": { "ok": false, "why": e }, "cells": [] }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_window_keeps_the_last_words_then_cuts_chars() {
        assert_eq!(window("a b c d", 2, 800), ("c d".to_string(), None));
        assert_eq!(window("abcdef", 60, 4), ("abcd".to_string(), Some(6)));
    }

    #[test]
    fn an_empty_window_and_bad_config_refuse_with_a_why() {
        let repo = std::env::current_dir().unwrap();
        assert_eq!(reading("   ", "", &repo)["walk"]["why"], json!("empty window: nothing to walk"));
        assert!(reading("text", "{nope", &repo)["walk"]["why"].as_str().unwrap().starts_with("config is not JSON"));
    }
}
