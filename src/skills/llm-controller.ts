/**
 * src/skills/llm-controller.ts — Multi-LLM Controller
 *
 * Ported from thetadrivencoach/openclaw/skills/llm-controller.ts
 *
 * Backends:
 *   - Whisper (local, fastest, free)
 *   - Ollama llama3.2:1b (local, fast categorization)
 *   - Claude Sonnet (API or CLI, transcription + reasoning)
 */

import type { AgentSkill, SkillContext, SkillResult } from '../types.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

interface LLMRequest {
  prompt: string;
  backend?: 'ollama' | 'sonnet' | 'both';
  audioUrl?: string;
  systemPrompt?: string;
}

interface LLMResponse {
  backend: string;
  response: string;
  latencyMs: number;
  model: string;
}

export default class LLMControllerSkill implements AgentSkill {
  name = 'llm-controller';
  description = 'Multi-LLM controller: Whisper + Ollama + Claude Sonnet';

  private ollamaEndpoint = 'http://localhost:11434';
  private anthropicKey = '';
  private rootDir = process.cwd();

  async initialize(ctx: SkillContext): Promise<void> {
    this.ollamaEndpoint = (ctx.config.get('integrations.ollama.endpoint') as string)
      || process.env.OLLAMA_ENDPOINT
      || 'http://localhost:11434';

    this.anthropicKey = process.env.ANTHROPIC_API_KEY || '';

    ctx.log.info(`LLMController initialized (ollama: ${this.ollamaEndpoint}, anthropic: ${this.anthropicKey ? 'configured' : 'will use CLI'})`);
  }

  async execute(command: unknown, ctx: SkillContext): Promise<SkillResult> {
    const req = command as LLMRequest;

    if (req.audioUrl) return this.transcribe(req, ctx);

    const backend = req.backend || 'sonnet';
    if (backend === 'both') return this.runBoth(req, ctx);
    if (backend === 'ollama') return this.runOllama(req, ctx);
    return this.runSonnet(req, ctx);
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

    const data = await response.json() as { content?: Array<{ text?: string }>; error?: { message: string } };
    if (data.error) throw new Error(data.error.message);

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
    const body: Record<string, unknown> = { model: 'llama3.2:1b', prompt, stream: false };
    if (systemPrompt) body.system = systemPrompt;

    const response = await ctx.http.post(`${this.ollamaEndpoint}/api/generate`, body);
    return {
      backend: 'ollama',
      response: (response as { response?: string }).response || '',
      latencyMs: Date.now() - start,
      model: 'llama3.2:1b',
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

      const data = await response.json() as { content?: Array<{ text?: string }>; error?: { message: string } };
      if (data.error) throw new Error(data.error.message);

      return { backend: 'sonnet', response: data.content?.[0]?.text || '', latencyMs: Date.now() - start, model: 'claude-sonnet-4-20250514' };
    }

    const start = Date.now();
    const escaped = prompt.replace(/'/g, "'\\''");
    const result = await ctx.shell.exec(`unset CLAUDECODE && claude -p '${escaped}' --max-turns 1 2>&1`);
    return { backend: 'claude-cli', response: result.stdout || result.stderr, latencyMs: Date.now() - start, model: 'claude-cli-oauth' };
  }
}
