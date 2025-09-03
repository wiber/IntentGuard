# Fix Intent Matrix Plan - Critical Issue

## The Problem We See

Looking at the JSON output, the Intent values are mostly 0 or very small (0.024, 0.011, 0.033), while Reality values are much higher (0.6, 0.93, 0.34). This means:

1. **Documentation is NOT being properly analyzed** 
2. **Upper triangle is empty** (no broken promises detected)
3. **All debt is in lower triangle** (undocumented features only)

## Root Cause Analysis

### Current Flow (BROKEN):
```javascript
buildIntentMatrix() {
    // These files ARE listed
    docs = ['CLAUDE.md', 'business plan', 'MVP spec']
    
    // But are they being read?
    docs.forEach(doc => {
        if (fs.existsSync(fullPath)) {
            content = fs.readFileSync(fullPath)
            this.analyzeContent(content, this.intentMatrix, weight)
        }
    })
}
```

### Suspected Issues:
1. **Path resolution failing** - files exist but paths are wrong
2. **analyzeContent not finding keywords** - documentation doesn't match keyword list
3. **Weight too low** - 0.3-0.4 weight might be diluting the signal

## Investigation Steps

### Step 1: Verify Documentation is Being Read
```javascript
buildIntentMatrix() {
    console.log('📚 Building Intent Matrix from documentation...');
    
    const docs = [
        { path: 'CLAUDE.md', weight: 0.4 },
        { path: 'docs/01-business/THETACOACH_BUSINESS_PLAN.md', weight: 0.3 },
        { path: 'docs/03-product/MVP/UNIFIED_DRIFT_MVP_SPEC.md', weight: 0.3 }
    ];
    
    let totalDocsRead = 0;
    let totalContentLength = 0;
    
    docs.forEach(doc => {
        const fullPath = path.join(process.cwd(), doc.path);
        console.log(`  Checking ${fullPath}...`);
        
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            console.log(`  ✓ Read ${doc.path}: ${content.length} chars`);
            totalDocsRead++;
            totalContentLength += content.length;
            
            // LOG KEYWORD MATCHES
            const matches = this.debugAnalyzeContent(content);
            console.log(`    Found keywords: ${JSON.stringify(matches)}`);
            
            this.analyzeContent(content, this.intentMatrix, doc.weight);
        } else {
            console.log(`  ✗ NOT FOUND: ${doc.path}`);
        }
    });
    
    console.log(`  Total: ${totalDocsRead} docs, ${totalContentLength} chars`);
}
```

### Step 2: Debug Keyword Matching
```javascript
debugAnalyzeContent(content) {
    const found = {};
    const lowerContent = content.toLowerCase();
    
    this.categories.forEach(cat => {
        const keywords = CATEGORY_KEYWORDS[cat.id] || [];
        let matches = 0;
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const m = lowerContent.match(regex);
            if (m) matches += m.length;
        });
        
        if (matches > 0) {
            found[cat.id] = matches;
        }
    });
    
    return found;
}
```

## The Fix Implementation

### Fix 1: Ensure Documentation Keywords Match
The keywords for D🧠 Intelligence are:
- 'pattern', 'recognize', 'analyze', 'understand', 'semantic', 'correlation'

Our documentation should include these! Currently it might be using different terms.

### Fix 2: Properly Weight Intent vs Reality
```javascript
// Intent should have HIGHER weight since docs are smaller
buildIntentMatrix() {
    const docs = [
        { path: 'CLAUDE.md', weight: 1.0 },  // Increase from 0.4
        { path: 'docs/01-business/THETACOACH_BUSINESS_PLAN.md', weight: 0.8 },  // Increase from 0.3
        { path: 'docs/03-product/MVP/UNIFIED_DRIFT_MVP_SPEC.md', weight: 0.8 }  // Increase from 0.3
    ];
}

// Reality should have LOWER weight since code is larger
buildRealityMatrix() {
    sourceFiles.forEach(file => {
        this.analyzeContent(content, this.realityMatrix, 0.1); // Decrease from 0.2
    });
}
```

### Fix 3: Add More Relevant Keywords to Documentation
Update CLAUDE.md to include category keywords:
```markdown
# Performance
The system optimizes, caches, scales efficiently...

# Security  
Defense mechanisms protect and monitor...

# Speed
Fast response with minimal latency...

# Intelligence
Pattern recognition analyzes semantic correlations to understand drift...

# Experience
User interface design with visual animations...
```

## Expected Results After Fix

### Before (Current):
```
Intent Matrix: Nearly empty (0.001 - 0.03 values)
Reality Matrix: Full (0.3 - 0.9 values)
Upper Triangle: Empty (no broken promises)
Lower Triangle: Full (all undocumented)
```

### After (Fixed):
```
Intent Matrix: Populated (0.2 - 0.6 values)
Reality Matrix: Moderate (0.1 - 0.5 values)
Upper Triangle: Shows broken promises
Lower Triangle: Shows undocumented features
Diagonal: Shows self-consistency
```

## Verification

Run this check after fix:
```javascript
// Check Intent matrix has meaningful values
const intentTotal = Object.values(this.intentMatrix)
    .flatMap(row => Object.values(row))
    .reduce((a,b) => a+b, 0);
    
const realityTotal = Object.values(this.realityMatrix)
    .flatMap(row => Object.values(row))
    .reduce((a,b) => a+b, 0);
    
console.log(`Intent total: ${intentTotal}`);
console.log(`Reality total: ${realityTotal}`);
console.log(`Ratio: ${intentTotal/realityTotal}`);

// Should be roughly 0.3-0.7, not 0.01
```

## Priority Actions

1. **IMMEDIATE**: Add debug logging to see what's being read
2. **URGENT**: Check if keywords match documentation vocabulary
3. **CRITICAL**: Increase Intent weights, decrease Reality weights
4. **IMPORTANT**: Ensure upper triangle gets populated

The asymmetric Trust Debt REQUIRES both Intent and Reality to be populated!