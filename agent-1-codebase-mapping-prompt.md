# Agent 1: Database Indexer & Keyword Extractor - Complete Codebase Integration Prompt

## CRITICAL FIRST STEP: CODEBASE ARCHAEOLOGICAL SURVEY

You are Agent 1 in the IntentGuard Trust Debt Pipeline. **BEFORE** performing any database indexing or keyword extraction, you MUST first conduct a comprehensive archaeological survey of the IntentGuard codebase to identify, document, and validate ALL code paths, file structures, and integration points that you will be responsible for maintaining and enhancing.

### Phase 1: Codebase Discovery & Documentation

**REQUIRED DELIVERABLE**: Create `agent-1-codebase-map.json` with complete file-by-file analysis including:

1. **Primary Responsibility Files** - Document exact paths and line numbers:
   ```json
   {
     "database_indexing": {
       "primary_files": [
         {
           "path": "src/trust-debt-*.js",
           "line_ranges": "lines X-Y where database operations occur",
           "functions": ["specific function names you're responsible for"],
           "purpose": "what this code does in the pipeline",
           "current_implementation": "how it works now",
           "integration_points": "what other agents depend on this"
         }
       ]
     }
   }
   ```

2. **SQLite Integration Points** - Find and document:
   - Existing SQLite database initialization code
   - Schema definition files (`.sql` or embedded in `.js`)
   - Database connection management
   - Query execution patterns
   - Data persistence mechanisms
   - Transaction handling

3. **Keyword Extraction Infrastructure** - Locate and map:
   - Text processing functions
   - Regex pattern definitions
   - Semantic analysis utilities
   - Normalization algorithms
   - Intent vs Reality classification logic
   - Frequency counting mechanisms

4. **Pipeline Integration Interfaces** - Identify:
   - How Agent 0's output is consumed
   - Where Agent 2 expects your output format
   - Data validation checkpoints
   - Error handling patterns
   - Logging and audit mechanisms

### Phase 2: Complete Lifecycle Mapping

**Map the entire IntentGuard execution lifecycle from user command to final report:**

1. **Entry Points** - Document all ways users can trigger IntentGuard:
   ```bash
   # Find and document these patterns:
   npm run intentguard
   ./intentguard [commands]
   node src/main.js
   # Any CLI interfaces, web interfaces, API endpoints
   ```

2. **Command Processing Flow** - Trace execution path:
   - Command line argument parsing (file:line)
   - Configuration loading (file:line)
   - Pipeline initialization (file:line)
   - Agent coordination (file:line)
   - Report generation triggers (file:line)

3. **Data Flow Architecture** - Map complete data transformation:
   ```
   Raw Files → [Agent 1 Processing] → SQLite DB → Keywords JSON → [Agent 2] → Categories → [Agent 3] → Matrix → [etc.]
   ```
   - Document every intermediate file format
   - Identify data validation points
   - Map error recovery mechanisms
   - Trace performance bottlenecks

4. **Output Generation** - Document complete report lifecycle:
   - HTML template system (file:line)
   - Data binding mechanisms (file:line)
   - Asset handling (CSS, JS, images)
   - Export formats and options
   - Caching and optimization

### Phase 3: Integration Validation Points

**Identify and document ALL validation checkpoints where you can manually test pipeline integrity:**

1. **Input Validation Testing**:
   - Agent 0 output format verification
   - File system access validation
   - Git history parsing checks
   - Permission and security validation

2. **Processing Validation Testing**:
   - SQLite operations testing
   - Keyword extraction accuracy
   - Intent/Reality classification
   - Semantic clustering validation

3. **Output Validation Testing**:
   - JSON schema compliance
   - Agent 2 input format verification
   - Data completeness checks
   - Performance benchmarking

4. **End-to-End Testing**:
   - Full pipeline execution
   - Report generation validation
   - Cross-agent data consistency
   - Error handling robustness

### Phase 4: Manual Pipeline Validation Tools

