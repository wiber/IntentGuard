# FIM Audit Logger

**Agent #15 (auth) - Complete**

## Overview

Comprehensive audit trail for all FIM (Fractal Identity Matrix) permission decisions. Every tool call is logged with timestamp, tool name, overlap score, sovereignty score, and decision outcome (ALLOW/DENY).

## Features

✅ **Comprehensive Logging**: Captures both ALLOW and DENY decisions
✅ **JSONL Format**: Append-only, one decision per line
✅ **Query Interface**: Filter by decision, tool, skill, user, session, time range
✅ **Statistics**: Counts, rates, averages, top denied tools/skills
✅ **Session Tracking**: UUID v4 session IDs for grouping related decisions
✅ **Error Handling**: Fails gracefully, never breaks execution
✅ **Test Coverage**: 28/28 tests passing

## Files

- `src/auth/audit-logger.js` - Main implementation (CommonJS)
- `src/auth/audit-logger.ts` - TypeScript definitions
- `tests/auth/audit-logger.test.js` - Comprehensive test suite
- `data/fim-audit.jsonl` - Audit log file (created automatically)

## Usage

### Basic Integration

```javascript
const { FimAuditLogger } = require('./src/auth/audit-logger');
const { checkPermission } = require('./src/auth/geometric');

// Create logger
const logger = new FimAuditLogger('./data', 'user-123');

// Log ALLOW decision
const result = checkPermission(identity, requirement);
if (result.allowed) {
  logger.logAllow('shell_execute', 'claude-flow-bridge', result);
} else {
  logger.logDeny('shell_execute', 'claude-flow-bridge', result);
}
```

### Integration with fim-interceptor.ts

```typescript
// In fim-interceptor.ts, add audit logger
import { FimAuditLogger } from './audit-logger.js';

export class FimInterceptor {
  private auditLogger: FimAuditLogger;

  constructor(log: Logger, dataDir: string) {
    this.log = log;
    this.dataDir = dataDir;
    this.identity = this.loadLatestIdentity();
    this.auditLogger = new FimAuditLogger(dataDir); // Add this
  }

  async intercept(skillName: string, payload: unknown): Promise<SkillResult | null> {
    // ... existing code ...

    const result = checkPermission(this.identity, requirement);

    if (result.allowed) {
      this.consecutiveDenials = 0;
      this.auditLogger.logAllow(toolName, skillName, result); // Add this
      return null;
    }

    // DENIED
    this.consecutiveDenials++;
    this.totalDenials++;
    this.auditLogger.logDeny(toolName, skillName, result); // Add this

    // ... rest of denial handling ...
  }
}
```

### Querying Audit Log

```javascript
// Query all decisions
const allDecisions = logger.query();

// Filter by decision type
const denials = logger.query({ decision: 'DENY' });
const allows = logger.query({ decision: 'ALLOW' });

// Filter by tool
const shellExecutions = logger.query({ toolName: 'shell_execute' });

// Filter by time range
const recentDecisions = logger.query({
  startTime: '2026-02-15T00:00:00Z',
  endTime: '2026-02-15T23:59:59Z'
});

// Combine filters
const deniedShellExecutions = logger.query({
  decision: 'DENY',
  toolName: 'shell_execute'
});
```

### Getting Statistics

```javascript
// Get overall statistics
const stats = logger.getStats();
console.log(`Total decisions: ${stats.totalDecisions}`);
console.log(`Allow rate: ${(stats.allowRate * 100).toFixed(1)}%`);
console.log(`Average overlap: ${stats.averageOverlap.toFixed(3)}`);
console.log(`Average sovereignty: ${stats.averageSovereignty.toFixed(3)}`);

// Get statistics for specific filters
const denialStats = logger.getStats({ decision: 'DENY' });
console.log('Top denied tools:', denialStats.topDeniedTools);
console.log('Top denied skills:', denialStats.topDeniedSkills);
```

## Audit Record Format

Each line in `data/fim-audit.jsonl` is a JSON object:

```json
{
  "timestamp": "2026-02-15T10:00:00.000Z",
  "decision": "ALLOW",
  "toolName": "shell_execute",
  "skillName": "claude-flow-bridge",
  "overlap": 0.85,
  "sovereignty": 0.72,
  "threshold": 0.8,
  "minSovereignty": 0.6,
  "failedCategories": [],
  "userId": "default",
  "sessionId": "a1b2c3d4-e5f6-4789-a012-3456789abcde"
}
```

For DENY decisions, `failedCategories` contains details:

```json
{
  "timestamp": "2026-02-15T10:05:00.000Z",
  "decision": "DENY",
  "toolName": "shell_execute",
  "skillName": "claude-flow-bridge",
  "overlap": 0.65,
  "sovereignty": 0.55,
  "threshold": 0.8,
  "minSovereignty": 0.6,
  "failedCategories": [
    "security: 0.60 < 0.70",
    "reliability: 0.45 < 0.50"
  ],
  "userId": "default",
  "sessionId": "a1b2c3d4-e5f6-4789-a012-3456789abcde"
}
```

## Statistics Object

```javascript
{
  totalDecisions: 100,         // Total number of decisions logged
  allowCount: 85,              // Number of ALLOW decisions
  denyCount: 15,               // Number of DENY decisions
  allowRate: 0.85,             // Proportion of allowed (0.0-1.0)
  averageOverlap: 0.82,        // Average overlap score
  averageSovereignty: 0.75,    // Average sovereignty score
  topDeniedTools: [            // Top 5 most denied tools
    { tool: 'shell_execute', count: 8 },
    { tool: 'git_force_push', count: 4 },
    { tool: 'file_delete', count: 3 }
  ],
  topDeniedSkills: [           // Top 5 most denied skills
    { skill: 'system-control', count: 5 },
    { skill: 'deploy-tool', count: 4 },
    { skill: 'claude-flow-bridge', count: 3 }
  ]
}
```

## Test Coverage

28 comprehensive tests covering:

- ✅ Constructor (default/custom userId/sessionId)
- ✅ ALLOW decision logging (single/multiple)
- ✅ DENY decision logging (single/multiple with failed categories)
- ✅ Query filtering (decision, tool, skill, user, session, time range, combined)
- ✅ Statistics computation (counts, rates, averages, top denied)
- ✅ JSONL format validation
- ✅ Error handling (missing files, permission failures)
- ✅ Session ID generation (UUID v4 format, uniqueness)

Run tests:
```bash
npm test -- tests/auth/audit-logger.test.js
```

## Integration Checklist

- [ ] Import FimAuditLogger in fim-interceptor.ts
- [ ] Initialize logger in FimInterceptor constructor
- [ ] Call logAllow() for successful permission checks
- [ ] Call logDeny() for failed permission checks
- [ ] Add audit statistics to admin dashboard
- [ ] Create compliance report generator using query interface
- [ ] Set up log rotation for data/fim-audit.jsonl (optional)

## Future Enhancements

- [ ] Log rotation (compress old logs, limit file size)
- [ ] Export to external audit systems
- [ ] Real-time dashboard for monitoring decisions
- [ ] Alert system for unusual denial patterns
- [ ] Integration with Trust Debt pipeline for sovereignty updates

## Status

✅ **COMPLETE** - Ready for production integration

Agent #15 (auth) - 2026-02-15
