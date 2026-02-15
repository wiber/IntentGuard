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
import net from 'net';

/**
 * 8-tier color confidence system
 * - GREEN (0.9-1.0): Highest confidence, autonomous execution
 * - CYAN (0.8-0.9): Very high confidence, minimal validation
 * - TEAL (0.7-0.8): High confidence, local LLM handles
 * - AMBER (0.6-0.7): Moderate confidence, lightweight review
 * - PURPLE (0.5-0.6): Medium confidence, validation recommended
 * - RED (0.3-0.5): Low confidence, human validation required
 * - INDIGO (0.2-0.3): Very low confidence, escalate to Claude
 * - BLUE (0.0-0.2): Uncertain, requires human judgment
 */
type ColorTier = 'GREEN' | 'CYAN' | 'TEAL' | 'AMBER' | 'PURPLE' | 'RED' | 'INDIGO' | 'BLUE';

interface CategorizationResult {
  row: string;
  col: string;
  tile_id: string;
  full_notation: string;
  semantic_question: string;
  confidence: number;
  tier: ColorTier;
  hardness: number;
  target_model: 'ollama' | 'sonnet' | 'opus';
  target_room: string;
  reasoning: string;
  trustDimensions?: string[];
}

/**
 * Extended 20-category system building on original 12-cell tesseract
 * Added 8 new categories for comprehensive coverage:
 * - D1 (Risk): Risk management, security assessment
 * - D2 (Scale): Scalability, growth, capacity
 * - D3 (Quality): Quality assurance, standards, excellence
 * - E1 (Learn): Learning, training, knowledge management
 * - E2 (Culture): Team culture, values, morale
 * - E3 (Innovation): R&D, experimentation, innovation
 * - F1 (Metrics): Analytics, KPIs, measurement
 * - F2 (Governance): Policies, procedures, compliance framework
 */
const CATEGORIES = [
  // Original 12 categories (Strategy, Tactics, Operations)
  { id: 'A', name: 'Strategy', emoji: '🏛️', tier: 'strategic' },
  { id: 'B', name: 'Tactics', emoji: '⚡', tier: 'tactical' },
  { id: 'C', name: 'Operations', emoji: '🔧', tier: 'operational' },
  { id: 'A1', name: 'Law', emoji: '⚖️', tier: 'strategic' },
  { id: 'A2', name: 'Goal', emoji: '🎯', tier: 'strategic' },
  { id: 'A3', name: 'Fund', emoji: '💰', tier: 'strategic' },
  { id: 'B1', name: 'Speed', emoji: '🏎️', tier: 'tactical' },
  { id: 'B2', name: 'Deal', emoji: '🤝', tier: 'tactical' },
  { id: 'B3', name: 'Signal', emoji: '📡', tier: 'tactical' },
  { id: 'C1', name: 'Grid', emoji: '🔌', tier: 'operational' },
  { id: 'C2', name: 'Loop', emoji: '🔄', tier: 'operational' },
  { id: 'C3', name: 'Flow', emoji: '🌊', tier: 'operational' },

  // Extended 8 categories (Risk, Scale, Quality, Learn, Culture, Innovation, Metrics, Governance)
  { id: 'D1', name: 'Risk', emoji: '🛡️', tier: 'defensive' },
  { id: 'D2', name: 'Scale', emoji: '📈', tier: 'growth' },
  { id: 'D3', name: 'Quality', emoji: '✨', tier: 'excellence' },
  { id: 'E1', name: 'Learn', emoji: '📚', tier: 'development' },
  { id: 'E2', name: 'Culture', emoji: '🌱', tier: 'people' },
  { id: 'E3', name: 'Innovation', emoji: '💡', tier: 'creative' },
  { id: 'F1', name: 'Metrics', emoji: '📊', tier: 'analytical' },
  { id: 'F2', name: 'Governance', emoji: '📜', tier: 'framework' },
];

