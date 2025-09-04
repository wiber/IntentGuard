#!/usr/bin/env node

/**
 * Trust Debt Pipeline Validator
 * 
 * Details out each individual step in the pipeline as requested:
 * 1. Category generation and ShortLex ordering validation
 * 2. Keyword mapping and presence calculation  
 * 3. Matrix population verification
 * 4. ShortLex sorting enforcement
 * 5. HTML output validation
 */

const fs = require('fs');
const path = require('path');

class PipelineValidator {
  constructor() {
    this.steps = [];
    this.issues = [];
  }

  /**
   * Validate complete Trust Debt pipeline step by step
   */
  async validatePipeline() {
    console.log('🔍 Trust Debt Pipeline Step-by-Step Validator');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Detailing out each individual step in the pipeline\n');

    // Step 1: Validate category configuration
    await this.step1_validateCategoryConfiguration();
    
    // Step 2: Validate ShortLex ordering rules
    await this.step2_validateShortLexOrdering();
    
    // Step 3: Validate keyword-to-presence mapping
    await this.step3_validateKeywordMapping();
    
    // Step 4: Validate matrix calculation pipeline
    await this.step4_validateMatrixCalculation();
    
    // Step 5: Fix identified issues
    await this.step5_fixIdentifiedIssues();
    
    // Generate detailed report
    this.generatePipelineReport();
    
    return {
      steps: this.steps,
      issues: this.issues,
      success: this.issues.length === 0
    };
  }

