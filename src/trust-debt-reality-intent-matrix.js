#!/usr/bin/env node

/**
 * Trust Debt Reality vs Intent Matrix Generator
 * Creates an asymmetric matrix with:
 * - ROWS: Reality (git commits) mapped to ShortLex nodes
 * - COLUMNS: Intent (documentation) mapped to ShortLex nodes
 * Shows cosine similarity between what we're building vs what we promised
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

// Complete ShortLex hierarchy including ALL levels
const SHORTLEX_HIERARCHY = [
  // Root
  {
    path: 'O🎯',
    name: 'Trust Debt MVP',
    depth: 0,
    weight: 100,
    keywords: ['trust', 'debt', 'mvp', 'gap', 'intent', 'reality', 'alignment']
  },
  // Latent Factors (Depth 1)
  {
    path: 'O🎯.Α📏',
    name: 'Measurement',
    depth: 1,
    weight: 40,
    keywords: ['measure', 'analyze', 'semantic', 'drift', 'score', 'calculate', 'detect', 'track']
  },
  {
    path: 'O🎯.Β🎨',
    name: 'Visualization',
    depth: 1,
    weight: 35,
    keywords: ['visual', 'display', 'html', 'dashboard', 'report', 'chart', 'graph', 'ui']
  },
  {
    path: 'O🎯.Γ⚖️',
    name: 'Enforcement',
    depth: 1,
    weight: 25,
    keywords: ['enforce', 'block', 'hook', 'prevent', 'check', 'validate', 'commit', 'git']
  },
  // Categories (Depth 2)
  {
    path: 'O🎯.Α📏.D📊',
    name: 'Drift Detection',
    depth: 2,
    weight: 20,
    keywords: ['drift', 'divergence', 'gap', 'distance', 'semantic', 'detect']
  },
  {
    path: 'O🎯.Α📏.S🎯',
    name: 'Scoring Formula',
    depth: 2,
    weight: 20,
    keywords: ['score', 'formula', 'calculate', 'weight', 'factor', 'multiplier']
  },
  {
    path: 'O🎯.Β🎨.M🔲',
    name: 'Trade-off Matrix',
    depth: 2,
    weight: 21,
    keywords: ['matrix', 'trade', 'heatmap', 'grid', 'table', '2d', 'cosine']
  },
  {
    path: 'O🎯.Β🎨.A📈',
    name: 'ShortLex Axis',
    depth: 2,
    weight: 14,
    keywords: ['axis', 'shortlex', 'hierarchy', 'tree', 'node', 'level']
  },
  {
    path: 'O🎯.Γ⚖️.S🚫',
    name: 'Sticks',
    depth: 2,
    weight: 12.5,
    keywords: ['block', 'prevent', 'penalty', 'stick', 'stop', 'deny']
  },
  {
    path: 'O🎯.Γ⚖️.C🥕',
    name: 'Carrots',
    depth: 2,
    weight: 12.5,
    keywords: ['reward', 'boost', 'momentum', 'carrot', 'incentive', 'green']
  },
  // Actions (Depth 3) - Sample subset
  {
    path: 'O🎯.Α📏.D📊.S🔍',
    name: 'Semantic Analysis',
    depth: 3,
    weight: 12,
    keywords: ['semantic', 'analysis', 'nlp', 'embedding', 'vector']
  },
  {
    path: 'O🎯.Β🎨.M🔲.H🌡️',
    name: 'Heatmap View',
    depth: 3,
    weight: 10.5,
    keywords: ['heatmap', 'color', 'gradient', 'visualization']
  },
  {
    path: 'O🎯.Γ⚖️.S🚫.B⛔',
    name: 'Commit Blocking',
    depth: 3,
    weight: 8.8,
    keywords: ['block', 'commit', 'prevent', 'hook', 'git']
  },
  // Documentation Sources (treated as intent sources)
  {
    path: '📜Patent',
    name: 'Patent v16',
    depth: 0,
    weight: 25,
    keywords: ['claim', 'invention', 'method', 'system', 'embodiment', 'neuromorphic', 'fim'],
    docPath: 'docs/01-business/patents/v16 filed/FIM_Patent_v16_USPTO_FILING.txt'
  },
  {
    path: '💼Business',
    name: 'Business Plan',
    depth: 0,
    weight: 30,
    keywords: ['kpi', 'revenue', 'user', 'growth', 'market', 'strategy', 'oh moment'],
    docPath: 'docs/coherence-cycles/CANONICAL_BUSINESS_PLAN.md'
  },
  {
    path: '🎯MVP',
    name: 'MVP Spec',
    depth: 0,
    weight: 25,
    keywords: ['requirement', 'feature', 'implementation', 'priority', 'deliverable'],
    docPath: 'docs/03-product/MVP/commitMVP.txt'
  },
  {
    path: '📝CLAUDE',
    name: 'CLAUDE.md',
    depth: 0,
    weight: 20,
    keywords: ['pattern', 'rule', 'guideline', 'coherence', 'cascade', 'nudge'],
    docPath: 'CLAUDE.md'
  }
];

/**
 * Get recent git commits (Reality)
 */
