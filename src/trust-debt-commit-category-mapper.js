#!/usr/bin/env node

/**
 * Trust Debt Commit-to-Category Mapper
 * Shows how actual commits get classified into ShortLex categories
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CommitCategoryMapper {
  constructor() {
    this.projectRoot = process.cwd();
    this.categoriesFile = path.join(this.projectRoot, 'trust-debt-categories.json');
  }

  /**
   * Get recent commits with their classifications
   */
  getRecentCommitsWithCategories() {
    // Get last 10 commits
    const gitLog = execSync('git log --oneline -10').toString().trim();
    const commits = gitLog.split('\n').map(line => {
      const [hash, ...messageParts] = line.split(' ');
      return {
        hash: hash.substring(0, 7),
        message: messageParts.join(' ')
      };
    });

    // Classify each commit
    return commits.map(commit => ({
      ...commit,
      category: this.classifyCommit(commit.message),
      trustImpact: this.calculateTrustImpact(commit.message)
    }));
  }

  /**
   * Classify commit message into ShortLex category
   */
  classifyCommit(message) {
    const lower = message.toLowerCase();
    
    // Measurement keywords
    if (lower.includes('analyzer') || lower.includes('semantic') || 
        lower.includes('drift') || lower.includes('measure') ||
        lower.includes('score') || lower.includes('calculate')) {
      return { 
        path: 'O🎯.Α📏', 
        name: 'Measurement',
        color: '#8b5cf6'
      };
    }
    
    // Visualization keywords
    if (lower.includes('html') || lower.includes('visual') || 
        lower.includes('display') || lower.includes('show') ||
        lower.includes('dashboard') || lower.includes('report')) {
      return { 
        path: 'O🎯.Β🎨', 
        name: 'Visualization',
        color: '#10b981'
      };
    }
    
    // Enforcement keywords
    if (lower.includes('hook') || lower.includes('block') || 
        lower.includes('enforce') || lower.includes('prevent') ||
        lower.includes('commit') && lower.includes('check')) {
      return { 
        path: 'O🎯.Γ⚖️', 
        name: 'Enforcement',
        color: '#f59e0b'
      };
    }
    
    // Documentation updates
    if (lower.includes('doc') || lower.includes('readme') || 
        lower.includes('spec') || lower.includes('plan')) {
      return { 
        path: 'O🎯.📄', 
        name: 'Documentation',
        color: '#64748b'
      };
    }
    
    return { 
      path: 'O🎯.❓', 
      name: 'Uncategorized',
      color: '#ef4444'
    };
  }

  /**
   * Calculate trust debt impact from commit
   */
  calculateTrustImpact(message) {
    const lower = message.toLowerCase();
    
    // Positive impacts (reduce debt)
    if (lower.includes('fix') || lower.includes('implement') || 
        lower.includes('add') && lower.includes('test')) {
      return -5;
    }
    
    // Negative impacts (increase debt)
    if (lower.includes('wip') || lower.includes('todo') || 
        lower.includes('hack') || lower.includes('temporary')) {
      return +8;
    }
    
    // Neutral
    return 0;
  }

  /**
   * Generate commit mapping visualization
   */
  generateCommitMappingSection() {
    const commits = this.getRecentCommitsWithCategories();
    
    // Count commits by category
    const categoryCounts = {};
    commits.forEach(commit => {
      const key = commit.category.path;
      categoryCounts[key] = (categoryCounts[key] || 0) + 1;
    });
    
    return `
    <!-- Commit to Category Mapping -->
    <div style="
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(0, 0, 0, 0.8));
      border: 3px solid #f59e0b;
      border-radius: 20px;
      padding: 40px;
      margin-bottom: 40px;
    ">
      <h2 style="color: #f59e0b; font-size: 2.2rem; margin-bottom: 35px; text-align: center;">
        🔄 How Recent Commits Map to ShortLex Categories
      </h2>
      
      <!-- Commit Classification Process -->
      <div style="margin-bottom: 40px;">
        <h3 style="color: #fbbf24; font-size: 1.6rem; margin-bottom: 25px;">
          📝 Recent Commits Classification
        </h3>
        
        <div style="
          background: rgba(0, 0, 0, 0.5);
          padding: 20px;
          border-radius: 12px;
        ">
          ${commits.map(commit => `
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px;
              margin-bottom: 10px;
              background: rgba(0, 0, 0, 0.3);
              border-radius: 8px;
              border-left: 4px solid ${commit.category.color};
            ">
              <div style="flex: 1;">
                <code style="color: #94a3b8; font-size: 0.9rem;">${commit.hash}</code>
                <div style="color: #e2e8f0; margin-top: 5px;">
                  ${commit.message.substring(0, 60)}${commit.message.length > 60 ? '...' : ''}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="
                  display: inline-block;
                  padding: 5px 15px;
                  background: ${commit.category.color}22;
                  border: 1px solid ${commit.category.color};
                  border-radius: 20px;
                  color: ${commit.category.color};
                  font-weight: bold;
                  margin-bottom: 5px;
                ">
                  ${commit.category.path}
                </div>
                <div style="color: ${commit.trustImpact < 0 ? '#10b981' : commit.trustImpact > 0 ? '#ef4444' : '#64748b'}; font-size: 0.9rem;">
                  Trust: ${commit.trustImpact > 0 ? '+' : ''}${commit.trustImpact}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Category Distribution -->
      <div style="margin-bottom: 40px;">
        <h3 style="color: #fbbf24; font-size: 1.6rem; margin-bottom: 25px;">
          📊 Commit Distribution by Category
        </h3>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          ${Object.entries(categoryCounts).map(([path, count]) => {
            const category = commits.find(c => c.category.path === path)?.category;
            const percentage = (count / commits.length * 100).toFixed(0);
            return `
              <div style="
                background: ${category?.color || '#64748b'}22;
                padding: 20px;
                border-radius: 12px;
                border: 2px solid ${category?.color || '#64748b'};
                text-align: center;
              ">
                <div style="font-size: 2rem; font-weight: bold; color: ${category?.color || '#64748b'};">
                  ${count}
                </div>
                <div style="color: #e2e8f0; margin-top: 10px;">
                  ${path}<br>
                  <span style="color: #94a3b8; font-size: 0.9rem;">${percentage}% of commits</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <!-- Classification Rules -->
      <div>
        <h3 style="color: #fbbf24; font-size: 1.6rem; margin-bottom: 25px;">
          🎯 Classification Rules
        </h3>
        
        <div style="
          background: rgba(0, 0, 0, 0.5);
          padding: 25px;
          border-radius: 12px;
        ">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
            <div>
              <h4 style="color: #8b5cf6; margin-bottom: 15px;">Α📏 Measurement</h4>
              <div style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">
                Keywords: analyzer, semantic, drift, measure, score, calculate<br>
                Files: trust-debt-analyzer.js, semantic-*.js
              </div>
            </div>
            <div>
              <h4 style="color: #10b981; margin-bottom: 15px;">Β🎨 Visualization</h4>
              <div style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">
                Keywords: html, visual, display, show, dashboard, report<br>
                Files: *-html-generator.js, ShortLex*.tsx
              </div>
            </div>
            <div>
              <h4 style="color: #f59e0b; margin-bottom: 15px;">Γ⚖️ Enforcement</h4>
              <div style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">
                Keywords: hook, block, enforce, prevent, check<br>
                Files: .husky/*, *-hook.js
              </div>
            </div>
            <div>
              <h4 style="color: #64748b; margin-bottom: 15px;">📄 Documentation</h4>
              <div style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">
                Keywords: doc, readme, spec, plan<br>
                Files: *.md, CLAUDE.md, commitMVP.txt
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Ideal vs Reality -->
      <div style="
        margin-top: 30px;
        padding: 25px;
        background: rgba(139, 92, 246, 0.1);
        border-radius: 12px;
        border: 2px solid #8b5cf6;
      ">
        <h4 style="color: #8b5cf6; font-size: 1.4rem; margin-bottom: 15px;">
          🎯 Intent vs Reality Check
        </h4>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <div>
            <h5 style="color: #60a5fa; margin-bottom: 10px;">📄 Intent (from docs)</h5>
            <div style="color: #e2e8f0; font-size: 0.9rem; line-height: 1.6;">
              • Measurement: 40%<br>
              • Visualization: 35%<br>
              • Enforcement: 25%
            </div>
          </div>
          <div>
            <h5 style="color: #fbbf24; margin-bottom: 10px;">🔄 Reality (from commits)</h5>
            <div style="color: #e2e8f0; font-size: 0.9rem; line-height: 1.6;">
              ${Object.entries(categoryCounts).map(([path, count]) => {
                const percentage = (count / commits.length * 100).toFixed(0);
                return `• ${path}: ${percentage}%<br>`;
              }).join('')}
            </div>
          </div>
        </div>
        
        <div style="
          margin-top: 20px;
          padding: 15px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          color: #ef4444;
          text-align: center;
        ">
          <strong>Gap Analysis:</strong> Commits don't match intended distribution!<br>
          This divergence creates Trust Debt over time.
        </div>
      </div>
    </div>
    `;
  }
}

module.exports = { CommitCategoryMapper };

// CLI test
if (require.main === module) {
  const mapper = new CommitCategoryMapper();
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>Commit Category Mapping</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, sans-serif;
            background: #0f0f23;
            color: #e2e8f0;
            padding: 20px;
        }
    </style>
</head>
<body>
    ${mapper.generateCommitMappingSection()}
</body>
</html>`;
  
  fs.writeFileSync('trust-debt-commit-mapping.html', html);
  console.log('✅ Commit mapping visualization generated');
}