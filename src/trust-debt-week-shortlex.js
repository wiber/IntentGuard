#!/usr/bin/env node

/**
 * Trust Debt Week Analysis with Proper ShortLex Structure
 * 
 * Features:
 * - Proper ShortLex hierarchy: O → Greek letters (Α,Β,Γ) → Categories → Actions
 * - Correct depth-first ordering with weights
 * - Full git commit messages (expandable)
 * - Document fingerprints with Trust Debt percentages
 * - FIM-based analysis with M = S × E framework
 * - 1D axis validation on HTML output
 * 
 * Usage: pnpm t:week
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { FIMTrustDebtAnalyzer } = require('./trust-debt-fim-analyzer');

// ShortLex structure following the exact hierarchy
const SHORTLEX_TEMPLATE = {
  id: 'O',
  symbol: 'O',
  emoji: '🎯',
  title: 'Outcome',
  description: 'Meaningful Impact - Create lasting positive change',
  weight: 100,
  type: 'outcome',
  children: [
    {
      id: 'A',
      symbol: 'Α',
      emoji: '💪',
      title: 'Trust Foundation',
      description: 'Building measurable trust',
      weight: 35,
      type: 'latent',
      children: []
    },
    {
      id: 'B',
      symbol: 'Β',
      emoji: '🚀',
      title: 'Strategic Timing',
      description: 'Perfect moment delivery',
      weight: 35,
      type: 'latent',
      children: []
    },
    {
      id: 'G',
      symbol: 'Γ',
      emoji: '❤️',
      title: 'Recognition Creation',
      description: 'Engineering oh moments',
      weight: 30,
      type: 'latent',
      children: []
    }
  ]
};

// Category templates for each latent factor
const CATEGORY_TEMPLATES = {
  'A': [
    { symbol: 'Q', emoji: '📊', name: 'Quantification', description: 'Making trust measurable' },
    { symbol: 'V', emoji: '👁️', name: 'Visibility', description: 'Revealing hidden drift' },
    { symbol: 'D', emoji: '📈', name: 'Drift Detection', description: 'Tracking divergence' }
  ],
  'B': [
    { symbol: 'P', emoji: '⏰', name: 'Precision', description: '30-second delivery' },
    { symbol: 'A', emoji: '🎯', name: 'Acceleration', description: '30% faster claims' },
    { symbol: 'M', emoji: '🔄', name: 'Momentum', description: 'Compound effects' }
  ],
  'G': [
    { symbol: 'N', emoji: '🏷️', name: 'Naming', description: 'Pattern recognition' },
    { symbol: 'B', emoji: '💡', name: 'Breakthroughs', description: 'Oh moment engineering' },
    { symbol: 'R', emoji: '🔁', name: 'Reproducibility', description: 'Consistent insights' }
  ]
};

// Action templates for categories
const ACTION_TEMPLATES = {
  'Q': [
    { symbol: 'S', emoji: '💯', name: 'Scoring', description: 'Trust Debt scores' },
    { symbol: 'M', emoji: '📏', name: 'Metrics', description: 'Quantified measurements' }
  ],
  'V': [
    { symbol: 'R', emoji: '🔍', name: 'Reveal', description: 'Expose hidden patterns' },
    { symbol: 'H', emoji: '📢', name: 'Highlight', description: 'Make visible' }
  ],
  'P': [
    { symbol: 'T', emoji: '⏱️', name: 'Timing', description: 'Perfect moment selection' },
    { symbol: 'B', emoji: '⚡', name: 'Brevity', description: '30-second constraint' }
  ]
};

// Get git information with full commit messages
function getGitInfo() {
  try {
    // Get last 3 commits with full messages
    const commits = execSync('git log --format="%H|%s|%b" -3', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(line => line)
      .map(line => {
        const [hash, subject, body] = line.split('|');
        return {
          hash: hash.substring(0, 7),
          fullHash: hash,
          subject: subject || '',
          body: body || '',
          message: subject + (body ? '\n' + body : '')
        };
      });
    
    // Get current branch
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    
    // Get status summary
    const statusOutput = execSync('git status --short', { encoding: 'utf8' });
    const modifiedFiles = statusOutput.split('\n').filter(line => line.trim()).length;
    
    // Get diff stats
    const diffStats = execSync('git diff --stat', { encoding: 'utf8' }).trim();
    
    return {
      branch,
      commits,
      modifiedFiles,
      clean: modifiedFiles === 0,
      diffStats
    };
  } catch (error) {
    console.error('Git info error:', error.message);
    return {
      branch: 'unknown',
      commits: [],
      modifiedFiles: 0,
      clean: true,
      diffStats: ''
    };
  }
}

// Generate document fingerprint
function generateFingerprint(content, filepath) {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  const fullHash = hash.digest('hex');
  return {
    short: fullHash.substring(0, 8),
    full: fullHash,
    path: filepath,
    size: Buffer.byteLength(content, 'utf8'),
    lines: content.split('\n').length
  };
}

// Generate ShortLex categories from content analysis
function generateShortLexFromContent(content) {
  const structure = JSON.parse(JSON.stringify(SHORTLEX_TEMPLATE)); // Deep clone
  const lowerContent = content.toLowerCase();
  
  // Analyze content patterns
  const patterns = {
    trust: (lowerContent.match(/trust debt|quantified|score|measur/gi) || []).length,
    timing: (lowerContent.match(/30 seconds|timing|moment|receptiv/gi) || []).length,
    recognition: (lowerContent.match(/oh moment|breakthrough|recogni|insight/gi) || []).length
  };
  
  // Adjust weights based on content emphasis
  const total = patterns.trust + patterns.timing + patterns.recognition;
  if (total > 0) {
    structure.children[0].weight = Math.round((patterns.trust / total) * 100);
    structure.children[1].weight = Math.round((patterns.timing / total) * 100);
    structure.children[2].weight = 100 - structure.children[0].weight - structure.children[1].weight;
  }
  
  // Add categories to each latent factor
  structure.children.forEach((latent, idx) => {
    const letter = ['A', 'B', 'G'][idx];
    const categories = CATEGORY_TEMPLATES[letter];
    
    // Add categories with calculated weights
    categories.forEach((cat, catIdx) => {
      const categoryNode = {
        id: `${latent.id}.${cat.symbol}`,
        symbol: cat.symbol,
        emoji: cat.emoji,
        title: cat.name,
        description: cat.description,
        weight: catIdx === 0 ? 40 : catIdx === 1 ? 35 : 25,
        type: 'category',
        children: []
      };
      
      // Add some actions to categories
      if (ACTION_TEMPLATES[cat.symbol]) {
        ACTION_TEMPLATES[cat.symbol].forEach((action, actIdx) => {
          categoryNode.children.push({
            id: `${categoryNode.id}.${action.symbol}`,
            symbol: action.symbol,
            emoji: action.emoji,
            title: action.name,
            description: action.description,
            weight: actIdx === 0 ? 60 : 40,
            type: 'action',
            children: []
          });
        });
      }
      
      latent.children.push(categoryNode);
    });
  });
  
  return structure;
}

// Calculate effective weights and sort by ShortLex rules
function calculateShortLexOrder(structure) {
  const items = [];
  
  function traverse(node, path = [], parentWeight = 100, depth = 0) {
    const effectiveWeight = depth === 0 ? 100 : (node.weight / 100) * parentWeight;
    
    items.push({
      node,
      path: [...path],
      pathString: path.length === 0 ? node.symbol + node.emoji : 
                  path.map((p, i) => i === 0 ? p : '.' + p).join('') + '.' + node.symbol + node.emoji,
      depth,
      effectiveWeight,
      type: node.type || 'unknown'
    });
    
    // Process children in weight order
    const sortedChildren = [...(node.children || [])]
      .sort((a, b) => b.weight - a.weight);
    
    sortedChildren.forEach(child => {
      traverse(child, [...path, node.symbol + node.emoji], effectiveWeight, depth + 1);
    });
  }
  
  traverse(structure);
  
  // Sort by depth first (shorter paths first), then by weight within same depth
  return items.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return b.effectiveWeight - a.effectiveWeight;
  });
}

// Validate ShortLex structure
function validateShortLexStructure(items) {
  const violations = [];
  
  // Check depth-first ordering
  for (let i = 1; i < items.length; i++) {
    const current = items[i];
    const previous = items[i - 1];
    
    // Shorter paths must come before longer paths
    if (current.depth < previous.depth) {
      violations.push(`Order violation: ${current.pathString} (depth ${current.depth}) after ${previous.pathString} (depth ${previous.depth})`);
    }
    
    // Within same depth, higher weights first
    if (current.depth === previous.depth && current.effectiveWeight > previous.effectiveWeight + 0.01) {
      violations.push(`Weight violation: ${current.pathString} (${current.effectiveWeight.toFixed(1)}%) after ${previous.pathString} (${previous.effectiveWeight.toFixed(1)}%)`);
    }
  }
  
  return {
    valid: violations.length === 0,
    violations,
    itemCount: items.length
  };
}

// Analyze document with fingerprinting
async function analyzeDocument(filepath) {
  const content = await fs.readFile(filepath, 'utf-8');
  const fingerprint = generateFingerprint(content, filepath);
  
  // Use FIM analyzer for Trust Debt calculation
  const analyzer = new FIMTrustDebtAnalyzer();
  const analysis = analyzer.analyzeFIM(content);
  
  return {
    fingerprint,
    trustDebt: analysis.trustDebt.score,
    drift: analysis.trustDebt.drift,
    momentum: analysis.momentum.raw * 100,
    violations: analysis.violations.length,
    content: content.substring(0, 500) // First 500 chars for preview
  };
}

// Generate enhanced HTML with proper ShortLex structure
async function generateEnhancedHTML(gitInfo, documents, shortlexStructure, shortlexItems, validation, fimAnalysis) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt Analysis - ShortLex Validated</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'SF Pro Display', -apple-system, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1d29 100%);
            color: #e2e8f0;
            line-height: 1.7;
            padding: 40px 20px;
        }

        .container {
            max-width: 1600px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            padding: 60px 20px;
            background: radial-gradient(circle at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
            margin-bottom: 40px;
            border-radius: 20px;
        }

        h1 {
            font-size: 3rem;
            font-weight: 900;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06ffa5 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
        }

        .validation-badge {
            display: inline-block;
            padding: 10px 30px;
            background: ${validation.valid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
            border: 2px solid ${validation.valid ? '#10b981' : '#ef4444'};
            border-radius: 50px;
            font-weight: 700;
            font-size: 1.1rem;
            margin-top: 20px;
        }

        .git-info {
            background: rgba(30, 41, 59, 0.6);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #8b5cf6;
        }

        .commit {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .commit:hover {
            background: rgba(0, 0, 0, 0.5);
            transform: translateX(5px);
        }

        .commit-header {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .commit-hash {
            background: #8b5cf6;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9rem;
        }

        .commit-subject {
            flex: 1;
            font-weight: 600;
        }

        .commit-body {
            display: none;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: #94a3b8;
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 0.9rem;
        }

        .commit.expanded .commit-body {
            display: block;
        }

        .shortlex-section {
            background: rgba(139, 92, 246, 0.05);
            border: 2px solid rgba(139, 92, 246, 0.2);
            border-radius: 16px;
            padding: 30px;
            margin: 40px 0;
        }

        .shortlex-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .shortlex-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .shortlex-table th {
            background: rgba(139, 92, 246, 0.2);
            padding: 12px;
            text-align: left;
            font-weight: 700;
            border-bottom: 2px solid rgba(139, 92, 246, 0.3);
        }

        .shortlex-table td {
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .shortlex-table tr:hover {
            background: rgba(139, 92, 246, 0.05);
        }

        .path-cell {
            font-family: 'SF Mono', monospace;
            font-weight: 600;
            color: #8b5cf6;
        }

        .weight-cell {
            text-align: right;
            font-weight: 700;
        }

        .type-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 600;
        }

        .type-outcome { background: rgba(255, 215, 0, 0.2); color: #ffd700; }
        .type-latent { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
        .type-category { background: rgba(236, 72, 153, 0.2); color: #ec4899; }
        .type-action { background: rgba(16, 185, 129, 0.2); color: #10b981; }

        .documents-section {
            background: rgba(16, 185, 129, 0.05);
            border: 2px solid rgba(16, 185, 129, 0.2);
            border-radius: 16px;
            padding: 30px;
            margin: 40px 0;
        }

        .document-card {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            border-radius: 12px;
            margin: 15px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .fingerprint {
            font-family: monospace;
            background: rgba(139, 92, 246, 0.2);
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 0.9rem;
        }

        .trust-score {
            font-size: 2rem;
            font-weight: 900;
        }

        .fim-analysis {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
            border: 2px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 40px;
            margin: 40px 0;
            text-align: center;
        }

        .fim-formula {
            font-size: 2rem;
            font-weight: 900;
            margin: 20px 0;
            font-family: 'SF Mono', monospace;
            color: #8b5cf6;
        }

        .violations-list {
            background: rgba(239, 68, 68, 0.05);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }

        .violation-item {
            color: #ef4444;
            margin: 5px 0;
        }

        .timestamp {
            color: #64748b;
            font-size: 0.9rem;
            text-align: center;
            margin-top: 20px;
        }

        .expand-indicator {
            color: #64748b;
            font-size: 0.9rem;
            margin-left: auto;
        }
    </style>
    <script>
        function toggleCommit(element) {
            element.classList.toggle('expanded');
        }
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Trust Debt FIM Analysis</h1>
            <p style="font-size: 1.3rem; color: #94a3b8;">ShortLex Structure Validation</p>
            <div class="validation-badge">
                ${validation.valid ? '✅ ShortLex Valid' : '❌ ShortLex Violations: ' + validation.violations.length}
                - ${validation.itemCount} items sorted
            </div>
            <div class="timestamp">Generated: ${new Date().toISOString()}</div>
        </div>

        <div class="git-info">
            <h2 style="color: #8b5cf6; margin-bottom: 15px;">📊 Git Repository Information</h2>
            <p><strong>Branch:</strong> ${gitInfo.branch}</p>
            <p><strong>Status:</strong> ${gitInfo.clean ? '✅ Clean' : `⚠️ ${gitInfo.modifiedFiles} modified files`}</p>
            <div style="margin-top: 20px;">
                <strong>Recent Commits (click to expand):</strong>
                ${gitInfo.commits.map(commit => `
                <div class="commit" onclick="toggleCommit(this)">
                    <div class="commit-header">
                        <span class="commit-hash">${commit.hash}</span>
                        <span class="commit-subject">${commit.subject}</span>
                        <span class="expand-indicator">▼</span>
                    </div>
                    <div class="commit-body">${commit.body || 'No additional details'}</div>
                </div>
                `).join('')}
            </div>
        </div>

        <div class="shortlex-section">
            <div class="shortlex-header">
                <h2 style="font-size: 1.8rem; color: #8b5cf6;">🎯 ShortLex Priority Structure</h2>
                <span style="color: #94a3b8;">Weighted ordering active</span>
            </div>
            <p style="color: #94a3b8; margin-bottom: 20px;">
                Your priorities, naturally ordered: What matters most rises to the top.
                Each level inherits importance from what contains it.
            </p>
            
            ${validation.violations.length > 0 ? `
            <div class="violations-list">
                <strong>⚠️ Validation Issues:</strong>
                ${validation.violations.map(v => `<div class="violation-item">• ${v}</div>`).join('')}
            </div>
            ` : ''}
            
            <table class="shortlex-table">
                <thead>
                    <tr>
                        <th>Path</th>
                        <th>Priority</th>
                        <th>Effective Weight</th>
                        <th>Title & Description</th>
                        <th>Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${shortlexItems.map(item => `
                    <tr>
                        <td class="path-cell">${item.pathString}</td>
                        <td style="text-align: center; font-weight: 700;">${item.node.weight}</td>
                        <td class="weight-cell" style="color: ${item.effectiveWeight >= 10 ? '#10b981' : item.effectiveWeight >= 5 ? '#f59e0b' : '#ef4444'}">
                            ${item.effectiveWeight.toFixed(1)}%
                        </td>
                        <td>
                            <strong>${item.node.title}</strong><br>
                            <span style="color: #94a3b8; font-size: 0.9rem;">${item.node.description}</span>
                        </td>
                        <td>
                            <span class="type-badge type-${item.type}">${item.type}</span>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="documents-section">
            <h2 style="font-size: 1.8rem; color: #10b981; margin-bottom: 20px;">📄 Document Analysis</h2>
            ${documents.map(doc => `
                <div class="document-card">
                    <div>
                        <strong>${path.basename(doc.fingerprint.path)}</strong>
                        <span class="fingerprint">${doc.fingerprint.short}</span>
                        <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 5px;">
                            ${doc.fingerprint.lines} lines • ${(doc.fingerprint.size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <div class="trust-score" style="color: ${doc.trustDebt >= 70 ? '#10b981' : doc.trustDebt >= 50 ? '#f59e0b' : '#ef4444'}">
                            ${doc.trustDebt}%
                        </div>
                        <p style="color: #94a3b8; font-size: 0.9rem;">Trust Debt</p>
                        <p style="color: #f59e0b; font-size: 0.9rem;">Drift: ${doc.drift}%</p>
                    </div>
                </div>
            `).join('')}
        </div>

        ${fimAnalysis ? `
        <div class="fim-analysis">
            <h2 style="font-size: 2rem; margin-bottom: 20px;">M = S × E Framework</h2>
            <div class="fim-formula">M = S × E</div>
            <p style="font-size: 1.1rem; margin: 20px 0;">
                Momentum = Skill × Environment
            </p>
            <div style="font-size: 3rem; font-weight: 900; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 20px 0;">
                ${(fimAnalysis.momentum.raw * 100).toFixed(1)}%
            </div>
            <p style="color: #94a3b8;">
                Skill: ${(fimAnalysis.momentum.components.skill * 100).toFixed(1)}% • 
                Environment: ${(fimAnalysis.momentum.components.environment * 100).toFixed(1)}%
            </p>
            <p style="margin-top: 20px; font-size: 1.2rem;">
                <strong>Trust Debt Score:</strong> ${fimAnalysis.trustDebt.score}/100
                ${fimAnalysis.trustDebt.insurabilityThreshold ? '✅ Insurable' : '❌ Below Threshold'}
            </p>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 60px; color: #64748b;">
            <p>Unity Principle: Shape = Symbol (Block Node Unity)</p>
            <p style="margin-top: 10px;">Patent Pending - USPTO #18/XXX,XXX</p>
        </div>
    </div>
</body>
</html>`;

  return html;
}

// Main execution
async function main() {
  console.log('🎯 Trust Debt Analysis with ShortLex Validation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Get git information
    console.log('\n📊 Gathering git information...');
    const gitInfo = getGitInfo();
    console.log(`  Branch: ${gitInfo.branch}`);
    console.log(`  Commits: ${gitInfo.commits.length} recent`);
    console.log(`  Status: ${gitInfo.clean ? 'Clean' : `${gitInfo.modifiedFiles} modified`}`);
    
    // 2. Analyze documents
    console.log('\n📄 Analyzing documents...');
    const docsToAnalyze = [
      path.join(__dirname, '..', 'CLAUDE.md'),
      path.join(__dirname, '..', 'README.md')
    ];
    
    // Add week files
    const weekFiles = fsSync.readdirSync(path.join(__dirname, '..'))
      .filter(f => f.startsWith('WEEK_') && f.endsWith('.md'))
      .map(f => path.join(__dirname, '..', f));
    
    docsToAnalyze.push(...weekFiles.slice(0, 3));
    
    const documents = [];
    let allContent = '';
    for (const docPath of docsToAnalyze) {
      if (fsSync.existsSync(docPath)) {
        console.log(`  Analyzing: ${path.basename(docPath)}`);
        const analysis = await analyzeDocument(docPath);
        documents.push(analysis);
        allContent += analysis.content + '\n';
      }
    }
    
    // 3. Generate ShortLex structure from content
    console.log('\n🧠 Generating ShortLex structure...');
    const shortlexStructure = generateShortLexFromContent(allContent);
    const shortlexItems = calculateShortLexOrder(shortlexStructure);
    const validation = validateShortLexStructure(shortlexItems);
    
    console.log(`  Generated ${shortlexItems.length} items`);
    console.log(`  Validation: ${validation.valid ? '✅ Valid' : '❌ ' + validation.violations.length + ' violations'}`);
    
    // 4. Run FIM analysis
    console.log('\n⚙️ Running FIM analysis...');
    const analyzer = new FIMTrustDebtAnalyzer();
    const fimAnalysis = analyzer.analyzeFIM(allContent);
    console.log(`  Trust Debt Score: ${fimAnalysis.trustDebt.score}/100`);
    console.log(`  Momentum: ${(fimAnalysis.momentum.raw * 100).toFixed(1)}%`);
    
    // 5. Generate HTML
    console.log('\n🎨 Generating HTML visualization...');
    const htmlContent = await generateEnhancedHTML(
      gitInfo, 
      documents, 
      shortlexStructure, 
      shortlexItems, 
      validation, 
      fimAnalysis
    );
    const htmlPath = path.join(__dirname, '..', `trust-debt-shortlex-${Date.now()}.html`);
    await fs.writeFile(htmlPath, htmlContent);
    console.log(`✅ Created: ${path.basename(htmlPath)}`);
    
    // 6. Open HTML in browser
    console.log('\n🌐 Opening visualization...');
    try {
      execSync(`open "${htmlPath}"`, { stdio: 'ignore' });
      console.log('✅ Opened in browser');
    } catch (error) {
      try {
        execSync(`xdg-open "${htmlPath}"`, { stdio: 'ignore' });
      } catch (e) {
        console.log(`📖 View at: ${htmlPath}`);
      }
    }
    
    // 7. Generate comprehensive prompt
    const prompt = `# 🎯 Trust Debt Analysis with ShortLex Validation

## Git Repository Status
- **Branch**: ${gitInfo.branch}
- **Status**: ${gitInfo.clean ? 'Clean' : `${gitInfo.modifiedFiles} modified files`}

### Recent Commits:
${gitInfo.commits.map(c => `
**${c.hash}** - ${c.subject}
${c.body ? '```\n' + c.body + '\n```' : ''}`).join('\n')}

## ShortLex Structure Validation
- **Items**: ${shortlexItems.length} total
- **Valid**: ${validation.valid ? '✅ Yes' : '❌ No'}
${validation.violations.length > 0 ? `
### Violations:
${validation.violations.map(v => `- ${v}`).join('\n')}` : ''}

### Top Priorities by Effective Weight:
${shortlexItems.slice(0, 10).map((item, idx) => 
  `${idx + 1}. **${item.pathString}** - ${item.node.title} (${item.effectiveWeight.toFixed(1)}%)`
).join('\n')}

## Document Trust Debt Analysis
${documents.map(doc => `
### ${path.basename(doc.fingerprint.path)}
- **Fingerprint**: \`${doc.fingerprint.short}\`
- **Trust Debt**: ${doc.trustDebt}%
- **Drift**: ${doc.drift}%
- **Momentum**: ${doc.momentum.toFixed(1)}%`).join('\n')}

## FIM Analysis (M = S × E)
- **Momentum**: ${(fimAnalysis.momentum.raw * 100).toFixed(1)}%
- **Trust Debt Score**: ${fimAnalysis.trustDebt.score}/100
- **Insurable**: ${fimAnalysis.trustDebt.insurabilityThreshold ? 'Yes' : 'No'}

## Action Items
1. ${fimAnalysis.trustDebt.score < 70 ? 'Boost Trust Debt above insurability threshold (70)' : 'Maintain Trust Debt above 70'}
2. ${validation.valid ? 'ShortLex structure is valid' : 'Fix ShortLex ordering violations'}
3. Focus on documents with Trust Debt < 70%

The HTML visualization is now open in your browser.`;
    
    // 8. Launch Claude
    console.log('\n🚀 Launching Claude with analysis...');
    try {
      execSync(`claude "${prompt}"`, { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
    } catch (claudeError) {
      console.log('\n💡 Analysis complete. Launch Claude manually to review.');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  getGitInfo, 
  generateFingerprint, 
  generateShortLexFromContent,
  calculateShortLexOrder,
  validateShortLexStructure
};