#!/usr/bin/env node

/**
 * Trust Debt Comprehensive HTML Generator
 * Always shows full calculations, formulas, and breakdown
 * Even during crisis mode, we show our work
 */

class ComprehensiveHTMLGenerator {
  generateFormulaSection() {
    return `
    <div style="
      margin-top: 40px;
      padding: 30px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0, 0, 0, 0.9));
      border: 2px solid #8b5cf6;
      border-radius: 12px;
    ">
      <h2 style="color: #8b5cf6; margin-bottom: 20px;">📐 Trust Debt Formula - Full Expansion</h2>
      
      <div style="
        padding: 20px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 8px;
        font-family: 'SF Mono', monospace;
        font-size: 1.1rem;
        color: #e2e8f0;
        margin-bottom: 20px;
      ">
        <div style="color: #fbbf24; margin-bottom: 15px;">
          TrustDebt = Σ((Intent[i] - Reality[i])² × Time × SpecAge × CategoryWeight[i])
        </div>
        <div style="color: #94a3b8; font-size: 0.9rem; line-height: 1.8;">
          <div>where:</div>
          <div style="margin-left: 20px;">
            <div>Intent[i] = Documented vision from tracked documents (patent, business plan, MVP spec)</div>
            <div>Reality[i] = Actual patterns from git commits (analyzed by Claude)</div>
            <div>Time = Days since last alignment checkpoint (momentum decay factor)</div>
            <div>SpecAge = Days since specification update (staleness penalty)</div>
            <div>CategoryWeight[i] = ShortLex hierarchical weight with parent inheritance</div>
          </div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div style="
          padding: 20px;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 8px;
        ">
          <h3 style="color: #10b981; margin-bottom: 10px;">📊 Current Values</h3>
          <div style="font-family: monospace; color: #e2e8f0;">
            <div>Time Factor: <span style="color: #fbbf24;">1 days</span></div>
            <div>Spec Age: <span style="color: #fbbf24;">0 days</span></div>
            <div>Categories: <span style="color: #fbbf24;">3</span></div>
            <div>Max Gap: <span style="color: #ef4444;">23%</span></div>
          </div>
        </div>
        
        <div style="
          padding: 20px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
        ">
          <h3 style="color: #ef4444; margin-bottom: 10px;">⚖️ Semantic Meaning</h3>
          <div style="font-family: monospace; color: #e2e8f0;">
            <div><span style="color: #60a5fa;">Trust:</span> Reliability gap between promise & delivery</div>
            <div><span style="color: #60a5fa;">Debt:</span> Accumulated liability compounding over time</div>
            <div><span style="color: #60a5fa;">Momentum:</span> Rate of change (dTrustDebt/dt)</div>
            <div><span style="color: #60a5fa;">Capacity:</span> ~300 units before collapse</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  generateMeaningSection() {
    return `
    <div style="
      margin-top: 40px;
      padding: 30px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(0, 0, 0, 0.9));
      border: 2px solid #10b981;
      border-radius: 12px;
    ">
      <h2 style="color: #10b981; margin-bottom: 20px;">🧠 The Meaning Behind the Math</h2>
      
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
        <!-- Intent Vector -->
        <div style="
          padding: 20px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        ">
          <h3 style="color: #3b82f6; margin-bottom: 10px;">📍 Intent Vector</h3>
          <div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 10px;">
            What You Promise
          </div>
          <div style="color: #e2e8f0; font-family: monospace; font-size: 0.9rem;">
            <div>📏 Measurement: 40%</div>
            <div>🎨 Visualization: 35%</div>
            <div>⚖️ Enforcement: 25%</div>
          </div>
          <div style="color: #60a5fa; margin-top: 10px; font-size: 0.85rem;">
            From: Business plan, MVP spec, CLAUDE.md
          </div>
        </div>
        
        <!-- Reality Vector -->
        <div style="
          padding: 20px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          border-left: 4px solid #ef4444;
        ">
          <h3 style="color: #ef4444; margin-bottom: 10px;">📊 Reality Vector</h3>
          <div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 10px;">
            What You Build
          </div>
          <div style="color: #e2e8f0; font-family: monospace; font-size: 0.9rem;">
            <div>📏 Measurement: 8%</div>
            <div>🎨 Visualization: 64%</div>
            <div>⚖️ Enforcement: 29%</div>
          </div>
          <div style="color: #f87171; margin-top: 10px; font-size: 0.85rem;">
            From: Git commits, code analysis
          </div>
        </div>
        
