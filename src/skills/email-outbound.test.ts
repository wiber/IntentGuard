import { describe, it, expect, beforeEach, vi } from 'vitest';
import EmailOutboundSkill from './email-outbound.js';
import type { SkillContext } from '../types.js';

const mockCtx: SkillContext = {
  config: { get: vi.fn(() => undefined) },
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  fs: { read: vi.fn(), write: vi.fn(async () => {}) },
  http: { post: vi.fn(), get: vi.fn() },
  shell: { run: vi.fn() } as any,
  callSkill: vi.fn(),
};

function okResponse(data: Record<string, unknown> = { messageId: 'msg-001' }) {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('EmailOutboundSkill', () => {
  let skill: EmailOutboundSkill;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(okResponse())));
    skill = new EmailOutboundSkill();
  });

  describe('initialize', () => {
    it('uses config values when available', async () => {
      (mockCtx.config.get as any).mockImplementation((key: string) => {
        if (key === 'integrations.email.apiBaseUrl') return 'https://custom.api';
        if (key === 'integrations.email.fromAddress') return 'custom@example.com';
        return undefined;
      });
      await skill.initialize(mockCtx);
      expect(mockCtx.log.info).toHaveBeenCalledWith(expect.stringContaining('https://custom.api'));
    });

    it('falls back to defaults', async () => {
      (mockCtx.config.get as any).mockReturnValue(undefined);
      await skill.initialize(mockCtx);
      expect(mockCtx.log.info).toHaveBeenCalledWith(expect.stringContaining('thetadriven.com'));
    });
  });

  describe('execute', () => {
    it('rejects missing required fields', async () => {
      const result = await skill.execute({ to: '', subject: '', body: '' }, mockCtx);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required fields');
    });

    it('sends email and returns success', async () => {
      const result = await skill.execute(
        { to: 'user@example.com', subject: 'Test', body: 'Hello' },
        mockCtx,
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('user@example.com');
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('normalises single recipient to array', async () => {
      await skill.execute(
        { to: 'single@example.com', subject: 'S', body: 'B' },
        mockCtx,
      );
      const body = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(body.to).toEqual(['single@example.com']);
    });

    it('handles array recipients', async () => {
      await skill.execute(
        { to: ['a@x.com', 'b@x.com'], subject: 'S', body: 'B' },
        mockCtx,
      );
      const body = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(body.to).toEqual(['a@x.com', 'b@x.com']);
    });

    it('uses html key when html flag is true', async () => {
      await skill.execute(
        { to: 'u@x.com', subject: 'S', body: '<h1>Hi</h1>', html: true },
        mockCtx,
      );
      const body = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(body.html).toBe('<h1>Hi</h1>');
      expect(body.text).toBeUndefined();
    });

    it('uses text key when html flag is false', async () => {
      await skill.execute(
        { to: 'u@x.com', subject: 'S', body: 'plain text' },
        mockCtx,
      );
      const body = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(body.text).toBe('plain text');
      expect(body.html).toBeUndefined();
    });

    it('defaults category to general', async () => {
      await skill.execute(
        { to: 'u@x.com', subject: 'S', body: 'B' },
        mockCtx,
      );
      const body = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(body.category).toBe('general');
    });

    it('returns failure on API error', async () => {
      vi.stubGlobal('fetch', vi.fn(() =>
        Promise.resolve(new Response('Forbidden', { status: 403 })),
      ));
      const result = await skill.execute(
        { to: 'u@x.com', subject: 'S', body: 'B' },
        mockCtx,
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('403');
    });

    it('returns failure on response-level error field', async () => {
      vi.stubGlobal('fetch', vi.fn(() =>
        Promise.resolve(okResponse({ error: 'rate limited' })),
      ));
      const result = await skill.execute(
        { to: 'u@x.com', subject: 'S', body: 'B' },
        mockCtx,
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('rate limited');
    });

    it('logs sent email to corpus file', async () => {
      await skill.execute(
        { to: 'u@x.com', subject: 'Test', body: 'B' },
        mockCtx,
      );
      expect(mockCtx.fs.write).toHaveBeenCalledWith(
        'data/attention-corpus/emails.jsonl',
        expect.stringContaining('"action":"email_sent"'),
      );
    });
  });

  describe('convenience methods', () => {
    it('sendTrustReport sends html trust-report email', async () => {
      const result = await skill.sendTrustReport('ceo@x.com', '<h1>Report</h1>', mockCtx);
      expect(result.success).toBe(true);
      const body = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(body.category).toBe('trust-report');
      expect(body.html).toBe('<h1>Report</h1>');
    });

    it('sendCrmFollowup sends crm-followup email with lead metadata', async () => {
      const result = await skill.sendCrmFollowup('lead@x.com', 'John', 'Hey John', mockCtx);
      expect(result.success).toBe(true);
      const body = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(body.category).toBe('crm-followup');
      expect(body.metadata.leadName).toBe('John');
    });

    it('sendDigest sends digest html email', async () => {
      const result = await skill.sendDigest('team@x.com', '<ul>items</ul>', mockCtx);
      expect(result.success).toBe(true);
      const body = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(body.category).toBe('digest');
    });
  });
});
