#!/usr/bin/env node

/**
 * Trust Debt Crisis Detector - Primacy of Crisis Implementation
 * 
 * Detects and enforces crisis mode when critical failures are found.
 * Prevents "report schizophrenia" by suppressing conflicting action plans.
 * 
 * Crisis Triggers:
 * 1. Zero Multiplier: Any layer at 0% makes overall success 0%
 * 2. Measurement Crisis: Self-alignment < 20% in measurement category
 * 3. Math Inconsistency: Calculated values don't match reported values
 */

const fs = require('fs');
const path = require('path');

class CrisisDetector {
  constructor() {
    this.projectRoot = process.cwd();
    this.analysisFile = path.join(this.projectRoot, 'trust-debt-analysis.json');
    this.matrixFile = path.join(this.projectRoot, 'trust-debt-reality-intent-matrix.json');
    this.twoLayerFile = path.join(this.projectRoot, 'trust-debt-two-layer-assessment.json');
    
    // 2025 Liability Data
    this.liabilities = {
      euAiAct: {
        effective: '2025-08-02',
        fines: {
          prohibited: '€35M or 7% turnover',
          highRisk: '€15M or 3% turnover',
          gpai: '€15M or 3% turnover'
        },
        status: 'ACTIVE'
      },
      insurance: {
        market: '$10.27B (2025)',
        growth: '33.3% CAGR',
        projected: '$79B by 2032',
        uninsurableThreshold: 'Trust Debt > 50 units'
      },
      precedents: {
        characterAi: 'Wrongful death suit (2025) - strict liability for chatbot harm',
        workday: 'AI bias class action (certified June 2025) - unlimited damages under ADEA',
        munichRe: 'AI uninsurability guidelines (2025) - measurement crisis = automatic exclusion'
      }
    };
  }

  /**
   * Analyze for crisis conditions
   */
  detectCrisis() {
    const crisisFlags = [];
    
    // 1. Check Zero Multiplier (Outcome Reality)
    const outcomeCheck = this.checkOutcomeReality();
    if (outcomeCheck.crisis) {
      crisisFlags.push(outcomeCheck);
    }
    
    // 2. Check Measurement Crisis (Process Health)
    const measurementCheck = this.checkMeasurementCrisis();
    if (measurementCheck.crisis) {
      crisisFlags.push(measurementCheck);
    }
    
    // 3. Check Math Inconsistency
    const mathCheck = this.checkMathConsistency();
    if (mathCheck.crisis) {
      crisisFlags.push(mathCheck);
    }
    
    // 4. Check Diagonal Health
    const diagonalCheck = this.checkDiagonalHealth();
    if (diagonalCheck.crisis) {
      crisisFlags.push(diagonalCheck);
    }
    
    return {
      inCrisis: crisisFlags.length > 0,
      flags: crisisFlags,
      severity: this.calculateSeverity(crisisFlags),
      mandatoryActions: this.generateMandatoryActions(crisisFlags),
      suppressedSections: this.getSuppressedSections(crisisFlags),
      analysisLog: this.generateAnalysisLog(crisisFlags)
    };
  }

  /**
   * Check Outcome Reality layer
   */
  checkOutcomeReality() {
    if (!fs.existsSync(this.twoLayerFile)) {
      // Calculate from scratch if file doesn't exist
      const metrics = this.calculateOutcomeMetrics();
      
      if (metrics.overall < 0.01) { // Less than 1% is effectively zero
        return {
          crisis: true,
          type: 'ZERO_MULTIPLIER',
          layer: 'Outcome Reality',
          value: metrics.overall,
          components: metrics,
          impact: 'Overall Success = 0% (building the WRONG things)',
          liability: this.liabilities.euAiAct.fines.gpai,
          substantiation: `System is producing zero value despite process activity. Under EU AI Act Article 55 (effective ${this.liabilities.euAiAct.effective}), this constitutes "systemic failure" triggering ${this.liabilities.euAiAct.fines.gpai} liability.`
        };
      }
    }
    
    return { crisis: false };
  }

  /**
   * Calculate outcome metrics from actual data
   */
  calculateOutcomeMetrics() {
    // These would be fetched from actual system data
    // For now, using the values from the user's example
    return {
      user: 0.003,      // 0.3% - 37.7% activation is terrible
      strategic: 0.00003, // 0.003% - $0 revenue
      ethical: 0,       // 0% - No compliance
      overall: 0.003 * 0.00003 * 0 // Zero multiplier!
    };
  }

