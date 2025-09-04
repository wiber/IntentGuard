# IntentGuard Agent 1 Complete Integration Command

## EXECUTE THIS COMMAND:

```bash
intentguard 1
```

## AGENT 1 COMPREHENSIVE INTEGRATION PROMPT

When you execute `intentguard 1`, you will become Agent 1: Database Indexer & Keyword Extractor. Your mission is to achieve **complete codebase integration** with full manual validation capabilities.

### CRITICAL FIRST PHASE: ARCHAEOLOGICAL CODEBASE SURVEY

**Before performing ANY database indexing or keyword extraction**, you MUST conduct a comprehensive archaeological survey of the IntentGuard codebase to map every file, function, and integration point you are responsible for.

### STEP 1: SYSTEMATIC FILE DISCOVERY

Use Claude's Read, Glob, and Grep tools to systematically map the entire codebase:

1. **Discover All Trust Debt Files**:
   ```bash
   # Use Glob to find all trust-debt related files
   src/trust-debt-*.js
   src/agents/*.js
   src/db/*.js
   *.sql files
   ```

2. **Find Database-Related Code**:
   ```bash
   # Use Grep to find SQLite, database, and indexing code
   grep -r "sqlite" src/
   grep -r "database" src/
   grep -r "CREATE TABLE" src/
   grep -r "INSERT INTO" src/
   ```

3. **Locate Keyword Extraction Logic**:
   ```bash
   # Find text processing and keyword extraction
   grep -r "keyword" src/
   grep -r "extract" src/
   grep -r "semantic" src/
   grep -r "intent.*reality" src/
   ```

4. **Map Pipeline Integration Points**:
   ```bash
   # Find references to your input and output
   grep -r "0-outcome-requirements" src/
   grep -r "1-indexed-keywords" src/
   grep -r "Agent 1" src/
   ```

### STEP 2: DETAILED CODE ANALYSIS

**For EVERY file you discover, document**:
- **File Path**: Exact location
- **Line Numbers**: Specific ranges you're responsible for
- **Functions**: Names and purposes of functions you maintain
- **Dependencies**: What this code depends on
- **Dependents**: What depends on this code
- **Integration Type**: INPUT/PROCESSING/OUTPUT/VALIDATION
- **Testing Requirements**: How to validate this code works
- **Error Conditions**: What can fail and how to detect it

### STEP 3: CREATE COMPREHENSIVE DOCUMENTATION

**REQUIRED DELIVERABLE**: `agent-1-complete-codebase-map.json`

