# IntentGuard Agent Codebase Integration Template

## Universal Agent Integration Protocol

This template provides the standardized approach for any IntentGuard pipeline agent to achieve complete codebase integration, manual validation capabilities, and end-to-end lifecycle understanding.

### Agent-Specific Adaptation Instructions

**For Agent X**: Replace `{AGENT_NUMBER}`, `{AGENT_NAME}`, and `{AGENT_RESPONSIBILITIES}` with your specific details:

- **Agent 0**: Outcome Requirements Parser → HTML analysis and requirement extraction
- **Agent 1**: Database Indexer & Keyword Extractor → SQLite operations and keyword processing
- **Agent 2**: Category Generator & Orthogonality Validator → Semantic categorization and balance validation
- **Agent 3**: ShortLex Validator & Matrix Builder → Matrix construction and ShortLex verification
- **Agent 4**: Grades & Statistics Calculator → Trust Debt grading and statistical analysis
- **Agent 5**: Timeline & Historical Analyzer → Git analysis and evolution tracking
- **Agent 6**: Analysis & Narrative Generator → Cold spot analysis and recommendation generation
- **Agent 7**: Report Generator & Final Auditor → HTML generation and pipeline validation

---

## PHASE 1: ARCHAEOLOGICAL CODEBASE SURVEY

### 1.1 Primary Responsibility Discovery

**DELIVERABLE**: `agent-{AGENT_NUMBER}-codebase-map.json`

```json
{
  "agent_info": {
    "number": {AGENT_NUMBER},
    "name": "{AGENT_NAME}",
    "keyword": "{AGENT_KEYWORD}",
    "primary_responsibility": "{AGENT_RESPONSIBILITIES}",
    "survey_timestamp": "YYYY-MM-DDTHH:mm:ssZ",
    "codebase_survey_complete": false
  },
  "file_analysis": {
    "total_js_files_scanned": 0,
    "relevant_files_identified": 0,
    "integration_points_mapped": 0,
    "validation_checkpoints_found": 0
  }
}
```

### 1.2 Systematic File Discovery

**Search Strategy**: Use Glob and Grep tools to systematically discover:

1. **Primary Implementation Files**:
   ```bash
   # Search patterns specific to your agent:
   src/trust-debt-*{KEYWORD_PATTERN}*.js
   src/agents/{AGENT_NAME}*.js
   src/{DOMAIN}/*.js
   ```

2. **Configuration and Schema Files**:
   ```bash
   *.json, *.sql, *.env, *.config.js
   package.json, package-lock.json
   .claude-flow/*, scripts/*
   ```

3. **Integration Interface Files**:
   ```bash
   # Files that consume your input:
   grep -r "{AGENT_NUMBER}-{OUTPUT_FILE}" src/
   # Files that provide your input:
   grep -r "{PREVIOUS_AGENT_OUTPUT}" src/
   ```

### 1.3 Code Responsibility Mapping

**For each discovered file, document**:

```json
{
  "file_path": "src/exact/path/file.js",
  "responsibility_level": "PRIMARY|SECONDARY|INTEGRATION|VALIDATION",
  "line_analysis": {
    "total_lines": 0,
    "responsibility_ranges": [
      {
        "start_line": 0,
        "end_line": 0,
        "function_name": "functionName",
        "purpose": "what this code does",
        "integration_type": "INPUT|PROCESSING|OUTPUT|VALIDATION",
        "dependencies": ["module1", "module2"],
        "dependents": ["agent2", "agent3"]
      }
    ]
  },
  "modification_requirements": "what changes you need to make",
  "testing_requirements": "how to validate this code works",
  "error_conditions": "what can go wrong and how to detect it"
}
```

---

## PHASE 2: COMPLETE LIFECYCLE INTEGRATION

### 2.1 End-to-End Execution Flow

**Map your agent's position in the complete IntentGuard lifecycle**:

```json
{
  "lifecycle_position": {
    "execution_order": {AGENT_NUMBER},
    "input_dependencies": ["{PREVIOUS_AGENT_OUTPUTS}"],
    "output_consumers": ["{NEXT_AGENT_INPUTS}"],
    "parallel_processes": ["{CONCURRENT_AGENTS}"],
    "validation_checkpoints": ["{VALIDATION_POINTS}"]
  },
  "data_transformation": {
    "input_format": "{INPUT_DATA_STRUCTURE}",
    "processing_stages": [
      {
        "stage_name": "stage1",
        "input_data": "what goes in",
        "processing_logic": "what happens",
        "output_data": "what comes out",
        "validation_criteria": "how to verify success",
        "error_handling": "what to do when things fail"
      }
    ],
    "output_format": "{OUTPUT_DATA_STRUCTURE}"
  }
}
```

### 2.2 Command-Line Integration Points

**Document ALL ways your agent can be invoked**:

