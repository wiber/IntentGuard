# Dense Matrix Strategy - Getting IntentGuard Categories Right

## The Current Problem

**Matrix is too sparse**: 25 categories but most cells show "-" (empty)
**Wrong categories**: Using generic categories instead of IntentGuard-specific themes
**Poor co-occurrence**: Algorithm expects categories mentioned together, but our docs are specialized

## What IntentGuard Docs Actually Contain

Based on analyzing the 43 documentation files:

### High-Frequency Themes (Dense Clusters)
1. **Trust Debt Algorithms** - matrix, asymmetric, calculation, formula (appears in 15+ docs)
2. **Business Strategy** - enterprise, patent, market, revenue (appears in 12+ docs)
3. **Implementation Tools** - cli, npm, package, tool (appears in 8+ docs)
4. **Visual Reports** - html, visual, chart, dashboard (appears in 10+ docs)

### The Co-occurrence Problem
- **Current Logic**: "Does doc mention BOTH Algorithm AND Business?" (sparse - few docs do)
- **Better Logic**: "How much Algorithm content vs Business content in each doc?" (dense - every doc has some ratio)

## Dense Matrix Design (4×4 = 16 cells)

### Categories That Match Content
```json
{
  "T💎": "TrustDebtCore", 
  "B🏢": "BusinessLayer",
  "I🛠": "Implementation", 
  "V📊": "Visualization"
}
```

### Why This Works
- **T💎**: Captures trust, debt, algorithm, matrix, calculation (core technical)
- **B🏢**: Captures business, enterprise, patent, strategy, market (commercial)  
- **I🛠**: Captures cli, npm, package, tool, command (practical)
- **V📊**: Captures html, visual, chart, report, dashboard (output)

### Expected Dense Matrix
```
       T💎   B🏢   I🛠   V📊
T💎   [42]  [18]  [25]  [31]  <- Algorithm docs mention business strategy, implementation, visualization
B🏢   [15]  [38]  [12]  [8]   <- Business docs mention technical foundation, some tools
I🛠   [22]  [7]   [29]  [16]  <- CLI docs mention algorithms, minimal business, heavy visualization
V📊   [28]  [4]   [19]  [35]  <- HTML docs mention algorithms, minimal business, moderate tools
```

## Implementation Plan

1. **Replace Categories**: Use 4 content-matched categories
2. **Fix Co-occurrence**: Count semantic density instead of boolean co-occurrence  
3. **Normalize Scales**: Ensure Intent and Reality use equivalent measurement
4. **Test Dense Output**: Should see most cells with 5-50 units (not empty)

## Expected Outcome

- **Dense Matrix**: 16 cells, most with 5-50 units
- **Meaningful Asymmetry**: 2-5x ratio (reasonable for active project)
- **Clear Patterns**: Algorithm-heavy upper triangle, Business-heavy lower triangle
- **Professional Demo**: Shows IntentGuard measuring real semantic relationships