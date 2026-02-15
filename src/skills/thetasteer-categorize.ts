/**
 * src/skills/thetasteer-categorize.ts — ThetaSteer Categorizer
 *
 * Ported from thetadrivencoach/openclaw/skills/thetasteer-categorize.ts
 * Now also maps to 20-dimensional trust-debt vector for IAMFIM.
 *
 * Backends:
 *   1. ThetaSteer Rust daemon (Unix socket, <50ms)
 *   2. Ollama llama3.2:1b (local, <200ms)
 *   3. Fallback: keyword heuristic
 *
 * Categories: 12-cell tesseract grid
 * Trust mapping: Each cell maps to 2-3 trust-debt dimensions
 */

import type { AgentSkill, SkillContext, SkillResult } from '../types.js';
import net from 'net';

interface CategorizationResult {
  row: string;
  col: string;
  tile_id: string;
  confidence: number;
  tier: 'GREEN' | 'RED' | 'BLUE';
  reasoning: string;
  trustDimensions?: string[];
}

const CATEGORIES = [
  { id: 'A', name: 'Strategy', emoji: '🏛️' },
  { id: 'B', name: 'Tactics', emoji: '⚡' },
  { id: 'C', name: 'Operations', emoji: '🔧' },
  { id: 'A1', name: 'Law', emoji: '⚖️' },
  { id: 'A2', name: 'Goal', emoji: '🎯' },
  { id: 'A3', name: 'Fund', emoji: '💰' },
  { id: 'B1', name: 'Speed', emoji: '🏎️' },
  { id: 'B2', name: 'Deal', emoji: '🤝' },
  { id: 'B3', name: 'Signal', emoji: '📡' },
  { id: 'C1', name: 'Grid', emoji: '🔌' },
  { id: 'C2', name: 'Loop', emoji: '🔄' },
  { id: 'C3', name: 'Flow', emoji: '🌊' },
];

/** Map tesseract cells to trust-debt dimensions */
const CELL_TO_TRUST: Record<string, string[]> = {
  A1: ['compliance', 'ethical_alignment', 'accountability'],
  A2: ['risk_assessment', 'domain_expertise', 'innovation'],
  A3: ['resource_efficiency', 'accountability', 'transparency'],
  B1: ['time_management', 'reliability', 'adaptability'],
  B2: ['communication', 'collaboration', 'user_focus'],
  B3: ['communication', 'transparency', 'innovation'],
  C1: ['security', 'reliability', 'data_integrity'],
  C2: ['testing', 'process_adherence', 'code_quality'],
  C3: ['adaptability', 'resource_efficiency', 'documentation'],
};

export default class ThetaSteerCategorizeSkill implements AgentSkill {
  name = 'thetasteer-categorize';
  description = 'Categorize content into tesseract grid + trust-debt dimensions';

  private thetaSteerSocket = '/tmp/theta-steer.sock';
  private ollamaEndpoint = 'http://localhost:11434';

  async initialize(ctx: SkillContext): Promise<void> {
    const socket = ctx.config.get('integrations.thetaSteer.socket') as string;
    if (socket) this.thetaSteerSocket = socket;
    ctx.log.info('ThetaSteerCategorize initialized (IAMFIM-enabled)');
  }

  async categorize(text: string, ctx: SkillContext): Promise<SkillResult> {
    ctx.log.info(`Categorizing: "${text.substring(0, 50)}..."`);

    // Try ThetaSteer daemon first
    try {
      const result = await this.callThetaSteer(text, ctx);
      return { success: true, message: 'Categorized via ThetaSteer', data: result };
    } catch {
      ctx.log.warn('ThetaSteer unavailable, falling back to Ollama');
    }

    // Fallback to Ollama
    try {
      const result = await this.callOllama(text, ctx);
      return { success: true, message: 'Categorized via Ollama', data: result };
    } catch {
      ctx.log.warn('Ollama unavailable, using heuristic fallback');
      return { success: true, message: 'Categorized via heuristic', data: this.defaultCategory(text) };
    }
  }

  private async callThetaSteer(text: string, ctx: SkillContext): Promise<CategorizationResult> {
    return new Promise((resolve, reject) => {
      const client = net.createConnection(this.thetaSteerSocket);
      const request = { command: 'categorize', text: text.substring(0, 500) };

      client.on('connect', () => client.write(JSON.stringify(request) + '\n'));
      client.on('data', (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.error) reject(new Error(response.error));
          else resolve(this.formatResult(response));
        } catch (e) { reject(e); }
        finally { client.end(); }
      });
      client.on('error', reject);
      setTimeout(() => { client.end(); reject(new Error('ThetaSteer timeout')); }, 10000);
    });
  }

  private async callOllama(text: string, ctx: SkillContext): Promise<CategorizationResult> {
    const prompt = `OUTPUT ONLY JSON. NO prose, NO markdown, NO explanation.

You are categorizing content into a 12-category grid for priority management.

Categories:
- A (Strategy): Long-term direction, vision
- B (Tactics): Medium-term execution, sprints
- C (Operations): Day-to-day, immediate
- A1 (Law): Legal, compliance, contracts
- A2 (Goal): OKRs, objectives, north stars
- A3 (Fund): Finance, investment, budget
- B1 (Speed): Velocity, shipping, deadlines
- B2 (Deal): Sales, partnerships, negotiations
- B3 (Signal): Marketing, communication, brand
- C1 (Grid): Infrastructure, systems, DevOps
- C2 (Loop): Feedback, iteration, testing
- C3 (Flow): Workflows, processes, automation

Content to categorize:
"${text.substring(0, 500)}"

RESPOND WITH EXACTLY THIS JSON:
{"row":"A","col":"A2","confidence":0.85,"reasoning":"Strategic goal-setting content"}`;

    const response = await ctx.http.post(`${this.ollamaEndpoint}/api/generate`, {
      model: 'llama3.2:1b',
      prompt,
      stream: false,
      format: 'json',
    }) as { response?: string };

    const parsed = JSON.parse(response.response || '{}');
    return this.formatResult(parsed);
  }

  private formatResult(raw: Record<string, unknown>): CategorizationResult {
    const rawRow = typeof raw.row === 'string' ? raw.row : 'C';
    const rawCol = typeof raw.col === 'string' ? raw.col : 'C1';
    const row = rawRow.replace(/[^A-Z]/gi, '').substring(0, 1) || 'C';
    const col = rawCol.replace(/[^A-Z0-9]/gi, '').substring(0, 2) || 'C1';
    const confidence = typeof raw.confidence === 'number' ? raw.confidence : 0.5;

    const tier: 'GREEN' | 'RED' | 'BLUE' =
      confidence >= 0.7 ? 'GREEN' : confidence >= 0.3 ? 'RED' : 'BLUE';

    const tile_id = `${row}:${col}`;
    const trustDimensions = CELL_TO_TRUST[col] || CELL_TO_TRUST['C1'];

    return {
      row, col, tile_id, confidence, tier,
      reasoning: (raw.reasoning as string) || 'Auto-categorized',
      trustDimensions,
    };
  }

  private defaultCategory(text: string): CategorizationResult {
    return {
      row: 'C', col: 'C1', tile_id: 'C:C1', confidence: 0.1, tier: 'BLUE',
      reasoning: `Fallback categorization for: ${text.substring(0, 50)}...`,
      trustDimensions: ['security', 'reliability', 'data_integrity'],
    };
  }

  async getCategories(): Promise<SkillResult> {
    return { success: true, message: 'Categories retrieved', data: CATEGORIES };
  }
}
