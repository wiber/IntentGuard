/**
 * src/discord/authorized-handles.test.ts — Tests for HandleAuthority
 *
 * Tests instant-execute authorization for thetaking and mortarcombat.
 * Validates both username and Discord ID lookup.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { HandleAuthority } from './authorized-handles.js';
import type { Logger, AuthorizedHandle } from '../types.js';

// Mock logger
const mockLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('HandleAuthority', () => {
  let authority: HandleAuthority;

  beforeEach(() => {
    // Set up environment variables for testing
    process.env.THETAKING_DISCORD_ID = '419474619733377024';
    process.env.MORTARCOMBAT_DISCORD_ID = '468146259467698187';
    authority = new HandleAuthority(mockLogger);
  });

  describe('isAuthorized (by username)', () => {
    test('authorizes thetaking (lowercase)', () => {
      expect(authority.isAuthorized('thetaking')).toBe(true);
    });

    test('authorizes thetaking (mixed case)', () => {
      expect(authority.isAuthorized('TheTaking')).toBe(true);
    });

    test('authorizes mortarcombat (lowercase)', () => {
      expect(authority.isAuthorized('mortarcombat')).toBe(true);
    });

    test('authorizes mortarcombat (mixed case)', () => {
      expect(authority.isAuthorized('MortarCombat')).toBe(true);
    });

    test('rejects unknown username', () => {
      expect(authority.isAuthorized('randomuser')).toBe(false);
    });

    test('rejects empty username', () => {
      expect(authority.isAuthorized('')).toBe(false);
    });
  });

  describe('isAuthorizedById (by Discord ID)', () => {
    test('authorizes thetaking by Discord ID', () => {
      expect(authority.isAuthorizedById('419474619733377024')).toBe(true);
    });

    test('authorizes mortarcombat by Discord ID', () => {
      expect(authority.isAuthorizedById('468146259467698187')).toBe(true);
    });

    test('rejects unknown Discord ID', () => {
      expect(authority.isAuthorizedById('999999999999999999')).toBe(false);
    });

    test('rejects empty Discord ID', () => {
      expect(authority.isAuthorizedById('')).toBe(false);
    });
  });

  describe('isAuthorizedByEither', () => {
    test('authorizes by username alone', () => {
      expect(authority.isAuthorizedByEither('thetaking')).toBe(true);
    });

    test('authorizes by Discord ID alone', () => {
      expect(authority.isAuthorizedByEither('unknownuser', '419474619733377024')).toBe(true);
    });

    test('authorizes when both username and ID match', () => {
      expect(authority.isAuthorizedByEither('thetaking', '419474619733377024')).toBe(true);
    });

    test('authorizes when username matches but ID is wrong', () => {
      expect(authority.isAuthorizedByEither('thetaking', '999999999999999999')).toBe(true);
    });

    test('authorizes when ID matches but username is wrong', () => {
      expect(authority.isAuthorizedByEither('wronguser', '419474619733377024')).toBe(true);
    });

    test('rejects when neither matches', () => {
      expect(authority.isAuthorizedByEither('wronguser', '999999999999999999')).toBe(false);
    });

    test('rejects when no ID provided and username is wrong', () => {
      expect(authority.isAuthorizedByEither('wronguser')).toBe(false);
    });
  });

  describe('getPolicy', () => {
    test('returns policy for thetaking', () => {
      const policy = authority.getPolicy('thetaking');
      expect(policy).toBeDefined();
      expect(policy?.username).toBe('thetaking');
      expect(policy?.policy).toBe('instant-execute');
      expect(policy?.rooms).toBe('all');
    });

    test('returns policy for mortarcombat', () => {
      const policy = authority.getPolicy('mortarcombat');
      expect(policy).toBeDefined();
      expect(policy?.username).toBe('mortarcombat');
      expect(policy?.policy).toBe('instant-execute');
      expect(policy?.rooms).toBe('all');
    });

    test('returns undefined for unknown username', () => {
      expect(authority.getPolicy('unknownuser')).toBeUndefined();
    });
  });

  describe('getPolicyById', () => {
    test('returns policy for thetaking by Discord ID', () => {
      const policy = authority.getPolicyById('419474619733377024');
      expect(policy).toBeDefined();
      expect(policy?.username).toBe('thetaking');
      expect(policy?.discordId).toBe('419474619733377024');
    });

    test('returns policy for mortarcombat by Discord ID', () => {
      const policy = authority.getPolicyById('468146259467698187');
      expect(policy).toBeDefined();
      expect(policy?.username).toBe('mortarcombat');
      expect(policy?.discordId).toBe('468146259467698187');
    });

    test('returns undefined for unknown Discord ID', () => {
      expect(authority.getPolicyById('999999999999999999')).toBeUndefined();
    });
  });

  describe('getPolicyByEither', () => {
    test('returns policy by Discord ID when both provided (ID takes precedence)', () => {
      const policy = authority.getPolicyByEither('wrongname', '419474619733377024');
      expect(policy).toBeDefined();
      expect(policy?.username).toBe('thetaking');
    });

    test('returns policy by username when ID not provided', () => {
      const policy = authority.getPolicyByEither('thetaking');
      expect(policy).toBeDefined();
      expect(policy?.username).toBe('thetaking');
    });

    test('returns policy by username when ID is invalid', () => {
      const policy = authority.getPolicyByEither('mortarcombat', '999999999999999999');
      expect(policy).toBeDefined();
      expect(policy?.username).toBe('mortarcombat');
    });

    test('returns undefined when neither matches', () => {
      expect(authority.getPolicyByEither('wronguser', '999999999999999999')).toBeUndefined();
    });
  });

  describe('canExecuteInRoom', () => {
    test('allows thetaking in any room (rooms = "all")', () => {
      expect(authority.canExecuteInRoom('thetaking', 'semantic')).toBe(true);
      expect(authority.canExecuteInRoom('thetaking', 'finance')).toBe(true);
      expect(authority.canExecuteInRoom('thetaking', 'anyroom')).toBe(true);
    });

    test('allows mortarcombat in any room (rooms = "all")', () => {
      expect(authority.canExecuteInRoom('mortarcombat', 'semantic')).toBe(true);
      expect(authority.canExecuteInRoom('mortarcombat', 'crypto')).toBe(true);
    });

    test('allows execution by Discord ID alone', () => {
      expect(authority.canExecuteInRoom('wronguser', 'semantic', '419474619733377024')).toBe(true);
    });

    test('rejects unknown user', () => {
      expect(authority.canExecuteInRoom('unknownuser', 'semantic')).toBe(false);
    });

    test('rejects unknown user even with wrong Discord ID', () => {
      expect(authority.canExecuteInRoom('unknownuser', 'semantic', '999999999999999999')).toBe(false);
    });
  });

  describe('addHandle', () => {
    test('adds a new handle dynamically', () => {
      const newHandle: AuthorizedHandle = {
        username: 'testuser',
        discordId: '123456789012345678',
        policy: 'instant-execute',
        rooms: ['semantic', 'finance'],
      };

      authority.addHandle(newHandle);

      expect(authority.isAuthorized('testuser')).toBe(true);
      expect(authority.isAuthorizedById('123456789012345678')).toBe(true);
      expect(authority.canExecuteInRoom('testuser', 'semantic')).toBe(true);
      expect(authority.canExecuteInRoom('testuser', 'finance')).toBe(true);
      expect(authority.canExecuteInRoom('testuser', 'crypto')).toBe(false);
    });

    test('adds a handle without Discord ID', () => {
      const newHandle: AuthorizedHandle = {
        username: 'usernameonly',
        policy: 'confirm-first',
        rooms: 'all',
      };

      authority.addHandle(newHandle);

      expect(authority.isAuthorized('usernameonly')).toBe(true);
      expect(authority.isAuthorizedById('any-id')).toBe(false);
    });
  });

  describe('removeHandle', () => {
    test('removes a handle by username', () => {
      expect(authority.isAuthorized('thetaking')).toBe(true);

      authority.removeHandle('thetaking');

      expect(authority.isAuthorized('thetaking')).toBe(false);
      expect(authority.isAuthorizedById('419474619733377024')).toBe(false);
    });

    test('removing non-existent handle does not throw', () => {
      expect(() => authority.removeHandle('nonexistent')).not.toThrow();
    });
  });

  describe('removeHandleById', () => {
    test('removes a handle by Discord ID', () => {
      expect(authority.isAuthorizedById('468146259467698187')).toBe(true);

      authority.removeHandleById('468146259467698187');

      expect(authority.isAuthorizedById('468146259467698187')).toBe(false);
      expect(authority.isAuthorized('mortarcombat')).toBe(false);
    });

    test('removing by non-existent ID does not throw', () => {
      expect(() => authority.removeHandleById('999999999999999999')).not.toThrow();
    });
  });

  describe('listHandles', () => {
    test('lists all authorized handles', () => {
      const handles = authority.listHandles();

      expect(handles).toHaveLength(2);
      expect(handles.find((h) => h.username === 'thetaking')).toBeDefined();
      expect(handles.find((h) => h.username === 'mortarcombat')).toBeDefined();
    });

    test('lists updated handles after adding', () => {
      const newHandle: AuthorizedHandle = {
        username: 'newuser',
        policy: 'instant-execute',
        rooms: 'all',
      };

      authority.addHandle(newHandle);

      const handles = authority.listHandles();
      expect(handles).toHaveLength(3);
      expect(handles.find((h) => h.username === 'newuser')).toBeDefined();
    });

    test('lists updated handles after removing', () => {
      authority.removeHandle('thetaking');

      const handles = authority.listHandles();
      expect(handles).toHaveLength(1);
      expect(handles.find((h) => h.username === 'thetaking')).toBeUndefined();
    });
  });

  describe('room-specific authorization', () => {
    test('handles room-specific policies correctly', () => {
      const restrictedHandle: AuthorizedHandle = {
        username: 'restricted',
        discordId: '111111111111111111',
        policy: 'instant-execute',
        rooms: ['semantic', 'finance'],
      };

      authority.addHandle(restrictedHandle);

      expect(authority.canExecuteInRoom('restricted', 'semantic')).toBe(true);
      expect(authority.canExecuteInRoom('restricted', 'finance')).toBe(true);
      expect(authority.canExecuteInRoom('restricted', 'crypto')).toBe(false);
      expect(authority.canExecuteInRoom('restricted', 'unknown-room')).toBe(false);
    });

    test('non-instant-execute policy blocks execution', () => {
      const confirmHandle: AuthorizedHandle = {
        username: 'needsconfirm',
        policy: 'confirm-first',
        rooms: 'all',
      };

      authority.addHandle(confirmHandle);

      expect(authority.isAuthorized('needsconfirm')).toBe(true);
      expect(authority.canExecuteInRoom('needsconfirm', 'semantic')).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('handles case-insensitive username lookup', () => {
      expect(authority.isAuthorized('THETAKING')).toBe(true);
      expect(authority.isAuthorized('ThEtAkInG')).toBe(true);
      expect(authority.isAuthorized('thetaking')).toBe(true);
    });

    test('Discord IDs are case-sensitive (snowflakes are numeric strings)', () => {
      // Discord IDs are numeric, so case shouldn't matter, but we test exact match
      expect(authority.isAuthorizedById('419474619733377024')).toBe(true);
      expect(authority.isAuthorizedById('419474619733377025')).toBe(false);
    });

    test('handles undefined Discord ID gracefully in isAuthorizedByEither', () => {
      expect(authority.isAuthorizedByEither('thetaking', undefined)).toBe(true);
      expect(authority.isAuthorizedByEither('wronguser', undefined)).toBe(false);
    });

    test('handles empty strings gracefully', () => {
      expect(authority.isAuthorized('')).toBe(false);
      expect(authority.isAuthorizedById('')).toBe(false);
      expect(authority.isAuthorizedByEither('', '')).toBe(false);
    });
  });

  describe('environment variable loading', () => {
    test('loads Discord IDs from environment variables', () => {
      const thetakingPolicy = authority.getPolicy('thetaking');
      const mortarcombatPolicy = authority.getPolicy('mortarcombat');

      expect(thetakingPolicy?.discordId).toBe('419474619733377024');
      expect(mortarcombatPolicy?.discordId).toBe('468146259467698187');
    });

    test('handles missing environment variables gracefully', () => {
      // Create a new instance without setting env vars
      delete process.env.THETAKING_DISCORD_ID;
      delete process.env.MORTARCOMBAT_DISCORD_ID;

      const emptyAuthority = new HandleAuthority(mockLogger);

      // Username-based auth should still work
      expect(emptyAuthority.isAuthorized('thetaking')).toBe(true);

      // ID-based auth should fail gracefully (undefined discordId)
      const policy = emptyAuthority.getPolicy('thetaking');
      expect(policy?.discordId).toBeUndefined();
    });
  });
});
