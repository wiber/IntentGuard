# Sovereignty Score Monitoring System

**Status:** ✅ Complete - Phase 7 Task 10
**Agent:** #10 (autonomous-builder)
**Date:** 2026-02-15

## Overview

The Sovereignty Monitor tracks the bot's trust-debt score over time and automatically triggers **artifact generation** when sovereignty remains stable for **30 consecutive days**.

This implements the "stability milestone" concept from the IntentGuard migration spec: when the system proves its reliability through sustained stability, it generates a commemorative 3D artifact representing its identity at that moment.

## Architecture

```
Trust-Debt Pipeline (Agent 0-7)
  ↓ Produces 4-grades-statistics.json
recordSovereigntyFromPipeline()
  ↓ Appends to sovereignty-history.jsonl
SovereigntyMonitor.checkStability()
  ↓ Daily analysis (via scheduler)
  ├─ analyzeStability() → checks 30-day window
  │   ├─ Score variance ≤ 0.05? ✅
  │   └─ 30+ consecutive days? ✅
  └─ If stable milestone achieved:
      ├─ Generate artifact → artifact-generator.ts
      ├─ Record milestone → sovereignty-milestones.json
      └─ Send notification → Discord #trust-debt-public
```

## Files Created

### Core Implementation

- **`src/auth/sovereignty-monitor.ts`** (820 lines)
  - `SovereigntyMonitor` class with artifact/notification binding
  - `analyzeStability()` — 30-day stability detection
  - `recordMeasurement()` — JSONL history logging
  - `loadHistory()` — Historical data retrieval
  - Milestone tracking and trend analysis

- **`src/auth/sovereignty-monitor.test.ts`** (500+ lines)
  - 14 comprehensive test cases
  - Coverage: history, stability, trends, milestones, callbacks
  - All tests passing ✅

- **`src/runtime-sovereignty-integration.ts`** (150+ lines)
  - `initializeSovereigntyMonitor()` — Runtime binding
  - `recordSovereigntyFromPipeline()` — Pipeline integration
  - `handleStabilityCheck()` — Scheduler task handler
  - Example artifact and Discord wiring

### Integration Points

- **`src/cron/scheduler.ts`** (modified)
  - Added `sovereignty-stability-check` proactive task
  - Runs daily at 8am-10am
  - Safe tier (min sovereignty 0.5)
  - 24-hour cooldown

### Data Files

- **`data/sovereignty-history.jsonl`** (append-only log)
  - One measurement per day
  - Format: `{timestamp, score, grade, trustDebtUnits, driftEvents, source}`

- **`data/sovereignty-milestones.json`** (milestone records)
  - Tracks each 30-day stability achievement
  - Format: `[{achievedAt, score, stableDays, artifactGenerated, artifactPath, notificationSent}]`

## Stability Criteria

The system considers sovereignty **stable** when:

1. **Variance ≤ 0.05** (±5%) over the measurement window
2. **30 consecutive days** of measurements within variance threshold
3. **No measurement breaks** (daily data must be continuous)

### Trend Detection

The monitor also tracks trend direction:

- **Upward**: Score increasing over last 7 days
- **Downward**: Score decreasing over last 7 days
- **Stable**: Score flat (< 1% change)

Trend strength: 0.0 (flat) to 1.0 (strong movement)

## Usage

### 1. Initialize Monitor (Runtime Startup)

```typescript
import { initializeSovereigntyMonitor } from './runtime-sovereignty-integration.js';

const monitor = initializeSovereigntyMonitor(
  logger,
  async (score, days) => {
    // Generate artifact on 30-day stability
    const artifact = await artifactGenerator.execute({
      action: 'generate',
      identity: await loadIdentityFromPipeline(userId),
    });
    return artifact.data.stlPath;
  },
  async (message) => {
    // Send Discord notification
    await discordClient.channels.cache.get(trustDebtChannelId).send(message);
  }
);
```

### 2. Record from Pipeline (After Step 4)

```typescript
import { recordSovereigntyFromPipeline } from './runtime-sovereignty-integration.js';

// After trust-debt pipeline completes
await runPipelineStep4();
recordSovereigntyFromPipeline(monitor, logger);
```

### 3. Daily Stability Check (Scheduler)

```typescript
import { handleStabilityCheck } from './runtime-sovereignty-integration.js';

// Scheduler proactive task (runs daily at 8am-10am)
const result = await handleStabilityCheck(monitor, logger);
console.log(result); // "⏳ Stability progress: 15/30 days"
```

### 4. Manual Status Check

```typescript
import { getSovereigntyStatus } from './runtime-sovereignty-integration.js';

// For !ceo-status or dashboard
const status = getSovereigntyStatus(monitor);
console.log(status);
// Output:
// 📊 Sovereignty Monitor Status
// Enabled: ✅
// Latest Score: 0.850
// Stable Days: 15/30
// Status: 🟡 Monitoring
```

## API Reference

### `SovereigntyMonitor` Class

#### Constructor

```typescript
new SovereigntyMonitor(log: Logger, config: MonitorConfig)
```

#### Methods

- **`bindArtifactGenerator(callback)`** — Set artifact generation callback
- **`bindNotification(callback)`** — Set Discord notification callback
- **`recordFromPipeline(calculation)`** — Record sovereignty from pipeline step 4
- **`checkStability(): Promise<StabilityAnalysis>`** — Check for 30-day stability (triggers artifact)
- **`getStatus()`** — Get current monitoring status

### Standalone Functions