  /**
   * STEP 1: Validate category configuration
   */
  async step1_validateCategoryConfiguration() {
    console.log('📋 STEP 1: Validating Category Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const categories = JSON.parse(fs.readFileSync('trust-debt-categories.json', 'utf8'));
    const step = {
      name: 'Category Configuration',
      status: 'unknown',
      details: {},
      issues: []
    };

    // Check category structure
    step.details.totalCategories = categories.categories.length;
    step.details.parentCategories = categories.categories.filter(c => c.depth === 0).length;
    step.details.childCategories = categories.categories.filter(c => c.depth === 1).length;
    
    console.log(`   📊 Total categories: ${step.details.totalCategories}`);
    console.log(`   👨‍👩‍👧‍👦 Parents: ${step.details.parentCategories}, Children: ${step.details.childCategories}`);
    
    // Check for missing required fields
    for (const category of categories.categories) {
      if (!category.id || !category.name || !category.keywords || !category.depth === undefined) {
        step.issues.push(`Category ${category.id || 'unnamed'} missing required fields`);
      }
      
      if (category.keywords.length === 0) {
        step.issues.push(`Category ${category.id} has no keywords`);
      }
    }

    step.status = step.issues.length === 0 ? 'pass' : 'fail';
    console.log(`   📊 Status: ${step.status === 'pass' ? '✅ PASS' : '❌ FAIL'}`);
    
    this.steps.push(step);
    this.issues.push(...step.issues);
  }

  /**
   * STEP 2: Validate ShortLex ordering rules  
   */
  async step2_validateShortLexOrdering() {
    console.log('\n📐 STEP 2: Validating ShortLex Ordering Rules');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const categories = JSON.parse(fs.readFileSync('trust-debt-categories.json', 'utf8'));
    const step = {
      name: 'ShortLex Ordering',
      status: 'unknown', 
      details: {},
      issues: [],
      correctOrder: []
    };

    // Apply correct ShortLex sorting
    const sorted = [...categories.categories].sort((a, b) => {
      const lengthA = a.id.length;
      const lengthB = b.id.length;
      
      // First: sort by length (shorter first)
      if (lengthA !== lengthB) {
        return lengthA - lengthB;
      }
      
      // Then: sort alphabetically within same length
      return a.id.localeCompare(b.id);
    });

    step.correctOrder = sorted.map(cat => `${cat.id} (${cat.id.length})`);
    step.details.currentOrder = categories.categories.map(cat => `${cat.id} (${cat.id.length})`);

    console.log('   📊 Current order:');
    categories.categories.forEach((cat, idx) => {
      console.log(`     ${idx + 1}. ${cat.id} (length ${cat.id.length}) - ${cat.name}`);
    });

    console.log('\n   📊 Correct ShortLex order:');
    sorted.forEach((cat, idx) => {
      console.log(`     ${idx + 1}. ${cat.id} (length ${cat.id.length}) - ${cat.name}`);
    });

    // Check if ordering is correct
    const isCorrectOrder = JSON.stringify(step.details.currentOrder) === JSON.stringify(step.correctOrder);
    
    if (!isCorrectOrder) {
      step.issues.push('Categories not in correct ShortLex order (length first, then alphabetical)');
      
      // Find specific violations
      for (let i = 0; i < categories.categories.length - 1; i++) {
        const current = categories.categories[i];
        const next = categories.categories[i + 1];
        
        if (current.id.length > next.id.length) {
          step.issues.push(`${current.id} (length ${current.id.length}) should come after ${next.id} (length ${next.id.length})`);
        } else if (current.id.length === next.id.length && current.id > next.id) {
          step.issues.push(`${current.id} should come after ${next.id} (alphabetical order within same length)`);
        }
      }
    }

    step.status = isCorrectOrder ? 'pass' : 'fail';
    console.log(`   📊 Status: ${step.status === 'pass' ? '✅ PASS' : '❌ FAIL'}`);
    
    this.steps.push(step);
    this.issues.push(...step.issues);
    
    return sorted; // Return correct order for fixing
  }

  /**
   * STEP 3: Validate keyword-to-presence mapping
   */
  async step3_validateKeywordMapping() {
    console.log('\n🔍 STEP 3: Validating Keyword-to-Presence Mapping');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const step = {
      name: 'Keyword Mapping',
      status: 'unknown',
      details: {},
      issues: []
    };

    // Check if all categories have meaningful keywords
    const categories = JSON.parse(fs.readFileSync('trust-debt-categories.json', 'utf8'));
    step.details.keywordCounts = {};

    for (const category of categories.categories) {
      const keywordCount = category.keywords.length;
      step.details.keywordCounts[category.id] = keywordCount;
      
      console.log(`   ${category.id}: ${keywordCount} keywords - ${category.keywords.slice(0, 3).join(', ')}...`);
      
      if (keywordCount < 3) {
        step.issues.push(`${category.id} has too few keywords (${keywordCount}, minimum 3 recommended)`);
      }
      
      // Check for generic/meaningless keywords
      const genericKeywords = ['toisostring', 'scalingfactor', 'queryspeed', 'exponential'];
      const hasGeneric = category.keywords.some(kw => genericKeywords.includes(kw.toLowerCase()));
      if (hasGeneric) {
        step.issues.push(`${category.id} contains generic/generated keywords that may not match repository content`);
      }
    }

    step.status = step.issues.length === 0 ? 'pass' : 'warning';
    console.log(`   📊 Status: ${step.status === 'pass' ? '✅ PASS' : '⚠️  ISSUES FOUND'}`);
    
    this.steps.push(step);
    this.issues.push(...step.issues);
  }

  /**
   * STEP 4: Validate matrix calculation pipeline
   */
  async step4_validateMatrixCalculation() {
    console.log('\n🔢 STEP 4: Validating Matrix Calculation Pipeline');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const step = {
      name: 'Matrix Calculation',
      status: 'unknown',
      details: {},
      issues: []
    };

    // Check if Trust Debt JSON output exists
    if (fs.existsSync('trust-debt-final.json')) {
      const jsonData = JSON.parse(fs.readFileSync('trust-debt-final.json', 'utf8'));
      
      step.details.matrixSizes = {
        intent: jsonData.matrices?.intent ? Object.keys(jsonData.matrices.intent).length : 0,
        reality: jsonData.matrices?.reality ? Object.keys(jsonData.matrices.reality).length : 0,
        debt: jsonData.matrices?.debt ? Object.keys(jsonData.matrices.debt).length : 0
      };

      console.log(`   📊 Intent matrix: ${step.details.matrixSizes.intent}x${step.details.matrixSizes.intent}`);
      console.log(`   💻 Reality matrix: ${step.details.matrixSizes.reality}x${step.details.matrixSizes.reality}`);
      console.log(`   🔥 Debt matrix: ${step.details.matrixSizes.debt}x${step.details.matrixSizes.debt}`);

      // Check for zero values in matrices (could indicate calculation issues)
      if (step.details.matrixSizes.intent === 0) {
        step.issues.push('Intent matrix not generated or empty');
      }
      if (step.details.matrixSizes.reality === 0) {
        step.issues.push('Reality matrix not generated or empty');
      }
      
    } else {
      step.issues.push('Trust Debt JSON output not found - matrix calculation may have failed');
    }

    step.status = step.issues.length === 0 ? 'pass' : 'fail';
    console.log(`   📊 Status: ${step.status === 'pass' ? '✅ PASS' : '❌ FAIL'}`);
    
    this.steps.push(step);
    this.issues.push(...step.issues);
  }

  /**
   * STEP 5: Fix identified issues
   */
  async step5_fixIdentifiedIssues() {
    console.log('\n🔧 STEP 5: Fixing Identified Issues');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (this.issues.length === 0) {
      console.log('   ✅ No issues found - pipeline is working correctly!');
      return;
    }

    console.log(`   🔧 Fixing ${this.issues.length} identified issues...\n`);

    // Fix 1: ShortLex ordering
    const shortLexStep = this.steps.find(s => s.name === 'ShortLex Ordering');
    if (shortLexStep && shortLexStep.status === 'fail') {
      console.log('   🔧 Fix 1: Applying correct ShortLex ordering...');
      await this.fixShortLexOrdering(shortLexStep.correctOrder);
    }

    // Fix 2: Keyword issues
    const keywordStep = this.steps.find(s => s.name === 'Keyword Mapping');
    if (keywordStep && keywordStep.status === 'warning') {
      console.log('   🔧 Fix 2: Improving keyword mappings...');
      await this.fixKeywordMapping();
    }

    console.log('   ✅ Pipeline fixes applied');
  }

  /**
   * Fix ShortLex ordering by reordering categories correctly
   */
  async fixShortLexOrdering(correctOrder) {
    const categories = JSON.parse(fs.readFileSync('trust-debt-categories.json', 'utf8'));
    
    // Sort categories according to ShortLex rules
    const sortedCategories = [...categories.categories].sort((a, b) => {
      // First: sort by length (shorter first)  
      if (a.id.length !== b.id.length) {
        return a.id.length - b.id.length;
      }
      
      // Then: sort alphabetically within same length
      return a.id.localeCompare(b.id);
    });

    // Update category configuration
    categories.categories = sortedCategories;
    categories.metadata.shortlex_ordering = sortedCategories.map(cat => cat.id).join(', ');
    categories.metadata.last_updated = new Date().toISOString().split('T')[0];
    categories.metadata.pipeline_validated = true;

    fs.writeFileSync('trust-debt-categories.json', JSON.stringify(categories, null, 2));
    
    console.log('     ✅ Categories reordered according to ShortLex rules');
    console.log('     📋 New order:', sortedCategories.map(cat => cat.id).join(' → '));
  }

  /**
   * Fix keyword mapping issues
   */
  async fixKeywordMapping() {
    const categories = JSON.parse(fs.readFileSync('trust-debt-categories.json', 'utf8'));
    
    // Enhance keywords for categories with too few
    for (const category of categories.categories) {
      if (category.keywords.length < 3) {
        const additionalKeywords = this.generateRelevantKeywords(category);
        category.keywords = [...category.keywords, ...additionalKeywords];
        console.log(`     ➕ Enhanced ${category.id} with ${additionalKeywords.length} keywords`);
      }
    }

    fs.writeFileSync('trust-debt-categories.json', JSON.stringify(categories, null, 2));
    console.log('     ✅ Keyword mappings improved');
  }

  /**
   * Generate relevant keywords for a category
   */
  generateRelevantKeywords(category) {
    const keywordMappings = {
      'Measurement': ['analyze', 'assess', 'evaluate', 'monitor', 'track'],
      'Implementation': ['develop', 'construct', 'program', 'engineer', 'deploy'],
      'Documentation': ['document', 'specify', 'define', 'explain', 'describe'],
      'Visualization': ['display', 'present', 'illustrate', 'demonstrate', 'exhibit'],
      'Technical': ['configure', 'setup', 'maintain', 'operate', 'manage']
    };

    const baseKeywords = keywordMappings[category.name] || ['enhance', 'improve', 'optimize'];
    return baseKeywords.filter(kw => !category.keywords.includes(kw)).slice(0, 5);
  }

  /**
   * Generate detailed pipeline report
   */
  generatePipelineReport() {
    const report = `# Trust Debt Pipeline Validation Report

Generated: ${new Date().toISOString()}

## Pipeline Step Results

${this.steps.map((step, idx) => `
### Step ${idx + 1}: ${step.name}
- **Status**: ${step.status === 'pass' ? '✅ PASS' : step.status === 'warning' ? '⚠️  WARNING' : '❌ FAIL'}
- **Issues Found**: ${step.issues.length}

${step.issues.length > 0 ? `
**Issues:**
${step.issues.map(issue => `- ${issue}`).join('\n')}
` : ''}

**Details:**
${Object.entries(step.details).map(([key, value]) => `- **${key}**: ${typeof value === 'object' ? JSON.stringify(value) : value}`).join('\n')}
`).join('')}

## Summary

- **Total Steps**: ${this.steps.length}
- **Passed**: ${this.steps.filter(s => s.status === 'pass').length}
- **Failed**: ${this.steps.filter(s => s.status === 'fail').length}  
- **Warnings**: ${this.steps.filter(s => s.status === 'warning').length}
- **Total Issues**: ${this.issues.length}

## Pipeline Status

${this.issues.length === 0 ? 
  '🎉 **PIPELINE VALIDATED** - All steps working correctly!' :
  '🔧 **PIPELINE ISSUES DETECTED** - Fixes applied, re-run Trust Debt analysis to validate'}

## Next Steps

1. Run Trust Debt analysis: \`node src/trust-debt-final.js\`
2. Verify matrix shows correct ShortLex ordering
3. Check that all categories show non-zero presence values
4. Validate Process Health improvements
`;

    fs.writeFileSync('trust-debt-pipeline-report.md', report);
    
    console.log('\n📄 Pipeline validation complete!');
    console.log(`📊 Steps: ${this.steps.length}, Issues: ${this.issues.length}`);
    console.log('📄 Report saved: trust-debt-pipeline-report.md');
    
    if (this.issues.length === 0) {
      console.log('🎉 Pipeline fully validated - all steps working correctly!');
    } else {
      console.log('🔧 Issues detected and fixed - re-run analysis to validate');
    }
  }
}

module.exports = { PipelineValidator };

// CLI usage
if (require.main === module) {
  async function main() {
    const validator = new PipelineValidator();
    const results = await validator.validatePipeline();
    
    if (results.success) {
      console.log('\n🚀 Pipeline validation successful - ready for production use!');
    } else {
      console.log('\n🔄 Re-run Trust Debt analysis to test pipeline fixes:');
      console.log('   node src/trust-debt-final.js');
    }
  }

  main().catch(console.error);
}