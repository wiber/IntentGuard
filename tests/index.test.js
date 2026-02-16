/**
 * tests/index.test.js
 * Unit tests for IntentGuard core class (src/index.js)
 */

const path = require('path');

jest.mock('fs');
jest.mock('glob');
jest.mock('simple-git');
jest.mock('cosine-similarity');

const fs = require('fs');
const glob = require('glob');
const simpleGit = require('simple-git');

const { IntentGuard } = require('../src/index');

describe('IntentGuard', () => {
  let guard;

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue('{}');
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
    fs.chmodSync.mockImplementation(() => {});
    glob.sync.mockReturnValue([]);
    simpleGit.mockReturnValue({
      log: jest.fn().mockResolvedValue({ all: [] }),
      diff: jest.fn().mockResolvedValue(''),
    });

    guard = new IntentGuard('/fake/project');
  });

  describe('loadConfig', () => {
    it('returns default config when no config file exists', () => {
      expect(guard.config).toBeDefined();
      expect(guard.config.categories).toHaveLength(6);
      expect(guard.config.thresholds).toEqual({
        good: 50,
        warning: 100,
        critical: 200,
      });
    });

    it('loads config from .intent-guard.json when it exists', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        intentDocs: ['SPEC.md'],
        excludePatterns: ['vendor'],
        categories: [{ name: 'Ops', weight: 50, patterns: ['deploy'] }],
        thresholds: { good: 10, warning: 20, critical: 30 },
      }));

      const g = new IntentGuard('/fake/project');
      expect(g.config.intentDocs).toEqual(['SPEC.md']);
      expect(g.config.categories).toHaveLength(1);
      expect(g.config.categories[0].name).toBe('Ops');
    });
  });

  describe('countKeywords', () => {
    it('counts matching keywords in text', () => {
      const count = guard.countKeywords(
        'We improved test coverage and added a new test suite',
        ['test', 'coverage']
      );
      expect(count).toBe(3);
    });

    it('returns 0 when no keywords match', () => {
      expect(guard.countKeywords('hello world', ['foo', 'bar'])).toBe(0);
    });

    it('is case-insensitive', () => {
      expect(guard.countKeywords('Security SECURITY', ['security'])).toBe(2);
    });

    it('matches whole words only', () => {
      expect(guard.countKeywords('testing', ['test'])).toBe(0);
    });
  });

  describe('determineStatus', () => {
    it('returns GOOD for score <= 50', () => {
      expect(guard.determineStatus(0)).toBe('GOOD');
      expect(guard.determineStatus(50)).toBe('GOOD');
    });

    it('returns WARNING for score 51-100', () => {
      expect(guard.determineStatus(51)).toBe('WARNING');
      expect(guard.determineStatus(100)).toBe('WARNING');
    });

    it('returns CRITICAL for score 101-200', () => {
      expect(guard.determineStatus(101)).toBe('CRITICAL');
      expect(guard.determineStatus(200)).toBe('CRITICAL');
    });

    it('returns CRISIS for score > 200', () => {
      expect(guard.determineStatus(201)).toBe('CRISIS');
      expect(guard.determineStatus(999)).toBe('CRISIS');
    });
  });

  describe('calculateCategoryDrift', () => {
    it('calculates drift between intent and reality', () => {
      const intent = { categories: { Testing: 0.5, Documentation: 0.5 } };
      const reality = { categories: { Testing: 0.3, Documentation: 0.7 } };

      const scores = guard.calculateCategoryDrift(intent, reality);
      const testing = scores.find(s => s.name === 'Testing');

      expect(testing).toBeDefined();
      expect(testing.drift).toBe('20.0%');
    });

    it('handles missing categories gracefully', () => {
      const intent = { categories: {} };
      const reality = { categories: { Testing: 0.5 } };

      const scores = guard.calculateCategoryDrift(intent, reality);
      const testing = scores.find(s => s.name === 'Testing');

      expect(testing.intent).toBe('0.0%');
      expect(testing.reality).toBe('50.0%');
    });
  });

  describe('calculateTotalDebt', () => {
    it('sums weighted contributions', () => {
      // With 0-day config and spec age, multipliers are both 1
      fs.existsSync.mockReturnValue(false);
      glob.sync.mockReturnValue([]);

      const scores = [
        { contribution: 0.1 },
        { contribution: 0.2 },
      ];

      const debt = guard.calculateTotalDebt(scores);
      // (0.1 + 0.2) * 100 * 1 * 1 = 30
      expect(debt).toBe(30);
    });
  });

  describe('getTopContributors', () => {
    it('returns top 5 sorted by contribution', () => {
      const scores = [
        { name: 'A', drift: '10%', contribution: 10 },
        { name: 'B', drift: '50%', contribution: 50 },
        { name: 'C', drift: '30%', contribution: 30 },
        { name: 'D', drift: '20%', contribution: 20 },
        { name: 'E', drift: '40%', contribution: 40 },
        { name: 'F', drift: '5%', contribution: 5 },
      ];

      const top = guard.getTopContributors(scores);
      expect(top).toHaveLength(5);
      expect(top[0].category).toBe('B');
      expect(top[4].category).toBe('A');
    });
  });

  describe('generateRecommendations', () => {
    it('adds urgent recommendation when score exceeds critical threshold', () => {
      const analysis = {
        score: 250,
        topContributors: [],
      };

      const recs = guard.generateRecommendations(analysis);
      expect(recs[0]).toMatch(/URGENT/);
    });

    it('recommends documentation updates for large gaps', () => {
      const analysis = {
        score: 10,
        topContributors: [
          { category: 'Security', gap: '35.0%', contribution: 70 },
        ],
      };

      const recs = guard.generateRecommendations(analysis);
      expect(recs.some(r => r.includes('Security'))).toBe(true);
    });

    it('returns at most 5 recommendations', () => {
      const analysis = {
        score: 999,
        topContributors: Array.from({ length: 10 }, (_, i) => ({
          category: `Cat${i}`,
          gap: '50.0%',
          contribution: 100,
        })),
      };

      const recs = guard.generateRecommendations(analysis);
      expect(recs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('initialize', () => {
    it('creates config file when none exists', async () => {
      fs.existsSync.mockReturnValue(false);

      await guard.initialize();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.intent-guard.json'),
        expect.any(String)
      );
    });

    it('installs git hook when requested', async () => {
      fs.existsSync.mockReturnValue(false);

      await guard.initialize({ installHook: true });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('post-commit'),
        expect.stringContaining('intent-guard')
      );
      expect(fs.chmodSync).toHaveBeenCalledWith(
        expect.stringContaining('post-commit'),
        '755'
      );
    });
  });
});
