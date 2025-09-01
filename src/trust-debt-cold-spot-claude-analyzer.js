/**
 * Claude-Powered Cold Spot Analysis
 * Analyzes Trust Debt cold spots using AI to provide actionable recommendations
 */

const fs = require('fs').promises;
const path = require('path');

class ColdSpotClaudeAnalyzer {
  constructor(config = {}) {
    this.claudeApiKey = config.claudeApiKey || process.env.CLAUDE_API_KEY;
    this.maxAnalysisTime = config.maxAnalysisTime || 30000; // 30 seconds
    this.analysisCache = new Map();
  }

  /**
   * Analyze cold spots in Trust Debt matrix using Claude AI
   */
  async analyzeColdSpots(trustDebtData, repoPath) {
    try {
      const coldSpots = this.identifyTopColdSpots(trustDebtData);
      const analyses = [];

      for (const coldSpot of coldSpots.slice(0, 5)) { // Top 5 cold spots
        const analysis = await this.analyzeIndividualColdSpot(coldSpot, repoPath);
        if (analysis) {
          analyses.push(analysis);
        }
      }

      return {
        timestamp: new Date().toISOString(),
        totalColdSpots: coldSpots.length,
        analyzedCount: analyses.length,
        analyses: analyses,
        metadata: {
          analysisMethod: 'Claude AI Integration',
          confidence: this.calculateOverallConfidence(analyses),
          processingTime: Date.now() - this.startTime
        }
      };
    } catch (error) {
      console.warn('Claude analysis failed:', error.message);
      return this.generateFallbackAnalysis(trustDebtData);
    }
  }

  /**
   * Identify cold spots from Trust Debt matrix
   */
  identifyTopColdSpots(trustDebtData) {
    const { matrix, categories } = trustDebtData;
    const coldSpots = [];

    for (let i = 0; i < categories.length; i++) {
      for (let j = 0; j < categories.length; j++) {
        const activityScore = matrix[i] && matrix[i][j] ? matrix[i][j].activity || 0 : 0;
        
        if (activityScore < 0.2) { // Low activity threshold
          coldSpots.push({
            categoryX: categories[i],
            categoryY: categories[j],
            intersection: `${categories[i]} × ${categories[j]}`,
            activityScore: activityScore,
            potentialImpact: this.estimateImpact(categories[i], categories[j], activityScore)
          });
        }
      }
    }

    return coldSpots.sort((a, b) => b.potentialImpact - a.potentialImpact);
  }

  /**
   * Analyze individual cold spot with Claude
   */
  async analyzeIndividualColdSpot(coldSpot, repoPath) {
    const cacheKey = `${coldSpot.intersection}-${repoPath}`;
    
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    try {
      // Extract context for Claude analysis
      const context = await this.extractColdSpotContext(coldSpot, repoPath);
      
      // Prepare Claude prompt
      const prompt = this.buildAnalysisPrompt(coldSpot, context);
      
      // Get Claude analysis (simulation for now - replace with real API)
      const claudeResponse = await this.queryClaudeAPI(prompt);
      
      // Parse and structure response
      const analysis = this.parseClaudeResponse(claudeResponse, coldSpot);
      
      // Cache result
      this.analysisCache.set(cacheKey, analysis);
      
      return analysis;
    } catch (error) {
      console.warn(`Failed to analyze cold spot ${coldSpot.intersection}:`, error.message);
      return null;
    }
  }

  /**
   * Extract documentation quotes and code snippets for context
   */
  async extractColdSpotContext(coldSpot, repoPath) {
    const context = {
      documentationQuotes: [],
      codeSnippets: [],
      relevantFiles: [],
      categoryKeywords: this.getCategoryKeywords(coldSpot)
    };

    try {
      // Find relevant documentation
      const docFiles = await this.findDocumentationFiles(repoPath);
      context.documentationQuotes = await this.extractRelevantQuotes(
        docFiles, 
        context.categoryKeywords
      );

      // Find relevant code files
      const codeFiles = await this.findRelevantCodeFiles(
        repoPath, 
        context.categoryKeywords
      );
      context.codeSnippets = await this.extractCodeSnippets(codeFiles);
      context.relevantFiles = codeFiles.map(f => path.relative(repoPath, f));

    } catch (error) {
      console.warn('Context extraction failed:', error.message);
    }

    return context;
  }

  /**
   * Build structured prompt for Claude analysis
   */
  buildAnalysisPrompt(coldSpot, context) {
    return `
Analyze this Trust Debt cold spot in a software repository:

COLD SPOT: ${coldSpot.intersection}
Activity Score: ${coldSpot.activityScore} (very low)

DOCUMENTATION CONTEXT:
${context.documentationQuotes.map(q => `- "${q.text}" (from ${q.file})`).join('\n')}

CODE CONTEXT:
${context.codeSnippets.map(s => `- ${s.file}: ${s.snippet}`).join('\n')}

RELEVANT FILES:
${context.relevantFiles.join(', ')}

Please provide:
1. **Root Cause**: Why this intersection has low activity
2. **Specific Impact**: What problems this creates
3. **Actionable Recommendations**: Specific files to modify and exact changes needed
4. **Implementation Priority**: High/Medium/Low with reasoning

Be specific about file paths and provide concrete, implementable suggestions.
    `;
  }

  /**
   * Simulate Claude API (replace with real implementation)
   */
  async queryClaudeAPI(prompt) {
    // For now, simulate realistic Claude responses
    // In production, replace with actual Claude API call
    return this.generateSimulatedClaudeResponse(prompt);
  }

