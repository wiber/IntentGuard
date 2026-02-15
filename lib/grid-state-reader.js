/**
 * grid-state-reader.ts — Fetch current cell pressures from tesseract.nu
 * Phase: Phase 4 — Tesseract Grid Integration (Reality Bridge)
 *
 * NOTE: Implementation moved to src/grid/tesseract-client.ts
 * This file re-exports for backward compatibility.
 */
import { fetchGridState, checkHealth, } from './grid/index.js';
export const MODULE_NAME = 'grid-state-reader';
/**
 * Read current grid state from tesseract.nu
 * Returns cell pressures for all 12 cells
 */
export async function readGridState() {
    return await fetchGridState();
}
/**
 * Check if tesseract.nu API is available
 */
export async function checkApiHealth() {
    return await checkHealth();
}
/**
 * Get grid state with full metadata
 */
export async function readGridStateWithMetadata() {
    const cellPressures = await fetchGridState();
    return {
        cellPressures,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    };
}
//# sourceMappingURL=grid-state-reader.js.map