const ShortLexExtractor = require('../src/trust-debt-shortlex-extractor');

// Stub out git and fs calls in constructor
jest.mock('child_process', () => ({
  execSync: jest.fn((cmd) => {
    if (cmd === 'git rev-parse --show-toplevel') return '/tmp/fake-repo\n';
    return '';
  })
}));

function makeExtractor(overrides = {}) {
  const settings = {
    shortlex: { maxCategories: 7 },
    claude: { enabled: false },
    cache: { ttl: 300 },
    ...overrides,
  };
  return new ShortLexExtractor(settings);
}

describe('ShortLexExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = makeExtractor();
  });

  describe('parseCommitLog', () => {
    it('parses a single commit with files', () => {
      const log = 'abc1234|fix auth bug|body text\nsrc/auth.js\nsrc/login.js';
      const result = extractor.parseCommitLog(log);
      expect(result).toHaveLength(1);
      expect(result[0].hash).toBe('abc1234');
      expect(result[0].subject).toBe('fix auth bug');
      expect(result[0].body).toBe('body text');
      expect(result[0].files).toEqual(['src/auth.js', 'src/login.js']);
    });

    it('parses multiple commits', () => {
      const log = 'aaa|first commit|\nfile1.js\n\nbbb|second commit|with body\nfile2.js\nfile3.js';
      const result = extractor.parseCommitLog(log);
      expect(result).toHaveLength(2);
      expect(result[0].hash).toBe('aaa');
      expect(result[1].hash).toBe('bbb');
      expect(result[1].files).toEqual(['file2.js', 'file3.js']);
    });

    it('handles empty log', () => {
      const result = extractor.parseCommitLog('');
      expect(result).toEqual([]);
    });

    it('handles commit with no body', () => {
      const log = 'abc|subject only|';
      const result = extractor.parseCommitLog(log);
      expect(result).toHaveLength(1);
      expect(result[0].body).toBe('');
    });
  });

  describe('extractFromText', () => {
    it('extracts Security from auth keywords', () => {
      const cats = extractor.extractFromText('fix authentication bug in login');
      expect(cats).toContain('Security');
    });

    it('extracts Performance from optimization keywords', () => {
      const cats = extractor.extractFromText('improve performance with caching optimization');
      expect(cats).toContain('Performance');
    });

    it('extracts multiple categories', () => {
      const cats = extractor.extractFromText('fix security bug and update documentation');
      expect(cats).toContain('Security');
      expect(cats).toContain('Documentation');
      expect(cats).toContain('BugFixes');
    });

    it('returns empty array for unrecognized text', () => {
      const cats = extractor.extractFromText('lorem ipsum dolor sit amet');
      expect(cats).toEqual([]);
    });

    it('extracts Testing from test keywords', () => {
      const cats = extractor.extractFromText('add unit testing coverage');
      expect(cats).toContain('Testing');
    });

    it('extracts Deployment from CI keywords', () => {
      const cats = extractor.extractFromText('update CI pipeline for deployment');
      expect(cats).toContain('Deployment');
    });
  });

  describe('extractFromFilePaths', () => {
    it('detects Testing from test directories', () => {
      const cats = extractor.extractFromFilePaths(['src/tests/auth.test.js']);
      expect(cats).toContain('Testing');
    });

    it('detects Documentation from .md files', () => {
      const cats = extractor.extractFromFilePaths(['README.md']);
      expect(cats).toContain('Documentation');
    });

    it('detects Configuration from yml files', () => {
      const cats = extractor.extractFromFilePaths(['config/settings.yml']);
      expect(cats).toContain('Configuration');
    });

    it('detects ApiDevelopment from api directory', () => {
      const cats = extractor.extractFromFilePaths(['src/api/routes.js']);
      expect(cats).toContain('ApiDevelopment');
    });

    it('detects multiple categories from mixed files', () => {
      const cats = extractor.extractFromFilePaths([
        'src/components/Button.jsx',
        'tests/unit.test.js',
        'docs/guide.md',
      ]);
      expect(cats).toContain('UserInterface');
      expect(cats).toContain('Testing');
      expect(cats).toContain('Documentation');
    });

    it('returns empty for root-level non-categorized files', () => {
      const cats = extractor.extractFromFilePaths(['index.js']);
      expect(cats).toEqual([]);
    });
  });

  describe('similarity', () => {
    it('returns 1.0 for identical strings', () => {
      expect(extractor.similarity('Security', 'Security')).toBe(1.0);
    });

    it('returns 1.0 for case-insensitive match', () => {
      expect(extractor.similarity('security', 'SECURITY')).toBe(1.0);
    });

    it('returns 0.8 for substring match', () => {
      expect(extractor.similarity('UserExperience', 'User')).toBe(0.8);
    });

    it('returns 0 for completely different strings', () => {
      expect(extractor.similarity('Alpha', 'Zeta')).toBe(0);
    });

    it('returns partial score for common words', () => {
      const score = extractor.similarity('Data Management', 'Data Analysis');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });
  });

  describe('normalizeCategory', () => {
    it('capitalizes words and joins them', () => {
      expect(extractor.normalizeCategory('bug fixes')).toBe('BugFixes');
    });

    it('strips special characters', () => {
      expect(extractor.normalizeCategory('user-experience!')).toBe('Userexperience');
    });

    it('handles single word', () => {
      expect(extractor.normalizeCategory('security')).toBe('Security');
    });

    it('handles empty string', () => {
      expect(extractor.normalizeCategory('')).toBe('');
    });
  });

  describe('isValidCategory', () => {
    it('rejects blacklisted words', () => {
      expect(extractor.isValidCategory('Overview')).toBe(false);
      expect(extractor.isValidCategory('Introduction')).toBe(false);
    });

    it('rejects very short strings', () => {
      expect(extractor.isValidCategory('ab')).toBe(false);
    });

    it('rejects very long strings', () => {
      expect(extractor.isValidCategory('A'.repeat(35))).toBe(false);
    });

    it('accepts valid category names', () => {
      expect(extractor.isValidCategory('Security')).toBe(true);
      expect(extractor.isValidCategory('Bug Fixes')).toBe(true);
    });
  });

  describe('mergeCategories', () => {
    it('merges categories from two maps', () => {
      const commits = new Map([
        ['Security', { name: 'Security', count: 3, sources: ['commit:abc'] }],
      ]);
      const docs = new Map([
        ['Testing', { name: 'Testing', count: 2, sources: ['doc:readme'] }],
      ]);
      const result = extractor.mergeCategories(commits, docs);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Security'); // higher count first
    });

    it('deduplicates overlapping categories', () => {
      const commits = new Map([
        ['Security', { name: 'Security', count: 5, sources: [] }],
      ]);
      const docs = new Map([
        ['Security', { name: 'Security', count: 2, sources: [] }],
      ]);
      const result = extractor.mergeCategories(commits, docs);
      // Map spread takes the latter value, so docs overwrite commits
      expect(result).toHaveLength(1);
    });

    it('returns empty for empty inputs', () => {
      const result = extractor.mergeCategories(new Map(), new Map());
      expect(result).toEqual([]);
    });
  });

  describe('shortlexSort', () => {
    it('sorts by weight descending', () => {
      const cats = [
        { name: 'Low', weight: 1 },
        { name: 'High', weight: 10 },
        { name: 'Mid', weight: 5 },
      ];
      const result = extractor.shortlexSort(cats);
      expect(result[0].name).toBe('High');
      expect(result[1].name).toBe('Mid');
      expect(result[2].name).toBe('Low');
    });

    it('sorts lexicographically when weights are equal', () => {
      const cats = [
        { name: 'Zeta', weight: 1 },
        { name: 'Alpha', weight: 1 },
      ];
      const result = extractor.shortlexSort(cats);
      expect(result[0].name).toBe('Alpha');
      expect(result[1].name).toBe('Zeta');
    });

    it('assigns symbols', () => {
      const cats = [{ name: 'Only', weight: 1 }];
      const result = extractor.shortlexSort(cats);
      expect(result[0].symbol).toBe('O');
      expect(result[0].index).toBe(0);
    });

    it('normalizes weights to sum to 1', () => {
      const cats = [
        { name: 'A', weight: 50 },
        { name: 'B', weight: 50 },
      ];
      const result = extractor.shortlexSort(cats);
      const totalWeight = result.reduce((s, c) => s + c.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0);
    });
  });

  describe('heuristicOrthogonality', () => {
    it('picks the highest-count member from each group', () => {
      const categories = [
        { name: 'Features', count: 10, weight: 0.3 },
        { name: 'ApiDevelopment', count: 5, weight: 0.1 },
        { name: 'Testing', count: 8, weight: 0.2 },
        { name: 'Documentation', count: 3, weight: 0.1 },
        { name: 'Deployment', count: 4, weight: 0.1 },
      ];
      const result = extractor.heuristicOrthogonality(categories);
      const names = result.map(r => r.name);
      expect(names).toContain('Features');    // Development group winner
      expect(names).toContain('Testing');     // Quality group winner
      expect(names).toContain('Documentation'); // Knowledge group winner
      expect(names).toContain('Deployment');  // Operations group winner
    });

    it('limits output to maxCategories', () => {
      const categories = Array.from({ length: 20 }, (_, i) => ({
        name: `Cat${i}`,
        count: 20 - i,
        weight: 0.05,
      }));
      const result = extractor.heuristicOrthogonality(categories);
      expect(result.length).toBeLessThanOrEqual(7);
    });
  });
});
