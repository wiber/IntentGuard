#!/usr/bin/env node

/**
 * Trust Debt Unified Calculator
 * 
 * Single source of truth for all Trust Debt calculations.
 * Used by executive summary, full report, and crisis detector.
 * 
 * Ensures consistency across all reporting surfaces.
 */

const fs = require('fs');
const path = require('path');

class UnifiedTrustDebtCalculator {
  constructor() {
    this.projectRoot = process.cwd();
    this.settingsFile = path.join(this.projectRoot, 'trust-debt-settings.json');
    this.settings = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
  }

  /**
   * The ONLY Trust Debt calculation method
   * All scripts must use this for consistency
   */
  calculate(data = {}) {
    const {
      categories = [],
      matrix = null,
      assessment = null,
      commits = [],
      documents = {},
      analysis = null  // Add analysis data for weights
    } = data;

    // Layer 1: Process Health (HOW we build)
    const processHealth = this.calculateProcessHealth(assessment);
    
    // Layer 2: Outcome Reality (WHAT we achieve)
    const outcomeReality = this.calculateOutcomeReality(assessment);
    
    // Check for zero multipliers FIRST
    const zeroMultipliers = this.detectZeroMultipliers(processHealth, outcomeReality);
    if (zeroMultipliers.hasZero) {
      return {
        score: 999, // Cap at 999 for display
        actualScore: Infinity,
        status: 'CRISIS_ZERO_MULTIPLIER',
        crisis: true,
        message: `Zero multiplier detected: ${zeroMultipliers.zeros.join(', ')}`,
        details: {
          processHealth,
          outcomeReality,
          zeroMultipliers: zeroMultipliers.zeros,
          formula: 'TrustDebt = ProcessHealth / OutcomeReality (∞ when zero)',
          interpretation: 'Infinite liability - critical dimension at zero'
        }
      };
    }
    
    // Check for measurement crisis
    if (processHealth.measurement < 5) {
      return {
        score: 999,
        actualScore: 999,
        status: 'CRISIS_MEASUREMENT',
        crisis: true,
        message: `Measurement system broken at ${processHealth.measurement.toFixed(1)}%`,
        details: {
          processHealth,
          outcomeReality,
          formula: 'Cannot trust metrics when measurement < 5%',
          interpretation: 'All metrics unreliable - fix measurement first'
        }
      };
    }
    
    // Check for diagonal collapse
    const diagonalHealth = this.calculateDiagonalHealth(matrix);
    if (diagonalHealth.failingCount >= 13) {
      return {
        score: 999,
        actualScore: 999,
        status: 'CRISIS_DIAGONAL_COLLAPSE',
        crisis: true,
        message: `${diagonalHealth.failingCount} categories failing self-alignment`,
        details: {
          processHealth,
          outcomeReality,
          diagonalHealth,
          formula: 'Diagonal collapse = systematic failure',
          interpretation: 'Categories not achieving their own goals'
        }
      };
    }
    
    // Standard calculation (no crisis)
    const baseDebt = this.calculateBaseDebt(categories, matrix, commits, documents);
    const timeDecay = this.calculateTimeDecay();
    const specAge = this.calculateSpecAge();
    
    const totalDebt = baseDebt * timeDecay * specAge;
    
    // Apply outcome modifier (amplifies when outcomes are poor)
    let finalDebt = totalDebt;
    if (outcomeReality.overall < 10) {
      finalDebt = totalDebt * (10 / (outcomeReality.overall + 0.1));
    }
    
    // Determine status
    let status = 'OPERATIONAL';
    if (finalDebt > 300) status = 'CRITICAL';
    else if (finalDebt > 200) status = 'WARNING';
    else if (finalDebt > 100) status = 'ELEVATED';
    
    return {
      score: Math.min(Math.round(finalDebt), 999), // Cap at 999
      actualScore: finalDebt,
      status,
      crisis: false,
      trend: this.calculateTrend(commits),
      isInsurable: finalDebt < 250,
      details: {
        processHealth,
        outcomeReality,
        baseDebt,
        timeDecay,
        specAge,
        formula: 'TrustDebt = Σ((Intent - Reality)² × Time × SpecAge × Weight)',
        components: this.getTopContributors(categories, matrix, analysis || data)
      }
    };
  }

