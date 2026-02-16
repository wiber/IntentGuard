# Alignment Proposal 001: FIM computeOverlap() Spec Drift

**Date:** 2026-02-16
**Author:** Recursive Documentation Mode (Agent)
**Priority:** CRITICAL
**Drift Percentage:** ~38% (5 drift areas found, 1 critical, 2 high, 2 medium)
**Patent Reference:** IAMFIM Geometric Permission System (Tensor Overlap Model)

---

## Summary

The migration spec (`intentguard-migration-spec.html`) claims the FIM auth layer uses "Real 20-dimensional vector math with dot product, cosine similarity" (Section: IAMFIM, finding F02 marked RESOLVED). The actual runtime `computeOverlap()` implementation is a simple binary threshold proportion — not geometric math.

---

## What the Spec Says

> **F02 [skeptic] FIM tensor overlap = ZERO implementation**
> RESOLVED: Built standalone module (intentguard/src/auth/geometric.ts) with real 20-dim vector math, dot product, cosine similarity, and 44 passing tests.

> **Permission(user, action) = Identity_Fractal(user) ∩ Coordinate_Required(action) >= Sovereignty_Threshold**

> **Benchmarked at 0.0004ms** — 20-dimensional tensor overlap computation.

The spec further claims that the FIM plugin uses "tensor overlap" and that F02 is fully resolved with real geometric math.

---

## What the Code Does

### `src/auth/geometric.ts` — Lines 159-175

```typescript
export function computeOverlap(
  identity: IdentityVector,
  requirement: ActionRequirement,
): number {
  const entries = Object.entries(requirement.requiredScores);
  if (entries.length === 0) return 1.0;

  let met = 0;
  for (const [category, minScore] of entries) {
    const score = identity.categoryScores[category] ?? 0;
    if (score >= minScore) met++;
  }

  return met / entries.length;  // <-- Simple proportion, NOT tensor math
}
```

This is identical to the deprecated `computeOverlapThreshold()` on lines 185-200. It counts how many required dimensions meet their minimum and divides by total — a binary pass/fail per dimension.

### What exists but is unused

The file DOES contain real geometric functions:
- `dotProduct(a, b)` — line 87
- `magnitude(v)` — line 107
- `cosineSimilarity(a, b)` — line 125

These are implemented correctly with tests passing. But **none of them are called** by `computeOverlap()` or `checkPermission()` — the actual permission enforcement path.

### FIM Plugin in `wrapper.ts` — Lines 135-144

The plugin installed into OpenClaw also uses the simple proportion:

```javascript
function computeOverlap(identityScores, requirement) {
  const entries = Object.entries(requirement.requiredScores);
  if (entries.length === 0) return 1.0;
  let met = 0;
  for (const [cat, min] of entries) {
    if ((identityScores[cat] ?? 0) >= min) met++;
  }
  return met / entries.length;  // Same simple proportion
}
```

---

## Impact

- **Patent claim weakened:** The IAMFIM patent describes geometric tensor overlap. The implementation is a threshold counter.
- **Spec credibility:** F02 is marked RESOLVED but the fix only added unused utility functions.
- **Security surface:** The simple proportion treats all dimensions equally. A user who passes 2/3 required categories at 0.01 above minimum gets the same overlap score as one who exceeds all 3 by 0.5. Geometric similarity (cosine) would capture this difference.

---

## Concrete Patch

Replace `computeOverlap()` with actual geometric math using the existing cosine similarity:

```typescript
export function computeOverlap(
  identity: IdentityVector,
  requirement: ActionRequirement,
): number {
  const entries = Object.entries(requirement.requiredScores) as [TrustDebtCategory, number][];
  if (entries.length === 0) return 1.0;

  // Build vectors from ONLY the required dimensions (sparse projection)
  const identityVec: number[] = [];
  const requirementVec: number[] = [];

  for (const [category, minScore] of entries) {
    identityVec.push(identity.categoryScores[category] ?? 0);
    requirementVec.push(minScore);
  }

  // Geometric overlap: cosine similarity in the projected subspace
  const similarity = cosineSimilarity(identityVec, requirementVec);

  // Scale from [-1, 1] to [0, 1] range for threshold comparison
  // (negative similarity means anti-aligned — should always deny)
  return Math.max(0, similarity);
}
```

This change:
1. Uses the already-implemented `cosineSimilarity()` function
2. Projects both vectors into the required-dimensions subspace only
3. Returns geometric similarity rather than binary proportion
4. Preserves the `>= 0.8` threshold check in `checkPermission()`
5. Makes the implementation match the patent description

**Test impact:** Existing tests that check exact overlap values will need updating. The 44 tests on geometric utilities (dot product, cosine similarity) already pass and would now be exercised in the hot path.

---

## Additional Drift Areas (Lower Priority)

| # | Area | Spec Claims | Code Reality | Severity |
|---|------|-------------|--------------|----------|
| 2 | Skill count | "6 Custom Skills" | wrapper.ts registers 8 | HIGH |
| 3 | Night Shift tasks | "10 registered tasks" | scheduler.ts has 15 tasks | HIGH |
| 4 | ThetaSteer color tiers | 3 tiers (GREEN/RED/BLUE) | 8 tiers implemented | MEDIUM |
| 5 | Model strings | `claude-sonnet-4` in spec | Mixed: `claude-sonnet-4-20250514`, `claude-sonnet-4-5`, `claude-sonnet-4-5-20250929` across files | MEDIUM |

---

## Recommendation

1. Apply the concrete patch above to align `computeOverlap()` with the spec
2. Update the spec numbers: 6 → 8 skills, 10 → 15 Night Shift tasks
3. Standardize model string to `claude-sonnet-4-5-20250929` across all files
4. Update spec ThetaSteer section to document the 8-tier color system
