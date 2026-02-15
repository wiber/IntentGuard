/**
 * src/skills/llm-controller.test.ts — Tests for LLM Controller with 3-Tier Routing
 *
 * Tests:
 *   - 3-tier routing logic (Ollama → Sonnet → Human)
 *   - Cost governor enforcement
 *   - Confidence-based fallback
 *   - Complexity-based routing
 *   - Budget exceeded scenarios
 *   - Human escalation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import LLMControllerSkill from './llm-controller.js';
import type { SkillContext, SkillResult } from '../types.js';
import CostReporter from './cost-reporter.js';

// Mock CostReporter — must use a class so `new CostReporter()` works
vi.mock('./cost-reporter.js', () => {
  const MockCostReporter = vi.fn(function (this: any) {
    this.initialize = vi.fn();
    this.isBudgetExceeded = vi.fn().mockReturnValue(false);
    this.getDailyBudget = vi.fn().mockReturnValue(10);
    this.trackInferenceCost = vi.fn();
  });
  return { default: MockCostReporter };
});

describe('LLMControllerSkill - 3-Tier Routing', () => {
  let skill: LLMControllerSkill;
  let mockContext: SkillContext;

  beforeEach(() => {
    skill = new LLMControllerSkill();

    mockContext = {
      config: {
        get: vi.fn((path: string) => {
          if (path === 'integrations.ollama.endpoint') return 'http://localhost:11434';
          return undefined;
        }),
      },
      log: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      fs: {
        read: vi.fn(),
        write: vi.fn(),
      },
      http: {
        post: vi.fn(),
        get: vi.fn(),
      },
      shell: {
        exec: vi.fn(),
      },
      callSkill: vi.fn(),
    } as unknown as SkillContext;
  });

  describe('Initialization', () => {
    it('should initialize with default values', async () => {
      await skill.initialize(mockContext);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('LLMController initialized')
      );
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('3-tier routing')
      );
    });
  });

  describe('Routing Logic', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should route low complexity (1-2) to Ollama', async () => {
      mockContext.http.post = vi.fn().mockResolvedValue({
        response: 'This is a simple answer from Ollama',
      });

      const result = await skill.execute(
        {
          prompt: 'What is 2+2?',
          complexity: 1,
        },
        mockContext
      );

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Low complexity (1) → Ollama')
      );
      expect(result.success).toBe(true);
    });

    it('should route medium complexity (3-4) to Sonnet', async () => {
      mockContext.shell.exec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: 'Sonnet response here',
        stderr: '',
      });

      const result = await skill.execute(
        {
          prompt: 'Explain quantum computing',
          complexity: 3,
        },
        mockContext
      );

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Medium complexity (3) → Sonnet')
      );
      expect(result.success).toBe(true);
    });

    it('should route high complexity (5) to Human', async () => {
      const result = await skill.execute(
        {
          prompt: 'Design a complete AI architecture',
          complexity: 5,
        },
        mockContext
      );

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('High complexity (5) → Human review')
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('Escalated to human review');
    });

    it('should honor explicit backend request', async () => {
      mockContext.shell.exec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: 'Explicit Sonnet response',
        stderr: '',
      });

      const result = await skill.execute(
        {
          prompt: 'Simple task',
          backend: 'sonnet',
          complexity: 1, // Low complexity but explicit backend
        },
        mockContext
      );

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Explicit backend requested')
      );
      expect(result.success).toBe(true);
    });

    it('should force human review when requireHuman is true', async () => {
      const result = await skill.execute(
        {
          prompt: 'Any task',
          requireHuman: true,
          complexity: 1,
        },
        mockContext
      );

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Human review explicitly requested')
      );
      expect(result.success).toBe(false);
    });
  });

  describe('Fallback Mechanism', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should fallback from Ollama to Sonnet on low confidence', async () => {
      // First call: Ollama with low confidence response
      mockContext.http.post = vi.fn().mockResolvedValue({
        response: 'Maybe?', // Short, uncertain response
      });

      // Second call: Sonnet with confident response
      mockContext.shell.exec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: 'Here is a detailed and confident explanation that is long enough to show high confidence in the answer provided.',
        stderr: '',
      });

      const result = await skill.execute(
        {
          prompt: 'Complex question',
          backend: 'auto',
        },
        mockContext
      );

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Ollama low confidence')
      );
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Tier 2: Attempting Sonnet')
      );
    });

    it('should fallback from Ollama to Sonnet on error', async () => {
      // First call: Ollama fails
      mockContext.http.post = vi.fn().mockRejectedValue(new Error('Connection refused'));

      // Second call: Sonnet succeeds
      mockContext.shell.exec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: 'Sonnet fallback response that is sufficiently long to demonstrate confidence.',
        stderr: '',
      });

      const result = await skill.execute(
        {
          prompt: 'Any task',
          backend: 'auto',
        },
        mockContext
      );

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Ollama failed')
      );
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Tier 2: Attempting Sonnet')
      );
    });

    it('should escalate to human when both Ollama and Sonnet fail', async () => {
      // Both fail
      mockContext.http.post = vi.fn().mockRejectedValue(new Error('Ollama down'));
      mockContext.shell.exec = vi.fn().mockRejectedValue(new Error('Sonnet down'));

      const result = await skill.execute(
        {
          prompt: 'Critical task',
          backend: 'auto',
        },
        mockContext
      );

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Tier 3: Escalating to Human')
      );
      expect(result.success).toBe(false);
      expect(result.data).toHaveProperty('tier', 'human');
    });
  });

  describe('Cost Governor', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should force Ollama when budget exceeded', async () => {
      // Mock budget exceeded — get the latest instance
      const instances = (CostReporter as any).mock.instances;
      const mockCostReporter = instances[instances.length - 1];
      mockCostReporter.isBudgetExceeded.mockReturnValue(true);

      mockContext.http.post = vi.fn().mockResolvedValue({
        response: 'Ollama response under budget constraint',
      });

      const result = await skill.execute(
        {
          prompt: 'Expensive task',
          backend: 'sonnet', // Request Sonnet but should be overridden
        },
        mockContext
      );

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('COST GOVERNOR: Daily budget')
      );
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Budget exceeded, forced to Ollama')
      );
    });

    it('should track costs for Ollama calls', async () => {
      mockContext.http.post = vi.fn().mockResolvedValue({
        response: 'Test response',
      });

      await skill.execute(
        {
          prompt: 'Test prompt',
          backend: 'ollama',
        },
        mockContext
      );

      const instances = (CostReporter as any).mock.instances;
      const mockCostReporter = instances[instances.length - 1];
      expect(mockCostReporter.trackInferenceCost).toHaveBeenCalled();
    });
  });

  describe('Confidence Assessment', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should detect low confidence from uncertain phrases', async () => {
      mockContext.http.post = vi.fn().mockResolvedValue({
        response: "I'm not sure about this answer",
      });

      mockContext.shell.exec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: 'Confident Sonnet response with sufficient length to pass confidence check.',
        stderr: '',
      });

      await skill.execute(
        {
          prompt: 'Uncertain question',
          backend: 'auto',
        },
        mockContext
      );

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('low confidence')
      );
    });

    it('should accept high confidence from long, certain responses', async () => {
      mockContext.http.post = vi.fn().mockResolvedValue({
        response: 'This is a very detailed and confident response that provides comprehensive information and demonstrates high certainty in the answer. It includes multiple sentences and thorough explanations.',
      });

      const result = await skill.execute(
        {
          prompt: 'Well-known fact',
          backend: 'auto',
        },
        mockContext
      );

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Ollama succeeded')
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Both Mode', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should run both backends in parallel', async () => {
      mockContext.http.post = vi.fn().mockResolvedValue({
        response: 'Ollama response',
      });

      mockContext.shell.exec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: 'Sonnet response',
        stderr: '',
      });

      const result = await skill.execute(
        {
          prompt: 'Test both',
          backend: 'both',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('results');
      expect((result.data as any).results).toHaveLength(2);
    });

    it('should handle partial failures in both mode', async () => {
      mockContext.http.post = vi.fn().mockRejectedValue(new Error('Ollama failed'));

      mockContext.shell.exec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: 'Sonnet response',
        stderr: '',
      });

      const result = await skill.execute(
        {
          prompt: 'Test both with failure',
          backend: 'both',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('1/2 backends responded');
    });
  });

  describe('Human Escalation', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should log human review requests to queue', async () => {
      const result = await skill.execute(
        {
          prompt: 'Critical decision',
          requireHuman: true,
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.data).toHaveProperty('tier', 'human');
      expect(result.data).toHaveProperty('reviewQueuePath');
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Human review queued')
      );
    });
  });

  describe('Audio Transcription', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should handle audio transcription requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('fake audio data')),
      });

      mockContext.shell.exec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: 'Transcribed text',
        stderr: '',
      });

      const result = await skill.execute(
        {
          prompt: 'Transcribe this',
          audioUrl: 'https://example.com/audio.ogg',
        },
        mockContext
      );

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Downloading voice memo')
      );
    });
  });
});
