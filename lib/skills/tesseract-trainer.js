/**
 * Tesseract Trainer Skill
 *
 * Feeds liked content into the geometric IAM training corpus.
 * Your attention (likes) shapes the vector space of what gets built.
 *
 * Integration with tesseract.nu:
 * - Creates pointers from liked content
 * - Tracks attention heat on tiles
 * - Builds training corpus for future AI alignment
 */
// Tesseract grid categories (matches tesseract.nu)
const CATEGORIES = {
    // Main categories
    A: { name: "Strategy", emoji: "🏛️" },
    B: { name: "Tactics", emoji: "⚡" },
    C: { name: "Operations", emoji: "🔧" },
    // Sub-categories
    A1: { name: "Law", emoji: "⚖️" },
    A2: { name: "Goal", emoji: "🎯" },
    A3: { name: "Fund", emoji: "💰" },
    B1: { name: "Speed", emoji: "🏎️" },
    B2: { name: "Deal", emoji: "🤝" },
    B3: { name: "Signal", emoji: "📡" },
    C1: { name: "Grid", emoji: "🔌" },
    C2: { name: "Loop", emoji: "🔄" },
    C3: { name: "Flow", emoji: "🌊" },
};
export default class TesseractTrainerSkill {
    name = "tesseract-trainer";
    description = "Feed liked content into geometric IAM training corpus";
    supabaseUrl = "";
    supabaseKey = "";
    async initialize(ctx) {
        this.supabaseUrl = ctx.config.get("integrations.supabase.url") || "";
        this.supabaseKey = ctx.config.get("integrations.supabase.anonKey") || "";
        ctx.log.info("TesseractTrainer initialized");
    }
    /**
     * Process an attention signal (liked content) and train the corpus
     */
    async train(raw, ctx) {
        const signal = raw;
        ctx.log.info(`🎯 Training on attention signal: ${signal.category.tile_id}`);
        const results = {
            corpusUpdated: false,
            pointerCreated: false,
            heatUpdated: false,
        };
        try {
            // Step 1: Update local attention corpus
            await this.updateCorpus(signal, ctx);
            results.corpusUpdated = true;
            // Step 2: Create tesseract pointer if high confidence
            if (signal.category.confidence >= 0.7) {
                await this.createPointer(signal, ctx);
                results.pointerCreated = true;
            }
            // Step 3: Update heat map
            await this.updateHeat(signal, ctx);
            results.heatUpdated = true;
            return {
                success: true,
                message: `Trained on ${signal.source} → ${signal.category.tile_id}`,
                data: results,
            };
        }
        catch (error) {
            ctx.log.error(`Training failed: ${error}`);
            return {
                success: false,
                message: `Training failed: ${error}`,
                data: results,
            };
        }
    }
    /**
     * Update the local attention corpus with this signal
     */
    async updateCorpus(signal, ctx) {
        const corpusPath = `data/attention-corpus/signals.jsonl`;
        // Append to JSONL file
        const entry = JSON.stringify({
            timestamp: new Date().toISOString(),
            ...signal,
        });
        try {
            const existing = await ctx.fs.read(corpusPath).catch(() => "");
            await ctx.fs.write(corpusPath, existing + entry + "\n");
        }
        catch {
            await ctx.fs.write(corpusPath, entry + "\n");
        }
        ctx.log.debug(`Corpus updated: ${signal.category.tile_id}`);
    }
    /**
     * Create a tesseract pointer from high-confidence signal
     */
    async createPointer(signal, ctx) {
        if (!this.supabaseUrl || !this.supabaseKey) {
            ctx.log.warn("Supabase not configured, skipping pointer creation");
            return;
        }
        const pointer = {
            tile_id: signal.category.tile_id,
            text_content: this.summarizeContent(signal.content),
            source_type: signal.source,
            attention_weight: this.calculateWeight(signal),
        };
        // Call Supabase RPC to create pointer
        try {
            const response = await ctx.http.post(`${this.supabaseUrl}/rest/v1/rpc/create_tesseract_pointer`, {
                p_tile_id: pointer.tile_id,
                p_text_content: pointer.text_content,
                p_url: signal.metadata.messageUrl || null,
            }, {
                headers: {
                    apikey: this.supabaseKey,
                    Authorization: `Bearer ${this.supabaseKey}`,
                    "Content-Type": "application/json",
                },
            });
            const data = response;
            ctx.log.info(`Pointer created: ${pointer.tile_id} → ${data.pointer_id}`);
        }
        catch (error) {
            ctx.log.warn(`Pointer creation failed (may need fuel): ${error}`);
        }
    }
    /**
     * Update the heat map based on attention
     */
    async updateHeat(signal, ctx) {
        const heatPath = `data/attention-corpus/heat.json`;
        let heat = {};
        try {
            const existing = await ctx.fs.read(heatPath);
            heat = JSON.parse(existing);
        }
        catch {
            // Initialize with zero heat
            Object.keys(CATEGORIES).forEach((cat) => {
                heat[cat] = 0;
            });
        }
        // Increase heat for this tile
        const tileId = signal.category.tile_id;
        const weight = this.calculateWeight(signal);
        heat[tileId] = (heat[tileId] || 0) + weight;
        await ctx.fs.write(heatPath, JSON.stringify(heat, null, 2));
        ctx.log.debug(`Heat updated: ${tileId} = ${heat[tileId]}`);
    }
    /**
     * Summarize content for pointer text
     */
    summarizeContent(content) {
        // Truncate and clean
        const cleaned = content
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 200);
        return cleaned.length === 200 ? cleaned + "..." : cleaned;
    }
    /**
     * Calculate attention weight from signal
     */
    calculateWeight(signal) {
        let weight = 1;
        // Higher weight for higher confidence
        weight *= signal.category.confidence;
        // Emoji multipliers
        const emojiWeights = {
            "🔥": 4, // Fire = urgent
            "⚡": 3, // Lightning = high
            "👍": 2, // Thumbs up = normal
            "🧊": 1, // Ice = low/preserve
        };
        weight *= emojiWeights[signal.reaction.emoji] || 1;
        // Source multipliers
        const sourceWeights = {
            voice_memo: 2, // Voice = high effort
            code: 1.5, // Code = technical
            message: 1, // Text = standard
            link: 0.8, // Link = reference
        };
        weight *= sourceWeights[signal.source] || 1;
        return Math.round(weight * 10) / 10;
    }
    /**
     * Get current heat map
     */
    async getHeatMap(ctx) {
        try {
            const heatPath = `data/attention-corpus/heat.json`;
            const heat = JSON.parse(await ctx.fs.read(heatPath));
            return {
                success: true,
                message: "Heat map retrieved",
                data: {
                    heat,
                    categories: CATEGORIES,
                },
            };
        }
        catch {
            return {
                success: true,
                message: "No heat data yet",
                data: {
                    heat: {},
                    categories: CATEGORIES,
                },
            };
        }
    }
    /**
     * Get training statistics
     */
    async getStats(ctx) {
        try {
            const signalsPath = `data/attention-corpus/signals.jsonl`;
            const signals = await ctx.fs.read(signalsPath);
            const lines = signals.split("\n").filter(Boolean);
            const stats = {
                totalSignals: lines.length,
                bySource: {},
                byTile: {},
                byEmoji: {},
            };
            lines.forEach((line) => {
                try {
                    const signal = JSON.parse(line);
                    stats.bySource[signal.source] = (stats.bySource[signal.source] || 0) + 1;
                    stats.byTile[signal.category?.tile_id] = (stats.byTile[signal.category?.tile_id] || 0) + 1;
                    stats.byEmoji[signal.reaction?.emoji] = (stats.byEmoji[signal.reaction?.emoji] || 0) + 1;
                }
                catch {
                    // Skip malformed lines
                }
            });
            return {
                success: true,
                message: "Training stats retrieved",
                data: stats,
            };
        }
        catch {
            return {
                success: true,
                message: "No training data yet",
                data: { totalSignals: 0 },
            };
        }
    }
}
//# sourceMappingURL=tesseract-trainer.js.map