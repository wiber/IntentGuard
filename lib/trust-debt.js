/**
 * Trust Debt Integration Module
 * Connects to the existing Trust Debt pipeline
 */

const {
  execSync
} = require('child_process');
const fs = require('fs');
const path = require('path');
class TrustDebtAnalyzer {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.scriptsDir = path.join(projectRoot, 'scripts');

    // Check if we're in the ThetaCoach project with full pipeline
    this.hasFullPipeline = this.detectFullPipeline();
  }

  /**
   * Detect if the full Trust Debt pipeline is available
   */
  detectFullPipeline() {
    const requiredScripts = ['trust-debt-claude-pipeline.js', 'trust-debt-unified-calculator.js', 'trust-debt-executive-summary-generator.js', 'trust-debt-physics-html-generator.js'];
    return requiredScripts.every(script => fs.existsSync(path.join(this.scriptsDir, script)));
  }

  /**
   * Run the complete Trust Debt analysis
   */
  async runAnalysis(options = {}) {
    console.log('📊 Running Trust Debt Analysis...\n');
    try {
      if (this.hasFullPipeline && this.hasClaudeAvailable()) {
        // Run the full Claude-integrated pipeline
        return await this.runClaudePipeline(options);
      } else {
        // Fallback to basic analysis
        return await this.runBasicAnalysis(options);
      }
    } catch (error) {
      console.error('❌ Trust Debt analysis failed:', error.message);
      return {
        score: 999,
        status: 'ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run the Claude-integrated pipeline
   */
  async runClaudePipeline(options) {
    console.log('🤖 Running Claude AI-enhanced Trust Debt pipeline...\n');

    // Run the main pipeline
    execSync('node scripts/trust-debt-claude-pipeline.js', {
      cwd: this.projectRoot,
      stdio: options.silent ? 'pipe' : 'inherit'
    });

    // Generate executive summary
    if (fs.existsSync(path.join(this.scriptsDir, 'trust-debt-executive-summary-generator.js'))) {
      execSync('node scripts/trust-debt-executive-summary-generator.js', {
        cwd: this.projectRoot,
        stdio: options.silent ? 'pipe' : 'inherit'
      });
    }

    // Generate physics report
    if (fs.existsSync(path.join(this.scriptsDir, 'trust-debt-physics-html-generator.js'))) {
      execSync('node scripts/trust-debt-physics-html-generator.js', {
        cwd: this.projectRoot,
        stdio: options.silent ? 'pipe' : 'inherit'
      });
    }

    // Generate two-layer assessment
    if (fs.existsSync(path.join(this.scriptsDir, 'trust-debt-two-layer-calculator.js'))) {
      execSync('node scripts/trust-debt-two-layer-calculator.js', {
        cwd: this.projectRoot,
        stdio: options.silent ? 'pipe' : 'inherit'
      });
    }

    // Read and return the results
    return this.readAnalysisResults();
  }

  /**
   * Run basic Trust Debt analysis (no Claude)
   */
  async runBasicAnalysis(options) {
    console.log('📊 Running basic Trust Debt analysis...\n');

    // Check for unified calculator
    const unifiedCalcPath = path.join(this.scriptsDir, 'trust-debt-unified-calculator.js');
    if (fs.existsSync(unifiedCalcPath)) {
      const {
        UnifiedTrustDebtCalculator
      } = require(unifiedCalcPath);
      const calculator = new UnifiedTrustDebtCalculator();

      // Load existing data if available
      const analysisFile = path.join(this.projectRoot, 'trust-debt-analysis.json');
      const analysis = fs.existsSync(analysisFile) ? JSON.parse(fs.readFileSync(analysisFile, 'utf8')) : {};

      // Calculate Trust Debt
      const result = calculator.calculate({
        categories: analysis.categories || [],
        commits: analysis.commits || [],
        analysis: analysis
      });

      // Save result
      const output = {
        ...result,
        timestamp: new Date().toISOString(),
        projectRoot: this.projectRoot
      };
      fs.writeFileSync(path.join(this.projectRoot, 'trust-debt-unified.json'), JSON.stringify(output, null, 2));
      return output;
    }

    // Ultimate fallback - return crisis state
    return {
      score: 999,
      status: 'CRISIS',
      message: 'Trust Debt measurement system not configured',
      timestamp: new Date().toISOString(),
      recommendation: 'Run "intentguard init --full" to set up complete Trust Debt pipeline'
    };
  }

  /**
   * Check if Claude is available
   */
  hasClaudeAvailable() {
    try {
      execSync('which claude', {
        stdio: 'pipe'
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read analysis results from files
   */
  readAnalysisResults() {
    const results = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot
    };

    // Read unified results
    const unifiedFile = path.join(this.projectRoot, 'trust-debt-unified.json');
    if (fs.existsSync(unifiedFile)) {
      const unified = JSON.parse(fs.readFileSync(unifiedFile, 'utf8'));
      results.score = unified.score;
      results.status = unified.status;
      results.crisis = unified.crisis;
      results.details = unified.details;
    }

    // Read executive summary
    const summaryFile = path.join(this.projectRoot, 'trust-debt-executive-summary.json');
    if (fs.existsSync(summaryFile)) {
      const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
      results.summary = summary;
    }

    // Read two-layer assessment
    const assessmentFile = path.join(this.projectRoot, 'trust-debt-two-layer-assessment.json');
    if (fs.existsSync(assessmentFile)) {
      const assessment = JSON.parse(fs.readFileSync(assessmentFile, 'utf8'));
      results.twoLayerAssessment = assessment;
    }

    // Add report URLs
    results.reports = {
      physics: fs.existsSync(path.join(this.projectRoot, 'trust-debt-physics-report.html')) ? 'trust-debt-physics-report.html' : null,
      executive: fs.existsSync(path.join(this.projectRoot, 'trust-debt-executive-summary.html')) ? 'trust-debt-executive-summary.html' : null,
      full: fs.existsSync(path.join(this.projectRoot, 'trust-debt-report.html')) ? 'trust-debt-report.html' : null
    };
    return results;
  }

  /**
   * Open Trust Debt reports in browser
   */
  async openReports() {
    const reports = ['trust-debt-physics-report.html', 'trust-debt-executive-summary.html'];
    for (const report of reports) {
      const reportPath = path.join(this.projectRoot, report);
      if (fs.existsSync(reportPath)) {
        try {
          const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
          execSync(`${opener} "${reportPath}"`, {
            stdio: 'pipe'
          });
          console.log(`✅ Opened ${report}`);
        } catch (error) {
          console.log(`📄 Report available at: ${reportPath}`);
        }
      }
    }
  }

  /**
   * Install Trust Debt git hook
   */
  async installHook() {
    const hooksDir = path.join(this.projectRoot, '.git', 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, {
        recursive: true
      });
    }
    const hookPath = path.join(hooksDir, 'post-commit');

    // Check if hook already exists
    if (fs.existsSync(hookPath)) {
      const existing = fs.readFileSync(hookPath, 'utf8');
      if (existing.includes('intentguard')) {
        console.log('✅ Trust Debt hook already installed');
        return {
          success: true,
          path: hookPath
        };
      }

      // Backup existing hook
      fs.writeFileSync(hookPath + '.backup', existing);
      console.log(`📦 Backed up existing hook to ${hookPath}.backup`);
    }

    // Create new hook
    const hookContent = `#!/bin/bash
# Trust Debt Analysis Post-Commit Hook
# Powered by Intent Guard

echo "📊 Calculating Trust Debt after commit..."

# Run Intent Guard Trust Debt analysis
if command -v intentguard &> /dev/null; then
    intentguard trust-debt --silent
    
    # Get the Trust Debt score
    if [ -f "trust-debt-unified.json" ]; then
        TRUST_DEBT=$(cat trust-debt-unified.json | grep '"score"' | head -1 | awk '{print $2}' | sed 's/,//')
        STATUS=$(cat trust-debt-unified.json | grep '"status"' | head -1 | awk '{print $2}' | sed 's/[",]//g')
        
        # Display result based on score
        if [ "$TRUST_DEBT" -gt "500" ]; then
            echo "🚨 CRISIS: Trust Debt at $TRUST_DEBT units!"
            echo "   Run 'intentguard trust-debt --report' for details"
        elif [ "$TRUST_DEBT" -gt "200" ]; then
            echo "⚠️  WARNING: Trust Debt at $TRUST_DEBT units"
            echo "   Run 'intentguard trust-debt --report' for details"
        elif [ "$TRUST_DEBT" -gt "100" ]; then
            echo "📊 Trust Debt: $TRUST_DEBT units (approaching threshold)"
        else
            echo "✅ Trust Debt under control: $TRUST_DEBT units"
        fi
        
        # Open reports if in crisis
        if [ "$TRUST_DEBT" -gt "500" ] && [ "$1" != "--no-open" ]; then
            intentguard trust-debt --open-reports
        fi
    fi
else
    echo "⚠️  Intent Guard not installed. Run: npm install -g intent-guard"
fi

exit 0
`;
    fs.writeFileSync(hookPath, hookContent);
    fs.chmodSync(hookPath, '755');
    console.log('✅ Trust Debt hook installed successfully');
    return {
      success: true,
      path: hookPath
    };
  }
}
module.exports = {
  TrustDebtAnalyzer
};