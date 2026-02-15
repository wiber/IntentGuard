# Federation System

The IntentGuard Federation System enables multiple bot instances to establish trust relationships and federate based on geometric identity tensors.

## Architecture

The federation system consists of three main components:

### 1. Tensor Overlap (`tensor-overlap.ts`)

Computes geometric similarity between bot identity vectors using **cosine similarity**.

**Key Functions:**
- `computeTensorOverlap(geometryA, geometryB)` - Computes overlap between two 20-dimensional identity vectors
- `isCompatible(geometryA, geometryB, threshold)` - Checks if two bots can federate (default threshold: 0.8)
- `geometryHash(geometry)` - Creates SHA-256 hash of identity vector for storage

**Mathematics:**
```
Identity Vector = [20 dimensions] (one per trust-debt category)
Cosine Similarity = dot(A,B) / (||A|| * ||B||)
Normalized to [0, 1]
```

**Thresholds:**
- **0.8+** = Trusted (open federation channel)
- **0.6-0.8** = Unknown (requires evaluation)
- **<0.6** = Quarantined (reject federation)

**Category Analysis:**
- **Aligned**: Categories where both bots agree (difference ≤ 0.2)
- **Divergent**: Categories where bots disagree (difference > 0.4)

### 2. Federation Registry (`registry.ts`)

Persistent storage for known federated bots.

**Storage:** `data/federation-registry.json`

**Bot Entry Fields:**
```typescript
{
  id: string;
  name: string;
  lastSeen: string;
  geometryHash: string;
  overlap: number;
  status: 'trusted' | 'quarantined' | 'unknown';
  quarantineReason?: string;
  registeredAt: string;
}
```

**Key Methods:**
- `registerBot(id, name, geometry)` - Register or update a bot
- `getBotStatus(id)` - Get bot entry
- `listBots()` - List all registered bots
- `quarantineBot(id, reason)` - Manually quarantine a bot
- `checkDrift(id, newGeometry)` - Detect geometry drift
- `getStats()` - Get registry statistics

**Auto-Quarantine:**
- Automatically quarantines bots if overlap drops below **0.6**
- Warns on overlap changes > **0.15**

### 3. Handshake Protocol (`handshake.ts`)

Implements the federation handshake protocol between two bots.

**Protocol Flow:**
1. Bot A sends `HandshakeRequest` with identity vector + metadata
2. Bot B computes tensor overlap using `tensor-overlap.ts`
3. If overlap ≥ 0.8, handshake accepted → channel opens
4. If overlap < 0.8, handshake rejected
5. Bot B registers Bot A in federation registry
6. Periodic drift checks maintain trust

**Key Methods:**
- `initiateHandshake(request)` - Process incoming handshake request
- `receiveHandshake(response)` - Handle handshake response
- `checkChannelDrift(remoteBotId, newGeometry)` - Check for drift on existing channel
- `getChannel(remoteBotId)` - Get active federation channel
- `listChannels()` - List all active channels
- `closeChannel(remoteBotId, reason)` - Close a channel and quarantine bot
- `getStats()` - Get federation statistics

**Channel Lifecycle:**
```
Handshake → Compatible? → Open Channel → Monitor Drift → Close if Quarantined
```

## Usage Examples

### Basic Handshake

```typescript
import { FederationHandshake } from './src/federation/handshake';
import { TRUST_DEBT_CATEGORIES } from './src/auth/geometric';

// Create local bot geometry
const localGeometry = TRUST_DEBT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = 0.8;
  return acc;
}, {});

// Initialize handshake protocol
const handshake = new FederationHandshake(
  'bot-local-001',
  'Local IntentGuard Bot',
  localGeometry,
  './data',
);

// Receive handshake request from remote bot
const request = {
  botId: 'bot-remote-002',
  botName: 'Remote IntentGuard Bot',
  geometry: remoteGeometry,
  timestamp: new Date().toISOString(),
  version: '1.0.0',
};

const response = handshake.initiateHandshake(request);

if (response.accepted) {
  console.log(`Federation channel opened with ${request.botName}`);
  console.log(`Overlap: ${response.overlap.toFixed(3)}`);
  console.log(`Aligned categories: ${response.aligned.join(', ')}`);
} else {
  console.log(`Federation rejected: ${response.message}`);
}
```

### Direct Tensor Overlap

```typescript
import { computeTensorOverlap, isCompatible } from './src/federation/tensor-overlap';

const botA = { security: 0.8, reliability: 0.7, data_integrity: 0.9, /* ... */ };
const botB = { security: 0.85, reliability: 0.75, data_integrity: 0.88, /* ... */ };

const result = computeTensorOverlap(botA, botB);
console.log(`Overlap: ${result.overlap.toFixed(3)}`);
console.log(`Aligned: ${result.aligned.join(', ')}`);
console.log(`Divergent: ${result.divergent.join(', ')}`);

if (isCompatible(botA, botB)) {
  console.log('Bots are compatible for federation');
}
```

