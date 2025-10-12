# Delta Preparation Methodology: Intent vs Reality

## Overview

Trust Debt measurement compares **Intent** (what we promise in documentation) against **Reality** (what we actually implement) to calculate semantic drift.

## Core Concept

```
Trust Debt = |Intent - Reality|²

Where:
  Intent = Documentation promises and specifications
  Reality = Implementation activity measured through git commits
```

## Data Source Pipeline

### 1. Reality Data Collection

**Source**: Git commit history
**File**: `src/trust-debt-reality-intent-matrix.js:178-198`

```javascript
function getRecentCommits() {
    const commits = execSync('git log --since="7 days ago"')
        .split('\n')
        .map(line => ({
            hash: extractHash(line),
            message: extractMessage(line).toLowerCase()
        }));
    return commits;
}
```

**Configuration Options**:
- **Time Window**: Default 7 days, adjustable via `--since` parameter
- **Branch Filter**: Can limit to specific branches
- **Path Filter**: Can analyze specific directories only

**What Gets Measured**:
- Commit message content (converted to lowercase)
- Commit frequency per category
- Keyword matches in commit descriptions

### 2. Intent Data Collection

**Source**: Documentation files
**File**: `src/trust-debt-reality-intent-matrix.js:203-226`

```javascript
function loadDocumentation() {
    const intentSources = [
        { path: 'CLAUDE.md', weight: 20 },
        { path: 'docs/01-business/BUSINESS_PLAN.md', weight: 30 },
        { path: 'docs/patents/FIM_Patent_v16.txt', weight: 25 },
        { path: 'docs/03-product/MVP/commitMVP.txt', weight: 25 }
    ];

    return intentSources.map(source => {
        const content = fs.readFileSync(source.path, 'utf8')
            .toLowerCase()
            .substring(0, 50000); // Performance limit
        return { path: source.path, content, weight: source.weight };
    });
}
```

**Intent Source Types**:

1. **CLAUDE.md** (20% weight)
   - Project patterns and guidelines
   - Development rules and constraints
   - Architectural decisions

2. **Business Plans** (30% weight)
   - Strategic objectives and KPIs
   - Market positioning
   - Revenue models

3. **Patent Documents** (25% weight)
   - Technical specifications
   - Algorithmic claims
   - System architecture

4. **MVP Specifications** (25% weight)
   - Feature requirements
   - User stories
   - Implementation priorities

### 3. Keyword Similarity Calculation

**File**: `src/trust-debt-reality-intent-matrix.js:231-256`

```javascript
function calculateSimilarity(text, keywords) {
    // Count keyword matches
    const matches = {};
    let totalMatches = 0;

    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}`, 'gi');
        const count = (text.match(regex) || []).length;
        if (count > 0) {
            matches[keyword] = count;
            totalMatches += count;
        }
    });

    // Calculate normalized score (0-1)
    const foundKeywords = Object.keys(matches).length;
    const keywordCoverage = foundKeywords / keywords.length;
    const frequencyBoost = Math.min(1, totalMatches / (keywords.length * 2));

    return keywordCoverage * 0.7 + frequencyBoost * 0.3;
}
```

**Scoring Formula Breakdown**:

```
similarity = (keywordCoverage × 0.7) + (frequencyBoost × 0.3)

Where:
  keywordCoverage = unique_keywords_found / total_keywords
  frequencyBoost = min(1, total_matches / (keywords × 2))
```

**Why These Weights?**:
- **0.7 weight on coverage**: Prioritizes finding diverse keywords (breadth)
- **0.3 weight on frequency**: Rewards multiple mentions (depth)
- **Rationale**: Better to mention many concepts once than one concept many times

**Example**:
```javascript
Category: "Trust Measurement"
Keywords: ['trust', 'debt', 'measure', 'analyze', 'score']

Commit Message: "Add trust score calculator and analyze debt patterns"

Matches:
  'trust' → 1 match
  'score' → 1 match
  'analyze' → 1 match
  'debt' → 1 match
  Total: 4 keywords found, 4 total matches

Calculation:
  keywordCoverage = 4/5 = 0.80
  frequencyBoost = min(1, 4/(5×2)) = min(1, 0.40) = 0.40
  similarity = 0.80×0.7 + 0.40×0.3 = 0.56 + 0.12 = 0.68
```

### 4. Asymmetric Matrix Population

**File**: `agent3-matrix-calculation-engine.js:124-225`

The matrix is **asymmetric** to distinguish building activity from documentation activity.

```
Matrix Structure:

        Intent →
Reality │ A  B  C  D  E  F
   ↓    ├─────────────────
   A    │ =  ↑  ↑  ↑  ↑  ↑   ← Upper triangle
   B    │ ↓  =  ↑  ↑  ↑  ↑   ← (Reality emphasis)
   C    │ ↓  ↓  =  ↑  ↑  ↑
   D    │ ↓  ↓  ↓  =  ↑  ↑   ← Lower triangle
   E    │ ↓  ↓  ↓  ↓  =  ↑   ← (Intent emphasis)
   F    │ ↓  ↓  ↓  ↓  ↓  =
```

**Triangle Calculation Methods**:

```javascript
// Upper Triangle (i < j): Reality emphasis
if (isUpperTriangle) {
    const baseValue = 30 + (i + j) * 2;
    intentValue = baseValue * 0.7;        // Lower intent
    realityValue = baseValue * 1.5;       // Higher reality
}

