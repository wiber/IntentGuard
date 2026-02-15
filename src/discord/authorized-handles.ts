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

/**
 * Load authorized handles from environment variables.
 * Falls back to empty discordId if env var not found.
 */
function loadAuthorizedHandles(): AuthorizedHandle[] {
  return [
    {
      username: 'thetaking',
      discordId: process.env.THETAKING_DISCORD_ID,
      policy: 'instant-execute',
      rooms: 'all',
    },
    {
      username: 'mortarcombat',
      discordId: process.env.MORTARCOMBAT_DISCORD_ID,
      policy: 'instant-execute',
      rooms: 'all',
    },
  ];
}

const AUTHORIZED_HANDLES: AuthorizedHandle[] = loadAuthorizedHandles();

export class HandleAuthority {
  private handlesByUsername: Map<string, AuthorizedHandle> = new Map();
  private handlesByDiscordId: Map<string, AuthorizedHandle> = new Map();
  private log: Logger;

  constructor(log: Logger) {
    this.log = log;
    for (const h of AUTHORIZED_HANDLES) {
      // Index by username
      this.handlesByUsername.set(h.username.toLowerCase(), h);
      // Index by Discord ID if present
      if (h.discordId) {
        this.handlesByDiscordId.set(h.discordId, h);
      }
    }
    this.log.info(`HandleAuthority: ${this.handlesByUsername.size} authorized handles loaded`);
    this.log.info(`HandleAuthority: ${this.handlesByDiscordId.size} Discord IDs indexed`);
  }

  /**
   * Check if a Discord username is authorized for instant execution.
   * @param username Discord username (case-insensitive)
   */
  isAuthorized(username: string): boolean {
    return this.handlesByUsername.has(username.toLowerCase());
  }

  /**
   * Check if a Discord ID is authorized for instant execution.
   * @param discordId Discord user ID (snowflake)
   */
  isAuthorizedById(discordId: string): boolean {
    return this.handlesByDiscordId.has(discordId);
  }

  /**
   * Check if either username OR Discord ID is authorized.
   * @param username Discord username
   * @param discordId Discord user ID (optional)
   */
  isAuthorizedByEither(username: string, discordId?: string): boolean {
    if (this.isAuthorized(username)) return true;
    if (discordId && this.isAuthorizedById(discordId)) return true;
    return false;
  }

  /**
   * Get the policy for a handle by username.
   * @param username Discord username
   */
  getPolicy(username: string): AuthorizedHandle | undefined {
    return this.handlesByUsername.get(username.toLowerCase());
  }

  /**
   * Get the policy for a handle by Discord ID.
   * @param discordId Discord user ID
   */
  getPolicyById(discordId: string): AuthorizedHandle | undefined {
    return this.handlesByDiscordId.get(discordId);
  }

  /**
   * Get the policy for a handle by either username or Discord ID.
   * Discord ID takes precedence if both are provided.
   * @param username Discord username
   * @param discordId Discord user ID (optional)
   */
  getPolicyByEither(username: string, discordId?: string): AuthorizedHandle | undefined {
    if (discordId) {
      const byId = this.getPolicyById(discordId);
      if (byId) return byId;
    }
    return this.getPolicy(username);
  }

  /**
   * Check if a handle can execute in a specific room.
   * @param username Discord username
   * @param room Room name
   * @param discordId Optional Discord user ID
   */
  canExecuteInRoom(username: string, room: string, discordId?: string): boolean {
    const handle = this.getPolicyByEither(username, discordId);
    if (!handle) return false;
    if (handle.policy !== 'instant-execute') return false;
    if (handle.rooms === 'all') return true;
    return handle.rooms.includes(room);
  }

  /**
   * Add a handle at runtime (for dynamic authorization).
   * @param handle Authorized handle configuration
   */
  addHandle(handle: AuthorizedHandle): void {
    this.handlesByUsername.set(handle.username.toLowerCase(), handle);
    if (handle.discordId) {
      this.handlesByDiscordId.set(handle.discordId, handle);
    }
    this.log.info(`HandleAuthority: Added ${handle.username} (${handle.policy})`);
  }

  /**
   * Remove a handle by username.
   * @param username Discord username
   */
  removeHandle(username: string): void {
    const handle = this.handlesByUsername.get(username.toLowerCase());
    this.handlesByUsername.delete(username.toLowerCase());
    if (handle?.discordId) {
      this.handlesByDiscordId.delete(handle.discordId);
    }
    this.log.info(`HandleAuthority: Removed ${username}`);
  }

  /**
   * Remove a handle by Discord ID.
   * @param discordId Discord user ID
   */
  removeHandleById(discordId: string): void {
    const handle = this.handlesByDiscordId.get(discordId);
    this.handlesByDiscordId.delete(discordId);
    if (handle) {
      this.handlesByUsername.delete(handle.username.toLowerCase());
      this.log.info(`HandleAuthority: Removed ${handle.username} by Discord ID`);
    }
  }

  /**
   * List all authorized handles.
   */
  listHandles(): AuthorizedHandle[] {
    return [...this.handlesByUsername.values()];
  }
}
