#!/usr/bin/env node

/**
 * AGENT 3 DOMAIN: TRUST DEBT REALITY VS INTENT MATRIX GENERATOR
 * =============================================================
 * Creates the core asymmetric matrix that measures Trust Debt through
 * Reality-Intent alignment using semantic categories.
 * 
 * AGENT 3 CRITICAL RESPONSIBILITIES:
 * - Ensure matrix populated with real presence data (no 0-unit subcategories)
 * - Use semantic categories to prevent syntax noise regression
 * - Maintain ShortLex ordering for consistent matrix display
 * 
 * ASYMMETRIC MATRIX STRUCTURE:
 * - ROWS: Reality data (git commit activity) mapped to semantic categories
 * - COLUMNS: Intent data (documentation content) mapped to semantic categories
 * - INTERSECTION: Cosine similarity showing alignment between promises and delivery
 * 
 * SEMANTIC CATEGORY MAPPING:
 * - A📊 Measurement: Trust Debt calculation, metrics, analysis
 * - B💻 Implementation: Code development, technical infrastructure
 * - C📋 Documentation: Specifications, business planning
 * - D🎨 Visualization: HTML reports, charts, visual presentation
 * - E⚙️ Technical: Configuration, system operations
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

// Configuration
const CONFIG = {
  cacheFile: '.intentguard-cache.json',
  cacheMaxAge: 3600000, // 1 hour in milliseconds
  defaultTimeWindow: '7 days ago',
  documentSizeLimit: 50000
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
 * Load commits from cache if available and fresh
 */
