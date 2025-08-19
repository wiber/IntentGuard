#!/usr/bin/env node

/**
 * FIM-Based Trust Debt Analyzer
 * Implements the Shape = Symbol unity principle from the patent
 * Uses M = S × E framework for precise measurement
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * M = S × E Framework Implementation
 * 
 * M (Momentum): Measurable outcomes (Trust Debt score, 361x performance)
 * S (Skill): Hybrid Orthogonal Decomposition process
 * E (Environment): Fractal Working Memory structure
 */

// The Unity Principle: Shape IS Symbol
// Position in hierarchy = Semantic meaning = Hardware pattern
const FIM_STRUCTURE = {
  // Level 0: Root (Organizational Intent)
  'Θ': {
    name: 'ThetaCoach Intent',
    description: 'Strategic Nudges via Un-Robocall™',
    level: 0,
    weight: 1.0,
    children: ['A', 'B', 'C', 'D', 'E']
  },
  
  // Level 1: Primary Dimensions (Orthogonal by Design)
  'A': {
    name: 'Timing Precision',
    description: '30-second perfect moment delivery',
    level: 1,
    weight: 0.25,
    orthogonalityTarget: 0.1, // ε ≈ 0.1 from patent
    children: ['A1', 'A2', 'A3']
  },
  'B': {
    name: 'Drift Measurement', 
    description: 'Trust Debt quantification',
    level: 1,
    weight: 0.25,
    orthogonalityTarget: 0.1,
    children: ['B1', 'B2', 'B3']
  },
  'C': {
    name: 'Pattern Recognition',
    description: 'Named pattern identification',
    level: 1,
    weight: 0.20,
    orthogonalityTarget: 0.1,
    children: ['C1', 'C2', 'C3']
  },
  'D': {
    name: 'Recognition Engineering',
    description: 'Oh moment creation',
    level: 1,
    weight: 0.15,
    orthogonalityTarget: 0.1,
    children: ['D1', 'D2', 'D3']
  },
  'E': {
    name: 'Geometric Precision',
    description: '361x alignment accuracy',
    level: 1,
    weight: 0.15,
    orthogonalityTarget: 0.1,
    children: ['E1', 'E2', 'E3']
  },
  
  // Level 2: Subcategories (Wedge Issues)
  'A1': { name: 'Moment Selection', level: 2, weight: 0.4 },
  'A2': { name: 'Message Brevity', level: 2, weight: 0.35 },
  'A3': { name: 'Acceleration Claim', level: 2, weight: 0.25 },
  
  'B1': { name: 'Quantification', level: 2, weight: 0.4 },
  'B2': { name: 'Visibility', level: 2, weight: 0.35 },
  'B3': { name: 'Accumulation', level: 2, weight: 0.25 },
  
  'C1': { name: 'Memorable Names', level: 2, weight: 0.4 },
  'C2': { name: 'Cost Articulation', level: 2, weight: 0.35 },
  'C3': { name: 'Pattern Frequency', level: 2, weight: 0.25 },
  
  'D1': { name: 'Recognition Triggers', level: 2, weight: 0.4 },
  'D2': { name: 'Daily Cadence', level: 2, weight: 0.35 },
  'D3': { name: 'Breakthrough Quality', level: 2, weight: 0.25 },
  
  'E1': { name: 'Precision Focus', level: 2, weight: 0.4 },
  'E2': { name: 'Mathematical Grounding', level: 2, weight: 0.35 },
  'E3': { name: 'Reproducibility', level: 2, weight: 0.25 }
};

