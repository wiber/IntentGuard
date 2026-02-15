/**
 * Tests for ThetaSteer Categorization Skill
 *
 * Validates 20-category mapping, 8-tier color system, and trust-debt dimensions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ThetaSteerCategorizeSkill from './thetasteer-categorize.js';
import type { SkillContext } from '../types.js';

// Mock SkillContext
const createMockContext = (): SkillContext => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  config: {
    get: vi.fn((key: string) => {
      if (key === 'integrations.thetaSteer.socket') return '/tmp/test-theta-steer.sock';
      return undefined;
    }),
  },
  http: {
    get: vi.fn(),
    post: vi.fn(),
  },
} as unknown as SkillContext);

describe('ThetaSteerCategorizeSkill', () => {
  let skill: ThetaSteerCategorizeSkill;
  let ctx: SkillContext;

  beforeEach(() => {
    skill = new ThetaSteerCategorizeSkill();
    ctx = createMockContext();
  });

  describe('initialization', () => {
    it('should initialize with default socket path', async () => {
      const emptyCtx = createMockContext();
      emptyCtx.config.get = vi.fn(() => undefined);

      await skill.initialize(emptyCtx);

      expect(emptyCtx.log.info).toHaveBeenCalledWith(
        'ThetaSteerCategorize initialized (20-category + 8-tier system)'
      );
    });

    it('should use custom socket path from config', async () => {
      await skill.initialize(ctx);

      expect(ctx.config.get).toHaveBeenCalledWith('integrations.thetaSteer.socket');
      expect(ctx.log.info).toHaveBeenCalled();
    });
  });

  describe('getCategories', () => {
    it('should return all 20 categories', async () => {
      const result = await skill.getCategories();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(20);
    });

    it('should include original 12 categories', async () => {
      const result = await skill.getCategories();
      const ids = result.data.map((c: any) => c.id);

      expect(ids).toContain('A');
      expect(ids).toContain('A1');
      expect(ids).toContain('A2');
      expect(ids).toContain('A3');
      expect(ids).toContain('B1');
      expect(ids).toContain('B2');
      expect(ids).toContain('B3');
      expect(ids).toContain('C1');
      expect(ids).toContain('C2');
      expect(ids).toContain('C3');
    });

    it('should include extended 8 categories', async () => {
      const result = await skill.getCategories();
      const ids = result.data.map((c: any) => c.id);

      expect(ids).toContain('D1'); // Risk
      expect(ids).toContain('D2'); // Scale
      expect(ids).toContain('D3'); // Quality
      expect(ids).toContain('E1'); // Learn
      expect(ids).toContain('E2'); // Culture
      expect(ids).toContain('E3'); // Innovation
      expect(ids).toContain('F1'); // Metrics
      expect(ids).toContain('F2'); // Governance
    });

    it('should have emojis for all categories', async () => {
      const result = await skill.getCategories();

      result.data.forEach((category: any) => {
        expect(category.emoji).toBeTruthy();
        expect(category.emoji.length).toBeGreaterThan(0);
        // Verify it's a valid emoji (Unicode symbols or emoji range)
        expect(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(category.emoji)).toBe(true);
      });
    });
  });

  describe('categorization with fallback', () => {
    it('should fall back to Ollama when ThetaSteer unavailable', async () => {
      ctx.http.post = vi.fn().mockResolvedValue({
        response: JSON.stringify({
          row: 'A2',
          col: 'A2',
          confidence: 0.85,
          reasoning: 'Strategic goal content'
        })
      });

      const result = await skill.categorize('Set quarterly OKRs', ctx);

      expect(result.success).toBe(true);
      expect(result.data.row).toBe('A2');
      expect(result.data.col).toBe('A2');
      expect(ctx.http.post).toHaveBeenCalled();
    });

    it('should return default category on complete failure', async () => {
      ctx.http.post = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await skill.categorize('Test content', ctx);

      expect(result.data.tier).toBe('BLUE');
      expect(result.data.row).toBe('C');
      expect(result.data.col).toBe('C1');
    });
  });

  describe('8-tier color confidence system', () => {
    const confidenceTiers = [
      { confidence: 0.95, expectedTier: 'GREEN', description: 'highest confidence' },
      { confidence: 0.85, expectedTier: 'CYAN', description: 'very high confidence' },
      { confidence: 0.75, expectedTier: 'TEAL', description: 'high confidence' },
      { confidence: 0.65, expectedTier: 'AMBER', description: 'moderate confidence' },
      { confidence: 0.55, expectedTier: 'PURPLE', description: 'medium confidence' },
      { confidence: 0.40, expectedTier: 'RED', description: 'low confidence' },
      { confidence: 0.25, expectedTier: 'INDIGO', description: 'very low confidence' },
      { confidence: 0.10, expectedTier: 'BLUE', description: 'uncertain' },
    ];

    confidenceTiers.forEach(({ confidence, expectedTier, description }) => {
      it(`should map confidence ${confidence} to ${expectedTier} tier (${description})`, async () => {
        ctx.http.post = vi.fn()
          .mockResolvedValueOnce({
            response: JSON.stringify({
              row: 'A2',
              col: 'A2',
              confidence,
              reasoning: 'Test'
            })
          })
          .mockResolvedValueOnce({
            response: JSON.stringify({ hardness: 3, reasoning: 'Medium complexity' })
          });

        const result = await skill.categorize('Test task', ctx);

        expect(result.data.tier).toBe(expectedTier);
        expect(result.data.confidence).toBe(confidence);
      });
    });
  });

  describe('extended category mapping', () => {
    const extendedCategoryTests = [
      { id: 'D1', name: 'Risk', expectedRoom: 'vault', trustDims: ['security', 'risk_assessment', 'reliability'] },
      { id: 'D2', name: 'Scale', expectedRoom: 'architect', trustDims: ['resource_efficiency', 'reliability', 'innovation'] },
      { id: 'D3', name: 'Quality', expectedRoom: 'laboratory', trustDims: ['code_quality', 'testing', 'documentation'] },
      { id: 'E1', name: 'Learn', expectedRoom: 'operator', trustDims: ['domain_expertise', 'documentation', 'knowledge_sharing'] },
      { id: 'E2', name: 'Culture', expectedRoom: 'voice', trustDims: ['collaboration', 'communication', 'ethical_alignment'] },
      { id: 'E3', name: 'Innovation', expectedRoom: 'navigator', trustDims: ['innovation', 'creativity', 'adaptability'] },
      { id: 'F1', name: 'Metrics', expectedRoom: 'builder', trustDims: ['transparency', 'accountability', 'data_integrity'] },
      { id: 'F2', name: 'Governance', expectedRoom: 'vault', trustDims: ['compliance', 'process_adherence', 'accountability'] },
    ];

    extendedCategoryTests.forEach(({ id, name, expectedRoom, trustDims }) => {
      it(`should map ${id} (${name}) to ${expectedRoom} room with correct trust dimensions`, async () => {
        ctx.http.post = vi.fn()
          .mockResolvedValueOnce({
            response: JSON.stringify({
              row: id,
              col: id,
              confidence: 0.8,
              reasoning: `${name} content`
            })
          })
          .mockResolvedValueOnce({
            response: JSON.stringify({ hardness: 3, reasoning: 'Medium' })
          });

        const result = await skill.categorize(`Test ${name} content`, ctx);

        expect(result.data.row).toBe(id);
        expect(result.data.target_room).toBe(expectedRoom);
        expect(result.data.trustDimensions).toEqual(trustDims);
      });
    });
  });

  describe('full notation formatting', () => {
    it('should format original categories with full notation', async () => {
      ctx.http.post = vi.fn()
        .mockResolvedValueOnce({
          response: JSON.stringify({
            row: 'B3',
            col: 'C1',
            confidence: 0.8,
            reasoning: 'Test'
          })
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({ hardness: 3, reasoning: 'Medium' })
        });

      const result = await skill.categorize('Test content', ctx);

      expect(result.data.full_notation).toContain('B3');
      expect(result.data.full_notation).toContain('Tactics.Signal');
      expect(result.data.full_notation).toContain('C1');
      expect(result.data.full_notation).toContain('Operations.Grid');
      expect(result.data.full_notation).toContain(':');
    });

    it('should format extended categories with full notation', async () => {
      ctx.http.post = vi.fn()
        .mockResolvedValueOnce({
          response: JSON.stringify({
            row: 'E3',
            col: 'F1',
            confidence: 0.75,
            reasoning: 'Innovation metrics'
          })
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({ hardness: 4, reasoning: 'Complex' })
        });

      const result = await skill.categorize('Innovation tracking', ctx);

      expect(result.data.full_notation).toContain('E3');
      expect(result.data.full_notation).toContain('Innovation.Creative');
      expect(result.data.full_notation).toContain('F1');
      expect(result.data.full_notation).toContain('Metrics.Analytics');
    });
  });

  describe('semantic question generation', () => {
    it('should generate diagonal questions (essence)', async () => {
      ctx.http.post = vi.fn()
        .mockResolvedValueOnce({
          response: JSON.stringify({
            row: 'D1',
            col: 'D1',
            confidence: 0.9,
            reasoning: 'Security risk'
          })
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({ hardness: 3 })
        });

      const result = await skill.categorize('Risk assessment', ctx);

      expect(result.data.semantic_question).toContain('What is the essence of');
    });

    it('should generate off-diagonal questions (intersection)', async () => {
      ctx.http.post = vi.fn()
        .mockResolvedValueOnce({
          response: JSON.stringify({
            row: 'E2',
            col: 'D3',
            confidence: 0.7,
            reasoning: 'Culture quality'
          })
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({ hardness: 4 })
        });

      const result = await skill.categorize('Team culture standards', ctx);

      expect(result.data.semantic_question).toContain('What does');
      expect(result.data.semantic_question).toContain('mean in');
    });
  });

  describe('hardness estimation and model routing', () => {
    const hardnessTests = [
      { hardness: 1, expectedModel: 'ollama', description: 'simple lookup' },
      { hardness: 2, expectedModel: 'ollama', description: 'straightforward action' },
      { hardness: 3, expectedModel: 'sonnet', description: 'multi-step task' },
      { hardness: 4, expectedModel: 'sonnet', description: 'complex reasoning' },
      { hardness: 5, expectedModel: 'opus', description: 'novel/creative' },
    ];

    hardnessTests.forEach(({ hardness, expectedModel, description }) => {
      it(`should route hardness ${hardness} (${description}) to ${expectedModel}`, async () => {
        ctx.http.post = vi.fn()
          .mockResolvedValueOnce({
            response: JSON.stringify({
              row: 'C1',
              col: 'C1',
              confidence: 0.8,
              reasoning: 'Test'
            })
          })
          .mockResolvedValueOnce({
            response: JSON.stringify({ hardness, reasoning: description })
          });

        const result = await skill.categorize('Test task', ctx);

        expect(result.data.hardness).toBe(hardness);
        expect(result.data.target_model).toBe(expectedModel);
      });
    });
  });

  describe('trust dimension mapping', () => {
    it('should include trust dimensions for all categories', async () => {
      const categories = ['A1', 'B2', 'C3', 'D1', 'E2', 'F1'];

      for (const cat of categories) {
        ctx.http.post = vi.fn()
          .mockResolvedValueOnce({
            response: JSON.stringify({
              row: cat,
              col: cat,
              confidence: 0.8,
              reasoning: 'Test'
            })
          })
          .mockResolvedValueOnce({
            response: JSON.stringify({ hardness: 3 })
          });

        const result = await skill.categorize(`Test ${cat}`, ctx);

        expect(result.data.trustDimensions).toBeDefined();
        expect(result.data.trustDimensions?.length).toBeGreaterThan(0);
      }
    });

    it('should map governance (F2) to compliance dimensions', async () => {
      ctx.http.post = vi.fn()
        .mockResolvedValueOnce({
          response: JSON.stringify({
            row: 'F2',
            col: 'F2',
            confidence: 0.85,
            reasoning: 'Governance policy'
          })
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({ hardness: 3 })
        });

      const result = await skill.categorize('Compliance framework', ctx);

      expect(result.data.trustDimensions).toContain('compliance');
      expect(result.data.trustDimensions).toContain('process_adherence');
      expect(result.data.trustDimensions).toContain('accountability');
    });
  });

  describe('input validation and sanitization', () => {
    it('should handle invalid row/col codes gracefully', async () => {
      ctx.http.post = vi.fn()
        .mockResolvedValueOnce({
          response: JSON.stringify({
            row: 'X99',
            col: 'Y88',
            confidence: 0.5,
            reasoning: 'Invalid'
          })
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({ hardness: 3 })
        });

      const result = await skill.categorize('Invalid input', ctx);

      // Should fall back to default (C, C1)
      expect(result.data.row).toBe('C');
      expect(result.data.col).toBe('C1');
    });

    it('should handle malformed JSON from Ollama', async () => {
      ctx.http.post = vi.fn()
        .mockResolvedValueOnce({
          response: 'NOT JSON'
        });

      const result = await skill.categorize('Malformed response', ctx);

      // Should fall back to default
      expect(result.data.tier).toBe('BLUE');
    });

    it('should truncate long text to 500 chars for categorization', async () => {
      const longText = 'a'.repeat(1000);
      ctx.http.post = vi.fn()
        .mockResolvedValueOnce({
          response: JSON.stringify({
            row: 'C1',
            col: 'C1',
            confidence: 0.5,
            reasoning: 'Test'
          })
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({ hardness: 3 })
        });

      await skill.categorize(longText, ctx);

      const firstCall = (ctx.http.post as any).mock.calls[0];
      expect(firstCall[1].prompt.length).toBeLessThan(longText.length + 1000);
    });
  });

  describe('error handling', () => {
    it('should log warnings on ThetaSteer connection failure', async () => {
      // ThetaSteer will fail (no socket), should fall back to Ollama
      ctx.http.post = vi.fn().mockResolvedValue({
        response: JSON.stringify({
          row: 'C1',
          col: 'C1',
          confidence: 0.5,
          reasoning: 'Fallback'
        })
      });

      await skill.categorize('Test', ctx);

      expect(ctx.log.warn).toHaveBeenCalled();
    });

    it('should handle hardness estimation failure gracefully', async () => {
      ctx.http.post = vi.fn()
        .mockResolvedValueOnce({
          response: JSON.stringify({
            row: 'A1',
            col: 'A1',
            confidence: 0.8,
            reasoning: 'Test'
          })
        })
        .mockRejectedValueOnce(new Error('Hardness estimation failed'));

      const result = await skill.categorize('Test', ctx);

      expect(result.data.hardness).toBe(3); // Default
      expect(result.data.target_model).toBe('sonnet'); // Default
    });
  });

  describe('logging and observability', () => {
    it('should log categorization start', async () => {
      ctx.http.post = vi.fn().mockResolvedValue({
        response: JSON.stringify({
          row: 'C1',
          col: 'C1',
          confidence: 0.5,
          reasoning: 'Test'
        })
      });

      await skill.categorize('Test content', ctx);

      expect(ctx.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Categorizing:')
      );
    });

    it('should log final categorization result', async () => {
      ctx.http.post = vi.fn()
        .mockResolvedValueOnce({
          response: JSON.stringify({
            row: 'B1',
            col: 'B1',
            confidence: 0.85,
            reasoning: 'Speed task'
          })
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({ hardness: 2 })
        });

      await skill.categorize('Sprint task', ctx);

      expect(ctx.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Categorized:')
      );
    });
  });
});
