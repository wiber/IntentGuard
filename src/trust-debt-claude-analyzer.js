#!/usr/bin/env node

/**
 * Trust Debt Claude Analyzer
 * Runs Claude analysis on git commits and saves results to JSON
 * This separates the analysis from the HTML generation for better modularity
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const SettingsManager = require('./trust-debt-settings-manager');
const DocumentTracker = require('./trust-debt-document-tracker');

class TrustDebtClaudeAnalyzer {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.timestamp = new Date().toISOString();
    this.dataFile = path.join(this.projectRoot, 'trust-debt-analysis.json');
    this.intentFile = path.join(this.projectRoot, 'trust-debt-intent-vectors.json');
    this.settingsManager = null;
    this.documentTracker = null;
    this.settings = null;
    this.loadIntent();
  }

  async initialize() {
    // Load settings
    this.settingsManager = new SettingsManager();
    this.settings = await this.settingsManager.load();
    
    // Initialize document tracker
    this.documentTracker = new DocumentTracker(this.settings);
    
    console.log('📊 Initialized with settings and document tracking');
  }

  /**
   * Load intent vectors from file
   */
  loadIntent() {
    try {
      if (fs.existsSync(this.intentFile)) {
        const data = JSON.parse(fs.readFileSync(this.intentFile, 'utf8'));
        this.intent = data.primary.vector;
        this.intentSource = data.primary.source;
        this.intentConfidence = data.primary.confidence;
        this.contexts = data.contexts || [];
        console.log(`📊 Loaded intent from: ${this.intentSource}`);
      } else {
        // Fallback to defaults
        this.intent = { trust: 0.35, timing: 0.35, recognition: 0.30 };
        this.intentSource = 'hardcoded defaults';
        this.intentConfidence = 0.5;
        this.contexts = [];
        console.log('⚠️ No intent file found, using defaults');
      }
    } catch (error) {
      console.error('Error loading intent:', error.message);
      this.intent = { trust: 0.35, timing: 0.35, recognition: 0.30 };
      this.intentSource = 'fallback';
      this.intentConfidence = 0.5;
      this.contexts = [];
    }
  }

  /**
   * Get recent commits with full analysis data
   */
  getCommitData() {
    const commits = [];
    
    try {
      // Get last 10 commits
      const log = execSync(
        'git log --format="%H|%s|%b|%an|%ae|%cd|%cr" --date=iso -10',
        { encoding: 'utf8' }
      );
      
      const lines = log.trim().split('\n').filter(l => l);
      
      for (const line of lines.slice(0, 5)) { // Analyze 5 most recent
        const [hash, subject, body, author, email, date, relative] = line.split('|');
        
        // Get files changed
        let filesChanged = [];
        try {
          // Ensure hash is properly escaped
          const safeHash = hash.trim().split(' ')[0];
          filesChanged = execSync(
            `git diff-tree --no-commit-id --name-only -r "${safeHash}"`,
            { encoding: 'utf8' }
          ).trim().split('\n').filter(f => f);
        } catch (e) {
          // Silently handle errors
        }
        
        // Get insertions/deletions
        let stats = { insertions: 0, deletions: 0 };
        try {
          const safeHash = hash.trim().split(' ')[0];
          const statLine = execSync(
            `git show --stat --format="" "${safeHash}" | tail -1`,
            { encoding: 'utf8' }
          );
          const match = statLine.match(/(\d+) insertion.*?(\d+) deletion/);
          if (match) {
            stats.insertions = parseInt(match[1]) || 0;
            stats.deletions = parseInt(match[2]) || 0;
          }
        } catch (e) {
          // Silently handle errors
        }
        
        commits.push({
          hash: hash.substring(0, 7),
          fullHash: hash,
          subject,
          body: body || '',
          author,
          email,
          date,
          relative,
          filesChanged,
          stats,
          // Placeholder for Claude's analysis
          analysis: {
            trust: 0,
            timing: 0,
            recognition: 0,
            overall: 0,
            insight: ''
          }
        });
      }
    } catch (error) {
      console.error('Error getting commits:', error.message);
    }
    
    return commits;
  }

  /**
   * Get current repository state
   */
  getRepoState() {
    const state = {
      branch: 'main',
      status: 'clean',
      modifiedFiles: 0,
      specAge: 0,
      totalCommits: 0,
      contributors: []
    };
    
    try {
      // Current branch
      state.branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      
      // Working directory status
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      state.modifiedFiles = status.split('\n').filter(line => line.trim()).length;
      state.status = state.modifiedFiles === 0 ? 'clean' : `${state.modifiedFiles} modified`;
      
      // Spec age (CLAUDE.md last modified)
      try {
        const specDate = execSync('git log -1 --format="%ci" CLAUDE.md', { encoding: 'utf8' }).trim();
        state.specAge = Math.floor((Date.now() - new Date(specDate).getTime()) / (1000 * 60 * 60 * 24));
      } catch (e) {
        state.specAge = 30; // Default if CLAUDE.md doesn't exist
      }
      
      // Total commits
      state.totalCommits = parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim());
      
      // Contributors
      const contributors = execSync('git shortlog -sn', { encoding: 'utf8' })
        .trim()
        .split('\n')
        .slice(0, 5)
        .map(line => {
          const match = line.match(/\s*(\d+)\s+(.+)/);
          return match ? { commits: parseInt(match[1]), name: match[2] } : null;
        })
        .filter(c => c);
      state.contributors = contributors;
      
    } catch (error) {
      console.error('Error getting repo state:', error.message);
    }
    
    return state;
  }

  /**
   * Analyze documents for intent patterns
   */
  getDocumentAnalysis() {
    const docs = [];
    const files = ['CLAUDE.md', 'README.md', 'package.json'];
    
    for (const file of files) {
      const filepath = path.join(this.projectRoot, file);
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf8');
        
        // Count pattern indicators
        const patterns = {
          trust: (content.match(/trust|debt|quantif|measur|metric|score|insur/gi) || []).length,
          timing: (content.match(/timing|30.second|strategic|precision|moment|receptiv/gi) || []).length,
          recognition: (content.match(/recognition|oh.moment|breakthrough|insight|pattern|aha/gi) || []).length
        };
        
        docs.push({
          file,
          size: content.length,
          lines: content.split('\n').length,
          patterns,
          totalIndicators: patterns.trust + patterns.timing + patterns.recognition
        });
      }
    }
    
    return docs;
  }

  /**
   * Generate Claude prompt
   */
  generatePrompt(commits, repoState, docs) {
    return `You are analyzing a codebase for Trust Debt - the gap between intended architecture and actual implementation.

# Trust Debt Framework
Trust Debt measures drift from intended design using: (Intent - Reality)² × Time × Spec_Age

Intent vectors (what we want):
- Trust: ${(this.intent.trust * 100).toFixed(0)}% - Building quantifiable, measurable trust
- Timing: ${(this.intent.timing * 100).toFixed(0)}% - Strategic 30-second delivery and precision
- Recognition: ${(this.intent.recognition * 100).toFixed(0)}% - Creating "oh moments" and breakthroughs
Intent Source: ${this.intentSource} (confidence: ${(this.intentConfidence * 100).toFixed(0)}%)

# Repository State
- Branch: ${repoState.branch}
- Status: ${repoState.status}
- Spec Age: ${repoState.specAge} days since CLAUDE.md update
- Total Commits: ${repoState.totalCommits}
- Top Contributors: ${repoState.contributors.map(c => `${c.name} (${c.commits})`).join(', ')}

# Recent Commits to Analyze
${commits.map((c, i) => `
## Commit ${i + 1}: ${c.hash}
- Author: ${c.author} <${c.email}>
- Date: ${c.date} (${c.relative})
- Message: ${c.subject}
${c.body ? `- Body: ${c.body}` : ''}
- Files Changed: ${c.filesChanged.length} files
- Changes: +${c.stats.insertions} -${c.stats.deletions}
- Key Files: ${c.filesChanged.slice(0, 5).join(', ')}
`).join('\n')}

# Document Analysis
${docs.map(d => `
- ${d.file}: ${d.lines} lines, ${d.totalIndicators} pattern indicators
  - Trust indicators: ${d.patterns.trust}
  - Timing indicators: ${d.patterns.timing}
  - Recognition indicators: ${d.patterns.recognition}
`).join('')}

# Analysis Required
Analyze each commit for alignment with the three intent vectors. Consider:
1. Does the commit advance trust/measurement capabilities?
2. Does it improve timing/speed/precision?
3. Does it create recognition/insight opportunities?

Provide scores from -100 to +100 where:
- Positive = advances the principle
- Negative = violates/degrades the principle
- Zero = neutral

Also provide:
- Overall Trust Debt score (0-500)
- FIM scores (Skill, Environment, Momentum)
- Trend analysis and predictions
- Key insights and recommendations

Return ONLY valid JSON (no markdown, no explanation):
{
  "trustDebt": 250,
  "isInsurable": true,
  "trend": "improving",
  "gaps": {
    "trust": 0.15,
    "timing": 0.08,
    "recognition": 0.05
  },
  "commitScores": [
    {
      "hash": "abc123",
      "trust": 25,
      "timing": -10,
      "recognition": 50,
      "overall": 22,
      "insight": "Advances pattern recognition but ignores timing constraints"
    }
  ],
  "fim": {
    "skill": 75,
    "environment": 85,
    "momentum": 64,
    "leverage": 3.2
  },
  "predictions": {
    "days7": 230,
    "days30": 200,
    "trajectory": "improving steadily"
  },
  "insights": [
    "Strong focus on Trust Debt visualization",
    "Timing metrics need more attention",
    "Recognition patterns well implemented"
  ],
  "recommendations": [
    "Add performance benchmarks to commits",
    "Update CLAUDE.md to reflect current patterns",
    "Focus next sprint on timing optimization"
  ],
  "driftIndicators": [
    "Spec age causing alignment drift",
    "Test coverage declining"
  ]
}`;
  }

  /**
   * Call Claude for analysis
   */
  async callClaude(prompt) {
    try {
      // Write prompt to temp file
      const promptFile = path.join(this.projectRoot, '.trust-debt-prompt.txt');
      fs.writeFileSync(promptFile, prompt);
      
      console.log('🤖 Calling Claude for analysis...');
      
      // Use Claude CLI with proper escaping
      const command = `cat "${promptFile}" | claude --print 2>/dev/null`;
      const result = execSync(command, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10,
        stdio: ['pipe', 'pipe', 'pipe'] // Suppress stderr
      });
      
      // Clean up
      if (fs.existsSync(promptFile)) {
        fs.unlinkSync(promptFile);
      }
      
      // Extract JSON from response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No valid JSON in Claude response');
      
    } catch (error) {
      console.log('⚠️ Claude analysis failed, using calculated defaults');
      return this.calculateDefaults();
    }
  }

  /**
   * Calculate default values when Claude is unavailable
   */
  calculateDefaults() {
    // Basic calculation based on patterns found
    const docs = this.getDocumentAnalysis();
    const totalIndicators = docs.reduce((sum, d) => sum + d.totalIndicators, 0);
    const avgIndicators = totalIndicators / docs.length;
    
    // Simple debt calculation
    const debt = Math.max(50, Math.min(400, 300 - avgIndicators * 2));
    
    return {
      trustDebt: debt,
      isInsurable: debt < 300,
      trend: 'stable',
      gaps: {
        trust: 0.15,
        timing: 0.20,
        recognition: 0.10
      },
      commitScores: [],
      fim: {
        skill: 70,
        environment: 75,
        momentum: 53,
        leverage: 2.1
      },
      predictions: {
        days7: debt,
        days30: debt,
        trajectory: 'stable'
      },
      insights: [
        'Claude analysis unavailable - using pattern-based estimation',
        `Found ${totalIndicators} pattern indicators across ${docs.length} documents`
      ],
      recommendations: [
        'Install Claude CLI for enhanced analysis',
        'Review recent commits manually'
      ],
      driftIndicators: []
    };
  }

  /**
   * Save analysis to JSON file
   */
  saveAnalysis(analysis, commits, repoState, docs) {
    const fullAnalysis = {
      timestamp: this.timestamp,
      version: '2.0',
      repoState,
      commits: commits.map((c, i) => ({
        ...c,
        analysis: analysis.commitScores?.[i] || {
          trust: 0,
          timing: 0,
          recognition: 0,
          overall: 0,
          insight: 'Not analyzed'
        }
      })),
      documents: docs,
      analysis: {
        trustDebt: analysis.trustDebt,
        isInsurable: analysis.isInsurable,
        trend: analysis.trend,
        gaps: analysis.gaps,
        fim: analysis.fim,
        predictions: analysis.predictions,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        driftIndicators: analysis.driftIndicators
      },
      intent: {
        vector: this.intent,
        source: this.intentSource,
        confidence: this.intentConfidence,
        contexts: this.contexts
      },
      metadata: {
        analyzerVersion: '1.0',
        claudeAvailable: analysis.commitScores && analysis.commitScores.length > 0,
        generatedBy: 'trust-debt-claude-analyzer.js'
      }
    };
    
    // Save to file
    fs.writeFileSync(this.dataFile, JSON.stringify(fullAnalysis, null, 2));
    
    // Also update history
    this.updateHistory(analysis);
    
    return fullAnalysis;
  }

  /**
   * Update history file
   */
  updateHistory(analysis) {
    const historyFile = path.join(this.projectRoot, 'trust-debt-history.json');
    let history = { version: '1.0.0', calculations: [] };
    
    if (fs.existsSync(historyFile)) {
      try {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      } catch (e) {
        console.log('Creating new history file');
      }
    }
    
    // Add new entry
    history.calculations.unshift({
      timestamp: this.timestamp,
      debt: analysis.trustDebt,
      momentum: analysis.fim.momentum,
      leverage: analysis.fim.leverage,
      gaps: analysis.gaps,
      trend: analysis.trend,
      aiAnalysis: true,
      insights: analysis.insights.length,
      recommendations: analysis.recommendations.length
    });
    
    // Keep only last 100 entries
    history.calculations = history.calculations.slice(0, 100);
    
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  }

  /**
   * Main execution
   */
  async run() {
    console.log('🎯 Trust Debt Claude Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Initialize settings and document tracker
    await this.initialize();
    
    // Gather data
    console.log('\n📊 Gathering commit data...');
    const commits = this.getCommitData();
    console.log(`  Found ${commits.length} commits`);
    
    console.log('\n📁 Analyzing repository state...');
    const repoState = this.getRepoState();
    console.log(`  Branch: ${repoState.branch}, Status: ${repoState.status}`);
    
    console.log('\n📄 Analyzing documents...');
    // Use the new document tracker instead of old method
    const consolidatedIntent = await this.documentTracker.getConsolidatedIntent();
    const docs = this.getDocumentAnalysis();
    console.log(`  Analyzed ${docs.length} documents`);
    console.log(`  Consolidated intent signals: Trust=${consolidatedIntent.trust.toFixed(1)}, Timing=${consolidatedIntent.timing.toFixed(1)}, Recognition=${consolidatedIntent.recognition.toFixed(1)}`);
    
    // Generate prompt and call Claude
    const prompt = this.generatePrompt(commits, repoState, docs);
    const analysis = await this.callClaude(prompt);
    
    // Save results
    console.log('\n💾 Saving analysis...');
    const fullAnalysis = this.saveAnalysis(analysis, commits, repoState, docs);
    
    console.log(`\n✅ Analysis complete!`);
    console.log(`📊 Trust Debt: ${analysis.trustDebt} units (${analysis.trend})`);
    console.log(`🚀 Momentum: ${analysis.fim.momentum}% (${analysis.fim.leverage}x leverage)`);
    console.log(`📈 7-day prediction: ${analysis.predictions.days7} units`);
    console.log(`\n💾 Results saved to: trust-debt-analysis.json`);
    
    return fullAnalysis;
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new TrustDebtClaudeAnalyzer();
  analyzer.run().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = TrustDebtClaudeAnalyzer;