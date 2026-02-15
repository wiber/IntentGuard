# Architectural Decisions (Living Document)

> Synchronized from thetadrivencoach/openclaw on 2026-02-15.
> Source of truth: `/Users/thetadriven/github/thetadrivencoach/openclaw/data/spec.md`
>
> Migration spec status: 182 done / 49 todo (intentguard-migration-spec.html)

---

## Routing

- 12x12 tesseract grid categorization: message arrives, Ollama (llama3.2:1b) maps it to a grid coordinate, that coordinate maps to a room, and that room maps to a terminal for IPC dispatch.
- Full notation format: `emoji prefix fullname : emoji prefix fullname` (e.g., `B3 Tactics.Signal : C1 Operations.Grid`). Never abbreviated.
- Tile-to-room mapping: A1->vault, A2->architect, A3->performer, B1->navigator, B2->network, B3->voice, C1->builder, C2->laboratory, C3->operator.
- Messages dispatch to the TARGET room (the one the categorizer selects), not the source room where the message originated. Cross-room notification is sent back to the source.

### 12x12 Tesseract Axes

| Code | Full Name       |
|------|-----------------|
| A    | Strategy        |
| B    | Tactics         |
| C    | Operations      |
| A1   | Strategy.Law    |
| A2   | Strategy.Goal   |
| A3   | Strategy.Fund   |
| B1   | Tactics.Speed   |
| B2   | Tactics.Deal    |
| B3   | Tactics.Signal  |
| C1   | Operations.Grid |
| C2   | Operations.Loop |
| C3   | Operations.Flow |

---

## Model Routing (Hardness-Based)

All LLM calls go through the OpenClaw gateway at `127.0.0.1:18789`. The gateway is the single LLM router; everything else is a client.

| Hardness | Model                | When to use                |
|----------|----------------------|----------------------------|
| 1-2      | Ollama (llama3.2:1b) | Simple lookups, renames    |
| 3-4      | Sonnet (via gateway)  | Multi-step, complex reason |
| 5        | Opus (via gateway)    | Novel, creative, research  |

- Ollama handles hardness 1-2 locally at $0 cost, saving Claude API calls.
- Sonnet and Opus are invoked through the gateway, with CLI spawn as fallback (env `CLAUDECODE` is deleted to avoid nesting guard errors).
- Watchdog dispatches rooms via gateway API, not Claude CLI.

---

## FIM Auth (Geometric Overlap)

- `Permission(user, action) = Identity(user) intersection Requirement(action) >= Threshold`
- 20-dimensional identity vector derived from pipeline step-4 trust-debt grades.
- Per-tool requirements are defined in `action-map.ts`.
- Sovereignty score = f(trust_debt_grades, drift_events).
- Drift rate: 0.3% per drift event, exponential compounding.

---

## 9 Cognitive Rooms

Each room is bound to a specific macOS terminal application and IPC method.

| Room        | Terminal  | Coordinate         | IPC Method       |
|-------------|-----------|--------------------|--------------------|
| vault       | WezTerm   | A1 Strategy.Law    | wezterm CLI        |
| architect   | VS Code   | A2 Strategy.Goal   | System Events      |
| performer   | Terminal  | A3 Strategy.Fund   | AppleScript        |
| navigator   | Rio       | B1 Tactics.Speed   | System Events      |
| network     | Messages  | B2 Tactics.Deal    | System Events      |
| voice       | Terminal  | B3 Tactics.Signal  | AppleScript        |
| builder     | iTerm2    | C1 Operations.Grid | iTerm write text   |
| laboratory  | Cursor    | C2 Operations.Loop | System Events      |
| operator    | Kitty     | C3 Operations.Flow | kitty remote       |

- System Events rooms (Rio, Cursor, VS Code, Messages) are serialized to avoid focus races.
- Clipboard mutex prevents concurrent paste corruption across rooms.

---

## Federation

- Bots exchange identity vectors and compute tensor overlap to establish trust.
- Handshake protocol: vector exchange -> overlap compute -> channel open/reject.
- Auto-quarantine triggers when geometry drifts >0.003 from last known state.

---

## Task Generation

- Ollama worker generates tasks from the living spec (`data/spec.md`), NOT from raw corpus.
- Pending cap: 5 tasks per room before generating more.
- Max 2 tasks per room per cycle.
- Quality filter rejects bandwidth/throughput/packet hallucinations.

---

## Swarm Operations

- 50-agent swarm completed the migration from `thetadrivencoach` -> `IntentGuard`.
- Each agent claimed specific files with no overlap.
- Coordination via shared memory JSONL + git lock protocol.
- Swarm ID: `swarm-1771165611445`, 10 domains, mesh topology.

---

## Context Protocol

Every prompt sent to a model includes a structured context header:

```
=== TASK CONTEXT ===
INTERSECTION: <full notation>
QUESTION: <derived question>
HARDNESS: N/5 -> model
ROOM: <target room>
SPEC: [current spec state]
=== ROLLING CONTEXT ===
[last 50 lines from room]
=== PROMPT ===
[actual user prompt]
```

This replaces any flat prefix approach and ensures every model call has full situational awareness.

---

## Skills (6 Active)

| Skill                 | Purpose                                          |
|-----------------------|--------------------------------------------------|
| llm-controller        | Multi-LLM routing (Ollama, Sonnet, Whisper)      |
| claude-flow-bridge    | Terminal dispatch + model-aware routing           |
| voice-memo-reactor    | Discord voice memo transcription pipeline         |
| tesseract-trainer     | Training signal from reactions                    |
| thetasteer-categorize | 12x12 categorization + hardness estimation        |
| system-control        | Mouse, keyboard, screen, browser automation       |

---

## Change Log

- **2026-02-15**: Initial sync from thetadrivencoach living spec. 182/231 migration checklist items complete.
