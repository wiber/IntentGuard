/**
 * 07-skills-inventory.tsx — Skills to Migrate from ThetaDriven
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Inventory of all skills that need to move to IntentGuard.
 * DEPENDS ON: Nothing
 * EDITED BY: Builder agent (updates as skills are ported)
 */

export const SECTION_ID = '07-skills-inventory';
export const SECTION_TITLE = 'Skills Inventory';

export type SkillMigrationStatus = 'ported' | 'converting' | 'pending' | 'keep-as-mcp' | 'low-priority';

export interface SkillEntry {
  name: string;
  source: string;
  description: string;
  migrationStatus: SkillMigrationStatus;
  migrationNotes: string;
  linesOfCode: number;
}

export const skills: SkillEntry[] = [
  {
    name: 'voice-memo-reactor',
    source: 'openclaw/skills/voice-memo-reactor.ts',
    description: 'Detects Discord voice memos, downloads audio, FFmpeg transcoding, transcription (Whisper→Anthropic→Claude CLI cascade), categorization, corpus storage.',
    migrationStatus: 'pending',
    migrationNotes: 'Convert to OpenClaw skill format. Voice pipeline is the core UX.',
    linesOfCode: 228,
  },
  {
    name: 'claude-flow-bridge',
    source: 'openclaw/skills/claude-flow-bridge.ts',
    description: 'Bidirectional Claude Code ↔ Discord. 9 terminal configs, IPC dispatch, STDIN forwarding, background processes, output capture.',
    migrationStatus: 'converting',
    migrationNotes: 'Core orchestration. Wrap as MCP proxy. Most complex skill.',
    linesOfCode: 500, // estimated
  },
  {
    name: 'llm-controller',
    source: 'openclaw/skills/llm-controller.ts',
    description: 'Multi-model routing: Whisper → Anthropic API → Claude CLI. Transcription + generation backends.',
    migrationStatus: 'pending',
    migrationNotes: 'OpenClaw has native model router. Evaluate overlap before porting.',
    linesOfCode: 300, // estimated
  },
  {
    name: 'system-control',
    source: 'openclaw/skills/system-control.ts',
    description: 'macOS native: mouse, keyboard, screen capture, browser tabs, app management, clipboard.',
    migrationStatus: 'pending',
    migrationNotes: 'Map to OpenClaw daemon capabilities. macOS-only.',
    linesOfCode: 400, // estimated
  },
  {
    name: 'tesseract-trainer',
    source: 'openclaw/skills/tesseract-trainer.ts',
    description: 'Feed attention signals into geometric IAM training corpus. 12-category grid, emoji weighting, Supabase pointers.',
    migrationStatus: 'pending',
    migrationNotes: 'Keep as standalone module. Connect via MCP.',
    linesOfCode: 200, // estimated
  },
  {
    name: 'thetasteer-categorize',
    source: 'openclaw/skills/thetasteer-categorize.ts',
    description: 'Map content to 12-category tesseract grid. Cascading backends: ThetaSteer daemon → Ollama → fallback.',
    migrationStatus: 'pending',
    migrationNotes: 'Keep as standalone. Confidence tiers: GREEN/RED/BLUE.',
    linesOfCode: 150, // estimated
  },
  {
    name: 'CRM tools (8)',
    source: 'packages/crm-mcp/src/',
    description: 'Lead management, battle cards, Challenger methodology. Supabase backend.',
    migrationStatus: 'keep-as-mcp',
    migrationNotes: 'Already works as MCP server. Connect via proxy, do not rewrite.',
    linesOfCode: 800, // estimated
  },
  {
    name: 'Book Revisions (3)',
    source: 'packages/book-revisions-mcp/src/',
    description: 'Track editorial changes, mark applied, generate reports.',
    migrationStatus: 'low-priority',
    migrationNotes: 'Low value for bot CEO. Migrate last.',
    linesOfCode: 200, // estimated
  },
];
