# Federation System API Reference

Quick reference for the IntentGuard Federation System.

## Import

```typescript
import {
  // Tensor Overlap
  computeTensorOverlap,
  isCompatible,
  geometryHash,
  TRUST_THRESHOLD,

  // Registry
  FederationRegistry,
  QUARANTINE_THRESHOLD,

  // Handshake
  FederationHandshake,
  HandshakeRequest,
  HandshakeResponse,
} from './src/federation';
```

## Tensor Overlap

### `computeTensorOverlap(geometryA, geometryB)`

Computes cosine similarity between two identity vectors.

**Parameters:**
- `geometryA`: `Partial<Record<TrustDebtCategory, number>>` or `number[]` (20-dimensional)
- `geometryB`: `Partial<Record<TrustDebtCategory, number>>` or `number[]` (20-dimensional)

**Returns:**
```typescript
{
  overlap: number,        // [0, 1] cosine similarity
  aligned: string[],      // Categories with diff ≤ 0.2
  divergent: string[]     // Categories with diff > 0.4
}
```

**Example:**
```typescript
const result = computeTensorOverlap(
  { security: 0.8, reliability: 0.7, /* ... */ },
  { security: 0.85, reliability: 0.75, /* ... */ }
);
console.log(`Overlap: ${result.overlap.toFixed(3)}`);
```

### `isCompatible(geometryA, geometryB, threshold = 0.8)`

Checks if two bots can federate.

**Parameters:**
- `geometryA`: Identity vector
- `geometryB`: Identity vector
- `threshold`: Minimum overlap required (default: 0.8)

**Returns:** `boolean`

**Example:**
```typescript
if (isCompatible(botA, botB)) {
  console.log('Bots are compatible!');
}
```

### `geometryHash(geometry)`

Computes SHA-256 hash of identity vector.

**Parameters:**
- `geometry`: Identity vector

**Returns:** `string` (64-character hex hash)

**Example:**
```typescript
const hash = geometryHash(geometry);
console.log(hash); // "a1b2c3d4..."
```

## Federation Registry

### `new FederationRegistry(dataDir, localGeometry)`

Creates a persistent bot registry.

**Parameters:**
- `dataDir`: Directory for `federation-registry.json` (default: `'./data'`)
- `localGeometry`: Local bot's identity vector

**Example:**
```typescript
const registry = new FederationRegistry('./data', localGeometry);
```

### `registerBot(id, name, geometry)`

Registers or updates a bot.

**Parameters:**
- `id`: Bot identifier (e.g., `'bot-alpha'`)
- `name`: Human-readable name
- `geometry`: Bot's identity vector

**Returns:** `BotEntry`

**Example:**
```typescript
const bot = registry.registerBot('bot-001', 'Alpha Bot', remoteGeometry);
console.log(`Status: ${bot.status}, Overlap: ${bot.overlap}`);
```

### `getBotStatus(id)`

Gets bot entry by ID.

**Parameters:**
- `id`: Bot identifier

**Returns:** `BotEntry | null`

**Example:**
```typescript
const bot = registry.getBotStatus('bot-001');
if (bot) {
  console.log(`Status: ${bot.status}`);
}
```

### `listBots()`

Lists all registered bots.

**Returns:** `BotEntry[]`

**Example:**
```typescript
const bots = registry.listBots();
for (const bot of bots) {
  console.log(`${bot.id}: ${bot.status}`);
}
```

### `quarantineBot(id, reason)`

Manually quarantines a bot.

**Parameters:**
- `id`: Bot identifier
- `reason`: Quarantine reason

**Returns:** `boolean` (true if successful)

**Example:**
```typescript
registry.quarantineBot('bot-001', 'Manual security review');
```

### `checkDrift(id, newGeometry)`

Checks if bot's geometry has drifted.

**Parameters:**
- `id`: Bot identifier
- `newGeometry`: Bot's current identity vector

**Returns:**
```typescript
{
  drifted: boolean,
  oldOverlap: number,
  newOverlap: number,
  reason?: string
}
```

**Example:**
```typescript
const drift = registry.checkDrift('bot-001', newGeometry);
if (drift.drifted) {
  console.log(`Drift: ${drift.oldOverlap.toFixed(3)} → ${drift.newOverlap.toFixed(3)}`);
}
```

### `removeBot(id)`

Removes a bot from registry.

**Parameters:**
- `id`: Bot identifier

**Returns:** `boolean` (true if removed)

### `getStats()`

Gets registry statistics.

**Returns:**
```typescript
{
  total: number,
  trusted: number,
  quarantined: number,
  unknown: number
}
```

**Example:**
```typescript
const stats = registry.getStats();
console.log(`Trusted: ${stats.trusted}, Quarantined: ${stats.quarantined}`);
```

## Federation Handshake

### `new FederationHandshake(localBotId, localBotName, localGeometry, dataDir)`

Creates a federation handshake handler.

**Parameters:**
- `localBotId`: Local bot identifier
- `localBotName`: Local bot name
- `localGeometry`: Local bot's identity vector
- `dataDir`: Data directory (default: `'./data'`)

**Example:**
```typescript
const handshake = new FederationHandshake(
  'bot-local',
  'Local Bot',
  localGeometry,
  './data'
);
```

### `initiateHandshake(request)`

