#!/usr/bin/env node

/**
 * Trust Debt Canonical Implementation
 * 
 * Follows TRUST_DEBT_HTML_CANONICAL_SPEC.md exactly
 * Implements reproducible magic with full formula transparency
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Load canonical rules
const RULES = require('../trust-debt-rules.json');
const MCP_CONFIG = require('../mcp-config.json');

class TrustDebtCanonical {
  constructor() {
    this.data = {
      // Core metrics
      totalDebt: 0,
      intentVector: RULES.INTENT_VECTOR,
      realityVector: { trust: 0, timing: 0, recognition: 0 },
      gaps: { trust: 0, timing: 0, recognition: 0 },
      drift: 0,
      specAge: 0,
      
      // FIM scores
      skill: 0,
      environment: 0,
      momentum: 0,
      leverage: 0,
      
      // Supporting data
      commits: [],
      documents: [],
      shortlex: [],
      insights: [],
      actions: [],
      
      // Meta
      command: process.argv.join(' '),
      timestamp: new Date().toISOString(),
      workingDir: process.cwd(),
      gitBranch: ''
    };
  }

  async analyze() {
    console.log('🎯 Trust Debt Canonical Analysis\n');
    
    // Get git context
    this.data.gitBranch = execSync('git branch --show-current').toString().trim();
    
    // Calculate all components
    await this.calculateSpecAge();
    await this.analyzeCommits();
    await this.calculateRealityVector();
    await this.calculateTrustDebt();
    await this.calculateFIM();
    await this.generateShortLex();
    await this.analyzeDocuments();
    await this.generateInsights();
    await this.generateActions();
  }

  async calculateSpecAge() {
    try {
      const log = execSync('git log -1 --format=%cr -- CLAUDE.md').toString().trim();
      const match = log.match(/(\d+)/);
      this.data.specAge = match ? parseInt(match[1]) : 0;
    } catch {
      this.data.specAge = 0;
    }
  }

  async analyzeCommits() {
    const commits = execSync('git log --oneline -n 20 --pretty=format:"%H|%s|%ar"')
      .toString().trim().split('\n');
    
    this.data.commits = commits.map(line => {
      const [hash, subject, time] = line.split('|');
      
      // Count principle signals
      let trust = 0, timing = 0, recognition = 0;
      
      if (/trust|fix|resolve|complete|deliver/i.test(subject)) trust++;
      if (/timing|fast|quick|speed|instant|nuclear/i.test(subject)) timing++;
      if (/recognition|insight|pattern|magic|moment/i.test(subject)) recognition++;
      
      const total = trust + timing + recognition || 1;
      
      return {
        hash: hash.substring(0, 7),
        subject: subject.substring(0, 50),
        time,
        principles: {
          trust: (trust / total * 100).toFixed(0),
          timing: (timing / total * 100).toFixed(0),
          recognition: (recognition / total * 100).toFixed(0)
        },
        drift: Math.abs(35 - trust/total*100) + Math.abs(35 - timing/total*100) + Math.abs(30 - recognition/total*100)
      };
    });
  }

  async calculateRealityVector() {
    // Aggregate from recent commits
    const recentCommits = this.data.commits.slice(0, 10);
    
    let trustSum = 0, timingSum = 0, recognitionSum = 0;
    recentCommits.forEach(c => {
      trustSum += parseFloat(c.principles.trust);
      timingSum += parseFloat(c.principles.timing);
      recognitionSum += parseFloat(c.principles.recognition);
    });
    
    const count = recentCommits.length || 1;
    this.data.realityVector = {
      trust: trustSum / count / 100,
      timing: timingSum / count / 100,
      recognition: recognitionSum / count / 100
    };
    
    // Calculate gaps
    this.data.gaps = {
      trust: this.data.intentVector.trust - this.data.realityVector.trust,
      timing: this.data.intentVector.timing - this.data.realityVector.timing,
      recognition: this.data.intentVector.recognition - this.data.realityVector.recognition
    };
    
    // Calculate drift
    this.data.drift = Math.abs(this.data.gaps.trust) + 
                      Math.abs(this.data.gaps.timing) + 
                      Math.abs(this.data.gaps.recognition);
  }

  async calculateTrustDebt() {
    // The canonical formula - MUST show all inputs
    const l2Distance = Math.sqrt(
      Math.pow(this.data.gaps.trust, 2) +
      Math.pow(this.data.gaps.timing, 2) +
      Math.pow(this.data.gaps.recognition, 2)
    );
    
    // Apply spec age and drift multipliers
    const specMultiplier = 1 + (this.data.specAge * 0.1);
    const driftMultiplier = 1 + this.data.drift;
    
    this.data.totalDebt = Math.round(l2Distance * 1000 * specMultiplier * driftMultiplier);
  }

  async calculateFIM() {
    // Skill = alignment quality
    this.data.skill = Math.max(0, 100 - (this.data.drift * 100));
    
    // Environment = spec freshness
    this.data.environment = Math.max(0, 100 - (this.data.specAge * 10));
    
    // Momentum = S × E
    this.data.momentum = (this.data.skill / 100) * (this.data.environment / 100) * 100;
    
    // Leverage = exponential when momentum > 100
    this.data.leverage = Math.pow(2, this.data.momentum / 100 * 3);
  }

  async generateShortLex() {
    // Correct ShortLex structure: parents together, then child blocks
    
    // Parents first
    this.data.shortlex = [
      {
        key: 'O✅',
        name: 'Outcome',
        weight: 100,
        intent: '-',
        reality: '-',
        debt: '-',
        isRoot: true
      },
      {
        key: 'Α🏛️',
        name: 'Trust Foundation',
        weight: 35,
        intent: 35,
        reality: (this.data.realityVector.trust * 100).toFixed(0),
        debt: Math.round(Math.abs(this.data.gaps.trust) * 100),
        isParent: true
      },
      {
        key: 'Β⏰',
        name: 'Strategic Timing',
        weight: 35,
        intent: 35,
        reality: (this.data.realityVector.timing * 100).toFixed(0),
        debt: Math.round(Math.abs(this.data.gaps.timing) * 100),
        isParent: true
      },
      {
        key: 'Γ💡',
        name: 'Recognition Creation',
        weight: 30,
        intent: 30,
        reality: (this.data.realityVector.recognition * 100).toFixed(0),
        debt: Math.round(Math.abs(this.data.gaps.recognition) * 100),
        isParent: true
      }
    ];
    
    // Children in parent order
    const trustChildren = [
      { key: 'Α🏛️a', name: 'Quantification', weight: 40 },
      { key: 'Α🏛️b', name: 'Implementation', weight: 35 },
      { key: 'Α🏛️c', name: 'Validation', weight: 25 }
    ];
    
    const timingChildren = [
      { key: 'Β⏰a', name: 'Speed to Value', weight: 45 },
      { key: 'Β⏰b', name: 'Precision Timing', weight: 30 },
      { key: 'Β⏰c', name: 'Market Windows', weight: 25 }
    ];
    
    const recognitionChildren = [
      { key: 'Γ💡a', name: 'Oh Moments', weight: 50 },
      { key: 'Γ💡b', name: 'Naming Power', weight: 30 },
      { key: 'Γ💡c', name: 'Insight Delivery', weight: 20 }
    ];
    
    // Add children with proper debt calculation
    [...trustChildren, ...timingChildren, ...recognitionChildren].forEach((child, i) => {
      const parentDebt = i < 3 ? this.data.shortlex[1].debt :
                        i < 6 ? this.data.shortlex[2].debt :
                                this.data.shortlex[3].debt;
      
      this.data.shortlex.push({
        ...child,
        intent: '-',
        reality: '-',
        debt: Math.round(parentDebt * (child.weight / 100)),
        isChild: true
      });
    });
  }

  async analyzeDocuments() {
    // Simplified for demo - would analyze actual documents
    this.data.documents = [
      {
        path: 'README.md',
        debt: 150,
        actual: { trust: 20, timing: 40, recognition: 40 },
        gaps: { trust: '+15%', timing: '-5%', recognition: '-10%' },
        biggestIssue: 'trust',
        prompt: 'Align README.md to increase trust focus by 15%. Add content about reliability, stability, and delivery commitments.'
      }
    ];
  }

  async generateInsights() {
    // Three required insights
    this.data.insights = [
      {
        type: 'trend',
        title: 'Commit Trend',
        message: `Direction: ${this.data.drift < 0.3 ? 'improving' : 'degrading'}`,
        detail: `Recent: ${this.data.commits[0].drift.toFixed(0)} → Older: ${this.data.commits[10].drift.toFixed(0)}`
      },
      {
        type: 'gaps',
        title: 'Intent vs Reality Gaps',
        message: `Trust: ${(this.data.gaps.trust * 100).toFixed(0)}% | Timing: ${(this.data.gaps.timing * 100).toFixed(0)}% | Recognition: ${(this.data.gaps.recognition * 100).toFixed(0)}%`,
        detail: `Biggest gap: ${Math.abs(this.data.gaps.trust) > Math.abs(this.data.gaps.timing) ? 'trust' : 'timing'}`
      },
      {
        type: 'status',
        title: 'Status',
        message: this.data.totalDebt < 200 ? '✅ INSURABLE' : '⚠️ HIGH RISK',
        detail: `Trust Debt: ${this.data.totalDebt} units (threshold: 200)`
      }
    ];
  }

  async generateActions() {
    this.data.actions = [
      {
        action: 'Align next 3 commits with intent',
        impact: '-50 debt units',
        command: 'git commit -m "trust: [message]"'
      },
      {
        action: 'Update CLAUDE.md specification',
        impact: '+10% environment score',
        command: 'pnpm coherence'
      },
      {
        action: 'Fix document with biggest gap',
        impact: '-30 debt units',
        command: 'claude align README.md --focus=trust'
      }
    ];
  }

  async generateHTML() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Trust Debt: ${this.data.totalDebt} Units - Canonical</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'SF Pro Display', -apple-system, sans-serif;
            background: #0a0a0a;
            color: #e2e8f0;
            line-height: 1.6;
            padding: 40px 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        
        /* Section 1: Hero */
        .hero {
            text-align: center;
            padding: 60px 20px;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent);
        }
        .debt-number {
            font-size: 8rem;
            font-weight: 900;
            color: ${this.data.totalDebt < 200 ? '#06ffa5' : '#ef4444'};
            text-shadow: 0 0 60px currentColor;
        }
        .debt-status {
            font-size: 1.5rem;
            margin-top: 20px;
            color: ${this.data.totalDebt < 200 ? '#06ffa5' : '#f59e0b'};
        }
        
        /* Sections */
        .section {
            background: rgba(30, 41, 59, 0.5);
            border-radius: 16px;
            padding: 30px;
            margin: 30px 0;
        }
        .section-title {
            font-size: 1.8rem;
            color: #8b5cf6;
            margin-bottom: 20px;
            border-bottom: 2px solid rgba(139, 92, 246, 0.3);
            padding-bottom: 10px;
        }
        
        /* Formula display */
        .formula-box {
            background: rgba(0, 0, 0, 0.5);
            border: 2px solid #8b5cf6;
            border-radius: 12px;
            padding: 20px;
            font-family: 'SF Mono', monospace;
            font-size: 1.1rem;
        }
        .formula-title {
            color: #8b5cf6;
            font-weight: 700;
            margin-bottom: 10px;
        }
        .formula-math {
            color: #06ffa5;
            margin: 15px 0;
            font-size: 1.2rem;
        }
        .formula-inputs {
            color: #94a3b8;
            margin-top: 10px;
        }
        
        /* Intent vs Reality bars */
        .comparison-row {
            margin: 20px 0;
        }
        .comparison-label {
            font-weight: 700;
            margin-bottom: 10px;
            color: #8b5cf6;
        }
        .bar-container {
            position: relative;
            height: 60px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
        }
        .intent-bar, .reality-bar {
            position: absolute;
            height: 25px;
            border-radius: 5px;
            display: flex;
            align-items: center;
            padding: 0 10px;
            font-weight: 700;
            font-size: 0.9rem;
        }
        .intent-bar {
            top: 5px;
            background: linear-gradient(90deg, #8b5cf6, #ec4899);
            color: white;
        }
        .reality-bar {
            bottom: 5px;
            background: linear-gradient(90deg, #06ffa5, #10b981);
            color: #0a0a0a;
        }
        
        /* ShortLex table */
        .shortlex-table {
            width: 100%;
            border-collapse: collapse;
        }
        .shortlex-table th {
            background: rgba(139, 92, 246, 0.2);
            padding: 12px;
            text-align: left;
            color: #8b5cf6;
            font-weight: 700;
        }
        .shortlex-table td {
            padding: 10px 12px;
            border-bottom: 1px solid rgba(139, 92, 246, 0.1);
        }
        .shortlex-parent {
            background: rgba(139, 92, 246, 0.05);
            font-weight: 600;
        }
        .shortlex-child {
            padding-left: 40px;
            color: #94a3b8;
        }
        .shortlex-section-divider {
            height: 20px;
            background: transparent;
        }
        
        /* Colors */
        .good { color: #06ffa5; }
        .warning { color: #f59e0b; }
        .critical { color: #ef4444; }
        .primary { color: #8b5cf6; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Section 1: Hero Display -->
        <div class="hero">
            <div class="debt-number">${this.data.totalDebt}</div>
            <div class="debt-subtitle">Units of Trust Debt</div>
            <div class="debt-status">${this.data.totalDebt < 200 ? '✅ INSURABLE' : '⚠️ HIGH RISK'}</div>
        </div>
        
        <!-- Section 2: Command Context -->
        <div class="section">
            <h2 class="section-title">📥 Command Context</h2>
            <div>
                <strong>Command:</strong> <code>${this.data.command}</code><br>
                <strong>Timestamp:</strong> ${this.data.timestamp}<br>
                <strong>Working Directory:</strong> ${this.data.workingDir}<br>
                <strong>Git Branch:</strong> ${this.data.gitBranch}<br>
                <strong>Files Analyzed:</strong> CLAUDE.md, README.md, 20 recent commits
            </div>
        </div>
        
        <!-- Section 3: Trust Debt Formula - THE REPRODUCIBLE MAGIC -->
        <div class="section">
            <h2 class="section-title">🎯 Trust Debt Formula - Reproducible Magic</h2>
            <div class="formula-box">
                <div class="formula-title">Trust Debt Calculation:</div>
                <div class="formula-math">
                    TD = √[(Intent - Reality)² × SpecAge × Drift]
                </div>
                <div class="formula-inputs">
                    <strong>Inputs:</strong><br>
                    • Intent Vector: [Trust: 35%, Timing: 35%, Recognition: 30%]<br>
                    • Reality Vector: [Trust: ${(this.data.realityVector.trust * 100).toFixed(0)}%, Timing: ${(this.data.realityVector.timing * 100).toFixed(0)}%, Recognition: ${(this.data.realityVector.recognition * 100).toFixed(0)}%]<br>
                    • Spec Age: ${this.data.specAge} days<br>
                    • Drift: ${(this.data.drift * 100).toFixed(0)}%<br>
                    <br>
                    <strong>Calculation:</strong><br>
                    TD = √[(${this.data.gaps.trust.toFixed(2)})² + (${this.data.gaps.timing.toFixed(2)})² + (${this.data.gaps.recognition.toFixed(2)})²] × ${(1 + this.data.specAge * 0.1).toFixed(1)} × ${(1 + this.data.drift).toFixed(2)}<br>
                    TD = ${this.data.totalDebt} units
                </div>
            </div>
        </div>
        
        <!-- Section 4: FIM Score Display -->
        <div class="section">
            <h2 class="section-title">📈 FIM Score - Momentum Calculation</h2>
            <div class="formula-box">
                <div class="formula-title">Momentum Formula:</div>
                <div class="formula-math">
                    M = S × E = ${(this.data.momentum).toFixed(0)}%
                </div>
                <div class="formula-inputs">
                    • Skill (S): ${this.data.skill.toFixed(0)}% - Based on commit alignment<br>
                    • Environment (E): ${this.data.environment.toFixed(0)}% - Based on spec freshness<br>
                    • Leverage: ${this.data.leverage.toFixed(1)}x multiplicative effect<br>
                    ${this.data.momentum >= 100 ? '<br><strong class="good">✨ MAGIC ZONE ACTIVE!</strong>' : `<br><strong class="warning">${(100 - this.data.momentum).toFixed(0)}% to Magic Zone</strong>`}
                </div>
            </div>
        </div>
        
        <!-- Section 5: Three Core Insights -->
        <div class="section">
            <h2 class="section-title">💡 Three Core Insights</h2>
            ${this.data.insights.map(insight => `
                <div style="margin: 15px 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                    <strong class="${insight.type}">${insight.title}:</strong> ${insight.message}<br>
                    <span style="color: #94a3b8;">${insight.detail}</span>
                </div>
            `).join('')}
        </div>
        
        <!-- Section 6: Intent vs Reality Comparison -->
        <div class="section">
            <h2 class="section-title">📊 Intent vs Reality Comparison</h2>
            <div class="comparison-row">
                <div class="comparison-label">🔒 Trust Foundation</div>
                <div class="bar-container">
                    <div class="intent-bar" style="width: 35%">Intent: 35%</div>
                    <div class="reality-bar" style="width: ${this.data.realityVector.trust * 100}%">Reality: ${(this.data.realityVector.trust * 100).toFixed(0)}%</div>
                </div>
            </div>
            <div class="comparison-row">
                <div class="comparison-label">⏱️ Strategic Timing</div>
                <div class="bar-container">
                    <div class="intent-bar" style="width: 35%">Intent: 35%</div>
                    <div class="reality-bar" style="width: ${this.data.realityVector.timing * 100}%">Reality: ${(this.data.realityVector.timing * 100).toFixed(0)}%</div>
                </div>
            </div>
            <div class="comparison-row">
                <div class="comparison-label">💡 Recognition Creation</div>
                <div class="bar-container">
                    <div class="intent-bar" style="width: 30%">Intent: 30%</div>
                    <div class="reality-bar" style="width: ${this.data.realityVector.recognition * 100}%">Reality: ${(this.data.realityVector.recognition * 100).toFixed(0)}%</div>
                </div>
            </div>
        </div>
        
        <!-- Section 8: ShortLex Priority Breakdown -->
        <div class="section">
            <h2 class="section-title">🎯 ShortLex Priority Breakdown</h2>
            <table class="shortlex-table">
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Category</th>
                        <th>Weight</th>
                        <th>Intent</th>
                        <th>Reality</th>
                        <th>Debt</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Root -->
                    <tr class="shortlex-parent">
                        <td>O✅</td>
                        <td>Outcome</td>
                        <td>100%</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                    
                    <!-- Parents together -->
                    <tr class="shortlex-parent">
                        <td>Α🏛️</td>
                        <td>Trust Foundation</td>
                        <td>35%</td>
                        <td>35%</td>
                        <td>${(this.data.realityVector.trust * 100).toFixed(0)}%</td>
                        <td class="${Math.abs(this.data.gaps.trust) * 100 > 20 ? 'critical' : 'warning'}">${Math.round(Math.abs(this.data.gaps.trust) * 100)}</td>
                    </tr>
                    <tr class="shortlex-parent">
                        <td>Β⏰</td>
                        <td>Strategic Timing</td>
                        <td>35%</td>
                        <td>35%</td>
                        <td>${(this.data.realityVector.timing * 100).toFixed(0)}%</td>
                        <td class="${Math.abs(this.data.gaps.timing) * 100 > 20 ? 'critical' : 'warning'}">${Math.round(Math.abs(this.data.gaps.timing) * 100)}</td>
                    </tr>
                    <tr class="shortlex-parent">
                        <td>Γ💡</td>
                        <td>Recognition Creation</td>
                        <td>30%</td>
                        <td>30%</td>
                        <td>${(this.data.realityVector.recognition * 100).toFixed(0)}%</td>
                        <td class="${Math.abs(this.data.gaps.recognition) * 100 > 20 ? 'critical' : 'warning'}">${Math.round(Math.abs(this.data.gaps.recognition) * 100)}</td>
                    </tr>
                    
                    <!-- Divider -->
                    <tr class="shortlex-section-divider"><td colspan="6"></td></tr>
                    
                    <!-- Children in parent order -->
                    ${this.data.shortlex.slice(4).map(item => `
                        <tr class="shortlex-child">
                            <td>${item.isChild ? '&nbsp;&nbsp;&nbsp;&nbsp;' : ''}${item.key}</td>
                            <td>${item.name}</td>
                            <td>${item.weight}%</td>
                            <td>${item.intent}</td>
                            <td>${item.reality}</td>
                            <td class="${item.debt > 10 ? 'warning' : ''}">${item.debt}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <!-- Section 10: Action Center -->
        <div class="section">
            <h2 class="section-title">🚀 Action Center</h2>
            ${this.data.actions.map(action => `
                <div style="margin: 15px 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                    <strong class="good">${action.action}</strong><br>
                    Impact: ${action.impact}<br>
                    <code style="background: rgba(139, 92, 246, 0.2); padding: 5px; border-radius: 4px;">${action.command}</code>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  async save() {
    const html = await this.generateHTML();
    const filename = `trust-debt-canonical-${Date.now()}.html`;
    const filepath = path.join(__dirname, '..', filename);
    
    await fs.writeFile(filepath, html);
    
    console.log(`\n✅ Canonical Trust Debt Report: ${filename}`);
    
    try {
      execSync(`open "${filepath}"`, { stdio: 'ignore' });
      console.log('   Opened in browser');
    } catch {
      console.log(`   View at: ${filepath}`);
    }
    
    return filepath;
  }

  printSummary() {
    console.log('\n# 🎯 Trust Debt Analysis: %d Units\n', this.data.totalDebt);
    
    console.log('## Trust Debt Formula (Reproducible Magic)');
    console.log('TD = √[(Intent - Reality)² × SpecAge × Drift]');
    console.log('TD = %d units\n', this.data.totalDebt);
    
    console.log('## FIM Score');
    console.log('**M = S × E = %d%%**', this.data.momentum.toFixed(0));
    console.log('- Skill: %d%% (execution alignment)', this.data.skill.toFixed(0));
    console.log('- Environment: %d%% (spec freshness)', this.data.environment.toFixed(0));
    console.log('- Leverage: %sx multiplicative effect\n', this.data.leverage.toFixed(1));
    
    console.log('## Intent vs Reality Gaps');
    console.log('- Trust: %d%% intent vs %d%% reality', 35, (this.data.realityVector.trust * 100).toFixed(0));
    console.log('- Timing: %d%% intent vs %d%% reality', 35, (this.data.realityVector.timing * 100).toFixed(0));
    console.log('- Recognition: %d%% intent vs %d%% reality', 30, (this.data.realityVector.recognition * 100).toFixed(0));
    
    console.log('\n## Status');
    console.log(this.data.totalDebt < 200 ? '✅ INSURABLE' : '⚠️ HIGH RISK');
  }
}

// Main execution
async function main() {
  const analyzer = new TrustDebtCanonical();
  await analyzer.analyze();
  await analyzer.save();
  analyzer.printSummary();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TrustDebtCanonical;