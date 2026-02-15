# @intentguard/auth - Fractal Identity Map (FIM) Authentication

**Geometric permission system based on 20-dimensional trust vectors.**

The FIM auth layer is IntentGuard's core innovation: a mathematical permission engine where identity and action requirements live in the same 20-dimensional trust-debt vector space, and permission = geometric overlap.

## Installation

```bash
npm install intentguard
```

## Quick Start

```typescript
import { checkPermission, createIdentity, ACTION_MAP } from 'intentguard/auth';

// Create an identity with trust scores
const identity = createIdentity('user123', {
  security: 0.8,
  reliability: 0.7,
  code_quality: 0.6
}, 0.75); // sovereignty score

// Check if user can push to git
const gitPushReq = ACTION_MAP['git_push'];
const result = checkPermission(identity, gitPushReq);

if (result.allowed) {
  console.log('Permission granted');
} else {
  console.log(`Permission denied. Failed categories: ${result.failedCategories.join(', ')}`);
}
```

## Core Concepts

### 1. Identity Vector (20-dimensional)

An identity is a user represented as scores across 20 trust-debt categories:

```typescript
interface IdentityVector {
  userId: string;
  categoryScores: Partial<Record<TrustDebtCategory, number>>;
  sovereigntyScore: number;
  lastUpdated: string;
}
```

**The 20 trust-debt categories:**
- security, reliability, data_integrity, process_adherence
- code_quality, testing, documentation, communication
- time_management, resource_efficiency, risk_assessment, compliance
- innovation, collaboration, accountability, transparency
- adaptability, domain_expertise, user_focus, ethical_alignment

### 2. Action Requirement (Sparse Vector)

Each tool/action specifies minimum scores for relevant categories:

```typescript
interface ActionRequirement {
  toolName: string;
  requiredScores: Partial<Record<TrustDebtCategory, number>>;
  minSovereignty: number;
  description: string;
}
```

Example:
```typescript
const gitPushReq = {
  toolName: 'git_push',
  requiredScores: {
    code_quality: 0.7,
    testing: 0.6,
    security: 0.5,
  },
  minSovereignty: 0.7,
  description: 'Push commits to git remote'
};
```

### 3. Permission Check (Geometric Overlap)

Permission is granted when:
1. Identity scores meet or exceed all required category minimums
2. Overall sovereignty score meets minimum threshold

```typescript
const result = checkPermission(identity, requirement);
// Returns: { allowed: boolean, overlap: number, failedCategories: string[] }
```

## Core Equation

```
Permission(user, action) = Identity(user) ∩ Requirement(action) >= Threshold
```

Where:
- Identity = 20-dimensional vector of trust scores
- Requirement = sparse vector of minimum scores
- Overlap = weighted proportion of categories meeting minimums
- Threshold = minimum overlap required (default 0.8)

## API Reference

### Permission Checking

#### `checkPermission(identity, requirement, threshold?)`
Check if identity meets action requirement.

```typescript
const result = checkPermission(identity, ACTION_MAP['git_push'], 0.8);
if (result.allowed) {
  // execute action
}
```

#### `checkPermissionWithSovereignty(identity, requirement)`
Check permission including sovereignty threshold.

```typescript
const result = checkPermissionWithSovereignty(identity, requirement);
console.log(`Overlap: ${result.overlap}, Sovereignty: ${result.sovereignty}`);
```

### Identity Management

#### `createIdentity(userId, categoryScores, sovereigntyScore)`
Create a new identity vector.

```typescript
const identity = createIdentity('alice', {
  security: 0.9,
  code_quality: 0.8
}, 0.85);
```

#### `updateIdentityScores(identity, newScores)`
Update category scores (uses exponential moving average).

```typescript
const updated = updateIdentityScores(identity, {
  security: 0.95,
  testing: 0.7
});
```

#### `computeSovereigntyScore(categoryScores)`
Calculate overall trust score from categories.

```typescript
const sovereignty = computeSovereigntyScore({
  security: 0.8,
  reliability: 0.7,
  code_quality: 0.6
});
```

### Action Map

#### `ACTION_MAP`
Pre-defined requirements for 40+ common tools.

```typescript
const tools = ['git_push', 'file_delete', 'deploy', 'payment_initiate'];
tools.forEach(tool => {
  const req = ACTION_MAP[tool];
  console.log(`${tool}: sovereignty=${req.minSovereignty}`);
});
```

#### `getActionRequirement(toolName)`
Look up requirement by tool name.

```typescript
const req = getActionRequirement('database_write');
if (req) {
  console.log(`Requires: ${Object.keys(req.requiredScores).join(', ')}`);
}
```

#### `getActionsBySovereignty(minSovereignty)`
Find all actions a user can perform at their sovereignty level.

```typescript
const allowed = getActionsBySovereignty(0.6);
console.log(`User can perform: ${allowed.map(a => a.toolName).join(', ')}`);
```

### Vector Math

#### `dotProduct(a, b)`
Compute dot product of two 20-dimensional vectors.

```typescript
const a = identityToVector(identity);
const b = requirementToVector(requirement);
const product = dotProduct(a, b);
```

#### `cosineSimilarity(a, b)`
Compute cosine similarity between vectors (0-1).

```typescript
const similarity = cosineSimilarity(
  identityToVector(identity),
  requirementToVector(requirement)
);
```

### Audit Logging

#### `createAuditLogger(filepath)`
Create JSON audit logger.

