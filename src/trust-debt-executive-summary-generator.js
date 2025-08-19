#!/usr/bin/env node

/**
 * Trust Debt Executive Summary Generator
 * 
 * Creates a concise, credible executive summary that:
 * 1. Shows how Trust Debt is calculated from actual data
 * 2. Connects cold spots to historical commit patterns
 * 3. Reinforces legitimacy through mathematical proof
 * 4. Maintains full detailed proof in the main report
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ExecutiveSummaryGenerator {
  constructor() {
    this.projectRoot = process.cwd();
    this.analysisFile = path.join(this.projectRoot, 'trust-debt-analysis.json');
    this.matrixFile = path.join(this.projectRoot, 'trust-debt-reality-intent-matrix.json');
    this.coldSpotsFile = path.join(this.projectRoot, 'trust-debt-cold-spots.json');
    this.assessmentFile = path.join(this.projectRoot, 'trust-debt-two-layer-assessment.json');
  }

  /**
   * Generate comprehensive executive summary
   */
  generateSummary() {
    console.log('📊 Generating Executive Summary...\n');

    // Load all data sources
    const analysis = this.loadJSON(this.analysisFile);
    const matrix = this.loadJSON(this.matrixFile);
    const coldSpots = this.loadJSON(this.coldSpotsFile);
    const assessment = this.loadJSON(this.assessmentFile);

    // Extract key metrics
    const trustDebtScore = this.calculateTrustDebt(analysis, matrix);
    const historicalTrend = this.analyzeHistoricalTrend(analysis);
    const coldSpotInsights = this.extractColdSpotInsights(coldSpots);
    const twoLayerBreakdown = this.extractTwoLayerMetrics(assessment);

    // Generate summary sections
    const summary = {
      timestamp: new Date().toISOString(),
      headline: this.generateHeadline(trustDebtScore),
      trustDebtCalculation: trustDebtScore,
      historicalContext: historicalTrend,
      coldSpotAnalysis: coldSpotInsights,
      twoLayerAssessment: twoLayerBreakdown,
      credibilityProof: this.generateCredibilityProof(analysis, matrix),
      executiveNarrative: this.generateExecutiveNarrative(trustDebtScore, historicalTrend, coldSpotInsights, analysis),
      recommendations: this.generateRecommendations(trustDebtScore, coldSpotInsights)
    };

    // Save and generate HTML
    this.saveSummary(summary);
    this.generateExecutiveHTML(summary);

    return summary;
  }

  /**
   * Calculate Trust Debt using unified calculator
   */
  calculateTrustDebt(analysis, matrix) {
    // Use the unified calculator for consistency
    const UnifiedCalculator = require('./trust-debt-unified-calculator');
    const calculator = new UnifiedCalculator();
    
    // Load assessment data if available
    const assessmentFile = path.join(this.projectRoot, 'trust-debt-two-layer-assessment.json');
    let assessment = null;
    if (fs.existsSync(assessmentFile)) {
      assessment = JSON.parse(fs.readFileSync(assessmentFile, 'utf8'));
    }
    
    // Calculate using unified method
    const unifiedResult = calculator.calculate({
      categories: analysis.categories || [],
      matrix,
      assessment,
      commits: analysis.commits || [],
      documents: analysis.documents || {},
      analysis: analysis  // Pass the full analysis for weights
    });
    
    // Format for executive summary
    const formula = "TrustDebt = Σ((Intent - Reality)² × Time × SpecAge × CategoryWeight)";
    
    // Extract components from unified result
    const components = unifiedResult.details?.components || [];
    
    return {
      score: unifiedResult.score,
      actualScore: unifiedResult.actualScore,
      status: unifiedResult.status,
      crisis: unifiedResult.crisis || false,
      formula,
      components: components.slice(0, 5),
      trend: unifiedResult.trend || 'unknown',
      isInsurable: unifiedResult.isInsurable !== undefined ? unifiedResult.isInsurable : unifiedResult.score < 250,
      interpretation: this.interpretScore(unifiedResult.score),
      message: unifiedResult.message,
      details: unifiedResult.details
    };
  }

  /**
   * Analyze historical trend from commits
   */
  analyzeHistoricalTrend(analysis) {
    const commits = analysis.commits || [];
    
    // Extract Trust scores from commit analysis
    const timeline = commits.map(commit => ({
      hash: commit.hash,
      date: commit.subject,
      trustScore: commit.analysis?.trust || 50,
      overallScore: commit.analysis?.overall || 50,
      insight: commit.analysis?.insight || 'No insight'
    }));

    // Calculate trend
    const recentScores = timeline.slice(0, 5).map(t => t.trustScore);
    const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    
    const olderScores = timeline.slice(5, 10).map(t => t.trustScore);
    const avgOlder = olderScores.length > 0 
      ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length 
      : avgRecent;

    const trendDirection = avgRecent > avgOlder ? 'improving' : 
                          avgRecent < avgOlder ? 'degrading' : 'stable';
    const trendMagnitude = Math.abs(avgRecent - avgOlder);

    // Identify inflection points
    const inflectionPoints = [];
    for (let i = 1; i < timeline.length - 1; i++) {
      const prev = timeline[i - 1].trustScore;
      const curr = timeline[i].trustScore;
      const next = timeline[i + 1].trustScore;
      
      if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
        inflectionPoints.push({
          commit: timeline[i].hash,
          score: curr,
          type: curr > prev ? 'peak' : 'trough',
          insight: timeline[i].insight
        });
      }
    }

    return {
      direction: trendDirection,
      magnitude: trendMagnitude,
      currentAverage: avgRecent,
      historicalAverage: avgOlder,
      timeline: timeline.slice(0, 10),
      inflectionPoints: inflectionPoints.slice(0, 3),
      interpretation: `Trust trending ${trendDirection} by ${trendMagnitude.toFixed(0)} points`
    };
  }

  /**
   * Extract cold spot insights
   */
  extractColdSpotInsights(coldSpots) {
    if (!coldSpots || !coldSpots.coldSpots) {
      return { critical: [], patterns: [], interpretation: 'No cold spot data available' };
    }

    const spots = coldSpots.coldSpots || [];
    const patterns = coldSpots.patterns || {};

    // Get coldest spots
    const critical = spots
      .filter(s => s.correlation < 0.1)
      .slice(0, 5)
      .map(s => ({
        area: `${s.reality.name} ↔ ${s.intent.name}`,
        correlation: (s.correlation * 100).toFixed(1) + '%',
        temperature: s.temperature,
        meaning: s.interpretation
      }));

    // Extract pattern insights
    const patternInsights = {
      diagonal: patterns.diagonal?.length || 0,
      vertical: patterns.vertical?.length || 0,
      horizontal: patterns.horizontal?.length || 0,
      clusters: patterns.clusters?.length || 0,
      crossCutting: patterns.crossCutting?.length || 0
    };

    return {
      critical,
      patterns: patternInsights,
      totalColdSpots: spots.length,
      averageCorrelation: (spots.reduce((sum, s) => sum + s.correlation, 0) / spots.length * 100).toFixed(1) + '%',
      interpretation: this.interpretColdSpots(critical, patternInsights)
    };
  }

  /**
   * Extract two-layer assessment metrics
   */
  extractTwoLayerMetrics(assessment) {
    if (!assessment) {
      return { processHealth: 0, outcomeReality: 0, overall: 0 };
    }

    return {
      processHealth: {
        score: assessment.processHealth?.overall || 0,
        formula: assessment.processHealth?.formula || 'Unknown',
        bottleneck: assessment.processHealth?.bottleneck || 'Unknown',
        components: {
          measurement: assessment.processHealth?.measurement || 0,
          visualization: assessment.processHealth?.visualization || 0,
          enforcement: assessment.processHealth?.enforcement || 0
        }
      },
      outcomeReality: {
        score: assessment.outcomeReality?.overall || 0,
        formula: assessment.outcomeReality?.formula || 'Unknown',
        components: {
          user: assessment.outcomeReality?.user || 0,
          strategic: assessment.outcomeReality?.strategic || 0,
          ethical: assessment.outcomeReality?.ethical || 0
        }
      },
      overall: {
        score: assessment.overall?.overall || 0,
        formula: assessment.overall?.formula || 'Unknown',
        interpretation: assessment.overall?.interpretation || 'Unknown'
      }
    };
  }

  /**
   * Generate credibility proof
   */
  generateCredibilityProof(analysis, matrix) {
    const proofs = [];

    // Proof 1: Actual commit analysis
    if (analysis.commits && analysis.commits.length > 0) {
      proofs.push({
        type: 'Commit Analysis',
        evidence: `${analysis.commits.length} commits analyzed`,
        detail: `Latest: "${analysis.commits[0]?.subject || 'Unknown'}"`,
        credibility: 'Git history is immutable and verifiable'
      });
    }

    // Proof 2: Matrix generation
    if (matrix && matrix.nodes) {
      proofs.push({
        type: 'Reality vs Intent Matrix',
        evidence: `${matrix.nodes.length} categories tracked`,
        detail: `${matrix.commits?.length || 0} commits vs ${matrix.documents?.length || 0} documents`,
        credibility: 'Claude AI analysis of actual code and documentation'
      });
    }

    // Proof 3: Mathematical formula
    proofs.push({
      type: 'Mathematical Formula',
      evidence: 'Trust Debt = Σ((Intent - Reality)² × Time × SpecAge × Weight)',
      detail: 'Quadratic penalty for drift, linear time decay',
      credibility: 'Reproducible calculation with open source code'
    });

    // Proof 4: Two-layer validation
    proofs.push({
      type: 'Two-Layer Validation',
      evidence: 'Process Health × Outcome Reality = Overall Success',
      detail: 'Multiplicative formula ensures both layers matter',
      credibility: 'Cannot game metrics - zero in either layer = failure'
    });

    return proofs;
  }

  /**
   * Generate enhanced executive narrative with temporal context
   */
  generateExecutiveNarrative(trustDebt, trend, coldSpots, analysis) {
    const score = trustDebt.score;
    const trendDir = trend.direction;
    const criticalCount = coldSpots.critical.length;

    let narrative = '';

    // Opening assessment with comprehensive context
    if (score < 50) {
      narrative += `Trust Debt is operationally managed at ${score} units, demonstrating effective alignment between strategic documentation and implementation reality. This low-drift state indicates our forcing function is successfully maintaining coherence across the patent testing MVP. `;
    } else if (score < 100) {
      narrative += `Trust Debt at ${score} units signals growing drift between documented goals and implementation patterns, requiring strategic realignment to prevent compound misalignment. `;
    } else {
      narrative += `Trust Debt has reached crisis levels at ${score} units, triggering mandatory interventions to restore system coherence and prevent further divergence from documented intent. `;
    }

    // Add development velocity and temporal context
    const recentCommits = analysis?.commits?.length || 0;
    if (recentCommits > 50) {
      narrative += `High development velocity (${recentCommits} commits analyzed) demonstrates active progress, though alignment quality requires attention to maintain long-term coherence. `;
    } else if (recentCommits > 20) {
      narrative += `Moderate development pace (${recentCommits} commits) provides opportunity for thoughtful alignment with strategic objectives while maintaining development momentum. `;
    } else if (recentCommits > 0) {
      narrative += `Focused development pattern (${recentCommits} commits) suggests either concentrated effort on specific objectives or potential development bottlenecks requiring investigation. `;
    }

    // Enhanced trend analysis with business implications
    if (trendDir === 'improving') {
      narrative += `The ${trend.magnitude.toFixed(0)}-point improvement trend validates our drift correction mechanisms, indicating movement toward sustainable alignment between patent claims and implementation evidence. `;
    } else if (trendDir === 'degrading') {
      narrative += `The ${trend.magnitude.toFixed(0)}-point degradation signals systematic drift accumulation, requiring immediate course correction to prevent compound misalignment that could undermine patent defensibility. `;
    } else {
      narrative += `Stable trend suggests equilibrium between development velocity and alignment maintenance, though continuous monitoring remains essential for early drift detection. `;
    }

    // Cold spot analysis with strategic implications
    if (criticalCount > 0) {
      narrative += `${criticalCount} critical cold spots reveal fundamental disconnects where strategic intent fails to translate into measurable implementation progress. `;
      const coldest = coldSpots.critical[0];
      if (coldest) {
        narrative += `The most severe disconnect (${coldest.area} at ${coldest.correlation}) indicates ${coldest.meaning}, representing a potential vulnerability in our forcing function effectiveness and patent claim substantiation. `;
      }
    }

    // Success pattern identification
    if (trend.inflectionPoints?.length > 0) {
      const peak = trend.inflectionPoints.find(p => p.type === 'peak');
      if (peak) {
        narrative += `Historical peak alignment of ${peak.score} demonstrates this system's capability for excellence when Intent and Reality converge through disciplined execution and clear measurement. `;
      }
    }

    // Add temporal and observability perspective
    narrative += `This measurement represents point-in-time alignment assessment using cosine similarity analysis across granular MVP categories, with continuous drift monitoring ensuring early detection of strategic divergence before it compounds into crisis. `;

    // Enhanced conclusion with forcing function context
    if (score < 50) {
      narrative += `The forcing function operates through observability and credibility rather than arbitrary blocking, maintaining productive tension between ambitious documentation and pragmatic implementation while preserving system coherence and patent defensibility.`;
    } else if (score < 100) {
      narrative += `The forcing function is detecting increasing strain between documented aspirations and development reality, signaling need for either goal calibration or execution refinement to maintain patent claim integrity.`;
    } else {
      narrative += `The forcing function has triggered crisis protocols as documented intent and implementation reality have diverged beyond sustainable thresholds, requiring fundamental realignment to restore credibility and legal defensibility.`;
    }

    return narrative;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(trustDebt, coldSpots) {
    const recommendations = [];
    const score = trustDebt.score;

    // Priority 1: Address highest debt contributors
    if (trustDebt.components && trustDebt.components.length > 0) {
      const worst = trustDebt.components[0];
      recommendations.push({
        priority: 'CRITICAL',
        action: `Fix ${worst.category}`,
        impact: `Reduce Trust Debt by ${worst.contribution} units`,
        specific: `Close ${worst.gap} gap between ${worst.intent} intent and ${worst.reality} reality`
      });
    }

    // Priority 2: Warm coldest spots
    if (coldSpots.critical && coldSpots.critical.length > 0) {
      const coldest = coldSpots.critical[0];
      recommendations.push({
        priority: 'HIGH',
        action: `Address ${coldest.area} disconnect`,
        impact: `Improve correlation from ${coldest.correlation} to >20%`,
        specific: coldest.meaning
      });
    }

    // Priority 3: Systematic improvements
    if (coldSpots.patterns) {
      if (coldSpots.patterns.diagonal > 5) {
        recommendations.push({
          priority: 'MEDIUM',
          action: 'Fix self-alignment failures',
          impact: `${coldSpots.patterns.diagonal} categories failing their own purpose`,
          specific: 'Categories should achieve their documented goals'
        });
      }
    }

    return recommendations;
  }

  /**
   * Helper functions
   */
  loadJSON(filepath) {
    try {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
      console.warn(`Could not load ${path.basename(filepath)}: ${e.message}`);
      return null;
    }
  }

  interpretScore(score) {
    if (score < 10) return 'Excellent alignment';
    if (score < 25) return 'Good alignment';
    if (score < 50) return 'Acceptable alignment';
    if (score < 100) return 'Warning - drift detected';
    if (score < 500) return 'Critical - immediate action required';
    return 'Crisis - system failing';
  }

  interpretColdSpots(critical, patterns) {
    const total = Object.values(patterns).reduce((sum, val) => sum + val, 0);
    if (critical.length === 0) return 'No critical cold spots detected';
    if (critical.length < 3) return `${critical.length} critical disconnects need attention`;
    if (total > 20) return `Systematic failure across ${total} pattern types`;
    return `${critical.length} critical cold spots revealing systemic misalignment`;
  }

  generateHeadline(trustDebt) {
    const score = trustDebt.score;
    if (score < 50) {
      return {
        status: 'OPERATIONAL',
        message: 'Trust Debt Under Control',
        color: 'green'
      };
    } else if (score < 100) {
      return {
        status: 'WARNING',
        message: 'Drift Accumulating',
        color: 'yellow'
      };
    } else {
      return {
        status: 'CRISIS',
        message: 'Immediate Intervention Required',
        color: 'red'
      };
    }
  }

  /**
   * Save summary to JSON
   */
  saveSummary(summary) {
    fs.writeFileSync('trust-debt-executive-summary.json', JSON.stringify(summary, null, 2));
    console.log('✅ Executive summary saved to trust-debt-executive-summary.json');
  }

  /**
   * Generate executive HTML
   */
  generateExecutiveHTML(summary) {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Trust Debt Executive Summary</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0a;
            color: #e2e8f0;
            line-height: 1.6;
        }
        .executive-header {
            background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%);
            padding: 40px;
            text-align: center;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 20px;
            background: ${summary.headline.color === 'green' ? '#10b981' : 
                        summary.headline.color === 'yellow' ? '#f59e0b' : '#ef4444'};
            color: white;
            border-radius: 20px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px;
        }
        .executive-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
        }
        .main-content {
            background: #1a1a2e;
            border-radius: 12px;
            padding: 30px;
            border: 1px solid #333;
        }
        .sidebar {
            space-y: 20px;
        }
        .metric-card {
            background: #1a1a2e;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #333;
            margin-bottom: 20px;
        }
        .trust-score {
            font-size: 4rem;
            font-weight: 900;
            color: ${summary.trustDebtCalculation.score < 50 ? '#10b981' : 
                     summary.trustDebtCalculation.score < 100 ? '#f59e0b' : '#ef4444'};
            text-align: center;
            margin: 20px 0;
        }
        .formula-box {
            background: #0f0f23;
            border: 1px solid #4a5568;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            font-family: 'Monaco', monospace;
            overflow-x: auto;
        }
        .component-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .component-table th {
            background: #2d3748;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #4a5568;
        }
        .component-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #2d3748;
        }
        .cold-spot-item {
            background: #0f0f23;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .trend-chart {
            display: flex;
            align-items: flex-end;
            height: 100px;
            gap: 5px;
            margin: 20px 0;
        }
        .trend-bar {
            flex: 1;
            background: linear-gradient(to top, #3b82f6, #60a5fa);
            border-radius: 4px 4px 0 0;
            position: relative;
        }
        .proof-item {
            display: flex;
            align-items: start;
            gap: 15px;
            padding: 15px;
            background: #0f0f23;
            border-radius: 8px;
            margin: 10px 0;
        }
        .proof-icon {
            font-size: 1.5rem;
        }
        .recommendation {
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
            border: 1px solid #22c55e;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
        }
        .two-layer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .layer-box {
            background: #0f0f23;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #4a5568;
        }
        .narrative-section {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), transparent);
            padding: 25px;
            border-radius: 12px;
            margin: 30px 0;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }
    </style>