  /**
   * Calculate Process Health (Layer 1)
   */
  calculateProcessHealth(assessment) {
    if (!assessment) {
      return {
        measurement: 3,  // Default crisis values
        visualization: 38,
        enforcement: 13,
        overall: 0.15
      };
    }
    
    const measurement = assessment.processHealth?.measurement || 3;
    const visualization = assessment.processHealth?.visualization || 38;
    const enforcement = assessment.processHealth?.enforcement || 13;
    
    // Multiplicative formula
    const overall = (measurement / 100) * (visualization / 100) * (enforcement / 100) * 100;
    
    return {
      measurement,
      visualization,
      enforcement,
      overall,
      formula: 'Measurement × Visualization × Enforcement',
      bottleneck: this.identifyBottleneck(measurement, visualization, enforcement)
    };
  }

  /**
   * Calculate Outcome Reality (Layer 2)
   * Ethical Compliance = Our ability to legitimately and credibly back up our measurements
   */
  calculateOutcomeReality(assessment) {
    if (!assessment) {
      // Default values with partial ethical compliance
      // We have SOME ability to back up our measurements (commit history, formulas, etc.)
      return {
        userSuccess: 0.3,  // 30% of users engaged
        strategicValue: 0.003,  // Pre-revenue but has strategic value
        ethicalCompliance: 0.15,  // 15% - We have formulas and commit tracking
        overall: 0.3 * 0.003 * 0.15
      };
    }
    
    const userSuccess = assessment.outcomeReality?.userEngagement || 0.3;
    const strategicValue = assessment.outcomeReality?.strategicFit || 0.003;
    
    // Calculate ethical compliance based on our measurement credibility
    let ethicalCompliance = assessment.outcomeReality?.ethicalIntegrity;
    
    if (ethicalCompliance === undefined || ethicalCompliance === 0) {
      // We have SOME credibility from:
      // - Open source code (verifiable)
      // - Git commit history (immutable)
      // - Mathematical formulas (reproducible)
      // - HTML reports (transparent)
      // But we lack:
      // - Full AI Act compliance
      // - Complete bias detection
      // - 100% explainability
      ethicalCompliance = 0.15; // 15% credibility baseline
    }
    
    // Multiplicative formula from patent: independent dimensions multiply
    const overall = userSuccess * strategicValue * ethicalCompliance;
    
    return {
      userSuccess,
      strategicValue,
      ethicalCompliance,
      overall,
      formula: 'UserSuccess × StrategicValue × EthicalCompliance',
      zeroMultiplier: overall === 0,
      interpretation: this.interpretOutcomeReality(userSuccess, strategicValue, ethicalCompliance)
    };
  }
  
  /**
   * Interpret outcome reality scores
   */
  interpretOutcomeReality(user, strategic, ethical) {
    const interpretations = [];
    
    if (user < 0.5) {
      interpretations.push(`User engagement at ${(user * 100).toFixed(1)}% - needs improvement`);
    }
    
    if (strategic < 0.1) {
      interpretations.push(`Strategic value at ${(strategic * 100).toFixed(1)}% - implement revenue model`);
    }
    
    if (ethical < 0.3) {
      interpretations.push(`Measurement credibility at ${(ethical * 100).toFixed(1)}% - partial substantiation`);
    } else if (ethical < 0.7) {
      interpretations.push(`Measurement credibility at ${(ethical * 100).toFixed(1)}% - improving transparency`);
    } else {
      interpretations.push(`Measurement credibility at ${(ethical * 100).toFixed(1)}% - well substantiated`);
    }
    
    return interpretations.join('; ');
  }

  /**
   * Detect zero multipliers
   */
  detectZeroMultipliers(processHealth, outcomeReality) {
    const zeros = [];
    
    // Check process dimensions
    if (processHealth.measurement === 0) zeros.push('Measurement');
    if (processHealth.visualization === 0) zeros.push('Visualization');
    if (processHealth.enforcement === 0) zeros.push('Enforcement');
    
    // Check outcome dimensions
    if (outcomeReality.userSuccess === 0) zeros.push('User Success');
    if (outcomeReality.strategicValue === 0) zeros.push('Strategic Value');
    if (outcomeReality.ethicalCompliance === 0) zeros.push('Ethical Compliance');
    
    return {
      hasZero: zeros.length > 0,
      zeros,
      impact: zeros.length > 0 ? 'INFINITE' : 'NONE'
    };
  }

  /**
   * Calculate diagonal health (self-alignment)
   */
  calculateDiagonalHealth(matrix) {
    if (!matrix || !matrix.cells) {
      return {
        average: 20,
        failingCount: 0,
        categories: []
      };
    }
    
    const diagonalCells = [];
    const failingCategories = [];
    
    // Find diagonal cells (where row === column)
    matrix.cells.forEach(cell => {
      if (cell.row === cell.col) {
        diagonalCells.push({
          category: cell.row,
          alignment: cell.value * 100
        });
        
        if (cell.value < 0.2) {
          failingCategories.push({
            category: cell.row,
            alignment: (cell.value * 100).toFixed(1) + '%'
          });
        }
      }
    });
    
    const average = diagonalCells.reduce((sum, c) => sum + c.alignment, 0) / 
                   (diagonalCells.length || 1);
    
    return {
      average,
      failingCount: failingCategories.length,
      categories: failingCategories
    };
  }