```json
{
  "invocation_methods": {
    "direct_command": "intentguard {AGENT_NUMBER}",
    "npm_script": "npm run {AGENT_NUMBER}",
    "pipeline_integration": "intentguard pipeline",
    "debugging_mode": "intentguard {AGENT_NUMBER} --debug",
    "validation_mode": "intentguard {AGENT_NUMBER} --validate"
  },
  "command_processing": {
    "argument_parsing": "file:line where args are processed",
    "configuration_loading": "file:line where config is loaded",
    "initialization": "file:line where your agent starts",
    "execution": "file:line where main processing happens",
    "cleanup": "file:line where resources are released"
  }
}
```

---

## PHASE 3: MANUAL VALIDATION INFRASTRUCTURE

### 3.1 Bucket Validation Tools

**Create procedures for validating your output in Claude**:

```json
{
  "bucket_validation": {
    "output_file": "{AGENT_NUMBER}-{OUTPUT_NAME}.json",
    "validation_procedures": [
      {
        "check_name": "Schema Validation",
        "procedure": "steps to verify JSON schema compliance",
        "success_criteria": "what indicates success",
        "failure_indicators": "what indicates problems"
      },
      {
        "check_name": "Data Completeness",
        "procedure": "steps to verify all required data is present",
        "success_criteria": "completeness thresholds",
        "failure_indicators": "missing data patterns"
      },
      {
        "check_name": "Integration Compatibility",
        "procedure": "steps to verify next agent can consume your output",
        "success_criteria": "successful downstream processing",
        "failure_indicators": "integration failures"
      }
    ]
  }
}
```

### 3.2 Pipeline Health Monitoring

**Document health check procedures**:

```json
{
  "health_checks": {
    "pre_execution": [
      "verify input data availability",
      "check system resources",
      "validate configuration"
    ],
    "during_execution": [
      "monitor processing progress",
      "detect error conditions",
      "track performance metrics"
    ],
    "post_execution": [
      "verify output completeness",
      "validate data integrity",
      "confirm integration readiness"
    ]
  },
  "performance_benchmarks": {
    "execution_time": "acceptable time ranges",
    "memory_usage": "acceptable memory limits",
    "data_throughput": "processing rate expectations"
  }
}
```

### 3.3 Integration Testing Protocols

**Document how to test your agent's integration**:

```json
{
  "integration_testing": {
    "upstream_simulation": {
      "mock_input_generation": "how to create test input data",
      "boundary_condition_testing": "edge cases to test",
      "error_condition_simulation": "how to test error handling"
    },
    "downstream_validation": {
      "output_format_verification": "ensure next agent can consume output",
      "data_quality_checks": "verify output meets quality standards",
      "performance_impact_assessment": "measure impact on pipeline performance"
    },
    "end_to_end_validation": {
      "full_pipeline_testing": "how to test complete pipeline with your changes",
      "regression_testing": "how to ensure you don't break existing functionality",
      "performance_regression_detection": "how to detect performance degradation"
    }
  }
}
```

---

## PHASE 4: CODE MAINTENANCE PROCEDURES

### 4.1 Modification Protocols

**Document safe code modification procedures**:

```json
{
  "code_modification": {
    "before_changes": [
      "backup current implementation",
      "document baseline behavior",
      "identify all integration points"
    ],
    "during_changes": [
      "maintain backward compatibility",
      "preserve integration interfaces",
      "implement comprehensive error handling"
    ],
    "after_changes": [
      "run full validation suite",
      "test integration points",
      "update documentation"
    ]
  }
}
```

### 4.2 Version Control Integration

**Document git workflow for your changes**:

```json
{
  "version_control": {
    "branch_naming": "agent-{AGENT_NUMBER}-{CHANGE_TYPE}",
    "commit_message_format": "Agent {AGENT_NUMBER}: {CHANGE_DESCRIPTION}",
    "testing_requirements": "all tests must pass before commit",
    "documentation_updates": "COMS.txt and README updates required"
  }
}
```

---

## PHASE 5: AGENT-SPECIFIC IMPLEMENTATION DETAILS

### Agent 0: Outcome Requirements Parser
```json
{
  "specific_responsibilities": {
    "html_parsing": "trust-debt-report.html analysis",
    "outcome_extraction": "67+ outcome identification",
    "agent_mapping": "responsibility assignment to agents 1-7",
    "validation_criteria": "completeness and accuracy requirements"
  },
  "integration_points": {
    "input_sources": ["trust-debt-report.html", "repository structure"],
    "output_consumers": ["Agent 1 database schema design"],
    "validation_dependencies": ["HTML structure, outcome completeness"]
  }
}
```

### Agent 1: Database Indexer & Keyword Extractor
```json
{
  "specific_responsibilities": {
    "sqlite_operations": "database creation, indexing, querying",
    "keyword_extraction": "semantic analysis and normalization",
    "intent_reality_separation": "domain classification",
    "pattern_learning": "regex improvement and optimization"
  },
  "integration_points": {
    "input_sources": ["0-outcome-requirements.json", "repository files", "git history"],
    "output_consumers": ["Agent 2 category generation"],
    "validation_dependencies": ["database integrity", "keyword accuracy", "semantic clustering"]
  }
}
```

