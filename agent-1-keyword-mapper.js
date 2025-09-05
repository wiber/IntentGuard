#!/usr/bin/env node

/**
 * Agent 1: Enhanced Keyword Mapper for 45-Category System
 * =====================================================
 * Maps keywords from Intent (/docs) and Reality (/src) to exact 45 categories
 * Addresses the critical keyword detection issue in pipeline
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');

class Agent1KeywordMapper {
  constructor() {
    this.db = new Database('trust-debt-pipeline.db');
    this.projectRoot = process.cwd();
    
    // Enhanced keyword mapping to 45 categories
    this.categoryKeywords = {
      // A🚀 CoreEngine and children (1-13)
      1: ['core', 'engine', 'system', 'framework', 'foundation', 'architecture'],
      6: ['algorithm', 'computational', 'logic', 'calculation', 'processing', 'compute'],
      7: ['metrics', 'measurement', 'score', 'grade', 'statistics', 'analytics'],
      8: ['analysis', 'analyzer', 'examination', 'evaluation', 'assessment', 'investigate'],
      9: ['detection', 'detector', 'scanning', 'identification', 'discovery', 'find'],
      10: ['scanning', 'scan', 'search', 'inspection', 'review', 'audit'],
      11: ['processing', 'process', 'execution', 'runtime', 'operation', 'handle'],
      12: ['architecture', 'design', 'structure', 'blueprint', 'pattern', 'model'],
      13: ['validation', 'validator', 'verification', 'check', 'test', 'validate'],

      // B🔒 Documentation and children (2, 14-21)
      2: ['documentation', 'docs', 'document', 'manual', 'guide', 'reference'],
      14: ['specification', 'spec', 'requirements', 'standard', 'protocol', 'define'],
      15: ['guide', 'tutorial', 'walkthrough', 'instruction', 'how-to', 'help'],
      16: ['reference', 'api', 'documentation', 'lookup', 'index', 'catalog'],
      17: ['example', 'sample', 'demo', 'illustration', 'showcase', 'template'],
      18: ['tutorial', 'lesson', 'course', 'training', 'learning', 'education'],
      19: ['api', 'interface', 'endpoint', 'method', 'function', 'service'],
      20: ['research', 'study', 'investigation', 'analysis', 'exploration', 'discovery'],
      21: ['standards', 'convention', 'best-practice', 'guideline', 'policy', 'rule'],

      // C💨 Visualization and children (3, 22-29)
      3: ['visualization', 'visual', 'display', 'render', 'show', 'present'],
      22: ['report', 'reporting', 'output', 'summary', 'results', 'findings'],
      23: ['chart', 'graph', 'plot', 'diagram', 'visualization', 'data-viz'],
      24: ['interface', 'ui', 'user-interface', 'frontend', 'view', 'screen'],
      25: ['display', 'show', 'render', 'present', 'output', 'screen'],
      26: ['styling', 'style', 'css', 'design', 'appearance', 'theme'],
      27: ['animation', 'animate', 'transition', 'motion', 'effect', 'dynamic'],
      28: ['interactive', 'interaction', 'user-input', 'click', 'hover', 'event'],
      29: ['theming', 'theme', 'color', 'palette', 'branding', 'appearance'],

      // D🧠 Integration and children (4, 30-37)
      4: ['integration', 'integrate', 'combine', 'merge', 'connect', 'link'],
      30: ['cli', 'command-line', 'terminal', 'console', 'bash', 'shell'],
      31: ['package', 'npm', 'module', 'library', 'dependency', 'import'],
      32: ['config', 'configuration', 'settings', 'options', 'preferences', 'env'],
      33: ['export', 'output', 'generate', 'produce', 'create', 'build'],
      34: ['api', 'rest', 'endpoint', 'service', 'web-service', 'http'],
      35: ['pipeline', 'workflow', 'process', 'flow', 'chain', 'sequence'],
      36: ['deploy', 'deployment', 'release', 'publish', 'distribute', 'ship'],
      37: ['security', 'secure', 'authentication', 'authorization', 'permission', 'access'],

      // E🎨 BusinessLayer and children (5, 38-45)
      5: ['business', 'enterprise', 'commercial', 'market', 'industry', 'company'],
      38: ['strategy', 'strategic', 'planning', 'vision', 'mission', 'objective'],
      39: ['planning', 'plan', 'roadmap', 'schedule', 'timeline', 'milestone'],
      40: ['marketing', 'promotion', 'branding', 'advertising', 'campaign', 'outreach'],
      41: ['enterprise', 'corporate', 'business', 'organization', 'company', 'firm'],
      42: ['sales', 'selling', 'revenue', 'income', 'profit', 'customer'],
      43: ['growth', 'scale', 'expansion', 'development', 'increase', 'progress'],
      44: ['operations', 'ops', 'operational', 'management', 'administration', 'workflow'],
      45: ['success', 'achievement', 'goal', 'target', 'objective', 'milestone']
    };

    // Trust Debt specific patterns
    this.trustDebtPatterns = {
      trustDebt: /\b(trust[-\s]?debt|drift|alignment|asymmetry|orthogonal|matrix|shortlex)\b/gi,
      measurement: /\b(measurement|metric|score|grade|calculation|formula|multiplier)\b/gi,
      analysis: /\b(analysis|analyzer|cold[-\s]?spot|blind[-\s]?spot|pattern|detector)\b/gi,
      categories: /\b(categor[y|ies]|classification|taxonomy|orthogonal|semantic|cluster)\b/gi,
      timeline: /\b(timeline|evolution|history|commit|tracking|progression|development)\b/gi,
      implementation: /\b(implementation|reality|actual|code|function|class|module|execute)\b/gi,
      specification: /\b(specification|intent|documentation|readme|design|planning|requirement)\b/gi,
      pipeline: /\b(pipeline|agent|stage|bucket|validation|orchestrat[e|ion]|coordination)\b/gi
    };
  }

  /**
   * Main execution function
   */
  async execute() {
    console.log('🔍 Agent 1: Enhanced Keyword Mapper Starting...');
    console.log('═══════════════════════════════════════════════');
    
    // Clear existing data
    await this.clearExistingData();
    
    // Extract Intent keywords from /docs
    const intentStats = await this.extractIntentKeywords();
    console.log(`📚 Intent: Processed ${intentStats.files} files, found ${intentStats.keywords} unique keywords`);
    
    // Extract Reality keywords from /src  
    const realityStats = await this.extractRealityKeywords();
    console.log(`💻 Reality: Processed ${realityStats.files} files, found ${realityStats.keywords} unique keywords`);
    
    // Populate keyword index with category mappings
    await this.populateKeywordIndex();
    
    // Generate statistics
    const stats = await this.generateStatistics();
    console.log('\n📊 Final Statistics:');
    console.log(`   Total unique keywords: ${stats.totalKeywords}`);
    console.log(`   Keywords mapped to categories: ${stats.mappedKeywords}`);
    console.log(`   Categories with keywords: ${stats.categoriesWithKeywords}/45`);
    
    this.db.close();
    
    return stats;
  }

  /**
   * Clear existing keyword data
   */
  async clearExistingData() {
    this.db.prepare('DELETE FROM keyword_index').run();
    this.db.prepare('DELETE FROM intent_data').run();
    this.db.prepare('DELETE FROM reality_data').run();
  }

  /**
   * Extract keywords from documentation (/docs - Intent)
   */
  async extractIntentKeywords() {
    const docFiles = await this.findFiles(path.join(this.projectRoot, 'docs'), /\.(md|txt|rst)$/i);
    let totalKeywords = new Set();
    
    for (const filePath of docFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const keywords = this.extractKeywordsFromContent(content, 'intent');
        
        // Store in intent_data table
        const stmt = this.db.prepare(`
          INSERT INTO intent_data (category_id, source_file, file_path, content, keyword_matches, weight)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        // Map to categories and store
        for (const [categoryId, categoryKeywords] of Object.entries(keywords)) {
          if (categoryKeywords.length > 0) {
            stmt.run(
              parseInt(categoryId),
              path.basename(filePath),
              filePath,
              content.substring(0, 1000), // Truncate content
              JSON.stringify(categoryKeywords),
              categoryKeywords.length
            );
            categoryKeywords.forEach(k => totalKeywords.add(k));
          }
        }
        
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
      }
    }
    
    return {
      files: docFiles.length,
      keywords: totalKeywords.size
    };
  }

  /**
   * Extract keywords from source code (/src - Reality)
   */
  async extractRealityKeywords() {
    const srcFiles = await this.findFiles(path.join(this.projectRoot, 'src'), /\.(js|ts|json)$/i);
    let totalKeywords = new Set();
    
    for (const filePath of srcFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const keywords = this.extractKeywordsFromContent(content, 'reality');
        
        // Get git hash for this file
        let gitHash = null;
        try {
          gitHash = execSync(`git log -1 --format="%H" -- "${filePath}"`, { encoding: 'utf8' }).trim();
        } catch (e) {
          // File might not be in git
        }
        
        // Store in reality_data table
        const stmt = this.db.prepare(`
          INSERT INTO reality_data (category_id, source_file, file_path, git_hash, content, keyword_matches, weight)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        // Map to categories and store
        for (const [categoryId, categoryKeywords] of Object.entries(keywords)) {
          if (categoryKeywords.length > 0) {
            stmt.run(
              parseInt(categoryId),
              path.basename(filePath),
              filePath,
              gitHash,
              content.substring(0, 1000), // Truncate content
              JSON.stringify(categoryKeywords),
              categoryKeywords.length
            );
            categoryKeywords.forEach(k => totalKeywords.add(k));
          }
        }
        
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
      }
    }
    
    return {
      files: srcFiles.length,
      keywords: totalKeywords.size
    };
  }

  /**
   * Extract keywords from content and map to categories
   */
  extractKeywordsFromContent(content, type) {
    const normalizedContent = content.toLowerCase();
    const categoryMatches = {};
    
    // Initialize all categories
    for (const categoryId of Object.keys(this.categoryKeywords)) {
      categoryMatches[categoryId] = [];
    }
    
    // Map keywords to categories
    for (const [categoryId, keywords] of Object.entries(this.categoryKeywords)) {
      for (const keyword of keywords) {
        const pattern = new RegExp(`\\b${keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
        const matches = normalizedContent.match(pattern) || [];
        if (matches.length > 0) {
          categoryMatches[categoryId].push(...matches.map(m => m.toLowerCase()));
        }
      }
    }
    
    // Also check Trust Debt specific patterns
    for (const [patternName, pattern] of Object.entries(this.trustDebtPatterns)) {
      const matches = normalizedContent.match(pattern) || [];
      if (matches.length > 0) {
        // Map trust debt patterns to relevant categories
        const relevantCategories = this.mapTrustDebtPatternToCategories(patternName);
        for (const catId of relevantCategories) {
          if (categoryMatches[catId]) {
            categoryMatches[catId].push(...matches.map(m => m.toLowerCase()));
          }
        }
      }
    }
    
    // Remove duplicates and empty arrays
    for (const categoryId of Object.keys(categoryMatches)) {
      categoryMatches[categoryId] = [...new Set(categoryMatches[categoryId])];
    }
    
    return categoryMatches;
  }

  /**
   * Map Trust Debt patterns to relevant categories
   */
  mapTrustDebtPatternToCategories(patternName) {
    const mappings = {
      trustDebt: [1, 7, 8], // CoreEngine, Metrics, Analysis
      measurement: [7, 8, 13], // Metrics, Analysis, Validation
      analysis: [8, 9, 20], // Analysis, Detection, Research
      categories: [8, 21, 23], // Analysis, Standards, Charts
      timeline: [22, 36, 43], // Reports, Deploy, Growth
      implementation: [6, 11, 35], // Algorithm, Processing, Pipeline
      specification: [14, 15, 21], // Specifications, Guides, Standards
      pipeline: [35, 36, 44] // Pipeline, Deploy, Operations
    };
    
    return mappings[patternName] || [];
  }

  /**
   * Populate the keyword_index table
   */
  async populateKeywordIndex() {
    console.log('📊 Populating keyword index...');
    
    // Get all unique keywords from both intent and reality data
    const intentKeywords = this.db.prepare(`
      SELECT category_id, keyword_matches, COUNT(*) as file_count
      FROM intent_data 
      WHERE keyword_matches IS NOT NULL AND keyword_matches != '[]'
      GROUP BY category_id, keyword_matches
    `).all();
    
    const realityKeywords = this.db.prepare(`
      SELECT category_id, keyword_matches, COUNT(*) as file_count  
      FROM reality_data
      WHERE keyword_matches IS NOT NULL AND keyword_matches != '[]'
      GROUP BY category_id, keyword_matches
    `).all();
    
    const keywordMap = new Map();
    
    // Process intent keywords
    for (const row of intentKeywords) {
      const keywords = JSON.parse(row.keyword_matches);
      for (const keyword of keywords) {
        const key = `${keyword}:${row.category_id}`;
        const existing = keywordMap.get(key) || { keyword, category_id: row.category_id, intent_count: 0, reality_count: 0 };
        existing.intent_count += row.file_count;
        keywordMap.set(key, existing);
      }
    }
    
    // Process reality keywords
    for (const row of realityKeywords) {
      const keywords = JSON.parse(row.keyword_matches);
      for (const keyword of keywords) {
        const key = `${keyword}:${row.category_id}`;
        const existing = keywordMap.get(key) || { keyword, category_id: row.category_id, intent_count: 0, reality_count: 0 };
        existing.reality_count += row.file_count;
        keywordMap.set(key, existing);
      }
    }
    
    // Insert into keyword_index
    const stmt = this.db.prepare(`
      INSERT INTO keyword_index (keyword, category_id, intent_count, reality_count, frequency, weight)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const data of keywordMap.values()) {
      const frequency = data.intent_count + data.reality_count;
      const weight = frequency > 5 ? 2.0 : frequency > 2 ? 1.5 : 1.0;
      
      stmt.run(
        data.keyword,
        data.category_id,
        data.intent_count,
        data.reality_count,
        frequency,
        weight
      );
    }
    
    console.log(`✅ Indexed ${keywordMap.size} keyword-category mappings`);
  }

  /**
   * Generate final statistics
   */
  async generateStatistics() {
    const totalKeywords = this.db.prepare('SELECT COUNT(DISTINCT keyword) as count FROM keyword_index').get().count;
    const mappedKeywords = this.db.prepare('SELECT COUNT(*) as count FROM keyword_index').get().count;
    const categoriesWithKeywords = this.db.prepare('SELECT COUNT(DISTINCT category_id) as count FROM keyword_index').get().count;
    
    return {
      totalKeywords,
      mappedKeywords,
      categoriesWithKeywords
    };
  }

  /**
   * Find files matching pattern in directory
   */
  async findFiles(dir, pattern) {
    const files = [];
    
    async function scan(directory) {
      try {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(directory, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scan(fullPath);
          } else if (entry.isFile() && pattern.test(entry.name)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Directory might not exist or be accessible
      }
    }
    
    await scan(dir);
    return files;
  }
}

// Execute if called directly
if (require.main === module) {
  (async () => {
    try {
      const mapper = new Agent1KeywordMapper();
      await mapper.execute();
      console.log('✅ Agent 1 keyword mapping complete!');
    } catch (error) {
      console.error('❌ Agent 1 failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = Agent1KeywordMapper;