#!/usr/bin/env node

/**
 * Trust Debt MVP Analysis - Working Backwards from Result
 * 
 * Shows:
 * 1. Trust Debt accumulation (units, not just %)
 * 2. Misalignment with latent factors
 * 3. Git and ShortLex as evidence/story
 * 4. Reliable after each Claude session
 * 
 * Usage: pnpm t:week
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { FIMTrustDebtAnalyzer } = require('./trust-debt-fim-analyzer');

// Trust Debt accumulation rate from patent
const DAILY_DRIFT_RATE = 0.003; // 0.3% daily
const HOURLY_DRIFT_RATE = DAILY_DRIFT_RATE / 24;

// Get proper git commit messages
function getGitInfo() {
  try {
    // Get last 5 commits with FULL messages - use separator that won't appear in commits
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
        console.error(`Error getting commit ${hash}:`, e.message);
      }
    }
    
    // Get branch and status
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const modifiedFiles = status.split('\n').filter(line => line.trim()).length;
    
    // Calculate hours since last commit
    const lastCommitTime = commits[0] ? new Date(commits[0].timestamp) : new Date();
    const hoursSinceCommit = (Date.now() - lastCommitTime.getTime()) / (1000 * 60 * 60);
    
    return {
      branch,
      commits,
      modifiedFiles,
      clean: modifiedFiles === 0,
      hoursSinceCommit,
      driftSinceCommit: hoursSinceCommit * HOURLY_DRIFT_RATE * 100 // As percentage
    };
  } catch (error) {
    console.error('Git error:', error.message);
    return {
      branch: 'unknown',
      commits: [],
      modifiedFiles: 0,
      clean: true,
      hoursSinceCommit: 0,
      driftSinceCommit: 0
    };
  }
}

// Generate document fingerprint
function generateFingerprint(content, filepath) {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return {
    short: hash.digest('hex').substring(0, 8),
    path: filepath,
    size: Buffer.byteLength(content, 'utf8'),
    lines: content.split('\n').length
  };
}

// Category emojis matching the actual system
const CATEGORY_EMOJIS = {
  // Latent factors
  'trust': '🏛️',
  'timing': '⏰',
  'recognition': '💡',
  
  // Categories under trust
  'quantification': '📊',
  'visibility': '👁️',
  'drift': '📈',
  
  // Categories under timing
  'precision': '🎯',
  'acceleration': '🚀',
  'momentum': '🔄',
  
  // Categories under recognition
  'naming': '🏷️',
  'breakthrough': '✨',
  'reproducibility': '🔁',
  
  // Actions
  'score': '💯',
  'measure': '📏',
  'reveal': '🔍',
  'highlight': '📢',
  'select': '⏱️',
  'brief': '⚡'
};

// Build dynamic ShortLex based on content
function buildContentShortLex(content) {
  const lowerContent = content.toLowerCase();
  
  // Count occurrences of key patterns
  const patterns = {
    trust: {
      count: (lowerContent.match(/trust debt|quantif|score|measur|visible|drift/gi) || []).length,
      categories: {
        quantification: (lowerContent.match(/score|quantif|measur|73\/100/gi) || []).length,
        visibility: (lowerContent.match(/visible|reveal|expose|hidden/gi) || []).length,
        drift: (lowerContent.match(/drift|diverge|gap|misalign/gi) || []).length
      }
    },
    timing: {
      count: (lowerContent.match(/30 second|timing|moment|receptiv|precision/gi) || []).length,
      categories: {
        precision: (lowerContent.match(/precise|exact|perfect timing/gi) || []).length,
        acceleration: (lowerContent.match(/30% faster|accelerat|speed/gi) || []).length,
        momentum: (lowerContent.match(/momentum|compound|accumula/gi) || []).length
      }
    },
    recognition: {
      count: (lowerContent.match(/oh moment|breakthrough|recogni|insight|pattern/gi) || []).length,
      categories: {
        naming: (lowerContent.match(/pattern nam|thursday panic|memorable/gi) || []).length,
        breakthrough: (lowerContent.match(/breakthrough|revelation|insight/gi) || []).length,
        reproducibility: (lowerContent.match(/reproduc|consistent|reliable/gi) || []).length
      }
    }
  };
  
  // Calculate weights based on actual content emphasis
  const total = patterns.trust.count + patterns.timing.count + patterns.recognition.count || 1;
  
  const weights = {
    trust: Math.round((patterns.trust.count / total) * 100),
    timing: Math.round((patterns.timing.count / total) * 100),
    recognition: 0
  };
  weights.recognition = 100 - weights.trust - weights.timing;
  
  // Build the structure
  const structure = {
    id: 'O',
    symbol: 'O',
    emoji: '🎯',
    title: 'Outcome',
    description: 'Trust Debt Alignment',
    weight: 100,
    type: 'outcome',
    children: []
  };
  
  // Add latent factors based on weights
  const factors = [
    { id: 'A', symbol: 'Α', emoji: '🏛️', title: 'Trust Foundation', weight: weights.trust, patterns: patterns.trust },
    { id: 'B', symbol: 'Β', emoji: '⏰', title: 'Strategic Timing', weight: weights.timing, patterns: patterns.timing },
    { id: 'G', symbol: 'Γ', emoji: '💡', title: 'Recognition Creation', weight: weights.recognition, patterns: patterns.recognition }
  ].sort((a, b) => b.weight - a.weight); // Sort by weight
  
  factors.forEach(factor => {
    const latentNode = {
      id: factor.id,
      symbol: factor.symbol,
      emoji: factor.emoji,
      title: factor.title,
      weight: factor.weight,
      type: 'latent',
      children: []
    };
    
    // Add categories based on pattern counts
    if (factor.patterns && factor.patterns.categories) {
      const categories = Object.entries(factor.patterns.categories)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      
      categories.forEach((cat, idx) => {
        const weight = idx === 0 ? 40 : idx === 1 ? 35 : 25;
        latentNode.children.push({
          id: `${factor.id}.${cat.name.charAt(0).toUpperCase()}`,
          symbol: cat.name.charAt(0).toUpperCase(),
          emoji: CATEGORY_EMOJIS[cat.name] || '📝',
          title: cat.name.charAt(0).toUpperCase() + cat.name.slice(1),
          weight: weight,
          type: 'category',
          children: []
        });
      });
    }
    
    structure.children.push(latentNode);
  });
  
  return { structure, weights, patterns };
}

// Calculate ShortLex items with proper ordering
function calculateShortLexItems(structure) {
  const items = [];
  
  function traverse(node, path = [], parentWeight = 100, depth = 0) {
    const effectiveWeight = depth === 0 ? 100 : (node.weight / 100) * parentWeight;
    
    const pathString = path.length === 0 
      ? node.symbol + node.emoji 
      : path.join('.') + '.' + node.symbol + node.emoji;
    
    items.push({
      node,
      path: [...path],
      pathString,
      depth,
      weight: node.weight,
      effectiveWeight,
      type: node.type || 'unknown'
    });
    
    // Sort children by weight before traversing
    const sortedChildren = [...(node.children || [])]
      .sort((a, b) => b.weight - a.weight);
    
    sortedChildren.forEach(child => {
      traverse(child, [...path, node.symbol + node.emoji], effectiveWeight, depth + 1);
    });
  }
  
  traverse(structure);
  
  // Sort by depth first, then by effective weight
  return items.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return b.effectiveWeight - a.effectiveWeight;
  });
}

// Calculate Trust Debt accumulation
function calculateTrustDebtAccumulation(analysis, gitInfo, documents) {
  const baseScore = analysis.trustDebt.score;
  const driftRate = analysis.trustDebt.dailyAccumulation;
  
  // Calculate accumulated debt
  const hoursSinceLastCommit = gitInfo.hoursSinceCommit;
  const accumulatedDrift = hoursSinceLastCommit * (driftRate / 24);
  
  // Calculate debt in "units" (like technical debt)
  const debtUnits = Math.round((100 - baseScore) * 10); // 1 unit per 0.1% below perfect
  const accumulatingUnits = Math.round(accumulatedDrift * 10);
  
  // Identify misalignments
  const misalignments = [];
  
  documents.forEach(doc => {
    if (doc.trustDebt < 70) {
      misalignments.push({
        document: path.basename(doc.fingerprint.path),
        gap: 70 - doc.trustDebt,
        impact: 'Below insurability threshold'
      });
    }
  });
  
  return {
    currentScore: baseScore,
    debtUnits,
    accumulatingUnits,
    totalUnits: debtUnits + accumulatingUnits,
    hourlyRate: (driftRate / 24).toFixed(4),
    dailyRate: driftRate,
    hoursSinceCommit: hoursSinceLastCommit.toFixed(1),
    projectedDaily: debtUnits + (24 * (driftRate / 24) * 10),
    misalignments,
    insurabilityGap: Math.max(0, 70 - baseScore)
  };
}

// Generate MVP HTML starting with result
async function generateMVPHTML(trustDebt, gitInfo, documents, shortlex, fimAnalysis) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt: ${trustDebt.totalUnits} Units</title>
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

        /* Hero Section - The Result */
        .hero {
            background: linear-gradient(135deg, 
                ${trustDebt.currentScore >= 70 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'} 0%, 
                rgba(0, 0, 0, 0.8) 100%);
            padding: 60px 20px;
            text-align: center;
            border-bottom: 2px solid ${trustDebt.currentScore >= 70 ? '#10b981' : '#ef4444'};
        }

        .debt-display {
            font-size: 6rem;
            font-weight: 900;
            color: ${trustDebt.currentScore >= 70 ? '#10b981' : '#ef4444'};
            margin: 20px 0;
            text-shadow: 0 0 40px currentColor;
        }

        .debt-units {
            font-size: 2rem;
            color: #f59e0b;
            margin-bottom: 10px;
        }

        .accumulation-rate {
            display: inline-block;
            padding: 10px 30px;
            background: rgba(245, 158, 11, 0.2);
            border: 2px solid #f59e0b;
            border-radius: 50px;
            font-weight: 700;
            margin: 20px 0;
        }

        .insurability-status {
            font-size: 1.5rem;
            padding: 15px 40px;
            background: ${trustDebt.currentScore >= 70 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
            border: 2px solid ${trustDebt.currentScore >= 70 ? '#10b981' : '#ef4444'};
            border-radius: 12px;
            display: inline-block;
            margin: 20px 0;
        }

        /* The Story Section */
        .story {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        .story-title {
            font-size: 2rem;
            color: #8b5cf6;
            margin: 40px 0 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(139, 92, 246, 0.3);
        }

        /* Misalignment Cards */
        .misalignments {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }

        .misalignment-card {
            background: rgba(239, 68, 68, 0.1);
            border: 2px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            padding: 20px;
        }

        .misalignment-gap {
            font-size: 2rem;
            font-weight: 900;
            color: #ef4444;
        }

        /* ShortLex Evidence */
        .shortlex-evidence {
            background: rgba(139, 92, 246, 0.05);
            border: 2px solid rgba(139, 92, 246, 0.2);
            border-radius: 16px;
            padding: 30px;
            margin: 30px 0;
        }

        .priority-item {
            display: flex;
            align-items: center;
            padding: 12px;
            margin: 8px 0;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            border-left: 4px solid transparent;
        }

        .priority-path {
            font-family: 'SF Mono', monospace;
            color: #8b5cf6;
            margin-right: 20px;
            min-width: 150px;
        }

        .priority-weight {
            margin-left: auto;
            font-weight: 900;
            font-size: 1.2rem;
            padding: 4px 12px;
            background: rgba(139, 92, 246, 0.2);
            border-radius: 20px;
        }

        .weight-bar {
            height: 4px;
            background: linear-gradient(90deg, #8b5cf6 var(--weight), transparent var(--weight));
            border-radius: 2px;
            margin-top: 8px;
        }

        /* Git Evidence */
        .git-evidence {
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

        .commit-time {
            color: #64748b;
            font-size: 0.9rem;
            margin-left: auto;
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

        /* Document Evidence */
        .documents-evidence {
            background: rgba(16, 185, 129, 0.05);
            border: 2px solid rgba(16, 185, 129, 0.2);
            border-radius: 16px;
            padding: 30px;
            margin: 30px 0;
        }

        .document-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            margin: 10px 0;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
        }

        .fingerprint {
            font-family: monospace;
            background: rgba(139, 92, 246, 0.2);
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 0.9rem;
        }

        .trust-score {
            font-size: 1.8rem;
            font-weight: 900;
        }

        /* FIM Framework */
        .fim-section {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
            border: 2px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 40px;
            margin: 40px 0;
            text-align: center;
        }

        .fim-formula {
            font-size: 2.5rem;
            font-weight: 900;
            font-family: 'SF Mono', monospace;
            color: #8b5cf6;
            margin: 20px 0;
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
    <!-- Start with the RESULT -->
    <div class="hero">
        <h1 style="font-size: 1.5rem; color: #94a3b8; margin-bottom: 10px;">Current Trust Debt</h1>
        <div class="debt-display">${trustDebt.totalUnits}</div>
        <div class="debt-units">TRUST DEBT UNITS</div>
        
        <div class="accumulation-rate">
            Accumulating ${trustDebt.accumulatingUnits} units since last commit (${trustDebt.hoursSinceCommit}h ago)
        </div>
        
        <div class="insurability-status">
            ${trustDebt.currentScore >= 70 ? '✅ INSURABLE' : `❌ NOT INSURABLE (Gap: ${trustDebt.insurabilityGap}%)`}
        </div>
        
        <p style="color: #94a3b8; margin-top: 20px;">
            Daily Rate: ${trustDebt.dailyRate}% • Hourly: ${trustDebt.hourlyRate}% • Projected EOD: ${trustDebt.projectedDaily.toFixed(0)} units
        </p>
    </div>

    <!-- The Story: WHY -->
    <div class="story">
        <!-- Misalignments -->
        ${trustDebt.misalignments.length > 0 ? `
        <h2 class="story-title">🚨 Critical Misalignments Driving Trust Debt</h2>
        <div class="misalignments">
            ${trustDebt.misalignments.map(m => `
            <div class="misalignment-card">
                <h3 style="color: #ef4444; margin-bottom: 10px;">${m.document}</h3>
                <div class="misalignment-gap">${m.gap}%</div>
                <p style="color: #f59e0b; margin-top: 10px;">${m.impact}</p>
            </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- ShortLex Evidence -->
        <h2 class="story-title">📊 Priority Alignment Analysis</h2>
        <div class="shortlex-evidence">
            <p style="color: #94a3b8; margin-bottom: 20px;">
                Content emphasis reveals actual priorities vs intended:
            </p>
            <div style="display: flex; gap: 40px; justify-content: center; margin: 30px 0;">
                ${Object.entries(shortlex.weights).map(([key, weight]) => `
                <div style="text-align: center;">
                    <div style="font-size: 2.5rem; font-weight: 900; color: ${
                        key === 'trust' ? '#8b5cf6' : 
                        key === 'timing' ? '#ec4899' : 
                        '#06ffa5'
                    };">${weight}%</div>
                    <div style="text-transform: capitalize; margin-top: 10px;">${key}</div>
                </div>
                `).join('')}
            </div>
            
            <h3 style="margin: 20px 0; color: #8b5cf6;">Weighted Priority Structure</h3>
            ${shortlex.items.slice(0, 10).map(item => `
            <div class="priority-item" style="border-left-color: ${
                item.effectiveWeight > 20 ? '#8b5cf6' :
                item.effectiveWeight > 10 ? '#ec4899' :
                item.effectiveWeight > 5 ? '#06ffa5' :
                '#64748b'
            };">
                <span class="priority-path">${item.pathString}</span>
                <span style="flex: 1;">${item.node.title}</span>
                <span class="priority-weight">${item.effectiveWeight.toFixed(1)}%</span>
            </div>
            <div class="weight-bar" style="--weight: ${item.effectiveWeight}%;"></div>
            `).join('')}
        </div>

        <!-- Git Evidence -->
        <h2 class="story-title">📊 Git Repository Information</h2>
        <div class="git-evidence">
            <p><strong>Branch:</strong> ${gitInfo.branch}</p>
            <p><strong>Status:</strong> ${gitInfo.clean ? '✅ Clean' : `⚠️ ${gitInfo.modifiedFiles} modified files`}</p>
            <p style="color: #f59e0b; margin: 10px 0;">
                <strong>Drift Since Last Commit:</strong> ${gitInfo.driftSinceCommit.toFixed(3)}% (${gitInfo.hoursSinceCommit.toFixed(1)} hours)
            </p>
            
            <h3 style="margin: 20px 0 10px; color: #8b5cf6;">Recent Commits (click to expand)</h3>
            ${gitInfo.commits.map(commit => `
            <div class="commit" onclick="toggleCommit(this)">
                <div class="commit-header">
                    <span class="commit-hash">${commit.hash}</span>
                    <span style="flex: 1;">${commit.subject}</span>
                    <span class="commit-time">${new Date(commit.timestamp).toRelativeTimeString ? 
                        new Date(commit.timestamp).toRelativeTimeString() : 
                        new Date(commit.timestamp).toLocaleString()}</span>
                    <span class="expand-indicator">▼</span>
                </div>
                <div class="commit-body">${commit.body || 'No additional details'}</div>
            </div>
            `).join('')}
        </div>

        <!-- Document Evidence -->
        <h2 class="story-title">📄 Document Trust Analysis</h2>
        <div class="documents-evidence">
            ${documents.map(doc => `
            <div class="document-item">
                <div>
                    <strong>${path.basename(doc.fingerprint.path)}</strong>
                    <span class="fingerprint">${doc.fingerprint.short}</span>
                    <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 5px;">
                        ${doc.fingerprint.lines} lines • ${(doc.fingerprint.size / 1024).toFixed(1)} KB
                    </p>
                </div>
                <div style="text-align: right;">
                    <div class="trust-score" style="color: ${doc.trustDebt >= 70 ? '#10b981' : doc.trustDebt >= 50 ? '#f59e0b' : '#ef4444'}">
                        ${doc.trustDebt}%
                    </div>
                    <p style="color: #94a3b8; font-size: 0.9rem;">Trust Score</p>
                </div>
            </div>
            `).join('')}
        </div>

        <!-- FIM Analysis -->
        <div class="fim-section">
            <h2 style="font-size: 2rem; margin-bottom: 20px;">M = S × E Framework Analysis</h2>
            <div class="fim-formula">M = S × E</div>
            <p style="font-size: 1.2rem; margin: 20px 0;">
                Momentum = Skill × Environment
            </p>
            <div style="font-size: 3rem; font-weight: 900; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 20px 0;">
                ${(fimAnalysis.momentum.raw * 100).toFixed(1)}%
            </div>
            <p>
                Skill: ${(fimAnalysis.momentum.components.skill * 100).toFixed(1)}% • 
                Environment: ${(fimAnalysis.momentum.components.environment * 100).toFixed(1)}% • 
                Leverage: ${fimAnalysis.momentum.components.leverage.toFixed(1)}x
            </p>
        </div>
    </div>

    <div class="timestamp">
        Generated: ${new Date().toISOString()}<br>
        Unity Principle: Shape = Symbol • Patent Pending
    </div>
</body>
</html>`;

  return html;
}

// Main execution
async function main() {
  console.log('🎯 Trust Debt MVP Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Get git information
    console.log('\n📊 Analyzing git history...');
    const gitInfo = getGitInfo();
    console.log(`  Found ${gitInfo.commits.length} commits`);
    console.log(`  Hours since last: ${gitInfo.hoursSinceCommit.toFixed(1)}`);
    
    // 2. Analyze documents
    console.log('\n📄 Analyzing documents...');
    const docsToAnalyze = [
      path.join(__dirname, '..', 'CLAUDE.md'),
      path.join(__dirname, '..', 'README.md')
    ];
    
    const weekFiles = fsSync.readdirSync(path.join(__dirname, '..'))
      .filter(f => f.startsWith('WEEK_') && f.endsWith('.md'))
      .map(f => path.join(__dirname, '..', f));
    
    docsToAnalyze.push(...weekFiles.slice(0, 3));
    
    const documents = [];
    let allContent = '';
    for (const docPath of docsToAnalyze) {
      if (fsSync.existsSync(docPath)) {
        console.log(`  Processing: ${path.basename(docPath)}`);
        const content = await fs.readFile(docPath, 'utf-8');
        const fingerprint = generateFingerprint(content, docPath);
        
        // Quick Trust Debt calculation
        const analyzer = new FIMTrustDebtAnalyzer();
        const analysis = analyzer.analyzeFIM(content);
        
        documents.push({
          fingerprint,
          trustDebt: analysis.trustDebt.score,
          drift: parseFloat(analysis.trustDebt.drift),
          content: content.substring(0, 1000)
        });
        
        allContent += content + '\n';
      }
    }
    
    // 3. Build ShortLex from content
    console.log('\n🧠 Building ShortLex structure...');
    const { structure, weights, patterns } = buildContentShortLex(allContent);
    const shortlexItems = calculateShortLexItems(structure);
    console.log(`  Generated ${shortlexItems.length} priority items`);
    
    // 4. Run FIM analysis
    console.log('\n⚙️ Calculating Trust Debt...');
    const analyzer = new FIMTrustDebtAnalyzer();
    const fimAnalysis = analyzer.analyzeFIM(allContent);
    
    // 5. Calculate Trust Debt accumulation
    const trustDebt = calculateTrustDebtAccumulation(fimAnalysis, gitInfo, documents);
    console.log(`  Trust Debt: ${trustDebt.totalUnits} units`);
    console.log(`  Accumulating: ${trustDebt.accumulatingUnits} units`);
    console.log(`  Status: ${trustDebt.currentScore >= 70 ? '✅ Insurable' : '❌ Not Insurable'}`);
    
    // 6. Generate HTML
    console.log('\n🎨 Generating visualization...');
    const htmlContent = await generateMVPHTML(
      trustDebt,
      gitInfo,
      documents,
      { structure, weights, items: shortlexItems, patterns },
      fimAnalysis
    );
    
    const htmlPath = path.join(__dirname, '..', `trust-debt-mvp-${Date.now()}.html`);
    await fs.writeFile(htmlPath, htmlContent);
    console.log(`✅ Created: ${path.basename(htmlPath)}`);
    
    // 7. Open HTML
    console.log('\n🌐 Opening visualization...');
    try {
      execSync(`open "${htmlPath}"`, { stdio: 'ignore' });
      console.log('✅ Opened in browser');
    } catch (error) {
      console.log(`📖 View at: ${htmlPath}`);
    }
    
    // 8. Generate prompt for Claude
    const prompt = `# 🚨 Trust Debt: ${trustDebt.totalUnits} Units

## Current State
- **Trust Debt Score**: ${trustDebt.currentScore}/100
- **Accumulated Units**: ${trustDebt.totalUnits} (${trustDebt.debtUnits} base + ${trustDebt.accumulatingUnits} accumulating)
- **Insurability**: ${trustDebt.currentScore >= 70 ? '✅ YES' : `❌ NO (Gap: ${trustDebt.insurabilityGap}%)`}
- **Accumulation Rate**: ${trustDebt.dailyRate}% daily (${trustDebt.hourlyRate}% hourly)

## Critical Misalignments
${trustDebt.misalignments.map(m => `- **${m.document}**: ${m.gap}% below threshold`).join('\n') || 'None - all documents above threshold'}

## Priority Analysis
Content emphasis shows:
- Trust: ${weights.trust}% (${patterns.trust.count} occurrences)
- Timing: ${weights.timing}% (${patterns.timing.count} occurrences)  
- Recognition: ${weights.recognition}% (${patterns.recognition.count} occurrences)

## Git Evidence
Last commit: ${gitInfo.hoursSinceCommit.toFixed(1)} hours ago
Drift since: ${gitInfo.driftSinceCommit.toFixed(3)}%

## Action Required
${trustDebt.currentScore < 70 ? 
  `1. **URGENT**: Boost Trust Debt above 70 to achieve insurability
2. Fix documents below threshold
3. Commit changes to reset accumulation` :
  `1. Maintain Trust Debt above 70
2. Monitor accumulation rate
3. Regular commits to prevent drift`}

Visualization opened in browser.`;
    
    // 9. Launch Claude
    console.log('\n🚀 Launching Claude...');
    try {
      execSync(`claude "${prompt}"`, { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
    } catch (error) {
      console.log('💡 Ready for Claude analysis');
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
  getGitInfo,
  calculateTrustDebtAccumulation,
  buildContentShortLex
};