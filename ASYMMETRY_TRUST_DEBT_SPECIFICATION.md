# Asymmetry Trust Debt Specification

## The TRUE Trust Debt Metric

**Trust Debt = |Upper Triangle - Lower Triangle|**

This is the fundamental metric that measures the delta between intent and reality.

## What Each Triangle Represents

### Upper Triangle (i < j)
- **Meaning**: Broken Promises - things we documented but didn't implement
- **Example**: Documentation says "Performance optimization through caching" but code has no caching
- **Current Value**: 1408 units (we promise a lot)

### Lower Triangle (i > j)  
- **Meaning**: Undocumented Features - things we built but didn't document
- **Example**: Code has complex error handling but documentation doesn't mention it
- **Current Value**: 12 units (we document most of what we build)

### Diagonal (i = j)
- **Meaning**: Self-consistency within each category
- **Example**: How well "Security" documentation matches "Security" implementation
- **Current Value**: 303 units

## The Asymmetry Calculation

```javascript
// CRITICAL: This is the TRUE Trust Debt
const asymmetryDebt = Math.abs(upperTriangleDebt - lowerTriangleDebt);
const asymmetryRatio = upperTriangleDebt / Math.max(lowerTriangleDebt, 1);
```

## Why Asymmetry Matters

The asymmetry captures the **drift of intent delta reality**:

1. **High Upper Triangle**: We think about many tradeoffs (X and Y) in documentation
2. **Low Lower Triangle**: Our code doesn't touch most of what we promised
3. **The Delta**: This gap IS the Trust Debt - the change between what we intended and what exists

## Current State (DO NOT REGRESS)

```
📐 TRUE TRUST DEBT: 1396 units
Upper Triangle (Broken Promises): 1408 units  
Lower Triangle (Undocumented): 12 units
Asymmetry Ratio: 115.95x
```

This 115x ratio means we promise 115 times more than we deliver - a massive drift!

## Implementation Details

### How We Calculate Triangle Debts

```javascript
// In calculateTrustDebt()
if (i < j) {
    upperTriangleDebt += debt;  // Broken promises
} else if (i > j) {
    lowerTriangleDebt += debt;  // Undocumented features
}
```

### How We Display It

The HTML report now prominently shows:
1. **TRUE TRUST DEBT** as the main metric (the asymmetry)
2. Upper and Lower triangle values for context
3. Asymmetry ratio to show the imbalance direction

## Critical Non-Regression Requirements

1. **ALWAYS calculate asymmetryDebt** as |Upper - Lower|
2. **ALWAYS display it prominently** as the TRUE Trust Debt
3. **NEVER go back to using totalDebt** as the main metric
4. **MAINTAIN the triangle tracking** in calculateTrustDebt()

## Why This Is Right

As you said: "this is literally what drift relates to - the change of intent delta reality"

- When Upper > Lower: We're over-promising (typical for early projects)
- When Lower > Upper: We're under-documenting (typical for mature projects)
- When Upper ≈ Lower: Perfect balance (rare but ideal)

The absolute difference between triangles captures this drift perfectly.