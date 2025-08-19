#!/usr/bin/env node

/**
 * Trust Debt Symmetric Matrix Section Generator
 * Generates the symmetric cosine similarity matrix as a section for the main Trust Debt HTML report
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Load the symmetric matrix data if it exists
 */
function loadMatrixData() {
  const matrixFile = path.join(process.cwd(), 'trust-debt-symmetric-matrix.json');
  if (fs.existsSync(matrixFile)) {
    return JSON.parse(fs.readFileSync(matrixFile, 'utf8'));
  }
  return null;
}

/**
 * Generate the symmetric matrix HTML section
 */
function generateSymmetricMatrixSection(matrixData) {
  if (!matrixData) {
    // Generate placeholder if no data
    return `
    <div style="
      margin-top: 40px;
      padding: 30px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
      border-radius: 15px;
      border: 1px solid rgba(16, 185, 129, 0.3);
    ">
      <h2 style="
        color: #10b981;
        font-size: 1.8rem;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <span>📊</span>
        <span>ShortLex Symmetric Correlation Matrix</span>
      </h2>
      <div style="color: #94a3b8; text-align: center; padding: 40px;">
        No matrix data available. Run <code>node scripts/trust-debt-symmetric-matrix.js</code> to generate.
      </div>
    </div>`;
  }

  const { matrix, nodes, totalCommits } = matrixData;
  
  // Build the matrix table
  let matrixHTML = `
    <div style="
      margin-top: 40px;
      padding: 30px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
      border-radius: 15px;
      border: 1px solid rgba(16, 185, 129, 0.3);
    ">
      <h2 style="
        color: #10b981;
        font-size: 1.8rem;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <span>📊</span>
        <span>ShortLex Symmetric Correlation Matrix</span>
      </h2>
      
      <div style="color: #94a3b8; margin-bottom: 20px;">
        Cosine similarity between git commits (last 7 days) mapped to ShortLex categories
      </div>
      
      <div style="overflow-x: auto; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 2px; min-width: 600px;">
          <thead>
            <tr>
              <th style="
                background: rgba(16, 185, 129, 0.2);
                color: #10b981;
                padding: 10px;
                text-align: left;
                font-size: 0.9rem;
                border-radius: 5px;
              ">ShortLex</th>`;
  
  // Add column headers
  nodes.forEach(node => {
    matrixHTML += `
              <th style="
                background: rgba(16, 185, 129, 0.2);
                color: #10b981;
                padding: 10px;
                text-align: center;
                font-size: 0.8rem;
                border-radius: 5px;
                writing-mode: vertical-rl;
                text-orientation: mixed;
                height: 80px;
                width: 60px;
              " title="${node.name}">${node.path}</th>`;
  });
  
  matrixHTML += `
            </tr>
          </thead>
          <tbody>`;
  
  // Add rows
  nodes.forEach(node1 => {
    matrixHTML += `
            <tr>
              <td style="
                background: rgba(16, 185, 129, 0.15);
                color: #10b981;
                padding: 10px;
                font-weight: 600;
                font-size: 0.85rem;
                white-space: nowrap;
              " title="${node1.name}">${node1.path}</td>`;
    
    nodes.forEach(node2 => {
      const data = matrix[node1.path][node2.path];
      const isDiagonal = node1.path === node2.path;
      const similarity = data.similarity;
      const color = getColorForSimilarity(similarity, isDiagonal);
      const bgColor = getBackgroundForSimilarity(similarity, isDiagonal);
      const percentage = isDiagonal ? '—' : `${(similarity * 100).toFixed(0)}%`;
      
      matrixHTML += `
              <td style="
                background: ${bgColor};
                color: ${color};
                padding: 8px;
                text-align: center;
                font-weight: bold;
                font-size: 0.85rem;
                border-radius: 3px;
                cursor: ${isDiagonal ? 'default' : 'pointer'};
                position: relative;
              " title="${node1.name} × ${node2.name}: ${(similarity * 100).toFixed(1)}%">
                ${percentage}
              </td>`;
    });
    
    matrixHTML += `
            </tr>`;
  });
  
  matrixHTML += `
          </tbody>
        </table>
      </div>
      
      <!-- Legend -->
      <div style="
        display: flex;
        justify-content: center;
        gap: 15px;
        margin-top: 20px;
        flex-wrap: wrap;
      ">
        <div style="display: flex; align-items: center; gap: 5px;">
          <div style="width: 20px; height: 20px; background: #00ff88; border-radius: 3px;"></div>
          <span style="color: #94a3b8; font-size: 0.9rem;">80-100%</span>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <div style="width: 20px; height: 20px; background: #88ff00; border-radius: 3px;"></div>
          <span style="color: #94a3b8; font-size: 0.9rem;">60-79%</span>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <div style="width: 20px; height: 20px; background: #ffcc00; border-radius: 3px;"></div>
          <span style="color: #94a3b8; font-size: 0.9rem;">40-59%</span>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <div style="width: 20px; height: 20px; background: #ff6600; border-radius: 3px;"></div>
          <span style="color: #94a3b8; font-size: 0.9rem;">20-39%</span>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <div style="width: 20px; height: 20px; background: #ff3366; border-radius: 3px;"></div>
          <span style="color: #94a3b8; font-size: 0.9rem;">0-19%</span>
        </div>
      </div>
      
      <!-- Insights -->
      ${generateMatrixInsights(matrixData)}
    </div>`;
  
  return matrixHTML;
}

