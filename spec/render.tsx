/**
 * spec/render.tsx — Compile modular TSX sections into HTML
 *
 * USAGE: npx tsx spec/render.tsx > intentguard-migration-spec.html
 *
 * Each section in sections/ exports data. This file renders them into
 * a single HTML page with CSS and interactive JavaScript.
 *
 * Claude Flow agents edit individual sections — this file re-renders the whole spec.
 */

import { SECTION_TITLE as heroTitle, defaultProps, HeroSection } from './sections/00-hero';
import { SECTION_TITLE as archTitle, parentLayer, gatewayLayer, channels, DEBATE_FLAGS } from './sections/01-architecture';
import { SECTION_TITLE as migTitle, modules, getStats } from './sections/02-migration-grid';
import { SECTION_TITLE as roomsTitle, rooms, ipcRisks } from './sections/03-cognitive-rooms';
import { SECTION_TITLE as gridTitle, columns, rows, grid } from './sections/04-tesseract-grid';
import { SECTION_TITLE as fimTitle, TENSOR_EQUATION, actionRequirements, PROXY_PSEUDOCODE } from './sections/05-fim-auth';
import { SECTION_TITLE as trustTitle, pipelineSteps, agents } from './sections/06-trust-debt';
import { SECTION_TITLE as skillsTitle, skills } from './sections/07-skills-inventory';
import { SECTION_TITLE as planTitle, phases } from './sections/08-implementation-plan';
import { SECTION_TITLE as splitTitle, thetadrivencoach, intentguard } from './sections/09-repo-split';
import { SECTION_TITLE as debateTitle, findings, getDebateSummary } from './sections/10-debate-notes';
import { SECTION_TITLE as visionTitle, sovereignStack, warRoomVision, openSourceCase } from './sections/11-end-state-vision';
import { SECTION_TITLE as driftTitle, scenarios, driftConstants, steeringMechanism, thetaSteerAsIAMFIM } from './sections/12-drift-vs-steering';
import { SECTION_TITLE as bootTitle, bootstrapPhases, discordWarRoom, swarmConfig } from './sections/13-bootstrap-protocol';
import { SECTION_TITLE as steerTitle, mailboxPattern, identityFractalConstruction, thetaSteerConfig } from './sections/14-thetasteer-iamfim';
import { SECTION_TITLE as autoSteerTitle, defaultProps as autoSteerProps, AutonomousSteeringSection } from './sections/15-autonomous-steering';

