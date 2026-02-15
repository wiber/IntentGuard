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
import type { AgentSkill, SkillContext, SkillResult } from "../types.js";
export default class TesseractTrainerSkill implements AgentSkill {
    name: string;
    description: string;
    private supabaseUrl;
    private supabaseKey;
    initialize(ctx: SkillContext): Promise<void>;
    /**
     * Process an attention signal (liked content) and train the corpus
     */
    train(raw: unknown, ctx: SkillContext): Promise<SkillResult>;
    /**
     * Update the local attention corpus with this signal
     */
    private updateCorpus;
    /**
     * Create a tesseract pointer from high-confidence signal
     */
    private createPointer;
    /**
     * Update the heat map based on attention
     */
    private updateHeat;
    /**
     * Summarize content for pointer text
     */
    private summarizeContent;
    /**
     * Calculate attention weight from signal
     */
    private calculateWeight;
    /**
     * Get current heat map
     */
    getHeatMap(ctx: SkillContext): Promise<SkillResult>;
    /**
     * Get training statistics
     */
    getStats(ctx: SkillContext): Promise<SkillResult>;
}
//# sourceMappingURL=tesseract-trainer.d.ts.map