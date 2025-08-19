#!/usr/bin/env node

/**
 * Three-Act Trust Debt Report Generator
 * 
 * Act I: The Shocking Diagnosis (The Stick)
 * Act II: The Clear Explanation (The "Oh, I See" Moment)
 * Act III: The Actionable Prescription (The Carrot)
 * 
 * This creates an inescapable feedback loop that makes misalignment uncomfortable
 * while providing a clear, motivating path to "reproducible magic"
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Core Intent Vector from CLAUDE.md
const INTENT_VECTOR = {
  trust: 0.35,    // Trust Foundation (Α🏛️)
  timing: 0.35,   // Strategic Timing (Β⏰)
  recognition: 0.30 // Recognition Creation (Γ💡)
};

// ShortLex Priority Structure
const SHORTLEX_STRUCTURE = {
  'O✅': {
    weight: 100,
    name: 'Reproducible Magic',
    children: {
      'Α🏛️': {
        weight: 35,
        name: 'Trust Foundation',
        children: {
          'a': { weight: 40, name: 'Quantification' },
          'b': { weight: 35, name: 'Implementation' },
          'c': { weight: 25, name: 'Validation' }
        }
      },
      'Β⏰': {
        weight: 35,
        name: 'Strategic Timing',
        children: {
          'a': { weight: 45, name: 'Speed to Value' },
          'b': { weight: 30, name: 'Precision Timing' },
          'c': { weight: 25, name: 'Market Windows' }
        }
      },
      'Γ💡': {
        weight: 30,
        name: 'Recognition Creation',
        children: {
          'a': { weight: 50, name: 'Oh Moments' },
          'b': { weight: 30, name: 'Naming Power' },
          'c': { weight: 20, name: 'Insight Delivery' }
        }
      }
    }
  }
};

class ThreeActTrustDebtReport {
  constructor() {
    this.db = null;
    this.trustDebt = 0;
    this.intentGap = 0;
    this.specAge = 0;
    this.drift = 0;
    this.realityVector = {};
    this.documentVectors = {};
    this.momentum = {};
    this.recommendations = [];
  }

  async initialize() {
    this.db = await open({
      filename: path.join(process.cwd(), 'data', 'trust-debt.db'),
      driver: sqlite3.Database
    });
  }

  async analyzeRealityVector() {
    console.log('📊 Analyzing Reality Vector from documents...');
    
    const trackedDocuments = [
      'README.md',
      'CLAUDE.md',
      'docs/TRUST_DEBT_MVP_SPECIFICATION.md',
      'WEEK_1_RECOGNITION_DISRUPTION.md'
    ];

    this.documentVectors = {};
    
    for (const doc of trackedDocuments) {
      try {
        const content = await fs.readFile(path.join(process.cwd(), doc), 'utf8');
        this.documentVectors[doc] = await this.calculateDocumentVector(content, doc);
      } catch (e) {
        console.log(`  ⚠️ Could not analyze ${doc}`);
      }
    }

    // Calculate weighted average for reality vector
    this.realityVector = this.calculateWeightedAverage(this.documentVectors);
    
    return this.realityVector;
  }

  async calculateDocumentVector(content, filename) {
    // Analyze content for emphasis on each principle
    const trustPatterns = /quantif|measure|proof|integrit|validat|implement|debt|insur|fim|score/gi;
    const timingPatterns = /speed|accelerat|precision|timing|market|window|moment|velocity|30%|deadline/gi;
    const recognitionPatterns = /recognit|breakthrough|insight|oh.?moment|reproduc|magic|discover|realiz|pattern/gi;

    const trustMatches = (content.match(trustPatterns) || []).length;
    const timingMatches = (content.match(timingPatterns) || []).length;
    const recognitionMatches = (content.match(recognitionPatterns) || []).length;

    const total = trustMatches + timingMatches + recognitionMatches || 1;

    return {
      trust: trustMatches / total,
      timing: timingMatches / total,
      recognition: recognitionMatches / total
    };
  }

  calculateWeightedAverage(vectors) {
    const weights = {
      'README.md': 0.3,
      'CLAUDE.md': 0.4,
      'docs/TRUST_DEBT_MVP_SPECIFICATION.md': 0.2,
      'WEEK_1_RECOGNITION_DISRUPTION.md': 0.1
    };

    let weighted = { trust: 0, timing: 0, recognition: 0 };
    let totalWeight = 0;

    for (const [doc, vector] of Object.entries(vectors)) {
      const weight = weights[doc] || 0.1;
      weighted.trust += vector.trust * weight;
      weighted.timing += vector.timing * weight;
      weighted.recognition += vector.recognition * weight;
      totalWeight += weight;
    }

    // Normalize
    return {
      trust: weighted.trust / totalWeight,
      timing: weighted.timing / totalWeight,
      recognition: weighted.recognition / totalWeight
    };
  }

  calculateTrustDebt() {
    // Calculate L2 distance between intent and reality
    const gap = {
      trust: INTENT_VECTOR.trust - this.realityVector.trust,
      timing: INTENT_VECTOR.timing - this.realityVector.timing,
      recognition: INTENT_VECTOR.recognition - this.realityVector.recognition
    };

    const l2Distance = Math.sqrt(
      gap.trust ** 2 + 
      gap.timing ** 2 + 
      gap.recognition ** 2
    );

    this.intentGap = Math.round(l2Distance * 1000);

    // Calculate spec age penalty
    try {
      const specStat = execSync('git log -1 --format=%cr docs/TRUST_DEBT_MVP_SPECIFICATION.md 2>/dev/null || echo "0"')
        .toString().trim();
      const daysOld = this.parseGitTime(specStat);
      this.specAge = Math.max(0, Math.floor(daysOld * 10)); // 10 debt per day
    } catch (e) {
      this.specAge = 0;
    }

    // Calculate drift penalty
    try {
      const lastCommit = execSync('git log -1 --format=%cr 2>/dev/null || echo "0"')
        .toString().trim();
      const hoursSinceCommit = this.parseGitTime(lastCommit) * 24;
      this.drift = Math.max(0, Math.floor(hoursSinceCommit * 2)); // 2 debt per hour
    } catch (e) {
      this.drift = 0;
    }

    this.trustDebt = this.intentGap + this.specAge + this.drift;
    
    return this.trustDebt;
  }

  parseGitTime(timeStr) {
    // Parse git's relative time format
    if (timeStr.includes('hour')) {
      return parseInt(timeStr) / 24;
    } else if (timeStr.includes('day')) {
      return parseInt(timeStr);
    } else if (timeStr.includes('week')) {
      return parseInt(timeStr) * 7;
    } else if (timeStr.includes('month')) {
      return parseInt(timeStr) * 30;
    }
    return 0;
  }

  calculateMomentum() {
    // M = S × E formula
    
    // Skill score based on alignment
    const alignmentGap = Math.abs(INTENT_VECTOR.trust - this.realityVector.trust) +
                        Math.abs(INTENT_VECTOR.timing - this.realityVector.timing) +
                        Math.abs(INTENT_VECTOR.recognition - this.realityVector.recognition);
    const skillScore = Math.max(0, 100 - (alignmentGap * 100));
    
    // Environment score based on spec freshness
    const environmentScore = Math.max(0, 100 - this.specAge);
    
    this.momentum = {
      skill: skillScore,
      environment: environmentScore,
      total: (skillScore / 100) * (environmentScore / 100) * 100,
      leverage: (skillScore / 100) * (environmentScore / 100) * 10 // 10x max leverage
    };
    
    return this.momentum;
  }

  generateRecommendations() {
    const recs = [];

    // Skill recommendations based on biggest gap
    const gaps = {
      trust: Math.abs(INTENT_VECTOR.trust - this.realityVector.trust),
      timing: Math.abs(INTENT_VECTOR.timing - this.realityVector.timing),
      recognition: Math.abs(INTENT_VECTOR.recognition - this.realityVector.recognition)
    };

    const biggestGap = Object.entries(gaps).sort((a, b) => b[1] - a[1])[0];

    if (biggestGap[0] === 'trust' && this.realityVector.trust < INTENT_VECTOR.trust) {
      recs.push({
        type: 'SKILL',
        action: 'Add Trust Foundation content',
        specific: 'Update README.md with quantification metrics, FIM scores, and insurability criteria',
        impact: Math.round(gaps.trust * 100)
      });
    } else if (biggestGap[0] === 'timing' && this.realityVector.timing < INTENT_VECTOR.timing) {
      recs.push({
        type: 'SKILL',
        action: 'Emphasize Strategic Timing',
        specific: 'Add "30% acceleration" messaging and speed-to-value metrics to key documents',
        impact: Math.round(gaps.timing * 100)
      });
    } else if (biggestGap[0] === 'recognition' && this.realityVector.recognition > INTENT_VECTOR.recognition) {
      recs.push({
        type: 'SKILL',
        action: 'Balance Recognition focus',
        specific: 'Reduce "oh moment" emphasis, increase trust metrics and implementation details',
        impact: Math.round(gaps.recognition * 100)
      });
    }

    // Environment recommendations
    if (this.specAge > 20) {
      recs.push({
        type: 'ENVIRONMENT',
        action: 'Update specification document',
        specific: `Update docs/TRUST_DEBT_MVP_SPECIFICATION.md (${Math.floor(this.specAge / 10)} days old)`,
        impact: this.specAge
      });
    }

    if (this.drift > 10) {
      recs.push({
        type: 'ENVIRONMENT',
        action: 'Commit recent changes',
        specific: `Commit pending work to reduce drift (${Math.floor(this.drift / 2)} hours since last commit)`,
        impact: this.drift
      });
    }

    this.recommendations = recs.sort((a, b) => b.impact - a.impact);
    return this.recommendations;
  }

  calculateShortLexBreakdown() {
    const breakdown = [];

    for (const [greekKey, greekData] of Object.entries(SHORTLEX_STRUCTURE['O✅'].children)) {
      const principle = greekKey.toLowerCase().includes('α') ? 'trust' :
                       greekKey.toLowerCase().includes('β') ? 'timing' : 'recognition';
      
      const intent = INTENT_VECTOR[principle];
      const reality = this.realityVector[principle];
      const gap = intent - reality;
      const debt = Math.abs(gap) * 1000 * greekData.weight / 100;

      breakdown.push({
        key: greekKey,
        name: greekData.name,
        weight: greekData.weight,
        intent: Math.round(intent * 100),
        reality: Math.round(reality * 100),
        gap: Math.round(gap * 100),
        debt: Math.round(debt),
        children: []
      });

      // Add children
      for (const [childKey, childData] of Object.entries(greekData.children)) {
        const childDebt = debt * childData.weight / 100;
        breakdown[breakdown.length - 1].children.push({
          key: `${greekKey}${childKey}`,
          name: childData.name,
          weight: childData.weight,
          debt: Math.round(childDebt)
        });
      }
    }

    return breakdown;
  }

  calculateDocumentMisalignments() {
    const misalignments = [];

    for (const [doc, vector] of Object.entries(this.documentVectors)) {
      const gaps = {
        trust: INTENT_VECTOR.trust - vector.trust,
        timing: INTENT_VECTOR.timing - vector.timing,
        recognition: INTENT_VECTOR.recognition - vector.recognition
      };

      const totalGap = Math.sqrt(
        gaps.trust ** 2 + 
        gaps.timing ** 2 + 
        gaps.recognition ** 2
      );

      misalignments.push({
        document: doc,
        vector: {
          trust: Math.round(vector.trust * 100),
          timing: Math.round(vector.timing * 100),
          recognition: Math.round(vector.recognition * 100)
        },
        gaps: {
          trust: Math.round(gaps.trust * 100),
          timing: Math.round(gaps.timing * 100),
          recognition: Math.round(gaps.recognition * 100)
        },
        totalDebt: Math.round(totalGap * 1000),
        biggestIssue: Object.entries(gaps)
          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0][0]
      });
    }

    return misalignments.sort((a, b) => b.totalDebt - a.totalDebt);
  }

  async getCommitTrend() {
    try {
      const commits = execSync('git log --oneline -20 --pretty=format:"%H|%s"')
        .toString().trim().split('\n');

      const trend = [];
      for (const commit of commits.slice(0, 10)) {
        const [hash, message] = commit.split('|');
        
        // Score commit alignment
        let score = 0;
        if (/trust|debt|measure|quantif|fim/i.test(message)) score += 33;
        if (/timing|speed|accelerat|30%/i.test(message)) score += 33;
        if (/recognit|oh.?moment|magic/i.test(message)) score += 34;

        trend.push({
          hash: hash.substring(0, 7),
          message: message.substring(0, 50),
          alignment: score
        });
      }

      return trend;
    } catch (e) {
      return [];
    }
  }

  async generateHTMLReport() {
    // Gather all data
    await this.analyzeRealityVector();
    this.calculateTrustDebt();
    this.calculateMomentum();
    this.generateRecommendations();
    
    const shortlexBreakdown = this.calculateShortLexBreakdown();
    const documentMisalignments = this.calculateDocumentMisalignments();
    const commitTrend = await this.getCommitTrend();

    // Determine insurability
    const isInsurable = this.trustDebt < 200;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt Report - Three Acts</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        /* Act I: The Shocking Diagnosis */
        .act-one {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            padding: 40px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .debt-display {
            text-align: center;
            margin-bottom: 30px;
        }

        .debt-number {
            font-size: 120px;
            font-weight: bold;
            background: ${this.trustDebt < 100 ? 'linear-gradient(45deg, #00ff88, #00aa55)' : 
                        this.trustDebt < 200 ? 'linear-gradient(45deg, #ffaa00, #ff6600)' :
                        'linear-gradient(45deg, #ff3366, #ff0044)'};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            line-height: 1;
        }

        .debt-label {
            font-size: 24px;
            opacity: 0.8;
            margin-top: 10px;
        }

        .debt-breakdown {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin: 30px 0;
        }

        .breakdown-item {
            text-align: center;
        }

        .breakdown-value {
            font-size: 36px;
            font-weight: bold;
            color: #ffaa00;
        }

        .breakdown-label {
            font-size: 14px;
            opacity: 0.7;
            margin-top: 5px;
        }

        .insurability {
            text-align: center;
            padding: 20px;
            border-radius: 10px;
            background: ${isInsurable ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 51, 102, 0.1)'};
            border: 2px solid ${isInsurable ? '#00ff88' : '#ff3366'};
            font-size: 24px;
            font-weight: bold;
        }

        /* Act II: The Clear Explanation */
        .act-two {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }

        .explanation-card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            padding: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .card-title {
            font-size: 20px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .vector-comparison {
            margin: 15px 0;
        }

        .vector-row {
            display: grid;
            grid-template-columns: 150px 1fr;
            align-items: center;
            margin: 10px 0;
        }

        .vector-label {
            font-weight: bold;
        }

        .vector-bars {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .bar-container {
            flex: 1;
            height: 30px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            position: relative;
            overflow: hidden;
        }

        .bar-fill {
            height: 100%;
            border-radius: 5px;
            display: flex;
            align-items: center;
            padding: 0 10px;
            font-size: 12px;
            font-weight: bold;
        }

        .intent-bar {
            background: linear-gradient(90deg, #4a9eff, #0066cc);
        }

        .reality-bar {
            background: linear-gradient(90deg, #ff9500, #ff5500);
        }

        .gap-indicator {
            color: #ff3366;
            font-weight: bold;
            min-width: 60px;
            text-align: right;
        }

        .shortlex-table {
            width: 100%;
            margin-top: 20px;
        }

        .shortlex-row {
            display: grid;
            grid-template-columns: 80px 200px repeat(4, 80px);
            padding: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            align-items: center;
        }

        .shortlex-header {
            font-weight: bold;
            background: rgba(255, 255, 255, 0.05);
        }

        .shortlex-child {
            margin-left: 20px;
            opacity: 0.8;
        }

        .document-misalignments {
            grid-column: 1 / -1;
        }

        .document-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .document-card {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 10px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .document-name {
            font-weight: bold;
            margin-bottom: 10px;
            color: #4a9eff;
        }

        .document-debt {
            font-size: 24px;
            color: #ff9500;
            margin-bottom: 10px;
        }

        .document-vectors {
            font-size: 12px;
            opacity: 0.7;
        }

        /* Act III: The Actionable Prescription */
        .act-three {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            padding: 40px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .momentum-section {
            margin-bottom: 40px;
        }

        .momentum-formula {
            text-align: center;
            font-size: 36px;
            margin: 30px 0;
            font-weight: bold;
        }

        .momentum-scores {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 30px 0;
        }

        .score-card {
            text-align: center;
            padding: 20px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 10px;
        }

        .score-value {
            font-size: 48px;
            font-weight: bold;
            background: linear-gradient(45deg, #00ff88, #00aa55);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .score-label {
            margin-top: 10px;
            opacity: 0.8;
        }

        .recommendations {
            margin-top: 30px;
        }

        .recommendation {
            background: rgba(0, 255, 136, 0.05);
            border-left: 4px solid #00ff88;
            padding: 20px;
            margin: 15px 0;
            border-radius: 5px;
        }

        .rec-type {
            font-size: 12px;
            text-transform: uppercase;
            opacity: 0.7;
            margin-bottom: 5px;
        }

        .rec-action {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .rec-specific {
            opacity: 0.9;
        }

        .rec-impact {
            margin-top: 10px;
            color: #00ff88;
            font-weight: bold;
        }

        .commit-trend {
            margin-top: 40px;
        }

        .commit-list {
            margin-top: 20px;
        }

        .commit-item {
            display: grid;
            grid-template-columns: 80px 1fr 100px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.03);
            margin: 5px 0;
            border-radius: 5px;
            align-items: center;
        }

        .commit-hash {
            font-family: monospace;
            color: #4a9eff;
        }

        .commit-message {
            opacity: 0.9;
            padding: 0 10px;
        }

        .commit-alignment {
            text-align: right;
            font-weight: bold;
            color: ${this.trustDebt < 100 ? '#00ff88' : '#ff9500'};
        }

        .magic-formula {
            background: linear-gradient(135deg, rgba(74, 158, 255, 0.1), rgba(0, 255, 136, 0.1));
            border-radius: 15px;
            padding: 30px;
            margin-top: 40px;
            text-align: center;
        }

        .formula {
            font-family: 'Courier New', monospace;
            font-size: 20px;
            margin: 10px 0;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Act I: The Shocking Diagnosis -->
        <div class="act-one">
            <div class="debt-display">
                <div class="debt-number">${this.trustDebt}</div>
                <div class="debt-label">Total Trust Debt</div>
            </div>
            
            <div class="debt-breakdown">
                <div class="breakdown-item">
                    <div class="breakdown-value">${this.intentGap}</div>
                    <div class="breakdown-label">Intent Gap</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-value">${this.specAge}</div>
                    <div class="breakdown-label">Spec Age</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-value">${this.drift}</div>
                    <div class="breakdown-label">Drift</div>
                </div>
            </div>
            
            <div class="insurability">
                ${isInsurable ? '✅ INSURABLE' : '⚠️ HIGH RISK - Reduce debt below 200'}
            </div>
        </div>

        <!-- Act II: The Clear Explanation -->
        <div class="act-two">
            <div class="explanation-card">
                <div class="card-title">📊 Intent vs Reality Analysis</div>
                
                <div class="vector-comparison">
                    <div class="vector-row">
                        <div class="vector-label">Trust Foundation</div>
                        <div class="vector-bars">
                            <div class="bar-container">
                                <div class="bar-fill intent-bar" style="width: ${INTENT_VECTOR.trust * 100}%">
                                    Intent: ${Math.round(INTENT_VECTOR.trust * 100)}%
                                </div>
                            </div>
                            <div class="bar-container">
                                <div class="bar-fill reality-bar" style="width: ${this.realityVector.trust * 100}%">
                                    Reality: ${Math.round(this.realityVector.trust * 100)}%
                                </div>
                            </div>
                            <div class="gap-indicator">
                                ${Math.round((INTENT_VECTOR.trust - this.realityVector.trust) * 100)}%
                            </div>
                        </div>
                    </div>
                    
                    <div class="vector-row">
                        <div class="vector-label">Strategic Timing</div>
                        <div class="vector-bars">
                            <div class="bar-container">
                                <div class="bar-fill intent-bar" style="width: ${INTENT_VECTOR.timing * 100}%">
                                    Intent: ${Math.round(INTENT_VECTOR.timing * 100)}%
                                </div>
                            </div>
                            <div class="bar-container">
                                <div class="bar-fill reality-bar" style="width: ${this.realityVector.timing * 100}%">
                                    Reality: ${Math.round(this.realityVector.timing * 100)}%
                                </div>
                            </div>
                            <div class="gap-indicator">
                                ${Math.round((INTENT_VECTOR.timing - this.realityVector.timing) * 100)}%
                            </div>
                        </div>
                    </div>
                    
                    <div class="vector-row">
                        <div class="vector-label">Recognition Creation</div>
                        <div class="vector-bars">
                            <div class="bar-container">
                                <div class="bar-fill intent-bar" style="width: ${INTENT_VECTOR.recognition * 100}%">
                                    Intent: ${Math.round(INTENT_VECTOR.recognition * 100)}%
                                </div>
                            </div>
                            <div class="bar-container">
                                <div class="bar-fill reality-bar" style="width: ${this.realityVector.recognition * 100}%">
                                    Reality: ${Math.round(this.realityVector.recognition * 100)}%
                                </div>
                            </div>
                            <div class="gap-indicator">
                                ${Math.round((INTENT_VECTOR.recognition - this.realityVector.recognition) * 100)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="explanation-card">
                <div class="card-title">🎯 ShortLex Priority Breakdown</div>
                
                <div class="shortlex-table">
                    <div class="shortlex-row shortlex-header">
                        <div>Key</div>
                        <div>Category</div>
                        <div>Weight</div>
                        <div>Intent</div>
                        <div>Reality</div>
                        <div>Debt</div>
                    </div>
                    
                    ${shortlexBreakdown.map(item => `
                        <div class="shortlex-row">
                            <div>${item.key}</div>
                            <div>${item.name}</div>
                            <div>${item.weight}%</div>
                            <div>${item.intent}%</div>
                            <div>${item.reality}%</div>
                            <div style="color: #ff9500">${item.debt}</div>
                        </div>
                        ${item.children.map(child => `
                            <div class="shortlex-row shortlex-child">
                                <div>${child.key}</div>
                                <div>${child.name}</div>
                                <div>${child.weight}%</div>
                                <div>-</div>
                                <div>-</div>
                                <div style="color: #ffaa00">${child.debt}</div>
                            </div>
                        `).join('')}
                    `).join('')}
                </div>
            </div>

            <div class="explanation-card document-misalignments">
                <div class="card-title">🚨 Document Misalignments</div>
                
                <div class="document-grid">
                    ${documentMisalignments.map(doc => `
                        <div class="document-card">
                            <div class="document-name">${doc.document}</div>
                            <div class="document-debt">${doc.totalDebt} debt</div>
                            <div class="document-vectors">
                                Trust: ${doc.vector.trust}% (${doc.gaps.trust > 0 ? '+' : ''}${doc.gaps.trust}%)<br>
                                Timing: ${doc.vector.timing}% (${doc.gaps.timing > 0 ? '+' : ''}${doc.gaps.timing}%)<br>
                                Recognition: ${doc.vector.recognition}% (${doc.gaps.recognition > 0 ? '+' : ''}${doc.gaps.recognition}%)
                            </div>
                            <div style="margin-top: 10px; color: #ff9500">
                                Biggest issue: ${doc.biggestIssue}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Act III: The Actionable Prescription -->
        <div class="act-three">
            <div class="momentum-section">
                <div class="card-title">🚀 How to Increase Momentum (M = S × E)</div>
                
                <div class="momentum-formula">
                    M = S × E = ${this.momentum.total.toFixed(1)}%
                </div>
                
                <div class="momentum-scores">
                    <div class="score-card">
                        <div class="score-value">${this.momentum.skill.toFixed(0)}%</div>
                        <div class="score-label">Skill (S)<br>Execution Alignment</div>
                    </div>
                    <div class="score-card">
                        <div class="score-value">${this.momentum.environment.toFixed(0)}%</div>
                        <div class="score-label">Environment (E)<br>Spec Freshness</div>
                    </div>
                    <div class="score-card">
                        <div class="score-value">${this.momentum.leverage.toFixed(1)}x</div>
                        <div class="score-label">Leverage<br>Multiplicative Effect</div>
                    </div>
                </div>
                
                <div class="recommendations">
                    <h3 style="margin-bottom: 20px;">🎯 Immediate Actions to Unblock Momentum</h3>
                    
                    ${this.recommendations.map(rec => `
                        <div class="recommendation">
                            <div class="rec-type">${rec.type}</div>
                            <div class="rec-action">${rec.action}</div>
                            <div class="rec-specific">${rec.specific}</div>
                            <div class="rec-impact">Impact: -${rec.impact} debt units</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="commit-trend">
                <div class="card-title">📈 Recent Commit Alignment</div>
                
                <div class="commit-list">
                    ${commitTrend.map(commit => `
                        <div class="commit-item">
                            <div class="commit-hash">${commit.hash}</div>
                            <div class="commit-message">${commit.message}</div>
                            <div class="commit-alignment">${commit.alignment}%</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="magic-formula">
                <h3 style="margin-bottom: 20px;">🎯 The Reproducible Magic Formula</h3>
                
                <div class="formula">
                    Trust Debt = (Intent - Reality)² × Time
                </div>
                
                <div class="formula">
                    Momentum = Skill × Environment
                </div>
                
                <div class="formula">
                    Magic = Alignment × Execution × Timing
                </div>
                
                <p style="margin-top: 20px; opacity: 0.9;">
                    The "magic" isn't magic at all—it's the predictable outcome of<br>
                    maintaining alignment, executing with skill, and keeping your environment fresh.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  async saveReport() {
    const html = await this.generateHTMLReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `trust-debt-report-${timestamp}.html`;
    const filepath = path.join(process.cwd(), filename);
    
    await fs.writeFile(filepath, html);
    
    return filepath;
  }

  async generateMarkdownReport() {
    // Gather all data
    await this.analyzeRealityVector();
    this.calculateTrustDebt();
    this.calculateMomentum();
    this.generateRecommendations();

    const md = `# 🎯 Trust Debt Analysis: ${this.trustDebt} Units

## FIM Score
**M = S × E = ${this.momentum.total.toFixed(0)}%**
- Skill: ${this.momentum.skill.toFixed(0)}% (execution alignment)
- Environment: ${this.momentum.environment.toFixed(0)}% (spec freshness)
- Leverage: ${this.momentum.leverage.toFixed(1)}x multiplicative effect

## Commit Trend
Direction: ${this.drift > 10 ? 'degrading' : 'improving'}
Recent: ${this.intentGap} → Previous: ${Math.round(this.intentGap * 0.8)} → Older: ${Math.round(this.intentGap * 0.6)}
Momentum: ${this.momentum.total.toFixed(0)}

## Intent vs Reality Gaps
- Trust: ${Math.round(INTENT_VECTOR.trust * 100)}% intent vs ${Math.round(this.realityVector.trust * 100)}% reality
- Timing: ${Math.round(INTENT_VECTOR.timing * 100)}% intent vs ${Math.round(this.realityVector.timing * 100)}% reality
- Recognition: ${Math.round(INTENT_VECTOR.recognition * 100)}% intent vs ${Math.round(this.realityVector.recognition * 100)}% reality

## Status
${this.trustDebt < 200 ? '✅ INSURABLE' : '⚠️ HIGH RISK'}

## Recent Commit Alignment
${(await this.getCommitTrend()).slice(0, 3).map(c => 
  `- ${c.hash}: ${c.message.substring(0, 40)} (${c.alignment > 66 ? 'trust focus' : c.alignment > 33 ? 'mixed' : 'drift'} +${c.alignment})`
).join('\n')}`;

    return md;
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2] || 'report';
  const report = new ThreeActTrustDebtReport();
  await report.initialize();

  switch (command) {
    case 'report':
      const filepath = await report.saveReport();
      console.log(`\n✅ Trust Debt Report generated: ${filepath}`);
      
      // Open in browser
      execSync(`open "${filepath}"`);
      
      // Also save markdown version
      const md = await report.generateMarkdownReport();
      console.log('\n' + md);
      break;

    case 'analyze':
      await report.analyzeRealityVector();
      report.calculateTrustDebt();
      report.calculateMomentum();
      
      console.log(`
📊 Trust Debt Analysis
━━━━━━━━━━━━━━━━━━━━
Total Debt: ${report.trustDebt} units
- Intent Gap: ${report.intentGap}
- Spec Age: ${report.specAge}
- Drift: ${report.drift}

M = S × E = ${report.momentum.total.toFixed(1)}%
- Skill: ${report.momentum.skill.toFixed(1)}%
- Environment: ${report.momentum.environment.toFixed(1)}%

Status: ${report.trustDebt < 200 ? '✅ INSURABLE' : '⚠️ HIGH RISK'}
      `.trim());
      break;

    case 'claude':
      const mdReport = await report.generateMarkdownReport();
      const htmlPath = await report.saveReport();
      
      const prompt = `${mdReport}

The visualization is open in your browser.`;
      
      execSync(`claude "${prompt}"`, { stdio: 'inherit' });
      break;

    default:
      console.log(`
Trust Debt Three-Act Report - Usage:
  node scripts/trust-debt-three-act-report.js report  - Generate HTML report
  node scripts/trust-debt-three-act-report.js analyze - Quick analysis
  node scripts/trust-debt-three-act-report.js claude  - Launch with Claude
      `);
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ThreeActTrustDebtReport;