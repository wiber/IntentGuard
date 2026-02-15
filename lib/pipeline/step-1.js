/**
 * src/pipeline/step-1.ts — Database Indexer & Keyword Extractor (Agent 1)
 *
 * Creates SQLite database with 45-category hierarchical structure in ShortLex order.
 * Extracts keywords using hybrid LLM-regex approach with Intent vs Reality indexing.
 * Provides statistical foundation for downstream agents (2-7).
 *
 * INPUTS:  step-0 raw materials, /docs for Intent, /src for Reality
 * OUTPUTS: 1-indexed-keywords.json, trust-debt-pipeline.db (SQLite)
 *
 * SPECIFICATIONS FROM COMS.txt:
 * - SQLite Database: EXACTLY 45 categories (5 parents + 40 children)
 * - Hierarchical Structure: Perfect ShortLex ordering A🚀→A🚀.1⚡→...→E🎨.8🏆
 * - Matrix Foundation: 45x45 asymmetric matrix (2025 cells) initialization
 * - Keyword Detection: 259 unique keywords with 421 category mappings
 * - Intent vs Reality: Index docs (intent) vs src (reality) occurrences
 * - Database Performance: All indexes for optimal Agent 2-7 query performance
 * - Category Coverage: 100% coverage - ALL 45 categories have mapped keywords
 * - Agent 2 Handoff: Database foundation for orthogonality validation
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import Database from 'better-sqlite3';
/**
 * 45-category hierarchical structure in ShortLex order.
 * Based on COMS.txt Agent 2 specifications (lines 228-254).
 */
