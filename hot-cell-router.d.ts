/**
 * hot-cell-router.ts — Tesseract Hot-Cell Router
 *
 * Calculates cell pressure based on event frequency and routes priority to cognitive rooms.
 * Implements pressure-based decision making for distributed AI coordination.
 */
import type { GridEvent } from './event-bridge';
/**
 * Cell pressure data
 */
export interface CellPressure {
    cell: string;
    pressure: number;
    eventCount: number;
    lastEvent: string;
    room: string;
}
/**
 * Routing recommendation
 */
export interface RoutingRecommendation {
    room: string;
    cells: string[];
    totalPressure: number;
    reason: string;
}
/**
 * HotCellRouter — Calculate pressure and route to cognitive rooms
 */
export declare class HotCellRouter {
    private readonly eventsPath;
    private cellPressures;
    constructor(eventsPath?: string);
    /**
     * Load events from JSONL file
     */
    private loadEvents;
    /**
     * Update cell pressures based on event frequency
     *
     * Pressure calculation:
     * - Recent events (last hour) = 1.0 weight
     * - Events in last 6 hours = 0.5 weight
     * - Events in last 24 hours = 0.2 weight
     * - Normalized to 0.0-1.0 scale
     *
     * @param events - Optional event list (defaults to loading from file)
     * @returns Record of cell pressures
     */
    updatePressures(events?: GridEvent[]): Record<string, number>;
    /**
     * Get cells above pressure threshold
     *
     * @param threshold - Pressure threshold (0.0-1.0, default 0.7)
     * @returns Array of hot cell IDs
     */
    getHotCells(threshold?: number): string[];
    /**
     * Get routing recommendation based on hot cells
     *
     * @param hotCells - Optional pre-calculated hot cells
     * @returns Routing recommendation with room priority
     */
    routeToRoom(hotCells?: string[]): RoutingRecommendation;
    /**
     * Get all cell pressures
     */
    getAllPressures(): CellPressure[];
    /**
     * Get pressure for specific cell
     */
    getCellPressure(cell: string): CellPressure | undefined;
    /**
     * Get summary report
     */
    getSummary(): string;
}
/**
 * Singleton instance for easy import
 */
export declare const hotCellRouter: HotCellRouter;
