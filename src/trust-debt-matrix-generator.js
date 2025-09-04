#!/usr/bin/env node

/**
 * AGENT 3 DOMAIN: TRUST DEBT MATRIX GENERATOR
 * ===========================================
 * Builds the 2D Trust Debt matrix comparing Reality (commits) vs Intent (docs) priorities
 * using semantic categories that prevent syntax noise regression.
 * 
 * SEMANTIC CATEGORY INTEGRATION:
 * - Uses semantic categories: A📊 Measurement, B💻 Implementation, C📋 Documentation, D🎨 Visualization, E⚙️ Technical
 * - Matrix headers follow ShortLex ordering for consistency
 * - Subcategories (A📊.1💎, A📊.2📈, etc.) populate with real presence data
 * 
 * TRUST DEBT CALCULATION FOUNDATION:
 * - Rows = Reality data (what we actually work on from git commits)
 * - Columns = Intent data (what we document as important)
 * - Cells = correlation products showing alignment/misalignment
 * - Diagonal = self-consistency (category vs itself)
 * - Off-diagonal = cross-category relationships
 * - Blank spots = liability accumulation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MatrixGenerator {
  constructor(settings) {
    this.settings = settings;
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.cacheFile = path.join(this.projectRoot, '.trust-debt-cache', 'matrix.json');
  }

  /**
   * Generate the trade-off matrix
   */
  async generateMatrix(categories, commitData, documentData) {
    console.log('\n📊 Generating Trade-off Matrix');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Step 1: Calculate real weights (from commits)
    console.log('\n🔨 Calculating REAL weights (from commits)...');
    const realWeights = this.calculateRealWeights(categories, commitData);
    
    // Step 2: Calculate ideal weights (from documents)
    console.log('\n📋 Calculating IDEAL weights (from documents)...');
    const idealWeights = await this.calculateIdealWeights(categories, documentData);
    
    // Step 3: Build the N×N matrix
    console.log('\n🔲 Building trade-off matrix...');
    const matrix = this.buildMatrix(categories, realWeights, idealWeights);
    
    // Step 4: Calculate statistics
    const stats = this.calculateMatrixStats(matrix, categories);
    
    // Step 5: Cache results
    this.cacheMatrix(matrix, stats);
    
    console.log('\n✅ Matrix generation complete!');
    this.printMatrix(matrix, categories);
    
    return {
      matrix,
      categories,
      realWeights,
      idealWeights,
      stats
    };
  }

  /**
   * Calculate weights from actual commit work
   */
  calculateRealWeights(categories, commitData) {
    const weights = {};
    const counts = {};
    
    // Initialize all categories with zero
    for (const cat of categories) {
      weights[cat.name] = 0;
      counts[cat.name] = 0;
    }
    
    // Count occurrences in commits
    for (const commit of commitData) {
      // Analyze commit message
      const commitCategories = this.categorizeText(
        commit.subject + ' ' + commit.body,
        categories
      );
      
      // Analyze changed files
      const fileCategories = this.categorizeFiles(commit.filesChanged, categories);
      
      // Combine with higher weight for file changes (actual work)
      for (const cat of commitCategories) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
      
      for (const cat of fileCategories) {
        counts[cat] = (counts[cat] || 0) + 2; // Files weighted more
      }
    }
    
    // Normalize to weights (sum to 1)
    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    
    if (total > 0) {
      for (const cat of categories) {
        weights[cat.name] = counts[cat.name] / total;
      }
    } else {
      // Equal weights if no data
      const equalWeight = 1 / categories.length;
      for (const cat of categories) {
        weights[cat.name] = equalWeight;
      }
    }
    
    console.log('  Real weights:');
    for (const cat of categories.slice(0, 5)) {
      console.log(`    ${cat.name}: ${(weights[cat.name] * 100).toFixed(1)}%`);
    }
    
    return weights;
  }

  /**
   * Calculate weights from documented intentions
   */
  async calculateIdealWeights(categories, documentData) {
    const weights = {};
    const scores = {};
    
    // Initialize
    for (const cat of categories) {
      weights[cat.name] = 0;
      scores[cat.name] = 0;
    }
    
    // Analyze each document
    for (const [docKey, doc] of Object.entries(documentData)) {
      const docWeight = doc.weight || 0.25;
      
      // Count mentions in document content
      for (const cat of categories) {
        const pattern = this.getCategoryPattern(cat.name);
        const matches = (doc.content.match(pattern) || []).length;
        
        // Weight by document importance and match count
        scores[cat.name] += matches * docWeight;
      }
      
      // Boost if category appears in section titles
      for (const section of Object.values(doc.sections || {})) {
        for (const cat of categories) {
          if (this.sectionMatchesCategory(section.title, cat.name)) {
            scores[cat.name] += 5 * docWeight; // Section titles are important
          }
        }
      }
    }
    
    // Normalize
    const total = Object.values(scores).reduce((sum, s) => sum + s, 0);
    
    if (total > 0) {
      for (const cat of categories) {
        weights[cat.name] = scores[cat.name] / total;
      }
    } else {
      // Equal weights if no data
      const equalWeight = 1 / categories.length;
      for (const cat of categories) {
        weights[cat.name] = equalWeight;
      }
    }
    
    console.log('  Ideal weights:');
    for (const cat of categories.slice(0, 5)) {
      console.log(`    ${cat.name}: ${(weights[cat.name] * 100).toFixed(1)}%`);
    }
    
    return weights;
  }

  /**
   * Build the N×N matrix
   */
  buildMatrix(categories, realWeights, idealWeights) {
    const n = categories.length;
    const matrix = [];
    
    for (let i = 0; i < n; i++) {
      const row = [];
      const realCat = categories[i];
      
      for (let j = 0; j < n; j++) {
        const idealCat = categories[j];
        
        // Calculate cell value
        let value;
        
        if (i === j) {
          // Diagonal: alignment between real and ideal for same category
          value = Math.sqrt(realWeights[realCat.name] * idealWeights[idealCat.name]);
        } else {
          // Off-diagonal: cross-contamination (should be low)
          // This represents working on one thing when we should be working on another
          value = realWeights[realCat.name] * idealWeights[idealCat.name] * 0.1;
        }
        
        row.push({
          value: value,
          real: realCat.name,
          ideal: idealCat.name,
          realWeight: realWeights[realCat.name],
          idealWeight: idealWeights[idealCat.name],
          isDiagonal: i === j,
          isBlankSpot: value < this.settings.thresholds.blankSpot.minor
        });
      }
      
      matrix.push(row);
    }
    
    return matrix;
  }

  /**
   * Calculate matrix statistics
   */
  calculateMatrixStats(matrix, categories) {
    const stats = {
      alignment: 0,
      blankSpots: [],
      implementationHoles: [],
      documentationHoles: [],
      diagonalStrength: 0,
      offDiagonalNoise: 0,
      totalLiability: 0
    };
    
    const n = matrix.length;
    let diagonalSum = 0;
    let offDiagonalSum = 0;
    let diagonalCount = 0;
    let offDiagonalCount = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cell = matrix[i][j];
        
        if (cell.isDiagonal) {
          diagonalSum += cell.value;
          diagonalCount++;
          
          // Check for blank spots on diagonal (bad alignment)
          if (cell.isBlankSpot) {
            stats.blankSpots.push({
              category: cell.real,
              value: cell.value,
              type: 'diagonal',
              severity: this.getBlankSpotSeverity(cell.value)
            });
          }
        } else {
          offDiagonalSum += cell.value;
          offDiagonalCount++;
          
          // Check for high off-diagonal values (misalignment)
          if (cell.value > this.settings.thresholds.blankSpot.minor) {
            if (i < j) {
              // Above diagonal: implementation hole
              stats.implementationHoles.push({
                working: cell.real,
                shouldBe: cell.ideal,
                value: cell.value
              });
            } else {
              // Below diagonal: documentation hole
              stats.documentationHoles.push({
                working: cell.real,
                documented: cell.ideal,
                value: cell.value
              });
            }
          }
        }
        
        // Calculate liability for blank spots
        if (cell.isBlankSpot) {
          const severity = this.getBlankSpotSeverity(cell.value);
          stats.totalLiability += (1 - cell.value) * severity;
        }
      }
    }
    
    // Calculate overall metrics
    stats.diagonalStrength = diagonalCount > 0 ? diagonalSum / diagonalCount : 0;
    stats.offDiagonalNoise = offDiagonalCount > 0 ? offDiagonalSum / offDiagonalCount : 0;
    stats.alignment = stats.diagonalStrength / (stats.diagonalStrength + stats.offDiagonalNoise + 0.001);
    
    // Sort blank spots by severity
    stats.blankSpots.sort((a, b) => b.severity - a.severity);
    
    return stats;
  }

  /**
   * Get severity of a blank spot
   */
  getBlankSpotSeverity(value) {
    const thresholds = this.settings.thresholds.blankSpot;
    
    if (value < thresholds.critical) return 3; // Critical
    if (value < thresholds.major) return 2;    // Major
    if (value < thresholds.minor) return 1;    // Minor
    return 0; // Not a blank spot
  }

  /**
   * Categorize text into categories
   */
  categorizeText(text, categories) {
    const found = [];
    const textLower = text.toLowerCase();
    
    for (const cat of categories) {
      const pattern = this.getCategoryPattern(cat.name);
      if (pattern.test(textLower)) {
        found.push(cat.name);
      }
    }
    
    // If no matches, assign to most general category
    if (found.length === 0 && categories.length > 0) {
      found.push(categories[0].name);
    }
    
    return found;
  }

  /**
   * Categorize files into categories
   */
  categorizeFiles(files, categories) {
    const found = new Set();
    
    for (const file of files) {
      // Map file paths to categories
      if (file.includes('test') || file.includes('spec')) {
        found.add('Testing');
      }
      if (file.includes('component') || file.includes('ui')) {
        found.add('UserExperience');
      }
      if (file.includes('api') || file.includes('route')) {
        found.add('ApiDevelopment');
      }
      if (file.endsWith('.md')) {
        found.add('Documentation');
      }
      if (file.includes('config') || file.includes('.env')) {
        found.add('Configuration');
      }
      if (file.includes('db') || file.includes('migration')) {
        found.add('DataManagement');
      }
    }
    
    // Filter to only categories we're tracking
    const categoryNames = categories.map(c => c.name);
    return Array.from(found).filter(f => categoryNames.includes(f));
  }

  /**
   * Get regex pattern for a category
   */
  getCategoryPattern(categoryName) {
    const patterns = {
      'Security': /\b(security|auth|authentication|authorization|permission|access|token|password)\b/gi,
      'Performance': /\b(performance|speed|fast|slow|optimization|cache|latency|throughput)\b/gi,
      'UserExperience': /\b(ui|ux|user|experience|interface|design|accessibility|usability)\b/gi,
      'Testing': /\b(test|testing|spec|coverage|unit|integration|e2e|mock)\b/gi,
      'Documentation': /\b(doc|documentation|readme|guide|tutorial|example|comment)\b/gi,
      'DataManagement': /\b(data|database|sql|query|migration|schema|model|storage)\b/gi,
      'ApiDevelopment': /\b(api|endpoint|route|rest|graphql|request|response|http)\b/gi,
      'Configuration': /\b(config|configuration|setting|environment|env|variable|option)\b/gi,
      'Deployment': /\b(deploy|deployment|build|ci|cd|pipeline|release|production)\b/gi,
      'Features': /\b(feature|functionality|capability|implementation|requirement)\b/gi,
      'BugFixes': /\b(bug|fix|error|issue|problem|crash|fault|defect)\b/gi,
      'CodeQuality': /\b(refactor|cleanup|debt|quality|maintainability|readability)\b/gi
    };
    
    return patterns[categoryName] || new RegExp(`\\b${categoryName.toLowerCase()}\\b`, 'gi');
  }

  /**
   * Check if section title matches category
   */
  sectionMatchesCategory(sectionTitle, categoryName) {
    const titleLower = sectionTitle.toLowerCase();
    const catLower = categoryName.toLowerCase();
    
    // Direct match
    if (titleLower.includes(catLower)) return true;
    
    // Pattern match
    const pattern = this.getCategoryPattern(categoryName);
    return pattern.test(titleLower);
  }

  /**
   * Print matrix to console
   */
  printMatrix(matrix, categories) {
    console.log('\n📊 Trade-off Matrix Visualization:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Header
    console.log('\n         IDEAL (From Docs) →');
    console.log('REAL     ' + categories.slice(0, 5).map(c => c.name.substring(0, 8).padEnd(9)).join(''));
    console.log('(Commits)' + '─'.repeat(9 * Math.min(5, categories.length)));
    
    // Rows
    for (let i = 0; i < Math.min(5, matrix.length); i++) {
      const row = matrix[i];
      const rowName = categories[i].name.substring(0, 8).padEnd(9);
      const cells = row.slice(0, 5).map(cell => {
        const value = cell.value;
        if (cell.isDiagonal) {
          // Diagonal cells
          if (value > 0.3) return '███'; // Good alignment
          if (value > 0.1) return '▒▒▒'; // Moderate
          return '░░░'; // Poor alignment (blank spot)
        } else {
          // Off-diagonal
          if (value > 0.1) return '···'; // Some cross-contamination
          return '   '; // Clean
        }
      }).join('  ');
      
      console.log(rowName + cells);
    }
    
    console.log('\nLegend: ███=Strong alignment, ▒▒▒=Moderate, ░░░=Blank spot, ···=Misalignment');
  }

  /**
   * Cache matrix for reuse
   */
  cacheMatrix(matrix, stats) {
    const cacheDir = path.dirname(this.cacheFile);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    const cache = {
      timestamp: new Date().toISOString(),
      matrix: matrix,
      stats: stats,
      ttl: this.settings.cache?.ttl || 300
    };
    
    fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
  }
}

