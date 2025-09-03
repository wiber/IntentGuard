# IntentGuard Refactoring Specification v1.0

> **Core Principle**: Never change the Trust Debt algorithms. Preserve mathematical integrity at all costs. Refactor around the algorithms, not through them.

## 🎯 Mission Statement

Transform IntentGuard from a Grade C proof-of-concept (73 files, massive duplication) into enterprise-ready architecture while maintaining 100% mathematical algorithm compatibility and preserving all existing CLI functionality.

## ⚖️ Non-Negotiable Algorithm Preservation Requirements

### **Mathematical Algorithms That Must Remain Unchanged:**

1. **Asymmetric Matrix Calculation**
   - Formula: `TrustDebt = Σ((Intent_i - Reality_i)² × Time_i × SpecAge_i × CategoryWeight_i)`
   - Upper triangle = Reality (Git commits)
   - Lower triangle = Intent (Documentation) 
   - Asymmetry ratio calculation: `upperTriangleSum / lowerTriangleSum`

2. **Orthogonal Category Analysis**
   - ShortLex ordering system (A🚀, A🚀.1⚡, etc.)
   - Category independence measurement
   - Correlation calculations between categories

3. **Trust Debt Scoring System**
   - Grade boundaries: AAA (<100), A (<500), B (<1000), C (<5000), D (>5000)
   - Unit calculations and multipliers
   - Drift detection algorithms

4. **Matrix Visualization Logic**
   - Heat map color coding
   - Cell value normalization
   - Interactive matrix generation

### **Algorithm Extraction Strategy:**

```javascript
// BEFORE refactoring - extract these exact functions from trust-debt-final.js
const PRESERVED_ALGORITHMS = {
  // Core calculation - extract as-is
  calculateAsymmetricMatrix: function(intentData, realityData, categories) {
    // EXACT COPY from trust-debt-final.js lines X-Y
    // Do not modify any mathematical operations
  },
  
  // Orthogonality measurement - extract as-is  
  calculateOrthogonality: function(matrix) {
    // EXACT COPY from trust-debt-final.js
    // Preserve correlation calculations
  },
  
  // Grade calculation - extract as-is
  calculateGrade: function(totalDebt) {
    // EXACT COPY - these thresholds are validated
  }
};
```

## 🏗️ Refactoring Architecture Specification

### **Phase 1: Safe Algorithm Extraction (Week 1-2)**

**Goal**: Extract algorithms without modification, create test harness

#### **Step 1.1: Algorithm Museum Creation**
```
src/algorithms/
├── TrustDebtMath.js           # Pure mathematical functions ONLY
├── AsymmetricCalculator.js    # Matrix operations ONLY  
├── OrthogonalAnalyzer.js      # Category analysis ONLY
└── GradeCalculator.js         # Scoring system ONLY
```

**Algorithm Preservation Rules:**
- ✅ Copy existing mathematical functions EXACTLY
- ✅ Add comprehensive unit tests for every formula
- ✅ Create test fixtures from current working results
- ❌ Do NOT optimize, refactor, or "improve" any math
- ❌ Do NOT change variable names or function signatures
- ❌ Do NOT modify numerical constants or thresholds

#### **Step 1.2: Test Harness Construction**

```javascript
// tests/algorithm-preservation.test.js
describe('Algorithm Preservation Guarantee', () => {
  const REFERENCE_RESULTS = {
    // Current IntentGuard results that MUST be preserved
    intentGuardRepo: {
      totalDebt: 4423,
      grade: 'C', 
      asymmetryRatio: 3.51,
      orthogonality: 0.135
    }
  };

  it('produces identical results to trust-debt-final.js', () => {
    const newResult = newAlgorithms.calculate(REFERENCE_INPUT);
    const oldResult = oldAlgorithms.calculate(REFERENCE_INPUT);
    
    expect(newResult.totalDebt).toBe(oldResult.totalDebt);
    expect(newResult.grade).toBe(oldResult.grade);
    // Every number must match exactly
  });
});
```

### **Phase 2: Clean Architecture Implementation (Week 3-5)**

**Goal**: Build proper architecture around preserved algorithms

#### **Step 2.1: New Module Structure**

