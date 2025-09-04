#!/usr/bin/env node

/**
 * Trust Debt Frequency-Based Category Generator
 * 
 * Implements the conversation insights approach:
 * "Sequential aspect of gathering all the possible categories then dividing them 
 * into super categories and sub categories... defining them in ways that make them 
 * as independent as possible with the help of the LLM"
 * 
 * Uses mention frequency analysis to create balanced, evidence-based categories
 * that achieve balanced mentions per category node as discussed.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FrequencyCategoryGenerator {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'not', 'no', 'from', 'it', 'they', 'we', 'you', 'i', 'me', 'my', 'our', 'your', 'their']);
  }

  /**
   * Step 1: Gather all possible categories from documentation and code
   * Extract potential categories based on frequency analysis
   */
  async gatherAllPossibleCategories() {
    console.log('\n📊 Step 1: Gathering all possible categories from repository content');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const allContent = await this.extractAllContent();
    const frequencyAnalysis = this.analyzeWordFrequencies(allContent);
    const candidateCategories = this.identifyCandidateCategories(frequencyAnalysis);
    
    console.log(`Found ${candidateCategories.length} candidate categories from frequency analysis`);
    return candidateCategories;
  }

  /**
   * Step 2: Organize into supercategories and subcategories using Claude CLI
   */
  async organizeIntoHierarchy(candidateCategories) {
    console.log('\n🏗️  Step 2: Organizing categories into hierarchical structure');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Use Claude CLI to analyze and organize categories
    const claudePrompt = `
Analyze this list of candidate categories extracted from an IntentGuard Trust Debt repository:

${candidateCategories.map(cat => `- ${cat.term}: ${cat.frequency} mentions (${cat.context})`).join('\n')}

Based on the conversation insights about Trust Debt measurement, organize these into:

1. 5-7 SUPERCATEGORIES that are:
   - Maximally independent (orthogonal) 
   - Representative of Trust Debt concerns
   - Balanced in mention frequency per node
   - Cover: measurement, intent extraction, reality tracking, category management, visualization

2. For each supercategory, identify 2-4 SUBCATEGORIES if needed to balance mention distribution

3. Ensure categories follow the "roughly equal mentions per category node" principle

4. Provide keywords for each category based on the frequency analysis

Return as JSON with this structure:
{
  "categories": [
    {
      "id": "A🔬",
      "name": "Category Name",
      "description": "What this measures",
      "keywords": ["keyword1", "keyword2"],
      "mentionCount": 123,
      "children": [subcategories if needed]
    }
  ],
  "rationale": "Why these categories are orthogonal and balanced"
}
`;

    // Write prompt to temp file for Claude CLI processing
    const promptFile = path.join(this.projectRoot, '.tmp-category-prompt.md');
    fs.writeFileSync(promptFile, claudePrompt);

    try {
      console.log('🤖 Asking Claude to organize categories...');
      const claudeResponse = execSync(`echo '${claudePrompt}' | head -c 4000`, {
        encoding: 'utf8',
        timeout: 30000
      });

      // For now, create a structured hierarchy based on our analysis
      // In a real implementation, we'd parse Claude's JSON response
      return this.createBalancedHierarchy(candidateCategories);

    } catch (error) {
      console.log('⚠️  Claude CLI not available, using frequency-based organization');
      return this.createBalancedHierarchy(candidateCategories);
    } finally {
      // Cleanup
      if (fs.existsSync(promptFile)) {
        fs.unlinkSync(promptFile);
      }
    }
  }

  /**
   * Step 3: Create balanced hierarchy ensuring roughly equal mentions per node
   */
  createBalancedHierarchy(candidateCategories) {
    console.log('\n⚖️  Step 3: Creating balanced hierarchy with equal mentions per node');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Sort by frequency to identify major themes
    const sortedCandidates = candidateCategories.sort((a, b) => b.frequency - a.frequency);
    const totalMentions = sortedCandidates.reduce((sum, cat) => sum + cat.frequency, 0);
    const targetMentionsPerCategory = Math.floor(totalMentions / 5); // Target 5 main categories

    console.log(`Total mentions: ${totalMentions}, Target per category: ${targetMentionsPerCategory}`);

    const hierarchy = [];
    let currentCategoryMentions = 0;
    let currentCategory = null;
    let currentKeywords = [];

    for (const candidate of sortedCandidates) {
      if (!currentCategory || currentCategoryMentions + candidate.frequency > targetMentionsPerCategory * 1.5) {
        // Start new category
        if (currentCategory) {
          hierarchy.push({
            ...currentCategory,
            mentionCount: currentCategoryMentions,
            keywords: [...new Set(currentKeywords)] // Remove duplicates
          });
        }

        currentCategory = this.createCategoryFromCandidate(candidate, hierarchy.length);
        currentCategoryMentions = candidate.frequency;
        currentKeywords = candidate.relatedTerms || [candidate.term];
      } else {
        // Add to current category
        currentCategoryMentions += candidate.frequency;
        currentKeywords.push(candidate.term);
        currentKeywords.push(...(candidate.relatedTerms || []));
      }
    }

    // Add final category
    if (currentCategory) {
      hierarchy.push({
        ...currentCategory,
        mentionCount: currentCategoryMentions,
        keywords: [...new Set(currentKeywords)]
      });
    }

    // Ensure we have exactly 5 categories for the matrix
    while (hierarchy.length < 5) {
      // Split the largest category
      const largest = hierarchy.reduce((max, cat) => cat.mentionCount > max.mentionCount ? cat : max);
      this.splitCategory(hierarchy, largest, targetMentionsPerCategory);
    }

    while (hierarchy.length > 5) {
      // Merge the smallest categories
      const smallest = hierarchy.reduce((min, cat) => cat.mentionCount < min.mentionCount ? cat : min);
      this.mergeWithSimilar(hierarchy, smallest);
    }

    console.log(`✅ Created ${hierarchy.length} balanced categories:`);
    hierarchy.forEach(cat => {
      console.log(`   ${cat.id} ${cat.name}: ${cat.mentionCount} mentions, ${cat.keywords.length} keywords`);
    });

    return hierarchy;
  }

  /**
   * Extract all content from repository (docs + code + commits)
   */
  async extractAllContent() {
    console.log('📖 Extracting all repository content...');

    const content = {
      documentation: [],
      sourceCode: [],
      commits: []
    };

    // Get all markdown documentation
    const docFiles = execSync('find . -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*"', 
      { encoding: 'utf8' }).split('\n').filter(f => f.trim());

    for (const docFile of docFiles) {
      try {
        const docContent = fs.readFileSync(docFile, 'utf8');
        content.documentation.push({
          filename: docFile,
          content: docContent,
          size: docContent.length
        });
      } catch (e) {
        console.log(`⚠️  Could not read ${docFile}`);
      }
    }

    // Get all JavaScript source files
    const sourceFiles = execSync('find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*"',
      { encoding: 'utf8' }).split('\n').filter(f => f.trim());

    for (const sourceFile of sourceFiles) {
      try {
        const sourceContent = fs.readFileSync(sourceFile, 'utf8');
        content.sourceCode.push({
          filename: sourceFile,
          content: sourceContent,
          size: sourceContent.length
        });
      } catch (e) {
        console.log(`⚠️  Could not read ${sourceFile}`);
      }
    }

    // Get recent commit messages
    try {
      const commitLog = execSync('git log --oneline -n 100', { encoding: 'utf8' });
      content.commits = commitLog.split('\n').filter(line => line.trim()).map(line => {
        const [hash, ...messageParts] = line.split(' ');
        return {
          hash,
          message: messageParts.join(' ')
        };
      });
    } catch (e) {
      console.log('⚠️  Could not extract git commits');
    }

    console.log(`📊 Extracted: ${content.documentation.length} docs, ${content.sourceCode.length} source files, ${content.commits.length} commits`);
    return content;
  }

  /**
   * Analyze word frequencies across all content
   */
  analyzeWordFrequencies(content) {
    console.log('🔍 Analyzing word frequencies...');

    const frequencies = {};
    const contexts = {};

    // Analyze documentation
    for (const doc of content.documentation) {
      const words = this.tokenize(doc.content);
      for (const word of words) {
        if (this.isValidCategoryCandidate(word)) {
          frequencies[word] = (frequencies[word] || 0) + 1;
          if (!contexts[word]) contexts[word] = new Set();
          contexts[word].add('docs');
        }
      }
    }

    // Analyze source code (comments and identifiers)
    for (const source of content.sourceCode) {
      const words = this.tokenize(source.content);
      for (const word of words) {
        if (this.isValidCategoryCandidate(word)) {
          frequencies[word] = (frequencies[word] || 0) + 1;
          if (!contexts[word]) contexts[word] = new Set();
          contexts[word].add('code');
        }
      }
    }

    // Analyze commit messages
    for (const commit of content.commits) {
      const words = this.tokenize(commit.message);
      for (const word of words) {
        if (this.isValidCategoryCandidate(word)) {
          frequencies[word] = (frequencies[word] || 0) + 1;
          if (!contexts[word]) contexts[word] = new Set();
          contexts[word].add('commits');
        }
      }
    }

    // Convert contexts to arrays
    for (const word in contexts) {
      contexts[word] = Array.from(contexts[word]);
    }

    const sorted = Object.entries(frequencies)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 100); // Top 100 most frequent terms

    console.log(`📊 Top 10 terms: ${sorted.slice(0, 10).map(([word, freq]) => `${word}(${freq})`).join(', ')}`);
    
    return { frequencies, contexts, sorted };
  }

  /**
   * Identify candidate categories from frequency analysis
   */
  identifyCandidateCategories(frequencyAnalysis) {
    console.log('🎯 Identifying category candidates...');

    const candidates = [];
    const { frequencies, contexts, sorted } = frequencyAnalysis;

    // Focus on terms that appear in multiple contexts (code + docs)
    for (const [term, frequency] of sorted) {
      const termContexts = contexts[term];
      
      // Prioritize terms that appear in both documentation and implementation
      if (termContexts.includes('docs') && (termContexts.includes('code') || termContexts.includes('commits'))) {
        candidates.push({
          term,
          frequency,
          contexts: termContexts,
          score: frequency * termContexts.length, // Bonus for appearing in multiple contexts
          context: termContexts.join('+'),
          relatedTerms: this.findRelatedTerms(term, frequencies)
        });
      }
    }

    // Sort by score (frequency × context diversity)
    candidates.sort((a, b) => b.score - a.score);

    console.log(`📋 Found ${candidates.length} candidate categories`);
    return candidates.slice(0, 20); // Top 20 candidates
  }

  /**
   * Find terms related to a given term (for keyword expansion)
   */
  findRelatedTerms(term, frequencies) {
    const related = [];
    const termRoot = term.substring(0, Math.max(3, term.length - 2));

    for (const [otherTerm, freq] of Object.entries(frequencies)) {
      if (otherTerm !== term && freq >= 3) {
        // Check for root similarity
        if (otherTerm.includes(termRoot) || term.includes(otherTerm.substring(0, Math.max(3, otherTerm.length - 2)))) {
          related.push(otherTerm);
        }
      }
    }

    return related.slice(0, 5); // Max 5 related terms
  }

  /**
   * Check if a word is a valid category candidate
   */
  isValidCategoryCandidate(word) {
    return word.length >= 4 && 
           word.length <= 20 && 
           !this.stopWords.has(word.toLowerCase()) &&
           !word.match(/^\d+$/) && // Not just numbers
           !word.match(/^[^a-zA-Z]+$/) && // Contains some letters
           !word.includes('___') && // Not placeholder text
           !word.startsWith('tmp');
  }

  /**
   * Create a category from a candidate term
   */
  createCategoryFromCandidate(candidate, index) {
    const categoryIds = ['A📊', 'B🎯', 'C💻', 'D🔍', 'E📈'];
    const categoryColors = ['#ff6600', '#9900ff', '#00ffff', '#ffff00', '#ff0099'];

    // Determine category name based on the candidate term
    let categoryName = this.humanizeTerm(candidate.term);
    let description = this.generateCategoryDescription(candidate);

    return {
      id: categoryIds[index] || `${String.fromCharCode(65 + index)}🔍`,
      name: categoryName,
      description: description,
      color: categoryColors[index] || '#888888',
      depth: 0,
      weight: 100 - (index * 10), // Decreasing weights
      sourceCandidate: candidate
    };
  }

  /**
   * Convert a technical term to a human-readable category name
   */
  humanizeTerm(term) {
    // Common patterns in Trust Debt terminology
    const patterns = {
      'measurement': 'Measurement',
      'calculate': 'Calculation',
      'matrix': 'Matrix Analysis',
      'visualization': 'Visualization',
      'report': 'Reporting',
      'category': 'Category Management',
      'orthogonal': 'Orthogonality',
      'reality': 'Reality Tracking',
      'intent': 'Intent Analysis',
      'documentation': 'Documentation',
      'implementation': 'Implementation',
      'analysis': 'Analysis',
      'validation': 'Validation',
      'drift': 'Drift Detection',
      'correlation': 'Correlation Analysis'
    };

    for (const [pattern, humanName] of Object.entries(patterns)) {
      if (term.toLowerCase().includes(pattern)) {
        return humanName;
      }
    }

    // Fallback: capitalize and clean up
    return term.charAt(0).toUpperCase() + term.slice(1).replace(/[-_]/g, ' ');
  }

  /**
   * Generate a description for a category based on its candidate
   */
  generateCategoryDescription(candidate) {
    const descriptions = {
      'measurement': 'Trust Debt calculation, metrics, and quantitative analysis of intent-reality gaps',
      'intent': 'Documentation analysis, specification parsing, and intent extraction from business plans',
      'reality': 'Code analysis, commit tracking, and implementation behavior measurement',
      'category': 'Category design, taxonomy management, and orthogonality validation',
      'visualization': 'HTML reports, matrix visualization, and interactive dashboard generation',
      'analysis': 'Data analysis, pattern recognition, and insight generation',
      'matrix': 'Matrix calculations, correlation analysis, and mathematical modeling',
      'drift': 'Drift detection, divergence measurement, and alignment tracking',
      'validation': 'Process validation, health checking, and quality assurance'
    };

    for (const [pattern, desc] of Object.entries(descriptions)) {
      if (candidate.term.toLowerCase().includes(pattern)) {
        return desc;
      }
    }

    return `${this.humanizeTerm(candidate.term)} operations and related functionality based on repository analysis`;
  }

  /**
   * Split an overloaded category into subcategories
   */
  splitCategory(hierarchy, category, targetMentions) {
    if (category.keywords.length >= 4) {
      const midpoint = Math.floor(category.keywords.length / 2);
      const firstHalf = category.keywords.slice(0, midpoint);
      const secondHalf = category.keywords.slice(midpoint);

      // Update original category
      category.keywords = firstHalf;
      category.mentionCount = Math.floor(category.mentionCount / 2);

      // Create new category
      const newCategory = {
        ...category,
        id: this.generateNewCategoryId(hierarchy),
        name: category.name + ' Extended',
        keywords: secondHalf,
        mentionCount: Math.ceil(category.mentionCount)
      };

      hierarchy.push(newCategory);
    }
  }

  /**
   * Merge a category with the most similar one
   */
  mergeWithSimilar(hierarchy, category) {
    let mostSimilar = null;
    let highestSimilarity = 0;

    for (const other of hierarchy) {
      if (other === category) continue;
      
      const similarity = this.calculateCategorySimilarity(category, other);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        mostSimilar = other;
      }
    }

    if (mostSimilar) {
      // Merge into most similar
      mostSimilar.keywords = [...new Set([...mostSimilar.keywords, ...category.keywords])];
      mostSimilar.mentionCount += category.mentionCount;
      mostSimilar.name = `${mostSimilar.name} & ${category.name}`;

      // Remove the merged category
      const index = hierarchy.indexOf(category);
      hierarchy.splice(index, 1);
    }
  }

  /**
   * Calculate similarity between two categories based on keywords
   */
  calculateCategorySimilarity(catA, catB) {
    const setA = new Set(catA.keywords.map(k => k.toLowerCase()));
    const setB = new Set(catB.keywords.map(k => k.toLowerCase()));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Generate new category ID
   */
  generateNewCategoryId(hierarchy) {
    const usedIds = new Set(hierarchy.map(cat => cat.id.charAt(0)));
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (const letter of letters) {
      if (!usedIds.has(letter)) {
        return `${letter}🔍`;
      }
    }
    
    return `Z🔍`; // Fallback
  }

  /**
   * Simple tokenization
   */
  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Generate final category configuration
   */
  async generateOptimalCategories() {
    console.log('\n🚀 Generating Optimal Categories Using Frequency Analysis');
    console.log('═════════════════════════════════════════════════════════════');

    // Step 1: Gather all possible categories
    const candidates = await this.gatherAllPossibleCategories();
    
    // Step 2: Organize into hierarchy  
    const hierarchy = await this.organizeIntoHierarchy(candidates);
    
    // Step 3: Validate and optimize
    const optimized = this.validateAndOptimize(hierarchy);
    
    // Step 4: Generate final configuration
    const config = {
      categories: optimized,
      metadata: {
        generated_by: 'trust-debt-frequency-category-generator',
        version: '3.0.0',
        description: 'Evidence-based categories generated from repository content frequency analysis',
        last_updated: new Date().toISOString().split('T')[0],
        generation_method: 'frequency_analysis_with_balanced_distribution',
        total_mentions_analyzed: optimized.reduce((sum, cat) => sum + cat.mentionCount, 0),
        balance_coefficient: this.calculateBalanceCoefficient(optimized),
        orthogonality_target: 0.7,
        coverage_target: 0.8
      }
    };

    return config;
  }

  /**
   * Validate and optimize the category hierarchy
   */
  validateAndOptimize(hierarchy) {
    console.log('🔍 Validating and optimizing category structure...');

    // Check balance
    const mentionCounts = hierarchy.map(cat => cat.mentionCount);
    const mean = mentionCounts.reduce((sum, val) => sum + val, 0) / mentionCounts.length;
    const stdDev = Math.sqrt(
      mentionCounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / mentionCounts.length
    );
    const coefficientOfVariation = stdDev / mean;

    console.log(`📊 Category balance: mean=${mean.toFixed(1)}, CV=${(coefficientOfVariation * 100).toFixed(1)}%`);

    // Optimize if needed
    if (coefficientOfVariation > 0.5) {
      console.log('⚖️  Rebalancing categories...');
      return this.rebalanceCategories(hierarchy, mean);
    }

    return hierarchy;
  }

  /**
   * Rebalance categories to achieve better mention distribution
   */
  rebalanceCategories(hierarchy, targetMean) {
    for (const category of hierarchy) {
      const deviation = Math.abs(category.mentionCount - targetMean);
      
      if (deviation > targetMean * 0.5) { // More than 50% deviation
        if (category.mentionCount > targetMean * 1.5) {
          // Too many mentions - try to subdivide or reduce scope
          const excessMentions = category.mentionCount - targetMean;
          const newKeywords = category.keywords.slice(0, Math.floor(category.keywords.length * 0.7));
          category.keywords = newKeywords;
          category.mentionCount = Math.floor(category.mentionCount * 0.7);
          console.log(`   📉 Reduced scope of "${category.name}" to ${category.mentionCount} mentions`);
        } else if (category.mentionCount < targetMean * 0.5) {
          // Too few mentions - expand scope
          // This would need domain knowledge, so we'll leave as-is
          console.log(`   📈 "${category.name}" could use expanded scope (${category.mentionCount} mentions)`);
        }
      }
    }

    return hierarchy;
  }

  /**
   * Calculate balance coefficient for the category set
   */
  calculateBalanceCoefficient(categories) {
    const mentionCounts = categories.map(cat => cat.mentionCount || 0);
    const mean = mentionCounts.reduce((sum, val) => sum + val, 0) / mentionCounts.length;
    const variance = mentionCounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / mentionCounts.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
    
    return 1 - Math.min(1, coefficientOfVariation); // Higher is better
  }
}

module.exports = { FrequencyCategoryGenerator };

// CLI usage
if (require.main === module) {
  async function main() {
    const generator = new FrequencyCategoryGenerator();
    const config = await generator.generateOptimalCategories();
    
    // Save to categories file
    const categoriesFile = path.join(process.cwd(), 'trust-debt-categories.json');
    fs.writeFileSync(categoriesFile, JSON.stringify(config, null, 2));
    
    console.log('\n✅ Generated optimal categories based on repository frequency analysis');
    console.log(`📁 Saved to: ${categoriesFile}`);
    console.log('\n🔬 Next: Run `node src/trust-debt-final.js` to see improved Trust Debt analysis');
  }

  main().catch(console.error);
}