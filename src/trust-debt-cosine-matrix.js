#!/usr/bin/env node

/**
 * Trust Debt Cosine Similarity Matrix Generator
 * Creates a 2D matrix with ShortLex nodes on both axes
 * Shows cosine similarity between git commits and documentation
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

// ShortLex hierarchy from Trust Debt analysis
const SHORTLEX_HIERARCHY = {
  'O🎯': {
    name: 'Trust Debt MVP',
    weight: 100,
    children: {
      'Α📏': {
        name: 'Measurement',
        weight: 40,
        keywords: ['measure', 'analyze', 'semantic', 'drift', 'score', 'calculate', 'detect', 'track'],
        children: {
          'D📊': { name: 'Drift Detection', weight: 50, keywords: ['drift', 'divergence', 'gap'] },
          'S🎯': { name: 'Scoring Formula', weight: 50, keywords: ['score', 'formula', 'calculate'] }
        }
      },
      'Β🎨': {
        name: 'Visualization',
        weight: 35,
        keywords: ['visual', 'display', 'show', 'html', 'dashboard', 'report', 'chart', 'graph'],
        children: {
          'M🔲': { name: 'Trade-off Matrix', weight: 60, keywords: ['matrix', 'trade-off', 'heatmap'] },
          'A📈': { name: 'ShortLex Axis', weight: 40, keywords: ['axis', 'shortlex', 'hierarchy'] }
        }
      },
      'Γ⚖️': {
        name: 'Enforcement',
        weight: 25,
        keywords: ['enforce', 'block', 'hook', 'prevent', 'check', 'require', 'validate'],
        children: {
          'S🚫': { name: 'Sticks', weight: 50, keywords: ['block', 'prevent', 'penalty'] },
          'C🥕': { name: 'Carrots', weight: 50, keywords: ['reward', 'boost', 'momentum'] }
        }
      }
    }
  }
};

// Documentation sources with their content patterns
const DOC_SOURCES = {
  'Patent': {
    path: 'docs/01-business/patents/v16 filed/FIM_Patent_v16_USPTO_FILING.txt',
    keywords: ['claim', 'invention', 'method', 'system', 'embodiment', 'neuromorphic', 'unity']
  },
  'Business': {
    path: 'docs/coherence-cycles/CANONICAL_BUSINESS_PLAN.md',
    keywords: ['kpi', 'revenue', 'user', 'growth', 'market', 'strategy', 'monetization']
  },
  'MVP Spec': {
    path: 'docs/03-product/MVP/commitMVP.txt',
    keywords: ['requirement', 'feature', 'implementation', 'mvp', 'priority', 'deliverable']
  },
  'CLAUDE.md': {
    path: 'CLAUDE.md',
    keywords: ['pattern', 'rule', 'guideline', 'coherence', 'cascade', 'nudge', 'unrobocall']
  }
};

/**
 * Get git commits from the last week
 */