function loadCachedCommits(timeWindow) {
  const cacheFile = path.join(process.cwd(), CONFIG.cacheFile);

  if (fs.existsSync(cacheFile)) {
    try {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const age = Date.now() - cache.timestamp;

      if (age < CONFIG.cacheMaxAge && cache.timeWindow === timeWindow) {
        console.log(`${colors.green}✓ Using cached commits (${Math.floor(age / 1000)}s old)${colors.reset}`);
        return cache.commits;
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠ Cache read failed, fetching fresh data${colors.reset}`);
    }
  }

  return null;
}

/**
 * Save commits to cache
 */
function saveCachedCommits(commits, timeWindow) {
  const cacheFile = path.join(process.cwd(), CONFIG.cacheFile);
  const cache = {
    timestamp: Date.now(),
    timeWindow: timeWindow,
    commits: commits
  };

  try {
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
    console.log(`${colors.green}✓ Cached ${commits.length} commits for future runs${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}⚠ Cache save failed${colors.reset}`);
  }
}

/**
 * Get recent git commits (Reality)
 * @param {string} timeWindow - Git time specification (e.g., "7 days ago", "30 days ago")
 * @param {boolean} useCache - Whether to use cached data
 */
function getRecentCommits(timeWindow = CONFIG.defaultTimeWindow, useCache = true) {
  // Try cache first
  if (useCache) {
    const cached = loadCachedCommits(timeWindow);
    if (cached) return cached;
  }

  try {
    const commits = execSync(`git log --format="%H|%s" --since="${timeWindow}"`, { encoding: 'utf8' })
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

    console.log(`${colors.cyan}📊 Reality: Found ${commits.length} commits since ${timeWindow}${colors.reset}`);

    // Save to cache
    if (useCache) {
      saveCachedCommits(commits, timeWindow);
    }

    return commits;
  } catch (error) {
    console.error(`${colors.red}Error getting commits:${colors.reset}`, error);
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
          const truncated = content.substring(0, CONFIG.documentSizeLimit);
          docs[node.path] = {
            content: truncated,
            exists: true,
            originalSize: content.length,
            truncated: content.length > CONFIG.documentSizeLimit
          };
          console.log(`${colors.green}✓${colors.reset} Intent: Loaded ${node.name}${docs[node.path].truncated ? ` (truncated at ${CONFIG.documentSizeLimit} chars)` : ''}`);
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
 * @param {Object} options - Configuration options
 */
function generateMatrix(options = {}) {
  console.log(`\n${colors.bright}🔄 Generating Reality vs Intent Matrix${colors.reset}\n`);

  // Get reality (commits)
  const commits = getRecentCommits(
    options.timeWindow || CONFIG.defaultTimeWindow,
    !options.noCache
  );
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
 * Validation: Check diagonal coherence
 * Diagonal cells should show high self-consistency (reality matches intent for same category)
 */
function checkDiagonalCoherence(matrix, nodes) {
  const diagonalScores = [];
  nodes.forEach(node => {
    diagonalScores.push(matrix[node.path][node.path].similarity);
  });

  const avgDiagonal = diagonalScores.reduce((a, b) => a + b, 0) / diagonalScores.length;
  const threshold = 0.7;

  return {
    passed: avgDiagonal > threshold,
    avgScore: avgDiagonal,
    threshold: threshold,
    message: avgDiagonal > threshold
      ? `${colors.green}✓ Healthy self-consistency${colors.reset}`
      : `${colors.yellow}⚠ Warning: Categories lack internal coherence${colors.reset}`
  };
}

/**
 * Validation: Detect unexpected zeros in matrix
 * Too many zero-similarity cells suggests categories aren't being measured properly
 */
function detectUnexpectedZeros(matrix, nodes) {
  const zeros = [];

  nodes.forEach((rowNode, i) => {
    nodes.forEach((colNode, j) => {
      const cell = matrix[rowNode.path][colNode.path];
      if (cell.similarity === 0 && i !== j) {
        zeros.push({
          row: rowNode.path,
          col: colNode.path,
          warning: "No keyword overlap detected"
        });
      }
    });
  });

  const totalCells = nodes.length * nodes.length;
  const zeroThreshold = totalCells * 0.1; // Less than 10% zeros

  return {
    passed: zeros.length < zeroThreshold,
    zeroCount: zeros.length,
    totalCells: totalCells,
    percentage: (zeros.length / totalCells * 100).toFixed(1),
    threshold: '10%',
    details: zeros.slice(0, 5), // Show first 5 only
    message: zeros.length < zeroThreshold
      ? `${colors.green}✓ Acceptable zero count (${zeros.length}/${totalCells})${colors.reset}`
      : `${colors.yellow}⚠ Too many zeros: ${zeros.length}/${totalCells} (${(zeros.length / totalCells * 100).toFixed(1)}%)${colors.reset}`
  };
}

/**
 * Validation: Check asymmetry ratio
 * Upper triangle (reality emphasis) vs lower triangle (intent emphasis)
 */
function validateAsymmetryRatio(matrix, nodes) {
  let upperSum = 0;
  let lowerSum = 0;

  nodes.forEach((rowNode, i) => {
    nodes.forEach((colNode, j) => {
      const cell = matrix[rowNode.path][colNode.path];
      if (i < j) upperSum += cell.realityScore;
      if (i > j) lowerSum += cell.intentScore;
    });
  });

  const ratio = lowerSum > 0 ? upperSum / lowerSum : 0;
  const healthyMin = 1.2;
  const healthyMax = 2.0;

  let interpretation;
  if (ratio < 1.0) {
    interpretation = "Over-documenting (more documentation than implementation)";
  } else if (ratio >= healthyMin && ratio <= healthyMax) {
    interpretation = "Balanced development";
  } else if (ratio > healthyMax) {
    interpretation = "Under-documenting (building without documentation)";
  } else {
    interpretation = "Slightly under-documented";
  }

  return {
    passed: ratio >= healthyMin && ratio <= healthyMax,
    ratio: ratio,
    healthyRange: `${healthyMin}-${healthyMax}`,
    interpretation: interpretation,
    message: ratio >= healthyMin && ratio <= healthyMax
      ? `${colors.green}✓ ${interpretation}${colors.reset}`
      : `${colors.yellow}⚠ ${interpretation}${colors.reset}`
  };
}

/**
 * Run all validation checks
 */
function runValidations(matrix, nodes) {
  console.log(`\n${colors.bright}${colors.cyan}🔍 Running Matrix Validations${colors.reset}\n`);

  const diagonal = checkDiagonalCoherence(matrix, nodes);
  const zeros = detectUnexpectedZeros(matrix, nodes);
  const asymmetry = validateAsymmetryRatio(matrix, nodes);

  console.log(`1. Diagonal Coherence: ${diagonal.message}`);
  console.log(`   Average: ${(diagonal.avgScore * 100).toFixed(1)}% (threshold: ${(diagonal.threshold * 100).toFixed(0)}%)`);

  console.log(`\n2. Zero Detection: ${zeros.message}`);
  if (zeros.details.length > 0) {
    console.log(`   Examples:`);
    zeros.details.forEach(z => {
      console.log(`     ${z.row} × ${z.col}`);
    });
  }

  console.log(`\n3. Asymmetry Ratio: ${asymmetry.message}`);
  console.log(`   Ratio: ${asymmetry.ratio.toFixed(2)} (healthy: ${asymmetry.healthyRange})`);
  console.log(`   ${asymmetry.interpretation}`);

  const allPassed = diagonal.passed && zeros.passed && asymmetry.passed;
  console.log(`\n${allPassed ? colors.green : colors.yellow}Overall: ${allPassed ? 'All validations passed ✓' : 'Some validations failed ⚠'}${colors.reset}\n`);

  return {
    diagonal,
    zeros,
    asymmetry,
    allPassed
  };
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
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    timeWindow: CONFIG.defaultTimeWindow,
    noCache: false,
    skipValidation: false,
    diagnostics: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--since' && i + 1 < args.length) {
      options.timeWindow = args[++i];
    } else if (arg === '--no-cache') {
      options.noCache = true;
    } else if (arg === '--skip-validation') {
      options.skipValidation = true;
    } else if (arg === '--diagnostics' || arg === '-d') {
      options.diagnostics = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
${colors.bright}Trust Debt Reality vs Intent Matrix Generator${colors.reset}

Usage: node src/trust-debt-reality-intent-matrix.js [options]

Options:
  --since <time>     Time window for git commits (default: "7 days ago")
                     Examples: "30 days ago", "2025-01-01"
  --no-cache         Disable commit caching
  --skip-validation  Skip matrix validation checks
  --diagnostics, -d  Enable detailed diagnostic output
  --help, -h         Show this help message

Examples:
  node src/trust-debt-reality-intent-matrix.js --since "30 days ago"
  node src/trust-debt-reality-intent-matrix.js --since "2025-01-01" --no-cache
  node src/trust-debt-reality-intent-matrix.js --diagnostics
      `);
      process.exit(0);
    }
  }

  return options;
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║    Reality vs Intent Matrix Generator   ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

  // Parse command-line options
  const options = parseArgs();

  if (options.diagnostics) {
    console.log(`${colors.cyan}🔍 Diagnostics Mode Enabled${colors.reset}`);
    console.log(`  Time Window: ${options.timeWindow}`);
    console.log(`  Cache: ${options.noCache ? 'Disabled' : 'Enabled'}`);
    console.log(`  Validation: ${options.skipValidation ? 'Skipped' : 'Enabled'}\n`);
  }

  // Generate matrix with options
  const data = generateMatrix(options);

  // Run validations
  if (!options.skipValidation) {
    const validations = runValidations(data.matrix, data.nodes);

    // Add validations to data for JSON export
    data.validations = validations;
  }

  // Save JSON
  const jsonPath = path.join(process.cwd(), 'trust-debt-reality-intent-matrix.json');
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`${colors.green}✓ Matrix data saved to ${jsonPath}${colors.reset}`);

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

  // Diagnostics output
  if (options.diagnostics) {
    console.log(`\n${colors.bright}${colors.cyan}🔍 Diagnostic Information${colors.reset}`);

    // Show keyword match statistics
    console.log(`\n${colors.bright}Keyword Coverage by Node:${colors.reset}`);
    data.nodes.slice(0, 5).forEach(node => {
      const realityScore = data.realityScores[node.path];
      const intentScore = data.intentScores[node.path];
      console.log(`  ${node.path}:`);
      console.log(`    Reality: ${(realityScore * 100).toFixed(1)}%`);
      console.log(`    Intent: ${(intentScore * 100).toFixed(1)}%`);
      console.log(`    Keywords: ${node.keywords.join(', ')}`);
    });
  }
}

// Run the script
main();