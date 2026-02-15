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
      <div class="version">v2.0.0 — Modular TSX Spec (15 sections) | OpenClaw ${openclawVersion} | Node ${nodeVersion} | Mac Mini (Always-On)</div>
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
    { label: 'OpenClaw Installed', state: 'live' },
    { label: 'Migration Active', state: 'building' },
    { label: 'FIM Layer Drafting', state: 'building' },
    { label: 'Discord Integration', state: 'building' },
    { label: 'Transparency Engine', state: 'building' },
    { label: 'ThetaSteer IAMFIM', state: 'planned' },
  ],
};