  /**
   * Calculate base Trust Debt from intent-reality gaps
   */
  calculateBaseDebt(categories, matrix, commits, documents) {
    let totalDebt = 0;
    
    // First check cold spots file for real data
    const coldSpotsFile = path.join(this.projectRoot, 'trust-debt-cold-spots.json');
    if (fs.existsSync(coldSpotsFile)) {
      const coldSpots = JSON.parse(fs.readFileSync(coldSpotsFile, 'utf8'));
      
      // Use cold spot count and average correlation
      const totalColdSpots = coldSpots.totalColdSpots || 225;
      const avgCorrelation = parseFloat(coldSpots.averageCorrelation || '11.6') / 100;
      
      // Trust Debt formula: more cold spots + lower correlation = higher debt
      // Base: 100 units per 100 cold spots
      // Multiplier: inverse of correlation (lower correlation = higher multiplier)
      totalDebt = (totalColdSpots / 100) * 100 * (1 / Math.max(avgCorrelation, 0.01));
      
      // Additional penalty for critical cold spots
      if (coldSpots.criticalSpots && coldSpots.criticalSpots.length > 0) {
        totalDebt += coldSpots.criticalSpots.length * 50; // 50 units per critical spot
      }
      
      return Math.min(totalDebt, 999); // Cap at 999
    }
    
    // Fallback to matrix calculation if no cold spots
    if (matrix && matrix.nodes) {
      matrix.nodes.forEach(node => {
        const intent = node.idealWeight || 0;
        const reality = node.realWeight || 0;
        const gap = Math.abs(intent - reality);
        const weight = (node.weight || 10) / 100;
        
        // Squared gap amplifies larger divergences
        const contribution = Math.pow(gap * 100, 2) * weight;
        totalDebt += contribution;
      });
      return totalDebt / 100;
    }
    
    // If no data available, use two-layer assessment as proxy
    const assessmentFile = path.join(this.projectRoot, 'trust-debt-two-layer-assessment.json');
    if (fs.existsSync(assessmentFile)) {
      const assessment = JSON.parse(fs.readFileSync(assessmentFile, 'utf8'));
      const overallSuccess = assessment.overall?.score || 0.3;
      
      // Inverse relationship: lower success = higher debt
      // 0.3% success should yield ~500+ Trust Debt
      totalDebt = (100 - overallSuccess) * 5;
      return Math.min(totalDebt, 999);
    }
    
    // Default to high debt if we can't calculate
    return 500;
  }

  /**
   * Calculate time decay factor
   */
  calculateTimeDecay() {
    // Read from git or use default
    try {
      const lastAlignmentFile = path.join(this.projectRoot, '.trust-debt-cache', 'last-alignment.json');
      if (fs.existsSync(lastAlignmentFile)) {
        const data = JSON.parse(fs.readFileSync(lastAlignmentFile, 'utf8'));
        const daysSince = (Date.now() - new Date(data.timestamp)) / (1000 * 60 * 60 * 24);
        return Math.max(1, 1 + (daysSince * 0.1)); // 10% penalty per day
      }
    } catch (e) {
      // Fall through
    }
    return 1; // No decay if no history
  }

  /**
   * Calculate spec age factor
   */
  calculateSpecAge() {
    // Check when specs were last updated
    const specFiles = [
      'CLAUDE.md',
      'docs/03-product/MVP/commitMVP.txt',
      'docs/coherence-cycles/CANONICAL_BUSINESS_PLAN.md'
    ];
    
    let oldestUpdate = Date.now();
    specFiles.forEach(file => {
      const fullPath = path.join(this.projectRoot, file);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        if (stats.mtime < oldestUpdate) {
          oldestUpdate = stats.mtime;
        }
      }
    });
    
