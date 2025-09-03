# Dynamic Category Generation Plan

## Current State Analysis

### DISCOVERY: We Have Two Systems!

#### System 1: `trust-debt-dynamic.js` (ACTIVE - Working Dynamic Generation)
- **npm Binary**: `intentguard` command points to this file
- **Dynamic Categories**: Actually generates 25 categories from documentation
- **JSON Persistence**: Uses `trust-debt-categories.json` for stability
- **Semantic Analysis**: Extracts themes from README, package.json, docs
- **Stability System**: "Categories: 25 stable, 0 new" - drift prevention working
- **Current Output**: 33,515 units total debt, 14.0% orthogonality

#### System 2: `trust-debt-final.js` (DORMANT - Hardcoded Categories) 
- **Binary**: `trust-debt-static` command points to this file
- **Hardcoded Categories**: 29 categories (5 parents + 20 children + 4 grandchildren)  
- **Fixed Hierarchy**: A📚 < B🎯 < C📏 < D🎨 < E✅
- **Better Performance**: Charts and matrix work without crashes
- **Patent Compliant**: Orthogonality maintained, M = S × E physics

### The Real Situation
**Dynamic category generation is ALREADY WORKING** in the main npm package! The `intentguard` binary successfully:
- ✅ Extracts themes from documentation ("ui", "testing", "deployment", etc.)
- ✅ Maintains category stability (25 stable, 0 new) 
- ✅ Uses JSON persistence for consistency
- ✅ Generates meaningful category hierarchies (C✅ Validation, A📋 Planning, etc.)

### The Actual Problem
The two systems are **divergent**:
1. **Dynamic system** (trust-debt-dynamic.js) works but may have performance/UI issues
2. **Static system** (trust-debt-final.js) has better UI/performance but hardcoded categories

### Current Hardcoded Structure
```
A📚 Documentation (parent)
├── A📚.1📝 Specs
├── A📚.2📜 Patents  
├── A📚.3📖 Guides
└── A📚.4📋 Plans
    └── A📚.1📝.a🔹 User Stories (grandchild)

B🎯 MVP (parent)
├── B🎯.1🔧 Features
├── B🎯.2🐛 Bugs
├── B🎯.3✨ Polish
└── B🎯.4🚀 Deploy
    └── B🎯.1🔧.a🔹 Core Features (grandchild)

...and so on
```

## Stability Requirements

### 1. npm Package Stability
- **Current Version**: Must check package.json version
- **Binary Entry**: `intentguard` command must continue working
- **Backward Compatibility**: Existing JSON persistence should be honored
- **No Breaking Changes**: Category IDs must remain stable between runs

### 2. ShortLex Ordering Preservation
- **Mathematical Foundation**: Length-first, then lexicographic
- **Patent Compliance**: Ordering determines orthogonality calculations
- **Hierarchical Structure**: Parent → Child → Grandchild relationships
- **Emoji Consistency**: Category IDs must include stable emoji markers

### 3. JSON Persistence Strategy
- **Category Seeding**: Use existing `trust-debt-categories.json` as seed/fallback
- **Drift Prevention**: Don't regenerate categories unless documentation significantly changes
- **Version Control**: Track category schema versions to detect changes
- **Rollback Capability**: Ability to revert to previous stable category set

## Dynamic Generation Approach

### Phase 1: Documentation Analysis Engine
```javascript
class DocumentationAnalyzer {
    analyzeProject(projectPath) {
        // Extract from:
        // - README.md (main sections, features)
        // - package.json (scripts, dependencies, keywords)
        // - docs/ folder structure
        // - CLAUDE.md or similar project docs
        // - Source code comments and structure
    }
    
    extractSemanticClusters() {
        // Use NLP/keyword clustering to identify:
        // - Core functional areas
        // - Development workflows  
        // - Quality/validation processes
        // - Documentation types
        // - Deployment/operations concerns
    }
}
```

### Phase 2: ShortLex Category Builder
```javascript
class ShortLexCategoryBuilder {
    buildFromSemanticClusters(clusters) {
        // Rules:
        // 1. Max 5 parent categories (A-E)
        // 2. Each parent gets 4 children max
        // 3. Select few children get 1-2 grandchildren
        // 4. Maintain emoji consistency
        // 5. Ensure orthogonality (< 1% correlation)
    }
    
    validateOrthogonality(categories) {
        // Test keyword overlap between categories
        // Ensure < 1% correlation for patent compliance
        // Adjust category boundaries if needed
    }
}
```

### Phase 3: Stability & Persistence
```javascript
class CategoryStabilityManager {
    loadExistingCategories(jsonPath) {
        // Load previous category structure
        // Check if documentation has significantly changed
        // Decide whether to regenerate or use cached
    }
    
    calculateDrift(oldCategories, newCategories) {
        // Measure semantic drift between old/new
        // Only regenerate if drift > threshold (e.g., 15%)
    }
    
    persistWithMetadata(categories) {
        // Save categories with:
        // - Generation timestamp
        // - Source documentation hashes
        // - Version number
        // - Orthogonality metrics
    }
}
```

