#!/usr/bin/env node

/**
 * Trust Debt Symmetric Cosine Similarity Matrix
 * Creates a 2D matrix with ShortLex nodes on BOTH axes
 * Shows cosine similarity between git commits mapped to different nodes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// ShortLex hierarchy with documentation sources as additional nodes
const SHORTLEX_NODES = [
  // Core MVP nodes
  {
    path: 'O🎯',
    name: 'Trust Debt MVP',
    keywords: ['trust', 'debt', 'mvp', 'gap', 'intent', 'reality', 'alignment', 'drift'],
    patterns: ['trust.?debt', 'intent.*reality', 'alignment', 'drift']
  },
  {
    path: 'Α📏',
    name: 'Measurement',
    keywords: ['measure', 'analyze', 'semantic', 'score', 'calculate', 'detect', 'track', 'metric'],
    patterns: ['measur', 'analy', 'semantic', 'score', 'calculat', 'detect', 'track', 'metric']
  },
  {
    path: 'Β🎨',
    name: 'Visualization',
    keywords: ['visual', 'display', 'html', 'dashboard', 'report', 'chart', 'graph', 'ui', 'render'],
    patterns: ['visual', 'display', 'html', 'dashboard', 'report', 'chart', 'graph', 'render']
  },
  {
    path: 'Γ⚖️',
    name: 'Enforcement',
    keywords: ['enforce', 'block', 'hook', 'prevent', 'check', 'validate', 'commit', 'git'],
    patterns: ['enforc', 'block', 'hook', 'prevent', 'check', 'validat', 'commit']
  },
  // Documentation source nodes
  {
    path: '📜Patent',
    name: 'Patent v16',
    keywords: ['claim', 'invention', 'method', 'system', 'embodiment', 'neuromorphic', 'unity', 'fim'],
    patterns: ['claim', 'invention', 'patent', 'embodiment', 'neuromorphic']
  },
  {
    path: '💼Business',
    name: 'Business Plan',
    keywords: ['kpi', 'revenue', 'user', 'growth', 'market', 'strategy', 'monetization', 'oh moment'],
    patterns: ['kpi', 'revenue', 'user.*growth', 'market', 'monetiz', 'oh.?moment']
  },
  {
    path: '🎯MVP',
    name: 'MVP Spec',
    keywords: ['requirement', 'feature', 'implementation', 'mvp', 'priority', 'deliverable', 'spec'],
    patterns: ['requirement', 'feature', 'implement', 'mvp', 'priority', 'spec']
  },
  {
    path: '📝CLAUDE',
    name: 'CLAUDE.md',
    keywords: ['pattern', 'rule', 'guideline', 'coherence', 'cascade', 'nudge', 'unrobocall', 'claude'],
    patterns: ['pattern', 'rule', 'guideline', 'coherence', 'cascade', 'nudge', 'claude']
  }
];

/**
 * Get git commits from the last week with full messages
 */
function getRecentCommits() {
  try {
    const commits = execSync('git log --format="%H|%s" --since="7 days ago"', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const [hash, ...subjectParts] = line.split('|');
        const subject = subjectParts.join('|');
        return {
          hash: hash,
          message: subject.toLowerCase(),
          subject: subject.toLowerCase()
        };
      });
    
    console.log(`${colors.cyan}📊 Found ${commits.length} commits from last week${colors.reset}`);
    return commits;
  } catch (error) {
    console.error('Error getting commits:', error);
    return [];
  }
}

/**
 * Get changed files for each commit
 */
