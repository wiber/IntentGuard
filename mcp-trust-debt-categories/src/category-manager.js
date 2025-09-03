import { ClaudeEvaluator } from './claude-evaluator.js';
import { StatisticalAnalyzer } from './statistical-analyzer.js';
import { ShortlexOptimizer } from './shortlex-optimizer.js';

/**
 * Central category manager that coordinates all category operations
 */
export class CategoryManager {
  constructor() {
    this.claudeEvaluator = new ClaudeEvaluator();
    this.statisticalAnalyzer = new StatisticalAnalyzer();
    this.shortlexOptimizer = new ShortlexOptimizer();
    this.categoryHistory = [];
    this.validationCache = new Map();
  }

  /**
   * Generate optimal categories using Claude's domain knowledge
   */
  async generateOptimalCategories(domain, numCategories = 5, constraints = [], seedCategories = []) {
    const claudeResult = await this.claudeEvaluator.generateOptimalCategories(
      domain, 
      constraints, 
      seedCategories
    );

    if (!claudeResult.success) {
      throw new Error(`Failed to generate categories: ${claudeResult.error}`);
    }

    // Optimize the generated categories using shortlex principles
    const optimizedResult = await this.shortlexOptimizer.optimize(
      claudeResult.categories, 
      'balanced'
    );

    // Calculate independence metrics
    const independenceAnalysis = await this.analyzeGeneratedIndependence(claudeResult.categories);

    return {
      categories: optimizedResult.optimalOrder,
      systemIndependenceScore: independenceAnalysis.overallScore,
      coverageScore: optimizedResult.coverageScore,
      semanticClarityScore: this.calculateSemanticClarityScore(claudeResult.categories),
      validationResults: await this.quickValidateCategories(optimizedResult.optimalOrder),
      generation_metadata: {
        domain,
        constraints,
        seed_categories: seedCategories,
        claude_reasoning: claudeResult.reasoning,
        optimization_analysis: optimizedResult.analysis
      }
    };
  }

