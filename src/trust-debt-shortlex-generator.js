#!/usr/bin/env node

/**
 * Trust Debt ShortLex Generator
 * 
 * Generates properly sorted ShortLex axis using ShortRank algorithm:
 * 1. Parents before children (depth-first)
 * 2. Siblings sorted by weight (highest first)
 * 3. Block unity: parent followed by all its children
 */

const fs = require('fs');
const path = require('path');

class ShortLexGenerator {
  constructor() {
    this.projectRoot = process.cwd();
    this.categoriesFile = path.join(this.projectRoot, 'trust-debt-categories.json');
    this.settingsFile = path.join(this.projectRoot, 'trust-debt-settings.json');
  }

  /**
   * Load category hierarchy from JSON
   */
  loadCategories() {
    if (!fs.existsSync(this.categoriesFile)) {
      throw new Error('Categories file not found: ' + this.categoriesFile);
    }
    return JSON.parse(fs.readFileSync(this.categoriesFile, 'utf8'));
  }

  /**
   * Generate ShortRank ordered list from hierarchy
   * @param {Object} node - Current node in hierarchy
   * @param {Array} path - Path to current node
   * @param {number} parentWeight - Cumulative parent weight
   * @returns {Array} Flattened list in ShortRank order
   */
  generateShortRank(node, path = [], parentWeight = 100) {
    const items = [];
    
    // Calculate effective weight (parent weight × node weight / 100)
    const effectiveWeight = (parentWeight * node.weight) / 100;
    
    // Build the path string
    const pathStr = path.length === 0 ? 
      `${node.symbol}${node.emoji}` : 
      path.join('.') + `.${node.symbol}${node.emoji}`;
    
    // Add current node
    items.push({
      id: node.id,
      path: pathStr,
      symbol: node.symbol,
      emoji: node.emoji,
      title: node.title,
      description: node.description,
      type: node.type,
      depth: path.length,
      weight: node.weight,
      effectiveWeight: effectiveWeight,
      orthogonalTest: node.orthogonalTest || null
    });
    
    // Process children if they exist
    if (node.children && node.children.length > 0) {
      // Sort children by weight (highest first)
      const sortedChildren = [...node.children].sort((a, b) => b.weight - a.weight);
      
      // Add each child and its descendants (block unity)
      for (const child of sortedChildren) {
        const childPath = path.length === 0 ? 
          [`${node.symbol}${node.emoji}`] : 
          [...path, `${node.symbol}${node.emoji}`];
        
        const childItems = this.generateShortRank(child, childPath, effectiveWeight);
        items.push(...childItems);
      }
    }
    
    return items;
  }

  /**
   * Calculate alignment between ideal and real weights
   * @param {number} ideal - Ideal weight (0-1)
   * @param {number} real - Real weight (0-1)
   * @returns {Object} Alignment metrics
   */
  calculateAlignment(ideal, real) {
    const drift = Math.abs(ideal - real);
    const alignmentRatio = real / ideal;
    
    let status = 'critical';
    if (alignmentRatio > 0.8 && alignmentRatio < 1.2) {
      status = 'aligned';
    } else if (alignmentRatio > 0.5 && alignmentRatio < 1.5) {
      status = 'warning';
    }
    
    return {
      drift,
      alignmentRatio,
      status
    };
  }

