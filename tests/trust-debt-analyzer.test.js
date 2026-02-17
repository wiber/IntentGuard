/**
 * tests/trust-debt-analyzer.test.js
 * Unit tests for TrustDebtAnalyzer (src/trust-debt-analyzer.js)
 */

const { TrustDebtAnalyzer, CORE_PRINCIPLES } = require('../src/trust-debt-analyzer');

let analyzer;

beforeEach(() => {
  analyzer = new TrustDebtAnalyzer();
});

describe('CORE_PRINCIPLES', () => {
  it('defines all five expected principles', () => {
    const keys = Object.keys(CORE_PRINCIPLES);
    expect(keys).toEqual(
      expect.arrayContaining([
        'measurementFramework',
        'trustDebt',
        'patternNaming',
        'ohMoments',
        'fimClaim',
      ])
    );
    expect(keys).toHaveLength(5);
  });

  it('each principle has positive and negative indicators', () => {
    for (const principle of Object.values(CORE_PRINCIPLES)) {
      expect(principle.indicators.positive.length).toBeGreaterThan(0);
      expect(principle.indicators.negative.length).toBeGreaterThan(0);
    }
  });
});

describe('calculatePrincipleScore', () => {
  const principle = CORE_PRINCIPLES.measurementFramework;

  it('returns 50 for content with no indicator matches', () => {
    expect(analyzer.calculatePrincipleScore('hello world', principle)).toBe(50);
  });

  it('returns 100 when only positive indicators match', () => {
    const content = 'measurement analysis pattern precise quantifiable';
    expect(analyzer.calculatePrincipleScore(content, principle)).toBe(100);
  });

  it('returns 0 when only negative indicators match', () => {
    const content = 'vague fuzzy generic qualitative unmeasurable';
    expect(analyzer.calculatePrincipleScore(content, principle)).toBe(0);
  });

  it('returns a value between 0 and 100 for mixed content', () => {
    const content = 'measurement analysis vague fuzzy';
    const score = analyzer.calculatePrincipleScore(content, principle);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it('is case insensitive', () => {
    const lower = analyzer.calculatePrincipleScore('MEASUREMENT ANALYSIS', principle);
    const upper = analyzer.calculatePrincipleScore('measurement analysis', principle);
    expect(lower).toBe(upper);
  });
});

describe('getAlignmentLevel', () => {
  it.each([
    [100, 'High Alignment'],
    [80, 'High Alignment'],
    [79, 'Moderate Alignment'],
    [60, 'Moderate Alignment'],
    [59, 'Some Drift'],
    [40, 'Some Drift'],
    [39, 'Significant Drift'],
    [20, 'Significant Drift'],
    [19, 'Critical Drift'],
    [0, 'Critical Drift'],
  ])('score %i → %s', (score, expected) => {
    expect(analyzer.getAlignmentLevel(score)).toBe(expected);
  });
});

describe('detectDrift', () => {
  function makePrinciples(scores) {
    const result = {};
    scores.forEach((score, i) => {
      result[`p${i}`] = { name: `Principle ${i}`, score };
    });
    return result;
  }

  it('returns MINIMAL when all scores >= 60', () => {
    const drift = analyzer.detectDrift(makePrinciples([80, 70, 60, 90]));
    expect(drift.level).toBe('MINIMAL');
    expect(drift.areas).toHaveLength(0);
  });

  it('returns LOW for a single drift area', () => {
    const drift = analyzer.detectDrift(makePrinciples([80, 50, 90]));
    expect(drift.level).toBe('LOW');
    expect(drift.areas).toHaveLength(1);
  });

  it('returns MODERATE for 2-3 drift areas', () => {
    const drift = analyzer.detectDrift(makePrinciples([50, 40, 90]));
    expect(drift.level).toBe('MODERATE');
    expect(drift.areas).toHaveLength(2);
  });

  it('returns CRITICAL for more than 3 drift areas', () => {
    const drift = analyzer.detectDrift(makePrinciples([10, 20, 30, 40]));
    expect(drift.level).toBe('CRITICAL');
    expect(drift.areas).toHaveLength(4);
  });

  it('calculates gap correctly', () => {
    const drift = analyzer.detectDrift(makePrinciples([30]));
    expect(drift.areas[0].gap).toBe(70);
  });
});

describe('identifyPatterns', () => {
  it('detects The Teaching Trap', () => {
    const patterns = analyzer.identifyPatterns('explain things clearly', { areas: [] });
    expect(patterns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'The Teaching Trap' })])
    );
  });

  it('does not flag Teaching Trap when recognition is present', () => {
    const patterns = analyzer.identifyPatterns('explain with recognition', { areas: [] });
    const names = patterns.map(p => p.name);
    expect(names).not.toContain('The Teaching Trap');
  });

  it('detects The Speed Confusion', () => {
    const patterns = analyzer.identifyPatterns('faster 361x gains', { areas: [] });
    expect(patterns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'The Speed Confusion' })])
    );
  });

  it('detects The Mission Drift when drift areas > 2', () => {
    const patterns = analyzer.identifyPatterns('content', {
      areas: [{ principle: 'a' }, { principle: 'b' }, { principle: 'c' }],
    });
    expect(patterns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'The Mission Drift' })])
    );
  });

  it('detects The Silent Drift as fallback for non-MINIMAL drift', () => {
    const patterns = analyzer.identifyPatterns('nothing special', {
      level: 'LOW',
      areas: [{ principle: 'x' }],
    });
    expect(patterns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'The Silent Drift' })])
    );
  });

  it('returns empty for MINIMAL drift with no anti-patterns', () => {
    const patterns = analyzer.identifyPatterns('nothing', { level: 'MINIMAL', areas: [] });
    expect(patterns).toHaveLength(0);
  });
});

