# Asymmetric Matrix Specification - CRITICAL BUG

## The Current Problem (WRONG)

We're currently building TWO separate matrices and comparing them:
1. **Intent Matrix**: How often category pairs co-occur in documentation
2. **Reality Matrix**: How often category pairs co-occur in code/commits
3. **Trust Debt**: |Intent[i,j] - Reality[i,j]|

This produces a SYMMETRIC matrix because:
- Intent[A,B] = Intent[B,A] (co-occurrence is symmetric)
- Reality[A,B] = Reality[B,A] (co-occurrence is symmetric)
- Therefore Debt[A,B] = Debt[B,A] (difference is symmetric)

**This is fundamentally wrong!**

## What We Should Be Doing (CORRECT)

The categories exist as an external reference frame. We should measure:

### Row Direction (Reality → Categories)
"What categories does our code/commits actually implement?"
- Aggregate ALL reality sources (code + commits) into one text
- For each category, calculate similarity to reality
- This gives us Reality vector: [0.2, 0.8, 0.1, 0.5, ...]

### Column Direction (Intent → Categories)  
"What categories does our documentation promise?"
- Aggregate ALL intent sources (docs) into one text
- For each category, calculate similarity to intent
- This gives us Intent vector: [0.7, 0.3, 0.9, 0.2, ...]

### The Asymmetric Matrix
```
Trust Debt[i,j] = Reality[i] × Intent[j] × DriftFunction(Reality[i], Intent[j])
```

This is ASYMMETRIC because:
- Cell[A,B] = "How much does Reality A drift from Intent B?"
- Cell[B,A] = "How much does Reality B drift from Intent A?"
- These are different questions with different answers!

## Correct Implementation

```javascript
// Step 1: Aggregate sources
const realityText = concatenate(all_source_code + all_commits);
const intentText = concatenate(all_documentation);

// Step 2: Calculate similarity vectors
const realityVector = [];
const intentVector = [];

categories.forEach(cat => {
    // Use actual cosine similarity or keyword density
    realityVector[cat.id] = cosineSimilarity(realityText, cat.keywords);
    intentVector[cat.id] = cosineSimilarity(intentText, cat.keywords);
});

// Step 3: Build asymmetric matrix
categories.forEach((cat1, i) => {
    categories.forEach((cat2, j) => {
        // Reality[i] → Intent[j] drift
        const realityStrength = realityVector[cat1.id];
        const intentStrength = intentVector[cat2.id];
        
        // Asymmetric calculation
        if (i < j) {
            // Upper triangle: Reality falls short of Intent
            debtMatrix[cat1.id][cat2.id] = calculateUnderdelivery(realityStrength, intentStrength);
        } else if (i > j) {
            // Lower triangle: Reality exceeds Intent (undocumented features)
            debtMatrix[cat1.id][cat2.id] = calculateOverdelivery(realityStrength, intentStrength);
        } else {
            // Diagonal: Self-consistency within category
            debtMatrix[cat1.id][cat2.id] = calculateSelfDrift(realityStrength, intentStrength);
        }
    });
});
```

## Why This Matters

### Current (Symmetric) Problems:
- Can't distinguish between "promised but not delivered" vs "delivered but not promised"
- Diagonal doesn't represent self-consistency correctly
- Upper/lower triangles are redundant

### Correct (Asymmetric) Benefits:
- Upper triangle: Broken promises (Intent > Reality)
- Lower triangle: Undocumented features (Reality > Intent)
- Diagonal: Category self-alignment
- Each cell has unique meaning

## Visual Example

### Current (WRONG):
```
     A    B    C
A   10   5    3
B   5    8    2
C   3    2    15
```
Note: Matrix is symmetric (5 appears in both A→B and B→A)

### Correct (RIGHT):
```
     A    B    C
A   10   7    2    (Reality A vs Intent A,B,C)
B   3    8    9    (Reality B vs Intent A,B,C)
C   4    1    15   (Reality C vs Intent A,B,C)
```
Note: Matrix is asymmetric (A→B=7 but B→A=3)

## Implementation Priority

1. **IMMEDIATE**: Document this in CLAUDE.md to prevent regression
2. **URGENT**: Rewrite analyzeContent to aggregate sources first
3. **CRITICAL**: Implement proper cosine similarity instead of co-occurrence
4. **IMPORTANT**: Make the visualization show asymmetry clearly

## Testing Asymmetry

To verify the fix works:
1. Check that `debtMatrix[A][B] !== debtMatrix[B][A]` for most pairs
2. Ensure upper triangle trends differently than lower triangle
3. Diagonal should show self-consistency, not just high values

---

**This is a fundamental architectural bug that affects the entire Trust Debt calculation.**