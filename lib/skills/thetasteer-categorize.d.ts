/**
 * src/skills/thetasteer-categorize.ts — ThetaSteer Categorizer
 *
 * Ported from thetadrivencoach/openclaw/skills/thetasteer-categorize.ts
 * Extended to 20-dimensional trust-debt vector mapping with 8-tier color system.
 *
 * Backends:
 *   1. ThetaSteer Rust daemon (Unix socket, <50ms)
 *   2. Ollama llama3.2:1b (local, <200ms)
 *   3. Fallback: keyword heuristic
 *
 * Categories: 20-cell extended tesseract grid
 * Trust mapping: Each cell maps to 2-3 trust-debt dimensions
 * Color Tiers: 8-tier confidence system (GREEN/RED/BLUE/PURPLE/CYAN/AMBER/INDIGO/TEAL)
 */
import type { AgentSkill, SkillContext, SkillResult } from '../types.js';
/**
 * ThetaSteer Categorization Skill with 20-category support
 */
export default class ThetaSteerCategorizeSkill implements AgentSkill {
    name: string;
    description: string;
    private thetaSteerSocket;
    private ollamaEndpoint;
    initialize(ctx: SkillContext): Promise<void>;
    /**
     * Categorize text with full notation, hardness, and 8-tier confidence
     */
    categorize(text: string, ctx: SkillContext): Promise<SkillResult>;
    /**
     * Format row:col into full emoji notation
     */
    private formatFullNotation;
    /**
     * Generate semantic question for intersection
     */
    private formatSemanticQuestion;
    /**
     * Estimate task hardness 1-5
     */
    private estimateHardness;
    /**
     * Call ThetaSteer daemon via Unix socket
     */
    private callThetaSteer;
    /**
     * Call Ollama for categorization with 20-category awareness
     */
    private callOllama;
    /**
     * Format raw result into consistent structure
     */
    private formatResult;
    /**
     * Default category when all else fails
     */
    private defaultCategory;
    /**
     * Get all categories
     */
    getCategories(): Promise<SkillResult>;
}
//# sourceMappingURL=thetasteer-categorize.d.ts.map