// ─── CSS ───────────────────────────────────────────────────────────────
const css = `
:root {
  --bg: #0f172a; --surface: #1e293b; --border: #334155;
  --text: #e2e8f0; --muted: #94a3b8; --accent: #38bdf8;
  --green: #22c55e; --yellow: #eab308; --orange: #f97316; --red: #ef4444;
  --purple: #a855f7; --blue: #3b82f6;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'SF Mono', 'Fira Code', monospace; background: var(--bg); color: var(--text); line-height: 1.6; padding: 2rem; max-width: 1200px; margin: 0 auto; }
h1 { font-size: 2rem; margin-bottom: 0.5rem; }
h2 { font-size: 1.4rem; color: var(--accent); margin: 2rem 0 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
h3 { font-size: 1.1rem; color: var(--purple); margin: 1rem 0 0.5rem; }
.hero { text-align: center; padding: 2rem 0 1rem; }
.subtitle { color: var(--muted); font-size: 1rem; margin: 0.5rem 0; }
.version { color: var(--muted); font-size: 0.85rem; margin-bottom: 1rem; }
.status-bar { display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; }
.status-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.live { background: var(--green); box-shadow: 0 0 6px var(--green); }
.dot.building { background: var(--yellow); box-shadow: 0 0 6px var(--yellow); }
.dot.planned { background: var(--muted); }
section { margin: 2rem 0; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin: 0.75rem 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.badge { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
.badge-complete { background: rgba(34,197,94,0.2); color: var(--green); }
.badge-building { background: rgba(234,179,8,0.2); color: var(--yellow); }
.badge-pending { background: rgba(148,163,184,0.2); color: var(--muted); }
.badge-planned { background: rgba(168,85,247,0.2); color: var(--purple); }
.badge-critical { background: rgba(239,68,68,0.2); color: var(--red); }
.badge-high { background: rgba(249,115,22,0.2); color: var(--orange); }
.badge-medium { background: rgba(234,179,8,0.2); color: var(--yellow); }
.badge-low { background: rgba(34,197,94,0.2); color: var(--green); }
.badge-resolved { background: rgba(59,130,246,0.2); color: var(--blue); }
.badge-ported { background: rgba(34,197,94,0.2); color: var(--green); }
.badge-converting { background: rgba(234,179,8,0.2); color: var(--yellow); }
.badge-keep-as-mcp { background: rgba(59,130,246,0.2); color: var(--blue); }
.badge-low-priority { background: rgba(148,163,184,0.2); color: var(--muted); }
.badge-done { background: rgba(34,197,94,0.2); color: var(--green); }
.badge-wip { background: rgba(234,179,8,0.2); color: var(--yellow); }
.badge-todo { background: rgba(148,163,184,0.2); color: var(--muted); }
.badge-active { background: rgba(34,197,94,0.2); color: var(--green); }
.badge-inactive { background: rgba(148,163,184,0.2); color: var(--muted); }
.tile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem; }
.detail { color: var(--muted); font-size: 0.85rem; }
.mono { font-family: 'SF Mono', monospace; font-size: 0.85rem; color: var(--accent); }
.layer-box { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin: 0.75rem 0; }
.layer-title { font-weight: 700; color: var(--accent); margin-bottom: 0.5rem; }
.layer-role { color: var(--muted); font-size: 0.85rem; margin-bottom: 0.75rem; }
.channel-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0; }
.channel-chip { padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; background: var(--surface); border: 1px solid var(--border); }
.channel-chip.active { border-color: var(--green); color: var(--green); }
.grid-table { display: grid; grid-template-columns: auto repeat(3, 1fr); gap: 2px; margin: 1rem 0; }
.grid-cell { background: var(--surface); border: 1px solid var(--border); padding: 0.75rem; text-align: center; border-radius: 4px; }
.grid-cell.active { border-color: var(--green); box-shadow: 0 0 8px rgba(34,197,94,0.3); }
.grid-header { background: transparent; font-weight: 700; color: var(--accent); font-size: 0.8rem; }
.grid-row-label { background: transparent; font-weight: 700; color: var(--purple); display: flex; align-items: center; font-size: 0.8rem; }
.equation { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; font-family: 'SF Mono', monospace; text-align: center; font-size: 0.9rem; color: var(--accent); margin: 1rem 0; }
pre { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; overflow-x: auto; font-size: 0.8rem; margin: 1rem 0; color: var(--muted); }
.checklist { list-style: none; padding: 0; }
.checklist li { padding: 0.3rem 0; font-size: 0.9rem; }
.check-done::before { content: '✅ '; }
.check-wip::before { content: '🔧 '; }
.check-todo::before { content: '⬜ '; }
.stats-bar { display: flex; gap: 1.5rem; justify-content: center; margin: 1rem 0; font-size: 0.9rem; }
.stats-bar span { display: flex; align-items: center; gap: 0.4rem; }
.split-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.finding { border-left: 3px solid var(--border); padding-left: 1rem; margin: 0.75rem 0; }
.finding.critical { border-left-color: var(--red); }
.finding.high { border-left-color: var(--orange); }
.finding.medium { border-left-color: var(--yellow); }
.finding.low { border-left-color: var(--green); }
.finding.resolved { border-left-color: var(--blue); }
.warn-box { background: rgba(239,68,68,0.1); border: 1px solid var(--red); border-radius: 8px; padding: 1rem; margin: 1rem 0; }
.warn-box h3 { color: var(--red); }
.future-phase { opacity: 0.6; }
.section { margin: 2rem 0; }
.subsection { margin: 1.5rem 0; }
.protocol-flow { margin: 1rem 0; }
.protocol-step { display: flex; gap: 1rem; margin: 0.75rem 0; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; }
.step-number { background: var(--accent); color: var(--bg); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
.step-content { flex: 1; }
.config-block { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 0.75rem; margin: 1rem 0; font-size: 0.85rem; color: var(--muted); }
.callout { background: rgba(59,130,246,0.1); border: 1px solid var(--blue); border-radius: 8px; padding: 1rem; margin: 1rem 0; }
table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
th { padding: 0.5rem; text-align: left; border-bottom: 2px solid var(--border); color: var(--muted); font-size: 0.8rem; }
td { padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
@media print {
  body { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .page-break { page-break-before: always; }
}
@media (max-width: 768px) {
  .tile-grid { grid-template-columns: 1fr; }
  .split-cols { grid-template-columns: 1fr; }
  .grid-table { font-size: 0.75rem; }
}
`;

