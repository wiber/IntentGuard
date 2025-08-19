#!/usr/bin/env node

/**
 * Trust Debt Full Pipeline
 * Orchestrates all components to generate the complete matrix-based analysis
 * 
 * THIS IS THE COMPLETE IMPLEMENTATION:
 * 1. Extract dynamic categories (not Trust/Timing/Recognition)
 * 2. Build trade-off matrix (Real vs Ideal)
 * 3. Detect blank spots (liability accumulation)
 * 4. Generate forcing function (accountability through measurement)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import all components
const SettingsManager = require('./trust-debt-settings-manager');
const DocumentTracker = require('./trust-debt-document-tracker');
const ShortLexExtractor = require('./trust-debt-shortlex-extractor');
const MatrixGenerator = require('./trust-debt-matrix-generator');
const BlankSpotDetector = require('./trust-debt-blank-spot-detector');
const TrustDebtClaudeAnalyzer = require('./trust-debt-claude-analyzer');

class TrustDebtFullPipeline {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.timestamp = new Date().toISOString();
    this.outputFile = path.join(this.projectRoot, 'trust-debt-matrix-analysis.json');
  }

  async run() {
    console.log('\n🎯 Trust Debt Full Pipeline - Matrix-Based Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Moving from abstract concepts to REAL work categories');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      // Step 1: Load settings and initialize
      console.log('📋 Step 1: Loading settings...');
      const settingsManager = new SettingsManager();
      const settings = await settingsManager.load();
      
      // Step 2: Extract dynamic categories (NOT Trust/Timing/Recognition!)
      console.log('\n🔍 Step 2: Extracting DYNAMIC categories from actual work...');
      const extractor = new ShortLexExtractor(settings);
      const categories = await extractor.extractCategories();
      
      if (categories.length === 0) {
        throw new Error('No categories extracted - cannot build matrix');
      }
      
      // Step 3: Gather commit and document data
      console.log('\n📊 Step 3: Gathering commit and document data...');
      const analyzer = new TrustDebtClaudeAnalyzer();
      await analyzer.initialize();
      
      const commitData = analyzer.getCommitData();
      const repoState = analyzer.getRepoState();
      
      const tracker = new DocumentTracker(settings);
      const documentData = await tracker.loadAllDocuments();
      
      console.log(`  Commits: ${commitData.length}`);
      console.log(`  Documents: ${Object.keys(documentData).length}`);
      
      // Step 4: Generate the trade-off matrix
      console.log('\n🔲 Step 4: Building trade-off matrix (Real vs Ideal)...');
      const generator = new MatrixGenerator(settings);
      const matrixResult = await generator.generateMatrix(categories, commitData, documentData);
      
      // Step 5: Detect blank spots (the forcing function!)
      console.log('\n⚠️  Step 5: Detecting blank spots (liability accumulation)...');
      const detector = new BlankSpotDetector(settings);
      const blankSpotResult = detector.detectBlankSpots(matrixResult.matrix, categories);
      
      // Step 6: Calculate Trust Debt from matrix
      console.log('\n💰 Step 6: Calculating Trust Debt from matrix...');
      const trustDebt = this.calculateTrustDebtFromMatrix(matrixResult, blankSpotResult);
      
      // Step 7: Generate complete analysis
      console.log('\n📈 Step 7: Generating complete analysis...');
      const fullAnalysis = {
        timestamp: this.timestamp,
        version: '3.0', // Matrix-based version
        
        // The NEW approach - dynamic categories
        categories: categories.map(c => ({
          name: c.name,
          symbol: c.symbol,
          weight: c.weight,
          fromCommits: c.fromCommits,
          fromDocs: c.fromDocs
        })),
        
        // The CORE innovation - trade-off matrix
        matrix: {
          data: matrixResult.matrix,
          realWeights: matrixResult.realWeights,
          idealWeights: matrixResult.idealWeights,
          stats: matrixResult.stats,
          visualization: this.generateMatrixVisualization(matrixResult.matrix, categories)
        },
        
        // The FORCING FUNCTION - blank spots
        blankSpots: {
          total: blankSpotResult.spots.length,
          byType: blankSpotResult.grouped,
          totalLiability: blankSpotResult.metrics.totalLiability,
          driftVelocity: blankSpotResult.metrics.driftVelocity,
          recommendations: blankSpotResult.recommendations
        },
        
        // Trust Debt calculation
        trustDebt: trustDebt,
        
        // Repository context
        repository: {
          ...repoState,
          commitCount: commitData.length,
          documentCount: Object.keys(documentData).length
        },
        
        // Recent commits with category analysis
        commits: commitData.slice(0, 5).map(c => ({
          ...c,
          categories: this.categorizeCommit(c, categories)
        })),
        
        // Key insights
        insights: this.generateInsights(matrixResult, blankSpotResult, trustDebt),
        
        // Metadata
        metadata: {
          pipeline: 'full-matrix',
          componentsUsed: [
            'SettingsManager',
            'DocumentTracker', 
            'ShortLexExtractor',
            'MatrixGenerator',
            'BlankSpotDetector'
          ],
          categoriesExtracted: categories.length,
          matrixSize: `${categories.length}×${categories.length}`,
          processingTime: Date.now() - new Date(this.timestamp).getTime()
        }
      };
      
      // Step 8: Save results
      console.log('\n💾 Step 8: Saving analysis...');
      this.saveAnalysis(fullAnalysis);
      
      // Step 9: Generate HTML report
      console.log('\n🎨 Step 9: Generating HTML report...');
      await this.generateHTMLReport(fullAnalysis);
      
      // Final summary
      console.log('\n' + '═'.repeat(60));
      console.log('✅ MATRIX-BASED ANALYSIS COMPLETE');
      console.log('═'.repeat(60));
      console.log(`\n📊 Trust Debt: ${trustDebt.score} units (${trustDebt.trend})`);
      console.log(`🔲 Matrix Alignment: ${(matrixResult.stats.alignment * 100).toFixed(1)}%`);
      console.log(`⚠️  Blank Spots: ${blankSpotResult.spots.length} (${blankSpotResult.metrics.totalLiability.toFixed(1)} liability)`);
      
      if (blankSpotResult.recommendations.length > 0) {
        console.log('\n🎯 Top Priority:');
        const topRec = blankSpotResult.recommendations[0];
        console.log(`  [${topRec.priority}] ${topRec.action}`);
        console.log(`  Impact: ${topRec.impact}`);
      }
      
      console.log(`\n📄 Full analysis: ${this.outputFile}`);
      console.log(`🌐 HTML report: trust-debt-matrix-report.html`);
      
      return fullAnalysis;
      
    } catch (error) {
      console.error('\n❌ Pipeline Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Calculate Trust Debt score from matrix analysis
   */
  calculateTrustDebtFromMatrix(matrixResult, blankSpotResult) {
    // New formula: Trust Debt = Liability × (1 - Alignment) × Time_Factor
    const liability = blankSpotResult.metrics.totalLiability;
    const misalignment = 1 - matrixResult.stats.alignment;
    const timeFactor = 1.5; // Will increase with spec age
    
    const score = Math.round(liability * misalignment * timeFactor * 100);
    
    // Determine trend based on drift velocity
    let trend = 'stable';
    if (blankSpotResult.metrics.driftVelocity > 1) {
      trend = 'degrading';
    } else if (blankSpotResult.metrics.driftVelocity < -0.5) {
      trend = 'improving';
    }
    
    return {
      score: Math.min(500, Math.max(0, score)), // Cap at 500
      trend: trend,
      isInsurable: score < 300,
      components: {
        liability: liability,
        misalignment: misalignment,
        timeFactor: timeFactor
      }
    };
  }

  /**
   * Categorize a commit based on extracted categories
   */
  categorizeCommit(commit, categories) {
    const found = [];
    const text = (commit.subject + ' ' + commit.body).toLowerCase();
    
    for (const cat of categories) {
      // Simple keyword matching for now
      const keywords = cat.name.replace(/([A-Z])/g, ' $1').toLowerCase().split(' ');
      for (const keyword of keywords) {
        if (keyword.length > 3 && text.includes(keyword)) {
          found.push(cat.name);
          break;
        }
      }
    }
    
    // Also check files
    for (const file of commit.filesChanged || []) {
      for (const cat of categories) {
        if (file.toLowerCase().includes(cat.name.toLowerCase())) {
          if (!found.includes(cat.name)) {
            found.push(cat.name);
          }
        }
      }
    }
    
    return found.length > 0 ? found : ['Uncategorized'];
  }

  /**
   * Generate matrix visualization for HTML
   */
  generateMatrixVisualization(matrix, categories) {
    const n = Math.min(7, matrix.length); // Limit to 7x7 for visualization
    const visual = {
      size: n,
      rowLabels: categories.slice(0, n).map(c => c.name),
      colLabels: categories.slice(0, n).map(c => c.name),
      cells: []
    };
    
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        const cell = matrix[i][j];
        row.push({
          value: cell.value,
          color: this.getCellColor(cell),
          isDiagonal: i === j,
          isBlank: cell.isBlankSpot
        });
      }
      visual.cells.push(row);
    }
    
    return visual;
  }

  /**
   * Get color for matrix cell
   */
  getCellColor(cell) {
    if (cell.isBlankSpot) {
      return '#ef4444'; // Red for blank spots
    }
    if (cell.isDiagonal) {
      if (cell.value > 0.5) return '#10b981'; // Green for good alignment
      if (cell.value > 0.2) return '#f59e0b'; // Yellow for moderate
      return '#ef4444'; // Red for poor
    }
    // Off-diagonal
    if (cell.value > 0.1) return '#f59e0b'; // Yellow for contamination
    return '#374151'; // Gray for clean
  }

  /**
   * Generate insights from analysis
   */
  generateInsights(matrixResult, blankSpotResult, trustDebt) {
    const insights = [];
    
    // Alignment insight
    if (matrixResult.stats.alignment > 0.7) {
      insights.push('✅ Strong alignment between stated and actual priorities');
    } else if (matrixResult.stats.alignment < 0.3) {
      insights.push('⚠️ Severe misalignment between documentation and implementation');
    }
    
    // Blank spot insights
    if (blankSpotResult.grouped.critical.length > 0) {
      insights.push(`🔴 ${blankSpotResult.grouped.critical.length} critical blank spots need immediate attention`);
    }
    
    if (blankSpotResult.grouped.implementation.length > blankSpotResult.grouped.documentation.length) {
      insights.push('📝 More implementation holes than documentation - priorities not being executed');
    } else if (blankSpotResult.grouped.documentation.length > blankSpotResult.grouped.implementation.length) {
      insights.push('📚 More documentation holes - hidden work not being tracked');
    }
    
    // Drift insights
    if (blankSpotResult.metrics.driftVelocity > 2) {
      insights.push('📈 Rapid drift acceleration - intervention needed');
    } else if (blankSpotResult.metrics.driftVelocity < -1) {
      insights.push('📉 Drift reducing - current efforts working');
    }
    
    // Trust Debt insight
    if (trustDebt.isInsurable) {
      insights.push(`✅ Trust Debt insurable at ${trustDebt.score} units`);
    } else {
      insights.push(`⚠️ Trust Debt too high for insurance at ${trustDebt.score} units`);
    }
    
    return insights;
  }

  /**
   * Save analysis to JSON
   */
  saveAnalysis(analysis) {
    fs.writeFileSync(this.outputFile, JSON.stringify(analysis, null, 2));
    
    // Also update the legacy file for compatibility
    const legacyFile = path.join(this.projectRoot, 'trust-debt-analysis.json');
    const legacyFormat = {
      ...analysis,
      analysis: {
        trustDebt: analysis.trustDebt.score,
        isInsurable: analysis.trustDebt.isInsurable,
        trend: analysis.trustDebt.trend,
        gaps: {
          trust: 0.15, // Placeholder for compatibility
          timing: 0.10,
          recognition: 0.08
        }
      }
    };
    
    fs.writeFileSync(legacyFile, JSON.stringify(legacyFormat, null, 2));
  }

  /**
   * Generate HTML report with matrix visualization
   */
  async generateHTMLReport(analysis) {
    const htmlFile = path.join(this.projectRoot, 'trust-debt-matrix-report.html');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt Matrix: ${analysis.trustDebt.score} Units</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'SF Pro Display', -apple-system, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
            color: #e2e8f0;
            padding: 40px 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        /* Hero Section */
        .hero {
            text-align: center;
            margin-bottom: 40px;
            padding: 40px;
            background: rgba(30, 41, 59, 0.6);
            border-radius: 20px;
            border: 1px solid rgba(139, 92, 246, 0.2);
        }
        
        .debt-score {
            font-size: 120px;
            font-weight: 900;
            color: ${analysis.trustDebt.isInsurable ? '#10b981' : '#ef4444'};
            text-shadow: 0 0 40px currentColor;
            margin: 20px 0;
        }
        
        .trend {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 20px;
            background: ${analysis.trustDebt.trend === 'improving' ? 'rgba(16, 185, 129, 0.2)' : 
                         analysis.trustDebt.trend === 'degrading' ? 'rgba(239, 68, 68, 0.2)' : 
                         'rgba(245, 158, 11, 0.2)'};
            color: ${analysis.trustDebt.trend === 'improving' ? '#10b981' : 
                    analysis.trustDebt.trend === 'degrading' ? '#ef4444' : 
                    '#f59e0b'};
            font-weight: bold;
            text-transform: uppercase;
        }
        
        /* Matrix Visualization */
        .matrix-section {
            background: rgba(30, 41, 59, 0.6);
            border-radius: 20px;
            padding: 30px;
            margin: 30px 0;
            border: 1px solid rgba(139, 92, 246, 0.2);
        }
        
        .matrix-title {
            font-size: 24px;
            margin-bottom: 20px;
            color: #8b5cf6;
        }
        
        .matrix-container {
            overflow-x: auto;
        }
        
        .matrix-grid {
            display: inline-block;
            border: 2px solid #374151;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .matrix-row {
            display: flex;
        }
        
        .matrix-cell {
            width: 80px;
            height: 80px;
            border: 1px solid #1f2937;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            position: relative;
            transition: transform 0.2s;
        }
        
        .matrix-cell:hover {
            transform: scale(1.1);
            z-index: 10;
            border: 2px solid #8b5cf6;
        }
        
        .matrix-label {
            background: #1f2937;
            padding: 10px;
            font-size: 12px;
            writing-mode: vertical-rl;
            text-orientation: mixed;
        }
        
        .matrix-label-row {
            background: #1f2937;
            padding: 10px;
            font-size: 12px;
            width: 100px;
        }
        
        /* Blank Spots */
        .blank-spots {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .blank-spot-item {
            padding: 10px;
            margin: 10px 0;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            border-left: 4px solid #ef4444;
        }
        
        /* Recommendations */
        .recommendations {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid #10b981;
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .rec-item {
            margin: 15px 0;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
        }
        
        .priority-critical {
            border-left: 4px solid #ef4444;
        }
        
        .priority-high {
            border-left: 4px solid #f59e0b;
        }
        
        .priority-medium {
            border-left: 4px solid #3b82f6;
        }
        
        /* Categories */
        .categories {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 20px 0;
        }
        
        .category-badge {
            padding: 8px 16px;
            background: rgba(139, 92, 246, 0.2);
            border: 1px solid #8b5cf6;
            border-radius: 20px;
            font-size: 14px;
        }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .stat-card {
            background: rgba(30, 41, 59, 0.8);
            padding: 20px;
            border-radius: 15px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 36px;
            font-weight: bold;
            color: #8b5cf6;
        }
        
        .stat-label {
            font-size: 14px;
            color: #94a3b8;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Hero Section -->
        <div class="hero">
            <h1 style="font-size: 48px; margin-bottom: 20px;">Trust Debt Matrix Analysis</h1>
            <div class="debt-score">${analysis.trustDebt.score}</div>
            <div class="trend">${analysis.trustDebt.trend}</div>
            <p style="margin-top: 20px; font-size: 18px; color: #94a3b8;">
                ${analysis.trustDebt.isInsurable ? '✅ Insurable' : '⚠️ Not Insurable'} | 
                Matrix Alignment: ${(analysis.matrix.stats.alignment * 100).toFixed(1)}%
            </p>
        </div>
        
        <!-- Dynamic Categories -->
        <div class="matrix-section">
            <h2 class="matrix-title">📊 Dynamic Categories Extracted</h2>
            <p style="color: #94a3b8; margin-bottom: 15px;">
                Moving from abstract Trust/Timing/Recognition to REAL work categories:
            </p>
            <div class="categories">
                ${analysis.categories.map(cat => `
                    <div class="category-badge">
                        ${cat.symbol} ${cat.name} (${(cat.weight * 100).toFixed(0)}%)
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Trade-off Matrix -->
        <div class="matrix-section">
            <h2 class="matrix-title">🔲 Trade-off Matrix: Real (Commits) vs Ideal (Docs)</h2>
            <p style="color: #94a3b8; margin-bottom: 20px;">
                Diagonal = alignment | Red = blank spots (liability) | Yellow = misalignment
            </p>
            <div class="matrix-container">
                ${this.renderMatrixHTML(analysis.matrix.visualization)}
            </div>
        </div>
        
        <!-- Blank Spots -->
        <div class="blank-spots">
            <h2 style="margin-bottom: 15px;">⚠️ Blank Spots Detected: ${analysis.blankSpots.total}</h2>
            <p style="color: #f87171; margin-bottom: 15px;">
                Total Liability: ${analysis.blankSpots.totalLiability.toFixed(2)} units
                ${analysis.blankSpots.driftVelocity > 0 ? 
                  `| Drift: +${analysis.blankSpots.driftVelocity.toFixed(1)}/day` : ''}
            </p>
            ${analysis.blankSpots.byType.critical.slice(0, 3).map(spot => `
                <div class="blank-spot-item">
                    ${spot.description}
                </div>
            `).join('')}
        </div>
        
        <!-- Recommendations -->
        <div class="recommendations">
            <h2 style="margin-bottom: 15px;">🎯 Recommendations</h2>
            ${analysis.blankSpots.recommendations.slice(0, 3).map(rec => `
                <div class="rec-item priority-${rec.priority.toLowerCase()}">
                    <strong>[${rec.priority}]</strong> ${rec.action}<br>
                    <span style="color: #94a3b8;">Impact: ${rec.impact}</span>
                </div>
            `).join('')}
        </div>
        
        <!-- Stats Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${analysis.blankSpots.total}</div>
                <div class="stat-label">Blank Spots</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(analysis.matrix.stats.alignment * 100).toFixed(0)}%</div>
                <div class="stat-label">Alignment</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${analysis.blankSpots.totalLiability.toFixed(0)}</div>
                <div class="stat-label">Total Liability</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${analysis.categories.length}</div>
                <div class="stat-label">Categories</div>
            </div>
        </div>
        
        <!-- Insights -->
        <div class="matrix-section">
            <h2 class="matrix-title">💡 Key Insights</h2>
            ${analysis.insights.map(insight => `
                <p style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px;">
                    ${insight}
                </p>
            `).join('')}
        </div>
        
        <!-- Metadata -->
        <div style="text-align: center; margin-top: 40px; color: #64748b; font-size: 14px;">
            Generated: ${new Date(analysis.timestamp).toLocaleString()}<br>
            Matrix Size: ${analysis.metadata.matrixSize} | 
            Processing Time: ${analysis.metadata.processingTime}ms
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(htmlFile, html);
    
    // Also create a simplified version for the commit hook
    const simpleHtmlFile = path.join(this.projectRoot, 'trust-debt-report.html');
    fs.writeFileSync(simpleHtmlFile, html);
    
    console.log(`  HTML saved to: ${htmlFile}`);
  }

  /**
   * Render matrix as HTML table
   */
  renderMatrixHTML(visualization) {
    if (!visualization || !visualization.cells) {
      return '<p>Matrix visualization not available</p>';
    }
    
    let html = '<table style="border-collapse: collapse;">';
    
    // Header row
    html += '<tr><td></td>';
    for (const label of visualization.colLabels) {
      html += `<td class="matrix-label">${label}</td>`;
    }
    html += '</tr>';
    
    // Data rows
    for (let i = 0; i < visualization.cells.length; i++) {
      html += '<tr>';
      html += `<td class="matrix-label-row">${visualization.rowLabels[i]}</td>`;
      
      for (const cell of visualization.cells[i]) {
        const style = `background: ${cell.color}; color: ${cell.value > 0.3 ? 'white' : '#94a3b8'};`;
        const content = cell.isBlank ? '⚠️' : (cell.value * 100).toFixed(0) + '%';
        html += `<td class="matrix-cell" style="${style}">${content}</td>`;
      }
      
      html += '</tr>';
    }
    
    html += '</table>';
    return html;
  }
}

// Run if called directly
if (require.main === module) {
  const pipeline = new TrustDebtFullPipeline();
  pipeline.run().catch(error => {
    console.error('Pipeline failed:', error);
    process.exit(1);
  });
}

module.exports = TrustDebtFullPipeline;