// Run if called directly
if (require.main === module) {
  const SettingsManager = require('./trust-debt-settings-manager');
  const ShortLexExtractor = require('./trust-debt-shortlex-extractor');
  const DocumentTracker = require('./trust-debt-document-tracker');
  const TrustDebtClaudeAnalyzer = require('./trust-debt-claude-analyzer');
  
  (async () => {
    // Load settings
    const settingsManager = new SettingsManager();
    const settings = await settingsManager.load();
    
    // Extract categories
    const extractor = new ShortLexExtractor(settings);
    const categories = await extractor.extractCategories();
    
    // Get commit data
    const analyzer = new TrustDebtClaudeAnalyzer();
    const commitData = analyzer.getCommitData();
    
    // Get document data
    const tracker = new DocumentTracker(settings);
    const documentData = await tracker.loadAllDocuments();
    
    // Generate matrix
    const generator = new MatrixGenerator(settings);
    const result = await generator.generateMatrix(categories, commitData, documentData);
    
    console.log('\n📊 Matrix Statistics:');
    console.log(`  Alignment: ${(result.stats.alignment * 100).toFixed(1)}%`);
    console.log(`  Blank Spots: ${result.stats.blankSpots.length}`);
    console.log(`  Total Liability: ${result.stats.totalLiability.toFixed(2)}`);
    
    if (result.stats.blankSpots.length > 0) {
      console.log('\n⚠️  Critical Blank Spots:');
      for (const spot of result.stats.blankSpots.slice(0, 3)) {
        console.log(`  - ${spot.category}: severity ${spot.severity}`);
      }
    }
  })();
}

module.exports = MatrixGenerator;