### Registry Management

```typescript
import { FederationRegistry } from './src/federation/registry';

const registry = new FederationRegistry('./data', localGeometry);

// Register a bot
const bot = registry.registerBot('bot-001', 'Alpha Bot', remoteGeometry);
console.log(`Registered ${bot.name}: ${bot.status}`);

// Check for drift
const drift = registry.checkDrift('bot-001', newRemoteGeometry);
if (drift.drifted) {
  console.log(`Drift detected: ${drift.reason}`);
  console.log(`Overlap: ${drift.oldOverlap.toFixed(3)} → ${drift.newOverlap.toFixed(3)}`);
}

// Get statistics
const stats = registry.getStats();
console.log(`Total: ${stats.total}, Trusted: ${stats.trusted}, Quarantined: ${stats.quarantined}`);
```

### Monitoring Active Channels

```typescript
// List all active channels
const channels = handshake.listChannels();
console.log(`Active channels: ${channels.length}`);

for (const channel of channels) {
  console.log(`- ${channel.remoteBotName}: overlap=${channel.overlap.toFixed(3)}`);

  // Check for drift
  const drift = handshake.checkChannelDrift(channel.remoteBotId, newGeometry);
  if (drift.drifted) {
    console.log(`  WARNING: Drift detected!`);
  }
}
```

## Testing

Three test scripts are provided:

### Test Tensor Overlap
```bash
npx tsx src/federation/test-tensor-overlap.ts
```

Tests:
- Identical geometries (overlap = 1.0)
- Slightly different geometries (high overlap)
- Divergent geometries (low overlap)
- Array input (20-dimensional vectors)
- Geometry hashing
- Edge cases (empty geometries)

### Test Registry
```bash
npx tsx src/federation/test-registry.ts
```

Tests:
- Registry initialization
- Register trusted bot (high overlap)
- Register quarantined bot (low overlap)
- Register unknown bot (medium overlap)
- Get bot status
- List all bots
- Manual quarantine
- Drift detection (no drift)
- Drift detection (significant drift)
- Registry statistics
- Remove bot
- Persistence (save/load from disk)

### Test Handshake
```bash
npx tsx src/federation/test-handshake.ts
```

Tests:
- Handshake initialization
- Successful handshake (high overlap)
- Rejected handshake (low overlap)
- Borderline handshake (medium overlap)
- Get channel
- List all channels
- Check drift (no drift)
- Check drift (significant drift)
- Close channel
- Get statistics
- Access registry
- Receive handshake response

## Integration with Trust-Debt Pipeline

The federation system integrates with the IntentGuard trust-debt pipeline:

1. **Step 4** of the pipeline produces category scores (20-dimensional vector)
2. These scores form the bot's **identity vector**
3. Identity vectors are used in federation handshakes
4. Bots with similar trust-debt profiles can federate
5. Geometric overlap ensures only compatible bots communicate

## Security Considerations

1. **Self-Attested Identity**: Identity vectors are self-reported (from local trust-debt pipeline)
2. **Threshold Protection**: 0.8 overlap threshold prevents low-trust bots from federating
3. **Auto-Quarantine**: Drift detection automatically isolates suspicious bots
4. **Manual Quarantine**: Operators can manually quarantine bots for security reasons
5. **Persistent Registry**: All federation history is logged to disk

## File Structure

```
src/federation/
├── tensor-overlap.ts      # Cosine similarity & geometric overlap
├── registry.ts            # Persistent bot registry
├── handshake.ts          # Federation handshake protocol
├── test-tensor-overlap.ts # Test suite for tensor overlap
├── test-registry.ts       # Test suite for registry
├── test-handshake.ts      # Test suite for handshake
└── README.md             # This file

data/
└── federation-registry.json  # Auto-generated registry storage
```

## Future Enhancements

1. **Network Protocol**: Add HTTP/WebSocket handshake endpoints
2. **Cryptographic Signatures**: Sign identity vectors to prevent spoofing
3. **Multi-Party Federation**: Support 3+ bot networks
4. **Trust Transitivity**: Trust bots recommended by trusted bots
5. **Decay Factors**: Reduce trust over time if no communication
6. **Category Weighting**: Weight important categories higher in overlap calculation

## References

- Trust-Debt Pipeline: `src/auth/geometric.ts`
- 20 Trust-Debt Categories: Security, Reliability, Data Integrity, Process Adherence, etc.
- Cosine Similarity: https://en.wikipedia.org/wiki/Cosine_similarity
- Geometric Permission Model: `docs/GEOMETRIC-PERMISSIONS.md`
