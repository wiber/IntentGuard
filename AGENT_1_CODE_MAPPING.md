# AGENT 1: DATABASE INDEXER & KEYWORD EXTRACTOR - CODE MAPPING

## COMPLETE INTENTGUARD LIFECYCLE FLOW

### CLI ENTRY POINTS
```
FILE: /bin/cli.js
LINES: 1-400+ (full CLI interface)
FUNCTIONS: 
  - main program entry: lines 73-80
  - agent command routing: `intentguard 1` → line 51 (package.json)
RESPONSIBILITY: CLI interface for IntentGuard agent system
INTEGRATION_POINT: Agent 1 bucket data loaded via require('./1-indexed-keywords.json')
```

### CORE LIB INTEGRATION  
```
FILE: /lib/index.js
LINES: 1-50+ (IntentGuard class core)
FUNCTIONS:
  - IntentGuard.constructor(): lines 11-17
  - loadConfig(): lines 22-57
RESPONSIBILITY: Main IntentGuard class initialization and configuration
INTEGRATION_POINT: Replace hardcoded config.categories with Agent 1 dynamic keywords
```

## AGENT 1 DOMAIN FILES - DETAILED MAPPING

### 1. DATABASE CORE (PRIMARY RESPONSIBILITY)
```
FILE: /src/trust-debt-tracker.js
LINES: 13-15 (sqlite3 imports)
LINES: 49-123 (TrustDebtTracker class + database schema)
FUNCTIONS:
  - constructor(): line 50-55
  - initialize(): lines 57-69  
  - createSchema(): lines 71-114
  - loadCurrentDebt(): lines 116-122
  - analyzeCommits(): lines 124-149
RESPONSIBILITY: SQLite database creation, schema management, content indexing
INTEGRATION_POINT: Load Agent 1 JSON bucket for keyword_matrix population
HARDCODED_VALUES:
  - TRUST_CATEGORIES: lines 17-28 → replace with bucket.extracted_keywords
  - Database path: line 60 → make configurable from bucket metadata
```

### 2. KEYWORD EXTRACTION ENGINE (PRIMARY RESPONSIBILITY)
```
FILE: /enhanced-indexer.js  
LINES: 1-80+ (Complete Agent 1 implementation)
FUNCTIONS:
  - extractKeywords(): lines 53-79
  - extractContext(): lines 80+ (implied)
RESPONSIBILITY: Hybrid LLM-regex keyword extraction with domain categorization
INTEGRATION_POINT: This IS the Agent 1 implementation - needs SQLite integration
HARDCODED_VALUES:
  - KEYWORD_PATTERNS: lines 14-50 → make dynamic from learned patterns
```

### 3. CONTENT EXTRACTION & CORPUS BUILDING (PRIMARY RESPONSIBILITY)
```
FILE: /src/trust-debt-organic-extractor.js
LINES: 27-250+ (OrganicCategoryExtractor class)
FUNCTIONS:
  - extractCombinedCorpus(): lines 41-57
  - extractDocumentationCorpus(): lines 72-99
  - extractGitCorpus(): lines 103-127
  - extractNaturalTerms(): lines 133-166
  - extractTermsFromText(): lines 171-184
  - isSyntaxNoise(): lines 189-205
  - formSemanticClusters(): lines 211-235
  - createSemanticClusters(): lines 240-249
RESPONSIBILITY: Intent vs Reality content separation and term extraction
INTEGRATION_POINT: Output feeds directly into Agent 1 keyword normalization
HARDCODED_VALUES:
  - File paths: lines 107-116 → make configurable
  - Semantic clusters: lines 244-249 → integrate with Agent 2 category system
```

### 4. DOCUMENT TRACKING & HASHING (PRIMARY RESPONSIBILITY)  
```
FILE: /src/trust-debt-document-tracker.js
LINES: 13-70+ (TrustDebtDocumentTracker class)
FUNCTIONS:
  - constructor(): lines 14-19
  - loadAllDocuments(): lines 21-37
  - loadDocument(): lines 39-65
RESPONSIBILITY: Document content hashing and change tracking
INTEGRATION_POINT: Content hashes populate Agent 1 SQLite intent_content table
HARDCODED_VALUES:
  - Document paths: line 27 → load from settings.documents.tracked
```

## INTEGRATION ARCHITECTURE MAPPING

### ENTRY POINT TO AGENT 1 FLOW:
1. **CLI Command**: `intentguard 1` (package.json:51)
2. **Routes to**: `node bin/cli.js agent 1` 
3. **Loads**: `require('../src/trust-debt-final.js')` (cli.js:15)
4. **Executes**: TrustDebtCalculator → Agent 1 indexing functions
5. **Outputs**: `1-indexed-keywords.json`

