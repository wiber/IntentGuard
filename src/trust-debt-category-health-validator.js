#!/usr/bin/env node

/**
 * Trust Debt Category Health Validator
 * 
 * Validates the statistical legitimacy of category structures by ensuring:
 * 1. Balanced mentions per category (no extreme imbalances)
 * 2. Statistical independence between categories 
 * 3. Tight fit to subject matter (cosine similarity validation)
 * 4. Appropriate subdivision (suggests subcategories for overloaded categories)
 * 
 * Based on conversation insights: categories should have roughly equal mentions
 * per node to avoid statistical noise and ensure valid Trust Debt measurements.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CategoryHealthValidator {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
  }

  /**
   * Validate category health for Trust Debt measurement legitimacy
   */
  async validateCategoryHealth(categories, commitData, documentData) {
    console.log('\n🔍 Validating Category Health');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const health = {
      distribution: this.analyzeDistribution(categories, commitData, documentData),
      independence: this.analyzeIndependence(categories, commitData, documentData),
      subjectFit: await this.analyzeSubjectFit(categories, commitData, documentData),
      subdivisionNeeds: this.analyzeSubdivisionNeeds(categories, commitData, documentData),
      overallScore: 0,
      recommendations: []
    };

    // Calculate overall health score
    health.overallScore = this.calculateOverallHealthScore(health);
    
    // Generate recommendations
    health.recommendations = this.generateRecommendations(health);

    console.log(`\n📊 Overall Category Health: ${health.overallScore.toFixed(1)}%`);
    
    return health;
  }

  /**
   * Analyze mention distribution across categories
   * Goal: Roughly equal mentions per category/node
   */
  analyzeDistribution(categories, commitData, documentData) {
    const mentions = {};
    const depths = {};
    
    // Count mentions in commits
    for (const commit of commitData) {
      const text = `${commit.subject} ${commit.body}`.toLowerCase();
      for (const category of categories) {
        const categoryMentions = this.countCategoryMentions(text, category);
        mentions[category.name] = (mentions[category.name] || 0) + categoryMentions;
        depths[category.name] = this.getCategoryDepth(category);
      }
    }

    // Count mentions in documents  
    for (const doc of documentData) {
      const text = doc.content.toLowerCase();
      for (const category of categories) {
        const categoryMentions = this.countCategoryMentions(text, category);
        mentions[category.name] = (mentions[category.name] || 0) + categoryMentions;
      }
    }

    // Calculate distribution metrics
    const mentionValues = Object.values(mentions);
    const mean = mentionValues.reduce((sum, val) => sum + val, 0) / mentionValues.length;
    const variance = mentionValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / mentionValues.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

    // Calculate per-node balance (accounting for category depth)
    const perNodeMentions = {};
    const nodeCount = {};
    
    for (const [catName, mentionCount] of Object.entries(mentions)) {
      const depth = depths[catName] || 1;
      const estimatedNodes = Math.pow(2, depth - 1); // Rough estimate of leaf nodes
      perNodeMentions[catName] = mentionCount / estimatedNodes;
      nodeCount[catName] = estimatedNodes;
    }

    const perNodeValues = Object.values(perNodeMentions);
    const perNodeMean = perNodeValues.reduce((sum, val) => sum + val, 0) / perNodeValues.length;
    const perNodeStdDev = Math.sqrt(
      perNodeValues.reduce((sum, val) => sum + Math.pow(val - perNodeMean, 2), 0) / perNodeValues.length
    );
    const perNodeCV = perNodeMean > 0 ? perNodeStdDev / perNodeMean : 0;

    return {
      mentions,
      perNodeMentions,
      nodeCount,
      mean,
      stdDev,
      coefficientOfVariation,
      perNodeMean,
      perNodeCV,
      score: Math.max(0, 100 - (perNodeCV * 100)), // Lower CV = better balance
      isHealthy: perNodeCV < 0.5, // Less than 50% variation is healthy
      extremeImbalances: this.findExtremeImbalances(perNodeMentions, perNodeMean, perNodeStdDev)
    };
  }

  /**
   * Count category mentions in text using keywords and patterns
   */
  countCategoryMentions(text, category) {
    let count = 0;
    
    // Check category name
    if (text.includes(category.name.toLowerCase())) count++;
    
    // Check symbol/emoji
    if (category.symbol && text.includes(category.symbol.toLowerCase())) count++;
    
    // Check keywords (if available)
    if (category.keywords) {
      for (const keyword of category.keywords) {
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
        const matches = text.match(regex);
        count += matches ? matches.length : 0;
      }
    }
    
    return count;
  }

  /**
   * Get category depth for hierarchical structures
   */
  getCategoryDepth(category) {
    if (category.children && category.children.length > 0) {
      return 1 + Math.max(...category.children.map(child => this.getCategoryDepth(child)));
    }
    return 1;
  }

  /**
   * Find categories with extreme imbalances (> 2 standard deviations)
   */
  findExtremeImbalances(perNodeMentions, mean, stdDev) {
    const imbalances = [];
    const threshold = 2 * stdDev;

    for (const [category, mentions] of Object.entries(perNodeMentions)) {
      const deviation = Math.abs(mentions - mean);
      if (deviation > threshold) {
        imbalances.push({
          category,
          mentions,
          deviation,
          type: mentions > mean ? 'overloaded' : 'underrepresented'
        });
      }
    }

    return imbalances.sort((a, b) => b.deviation - a.deviation);
  }

  /**
   * Analyze statistical independence between categories
   * Goal: Categories should be orthogonal/independent
   */
  analyzeIndependence(categories, commitData, documentData) {
    const cooccurrences = {};
    
    // Initialize co-occurrence matrix
    for (let i = 0; i < categories.length; i++) {
      for (let j = 0; j < categories.length; j++) {
        const key = `${categories[i].name}-${categories[j].name}`;
        cooccurrences[key] = 0;
      }
    }

    // Count co-occurrences in commits
    for (const commit of commitData) {
      const text = `${commit.subject} ${commit.body}`.toLowerCase();
      const presentCategories = [];
      
      for (const category of categories) {
        if (this.countCategoryMentions(text, category) > 0) {
          presentCategories.push(category.name);
        }
      }

      // Record co-occurrences
      for (let i = 0; i < presentCategories.length; i++) {
        for (let j = 0; j < presentCategories.length; j++) {
          const key = `${presentCategories[i]}-${presentCategories[j]}`;
          cooccurrences[key]++;
        }
      }
    }

    // Calculate correlation matrix
    const correlations = {};
    const diagonalSum = categories.reduce((sum, cat) => {
      const key = `${cat.name}-${cat.name}`;
      return sum + cooccurrences[key];
    }, 0);

    for (let i = 0; i < categories.length; i++) {
      for (let j = 0; j < categories.length; j++) {
        if (i !== j) {
          const key = `${categories[i].name}-${categories[j].name}`;
          const diagonal1 = cooccurrences[`${categories[i].name}-${categories[i].name}`];
          const diagonal2 = cooccurrences[`${categories[j].name}-${categories[j].name}`];
          
          if (diagonal1 > 0 && diagonal2 > 0) {
            correlations[key] = cooccurrences[key] / Math.sqrt(diagonal1 * diagonal2);
          } else {
            correlations[key] = 0;
          }
        }
      }
    }

    // Calculate average correlation (excluding diagonal)
    const correlationValues = Object.values(correlations);
    const avgCorrelation = correlationValues.length > 0 ? 
      correlationValues.reduce((sum, val) => sum + val, 0) / correlationValues.length : 0;

    return {
      cooccurrences,
      correlations,
      avgCorrelation,
      score: Math.max(0, 100 - (avgCorrelation * 100)), // Lower correlation = better independence
      isHealthy: avgCorrelation < 0.3, // Less than 30% correlation is healthy
      highCorrelations: this.findHighCorrelations(correlations, 0.5)
    };
  }

  /**
   * Find category pairs with suspiciously high correlation
   */
  findHighCorrelations(correlations, threshold = 0.5) {
    const high = [];
    for (const [pair, correlation] of Object.entries(correlations)) {
      if (correlation > threshold) {
        high.push({ pair, correlation });
      }
    }
    return high.sort((a, b) => b.correlation - a.correlation);
  }

  /**
   * Analyze how well categories fit the subject matter
   * Uses cosine similarity between category keywords and actual content
   */
  async analyzeSubjectFit(categories, commitData, documentData) {
    // This would ideally use proper NLP libraries, but for now we'll use keyword overlap
    const fits = {};
    
    for (const category of categories) {
      if (category.keywords) {
        const categoryKeywords = category.keywords.map(k => k.toLowerCase());
        let totalOverlap = 0;
        let totalPossible = 0;

        // Check fit against commits
        for (const commit of commitData) {
          const text = `${commit.subject} ${commit.body}`.toLowerCase().split(/\s+/);
          const overlap = categoryKeywords.filter(keyword => 
            text.some(word => word.includes(keyword) || keyword.includes(word))
          ).length;
          totalOverlap += overlap;
          totalPossible += categoryKeywords.length;
        }

        // Check fit against documents
        for (const doc of documentData) {
          const text = doc.content.toLowerCase().split(/\s+/);
          const overlap = categoryKeywords.filter(keyword => 
            text.some(word => word.includes(keyword) || keyword.includes(word))
          ).length;
          totalOverlap += overlap;
          totalPossible += categoryKeywords.length;
        }

        fits[category.name] = totalPossible > 0 ? totalOverlap / totalPossible : 0;
      } else {
        fits[category.name] = 0.5; // Default score if no keywords
      }
    }

    const fitValues = Object.values(fits);
    const avgFit = fitValues.reduce((sum, val) => sum + val, 0) / fitValues.length;

    return {
      fits,
      avgFit,
      score: avgFit * 100,
      isHealthy: avgFit > 0.3, // Above 30% keyword fit is healthy
      poorFits: this.findPoorFits(fits, 0.2)
    };
  }

  /**
   * Find categories with poor subject matter fit
   */
  findPoorFits(fits, threshold = 0.2) {
    const poor = [];
    for (const [category, fit] of Object.entries(fits)) {
      if (fit < threshold) {
        poor.push({ category, fit });
      }
    }
    return poor.sort((a, b) => a.fit - b.fit);
  }

  /**
   * Analyze which categories need subdivision
   * Goal: Identify overloaded categories that should be split into subcategories
   */
  analyzeSubdivisionNeeds(categories, commitData, documentData) {
    const needs = [];
    const distribution = this.analyzeDistribution(categories, commitData, documentData);

    for (const [category, mentions] of Object.entries(distribution.perNodeMentions)) {
      const targetMentionsPerNode = 10; // Ideal mentions per category node
      
      if (mentions > targetMentionsPerNode * 3) { // 3x threshold
        const suggestedSubcategories = Math.ceil(mentions / targetMentionsPerNode);
        needs.push({
          category,
          currentMentions: mentions,
          targetMentions: targetMentionsPerNode,
          overloadFactor: mentions / targetMentionsPerNode,
          suggestedSubcategories,
          priority: mentions > targetMentionsPerNode * 5 ? 'high' : 'medium'
        });
      }
    }

    return needs.sort((a, b) => b.overloadFactor - a.overloadFactor);
  }

  /**
   * Calculate overall category health score (0-100)
   */
  calculateOverallHealthScore(health) {
    const weights = {
      distribution: 0.4,  // Even distribution is most important
      independence: 0.3,  // Statistical independence is crucial  
      subjectFit: 0.3     // Relevance to subject matter
    };

    return (
      health.distribution.score * weights.distribution +
      health.independence.score * weights.independence +
      health.subjectFit.score * weights.subjectFit
    );
  }

  /**
   * Generate actionable recommendations for category improvement
   */
  generateRecommendations(health) {
    const recommendations = [];

    // Distribution recommendations
    if (!health.distribution.isHealthy) {
      recommendations.push({
        type: 'distribution',
        priority: 'high',
        issue: `Uneven mention distribution (${(health.distribution.perNodeCV * 100).toFixed(1)}% variation)`,
        action: 'Rebalance categories to achieve more even mention distribution per node'
      });

      for (const imbalance of health.distribution.extremeImbalances.slice(0, 3)) {
        if (imbalance.type === 'overloaded') {
          recommendations.push({
            type: 'subdivision',
            priority: 'medium',
            issue: `Category "${imbalance.category}" is overloaded (${imbalance.mentions.toFixed(1)} mentions per node)`,
            action: `Split "${imbalance.category}" into 2-3 subcategories to improve balance`
          });
        } else {
          recommendations.push({
            type: 'enhancement',
            priority: 'low',
            issue: `Category "${imbalance.category}" is underrepresented (${imbalance.mentions.toFixed(1)} mentions per node)`,
            action: `Expand keywords or broaden scope of "${imbalance.category}" category`
          });
        }
      }
    }

    // Independence recommendations
    if (!health.independence.isHealthy) {
      recommendations.push({
        type: 'independence',
        priority: 'high',
        issue: `Categories are too correlated (${(health.independence.avgCorrelation * 100).toFixed(1)}% average correlation)`,
        action: 'Redesign categories to be more orthogonal and independent'
      });

      for (const corr of health.independence.highCorrelations.slice(0, 2)) {
        recommendations.push({
          type: 'decoupling',
          priority: 'medium',
          issue: `Categories "${corr.pair}" are highly correlated (${(corr.correlation * 100).toFixed(1)}%)`,
          action: `Merge or restructure these overlapping categories`
        });
      }
    }

    // Subject fit recommendations
    if (!health.subjectFit.isHealthy) {
      recommendations.push({
        type: 'relevance',
        priority: 'medium',
        issue: `Categories don't fit subject matter well (${health.subjectFit.avgFit.toFixed(1)}% average fit)`,
        action: 'Revise category keywords to better match actual repository content'
      });

      for (const poor of health.subjectFit.poorFits.slice(0, 2)) {
        recommendations.push({
          type: 'keywords',
          priority: 'low',
          issue: `Category "${poor.category}" has poor subject fit (${(poor.fit * 100).toFixed(1)}%)`,
          action: `Update keywords for "${poor.category}" to better match repository content`
        });
      }
    }

    // Subdivision recommendations
    for (const need of health.subdivisionNeeds.slice(0, 3)) {
      recommendations.push({
        type: 'subdivision',
        priority: need.priority,
        issue: `Category "${need.category}" needs subdivision (${need.overloadFactor.toFixed(1)}x overloaded)`,
        action: `Split "${need.category}" into ${need.suggestedSubcategories} subcategories`
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate HTML report for category health
   */
  generateHealthReport(health) {
    const gradeColor = health.overallScore >= 80 ? '#00ff88' : 
                     health.overallScore >= 60 ? '#ffaa00' : '#ff6666';

    return `
      <div class="category-health-section" style="margin: 20px 0; padding: 20px; background: rgba(255, 255, 255, 0.02); border-radius: 10px;">
        <h3 style="color: ${gradeColor}; margin-bottom: 15px;">
          🏥 Category Health Assessment
        </h3>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
          <div style="background: rgba(0, 255, 136, 0.05); padding: 15px; border-radius: 5px; border: 1px solid rgba(0, 255, 136, 0.2);">
            <h4 style="color: #00ff88; margin: 0 0 10px 0;">📊 Distribution</h4>
            <div style="color: #aaa;">
              Score: <strong style="color: ${health.distribution.score >= 70 ? '#00ff88' : '#ffaa00'};">${health.distribution.score.toFixed(1)}%</strong><br/>
              Per-node CV: ${(health.distribution.perNodeCV * 100).toFixed(1)}%<br/>
              Status: ${health.distribution.isHealthy ? '✅ Healthy' : '⚠️ Needs attention'}
            </div>
          </div>
          
          <div style="background: rgba(0, 170, 255, 0.05); padding: 15px; border-radius: 5px; border: 1px solid rgba(0, 170, 255, 0.2);">
            <h4 style="color: #00aaff; margin: 0 0 10px 0;">🔄 Independence</h4>
            <div style="color: #aaa;">
              Score: <strong style="color: ${health.independence.score >= 70 ? '#00ff88' : '#ffaa00'};">${health.independence.score.toFixed(1)}%</strong><br/>
              Avg correlation: ${(health.independence.avgCorrelation * 100).toFixed(1)}%<br/>
              Status: ${health.independence.isHealthy ? '✅ Orthogonal' : '⚠️ Correlated'}
            </div>
          </div>
          
          <div style="background: rgba(255, 170, 0, 0.05); padding: 15px; border-radius: 5px; border: 1px solid rgba(255, 170, 0, 0.2);">
            <h4 style="color: #ffaa00; margin: 0 0 10px 0;">🎯 Subject Fit</h4>
            <div style="color: #aaa;">
              Score: <strong style="color: ${health.subjectFit.score >= 70 ? '#00ff88' : '#ffaa00'};">${health.subjectFit.score.toFixed(1)}%</strong><br/>
              Avg fit: ${(health.subjectFit.avgFit * 100).toFixed(1)}%<br/>
              Status: ${health.subjectFit.isHealthy ? '✅ Good fit' : '⚠️ Poor fit'}
            </div>
          </div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h4 style="color: ${gradeColor}; margin: 0 0 10px 0;">
            📈 Overall Health Grade: ${health.overallScore.toFixed(1)}%
          </h4>
          <p style="color: #aaa; margin: 0; font-size: 0.9em;">
            This score measures how well your category structure supports valid Trust Debt calculations.
            Higher scores indicate better statistical legitimacy and measurement reliability.
          </p>
        </div>

        ${health.recommendations.length > 0 ? `
        <div style="background: rgba(255, 170, 0, 0.05); padding: 15px; border-radius: 5px;">
          <h4 style="color: #ffaa00; margin: 0 0 15px 0;">🔧 Recommendations</h4>
          <ol style="color: #aaa; margin: 0; padding-left: 20px;">
            ${health.recommendations.slice(0, 5).map(rec => `
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

module.exports = { CategoryHealthValidator };

// CLI usage
if (require.main === module) {
  console.log('🏥 Trust Debt Category Health Validator');
  console.log('This module validates category structure health for statistical legitimacy.');
  console.log('Import and use with: const { CategoryHealthValidator } = require("./trust-debt-category-health-validator");');
}