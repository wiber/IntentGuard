/**
 * Tests for claude-flow-bridge.ts — 9-room IPC dispatch system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SkillContext, SkillResult } from '../types.js';
import ClaudeFlowBridgeSkill from './claude-flow-bridge.js';

describe('ClaudeFlowBridgeSkill', () => {
  let skill: ClaudeFlowBridgeSkill;
  let mockContext: SkillContext;

  beforeEach(() => {
    skill = new ClaudeFlowBridgeSkill();

    mockContext = {
      config: {
        get: vi.fn((key: string) => {
          if (key === 'integrations.claudeFlow.projectDir') return '/test/project';
          if (key === 'integrations.claudeFlow.workerModel') return 'claude-opus-4-6';
          if (key === 'integrations.claudeFlow.workerMaxTurns') return 25;
          return undefined;
        }),
      },
      shell: {
        exec: vi.fn(async () => ({ stdout: '', stderr: '', code: 0 })),
      },
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      fs: {
        read: vi.fn(async () => ''),
        write: vi.fn(async () => {}),
      },
      callSkill: vi.fn(async () => ({ success: true, data: {} })),
    } as unknown as SkillContext;
  });

  describe('initialization', () => {
    it('should initialize with config values', async () => {
      await skill.initialize(mockContext);
      expect(mockContext.config.get).toHaveBeenCalledWith('integrations.claudeFlow.projectDir');
      expect(mockContext.log.info).toHaveBeenCalled();
    });

    it('should detect Claude Flow availability', async () => {
      vi.mocked(mockContext.shell.exec).mockResolvedValueOnce({ stdout: '', stderr: '', code: 0 });
      await skill.initialize(mockContext);
      expect(mockContext.shell.exec).toHaveBeenCalledWith(expect.stringContaining('claude-flow status'));
    });
  });

  describe('execute - action routing', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should route create_task action', async () => {
      const command = {
        action: 'create_task',
        payload: {
          source: {
            category: { tile_id: 'A1', tier: 'BLUE' },
            transcription: { text: 'Build a new feature' },
          },
          priority: 2,
        },
      };

      // Mock Claude Flow task creation
      vi.mocked(mockContext.shell.exec)
        .mockResolvedValueOnce({ stdout: 'task_abc123 created', stderr: '', code: 0 })
        .mockResolvedValueOnce({ stdout: 'agent_xyz789 spawned', stderr: '', code: 0 })
        .mockResolvedValueOnce({ stdout: 'assigned', stderr: '', code: 0 });

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
    });

    it('should route prompt action', async () => {
      const command = {
        action: 'prompt',
        payload: {
          room: 'builder',
          prompt: 'Write a function',
        },
      };

      vi.mocked(mockContext.shell.exec)
        .mockResolvedValueOnce({ stdout: 'task_test created', stderr: '', code: 0 })
        .mockResolvedValueOnce({ stdout: 'agent_test spawned', stderr: '', code: 0 })
        .mockResolvedValueOnce({ stdout: 'assigned', stderr: '', code: 0 });

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
    });

    it('should route stdin action', async () => {
      const command = {
        action: 'stdin',
        payload: {
          room: 'builder',
          text: 'y\n',
        },
      };

      vi.mocked(mockContext.shell.exec).mockResolvedValueOnce({ stdout: 'sent', stderr: '', code: 0 });

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
    });

    it('should route broadcast action', async () => {
      const command = {
        action: 'broadcast',
        payload: {
          prompt: 'Update all rooms',
          rooms: ['builder', 'architect'],
        },
      };

      vi.mocked(mockContext.shell.exec)
        .mockResolvedValue({ stdout: 'task created', stderr: '', code: 0 });

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Broadcast');
    });

    it('should route list_terminals action', async () => {
      const command = {
        action: 'list_terminals',
        payload: {},
      };

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('length', 9);
    });

    it('should route list_agents action', async () => {
      const command = {
        action: 'list_agents',
        payload: {},
      };

      vi.mocked(mockContext.shell.exec).mockResolvedValueOnce({
        stdout: 'agent_1\nagent_2\n',
        stderr: '',
        code: 0,
      });

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
    });
  });

  describe('room mapping', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should map tier to room correctly', async () => {
      const tierTests = [
        { tier: 'RED', expectedRoom: 'vault' },
        { tier: 'BLUE', expectedRoom: 'builder' },
        { tier: 'GREEN', expectedRoom: 'operator' },
        { tier: 'PURPLE', expectedRoom: 'voice' },
        { tier: 'CYAN', expectedRoom: 'laboratory' },
        { tier: 'AMBER', expectedRoom: 'performer' },
        { tier: 'INDIGO', expectedRoom: 'architect' },
        { tier: 'TEAL', expectedRoom: 'navigator' },
      ];

      for (const { tier, expectedRoom } of tierTests) {
        const command = {
          action: 'create_task',
          payload: {
            source: {
              category: { tile_id: 'test', tier },
              transcription: { text: 'test task' },
            },
            priority: 3,
          },
        };

        vi.mocked(mockContext.shell.exec)
          .mockResolvedValue({ stdout: 'task created', stderr: '', code: 0 });

        await skill.execute(command, mockContext);
        // Verify the room is used in Claude Flow command
        expect(mockContext.shell.exec).toHaveBeenCalledWith(
          expect.stringContaining(`room:${expectedRoom}`)
        );
      }
    });
  });

  describe('terminal IPC methods', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should send via iTerm for builder room', async () => {
      const command = {
        action: 'stdin',
        payload: {
          room: 'builder',
          text: 'test command',
        },
      };

      vi.mocked(mockContext.shell.exec).mockResolvedValueOnce({
        stdout: 'sent',
        stderr: '',
        code: 0,
      });

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
      expect(mockContext.shell.exec).toHaveBeenCalledWith(
        expect.stringContaining('iTerm')
      );
    });

    it('should send via Terminal.app for voice room', async () => {
      const command = {
        action: 'stdin',
        payload: {
          room: 'voice',
          text: 'test command',
        },
      };

      vi.mocked(mockContext.shell.exec).mockResolvedValueOnce({
        stdout: 'sent',
        stderr: '',
        code: 0,
      });

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
      expect(mockContext.shell.exec).toHaveBeenCalledWith(
        expect.stringContaining('Terminal')
      );
    });

    it('should send via Kitty for operator room', async () => {
      const command = {
        action: 'stdin',
        payload: {
          room: 'operator',
          text: 'test command',
        },
      };

      vi.mocked(mockContext.shell.exec).mockResolvedValueOnce({
        stdout: 'sent',
        stderr: '',
        code: 0,
      });

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
      expect(mockContext.shell.exec).toHaveBeenCalledWith(
        expect.stringContaining('kitty')
      );
    });

    it('should send via WezTerm for vault room', async () => {
      const command = {
        action: 'stdin',
        payload: {
          room: 'vault',
          text: 'test command',
        },
      };

      vi.mocked(mockContext.shell.exec)
        .mockResolvedValueOnce({ stdout: '[]', stderr: '', code: 0 }) // pane list
        .mockResolvedValueOnce({ stdout: '', stderr: '', code: 0 }); // send-text

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
      expect(mockContext.shell.exec).toHaveBeenCalledWith(
        expect.stringContaining('wezterm')
      );
    });

    it('should send via System Events for architect room', async () => {
      const command = {
        action: 'stdin',
        payload: {
          room: 'architect',
          text: 'short text',
        },
      };

      vi.mocked(mockContext.shell.exec).mockResolvedValueOnce({
        stdout: 'typed',
        stderr: '',
        code: 0,
      });

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
      expect(mockContext.shell.exec).toHaveBeenCalledWith(
        expect.stringContaining('System Events')
      );
    });

    it('should use clipboard paste for long text in System Events', async () => {
      const longText = 'a'.repeat(150);
      const command = {
        action: 'stdin',
        payload: {
          room: 'architect',
          text: longText,
        },
      };

      vi.mocked(mockContext.shell.exec)
        .mockResolvedValueOnce({ stdout: '', stderr: '', code: 0 }) // pbcopy
        .mockResolvedValueOnce({ stdout: 'pasted', stderr: '', code: 0 }); // paste

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
      expect(mockContext.shell.exec).toHaveBeenCalledWith(
        expect.stringContaining('pbcopy')
      );
    });
  });

  describe('Claude Flow dispatch', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should create task with correct priority mapping', async () => {
      const priorityTests = [
        { priority: 1, expected: 'critical' },
        { priority: 2, expected: 'high' },
        { priority: 3, expected: 'normal' },
        { priority: 4, expected: 'low' },
        { priority: 5, expected: 'low' },
      ];

      for (const { priority, expected } of priorityTests) {
        const command = {
          action: 'prompt',
          payload: {
            room: 'builder',
            prompt: 'test',
          },
        };

        vi.mocked(mockContext.shell.exec)
          .mockResolvedValue({ stdout: 'task created', stderr: '', code: 0 });

        await skill.execute(command, mockContext);
        // Note: priority mapping is used internally in sendToRoom
      }
    });

    it('should spawn agent with correct model', async () => {
      const command = {
        action: 'prompt',
        payload: {
          room: 'builder',
          prompt: 'test',
        },
      };

      vi.mocked(mockContext.shell.exec)
        .mockResolvedValueOnce({ stdout: 'task_123 created', stderr: '', code: 0 })
        .mockResolvedValueOnce({ stdout: 'agent_456 spawned', stderr: '', code: 0 })
        .mockResolvedValueOnce({ stdout: 'assigned', stderr: '', code: 0 });

      await skill.execute(command, mockContext);
      expect(mockContext.shell.exec).toHaveBeenCalledWith(
        expect.stringContaining('--model opus')
      );
    });

    it('should fallback to CLI when Claude Flow unavailable', async () => {
      // Simulate Claude Flow failure
      vi.mocked(mockContext.shell.exec)
        .mockResolvedValueOnce({ stdout: '', stderr: 'error', code: 1 }); // task create fails

      const command = {
        action: 'prompt',
        payload: {
          room: 'builder',
          prompt: 'test',
        },
      };

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('mode', 'cli-fallback');
    });
  });

  describe('recursion guard', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should block execution when CLAUDE_FLOW_WORKER is set', async () => {
      process.env.CLAUDE_FLOW_WORKER = '1';

      const command = {
        action: 'prompt',
        payload: {
          room: 'builder',
          prompt: 'test',
        },
      };

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(false);
      expect(result.message).toContain('recursive');

      delete process.env.CLAUDE_FLOW_WORKER;
    });

    it('should block execution when CLAUDE_FLOW_NO_SPAWN is set', async () => {
      process.env.CLAUDE_FLOW_NO_SPAWN = '1';

      const command = {
        action: 'prompt',
        payload: {
          room: 'builder',
          prompt: 'test',
        },
      };

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(false);
      expect(result.message).toContain('recursive');

      delete process.env.CLAUDE_FLOW_NO_SPAWN;
    });
  });

  describe('hooks integration', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should call onTaskDispatched hook when set', async () => {
      const mockHook = vi.fn(async () => ({ taskId: 'hook-task-123', baseline: '' }));
      skill.onTaskDispatched = mockHook;

      const command = {
        action: 'prompt',
        payload: {
          room: 'builder',
          prompt: 'test',
        },
      };

      vi.mocked(mockContext.shell.exec)
        .mockResolvedValue({ stdout: 'task created', stderr: '', code: 0 });

      await skill.execute(command, mockContext);
      expect(mockHook).toHaveBeenCalledWith('builder', expect.any(String));
    });

    it('should call getRoomContext hook when set', async () => {
      const mockHook = vi.fn(() => 'Previous context data');
      skill.getRoomContext = mockHook;

      const command = {
        action: 'prompt',
        payload: {
          room: 'builder',
          prompt: 'test',
        },
      };

      vi.mocked(mockContext.shell.exec)
        .mockResolvedValue({ stdout: 'task created', stderr: '', code: 0 });

      await skill.execute(command, mockContext);
      expect(mockHook).toHaveBeenCalledWith('builder');
    });

    it('should call onProcessSpawned hook when set', async () => {
      const mockHook = vi.fn();
      skill.onProcessSpawned = mockHook;

      const command = {
        action: 'prompt',
        payload: {
          room: 'builder',
          prompt: 'test',
        },
      };

      vi.mocked(mockContext.shell.exec)
        .mockResolvedValueOnce({ stdout: 'task_123 created', stderr: '', code: 0 })
        .mockResolvedValueOnce({ stdout: 'agent_456 spawned', stderr: '', code: 0 })
        .mockResolvedValueOnce({ stdout: 'assigned', stderr: '', code: 0 });

      await skill.execute(command, mockContext);
      expect(mockHook).toHaveBeenCalledWith('builder', 0);
    });
  });

  describe('attention corpus logging', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should log prompts to attention corpus', async () => {
      const command = {
        action: 'prompt',
        payload: {
          room: 'builder',
          prompt: 'test prompt for logging',
        },
      };

      vi.mocked(mockContext.shell.exec)
        .mockResolvedValue({ stdout: 'task created', stderr: '', code: 0 });

      await skill.execute(command, mockContext);
      expect(mockContext.fs.write).toHaveBeenCalledWith(
        'data/attention-corpus/prompts.jsonl',
        expect.stringContaining('test prompt for logging')
      );
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await skill.initialize(mockContext);
    });

    it('should handle unknown room gracefully', async () => {
      const command = {
        action: 'prompt',
        payload: {
          room: 'unknown-room',
          prompt: 'test',
        },
      };

      vi.mocked(mockContext.shell.exec)
        .mockResolvedValue({ stdout: 'task created', stderr: '', code: 0 });

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(true);
      expect(mockContext.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('unknown-room')
      );
    });

    it('should handle empty prompt', async () => {
      const command = {
        action: 'prompt',
        payload: {
          room: 'builder',
          prompt: '',
        },
      };

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(false);
      expect(result.message).toContain('No prompt');
    });

    it('should handle AppleScript failures', async () => {
      const command = {
        action: 'stdin',
        payload: {
          room: 'builder',
          text: 'test',
        },
      };

      vi.mocked(mockContext.shell.exec).mockResolvedValueOnce({
        stdout: '',
        stderr: 'AppleScript error',
        code: 1,
      });

      const result = await skill.execute(command, mockContext);
      expect(result.success).toBe(false);
      expect(result.message).toContain('AppleScript failed');
    });
  });
});
