# Trust Debt - The Correct Algorithm

## The Fundamental Misunderstanding

We've been thinking about this wrong. The algorithm should NOT be directly comparing Intent to Reality.

## What Trust Debt Actually Measures

**Trust Debt = How Intent maps to categories vs How Reality maps to categories**

The ShortLex categories are the **reference frame** - the orthogonal dimensions that subdivide the space.

## The Three Spaces

1. **Category Space**: The ShortLex orthogonal categories (A🚀, B🔒, C⚡, D🧠, E🎨 and their children)
2. **Intent Space**: What we document/promise 
3. **Reality Space**: What we actually build

## What the Matrix Should Show

Each cell [i,j] represents the intersection of category i with category j.

### Heat Map Interpretation

- **High value**: Strong activity at this category intersection
- **Low value**: Weak activity at this category intersection  
- **Zero**: No activity - this intersection isn't relevant to the project

### The Two Matrices

1. **Intent Matrix**: How Intent maps to the category space
   - Cell[i,j] = Cosine similarity of Intent with categories i×j
   - Shows what categories our documentation emphasizes

2. **Reality Matrix**: How Reality maps to the category space
   - Cell[i,j] = Cosine similarity of Reality with categories i×j
   - Shows what categories our implementation actually touches

## Trust Debt Calculation

```
For each cell [i,j]:
  Intent_heat = How much Intent aligns with category[i] × category[j]
  Reality_heat = How much Reality aligns with category[i] × category[j]
  
  Deviation = Intent_heat - Reality_heat
  
  If Deviation > 0: Intent emphasizes this more than Reality (broken promise)
  If Deviation < 0: Reality emphasizes this more than Intent (undocumented)
  If Deviation ≈ 0: Good alignment at this intersection
```

**Total Trust Debt = Sum of |Deviation| across all cells**

## Why This Matters

### Current (Wrong) Interpretation:
- "We promised feature X but didn't build it"
- "We built feature Y but didn't document it"

### Correct Interpretation:
- "Our Intent emphasizes category intersection X, but Reality doesn't"
- "Our Reality works in category intersection Y, but Intent doesn't mention it"

## The Key Insight

The categories are not just labels - they're **orthogonal dimensions** that define the space. Trust Debt measures how Intent and Reality each project onto this space, and where they differ.

### Example:

If cell [Performance, Security] is:
- **Hot in Intent Matrix**: Documentation talks about performance-security tradeoffs
- **Cold in Reality Matrix**: Code doesn't actually implement performance-security features
- **Trust Debt**: The mismatch between talking about it and doing it

If cell [Speed, Intelligence] is:
- **Cold in Intent Matrix**: Documentation doesn't mention speed-intelligence relationships
- **Hot in Reality Matrix**: Code heavily optimizes intelligent algorithms for speed
- **Trust Debt**: We're doing this work but not documenting it

## What Cold Spots Mean

A cold spot (low values in BOTH matrices) means:
- Intent doesn't mention this category intersection
- Reality doesn't implement this category intersection
- **This is FINE** - not all intersections are relevant

Trust Debt only occurs when there's a MISMATCH - one is hot while the other is cold.

## The Asymmetry

The matrix is asymmetric because categories can interact differently:
- [Performance → Security] might be different from [Security → Performance]
- The first asks "How does performance affect security?"
- The second asks "How does security affect performance?"

## Summary

**Trust Debt is NOT:**
- Direct comparison of Intent text to Reality text
- Counting promises vs implementations

**Trust Debt IS:**
- Measuring how Intent maps to the orthogonal category space
- Measuring how Reality maps to the same space
- Finding where these mappings diverge

The orthogonal categories are the ruler we measure against. Trust Debt is the difference in how Intent and Reality each align with that ruler.