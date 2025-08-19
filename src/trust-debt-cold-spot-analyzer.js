#!/usr/bin/env node

/**
 * Trust Debt Cold Spot Analyzer
 * 
 * Identifies semantically meaningful regions in the Reality vs Intent matrix
 * where correlation is low (cold spots), indicating areas of drift or misalignment.
 * 
 * Cold spots are NOT blank spots - they're areas with low but measurable correlation
 * that reveal WHERE we should focus attention.
 */

const fs = require('fs');
const path = require('path');

class ColdSpotAnalyzer {
  constructor() {
    this.matrixFile = path.join(process.cwd(), 'trust-debt-reality-intent-matrix.json');
    this.threshold = 0.2; // Below 20% correlation = cold spot
  }

  /**
   * Load and analyze the matrix for cold spots
   */
  analyzeMatrix() {
    console.log('🔍 TRUST DEBT COLD SPOT ANALYSIS');
    console.log('=' .repeat(50));
    console.log();

    // Load matrix data
    const data = JSON.parse(fs.readFileSync(this.matrixFile, 'utf8'));
    const { matrix, nodes } = data;

    // Find cold spots (low correlation regions)
    const coldSpots = this.findColdSpots(matrix, nodes);
    
    // Group by semantic patterns
    const patterns = this.identifySemanticPatterns(coldSpots, nodes);
    
    // Generate narrative interpretation
    const narrative = this.generateNarrative(patterns, nodes);

    // Save analysis
    this.saveAnalysis({ coldSpots, patterns, narrative });

    return { coldSpots, patterns, narrative };
  }

  /**
   * Find regions with correlation below threshold
   */
  findColdSpots(matrix, nodes) {
    const coldSpots = [];
    
    // Analyze each cell in the matrix
    for (const [realityPath, intentMap] of Object.entries(matrix)) {
      for (const [intentPath, cell] of Object.entries(intentMap)) {
        if (cell.similarity < this.threshold) {
          const realityNode = nodes.find(n => n.path === realityPath);
          const intentNode = nodes.find(n => n.path === intentPath);
          
          coldSpots.push({
            reality: {
              path: realityPath,
              name: realityNode?.name || realityPath,
              type: this.getNodeType(realityPath)
            },
            intent: {
              path: intentPath,
              name: intentNode?.name || intentPath,
              type: this.getNodeType(intentPath)
            },
            correlation: cell.similarity,
            temperature: this.getTemperature(cell.similarity),
            interpretation: this.interpretColdSpot(realityPath, intentPath, cell.similarity)
          });
        }
      }
    }
    
    // Sort by coldest first
    return coldSpots.sort((a, b) => a.correlation - b.correlation);
  }

  /**
   * Identify semantic patterns in cold spots
   */
  identifySemanticPatterns(coldSpots, nodes) {
    const patterns = {
      diagonal: [],      // Self-alignment failures
      vertical: [],      // Intent column patterns
      horizontal: [],    // Reality row patterns
      clusters: [],      // Multi-node patterns
      crossCutting: []   // Cross-domain patterns
    };

    // Find diagonal cold spots (self-alignment failures)
    patterns.diagonal = coldSpots.filter(cs => cs.reality.path === cs.intent.path);

    // Find vertical patterns (intent columns with multiple cold spots)
    const intentColumns = {};
    coldSpots.forEach(cs => {
      if (!intentColumns[cs.intent.path]) {
        intentColumns[cs.intent.path] = [];
      }
      intentColumns[cs.intent.path].push(cs);
    });
    
    patterns.vertical = Object.entries(intentColumns)
      .filter(([_, spots]) => spots.length >= 3)
      .map(([intentPath, spots]) => ({
        intent: intentPath,
        coldSpots: spots,
        interpretation: this.interpretVerticalPattern(intentPath, spots)
      }));

    // Find horizontal patterns (reality rows with multiple cold spots)
    const realityRows = {};
    coldSpots.forEach(cs => {
      if (!realityRows[cs.reality.path]) {
        realityRows[cs.reality.path] = [];
      }
      realityRows[cs.reality.path].push(cs);
    });
    
    patterns.horizontal = Object.entries(realityRows)
      .filter(([_, spots]) => spots.length >= 3)
      .map(([realityPath, spots]) => ({
        reality: realityPath,
        coldSpots: spots,
        interpretation: this.interpretHorizontalPattern(realityPath, spots)
      }));

    // Find cluster patterns (neighboring cold spots)
    patterns.clusters = this.findClusters(coldSpots, nodes);

    // Find cross-cutting patterns (e.g., measurement vs enforcement)
    patterns.crossCutting = this.findCrossCuttingPatterns(coldSpots);

    return patterns;
  }