/**
 * Generate insights from the matrix data
 */
function generateMatrixInsights(matrixData) {
  const { matrix, nodes } = matrixData;
  
  // Find strong and weak correlations
  const correlations = [];
  nodes.forEach((node1, i) => {
    nodes.forEach((node2, j) => {
      if (i < j) { // Only check upper triangle
        const sim = matrix[node1.path][node2.path].similarity;
        correlations.push({
          node1: node1.path,
          node2: node2.path,
          similarity: sim
        });
      }
    });
  });
  
  // Sort by similarity
  correlations.sort((a, b) => b.similarity - a.similarity);
  
  const strongCorrelations = correlations.filter(c => c.similarity > 0.7).slice(0, 3);
  const weakCorrelations = correlations.filter(c => c.similarity < 0.3 && c.similarity > 0).slice(-3);
  
  let insightsHTML = `
    <div style="
      margin-top: 25px;
      padding: 20px;
      background: rgba(0,0,0,0.3);
      border-radius: 10px;
      border-left: 3px solid #10b981;
    ">
      <h3 style="color: #10b981; margin-bottom: 15px; font-size: 1.2rem;">
        🔍 Matrix Insights
      </h3>`;
  
  if (strongCorrelations.length > 0) {
    insightsHTML += `
      <div style="margin-bottom: 12px;">
        <strong style="color: #00ff88;">Strong Correlations (>70%):</strong>
        <div style="color: #94a3b8; margin-top: 5px;">`;
    
    strongCorrelations.forEach(c => {
      insightsHTML += `${c.node1} ↔ ${c.node2}: ${(c.similarity * 100).toFixed(1)}%<br>`;
    });
    
    insightsHTML += `</div></div>`;
  }
  
  if (weakCorrelations.length > 0) {
    insightsHTML += `
      <div style="margin-bottom: 12px;">
        <strong style="color: #ff6600;">Weak Correlations (<30%):</strong>
        <div style="color: #94a3b8; margin-top: 5px;">`;
    
    weakCorrelations.forEach(c => {
      insightsHTML += `${c.node1} ↔ ${c.node2}: ${(c.similarity * 100).toFixed(1)}%<br>`;
    });
    
    insightsHTML += `</div></div>`;
  }
  
  // Calculate average correlation
  const avgCorrelation = correlations.reduce((sum, c) => sum + c.similarity, 0) / correlations.length;
  
  insightsHTML += `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(148, 163, 184, 0.2);">
        <strong style="color: ${getColorForSimilarity(avgCorrelation, false)};">
          Overall Cohesion: ${(avgCorrelation * 100).toFixed(1)}%
        </strong>
        <div style="color: #94a3b8; margin-top: 5px; font-size: 0.9rem;">
          ${avgCorrelation > 0.7 ? 'Strong alignment across components' :
            avgCorrelation > 0.4 ? 'Moderate cohesion with room for improvement' :
            'Low cohesion - components developing in isolation'}
        </div>
      </div>
    </div>`;
  
  return insightsHTML;
}

/**
 * Get color for similarity value
 */
function getColorForSimilarity(similarity, isDiagonal) {
  if (isDiagonal) return '#666';
  if (similarity >= 0.8) return '#000';
  if (similarity >= 0.6) return '#000';
  if (similarity >= 0.4) return '#000';
  if (similarity >= 0.2) return '#fff';
  return '#fff';
}

/**
 * Get background color for similarity value
 */
function getBackgroundForSimilarity(similarity, isDiagonal) {
  if (isDiagonal) return 'rgba(255,255,255,0.05)';
  if (similarity >= 0.8) return '#00ff88';
  if (similarity >= 0.6) return '#88ff00';
  if (similarity >= 0.4) return '#ffcc00';
  if (similarity >= 0.2) return '#ff6600';
  if (similarity > 0) return '#ff3366';
  return 'rgba(255,255,255,0.05)';
}

// Export for use in other modules
module.exports = { 
  generateSymmetricMatrixSection,
  loadMatrixData
};

// Test if run directly
if (require.main === module) {
  const matrixData = loadMatrixData();
  const section = generateSymmetricMatrixSection(matrixData);
  
  const testHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Symmetric Matrix Section Test</title>
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
  
  fs.writeFileSync('trust-debt-matrix-section-test.html', testHTML);
  console.log('✅ Matrix section test HTML generated');
}