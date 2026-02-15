/**
 * event-bridge.ts — Tesseract Grid Event Bridge
 *
 * Wires task completions to grid cell events with POINTER_CREATE emissions.
 * Stores events in data/grid-events.jsonl for hot-cell pressure analysis.
 */
/**
 * Grid event structure
 */
export interface GridEvent {
    timestamp: string;
    type: 'POINTER_CREATE' | 'PRESSURE_UPDATE' | 'CELL_ACTIVATE';
    cell: string;
    phase: number;
    task: string;
    intersection: string;
    metadata?: Record<string, unknown>;
}
/**
 * GridEventBridge — Emit grid events on task completions
 */
export declare class GridEventBridge {
    private readonly eventsPath;
    private readonly dataDir;
    constructor(dataDir?: string);
    /**
     * Ensure data directory exists
     */
    private ensureDataDir;
    /**
     * Handle task completion and emit POINTER_CREATE event to matching grid cell
     *
     * @param phase - Task phase (0-9)
     * @param taskText - Task description
     * @param metadata - Optional metadata
     */
    onTaskComplete(phase: number, taskText: string, metadata?: Record<string, unknown>): GridEvent | null;
    /**
     * Emit a grid event (write to JSONL)
     */
    private emitEvent;
    /**
     * Batch emit multiple events
     */
    emitBatch(events: GridEvent[]): void;
    /**
     * Create a custom event (for manual triggers)
     */
    createEvent(type: GridEvent['type'], cell: string, phase: number, task: string, metadata?: Record<string, unknown>): GridEvent;
    /**
     * Get events file path
     */
    getEventsPath(): string;
}
/**
 * Singleton instance for easy import
 */
export declare const gridEventBridge: GridEventBridge;
//# sourceMappingURL=event-bridge.d.ts.map