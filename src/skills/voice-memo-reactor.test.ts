/**
 * voice-memo-reactor.test.ts — Tests for VoiceMemoReactorSkill
 *
 * Validates:
 * - Initialization with config
 * - Voice memo storage
 * - Reaction-based triggering
 * - Authorization checks
 * - LLM controller integration (Whisper cascade)
 * - ThetaSteer categorization
 * - Corpus storage
 * - Claude Flow bridge integration
 * - Discord reply formatting
 * - Tesseract training
 */

import { describe, it, expect, beforeEach } from 'vitest';
import VoiceMemoReactorSkill from './voice-memo-reactor.js';
import type { SkillContext, VoiceMemoEvent, ReactionEvent, SkillResult } from '../types.js';

/**
 * Mock SkillContext for testing
 */
function createMockContext(overrides?: Partial<SkillContext>): SkillContext {
  const logs: Array<{ level: string; message: string }> = [];
  const files: Record<string, string> = {};
  const skillResults: Record<string, SkillResult> = {};

  return {
    config: {
      get: (path: string) => {
        if (path === 'channels.discord.voiceMemo.authorizedReactors') {
          return ['user123', 'admin456'];
        }
        if (path === 'channels.discord.voiceMemo.reactionTriggers') {
          return ['👍', '🔥', '⚡', '🧊'];
        }
        return undefined;
      },
    },
    log: {
      debug: (msg: string) => logs.push({ level: 'debug', message: msg }),
      info: (msg: string) => logs.push({ level: 'info', message: msg }),
      warn: (msg: string) => logs.push({ level: 'warn', message: msg }),
      error: (msg: string) => logs.push({ level: 'error', message: msg }),
    },
    fs: {
      read: async (path: string) => files[path] || '',
      write: async (path: string, content: string) => {
        files[path] = content;
      },
    },
    http: {
      post: async () => ({}),
      get: async () => ({}),
    },
    shell: {
      exec: async () => ({ stdout: '', stderr: '', code: 0 }),
    },
    discord: {
      reply: async () => {},
    },
    callSkill: async (name: string, payload: unknown) => {
      // Mock skill responses
      if (name === 'llm-controller') {
        return {
          success: true,
          message: 'Transcribed via Whisper (1234ms)',
          data: {
            transcription: 'This is a test voice memo about implementing a new feature',
            latencyMs: 1234,
            backend: 'whisper-local',
          },
        };
      }
      if (name === 'thetasteer-categorize') {
        return {
          success: true,
          message: 'Categorized',
          data: {
            tile_id: 'B2',
            full_notation: 'B2.GREEN.h3',
            hardness: 3,
            target_model: 'sonnet',
            semantic_question: 'How do we implement this feature efficiently?',
            tier: 'GREEN',
          },
        };
      }
      if (name === 'claude-flow-bridge') {
        return {
          success: true,
          message: 'Task created',
          data: {
            taskId: 'task_12345',
            room: 'builder',
          },
        };
      }
      if (name === 'tesseract-trainer') {
        return { success: true, message: 'Training signal recorded' };
      }
      return skillResults[name] || { success: false, message: 'Unknown skill' };
    },
    ...overrides,
  };
}

/**
 * Create mock VoiceMemoEvent
 */
function createMockMemo(overrides?: Partial<VoiceMemoEvent>): VoiceMemoEvent {
  return {
    messageId: 'msg_12345',
    channelId: 'channel_voice',
    guildId: 'guild_abc',
    audioUrl: 'https://cdn.discordapp.com/attachments/123/456/voice.ogg',
    duration: 15,
    author: {
      id: 'user123',
      username: 'testuser',
    },
    ...overrides,
  };
}

/**
 * Create mock ReactionEvent
 */
function createMockReaction(overrides?: Partial<ReactionEvent>): ReactionEvent {
  return {
    messageId: 'msg_12345',
    emoji: '👍',
    userId: 'user123',
    timestamp: new Date('2026-02-15T12:00:00Z'),
    ...overrides,
  };
}

