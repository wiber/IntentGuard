/**
 * 09-repo-split.tsx — What Stays Where
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Defines the boundary between thetadrivencoach and intentguard.
 * DEPENDS ON: Nothing
 * EDITED BY: Architect agent
 */

export const SECTION_ID = '09-repo-split';
export const SECTION_TITLE = 'Repo Split Guide';

export interface RepoItem {
  text: string;
  status: 'done' | 'wip' | 'todo';
}

/**
 * REPO STRUCTURE (corrected 2026-02-14):
 *   thetadrivencoach = SOURCE REPO (Next.js app, blog, book, tesseract UI, FIM artifacts)
 *   intentguard      = RUNTIME REPO (OpenClaw gateway, Discord bot, Sovereign Engine — will be public)
 *
 * The source repo stays private. IntentGuard is where the Headless CEO runs.
 */

export const thetadrivencoach: RepoItem[] = [
  { text: 'Next.js app (src/app/) — thetadriven.com', status: 'done' },
  { text: 'Blog posts (src/content/blog/) — 267 posts', status: 'done' },
  { text: 'Book chapters (public/book/) — Tesseract Physics', status: 'done' },
  { text: 'Tesseract grid UI (src/app/tesseract/) — tesseract.nu', status: 'done' },
  { text: 'MCPHeraldicCrest component', status: 'done' },
  { text: 'Vercel deployment (auto-deploy on push)', status: 'done' },
  { text: 'MDX validation scripts', status: 'done' },
  { text: 'build-book-html.sh', status: 'done' },
  { text: 'FIM artifact generation (3D printing scripts)', status: 'done' },
  { text: 'Static .workflow/ room HTML pages', status: 'done' },
  { text: 'CRM MCP server (thetacoach-crm-mcp npm)', status: 'done' },
  { text: 'MCP init scripts (103 tools)', status: 'done' },
];

export const intentguard: RepoItem[] = [
  { text: 'OpenClaw gateway (npm dep, child process)', status: 'done' },
  { text: 'IntentGuard wrapper.ts (Cortex+Body unified entry)', status: 'done' },
  { text: 'FIM geometric auth layer (20-dim, 0.0004ms overlap)', status: 'done' },
  { text: 'Trust-Debt Pipeline (8 steps, JSONL persistence)', status: 'done' },
  { text: 'Discord bot (9 cognitive rooms + #x-posts + #ops-board)', status: 'done' },
  { text: 'Voice memo reactor (Whisper transcription)', status: 'done' },
  { text: 'Claude Flow bridge (headless dispatch)', status: 'done' },
  { text: 'Steering loop (Ask-and-Predict protocol)', status: 'done' },
  { text: 'Tweet composer + X-poster (browser automation)', status: 'done' },
  { text: 'CEO loop v2 (always-on, auto-subdivide, circuit breaker)', status: 'done' },
  { text: 'Night Shift scheduler (Ghost User proactive injection)', status: 'done' },
  { text: 'LLM controller (Whisper + Ollama + Sonnet 3-tier)', status: 'done' },
  { text: 'ThetaSteer categorize (20 trust-debt dimensions)', status: 'done' },
  { text: 'Wallet skill (balance tracking skeleton)', status: 'done' },
  { text: 'Artifact generator skill (FIM → 3D mesh)', status: 'done' },
  { text: 'Federation handshake (bot-to-bot trust)', status: 'done' },
  { text: 'Grid state reader/writer (tesseract.nu bridge)', status: 'done' },
  { text: 'WhatsApp adapter skeleton', status: 'done' },
  { text: 'Telegram adapter skeleton', status: 'done' },
  { text: 'Multi-channel wiring to channel-manager', status: 'wip' },
  { text: 'Claude Flow agent pool (50 concurrent)', status: 'todo' },
  { text: 'Always-on daemon (launchd plist)', status: 'done' },
];