// Indicators for each dimension (from patent's semantic volatility concept)
const SEMANTIC_INDICATORS = {
  'A1': {
    positive: ['perfect timing', 'maximum receptivity', 'precise moment'],
    negative: ['whenever', 'random', 'bulk'],
    volatility: 0.15 // δᵥ semantic volatility
  },
  'A2': {
    positive: ['30 seconds', 'one question', 'brief'],
    negative: ['long', 'multiple', 'complex'],
    volatility: 0.12
  },
  'A3': {
    positive: ['30% acceleration', 'measurable improvement', 'guaranteed'],
    negative: ['maybe', 'could', 'might'],
    volatility: 0.18
  },
  'B1': {
    positive: ['73/100', 'score', 'quantified', 'measured'],
    negative: ['feeling', 'sense', 'vague'],
    volatility: 0.20
  },
  'B2': {
    positive: ['visible', 'revealed', 'exposed', 'clear'],
    negative: ['hidden', 'unknown', 'mysterious'],
    volatility: 0.14
  },
  'B3': {
    positive: ['0.3% daily', 'compound', 'accumulating'],
    negative: ['static', 'fixed', 'stable'],
    volatility: 0.16
  },
  'C1': {
    positive: ['thursday panic', 'memorable name', 'catchy'],
    negative: ['pattern 1', 'issue A', 'generic'],
    volatility: 0.22
  },
  'C2': {
    positive: ['12 hours/week', '$47K/year', 'specific cost'],
    negative: ['some impact', 'affects things', 'costs time'],
    volatility: 0.19
  },
  'C3': {
    positive: ['weekly', 'daily', 'predictable'],
    negative: ['sometimes', 'random', 'varies'],
    volatility: 0.13
  },
  'D1': {
    positive: ['remember when', 'you know when', 'that moment'],
    negative: ['let me explain', 'theory says', 'framework'],
    volatility: 0.17
  },
  'D2': {
    positive: ['daily oh moment', 'every day', 'consistent'],
    negative: ['occasionally', 'sometimes', 'when needed'],
    volatility: 0.11
  },
  'D3': {
    positive: ['breakthrough', 'revelation', 'insight'],
    negative: ['minor', 'incremental', 'small'],
    volatility: 0.21
  },
  'E1': {
    positive: ['361x precision', 'exact alignment', 'geometric'],
    negative: ['361x speed', 'faster', 'quick'],
    volatility: 0.25
  },
  'E2': {
    positive: ['mathematical', 'formula', 'calculated'],
    negative: ['intuitive', 'feeling', 'approximate'],
    volatility: 0.23
  },
  'E3': {
    positive: ['73% reproducible', 'consistent', 'reliable'],
    negative: ['varies', 'unpredictable', 'random'],
    volatility: 0.18
  }
};

class FIMTrustDebtAnalyzer {
  
  /**
   * Analyze content using the M = S × E framework
   */
  analyzeFIM(content) {
    const analysis = {
      timestamp: new Date().toISOString(),
      
      // E: Environment (Structure)
      environment: this.analyzeEnvironment(content),
      
      // S: Skill (Process)
      skill: this.analyzeSkill(content),
      
      // M: Momentum (Result)
      momentum: null, // Calculated from S × E
      
      // Trust Debt using Black-Scholes framework
      trustDebt: null,
      
      // Detailed prompts for improvement
      prompts: [],
      
      // Unity violations (Shape ≠ Symbol)
      violations: []
    };
    
    // Calculate M = S × E
    analysis.momentum = this.calculateMomentum(analysis.environment, analysis.skill);
    
    // Calculate Trust Debt using Black-Scholes-inspired formula
    analysis.trustDebt = this.calculateTrustDebt(analysis);
    
    // Generate improvement prompts
    analysis.prompts = this.generateFIMPrompts(analysis);
    
    // Identify unity violations
    analysis.violations = this.findUnityViolations(analysis);
    
    return analysis;
  }
  