const CATEGORY_STRUCTURE = [
    // A🚀 CoreEngine (Parent)
    { code: 'A🚀', name: 'CoreEngine', parent_id: null, trust_debt_units: 0, percentage: 0, color: '#ff6b6b' },
    { code: 'A🚀.1⚡', name: 'Algorithm', parent_id: 1, trust_debt_units: 0, percentage: 0, color: '#ff6b6b' },
    { code: 'A🚀.2🔥', name: 'Architecture', parent_id: 1, trust_debt_units: 0, percentage: 0, color: '#ff6b6b' },
    { code: 'A🚀.3💡', name: 'Optimization', parent_id: 1, trust_debt_units: 0, percentage: 0, color: '#ff6b6b' },
    { code: 'A🚀.4🎯', name: 'CoreLogic', parent_id: 1, trust_debt_units: 0, percentage: 0, color: '#ff6b6b' },
    { code: 'A🚀.5🔧', name: 'Refactoring', parent_id: 1, trust_debt_units: 0, percentage: 0, color: '#ff6b6b' },
    { code: 'A🚀.6📊', name: 'Analytics', parent_id: 1, trust_debt_units: 0, percentage: 0, color: '#ff6b6b' },
    { code: 'A🚀.7🛡️', name: 'Security', parent_id: 1, trust_debt_units: 0, percentage: 0, color: '#ff6b6b' },
    { code: 'A🚀.8⚙️', name: 'Configuration', parent_id: 1, trust_debt_units: 0, percentage: 0, color: '#ff6b6b' },
    // B🔒 Security (Parent)
    { code: 'B🔒', name: 'Security', parent_id: null, trust_debt_units: 0, percentage: 0, color: '#4ecdc4' },
    { code: 'B🔒.1🛡️', name: 'Authentication', parent_id: 10, trust_debt_units: 0, percentage: 0, color: '#4ecdc4' },
    { code: 'B🔒.2🔐', name: 'Authorization', parent_id: 10, trust_debt_units: 0, percentage: 0, color: '#4ecdc4' },
    { code: 'B🔒.3🔑', name: 'Encryption', parent_id: 10, trust_debt_units: 0, percentage: 0, color: '#4ecdc4' },
    { code: 'B🔒.4🚨', name: 'Auditing', parent_id: 10, trust_debt_units: 0, percentage: 0, color: '#4ecdc4' },
    { code: 'B🔒.5⚠️', name: 'Compliance', parent_id: 10, trust_debt_units: 0, percentage: 0, color: '#4ecdc4' },
    { code: 'B🔒.6🔍', name: 'Monitoring', parent_id: 10, trust_debt_units: 0, percentage: 0, color: '#4ecdc4' },
    { code: 'B🔒.7🧪', name: 'Testing', parent_id: 10, trust_debt_units: 0, percentage: 0, color: '#4ecdc4' },
    { code: 'B🔒.8📋', name: 'Documentation', parent_id: 10, trust_debt_units: 0, percentage: 0, color: '#4ecdc4' },
    // C💨 Performance (Parent)
    { code: 'C💨', name: 'Performance', parent_id: null, trust_debt_units: 0, percentage: 0, color: '#45b7d1' },
    { code: 'C💨.1⚡', name: 'Speed', parent_id: 19, trust_debt_units: 0, percentage: 0, color: '#45b7d1' },
    { code: 'C💨.2💾', name: 'Memory', parent_id: 19, trust_debt_units: 0, percentage: 0, color: '#45b7d1' },
    { code: 'C💨.3🔄', name: 'Caching', parent_id: 19, trust_debt_units: 0, percentage: 0, color: '#45b7d1' },
    { code: 'C💨.4🌐', name: 'Network', parent_id: 19, trust_debt_units: 0, percentage: 0, color: '#45b7d1' },
    { code: 'C💨.5📊', name: 'Profiling', parent_id: 19, trust_debt_units: 0, percentage: 0, color: '#45b7d1' },
    { code: 'C💨.6🎯', name: 'Optimization', parent_id: 19, trust_debt_units: 0, percentage: 0, color: '#45b7d1' },
    { code: 'C💨.7🔧', name: 'Tuning', parent_id: 19, trust_debt_units: 0, percentage: 0, color: '#45b7d1' },
    { code: 'C💨.8📈', name: 'Scaling', parent_id: 19, trust_debt_units: 0, percentage: 0, color: '#45b7d1' },
    // D🧠 Integration (Parent)
    { code: 'D🧠', name: 'Integration', parent_id: null, trust_debt_units: 0, percentage: 0, color: '#96ceb4' },
    { code: 'D🧠.1🔌', name: 'API', parent_id: 28, trust_debt_units: 0, percentage: 0, color: '#96ceb4' },
    { code: 'D🧠.2📡', name: 'Communication', parent_id: 28, trust_debt_units: 0, percentage: 0, color: '#96ceb4' },
    { code: 'D🧠.3🔗', name: 'Dependencies', parent_id: 28, trust_debt_units: 0, percentage: 0, color: '#96ceb4' },
    { code: 'D🧠.4🎨', name: 'UI', parent_id: 28, trust_debt_units: 0, percentage: 0, color: '#96ceb4' },
    { code: 'D🧠.5🗄️', name: 'Database', parent_id: 28, trust_debt_units: 0, percentage: 0, color: '#96ceb4' },
    { code: 'D🧠.6📦', name: 'Packaging', parent_id: 28, trust_debt_units: 0, percentage: 0, color: '#96ceb4' },
    { code: 'D🧠.7🛠️', name: 'Tooling', parent_id: 28, trust_debt_units: 0, percentage: 0, color: '#96ceb4' },
    { code: 'D🧠.8🔄', name: 'Workflow', parent_id: 28, trust_debt_units: 0, percentage: 0, color: '#96ceb4' },
    // E🎨 BusinessLayer (Parent)
    { code: 'E🎨', name: 'BusinessLayer', parent_id: null, trust_debt_units: 0, percentage: 0, color: '#feca57' },
    { code: 'E🎨.1🎯', name: 'Strategy', parent_id: 37, trust_debt_units: 0, percentage: 0, color: '#feca57' },
    { code: 'E🎨.2📊', name: 'Metrics', parent_id: 37, trust_debt_units: 0, percentage: 0, color: '#feca57' },
    { code: 'E🎨.3💼', name: 'Governance', parent_id: 37, trust_debt_units: 0, percentage: 0, color: '#feca57' },
    { code: 'E🎨.4📈', name: 'Growth', parent_id: 37, trust_debt_units: 0, percentage: 0, color: '#feca57' },
    { code: 'E🎨.5🎨', name: 'Design', parent_id: 37, trust_debt_units: 0, percentage: 0, color: '#feca57' },
    { code: 'E🎨.6📝', name: 'Documentation', parent_id: 37, trust_debt_units: 0, percentage: 0, color: '#feca57' },
    { code: 'E🎨.7🏆', name: 'Quality', parent_id: 37, trust_debt_units: 0, percentage: 0, color: '#feca57' },
    { code: 'E🎨.8🌟', name: 'Excellence', parent_id: 37, trust_debt_units: 0, percentage: 0, color: '#feca57' },
];
/**
 * Keyword mappings for hybrid LLM-regex extraction.
 * Maps keywords to category IDs for Intent vs Reality tracking.
 */
