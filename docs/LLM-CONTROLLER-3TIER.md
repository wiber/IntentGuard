# LLM Controller - 3-Tier Routing System

**Agent #35 (skills)** | **Status:** ✅ Complete | **Commit:** 4e7911a, f4543a0

## Overview

Enhanced multi-LLM controller with intelligent 3-tier routing system that automatically escalates requests based on complexity, confidence, and cost constraints.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Controller                            │
│                  3-Tier Routing System                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ Cost Governor│
                    │  Check Budget│
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
      ┌─────────┐    ┌─────────┐   ┌─────────┐
      │ Tier 1  │───>│ Tier 2  │──>│ Tier 3  │
      │ Ollama  │    │ Sonnet  │   │ Human   │
      │(local)  │    │ (API)   │   │ Review  │
      └─────────┘    └─────────┘   └─────────┘
           │              │              │
           ▼              ▼              ▼
      Complexity     Confidence      Escalation
        1-2            Check           Queue
```

## Routing Logic

### Tier 1: Ollama (Local)
- **Handles:** Complexity 1-2
- **Model:** llama3.2:1b
- **Cost:** Free
- **Latency:** Fast (~100-500ms)
- **Use cases:** Simple categorization, lookups, formatting

**Fallback triggers:**
- Low confidence (< 0.7)
- Error/timeout
- Uncertain response phrases detected

### Tier 2: Sonnet (API/CLI)
- **Handles:** Complexity 3-4
- **Model:** claude-sonnet-4-20250514
- **Cost:** $0.003/1K input, $0.015/1K output
- **Latency:** Medium (~1-3s)
- **Use cases:** Reasoning, analysis, multi-step tasks

**Fallback triggers:**
- Low confidence (< 0.7)
- Error/timeout
- Complex reasoning required

### Tier 3: Human Review
- **Handles:** Complexity 5, failed tiers, explicit requests
- **Cost:** Manual review
- **Queue:** `data/human-review-queue.jsonl`
- **Use cases:** Critical decisions, uncertain outputs, high-stakes tasks

## Key Features

### 1. Cost Governor
```typescript
- Tracks daily API spending
- Auto-switches to Ollama when budget exceeded
- Logs to: data/coordination/ollama-usage.jsonl
- Configurable daily budget limit
```

### 2. Confidence Assessment
```typescript
assessConfidence(response: string): number {
  // Checks for:
  // - Uncertain phrases ("I'm not sure", "maybe", etc.)
  // - Response length
  // - Completeness indicators
  // Returns: 0.0 - 1.0 (threshold: 0.7)
}
```

### 3. Automatic Fallback
```typescript
Ollama attempt → Low confidence?
  ↓ Yes
Sonnet attempt → Still low confidence?
  ↓ Yes
