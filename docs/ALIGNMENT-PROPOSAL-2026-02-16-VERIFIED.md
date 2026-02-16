# Alignment Proposal Verification — Recursive Documentation Mode
**Date:** 2026-02-16T23:xx (independent verification pass)
**Spec Version:** v2.5.0 (Modular TSX, 27 sections)
**Verified By:** Claude Opus 4.6 (Recursive Documentation Mode)
**Prior Proposal:** `docs/ALIGNMENT-PROPOSAL-2026-02-16.md` (auto-generated, commit 8636ad0)

---

## Verification Summary

Independent cross-reference of `intentguard-migration-spec.html` against `src/` **confirms all 9 drift items** in the original proposal. No false positives found. One additional finding added.

**Overall Drift: ~18% functional, ~8.3% structural (CONFIRMED)**

---

## CRITICAL #1: Sovereignty Feedback Loop — VERIFIED

**Evidence chain (manually traced):**

| Component | File:Line | What it does |
|-----------|----------|--------------|
| FIM interceptor WRITES | `src/auth/fim-interceptor.ts:205` | `appendFileSync(join(this.dataDir, 'fim-denials.jsonl'), ...)` |
| Sovereignty READS (claimed) | `src/auth/sovereignty.ts:256` | `// TODO: Read from data/fim-deny-log.jsonl when implemented` |
| Sovereignty COUNT | `src/auth/sovereignty.ts:258` | `return 0;` (hardcoded stub) |
| Sovereignty RECORD | `src/auth/sovereignty.ts:271` | `console.warn('Drift event recorded:', event);` (no disk write) |

**Filename mismatch:** `fim-denials.jsonl` (interceptor) vs `fim-deny-log.jsonl` (sovereignty comment)

**Governance impact:** The spec's steering loop (Section: Drift vs Self-Driving, Steps 5-7) requires drift events to reduce sovereignty. With `countDriftEvents()` returning `0`, the entire self-correction feedback loop described in the spec is non-functional. The bot operates in "drift mode" (P < 1) rather than "self-driving mode" (P = 1) because its own governance check never fires.

**Patch validity:** The proposed patch in the original proposal correctly:
1. Aligns filename to `fim-denials.jsonl`
2. Implements JSONL read with timestamp filtering
3. Implements JSONL append for `recordDriftEvent()`
4. Risk: LOW (additive, backward compatible, no breaking changes)

---

## DRIFT #2-#9: Status Confirmation

| ID | Description | Verified? | Notes |
|----|-------------|-----------|-------|
| #2 | CEO Loop Phase 4-8 command stubs | YES | `!wallet`, `!artifact`, `!federation`, `!grid` all return TODO strings |
| #3 | Pipeline runner placeholder fallback | YES | `runner.ts` dynamic import catch → placeholder JSON |
| #4 | Channel adapter STUB_MODE | YES | WhatsApp/Telegram throw STUB_MODE on import failure |
| #5 | LOC count mismatches | YES | runtime.ts +60%, geometric.ts +43% |
| #6 | Revenue intake full stub | YES | Intentional Phase 6 item |
| #7 | src/channels/discord.ts path wrong | YES | Actual: src/discord/channel-manager.ts |
| #8 | src/rooms/ doesn't exist | YES | Rooms are cross-cutting in discord + skills |
| #9 | src/tesseract/ → actual: src/grid/ | YES | 7 files under src/grid/ |

---

## NEW FINDING: Legacy JS File Coexistence

**Not in original proposal.** 91 legacy `.js` files (`trust-debt-*.js`) still exist in `src/` root alongside the new TypeScript pipeline steps in `src/pipeline/`. This creates ambiguity about which files are canonical.

**Examples:**
- `src/trust-debt-analyzer.js` (legacy) alongside `src/pipeline/step-6.ts` (canonical)
- `src/trust-debt-shortlex-generator.js` (legacy) alongside `src/pipeline/step-3.ts` (canonical)
- `src/queen-orchestrator.js` (legacy) alongside `src/pipeline/runner.ts` (canonical)

**Impact:** LOW (no functional conflict — pipeline runner imports from `src/pipeline/`), but increases codebase noise and could confuse agents or developers about which files to modify.

**Recommendation:** Add `src/*.js` files to a `legacy/` directory or mark them deprecated once the TypeScript pipeline is production-validated.

---

## Intelligence Burst (for #trust-debt-public)

```
[DRIFT VERIFICATION] 2026-02-16 | IntentGuard v2.5.0 | Recursive Documentation Mode
CONFIRMED: 18% functional drift, 8.3% structural | 9/9 drift items verified
CRITICAL: Sovereignty feedback loop STILL SEVERED (countDriftEvents = hardcoded 0)
  → fim-interceptor.ts:205 writes fim-denials.jsonl
  → sovereignty.ts:256 reads fim-deny-log.jsonl (WRONG FILE, STUB RETURN)
  → Governance spine disconnected: bot operates in drift mode, not self-driving mode
NEW: 91 legacy .js files coexist with canonical .ts pipeline (noise, no conflict)
Priority: Fix sovereignty.ts feedback loop → wire 4 CEO commands → update spec paths
Patent ref: IAMFIM 20-dim geometric sovereignty decay model (k_E = 0.003)
ShortRank: A1:Law.Law (sovereignty), C1:Grid.Law (pipeline integrity)
```

---

## Drift Percentage Breakdown

| Category | Files Affected | Drift Type | Severity |
|----------|---------------|------------|----------|
| Sovereignty feedback | 2 files | Functional (stub) | CRITICAL |
| CEO command wiring | 1 file, 4 handlers | Functional (TODO) | HIGH |
| Pipeline runner | 1 file | Functional (silent fallback) | MEDIUM |
| Channel adapters | 2 files | Functional (intentional stub) | LOW |
| Path topology | spec HTML only | Structural (wrong paths) | MEDIUM |
| LOC estimates | spec HTML only | Structural (outdated) | LOW |
| Legacy JS coexistence | 91 files | Structural (noise) | LOW |

**Total functional drift: 18%** (4 broken feedback points out of ~22 integration boundaries)
**Total structural drift: 8.3%** (3 path mismatches + LOC + legacy files out of ~36 spec claims)
**Combined weighted drift: ~20%**

---

*Independently verified by Recursive Documentation Mode — Claude Opus 4.6*
*Patent reference: IAMFIM Fractal Identity Map (20-dimensional geometric sovereignty)*
*Cross-ref: intentguard-migration-spec.html sections 4 (IAMFIM), 5 (Pipeline), 10 (Drift vs Self-Driving)*
