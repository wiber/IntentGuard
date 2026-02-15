/**
 * grid-state-reader.ts — Fetch current cell pressures from tesseract.nu
 * Phase: Phase 4 — Tesseract Grid Integration (Reality Bridge)
 *
 * NOTE: Implementation moved to src/grid/tesseract-client.ts
 * This file re-exports for backward compatibility.
 */
import { type GridState, type HealthStatus } from './grid/index.js';
export declare const MODULE_NAME = "grid-state-reader";
/**
 * Read current grid state from tesseract.nu
 * Returns cell pressures for all 12 cells
 */
export declare function readGridState(): Promise<Record<string, number>>;
/**
 * Check if tesseract.nu API is available
 */
export declare function checkApiHealth(): Promise<HealthStatus>;
/**
 * Get grid state with full metadata
 */
export declare function readGridStateWithMetadata(): Promise<GridState>;
export type { GridState, HealthStatus };
//# sourceMappingURL=grid-state-reader.d.ts.map