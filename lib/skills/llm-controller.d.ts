/**
 * src/skills/llm-controller.ts — Multi-LLM Controller with 3-Tier Routing
 *
 * Ported from thetadrivencoach/openclaw/skills/llm-controller.ts
 * Enhanced with 3-tier routing: Ollama → Sonnet → Human fallback
 *
 * Backends:
 *   - Ollama llama3.2:1b (local, fast categorization, first tier)
 *   - Claude Sonnet (API or CLI, reasoning, second tier)
 *   - Human fallback (third tier, for complex/uncertain tasks)
 *   - Whisper (local transcription)
 *
 * Cost Governor:
 *   - Tracks API usage and enforces daily budget
 *   - Auto-switches to Ollama when budget exceeded
 *   - Logs all costs to data/coordination/ollama-usage.jsonl
 */
import type { AgentSkill, SkillContext, SkillResult } from '../types.js';
interface LLMRequest {
    prompt: string;
    backend?: 'ollama' | 'sonnet' | 'opus' | 'both' | 'auto';
    audioUrl?: string;
    systemPrompt?: string;
    complexity?: 1 | 2 | 3 | 4 | 5;
    requireHuman?: boolean;
}
export default class LLMControllerSkill implements AgentSkill {
    name: string;
    description: string;
    private ollamaEndpoint;
    private anthropicKey;
    private rootDir;
    private costReporter;
    private budgetExceeded;
    private usageLogPath;
    private ollamaMaxComplexity;
    private sonnetMaxComplexity;
    private confidenceThreshold;
    initialize(ctx: SkillContext): Promise<void>;
    /**
     * Cost Governor: check if daily budget exceeded → force Ollama.
     */
    private checkBudget;
    /**
     * Track inference cost and log usage.
     */
    private trackCost;
    /**
     * Estimate cost in USD for a model call.
     */
    private estimateCost;
    /**
     * 3-tier routing decision logic.
     */
    private routeRequest;
    execute(command: unknown, ctx: SkillContext): Promise<SkillResult>;
    /**
     * Run with automatic tier fallback.
     * Tries: Ollama → Sonnet → Human
     */
    private runWithFallback;
    /**
     * Assess confidence of an LLM response.
     * Returns value between 0 and 1.
     */
    private assessConfidence;
    /**
     * Escalate to human review (Tier 3).
     */
    private escalateToHuman;
    private runBoth;
    private runOllama;
    private runSonnet;
    /**
     * Transcribe audio with fallback chain: Whisper → API → CLI
     */
    transcribe(req: LLMRequest, ctx: SkillContext): Promise<SkillResult>;
    private transcribeViaWhisper;
    private transcribeViaAPI;
    private transcribeViaCLI;
    private callOllama;
    private callSonnet;
}
export {};
//# sourceMappingURL=llm-controller.d.ts.map