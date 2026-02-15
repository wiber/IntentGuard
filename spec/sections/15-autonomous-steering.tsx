/**
 * 15-autonomous-steering.tsx — Permissionless but Supervised Architecture
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: The Ask-and-Predict protocol for autonomous execution.
 * DEPENDS ON: 05-fim-auth, 03-cognitive-rooms, 14-thetasteer-iamfim
 * EDITED BY: spec-updater agent
 *
 * ARCHITECTURE:
 *   Admin instant-execute → No countdown, any message = dispatch
 *   Trusted ask-and-predict → Bot posts intent, 30s countdown, auto-execute
 *   General thumbs-up → Only executes if an Admin reacts with thumbs-up
 *
 * CONFLICT RESOLUTION:
 *   Latest signal wins, but contradictions logged in #vault as "Strategic Pivot"
 */

export const SECTION_ID = '15-autonomous-steering';
export const SECTION_TITLE = 'Autonomous Steering Loop';

export interface SteeringTier {
  tier: string;
  actors: string[];
  pattern: string;
  countdown: string;
  fimImpact: string;
}

export interface SignalPriority {
  source: string;
  pattern: string;
  priority: number;
  fimImpact: string;
}

export interface AutonomousSteeringProps {
  protocol: {
    askPredictTimeoutMs: number;
    redirectGracePeriodMs: number;
    maxConcurrentPredictions: number;
  };
  tiers: SteeringTier[];
  signalPriority: SignalPriority[];
  conflictResolution: string;
}

export function AutonomousSteeringSection({ protocol, tiers, signalPriority, conflictResolution }: AutonomousSteeringProps) {
  return `
    <div class="section">
      <h2>15. Autonomous Steering Loop — Permissionless but Supervised</h2>

      <div class="subsection">
        <h3>Protocol: Ask and Predict</h3>
        <p>
          The Sovereign Engine maintains velocity without manual approval bottlenecks.
          Every action follows the Ask-and-Predict cycle:
        </p>
        <div class="protocol-flow">
          <div class="protocol-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <strong>ASK</strong> — Bot posts intent to the relevant Discord room
              <br><code>#builder: "I will refactor the auth module to support JWT rotation"</code>
            </div>
          </div>
          <div class="protocol-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <strong>PREDICT</strong> — Bot posts confidence and countdown
              <br><code>PREDICTION: Proceeding in ${protocol.askPredictTimeoutMs / 1000}s. Aligns with [security, code_quality] goals.</code>
            </div>
          </div>
          <div class="protocol-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <strong>EXECUTE or REDIRECT</strong>
              <br>If no intervention → execute autonomously
              <br>If voice memo or text arrives → abort, re-plan with new signal
            </div>
          </div>
        </div>
        <div class="config-block">
          <strong>Timeout:</strong> ${protocol.askPredictTimeoutMs}ms |
          <strong>Redirect Grace:</strong> ${protocol.redirectGracePeriodMs}ms |
          <strong>Max Concurrent:</strong> ${protocol.maxConcurrentPredictions}
        </div>
      </div>

      <div class="subsection">
        <h3>Execution Tiers</h3>
        <table>
          <thead>
            <tr><th>Tier</th><th>Actors</th><th>Pattern</th><th>Countdown</th><th>FIM Impact</th></tr>
          </thead>
          <tbody>
            ${tiers.map(t => `
              <tr>
                <td><strong>${t.tier}</strong></td>
                <td><code>${t.actors.join(', ')}</code></td>
                <td>${t.pattern}</td>
                <td>${t.countdown}</td>
                <td>${t.fimImpact}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="subsection">
        <h3>Signal Priority Matrix</h3>
        <table>
          <thead>
            <tr><th>Signal Source</th><th>Pattern</th><th>Priority</th><th>FIM Impact</th></tr>
          </thead>
          <tbody>
            ${signalPriority.map(s => `
              <tr>
                <td><strong>${s.source}</strong></td>
                <td>${s.pattern}</td>
                <td>${s.priority}</td>
                <td>${s.fimImpact}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="subsection">
        <h3>Conflict Resolution</h3>
        <div class="callout">${conflictResolution}</div>
      </div>

      <div class="subsection">
        <h3>Geometric Surface Attack Prevention</h3>
        <p>
          If any thumbs-up from any user could trigger execution, non-authorized users
          could move the bot's "Mass" into restricted FIM coordinates. The Admin Thumbs-Up
          protocol prevents this:
        </p>
        <ul>
          <li>Only Admin reactions (thetaking, mortarcombat) can "bless" non-admin suggestions</li>
          <li>Non-admin suggestions enter the Ask-and-Predict queue but cannot force execution</li>
          <li>The FIM auth layer validates every action regardless of who triggers it</li>
          <li>All reactions are logged to #trust-debt-public for transparency</li>
        </ul>
      </div>
    </div>
  `;
}

export const defaultProps: AutonomousSteeringProps = {
  protocol: {
    askPredictTimeoutMs: 30000,
    redirectGracePeriodMs: 5000,
    maxConcurrentPredictions: 3,
  },
  tiers: [
    {
      tier: 'Admin',
      actors: ['thetaking', 'mortarcombat'],
      pattern: 'Instant Execute',
      countdown: 'None (0s)',
      fimImpact: 'High Sovereignty Weight',
    },
    {
      tier: 'Trusted',
      actors: ['(configured members)'],
      pattern: 'Ask and Predict',
      countdown: '30s (configurable)',
      fimImpact: 'Neutral — Alignment Check',
    },
    {
      tier: 'General',
      actors: ['(all server members)'],
      pattern: 'Suggestion Only',
      countdown: 'Never (requires Admin thumbs-up)',
      fimImpact: 'None unless Admin-blessed',
    },
    {
      tier: 'Admin Thumbs-Up',
      actors: ['Admin reacts to non-admin message'],
      pattern: 'Validation Hook',
      countdown: 'Immediate on reaction',
      fimImpact: 'Identity Fractal Sharpening',
    },
  ],
  signalPriority: [
    { source: 'Admin Message', pattern: 'Instant Execute', priority: 1, fimImpact: 'High Sovereignty Weight' },
    { source: 'Voice Memo Redirect', pattern: 'Abort + Replan', priority: 2, fimImpact: 'Corrective Steering Signal' },
    { source: 'Admin Thumbs-Up', pattern: 'Validation Hook', priority: 3, fimImpact: 'Identity Fractal Sharpening' },
    { source: 'Bot Prediction', pattern: 'Timeout (30s)', priority: 4, fimImpact: 'Neutral (Alignment Check)' },
    { source: 'Non-Admin Suggestion', pattern: 'Queue Only', priority: 5, fimImpact: 'None without Admin blessing' },
  ],
  conflictResolution: `
    When a Voice Memo redirect arrives that contradicts a previous Admin Command,
    the bot prioritizes the <strong>Latest Signal</strong> but flags it in <code>#vault</code>
    as a "Strategic Pivot." In a headless environment, the most recent context is usually
    the most relevant to preventing drift. The pivot is logged to the transparency engine
    with both the original command and the redirect for audit trail.
  `,
};