/** Map tesseract cells to trust-debt dimensions (extended to 20 categories) */
const CELL_TO_TRUST: Record<string, string[]> = {
  // Original 12
  A1: ['compliance', 'ethical_alignment', 'accountability'],
  A2: ['risk_assessment', 'domain_expertise', 'innovation'],
  A3: ['resource_efficiency', 'accountability', 'transparency'],
  B1: ['time_management', 'reliability', 'adaptability'],
  B2: ['communication', 'collaboration', 'user_focus'],
  B3: ['communication', 'transparency', 'innovation'],
  C1: ['security', 'reliability', 'data_integrity'],
  C2: ['testing', 'process_adherence', 'code_quality'],
  C3: ['adaptability', 'resource_efficiency', 'documentation'],

  // Extended 8
  D1: ['security', 'risk_assessment', 'reliability'],
  D2: ['resource_efficiency', 'reliability', 'innovation'],
  D3: ['code_quality', 'testing', 'documentation'],
  E1: ['domain_expertise', 'documentation', 'knowledge_sharing'],
  E2: ['collaboration', 'communication', 'ethical_alignment'],
  E3: ['innovation', 'creativity', 'adaptability'],
  F1: ['transparency', 'accountability', 'data_integrity'],
  F2: ['compliance', 'process_adherence', 'accountability'],
};

/**
 * Full axis notation for all 20 categories
 */
const AXIS_NOTATION: Record<string, { emoji: string; prefix: string; fullname: string }> = {
  // Original 12
  'A':  { emoji: '🏛️',  prefix: 'A',  fullname: 'Strategy' },
  'B':  { emoji: '⚡', prefix: 'B',  fullname: 'Tactics' },
  'C':  { emoji: '🔧', prefix: 'C',  fullname: 'Operations' },
  'A1': { emoji: '⚖️',  prefix: 'A1', fullname: 'Strategy.Law' },
  'A2': { emoji: '🎯', prefix: 'A2', fullname: 'Strategy.Goal' },
  'A3': { emoji: '💰', prefix: 'A3', fullname: 'Strategy.Fund' },
  'B1': { emoji: '🏎️',  prefix: 'B1', fullname: 'Tactics.Speed' },
  'B2': { emoji: '🤝', prefix: 'B2', fullname: 'Tactics.Deal' },
  'B3': { emoji: '📡', prefix: 'B3', fullname: 'Tactics.Signal' },
  'C1': { emoji: '🔌', prefix: 'C1', fullname: 'Operations.Grid' },
  'C2': { emoji: '🔄', prefix: 'C2', fullname: 'Operations.Loop' },
  'C3': { emoji: '🌊', prefix: 'C3', fullname: 'Operations.Flow' },

  // Extended 8
  'D1': { emoji: '🛡️', prefix: 'D1', fullname: 'Risk.Security' },
  'D2': { emoji: '📈', prefix: 'D2', fullname: 'Scale.Growth' },
  'D3': { emoji: '✨', prefix: 'D3', fullname: 'Quality.Excellence' },
  'E1': { emoji: '📚', prefix: 'E1', fullname: 'Learn.Knowledge' },
  'E2': { emoji: '🌱', prefix: 'E2', fullname: 'Culture.People' },
  'E3': { emoji: '💡', prefix: 'E3', fullname: 'Innovation.Creative' },
  'F1': { emoji: '📊', prefix: 'F1', fullname: 'Metrics.Analytics' },
  'F2': { emoji: '📜', prefix: 'F2', fullname: 'Governance.Framework' },
};

/**
 * Map categories to cognitive rooms (extended)
 */
const TILE_TO_ROOM: Record<string, string> = {
  'A':  'architect',
  'B':  'navigator',
  'C':  'builder',
  'A1': 'vault',
  'A2': 'architect',
  'A3': 'performer',
  'B1': 'navigator',
  'B2': 'network',
  'B3': 'voice',
  'C1': 'builder',
  'C2': 'laboratory',
  'C3': 'operator',
  'D1': 'vault',        // Risk → vault (security focus)
  'D2': 'architect',    // Scale → architect (planning focus)
  'D3': 'laboratory',   // Quality → laboratory (testing focus)
  'E1': 'operator',     // Learn → operator (knowledge ops)
  'E2': 'voice',        // Culture → voice (communication focus)
  'E3': 'navigator',    // Innovation → navigator (exploration focus)
  'F1': 'builder',      // Metrics → builder (measurement infra)
  'F2': 'vault',        // Governance → vault (compliance focus)
};

/**
 * Determine color tier from confidence score (8-tier system)
 */