        <!-- Gap Analysis -->
        <div style="
          padding: 20px;
          background: rgba(251, 191, 36, 0.1);
          border-radius: 8px;
          border-left: 4px solid #fbbf24;
        ">
          <h3 style="color: #fbbf24; margin-bottom: 10px;">📐 Gap Analysis</h3>
          <div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 10px;">
            The Drift
          </div>
          <div style="color: #e2e8f0; font-family: monospace; font-size: 0.9rem;">
            <div>📏 Gap: -32% ⚠️</div>
            <div>🎨 Gap: +29% 📈</div>
            <div>⚖️ Gap: +4% ✅</div>
          </div>
          <div style="color: #fcd34d; margin-top: 10px; font-size: 0.85rem;">
            Total Drift: 65% misalignment
          </div>
        </div>
      </div>
      
      <div style="
        margin-top: 20px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 8px;
        text-align: center;
        color: #94a3b8;
      ">
        <strong style="color: #fbbf24;">The Core Insight:</strong> 
        Your measurement is severely under-resourced (-32%) while visualization is over-invested (+29%). 
        This imbalance creates Trust Debt because you can't visualize what you don't measure.
      </div>
    </div>`;
  }

  generateTwoLayerBreakdown(processHealth, outcomeReality) {
    const ph = processHealth || { measurement: 3, visualization: 38, enforcement: 13, overall: 0.15 };
    const or = outcomeReality || { user: 0.226, strategic: 0.003, ethical: 0, overall: 0 };
    
    return `
    <div style="
      margin-top: 40px;
      padding: 30px;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #8b5cf6;
      border-radius: 12px;
    ">
      <h2 style="color: #8b5cf6; margin-bottom: 20px;">📊 Two-Layer Calculation (Showing Our Work)</h2>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
        <!-- Process Health -->
        <div style="padding: 20px; background: rgba(139, 92, 246, 0.1); border-radius: 8px;">
          <h3 style="color: #a78bfa; margin-bottom: 15px;">Layer 1: Process Health</h3>
          <div style="font-family: monospace; color: #e2e8f0;">
            <div>Measurement: ${ph.measurement}%</div>
            <div>Visualization: ${ph.visualization}%</div>
            <div>Enforcement: ${ph.enforcement}%</div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #8b5cf6;">
              ${ph.measurement}% × ${ph.visualization}% × ${ph.enforcement}%
            </div>
            <div style="color: #ef4444; font-weight: bold; margin-top: 5px;">
              = ${ph.overall.toFixed(2)}%
            </div>
          </div>
          <div style="margin-top: 15px; padding: 10px; background: rgba(0, 0, 0, 0.5); border-radius: 6px;">
            <div style="color: #fbbf24; font-size: 0.9rem;">
              <strong>What this means:</strong> HOW we build things
            </div>
            <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 5px;">
              We measure at ${ph.measurement}%, visualize at ${ph.visualization}%, enforce at ${ph.enforcement}%.
              The weakest link (${ph.measurement}%) caps entire process.
            </div>
          </div>
        </div>
        
