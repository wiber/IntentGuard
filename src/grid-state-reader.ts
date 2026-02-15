/**
 * grid-state-reader.ts — Fetch current cell pressures from tesseract.nu
 * Phase: Phase 4 — Tesseract Grid Integration (Reality Bridge)
 *
 * NOTE: Implementation moved to src/grid/tesseract-client.ts
 * This file re-exports for backward compatibility.
 */

import {
  fetchGridState,
  checkHealth,
  type GridState,
  type HealthStatus,
} from './grid/index.js';

export const MODULE_NAME = 'grid-state-reader';

/**
 * Read current grid state from tesseract.nu
 * Returns cell pressures for all 12 cells
 */
export async function readGridState(): Promise<Record<string, number>> {
  return await fetchGridState();
}

/**
 * Check if tesseract.nu API is available
 */
export async function checkApiHealth(): Promise<HealthStatus> {
  return await checkHealth();
}

/**
 * Get grid state with full metadata
 */
export async function readGridStateWithMetadata(): Promise<GridState> {
  const cellPressures = await fetchGridState();
  return {
    cellPressures,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };
}

// Re-export types
export type { GridState, HealthStatus };