  /**
   * Generate human-readable narrative
   */
  generateNarrative(patterns, nodes) {
    const sections = [];

    // Executive summary
    sections.push({
      title: '📊 Executive Summary',
      content: this.generateExecutiveSummary(patterns)
    });

    // Diagonal analysis
    if (patterns.diagonal.length > 0) {
      sections.push({
        title: '🎯 Self-Alignment Failures (Diagonal Cold Spots)',
        content: this.narrateDiagonalPatterns(patterns.diagonal)
      });
    }

    // Vertical patterns (intent columns)
    if (patterns.vertical.length > 0) {
      sections.push({
        title: '📋 Intent Blind Spots (Vertical Patterns)',
        content: this.narrateVerticalPatterns(patterns.vertical)
      });
    }

    // Horizontal patterns (reality rows)
    if (patterns.horizontal.length > 0) {
      sections.push({
        title: '⚡ Execution Gaps (Horizontal Patterns)',
        content: this.narrateHorizontalPatterns(patterns.horizontal)
      });
    }

    // Cluster patterns
    if (patterns.clusters.length > 0) {
      sections.push({
        title: '🌊 Cold Regions (Clustered Patterns)',
        content: this.narrateClusterPatterns(patterns.clusters)
      });
    }

    // Cross-cutting insights
    if (patterns.crossCutting.length > 0) {
      sections.push({
        title: '🔗 Cross-Domain Disconnects',
        content: this.narrateCrossCuttingPatterns(patterns.crossCutting)
      });
    }

    // Recommendations
    sections.push({
      title: '💡 Recommendations',
      content: this.generateRecommendations(patterns)
    });

    return sections;
  }

  /**
   * Helper: Get node type from path
   */
  getNodeType(nodePath) {
    const depth = (nodePath.match(/\./g) || []).length;
    if (depth === 0) return 'root';
    if (depth === 1) return 'category';
    if (depth === 2) return 'subcategory';
    return 'action';
  }

  /**
   * Helper: Get temperature metaphor for correlation
   */
  getTemperature(correlation) {
    if (correlation < 0.05) return '🧊 Frozen';
    if (correlation < 0.1) return '❄️ Arctic';
    if (correlation < 0.15) return '🌨️ Cold';
    if (correlation < 0.2) return '🌥️ Cool';
    return '⛅ Mild';
  }

  /**
   * Interpret a single cold spot
   */
  interpretColdSpot(realityPath, intentPath, correlation) {
    // Self-alignment failure
    if (realityPath === intentPath) {
      return `${realityPath} is failing to achieve its own stated purpose (${(correlation * 100).toFixed(1)}% alignment)`;
    }

    // Measurement vs Visualization disconnect
    if (realityPath.includes('Α📏') && intentPath.includes('Β🎨')) {
      return 'Measurement not being visualized effectively';
    }
    if (realityPath.includes('Β🎨') && intentPath.includes('Α📏')) {
      return 'Visualizing things we\'re not measuring';
    }

    // Detection vs Enforcement gap
    if (realityPath.includes('D📊') && intentPath.includes('Γ⚖️')) {
      return 'Detecting drift but not enforcing corrections';
    }

    // Carrot/Stick misalignment
    if (realityPath.includes('C🥕') && intentPath.includes('S🚫')) {
      return 'Rewards and penalties working at cross purposes';
    }

    // Generic interpretation
    const realityType = this.getNodeType(realityPath);
    const intentType = this.getNodeType(intentPath);
    
    if (realityType === 'action' && intentType === 'category') {
      return 'Tactical work disconnected from strategic intent';
    }
    if (realityType === 'category' && intentType === 'action') {
      return 'High-level effort not translating to specific actions';
    }

    return `Low correlation (${(correlation * 100).toFixed(1)}%) between execution and intent`;
  }

