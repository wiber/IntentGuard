# Functional Taxonomy Specification for IntentGuard Trust Debt Analysis

## Executive Summary

The current Trust Debt analysis fails due to abstract categories (A🚀 CoreEngine, B🔒 Documentation) that lack direct mapping to measurable outcomes. This specification defines a **functional taxonomy** where each category corresponds directly to pipeline agent outputs and measurable system functions.

## Problem Analysis

### Current System Failures
- **Grade D (UNINSURABLE)** - 19,148 Trust Debt units
- **10.3% Orthogonality** - Far above 1% threshold
- **12.98x Asymmetry Ratio** - Building more than documenting
- **Abstract Categories** - No direct code-to-category mapping

### Root Cause
Categories are **implied in outcomes** but not **derived from outcomes**. The real functional domains exist in agent responsibilities and JSON bucket outputs, not in high-level conceptual labels.

## New Functional Taxonomy

### A📊 SYSTEM HEALTH & GRADES
**Responsibility**: Report on analysis process legitimacy and methodology integrity

**Agent Ownership**: Agent 4 (Grades & Statistics Calculator)
**JSON Bucket**: `4-grades-statistics.json`

**Subcategories**:
- `A📊.1💎 Process Health` - Core methodology integrity grade
- `A📊.2🔥 Legitimacy Score` - Combined Trust Debt + Process Health
- `A📊.3📈 Asymmetry Ratio` - Intent vs Reality imbalance metric
- `A📊.4⚖️ Orthogonality Score` - Semantic independence measurement

**Matrix Position**: Diagonal dominance expected (self-consistency critical)
**Expected Units**: 500-800 (high activity, low drift - well-defined outputs)

### B💻 DATA & TAXONOMY
**Responsibility**: Foundational data management from raw keywords to validated categories

**Agent Ownership**: Agent 1 (Database Indexer) + Agent 2 (Category Generator)
**JSON Buckets**: `1-indexed-keywords.json`, `2-categories-balanced.json`

**Subcategories**:
- `B💻.1⚡ Raw Keywords` - Total indexed term count and distribution
- `B💻.2📐 Category Structure` - ShortLex-ordered balanced taxonomy
- `B💻.3🔐 Validation Rules` - Orthogonality and syntax filtering
- `B💻.4🎯 Semantic Mapping` - Business concept to code correlation

**Matrix Position**: Strong handoff pattern from B💻.1 to B💻.2
**Expected Units**: 1200-1500 (high data processing, moderate drift)

### C📋 ANALYSIS & NARRATIVES
**Responsibility**: High-level insights, recommendations, and actionable guidance

**Agent Ownership**: Agent 5 (Timeline Analyzer) + Agent 6 (Narrative Generator)
**JSON Buckets**: `5-timeline-history.json`, `6-analysis-narratives.json`

**Subcategories**:
- `C📋.1📜 Recommendations` - Prioritized actionable fixes
- `C📋.2⏳ Timeline Evolution` - Historical Trust Debt progression
- `C📋.3🔭 Cold Spot Analysis` - Low activity risk identification
- `C📋.4🎨 Visual Coherence` - Report presentation and UX integrity

**Matrix Position**: Off-diagonal activity (synthesis across domains)
**Expected Units**: 800-1000 (narrative synthesis, controlled drift)

### D🧠 PIPELINE & INTEGRATION
**Responsibility**: Multi-agent system operational health and code integration

**Agent Ownership**: Agent 0 (Parser) + Agent 3 (Matrix Builder) + Agent 7 (Report Generator)
**JSON Buckets**: `0-outcome-requirements.json`, `3-presence-matrix.json`, `trust-debt-report.html`

**Subcategories**:
- `D🧠.1🔗 Agent Handoffs` - Data integrity between pipeline stages
- `D🧠.2🤖 System Status` - Agent completion and validation states  
- `D🧠.3⚙️ Code Integration` - Dynamic modification of Trust Debt generators
- `D🧠.4📊 Report Compilation` - Final HTML generation and validation

**Matrix Position**: High diagonal (self-consistency) + controlled coupling
**Expected Units**: 600-900 (operational overhead, systematic management)

## Orthogonality Guarantees

### Sequential Independence
Each category represents a **distinct pipeline stage**:
- A📊 measures the **output quality**
- B💻 manages the **input data**  
- C📋 synthesizes the **insights**
- D🧠 coordinates the **process**

### Functional Boundaries
- **Data Flow**: B💻 → C📋 → A📊 (one-way dependencies)
- **Process Control**: D🧠 orchestrates but doesn't interfere with domain logic
- **Outcome Mapping**: Each subcategory maps to specific JSON bucket fields

### Validation Criteria
- **<1% Correlation**: Categories measure different functional domains
- **Diagonal Dominance**: Self-consistency within each functional area
- **Balanced Distribution**: No single category >40% of total debt

## Implementation Requirements

### Agent Modifications
1. **Agent 2** must generate categories using this functional taxonomy
2. **Agent 3** must build presence matrix using functional boundaries
3. **Agent 4** must calculate grades based on functional distribution
4. **Agent 7** must map HTML sections to functional categories

### JSON Bucket Structure
Each bucket must include `functionalCategory` and `outcomeMapping` fields:

```json
{
  "functionalCategory": "A📊.1💎",
  "outcomeMapping": {
    "agent": 4,
    "responsibility": "Process Health",
    "measurableOutcome": "methodology_integrity_score"
  }
}
```

### Matrix Validation
- Monitor correlation between functional categories
- Validate that categories remain <1% correlated
- Ensure diagonal cells show expected self-consistency patterns

## Expected Outcomes

### Performance Improvements
- **Grade C-B**: From current Grade D (UNINSURABLE)
- **<1% Correlation**: From current 10.3% 
- **Balanced Distribution**: No category >25% of total debt
- **Multiplicative Gains**: Move from additive to multiplicative performance

### Legitimacy Validation
- Direct traceability from report sections to generating code
- Auditable relationship between categories and agent outputs
- Measurable outcomes tied to specific JSON bucket fields
- Patent compliance through authentic orthogonality

## Migration Strategy

### Phase 1: Functional Category Generation
- Modify Agent 2 to use functional taxonomy
- Update category validation rules
- Test orthogonality with new structure

### Phase 2: Matrix Reconstruction  
- Agent 3 rebuilds presence matrix with functional boundaries
- Validate diagonal dominance patterns
- Measure correlation reduction

### Phase 3: Integration & Validation
- Agent 7 maps HTML report to functional categories
- Verify end-to-end outcome traceability
- Measure performance improvement

This functional taxonomy transforms Trust Debt analysis from abstract concepts to measurable, auditable outcomes directly tied to the multi-agent pipeline's actual responsibilities and deliverables.