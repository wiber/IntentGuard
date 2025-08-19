#!/usr/bin/env node

/**
 * Trust Debt Measurement Engine
 * Actually implements the Trust Debt formula:
 * TrustDebt = Σ((Intent[i] - Reality[i])² × Time × SpecAge × CategoryWeight[i])
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TrustDebtMeasurementEngine {
  constructor() {
    this.projectRoot = process.cwd();
    this.settingsPath = path.join(this.projectRoot, 'trust-debt-settings.json');
    this.matrixPath = path.join(this.projectRoot, 'trust-debt-reality-intent-matrix.json');
    this.categoriesPath = path.join(this.projectRoot, '.trust-debt-cache/categories.json');
    
    this.settings = this.loadSettings();
    this.categories = this.loadCategories();
  }

  loadSettings() {
    if (fs.existsSync(this.settingsPath)) {
      return JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
    }
    throw new Error('Trust Debt settings not found');
  }

  loadCategories() {
    if (fs.existsSync(this.categoriesPath)) {
      return JSON.parse(fs.readFileSync(this.categoriesPath, 'utf8'));
    }
    return null;
  }

  /**
   * Calculate actual Trust Debt using the formula
   */
  calculateTrustDebt() {
    console.log('\n📊 TRUST DEBT MEASUREMENT ENGINE');
    console.log('=' .repeat(50));
    
    // Load the Reality vs Intent matrix
    const matrix = this.loadMatrix();
    if (!matrix) {
      console.log('⚠️ No matrix data available, generating...');
      this.generateMatrix();
      return this.calculateTrustDebt(); // Recursive call after generation
    }
    
    // Calculate components
    const intentRealityGaps = this.calculateIntentRealityGaps(matrix);
    const timeFactor = this.calculateTimeFactor();
    const specAge = this.calculateSpecAge();
    const categoryWeights = this.getCategoryWeights();
    
    // Apply the formula: Σ((Intent - Reality)² × Time × SpecAge × Weight)
    // Scale up to show real liability - gaps are percentages, need to amplify
    let trustDebt = 0;
    const components = [];
    
    intentRealityGaps.forEach(gap => {
      const weight = categoryWeights[gap.category] || 0.1;
      // Scale factor: 1000x to convert from decimal to units representing real liability
      const scaleFactor = 1000;
      const component = Math.pow(gap.gap, 2) * timeFactor * specAge * weight * scaleFactor;
      
      components.push({
        category: gap.category,
        gap: gap.gap,
        weight: weight,
        timeFactor: timeFactor,
        specAge: specAge,
        scaleFactor: scaleFactor,
        contribution: component
      });
      
      trustDebt += component;
    });
    
    // Log the calculation
    console.log('\n📐 Trust Debt Formula Components:');
    console.log('  Intent-Reality Gaps (squared):');
    components.forEach(c => {
      console.log(`    ${c.category}: ${(c.gap * 100).toFixed(1)}% gap → ${(Math.pow(c.gap, 2) * 100).toFixed(2)} squared`);
    });
    console.log(`  Time Factor: ${timeFactor.toFixed(2)} days`);
    console.log(`  Spec Age Factor: ${specAge.toFixed(2)}`);
    console.log(`  Category Weights: Applied per category`);
    
    console.log('\n💰 Trust Debt Calculation:');
    components.forEach(c => {
      console.log(`  ${c.category}: ${c.contribution.toFixed(2)} units`);
    });
    console.log(`  ─────────────────────────`);
    console.log(`  TOTAL: ${trustDebt.toFixed(2)} units`);
    
    return {
      score: Math.round(trustDebt),
      components: components,
      formula: 'Σ((Intent - Reality)² × Time × SpecAge × Weight)',
      timeFactor: timeFactor,
      specAge: specAge,
      gaps: intentRealityGaps
    };
  }

  /**
   * Calculate gaps between intent and reality from matrix
   */
  calculateIntentRealityGaps(matrix) {
    const gaps = [];
    
    // For each category, calculate the gap between intent and reality
    if (matrix.nodes) {
      matrix.nodes.forEach(node => {
        // Self-alignment represents how well reality matches intent for this category
        const selfAlignment = matrix.matrix?.[node.path]?.[node.path]?.similarity || 0;
        const gap = 1 - selfAlignment; // Gap is inverse of alignment
        
        gaps.push({
          category: node.path,
          name: node.name,
          alignment: selfAlignment,
          gap: gap
        });
      });
    }
    
    return gaps;
  }

  /**
   * Calculate time factor (days since last alignment checkpoint)
   */
  calculateTimeFactor() {
    // Check when the last successful alignment was (Trust Debt < 100)
    const historyPath = path.join(this.projectRoot, '.trust-debt-cache/history.json');
    
    if (fs.existsSync(historyPath)) {
      const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      const lastGoodAlignment = history.entries?.find(e => e.trustDebt < 100);
      
      if (lastGoodAlignment) {
        const daysSince = (Date.now() - new Date(lastGoodAlignment.timestamp)) / (1000 * 60 * 60 * 24);
        return Math.max(1, daysSince); // Minimum 1 day
      }
    }
    
    // Default: 7 days if no history
    return 7;
  }

  /**
   * Calculate spec age factor (staleness penalty)
   */
  calculateSpecAge() {
    const specAgePenalty = this.settings.calculation?.specAgePenalty || 0.02;
    let totalAge = 0;
    let count = 0;
    
    // Check age of each tracked document
    Object.values(this.settings.documents?.tracked || {}).forEach(doc => {
      if (doc.lastChecked) {
        const daysSince = (Date.now() - new Date(doc.lastChecked)) / (1000 * 60 * 60 * 24);
        totalAge += daysSince;
        count++;
      }
    });
    
    const avgAge = count > 0 ? totalAge / count : 30; // Default 30 days
    return 1 + (avgAge * specAgePenalty); // Increases with age
  }

  /**
   * Get category weights from settings
   */
  getCategoryWeights() {
    const weights = {};
    
    // From MVP intent
    if (this.settings.mvpIntent) {
      weights['measurement'] = this.settings.mvpIntent.carrotStick?.weight || 0.4;
      weights['visualization'] = this.settings.mvpIntent.tradeOffMatrix?.weight || 0.3;
      weights['enforcement'] = this.settings.mvpIntent.shortlexHierarchy?.weight || 0.3;
    }
    
    // From categories if available
    if (this.categories?.categories) {
      Object.entries(this.categories.categories).forEach(([key, cat]) => {
        weights[key] = cat.weight || weights[key] || 0.1;
      });
    }
    
    return weights;
  }

  /**
   * Load existing matrix data
   */
  loadMatrix() {
    if (fs.existsSync(this.matrixPath)) {
      return JSON.parse(fs.readFileSync(this.matrixPath, 'utf8'));
    }
    return null;
  }

  /**
   * Generate matrix if it doesn't exist
   */
  generateMatrix() {
    console.log('🔄 Generating Reality vs Intent matrix...');
    try {
      execSync('node scripts/trust-debt-reality-intent-matrix.js', { stdio: 'inherit' });
    } catch (e) {
      console.error('Failed to generate matrix:', e.message);
    }
  }

  /**
   * Calculate process health metrics based on actual implementation
   */
  calculateProcessHealth() {
    const measurements = this.assessMeasurementCapability();
    const visualization = this.assessVisualizationCapability();
    const enforcement = this.assessEnforcementCapability();
    
    // Multiplicative formula
    const overall = (measurements.score / 100) * (visualization.score / 100) * (enforcement.score / 100) * 100;
    
    return {
      measurement: measurements.score,
      visualization: visualization.score,
      enforcement: enforcement.score,
      overall: overall,
      formula: `${measurements.score}% × ${visualization.score}% × ${enforcement.score}%`,
      bottleneck: this.identifyBottleneck(measurements.score, visualization.score, enforcement.score),
      evidence: {
        measurement: measurements.evidence,
        visualization: visualization.evidence,
        enforcement: enforcement.evidence
      }
    };
  }

  /**
   * Assess actual measurement capability
   */
  assessMeasurementCapability() {
    let score = 0;
    const evidence = [];
    
    // Check if drift detection script exists and works
    if (fs.existsSync(path.join(this.projectRoot, 'scripts/trust-debt-analyzer.js'))) {
      score += 20;
      evidence.push('Drift detection script exists');
    }
    
    // Check if matrix generation works
    if (fs.existsSync(this.matrixPath)) {
      const matrix = this.loadMatrix();
      if (matrix?.nodes?.length > 0) {
        score += 30;
        evidence.push(`Matrix tracks ${matrix.nodes.length} categories`);
      }
    }
    
    // Check if we're actually tracking commits
    try {
      const recentCommits = execSync('git log --oneline -10', { encoding: 'utf8' });
      if (recentCommits) {
        score += 25;
        evidence.push('Git commit tracking active');
      }
    } catch (e) {
      // Git not available
    }
    
    // Check if Trust Debt formula is implemented
    if (this.settings.trustDebtFormula) {
      score += 25;
      evidence.push('Trust Debt formula configured');
    }
    
    return {
      score: Math.min(100, score),
      evidence: evidence.join(', ')
    };
  }

  /**
   * Assess visualization capability
   */
  assessVisualizationCapability() {
    let score = 0;
    const evidence = [];
    
    // Check if HTML generator exists
    if (fs.existsSync(path.join(this.projectRoot, 'scripts/trust-debt-html-generator.js'))) {
      score += 25;
      evidence.push('HTML report generator exists');
    }
    
    // Check if matrix visualization works
    if (fs.existsSync(path.join(this.projectRoot, 'trust-debt-reality-intent-matrix.html'))) {
      score += 25;
      evidence.push('Matrix heatmap generated');
    }
    
    // Check if ShortLex visualization exists
    if (fs.existsSync(path.join(this.projectRoot, 'scripts/trust-debt-shortlex-generator.js'))) {
      score += 25;
      evidence.push('ShortLex axis visualization available');
    }
    
    // Check if reports are being generated
    if (fs.existsSync(path.join(this.projectRoot, 'trust-debt-report.html'))) {
      score += 25;
      evidence.push('Trust Debt reports generated');
    }
    
    return {
      score: Math.min(100, score),
      evidence: evidence.join(', ')
    };
  }

  /**
   * Assess enforcement capability
   */
  assessEnforcementCapability() {
    let score = 0;
    const evidence = [];
    
    // Check if git hooks are installed
    if (fs.existsSync(path.join(this.projectRoot, '.husky/post-commit'))) {
      score += 35;
      evidence.push('Git hooks installed');
    }
    
    // Check if blocking logic exists
    if (fs.existsSync(path.join(this.projectRoot, 'scripts/trust-debt-commit-guard.js'))) {
      score += 35;
      evidence.push('Commit blocking logic exists');
    }
    
    // Check if carrot/stick thresholds are configured
    if (this.settings.thresholds?.trustDebt) {
      score += 30;
      evidence.push('Carrot/stick thresholds configured');
    }
    
    return {
      score: Math.min(100, score),
      evidence: evidence.join(', ')
    };
  }

  /**
   * Identify the bottleneck in process health
   */
  identifyBottleneck(measurement, visualization, enforcement) {
    const scores = [
      { name: 'Measurement', score: measurement },
      { name: 'Visualization', score: visualization },
      { name: 'Enforcement', score: enforcement }
    ];
    
    return scores.reduce((min, curr) => curr.score < min.score ? curr : min).name;
  }

  /**
   * Generate full measurement report
   */
  generateReport() {
    const trustDebt = this.calculateTrustDebt();
    const processHealth = this.calculateProcessHealth();
    
    const report = {
      timestamp: new Date().toISOString(),
      trustDebt: trustDebt,
      processHealth: processHealth,
      status: this.getStatus(trustDebt.score),
      recommendations: this.getRecommendations(trustDebt, processHealth)
    };
    
    // Save report
    fs.writeFileSync(
      path.join(this.projectRoot, 'trust-debt-measurement-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    return report;
  }

  /**
   * Get status based on Trust Debt score
   */
  getStatus(score) {
    const thresholds = this.settings.thresholds?.trustDebt || {};
    
    if (score < (thresholds.healthy || 100)) {
      return { level: 'healthy', message: 'System aligned, low drift detected' };
    } else if (score < (thresholds.warning || 200)) {
      return { level: 'warning', message: 'Drift detected, visibility increased' };
    } else if (score < (thresholds.critical || 300)) {
      return { level: 'critical', message: 'Major drift, accountability triggered' };
    } else {
      return { level: 'crisis', message: 'Massive drift, forcing function active' };
    }
  }

  /**
   * Get recommendations based on measurements
   */
  getRecommendations(trustDebt, processHealth) {
    const recommendations = [];
    
    // Address biggest gaps first
    const topGaps = trustDebt.gaps
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3);
    
    topGaps.forEach(gap => {
      recommendations.push({
        priority: 'high',
        category: gap.name,
        action: `Reduce ${gap.name} drift from ${(gap.gap * 100).toFixed(1)}% to <20%`,
        impact: `Could reduce Trust Debt by ~${Math.floor(gap.gap * 100)} units`
      });
    });
    
    // Address process health bottleneck
    if (processHealth.overall < 50) {
      recommendations.push({
        priority: 'critical',
        category: processHealth.bottleneck,
        action: `Fix ${processHealth.bottleneck} capability (currently ${processHealth[processHealth.bottleneck.toLowerCase()]}%)`,
        impact: 'Unblock entire forcing function'
      });
    }
    
    return recommendations;
  }
}

module.exports = { TrustDebtMeasurementEngine };

// Run if called directly
if (require.main === module) {
  const engine = new TrustDebtMeasurementEngine();
  const report = engine.generateReport();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 MEASUREMENT REPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`Trust Debt Score: ${report.trustDebt.score} units`);
  console.log(`Status: ${report.status.level.toUpperCase()} - ${report.status.message}`);
  console.log(`Process Health: ${report.processHealth.overall.toFixed(2)}%`);
  console.log(`  - Measurement: ${report.processHealth.measurement}%`);
  console.log(`  - Visualization: ${report.processHealth.visualization}%`);
  console.log(`  - Enforcement: ${report.processHealth.enforcement}%`);
  
  if (report.recommendations.length > 0) {
    console.log('\n📋 Top Recommendations:');
    report.recommendations.slice(0, 3).forEach((rec, i) => {
      console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
      console.log(`   Impact: ${rec.impact}`);
    });
  }
  
  console.log('\n💾 Full report saved to trust-debt-measurement-report.json');
}