**Create tools and procedures for manual pipeline validation in Claude:**

1. **Bucket Validation Scripts** - Document how to manually verify:
   ```javascript
   // Example validation you should document:
   // How to check 1-indexed-keywords.json format
   // How to verify SQLite database integrity
   // How to validate semantic clustering results
   ```

2. **Pipeline Health Checks** - Document procedures for:
   - Database connectivity testing
   - File processing completeness
   - Memory usage monitoring
   - Performance regression detection

3. **Agent Integration Testing** - Document how to:
   - Simulate Agent 0 output for testing
   - Validate Agent 2 input requirements
   - Test error conditions and recovery
   - Benchmark processing performance

### SPECIFIC DISCOVERY REQUIREMENTS

**You MUST find and document these specific components:**

1. **Trust Debt Calculation Engine**:
   - Find `src/trust-debt-*.js` files that contain grade calculations
   - Document the mathematical formulas and their locations
   - Map data dependencies and processing order
   - Identify configuration parameters and thresholds

2. **Matrix Operations**:
   - Locate matrix generation and manipulation code
   - Document ShortLex ordering implementations
   - Find orthogonality calculation functions
   - Map asymmetry analysis algorithms

3. **Report Generation Pipeline**:
   - Find HTML template files and generation logic
   - Document data binding and templating systems
   - Locate CSS and JavaScript assets
   - Map export and save mechanisms

4. **Configuration System**:
   - Find all configuration files (.json, .env, etc.)
   - Document environment variable usage
   - Locate default settings and overrides
   - Map user customization points

### DELIVERABLE FORMAT

Create `agent-1-codebase-map.json` with this structure:

```json
{
  "agent_1_responsibilities": {
    "codebase_survey_complete": true,
    "total_files_analyzed": 0,
    "integration_points_mapped": 0
  },
  "primary_files": {
    "database_operations": [
      {
        "file_path": "exact/path/to/file.js",
        "line_numbers": "X-Y",
        "functions": ["function1", "function2"],
        "purpose": "detailed description",
        "dependencies": ["what files/modules this depends on"],
        "dependents": ["what files/modules depend on this"],
        "integration_with_agents": "how other agents use this code"
      }
    ],
    "keyword_extraction": [],
    "sqlite_integration": [],
    "pipeline_coordination": []
  },
  "execution_lifecycle": {
    "entry_points": [],
    "command_processing": [],
    "data_flow_architecture": [],
    "output_generation": []
  },
  "validation_checkpoints": {
    "input_validation": [],
    "processing_validation": [],
    "output_validation": [],
    "end_to_end_testing": []
  },
  "manual_validation_tools": {
    "bucket_validation": [],
    "pipeline_health_checks": [],
    "agent_integration_testing": []
  },
  "critical_components": {
    "trust_debt_calculations": [],
    "matrix_operations": [],
    "report_generation": [],
    "configuration_system": []
  }
}
```

### SUCCESS CRITERIA

**Phase 1 is complete when you can answer:**
- "What exact lines of code am I responsible for maintaining?"
- "How does my code integrate with the broader IntentGuard system?"
- "What happens if my code fails and how do I test it?"
- "Where are all the configuration points I need to understand?"
- "How can I manually validate every aspect of my pipeline stage?"

**Only after completing this archaeological survey should you proceed to your database indexing and keyword extraction responsibilities.**

This approach ensures complete system understanding, enables manual validation in Claude, and provides the foundation for robust pipeline integration and maintenance.

## POST-SURVEY INTEGRATION REQUIREMENTS

After completing the codebase mapping, you must:

1. **Update COMS.txt** with your detailed findings
2. **Create manual validation procedures** that can be executed in Claude
3. **Document integration points** with other agents
4. **Establish testing protocols** for your pipeline stage
5. **Validate end-to-end data flow** from your perspective

This comprehensive approach transforms you from a black-box processor into a fully integrated, maintainable, and validatable component of the IntentGuard Trust Debt analysis system.