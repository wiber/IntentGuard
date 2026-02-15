/**
 * src/skills/voice-memo-reactor.ts — Voice Memo Processor
 *
 * Ported from thetadrivencoach/openclaw/skills/voice-memo-reactor.ts
 * Adapted for IntentGuard's OpenClaw plugin format.
 *
 * Flow:
 * 1. Message posted → stored
 * 2. React with trigger emoji → process
 * 3. Voice memo → transcribe via LLM controller (Whisper cascade: local → API → CLI)
 * 4. Categorize → ThetaSteer → trust-debt dimension
 * 5. Send to Claude Flow terminal via bridge
 * 6. Post results + next questions to Discord
 * 7. Your reaction on the response = proceed
 *
 * Whisper Cascade Strategy:
 * - Tier 1: Local Whisper (fastest, free, no network) — tiny model
 * - Tier 2: Anthropic API (if ANTHROPIC_API_KEY set) — accurate, paid
 * - Tier 3: Claude CLI (OAuth, no key needed) — fallback
 */
import type { AgentSkill, SkillContext, SkillResult, VoiceMemoEvent, ReactionEvent } from '../types.js';
/**
 * VoiceMemoReactorSkill — Autonomous voice/text processor
 *
 * Handles Discord voice messages with reaction-based triggers.
 * Integrates with llm-controller for Whisper/Sonnet transcription cascade.
 */
export default class VoiceMemoReactorSkill implements AgentSkill {
    name: string;
    description: string;
    private authorizedReactors;
    private triggerEmojis;
    private pendingMemos;
    /**
     * Initialize with authorized reactors and custom trigger emojis from config
     */
    initialize(ctx: SkillContext): Promise<void>;
    /**
     * Store voice memo when posted, awaiting reaction trigger
     */
    onVoiceMemo(memo: VoiceMemoEvent, ctx: SkillContext): Promise<SkillResult>;
    /**
     * Handle reaction on message — trigger processing if authorized + valid emoji
     */
    onReaction(reaction: ReactionEvent, ctx: SkillContext): Promise<SkillResult>;
    /**
     * Process voice memo: transcribe → categorize → corpus → Claude Flow → Discord
     *
     * @private
     */
    private processVoiceMemo;
    /**
     * Map emoji to priority level
     * @private
     */
    private emojiToPriority;
}
//# sourceMappingURL=voice-memo-reactor.d.ts.map