### AGENT 1 PROCESSING PIPELINE:
```
[CLI Entry] 
    ↓ 
[trust-debt-tracker.js::initialize()] → Create SQLite schema
    ↓
[trust-debt-organic-extractor.js::extractCombinedCorpus()] → Separate Intent/Reality
    ↓  
[enhanced-indexer.js::extractKeywords()] → Hybrid keyword extraction
    ↓
[trust-debt-document-tracker.js::loadAllDocuments()] → Content hashing
    ↓
[DATABASE POPULATION] → Store in trust-debt-pipeline.db
    ↓
[JSON OUTPUT] → 1-indexed-keywords.json
```

## HARDCODED VALUES REQUIRING REPLACEMENT

### 1. Static Keyword Lists (HIGH PRIORITY)
```
LOCATION: enhanced-indexer.js:14-50
HARDCODED: KEYWORD_PATTERNS object with static regex
REPLACEMENT: Load patterns from 1-indexed-keywords.json
INTEGRATION: bucket.extracted_keywords[i].patterns
```

### 2. Database Paths (MEDIUM PRIORITY)  
```
LOCATION: trust-debt-tracker.js:60
HARDCODED: 'data/trust-debt.db' path
REPLACEMENT: Load from bucket.database_file
INTEGRATION: bucket.database_file value
```

### 3. Trust Categories (HIGH PRIORITY)
```
LOCATION: trust-debt-tracker.js:17-28  
HARDCODED: TRUST_CATEGORIES static object
REPLACEMENT: Load from bucket.extracted_keywords
INTEGRATION: bucket.extracted_keywords.filter(k => k.semantic_cluster)
```

### 4. File Scanning Paths (MEDIUM PRIORITY)
```
LOCATION: trust-debt-organic-extractor.js:107-116
HARDCODED: srcDirs = ['src', 'lib', 'bin']
REPLACEMENT: Load from bucket.keyword_domains.reality_domain.source_files
INTEGRATION: Dynamic path configuration
```

## VALIDATION CHECKPOINTS

### Agent 1 Output Validation Points:
1. **Database Schema**: `trust-debt-tracker.js:71-114` → Validate table creation
2. **Keyword Count**: `enhanced-indexer.js:53-79` → Verify extraction completeness  
3. **Content Hashing**: `trust-debt-document-tracker.js:41` → Check hash consistency
4. **JSON Structure**: Final output → Validate against Agent 2 input requirements

## CLAUDE-ACCESSIBLE TOOLS NEEDED

### 1. Database Validation Tool
```javascript
function validateAgent1Database() {
  // Check SQLite schema completeness
  // Verify content_hash consistency  
  // Count indexed files vs expected
}
```

### 2. Keyword Extraction Tool
```javascript  
function extractKeywordsForFile(filePath) {
  // Load enhanced-indexer.js extraction logic
  // Apply to single file for testing
  // Return keyword analysis
}
```

### 3. Bucket Integration Tool
```javascript
function integrateAgent1Bucket() {
  // Load 1-indexed-keywords.json
  // Replace hardcoded values in trust-debt-*.js files
  // Validate integration success
}
```

### 4. End-to-End Pipeline Tool
```javascript
function traceAgent1Pipeline() {
  // Follow data flow from CLI → Database → JSON
  // Identify integration points
  // Report pipeline health
}
```

## MAINTAINABILITY REQUIREMENTS

### Code Architecture:
- **Modular Design**: Each extraction function is independently testable
- **Error Handling**: All file operations have try/catch blocks
- **Caching**: Document hashing prevents redundant processing  
- **Configuration**: Settings-driven rather than hardcoded paths

### Integration Points:
- **Agent 0 Input**: Processes 0-outcome-requirements.json for extraction targets
- **Agent 2 Output**: Provides normalized keywords for category generation
- **Database Layer**: SQLite provides queryable audit trail
- **CLI Interface**: Seamlessly integrated with main IntentGuard workflow

## CRITICAL INTEGRATION FINDINGS:

1. **Agent 1 already exists** in `enhanced-indexer.js` but needs SQLite integration
2. **Database schema exists** in `trust-debt-tracker.js` but needs keyword matrix population
3. **Content extraction exists** in `trust-debt-organic-extractor.js` but needs bucket output integration
4. **CLI routing exists** via package.json but needs bucket loading architecture

The IntentGuard codebase has the foundation for Agent 1 - it just needs integration orchestration to connect the existing pieces into a coherent, bucket-driven pipeline.