Processes incoming handshake request.

**Parameters:**
```typescript
request: {
  botId: string,
  botName: string,
  geometry: Partial<Record<TrustDebtCategory, number>>,
  timestamp: string,
  version: string
}
```

**Returns:**
```typescript
{
  accepted: boolean,
  overlap: number,
  threshold: number,
  aligned: string[],
  divergent: string[],
  status: 'trusted' | 'quarantined' | 'unknown',
  message: string,
  timestamp: string
}
```

**Example:**
```typescript
const response = handshake.initiateHandshake({
  botId: 'bot-remote',
  botName: 'Remote Bot',
  geometry: remoteGeometry,
  timestamp: new Date().toISOString(),
  version: '1.0.0',
});

if (response.accepted) {
  console.log('Handshake accepted!');
}
```

### `checkChannelDrift(remoteBotId, newGeometry)`

Checks drift on existing channel.

**Parameters:**
- `remoteBotId`: Remote bot identifier
- `newGeometry`: Remote bot's current geometry

**Returns:** `DriftCheck`

**Example:**
```typescript
const drift = handshake.checkChannelDrift('bot-remote', newGeometry);
if (drift.drifted) {
  console.log('Drift detected!');
}
```

### `getChannel(remoteBotId)`

Gets active federation channel.

**Parameters:**
- `remoteBotId`: Remote bot identifier

**Returns:** `FederationChannel | null`

**Example:**
```typescript
const channel = handshake.getChannel('bot-remote');
if (channel) {
  console.log(`Overlap: ${channel.overlap.toFixed(3)}`);
}
```

### `listChannels()`

Lists all active channels.

**Returns:** `FederationChannel[]`

**Example:**
```typescript
const channels = handshake.listChannels();
console.log(`Active channels: ${channels.length}`);
```

### `closeChannel(remoteBotId, reason)`

Closes a federation channel.

**Parameters:**
- `remoteBotId`: Remote bot identifier
- `reason`: Closure reason

**Returns:** `boolean` (true if closed)

**Example:**
```typescript
handshake.closeChannel('bot-remote', 'Security review failed');
```

### `getStats()`

Gets federation statistics.

**Returns:**
```typescript
{
  activeChannels: number,
  registeredBots: number,
  trusted: number,
  quarantined: number,
  unknown: number
}
```

### `getRegistry()`

Gets the underlying registry.

**Returns:** `FederationRegistry`

**Example:**
```typescript
const registry = handshake.getRegistry();
const allBots = registry.listBots();
```

## Constants

### Trust Thresholds

```typescript
TRUST_THRESHOLD = 0.8           // Minimum overlap for federation
QUARANTINE_THRESHOLD = 0.6      // Auto-quarantine below this
ALIGNMENT_THRESHOLD = 0.2       // Max diff for "aligned" category
DIVERGENCE_THRESHOLD = 0.4      // Min diff for "divergent" category
DRIFT_WARNING_THRESHOLD = 0.15  // Warn on overlap change
```

## Types

### `BotEntry`

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

### `FederationChannel`

```typescript
{
  localBotId: string;
  remoteBotId: string;
  remoteBotName: string;
  overlap: number;
  status: 'trusted' | 'quarantined' | 'unknown';
  openedAt: string;
  lastSeen: string;
}
```

## Error Handling

All functions handle errors gracefully:
- Invalid dimensions → throws error
- Missing files → creates defaults
- Malformed data → returns null/empty

**Example:**
```typescript
try {
  const result = computeTensorOverlap(geometryA, geometryB);
} catch (error) {
  console.error('Invalid geometry dimensions:', error);
}
```

## Best Practices

1. **Store local geometry securely** - Don't expose trust-debt scores
2. **Monitor drift regularly** - Run `checkChannelDrift()` on active channels
3. **Use manual quarantine** - Don't rely solely on auto-quarantine
4. **Log all handshakes** - Track who attempts to federate
5. **Backup registry** - `data/federation-registry.json` is critical

## Common Patterns

### Full Federation Flow

```typescript
// 1. Initialize handshake
const handshake = new FederationHandshake(
  'bot-local',
  'Local Bot',
  localGeometry,
  './data'
);

// 2. Receive handshake request
const response = handshake.initiateHandshake(request);

// 3. Check if accepted
if (response.accepted) {
  console.log('Channel opened!');

  // 4. Monitor drift
  setInterval(() => {
    const drift = handshake.checkChannelDrift(
      request.botId,
      request.geometry
    );
    if (drift.drifted) {
      console.log('Drift detected!');
    }
  }, 60000); // Check every minute
}
```

### Batch Bot Registration

```typescript
const registry = new FederationRegistry('./data', localGeometry);

for (const bot of remoteBots) {
  const entry = registry.registerBot(bot.id, bot.name, bot.geometry);
  console.log(`${bot.name}: ${entry.status}`);
}

const stats = registry.getStats();
console.log(`Registered ${stats.total} bots`);
```

### Pre-Flight Compatibility Check

```typescript
// Check compatibility before initiating handshake
if (!isCompatible(localGeometry, remoteGeometry, 0.8)) {
  console.log('Bots are not compatible - handshake will fail');
  return;
}

// Proceed with handshake
const response = handshake.initiateHandshake(request);
```
