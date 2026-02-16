/**
 * tests/trust-debt-rule-validator.test.js
 * Unit tests for TrustDebtRuleValidator (src/trust-debt-rule-validator.js)
 */

const { execSync } = require('child_process');

jest.mock('child_process', () => ({
  execSync: jest.fn(() => '/mock/project/root')
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(() => '{}'),
  writeFileSync: jest.fn()
}));

const { TrustDebtRuleValidator } = require('../src/trust-debt-rule-validator');

function buildAnalysisResults(overrides = {}) {
  return {
    totalDebt: 860,
    grade: 'B',
    processHealthGrade: 'C+',
    coverage: 65,
    uniformity: 75,
    orthogonality: 85,
    categoryCount: 5,
    blockDebts: {
      'A': 180,
      'A.1': 90,
      'A.2': 60,
      'A.3': 30,
      'B': 120,
      'B.1': 60,
      'B.2': 60,
      'C': 280,
      'D': 80,
      'E': 200
    },
    childCategoriesWorking: true,
    timelineDataExists: false,
    ...overrides
  };
}

describe('TrustDebtRuleValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new TrustDebtRuleValidator();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('parseAnalysisOutput()', () => {
    it('extracts totalDebt from output', () => {
      const output = 'Total Debt: 860 units\nCategories: 5 total';
      const result = validator.parseAnalysisOutput(output);
      expect(result.totalDebt).toBe(860);
    });

    it('extracts coverage percentage', () => {
      const output = 'Coverage: F (42.5%)';
      const result = validator.parseAnalysisOutput(output);
      expect(result.coverage).toBe(42.5);
    });

    it('extracts uniformity percentage', () => {
      const output = 'Uniformity: F (68.3% balanced)';
      const result = validator.parseAnalysisOutput(output);
      expect(result.uniformity).toBe(68.3);
    });

    it('extracts orthogonality percentage', () => {
      const output = 'Orthogonality: 91.2%';
      const result = validator.parseAnalysisOutput(output);
      expect(result.orthogonality).toBe(91.2);
    });

    it('extracts category count', () => {
      const output = 'Categories: 12 total';
      const result = validator.parseAnalysisOutput(output);
      expect(result.categoryCount).toBe(12);
    });

    it('detects child categories with non-zero debt', () => {
      const output = 'A.1: 90 units\nA.2: 60 units\nA.3: 30 units';
      const result = validator.parseAnalysisOutput(output);
      expect(result.childCategoriesWorking).toBe(true);
      expect(result.blockDebts['A.1']).toBe(90);
    });

    it('does not flag childCategoriesWorking when only parent categories have debt', () => {
      const output = 'Analysis: 180 units\nPatent: 120 units';
      const result = validator.parseAnalysisOutput(output);
      expect(result.childCategoriesWorking).toBe(false);
    });

    it('assigns grade A for debt < 500', () => {
      const output = 'Total Debt: 400 units';
      const result = validator.parseAnalysisOutput(output);
      expect(result.grade).toBe('A');
    });

    it('assigns grade B for debt 500-999', () => {
      const output = 'Total Debt: 860 units';
      const result = validator.parseAnalysisOutput(output);
      expect(result.grade).toBe('B');
    });

    it('assigns grade C for debt 1000-4999', () => {
      const output = 'Total Debt: 3000 units';
      const result = validator.parseAnalysisOutput(output);
      expect(result.grade).toBe('C');
    });

    it('assigns grade D for debt >= 5000', () => {
      const output = 'Total Debt: 7000 units';
      const result = validator.parseAnalysisOutput(output);
      expect(result.grade).toBe('D');
    });

    it('returns defaults when output has no matching patterns', () => {
      const result = validator.parseAnalysisOutput('no relevant data here');
      expect(result.totalDebt).toBe(0);
      expect(result.grade).toBe('A');
      expect(result.coverage).toBe(0);
      expect(result.uniformity).toBe(0);
      expect(result.categoryCount).toBe(0);
      expect(result.childCategoriesWorking).toBe(false);
    });
  });

  describe('validateHierarchyWorking()', () => {
    it('returns true when >= 3 child categories have debt', () => {
      const results = buildAnalysisResults();
      expect(validator.validateHierarchyWorking(results)).toBe(true);
    });

    it('returns false when fewer than 3 child categories have debt', () => {
      const results = buildAnalysisResults({
        blockDebts: { 'A': 180, 'A.1': 90, 'A.2': 60, 'B': 120 }
      });
      expect(validator.validateHierarchyWorking(results)).toBe(false);
    });

    it('returns false when child categories all have zero debt', () => {
      const results = buildAnalysisResults({
        blockDebts: { 'A': 180, 'A.1': 0, 'A.2': 0, 'A.3': 0, 'B': 120 }
      });
      expect(validator.validateHierarchyWorking(results)).toBe(false);
    });

    it('ignores parent categories (no dots in id)', () => {
      const results = buildAnalysisResults({
        blockDebts: { 'A': 500, 'B': 300, 'C': 200, 'D': 100 }
      });
      expect(validator.validateHierarchyWorking(results)).toBe(false);
    });
  });

  describe('validateShortlexBalanced()', () => {
    it('returns true when debt values have low coefficient of variation', () => {
      const results = buildAnalysisResults({
        blockDebts: { 'A': 100, 'B': 110, 'C': 95, 'D': 105, 'E': 90 }
      });
      expect(validator.validateShortlexBalanced(results)).toBe(true);
    });

    it('returns false when fewer than 5 categories have debt', () => {
      const results = buildAnalysisResults({
        blockDebts: { 'A': 100, 'B': 200, 'C': 50 }
      });
      expect(validator.validateShortlexBalanced(results)).toBe(false);
    });

    it('returns false when debt distribution is highly skewed', () => {
      const results = buildAnalysisResults({
        blockDebts: { 'A': 1000, 'B': 10, 'C': 10, 'D': 10, 'E': 10 }
      });
      expect(validator.validateShortlexBalanced(results)).toBe(false);
    });

    it('ignores zero-debt categories', () => {
      const results = buildAnalysisResults({
        blockDebts: { 'A': 100, 'B': 110, 'C': 0, 'D': 105, 'E': 95, 'F': 100 }
      });
      expect(validator.validateShortlexBalanced(results)).toBe(true);
    });
  });

  describe('validateProcessHealthCPlus()', () => {
    it('returns true when coverage >= 60% and uniformity >= 70%', () => {
      const results = buildAnalysisResults({ coverage: 65, uniformity: 75 });
      expect(validator.validateProcessHealthCPlus(results)).toBe(true);
    });

    it('returns false when coverage < 60%', () => {
      const results = buildAnalysisResults({ coverage: 55, uniformity: 75 });
      expect(validator.validateProcessHealthCPlus(results)).toBe(false);
    });

    it('returns false when uniformity < 70%', () => {
      const results = buildAnalysisResults({ coverage: 65, uniformity: 65 });
      expect(validator.validateProcessHealthCPlus(results)).toBe(false);
    });

    it('returns false when both are below threshold', () => {
      const results = buildAnalysisResults({ coverage: 40, uniformity: 50 });
      expect(validator.validateProcessHealthCPlus(results)).toBe(false);
    });

    it('returns true at exact boundary values', () => {
      const results = buildAnalysisResults({ coverage: 60, uniformity: 70 });
      expect(validator.validateProcessHealthCPlus(results)).toBe(true);
    });
  });

  describe('generateSpecificKeywords()', () => {
    it('returns mapped keywords for known category names', () => {
      const keywords = validator.generateSpecificKeywords({ name: 'Math' });
      expect(keywords).toContain('math');
      expect(keywords).toContain('equation');
      expect(keywords.length).toBeGreaterThan(3);
    });

    it('returns fallback keywords for unknown category names', () => {
      const keywords = validator.generateSpecificKeywords({ name: 'UnknownCategory' });
      expect(keywords).toEqual(['specific', 'detailed', 'focused', 'specialized']);
    });

    it('returns keywords for each known category', () => {
      const knownCategories = ['Research', 'Data', 'Filing', 'Math', 'Academic', 'Business', 'Core', 'Tools', 'Matrix', 'Visual'];
      for (const name of knownCategories) {
        const keywords = validator.generateSpecificKeywords({ name });
        expect(keywords.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generateNextSteps()', () => {
    it('returns all-pass message when all rules pass', () => {
      validator.validationRules = {
        hierarchyWorking: true,
        timelinePopulated: true,
        shortlexBalanced: true,
        processHealthCPlus: true
      };
      expect(validator.generateNextSteps()).toContain('All validation rules passed');
    });

    it('includes hierarchy fix when hierarchyWorking fails', () => {
      validator.validationRules = {
        hierarchyWorking: false,
        timelinePopulated: true,
        shortlexBalanced: true,
        processHealthCPlus: true
      };
      expect(validator.generateNextSteps()).toContain('child categories');
    });

    it('includes timeline fix when timelinePopulated fails', () => {
      validator.validationRules = {
        hierarchyWorking: true,
        timelinePopulated: false,
        shortlexBalanced: true,
        processHealthCPlus: true
      };
      expect(validator.generateNextSteps()).toContain('timeline');
    });

    it('includes balance fix when shortlexBalanced fails', () => {
      validator.validationRules = {
        hierarchyWorking: true,
        timelinePopulated: true,
        shortlexBalanced: false,
        processHealthCPlus: true
      };
      expect(validator.generateNextSteps()).toContain('balanced');
    });

    it('includes coverage fix when processHealthCPlus fails', () => {
      validator.validationRules = {
        hierarchyWorking: true,
        timelinePopulated: true,
        shortlexBalanced: true,
        processHealthCPlus: false
      };
      expect(validator.generateNextSteps()).toContain('coverage');
    });

    it('lists multiple fixes when multiple rules fail', () => {
      validator.validationRules = {
        hierarchyWorking: false,
        timelinePopulated: false,
        shortlexBalanced: false,
        processHealthCPlus: false
      };
      const steps = validator.generateNextSteps();
      expect(steps).toContain('child categories');
      expect(steps).toContain('timeline');
      expect(steps).toContain('balanced');
      expect(steps).toContain('coverage');
    });
  });

  describe('generateValidationReport()', () => {
    it('includes grade and debt in report', () => {
      validator.validationRules = {
        hierarchyWorking: true,
        timelinePopulated: true,
        shortlexBalanced: true,
        processHealthCPlus: true
      };
      const report = validator.generateValidationReport({
        grade: 'B', totalDebt: 860, coverage: 65, uniformity: 75, categoryCount: 5
      });
      expect(report).toContain('B');
      expect(report).toContain('860');
      expect(report).toContain('ALL RULES PASSED');
    });

    it('shows PARTIAL SUCCESS when rules fail', () => {
      validator.validationRules = {
        hierarchyWorking: false,
        timelinePopulated: true,
        shortlexBalanced: true,
        processHealthCPlus: true
      };
      const report = validator.generateValidationReport({
        grade: 'C', totalDebt: 2000, coverage: 45, uniformity: 60, categoryCount: 5
      });
      expect(report).toContain('PARTIAL SUCCESS');
      expect(report).toContain('FAIL');
    });
  });
});