### Agent 2: Category Generator & Orthogonality Validator
```json
{
  "specific_responsibilities": {
    "category_generation": "semantic orthogonal category creation",
    "balance_optimization": "mention distribution balancing",
    "orthogonality_validation": ">95% orthogonality requirement",
    "coefficient_variation": "<30% CV requirement"
  },
  "integration_points": {
    "input_sources": ["1-indexed-keywords.json"],
    "output_consumers": ["Agent 3 matrix construction"],
    "validation_dependencies": ["orthogonality scores", "balance metrics", "semantic validity"]
  }
}
```

### Agent 3: ShortLex Validator & Matrix Builder
```json
{
  "specific_responsibilities": {
    "shortlex_validation": "mathematical ordering verification",
    "matrix_construction": "presence matrix population",
    "diagonal_validation": "unity diagonal requirement",
    "asymmetry_calculation": "intent-reality differential analysis"
  },
  "integration_points": {
    "input_sources": ["2-categories-balanced.json"],
    "output_consumers": ["Agent 4 grade calculations"],
    "validation_dependencies": ["matrix completeness", "mathematical correctness", "ShortLex compliance"]
  }
}
```

### Agent 4: Grades & Statistics Calculator
```json
{
  "specific_responsibilities": {
    "trust_debt_calculation": "patent formula application",
    "process_health_grading": "multiplicative health scoring",
    "legitimacy_assessment": "statistical legitimacy validation",
    "threshold_application": "grade boundary enforcement"
  },
  "integration_points": {
    "input_sources": ["3-presence-matrix.json"],
    "output_consumers": ["Agent 5 timeline analysis", "Agent 6 narrative generation"],
    "validation_dependencies": ["mathematical accuracy", "grade consistency", "statistical validity"]
  }
}
```

### Agent 5: Timeline & Historical Analyzer
```json
{
  "specific_responsibilities": {
    "git_analysis": "commit history processing",
    "evolution_tracking": "Trust Debt progression analysis",
    "trend_identification": "historical pattern recognition",
    "predictive_modeling": "future projection calculations"
  },
  "integration_points": {
    "input_sources": ["1-indexed-keywords.json", "4-grades-statistics.json", "git history"],
    "output_consumers": ["Agent 6 narrative context"],
    "validation_dependencies": ["timeline accuracy", "trend significance", "prediction validity"]
  }
}
```

### Agent 6: Analysis & Narrative Generator
```json
{
  "specific_responsibilities": {
    "cold_spot_analysis": "matrix sparse region identification",
    "asymmetric_pattern_detection": "intent-reality imbalance analysis",
    "recommendation_generation": "actionable intervention prioritization",
    "narrative_synthesis": "comprehensive insight compilation"
  },
  "integration_points": {
    "input_sources": ["all prior agent outputs 0-5"],
    "output_consumers": ["Agent 7 report generation"],
    "validation_dependencies": ["analysis accuracy", "recommendation feasibility", "narrative coherence"]
  }
}
```

### Agent 7: Report Generator & Final Auditor
```json
{
  "specific_responsibilities": {
    "html_generation": "comprehensive report compilation",
    "template_integration": "existing template enhancement",
    "data_binding": "agent output integration",
    "pipeline_auditing": "end-to-end integrity validation"
  },
  "integration_points": {
    "input_sources": ["all agent outputs 0-6"],
    "output_consumers": ["final report consumers"],
    "validation_dependencies": ["report completeness", "visual accuracy", "pipeline integrity"]
  }
}
```

---

## SUCCESS CRITERIA CHECKLIST

**Phase 1 Complete When**:
- [ ] All relevant code files identified and mapped
- [ ] Responsibility boundaries clearly documented
- [ ] Integration points fully understood
- [ ] Validation checkpoints established

**Phase 2 Complete When**:
- [ ] Complete lifecycle position understood
- [ ] Data transformation pipeline mapped
- [ ] Command-line integration documented
- [ ] Error handling pathways identified

**Phase 3 Complete When**:
- [ ] Manual validation procedures created
- [ ] Health monitoring protocols established
- [ ] Integration testing framework documented
- [ ] Performance benchmarks defined

**Phase 4 Complete When**:
- [ ] Code modification procedures documented
- [ ] Version control workflow established
- [ ] Testing requirements clarified
- [ ] Maintenance protocols defined

**Phase 5 Complete When**:
- [ ] Agent-specific implementation details captured
- [ ] All integration dependencies mapped
- [ ] Validation criteria clearly defined
- [ ] Success metrics established

This comprehensive template ensures every IntentGuard pipeline agent achieves complete codebase integration, manual validation capabilities, and maintainable, auditable implementation.