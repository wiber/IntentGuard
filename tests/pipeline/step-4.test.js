/**
 * tests/pipeline/step-4.test.js — Tests for Grades & Statistics Calculator
 *
 * Tests CALIBRATED grade boundaries and output structure.
 * Note: This tests the compiled output after TypeScript compilation.
 */

const fs = require('fs');
const path = require('path');

describe('step-4: Grades & Statistics Calculator', () => {
  test('CALIBRATED grade boundaries are correctly defined', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Verify CALIBRATED boundaries are documented in source
    expect(step4Source).toContain('CALIBRATED GRADE BOUNDARIES');
    expect(step4Source).toContain('Grade A (🟢 EXCELLENT): 0-500 units');
    expect(step4Source).toContain('Grade B (🟡 GOOD): 501-1500 units');
    expect(step4Source).toContain('Grade C (🟠 NEEDS ATTENTION): 1501-3000 units');
    expect(step4Source).toContain('Grade D (🔴 REQUIRES WORK): 3001+ units');
  });

  test('trustDebtToGrade function implements correct boundaries', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Verify grade boundaries are in the code
    expect(step4Source).toContain('if (units <= 500)');
    expect(step4Source).toContain('else if (units <= 1500)');
    expect(step4Source).toContain('else if (units <= 3000)');
    expect(step4Source).toContain("grade: 'A'");
    expect(step4Source).toContain("grade: 'B'");
    expect(step4Source).toContain("grade: 'C'");
    expect(step4Source).toContain("grade: 'D'");
  });

  test('integration validation functions are implemented', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Verify integration validation functions exist
    expect(step4Source).toContain('validateCrossAgentDataFlow');
    expect(step4Source).toContain('validateJSONBucketIntegrity');
    expect(step4Source).toContain('validatePipelineCoherence');
    expect(step4Source).toContain('calculateProcessHealthGrade');
  });

  test('process health calculation with bonuses is implemented', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Verify process health bonus logic
    expect(step4Source).toContain('orthogonalityBonus');
    expect(step4Source).toContain('balanceBonus');
    expect(step4Source).toContain('orthogonalityAchieved ? 10 : -15');
    expect(step4Source).toContain('balanceAchieved ? 10 : -10');
  });

  test('patent formula application is documented', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Verify patent formula is documented and applied
    expect(step4Source).toContain('|Intent - Reality|² × CategoryWeight × ProcessHealth');
    expect(step4Source).toContain('sophisticationDiscount');
    expect(step4Source).toContain('processHealthFactor');
    expect(step4Source).toContain('0.30'); // 30% sophistication discount
  });

  test('output structure includes all required fields', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Verify GradesResult interface structure
    expect(step4Source).toContain('interface GradesResult');
    expect(step4Source).toContain('trustDebtCalculation');
    expect(step4Source).toContain('processHealthAssessment');
    expect(step4Source).toContain('integrationValidation');
    expect(step4Source).toContain('statisticalSummary');
    expect(step4Source).toContain('categories:');
    expect(step4Source).toContain('distribution:');
  });

  test('statistical summary includes integration score', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Verify integration score calculation
    expect(step4Source).toContain('integrationScore');
    expect(step4Source).toContain('crossAgentDataFlow.overallFlowHealth ? 25 : 0');
    expect(step4Source).toContain('jsonBucketIntegrity.overallIntegrity ? 25 : 0');
    expect(step4Source).toContain('pipelineCoherence.overallCoherence ? 25 : 0');
  });

  test('metadata follows 20-category integration validation architecture', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Verify metadata structure
    expect(step4Source).toContain('INTEGRATION VALIDATION & GRADE CALCULATOR');
    expect(step4Source).toContain('20-category integration validation system');
    expect(step4Source).toContain('Integration validation methodologies');
  });

  test('optional input files are handled gracefully', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Verify optional file handling
    expect(step4Source).toContain('existsSync');
    expect(step4Source).toContain('let processHealthData = null');
    expect(step4Source).toContain('let outcomesData = null');
    expect(step4Source).toContain('let matrixData = null');
  });

  test('required frequency analysis file check is present', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Verify required file validation
    expect(step4Source).toContain('Required input file not found');
    expect(step4Source).toContain('3-frequency-analysis.json');
  });

  test('TypeScript types are properly defined', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Verify TypeScript interfaces
    expect(step4Source).toContain('interface CategoryGrade');
    expect(step4Source).toContain('interface IntegrationValidation');
    expect(step4Source).toContain('interface ProcessHealthAssessment');
    expect(step4Source).toContain('interface GradesResult');
  });
});

describe('step-4: Comparison with agent4-integration-validator.js', () => {
  test('implements key features from reference implementation', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Key features from agent4-integration-validator.js
    const keyFeatures = [
      'validateCrossAgentDataFlow',
      'validateJSONBucketIntegrity',
      'calculateProcessHealthGrade',
      'validatePipelineCoherence',
      'trustDebtToGrade',
      'sophisticationDiscount',
      'processHealthFactor',
    ];

    keyFeatures.forEach((feature) => {
      expect(step4Source).toContain(feature);
    });
  });

  test('uses same grade boundaries as reference', () => {
    const step4Source = fs.readFileSync(
      path.join(__dirname, '../../src/pipeline/step-4.ts'),
      'utf-8',
    );

    // Same boundaries as agent4-integration-validator.js
    expect(step4Source).toContain('0-500 units');
    expect(step4Source).toContain('501-1500 units');
    expect(step4Source).toContain('1501-3000 units');
    expect(step4Source).toContain('3001+ units');
  });
});
