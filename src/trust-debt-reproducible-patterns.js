#!/usr/bin/env node

/**
 * Trust Debt Reproducible Success Patterns Generator
 * Converts Reality vs Intent matrix blind spots into actionable commit recommendations
 * Shows specific patterns that reduce Trust Debt through targeted commits
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ReproduciblePatternsGenerator {
  constructor() {
    this.projectRoot = process.cwd();
    this.matrixFile = path.join(this.projectRoot, 'trust-debt-reality-intent-matrix.json');
    this.categoriesFile = path.join(this.projectRoot, 'trust-debt-categories.json');
    this.analysisFile = path.join(this.projectRoot, 'trust-debt-analysis.json');
    
    this.matrixData = this.loadMatrixData();
    this.categories = this.loadCategories();
    this.analysis = this.loadAnalysis();
  }
  
  loadMatrixData() {
    if (fs.existsSync(this.matrixFile)) {
      return JSON.parse(fs.readFileSync(this.matrixFile, 'utf8'));
    }
    return null;
  }
  
  loadCategories() {
    if (fs.existsSync(this.categoriesFile)) {
      return JSON.parse(fs.readFileSync(this.categoriesFile, 'utf8'));
    }
    return null;
  }
  
  loadAnalysis() {
    if (fs.existsSync(this.analysisFile)) {
      return JSON.parse(fs.readFileSync(this.analysisFile, 'utf8'));
    }
    return null;
  }
  
  /**
   * Find the top blind spots from the matrix
   */
  findTopBlindSpots() {
    if (!this.matrixData) return [];
    
    const { matrix, nodes } = this.matrixData;
    const blindSpots = [];
    
    nodes.forEach(node => {
      const diagonal = matrix[node.path][node.path];
      if (diagonal.similarity < 0.3) {
        blindSpots.push({
          path: node.path,
          name: node.name,
          similarity: diagonal.similarity,
          type: 'diagonal',
          priority: node.depth === 0 ? 'CRITICAL' : node.depth === 1 ? 'HIGH' : 'MEDIUM'
        });
      }
    });
    
    // Also find cross-category blind spots
    nodes.forEach(realityNode => {
      nodes.forEach(intentNode => {
        if (realityNode.path !== intentNode.path) {
          const cell = matrix[realityNode.path][intentNode.path];
          if (cell.similarity < 0.1 && this.areRelated(realityNode, intentNode)) {
            blindSpots.push({
              realityPath: realityNode.path,
              intentPath: intentNode.path,
              realityName: realityNode.name,
              intentName: intentNode.name,
              similarity: cell.similarity,
              type: 'cross',
              priority: 'MEDIUM'
            });
          }
        }
      });
    });
    
    return blindSpots.sort((a, b) => a.similarity - b.similarity).slice(0, 10);
  }
  
  /**
   * Check if nodes are related (share parent)
   */
  areRelated(node1, node2) {
    const parts1 = node1.path.split('.');
    const parts2 = node2.path.split('.');
    return parts1[0] === parts2[0] && parts1.length > 1 && parts2.length > 1;
  }
  
  /**
   * Generate debt-reducing patterns
   */
  generateDebtReducingPatterns(blindSpots) {
    const patterns = [];
    
    blindSpots.forEach(spot => {
      if (spot.type === 'diagonal') {
        patterns.push(this.generateDiagonalPattern(spot));
      } else {
        patterns.push(this.generateCrossPattern(spot));
      }
    });
    
    return patterns;
  }
  
  /**
   * Generate pattern for diagonal blind spot
   */
  generateDiagonalPattern(spot) {
    const keywords = this.extractKeywords(spot.path, spot.name);
    
    return {
      type: 'DEBT_REDUCING',
      target: spot.path,
      targetName: spot.name,
      currentAlignment: Math.round(spot.similarity * 100),
      targetAlignment: Math.min(100, Math.round(spot.similarity * 100) + 30),
      pattern: {
        commitTemplate: `${this.getActionVerb(spot.path)}: ${spot.name} - ${this.getCommitFocus(spot.path)}`,
        keywords: keywords,
        touchPoints: this.getFilesTouch(spot.path),
        expectedImpact: `+${30 - Math.round(spot.similarity * 100)}% alignment, -${Math.floor((30 - spot.similarity * 100) * 0.7)} Trust Debt units`
      },
      example: this.generateExampleCommit(spot)
    };
  }
  
  /**
   * Generate pattern for cross-category blind spot
   */
  generateCrossPattern(spot) {
    const realityKeywords = this.extractKeywords(spot.realityPath, spot.realityName);
    const intentKeywords = this.extractKeywords(spot.intentPath, spot.intentName);
    
    return {
      type: 'SYNERGY_CREATING',
      reality: spot.realityPath,
      intent: spot.intentPath,
      realityName: spot.realityName,
      intentName: spot.intentName,
      currentAlignment: Math.round(spot.similarity * 100),
      targetAlignment: Math.min(100, Math.round(spot.similarity * 100) + 40),
      pattern: {
        commitTemplate: `bridge: Connect ${spot.realityName} with ${spot.intentName}`,
        keywords: [...realityKeywords, ...intentKeywords],
        touchPoints: [
          ...this.getFilesTouch(spot.realityPath),
          ...this.getFilesTouch(spot.intentPath)
        ],
        expectedImpact: `Create ${40}% synergy, unlock compound benefits`
      },
      example: this.generateBridgeCommit(spot)
    };
  }
  
  /**
   * Extract keywords from path and name
   */
  extractKeywords(path, name) {
    const keywords = [];
    
    // From path
    const pathParts = path.split('.').map(p => p.replace(/[^a-zA-Z]/g, '').toLowerCase());
    keywords.push(...pathParts.filter(p => p.length > 0));
    
    // From name
    const nameParts = name.toLowerCase().split(/\s+/);
    keywords.push(...nameParts.filter(p => p.length > 2));
    
    // Category-specific keywords
    if (path.includes('Α')) keywords.push('measurement', 'drift', 'detection');
    if (path.includes('Β')) keywords.push('visualization', 'display', 'ui');
    if (path.includes('Γ')) keywords.push('enforcement', 'rules', 'validation');
    
    return [...new Set(keywords)];
  }
  
  /**
   * Get action verb based on category
   */
  getActionVerb(path) {
    if (path.includes('Α')) return 'measure';
    if (path.includes('Β')) return 'visualize';
    if (path.includes('Γ')) return 'enforce';
    if (path.includes('D')) return 'detect';
    if (path.includes('S')) return 'score';
    if (path.includes('T')) return 'track';
    return 'implement';
  }
  
  /**
   * Get commit focus based on category
   */
  getCommitFocus(path) {
    const focusMap = {
    'Α': 'add comprehensive metrics and tracking',
      'Β': 'enhance visual representation and clarity',
      'Γ': 'strengthen validation and compliance',
      'D': 'improve detection algorithms',
      'S': 'refine scoring methodology',
      'T': 'expand tracking coverage',
      'M': 'update matrix calculations',
      'V': 'enhance visualization components',
      'C': 'add enforcement checks'
    };
    
    for (const [key, value] of Object.entries(focusMap)) {
      if (path.includes(key)) return value;
    }
    return 'improve implementation alignment';
  }
  
  /**
   * Get files to touch for a category
   */
  getFilesTouch(path) {
    const files = [];
    
    // Core files based on category
    if (path.includes('Α')) {
      files.push(
        'scripts/trust-debt-analyzer.js',
        'scripts/trust-debt-drift-detector.js',
        'trust-debt-settings.json'
      );
    }
    
    if (path.includes('Β')) {
      files.push(
        'scripts/trust-debt-html-generator.js',
        'scripts/trust-debt-reality-intent-matrix.js',
        'scripts/trust-debt-shortlex-generator.js'
      );
    }
    
    if (path.includes('Γ')) {
      files.push(
        '.husky/post-commit',
        'scripts/trust-debt-validator.js',
        'scripts/trust-debt-enforcement.js'
      );
    }
    
    // Always include the main analysis file
    files.push('trust-debt-analysis.json');
    
    return [...new Set(files)];
  }
  
  /**
   * Generate example commit for diagonal pattern
   */
  generateExampleCommit(spot) {
    const verb = this.getActionVerb(spot.path);
    const focus = this.getCommitFocus(spot.path);
    
    return {
      message: `${verb}: ${spot.name} - ${focus}

- Add ${spot.name} implementation to Trust Debt analyzer
- Include ShortLex path ${spot.path} in measurement calculations  
- Update scoring weights to reflect ${spot.name} priority
- Connect to existing ${spot.path.split('.')[0]} infrastructure

This reduces Trust Debt by improving ${spot.path} alignment from ${Math.round(spot.similarity * 100)}% to ${Math.min(100, Math.round(spot.similarity * 100) + 30)}%`,
      files: this.getFilesTouch(spot.path).map(f => ({
        path: f,
        action: 'modify',
        purpose: this.getFilePurpose(f, spot)
      }))
    };
  }
  
  /**
   * Generate bridge commit example
   */
  generateBridgeCommit(spot) {
    return {
      message: `bridge: Connect ${spot.realityName} with ${spot.intentName}

- Create integration between ${spot.realityPath} and ${spot.intentPath}
- Share data structures and calculations
- Add cross-references in both implementations
- Enable synergy between reality and intent dimensions

This creates ${40}% new synergy between previously isolated categories`,
      files: [
        ...this.getFilesTouch(spot.realityPath),
        ...this.getFilesTouch(spot.intentPath)
      ].map(f => ({
        path: f,
        action: 'modify',
        purpose: `Bridge ${spot.realityName} and ${spot.intentName} implementations`
      }))
    };
  }
  
  /**
   * Get file purpose based on category
   */
  getFilePurpose(file, spot) {
    if (file.includes('analyzer')) return `Add ${spot.name} analysis logic`;
    if (file.includes('generator')) return `Include ${spot.name} in visualizations`;
    if (file.includes('matrix')) return `Enhance ${spot.name} matrix calculations`;
    if (file.includes('settings')) return `Update ${spot.name} configuration`;
    if (file.includes('husky')) return `Enforce ${spot.name} compliance`;
    return `Implement ${spot.name} functionality`;
  }
  
  /**
   * Generate debt-creating patterns to avoid
   */
  generateDebtCreatingPatterns() {
    return [
      {
        type: 'DEBT_CREATING',
        pattern: 'feat: Add new feature without updating Trust Debt categories',
        problem: 'Creates orphaned functionality not tracked in ShortLex hierarchy',
        impact: '+15-30 Trust Debt units per untracked feature',
        example: {
          bad: 'feat: Add new dashboard widget',
          good: 'feat: Add dashboard widget [Β🎨.V📊] with Trust Debt tracking'
        }
      },
      {
        type: 'DEBT_CREATING',
        pattern: 'fix: Quick fix without addressing root cause',
        problem: 'Increases technical debt and reduces alignment confidence',
        impact: '+5-10 Trust Debt units, compounds over time',
        example: {
          bad: 'fix: Patch API timeout issue',
          good: 'fix: Resolve API timeout by implementing proper async handling [Α📏.D📊]'
        }
      },
      {
        type: 'DEBT_CREATING',
        pattern: 'refactor: Change implementation without updating docs',
        problem: 'Reality diverges from intent, creating blind spots',
        impact: '+20-40 Trust Debt units from documentation drift',
        example: {
          bad: 'refactor: Optimize database queries',
          good: 'refactor: Optimize queries [Α📏.M🧮] - update docs and Trust Debt metrics'
        }
      }
    ];
  }
  
  /**
   * Generate perfect alignment examples
   */
  generatePerfectAlignmentExamples() {
    // Find categories with high alignment from matrix
    if (!this.matrixData) return [];
    
    const { matrix, nodes } = this.matrixData;
    const aligned = [];
    
    nodes.forEach(node => {
      const diagonal = matrix[node.path][node.path];
      if (diagonal.similarity > 0.7) {
        aligned.push({
          path: node.path,
          name: node.name,
          alignment: Math.round(diagonal.similarity * 100),
          pattern: this.extractSuccessPattern(node)
        });
      }
    });
    
    return aligned.sort((a, b) => b.alignment - a.alignment).slice(0, 3);
  }
  
  /**
   * Extract success pattern from well-aligned category
   */
  extractSuccessPattern(node) {
    return {
      category: `${node.path}: ${node.name}`,
      alignment: Math.round(node.similarity * 100) + '%',
      keyFactors: [
        'Clear ownership and accountability',
        'Regular commits with category tags',
        'Documentation stays in sync with code',
        'Automated tests prevent regression'
      ],
      maintainanceStrategy: `Continue pattern of small, focused commits tagged with ${node.path}`
    };
  }
  
  /**
   * Generate the next 3 recommended commits
   */
  generateNextCommits(blindSpots, patterns) {
    const commits = [];
    const topSpots = blindSpots.slice(0, 3);
    
    topSpots.forEach((spot, index) => {
      const pattern = patterns[index];
      if (!pattern) return;
      
      commits.push({
        priority: index + 1,
        urgency: spot.priority,
        category: pattern.target || `${pattern.reality} × ${pattern.intent}`,
        categoryName: pattern.targetName || `${pattern.realityName} × ${pattern.intentName}`,
        currentDebt: Math.round((1 - spot.similarity) * 100),
        potentialReduction: Math.round((pattern.targetAlignment - pattern.currentAlignment) * 0.7),
        commit: pattern.example,
        expectedOutcome: pattern.pattern.expectedImpact,
        implementation: {
          timeEstimate: this.estimateTime(pattern),
          complexity: this.estimateComplexity(pattern),
          dependencies: this.identifyDependencies(pattern)
        }
      });
    });
    
    return commits;
  }
  
  /**
   * Estimate implementation time
   */
  estimateTime(pattern) {
    const fileCount = pattern.pattern.touchPoints.length;
    if (fileCount <= 2) return '30 minutes';
    if (fileCount <= 4) return '1-2 hours';
    return '2-4 hours';
  }
  
  /**
   * Estimate complexity
   */
  estimateComplexity(pattern) {
    if (pattern.type === 'SYNERGY_CREATING') return 'HIGH';
    if (pattern.currentAlignment < 10) return 'MEDIUM';
    return 'LOW';
  }
  
  /**
   * Identify dependencies
   */
  identifyDependencies(pattern) {
    const deps = [];
    
    if (pattern.pattern.touchPoints.includes('trust-debt-settings.json')) {
      deps.push('Review and update configuration settings');
    }
    
    if (pattern.pattern.touchPoints.some(f => f.includes('husky'))) {
      deps.push('Ensure git hooks are properly installed');
    }
    
    if (pattern.type === 'SYNERGY_CREATING') {
      deps.push('Coordinate changes across multiple systems');
    }
    
    return deps.length > 0 ? deps : ['None - can be implemented immediately'];
  }
  
  /**
   * Generate HTML section for reproducible patterns
   */
  generatePatternsSection() {
    const blindSpots = this.findTopBlindSpots();
    const debtReducing = this.generateDebtReducingPatterns(blindSpots);
    const debtCreating = this.generateDebtCreatingPatterns();
    const perfect = this.generatePerfectAlignmentExamples();
    const nextCommits = this.generateNextCommits(blindSpots, debtReducing);
    
    return `
    <!-- Reproducible Success Patterns -->
    <div style="
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
      border: 2px solid #10b981;
      border-radius: 20px;
      padding: 40px;
      margin: 40px 0;
    ">
      <h2 style="color: #10b981; font-size: 2.2rem; margin-bottom: 35px; text-align: center;">
        🎯 Reproducible Success Patterns
      </h2>
      
      <!-- Your Next 3 Commits -->
      <div style="
        background: rgba(239, 68, 68, 0.15);
        border: 2px solid #ef4444;
        border-radius: 15px;
        padding: 30px;
        margin-bottom: 40px;
      ">
        <h3 style="color: #ef4444; font-size: 1.6rem; margin-bottom: 25px;">
          🚀 Your Next 3 Commits to Reduce Trust Debt
        </h3>
        
        ${nextCommits.map(commit => `
          <div style="
            background: rgba(0, 0, 0, 0.3);
            border-left: 4px solid ${commit.urgency === 'CRITICAL' ? '#ef4444' : commit.urgency === 'HIGH' ? '#f59e0b' : '#3b82f6'};
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
          ">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
              <div>
                <span style="
                  background: ${commit.urgency === 'CRITICAL' ? '#ef4444' : commit.urgency === 'HIGH' ? '#f59e0b' : '#3b82f6'};
                  color: white;
                  padding: 4px 12px;
                  border-radius: 12px;
                  font-size: 0.9rem;
                  font-weight: bold;
                ">
                  COMMIT #${commit.priority} - ${commit.urgency}
                </span>
                <div style="color: #e2e8f0; font-size: 1.2rem; font-weight: bold; margin-top: 10px;">
                  ${commit.category}: ${commit.categoryName}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="color: #ef4444; font-size: 1.1rem;">
                  Current Debt: ${commit.currentDebt} units
                </div>
                <div style="color: #10b981; font-size: 0.9rem;">
                  Potential Reduction: -${commit.potentialReduction} units
                </div>
              </div>
            </div>
            
            <div style="
              background: rgba(0, 0, 0, 0.5);
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 15px;
              font-family: 'Monaco', 'Courier New', monospace;
            ">
              <div style="color: #60a5fa; font-size: 0.85rem; margin-bottom: 10px;">COMMIT MESSAGE:</div>
              <pre style="color: #e2e8f0; font-size: 0.9rem; white-space: pre-wrap; margin: 0;">${commit.commit.message}</pre>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
              <div>
                <strong style="color: #60a5fa;">Files to Modify:</strong>
                <div style="margin-top: 8px;">
                  ${commit.commit.files.slice(0, 3).map(f => `
                    <div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 4px;">
                      • <code>${f.path}</code>
                      <span style="color: #64748b; font-size: 0.8rem;"> - ${f.purpose}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <div>
                <strong style="color: #60a5fa;">Implementation Details:</strong>
                <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 8px;">
                  ⏱ Time: ${commit.implementation.timeEstimate}<br>
                  📊 Complexity: ${commit.implementation.complexity}<br>
                  🔗 Dependencies: ${commit.implementation.dependencies[0]}
                </div>
              </div>
            </div>
            
            <div style="
              background: rgba(16, 185, 129, 0.1);
              border: 1px solid #10b981;
              padding: 10px;
              border-radius: 6px;
            ">
              <strong style="color: #10b981;">Expected Outcome:</strong>
              <span style="color: #e2e8f0; font-size: 0.9rem;"> ${commit.expectedOutcome}</span>
            </div>
          </div>
        `).join('')}
      </div>
      
      <!-- Debt-Reducing Patterns -->
      <div style="
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid #10b981;
        border-radius: 15px;
        padding: 25px;
        margin-bottom: 30px;
      ">
        <h3 style="color: #10b981; margin-bottom: 20px;">
          ✅ Debt-Reducing Commit Patterns
        </h3>
        
        ${debtReducing.slice(0, 3).map(pattern => `
          <div style="
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <strong style="color: #10b981;">${pattern.pattern.commitTemplate}</strong>
              <span style="
                background: rgba(16, 185, 129, 0.2);
                color: #10b981;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 0.85rem;
              ">
                ${pattern.pattern.expectedImpact}
              </span>
            </div>
            <div style="color: #94a3b8; font-size: 0.85rem;">
              Keywords to include: ${pattern.pattern.keywords.slice(0, 5).map(k => `<code>${k}</code>`).join(', ')}<br>
              Current alignment: ${pattern.currentAlignment}% → Target: ${pattern.targetAlignment}%
            </div>
          </div>
        `).join('')}
      </div>
      
      <!-- Debt-Creating Patterns to Avoid -->
      <div style="
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid #ef4444;
        border-radius: 15px;
        padding: 25px;
        margin-bottom: 30px;
      ">
        <h3 style="color: #ef4444; margin-bottom: 20px;">
          ❌ Debt-Creating Patterns to Avoid
        </h3>
        
        ${debtCreating.map(pattern => `
          <div style="
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
          ">
            <div style="margin-bottom: 10px;">
              <strong style="color: #ef4444;">${pattern.pattern}</strong>
              <div style="color: #fbbf24; font-size: 0.85rem; margin-top: 5px;">
                ${pattern.problem}
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
              <div>
                <span style="color: #ef4444; font-size: 0.85rem;">❌ BAD:</span>
                <code style="color: #94a3b8; font-size: 0.85rem; display: block; margin-top: 4px;">
                  ${pattern.example.bad}
                </code>
              </div>
              <div>
                <span style="color: #10b981; font-size: 0.85rem;">✅ GOOD:</span>
                <code style="color: #94a3b8; font-size: 0.85rem; display: block; margin-top: 4px;">
                  ${pattern.example.good}
                </code>
              </div>
            </div>
            <div style="color: #f59e0b; font-size: 0.85rem; margin-top: 10px;">
              Impact: ${pattern.impact}
            </div>
          </div>
        `).join('')}
      </div>
      
      <!-- Perfect Alignment Examples -->
      ${perfect.length > 0 ? `
        <div style="
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid #3b82f6;
          border-radius: 15px;
          padding: 25px;
        ">
          <h3 style="color: #3b82f6; margin-bottom: 20px;">
            🌟 Perfect Alignment Examples (Learn from These)
          </h3>
          
          ${perfect.map(example => `
            <div style="
              background: rgba(0, 0, 0, 0.3);
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 15px;
            ">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="color: #3b82f6;">${example.path}: ${example.name}</strong>
                <span style="
                  background: rgba(59, 130, 246, 0.2);
                  color: #3b82f6;
                  padding: 4px 12px;
                  border-radius: 12px;
                  font-weight: bold;
                ">
                  ${example.alignment}% ALIGNED
                </span>
              </div>
              <div style="color: #94a3b8; font-size: 0.85rem;">
                <strong>Success Factors:</strong>
                ${example.pattern.keyFactors.map(f => `<br>• ${f}`).join('')}
              </div>
              <div style="color: #60a5fa; font-size: 0.85rem; margin-top: 10px;">
                <strong>Maintenance:</strong> ${example.pattern.maintainanceStrategy}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
    `;
  }
}

// Export for use in other modules
module.exports = { ReproduciblePatternsGenerator };

// Test if run directly
if (require.main === module) {
  const generator = new ReproduciblePatternsGenerator();
  const section = generator.generatePatternsSection();
  
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>Reproducible Success Patterns</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f0f23;
            color: #e2e8f0;
            padding: 20px;
        }
        pre {
            font-family: 'Monaco', 'Courier New', monospace;
        }
        code {
            background: rgba(96, 165, 250, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Courier New', monospace;
        }
    </style>
</head>
<body>
    ${section}
</body>
</html>`;
  
  fs.writeFileSync('trust-debt-reproducible-patterns.html', html);
  console.log('✅ Reproducible Success Patterns generated');
  console.log('📄 View: trust-debt-reproducible-patterns.html');
}