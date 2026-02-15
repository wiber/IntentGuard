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

export const thetadrivencoach: RepoItem[] = [
  { text: 'Next.js app (src/app/)', status: 'done' },
  { text: 'Blog posts (src/content/blog/)', status: 'done' },
  { text: 'Book chapters (public/book/)', status: 'done' },
  { text: 'Tesseract grid UI (src/app/tesseract/)', status: 'done' },
  { text: 'MCPHeraldicCrest component', status: 'done' },
  { text: 'Vercel deployment', status: 'done' },
  { text: 'MDX validation scripts', status: 'done' },
  { text: 'build-book-html.sh', status: 'done' },
  { text: 'FIM artifact generation (3D printing)', status: 'done' },
  { text: 'Static .workflow/ room HTML pages', status: 'done' },
];

export const intentguard: RepoItem[] = [
  { text: 'Trust-Debt Pipeline (8 steps)', status: 'done' },
  { text: 'OpenClaw gateway (npm dep)', status: 'done' },
  { text: 'IntentGuard wrapper (parent process)', status: 'wip' },
  { text: 'FIM geometric auth layer', status: 'wip' },
  { text: 'Discord bot (cognitive rooms)', status: 'todo' },
  { text: 'Voice memo pipeline', status: 'todo' },
  { text: 'Claude Flow bridge', status: 'todo' },
  { text: 'CRM MCP proxy', status: 'todo' },
  { text: 'Battle cards as OpenClaw skills', status: 'todo' },
  { text: 'Overnight report generator', status: 'todo' },
  { text: 'Multi-channel adapters', status: 'todo' },
  { text: 'Always-on daemon config', status: 'todo' },
];
