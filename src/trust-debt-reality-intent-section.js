#!/usr/bin/env node

/**
 * Trust Debt Reality vs Intent Matrix Section Generator
 * Generates the Reality vs Intent matrix as a section for the main Trust Debt HTML report
 */

const fs = require('fs');
const path = require('path');

/**
 * Load the Reality vs Intent matrix data if it exists
 */
function loadRealityIntentData() {
  const matrixFile = path.join(process.cwd(), 'trust-debt-reality-intent-matrix.json');
  if (fs.existsSync(matrixFile)) {
    return JSON.parse(fs.readFileSync(matrixFile, 'utf8'));
  }
  
  // If not, try to generate it
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/trust-debt-reality-intent-matrix.js', { stdio: 'ignore' });
    
    if (fs.existsSync(matrixFile)) {
      return JSON.parse(fs.readFileSync(matrixFile, 'utf8'));
    }
  } catch (error) {
    console.error('Could not generate Reality vs Intent matrix:', error.message);
  }
  
  return null;
}

/**
 * Generate the Reality vs Intent matrix HTML section
 */
function generateRealityIntentSection(matrixData) {
  // Import the blind spot analyzer
  const { BlindSpotAnalyzer } = require('./trust-debt-blindspot-analyzer');
  
  if (!matrixData) {
    return `
    <div style="
      margin-top: 40px;
      padding: 30px;
      background: linear-gradient(135deg, rgba(255, 100, 0, 0.1) 0%, rgba(0, 100, 255, 0.1) 100%);
      border-radius: 15px;
      border: 1px solid rgba(255, 153, 0, 0.3);
    ">
      <h2 style="
        color: #ff9900;
        font-size: 1.8rem;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <span>🎯</span>
        <span>Reality vs Intent Matrix</span>
      </h2>
      <div style="color: #94a3b8; text-align: center; padding: 40px;">
        No matrix data available. Run <code>node scripts/trust-debt-reality-intent-matrix.js</code> to generate.
      </div>
    </div>`;
  }

  const { matrix, nodes, realityScores, intentScores, commitCount, docCount } = matrixData;
  
  // Build the matrix table with compact layout for fitting on one page
  let matrixHTML = `
    <div style="
      margin-top: 40px;
      padding: 20px;
      background: linear-gradient(135deg, rgba(255, 100, 0, 0.1) 0%, rgba(0, 100, 255, 0.1) 100%);
      border-radius: 15px;
      border: 1px solid rgba(255, 153, 0, 0.3);
    ">
      <h2 style="
        color: #ff9900;
        font-size: 1.8rem;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <span style="display: flex; align-items: center; gap: 10px;">
          <span>🎯</span>
          <span>Reality vs Intent Matrix</span>
        </span>
        <span style="font-size: 0.9rem; color: #94a3b8;">
          🔥 ${commitCount} commits × 📘 ${docCount} docs
        </span>
      </h2>
      
      <div style="color: #94a3b8; margin-bottom: 15px; display: flex; gap: 20px; font-size: 0.85rem;">
        <span>🔥 <strong style="color: #ff9900;">Rows</strong>: Git Reality</span>
        <span>📘 <strong style="color: #00aaff;">Columns</strong>: Doc Intent</span>
        <span>🟢 Diagonal: Self-alignment (should be green)</span>
      </div>
      
      <div style="overflow: auto; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 10px; max-height: 600px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 1px; font-size: 11px;">
          <thead style="position: sticky; top: 0; z-index: 10;">
            <tr>
              <th style="
                background: rgba(255,255,255,0.1);
                color: #fff;
                padding: 5px;
                text-align: center;
                font-size: 10px;
                position: sticky;
                left: 0;
                z-index: 11;
              ">R↓ / I→</th>`;
  
  // Add column headers (Intent) - with full names
  nodes.forEach(node => {
    const score = Math.round((intentScores[node.path] || 0) * 100);
    const depth = node.depth;
    const opacity = 1 - (depth * 0.15);
    matrixHTML += `
              <th style="
                background: rgba(0, 100, 255, ${0.2 * opacity});
                color: #00aaff;
                padding: 3px;
                text-align: center;
                font-size: 9px;
                writing-mode: vertical-rl;
                text-orientation: mixed;
                height: 120px;
                width: 40px;
                border: 1px solid rgba(0, 170, 255, 0.2);
                opacity: ${opacity};
              " title="${node.name} (Intent: ${score}%)">
                <div style="font-weight: bold;">${node.path}</div>
                <div style="font-size: 8px; margin-top: 2px;">${node.name}</div>
                <div style="font-size: 8px; color: #66ccff;">${score}%</div>
              </th>`;
  });
  
  matrixHTML += `
            </tr>
          </thead>
          <tbody>`;
  
  // Add rows (Reality) - more compact
  nodes.forEach(realityNode => {
    const realityScore = Math.round((realityScores[realityNode.path] || 0) * 100);
    const rDepth = realityNode.depth;
    const rOpacity = 1 - (rDepth * 0.15);
    
    matrixHTML += `
            <tr>
              <td style="
                background: rgba(255, 100, 0, ${0.2 * rOpacity});
                color: #ff9900;
                padding: 3px 5px;
                font-size: 9px;
                font-weight: 600;
                white-space: nowrap;
                position: sticky;
                left: 0;
                z-index: 5;
                border: 1px solid rgba(255, 153, 0, 0.2);
                opacity: ${rOpacity};
                min-width: 150px;
              " title="${realityNode.name} (Reality: ${realityScore}%)">
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span style="font-weight: bold;">${realityNode.path}</span>
                  <span style="font-size: 8px; color: #ffcc99;">${realityNode.name}</span>
                  <span style="font-size: 8px; margin-left: auto;">${realityScore}%</span>
                </div>
              </td>`;
    
    // Add cells (Reality × Intent)
    nodes.forEach(intentNode => {
      const cell = matrix[realityNode.path][intentNode.path];
      const similarity = Math.round(cell.similarity * 100);
      const isDiagonal = realityNode.path === intentNode.path;
      const color = getColorForCell(cell.similarity, isDiagonal);
      const bgColor = getBackgroundForCell(cell.similarity, isDiagonal);
      const cellOpacity = Math.min(rOpacity, 1 - (intentNode.depth * 0.15));
      
      matrixHTML += `
              <td style="
                background: ${bgColor};
                color: ${color};
                padding: 0;
                text-align: center;
                font-weight: bold;
                font-size: 10px;
                width: 35px;
                height: 25px;
                border: ${isDiagonal ? '2px solid #00ff88' : '1px solid rgba(255,255,255,0.1)'};
                cursor: pointer;
                position: relative;
                opacity: ${cellOpacity};
              " 
              title="R: ${realityNode.path} (${Math.round(cell.realityScore * 100)}%) × I: ${intentNode.path} (${Math.round(cell.intentScore * 100)}%) = ${similarity}% ${isDiagonal ? '[DIAGONAL]' : ''}"
              onmouseover="this.style.transform='scale(1.5)'; this.style.zIndex='100';"
              onmouseout="this.style.transform='scale(1)'; this.style.zIndex='1';">
                ${similarity}${similarity < 10 ? '' : '%'}
              </td>`;
    });
    
    matrixHTML += `
            </tr>`;
  });
  
  matrixHTML += `
          </tbody>
        </table>
      </div>`;
  
  // Add insights about blind spots
  const blindSpots = findBlindSpots(matrix, nodes);
  const strongAlignments = findStrongAlignments(matrix, nodes);
  
  matrixHTML += `
      <div style="
        margin-top: 20px;
        padding: 15px;
        background: rgba(0,0,0,0.3);
        border-radius: 10px;
        border-left: 3px solid #ff9900;
      ">
        <h3 style="color: #ff9900; margin-bottom: 10px; font-size: 1.1rem;">
          🔍 Asymmetric Blind Spots Detected
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">`;
  
  if (blindSpots.length > 0) {
    // Create a map of paths to names from nodes
    const nodeMap = new Map();
    nodes.forEach(node => {
      nodeMap.set(node.path, node.name);
    });
    
    matrixHTML += `
          <div>
            <strong style="color: #ff3366;">🚨 Critical Blind Spots:</strong>
            <div style="color: #94a3b8; margin-top: 5px; font-size: 0.85rem;">`;
    
    blindSpots.slice(0, 5).forEach(spot => {
      const realityName = nodeMap.get(spot.reality) || spot.reality;
      const intentName = nodeMap.get(spot.intent) || spot.intent;
      const percentage = Math.round(spot.similarity * 100);
      const realityLabel = `${spot.reality}: ${realityName}`;
      const intentLabel = `${spot.intent}: ${intentName}`;
      
      matrixHTML += `
              <div style="margin: 3px 0; padding: 3px; background: rgba(239, 68, 68, 0.1); border-radius: 4px;">
                <strong>${realityLabel}</strong>${spot.isDiagonal ? '' : ` × <strong>${intentLabel}</strong>`}: 
                <span style="color: #ff3366;">${percentage}%</span>
                ${spot.isDiagonal ? '<span style="color: #ffcc00;"> ⚠️ DIAGONAL!</span>' : ''}
              </div>`;
    });
    
    matrixHTML += `
            </div>
          </div>`;
  }
  
  if (strongAlignments.length > 0) {
    matrixHTML += `
          <div>
            <strong style="color: #00ff88;">✅ Strong Alignments:</strong>
            <div style="color: #94a3b8; margin-top: 5px; font-size: 0.85rem;">`;
    
    strongAlignments.slice(0, 5).forEach(align => {
      matrixHTML += `
              <div style="margin: 2px 0;">
                <strong>${align.realityLabel}</strong> × <strong>${align.intentLabel}</strong>: <span style="color: #00ff88;">${Math.round(align.similarity * 100)}%</span>
              </div>`;
    });
    
    matrixHTML += `
            </div>
          </div>`;
  }
  
  // Add diagonal analysis
  const diagonalHealth = analyzeDiagonal(matrix, nodes);
  matrixHTML += `
          <div>
            <strong style="color: #00aaff;">📊 Diagonal Health:</strong>
            <div style="color: #94a3b8; margin-top: 5px; font-size: 0.85rem;">
              Average self-alignment: <span style="color: ${getColorForCell(diagonalHealth.average, false)}">${Math.round(diagonalHealth.average * 100)}%</span><br>
              Worst: <strong>${diagonalHealth.worst.nodeLabel}</strong> (<span style="color: #ff3366;">${Math.round(diagonalHealth.worst.score * 100)}%</span>)<br>
              Best: <strong>${diagonalHealth.best.nodeLabel}</strong> (<span style="color: #00ff88;">${Math.round(diagonalHealth.best.score * 100)}%</span>)
            </div>
          </div>`;
  
  matrixHTML += `
        </div>
      </div>
    </div>`;
  
  // Add comprehensive blind spot analysis
  const analyzer = new BlindSpotAnalyzer();
  
  // Convert matrix to simple format for analyzer
  const simpleMatrix = {};
  nodes.forEach(realityNode => {
    nodes.forEach(intentNode => {
      const key = `${realityNode.path} × ${intentNode.path}`;
      simpleMatrix[key] = Math.round(matrix[realityNode.path][intentNode.path].similarity * 100);
    });
  });
  
  // Generate blind spot analysis section
  const blindSpotSection = analyzer.generateBlindSpotSection(simpleMatrix);
  
  // Add Reproducible Success Patterns
  let patternsSection = '';
  try {
    const { ReproduciblePatternsGenerator } = require('./trust-debt-reproducible-patterns');
    const patternsGenerator = new ReproduciblePatternsGenerator();
    patternsSection = patternsGenerator.generatePatternsSection();
  } catch (error) {
    console.error('Could not generate Reproducible Patterns:', error.message);
  }
  
  return matrixHTML + blindSpotSection + patternsSection;
}