  /**
   * E: Analyze Environment (Fractal Working Memory structure)
   */
  analyzeEnvironment(content) {
    const environment = {
      depth: 0,
      nodes: {},
      hierarchyIntegrity: 100,
      positionSemanticAlignment: 100
    };
    
    // Analyze each node in the FIM structure
    for (const [key, node] of Object.entries(FIM_STRUCTURE)) {
      if (node.level <= 2) { // Only analyze up to level 2 for MVP
        const nodeAnalysis = this.analyzeNode(content, key, node);
        environment.nodes[key] = nodeAnalysis;
        
        // Track max depth
        environment.depth = Math.max(environment.depth, node.level);
      }
    }
    
    // Calculate hierarchy integrity (how well structure is preserved)
    environment.hierarchyIntegrity = this.calculateHierarchyIntegrity(environment.nodes);
    
    // Calculate position-semantic alignment (Shape = Symbol score)
    environment.positionSemanticAlignment = this.calculatePositionAlignment(environment.nodes);
    
    return environment;
  }
  
  /**
   * S: Analyze Skill (Hybrid Orthogonal Decomposition process)
   */
  analyzeSkill(content) {
    const skill = {
      orthogonality: {},
      decompositionQuality: 100,
      intentPreservation: 100,
      wedgeAmplification: 0
    };
    
    // Calculate orthogonality between primary dimensions
    const primaryDimensions = ['A', 'B', 'C', 'D', 'E'];
    for (let i = 0; i < primaryDimensions.length; i++) {
      for (let j = i + 1; j < primaryDimensions.length; j++) {
        const correlation = this.calculateCorrelation(
          content,
          primaryDimensions[i],
          primaryDimensions[j]
        );
        
        const key = `${primaryDimensions[i]}-${primaryDimensions[j]}`;
        skill.orthogonality[key] = {
          correlation,
          withinTarget: Math.abs(correlation) <= 0.1, // ε ≈ 0.1
          deviation: Math.abs(correlation - 0)
        };
      }
    }
    
    // Calculate decomposition quality
    skill.decompositionQuality = this.calculateDecompositionQuality(skill.orthogonality);
    
    // Calculate intent preservation
    skill.intentPreservation = this.calculateIntentPreservation(content);
    
    // Calculate wedge amplification (how well we amplify differences)
    skill.wedgeAmplification = this.calculateWedgeAmplification(content);
    
    return skill;
  }
  
  /**
   * M: Calculate Momentum (S × E)
   */
  calculateMomentum(environment, skill) {
    // From patent: M = S × E
    // Where momentum is the multiplicative effect of skill applied to environment
    
    const environmentScore = (
      environment.hierarchyIntegrity * 0.5 +
      environment.positionSemanticAlignment * 0.5
    ) / 100;
    
    const skillScore = (
      skill.decompositionQuality * 0.4 +
      skill.intentPreservation * 0.4 +
      skill.wedgeAmplification * 0.2
    ) / 100;
    
    // The multiplicative effect (leveraged by depth)
    const depthLeverage = Math.pow(1.5, environment.depth); // Exponential with depth
    
    return {
      raw: skillScore * environmentScore,
      leveraged: skillScore * environmentScore * depthLeverage,
      potential361x: (skillScore * environmentScore * depthLeverage) * 361,
      components: {
        environment: environmentScore,
        skill: skillScore,
        leverage: depthLeverage
      }
    };
  }
  
