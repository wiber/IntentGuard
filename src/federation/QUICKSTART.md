# Federation System Quick Start

Get started with the IntentGuard Federation System in 5 minutes.

## Installation

No installation needed! The federation system uses only Node.js built-in modules.

```bash
# Verify Node.js is installed
node --version  # Should be v18+

# Clone or navigate to IntentGuard
cd /path/to/IntentGuard
```

## Run Tests (Verification)

```bash
# Run all tests
./src/federation/run-all-tests.sh

# Or run individual tests
npx tsx src/federation/test-tensor-overlap.ts
npx tsx src/federation/test-registry.ts
npx tsx src/federation/test-handshake.ts
```

## Basic Usage

### 1. Compute Tensor Overlap

```typescript
import { computeTensorOverlap } from './src/federation';

const botA = { security: 0.8, reliability: 0.7, /* ... 20 categories */ };
const botB = { security: 0.85, reliability: 0.75, /* ... */ };

const result = computeTensorOverlap(botA, botB);
console.log(`Overlap: ${result.overlap.toFixed(3)}`);
console.log(`Aligned: ${result.aligned.join(', ')}`);
console.log(`Divergent: ${result.divergent.join(', ')}`);
```

### 2. Check Compatibility

```typescript
import { isCompatible } from './src/federation';

if (isCompatible(botA, botB)) {
  console.log('✓ Bots can federate');
} else {
  console.log('✗ Bots cannot federate');
}
```

### 3. Manage Bot Registry

```typescript
import { FederationRegistry } from './src/federation';

const registry = new FederationRegistry('./data', localGeometry);

// Register a bot
const bot = registry.registerBot('bot-001', 'Alpha Bot', remoteGeometry);
console.log(`Status: ${bot.status}`);

// Check drift
const drift = registry.checkDrift('bot-001', newGeometry);
if (drift.drifted) {
  console.log('⚠️  Drift detected!');
}

// Get stats
const stats = registry.getStats();
console.log(`Trusted: ${stats.trusted}, Quarantined: ${stats.quarantined}`);
```

### 4. Handshake Protocol

```typescript
import { FederationHandshake } from './src/federation';

// Initialize
const handshake = new FederationHandshake(
  'bot-local',
  'Local Bot',
  localGeometry,
  './data'
);

// Process handshake request
const response = handshake.initiateHandshake({
  botId: 'bot-remote',
  botName: 'Remote Bot',
  geometry: remoteGeometry,
  timestamp: new Date().toISOString(),
  version: '1.0.0',
});

if (response.accepted) {
  console.log('✓ Channel opened!');
} else {
  console.log('✗ Handshake rejected:', response.message);
}
```

## Complete Example

```typescript
import {
  FederationHandshake,
  computeTensorOverlap,
  TRUST_DEBT_CATEGORIES,
} from './src/federation';

// Create local geometry
const localGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.8;  // All categories at 0.8
  return acc;
}, {} as any);

// Initialize handshake
const handshake = new FederationHandshake(
  'bot-dev-001',
  'Dev Bot',
  localGeometry,
  './data'
);

// Simulate remote bot
const remoteGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.82;  // Slightly higher
  return acc;
}, {} as any);

// Check overlap first
const overlap = computeTensorOverlap(localGeometry, remoteGeometry);
console.log(`Overlap: ${overlap.overlap.toFixed(3)}`);

// Attempt handshake
const response = handshake.initiateHandshake({
  botId: 'bot-prod-001',
  botName: 'Prod Bot',
  geometry: remoteGeometry,
  timestamp: new Date().toISOString(),
  version: '1.0.0',
});

console.log(`Accepted: ${response.accepted}`);
console.log(`Status: ${response.status}`);

// List active channels
const channels = handshake.listChannels();
console.log(`Active channels: ${channels.length}`);
```

## Integration with Trust-Debt Pipeline

```typescript
import { loadIdentityFromPipeline } from './src/auth/geometric';
import { FederationHandshake } from './src/federation';

// Load local geometry from trust-debt pipeline
const localIdentity = loadIdentityFromPipeline('./data/pipeline', 'bot-001');

// Use in federation
const handshake = new FederationHandshake(
  'bot-001',
  'IntentGuard Bot',
  localIdentity.categoryScores,
  './data'
);
```

## File Structure

```
src/federation/
├── tensor-overlap.ts         # Cosine similarity math
├── registry.ts              # Persistent bot storage
├── handshake.ts             # Federation protocol
├── index.ts                 # Main exports
├── README.md                # Full documentation
├── API-REFERENCE.md         # API docs
├── QUICKSTART.md            # This file
├── IMPLEMENTATION-SUMMARY.md # Implementation details
├── example-usage.ts         # Complete example
├── test-tensor-overlap.ts   # Tests
├── test-registry.ts         # Tests
├── test-handshake.ts        # Tests
└── run-all-tests.sh         # Test runner

data/
└── federation-registry.json  # Auto-generated
```

## Trust Thresholds

| Threshold | Value | Meaning |
|-----------|-------|---------|
| **Trust** | 0.8 | Required for federation |
| **Unknown** | 0.6-0.8 | Requires manual review |
| **Quarantine** | <0.6 | Auto-quarantined |
| **Alignment** | ±0.2 | Categories agree |
| **Divergence** | >0.4 | Categories disagree |

## Common Commands

```bash
# Run all tests
./src/federation/run-all-tests.sh

# Run example
npx tsx src/federation/example-usage.ts

# Check TypeScript
npx tsc --noEmit src/federation/*.ts

# View registry
cat data/federation-registry.json | jq

# Clean up test data
rm -rf test-data* data-example
```

## Next Steps

1. **Read** `README.md` for full documentation
2. **Review** `API-REFERENCE.md` for all functions
3. **Study** `example-usage.ts` for complete scenarios
4. **Integrate** with your trust-debt pipeline
5. **Deploy** federation endpoints (future enhancement)

## Troubleshooting

### "Cannot find module '../auth/geometric'"

Make sure you're running from the project root:
```bash
cd /path/to/IntentGuard
npx tsx src/federation/test-tensor-overlap.ts
```

### "ENOENT: no such file or directory 'data/federation-registry.json'"

This is normal! The registry auto-creates the file on first write.

### "Invalid geometry dimensions"

Ensure your geometry has all 20 trust-debt categories or is a 20-element array.

### TypeScript errors

Verify TypeScript is installed:
```bash
npm install -g typescript
npx tsc --version
```

## Help & Support

- **Documentation:** `src/federation/README.md`
- **API Reference:** `src/federation/API-REFERENCE.md`
- **Examples:** `src/federation/example-usage.ts`
- **Tests:** `src/federation/test-*.ts`

## Performance

- **Overlap computation:** ~0.1ms (constant time)
- **Registry operations:** ~0.5ms (file I/O)
- **Handshake protocol:** ~1ms (complete flow)
- **Scales to:** ~1000 bots easily (JSON storage)

## Security Notes

1. Identity vectors are **self-attested** (from local pipeline)
2. No cryptographic signatures (v1.0)
3. Threshold protection prevents low-trust bots
4. Auto-quarantine on drift
5. Manual override available

## What's Next?

- [ ] HTTP/WebSocket endpoints
- [ ] Cryptographic signatures
- [ ] Multi-party federation
- [ ] Trust transitivity
- [ ] Category weighting

---

**Ready to federate!** 🎉

Start with `npx tsx src/federation/example-usage.ts` to see it in action.
