# ThetaSteer Categorization Skill

**Agent #37 (skills group) — Swarm Migration Deliverable**

## Overview

Extended the ThetaSteer categorization system from 12 to 20 categories with an 8-tier color confidence system. This skill maps content to a comprehensive semantic grid for priority management and trust-debt analysis.

## Implementation Details

### File: `src/skills/thetasteer-categorize.ts` (434 LOC)

**Original System (12 categories):**
- **Strategy** (A): A1 Law, A2 Goal, A3 Fund
- **Tactics** (B): B1 Speed, B2 Deal, B3 Signal
- **Operations** (C): C1 Grid, C2 Loop, C3 Flow

**Extended System (+8 categories = 20 total):**
- **D1 Risk** 🛡️ — Risk management, security assessment → vault room
- **D2 Scale** 📈 — Scalability, growth, capacity → architect room
- **D3 Quality** ✨ — Quality assurance, standards → laboratory room
- **E1 Learn** 📚 — Learning, training, knowledge management → operator room
- **E2 Culture** 🌱 — Team culture, values, morale → voice room
- **E3 Innovation** 💡 — R&D, experimentation → navigator room
- **F1 Metrics** 📊 — Analytics, KPIs, measurement → builder room
- **F2 Governance** 📜 — Policies, procedures, compliance → vault room

### 8-Tier Color Confidence System

Replaces the original 3-tier (GREEN/RED/BLUE) system with granular confidence scoring:

| Tier | Confidence | Meaning | Action |
|------|------------|---------|--------|
| 🟢 GREEN | 0.9-1.0 | Highest confidence | Autonomous execution |
| 🔵 CYAN | 0.8-0.9 | Very high confidence | Minimal validation |
| 🟦 TEAL | 0.7-0.8 | High confidence | Local LLM handles |
| 🟠 AMBER | 0.6-0.7 | Moderate confidence | Lightweight review |
| 🟣 PURPLE | 0.5-0.6 | Medium confidence | Validation recommended |
| 🔴 RED | 0.3-0.5 | Low confidence | Human validation required |
| 🟣 INDIGO | 0.2-0.3 | Very low confidence | Escalate to Claude |
| 🔵 BLUE | 0.0-0.2 | Uncertain | Requires human judgment |

### Trust-Debt Dimension Mapping

Each of the 20 categories maps to 2-3 trust-debt dimensions for IAMFIM scoring:

**Example mappings:**
- **D1 (Risk)** → `['security', 'risk_assessment', 'reliability']`
- **E3 (Innovation)** → `['innovation', 'creativity', 'adaptability']`
- **F2 (Governance)** → `['compliance', 'process_adherence', 'accountability']`

### Backends (Prioritized Fallback Chain)

1. **ThetaSteer Rust daemon** (Unix socket `/tmp/theta-steer.sock`) — <50ms latency
2. **Ollama llama3.2:1b** (HTTP `localhost:11434`) — <200ms latency
3. **Keyword heuristic** — Instant fallback to default category (C:C1)

### Hardness Estimation & Model Routing

Automatically estimates task complexity (1-5 scale) and routes to appropriate model:

| Hardness | Description | Target Model |
|----------|-------------|--------------|
| 1 | Simple lookup (who/what/where) | ollama |
| 2 | Straightforward action (rename/move) | ollama |
| 3 | Multi-step task (implement feature) | sonnet |
| 4 | Complex reasoning (architecture/debug) | sonnet |
| 5 | Novel/creative (research/invention) | opus |

## Testing

### File: `src/skills/thetasteer-categorize.test.ts` (580 LOC)

**42 tests, 100% passing:**
- ✅ Initialization with custom config
- ✅ All 20 categories returned with emojis
- ✅ 8-tier color confidence mapping (all tiers validated)
- ✅ Extended category-to-room mapping (D1-D3, E1-E3, F1-F2)
- ✅ Trust dimension mapping for all 20 categories
- ✅ Full notation formatting (emoji + semantic names)
- ✅ Semantic question generation (diagonal vs off-diagonal)
- ✅ Hardness estimation & model routing (1→ollama, 3→sonnet, 5→opus)
- ✅ Error handling (ThetaSteer unavailable, malformed JSON, network failures)
- ✅ Input validation (invalid category codes, long text truncation)
- ✅ Logging & observability

### Run Tests

```bash
npx vitest run src/skills/thetasteer-categorize.test.ts
```

## Usage Example

```typescript
import ThetaSteerCategorizeSkill from './skills/thetasteer-categorize.js';

const skill = new ThetaSteerCategorizeSkill();
await skill.initialize(ctx);

const result = await skill.categorize('Implement security audit workflow', ctx);

console.log(result.data);
// {
//   row: 'D1',
//   col: 'C2',
//   tile_id: 'D1:C2',
//   full_notation: '🛡️ D1 Risk.Security : 🔄 C2 Operations.Loop',
//   semantic_question: 'What does Security mean in Loop?',
//   confidence: 0.82,
//   tier: 'CYAN',
//   hardness: 4,
//   target_model: 'sonnet',
//   target_room: 'vault',
//   reasoning: 'Security workflow implementation',
//   trustDimensions: ['security', 'risk_assessment', 'reliability']
// }
```

## Cognitive Room Dispatch

The categorization result's `target_room` field determines which cognitive room handles the task:

- **vault** — D1 Risk, F2 Governance, A1 Law
- **architect** — A2 Goal, D2 Scale
- **performer** — A3 Fund
- **navigator** — B1 Speed, E3 Innovation
- **network** — B2 Deal
- **voice** — B3 Signal, E2 Culture
- **builder** — C1 Grid, F1 Metrics
- **laboratory** — C2 Loop, D3 Quality
- **operator** — C3 Flow, E1 Learn

## Integration Points

### With Trust Debt Pipeline
- Agent 1 (Database Indexer) uses categorization for keyword extraction
- Agent 2 (Category Generator) validates against 20-category orthogonality
- Agent 4 (Grades Calculator) maps categories to trust dimensions

### With IAMFIM (Identity & Access Management via Full Intention Matching)
- Each task gets categorized before execution
- Trust dimensions inform permission requirements
- Color tier determines escalation path (GREEN=auto, BLUE=human)

### With Ollama (Local LLM)
- Hardness 1-2 tasks stay local for speed
- Cost tracking via `ollama-usage.jsonl`
- Fallback when ThetaSteer daemon unavailable

## Patent Coverage

This implementation supports the **20-category trust scoring system** referenced in provisional patent filing `63/XXX,XXX` (Jan 2025): "Asymmetric Matrix Trust Debt Calculation System."

## Commit

```
6130a82 swarm(skills/#37): Complete thetasteer-categorize with 20-category mapping and 8-tier color system
```

## Related Documentation

- Source file: `../thetadrivencoach/openclaw/skills/thetasteer-categorize.ts`
- Migration spec: `intentguard-migration-spec.html` (line 1603, 1816, 2025)
- Swarm coordination: `openclaw/data/coordination/swarm-memory.jsonl`

---

**Agent #37 Status:** ✅ COMPLETE
**Test Coverage:** 42/42 passing
**LOC:** 434 (implementation) + 580 (tests) = 1,014 total
