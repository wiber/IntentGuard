/**
 * src/skills/email-outbound.ts — Headless Outbound Email
 *
 * The bot sends emails via thetadriven.com API endpoints.
 * Categories: notification, crm-followup, trust-report, digest
 *
 * IntentGuard (headless cortex) → HTTP POST → thetadriven.com/api/email/send
 *
 * FIM REQUIREMENT: send_message (communication >= 0.5, accountability >= 0.4)
 * The FIM auth layer checks these before the email is sent.
 */

import type { AgentSkill, SkillContext, SkillResult } from '../types.js';

type EmailCategory = 'notification' | 'crm-followup' | 'trust-report' | 'digest' | 'general';

interface EmailRequest {
  to: string | string[];
  subject: string;
  body: string;
  category?: EmailCategory;
  html?: boolean;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

interface EmailResult {
  messageId: string;
  to: string[];
  subject: string;
  category: EmailCategory;
  sentAt: string;
}

export default class EmailOutboundSkill implements AgentSkill {
  name = 'email-outbound';
  description = 'Send outbound emails via thetadriven.com API (headless)';

  private apiBaseUrl = 'https://thetadriven.com';
  private fromAddress = 'elias@thetadriven.com';
  private apiKey = '';

  async initialize(ctx: SkillContext): Promise<void> {
    this.apiBaseUrl = (ctx.config.get('integrations.email.apiBaseUrl') as string)
      || process.env.THETADRIVEN_API_URL
      || 'https://thetadriven.com';

    this.apiKey = process.env.THETADRIVEN_API_KEY || '';

    this.fromAddress = (ctx.config.get('integrations.email.fromAddress') as string)
      || 'elias@thetadriven.com';

    ctx.log.info(`EmailOutbound initialized (api: ${this.apiBaseUrl}, from: ${this.fromAddress})`);
  }

  async execute(command: unknown, ctx: SkillContext): Promise<SkillResult> {
    const req = command as EmailRequest;

    if (!req.to || !req.subject || !req.body) {
      return { success: false, message: 'Missing required fields: to, subject, body' };
    }

    const recipients = Array.isArray(req.to) ? req.to : [req.to];
    const category = req.category || 'general';

    ctx.log.info(`Sending ${category} email to ${recipients.length} recipient(s): "${req.subject}"`);

    try {
      const result = await this.sendEmail({
        to: recipients,
        subject: req.subject,
        body: req.body,
        category,
        html: req.html ?? false,
        replyTo: req.replyTo,
        metadata: req.metadata,
      }, ctx);

      // Log to corpus for trust-debt tracking
      await ctx.fs.write(
        'data/attention-corpus/emails.jsonl',
        JSON.stringify({
          timestamp: new Date().toISOString(),
          action: 'email_sent',
          to: recipients,
          subject: req.subject,
          category,
          messageId: result.messageId,
        }) + '\n',
      ).catch(() => {});

      return {
        success: true,
        message: `Email sent to ${recipients.join(', ')} (${category})`,
        data: result,
      };
    } catch (error) {
      ctx.log.error(`Email send failed: ${error}`);
      return { success: false, message: `Email failed: ${error}` };
    }
  }

  /**
   * Send via thetadriven.com API
   */
  private async sendEmail(
    req: EmailRequest & { to: string[] },
    ctx: SkillContext,
  ): Promise<EmailResult> {
    const payload = {
      from: this.fromAddress,
      to: req.to,
      subject: req.subject,
      [req.html ? 'html' : 'text']: req.body,
      replyTo: req.replyTo || this.fromAddress,
      category: req.category,
      metadata: {
        ...req.metadata,
        source: 'intentguard-headless',
        sentBy: 'sovereign-engine',
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.apiBaseUrl}/api/email/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API ${response.status}: ${errorText}`);
    }

    const data = await response.json() as { messageId?: string; id?: string; error?: string };

    if (data.error) throw new Error(data.error);

    return {
      messageId: data.messageId || data.id || `ig_${Date.now()}`,
      to: req.to,
      subject: req.subject,
      category: req.category || 'general',
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * Send a trust-debt report email
   */
  async sendTrustReport(
    recipient: string,
    reportHtml: string,
    ctx: SkillContext,
  ): Promise<SkillResult> {
    return this.execute({
      to: recipient,
      subject: `[IntentGuard] Trust-Debt Report — ${new Date().toISOString().split('T')[0]}`,
      body: reportHtml,
      category: 'trust-report',
      html: true,
    }, ctx);
  }

  /**
   * Send a CRM follow-up email
   */
  async sendCrmFollowup(
    recipient: string,
    leadName: string,
    body: string,
    ctx: SkillContext,
  ): Promise<SkillResult> {
    return this.execute({
      to: recipient,
      subject: `Following up — ${leadName}`,
      body,
      category: 'crm-followup',
      metadata: { leadName },
    }, ctx);
  }

  /**
   * Send a daily digest email
   */
  async sendDigest(
    recipient: string,
    digestHtml: string,
    ctx: SkillContext,
  ): Promise<SkillResult> {
    return this.execute({
      to: recipient,
      subject: `[IntentGuard] Daily Digest — ${new Date().toISOString().split('T')[0]}`,
      body: digestHtml,
      category: 'digest',
      html: true,
    }, ctx);
  }
}
