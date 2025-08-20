# Trust Debt Analysis Prompts

## Current Analysis Focus (What We're Doing)
Currently, we're looking at diagonal cells (self-consistency) and reporting the top 5 highest debt values regardless of their position in the matrix.

## Ideal Analysis Focus (What We Should Be Doing)

### Primary Analysis Questions

#### 1. Off-Diagonal Asymmetry Detection
**Current Question**: "What are the highest Trust Debt values?"

**Better Question**: "Where are the strongest asymmetric patterns in off-diagonal cells where upper triangle significantly differs from lower triangle?"

**Ideal Prompt**:
```
Analyze the Trust Debt matrix focusing on:
1. Off-diagonal cells where |upper[i,j] - lower[j,i]| > 50 units
2. Identify cells where one triangle shows >100 units while the mirror cell shows <10 units
3. Explain what these asymmetries reveal about hidden dependencies or missed integrations
4. Prioritize by business impact, not just magnitude
```

#### 2. Cross-Category Integration Analysis
**Current Question**: "Which categories have drift?"

**Better Question**: "Which category pairs show unexpected coupling in Reality but not in Intent, or vice versa?"

**Ideal Prompt**:
```
Find category intersection patterns where:
1. Reality shows strong coupling (>80 units) but Intent shows none (<10 units)
   - This reveals undocumented architectural dependencies
2. Intent promises integration (>80 units) but Reality shows none (<10 units)  
   - This reveals broken architectural promises
3. Both are cold (<5 units each)
   - This reveals missed opportunities for valuable integrations
```

#### 3. Topographical Pattern Recognition
**Current Question**: "What's the total Trust Debt?"

**Better Question**: "What topographical patterns in the matrix reveal systemic architectural issues?"

**Ideal Prompt**:
```
Identify matrix topology patterns:
1. "Hot ridges": Rows or columns with consistently high values (>50 units)
   - Indicates over-coupled categories
2. "Cold valleys": Entire sub-matrices with all values <5 units
   - Indicates isolated or neglected category groups
3. "Asymmetric cliffs": Sharp transitions from hot to cold between triangles
   - Indicates major Intent-Reality disconnects
4. "Diagonal dominance": High diagonal, low off-diagonal
   - Indicates good orthogonality but poor integration
```

#### 4. Business Impact Prioritization
**Current Question**: "Which cells have the highest values?"

**Better Question**: "Which Trust Debt patterns have the highest business impact on insurability and performance?"

**Ideal Prompt**:
```
Prioritize Trust Debt findings by:
1. Impact on orthogonality (correlation >10% between categories)
   - Directly affects multiplicative performance gains
2. Impact on insurability (Grade D or worse patterns)
   - Blocks AI deployment
3. User-facing discrepancies (Intent > Reality by >100 units)
   - Creates expectation gaps
4. Hidden technical debt (Reality > Intent by >100 units)
   - Creates maintenance nightmares
```

## Example Analysis Output Format

### Instead of:
```
D🧠.3🔮 ↻ D🧠.3🔮: 199 units
Documentation mentions Prediction 73% of the time...
```

### We Want:
```
🚨 CRITICAL ASYMMETRY: Performance × Intelligence
Upper[A🚀, D🧠]: 156 units (Git shows heavy coupling)
Lower[D🧠, A🚀]: 8 units (Docs show no relationship)
Asymmetry Factor: 19.5x

IMPACT: Your performance optimizations are tightly coupled to intelligence systems, 
but documentation treats them as independent. This hidden dependency will cause:
- 🔥 Cascade failures when modifying either system
- 📉 30% performance loss from broken orthogonality
- ⚠️ Grade D insurability from undocumented coupling

ACTION: Either:
1. Decouple performance from intelligence in code (restore orthogonality)
2. Document the coupling and accept additive-only performance (M = S + E)
```

## Key Metrics to Extract

### Asymmetry Metrics
```javascript
// For each cell pair [i,j] and [j,i]
asymmetryFactor = max(upper[i,j], lower[j,i]) / max(min(upper[i,j], lower[j,i]), 1)
asymmetryDebt = |upper[i,j] - lower[j,i]|
asymmetryType = upper[i,j] > lower[j,i] ? "hidden-coupling" : "broken-promise"
```

### Orthogonality Impact
```javascript
// Categories should be independent
correlationPenalty = offDiagonalSum / diagonalSum
performanceMode = correlationPenalty < 0.1 ? "multiplicative" : "additive"
performanceLoss = correlationPenalty * potentialGains
```

### Business Priority Score
```javascript
priorityScore = (
    asymmetryDebt * 0.3 +           // Drift magnitude
    asymmetryFactor * 0.2 +         // Drift ratio
    orthogonalityImpact * 0.3 +     // Performance impact
    insurabilityImpact * 0.2        // Business impact
)
```

## Implementation in Code

To implement this improved analysis, modify the `worstDrifts` calculation to:

1. Focus on off-diagonal cells with high asymmetry
2. Calculate mirror cell comparisons
3. Group by pattern type (hidden coupling vs broken promise)
4. Sort by business impact, not just magnitude
5. Generate actionable narratives for each pattern type

## Sample Query for AI Analysis

```
Given this Trust Debt matrix where:
- Upper triangle = Git/Reality activity (what we built)
- Lower triangle = Docs/Intent activity (what we promised)
- Each cell [i,j] shows activity level 0-200 units

Find and explain:
1. The top 3 asymmetric patterns where |upper[i,j] - lower[j,i]| > 50
2. Any "cold valleys" where entire category groups show <5 units
3. Any "hot ridges" where one category couples with many others >50 units
4. The business impact of breaking orthogonality (correlation >10%)

For each finding, provide:
- Pattern type and severity
- Business impact in terms of performance and insurability
- Specific remediation action
- Expected improvement from fixing it
```

This approach will reveal the true architectural drift patterns that matter for the patent's orthogonality requirements and business insurability goals.