</head>
<body>
    <div class="executive-header">
        <div class="status-badge">${summary.headline.status}</div>
        <h1 style="font-size: 3rem; margin-bottom: 10px;">${summary.headline.message}</h1>
        <p style="font-size: 1.2rem; opacity: 0.9;">Trust Debt Executive Summary</p>
    </div>

    <div class="container">
        <div class="executive-grid">
            <!-- Main Content -->
            <div class="main-content">
                <h2 style="color: #60a5fa; margin-bottom: 20px;">📊 Trust Debt Calculation</h2>
                
                <div class="trust-score">${summary.trustDebtCalculation.score}</div>
                <p style="text-align: center; color: #94a3b8; margin-bottom: 30px;">
                    ${summary.trustDebtCalculation.interpretation}
                </p>

                <div class="formula-box">
                    <div style="color: #60a5fa; margin-bottom: 10px;">FORMULA:</div>
                    <div style="color: #e2e8f0; font-size: 1.1rem;">
                        ${summary.trustDebtCalculation.formula}
                    </div>
                </div>

                <h3 style="margin: 30px 0 20px; color: #60a5fa;">Top Contributors to Trust Debt</h3>
                <table class="component-table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Intent</th>
                            <th>Reality</th>
                            <th>Gap</th>
                            <th>Debt Units</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summary.trustDebtCalculation.components.map(c => `
                            <tr>
                                <td style="color: #60a5fa;">${c.category}</td>
                                <td>${c.intent}</td>
                                <td>${c.reality}</td>
                                <td style="color: #f59e0b;">${c.gap}</td>
                                <td style="font-weight: bold;">${c.contribution}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="narrative-section">
                    <h3 style="color: #a78bfa; margin-bottom: 15px;">📝 Executive Analysis</h3>
                    <p style="line-height: 1.8;">
                        ${summary.executiveNarrative}
                    </p>
                </div>

                <h3 style="margin: 30px 0 20px; color: #60a5fa;">🧊 Cold Spot Analysis</h3>
                <p style="color: #94a3b8; margin-bottom: 20px;">
                    ${summary.coldSpotAnalysis.totalColdSpots} cold spots detected 
                    (average correlation: ${summary.coldSpotAnalysis.averageCorrelation})
                </p>
                
                ${summary.coldSpotAnalysis.critical.map(spot => `
                    <div class="cold-spot-item">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <strong style="color: #3b82f6;">${spot.area}</strong>
                            <span style="color: #ef4444;">${spot.temperature} ${spot.correlation}</span>
                        </div>
                        <div style="color: #94a3b8; font-size: 0.9rem;">
                            ${spot.meaning}
                        </div>
                    </div>
                `).join('')}

                <h3 style="margin: 30px 0 20px; color: #10b981;">💡 Recommendations</h3>
                ${summary.recommendations.map(rec => `
                    <div class="recommendation">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #ef4444; font-weight: bold;">${rec.priority}</span>
                            <span style="color: #60a5fa;">${rec.impact}</span>
                        </div>
                        <div style="font-size: 1.1rem; margin-bottom: 8px;">${rec.action}</div>
                        <div style="color: #94a3b8; font-size: 0.9rem;">${rec.specific}</div>
                    </div>
                `).join('')}
            </div>

            <!-- Sidebar -->
            <div class="sidebar">
                <!-- Historical Trend -->
                <div class="metric-card">
                    <h3 style="color: #60a5fa; margin-bottom: 15px;">📈 Historical Trend</h3>
                    <div style="font-size: 1.5rem; font-weight: bold; color: ${
                        summary.historicalContext.direction === 'improving' ? '#10b981' :
                        summary.historicalContext.direction === 'degrading' ? '#ef4444' : '#f59e0b'
                    };">
                        ${summary.historicalContext.direction.toUpperCase()}
                    </div>
                    <div style="color: #94a3b8; margin: 10px 0;">
                        ${summary.historicalContext.interpretation}
                    </div>
                    <div class="trend-chart">
                        ${summary.historicalContext.timeline.slice(0, 8).reverse().map(t => `
                            <div class="trend-bar" style="height: ${t.trustScore}%;" 
                                 title="${t.hash}: ${t.trustScore}"></div>
                        `).join('')}
                    </div>
                </div>

                <!-- Two-Layer Assessment -->
                <div class="metric-card">
                    <h3 style="color: #60a5fa; margin-bottom: 15px;">🎯 Two-Layer Assessment</h3>
                    <div class="two-layer-grid">
                        <div class="layer-box">
                            <div style="color: #94a3b8; font-size: 0.9rem;">Process Health</div>
                            <div style="font-size: 2rem; font-weight: bold; color: #60a5fa;">
                                ${summary.twoLayerAssessment.processHealth.score.toFixed(1)}%
                            </div>
                            <div style="color: #ef4444; font-size: 0.8rem; margin-top: 5px;">
                                Bottleneck: ${summary.twoLayerAssessment.processHealth.bottleneck}
                            </div>
                        </div>
                        <div class="layer-box">
                            <div style="color: #94a3b8; font-size: 0.9rem;">Outcome Reality</div>
                            <div style="font-size: 2rem; font-weight: bold; color: #60a5fa;">
                                ${summary.twoLayerAssessment.outcomeReality.score.toFixed(1)}%
                            </div>
                            <div style="color: #10b981; font-size: 0.8rem; margin-top: 5px;">
                                User: ${summary.twoLayerAssessment.outcomeReality.components.user.toFixed(0)}%
                            </div>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
                        <div style="color: #94a3b8; font-size: 0.9rem;">Overall Success</div>
                        <div style="font-size: 2.5rem; font-weight: bold; color: ${
                            summary.twoLayerAssessment.overall.score > 10 ? '#10b981' :
                            summary.twoLayerAssessment.overall.score > 1 ? '#f59e0b' : '#ef4444'
                        };">
                            ${summary.twoLayerAssessment.overall.score.toFixed(2)}%
                        </div>
                    </div>
                </div>

                <!-- Credibility Proof -->
                <div class="metric-card">
                    <h3 style="color: #60a5fa; margin-bottom: 15px;">✅ Credibility & Legitimacy</h3>
                    ${summary.credibilityProof.map(proof => `
                        <div class="proof-item">
                            <div class="proof-icon">🔍</div>
                            <div>
                                <div style="color: #60a5fa; font-weight: bold;">${proof.type}</div>
                                <div style="color: #e2e8f0; margin: 5px 0;">${proof.evidence}</div>
                                <div style="color: #94a3b8; font-size: 0.85rem;">${proof.credibility}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Link to full report -->
        <div style="text-align: center; margin-top: 60px; padding-top: 40px; border-top: 1px solid #333;">
            <a href="trust-debt-report.html" style="
                display: inline-block;
                padding: 15px 40px;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 1.1rem;
            ">
                View Full Detailed Report →
            </a>
            <p style="color: #64748b; margin-top: 15px;">
                Complete calculations, formulas, and proof available in the detailed report
            </p>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync('trust-debt-executive-summary.html', html);
    console.log('📊 Executive summary HTML saved to trust-debt-executive-summary.html');
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new ExecutiveSummaryGenerator();
  const summary = generator.generateSummary();
  
  console.log('\n✅ Executive Summary Generated\n');
  console.log('Trust Debt Score:', summary.trustDebtCalculation.score);
  console.log('Status:', summary.headline.status);
  console.log('Trend:', summary.historicalContext.direction);
  console.log('Cold Spots:', summary.coldSpotAnalysis.totalColdSpots);
  console.log('\nView trust-debt-executive-summary.html for the executive summary');
  console.log('View trust-debt-report.html for the full detailed report');
}

module.exports = { ExecutiveSummaryGenerator };