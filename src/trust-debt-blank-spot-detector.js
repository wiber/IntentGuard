#!/usr/bin/env node

/**
 * Trust Debt Blank Spot Detector
 * Identifies and classifies gaps in the trade-off matrix
 * 
 * BLANK SPOTS ARE THE FORCING FUNCTION:
 * - Above diagonal = Implementation holes (say it's important, don't work on it)
 * - Below diagonal = Documentation holes (work on it, don't document why)
 * - On diagonal = Alignment gaps (neither saying nor doing)
 * 
 * These create quantifiable LIABILITY that accumulates over time
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BlankSpotDetector {
  constructor(settings) {
    this.settings = settings;
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.historyFile = path.join(this.projectRoot, '.trust-debt-cache', 'blank-spot-history.json');
  }

  /**
   * Detect and classify blank spots in the matrix
   */
  detectBlankSpots(matrix, categories) {
    console.log('\n🔍 Blank Spot Detection');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const blankSpots = [];
    const n = matrix.length;
    
    // Scan entire matrix
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cell = matrix[i][j];
        const severity = this.calculateSeverity(cell.value);
        
        if (severity > 0) {
          const spot = {
            row: i,
            col: j,
            realCategory: categories[i].name,
            idealCategory: categories[j].name,
            value: cell.value,
            severity: severity,
            type: this.classifySpotType(i, j),
            liability: this.calculateLiability(cell, severity),
            age: this.getSpotAge(categories[i].name, categories[j].name),
            description: this.generateDescription(cell, i, j, categories)
          };
          
          blankSpots.push(spot);
        }
      }
    }
    
    // Sort by liability (highest first)
    blankSpots.sort((a, b) => b.liability - a.liability);
    
    // Group by type
    const grouped = this.groupByType(blankSpots);
    
    // Calculate aggregate metrics
    const metrics = this.calculateMetrics(blankSpots, matrix);
    
    // Update history
    this.updateHistory(blankSpots, metrics);
    
    console.log(`\n📊 Found ${blankSpots.length} blank spots:`);
    console.log(`  Implementation holes: ${grouped.implementation.length}`);
    console.log(`  Documentation holes: ${grouped.documentation.length}`);
    console.log(`  Alignment gaps: ${grouped.diagonal.length}`);
    console.log(`  Total liability: ${metrics.totalLiability.toFixed(2)} units`);
    
    return {
      spots: blankSpots,
      grouped: grouped,
      metrics: metrics,
      recommendations: this.generateRecommendations(grouped, metrics)
    };
  }

  /**
   * Calculate severity based on value threshold
   */
  calculateSeverity(value) {
    const thresholds = this.settings.thresholds.blankSpot;
    
    if (value < thresholds.critical) return 3; // Critical
    if (value < thresholds.major) return 2;    // Major  
    if (value < thresholds.minor) return 1;    // Minor
    return 0; // Not a blank spot
  }

  /**
   * Classify the type of blank spot
   */
  classifySpotType(row, col) {
    if (row === col) {
      return 'diagonal'; // Alignment gap
    } else if (row > col) {
      return 'documentation'; // Below diagonal
    } else {
      return 'implementation'; // Above diagonal
    }
  }

  /**
   * Calculate liability for a blank spot
   * Liability = (1 - value)² × severity × age_factor
   */
  calculateLiability(cell, severity) {
    const gap = 1 - cell.value;
    const severityMultiplier = severity; // 1, 2, or 3
    const ageFactor = 1; // Will be enhanced with historical data
    
    return Math.pow(gap, 2) * severityMultiplier * ageFactor;
  }

  /**
   * Get the age of a blank spot from history
   */
  getSpotAge(realCategory, idealCategory) {
    if (!fs.existsSync(this.historyFile)) {
      return 0;
    }
    
    try {
      const history = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
      const key = `${realCategory}:${idealCategory}`;
      
      if (history.spots && history.spots[key]) {
        const firstSeen = new Date(history.spots[key].firstSeen);
        const ageDays = (Date.now() - firstSeen.getTime()) / (1000 * 60 * 60 * 24);
        return Math.floor(ageDays);
      }
    } catch (error) {
      // Ignore history errors
    }
    
    return 0;
  }

  /**
   * Generate human-readable description
   */
  generateDescription(cell, row, col, categories) {
    const realCat = categories[row].name;
    const idealCat = categories[col].name;
    const percentage = (cell.value * 100).toFixed(1);
    
    if (row === col) {
      // Diagonal
      return `${realCat}: Only ${percentage}% alignment between saying and doing`;
    } else if (row > col) {
      // Documentation hole
      return `Working on ${realCat} but not documenting it as ${idealCat} priority`;
    } else {
      // Implementation hole
      return `${idealCat} is documented as important but only ${percentage}% work on ${realCat}`;
    }
  }

  /**
   * Group blank spots by type
   */
  groupByType(blankSpots) {
    const grouped = {
      implementation: [],
      documentation: [],
      diagonal: [],
      critical: []
    };
    
    for (const spot of blankSpots) {
      // Add to type group
      grouped[spot.type].push(spot);
      
      // Also track critical spots
      if (spot.severity === 3) {
        grouped.critical.push(spot);
      }
    }
    
    return grouped;
  }

  /**
   * Calculate aggregate metrics
   */
  calculateMetrics(blankSpots, matrix) {
    const metrics = {
      totalSpots: blankSpots.length,
      totalLiability: 0,
      averageSeverity: 0,
      coverageGap: 0,
      driftVelocity: 0,
      matrixSize: matrix.length * matrix.length,
      blankSpotRatio: 0
    };
    
    // Sum up metrics
    let severitySum = 0;
    for (const spot of blankSpots) {
      metrics.totalLiability += spot.liability;
      severitySum += spot.severity;
    }
    
    // Calculate averages
    if (blankSpots.length > 0) {
      metrics.averageSeverity = severitySum / blankSpots.length;
    }
    
    // Calculate coverage gap (% of matrix that's blank)
    metrics.blankSpotRatio = blankSpots.length / metrics.matrixSize;
    metrics.coverageGap = metrics.blankSpotRatio * 100;
    
    // Calculate drift velocity (change from last run)
    const previousMetrics = this.loadPreviousMetrics();
    if (previousMetrics) {
      const timeDelta = Date.now() - new Date(previousMetrics.timestamp).getTime();
      const daysDelta = timeDelta / (1000 * 60 * 60 * 24);
      
      if (daysDelta > 0) {
        metrics.driftVelocity = (metrics.totalLiability - previousMetrics.totalLiability) / daysDelta;
      }
    }
    
    return metrics;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(grouped, metrics) {
    const recommendations = [];
    
    // Critical spots need immediate attention
    if (grouped.critical.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Address critical blank spots immediately',
        details: grouped.critical.slice(0, 3).map(s => s.description),
        impact: `Reduces liability by ${grouped.critical.slice(0, 3).reduce((sum, s) => sum + s.liability, 0).toFixed(1)} units`
      });
    }
    
    // Implementation holes
    if (grouped.implementation.length > 3) {
      const topHoles = grouped.implementation.slice(0, 3);
      recommendations.push({
        priority: 'HIGH',
        action: 'Implement documented priorities',
        details: topHoles.map(s => `Implement ${s.idealCategory} (currently ${(s.value * 100).toFixed(0)}%)`),
        impact: 'Aligns action with stated priorities'
      });
    }
    
    // Documentation holes
    if (grouped.documentation.length > 3) {
      const topHoles = grouped.documentation.slice(0, 3);
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Document actual work patterns',
        details: topHoles.map(s => `Document why ${s.realCategory} is important`),
        impact: 'Reduces hidden work and technical debt'
      });
    }
    
    // Diagonal alignment
    if (grouped.diagonal.length > 0) {
      const worstAlignment = grouped.diagonal[0];
      recommendations.push({
        priority: 'HIGH',
        action: 'Improve category alignment',
        details: [`${worstAlignment.realCategory} has only ${(worstAlignment.value * 100).toFixed(0)}% alignment`],
        impact: 'Creates coherence between intent and action'
      });
    }
    
    // Drift velocity
    if (metrics.driftVelocity > 1) {
      recommendations.push({
        priority: 'WARNING',
        action: 'Drift is accelerating',
        details: [`Liability increasing by ${metrics.driftVelocity.toFixed(1)} units/day`],
        impact: 'Prevent runaway technical debt'
      });
    }
    
    // General coverage
    if (metrics.coverageGap > 30) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Improve overall coverage',
        details: [`${metrics.coverageGap.toFixed(0)}% of matrix contains blank spots`],
        impact: 'Reduces overall system entropy'
      });
    }
    
    return recommendations;
  }

  /**
   * Update historical tracking
   */
  updateHistory(blankSpots, metrics) {
    let history = {
      version: '1.0',
      spots: {},
      metrics: []
    };
    
    // Load existing history
    if (fs.existsSync(this.historyFile)) {
      try {
        history = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
      } catch (error) {
        console.log('  Creating new history file');
      }
    }
    
    // Update spot tracking
    for (const spot of blankSpots) {
      const key = `${spot.realCategory}:${spot.idealCategory}`;
      
      if (!history.spots[key]) {
        history.spots[key] = {
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          occurrences: 1,
          maxSeverity: spot.severity,
          totalLiability: spot.liability
        };
      } else {
        history.spots[key].lastSeen = new Date().toISOString();
        history.spots[key].occurrences++;
        history.spots[key].maxSeverity = Math.max(history.spots[key].maxSeverity, spot.severity);
        history.spots[key].totalLiability += spot.liability;
      }
    }
    
    // Add metrics snapshot
    history.metrics.unshift({
      timestamp: new Date().toISOString(),
      ...metrics
    });
    
    // Keep only last 100 snapshots
    history.metrics = history.metrics.slice(0, 100);
    
    // Save history
    const historyDir = path.dirname(this.historyFile);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    
    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
  }

  /**
   * Load previous metrics for comparison
   */
  loadPreviousMetrics() {
    if (!fs.existsSync(this.historyFile)) {
      return null;
    }
    
    try {
      const history = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
      if (history.metrics && history.metrics.length > 0) {
        return history.metrics[0];
      }
    } catch (error) {
      // Ignore errors
    }
    
    return null;
  }

  /**
   * Generate visual representation for HTML
   */
  generateVisualization(blankSpots, matrix, categories) {
    const n = matrix.length;
    const grid = [];
    
    // Build visual grid
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        const spot = blankSpots.find(s => s.row === i && s.col === j);
        
        if (spot) {
          // Blank spot - color by severity
          row.push({
            type: 'blank',
            severity: spot.severity,
            value: spot.value,
            liability: spot.liability,
            description: spot.description
          });
        } else {
          // Normal cell
          const cell = matrix[i][j];
          row.push({
            type: cell.isDiagonal ? 'diagonal' : 'normal',
            value: cell.value,
            aligned: cell.value > 0.5
          });
        }
      }
      grid.push(row);
    }
    
    return {
      grid: grid,
      rowLabels: categories.map(c => c.name),
      colLabels: categories.map(c => c.name),
      legend: {
        critical: 'Red - Critical blank spot (severity 3)',
        major: 'Orange - Major blank spot (severity 2)',
        minor: 'Yellow - Minor blank spot (severity 1)',
        aligned: 'Green - Good alignment',
        normal: 'Gray - Normal'
      }
    };
  }
}