    const daysSinceUpdate = (Date.now() - oldestUpdate) / (1000 * 60 * 60 * 24);
    return Math.max(1, 1 + (daysSinceUpdate * 0.02)); // 2% penalty per day
  }

  /**
   * Calculate trend from recent commits
   */
  calculateTrend(commits) {
    if (!commits || commits.length < 2) return 'unknown';
    
    // Compare recent vs older commit patterns
    const recentCommits = commits.slice(0, 5);
    const olderCommits = commits.slice(5, 10);
    
    const recentAvg = this.averageTrustScore(recentCommits);
    const olderAvg = this.averageTrustScore(olderCommits);
    
    if (recentAvg > olderAvg + 5) return 'improving';
    if (recentAvg < olderAvg - 5) return 'degrading';
    return 'stable';
  }

  /**
   * Get average trust score from commits
   */
  averageTrustScore(commits) {
    if (!commits || commits.length === 0) return 50;
    
    const scores = commits.map(c => c.analysis?.trust || 50);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Identify the bottleneck dimension
   */
  identifyBottleneck(measurement, visualization, enforcement) {
    const min = Math.min(measurement, visualization, enforcement);
    
    if (min === measurement) return 'Measurement';
    if (min === visualization) return 'Visualization';
    return 'Enforcement';
  }

  /**
   * Get top contributing categories to Trust Debt
   */
  getTopContributors(categories, matrix, analysis) {
    const contributors = [];
    
    // First try to get weights from analysis data
    if (analysis && analysis.weights) {
      const ideal = analysis.weights.ideal || {};
      const real = analysis.weights.real || {};
      
      // Process each category from the weights
      Object.keys(ideal).forEach(categoryName => {
        const intentWeight = ideal[categoryName] || 0;
        const realityWeight = real[categoryName] || 0;
        const gap = Math.abs(intentWeight - realityWeight);
        const contribution = gap * gap * 1000;
        
        contributors.push({
          category: this.formatCategoryName(categoryName),
          intent: (intentWeight * 100).toFixed(1) + '%',
          reality: (realityWeight * 100).toFixed(1) + '%',
          gap: (gap * 100).toFixed(1) + '%',
          contribution: Math.round(contribution)
        });
      });
    }
    // Fallback to matrix nodes if available
    else if (matrix && matrix.nodes) {
      matrix.nodes.forEach(node => {
        const intent = node.idealWeight || 0;
        const reality = node.realWeight || 0;
        const gap = Math.abs(intent - reality);
        
        contributors.push({
          category: node.name || node.path,
          intent: (intent * 100).toFixed(1) + '%',
          reality: (reality * 100).toFixed(1) + '%',
          gap: (gap * 100).toFixed(1) + '%',
          contribution: Math.round(gap * gap * 1000)
        });
      });
    }
    // Final fallback - create default categories
    else if (categories && categories.length > 0) {
      ['measurement', 'visualization', 'enforcement'].forEach(cat => {
        contributors.push({
          category: this.formatCategoryName(cat),
          intent: '33.3%',
          reality: '33.3%',
          gap: '0.0%',
          contribution: 0
        });
      });
    }
    
    return contributors
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 5);
  }
  
  /**
   * Format category name for display
   */
  formatCategoryName(name) {
    if (!name) return 'Unknown';
    
    const formatted = {
      'measurement': 'Measurement',
      'visualization': 'Visualization',
      'enforcement': 'Enforcement',
      'drift_detection': 'Drift Detection',
      'scoring': 'Scoring Formula',
      'matrix_display': 'Trade-off Matrix',
      'shortlex_axis': 'ShortLex Axis',
      'carrot': 'Carrots',
      'stick': 'Sticks'
    };
    
    return formatted[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Save unified calculation result
   */
  saveResult(result) {
    const outputFile = path.join(this.projectRoot, 'trust-debt-unified.json');
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`📊 Unified Trust Debt: ${result.score} units (${result.status})`);
    return result;
  }
}

// Export for use by other scripts
module.exports = UnifiedTrustDebtCalculator;

// Run if called directly
if (require.main === module) {
  const calculator = new UnifiedTrustDebtCalculator();
  
  // Load existing data
  const analysisFile = path.join(process.cwd(), 'trust-debt-analysis.json');
  const matrixFile = path.join(process.cwd(), 'trust-debt-reality-intent-matrix.json');
  const assessmentFile = path.join(process.cwd(), 'trust-debt-two-layer-assessment.json');
  
  const data = {};
  
  if (fs.existsSync(analysisFile)) {
    const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
    data.categories = analysis.categories || [];
    data.commits = analysis.commits || [];
  }
  
  if (fs.existsSync(matrixFile)) {
    data.matrix = JSON.parse(fs.readFileSync(matrixFile, 'utf8'));
  }
  
  if (fs.existsSync(assessmentFile)) {
    data.assessment = JSON.parse(fs.readFileSync(assessmentFile, 'utf8'));
  }
  
  // Calculate and save
  const result = calculator.calculate(data);
  calculator.saveResult(result);
}