const KEYWORD_MAPPINGS = [
    // CoreEngine keywords
    { keyword: 'algorithm', category_ids: [2] },
    { keyword: 'architecture', category_ids: [3] },
    { keyword: 'optimization', category_ids: [4] },
    { keyword: 'refactor', category_ids: [6] },
    { keyword: 'core', category_ids: [1, 5] },
    { keyword: 'engine', category_ids: [1] },
    { keyword: 'pipeline', category_ids: [1, 36] },
    { keyword: 'analytics', category_ids: [7] },
    { keyword: 'configuration', category_ids: [9] },
    { keyword: 'config', category_ids: [9] },
    // Security keywords
    { keyword: 'authentication', category_ids: [11] },
    { keyword: 'authorization', category_ids: [12] },
    { keyword: 'auth', category_ids: [11, 12] },
    { keyword: 'encryption', category_ids: [13] },
    { keyword: 'security', category_ids: [10, 8] },
    { keyword: 'audit', category_ids: [14] },
    { keyword: 'compliance', category_ids: [15] },
    { keyword: 'monitoring', category_ids: [16] },
    { keyword: 'testing', category_ids: [17] },
    // Performance keywords
    { keyword: 'performance', category_ids: [19] },
    { keyword: 'speed', category_ids: [20] },
    { keyword: 'memory', category_ids: [21] },
    { keyword: 'cache', category_ids: [22] },
    { keyword: 'caching', category_ids: [22] },
    { keyword: 'network', category_ids: [23] },
    { keyword: 'profiling', category_ids: [24] },
    { keyword: 'optimize', category_ids: [4, 25] },
    { keyword: 'tuning', category_ids: [26] },
    { keyword: 'scaling', category_ids: [27] },
    { keyword: 'scale', category_ids: [27] },
    // Integration keywords
    { keyword: 'integration', category_ids: [28] },
    { keyword: 'api', category_ids: [29] },
    { keyword: 'endpoint', category_ids: [29] },
    { keyword: 'communication', category_ids: [30] },
    { keyword: 'dependency', category_ids: [31] },
    { keyword: 'dependencies', category_ids: [31] },
    { keyword: 'interface', category_ids: [32] },
    { keyword: 'database', category_ids: [33] },
    { keyword: 'sqlite', category_ids: [33] },
    { keyword: 'packaging', category_ids: [34] },
    { keyword: 'package', category_ids: [34] },
    { keyword: 'tooling', category_ids: [35] },
    { keyword: 'workflow', category_ids: [36] },
    // BusinessLayer keywords
    { keyword: 'business', category_ids: [37] },
    { keyword: 'strategy', category_ids: [38] },
    { keyword: 'strategic', category_ids: [38] },
    { keyword: 'metrics', category_ids: [39] },
    { keyword: 'metric', category_ids: [39] },
    { keyword: 'governance', category_ids: [40] },
    { keyword: 'growth', category_ids: [41] },
    { keyword: 'design', category_ids: [42] },
    { keyword: 'documentation', category_ids: [18, 43] },
    { keyword: 'quality', category_ids: [44] },
    { keyword: 'excellence', category_ids: [45] },
    // Additional technical keywords
    { keyword: 'agent', category_ids: [1, 28] },
    { keyword: 'swarm', category_ids: [1, 36] },
    { keyword: 'coordination', category_ids: [30, 36] },
    { keyword: 'matrix', category_ids: [7, 33] },
    { keyword: 'trust', category_ids: [10, 40] },
    { keyword: 'debt', category_ids: [39, 40] },
    { keyword: 'grade', category_ids: [39, 44] },
    { keyword: 'orthogonality', category_ids: [4, 7] },
    { keyword: 'shortlex', category_ids: [4] },
    { keyword: 'asymmetric', category_ids: [7] },
    { keyword: 'intent', category_ids: [38, 40] },
    { keyword: 'reality', category_ids: [39, 44] },
];
/**
 * Recursively scan directory for text files and extract content.
 */
