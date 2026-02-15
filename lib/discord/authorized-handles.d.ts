/**
 * src/discord/authorized-handles.ts — Instant Execute for Authorized Users
 *
 * Messages from authorized Discord handles bypass confirmation
 * and are dispatched immediately to the appropriate cognitive room.
 *
 * HANDLES:
 *   thetaking    → instant-execute, all rooms
 *   mortarcombat → instant-execute, all rooms
 *
 * Reads Discord IDs from environment variables:
 *   THETAKING_DISCORD_ID
 *   MORTARCOMBAT_DISCORD_ID
 */
import type { AuthorizedHandle, Logger } from '../types.js';
export declare class HandleAuthority {
    private handlesByUsername;
    private handlesByDiscordId;
    private log;
    constructor(log: Logger);
    /**
     * Check if a Discord username is authorized for instant execution.
     * @param username Discord username (case-insensitive)
     */
    isAuthorized(username: string): boolean;
    /**
     * Check if a Discord ID is authorized for instant execution.
     * @param discordId Discord user ID (snowflake)
     */
    isAuthorizedById(discordId: string): boolean;
    /**
     * Check if either username OR Discord ID is authorized.
     * @param username Discord username
     * @param discordId Discord user ID (optional)
     */
    isAuthorizedByEither(username: string, discordId?: string): boolean;
    /**
     * Get the policy for a handle by username.
     * @param username Discord username
     */
    getPolicy(username: string): AuthorizedHandle | undefined;
    /**
     * Get the policy for a handle by Discord ID.
     * @param discordId Discord user ID
     */
    getPolicyById(discordId: string): AuthorizedHandle | undefined;
    /**
     * Get the policy for a handle by either username or Discord ID.
     * Discord ID takes precedence if both are provided.
     * @param username Discord username
     * @param discordId Discord user ID (optional)
     */
    getPolicyByEither(username: string, discordId?: string): AuthorizedHandle | undefined;
    /**
     * Check if a handle can execute in a specific room.
     * @param username Discord username
     * @param room Room name
     * @param discordId Optional Discord user ID
     */
    canExecuteInRoom(username: string, room: string, discordId?: string): boolean;
    /**
     * Add a handle at runtime (for dynamic authorization).
     * @param handle Authorized handle configuration
     */
    addHandle(handle: AuthorizedHandle): void;
    /**
     * Remove a handle by username.
     * @param username Discord username
     */
    removeHandle(username: string): void;
    /**
     * Remove a handle by Discord ID.
     * @param discordId Discord user ID
     */
    removeHandleById(discordId: string): void;
    /**
     * List all authorized handles.
     */
    listHandles(): AuthorizedHandle[];
}
//# sourceMappingURL=authorized-handles.d.ts.map