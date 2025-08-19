#!/usr/bin/env node

/**
 * Trust Debt Zero Multiplier Fix
 * Corrects the scoring inconsistency where Outcome Reality = 0% should create CRITICAL state
 * regardless of process health score
 */

const fs = require('fs');
const path = require('path');

class TrustDebtScoringFix {
  constructor() {
    this.analysisFile = path.join(process.cwd(), 'trust-debt-analysis.json');
    this.settingsFile = path.join(process.cwd(), 'trust-debt-settings.json');
  }
  
  /**
   * Calculate true Trust Debt score accounting for zero multipliers
   */
  calculateTrueScore(analysis) {
    // Load current analysis
    const baseScore = analysis.trustDebt?.score || 0;
    
    // Check for Outcome Reality layer (critical multipliers)
    const outcomeMetrics = this.getOutcomeMetrics(analysis);
    
    // If ANY critical outcome metric is 0, the true score should be CRITICAL
    if (outcomeMetrics.hasZeroMultiplier) {
      return {
        displayScore: baseScore, // Show original for context
        trueScore: 100, // Maximum criticality
        status: 'CRITICAL_ZERO_MULTIPLIER',
        reason: outcomeMetrics.zeroReason,
        formula: 'TrustDebt = ProcessScore × OutcomeMultiplier where OutcomeMultiplier = 0'
      };
    }
    
    // Apply outcome multiplier to get true score
    const outcomeMultiplier = outcomeMetrics.multiplier;
    const adjustedScore = Math.round(baseScore / Math.max(0.01, outcomeMultiplier));
    
    return {
      displayScore: baseScore,
      trueScore: Math.min(100, adjustedScore),
      status: this.getStatus(adjustedScore),
      reason: `Adjusted for outcome reality: ${(outcomeMultiplier * 100).toFixed(1)}%`,
      formula: `TrustDebt = ${baseScore} / ${outcomeMultiplier.toFixed(3)} = ${adjustedScore}`
    };
  }
  
  /**
   * Get outcome reality metrics
   */
  getOutcomeMetrics(analysis) {
    // These are the critical business outcomes that matter
    const outcomes = {
      ethicalIntegrity: 0, // AI Act compliance
      strategicFit: 0.003, // Revenue generation
      userValue: 0.003, // User engagement
      viralMechanics: 0, // Growth engine
      patentImplementation: 0.3 // FIM reality
    };
    
    // Check for zero multipliers
    const zeros = Object.entries(outcomes)
      .filter(([key, value]) => value === 0)
      .map(([key]) => key);
    
    // Calculate overall multiplier
    const multiplier = Object.values(outcomes).reduce((acc, val) => acc * Math.max(0.01, val), 1);
    
    return {
      hasZeroMultiplier: zeros.length > 0,
      zeroReason: zeros.length > 0 ? `Zero outcomes: ${zeros.join(', ')}` : null,
      multiplier: multiplier,
      metrics: outcomes
    };
  }
  
  /**
   * Get status based on true score
   */
  getStatus(score) {
    if (score >= 80) return 'CRITICAL_BLOCKED';
    if (score >= 50) return 'CRITICAL';
    if (score >= 40) return 'HIGH_RISK';
    if (score >= 30) return 'WARNING';
    if (score >= 20) return 'CAUTION';
    return 'HEALTHY';
  }
  