  /**
   * Interpret vertical pattern (intent column)
   */
  interpretVerticalPattern(intentPath, spots) {
    const avgCorrelation = spots.reduce((sum, s) => sum + s.correlation, 0) / spots.length;
    return `Intent "${intentPath}" is poorly realized across ${spots.length} reality areas (avg ${(avgCorrelation * 100).toFixed(1)}% correlation)`;
  }

  /**
   * Interpret horizontal pattern (reality row)
   */
  interpretHorizontalPattern(realityPath, spots) {
    const avgCorrelation = spots.reduce((sum, s) => sum + s.correlation, 0) / spots.length;
    return `Reality "${realityPath}" is misaligned with ${spots.length} intent areas (avg ${(avgCorrelation * 100).toFixed(1)}% correlation)`;
  }

  /**
   * Find cluster patterns
   */
  findClusters(coldSpots, nodes) {
    const clusters = [];
    const processed = new Set();

    coldSpots.forEach(spot => {
      if (processed.has(`${spot.reality.path}:${spot.intent.path}`)) return;

      // Find neighboring cold spots
      const cluster = [spot];
      const neighbors = coldSpots.filter(cs => {
        if (cs === spot) return false;
        
        // Check if paths are related (parent/child or siblings)
        const related = 
          cs.reality.path.startsWith(spot.reality.path) ||
          spot.reality.path.startsWith(cs.reality.path) ||
          cs.intent.path.startsWith(spot.intent.path) ||
          spot.intent.path.startsWith(cs.intent.path);
          
        return related && cs.correlation < this.threshold;
      });

      if (neighbors.length >= 2) {
        cluster.push(...neighbors);
        cluster.forEach(s => {
          processed.add(`${s.reality.path}:${s.intent.path}`);
        });

        clusters.push({
          spots: cluster,
          center: spot,
          size: cluster.length,
          avgCorrelation: cluster.reduce((sum, s) => sum + s.correlation, 0) / cluster.length,
          interpretation: this.interpretCluster(cluster)
        });
      }
    });

    return clusters.sort((a, b) => b.size - a.size);
  }

  /**
   * Interpret a cluster of cold spots
   */
  interpretCluster(cluster) {
    const categories = new Set();
    cluster.forEach(spot => {
      categories.add(spot.reality.path.split('.')[1] || spot.reality.path);
      categories.add(spot.intent.path.split('.')[1] || spot.intent.path);
    });

    return `Cold region spanning ${categories.size} categories with ${cluster.length} disconnected areas`;
  }