function scanDirectory(dir, extensions = ['.ts', '.js', '.md', '.txt', '.json']) {
    if (!existsSync(dir))
        return [];
    const contents = [];
    const items = readdirSync(dir);
    for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            // Skip node_modules and hidden directories
            if (item === 'node_modules' || item.startsWith('.'))
                continue;
            contents.push(...scanDirectory(fullPath, extensions));
        }
        else if (stat.isFile() && extensions.includes(extname(item).toLowerCase())) {
            try {
                const content = readFileSync(fullPath, 'utf-8');
                contents.push(content);
            }
            catch (error) {
                // Skip files that can't be read
                console.warn(`[step-1] Warning: Could not read ${fullPath}`);
            }
        }
    }
    return contents;
}
/**
 * Extract keyword occurrences from text content.
 */
function extractKeywordOccurrences(contents, keywords) {
    const occurrences = new Map();
    for (const keyword of keywords) {
        occurrences.set(keyword, 0);
    }
    for (const content of contents) {
        const lowerContent = content.toLowerCase();
        for (const keyword of keywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = lowerContent.match(regex);
            if (matches) {
                occurrences.set(keyword, occurrences.get(keyword) + matches.length);
            }
        }
    }
    return occurrences;
}
/**
 * Initialize SQLite database with schema and categories.
 */
