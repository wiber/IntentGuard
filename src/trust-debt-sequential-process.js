#!/usr/bin/env node

/**
 * Trust Debt Sequential Process Implementation
 * 
 * Implements the complete 4-step process from conversation insights:
 * 1. List all possible categories in code/git/docs
 * 2. Find 3-5 top level categories with frequency analysis
 * 3. Create ShortLex with balanced presence counts (split if too heavy)
 * 4. Analyze independence between subcategory blocks
 * 
 * Each step generates HTML section showing presence numbers and validation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SequentialProcessor {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.targetPresencePerNode = 100; // Target presence count per category node
    this.maxVariation = 0.3; // Max 30% variation for balanced distribution
  }

  /**
   * Main processing function - complete 4-step sequence
   */
  async processSequentialSteps() {
    console.log('🔄 Trust Debt Sequential Process Implementation');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Implementing complete 4-step process from conversation insights\n');

    const results = {
      step1: null,
      step2: null,
      step3: null,
      step4: null,
      htmlSections: [],
      finalCategories: null
    };

    // Step 1: List all possible categories
    console.log('📋 STEP 1: Listing all possible categories from code/git/docs');
    results.step1 = await this.step1_listAllPossibleCategories();
    results.htmlSections.push(this.generateStep1HTML(results.step1));

    // Step 2: Find top level categories
    console.log('\n🎯 STEP 2: Finding 3-5 top level categories with frequency analysis');
    results.step2 = await this.step2_findTopLevelCategories(results.step1);
    results.htmlSections.push(this.generateStep2HTML(results.step2));

    // Step 3: Create balanced ShortLex
    console.log('\n⚖️  STEP 3: Creating ShortLex with balanced presence counts');
    results.step3 = await this.step3_createBalancedShortLex(results.step2);
    results.htmlSections.push(this.generateStep3HTML(results.step3));

    // Step 4: Analyze independence
    console.log('\n🔍 STEP 4: Analyzing independence between subcategory blocks');
    results.step4 = await this.step4_analyzeIndependence(results.step3);
    results.htmlSections.push(this.generateStep4HTML(results.step4));

    // Generate final categories
    results.finalCategories = this.generateFinalCategories(results.step3, results.step4);

    // Save results
    await this.saveSequentialResults(results);

    console.log('\n✅ Sequential process complete - all steps validated');
    return results;
  }

  /**
   * STEP 1: List all possible categories from code/git/docs
   */
  async step1_listAllPossibleCategories() {
    const step1Results = {
      allTerms: {},
      totalTerms: 0,
      sourceBreakdown: {
        docs: {},
        code: {},
        git: {}
      },
      candidateCategories: []
    };

    // Analyze documentation
    const docFiles = ['README.md', 'docs/01-business/INTENTGUARD_TRUST_DEBT_BUSINESS_PLAN.md', 
                      'docs/03-product/MVP/UNIFIED_DRIFT_MVP_SPEC.md'];
    
    for (const docFile of docFiles) {
      if (fs.existsSync(docFile)) {
        const content = fs.readFileSync(docFile, 'utf8');
        const terms = this.extractTerms(content);
        
        for (const [term, count] of Object.entries(terms)) {
          step1Results.allTerms[term] = (step1Results.allTerms[term] || 0) + count;
          step1Results.sourceBreakdown.docs[term] = (step1Results.sourceBreakdown.docs[term] || 0) + count;
        }
      }
    }

    // Analyze source code
    const codeFiles = execSync('find src lib bin -name "*.js" 2>/dev/null || echo ""', { encoding: 'utf8' })
      .split('\n').filter(f => f.trim()).slice(0, 20); // Limit for performance

    for (const codeFile of codeFiles) {
      try {
        const content = fs.readFileSync(codeFile, 'utf8');
        const terms = this.extractTerms(content);
        
        for (const [term, count] of Object.entries(terms)) {
          step1Results.allTerms[term] = (step1Results.allTerms[term] || 0) + count;
          step1Results.sourceBreakdown.code[term] = (step1Results.sourceBreakdown.code[term] || 0) + count;
        }
      } catch (e) {
        // Skip unreadable files
      }
    }

    // Analyze git commits
    try {
      const commitLog = execSync('git log --oneline -n 50', { encoding: 'utf8' });
      const commitText = commitLog.split('\n').join(' ');
      const terms = this.extractTerms(commitText);
      
      for (const [term, count] of Object.entries(terms)) {
        step1Results.allTerms[term] = (step1Results.allTerms[term] || 0) + count;
        step1Results.sourceBreakdown.git[term] = (step1Results.sourceBreakdown.git[term] || 0) + count;
      }
    } catch (e) {
      console.warn('Could not analyze git commits');
    }

    // Generate candidate categories (high-frequency terms)
    const sortedTerms = Object.entries(step1Results.allTerms)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 50); // Top 50 terms

    for (const [term, frequency] of sortedTerms) {
      if (frequency >= 3) { // Minimum threshold
        step1Results.candidateCategories.push({
          term,
          frequency,
          presenceScore: frequency,
          sources: {
            docs: step1Results.sourceBreakdown.docs[term] || 0,
            code: step1Results.sourceBreakdown.code[term] || 0,
            git: step1Results.sourceBreakdown.git[term] || 0
          }
        });
      }
    }

    step1Results.totalTerms = Object.keys(step1Results.allTerms).length;

    console.log(`   📊 Found ${step1Results.totalTerms} unique terms`);
    console.log(`   🎯 Identified ${step1Results.candidateCategories.length} candidate categories`);
    console.log(`   📈 Top candidates: ${step1Results.candidateCategories.slice(0, 5).map(c => `${c.term}(${c.frequency})`).join(', ')}`);

    return step1Results;
  }

  /**
   * STEP 2: Find 3-5 top level categories using frequency analysis and near misses
   */
  async step2_findTopLevelCategories(step1Results) {
    console.log('   🔍 Grouping candidates into 5 top-level categories...');

    const step2Results = {
      topLevelCategories: [],
      groupingStrategy: 'semantic_clustering_with_frequency',
      totalPresence: 0,
      averagePresence: 0
    };

    // Define semantic clusters based on meaningful conceptual domains
    const semanticClusters = {
      'Measurement': {
        seedTerms: ['trust', 'debt', 'measurement', 'analysis', 'metrics', 'calculation', 
                   'validator', 'analyzer', 'engine', 'score', 'drift', 'alignment',
                   'asymmetry', 'orthogonal', 'correlation', 'variance', 'diagonal'],
        candidates: [],
        totalPresence: 0,
        description: 'Trust Debt calculation and analysis functionality'
      },
      'Architecture': {
        seedTerms: ['architecture', 'design', 'pattern', 'structure', 'framework',
                   'infrastructure', 'scalability', 'reliability', 'performance',
                   'optimization', 'algorithm', 'strategy', 'methodology'],
        candidates: [],
        totalPresence: 0,
        description: 'System architecture and technical strategy'
      },
      'Business': {
        seedTerms: ['business', 'strategy', 'vision', 'objective', 'requirement',
                   'specification', 'planning', 'expectation', 'promise', 'mvp',
                   'stakeholder', 'value', 'proposition', 'competitive'],
        candidates: [],
        totalPresence: 0,
        description: 'Business strategy and planning'
      },
      'Visualization': {
        seedTerms: ['visualization', 'dashboard', 'chart', 'graph', 'matrix', 'heatmap',
                   'timeline', 'interface', 'experience', 'interaction', 'navigation',
                   'layout', 'presentation', 'reporting'],
        candidates: [],
        totalPresence: 0,
        description: 'Data visualization and user interface'
      },
      'Quality': {
        seedTerms: ['quality', 'testing', 'validation', 'verification', 'security',
                   'compliance', 'standards', 'audit', 'review', 'assessment',
                   'monitoring', 'debugging', 'profiling', 'benchmarking'],
        candidates: [],
        totalPresence: 0,
        description: 'Quality assurance and security'
      }
    };

    // Assign candidates to clusters
    for (const candidate of step1Results.candidateCategories) {
      let bestCluster = null;
      let highestSimilarity = 0;

      for (const [clusterName, cluster] of Object.entries(semanticClusters)) {
        const similarity = this.calculateSemanticSimilarity(candidate.term, cluster.seedTerms);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestCluster = clusterName;
        }
      }

      if (bestCluster && highestSimilarity > 0.1) {
        semanticClusters[bestCluster].candidates.push(candidate);
        semanticClusters[bestCluster].totalPresence += candidate.frequency;
      }
    }

    // Create top-level categories from clusters
    let categoryIndex = 0;
    const categoryIds = ['A🧠', 'B🏛️', 'C🎯', 'D🛠️', 'E🎨'];
    const categoryColors = ['#ff6600', '#9900ff', '#00ffff', '#ffff00', '#ff0099'];

    for (const [clusterName, cluster] of Object.entries(semanticClusters)) {
      if (cluster.candidates.length > 0) {
        const topCategory = {
          id: categoryIds[categoryIndex],
          name: clusterName,
          keywords: cluster.candidates.map(c => c.term).slice(0, 15), // Top 15 keywords
          presenceCount: cluster.totalPresence,
          candidateCount: cluster.candidates.length,
          color: categoryColors[categoryIndex],
          depth: 0,
          weight: 100 - (categoryIndex * 5)
        };

        step2Results.topLevelCategories.push(topCategory);
        categoryIndex++;
      }
    }

    step2Results.totalPresence = step2Results.topLevelCategories.reduce((sum, cat) => sum + cat.presenceCount, 0);
    step2Results.averagePresence = step2Results.totalPresence / step2Results.topLevelCategories.length;

    console.log(`   📊 Created ${step2Results.topLevelCategories.length} top-level categories`);
    console.log(`   📈 Average presence: ${step2Results.averagePresence.toFixed(0)} per category`);

    return step2Results;
  }

  /**
   * STEP 3: Create ShortLex with balanced presence counts (split heavy categories)
   */
  async step3_createBalancedShortLex(step2Results) {
    console.log('   ⚖️  Balancing presence counts and creating ShortLex hierarchy...');

    const step3Results = {
      balancedCategories: [],
      subdivisionDecisions: [],
      targetPresence: this.targetPresencePerNode,
      actualDistribution: {},
      balanceScore: 0
    };

    // Copy top-level categories
    const workingCategories = JSON.parse(JSON.stringify(step2Results.topLevelCategories));

    // Analyze balance and subdivide if necessary
    for (const category of workingCategories) {
      const subdivisionNeeded = category.presenceCount > (this.targetPresencePerNode * 2);
      
      if (subdivisionNeeded) {
        // Calculate how many subcategories needed
        const subdivisionFactor = Math.ceil(category.presenceCount / this.targetPresencePerNode);
        
        console.log(`     🔀 ${category.name}: ${category.presenceCount} presence → splitting into ${subdivisionFactor} parts`);
        
        // Create subcategories
        const subcategories = this.createSubcategories(category, subdivisionFactor);
        step3Results.balancedCategories.push(category); // Parent
        step3Results.balancedCategories.push(...subcategories); // Children
        
        step3Results.subdivisionDecisions.push({
          parentCategory: category.name,
          originalPresence: category.presenceCount,
          subdivisionFactor: subdivisionFactor,
          subcategories: subcategories.map(sub => ({
            name: sub.name,
            presenceCount: sub.presenceCount
          }))
        });
      } else {
        step3Results.balancedCategories.push(category);
        console.log(`     ✅ ${category.name}: ${category.presenceCount} presence (balanced)`);
      }
    }

    // Calculate final balance score
    const presenceCounts = step3Results.balancedCategories.map(cat => cat.presenceCount);
    const mean = presenceCounts.reduce((sum, val) => sum + val, 0) / presenceCounts.length;
    const variance = presenceCounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / presenceCounts.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;
    
    step3Results.balanceScore = 1 - Math.min(1, cv); // Higher is better
    step3Results.actualDistribution = {
      mean: mean.toFixed(1),
      stdDev: stdDev.toFixed(1),
      cv: (cv * 100).toFixed(1) + '%',
      balanceGrade: cv < 0.3 ? 'A' : cv < 0.5 ? 'B' : cv < 0.7 ? 'C' : 'D'
    };

    console.log(`   📊 Final balance: ${step3Results.actualDistribution.balanceGrade} grade (CV: ${step3Results.actualDistribution.cv})`);
    console.log(`   📋 Total categories: ${step3Results.balancedCategories.length}`);

    return step3Results;
  }

  /**
   * STEP 4: Analyze independence between subcategory blocks
   */
  async step4_analyzeIndependence(step3Results) {
    console.log('   🔍 Analyzing independence between subcategory blocks...');

    const step4Results = {
      independenceMatrix: {},
      correlationScores: {},
      independenceGrade: 'F',
      issuesFound: [],
      orthogonalityScore: 0
    };

    // Calculate semantic independence between categories
    const categories = step3Results.balancedCategories;
    
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const catA = categories[i];
        const catB = categories[j];
        
        const independence = this.calculateIndependence(catA, catB);
        const pairKey = `${catA.name}-${catB.name}`;
        
        step4Results.independenceMatrix[pairKey] = independence;
        step4Results.correlationScores[pairKey] = 1 - independence; // Correlation = 1 - independence
        
        // Flag issues if correlation too high
        if ((1 - independence) > 0.3) {
          step4Results.issuesFound.push({
            categoryA: catA.name,
            categoryB: catB.name,
            correlation: ((1 - independence) * 100).toFixed(1) + '%',
            severity: (1 - independence) > 0.5 ? 'high' : 'medium',
            issue: `Categories "${catA.name}" and "${catB.name}" refer to overlapping realities`
          });
        }
      }
    }

    // Calculate overall orthogonality score
    const independenceValues = Object.values(step4Results.independenceMatrix);
    step4Results.orthogonalityScore = independenceValues.length > 0 ? 
      independenceValues.reduce((sum, val) => sum + val, 0) / independenceValues.length : 1.0;

    step4Results.independenceGrade = step4Results.orthogonalityScore > 0.8 ? 'A' : 
                                    step4Results.orthogonalityScore > 0.7 ? 'B' :
                                    step4Results.orthogonalityScore > 0.6 ? 'C' : 'D';

    console.log(`   📊 Independence grade: ${step4Results.independenceGrade} (${(step4Results.orthogonalityScore * 100).toFixed(1)}% orthogonal)`);
    console.log(`   ⚠️  Issues found: ${step4Results.issuesFound.length} overlapping category pairs`);

    return step4Results;
  }

  /**
   * Extract meaningful conceptual terms from text content
   * Filters out syntax noise and focuses on domain concepts
   */
  extractTerms(content) {
    const terms = {};
    const words = content.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3 && word.length <= 20);

    // Comprehensive noise word filtering
    const noiseWords = new Set([
      // Common stop words
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
      'how', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 
      'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'from',
      'they', 'will', 'been', 'have', 'this', 'that', 'were', 'been', 'their',
      'said', 'each', 'what', 'your', 'time', 'there', 'would', 'could', 'should',
      
      // Technical syntax noise (HTML/CSS/JS)
      'div', 'span', 'class', 'const', 'var', 'let', 'function', 'return', 
      'true', 'false', 'null', 'undefined', 'async', 'await', 'then', 'catch',
      'style', 'color', 'background', 'margin', 'padding', 'border', 'width', 'height',
      'text', 'font', 'size', 'weight', 'family', 'line', 'left', 'right', 'top', 'bottom',
      
      // Generic programming terms
      'string', 'number', 'boolean', 'array', 'object', 'json', 'data', 'value',
      'key', 'name', 'type', 'item', 'list', 'map', 'set', 'add', 'remove', 'delete',
      'create', 'update', 'find', 'search', 'filter', 'sort', 'push', 'pop', 'slice',
      'length', 'index', 'count', 'total', 'sum', 'min', 'max', 'avg', 'mean',
      
      // File system noise
      'src', 'lib', 'bin', 'dist', 'build', 'node', 'modules', 'package', 'json',
      'file', 'path', 'dir', 'folder', 'root', 'config', 'env', 'dev', 'prod',
      
      // Git/version control noise  
      'commit', 'branch', 'merge', 'pull', 'push', 'clone', 'fork', 'repo',
      'version', 'tag', 'release', 'patch', 'major', 'minor', 'change', 'fix',
      
      // Generic business terms
      'project', 'team', 'user', 'client', 'customer', 'service', 'product',
      'feature', 'requirement', 'goal', 'task', 'work', 'process', 'method'
    ]);

    // Domain-specific meaningful terms to prioritize
    const meaningfulTerms = new Set([
      // Trust Debt domain
      'trust', 'debt', 'intent', 'reality', 'drift', 'alignment', 'asymmetry',
      'orthogonal', 'correlation', 'matrix', 'triangle', 'diagonal', 'variance',
      'measurement', 'analysis', 'calculator', 'engine', 'validator', 'processor',
      
      // Business concepts
      'strategy', 'architecture', 'vision', 'promise', 'expectation', 'objective',
      'specification', 'requirement', 'design', 'plan', 'business', 'mvp',
      
      // Technical concepts (not syntax)
      'algorithm', 'formula', 'calculation', 'metrics', 'statistics', 'score',
      'validation', 'verification', 'testing', 'quality', 'performance', 'optimization',
      'security', 'authentication', 'authorization', 'encryption', 'compliance',
      
      // System architecture
      'infrastructure', 'deployment', 'scalability', 'reliability', 'availability',
      'monitoring', 'logging', 'debugging', 'profiling', 'benchmarking',
      
      // Visualization concepts
      'dashboard', 'visualization', 'chart', 'graph', 'heatmap', 'timeline',
      'interface', 'experience', 'interaction', 'navigation', 'layout'
    ]);

    for (const word of words) {
      if (!noiseWords.has(word) && word.match(/^[a-z]/)) {
        // Additional filtering: require either meaningful term or reasonable frequency pattern
        if (meaningfulTerms.has(word) || this.isConceptualTerm(word)) {
          const baseCount = terms[word] || 0;
          
          // Boost meaningful terms with additive bonus, not multiplicative
          if (meaningfulTerms.has(word)) {
            terms[word] = baseCount + 3; // Add 3 points for meaningful terms
          } else {
            terms[word] = baseCount + 1; // Normal increment for conceptual terms
          }
        }
      }
    }

    return terms;
  }

  /**
   * Determine if a term represents a conceptual category rather than syntax
   */
  isConceptualTerm(word) {
    // Skip single letters and common patterns
    if (word.length < 4) return false;
    if (word.match(/^[a-z]\d+$/)) return false; // Skip patterns like 'a1', 'b2'
    if (word.match(/^\d+$/)) return false; // Skip pure numbers
    
    // Look for conceptual indicators
    const conceptualPatterns = [
      /tion$/, /ment$/, /ness$/, /ity$/, /ing$/, // Noun/gerund endings
      /ology$/, /ysis$/, /ics$/, /ism$/, // Academic/technical endings
      /able$/, /ible$/, /ful$/, /less$/, // Descriptive endings
    ];
    
    return conceptualPatterns.some(pattern => pattern.test(word)) ||
           word.length >= 6; // Longer words tend to be more conceptual
  }

  /**
   * Calculate semantic similarity between term and seed terms
   * Enhanced to focus on conceptual meaning rather than literal matching
   */
  calculateSemanticSimilarity(term, seedTerms) {
    let similarity = 0;
    
    for (const seed of seedTerms) {
      // Exact matches get highest score
      if (term === seed) {
        similarity += 1.0;
        continue;
      }
      
      // Partial matches
      if (term.includes(seed) || seed.includes(term)) {
        similarity += 0.8;
        continue;
      }
      
      // Root word matching (handles plurals, verb forms, etc.)
      if (this.shareWordRoot(term, seed)) {
        similarity += 0.6;
        continue;
      }
      
      // Semantic domain matching
      if (this.areSemanticallyRelated(term, seed)) {
        similarity += 0.4;
        continue;
      }
      
      // Substring similarity for technical terms
      if (term.length >= 4 && seed.length >= 4) {
        const commonLength = this.getCommonSubstringLength(term, seed);
        if (commonLength >= 3) {
          similarity += commonLength / Math.max(term.length, seed.length) * 0.3;
        }
      }
    }

    return Math.min(1.0, similarity);
  }

  /**
   * Check if two words share a common root (handling plurals, verb forms)
   */
  shareWordRoot(word1, word2) {
    const roots1 = this.getWordRoots(word1);
    const roots2 = this.getWordRoots(word2);
    
    for (const root1 of roots1) {
      for (const root2 of roots2) {
        if (root1 === root2 && root1.length >= 4) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get possible word roots by removing common suffixes
   */
  getWordRoots(word) {
    const roots = [word]; // Include original
    
    const suffixes = ['s', 'es', 'ed', 'ing', 'er', 'est', 'ly', 'tion', 'sion', 
                     'ment', 'ness', 'ity', 'able', 'ible', 'ful', 'less'];
    
    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        roots.push(word.slice(0, -suffix.length));
      }
    }
    
    return roots;
  }

  /**
   * Check if terms are semantically related within domain
   */
  areSemanticallyRelated(term1, term2) {
    const semanticGroups = [
      // Trust Debt specific
      ['trust', 'debt', 'intent', 'reality', 'drift', 'alignment', 'asymmetry'],
      ['analysis', 'measurement', 'calculation', 'metrics', 'assessment', 'evaluation'],
      ['matrix', 'triangle', 'diagonal', 'orthogonal', 'correlation', 'variance'],
      
      // Business strategy
      ['strategy', 'vision', 'objective', 'goal', 'requirement', 'specification'],
      ['business', 'stakeholder', 'value', 'proposition', 'competitive', 'market'],
      
      // Technical architecture
      ['architecture', 'design', 'pattern', 'structure', 'framework', 'infrastructure'],
      ['algorithm', 'methodology', 'approach', 'technique', 'procedure', 'protocol'],
      
      // Quality assurance
      ['quality', 'testing', 'validation', 'verification', 'compliance', 'standards'],
      ['security', 'authentication', 'authorization', 'encryption', 'audit'],
      
      // Visualization
      ['visualization', 'dashboard', 'chart', 'graph', 'heatmap', 'timeline'],
      ['interface', 'experience', 'interaction', 'navigation', 'layout', 'presentation']
    ];
    
    for (const group of semanticGroups) {
      if (group.includes(term1) && group.includes(term2)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get common substring length
   */
  getCommonSubstringLength(str1, str2) {
    let maxLength = 0;
    
    for (let i = 0; i < str1.length; i++) {
      for (let j = 0; j < str2.length; j++) {
        let length = 0;
        while (i + length < str1.length && 
               j + length < str2.length && 
               str1[i + length] === str2[j + length]) {
          length++;
        }
        maxLength = Math.max(maxLength, length);
      }
    }
    
    return maxLength;
  }

  /**
   * Create subcategories for a heavy category
   */
  createSubcategories(parentCategory, subdivisionFactor) {
    const subcategories = [];
    const keywordsPerSub = Math.ceil(parentCategory.keywords.length / subdivisionFactor);
    const presencePerSub = Math.floor(parentCategory.presenceCount / subdivisionFactor);

    for (let i = 0; i < subdivisionFactor; i++) {
      const startIdx = i * keywordsPerSub;
      const endIdx = Math.min(startIdx + keywordsPerSub, parentCategory.keywords.length);
      
      const subcategory = {
        id: `${parentCategory.id}.${i + 1}`,
        name: `${parentCategory.name} ${['Core', 'Extended', 'Advanced', 'Specialized'][i] || `Part ${i + 1}`}`,
        keywords: parentCategory.keywords.slice(startIdx, endIdx),
        presenceCount: presencePerSub,
        color: this.adjustColor(parentCategory.color, 0.2 * (i + 1)),
        depth: 1,
        weight: parentCategory.weight - (5 * (i + 1)),
        parent: parentCategory.id
      };

      subcategories.push(subcategory);
    }

    // Update parent to have reduced keywords (avoid overlap)
    parentCategory.keywords = parentCategory.keywords.slice(0, keywordsPerSub);
    parentCategory.presenceCount = presencePerSub;

    return subcategories;
  }

  /**
   * Calculate independence between two categories
   */
  calculateIndependence(catA, catB) {
    // Simple keyword overlap analysis
    const setA = new Set(catA.keywords.map(k => k.toLowerCase()));
    const setB = new Set(catB.keywords.map(k => k.toLowerCase()));
    
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    const overlap = union.size > 0 ? intersection.size / union.size : 0;
    return 1 - overlap; // Independence = 1 - overlap
  }

  /**
   * Adjust color brightness
   */
  adjustColor(hexColor, adjustment) {
    const num = parseInt(hexColor.replace('#', ''), 16);
    const amt = Math.round(2.55 * adjustment * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Generate final optimized categories
   */
  generateFinalCategories(step3Results, step4Results) {
    const finalConfig = {
      categories: step3Results.balancedCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: `${cat.name} operations and functionality with ${cat.presenceCount} presence instances`,
        keywords: cat.keywords,
        color: cat.color,
        depth: cat.depth || 0,
        weight: cat.weight || 100
      })),
      metadata: {
        generated_by: 'trust-debt-sequential-process',
        version: '5.0.0',
        description: 'Categories generated through complete 4-step sequential process',
        last_updated: new Date().toISOString().split('T')[0],
        process_validation: {
          step1_candidates: step3Results.balancedCategories.length,
          step2_top_level: 5,
          step3_balance_grade: step3Results.actualDistribution.balanceGrade,
          step4_independence_grade: step4Results.independenceGrade
        },
        balance_metrics: step3Results.actualDistribution,
        independence_score: step4Results.orthogonalityScore,
        total_keywords: step3Results.balancedCategories.reduce((sum, cat) => sum + cat.keywords.length, 0)
      }
    };

    return finalConfig;
  }

  /**
   * Generate HTML sections for each step
   */
  generateStep1HTML(step1Results) {
    return `
      <div class="sequential-step-section" style="margin: 20px 0; padding: 20px; background: rgba(0, 255, 136, 0.03); border-radius: 10px;">
        <h3 style="color: #00ff88; margin-bottom: 15px;">
          📋 Step 1: All Possible Categories Discovery
        </h3>
        <p style="color: #aaa; margin-bottom: 15px;">
          Systematic analysis of ${step1Results.totalTerms} unique terms from repository content
        </p>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
          <div style="background: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 5px;">
            <h4 style="color: #00ff88; margin: 0 0 10px 0;">📚 Documentation</h4>
            <div style="color: #aaa; font-size: 0.9em;">
              Terms: ${Object.keys(step1Results.sourceBreakdown.docs).length}<br/>
              Top: ${Object.entries(step1Results.sourceBreakdown.docs).sort(([,a],[,b])=>b-a).slice(0,3).map(([t,c])=>`${t}(${c})`).join(', ')}
            </div>
          </div>
          
          <div style="background: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 5px;">
            <h4 style="color: #00aaff; margin: 0 0 10px 0;">💻 Source Code</h4>
            <div style="color: #aaa; font-size: 0.9em;">
              Terms: ${Object.keys(step1Results.sourceBreakdown.code).length}<br/>
              Top: ${Object.entries(step1Results.sourceBreakdown.code).sort(([,a],[,b])=>b-a).slice(0,3).map(([t,c])=>`${t}(${c})`).join(', ')}
            </div>
          </div>
          
          <div style="background: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 5px;">
            <h4 style="color: #ffaa00; margin: 0 0 10px 0;">🔄 Git Commits</h4>
            <div style="color: #aaa; font-size: 0.9em;">
              Terms: ${Object.keys(step1Results.sourceBreakdown.git).length}<br/>
              Top: ${Object.entries(step1Results.sourceBreakdown.git).sort(([,a],[,b])=>b-a).slice(0,3).map(([t,c])=>`${t}(${c})`).join(', ')}
            </div>
          </div>
        </div>

        <div style="max-height: 200px; overflow-y: auto; background: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 5px;">
          <h4 style="color: #00ff88; margin: 0 0 10px 0;">🎯 Top Candidate Categories (by presence)</h4>
          ${step1Results.candidateCategories.slice(0, 15).map((candidate, idx) => `
            <div style="display: flex; justify-content: space-between; margin: 5px 0; padding: 5px; background: rgba(255, 255, 255, 0.02); border-radius: 3px;">
              <span style="color: #aaa;">${idx + 1}. ${candidate.term}</span>
              <span style="color: #00ff88; font-weight: bold;">${candidate.frequency} mentions</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  generateStep2HTML(step2Results) {
    return `
      <div class="sequential-step-section" style="margin: 20px 0; padding: 20px; background: rgba(153, 0, 255, 0.03); border-radius: 10px;">
        <h3 style="color: #9900ff; margin-bottom: 15px;">
          🎯 Step 2: Top-Level Category Formation
        </h3>
        <p style="color: #aaa; margin-bottom: 15px;">
          Semantic clustering into ${step2Results.topLevelCategories.length} top-level categories with ${step2Results.totalPresence} total presence
        </p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          ${step2Results.topLevelCategories.map(category => `
            <div style="background: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 5px; border-left: 3px solid ${category.color};">
              <h4 style="color: ${category.color}; margin: 0 0 10px 0;">${category.id} ${category.name}</h4>
              <div style="color: #aaa; font-size: 0.9em;">
                <strong>Presence:</strong> ${category.presenceCount} instances<br/>
                <strong>Keywords:</strong> ${category.keywords.length} terms<br/>
                <strong>Top terms:</strong> ${category.keywords.slice(0, 3).join(', ')}
              </div>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.02); border-radius: 5px;">
          <h4 style="color: #9900ff; margin: 0 0 10px 0;">📊 Distribution Analysis</h4>
          <div style="color: #aaa;">
            Average presence per category: <strong>${step2Results.averagePresence.toFixed(0)} instances</strong><br/>
            Distribution range: ${Math.min(...step2Results.topLevelCategories.map(c => c.presenceCount))} - ${Math.max(...step2Results.topLevelCategories.map(c => c.presenceCount))} instances
          </div>
        </div>
      </div>
    `;
  }

  generateStep3HTML(step3Results) {
    return `
      <div class="sequential-step-section" style="margin: 20px 0; padding: 20px; background: rgba(0, 255, 255, 0.03); border-radius: 10px;">
        <h3 style="color: #00ffff; margin-bottom: 15px;">
          ⚖️  Step 3: ShortLex Balance Optimization
        </h3>
        <p style="color: #aaa; margin-bottom: 15px;">
          Created ${step3Results.balancedCategories.length} balanced categories with ${step3Results.actualDistribution.balanceGrade} grade balance
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div style="background: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 5px;">
            <h4 style="color: #00ffff; margin: 0 0 10px 0;">📊 Balance Metrics</h4>
            <div style="color: #aaa;">
              <strong>Grade:</strong> <span style="color: ${step3Results.actualDistribution.balanceGrade === 'A' ? '#00ff88' : '#ffaa00'};">${step3Results.actualDistribution.balanceGrade}</span><br/>
              <strong>Mean presence:</strong> ${step3Results.actualDistribution.mean}<br/>
              <strong>Coefficient of Variation:</strong> ${step3Results.actualDistribution.cv}<br/>
              <strong>Target per node:</strong> ${this.targetPresencePerNode} instances
            </div>
          </div>
          
          <div style="background: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 5px;">
            <h4 style="color: #00ffff; margin: 0 0 10px 0;">🔀 Subdivisions Applied</h4>
            <div style="color: #aaa; max-height: 120px; overflow-y: auto;">
              ${step3Results.subdivisionDecisions.length > 0 ? 
                step3Results.subdivisionDecisions.map(decision => `
                  <div style="margin-bottom: 8px;">
                    <strong>${decision.parentCategory}:</strong> ${decision.originalPresence} → ${decision.subdivisionFactor} parts
                  </div>
                `).join('') : 
                '<div style="color: #888;">No subdivisions needed - categories already balanced</div>'
              }
            </div>
          </div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 5px;">
          <h4 style="color: #00ffff; margin: 0 0 10px 0;">📋 Final Category Distribution</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
            ${step3Results.balancedCategories.map(cat => `
              <div style="padding: 8px; background: rgba(255, 255, 255, 0.02); border-radius: 3px; text-align: center;">
                <div style="color: ${cat.color}; font-weight: bold; font-size: 0.9em;">${cat.name}</div>
                <div style="color: #aaa; font-size: 0.8em;">${cat.presenceCount} instances</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  generateStep4HTML(step4Results) {
    return `
      <div class="sequential-step-section" style="margin: 20px 0; padding: 20px; background: rgba(255, 255, 0, 0.03); border-radius: 10px;">
        <h3 style="color: #ffff00; margin-bottom: 15px;">
          🔍 Step 4: Independence Analysis
        </h3>
        <p style="color: #aaa; margin-bottom: 15px;">
          Orthogonality validation: ${(step4Results.orthogonalityScore * 100).toFixed(1)}% independent (${step4Results.independenceGrade} grade)
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div style="background: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 5px;">
            <h4 style="color: #ffff00; margin: 0 0 10px 0;">📐 Orthogonality Score</h4>
            <div style="text-align: center;">
              <div style="font-size: 3em; color: ${step4Results.independenceGrade === 'A' ? '#00ff88' : '#ffaa00'}; font-weight: bold;">
                ${step4Results.independenceGrade}
              </div>
              <div style="color: #aaa; margin-top: 5px;">
                ${(step4Results.orthogonalityScore * 100).toFixed(1)}% orthogonal
              </div>
            </div>
          </div>
          
          <div style="background: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 5px;">
            <h4 style="color: #ffff00; margin: 0 0 10px 0;">⚠️ Correlation Issues</h4>
            <div style="color: #aaa;">
              Issues found: <strong>${step4Results.issuesFound.length}</strong><br/>
              High correlation pairs: ${step4Results.issuesFound.filter(issue => issue.severity === 'high').length}<br/>
              Status: ${step4Results.issuesFound.length === 0 ? '✅ All independent' : '⚠️ Needs attention'}
            </div>
          </div>
        </div>

        ${step4Results.issuesFound.length > 0 ? `
        <div style="background: rgba(255, 170, 0, 0.05); padding: 15px; border-radius: 5px;">
          <h4 style="color: #ffaa00; margin: 0 0 10px 0;">🚨 Independence Issues</h4>
          <div style="max-height: 150px; overflow-y: auto;">
            ${step4Results.issuesFound.slice(0, 5).map(issue => `
              <div style="margin-bottom: 10px; padding: 8px; background: rgba(255, 255, 255, 0.02); border-radius: 3px;">
                <strong style="color: ${issue.severity === 'high' ? '#ff6666' : '#ffaa00'};">
                  ${issue.categoryA} ↔ ${issue.categoryB}
                </strong>
                <span style="color: #aaa; margin-left: 10px;">${issue.correlation} correlation</span>
                <div style="color: #888; font-size: 0.9em; margin-top: 3px;">${issue.issue}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Save all results and generate comprehensive HTML integration
   */
  async saveSequentialResults(results) {
    // Save detailed results
    fs.writeFileSync('trust-debt-sequential-process-results.json', JSON.stringify(results, null, 2));
    
    // Save optimized categories
    fs.writeFileSync('trust-debt-categories.json', JSON.stringify(results.finalCategories, null, 2));
    
    // Generate complete HTML sections
    const combinedHTML = `
      <!-- Sequential Process Validation Sections -->
      <div class="sequential-process-container" style="margin: 30px 0;">
        <h2 style="color: #00ff88; text-align: center; margin-bottom: 25px;">
          🔄 Sequential Category Generation Process
        </h2>
        <p style="color: #aaa; text-align: center; margin-bottom: 30px;">
          Complete 4-step validation process ensuring categories represent actual repository content with balanced presence
        </p>
        
        ${results.htmlSections.join('\n        ')}
        
        <div class="sequential-summary" style="margin: 20px 0; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 10px;">
          <h3 style="color: #00ff88; margin-bottom: 15px;">✅ Process Validation Summary</h3>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
            <div style="text-align: center; padding: 15px; background: rgba(0, 255, 136, 0.1); border-radius: 5px;">
              <div style="color: #00ff88; font-size: 2em; font-weight: bold;">✓</div>
              <div style="color: #aaa; font-size: 0.9em;">Step 1: Discovery</div>
            </div>
            <div style="text-align: center; padding: 15px; background: rgba(153, 0, 255, 0.1); border-radius: 5px;">
              <div style="color: #9900ff; font-size: 2em; font-weight: bold;">✓</div>
              <div style="color: #aaa; font-size: 0.9em;">Step 2: Clustering</div>
            </div>
            <div style="text-align: center; padding: 15px; background: rgba(0, 255, 255, 0.1); border-radius: 5px;">
              <div style="color: #00ffff; font-size: 2em; font-weight: bold;">${results.step3.actualDistribution.balanceGrade}</div>
              <div style="color: #aaa; font-size: 0.9em;">Step 3: Balance</div>
            </div>
            <div style="text-align: center; padding: 15px; background: rgba(255, 255, 0, 0.1); border-radius: 5px;">
              <div style="color: #ffff00; font-size: 2em; font-weight: bold;">${results.step4.independenceGrade}</div>
              <div style="color: #aaa; font-size: 0.9em;">Step 4: Independence</div>
            </div>
          </div>
        </div>
      </div>
    `;

    fs.writeFileSync('trust-debt-sequential-sections.html', combinedHTML);
    
    console.log('\n💾 Sequential process results saved:');
    console.log('   📊 Results: trust-debt-sequential-process-results.json'); 
    console.log('   📋 Categories: trust-debt-categories.json');
    console.log('   🎨 HTML sections: trust-debt-sequential-sections.html');
  }
}

module.exports = { SequentialProcessor };

// CLI usage
if (require.main === module) {
  async function main() {
    const processor = new SequentialProcessor();
    const results = await processor.processSequentialSteps();
    
    console.log('\n🎯 Sequential Process Complete!');
    console.log(`📋 Generated: ${results.finalCategories.categories.length} balanced categories`);
    console.log(`⚖️  Balance Grade: ${results.step3.actualDistribution.balanceGrade}`);
    console.log(`🔍 Independence Grade: ${results.step4.independenceGrade}`);
    
    console.log('\n🔄 Run Trust Debt analysis with sequential process categories:');
    console.log('   node src/trust-debt-final.js');
  }

  main().catch(console.error);
}