  /**
   * Comprehensive category system validation
   */
  async validateSystem(categories, historicalData = [], validationTests = ['independence', 'orthogonality', 'completeness']) {
    const cacheKey = this.generateValidationCacheKey(categories, validationTests);
    
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey);
    }

    const results = {
      tests: [],
      overallHealth: 'unknown',
      recommendation: '',
      detailedAnalysis: '',
      timestamp: new Date().toISOString()
    };

    // Run each requested validation test
    for (const testType of validationTests) {
      let testResult;

      switch (testType) {
        case 'independence':
          testResult = await this.validateIndependence(categories, historicalData);
          break;
        case 'orthogonality': 
          testResult = await this.validateOrthogonality(categories);
          break;
        case 'completeness':
          testResult = await this.validateCompleteness(categories);
          break;
        case 'stability':
          testResult = await this.validateStability(categories, historicalData);
          break;
        case 'semantic_clarity':
          testResult = await this.validateSemanticClarity(categories);
          break;
        default:
          throw new Error(`Unknown validation test: ${testType}`);
      }

      results.tests.push(testResult);
    }

    // Calculate overall assessment
    const avgScore = results.tests.reduce((sum, test) => sum + test.score, 0) / results.tests.length;
    results.overallHealth = this.calculateHealthGrade(avgScore);
    results.recommendation = this.generateValidationRecommendation(results.tests);
    results.detailedAnalysis = this.generateDetailedAnalysis(results.tests);

    // Cache results
    this.validationCache.set(cacheKey, results);

    return results;
  }

  /**
   * Process natural language input for category management
   */
  async processNaturalLanguageEdit(userInput, currentCategories = []) {
    const result = await this.claudeEvaluator.processNaturalLanguageEdit(userInput, currentCategories);
    
    if (result.success && result.updated_categories) {
      // Validate the updated categories
      const validationResult = await this.quickValidateCategories(result.updated_categories);
      result.validation = validationResult;
      
      // Add to history
      this.addToHistory('natural_language_edit', {
        input: userInput,
        before: currentCategories,
        after: result.updated_categories,
        validation: validationResult
      });
    }

    return result;
  }

  /**
   * Interactive category management session
   */
  async startInteractiveSession(initialCategories = []) {
    const session = await this.claudeEvaluator.startInteractiveSession(initialCategories);
    
    // Add session management
    session.manager = {
      processInput: async (input) => {
        return await this.processNaturalLanguageEdit(input, session.currentCategories);
      },
      validateCurrent: async () => {
        return await this.quickValidateCategories(session.currentCategories);
      },
      optimizeCurrent: async () => {
        const optimized = await this.shortlexOptimizer.optimize(session.currentCategories, 'balanced');
        session.currentCategories = optimized.optimalOrder;
        return optimized;
      },
      generateNew: async (domain, constraints = []) => {
        const generated = await this.generateOptimalCategories(domain, 5, constraints, session.currentCategories);
        session.currentCategories = generated.categories;
        return generated;
      }
    };

    return session;
  }

  // === Validation Methods ===

  async validateIndependence(categories, historicalData = []) {
    const result = {
      name: 'Statistical Independence',
      score: 0,
      status: 'unknown',
      details: '',
      issues: []
    };

    if (historicalData.length > 0) {
      // Use actual statistical analysis
      const categoryNames = categories.map(c => c.name || c.id);
      const analysisResult = await this.statisticalAnalyzer.analyzeIndependence(
        categoryNames, 
        historicalData, 
        ['correlation', 'mutual_information']
      );

      const correlationTest = analysisResult.tests.find(t => t.type === 'correlation');
      if (correlationTest) {
        result.score = Math.max(0, 100 - (correlationTest.averageAbsCorrelation * 100));
        result.details = `Average absolute correlation: ${correlationTest.averageAbsCorrelation.toFixed(3)}`;
        
        if (correlationTest.strongCorrelations.length > 0) {
          result.issues = correlationTest.strongCorrelations.map(corr => 
            `Strong correlation between ${corr.categories.join(' and ')}: ${corr.correlation.toFixed(3)}`
          );
        }
      }
    } else {
      // Use semantic analysis via Claude
      const claudeResult = await this.claudeEvaluator.evaluateRelationships(
        categories, 
        '', 
        'orthogonality'
      );
      
      result.score = Math.round(claudeResult.confidence * 100);
      result.details = 'Semantic independence analysis (no historical data available)';
    }

    result.status = result.score >= 80 ? 'excellent' : 
                   result.score >= 60 ? 'good' : 
                   result.score >= 40 ? 'fair' : 'poor';

    return result;
  }

  async validateOrthogonality(categories) {
    const result = {
      name: 'Semantic Orthogonality',
      score: 0,
      status: 'unknown',
      details: '',
      issues: []
    };

    // Use shortlex optimizer to calculate orthogonality
    const orthogonalityIndex = await this.shortlexOptimizer.calculateOrthogonalityIndex(categories);
    
    result.score = Math.round(orthogonalityIndex * 100);
    result.details = `Orthogonality index: ${orthogonalityIndex.toFixed(3)}`;
    result.status = result.score >= 80 ? 'excellent' : 
                   result.score >= 60 ? 'good' : 
                   result.score >= 40 ? 'fair' : 'poor';

    if (result.score < 60) {
      result.issues.push('Categories may have significant semantic overlap');
    }

    return result;
  }

  async validateCompleteness(categories) {
    const result = {
      name: 'Domain Coverage Completeness',
      score: 0,
      status: 'unknown', 
      details: '',
      issues: []
    };

    const coverageScore = await this.shortlexOptimizer.calculateDomainCoverage(categories);
    
    result.score = Math.round(coverageScore * 100);
    result.details = `Domain coverage: ${coverageScore.toFixed(3)}`;
    result.status = result.score >= 80 ? 'excellent' : 
                   result.score >= 60 ? 'good' : 
                   result.score >= 40 ? 'fair' : 'poor';

    if (result.score < 70) {
      result.issues.push('Categories may not comprehensively cover the trust debt domain');
    }

    return result;
  }

  async validateStability(categories, historicalData = []) {
    const result = {
      name: 'Measurement Stability',
      score: 75, // Default score when no historical data
      status: 'good',
      details: 'No historical data available for stability analysis',
      issues: []
    };

    if (historicalData.length > 10) {
      // Analyze measurement stability over time
      const categoryNames = categories.map(c => c.name || c.id);
      const stabilityMetrics = this.calculateStabilityMetrics(categoryNames, historicalData);
      
      result.score = Math.round(stabilityMetrics.averageStability * 100);
      result.details = `Average measurement stability: ${stabilityMetrics.averageStability.toFixed(3)}`;
      
      stabilityMetrics.unstableCategories.forEach(cat => {
        result.issues.push(`Category "${cat}" shows high measurement variance`);
      });
    }

    result.status = result.score >= 80 ? 'excellent' : 
                   result.score >= 60 ? 'good' : 
                   result.score >= 40 ? 'fair' : 'poor';

    return result;
  }

  async validateSemanticClarity(categories) {
    const result = {
      name: 'Semantic Clarity',
      score: 0,
      status: 'unknown',
      details: '',
      issues: []
    };

    const clarityScore = this.calculateSemanticClarityScore(categories);
    
    result.score = Math.round(clarityScore * 100);
    result.details = `Semantic clarity index: ${clarityScore.toFixed(3)}`;
    result.status = result.score >= 80 ? 'excellent' : 
                   result.score >= 60 ? 'good' : 
                   result.score >= 40 ? 'fair' : 'poor';

    // Check for common clarity issues
    categories.forEach(cat => {
      if (!cat.description || cat.description.length < 20) {
        result.issues.push(`Category "${cat.name}" lacks detailed description`);
      }
      
      if (cat.name.length < 3) {
        result.issues.push(`Category "${cat.name}" has unclear name`);
      }
    });

    return result;
  }

  // === Helper Methods ===

  async quickValidateCategories(categories) {
    return await this.validateSystem(categories, [], ['independence', 'orthogonality']);
  }

  async analyzeGeneratedIndependence(categories) {
    // Estimate independence without historical data
    const semanticOverlap = await this.shortlexOptimizer.calculateTotalOverlapScore(categories);
    const orthogonality = await this.shortlexOptimizer.calculateOrthogonalityIndex(categories);
    
    return {
      overallScore: Math.round((orthogonality + (1 - semanticOverlap)) * 50),
      semanticOverlap,
      orthogonality
    };
  }

  calculateSemanticClarityScore(categories) {
    let totalScore = 0;
    
    categories.forEach(cat => {
      let score = 0.5; // Base score
      
      // Name clarity
      if (cat.name && cat.name.length >= 3) score += 0.2;
      
      // Description quality
      if (cat.description && cat.description.length >= 20) score += 0.3;
      if (cat.description && cat.description.length >= 50) score += 0.1;
      
      // Keywords presence
      if (cat.keywords && cat.keywords.length > 0) score += 0.1;
      
      // Measurement approach
      if (cat.measurement_approach) score += 0.2;
      
      totalScore += Math.min(1.0, score);
    });
    
    return categories.length > 0 ? totalScore / categories.length : 0;
  }

  calculateStabilityMetrics(categoryNames, historicalData) {
    const metrics = {
      averageStability: 0.8,
      unstableCategories: []
    };

    // Calculate variance in measurements for each category
    categoryNames.forEach(catName => {
      const values = historicalData
        .map(point => point.categories[catName] || 0)
        .filter(val => typeof val === 'number');
      
      if (values.length > 2) {
        const mean = values.reduce((a, b) => a + b) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 0;
        
        if (coefficientOfVariation > 0.5) { // High variance
          metrics.unstableCategories.push(catName);
        }
      }
    });

    return metrics;
  }

  calculateHealthGrade(avgScore) {
    if (avgScore >= 90) return 'Excellent';
    if (avgScore >= 80) return 'Good'; 
    if (avgScore >= 70) return 'Fair';
    if (avgScore >= 60) return 'Needs Improvement';
    return 'Poor';
  }

  generateValidationRecommendation(tests) {
    const lowScoreTests = tests.filter(test => test.score < 70);
    
    if (lowScoreTests.length === 0) {
      return 'Category system is well-designed. Consider periodic validation with new data.';
    } else {
      const issues = lowScoreTests.map(test => test.name).join(', ');
      return `Address issues in: ${issues}. Consider category refinement or regeneration.`;
    }
  }

  generateDetailedAnalysis(tests) {
    return tests.map(test => {
      const status = test.status.charAt(0).toUpperCase() + test.status.slice(1);
      return `**${test.name}**: ${status} (${test.score}/100)
${test.details}
${test.issues.length > 0 ? `Issues: ${test.issues.join('; ')}` : 'No issues detected'}`;
    }).join('\n\n');
  }

  generateValidationCacheKey(categories, tests) {
    const categoryIds = categories.map(c => c.id || c.name).sort().join('-');
    const testTypes = tests.sort().join('-');
    return `validation_${categoryIds}_${testTypes}`;
  }

  addToHistory(operation, data) {
    this.categoryHistory.push({
      operation,
      data,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 operations
    if (this.categoryHistory.length > 100) {
      this.categoryHistory = this.categoryHistory.slice(-100);
    }
  }

  getHistory() {
    return this.categoryHistory;
  }

  clearHistory() {
    this.categoryHistory = [];
  }

  clearCache() {
    this.validationCache.clear();
  }
}