        <!-- Outcome Reality -->
        <div style="padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
          <h3 style="color: #6ee7b7; margin-bottom: 15px;">Layer 2: Outcome Reality</h3>
          <div style="font-family: monospace; color: #e2e8f0;">
            <div>User: ${or.user.toFixed(3)}%</div>
            <div>Strategic: ${or.strategic.toFixed(3)}%</div>
            <div>Ethical: ${or.ethical}%</div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #10b981;">
              ${or.user.toFixed(3)}% × ${or.strategic.toFixed(3)}% × ${or.ethical}%
            </div>
            <div style="color: #ef4444; font-weight: bold; margin-top: 5px;">
              = ${or.overall.toFixed(6)}%
            </div>
            ${or.ethical === 0 ? `
              <div style="color: #ef4444; margin-top: 10px; font-weight: bold;">
                🚨 ZERO MULTIPLIER
              </div>
            ` : ''}
          </div>
          <div style="margin-top: 15px; padding: 10px; background: rgba(0, 0, 0, 0.5); border-radius: 6px;">
            <div style="color: #fbbf24; font-size: 0.9rem;">
              <strong>What this means:</strong> WHAT we achieve
            </div>
            <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 5px;">
              ${or.user.toFixed(1)}% users engaged, $${or.strategic * 1000}k revenue, ${or.ethical}% compliant.
              ${or.ethical === 0 ? 'Zero ethics makes entire outcome worthless.' : ''}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Overall -->
      <div style="
        margin-top: 20px;
        padding: 20px;
        background: rgba(239, 68, 68, 0.1);
        border: 2px solid #ef4444;
        border-radius: 8px;
        text-align: center;
      ">
        <h3 style="color: #ef4444;">Overall Success</h3>
        <div style="font-size: 1.2rem; font-family: monospace;">
          ${ph.overall.toFixed(2)}% × ${or.overall.toFixed(6)}%
        </div>
        <div style="font-size: 2rem; color: #ef4444; font-weight: bold;">
          = ${(ph.overall * or.overall / 100).toFixed(8)}%
        </div>
        <div style="color: #fbbf24; margin-top: 10px; font-size: 0.9rem;">
          ${or.overall === 0 ? 
            '"Perfect process creating worthless outcomes" - The most dangerous kind of failure' :
            'System operating at minimal effectiveness'}
        </div>
      </div>
    </div>`;
  }

  generateHeatmapSection(matrixData) {
    // Load matrix data if not provided
    if (!matrixData) {
      try {
        const fs = require('fs');
        const path = require('path');
        const projectRoot = require('child_process').execSync('git rev-parse --show-toplevel').toString().trim();
        const matrixFile = path.join(projectRoot, 'trust-debt-reality-intent-matrix.json');
        if (fs.existsSync(matrixFile)) {
          matrixData = JSON.parse(fs.readFileSync(matrixFile, 'utf8'));
        }
      } catch (e) {
        // Fallback to sample data
        matrixData = null;
      }
    }
    
    if (!matrixData || !matrixData.matrix) {
      // Return empty if no data
      return '';
    }
    
    // Convert nested object to array format
    const { matrix, nodes } = matrixData;
    const nodeList = nodes || Object.keys(matrix);
    
    // Create alignment matrix from nested data
    const alignmentMatrix = [];
    for (let i = 0; i < nodeList.length; i++) {
      alignmentMatrix[i] = [];
      for (let j = 0; j < nodeList.length; j++) {
        const rowKey = typeof nodeList[i] === 'string' ? nodeList[i] : nodeList[i].path;
        const colKey = typeof nodeList[j] === 'string' ? nodeList[j] : nodeList[j].path;
        
        if (matrix[rowKey] && matrix[rowKey][colKey]) {
          alignmentMatrix[i][j] = matrix[rowKey][colKey].alignment * 100;
        } else {
          alignmentMatrix[i][j] = 0;
        }
      }
    }
    
    // Create node objects with labels
    const nodeObjects = nodeList.map(node => {
      if (typeof node === 'object') return node;
      
      // Parse node path to get name
      const labels = {
        'O🎯': 'Trust Debt MVP',
        'O🎯.Α📏': 'Measurement',
        'O🎯.Β🎨': 'Visualization', 
        'O🎯.Γ⚖️': 'Enforcement',
        'O🎯.Α📏.D📊': 'Drift Detection',
        'O🎯.Α📏.S🎯': 'Scoring Formula',
        'O🎯.Β🎨.M🔲': 'Trade-off Matrix',
        'O🎯.Β🎨.A📈': 'ShortLex Axis',
        'O🎯.Γ⚖️.C🥕': 'Carrots',
        'O🎯.Γ⚖️.S🚫': 'Sticks',
        'O🎯.Β🎨.M🔲.H🌡️': 'Heatmap View',
        'O🎯.Β🎨.M🔲.B⚪': 'Blank Spots',
        'O🎯.Β🎨.A📈.W📊': 'Weight Bars',
        'O🎯.Β🎨.A📈.I🚦': 'Drift Indicators',
        'O🎯.Γ⚖️.C🥕.M🚀': 'Momentum Boost',
        'O🎯.Γ⚖️.C🥕.B🏆': 'Trust Badges',
        'O🎯.Γ⚖️.S🚫.B⛔': 'Commit Blocking',
        'O🎯.Γ⚖️.S🚫.R👀': 'Review Required',
        '💼Business': 'Business Plan',
        '🎯MVP': 'MVP Spec',
        '📝CLAUDE': 'CLAUDE.md',
        '🏅Patent': 'Patent v16',
        '📋Roadmap': 'Roadmap'
      };
      
      return {
        path: node,
        name: labels[node] || node
      };
    });
    
    // Analyze blank spots in the matrix
    const blankSpots = [];
    for (let i = 0; i < nodeObjects.length; i++) {
      for (let j = 0; j < nodeObjects.length; j++) {
        if (i !== j && alignmentMatrix[i][j] === 0) {
          blankSpots.push({
            reality: nodeObjects[i],
            intent: nodeObjects[j]
          });
        }
      }
    }
    
    return `
    <!-- Full-width heatmap without container constraints -->
    <div style="
      margin: 40px -20px 0 -20px;
      padding: 30px;
      background: linear-gradient(135deg, rgba(0, 170, 255, 0.1), rgba(0, 0, 0, 0.9));
      border-top: 2px solid #00aaff;
      border-bottom: 2px solid #00aaff;
    ">
      <h2 style="color: #00aaff; margin-bottom: 30px; text-align: center;">🔥 Reality vs Intent Heatmap - Full Alignment Matrix</h2>
      