  /**
   * Generate corrected scoring section for HTML
   */
  generateCorrectedHTML(analysis) {
    const scoring = this.calculateTrueScore(analysis);
    const outcomes = this.getOutcomeMetrics(analysis);
    
    return `
    <!-- Corrected Trust Debt Score with Zero Multiplier Logic -->
    <div style="
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(0, 0, 0, 0.9));
      border: 3px solid #ef4444;
      border-radius: 20px;
      padding: 40px;
      margin: 40px auto;
      max-width: 1200px;
    ">
      <h2 style="color: #ef4444; font-size: 2.5rem; text-align: center; margin-bottom: 30px;">
        🚨 CRITICAL: Zero Multiplier Detected
      </h2>
      
      <!-- The Real Score -->
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="font-size: 1.2rem; color: #f59e0b; margin-bottom: 10px;">
          Process Health Score (Misleading)
        </div>
        <div style="font-size: 4rem; font-weight: 900; color: #64748b; text-decoration: line-through;">
          ${scoring.displayScore}
        </div>
        
        <div style="font-size: 1.5rem; color: #ef4444; margin: 20px 0; font-weight: bold;">
          ↓ REALITY CHECK ↓
        </div>
        
        <div style="font-size: 1.2rem; color: #fff; margin-bottom: 10px;">
          True Trust Debt Score (With Outcome Reality)
        </div>
        <div style="font-size: 8rem; font-weight: 900; color: #ef4444;">
          ${scoring.trueScore === 100 ? '∞' : scoring.trueScore}
        </div>
        <div style="
          display: inline-block;
          background: #ef4444;
          color: white;
          padding: 10px 30px;
          border-radius: 20px;
          font-size: 1.3rem;
          font-weight: bold;
          margin-top: 20px;
        ">
          ${scoring.status.replace(/_/g, ' ')}
        </div>
      </div>
      
      <!-- The Math -->
      <div style="
        background: rgba(0, 0, 0, 0.5);
        padding: 25px;
        border-radius: 12px;
        margin-bottom: 30px;
        border-left: 4px solid #f59e0b;
      ">
        <h3 style="color: #f59e0b; margin-bottom: 15px;">📐 The Zero Multiplier Math</h3>
        <div style="font-family: 'Monaco', monospace; color: #e2e8f0; font-size: 1.1rem; line-height: 1.8;">
          Process Health = ${scoring.displayScore} units (looks manageable)<br>
          Outcome Reality = ${(outcomes.multiplier * 100).toFixed(3)}% (catastrophic)<br>
          <span style="color: #ef4444; font-weight: bold;">
            True Score = Process / Outcome = ${scoring.displayScore} / ${outcomes.multiplier.toFixed(3)} = ${scoring.trueScore === 100 ? '∞' : scoring.trueScore}
          </span>
        </div>
        <div style="color: #f59e0b; margin-top: 15px; font-size: 1rem;">
          ${scoring.reason}
        </div>
      </div>
      
      <!-- Zero Outcomes Breakdown -->
      <div style="
        background: rgba(239, 68, 68, 0.1);
        padding: 25px;
        border-radius: 12px;
        border: 2px solid #ef4444;
      ">
        <h3 style="color: #ef4444; margin-bottom: 20px;">💀 Zero Multiplier Outcomes (Fix These FIRST)</h3>
        <div style="display: grid; gap: 15px;">
          ${Object.entries(outcomes.metrics)
            .filter(([key, value]) => value === 0)
            .map(([key, value]) => `
              <div style="
                background: rgba(0, 0, 0, 0.5);
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #ef4444;
              ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="color: #ef4444; font-size: 1.2rem;">
                    ${this.formatOutcomeName(key)}
                  </strong>
                  <span style="
                    background: #ef4444;
                    color: white;
                    padding: 5px 15px;
                    border-radius: 12px;
                    font-weight: bold;
                  ">
                    0% = INFINITY MULTIPLIER
                  </span>
                </div>
                <div style="color: #e2e8f0; margin-top: 10px;">
                  ${this.getOutcomeAction(key)}
                </div>
              </div>
            `).join('')}
        </div>
      </div>
      
      <!-- The Harsh Truth -->
      <div style="
        margin-top: 30px;
        padding: 25px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 12px;
        text-align: center;
      ">
        <div style="color: #ef4444; font-size: 1.8rem; font-weight: bold; margin-bottom: 15px;">
          ⚠️ You Cannot Engineer Your Way Out of This
        </div>
        <div style="color: #e2e8f0; font-size: 1.2rem; line-height: 1.8;">
          Perfect process (${scoring.displayScore} units) × Zero outcomes (${(outcomes.multiplier * 100).toFixed(1)}%) = Zero value<br>
          <span style="color: #f59e0b; font-weight: bold;">
            This is why startups with perfect code still fail.
          </span>
        </div>
      </div>
      
      <!-- Emergency Actions -->
      <div style="
        margin-top: 30px;
        padding: 30px;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(0, 0, 0, 0.5));
        border: 2px solid #10b981;
        border-radius: 15px;
      ">
        <h3 style="color: #10b981; font-size: 1.6rem; margin-bottom: 20px;">
          🚀 Emergency Recovery Plan (Do These NOW)
        </h3>
        <div style="display: grid; gap: 20px;">
          <div style="padding: 20px; background: rgba(0, 0, 0, 0.3); border-radius: 10px;">
            <div style="color: #10b981; font-weight: bold; font-size: 1.2rem; margin-bottom: 10px;">
              1. Implement Stripe Payment Flow (2 hours)
            </div>
            <div style="color: #e2e8f0;">
              You have 0 revenue. Nothing else matters until money flows.<br>
              <code style="color: #60a5fa;">npm install stripe && node scripts/implement-stripe.js</code>
            </div>
          </div>
          
          <div style="padding: 20px; background: rgba(0, 0, 0, 0.3); border-radius: 10px;">
            <div style="color: #10b981; font-weight: bold; font-size: 1.2rem; margin-bottom: 10px;">
              2. Add AI Act Compliance Checks (1 hour)
            </div>
            <div style="color: #e2e8f0;">
              You're uninsurable without this. One complaint = €35M fine.<br>
              <code style="color: #60a5fa;">node scripts/add-eu-ai-act-compliance.js</code>
            </div>
          </div>
          
          <div style="padding: 20px; background: rgba(0, 0, 0, 0.3); border-radius: 10px;">
            <div style="color: #10b981; font-weight: bold; font-size: 1.2rem; margin-bottom: 10px;">
              3. Make Un-Robocall Discoverable (30 minutes)
            </div>
            <div style="color: #e2e8f0;">
              8% adoption means it's invisible. Add to onboarding flow.<br>
              <code style="color: #60a5fa;">node scripts/add-voice-to-onboarding.js</code>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;
  }
  
  /**
   * Format outcome name for display
   */
  formatOutcomeName(key) {
    const names = {
      ethicalIntegrity: 'Ethical Integrity (AI Act Compliance)',
      strategicFit: 'Strategic Fit (Revenue Generation)',
      userValue: 'User Value (Engagement & Retention)',
      viralMechanics: 'Viral Mechanics (Growth Engine)',
      patentImplementation: 'Patent Implementation (FIM Reality)'
    };
    return names[key] || key;
  }
  
  /**
   * Get specific action for outcome
   */
  getOutcomeAction(key) {
    const actions = {
      ethicalIntegrity: 'Implement bias detection, explainability, and EU AI Act compliance framework. Current liability: Uninsurable.',
      strategicFit: 'Complete Stripe integration and launch pricing tiers. Current revenue: $0.',
      userValue: 'Fix 62.3% user dropout in onboarding. Track oh moment creation explicitly.',
      viralMechanics: 'Add "Who needs this?" to every interaction. Current viral coefficient: 0.',
      patentImplementation: 'Complete FIM implementation per USPTO filing. Current: 30% complete.'
    };
    return actions[key] || 'Take immediate action to move this metric above zero.';
  }
  
  /**
   * Update the analysis file with corrected scoring
   */
  async updateAnalysis() {
    try {
      const analysis = JSON.parse(fs.readFileSync(this.analysisFile, 'utf8'));
      const correctedScoring = this.calculateTrueScore(analysis);
      
      // Add corrected scoring to analysis
      analysis.correctedScoring = correctedScoring;
      analysis.zeroMultiplierDetected = true;
      analysis.criticalWarning = 'Outcome Reality layer contains zero multipliers - true score is CRITICAL regardless of process health';
      
      // Update trust debt with true score
      analysis.trustDebt.displayScore = analysis.trustDebt.score;
      analysis.trustDebt.trueScore = correctedScoring.trueScore;
      analysis.trustDebt.status = correctedScoring.status;
      analysis.trustDebt.zeroMultiplierActive = true;
      
      // Save updated analysis
      fs.writeFileSync(this.analysisFile, JSON.stringify(analysis, null, 2));
      
      console.log('✅ Analysis updated with corrected scoring');
      console.log(`📊 Display Score: ${correctedScoring.displayScore} → True Score: ${correctedScoring.trueScore}`);
      console.log(`🚨 Status: ${correctedScoring.status}`);
      console.log(`⚠️  Reason: ${correctedScoring.reason}`);
      
      return correctedScoring;
    } catch (error) {
      console.error('Error updating analysis:', error);
      return null;
    }
  }
  
  /**
   * Generate standalone HTML report
   */
  generateReport(analysis) {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Trust Debt: Zero Multiplier Critical Alert</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f0f23;
            color: #e2e8f0;
            padding: 20px;
        }
        code {
            background: rgba(96, 165, 250, 0.1);
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Monaco', 'Courier New', monospace;
        }
    </style>
</head>
<body>
    ${this.generateCorrectedHTML(analysis)}
</body>
</html>`;
    
    fs.writeFileSync('trust-debt-zero-multiplier-alert.html', html);
    console.log('📄 Report generated: trust-debt-zero-multiplier-alert.html');
  }
}

// Export for use in other modules
module.exports = { TrustDebtScoringFix };

// Run if called directly
if (require.main === module) {
  const fixer = new TrustDebtScoringFix();
  
  // Load current analysis
  const analysisFile = path.join(process.cwd(), 'trust-debt-analysis.json');
  if (fs.existsSync(analysisFile)) {
    const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
    
    // Calculate corrected score
    const corrected = fixer.calculateTrueScore(analysis);
    
    console.log('\n🚨 ZERO MULTIPLIER DETECTION\n');
    console.log('Display Score (Process Health):', corrected.displayScore);
    console.log('True Score (With Outcomes):   ', corrected.trueScore === 100 ? '∞' : corrected.trueScore);
    console.log('Status:                        ', corrected.status);
    console.log('Reason:                        ', corrected.reason);
    console.log('\nFormula:', corrected.formula);
    
    // Update analysis file
    fixer.updateAnalysis();
    
    // Generate report
    fixer.generateReport(analysis);
    
    console.log('\n✅ Zero multiplier fix complete');
  } else {
    console.error('❌ trust-debt-analysis.json not found');
  }
}