  /**
   * Calculate Trust Debt using Black-Scholes-inspired framework
   */
  calculateTrustDebt(analysis) {
    // From patent: Trust Debt as options pricing
    // TD = Drift × (Intent - Reality) with volatility adjustment
    
    const intent = 100; // Perfect alignment target
    const reality = analysis.momentum.raw * 100; // Current alignment
    const drift = Math.abs(intent - reality);
    
    // Calculate semantic volatility (σ) across all dimensions
    let totalVolatility = 0;
    let dimensionCount = 0;
    
    for (const [key, node] of Object.entries(analysis.environment.nodes)) {
      if (SEMANTIC_INDICATORS[key]) {
        totalVolatility += SEMANTIC_INDICATORS[key].volatility;
        dimensionCount++;
      }
    }
    
    const avgVolatility = dimensionCount > 0 ? totalVolatility / dimensionCount : 0.15;
    
    // Black-Scholes-inspired Trust Debt calculation
    // Using simplified version for MVP
    const timeToExpiry = 1; // 1 year horizon
    const riskFreeRate = 0.03; // 3% baseline drift
    
    // Trust Debt = Drift × Volatility × Time factor
    const trustDebtScore = 100 - (drift * (1 + avgVolatility) * Math.sqrt(timeToExpiry));
    
    return {
      score: Math.max(0, Math.min(100, Math.round(trustDebtScore))),
      drift: drift.toFixed(1),
      volatility: (avgVolatility * 100).toFixed(1),
      dailyAccumulation: 0.3, // From patent claim
      projectedAnnual: drift * 365 * 0.003, // Compound effect
      insurabilityThreshold: trustDebtScore >= 70,
      components: {
        intent,
        reality: reality.toFixed(1),
        drift: drift.toFixed(1),
        volatility: avgVolatility
      }
    };
  }
  
  /**
   * Analyze individual node in FIM structure
   */
  analyzeNode(content, key, node) {
    const lowerContent = content.toLowerCase();
    const indicators = SEMANTIC_INDICATORS[key];
    
    if (!indicators) {
      return { score: 50, hits: 0, misses: 0 };
    }
    
    let hits = 0;
    let misses = 0;
    
    // Count positive indicators
    indicators.positive.forEach(term => {
      const regex = new RegExp(term, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) hits += matches.length;
    });
    
    // Count negative indicators
    indicators.negative.forEach(term => {
      const regex = new RegExp(term, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) misses += matches.length;
    });
    
    const total = hits + misses;
    const score = total > 0 ? (hits / total) * 100 : 50;
    
    return {
      score: Math.round(score),
      hits,
      misses,
      volatility: indicators.volatility
    };
  }
  
  /**
   * Calculate correlation between dimensions (for orthogonality)
   */
  calculateCorrelation(content, dim1, dim2) {
    // Simplified correlation for MVP
    // In production, would use proper statistical correlation
    
    const node1 = FIM_STRUCTURE[dim1];
    const node2 = FIM_STRUCTURE[dim2];
    
    if (!node1 || !node2) return 0;
    
    // Check for term overlap (indicates correlation)
    let overlap = 0;
    let total = 0;
    
    node1.children?.forEach(child1 => {
      const indicators1 = SEMANTIC_INDICATORS[child1];
      if (!indicators1) return;
      
      node2.children?.forEach(child2 => {
        const indicators2 = SEMANTIC_INDICATORS[child2];
        if (!indicators2) return;
        
        // Check for overlapping indicators
        indicators1.positive.forEach(term1 => {
          indicators2.positive.forEach(term2 => {
            total++;
            if (term1 === term2 || term1.includes(term2) || term2.includes(term1)) {
              overlap++;
            }
          });
        });
      });
    });
    
    return total > 0 ? overlap / total : 0;
  }
  
  /**
   * Calculate hierarchy integrity
   */
  calculateHierarchyIntegrity(nodes) {
    let totalWeight = 0;
    let validWeight = 0;
    
    // Check if weights sum correctly at each level
    ['A', 'B', 'C', 'D', 'E'].forEach(key => {
      const node = FIM_STRUCTURE[key];
      totalWeight += node.weight;
      if (Math.abs(node.weight - (1/5)) < 0.15) { // Allow some deviation
        validWeight += node.weight;
      }
    });
    
    // Weights should sum to ~1.0
    const weightIntegrity = Math.abs(1.0 - totalWeight) < 0.01 ? 100 : 80;
    
    // Check structural completeness
    const structuralIntegrity = (validWeight / totalWeight) * 100;
    
    return (weightIntegrity + structuralIntegrity) / 2;
  }
  
