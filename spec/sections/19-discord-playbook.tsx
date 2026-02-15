/**
 * 19-discord-playbook.tsx — Discord Message Quality Playbook
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Message templates, design principles, behavior rules.
 * DEPENDS ON: 14-thetasteer-iamfim (grid notation)
 * EDITED BY: Operator agent
 */

export const SECTION_ID = '19-discord-playbook';
export const SECTION_TITLE = 'Discord Message Quality Playbook';

export const problemStatement = 'Current Discord messages are functional but lack personality, context density, and actionability. A headless CEO should communicate like a concise executive — not a log file.';

export interface CurrentMessagePattern {
  event: string;
  format: string;
  source: string;
}

export const currentPatterns: CurrentMessagePattern[] = [
  { event: 'Voice memo processed', format: '**Voice memo processed** (12s) from @elias > transcription... notation *question* **Priority:** P1 | **Hardness:** 4/5 → sonnet', source: '../intentguard/src/skills/voice-memo-reactor.ts:185' },
  { event: 'Task dispatched', format: '🚀 **Task a1b2** dispatched to **#builder** > preview Type in this channel to send STDIN...', source: '../thetadrivencoach/openclaw/src/runtime.ts:437' },
  { event: 'Categorization reply', format: '⚡ Dispatching to **#operator** 📡 B3:C1 *What does Signal mean in Grid?* H3/5 → sonnet', source: '../thetadrivencoach/openclaw/src/runtime.ts:634' },
  { event: 'Task complete', format: '✅ Task a1b2 complete ```output here```', source: '../thetadrivencoach/openclaw/src/output-poller.ts:152' },
  { event: 'Status command', format: '🛡️ IntentGuard alive. Skills: 9 loaded', source: '../intentguard/src/runtime.ts:720' },
  { event: 'CEO loop tweet', format: '📝 **Draft Tweet** — React 👍 to publish to X [text]', source: '../intentguard/src/ceo-loop.ts:573' },
  { event: 'Ask-and-predict', format: 'PREDICTION: Proceeding in 30s. Aligns with [security, code_quality]', source: '../intentguard/src/discord/steering-loop.ts' },
];

export const designPrinciples = [
  { number: 1, rule: 'Lead with action, not metadata.', detail: '"Building auth module" not "Task a1b2 dispatched to #builder"' },
  { number: 2, rule: 'Show trust context.', detail: 'Every message should reveal what ThetaSteer thought and why FIM allowed it.' },
  { number: 3, rule: 'Emoji as data, not decoration.', detail: '🔥=urgent, 🟢=FIM-passed, 🔴=FIM-blocked, ⏳=countdown, ✅=done.' },
  { number: 4, rule: 'Handoff always visible.', detail: 'If another room should see this, say so explicitly.' },
  { number: 5, rule: 'Keep under 280 chars when possible.', detail: 'Tweetable = readable.' },
];

export interface ImprovedTemplate {
  name: string;
  badge: 'improved' | 'new';
  template: string;
  changes: string;
}

