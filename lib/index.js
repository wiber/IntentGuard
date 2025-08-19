/**
 * Intent Guard Core Library
 * Measure Trust Debt - the drift between intent and reality
 */

const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const glob = require('glob');
const cosineSimilarity = require('cosine-similarity');
class IntentGuard {
  constructor(projectDir = process.cwd()) {
    this.projectDir = projectDir;
    this.git = simpleGit(projectDir);
    this.config = this.loadConfig();
    this.cache = {};
  }

  /**
   * Load configuration
   */
  loadConfig() {
    const configPath = path.join(this.projectDir, '.intent-guard.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    // Default configuration
    return {
      intentDocs: ['README.md', 'ARCHITECTURE.md', 'docs/**/*.md'],
      excludePatterns: ['node_modules', '.git', 'dist', 'build'],
      categories: [{
        name: 'Testing',
        weight: 15,
        patterns: ['test', 'spec', 'coverage']
      }, {
        name: 'Documentation',
        weight: 10,
        patterns: ['README', 'docs', 'comment']
      }, {
        name: 'Architecture',
        weight: 20,
        patterns: ['structure', 'pattern', 'design']
      }, {
        name: 'Performance',
        weight: 15,
        patterns: ['optimize', 'performance', 'speed']
      }, {
        name: 'Security',
        weight: 20,
        patterns: ['security', 'auth', 'encrypt']
      }, {
        name: 'User Experience',
        weight: 20,
        patterns: ['UX', 'UI', 'interface']
      }],
      thresholds: {
        good: 50,
        warning: 100,
        critical: 200
      }
    };
  }

  /**
   * Initialize Intent Guard in a project
   */
  async initialize(options = {}) {
    // Create config file
    const configPath = path.join(this.projectDir, '.intent-guard.json');
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    }

    // Install git hook if requested
    if (options.installHook) {
      await this.installGitHook();
    }

    // Create intent documents if missing
    const readmePath = path.join(this.projectDir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(readmePath, `# Project Name

## Intent
Describe what this project intends to achieve...

## Architecture
Describe the intended architecture...

## Principles
- Principle 1
- Principle 2

---
*Trust Debt tracked by [Intent Guard](https://intentguard.io)*
`);
    }
    return {
      success: true
    };
  }

  /**
   * Analyze Trust Debt
   */
  async analyze() {
    const analysis = {
      timestamp: new Date().toISOString(),
      projectDir: this.projectDir,
      score: 0,
      status: 'UNKNOWN',
      categories: [],
      topContributors: [],
      recommendations: []
    };
    try {
      // Step 1: Extract intent from documentation
      const intent = await this.extractIntent();

      // Step 2: Extract reality from git commits
      const reality = await this.extractReality();

      // Step 3: Calculate drift for each category
      const categoryScores = this.calculateCategoryDrift(intent, reality);
      analysis.categories = categoryScores;

      // Step 4: Calculate total Trust Debt
      const totalDebt = this.calculateTotalDebt(categoryScores);
      analysis.score = Math.round(totalDebt);

      // Step 5: Determine status
      analysis.status = this.determineStatus(totalDebt);

      // Step 6: Get trend from recent commits
      analysis.trend = await this.calculateTrend();

      // Step 7: Identify top contributors
      analysis.topContributors = this.getTopContributors(categoryScores);

      // Step 8: Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);
    } catch (error) {
      analysis.error = error.message;
      analysis.score = 999;
      analysis.status = 'ERROR';
    }

    // Cache result
    this.cache.lastAnalysis = analysis;
    return analysis;
  }

