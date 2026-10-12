// src/hud_grid.rs — C745 THE 3x3 PARAFOVEAL GRID, HOME IN THE CRATE (MAXIMISE RUST: node proved it, the crate lives it).
//
// Ports every decision of packages/thetacog-mcp-vscode/media/hud-core.js: the 9 fixed slots, apply_reading with the FIFO
// transition queue, the pill cut, colour from the reading only, select / defend / freeze_text, archetype, ask_line, health_lines.
// No clock of its own: every function takes `now_ms`, so a test drives it with a fake clock exactly like the js.
// Every constant is read from `HudConfig`; the grid state serialises to ONE json object with the same keys as the js grid, so
// the page paints either. Grip prose: a cell is a placement at an address, re-runnable from the commit.
//
// The cargo tests carry the cases of tests/vna/c734-*.test.mjs and write golden fixtures to tests/fixtures/hud-grid/*.json;
// tests/vna/c745-*.test.mjs replays them through hud-core.js until C748 deletes the js decisions.
#![allow(dead_code)]

use serde::Serialize;
use serde_json::{json, Value};
use std::collections::BTreeMap;

/// Milliseconds in the rate window: `transitions_per_s` is a per-SECOND limit, so the window is one second (a unit, not a tuning knob).
const MS_PER_S: u64 = 1000;

/// C746 (src/hud_config.rs) may later re-export or alias this. `ncd_green` and `tie_band` are carried for the config's whole shape;
/// the grid itself never reads them, because colour arrives in the reading and is never computed here.
#[derive(Clone, Debug, PartialEq)]
pub struct HudConfig {
    pub dwell_ms: u64,
    pub transitions_per_s: u32,
    pub fade_in_ms: u64,
    pub fade_out_ms: u64,
    pub pill_words: usize,
    pub pill_chars: usize,
    pub ncd_green: f64,
    pub tie_band: f64,
    pub slots: usize,
}

impl Default for HudConfig {
    fn default() -> Self {
        HudConfig {
            dwell_ms: 2500,
            transitions_per_s: 2,
            fade_in_ms: 350,
            fade_out_ms: 500,
            pill_words: 3,
            pill_chars: 15,
            ncd_green: 0.25, // unread by this module (colour comes from the reading)
            tie_band: 0.05,  // unread by this module
            slots: 9,
        }
    }
}

