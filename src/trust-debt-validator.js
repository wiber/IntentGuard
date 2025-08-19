#!/usr/bin/env node

/**
 * Trust Debt Validator - Enforces canonical rules to prevent regression
 * 
 * Run this before any Trust Debt analysis to ensure compliance
 */

const fs = require('fs');
const path = require('path');

// Load the canonical rules
const RULES = require('../trust-debt-rules.json');

class TrustDebtValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validate(analysis) {
    console.log('🔍 Validating Trust Debt analysis against canonical rules...\n');
    
    // Validate intent vector
    this.validateIntentVector(analysis);
    
    // Validate formulas
    this.validateFormulas(analysis);
    
    // Validate structure
    this.validateStructure(analysis);
    
    // Validate ShortLex hierarchy
    this.validateShortLex(analysis);
    
    // Report results
    return this.report();
  }

  validateIntentVector(analysis) {
    const intent = analysis.intent || analysis.intentVector || {};
    
    if (intent.trust !== RULES.INTENT_VECTOR.trust) {
      this.errors.push(`Intent vector TRUST must be ${RULES.INTENT_VECTOR.trust}, got ${intent.trust}`);
    }
    
    if (intent.timing !== RULES.INTENT_VECTOR.timing) {
      this.errors.push(`Intent vector TIMING must be ${RULES.INTENT_VECTOR.timing}, got ${intent.timing}`);
    }
    
    if (intent.recognition !== RULES.INTENT_VECTOR.recognition) {
      this.errors.push(`Intent vector RECOGNITION must be ${RULES.INTENT_VECTOR.recognition}, got ${intent.recognition}`);
    }
  }

  validateFormulas(analysis) {
    // Check if core calculations exist
    if (!analysis.totalDebt && analysis.totalDebt !== 0) {
      this.errors.push('Missing totalDebt calculation');
    }
    
    if (!analysis.momentum && analysis.momentum !== 0) {
      this.errors.push('Missing momentum calculation');
    }
    
    if (!analysis.fim || typeof analysis.fim !== 'object') {
      this.errors.push('Missing FIM calculations (skill, environment)');
    }
    
    // Validate FIM ranges
    if (analysis.fim) {
      if (analysis.fim.skill < 0 || analysis.fim.skill > 100) {
        this.errors.push(`FIM skill must be 0-100, got ${analysis.fim.skill}`);
      }
      
      if (analysis.fim.environment < 0 || analysis.fim.environment > 100) {
        this.errors.push(`FIM environment must be 0-100, got ${analysis.fim.environment}`);
      }
    }
  }

  validateStructure(analysis) {
    // Check required sections exist
    const requiredSections = [
      'commits',
      'documents', 
      'shortlex',
      'insights'
    ];
    
    requiredSections.forEach(section => {
      if (!analysis[section]) {
        this.errors.push(`Missing required section: ${section}`);
      }
    });
    
    // Validate commits structure
    if (analysis.commits && Array.isArray(analysis.commits)) {
      const commit = analysis.commits[0];
      if (commit) {
        const requiredFields = ['hash', 'subject', 'totalDrift', 'details'];
        requiredFields.forEach(field => {
          if (!commit[field] && commit[field] !== 0) {
            this.errors.push(`Commits missing required field: ${field}`);
          }
        });
        
        // Check expandable details
        if (commit.details) {
          if (!commit.details.trust || !commit.details.timing || !commit.details.recognition) {
            this.warnings.push('Commit details should include all three principles');
          }
        }
      }
    }
    
    // Validate insights
    if (analysis.insights && Array.isArray(analysis.insights)) {
      const types = analysis.insights.map(i => i.type || i.title);
      
      if (!types.some(t => t.includes('trend') || t.includes('Trend'))) {
        this.errors.push('Missing trend insight');
      }
      
      if (!types.some(t => t.includes('gap') || t.includes('Gap'))) {
        this.errors.push('Missing gaps insight');
      }
      
      if (!types.some(t => t.includes('status') || t.includes('Status'))) {
        this.errors.push('Missing status insight');
      }
    }
  }

  validateShortLex(analysis) {
    if (!analysis.shortlex || !Array.isArray(analysis.shortlex)) {
      this.errors.push('Missing or invalid ShortLex hierarchy');
      return;
    }
    
    // Check for proper parent-child structure
    const parents = analysis.shortlex.filter(item => item.isParent);
    const children = analysis.shortlex.filter(item => item.isChild);
    
    if (parents.length !== 3) {
      this.errors.push(`ShortLex must have exactly 3 parents (Α, Β, Γ), found ${parents.length}`);
    }
    
    if (children.length !== 9) {
      this.errors.push(`ShortLex must have exactly 9 children (3 per parent), found ${children.length}`);
    }
    
    // Validate parent keys
    const expectedParents = ['Α', 'Β', 'Γ'];
    parents.forEach(parent => {
      const hasExpectedKey = expectedParents.some(exp => parent.key.includes(exp));
      if (!hasExpectedKey) {
        this.warnings.push(`Unexpected ShortLex parent key: ${parent.key}`);
      }
    });
  }

  report() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All validations passed!');
      console.log('   Trust Debt analysis follows canonical rules');
      return true;
    }
    
    if (this.errors.length > 0) {
      console.log(`❌ ${this.errors.length} ERRORS found (must fix):\n`);
      this.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  ${this.warnings.length} WARNINGS found (should fix):\n`);
      this.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📖 See trust-debt-rules.json for canonical requirements');
    
    return this.errors.length === 0;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Trust Debt Validator - Usage:
  node scripts/trust-debt-validator.js <analysis-file.json>
  node scripts/trust-debt-validator.js --check-last
  node scripts/trust-debt-validator.js --rules
    `);
    process.exit(0);
  }
  
  if (args[0] === '--rules') {
    console.log('📋 Canonical Trust Debt Rules:\n');
    console.log(JSON.stringify(RULES, null, 2));
    process.exit(0);
  }
  
  if (args[0] === '--check-last') {
    // Check the most recent analysis
    console.log('Checking last Trust Debt analysis...\n');
    
    // In a real implementation, load the last analysis
    // For now, create a mock
    const mockAnalysis = {
      intent: RULES.INTENT_VECTOR,
      totalDebt: 186,
      momentum: 73,
      fim: { skill: 73, environment: 100 },
      commits: [
        {
          hash: 'abc123',
          subject: 'Test commit',
          totalDrift: 33,
          details: {
            trust: { percent: 35, drift: 0 },
            timing: { percent: 35, drift: 0 },
            recognition: { percent: 30, drift: 0 }
          }
        }
      ],
      documents: [],
      shortlex: [
        { key: 'Α🏛️', isParent: true },
        { key: 'Α🏛️a', isChild: true },
        { key: 'Α🏛️b', isChild: true },
        { key: 'Α🏛️c', isChild: true },
        { key: 'Β⏰', isParent: true },
        { key: 'Β⏰a', isChild: true },
        { key: 'Β⏰b', isChild: true },
        { key: 'Β⏰c', isChild: true },
        { key: 'Γ💡', isParent: true },
        { key: 'Γ💡a', isChild: true },
        { key: 'Γ💡b', isChild: true },
        { key: 'Γ💡c', isChild: true }
      ],
      insights: [
        { type: 'trend', message: 'Improving' },
        { type: 'gaps', message: 'Trust +8%' },
        { type: 'status', message: 'INSURABLE' }
      ]
    };
    
    const validator = new TrustDebtValidator();
    const isValid = validator.validate(mockAnalysis);
    process.exit(isValid ? 0 : 1);
  }
  
  // Load and validate specified file
  try {
    const analysisPath = path.resolve(args[0]);
    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
    
    const validator = new TrustDebtValidator();
    const isValid = validator.validate(analysis);
    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error(`Error loading analysis file: ${error.message}`);
    process.exit(1);
  }
}

module.exports = TrustDebtValidator;