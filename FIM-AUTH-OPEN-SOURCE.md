# FIM Auth Layer - Fully Open Source 🎉

**Fractal Identity Map (IAMFIM)**: Geometric Permission System for AI Agents

The FIM authentication layer is now **fully open-sourced** as part of IntentGuard. Use it standalone or integrate it into your own AI governance systems.

## 🎯 What is FIM Auth?

FIM Auth is a **mathematical permission engine** that uses 20-dimensional trust vectors to determine whether an AI agent or user should be allowed to execute specific actions. Instead of traditional role-based access control (RBAC), FIM uses **geometric overlap** in a trust-debt vector space.

### Core Innovation

**Permission = Geometric Overlap in 20D Trust Space**

```
Permission(user, action) = Identity(user) ∩ Requirement(action) >= Threshold
```

Where:
- **Identity** = 20-dimensional vector of trust scores (0.0-1.0 per category)
- **Requirement** = Sparse vector defining minimum scores per category
- **Overlap** = Proportion of categories meeting requirements
- **Threshold** = Minimum overlap required (default 0.8)

## Core Innovation

### The Permission Equation

```
Permission(user, action) = Identity(user) ∩ Requirement(action) >= Threshold
```

Where:
- **Identity** = 20-dimensional vector derived from trust-debt analysis
- **Requirement** = Sparse vector defining minimum scores per category
- **Overlap** = Cosine similarity (geometric alignment)
- **Threshold** = Minimum overlap required (default 0.8)

### Why Geometric?

Traditional permission systems use **discrete logic** (true/false, allow/deny). FIM uses **continuous mathematics**:

1. **Identity is a vector** - Not a role, but a point in 20D trust space
2. **Actions have coordinates** - Each tool has geometric requirements
3. **Permission is overlap** - Computed via cosine similarity
4. **Drift is measurable** - Consecutive denials indicate misalignment

This creates a **self-healing feedback loop** between permission enforcement and trust measurement.

## What's Included

### Core Modules (All Open Source!)

1. **`geometric.ts`** - 20-dimensional vector math
   - Dot product, magnitude, cosine similarity
   - Overlap computation (0.0004ms latency)
   - Permission checking with sovereignty gate

2. **`action-map.ts`** - 40+ action requirements
   - Git operations (push, force-push, commit, delete)
   - File system (read, write, delete)
   - Database (write, delete)
   - Communication (email, SMS, Discord, Twitter)
   - Deployment (staging, production, restart, config)
   - Financial (payments, refunds, transfers)
   - User management (create, delete, permissions)

3. **`sovereignty.ts`** - Sovereignty score calculation
   - Trust debt to sovereignty mapping
   - Drift reduction formula: `sovereignty *= (1 - k_E)^driftEvents`
   - Recovery path forecasting

4. **`identity-vector.ts`** - Identity loading from pipeline
   - Loads from `4-grades-statistics.json`
   - 20-dimensional vector construction
   - Category score mapping
   - Caching with 5-minute TTL

5. **`fim-interceptor.ts`** - Runtime enforcement
   - Intercepts skill execution
   - Drift detection (3 consecutive denials)
   - Triggers pipeline re-run
   - Audit logging to JSONL

6. **`audit-logger.ts`** - Permission audit trail
   - JSONL format for easy parsing
   - Timestamps, overlap scores, failed categories
   - Filterable by user, tool, time range

7. **`plugin.ts`** - OpenClaw plugin generation
   - Generates standalone JavaScript plugin
   - Installs to `~/.openclaw/plugins/`
   - Zero dependencies in plugin code

8. **`benchmark.ts`** - Performance benchmarking
   - Measures overlap computation latency
   - Validates 0.0004ms target
   - Generates performance reports

### The 20 Trust-Debt Categories

Each identity vector has scores for these orthogonal dimensions:

1. **security** - Protection against unauthorized access
2. **reliability** - Consistent, predictable behavior
3. **data_integrity** - Accuracy and consistency of data
4. **process_adherence** - Following established workflows
5. **code_quality** - Maintainable, well-structured code
6. **testing** - Test coverage and quality
7. **documentation** - Clear, up-to-date documentation
8. **communication** - Clear, timely communication
9. **time_management** - Meeting deadlines and efficiency
10. **resource_efficiency** - Optimal resource usage
11. **risk_assessment** - Identifying and mitigating risks
12. **compliance** - Adherence to regulations and standards
13. **innovation** - Creative problem-solving
14. **collaboration** - Working effectively with others
15. **accountability** - Ownership of actions and outcomes
16. **transparency** - Openness about decisions
17. **adaptability** - Flexibility in changing conditions
18. **domain_expertise** - Deep knowledge of relevant domains
19. **user_focus** - Prioritizing user needs
20. **ethical_alignment** - Adherence to ethical principles