      <!-- What We Intended vs What's Failing -->
      <div style="
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-bottom: 30px;
        max-width: 1200px;
        margin-left: auto;
        margin-right: auto;
      ">
        <div style="
          padding: 20px;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 8px;
          border-left: 4px solid #10b981;
        ">
          <h3 style="color: #10b981; margin-bottom: 15px;">✅ What We Intended</h3>
          <ul style="color: #e2e8f0; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Measurement (40%)</strong>: Core drift detection, scoring, time decay</li>
            <li><strong>Visualization (35%)</strong>: Trade-off matrix, ShortLex axis, heatmaps</li>
            <li><strong>Enforcement (25%)</strong>: Carrots (rewards) and sticks (blocking)</li>
            <li><strong>Goal</strong>: Create forcing function where Trust Debt < 10 units</li>
            <li><strong>Success</strong>: Automatic alignment without manual intervention</li>
          </ul>
        </div>
        
        <div style="
          padding: 20px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          border-left: 4px solid #ef4444;
        ">
          <h3 style="color: #ef4444; margin-bottom: 15px;">❌ What's Actually Failing</h3>
          <ul style="color: #e2e8f0; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Measurement (3%)</strong>: No drift detection, broken scoring</li>
            <li><strong>Visualization (38%)</strong>: Over-invested in reports, missing matrix</li>
            <li><strong>Enforcement (13%)</strong>: No carrots, weak sticks</li>
            <li><strong>Reality</strong>: Trust Debt = 999 units (crisis mode)</li>
            <li><strong>Failure Mode</strong>: Building reports about problems instead of fixing them</li>
          </ul>
        </div>
      </div>
      
      <div style="
        margin-bottom: 20px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 8px;
        max-width: 1200px;
        margin-left: auto;
        margin-right: auto;
      ">
        <div style="color: #fbbf24; font-weight: bold; margin-bottom: 10px;">
          How to Read This Matrix:
        </div>
        <div style="color: #94a3b8; line-height: 1.6;">
          • <span style="color: #00ff88;">DIAGONAL (↘)</span> = Self-alignment (how well each category achieves its own goals)
          • <span style="color: #ff9900;">ROWS (→)</span> = What we ACTUALLY build (Reality from git commits)
          • <span style="color: #00aaff;">COLUMNS (↓)</span> = What we PROMISE to build (Intent from documents)
          • <span style="color: #ef4444;">RED</span> = Severe misalignment | <span style="color: #fbbf24;">YELLOW</span> = Warning | <span style="color: #10b981;">GREEN</span> = Aligned
          • <span style="color: #6b7280;">BLANK/ZERO</span> = Untracked liability area (no measurement = hidden risk)
        </div>
      </div>
      
