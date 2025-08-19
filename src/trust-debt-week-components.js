#!/usr/bin/env node

/**
 * Trust Debt Component Analysis - Full Breakdown
 * 
 * Shows how each component contributes to total Trust Debt:
 * - Intent vs Reality gap per category
 * - Time decay factor (spec age)
 * - Proper parent-relative percentages
 * - Color-coded by context
 * 
 * Usage: pnpm t:week
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Trust Debt accumulation constants
const DAILY_DRIFT_RATE = 0.003; // 0.3% daily
const SPEC_AGE_PENALTY = 0.001; // 0.1% per day since spec creation

// Get git information with proper parsing
function getGitInfo() {
  try {
    const commits = [];
    const hashes = execSync('git log --format="%H" -5', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(h => h);
    
    for (const hash of hashes) {
      try {
        const subject = execSync(`git log --format="%s" -1 ${hash}`, { encoding: 'utf8' }).trim();
        const body = execSync(`git log --format="%b" -1 ${hash}`, { encoding: 'utf8' }).trim();
        const timestamp = execSync(`git log --format="%ci" -1 ${hash}`, { encoding: 'utf8' }).trim();
        
        commits.push({
          hash: hash.substring(0, 7),
          fullHash: hash,
          subject: subject,
          body: body,
          fullMessage: subject + (body ? '\n\n' + body : ''),
          timestamp: timestamp
        });
      } catch (e) {
        // Silent fail for individual commits
      }
    }
    
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const modifiedFiles = status.split('\n').filter(line => line.trim()).length;
    
    // Calculate hours since last commit and spec age
    const lastCommitTime = commits[0] ? new Date(commits[0].timestamp) : new Date();
    const hoursSinceCommit = (Date.now() - lastCommitTime.getTime()) / (1000 * 60 * 60);
    
    // Get age of CLAUDE.md (our spec document)
    let specAge = 0;
    try {
      const specModTime = execSync('git log -1 --format="%ci" CLAUDE.md', { encoding: 'utf8' }).trim();
      specAge = (Date.now() - new Date(specModTime).getTime()) / (1000 * 60 * 60 * 24); // Days
    } catch (e) {
      specAge = 30; // Default to 30 days if can't determine
    }
    
    return {
      branch,
      commits,
      modifiedFiles,
      clean: modifiedFiles === 0,
      hoursSinceCommit,
      specAge,
      driftSinceCommit: hoursSinceCommit * (DAILY_DRIFT_RATE / 24) * 100
    };
  } catch (error) {
    return {
      branch: 'unknown',
      commits: [],
      modifiedFiles: 0,
      clean: true,
      hoursSinceCommit: 0,
      specAge: 30,
      driftSinceCommit: 0
    };
  }
}

// Analyze content to extract intent vectors
function analyzeContentVectors(content) {
  const lowerContent = content.toLowerCase();
  
  // Count occurrences for each dimension
  const dimensions = {
    trust: {
      indicators: ['trust debt', 'quantif', 'score', 'measur', 'visible', 'drift', 'insur'],
      count: 0,
      subcategories: {
        quantification: ['score', 'quantif', 'measur', '73/100', 'metrics'],
        visibility: ['visible', 'reveal', 'expose', 'hidden', 'transparent'],
        drift: ['drift', 'diverge', 'gap', 'misalign', 'accumul']
      }
    },
    timing: {
      indicators: ['30 second', 'timing', 'moment', 'receptiv', 'precision', 'strategic'],
      count: 0,
      subcategories: {
        precision: ['precise', 'exact', 'perfect timing', 'accurate'],
        acceleration: ['30% faster', 'accelerat', 'speed', 'velocity'],
        momentum: ['momentum', 'compound', 'accumula', 'cascade']
      }
    },
    recognition: {
      indicators: ['oh moment', 'breakthrough', 'recogni', 'insight', 'pattern', 'aha'],
      count: 0,
      subcategories: {
        naming: ['pattern nam', 'thursday panic', 'memorable', 'catchy'],
        breakthrough: ['breakthrough', 'revelation', 'insight', 'epiphany'],
        reproducibility: ['reproduc', 'consistent', 'reliable', 'repeat']
      }
    }
  };
  
  // Count indicators
  for (const [dim, data] of Object.entries(dimensions)) {
    data.indicators.forEach(indicator => {
      const matches = lowerContent.match(new RegExp(indicator, 'gi'));
      if (matches) data.count += matches.length;
    });
    
    // Count subcategory matches
    for (const [subcat, terms] of Object.entries(data.subcategories)) {
      data.subcategories[subcat] = {
        terms,
        count: 0
      };
      terms.forEach(term => {
        const matches = lowerContent.match(new RegExp(term, 'gi'));
        if (matches) data.subcategories[subcat].count += matches.length;
      });
    }
  }
  
  // Calculate normalized vector (sums to 1.0)
  const total = dimensions.trust.count + dimensions.timing.count + dimensions.recognition.count || 1;
  
  return {
    vector: {
      trust: dimensions.trust.count / total,
      timing: dimensions.timing.count / total,
      recognition: dimensions.recognition.count / total
    },
    raw: dimensions,
    total
  };
}

// Calculate Trust Debt components
function calculateTrustDebtComponents(documents, gitInfo) {
  // Define intent vector (from CLAUDE.md spec)
  const intentVector = {
    trust: 0.35,     // 35% - Trust Foundation
    timing: 0.35,    // 35% - Strategic Timing  
    recognition: 0.30 // 30% - Recognition Creation
  };
  
  // Calculate reality vector from all documents
  let aggregateVector = { trust: 0, timing: 0, recognition: 0 };
  let totalWeight = 0;
  
  const documentAnalyses = documents.map(doc => {
    const analysis = analyzeContentVectors(doc.content);
    const weight = doc.content.length; // Weight by content size
    
    // Add to aggregate
    aggregateVector.trust += analysis.vector.trust * weight;
    aggregateVector.timing += analysis.vector.timing * weight;
    aggregateVector.recognition += analysis.vector.recognition * weight;
    totalWeight += weight;
    
    return {
      ...doc,
      analysis,
      weight,
      vector: analysis.vector
    };
  });
  
  // Normalize aggregate vector
  if (totalWeight > 0) {
    aggregateVector.trust /= totalWeight;
    aggregateVector.timing /= totalWeight;
    aggregateVector.recognition /= totalWeight;
  }
  
  // Calculate L2 distance (Euclidean)
  const gap = {
    trust: intentVector.trust - aggregateVector.trust,
    timing: intentVector.timing - aggregateVector.timing,
    recognition: intentVector.recognition - aggregateVector.recognition
  };
  
  const l2Distance = Math.sqrt(
    gap.trust ** 2 + 
    gap.timing ** 2 + 
    gap.recognition ** 2
  );
  
  // Calculate Trust Debt components
  const baseDebt = l2Distance * 1000; // Scale to units
  const specAgePenalty = gitInfo.specAge * SPEC_AGE_PENALTY * 100;
  const driftAccumulation = gitInfo.hoursSinceCommit * (DAILY_DRIFT_RATE / 24) * 100;
  
  const totalDebt = Math.round(baseDebt + specAgePenalty + driftAccumulation);
  
  // Calculate per-dimension contributions
  const dimensionContributions = {
    trust: {
      intent: intentVector.trust,
      reality: aggregateVector.trust,
      gap: gap.trust,
      contribution: Math.abs(gap.trust) / (Math.abs(gap.trust) + Math.abs(gap.timing) + Math.abs(gap.recognition)),
      debtUnits: Math.round(Math.abs(gap.trust) * 1000)
    },
    timing: {
      intent: intentVector.timing,
      reality: aggregateVector.timing,
      gap: gap.timing,
      contribution: Math.abs(gap.timing) / (Math.abs(gap.trust) + Math.abs(gap.timing) + Math.abs(gap.recognition)),
      debtUnits: Math.round(Math.abs(gap.timing) * 1000)
    },
    recognition: {
      intent: intentVector.recognition,
      reality: aggregateVector.recognition,
      gap: gap.recognition,
      contribution: Math.abs(gap.recognition) / (Math.abs(gap.trust) + Math.abs(gap.timing) + Math.abs(gap.recognition)),
      debtUnits: Math.round(Math.abs(gap.recognition) * 1000)
    }
  };
  
  // Calculate insurability
  const trustDebtScore = Math.max(0, 100 - totalDebt / 10);
  const isInsurable = trustDebtScore >= 70;
  const insurabilityGap = Math.max(0, 70 - trustDebtScore);
  
  return {
    totalDebt,
    baseDebt: Math.round(baseDebt),
    specAgePenalty: Math.round(specAgePenalty),
    driftAccumulation: Math.round(driftAccumulation),
    trustDebtScore,
    isInsurable,
    insurabilityGap,
    l2Distance,
    intentVector,
    realityVector: aggregateVector,
    gap,
    dimensionContributions,
    documentAnalyses
  };
}

// Build ShortLex structure with proper parent-relative percentages
function buildShortLexStructure(debtComponents) {
  const { dimensionContributions } = debtComponents;
  
  // Create root
  const structure = {
    id: 'O',
    symbol: 'O',
    emoji: '🎯',
    title: 'Outcome',
    description: 'Trust Debt Alignment',
    weight: 100,
    parentWeight: 100,
    effectiveWeight: 100,
    type: 'outcome',
    debtContribution: debtComponents.totalDebt,
    children: []
  };
  
  // Add latent factors based on actual gaps
  const factors = [
    {
      id: 'A',
      symbol: 'Α',
      emoji: '🏛️',
      title: 'Trust Foundation',
      dim: 'trust',
      weight: Math.round(dimensionContributions.trust.intent * 100),
      gap: dimensionContributions.trust.gap,
      debtUnits: dimensionContributions.trust.debtUnits
    },
    {
      id: 'B',
      symbol: 'Β',
      emoji: '⏰',
      title: 'Strategic Timing',
      dim: 'timing',
      weight: Math.round(dimensionContributions.timing.intent * 100),
      gap: dimensionContributions.timing.gap,
      debtUnits: dimensionContributions.timing.debtUnits
    },
    {
      id: 'G',
      symbol: 'Γ',
      emoji: '💡',
      title: 'Recognition Creation',
      dim: 'recognition',
      weight: Math.round(dimensionContributions.recognition.intent * 100),
      gap: dimensionContributions.recognition.gap,
      debtUnits: dimensionContributions.recognition.debtUnits
    }
  ].sort((a, b) => b.debtUnits - a.debtUnits); // Sort by debt contribution
  
  // Add factors to structure
  factors.forEach(factor => {
    const effectiveWeight = (factor.weight / 100) * structure.weight;
    
    const node = {
      id: factor.id,
      symbol: factor.symbol,
      emoji: factor.emoji,
      title: factor.title,
      weight: factor.weight,
      parentWeight: structure.weight,
      effectiveWeight: effectiveWeight,
      type: 'latent',
      gap: factor.gap,
      debtUnits: factor.debtUnits,
      children: []
    };
    
    // Add subcategories
    const subcategories = [
      { name: 'Quantification', emoji: '📊', weight: 40 },
      { name: 'Implementation', emoji: '⚙️', weight: 35 },
      { name: 'Validation', emoji: '✅', weight: 25 }
    ];
    
    subcategories.forEach(subcat => {
      const subcatEffectiveWeight = (subcat.weight / 100) * effectiveWeight;
      
      node.children.push({
        id: `${factor.id}.${subcat.name.charAt(0)}`,
        symbol: subcat.name.charAt(0),
        emoji: subcat.emoji,
        title: subcat.name,
        weight: subcat.weight,
        parentWeight: factor.weight,
        effectiveWeight: subcatEffectiveWeight,
        type: 'category',
        debtUnits: Math.round((subcat.weight / 100) * factor.debtUnits),
        children: []
      });
    });
    
    structure.children.push(node);
  });
  
  return structure;
}

// Flatten ShortLex for display
function flattenShortLex(node, path = [], items = []) {
  const pathString = path.length === 0 
    ? node.symbol + node.emoji 
    : path.join('.') + '.' + node.symbol + node.emoji;
  
  items.push({
    node,
    path: [...path],
    pathString,
    depth: path.length,
    type: node.type
  });
  
  if (node.children) {
    node.children.forEach(child => {
      flattenShortLex(child, [...path, node.symbol + node.emoji], items);
    });
  }
  
  return items;
}

// Generate comprehensive HTML
async function generateComponentHTML(debtComponents, gitInfo, shortlexStructure) {
  const shortlexItems = flattenShortLex(shortlexStructure);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt: ${debtComponents.totalDebt} Units - Component Analysis</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'SF Pro Display', -apple-system, sans-serif;
            background: #0f0f23;
            color: #e2e8f0;
            line-height: 1.7;
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, 
                ${debtComponents.isInsurable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'} 0%, 
                rgba(0, 0, 0, 0.8) 100%);
            padding: 60px 20px;
            text-align: center;
            border-bottom: 2px solid ${debtComponents.isInsurable ? '#10b981' : '#ef4444'};
        }

        .debt-display {
            font-size: 7rem;
            font-weight: 900;
            color: ${debtComponents.isInsurable ? '#10b981' : '#ef4444'};
            margin: 20px 0;
            text-shadow: 0 0 60px currentColor;
        }

        .debt-breakdown {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin: 30px 0;
            flex-wrap: wrap;
        }

        .debt-component {
            text-align: center;
            padding: 20px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 12px;
            min-width: 150px;
        }

        .component-value {
            font-size: 2.5rem;
            font-weight: 900;
            margin: 10px 0;
        }

        .component-label {
            color: #94a3b8;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .insurability-status {
            font-size: 1.5rem;
            padding: 15px 40px;
            background: ${debtComponents.isInsurable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
            border: 2px solid ${debtComponents.isInsurable ? '#10b981' : '#ef4444'};
            border-radius: 12px;
            display: inline-block;
            margin: 20px 0;
        }

        /* Story Section */
        .story {
            max-width: 1600px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        .section-title {
            font-size: 2rem;
            color: #8b5cf6;
            margin: 40px 0 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(139, 92, 246, 0.3);
        }

        /* Dimension Analysis */
        .dimension-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            margin: 30px 0;
        }

        .dimension-card {
            background: rgba(30, 41, 59, 0.6);
            border-radius: 16px;
            padding: 25px;
            border: 2px solid transparent;
            position: relative;
            overflow: hidden;
        }

        .dimension-card.trust { border-color: rgba(139, 92, 246, 0.3); }
        .dimension-card.timing { border-color: rgba(236, 72, 153, 0.3); }
        .dimension-card.recognition { border-color: rgba(6, 255, 165, 0.3); }

        .dimension-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .dimension-title {
            font-size: 1.5rem;
            font-weight: 700;
        }

        .dimension-debt {
            font-size: 2rem;
            font-weight: 900;
            color: #ef4444;
        }

        .intent-reality-comparison {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
        }

        .intent-block, .reality-block {
            flex: 1;
            text-align: center;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
        }

        .intent-block {
            border: 2px solid rgba(16, 185, 129, 0.3);
        }

        .reality-block {
            border: 2px solid rgba(239, 68, 68, 0.3);
        }

        .percentage-display {
            font-size: 2.5rem;
            font-weight: 900;
            margin: 10px 0;
        }

        .gap-indicator {
            background: rgba(245, 158, 11, 0.2);
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 10px;
            margin-top: 15px;
            text-align: center;
        }

        /* ShortLex Breakdown */
        .shortlex-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .shortlex-table th {
            background: rgba(139, 92, 246, 0.2);
            padding: 12px;
            text-align: left;
            font-weight: 700;
        }

        .shortlex-table td {
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .shortlex-table tr:hover {
            background: rgba(139, 92, 246, 0.05);
        }

        .path-cell {
            font-family: 'SF Mono', monospace;
            font-weight: 600;
        }

        .debt-contribution {
            text-align: right;
            font-weight: 900;
            color: #ef4444;
        }

        /* Document Misalignments */
        .document-misalignments {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }

        .misalignment-card {
            background: rgba(239, 68, 68, 0.1);
            border: 2px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }

        .misalignment-score {
            font-size: 3rem;
            font-weight: 900;
            color: #ef4444;
            margin: 10px 0;
        }

        .misalignment-details {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid rgba(239, 68, 68, 0.2);
        }

        .vector-display {
            display: flex;
            justify-content: space-around;
            margin: 10px 0;
        }

        .vector-component {
            text-align: center;
        }

        .vector-label {
            font-size: 0.8rem;
            color: #94a3b8;
            text-transform: uppercase;
        }

        .vector-value {
            font-size: 1.2rem;
            font-weight: 700;
            margin-top: 5px;
        }

        /* Git Section */
        .git-section {
            background: rgba(30, 41, 59, 0.6);
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
        }

        .commit {
            background: rgba(0, 0, 0, 0.4);
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            border-left: 3px solid #8b5cf6;
        }

        .commit:hover {
            background: rgba(0, 0, 0, 0.6);
            transform: translateX(5px);
        }

        .commit-header {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .commit-hash {
            background: #8b5cf6;
            color: white;
            padding: 3px 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9rem;
        }

        .commit-body {
            display: none;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: #94a3b8;
            white-space: pre-wrap;
            font-size: 0.95rem;
            line-height: 1.6;
        }

        .commit.expanded .commit-body {
            display: block;
        }

        .expand-indicator {
            margin-left: auto;
            transition: transform 0.3s;
        }

        .commit.expanded .expand-indicator {
            transform: rotate(180deg);
        }

        .timestamp {
            color: #64748b;
            font-size: 0.9rem;
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
    </style>
    <script>
        function toggleCommit(element) {
            element.classList.toggle('expanded');
        }
    </script>
</head>
<body>
    <!-- Hero: The Result -->
    <div class="hero">
        <h1 style="font-size: 1.5rem; color: #94a3b8; margin-bottom: 10px;">Current Trust Debt</h1>
        <div class="debt-display">${debtComponents.totalDebt}</div>
        <div style="font-size: 1.5rem; color: #f59e0b; margin-bottom: 20px;">TRUST DEBT UNITS</div>
        
        <!-- Breakdown -->
        <div class="debt-breakdown">
            <div class="debt-component">
                <div class="component-value" style="color: #ef4444;">${debtComponents.baseDebt}</div>
                <div class="component-label">Intent Gap</div>
            </div>
            <div class="debt-component">
                <div class="component-value" style="color: #f59e0b;">${debtComponents.specAgePenalty}</div>
                <div class="component-label">Spec Age (${gitInfo.specAge.toFixed(0)}d)</div>
            </div>
            <div class="debt-component">
                <div class="component-value" style="color: #8b5cf6;">${debtComponents.driftAccumulation}</div>
                <div class="component-label">Drift (${gitInfo.hoursSinceCommit.toFixed(1)}h)</div>
            </div>
        </div>
        
        <div class="insurability-status">
            ${debtComponents.isInsurable ? '✅ INSURABLE' : `❌ NOT INSURABLE (Gap: ${debtComponents.insurabilityGap.toFixed(0)}%)`}
        </div>
    </div>

    <!-- The Story -->
    <div class="story">
        <!-- Dimension Analysis -->
        <h2 class="section-title">📊 Intent vs Reality Analysis</h2>
        <div class="dimension-grid">
            ${['trust', 'timing', 'recognition'].map(dim => {
              const data = debtComponents.dimensionContributions[dim];
              const emoji = dim === 'trust' ? '🏛️' : dim === 'timing' ? '⏰' : '💡';
              const title = dim === 'trust' ? 'Trust Foundation' : dim === 'timing' ? 'Strategic Timing' : 'Recognition Creation';
              
              return `
              <div class="dimension-card ${dim}">
                <div class="dimension-header">
                  <div class="dimension-title">${emoji} ${title}</div>
                  <div class="dimension-debt">${data.debtUnits}</div>
                </div>
                
                <div class="intent-reality-comparison">
                  <div class="intent-block">
                    <div class="component-label">Intent</div>
                    <div class="percentage-display" style="color: #10b981;">
                      ${(data.intent * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div class="reality-block">
                    <div class="component-label">Reality</div>
                    <div class="percentage-display" style="color: #ef4444;">
                      ${(data.reality * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                
                <div class="gap-indicator">
                  <strong>Gap:</strong> ${(Math.abs(data.gap) * 100).toFixed(1)}% ${data.gap > 0 ? 'under' : 'over'}-emphasis
                </div>
              </div>
              `;
            }).join('')}
        </div>

        <!-- ShortLex Breakdown -->
        <h2 class="section-title">🎯 ShortLex Priority Breakdown</h2>
        <div style="background: rgba(139, 92, 246, 0.05); border: 2px solid rgba(139, 92, 246, 0.2); border-radius: 16px; padding: 30px; margin: 30px 0;">
            <p style="color: #94a3b8; margin-bottom: 20px;">
                Each component's contribution to Trust Debt, with parent-relative percentages:
            </p>
            
            <table class="shortlex-table">
                <thead>
                    <tr>
                        <th>Path</th>
                        <th>Priority</th>
                        <th>Weight (% of parent)</th>
                        <th>Effective Weight</th>
                        <th>Debt Units</th>
                    </tr>
                </thead>
                <tbody>
                    ${shortlexItems.map(item => {
                      const colorClass = item.node.type === 'outcome' ? '#ffd700' :
                                        item.node.type === 'latent' ? '#8b5cf6' :
                                        item.node.type === 'category' ? '#ec4899' : '#06ffa5';
                      
                      return `
                      <tr>
                        <td class="path-cell" style="color: ${colorClass};">${item.pathString}</td>
                        <td>${item.node.title}</td>
                        <td style="text-align: center; font-weight: 700;">
                          ${item.node.weight}%
                        </td>
                        <td style="text-align: center;">
                          ${item.node.effectiveWeight ? item.node.effectiveWeight.toFixed(1) : '100.0'}%
                        </td>
                        <td class="debt-contribution">
                          ${item.node.debtUnits || 0}
                        </td>
                      </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <!-- Document Misalignments -->
        <h2 class="section-title">🚨 Document Misalignments</h2>
        <div class="document-misalignments">
            ${debtComponents.documentAnalyses.map(doc => {
              const gap = 70 - (100 - (doc.analysis.total / 10));
              const isBelow = gap > 0;
              
              return `
              <div class="misalignment-card">
                <h3 style="color: #fff; margin-bottom: 10px; font-size: 1.1rem;">
                  ${path.basename(doc.fingerprint.path)}
                </h3>
                <div class="misalignment-score">${Math.abs(gap).toFixed(0)}%</div>
                <div style="color: #f59e0b; font-size: 0.9rem;">
                  ${isBelow ? 'Below threshold' : 'Above threshold'}
                </div>
                
                <div class="misalignment-details">
                  <div class="vector-display">
                    <div class="vector-component">
                      <div class="vector-label">Trust</div>
                      <div class="vector-value" style="color: #8b5cf6;">
                        ${(doc.vector.trust * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div class="vector-component">
                      <div class="vector-label">Timing</div>
                      <div class="vector-value" style="color: #ec4899;">
                        ${(doc.vector.timing * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div class="vector-component">
                      <div class="vector-label">Recog</div>
                      <div class="vector-value" style="color: #06ffa5;">
                        ${(doc.vector.recognition * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              `;
            }).join('')}
        </div>

        <!-- Git Information -->
        <h2 class="section-title">📊 Git Repository Information</h2>
        <div class="git-section">
            <p><strong>Branch:</strong> ${gitInfo.branch}</p>
            <p><strong>Status:</strong> ${gitInfo.clean ? '✅ Clean' : `⚠️ ${gitInfo.modifiedFiles} modified files`}</p>
            <p><strong>Spec Age:</strong> ${gitInfo.specAge.toFixed(0)} days (${(gitInfo.specAge * SPEC_AGE_PENALTY * 100).toFixed(1)} units penalty)</p>
            
            <h3 style="margin: 20px 0 10px; color: #8b5cf6;">Recent Commits (click to expand)</h3>
            ${gitInfo.commits.map(commit => `
            <div class="commit" onclick="toggleCommit(this)">
                <div class="commit-header">
                    <span class="commit-hash">${commit.hash}</span>
                    <span style="flex: 1;">${commit.subject}</span>
                    <span class="expand-indicator">▼</span>
                </div>
                <div class="commit-body">${commit.body || 'No additional details'}</div>
            </div>
            `).join('')}
        </div>
    </div>

    <div class="timestamp">
        Generated: ${new Date().toISOString()}<br>
        L2 Distance: ${debtComponents.l2Distance.toFixed(4)} • Trust Debt Score: ${debtComponents.trustDebtScore.toFixed(1)}/100
    </div>
</body>
</html>`;

  return html;
}

// Main execution
async function main() {
  console.log('🎯 Trust Debt Component Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Get git information
    console.log('\n📊 Analyzing repository...');
    const gitInfo = getGitInfo();
    console.log(`  Spec age: ${gitInfo.specAge.toFixed(0)} days`);
    console.log(`  Hours since commit: ${gitInfo.hoursSinceCommit.toFixed(1)}`);
    
    // 2. Analyze documents
    console.log('\n📄 Processing documents...');
    const docsToAnalyze = [
      path.join(__dirname, '..', 'CLAUDE.md'),
      path.join(__dirname, '..', 'README.md')
    ];
    
    const weekFiles = fsSync.readdirSync(path.join(__dirname, '..'))
      .filter(f => f.startsWith('WEEK_') && f.endsWith('.md'))
      .map(f => path.join(__dirname, '..', f));
    
    docsToAnalyze.push(...weekFiles.slice(0, 3));
    
    const documents = [];
    for (const docPath of docsToAnalyze) {
      if (fsSync.existsSync(docPath)) {
        console.log(`  Analyzing: ${path.basename(docPath)}`);
        const content = await fs.readFile(docPath, 'utf-8');
        const fingerprint = {
          path: docPath,
          short: crypto.createHash('sha256').update(content).digest('hex').substring(0, 8)
        };
        
        documents.push({
          fingerprint,
          content
        });
      }
    }
    
    // 3. Calculate Trust Debt components
    console.log('\n⚙️ Calculating Trust Debt components...');
    const debtComponents = calculateTrustDebtComponents(documents, gitInfo);
    console.log(`  Total Debt: ${debtComponents.totalDebt} units`);
    console.log(`  Base (Intent Gap): ${debtComponents.baseDebt} units`);
    console.log(`  Spec Age Penalty: ${debtComponents.specAgePenalty} units`);
    console.log(`  Drift Accumulation: ${debtComponents.driftAccumulation} units`);
    
    // 4. Build ShortLex structure
    console.log('\n🧠 Building ShortLex breakdown...');
    const shortlexStructure = buildShortLexStructure(debtComponents);
    
    // 5. Generate HTML
    console.log('\n🎨 Generating visualization...');
    const htmlContent = await generateComponentHTML(debtComponents, gitInfo, shortlexStructure);
    const htmlPath = path.join(__dirname, '..', `trust-debt-components-${Date.now()}.html`);
    await fs.writeFile(htmlPath, htmlContent);
    console.log(`✅ Created: ${path.basename(htmlPath)}`);
    
    // 6. Open HTML
    console.log('\n🌐 Opening visualization...');
    try {
      execSync(`open "${htmlPath}"`, { stdio: 'ignore' });
      console.log('✅ Opened in browser');
    } catch (error) {
      console.log(`📖 View at: ${htmlPath}`);
    }
    
    // 7. Generate prompt
    const prompt = `# 🚨 Trust Debt Component Analysis: ${debtComponents.totalDebt} Units

## Breakdown
- **Intent Gap**: ${debtComponents.baseDebt} units (L2 distance: ${debtComponents.l2Distance.toFixed(4)})
- **Spec Age**: ${debtComponents.specAgePenalty} units (${gitInfo.specAge.toFixed(0)} days old)
- **Drift**: ${debtComponents.driftAccumulation} units (${gitInfo.hoursSinceCommit.toFixed(1)} hours)

## Dimension Analysis
${Object.entries(debtComponents.dimensionContributions).map(([dim, data]) => `
### ${dim.charAt(0).toUpperCase() + dim.slice(1)}
- Intent: ${(data.intent * 100).toFixed(0)}%
- Reality: ${(data.reality * 100).toFixed(0)}%
- Gap: ${(Math.abs(data.gap) * 100).toFixed(1)}%
- Debt Units: ${data.debtUnits}`).join('\n')}

## Status
- **Trust Debt Score**: ${debtComponents.trustDebtScore.toFixed(1)}/100
- **Insurable**: ${debtComponents.isInsurable ? 'YES ✅' : `NO ❌ (Gap: ${debtComponents.insurabilityGap.toFixed(0)}%)`}

## Action Required
${debtComponents.isInsurable ? 
  '1. Maintain Trust Debt below 300 units\n2. Regular commits to prevent drift\n3. Keep spec updated' :
  '1. **URGENT**: Reduce Intent Gap\n2. Focus on under-emphasized dimensions\n3. Update spec if too old\n4. Commit changes to reset drift'}

Visualization opened in browser.`;
    
    // 8. Launch Claude
    console.log('\n🚀 Launching Claude...');
    try {
      execSync(`claude "${prompt}"`, { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
    } catch (error) {
      console.log('💡 Ready for analysis');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  calculateTrustDebtComponents,
  buildShortLexStructure,
  analyzeContentVectors
};