function getRecentCommits() {
  try {
    const commits = execSync('git log --oneline --since="7 days ago"', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const [hash, ...messageParts] = line.split(' ');
        return {
          hash: hash,
          message: messageParts.join(' ').toLowerCase()
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
 * Load and extract keywords from documentation
 */
function loadDocumentation() {
  const docs = {};
  
  for (const [name, config] of Object.entries(DOC_SOURCES)) {
    const filePath = path.join(process.cwd(), config.path);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
        docs[name] = {
          ...config,
          content: content.substring(0, 10000), // Limit content for performance
          exists: true
        };
        console.log(`${colors.green}✓${colors.reset} Loaded ${name}`);
      } catch (error) {
        docs[name] = { ...config, exists: false, error: error.message };
        console.log(`${colors.red}✗${colors.reset} Failed to load ${name}`);
      }
    } else {
      docs[name] = { ...config, exists: false };
      console.log(`${colors.yellow}⚠${colors.reset} ${name} not found at ${config.path}`);
    }
  }
  
  return docs;
}

/**
 * Simple cosine similarity between two keyword sets
 */
function cosineSimilarity(text1, keywords1, text2, keywords2) {
  // Create frequency vectors
  const allKeywords = [...new Set([...keywords1, ...keywords2])];
  
  const vector1 = allKeywords.map(keyword => 
    (text1.match(new RegExp(keyword, 'g')) || []).length
  );
  
  const vector2 = allKeywords.map(keyword => 
    (text2.match(new RegExp(keyword, 'g')) || []).length
  );
  
  // Calculate cosine similarity
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Calculate similarity between commits and a ShortLex node
 */
function calculateNodeSimilarity(commits, node, nodeKeywords) {
  const commitText = commits.map(c => c.message).join(' ');
  const similarities = {};
  
  // Calculate similarity with each documentation source
  const docs = loadDocumentation();
  for (const [docName, doc] of Object.entries(docs)) {
    if (doc.exists && doc.content) {
      similarities[docName] = cosineSimilarity(
        commitText,
        nodeKeywords,
        doc.content,
        doc.keywords
      );
    } else {
      similarities[docName] = 0;
    }
  }
  
  // Average similarity across all docs
  const values = Object.values(similarities);
  const avgSimilarity = values.length > 0 
    ? values.reduce((a, b) => a + b, 0) / values.length 
    : 0;
  
  return {
    average: avgSimilarity,
    byDoc: similarities
  };
}

/**
 * Flatten ShortLex hierarchy into list of nodes
 */
function flattenHierarchy(obj, prefix = '', parentKeywords = []) {
  const nodes = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const keywords = [...parentKeywords, ...(value.keywords || [])];
    
    nodes.push({
      path: fullPath,
      name: value.name,
      weight: value.weight,
      keywords: keywords
    });
    
    if (value.children) {
      nodes.push(...flattenHierarchy(value.children, fullPath, keywords));
    }
  }
  
  return nodes;
}

/**
 * Generate the similarity matrix
 */
function generateMatrix() {
  console.log(`\n${colors.bright}🔄 Generating Trust Debt Cosine Similarity Matrix${colors.reset}\n`);
  
  // Get recent commits
  const commits = getRecentCommits();
  if (commits.length === 0) {
    console.error('No commits found in the last week');
    return null;
  }
  
  // Flatten hierarchy
  const nodes = flattenHierarchy(SHORTLEX_HIERARCHY);
  console.log(`\n${colors.cyan}📋 Processing ${nodes.length} ShortLex nodes${colors.reset}\n`);
  
  // Calculate similarities
  const matrix = {};
  
  for (const node of nodes) {
    console.log(`\nProcessing ${colors.magenta}${node.path}${colors.reset} (${node.name})`);
    const similarity = calculateNodeSimilarity(commits, node, node.keywords);
    matrix[node.path] = {
      ...node,
      similarity: similarity
    };
    
    // Display results
    console.log(`  Average similarity: ${getColorForSimilarity(similarity.average)}${(similarity.average * 100).toFixed(1)}%${colors.reset}`);
    for (const [doc, sim] of Object.entries(similarity.byDoc)) {
      console.log(`    ${doc}: ${getColorForSimilarity(sim)}${(sim * 100).toFixed(1)}%${colors.reset}`);
    }
  }
  
  return matrix;
}

/**
 * Get color based on similarity score
 */
function getColorForSimilarity(similarity) {
  if (similarity >= 0.8) return colors.green;
  if (similarity >= 0.6) return colors.green;
  if (similarity >= 0.4) return colors.yellow;
  if (similarity >= 0.2) return colors.yellow;
  return colors.red;
}

/**
 * Generate HTML visualization
 */
function generateHTML(matrix) {
  const nodes = Object.values(matrix);
  const docs = Object.keys(DOC_SOURCES);
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt Cosine Similarity Matrix</title>
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
        }
        
        .matrix-container {
            background: rgba(255,255,255,0.03);
            border-radius: 15px;
            padding: 20px;
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 2px;
        }
        
        th, td {
            padding: 12px;
            text-align: center;
            position: relative;
            transition: all 0.3s ease;
        }
        
        th {
            background: rgba(255,255,255,0.1);
            font-weight: 600;
            color: #00ff88;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        .row-header {
            text-align: left;
            background: rgba(255,255,255,0.05);
            font-weight: 500;
            white-space: nowrap;
            position: sticky;
            left: 0;
            z-index: 5;
        }
        
        .cell {
            cursor: pointer;
            border-radius: 5px;
            font-weight: bold;
            position: relative;
            min-width: 80px;
        }
        
        .cell:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 20px rgba(0,255,136,0.3);
            z-index: 20;
        }
        
        .cell.high { background: linear-gradient(135deg, #00ff88, #00cc66); color: #000; }
        .cell.medium-high { background: linear-gradient(135deg, #88ff00, #66cc00); color: #000; }
        .cell.medium { background: linear-gradient(135deg, #ffcc00, #ff9900); color: #000; }
        .cell.low { background: linear-gradient(135deg, #ff6600, #ff3300); color: #fff; }
        .cell.critical { background: linear-gradient(135deg, #ff0066, #cc0033); color: #fff; }
        
        .tooltip {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: #fff;
            padding: 8px 12px;
            border-radius: 5px;
            font-size: 12px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
            z-index: 100;
        }
        
        .cell:hover .tooltip {
            opacity: 1;
        }
        
        .legend {
            margin-top: 30px;
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .legend-color {
            width: 30px;
            height: 20px;
            border-radius: 3px;
        }
        
        .stats {
            margin-top: 30px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .stat-card {
            background: rgba(255,255,255,0.05);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #888;
            font-size: 0.9em;
        }
        
        .timestamp {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Trust Debt Cosine Similarity Matrix</h1>
        <div class="subtitle">Git Commits (Last 7 Days) × Documentation Sources</div>
    </div>
    
    <div class="matrix-container">
        <table>
            <thead>
                <tr>
                    <th>ShortLex Node</th>`;
  
  // Add column headers for each doc source
  for (const doc of docs) {
    html += `<th>${doc}</th>`;
  }
  html += `<th>Average</th></tr></thead><tbody>`;
  
  // Add rows for each node
  for (const node of nodes) {
    html += `<tr><td class="row-header" title="${node.path}">${node.path}<br><small>${node.name}</small></td>`;
    
    // Add cells for each doc
    for (const doc of docs) {
      const similarity = node.similarity.byDoc[doc] || 0;
      const className = getSimilarityClass(similarity);
      const percentage = (similarity * 100).toFixed(1);
      
      html += `<td class="cell ${className}">
        ${percentage}%
        <div class="tooltip">${node.name} × ${doc}: ${percentage}%</div>
      </td>`;
    }
    
    // Add average cell
    const avgSimilarity = node.similarity.average;
    const avgClassName = getSimilarityClass(avgSimilarity);
    const avgPercentage = (avgSimilarity * 100).toFixed(1);
    
    html += `<td class="cell ${avgClassName}" style="border: 2px solid rgba(255,255,255,0.3);">
      <strong>${avgPercentage}%</strong>
      <div class="tooltip">Average: ${avgPercentage}%</div>
    </td></tr>`;
  }
  
  html += `</tbody></table></div>`;
  
  // Add legend
  html += `
    <div class="legend">
        <div class="legend-item">
            <div class="legend-color cell high"></div>
            <span>80-100% Aligned</span>
        </div>
        <div class="legend-item">
            <div class="legend-color cell medium-high"></div>
            <span>60-79% Good</span>
        </div>
        <div class="legend-item">
            <div class="legend-color cell medium"></div>
            <span>40-59% Drifting</span>
        </div>
        <div class="legend-item">
            <div class="legend-color cell low"></div>
            <span>20-39% Diverging</span>
        </div>
        <div class="legend-item">
            <div class="legend-color cell critical"></div>
            <span>0-19% Critical</span>
        </div>
    </div>`;
  
  // Calculate statistics
  const allSimilarities = nodes.map(n => n.similarity.average);
  const avgOverall = allSimilarities.reduce((a, b) => a + b, 0) / allSimilarities.length;
  const maxSim = Math.max(...allSimilarities);
  const minSim = Math.min(...allSimilarities);
  const criticalCount = allSimilarities.filter(s => s < 0.2).length;
  const alignedCount = allSimilarities.filter(s => s >= 0.8).length;
  
  html += `
    <div class="stats">
        <div class="stat-card">
            <div class="stat-value" style="color: ${getColorForSimilarityHTML(avgOverall)}">
                ${(avgOverall * 100).toFixed(1)}%
            </div>
            <div class="stat-label">Overall Alignment</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: #00ff88">
                ${alignedCount}/${nodes.length}
            </div>
            <div class="stat-label">Aligned Nodes</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: #ff3366">
                ${criticalCount}
            </div>
            <div class="stat-label">Critical Nodes</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: #ffcc00">
                ${((maxSim - minSim) * 100).toFixed(1)}%
            </div>
            <div class="stat-label">Alignment Range</div>
        </div>
    </div>`;
  
  html += `
    <div class="timestamp">
        Generated: ${new Date().toISOString()}<br>
        Based on ${Object.values(matrix)[0]?.commits?.length || 0} commits from last 7 days
    </div>
</body>
</html>`;
  
  return html;
}

/**
 * Get CSS class based on similarity
 */
function getSimilarityClass(similarity) {
  if (similarity >= 0.8) return 'high';
  if (similarity >= 0.6) return 'medium-high';
  if (similarity >= 0.4) return 'medium';
  if (similarity >= 0.2) return 'low';
  return 'critical';
}

/**
 * Get HTML color for similarity
 */
function getColorForSimilarityHTML(similarity) {
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
  console.log(`${colors.bright}${colors.cyan}║  Trust Debt Cosine Similarity Matrix  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);
  
  // Generate matrix
  const matrix = generateMatrix();
  
  if (matrix) {
    // Save to JSON
    const jsonPath = path.join(process.cwd(), 'trust-debt-cosine-matrix.json');
    fs.writeFileSync(jsonPath, JSON.stringify(matrix, null, 2));
    console.log(`\n${colors.green}✓ Matrix saved to ${jsonPath}${colors.reset}`);
    
    // Generate and save HTML
    const html = generateHTML(matrix);
    const htmlPath = path.join(process.cwd(), 'trust-debt-cosine-matrix.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`${colors.green}✓ HTML visualization saved to ${htmlPath}${colors.reset}`);
    
    // Open HTML
    try {
      execSync(`open ${htmlPath}`);
      console.log(`${colors.green}✓ Opening visualization in browser${colors.reset}`);
    } catch (error) {
      console.log(`${colors.yellow}⚠ Could not auto-open HTML. Please open manually: ${htmlPath}${colors.reset}`);
    }
    
    // Display summary
    console.log(`\n${colors.bright}📊 Summary:${colors.reset}`);
    const nodes = Object.values(matrix);
    const avgSimilarity = nodes.reduce((sum, n) => sum + n.similarity.average, 0) / nodes.length;
    
    console.log(`  Overall alignment: ${getColorForSimilarity(avgSimilarity)}${(avgSimilarity * 100).toFixed(1)}%${colors.reset}`);
    console.log(`  Nodes analyzed: ${nodes.length}`);
    console.log(`  Critical nodes: ${nodes.filter(n => n.similarity.average < 0.2).length}`);
    console.log(`  Aligned nodes: ${nodes.filter(n => n.similarity.average >= 0.8).length}`);
  }
}

// Run the script
main();