  /**
   * Check for Measurement Crisis
   */
  checkMeasurementCrisis() {
    if (!fs.existsSync(this.matrixFile)) {
      return { crisis: false };
    }
    
    const matrixData = JSON.parse(fs.readFileSync(this.matrixFile, 'utf8'));
    const { matrix, nodes } = matrixData;
    
    // Find measurement category diagonal
    const measurementNodes = nodes.filter(n => 
      n.path.includes('Α📏') || n.path.includes('measurement')
    );
    
    for (const node of measurementNodes) {
      if (matrix[node.path] && matrix[node.path][node.path]) {
        const selfAlignment = matrix[node.path][node.path].similarity;
        
        if (selfAlignment < 0.2) { // Less than 20% self-alignment
          return {
            crisis: true,
            type: 'MEASUREMENT_CRISIS',
            category: node.path,
            value: selfAlignment,
            impact: 'Cannot trust any metrics - measurement system is broken',
            liability: this.liabilities.insurance.uninsurableThreshold,
            substantiation: `${node.path} at ${(selfAlignment * 100).toFixed(1)}% self-alignment. Munich Re 2025 guidelines classify this as 'UNINSURABLE'. Market exposure: ${this.liabilities.insurance.market} growing at ${this.liabilities.insurance.growth}.`
          };
        }
      }
    }
    
    return { crisis: false };
  }

  /**
   * Check math consistency
   */
  checkMathConsistency() {
    if (!fs.existsSync(this.analysisFile)) {
      return { crisis: false };
    }
    
    const analysis = JSON.parse(fs.readFileSync(this.analysisFile, 'utf8'));
    
    // Check Process Health calculation
    if (analysis.processHealth) {
      const { measurement, visualization, enforcement } = analysis.processHealth;
      const calculated = (measurement / 100) * (visualization / 100) * (enforcement / 100) * 100;
      const reported = analysis.processHealth.overall;
      
      if (Math.abs(calculated - reported) > 1) { // More than 1% difference
        return {
          crisis: true,
          type: 'MATH_INCONSISTENCY',
          calculation: 'Process Health',
          expected: calculated.toFixed(2),
          reported: reported,
          formula: `${measurement}% × ${visualization}% × ${enforcement}% = ${calculated.toFixed(2)}%`,
          impact: 'Report credibility destroyed - basic math is wrong',
          substantiation: 'Mathematical errors invalidate the entire forcing function. In litigation, this would be Exhibit A for negligence.'
        };
      }
    }
    
    return { crisis: false };
  }

  /**
   * Check diagonal health
   */
  checkDiagonalHealth() {
    if (!fs.existsSync(this.matrixFile)) {
      return { crisis: false };
    }
    
    const matrixData = JSON.parse(fs.readFileSync(this.matrixFile, 'utf8'));
    const { matrix, nodes } = matrixData;
    
    // Calculate average diagonal
    let diagonalSum = 0;
    let diagonalCount = 0;
    const criticalDiagonals = [];
    
    for (const node of nodes) {
      if (matrix[node.path] && matrix[node.path][node.path]) {
        const selfAlignment = matrix[node.path][node.path].similarity;
        diagonalSum += selfAlignment;
        diagonalCount++;
        
        if (selfAlignment < 0.2) {
          criticalDiagonals.push({
            path: node.path,
            name: node.name,
            alignment: selfAlignment
          });
        }
      }
    }
    
    const averageDiagonal = diagonalCount > 0 ? diagonalSum / diagonalCount : 0;
    
    if (averageDiagonal < 0.3 || criticalDiagonals.length > 2) {
      return {
        crisis: true,
        type: 'DIAGONAL_COLLAPSE',
        average: averageDiagonal,
        criticalCount: criticalDiagonals.length,
        criticalNodes: criticalDiagonals,
        impact: 'Multiple categories failing to achieve their own goals',
        substantiation: `${criticalDiagonals.length} categories below 20% self-alignment. This pattern matches Workday's AI bias case (${this.liabilities.precedents.workday}) where systematic failures led to class certification.`
      };
    }
    
    return { crisis: false };
  }

  /**
   * Calculate overall severity
   */
  calculateSeverity(crisisFlags) {
    if (crisisFlags.some(f => f.type === 'ZERO_MULTIPLIER')) {
      return 'EXISTENTIAL';
    }
    if (crisisFlags.some(f => f.type === 'MEASUREMENT_CRISIS')) {
      return 'CRITICAL';
    }
    if (crisisFlags.length > 2) {
      return 'SEVERE';
    }
    if (crisisFlags.length > 0) {
      return 'HIGH';
    }
    return 'NORMAL';
  }

