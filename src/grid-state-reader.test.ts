/**
 * src/grid-state-reader.test.ts — Tests for grid-state-reader
 *
 * Verifies the backward-compatible re-export wrapper delegates
 * correctly to the grid module and enriches metadata as expected.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./grid/index.js', () => ({
  fetchGridState: vi.fn(),
  checkHealth: vi.fn(),
}));

import { readGridState, checkApiHealth, readGridStateWithMetadata, MODULE_NAME } from './grid-state-reader.js';
import { fetchGridState, checkHealth } from './grid/index.js';

const mockFetchGridState = vi.mocked(fetchGridState);
const mockCheckHealth = vi.mocked(checkHealth);

describe('grid-state-reader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the correct module name', () => {
    expect(MODULE_NAME).toBe('grid-state-reader');
  });

  describe('readGridState', () => {
    it('delegates to fetchGridState and returns cell pressures', async () => {
      const fakePressures = { A1: 0.8, A2: 0.3, B1: 0.5 };
      mockFetchGridState.mockResolvedValue(fakePressures);

      const result = await readGridState();

      expect(mockFetchGridState).toHaveBeenCalledOnce();
      expect(result).toEqual(fakePressures);
    });

    it('propagates errors from fetchGridState', async () => {
      mockFetchGridState.mockRejectedValue(new Error('network timeout'));

      await expect(readGridState()).rejects.toThrow('network timeout');
    });
  });

  describe('checkApiHealth', () => {
    it('delegates to checkHealth and returns status', async () => {
      const fakeHealth = { healthy: true, version: '2.0.0', latencyMs: 42 };
      mockCheckHealth.mockResolvedValue(fakeHealth);

      const result = await checkApiHealth();

      expect(mockCheckHealth).toHaveBeenCalledOnce();
      expect(result).toEqual(fakeHealth);
    });

    it('propagates errors from checkHealth', async () => {
      mockCheckHealth.mockRejectedValue(new Error('service unavailable'));

      await expect(checkApiHealth()).rejects.toThrow('service unavailable');
    });
  });

  describe('readGridStateWithMetadata', () => {
    it('wraps cell pressures with timestamp and version', async () => {
      const fakePressures = { A1: 0.9, B2: 0.1 };
      mockFetchGridState.mockResolvedValue(fakePressures);

      const result = await readGridStateWithMetadata();

      expect(result.cellPressures).toEqual(fakePressures);
      expect(result.version).toBe('1.0.0');
      expect(typeof result.timestamp).toBe('string');
      // Timestamp should be a valid ISO string
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
