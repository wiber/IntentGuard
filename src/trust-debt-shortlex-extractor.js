#!/usr/bin/env node

/**
 * Trust Debt ShortLex Extractor
 * Extracts orthogonal categories from commits and documents
 * Uses Claude to ensure orthogonality and proper categorization
 * 
 * This is the KEY INNOVATION: Moving from abstract Trust/Timing/Recognition 
 * to dynamic categories like Security/Performance/UX/Documentation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ShortLexExtractor {
  constructor(settings) {
    this.settings = settings;
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.cacheFile = path.join(this.projectRoot, '.trust-debt-cache', 'categories.json');
    this.categories = new Map();
    this.commitCategories = new Set();
    this.documentCategories = new Set();
  }

  /**
   * Main extraction pipeline
   */
  async extractCategories() {
    console.log('\n🔍 ShortLex Category Extraction');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Step 1: Extract from recent commits
    console.log('\n📊 Analyzing recent commits...');
    const commitCategories = this.extractFromCommits();
    console.log(`  Found ${commitCategories.size} categories from commits`);
    
    // Step 2: Extract from documents
    console.log('\n📄 Analyzing tracked documents...');
    const docCategories = await this.extractFromDocuments();
    console.log(`  Found ${docCategories.size} categories from documents`);
    
    // Step 3: Merge and deduplicate
    console.log('\n🔄 Merging categories...');
    const allCategories = this.mergeCategories(commitCategories, docCategories);
    console.log(`  Total unique categories: ${allCategories.length}`);
    
    // Step 4: Use Claude to ensure orthogonality
    console.log('\n🤖 Ensuring orthogonality with Claude...');
    const orthogonalCategories = await this.ensureOrthogonality(allCategories);
    
    // Step 5: Apply ShortLex v2 sorting
    console.log('\n📐 Applying ShortLex v2 sorting...');
    const sortedCategories = this.shortlexSort(orthogonalCategories);
    
    // Step 6: Cache results
    this.cacheCategories(sortedCategories);
    
    console.log('\n✅ Category extraction complete!');
    console.log(`\n📊 Final categories (${sortedCategories.length}):`);
    sortedCategories.slice(0, 7).forEach((cat, i) => {
      console.log(`   ${i + 1}. ${cat.name} (${(cat.weight * 100).toFixed(0)}%)`);
    });
    
    return sortedCategories;
  }

  /**
   * Extract categories from recent commits
   */
  extractFromCommits() {
    const categories = new Map();
    
    try {
      // Get commits from last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const log = execSync(
        `git log --since="${sevenDaysAgo}" --format="%H|%s|%b" --name-only`,
        { encoding: 'utf8' }
      );
      
      const commits = this.parseCommitLog(log);
      
      for (const commit of commits) {
        // Extract from commit message
        const messageCategories = this.extractFromText(commit.subject + ' ' + commit.body);
        
        // Extract from file paths
        const fileCategories = this.extractFromFilePaths(commit.files);
        
        // Merge with weights
        for (const cat of [...messageCategories, ...fileCategories]) {
          const current = categories.get(cat) || { name: cat, count: 0, sources: [] };
          current.count++;
          current.sources.push(`commit:${commit.hash.substring(0, 7)}`);
          categories.set(cat, current);
        }
      }
    } catch (error) {
      console.error('  ⚠️ Error extracting from commits:', error.message);
    }
    
    return categories;
  }

  /**
   * Parse git log output
   */
  parseCommitLog(log) {
    const commits = [];
    const lines = log.split('\n');
    let currentCommit = null;
    
    for (const line of lines) {
      if (line.includes('|')) {
        // New commit
        if (currentCommit) commits.push(currentCommit);
        const [hash, subject, body] = line.split('|');
        currentCommit = {
          hash,
          subject,
          body: body || '',
          files: []
        };
      } else if (line.trim() && currentCommit) {
        // File path
        currentCommit.files.push(line.trim());
      }
    }
    
    if (currentCommit) commits.push(currentCommit);
    return commits;
  }

  /**
   * Extract categories from documents
   */
  async extractFromDocuments() {
    const categories = new Map();
    
    // Load DocumentTracker
    const DocumentTracker = require('./trust-debt-document-tracker');
    const tracker = new DocumentTracker(this.settings);
    
    const documents = await tracker.loadAllDocuments();
    
    for (const [key, doc] of Object.entries(documents)) {
      // Use categories already extracted by DocumentTracker
      for (const cat of doc.categories) {
        const current = categories.get(cat) || { name: cat, count: 0, sources: [] };
        current.count++;
        current.sources.push(`doc:${key}`);
        current.weight = (current.weight || 0) + doc.weight;
        categories.set(cat, current);
      }
      
      // Also extract from section titles
      for (const [sectionKey, section] of Object.entries(doc.sections)) {
        if (this.isValidCategory(section.title)) {
          const cat = this.normalizeCategory(section.title);
          const current = categories.get(cat) || { name: cat, count: 0, sources: [] };
          current.count++;
          current.sources.push(`doc:${key}:section`);
          current.weight = (current.weight || 0) + section.weight;
          categories.set(cat, current);
        }
      }
    }
    
    return categories;
  }

  /**
   * Extract categories from text using pattern matching
   */
  extractFromText(text) {
    const categories = new Set();
    
    // Common development categories
    const patterns = [
      /\b(security|auth|authentication|authorization)\b/gi,
      /\b(performance|speed|optimization|fast|slow)\b/gi,
      /\b(ui|ux|user.?experience|interface|design)\b/gi,
      /\b(test|testing|coverage|spec|unit|integration)\b/gi,
      /\b(deploy|deployment|build|ci|cd|pipeline)\b/gi,
      /\b(data|database|sql|query|migration)\b/gi,
      /\b(api|endpoint|route|rest|graphql)\b/gi,
      /\b(documentation|docs|readme|guide)\b/gi,
      /\b(refactor|cleanup|technical.?debt)\b/gi,
      /\b(feature|functionality|implementation)\b/gi,
      /\b(bug|fix|error|issue|problem)\b/gi,
      /\b(config|configuration|settings|env)\b/gi
    ];
    
    const categoryMap = {
      'security|auth|authentication|authorization': 'Security',
      'performance|speed|optimization|fast|slow': 'Performance',
      'ui|ux|user.?experience|interface|design': 'UserExperience',
      'test|testing|coverage|spec|unit|integration': 'Testing',
      'deploy|deployment|build|ci|cd|pipeline': 'Deployment',
      'data|database|sql|query|migration': 'DataManagement',
      'api|endpoint|route|rest|graphql': 'ApiDevelopment',
      'documentation|docs|readme|guide': 'Documentation',
      'refactor|cleanup|technical.?debt': 'CodeQuality',
      'feature|functionality|implementation': 'Features',
      'bug|fix|error|issue|problem': 'BugFixes',
      'config|configuration|settings|env': 'Configuration'
    };
    
    for (const [pattern, category] of Object.entries(categoryMap)) {
      const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
      if (regex.test(text)) {
        categories.add(category);
      }
    }
    
    return Array.from(categories);
  }

  /**
   * Extract categories from file paths
   */
  extractFromFilePaths(files) {
    const categories = new Set();
    
    for (const file of files) {
      // Extract from directory structure
      if (file.includes('/')) {
        const parts = file.split('/');
        
        // Common directory patterns
        if (parts.includes('components') || parts.includes('ui')) categories.add('UserInterface');
        if (parts.includes('api') || parts.includes('routes')) categories.add('ApiDevelopment');
        if (parts.includes('lib') || parts.includes('utils')) categories.add('CoreUtilities');
        if (parts.includes('tests') || parts.includes('__tests__')) categories.add('Testing');
        if (parts.includes('docs') || parts.includes('documentation')) categories.add('Documentation');
        if (parts.includes('scripts')) categories.add('Tooling');
        if (parts.includes('config') || file.endsWith('.env')) categories.add('Configuration');
        if (parts.includes('styles') || parts.includes('css')) categories.add('Styling');
        if (parts.includes('public') || parts.includes('assets')) categories.add('Assets');
        if (parts.includes('migrations') || parts.includes('db')) categories.add('Database');
      }
      
      // Extract from file extensions
      if (file.endsWith('.md')) categories.add('Documentation');
      if (file.endsWith('.test.js') || file.endsWith('.spec.js')) categories.add('Testing');
      if (file.endsWith('.css') || file.endsWith('.scss')) categories.add('Styling');
      if (file.endsWith('.yml') || file.endsWith('.yaml')) categories.add('Configuration');
    }
    
    return Array.from(categories);
  }

  /**
   * Merge categories from different sources
   */
  mergeCategories(commitCats, docCats) {
    const merged = [];
    const seen = new Set();
    
    // Combine all categories
    const allCats = new Map([...commitCats, ...docCats]);
    
    for (const [name, data] of allCats) {
      if (!seen.has(name)) {
        seen.add(name);
        merged.push({
          name,
          count: data.count || 1,
          weight: data.weight || (data.count / 100), // Basic weight calculation
          sources: data.sources || [],
          fromCommits: commitCats.has(name),
          fromDocs: docCats.has(name)
        });
      }
    }
    
    // Sort by count (most mentioned first)
    merged.sort((a, b) => b.count - a.count);
    
    return merged;
  }

  /**
   * Use Claude to ensure categories are orthogonal
   */
  async ensureOrthogonality(categories) {
    // If Claude is not available, use heuristic approach
    if (!this.settings.claude?.enabled) {
      return this.heuristicOrthogonality(categories);
    }
    
    try {
      const prompt = this.generateOrthogonalityPrompt(categories);
      const result = await this.callClaude(prompt);
      
      if (result && result.categories) {
        return result.categories.map(cat => ({
          ...cat,
          orthogonal: true
        }));
      }
    } catch (error) {
      console.log('  ⚠️ Claude unavailable, using heuristic approach');
    }
    
    return this.heuristicOrthogonality(categories);
  }

  /**
   * Heuristic approach to ensure orthogonality
   */
  heuristicOrthogonality(categories) {
    const orthogonal = [];
    const used = new Set();
    
    // Group similar categories
    const groups = {
      'Development': ['Features', 'ApiDevelopment', 'CoreUtilities', 'Database', 'DataManagement'],
      'Quality': ['Testing', 'BugFixes', 'CodeQuality', 'Security'],
      'UserFacing': ['UserExperience', 'UserInterface', 'Styling', 'Assets'],
      'Operations': ['Deployment', 'Configuration', 'Tooling', 'Performance'],
      'Knowledge': ['Documentation']
    };
    
    // Pick the most mentioned from each group
    for (const [groupName, members] of Object.entries(groups)) {
      const groupCats = categories.filter(c => members.includes(c.name));
      if (groupCats.length > 0) {
        // Pick the one with highest count
        const best = groupCats.sort((a, b) => b.count - a.count)[0];
        if (!used.has(best.name)) {
          orthogonal.push({
            ...best,
            group: groupName,
            orthogonal: true
          });
          used.add(best.name);
        }
      }
    }
    
    // Add any unique categories not in groups
    for (const cat of categories) {
      if (!used.has(cat.name) && orthogonal.length < this.settings.shortlex.maxCategories) {
        // Check it's not too similar to existing
        const tooSimilar = orthogonal.some(o => this.similarity(o.name, cat.name) > 0.7);
        if (!tooSimilar) {
          orthogonal.push({
            ...cat,
            orthogonal: true
          });
          used.add(cat.name);
        }
      }
    }
    
    return orthogonal.slice(0, this.settings.shortlex.maxCategories || 7);
  }

  /**
   * Calculate similarity between two category names
   */
  similarity(a, b) {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    // Exact match
    if (aLower === bLower) return 1.0;
    
    // Substring match
    if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;
    
    // Common words
    const aWords = aLower.match(/[a-z]+/g) || [];
    const bWords = bLower.match(/[a-z]+/g) || [];
    const common = aWords.filter(w => bWords.includes(w)).length;
    if (common > 0) {
      return common / Math.max(aWords.length, bWords.length);
    }
    
    return 0;
  }

  /**
   * Apply ShortLex v2 sorting
   * Sort by: 1) depth, 2) weight, 3) lexicographic
   */
  shortlexSort(categories) {
    // Normalize weights to sum to 1
    const totalWeight = categories.reduce((sum, c) => sum + (c.weight || 1), 0);
    
    const normalized = categories.map(cat => ({
      ...cat,
      weight: (cat.weight || 1) / totalWeight,
      depth: 1 // All at same level for now
    }));
    
    // Sort by weight (descending), then name (ascending)
    normalized.sort((a, b) => {
      // First by weight
      if (Math.abs(a.weight - b.weight) > 0.01) {
        return b.weight - a.weight;
      }
      // Then lexicographic
      return a.name.localeCompare(b.name);
    });
    
    // Assign symbols
    const symbols = ['O', 'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ'];
    
    return normalized.map((cat, i) => ({
      ...cat,
      symbol: symbols[i] || `Cat${i + 1}`,
      index: i
    }));
  }

  /**
   * Generate Claude prompt for orthogonality
   */
  generateOrthogonalityPrompt(categories) {
    return `Analyze these software development categories and select 5-7 that are mutually orthogonal (correlation < 0.1).
    
Categories found (with occurrence count):
${categories.slice(0, 20).map(c => `- ${c.name}: ${c.count} occurrences`).join('\n')}

Requirements:
1. Categories must be mutually exclusive (a commit/file belongs primarily to ONE category)
2. Together they should cover most development work
3. Each should represent a distinct concern or responsibility
4. Prefer categories with higher occurrence counts

Return ONLY valid JSON:
{
  "categories": [
    { "name": "Security", "weight": 0.2, "description": "Authentication, authorization, data protection" },
    { "name": "Performance", "weight": 0.15, "description": "Speed, optimization, caching" },
    { "name": "UserExperience", "weight": 0.25, "description": "UI, UX, accessibility" },
    { "name": "DataManagement", "weight": 0.15, "description": "Database, queries, migrations" },
    { "name": "Testing", "weight": 0.15, "description": "Unit tests, integration, coverage" },
    { "name": "Documentation", "weight": 0.1, "description": "Guides, API docs, README" }
  ]
}`;
  }

  /**
   * Call Claude for analysis
   */
  async callClaude(prompt) {
    try {
      const promptFile = path.join(this.projectRoot, '.trust-debt-prompt.txt');
      fs.writeFileSync(promptFile, prompt);
      
      const command = `cat "${promptFile}" | claude --print 2>/dev/null`;
      const result = execSync(command, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10
      });
      
      if (fs.existsSync(promptFile)) {
        fs.unlinkSync(promptFile);
      }
      
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // Silent fail
    }
    
    return null;
  }

  /**
   * Normalize category name
   */
  normalizeCategory(text) {
    return text
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Check if text is a valid category
   */
  isValidCategory(text) {
    const blacklist = [
      'The', 'And', 'Or', 'But', 'For', 'With', 'From',
      'Overview', 'Introduction', 'Conclusion', 'Summary'
    ];
    
    const normalized = this.normalizeCategory(text);
    return !blacklist.includes(normalized) && 
           normalized.length > 2 && 
           normalized.length < 30;
  }

  /**
   * Cache categories for reuse
   */
  cacheCategories(categories) {
    const cacheDir = path.dirname(this.cacheFile);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    const cache = {
      timestamp: new Date().toISOString(),
      categories: categories,
      ttl: this.settings.cache?.ttl || 300
    };
    
    fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
  }

  /**
   * Load cached categories if still valid
   */
  loadCache() {
    if (!fs.existsSync(this.cacheFile)) return null;
    
    try {
      const cache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      const age = (Date.now() - new Date(cache.timestamp).getTime()) / 1000;
      
      if (age < (cache.ttl || 300)) {
        console.log('  ✓ Using cached categories (age: ' + Math.floor(age) + 's)');
        return cache.categories;
      }
    } catch (error) {
      // Invalid cache
    }
    
    return null;
  }
}

// Run if called directly
if (require.main === module) {
  const SettingsManager = require('./trust-debt-settings-manager');
  
  (async () => {
    const settingsManager = new SettingsManager();
    const settings = await settingsManager.load();
    
    const extractor = new ShortLexExtractor(settings);
    const categories = await extractor.extractCategories();
    
    console.log('\n📊 Extracted Categories for Matrix:');
    console.log(JSON.stringify(categories, null, 2));
  })();
}

module.exports = ShortLexExtractor;