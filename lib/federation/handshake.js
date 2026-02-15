/**
 * src/federation/handshake.ts — Fractal Federation Handshake Protocol
 *
 * Enables two IntentGuard bots to establish trust and federate.
 * Uses geometric identity tensors to compute compatibility.
 *
 * PROTOCOL FLOW:
 *   1. Bot A sends identity vector + metadata
 *   2. Bot B computes tensor overlap
 *   3. If overlap >= 0.8, channel opens (trusted)
 *   4. If overlap < 0.8, handshake rejected
 *   5. Bot B registers Bot A in federation registry
 *   6. Periodic drift checks maintain trust
 *
 * SECURITY:
 *   - Identity vectors are self-attested (trust-debt pipeline output)
 *   - Overlap threshold prevents low-trust bots from federating
 *   - Quarantine system isolates drifting bots
 */
import { computeTensorOverlap, TRUST_THRESHOLD, } from './tensor-overlap';
import { FederationRegistry } from './registry';
// ─── Handshake Protocol ─────────────────────────────────────────────────
export class FederationHandshake {
    registry;
    localBotId;
    localBotName;
    channels = new Map();
    constructor(localBotId, localBotName, localGeometry, dataDir = './data') {
        this.localBotId = localBotId;
        this.localBotName = localBotName;
        this.registry = new FederationRegistry(dataDir, localGeometry);
    }
    /**
     * Initiate handshake with a remote bot.
     *
     * @param remoteBotId - Remote bot identifier
     * @param remoteBotName - Remote bot name
     * @param remoteGeometry - Remote bot's identity vector
     * @returns Handshake response
     */
    initiateHandshake(request) {
        const { botId, botName, geometry, timestamp } = request;
        // Compute tensor overlap
        const { overlap, aligned, divergent } = computeTensorOverlap(this.registry['localGeometry'], geometry);
        // Determine if handshake is accepted
        const accepted = overlap >= TRUST_THRESHOLD;
        // Register bot in registry
        const entry = this.registry.registerBot(botId, botName, geometry);
        // Create federation channel if accepted
        if (accepted) {
            const channel = {
                localBotId: this.localBotId,
                remoteBotId: botId,
                remoteBotName: botName,
                overlap,
                status: entry.status,
                openedAt: new Date().toISOString(),
                lastSeen: timestamp,
            };
            this.channels.set(botId, channel);
        }
        return {
            accepted,
            overlap,
            threshold: TRUST_THRESHOLD,
            aligned,
            divergent,
            status: entry.status,
            message: accepted
                ? `Handshake accepted: ${overlap.toFixed(3)} >= ${TRUST_THRESHOLD}`
                : `Handshake rejected: ${overlap.toFixed(3)} < ${TRUST_THRESHOLD}`,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Receive handshake response from remote bot.
     */
    receiveHandshake(response) {
        if (response.accepted) {
            console.log(`Federation channel opened: overlap=${response.overlap.toFixed(3)}`);
            console.log(`Aligned categories: ${response.aligned.join(', ')}`);
            if (response.divergent.length > 0) {
                console.log(`Divergent categories: ${response.divergent.join(', ')}`);
            }
        }
        else {
            console.log(`Federation rejected: ${response.message}`);
        }
    }
    /**
     * Check drift on an existing federation channel.
     *
     * @param remoteBotId - Remote bot identifier
     * @param newGeometry - Remote bot's current identity vector
     * @returns Drift check result
     */
    checkChannelDrift(remoteBotId, newGeometry) {
        const drift = this.registry.checkDrift(remoteBotId, newGeometry);
        // Update channel if drifted
        if (drift.drifted) {
            const channel = this.channels.get(remoteBotId);
            if (channel) {
                channel.overlap = drift.newOverlap;
                channel.lastSeen = new Date().toISOString();
                const bot = this.registry.getBotStatus(remoteBotId);
                if (bot) {
                    channel.status = bot.status;
                    // Close channel if quarantined
                    if (bot.status === 'quarantined') {
                        this.channels.delete(remoteBotId);
                        console.log(`Channel closed due to drift: ${remoteBotId}`);
                    }
                }
            }
        }
        return drift;
    }
    /**
     * Get active federation channel.
     *
     * @param remoteBotId - Remote bot identifier
     * @returns Channel or null if not found
     */
    getChannel(remoteBotId) {
        return this.channels.get(remoteBotId) ?? null;
    }
    /**
     * List all active channels.
     */
    listChannels() {
        return Array.from(this.channels.values());
    }
    /**
     * Close a federation channel.
     *
     * @param remoteBotId - Remote bot identifier
     * @param reason - Reason for closure
     */
    closeChannel(remoteBotId, reason) {
        const channel = this.channels.get(remoteBotId);
        if (!channel)
            return false;
        this.channels.delete(remoteBotId);
        this.registry.quarantineBot(remoteBotId, reason);
        console.log(`Channel closed: ${remoteBotId} (${reason})`);
        return true;
    }
    /**
     * Get registry statistics.
     */
    getStats() {
        const registryStats = this.registry.getStats();
        return {
            activeChannels: this.channels.size,
            registeredBots: registryStats.total,
            trusted: registryStats.trusted,
            quarantined: registryStats.quarantined,
            unknown: registryStats.unknown,
        };
    }
    /**
     * Get the federation registry.
     */
    getRegistry() {
        return this.registry;
    }
}
// ─── Exports ────────────────────────────────────────────────────────────
export { TRUST_THRESHOLD } from './tensor-overlap';
//# sourceMappingURL=handshake.js.map