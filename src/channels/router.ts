/**
 * src/channels/router.ts — Cross-Channel Message Router
 *
 * Routes messages from external channels (Discord, WhatsApp, Telegram)
 * to the correct cognitive room based on routing rules.
 *
 * This module provides:
 * - Room-based routing logic
 * - Message transformation for cross-channel compatibility
 * - Bidirectional message flow (external → Discord → external)
 */

import type { CrossChannelMessage, ChannelRoutingRule } from './types.js';
import type { Logger } from '../types.js';

export interface RouterConfig {
  /** Routing rules: sourceId + adapter → targetRoom */
  rules: ChannelRoutingRule[];

  /** Default room if no rule matches */
  defaultRoom?: string;

  /** Enable bidirectional routing */
  bidirectional?: boolean;
}

export class MessageRouter {
  private log: Logger;
  private rules: Map<string, ChannelRoutingRule> = new Map();
  private defaultRoom: string | null = null;
  private bidirectional: boolean = false;

  constructor(log: Logger, config?: RouterConfig) {
    this.log = log;

    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure the router with routing rules.
   */
  configure(config: RouterConfig): void {
    this.rules.clear();
    this.defaultRoom = config.defaultRoom || null;
    this.bidirectional = config.bidirectional || false;

    for (const rule of config.rules) {
      const key = this.makeKey(rule.adapter, rule.sourceId);
      this.rules.set(key, rule);
    }

    this.log.info(`Router configured: ${config.rules.length} rules, default=${this.defaultRoom}, bidirectional=${this.bidirectional}`);
  }

  /**
   * Add a routing rule dynamically.
   */
  addRule(rule: ChannelRoutingRule): void {
    const key = this.makeKey(rule.adapter, rule.sourceId);
    this.rules.set(key, rule);
    this.log.debug(`Added routing rule: ${rule.adapter}:${rule.sourceId} → ${rule.targetRoom}`);
  }

  /**
   * Remove a routing rule.
   */
  removeRule(adapter: string, sourceId: string): boolean {
    const key = this.makeKey(adapter, sourceId);
    const deleted = this.rules.delete(key);
    if (deleted) {
      this.log.debug(`Removed routing rule: ${adapter}:${sourceId}`);
    }
    return deleted;
  }

  /**
   * Route a message to the appropriate cognitive room.
   * Returns the target room name, or null if no route found.
   */
  route(message: CrossChannelMessage): string | null {
    // Check if message already specifies targetRoom (highest priority)
    if (message.targetRoom) {
      this.log.debug(`Using message-specified target room: ${message.targetRoom}`);
      return message.targetRoom;
    }

    const key = this.makeKey(message.source, message.sourceId);
    const rule = this.rules.get(key);

    if (rule) {
      this.log.debug(`Routed ${message.source}:${message.sourceId} → ${rule.targetRoom}`);
      return rule.targetRoom;
    }

    // Fall back to default room
    if (this.defaultRoom) {
      this.log.debug(`Using default room: ${this.defaultRoom}`);
      return this.defaultRoom;
    }

    this.log.warn(`No route found for ${message.source}:${message.sourceId}`);
    return null;
  }

  /**
   * Get the routing rule for a specific source.
   */
  getRule(adapter: string, sourceId: string): ChannelRoutingRule | null {
    const key = this.makeKey(adapter, sourceId);
    return this.rules.get(key) || null;
  }

  /**
   * Get all routing rules.
   */
  getAllRules(): ChannelRoutingRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Check if bidirectional routing is enabled.
   */
  isBidirectional(): boolean {
    return this.bidirectional;
  }

  /**
   * Get the source ID for a given room (reverse lookup).
   * Used for bidirectional routing.
   */
  getSourceIdForRoom(adapter: string, room: string): string | null {
    for (const rule of this.rules.values()) {
      if (rule.adapter === adapter && rule.targetRoom === room) {
        return rule.sourceId;
      }
    }
    return null;
  }

  /**
   * Get all source IDs that route to a specific room.
   */
  getSourceIdsForRoom(room: string): Array<{ adapter: string; sourceId: string }> {
    const sources: Array<{ adapter: string; sourceId: string }> = [];

    for (const rule of this.rules.values()) {
      if (rule.targetRoom === room) {
        sources.push({ adapter: rule.adapter, sourceId: rule.sourceId });
      }
    }

    return sources;
  }

  /**
   * Transform a message for cross-channel compatibility.
   * Formats messages appropriately for the target channel.
   */
  transformMessage(message: CrossChannelMessage, targetAdapter: string): string {
    const prefix = `[${message.source}] ${message.author}`;

    // Different formatting for different platforms
    switch (targetAdapter) {
      case 'discord':
        return `**${prefix}:** ${message.content}`;

      case 'whatsapp':
      case 'telegram':
        return `*${prefix}:* ${message.content}`;

      default:
        return `${prefix}: ${message.content}`;
    }
  }

  /**
   * Create a composite key for routing lookups.
   */
  private makeKey(adapter: string, sourceId: string): string {
    return `${adapter}:${sourceId}`;
  }
}
