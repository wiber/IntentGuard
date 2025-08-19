#!/usr/bin/env node

/**
 * Trust Debt Final Analysis - Commit-Level Principle Tracking
 * 
 * This implements the complete Trust Debt forcing function:
 * 1. Per-commit principle alignment analysis
 * 2. Trend visualization over time
 * 3. FIM mapping for reproducible success patterns
 * 4. Minimal requirement identification for traction
 * 
 * FIM Mapping:
 * - M (Momentum): Overall progress toward alignment
 * - S (Skill): How well commits align with intended principles  
 * - E (Environment): Repository structure supporting alignment
 * 
 * The "magic" is reproduced when S × E creates multiplicative momentum.
 * 
 * Usage: pnpm t:week
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Constants for Trust Debt calculation
const DAILY_DRIFT_RATE = 0.003; // 0.3% daily compound
const SPEC_AGE_PENALTY = 0.001; // 0.1% per day since spec
const COMMIT_ALIGNMENT_WEIGHT = 0.4; // How much recent commits affect score

/**
 * Get git commits with diff analysis for principle alignment
 * This is crucial for understanding HOW the codebase is drifting
 */
async function getGitCommitsWithAnalysis() {
  try {
    const commits = [];
    
    // Get last 10 commits for trend analysis
    const hashes = execSync('git log --format="%H" -10', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(h => h);
    
    for (const hash of hashes) {
      try {
        const subject = execSync(`git log --format="%s" -1 ${hash}`, { encoding: 'utf8' }).trim();
        const body = execSync(`git log --format="%b" -1 ${hash}`, { encoding: 'utf8' }).trim();
        const timestamp = execSync(`git log --format="%ci" -1 ${hash}`, { encoding: 'utf8' }).trim();
        const author = execSync(`git log --format="%an" -1 ${hash}`, { encoding: 'utf8' }).trim();
        
        // Get files changed in this commit
        const filesChanged = execSync(`git diff-tree --no-commit-id --name-only -r ${hash}`, { encoding: 'utf8' })
          .trim()
          .split('\n')
          .filter(f => f);
        
        // Get diff stats
        const stats = execSync(`git diff-tree --no-commit-id --stat -r ${hash}`, { encoding: 'utf8' }).trim();
        
        // Analyze commit message for principle alignment
        const alignment = analyzeCommitAlignment(subject + ' ' + body, filesChanged);
        
        commits.push({
          hash: hash.substring(0, 7),
          fullHash: hash,
          subject,
          body,
          timestamp,
          author,
          filesChanged,
          stats,
          alignment,
          daysAgo: (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24)
        });
      } catch (e) {
        console.error(`Error analyzing commit ${hash}:`, e.message);
      }
    }
    
    // Get repository metadata
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const modifiedFiles = status.split('\n').filter(line => line.trim()).length;
    
    // Calculate spec age
    let specAge = 0;
    try {
      const specModTime = execSync('git log -1 --format="%ci" CLAUDE.md', { encoding: 'utf8' }).trim();
      specAge = (Date.now() - new Date(specModTime).getTime()) / (1000 * 60 * 60 * 24);
    } catch (e) {
      specAge = 30;
    }
    
    return {
      branch,
      commits,
      modifiedFiles,
      clean: modifiedFiles === 0,
      specAge,
      trend: calculateAlignmentTrend(commits)
    };
  } catch (error) {
    console.error('Git analysis error:', error.message);
    return {
      branch: 'unknown',
      commits: [],
      modifiedFiles: 0,
      clean: true,
      specAge: 30,
      trend: null
    };
  }
}

/**
 * Analyze a commit for principle alignment
 * This identifies which principles the commit advances or violates
 */
function analyzeCommitAlignment(message, filesChanged) {
  const lower = message.toLowerCase();
  
  // Define principle indicators
  const principles = {
    trust: {
      positive: ['trust debt', 'quantif', 'measur', 'score', 'metric', 'insur'],
      negative: ['hack', 'quick fix', 'temporary', 'todo', 'fixme'],
      score: 0
    },
    timing: {
      positive: ['performance', 'optimi', 'fast', 'efficient', '30 second', 'timing'],
      negative: ['slow', 'delay', 'timeout', 'wait', 'block'],
      score: 0
    },
    recognition: {
      positive: ['pattern', 'insight', 'breakthrough', 'discover', 'recogni', 'oh moment'],
      negative: ['confus', 'unclear', 'complex', 'complicated'],
      score: 0
    },
    quality: {
      positive: ['test', 'fix', 'improve', 'refactor', 'clean', 'document'],
      negative: ['bug', 'error', 'fail', 'broken', 'regression'],
      score: 0
    }
  };
  
  // Score each principle
  for (const [principle, indicators] of Object.entries(principles)) {
    let positive = 0;
    let negative = 0;
    
    indicators.positive.forEach(term => {
      if (lower.includes(term)) positive++;
    });
    
    indicators.negative.forEach(term => {
      if (lower.includes(term)) negative++;
    });
    
    // Consider files changed
    if (filesChanged.length > 0) {
      if (principle === 'trust' && filesChanged.some(f => f.includes('trust') || f.includes('debt'))) {
        positive += 2;
      }
      if (principle === 'timing' && filesChanged.some(f => f.includes('performance') || f.includes('optim'))) {
        positive += 2;
      }
      if (principle === 'recognition' && filesChanged.some(f => f.includes('pattern') || f.includes('insight'))) {
        positive += 2;
      }
    }
    
    // Calculate net score (-100 to +100)
    const total = positive + negative || 1;
    principles[principle].score = Math.round(((positive - negative) / total) * 100);
  }
  
  // Determine primary focus
  const sorted = Object.entries(principles)
    .sort((a, b) => Math.abs(b[1].score) - Math.abs(a[1].score));
  
  return {
    principles,
    primary: sorted[0][0],
    primaryScore: sorted[0][1].score,
    secondary: sorted[1][0],
    secondaryScore: sorted[1][1].score,
    overall: Object.values(principles).reduce((sum, p) => sum + p.score, 0) / 4
  };
}

/**
 * Calculate alignment trend over commits
 * Shows if we're getting better or worse over time
 */
function calculateAlignmentTrend(commits) {
  if (commits.length < 2) return null;
  
  // Group by time periods
  const recent = commits.slice(0, 3);
  const previous = commits.slice(3, 6);
  const older = commits.slice(6);
  
  const recentAvg = recent.reduce((sum, c) => sum + c.alignment.overall, 0) / recent.length || 0;
  const previousAvg = previous.reduce((sum, c) => sum + c.alignment.overall, 0) / previous.length || 0;
  const olderAvg = older.reduce((sum, c) => sum + c.alignment.overall, 0) / older.length || 0;
  
  return {
    recent: recentAvg,
    previous: previousAvg,
    older: olderAvg,
    direction: recentAvg > previousAvg ? 'improving' : recentAvg < previousAvg ? 'degrading' : 'stable',
    momentum: recentAvg - olderAvg
  };
}

/**
 * Analyze document content for intent vectors
 * This is the "reality" side of the intent-reality gap
 */
function analyzeDocumentVectors(content) {
  const lowerContent = content.toLowerCase();
  
  const dimensions = {
    trust: {
      indicators: ['trust debt', 'quantif', 'score', 'measur', 'visible', 'drift', 'insur'],
      count: 0
    },
    timing: {
      indicators: ['30 second', 'timing', 'moment', 'receptiv', 'precision', 'strategic'],
      count: 0
    },
    recognition: {
      indicators: ['oh moment', 'breakthrough', 'recogni', 'insight', 'pattern', 'aha'],
      count: 0
    }
  };
  
  // Count occurrences
  for (const [dim, data] of Object.entries(dimensions)) {
    data.indicators.forEach(indicator => {
      const matches = lowerContent.match(new RegExp(indicator, 'gi'));
      if (matches) data.count += matches.length;
    });
  }
  
  // Normalize to vector
  const total = Object.values(dimensions).reduce((sum, d) => sum + d.count, 0) || 1;
  
  return {
    trust: dimensions.trust.count / total,
    timing: dimensions.timing.count / total,
    recognition: dimensions.recognition.count / total,
    total: total
  };
}

/**
 * Calculate comprehensive Trust Debt with all components
 * This is the core algorithm that creates the forcing function
 */
function calculateComprehensiveTrustDebt(documents, gitInfo) {
  // Intent vector (from spec)
  const intentVector = {
    trust: 0.35,
    timing: 0.35,
    recognition: 0.30
  };
  
  // Calculate reality vector from documents
  let realityVector = { trust: 0, timing: 0, recognition: 0 };
  let totalWeight = 0;
  
  const documentAnalyses = documents.map(doc => {
    const vector = analyzeDocumentVectors(doc.content);
    const weight = doc.content.length;
    
    realityVector.trust += vector.trust * weight;
    realityVector.timing += vector.timing * weight;
    realityVector.recognition += vector.recognition * weight;
    totalWeight += weight;
    
    return { ...doc, vector, weight };
  });
  
  // Normalize reality vector
  if (totalWeight > 0) {
    realityVector.trust /= totalWeight;
    realityVector.timing /= totalWeight;
    realityVector.recognition /= totalWeight;
  }
  
  // Calculate gaps
  const gap = {
    trust: intentVector.trust - realityVector.trust,
    timing: intentVector.timing - realityVector.timing,
    recognition: intentVector.recognition - realityVector.recognition
  };
  
  // L2 distance (Euclidean)
  const l2Distance = Math.sqrt(
    gap.trust ** 2 + 
    gap.timing ** 2 + 
    gap.recognition ** 2
  );
  
  // Calculate debt components
  const baseDebt = l2Distance * 1000;
  const specAgePenalty = gitInfo.specAge * SPEC_AGE_PENALTY * 100;
  
  // Commit alignment penalty/bonus
  let commitAlignmentScore = 0;
  if (gitInfo.commits.length > 0) {
    const avgAlignment = gitInfo.commits
      .slice(0, 5)
      .reduce((sum, c) => sum + c.alignment.overall, 0) / Math.min(5, gitInfo.commits.length);
    
    commitAlignmentScore = -avgAlignment * COMMIT_ALIGNMENT_WEIGHT; // Negative if good alignment
  }
  
  const totalDebt = Math.round(Math.max(0, baseDebt + specAgePenalty + commitAlignmentScore));
  
  // Calculate Trust Debt score (0-100)
  const trustDebtScore = Math.max(0, Math.min(100, 100 - totalDebt / 10));
  
  // FIM Framework calculation
  const skill = (100 - Math.abs(commitAlignmentScore)) / 100; // How well we're executing
  const environment = (100 - specAgePenalty) / 100; // How fresh/relevant our spec is
  const momentum = skill * environment; // M = S × E
  
  return {
    totalDebt,
    baseDebt: Math.round(baseDebt),
    specAgePenalty: Math.round(specAgePenalty),
    commitAlignment: Math.round(commitAlignmentScore),
    trustDebtScore,
    isInsurable: trustDebtScore >= 70,
    insurabilityGap: Math.max(0, 70 - trustDebtScore),
    l2Distance,
    intentVector,
    realityVector,
    gap,
    documentAnalyses,
    fim: {
      skill: skill * 100,
      environment: environment * 100,
      momentum: momentum * 100,
      leverage: Math.pow(2, momentum * 3) // Exponential leverage effect
    }
  };
}

/**
 * Build ShortLex structure that shows the "carrot"
 * This is what success looks like - the target state
 */
function buildTargetShortLex(debtAnalysis) {
  const structure = {
    id: 'O',
    symbol: 'O',
    emoji: '🎯',
    title: 'Outcome: Reproducible Magic',
    description: 'Systematic creation of breakthrough moments',
    weight: 100,
    type: 'outcome',
    children: []
  };
  
  // Build factors based on gaps (biggest gaps = highest priority)
  const factors = [
    {
      symbol: 'Α',
      emoji: '🏛️',
      title: 'Trust Foundation',
      gap: Math.abs(debtAnalysis.gap.trust),
      intent: debtAnalysis.intentVector.trust,
      reality: debtAnalysis.realityVector.trust
    },
    {
      symbol: 'Β',
      emoji: '⏰',
      title: 'Strategic Timing',
      gap: Math.abs(debtAnalysis.gap.timing),
      intent: debtAnalysis.intentVector.timing,
      reality: debtAnalysis.realityVector.timing
    },
    {
      symbol: 'Γ',
      emoji: '💡',
      title: 'Recognition Creation',
      gap: Math.abs(debtAnalysis.gap.recognition),
      intent: debtAnalysis.intentVector.recognition,
      reality: debtAnalysis.realityVector.recognition
    }
  ].sort((a, b) => b.gap - a.gap);
  
  factors.forEach((factor, idx) => {
    const weight = idx === 0 ? 40 : idx === 1 ? 35 : 25;
    
    structure.children.push({
      id: factor.symbol,
      symbol: factor.symbol,
      emoji: factor.emoji,
      title: factor.title,
      weight,
      type: 'latent',
      gap: (factor.gap * 100).toFixed(1),
      intent: (factor.intent * 100).toFixed(0),
      reality: (factor.reality * 100).toFixed(0),
      children: []
    });
  });
  
  return structure;
}

/**
 * Generate the final HTML report
 * This is the forcing function visualization
 */
async function generateFinalHTML(debtAnalysis, gitInfo, shortlex) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt: ${debtAnalysis.totalDebt} Units - Complete Analysis</title>
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
                ${debtAnalysis.isInsurable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'} 0%, 
                rgba(0, 0, 0, 0.8) 100%);
            padding: 60px 20px;
            text-align: center;
        }

        .debt-display {
            font-size: 8rem;
            font-weight: 900;
            color: ${debtAnalysis.isInsurable ? '#10b981' : '#ef4444'};
            margin: 20px 0;
            text-shadow: 0 0 80px currentColor;
        }

        .fim-score {
            display: flex;
            justify-content: center;
            gap: 60px;
            margin: 40px 0;
            flex-wrap: wrap;
        }

        .fim-component {
            text-align: center;
        }

        .fim-value {
            font-size: 3rem;
            font-weight: 900;
            margin: 10px 0;
        }

        .fim-label {
            font-size: 1.2rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .fim-formula {
            font-size: 2rem;
            font-family: 'SF Mono', monospace;
            color: #8b5cf6;
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

        /* Commit Analysis */
        .commit-timeline {
            background: rgba(30, 41, 59, 0.6);
            border-radius: 16px;
            padding: 30px;
            margin: 30px 0;
        }

        .commit-card {
            background: rgba(0, 0, 0, 0.4);
            padding: 20px;
            margin: 15px 0;
            border-radius: 12px;
            border-left: 4px solid transparent;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .commit-card.positive { border-left-color: #10b981; }
        .commit-card.negative { border-left-color: #ef4444; }
        .commit-card.neutral { border-left-color: #f59e0b; }

        .commit-card:hover {
            transform: translateX(10px);
            background: rgba(0, 0, 0, 0.6);
        }

        .commit-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .commit-hash {
            background: #8b5cf6;
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.9rem;
        }

        .commit-alignment {
            display: flex;
            gap: 20px;
        }

        .principle-score {
            text-align: center;
            padding: 8px 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
        }

        .principle-name {
            font-size: 0.8rem;
            color: #94a3b8;
            text-transform: uppercase;
        }

        .principle-value {
            font-size: 1.5rem;
            font-weight: 900;
            margin-top: 5px;
        }

        .commit-details {
            display: none;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .commit-card.expanded .commit-details {
            display: block;
        }

        /* Trend Visualization */
        .trend-chart {
            background: rgba(139, 92, 246, 0.05);
            border: 2px solid rgba(139, 92, 246, 0.2);
            border-radius: 16px;
            padding: 30px;
            margin: 30px 0;
        }

        .trend-bars {
            display: flex;
            justify-content: space-around;
            align-items: flex-end;
            height: 200px;
            margin: 30px 0;
        }

        .trend-bar {
            flex: 1;
            max-width: 150px;
            text-align: center;
            position: relative;
        }

        .bar-fill {
            background: linear-gradient(180deg, #8b5cf6 0%, #ec4899 100%);
            border-radius: 8px 8px 0 0;
            position: absolute;
            bottom: 0;
            width: 100%;
            transition: height 0.5s ease;
        }

        .bar-label {
            position: absolute;
            bottom: -30px;
            width: 100%;
            color: #94a3b8;
        }

        .bar-value {
            position: absolute;
            top: -30px;
            width: 100%;
            font-weight: 900;
            font-size: 1.2rem;
        }

        /* Target State (The Carrot) */
        .target-state {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            border: 2px solid rgba(16, 185, 129, 0.3);
            border-radius: 20px;
            padding: 40px;
            margin: 40px 0;
        }

        .shortlex-item {
            padding: 15px;
            margin: 10px 0;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .shortlex-path {
            font-family: 'SF Mono', monospace;
            color: #8b5cf6;
            font-weight: 600;
        }

        .intent-reality-bars {
            display: flex;
            gap: 20px;
            align-items: center;
        }

        .bar-container {
            width: 100px;
            height: 20px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        }

        .intent-bar {
            position: absolute;
            height: 100%;
            background: #10b981;
            border-radius: 10px;
        }

        .reality-bar {
            position: absolute;
            height: 100%;
            background: #ef4444;
            opacity: 0.7;
            border-radius: 10px;
        }

        /* Action Items */
        .action-items {
            background: rgba(245, 158, 11, 0.1);
            border: 2px solid rgba(245, 158, 11, 0.3);
            border-radius: 16px;
            padding: 30px;
            margin: 40px 0;
        }

        .action-item {
            padding: 15px;
            margin: 10px 0;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
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
    <!-- Hero: The Result & FIM Score -->
    <div class="hero">
        <h1 style="font-size: 1.5rem; color: #94a3b8; margin-bottom: 10px;">Current Trust Debt</h1>
        <div class="debt-display">${debtAnalysis.totalDebt}</div>
        <div style="font-size: 1.5rem; color: #f59e0b; margin-bottom: 20px;">UNITS</div>
        
        <div style="font-size: 1.8rem; padding: 20px 50px; background: ${debtAnalysis.isInsurable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; border: 2px solid ${debtAnalysis.isInsurable ? '#10b981' : '#ef4444'}; border-radius: 12px; display: inline-block; margin: 20px 0;">
            ${debtAnalysis.isInsurable ? '✅ INSURABLE' : `❌ NOT INSURABLE (Gap: ${debtAnalysis.insurabilityGap}%)`}
        </div>
        
        <!-- FIM Framework Score -->
        <div style="margin-top: 40px;">
            <div class="fim-formula">M = S × E</div>
            <div class="fim-score">
                <div class="fim-component">
                    <div class="fim-label">Skill</div>
                    <div class="fim-value" style="color: ${debtAnalysis.fim.skill > 70 ? '#10b981' : debtAnalysis.fim.skill > 50 ? '#f59e0b' : '#ef4444'}">
                        ${debtAnalysis.fim.skill.toFixed(0)}%
                    </div>
                </div>
                <div class="fim-component">
                    <div class="fim-label">×</div>
                    <div style="font-size: 2rem; margin-top: 20px;">×</div>
                </div>
                <div class="fim-component">
                    <div class="fim-label">Environment</div>
                    <div class="fim-value" style="color: ${debtAnalysis.fim.environment > 70 ? '#10b981' : debtAnalysis.fim.environment > 50 ? '#f59e0b' : '#ef4444'}">
                        ${debtAnalysis.fim.environment.toFixed(0)}%
                    </div>
                </div>
                <div class="fim-component">
                    <div class="fim-label">=</div>
                    <div style="font-size: 2rem; margin-top: 20px;">=</div>
                </div>
                <div class="fim-component">
                    <div class="fim-label">Momentum</div>
                    <div class="fim-value" style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                        ${debtAnalysis.fim.momentum.toFixed(0)}%
                    </div>
                </div>
            </div>
            <p style="color: #94a3b8; margin-top: 20px;">
                Leverage Effect: ${debtAnalysis.fim.leverage.toFixed(1)}x multiplicative impact
            </p>
        </div>
    </div>

    <div class="story">
        <!-- Formula Explanation Section -->
        <h2 class="section-title">📐 How Trust Debt is Calculated</h2>
        <div style="background: rgba(139, 92, 246, 0.05); border: 2px solid rgba(139, 92, 246, 0.2); border-radius: 16px; padding: 30px; margin: 30px 0;">
            <h3 style="color: #8b5cf6; margin-bottom: 20px;">Core Formula</h3>
            <div style="font-family: 'SF Mono', monospace; font-size: 1.8rem; color: #06ffa5; text-align: center; padding: 20px; background: rgba(0, 0, 0, 0.5); border-radius: 8px; margin: 20px 0;">
                Trust Debt = (Intent - Reality)² × Time × Spec_Age
            </div>
            
            <h3 style="color: #8b5cf6; margin: 30px 0 20px;">Step-by-Step Calculation</h3>
            
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin: 15px 0;">
                <h4 style="color: #f59e0b; margin-bottom: 15px;">1. Intent Vector (from CLAUDE.md spec)</h4>
                <div style="font-family: monospace; font-size: 1.1rem; line-height: 1.8;">
                    <span style="color: #10b981;">trust:</span> ${(debtAnalysis.intentVector.trust * 100).toFixed(0)}% - Building measurable trust<br>
                    <span style="color: #10b981;">timing:</span> ${(debtAnalysis.intentVector.timing * 100).toFixed(0)}% - Strategic timing/30-second delivery<br>
                    <span style="color: #10b981;">recognition:</span> ${(debtAnalysis.intentVector.recognition * 100).toFixed(0)}% - Creating oh moments
                </div>
            </div>
            
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin: 15px 0;">
                <h4 style="color: #f59e0b; margin-bottom: 15px;">2. Reality Vector (from actual content)</h4>
                <div style="font-family: monospace; font-size: 1.1rem; line-height: 1.8;">
                    <span style="color: #ef4444;">trust:</span> ${(debtAnalysis.realityVector.trust * 100).toFixed(0)}% - Current focus on trust<br>
                    <span style="color: #ef4444;">timing:</span> ${(debtAnalysis.realityVector.timing * 100).toFixed(0)}% - Current focus on timing<br>
                    <span style="color: #ef4444;">recognition:</span> ${(debtAnalysis.realityVector.recognition * 100).toFixed(0)}% - Current focus on recognition
                </div>
                <p style="color: #94a3b8; margin-top: 15px; font-size: 0.9rem;">
                    Calculated by counting semantic indicators in ${debtAnalysis.documentAnalyses.length} documents:
                    ${debtAnalysis.documentAnalyses.map(d => `<br>• ${path.basename(d.path)}: ${d.vector.total} indicators found`).join('')}
                </p>
            </div>
            
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin: 15px 0;">
                <h4 style="color: #f59e0b; margin-bottom: 15px;">3. Gap Calculation (L2 Euclidean Distance)</h4>
                <div style="font-family: monospace; font-size: 1.1rem; line-height: 1.8;">
                    gap_trust = ${(debtAnalysis.gap.trust).toFixed(2)}<br>
                    gap_timing = ${(debtAnalysis.gap.timing).toFixed(2)}<br>
                    gap_recognition = ${(debtAnalysis.gap.recognition).toFixed(2)}<br>
                    <br>
                    <span style="color: #8b5cf6;">L2_distance = √(${(debtAnalysis.gap.trust ** 2).toFixed(4)} + ${(debtAnalysis.gap.timing ** 2).toFixed(4)} + ${(debtAnalysis.gap.recognition ** 2).toFixed(4)})</span><br>
                    <span style="color: #06ffa5; font-weight: 700;">L2_distance = ${debtAnalysis.l2Distance.toFixed(3)}</span>
                </div>
            </div>
            
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin: 15px 0;">
                <h4 style="color: #f59e0b; margin-bottom: 15px;">4. Trust Debt Units</h4>
                <div style="font-family: monospace; font-size: 1.1rem; line-height: 1.8;">
                    Base_Debt = L2_distance × 1000 = ${debtAnalysis.baseDebt} units<br>
                    Spec_Age_Penalty = ${gitInfo.specAge.toFixed(0)} days × 0.001 × 100 = ${debtAnalysis.specAgePenalty} units<br>
                    Commit_Alignment = ${debtAnalysis.commitAlignment} units<br>
                    <br>
                    <span style="color: #06ffa5; font-weight: 700; font-size: 1.3rem;">Total_Debt = ${debtAnalysis.totalDebt} units</span>
                </div>
            </div>
            
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin: 15px 0;">
                <h4 style="color: #f59e0b; margin-bottom: 15px;">5. Insurability Score</h4>
                <div style="font-family: monospace; font-size: 1.1rem; line-height: 1.8;">
                    Trust_Debt_Score = 100 - (Total_Debt / 10)<br>
                    Trust_Debt_Score = 100 - (${debtAnalysis.totalDebt} / 10)<br>
                    <span style="color: ${debtAnalysis.trustDebtScore >= 70 ? '#10b981' : '#ef4444'}; font-weight: 700; font-size: 1.3rem;">Trust_Debt_Score = ${debtAnalysis.trustDebtScore.toFixed(1)}</span><br>
                    <br>
                    Insurability Threshold: ≥ 70<br>
                    <span style="color: ${debtAnalysis.isInsurable ? '#10b981' : '#ef4444'}; font-weight: 700;">
                        Status: ${debtAnalysis.isInsurable ? '✅ INSURABLE' : `❌ NOT INSURABLE (Gap: ${debtAnalysis.insurabilityGap.toFixed(1)})`}
                    </span>
                </div>
            </div>
        </div>
        
        <!-- FIM Framework Explanation -->
        <h2 class="section-title">🚀 Momentum Calculation (M = S × E)</h2>
        <div style="background: rgba(239, 68, 68, 0.05); border: 2px solid rgba(239, 68, 68, 0.2); border-radius: 16px; padding: 30px; margin: 30px 0;">
            <h3 style="color: #ec4899; margin-bottom: 20px;">The Multiplicative Effect</h3>
            <div style="font-family: 'SF Mono', monospace; font-size: 1.8rem; color: #8b5cf6; text-align: center; padding: 20px; background: rgba(0, 0, 0, 0.5); border-radius: 8px; margin: 20px 0;">
                Momentum = Skill × Environment
            </div>
            
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin: 15px 0;">
                <h4 style="color: #f59e0b; margin-bottom: 15px;">S (Skill): How well are recent commits aligned?</h4>
                <div style="font-family: monospace; font-size: 1.1rem; line-height: 1.8;">
                    Recent Commits Alignment: [${gitInfo.commits.slice(0, 5).map(c => c.alignment.overall > 0 ? '+' + c.alignment.overall : c.alignment.overall).join(', ')}]<br>
                    Average Alignment: ${gitInfo.commits.slice(0, 5).reduce((sum, c) => sum + c.alignment.overall, 0) / Math.min(5, gitInfo.commits.length) || 0}%<br>
                    <span style="color: #10b981;">Skill = ${debtAnalysis.fim.skill.toFixed(1)}%</span>
                </div>
            </div>
            
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin: 15px 0;">
                <h4 style="color: #f59e0b; margin-bottom: 15px;">E (Environment): How fresh/relevant is the spec?</h4>
                <div style="font-family: monospace; font-size: 1.1rem; line-height: 1.8;">
                    Spec Age: ${gitInfo.specAge.toFixed(0)} days<br>
                    Environment = (100 - (${gitInfo.specAge.toFixed(0)} × 0.1)) / 100<br>
                    <span style="color: #10b981;">Environment = ${debtAnalysis.fim.environment.toFixed(1)}%</span>
                </div>
            </div>
            
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin: 15px 0;">
                <h4 style="color: #f59e0b; margin-bottom: 15px;">M (Momentum): The multiplicative effect</h4>
                <div style="font-family: monospace; font-size: 1.1rem; line-height: 1.8;">
                    Momentum = ${(debtAnalysis.fim.skill / 100).toFixed(3)} × ${(debtAnalysis.fim.environment / 100).toFixed(3)}<br>
                    <span style="color: #8b5cf6; font-weight: 700; font-size: 1.3rem;">Momentum = ${debtAnalysis.fim.momentum.toFixed(1)}%</span><br>
                    <br>
                    Leverage = 2^(Momentum × 3) = 2^${(debtAnalysis.fim.momentum / 100 * 3).toFixed(2)}<br>
                    <span style="color: #ec4899; font-weight: 700;">Leverage = ${debtAnalysis.fim.leverage.toFixed(1)}x exponential growth potential</span>
                </div>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1)); border-radius: 12px; border: 2px solid rgba(139, 92, 246, 0.3);">
                <p style="font-size: 1.2rem; line-height: 1.8; color: #e2e8f0;">
                    <strong style="color: #8b5cf6;">Why This Matters:</strong> When Momentum > 100%, every action creates multiplicative returns. 
                    Good commits compound, creating "reproducible magic" - breakthrough moments that seem magical but are actually predictable.
                    <br><br>
                    <strong style="color: #ec4899;">Current Status:</strong> ${debtAnalysis.fim.momentum > 100 ? 
                      `✅ You have ${debtAnalysis.fim.leverage.toFixed(1)}x leverage! Every good action multiplies.` : 
                      `⚠️ Below multiplicative threshold. Need ${(100 - debtAnalysis.fim.momentum).toFixed(0)}% more momentum.`}
                </p>
            </div>
        </div>

        <!-- Commit Principle Analysis -->
        <h2 class="section-title">📊 Commit-Level Principle Alignment</h2>
        <div class="commit-timeline">
            <p style="color: #94a3b8; margin-bottom: 20px;">
                How each commit aligns with or violates our core principles:
            </p>
            
            ${gitInfo.commits.slice(0, 5).map(commit => {
              const alignmentClass = commit.alignment.overall > 20 ? 'positive' : 
                                    commit.alignment.overall < -20 ? 'negative' : 'neutral';
              
              return `
              <div class="commit-card ${alignmentClass}" onclick="toggleCommit(this)">
                <div class="commit-header">
                    <div>
                        <span class="commit-hash">${commit.hash}</span>
                        <span style="margin-left: 15px; font-weight: 600;">${commit.subject}</span>
                        <span style="margin-left: 15px; color: #64748b; font-size: 0.9rem;">
                            ${commit.daysAgo.toFixed(1)} days ago by ${commit.author}
                        </span>
                    </div>
                    <div class="commit-alignment">
                        ${['trust', 'timing', 'recognition'].map(p => `
                        <div class="principle-score">
                            <div class="principle-name">${p}</div>
                            <div class="principle-value" style="color: ${
                              commit.alignment.principles[p].score > 0 ? '#10b981' : 
                              commit.alignment.principles[p].score < 0 ? '#ef4444' : '#f59e0b'
                            }">
                                ${commit.alignment.principles[p].score > 0 ? '+' : ''}${commit.alignment.principles[p].score}
                            </div>
                        </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="commit-details">
                    <p style="color: #94a3b8; margin-bottom: 10px;">${commit.body || 'No additional details'}</p>
                    <div style="margin-top: 15px;">
                        <strong>Files Changed:</strong>
                        <div style="margin-top: 10px; font-family: monospace; font-size: 0.9rem; color: #64748b;">
                            ${commit.filesChanged.join(', ') || 'No files'}
                        </div>
                    </div>
                    <div style="margin-top: 15px; padding: 15px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
                        <strong>Primary Focus:</strong> ${commit.alignment.primary} (${commit.alignment.primaryScore > 0 ? '+' : ''}${commit.alignment.primaryScore})
                        <br>
                        <strong>Secondary:</strong> ${commit.alignment.secondary} (${commit.alignment.secondaryScore > 0 ? '+' : ''}${commit.alignment.secondaryScore})
                        <br>
                        <strong>Overall Alignment:</strong> ${commit.alignment.overall > 0 ? '+' : ''}${commit.alignment.overall.toFixed(0)}
                    </div>
                </div>
              </div>
              `;
            }).join('')}
        </div>

        <!-- Trend Visualization -->
        ${gitInfo.trend ? `
        <h2 class="section-title">📈 Alignment Trend</h2>
        <div class="trend-chart">
            <p style="color: #94a3b8; margin-bottom: 20px;">
                Principle alignment over time (${gitInfo.trend.direction}):
            </p>
            
            <div class="trend-bars">
                <div class="trend-bar">
                    <div class="bar-fill" style="height: ${Math.abs(gitInfo.trend.older) * 2}px; background: ${gitInfo.trend.older > 0 ? '#10b981' : '#ef4444'};"></div>
                    <div class="bar-value" style="color: ${gitInfo.trend.older > 0 ? '#10b981' : '#ef4444'}">
                        ${gitInfo.trend.older > 0 ? '+' : ''}${gitInfo.trend.older.toFixed(0)}
                    </div>
                    <div class="bar-label">Older</div>
                </div>
                <div class="trend-bar">
                    <div class="bar-fill" style="height: ${Math.abs(gitInfo.trend.previous) * 2}px; background: ${gitInfo.trend.previous > 0 ? '#10b981' : '#ef4444'};"></div>
                    <div class="bar-value" style="color: ${gitInfo.trend.previous > 0 ? '#10b981' : '#ef4444'}">
                        ${gitInfo.trend.previous > 0 ? '+' : ''}${gitInfo.trend.previous.toFixed(0)}
                    </div>
                    <div class="bar-label">Previous</div>
                </div>
                <div class="trend-bar">
                    <div class="bar-fill" style="height: ${Math.abs(gitInfo.trend.recent) * 2}px; background: ${gitInfo.trend.recent > 0 ? '#10b981' : '#ef4444'};"></div>
                    <div class="bar-value" style="color: ${gitInfo.trend.recent > 0 ? '#10b981' : '#ef4444'}">
                        ${gitInfo.trend.recent > 0 ? '+' : ''}${gitInfo.trend.recent.toFixed(0)}
                    </div>
                    <div class="bar-label">Recent</div>
                </div>
            </div>
            
            <p style="text-align: center; margin-top: 40px; font-size: 1.2rem;">
                Momentum: <span style="font-weight: 900; color: ${gitInfo.trend.momentum > 0 ? '#10b981' : '#ef4444'}">
                    ${gitInfo.trend.momentum > 0 ? '+' : ''}${gitInfo.trend.momentum.toFixed(0)}
                </span>
            </p>
        </div>
        ` : ''}

        <!-- Target State (The Carrot) -->
        <h2 class="section-title">🎯 Target State: The Reproducible Magic</h2>
        <div class="target-state">
            <p style="color: #94a3b8; margin-bottom: 20px;">
                This is what success looks like - when intent and reality align:
            </p>
            
            ${shortlex.children.map(factor => `
            <div class="shortlex-item">
                <div>
                    <span class="shortlex-path">${factor.symbol}${factor.emoji}</span>
                    <span style="margin-left: 20px; font-size: 1.2rem; font-weight: 600;">${factor.title}</span>
                </div>
                <div class="intent-reality-bars">
                    <span style="color: #94a3b8;">Intent:</span>
                    <div class="bar-container">
                        <div class="intent-bar" style="width: ${factor.intent}%;"></div>
                    </div>
                    <span style="color: #10b981; font-weight: 700;">${factor.intent}%</span>
                    
                    <span style="color: #94a3b8;">Reality:</span>
                    <div class="bar-container">
                        <div class="reality-bar" style="width: ${factor.reality}%;"></div>
                    </div>
                    <span style="color: #ef4444; font-weight: 700;">${factor.reality}%</span>
                    
                    <span style="color: #f59e0b; font-weight: 900; margin-left: 20px;">
                        Gap: ${factor.gap}%
                    </span>
                </div>
            </div>
            `).join('')}
        </div>

        <!-- Minimal Requirements for Traction -->
        <h2 class="section-title">🚀 Minimal Requirements for Traction</h2>
        <div class="action-items">
            <p style="color: #94a3b8; margin-bottom: 20px;">
                The smallest changes that will create the biggest impact:
            </p>
            
            ${debtAnalysis.gap.trust > 0.1 ? `
            <div class="action-item">
                <strong>1. Boost Trust Foundation (+${(debtAnalysis.gap.trust * 100).toFixed(0)}% needed)</strong>
                <p style="margin-top: 10px; color: #94a3b8;">
                    Add quantification and measurement to all features. Make Trust Debt visible in UI.
                    Every commit message should reference metrics.
                </p>
            </div>
            ` : ''}
            
            ${debtAnalysis.gap.timing > 0.1 ? `
            <div class="action-item">
                <strong>2. Improve Strategic Timing (+${(debtAnalysis.gap.timing * 100).toFixed(0)}% needed)</strong>
                <p style="margin-top: 10px; color: #94a3b8;">
                    Focus on 30-second constraint. Add performance metrics. 
                    Optimize for perfect moment delivery.
                </p>
            </div>
            ` : ''}
            
            ${debtAnalysis.gap.recognition < -0.1 ? `
            <div class="action-item">
                <strong>3. Balance Recognition Focus (-${(Math.abs(debtAnalysis.gap.recognition) * 100).toFixed(0)}% over-emphasis)</strong>
                <p style="margin-top: 10px; color: #94a3b8;">
                    You're over-indexing on insights. Shift focus back to trust and timing.
                    Pattern recognition should serve measurement, not replace it.
                </p>
            </div>
            ` : ''}
            
            ${debtAnalysis.fim.skill < 70 ? `
            <div class="action-item">
                <strong>4. Improve Execution Skill (Currently ${debtAnalysis.fim.skill.toFixed(0)}%)</strong>
                <p style="margin-top: 10px; color: #94a3b8;">
                    Recent commits aren't aligned with principles. 
                    Each commit should explicitly advance trust, timing, or recognition.
                </p>
            </div>
            ` : ''}
            
            ${debtAnalysis.fim.environment < 70 ? `
            <div class="action-item">
                <strong>5. Update Environment/Spec (Currently ${debtAnalysis.fim.environment.toFixed(0)}%)</strong>
                <p style="margin-top: 10px; color: #94a3b8;">
                    Your spec is ${gitInfo.specAge.toFixed(0)} days old. 
                    Update CLAUDE.md to reflect current reality and intentions.
                </p>
            </div>
            ` : ''}
        </div>
    </div>

    <div class="timestamp">
        Generated: ${new Date().toISOString()}<br>
        Spec Age: ${gitInfo.specAge.toFixed(0)} days • 
        Branch: ${gitInfo.branch} • 
        ${gitInfo.clean ? 'Clean' : gitInfo.modifiedFiles + ' modified files'}
    </div>
</body>
</html>`;

  return html;
}

// Main execution
async function main() {
  console.log('🎯 Trust Debt Final Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Analyze git history with principle alignment
    console.log('\n📊 Analyzing git history...');
    const gitInfo = await getGitCommitsWithAnalysis();
    console.log(`  Analyzed ${gitInfo.commits.length} commits`);
    if (gitInfo.trend) {
      console.log(`  Trend: ${gitInfo.trend.direction} (momentum: ${gitInfo.trend.momentum.toFixed(0)})`);
    }
    
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
    for (const docPath of docsToAnalyze) {
      if (fsSync.existsSync(docPath)) {
        console.log(`  Processing: ${path.basename(docPath)}`);
        const content = await fs.readFile(docPath, 'utf-8');
        documents.push({ path: docPath, content });
      }
    }
    
    // 3. Calculate comprehensive Trust Debt
    console.log('\n⚙️ Calculating Trust Debt...');
    const debtAnalysis = calculateComprehensiveTrustDebt(documents, gitInfo);
    console.log(`  Total Debt: ${debtAnalysis.totalDebt} units`);
    console.log(`  FIM Score: M=${debtAnalysis.fim.momentum.toFixed(0)}% (S=${debtAnalysis.fim.skill.toFixed(0)}% × E=${debtAnalysis.fim.environment.toFixed(0)}%)`);
    
    // 4. Build target ShortLex structure
    const shortlex = buildTargetShortLex(debtAnalysis);
    
    // 5. Generate HTML
    console.log('\n🎨 Generating visualization...');
    const htmlContent = await generateFinalHTML(debtAnalysis, gitInfo, shortlex);
    const htmlPath = path.join(__dirname, '..', `trust-debt-final-${Date.now()}.html`);
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
    
    // 7. Generate Claude prompt
    const prompt = `# 🎯 Trust Debt Analysis: ${debtAnalysis.totalDebt} Units

## FIM Score
**M = S × E = ${debtAnalysis.fim.momentum.toFixed(0)}%**
- Skill: ${debtAnalysis.fim.skill.toFixed(0)}% (execution alignment)
- Environment: ${debtAnalysis.fim.environment.toFixed(0)}% (spec freshness)
- Leverage: ${debtAnalysis.fim.leverage.toFixed(1)}x multiplicative effect

## Commit Trend
${gitInfo.trend ? `Direction: ${gitInfo.trend.direction}
Recent: ${gitInfo.trend.recent.toFixed(0)} → Previous: ${gitInfo.trend.previous.toFixed(0)} → Older: ${gitInfo.trend.older.toFixed(0)}
Momentum: ${gitInfo.trend.momentum.toFixed(0)}` : 'Not enough commits for trend analysis'}

## Intent vs Reality Gaps
- Trust: ${(debtAnalysis.intentVector.trust * 100).toFixed(0)}% intent vs ${(debtAnalysis.realityVector.trust * 100).toFixed(0)}% reality
- Timing: ${(debtAnalysis.intentVector.timing * 100).toFixed(0)}% intent vs ${(debtAnalysis.realityVector.timing * 100).toFixed(0)}% reality
- Recognition: ${(debtAnalysis.intentVector.recognition * 100).toFixed(0)}% intent vs ${(debtAnalysis.realityVector.recognition * 100).toFixed(0)}% reality

## Status
${debtAnalysis.isInsurable ? '✅ INSURABLE' : `❌ NOT INSURABLE (Gap: ${debtAnalysis.insurabilityGap}%)`}

## Recent Commit Alignment
${gitInfo.commits.slice(0, 3).map(c => 
  `- ${c.hash}: ${c.alignment.primary} focus (${c.alignment.primaryScore > 0 ? '+' : ''}${c.alignment.primaryScore})`
).join('\n')}

The visualization is open in your browser.`;
    
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
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  getGitCommitsWithAnalysis,
  analyzeCommitAlignment,
  calculateComprehensiveTrustDebt
};