  /**
   * Calculate position-semantic alignment (Shape = Symbol)
   */
  calculatePositionAlignment(nodes) {
    let alignmentScore = 0;
    let nodeCount = 0;
    
    for (const [key, analysis] of Object.entries(nodes)) {
      if (analysis.score !== undefined) {
        const node = FIM_STRUCTURE[key];
        if (!node) continue;
        
        // Higher level nodes should have higher scores (they're more important)
        const expectedScore = node.level === 0 ? 90 : node.level === 1 ? 75 : 60;
        const deviation = Math.abs(analysis.score - expectedScore);
        
        // Score based on how close actual is to expected
        alignmentScore += Math.max(0, 100 - deviation);
        nodeCount++;
      }
    }
    
    return nodeCount > 0 ? alignmentScore / nodeCount : 50;
  }
  
  /**
   * Calculate decomposition quality
   */
  calculateDecompositionQuality(orthogonality) {
    let withinTarget = 0;
    let total = 0;
    
    for (const [key, data] of Object.entries(orthogonality)) {
      if (data.withinTarget) withinTarget++;
      total++;
    }
    
    return total > 0 ? (withinTarget / total) * 100 : 0;
  }
  
  /**
   * Calculate intent preservation
   */
  calculateIntentPreservation(content) {
    // Check for core intent markers
    const intentMarkers = [
      'strategic nudges',
      'un-robocall',
      '30 seconds',
      '30% acceleration',
      'trust debt',
      'oh moment',
      '361x precision'
    ];
    
    const lowerContent = content.toLowerCase();
    let preserved = 0;
    
    intentMarkers.forEach(marker => {
      if (lowerContent.includes(marker)) preserved++;
    });
    
    return (preserved / intentMarkers.length) * 100;
  }
  
  /**
   * Calculate wedge amplification
   */
  calculateWedgeAmplification(content) {
    // Check for amplified differences between similar concepts
    const wedgePairs = [
      { term1: 'precision', term2: 'speed', shouldDiffer: true },
      { term1: 'recognition', term2: 'teaching', shouldDiffer: true },
      { term1: 'quantified', term2: 'feeling', shouldDiffer: true }
    ];
    
    const lowerContent = content.toLowerCase();
    let amplification = 0;
    
    wedgePairs.forEach(pair => {
      const has1 = lowerContent.includes(pair.term1);
      const has2 = lowerContent.includes(pair.term2);
      
      if (pair.shouldDiffer && has1 && !has2) {
        amplification += 33.3; // Good amplification
      } else if (pair.shouldDiffer && !has1 && has2) {
        amplification -= 16.7; // Wrong direction
      }
    });
    
    return Math.max(0, Math.min(100, amplification));
  }
  
  /**
   * Find Unity Principle violations (Shape ≠ Symbol)
   */
  findUnityViolations(analysis) {
    const violations = [];
    
    // Check for position-meaning mismatches
    if (analysis.environment.positionSemanticAlignment < 70) {
      violations.push({
        type: 'SHAPE_SYMBOL_MISMATCH',
        severity: 'HIGH',
        description: 'Position in hierarchy doesn\'t match semantic importance',
        impact: 'Breaks the Unity Principle, preventing 361x gains'
      });
    }
    
    // Check for orthogonality violations
    for (const [key, data] of Object.entries(analysis.skill.orthogonality)) {
      if (!data.withinTarget && data.deviation > 0.2) {
        violations.push({
          type: 'ORTHOGONALITY_VIOLATION',
          severity: 'MEDIUM',
          description: `Dimensions ${key} are correlated (ρ=${data.correlation.toFixed(2)})`,
          impact: 'Reduces multiplicative leverage from (t/c)^E'
        });
      }
    }
    
    // Check for intent drift
    if (analysis.skill.intentPreservation < 60) {
      violations.push({
        type: 'INTENT_DRIFT',
        severity: 'HIGH',
        description: 'Core intent markers missing from content',
        impact: 'Trust Debt accumulating at >0.3% daily'
      });
    }
    
    return violations;
  }
  
