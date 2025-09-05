# Claude-Flow Specification: Functional Taxonomy with 0-n Agent Iteration

## Overview

This specification extends claude-flow's hive-mind capabilities to support **iterative agent refinement** for achieving optimal functional taxonomies in Trust Debt analysis. Instead of static categories, agents dynamically converge on outcome-derived categories through validation loops.

## Core Principle: Iterative Convergence

### Problem Statement
Static taxonomies fail because they don't account for:
- **Repository Variability**: Different projects need different functional boundaries
- **Evolution**: Categories must adapt as the project grows
- **Validation**: Categories must prove their orthogonality through measurement

### Solution: 0-n Agent Iteration
- **Agent 2 (Category Generator)** spawns **0-n validation agents** until orthogonality <1%
- Each iteration refines categories based on **actual measurement results**
- **Convergence criteria** determine when taxonomy is stable and legitimate

## Functional Taxonomy Framework

### Base Categories (Required)
Every IntentGuard analysis must include these core functional domains:

```yaml
A📊_SYSTEM_HEALTH:
  responsibility: "Analysis process legitimacy and methodology integrity"
  owner_agents: [4]
  json_buckets: ["4-grades-statistics.json"]
  validation_criteria:
    orthogonality_threshold: 0.5%
    self_consistency_min: 85%
    expected_debt_range: [500, 800]

B💻_DATA_TAXONOMY:
  responsibility: "Data management from raw keywords to validated categories"
  owner_agents: [1, 2]
  json_buckets: ["1-indexed-keywords.json", "2-categories-balanced.json"]
  validation_criteria:
    handoff_integrity: 95%
    data_completeness: 100%
    expected_debt_range: [1200, 1500]

C📋_ANALYSIS_NARRATIVES:
  responsibility: "Insights, recommendations, and actionable guidance"
  owner_agents: [5, 6]
  json_buckets: ["5-timeline-history.json", "6-analysis-narratives.json"]
  validation_criteria:
    recommendation_completeness: 90%
    narrative_coherence: 80%
    expected_debt_range: [800, 1000]

D🧠_PIPELINE_INTEGRATION:
  responsibility: "Multi-agent system operational health"
  owner_agents: [0, 3, 7]
  json_buckets: ["0-outcome-requirements.json", "3-presence-matrix.json", "trust-debt-report.html"]
  validation_criteria:
    integration_success: 100%
    agent_completion: 100%
    expected_debt_range: [600, 900]
```

## Iterative Agent Protocol

### Phase 1: Initial Category Generation
**Agent 2** generates functional categories based on:
1. **Pipeline Outputs**: Analyze existing JSON buckets
2. **Agent Responsibilities**: Map agent functions to categories
3. **Repository Analysis**: Identify project-specific functional domains

```javascript
// Agent 2 Initial Generation
const functionalCategories = generateFromPipelineOutputs({
  baseTaxonomy: FUNCTIONAL_TAXONOMY_FRAMEWORK,
  agentOutputs: loadAllJSONBuckets(),
  repositoryContext: analyzeRepository(),
  customDomains: identifyProjectSpecificDomains()
});
```

### Phase 2: Validation Agent Spawning (0-n Iterations)
**Agent 2** spawns **validation agents** until convergence:

```javascript
let iteration = 0;
let converged = false;

while (!converged && iteration < maxIterations) {
  // Spawn validation agent
  const validator = spawnAgent({
    type: 'category-validator',
    id: `validator-${iteration}`,
    task: validateFunctionalTaxonomy(functionalCategories)
  });
  
  const validationResults = await validator.execute();
  
  // Check convergence criteria
  converged = checkConvergence(validationResults);
  
  if (!converged) {
    functionalCategories = refineTaxonomy(functionalCategories, validationResults);
    iteration++;
  }
}
```

### Phase 3: Convergence Validation
**Validation agents** check:
1. **Orthogonality**: Inter-category correlation <1%
2. **Balance**: No category >40% of total debt
3. **Completeness**: All agent outputs mapped to categories
4. **Stability**: Categories don't change between iterations

## Agent Iteration Patterns

