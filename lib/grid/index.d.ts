/**
 * grid/index.ts — Tesseract Grid Module Exports
 *
 * ASCII rendering and API client for Discord bot integration
 */
export { renderGrid, renderGridEmbed, GRID_CELLS, ROW_LABELS, type RecentEvent, type GridEmbed, } from './ascii-renderer.js';
export { fetchGridState, pushPointerEvent, pushPointerEvents, checkHealth, getApiUrl, type GridState, type PointerEvent, type PointerEventResponse, type HealthStatus, type ApiError, } from './tesseract-client.js';
export { GridEventBridge, gridEventBridge, type GridEvent, } from './event-bridge';
export { HotCellRouter, hotCellRouter, type CellPressure, type RoutingRecommendation, } from './hot-cell-router';
export { DeepLinker, deepLinker, CELL_NAMES, ROOM_TO_CELLS, } from './deep-linker';
export { generateDriftSignal, CELL_MAPPINGS, type CellMapping, type CellIntent, type CellReality, type CellDrift, type DriftSignal, } from './spec-drift-detector';
//# sourceMappingURL=index.d.ts.map