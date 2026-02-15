/**
 * grid/index.ts — Tesseract Grid Module Exports
 *
 * ASCII rendering and API client for Discord bot integration
 */
// ASCII Renderer exports
export { renderGrid, renderGridEmbed, GRID_CELLS, ROW_LABELS, } from './ascii-renderer.js';
// Tesseract Client exports
export { fetchGridState, pushPointerEvent, pushPointerEvents, checkHealth, getApiUrl, } from './tesseract-client.js';
// Grid Event System exports
export { GridEventBridge, gridEventBridge, } from './event-bridge';
export { HotCellRouter, hotCellRouter, } from './hot-cell-router';
export { DeepLinker, deepLinker, CELL_NAMES, ROOM_TO_CELLS, } from './deep-linker';
// Spec Drift Detector exports
export { generateDriftSignal, CELL_MAPPINGS, } from './spec-drift-detector';
//# sourceMappingURL=index.js.map