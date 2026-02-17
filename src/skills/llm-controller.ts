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
import { writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import CostReporter from './cost-reporter.js';

interface LLMRequest {
  prompt: string;
  backend?: 'ollama' | 'sonnet' | 'opus' | 'both' | 'auto';
  audioUrl?: string;
  systemPrompt?: string;
  complexity?: 1 | 2 | 3 | 4 | 5; // Task complexity for routing
  requireHuman?: boolean; // Force human review
}

interface LLMResponse {
  backend: string;
  response: string;
  latencyMs: number;
  model: string;
  tier: 'ollama' | 'sonnet' | 'human';
  fallbackReason?: string;
  confidence?: number;
}

interface RoutingDecision {
  backend: 'ollama' | 'sonnet' | 'human';
  reason: string;
  tier: 1 | 2 | 3;
}

export default class LLMControllerSkill implements AgentSkill {
  name = 'llm-controller';
  description = 'Multi-LLM controller with 3-tier routing: Ollama → Sonnet → Human (Cost Governor active)';

  private ollamaEndpoint = 'http://localhost:11434';
  private anthropicKey = '';
  private rootDir = process.cwd();
  private costReporter: CostReporter | null = null;
  private budgetExceeded = false;
  private usageLogPath = '';

  // Routing thresholds
  private ollamaMaxComplexity = 2; // Ollama handles complexity 1-2
  private sonnetMaxComplexity = 4; // Sonnet handles complexity 3-4
  private confidenceThreshold = 0.7; // Below this, escalate to next tier

  async initialize(ctx: SkillContext): Promise<void> {
    this.ollamaEndpoint = (ctx.config.get('integrations.ollama.endpoint') as string)
      || process.env.OLLAMA_ENDPOINT
      || 'http://localhost:11434';

    this.anthropicKey = process.env.ANTHROPIC_API_KEY || '';

    // Wire cost governor
    this.costReporter = new CostReporter();
    await this.costReporter.initialize(ctx);

    // Setup usage log
    this.usageLogPath = join(this.rootDir, 'data', 'coordination', 'ollama-usage.jsonl');
    const logDir = dirname(this.usageLogPath);
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

    ctx.log.info(`LLMController initialized (ollama: ${this.ollamaEndpoint}, anthropic: ${this.anthropicKey ? 'configured' : 'will use CLI'}, costGovernor: active)`);
    ctx.log.info(`3-tier routing: Ollama (complexity ≤${this.ollamaMaxComplexity}) → Sonnet (≤${this.sonnetMaxComplexity}) → Human (>4 or low confidence)`);
  }

  /**
   * Cost Governor: check if daily budget exceeded → force Ollama.
   */
  private checkBudget(ctx: SkillContext): void {
    if (!this.costReporter) return;
    const exceeded = this.costReporter.isBudgetExceeded();
    if (exceeded && !this.budgetExceeded) {
      ctx.log.warn(`💰 COST GOVERNOR: Daily budget ($${this.costReporter.getDailyBudget()}) exceeded. Hard-switching to Ollama.`);
      this.budgetExceeded = true;
    } else if (!exceeded && this.budgetExceeded) {
      ctx.log.info(`💰 COST GOVERNOR: Budget reset. API access restored.`);
      this.budgetExceeded = false;
    }
  }

  /**
   * Track inference cost and log usage.
   */
  private trackCost(model: string, inputTokens: number, outputTokens: number, backend: string): void {
    if (this.costReporter) {
      this.costReporter.trackInferenceCost(model, inputTokens, outputTokens);
    }

    // Log to ollama-usage.jsonl for swarm coordination
    const logEntry = {
      ts: new Date().toISOString(),
      agent: 35,
      backend,
      model,
      inputTokens,
      outputTokens,
      estimatedCost: this.estimateCost(model, inputTokens, outputTokens),
    };
    try {
      appendFileSync(this.usageLogPath, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      // Silent fail for logging
    }
  }

  /**
   * Estimate cost in USD for a model call.
   */
  private estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Ollama is free
    if (model.includes('llama')) return 0;

    // Claude Sonnet 4 pricing (as of 2025)
    if (model.includes('sonnet')) {
      return (inputTokens * 0.003 / 1000) + (outputTokens * 0.015 / 1000);
    }

    return 0;
  }

  /**
   * 3-tier routing decision logic.
   */
  private routeRequest(req: LLMRequest, ctx: SkillContext): RoutingDecision {
    // Force human if requested
    if (req.requireHuman) {
      return { backend: 'human', reason: 'Human review explicitly requested', tier: 3 };
    }

    // Budget exceeded → force Ollama
    if (this.budgetExceeded && req.backend !== 'ollama') {
      return { backend: 'ollama', reason: 'Budget exceeded, forced to Ollama', tier: 1 };
    }

    // Explicit backend request
    if (req.backend && req.backend !== 'auto') {
      const tier = req.backend === 'ollama' ? 1 : req.backend === 'sonnet' ? 2 : 3;
      return { backend: req.backend as 'ollama' | 'sonnet' | 'human', reason: 'Explicit backend requested', tier: tier as 1 | 2 | 3 };
    }

    // Auto-routing based on complexity
    const complexity = req.complexity || 3; // Default to medium complexity

    if (complexity <= this.ollamaMaxComplexity) {
      return { backend: 'ollama', reason: `Low complexity (${complexity}) → Ollama`, tier: 1 };
    } else if (complexity <= this.sonnetMaxComplexity) {
      return { backend: 'sonnet', reason: `Medium complexity (${complexity}) → Sonnet`, tier: 2 };
    } else {
      return { backend: 'human', reason: `High complexity (${complexity}) → Human review`, tier: 3 };
    }
  }

  async execute(command: unknown, ctx: SkillContext): Promise<SkillResult> {
    const req = command as LLMRequest;

    if (req.audioUrl) return this.transcribe(req, ctx);

    // Cost Governor check
    this.checkBudget(ctx);

    // 3-tier routing decision
    const decision = this.routeRequest(req, ctx);
    ctx.log.info(`🔀 Routing: ${decision.reason}`);

    // Execute based on routing decision
    if (decision.backend === 'human') {
      return this.escalateToHuman(req, decision.reason, ctx);
    }

    // Handle 'both' mode
    if (req.backend === 'both') {
      return this.runBoth(req, ctx);
    }

    // Auto mode: use fallback chain (Ollama → Sonnet → Human)
    if (req.backend === 'auto') {
      return this.runWithFallback(req, ctx);
    }

    // Direct tier 1 (Ollama) — no confidence check
    if (decision.backend === 'ollama') {
      return this.runOllama(req, ctx);
    }

    // Direct tier 2 (Sonnet)
    if (decision.backend === 'sonnet') {
      return this.runSonnet(req, ctx);
    }

    return this.runOllama(req, ctx);
  }

  /**
   * Run with automatic tier fallback.
   * Tries: Ollama → Sonnet → Human
   */
  private async runWithFallback(req: LLMRequest, ctx: SkillContext): Promise<SkillResult> {
    // Tier 1: Try Ollama
    ctx.log.info('🎯 Tier 1: Attempting Ollama...');
    try {
      const ollamaResult = await this.callOllama(req.prompt, req.systemPrompt, ctx);

      // Check confidence
      const confidence = this.assessConfidence(ollamaResult.response);
      if (confidence >= this.confidenceThreshold) {
        ctx.log.info(`✅ Ollama succeeded (confidence: ${confidence.toFixed(2)})`);
        return {
          success: true,
          message: `Ollama responded (${ollamaResult.latencyMs}ms, confidence: ${confidence.toFixed(2)})`,
          data: { ...ollamaResult, tier: 'ollama', confidence }
        };
      }

      ctx.log.warn(`⚠️ Ollama low confidence (${confidence.toFixed(2)}), escalating to Sonnet...`);
    } catch (error) {
      ctx.log.warn(`❌ Ollama failed: ${error}, escalating to Sonnet...`);
    }

    // Tier 2: Try Sonnet
    ctx.log.info('🎯 Tier 2: Attempting Sonnet...');
    try {
      const sonnetResult = await this.callSonnet(req.prompt, req.systemPrompt, ctx);

      const confidence = this.assessConfidence(sonnetResult.response);
      if (confidence >= this.confidenceThreshold) {
        ctx.log.info(`✅ Sonnet succeeded (confidence: ${confidence.toFixed(2)})`);
        return {
          success: true,
          message: `Sonnet responded (${sonnetResult.latencyMs}ms, confidence: ${confidence.toFixed(2)})`,
          data: { ...sonnetResult, tier: 'sonnet', confidence, fallbackReason: 'Ollama low confidence' }
        };
      }

      ctx.log.warn(`⚠️ Sonnet low confidence (${confidence.toFixed(2)}), escalating to Human...`);
    } catch (error) {
      ctx.log.warn(`❌ Sonnet failed: ${error}, escalating to Human...`);
    }

    // Tier 3: Escalate to Human
    ctx.log.info('🎯 Tier 3: Escalating to Human review...');
    return this.escalateToHuman(req, 'Both Ollama and Sonnet failed or had low confidence', ctx);
  }

  /**
   * Assess confidence of an LLM response.
   * Returns value between 0 and 1.
   */
  private assessConfidence(response: string): number {
    // Simple heuristics - can be enhanced with more sophisticated methods
    if (!response || response.length < 10) return 0.1;

    const uncertainPhrases = [
      "i'm not sure",
      "i don't know",
      "unclear",
      "uncertain",
      "maybe",
      "possibly",
      "might be",
      "could be",
      "not certain"
    ];

    const lowerResponse = response.toLowerCase();
    const hasUncertainty = uncertainPhrases.some(phrase => lowerResponse.includes(phrase));

    if (hasUncertainty) return 0.4;
    if (response.length < 50) return 0.5;
    if (response.length > 200) return 0.9;

    return 0.75;
  }

  /**
   * Escalate to human review (Tier 3).
   */
  private async escalateToHuman(req: LLMRequest, reason: string, ctx: SkillContext): Promise<SkillResult> {
    const humanRequest = {
      timestamp: new Date().toISOString(),
      prompt: req.prompt,
      systemPrompt: req.systemPrompt,
      reason,
      complexity: req.complexity,
    };

    // Log to human review queue
    const reviewPath = join(this.rootDir, 'data', 'human-review-queue.jsonl');
    try {
      appendFileSync(reviewPath, JSON.stringify(humanRequest) + '\n');
    } catch (err) {
      ctx.log.error(`Failed to log human review request: ${err}`);
    }

    ctx.log.info(`👤 Human review queued: ${reason}`);

    return {
      success: false,
      message: `Escalated to human review: ${reason}`,
      data: {
        tier: 'human',
        reason,
        reviewQueuePath: reviewPath,
        request: humanRequest,
      },
    };
  }

  private async runBoth(req: LLMRequest, ctx: SkillContext): Promise<SkillResult> {
    const start = Date.now();
    const [ollama, sonnet] = await Promise.allSettled([
      this.callOllama(req.prompt, req.systemPrompt, ctx),
      this.callSonnet(req.prompt, req.systemPrompt, ctx),
    ]);

    const results: LLMResponse[] = [];
    if (ollama.status === 'fulfilled') results.push(ollama.value);
    if (sonnet.status === 'fulfilled') results.push(sonnet.value);

    return {
      success: results.length > 0,
      message: `${results.length}/2 backends responded (${Date.now() - start}ms total)`,
      data: { results },
    };
  }

  private async runOllama(req: LLMRequest, ctx: SkillContext): Promise<SkillResult> {
    try {
      const result = await this.callOllama(req.prompt, req.systemPrompt, ctx);
      return { success: true, message: `Ollama responded (${result.latencyMs}ms)`, data: result };
    } catch (error) {
      return { success: false, message: `Ollama failed: ${error}` };
    }
  }

  private async runSonnet(req: LLMRequest, ctx: SkillContext): Promise<SkillResult> {
    try {
      const result = await this.callSonnet(req.prompt, req.systemPrompt, ctx);
      return { success: true, message: `Sonnet responded (${result.latencyMs}ms)`, data: result };
    } catch (error) {
      return { success: false, message: `Sonnet failed: ${error}` };
    }
  }

  /**
   * Transcribe audio with fallback chain: Whisper → API → CLI
   */
  async transcribe(req: LLMRequest, ctx: SkillContext): Promise<SkillResult> {
    ctx.log.info('Downloading voice memo for transcription...');

    try {
      const audioResponse = await fetch(req.audioUrl!);
      if (!audioResponse.ok) throw new Error(`Download failed: ${audioResponse.status}`);

      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      ctx.log.info(`Audio downloaded (${audioBuffer.length} bytes)`);

      const tmpDir = join(this.rootDir, 'data', 'audio-tmp');
      if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
      const audioPath = join(tmpDir, `memo-${Date.now()}.ogg`);
      writeFileSync(audioPath, audioBuffer);

      const prompt = req.prompt || 'Transcribe this voice memo word for word. Then provide: SUMMARY: [one line] ACTIONS: [action items if any]';

      // Try Whisper first
      try {
        return await this.transcribeViaWhisper(audioPath, ctx);
      } catch {
        ctx.log.warn('Whisper failed, trying API');
      }

      // Try API
      if (this.anthropicKey) {
        try {
          return await this.transcribeViaAPI(audioBuffer, prompt, ctx);
        } catch {
          ctx.log.warn('API transcription failed, trying CLI');
        }
      }

      // CLI fallback
      return await this.transcribeViaCLI(audioPath, prompt, ctx);
    } catch (error) {
      return { success: false, message: `Transcription failed: ${error}` };
    }
  }

  private async transcribeViaWhisper(audioPath: string, ctx: SkillContext): Promise<SkillResult> {
    const start = Date.now();
    const outputDir = join(this.rootDir, 'data', 'audio-tmp');

    const result = await ctx.shell.exec(
      `PATH="/Users/thetadriven/Library/Python/3.9/bin:$PATH" whisper "${audioPath}" --model tiny --output_format json --output_dir "${outputDir}" --language en 2>/dev/null`
    );

    if (result.code !== 0) throw new Error(`Whisper exit ${result.code}`);

    const jsonPath = audioPath.replace(/\.[^.]+$/, '.json');
    try {
      const jsonContent = await ctx.fs.read(jsonPath.replace(this.rootDir + '/', ''));
      const whisperResult = JSON.parse(jsonContent);
      return {
        success: true,
        message: `Transcribed via Whisper (${Date.now() - start}ms)`,
        data: { transcription: whisperResult.text || '', latencyMs: Date.now() - start, backend: 'whisper-local' },
      };
    } catch {
      return {
        success: true,
        message: `Transcribed via Whisper (${Date.now() - start}ms)`,
        data: { transcription: result.stdout.trim(), latencyMs: Date.now() - start, backend: 'whisper-local' },
      };
    }
  }

  private async transcribeViaAPI(audioBuffer: Buffer, prompt: string, ctx: SkillContext): Promise<SkillResult> {
    const start = Date.now();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'document', source: { type: 'base64', media_type: 'audio/ogg', data: audioBuffer.toString('base64') } },
          ],
        }],
      }),
    });

    const data = await response.json() as { content?: Array<{ text?: string }>; error?: { message: string }; usage?: { input_tokens: number; output_tokens: number } };
    if (data.error) throw new Error(data.error.message);

    // Track cost
    if (data.usage) {
      this.trackCost('claude-sonnet-4-20250514', data.usage.input_tokens, data.usage.output_tokens, 'anthropic-api');
    }

    return {
      success: true,
      message: `Transcribed via API (${Date.now() - start}ms)`,
      data: { transcription: data.content?.[0]?.text || '', latencyMs: Date.now() - start, backend: 'anthropic-api' },
    };
  }

  private async transcribeViaCLI(audioPath: string, prompt: string, ctx: SkillContext): Promise<SkillResult> {
    const start = Date.now();
    const escaped = prompt.replace(/'/g, "'\\''");
    const result = await ctx.shell.exec(
      `unset CLAUDECODE && claude -p 'Read the audio file at ${audioPath} and ${escaped}' --max-turns 1 2>&1`
    );

    return {
      success: result.code === 0,
      message: `Transcribed via CLI (${Date.now() - start}ms)`,
      data: { transcription: result.stdout || result.stderr, latencyMs: Date.now() - start, backend: 'claude-cli' },
    };
  }

  private async callOllama(prompt: string, systemPrompt: string | undefined, ctx: SkillContext): Promise<LLMResponse> {
    const start = Date.now();
    const body: Record<string, unknown> = { model: 'qwen2.5:14b-instruct-q6_K', prompt, stream: false };
    if (systemPrompt) body.system = systemPrompt;

    const response = await ctx.http.post(`${this.ollamaEndpoint}/api/generate`, body);
    const data = response as { response?: string };

    // Estimate tokens (rough approximation: 1 token ≈ 4 chars)
    const inputTokens = Math.ceil((prompt.length + (systemPrompt?.length || 0)) / 4);
    const outputTokens = Math.ceil((data.response?.length || 0) / 4);
    this.trackCost('qwen2.5:14b-instruct-q6_K', inputTokens, outputTokens, 'ollama');

    return {
      backend: 'ollama',
      response: data.response || '',
      latencyMs: Date.now() - start,
      model: 'qwen2.5:14b-instruct-q6_K',
      tier: 'ollama',
    };
  }

  private async callSonnet(prompt: string, systemPrompt: string | undefined, ctx: SkillContext): Promise<LLMResponse> {
    if (this.anthropicKey) {
      const start = Date.now();
      const body: Record<string, unknown> = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      };
      if (systemPrompt) body.system = systemPrompt;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body),
      });

      const data = await response.json() as { content?: Array<{ text?: string }>; error?: { message: string }; usage?: { input_tokens: number; output_tokens: number } };
      if (data.error) throw new Error(data.error.message);

      // Track cost
      if (data.usage) {
        this.trackCost('claude-sonnet-4-20250514', data.usage.input_tokens, data.usage.output_tokens, 'anthropic-api');
      }

      return {
        backend: 'sonnet',
        response: data.content?.[0]?.text || '',
        latencyMs: Date.now() - start,
        model: 'claude-sonnet-4-20250514',
        tier: 'sonnet',
      };
    }

    const start = Date.now();
    const escaped = prompt.replace(/'/g, "'\\''");
    const result = await ctx.shell.exec(`unset CLAUDECODE && claude -p '${escaped}' --max-turns 1 2>&1`);

    return {
      backend: 'claude-cli',
      response: result.stdout || result.stderr,
      latencyMs: Date.now() - start,
      model: 'claude-cli-oauth',
      tier: 'sonnet',
    };
  }
}