describe('VoiceMemoReactorSkill', () => {
  let skill: VoiceMemoReactorSkill;
  let ctx: SkillContext;

  beforeEach(async () => {
    skill = new VoiceMemoReactorSkill();
    ctx = createMockContext();
    await skill.initialize(ctx);
  });

  describe('initialization', () => {
    it('should initialize with name and description', () => {
      expect(skill.name).toBe('voice-memo-reactor');
      expect(skill.description).toBe('Autonomous voice/text processor — react = run');
    });

    it('should load authorized reactors from config', async () => {
      const result = await skill.onReaction(
        createMockReaction({ userId: 'user123' }),
        ctx,
      );
      // Should not immediately fail authorization
      expect(result.message).not.toBe('Not authorized');
    });

    it('should load trigger emojis from config', async () => {
      const result = await skill.onReaction(
        createMockReaction({ emoji: '👍' }),
        ctx,
      );
      // Should not immediately fail emoji check
      expect(result.message).not.toBe('Not trigger emoji');
    });
  });

  describe('onVoiceMemo', () => {
    it('should store voice memo and return pending status', async () => {
      const memo = createMockMemo();
      const result = await skill.onVoiceMemo(memo, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('stored, awaiting reaction');
      expect(result.data).toMatchObject({
        messageId: memo.messageId,
        status: 'pending',
      });
    });

    it('should handle multiple voice memos', async () => {
      const memo1 = createMockMemo({ messageId: 'msg_1' });
      const memo2 = createMockMemo({ messageId: 'msg_2' });

      await skill.onVoiceMemo(memo1, ctx);
      await skill.onVoiceMemo(memo2, ctx);

      // Both should be retrievable via reactions
      const result1 = await skill.onReaction(
        createMockReaction({ messageId: 'msg_1' }),
        ctx,
      );
      const result2 = await skill.onReaction(
        createMockReaction({ messageId: 'msg_2' }),
        ctx,
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('onReaction', () => {
    it('should reject unauthorized users', async () => {
      const result = await skill.onReaction(
        createMockReaction({ userId: 'unauthorized_user' }),
        ctx,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Not authorized');
    });

    it('should reject non-trigger emojis', async () => {
      const result = await skill.onReaction(
        createMockReaction({ emoji: '❌' }),
        ctx,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Not trigger emoji');
    });

    it('should handle reaction on non-existent memo', async () => {
      const result = await skill.onReaction(
        createMockReaction({ messageId: 'non_existent' }),
        ctx,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('No pending memo');
    });

    it('should process voice memo when authorized user reacts with trigger emoji', async () => {
      const memo = createMockMemo();
      await skill.onVoiceMemo(memo, ctx);

      const result = await skill.onReaction(createMockReaction(), ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Voice memo processed');
      expect(result.data).toHaveProperty('corpusEntry');
      expect(result.data).toHaveProperty('transcription');
      expect(result.data).toHaveProperty('elapsed');
    });
  });

  describe('processVoiceMemo (integration)', () => {
    it('should transcribe via llm-controller', async () => {
      const memo = createMockMemo();
      await skill.onVoiceMemo(memo, ctx);

      const result = await skill.onReaction(createMockReaction(), ctx);

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.transcription).toContain('test voice memo');
    });

    it('should categorize via thetasteer', async () => {
      const memo = createMockMemo();
      await skill.onVoiceMemo(memo, ctx);

      const result = await skill.onReaction(createMockReaction(), ctx);

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      const entry = data.corpusEntry as Record<string, unknown>;
      const category = entry.category as Record<string, unknown>;
      expect(category.tile_id).toBe('B2');
    });

    it('should save to corpus with correct structure', async () => {
      const files: Record<string, string> = {};
      const ctxWithFs = createMockContext({
        fs: {
          read: async (path: string) => files[path] || '',
          write: async (path: string, content: string) => {
            files[path] = content;
          },
        },
      });

      const skill2 = new VoiceMemoReactorSkill();
      await skill2.initialize(ctxWithFs);

      const memo = createMockMemo();
      await skill2.onVoiceMemo(memo, ctxWithFs);
      await skill2.onReaction(createMockReaction(), ctxWithFs);

      // Check corpus file was created
      const corpusKeys = Object.keys(files).filter(k => k.startsWith('data/attention-corpus/'));
      expect(corpusKeys.length).toBe(1);

      const corpusData = JSON.parse(files[corpusKeys[0]]);
      expect(corpusData).toMatchObject({
        source: 'discord_voice_memo',
        messageId: memo.messageId,
        channelId: memo.channelId,
        audioUrl: memo.audioUrl,
        duration: memo.duration,
      });
      expect(corpusData.transcription).toBeTruthy();
      expect(corpusData.category).toBeTruthy();
      expect(corpusData.reaction).toBeTruthy();
    });

    it('should send to claude-flow-bridge with correct priority', async () => {
      let capturedPayload: unknown = null;
      const ctxWithCapture = createMockContext({
        callSkill: async (name: string, payload: unknown) => {
          if (name === 'claude-flow-bridge') {
            capturedPayload = payload;
            return {
              success: true,
              message: 'Task created',
              data: { taskId: 'task_12345', room: 'builder' },
            };
          }
          return ctx.callSkill(name, payload);
        },
      });

      const skill2 = new VoiceMemoReactorSkill();
      await skill2.initialize(ctxWithCapture);

      const memo = createMockMemo();
      await skill2.onVoiceMemo(memo, ctxWithCapture);
      await skill2.onReaction(
        createMockReaction({ emoji: '🔥' }), // URGENT priority
        ctxWithCapture,
      );

      expect(capturedPayload).toBeTruthy();
      const payload = capturedPayload as Record<string, unknown>;
      expect(payload.action).toBe('create_task');
      const payloadData = payload.payload as Record<string, unknown>;
      expect(payloadData.priority).toBe(1); // 🔥 = URGENT = 1
    });

    it('should handle transcription failure gracefully', async () => {
      const ctxWithFailure = createMockContext({
        callSkill: async (name: string) => {
          if (name === 'llm-controller') {
            return { success: false, message: 'Transcription service unavailable' };
          }
          return ctx.callSkill(name, {});
        },
      });

      const skill2 = new VoiceMemoReactorSkill();
      await skill2.initialize(ctxWithFailure);

      const memo = createMockMemo();
      await skill2.onVoiceMemo(memo, ctxWithFailure);
      const result = await skill2.onReaction(createMockReaction(), ctxWithFailure);

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.transcription).toContain('transcription failed');
    });
  });

  describe('emoji priority mapping', () => {
    it('should map 🔥 to URGENT (priority 1)', async () => {
      let capturedPriority = 0;
      const ctxWithCapture = createMockContext({
        callSkill: async (name: string, payload: unknown) => {
          if (name === 'claude-flow-bridge') {
            const p = payload as Record<string, unknown>;
            const pd = p.payload as Record<string, unknown>;
            capturedPriority = pd.priority as number;
          }
          return ctx.callSkill(name, payload);
        },
      });

      const skill2 = new VoiceMemoReactorSkill();
      await skill2.initialize(ctxWithCapture);

      const memo = createMockMemo();
      await skill2.onVoiceMemo(memo, ctxWithCapture);
      await skill2.onReaction(createMockReaction({ emoji: '🔥' }), ctxWithCapture);

      expect(capturedPriority).toBe(1);
    });

    it('should map ⚡ to HIGH (priority 2)', async () => {
      let capturedPriority = 0;
      const ctxWithCapture = createMockContext({
        callSkill: async (name: string, payload: unknown) => {
          if (name === 'claude-flow-bridge') {
            const p = payload as Record<string, unknown>;
            const pd = p.payload as Record<string, unknown>;
            capturedPriority = pd.priority as number;
          }
          return ctx.callSkill(name, payload);
        },
      });

      const skill2 = new VoiceMemoReactorSkill();
      await skill2.initialize(ctxWithCapture);

      const memo = createMockMemo();
      await skill2.onVoiceMemo(memo, ctxWithCapture);
      await skill2.onReaction(createMockReaction({ emoji: '⚡' }), ctxWithCapture);

      expect(capturedPriority).toBe(2);
    });

    it('should map 👍 to NORMAL (priority 3)', async () => {
      let capturedPriority = 0;
      const ctxWithCapture = createMockContext({
        callSkill: async (name: string, payload: unknown) => {
          if (name === 'claude-flow-bridge') {
            const p = payload as Record<string, unknown>;
            const pd = p.payload as Record<string, unknown>;
            capturedPriority = pd.priority as number;
          }
          return ctx.callSkill(name, payload);
        },
      });

      const skill2 = new VoiceMemoReactorSkill();
      await skill2.initialize(ctxWithCapture);

      const memo = createMockMemo();
      await skill2.onVoiceMemo(memo, ctxWithCapture);
      await skill2.onReaction(createMockReaction({ emoji: '👍' }), ctxWithCapture);

      expect(capturedPriority).toBe(3);
    });

    it('should map 🧊 to BACKLOG (priority 4)', async () => {
      let capturedPriority = 0;
      const ctxWithCapture = createMockContext({
        callSkill: async (name: string, payload: unknown) => {
          if (name === 'claude-flow-bridge') {
            const p = payload as Record<string, unknown>;
            const pd = p.payload as Record<string, unknown>;
            capturedPriority = pd.priority as number;
          }
          return ctx.callSkill(name, payload);
        },
      });

      const skill2 = new VoiceMemoReactorSkill();
      await skill2.initialize(ctxWithCapture);

      const memo = createMockMemo();
      await skill2.onVoiceMemo(memo, ctxWithCapture);
      await skill2.onReaction(createMockReaction({ emoji: '🧊' }), ctxWithCapture);

      expect(capturedPriority).toBe(4);
    });
  });

  describe('discord reply formatting', () => {
    it('should format reply with semantic notation', async () => {
      let replyContent = '';
      const ctxWithReply = createMockContext({
        discord: {
          reply: async (_messageId: string, options: { content: string }) => {
            replyContent = options.content;
          },
        },
      });

      const skill2 = new VoiceMemoReactorSkill();
      await skill2.initialize(ctxWithReply);

      const memo = createMockMemo();
      await skill2.onVoiceMemo(memo, ctxWithReply);
      await skill2.onReaction(createMockReaction(), ctxWithReply);

      expect(replyContent).toContain('Voice memo processed');
      expect(replyContent).toContain('B2.GREEN.h3'); // notation
      expect(replyContent).toContain('3/5'); // hardness
      expect(replyContent).toContain('sonnet'); // target model
      expect(replyContent).toContain('NORMAL'); // priority
      expect(replyContent).toContain('#builder'); // room
    });
  });

  describe('tesseract training', () => {
    it('should train tesseract with voice memo signal', async () => {
      let trainingSent = false;
      const ctxWithTraining = createMockContext({
        callSkill: async (name: string, payload: unknown) => {
          if (name === 'tesseract-trainer') {
            trainingSent = true;
            return { success: true, message: 'Training signal recorded' };
          }
          return ctx.callSkill(name, payload);
        },
      });

      const skill2 = new VoiceMemoReactorSkill();
      await skill2.initialize(ctxWithTraining);

      const memo = createMockMemo();
      await skill2.onVoiceMemo(memo, ctxWithTraining);
      await skill2.onReaction(createMockReaction(), ctxWithTraining);

      expect(trainingSent).toBe(true);
    });

    it('should continue processing if tesseract training fails', async () => {
      const ctxWithFailure = createMockContext({
        callSkill: async (name: string, payload: unknown) => {
          if (name === 'tesseract-trainer') {
            throw new Error('Training service down');
          }
          return ctx.callSkill(name, payload);
        },
      });

      const skill2 = new VoiceMemoReactorSkill();
      await skill2.initialize(ctxWithFailure);

      const memo = createMockMemo();
      await skill2.onVoiceMemo(memo, ctxWithFailure);
      const result = await skill2.onReaction(createMockReaction(), ctxWithFailure);

      // Should still succeed despite training failure
      expect(result.success).toBe(true);
    });
  });
});
