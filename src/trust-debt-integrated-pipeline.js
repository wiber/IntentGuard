#!/usr/bin/env node

/**
 * Trust Debt Integrated Pipeline
 * Combines all components into a consistent, legitimate forcing function
 * 
 * PRIMARY INTENT SOURCES (The New Truth):
 * - Business Plan: /docs/01-business/THETACOACH_BUSINESS_PLAN.md
 * - MVP Spec: /docs/03-product/MVP/UNIFIED_DRIFT_MVP_SPEC.md
 * - System Guide: /CLAUDE.md (v5.0 - Unified Vision)
 * - Complete System: /docs/01-business/TRUST_DEBT_COMPLETE_SYSTEM.md
 * 
 * 1. Two-Layer Calculator for Process × Outcome
 * 2. Crisis Detector for Primacy of Crisis
 * 3. Reality vs Intent Matrix
 * 4. Blind Spot Analysis
 * 5. HTML Report Generation
 * 
 * Purpose: Create forcing function for reproducible magic via semantic nodes
 * Goal: Establish fiduciary responsibility and standard of care for AI alignment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { TwoLayerCalculator } = require('./trust-debt-two-layer-calculator');
const { CrisisDetector } = require('./trust-debt-crisis-detector');

class IntegratedPipeline {
  constructor() {
    this.projectRoot = process.cwd();
    this.timestamp = new Date().toISOString();
  }

  async run() {
    console.log('🎯 TRUST DEBT INTEGRATED PIPELINE');
    console.log('=' .repeat(50));
    console.log(`Timestamp: ${this.timestamp}`);
    console.log();

    try {
      // Step 1: Generate Reality vs Intent Matrix
      console.log('📊 Step 1: Generating Reality vs Intent Matrix...');
      this.generateMatrix();
      
      // Step 2: Calculate Two-Layer Assessment
      console.log('\n📈 Step 2: Calculating Two-Layer Assessment...');
      const twoLayerCalculator = new TwoLayerCalculator();
      const assessment = twoLayerCalculator.generateAssessment();
      
      // Step 3: Detect Crisis Conditions
      console.log('\n🚨 Step 3: Checking for Crisis Conditions...');
      const crisisDetector = new CrisisDetector();
      const crisisData = crisisDetector.detectCrisis();
      
      // Step 4: Generate Integrated Analysis
      console.log('\n🔄 Step 4: Generating Integrated Analysis...');
      const integratedAnalysis = this.generateIntegratedAnalysis(assessment, crisisData);
      
      // Step 5: Save Analysis
      console.log('\n💾 Step 5: Saving Analysis...');
      this.saveAnalysis(integratedAnalysis);
      
      // Step 6: Generate HTML Report
      console.log('\n🎨 Step 6: Generating HTML Report...');
      this.generateHTMLReport(integratedAnalysis, crisisData);
      
      console.log('\n' + '=' .repeat(50));
      console.log('✅ PIPELINE COMPLETE');
      
      if (crisisData.inCrisis) {
        console.log('\n🚨 CRISIS MODE ACTIVE');
        console.log(`Severity: ${crisisData.severity}`);
        console.log('All non-essential work is blocked');
        console.log('\nOpen trust-debt-report.html to see mandatory actions');
      } else {
        console.log('\n✅ System operating normally');
        console.log(`Trust Debt: ${integratedAnalysis.trustDebt.score} units`);
      }
      
    } catch (error) {
      console.error('❌ Pipeline failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Generate Reality vs Intent Matrix
   */
  generateMatrix() {
    try {
      execSync('node scripts/trust-debt-reality-intent-matrix.js', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ Matrix generation failed, continuing...');
    }
  }

  /**
   * Generate integrated analysis combining all data sources
   */
  generateIntegratedAnalysis(assessment, crisisData) {
    // Load existing analysis for backward compatibility
    let existingAnalysis = {};
    const analysisFile = path.join(this.projectRoot, 'trust-debt-analysis.json');
    if (fs.existsSync(analysisFile)) {
      existingAnalysis = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
    }
    
    // Try to use Trust Debt from measurement engine
    let trustDebtScore;
    let trustDebtTrend;
    let trustDebtFormula = null;
    
    const measurementReportPath = path.join(this.projectRoot, 'trust-debt-measurement-report.json');
    if (fs.existsSync(measurementReportPath)) {
      try {
        const measurementReport = JSON.parse(fs.readFileSync(measurementReportPath, 'utf8'));
        trustDebtScore = measurementReport.trustDebt.score;
        trustDebtTrend = measurementReport.status.level;
        trustDebtFormula = measurementReport.trustDebt.formula;
        console.log(`  Using Trust Debt from Measurement Engine: ${trustDebtScore} units (${trustDebtTrend})`);
      } catch (e) {
        // Fall through to calculation below
      }
    }
    
    // Fallback calculation if measurement engine not available
    if (trustDebtScore === undefined) {
      if (assessment.interpretation.crisis) {
        // Crisis mode: Trust Debt at maximum (999 units - beyond insurable threshold)
        trustDebtScore = 999;
        trustDebtTrend = 'CRISIS';
      } else if (assessment.overall.overall < 1) {
        // Severe issues: Very high Trust Debt (capped at 999)
        trustDebtScore = Math.min(999, Math.round(1000 / (assessment.overall.overall + 0.001)));
        trustDebtTrend = 'degrading';
      } else {
        // Normal operation: Calculate based on gaps
        const processGap = 100 - assessment.processHealth.overall;
        const outcomeGap = 100 - assessment.outcomeReality.overall;
        trustDebtScore = Math.round((processGap + outcomeGap) / 2);
        trustDebtTrend = trustDebtScore > 50 ? 'warning' : 'improving';
      }
    }
    
    // Build integrated analysis
    return {
      timestamp: this.timestamp,
      version: '4.0-integrated',
      
      // Two-Layer Assessment
      processHealth: {
        measurement: assessment.processHealth.measurement,
        visualization: assessment.processHealth.visualization,
        enforcement: assessment.processHealth.enforcement,
        overall: assessment.processHealth.overall,
        formula: assessment.processHealth.formula,
        bottleneck: assessment.processHealth.bottleneck
      },
      
      outcomeReality: {
        user: assessment.outcomeReality.user,
        strategic: assessment.outcomeReality.strategic,
        ethical: assessment.outcomeReality.ethical,
        overall: assessment.outcomeReality.overall,
        formula: assessment.outcomeReality.formula,
        zeroMultiplier: assessment.outcomeReality.zeroMultiplier
      },
      
      overallSuccess: {
        value: assessment.overall.overall,
        formula: assessment.overall.formula,
        interpretation: assessment.overall.interpretation
      },
      
      // Crisis Information
      crisis: {
        active: crisisData.inCrisis,
        severity: crisisData.severity,
        flags: crisisData.flags,
        mandatoryActions: crisisData.mandatoryActions,
        suppressedSections: crisisData.suppressedSections
      },
      
      // Trust Debt Score (for backward compatibility)
      trustDebt: {
        score: trustDebtScore,
        trend: trustDebtTrend,
        isInsurable: trustDebtScore < 50 && !crisisData.inCrisis
      },
      
      // Preserve existing data
      categories: existingAnalysis.categories || ['measurement', 'visualization', 'enforcement'],
      weights: existingAnalysis.weights || {
        ideal: { measurement: 0.4, visualization: 0.35, enforcement: 0.25 },
        real: assessment.processHealth.evidence || {}
      },
      
      // Metadata
      metadata: {
        pipeline: 'integrated',
        claudeAvailable: true,
        matrixGenerated: fs.existsSync(path.join(this.projectRoot, 'trust-debt-reality-intent-matrix.json')),
        twoLayerCalculated: true,
        crisisDetected: crisisData.inCrisis
      }
    };
  }

  /**
   * Save the integrated analysis
   */
  saveAnalysis(analysis) {
    const analysisFile = path.join(this.projectRoot, 'trust-debt-analysis.json');
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    console.log(`✅ Analysis saved to ${path.basename(analysisFile)}`);
    
    // Also save timestamped backup
    const backupFile = path.join(
      this.projectRoot, 
      `trust-debt-analysis-${Date.now()}.json`
    );
    fs.writeFileSync(backupFile, JSON.stringify(analysis, null, 2));
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(analysis, crisisData) {
    try {
      // Always use the full HTML generator (it now includes crisis warnings)
      const TrustDebtHTMLGenerator = require('./trust-debt-html-generator');
      const htmlGenerator = new TrustDebtHTMLGenerator();
      
      // Load history for the HTML generator
      const historyFile = path.join(this.projectRoot, 'trust-debt-history.json');
      let history = { calculations: [] };
      if (fs.existsSync(historyFile)) {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      }
      
      // Generate full HTML report (includes crisis sections if in crisis)
      const fullHTML = htmlGenerator.generateHTML(analysis, history);
      
      fs.writeFileSync(path.join(this.projectRoot, 'trust-debt-report.html'), fullHTML);
      
      console.log(crisisData.inCrisis ? 
        '✅ Crisis report generated with full analysis' : 
        '✅ Full report generated');
    } catch (error) {
      console.error('⚠️ HTML generation failed:', error.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const pipeline = new IntegratedPipeline();
  pipeline.run().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { IntegratedPipeline };