// Lower Triangle (i > j): Intent emphasis
if (isLowerTriangle) {
    const baseValue = 25 + (i + j) * 1.5;
    intentValue = baseValue * 1.8;        // Higher intent
    realityValue = baseValue * 0.6;       // Lower reality
}

// Diagonal (i === j): Self-consistency
if (isDiagonal) {
    intentValue = categoryBaseline * 100;
    realityValue = categoryHealth * 100;
}
```

**Asymmetry Ratio**:
```
ratio = sum(upper_triangle) / sum(lower_triangle)

Healthy range: 1.2 - 2.0
  < 1.0 = Documenting more than building
  1.2-2.0 = Balanced development
  > 2.0 = Building without documentation
```

## Validation Methods

### 1. Diagonal Coherence Check

```javascript
function checkDiagonalCoherence(matrix) {
    const diagonalScores = [];
    for (let i = 0; i < matrix.length; i++) {
        diagonalScores.push(matrix[i][i].similarity);
    }

    const avgDiagonal = diagonalScores.reduce((a,b) => a+b) / diagonalScores.length;

    return {
        passed: avgDiagonal > 0.7,
        avgScore: avgDiagonal,
        threshold: 0.7,
        message: avgDiagonal > 0.7
            ? "Healthy self-consistency"
            : "Warning: Categories lack internal coherence"
    };
}
```

### 2. Zero Detection

```javascript
function detectUnexpectedZeros(matrix) {
    const zeros = [];

    matrix.forEach((row, i) => {
        row.forEach((cell, j) => {
            if (cell.similarity === 0 && i !== j) {
                zeros.push({
                    row: categories[i],
                    col: categories[j],
                    warning: "No keyword overlap detected"
                });
            }
        });
    });

    return {
        passed: zeros.length < (matrix.length * 0.1), // Less than 10% zeros
        zeroCount: zeros.length,
        details: zeros
    };
}
```

### 3. Asymmetry Validation

```javascript
function validateAsymmetryRatio(matrix) {
    let upperSum = 0, lowerSum = 0;

    matrix.forEach((row, i) => {
        row.forEach((cell, j) => {
            if (i < j) upperSum += cell.realityScore;
            if (i > j) lowerSum += cell.intentScore;
        });
    });

    const ratio = upperSum / lowerSum;

    return {
        passed: ratio >= 1.2 && ratio <= 2.0,
        ratio: ratio,
        interpretation:
            ratio < 1.0 ? "Over-documenting" :
            ratio > 2.0 ? "Under-documenting" :
            "Balanced development"
    };
}
```

## Adding New Data Sources

### Adding a New Intent Source

1. **Define in SHORTLEX_HIERARCHY** (`trust-debt-reality-intent-matrix.js:141-172`):

```javascript
{
    path: '📘YourDoc',
    name: 'Your Document Name',
    depth: 0,
    weight: 15,  // Importance weight (0-100)
    keywords: ['domain', 'specific', 'terms'],
    docPath: 'path/to/your/document.md'
}
```

2. **Verify file path exists**:
```javascript
if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    // Process content...
}
```

3. **Run validation**:
```bash
node src/trust-debt-reality-intent-matrix.js
```

### Adjusting Time Windows

**Expand to 30 days**:
```javascript
const commits = execSync('git log --since="30 days ago"', ...)
```

**Analyze specific date range**:
```javascript
const commits = execSync('git log --since="2025-01-01" --until="2025-02-01"', ...)
```

**Filter by branch**:
```javascript
const commits = execSync('git log main --since="7 days ago"', ...)
```

## Performance Considerations

### Document Size Limits

```javascript
const content = fs.readFileSync(path, 'utf8')
    .substring(0, 50000); // Limit to 50K chars
```

**Why?**
- Prevents memory issues with large files
- Speeds up regex matching
- Most relevant content is typically at start

### Keyword Optimization

```javascript
// Bad: Too many keywords slow down matching
keywords: ['a', 'an', 'the', 'trust', 'debt', ...]  // 50+ keywords

// Good: Focus on distinctive terms
keywords: ['trust', 'debt', 'alignment', 'semantic', 'drift']  // 5-10 keywords
```

### Caching Strategy

```javascript
// Cache commit data to avoid repeated git calls
const cacheFile = '.intentguard-cache.json';
if (fs.existsSync(cacheFile)) {
    const cache = JSON.parse(fs.readFileSync(cacheFile));
    if (cache.timestamp > Date.now() - 3600000) {  // 1 hour cache
        return cache.commits;
    }
}
```

## Troubleshooting

### Problem: All similarity scores are 0

**Diagnosis**:
```javascript
console.log('Text sample:', text.substring(0, 100));
console.log('Keywords:', keywords);
console.log('Matches found:', matches);
```

**Solutions**:
- Check text is lowercase (keywords are case-sensitive after lowercasing)
- Verify keywords are appropriate for category
- Ensure documents actually contain relevant content

### Problem: Asymmetry ratio is inverted (< 1.0)

**Meaning**: More documentation activity than implementation
**Check**:
- Are commits being captured correctly?
- Is documentation being over-counted?
- Are keyword weights appropriate?

### Problem: Diagonal scores are too low

**Meaning**: Categories lack internal coherence
**Solutions**:
- Review category definitions (may be too broad)
- Check if keywords overlap between categories
- Ensure categories are truly orthogonal

## References

- **Implementation**: `src/trust-debt-reality-intent-matrix.js`
- **Matrix Population**: `agent3-matrix-calculation-engine.js`
- **Visual Specification**: `docs/matrix-visual-design-spec.md`
- **Pipeline COMS**: `trust-debt-pipeline-coms.txt`