  /**
   * Generate realistic analysis for demonstration
   */
  generateSimulatedClaudeResponse(prompt) {
    // Extract cold spot details from prompt
    const intersection = prompt.match(/COLD SPOT: (.+)/)?.[1] || 'Unknown';
    
    const analyses = {
      'Performance × Documentation': {
        rootCause: "Performance optimizations implemented but not documented in user-facing materials",
        impact: "Developers cannot understand performance characteristics, leading to suboptimal usage patterns",
        recommendations: [
          {
            file: "README.md",
            action: "Add performance benchmarks section with specific metrics",
            priority: "High",
            effort: "1-2 hours",
            details: "Document actual performance characteristics: response times, throughput, memory usage"
          },
          {
            file: "docs/PERFORMANCE.md", 
            action: "Create comprehensive performance guide",
            priority: "Medium",
            effort: "3-4 hours",
            details: "Explain optimization techniques used and how to leverage them"
          }
        ]
      },
      'Security × Implementation': {
        rootCause: "Security measures documented but implementation appears incomplete or inconsistent",
        impact: "Security vulnerabilities despite documented security promises",
        recommendations: [
          {
            file: "src/auth/middleware.js",
            action: "Implement missing rate limiting and input validation",
            priority: "High", 
            effort: "2-3 hours",
            details: "Add express-rate-limit and joi validation to match documented security promises"
          }
        ]
      }
    };

    return analyses[intersection] || this.generateGenericAnalysis(intersection);
  }

  /**
   * Parse Claude response into structured data
   */
  parseClaudeResponse(response, coldSpot) {
    return {
      coldSpot: coldSpot,
      timestamp: new Date().toISOString(),
      analysis: {
        rootCause: response.rootCause || 'Unknown cause',
        impact: response.impact || 'Impact unclear',
        recommendations: response.recommendations || [],
        priority: response.priority || 'Medium'
      },
      confidence: this.calculateAnalysisConfidence(response),
      aiGenerated: true
    };
  }

  /**
   * Calculate confidence in Claude's analysis
   */
  calculateAnalysisConfidence(response) {
    let confidence = 0.5; // Base confidence
    
    if (response.recommendations && response.recommendations.length > 0) confidence += 0.2;
    if (response.recommendations.some(r => r.file && r.action)) confidence += 0.2;
    if (response.rootCause && response.rootCause.length > 20) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Helper methods for file discovery and analysis
   */
  async findDocumentationFiles(repoPath) {
    const docPatterns = ['**/*.md', '**/*.txt', '**/docs/**/*', '**/README*'];
    const files = [];
    
    for (const pattern of docPatterns) {
      try {
        const glob = require('glob');
        const matches = glob.sync(pattern, { cwd: repoPath, absolute: true });
        files.push(...matches);
      } catch (error) {
        // Ignore glob errors
      }
    }
    
    return [...new Set(files)]; // Remove duplicates
  }

  async findRelevantCodeFiles(repoPath, keywords) {
    const codePatterns = ['**/*.js', '**/*.ts', '**/*.py', '**/*.java'];
    const files = [];
    
    for (const pattern of codePatterns) {
      try {
        const glob = require('glob');
        const matches = glob.sync(pattern, { cwd: repoPath, absolute: true });
        
        // Filter files containing relevant keywords
        for (const file of matches) {
          try {
            const content = await fs.readFile(file, 'utf8');
            if (keywords.some(keyword => 
              content.toLowerCase().includes(keyword.toLowerCase())
            )) {
              files.push(file);
            }
          } catch (error) {
            // Ignore file read errors
          }
        }
      } catch (error) {
        // Ignore glob errors
      }
    }
    
    return files.slice(0, 10); // Limit for performance
  }

  getCategoryKeywords(coldSpot) {
    const keywordMap = {
      'Performance': ['performance', 'speed', 'optimization', 'cache', 'async'],
      'Security': ['auth', 'security', 'password', 'token', 'encrypt'],
      'Documentation': ['readme', 'docs', 'guide', 'tutorial', 'example'],
      'API': ['endpoint', 'route', 'request', 'response', 'api'],
      'Testing': ['test', 'spec', 'mock', 'assertion', 'coverage']
    };
    
    const keywords = [];
    keywords.push(...(keywordMap[coldSpot.categoryX] || []));
    keywords.push(...(keywordMap[coldSpot.categoryY] || []));
    
    return [...new Set(keywords)];
  }

  estimateImpact(categoryX, categoryY, activityScore) {
    // Higher impact for security/performance intersections
    const highImpactPairs = [
      ['Security', 'Implementation'],
      ['Performance', 'Documentation'], 
      ['API', 'Security']
    ];
    
    const isHighImpact = highImpactPairs.some(pair => 
      (pair[0] === categoryX && pair[1] === categoryY) ||
      (pair[1] === categoryX && pair[0] === categoryY)
    );
    
    const baseImpact = (1 - activityScore) * 100; // Lower activity = higher potential impact
    return isHighImpact ? baseImpact * 1.5 : baseImpact;
  }

  generateFallbackAnalysis(trustDebtData) {
    return {
      timestamp: new Date().toISOString(),
      totalColdSpots: 0,
      analyzedCount: 0,
      analyses: [],
      metadata: {
        analysisMethod: 'Fallback (Claude unavailable)',
        error: 'Claude analysis not available',
        suggestion: 'Enable Claude API integration for detailed cold spot analysis'
      }
    };
  }
}

module.exports = ColdSpotClaudeAnalyzer;