function initializeDatabase(dbPath) {
    const db = new Database(dbPath);
    // Enable WAL mode for better write performance
    db.pragma('journal_mode = WAL');
    // Create schema
    db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      parent_id INTEGER,
      trust_debt_units INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0.0,
      color TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL UNIQUE,
      total_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS keyword_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      intent_count INTEGER DEFAULT 0,
      reality_count INTEGER DEFAULT 0,
      total_count INTEGER DEFAULT 0,
      FOREIGN KEY (keyword_id) REFERENCES keywords(id),
      FOREIGN KEY (category_id) REFERENCES categories(id),
      UNIQUE(keyword_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS matrix_cells (
      row INTEGER NOT NULL,
      col INTEGER NOT NULL,
      intent_value INTEGER DEFAULT 0,
      reality_value INTEGER DEFAULT 0,
      trust_debt_units INTEGER DEFAULT 0,
      cell_color TEXT,
      is_upper_triangle BOOLEAN DEFAULT 0,
      is_lower_triangle BOOLEAN DEFAULT 0,
      is_diagonal BOOLEAN DEFAULT 0,
      PRIMARY KEY (row, col)
    );

    CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);
    CREATE INDEX IF NOT EXISTS idx_mappings_keyword ON keyword_mappings(keyword_id);
    CREATE INDEX IF NOT EXISTS idx_mappings_category ON keyword_mappings(category_id);
    CREATE INDEX IF NOT EXISTS idx_matrix_row ON matrix_cells(row);
    CREATE INDEX IF NOT EXISTS idx_matrix_col ON matrix_cells(col);
  `);
    return db;
}
/**
 * Populate categories table with 45-category structure.
 */
function populateCategories(db) {
    const insert = db.prepare(`
    INSERT INTO categories (id, code, name, parent_id, trust_debt_units, percentage, color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    const categories = [];
    const insertAll = db.transaction(() => {
        for (let i = 0; i < CATEGORY_STRUCTURE.length; i++) {
            const cat = CATEGORY_STRUCTURE[i];
            const id = i + 1; // 1-indexed for ShortLex
            insert.run(id, cat.code, cat.name, cat.parent_id, cat.trust_debt_units, cat.percentage, cat.color);
            categories.push({ id, ...cat });
        }
    });
    insertAll();
    return categories;
}
/**
 * Initialize 45x45 asymmetric matrix structure.
 */
function initializeMatrix(db) {
    const insert = db.prepare(`
    INSERT INTO matrix_cells (row, col, is_upper_triangle, is_lower_triangle, is_diagonal)
    VALUES (?, ?, ?, ?, ?)
  `);
    const insertAll = db.transaction(() => {
        for (let row = 1; row <= 45; row++) {
            for (let col = 1; col <= 45; col++) {
                const isUpper = row < col;
                const isLower = row > col;
                const isDiagonal = row === col;
                insert.run(row, col, isUpper ? 1 : 0, isLower ? 1 : 0, isDiagonal ? 1 : 0);
            }
        }
    });
    insertAll();
}
/**
 * Index keywords with Intent vs Reality tracking.
 */
function indexKeywords(db, intentContents, realityContents) {
    const allKeywords = [...new Set(KEYWORD_MAPPINGS.map(m => m.keyword))];
    // Extract occurrences
    const intentOccurrences = extractKeywordOccurrences(intentContents, allKeywords);
    const realityOccurrences = extractKeywordOccurrences(realityContents, allKeywords);
    // Insert keywords
    const insertKeyword = db.prepare('INSERT OR IGNORE INTO keywords (keyword, total_count) VALUES (?, ?)');
    const getKeywordId = db.prepare('SELECT id FROM keywords WHERE keyword = ?');
    for (const keyword of allKeywords) {
        const totalCount = (intentOccurrences.get(keyword) || 0) + (realityOccurrences.get(keyword) || 0);
        insertKeyword.run(keyword, totalCount);
    }
    // Insert mappings
    const insertMapping = db.prepare(`
    INSERT OR REPLACE INTO keyword_mappings (keyword_id, category_id, intent_count, reality_count, total_count)
    VALUES (?, ?, ?, ?, ?)
  `);
    let mappingCount = 0;
    for (const mapping of KEYWORD_MAPPINGS) {
        const keywordRow = getKeywordId.get(mapping.keyword);
        if (!keywordRow)
            continue;
        const intentCount = intentOccurrences.get(mapping.keyword) || 0;
        const realityCount = realityOccurrences.get(mapping.keyword) || 0;
        const totalCount = intentCount + realityCount;
        for (const categoryId of mapping.category_ids) {
            insertMapping.run(keywordRow.id, categoryId, intentCount, realityCount, totalCount);
            mappingCount++;
        }
    }
    return { keywords: allKeywords.length, mappings: mappingCount };
}
/**
 * Calculate statistics from database.
 */
function calculateStatistics(db) {
    const intentSum = db.prepare('SELECT SUM(intent_count) as total FROM keyword_mappings').get();
    const realitySum = db.prepare('SELECT SUM(reality_count) as total FROM keyword_mappings').get();
    const intentOccurrences = intentSum.total || 0;
    const realityOccurrences = realitySum.total || 0;
    const asymmetryRatio = intentOccurrences > 0 ? realityOccurrences / intentOccurrences : 0;
    const categoriesWithKeywords = db.prepare(`
    SELECT COUNT(DISTINCT category_id) as count FROM keyword_mappings
  `).get();
    const totalCategories = 45;
    const categoryCoverage = (categoriesWithKeywords.count / totalCategories) * 100;
    const avgKeywords = db.prepare(`
    SELECT AVG(kw_count) as avg FROM (
      SELECT category_id, COUNT(*) as kw_count
      FROM keyword_mappings
      GROUP BY category_id
    )
  `).get();
    return {
        intentOccurrences,
        realityOccurrences,
        asymmetryRatio,
        categoryCoverage,
        avgKeywordsPerCategory: avgKeywords.avg || 0,
    };
}
/**
 * Get top keywords by total count.
 */
function getTopKeywords(db, limit = 20) {
    const rows = db.prepare(`
    SELECT
      k.keyword,
      k.total_count,
      GROUP_CONCAT(c.code, ', ') as category_codes
    FROM keywords k
    JOIN keyword_mappings km ON k.id = km.keyword_id
    JOIN categories c ON km.category_id = c.id
    GROUP BY k.id
    ORDER BY k.total_count DESC
    LIMIT ?
  `).all(limit);
    return rows.map(row => ({
        keyword: row.keyword,
        count: row.total_count,
        categories: row.category_codes.split(', '),
    }));
}
/**
 * Run step 1: Database indexing and keyword extraction.
 */
export async function run(runDir, stepDir) {
    console.log('[step-1] Database Indexer & Keyword Extractor starting...');
    // Paths
    const projectRoot = join(runDir, '..');
    const docsDir = join(projectRoot, 'docs');
    const srcDir = join(projectRoot, 'src');
    const dbPath = join(runDir, 'trust-debt-pipeline.db');
    console.log('[step-1] Scanning Intent sources (/docs)...');
    const intentContents = scanDirectory(docsDir);
    console.log(`[step-1]   Found ${intentContents.length} intent documents`);
    console.log('[step-1] Scanning Reality sources (/src)...');
    const realityContents = scanDirectory(srcDir);
    console.log(`[step-1]   Found ${realityContents.length} reality documents`);
    console.log('[step-1] Initializing SQLite database...');
    const db = initializeDatabase(dbPath);
    console.log('[step-1] Populating 45-category structure (ShortLex order)...');
    const categories = populateCategories(db);
    console.log('[step-1] Initializing 45x45 asymmetric matrix...');
    initializeMatrix(db);
    console.log('[step-1] Indexing keywords with Intent vs Reality tracking...');
    const { keywords, mappings } = indexKeywords(db, intentContents, realityContents);
    console.log(`[step-1]   Indexed ${keywords} keywords with ${mappings} category mappings`);
    console.log('[step-1] Calculating statistics...');
    const stats = calculateStatistics(db);
    console.log('[step-1] Extracting top keywords...');
    const topKeywords = getTopKeywords(db);
    // Close database
    db.close();
    const result = {
        step: 1,
        name: 'database-indexing-keyword-extraction',
        timestamp: new Date().toISOString(),
        database: {
            path: dbPath,
            categories: 45,
            keywords,
            mappings,
        },
        statistics: stats,
        categories,
        topKeywords,
    };
    writeFileSync(join(stepDir, '1-indexed-keywords.json'), JSON.stringify(result, null, 2));
    console.log(`[step-1] ✅ Database Indexer complete:`);
    console.log(`  • SQLite database: ${dbPath}`);
    console.log(`  • Categories: ${categories.length} (ShortLex order)`);
    console.log(`  • Keywords: ${keywords}`);
    console.log(`  • Mappings: ${mappings}`);
    console.log(`  • Intent occurrences: ${stats.intentOccurrences}`);
    console.log(`  • Reality occurrences: ${stats.realityOccurrences}`);
    console.log(`  • Asymmetry ratio: ${stats.asymmetryRatio.toFixed(2)}x`);
    console.log(`  • Category coverage: ${stats.categoryCoverage.toFixed(1)}%`);
    console.log(`  • Agent 2 handoff ready: Database provides foundation for orthogonality validation`);
}
//# sourceMappingURL=step-1.js.map