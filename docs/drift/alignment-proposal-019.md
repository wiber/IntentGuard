# Alignment Proposal #019 — Skills Inventory Staleness & Dual Entry Point .env Duplication Drift

**Date:** 2026-02-18
**Author:** Claude Opus 4.6 (Recursive Documentation Mode)
**Room:** 📐::architect | 🎯 A2 Strategy.Goal
**Drift Severity:** MEDIUM-HIGH
**Drift Percentage:** ~18% (spec stale on 2/11 module statuses + structural duplication)
**Patent Reference:** Appendix H — Geometric IAM (IAMFIM tensor overlap model)

---

## Executive Summary

Cross-referencing `intentguard-migration-spec.html` (v2.5.0, 27 sections) against `src/` reveals two compounding drift vectors:

1. **Skills Inventory Staleness** — The spec marks `thetasteer-categorize` and `tesseract-trainer` as `pending`, but both are fully implemented, tested, and registered by `wrapper.ts`. The spec also says "6 skill directories" but `wrapper.ts` registers 8 (and prints "8 registered" at line 613). The Module Migration Status section marks "Claude Flow Bridge" as `pending` but the skill exists at 732 LOC with 596 LOC tests.

2. **Dual Entry Point .env Duplication** — `wrapper.ts` and `runtime.ts` each contain identical `.env` loading blocks (lines 71-77 and 55-64 respectively). The spec explicitly flags "Merge wrapper.ts + runtime.ts into single entry point" as a Phase 3 `check-todo` item (line 1672). This duplication is the structural precondition for multiple downstream drift patterns.

---

## What the Spec Says

### Skills Inventory (Section: Skills Inventory, line 654)
| Skill | Spec Status | Actual Status |
|---|---|---|
| `voice-memo-reactor` | done | done ✅ |
| `claude-flow-bridge` | done | done ✅ |
| `llm-controller` | done | done ✅ |
| `system-control` | done | done ✅ |
| `thetasteer-categorize` | **pending** | **done** (183 LOC + tests) |
| `tesseract-trainer` | **pending** | **done** (registered in wrapper.ts) |
| `email-outbound` | done (in Registered Skills) | done ✅ |
| `night-shift` | done (in Registered Skills) | done ✅ |

### Registered Skills Count (Section: Wrapper Pattern, line 1560)
- **Spec says:** "Creates 6 skill directories"
- **Code does:** Registers 8 skill directories (lines 190-268 of `wrapper.ts`)
- **Console output says:** "8 registered (6 ported + 2 new)" (line 613)

### Module Migration Status (Section: Module Migration Status, line 185)
- **Claude Flow Bridge** marked `pending` (line 242) — actually `done` with comprehensive tests
- Stats bar: "complete: 2, building: 4, pending: 4, planned: 1" — at least 2 "pending" items are actually complete

### Entry Point Merge (Section: Integration Tasks, line 1672)
- **Spec says:** `check-todo` — "Merge wrapper.ts + runtime.ts into single entry point (Phase 3)"
- **Code does:** Two separate entry points, each with duplicated:
  - `.env` file loading (identical regex pattern)
  - `ROOT` path calculation
  - `fileURLToPath` + `dirname` boilerplate

---

## What the Code Does

### `src/wrapper.ts` (631 LOC)
- Implements 5-step Cortex+Body pattern correctly
- Registers 8 skills (not 6)
- Has own `.env` loader at lines 71-77
- Runs as `npx tsx src/wrapper.ts`

### `src/runtime.ts` (1815 LOC)
- Implements Discord-first runtime with full orchestration
- Has own `.env` loader at lines 55-64 (identical logic)
- Runs as `npx tsx src/runtime.ts`
- Does NOT call wrapper.ts — these are independent processes

### `src/skills/thetasteer-categorize.ts` (183+ LOC)
- Full implementation with Ollama backend, confidence tiers, 20-category mapping
- Has test file: `thetasteer-categorize.test.ts`
- Spec says "pending" — this is stale

---

## Concrete Patch

### Patch A: Update Spec Skill Statuses (Immediate, 0 risk)

In `intentguard-migration-spec.html`:

1. **Line ~720** — Change `thetasteer-categorize` badge from `badge-pending` to `badge-done`:
   ```html
   <!-- FROM -->
   <span class="badge badge-pending">pending</span>
   <!-- TO -->
   <span class="badge badge-done">✓ done</span>
   ```

2. **Line ~708** — Change `tesseract-trainer` badge from `badge-pending` to `badge-done`

3. **Line ~242** — Change Claude Flow Bridge from `badge-pending` to `badge-done`

4. **Line ~1560** — Update "6 skill directories" to "8 skill directories"

5. **Line ~187** — Update stats bar: `complete: 5, building: 2, pending: 2, planned: 1`

### Patch B: Extract Shared .env Loader (Phase 3 prerequisite)

Create `src/env.ts`:
```typescript
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadEnv(): void {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#]\w*)=(.*)$/);
    if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
```

Then replace the duplicated blocks in both `wrapper.ts` and `runtime.ts` with:
```typescript
import { ROOT, loadEnv } from './env.js';
loadEnv();
```

This is the **first domino** for the eventual single-entry-point merge.

---

## Domino Sequence (What Fires Together, Wires Together)

```
Patch A (spec accuracy)
    └─ Unblocks: accurate trust-debt scoring of skill coverage

Patch B (shared env.ts)
    └─ Unblocks: wrapper+runtime merge (Phase 3 check-todo)
        └─ Unblocks: single launchd service instead of two
            └─ Unblocks: unified WebSocket + Discord in same process
                └─ Unblocks: Claude Flow agent pool (50 concurrent) — Phase 9 check-todo
```

---

## Risk Assessment

| Patch | Risk | Blast Radius | Reversibility |
|---|---|---|---|
| A (spec HTML) | None | Documentation only | Git revert |
| B (env.ts extract) | Low | Import paths change | Git revert, no behavior change |

---

## Drift Signal

**k_E = 0.003 threshold check:** The spec-to-code divergence on skill statuses (2 modules marked pending that are done) and the count mismatch (6 vs 8) creates a ~18% drift in the Module Migration Status section. This exceeds the 0.003 per-operation threshold when accumulated across the 11 modules tracked, suggesting the spec HTML needs a reconciliation pass.

The `.env` duplication is not a drift in behavior but a structural debt that compounds: every new entry point (e.g., `ceo-loop.ts` at line 44-50 has the same pattern) copies the same block, increasing the surface area for divergent behavior if the `.env` parsing logic ever needs to change.
