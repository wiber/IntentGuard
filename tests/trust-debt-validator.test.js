/**
 * tests/trust-debt-validator.test.js
 * Unit tests for TrustDebtValidator (src/trust-debt-validator.js)
 */

const MOCK_RULES = {
  INTENT_VECTOR: {
    trust: 35,
    timing: 35,
    recognition: 30
  }
};

jest.mock('../trust-debt-rules.json', () => MOCK_RULES, { virtual: true });

const TrustDebtValidator = require('../src/trust-debt-validator');

function buildValidAnalysis(overrides = {}) {
  return {
    intent: { trust: 35, timing: 35, recognition: 30 },
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
    ],
    ...overrides
  };
}

describe('TrustDebtValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new TrustDebtValidator();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('validate()', () => {
    it('returns true for a fully valid analysis', () => {
      const result = validator.validate(buildValidAnalysis());
      expect(result).toBe(true);
      expect(validator.errors).toHaveLength(0);
      expect(validator.warnings).toHaveLength(0);
    });
  });

  describe('validateIntentVector()', () => {
    it('errors when trust value is wrong', () => {
      const analysis = buildValidAnalysis({ intent: { trust: 50, timing: 35, recognition: 30 } });
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('TRUST must be 35')])
      );
    });

    it('errors when timing value is wrong', () => {
      const analysis = buildValidAnalysis({ intent: { trust: 35, timing: 10, recognition: 30 } });
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('TIMING must be 35')])
      );
    });

    it('errors when recognition value is wrong', () => {
      const analysis = buildValidAnalysis({ intent: { trust: 35, timing: 35, recognition: 50 } });
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('RECOGNITION must be 30')])
      );
    });

    it('accepts intentVector as an alias for intent', () => {
      const analysis = buildValidAnalysis();
      delete analysis.intent;
      analysis.intentVector = { trust: 35, timing: 35, recognition: 30 };
      const result = validator.validate(analysis);
      expect(validator.errors.filter(e => e.includes('Intent vector'))).toHaveLength(0);
    });
  });

  describe('validateFormulas()', () => {
    it('errors when totalDebt is missing', () => {
      const analysis = buildValidAnalysis();
      delete analysis.totalDebt;
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Missing totalDebt')])
      );
    });

    it('accepts totalDebt of 0', () => {
      const analysis = buildValidAnalysis({ totalDebt: 0 });
      validator.validate(analysis);
      expect(validator.errors).not.toEqual(
        expect.arrayContaining([expect.stringContaining('Missing totalDebt')])
      );
    });

    it('errors when momentum is missing', () => {
      const analysis = buildValidAnalysis();
      delete analysis.momentum;
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Missing momentum')])
      );
    });

    it('errors when fim is missing', () => {
      const analysis = buildValidAnalysis();
      delete analysis.fim;
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Missing FIM')])
      );
    });

    it('errors when fim.skill is out of range', () => {
      const analysis = buildValidAnalysis({ fim: { skill: 150, environment: 50 } });
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('FIM skill must be 0-100')])
      );
    });

    it('errors when fim.environment is out of range', () => {
      const analysis = buildValidAnalysis({ fim: { skill: 50, environment: -5 } });
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('FIM environment must be 0-100')])
      );
    });
  });

  describe('validateStructure()', () => {
    it('errors when required sections are missing', () => {
      const analysis = buildValidAnalysis();
      delete analysis.commits;
      delete analysis.documents;
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Missing required section: commits'),
          expect.stringContaining('Missing required section: documents')
        ])
      );
    });

    it('errors when commit is missing required fields', () => {
      const analysis = buildValidAnalysis({
        commits: [{ hash: 'abc' }]
      });
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Commits missing required field: subject'),
          expect.stringContaining('Commits missing required field: totalDrift'),
          expect.stringContaining('Commits missing required field: details')
        ])
      );
    });

    it('warns when commit details are missing a principle', () => {
      const analysis = buildValidAnalysis({
        commits: [{
          hash: 'abc', subject: 'test', totalDrift: 0,
          details: { trust: {}, timing: {} }
        }]
      });
      validator.validate(analysis);
      expect(validator.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('all three principles')])
      );
    });

    it('errors when insights are missing required types', () => {
      const analysis = buildValidAnalysis({
        insights: [{ type: 'trend', message: 'ok' }]
      });
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Missing gaps insight'),
          expect.stringContaining('Missing status insight')
        ])
      );
    });
  });

  describe('validateShortLex()', () => {
    it('errors when shortlex is missing', () => {
      const analysis = buildValidAnalysis();
      delete analysis.shortlex;
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Missing or invalid ShortLex')])
      );
    });

    it('errors when parent count is not 3', () => {
      const analysis = buildValidAnalysis({
        shortlex: [
          { key: 'Α🏛️', isParent: true },
          { key: 'Β⏰', isParent: true },
          ...Array(9).fill(null).map((_, i) => ({ key: `child${i}`, isChild: true }))
        ]
      });
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('exactly 3 parents')])
      );
    });

    it('errors when child count is not 9', () => {
      const analysis = buildValidAnalysis({
        shortlex: [
          { key: 'Α🏛️', isParent: true },
          { key: 'Β⏰', isParent: true },
          { key: 'Γ💡', isParent: true },
          { key: 'child1', isChild: true }
        ]
      });
      validator.validate(analysis);
      expect(validator.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('exactly 9 children')])
      );
    });

    it('warns on unexpected parent keys', () => {
      const analysis = buildValidAnalysis({
        shortlex: [
          { key: 'X🔥', isParent: true },
          { key: 'Β⏰', isParent: true },
          { key: 'Γ💡', isParent: true },
          ...Array(9).fill(null).map((_, i) => ({ key: `c${i}`, isChild: true }))
        ]
      });
      validator.validate(analysis);
      expect(validator.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('Unexpected ShortLex parent key')])
      );
    });
  });

  describe('report()', () => {
    it('returns true when there are only warnings', () => {
      validator.warnings.push('some warning');
      const result = validator.report();
      expect(result).toBe(true);
    });

    it('returns false when there are errors', () => {
      validator.errors.push('some error');
      const result = validator.report();
      expect(result).toBe(false);
    });
  });
});