```json
{
  "agent_1_integration": {
    "survey_timestamp": "2025-09-04T15:56:39Z",
    "codebase_survey_complete": true,
    "total_files_analyzed": 0,
    "primary_responsibility_files": 0,
    "integration_points_mapped": 0,
    "validation_checkpoints_identified": 0
  },
  "primary_responsibility_files": {
    "database_operations": [
      {
        "file_path": "src/exact/path/to/database-file.js",
        "total_lines": 0,
        "responsibility_ranges": [
          {
            "start_line": 0,
            "end_line": 0,
            "function_name": "createDatabase",
            "purpose": "initializes SQLite database with schema",
            "dependencies": ["sqlite3", "fs"],
            "dependents": ["Agent 2", "Agent 3"],
            "validation_procedure": "how to test this function works",
            "error_conditions": "what can go wrong"
          }
        ],
        "modification_requirements": "what changes you need to make",
        "testing_commands": "how to test this file"
      }
    ],
    "keyword_extraction": [],
    "sqlite_integration": [],
    "pipeline_coordination": []
  },
  "integration_architecture": {
    "input_processing": {
      "agent_0_output": "0-outcome-requirements.json",
      "repository_files": "src/trust-debt-*.js files to index",
      "git_history": "commit analysis requirements",
      "validation_procedures": "how to verify input is correct"
    },
    "processing_stages": [
      {
        "stage_name": "Database Initialization",
        "file_locations": ["file1.js:lines", "file2.js:lines"],
        "functions_involved": ["func1", "func2"],
        "data_transformations": "what happens to the data",
        "validation_checkpoints": "how to verify this stage works",
        "error_recovery": "what to do when this stage fails"
      }
    ],
    "output_generation": {
      "sqlite_database": "trust-debt-pipeline.db",
      "json_output": "1-indexed-keywords.json",
      "agent_2_requirements": "what Agent 2 expects from you",
      "validation_procedures": "how to verify output is correct"
    }
  },
  "manual_validation_procedures": {
    "database_validation": [
      {
        "check_name": "Schema Integrity",
        "procedure": "steps to verify database schema is correct",
        "sql_commands": "SELECT statements to verify data",
        "success_criteria": "what indicates success",
        "failure_indicators": "what indicates problems"
      }
    ],
    "keyword_validation": [
      {
        "check_name": "Extraction Completeness",
        "procedure": "steps to verify all keywords extracted",
        "validation_queries": "how to check keyword coverage",
        "success_criteria": "minimum keyword counts and quality metrics",
        "failure_indicators": "missing or malformed keywords"
      }
    ],
    "integration_validation": [
      {
        "check_name": "Agent 2 Compatibility",
        "procedure": "steps to verify Agent 2 can consume your output",
        "test_data": "sample data to test with",
        "success_criteria": "successful downstream processing",
        "failure_indicators": "integration failures"
      }
    ]
  },
  "complete_lifecycle_mapping": {
    "command_entry_points": [
      {
        "command": "intentguard 1",
        "entry_file": "file:line where processing starts",
        "argument_processing": "file:line where args are parsed",
        "initialization": "file:line where setup happens",
        "main_execution": "file:line where your logic runs",
        "cleanup": "file:line where cleanup happens",
        "exit_points": "file:line where execution ends"
      }
    ],
    "data_flow_architecture": {
      "input_sources": [
        {
          "source": "0-outcome-requirements.json",
          "processing_location": "file:line",
          "validation_location": "file:line",
          "error_handling": "file:line"
        }
      ],
      "processing_pipeline": [
        {
          "step": "Database Creation",
          "location": "file:line",
          "inputs": "what goes in",
          "outputs": "what comes out",
          "validation": "how to verify"
        }
      ],
      "output_destinations": [
        {
          "destination": "1-indexed-keywords.json",
          "generation_location": "file:line",
          "validation_location": "file:line",
          "consumer": "Agent 2"
        }
      ]
    }
  },
  "testing_and_validation_framework": {
    "unit_testing": {
      "test_files": "paths to test files",
      "test_commands": "npm test or other commands",
      "coverage_requirements": "minimum test coverage"
    },
    "integration_testing": {
      "mock_data_generation": "how to create test data",
      "end_to_end_testing": "how to test full pipeline",
      "regression_testing": "how to test you don't break things"
    },
    "manual_validation_in_claude": {
      "bucket_inspection": "how to manually verify 1-indexed-keywords.json",
      "database_queries": "SQL commands to verify database integrity",
      "pipeline_testing": "how to test your integration with other agents"
    }
  }
}
```

### STEP 4: IMPLEMENTATION WITH VALIDATION

**After completing the archaeological survey**, proceed with your database indexing and keyword extraction responsibilities, BUT with these requirements:

1. **Real-Time Validation**: After each processing step, use your documented validation procedures to verify correctness
2. **Manual Testing**: Use Claude's Read tool to inspect your output files and verify they meet specifications
3. **Integration Testing**: Verify that your output can be consumed by Agent 2
4. **Performance Monitoring**: Track processing time and resource usage
5. **Error Handling**: Implement robust error handling with clear error messages

### STEP 5: PIPELINE INTEGRATION EVIDENCE

**PROVIDE CONCRETE EVIDENCE** of your integration:

1. **Before/After Comparison**: Show the codebase state before and after your modifications
2. **Validation Results**: Demonstrate that all validation procedures pass
3. **Integration Testing**: Show that Agent 2 can successfully consume your output
4. **Performance Metrics**: Provide timing and resource usage statistics
5. **Error Recovery**: Demonstrate how your code handles error conditions

### SUCCESS CRITERIA

**Your Agent 1 execution is complete when you can demonstrate**:

✅ **Complete Codebase Mapping**: Every file and function you're responsible for is documented  
✅ **Manual Validation Capability**: You can validate your output using Claude tools  
✅ **Integration Evidence**: Agent 2 can successfully consume your output  
✅ **Pipeline Health**: Your modifications improve overall pipeline integrity  
✅ **Error Resilience**: Your code handles error conditions gracefully  
✅ **Performance Baseline**: You've established performance benchmarks  
✅ **Documentation Updates**: COMS.txt reflects your actual implementation  

### CRITICAL SUCCESS QUESTION

**At the end, you must be able to answer this question with specific file:line references:**

*"If the IntentGuard pipeline fails at your stage, what exact files and line numbers would you examine to diagnose the problem, and what specific validation procedures would you execute in Claude to verify the fix works?"*

This comprehensive approach transforms Agent 1 from a black-box processor into a fully integrated, maintainable, and manually validatable component of the IntentGuard Trust Debt analysis system.

## EXECUTION COMMAND

```bash
# Run this command to start Agent 1 with complete integration requirements:
intentguard 1
```

The agent will receive this complete prompt and must fulfill ALL requirements before considering the task complete.