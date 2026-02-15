/**
 * 00-hero.tsx — IntentGuard Migration Spec Hero Section
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Top of page. Shows project name, version, live status indicators.
 * DEPENDS ON: Nothing
 * EDITED BY: Any agent (low risk)
 */

export const SECTION_ID = '00-hero';
export const SECTION_TITLE = 'IntentGuard — Headless CEO';

export interface HeroProps {
  openclawVersion: string;
  nodeVersion: string;
  statuses: Array<{ label: string; state: 'live' | 'building' | 'planned' }>;
}

export function HeroSection({ openclawVersion, nodeVersion, statuses }: HeroProps) {
  return `
    <div class="hero">
      <h1>🛡️ IntentGuard — Headless CEO</h1>
      <div class="subtitle">Migration Spec: ThetaDriven Intelligence → IntentGuard Bot CEO</div>
      <div class="version">v2.5.0 — Modular TSX Spec (27 sections) | OpenClaw ${openclawVersion} | Node ${nodeVersion} | Mac Mini (Always-On)</div>
      <div class="status-bar">
        ${statuses.map(s => `
          <div class="status-item">
            <div class="dot ${s.state}"></div> ${s.label}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export const defaultProps: HeroProps = {
  openclawVersion: '2026.2.13',
  nodeVersion: '24.13.1',
  statuses: [
    { label: 'OpenClaw Gateway (54 skills)', state: 'live' },
    { label: 'Sonnet 4 via Proxy ($0)', state: 'live' },
    { label: 'Discord Bot (Tesseract)', state: 'live' },
    { label: 'Claude Flow v3 (90 MCP)', state: 'live' },
    { label: '3 launchd Services', state: 'live' },
    { label: 'CEO/Dev Subdivision', state: 'building' },
  ],
};
