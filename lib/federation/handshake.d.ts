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
import { TrustDebtCategory } from '../auth/geometric';
import { FederationRegistry, BotStatus } from './registry';
export interface HandshakeRequest {
    botId: string;
    botName: string;
    geometry: Partial<Record<TrustDebtCategory, number>>;
    timestamp: string;
    version: string;
}
export interface HandshakeResponse {
    accepted: boolean;
    overlap: number;
    threshold: number;
    aligned: string[];
    divergent: string[];
    status: BotStatus;
    message: string;
    timestamp: string;
}
export interface FederationChannel {
    localBotId: string;
    remoteBotId: string;
    remoteBotName: string;
    overlap: number;
    status: BotStatus;
    openedAt: string;
    lastSeen: string;
}
export declare class FederationHandshake {
    private registry;
    private localBotId;
    private localBotName;
    private channels;
    constructor(localBotId: string, localBotName: string, localGeometry: Partial<Record<TrustDebtCategory, number>>, dataDir?: string);
    /**
     * Initiate handshake with a remote bot.
     *
     * @param remoteBotId - Remote bot identifier
     * @param remoteBotName - Remote bot name
     * @param remoteGeometry - Remote bot's identity vector
     * @returns Handshake response
     */
    initiateHandshake(request: HandshakeRequest): HandshakeResponse;
    /**
     * Receive handshake response from remote bot.
     */
    receiveHandshake(response: HandshakeResponse): void;
    /**
     * Check drift on an existing federation channel.
     *
     * @param remoteBotId - Remote bot identifier
     * @param newGeometry - Remote bot's current identity vector
     * @returns Drift check result
     */
    checkChannelDrift(remoteBotId: string, newGeometry: Partial<Record<TrustDebtCategory, number>>): {
        drifted: boolean;
        oldOverlap: number;
        newOverlap: number;
        reason?: string;
    };
    /**
     * Get active federation channel.
     *
     * @param remoteBotId - Remote bot identifier
     * @returns Channel or null if not found
     */
    getChannel(remoteBotId: string): FederationChannel | null;
    /**
     * List all active channels.
     */
    listChannels(): FederationChannel[];
    /**
     * Close a federation channel.
     *
     * @param remoteBotId - Remote bot identifier
     * @param reason - Reason for closure
     */
    closeChannel(remoteBotId: string, reason: string): boolean;
    /**
     * Get registry statistics.
     */
    getStats(): {
        activeChannels: number;
        registeredBots: number;
        trusted: number;
        quarantined: number;
        unknown: number;
    };
    /**
     * Get the federation registry.
     */
    getRegistry(): FederationRegistry;
}
export { TRUST_THRESHOLD } from './tensor-overlap';
//# sourceMappingURL=handshake.d.ts.map