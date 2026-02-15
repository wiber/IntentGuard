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
import {
  computeTensorOverlap,
  isCompatible,
  geometryHash,
  TRUST_THRESHOLD,
} from './tensor-overlap';
import { FederationRegistry, BotEntry, BotStatus } from './registry';

// ─── Types ──────────────────────────────────────────────────────────────

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

// ─── Handshake Protocol ─────────────────────────────────────────────────

export class FederationHandshake {
  private registry: FederationRegistry;
  private localBotId: string;
  private localBotName: string;
  private channels: Map<string, FederationChannel> = new Map();

  constructor(
    localBotId: string,
    localBotName: string,
    localGeometry: Partial<Record<TrustDebtCategory, number>>,
    dataDir: string = './data',
  ) {
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
  initiateHandshake(request: HandshakeRequest): HandshakeResponse {
    const { botId, botName, geometry, timestamp } = request;

    // Compute tensor overlap
    const { overlap, aligned, divergent } = computeTensorOverlap(
      this.registry['localGeometry'],
      geometry,
    );

    // Determine if handshake is accepted
    const accepted = overlap >= TRUST_THRESHOLD;

    // Register bot in registry
    const entry = this.registry.registerBot(botId, botName, geometry);

    // Create federation channel if accepted
    if (accepted) {
      const channel: FederationChannel = {
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
  receiveHandshake(response: HandshakeResponse): void {
    if (response.accepted) {
      console.log(`Federation channel opened: overlap=${response.overlap.toFixed(3)}`);
      console.log(`Aligned categories: ${response.aligned.join(', ')}`);
      if (response.divergent.length > 0) {
        console.log(`Divergent categories: ${response.divergent.join(', ')}`);
      }
    } else {
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
  checkChannelDrift(
    remoteBotId: string,
    newGeometry: Partial<Record<TrustDebtCategory, number>>,
  ): { drifted: boolean; oldOverlap: number; newOverlap: number; reason?: string } {
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
  getChannel(remoteBotId: string): FederationChannel | null {
    return this.channels.get(remoteBotId) ?? null;
  }

  /**
   * List all active channels.
   */
  listChannels(): FederationChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Close a federation channel.
   *
   * @param remoteBotId - Remote bot identifier
   * @param reason - Reason for closure
   */
  closeChannel(remoteBotId: string, reason: string): boolean {
    const channel = this.channels.get(remoteBotId);
    if (!channel) return false;

    this.channels.delete(remoteBotId);
    this.registry.quarantineBot(remoteBotId, reason);

    console.log(`Channel closed: ${remoteBotId} (${reason})`);
    return true;
  }

  /**
   * Get registry statistics.
   */
  getStats(): {
    activeChannels: number;
    registeredBots: number;
    trusted: number;
    quarantined: number;
    unknown: number;
  } {
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
  getRegistry(): FederationRegistry {
    return this.registry;
  }
}

// ─── Exports ────────────────────────────────────────────────────────────

export { TRUST_THRESHOLD } from './tensor-overlap';