```
src/
├── algorithms/                 # PRESERVED - No changes allowed
│   ├── TrustDebtMath.js       # Pure math functions
│   └── [other algorithm files] 
├── core/                       # NEW - Business logic orchestration
│   ├── TrustDebtEngine.js     # Orchestrates algorithms
│   └── AnalysisOrchestrator.js # Workflow management  
├── data/                       # NEW - Data extraction and normalization
│   ├── GitDataExtractor.js    # Git commit analysis
│   ├── DocumentExtractor.js   # Documentation parsing
│   └── DataNormalizer.js      # Clean inputs for algorithms
├── storage/                    # NEW - Persistence layer
│   ├── StorageInterface.js    # Abstract storage
│   ├── FileStorage.js         # Development storage
│   ├── PostgreSQLStorage.js   # Team/enterprise storage
│   └── InfluxDBStorage.js     # Time-series optimization
├── reporters/                  # NEW - Output generation
│   ├── HTMLReporter.js        # Professional reports
│   ├── ConsoleReporter.js     # CLI output
│   └── JSONReporter.js        # API integration
├── config/                     # NEW - Configuration management
│   └── ConfigurationManager.js # Centralized config
└── utils/                      # NEW - Supporting utilities
    └── [various utility files]
```

#### **Step 2.2: Data Flow Architecture**

```
Input → Extract → Normalize → Calculate → Store → Report
  ↓        ↓         ↓           ↓         ↓       ↓
[Files] → [Data] → [Clean] → [ALGORITHMS] → [DB] → [HTML]
         Layer    Layer      [PRESERVED]   Layer   Layer
```

**Critical Rule**: Algorithms receive the same data structure they expect today.

### **Phase 3: Storage Architecture Specification**

#### **Tiered Storage Strategy:**

**Tier 1: Local Development (File-based)**
```javascript
// .intentguard/
├── history.jsonl              # Append-only analysis history
├── config.json               # Local configuration
└── cache/                    # Temporary calculation cache
    └── [project-hash].json
```

**Tier 2: Team Development (PostgreSQL)**
```sql
-- Core schema preserving all current analysis data
CREATE TABLE trust_debt_analyses (
  id SERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  commit_hash TEXT,
  analysis_timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Preserve exact algorithm outputs
  total_debt DECIMAL(10,2) NOT NULL,
  grade VARCHAR(3) NOT NULL,
  asymmetry_ratio DECIMAL(8,4),
  orthogonality DECIMAL(8,6),
  
  -- Store complete results for audit trail
  algorithm_results JSONB NOT NULL,
  input_data_hash TEXT NOT NULL,
  algorithm_version TEXT NOT NULL
);

CREATE INDEX idx_project_timestamp ON trust_debt_analyses(project_id, analysis_timestamp);
CREATE INDEX idx_algorithm_version ON trust_debt_analyses(algorithm_version);
```

**Tier 3: Enterprise (Time-Series + Multi-tenant)**
```javascript
// InfluxDB measurements for real-time monitoring
const MEASUREMENTS = {
  trust_debt: {
    tags: ['project_id', 'branch', 'grade', 'algorithm_version'],
    fields: ['total_debt', 'asymmetry_ratio', 'orthogonality']
  },
  category_debt: {
    tags: ['project_id', 'category_id', 'category_name'],  
    fields: ['debt_value', 'intent_score', 'reality_score']
  }
};
```

### **Phase 4: Migration Strategy Specification**

#### **Safe Migration Steps:**

**Week 1-2: Parallel Implementation**
- Build new architecture alongside existing code
- All new code imports from `src/algorithms/` (preserved functions)
- Existing CLI continues to work with `trust-debt-final.js`

**Week 3-4: CLI Switchover**  
- Modify `bin/cli.js` to use new `TrustDebtEngine`
- New engine calls preserved algorithms identically
- Add `--legacy` flag to use old implementation for comparison

**Week 5-6: Validation & Cleanup**
- Run both implementations in parallel on test repositories
- Verify identical numerical results
- Remove old files only after validation

#### **Rollback Strategy:**
```javascript
// Emergency rollback capability
const ENGINE_VERSION = process.env.INTENTGUARD_ENGINE || 'new';

const engine = ENGINE_VERSION === 'legacy' 
  ? require('./trust-debt-final.js')     // Old implementation
  : require('./core/TrustDebtEngine.js'); // New implementation
```

