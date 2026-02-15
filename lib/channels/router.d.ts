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
export declare class MessageRouter {
    private log;
    private rules;
    private defaultRoom;
    private bidirectional;
    constructor(log: Logger, config?: RouterConfig);
    /**
     * Configure the router with routing rules.
     */
    configure(config: RouterConfig): void;
    /**
     * Add a routing rule dynamically.
     */
    addRule(rule: ChannelRoutingRule): void;
    /**
     * Remove a routing rule.
     */
    removeRule(adapter: string, sourceId: string): boolean;
    /**
     * Route a message to the appropriate cognitive room.
     * Returns the target room name, or null if no route found.
     */
    route(message: CrossChannelMessage): string | null;
    /**
     * Get the routing rule for a specific source.
     */
    getRule(adapter: string, sourceId: string): ChannelRoutingRule | null;
    /**
     * Get all routing rules.
     */
    getAllRules(): ChannelRoutingRule[];
    /**
     * Check if bidirectional routing is enabled.
     */
    isBidirectional(): boolean;
    /**
     * Get the source ID for a given room (reverse lookup).
     * Used for bidirectional routing.
     */
    getSourceIdForRoom(adapter: string, room: string): string | null;
    /**
     * Get all source IDs that route to a specific room.
     */
    getSourceIdsForRoom(room: string): Array<{
        adapter: string;
        sourceId: string;
    }>;
    /**
     * Transform a message for cross-channel compatibility.
     * Formats messages appropriately for the target channel.
     */
    transformMessage(message: CrossChannelMessage, targetAdapter: string): string;
    /**
     * Create a composite key for routing lookups.
     */
    private makeKey;
}
//# sourceMappingURL=router.d.ts.map