- **`recordMeasurement(measurement)`** — Append to history JSONL
- **`loadHistory(days?)`** — Load measurements (default: 90 days)
- **`getLatestMeasurement()`** — Get most recent measurement
- **`analyzeStability(config?)`** — Calculate stability metrics
- **`recordMilestone(milestone)`** — Save milestone record
- **`loadMilestones()`** — Load all milestones
- **`hasRecentMilestone(withinDays?)`** — Check for recent milestone (prevents duplicates)
- **`generateHistoryReport(days?)`** — Discord-friendly history summary
- **`exportHistoryCSV(days?)`** — Export data for external analysis

## Configuration

```typescript
interface MonitorConfig {
  enabled: boolean;              // Enable/disable monitoring
  checkIntervalHours: number;    // How often to check (default: 24)
  autoGenerateArtifact: boolean; // Auto-generate on milestone (default: true)
  notifyDiscord: boolean;        // Send Discord notification (default: true)
  stabilityThreshold: number;    // Variance threshold (default: 0.05)
  stabilityPeriodDays: number;   // Stability period (default: 30)
}
```

Default configuration:
```typescript
{
  enabled: true,
  checkIntervalHours: 24,
  autoGenerateArtifact: true,
  notifyDiscord: true,
  stabilityThreshold: 0.05,
  stabilityPeriodDays: 30,
}
```

## Milestone Message Example

When 30-day stability is achieved:

```
🎉 **STABILITY MILESTONE ACHIEVED** 🎉

**Sovereignty Score:** 0.850
**Stable Duration:** 30 days
**Average Score:** 0.848
**Score Variance:** 2.35%
**Trend:** stable (15% strength)

**Artifact Generated:** ✅
`user-stability-30d-0.850-2026-02-15T10-30-00-000Z.stl`

**Ceremony Message:**
> Thirty days of unwavering sovereignty. The Fractal Identity has proven itself.
> Trust debt remains stable. The system holds its shape. This moment is worthy of record.

*Sovereign stability: the foundation of autonomous operation.*
```

## Test Coverage

All 14 tests passing ✅

### Test Cases

1. Record and load measurements
2. Get latest measurement
3. Stability detection - stable case (30 days)
4. Stability detection - unstable case (volatile)
5. Trend detection - upward
6. Trend detection - downward
7. Milestone recording
8. Recent milestone detection
9. Monitor class - artifact callback
10. Monitor class - notification callback
11. History report generation
12. CSV export
13. Monitor status
14. No duplicate artifact generation

### Run Tests

```bash
npm test -- sovereignty-monitor.test.ts
```

## Integration with Existing Systems

### Trust-Debt Pipeline

- **Input:** `4-grades-statistics.json` from pipeline step 4
- **Integration:** `recordSovereigntyFromPipeline()` reads pipeline output
- **Frequency:** Once per pipeline run (daily/weekly)

### Artifact Generator

- **Callback:** `monitor.bindArtifactGenerator(async (score, days) => {...})`
- **Trigger:** Automatic on 30-day stability
- **Output:** STL file + metadata JSON in `data/artifacts/`

### Scheduler (Night Shift)

- **Task ID:** `sovereignty-stability-check`
- **Schedule:** Daily at 8am-10am
- **Risk:** Safe (min sovereignty 0.5)
- **Handler:** `handleStabilityCheck(monitor, logger)`

### Discord Notifications

- **Callback:** `monitor.bindNotification(async (message) => {...})`
- **Channel:** `#trust-debt-public`
- **Content:** Milestone ceremony + artifact preview

## Data Persistence

### History Log Format (JSONL)

```jsonl
{"timestamp":"2026-02-15T10:00:00.000Z","score":0.85,"grade":"A","trustDebtUnits":450,"driftEvents":0,"source":"pipeline"}
{"timestamp":"2026-02-14T10:00:00.000Z","score":0.84,"grade":"A","trustDebtUnits":480,"driftEvents":0,"source":"pipeline"}
```

### Milestone Format (JSON)

```json
[
  {
    "achievedAt": "2026-02-15T10:30:00.000Z",
    "score": 0.85,
    "stableDays": 30,
    "artifactGenerated": true,
    "artifactPath": "/data/artifacts/user-stability-30d-0.850-2026-02-15T10-30-00-000Z.stl",
    "notificationSent": true
  }
]
```

## Future Enhancements

- [ ] Multi-user tracking (per-user sovereignty history)
- [ ] Web dashboard visualization (sovereignty graph over time)
- [ ] Configurable stability periods (7-day, 14-day, 90-day milestones)
- [ ] Automatic artifact gallery updates
- [ ] Historical artifact comparison timeline
- [ ] Alert thresholds (notify on significant drops)
- [ ] Export to external monitoring systems (Prometheus, Grafana)
- [ ] Machine learning trend prediction

## Troubleshooting

### No measurements recorded

**Check:**
- Pipeline step 4 runs successfully
- `4-grades-statistics.json` exists and has `sovereignty_score` field
- `recordSovereigntyFromPipeline()` called after pipeline
- `data/` directory writable

### Stability not detected after 30 days

**Check:**
- Measurements are consecutive (no gaps)
- Score variance within ±0.05 threshold
- Use `analyzeStability()` to see current stable days count

### Duplicate artifact generation

**Check:**
- `hasRecentMilestone(30)` should prevent duplicates
- Milestone records properly saved to `sovereignty-milestones.json`
- Monitor bound callbacks only once at startup

### Scheduler task not running

**Check:**
- Scheduler enabled in config
- Task hour window (8am-10am) matches your timezone
- Sovereignty ≥ 0.5 (task requirement)
- 24-hour cooldown hasn't blocked execution

## License & Attribution

Part of IntentGuard autonomous builder system.
Implements Phase 7 Task 10: "Wire sovereignty score monitoring: trigger artifact on 30-day stability"

**Author:** Agent #10 (autonomous-builder)
**Date:** 2026-02-15
**Status:** ✅ Production Ready
