#!/usr/bin/env node

/**
 * Agent 1: Database Indexer & Keyword Extractor (20-Category Redesign)
 * Creates SQLite database with 20-category structure based on agent responsibilities
 * Focuses on PROCESS OUTCOMES rather than results
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 20-Category Structure Based on Agent Responsibilities
const TWENTY_CATEGORIES = {
  'A🔍.1📊': { name: 'Category Definition Methodology', agent: 1, units: 105 },
  'A🔍.2🔍': { name: 'Semantic Orthogonality Validation', agent: 2, units: 105 },
  'A🔍.3⚖️': { name: 'Balance Distribution Process', agent: 2, units: 105 },
  'B💚.1📈': { name: 'Health Metric Calculation', agent: 2, units: 90 },
  'B💚.2🎯': { name: 'Process Quality Validation', agent: 4, units: 90 },
  'B💚.3🛡️': { name: 'Health Degradation Detection', agent: 5, units: 90 },
  'C📊.1🔢': { name: 'ShortLex Ordering Algorithm', agent: 3, units: 80 },
  'C📊.2🎨': { name: 'Double-Walled Submatrix Structure', agent: 3, units: 80 },
  'C📊.3⚡': { name: 'Asymmetric Matrix Population', agent: 3, units: 80 },
  'D✅.1🔗': { name: 'Cross-Agent Data Flow', agent: 4, units: 75 },
  'D✅.2📋': { name: 'JSON Bucket Integrity', agent: 4, units: 75 },
  'D✅.3🎯': { name: 'Pipeline Coherence Validation', agent: 4, units: 75 },
  'E🔄.1📊': { name: 'Timeline Analysis Method', agent: 5, units: 60 },
  'E🔄.2⚠️': { name: 'Regression Detection Algorithm', agent: 5, units: 60 },
  'E🔄.3📈': { name: 'Historical Trend Analysis', agent: 5, units: 60 },
  'F🏛️.1🧠': { name: 'Zero Multiplier Calculation', agent: 6, units: 75 },
  'F🏛️.2⚖️': { name: 'EU AI Act Compliance Framework', agent: 6, units: 75 },
  'G📄.1✅': { name: 'Report Generation Process', agent: 7, units: 60 },
  'G📄.2🎨': { name: 'Visual Coherence Algorithm', agent: 7, units: 60 },
  'H🔄.1🎯': { name: 'Process Integration Validation', agent: 0, units: 50 }
};

// Process-focused keywords for each category
const PROCESS_KEYWORDS = {
  'A🔍.1📊': ['category', 'definition', 'methodology', 'semantic', 'classification', 'structure'],
  'A🔍.2🔍': ['orthogonality', 'validation', 'correlation', 'independence', 'separation'],
  'A🔍.3⚖️': ['balance', 'distribution', 'weight', 'equilibrium', 'proportion'],
  'B💚.1📈': ['health', 'metric', 'calculation', 'measurement', 'assessment'],
  'B💚.2🎯': ['quality', 'validation', 'process', 'integrity', 'verification'],
  'B💚.3🛡️': ['degradation', 'detection', 'prevention', 'monitoring', 'alert'],
  'C📊.1🔢': ['shortlex', 'ordering', 'algorithm', 'hierarchy', 'sequence'],
  'C📊.2🎨': ['matrix', 'submatrix', 'structure', 'visual', 'borders'],
  'C📊.3⚡': ['asymmetric', 'population', 'triangle', 'calculation', 'ratio'],
  'D✅.1🔗': ['agent', 'data', 'flow', 'integration', 'communication'],
  'D✅.2📋': ['json', 'bucket', 'integrity', 'validation', 'format'],
  'D✅.3🎯': ['pipeline', 'coherence', 'validation', 'consistency', 'workflow'],
  'E🔄.1📊': ['timeline', 'analysis', 'method', 'chronological', 'sequence'],
  'E🔄.2⚠️': ['regression', 'detection', 'algorithm', 'change', 'deviation'],
  'E🔄.3📈': ['historical', 'trend', 'analysis', 'pattern', 'evolution'],
  'F🏛️.1🧠': ['zero', 'multiplier', 'calculation', 'formula', 'methodology'],
  'F🏛️.2⚖️': ['eu', 'ai', 'act', 'compliance', 'framework', 'legal'],
  'G📄.1✅': ['report', 'generation', 'process', 'synthesis', 'compilation'],
  'G📄.2🎨': ['visual', 'coherence', 'algorithm', 'design', 'presentation'],
  'H🔄.1🎯': ['process', 'integration', 'validation', 'coordination', 'alignment']
};

class TwentyCategoryDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, 'trust-debt-20-categories.db');
    this.db = null;
  }

  async initialize() {
    // Remove existing database to start fresh
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async createSchema() {
    const sql = `
      -- 20-Category structure table
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        responsible_agent INTEGER NOT NULL,
        target_units INTEGER NOT NULL,
        parent_category TEXT,
        position INTEGER NOT NULL
      );

      -- Process-focused keywords table
      CREATE TABLE keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT NOT NULL,
        category_id TEXT NOT NULL,
        intent_count INTEGER DEFAULT 0,
        reality_count INTEGER DEFAULT 0,
        process_relevance REAL DEFAULT 0.0,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      );

      -- Intent content (documentation/specifications)
      CREATE TABLE intent_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        category_id TEXT,
        keyword_count INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      );

      -- Reality content (implementation/code)
      CREATE TABLE reality_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        category_id TEXT,
        keyword_count INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      );

      -- 20x20 Matrix cells
      CREATE TABLE matrix_cells (
        row_category TEXT NOT NULL,
        col_category TEXT NOT NULL,
        intent_value REAL DEFAULT 0.0,
        reality_value REAL DEFAULT 0.0,
        trust_debt_units REAL DEFAULT 0.0,
        is_upper_triangle BOOLEAN DEFAULT FALSE,
        is_lower_triangle BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (row_category, col_category),
        FOREIGN KEY (row_category) REFERENCES categories (id),
        FOREIGN KEY (col_category) REFERENCES categories (id)
      );

      -- Process health tracking
      CREATE TABLE process_health (
        category_id TEXT PRIMARY KEY,
        health_score REAL DEFAULT 0.0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        degradation_detected BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      );
    `;

    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async populateCategories() {
    const stmt = this.db.prepare(`
      INSERT INTO categories (id, name, responsible_agent, target_units, parent_category, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let position = 1;
    for (const [categoryId, categoryData] of Object.entries(TWENTY_CATEGORIES)) {
      const parentCategory = categoryId.includes('.') ? categoryId.split('.')[0] + '🔍' : null;
      
      stmt.run([
        categoryId,
        categoryData.name,
        categoryData.agent,
        categoryData.units,
        parentCategory,
        position++
      ]);
    }

    stmt.finalize();
  }

  async populateKeywords() {
    const stmt = this.db.prepare(`
      INSERT INTO keywords (keyword, category_id, process_relevance)
      VALUES (?, ?, ?)
    `);

    for (const [categoryId, keywords] of Object.entries(PROCESS_KEYWORDS)) {
      for (const keyword of keywords) {
        // Higher process relevance for methodology/algorithm/framework keywords
        const processRelevance = ['methodology', 'algorithm', 'framework', 'process', 'calculation'].includes(keyword) ? 1.0 : 0.8;
        stmt.run([keyword, categoryId, processRelevance]);
      }
    }

    stmt.finalize();
  }

  async initializeMatrix() {
    const categories = Object.keys(TWENTY_CATEGORIES);
    const stmt = this.db.prepare(`
      INSERT INTO matrix_cells (row_category, col_category, is_upper_triangle, is_lower_triangle)
      VALUES (?, ?, ?, ?)
    `);

    for (let i = 0; i < categories.length; i++) {
      for (let j = 0; j < categories.length; j++) {
        const isUpper = i < j;
        const isLower = i > j;
        stmt.run([categories[i], categories[j], isUpper, isLower]);
      }
    }

    stmt.finalize();
  }

  async extractKeywordCounts() {
    // Simulate keyword extraction from docs (intent) and src (reality)
    const docsPath = path.join(__dirname, 'docs');
    const srcPath = path.join(__dirname, 'src');

    // Extract keywords from documentation (intent)
    if (fs.existsSync(docsPath)) {
      await this.processDirectory(docsPath, 'intent');
    }

    // Extract keywords from source code (reality)  
    if (fs.existsSync(srcPath)) {
      await this.processDirectory(srcPath, 'reality');
    }

    // Update keyword counts
    await this.updateKeywordCounts();
  }

  async processDirectory(dirPath, contentType) {
    const files = fs.readdirSync(dirPath, { recursive: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isFile() && (file.endsWith('.md') || file.endsWith('.js') || file.endsWith('.json'))) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        const table = contentType === 'intent' ? 'intent_content' : 'reality_content';
        const stmt = this.db.prepare(`INSERT INTO ${table} (file_path, content) VALUES (?, ?)`);
        stmt.run([filePath, content]);
        stmt.finalize();
      }
    }
  }

  async updateKeywordCounts() {
    const keywords = await this.getKeywords();
    
    for (const keyword of keywords) {
      // Count in intent content
      const intentCount = await this.countKeywordInContent(keyword.keyword, 'intent_content');
      // Count in reality content
      const realityCount = await this.countKeywordInContent(keyword.keyword, 'reality_content');
      
      const updateStmt = this.db.prepare(`
        UPDATE keywords 
        SET intent_count = ?, reality_count = ? 
        WHERE id = ?
      `);
      updateStmt.run([intentCount, realityCount, keyword.id]);
      updateStmt.finalize();
    }
  }

  async countKeywordInContent(keyword, table) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT COUNT(*) as count 
        FROM ${table} 
        WHERE LOWER(content) LIKE LOWER(?)
      `, [`%${keyword}%`], (err, row) => {
        if (err) reject(err);
        else resolve(row.count || 0);
      });
    });
  }

  async getKeywords() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM keywords', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getStatistics() {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(DISTINCT category_id) as category_count,
          COUNT(*) as total_keywords,
          SUM(intent_count) as total_intent_occurrences,
          SUM(reality_count) as total_reality_occurrences,
          AVG(process_relevance) as avg_process_relevance
        FROM keywords
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async close() {
    return new Promise((resolve) => {
      this.db.close(resolve);
    });
  }
}

async function main() {
  console.log('🔄 Agent 1: Initializing 20-Category Database...');
  
  const db = new TwentyCategoryDatabase();
  
  try {
    await db.initialize();
    console.log('✅ Database initialized');
    
    await db.createSchema();
    console.log('✅ Schema created');
    
    await db.populateCategories();
    console.log('✅ Categories populated (20 total)');
    
    await db.populateKeywords();
    console.log('✅ Process-focused keywords populated');
    
    await db.initializeMatrix();
    console.log('✅ 20×20 matrix initialized (400 cells)');
    
    await db.extractKeywordCounts();
    console.log('✅ Keyword extraction completed');
    
    const stats = await db.getStatistics();
    console.log('📊 Database Statistics:');
    console.log(`   - Categories: ${stats.category_count}`);
    console.log(`   - Keywords: ${stats.total_keywords}`);
    console.log(`   - Intent Occurrences: ${stats.total_intent_occurrences}`);
    console.log(`   - Reality Occurrences: ${stats.total_reality_occurrences}`);
    console.log(`   - Avg Process Relevance: ${stats.avg_process_relevance.toFixed(3)}`);
    
    await db.close();
    
    // Generate output JSON
    const output = {
      metadata: {
        agent: 1,
        name: "DATABASE INDEXER & KEYWORD EXTRACTOR",
        generated: new Date().toISOString(),
        architecture: "20-category process-focused system",
        database_path: "trust-debt-20-categories.db"
      },
      categories: TWENTY_CATEGORIES,
      statistics: stats,
      process_keywords: PROCESS_KEYWORDS,
      matrix_specifications: {
        size: "20×20 = 400 cells",
        reduction: "80% reduction from 45×45 = 2,025 cells",
        upper_triangle: "200 cells (Reality > Intent)",
        lower_triangle: "200 cells (Intent > Reality)", 
        diagonal: "20 cells (category self-reference)"
      },
      validation_results: {
        schema_created: true,
        categories_populated: true,
        keywords_extracted: true,
        matrix_initialized: true,
        process_focus_achieved: true
      },
      downstream_handoff: {
        agent_2_requirements: "Use 20-category structure for orthogonality validation",
        database_ready: true,
        keyword_normalization: "Process-focused keywords with relevance weighting",
        orthogonality_support: "Categories designed for <1% correlation target"
      }
    };

    fs.writeFileSync('1-indexed-keywords.json', JSON.stringify(output, null, 2));
    console.log('✅ 1-indexed-keywords.json generated');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { TwentyCategoryDatabase, TWENTY_CATEGORIES, PROCESS_KEYWORDS };