  /**
   * Generate ShortLex axis data for visualization
   * @param {Object} idealWeights - Category weights from intent
   * @param {Object} realWeights - Category weights from commits
   */
  generateAxis(idealWeights, realWeights) {
    const categories = this.loadCategories();
    const shortRankItems = this.generateShortRank(categories.root);
    
    // Include all levels for complete hierarchy visualization
    const axisItems = shortRankItems; // Show full depth hierarchy
    
    // Map to axis format with alignment data
    const axis = axisItems.map(item => {
      const idealWeight = idealWeights[item.id] || (item.effectiveWeight / 100);
      const realWeight = realWeights[item.id] || 0;
      const alignment = this.calculateAlignment(idealWeight, realWeight);
      
      return {
        id: item.id,
        path: item.path,
        symbol: item.symbol,
        emoji: item.emoji,
        title: item.title,
        type: item.type,
        depth: item.depth,
        weight: item.weight,
        effectiveWeight: item.effectiveWeight,
        idealWeight: idealWeight,
        realWeight: realWeight,
        drift: alignment.drift,
        alignmentRatio: alignment.alignmentRatio,
        status: alignment.status,
        position: realWeight // Position on 1D axis
      };
    });
    
    return {
      items: axis,
      shortRankOrder: shortRankItems,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate HTML visualization of ShortLex axis
   */
  generateHTML(axisData) {
    const maxDepth = Math.max(...axisData.items.map(i => i.depth));
    
    let html = `
    <div class="shortlex-axis">
      <h3>ShortLex Weighted Hierarchy</h3>
      <p class="subtitle">Parent-weighted 1D axis showing category priorities (ShortRank ordering)</p>
      
      <div class="axis-container">
    `;
    
    // Group by depth for block unity display
    for (let depth = 0; depth <= maxDepth; depth++) {
      const depthItems = axisData.items.filter(i => i.depth === depth);
      
      if (depthItems.length === 0) continue;
      
      html += `<div class="depth-block depth-${depth}">`;
      
      for (const item of depthItems) {
        const barWidth = item.realWeight * 100;
        const idealMarker = item.idealWeight * 100;
        
        html += `
        <div class="axis-item ${item.status}">
          <div class="item-header">
            <span class="item-path">${item.path}</span>
            <span class="item-title">${item.title}</span>
          </div>
          
          <div class="weight-container">
            <div class="ideal-marker" style="left: ${idealMarker}%"></div>
            <div class="real-bar ${item.status}" style="width: ${barWidth}%">
              <span class="weight-label">${(item.realWeight * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          <div class="item-stats">
            <span class="stat ideal">Ideal: ${(item.idealWeight * 100).toFixed(0)}%</span>
            <span class="stat real">Real: ${(item.realWeight * 100).toFixed(0)}%</span>
            <span class="stat drift">Drift: ${(item.drift * 100).toFixed(0)}%</span>
          </div>
        </div>
        `;
      }
      
      html += `</div>`;
    }
    
    html += `
      </div>
      
      <div class="legend">
        <div class="legend-item">
          <span class="legend-color ideal"></span>
          <span>Ideal weight from documents</span>
        </div>
        <div class="legend-item">
          <span class="legend-color aligned"></span>
          <span>Aligned (>80%)</span>
        </div>
        <div class="legend-item">
          <span class="legend-color warning"></span>
          <span>Warning (50-80%)</span>
        </div>
        <div class="legend-item">
          <span class="legend-color critical"></span>
          <span>Critical (<50%)</span>
        </div>
      </div>
    </div>
    
    <style>
      .shortlex-axis {
        padding: 20px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 12px;
        margin: 20px 0;
      }
      
      .shortlex-axis h3 {
        color: #10b981;
        margin-bottom: 5px;
      }
      
      .shortlex-axis .subtitle {
        color: #94a3b8;
        font-size: 0.9rem;
        margin-bottom: 20px;
      }
      
      .depth-block {
        margin-bottom: 30px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
      }
      
      .depth-0 {
        border-left: 4px solid #10b981;
      }
      
      .depth-1 {
        border-left: 4px solid #8b5cf6;
        margin-left: 20px;
      }
      
      .axis-item {
        margin-bottom: 15px;
      }
      
      .item-header {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .item-path {
        font-family: monospace;
        font-size: 1.2rem;
        color: #f59e0b;
        margin-right: 15px;
        min-width: 80px;
      }
      
      .item-title {
        color: #e2e8f0;
        font-size: 0.95rem;
      }
      
      .weight-container {
        position: relative;
        height: 30px;
        background: rgba(148, 163, 184, 0.1);
        border-radius: 4px;
        margin-bottom: 5px;
      }
      
      .ideal-marker {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #8b5cf6;
        z-index: 2;
      }
      
      .real-bar {
        height: 100%;
        border-radius: 4px;
        display: flex;
        align-items: center;
        padding: 0 10px;
        transition: width 0.3s ease;
      }
      
      .real-bar.aligned {
        background: #10b981;
      }
      
      .real-bar.warning {
        background: #f59e0b;
      }
      
      .real-bar.critical {
        background: #ef4444;
      }
      
      .weight-label {
        color: white;
        font-weight: bold;
        font-size: 0.9rem;
      }
      
      .item-stats {
        display: flex;
        gap: 20px;
        font-size: 0.85rem;
      }
      
      .stat {
        color: #94a3b8;
      }
      
      .stat.ideal {
        color: #8b5cf6;
      }
      
      .stat.real {
        color: #10b981;
      }
      
      .stat.drift {
        color: #f59e0b;
      }
      
      .legend {
        display: flex;
        gap: 20px;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid rgba(148, 163, 184, 0.2);
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .legend-color {
        width: 20px;
        height: 12px;
        border-radius: 2px;
      }
      
      .legend-color.ideal {
        background: #8b5cf6;
        width: 2px;
        height: 12px;
      }
      
      .legend-color.aligned {
        background: #10b981;
      }
      
      .legend-color.warning {
        background: #f59e0b;
      }
      
      .legend-color.critical {
        background: #ef4444;
      }
    </style>
    `;
    
    return html;
  }
}

// Export for use in other scripts
module.exports = ShortLexGenerator;

// Run if called directly
if (require.main === module) {
  const generator = new ShortLexGenerator();
  
  // Test with sample weights
  const idealWeights = {
    'measurement': 0.40,
    'visualization': 0.35,
    'enforcement': 0.25
  };
  
  const realWeights = {
    'measurement': 0.15,
    'visualization': 0.45,
    'enforcement': 0.40
  };
  
  const axisData = generator.generateAxis(idealWeights, realWeights);
  console.log('ShortLex Axis Generated:');
  console.log(JSON.stringify(axisData, null, 2));
  
  // Generate HTML
  const html = generator.generateHTML(axisData);
  fs.writeFileSync('shortlex-test.html', `
    <!DOCTYPE html>
    <html>
    <head>
      <title>ShortLex Axis Test</title>
      <style>
        body { 
          background: #0f172a; 
          color: #e2e8f0; 
          font-family: system-ui, -apple-system, sans-serif;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `);
  
  console.log('\nHTML saved to shortlex-test.html');
}