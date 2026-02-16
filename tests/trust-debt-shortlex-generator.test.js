const ShortLexGenerator = require('../src/trust-debt-shortlex-generator');

describe('ShortLexGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new ShortLexGenerator();
  });

  describe('calculateAlignment', () => {
    it('returns aligned when real is within 80-120% of ideal', () => {
      const result = generator.calculateAlignment(0.5, 0.45);
      expect(result.status).toBe('aligned');
      expect(result.drift).toBeCloseTo(0.05);
      expect(result.alignmentRatio).toBeCloseTo(0.9);
    });

    it('returns warning when real is 50-80% of ideal', () => {
      const result = generator.calculateAlignment(1.0, 0.6);
      expect(result.status).toBe('warning');
      expect(result.alignmentRatio).toBeCloseTo(0.6);
    });

    it('returns critical when real is below 50% of ideal', () => {
      const result = generator.calculateAlignment(1.0, 0.3);
      expect(result.status).toBe('critical');
      expect(result.alignmentRatio).toBeCloseTo(0.3);
    });

    it('returns warning when real overshoots 120-150% of ideal', () => {
      const result = generator.calculateAlignment(0.5, 0.7);
      expect(result.status).toBe('warning');
      expect(result.alignmentRatio).toBeCloseTo(1.4);
    });

    it('returns critical when real overshoots beyond 150% of ideal', () => {
      const result = generator.calculateAlignment(0.5, 0.8);
      expect(result.status).toBe('critical');
      expect(result.alignmentRatio).toBeCloseTo(1.6);
    });

    it('calculates exact alignment when ideal equals real', () => {
      const result = generator.calculateAlignment(0.75, 0.75);
      expect(result.drift).toBe(0);
      expect(result.alignmentRatio).toBe(1);
      expect(result.status).toBe('aligned');
    });
  });

  describe('generateShortRank', () => {
    it('returns a single item for a leaf node', () => {
      const node = {
        id: 'test',
        symbol: 'T',
        emoji: '🔧',
        title: 'Test',
        description: 'A test node',
        type: 'leaf',
        weight: 50,
      };

      const result = generator.generateShortRank(node);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test');
      expect(result[0].depth).toBe(0);
      expect(result[0].effectiveWeight).toBe(50);
    });

    it('flattens parent with children in weight-descending order', () => {
      const node = {
        id: 'root',
        symbol: 'R',
        emoji: '🌳',
        title: 'Root',
        description: 'Root node',
        type: 'parent',
        weight: 100,
        children: [
          { id: 'low', symbol: 'L', emoji: '⬇️', title: 'Low', description: '', type: 'leaf', weight: 20 },
          { id: 'high', symbol: 'H', emoji: '⬆️', title: 'High', description: '', type: 'leaf', weight: 80 },
        ],
      };

      const result = generator.generateShortRank(node);
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('root');
      expect(result[1].id).toBe('high');
      expect(result[2].id).toBe('low');
    });

    it('calculates effective weight as parent weight * child weight / 100', () => {
      const node = {
        id: 'root',
        symbol: 'R',
        emoji: '🌳',
        title: 'Root',
        description: '',
        type: 'parent',
        weight: 60,
        children: [
          { id: 'child', symbol: 'C', emoji: '🔸', title: 'Child', description: '', type: 'leaf', weight: 50 },
        ],
      };

      const result = generator.generateShortRank(node);
      const child = result.find(r => r.id === 'child');
      // parentWeight default is 100, root effective = 100*60/100 = 60
      // child effective = 60*50/100 = 30
      expect(child.effectiveWeight).toBe(30);
    });

    it('preserves block unity - parent is immediately followed by its children', () => {
      const node = {
        id: 'root',
        symbol: 'R',
        emoji: '🌳',
        title: 'Root',
        description: '',
        type: 'parent',
        weight: 100,
        children: [
          {
            id: 'a',
            symbol: 'A',
            emoji: '🅰️',
            title: 'A',
            description: '',
            type: 'parent',
            weight: 40,
            children: [
              { id: 'a1', symbol: '1', emoji: '1️⃣', title: 'A1', description: '', type: 'leaf', weight: 50 },
            ],
          },
          {
            id: 'b',
            symbol: 'B',
            emoji: '🅱️',
            title: 'B',
            description: '',
            type: 'parent',
            weight: 60,
            children: [
              { id: 'b1', symbol: '2', emoji: '2️⃣', title: 'B1', description: '', type: 'leaf', weight: 70 },
            ],
          },
        ],
      };

      const result = generator.generateShortRank(node);
      const ids = result.map(r => r.id);
      // root, then B (higher weight) with its child, then A with its child
      expect(ids).toEqual(['root', 'b', 'b1', 'a', 'a1']);
    });

    it('sets depth correctly for nested nodes', () => {
      const node = {
        id: 'root',
        symbol: 'R',
        emoji: '🌳',
        title: 'Root',
        description: '',
        type: 'parent',
        weight: 100,
        children: [
          {
            id: 'mid',
            symbol: 'M',
            emoji: '🔵',
            title: 'Mid',
            description: '',
            type: 'parent',
            weight: 50,
            children: [
              { id: 'leaf', symbol: 'L', emoji: '🍃', title: 'Leaf', description: '', type: 'leaf', weight: 30 },
            ],
          },
        ],
      };

      const result = generator.generateShortRank(node);
      expect(result.find(r => r.id === 'root').depth).toBe(0);
      expect(result.find(r => r.id === 'mid').depth).toBe(1);
      expect(result.find(r => r.id === 'leaf').depth).toBe(2);
    });
  });
});
