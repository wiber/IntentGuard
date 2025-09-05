#!/usr/bin/env node

/**
 * Agent 1: Database Indexer & Keyword Extractor
 * ===============================================
 * Hybrid LLM-regex keyword extraction for Trust Debt analysis
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

class TrustDebtIndexer {
  constructor() {
    this.db = new sqlite3.Database('trust-debt-pipeline.db');
    this.projectRoot = process.cwd();
    this.keywordPatterns = {
      // Trust Debt specific patterns
      trustDebt: /\b(trust[-\s]?debt|drift|alignment|asymmetry|orthogonal|matrix|shortlex)\b/gi,
      measurement: /\b(measurement|metric|score|grade|calculation|formula|multiplier)\b/gi,
      analysis: /\b(analysis|analyzer|cold[-\s]?spot|blind[-\s]?spot|pattern|detector)\b/gi,
      categories: /\b(categor[y|ies]|classification|taxonomy|orthogonal|semantic|cluster)\b/gi,
      timeline: /\b(timeline|evolution|history|commit|tracking|progression|development)\b/gi,
      implementation: /\b(implementation|reality|actual|code|function|class|module|execute)\b/gi,
      specification: /\b(specification|intent|documentation|readme|design|planning|requirement)\b/gi,
      pipeline: /\b(pipeline|agent|stage|bucket|validation|orchestrat[e|ion]|coordination)\b/gi,
      health: /\b(health|validator|integrity|coherence|consistency|legitimacy|quality)\b/gi,
      technical: /\b(generator|processor|extractor|builder|manager|optimizer|engine)\b/gi
    };
  }

  /**
   * Extract keywords from content using hybrid approach
   */
  extractKeywords(content, contentType = 'unknown') {
    const keywords = new Set();
    const normalizedContent = content.toLowerCase();

    // Apply each pattern category
    for (const [category, pattern] of Object.entries(this.keywordPatterns)) {
      const matches = normalizedContent.match(pattern) || [];
      matches.forEach(match => keywords.add(match.trim()));
    }

    // Add domain-specific extraction
    if (contentType === 'documentation') {
      this.extractIntentKeywords(normalizedContent).forEach(k => keywords.add(k));
    } else if (contentType === 'source_code') {
      this.extractRealityKeywords(normalizedContent).forEach(k => keywords.add(k));
    }

    return Array.from(keywords).filter(k => k.length > 2);
  }

  /**
   * Extract intent-focused keywords from documentation
   */
  extractIntentKeywords(content) {
    const intentPatterns = [
      /\b(should|must|will|shall|intend[ed]?|plan[ned]?|goal|objective|purpose)\b/gi,
      /\b(architecture|design|specification|requirement|concept|strategy)\b/gi,
      /\b(problem|solution|approach|methodology|framework|principle)\b/gi
    ];

    const keywords = new Set();
    intentPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => keywords.add(match.trim()));
    });

    return Array.from(keywords);
  }

  /**
   * Extract reality-focused keywords from source code
   */
  extractRealityKeywords(content) {
    const realityPatterns = [
      /\b(function|class|const|let|var|return|throw|catch|async|await)\b/gi,
      /\b(implement[ed]?|execute[d]?|process[ed]?|handle[d]?|manage[d]?|calculate[d]?)\b/gi,
      /\b(error|exception|validation|test|debug|log|console)\b/gi
    ];

    const keywords = new Set();
    realityPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => keywords.add(match.trim()));
    });

    return Array.from(keywords);
  }

  /**
   * Index content into SQLite database
   */
  async indexContent() {
    console.log('📊 Starting Agent 1: Database Indexer & Keyword Extractor');
    console.log('══════════════════════════════════════════════════════════');

    // Intent Content: Documentation files
    const intentFiles = await this.getDocumentationFiles();
    let intentKeywordMap = new Map();

    for (const filePath of intentFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const contentHash = crypto.createHash('sha256').update(content).digest('hex');
        const keywords = this.extractKeywords(content, 'documentation');
        
        // Update keyword counts
        keywords.forEach(keyword => {
          const current = intentKeywordMap.get(keyword) || 0;
          intentKeywordMap.set(keyword, current + 1);
        });

        // Store in database
        await this.storeIntentContent(filePath, contentHash, content, keywords);
        
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
      }
    }

    // Reality Content: Source code files
    const realityFiles = await this.getSourceCodeFiles();
    let realityKeywordMap = new Map();

    for (const filePath of realityFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const contentHash = crypto.createHash('sha256').update(content).digest('hex');
        const keywords = this.extractKeywords(content, 'source_code');
        
        // Update keyword counts
        keywords.forEach(keyword => {
          const current = realityKeywordMap.get(keyword) || 0;
          realityKeywordMap.set(keyword, current + 1);
        });

        // Store in database
        await this.storeRealityContent(filePath, contentHash, content, keywords);
        
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
      }
    }

    // Populate keyword matrix
    await this.populateKeywordMatrix(intentKeywordMap, realityKeywordMap);

    console.log(`\n✅ Agent 1 Complete: Indexed ${intentFiles.length} intent + ${realityFiles.length} reality files`);
    console.log(`📈 Keywords extracted: ${intentKeywordMap.size + realityKeywordMap.size} unique terms`);

    return {
      intentFiles: intentFiles.length,
      realityFiles: realityFiles.length,
      intentKeywords: intentKeywordMap.size,
      realityKeywords: realityKeywordMap.size,
      totalKeywords: new Set([...intentKeywordMap.keys(), ...realityKeywordMap.keys()]).size
    };
  }

  /**
   * Get documentation files (intent sources)
   */
  async getDocumentationFiles() {
    const docPattern = /\.(md|txt|rst|doc|docx)$/i;
    const files = [];
    
    async function scanDirectory(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && docPattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }

    await scanDirectory(this.projectRoot);
    return files;
  }

  /**
   * Get source code files (reality sources)
   */
  async getSourceCodeFiles() {
    const codePattern = /\.(js|ts|jsx|tsx|py|java|c|cpp|go|rs)$/i;
    const files = [];
    
    async function scanDirectory(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && codePattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }

    await scanDirectory(this.projectRoot);
    return files.filter(f => f.includes('src/') || f.includes('bin/'));
  }

  /**
   * Store intent content in database
   */
  storeIntentContent(filePath, contentHash, content, keywords) {
    return new Promise((resolve, reject) => {
      const contentId = crypto.createHash('md5').update(filePath).digest('hex');
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO intent_content 
        (content_id, file_path, content_hash, full_content, content_type, last_modified)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const stats = require('fs').statSync(filePath);
      stmt.run([
        contentId,
        filePath,
        contentHash,
        content,
        'documentation',
        Math.floor(stats.mtime.getTime() / 1000)
      ], function(error) {
        if (error) reject(error);
        else resolve(this.lastID);
      });
      stmt.finalize();
    });
  }

  /**
   * Store reality content in database
   */
  storeRealityContent(filePath, contentHash, content, keywords) {
    return new Promise((resolve, reject) => {
      const contentId = crypto.createHash('md5').update(filePath).digest('hex');
      let commitHash = null;
      
      try {
        commitHash = execSync(`git log -1 --format="%H" -- "${filePath}"`, { encoding: 'utf8' }).trim();
      } catch (e) {
        // File might not be in git
      }

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO reality_content 
        (content_id, file_path, commit_hash, content_hash, full_content, content_type, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const stats = require('fs').statSync(filePath);
      stmt.run([
        contentId,
        filePath,
        commitHash,
        contentHash,
        content,
        'source_code',
        Math.floor(stats.mtime.getTime() / 1000)
      ], function(error) {
        if (error) reject(error);
        else resolve(this.lastID);
      });
      stmt.finalize();
    });
  }

  /**
   * Populate keyword matrix with normalized counts
   */
  async populateKeywordMatrix(intentKeywords, realityKeywords) {
    const allKeywords = new Set([...intentKeywords.keys(), ...realityKeywords.keys()]);

    for (const keyword of allKeywords) {
      const intentCount = intentKeywords.get(keyword) || 0;
      const realityCount = realityKeywords.get(keyword) || 0;
      
      await new Promise((resolve, reject) => {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO keyword_matrix 
          (keyword, intent_count, reality_count, intent_sources, reality_sources, last_updated)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
          keyword,
          intentCount,
          realityCount,
          JSON.stringify([]), // Sources to be populated later
          JSON.stringify([]), // Sources to be populated later  
          Math.floor(Date.now() / 1000)
        ], function(error) {
          if (error) reject(error);
          else resolve(this.lastID);
        });
        stmt.finalize();
      });
    }
  }

  /**
   * Close database connection
   */
  close() {
    return new Promise((resolve) => {
      this.db.close(resolve);
    });
  }
}

// Execute if called directly
if (require.main === module) {
  (async () => {
    const indexer = new TrustDebtIndexer();
    try {
      const stats = await indexer.indexContent();
      console.log('\n📊 Agent 1 Database Statistics:');
      console.log(`   Intent files: ${stats.intentFiles}`);
      console.log(`   Reality files: ${stats.realityFiles}`);
      console.log(`   Total unique keywords: ${stats.totalKeywords}`);
    } catch (error) {
      console.error('❌ Agent 1 failed:', error);
      process.exit(1);
    } finally {
      await indexer.close();
    }
  })();
}

module.exports = TrustDebtIndexer;