  /**
   * Find cross-cutting patterns
   */
  findCrossCuttingPatterns(coldSpots) {
    const patterns = [];

    // Measurement vs Enforcement
    const measurementEnforcement = coldSpots.filter(cs => 
      (cs.reality.path.includes('Α📏') && cs.intent.path.includes('Γ⚖️')) ||
      (cs.reality.path.includes('Γ⚖️') && cs.intent.path.includes('Α📏'))
    );
    
    if (measurementEnforcement.length > 0) {
      patterns.push({
        type: 'Measurement-Enforcement Disconnect',
        spots: measurementEnforcement,
        interpretation: 'Metrics exist but don\'t trigger actions'
      });
    }

    // Visualization vs Reality
    const visualizationReality = coldSpots.filter(cs =>
      cs.reality.path.includes('Β🎨') && !cs.intent.path.includes('Β🎨')
    );
    
    if (visualizationReality.length > 0) {
      patterns.push({
        type: 'Visualization Without Substance',
        spots: visualizationReality,
        interpretation: 'Creating pretty dashboards for unmeasured things'
      });
    }

    // Carrot vs Stick
    const carrotStick = coldSpots.filter(cs =>
      (cs.reality.path.includes('C🥕') && cs.intent.path.includes('S🚫')) ||
      (cs.reality.path.includes('S🚫') && cs.intent.path.includes('C🥕'))
    );
    
    if (carrotStick.length > 0) {
      patterns.push({
        type: 'Carrot-Stick Confusion',
        spots: carrotStick,
        interpretation: 'Mixed signals between rewards and penalties'
      });
    }

    return patterns;
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary(patterns) {
    const totalColdSpots = 
      patterns.diagonal.length +
      patterns.vertical.reduce((sum, p) => sum + p.coldSpots.length, 0) +
      patterns.horizontal.reduce((sum, p) => sum + p.coldSpots.length, 0);

    return `
Found ${totalColdSpots} cold spots in the Reality vs Intent matrix:
- ${patterns.diagonal.length} self-alignment failures (diagonal)
- ${patterns.vertical.length} intent blind spots (vertical patterns)
- ${patterns.horizontal.length} execution gaps (horizontal patterns)
- ${patterns.clusters.length} cold regions (clustered patterns)
- ${patterns.crossCutting.length} cross-domain disconnects

The coldest areas indicate WHERE to focus attention for maximum impact.
    `.trim();
  }

  /**
   * Narrate diagonal patterns
   */
  narrateDiagonalPatterns(diagonal) {
    const critical = diagonal.filter(d => d.correlation < 0.1);
    const severe = diagonal.filter(d => d.correlation >= 0.1 && d.correlation < 0.15);
    
    let narrative = '';
    
    if (critical.length > 0) {
      narrative += `CRITICAL: ${critical.length} categories are completely failing their own purpose:\n`;
      critical.forEach(d => {
        narrative += `- ${d.reality.name}: ${(d.correlation * 100).toFixed(1)}% self-alignment ${d.temperature}\n`;
      });
    }
    
    if (severe.length > 0) {
      narrative += `\nSEVERE: ${severe.length} categories are struggling:\n`;
      severe.forEach(d => {
        narrative += `- ${d.reality.name}: ${(d.correlation * 100).toFixed(1)}% self-alignment ${d.temperature}\n`;
      });
    }
    
    return narrative;
  }

  /**
   * Narrate vertical patterns
   */
  narrateVerticalPatterns(vertical) {
    return vertical.map(v => {
      const coldest = v.coldSpots.sort((a, b) => a.correlation - b.correlation)[0];
      return `Intent "${v.intent}" is not being realized:\n` +
        `- Coldest spot: ${coldest.reality.name} (${(coldest.correlation * 100).toFixed(1)}%)\n` +
        `- ${v.interpretation}`;
    }).join('\n\n');
  }

  /**
   * Narrate horizontal patterns
   */
  narrateHorizontalPatterns(horizontal) {
    return horizontal.map(h => {
      const coldest = h.coldSpots.sort((a, b) => a.correlation - b.correlation)[0];
      return `Reality "${h.reality}" is disconnected from intent:\n` +
        `- Coldest spot: ${coldest.intent.name} (${(coldest.correlation * 100).toFixed(1)}%)\n` +
        `- ${h.interpretation}`;
    }).join('\n\n');
  }

  /**
   * Narrate cluster patterns
   */
  narrateClusterPatterns(clusters) {
    return clusters.map(c => {
      return `Cold Region (${c.size} spots, avg ${(c.avgCorrelation * 100).toFixed(1)}%):\n` +
        `- Center: ${c.center.reality.name} ↔ ${c.center.intent.name}\n` +
        `- ${c.interpretation}`;
    }).join('\n\n');
  }

  /**
   * Narrate cross-cutting patterns
   */
  narrateCrossCuttingPatterns(crossCutting) {
    return crossCutting.map(p => {
      const avgCorr = p.spots.reduce((sum, s) => sum + s.correlation, 0) / p.spots.length;
      return `${p.type}:\n` +
        `- ${p.spots.length} disconnected areas (avg ${(avgCorr * 100).toFixed(1)}%)\n` +
        `- ${p.interpretation}`;
    }).join('\n\n');
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(patterns) {
    const recommendations = [];

    // Address diagonal failures first
    if (patterns.diagonal.length > 0) {
      const worst = patterns.diagonal[0];
      recommendations.push(
        `1. Fix self-alignment: ${worst.reality.name} is at ${(worst.correlation * 100).toFixed(1)}% of its own goal`
      );
    }

    // Address largest cluster
    if (patterns.clusters.length > 0) {
      const largest = patterns.clusters[0];
      recommendations.push(
        `2. Warm the cold region: ${largest.size} interconnected failures around ${largest.center.reality.name}`
      );
    }

    // Address cross-cutting issues
    if (patterns.crossCutting.length > 0) {
      const worst = patterns.crossCutting[0];
      recommendations.push(
        `3. Bridge the gap: ${worst.type} is creating systemic dysfunction`
      );
    }

    // Address vertical patterns
    if (patterns.vertical.length > 0) {
      const worst = patterns.vertical[0];
      recommendations.push(
        `4. Realize intent: "${worst.intent}" exists in documentation but not in reality`
      );
    }

    return recommendations.join('\n');
  }

  /**
   * Save analysis results
   */
  saveAnalysis(analysis) {
    const output = {
      timestamp: new Date().toISOString(),
      threshold: this.threshold,
      ...analysis,
      summary: {
        totalColdSpots: analysis.coldSpots.length,
        coldestSpot: analysis.coldSpots[0],
        diagonalFailures: analysis.patterns.diagonal.length,
        verticalPatterns: analysis.patterns.vertical.length,
        horizontalPatterns: analysis.patterns.horizontal.length,
        clusters: analysis.patterns.clusters.length,
        crossCutting: analysis.patterns.crossCutting.length
      }
    };

    fs.writeFileSync('trust-debt-cold-spots.json', JSON.stringify(output, null, 2));

    // Generate HTML report
    this.generateHTMLReport(analysis);

    console.log('✅ Cold spot analysis saved to trust-debt-cold-spots.json');
    console.log('📊 HTML report saved to trust-debt-cold-spots.html');
  }

  /**
   * Generate HTML visualization
   */
  generateHTMLReport(analysis) {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Trust Debt Cold Spot Analysis</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        h1 {
            color: #2d3748;
            margin-bottom: 30px;
            font-size: 2.5rem;
        }
        .section {
            margin-bottom: 40px;
            padding: 20px;
            background: #f7fafc;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .section h2 {
            color: #4a5568;
            margin-bottom: 15px;
            font-size: 1.5rem;
        }
        .cold-spot {
            padding: 15px;
            margin: 10px 0;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .temperature {
            font-size: 1.5rem;
            margin-right: 10px;
        }
        .correlation {
            font-weight: bold;
            color: #667eea;
            font-size: 1.2rem;
        }
        .interpretation {
            color: #718096;
            font-style: italic;
            margin-top: 5px;
        }
        .pattern {
            background: #fef5e7;
            border: 1px solid #f8d7a1;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .recommendation {
            background: #e6f7ff;
            border: 1px solid #91d5ff;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Trust Debt Cold Spot Analysis</h1>
        <p style="color: #718096; margin-bottom: 30px;">
            Identifying semantically meaningful regions where Reality and Intent diverge
        </p>
        
        ${analysis.narrative.map(section => `
            <div class="section">
                <h2>${section.title}</h2>
                <pre style="white-space: pre-wrap; font-family: inherit; color: #2d3748;">
${section.content}
                </pre>
            </div>
        `).join('')}
        
        <div class="section">
            <h2>🧊 Coldest Spots (Top 10)</h2>
            ${analysis.coldSpots.slice(0, 10).map(spot => `
                <div class="cold-spot">
                    <div>
                        <span class="temperature">${spot.temperature}</span>
                        <strong>${spot.reality.name}</strong> ↔ <strong>${spot.intent.name}</strong>
                        <div class="interpretation">${spot.interpretation}</div>
                    </div>
                    <div class="correlation">${(spot.correlation * 100).toFixed(1)}%</div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync('trust-debt-cold-spots.html', html);
  }
}

// Run analysis
if (require.main === module) {
  const analyzer = new ColdSpotAnalyzer();
  const results = analyzer.analyzeMatrix();
  
  console.log('\n📊 ANALYSIS COMPLETE\n');
  
  // Print summary to console
  results.narrative.forEach(section => {
    console.log(`\n${section.title}`);
    console.log('=' .repeat(40));
    console.log(section.content);
  });
}

module.exports = { ColdSpotAnalyzer };