function confidenceToTier(confidence: number): ColorTier {
  if (confidence >= 0.9) return 'GREEN';
  if (confidence >= 0.8) return 'CYAN';
  if (confidence >= 0.7) return 'TEAL';
  if (confidence >= 0.6) return 'AMBER';
  if (confidence >= 0.5) return 'PURPLE';
  if (confidence >= 0.3) return 'RED';
  if (confidence >= 0.2) return 'INDIGO';
  return 'BLUE';
}

/**
 * ThetaSteer Categorization Skill with 20-category support
 */
export default class ThetaSteerCategorizeSkill implements AgentSkill {
  name = 'thetasteer-categorize';
  description = 'Categorize content into 20-category grid with 8-tier color confidence';

  private thetaSteerSocket = '/tmp/theta-steer.sock';
  private ollamaEndpoint = 'http://localhost:11434';

  async initialize(ctx: SkillContext): Promise<void> {
    const socket = ctx.config.get('integrations.thetaSteer.socket') as string;
    if (socket) this.thetaSteerSocket = socket;
    ctx.log.info('ThetaSteerCategorize initialized (20-category + 8-tier system)');
  }

  /**
   * Categorize text with full notation, hardness, and 8-tier confidence
   */
  async categorize(text: string, ctx: SkillContext): Promise<SkillResult> {
    ctx.log.info(`Categorizing: "${text.substring(0, 50)}..."`);

    let baseResult: CategorizationResult;

    // Try ThetaSteer daemon first
    try {
      baseResult = await this.callThetaSteer(text, ctx);
    } catch (error) {
      ctx.log.warn(`ThetaSteer unavailable: ${error}, falling back to Ollama`);

      // Fallback to Ollama
      try {
        baseResult = await this.callOllama(text, ctx);
      } catch (ollamaError) {
        ctx.log.error(`Categorization failed: ${ollamaError}`);
        return {
          success: false,
          message: `Categorization failed: ${ollamaError}`,
          data: this.defaultCategory(text),
        };
      }
    }

    // Estimate hardness via Ollama
    try {
      const hardnessResult = await this.estimateHardness(text, baseResult, ctx);
      baseResult.hardness = hardnessResult.hardness;
      baseResult.target_model = hardnessResult.target_model;
    } catch (error) {
      ctx.log.warn(`Hardness estimation failed: ${error}, defaulting to sonnet`);
      baseResult.hardness = 3;
      baseResult.target_model = 'sonnet';
    }

    ctx.log.info(`Categorized: ${baseResult.full_notation} | ${baseResult.tier} | H${baseResult.hardness} → ${baseResult.target_model}`);

    return {
      success: true,
      message: `${baseResult.full_notation} | ${baseResult.tier} | H${baseResult.hardness} → ${baseResult.target_model}`,
      data: baseResult,
    };
  }

  /**
   * Format row:col into full emoji notation
   */
  private formatFullNotation(row: string, col: string): string {
    const rowAxis = AXIS_NOTATION[row] || AXIS_NOTATION['C'];
    const colAxis = AXIS_NOTATION[col] || AXIS_NOTATION['C1'];
    return `${rowAxis.emoji} ${rowAxis.prefix} ${rowAxis.fullname} : ${colAxis.emoji} ${colAxis.prefix} ${colAxis.fullname}`;
  }

  /**
   * Generate semantic question for intersection
   */
  private formatSemanticQuestion(row: string, col: string): string {
    const rowAxis = AXIS_NOTATION[row] || AXIS_NOTATION['C'];
    const colAxis = AXIS_NOTATION[col] || AXIS_NOTATION['C1'];

    if (row === col) {
      const shortName = rowAxis.fullname.split('.').pop() || rowAxis.fullname;
      return `What is the essence of ${shortName}?`;
    }

    const rowShort = rowAxis.fullname.split('.').pop() || rowAxis.fullname;
    const colShort = colAxis.fullname.split('.').pop() || colAxis.fullname;
    return `What does ${rowShort} mean in ${colShort}?`;
  }

