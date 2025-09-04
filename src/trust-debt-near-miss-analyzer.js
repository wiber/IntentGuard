#!/usr/bin/env node

/**
 * Trust Debt Near-Miss Analyzer
 * 
 * Systematically analyzes ALL commit text and code to find "near misses" -
 * terms that should be categorized but aren't captured by current keywords.
 * 
 * This implements the user's insight: "running through all commit text and 
 * code for counting near misses to categories should be straightforward"
 * 
 * Goal: Achieve Process Health Coverage >60% (C grade or better)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class NearMissAnalyzer {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.minFrequency = 3; // Minimum frequency to consider a near miss
    this.semanticThreshold = 0.15; // Minimum semantic similarity for near miss
  }

  /**
   * Main analysis function - find all near misses and enhance categories
   */
  async analyzeNearMisses() {
    console.log('🔍 Trust Debt Near-Miss Analyzer');
    console.log('═════════════════════════════════════════════════════════');
    console.log('Goal: Achieve Process Health Coverage >60% through comprehensive analysis\n');

    // Load current categories
    const categories = JSON.parse(fs.readFileSync('trust-debt-categories.json', 'utf8')).categories;
    
    // Extract all repository content
    const allContent = await this.extractAllRepositoryContent();
    console.log(`📊 Total content items: ${allContent.totalItems}`);
    
    // Find current coverage
    const currentCoverage = this.analyzeCurrentCoverage(categories, allContent);
    console.log(`📈 Current coverage: ${(currentCoverage.percentage * 100).toFixed(1)}% (${currentCoverage.covered}/${allContent.totalItems} items)`);
    
    // Find near misses
    const nearMisses = this.findNearMisses(categories, allContent, currentCoverage);
    console.log(`🎯 Near misses found: ${nearMisses.length} potential keywords`);
    
    // Enhance categories with near misses
    const enhancedCategories = this.enhanceCategoriesWithNearMisses(categories, nearMisses);
    
    // Validate improvement
    const newCoverage = this.analyzeCurrentCoverage(enhancedCategories, allContent);
    console.log(`📊 Enhanced coverage: ${(newCoverage.percentage * 100).toFixed(1)}% (${newCoverage.covered}/${allContent.totalItems} items)`);
    console.log(`📈 Improvement: +${((newCoverage.percentage - currentCoverage.percentage) * 100).toFixed(1)}%`);
    
    // Save enhanced categories
    await this.saveEnhancedCategories(enhancedCategories, currentCoverage, newCoverage);
    
    return {
      originalCoverage: currentCoverage,
      enhancedCoverage: newCoverage,
      nearMisses: nearMisses,
      enhancedCategories: enhancedCategories
    };
  }

  /**
   * Extract ALL repository content systematically
   */
  async extractAllRepositoryContent() {
    console.log('📖 Extracting ALL repository content...');
    
    const content = {
      commits: [],
      sourceFiles: [],
      docs: [],
      totalItems: 0
    };

    // Get ALL commits (not just 50)
    try {
      const commitLog = execSync('git log --oneline --pretty=format:"%H|%s|%b"', { encoding: 'utf8' });
      content.commits = commitLog.split('\n').filter(line => line.trim()).map(line => {
        const [hash, subject, body] = line.split('|');
        return {
          type: 'commit',
          hash: hash || '',
          text: `${subject || ''} ${body || ''}`
        };
      });
    } catch (e) {
      console.warn('Could not extract commits:', e.message);
    }

    // Get ALL source files
    try {
      const sourceFiles = execSync('find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*"', 
        { encoding: 'utf8' }).split('\n').filter(f => f.trim());

      for (const sourceFile of sourceFiles) {
        try {
          const fileContent = fs.readFileSync(sourceFile, 'utf8');
          content.sourceFiles.push({
            type: 'source',
            filename: sourceFile,
            text: fileContent
          });
        } catch (e) {
          // Skip unreadable files
        }
      }
    } catch (e) {
      console.warn('Could not extract source files:', e.message);
    }

    // Get ALL documentation files
    try {
      const docFiles = execSync('find . -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*"', 
        { encoding: 'utf8' }).split('\n').filter(f => f.trim());

      for (const docFile of docFiles) {
        try {
          const docContent = fs.readFileSync(docFile, 'utf8');
          content.docs.push({
            type: 'doc',
            filename: docFile,
            text: docContent
          });
        } catch (e) {
          // Skip unreadable files
        }
      }
    } catch (e) {
      console.warn('Could not extract docs:', e.message);
    }

    content.totalItems = content.commits.length + content.sourceFiles.length + content.docs.length;
    
    console.log(`   📝 Commits: ${content.commits.length}`);
    console.log(`   💻 Source files: ${content.sourceFiles.length}`);
    console.log(`   📚 Docs: ${content.docs.length}`);
    console.log(`   📊 Total: ${content.totalItems} items`);

    return content;
  }

  /**
   * Analyze current category coverage across all content
   */
  analyzeCurrentCoverage(categories, allContent) {
    const coverage = {
      covered: 0,
      uncovered: 0,
      percentage: 0,
      categoryMatches: {},
      uncoveredItems: []
    };

    // Initialize category matches
    for (const category of categories) {
      coverage.categoryMatches[category.name] = 0;
    }

    // Check each content item
    const allContentItems = [
      ...allContent.commits,
      ...allContent.sourceFiles,
      ...allContent.docs
    ];

    for (const item of allContentItems) {
      let hasMatch = false;
      
      for (const category of categories) {
        if (this.itemMatchesCategory(item, category)) {
          coverage.categoryMatches[category.name]++;
          hasMatch = true;
          break; // Count each item only once
        }
      }
      
      if (hasMatch) {
        coverage.covered++;
      } else {
        coverage.uncovered++;
        coverage.uncoveredItems.push(item);
      }
    }

    coverage.percentage = allContentItems.length > 0 ? coverage.covered / allContentItems.length : 0;
    return coverage;
  }

  /**
   * Check if an item (commit/file/doc) matches any keywords in a category
   */
  itemMatchesCategory(item, category) {
    const text = item.text.toLowerCase();
    
    for (const keyword of category.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Find near misses - terms that frequently appear but aren't categorized
   */
  findNearMisses(categories, allContent, currentCoverage) {
    console.log('🔍 Finding near misses in uncovered content...');
    
    // Extract all unique terms from uncovered content
    const uncoveredTerms = {};
    const currentKeywords = new Set();
    
    // Build set of current keywords
    for (const category of categories) {
      for (const keyword of category.keywords) {
        currentKeywords.add(keyword.toLowerCase());
      }
    }

    // Analyze uncovered items for frequent terms
    for (const item of currentCoverage.uncoveredItems) {
      const words = this.tokenize(item.text);
      
      for (const word of words) {
        if (this.isValidNearMissCandidate(word, currentKeywords)) {
          uncoveredTerms[word] = (uncoveredTerms[word] || 0) + 1;
        }
      }
    }

    // Find high-frequency near misses
    const nearMisses = [];
    for (const [term, frequency] of Object.entries(uncoveredTerms)) {
      if (frequency >= this.minFrequency) {
        const bestCategory = this.findBestCategoryForNearMiss(term, categories);
        if (bestCategory) {
          nearMisses.push({
            term,
            frequency,
            bestCategory: bestCategory.category.name,
            similarity: bestCategory.similarity,
            impact: frequency // How many items this would cover
          });
        }
      }
    }

    // Sort by impact (frequency * similarity)
    nearMisses.sort((a, b) => (b.frequency * b.similarity) - (a.frequency * a.similarity));

    console.log(`   📊 Top 10 near misses:`);
    for (const nearMiss of nearMisses.slice(0, 10)) {
      console.log(`     "${nearMiss.term}" → ${nearMiss.bestCategory} (${nearMiss.frequency}x, ${(nearMiss.similarity * 100).toFixed(0)}% similar)`);
    }

    return nearMisses;
  }

  /**
   * Check if a word is a valid near miss candidate
   */
  isValidNearMissCandidate(word, currentKeywords) {
    return word.length >= 3 &&
           word.length <= 25 &&
           !currentKeywords.has(word) &&
           !this.isStopWord(word) &&
           !word.match(/^\d+$/) &&
           !word.startsWith('http') &&
           !word.includes('___') &&
           word.match(/^[a-z]/); // Starts with letter
  }

  /**
   * Check if word is a stop word
   */
  isStopWord(word) {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'not', 'no', 'from', 'it', 'they', 'we', 'you', 'i', 'me', 'my', 'our', 'your', 'their', 'file', 'line', 'function', 'var', 'let', 'const', 'return', 'if', 'else', 'true', 'false', 'null', 'undefined']);
    return stopWords.has(word);
  }

  /**
   * Find the best category for a near miss term
   */
  findBestCategoryForNearMiss(term, categories) {
    let bestMatch = null;
    let highestSimilarity = 0;

    for (const category of categories) {
      const similarity = this.calculateSemanticSimilarity(term, category);
      if (similarity > highestSimilarity && similarity >= this.semanticThreshold) {
        highestSimilarity = similarity;
        bestMatch = {
          category: category,
          similarity: similarity
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate semantic similarity between term and category
   */
  calculateSemanticSimilarity(term, category) {
    let similarity = 0;
    const termLower = term.toLowerCase();

    // Check against category name (highest weight)
    if (category.name.toLowerCase().includes(termLower) || termLower.includes(category.name.toLowerCase())) {
      similarity += 0.6;
    }

    // Check against description (medium weight)
    const descWords = category.description.toLowerCase().split(/\s+/);
    for (const descWord of descWords) {
      if (descWord.includes(termLower) || termLower.includes(descWord)) {
        similarity += 0.2;
        break;
      }
    }

    // Check against existing keywords (low weight)
    for (const keyword of category.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (keywordLower.includes(termLower) || termLower.includes(keywordLower)) {
        similarity += 0.1;
        break;
      }
    }

    // Domain-specific similarity for Trust Debt terms
    similarity += this.calculateDomainSpecificSimilarity(term, category);

    return Math.min(1.0, similarity);
  }

  /**
   * Calculate domain-specific similarity for Trust Debt concepts
   */
  calculateDomainSpecificSimilarity(term, category) {
    const domainMappings = {
      'Measurement': ['test', 'check', 'validate', 'verify', 'assess', 'evaluate', 'monitor', 'track', 'watch', 'observe', 'inspect', 'audit', 'review', 'examine'],
      'Intent Recognition': ['want', 'need', 'should', 'must', 'require', 'expect', 'hope', 'wish', 'desire', 'aim', 'target', 'goal', 'purpose', 'mission'],
      'Reality Tracking': ['actual', 'real', 'current', 'existing', 'present', 'live', 'active', 'running', 'operating', 'working', 'functioning', 'executing'],
      'Category Management': ['organize', 'sort', 'group', 'classify', 'categorize', 'arrange', 'order', 'structure', 'hierarchy', 'taxonomy', 'schema', 'model'],
      'Visualization': ['show', 'display', 'render', 'draw', 'plot', 'chart', 'graph', 'view', 'see', 'look', 'visual', 'image', 'picture', 'diagram']
    };

    const mappings = domainMappings[category.name] || [];
    
    for (const mapping of mappings) {
      if (term.includes(mapping) || mapping.includes(term)) {
        return 0.3;
      }
    }

    return 0;
  }

  /**
   * Enhance categories by adding the best near misses
   */
  enhanceCategoriesWithNearMisses(categories, nearMisses) {
    console.log('🚀 Enhancing categories with near misses...');
    
    const enhanced = JSON.parse(JSON.stringify(categories)); // Deep copy
    const maxNewKeywords = 20; // Limit per category to avoid bloat
    const addedKeywords = {};

    // Initialize counters
    for (const category of enhanced) {
      addedKeywords[category.name] = 0;
    }

    // Add near misses to appropriate categories
    for (const nearMiss of nearMisses) {
      const category = enhanced.find(c => c.name === nearMiss.bestCategory);
      
      if (category && addedKeywords[category.name] < maxNewKeywords) {
        // Check if keyword would be valuable (not too similar to existing)
        if (!this.isTooSimilarToExistingKeywords(nearMiss.term, category.keywords)) {
          category.keywords.push(nearMiss.term);
          addedKeywords[category.name]++;
          console.log(`   ➕ Added "${nearMiss.term}" to ${category.name} (${nearMiss.frequency}x frequency)`);
        }
      }
    }

    // Report additions
    console.log('\n📊 Keywords added per category:');
    for (const [categoryName, count] of Object.entries(addedKeywords)) {
      if (count > 0) {
        console.log(`   ${categoryName}: +${count} keywords`);
      }
    }

    return enhanced;
  }

  /**
   * Check if a new keyword is too similar to existing ones
   */
  isTooSimilarToExistingKeywords(newTerm, existingKeywords) {
    for (const existing of existingKeywords) {
      if (existing.toLowerCase().includes(newTerm.toLowerCase()) || 
          newTerm.toLowerCase().includes(existing.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  /**
   * Save enhanced categories
   */
  async saveEnhancedCategories(enhancedCategories, originalCoverage, newCoverage) {
    console.log('\n💾 Saving enhanced categories...');

    const config = {
      categories: enhancedCategories,
      metadata: {
        generated_by: 'trust-debt-near-miss-analyzer',
        version: '3.3.0',
        description: 'Enhanced categories with comprehensive near-miss analysis for improved coverage',
        last_updated: new Date().toISOString().split('T')[0],
        optimization_strategy: 'near_miss_comprehensive_coverage',
        category_count: enhancedCategories.length,
        total_keywords: enhancedCategories.reduce((sum, cat) => sum + cat.keywords.length, 0),
        coverage_improvement: {
          before: (originalCoverage.percentage * 100).toFixed(1) + '%',
          after: (newCoverage.percentage * 100).toFixed(1) + '%',
          improvement: '+' + ((newCoverage.percentage - originalCoverage.percentage) * 100).toFixed(1) + '%'
        },
        target_achieved: newCoverage.percentage >= 0.60 ? 'YES' : 'NO',
        notes: 'Enhanced through systematic near-miss analysis of all repository content'
      }
    };

    fs.writeFileSync('trust-debt-categories.json', JSON.stringify(config, null, 2));
    
    console.log(`✅ Saved enhanced categories`);
    console.log(`📊 Total keywords: ${config.metadata.total_keywords}`);
    console.log(`📈 Coverage improvement: ${config.metadata.coverage_improvement.improvement}`);
    
    if (newCoverage.percentage >= 0.60) {
      console.log('🎉 TARGET ACHIEVED! Coverage ≥60% - should achieve Process Health grade C+');
    } else {
      const remaining = (0.60 - newCoverage.percentage) * 100;
      console.log(`🔄 Need ${remaining.toFixed(1)}% more coverage to reach C+ grade target`);
    }
  }

  /**
   * Tokenize text into words
   */
  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }
}

module.exports = { NearMissAnalyzer };

// CLI usage
if (require.main === module) {
  async function main() {
    const analyzer = new NearMissAnalyzer();
    const result = await analyzer.analyzeNearMisses();
    
    console.log('\n🔄 Run Trust Debt analysis to test enhanced coverage:');
    console.log('   node src/trust-debt-final.js');
    console.log('\n🎯 Target: Process Health Coverage ≥60% for grade C+');
    
    if (result.enhancedCoverage.percentage >= 0.60) {
      console.log('🎉 Coverage target achieved! Process Health should show grade C+');
    }
  }

  main().catch(console.error);
}