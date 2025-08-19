#!/usr/bin/env node

/**
 * Trust Debt Hybrid Pipeline
 * Combines the original Trust/Timing/Recognition analysis with the new matrix visualization
 * 
 * THIS FIXES THE BROKEN SYSTEM:
 * 1. Restores the narrative Trust Debt analysis with FIM scores
 * 2. Adds matrix visualization as complementary insight
 * 3. Shows both momentum graphs AND blank spot detection
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import components
const TrustDebtClaudeAnalyzer = require('./trust-debt-claude-analyzer');
const ShortLexExtractor = require('./trust-debt-shortlex-extractor');
const MatrixGenerator = require('./trust-debt-matrix-generator');
const BlankSpotDetector = require('./trust-debt-blank-spot-detector');

class TrustDebtHybridPipeline {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.timestamp = new Date().toISOString();
  }

  async run() {
    console.log('\n🎯 Trust Debt Hybrid Analysis - Complete System');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Combining Trust/Timing/Recognition with Matrix Visualization');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      // Step 1: Run the ORIGINAL Claude analyzer for Trust/Timing/Recognition
      console.log('📊 Step 1: Running Trust/Timing/Recognition analysis...');
      const analyzer = new TrustDebtClaudeAnalyzer();
      const originalAnalysis = await analyzer.run();
      
      console.log(`  Trust Debt: ${originalAnalysis.analysis.trustDebt} units`);
      console.log(`  Momentum: ${originalAnalysis.analysis.fim.momentum}%`);
      console.log(`  Trend: ${originalAnalysis.analysis.trend}`);

      // Step 2: Generate the matrix visualization as ADDITIONAL insight
      console.log('\n🔲 Step 2: Generating matrix visualization...');
      let matrixData = null;
      let blankSpotData = null;
      
      try {
        // Load settings for matrix generation
        const SettingsManager = require('./trust-debt-settings-manager');
        const DocumentTracker = require('./trust-debt-document-tracker');
        
        const settingsManager = new SettingsManager();
        const settings = await settingsManager.load();
        
        // Extract categories
        const extractor = new ShortLexExtractor(settings);
        const categories = await extractor.extractCategories();
        
        if (categories.length > 0) {
          // Get data for matrix
          const tracker = new DocumentTracker(settings);
          const documentData = await tracker.loadAllDocuments();
          
          // Generate matrix
          const generator = new MatrixGenerator(settings);
          matrixData = await generator.generateMatrix(
            categories,
            originalAnalysis.commits,
            documentData
          );
          
          // Detect blank spots
          const detector = new BlankSpotDetector(settings);
          blankSpotData = detector.detectBlankSpots(matrixData.matrix, categories);
          
          console.log(`  Matrix generated: ${categories.length}×${categories.length}`);
          console.log(`  Blank spots detected: ${blankSpotData.spots.length}`);
        }
      } catch (error) {
        console.log('  ⚠️ Matrix generation failed, continuing with core analysis');
        console.error(error.message);
      }

      // Step 3: Generate comprehensive HTML report
      console.log('\n📝 Step 3: Generating comprehensive HTML report...');
      await this.generateHybridHTML(originalAnalysis, matrixData, blankSpotData);
      
      // Step 4: Update history for graphs
      console.log('\n📈 Step 4: Updating history for momentum graphs...');
      this.updateHistory(originalAnalysis);

      console.log('\n' + '═'.repeat(60));
      console.log('✅ HYBRID ANALYSIS COMPLETE');
      console.log('═'.repeat(60));
      console.log(`\n📊 Trust Debt: ${originalAnalysis.analysis.trustDebt} units (${originalAnalysis.analysis.trend})`);
      console.log(`🚀 FIM Momentum: ${originalAnalysis.analysis.fim.momentum}% (${originalAnalysis.analysis.fim.leverage}x leverage)`);
      console.log(`📈 Intent Gaps: Trust ${(originalAnalysis.analysis.gaps.trust * 100).toFixed(0)}% | Timing ${(originalAnalysis.analysis.gaps.timing * 100).toFixed(0)}% | Recognition ${(originalAnalysis.analysis.gaps.recognition * 100).toFixed(0)}%`);
      
      if (matrixData) {
        console.log(`\n🔲 Matrix Insights:`);
        console.log(`  Categories: ${matrixData.categories.map(c => c.name).join(', ')}`);
        console.log(`  Alignment: ${(matrixData.stats.alignment * 100).toFixed(1)}%`);
        
        if (blankSpotData) {
          console.log(`  Blank Spots: ${blankSpotData.spots.length} (${blankSpotData.metrics.totalLiability.toFixed(1)} liability)`);
        }
      }
      
      console.log(`\n🌐 Report: trust-debt-report.html`);
      
      return originalAnalysis;
      
    } catch (error) {
      console.error('\n❌ Pipeline Error:', error.message);
      console.error(error.stack);
      
      // Fallback to pure original analyzer
      console.log('\n🔄 Falling back to original analyzer...');
      const analyzer = new TrustDebtClaudeAnalyzer();
      return await analyzer.run();
    }
  }

  /**
   * Generate HTML that combines both analyses
   */
  async generateHybridHTML(originalAnalysis, matrixData, blankSpotData) {
    const { analysis, commits, repoState, documents, timestamp } = originalAnalysis;
    
    // Load history for graphs
    const history = this.loadHistory();
    const recentHistory = history.calculations.slice(0, 30).reverse();
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt: ${analysis.trustDebt} Units - ${analysis.trend}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'SF Pro Display', -apple-system, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
            color: #e2e8f0;
            line-height: 1.7;
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, 
                ${analysis.isInsurable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'} 0%, 
                rgba(0, 0, 0, 0.8) 100%);
            padding: 60px 20px;
            text-align: center;
            border-radius: 20px;
            margin-bottom: 40px;
        }

        .debt-display {
            font-size: 10rem;
            font-weight: 900;
            color: ${analysis.isInsurable ? '#10b981' : '#ef4444'};
            margin: 30px 0;
            text-shadow: 0 0 80px currentColor;
            animation: glow 3s ease-in-out infinite;
        }

        @keyframes glow {
            0%, 100% { text-shadow: 0 0 80px currentColor; }
            50% { text-shadow: 0 0 120px currentColor, 0 0 40px currentColor; }
        }

        .trend-badge {
            display: inline-block;
            padding: 12px 30px;
            border-radius: 30px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 20px 0;
            font-size: 1.1rem;
            ${analysis.trend === 'improving' ? `
                background: rgba(16, 185, 129, 0.2);
                color: #10b981;
                border: 2px solid #10b981;
            ` : analysis.trend === 'degrading' ? `
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
                border: 2px solid #ef4444;
            ` : `
                background: rgba(245, 158, 11, 0.2);
                color: #f59e0b;
                border: 2px solid #f59e0b;
            `}
        }

        /* FIM Score Display */
        .fim-display {
            display: flex;
            justify-content: center;
            gap: 60px;
            margin: 40px 0;
            flex-wrap: wrap;
        }

        .fim-metric {
            text-align: center;
        }

        .fim-value {
            font-size: 3.5rem;
            font-weight: 900;
            margin: 10px 0;
            background: linear-gradient(135deg, #8b5cf6, #ec4899);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .fim-label {
            font-size: 1rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        /* Section Cards */
        .section-card {
            background: rgba(30, 41, 59, 0.6);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 20px;
            padding: 30px;
            margin: 30px 0;
            backdrop-filter: blur(10px);
        }

        .section-title {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #8b5cf6, #ec4899);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        /* Intent Gaps */
        .gap-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 20px 0;
        }

        .gap-card {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            border: 1px solid rgba(139, 92, 246, 0.1);
        }

        .gap-value {
            font-size: 2.5rem;
            font-weight: bold;
            margin: 10px 0;
        }

        .gap-label {
            color: #94a3b8;
            text-transform: uppercase;
            font-size: 0.9rem;
        }

        /* Matrix Visualization (if available) */
        .matrix-container {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            border-radius: 15px;
            overflow-x: auto;
            margin: 20px 0;
        }

        .matrix-grid {
            display: inline-block;
            border: 2px solid #374151;
            border-radius: 10px;
        }

        .matrix-cell {
            width: 60px;
            height: 60px;
            border: 1px solid #1f2937;
            display: inline-block;
            text-align: center;
            line-height: 60px;
            font-size: 12px;
        }

        /* Charts */
        .chart-container {
            position: relative;
            height: 300px;
            margin: 30px 0;
        }

        /* Insights */
        .insight-card {
            background: rgba(139, 92, 246, 0.1);
            border-left: 4px solid #8b5cf6;
            padding: 15px 20px;
            margin: 15px 0;
            border-radius: 10px;
        }

        /* Recommendations */
        .recommendation {
            background: rgba(16, 185, 129, 0.1);
            border-left: 4px solid #10b981;
            padding: 15px 20px;
            margin: 15px 0;
            border-radius: 10px;
        }

        /* Commit Analysis */
        .commit-card {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            margin: 15px 0;
            border-radius: 15px;
            border-left: 4px solid #3b82f6;
        }

        .commit-scores {
            display: flex;
            gap: 20px;
            margin-top: 15px;
        }

        .score-item {
            flex: 1;
            text-align: center;
        }

        .score-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #8b5cf6;
        }

        /* Auto-refresh indicator */
        .refresh-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(139, 92, 246, 0.2);
            border: 1px solid #8b5cf6;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            z-index: 1000;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="refresh-indicator">
        🤖 Claude AI Analysis
    </div>

    <div class="container">
        <!-- Hero Section -->
        <div class="hero">
            <h1 style="font-size: 3rem; margin-bottom: 20px;">Trust Debt Analysis</h1>
            <div class="debt-display">${analysis.trustDebt}</div>
            <div class="trend-badge">${analysis.trend}</div>
            <p style="font-size: 1.2rem; margin-top: 20px;">
                ${analysis.isInsurable ? '✅ Insurable' : '⚠️ Not Insurable'}
            </p>

            <!-- FIM Scores -->
            <div class="fim-display">
                <div class="fim-metric">
                    <div class="fim-value">${analysis.fim.skill}%</div>
                    <div class="fim-label">Skill</div>
                </div>
                <div class="fim-metric">
                    <div class="fim-value">${analysis.fim.environment}%</div>
                    <div class="fim-label">Environment</div>
                </div>
                <div class="fim-metric">
                    <div class="fim-value">${analysis.fim.momentum}%</div>
                    <div class="fim-label">Momentum</div>
                </div>
                <div class="fim-metric">
                    <div class="fim-value">${analysis.fim.leverage}x</div>
                    <div class="fim-label">Leverage</div>
                </div>
            </div>
        </div>

        <!-- Intent vs Reality Gaps -->
        <div class="section-card">
            <h2 class="section-title">📊 Intent vs Reality Gaps</h2>
            <p style="margin-bottom: 20px;">Measuring drift between stated priorities and actual work</p>
            
            <div class="gap-grid">
                <div class="gap-card">
                    <div class="gap-label">Trust Gap</div>
                    <div class="gap-value" style="color: ${analysis.gaps.trust < 0.15 ? '#10b981' : analysis.gaps.trust < 0.25 ? '#f59e0b' : '#ef4444'}">
                        ${(analysis.gaps.trust * 100).toFixed(0)}%
                    </div>
                    <div style="color: #64748b; font-size: 0.9rem;">
                        Intent: ${(originalAnalysis.intent.vector.trust * 100).toFixed(0)}%
                    </div>
                </div>
                <div class="gap-card">
                    <div class="gap-label">Timing Gap</div>
                    <div class="gap-value" style="color: ${analysis.gaps.timing < 0.15 ? '#10b981' : analysis.gaps.timing < 0.25 ? '#f59e0b' : '#ef4444'}">
                        ${(analysis.gaps.timing * 100).toFixed(0)}%
                    </div>
                    <div style="color: #64748b; font-size: 0.9rem;">
                        Intent: ${(originalAnalysis.intent.vector.timing * 100).toFixed(0)}%
                    </div>
                </div>
                <div class="gap-card">
                    <div class="gap-label">Recognition Gap</div>
                    <div class="gap-value" style="color: ${analysis.gaps.recognition < 0.15 ? '#10b981' : analysis.gaps.recognition < 0.25 ? '#f59e0b' : '#ef4444'}">
                        ${(analysis.gaps.recognition * 100).toFixed(0)}%
                    </div>
                    <div style="color: #64748b; font-size: 0.9rem;">
                        Intent: ${(originalAnalysis.intent.vector.recognition * 100).toFixed(0)}%
                    </div>
                </div>
            </div>
        </div>

        <!-- Momentum Graph -->
        <div class="section-card">
            <h2 class="section-title">📈 Trust Debt Momentum</h2>
            <div class="chart-container">
                <canvas id="momentumChart"></canvas>
            </div>
        </div>

        ${matrixData && blankSpotData ? `
        <!-- Matrix Visualization (Additional Insight) -->
        <div class="section-card">
            <h2 class="section-title">🔲 Category Matrix Analysis</h2>
            <p style="margin-bottom: 20px;">Additional insight: Work distribution across categories</p>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">
                <div>
                    <h3 style="margin-bottom: 10px;">Extracted Categories:</h3>
                    ${matrixData.categories.map(cat => `
                        <span style="display: inline-block; padding: 5px 10px; margin: 5px; background: rgba(139, 92, 246, 0.2); border-radius: 10px;">
                            ${cat.name} (${(cat.weight * 100).toFixed(0)}%)
                        </span>
                    `).join('')}
                </div>
                <div>
                    <h3 style="margin-bottom: 10px;">Matrix Stats:</h3>
                    <p>Alignment: ${(matrixData.stats.alignment * 100).toFixed(1)}%</p>
                    <p>Blank Spots: ${blankSpotData.spots.length}</p>
                    <p>Total Liability: ${blankSpotData.metrics.totalLiability.toFixed(1)} units</p>
                </div>
            </div>

            ${blankSpotData.recommendations.slice(0, 2).map(rec => `
                <div class="recommendation">
                    <strong>[${rec.priority}]</strong> ${rec.action}<br>
                    <span style="color: #94a3b8;">Impact: ${rec.impact}</span>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- Insights -->
        <div class="section-card">
            <h2 class="section-title">💡 Key Insights</h2>
            ${analysis.insights.map(insight => `
                <div class="insight-card">${insight}</div>
            `).join('')}
        </div>

        <!-- Recommendations -->
        <div class="section-card">
            <h2 class="section-title">🎯 Recommendations</h2>
            ${analysis.recommendations.map(rec => `
                <div class="recommendation">${rec}</div>
            `).join('')}
        </div>

        <!-- Recent Commits Analysis -->
        <div class="section-card">
            <h2 class="section-title">📝 Recent Commits Analysis</h2>
            ${commits.slice(0, 3).map(commit => `
                <div class="commit-card">
                    <div style="font-weight: bold; margin-bottom: 10px;">
                        ${commit.hash} - ${commit.subject}
                    </div>
                    <div class="commit-scores">
                        <div class="score-item">
                            <div class="score-value">${commit.analysis.trust > 0 ? '+' : ''}${commit.analysis.trust}</div>
                            <div style="color: #94a3b8; font-size: 0.9rem;">Trust</div>
                        </div>
                        <div class="score-item">
                            <div class="score-value">${commit.analysis.timing > 0 ? '+' : ''}${commit.analysis.timing}</div>
                            <div style="color: #94a3b8; font-size: 0.9rem;">Timing</div>
                        </div>
                        <div class="score-item">
                            <div class="score-value">${commit.analysis.recognition > 0 ? '+' : ''}${commit.analysis.recognition}</div>
                            <div style="color: #94a3b8; font-size: 0.9rem;">Recognition</div>
                        </div>
                    </div>
                    ${commit.analysis.insight ? `
                        <div style="margin-top: 15px; padding: 10px; background: rgba(139, 92, 246, 0.1); border-radius: 10px;">
                            ${commit.analysis.insight}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <!-- Metadata -->
        <div style="text-align: center; margin-top: 40px; color: #64748b; font-size: 0.9rem;">
            Generated: ${new Date(timestamp).toLocaleString()}<br>
            Branch: ${repoState.branch} | Status: ${repoState.status} | Spec Age: ${repoState.specAge} days<br>
            Analysis powered by Claude AI
        </div>
    </div>

    <script>
        // Momentum Chart
        const ctx = document.getElementById('momentumChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(recentHistory.map(h => new Date(h.timestamp).toLocaleDateString()))},
                datasets: [
                    {
                        label: 'Trust Debt',
                        data: ${JSON.stringify(recentHistory.map(h => h.debt))},
                        borderColor: '${analysis.trend === 'improving' ? '#10b981' : '#ef4444'}',
                        backgroundColor: '${analysis.trend === 'improving' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}',
                        tension: 0.4
                    },
                    {
                        label: 'Momentum',
                        data: ${JSON.stringify(recentHistory.map(h => h.momentum))},
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#e2e8f0' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                    },
                    y: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                    }
                }
            }
        });

        // Auto-refresh every 5 seconds (only if file changes)
        let lastModified = '${timestamp}';
        setInterval(async () => {
            try {
                const response = await fetch('/trust-debt-analysis.json');
                const data = await response.json();
                if (data.timestamp !== lastModified) {
                    location.reload();
                }
            } catch (e) {
                // Ignore errors
            }
        }, 5000);
    </script>
</body>
</html>`;

    // Save HTML
    const htmlFile = path.join(this.projectRoot, 'trust-debt-report.html');
    fs.writeFileSync(htmlFile, html);
    
    console.log(`  HTML report saved to: ${htmlFile}`);
  }

  /**
   * Load history for graphs
   */
  loadHistory() {
    const historyFile = path.join(this.projectRoot, 'trust-debt-history.json');
    if (fs.existsSync(historyFile)) {
      try {
        return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      } catch (e) {
        // Ignore
      }
    }
    return { calculations: [] };
  }

  /**
   * Update history with new analysis
   */
  updateHistory(analysis) {
    const historyFile = path.join(this.projectRoot, 'trust-debt-history.json');
    let history = this.loadHistory();
    
    // Add new entry
    history.calculations.unshift({
      timestamp: this.timestamp,
      debt: analysis.analysis.trustDebt,
      momentum: analysis.analysis.fim.momentum,
      leverage: analysis.analysis.fim.leverage,
      gaps: analysis.analysis.gaps,
      trend: analysis.analysis.trend,
      aiAnalysis: true,
      insights: analysis.analysis.insights.length,
      recommendations: analysis.analysis.recommendations.length
    });
    
    // Keep only last 100 entries
    history.calculations = history.calculations.slice(0, 100);
    
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  }
}

// Run if called directly
if (require.main === module) {
  const pipeline = new TrustDebtHybridPipeline();
  pipeline.run().catch(error => {
    console.error('Pipeline failed:', error);
    process.exit(1);
  });
}

module.exports = TrustDebtHybridPipeline;