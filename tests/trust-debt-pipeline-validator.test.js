const { PipelineValidator } = require('../src/trust-debt-pipeline-validator');
const fs = require('fs');

jest.mock('fs');

describe('PipelineValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new PipelineValidator();
    jest.clearAllMocks();
    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('constructor', () => {
    it('initializes with empty steps and issues', () => {
      expect(validator.steps).toEqual([]);
      expect(validator.issues).toEqual([]);
    });
  });

  describe('step1_validateCategoryConfiguration', () => {
    it('passes when all categories have required fields', async () => {
      fs.readFileSync.mockReturnValue(JSON.stringify({
        categories: [
          { id: 'A', name: 'Alpha', keywords: ['a', 'b', 'c'], depth: 0 },
          { id: 'B', name: 'Beta', keywords: ['d', 'e', 'f'], depth: 1 },
        ]
      }));

      await validator.step1_validateCategoryConfiguration();

      expect(validator.steps).toHaveLength(1);
      expect(validator.steps[0].status).toBe('pass');
      expect(validator.steps[0].details.totalCategories).toBe(2);
      expect(validator.steps[0].details.parentCategories).toBe(1);
      expect(validator.steps[0].details.childCategories).toBe(1);
    });

    it('fails when a category has empty keywords', async () => {
      fs.readFileSync.mockReturnValue(JSON.stringify({
        categories: [
          { id: 'A', name: 'Alpha', keywords: [], depth: 0 },
        ]
      }));

      await validator.step1_validateCategoryConfiguration();

      expect(validator.steps[0].status).toBe('fail');
      expect(validator.issues).toContain('Category A has no keywords');
    });
  });

  describe('step2_validateShortLexOrdering', () => {
    it('passes when categories are in correct ShortLex order', async () => {
      fs.readFileSync.mockReturnValue(JSON.stringify({
        categories: [
          { id: 'A', name: 'Alpha', keywords: ['a'] },
          { id: 'B', name: 'Beta', keywords: ['b'] },
          { id: 'AB', name: 'AlphaBeta', keywords: ['ab'] },
          { id: 'CD', name: 'CeeDee', keywords: ['cd'] },
        ]
      }));

      await validator.step2_validateShortLexOrdering();

      expect(validator.steps[0].status).toBe('pass');
    });

    it('fails when categories violate length ordering', async () => {
      fs.readFileSync.mockReturnValue(JSON.stringify({
        categories: [
          { id: 'AB', name: 'AlphaBeta', keywords: ['ab'] },
          { id: 'A', name: 'Alpha', keywords: ['a'] },
        ]
      }));

      await validator.step2_validateShortLexOrdering();

      expect(validator.steps[0].status).toBe('fail');
      expect(validator.issues.length).toBeGreaterThan(0);
    });

    it('fails when categories violate alphabetical ordering within same length', async () => {
      fs.readFileSync.mockReturnValue(JSON.stringify({
        categories: [
          { id: 'B', name: 'Beta', keywords: ['b'] },
          { id: 'A', name: 'Alpha', keywords: ['a'] },
        ]
      }));

      await validator.step2_validateShortLexOrdering();

      expect(validator.steps[0].status).toBe('fail');
    });

    it('returns sorted categories', async () => {
      fs.readFileSync.mockReturnValue(JSON.stringify({
        categories: [
          { id: 'CD', name: 'CeeDee', keywords: ['cd'] },
          { id: 'A', name: 'Alpha', keywords: ['a'] },
          { id: 'AB', name: 'AlphaBeta', keywords: ['ab'] },
        ]
      }));

      const sorted = await validator.step2_validateShortLexOrdering();

      expect(sorted.map(c => c.id)).toEqual(['A', 'AB', 'CD']);
    });
  });

  describe('step3_validateKeywordMapping', () => {
    it('passes when all categories have at least 3 keywords', async () => {
      fs.readFileSync.mockReturnValue(JSON.stringify({
        categories: [
          { id: 'A', name: 'Alpha', keywords: ['foo', 'bar', 'baz'] },
        ]
      }));

      await validator.step3_validateKeywordMapping();

      expect(validator.steps[0].status).toBe('pass');
    });

    it('warns when a category has fewer than 3 keywords', async () => {
      fs.readFileSync.mockReturnValue(JSON.stringify({
        categories: [
          { id: 'A', name: 'Alpha', keywords: ['foo'] },
        ]
      }));

      await validator.step3_validateKeywordMapping();

      expect(validator.steps[0].status).toBe('warning');
      expect(validator.issues).toContain('A has too few keywords (1, minimum 3 recommended)');
    });

    it('warns when categories contain generic keywords', async () => {
      fs.readFileSync.mockReturnValue(JSON.stringify({
        categories: [
          { id: 'A', name: 'Alpha', keywords: ['toISOString', 'valid', 'test'] },
        ]
      }));

      await validator.step3_validateKeywordMapping();

      expect(validator.steps[0].status).toBe('warning');
      expect(validator.issues.some(i => i.includes('generic/generated keywords'))).toBe(true);
    });
  });

  describe('step4_validateMatrixCalculation', () => {
    it('passes when trust-debt-final.json has valid matrices', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        matrices: {
          intent: { A: 1, B: 2 },
          reality: { A: 1, B: 2 },
          debt: { A: 0, B: 0 },
        }
      }));

      await validator.step4_validateMatrixCalculation();

      expect(validator.steps[0].status).toBe('pass');
      expect(validator.steps[0].details.matrixSizes.intent).toBe(2);
    });

    it('fails when trust-debt-final.json does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      await validator.step4_validateMatrixCalculation();

      expect(validator.steps[0].status).toBe('fail');
      expect(validator.issues).toContain('Trust Debt JSON output not found - matrix calculation may have failed');
    });

    it('fails when intent matrix is empty', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        matrices: {
          intent: {},
          reality: { A: 1 },
          debt: { A: 0 },
        }
      }));

      await validator.step4_validateMatrixCalculation();

      expect(validator.steps[0].status).toBe('fail');
      expect(validator.issues).toContain('Intent matrix not generated or empty');
    });
  });

  describe('generateRelevantKeywords', () => {
    it('returns mapped keywords for known category names', () => {
      const result = validator.generateRelevantKeywords({ name: 'Measurement', keywords: [] });
      expect(result).toEqual(expect.arrayContaining(['analyze', 'assess']));
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('returns default keywords for unknown category names', () => {
      const result = validator.generateRelevantKeywords({ name: 'Unknown', keywords: [] });
      expect(result).toEqual(expect.arrayContaining(['enhance', 'improve', 'optimize']));
    });

    it('excludes keywords already present in the category', () => {
      const result = validator.generateRelevantKeywords({ name: 'Measurement', keywords: ['analyze'] });
      expect(result).not.toContain('analyze');
    });
  });

  describe('step5_fixIdentifiedIssues', () => {
    it('does nothing when there are no issues', async () => {
      await validator.step5_fixIdentifiedIssues();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('validatePipeline', () => {
    it('returns success true when all steps pass', async () => {
      const validCategories = JSON.stringify({
        categories: [
          { id: 'A', name: 'Alpha', keywords: ['foo', 'bar', 'baz'], depth: 0 },
          { id: 'B', name: 'Beta', keywords: ['qux', 'quux', 'corge'], depth: 0 },
        ],
        metadata: {}
      });

      fs.readFileSync.mockReturnValue(validCategories);
      fs.existsSync.mockReturnValue(true);

      // Override step4 to also return valid matrix data
      const originalStep4 = validator.step4_validateMatrixCalculation.bind(validator);
      validator.step4_validateMatrixCalculation = async () => {
        fs.readFileSync.mockReturnValueOnce(JSON.stringify({
          matrices: {
            intent: { A: 1, B: 2 },
            reality: { A: 1, B: 2 },
            debt: { A: 0, B: 0 },
          }
        }));
        fs.existsSync.mockReturnValue(true);
        return originalStep4();
      };

      // Mock writeFileSync for report generation
      fs.writeFileSync.mockImplementation(() => {});

      const result = await validator.validatePipeline();

      expect(result).toHaveProperty('steps');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('success');
    });
  });
});
