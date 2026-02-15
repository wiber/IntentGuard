# Sovereignty Score Monitoring System

**Version**: 1.0
**Status**: ✅ Complete
**Task**: Wire sovereignty score monitoring: trigger artifact on 30-day stability

## Overview

The Sovereignty Score Monitoring System tracks the bot's trust-debt sovereignty score over time and automatically triggers commemorative artifact generation when the score remains stable for 30 consecutive days.

## Architecture

```
Trust Debt Pipeline (Agent 4)
        ↓
4-grades-statistics.json
        ↓
Sovereignty Monitor
        ↓
data/sovereignty-history.jsonl (append-only log)
        ↓
Stability Detection (30-day window, ±5% threshold)
        ↓
data/stability-milestones.json
        ↓
Artifact Generator (commemorative 3D mesh)
```

## Components

### 1. Core Monitor (`src/monitor/sovereignty-monitor.ts`)

**Purpose**: Track sovereignty score history and detect stability milestones

**Key Functions**:
- `recordTodaySnapshot()` - Record daily sovereignty score from pipeline output
- `detectStability()` - Analyze history for 30-day stable windows
- `recordMilestone()` - Save stability milestone when achieved
- `triggerStabilityArtifact()` - Signal artifact generation system
- `monitorSovereignty()` - Main monitoring entry point

**Data Files**:
- `data/sovereignty-history.jsonl` - Append-only log of daily snapshots
- `data/stability-milestones.json` - Record of achieved milestones
- `4-grades-statistics.json` - Input from trust-debt pipeline

### 2. Scheduler Integration (`src/cron/scheduler.ts`)

**Task ID**: `sovereignty-stability-monitor`
**Risk**: Safe
**Cooldown**: 1440 minutes (24 hours)
**Min Sovereignty**: 0.4

**Behavior**:
- Runs once per day during proactive scheduler cycles
- Records today's sovereignty snapshot
- Checks for 30-day stability milestone
- Triggers artifact generation if milestone achieved
- Posts celebration to #trust-debt-public

### 3. CLI Tool (`src/cli/sovereignty-status.ts`)

**Commands**:
```bash
npm run sovereignty:status       # Current stability status
npm run sovereignty:milestones   # All milestones achieved
npm run sovereignty:history      # Historical snapshots
npm run sovereignty:monitor      # Manual monitoring run
```

**Output Format**:
```
🔍 Sovereignty Stability Status

🟢 Sovereignty Stability Monitor

Current Score: 0.820
Consecutive Stable Days: 25 / 30

⏳ 5 days until stability milestone

📊 Progress: 83.3% toward stability milestone
```

## Stability Criteria

### Window Parameters
- **Duration**: 30 consecutive days
- **Threshold**: ±0.05 (5% variance allowed)
- **Baseline**: Most recent sovereignty score

### Example
If today's sovereignty is 0.80:
- Valid range: 0.75 - 0.85
- All snapshots in past 30 days must fall within this range
- If day 15 had score 0.70, stability resets to 0 days

### Artifact Triggering
- **Minimum Sovereignty**: 0.6 (only commemorate high-quality stability)
- **Trigger Once**: No duplicate artifacts for same stable period
- **Integration**: Artifact generator receives milestone data for commemorative mesh

## Data Formats

### Sovereignty Snapshot (JSONL)
```jsonl
{"date":"2026-02-15","timestamp":"2026-02-15T12:00:00Z","score":0.82,"grade":"B","trustDebtUnits":950,"driftEvents":2,"source":"pipeline"}
```

### Stability Milestone (JSON)
```json
{
  "achievedAt": "2026-02-15T12:00:00Z",
  "startDate": "2026-01-16",
  "endDate": "2026-02-15",
  "durationDays": 30,
  "averageSovereignty": 0.82,
  "minSovereignty": 0.78,
  "maxSovereignty": 0.86,
  "variance": 0.08,
  "artifactTriggered": true,
  "artifactPath": "/tmp/artifact-stability-2026-01-16-to-2026-02-15.stl"
}
```

## Integration Points

### Trust Debt Pipeline
- **Source**: Agent 4 outputs sovereignty score to `4-grades-statistics.json`
- **Trigger**: Monitor reads this file daily to record snapshot
- **Format**: `{ sovereignty_score: 0.82, grade: "B", total_units: 950, drift_events: 2 }`

### CEO Loop
- **Hook**: CEO loop calls `monitorSovereignty()` during daily cycle
- **Action**: If milestone achieved, CEO triggers artifact generation
- **Notification**: Posts milestone achievement to #trust-debt-public

### Artifact Generator
- **Trigger**: `triggerStabilityArtifact()` returns milestone identifier
- **Input**: Milestone data including date range and average sovereignty
- **Output**: Commemorative 3D mesh with special "stability" designation
- **Flag**: Generated artifacts marked with `stability-milestone-{dates}` in filename

