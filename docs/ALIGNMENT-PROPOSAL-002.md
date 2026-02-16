# Alignment Proposal AP-002: Channel Adapter Stub Drift & Phase Completion Over-Reporting

**Date:** 2026-02-15
**Drift Percentage:** ~18% (253 TODO/STUB markers across 21 src files)
**Priority:** HIGH
**Patent Reference:** IAMFIM Geometric Auth / Trust-Debt Pipeline (Sovereign Engine v2.5.0)

---

## Summary

Cross-referencing `intentguard-migration-spec.html` (v2.5.0) against `src/` reveals **systematic over-reporting of phase completion**. The spec marks Phase 3 (Multi-Channel) and several Phase 4-9 checklist items as "done" (green checkmarks), but the implementing code contains stub modes, TODO placeholders, and unresolved wiring gaps.

**Overall drift: ~18%** — 253 TODO/FIXME/STUB/placeholder occurrences across 21 source files, concentrated in `ceo-loop.ts` (96), `progress-tracker.ts` (27), `revenue-intake.ts` (24), and `scheduler.ts` (11).

---

## Finding 1 (HIGH): WhatsApp & Telegram Adapters are Stub Mode

### What the Spec Says
Phase 3 checklist marks these as done:
- "Create src/channels/whatsapp-adapter.ts skeleton with WhatsApp Web.js"
- "Wire WhatsApp adapter to channel-manager.ts"
- "Test WhatsApp message receive and reply"
- "Create src/channels/telegram-adapter.ts skeleton with node-telegram-bot-api"
- "Wire Telegram adapter to channel-manager.ts"
- "Test Telegram message receive and reply"

### What the Code Does
Both adapters detect missing npm dependencies at runtime and fall back to `STUB_MODE`:

```typescript
// src/channels/whatsapp-adapter.ts:39-40
this.log.warn('whatsapp-web.js not installed, adapter running in stub mode');
throw new Error('STUB_MODE');

// src/channels/telegram-adapter.ts:43-44
this.log.warn('node-telegram-bot-api not installed, adapter running in stub mode');
throw new Error('STUB_MODE');
```

Neither `whatsapp-web.js` nor `node-telegram-bot-api` appear in `package.json` dependencies. The "Test message receive and reply" items cannot have been tested against real services.

### Concrete Patch
Change spec Phase 3 status for 6 WhatsApp/Telegram items from `check-done` to `check-wip`. In the TSX section files:

```diff
- <li class="check-done">Create src/channels/whatsapp-adapter.ts skeleton with WhatsApp Web.js</li>
- <li class="check-done">Wire WhatsApp adapter to channel-manager.ts</li>
- <li class="check-done">Test WhatsApp message receive and reply</li>
+ <li class="check-done">Create src/channels/whatsapp-adapter.ts skeleton with WhatsApp Web.js</li>
+ <li class="check-wip">Wire WhatsApp adapter to channel-manager.ts</li>
+ <li class="check-wip">Test WhatsApp message receive and reply</li>
```

Same pattern for Telegram. The skeleton files exist (correctly marked done), but wiring and testing are WIP.

---

## Finding 2 (MEDIUM): CEO Loop Auto-Generator Produces Stub Artifacts

### What the Spec Says
Phase 9 (Autonomous Night Operations) is marked 10/10 green checkmarks.

### What the Code Does
`src/ceo-loop.ts` (844 LOC) has real loop logic with priority scoring, circuit breaker, and spec-watching. However, its `createSkeleton()` function generates files containing:

```typescript
// TODO: Implement
return { success: true, message: '${className} executed' };
```

And `addDiscordCommand()` produces placeholder handlers like:
```typescript
// TODO: Wire to wallet skill when ready
await message.reply('Wallet skill not yet connected.');
```

Note: `runtime.ts` has the REAL wired implementations for these commands (wallet, artifact, federation, grid). The stubs in `ceo-loop.ts` are the auto-generator's *template output*, not the production handlers.

### Concrete Patch
Add a note to Phase 9 in the spec:
> CEO loop generates skeleton implementations with TODO markers. Production command handlers are wired in runtime.ts.

---

## Finding 3 (LOW): Progress Tracker Not in Spec

`src/progress-tracker.ts` has 27 TODO markers and supports the CEO loop but is not referenced in any spec phase checklist.

### Concrete Patch
Add to Phase 9 checklist: `<li class="check-wip">Build progress-tracker.ts (completed/total/blocked counts per phase)</li>`

---

## What Is NOT Drifting (Verified Correct)

These spec claims are **accurate** — real implementations match descriptions:

| Component | LOC | Spec Claim | Verified |
|-----------|-----|-----------|----------|
| `wrapper.ts` | 630 | Unified entry, FIM plugin, 3-tier LLM | Correct |
| `runtime.ts` | 1,663 | Main orchestrator, 20+ commands | Correct |
| `geometric.ts` + test | 373 + 620 | 20-dim vector math, 44 tests | Correct (44 test cases confirmed) |
| `ceo-loop.ts` | 844 | Always-on, auto-subdivide, circuit breaker | Correct (core loop) |
| Pipeline steps 0-7 | 3,461 | 8-step pipeline, all done | Correct |
| `federation/` | 3,490 (13 files) | Handshake, tensor overlap, registry | Correct |
| `claude-flow-bridge.ts` | 732 | 9-room terminal IPC dispatch | Correct |
| `voice-memo-reactor.ts` | 248 | Whisper cascade, categorization | Correct |
| `llm-controller.ts` | 552 | 3-tier routing, cost governor | Correct |
| `scheduler.ts` | 555 | Night Shift, 17 tasks, sovereignty gating | Correct |
| `steering-loop.ts` | 349 | Ask-predict-execute, countdown timers | Correct |

---

## Recommendation

1. **Immediate (today):** Update 4 spec items from `check-done` to `check-wip` for WhatsApp/Telegram wiring+testing
2. **This week:** Install `whatsapp-web.js` and `node-telegram-bot-api` as optional deps, test real connectivity
3. **Ongoing:** Add automated drift scanning (the `spec-drift-scan` task in scheduler.ts already exists — verify it catches this class of drift)

---

*Generated by Recursive Documentation Mode | IntentGuard Sovereign Engine | AP-002*