fn dot_of(colour: &str) -> Option<&'static str> {
    match colour {
        "green" => Some("🟢"),
        "amber" => Some("🟡"),
        "red" => Some("🔴"),
        "unmeasured" => Some("⚪"),
        _ => None,
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Cell {
    pub slot: usize,
    pub strategy: String,
    pub tactics: String,
    pub operations: String,
    pub colour: String,
    pub ncd: Option<f64>,
    pub lane: Value,
    pub why: String,
    pub alternatives: Vec<Value>,
    pub shown_at: u64,
    pub retire_at: Option<u64>,
    pub register: Option<String>,
    pub locked: bool,
    pub defended: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Add,
    Clear,
    Replace,
}

#[derive(Clone, Debug, Serialize)]
pub struct Queued {
    pub kind: Kind,
    pub slot: usize,
    pub cell: Option<Value>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Defence {
    pub sentence: String,
    #[serde(rename = "atMs")]
    pub at_ms: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Grid {
    pub slots: Vec<Option<Cell>>,
    pub queue: Vec<Queued>,
    pub log: Vec<u64>,
    pub pending: BTreeMap<usize, Value>,
    pub defences: BTreeMap<usize, Defence>,
    pub defending: Option<usize>,
    pub window_text: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct Counts {
    pub green: u32,
    pub amber: u32,
    pub red: u32,
    pub unmeasured: u32,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Archetype {
    pub name: String,
    pub emoji: String,
    pub counts: Counts,
    pub holds_freeze: bool,
}

// ── js-shaped value helpers (String(x), truthiness) ─────────────────────────────────────────────────────────────────
fn truthy(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().is_none_or(|f| f != 0.0 && !f.is_nan()),
        Value::String(s) => !s.is_empty(),
        _ => true,
    }
}
fn js_str(v: &Value) -> String {
    match v {
        Value::Null => String::new(),
        Value::String(s) => s.clone(),
        Value::Number(n) => n.as_i64().map(|i| i.to_string()).unwrap_or_else(|| n.as_f64().map(|f| f.to_string()).unwrap_or_default()),
        Value::Bool(b) => b.to_string(),
        other => other.to_string(),
    }
}
/// `String(raw[k] || '')`
fn text_of(raw: &Value, k: &str) -> String {
    match raw.get(k) {
        Some(v) if truthy(v) => js_str(v),
        _ => String::new(),
    }
}
fn colour_of(raw: &Value) -> String {
    match raw.get("colour").and_then(Value::as_str) {
        Some(c) if c != "unmeasured" && dot_of(c).is_some() => c.to_string(),
        _ => "unmeasured".to_string(),
    }
}
fn ncd_of(raw: &Value) -> Option<f64> {
    raw.get("ncd").and_then(Value::as_f64)
}
fn lane_of(raw: &Value) -> Value {
    raw.get("lane").cloned().unwrap_or(Value::Null)
}
fn why_of(raw: &Value) -> String {
    match raw.get("why") {
        None | Some(Value::Null) => String::new(),
        Some(v) => js_str(v),
    }
}

/// cut, never paraphrased: the first `pill_words` words, then the first `pill_chars` characters of that
pub fn pill(cfg: &HudConfig, text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().take(cfg.pill_words).collect();
    let joined = words.join(" ");
    if joined.chars().count() > cfg.pill_chars {
        joined.chars().take(cfg.pill_chars).collect::<String>().trim_end().to_string()
    } else {
        joined
    }
}

/// the painted face of a cell: three pills, the colour, its dot
pub fn face(cfg: &HudConfig, c: &Cell) -> Value {
    json!({ "strategy": pill(cfg, &c.strategy), "tactics": pill(cfg, &c.tactics), "operations": pill(cfg, &c.operations),
            "colour": c.colour, "dot": dot_of(&c.colour) })
}

fn make(raw: &Value, now_ms: u64) -> Cell {
    Cell {
        slot: raw.get("slot").and_then(Value::as_u64).unwrap_or(0) as usize,
        strategy: text_of(raw, "strategy"),
        tactics: text_of(raw, "tactics"),
        operations: text_of(raw, "operations"),
        colour: colour_of(raw),
        ncd: ncd_of(raw),
        lane: lane_of(raw),
        why: why_of(raw),
        alternatives: raw.get("alternatives").and_then(Value::as_array).cloned().unwrap_or_default(),
        shown_at: now_ms,
        retire_at: None,
        register: None,
        locked: false,
        defended: false,
    }
}
fn same_text(a: &Cell, b: &Value) -> bool {
    a.strategy == text_of(b, "strategy") && a.tactics == text_of(b, "tactics") && a.operations == text_of(b, "operations")
}

pub fn create_grid(cfg: &HudConfig) -> Grid {
    Grid { slots: vec![None; cfg.slots], queue: vec![], log: vec![], pending: BTreeMap::new(), defences: BTreeMap::new(), defending: None, window_text: String::new() }
}
pub fn set_window_text(grid: &mut Grid, text: &str) {
    grid.window_text = text.to_string();
}

fn recent(cfg: &HudConfig, grid: &Grid, now_ms: u64) -> usize {
    let _ = cfg;
    grid.log.iter().filter(|t| now_ms.saturating_sub(**t) < MS_PER_S).count()
}

/// advance the grid to now_ms: finish fades, then run queued transitions FIFO under the rate and dwell limits
pub fn tick(cfg: &HudConfig, grid: &mut Grid, now_ms: u64) {
    for i in 0..cfg.slots {
        let retire = grid.slots[i].as_ref().and_then(|c| c.retire_at);
        if let Some(r) = retire {
            if now_ms.saturating_sub(r) >= cfg.fade_out_ms {
                let inc = grid.pending.remove(&i);
                grid.slots[i] = inc.map(|raw| make(&raw, r + cfg.fade_out_ms));
            }
        }
    }
    while let Some(t) = grid.queue.first().cloned() {
        if recent(cfg, grid, now_ms) >= cfg.transitions_per_s as usize {
            break;
        }
        let shown = grid.slots[t.slot].as_ref().map(|c| c.shown_at);
        if t.kind != Kind::Add {
            if let Some(s) = shown {
                if now_ms.saturating_sub(s) < cfg.dwell_ms {
                    break;
                }
            }
        }
        grid.queue.remove(0);
        grid.log.push(now_ms);
        match t.kind {
            Kind::Add => {
                if grid.slots[t.slot].is_none() {
                    if let Some(raw) = &t.cell {
                        grid.slots[t.slot] = Some(make(raw, now_ms));
                    }
                }
            }
            _ => {
                if let Some(c) = grid.slots[t.slot].as_mut() {
                    if c.retire_at.is_none() {
                        c.retire_at = Some(now_ms);
                        if t.kind == Kind::Replace {
                            if let Some(raw) = t.cell {
                                grid.pending.insert(t.slot, raw);
                            }
                        }
                    }
                }
            }
        }
    }
    grid.log.retain(|x| now_ms.saturating_sub(*x) < MS_PER_S);
}

fn slot_of(raw: &Value, n_slots: usize) -> Option<usize> {
    let f = raw.get("slot")?.as_f64()?;
    if f.fract() == 0.0 && f >= 0.0 && (f as usize) < n_slots { Some(f as usize) } else { None }
}

/// the host's reading, 9 slots at most. Same text with a new colour repaints in place; a different cell is a queued transition.
pub fn apply_reading(cfg: &HudConfig, grid: &mut Grid, cells: &[Value], now_ms: u64) {
    let mut want: BTreeMap<usize, &Value> = BTreeMap::new();
    for r in cells {
        if let Some(s) = slot_of(r, cfg.slots) {
            want.insert(s, r);
        }
    }
    for i in 0..cfg.slots {
        let w = want.get(&i).copied();
        grid.queue.retain(|q| q.slot != i); // the latest reading wins the slot; one entry per slot
        grid.pending.remove(&i);
        let retiring = grid.slots[i].as_ref().is_some_and(|c| c.retire_at.is_some());
        if retiring {
            if let Some(w) = w {
                grid.pending.insert(i, w.clone());
            }
            continue;
        }
        let kind = match (grid.slots[i].as_mut(), w) {
            (None, Some(_)) => Some(Kind::Add),
            (Some(_), None) => Some(Kind::Clear),
            (Some(cur), Some(w)) => {
                if same_text(cur, w) {
                    cur.colour = colour_of(w);
                    cur.ncd = ncd_of(w);
                    cur.lane = lane_of(w);
                    cur.why = why_of(w);
                    None
                } else {
                    Some(Kind::Replace)
                }
            }
            (None, None) => None,
        };
        if let Some(kind) = kind {
            grid.queue.push(Queued { kind, slot: i, cell: w.cloned() });
        }
    }
    tick(cfg, grid, now_ms);
}

pub fn opacity(cfg: &HudConfig, cell: Option<&Cell>, now_ms: u64) -> f64 {
    let Some(c) = cell else { return 0.0 };
    if let Some(r) = c.retire_at {
        return (1.0 - (now_ms as f64 - r as f64) / cfg.fade_out_ms as f64).max(0.0);
    }
    ((now_ms as f64 - c.shown_at as f64) / cfg.fade_in_ms as f64).clamp(0.0, 1.0)
}

fn live(grid: &Grid, n: usize) -> Option<&Cell> {
    grid.slots.get(n).and_then(|c| c.as_ref()).filter(|c| c.retire_at.is_none())
}
fn is_live(grid: &Grid, n: usize) -> bool {
    live(grid, n).is_some()
}

pub fn select(cfg: &HudConfig, grid: &mut Grid, n: usize, now_ms: u64) -> Value {
    tick(cfg, grid, now_ms);
    if !is_live(grid, n) {
        return json!({ "ok": false, "reason": "empty" });
    }
    let colour = grid.slots[n].as_ref().map(|c| c.colour.clone()).unwrap_or_default();
    match colour.as_str() {
        "green" => {
            let c = grid.slots[n].as_mut().unwrap();
            c.register = Some("R2".into());
            c.locked = true;
            json!({ "ok": true, "action": "deepen", "register": "R2" })
        }
        "amber" => {
            let c = grid.slots[n].as_mut().unwrap();
            let dropped = std::mem::take(&mut c.alternatives);
            c.locked = true;
            json!({ "ok": true, "action": "choose", "dropped": dropped })
        }
        "red" => {
            grid.defending = Some(n);
            json!({ "ok": true, "action": "defend", "open": true })
        }
        _ => json!({ "ok": false, "reason": "unmeasured" }),
    }
}

pub fn defend(cfg: &HudConfig, grid: &mut Grid, n: usize, sentence: &str, now_ms: u64) -> Value {
    tick(cfg, grid, now_ms);
    let s = sentence.split_whitespace().collect::<Vec<_>>().join(" ");
    if !live(grid, n).is_some_and(|c| c.colour == "red") {
        return json!({ "ok": false, "reason": "not-red" });
    }
    if s.is_empty() {
        return json!({ "ok": false, "reason": "needs-sentence" });
    }
    grid.defences.insert(n, Defence { sentence: s.clone(), at_ms: now_ms });
    let c = grid.slots[n].as_mut().unwrap();
    c.defended = true;
    c.locked = true;
    if grid.defending == Some(n) {
        grid.defending = None;
    }
    json!({ "ok": true, "sentence": s })
}

pub fn archetype(grid: &Grid) -> Archetype {
    let cs: Vec<&Cell> = grid.slots.iter().flatten().filter(|c| c.retire_at.is_none()).collect();
    let mut k = Counts { green: 0, amber: 0, red: 0, unmeasured: 0 };
    for c in &cs {
        match c.colour.as_str() {
            "green" => k.green += 1,
            "amber" => k.amber += 1,
            "red" => k.red += 1,
            _ => k.unmeasured += 1,
        }
    }
    let name = if !cs.is_empty() && k.green as usize == cs.len() {
        Some(("Electrician", "⚡"))
    } else if k.red > k.green && k.red > k.amber {
        Some(("Demolisher", "🔨"))
    } else if k.red == 0 && k.green > 0 && k.amber > 0 {
        Some(("Plumber", "🔧"))
    } else {
        None
    };
    match name {
        None => Archetype { name: "Unclassified".into(), emoji: "⚪".into(), counts: k, holds_freeze: false },
        Some((n, e)) => {
            let undefended = cs.iter().filter(|c| c.colour == "red" && !c.defended).count();
            Archetype { name: n.into(), emoji: e.into(), counts: k, holds_freeze: n == "Demolisher" && undefended > 0 }
        }
    }
}

/// the /steer dictation, or None while a Demolisher still holds the freeze
pub fn freeze_text(grid: &Grid) -> Option<String> {
    let a = archetype(grid);
    if a.holds_freeze {
        return None;
    }
    let mut locked = vec![];
    let mut defs = vec![];
    for (i, c) in grid.slots.iter().enumerate() {
        if let Some(c) = c {
            if c.locked {
                locked.push(format!("{} · {} · {}", c.strategy, c.tactics, c.operations));
            }
        }
        if let Some(d) = grid.defences.get(&i) {
            defs.push(d.sentence.clone());
        }
    }
    let l = if locked.is_empty() { "none".to_string() } else { locked.join(" | ") };
    let d = if defs.is_empty() { "none".to_string() } else { defs.join(" | ") };
    Some(format!("ARCHETYPE: {} {}\nLOCKED (A·C·B): {}\nDEFENCES: {}\nWINDOW: {}", a.emoji, a.name, l, d, grid.window_text))
}

/// C742 the LLM door's context line: read-only over the frozen grid state
pub fn ask_line(grid: &Grid) -> String {
    let a = archetype(grid);
    let mut locked = vec![];
    let mut n = 0;
    for (i, c) in grid.slots.iter().enumerate() {
        if let Some(c) = c {
            if c.locked {
                locked.push(format!("{}·{}", c.strategy, c.operations));
            }
        }
        if grid.defences.contains_key(&i) {
            n += 1;
        }
    }
    format!("HUD: archetype {} · locked {} · defences {}", a.name, if locked.is_empty() { "none".to_string() } else { locked.join(", ") }, n)
}

// ── C739 the health strip: a pure formatter over receipts the host read. It computes nothing. ───────────────────────
fn short(v: Option<&Value>) -> String {
    match v {
        Some(v) if truthy(v) => js_str(v).chars().take(8).collect(),
        _ => "—".to_string(),
    }
}
fn num(v: Option<&Value>, d: usize) -> Option<String> {
    v.and_then(Value::as_f64).filter(|f| f.is_finite()).map(|f| format!("{:.*}", d, f))
}
fn or_str(v: Option<&Value>, dflt: &str) -> String {
    match v {
        Some(v) if truthy(v) => js_str(v),
        _ => dflt.to_string(),
    }
}
fn present(v: Option<&Value>) -> Option<&Value> {
    v.filter(|v| truthy(v))
}

pub fn health_lines(health: &Value) -> Vec<String> {
    let mut out = vec![];
    let w = present(health.get("walk"));
    let b = present(health.get("boundary"));
    let s = health.get("snowballs");
    let p = present(health.get("patent"));
    match w {
        None => out.push("WALK — UNMEASURED: no hud walk yet".to_string()),
        Some(w) if truthy(w.get("err").unwrap_or(&Value::Null)) || (w.get("sensor").and_then(Value::as_str) == Some("unmeasured") && !truthy(w.get("pixel").unwrap_or(&Value::Null))) => {
            out.push(format!("WALK — UNMEASURED: {} · aperture {}", or_str(w.get("err"), "the binary refused"), or_str(w.get("aperture_id"), "—")));
        }
        Some(w) => {
            let ms = match num(w.get("ms"), 1) {
                None => "ms UNMEASURED".to_string(),
                Some(m) => format!("{} ms", m),
            };
            out.push(format!("WALK — bin {} · reef {} · aperture {} · pixel {} · {}", short(w.get("bin_sha")), short(w.get("reef_sha")), or_str(w.get("aperture_id"), "—"), or_str(w.get("pixel"), "—"), ms));
        }
    }
    match b {
        None => out.push("L1 BOUNDARY — UNMEASURED: no boundary receipt on disk".to_string()),
        Some(b) => {
            let cr = num(b.get("control_ratio"), 3).unwrap_or_else(|| "UNMEASURED".into());
            let xr = num(b.get("crossing_ratio"), 3).unwrap_or_else(|| "UNMEASURED".into());
            let adm = if b.get("admissible") == Some(&Value::Bool(true)) { "ADMISSIBLE" } else { "NOT ADMISSIBLE" };
            out.push(format!("L1 BOUNDARY — control {} · crossing {} · {} · {} · {}", cr, xr, adm, or_str(b.get("date"), "date UNMEASURED"), or_str(b.get("machine"), "machine UNMEASURED")));
        }
    }
    let rows: Vec<&Value> = s.and_then(|s| s.get("rows")).and_then(Value::as_array).map(|a| a.iter().collect()).unwrap_or_default();
    if rows.is_empty() {
        out.push("SNOWBALLS — none yet".to_string());
    } else {
        let chars = |r: &Value| match r.get("chars") {
            None | Some(Value::Null) => "?".to_string(),
            Some(v) => js_str(v),
        };
        out.push(format!("SNOWBALLS — {} sent · brief chars {}", rows.len(), rows.iter().map(|r| chars(r)).collect::<Vec<_>>().join(", ")));
        for r in &rows {
            let at: String = or_str(r.get("at"), "?").chars().skip(11).take(8).collect();
            out.push(format!("  {} {} {} chars", at, or_str(r.get("label"), ""), chars(r)));
        }
    }
    match p.and_then(|p| present(p.get("line"))) {
        Some(l) => out.push(format!("PATENT MATH — {}", js_str(l))),
        None => out.push("PATENT MATH — UNMEASURED: CLAUDE.md canonical numbers not read".to_string()),
    }
    out
}

/// the one json object the page paints: grid state plus the derived reads
pub fn state_json(grid: &Grid) -> Value {
    serde_json::to_value(grid).unwrap_or(Value::Null)
}

// ── tests: the c734 cases, a fake clock, golden fixtures ────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn cell(slot: usize, o: Value) -> Value {
        let mut c = json!({ "slot": slot, "strategy": "long horizon", "tactics": "centre word", "operations": "src/a.ts", "colour": "green", "ncd": 0.1, "lane": "A2", "why": "w" });
        for (k, v) in o.as_object().cloned().unwrap_or_default() {
            c[k.as_str()] = v;
        }
        c
    }

    /// records every step with the full expected state, so the node guard can replay it through hud-core.js
    struct Rec {
        cfg: HudConfig,
        g: Grid,
        steps: Vec<Value>,
    }
    impl Rec {
        fn new() -> Rec {
            let cfg = HudConfig::default();
            let g = create_grid(&cfg);
            Rec { cfg, g, steps: vec![] }
        }
        fn push(&mut self, mut step: Value, result: Value) {
            step["expect"] = json!({ "result": result, "grid": state_json(&self.g), "archetype": archetype(&self.g),
                                      "freezeText": freeze_text(&self.g), "askLine": ask_line(&self.g) });
            self.steps.push(step);
        }
        fn apply(&mut self, cells: Vec<Value>, now: u64) {
            apply_reading(&self.cfg, &mut self.g, &cells, now);
            self.push(json!({ "op": "apply", "now": now, "cells": cells }), Value::Null);
        }
        fn tick(&mut self, now: u64) {
            tick(&self.cfg, &mut self.g, now);
            self.push(json!({ "op": "tick", "now": now }), Value::Null);
        }
        fn select(&mut self, n: usize, now: u64) -> Value {
            let r = select(&self.cfg, &mut self.g, n, now);
            self.push(json!({ "op": "select", "n": n, "now": now }), r.clone());
            r
        }
        fn defend(&mut self, n: usize, s: &str, now: u64) -> Value {
            let r = defend(&self.cfg, &mut self.g, n, s, now);
            self.push(json!({ "op": "defend", "n": n, "sentence": s, "now": now }), r.clone());
            r
        }
        fn window(&mut self, t: &str) {
            set_window_text(&mut self.g, t);
            self.push(json!({ "op": "window", "text": t }), Value::Null);
        }
        fn opacity(&mut self, n: usize, now: u64) -> f64 {
            let o = opacity(&self.cfg, self.g.slots[n].as_ref(), now);
            self.push(json!({ "op": "opacity", "n": n, "now": now }), json!(o));
            o
        }
        /// js replay builds the same literal cells; colours must be valid names
        fn seed(&mut self, colours: &[&str]) {
            let raws: Vec<Value> = colours.iter().enumerate().map(|(i, c)| cell(i, json!({ "colour": c }))).collect();
            for (i, r) in raws.iter().enumerate() {
                self.g.slots[i] = Some(make(r, 0));
            }
            self.push(json!({ "op": "seed", "cells": raws }), Value::Null);
        }
        fn emit(self, name: &str) {
            let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/hud-grid");
            std::fs::create_dir_all(&dir).unwrap();
            let body = serde_json::to_string_pretty(&json!({ "name": name, "steps": self.steps })).unwrap() + "\n";
            std::fs::write(dir.join(format!("{}.json", name)), body).unwrap();
        }
    }

    #[test]
    fn hud_grid_nine_fixed_slots_and_stacked_cell() {
        let mut r = Rec::new();
        assert_eq!(r.g.slots.len(), 9);
        r.apply(vec![cell(4, json!({}))], 0);
        let c = r.g.slots[4].as_ref().unwrap();
        assert_eq!((c.strategy.as_str(), c.tactics.as_str(), c.operations.as_str()), ("long horizon", "centre word", "src/a.ts"));
        r.emit("slots");
    }

    #[test]
    fn hud_grid_two_transitions_per_second_fifo() {
        let mut r = Rec::new();
        r.apply((0..4).map(|s| cell(s, json!({}))).collect(), 0);
        let on: Vec<bool> = r.g.slots.iter().take(4).map(|c| c.is_some()).collect();
        assert_eq!(on, vec![true, true, false, false]);
        r.tick(999);
        assert!(r.g.slots[2].is_none());
        r.tick(1000);
        assert!(r.g.slots[2].is_some() && r.g.slots[3].is_some() && r.g.slots[4].is_none());
        r.emit("fifo");
    }

    #[test]
    fn hud_grid_dwell_then_fade_out_in_place() {
        let mut r = Rec::new();
        r.apply(vec![cell(0, json!({}))], 0);
        r.apply(vec![], 2499);
        assert_eq!(r.g.slots[0].as_ref().unwrap().retire_at, None);
        r.tick(2500);
        assert_eq!(r.g.slots[0].as_ref().unwrap().retire_at, Some(2500));
        let o = r.opacity(0, 2750);
        assert!(o > 0.0 && o < 1.0);
        r.tick(2999);
        assert!(r.g.slots[0].is_some());
        r.tick(3000);
        assert!(r.g.slots[0].is_none());
        r.emit("dwell");
    }

    #[test]
    fn hud_grid_fade_in() {
        let mut r = Rec::new();
        r.apply(vec![cell(0, json!({}))], 100);
        assert_eq!(r.opacity(0, 100), 0.0);
        assert_eq!(r.opacity(0, 275), 0.5);
        assert_eq!(r.opacity(0, 450), 1.0);
        r.emit("fade-in");
    }

    #[test]
    fn hud_grid_fixed_anchoring_replacement_takes_same_slot() {
        let mut r = Rec::new();
        r.apply(vec![cell(0, json!({ "ncd": 0.9 })), cell(1, json!({ "ncd": 0.01 }))], 0);
        r.apply(vec![cell(0, json!({ "tactics": "other", "ncd": 0.9 })), cell(1, json!({ "ncd": 0.01 }))], 3000);
        assert_eq!(r.g.slots[0].as_ref().unwrap().retire_at, Some(3000));
        assert_eq!(r.g.slots[0].as_ref().unwrap().tactics, "centre word");
        r.tick(3500);
        assert_eq!(r.g.slots[0].as_ref().unwrap().tactics, "other");
        assert_eq!(r.g.slots[1].as_ref().unwrap().tactics, "centre word");
        r.emit("anchoring");
    }

    #[test]
    fn hud_grid_same_text_new_colour_repaints_in_place() {
        let mut r = Rec::new();
        r.apply(vec![cell(0, json!({}))], 0);
        r.apply(vec![cell(0, json!({ "colour": "red" }))], 10);
        assert_eq!(r.g.slots[0].as_ref().unwrap().colour, "red");
        assert_eq!(r.g.log.len(), 1);
        r.emit("repaint");
    }

    #[test]
    fn hud_grid_pills_cut_never_paraphrased() {
        let cfg = HudConfig::default();
        assert_eq!(pill(&cfg, "one two three four"), "one two three");
        assert_eq!(pill(&cfg, "abcdefghijklmnopqrstuvwxyz"), "abcdefghijklmno");
        assert!(pill(&cfg, "internationalization bureaucracy x").chars().count() < 16);
        assert_eq!(pill(&cfg, "short"), "short");
        let inputs = ["one two three four", "abcdefghijklmnopqrstuvwxyz", "internationalization bureaucracy x", "short", "", "   padded   words  here   ", "ab cdefghijklmn op"];
        let cases: Vec<Value> = inputs.iter().map(|i| json!({ "input": i, "out": pill(&cfg, i) })).collect();
        let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/hud-grid");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("pills.json"), serde_json::to_string_pretty(&json!({ "name": "pills", "pills": cases })).unwrap() + "\n").unwrap();
    }

    #[test]
    fn hud_grid_colour_only_from_the_reading() {
        let mut r = Rec::new();
        r.apply(vec![cell(0, json!({ "colour": "purple" })), cell(1, json!({ "colour": null, "ncd": 0.01 }))], 0);
        assert_eq!(r.g.slots[0].as_ref().unwrap().colour, "unmeasured");
        assert_eq!(r.g.slots[1].as_ref().unwrap().colour, "unmeasured");
        r.emit("colour");
    }

    #[test]
    fn hud_grid_select_green_amber_red() {
        let mut r = Rec::new();
        let amber = |_: ()| cell(1, json!({ "colour": "amber", "alternatives": ["x", "y"] }));
        r.apply(vec![cell(0, json!({})), amber(())], 0);
        r.tick(1);
        r.apply(vec![cell(0, json!({})), amber(()), cell(2, json!({ "colour": "red" }))], 1000);
        let a = r.select(0, 1000);
        assert_eq!(a["action"], "deepen");
        assert_eq!(r.g.slots[0].as_ref().unwrap().register.as_deref(), Some("R2"));
        let b = r.select(1, 1000);
        assert_eq!(b["action"], "choose");
        assert_eq!(b["dropped"], json!(["x", "y"]));
        assert!(r.g.slots[1].as_ref().unwrap().alternatives.is_empty());
        let c = r.select(2, 1000);
        assert_eq!(c["action"], "defend");
        assert_eq!(r.g.defending, Some(2));
        assert_eq!(r.select(8, 1000)["ok"], false);
        r.emit("select");
    }

    #[test]
    fn hud_grid_defend_needs_a_sentence() {
        let mut r = Rec::new();
        r.apply(vec![cell(0, json!({ "colour": "red" }))], 0);
        assert_eq!(r.defend(0, "   ", 5)["reason"], "needs-sentence");
        assert_eq!(r.defend(0, "The drift is on purpose.", 6)["ok"], true);
        assert_eq!(r.g.defences[&0].sentence, "The drift is on purpose.");
        assert!(r.g.slots[0].as_ref().unwrap().defended);
        assert_eq!(r.defend(1, "x", 7)["reason"], "not-red");
        r.emit("defend");
    }

    #[test]
    fn hud_grid_archetype() {
        let mut names = vec![];
        for (cols, name, emoji) in [
            (vec!["green", "green"], "Electrician", "⚡"),
            (vec!["green", "green", "amber"], "Plumber", "🔧"),
            (vec!["red", "red", "green", "amber"], "Demolisher", "🔨"),
        ] {
            let mut r = Rec::new();
            r.seed(&cols);
            let a = archetype(&r.g);
            assert_eq!((a.name.as_str(), a.emoji.as_str()), (name, emoji));
            r.emit(&format!("archetype-{}", name.to_lowercase()));
            names.push(name);
        }
        let mut r = Rec::new();
        r.tick(0);
        assert_eq!(archetype(&r.g).name, "Unclassified");
        r.emit("archetype-unclassified");
    }

    #[test]
    fn hud_grid_freeze_text_and_ask_line() {
        let mut r = Rec::new();
        r.apply(vec![cell(0, json!({ "colour": "red" })), cell(1, json!({ "colour": "red" })), cell(2, json!({}))], 0);
        r.window("the window text");
        assert_eq!(freeze_text(&r.g), None);
        r.defend(0, "first reason", 1);
        assert_eq!(freeze_text(&r.g), None);
        r.defend(1, "second reason", 2);
        r.tick(1000);
        r.select(2, 3);
        let t = freeze_text(&r.g).unwrap();
        assert!(t.contains("ARCHETYPE: 🔨 Demolisher"));
        assert!(t.contains("long horizon · centre word · src/a.ts"));
        assert!(t.contains("first reason | second reason"));
        assert!(t.contains("WINDOW: the window text"));
        assert_eq!(ask_line(&r.g), "HUD: archetype Demolisher · locked long horizon·src/a.ts, long horizon·src/a.ts, long horizon·src/a.ts · defences 2");
        r.emit("freeze");
    }

    #[test]
    fn hud_grid_config_is_read_not_literal() {
        let cfg = HudConfig { pill_words: 2, pill_chars: 5, dwell_ms: 10, slots: 4, ..HudConfig::default() };
        assert_eq!(pill(&cfg, "one two three"), "one t");
        let mut g = create_grid(&cfg);
        assert_eq!(g.slots.len(), 4);
        apply_reading(&cfg, &mut g, &[cell(0, json!({}))], 0);
        apply_reading(&cfg, &mut g, &[], 10);
        assert_eq!(g.slots[0].as_ref().unwrap().retire_at, Some(10));
        assert_eq!(HudConfig::default().transitions_per_s, 2);
    }

    #[test]
    fn hud_grid_health_lines() {
        let cases = vec![
            json!({}),
            json!({ "walk": { "err": "boom", "aperture_id": "a1" }, "boundary": null, "snowballs": { "rows": [] }, "patent": null }),
            json!({ "walk": { "bin_sha": "0123456789abcdef", "reef_sha": "fedcba9876543210", "aperture_id": "ap", "pixel": "r4c9", "ms": 12.34 },
                    "boundary": { "control_ratio": 1.23456, "crossing_ratio": 2.5, "admissible": true, "date": "2026-10-12", "machine": "box" },
                    "snowballs": { "rows": [ { "at": "2026-10-12T10:11:12Z", "label": "one", "chars": 120 }, { "at": null, "label": "", "chars": null } ] },
                    "patent": { "line": "k_E 0.003" } }),
            json!({ "walk": { "sensor": "unmeasured" }, "boundary": { "admissible": false }, "patent": { "line": "" } }),
        ];
        let out: Vec<Value> = cases.iter().map(|h| json!({ "health": h, "lines": health_lines(h) })).collect();
        assert_eq!(health_lines(&cases[0])[0], "WALK — UNMEASURED: no hud walk yet");
        assert_eq!(health_lines(&cases[2])[0], "WALK — bin 01234567 · reef fedcba98 · aperture ap · pixel r4c9 · 12.3 ms");
        let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/hud-grid");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("health.json"), serde_json::to_string_pretty(&json!({ "name": "health", "health": out })).unwrap() + "\n").unwrap();
    }
}

// ── C750: property tests — the invariants of docs/specs/vna/HUD-FORMAL-METHODS.md over random event streams ────────────
// proptest drives readings, selects, defends, window text and ticks with a monotone fake clock; the checker watches the grid
// after every event. Layer: the crystal (a property of the machine, enumerated by sampling a finite event alphabet).
#[cfg(test)]
mod prop {
    use super::*;
    use proptest::prelude::*;

    #[derive(Clone, Debug)]
    enum Ev {
        Reading(Vec<(usize, u8, u8)>), // (slot, text variant, colour index)
        Select(usize),
        Defend(usize, bool), // slot, non-empty sentence
        Window(u8),
        Tick,
    }

    const COLOURS: [&str; 4] = ["green", "amber", "red", "unmeasured"];

    fn ev() -> impl Strategy<Value = (u64, Ev)> {
        let reading = proptest::collection::vec((0usize..9, 0u8..3, 0u8..4), 0..10).prop_map(Ev::Reading);
        let e = prop_oneof![
            4 => reading,
            2 => (0usize..9).prop_map(Ev::Select),
            2 => (0usize..9, any::<bool>()).prop_map(|(n, b)| Ev::Defend(n, b)),
            1 => (0u8..4).prop_map(Ev::Window),
            4 => Just(Ev::Tick),
        ];
        (0u64..900, e) // dt in ms since the previous event: the clock is monotone by construction
    }

    fn raw(slot: usize, variant: u8, colour: u8) -> Value {
        json!({ "slot": slot, "strategy": format!("s{}", variant), "tactics": "t", "operations": format!("op{}-{}", slot, variant),
                "colour": COLOURS[colour as usize % 4], "ncd": 0.1, "lane": "A2", "why": "w" })
    }

    /// everything the checker remembers between events
    struct Watch {
        seen: BTreeMap<u64, usize>,                  // transition time -> how many were logged at that ms
        prev: Vec<Option<(u64, String, String, String)>>, // per slot: (shown_at, strategy, tactics, operations)
    }
    impl Watch {
        fn new(cfg: &HudConfig) -> Watch {
            Watch { seen: BTreeMap::new(), prev: vec![None; cfg.slots] }
        }
        fn check(&mut self, cfg: &HudConfig, g: &Grid) -> Result<(), TestCaseError> {
            for t in &g.log {
                let n = g.log.iter().filter(|x| *x == t).count();
                let e = self.seen.entry(*t).or_insert(0);
                if n > *e { *e = n; }
            }
            // (1) slots never resort: a cell sits at its own slot index, and a cell that persists keeps its index
            for (i, c) in g.slots.iter().enumerate() {
                if let Some(c) = c {
                    prop_assert_eq!(c.slot, i, "cell {:?} sits at index {}", c.operations, i);
                    let key = (c.shown_at, c.strategy.clone(), c.tactics.clone(), c.operations.clone());
                    for (j, p) in self.prev.iter().enumerate() {
                        if j != i { prop_assert!(p.as_ref() != Some(&key), "cell moved from slot {} to {}", j, i); }
                    }
                }
            }
            self.prev = g.slots.iter().map(|c| c.as_ref().map(|c| (c.shown_at, c.strategy.clone(), c.tactics.clone(), c.operations.clone()))).collect();
            // (2) in any 1000 ms window at most transitions_per_s transitions
            let times: Vec<u64> = self.seen.iter().flat_map(|(t, n)| std::iter::repeat(*t).take(*n)).collect();
            for (i, a) in times.iter().enumerate() {
                let in_window = times[i..].iter().take_while(|b| **b < a + MS_PER_S).count();
                prop_assert!(in_window <= cfg.transitions_per_s as usize, "{} transitions in [{}, {})", in_window, a, a + MS_PER_S);
            }
            // (3) a shown cell is never cleared before shown_at + dwell_ms
            for c in g.slots.iter().flatten() {
                if let Some(r) = c.retire_at {
                    prop_assert!(r >= c.shown_at + cfg.dwell_ms, "cleared at {} but shown at {} (dwell {})", r, c.shown_at, cfg.dwell_ms);
                }
            }
            // (4) a Demolisher never freezes undefended
            let a = archetype(g);
            let undefended_red = g.slots.iter().flatten().any(|c| c.retire_at.is_none() && c.colour == "red" && !c.defended);
            if a.name == "Demolisher" && undefended_red {
                prop_assert!(freeze_text(g).is_none(), "freeze_text spoke over an undefended red cell");
            }
            // (5) the grid JSON round-trips with the same keys
            let v = state_json(g);
            let keys: Vec<&str> = v.as_object().unwrap().keys().map(String::as_str).collect();
            prop_assert_eq!(keys, vec!["defences", "defending", "log", "pending", "queue", "slots", "windowText"]);
            let back: Value = serde_json::from_str(&serde_json::to_string(&v).unwrap()).unwrap();
            prop_assert_eq!(&back, &v);
            prop_assert_eq!(v["slots"].as_array().unwrap().len(), cfg.slots);
            Ok(())
        }
    }

    fn run(events: &[(u64, Ev)]) -> Result<(), TestCaseError> {
        let cfg = HudConfig::default();
        let mut g = create_grid(&cfg);
        let mut w = Watch::new(&cfg);
        let mut now = 1000u64;
        for (dt, e) in events {
            now += dt;
            match e {
                Ev::Reading(cs) => { let cells: Vec<Value> = cs.iter().map(|(s, v, c)| raw(*s, *v, *c)).collect(); apply_reading(&cfg, &mut g, &cells, now); }
                Ev::Select(n) => { select(&cfg, &mut g, *n, now); }
                Ev::Defend(n, ok) => { defend(&cfg, &mut g, *n, if *ok { "because the lane says so" } else { "  " }, now); }
                Ev::Window(k) => set_window_text(&mut g, &format!("window {}", k)),
                Ev::Tick => tick(&cfg, &mut g, now),
            }
            w.check(&cfg, &g)?;
        }
        Ok(())
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(400))]

        /// invariants 1-5: no resort, transition rate, dwell, the Demolisher freeze, the JSON shape
        #[test]
        fn invariants_hold_over_random_event_streams(events in proptest::collection::vec(ev(), 1..60)) {
            run(&events)?;
        }

        /// the walk never runs out of silence: with no further reading, 250 ms ticks drain the queue and every fade
        #[test]
        fn silence_drains_the_queue(events in proptest::collection::vec(ev(), 1..40)) {
            let cfg = HudConfig::default();
            let mut g = create_grid(&cfg);
            let mut now = 1000u64;
            for (dt, e) in &events {
                now += dt;
                match e {
                    Ev::Reading(cs) => { let cells: Vec<Value> = cs.iter().map(|(s, v, c)| raw(*s, *v, *c)).collect(); apply_reading(&cfg, &mut g, &cells, now); }
                    _ => tick(&cfg, &mut g, now),
                }
            }
            let bound = (g.queue.len() as u64 + 1) * (cfg.dwell_ms + MS_PER_S) + cfg.fade_out_ms * 2 + 500;
            let end = now + bound;
            while now < end { now += 250; tick(&cfg, &mut g, now); }
            prop_assert!(g.queue.is_empty(), "queue still holds {} after {} ms of silence", g.queue.len(), bound);
        }

        /// a cell that stays (same text, new colour) repaints in place: same slot, same shown_at, no transition logged
        #[test]
        fn a_stayer_keeps_its_slot_and_its_clock(slot in 0usize..9, v in 0u8..3, c1 in 0u8..4, c2 in 0u8..4, dt in 1u64..5000) {
            let cfg = HudConfig::default();
            let mut g = create_grid(&cfg);
            apply_reading(&cfg, &mut g, &[raw(slot, v, c1)], 1000);
            let shown = g.slots[slot].as_ref().unwrap().shown_at;
            let logged = g.log.len();
            apply_reading(&cfg, &mut g, &[raw(slot, v, c2)], 1000 + dt);
            let cell = g.slots[slot].as_ref().unwrap();
            prop_assert_eq!(cell.shown_at, shown);
            prop_assert_eq!(&cell.colour, &COLOURS[c2 as usize % 4].to_string());
            prop_assert!(g.log.len() <= logged);
        }
    }
}
