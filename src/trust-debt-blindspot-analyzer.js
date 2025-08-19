#!/usr/bin/env node

/**
 * Trust Debt Blind Spot Analyzer
 * Identifies and analyzes critical blind spots in the reality-intent matrix
 * Shows full category labels and substantiates findings with evidence
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BlindSpotAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.categoriesFile = path.join(this.projectRoot, 'trust-debt-categories.json');
    this.analysisFile = path.join(this.projectRoot, 'trust-debt-analysis.json');
    this.categories = this.loadCategories();
    this.categoryMap = this.buildCategoryMap();
  }

  /**
   * Load categories from file
   */
  loadCategories() {
    if (fs.existsSync(this.categoriesFile)) {
      return JSON.parse(fs.readFileSync(this.categoriesFile, 'utf8'));
    }
    return null;
  }

  /**
   * Build a map of paths to full category information
   */
  buildCategoryMap() {
    const map = new Map();
    
    const traverse = (node, path = '') => {
      const fullPath = path ? `${path}.${node.symbol}${node.emoji}` : `${node.symbol}${node.emoji}`;
      map.set(fullPath, {
        id: node.id,
        title: node.title,
        description: node.description,
        type: node.type,
        weight: node.weight,
        path: fullPath,
        depth: (fullPath.match(/\./g) || []).length,
        sourcePaths: node.sourcePaths || []
      });
      
      if (node.children) {
        node.children.forEach(child => traverse(child, fullPath));
      }
    };
    
    if (this.categories && this.categories.root) {
      traverse(this.categories.root);
    }
    
    return map;
  }

  /**
   * Analyze blind spots with full substantiation
   */
  analyzeBlindSpots(matrixData) {
    const blindSpots = [];
    
    // Identify diagonal elements (self-interactions) that are critical
    for (const [key, value] of Object.entries(matrixData)) {
      const [intent, reality] = key.split(' × ');
      
      if (intent === reality) {
        // This is a diagonal element
        const percentage = value;
        const categoryInfo = this.categoryMap.get(intent) || this.categoryMap.get(reality);
        
        if (percentage < 20) { // Critical threshold
          blindSpots.push({
            type: 'diagonal',
            categories: { intent, reality },
            percentage,
            categoryInfo,
            severity: this.calculateSeverity(percentage),
            evidence: this.gatherEvidence(intent, reality, percentage),
            narrative: this.generateNarrative(intent, reality, percentage, categoryInfo),
            recommendations: this.generateRecommendations(intent, reality, percentage, categoryInfo)
          });
        }
      } else {
        // Check for off-diagonal blind spots
        if (value < 5 && this.areRelated(intent, reality)) {
          const intentInfo = this.categoryMap.get(intent);
          const realityInfo = this.categoryMap.get(reality);
          
          blindSpots.push({
            type: 'off-diagonal',
            categories: { intent, reality },
            percentage: value,
            categoryInfo: { intentInfo, realityInfo },
            severity: this.calculateSeverity(value),
            evidence: this.gatherEvidence(intent, reality, value),
            narrative: this.generateNarrative(intent, reality, value, { intentInfo, realityInfo }),
            recommendations: this.generateRecommendations(intent, reality, value, { intentInfo, realityInfo })
          });
        }
      }
    }
    
    return blindSpots.sort((a, b) => a.percentage - b.percentage); // Most critical first
  }

  /**
   * Calculate severity of blind spot
   */
  calculateSeverity(percentage) {
    if (percentage < 5) return 'CRITICAL';
    if (percentage < 10) return 'HIGH';
    if (percentage < 20) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Check if two categories are related
   */
  areRelated(path1, path2) {
    // Check if they share a parent
    const parts1 = path1.split('.');
    const parts2 = path2.split('.');
    
    if (parts1.length > 1 && parts2.length > 1) {
      return parts1[0] === parts2[0]; // Same root
    }
    return false;
  }

  /**
   * Gather evidence for the blind spot
   */
  gatherEvidence(intent, reality, percentage) {
    const evidence = {
      commits: [],
      files: [],
      documentation: [],
      gaps: []
    };
    
    // Analyze recent commits
    try {
      const gitLog = execSync('git log --oneline -20', { encoding: 'utf8' });
      const commits = gitLog.trim().split('\n');
      
      commits.forEach(commit => {
        const [hash, ...messageParts] = commit.split(' ');
        const message = messageParts.join(' ').toLowerCase();
        
        // Check if commit relates to this category
        if (this.commitMatchesCategory(message, intent) || 
            this.commitMatchesCategory(message, reality)) {
          evidence.commits.push({
            hash: hash.substring(0, 7),
            message: messageParts.join(' '),
            matches: intent === reality ? intent : `${intent} or ${reality}`
          });
        }
      });
    } catch (e) {
      // Ignore git errors
    }
    
    // Identify documentation gaps
    const categoryInfo = this.categoryMap.get(intent) || this.categoryMap.get(reality);
    if (categoryInfo) {
      if (!categoryInfo.sourcePaths || categoryInfo.sourcePaths.length === 0) {
        evidence.gaps.push('No documentation sources defined for this category');
      }
      
      if (categoryInfo.weight && percentage < categoryInfo.weight / 2) {
        evidence.gaps.push(`Reality (${percentage}%) far below intended weight (${categoryInfo.weight}%)`);
      }
    }
    
    // Check for implementation files
    if (categoryInfo && categoryInfo.sourcePaths) {
      categoryInfo.sourcePaths.forEach(sourcePath => {
        const fullPath = path.join(this.projectRoot, sourcePath);
        if (!fs.existsSync(fullPath)) {
          evidence.files.push({
            path: sourcePath,
            status: 'MISSING',
            impact: 'Implementation not found'
          });
        } else {
          const stats = fs.statSync(fullPath);
          const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceModified > 30) {
            evidence.files.push({
              path: sourcePath,
              status: 'STALE',
              impact: `Not modified in ${Math.floor(daysSinceModified)} days`
            });
          }
        }
      });
    }
    
    return evidence;
  }

  /**
   * Check if commit message matches category
   */
  commitMatchesCategory(message, categoryPath) {
    const categoryInfo = this.categoryMap.get(categoryPath);
    if (!categoryInfo) return false;
    
    const keywords = [
      categoryInfo.id.toLowerCase(),
      categoryInfo.title.toLowerCase(),
      ...categoryPath.toLowerCase().split('.').map(p => p.replace(/[^a-z]/g, ''))
    ];
    
    return keywords.some(keyword => message.includes(keyword));
  }

  /**
   * Generate narrative analysis
   */
  generateNarrative(intent, reality, percentage, categoryInfo) {
    const narratives = [];
    
    if (intent === reality) {
      // Diagonal blind spot
      const info = categoryInfo;
      narratives.push({
        type: 'self-alignment',
        headline: `${info?.title || intent} is critically misaligned with itself`,
        analysis: `At only ${percentage}% alignment, this category is failing to achieve its own goals. This suggests either the specification is unrealistic or implementation has been abandoned.`,
        impact: this.calculateImpact(info, percentage)
      });
    } else {
      // Off-diagonal blind spot
      const { intentInfo, realityInfo } = categoryInfo;
      narratives.push({
        type: 'cross-alignment',
        headline: `${intentInfo?.title || intent} and ${realityInfo?.title || reality} are disconnected`,
        analysis: `These related categories show only ${percentage}% interaction, suggesting siloed development and missed synergies.`,
        impact: this.calculateCrossImpact(intentInfo, realityInfo, percentage)
      });
    }
    
    // Add specific observations
    if (percentage < 5) {
      narratives.push({
        type: 'critical',
        headline: 'Near-zero implementation detected',
        analysis: 'This represents a complete breakdown in the feedback loop. The category exists in documentation but not in reality.',
        impact: 'Trust Debt will compound exponentially until addressed'
      });
    } else if (percentage < 10) {
      narratives.push({
        type: 'warning',
        headline: 'Minimal viable implementation',
        analysis: 'Some effort exists but far below critical mass. This is the danger zone where teams think they\'re making progress but aren\'t.',
        impact: 'High risk of feature abandonment'
      });
    }
    
    return narratives;
  }

  /**
   * Calculate impact of blind spot
   */
  calculateImpact(categoryInfo, percentage) {
    if (!categoryInfo) return 'Unknown impact';
    
    const weight = categoryInfo.weight || 0;
    const gap = Math.abs(weight - percentage);
    const multiplicativeImpact = (percentage / 100) * (weight / 100);
    
    return {
      description: `${categoryInfo.title} operating at ${(multiplicativeImpact * 100).toFixed(1)}% effectiveness`,
      trustDebtContribution: Math.floor(gap * gap * 0.5),
      velocityPenalty: `${Math.max(0, 100 - percentage)}% slower development`,
      riskLevel: percentage < 10 ? 'UNINSURABLE' : percentage < 30 ? 'HIGH RISK' : 'MODERATE'
    };
  }

  /**
   * Calculate cross-impact between categories
   */
  calculateCrossImpact(intentInfo, realityInfo, percentage) {
    const intentWeight = intentInfo?.weight || 0;
    const realityWeight = realityInfo?.weight || 0;
    const expectedInteraction = (intentWeight * realityWeight) / 100;
    const actualInteraction = percentage;
    const gap = Math.abs(expectedInteraction - actualInteraction);
    
    return {
      description: `Expected ${expectedInteraction.toFixed(1)}% interaction, actual ${actualInteraction}%`,
      synergyLoss: `Missing ${gap.toFixed(1)}% of potential synergy`,
      architecturalDebt: gap > 20 ? 'Significant architectural misalignment' : 'Moderate coupling issues'
    };
  }

  /**
   * Generate specific recommendations
   */
  generateRecommendations(intent, reality, percentage, categoryInfo) {
    const recommendations = [];
    
    if (percentage < 5) {
      recommendations.push({
        priority: 'IMMEDIATE',
        action: 'Emergency intervention required',
        specific: [
          `Assign dedicated owner to ${categoryInfo?.title || intent}`,
          'Create implementation roadmap within 48 hours',
          'Set daily check-ins until above 20% threshold',
          'Consider if this category should be deprecated'
        ]
      });
    }
    
    if (percentage < 10) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Rapid improvement needed',
        specific: [
          `Increase commit frequency for ${categoryInfo?.title || intent}`,
          'Add automated tests to prevent regression',
          'Document quick wins to build momentum',
          'Set 30-day target to reach 30% alignment'
        ]
      });
    }
    
    if (intent === reality) {
      recommendations.push({
        priority: 'STRUCTURAL',
        action: 'Fix self-alignment',
        specific: [
          'Review if documentation matches actual needs',
          'Validate weight allocation is correct',
          'Check for circular dependencies',
          'Ensure clear ownership and accountability'
        ]
      });
    }
    
    return recommendations;
  }

  /**
   * Generate HTML section for blind spots
   */
  generateBlindSpotSection(matrixData) {
    const blindSpots = this.analyzeBlindSpots(matrixData);
    
    return `
    <!-- Critical Blind Spots Analysis -->
    <div style="
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(0, 0, 0, 0.9));
      border: 3px solid #ef4444;
      border-radius: 20px;
      padding: 40px;
      margin: 40px 0;
    ">
      <h2 style="color: #ef4444; font-size: 2.2rem; margin-bottom: 35px; text-align: center;">
        🚨 Critical Blind Spots Analysis
      </h2>
      
      <div style="
        background: rgba(0, 0, 0, 0.5);
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 30px;
      ">
        <h3 style="color: #fbbf24; margin-bottom: 15px;">Substantiation Methodology</h3>
        <div style="color: #e2e8f0; font-size: 0.9rem; line-height: 1.6;">
          We analyze the reality-intent matrix to identify:
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Diagonal Blind Spots</strong>: Categories failing to achieve their own goals (self-alignment < 20%)</li>
            <li><strong>Off-Diagonal Gaps</strong>: Related categories with broken interactions (cross-alignment < 5%)</li>
            <li><strong>Evidence Gathering</strong>: Git commits, file analysis, documentation coverage</li>
            <li><strong>Impact Calculation</strong>: Trust Debt contribution, velocity penalties, risk assessment</li>
          </ul>
        </div>
      </div>
      
      ${blindSpots.map((spot, index) => `
        <div style="
          background: ${spot.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'};
          border: 2px solid ${spot.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'};
          border-radius: 15px;
          padding: 30px;
          margin-bottom: 25px;
        ">
          <!-- Header with full category information -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: ${spot.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'}; font-size: 1.6rem; margin-bottom: 10px;">
              ${index + 1}. ${spot.type === 'diagonal' ? '⚠️ DIAGONAL' : '🔄 CROSS-CATEGORY'} BLIND SPOT
            </h3>
            <div style="font-size: 1.3rem; color: #e2e8f0; margin-bottom: 10px;">
              ${spot.categoryInfo?.title ? `
                <strong>${spot.categories.intent}</strong>: ${spot.categoryInfo.title}
                ${spot.categoryInfo.description ? `<br><span style="color: #94a3b8; font-size: 0.9rem;">${spot.categoryInfo.description}</span>` : ''}
              ` : `
                <strong>Intent</strong>: ${spot.categoryInfo?.intentInfo?.title || spot.categories.intent}<br>
                <strong>Reality</strong>: ${spot.categoryInfo?.realityInfo?.title || spot.categories.reality}
              `}
            </div>
            <div style="
              display: inline-block;
              padding: 8px 20px;
              background: ${spot.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'};
              color: white;
              border-radius: 20px;
              font-weight: bold;
              font-size: 1.2rem;
            ">
              ${spot.percentage}% Alignment - ${spot.severity}
            </div>
          </div>
          
          <!-- Narrative Analysis -->
          <div style="margin-bottom: 25px;">
            <h4 style="color: #60a5fa; margin-bottom: 15px;">📖 Narrative Analysis</h4>
            ${spot.narrative.map(n => `
              <div style="
                background: rgba(0, 0, 0, 0.3);
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 10px;
              ">
                <strong style="color: #fbbf24;">${n.headline}</strong>
                <div style="color: #e2e8f0; margin-top: 8px; font-size: 0.95rem; line-height: 1.6;">
                  ${n.analysis}
                </div>
                ${n.impact ? `
                  <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #374151;">
                    ${typeof n.impact === 'object' ? `
                      <div style="color: #94a3b8; font-size: 0.9rem;">
                        <strong>Impact:</strong><br>
                        • ${n.impact.description || ''}<br>
                        ${n.impact.trustDebtContribution ? `• Trust Debt: +${n.impact.trustDebtContribution} units<br>` : ''}
                        ${n.impact.velocityPenalty ? `• Velocity: ${n.impact.velocityPenalty}<br>` : ''}
                        ${n.impact.riskLevel ? `• Risk: <span style="color: ${n.impact.riskLevel === 'UNINSURABLE' ? '#ef4444' : '#f59e0b'}">${n.impact.riskLevel}</span>` : ''}
                      </div>
                    ` : `
                      <div style="color: #94a3b8; font-size: 0.9rem;">
                        <strong>Impact:</strong> ${n.impact}
                      </div>
                    `}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
          
          <!-- Evidence Section -->
          <div style="margin-bottom: 25px;">
            <h4 style="color: #60a5fa; margin-bottom: 15px;">🔍 Supporting Evidence</h4>
            
            ${spot.evidence.commits.length > 0 ? `
              <div style="margin-bottom: 15px;">
                <h5 style="color: #10b981; margin-bottom: 10px;">Recent Commits</h5>
                <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 8px;">
                  ${spot.evidence.commits.slice(0, 3).map(commit => `
                    <div style="margin-bottom: 8px;">
                      <code style="color: #60a5fa;">${commit.hash}</code>
                      <span style="color: #e2e8f0;">: ${commit.message}</span>
                    </div>
                  `).join('')}
                  ${spot.evidence.commits.length === 0 ? '<span style="color: #ef4444;">No related commits found in last 20 commits</span>' : ''}
                </div>
              </div>
            ` : ''}
            
            ${spot.evidence.files.length > 0 ? `
              <div style="margin-bottom: 15px;">
                <h5 style="color: #10b981; margin-bottom: 10px;">File Analysis</h5>
                <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 8px;">
                  ${spot.evidence.files.map(file => `
                    <div style="margin-bottom: 8px;">
                      <span style="color: ${file.status === 'MISSING' ? '#ef4444' : '#f59e0b'};">[${file.status}]</span>
                      <code style="color: #60a5fa;">${file.path}</code>
                      <span style="color: #94a3b8;">- ${file.impact}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${spot.evidence.gaps.length > 0 ? `
              <div style="margin-bottom: 15px;">
                <h5 style="color: #10b981; margin-bottom: 10px;">Identified Gaps</h5>
                <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 8px;">
                  ${spot.evidence.gaps.map(gap => `
                    <div style="color: #ef4444; margin-bottom: 5px;">• ${gap}</div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
          
          <!-- Recommendations -->
          <div>
            <h4 style="color: #60a5fa; margin-bottom: 15px;">💡 Recommendations</h4>
            ${spot.recommendations.map(rec => `
              <div style="
                background: rgba(16, 185, 129, 0.1);
                border: 1px solid #10b981;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 10px;
              ">
                <div style="
                  display: inline-block;
                  padding: 4px 12px;
                  background: ${rec.priority === 'IMMEDIATE' ? '#ef4444' : rec.priority === 'HIGH' ? '#f59e0b' : '#10b981'};
                  color: white;
                  border-radius: 12px;
                  font-size: 0.85rem;
                  font-weight: bold;
                  margin-bottom: 10px;
                ">
                  ${rec.priority}
                </div>
                <div style="color: #10b981; font-weight: bold; margin-bottom: 8px;">
                  ${rec.action}
                </div>
                <ul style="color: #e2e8f0; margin: 0; padding-left: 20px; font-size: 0.9rem;">
                  ${rec.specific.map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
      
      ${blindSpots.length === 0 ? `
        <div style="text-align: center; padding: 40px; background: rgba(16, 185, 129, 0.1); border-radius: 12px;">
          <div style="color: #10b981; font-size: 1.5rem; margin-bottom: 10px;">
            ✅ No Critical Blind Spots Detected
          </div>
          <div style="color: #e2e8f0;">
            All categories show healthy alignment between intent and reality.
          </div>
        </div>
      ` : ''}
    </div>
    `;
  }
}

module.exports = { BlindSpotAnalyzer };

// CLI test
if (require.main === module) {
  const analyzer = new BlindSpotAnalyzer();
  
  // Mock matrix data for testing
  const testMatrix = {
    'O🎯.Α📏 × O🎯.Α📏': 3,
    'O🎯.Α📏.D📊 × O🎯.Α📏.D📊': 5,
    'O🎯.Β🎨.A📈 × O🎯.Β🎨.A📈': 10,
    'O🎯.Β🎨 × O🎯.Α📏': 25,
    'O🎯.Γ⚖️ × O🎯.Γ⚖️': 15
  };
  
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>Blind Spot Analysis</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, sans-serif;
            background: #0f0f23;
            color: #e2e8f0;
            padding: 20px;
        }
    </style>
</head>
<body>
    ${analyzer.generateBlindSpotSection(testMatrix)}
</body>
</html>`;
  
  fs.writeFileSync('trust-debt-blindspot-analysis.html', html);
  console.log('✅ Blind spot analysis generated');
}