// ─── Section Renderers ──────────────────────────────────────────────────

function renderHero(): string {
  return HeroSection(defaultProps);
}

function renderArchitecture(): string {
  const renderLayer = (layer: typeof parentLayer) => `
    <div class="layer-box">
      <div class="layer-title">${layer.name}</div>
      <div class="layer-role">${layer.role}</div>
      ${layer.components.map(c => `<div style="margin:0.3rem 0"><strong>${c.name}</strong> — <span class="detail">${c.description}</span></div>`).join('')}
    </div>`;

  return `
    <section>
      <h2>${archTitle}</h2>
      <div style="text-align:center;margin:1rem 0;font-size:0.9rem;color:var(--muted)">
        IntentGuard (parent) → OpenClaw (child at ws://127.0.0.1:18789) → Channels
      </div>
      ${renderLayer(parentLayer)}
      <div style="text-align:center;font-size:1.2rem;margin:0.5rem 0">⬇️ spawns + proxies</div>
      ${renderLayer(gatewayLayer)}
      <div style="text-align:center;font-size:1.2rem;margin:0.5rem 0">⬇️ connects to</div>
      <div class="channel-bar">
        ${channels.map(ch => `<span class="channel-chip ${ch.active ? 'active' : ''}">${ch.emoji} ${ch.name}</span>`).join('')}
      </div>
      <div class="warn-box">
        <h3>Debate Flags</h3>
        ${Object.entries(DEBATE_FLAGS).map(([k, v]) => `<div style="margin:0.3rem 0"><strong>${k}:</strong> <span class="detail">${v}</span></div>`).join('')}
      </div>
    </section>`;
}