### Pattern 1: Orthogonality Refinement
If correlation >1%, spawn **orthogonality-refiner** agents:

```yaml
orthogonality_refiner:
  purpose: "Reduce semantic overlap between categories"
  input: "High-correlation category pairs"
  output: "Refined category boundaries or merged categories"
  success_criteria: "Correlation <1%"
  max_iterations: 5
```

### Pattern 2: Balance Optimization  
If distribution uneven, spawn **balance-optimizer** agents:

```yaml
balance_optimizer:
  purpose: "Redistribute categories for even coverage"
  input: "Category distribution percentages"  
  output: "Split or merged categories for balance"
  success_criteria: "No category >25% of total debt"
  max_iterations: 3
```

### Pattern 3: Domain-Specific Extension
If project has unique characteristics, spawn **domain-specialist** agents:

```yaml
domain_specialist:
  purpose: "Add project-specific functional categories"
  input: "Repository analysis, custom requirements"
  output: "Additional categories beyond base framework"
  success_criteria: "Complete coverage of project functions"
  max_iterations: 2
```

## Claude-Flow Implementation

### Hive-Mind Configuration
```yaml
swarm_config:
  objective: "Functional Taxonomy Convergence"
  topology: "hierarchical"
  queen_type: "taxonomic-coordinator" 
  max_agents: 15  # Base 8 + up to 7 validation agents
  convergence_threshold: 0.01  # 1% correlation limit
  
worker_types:
  - category-generator      # Agent 2 equivalent
  - category-validator      # 0-n validation agents  
  - orthogonality-refiner   # Specialized refinement
  - balance-optimizer       # Distribution optimization
  - domain-specialist       # Project-specific extensions
```

### Spawning Logic
```javascript
// In claude-flow hive-mind coordinator
async function manageTaxonomicConvergence() {
  // Phase 1: Generate initial taxonomy
  const generator = await spawnAgent({
    type: 'category-generator',
    capabilities: ['pipeline-analysis', 'functional-mapping']
  });
  
  let taxonomy = await generator.execute();
  
  // Phase 2: Iterative validation
  let validationAgents = [];
  let iteration = 0;
  
  while (!isConverged(taxonomy) && iteration < 7) {
    const validator = await spawnAgent({
      type: 'category-validator',
      id: `iteration-${iteration}`,
      input: taxonomy
    });
    
    validationAgents.push(validator);
    const results = await validator.execute();
    
    if (results.needsRefinement) {
      taxonomy = await refineWithSpecialists(taxonomy, results);
    }
    
    iteration++;
  }
  
  return {
    finalTaxonomy: taxonomy,
    iterations: iteration,
    convergenceAchieved: isConverged(taxonomy)
  };
}
```

### Quality Gates
Each iteration must pass:
1. **Orthogonality Gate**: <1% correlation between categories
2. **Balance Gate**: Even distribution across categories
3. **Completeness Gate**: All agent outputs categorized
4. **Stability Gate**: Minimal change from previous iteration

## Integration with CLAUDE.md

Update the IntentGuard commands to use iterative taxonomy:

```bash
# Traditional static run
intentguard 2  # Agent 2 with static categories

# New iterative run  
intentguard 2 --iterate  # Agent 2 with 0-n validation cycles

# Claude-flow orchestrated run
claude-flow swarm "Generate functional taxonomy with iterative validation for IntentGuard Trust Debt analysis"
```

## Expected Outcomes

### Performance Metrics
- **Grade Improvement**: D → C-B through orthogonal categories
- **Correlation Reduction**: 10.3% → <1% 
- **Distribution Balance**: Even coverage across functional domains
- **Convergence Speed**: 2-4 iterations typical, max 7

### Legitimacy Validation
- **Traceability**: Direct mapping from categories to agent outputs
- **Auditability**: JSON bucket fields map to specific subcategories  
- **Reproducibility**: Same inputs yield same functional taxonomy
- **Patent Compliance**: Authentic orthogonality through measured validation

This specification transforms Trust Debt category generation from a static, abstract process into a dynamic, outcome-driven system that iteratively converges on the optimal functional taxonomy for each specific project.