  /**
   * Extract intent from documentation
   */
  async extractIntent() {
    const intent = {
      keywords: {},
      categories: {},
      goals: []
    };

    // Read all intent documents
    for (const pattern of this.config.intentDocs) {
      const files = glob.sync(pattern, {
        cwd: this.projectDir,
        ignore: this.config.excludePatterns
      });
      for (const file of files) {
        const content = fs.readFileSync(path.join(this.projectDir, file), 'utf8');

        // Extract keywords and categorize
        this.config.categories.forEach(category => {
          const count = this.countKeywords(content, category.patterns);
          intent.categories[category.name] = (intent.categories[category.name] || 0) + count;
        });

        // Extract goals (lines starting with "Intent:", "Goal:", etc.)
        const goalMatches = content.match(/^(Intent|Goal|Objective|Purpose):(.+)$/gim);
        if (goalMatches) {
          intent.goals.push(...goalMatches.map(g => g.trim()));
        }
      }
    }

    // Normalize category weights
    const total = Object.values(intent.categories).reduce((a, b) => a + b, 0);
    if (total > 0) {
      Object.keys(intent.categories).forEach(key => {
        intent.categories[key] = intent.categories[key] / total;
      });
    }
    return intent;
  }

  /**
   * Extract reality from git commits
   */
  async extractReality() {
    const reality = {
      keywords: {},
      categories: {},
      changes: []
    };
    try {
      // Get recent commits (last 30 days)
      const log = await this.git.log(['--since=30.days.ago']);

      // Analyze commit messages and changes
      for (const commit of log.all) {
        // Categorize commit message
        this.config.categories.forEach(category => {
          const count = this.countKeywords(commit.message, category.patterns);
          reality.categories[category.name] = (reality.categories[category.name] || 0) + count;
        });

        // Track what actually changed
        const diff = await this.git.diff([commit.hash + '^', commit.hash]);
        reality.changes.push({
          hash: commit.hash,
          message: commit.message,
          linesChanged: (diff.match(/^[+-]/gm) || []).length
        });
      }

      // Normalize category weights
      const total = Object.values(reality.categories).reduce((a, b) => a + b, 0);
      if (total > 0) {
        Object.keys(reality.categories).forEach(key => {
          reality.categories[key] = reality.categories[key] / total;
        });
      }
    } catch (error) {
      // If git analysis fails, use file system analysis
      console.warn('Git analysis failed, falling back to file system:', error.message);
    }
    return reality;
  }

  /**
   * Calculate drift for each category
   */
  calculateCategoryDrift(intent, reality) {
    const scores = [];
    this.config.categories.forEach(category => {
      const intentWeight = intent.categories[category.name] || 0;
      const realityWeight = reality.categories[category.name] || 0;
      const drift = Math.abs(intentWeight - realityWeight);
      scores.push({
        name: category.name,
        weight: category.weight,
        intent: (intentWeight * 100).toFixed(1) + '%',
        reality: (realityWeight * 100).toFixed(1) + '%',
        drift: (drift * 100).toFixed(1) + '%',
        contribution: drift * category.weight
      });
    });
    return scores;
  }

  /**
   * Calculate total Trust Debt
   */
  calculateTotalDebt(categoryScores) {
    // Base formula: sum of weighted drifts
    let baseDebt = categoryScores.reduce((total, cat) => {
      return total + cat.contribution * 100;
    }, 0);

    // Apply time decay (debt increases over time)
    const configAge = this.getConfigAge();
    const timeMultiplier = 1 + configAge * 0.01; // 1% per day

    // Apply spec staleness
    const specAge = this.getSpecAge();
    const specMultiplier = 1 + specAge * 0.02; // 2% per day

    return baseDebt * timeMultiplier * specMultiplier;
  }