function getRecentCommits() {
  try {
    const commits = execSync('git log --format="%H|%s" --since="7 days ago"', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const [hash, ...subjectParts] = line.split('|');
        return {
          hash: hash,
          message: subjectParts.join('|').toLowerCase()
        };
      });
    
    console.log(`${colors.cyan}📊 Reality: Found ${commits.length} commits from last week${colors.reset}`);
    return commits;
  } catch (error) {
    console.error('Error getting commits:', error);
    return [];
  }
}

/**
 * Load documentation content (Intent)
 */
function loadDocumentation() {
  const docs = {};
  
  SHORTLEX_HIERARCHY.forEach(node => {
    if (node.docPath) {
      const fullPath = path.join(process.cwd(), node.docPath);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();
          docs[node.path] = {
            content: content.substring(0, 50000), // Limit for performance
            exists: true
          };
          console.log(`${colors.green}✓${colors.reset} Intent: Loaded ${node.name}`);
        } catch (error) {
          docs[node.path] = { exists: false };
          console.log(`${colors.red}✗${colors.reset} Intent: Failed to load ${node.name}`);
        }
      }
    }
  });
  
  return docs;
}

/**
 * Calculate cosine similarity between text and keywords
 */
function calculateSimilarity(text, keywords) {
  if (!text || !keywords || keywords.length === 0) return 0;
  
  // Create term frequency vectors
  const vector = {};
  let totalMatches = 0;
  
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}`, 'gi');
    const matches = (text.match(regex) || []).length;
    if (matches > 0) {
      vector[keyword] = matches;
      totalMatches += matches;
    }
  });
  
  // Return normalized score (0-1)
  if (totalMatches === 0) return 0;
  
  // Calculate as percentage of keywords found, weighted by frequency
  const foundKeywords = Object.keys(vector).length;
  const keywordCoverage = foundKeywords / keywords.length;
  const frequencyBoost = Math.min(1, totalMatches / (keywords.length * 2));
  
  return keywordCoverage * 0.7 + frequencyBoost * 0.3;
}

/**
 * Map commits to ShortLex nodes (Reality)
 */
function mapCommitsToNodes(commits) {
  const realityScores = {};
  
  SHORTLEX_HIERARCHY.forEach(node => {
    realityScores[node.path] = 0;
    
    commits.forEach(commit => {
      const similarity = calculateSimilarity(commit.message, node.keywords);
      realityScores[node.path] += similarity;
    });
    
    // Normalize by number of commits
    if (commits.length > 0) {
      realityScores[node.path] = realityScores[node.path] / commits.length;
    }
  });
  
  return realityScores;
}

/**
 * Map documentation to ShortLex nodes (Intent)
 */
function mapDocsToNodes(docs) {
  const intentScores = {};
  
  SHORTLEX_HIERARCHY.forEach(node => {
    intentScores[node.path] = 0;
    
    // Check all documentation sources
    Object.entries(docs).forEach(([docPath, doc]) => {
      if (doc.exists) {
        const similarity = calculateSimilarity(doc.content, node.keywords);
        intentScores[node.path] += similarity;
      }
    });
    
    // Normalize by number of docs
    const docCount = Object.values(docs).filter(d => d.exists).length;
    if (docCount > 0) {
      intentScores[node.path] = intentScores[node.path] / docCount;
    }
  });
  
  return intentScores;
}

/**
 * Generate the Reality vs Intent matrix
 */
function generateMatrix() {
  console.log(`\n${colors.bright}🔄 Generating Reality vs Intent Matrix${colors.reset}\n`);
  
  // Get reality (commits)
  const commits = getRecentCommits();
  const realityScores = mapCommitsToNodes(commits);
  
  // Get intent (documentation)
  const docs = loadDocumentation();
  const intentScores = mapDocsToNodes(docs);
  
  // Normalize scores to 0-100 range for better visualization
  const maxReality = Math.max(...Object.values(realityScores));
  const maxIntent = Math.max(...Object.values(intentScores));
  
  Object.keys(realityScores).forEach(key => {
    realityScores[key] = maxReality > 0 ? (realityScores[key] / maxReality) : 0;
  });
  
  Object.keys(intentScores).forEach(key => {
    intentScores[key] = maxIntent > 0 ? (intentScores[key] / maxIntent) : 0;
  });
  
  // Create matrix data
  const matrix = {};
  
  SHORTLEX_HIERARCHY.forEach(realityNode => {
    matrix[realityNode.path] = {};
    
    SHORTLEX_HIERARCHY.forEach(intentNode => {
      // Calculate similarity between reality and intent for this node pair
      const realityScore = realityScores[realityNode.path] || 0;
      const intentScore = intentScores[intentNode.path] || 0;
      
      // Calculate alignment score
      // High when both are high or both are low (agreement)
      // Low when one is high and other is low (disagreement)
      const alignment = 1 - Math.abs(realityScore - intentScore);
      const strength = (realityScore + intentScore) / 2;
      const similarity = alignment * strength;
      
      matrix[realityNode.path][intentNode.path] = {
        similarity: similarity,
        realityScore: realityScore,
        intentScore: intentScore,
        gap: Math.abs(realityScore - intentScore),
        alignment: alignment,
        strength: strength
      };
    });
  });
  
  return {
    matrix: matrix,
    nodes: SHORTLEX_HIERARCHY,
    realityScores: realityScores,
    intentScores: intentScores,
    commitCount: commits.length,
    docCount: Object.values(docs).filter(d => d.exists).length
  };
}

/**
 * Generate HTML visualization
 */
function generateHTML(data) {
  const { matrix, nodes, realityScores, intentScores, commitCount, docCount } = data;
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt Reality vs Intent Matrix</title>
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
        
        .legend-header {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 10px;
            color: #00ff88;
        }
        
        .matrix-wrapper {
            background: rgba(255,255,255,0.03);
            border-radius: 15px;
            padding: 20px;
            overflow: auto;
            max-width: 100%;
        }
        
        .matrix-table {
            border-collapse: separate;
            border-spacing: 1px;
            background: rgba(0,0,0,0.5);
        }
        
        .matrix-cell {
            width: 50px;
            height: 50px;
            text-align: center;
            position: relative;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 11px;
            font-weight: bold;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .matrix-header-col {
            background: rgba(0,100,255,0.2);
            color: #00aaff;
            font-size: 10px;
            padding: 3px;
            writing-mode: vertical-rl;
            text-orientation: mixed;
            height: 120px;
            width: 50px;
            border: 1px solid rgba(0,170,255,0.3);
        }
        
        .matrix-header-row {
            background: rgba(255,100,0,0.2);
            color: #ff9900;
            font-size: 10px;
            padding: 5px;
            text-align: left;
            min-width: 120px;
            border: 1px solid rgba(255,153,0,0.3);
        }
        
        .matrix-cell:hover {
            transform: scale(1.2);
            box-shadow: 0 4px 20px rgba(0,255,136,0.5);
            z-index: 100;
            border: 2px solid #00ff88;
        }
        
        .high { background: #00ff88; color: #000; }
        .medium-high { background: #88ff00; color: #000; }
        .medium { background: #ffcc00; color: #000; }
        .low { background: #ff6600; color: #fff; }
        .critical { background: #ff0066; color: #fff; }
        .none { background: rgba(255,255,255,0.05); color: #444; }
        
        .tooltip {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.95);
            color: #fff;
            padding: 10px;
            border-radius: 5px;
            font-size: 11px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
            z-index: 1000;
            min-width: 250px;
            text-align: left;
        }
        
        .matrix-cell:hover .tooltip {
            opacity: 1;
        }
        
        .depth-0 { opacity: 1; }
        .depth-1 { opacity: 0.9; }
        .depth-2 { opacity: 0.8; }
        .depth-3 { opacity: 0.7; }
        
        .insights {
            margin-top: 30px;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
            border-left: 4px solid #00ff88;
        }
        
        .legend {
            margin-top: 20px;
            display: flex;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Reality vs Intent Matrix</h1>
        <div class="subtitle">Git Commits (Reality) × Documentation (Intent)</div>
        <div class="legend-header">
            <span>🔥 Reality: ${commitCount} commits (last 7 days)</span>
            <span>📘 Intent: ${docCount} documents analyzed</span>
        </div>
    </div>
    
    <div class="matrix-wrapper">
        <table class="matrix-table">
            <tr>
                <td style="background: rgba(255,255,255,0.1); font-size: 11px; padding: 10px; text-align: center;">
                    <strong>Git Commits (Reality)</strong> ↓<br>
                    <strong>Documentation (Intent)</strong> →
                </td>`;
  
  // Column headers (Intent)
  nodes.forEach(node => {
    const score = (intentScores[node.path] * 100).toFixed(0);
    html += `<td class="matrix-header-col depth-${node.depth}" title="${node.name} (Intent: ${score}%)">
      <strong>${node.title}</strong><br>
      <small>${node.path} - ${score}%</small>
    </td>`;
  });
  html += `</tr>`;
  
  // Rows (Reality)
  nodes.forEach(realityNode => {
    const realityScore = (realityScores[realityNode.path] * 100).toFixed(0);
    html += `<tr>
      <td class="matrix-header-row depth-${realityNode.depth}" title="${realityNode.name} (Reality: ${realityScore}%)">
        <strong>${realityNode.title}</strong><br>
        <small>${realityNode.path} - ${realityScore}%</small>
      </td>`;
    
    // Cells (Reality × Intent)
    nodes.forEach(intentNode => {
      const cell = matrix[realityNode.path][intentNode.path];
      const similarity = (cell.similarity * 100).toFixed(0);
      const className = getSimilarityClass(cell.similarity);
      const isDiagonal = realityNode.path === intentNode.path;
      
      html += `<td class="matrix-cell ${className} depth-${Math.min(realityNode.depth, intentNode.depth)}"
        style="${isDiagonal ? 'border: 2px solid #00ff88;' : ''}">
        ${similarity}%
        <div class="tooltip">
          <strong>Reality:</strong> ${realityNode.path} (${(cell.realityScore * 100).toFixed(1)}%)<br>
          <strong>Intent:</strong> ${intentNode.path} (${(cell.intentScore * 100).toFixed(1)}%)<br>
          <strong>Alignment:</strong> ${similarity}%<br>
          <strong>Gap:</strong> ${(cell.gap * 100).toFixed(1)}%<br>
          ${isDiagonal ? '<strong>⚡ Diagonal: Self-alignment</strong>' : ''}
        </div>
      </td>`;
    });
    
    html += `</tr>`;
  });
  
  html += `</table></div>`;
  
  // Calculate insights
  const diagonal = nodes.map(n => matrix[n.path][n.path]);
  const avgDiagonal = diagonal.reduce((sum, cell) => sum + cell.similarity, 0) / diagonal.length;
  
  const maxGap = Math.max(...nodes.map(n => matrix[n.path][n.path].gap));
  const maxGapNode = nodes.find(n => matrix[n.path][n.path].gap === maxGap);
  
  // Add insights
  html += `
    <div class="insights">
        <h3 style="color: #00ff88; margin-bottom: 15px;">🔍 Key Insights</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <div>
                <strong style="color: #00aaff;">Diagonal Alignment:</strong> ${(avgDiagonal * 100).toFixed(1)}%<br>
                <span style="color: #888; font-size: 0.9em;">How well reality matches intent for same categories</span>
            </div>
            <div>
                <strong style="color: #ff9900;">Biggest Gap:</strong> ${maxGapNode.path} (${(maxGap * 100).toFixed(1)}%)<br>
                <span style="color: #888; font-size: 0.9em;">Where promises most diverge from implementation</span>
            </div>
        </div>
    </div>`;
  
  // Add legend
  html += `
    <div class="legend">
        <div class="legend-item">
            <div class="legend-color high"></div>
            <span>80-100% Aligned</span>
        </div>
        <div class="legend-item">
            <div class="legend-color medium-high"></div>
            <span>60-79% Good</span>
        </div>
        <div class="legend-item">
            <div class="legend-color medium"></div>
            <span>40-59% Drifting</span>
        </div>
        <div class="legend-item">
            <div class="legend-color low"></div>
            <span>20-39% Diverging</span>
        </div>
        <div class="legend-item">
            <div class="legend-color critical"></div>
            <span>1-19% Critical</span>
        </div>
        <div class="legend-item">
            <div class="legend-color none"></div>
            <span>0% No Alignment</span>
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
  if (similarity === 0) return 'none';
  if (similarity >= 0.8) return 'high';
  if (similarity >= 0.6) return 'medium-high';
  if (similarity >= 0.4) return 'medium';
  if (similarity >= 0.2) return 'low';
  if (similarity > 0) return 'critical';
  return 'none';
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║    Reality vs Intent Matrix Generator   ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);
  
  // Generate matrix
  const data = generateMatrix();
  
  // Save JSON
  const jsonPath = path.join(process.cwd(), 'trust-debt-reality-intent-matrix.json');
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`\n${colors.green}✓ Matrix data saved to ${jsonPath}${colors.reset}`);
  
  // Generate and save HTML
  const html = generateHTML(data);
  const htmlPath = path.join(process.cwd(), 'trust-debt-reality-intent-matrix.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`${colors.green}✓ HTML visualization saved to ${htmlPath}${colors.reset}`);
  
  // Open HTML
  try {
    execSync(`open ${htmlPath}`);
    console.log(`${colors.green}✓ Opening visualization in browser${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}⚠ Could not auto-open HTML${colors.reset}`);
  }
  
  // Display summary
  console.log(`\n${colors.bright}📊 Matrix Summary:${colors.reset}`);
  console.log(`  Nodes analyzed: ${data.nodes.length}`);
  console.log(`  Reality sources: ${data.commitCount} commits`);
  console.log(`  Intent sources: ${data.docCount} documents`);
  
  // Find biggest misalignments
  const misalignments = [];
  data.nodes.forEach(node => {
    const gap = data.matrix[node.path][node.path].gap;
    if (gap > 0.3) {
      misalignments.push({ node: node.path, gap });
    }
  });
  
  if (misalignments.length > 0) {
    console.log(`\n${colors.yellow}⚠ Major Misalignments:${colors.reset}`);
    misalignments.sort((a, b) => b.gap - a.gap).slice(0, 5).forEach(m => {
      console.log(`  ${m.node}: ${(m.gap * 100).toFixed(1)}% gap`);
    });
  }
}

// Run the script
main();