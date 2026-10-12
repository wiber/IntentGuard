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

fn lane_label(axis_i: usize) -> String {
    lattice::lane_name(lattice::AXES[axis_i % lattice::SIDE]).unwrap_or("?").to_string()
}

/// Fold the 144 heat to the top_k cells. strategy = the row axis's lane name, tactics = the column axis's lane name, operations =
/// the landed lane when the result carries one (a label saying no rung ran is not a lane), else the bare coordinate.
/// Returns None when the heat is not a 144-field.
pub fn fold(heat: &Value, result: &Value, top_k: usize, ncd_green: f64) -> Option<Vec<Value>> {
    let arr = heat.as_array()?;
    if arr.len() != lattice::CELLS { return None; }
    let h: Vec<f64> = arr.iter().map(|x| x.as_f64().unwrap_or(0.0).abs()).collect();
    let max = h.iter().cloned().fold(0.0f64, f64::max);
    let lane: Option<String> = result.get("lane").and_then(Value::as_str).map(String::from)
        .or_else(|| result.get("ratchet").and_then(|r| r.get("winner")).and_then(Value::as_str).filter(|w| *w != "none").map(String::from));
    let ncd = result.get("ncd").and_then(Value::as_f64).or_else(|| result.get("seed_fit").and_then(|f| f.get("gain")).and_then(Value::as_f64));
    let admissible = result.get("seed_fit").and_then(|f| f.get("better_than_random")).and_then(Value::as_bool).unwrap_or(false);
    let mut idx: Vec<usize> = (0..h.len()).filter(|&i| h[i] > 0.0).collect();
    idx.sort_by(|&a, &b| h[b].partial_cmp(&h[a]).unwrap_or(std::cmp::Ordering::Equal).then(a.cmp(&b)));
    idx.truncate(top_k);
    Some(idx.into_iter().enumerate().map(|(slot, i)| {
        let coord = lattice::index_coord(i);
        json!({
            "slot": slot, "cell": i, "coord": coord,
            "strategy": lane_label(i / lattice::SIDE), "tactics": lane_label(i % lattice::SIDE),
            "operations": lane.clone().unwrap_or_else(|| coord.clone()),
            "colour": colour_of(admissible, h[i] / max, ncd_green), "band": band_of(h[i], max),
            "ncd": ncd, "lane": lane,
            "why": format!("heat {:.3} at {}{}", h[i], coord, if admissible { "" } else { " · not admissible" }),
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
            match fold(&heat, &result, cfg.top_k, cfg.grid().ncd_green) {
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
