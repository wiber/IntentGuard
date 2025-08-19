#!/usr/bin/env node

/**
 * Trust Debt Analyzer
 * Measures drift between stated principles and actual implementation
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Core principles we're measuring against (from CLAUDE.md and blog posts)
const CORE_PRINCIPLES = {
  // From blog post: "Strategic Nudges via Un-Robocall™"
  strategicNudges: {
    name: 'Strategic Nudges Pattern',
    description: 'One question, 30 seconds, 30% acceleration',
    indicators: {
      positive: ['nudge', 'strategic', 'timing', 'precision', 'acceleration'],
      negative: ['spam', 'bulk', 'mass', 'generic', 'automated']
    }
  },
  
  // From blog: "Trust Debt = Drift × (Intent - Reality)"
  trustDebt: {
    name: 'Trust Debt Measurement',
    description: 'Making invisible organizational drift visible',
    indicators: {
      positive: ['measurable', 'drift', 'pattern', 'named', 'quantified'],
      negative: ['vague', 'fuzzy', 'qualitative', 'unmeasurable']
    }
  },
  
  // From blog: Pattern recognition & naming
  patternNaming: {
    name: 'Pattern Recognition',
    description: 'Name the unnameable patterns',
    indicators: {
      positive: ['thursday panic', 'pattern', 'recognition', 'oh moment'],
      negative: ['generic', 'abstract', 'theoretical', 'complex']
    }
  },
  
  // From blog: "One Oh Moment Daily"
  ohMoments: {
    name: 'Oh Moment Creation',
    description: 'Daily breakthrough insights',
    indicators: {
      positive: ['oh moment', 'recognition', 'breakthrough', 'insight'],
      negative: ['teaching', 'explaining', 'framework', 'methodology']
    }
  },
  
  // From patent claim: 361x performance
  fimClaim: {
    name: 'FIM Performance Claim',
    description: '361x precision improvement',
    indicators: {
      positive: ['361x', 'precision', 'fim', 'geometric', 'alignment'],
      negative: ['speed', 'faster', 'quick', 'efficiency']
    }
  }
};

class TrustDebtAnalyzer {
  async analyzeContent(content, contentType = 'general') {
    const analysis = {
      timestamp: new Date().toISOString(),
      contentType,
      principles: {},
      overallScore: 0,
      drift: {},
      patterns: []
    };

    // Analyze each principle
    for (const [key, principle] of Object.entries(CORE_PRINCIPLES)) {
      const score = this.calculatePrincipleScore(content, principle);
      analysis.principles[key] = {
        name: principle.name,
        score,
        alignment: this.getAlignmentLevel(score)
      };
    }

    // Calculate overall Trust Debt score
    const scores = Object.values(analysis.principles).map(p => p.score);
    analysis.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Detect drift patterns
    analysis.drift = this.detectDrift(analysis.principles);
    
    // Identify named patterns
    analysis.patterns = this.identifyPatterns(content, analysis.drift);

    return analysis;
  }

  calculatePrincipleScore(content, principle) {
    const lowerContent = content.toLowerCase();
    let positiveHits = 0;
    let negativeHits = 0;

    // Count positive indicators
    principle.indicators.positive.forEach(indicator => {
      const regex = new RegExp(indicator, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) positiveHits += matches.length;
    });

    // Count negative indicators
    principle.indicators.negative.forEach(indicator => {
      const regex = new RegExp(indicator, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) negativeHits += matches.length;
    });

    // Calculate score (0-100)
    if (positiveHits + negativeHits === 0) return 50; // Neutral
    
    const score = Math.round((positiveHits / (positiveHits + negativeHits)) * 100);
    return Math.max(0, Math.min(100, score));
  }

  getAlignmentLevel(score) {
    if (score >= 80) return 'High Alignment';
    if (score >= 60) return 'Moderate Alignment';
    if (score >= 40) return 'Some Drift';
    if (score >= 20) return 'Significant Drift';
    return 'Critical Drift';
  }

  detectDrift(principles) {
    const drift = {
      level: 'LOW',
      areas: [],
      recommendation: ''
    };

    // Find areas with low scores
    for (const [key, data] of Object.entries(principles)) {
      if (data.score < 60) {
        drift.areas.push({
          principle: data.name,
          score: data.score,
          gap: 100 - data.score
        });
      }
    }

    // Calculate drift level
    if (drift.areas.length > 3) {
      drift.level = 'CRITICAL';
      drift.recommendation = 'Major realignment needed across multiple principles';
    } else if (drift.areas.length > 1) {
      drift.level = 'MODERATE';
      drift.recommendation = 'Focus on key drift areas to restore alignment';
    } else if (drift.areas.length > 0) {
      drift.level = 'LOW';
      drift.recommendation = 'Minor adjustments needed in specific areas';
    } else {
      drift.level = 'MINIMAL';
      drift.recommendation = 'Excellent alignment - maintain consistency';
    }

    return drift;
  }

  identifyPatterns(content, drift) {
    const patterns = [];

    // Check for specific anti-patterns
    if (content.includes('explain') && !content.includes('recognition')) {
      patterns.push({
        name: 'The Teaching Trap',
        description: 'Explaining instead of triggering recognition',
        cost: 'Reduces oh moment creation by 70%'
      });
    }

    if (content.includes('faster') && content.includes('361x')) {
      patterns.push({
        name: 'The Speed Confusion',
        description: 'Conflating 361x precision with speed',
        cost: 'Misrepresents core FIM value proposition'
      });
    }

    if (drift.areas.length > 2) {
      patterns.push({
        name: 'The Mission Drift',
        description: 'Multiple principles diverging from intent',
        cost: `${drift.areas.length} core principles compromised`
      });
    }

    // Add a default pattern if none found
    if (patterns.length === 0 && drift.level !== 'MINIMAL') {
      patterns.push({
        name: 'The Silent Drift',
        description: 'Gradual misalignment without crisis',
        cost: '5% coherence loss per iteration'
      });
    }

    return patterns;
  }

  async analyzeFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath);
    let contentType = 'general';

    if (ext === '.md') contentType = 'markdown';
    else if (ext === '.js' || ext === '.ts') contentType = 'code';
    else if (ext === '.html') contentType = 'html';

    return this.analyzeContent(content, contentType);
  }

  async analyzeRepository(repoPath = '.') {
    // Analyze key files
    const keyFiles = [
      'CLAUDE.md',
      'README.md',
      'package.json'
    ];

    const analyses = [];
    
    for (const file of keyFiles) {
      const filePath = path.join(repoPath, file);
      try {
        const analysis = await this.analyzeFile(filePath);
        analyses.push({
          file,
          ...analysis
        });
      } catch (e) {
        // File doesn't exist, skip
      }
    }

    // Calculate aggregate Trust Debt
    const aggregateScore = Math.round(
      analyses.reduce((sum, a) => sum + a.overallScore, 0) / analyses.length
    );

    return {
      repository: repoPath,
      timestamp: new Date().toISOString(),
      trustDebtScore: aggregateScore,
      files: analyses,
      summary: this.generateSummary(aggregateScore, analyses)
    };
  }

  generateSummary(score, analyses) {
    const driftAreas = new Set();
    const patterns = [];

    analyses.forEach(analysis => {
      if (analysis.drift) {
        analysis.drift.areas?.forEach(area => {
          driftAreas.add(area.principle);
        });
      }
      if (analysis.patterns) {
        patterns.push(...analysis.patterns);
      }
    });

    return {
      score,
      status: score >= 70 ? 'Healthy' : score >= 50 ? 'Moderate Drift' : 'Critical Drift',
      mainDriftAreas: Array.from(driftAreas),
      topPatterns: patterns.slice(0, 3),
      recommendation: this.getRecommendation(score, driftAreas.size)
    };
  }

  getRecommendation(score, driftAreaCount) {
    if (score >= 80) {
      return 'Excellent alignment! Focus on maintaining consistency.';
    } else if (score >= 60) {
      return `Address ${driftAreaCount} drift areas to improve coherence.`;
    } else if (score >= 40) {
      return 'Significant drift detected. Immediate realignment needed.';
    } else {
      return 'Critical Trust Debt. Consider comprehensive review and reset.';
    }
  }
}

// Export for use in other scripts
module.exports = { TrustDebtAnalyzer, CORE_PRINCIPLES };

// CLI execution
if (require.main === module) {
  const analyzer = new TrustDebtAnalyzer();
  
  (async () => {
    console.log('🎯 Trust Debt Analysis\n');
    
    const analysis = await analyzer.analyzeRepository('.');
    
    console.log(`Trust Debt Score: ${analysis.trustDebtScore}/100`);
    console.log(`Status: ${analysis.summary.status}`);
    console.log(`\nMain Drift Areas:`);
    analysis.summary.mainDriftAreas.forEach(area => {
      console.log(`  - ${area}`);
    });
    
    if (analysis.summary.topPatterns.length > 0) {
      console.log(`\nDetected Patterns:`);
      analysis.summary.topPatterns.forEach(pattern => {
        console.log(`  📍 ${pattern.name}: ${pattern.description}`);
      });
    }
    
    console.log(`\nRecommendation: ${analysis.summary.recommendation}`);
  })();
}