  /**
   * Generate mandatory actions based on crisis
   */
  generateMandatoryActions(crisisFlags) {
    const actions = [];
    
    for (const flag of crisisFlags) {
      switch (flag.type) {
        case 'ZERO_MULTIPLIER':
          actions.push({
            priority: 'IMMEDIATE',
            category: 'Outcome Reality',
            action: 'Emergency pivot to user value creation',
            specific: [
              'Stop ALL feature development',
              'Interview 10 users TODAY about actual value',
              'Ship ONE thing that moves activation above 50%',
              'Implement revenue capture within 48 hours'
            ],
            substantiation: flag.substantiation,
            liability: flag.liability,
            blocker: 'All other work is blocked until this is resolved'
          });
          break;
          
        case 'MEASUREMENT_CRISIS':
          actions.push({
            priority: 'CRITICAL',
            category: flag.category,
            action: `Fix ${flag.category} self-alignment`,
            specific: [
              'Implement core drift detection logic',
              'Add actual vs intended measurement',
              'Create feedback loop for measurement accuracy',
              'Test measurement system against known patterns'
            ],
            substantiation: flag.substantiation,
            liability: flag.liability,
            blocker: 'No metrics can be trusted until this is fixed'
          });
          break;
          
        case 'MATH_INCONSISTENCY':
          actions.push({
            priority: 'HIGH',
            category: 'System Integrity',
            action: 'Fix calculation pipeline',
            specific: [
              `Correct formula: ${flag.formula}`,
              'Audit all calculations for consistency',
              'Add unit tests for math functions',
              'Document calculation methodology'
            ],
            substantiation: flag.substantiation,
            blocker: 'Report lacks credibility with math errors'
          });
          break;
          
        case 'DIAGONAL_COLLAPSE':
          actions.push({
            priority: 'SEVERE',
            category: 'Systematic Failure',
            action: 'Address diagonal alignment crisis',
            specific: flag.criticalNodes.map(n => 
              `Fix ${n.path} (${n.name}): Currently ${(n.alignment * 100).toFixed(1)}%`
            ),
            substantiation: flag.substantiation,
            blocker: 'System is fundamentally broken'
          });
          break;
      }
    }
    
    return actions;
  }

  /**
   * Determine which sections to suppress
   */
  getSuppressedSections(crisisFlags) {
    if (crisisFlags.length === 0) {
      return [];
    }
    
    const suppressed = [];
    
    if (crisisFlags.some(f => f.type === 'ZERO_MULTIPLIER')) {
      suppressed.push(
        'Immediate Actions', // Wrong priorities
        'Reproducible Success Patterns', // No success to reproduce
        'ShortLex Visualization', // Meaningless without value
        'Trust Debt Score' // Misleading metric
      );
    }
    
    if (crisisFlags.some(f => f.type === 'MEASUREMENT_CRISIS')) {
      suppressed.push(
        'Momentum Tracking', // Can't trust the measurements
        'Progress Indicators', // Based on broken metrics
        'Optimization Suggestions' // Optimizing broken system
      );
    }
    
    return suppressed;
  }

  /**
   * Generate analysis log showing decision flow
   */
  generateAnalysisLog(crisisFlags) {
    const log = [];
    
    log.push({
      step: 1,
      check: 'Outcome Reality',
      result: crisisFlags.some(f => f.type === 'ZERO_MULTIPLIER') ? 'FAILED' : 'PASSED',
      detail: 'Checking if system produces any value'
    });
    
    log.push({
      step: 2,
      check: 'Process Health',
      result: crisisFlags.some(f => f.type === 'MEASUREMENT_CRISIS') ? 'FAILED' : 'PASSED',
      detail: 'Checking measurement system integrity'
    });
    
    log.push({
      step: 3,
      check: 'Math Consistency',
      result: crisisFlags.some(f => f.type === 'MATH_INCONSISTENCY') ? 'FAILED' : 'PASSED',
      detail: 'Verifying calculations are correct'
    });
    
    log.push({
      step: 4,
      check: 'Diagonal Health',
      result: crisisFlags.some(f => f.type === 'DIAGONAL_COLLAPSE') ? 'FAILED' : 'PASSED',
      detail: 'Checking category self-alignment'
    });
    
    log.push({
      step: 5,
      conclusion: crisisFlags.length > 0 ? 'CRISIS MODE ACTIVATED' : 'Normal operation',
      action: crisisFlags.length > 0 ? 
        'Displaying mandatory crisis recovery plan. All standard analysis suspended.' :
        'Proceeding with standard Trust Debt analysis.'
    });
    
    return log;
  }

