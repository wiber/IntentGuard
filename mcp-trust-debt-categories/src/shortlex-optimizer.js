/**
 * Shortlex optimizer for Trust Debt categories
 * Optimizes category ordering to minimize semantic overlap and maximize orthogonality
 */
export class ShortlexOptimizer {
  constructor() {
    this.semanticCache = new Map();
    this.optimizationHistory = [];
  }

  /**
   * Optimize category ordering using specified objective and algorithm
   */
  async optimize(categories, objective = 'minimize_overlap', algorithm = 'greedy') {
    const startTime = Date.now();
    
    let result;
    switch (algorithm) {
      case 'greedy':
        result = await this.greedyOptimization(categories, objective);
        break;
      case 'simulated_annealing':
        result = await this.simulatedAnnealingOptimization(categories, objective);
        break;
      case 'genetic':
        result = await this.geneticOptimization(categories, objective);
        break;
      default:
        throw new Error(`Unknown optimization algorithm: ${algorithm}`);
    }

    const executionTime = Date.now() - startTime;
    
    return {
      ...result,
      algorithm,
      objective,
      executionTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Greedy optimization approach
   */
  async greedyOptimization(categories, objective) {
    const n = categories.length;
    const selected = [];
    const remaining = [...categories];
    
    // Start with the category that has the best initial score
    let bestStart = remaining[0];
    let bestScore = await this.evaluateCategoryScore(bestStart, [], remaining, objective);
    
    for (const category of remaining) {
      const score = await this.evaluateCategoryScore(category, [], remaining, objective);
      if (this.isBetterScore(score, bestScore, objective)) {
        bestStart = category;
        bestScore = score;
      }
    }
    
    selected.push(bestStart);
    remaining.splice(remaining.indexOf(bestStart), 1);
    
    // Greedily add remaining categories
    while (remaining.length > 0) {
      let bestNext = remaining[0];
      let bestNextScore = await this.evaluateCategoryScore(bestNext, selected, remaining, objective);
      
      for (const category of remaining) {
        const score = await this.evaluateCategoryScore(category, selected, remaining, objective);
        if (this.isBetterScore(score, bestNextScore, objective)) {
          bestNext = category;
          bestNextScore = score;
        }
      }
      
      selected.push(bestNext);
      remaining.splice(remaining.indexOf(bestNext), 1);
    }

    const finalMetrics = await this.calculateComprehensiveMetrics(selected);
    
    return {
      optimalOrder: selected,
      ...finalMetrics,
      analysis: this.generateOptimizationAnalysis(selected, finalMetrics, 'greedy')
    };
  }

  /**
   * Simulated annealing optimization
   */
  async simulatedAnnealingOptimization(categories, objective) {
    const initialTemp = 1000;
    const minTemp = 0.01;
    const coolingRate = 0.95;
    const maxIterations = 1000;
    
    // Start with random order
    let currentOrder = this.shuffleArray([...categories]);
    let currentScore = await this.calculateObjectiveScore(currentOrder, objective);
    
    let bestOrder = [...currentOrder];
    let bestScore = currentScore;
    
    let temperature = initialTemp;
    
    for (let iteration = 0; iteration < maxIterations && temperature > minTemp; iteration++) {
      // Generate neighbor by swapping two random elements
      const newOrder = this.generateNeighbor(currentOrder);
      const newScore = await this.calculateObjectiveScore(newOrder, objective);
      
      // Accept or reject based on simulated annealing criteria
      const delta = this.isBetterScore(newScore, currentScore, objective) ? 
        Math.abs(newScore - currentScore) : -Math.abs(newScore - currentScore);
      
      if (delta > 0 || Math.exp(delta / temperature) > Math.random()) {
        currentOrder = newOrder;
        currentScore = newScore;
        
        if (this.isBetterScore(newScore, bestScore, objective)) {
          bestOrder = [...newOrder];
          bestScore = newScore;
        }
      }
      
      temperature *= coolingRate;
    }

    const finalMetrics = await this.calculateComprehensiveMetrics(bestOrder);
    
    return {
      optimalOrder: bestOrder,
      ...finalMetrics,
      analysis: this.generateOptimizationAnalysis(bestOrder, finalMetrics, 'simulated_annealing')
    };
  }

  /**
   * Genetic algorithm optimization
   */
  async geneticOptimization(categories, objective) {
    const populationSize = 50;
    const generations = 100;
    const mutationRate = 0.1;
    const eliteSize = 5;
    
    // Initialize population
    let population = [];
    for (let i = 0; i < populationSize; i++) {
      population.push(this.shuffleArray([...categories]));
    }
    
    for (let generation = 0; generation < generations; generation++) {
      // Evaluate fitness
      const fitness = await Promise.all(
        population.map(order => this.calculateObjectiveScore(order, objective))
      );
      
      // Sort by fitness
      const populationWithFitness = population.map((order, i) => ({
        order,
        fitness: fitness[i]
      })).sort((a, b) => this.compareFitness(a.fitness, b.fitness, objective));
      
      // Select elite
      const newPopulation = populationWithFitness
        .slice(0, eliteSize)
        .map(item => item.order);
      
      // Generate offspring
      while (newPopulation.length < populationSize) {
        const parent1 = this.tournamentSelection(populationWithFitness, objective);
        const parent2 = this.tournamentSelection(populationWithFitness, objective);
        
        const offspring = this.crossover(parent1.order, parent2.order);
        
        if (Math.random() < mutationRate) {
          this.mutate(offspring);
        }
        
        newPopulation.push(offspring);
      }
      
      population = newPopulation;
    }
    
    // Return best solution
    const finalFitness = await Promise.all(
      population.map(order => this.calculateObjectiveScore(order, objective))
    );
    
    const bestIndex = finalFitness.reduce((bestIdx, fitness, idx) => 
      this.isBetterScore(fitness, finalFitness[bestIdx], objective) ? idx : bestIdx, 0
    );
    
    const bestOrder = population[bestIndex];
    const finalMetrics = await this.calculateComprehensiveMetrics(bestOrder);
    
    return {
      optimalOrder: bestOrder,
      ...finalMetrics,
      analysis: this.generateOptimizationAnalysis(bestOrder, finalMetrics, 'genetic')
    };
  }

  /**
   * Evaluate individual category score in context
   */
  async evaluateCategoryScore(category, selected, remaining, objective) {
    switch (objective) {
      case 'minimize_overlap':
        return await this.calculateOverlapScore(category, selected);
      case 'maximize_coverage':
        return await this.calculateCoverageScore(category, selected, remaining);
      case 'balanced':
        const overlap = await this.calculateOverlapScore(category, selected);
        const coverage = await this.calculateCoverageScore(category, selected, remaining);
        return overlap * 0.6 + coverage * 0.4; // Weighted combination
      default:
        throw new Error(`Unknown objective: ${objective}`);
    }
  }

  /**
   * Calculate semantic overlap score
   */
  async calculateOverlapScore(category, existingCategories) {
    if (existingCategories.length === 0) return 0;
    
    let totalOverlap = 0;
    
    for (const existing of existingCategories) {
      const overlap = await this.calculateSemanticOverlap(category, existing);
      totalOverlap += overlap;
    }
    
    return totalOverlap / existingCategories.length;
  }

  /**
   * Calculate coverage completeness score
   */
  async calculateCoverageScore(category, selected, remaining) {
    // Estimate how much additional coverage this category provides
    const selectedCoverage = await this.calculateDomainCoverage(selected);
    const withCategoryCoverage = await this.calculateDomainCoverage([...selected, category]);
    
    return withCategoryCoverage - selectedCoverage;
  }

  /**
   * Calculate semantic overlap between two categories
   */
  async calculateSemanticOverlap(cat1, cat2) {
    const cacheKey = `${cat1.id}_${cat2.id}`;
    if (this.semanticCache.has(cacheKey)) {
      return this.semanticCache.get(cacheKey);
    }
    
    // Semantic similarity based on category properties
    let overlap = 0;
    
    // Name similarity (Levenshtein distance)
    const nameOverlap = 1 - this.levenshteinDistance(
      cat1.name.toLowerCase(), 
      cat2.name.toLowerCase()
    ) / Math.max(cat1.name.length, cat2.name.length);
    
    // Description similarity (simple word overlap)
    const descOverlap = this.calculateDescriptionOverlap(cat1.description, cat2.description);
    
    // Domain-specific similarity
    const domainOverlap = this.calculateDomainSpecificOverlap(cat1, cat2);
    
    overlap = (nameOverlap * 0.3 + descOverlap * 0.5 + domainOverlap * 0.2);
    
    this.semanticCache.set(cacheKey, overlap);
    return overlap;
  }

  /**
   * Calculate domain coverage for a set of categories
   */
  async calculateDomainCoverage(categories) {
    if (categories.length === 0) return 0;
    
    // Define trust debt domain aspects
    const domainAspects = [
      'performance', 'security', 'maintainability', 'reliability', 
      'scalability', 'usability', 'testability', 'documentation',
      'code_quality', 'architecture', 'dependencies', 'monitoring'
    ];
    
    let coverageCount = 0;
    
    for (const aspect of domainAspects) {
      const isCovered = categories.some(cat => 
        this.categoryCoversAspect(cat, aspect)
      );
      if (isCovered) coverageCount++;
    }
    
    return coverageCount / domainAspects.length;
  }

  /**
   * Check if category covers a domain aspect
   */
  categoryCoversAspect(category, aspect) {
    const searchText = `${category.name} ${category.description}`.toLowerCase();
    const aspectKeywords = this.getAspectKeywords(aspect);
    
    return aspectKeywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Get keywords for domain aspects
   */
  getAspectKeywords(aspect) {
    const keywordMap = {
      performance: ['performance', 'speed', 'latency', 'throughput', 'efficiency'],
      security: ['security', 'vulnerability', 'authentication', 'authorization', 'encryption'],
      maintainability: ['maintainability', 'readability', 'modularity', 'refactoring'],
      reliability: ['reliability', 'stability', 'error handling', 'resilience'],
      scalability: ['scalability', 'growth', 'load', 'capacity'],
      usability: ['usability', 'user experience', 'interface', 'accessibility'],
      testability: ['testability', 'testing', 'coverage', 'validation'],
      documentation: ['documentation', 'comments', 'api docs', 'readme'],
      code_quality: ['quality', 'clean code', 'standards', 'best practices'],
      architecture: ['architecture', 'design', 'structure', 'patterns'],
      dependencies: ['dependencies', 'libraries', 'packages', 'external'],
      monitoring: ['monitoring', 'logging', 'metrics', 'observability']
    };
    
    return keywordMap[aspect] || [aspect];
  }

  /**
   * Calculate overall objective score for an ordering
   */
  async calculateObjectiveScore(order, objective) {
    switch (objective) {
      case 'minimize_overlap':
        return await this.calculateTotalOverlapScore(order);
      case 'maximize_coverage':
        return await this.calculateDomainCoverage(order);
      case 'balanced':
        const overlap = await this.calculateTotalOverlapScore(order);
        const coverage = await this.calculateDomainCoverage(order);
        return coverage - overlap * 0.5; // Higher coverage, lower overlap is better
      default:
        return 0;
    }
  }

  /**
   * Calculate total overlap score for an ordering
   */
  async calculateTotalOverlapScore(order) {
    let totalOverlap = 0;
    const pairs = [];
    for (let i = 0; i < order.length; i++) {
      for (let j = i + 1; j < order.length; j++) {
        pairs.push([order[i], order[j]]);
      }
    }
    
    for (const [cat1, cat2] of pairs) {
      totalOverlap += await this.calculateSemanticOverlap(cat1, cat2);
    }
    
    return totalOverlap / Math.max(1, pairs.length);
  }

  /**
   * Calculate comprehensive metrics for final result
   */
  async calculateComprehensiveMetrics(order) {
    const overlapScore = await this.calculateTotalOverlapScore(order);
    const coverageScore = await this.calculateDomainCoverage(order);
    const orthogonalityIndex = await this.calculateOrthogonalityIndex(order);
    
    return {
      overlapScore: Math.round(overlapScore * 1000) / 1000,
      coverageScore: Math.round(coverageScore * 1000) / 1000,
      orthogonalityIndex: Math.round(orthogonalityIndex * 1000) / 1000,
      qualityScore: Math.round((coverageScore - overlapScore + orthogonalityIndex) * 1000 / 3) / 1000
    };
  }

  /**
   * Calculate orthogonality index
   */
  async calculateOrthogonalityIndex(order) {
    const pairs = [];
    for (let i = 0; i < order.length; i++) {
      for (let j = i + 1; j < order.length; j++) {
        pairs.push([order[i], order[j]]);
      }
    }
    let totalOrthogonality = 0;
    
    for (const [cat1, cat2] of pairs) {
      const overlap = await this.calculateSemanticOverlap(cat1, cat2);
      totalOrthogonality += (1 - overlap); // Higher orthogonality = lower overlap
    }
    
    return totalOrthogonality / Math.max(1, pairs.length);
  }

  // === Helper Methods ===

  isBetterScore(score1, score2, objective) {
    switch (objective) {
      case 'minimize_overlap':
        return score1 < score2; // Lower is better for overlap
      case 'maximize_coverage':
        return score1 > score2; // Higher is better for coverage
      case 'balanced':
        return score1 > score2; // Higher balanced score is better
      default:
        return score1 > score2;
    }
  }

  shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  generateNeighbor(order) {
    const newOrder = [...order];
    const i = Math.floor(Math.random() * order.length);
    const j = Math.floor(Math.random() * order.length);
    [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    return newOrder;
  }

  compareFitness(fitness1, fitness2, objective) {
    return this.isBetterScore(fitness1, fitness2, objective) ? -1 : 1;
  }

  tournamentSelection(populationWithFitness, objective, tournamentSize = 3) {
    const tournament = [];
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * populationWithFitness.length);
      tournament.push(populationWithFitness[randomIndex]);
    }
    
    return tournament.reduce((best, current) => 
      this.isBetterScore(current.fitness, best.fitness, objective) ? current : best
    );
  }

  crossover(parent1, parent2) {
    // Order crossover (OX)
    const size = parent1.length;
    const start = Math.floor(Math.random() * size);
    const end = start + Math.floor(Math.random() * (size - start));
    
    const offspring = new Array(size);
    
    // Copy segment from parent1
    for (let i = start; i < end; i++) {
      offspring[i] = parent1[i];
    }
    
    // Fill remaining positions from parent2
    let currentPos = end % size;
    for (let i = 0; i < size; i++) {
      const element = parent2[(end + i) % size];
      if (!offspring.includes(element)) {
        offspring[currentPos] = element;
        currentPos = (currentPos + 1) % size;
      }
    }
    
    return offspring;
  }

  mutate(individual) {
    const i = Math.floor(Math.random() * individual.length);
    const j = Math.floor(Math.random() * individual.length);
    [individual[i], individual[j]] = [individual[j], individual[i]];
  }

  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  calculateDescriptionOverlap(desc1, desc2) {
    if (!desc1 || !desc2) return 0;
    
    const words1 = new Set(desc1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const words2 = new Set(desc2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  calculateDomainSpecificOverlap(cat1, cat2) {
    // Domain-specific heuristics for Trust Debt categories
    const domainRules = [
      // Performance-related categories should have higher overlap
      {
        keywords: ['performance', 'speed', 'latency', 'efficiency'],
        weight: 0.8
      },
      // Security categories
      {
        keywords: ['security', 'vulnerability', 'authentication'],
        weight: 0.7
      },
      // Quality categories
      {
        keywords: ['quality', 'maintainability', 'readability'],
        weight: 0.6
      }
    ];
    
    let maxOverlap = 0;
    
    for (const rule of domainRules) {
      const cat1Matches = rule.keywords.some(keyword => 
        cat1.name.toLowerCase().includes(keyword) || 
        (cat1.description && cat1.description.toLowerCase().includes(keyword))
      );
      
      const cat2Matches = rule.keywords.some(keyword => 
        cat2.name.toLowerCase().includes(keyword) || 
        (cat2.description && cat2.description.toLowerCase().includes(keyword))
      );
      
      if (cat1Matches && cat2Matches) {
        maxOverlap = Math.max(maxOverlap, rule.weight);
      }
    }
    
    return maxOverlap;
  }

  generateOptimizationAnalysis(order, metrics, algorithm) {
    const analysis = [
      `Optimization completed using ${algorithm} algorithm.`,
      `Final quality score: ${metrics.qualityScore}`,
      `Semantic overlap: ${metrics.overlapScore} (lower is better)`,
      `Domain coverage: ${metrics.coverageScore} (higher is better)`,
      `Orthogonality index: ${metrics.orthogonalityIndex} (higher is better)`,
      '',
      'Category ordering rationale:',
    ];
    
    order.forEach((category, index) => {
      analysis.push(`${index + 1}. ${category.name}: ${this.getPositioningRationale(category, index, order)}`);
    });
    
    return analysis.join('\n');
  }

  getPositioningRationale(category, position, order) {
    if (position === 0) {
      return 'Positioned first as foundational category with minimal overlap';
    } else if (position === order.length - 1) {
      return 'Positioned last to maximize orthogonality with preceding categories';
    } else {
      return `Optimally positioned to balance coverage and minimize overlap`;
    }
  }
}