## 🧪 Quality Assurance Specification

### **Test Coverage Requirements:**

**Algorithm Tests (100% Coverage Required):**
```javascript
// Every mathematical operation must have tests
describe('Asymmetric Matrix Calculation', () => {
  it('calculates upper triangle correctly', () => {
    // Test with known inputs/outputs
  });
  
  it('calculates lower triangle correctly', () => {
    // Test with known inputs/outputs  
  });
  
  it('produces identical results to v1.8.3', () => {
    // Regression test against current version
  });
});
```

**Integration Tests (90% Coverage Required):**
```javascript
// End-to-end workflow testing
describe('Full Analysis Pipeline', () => {
  it('produces same results as current implementation', () => {
    // Test entire workflow with real repository data
  });
});
```

### **Performance Requirements:**

| Operation | Current | Target | Method |
|-----------|---------|--------|--------|
| Analysis Runtime | ~2-3 seconds | ≤2 seconds | Parallel processing |
| Memory Usage | ~50MB | ≤30MB | Reduce file duplication |
| Startup Time | ~1 second | ≤0.5 seconds | Lazy loading |

## 🚀 Implementation Guidelines

### **Development Principles:**

1. **Algorithm Sanctity**: Never modify preserved mathematical functions
2. **Test-Driven**: Write tests before refactoring each module
3. **Backwards Compatibility**: Existing CLI users must continue working
4. **Incremental Migration**: Replace one module at a time
5. **Validation-First**: Prove numerical equivalence before proceeding

### **Code Organization Rules:**

```javascript
// GOOD - Algorithm isolation
const mathResult = TrustDebtMath.calculateAsymmetricMatrix(data);
const report = HTMLReporter.generate(mathResult);

// BAD - Algorithm modification
const mathResult = improvedAsymmetricCalculation(data); // DON'T DO THIS
```

### **Configuration Evolution:**

```javascript
// Preserve existing config compatibility
const config = {
  // v1.0 compatibility
  threshold: 100,
  output: 'console',
  
  // v2.0 enhancements  
  storage: {
    type: 'auto',  // file, postgresql, enterprise
    // ... storage options
  },
  
  algorithms: {
    version: '1.8.3',  // Pin to preserve exact results
    validation: true   // Compare against reference implementation
  }
};
```

## 📋 Success Criteria

### **Phase Gate Requirements:**

**Phase 1 Complete When:**
- ✅ All algorithms extracted with 100% test coverage
- ✅ Test harness validates identical results to current version
- ✅ No mathematical operations modified

**Phase 2 Complete When:**  
- ✅ New architecture produces identical CLI output
- ✅ All existing commands work without changes
- ✅ Performance matches or exceeds current version

**Phase 3 Complete When:**
- ✅ Storage layer operational with backwards compatibility
- ✅ Historical data preserved through migration
- ✅ Multi-tier deployment working

**Final Acceptance Criteria:**
- ✅ IntentGuard analysis of itself produces same 4,423 units / Grade C
- ✅ All mathematical results bit-for-bit identical
- ✅ Codebase reduced from 73+ files to ~15 modules
- ✅ Test coverage >90% across all components
- ✅ Enterprise features operational

## ⚠️ Risk Mitigation

### **High-Risk Areas:**

1. **Algorithm Modification Risk**: Accidentally changing mathematical logic
   - **Mitigation**: Algorithmic functions are read-only, comprehensive tests
   
2. **Performance Regression Risk**: New architecture slower than current  
   - **Mitigation**: Performance benchmarks at every phase gate
   
3. **Breaking Changes Risk**: Existing users unable to upgrade
   - **Mitigation**: Backwards compatibility testing, gradual migration
   
4. **Data Loss Risk**: Historical analysis results lost during storage migration
   - **Mitigation**: Export/import tools, rollback procedures

This specification ensures IntentGuard maintains its mathematical credibility while gaining enterprise-ready architecture. The preserved algorithms continue to produce the validated results that prove the Trust Debt concept works.

---

**Document Status**: Living specification - updated as implementation proceeds
**Next Review**: After Phase 1 completion
**Approval Required**: Mathematical algorithm preservation verified before Phase 2