  /**
   * Generate detailed FIM improvement prompts
   */
  generateFIMPrompts(analysis) {
    const prompts = [];
    
    // Main improvement prompt
    prompts.push({
      title: 'FIM Alignment Improvement Strategy',
      priority: 'CRITICAL',
      content: `
# Trust Debt FIM Analysis Report

## Unity Principle Status (Shape = Symbol)
- Position-Semantic Alignment: ${analysis.environment.positionSemanticAlignment.toFixed(1)}%
- Hierarchy Integrity: ${analysis.environment.hierarchyIntegrity.toFixed(1)}%
- ${analysis.violations.filter(v => v.type === 'SHAPE_SYMBOL_MISMATCH').length > 0 ? '⚠️ UNITY VIOLATION DETECTED' : '✅ Unity Maintained'}

## M = S × E Framework Results

### E (Environment/Structure): ${(analysis.momentum.components.environment * 100).toFixed(1)}%
- Depth: ${analysis.environment.depth} levels
- Nodes Analyzed: ${Object.keys(analysis.environment.nodes).length}
- Hierarchy Integrity: ${analysis.environment.hierarchyIntegrity.toFixed(1)}%

### S (Skill/Process): ${(analysis.momentum.components.skill * 100).toFixed(1)}%
- Orthogonality: ${analysis.skill.decompositionQuality.toFixed(1)}%
- Intent Preservation: ${analysis.skill.intentPreservation.toFixed(1)}%
- Wedge Amplification: ${analysis.skill.wedgeAmplification.toFixed(1)}%

### M (Momentum/Result): ${(analysis.momentum.raw * 100).toFixed(1)}%
- Raw Score: ${(analysis.momentum.raw * 100).toFixed(1)}
- Leveraged (with depth): ${(analysis.momentum.leveraged * 100).toFixed(1)}
- Potential 361x: ${analysis.momentum.potential361x.toFixed(0)}x current performance

## Trust Debt (Black-Scholes Framework)
- **Score: ${analysis.trustDebt.score}/100**
- Drift Rate: ${analysis.trustDebt.drift}%
- Semantic Volatility: ${analysis.trustDebt.volatility}%
- Daily Accumulation: ${analysis.trustDebt.dailyAccumulation}%
- Projected Annual Debt: ${analysis.trustDebt.projectedAnnual.toFixed(1)}%
- **Insurable: ${analysis.trustDebt.insurabilityThreshold ? 'YES ✅' : 'NO ❌'}**

## Critical Improvements Required

${this.generateCriticalImprovements(analysis)}

## Specific Action Items

${this.generateActionItems(analysis)}

## Validation Metrics
After improvements, verify:
- [ ] Trust Debt Score ≥ 70 (insurability threshold)
- [ ] Orthogonality |ρ| < 0.1 for all dimension pairs
- [ ] Position-Semantic Alignment > 80%
- [ ] Intent Preservation > 85%
- [ ] Zero Unity Principle violations

## Implementation Template

\`\`\`markdown
# Aligned Content Template

## Strategic Nudge (A: ${analysis.environment.nodes['A']?.score || 0}% → 85%)
"One breakthrough question, 30 seconds, at your moment of maximum receptivity.
Guaranteed 30% acceleration toward your specific goal."

## Trust Debt Measurement (B: ${analysis.environment.nodes['B']?.score || 0}% → 85%)
"Your Trust Debt Score: 73/100
Daily drift: 0.3%
Accumulated debt: $47K/month"

## Pattern Recognition (C: ${analysis.environment.nodes['C']?.score || 0}% → 85%)
"The 'Thursday Panic Pattern' - that weekly scramble costing 12 hours."

## Oh Moment Engineering (D: ${analysis.environment.nodes['D']?.score || 0}% → 85%)
"Remember yesterday at 3pm when everything clicked? We triggered that."

## 361x Precision (E: ${analysis.environment.nodes['E']?.score || 0}% → 85%)
"361x precision in semantic alignment - geometric, mathematical, reproducible."
\`\`\`
      `.trim()
    });
    
    // Add violation-specific prompts
    analysis.violations.forEach(violation => {
      prompts.push({
        title: `Fix ${violation.type}`,
        priority: violation.severity,
        content: `
## Violation: ${violation.type}

**Description:** ${violation.description}
**Impact:** ${violation.impact}
**Severity:** ${violation.severity}

### Resolution Steps:
${this.getViolationResolution(violation)}
        `.trim()
      });
    });
    
    return prompts;
  }
  