Human escalation → Queue for review
```

### 4. Explicit Control
```typescript
{
  backend: 'ollama' | 'sonnet' | 'both' | 'auto',
  complexity: 1 | 2 | 3 | 4 | 5,
  requireHuman: boolean
}
```

## Usage Examples

### Auto-routing (recommended)
```typescript
await llmController.execute({
  prompt: "What is the capital of France?",
  complexity: 1,  // → Routes to Ollama
}, ctx);
```

### Explicit backend
```typescript
await llmController.execute({
  prompt: "Analyze this complex dataset",
  backend: 'sonnet',  // Force Sonnet
}, ctx);
```

### Force human review
```typescript
await llmController.execute({
  prompt: "Should we proceed with this critical decision?",
  requireHuman: true,  // → Routes to human queue
}, ctx);
```

### Parallel execution
```typescript
await llmController.execute({
  prompt: "Compare these two approaches",
  backend: 'both',  // Run Ollama + Sonnet in parallel
}, ctx);
```

## Cost Tracking

All LLM calls are logged to:
```
data/coordination/ollama-usage.jsonl
```

Format:
```json
{
  "ts": "2026-02-15T17:30:00Z",
  "agent": 35,
  "backend": "ollama",
  "model": "llama3.2:1b",
  "inputTokens": 128,
  "outputTokens": 64,
  "estimatedCost": 0.00
}
```

## Human Review Queue

Failed or uncertain requests queue to:
```
data/human-review-queue.jsonl
```

Format:
```json
{
  "timestamp": "2026-02-15T17:30:00Z",
  "prompt": "...",
  "systemPrompt": "...",
  "reason": "Both Ollama and Sonnet failed",
  "complexity": 5
}
```

## Audio Transcription

Fallback chain: **Whisper → Anthropic API → Claude CLI**

```typescript
await llmController.execute({
  audioUrl: "https://cdn.discord.com/audio.ogg",
  prompt: "Transcribe and summarize"
}, ctx);
```

### Whisper (Tier 1)
- **Model:** tiny
- **Cost:** Free
- **Latency:** ~2-5s
- **Accuracy:** Good for English

### Anthropic API (Tier 2)
- **Model:** claude-sonnet-4
- **Cost:** ~$0.05 per minute
- **Latency:** ~3-8s
- **Accuracy:** Excellent

### Claude CLI (Tier 3)
- **OAuth:** Uses local claude CLI
- **Cost:** Free (OAuth)
- **Latency:** ~5-10s
- **Accuracy:** Excellent

## Test Coverage

**378 LOC** of comprehensive tests covering:

- ✅ 3-tier routing logic
- ✅ Cost governor enforcement
- ✅ Confidence-based fallback
- ✅ Complexity-based routing
- ✅ Budget exceeded scenarios
- ✅ Human escalation
- ✅ Both mode parallel execution
- ✅ Audio transcription fallback
- ✅ Error handling and retries

Run tests:
```bash
npm test src/skills/llm-controller.test.ts
```

## Integration Points

### 1. Cost Reporter
```typescript
import CostReporter from './cost-reporter.js';
// Wired for budget enforcement
```

### 2. ThetaSteer Categorization
```typescript
// Uses llm-controller for complexity-based routing
// Hardness 1-2 → Ollama
// Hardness 3-5 → Sonnet or Human
```

### 3. Voice Memo Reactor
```typescript
// Uses transcription pipeline
// Whisper → API → CLI fallback
```

## Configuration

Set in environment or config:
```bash
OLLAMA_ENDPOINT=http://localhost:11434
ANTHROPIC_API_KEY=sk-...
DAILY_LLM_BUDGET=10.00  # USD
```

Or via config:
```typescript
ctx.config.get('integrations.ollama.endpoint')
ctx.config.get('cost.dailyBudget')
```

## Performance Metrics

| Backend | Avg Latency | Cost/1K tokens | Accuracy |
|---------|-------------|----------------|----------|
| Ollama  | 200ms       | $0.00          | Good     |
| Sonnet  | 2000ms      | $0.003-0.015   | Excellent|
| Human   | Manual      | Manual         | Perfect  |

## Future Enhancements

1. **Confidence ML Model:** Replace heuristics with trained confidence predictor
2. **Dynamic Thresholds:** Adjust based on historical accuracy
3. **Load Balancing:** Distribute across multiple Ollama instances
4. **Caching Layer:** Cache common queries to reduce costs
5. **A/B Testing:** Compare backend responses for training data

## Files

- `src/skills/llm-controller.ts` (548 LOC)
- `src/skills/llm-controller.test.ts` (378 LOC)
- `data/coordination/ollama-usage.jsonl` (usage log)
- `data/human-review-queue.jsonl` (escalation queue)

## Related Documentation

- [Cost Reporter](./cost-reporter-usage.md)
- [ThetaSteer Categorization](./THETASTEER-CATEGORIZE.md)
- [Voice Memo Reactor](./skills/VOICE-MEMO-REACTOR.md)

---

**Implemented by:** Agent #35 (skills)
**Date:** 2026-02-15
**Commits:** 4e7911a, f4543a0