/**
 * Find blind spots (low similarity cells)
 */
function findBlindSpots(matrix, nodes) {
  const spots = [];
  
  nodes.forEach(realityNode => {
    nodes.forEach(intentNode => {
      const cell = matrix[realityNode.path][intentNode.path];
      if (cell.similarity < 0.2) {
        spots.push({
          reality: realityNode.path,
          intent: intentNode.path,
          similarity: cell.similarity,
          isDiagonal: realityNode.path === intentNode.path
        });
      }
    });
  });
  
  return spots.sort((a, b) => {
    // Diagonal blind spots are more critical
    if (a.isDiagonal && !b.isDiagonal) return -1;
    if (!a.isDiagonal && b.isDiagonal) return 1;
    return a.similarity - b.similarity;
  });
}

/**
 * Get human-readable label for a node path
 */
function getNodeLabel(path, nodes) {
  const node = nodes.find(n => n.path === path);
  return node ? `${path}: ${node.name}` : path;
}

/**
 * Find strong alignments (high similarity cells)
 */
function findStrongAlignments(matrix, nodes) {
  const alignments = [];
  
  nodes.forEach(realityNode => {
    nodes.forEach(intentNode => {
      const cell = matrix[realityNode.path][intentNode.path];
      if (cell.similarity > 0.7 && realityNode.path !== intentNode.path) {
        alignments.push({
          reality: realityNode.path,
          realityLabel: getNodeLabel(realityNode.path, nodes),
          intent: intentNode.path,
          intentLabel: getNodeLabel(intentNode.path, nodes),
          similarity: cell.similarity
        });
      }
    });
  });
  
  return alignments.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Analyze diagonal health
 */
function analyzeDiagonal(matrix, nodes) {
  const diagonalScores = nodes.map(node => ({
    node: node.path,
    nodeLabel: getNodeLabel(node.path, nodes),
    score: matrix[node.path][node.path].similarity
  }));
  
  const average = diagonalScores.reduce((sum, d) => sum + d.score, 0) / diagonalScores.length;
  const worst = diagonalScores.reduce((min, d) => d.score < min.score ? d : min);
  const best = diagonalScores.reduce((max, d) => d.score > max.score ? d : max);
  
  return { average, worst, best };
}

/**
 * Get color for cell value
 */
function getColorForCell(similarity, isDiagonal) {
  if (isDiagonal && similarity < 0.5) return '#ff0000'; // Red for bad diagonal
  if (similarity >= 0.7) return '#000';
  if (similarity >= 0.5) return '#000';
  if (similarity >= 0.3) return '#fff';
  return '#fff';
}

/**
 * Get background color for cell value - more dramatic separation
 */
function getBackgroundForCell(similarity, isDiagonal) {
  // Make differences more dramatic
  if (similarity === 0) return '#000000'; // Black for zero
  if (similarity < 0.1) return '#330011'; // Very dark red
  if (similarity < 0.2) return '#660022'; // Dark red  
  if (similarity < 0.3) return '#ff0044'; // Bright red
  if (similarity < 0.4) return '#ff6600'; // Orange-red
  if (similarity < 0.5) return '#ffaa00'; // Orange
  if (similarity < 0.6) return '#ffdd00'; // Yellow
  if (similarity < 0.7) return '#aaff00'; // Yellow-green
  if (similarity < 0.8) return '#44ff00'; // Light green
  if (similarity < 0.9) return '#00ff44'; // Green
  return '#00ffaa'; // Bright green for 90-100%
}

// Export for use in other modules
module.exports = { 
  generateRealityIntentSection,
  loadRealityIntentData
};

// Test if run directly
if (require.main === module) {
  const matrixData = loadRealityIntentData();
  const section = generateRealityIntentSection(matrixData);
  
  const testHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Reality vs Intent Matrix Section Test</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f0f23;
            color: #e2e8f0;
            padding: 20px;
        }
    </style>
</head>
<body>
    ${section}
</body>
</html>`;
  
  fs.writeFileSync('trust-debt-reality-intent-section-test.html', testHTML);
  console.log('✅ Reality vs Intent section test HTML generated');
}