### Proactive Scheduler
- **Task**: Registered as `sovereignty-stability-monitor` (safe, daily)
- **Condition**: Only runs if `4-grades-statistics.json` exists
- **Cooldown**: 24 hours to avoid duplicate checks

## Usage Examples

### Manual Status Check
```bash
npm run sovereignty:status
```
Output shows current stability progress and days remaining.

### View All Milestones
```bash
npm run sovereignty:milestones
```
Lists all achieved stability milestones with artifact status.

### Automated Monitoring (Proactive Scheduler)
The scheduler automatically runs this task once per day:
1. Records today's sovereignty snapshot
2. Checks for 30-day stability
3. Creates milestone if achieved
4. Triggers artifact if sovereignty ≥ 0.6
5. Posts to #trust-debt-public

### Integration with Pipeline
```typescript
// After running Trust Debt pipeline (Agent 4)
import { monitorSovereignty } from './monitor/sovereignty-monitor.js';

const result = await monitorSovereignty(repoRoot, logger);

if (result.milestoneAchieved) {
  console.log('🎉 30-day stability milestone achieved!');
  // Trigger artifact generation
  await generateStabilityArtifact(result.milestone);
}
```

## Testing

### Test Coverage
- ✅ History loading and sorting
- ✅ Snapshot recording and deduplication
- ✅ 30-day stability detection
- ✅ Stability break detection
- ✅ Milestone recording and deduplication
- ✅ Artifact triggering with sovereignty threshold
- ✅ Report generation
- ✅ Edge cases (missing files, malformed data, gaps in history)

### Run Tests
```bash
npm test src/monitor/sovereignty-monitor.test.ts
```

## Monitoring Dashboard Integration

### Discord Bot Commands
```
!sovereignty-status    → Show current stability status
!sovereignty-history   → Show recent sovereignty snapshots
!milestones            → List all stability milestones
```

### Auto-Posting to #trust-debt-public
When milestone achieved:
```
🎉 STABILITY MILESTONE ACHIEVED! 🎉

Sovereignty has been stable for 30 consecutive days!

Period: 2026-01-16 to 2026-02-15
Average: σ=0.820
Range: 0.78 - 0.86
Variance: ±2.7%

🎨 Commemorative artifact generation initiated
```

## Future Enhancements

### Phase 2 (Optional)
- [ ] Multiple stability window sizes (7-day, 60-day, 90-day milestones)
- [ ] Trend analysis (improving vs declining sovereignty)
- [ ] Predictive alerts (risk of losing stability)
- [ ] Sovereignty decay detection (early warning system)
- [ ] Historical comparison charts (ASCII sparklines)
- [ ] Integration with spending limits (stable = higher limits)

### Phase 3 (Advanced)
- [ ] Machine learning stability forecasting
- [ ] Anomaly detection in sovereignty patterns
- [ ] Correlation analysis (drift events vs sovereignty)
- [ ] Multi-dimensional stability (per-category tracking)

## Maintenance

### Data Retention
- **History**: Append-only, no automatic cleanup (grows ~365 lines/year)
- **Milestones**: All milestones retained permanently
- **Manual Cleanup**: Use `data/cleanup.sh` if needed

### Troubleshooting

**Problem**: No snapshots recorded
**Solution**: Ensure trust-debt pipeline runs daily and outputs `4-grades-statistics.json`

**Problem**: Stability not detected despite stable scores
**Solution**: Check that variance is within ±0.05 threshold for all 30 days

**Problem**: Artifact not triggered
**Solution**: Verify sovereignty ≥ 0.6 and artifact generator is wired correctly

**Problem**: Duplicate milestones
**Solution**: System automatically prevents duplicates by checking date ranges

## Status

✅ **COMPLETE** - All components implemented and tested

### Deliverables
- [x] Core monitoring module with stability detection
- [x] Comprehensive test suite (30+ tests)
- [x] Scheduler integration (daily automated monitoring)
- [x] CLI tool for manual checks
- [x] Documentation (this file)
- [x] Artifact triggering system
- [x] Discord reporting integration points

### File Locations
```
src/monitor/sovereignty-monitor.ts         # Core module
src/monitor/sovereignty-monitor.test.ts    # Tests
src/cron/scheduler.ts                      # Scheduler integration
src/cli/sovereignty-status.ts              # CLI tool
docs/SOVEREIGNTY-MONITORING.md             # This documentation
```

## License

Part of IntentGuard - MIT License

---

**Last Updated**: 2026-02-15
**Author**: Builder Agent 10
**Integration**: Trust Debt Pipeline → CEO Loop → Artifact Generator