  generateCriticalImprovements(analysis) {
    const improvements = [];
    
    // Check Trust Debt insurability
    if (!analysis.trustDebt.insurabilityThreshold) {
      improvements.push(`### 🚨 CRITICAL: Below Insurability Threshold
- Current: ${analysis.trustDebt.score}/100
- Required: ≥70/100  
- Gap: ${70 - analysis.trustDebt.score} points
- **Action:** Focus on reducing drift and volatility immediately`);
    }
    
    // Check orthogonality
    const violations = Object.values(analysis.skill.orthogonality).filter(o => !o.withinTarget);
    if (violations.length > 0) {
      improvements.push(`### ⚠️ Orthogonality Violations
- ${violations.length} dimension pairs exceed ε=0.1 threshold
- Maximum correlation: ${Math.max(...violations.map(v => v.correlation)).toFixed(2)}
- **Action:** Increase distinction between correlated dimensions`);
    }
    
    // Check Unity Principle
    if (analysis.environment.positionSemanticAlignment < 80) {
      improvements.push(`### 🔧 Unity Principle Alignment
- Current: ${analysis.environment.positionSemanticAlignment.toFixed(1)}%
- Target: >80%
- **Action:** Ensure hierarchical position matches semantic importance`);
    }
    
    return improvements.join('\n\n');
  }
  
  generateActionItems(analysis) {
    const items = [];
    
    // Priority 1: Fix insurability
    if (analysis.trustDebt.score < 70) {
      items.push('- [ ] **P1:** Boost Trust Debt score above 70 (insurability threshold)');
    }
    
    // Priority 2: Fix violations
    analysis.violations.forEach(v => {
      if (v.severity === 'HIGH') {
        items.push(`- [ ] **P1:** Fix ${v.type}`);
      } else {
        items.push(`- [ ] **P2:** Address ${v.type}`);
      }
    });
    
    // Priority 3: Optimize dimensions
    ['A', 'B', 'C', 'D', 'E'].forEach(dim => {
      const node = analysis.environment.nodes[dim];
      if (node && node.score < 70) {
        items.push(`- [ ] **P3:** Improve ${FIM_STRUCTURE[dim].name} (${node.score}% → 85%)`);
      }
    });
    
    return items.join('\n');
  }
  
  getViolationResolution(violation) {
    const resolutions = {
      'SHAPE_SYMBOL_MISMATCH': `
1. Review hierarchical structure in content
2. Ensure most important concepts appear at higher levels
3. Align physical position with semantic weight
4. Verify depth matches complexity`,
      
      'ORTHOGONALITY_VIOLATION': `
1. Identify overlapping indicators between dimensions
2. Sharpen distinctions using wedge amplification
3. Remove shared terminology
4. Ensure each dimension has unique vocabulary`,
      
      'INTENT_DRIFT': `
1. Restore core intent markers to content
2. Add: "Strategic Nudges", "Un-Robocall", "30 seconds"
3. Include Trust Debt scoring
4. Emphasize 361x precision claim`
    };
    
    return resolutions[violation.type] || '1. Review and correct the violation';
  }
}

module.exports = { FIMTrustDebtAnalyzer, FIM_STRUCTURE, SEMANTIC_INDICATORS };