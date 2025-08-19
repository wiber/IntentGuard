#!/usr/bin/env node

/**
 * Trust Debt Scaffold - The Disciplined Data Pipeline
 * 
 * Based on commitMVP.txt specification:
 * 1. Extract orthogonal categories from docs (cached)
 * 2. Calculate ideal weights from documentation
 * 3. Calculate real weights from commits
 * 4. Build the 2D trade-off matrix
 * 5. Detect drift and blank spots
 * 6. Generate HTML visualization
 * 
 * Each stage produces JSON that feeds the next stage
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TrustDebtScaffold {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.cacheDir = path.join(this.projectRoot, '.trust-debt-cache');
    this.timestamp = new Date().toISOString();
    
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    
    // Data files for each stage
    this.files = {
      categories: path.join(this.cacheDir, 'categories.json'),
      idealWeights: path.join(this.cacheDir, 'ideal-weights.json'),
      realWeights: path.join(this.cacheDir, 'real-weights.json'),
      matrix: path.join(this.cacheDir, 'matrix.json'),
      drift: path.join(this.cacheDir, 'drift.json'),
      final: path.join(this.projectRoot, 'trust-debt-analysis.json')
    };
  }

  /**
   * STAGE 1: Extract Orthogonal Categories
   * Input: Documentation files
   * Output: categories.json
   * 
   * This should use an LLM, but for now we'll use pattern extraction
   */
  async stage1_extractCategories() {
    console.log('\n📊 STAGE 1: Extract Orthogonal Categories');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Check cache first (categories should be stable)
    if (fs.existsSync(this.files.categories)) {
      const cache = JSON.parse(fs.readFileSync(this.files.categories, 'utf8'));
      const age = (Date.now() - new Date(cache.timestamp).getTime()) / 1000 / 60; // minutes
      
      if (age < 60) { // Use cache if less than 1 hour old
        console.log('  ✓ Using cached categories (age: ' + Math.round(age) + ' minutes)');
        // Extract just the names if cache contains objects
        if (cache.categories && cache.categories.length > 0) {
          if (typeof cache.categories[0] === 'object') {
            return cache.categories.map(cat => cat.name);
          }
          return cache.categories;
        }
      }
    }
    
    // Load documentation
    const docs = this.loadDocumentation();
    
    // Extract categories (this is where we'd call an LLM)
    // For now, use pattern-based extraction
    const categories = this.extractCategoriesFromDocs(docs);
    
    // Save to cache
    const output = {
      timestamp: this.timestamp,
      source: 'pattern-extraction',
      categories: categories
    };
    
    fs.writeFileSync(this.files.categories, JSON.stringify(output, null, 2));
    console.log(`  ✓ Extracted ${categories.length} categories`);
    console.log(`  ✓ Saved to: ${this.files.categories}`);
    
    return categories;
  }

  /**
   * STAGE 2: Calculate Ideal Weights
   * Input: categories.json, documentation
   * Output: ideal-weights.json
   */
  async stage2_calculateIdealWeights(categories) {
    console.log('\n📋 STAGE 2: Calculate Ideal Weights (from docs)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const docs = this.loadDocumentation();
    const weights = {};
    
    // Count mentions of each category in documentation
    for (const category of categories) {
      weights[category] = this.calculateCategoryWeight(category, docs.join('\n'));
    }
    
    // Normalize weights to sum to 1
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    for (const cat of Object.keys(weights)) {
      weights[cat] = weights[cat] / (total || 1);
    }
    
    // Save output
    const output = {
      timestamp: this.timestamp,
      categories: categories,
      weights: weights,
      source: 'documentation-analysis'
    };
    
    fs.writeFileSync(this.files.idealWeights, JSON.stringify(output, null, 2));
    console.log('  ✓ Calculated ideal weights for ' + categories.length + ' categories');
    console.log('  ✓ Saved to: ' + this.files.idealWeights);
    
    return weights;
  }

  /**
   * STAGE 3: Calculate Real Weights
   * Input: categories.json, recent commits
   * Output: real-weights.json
   */
  async stage3_calculateRealWeights(categories) {
    console.log('\n🔨 STAGE 3: Calculate Real Weights (from commits)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const commits = this.getRecentCommits();
    const weights = {};
    
    // Initialize all categories
    for (const category of categories) {
      weights[category] = 0;
    }
    
    // Analyze each commit
    for (const commit of commits) {
      const commitCategories = this.categorizeCommit(commit, categories);
      for (const cat of commitCategories) {
        weights[cat] = (weights[cat] || 0) + 1;
      }
    }
    
    // Normalize
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    for (const cat of Object.keys(weights)) {
      weights[cat] = weights[cat] / (total || 1);
    }
    
    // Save output
    const output = {
      timestamp: this.timestamp,
      categories: categories,
      weights: weights,
      commitCount: commits.length,
      source: 'commit-analysis'
    };
    
    fs.writeFileSync(this.files.realWeights, JSON.stringify(output, null, 2));
    console.log('  ✓ Analyzed ' + commits.length + ' commits');
    console.log('  ✓ Saved to: ' + this.files.realWeights);
    
    return weights;
  }

  /**
   * STAGE 4: Build Trade-off Matrix
   * Input: ideal-weights.json, real-weights.json
   * Output: matrix.json
   */
  async stage4_buildMatrix(categories, idealWeights, realWeights) {
    console.log('\n🔲 STAGE 4: Build Trade-off Matrix');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const n = categories.length;
    const matrix = [];
    
    // Build N×N matrix
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        const real = realWeights[categories[i]] || 0;
        const ideal = idealWeights[categories[j]] || 0;
        
        const cell = {
          row: i,
          col: j,
          realCategory: categories[i],
          idealCategory: categories[j],
          realWeight: real,
          idealWeight: ideal,
          value: real * ideal, // Product shows alignment
          isDiagonal: i === j,
          isBlankSpot: (real * ideal) < 0.01 // Threshold for blank spot
        };
        
        row.push(cell);
      }
      matrix.push(row);
    }
    
    // Calculate statistics
    const stats = {
      size: n,
      diagonalSum: 0,
      blankSpots: 0,
      alignment: 0
    };
    
    for (let i = 0; i < n; i++) {
      if (matrix[i][i].isDiagonal) {
        stats.diagonalSum += matrix[i][i].value;
      }
      for (let j = 0; j < n; j++) {
        if (matrix[i][j].isBlankSpot) {
          stats.blankSpots++;
        }
      }
    }
    
    stats.alignment = stats.diagonalSum; // Sum of diagonal = overall alignment
    
    // Save output
    const output = {
      timestamp: this.timestamp,
      categories: categories,
      matrix: matrix,
      stats: stats
    };
    
    fs.writeFileSync(this.files.matrix, JSON.stringify(output, null, 2));
    console.log('  ✓ Built ' + n + '×' + n + ' matrix');
    console.log('  ✓ Alignment: ' + (stats.alignment * 100).toFixed(1) + '%');
    console.log('  ✓ Blank spots: ' + stats.blankSpots);
    console.log('  ✓ Saved to: ' + this.files.matrix);
    
    return { matrix, stats };
  }

  /**
   * STAGE 5: Detect Drift
   * Input: matrix.json
   * Output: drift.json
   */
  async stage5_detectDrift(matrix, stats, categories) {
    console.log('\n⚠️  STAGE 5: Detect Drift and Blank Spots');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const driftAnalysis = {
      critical: [],
      warning: [],
      aligned: [],
      neglected: []
    };
    
    // Analyze each cell
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        const cell = matrix[i][j];
        
        if (cell.isDiagonal) {
          // Diagonal cells show alignment
          if (cell.value > 0.1) {
            driftAnalysis.aligned.push({
              category: cell.realCategory,
              strength: cell.value,
              status: '🟢 ALIGNED'
            });
          } else if (cell.value > 0.05) {
            driftAnalysis.warning.push({
              category: cell.realCategory,
              strength: cell.value,
              status: '🟡 WEAK ALIGNMENT'
            });
          } else {
            driftAnalysis.critical.push({
              category: cell.realCategory,
              strength: cell.value,
              status: '🔴 DRIFT DETECTED'
            });
          }
        } else if (i < j && cell.isBlankSpot) {
          // Above diagonal: implementation holes
          driftAnalysis.neglected.push({
            ideal: cell.idealCategory,
            real: cell.realCategory,
            message: `${cell.idealCategory} is documented as important but not being worked on`
          });
        }
      }
    }
    
    // Calculate Trust Debt
    const trustDebt = Math.round(
      100 * (1 - stats.alignment) + // Base from misalignment
      10 * driftAnalysis.critical.length + // Penalty for critical drifts
      50 * (stats.blankSpots / (matrix.length * matrix.length)) // Penalty for blank spots
    );
    
    // Save output
    const output = {
      timestamp: this.timestamp,
      trustDebt: trustDebt,
      isInsurable: trustDebt < 300,
      trend: driftAnalysis.critical.length > 2 ? 'degrading' : 
             driftAnalysis.aligned.length > 3 ? 'improving' : 'stable',
      analysis: driftAnalysis,
      stats: stats,
      recommendations: this.generateRecommendations(driftAnalysis)
    };
    
    fs.writeFileSync(this.files.drift, JSON.stringify(output, null, 2));
    console.log('  ✓ Trust Debt: ' + trustDebt + ' units');
    console.log('  ✓ Critical drifts: ' + driftAnalysis.critical.length);
    console.log('  ✓ Aligned categories: ' + driftAnalysis.aligned.length);
    console.log('  ✓ Saved to: ' + this.files.drift);
    
    return output;
  }

  /**
   * STAGE 6: Generate Final Analysis
   * Combine all stages into final output
   */
  async stage6_generateFinalAnalysis() {
    console.log('\n✨ STAGE 6: Generate Final Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Load all intermediate data
    const categoriesData = JSON.parse(fs.readFileSync(this.files.categories, 'utf8'));
    const idealData = JSON.parse(fs.readFileSync(this.files.idealWeights, 'utf8'));
    const realData = JSON.parse(fs.readFileSync(this.files.realWeights, 'utf8'));
    const matrixData = JSON.parse(fs.readFileSync(this.files.matrix, 'utf8'));
    const driftData = JSON.parse(fs.readFileSync(this.files.drift, 'utf8'));
    
    // Get repository context
    const repoState = this.getRepoState();
    const commits = this.getRecentCommits();
    
    // Combine into final analysis
    const finalAnalysis = {
      timestamp: this.timestamp,
      version: '3.0-scaffold',
      
      // Categories extracted
      categories: categoriesData.categories,
      
      // Weights calculated
      weights: {
        ideal: idealData.weights,
        real: realData.weights
      },
      
      // Matrix generated
      matrix: {
        data: matrixData.matrix,
        stats: matrixData.stats
      },
      
      // Drift detected
      drift: driftData,
      
      // Trust Debt calculated
      analysis: {
        trustDebt: driftData.trustDebt,
        isInsurable: driftData.isInsurable,
        trend: driftData.trend,
        recommendations: driftData.recommendations
      },
      
      // Context
      repository: repoState,
      commits: commits,
      
      // Metadata
      metadata: {
        pipeline: 'scaffold',
        stages: ['categories', 'ideal-weights', 'real-weights', 'matrix', 'drift', 'final'],
        cacheDir: this.cacheDir
      }
    };
    
    // Save final output
    fs.writeFileSync(this.files.final, JSON.stringify(finalAnalysis, null, 2));
    console.log('  ✓ Final analysis generated');
    console.log('  ✓ Saved to: ' + this.files.final);
    
    // Also save for HTML generator compatibility
    this.saveForHTMLGenerator(finalAnalysis);
    
    return finalAnalysis;
  }

  /**
   * Save in format expected by HTML generator
   */
  saveForHTMLGenerator(analysis) {
    // Transform to expected format
    const htmlFormat = {
      ...analysis,
      analysis: {
        ...analysis.analysis,
        gaps: { trust: 0.15, timing: 0.10, recognition: 0.08 }, // Placeholder
        fim: { 
          skill: 75,
          environment: 80,
          momentum: Math.round(analysis.matrix.stats.alignment * 100),
          leverage: 2.5
        },
        insights: analysis.drift.analysis.critical.map(c => 
          `${c.category}: ${c.status}`
        ),
        predictions: {
          days7: analysis.analysis.trustDebt + 10,
          days30: analysis.analysis.trustDebt + 30,
          trajectory: analysis.analysis.trend
        },
        driftIndicators: analysis.drift.analysis.neglected.map(n => n.message)
      },
      intent: {
        vector: { trust: 0.35, timing: 0.35, recognition: 0.30 },
        source: 'CLAUDE.md',
        confidence: 0.85
      }
    };
    
    fs.writeFileSync(
      path.join(this.projectRoot, 'trust-debt-analysis.json'),
      JSON.stringify(htmlFormat, null, 2)
    );
  }

  // === HELPER METHODS ===

  loadDocumentation() {
    const docs = [];
    const files = [
      'CLAUDE.md',
      'README.md',
      'docs/01-business/strategy/BUSINESS_PLAN_LEAN_ONE_PAGER.md'
    ];
    
    for (const file of files) {
      const filepath = path.join(this.projectRoot, file);
      if (fs.existsSync(filepath)) {
        docs.push(fs.readFileSync(filepath, 'utf8'));
      }
    }
    
    return docs;
  }

  extractCategoriesFromDocs(docs) {
    // This is where we'd use an LLM
    // For now, extract based on common patterns
    const categories = new Set();
    const text = docs.join('\n').toLowerCase();
    
    // Look for repeated important concepts
    const patterns = [
      { pattern: /\b(trust|debt|reliability|quality)\b/g, category: 'Trust' },
      { pattern: /\b(timing|speed|performance|30.second)\b/g, category: 'Timing' },
      { pattern: /\b(recognition|insight|pattern|oh.moment)\b/g, category: 'Recognition' },
      { pattern: /\b(user|experience|ui|ux|interface)\b/g, category: 'UserExperience' },
      { pattern: /\b(security|auth|permission|access)\b/g, category: 'Security' },
      { pattern: /\b(data|database|storage|integrity)\b/g, category: 'DataManagement' },
      { pattern: /\b(test|testing|quality|coverage)\b/g, category: 'Testing' }
    ];
    
    for (const { pattern, category } of patterns) {
      const matches = text.match(pattern) || [];
      if (matches.length > 5) { // Only include if mentioned frequently
        categories.add(category);
      }
    }
    
    // Ensure we have 5-7 categories
    const result = Array.from(categories).slice(0, 7);
    
    // Add defaults if needed
    if (result.length < 5) {
      const defaults = ['Development', 'Documentation', 'Infrastructure'];
      for (const def of defaults) {
        if (result.length < 5 && !result.includes(def)) {
          result.push(def);
        }
      }
    }
    
    return result;
  }

  calculateCategoryWeight(category, text) {
    // Count mentions of category-related terms
    // Handle if category is an object or a string
    const categoryName = typeof category === 'object' ? category.name : category;
    const lowerCat = categoryName.toLowerCase();
    const pattern = new RegExp(`\\b${lowerCat}\\b`, 'gi');
    const matches = text.match(pattern) || [];
    return matches.length;
  }

  getRecentCommits() {
    const commits = [];
    
    try {
      const log = execSync(
        'git log --format="%H|%s|%b" --date=iso -10',
        { encoding: 'utf8' }
      );
      
      const lines = log.trim().split('\n').filter(l => l);
      
      for (const line of lines.slice(0, 5)) {
        const [hash, subject, body] = line.split('|');
        commits.push({
          hash: hash.substring(0, 7),
          subject,
          body: body || '',
          text: subject + ' ' + (body || '')
        });
      }
    } catch (error) {
      console.error('Error getting commits:', error.message);
    }
    
    return commits;
  }

  categorizeCommit(commit, categories) {
    const found = [];
    const text = commit.text.toLowerCase();
    
    for (const category of categories) {
      // Handle if category is an object or a string
      const categoryName = typeof category === 'object' ? category.name : category;
      const catLower = categoryName.toLowerCase();
      if (text.includes(catLower)) {
        found.push(categoryName);
      }
    }
    
    // If no matches, assign to first category
    if (found.length === 0 && categories.length > 0) {
      const firstCat = typeof categories[0] === 'object' ? categories[0].name : categories[0];
      found.push(firstCat);
    }
    
    return found;
  }

  getRepoState() {
    const state = {
      branch: 'main',
      status: 'clean',
      modifiedFiles: 0,
      specAge: 0,
      totalCommits: 0
    };
    
    try {
      state.branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      state.modifiedFiles = status.split('\n').filter(line => line.trim()).length;
      state.status = state.modifiedFiles === 0 ? 'clean' : `${state.modifiedFiles} modified`;
      state.totalCommits = parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim());
    } catch (error) {
      // Ignore errors
    }
    
    return state;
  }

  generateRecommendations(driftAnalysis) {
    const recs = [];
    
    if (driftAnalysis.critical.length > 0) {
      recs.push(`Focus immediately on: ${driftAnalysis.critical.map(c => c.category).join(', ')}`);
    }
    
    if (driftAnalysis.neglected.length > 0) {
      recs.push(`Address documented priorities: ${driftAnalysis.neglected[0].ideal}`);
    }
    
    if (driftAnalysis.aligned.length > 2) {
      recs.push(`Maintain alignment in: ${driftAnalysis.aligned.map(a => a.category).join(', ')}`);
    }
    
    return recs;
  }

  /**
   * Main execution - run all stages
   */
  async run() {
    console.log('🎯 Trust Debt Scaffold - Disciplined Data Pipeline');
    console.log('═══════════════════════════════════════════════════');
    console.log('Each stage produces JSON for the next stage');
    console.log('───────────────────────────────────────────────────\n');
    
    try {
      // Stage 1: Extract categories
      const categories = await this.stage1_extractCategories();
      
      // Stage 2: Calculate ideal weights
      const idealWeights = await this.stage2_calculateIdealWeights(categories);
      
      // Stage 3: Calculate real weights
      const realWeights = await this.stage3_calculateRealWeights(categories);
      
      // Stage 4: Build matrix
      const { matrix, stats } = await this.stage4_buildMatrix(
        categories,
        idealWeights,
        realWeights
      );
      
      // Stage 5: Detect drift
      const drift = await this.stage5_detectDrift(matrix, stats, categories);
      
      // Stage 6: Generate final analysis
      const finalAnalysis = await this.stage6_generateFinalAnalysis();
      
      console.log('\n═══════════════════════════════════════════════════');
      console.log('✅ SCAFFOLD PIPELINE COMPLETE');
      console.log('═══════════════════════════════════════════════════');
      console.log(`\n📊 Trust Debt: ${drift.trustDebt} units (${drift.trend})`);
      console.log(`🔲 Matrix Alignment: ${(stats.alignment * 100).toFixed(1)}%`);
      console.log(`⚠️  Drift Detected: ${drift.analysis.critical.length} critical categories`);
      console.log('\n📁 Output files:');
      console.log(`  • Categories: ${this.files.categories}`);
      console.log(`  • Ideal weights: ${this.files.idealWeights}`);
      console.log(`  • Real weights: ${this.files.realWeights}`);
      console.log(`  • Matrix: ${this.files.matrix}`);
      console.log(`  • Drift: ${this.files.drift}`);
      console.log(`  • Final: ${this.files.final}`);
      
      return finalAnalysis;
      
    } catch (error) {
      console.error('\n❌ Pipeline Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const scaffold = new TrustDebtScaffold();
  scaffold.run().catch(error => {
    console.error('Scaffold failed:', error);
    process.exit(1);
  });
}

module.exports = TrustDebtScaffold;