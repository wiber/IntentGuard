#!/usr/bin/env node

/**
 * Trust Debt Cosine Similarity Category Analyzer
 * 
 * Uses cosine similarity to validate that categories accurately reflect
 * the repository content, as discussed in the conversation insights:
 * 
 * "We can use cosine similarity to compare the vector representations of 
 * code and documentation, giving us a numerical measure of their semantic 
 * similarity... These methods can help us quantify the relationship between 
 * our categories and the actual content, ensuring a more accurate measurement 
 * of Trust Debt."
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CosineCategoryAnalyzer {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can']);
  }

  /**
   * Analyze how well categories fit the actual codebase using cosine similarity
   */
  async analyzeCategoryCodeAlignment(categories, commitData, documentData) {
    console.log('\n🧮 Analyzing Category-Code Alignment with Cosine Similarity');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Extract and vectorize all content
    const codeVector = this.createContentVector(commitData, 'code');
    const docVector = this.createContentVector(documentData, 'docs');
    
    // Create category vectors
    const categoryVectors = {};
    const categoryCodeAlignments = {};
    const categoryDocAlignments = {};
    const categoryThemeAnalysis = {};

    for (const category of categories) {
      // Create category vector from keywords and definitions
      const categoryVector = this.createCategoryVector(category);
      categoryVectors[category.name] = categoryVector;

      // Calculate alignment with code and docs
      categoryCodeAlignments[category.name] = this.cosineSimilarity(categoryVector, codeVector);
      categoryDocAlignments[category.name] = this.cosineSimilarity(categoryVector, docVector);

      // Analyze themes in code that match this category
      categoryThemeAnalysis[category.name] = this.analyzeThemesForCategory(category, commitData, documentData);
    }

    // Calculate cross-category similarities for independence check
    const categorySimilarities = this.calculateCategorySimilarities(categoryVectors);

    // Overall alignment metrics
    const overallMetrics = this.calculateOverallMetrics(
      categoryCodeAlignments, 
      categoryDocAlignments, 
      categorySimilarities
    );

    return {
      codeVector,
      docVector,
      categoryVectors,
      categoryCodeAlignments,
      categoryDocAlignments,
      categoryThemeAnalysis,
      categorySimilarities,
      overallMetrics,
      recommendations: this.generateAlignmentRecommendations(overallMetrics, categoryCodeAlignments, categoryDocAlignments)
    };
  }

  /**
   * Create a vector representation of content (commits or documents)
   */
  createContentVector(data, type) {
    const wordCounts = {};
    const totalWords = {};

    for (const item of data) {
      let text = '';
      if (type === 'code') {
        text = `${item.subject} ${item.body}`.toLowerCase();
      } else {
        text = item.content.toLowerCase();
      }

      const words = this.tokenize(text);
      for (const word of words) {
        if (word.length > 2 && !this.stopWords.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
          totalWords[type] = (totalWords[type] || 0) + 1;
        }
      }
    }

    // Convert to normalized frequency vector
    const vector = {};
    for (const [word, count] of Object.entries(wordCounts)) {
      vector[word] = count / (totalWords[type] || 1);
    }

    return vector;
  }

  /**
   * Create a vector representation of a category based on its keywords and definitions
   */
  createCategoryVector(category) {
    const vector = {};
    
    // Add category name with high weight
    const nameWords = this.tokenize(category.name.toLowerCase());
    for (const word of nameWords) {
      if (word.length > 2 && !this.stopWords.has(word)) {
        vector[word] = (vector[word] || 0) + 5.0; // High weight for name
      }
    }

    // Add keywords with medium weight
    if (category.keywords) {
      for (const keyword of category.keywords) {
        const words = this.tokenize(keyword.toLowerCase());
        for (const word of words) {
          if (word.length > 2 && !this.stopWords.has(word)) {
            vector[word] = (vector[word] || 0) + 3.0; // Medium weight for keywords
          }
        }
      }
    }

    // Add description/definition words with lower weight
    if (category.description) {
      const descWords = this.tokenize(category.description.toLowerCase());
      for (const word of descWords) {
        if (word.length > 2 && !this.stopWords.has(word)) {
          vector[word] = (vector[word] || 0) + 1.0; // Low weight for description
        }
      }
    }

    // Normalize the vector
    const magnitude = Math.sqrt(Object.values(vector).reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (const word in vector) {
        vector[word] = vector[word] / magnitude;
      }
    }

    return vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vectorA, vectorB) {
    const allKeys = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (const key of allKeys) {
      const a = vectorA[key] || 0;
      const b = vectorB[key] || 0;
      
      dotProduct += a * b;
      magnitudeA += a * a;
      magnitudeB += b * b;
    }

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
  }

  /**
   * Analyze themes in code/docs that correspond to a specific category
   */
  analyzeThemesForCategory(category, commitData, documentData) {
    const themes = {
      codeThemes: [],
      docThemes: [],
      matchingCommits: [],
      matchingDocs: [],
      themeStrength: 0
    };

    // Analyze commits for category themes
    for (const commit of commitData) {
      const text = `${commit.subject} ${commit.body}`.toLowerCase();
      const alignment = this.calculateTextCategoryAlignment(text, category);
      
      if (alignment > 0.1) { // Threshold for relevance
        themes.matchingCommits.push({
          hash: commit.hash,
          subject: commit.subject,
          alignment
        });
        
        // Extract key themes from this commit
        const commitThemes = this.extractThemes(text);
        themes.codeThemes.push(...commitThemes);
      }
    }

    // Analyze documents for category themes
    for (const doc of documentData) {
      const alignment = this.calculateTextCategoryAlignment(doc.content.toLowerCase(), category);
      
      if (alignment > 0.1) {
        themes.matchingDocs.push({
          filename: doc.filename,
          alignment
        });

        // Extract key themes from this document
        const docThemes = this.extractThemes(doc.content.toLowerCase());
        themes.docThemes.push(...docThemes);
      }
    }

    // Calculate overall theme strength
    const totalMatches = themes.matchingCommits.length + themes.matchingDocs.length;
    const totalContent = commitData.length + documentData.length;
    themes.themeStrength = totalContent > 0 ? totalMatches / totalContent : 0;

    return themes;
  }

  /**
   * Calculate how well a text aligns with a category
   */
  calculateTextCategoryAlignment(text, category) {
    const textVector = this.createContentVector([{content: text}], 'docs');
    const categoryVector = this.createCategoryVector(category);
    return this.cosineSimilarity(textVector, categoryVector);
  }

  /**
   * Extract key themes (important n-grams) from text
   */
  extractThemes(text) {
    const words = this.tokenize(text);
    const themes = [];

    // Extract important bigrams and trigrams
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].length > 2 && words[i + 1].length > 2 && 
          !this.stopWords.has(words[i]) && !this.stopWords.has(words[i + 1])) {
        themes.push(`${words[i]} ${words[i + 1]}`);
      }
    }

    // Extract single important words
    for (const word of words) {
      if (word.length > 4 && !this.stopWords.has(word)) {
        themes.push(word);
      }
    }

    return themes;
  }

  /**
   * Calculate similarities between all category pairs
   */
  calculateCategorySimilarities(categoryVectors) {
    const similarities = {};
    const categories = Object.keys(categoryVectors);

    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const catA = categories[i];
        const catB = categories[j];
        const similarity = this.cosineSimilarity(categoryVectors[catA], categoryVectors[catB]);
        similarities[`${catA}-${catB}`] = similarity;
      }
    }

    return similarities;
  }

  /**
   * Calculate overall alignment metrics
   */
  calculateOverallMetrics(codeAlignments, docAlignments, similarities) {
    const codeValues = Object.values(codeAlignments);
    const docValues = Object.values(docAlignments);
    const simValues = Object.values(similarities);

    const avgCodeAlignment = codeValues.reduce((sum, val) => sum + val, 0) / codeValues.length;
    const avgDocAlignment = docValues.reduce((sum, val) => sum + val, 0) / docValues.length;
    const avgCategorySimilarity = simValues.reduce((sum, val) => sum + val, 0) / simValues.length;

    // Calculate alignment balance (how evenly categories align)
    const codeStdDev = this.calculateStdDev(codeValues);
    const docStdDev = this.calculateStdDev(docValues);

    return {
      avgCodeAlignment,
      avgDocAlignment,
      avgCategorySimilarity,
      codeAlignmentBalance: 1 - (codeStdDev / (avgCodeAlignment + 0.01)), // Higher is better
      docAlignmentBalance: 1 - (docStdDev / (avgDocAlignment + 0.01)),
      categoryIndependence: 1 - avgCategorySimilarity, // Higher is better
      overallFit: (avgCodeAlignment + avgDocAlignment) / 2,
      legitimacyScore: this.calculateLegitimacyScore(avgCodeAlignment, avgDocAlignment, avgCategorySimilarity)
    };
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate overall category legitimacy score (0-100)
   * Based on conversation insight: "tight fit of categories and subcategories"
   */
  calculateLegitimacyScore(codeAlign, docAlign, categorySim) {
    // Higher code/doc alignment is good, lower category similarity is good
    const alignmentScore = (codeAlign + docAlign) / 2; // 0-1
    const independenceScore = 1 - categorySim; // 0-1, higher is better
    
    // Combined score with weights
    const legitimacy = (alignmentScore * 0.7) + (independenceScore * 0.3);
    return Math.min(100, legitimacy * 100);
  }

  /**
   * Generate recommendations for improving category-code alignment
   */
  generateAlignmentRecommendations(metrics, codeAlignments, docAlignments) {
    const recommendations = [];

    // Overall fit recommendations
    if (metrics.overallFit < 0.3) {
      recommendations.push({
        priority: 'high',
        type: 'overall_fit',
        issue: `Poor overall category fit (${(metrics.overallFit * 100).toFixed(1)}%)`,
        action: 'Redesign categories to better match actual repository content'
      });
    }

    // Category independence recommendations
    if (metrics.categoryIndependence < 0.7) {
      recommendations.push({
        priority: 'high',
        type: 'independence',
        issue: `Categories are too similar (${(metrics.avgCategorySimilarity * 100).toFixed(1)}% avg similarity)`,
        action: 'Redesign categories to be more orthogonal and independent'
      });
    }

    // Specific category alignment issues
    for (const [category, codeAlign] of Object.entries(codeAlignments)) {
      const docAlign = docAlignments[category];
      
      if (codeAlign < 0.2) {
        recommendations.push({
          priority: 'medium',
          type: 'code_alignment',
          category,
          issue: `"${category}" poorly aligned with code (${(codeAlign * 100).toFixed(1)}%)`,
          action: `Update "${category}" keywords to better match actual code patterns`
        });
      }

      if (docAlign < 0.2) {
        recommendations.push({
          priority: 'medium',
          type: 'doc_alignment',
          category,
          issue: `"${category}" poorly aligned with documentation (${(docAlign * 100).toFixed(1)}%)`,
          action: `Update "${category}" definition to better match documentation themes`
        });
      }

      // Asymmetry detection
      const asymmetry = Math.abs(codeAlign - docAlign);
      if (asymmetry > 0.3) {
        const stronger = codeAlign > docAlign ? 'code' : 'documentation';
        const weaker = codeAlign > docAlign ? 'documentation' : 'code';
        recommendations.push({
          priority: 'low',
          type: 'asymmetry',
          category,
          issue: `"${category}" shows asymmetric alignment (stronger in ${stronger})`,
          action: `Either strengthen "${category}" presence in ${weaker} or adjust category definition`
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Simple tokenization (split on non-word characters)
   */
  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Generate HTML report for cosine alignment analysis
   */
  generateAlignmentReport(analysis) {
    const metrics = analysis.overallMetrics;
    const legitimacyColor = metrics.legitimacyScore >= 80 ? '#00ff88' : 
                           metrics.legitimacyScore >= 60 ? '#ffaa00' : '#ff6666';

    return `
      <div class="cosine-alignment-section" style="margin: 20px 0; padding: 20px; background: rgba(255, 255, 255, 0.02); border-radius: 10px;">
        <h3 style="color: #00aaff; margin-bottom: 15px;">
          🧮 Cosine Similarity Category Analysis
        </h3>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
          <div style="background: rgba(0, 255, 136, 0.05); padding: 15px; border-radius: 5px; border: 1px solid rgba(0, 255, 136, 0.2);">
            <h4 style="color: #00ff88; margin: 0 0 10px 0;">📝 Code Alignment</h4>
            <div style="color: #aaa;">
              Average: <strong>${(metrics.avgCodeAlignment * 100).toFixed(1)}%</strong><br/>
              Balance: <strong>${(metrics.codeAlignmentBalance * 100).toFixed(1)}%</strong><br/>
              Status: ${metrics.avgCodeAlignment >= 0.3 ? '✅ Good' : '⚠️ Needs work'}
            </div>
          </div>
          
          <div style="background: rgba(0, 170, 255, 0.05); padding: 15px; border-radius: 5px; border: 1px solid rgba(0, 170, 255, 0.2);">
            <h4 style="color: #00aaff; margin: 0 0 10px 0;">📚 Doc Alignment</h4>
            <div style="color: #aaa;">
              Average: <strong>${(metrics.avgDocAlignment * 100).toFixed(1)}%</strong><br/>
              Balance: <strong>${(metrics.docAlignmentBalance * 100).toFixed(1)}%</strong><br/>
              Status: ${metrics.avgDocAlignment >= 0.3 ? '✅ Good' : '⚠️ Needs work'}
            </div>
          </div>
          
          <div style="background: rgba(255, 170, 0, 0.05); padding: 15px; border-radius: 5px; border: 1px solid rgba(255, 170, 0, 0.2);">
            <h4 style="color: #ffaa00; margin: 0 0 10px 0;">🔄 Independence</h4>
            <div style="color: #aaa;">
              Score: <strong>${(metrics.categoryIndependence * 100).toFixed(1)}%</strong><br/>
              Avg Similarity: <strong>${(metrics.avgCategorySimilarity * 100).toFixed(1)}%</strong><br/>
              Status: ${metrics.categoryIndependence >= 0.7 ? '✅ Independent' : '⚠️ Correlated'}
            </div>
          </div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h4 style="color: ${legitimacyColor}; margin: 0 0 10px 0;">
            📈 Category Legitimacy Score: ${metrics.legitimacyScore.toFixed(1)}%
          </h4>
          <p style="color: #aaa; margin: 0; font-size: 0.9em;">
            This cosine similarity analysis measures how well your categories reflect the actual repository content.
            Higher scores indicate tighter fit and more reliable Trust Debt measurements.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <h4 style="color: #00ff88; margin-bottom: 10px;">📊 Category-Code Alignments</h4>
            <div style="max-height: 200px; overflow-y: auto; background: rgba(255, 255, 255, 0.02); padding: 10px; border-radius: 5px;">
              ${Object.entries(analysis.categoryCodeAlignments)
                .sort(([,a], [,b]) => b - a)
                .map(([cat, align]) => `
                  <div style="margin: 5px 0; display: flex; justify-content: space-between;">
                    <span style="color: #aaa;">${cat}:</span>
                    <span style="color: ${align >= 0.3 ? '#00ff88' : align >= 0.15 ? '#ffaa00' : '#ff6666'};">
                      ${(align * 100).toFixed(1)}%
                    </span>
                  </div>
                `).join('')}
            </div>
          </div>
          
          <div>
            <h4 style="color: #00aaff; margin-bottom: 10px;">📚 Category-Doc Alignments</h4>
            <div style="max-height: 200px; overflow-y: auto; background: rgba(255, 255, 255, 0.02); padding: 10px; border-radius: 5px;">
              ${Object.entries(analysis.categoryDocAlignments)
                .sort(([,a], [,b]) => b - a)
                .map(([cat, align]) => `
                  <div style="margin: 5px 0; display: flex; justify-content: space-between;">
                    <span style="color: #aaa;">${cat}:</span>
                    <span style="color: ${align >= 0.3 ? '#00ff88' : align >= 0.15 ? '#ffaa00' : '#ff6666'};">
                      ${(align * 100).toFixed(1)}%
                    </span>
                  </div>
                `).join('')}
            </div>
          </div>
        </div>

        ${analysis.recommendations.length > 0 ? `
        <div style="background: rgba(255, 170, 0, 0.05); padding: 15px; border-radius: 5px;">
          <h4 style="color: #ffaa00; margin: 0 0 15px 0;">🔧 Alignment Recommendations</h4>
          <ol style="color: #aaa; margin: 0; padding-left: 20px;">
            ${analysis.recommendations.slice(0, 5).map(rec => `
              <li style="margin-bottom: 10px;">
                <strong style="color: ${rec.priority === 'high' ? '#ff6666' : rec.priority === 'medium' ? '#ffaa00' : '#00aaff'};">
                  ${rec.priority.toUpperCase()}:
                </strong>
                ${rec.issue}<br/>
                <em style="color: #888;">→ ${rec.action}</em>
              </li>
            `).join('')}
          </ol>
        </div>
        ` : ''}
      </div>
    `;
  }
}

module.exports = { CosineCategoryAnalyzer };

// CLI usage
if (require.main === module) {
  console.log('🧮 Trust Debt Cosine Similarity Category Analyzer');
  console.log('Analyzes how well categories align with actual repository content using cosine similarity.');
  console.log('Import and use with: const { CosineCategoryAnalyzer } = require("./trust-debt-cosine-category-analyzer");');
}