/**
 * tesseract-client.ts — HTTP Client for tesseract.nu API
 *
 * Communicates with the tesseract.nu backend to:
 * - Fetch current grid state (cell pressures)
 * - Push pointer events (bot actions → grid updates)
 */
declare function getApiUrl(): string;
export interface GridState {
    cellPressures: Record<string, number>;
    timestamp: string;
    version?: string;
}
export interface PointerEvent {
    cellId: string;
    eventType: string;
    data?: Record<string, unknown>;
    timestamp?: string;
    source?: string;
}
export interface PointerEventResponse {
    success: boolean;
    message?: string;
    gridState?: GridState;
}
export interface ApiError {
    error: string;
    status: number;
    details?: unknown;
}
/**
 * Fetch current grid state from tesseract.nu
 * Returns cell pressures for all 12 cells
 */
export declare function fetchGridState(): Promise<Record<string, number>>;
/**
 * Push a pointer event to tesseract.nu
 * Events represent bot actions that should update grid state
 */
export declare function pushPointerEvent(cellId: string, eventType: string, data?: Record<string, unknown>): Promise<PointerEventResponse>;
/**
 * Batch push multiple pointer events
 * More efficient than individual pushes
 */
export declare function pushPointerEvents(events: Array<{
    cellId: string;
    eventType: string;
    data?: Record<string, unknown>;
}>): Promise<PointerEventResponse[]>;
export interface HealthStatus {
    healthy: boolean;
    version?: string;
    timestamp?: string;
    latencyMs?: number;
}
/**
 * Check if tesseract.nu API is reachable
 */
export declare function checkHealth(): Promise<HealthStatus>;
export { getApiUrl };
//# sourceMappingURL=tesseract-client.d.ts.map