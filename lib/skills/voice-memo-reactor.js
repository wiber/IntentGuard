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
/**
 * VoiceMemoReactorSkill — Autonomous voice/text processor
 *
 * Handles Discord voice messages with reaction-based triggers.
 * Integrates with llm-controller for Whisper/Sonnet transcription cascade.
 */
export default class VoiceMemoReactorSkill {
    name = 'voice-memo-reactor';
    description = 'Autonomous voice/text processor — react = run';
    authorizedReactors = new Set();
    triggerEmojis = new Set(['👍', '🔥', '⚡', '🧊']);
    pendingMemos = new Map();
    /**
     * Initialize with authorized reactors and custom trigger emojis from config
     */
    async initialize(ctx) {
        const reactors = ctx.config.get('channels.discord.voiceMemo.authorizedReactors');
        if (reactors) {
            reactors.forEach(id => this.authorizedReactors.add(id));
        }
        const triggers = ctx.config.get('channels.discord.voiceMemo.reactionTriggers');
        if (triggers) {
            this.triggerEmojis = new Set(triggers);
        }
        ctx.log.info(`VoiceMemoReactor initialized with ${this.authorizedReactors.size} authorized reactors`);
    }
    /**
     * Store voice memo when posted, awaiting reaction trigger
     */
    async onVoiceMemo(memo, ctx) {
        this.pendingMemos.set(memo.messageId, memo);
        ctx.log.info(`Voice memo stored: ${memo.messageId} (${memo.duration}s) from @${memo.author.username}`);
        return {
            success: true,
            message: `Voice memo ${memo.messageId} stored, awaiting reaction`,
            data: { messageId: memo.messageId, status: 'pending' },
        };
    }
    /**
     * Handle reaction on message — trigger processing if authorized + valid emoji
     */
    async onReaction(reaction, ctx) {
        if (!this.authorizedReactors.has(reaction.userId)) {
            return { success: true, message: 'Not authorized' };
        }
        if (!this.triggerEmojis.has(reaction.emoji)) {
            return { success: true, message: 'Not trigger emoji' };
        }
        const memo = this.pendingMemos.get(reaction.messageId);
        if (memo) {
            this.pendingMemos.delete(reaction.messageId);
            return this.processVoiceMemo(memo, reaction, ctx);
        }
        return { success: true, message: 'No pending memo (text handled by runtime)' };
    }
    /**
     * Process voice memo: transcribe → categorize → corpus → Claude Flow → Discord
     *
     * @private
     */
    async processVoiceMemo(memo, reaction, ctx) {
        const startTime = Date.now();
        const priority = this.emojiToPriority(reaction.emoji);
        try {
            // Step 1: Transcribe via LLM controller (Whisper cascade)
            ctx.log.info(`Transcribing voice memo ${memo.messageId}...`);
            let transcription = '';
            let transcriptionData = {};
            const llmController = await ctx.callSkill('llm-controller', {
                audioUrl: memo.audioUrl,
                prompt: 'Transcribe this voice memo. Return the exact words spoken, then a one-line summary of what needs to be done.',
            });
            if (llmController.success && llmController.data) {
                const data = llmController.data;
                transcription = data.transcription || '';
                transcriptionData = data;
                ctx.log.info(`Transcribed: "${transcription.substring(0, 100)}..."`);
            }
            else {
                transcription = `[Voice memo ${memo.duration}s — transcription failed: ${llmController.message}]`;
                ctx.log.warn(`Transcription failed: ${llmController.message}`);
            }
            // Step 2: Categorize via ThetaSteer
            ctx.log.info(`Categorizing...`);
            let category;
            try {
                category = await ctx.callSkill('thetasteer-categorize', {
                    text: transcription.substring(0, 500),
                });
            }
            catch {
                ctx.log.warn('Categorization skipped');
            }
            const categoryData = category?.data;
            // Step 3: Save to corpus
            const corpusEntry = {
                id: `vm_${memo.messageId}_${Date.now()}`,
                source: 'discord_voice_memo',
                messageId: memo.messageId,
                channelId: memo.channelId,
                author: memo.author,
                audioUrl: memo.audioUrl,
                transcription,
                category: categoryData,
                reaction: {
                    emoji: reaction.emoji,
                    userId: reaction.userId,
                    timestamp: reaction.timestamp,
                },
                timestamp: new Date().toISOString(),
                duration: memo.duration,
            };
            await ctx.fs.write(`data/attention-corpus/${corpusEntry.id}.json`, JSON.stringify(corpusEntry, null, 2));
            // Step 4: Send to Claude Flow terminal via bridge
            ctx.log.info(`Sending to Claude Flow...`);
            const prompt = transcription || `Voice memo ${memo.duration}s from @${memo.author.username}`;
            const flowResult = await ctx.callSkill('claude-flow-bridge', {
                action: 'create_task',
                payload: {
                    source: {
                        ...corpusEntry,
                        transcription: { text: prompt },
                        category: categoryData || { tile_id: 'C3', tier: 'BLUE' },
                    },
                    priority,
                },
            });
            const elapsed = Date.now() - startTime;
            // Step 5: Post results to Discord with semantic notation
            const priorityLabel = ['', 'URGENT', 'HIGH', 'NORMAL', 'BACKLOG'][priority];
            const notation = categoryData?.full_notation || categoryData?.tile_id || 'uncategorized';
            const hardness = categoryData?.hardness || 0;
            const targetModel = categoryData?.target_model || 'sonnet';
            const semanticQ = categoryData?.semantic_question || '';
            const flowData = flowResult.data;
            const targetRoom = flowData?.room || 'builder';
            const discordLines = [
                `**Voice memo processed** (${(elapsed / 1000).toFixed(1)}s) from @${memo.author.username}`,
                ``,
                `> ${transcription.length > 400 ? transcription.substring(0, 400) + '...' : transcription}`,
                ``,
                `${notation}`,
                semanticQ ? `*${semanticQ}*` : '',
                `**Priority:** ${priorityLabel} | **Hardness:** ${hardness}/5 → \`${targetModel}\``,
                `**Room:** #${targetRoom}`,
            ];
            if (flowResult.success) {
                const taskId = flowData?.taskId || '';
                discordLines.push(`**Status:** Dispatched${taskId ? ` (${taskId})` : ''}`);
            }
            else {
                discordLines.push(`**Status:** Failed — ${flowResult.message}`);
                discordLines.push(`React again to retry, or type in #${targetRoom} to dispatch manually`);
            }
            const discordMessage = discordLines.filter(Boolean).join('\n');
            await ctx.discord?.reply(memo.messageId, { content: discordMessage });
            // Step 6: Train tesseract with this signal
            try {
                await ctx.callSkill('tesseract-trainer', {
                    source: 'voice_memo',
                    content: transcription,
                    category: categoryData || { tile_id: 'C3', col: 'C3', row: 'C', confidence: 0.3, tier: 'BLUE' },
                    reaction: { emoji: reaction.emoji, timestamp: reaction.timestamp.toISOString() },
                    metadata: { messageId: memo.messageId, audioUrl: memo.audioUrl },
                });
            }
            catch {
                ctx.log.warn('Tesseract training skipped');
            }
            return {
                success: true,
                message: `Voice memo processed (${elapsed}ms)`,
                data: { corpusEntry, transcription, elapsed },
            };
        }
        catch (error) {
            ctx.log.error(`Failed to process voice memo: ${error}`);
            return { success: false, message: `Processing failed: ${error}` };
        }
    }
    /**
     * Map emoji to priority level
     * @private
     */
    emojiToPriority(emoji) {
        const priorities = {
            '🔥': 1, // URGENT
            '⚡': 2, // HIGH
            '👍': 3, // NORMAL
            '🧊': 4, // BACKLOG
        };
        return priorities[emoji] || 3;
    }
}
//# sourceMappingURL=voice-memo-reactor.js.map