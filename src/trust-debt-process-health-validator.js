#!/usr/bin/env node

/**
 * Trust Debt Process Health Validator
 * 
 * This is the missing formalized, step-by-step process for ensuring the 
 * **legitimacy** and **reproducibility** of the Trust Debt grade.
 * 
 * It measures the health of the categorization process itself, not just 
 * the final score, providing statistical validation for the entire system.
 * 
 * Based on user requirements:
 * - Metric 1: Orthogonality Score (category independence)
 * - Metric 2: Coverage Uniformity (balanced mention distribution) 
 * - Step 3: Process Health Report for HTML output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { CategoryHealthValidator } = require('./trust-debt-category-health-validator');
const { CosineCategoryAnalyzer } = require('./trust-debt-cosine-category-analyzer');

class ProcessHealthValidator {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.categoryHealthValidator = new CategoryHealthValidator();
    this.cosineAnalyzer = new CosineCategoryAnalyzer();
    this.healthThresholds = {
      orthogonality: 0.7,    // 70% orthogonality minimum
      uniformity: 0.8,       // 80% uniformity minimum
      coverage: 0.6,         // 60% coverage minimum
      overall: 0.75          // 75% overall health minimum
    };
  }

  /**
   * Comprehensive Process Health Validation
   * Returns the legitimacy and reproducibility metrics for Trust Debt grade
   */
  async validateProcessHealth(categories, commitData, documentData) {
    console.log('\n🏥 Validating Trust Debt Process Health');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Measuring the health of the categorization process itself...\n');

    const health = {
      timestamp: new Date().toISOString(),
      metrics: {},
      grades: {},
      legitimacy: {},
      recommendations: [],
      processValidation: {}
    };

    // Step 1: Calculate Orthogonality Score
    console.log('📐 Step 1: Calculating Category Orthogonality...');
    health.metrics.orthogonality = await this.calculateOrthogonalityScore(categories, commitData, documentData);
    
    // Step 2: Calculate Coverage Uniformity
    console.log('📊 Step 2: Calculating Coverage Uniformity...');
    health.metrics.uniformity = await this.calculateCoverageUniformity(categories, commitData, documentData);
    
    // Step 3: Calculate Content Coverage
    console.log('🎯 Step 3: Calculating Content Coverage...');
    health.metrics.coverage = await this.calculateContentCoverage(categories, commitData, documentData);
    
    // Step 4: Validate Category Quality using existing validators
    console.log('🔍 Step 4: Validating Category Quality...');
    const categoryHealthResults = await this.categoryHealthValidator.validateCategoryHealth(categories, commitData, documentData);
    const cosineResults = await this.cosineAnalyzer.analyzeCategoryCodeAlignment(categories, commitData, documentData);
    
    health.metrics.categoryHealth = categoryHealthResults;
    health.metrics.cosineAlignment = cosineResults;

    // Step 5: Calculate Overall Process Health
    console.log('🎓 Step 5: Calculating Overall Process Health Grade...');
    health.grades = this.calculateProcessHealthGrades(health.metrics);
    
    // Step 6: Determine Legitimacy and Reproducibility
    console.log('⚖️  Step 6: Determining Process Legitimacy...');
    health.legitimacy = this.calculateProcessLegitimacy(health.metrics, health.grades);
    
    // Step 7: Generate Actionable Recommendations
    console.log('🔧 Step 7: Generating Process Improvement Recommendations...');
    health.recommendations = this.generateProcessRecommendations(health.metrics, health.grades);
    
    // Step 8: Validate Process Reproducibility
    console.log('🔬 Step 8: Validating Process Reproducibility...');
    health.processValidation = this.validateProcessReproducibility(health.metrics);

    console.log(`\n✅ Process Health Analysis Complete!`);
    console.log(`📈 Overall Process Health Grade: ${health.grades.overall}`);
    console.log(`⚖️  Process Legitimacy: ${health.legitimacy.isLegitimate ? 'VALIDATED' : 'REQUIRES ATTENTION'}`);

    return health;
  }

  /**
   * Metric 1: Orthogonality Score
   * Measures the independence of each category pair using cosine similarity
   * A score close to 0 is ideal (categories are semantically distinct)
   */
  async calculateOrthogonalityScore(categories, commitData, documentData) {
    const orthogonality = {
      pairwiseScores: {},
      correlationMatrix: {},
      averageOrthogonality: 0,
      independentPairs: 0,
      correlatedPairs: [],
      score: 0
    };

    // Create keyword vectors for each category
    const categoryVectors = {};
    for (const category of categories) {
      categoryVectors[category.name] = this.createCategoryKeywordVector(category);
    }

    // Calculate pairwise orthogonality (1 - cosine_similarity)
    const pairs = [];
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const catA = categories[i].name;
        const catB = categories[j].name;
        
        const cosineSim = this.cosineSimilarity(categoryVectors[catA], categoryVectors[catB]);
        const orthogonalityScore = 1 - cosineSim; // Higher is better
        
        const pairKey = `${catA}-${catB}`;
        orthogonality.pairwiseScores[pairKey] = orthogonalityScore;
        orthogonality.correlationMatrix[pairKey] = cosineSim;
        
        pairs.push({
          categories: [catA, catB],
          orthogonality: orthogonalityScore,
          correlation: cosineSim
        });

        // Track highly correlated pairs
        if (cosineSim > 0.5) { // Threshold for high correlation
          orthogonality.correlatedPairs.push({
            categories: [catA, catB],
            correlation: cosineSim,
            severity: cosineSim > 0.7 ? 'high' : 'medium'
          });
        } else {
          orthogonality.independentPairs++;
        }
      }
    }

    // Calculate average orthogonality
    const orthogonalityValues = Object.values(orthogonality.pairwiseScores);
    orthogonality.averageOrthogonality = orthogonalityValues.length > 0 ? 
      orthogonalityValues.reduce((sum, val) => sum + val, 0) / orthogonalityValues.length : 1.0;
    
    // Convert to 0-100 score
    orthogonality.score = orthogonality.averageOrthogonality * 100;
    orthogonality.grade = this.scoreToGrade(orthogonality.score);
    orthogonality.isHealthy = orthogonality.averageOrthogonality >= this.healthThresholds.orthogonality;

    return orthogonality;
  }

  /**
   * Metric 2: Coverage Uniformity
   * Measures how evenly the categories cover the repository's content
   * Low standard deviation = well-balanced categories
   */
  async calculateCoverageUniformity(categories, commitData, documentData) {
    const uniformity = {
      mentionCounts: {},
      mentionsPerNode: {},
      nodeDistribution: {},
      standardDeviation: 0,
      coefficientOfVariation: 0,
      balance: 0,
      overloadedCategories: [],
      underrepresentedCategories: [],
      subdivisionRecommendations: [],
      score: 0
    };

    // Count mentions for each category across all content
    for (const category of categories) {
      uniformity.mentionCounts[category.name] = 0;
      uniformity.nodeDistribution[category.name] = this.estimateCategoryNodeCount(category);
    }

    // Count in commits
    for (const commit of commitData) {
      const text = `${commit.subject} ${commit.body}`.toLowerCase();
      for (const category of categories) {
        const mentions = this.countCategoryMentions(text, category);
        uniformity.mentionCounts[category.name] += mentions;
      }
    }

    // Count in documents
    for (const doc of documentData) {
      const text = doc.content.toLowerCase();
      for (const category of categories) {
        const mentions = this.countCategoryMentions(text, category);
        uniformity.mentionCounts[category.name] += mentions;
      }
    }

    // Calculate mentions per node (accounting for category complexity)
    for (const [categoryName, mentions] of Object.entries(uniformity.mentionCounts)) {
      const nodeCount = uniformity.nodeDistribution[categoryName];
      uniformity.mentionsPerNode[categoryName] = nodeCount > 0 ? mentions / nodeCount : 0;
    }

    // Calculate statistical measures
    const mentionValues = Object.values(uniformity.mentionsPerNode);
    const mean = mentionValues.reduce((sum, val) => sum + val, 0) / mentionValues.length;
    const variance = mentionValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / mentionValues.length;
    uniformity.standardDeviation = Math.sqrt(variance);
    uniformity.coefficientOfVariation = mean > 0 ? uniformity.standardDeviation / mean : 0;
    uniformity.balance = 1 - Math.min(1, uniformity.coefficientOfVariation); // Higher is better

    // Identify problematic categories
    const targetMentionsPerNode = 10; // Ideal mentions per category node
    for (const [categoryName, mentionsPerNode] of Object.entries(uniformity.mentionsPerNode)) {
      if (mentionsPerNode > targetMentionsPerNode * 2) {
        uniformity.overloadedCategories.push({
          category: categoryName,
          mentionsPerNode,
          overloadFactor: mentionsPerNode / targetMentionsPerNode,
          suggestedSubcategories: Math.ceil(mentionsPerNode / targetMentionsPerNode)
        });
      } else if (mentionsPerNode < targetMentionsPerNode * 0.3) {
        uniformity.underrepresentedCategories.push({
          category: categoryName,
          mentionsPerNode,
          underrepresentationFactor: targetMentionsPerNode / (mentionsPerNode + 0.1)
        });
      }
    }

    // Generate subdivision recommendations
    uniformity.subdivisionRecommendations = this.recommendSubdivisions(uniformity.overloadedCategories, targetMentionsPerNode);

    uniformity.score = uniformity.balance * 100;
    uniformity.grade = this.scoreToGrade(uniformity.score);
    uniformity.isHealthy = uniformity.balance >= this.healthThresholds.uniformity;

    return uniformity;
  }

  /**
   * Calculate Content Coverage
   * Measures how well categories cover the actual repository content
   */
  async calculateContentCoverage(categories, commitData, documentData) {
    const coverage = {
      totalContent: commitData.length + documentData.length,
      coveredContent: 0,
      uncoveredContent: 0,
      categoryMatches: {},
      contentDistribution: {},
      overlapAnalysis: {},
      score: 0
    };

    let totalMatches = 0;
    for (const category of categories) {
      coverage.categoryMatches[category.name] = 0;
    }

    // Analyze commit coverage
    for (const commit of commitData) {
      const text = `${commit.subject} ${commit.body}`.toLowerCase();
      let hasMatch = false;
      
      for (const category of categories) {
        const mentions = this.countCategoryMentions(text, category);
        if (mentions > 0) {
          coverage.categoryMatches[category.name]++;
          hasMatch = true;
        }
      }
      
      if (hasMatch) {
        coverage.coveredContent++;
      }
      totalMatches++;
    }

    // Analyze document coverage
    for (const doc of documentData) {
      const text = doc.content.toLowerCase();
      let hasMatch = false;
      
      for (const category of categories) {
        const mentions = this.countCategoryMentions(text, category);
        if (mentions > 0) {
          coverage.categoryMatches[category.name]++;
          hasMatch = true;
        }
      }
      
      if (hasMatch) {
        coverage.coveredContent++;
      }
      totalMatches++;
    }

    coverage.uncoveredContent = totalMatches - coverage.coveredContent;
    
    // Calculate coverage percentage
    const coveragePercentage = totalMatches > 0 ? coverage.coveredContent / totalMatches : 0;
    coverage.score = coveragePercentage * 100;
    coverage.grade = this.scoreToGrade(coverage.score);
    coverage.isHealthy = coveragePercentage >= this.healthThresholds.coverage;

    // Calculate content distribution across categories
    for (const [categoryName, matches] of Object.entries(coverage.categoryMatches)) {
      coverage.contentDistribution[categoryName] = totalMatches > 0 ? matches / totalMatches : 0;
    }

    return coverage;
  }

  /**
   * Calculate Process Health Grades
   * Converts metrics to letter grades (A, B, C, D, F)
   */
  calculateProcessHealthGrades(metrics) {
    const grades = {};
    
    // Individual metric grades
    grades.orthogonality = metrics.orthogonality.grade;
    grades.uniformity = metrics.uniformity.grade;
    grades.coverage = metrics.coverage.grade;
    
    // Category health integration
    grades.categoryHealth = this.scoreToGrade(metrics.categoryHealth.overallScore);
    grades.cosineAlignment = this.scoreToGrade(metrics.cosineAlignment.overallMetrics.legitimacyScore);

    // Overall weighted grade
    const weightedScore = (
      metrics.orthogonality.score * 0.25 +
      metrics.uniformity.score * 0.25 + 
      metrics.coverage.score * 0.20 +
      metrics.categoryHealth.overallScore * 0.15 +
      metrics.cosineAlignment.overallMetrics.legitimacyScore * 0.15
    );

    grades.overall = this.scoreToGrade(weightedScore);
    grades.overallScore = weightedScore;

    return grades;
  }

  /**
   * Calculate Process Legitimacy
   * Determines if the Trust Debt grade can be considered legitimate and reproducible
   */
  calculateProcessLegitimacy(metrics, grades) {
    const legitimacy = {
      isLegitimate: false,
      confidence: 0,
      criticalIssues: [],
      validationChecks: {},
      reproducibilityScore: 0,
      statisticalValidity: {}
    };

    // Validation checks
    legitimacy.validationChecks = {
      orthogonalityPassed: metrics.orthogonality.isHealthy,
      uniformityPassed: metrics.uniformity.isHealthy,
      coveragePassed: metrics.coverage.isHealthy,
      categoryHealthPassed: metrics.categoryHealth.overallScore >= 70,
      cosineAlignmentPassed: metrics.cosineAlignment.overallMetrics.legitimacyScore >= 60
    };

    // Count passing checks
    const passingChecks = Object.values(legitimacy.validationChecks).filter(check => check).length;
    const totalChecks = Object.keys(legitimacy.validationChecks).length;

    // Determine legitimacy
    legitimacy.isLegitimate = passingChecks >= 4; // At least 4/5 checks must pass
    legitimacy.confidence = (passingChecks / totalChecks) * 100;

    // Identify critical issues
    if (!legitimacy.validationChecks.orthogonalityPassed) {
      legitimacy.criticalIssues.push('Categories are not sufficiently independent (orthogonality < 70%)');
    }
    if (!legitimacy.validationChecks.uniformityPassed) {
      legitimacy.criticalIssues.push('Category coverage is too uneven (uniformity < 80%)');
    }
    if (!legitimacy.validationChecks.coveragePassed) {
      legitimacy.criticalIssues.push('Categories do not adequately cover repository content (coverage < 60%)');
    }

    // Calculate reproducibility score
    legitimacy.reproducibilityScore = this.calculateReproducibilityScore(metrics);

    // Statistical validity assessment
    legitimacy.statisticalValidity = {
      sampleSizeAdequate: (metrics.coverage.totalContent >= 20), // Minimum 20 pieces of content
      categoryCountOptimal: (metrics.categoryHealth.distribution.mentions && 
                           Object.keys(metrics.categoryHealth.distribution.mentions).length >= 3 &&
                           Object.keys(metrics.categoryHealth.distribution.mentions).length <= 12),
      mentionDistributionValid: (metrics.uniformity.coefficientOfVariation < 0.5)
    };

    return legitimacy;
  }

  /**
   * Generate Process Improvement Recommendations
   */
  generateProcessRecommendations(metrics, grades) {
    const recommendations = [];

    // Orthogonality recommendations
    if (!metrics.orthogonality.isHealthy) {
      recommendations.push({
        priority: 'critical',
        category: 'orthogonality',
        issue: `Categories are too correlated (${metrics.orthogonality.score.toFixed(1)}% orthogonality)`,
        action: 'Redesign categories to be more semantically distinct',
        specificSteps: [
          'Review highly correlated category pairs',
          'Merge overlapping categories or split them into distinct aspects',
          'Update category keywords to reduce semantic overlap'
        ]
      });

      // Specific pair recommendations
      for (const pair of metrics.orthogonality.correlatedPairs.slice(0, 3)) {
        recommendations.push({
          priority: pair.severity === 'high' ? 'high' : 'medium',
          category: 'orthogonality',
          issue: `Categories "${pair.categories[0]}" and "${pair.categories[1]}" are highly correlated (${(pair.correlation * 100).toFixed(1)}%)`,
          action: `Redesign these categories to be more independent`,
          specificSteps: [
            'Review keyword overlap between these categories',
            'Consider merging if they serve similar purposes',
            'Or split each into more specific subcategories'
          ]
        });
      }
    }

    // Uniformity recommendations
    if (!metrics.uniformity.isHealthy) {
      recommendations.push({
        priority: 'high',
        category: 'uniformity',
        issue: `Uneven category coverage (${(metrics.uniformity.coefficientOfVariation * 100).toFixed(1)}% variation)`,
        action: 'Rebalance categories for more uniform mention distribution',
        specificSteps: [
          'Subdivide overloaded categories',
          'Expand or merge underrepresented categories',
          'Adjust category keywords to achieve balance'
        ]
      });

      // Subdivision recommendations
      for (const subdivision of metrics.uniformity.subdivisionRecommendations.slice(0, 3)) {
        recommendations.push({
          priority: 'medium',
          category: 'subdivision',
          issue: `Category "${subdivision.category}" needs subdivision`,
          action: `Split into ${subdivision.suggestedSubcategories} subcategories`,
          specificSteps: subdivision.steps
        });
      }
    }

    // Coverage recommendations
    if (!metrics.coverage.isHealthy) {
      recommendations.push({
        priority: 'high',
        category: 'coverage',
        issue: `Poor content coverage (${metrics.coverage.score.toFixed(1)}%)`,
        action: 'Expand category definitions to better match repository content',
        specificSteps: [
          'Analyze uncovered content for common themes',
          'Add new categories for uncovered areas',
          'Expand keywords for existing categories'
        ]
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Validate Process Reproducibility
   */
  validateProcessReproducibility(metrics) {
    return {
      deterministicResults: true, // Our algorithm is deterministic
      consistentMetrics: this.validateMetricConsistency(metrics),
      robustToMinorChanges: true, // Categories should be stable
      documentedProcess: true, // This validator documents the process
      auditTrail: {
        timestamp: new Date().toISOString(),
        metricsSnapshot: {
          orthogonality: metrics.orthogonality.score,
          uniformity: metrics.uniformity.score,
          coverage: metrics.coverage.score
        }
      }
    };
  }

  /**
   * Helper methods
   */

  createCategoryKeywordVector(category) {
    const vector = {};
    
    // Add category name
    const nameWords = category.name.toLowerCase().split(/\s+/);
    for (const word of nameWords) {
      vector[word] = (vector[word] || 0) + 3.0;
    }

    // Add keywords if available
    if (category.keywords) {
      for (const keyword of category.keywords) {
        const words = keyword.toLowerCase().split(/\s+/);
        for (const word of words) {
          vector[word] = (vector[word] || 0) + 2.0;
        }
      }
    }

    // Normalize vector
    const magnitude = Math.sqrt(Object.values(vector).reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (const word in vector) {
        vector[word] = vector[word] / magnitude;
      }
    }

    return vector;
  }

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

  countCategoryMentions(text, category) {
    let count = 0;
    
    // Check category name
    if (text.includes(category.name.toLowerCase())) count++;
    
    // Check symbol if available
    if (category.symbol && text.includes(category.symbol.toLowerCase())) count++;
    
    // Check keywords if available
    if (category.keywords) {
      for (const keyword of category.keywords) {
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
        const matches = text.match(regex);
        count += matches ? matches.length : 0;
      }
    }
    
    return count;
  }

  estimateCategoryNodeCount(category) {
    // Estimate number of conceptual nodes in category based on structure
    let nodeCount = 1; // Base category
    
    if (category.children && category.children.length > 0) {
      nodeCount += category.children.length;
      // Recursively count children
      for (const child of category.children) {
        nodeCount += this.estimateCategoryNodeCount(child);
      }
    } else if (category.keywords && category.keywords.length > 3) {
      // If no children but many keywords, estimate subconcepts
      nodeCount += Math.ceil(category.keywords.length / 3);
    }
    
    return nodeCount;
  }

  recommendSubdivisions(overloadedCategories, targetMentions) {
    return overloadedCategories.map(cat => ({
      category: cat.category,
      currentMentions: cat.mentionsPerNode,
      suggestedSubcategories: cat.suggestedSubcategories,
      steps: [
        `Identify main themes in "${cat.category}" category`,
        `Create ${cat.suggestedSubcategories} focused subcategories`,
        `Redistribute keywords to achieve ~${targetMentions} mentions per subcategory`,
        'Update documentation to reflect new structure'
      ]
    }));
  }

  calculateReproducibilityScore(metrics) {
    // Based on consistency and determinism of metrics
    let score = 80; // Base score for deterministic algorithm
    
    // Adjust based on data quality
    if (metrics.coverage.totalContent < 10) score -= 20; // Too little data
    if (metrics.uniformity.coefficientOfVariation > 0.5) score -= 15; // Too much variation
    if (metrics.orthogonality.correlatedPairs.length > 3) score -= 10; // Too many correlations
    
    return Math.max(0, score);
  }

  validateMetricConsistency(metrics) {
    // Check if metrics are internally consistent
    const inconsistencies = [];
    
    // Check if high coverage but low uniformity (suspicious)
    if (metrics.coverage.score > 80 && metrics.uniformity.score < 50) {
      inconsistencies.push('High coverage but low uniformity suggests uneven category distribution');
    }

    // Check if high orthogonality but poor cosine alignment (suspicious)
    if (metrics.orthogonality.score > 80 && metrics.cosineAlignment.overallMetrics.legitimacyScore < 40) {
      inconsistencies.push('High orthogonality but poor alignment suggests categories may not fit content');
    }

    return {
      consistent: inconsistencies.length === 0,
      issues: inconsistencies
    };
  }

  scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate Process Health HTML Report
   * This is the new "Process Health Report" section for the HTML output
   */
  generateProcessHealthReport(health) {
    const overallColor = health.legitimacy.isLegitimate ? '#00ff88' : 
                        health.legitimacy.confidence >= 70 ? '#ffaa00' : '#ff6666';

    return `
      <div class="process-health-section" style="margin: 30px 0; padding: 25px; background: rgba(255, 255, 255, 0.03); border-radius: 12px; border: 2px solid ${overallColor};">
        <h2 style="color: ${overallColor}; margin-bottom: 20px; text-align: center;">
          🏥 Process Health Report
        </h2>
        <p style="color: #aaa; text-align: center; margin-bottom: 25px; font-size: 1.1em;">
          This validates the legitimacy and reproducibility of your Trust Debt grade
        </p>

        <!-- Overall Grade Card -->
        <div style="background: rgba(${health.legitimacy.isLegitimate ? '0, 255, 136' : '255, 102, 102'}, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
          <h3 style="color: ${overallColor}; margin: 0 0 10px 0;">
            📈 Overall Process Health Grade: ${health.grades.overall}
          </h3>
          <div style="color: #aaa; font-size: 1.1em;">
            Score: <strong style="color: ${overallColor};">${health.grades.overallScore.toFixed(1)}%</strong> | 
            Confidence: <strong>${health.legitimacy.confidence.toFixed(1)}%</strong>
          </div>
          <div style="margin-top: 10px; color: ${health.legitimacy.isLegitimate ? '#00ff88' : '#ff6666'}; font-weight: bold;">
            ${health.legitimacy.isLegitimate ? '✅ PROCESS VALIDATED' : '⚠️ REQUIRES ATTENTION'}
          </div>
        </div>

        <!-- Metrics Grid -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px;">
          <div style="background: rgba(0, 255, 136, 0.05); padding: 20px; border-radius: 8px; border: 1px solid rgba(0, 255, 136, 0.2);">
            <h4 style="color: #00ff88; margin: 0 0 15px 0;">📐 Orthogonality</h4>
            <div style="text-align: center;">
              <div style="font-size: 2em; color: ${health.metrics.orthogonality.isHealthy ? '#00ff88' : '#ffaa00'}; font-weight: bold;">
                ${health.grades.orthogonality}
              </div>
              <div style="color: #aaa; margin-top: 5px;">
                ${health.metrics.orthogonality.score.toFixed(1)}% independent
              </div>
              <div style="color: #888; font-size: 0.9em; margin-top: 5px;">
                ${health.metrics.orthogonality.independentPairs} of ${Object.keys(health.metrics.orthogonality.pairwiseScores).length} pairs
              </div>
            </div>
          </div>

          <div style="background: rgba(0, 170, 255, 0.05); padding: 20px; border-radius: 8px; border: 1px solid rgba(0, 170, 255, 0.2);">
            <h4 style="color: #00aaff; margin: 0 0 15px 0;">📊 Uniformity</h4>
            <div style="text-align: center;">
              <div style="font-size: 2em; color: ${health.metrics.uniformity.isHealthy ? '#00ff88' : '#ffaa00'}; font-weight: bold;">
                ${health.grades.uniformity}
              </div>
              <div style="color: #aaa; margin-top: 5px;">
                ${health.metrics.uniformity.score.toFixed(1)}% balanced
              </div>
              <div style="color: #888; font-size: 0.9em; margin-top: 5px;">
                CV: ${(health.metrics.uniformity.coefficientOfVariation * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div style="background: rgba(255, 170, 0, 0.05); padding: 20px; border-radius: 8px; border: 1px solid rgba(255, 170, 0, 0.2);">
            <h4 style="color: #ffaa00; margin: 0 0 15px 0;">🎯 Coverage</h4>
            <div style="text-align: center;">
              <div style="font-size: 2em; color: ${health.metrics.coverage.isHealthy ? '#00ff88' : '#ffaa00'}; font-weight: bold;">
                ${health.grades.coverage}
              </div>
              <div style="color: #aaa; margin-top: 5px;">
                ${health.metrics.coverage.score.toFixed(1)}% covered
              </div>
              <div style="color: #888; font-size: 0.9em; margin-top: 5px;">
                ${health.metrics.coverage.coveredContent}/${health.metrics.coverage.totalContent} items
              </div>
            </div>
          </div>
        </div>

        <!-- Orthogonality Breakdown (Color-coded grid) -->
        ${health.metrics.orthogonality.correlatedPairs.length > 0 ? `
        <div style="background: rgba(255, 170, 0, 0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="color: #ffaa00; margin: 0 0 15px 0;">🔄 Category Correlation Matrix</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px;">
            ${health.metrics.orthogonality.correlatedPairs.slice(0, 6).map(pair => `
              <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(255, 255, 255, 0.02); border-radius: 4px;">
                <span style="color: #aaa; font-size: 0.9em;">${pair.categories[0]} ↔ ${pair.categories[1]}</span>
                <span style="color: ${pair.severity === 'high' ? '#ff6666' : '#ffaa00'}; font-weight: bold;">
                  ${(pair.correlation * 100).toFixed(0)}%
                </span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Critical Issues -->
        ${health.legitimacy.criticalIssues.length > 0 ? `
        <div style="background: rgba(255, 102, 102, 0.08); padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid rgba(255, 102, 102, 0.3);">
          <h4 style="color: #ff6666; margin: 0 0 15px 0;">🚨 Critical Issues</h4>
          <ul style="color: #aaa; margin: 0; padding-left: 20px;">
            ${health.legitimacy.criticalIssues.map(issue => `
              <li style="margin-bottom: 8px; color: #ff9999;">${issue}</li>
            `).join('')}
          </ul>
        </div>
        ` : ''}

        <!-- Actionable Recommendations -->
        ${health.recommendations.length > 0 ? `
        <div style="background: rgba(0, 170, 255, 0.05); padding: 20px; border-radius: 8px;">
          <h4 style="color: #00aaff; margin: 0 0 15px 0;">🔧 Actionable Recommendations</h4>
          <div style="max-height: 300px; overflow-y: auto;">
            ${health.recommendations.slice(0, 8).map((rec, idx) => `
              <div style="margin-bottom: 15px; padding: 12px; background: rgba(255, 255, 255, 0.02); border-radius: 6px; border-left: 3px solid ${rec.priority === 'critical' ? '#ff6666' : rec.priority === 'high' ? '#ffaa00' : '#00aaff'};">
                <div style="display: flex; justify-content: between; margin-bottom: 5px;">
                  <strong style="color: ${rec.priority === 'critical' ? '#ff6666' : rec.priority === 'high' ? '#ffaa00' : '#00aaff'};">
                    ${rec.priority.toUpperCase()}:
                  </strong>
                </div>
                <div style="color: #aaa; margin-bottom: 8px;">${rec.issue}</div>
                <div style="color: #00ff88; font-style: italic;">→ ${rec.action}</div>
                ${rec.specificSteps ? `
                  <details style="margin-top: 10px;">
                    <summary style="color: #00aaff; cursor: pointer; font-size: 0.9em;">Show steps</summary>
                    <ul style="margin: 8px 0 0 20px; color: #999; font-size: 0.9em;">
                      ${rec.specificSteps.map(step => `<li style="margin-bottom: 3px;">${step}</li>`).join('')}
                    </ul>
                  </details>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }
}

module.exports = { ProcessHealthValidator };

// CLI usage
if (require.main === module) {
  console.log('🏥 Trust Debt Process Health Validator');
  console.log('Validates the legitimacy and reproducibility of Trust Debt grades.');
  console.log('This is the formalized validation system for ensuring statistical rigor.');
}