// Run if called directly
if (require.main === module) {
  const SettingsManager = require('./trust-debt-settings-manager');
  const ShortLexExtractor = require('./trust-debt-shortlex-extractor');
  const MatrixGenerator = require('./trust-debt-matrix-generator');
  const DocumentTracker = require('./trust-debt-document-tracker');
  const TrustDebtClaudeAnalyzer = require('./trust-debt-claude-analyzer');
  
  (async () => {
    // Load settings
    const settingsManager = new SettingsManager();
    const settings = await settingsManager.load();
    
    // Extract categories
    const extractor = new ShortLexExtractor(settings);
    const categories = await extractor.extractCategories();
    
    // Get data
    const analyzer = new TrustDebtClaudeAnalyzer();
    const commitData = analyzer.getCommitData();
    
    const tracker = new DocumentTracker(settings);
    const documentData = await tracker.loadAllDocuments();
    
    // Generate matrix
    const generator = new MatrixGenerator(settings);
    const matrixResult = await generator.generateMatrix(categories, commitData, documentData);
    
    // Detect blank spots
    const detector = new BlankSpotDetector(settings);
    const result = detector.detectBlankSpots(matrixResult.matrix, categories);
    
    // Show top recommendations
    if (result.recommendations.length > 0) {
      console.log('\n🎯 Top Recommendations:');
      for (const rec of result.recommendations.slice(0, 3)) {
        console.log(`\n[${rec.priority}] ${rec.action}`);
        for (const detail of rec.details) {
          console.log(`  • ${detail}`);
        }
        console.log(`  Impact: ${rec.impact}`);
      }
    }
  })();
}

module.exports = BlankSpotDetector;