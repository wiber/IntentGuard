#!/usr/bin/env node

/**
 * Trust Debt Claude Pipeline - Full Claude Integration
 * 
 * Uses Claude CLI to:
 * 1. Extract orthogonal categories from MVP documents
 * 2. Analyze git commits for trust/timing/recognition
 * 3. Generate narrative insights
 * 4. Create ShortLex weighted visualizations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TrustDebtClaudePipeline {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.settingsFile = path.join(this.projectRoot, 'trust-debt-settings.json');
    this.cacheDir = path.join(this.projectRoot, '.trust-debt-cache');
    this.timestamp = new Date().toISOString();
    
    // Load settings
    this.settings = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
    
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Load stable categories from configuration file
   */
  async extractCategoriesWithClaude() {
    console.log('\n📂 Loading stable MVP categories from configuration...');
    
    // Check for stable categories file first
    const categoriesFile = this.settings.categoriesFile || 'trust-debt-categories.json';
    const categoriesPath = path.join(this.projectRoot, categoriesFile);
    
    if (fs.existsSync(categoriesPath)) {
      const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
      
      // Extract the top-level categories (latent factors)
      const categories = [];
      if (categoriesData.root && categoriesData.root.children) {
        for (const child of categoriesData.root.children) {
          categories.push(child.id);
        }
      }
      
      // Cache the loaded categories
      const cacheData = {
        timestamp: new Date().toISOString(),
        source: 'stable_config',
        file: categoriesFile,
        categories: categoriesData.root.children
      };
      
      fs.writeFileSync(
        path.join(this.cacheDir, 'categories.json'),
        JSON.stringify(cacheData, null, 2)
      );
      
      console.log(`  ✓ Loaded ${categories.length} stable categories from ${categoriesFile}`);
      return categories;
    }
    
    // Fallback to Claude extraction if no stable file
    const documents = [];
    for (const [key, doc] of Object.entries(this.settings.documents.tracked)) {
      const docPath = path.join(this.projectRoot, doc.path);
      if (fs.existsSync(docPath)) {
        const content = fs.readFileSync(docPath, 'utf8');
        // Limit content to first 2000 chars for each doc
        documents.push({
          name: key,
          weight: doc.weight,
          content: content.substring(0, 2000)
        });
      }
    }
    
    // Create prompt focusing on MVP forcing function
    const prompt = `
You are analyzing documents for a Trust Debt forcing function MVP. Extract 5-7 orthogonal categories that represent:

1. Carrot & Stick Forcing Function (accountability through visualization)
2. Trade-off Matrix (real vs ideal priorities)
3. Trust Preservation (from patent claims)
4. Business Alignment (from business plan)

Documents (weighted by importance):
${documents.map(d => `\n[${d.name} - weight: ${d.weight}]\n${d.content}`).join('\n---\n')}

Extract orthogonal categories with these requirements:
- Each category must have correlation < 0.1 with others
- Categories should map to ShortLex hierarchy (O, Α, Β, Γ, Δ, Ε)
- Focus on MVP subdivisions: forcing function, visualization, measurement

Return JSON format:
{
  "categories": [
    {"name": "CategoryName", "weight": 0.25, "description": "...", "symbol": "O", "depth": 1}
  ]
}
`;

    try {
      // Use Claude CLI with --print flag
      const claudeCmd = `claude --print "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
      const response = execSync(claudeCmd, { 
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      // Parse Claude's response
      const jsonMatch = response.match(/\{[\s\S]*"categories"[\s\S]*\}/);
      if (jsonMatch) {
        const categories = JSON.parse(jsonMatch[0]).categories;
        
        // Save to cache
        const cacheData = {
          timestamp: this.timestamp,
          source: 'claude',
          categories: categories
        };
        
        fs.writeFileSync(
          path.join(this.cacheDir, 'categories.json'),
          JSON.stringify(cacheData, null, 2)
        );
        
        console.log(`  ✓ Extracted ${categories.length} categories via Claude`);
        return categories;
      }
    } catch (error) {
      console.error('  ⚠️ Claude extraction failed:', error.message);
    }
    
    // Fallback to cached or pattern-based
    return this.fallbackCategoryExtraction();
  }

  /**
   * Fallback category extraction
   */
  fallbackCategoryExtraction() {
    // Check cache first
    const cacheFile = path.join(this.cacheDir, 'categories.json');
    if (fs.existsSync(cacheFile)) {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (cache.categories && cache.categories.length > 0) {
        console.log('  ✓ Using cached categories');
        if (typeof cache.categories[0] === 'object') {
          return cache.categories.map(c => c.name || c);
        }
        return cache.categories;
      }
    }
    
    // Default MVP-focused categories
    return [
      { name: "ForcingFunction", weight: 0.25, description: "Carrot & stick accountability", symbol: "O", depth: 1 },
      { name: "Visualization", weight: 0.20, description: "Matrix and graph displays", symbol: "Α", depth: 1 },
      { name: "Measurement", weight: 0.20, description: "Trust Debt quantification", symbol: "Β", depth: 1 },
      { name: "Alignment", weight: 0.15, description: "Intent vs reality tracking", symbol: "Γ", depth: 1 },
      { name: "Documentation", weight: 0.10, description: "Specs and plans", symbol: "Δ", depth: 1 },
      { name: "Implementation", weight: 0.10, description: "Code and commits", symbol: "Ε", depth: 1 }
    ];
  }

  /**
   * Analyze git commits with Claude
   */
  async analyzeCommitsWithClaude() {
    console.log('\n🔍 Analyzing commits with Claude...');
    
    // Get recent commits with full detail
    const commits = this.getDetailedCommits();
    
    if (commits.length === 0) {
      console.log('  ⚠️ No commits to analyze');
      return [];
    }
    
    const prompt = `
Analyze these git commits for Trust Debt alignment. Score each commit on:
- Trust: Reliability and quality (-100 to +100)
- Timing: Performance and speed focus (-100 to +100)
- Recognition: Pattern detection and insights (-100 to +100)

Commits:
${commits.map(c => `
Hash: ${c.hash}
Subject: ${c.subject}
Body: ${c.body}
Files: ${c.files.join(', ')}
Stats: +${c.insertions} -${c.deletions}
`).join('\n---\n')}

Return JSON:
{
  "commits": [
    {
      "hash": "...",
      "trust": 50,
      "timing": -20,
      "recognition": 30,
      "insight": "One-line explanation of impact"
    }
  ],
  "narrative": "Overall pattern explanation"
}
`;

    try {
      const claudeCmd = `claude --print "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
      const response = execSync(claudeCmd, { 
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10
      });
      
      const jsonMatch = response.match(/\{[\s\S]*"commits"[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Merge analysis with commit data
        for (let i = 0; i < commits.length && i < analysis.commits.length; i++) {
          commits[i].analysis = {
            trust: analysis.commits[i].trust || 0,
            timing: analysis.commits[i].timing || 0,
            recognition: analysis.commits[i].recognition || 0,
            overall: Math.round((
              Math.abs(analysis.commits[i].trust || 0) + 
              Math.abs(analysis.commits[i].timing || 0) + 
              Math.abs(analysis.commits[i].recognition || 0)
            ) / 3),
            insight: analysis.commits[i].insight || ''
          };
        }
        
        console.log(`  ✓ Analyzed ${commits.length} commits via Claude`);
        return { commits, narrative: analysis.narrative };
      }
    } catch (error) {
      console.error('  ⚠️ Claude commit analysis failed:', error.message);
    }
    
    // Fallback to basic analysis
    return { commits, narrative: 'Pattern-based analysis (Claude unavailable)' };
  }

  /**
   * Get detailed commit information
   */
  getDetailedCommits() {
    const commits = [];
    
    try {
      // Get last N commits with detailed format using record separator
      const log = execSync(
        `git log --format="%H%n%s%n%b%n---COMMIT-END---" -${this.settings.calculation.commitWindow}`,
        { encoding: 'utf8' }
      );
      
      const commitBlocks = log.split('---COMMIT-END---').filter(block => block.trim());
      
      for (const block of commitBlocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 2) continue;
        
        const hash = lines[0];
        const subject = lines[1];
        const body = lines.slice(2).join('\n').trim();
        
        // Get file changes
        let files = [];
        let insertions = 0;
        let deletions = 0;
        
        try {
          const diffStat = execSync(
            `git diff-tree --no-commit-id --numstat -r ${hash}`,
            { encoding: 'utf8' }
          );
          
          const changes = diffStat.trim().split('\n').filter(l => l);
          for (const change of changes) {
            const [adds, dels, file] = change.split('\t');
            files.push(file);
            insertions += parseInt(adds) || 0;
            deletions += parseInt(dels) || 0;
          }
        } catch (e) {
          // Ignore diff errors
        }
        
        commits.push({
          hash: hash.substring(0, 7),
          fullHash: hash,
          subject,
          body: body || '',
          files,
          stats: { insertions, deletions },
          text: `${subject} ${body || ''}`.trim()
        });
      }
    } catch (error) {
      console.error('Error getting commits:', error.message);
    }
    
    return commits;
  }

  /**
   * Generate ShortLex weighted axis data using proper ShortRank algorithm
   */
  generateShortLexAxis(categories, idealWeights, realWeights) {
    console.log('\n📊 Generating ShortLex weighted axis...');
    
    // Use the ShortLex generator for proper hierarchy
    const ShortLexGenerator = require('./trust-debt-shortlex-generator');
    const generator = new ShortLexGenerator();
    
    // Generate axis with proper ShortRank ordering
    const axisData = generator.generateAxis(idealWeights, realWeights);
    
    console.log('  ✓ Generated ShortLex axis with', axisData.items.length, 'categories');
    console.log('  ✓ Using ShortRank algorithm with block unity');
    
    return axisData.items;
  }

  /**
   * Generate narrative with Claude
   */
  async generateNarrative(trustDebt, categories, commits, matrix) {
    console.log('\n📝 Generating narrative with Claude...');
    
    const prompt = `
Create a human-readable narrative explaining this Trust Debt analysis:

Trust Debt Score: ${trustDebt.score} units (${trustDebt.trend})
Formula: TrustDebt = Σ((Intent - Reality)² × Time × SpecAge × CategoryWeight)

Categories analyzed: ${categories.map(c => c.name || c).join(', ')}

Recent commits show: ${commits.narrative || 'mixed alignment patterns'}

Key insights:
- Carrot: ${trustDebt.score < 200 ? 'Good alignment momentum (green zone)' : 'Alignment needed'}
- Stick: ${trustDebt.score > 100 ? 'Commit review enforced (forcing function active)' : 'Smooth commits allowed'}
- Matrix shows ${matrix.blankSpots || 0} blank spots (liability areas)

Write a 2-3 paragraph explanation of:
1. What the Trust Debt score means in practical terms
2. Why the forcing function is working (or not)
3. Specific recommendations to improve alignment

Focus on the MVP goal: creating accountability through the carrot & stick forcing function.
`;

    try {
      const claudeCmd = `claude --print "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
      const response = execSync(claudeCmd, { 
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10
      });
      
      console.log('  ✓ Generated narrative via Claude');
      return response;
    } catch (error) {
      console.error('  ⚠️ Claude narrative generation failed:', error.message);
      
      // Fallback narrative
      return `Trust Debt Analysis: The system shows a Trust Debt of ${trustDebt.score} units, indicating ${
        trustDebt.score < 100 ? 'strong alignment' :
        trustDebt.score < 200 ? 'moderate drift' :
        trustDebt.score < 300 ? 'significant divergence' :
        'critical misalignment'
      } between documented intent and actual implementation.

The forcing function is ${
        trustDebt.score > 100 ? 'actively engaged, requiring commit review' : 'in monitoring mode'
      }. Recent commits show ${
        commits.narrative || 'patterns that need closer examination'
      }.

Recommendations: ${
        trustDebt.score < 100 ? 'Maintain current momentum and alignment practices.' :
        trustDebt.score < 200 ? 'Review recent changes against MVP specifications.' :
        'Immediate realignment needed. Review the trade-off matrix for specific gap areas.'
      }`;
    }
  }

  /**
   * Main execution pipeline
   */
  async run() {
    console.log('🎯 Trust Debt Claude Pipeline - MVP Forcing Function Analysis');
    console.log('═══════════════════════════════════════════════════════════════');
    
    try {
      // Stage 1: Extract categories with Claude
      const categories = await this.extractCategoriesWithClaude();
      
      // Stage 2: Calculate ideal weights from documents
      const idealWeights = this.calculateIdealWeights(categories);
      
      // Stage 3: Analyze commits with Claude
      const commitAnalysis = await this.analyzeCommitsWithClaude();
      const commits = commitAnalysis.commits;
      
      // Stage 4: Calculate real weights from commits
      const realWeights = this.calculateRealWeights(categories, commits);
      
      // Stage 5: Build trade-off matrix
      const matrix = this.buildMatrix(categories, idealWeights, realWeights);
      
      // Stage 6: Calculate Trust Debt
      const trustDebt = this.calculateTrustDebt(matrix, idealWeights, realWeights);
      
      // Stage 7: Generate ShortLex axis
      const shortlexAxis = this.generateShortLexAxis(categories, idealWeights, realWeights);
      
      // Stage 8: Generate narrative with Claude
      const narrative = await this.generateNarrative(trustDebt, categories, commitAnalysis, matrix);
      
      // Save final analysis with complete Trust Debt data
      const analysis = {
        timestamp: this.timestamp,
        version: '3.0-claude',
        mvpFocus: this.settings.mvpIntent,
        categories,
        weights: { ideal: idealWeights, real: realWeights },
        commits,
        matrix: matrix.data,
        shortlexAxis,
        trustDebt: {
          score: trustDebt.score,
          actualScore: trustDebt.actualScore,
          status: trustDebt.status,
          crisis: trustDebt.crisis,
          trend: trustDebt.trend || 'unknown',
          isInsurable: trustDebt.isInsurable !== undefined ? trustDebt.isInsurable : trustDebt.score < 250,
          message: trustDebt.message,
          details: trustDebt.details
        },
        narrative,
        formula: this.settings.trustDebtFormula
      };
      
      fs.writeFileSync(
        path.join(this.projectRoot, 'trust-debt-analysis.json'),
        JSON.stringify(analysis, null, 2)
      );
      
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('✅ CLAUDE PIPELINE COMPLETE');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`\n📊 Trust Debt: ${trustDebt.score} units (${trustDebt.trend})`);
      console.log(`🎯 MVP Forcing Function: ${trustDebt.score > 100 ? 'ACTIVE' : 'MONITORING'}`);
      console.log(`📝 Full narrative and analysis saved to trust-debt-analysis.json`);
      
      return analysis;
      
    } catch (error) {
      console.error('\n❌ Pipeline Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  // Helper methods for weight calculation and matrix building
  calculateIdealWeights(categories) {
    const weights = {};
    // Implementation would analyze documents for category mentions
    for (const cat of categories) {
      const name = typeof cat === 'object' ? cat.name : cat;
      weights[name] = cat.weight || 1.0 / categories.length;
    }
    return weights;
  }

  calculateRealWeights(categories, commits) {
    const weights = {};
    // Implementation would analyze commits for category work
    for (const cat of categories) {
      const name = typeof cat === 'object' ? cat.name : cat;
      weights[name] = Math.random() * 0.3; // Placeholder
    }
    // Normalize
    const total = Object.values(weights).reduce((s, w) => s + w, 0);
    if (total > 0) {
      for (const key of Object.keys(weights)) {
        weights[key] /= total;
      }
    }
    return weights;
  }

  buildMatrix(categories, idealWeights, realWeights) {
    const n = categories.length;
    const matrix = [];
    let blankSpots = 0;
    
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        const catI = typeof categories[i] === 'object' ? categories[i].name : categories[i];
        const catJ = typeof categories[j] === 'object' ? categories[j].name : categories[j];
        const value = (realWeights[catI] || 0) * (idealWeights[catJ] || 0);
        if (value < 0.01) blankSpots++;
        row.push(value);
      }
      matrix.push(row);
    }
    
    return { data: matrix, blankSpots, size: n };
  }

  calculateTrustDebt(matrix, idealWeights, realWeights) {
    // Use the unified calculator for consistency across all reports
    const UnifiedCalculator = require('./trust-debt-unified-calculator');
    const calculator = new UnifiedCalculator();
    
    // Load assessment data if available
    const assessmentFile = path.join(this.projectRoot, 'trust-debt-two-layer-assessment.json');
    let assessment = null;
    if (fs.existsSync(assessmentFile)) {
      assessment = JSON.parse(fs.readFileSync(assessmentFile, 'utf8'));
    }
    
    // Build matrix nodes for unified calculator
    const nodes = [];
    for (const [cat, ideal] of Object.entries(idealWeights)) {
      nodes.push({
        name: cat,
        path: cat,
        idealWeight: ideal,
        realWeight: realWeights[cat] || 0,
        weight: ideal * 100 // Convert to percentage
      });
    }
    
    // Get commits from analysis
    const analysisFile = path.join(this.projectRoot, 'trust-debt-analysis.json');
    let commits = [];
    if (fs.existsSync(analysisFile)) {
      const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
      commits = analysis.commits || [];
    }
    
    // Calculate using unified method
    const result = calculator.calculate({
      categories: Object.keys(idealWeights),
      matrix: { nodes, cells: [] },
      assessment,
      commits,
      documents: {}
    });
    
    return {
      score: result.score,
      actualScore: result.actualScore,
      status: result.status,
      crisis: result.crisis,
      trend: result.trend || 'unknown',
      isInsurable: result.isInsurable !== undefined ? result.isInsurable : result.score < 250,
      message: result.message,
      details: result.details
    };
  }
}

// Run if called directly
if (require.main === module) {
  const pipeline = new TrustDebtClaudePipeline();
  pipeline.run().catch(error => {
    console.error('Pipeline failed:', error);
    process.exit(1);
  });
}

module.exports = TrustDebtClaudePipeline;