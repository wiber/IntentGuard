# Agent 7 Maintenance Guide: Complete Tool Arsenal

## Overview
Agent 7 (Report Generator & Final Auditor) is responsible for generating the final HTML report and validating pipeline integrity. This guide documents all tools and workflows available through Claude for maintaining and developing Agent 7's capabilities.

## Core Tools & Usage

### 1. Read Tool - Code Inspection & Analysis
**Primary Usage:** Inspect implementation files, analyze bucket data, understand template structure

**Key Files to Read:**
```bash
# Primary implementation files
/Users/eliasmoosman/Documents/GitHub/IntentGuard/src/trust-debt-html-generator.js
/Users/eliasmoosman/Documents/GitHub/IntentGuard/src/trust-debt-pipeline-validator.js
/Users/eliasmoosman/Documents/GitHub/IntentGuard/trust-debt-report.html

# Agent bucket inputs  
/Users/eliasmoosman/Documents/GitHub/IntentGuard/0-outcome-requirements.json
/Users/eliasmoosman/Documents/GitHub/IntentGuard/1-indexed-keywords.json
# ... through 6-analysis-narratives.json

# Supporting files
/Users/eliasmoosman/Documents/GitHub/IntentGuard/src/trust-debt-final.js
/Users/eliasmoosman/Documents/GitHub/IntentGuard/src/trust-debt-comprehensive-html.js
```

**Usage Examples:**
- `Read trust-debt-report.html` - Inspect current HTML template structure
- `Read 6-analysis-narratives.json` - Check Agent 6 output for integration
- `Read src/trust-debt-html-generator.js offset=125 limit=100` - Examine generateHTML function

### 2. MultiEdit Tool - Batch Code Updates
**Primary Usage:** Update HTML template with real agent data, modify integration points across files

**Key Use Cases:**
- Update Executive Dashboard with real Agent 4 grades
- Replace placeholder data with actual agent outputs
- Batch update matrix visualization with Agent 3 data
- Modify recommendation sections with Agent 6 analysis

**Example Usage:**
```javascript
MultiEdit on trust-debt-report.html:
- Replace Trust Debt Grade placeholder with Agent 4 actual grade
- Update cold spots with Agent 6 real analysis  
- Insert timeline data from Agent 5
- Add asymmetric patterns from Agent 6
```

### 3. Write Tool - Generate New Components
**Primary Usage:** Create audit logs, generate integration modules, produce outputs

**Key Files to Write:**
- `7-audit-log.json` - Comprehensive pipeline validation results
- `agent-7-integration-module.js` - New integration components
- `pipeline-validation-report.md` - Detailed validation documentation

### 4. Bash Tool - Execution & Testing
**Primary Usage:** Execute IntentGuard commands, test integrations, validate pipeline

**Key Commands:**
```bash
# Execute Agent 7 directly
node src/trust-debt-html-generator.js

# Test pipeline integrity
node src/trust-debt-pipeline-validator.js  

# Run IntentGuard commands
./intentguard 7
./intentguard pipeline
./intentguard audit

# Validate HTML output
open trust-debt-report.html

# Test integration points
node -e "console.log(JSON.parse(require('fs').readFileSync('4-grades-statistics.json')).trust_debt_grade)"
```

### 5. Grep Tool - Pattern Search & Discovery
**Primary Usage:** Find integration points, locate function definitions, discover code patterns

**Key Search Patterns:**
```bash
# Find Agent 7 references
grep -r "agent.7\|Agent.7\|AGENT.7" src/

# Find integration functions
grep -r "generateHTML\|validatePipeline\|generateReport" src/

# Find bucket integration points
grep -r "outcome-requirements\|indexed-keywords\|analysis-narratives" src/

# Find HTML generation patterns
grep -r "trust-debt-report\.html\|generateHTML" src/
```

## Agent 7 Function Arsenal

### Core Functions Available Through Claude

#### 1. generateReport(bucketData)
**Description:** Generate complete HTML report from all agent buckets
**Usage:** `node src/trust-debt-html-generator.js`
**Inputs:** All 7 agent JSON buckets (0-6)
**Outputs:** `trust-debt-report.html` with integrated agent data
**Integration:** Combines Agent 0 outcomes, Agent 4 grades, Agent 6 analysis into final report

#### 2. validatePipelineIntegrity()
**Description:** Validate complete pipeline integrity across all 8 agents
**Usage:** `node src/trust-debt-pipeline-validator.js`
**Inputs:** Pipeline state and all agent outputs
**Outputs:** Validation results and issue identification
**Integration:** Cross-validates all agent data flows and dependencies

#### 3. updateHTMLTemplate(agentData)
**Description:** Update HTML template with real agent data  
**Usage:** `MultiEdit on trust-debt-report.html`
**Inputs:** Specific agent bucket data
**Outputs:** Updated HTML template sections
**Integration:** Replaces placeholder data with actual agent outputs