  /**
   * Get age of configuration in days
   */
  getConfigAge() {
    try {
      const configPath = path.join(this.projectDir, '.intent-guard.json');
      if (fs.existsSync(configPath)) {
        const stats = fs.statSync(configPath);
        const age = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);
        return Math.floor(age);
      }
    } catch (error) {
      // Ignore
    }
    return 0;
  }

  /**
   * Get age of specifications in days
   */
  getSpecAge() {
    try {
      let oldestSpec = Date.now();
      for (const pattern of this.config.intentDocs) {
        const files = glob.sync(pattern, {
          cwd: this.projectDir,
          ignore: this.config.excludePatterns
        });
        for (const file of files) {
          const fullPath = path.join(this.projectDir, file);
          const stats = fs.statSync(fullPath);
          if (stats.mtime < oldestSpec) {
            oldestSpec = stats.mtime;
          }
        }
      }
      const age = (Date.now() - oldestSpec) / (1000 * 60 * 60 * 24);
      return Math.floor(age);
    } catch (error) {
      // Ignore
    }
    return 0;
  }

  /**
   * Determine status based on Trust Debt score
   */
  determineStatus(score) {
    if (score <= this.config.thresholds.good) return 'GOOD';
    if (score <= this.config.thresholds.warning) return 'WARNING';
    if (score <= this.config.thresholds.critical) return 'CRITICAL';
    return 'CRISIS';
  }

  /**
   * Calculate trend from recent analyses
   */
  async calculateTrend() {
    // TODO: Store historical data and calculate trend
    // For now, return stable
    return 'stable';
  }

  /**
   * Get top contributors to Trust Debt
   */
  getTopContributors(categoryScores) {
    return categoryScores.sort((a, b) => b.contribution - a.contribution).slice(0, 5).map(cat => ({
      category: cat.name,
      gap: cat.drift,
      contribution: Math.round(cat.contribution * 100)
    }));
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];
    if (analysis.score > this.config.thresholds.critical) {
      recommendations.push('URGENT: Schedule alignment meeting to address critical drift');
    }

    // Category-specific recommendations
    analysis.topContributors.forEach(contributor => {
      const gap = parseFloat(contributor.gap);
      if (gap > 30) {
        recommendations.push(`Update ${contributor.category} documentation to match implementation`);
      } else if (gap > 15) {
        recommendations.push(`Review ${contributor.category} practices for alignment`);
      }
    });

    // Spec age recommendation
    const specAge = this.getSpecAge();
    if (specAge > 30) {
      recommendations.push('Intent documents are stale (>30 days) - update to reflect current goals');
    }
    return recommendations.slice(0, 5); // Max 5 recommendations
  }

  /**
   * Count keywords in text
   */
  countKeywords(text, patterns) {
    let count = 0;
    const lowerText = text.toLowerCase();
    patterns.forEach(pattern => {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      const matches = lowerText.match(regex);
      count += matches ? matches.length : 0;
    });
    return count;
  }

  /**
   * Install git hook
   */
  async installGitHook() {
    const hooksDir = path.join(this.projectDir, '.git', 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, {
        recursive: true
      });
    }
    const hookPath = path.join(hooksDir, 'post-commit');
    const hookContent = `#!/bin/sh
# Intent Guard post-commit hook
# Measure Trust Debt after each commit

intent-guard analyze --output json

# Get the Trust Debt score
TRUST_DEBT=$(cat intent-guard-analysis.json | grep '"score"' | head -1 | awk '{print $2}' | sed 's/,//')

# Display warning if debt is high
if [ "$TRUST_DEBT" -gt "100" ]; then
  echo "⚠️  Warning: Trust Debt is $TRUST_DEBT units (threshold: 100)"
  echo "   Run 'intent-guard report' for details"
fi

exit 0
`;
    fs.writeFileSync(hookPath, hookContent);
    fs.chmodSync(hookPath, '755');
    return {
      success: true,
      path: hookPath
    };
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(analysis) {
    const template = fs.readFileSync(path.join(__dirname, '..', 'templates', 'report.html'), 'utf8');

    // Replace placeholders with actual data
    let html = template.replace('{{SCORE}}', analysis.score).replace('{{STATUS}}', analysis.status).replace('{{TIMESTAMP}}', analysis.timestamp).replace('{{PROJECT}}', path.basename(this.projectDir)).replace('{{CATEGORIES}}', JSON.stringify(analysis.categories)).replace('{{CONTRIBUTORS}}', JSON.stringify(analysis.topContributors)).replace('{{RECOMMENDATIONS}}', JSON.stringify(analysis.recommendations));
    return html;
  }
}
module.exports = {
  IntentGuard
};
module.exports.IntentGuard = IntentGuard;