function renderMigrationGrid(): string {
  const stats = getStats();
  const statusColors = { complete: 'green', building: 'yellow', pending: 'muted', planned: 'purple' };
  return `
    <section>
      <h2>${migTitle}</h2>
      <div class="stats-bar">
        ${Object.entries(stats).map(([s, n]) => `<span><span class="dot ${s === 'complete' ? 'live' : s === 'building' ? 'building' : 'planned'}"></span> ${s}: ${n}</span>`).join('')}
      </div>
      <div class="tile-grid">
        ${modules.map(m => `
          <div class="card">
            <div class="card-header">
              <span>${m.emoji} <strong>${m.name}</strong></span>
              <span class="badge badge-${m.status}">${m.status}</span>
            </div>
            <div class="detail">${m.description}</div>
            <div style="margin-top:0.5rem;font-size:0.8rem">
              <span class="mono">${m.source}</span> → <span class="mono">${m.target}</span>
            </div>
            ${m.riskLevel ? `<div style="margin-top:0.3rem"><span class="badge badge-${m.riskLevel}">risk: ${m.riskLevel}</span></div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>`;
}

function renderCognitiveRooms(): string {
  return `
    <section>
      <h2>${roomsTitle}</h2>
      <div class="tile-grid">
        ${rooms.map(r => `
          <div class="card" style="border-left:3px solid ${r.color}">
            <div class="card-header">
              <span>${r.emoji} <strong>${r.name}</strong></span>
              <span class="mono">${r.coordinate}</span>
            </div>
            <div class="detail">Terminal: ${r.terminal} | IPC: ${r.ipcMethod}</div>
            <div style="margin-top:0.5rem;font-size:0.8rem">
              <strong>Sees:</strong> ${r.sees.join(', ')}<br>
              <strong>Ignores:</strong> ${r.ignores.join(', ')}<br>
              <strong>Handoff:</strong> ${Object.entries(r.handoffTo).map(([k, v]) => `${k} (${v})`).join(', ')}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="card" style="margin-top:1rem">
        <h3>IPC Risk Assessment</h3>
        ${Object.entries(ipcRisks).map(([method, risk]) => `
          <div style="margin:0.3rem 0;font-size:0.85rem">
            <span class="mono">${method}</span> — Portable: ${risk.portable ? '✅' : '❌'} | Focus Required: ${risk.focusRequired ? '⚠️ yes' : '✅ no'} | Reliability: ${risk.reliability}
          </div>
        `).join('')}
      </div>
    </section>`;
}

function renderTesseractGrid(): string {
  return `
    <section>
      <h2>${gridTitle}</h2>
      <div class="grid-table">
        <div class="grid-header"></div>
        ${columns.map(c => `<div class="grid-header">${c}</div>`).join('')}
        ${grid.map((row, ri) => `
          <div class="grid-row-label">${rows[ri]}</div>
          ${row.map(cell => `<div class="grid-cell ${cell.active ? 'active' : ''}">${cell.emoji}<br><strong>${cell.roomName}</strong><br><span class="detail">${cell.label}</span></div>`).join('')}
        `).join('')}
      </div>
    </section>`;
}

function renderFimAuth(): string {
  return `
    <section>
      <h2>${fimTitle}</h2>
      <div class="warn-box">
        <h3>CRITICAL: Pseudocode Only</h3>
        <div class="detail">The FIM auth layer exists only in this spec. No TypeScript. No tests. Must build standalone module with actual math before integrating.</div>
      </div>
      <div class="equation">${TENSOR_EQUATION}</div>
      <h3>Action Requirements</h3>
      ${actionRequirements.map(a => `
        <div class="card">
          <div class="card-header">
            <span class="mono">${a.toolName}</span>
            <span class="badge badge-medium">min sovereignty: ${a.minSovereignty}</span>
          </div>
          <div class="detail">${a.description}</div>
          <div style="margin-top:0.3rem;font-size:0.8rem">Required: ${Object.entries(a.requiredScores).map(([k, v]) => `${k} >= ${v}`).join(', ')}</div>
        </div>
      `).join('')}
      <h3>MCP Proxy Pseudocode</h3>
      <pre>${PROXY_PSEUDOCODE.trim()}</pre>
    </section>`;
}

function renderTrustDebt(): string {
  return `
    <section>
      <h2>${trustTitle}</h2>
      <div class="detail" style="margin-bottom:1rem">8-step pipeline. Already built and working. This is the real asset.</div>
      ${pipelineSteps.map(s => `
        <div class="card" style="padding:0.6rem 1rem">
          <span class="badge badge-done">Step ${s.number}</span>
          <strong style="margin-left:0.5rem">${s.name}</strong>
          <span class="detail" style="margin-left:0.5rem">${s.description}</span>
          <div class="mono" style="font-size:0.75rem">${s.file}</div>
        </div>
      `).join('')}
      <h3>Agents</h3>
      ${agents.map(a => `
        <div style="margin:0.3rem 0;font-size:0.85rem">
          <span class="badge badge-${a.status}">${a.status}</span>
          <strong style="margin-left:0.5rem">${a.name}</strong> — ${a.purpose}
          <span class="mono" style="margin-left:0.5rem">${a.script}</span>
        </div>
      `).join('')}
    </section>`;
}

function renderSkillsInventory(): string {
  return `
    <section>
      <h2>${skillsTitle}</h2>
      <div class="tile-grid">
        ${skills.map(s => `
          <div class="card">
            <div class="card-header">
              <strong>${s.name}</strong>
              <span class="badge badge-${s.migrationStatus}">${s.migrationStatus}</span>
            </div>
            <div class="detail">${s.description}</div>
            <div style="margin-top:0.5rem;font-size:0.8rem">
              <span class="mono">${s.source}</span> | ~${s.linesOfCode} LOC
            </div>
            <div class="detail" style="margin-top:0.3rem">${s.migrationNotes}</div>
          </div>
        `).join('')}
      </div>
    </section>`;
}

function renderImplementationPlan(): string {
  return `
    <section>
      <h2>${planTitle}</h2>
      ${phases.map(p => `
        <div class="card ${p.future ? 'future-phase' : ''}">
          <h3>${p.name}</h3>
          <div class="detail" style="margin-bottom:0.5rem">${p.description}</div>
          <ul class="checklist">
            ${p.checklist.map(c => `<li class="check-${c.status}">${c.text}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </section>`;
}

function renderRepoSplit(): string {
  return `
    <section>
      <h2>${splitTitle}</h2>
      <div class="split-cols">
        <div>
          <h3>thetadrivencoach (Website/Game)</h3>
          <ul class="checklist">
            ${thetadrivencoach.map(i => `<li class="check-${i.status}">${i.text}</li>`).join('')}
          </ul>
        </div>
        <div>
          <h3>intentguard (Bot CEO)</h3>
          <ul class="checklist">
            ${intentguard.map(i => `<li class="check-${i.status}">${i.text}</li>`).join('')}
          </ul>
        </div>
      </div>
    </section>`;
}

function renderDebateNotes(): string {
  const summary = getDebateSummary();
  return `
    <section>
      <h2>${debateTitle}</h2>
      <div class="stats-bar">
        ${Object.entries(summary).map(([sev, count]) => `<span><span class="badge badge-${sev}">${sev}: ${count}</span></span>`).join('')}
      </div>
      ${findings.map(f => `
        <div class="finding ${f.severity}">
          <div class="card-header">
            <span><strong>${f.id}</strong> [${f.source}] ${f.finding}</span>
            <span class="badge badge-${f.severity}">${f.severity}</span>
          </div>
          <div class="detail">${f.detail}</div>
          ${f.resolution ? `<div style="margin-top:0.3rem;font-size:0.85rem;color:var(--accent)">${f.resolution}</div>` : ''}
        </div>
      `).join('')}
    </section>`;
}

function renderEndStateVision(): string {
  return `
    <section>
      <h2>${visionTitle}</h2>
      <div class="detail" style="text-align:center;margin:1rem 0;font-style:italic">${warRoomVision.description.replace(/\n/g, '<br>')}</div>
      <div class="stats-bar" style="margin:1.5rem 0">
        ${warRoomVision.keyMetrics.map(m => `<span><span class="dot ${m.status === 'live' ? 'live' : 'building'}"></span> ${m.label}: <strong>${m.value}</strong></span>`).join('')}
      </div>
      ${sovereignStack.map(layer => `
        <div class="card" style="border-left:3px solid ${layer.status === 'live' ? 'var(--green)' : layer.status === 'building' ? 'var(--yellow)' : 'var(--muted)'}">
          <div class="card-header">
            <span>${layer.emoji} <strong>${layer.name}</strong></span>
            <span class="badge badge-${layer.status === 'live' ? 'complete' : layer.status === 'building' ? 'building' : 'planned'}">${layer.status}</span>
          </div>
          <div class="detail">${layer.role}</div>
          <div style="margin-top:0.5rem">${layer.description}</div>
        </div>
      `).join('')}
      <h3>Open-Source Case</h3>
      <div class="card">
        ${openSourceCase.points.map(p => `<div style="margin:0.3rem 0">• ${p}</div>`).join('')}
      </div>
    </section>`;
}

function renderDriftVsSteering(): string {
  return `
    <section>
      <h2>${driftTitle}</h2>
      <div class="equation">k_E = ${driftConstants.k_E} | Drift threshold = ${driftConstants.driftThreshold} | ShortRank multiplier = ${driftConstants.k_S}x</div>
      <div class="tile-grid">
        ${scenarios.map(s => `
          <div class="card">
            <div class="card-header">
              <span>${s.emoji} <strong>${s.name}</strong></span>
            </div>
            <div style="margin:0.3rem 0"><strong>Approach:</strong> <span class="detail">${s.approach}</span></div>
            <div style="margin:0.3rem 0"><strong>Per-op:</strong> <span class="mono">${s.probability}</span></div>
            <div style="margin:0.3rem 0"><strong>At scale:</strong> ${s.outcome}</div>
            <div style="margin:0.3rem 0"><strong>Catastrophic at:</strong> <span style="color:var(--red)">${s.catastrophicAt}</span></div>
          </div>
        `).join('')}
      </div>
      <h3>The Steering Loop</h3>
      ${steeringMechanism.steps.map(s => `
        <div class="card" style="padding:0.5rem 1rem">
          <span class="badge badge-done">Step ${s.step}</span>
          <strong style="margin-left:0.5rem">${s.action}</strong>
          <span class="mono" style="margin-left:0.5rem">${s.component}</span>
        </div>
      `).join('')}
      <h3>ThetaSteer → IAMFIM Tier Mapping</h3>
      <div class="tile-grid">
        ${thetaSteerAsIAMFIM.mapping.map(m => `
          <div class="card" style="border-left:3px solid ${m.color}">
            <div class="card-header">
              <span style="color:${m.color}"><strong>${m.tier}</strong></span>
              <span class="mono">${m.room}</span>
            </div>
            <div class="detail">${m.category} → ${m.description}</div>
          </div>
        `).join('')}
      </div>
    </section>`;
}

function renderBootstrapProtocol(): string {
  return `
    <section>
      <h2>${bootTitle}</h2>
      <div class="stats-bar" style="margin:1rem 0">
        <span><strong>${swarmConfig.totalAgents}</strong> agents</span>
        <span>Topology: <strong>${swarmConfig.topology}</strong></span>
        <span>Queen: <span class="mono">${swarmConfig.queen}</span></span>
        <span>Render: <strong>${swarmConfig.specRenderInterval}</strong></span>
      </div>
      ${bootstrapPhases.map(p => `
        <div class="card ${p.status === 'queued' ? 'future-phase' : ''}">
          <div class="card-header">
            <span><strong>${p.name}</strong> (${p.agentCount} agents → ${p.discordChannel})</span>
            <span class="badge badge-${p.status === 'done' ? 'complete' : p.status === 'active' ? 'building' : 'planned'}">${p.status}</span>
          </div>
          <div class="detail">${p.description}</div>
          <ul class="checklist" style="margin-top:0.5rem">
            ${p.tasks.map(t => `<li class="check-todo">${t}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
      <h3>Discord War Room</h3>
      <div class="tile-grid">
        ${discordWarRoom.channels.map(ch => `
          <div class="card" style="padding:0.6rem">
            <span>${ch.emoji} <strong>${ch.name}</strong></span>
            <span class="detail" style="margin-left:0.5rem">${ch.purpose}</span>
          </div>
        `).join('')}
      </div>
      <div class="card" style="margin-top:1rem;border-left:3px solid var(--green)">
        <strong>Authorized Discord Handles</strong>
        <div style="margin:0.3rem 0"><span class="mono">${swarmConfig.discordHandles.authorized.join(', ')}</span></div>
        <div class="detail">${swarmConfig.discordHandles.policy}</div>
      </div>
    </section>`;
}

function renderThetaSteerIAMFIM(): string {
  return `
    <section>
      <h2>${steerTitle}</h2>
      <h3>Mailbox Pattern — Every Action is Categorized</h3>
      ${mailboxPattern.map(m => `
        <div class="card">
          <div class="card-header"><strong>${m.source}</strong></div>
          <div class="detail">Examples: ${m.examples.join(' | ')}</div>
          <div style="margin-top:0.3rem;font-size:0.85rem">
            <span class="mono">${m.categorizedAs}</span> → ${m.trustDimension}
          </div>
          <div style="margin-top:0.3rem;font-size:0.85rem;color:var(--accent)">${m.flowsTo}</div>
        </div>
      `).join('')}
      <h3>${identityFractalConstruction.title}</h3>
      <div class="detail" style="margin-bottom:1rem">${identityFractalConstruction.description}</div>
      ${identityFractalConstruction.phases.map((p, i) => `
        <div class="card" style="padding:0.5rem 1rem">
          <span class="badge badge-done">Phase ${i + 1}</span>
          <strong style="margin-left:0.5rem">${p.name}</strong>
          <span class="detail" style="margin-left:0.5rem">${p.description}</span>
        </div>
      `).join('')}
      <h3>ThetaSteer Backends</h3>
      <div class="tile-grid">
        ${thetaSteerConfig.backends.map(b => `
          <div class="card">
            <strong>${b.name}</strong>
            <div style="margin-top:0.3rem;font-size:0.85rem">Latency: <span class="mono">${b.latency}</span> | Accuracy: ${b.accuracy} | Cost: ${b.cost}</div>
          </div>
        `).join('')}
      </div>
    </section>`;
}

// ─── Assemble Full Page ──────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IntentGuard Migration Spec</title>
  <style>${css}</style>
</head>
<body>
  ${renderHero()}
  ${renderArchitecture()}
  ${renderMigrationGrid()}
  ${renderCognitiveRooms()}
  ${renderTesseractGrid()}
  ${renderFimAuth()}
  ${renderTrustDebt()}
  ${renderSkillsInventory()}
  ${renderImplementationPlan()}
  ${renderRepoSplit()}
  ${renderDebateNotes()}
  ${renderEndStateVision()}
  ${renderDriftVsSteering()}
  ${renderBootstrapProtocol()}
  ${renderThetaSteerIAMFIM()}
  ${AutonomousSteeringSection(autoSteerProps)}
  <footer style="text-align:center;color:var(--muted);font-size:0.8rem;margin:3rem 0 1rem;border-top:1px solid var(--border);padding-top:1rem">
    IntentGuard Migration Spec v2.1.0 | Generated ${new Date().toISOString().split('T')[0]} | 16 modular sections | Sovereign Engine
  </footer>
</body>
</html>`;

process.stdout.write(html);