export const improvedTemplates: ImprovedTemplate[] = [
  {
    name: 'Voice Memo → Action',
    badge: 'improved',
    template: `🎤 Voice memo from @elias (42s)
> "We need to add JWT rotation to the auth module..."

📡 B3:C1 Tactics.Signal × Operations.Grid
🎯 H4/5 → sonnet | 🟢 FIM overlap 0.91
🔨 → #builder (auto-dispatch in 5s)

React 🧊 to backlog | ⛔ to abort`,
    changes: 'Added FIM overlap score, sovereignty-aware countdown, explicit abort mechanism, trust context inline.',
  },
  {
    name: 'Task Progress Update',
    badge: 'improved',
    template: `🔨 #builder — JWT rotation (task f3a8)
⏳ Running 45s | 🟢 sovereignty 0.87
\`\`\`
✓ Created src/auth/jwt-rotation.ts
✓ Added RSA-256 key pair generation
⠿ Writing unit tests...
\`\`\`
📐 Handoff → #architect when done (design review)`,
    changes: 'Live progress with checkmarks, sovereignty score visible, handoff planned, room context.',
  },
  {
    name: 'FIM Denial (Transparency)',
    badge: 'new',
    template: `🔴 FIM DENIED — git_push blocked
Overlap: 0.62 (required: 0.80)
Failed: testing=0.4 (need 0.6), security=0.3 (need 0.5)
Sovereignty: 0.71 (threshold: 0.70) ⚠️ barely passing

📊 Trust debt spike logged to #trust-debt-public
🛠️ Resolution: Run test suite, then retry push`,
    changes: 'Public FIM denial with specific failed categories, resolution guidance, and transparency posting.',
  },
  {
    name: 'CEO Loop Heartbeat',
    badge: 'new',
    template: `🫀 CEO Heartbeat — 02:30 UTC
Sovereignty: 0.87 🟢 | Tasks: 3 done, 1 running
🔥 Hot: C1 Operations.Grid (4 tasks today)
🧊 Cold: A1 Strategy.Law (0 tasks this week)

Next: scanning spec for todos in 60s
Last commit: "feat(auth): JWT rotation" (23m ago)`,
    changes: 'Periodic heartbeat showing which tesseract cells are hot/cold, sovereignty trend, recent activity.',
  },
  {
    name: 'Night Shift Summary',
    badge: 'new',
    template: `🌙 Night Shift Complete — 8h autonomous
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 12 tasks completed | ⏰ 2 timed out | 🔴 1 FIM denial
📊 Sovereignty: 0.82 → 0.87 (+0.05)
🔥 Focus: C1 Grid.Law (7 tasks) + B2 Opp.Deal (3 tasks)
💰 Cost: $0.42 (38 sonnet calls + 2 opus)

Top commits:
• feat(auth): JWT rotation
• fix(pipeline): step-4 grade calculation
• docs(skills): system-control usage guide

🧊 Cold spots (need attention):
• A3 Strategy.Fund — 0 tasks in 72h
• B1 Tactics.Speed — stale todo since Feb 10`,
    changes: 'Morning briefing for the human CEO. Shows overnight cost, sovereignty delta, tesseract heat, and cold spots.',
  },
  {
    name: 'Ask-and-Predict (Improved)',
    badge: 'improved',
    template: `🤖 INTENT: Refactor output-poller.ts
📡 C2 Operations.Loop | H3/5 → sonnet
🟢 FIM overlap 0.94 | sovereignty 0.87

⏳ Executing in 30s unless redirected
React ⛔ to abort | 🔥 to expedite | 💬 to discuss

Why: stabilization detection has 3 edge cases
What changes: extract PromptDetector class, add timeout config
Risk: LOW — no external side effects`,
    changes: 'Shows WHY, WHAT CHANGES, and RISK assessment. Makes informed non-intervention possible.',
  },
];

export const behaviorRules = [
  { number: 1, rule: 'Sovereignty in every message', detail: 'Every outbound message includes the current sovereignty score. Humans should always know the trust level.' },
  { number: 2, rule: 'ThetaSteer notation on dispatch', detail: 'Every task dispatch shows the full grid notation (emoji + coordinate + axis names). This trains humans to think in tesseract coordinates.' },
  { number: 3, rule: 'FIM denials are public', detail: 'Every denial posts to both the requesting room AND #trust-debt-public. Transparency is non-negotiable.' },
  { number: 4, rule: 'Handoffs are explicit', detail: '"📐 Handoff → #architect when done" — never silently route between rooms.' },
  { number: 5, rule: 'Cost in summaries', detail: 'Every night shift summary and weekly report includes API cost breakdown. The bot accounts for its own spending.' },
  { number: 6, rule: 'Cold spots are flagged', detail: 'Tesseract cells with 0 activity for >48h get called out in heartbeats. Neglected areas are strategic risk.' },
];

export const implementationFiles = [
  '../intentguard/src/skills/voice-memo-reactor.ts:176-206',
  '../intentguard/src/ceo-loop.ts:566-580',
  '../intentguard/src/discord/steering-loop.ts',
  '../intentguard/src/discord/transparency-engine.ts',
  '../thetadrivencoach/openclaw/src/output-poller.ts:152-174',
  '../thetadrivencoach/openclaw/src/runtime.ts:437-438,634-640',
];
