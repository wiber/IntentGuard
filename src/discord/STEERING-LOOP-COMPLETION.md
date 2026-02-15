# Agent #20 Completion Report: Steering Loop Ask-and-Predict Protocol

**Date:** 2026-02-15
**Agent:** #20 (discord group)
**Task:** Complete steering-loop.ts with Ask-and-Predict protocol and sovereignty-based countdown timers

## ✅ Implementation Complete

### Files Modified/Created

1. **src/discord/steering-loop.ts** - Enhanced with sovereignty-based timeout logic
2. **src/discord/steering-loop.test.ts** - Created comprehensive test suite (17 tests)
3. **intentguard-migration-spec.html** - Updated with completion status

## 🎯 Key Features Implemented

### 1. Sovereignty-Based Countdown Timers

Implemented dynamic timeout calculation based on the bot's sovereignty score:

- **High Trust (≥0.8)**: 5-second countdown with 🟢 indicator
- **Moderate Trust (≥0.6)**: 30-second countdown with 🟡 indicator
- **Low Trust (<0.6)**: 60-second countdown with 🔴 indicator

```typescript
private getSovereigntyTimeout(): number {
  if (!this.config.useSovereigntyTimeouts) {
    return this.config.askPredictTimeoutMs;
  }
  const sovereignty = this.sovereigntyGetter();
  if (sovereignty >= 0.8) return 5000;   // High trust → 5s
  if (sovereignty >= 0.6) return 30000;  // Moderate → 30s
  return 60000;                           // Low → 60s
}
```

### 2. Enhanced Configuration

- Added `useSovereigntyTimeouts` flag to `SteeringConfig`
- Added optional `SovereigntyGetter` callback to constructor
- Maintains backward compatibility with fixed timeouts

### 3. Visual Sovereignty Indicators

Prediction messages now show trust level clearly:
- `🟢 High trust — 5s countdown`
- `🟡 Moderate — 30s countdown`
- `🔴 Low trust — 60s countdown`

## 🧪 Test Coverage

Created comprehensive test suite with **17 tests** covering:

### Sovereignty-Based Countdown Timers (4 tests)
- ✅ 5s timeout for high sovereignty (≥0.8)
- ✅ 30s timeout for moderate sovereignty (≥0.6, <0.8)
- ✅ 60s timeout for low sovereignty (<0.6)
- ✅ Config timeout when useSovereigntyTimeouts is false

### Admin Instant Execution (2 tests)
- ✅ Execute admin messages immediately without countdown
- ✅ Mark admin execution as aborted on failure

### Trusted Ask-and-Predict Flow (2 tests)
- ✅ Post prediction message and auto-execute after countdown
- ✅ Don't execute if aborted before countdown completes

### General Suggestion Queue (1 test)
- ✅ Post suggestion without auto-execution

### Admin Blessing Mechanism (2 tests)
- ✅ Execute general suggestion when admin blesses it
- ✅ Return false if blessing non-existent message

### Redirect Logic (2 tests)
- ✅ Abort current prediction and start new one on redirect
- ✅ Return null if no pending prediction to redirect

### Emergency Abort (1 test)
- ✅ Abort all pending predictions

### Utility Methods (2 tests)
- ✅ Return active predictions
- ✅ Check if room has pending prediction

### Concurrent Predictions (1 test)
- ✅ Warn when max concurrent predictions reached

## ✨ Test Results

```bash
$ npx vitest run src/discord/steering-loop.test.ts

✓ src/discord/steering-loop.test.ts (17 tests) 16ms

Test Files  1 passed (1)
     Tests  17 passed (17)
  Start at  11:24:18
  Duration  206ms (transform 87ms, setup 0ms, import 103ms, tests 16ms, environment 0ms)
```

## 📊 Technical Details

### Architecture Alignment

The implementation follows the IntentGuard sovereignty principles:

1. **Trust-Aware Execution**: Countdown timers scale with trust level
2. **Transparent Operation**: Visual indicators show why timeouts differ
3. **Graceful Degradation**: Falls back to config timeouts when sovereignty tracking disabled
4. **Audit Trail**: All predictions logged with sovereignty context

### Integration Points

- **Runtime**: Integrates with `getSovereigntyTimeout()` from src/runtime.ts
- **Pipeline**: Sovereignty score loaded from Trust Debt pipeline step 4
- **Discord**: Prediction messages show trust level to users
- **Scheduler**: Night shift scheduler can use varied timeouts based on bot trust

## 🔗 Related Components

The steering loop interacts with:

- `src/runtime.ts` - Main bot runtime with sovereignty tracking
- `src/cron/scheduler.ts` - Proactive task scheduler
- `src/discord/authorized-handles.ts` - User permission tiers
- `src/auth/sovereignty.ts` - Sovereignty score calculation
- `src/pipeline/step-4.ts` - Trust debt grading and sovereignty

## 📝 Spec Update

Added completion section to `intentguard-migration-spec.html`:

```html
<section>
  <h3>✅ Agent #20 Completion: Steering Loop Ask-and-Predict Protocol</h3>
  <ul class="checklist">
    <li class="check-done">Added getSovereigntyTimeout() method</li>
    <li class="check-done">Updated handleMessage() to use dynamic timeouts</li>
    <li class="check-done">Enhanced prediction messages with sovereignty indicators</li>
    <li class="check-done">Added optional SovereigntyGetter callback</li>
    <li class="check-done">Created steering-loop.test.ts with 17 tests</li>
    <li class="check-done">Verified all tests passing</li>
  </ul>
  <div>Status: ✓ COMPLETE</div>
</section>
```

## 🎉 Summary

The Ask-and-Predict protocol is now fully operational with sovereignty-aware execution timing. The system can dynamically adjust its behavior based on trust levels:

- High-trust bot = fast 5s execution (responsive, confident)
- Moderate-trust bot = 30s buffer (cautious, allows intervention)
- Low-trust bot = 60s delay (conservative, maximum oversight window)

This creates a self-regulating system where the bot's autonomy scales with its demonstrated trustworthiness, embodying the core IntentGuard philosophy of earned sovereignty.

---

**Agent #20 (discord) - Task Complete**