function getCommitFiles(commitHash) {
  try {
    const files = execSync(`git show --name-only --format="" ${commitHash}`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(f => f.length > 0);
    return files;
  } catch (error) {
    return [];
  }
}

/**
 * Map commits to ShortLex nodes based on keywords and patterns
 */
function mapCommitsToNodes(commits) {
  const nodeCommits = {};
  
  // Initialize empty arrays for each node
  SHORTLEX_NODES.forEach(node => {
    nodeCommits[node.path] = [];
  });
  
  // Map each commit to relevant nodes
  commits.forEach(commit => {
    const files = getCommitFiles(commit.hash);
    const fullText = commit.message + ' ' + files.join(' ');
    
    SHORTLEX_NODES.forEach(node => {
      let score = 0;
      
      // Check keywords
      node.keywords.forEach(keyword => {
        const matches = (fullText.match(new RegExp(keyword, 'gi')) || []).length;
        score += matches;
      });
      
      // Check patterns
      node.patterns.forEach(pattern => {
        const matches = (fullText.match(new RegExp(pattern, 'gi')) || []).length;
        score += matches * 2; // Patterns worth more
      });
      
      // Check file paths
      if (node.path.includes('Β🎨') && files.some(f => f.includes('.html') || f.includes('.tsx'))) {
        score += 5;
      }
      if (node.path.includes('Α📏') && files.some(f => f.includes('analyzer') || f.includes('metric'))) {
        score += 5;
      }
      if (node.path.includes('Γ⚖️') && files.some(f => f.includes('.husky') || f.includes('hook'))) {
        score += 5;
      }
      
      if (score > 0) {
        nodeCommits[node.path].push({
          ...commit,
          score: score
        });
      }
    });
  });
  
  // Report mapping statistics
  console.log(`\n${colors.bright}📍 Commit Mapping Statistics:${colors.reset}`);
  SHORTLEX_NODES.forEach(node => {
    const count = nodeCommits[node.path].length;
    const percentage = (count / commits.length * 100).toFixed(1);
    const color = count > 5 ? colors.green : count > 0 ? colors.yellow : colors.red;
    console.log(`  ${color}${node.path}${colors.reset}: ${count} commits (${percentage}%)`);
  });
  
  return nodeCommits;
}

/**
 * Calculate cosine similarity between two sets of commits
 */
function calculateSimilarity(commits1, commits2) {
  if (commits1.length === 0 || commits2.length === 0) {
    return 0;
  }
  
  // Create combined vocabulary
  const allWords = new Set();
  const text1 = commits1.map(c => c.message).join(' ');
  const text2 = commits2.map(c => c.message).join(' ');
  
  // Extract words (simple tokenization)
  text1.split(/\s+/).forEach(word => {
    if (word.length > 2) allWords.add(word);
  });
  text2.split(/\s+/).forEach(word => {
    if (word.length > 2) allWords.add(word);
  });
  
  // Create frequency vectors
  const vocab = Array.from(allWords);
  const vector1 = vocab.map(word => 
    (text1.match(new RegExp(word, 'g')) || []).length
  );
  const vector2 = vocab.map(word => 
    (text2.match(new RegExp(word, 'g')) || []).length
  );
  
  // Calculate cosine similarity
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Generate the symmetric similarity matrix
 */
function generateSymmetricMatrix() {
  console.log(`\n${colors.bright}🔄 Generating Symmetric Trust Debt Matrix${colors.reset}\n`);
  
  // Get recent commits
  const commits = getRecentCommits();
  if (commits.length === 0) {
    console.error('No commits found in the last week');
    return null;
  }
  
  // Map commits to nodes
  const nodeCommits = mapCommitsToNodes(commits);
  
  // Calculate similarity matrix
  const matrix = {};
  
  SHORTLEX_NODES.forEach(node1 => {
    matrix[node1.path] = {};
    
    SHORTLEX_NODES.forEach(node2 => {
      const similarity = calculateSimilarity(
        nodeCommits[node1.path],
        nodeCommits[node2.path]
      );
      
      matrix[node1.path][node2.path] = {
        similarity: similarity,
        commits1: nodeCommits[node1.path].length,
        commits2: nodeCommits[node2.path].length
      };
    });
  });
  
  return {
    matrix: matrix,
    nodeCommits: nodeCommits,
    totalCommits: commits.length,
    nodes: SHORTLEX_NODES
  };
}

/**
 * Generate HTML visualization for symmetric matrix
 */
function generateSymmetricHTML(data) {
  const { matrix, nodeCommits, totalCommits, nodes } = data;
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt Symmetric Cosine Matrix</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'SF Mono', Monaco, monospace;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
            color: #fff;
            padding: 20px;
            min-height: 100vh;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        
        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            background: linear-gradient(90deg, #00ff88, #00aaff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .subtitle {
            color: #888;
            font-size: 1.1em;
            margin-bottom: 10px;
        }
        
        .commit-count {
            color: #00ff88;
            font-size: 1.2em;
        }
        
        .matrix-container {
            background: rgba(255,255,255,0.03);
            border-radius: 15px;
            padding: 20px;
            overflow: auto;
            max-width: 100%;
        }
        
        .matrix-table {
            border-collapse: separate;
            border-spacing: 2px;
            margin: 0 auto;
        }
        
        .matrix-cell {
            width: 80px;
            height: 80px;
            text-align: center;
            position: relative;
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 5px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
        }
        
        .matrix-header {
            background: rgba(255,255,255,0.1);
            font-weight: 600;
            color: #00ff88;
            font-size: 12px;
            padding: 5px;
            writing-mode: vertical-rl;
            text-orientation: mixed;
            height: 150px;
            width: 80px;
        }
        
        .matrix-row-header {
            background: rgba(255,255,255,0.1);
            font-weight: 600;
            color: #00ff88;
            font-size: 12px;
            padding: 10px;
            text-align: right;
            width: 150px;
            white-space: nowrap;
        }
        
        .diagonal {
            background: linear-gradient(135deg, #333, #222) !important;
            color: #666;
            opacity: 0.5;
        }
        
        .matrix-cell:hover:not(.diagonal) {
            transform: scale(1.15);
            box-shadow: 0 4px 20px rgba(0,255,136,0.5);
            z-index: 100;
        }
        
        .similarity-high { background: linear-gradient(135deg, #00ff88, #00cc66); color: #000; }
        .similarity-medium-high { background: linear-gradient(135deg, #88ff00, #66cc00); color: #000; }
        .similarity-medium { background: linear-gradient(135deg, #ffcc00, #ff9900); color: #000; }
        .similarity-low { background: linear-gradient(135deg, #ff6600, #ff3300); color: #fff; }
        .similarity-critical { background: linear-gradient(135deg, #ff0066, #cc0033); color: #fff; }
        .similarity-none { background: rgba(255,255,255,0.05); color: #666; }
        
        .cell-value {
            font-size: 18px;
            margin-bottom: 2px;
        }
        
        .cell-commits {
            font-size: 10px;
            opacity: 0.7;
        }
        
        .tooltip {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.95);
            color: #fff;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
            z-index: 1000;
            min-width: 200px;
            text-align: left;
        }
        
        .matrix-cell:hover .tooltip {
            opacity: 1;
        }
        
        .stats-grid {
            margin-top: 30px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .stat-card {
            background: rgba(255,255,255,0.05);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #888;
            font-size: 0.9em;
        }
        
        .legend {
            margin-top: 30px;
            display: flex;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 5px 10px;
            background: rgba(255,255,255,0.05);
            border-radius: 5px;
        }
        
        .legend-color {
            width: 25px;
            height: 25px;
            border-radius: 3px;
        }
        
        .insights {
            margin-top: 30px;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
            border-left: 4px solid #00ff88;
        }
        
        .insights h3 {
            color: #00ff88;
            margin-bottom: 15px;
        }
        
        .insight-item {
            margin-bottom: 10px;
            padding-left: 20px;
            position: relative;
        }
        
        .insight-item::before {
            content: "→";
            position: absolute;
            left: 0;
            color: #00ff88;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Trust Debt Symmetric Cosine Matrix</h1>
        <div class="subtitle">ShortLex × ShortLex Cross-Correlation</div>
        <div class="commit-count">${totalCommits} commits analyzed from last 7 days</div>
    </div>
    
    <div class="matrix-container">
        <table class="matrix-table">
            <tr>
                <td></td>`;
  
  // Add column headers
  nodes.forEach(node => {
    html += `<td class="matrix-header" title="${node.name}">${node.path}<br><small>${node.name}</small></td>`;
  });
  html += `</tr>`;
  
  // Add rows
  nodes.forEach(node1 => {
    html += `<tr><td class="matrix-row-header">${node1.path}<br><small>${node1.name}</small></td>`;
    
    nodes.forEach(node2 => {
      const data = matrix[node1.path][node2.path];
      const isDiagonal = node1.path === node2.path;
      const className = isDiagonal ? 'diagonal' : getSimilarityClass(data.similarity);
      const percentage = (data.similarity * 100).toFixed(1);
      
      html += `<td class="matrix-cell ${className}">
        <div class="cell-value">${isDiagonal ? '—' : percentage + '%'}</div>
        <div class="cell-commits">${data.commits1}×${data.commits2}</div>
        <div class="tooltip">
          <strong>${node1.path} × ${node2.path}</strong><br>
          Similarity: ${percentage}%<br>
          ${node1.name}: ${data.commits1} commits<br>
          ${node2.name}: ${data.commits2} commits
        </div>
      </td>`;
    });
    
    html += `</tr>`;
  });
  
  html += `</table></div>`;
  
  // Calculate statistics
  const allSimilarities = [];
  const strongCorrelations = [];
  const weakCorrelations = [];
  const isolatedNodes = new Set();
  
  nodes.forEach(node1 => {
    let hasStrongCorrelation = false;
    nodes.forEach(node2 => {
      if (node1.path !== node2.path) {
        const sim = matrix[node1.path][node2.path].similarity;
        allSimilarities.push(sim);
        
        if (sim > 0.7) {
          strongCorrelations.push({ node1: node1.path, node2: node2.path, similarity: sim });
          hasStrongCorrelation = true;
        } else if (sim < 0.2 && sim > 0) {
          weakCorrelations.push({ node1: node1.path, node2: node2.path, similarity: sim });
        }
      }
    });
    
    if (!hasStrongCorrelation && nodeCommits[node1.path].length > 0) {
      isolatedNodes.add(node1.path);
    }
  });
  
  const avgSimilarity = allSimilarities.reduce((a, b) => a + b, 0) / allSimilarities.length;
  const maxSimilarity = Math.max(...allSimilarities);
  const activeNodes = nodes.filter(n => nodeCommits[n.path].length > 0).length;
  
  // Add statistics
  html += `
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value" style="color: ${getColorForHTML(avgSimilarity)}">
                ${(avgSimilarity * 100).toFixed(1)}%
            </div>
            <div class="stat-label">Average Cross-Correlation</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: #00ff88">
                ${activeNodes}/${nodes.length}
            </div>
            <div class="stat-label">Active Nodes</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: #00aaff">
                ${strongCorrelations.length}
            </div>
            <div class="stat-label">Strong Correlations (>70%)</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: #ff6600">
                ${isolatedNodes.size}
            </div>
            <div class="stat-label">Isolated Nodes</div>
        </div>
    </div>`;
  
  // Add insights
  html += `
    <div class="insights">
        <h3>🔍 Key Insights</h3>`;
  
  if (strongCorrelations.length > 0) {
    html += `<div class="insight-item"><strong>Strong Correlations:</strong> `;
    strongCorrelations.slice(0, 3).forEach(corr => {
      html += `${corr.node1} ↔ ${corr.node2} (${(corr.similarity * 100).toFixed(1)}%) `;
    });
    html += `</div>`;
  }
  
  if (isolatedNodes.size > 0) {
    html += `<div class="insight-item"><strong>Isolated Development:</strong> ${Array.from(isolatedNodes).join(', ')} working in silos</div>`;
  }
  
  if (avgSimilarity < 0.3) {
    html += `<div class="insight-item"><strong>Low Cohesion:</strong> Components are diverging (${(avgSimilarity * 100).toFixed(1)}% average correlation)</div>`;
  } else if (avgSimilarity > 0.7) {
    html += `<div class="insight-item"><strong>High Cohesion:</strong> Strong alignment across components (${(avgSimilarity * 100).toFixed(1)}% average)</div>`;
  }
  
  html += `</div>`;
  
  // Add legend
  html += `
    <div class="legend">
        <div class="legend-item">
            <div class="legend-color similarity-high"></div>
            <span>80-100% Correlation</span>
        </div>
        <div class="legend-item">
            <div class="legend-color similarity-medium-high"></div>
            <span>60-79% Correlation</span>
        </div>
        <div class="legend-item">
            <div class="legend-color similarity-medium"></div>
            <span>40-59% Correlation</span>
        </div>
        <div class="legend-item">
            <div class="legend-color similarity-low"></div>
            <span>20-39% Correlation</span>
        </div>
        <div class="legend-item">
            <div class="legend-color similarity-critical"></div>
            <span>1-19% Correlation</span>
        </div>
        <div class="legend-item">
            <div class="legend-color similarity-none"></div>
            <span>No Correlation</span>
        </div>
    </div>`;
  
  html += `
</body>
</html>`;
  
  return html;
}

/**
 * Get similarity class for CSS
 */
function getSimilarityClass(similarity) {
  if (similarity === 0) return 'similarity-none';
  if (similarity >= 0.8) return 'similarity-high';
  if (similarity >= 0.6) return 'similarity-medium-high';
  if (similarity >= 0.4) return 'similarity-medium';
  if (similarity >= 0.2) return 'similarity-low';
  return 'similarity-critical';
}

/**
 * Get color for HTML
 */
function getColorForHTML(similarity) {
  if (similarity >= 0.8) return '#00ff88';
  if (similarity >= 0.6) return '#88ff00';
  if (similarity >= 0.4) return '#ffcc00';
  if (similarity >= 0.2) return '#ff6600';
  return '#ff3366';
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║  Trust Debt Symmetric Cosine Matrix   ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);
  
  // Generate symmetric matrix
  const data = generateSymmetricMatrix();
  
  if (data) {
    // Save to JSON
    const jsonPath = path.join(process.cwd(), 'trust-debt-symmetric-matrix.json');
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log(`\n${colors.green}✓ Matrix data saved to ${jsonPath}${colors.reset}`);
    
    // Generate and save HTML
    const html = generateSymmetricHTML(data);
    const htmlPath = path.join(process.cwd(), 'trust-debt-symmetric-matrix.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`${colors.green}✓ HTML visualization saved to ${htmlPath}${colors.reset}`);
    
    // Open HTML
    try {
      execSync(`open ${htmlPath}`);
      console.log(`${colors.green}✓ Opening visualization in browser${colors.reset}`);
    } catch (error) {
      console.log(`${colors.yellow}⚠ Could not auto-open HTML. Please open manually: ${htmlPath}${colors.reset}`);
    }
    
    // Display insights
    console.log(`\n${colors.bright}🔍 Matrix Insights:${colors.reset}`);
    
    // Find strong correlations
    const strongPairs = [];
    SHORTLEX_NODES.forEach((node1, i) => {
      SHORTLEX_NODES.forEach((node2, j) => {
        if (i < j) {
          const sim = data.matrix[node1.path][node2.path].similarity;
          if (sim > 0.7) {
            strongPairs.push({ node1: node1.path, node2: node2.path, sim });
          }
        }
      });
    });
    
    if (strongPairs.length > 0) {
      console.log(`\n  ${colors.green}Strong Correlations (>70%):${colors.reset}`);
      strongPairs.forEach(pair => {
        console.log(`    ${pair.node1} ↔ ${pair.node2}: ${(pair.sim * 100).toFixed(1)}%`);
      });
    }
    
    // Find isolated nodes
    const isolated = SHORTLEX_NODES.filter(node => {
      const commits = data.nodeCommits[node.path].length;
      if (commits === 0) return false;
      
      const hasCorrelation = SHORTLEX_NODES.some(other => {
        if (other.path === node.path) return false;
        return data.matrix[node.path][other.path].similarity > 0.5;
      });
      
      return !hasCorrelation;
    });
    
    if (isolated.length > 0) {
      console.log(`\n  ${colors.yellow}Isolated Nodes (no strong correlations):${colors.reset}`);
      isolated.forEach(node => {
        console.log(`    ${node.path} (${node.name})`);
      });
    }
  }
}

// Run the script
main();