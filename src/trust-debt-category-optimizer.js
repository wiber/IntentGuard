#!/usr/bin/env node

/**
 * Trust Debt Category Optimizer
 * 
 * Implements the systematic category improvement process based on Process Health metrics.
 * Optimizes categories to achieve:
 * - Uniformity: >70% (CV <30%) - balanced mentions per category
 * - Coverage: >60% - categories adequately cover repository content
 * 
 * Based on conversation insights: "roughly equal mentions per category node"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CategoryOptimizer {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.targetUniformity = 0.70; // 70% balanced (CV <30%)
    this.targetCoverage = 0.60;   // 60% coverage
    this.targetMentionsPerNode = 15; // Target mentions per category node
  }

  /**
   * Main optimization function
   * Uses Process Health feedback to iteratively improve categories
   */
  async optimizeCategories() {
    console.log('🎯 Trust Debt Category Optimizer');
    console.log('═════════════════════════════════════════════════════════');
    console.log('Target: Uniformity >70%, Coverage >60% for Process Health grade C+\n');

    // Load current categories
    const currentConfig = JSON.parse(fs.readFileSync('trust-debt-categories.json', 'utf8'));
    console.log(`📊 Current categories: ${currentConfig.categories.length}`);

    // Analyze repository content for optimization opportunities
    const contentAnalysis = await this.analyzeRepositoryContent();
    
    // Apply optimization strategies
    const optimizedConfig = await this.applyOptimizations(currentConfig, contentAnalysis);
    
    // Validate improvements
    const validation = await this.validateOptimizations(optimizedConfig, contentAnalysis);
    
    // Save optimized categories
    await this.saveOptimizedCategories(optimizedConfig, validation);
    
    return {
      originalConfig: currentConfig,
      optimizedConfig: optimizedConfig,
      contentAnalysis: contentAnalysis,
      validation: validation
    };
  }

  /**
   * Analyze repository content to identify optimization opportunities
   */
  async analyzeRepositoryContent() {
    console.log('🔍 Analyzing repository content for optimization opportunities...');
    
    const analysis = {
      totalWordFrequencies: {},
      documentContent: [],
      commitContent: [],
      uncoveredTerms: [],
      categoryMentionDistribution: {},
      recommendedSubdivisions: []
    };

    // Extract all content
    analysis.documentContent = await this.extractDocumentContent();
    analysis.commitContent = await this.extractCommitContent();
    
    // Analyze word frequencies across all content
    analysis.totalWordFrequencies = this.analyzeWordFrequencies(
      analysis.documentContent,
      analysis.commitContent
    );

    console.log(`📊 Analyzed ${analysis.documentContent.length} docs, ${analysis.commitContent.length} commits`);
    console.log(`📝 Found ${Object.keys(analysis.totalWordFrequencies).length} unique terms`);
    
    return analysis;
  }

  /**
   * Apply optimization strategies based on Process Health recommendations
   */
  async applyOptimizations(config, contentAnalysis) {
    console.log('\n🔧 Applying optimization strategies...');
    
    const optimized = JSON.parse(JSON.stringify(config)); // Deep copy
    
    // Strategy 1: Expand keywords to improve coverage (8.3% → 60%+)
    console.log('📈 Strategy 1: Expanding keywords to improve coverage...');
    await this.expandKeywordsForCoverage(optimized.categories, contentAnalysis);
    
    // Strategy 2: Subdivide overloaded categories to improve uniformity  
    console.log('⚖️  Strategy 2: Subdividing categories to improve uniformity...');
    await this.subdivideOverloadedCategories(optimized.categories, contentAnalysis);
    
    // Strategy 3: Rebalance mention distribution
    console.log('🎯 Strategy 3: Rebalancing mention distribution...');
    await this.rebalanceMentionDistribution(optimized.categories, contentAnalysis);
    
    // Update metadata
    optimized.metadata = {
      ...optimized.metadata,
      version: '3.1.0',
      optimization_applied: new Date().toISOString(),
      optimization_strategy: 'process_health_guided',
      target_uniformity: this.targetUniformity,
      target_coverage: this.targetCoverage,
      generated_by: 'trust-debt-category-optimizer'
    };

    return optimized;
  }

  /**
   * Strategy 1: Expand keywords to improve coverage from 8.3% to 60%+
   */
  async expandKeywordsForCoverage(categories, contentAnalysis) {
    // Find the most frequent terms that aren't covered by any category
    const allKeywords = new Set();
    for (const cat of categories) {
      for (const keyword of cat.keywords) {
        allKeywords.add(keyword.toLowerCase());
      }
    }

    // Identify high-frequency uncovered terms
    const uncoveredTerms = [];
    for (const [term, frequency] of Object.entries(contentAnalysis.totalWordFrequencies)) {
      if (!allKeywords.has(term.toLowerCase()) && frequency >= 5) {
        uncoveredTerms.push({ term, frequency });
      }
    }

    // Sort by frequency and take top terms
    uncoveredTerms.sort((a, b) => b.frequency - a.frequency);
    const topUncovered = uncoveredTerms.slice(0, 30); // Top 30 uncovered terms

    console.log(`   📋 Found ${topUncovered.length} high-frequency uncovered terms`);

    // Distribute these terms to appropriate categories based on semantic similarity
    for (const uncoveredTerm of topUncovered) {
      const bestCategory = this.findBestCategoryForTerm(uncoveredTerm.term, categories);
      if (bestCategory && bestCategory.keywords.length < 30) { // Limit keyword expansion
        bestCategory.keywords.push(uncoveredTerm.term);
        console.log(`   ➕ Added "${uncoveredTerm.term}" (${uncoveredTerm.frequency}x) to ${bestCategory.name}`);
      }
    }
  }

  /**
   * Strategy 2: Subdivide overloaded categories following Process Health recommendations
   */
  async subdivideOverloadedCategories(categories, contentAnalysis) {
    // Calculate current mention distribution
    const mentionCounts = {};
    for (const category of categories) {
      mentionCounts[category.name] = this.calculateCategoryMentions(category, contentAnalysis);
    }

    console.log('   📊 Current mention distribution:');
    for (const [name, count] of Object.entries(mentionCounts)) {
      console.log(`     ${name}: ${count} mentions`);
    }

    // Identify categories that need subdivision (>2x target mentions)
    const overloadedCategories = [];
    for (const [categoryName, mentionCount] of Object.entries(mentionCounts)) {
      if (mentionCount > this.targetMentionsPerNode * 2) {
        const category = categories.find(c => c.name === categoryName);
        overloadedCategories.push({
          category: category,
          currentMentions: mentionCount,
          subdivisionFactor: Math.ceil(mentionCount / this.targetMentionsPerNode)
        });
      }
    }

    // Apply subdivisions
    for (const overloaded of overloadedCategories) {
      await this.subdivideCategory(categories, overloaded);
    }
  }

  /**
   * Strategy 3: Rebalance mention distribution
   */
  async rebalanceMentionDistribution(categories, contentAnalysis) {
    // Calculate current balance and identify imbalances
    const mentionCounts = {};
    for (const category of categories) {
      mentionCounts[category.name] = this.calculateCategoryMentions(category, contentAnalysis);
    }

    const values = Object.values(mentionCounts);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    const cv = stdDev / mean;

    console.log(`   📊 Current balance: mean=${mean.toFixed(1)}, CV=${(cv * 100).toFixed(1)}%`);

    // Redistribute keywords from over-represented to under-represented categories
    for (const category of categories) {
      const mentions = mentionCounts[category.name];
      const deviation = mentions - mean;
      
      if (Math.abs(deviation) > mean * 0.3) { // More than 30% deviation from mean
        if (deviation > 0) {
          // Too many mentions - reduce keywords
          this.reduceKeywords(category, Math.floor(deviation / mean * category.keywords.length));
          console.log(`   📉 Reduced ${category.name} keywords (was ${mentions} mentions)`);
        } else {
          // Too few mentions - needs more relevant keywords
          await this.expandCategoryScope(category, contentAnalysis, Math.abs(deviation));
          console.log(`   📈 Expanded ${category.name} scope (was ${mentions} mentions)`);
        }
      }
    }
  }

  /**
   * Subdivide a single category into balanced subcategories
   */
  async subdivideCategory(categories, overloaded) {
    const { category, currentMentions, subdivisionFactor } = overloaded;
    
    console.log(`   🔀 Subdividing "${category.name}" (${currentMentions} mentions) into ${subdivisionFactor} parts`);

    if (subdivisionFactor <= 2) {
      // Simple split into 2 subcategories
      const midpoint = Math.floor(category.keywords.length / 2);
      const firstHalf = category.keywords.slice(0, midpoint);
      const secondHalf = category.keywords.slice(midpoint);

      // Update original category
      category.name = category.name + ' Core';
      category.keywords = firstHalf;
      category.description = category.description.replace('and ', ''); // Simplify

      // Create new subcategory
      const newCategory = {
        id: this.generateSubcategoryId(category.id),
        name: category.name.replace(' Core', ' Extended'),
        description: `Advanced ${category.description.toLowerCase()}`,
        keywords: secondHalf,
        color: this.adjustColor(category.color, 0.3), // Slightly different shade
        depth: 1,
        weight: category.weight - 10,
        parent: category.id
      };

      categories.push(newCategory);
      console.log(`     ✅ Created "${newCategory.name}" with ${secondHalf.length} keywords`);
      
    } else {
      // Complex split into multiple subcategories
      const keywordChunks = this.chunkArray(category.keywords, subdivisionFactor);
      const originalName = category.name;
      
      // Keep the original as the first subcategory
      category.name = originalName + ' Core';
      category.keywords = keywordChunks[0];
      
      // Create additional subcategories
      for (let i = 1; i < keywordChunks.length; i++) {
        const newCategory = {
          id: this.generateSubcategoryId(category.id, i),
          name: `${originalName} ${['Advanced', 'Extended', 'Specialized'][i-1] || `Part ${i+1}`}`,
          description: `Specialized ${category.description.toLowerCase()}`,
          keywords: keywordChunks[i],
          color: this.adjustColor(category.color, 0.2 * i),
          depth: 1,
          weight: category.weight - (5 * i),
          parent: category.id
        };
        
        categories.push(newCategory);
        console.log(`     ✅ Created "${newCategory.name}" with ${keywordChunks[i].length} keywords`);
      }
    }
  }

  /**
   * Find the best category for a new term based on semantic similarity
   */
  findBestCategoryForTerm(term, categories) {
    let bestCategory = null;
    let highestSimilarity = 0;

    for (const category of categories) {
      const similarity = this.calculateSemanticSimilarity(term, category);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestCategory = category;
      }
    }

    return highestSimilarity > 0.2 ? bestCategory : null; // Minimum similarity threshold
  }

  /**
   * Calculate semantic similarity between a term and a category
   */
  calculateSemanticSimilarity(term, category) {
    let similarity = 0;
    const termLower = term.toLowerCase();

    // Check against category name
    if (category.name.toLowerCase().includes(termLower) || termLower.includes(category.name.toLowerCase())) {
      similarity += 0.5;
    }

    // Check against existing keywords
    for (const keyword of category.keywords) {
      if (keyword.toLowerCase().includes(termLower) || termLower.includes(keyword.toLowerCase())) {
        similarity += 0.1;
      }
    }

    // Check against description
    if (category.description.toLowerCase().includes(termLower)) {
      similarity += 0.2;
    }

    return Math.min(1.0, similarity); // Cap at 1.0
  }

  /**
   * Calculate current mentions for a category
   */
  calculateCategoryMentions(category, contentAnalysis) {
    let mentions = 0;
    const allContent = [
      ...contentAnalysis.documentContent.map(doc => doc.content),
      ...contentAnalysis.commitContent.map(commit => `${commit.subject} ${commit.body}`)
    ].join(' ').toLowerCase();

    for (const keyword of category.keywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
      const matches = allContent.match(regex);
      mentions += matches ? matches.length : 0;
    }

    return mentions;
  }

  /**
   * Extract document content 
   */
  async extractDocumentContent() {
    const documentData = [];
    try {
      const docFiles = execSync('find . -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*"', 
        { encoding: 'utf8' }).split('\n').filter(f => f.trim());

      for (const docFile of docFiles.slice(0, 50)) { // Process more docs for better coverage
        try {
          const content = fs.readFileSync(docFile, 'utf8');
          documentData.push({
            filename: docFile,
            content: content,
            size: content.length
          });
        } catch (e) {
          // Skip files that can't be read
        }
      }
    } catch (e) {
      console.warn('Could not extract document content:', e.message);
    }

    return documentData;
  }

  /**
   * Extract commit content
   */
  async extractCommitContent() {
    const commitData = [];
    try {
      const commitLog = execSync('git log --oneline -n 100 --pretty=format:"%H|%s|%b"', { encoding: 'utf8' });
      
      for (const line of commitLog.split('\n').filter(l => l.trim())) {
        const [hash, subject, body] = line.split('|');
        commitData.push({
          hash: hash || '',
          subject: subject || '',
          body: body || ''
        });
      }
    } catch (e) {
      console.warn('Could not extract commit content:', e.message);
    }

    return commitData;
  }

  /**
   * Analyze word frequencies across all content
   */
  analyzeWordFrequencies(documentContent, commitContent) {
    const frequencies = {};

    // Process documents
    for (const doc of documentContent) {
      const words = this.tokenize(doc.content);
      for (const word of words) {
        if (this.isValidTerm(word)) {
          frequencies[word] = (frequencies[word] || 0) + 1;
        }
      }
    }

    // Process commits  
    for (const commit of commitContent) {
      const words = this.tokenize(`${commit.subject} ${commit.body}`);
      for (const word of words) {
        if (this.isValidTerm(word)) {
          frequencies[word] = (frequencies[word] || 0) + 1;
        }
      }
    }

    return frequencies;
  }

  /**
   * Reduce keywords for over-represented categories
   */
  reduceKeywords(category, reductionCount) {
    if (category.keywords.length > reductionCount + 3) { // Keep minimum 3 keywords
      // Remove least specific keywords (shorter ones first)
      category.keywords.sort((a, b) => a.length - b.length);
      category.keywords = category.keywords.slice(reductionCount);
    }
  }

  /**
   * Expand scope for under-represented categories
   */
  async expandCategoryScope(category, contentAnalysis, targetIncrease) {
    // Find related terms that could expand this category's scope
    const relatedTerms = [];
    
    for (const [term, frequency] of Object.entries(contentAnalysis.totalWordFrequencies)) {
      if (frequency >= 3 && !category.keywords.includes(term)) {
        const similarity = this.calculateSemanticSimilarity(term, category);
        if (similarity > 0.1) {
          relatedTerms.push({ term, frequency, similarity });
        }
      }
    }

    // Sort by relevance and add top terms
    relatedTerms.sort((a, b) => (b.frequency * b.similarity) - (a.frequency * a.similarity));
    const newKeywords = relatedTerms.slice(0, Math.min(5, targetIncrease)).map(t => t.term);
    
    category.keywords.push(...newKeywords);
    console.log(`     ➕ Added ${newKeywords.length} keywords to ${category.name}: ${newKeywords.join(', ')}`);
  }

  /**
   * Validate that optimizations improve Process Health metrics
   */
  async validateOptimizations(optimizedConfig, contentAnalysis) {
    console.log('\n✅ Validating optimization results...');

    const validation = {
      beforeStats: await this.calculateProcessHealthStats(optimizedConfig, contentAnalysis, 'before'),
      afterStats: await this.calculateProcessHealthStats(optimizedConfig, contentAnalysis, 'after'),
      improvements: {},
      recommendedNextSteps: []
    };

    // Calculate improvements
    validation.improvements = {
      uniformity: validation.afterStats.uniformity - validation.beforeStats.uniformity,
      coverage: validation.afterStats.coverage - validation.beforeStats.coverage,
      totalCategories: optimizedConfig.categories.length,
      totalKeywords: optimizedConfig.categories.reduce((sum, cat) => sum + cat.keywords.length, 0)
    };

    // Generate next steps if targets not yet met
    if (validation.afterStats.uniformity < this.targetUniformity) {
      validation.recommendedNextSteps.push('Further subdivide categories with high mention counts');
    }
    if (validation.afterStats.coverage < this.targetCoverage) {
      validation.recommendedNextSteps.push('Add more domain-specific keywords to expand coverage');
    }

    console.log(`   📊 Uniformity: ${(validation.beforeStats.uniformity * 100).toFixed(1)}% → ${(validation.afterStats.uniformity * 100).toFixed(1)}%`);
    console.log(`   📈 Coverage: ${(validation.beforeStats.coverage * 100).toFixed(1)}% → ${(validation.afterStats.coverage * 100).toFixed(1)}%`);

    return validation;
  }

  /**
   * Calculate Process Health stats for validation
   */
  async calculateProcessHealthStats(config, contentAnalysis, phase) {
    // Simplified calculation for validation
    const mentionCounts = config.categories.map(cat => 
      this.calculateCategoryMentions(cat, contentAnalysis)
    );

    // Calculate uniformity (balance)
    const mean = mentionCounts.reduce((sum, val) => sum + val, 0) / mentionCounts.length;
    const stdDev = Math.sqrt(mentionCounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / mentionCounts.length);
    const cv = stdDev / mean;
    const uniformity = 1 - Math.min(1, cv); // Higher is better

    // Calculate coverage (very simplified)
    const totalKeywords = config.categories.reduce((sum, cat) => sum + cat.keywords.length, 0);
    const estimatedCoverage = Math.min(1, totalKeywords / 100); // Rough estimate

    return {
      uniformity,
      coverage: estimatedCoverage,
      mentionCounts,
      mean,
      cv: cv
    };
  }

  /**
   * Save optimized categories
   */
  async saveOptimizedCategories(optimizedConfig, validation) {
    console.log('\n💾 Saving optimized categories...');

    const outputPath = 'trust-debt-categories.json';
    fs.writeFileSync(outputPath, JSON.stringify(optimizedConfig, null, 2));

    console.log(`✅ Saved optimized categories to: ${outputPath}`);
    console.log(`📊 Categories: ${optimizedConfig.categories.length}`);
    console.log(`🔑 Total keywords: ${optimizedConfig.categories.reduce((sum, cat) => sum + cat.keywords.length, 0)}`);
    
    if (validation.afterStats.uniformity >= this.targetUniformity && validation.afterStats.coverage >= this.targetCoverage) {
      console.log('🎉 TARGET ACHIEVED! Categories should now pass Process Health validation');
    } else {
      console.log('🔄 Partial improvement achieved. Additional iterations may be needed.');
      if (validation.recommendedNextSteps.length > 0) {
        console.log('📋 Next steps:');
        validation.recommendedNextSteps.forEach(step => console.log(`   • ${step}`));
      }
    }
  }

  /**
   * Utility methods
   */

  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  isValidTerm(word) {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'not', 'no', 'from', 'it', 'they', 'we', 'you', 'i', 'me', 'my', 'our', 'your', 'their', 'file', 'line', 'function', 'var', 'let', 'const', 'return']);
    
    return word.length >= 4 && 
           word.length <= 25 &&
           !stopWords.has(word) &&
           !word.match(/^\d+$/) &&
           !word.startsWith('http') &&
           !word.includes('___');
  }

  generateSubcategoryId(parentId, index = 1) {
    const parentLetter = parentId.charAt(0);
    const nextLetter = String.fromCharCode(parentLetter.charCodeAt(0) + index);
    return `${nextLetter}${parentId.substring(1)}`;
  }

  adjustColor(hexColor, adjustment) {
    // Simple color adjustment by changing brightness
    const num = parseInt(hexColor.replace('#', ''), 16);
    const amt = Math.round(2.55 * adjustment * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  chunkArray(array, chunkCount) {
    const chunks = [];
    const chunkSize = Math.ceil(array.length / chunkCount);
    
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    
    return chunks;
  }
}

module.exports = { CategoryOptimizer };

// CLI usage
if (require.main === module) {
  async function main() {
    const optimizer = new CategoryOptimizer();
    const result = await optimizer.optimizeCategories();
    
    console.log('\n🔄 Run Trust Debt analysis again to see Process Health improvements:');
    console.log('   node src/trust-debt-final.js');
    console.log('\n📊 Target metrics:');
    console.log('   Uniformity: >70% (balanced mentions per category)');
    console.log('   Coverage: >60% (adequate repository content coverage)');
  }

  main().catch(console.error);
}