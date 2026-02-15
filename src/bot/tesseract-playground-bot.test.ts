/**
 * bot/tesseract-playground-bot.test.ts — Test Suite for Playground Bot
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TesseractPlaygroundBot from './tesseract-playground-bot.js';
import type { Logger } from '../types.js';

// Use unique ports per test to avoid OS port reuse conflicts
let portCounter = 14000;
function getUniquePort(): number {
  return portCounter++;
}

describe('TesseractPlaygroundBot', () => {
  let bot: TesseractPlaygroundBot;
  let mockLogger: Logger;
  let testPort: number;

  beforeEach(() => {
    testPort = getUniquePort();
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    bot = new TesseractPlaygroundBot(mockLogger, {
      enabled: true,
      port: testPort,
      host: '127.0.0.1',
      autoStart: false,
      syncWithDiscord: false,
    });
  });

  afterEach(async () => {
    if (bot.isRunning()) {
      await bot.stop();
    }
  });

  describe('Initialization', () => {
    it('should create bot with default config', () => {
      expect(bot).toBeDefined();
      expect(bot.isRunning()).toBe(false);
    });

    it('should not auto-start when disabled', () => {
      const disabledBot = new TesseractPlaygroundBot(mockLogger, {
        enabled: false,
        autoStart: true,
      });

      expect(disabledBot.isRunning()).toBe(false);
    });
  });

  describe('Lifecycle', () => {
    it('should start and stop the playground server', async () => {
      await bot.start();
      expect(bot.isRunning()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting tesseract.nu playground')
      );

      await bot.stop();
      expect(bot.isRunning()).toBe(false);
    });

    it('should prevent double-start', async () => {
      await bot.start();
      await bot.start(); // Second start should warn
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Already running')
      );
      await bot.stop();
    });

    it('should handle stop when not running', async () => {
      await bot.stop(); // Should not throw
      expect(bot.isRunning()).toBe(false);
    });
  });

  describe('Status', () => {
    it('should return offline status when not running', async () => {
      const status = await bot.getStatus();
      expect(status.running).toBe(false);
      expect(status.uptime).toBeUndefined();
    });

    it('should return online status when running', async () => {
      await bot.start();
      const status = await bot.getStatus();

      expect(status.running).toBe(true);
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.port).toBe(testPort);
      expect(status.url).toBe(`http://127.0.0.1:${testPort}/playground`);

      await bot.stop();
    });

    it('should format status message correctly', async () => {
      const offlineMsg = bot.formatStatusMessage();
      expect(offlineMsg).toContain('Offline');

      await bot.start();
      const onlineMsg = bot.formatStatusMessage();
      expect(onlineMsg).toContain('Online');
      expect(onlineMsg).toContain(`127.0.0.1:${testPort}`);

      await bot.stop();
    });
  });

  describe('URL Helpers', () => {
    it('should return null URLs when offline', () => {
      expect(bot.getUrl()).toBeNull();
      expect(bot.getApiUrl()).toBeNull();
    });

    it('should return valid URLs when online', async () => {
      await bot.start();

      expect(bot.getUrl()).toBe(`http://127.0.0.1:${testPort}/playground`);
      expect(bot.getApiUrl()).toBe(`http://127.0.0.1:${testPort}/api`);

      await bot.stop();
    });
  });

  describe('Grid Sync', () => {
    it('should start grid sync when enabled', async () => {
      const syncPort = getUniquePort();
      const syncBot = new TesseractPlaygroundBot(mockLogger, {
        enabled: true,
        port: syncPort,
        host: '127.0.0.1',
        syncWithDiscord: true,
      });

      await syncBot.start();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Grid sync started')
      );

      await syncBot.stop();
    });

    it('should not start grid sync when disabled', async () => {
      await bot.start(); // syncWithDiscord: false

      const syncCall = (mockLogger.info as any).mock.calls.find((call: any[]) =>
        call[0].includes('Grid sync started')
      );
      expect(syncCall).toBeUndefined();

      await bot.stop();
    });
  });

  describe('Error Handling', () => {
    it('should handle start failure gracefully', async () => {
      // Use invalid port to trigger error
      const failBot = new TesseractPlaygroundBot(mockLogger, {
        enabled: true,
        port: -1, // Invalid port
        host: '127.0.0.1',
      });

      await expect(failBot.start()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