```typescript
const logger = createAuditLogger('/path/to/audit.jsonl');

const result = checkPermission(identity, requirement);
logger.log(identity.userId, requirement.toolName, result);
```

#### `getAuditHistory(logger, userId?)`
Query audit log.

```typescript
const history = await getAuditHistory(logger, 'alice');
console.log(`Total checks: ${history.length}`);
```

### OpenClaw Plugin

#### `generatePluginCode(identity, requirements?, threshold?)`
Generate OpenClaw plugin JavaScript code.

```typescript
const pluginCode = generatePluginCode(identity, Object.values(ACTION_MAP), 0.8);
// Returns JavaScript source code
```

#### `installPlugin(pluginDir, identity)`
Write plugin file to OpenClaw plugins directory.

```typescript
installPlugin('~/.openclaw/plugins', identity);
// Creates: ~/.openclaw/plugins/intentguard-fim-auth.js
```

## Risk Levels

Actions are categorized by sovereignty threshold:

| Level | Range | Examples |
|-------|-------|----------|
| **Low** | 0.2-0.3 | file_read, api_call_readonly |
| **Medium** | 0.4-0.6 | file_write, git_commit |
| **High** | 0.7-0.8 | git_push, deploy_staging |
| **Critical** | 0.9+ | git_force_push, payment_initiate |

```typescript
import { getRiskLevel } from 'intentguard/auth';

const risk = getRiskLevel(ACTION_MAP['deploy'].minSovereignty);
console.log(`Deployment risk: ${risk}`); // "high"
```

## Examples

### Custom Action Requirements

```typescript
const customAction: ActionRequirement = {
  toolName: 'production_database_delete',
  requiredScores: {
    security: 0.95,
    data_integrity: 0.9,
    accountability: 0.85,
  },
  minSovereignty: 0.95,
  description: 'Delete production database records'
};

const result = checkPermission(adminIdentity, customAction);
```

### Progressive Trust Building

```typescript
let identity = createIdentity('newUser', {}, 0.3); // New user, low trust

// As user succeeds, update scores
identity = updateIdentityScores(identity, {
  reliability: 0.5,
  process_adherence: 0.4
});

// Sovereignty increases with category scores
identity = updateSovereigntyScore(identity,
  computeSovereigntyScore(identity.categoryScores)
);
```

### Audit Trail Analysis

```typescript
const logger = createAuditLogger('./audit.jsonl');

// Log all permission checks
checkPermission(identity, requirement); // automatically logged

// Later: analyze denials
const denied = await getDeniedActions(logger);
console.log(`Denial rate: ${denied.length / history.length * 100}%`);
```

### Integration with Trust Debt Pipeline

```typescript
// Trust debt pipeline produces category scores
const pipelineOutput = await runTrustDebtPipeline();

// Convert to identity
const identity = createIdentity('system',
  pipelineOutput.categoryScores,
  pipelineOutput.sovereigntyScore
);

// Now use for permission checks
const result = checkPermission(identity, ACTION_MAP['deploy']);
```

## Architecture

```
src/auth/
├── index.ts              # Main export (this module)
├── geometric.ts          # Core vector math
├── action-map.ts         # Tool requirements (40+ tools)
├── sovereignty.ts        # Identity vector construction
├── audit-logger.ts       # Permission audit trail
├── plugin.ts             # OpenClaw plugin generation
├── fim-interceptor.ts    # Runtime enforcement
├── identity-vector.ts    # Vector operations
└── identity-vector-validate.ts  # Validation utilities
```

## Trust Debt Pipeline Integration

The FIM auth layer is designed to consume output from IntentGuard's Trust Debt pipeline:

1. **Pipeline Step 4** produces category scores (0.0-1.0 for each of 20 categories)
2. **FIM Auth** uses these scores as the identity vector
3. **Runtime enforcement** checks every tool call against requirements

This creates a closed loop: code quality → trust score → permission level → allowed actions.

## Mathematical Foundation

The permission check is a **threshold-based overlap computation**:

```
overlap = Σ(meets_requirement[i]) / |required_categories|
```

Where `meets_requirement[i] = 1` if `identity[i] >= requirement[i]`, else `0`.

**Future**: v0.2 will add cosine similarity as an alternative metric:

```
similarity = (A · B) / (|A| × |B|)
```

Where `A · B` is dot product and `|A|` is magnitude.

## Testing

The FIM auth layer has 60+ tests covering:
- Vector math (dot product, cosine similarity, magnitude)
- Permission checks (threshold, sovereignty, overlap)
- Identity updates (EMA, decay, normalization)
- Audit logging (JSONL, queries, filtering)
- Plugin generation (code output, installation)

Run tests:
```bash
npm test -- --testPathPattern=auth
```

## License

MIT - See LICENSE file for details.

## Contributing

FIM auth is the mathematical core of IntentGuard. Contributions welcome:

1. Vector space improvements (cosine similarity, weighted categories)
2. Additional action requirements (cloud, CI/CD, databases)
3. Audit analysis tools (pattern detection, anomaly detection)
4. Performance optimizations (vector caching, batch checks)

## Links

- **Homepage**: https://github.com/wiber/IntentGuard
- **Issues**: https://github.com/wiber/IntentGuard/issues
- **Trust Debt Pipeline**: See main README
- **Patent**: PATENTS.md

---

**The Guard in IntentGuard** - Permission = Tensor Overlap