## Quick Start

### Installation

```bash
npm install intentguard
```

### Basic Permission Check

```typescript
import {
  checkPermission,
  loadIdentityFromPipeline,
  getActionRequirement
} from 'intentguard/auth';

// Load identity from trust-debt pipeline
const identity = loadIdentityFromPipeline('./data/pipeline-runs/latest');

// Check permission for git push
const requirement = getActionRequirement('git_push');
const result = checkPermission(identity, requirement);

if (result.allowed) {
  console.log('✅ Allowed - overlap:', result.overlap.toFixed(3));
  // Execute git push
} else {
  console.log('❌ Denied - failed:', result.failedCategories.join(', '));
}
```

### Runtime Enforcement

```typescript
import { FimInterceptor } from 'intentguard/auth';

const interceptor = new FimInterceptor(logger, './data');

// Configure denial callback
interceptor.onDenial = async (event) => {
  console.log('🔴 FIM DENIED:', event.toolName);
  // Post to Discord, alert team, etc.
};

// Configure drift threshold callback (3 consecutive denials)
interceptor.onDriftThreshold = async () => {
  console.log('⚠️  Drift threshold - recalibrating');
  // Run trust-debt pipeline, reload identity
  interceptor.reloadIdentity();
};

// Intercept skill execution
const denial = await interceptor.intercept('shell_execute', payload);
if (!denial) {
  // Allowed - execute skill
}
```

## Examples

See the `/examples` directory for comprehensive examples:

- **`fim-auth-basic.ts`** - Basic permission checking workflow
- **`fim-auth-interceptor.ts`** - Runtime enforcement with callbacks

Run examples:

```bash
npx tsx examples/fim-auth-basic.ts
npx tsx examples/fim-auth-interceptor.ts
```

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ Trust Debt Pipeline (Agents 0-7)                             │
│                                                               │
│ Agent 4: Calculate grades & statistics                       │
└────────────────────────────┬─────────────────────────────────┘
                              │
                              ▼
                ┌─────────────────────────┐
                │ 4-grades-statistics.json │
                └────────────┬─────────────┘
                              │
                              ▼
                ┌─────────────────────────┐
                │ Identity Vector Loader   │
                │ (20-dimensional)         │
                └────────────┬─────────────┘
                              │
                              ▼
                ┌─────────────────────────┐
                │ FIM Interceptor          │
                │ (runtime enforcement)    │
                └────────────┬─────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                      ▼                      ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ Permission   │    │ Audit Log        │    │ Drift Track  │
│ Check        │    │ (JSONL)          │    │ (heat map)   │
│ (overlap≥0.8)│    │                  │    │              │
└──────────────┘    └──────────────────┘    └──────────────┘
```

## Performance

FIM is designed for **real-time permission enforcement**:

| Operation | Latency |
|-----------|---------|
| Overlap computation | **0.0004ms** |
| Permission check | **0.0005ms** |
| Identity load (cached) | **0.001ms** |
| Identity load (fresh) | **2.5ms** |

Benchmarked on MacBook Pro M1, Node.js 20.x

## Integration Patterns

### Pattern 1: Standalone Permission Checks

Use FIM for one-off permission checks without runtime interception:

```typescript
import { checkPermission, loadIdentityFromPipeline, getActionRequirement } from 'intentguard/auth';

function canExecuteAction(userId: string, toolName: string): boolean {
  const identity = loadIdentityFromPipeline(`./data/users/${userId}/identity`);
  const requirement = getActionRequirement(toolName);

  if (!requirement) return true; // Fail-open for undefined tools

  const result = checkPermission(identity, requirement);
  return result.allowed;
}
```

### Pattern 2: Runtime Interception

Use `FimInterceptor` to automatically enforce permissions on all skill calls:

```typescript
import { FimInterceptor } from 'intentguard/auth';

const interceptor = new FimInterceptor(logger, dataDir);

async function executeSkill(skillName: string, payload: unknown) {
  const denial = await interceptor.intercept(skillName, payload);
  if (denial) {
    return { success: false, message: denial.message };
  }

  // Allowed - execute skill
  return await actualSkillExecution(skillName, payload);
}
```

### Pattern 3: OpenClaw Plugin

Generate a standalone plugin for external integration:

```typescript
import { generateFimPlugin, installFimPlugin } from 'intentguard/auth';

const pluginCode = generateFimPlugin({
  identityPath: './data/identity.json',
  actionMapPath: './data/action-map.json',
});

