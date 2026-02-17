# Alignment Proposal: Recursive Verification — Drift Persistence Audit

**Date:** 2026-02-17 (Late Session)
**Analyst:** Claude Opus 4.6 (Recursive Documentation Mode — Verification Pass)
**Prior Proposals:** ALIGNMENT-PROPOSAL-001-FIM-OVERLAP.md (2026-02-16), ALIGNMENT-PROPOSAL-2026-02-17-comprehensive.md
**Drift Percentage:** ~38% (unchanged from 2026-02-16 — zero prior patches applied)
**Patent Reference:** IAMFIM Fractal Identity Map — Appendix H, 20-dimensional tensor overlap model

---

## Purpose

This is a **recursive verification pass** — checking whether drift identified in previous proposals was addressed. Finding: **none of the prior critical/high patches have been applied**. The same drift documented on 2026-02-16 persists unchanged on 2026-02-17.

---

## Verification Results

### DRIFT #1 (CRITICAL): `this.log` TypeError — STILL UNPATCHED

**File:** `src/runtime.ts:567`
**First Documented:** 2026-02-17 comprehensive proposal
**Status:** UNPATCHED

```typescript
// Line 567 — will throw TypeError at runtime
this.log.info(`Grid event emitted: ${gridEvent.cell} (${gridEvent.intersection})`);
// Should be: this.logger.info(...)
```

The class defines `private logger: Logger` (line 268) and uses `this.logger` throughout all 1,663 lines — except this one line. This crashes the happy path when a Claude Flow task completes and triggers a grid event.

**PATCH APPLIED IN THIS COMMIT** — see below.

---

### DRIFT #2 (CRITICAL): FIM computeOverlap() — STILL THRESHOLD, NOT COSINE

**File:** `src/auth/geometric.ts:159-175`
**First Documented:** 2026-02-16 (ALIGNMENT-PROPOSAL-001-FIM-OVERLAP.md)
**Status:** UNPATCHED (24+ hours since documentation)

The `cosineSimilarity()` function at line 125 remains dead code. The actual permission path (`checkPermission()` → `computeOverlap()`) still uses simple threshold proportion counting.

The spec claims: "Real 20-dim vector math with dot product, cosine similarity, and 44 passing tests."
The code comment says: "v0.1 — threshold-based overlap. Cosine similarity planned for v0.2."

**Impact on patent claim:** The IAMFIM patent describes geometric tensor overlap as the enforcement mechanism. The implementation is a threshold counter. This is the single largest spec-code divergence.

---

### DRIFT #3 (HIGH): file_delete Sovereignty Threshold Divergence — NEW FINDING

**Files:** `src/auth/geometric.ts:256` vs `src/wrapper.ts:130`
**Status:** Active internal inconsistency

| Source | reliability | security | minSovereignty |
|--------|-----------|----------|---------------|
| geometric.ts (DEFAULT_REQUIREMENTS) | 0.6 | 0.6 | **0.5** |
| wrapper.ts (FIM plugin) | 0.7 | 0.6 | **0.8** |

The wrapper.ts plugin (installed to `~/.openclaw/plugins/`) enforces stricter requirements than the TypeScript module. Depending on which path handles the permission check, `file_delete` may be allowed at sovereignty 0.5 (geometric.ts) or blocked until 0.8 (wrapper plugin).

**Recommended fix:** Align to the stricter values (0.8 sovereignty for file_delete).

---

### DRIFT #4 (MEDIUM): npm test → zero TypeScript tests — STILL UNPATCHED

**First Documented:** 2026-02-17 comprehensive proposal
**Status:** UNPATCHED

`package.json` "test" script still points to Jest configuration that looks for `tests/**/*.test.js`. All actual tests are TypeScript using Vitest in `src/`. Running `npm test` executes zero source tests.

---

## Patch Applied in This Commit

The CRITICAL `this.log` bug at runtime.ts:567 is fixed in this commit. The patch changes `this.log.info(...)` to `this.logger.info(...)` to match the class property name used everywhere else.

---

## Remaining Unpatched Drift (by priority)

1. **CRITICAL:** FIM `computeOverlap()` uses threshold counting, not cosine similarity
2. **HIGH:** `file_delete` sovereignty threshold inconsistency between geometric.ts and wrapper.ts
3. **HIGH:** wrapper.ts spec claims CEO loop + Night Shift but neither is wired there
4. **MEDIUM:** `npm test` runs zero TypeScript tests
5. **MEDIUM:** CEO loop auto-subdivider handles only 2 hardcoded patterns
6. **LOW:** Spec says "6 Custom Skills" but wrapper.ts registers 8

---

## Intelligence Burst — #trust-debt-public

```
RECURSIVE DRIFT VERIFICATION | 2026-02-17 Late | Opus 4.6
Prior proposals: 2 (2026-02-16, 2026-02-17)
Patches applied since documentation: 0 of 6
CRITICAL BUG FIXED: runtime.ts:567 this.log→this.logger (TypeError on task completion)
CRITICAL STILL OPEN: FIM gate is threshold-based, not cosine (IAMFIM patent ref: Appendix H)
NEW: file_delete sovereignty mismatch (geometric.ts 0.5 vs wrapper.ts 0.8)
Drift: 38% | Patch rate: 1/7 (this commit) | Ref: Appendix H — Geometric IAM
```
