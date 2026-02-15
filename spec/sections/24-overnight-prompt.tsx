/**
 * 24-overnight-prompt.tsx — Overnight Sonnet Prompt Document
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Copy-paste prompt for overnight Sonnet documentation work.
 * DEPENDS ON: Nothing
 * EDITED BY: Operator agent
 */

export const SECTION_ID = '24-overnight-prompt';
export const SECTION_TITLE = 'Overnight Sonnet Prompt Document';

export const callout = 'This section IS the prompt. Copy this to a Sonnet session to run overnight autonomous documentation and behavior improvement work. All file paths are verified. No code changes — documentation only.';

export const promptTitle = 'Night Shift Documentation Sprint';

export const promptBody = `You are Claude Sonnet working overnight on the IntentGuard project.
Your workspace: /Users/thetadriven/github/IntentGuard/

## YOUR MISSION
Write documentation files and improve Discord message templates.
Do NOT modify any .ts or .json files. Only create/edit .md files in docs/.
Do NOT push to remote. Only commit locally.

## TASK 1: Discord Message Behavior Spec (docs/DISCORD-MESSAGE-SPEC.md)
Read these source files and document every Discord message pattern:
- src/skills/voice-memo-reactor.ts (lines 176-206) — voice memo response
- src/ceo-loop.ts (lines 566-580) — tweet posting, room dispatch
- src/discord/steering-loop.ts — ask-and-predict messages
- src/discord/transparency-engine.ts — trust-debt spike reports
- ../thetadrivencoach/openclaw/src/runtime.ts (lines 437, 634) — task dispatch, categorization
- ../thetadrivencoach/openclaw/src/output-poller.ts (lines 152-174) — task completion

For each message type, document:
1. Current format (exact string template)
2. Improved format (following rules from Section 17 of this spec)
3. Which file and line to modify
4. Why the improvement matters for the CEO briefing use case

## TASK 2: Skill Documentation (docs/skills/)
Read each skill file and create a per-skill README:
- docs/skills/CLAUDE-FLOW-BRIDGE.md — src/skills/claude-flow-bridge.ts (729 LOC)
- docs/skills/VOICE-MEMO-REACTOR.md — src/skills/voice-memo-reactor.ts (228 LOC)
- docs/skills/THETASTEER-CATEGORIZE.md — src/skills/thetasteer-categorize.ts (382 LOC)
- docs/skills/SYSTEM-CONTROL.md — src/skills/system-control.ts (481 LOC)
- docs/skills/TESSERACT-TRAINER.md — src/skills/tesseract-trainer.ts (317 LOC)
- docs/skills/LLM-CONTROLLER.md — src/skills/llm-controller.ts (412 LOC)

Each README must include: purpose, commands/actions, config, dependencies,
known issues, and code examples.

## TASK 3: Architecture Doc (docs/ARCHITECTURE.md)
Document the two-process architecture:
- IntentGuard (Cortex) at src/wrapper.ts → spawns OpenClaw (Body)
- OpenClaw gateway at ws://127.0.0.1:18789
- 9 cognitive rooms with IPC methods
- FIM auth layer at src/auth/geometric.ts
- Trust-debt pipeline at src/pipeline/
- CEO loop at src/ceo-loop.ts
- Night shift scheduler at src/cron/scheduler.ts
Include a plain-text architecture diagram.

## TASK 4: Activation Checklist (docs/ACTIVATION-CHECKLIST.md)
Step-by-step guide to go from "built" to "running":
1. Fill .env (what vars are needed — check intentguard.json)
2. brew install ffmpeg
3. Start bot: npx tsx src/runtime.ts
4. Verify: !ping in Discord
5. Enable CEO loop
6. Install launchd daemon
7. 24h soak test criteria

## TASK 5: Business Context (docs/BUSINESS-CONTEXT.md)
Read docs/patents/PATENTS.md, docs/patents/NATURE_PAPER_STRATEGY.md,
docs/01-business/INTENTGUARD_BUSINESS_PLAN.md and synthesize into:
- One-page business summary
- Patent portfolio summary
- Revenue strategy (3 phases)
- How the bot proves the patent works

## RULES
- Read files BEFORE writing about them
- Include file:line references for every claim
- Do NOT add emojis to prose (use in code templates only)
- Commit each task separately with descriptive messages
- Do NOT push to remote`;
