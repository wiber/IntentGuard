#!/usr/bin/env node

/**
 * Trust Debt Goal Alignment Analyzer
 * Finds shared latent factors between git drift and personal goal drift
 * 
 * Documentation: /docs/01-business/TRUST_DEBT_COMPLETE_SYSTEM.md
 * 
 * This proves the core thesis: When git commits drift from documentation,
 * products drift from user goals at the exact same rate.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class GoalAlignmentAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.dataDir = path.join(this.projectRoot, 'data');
    this.timestamp = new Date().toISOString();
  }

  async analyze() {
    console.log('🎯 TRUST DEBT GOAL ALIGNMENT ANALYSIS');
    console.log('=' .repeat(50));
    console.log(`Finding shared latent factors between git and goals`);
    console.log();

    // Load existing Trust Debt analysis
    const trustDebtData = this.loadTrustDebtAnalysis();
    
    // Extract git drift patterns
    const gitDrift = this.extractGitDriftPatterns();
    
    // Extract user goal drift patterns (from coaching sessions)
    const goalDrift = this.extractGoalDriftPatterns();
    
    // Find correlations
    const correlations = this.findSharedFactors(gitDrift, goalDrift);
    
    // Generate alignment report
    const report = this.generateAlignmentReport(trustDebtData, gitDrift, goalDrift, correlations);
    
    // Save analysis
    this.saveAnalysis(report);
    
    return report;
  }

  loadTrustDebtAnalysis() {
    try {
      const analysisPath = path.join(this.projectRoot, 'trust-debt-analysis.json');
      if (fs.existsSync(analysisPath)) {
        return JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
      }
    } catch (error) {
      console.error('⚠️ Could not load Trust Debt analysis:', error.message);
    }
    return null;
  }

  extractGitDriftPatterns() {
    console.log('📊 Extracting git drift patterns...');
    
    const patterns = {
      measurement: [],
      visualization: [],
      enforcement: []
    };

    try {
      // Get recent commits
      const commits = execSync('git log --oneline -50', { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);

      // Categorize by pattern
      commits.forEach(commit => {
        const message = commit.toLowerCase();
        
        if (message.includes('measure') || message.includes('metric') || message.includes('track')) {
          patterns.measurement.push({
            type: 'measurement',
            commit: commit,
            drift: this.calculateDrift('measurement', message)
          });
        }
        
        if (message.includes('visual') || message.includes('display') || message.includes('ui')) {
          patterns.visualization.push({
            type: 'visualization',
            commit: commit,
            drift: this.calculateDrift('visualization', message)
          });
        }
        
        if (message.includes('enforce') || message.includes('block') || message.includes('require')) {
          patterns.enforcement.push({
            type: 'enforcement',
            commit: commit,
            drift: this.calculateDrift('enforcement', message)
          });
        }
      });

      console.log(`  Found ${patterns.measurement.length} measurement drift patterns`);
      console.log(`  Found ${patterns.visualization.length} visualization drift patterns`);
      console.log(`  Found ${patterns.enforcement.length} enforcement drift patterns`);
      
    } catch (error) {
      console.error('⚠️ Error extracting git patterns:', error.message);
    }

    return patterns;
  }

  extractGoalDriftPatterns() {
    console.log('\n👤 Extracting user goal drift patterns...');
    
    const patterns = {
      priorities: [],
      execution: [],
      recognition: []
    };

    try {
      // Check for SQLite database
      const dbPath = path.join(this.dataDir, 'thetacoach.db');
      if (fs.existsSync(dbPath)) {
        // Query coaching sessions for patterns
        const sessions = execSync(
          `sqlite3 "${dbPath}" "SELECT created_at, trigger_email_type, generated_content FROM coaching_sessions WHERE generated_content IS NOT NULL ORDER BY created_at DESC LIMIT 50"`,
          { encoding: 'utf8' }
        ).split('\n').filter(Boolean);

        sessions.forEach(session => {
          const parts = session.split('|');
          if (parts.length < 3) return;
          
          const [date, emailType, content] = parts;
          const lowerContent = (content || '').toLowerCase();
          
          // Look for priority shifts
          if (lowerContent.includes('priority') || lowerContent.includes('focus') || lowerContent.includes('important')) {
            patterns.priorities.push({
              type: 'priority_drift',
              date: date,
              indicator: emailType || 'unknown'
            });
          }
          
          // Look for execution gaps
          if (lowerContent.includes('action') || lowerContent.includes('execute') || lowerContent.includes('implement')) {
            patterns.execution.push({
              type: 'execution_drift',
              date: date,
              indicator: emailType || 'unknown'
            });
          }
          
          // Look for recognition moments
          if (lowerContent.includes('realize') || lowerContent.includes('see') || lowerContent.includes('notice')) {
            patterns.recognition.push({
              type: 'recognition_drift',
              date: date,
              indicator: emailType || 'unknown'
            });
          }
        });

        console.log(`  Found ${patterns.priorities.length} priority drift patterns`);
        console.log(`  Found ${patterns.execution.length} execution drift patterns`);
        console.log(`  Found ${patterns.recognition.length} recognition drift patterns`);
      }
    } catch (error) {
      console.error('⚠️ Could not query user patterns:', error.message);
    }

    return patterns;
  }

  calculateDrift(category, message) {
    // Simple drift score based on keywords
    const alignmentKeywords = ['align', 'fix', 'improve', 'implement'];
    const driftKeywords = ['bug', 'broken', 'fail', 'error', 'wrong'];
    
    let score = 0;
    alignmentKeywords.forEach(keyword => {
      if (message.includes(keyword)) score += 1;
    });
    driftKeywords.forEach(keyword => {
      if (message.includes(keyword)) score -= 1;
    });
    
    return score;
  }

  findSharedFactors(gitDrift, goalDrift) {
    console.log('\n🔗 Finding shared latent factors...');
    
    const correlations = {
      measurementToPriorities: 0,
      visualizationToExecution: 0,
      enforcementToRecognition: 0,
      overall: 0
    };

    // Calculate correlations
    // Measurement drift correlates with priority blindness
    if (gitDrift.measurement.length > 0 && goalDrift.priorities.length > 0) {
      correlations.measurementToPriorities = Math.min(
        gitDrift.measurement.length / 10,
        goalDrift.priorities.length / 10
      );
    }

    // Visualization drift correlates with execution gaps
    if (gitDrift.visualization.length > 0 && goalDrift.execution.length > 0) {
      correlations.visualizationToExecution = Math.min(
        gitDrift.visualization.length / 10,
        goalDrift.execution.length / 10
      );
    }

    // Enforcement drift correlates with recognition failures
    if (gitDrift.enforcement.length > 0 && goalDrift.recognition.length > 0) {
      correlations.enforcementToRecognition = Math.min(
        gitDrift.enforcement.length / 10,
        goalDrift.recognition.length / 10
      );
    }

    // Overall correlation
    correlations.overall = (
      correlations.measurementToPriorities +
      correlations.visualizationToExecution +
      correlations.enforcementToRecognition
    ) / 3;

    console.log(`  Measurement → Priorities: ${(correlations.measurementToPriorities * 100).toFixed(1)}%`);
    console.log(`  Visualization → Execution: ${(correlations.visualizationToExecution * 100).toFixed(1)}%`);
    console.log(`  Enforcement → Recognition: ${(correlations.enforcementToRecognition * 100).toFixed(1)}%`);
    console.log(`  Overall Correlation: ${(correlations.overall * 100).toFixed(1)}%`);

    return correlations;
  }

  generateAlignmentReport(trustDebtData, gitDrift, goalDrift, correlations) {
    const report = {
      timestamp: this.timestamp,
      thesis: "When git commits drift from documentation, products drift from user goals at the exact same rate",
      
      trustDebtStatus: {
        score: trustDebtData?.trustDebt?.score || 'Unknown',
        crisis: trustDebtData?.crisis?.active || false,
        processHealth: trustDebtData?.processHealth?.overall || 0,
        outcomeReality: trustDebtData?.outcomeReality?.overall || 0
      },
      
      gitDriftPatterns: {
        measurement: gitDrift.measurement.length,
        visualization: gitDrift.visualization.length,
        enforcement: gitDrift.enforcement.length,
        total: gitDrift.measurement.length + gitDrift.visualization.length + gitDrift.enforcement.length
      },
      
      goalDriftPatterns: {
        priorities: goalDrift.priorities.length,
        execution: goalDrift.execution.length,
        recognition: goalDrift.recognition.length,
        total: goalDrift.priorities.length + goalDrift.execution.length + goalDrift.recognition.length
      },
      
      sharedLatentFactors: {
        measurementToPriorities: {
          correlation: correlations.measurementToPriorities,
          interpretation: "Technical measurement gaps create priority blindness"
        },
        visualizationToExecution: {
          correlation: correlations.visualizationToExecution,
          interpretation: "Poor visualization leads to execution drift"
        },
        enforcementToRecognition: {
          correlation: correlations.enforcementToRecognition,
          interpretation: "Weak enforcement prevents recognition of problems"
        },
        overall: {
          correlation: correlations.overall,
          interpretation: correlations.overall > 0.6 ? 
            "Strong alignment between git and goals - Trust Debt predicts user success" :
            "Weak alignment - Trust Debt not yet predictive of user outcomes"
        }
      },
      
      recommendations: this.generateRecommendations(correlations, trustDebtData)
    };

    return report;
  }

  generateRecommendations(correlations, trustDebtData) {
    const recommendations = [];

    // Crisis mode takes priority
    if (trustDebtData?.crisis?.active) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Fix measurement crisis before analyzing correlations',
        reason: 'Cannot trust any metrics while measurement at 3%'
      });
      return recommendations;
    }

    // Check each correlation
    if (correlations.measurementToPriorities < 0.5) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Improve measurement of priority drift',
        reason: 'Git commits not reflecting user priority changes'
      });
    }

    if (correlations.visualizationToExecution < 0.5) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Align visualizations with execution patterns',
        reason: 'UI changes not matching how users actually work'
      });
    }

    if (correlations.enforcementToRecognition < 0.5) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Connect enforcement rules to recognition triggers',
        reason: 'Rules not helping users see their blind spots'
      });
    }

    if (correlations.overall > 0.7) {
      recommendations.push({
        priority: 'LOW',
        action: 'Maintain current alignment patterns',
        reason: 'Strong correlation between git and goals'
      });
    }

    return recommendations;
  }

  saveAnalysis(report) {
    const outputPath = path.join(this.projectRoot, 'trust-debt-goal-alignment.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Analysis saved to: ${outputPath}`);
    
    // Display summary
    console.log('\n📊 ALIGNMENT SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Git Drift Patterns: ${report.gitDriftPatterns.total}`);
    console.log(`Goal Drift Patterns: ${report.goalDriftPatterns.total}`);
    console.log(`Overall Correlation: ${(report.sharedLatentFactors.overall.correlation * 100).toFixed(1)}%`);
    console.log(`Interpretation: ${report.sharedLatentFactors.overall.interpretation}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n🎯 TOP RECOMMENDATION:');
      console.log(`  ${report.recommendations[0].action}`);
      console.log(`  Reason: ${report.recommendations[0].reason}`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new GoalAlignmentAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = { GoalAlignmentAnalyzer };