  /**
   * Estimate task hardness 1-5
   */
  private async estimateHardness(
    text: string,
    category: CategorizationResult,
    ctx: SkillContext
  ): Promise<{ hardness: number; target_model: 'ollama' | 'sonnet' | 'opus' }> {
    const prompt = `OUTPUT ONLY JSON. Score this task's difficulty 1-5.

1 = Simple lookup/question (who, what, where)
2 = Straightforward action (rename, move, format)
3 = Multi-step task (implement feature, write content)
4 = Complex reasoning (architecture, debugging, strategy)
5 = Novel/creative/cross-domain (research, invention, proofs)

Category: ${category.full_notation}
Task: "${text.substring(0, 300)}"

RESPOND: {"hardness":3,"reasoning":"why"}`;

    const response = await ctx.http.post(`${this.ollamaEndpoint}/api/generate`, {
      model: 'llama3.2:1b',
      prompt,
      stream: false,
      format: 'json',
    }) as { response?: string };

    const parsed = JSON.parse(response.response || '{"hardness":3}');
    const hardness = Math.min(5, Math.max(1, typeof parsed.hardness === 'number' ? parsed.hardness : 3));

    let target_model: 'ollama' | 'sonnet' | 'opus';
    if (hardness <= 2) target_model = 'ollama';
    else if (hardness <= 4) target_model = 'sonnet';
    else target_model = 'opus';

    return { hardness, target_model };
  }

  /**
   * Call ThetaSteer daemon via Unix socket
   */
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

  /**
   * Call Ollama for categorization with 20-category awareness
   */
  private async callOllama(text: string, ctx: SkillContext): Promise<CategorizationResult> {
    const prompt = `OUTPUT ONLY JSON. NO prose, NO markdown, NO explanation.

You are categorizing content into a 20-category grid for priority management.

Categories:
- A (Strategy), B (Tactics), C (Operations)
- A1 (Law), A2 (Goal), A3 (Fund)
- B1 (Speed), B2 (Deal), B3 (Signal)
- C1 (Grid), C2 (Loop), C3 (Flow)
- D1 (Risk), D2 (Scale), D3 (Quality)
- E1 (Learn), E2 (Culture), E3 (Innovation)
- F1 (Metrics), F2 (Governance)

Confidence scoring (8-tier):
- 0.9-1.0 = GREEN (highest)
- 0.8-0.9 = CYAN
- 0.7-0.8 = TEAL
- 0.6-0.7 = AMBER
- 0.5-0.6 = PURPLE
- 0.3-0.5 = RED
- 0.2-0.3 = INDIGO
- 0.0-0.2 = BLUE (lowest)

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

  /**
   * Format raw result into consistent structure
   */
  private formatResult(raw: Record<string, unknown>): CategorizationResult {
    const rawRow = typeof raw.row === 'string' ? raw.row : 'C';
    const rawCol = typeof raw.col === 'string' ? raw.col : 'C1';
    const row = rawRow.replace(/[^A-Z0-9]/gi, '').substring(0, 2) || 'C';
    const col = rawCol.replace(/[^A-Z0-9]/gi, '').substring(0, 2) || 'C1';
    const confidence = typeof raw.confidence === 'number' ? raw.confidence : 0.5;

    // Validate against known axes
    const validRow = AXIS_NOTATION[row] ? row : 'C';
    const validCol = AXIS_NOTATION[col] ? col : 'C1';

    const tier = confidenceToTier(confidence);
    const tile_id = `${validRow}:${validCol}`;
    const trustDimensions = CELL_TO_TRUST[validCol] || CELL_TO_TRUST['C1'];

    return {
      row: validRow,
      col: validCol,
      tile_id,
      full_notation: this.formatFullNotation(validRow, validCol),
      semantic_question: this.formatSemanticQuestion(validRow, validCol),
      confidence,
      tier,
      hardness: 3,
      target_model: 'sonnet',
      target_room: TILE_TO_ROOM[validRow] || 'builder',
      reasoning: (raw.reasoning as string) || 'Auto-categorized',
      trustDimensions,
    };
  }

  /**
   * Default category when all else fails
   */
  private defaultCategory(text: string): CategorizationResult {
    return {
      row: 'C',
      col: 'C1',
      tile_id: 'C:C1',
      full_notation: this.formatFullNotation('C', 'C1'),
      semantic_question: this.formatSemanticQuestion('C', 'C1'),
      confidence: 0.1,
      tier: 'BLUE',
      hardness: 3,
      target_model: 'sonnet',
      target_room: 'builder',
      reasoning: `Fallback categorization for: ${text.substring(0, 50)}...`,
      trustDimensions: ['security', 'reliability', 'data_integrity'],
    };
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<SkillResult> {
    return { success: true, message: 'Categories retrieved', data: CATEGORIES };
  }
}
