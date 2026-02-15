/**
 * src/discord/authorized-handles.ts — Instant Execute for Authorized Users
 *
 * Messages from authorized Discord handles bypass confirmation
 * and are dispatched immediately to the appropriate cognitive room.
 *
 * HANDLES:
 *   thetaking    → instant-execute, all rooms
 *   mortarcombat → instant-execute, all rooms
 */

import type { AuthorizedHandle, Logger } from '../types.js';

const AUTHORIZED_HANDLES: AuthorizedHandle[] = [
  {
    username: 'thetaking',
    policy: 'instant-execute',
    rooms: 'all',
  },
  {
    username: 'mortarcombat',
    policy: 'instant-execute',
    rooms: 'all',
  },
];

export class HandleAuthority {
  private handles: Map<string, AuthorizedHandle> = new Map();
  private log: Logger;

  constructor(log: Logger) {
    this.log = log;
    for (const h of AUTHORIZED_HANDLES) {
      this.handles.set(h.username.toLowerCase(), h);
    }
    this.log.info(`HandleAuthority: ${this.handles.size} authorized handles loaded`);
  }

  /**
   * Check if a Discord username is authorized for instant execution.
   */
  isAuthorized(username: string): boolean {
    return this.handles.has(username.toLowerCase());
  }

  /**
   * Get the policy for a handle.
   */
  getPolicy(username: string): AuthorizedHandle | undefined {
    return this.handles.get(username.toLowerCase());
  }

  /**
   * Check if a handle can execute in a specific room.
   */
  canExecuteInRoom(username: string, room: string): boolean {
    const handle = this.handles.get(username.toLowerCase());
    if (!handle) return false;
    if (handle.policy !== 'instant-execute') return false;
    if (handle.rooms === 'all') return true;
    return handle.rooms.includes(room);
  }

  /**
   * Add a handle at runtime (for dynamic authorization).
   */
  addHandle(handle: AuthorizedHandle): void {
    this.handles.set(handle.username.toLowerCase(), handle);
    this.log.info(`HandleAuthority: Added ${handle.username} (${handle.policy})`);
  }

  /**
   * Remove a handle.
   */
  removeHandle(username: string): void {
    this.handles.delete(username.toLowerCase());
    this.log.info(`HandleAuthority: Removed ${username}`);
  }

  /**
   * List all authorized handles.
   */
  listHandles(): AuthorizedHandle[] {
    return [...this.handles.values()];
  }
}
