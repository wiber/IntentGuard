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
export default class EmailOutboundSkill implements AgentSkill {
    name: string;
    description: string;
    private apiBaseUrl;
    private fromAddress;
    private apiKey;
    initialize(ctx: SkillContext): Promise<void>;
    execute(command: unknown, ctx: SkillContext): Promise<SkillResult>;
    /**
     * Send via thetadriven.com API
     */
    private sendEmail;
    /**
     * Send a trust-debt report email
     */
    sendTrustReport(recipient: string, reportHtml: string, ctx: SkillContext): Promise<SkillResult>;
    /**
     * Send a CRM follow-up email
     */
    sendCrmFollowup(recipient: string, leadName: string, body: string, ctx: SkillContext): Promise<SkillResult>;
    /**
     * Send a daily digest email
     */
    sendDigest(recipient: string, digestHtml: string, ctx: SkillContext): Promise<SkillResult>;
}
//# sourceMappingURL=email-outbound.d.ts.map