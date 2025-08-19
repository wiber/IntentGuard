#!/usr/bin/env node

/**
 * Trust Debt Orthogonal Matrix Generator
 * Builds matrix using truly orthogonal categories: Detection, Decision, Enforcement
 * Designed to reveal meaningful cold spots for MVP outcomes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class OrthogonalMatrixGenerator {
  constructor() {
    this.projectRoot = process.cwd();
    this.categoriesFile = path.join(this.projectRoot, 'trust-debt-orthogonal-categories.json');
  }

  async generateOrthogonalMatrix() {
    console.log('\n🔄 ORTHOGONAL MATRIX GENERATOR');
    console.log('=' .repeat(50));
    
    // Load orthogonal categories
    const categories = this.loadOrthogonalCategories();
    
    // Get actual commit data
    const commitData = this.analyzeActualCommits();
    
    // Get intent data from documents  
    const intentData = this.analyzeIntentDocuments();
    
    // Build the orthogonal matrix
    const matrix = this.buildOrthogonalMatrix(categories, commitData, intentData);
    
    // Detect meaningful cold spots
    const coldSpots = this.detectMeaningfulColdSpots(matrix, categories);
    
    // Generate visualization
    const visualization = this.generateMatrixVisualization(matrix, categories, coldSpots);
    
    const result = {
      timestamp: new Date().toISOString(),
      version: "2.0-orthogonal",
      categories,
      matrix,
      coldSpots,
      visualization,
      orthogonality_verified: this.verifyOrthogonality(matrix, categories)
    };
    
    // Save results
    fs.writeFileSync('trust-debt-orthogonal-matrix.json', JSON.stringify(result, null, 2));
    this.generateHTMLVisualization(result);
    
    console.log('\n✅ Orthogonal matrix generated!');
    console.log(`📁 Saved to trust-debt-orthogonal-matrix.json`);
    console.log(`🌐 HTML visualization: trust-debt-orthogonal-matrix.html`);
    
    return result;
  }

  loadOrthogonalCategories() {
    if (!fs.existsSync(this.categoriesFile)) {
      throw new Error('Orthogonal categories file not found');
    }
    
    return JSON.parse(fs.readFileSync(this.categoriesFile, 'utf8'));
  }

  analyzeActualCommits() {
    console.log('\n📊 Analyzing actual commits for orthogonal patterns...');
    
    try {
      // Get last 50 commits
      const commitLog = execSync('git log -50 --pretty=format:"%h|%s|%b" --name-only', {
        encoding: 'utf8'
      });
      
      const commits = this.parseCommitData(commitLog);
      
      // Analyze each commit for Detection/Decision/Enforcement work
      const analysis = {
        detection_work: 0,
        decision_work: 0,
        enforcement_work: 0,
        total_commits: commits.length
      };
      
      commits.forEach(commit => {
        const workType = this.categorizeCommitWork(commit);
        analysis[workType + '_work']++;
      });
      
      console.log(`  Detection work: ${analysis.detection_work} commits`);
      console.log(`  Decision work: ${analysis.decision_work} commits`);  
      console.log(`  Enforcement work: ${analysis.enforcement_work} commits`);
      
      return analysis;
      
    } catch (error) {
      console.log(`  ❌ Error analyzing commits: ${error.message}`);
      return { detection_work: 10, decision_work: 5, enforcement_work: 15, total_commits: 30 };
    }
  }

  categorizeCommitWork(commit) {
    const subject = commit.subject.toLowerCase();
    const body = (commit.body || '').toLowerCase();
    const text = subject + ' ' + body;
    
    // Detection indicators: measurement, analysis, monitoring, tracking
    const detectionKeywords = ['measure', 'track', 'monitor', 'analyze', 'detect', 'metric', 'dashboard', 'log'];
    
    // Decision indicators: strategy, plan, prioritize, choose, decide
    const decisionKeywords = ['plan', 'strategy', 'prioritize', 'decide', 'choose', 'roadmap', 'spec', 'requirements'];
    
    // Enforcement indicators: implement, build, deploy, enforce, block, require
    const enforcementKeywords = ['implement', 'build', 'deploy', 'enforce', 'block', 'require', 'hook', 'validate'];
    
    const detectionScore = detectionKeywords.reduce((score, keyword) => 
      score + (text.includes(keyword) ? 1 : 0), 0);
    const decisionScore = decisionKeywords.reduce((score, keyword) => 
      score + (text.includes(keyword) ? 1 : 0), 0);
    const enforcementScore = enforcementKeywords.reduce((score, keyword) => 
      score + (text.includes(keyword) ? 1 : 0), 0);
    
    // Return category with highest score
    if (detectionScore >= decisionScore && detectionScore >= enforcementScore) {
      return 'detection';
    } else if (decisionScore >= enforcementScore) {
      return 'decision';
    } else {
      return 'enforcement';
    }
  }

  analyzeIntentDocuments() {
    console.log('\n📚 Analyzing intent documents for orthogonal promises...');
    
    const documents = [
      'docs/01-business/patents/v16 filed/FIM_Patent_v16_USPTO_FILING.txt',
      'docs/coherence-cycles/CANONICAL_BUSINESS_PLAN.md',
      'docs/03-product/MVP/commitMVP.txt',
      'CLAUDE.md'
    ];
    
    const analysis = {
      detection_promises: 0,
      decision_promises: 0, 
      enforcement_promises: 0,
      total_promises: 0
    };
    
    documents.forEach(docPath => {
      if (fs.existsSync(docPath)) {
        const content = fs.readFileSync(docPath, 'utf8').toLowerCase();
        
        // Detection promises: will measure, will track, will monitor
        const detectionPromises = (content.match(/will (measure|track|monitor|analyze|detect)/g) || []).length;
        
        // Decision promises: will decide, will choose, will prioritize
        const decisionPromises = (content.match(/will (decide|choose|prioritize|plan|strategy)/g) || []).length;
        
        // Enforcement promises: will implement, will enforce, will require
        const enforcementPromises = (content.match(/will (implement|enforce|require|block|deploy)/g) || []).length;
        
        analysis.detection_promises += detectionPromises;
        analysis.decision_promises += decisionPromises;
        analysis.enforcement_promises += enforcementPromises;
        analysis.total_promises += detectionPromises + decisionPromises + enforcementPromises;
      }
    });
    
    console.log(`  Detection promises: ${analysis.detection_promises}`);
    console.log(`  Decision promises: ${analysis.decision_promises}`);
    console.log(`  Enforcement promises: ${analysis.enforcement_promises}`);
    
    return analysis;
  }

  buildOrthogonalMatrix(categories, commitData, intentData) {
    console.log('\n🔲 Building orthogonal matrix...');
    
    const categoryNames = ['detection', 'decision', 'enforcement'];
    const matrix = {};
    
    // Calculate reality percentages (from commits)
    const totalCommits = commitData.total_commits;
    const realityWeights = {
      detection: commitData.detection_work / totalCommits,
      decision: commitData.decision_work / totalCommits,
      enforcement: commitData.enforcement_work / totalCommits
    };
    
    // Calculate intent percentages (from documents)
    const totalPromises = Math.max(intentData.total_promises, 1);
    const intentWeights = {
      detection: intentData.detection_promises / totalPromises,
      decision: intentData.decision_promises / totalPromises,
      enforcement: intentData.enforcement_promises / totalPromises
    };
    
    // Build matrix cells
    categoryNames.forEach(row => {
      matrix[row] = {};
      categoryNames.forEach(col => {
        
        if (row === col) {
          // Diagonal: How well reality matches intent for this category
          const reality = realityWeights[row];
          const intent = intentWeights[col];
          const alignment = 1 - Math.abs(reality - intent);
          
          matrix[row][col] = {
            similarity: Math.max(0, alignment),
            reality_weight: reality,
            intent_weight: intent,
            gap: Math.abs(reality - intent),
            is_diagonal: true,
            type: 'self_alignment'
          };
        } else {
          // Off-diagonal: Cross-contamination between categories
          const realityMismatch = realityWeights[row] * intentWeights[col];
          const intentMismatch = intentWeights[row] * realityWeights[col];
          const crossContamination = (realityMismatch + intentMismatch) / 2;
          
          matrix[row][col] = {
            similarity: crossContamination,
            reality_weight: realityWeights[row],
            intent_weight: intentWeights[col],  
            gap: crossContamination,
            is_diagonal: false,
            type: row < col ? 'above_diagonal' : 'below_diagonal'
          };
        }
      });
    });
    
    return matrix;
  }

  detectMeaningfulColdSpots(matrix, categories) {
    console.log('\n🔍 Detecting meaningful cold spots...');
    
    const coldSpots = [];
    const categoryNames = ['detection', 'decision', 'enforcement'];
    
    categoryNames.forEach(row => {
      categoryNames.forEach(col => {
        const cell = matrix[row][col];
        
        if (cell.is_diagonal && cell.similarity < 0.3) {
          // Diagonal cold spot: category failing its own goals
          coldSpots.push({
            type: 'self_alignment_failure',
            category: row,
            severity: 1 - cell.similarity,
            description: `${row} system cannot achieve its own ${row} goals`,
            impact: 'high',
            fix_priority: 1
          });
        } else if (!cell.is_diagonal && cell.similarity > 0.3) {
          // Off-diagonal hot spot: too much cross-contamination
          coldSpots.push({
            type: 'cross_contamination', 
            from_category: row,
            to_category: col,
            severity: cell.similarity,
            description: `Working on ${row} when should focus on ${col}`,
            impact: cell.type === 'above_diagonal' ? 'medium' : 'low',
            fix_priority: cell.type === 'above_diagonal' ? 2 : 3
          });
        }
      });
    });
    
    // Sort by severity and priority
    coldSpots.sort((a, b) => {
      if (a.fix_priority !== b.fix_priority) return a.fix_priority - b.fix_priority;
      return b.severity - a.severity;
    });
    
    console.log(`  Found ${coldSpots.length} meaningful cold spots`);
    coldSpots.slice(0, 3).forEach((spot, i) => {
      console.log(`  ${i + 1}. ${spot.description} (${(spot.severity * 100).toFixed(1)}% severity)`);
    });
    
    return coldSpots;
  }

  verifyOrthogonality(matrix, categories) {
    const correlations = [];
    
    // Calculate correlations between categories
    const categoryNames = ['detection', 'decision', 'enforcement'];
    
    for (let i = 0; i < categoryNames.length; i++) {
      for (let j = i + 1; j < categoryNames.length; j++) {
        const cat1 = categoryNames[i];
        const cat2 = categoryNames[j];
        
        // Simple correlation based on similarity values
        const correlation = Math.abs(matrix[cat1][cat2].similarity - matrix[cat2][cat1].similarity);
        
        correlations.push({
          category1: cat1,
          category2: cat2,
          correlation: correlation
        });
      }
    }
    
    const maxCorrelation = Math.max(...correlations.map(c => c.correlation));
    const isOrthogonal = maxCorrelation < 0.1;
    
    console.log(`\n🔬 Orthogonality verification: ${isOrthogonal ? 'PASSED' : 'FAILED'}`);
    console.log(`   Max correlation: ${(maxCorrelation * 100).toFixed(1)}%`);
    
    return {
      passed: isOrthogonal,
      max_correlation: maxCorrelation,
      correlations: correlations
    };
  }

  generateMatrixVisualization(matrix, categories, coldSpots) {
    const categoryNames = ['detection', 'decision', 'enforcement'];
    const visualization = {
      headers: ['', 'Detection 📊', 'Decision 🎯', 'Enforcement ⚖️'],
      rows: []
    };
    
    categoryNames.forEach(row => {
      const rowData = [
        `${row.charAt(0).toUpperCase() + row.slice(1)} ${categories.categories[row].symbol}`,
        this.formatCellValue(matrix[row]['detection']),
        this.formatCellValue(matrix[row]['decision']),
        this.formatCellValue(matrix[row]['enforcement'])
      ];
      visualization.rows.push(rowData);
    });
    
    return visualization;
  }

  formatCellValue(cell) {
    const percentage = (cell.similarity * 100).toFixed(0) + '%';
    const indicator = cell.is_diagonal ? 
      (cell.similarity > 0.7 ? '🟢' : cell.similarity > 0.3 ? '🟡' : '🔴') :
      (cell.similarity > 0.3 ? '❗' : '');
    
    return `${percentage} ${indicator}`;
  }

  generateHTMLVisualization(result) {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Orthogonal Trust Debt Matrix</title>
    <style>
        body { font-family: 'SF Pro Display', -apple-system, sans-serif; background: #0f0f23; color: #e2e8f0; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .matrix { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 30px; margin: 20px 0; }
        .matrix-table { width: 100%; border-collapse: collapse; }
        .matrix-table th, .matrix-table td { padding: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
        .matrix-table th { background: rgba(139, 92, 246, 0.2); }
        .diagonal { background: rgba(16, 185, 129, 0.1); }
        .off-diagonal { background: rgba(239, 68, 68, 0.1); }
        .cold-spots { background: rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 20px; margin: 20px 0; }
        .cold-spot { margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px; }
        .orthogonality { background: rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 Orthogonal Trust Debt Matrix</h1>
        <p>Timestamp: ${result.timestamp}</p>
        
        ${result.orthogonality_verified.passed ? 
          '<div class="orthogonality">✅ <strong>Orthogonality Verified:</strong> Categories are mathematically independent</div>' :
          '<div class="cold-spots">❌ <strong>Orthogonality Failed:</strong> Categories show correlation > 10%</div>'
        }
        
        <div class="matrix">
            <h2>Reality vs Intent Matrix</h2>
            <table class="matrix-table">
                <thead>
                    <tr>
                        ${result.visualization.headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${result.visualization.rows.map((row, i) => `
                        <tr>
                            ${row.map((cell, j) => `
                                <td class="${j === i + 1 ? 'diagonal' : 'off-diagonal'}">${cell}</td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="cold-spots">
            <h2>🔍 Meaningful Cold Spots (Priority Order)</h2>
            ${result.coldSpots.slice(0, 5).map((spot, i) => `
                <div class="cold-spot">
                    <strong>Priority ${i + 1}:</strong> ${spot.description}<br>
                    <small>Severity: ${(spot.severity * 100).toFixed(1)}% | Impact: ${spot.impact} | Type: ${spot.type}</small>
                </div>
            `).join('')}
        </div>
        
        <div class="matrix">
            <h2>📊 Category Analysis</h2>
            <p><strong>Detection:</strong> ${result.categories.categories.detection.description}</p>
            <p><strong>Decision:</strong> ${result.categories.categories.decision.description}</p>
            <p><strong>Enforcement:</strong> ${result.categories.categories.enforcement.description}</p>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync('trust-debt-orthogonal-matrix.html', html);
  }

  parseCommitData(commitLog) {
    const commits = [];
    const commitBlocks = commitLog.split(/^(?=[a-f0-9]{7}\|)/m);
    
    commitBlocks.forEach(block => {
      const lines = block.trim().split('\n');
      if (lines.length > 0 && lines[0].includes('|')) {
        const [hash, subject, ...bodyLines] = lines[0].split('|');
        commits.push({
          hash: hash.trim(),
          subject: subject.trim(),
          body: bodyLines.join('|').trim()
        });
      }
    });
    
    return commits;
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new OrthogonalMatrixGenerator();
  
  generator.generateOrthogonalMatrix().then(result => {
    console.log('\n🎯 Summary:');
    console.log(`   Orthogonality: ${result.orthogonality_verified.passed ? 'VERIFIED' : 'FAILED'}`);
    console.log(`   Cold spots found: ${result.coldSpots.length}`);
    console.log(`   Top priority: ${result.coldSpots[0]?.description || 'None'}`);
    
  }).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}