await installFimPlugin(pluginCode, '~/.openclaw/plugins/fim-auth.js');
```

## Use Cases

### 1. AI Agent Governance

Prevent autonomous AI agents from executing destructive actions when trust-debt scores are low:

```typescript
// Agent with low testing score cannot force-push to git
const requirement = getActionRequirement('git_force_push');
// requirement.requiredScores.testing = 0.8
// agent.categoryScores.testing = 0.4
// result.allowed = false
```

### 2. Multi-Tenant SaaS

Give each tenant a trust-debt profile and enforce permissions based on their behavior:

```typescript
const tenantIdentity = loadIdentityVector(`./tenants/${tenantId}/trust-debt.json`);
const canDeleteData = checkPermission(tenantIdentity, getActionRequirement('database_delete'));
```

### 3. Regulatory Compliance

Demonstrate mathematical proof of permission enforcement for audits:

```typescript
// Every permission check logged with:
// - Timestamp
// - Identity vector (20-dimensional)
// - Action requirement
// - Overlap score (cosine similarity)
// - Sovereignty score
// - Allow/deny decision
// - Failed categories (if denied)
```

### 4. DevOps Safety Rails

Prevent deployments when code quality or testing scores are too low:

```typescript
const canDeploy = checkPermission(identity, getActionRequirement('deploy'));
// deploy requires: code_quality >= 0.8, testing >= 0.7, security >= 0.6
```

## Drift Detection & Self-Healing

FIM includes a **continuous feedback loop** that detects drift and triggers recalibration:

1. **Permission Check** - FIM computes overlap for every action
2. **Denial Logged** - If denied, event written to `fim-denials.jsonl`
3. **Consecutive Tracking** - Counter increments on each consecutive denial
4. **Drift Threshold** - After 3 consecutive denials, callback triggered
5. **Pipeline Re-run** - Trust-debt pipeline (agents 0-7) re-analyzes codebase
6. **Identity Reload** - FIM loads fresh identity vector with updated scores
7. **Sovereignty Update** - Drift reduction applied: `sovereignty *= (1 - k_E)^driftEvents`

This creates a **self-healing system** where permission failures automatically trigger trust recalibration.

## Testing

FIM includes comprehensive test coverage (154 tests total):

```bash
# Run all FIM tests
npm test -- src/auth

# Run specific test file
npm test -- src/auth/geometric.test.ts

# Run benchmarks
npm test -- src/auth/benchmark.test.ts
```

Test coverage by module:
- **geometric.ts** - 44 tests (vector math, overlap, permission)
- **action-map.ts** - 12 tests (lookup, filtering, risk levels)
- **sovereignty.ts** - 18 tests (calculation, drift, recovery)
- **identity-vector.ts** - 24 tests (loading, caching, validation)
- **fim-interceptor.ts** - 32 tests (interception, denials, drift)
- **plugin.ts** - 16 tests (generation, installation)
- **benchmark.ts** - 8 tests (performance validation)

## Documentation

- **Main README**: [src/auth/README.md](src/auth/README.md)
- **API Reference**: See TypeScript definitions in source files
- **Examples**: `/examples/fim-auth-*.ts`
- **Integration Spec**: [intentguard-migration-spec.html](intentguard-migration-spec.html)

## Versioning

- **FIM Auth Layer**: v2.0.0 (open-source release)
- **IntentGuard Package**: v1.8.3+ (includes FIM)

## License

**MIT License** - Free for commercial and non-commercial use.

Copyright (c) 2026 Elias Moosman / ThetaDriven

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Commit with conventional commits (`feat: add amazing feature`)
6. Push to your branch
7. Open a Pull Request

## Citation

If you use FIM in research or production, please cite:

```bibtex
@software{fim_auth_2026,
  title={FIM: Fractal Identity Map Authentication},
  subtitle={Geometric Permission Engine Based on 20-Dimensional Trust Vectors},
  author={Moosman, Elias},
  year={2026},
  url={https://github.com/wiber/IntentGuard},
  license={MIT}
}
```

## Links

- **GitHub**: https://github.com/wiber/IntentGuard
- **npm**: https://www.npmjs.com/package/intentguard
- **Documentation**: https://github.com/wiber/IntentGuard/tree/main/src/auth
- **Examples**: https://github.com/wiber/IntentGuard/tree/main/examples
- **Trust-Debt Pipeline**: https://github.com/wiber/IntentGuard#trust-debt-pipeline

## Support

- **GitHub Issues**: https://github.com/wiber/IntentGuard/issues
- **Email**: elias@thetadriven.com
- **Discord**: Coming soon

---

**Built with ❤️  by [ThetaDriven](https://thetadriven.com)**

**Made in San Francisco, California** 🌉