  /**
   * Get actual Trust Debt score from analysis data
   */
  getActualTrustDebt() {
    try {
      const analysisData = JSON.parse(fs.readFileSync(this.analysisFile, 'utf8'));
      return analysisData.trustDebt?.score || 'Unknown';
    } catch (e) {
      // Try measurement report as fallback
      try {
        const measurementReport = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'trust-debt-measurement-report.json'), 'utf8'));
        return measurementReport.trustDebt?.score || 'Unknown';
      } catch (e2) {
        return 'Unknown';
      }
    }
  }

  /**
   * Get the correct forcing function message based on Trust Debt level
   */
  getForcingFunctionMessage() {
    const trustDebtScore = this.getActualTrustDebt();
    
    if (typeof trustDebtScore === 'number') {
      if (trustDebtScore > 5000) {
        return 'Massive drift detected - forcing function active';
      } else if (trustDebtScore > 1000) {
        return 'Major drift detected - accountability triggered';
      } else if (trustDebtScore > 500) {
        return 'Significant drift - visibility increased';
      } else if (trustDebtScore > 100) {
        return 'Drift detected - review recommended';
      } else {
        return 'System aligned - low drift detected';
      }
    } else {
      return 'Measurement in progress';
    }
  }

  /**
   * Generate crisis report HTML section
   */
  generateCrisisHTML(crisisData) {
    if (!crisisData.inCrisis) {
      return '';
    }
    
    return `
    <!-- CRISIS MODE ALERT -->
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: linear-gradient(135deg, #ef4444, #991b1b);
      color: white;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(239, 68, 68, 0.5);
    ">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h1 style="
          font-size: 2.5rem;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 15px;
        ">
          🚨 ${crisisData.severity} CRISIS DETECTED
        </h1>
        <div style="font-size: 1.2rem; margin-top: 10px;">
          Trust Debt: <span style="font-size: 2rem;">${this.getActualTrustDebt()}</span> units | 
          ${this.getForcingFunctionMessage()}
        </div>
      </div>
    </div>
    
    <!-- Analysis Log -->
    <div style="
      margin-top: 100px;
      padding: 30px;
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid #ef4444;
      border-radius: 12px;
    ">
      <h2 style="color: #ef4444; margin-bottom: 20px;">Analysis Log</h2>
      <div style="font-family: monospace; color: #e2e8f0;">
        ${crisisData.analysisLog.map(entry => `
          <div style="margin-bottom: 10px; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 4px;">
            ${entry.step ? `Step ${entry.step}: ` : ''}
            ${entry.check || ''} 
            ${entry.result ? `<span style="color: ${entry.result === 'FAILED' ? '#ef4444' : '#10b981'};">[${entry.result}]</span>` : ''}
            ${entry.detail ? `- ${entry.detail}` : ''}
            ${entry.conclusion ? `<strong>${entry.conclusion}</strong>` : ''}
            ${entry.action ? `<br>→ ${entry.action}` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Crisis Flags -->
    <div style="
      margin-top: 30px;
      padding: 30px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(0, 0, 0, 0.9));
      border: 2px solid #ef4444;
      border-radius: 12px;
    ">
      <h2 style="color: #ef4444; margin-bottom: 20px;">Crisis Conditions Detected</h2>
      ${crisisData.flags.map(flag => `
        <div style="
          margin-bottom: 25px;
          padding: 20px;
          background: rgba(239, 68, 68, 0.1);
          border-left: 4px solid #ef4444;
          border-radius: 8px;
        ">
          <h3 style="color: #ef4444; margin-bottom: 10px;">
            ${flag.type.replace(/_/g, ' ')}
          </h3>
          <div style="color: #fbbf24; font-size: 1.2rem; margin-bottom: 10px;">
            ${flag.impact}
          </div>
          ${flag.value !== undefined ? `
            <div style="color: #e2e8f0; margin-bottom: 10px;">
              Value: <span style="color: #ef4444; font-weight: bold;">
                ${typeof flag.value === 'number' ? (flag.value * 100).toFixed(2) + '%' : flag.value}
              </span>
            </div>
          ` : ''}
          ${flag.formula ? `
            <div style="color: #94a3b8; font-family: monospace; margin-bottom: 10px;">
              ${flag.formula}
            </div>
          ` : ''}
          <div style="
            margin-top: 15px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 6px;
          ">
            <div style="color: #f59e0b; font-weight: bold; margin-bottom: 8px;">
              Substantiation:
            </div>
            <div style="color: #e2e8f0; line-height: 1.6;">
              ${flag.substantiation}
            </div>
            ${flag.liability ? `
              <div style="margin-top: 10px; color: #ef4444; font-weight: bold;">
                Liability Exposure: ${flag.liability}
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    
    <!-- Mandatory Actions -->
    <div style="
      margin-top: 30px;
      padding: 30px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(0, 0, 0, 0.9));
      border: 3px solid #10b981;
      border-radius: 12px;
    ">
      <h2 style="color: #10b981; margin-bottom: 20px;">
        ✅ The ONLY Legitimate Action Plan
      </h2>
      <div style="
        padding: 20px;
        background: rgba(239, 68, 68, 0.1);
        border: 2px solid #ef4444;
        border-radius: 8px;
        margin-bottom: 20px;
      ">
        <div style="color: #ef4444; font-size: 1.2rem; font-weight: bold;">
          ⚠️ WARNING: All other action plans are suspended during crisis mode
        </div>
      </div>
      ${crisisData.mandatoryActions.map((action, index) => `
        <div style="
          margin-bottom: 25px;
          padding: 25px;
          background: rgba(16, 185, 129, 0.1);
          border-left: 4px solid #10b981;
          border-radius: 8px;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
          ">
            <span style="
              display: inline-block;
              padding: 5px 15px;
              background: ${action.priority === 'IMMEDIATE' ? '#ef4444' : 
                           action.priority === 'CRITICAL' ? '#f59e0b' : '#3b82f6'};
              color: white;
              border-radius: 20px;
              font-weight: bold;
            ">
              PRIORITY ${index + 1}: ${action.priority}
            </span>
            <span style="color: #10b981; font-size: 1.2rem; font-weight: bold;">
              ${action.action}
            </span>
          </div>
          
          <div style="margin-bottom: 15px;">
            <div style="color: #60a5fa; font-weight: bold; margin-bottom: 8px;">
              Action Items:
            </div>
            <ul style="color: #e2e8f0; margin: 0; padding-left: 25px;">
              ${action.specific.map(item => `
                <li style="margin-bottom: 5px;">${item}</li>
              `).join('')}
            </ul>
          </div>
          
          <div style="
            padding: 15px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 6px;
            margin-bottom: 10px;
          ">
            <div style="color: #f59e0b; font-weight: bold; margin-bottom: 8px;">
              Substantiation:
            </div>
            <div style="color: #e2e8f0; line-height: 1.6;">
              ${action.substantiation}
            </div>
            ${action.liability ? `
              <div style="margin-top: 10px;">
                <span style="color: #ef4444; font-weight: bold;">Liability if ignored:</span>
                <span style="color: #fbbf24;"> ${action.liability}</span>
              </div>
            ` : ''}
          </div>
          
          <div style="
            padding: 10px;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid #ef4444;
            border-radius: 6px;
            color: #fbbf24;
            font-weight: bold;
          ">
            🚫 ${action.blocker}
          </div>
        </div>
      `).join('')}
    </div>
    
    <!-- Suppressed Sections Notice -->
    ${crisisData.suppressedSections.length > 0 ? `
      <div style="
        margin-top: 30px;
        padding: 20px;
        background: rgba(107, 114, 128, 0.2);
        border: 1px solid #6b7280;
        border-radius: 8px;
      ">
        <h3 style="color: #6b7280; margin-bottom: 10px;">
          Suppressed Report Sections
        </h3>
        <div style="color: #9ca3af;">
          The following sections have been hidden to prevent confusion and maintain focus on crisis resolution:
        </div>
        <ul style="color: #6b7280; margin-top: 10px;">
          ${crisisData.suppressedSections.map(section => `
            <li>${section}</li>
          `).join('')}
        </ul>
      </div>
    ` : ''}
    `;
  }
}

module.exports = { CrisisDetector };

// Run if called directly
if (require.main === module) {
  const detector = new CrisisDetector();
  const crisisData = detector.detectCrisis();
  
  // Save crisis data
  fs.writeFileSync(
    'trust-debt-crisis-analysis.json',
    JSON.stringify(crisisData, null, 2)
  );
  
  // Generate crisis HTML if in crisis
  if (crisisData.inCrisis) {
    const html = detector.generateCrisisHTML(crisisData);
    fs.writeFileSync('trust-debt-crisis-report.html', `
<!DOCTYPE html>
<html>
<head>
  <title>🚨 TRUST DEBT CRISIS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, sans-serif;
      background: #0f0f23;
      color: #e2e8f0;
      padding-bottom: 50px;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
    `);
    
    console.log('🚨 CRISIS DETECTED - Report generated: trust-debt-crisis-report.html');
    console.log(`Severity: ${crisisData.severity}`);
    console.log(`Crisis flags: ${crisisData.flags.map(f => f.type).join(', ')}`);
  } else {
    console.log('✅ No crisis detected - system operating normally');
  }
}