describe('analyzeContent', () => {
  it('returns expected shape', async () => {
    const result = await analyzer.analyzeContent('measurement drift pattern', 'test');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('contentType', 'test');
    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('principles');
    expect(result).toHaveProperty('drift');
    expect(result).toHaveProperty('patterns');
    expect(typeof result.overallScore).toBe('number');
  });

  it('scores high for well-aligned content', async () => {
    const aligned =
      'measurement drift pattern named quantified recognition oh moment 361x precision fim geometric alignment';
    const result = await analyzer.analyzeContent(aligned);
    expect(result.overallScore).toBeGreaterThanOrEqual(70);
  });

  it('scores low for misaligned content', async () => {
    const misaligned =
      'vague fuzzy generic qualitative unmeasurable abstract theoretical methodology speed faster quick efficiency';
    const result = await analyzer.analyzeContent(misaligned);
    expect(result.overallScore).toBeLessThan(30);
  });
});

describe('generateSummary', () => {
  it('returns Healthy for score >= 70', () => {
    const summary = analyzer.generateSummary(75, []);
    expect(summary.status).toBe('Healthy');
  });

  it('returns Moderate Drift for score 50-69', () => {
    const summary = analyzer.generateSummary(55, []);
    expect(summary.status).toBe('Moderate Drift');
  });

  it('returns Critical Drift for score < 50', () => {
    const summary = analyzer.generateSummary(30, []);
    expect(summary.status).toBe('Critical Drift');
  });

  it('collects drift areas from multiple analyses', () => {
    const analyses = [
      { drift: { areas: [{ principle: 'A' }] }, patterns: [] },
      { drift: { areas: [{ principle: 'B' }, { principle: 'A' }] }, patterns: [] },
    ];
    const summary = analyzer.generateSummary(50, analyses);
    expect(summary.mainDriftAreas).toEqual(expect.arrayContaining(['A', 'B']));
    expect(summary.mainDriftAreas).toHaveLength(2);
  });
});

describe('getRecommendation', () => {
  it('returns maintenance message for high score', () => {
    expect(analyzer.getRecommendation(85, 0)).toMatch(/maintain/i);
  });

  it('includes drift area count for moderate scores', () => {
    expect(analyzer.getRecommendation(65, 2)).toContain('2');
  });

  it('flags critical for very low scores', () => {
    expect(analyzer.getRecommendation(30, 5)).toMatch(/critical/i);
  });
});