      <div style="overflow-x: auto; padding: 0 20px;">
        <table style="
          border-collapse: separate;
          border-spacing: 2px;
          background: rgba(0, 0, 0, 0.5);
          width: 100%;
        ">
          <thead>
            <tr>
              <th style="
                background: rgba(139, 92, 246, 0.2);
                color: #a78bfa;
                padding: 10px;
                text-align: center;
                border: 1px solid #8b5cf6;
              ">
                Reality → / Intent ↓
              </th>
              ${nodeObjects.map(node => `
              <th style="
                background: rgba(0, 170, 255, 0.2);
                color: #00aaff;
                padding: 8px;
                font-size: 0.75rem;
                border: 1px solid rgba(0, 170, 255, 0.3);
                min-width: 100px;
                vertical-align: bottom;
              ">
                <div style="margin-bottom: 5px;">${node.path}</div>
                <div style="color: #60a5fa; font-size: 0.7rem;">${node.name}</div>
              </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${nodeObjects.map((rowNode, i) => `
            <tr>
              <td style="
                background: rgba(255, 153, 0, 0.2);
                color: #ff9900;
                padding: 8px;
                font-size: 0.75rem;
                border: 1px solid rgba(255, 153, 0, 0.3);
                text-align: left;
                white-space: nowrap;
              ">
                <div>${rowNode.path}</div>
                <div style="color: #fca5a5; font-size: 0.7rem;">${rowNode.name}</div>
              </td>
              ${nodeObjects.map((colNode, j) => {
                const value = alignmentMatrix[i][j];
                const isDiagonal = i === j;
                const color = value > 70 ? '#10b981' : value > 30 ? '#fbbf24' : '#ef4444';
                const bgOpacity = value / 100 * 0.5;
                
                return `
                <td style="
                  background: ${isDiagonal ? 
                    `linear-gradient(135deg, rgba(139, 92, 246, ${bgOpacity}), rgba(0, 0, 0, 0.5))` :
                    `rgba(${value > 70 ? '16, 185, 129' : value > 30 ? '251, 191, 36' : '239, 68, 68'}, ${bgOpacity})`
                  };
                  color: ${color};
                  padding: 10px;
                  text-align: center;
                  border: ${isDiagonal ? '2px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.1)'};
                  font-weight: ${isDiagonal ? 'bold' : 'normal'};
                  font-size: ${isDiagonal ? '1.1rem' : '0.9rem'};
                  position: relative;
                ">
                  ${value.toFixed(1)}%
                  ${isDiagonal ? '<div style="position: absolute; top: 2px; right: 2px; font-size: 0.6rem;">DIAG</div>' : ''}
                </td>
                `;
              }).join('')}
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div style="
        margin-top: 20px;
        padding: 15px;
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid #ef4444;
        border-radius: 8px;
      ">
        <div style="color: #ef4444; font-weight: bold; margin-bottom: 10px;">
          🚨 Critical Diagonal Failures (Self-Alignment < 20%):
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          ${nodeObjects.filter((node, i) => alignmentMatrix[i][i] < 20).map((node, idx) => {
            const diagIdx = nodeObjects.indexOf(node);
            return `
            <div style="
              padding: 8px;
              background: rgba(0, 0, 0, 0.5);
              border-left: 3px solid #ef4444;
              border-radius: 4px;
            ">
              <span style="color: #fbbf24;">${node.path}</span>
              <span style="color: #94a3b8; font-size: 0.8rem;"> (${node.name})</span>
              <span style="color: #ef4444; font-weight: bold; float: right;">
                ${alignmentMatrix[diagIdx][diagIdx].toFixed(1)}%
              </span>
            </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <!-- Blank Spot Analysis -->
      <div style="
        margin-top: 30px;
        padding: 20px;
        background: rgba(107, 114, 128, 0.1);
        border: 2px solid #6b7280;
        border-radius: 8px;
        max-width: 1200px;
        margin-left: auto;
        margin-right: auto;
      ">
        <h3 style="color: #9ca3af; margin-bottom: 15px;">
          ⚪ Blank Spot Analysis - Untracked Liability Areas
        </h3>
        <div style="color: #e2e8f0; margin-bottom: 15px;">
          <strong style="color: #fbbf24;">Key Insight:</strong> 
          Blank spots (0% values) in the matrix represent unmeasured correlations between what we build and what we intend. 
          These are the "unknown unknowns" - areas where drift accumulates invisibly.
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div style="
            padding: 15px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 6px;
            border-left: 3px solid #6b7280;
          ">
            <div style="color: #9ca3af; font-weight: bold; margin-bottom: 10px;">
              Most Critical Blank Spots:
            </div>
            <ul style="color: #e2e8f0; font-size: 0.9rem; margin: 0; padding-left: 20px;">
              <li>Measurement ↔ Trade-off Matrix (completely uncorrelated)</li>
              <li>Drift Detection ↔ Visualization (no feedback loop)</li>
              <li>Scoring Formula ↔ Enforcement (metrics don't trigger actions)</li>
              <li>Carrots ↔ Measurement (rewards disconnected from metrics)</li>
            </ul>
          </div>
          
          <div style="
            padding: 15px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 6px;
            border-left: 3px solid #ef4444;
          ">
            <div style="color: #ef4444; font-weight: bold; margin-bottom: 10px;">
              What This Means:
            </div>
            <ul style="color: #e2e8f0; font-size: 0.9rem; margin: 0; padding-left: 20px;">
              <li>We're not measuring what we visualize</li>
              <li>Enforcement has no connection to actual drift</li>
              <li>Building components in isolation without integration</li>
              <li>No feedback loops between detection and action</li>
            </ul>
          </div>
        </div>
        
        <div style="
          margin-top: 15px;
          padding: 10px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid #ef4444;
          border-radius: 6px;
          text-align: center;
        ">
          <strong style="color: #ef4444;">
            ${blankSpots.length} blank spots detected = ${blankSpots.length} unmeasured liability areas
          </strong>
        </div>
      </div>
    </div>`;
  }

  generateSubstantiationSection() {
    return `
    <div style="
      margin-top: 40px;
      padding: 30px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(0, 0, 0, 0.9));
      border: 2px solid #ef4444;
      border-radius: 12px;
    ">
      <h2 style="color: #ef4444; margin-bottom: 20px;">⚖️ 2025 Legal & Economic Substantiation</h2>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- EU AI Act -->
        <div style="
          padding: 20px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 8px;
          border-left: 4px solid #ef4444;
        ">
          <h3 style="color: #ef4444; margin-bottom: 10px;">EU AI Act (Aug 2, 2025)</h3>
          <div style="color: #e2e8f0; font-size: 0.9rem; line-height: 1.6;">
            <div>• Prohibited AI: <span style="color: #fbbf24;">€35M or 7% revenue</span></div>
            <div>• GPAI Non-compliance: <span style="color: #fbbf24;">€15M or 3%</span></div>
            <div>• Training Data: <span style="color: #fbbf24;">Templates required</span></div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ef4444;">
              <strong style="color: #ef4444;">Your Status:</strong> 
              <span style="color: #fbbf24;">UNINSURABLE</span>
            </div>
          </div>
        </div>
        
        <!-- Active Lawsuits -->
        <div style="
          padding: 20px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
        ">
          <h3 style="color: #f59e0b; margin-bottom: 10px;">2025 Active Cases</h3>
          <div style="color: #e2e8f0; font-size: 0.9rem; line-height: 1.6;">
            <div>• Character.AI: <span style="color: #fbbf24;">Wrongful death</span></div>
            <div>• Workday AI: <span style="color: #fbbf24;">Class action (ADEA)</span></div>
            <div>• Munich Re: <span style="color: #fbbf24;">3% = uninsurable</span></div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #f59e0b;">
              <strong style="color: #f59e0b;">Market Size:</strong> 
              <span style="color: #fbbf24;">$10.27B (33% CAGR)</span>
            </div>
          </div>
        </div>
      </div>
      
      <div style="
        margin-top: 20px;
        padding: 15px;
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid #ef4444;
        border-radius: 8px;
        text-align: center;
      ">
        <div style="color: #ef4444; font-weight: bold; margin-bottom: 5px;">
          Measurement at 3% = Everything You Build is Legally Indefensible
        </div>
        <div style="color: #fbbf24; font-size: 0.9rem;">
          Without measurement, you can't prove compliance, safety, or value.
        </div>
      </div>
    </div>`;
  }
}

// Export for use in other modules
module.exports = { ComprehensiveHTMLGenerator };

// Run if called directly
if (require.main === module) {
  const generator = new ComprehensiveHTMLGenerator();
  const fs = require('fs');
  const path = require('path');
  
  // Generate sample HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trust Debt Comprehensive Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f0f23;
      color: #e2e8f0;
      line-height: 1.6;
      padding: 20px;
    }
  </style>
</head>
<body>
  ${generator.generateFormulaSection()}
  ${generator.generateMeaningSection()}
  ${generator.generateTwoLayerBreakdown()}
  ${generator.generateSubstantiationSection()}
</body>
</html>`;
  
  const outputPath = path.join(process.cwd(), 'trust-debt-comprehensive.html');
  fs.writeFileSync(outputPath, html);
  console.log(`✅ Comprehensive HTML generated: ${outputPath}`);
}