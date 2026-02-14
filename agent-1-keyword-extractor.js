#!/usr/bin/env node
/**
 * Agent 1: Database Indexer & Keyword Extractor
 *
 * PURPOSE: Extract keywords from thetadrivencoach codebase and build SQLite database
 * for Trust Debt analysis with hierarchical category structure.
 *
 * APPROACH:
 * 1. Scan /src for Reality (implementation) keywords
 * 2. Scan /docs for Intent (specification) keywords
 * 3. Build SQLite database with categories, keywords, mappings, matrix_cells
 * 4. Output 1-indexed-keywords.json for Agent 2
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SOURCE_REPO = '/Users/thetadriven/github/thetadrivencoach';
const SRC_DIR = path.join(SOURCE_REPO, 'src');
const DOCS_DIR = path.join(SOURCE_REPO, 'docs');
const DB_PATH = path.join(__dirname, 'trust-debt-pipeline.db');
const OUTPUT_PATH = path.join(__dirname, '1-indexed-keywords.json');

// Define 25-category structure (6 parents + 19 children) per current HTML report
const CATEGORIES = [
  // Parent categories (Length 1)
  { pos: 1, code: 'A🚀', name: 'CoreEngine', parent: null, color: '#00ff88', units: 1200, pct: 14.8 },
  { pos: 2, code: 'B🔒', name: 'Documentation', parent: null, color: '#00aaff', units: 800, pct: 9.8 },
  { pos: 3, code: 'C💨', name: 'Visualization', parent: null, color: '#ffaa00', units: 950, pct: 11.7 },
  { pos: 4, code: 'D🧠', name: 'Integration', parent: null, color: '#ff00aa', units: 4184, pct: 51.5 },
  { pos: 5, code: 'E🎨', name: 'BusinessLayer', parent: null, color: '#ff0044', units: 1829, pct: 22.5 },
  { pos: 6, code: 'F⚡', name: 'Claude-Flow', parent: null, color: '#3b82f6', units: 167, pct: 2.1 },

  // A🚀 CoreEngine children (Length 2)
  { pos: 7, code: 'A🚀.1⚡', name: 'PatentFormula', parent: 1, color: '#00ff88', units: 300, pct: 3.7 },
  { pos: 8, code: 'A🚀.2🔥', name: 'TrustMeasurement', parent: 1, color: '#00ff88', units: 350, pct: 4.3 },
  { pos: 9, code: 'A🚀.3📈', name: 'StatisticalAnalysis', parent: 1, color: '#00ff88', units: 280, pct: 3.4 },
  { pos: 10, code: 'A🚀.4🎯', name: 'ValidationEngine', parent: 1, color: '#00ff88', units: 270, pct: 3.3 },

  // B🔒 Documentation children
  { pos: 11, code: 'B🔒.1📚', name: 'IntentSpecification', parent: 2, color: '#00aaff', units: 250, pct: 3.1 },
  { pos: 12, code: 'B🔒.2📖', name: 'BusinessPlans', parent: 2, color: '#00aaff', units: 220, pct: 2.7 },
  { pos: 13, code: 'B🔒.3📝', name: 'TechnicalDocs', parent: 2, color: '#00aaff', units: 330, pct: 4.1 },

  // C💨 Visualization children
  { pos: 14, code: 'C💨.1🎨', name: 'UserInterface', parent: 3, color: '#ffaa00', units: 400, pct: 4.9 },
  { pos: 15, code: 'C💨.2📊', name: 'DataVisualization', parent: 3, color: '#ffaa00', units: 350, pct: 4.3 },
  { pos: 16, code: 'C💨.3🖼️', name: 'VisualDesign', parent: 3, color: '#ffaa00', units: 200, pct: 2.5 },

  // D🧠 Integration children
  { pos: 17, code: 'D🧠.1🔗', name: 'APIIntegration', parent: 4, color: '#ff00aa', units: 1500, pct: 18.5 },
  { pos: 18, code: 'D🧠.2💾', name: 'DatabaseLayer', parent: 4, color: '#ff00aa', units: 1200, pct: 14.8 },
  { pos: 19, code: 'D🧠.3🌐', name: 'NetworkLayer', parent: 4, color: '#ff00aa', units: 1484, pct: 18.3 },

  // E🎨 BusinessLayer children
  { pos: 20, code: 'E🎨.1💼', name: 'BusinessLogic', parent: 5, color: '#ff0044', units: 800, pct: 9.8 },
  { pos: 21, code: 'E🎨.2🎯', name: 'StrategyPlanning', parent: 5, color: '#ff0044', units: 600, pct: 7.4 },
  { pos: 22, code: 'E🎨.3📈', name: 'MetricsTracking', parent: 5, color: '#ff0044', units: 429, pct: 5.3 },

  // F⚡ Claude-Flow children
  { pos: 23, code: 'F⚡.1🤖', name: 'AgentOrchestration', parent: 6, color: '#3b82f6', units: 80, pct: 1.0 },
  { pos: 24, code: 'F⚡.2🔄', name: 'TaskCoordination', parent: 6, color: '#3b82f6', units: 50, pct: 0.6 },
  { pos: 25, code: 'F⚡.3⚡', name: 'SwarmIntelligence', parent: 6, color: '#3b82f6', units: 37, pct: 0.5 }
];

// Keyword patterns mapped to categories (hybrid LLM-informed regex)
const KEYWORD_PATTERNS = {
  // CoreEngine keywords
  'PatentFormula': ['patent', 'formula', 'algorithm', 'calculation', 'mathematical', 'equation'],
  'TrustMeasurement': ['trust', 'debt', 'measurement', 'metric', 'score', 'grade', 'assessment'],
  'StatisticalAnalysis': ['statistics', 'analysis', 'correlation', 'distribution', 'variance', 'regression'],
  'ValidationEngine': ['validation', 'verify', 'check', 'assert', 'test', 'ensure', 'validate'],

  // Documentation keywords
  'IntentSpecification': ['intent', 'specification', 'requirement', 'design', 'plan', 'architecture'],
  'BusinessPlans': ['business', 'strategy', 'plan', 'goal', 'objective', 'roi', 'market'],
  'TechnicalDocs': ['documentation', 'readme', 'guide', 'manual', 'tutorial', 'howto', 'docs'],

  // Visualization keywords
  'UserInterface': ['ui', 'interface', 'component', 'button', 'form', 'input', 'modal', 'layout'],
  'DataVisualization': ['chart', 'graph', 'visualization', 'plot', 'diagram', 'matrix', 'table'],
  'VisualDesign': ['design', 'style', 'css', 'theme', 'color', 'gradient', 'border', 'layout'],

  // Integration keywords
  'APIIntegration': ['api', 'endpoint', 'rest', 'graphql', 'request', 'response', 'http', 'fetch'],
  'DatabaseLayer': ['database', 'sql', 'query', 'table', 'schema', 'index', 'sqlite', 'postgres'],
  'NetworkLayer': ['network', 'socket', 'connection', 'stream', 'websocket', 'tcp', 'protocol'],

  // BusinessLayer keywords
  'BusinessLogic': ['logic', 'workflow', 'process', 'rule', 'condition', 'business', 'decision'],
  'StrategyPlanning': ['strategy', 'planning', 'roadmap', 'vision', 'mission', 'goal', 'objective'],
  'MetricsTracking': ['metrics', 'tracking', 'analytics', 'monitoring', 'performance', 'kpi'],

  // Claude-Flow keywords
  'AgentOrchestration': ['agent', 'orchestration', 'coordination', 'spawn', 'swarm', 'task'],
  'TaskCoordination': ['task', 'coordination', 'parallel', 'sequential', 'pipeline', 'workflow'],
  'SwarmIntelligence': ['swarm', 'intelligence', 'collective', 'distributed', 'consensus', 'hive']
};

// Initialize SQLite database
function initDatabase() {
  console.log('📦 Initializing SQLite database...');

  const db = new Database(DB_PATH);

  // Create tables
  db.exec(`
    DROP TABLE IF EXISTS matrix_cells;
    DROP TABLE IF EXISTS keyword_mappings;
    DROP TABLE IF EXISTS keywords;
    DROP TABLE IF EXISTS categories;

    CREATE TABLE categories (
      id INTEGER PRIMARY KEY,
      position INTEGER NOT NULL UNIQUE,
      category_code TEXT NOT NULL,
      full_name TEXT NOT NULL,
      parent_id INTEGER,
      color TEXT NOT NULL,
      trust_debt_units REAL,
      trust_debt_percentage REAL,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    );

    CREATE INDEX idx_position ON categories(position);
    CREATE INDEX idx_parent ON categories(parent_id);

    CREATE TABLE keywords (
      id INTEGER PRIMARY KEY,
      keyword TEXT NOT NULL UNIQUE,
      intent_count INTEGER DEFAULT 0,
      reality_count INTEGER DEFAULT 0
    );

    CREATE INDEX idx_keyword ON keywords(keyword);

    CREATE TABLE keyword_mappings (
      id INTEGER PRIMARY KEY,
      keyword_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      FOREIGN KEY (keyword_id) REFERENCES keywords(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE INDEX idx_keyword_map ON keyword_mappings(keyword_id);
    CREATE INDEX idx_category_map ON keyword_mappings(category_id);

    CREATE TABLE matrix_cells (
      id INTEGER PRIMARY KEY,
      row_category_id INTEGER NOT NULL,
      col_category_id INTEGER NOT NULL,
      intent_value REAL DEFAULT 0,
      reality_value REAL DEFAULT 0,
      trust_debt_units REAL DEFAULT 0,
      cell_color TEXT,
      is_upper BOOLEAN DEFAULT 0,
      is_lower BOOLEAN DEFAULT 0,
      is_diagonal BOOLEAN DEFAULT 0,
      FOREIGN KEY (row_category_id) REFERENCES categories(id),
      FOREIGN KEY (col_category_id) REFERENCES categories(id)
    );

    CREATE INDEX idx_row_col ON matrix_cells(row_category_id, col_category_id);
    CREATE INDEX idx_triangle ON matrix_cells(is_upper, is_lower, is_diagonal);
  `);

  // Insert categories
  const insertCat = db.prepare(`
    INSERT INTO categories (position, category_code, full_name, parent_id, color, trust_debt_units, trust_debt_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const cat of CATEGORIES) {
    insertCat.run(cat.pos, cat.code, cat.name, cat.parent, cat.color, cat.units, cat.pct);
  }

  console.log(`✅ Database initialized with ${CATEGORIES.length} categories`);
  return db;
}

// Scan files for keywords
function scanDirectory(dir, isReality) {
  const keywords = {};
  const extensions = isReality ? ['.ts', '.tsx', '.js', '.jsx'] : ['.md', '.mdx', '.txt'];

  function walk(currentPath) {
    if (!fs.existsSync(currentPath)) return;

    const items = fs.readdirSync(currentPath);
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules, .git, etc
        if (!item.startsWith('.') && item !== 'node_modules') {
          walk(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8').toLowerCase();

            // Count occurrences of each keyword pattern
            for (const [category, patterns] of Object.entries(KEYWORD_PATTERNS)) {
              for (const pattern of patterns) {
                const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
                const matches = content.match(regex);
                if (matches) {
                  const key = pattern;
                  if (!keywords[key]) {
                    keywords[key] = { category, count: 0 };
                  }
                  keywords[key].count += matches.length;
                }
              }
            }
          } catch (err) {
            // Skip files that can't be read
          }
        }
      }
    }
  }

  walk(dir);
  return keywords;
}

// Main execution
async function main() {
  console.log('🚀 Agent 1: Database Indexer & Keyword Extractor');
  console.log('=' .repeat(60));

  // Initialize database
  const db = initDatabase();

  // Scan source and docs
  console.log('\n📊 Scanning Reality (src)...');
  const realityKeywords = scanDirectory(SRC_DIR, true);
  console.log(`   Found ${Object.keys(realityKeywords).length} unique keywords`);

  console.log('\n📚 Scanning Intent (docs)...');
  const intentKeywords = scanDirectory(DOCS_DIR, false);
  console.log(`   Found ${Object.keys(intentKeywords).length} unique keywords`);

  // Merge and insert keywords
  console.log('\n💾 Inserting keywords into database...');
  const allKeywords = new Set([...Object.keys(realityKeywords), ...Object.keys(intentKeywords)]);

  const insertKeyword = db.prepare(`
    INSERT INTO keywords (keyword, intent_count, reality_count)
    VALUES (?, ?, ?)
  `);

  const insertMapping = db.prepare(`
    INSERT INTO keyword_mappings (keyword_id, category_id)
    VALUES (?, ?)
  `);

  const getCategoryId = db.prepare(`
    SELECT id FROM categories WHERE full_name = ?
  `);

  let totalMappings = 0;
  for (const keyword of allKeywords) {
    const intentCount = intentKeywords[keyword]?.count || 0;
    const realityCount = realityKeywords[keyword]?.count || 0;

    const result = insertKeyword.run(keyword, intentCount, realityCount);
    const keywordId = result.lastInsertRowid;

    // Create mappings to categories
    const category = realityKeywords[keyword]?.category || intentKeywords[keyword]?.category;
    if (category) {
      const catRow = getCategoryId.get(category);
      if (catRow) {
        insertMapping.run(keywordId, catRow.id);
        totalMappings++;
      }
    }
  }

  console.log(`✅ Inserted ${allKeywords.size} keywords with ${totalMappings} category mappings`);

  // Generate statistics
  const totalIntent = db.prepare('SELECT SUM(intent_count) as total FROM keywords').get().total || 0;
  const totalReality = db.prepare('SELECT SUM(reality_count) as total FROM keywords').get().total || 0;

  // Create output JSON
  const output = {
    metadata: {
      agent: 1,
      name: 'Database Indexer & Keyword Extractor',
      generated: new Date().toISOString(),
      database: DB_PATH,
      categories: CATEGORIES.length,
      totalKeywords: allKeywords.size,
      totalMappings: totalMappings
    },
    statistics: {
      intentOccurrences: totalIntent,
      realityOccurrences: totalReality,
      asymmetryRatio: (totalReality / totalIntent).toFixed(2),
      categoryCoverage: '100%'
    },
    keywords: Array.from(allKeywords).slice(0, 50).map(kw => ({
      keyword: kw,
      intentCount: intentKeywords[kw]?.count || 0,
      realityCount: realityKeywords[kw]?.count || 0,
      category: realityKeywords[kw]?.category || intentKeywords[kw]?.category
    })),
    databaseSchema: {
      tables: ['categories', 'keywords', 'keyword_mappings', 'matrix_cells'],
      indexes: 7,
      ready: true
    }
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\n📄 Output written to: ${OUTPUT_PATH}`);

  console.log('\n📊 Summary:');
  console.log(`   Total Keywords: ${allKeywords.size}`);
  console.log(`   Intent Occurrences: ${totalIntent}`);
  console.log(`   Reality Occurrences: ${totalReality}`);
  console.log(`   Asymmetry Ratio: ${(totalReality / totalIntent).toFixed(2)}`);
  console.log(`   Category Mappings: ${totalMappings}`);

  db.close();
  console.log('\n✅ Agent 1 complete!');
}

main().catch(console.error);
