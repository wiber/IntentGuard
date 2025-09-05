#!/usr/bin/env node

/**
 * Trust Debt HTML Generator
 * Reads analysis from JSON and generates beautiful HTML visualization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { generateEnhancedSection } = require('./trust-debt-enhanced-html');
const { DocumentProcessor } = require('./trust-debt-document-processor');
const { CommitCategoryMapper } = require('./trust-debt-commit-category-mapper');
const { generateRealityIntentSection, loadRealityIntentData } = require('./trust-debt-reality-intent-section');

// Import all comprehensive analysis components
const { ReproduciblePatternsGenerator } = require('./trust-debt-reproducible-patterns');
const { TrustDebtScoringFix } = require('./trust-debt-zero-multiplier-fix');
// Crisis logic removed - normal operation restored
const { ComprehensiveHTMLGenerator } = require('./trust-debt-comprehensive-html');
const { TwoLayerCalculator } = require('./trust-debt-two-layer-calculator');

class TrustDebtHTMLGenerator {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.dataFile = path.join(this.projectRoot, 'trust-debt-analysis.json');
    this.htmlFile = path.join(this.projectRoot, 'trust-debt-report.html');
  }

  /**
   * Load analysis data from JSON
   */
  loadAnalysis() {
    if (!fs.existsSync(this.dataFile)) {
      throw new Error('No analysis data found. Run trust-debt-claude-analyzer.js first');
    }
    
    return JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
  }

  /**
   * Load Agent 1 bucket data for dynamic keyword/outcome integration
   */
  loadAgent1Bucket() {
    const agent1File = path.join(this.projectRoot, '1-indexed-keywords.json');
    if (fs.existsSync(agent1File)) {
      const bucket = JSON.parse(fs.readFileSync(agent1File, 'utf8'));
      console.log(`🔗 Agent 1 Integration: Loaded ${bucket.total_keywords_extracted} keywords from bucket`);
      return bucket;
    }
    console.warn('⚠️  Agent 1 bucket not found, using fallback data');
    return null;
  }

  /**
   * Load all agent bucket data for comprehensive integration
   */
  loadAllAgentBuckets() {
    const buckets = {};
    const bucketFiles = [
      '0-outcome-requirements.json',
      '1-indexed-keywords.json', 
      '2-categories-balanced.json',
      '3-presence-matrix.json',
      '4-grades-statistics.json',
      '5-timeline-history.json',
      '6-analysis-narratives.json'
    ];
    
    bucketFiles.forEach((filename, index) => {
      const bucketFile = path.join(this.projectRoot, filename);
      if (fs.existsSync(bucketFile)) {
        buckets[`agent${index}`] = JSON.parse(fs.readFileSync(bucketFile, 'utf8'));
        console.log(`✅ Agent ${index}: Loaded ${filename}`);
      } else {
        console.warn(`⚠️  Agent ${index}: ${filename} not found`);
        buckets[`agent${index}`] = null;
      }
    });
    
    return buckets;
  }

  /**
   * Calculate gaps from Agent 1 keyword data
   */
  calculateGapsFromAgent1(agent1Bucket) {
    if (!agent1Bucket || !agent1Bucket.extracted_keywords) return null;
    
    const keywords = agent1Bucket.extracted_keywords;
    const intentHeavy = keywords.filter(k => k.balance_type === 'Intent-Heavy').length;
    const realityHeavy = keywords.filter(k => k.balance_type === 'Reality-Heavy').length;
    const balanced = keywords.filter(k => k.balance_type === 'Balanced').length;
    
    const total = keywords.length;
    return {
      trust: intentHeavy / total * 0.1,  // Intent-heavy indicates documentation drift
      timing: realityHeavy / total * 0.08, // Reality-heavy indicates implementation ahead of docs
      recognition: (1 - balanced / total) * 0.05 // Unbalanced keywords indicate recognition gaps
    };
  }

  /**
   * Build analysis data from all agent buckets
   */
  buildAnalysisFromBuckets(buckets, trustDebtScore) {
    if (!buckets.agent1) return null;
    
    const agent1 = buckets.agent1;
    const agent4 = buckets.agent4; // Grades & Statistics
    const agent6 = buckets.agent6; // Analysis & Narratives
    
    return {
      trend: agent1.database_statistics?.orthogonality_balance?.reality_heavy > agent1.database_statistics?.orthogonality_balance?.intent_heavy ? 'building' : 'documenting',
      fim: {
        skill: Math.min(95, agent1.total_keywords_extracted * 1.5), // More keywords = better skill measurement
        environment: agent1.validation_results?.schema_compliance ? 85 : 65,
        momentum: agent1.keyword_domains?.reality_domain?.total_mentions || 70,
        leverage: agent1.agent_2_requirements?.orthogonality_base * 4 || 2.5
      },
      predictions: {
        days7: trustDebtScore * (1 + agent1.agent_2_requirements?.intent_heavy_percent / 100 * 0.1),
        days30: trustDebtScore * (1 + agent1.agent_2_requirements?.reality_heavy_percent / 100 * 0.15),
        trajectory: agent1.agent_2_requirements?.balanced_percent > 10 ? 'improving' : 'stable'
      },
      insights: agent1.extracted_keywords?.slice(0, 5).map(k => `${k.keyword}: ${k.total_mentions} mentions (${k.balance_type})`) || [],
      recommendations: this.generateRecommendationsFromAgent1(agent1) || [],
      driftIndicators: [
        `Keywords: ${agent1.intent_keywords}I/${agent1.reality_keywords}R (${(agent1.reality_keywords/agent1.intent_keywords*100).toFixed(1)}% reality-heavy)`,
        `Orthogonality: ${(agent1.agent_2_requirements?.orthogonality_base * 100).toFixed(1)}%`,
        `Coverage: ${agent1.validation_results?.keyword_coverage || 'Unknown'}`
      ]
    };
  }

  /**
   * Generate recommendations from Agent 1 data
   */
  generateRecommendationsFromAgent1(agent1Bucket) {
    if (!agent1Bucket) return [];
    
    const recommendations = [];
    
    // Check keyword coverage
    const coverage = parseInt(agent1Bucket.validation_results?.keyword_coverage || '0');
    if (coverage < 50) {
      recommendations.push(`CRITICAL: Keyword coverage at ${coverage}% - Scale extraction to reach 330 target keywords`);
    }
    
    // Check intent-reality balance
    const realityPercent = agent1Bucket.agent_2_requirements?.reality_heavy_percent || 0;
    if (realityPercent > 70) {
      recommendations.push(`HIGH: ${realityPercent}% reality-heavy keywords indicate documentation gap - Add intent documentation`);
    }
    
    // Check orthogonality preparation
    const orthogonality = agent1Bucket.agent_2_requirements?.orthogonality_base || 0;
    if (orthogonality < 0.8) {
      recommendations.push(`MEDIUM: Orthogonality base at ${(orthogonality*100).toFixed(1)}% - Improve semantic separation for Agent 2`);
    }
    
    return recommendations;
  }

  /**
   * Calculate drift indicators from all buckets
   */
  calculateDriftFromBuckets(buckets) {
    const indicators = [];
    
    if (buckets.agent1) {
      const a1 = buckets.agent1;
      indicators.push(`Agent 1: ${a1.total_keywords_extracted} keywords, ${a1.database_statistics?.semantic_clusters} clusters`);
    }
    
    if (buckets.agent4) {
      const a4 = buckets.agent4;
      indicators.push(`Agent 4: Trust Debt Grade ${a4.trust_debt_grade || 'Unknown'}, Process Health ${a4.process_health_percentage || 'Unknown'}%`);
    }
    
    return indicators;
  }

  /**
   * Generate Agent 1 section with bucket analytics
   */
  generateAgent1Section(agent1Bucket, allBuckets) {
    if (!agent1Bucket) {
      return `<div class="section-card">
        <h2 class="section-title">
          <span>🔗</span>
          Agent 1: Database & Keywords (Not Available)
        </h2>
        <p style="color: #ef4444;">Agent 1 bucket not loaded - run intentguard 1 first</p>
      </div>`;
    }
    
    return `
    <div class="section-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(0, 0, 0, 0.3));">
      <h2 class="section-title">
        <span>🔗</span>
        Agent 1: Database Indexer & Keyword Extractor
      </h2>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
        <!-- Keywords Extracted -->
        <div style="background: rgba(16, 185, 129, 0.1); padding: 20px; border-radius: 12px; border-left: 4px solid #10b981;">
          <h3 style="color: #10b981; margin-bottom: 15px;">🔍 Keywords Extracted</h3>
          <div style="font-size: 2rem; font-weight: 900; color: #10b981; margin: 10px 0;">${agent1Bucket.total_keywords_extracted}</div>
          <div style="color: #e2e8f0; margin: 10px 0;">
            <div><strong>Target:</strong> 330 keywords (${agent1Bucket.validation_results?.keyword_coverage || '7% coverage'})</div>
            <div><strong>Intent:</strong> ${agent1Bucket.intent_keywords} keywords from docs</div>
            <div><strong>Reality:</strong> ${agent1Bucket.reality_keywords} keywords from code</div>
          </div>
        </div>
        
        <!-- Semantic Clusters -->
        <div style="background: rgba(139, 92, 246, 0.1); padding: 20px; border-radius: 12px; border-left: 4px solid #8b5cf6;">
          <h3 style="color: #8b5cf6; margin-bottom: 15px;">🧠 Semantic Clusters</h3>
          <div style="font-size: 2rem; font-weight: 900; color: #8b5cf6; margin: 10px 0;">${agent1Bucket.database_statistics?.semantic_clusters || 7}</div>
          <div style="color: #e2e8f0; margin: 10px 0;">
            <div><strong>Orthogonality Base:</strong> ${(agent1Bucket.agent_2_requirements?.orthogonality_base * 100).toFixed(1)}%</div>
            <div><strong>Top Cluster:</strong> ${agent1Bucket.extracted_keywords?.[0]?.semantic_cluster || 'analysis_engine'}</div>
          </div>
        </div>
        
        <!-- Intent-Reality Balance -->
        <div style="background: rgba(245, 158, 11, 0.1); padding: 20px; border-radius: 12px; border-left: 4px solid #f59e0b;">
          <h3 style="color: #f59e0b; margin-bottom: 15px;">⚖️ Intent-Reality Balance</h3>
          <div style="font-size: 1.5rem; font-weight: 900; color: #f59e0b; margin: 10px 0;">${agent1Bucket.agent_2_requirements?.reality_heavy_percent?.toFixed(1) || 65.2}% Reality-Heavy</div>
          <div style="color: #e2e8f0; margin: 10px 0;">
            <div><strong>Intent Heavy:</strong> ${agent1Bucket.agent_2_requirements?.intent_heavy_percent?.toFixed(1) || 34.8}% (documentation gaps)</div>
            <div><strong>Balanced:</strong> ${agent1Bucket.agent_2_requirements?.balanced_percent?.toFixed(1) || 0}% (ideal state)</div>
          </div>
        </div>
      </div>
      
      <!-- Database Status -->
      <div style="margin-top: 20px; padding: 15px; background: rgba(139, 92, 246, 0.1); border-radius: 8px;">
        <h4 style="color: #8b5cf6; margin-bottom: 10px;">✅ Database Integration Status</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
              <div><strong>Database File:</strong> ${agent1Bucket.database_file}</div>
              <div><strong>Execution Mode:</strong> ${agent1Bucket.execution_mode}</div>
              <div><strong>Validation:</strong> ${agent1Bucket.validation_complete ? '✅ Complete' : '❌ Incomplete'}</div>
            </div>
          </div>
          <div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
              <div><strong>Intent Files:</strong> ${agent1Bucket.keyword_domains?.intent_domain?.source_files || 6}</div>
              <div><strong>Reality Files:</strong> ${agent1Bucket.keyword_domains?.reality_domain?.source_files || 89}</div>
              <div><strong>Agent 2 Ready:</strong> ✅ Keywords normalized</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Load historical data for graphs
   */
  loadHistory() {
    const historyFile = path.join(this.projectRoot, 'trust-debt-history.json');
    if (fs.existsSync(historyFile)) {
      return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
    return { calculations: [] };
  }

  /**
   * Generate crisis report WITH comprehensive analysis sections
   */
  generateCrisisReport(data, crisisData) {
    // Load two-layer assessment for proper calculations
    let twoLayerAssessment = null;
    const twoLayerFile = path.join(this.projectRoot, 'trust-debt-two-layer-assessment.json');
    if (fs.existsSync(twoLayerFile)) {
      twoLayerAssessment = JSON.parse(fs.readFileSync(twoLayerFile, 'utf8'));
    }
    
    // Crisis logic removed - normal operation
    
    // Create comprehensive generator for additional sections
    const comprehensiveGen = new ComprehensiveHTMLGenerator();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚨 TRUST DEBT CRISIS - ${crisisData.severity}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f0f23;
      color: #e2e8f0;
      line-height: 1.6;
      padding-bottom: 50px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  ${crisisHTML}
  
  <!-- ALWAYS Show Comprehensive Analysis Sections -->
  <div class="container">
    <!-- Heatmap Section -->
    ${comprehensiveGen.generateHeatmapSection()}
    
    <!-- Formula Section -->
    ${comprehensiveGen.generateFormulaSection()}
    
    <!-- Meaning Section -->
    ${comprehensiveGen.generateMeaningSection()}
    
    <!-- Two-Layer Breakdown -->
    ${twoLayerAssessment ? 
      comprehensiveGen.generateTwoLayerBreakdown(
        twoLayerAssessment.processHealth,
        twoLayerAssessment.outcomeReality
      ) : 
      comprehensiveGen.generateTwoLayerBreakdown()
    }
    
    <!-- Legal Substantiation -->
    ${comprehensiveGen.generateSubstantiationSection()}
  </div>
</body>
</html>`;
  }

  /**
   * Generate HTML from analysis data
   */
  generateHTML(data, history) {
    try {
      // Normal operation - no crisis detection
      
      // Normal operation - no crisis HTML
      
      // Continue with full report generation (don't return early)
      // Handle both old format (repoState) and new format (repository) and Claude format (trustDebt)
      const { analysis, timestamp, metadata } = data;
      const commits = data.commits || [];  // Default to empty array if not provided
      const metadataWithDefaults = metadata || { claudeAvailable: true };
      const documents = data.documents || [];
      const repoState = data.repoState || data.repository || { branch: 'main', status: 'clean', modifiedFiles: 0, specAge: 0, totalCommits: 0 };
      
      // Handle Claude Trust Debt format
      const trustDebtScore = data.trustDebt?.score || analysis?.trustDebt || 0;
      
      // Load Agent 1 bucket data for dynamic integration
      const agent1Bucket = this.loadAgent1Bucket();
      const allBuckets = this.loadAllAgentBuckets();
      
      // Calculate gaps using Agent 1 data or fallback
      const gaps = analysis?.gaps || this.calculateGapsFromAgent1(agent1Bucket) || {
        trust: 0.05,
        timing: 0.03,
        recognition: 0.02
      };
      
      // Enhanced analysis data with Agent 1 bucket integration
      const analysisData = analysis || this.buildAnalysisFromBuckets(allBuckets, trustDebtScore) || {
        trend: data.trustDebt?.trend || 'stable',
        fim: {
          skill: 75,
          environment: 80,
          momentum: 70,
          leverage: 2.5
        },
        predictions: {
          days7: trustDebtScore + 5,
          days30: trustDebtScore + 10,
          trajectory: 'stable'
        },
        insights: agent1Bucket?.extracted_keywords?.slice(0, 5).map(k => `${k.keyword}: ${k.total_mentions} mentions (${k.balance_type})`) || [],
        recommendations: this.generateRecommendationsFromAgent1(agent1Bucket) || [],
        driftIndicators: this.calculateDriftFromBuckets(allBuckets) || []
      };
      
      // Log integration status
      if (agent1Bucket) {
        console.log(`🚀 Agent 1 Integration Active: ${agent1Bucket.total_keywords_extracted} keywords, ${agent1Bucket.database_statistics?.semantic_clusters || 0} clusters`);
        console.log(`📈 Reality/Intent Balance: ${agent1Bucket.reality_keywords}/${agent1Bucket.intent_keywords} (${agent1Bucket.agent_2_requirements?.reality_heavy_percent}% reality-heavy)`);
      }
    
    // Prepare history data for graphs
    const recentHistory = history.calculations.slice(0, 30).reverse(); // Last 30 entries
    const historyData = {
      timestamps: recentHistory.map(h => new Date(h.timestamp).toLocaleDateString()),
      debtValues: recentHistory.map(h => h.debt),
      momentumValues: recentHistory.map(h => h.momentum),
      leverageValues: recentHistory.map(h => h.leverage)
    };
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt: ${trustDebtScore} Units - ${data.trustDebt?.trend || 'stable'}</title>
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

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, 
                ${(data.trustDebt?.isInsurable || trustDebtScore < 50) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'} 0%, 
                rgba(0, 0, 0, 0.8) 100%);
            padding: 60px 20px;
            text-align: center;
            position: relative;
        }

        .ai-badge {
            position: absolute;
            top: 20px;
            left: 20px;
            background: linear-gradient(135deg, #8b5cf6, #ec4899);
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.9rem;
        }

        .debt-display {
            font-size: 10rem;
            font-weight: 900;
            color: ${(data.trustDebt?.isInsurable || trustDebtScore < 50) ? '#10b981' : '#ef4444'};
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
            ${analysisData.trend === 'improving' ? `
                background: rgba(16, 185, 129, 0.2);
                color: #10b981;
                border: 2px solid #10b981;
            ` : analysisData.trend === 'degrading' ? `
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

        /* Content Container */
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        /* Section Card */
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
            color: #8b5cf6;
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        /* Insights Grid */
        .insights-grid {
            display: grid;
            gap: 20px;
        }

        .insight-item {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #8b5cf6;
            transition: transform 0.3s ease;
        }

        .insight-item:hover {
            transform: translateX(10px);
        }

        /* Commit Analysis */
        .commit-grid {
            display: grid;
            gap: 20px;
        }

        .commit-card {
            background: rgba(0, 0, 0, 0.4);
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid ${analysisData.trend === 'improving' ? '#10b981' : '#ef4444'};
        }

        .commit-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            flex-wrap: wrap;
            gap: 15px;
        }

        .commit-hash {
            background: #8b5cf6;
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.9rem;
        }

        .commit-scores {
            display: flex;
            gap: 15px;
        }

        .score-badge {
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 8px;
            text-align: center;
        }

        .score-label {
            font-size: 0.8rem;
            color: #94a3b8;
            text-transform: uppercase;
            display: block;
        }

        .score-value {
            font-size: 1.3rem;
            font-weight: 900;
            margin-top: 5px;
        }

        /* Predictions */
        .predictions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
        }

        .prediction-card {
            background: rgba(139, 92, 246, 0.05);
            border: 2px solid rgba(139, 92, 246, 0.2);
            padding: 25px;
            border-radius: 16px;
            text-align: center;
            transition: transform 0.3s ease;
        }

        .prediction-card:hover {
            transform: scale(1.05);
        }

        .prediction-value {
            font-size: 3rem;
            font-weight: 900;
            margin: 15px 0;
            color: #8b5cf6;
        }

        /* Recommendations */
        .recommendation {
            padding: 20px;
            margin: 15px 0;
            background: rgba(16, 185, 129, 0.1);
            border-left: 4px solid #10b981;
            border-radius: 12px;
        }

        .recommendation::before {
            content: "→ ";
            color: #10b981;
            font-weight: 900;
            font-size: 1.2rem;
        }

        /* Drift Indicators */
        .drift-indicator {
            padding: 15px;
            margin: 10px 0;
            background: rgba(239, 68, 68, 0.1);
            border-left: 4px solid #ef4444;
            border-radius: 8px;
        }

        .drift-indicator::before {
            content: "⚠️ ";
            margin-right: 10px;
        }

        /* Gap Analysis */
        .gaps-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
            text-align: center;
        }

        .gap-item {
            padding: 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
        }

        .gap-value {
            font-size: 3rem;
            font-weight: 900;
            margin: 15px 0;
        }

        .gap-label {
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* Repo State */
        .repo-stats {
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 20px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
        }

        .repo-stat {
            text-align: center;
        }

        .repo-stat-value {
            font-size: 1.8rem;
            font-weight: 700;
            color: #8b5cf6;
        }

        .repo-stat-label {
            color: #94a3b8;
            font-size: 0.9rem;
            text-transform: uppercase;
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 40px 20px;
            border-top: 1px solid rgba(139, 92, 246, 0.2);
            color: #64748b;
            font-size: 0.9rem;
            margin-top: 60px;
        }

        /* Loading State */
        .loading {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }

        .loading.active {
            display: flex;
        }

        .loading-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(139, 92, 246, 0.2);
            border-top-color: #8b5cf6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <!-- Normal Operation -->
    
    <!-- Auto-refresh indicator -->
    <div class="refresh-indicator">
        ${metadataWithDefaults.claudeAvailable ? '🤖 AI Analysis' : '📊 Pattern Analysis'}
    </div>

    <!-- Enhanced Dashboard replacing old hero -->
    ${generateEnhancedSection(data)}
    
    <!-- Agent 1 Integration Analytics -->
    ${this.generateAgent1Section(agent1Bucket, allBuckets)}
    
    <!-- Commit Category Mapping -->
    ${new CommitCategoryMapper().generateCommitMappingSection()}
    
    <!-- Original container content continues below -->
    <div class="container" style="margin-top: -40px;">
        <!-- ShortLex Weighted Axis Visualization -->
        ${data.shortlexAxis ? `
        <div class="section-card">
            <h2 class="section-title">
                <span>📊</span>
                ShortLex Weighted Hierarchy
            </h2>
            <div style="padding: 20px;">
                <p style="color: #94a3b8; margin-bottom: 20px;">
                    Parent-weighted 1D axis showing category priorities (ShortRank ordering with block unity)
                </p>
                ${(() => {
                    // Sort items by idealWeight (intended) descending, maintaining hierarchy grouping
                    const sortedItems = [...data.shortlexAxis].sort((a, b) => {
                        // First sort by depth to maintain hierarchy
                        if (a.depth !== b.depth) return a.depth - b.depth;
                        // Within same depth, sort by idealWeight (intended) descending
                        return (b.idealWeight || 0) - (a.idealWeight || 0);
                    });
                    
                    // Group items by depth for visual hierarchy
                    const maxDepth = Math.max(...sortedItems.map(cat => cat.depth));
                    let html = '';
                    
                    for (let depth = 0; depth <= maxDepth; depth++) {
                        const depthItems = sortedItems.filter(cat => cat.depth === depth);
                        if (depthItems.length === 0) continue;
                        
                        const depthLabels = ['Root Outcome', 'Latent Factors', 'Categories', 'Actions'];
                        const depthLabel = depthLabels[depth] || `Level ${depth}`;
                        
                        html += `
                        <div style="
                            margin-bottom: 25px;
                            padding: 20px;
                            background: rgba(0, 0, 0, 0.3);
                            border-radius: 8px;
                            border-left: 4px solid ${depth === 0 ? '#10b981' : depth === 1 ? '#8b5cf6' : depth === 2 ? '#f59e0b' : '#ef4444'};
                            margin-left: ${depth * 30}px;
                        ">
                            <h4 style="color: #94a3b8; margin-bottom: 15px; font-size: 0.9rem; text-transform: uppercase;">
                                ${depthLabel} (Depth ${depth})
                            </h4>`;
                        
                        depthItems.forEach(cat => {
                            const alignmentStatus = cat.alignmentRatio > 0.8 && cat.alignmentRatio < 1.2 ? 'aligned' :
                                                   cat.alignmentRatio > 0.5 && cat.alignmentRatio < 1.5 ? 'warning' : 'critical';
                            const gapSize = Math.abs((cat.idealWeight || 0) - (cat.realWeight || 0));
                            const gapColor = gapSize < 0.1 ? '#10b981' : gapSize < 0.2 ? '#f59e0b' : '#ef4444';
                            
                            html += `
                            <div style="margin-bottom: 20px; padding: 15px; background: rgba(0, 0, 0, 0.2); border-radius: 6px;">
                                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                    <span style="
                                        font-family: monospace;
                                        font-size: 1.1rem;
                                        color: #f59e0b;
                                        margin-right: 15px;
                                        min-width: 150px;
                                    ">${cat.path}</span>
                                    <span style="color: #e2e8f0; font-size: 0.95rem; flex: 1;">
                                        ${cat.title}
                                    </span>
                                    <span style="
                                        padding: 2px 8px;
                                        background: ${gapColor}22;
                                        color: ${gapColor};
                                        border-radius: 4px;
                                        font-size: 0.8rem;
                                        font-weight: bold;
                                    ">
                                        GAP: ${(gapSize * 100).toFixed(0)}%
                                    </span>
                                </div>
                                
                                <!-- Intent Bar (What we say we want to do) -->
                                <div style="margin-bottom: 8px;">
                                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                        <span style="color: #8b5cf6; font-size: 0.85rem; min-width: 60px;">INTENT</span>
                                        <span style="color: #94a3b8; font-size: 0.8rem; margin-left: 10px;">
                                            (from docs/specs)
                                        </span>
                                    </div>
                                    <div style="position: relative; height: 25px; background: rgba(139, 92, 246, 0.1); border-radius: 4px;">
                                        <div style="
                                            height: 100%;
                                            width: ${(cat.idealWeight || 0) * 100}%;
                                            background: linear-gradient(90deg, #8b5cf6, #a78bfa);
                                            border-radius: 4px;
                                            display: flex;
                                            align-items: center;
                                            padding: 0 10px;
                                            position: relative;
                                        ">
                                            <span style="color: white; font-weight: bold; font-size: 0.85rem;">
                                                ${((cat.idealWeight || 0) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Reality Bar (What we actually do) -->
                                <div style="margin-bottom: 10px;">
                                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                        <span style="color: #10b981; font-size: 0.85rem; min-width: 60px;">REALITY</span>
                                        <span style="color: #94a3b8; font-size: 0.8rem; margin-left: 10px;">
                                            (from commits/code)
                                        </span>
                                    </div>
                                    <div style="position: relative; height: 25px; background: rgba(16, 185, 129, 0.1); border-radius: 4px;">
                                        <div style="
                                            height: 100%;
                                            width: ${(cat.realWeight || 0) * 100}%;
                                            background: linear-gradient(90deg, ${gapColor}, ${gapColor}dd);
                                            border-radius: 4px;
                                            display: flex;
                                            align-items: center;
                                            padding: 0 10px;
                                        ">
                                            <span style="color: white; font-weight: bold; font-size: 0.85rem;">
                                                ${((cat.realWeight || 0) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Metrics Summary -->
                                <div style="display: flex; gap: 15px; font-size: 0.8rem; padding-top: 8px; border-top: 1px solid #334155;">
                                    <span style="color: #64748b;">
                                        <strong>Weight:</strong> ${cat.weight}%
                                    </span>
                                    <span style="color: #64748b;">
                                        <strong>Effective:</strong> ${(cat.effectiveWeight || 0).toFixed(1)}%
                                    </span>
                                    <span style="color: ${alignmentStatus === 'aligned' ? '#10b981' : alignmentStatus === 'warning' ? '#f59e0b' : '#ef4444'};">
                                        <strong>Status:</strong> ${alignmentStatus.toUpperCase()}
                                    </span>
                                    <span style="color: #64748b;">
                                        <strong>Ratio:</strong> ${(cat.alignmentRatio || 0).toFixed(2)}x
                                    </span>
                                </div>
                            </div>`;
                        });
                        
                        html += '</div>';
                    }
                    
                    return html;
                })()}
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #334155;">
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 2px; height: 12px; background: #8b5cf6;"></div>
                            <span style="color: #94a3b8; font-size: 0.9rem;">Ideal weight from documents</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 20px; height: 12px; background: #10b981; border-radius: 2px;"></div>
                            <span style="color: #94a3b8; font-size: 0.9rem;">Aligned (>80%)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 20px; height: 12px; background: #f59e0b; border-radius: 2px;"></div>
                            <span style="color: #94a3b8; font-size: 0.9rem;">Warning (50-80%)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 20px; height: 12px; background: #ef4444; border-radius: 2px;"></div>
                            <span style="color: #94a3b8; font-size: 0.9rem;">Critical (<50%)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Expanded Trust Debt Formula -->
        <div class="section-card">
            <h2 class="section-title">
                <span>📐</span>
                Trust Debt Formula - Full Expansion
            </h2>
            <div style="padding: 20px;">
                <div style="background: #0f172a; padding: 20px; border-radius: 10px; font-family: monospace; margin-bottom: 20px;">
                    <div style="color: #06ffa5; font-size: 1.2rem; margin-bottom: 15px;">
                        TrustDebt = Σ((Intent[i] - Reality[i])² × Time × SpecAge × CategoryWeight[i])
                    </div>
                    <div style="color: #94a3b8; font-size: 0.95rem; line-height: 1.8;">
                        <div>where:</div>
                        <div style="padding-left: 20px;">
                            <div><span style="color: #8b5cf6;">Intent[i]</span> = Documented vision from tracked documents</div>
                            <div><span style="color: #8b5cf6;">Reality[i]</span> = Actual patterns from git commits</div>
                            <div><span style="color: #8b5cf6;">Time</span> = Days since last alignment (momentum decay)</div>
                            <div><span style="color: #8b5cf6;">SpecAge</span> = Days since spec update (staleness penalty)</div>
                            <div><span style="color: #8b5cf6;">CategoryWeight[i]</span> = ShortLex hierarchical weight</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 8px;">
                        <h4 style="color: #10b981; margin-bottom: 10px;">📊 Current Values</h4>
                        <div style="color: #e2e8f0; font-size: 0.9rem; line-height: 1.6;">
                            ${data.formula ? `
                            <div>Time Factor: ${data.formula.timeFactor || 1} days</div>
                            <div>Spec Age: ${data.formula.specAge || repoState.specAge || 0} days</div>
                            <div>Categories: ${data.categories ? data.categories.length : 6}</div>
                            <div>Max Weight: ${data.categories ? Math.max(...data.categories.map(c => c.weight || 0.1)).toFixed(2) : '0.25'}</div>
                            ` : `
                            <div>Time Factor: 1 day</div>
                            <div>Spec Age: ${repoState.specAge} days</div>
                            <div>Active Categories: 6</div>
                            `}
                        </div>
                    </div>
                    
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 8px;">
                        <h4 style="color: #ef4444; margin-bottom: 10px;">⚖️ Semantic Meaning</h4>
                        <div style="color: #e2e8f0; font-size: 0.9rem; line-height: 1.6;">
                            <div><strong>Trust:</strong> Reliability gap between promise & delivery</div>
                            <div><strong>Debt:</strong> Accumulated liability compounding over time</div>
                            <div><strong>Momentum:</strong> Rate of change (dTrustDebt/dt)</div>
                            <div><strong>Carrying Capacity:</strong> ~300 units before collapse</div>
                        </div>
                    </div>
                </div>

                ${data.mvpFocus ? `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #334155;">
                    <h4 style="color: #f59e0b; margin-bottom: 10px;">🎯 MVP Forcing Function Focus</h4>
                    <div style="display: flex; gap: 20px;">
                        <div style="flex: 1;">
                            <div style="color: #10b981; font-weight: 600; margin-bottom: 5px;">
                                🥕 Carrot (${(data.mvpFocus.carrotStick.weight * 100).toFixed(0)}%)
                            </div>
                            <div style="color: #94a3b8; font-size: 0.9rem;">
                                ${data.mvpFocus.carrotStick.carrot}
                            </div>
                        </div>
                        <div style="flex: 1;">
                            <div style="color: #ef4444; font-weight: 600; margin-bottom: 5px;">
                                🔨 Stick (${(data.mvpFocus.carrotStick.weight * 100).toFixed(0)}%)
                            </div>
                            <div style="color: #94a3b8; font-size: 0.9rem;">
                                ${data.mvpFocus.carrotStick.stick}
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Formula Explanation Section -->
        <div class="section-card" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0, 0, 0, 0.3));">
            <h2 class="section-title">
                <span>📐</span>
                The Trust Debt Formula Explained
            </h2>
            
            <div style="background: rgba(0, 0, 0, 0.5); padding: 30px; border-radius: 15px; margin: 20px 0;">
                <h3 style="color: #06ffa5; font-family: monospace; font-size: 2rem; text-align: center; margin-bottom: 30px;">
                    Trust Debt = (Intent - Reality)² × Time × Spec_Age
                </h3>
                
                <div style="display: grid; gap: 20px; margin-top: 30px;">
                    <div style="padding: 20px; background: rgba(139, 92, 246, 0.1); border-radius: 12px;">
                        <h4 style="color: #8b5cf6; margin-bottom: 15px;">📍 Intent Vector (What You Want)</h4>
                        <p style="color: #e2e8f0; margin-bottom: 10px;">Your documented architectural vision from ${data.intent ? data.intent.source : 'CLAUDE.md'}:</p>
                        <ul style="list-style: none; padding-left: 20px;">
                            <li>🏛️ <strong>Trust (${data.intent ? (data.intent.vector.trust * 100).toFixed(0) : 35}%)</strong>: Building quantifiable, measurable systems</li>
                            <li>⏰ <strong>Timing (${data.intent ? (data.intent.vector.timing * 100).toFixed(0) : 35}%)</strong>: 30-second delivery, strategic precision</li>
                            <li>💡 <strong>Recognition (${data.intent ? (data.intent.vector.recognition * 100).toFixed(0) : 30}%)</strong>: Creating "oh moments" and breakthroughs</li>
                        </ul>
                        <p style="color: #94a3b8; margin-top: 15px; font-size: 0.9rem;">
                            <strong>Why this matters:</strong> Intent is your North Star - where you're trying to go. It's pulled from your spec files and represents your ideal architecture.
                        </p>
                    </div>
                    
                    <div style="padding: 20px; background: rgba(239, 68, 68, 0.1); border-radius: 12px;">
                        <h4 style="color: #ef4444; margin-bottom: 15px;">📊 Reality Vector (What You Have)</h4>
                        <p style="color: #e2e8f0; margin-bottom: 10px;">Actual patterns found in your code:</p>
                        <ul style="list-style: none; padding-left: 20px;">
                            <li>🏛️ Trust: ${((gaps.trust < 0 ? (0.35 - gaps.trust) : (0.35 + gaps.trust)) * 100).toFixed(0)}% actual focus</li>
                            <li>⏰ Timing: ${((gaps.timing < 0 ? (0.35 - gaps.timing) : (0.35 + gaps.timing)) * 100).toFixed(0)}% actual focus</li>
                            <li>💡 Recognition: ${((gaps.recognition < 0 ? (0.30 - gaps.recognition) : (0.30 + gaps.recognition)) * 100).toFixed(0)}% actual focus</li>
                        </ul>
                        <p style="color: #94a3b8; margin-top: 15px; font-size: 0.9rem;">
                            <strong>Why this matters:</strong> Reality is measured by analyzing commit messages, code patterns, and documentation. The gap between Intent and Reality is your drift.
                        </p>
                    </div>
                    
                    <div style="padding: 20px; background: rgba(245, 158, 11, 0.1); border-radius: 12px;">
                        <h4 style="color: #f59e0b; margin-bottom: 15px;">⏱️ Time Factors</h4>
                        <p style="color: #e2e8f0; margin-bottom: 10px;">How drift compounds over time:</p>
                        <ul style="list-style: none; padding-left: 20px;">
                            <li>📅 <strong>Spec Age:</strong> ${repoState.specAge} days since CLAUDE.md update</li>
                            <li>📈 <strong>Drift Rate:</strong> 0.3% daily compound</li>
                            <li>⚠️ <strong>Penalty:</strong> +${(repoState.specAge * 0.1).toFixed(1)} units from spec staleness</li>
                        </ul>
                        <p style="color: #94a3b8; margin-top: 15px; font-size: 0.9rem;">
                            <strong>Why this matters:</strong> Drift accelerates over time. An outdated spec means your Intent vector itself becomes unreliable, multiplying the debt.
                        </p>
                    </div>
                </div>
                
                <div style="margin-top: 30px; padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px;">
                    <h4 style="color: #10b981; margin-bottom: 15px;">🎯 Current Calculation</h4>
                    <div style="font-family: monospace; font-size: 1.1rem; line-height: 1.8;">
                        L2 Distance = √(${(gaps.trust ** 2).toFixed(4)} + ${(gaps.timing ** 2).toFixed(4)} + ${(gaps.recognition ** 2).toFixed(4)})<br>
                        L2 Distance = ${Math.sqrt(gaps.trust ** 2 + gaps.timing ** 2 + gaps.recognition ** 2).toFixed(3)}<br>
                        Base Debt = ${Math.sqrt(gaps.trust ** 2 + gaps.timing ** 2 + gaps.recognition ** 2).toFixed(3)} × 1000 = ${(Math.sqrt(gaps.trust ** 2 + gaps.timing ** 2 + gaps.recognition ** 2) * 1000).toFixed(0)}<br>
                        <strong style="color: #06ffa5;">Total Debt = ${trustDebtScore} units</strong>
                    </div>
                </div>
            </div>
        </div>

        <!-- Momentum Formula Explanation -->
        <div class="section-card" style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(0, 0, 0, 0.3));">
            <h2 class="section-title">
                <span>🚀</span>
                The Momentum Formula (M = S × E)
            </h2>
            
            <div style="background: rgba(0, 0, 0, 0.5); padding: 30px; border-radius: 15px; margin: 20px 0;">
                <h3 style="color: #ec4899; font-family: monospace; font-size: 2rem; text-align: center; margin-bottom: 30px;">
                    Momentum = Skill × Environment
                </h3>
                
                <div style="display: grid; gap: 20px; margin-top: 30px;">
                    <div style="padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px;">
                        <h4 style="color: #10b981; margin-bottom: 15px;">💪 Skill (${analysisData.fim.skill}%) ${agent1Bucket ? `- Based on ${agent1Bucket.total_keywords_extracted} extracted keywords` : ''}</h4>
                        <p style="color: #e2e8f0; margin-bottom: 10px;">How well your commits align with principles:</p>
                        <ul style="list-style: none; padding-left: 20px;">
                            <li>✅ Positive alignment: ${agent1Bucket ? `${agent1Bucket.extracted_keywords?.filter(k => k.balance_type === 'Balanced').length || 0} balanced keywords` : 'Commits advance trust/timing/recognition'}</li>
                            <li>❌ Negative alignment: ${agent1Bucket ? `${agent1Bucket.extracted_keywords?.filter(k => k.balance_type === 'Intent-Heavy').length || 0} intent-heavy keywords (documentation gaps)` : 'Commits violate principles'}</li>
                            <li>📊 Current: ${analysisData.fim.skill}% execution quality ${agent1Bucket ? `(${agent1Bucket.validation_results?.keyword_coverage || 'unknown'} coverage)` : ''}</li>
                        </ul>
                        <p style="color: #94a3b8; margin-top: 15px; font-size: 0.9rem;">
                            <strong>Why this matters:</strong> Skill measures execution. Even with perfect intent, poor execution creates debt. High skill means your commits consistently advance your architectural vision.
                        </p>
                    </div>
                    
                    <div style="padding: 20px; background: rgba(139, 92, 246, 0.1); border-radius: 12px;">
                        <h4 style="color: #8b5cf6; margin-bottom: 15px;">🌍 Environment (${analysisData.fim.environment}%)</h4>
                        <p style="color: #e2e8f0; margin-bottom: 10px;">How fresh and relevant your spec is:</p>
                        <ul style="list-style: none; padding-left: 20px;">
                            <li>📅 Spec age: ${repoState.specAge} days old</li>
                            <li>📉 Decay rate: -0.1% per day</li>
                            <li>🎯 Current: ${analysisData.fim.environment}% spec relevance</li>
                        </ul>
                        <p style="color: #94a3b8; margin-top: 15px; font-size: 0.9rem;">
                            <strong>Why this matters:</strong> Environment is your foundation. An outdated spec means you're executing against wrong targets. Fresh specs enable accurate execution.
                        </p>
                    </div>
                    
                    <div style="padding: 20px; background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(139, 92, 246, 0.1)); border-radius: 12px;">
                        <h4 style="color: #ec4899; margin-bottom: 15px;">⚡ The Multiplicative Effect</h4>
                        <p style="color: #e2e8f0; margin-bottom: 10px;">Why multiplication matters:</p>
                        <ul style="list-style: none; padding-left: 20px;">
                            <li>📈 <strong>Current Momentum:</strong> ${analysisData.fim.momentum}%</li>
                            <li>🔥 <strong>Leverage:</strong> ${analysisData.fim.leverage}x multiplier</li>
                            <li>🎯 <strong>Target:</strong> 100% momentum = 10x leverage</li>
                        </ul>
                        <p style="color: #94a3b8; margin-top: 15px; font-size: 0.9rem;">
                            <strong>Why this matters:</strong> Momentum creates exponential returns. At 100% momentum, every action has 10x impact. Below 50%, you're in linear grind mode. The multiplication means both factors must be strong - 90% × 50% = 45% (failure), but 80% × 80% = 64% (success).
                        </p>
                    </div>
                </div>
                
                <div style="margin-top: 30px; padding: 20px; background: ${analysisData.fim.momentum > 75 ? 'rgba(16, 185, 129, 0.1)' : analysisData.fim.momentum > 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-radius: 12px;">
                    <h4 style="color: ${analysisData.fim.momentum > 75 ? '#10b981' : analysisData.fim.momentum > 50 ? '#f59e0b' : '#ef4444'}; margin-bottom: 15px;">
                        ${analysisData.fim.momentum > 75 ? '🚀 Exponential Zone' : analysisData.fim.momentum > 50 ? '⚡ Growth Zone' : '⚠️ Linear Grind Zone'}
                    </h4>
                    <p style="color: #e2e8f0;">
                        ${analysisData.fim.momentum > 75 ? 
                          `You're in the exponential zone! With ${analysisData.fim.leverage}x leverage, every good commit creates multiplicative value. Keep the momentum!` :
                          analysisData.fim.momentum > 50 ?
                          `You're in growth mode with ${analysisData.fim.leverage}x leverage. Push either Skill or Environment above 80% to reach exponential returns.` :
                          `You're in linear grind mode. With only ${analysisData.fim.leverage}x leverage, you're working hard for small gains. Focus on improving ${analysisData.fim.skill < analysisData.fim.environment ? 'Skill (execution)' : 'Environment (spec freshness)'} first.`
                        }
                    </p>
                </div>
            </div>
        </div>

        <!-- Historical Graphs -->
        ${recentHistory.length > 1 ? `
        <div class="section-card">
            <h2 class="section-title">
                <span>📈</span>
                Historical Trends
            </h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px;">
                <div style="position: relative; height: 300px;">
                    <h3 style="color: #8b5cf6; margin-bottom: 20px;">Trust Debt Over Time</h3>
                    <canvas id="debtChart"></canvas>
                </div>
                <div style="position: relative; height: 300px;">
                    <h3 style="color: #ec4899; margin-bottom: 20px;">Momentum Over Time</h3>
                    <canvas id="momentumChart"></canvas>
                </div>
            </div>
            
            <div style="margin-top: 30px; position: relative; height: 300px;">
                <h3 style="color: #10b981; margin-bottom: 20px;">Leverage Multiplier Over Time</h3>
                <canvas id="leverageChart"></canvas>
            </div>
        </div>
        ` : ''}

        <!-- Repository State -->
        <div class="section-card">
            <h2 class="section-title">
                <span>📁</span>
                Repository State
            </h2>
            <div class="repo-stats">
                <div class="repo-stat">
                    <div class="repo-stat-value">${repoState.branch}</div>
                    <div class="repo-stat-label">Branch</div>
                </div>
                <div class="repo-stat">
                    <div class="repo-stat-value">${repoState.status}</div>
                    <div class="repo-stat-label">Status</div>
                </div>
                <div class="repo-stat">
                    <div class="repo-stat-value">${repoState.specAge}</div>
                    <div class="repo-stat-label">Spec Age (days)</div>
                </div>
                <div class="repo-stat">
                    <div class="repo-stat-value">${repoState.totalCommits}</div>
                    <div class="repo-stat-label">Total Commits</div>
                </div>
            </div>
        </div>

        <!-- Gap Analysis -->
        <div class="section-card">
            <h2 class="section-title">
                <span>📐</span>
                Intent vs Reality Gaps
            </h2>
            <div class="gaps-grid">
                <div class="gap-item">
                    <div class="gap-label">🏛️ Trust Gap</div>
                    <div class="gap-value" style="color: ${Math.abs(gaps.trust) > 0.2 ? '#ef4444' : '#10b981'}">
                        ${(Math.abs(gaps.trust) * 100).toFixed(0)}%
                    </div>
                </div>
                <div class="gap-item">
                    <div class="gap-label">⏰ Timing Gap</div>
                    <div class="gap-value" style="color: ${Math.abs(gaps.timing) > 0.2 ? '#ef4444' : '#f59e0b'}">
                        ${(Math.abs(gaps.timing) * 100).toFixed(0)}%
                    </div>
                </div>
                <div class="gap-item">
                    <div class="gap-label">💡 Recognition Gap</div>
                    <div class="gap-value" style="color: ${Math.abs(gaps.recognition) > 0.2 ? '#ef4444' : '#8b5cf6'}">
                        ${(Math.abs(gaps.recognition) * 100).toFixed(0)}%
                    </div>
                </div>
            </div>
        </div>

        <!-- Recent Commits Analysis -->
        ${commits && commits.length > 0 ? `
        <div class="section-card">
            <h2 class="section-title">
                <span>📝</span>
                Recent Commits Analysis
            </h2>
            <div class="commit-grid">
                ${commits.map(commit => `
                    <div class="commit-card">
                        <div class="commit-header">
                            <div>
                                <span class="commit-hash">${commit.hash}</span>
                                <span style="margin-left: 15px; font-weight: 600;">
                                    ${commit.subject}
                                </span>
                            </div>
                            <div class="commit-scores">
                                <div class="score-badge">
                                    <span class="score-label">Trust</span>
                                    <div class="score-value" style="color: ${commit.analysis && commit.analysis.trust > 0 ? '#10b981' : commit.analysis && commit.analysis.trust < 0 ? '#ef4444' : '#94a3b8'}">
                                        ${commit.analysis ? (commit.analysis.trust > 0 ? '+' : '') + commit.analysis.trust : 'N/A'}
                                    </div>
                                </div>
                                <div class="score-badge">
                                    <span class="score-label">Timing</span>
                                    <div class="score-value" style="color: ${commit.analysis && commit.analysis.timing > 0 ? '#f59e0b' : commit.analysis && commit.analysis.timing < 0 ? '#ef4444' : '#94a3b8'}">
                                        ${commit.analysis ? (commit.analysis.timing > 0 ? '+' : '') + commit.analysis.timing : 'N/A'}
                                    </div>
                                </div>
                                <div class="score-badge">
                                    <span class="score-label">Recognition</span>
                                    <div class="score-value" style="color: ${commit.analysis && commit.analysis.recognition > 0 ? '#8b5cf6' : commit.analysis && commit.analysis.recognition < 0 ? '#ef4444' : '#94a3b8'}">
                                        ${commit.analysis ? (commit.analysis.recognition > 0 ? '+' : '') + commit.analysis.recognition : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        ${commit.analysis && commit.analysis.insight ? `
                            <p style="color: #94a3b8; margin-top: 15px;">
                                ${commit.analysis.insight}
                            </p>
                        ` : ''}
                        <div style="margin-top: 15px; color: #64748b; font-size: 0.9rem;">
                            ${commit.author ? `By ${commit.author} • ` : ''}
                            ${commit.relative ? `${commit.relative} • ` : ''}
                            ${commit.filesChanged ? `${commit.filesChanged.length} files • ` : ''}
                            ${commit.stats ? `+${commit.stats.insertions} -${commit.stats.deletions}` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Predictions -->
        <div class="section-card">
            <h2 class="section-title">
                <span>🔮</span>
                Predictions
            </h2>
            <div class="predictions-grid">
                <div class="prediction-card">
                    <h3 style="color: #94a3b8; margin-bottom: 10px;">7-Day Forecast</h3>
                    <div class="prediction-value">${data.predictions?.days7 || trustDebtScore + 5}</div>
                    <p style="color: #64748b;">
                        ${(data.predictions?.days7 || trustDebtScore + 5) > trustDebtScore ? '📈 Increasing' : '📉 Decreasing'}
                        by ${Math.abs((data.predictions?.days7 || trustDebtScore + 5) - trustDebtScore)} units
                    </p>
                </div>
                <div class="prediction-card">
                    <h3 style="color: #94a3b8; margin-bottom: 10px;">30-Day Forecast</h3>
                    <div class="prediction-value">${data.predictions?.days30 || trustDebtScore + 10}</div>
                    <p style="color: #64748b;">
                        ${(data.predictions?.days30 || trustDebtScore + 10) > trustDebtScore ? '📈 Increasing' : '📉 Decreasing'}
                        by ${Math.abs((data.predictions?.days30 || trustDebtScore + 10) - trustDebtScore)} units
                    </p>
                </div>
                <div class="prediction-card">
                    <h3 style="color: #94a3b8; margin-bottom: 10px;">Trajectory</h3>
                    <p style="font-size: 1.5rem; color: #8b5cf6; margin: 20px 0;">
                        ${analysisData.predictions.trajectory}
                    </p>
                </div>
            </div>
        </div>

        <!-- Insights -->
        ${analysisData.insights && analysisData.insights.length > 0 ? `
        <div class="section-card">
            <h2 class="section-title">
                <span>💡</span>
                Key Insights
            </h2>
            <div class="insights-grid">
                ${analysisData.insights.map(insight => `
                    <div class="insight-item">
                        ${insight}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${data.narrative ? `
        <!-- Claude Narrative Analysis -->
        <div class="section-card" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0, 0, 0, 0.3));">
            <h2 class="section-title">
                <span>🤖</span>
                Claude AI Narrative Analysis
            </h2>
            <div style="padding: 20px; color: #e2e8f0; line-height: 1.8;">
                ${data.narrative.split('\n').map(p => p.trim() ? `<p style="margin-bottom: 15px;">${p}</p>` : '').join('')}
            </div>
        </div>
        ` : ''}

        <!-- Recommendations -->
        ${analysisData.recommendations && analysisData.recommendations.length > 0 ? `
        <div class="section-card">
            <h2 class="section-title">
                <span>✅</span>
                Recommendations
            </h2>
            ${analysisData.recommendations.map(rec => `
                <div class="recommendation">
                    ${rec}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- Drift Indicators -->
        ${analysisData.driftIndicators && analysisData.driftIndicators.length > 0 ? `
        <div class="section-card">
            <h2 class="section-title">
                <span>⚠️</span>
                Drift Indicators
            </h2>
            ${analysisData.driftIndicators.map(indicator => `
                <div class="drift-indicator">
                    ${indicator}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- Zero Multiplier Alert (Critical Override) -->
        ${(() => {
          try {
            const scoringFix = new TrustDebtScoringFix();
            const correctedScoring = scoringFix.calculateTrueScore(data);
            if (correctedScoring.status.includes('ZERO_MULTIPLIER')) {
              return scoringFix.generateCorrectedHTML(data);
            }
          } catch (error) {
            console.warn('Zero multiplier check failed:', error.message);
          }
          return '';
        })()}

        <!-- Normal Analysis Section -->
          } catch (error) {
            console.warn('Measurement crisis check failed:', error.message);
          }
          return '';
        })()}

        <!-- Agent 2 Category Matrix Section -->
        ${(() => {
          const agent2 = allBuckets.agent2;
          if (agent2 && agent2.categories) {
            const categories = agent2.categories;
            const matrixSize = categories.length;
            
            return `
            <div class="section-card">
                <h2 class="section-title">
                    <span>📊</span>
                    Agent 2: Dynamic Category Matrix (${matrixSize}x${matrixSize})
                </h2>
                <div style="padding: 20px;">
                    <p style="color: #94a3b8; margin-bottom: 15px;">
                        Orthogonally validated categories with CV=${(agent2.balance_validation?.statistics?.coefficient_of_variation || 0).toFixed(3)} (${agent2.balance_validation?.statistics?.balance_quality || 'unknown'})
                    </p>
                    
                    <!-- Category Grid -->
                    <div style="display: grid; grid-template-columns: repeat(${Math.min(matrixSize, 3)}, 1fr); gap: 15px; margin: 20px 0;">
                        ${categories.map(cat => `
                            <div style="background: rgba(139, 92, 246, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                                <h4 style="color: #8b5cf6; margin-bottom: 10px;">${cat.name || cat.id}</h4>
                                <div style="color: #e2e8f0; font-size: 0.9rem;">
                                    <div><strong>Keywords:</strong> ${cat.keyword_count || (cat.keywords ? cat.keywords.length : 0)}</div>
                                    <div><strong>Frequency:</strong> ${cat.total_frequency || 0}</div>
                                    <div><strong>Focus:</strong> ${cat.semantic_focus || cat.description || 'N/A'}</div>
                                </div>
                                ${cat.keywords && cat.keywords.length > 0 ? `
                                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(139, 92, 246, 0.2);">
                                        <div style="color: #94a3b8; font-size: 0.8rem;">Top keywords:</div>
                                        <div style="color: #e2e8f0; font-size: 0.8rem;">
                                            ${cat.keywords.slice(0, 5).join(', ')}${cat.keywords.length > 5 ? '...' : ''}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- Validation Results -->
                    <div style="margin-top: 20px; padding: 15px; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
                        <h4 style="color: #10b981; margin-bottom: 10px;">✅ Agent 2 Validation Results</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                            <div>
                                <div style="color: #e2e8f0; font-size: 0.9rem;">
                                    <div><strong>Orthogonality Score:</strong> ${((agent2.orthogonality_validation?.overall_orthogonality_score || 0) * 100).toFixed(1)}%</div>
                                    <div><strong>Min Pairwise:</strong> ${((agent2.orthogonality_validation?.minimum_pairwise_score || 0) * 100).toFixed(1)}%</div>
                                    <div><strong>Status:</strong> ${agent2.orthogonality_validation?.validation_status || 'Unknown'}</div>
                                </div>
                            </div>
                            <div>
                                <div style="color: #e2e8f0; font-size: 0.9rem;">
                                    <div><strong>Balance CV:</strong> ${((agent2.balance_validation?.statistics?.coefficient_of_variation || 0) * 100).toFixed(1)}%</div>
                                    <div><strong>Quality:</strong> ${agent2.balance_validation?.statistics?.balance_quality || 'unknown'}</div>
                                    <div><strong>Coverage:</strong> ${agent2.validation_summary?.coverage_percentage || 0}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- ShortLex Preparation -->
                    ${agent2.shortlex_preparation ? `
                        <div style="margin-top: 15px; padding: 15px; background: rgba(245, 158, 11, 0.1); border-radius: 8px;">
                            <h4 style="color: #f59e0b; margin-bottom: 10px;">🔗 Agent 3 Integration Ready</h4>
                            <div style="color: #e2e8f0; font-size: 0.9rem;">
                                <div><strong>ShortLex Order:</strong> ${agent2.shortlex_preparation.alphabetical_ordering ? agent2.shortlex_preparation.alphabetical_ordering.join(' → ') : 'Ready'}</div>
                                <div><strong>Matrix Dimensions:</strong> ${agent2.shortlex_preparation.expected_dimensions || `${matrixSize}x${matrixSize}`}</div>
                                <div><strong>Status:</strong> ${agent2.shortlex_preparation.matrix_ready ? '✅ Ready for Agent 3' : '⚠️ Preparation incomplete'}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>`;
          }
          return '';
        })()}

        <!-- Reality vs Intent Matrix -->
        ${(() => {
          const matrixData = loadRealityIntentData();
          return generateRealityIntentSection(matrixData);
        })()}
    </div>

    <div class="footer">
        <p>Generated: ${new Date(timestamp).toLocaleString()}</p>
        <p>
            ${metadataWithDefaults.claudeAvailable ? '🤖 AI-Powered Analysis' : '📊 Pattern-Based Analysis'} • 
            ${commits.length} commits analyzed • 
            ${documents.length} documents processed
        </p>
        <p style="margin-top: 10px; color: #8b5cf6;">
            Trust Debt measures the gap between your intended architecture and actual implementation
        </p>
    </div>

    <!-- Loading overlay -->
    <div class="loading" id="loading">
        <div class="loading-spinner"></div>
    </div>

    <script>
        // Auto-refresh every 30 seconds if file changes
        let lastModified = '${timestamp}';
        
        setInterval(async () => {
            try {
                // Check if analysis file has been updated
                const response = await fetch('/trust-debt-analysis.json?t=' + Date.now());
                if (response.ok) {
                    const data = await response.json();
                    if (data.timestamp !== lastModified) {
                        document.getElementById('loading').classList.add('active');
                        setTimeout(() => location.reload(), 500);
                    }
                }
            } catch (e) {
                // Ignore errors, file might not be served
            }
        }, 30000);

        // Show commit details on click
        document.querySelectorAll('.commit-card').forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', function() {
                this.style.maxHeight = this.style.maxHeight === 'none' ? '200px' : 'none';
            });
        });

        // Initialize charts if data exists
        ${recentHistory.length > 1 ? `
        // Wait for DOM to be ready
        window.addEventListener('DOMContentLoaded', function() {
            const chartConfig = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(139, 92, 246, 0.1)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(139, 92, 246, 0.1)' },
                    ticks: { color: '#94a3b8' }
                }
            }
        };

        // Trust Debt Chart
        new Chart(document.getElementById('debtChart'), {
            type: 'line',
            data: {
                labels: ${JSON.stringify(historyData.timestamps)},
                datasets: [{
                    label: 'Trust Debt',
                    data: ${JSON.stringify(historyData.debtValues)},
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: chartConfig
        });

        // Momentum Chart
        new Chart(document.getElementById('momentumChart'), {
            type: 'line',
            data: {
                labels: ${JSON.stringify(historyData.timestamps)},
                datasets: [{
                    label: 'Momentum',
                    data: ${JSON.stringify(historyData.momentumValues)},
                    borderColor: '#ec4899',
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: chartConfig
        });

        // Leverage Chart
        new Chart(document.getElementById('leverageChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(historyData.timestamps)},
                datasets: [{
                    label: 'Leverage',
                    data: ${JSON.stringify(historyData.leverageValues)},
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: '#10b981',
                    borderWidth: 2
                }]
            },
            options: chartConfig
        });
        }); // End DOMContentLoaded
        ` : ''}
    </script>
    
    <!-- Comprehensive Analysis Sections (always show) -->
    <div class="container">
        ${(() => {
            const comprehensiveGen = new ComprehensiveHTMLGenerator();
            let sections = '';
            
            // Add heatmap section
            sections += comprehensiveGen.generateHeatmapSection();
            
            // Add formula section
            sections += comprehensiveGen.generateFormulaSection();
            
            // Add meaning section
            sections += comprehensiveGen.generateMeaningSection();
            
            // Add two-layer breakdown (if data available)
            const twoLayerFile = path.join(this.projectRoot, 'trust-debt-two-layer-assessment.json');
            if (fs.existsSync(twoLayerFile)) {
                const twoLayerAssessment = JSON.parse(fs.readFileSync(twoLayerFile, 'utf8'));
                sections += comprehensiveGen.generateTwoLayerBreakdown(
                    twoLayerAssessment.processHealth,
                    twoLayerAssessment.outcomeReality
                );
            } else {
                sections += comprehensiveGen.generateTwoLayerBreakdown();
            }
            
            // Add legal substantiation section
            sections += comprehensiveGen.generateSubstantiationSection();
            
            return sections;
        })()}
    </div>
</body>
</html>`;
    } catch (error) {
      console.error('Error in generateHTML:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Save HTML to file
   */
  saveHTML(html) {
    fs.writeFileSync(this.htmlFile, html);
    
    // Also save timestamped version
    const timestamp = Date.now();
    const timestampedFile = path.join(
      this.projectRoot, 
      `trust-debt-report-${timestamp}.html`
    );
    fs.writeFileSync(timestampedFile, html);
    
    return { main: this.htmlFile, timestamped: timestampedFile };
  }

  /**
   * Main execution
   */
  run() {
    try {
      console.log('🎨 Generating Trust Debt HTML Report');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Load analysis data
      console.log('\n📊 Loading analysis data...');
      const data = this.loadAnalysis();
      const trustDebtScore = data.trustDebt?.score || data.analysis?.trustDebt || 0;
      console.log(`  Trust Debt: ${trustDebtScore} units`);
      console.log(`  Trend: ${data.trustDebt?.trend || data.analysis?.trend || 'stable'}`);
      
      // Load history for graphs
      console.log('\n📈 Loading historical data...');
      const history = this.loadHistory();
      console.log(`  History entries: ${history.calculations.length}`);
      
      // Generate HTML with history
      console.log('\n🎨 Generating HTML...');
      const html = this.generateHTML(data, history);
      
      // Save files
      const files = this.saveHTML(html);
      
      console.log('\n✅ HTML report generated!');
      console.log(`📄 Main file: ${path.basename(files.main)}`);
      console.log(`📄 Backup: ${path.basename(files.timestamped)}`);
      
      return files.main;
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new TrustDebtHTMLGenerator();
  const htmlFile = generator.run();
  
  // Open in browser
  require('child_process').exec(`open ${htmlFile}`);
}

module.exports = TrustDebtHTMLGenerator;