#### 4. auditPipelineExecution()
**Description:** Create comprehensive audit log of pipeline execution
**Usage:** `Write 7-audit-log.json`
**Inputs:** Validation results and cross-agent verification
**Outputs:** Detailed audit log with validation trail
**Integration:** Documents complete pipeline execution and integrity

#### 5. testIntegration()
**Description:** Test integration between agent outputs and HTML generation
**Usage:** `Bash commands for testing`
**Inputs:** Agent buckets and template files
**Outputs:** Integration validation results
**Integration:** Verifies data flows correctly from agents to final report

## Maintenance Workflows

### Daily Maintenance Workflow
1. **Health Check:** `Read 7-audit-log.json` - Check last pipeline execution status
2. **Bucket Validation:** `Read *-*.json` - Verify all agent outputs are present and valid
3. **Template Update:** `Read trust-debt-report.html` - Check if template needs real data updates
4. **Integration Test:** `Bash: node src/trust-debt-html-generator.js` - Test report generation
5. **Validation:** `Bash: node src/trust-debt-pipeline-validator.js` - Validate pipeline integrity

### Bug Fix Workflow
1. **Issue Identification:** `Grep` for error patterns in code
2. **Code Analysis:** `Read` affected implementation files 
3. **Fix Implementation:** `MultiEdit` or `Write` to fix issues
4. **Integration Test:** `Bash` commands to test fixes
5. **Validation:** Generate new audit log to confirm fixes

### Feature Enhancement Workflow
1. **Requirements Analysis:** `Read` current implementation and agent outputs
2. **Design Planning:** Understand integration points and data flows
3. **Implementation:** `Write` new modules or `MultiEdit` existing files
4. **Integration:** Update HTML template and validation logic
5. **Testing:** Full pipeline execution and validation

### Pipeline Validation Workflow  
1. **Agent Output Check:** `Read` all agent buckets (0-6) for completeness
2. **Data Flow Validation:** `Grep` for integration points across codebase
3. **HTML Integration:** `MultiEdit` to update template with real data
4. **Pipeline Execution:** `Bash` to run full pipeline validation
5. **Audit Generation:** `Write` comprehensive audit log with results

## Integration Points Documentation

### Bucket Integration Mapping
Each agent bucket integrates into specific HTML sections:

- **Agent 0 → Executive Dashboard + Pipeline Status**
- **Agent 1 → Keyword Statistics Display**  
- **Agent 2 → Matrix Headers + Category Structure**
- **Agent 3 → Matrix Grid Visualization**
- **Agent 4 → Executive Dashboard Grades**
- **Agent 5 → Timeline Evolution Section**
- **Agent 6 → Cold Spots + Asymmetric Patterns + Recommendations + AI Insights**

### Function Integration Mapping
Core functions map to specific implementation files:

- **generateHTML()** → `src/trust-debt-html-generator.js:125-1383`
- **validatePipeline()** → `src/trust-debt-pipeline-validator.js:26-54`  
- **loadAnalysis()** → `src/trust-debt-html-generator.js:34-40`
- **generateCrisisReport()** → `src/trust-debt-html-generator.js:56-120`

## Troubleshooting Guide

### Common Issues & Solutions

#### HTML Report Missing Agent Data
1. **Check:** `Read *-analysis-narratives.json` - Verify Agent 6 output exists
2. **Fix:** `MultiEdit trust-debt-report.html` - Update sections with real data
3. **Test:** `Bash: node src/trust-debt-html-generator.js` - Regenerate report

#### Pipeline Validation Failures  
1. **Diagnose:** `Bash: node src/trust-debt-pipeline-validator.js` - Run validation
2. **Analyze:** `Read 7-audit-log.json` - Check validation results
3. **Fix:** Update failing agent outputs or validation logic
4. **Retest:** Full pipeline execution to confirm fixes

#### Integration Point Failures
1. **Locate:** `Grep generateHTML` - Find integration function
2. **Inspect:** `Read src/trust-debt-html-generator.js` - Examine integration logic
3. **Update:** `MultiEdit` or `Write` to fix integration issues
4. **Validate:** Test integration with real agent data

## Success Metrics

### Code Maintenance Success
- [ ] All Agent 7 functions accessible via Claude tools
- [ ] Complete HTML template updatable with real agent data
- [ ] Pipeline validation executable and results interpretable  
- [ ] Integration points discoverable and modifiable
- [ ] Audit logs generated with comprehensive validation results

### Pipeline Integration Success
- [ ] All 7 agent buckets successfully integrated into final report
- [ ] HTML displays real data (not placeholders) from all agents
- [ ] Pipeline integrity validation passes across all 8 agents  
- [ ] Audit log contains complete cross-agent verification
- [ ] Final report meets all Agent 0 outcome requirements

This guide ensures Agent 7 remains fully maintainable and developable through Claude's available tools, enabling continuous improvement and reliable pipeline operation.