## Revised Implementation Strategy

### Current Status: Dynamic Generation Already Works!
- ✅ **npm Package**: Version 1.3.0, `intentguard` binary working
- ✅ **Dynamic Categories**: 25 categories generated from documentation  
- ✅ **JSON Persistence**: `trust-debt-categories.json` provides stability
- ✅ **Semantic Analysis**: Extracts themes ("ui", "testing", "deployment")
- ✅ **Drift Prevention**: "25 stable, 0 new" - categories stay consistent

### The Real Choice: Merge vs Improve

#### Option A: Improve Dynamic System (trust-debt-dynamic.js)
**Pros:**
- Already working dynamic generation
- Used by main npm binary
- Patent-compliant dynamic extraction
- JSON persistence working

**Cons:**  
- May have performance/UI issues (need to test)
- Generated HTML might be less polished
- Chart performance unknown

#### Option B: Port Dynamic Logic to Static System (trust-debt-final.js)
**Pros:**
- Better UI/charts/performance (we know it works well)
- Polished HTML generation
- No performance issues

**Cons:**
- Need to port complex dynamic logic
- Risk breaking working system
- More development work

#### Option C: Merge Best of Both
**Pros:**
- Keep dynamic generation from System 1
- Keep polished UI from System 2  
- Single unified system

**Cons:**
- Most complex approach
- Higher risk of breaking things

### Recommended Approach: Improve Dynamic System

#### Step 1: Analyze Current Dynamic System Performance
- [x] Verify dynamic system works (`intentguard` command)
- [ ] Test generated HTML quality and performance
- [ ] Compare chart performance with static system
- [ ] Document current dynamic category structure

#### Step 2: Identify UI/Performance Gaps
- [ ] Open trust-debt-dynamic.html and test browser performance  
- [ ] Compare with trust-debt-final.html UI quality
- [ ] Identify specific performance bottlenecks
- [ ] Check if charts are causing issues

#### Step 3: Improve Dynamic System UI/Performance
- [ ] Port better HTML generation from trust-debt-final.js
- [ ] Fix any chart performance issues  
- [ ] Maintain dynamic category generation
- [ ] Ensure npm binary continues working

#### Step 4: Validation & Testing
- [ ] Test stability across multiple runs
- [ ] Validate on different project types
- [ ] Ensure patent compliance maintained
- [ ] Performance benchmarks vs previous version

## Risk Mitigation

### High-Risk Items
1. **Category Instability**: Categories change too frequently
   - **Mitigation**: High drift threshold (15%+), JSON persistence
   
2. **Orthogonality Violation**: Dynamic categories become correlated
   - **Mitigation**: Built-in orthogonality validation and adjustment
   
3. **ShortLex Violation**: Generated categories break ordering
   - **Mitigation**: Strict length/emoji validation in generator
   
4. **npm Package Breaking**: Binary command stops working
   - **Mitigation**: Comprehensive testing, fallback to hardcoded

### Medium-Risk Items  
1. **Performance Degradation**: Dynamic generation takes too long
   - **Mitigation**: Cache results, limit complexity
   
2. **Patent Non-Compliance**: System doesn't meet patent claims
   - **Mitigation**: Validate against patent requirements at each step

### Low-Risk Items
1. **Documentation Changes**: Source docs change format
   - **Mitigation**: Multiple documentation sources, fallbacks

## Success Criteria

### Must Have
- [ ] Categories dynamically generated from documentation
- [ ] ShortLex ordering maintained
- [ ] Orthogonality < 1% (patent compliance)
- [ ] npm package continues working
- [ ] Category stability between runs (< 15% drift)

### Should Have
- [ ] Works on different project types
- [ ] Performance similar to hardcoded version
- [ ] Clear fallback mechanism
- [ ] Documentation of generation process

### Nice to Have
- [ ] Visual diff of category changes
- [ ] Category generation explanations
- [ ] Manual category override capability
- [ ] Integration with CI/CD for category validation

## Next Steps

1. **Immediate**: Check current npm package status and create stability baseline
2. **Week 1**: Build and test DocumentationAnalyzer on IntentGuard project  
3. **Week 2**: Implement dynamic ShortLex CategoryBuilder with validation
4. **Week 3**: Add stability layer and persistence mechanisms
5. **Week 4**: Integration testing and npm package validation

## Questions to Resolve

1. **Drift Threshold**: What % change warrants category regeneration?
2. **Fallback Strategy**: When to use hardcoded vs dynamic categories?
3. **Multi-Project**: How to handle different project types/structures?
4. **Performance**: What's acceptable generation time for dynamic categories?
5. **Validation**: How to ensure generated categories are semantically meaningful?