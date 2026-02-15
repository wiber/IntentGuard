"use strict";
/**
 * event-bridge.ts — Tesseract Grid Event Bridge
 *
 * Wires task completions to grid cell events with POINTER_CREATE emissions.
 * Stores events in data/grid-events.jsonl for hot-cell pressure analysis.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gridEventBridge = exports.GridEventBridge = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Phase-to-cell mapping based on tesseract structure
 *
 * Phase 0 → A2:Goal   (Goal setting)
 * Phase 1 → B3:Signal (Signal detection)
 * Phase 2 → A1:Law    (Legal/Rules)
 * Phase 3 → B1:Speed  (Velocity)
 * Phase 4 → C1:Grid   (Grid operations)
 * Phase 6 → A3:Fund   (Finance)
 * Phase 7 → C3:Flow   (Flow state)
 * Phase 8 → B2:Deal   (Transactions)
 * Phase 9 → C2:Loop   (Feedback loops)
 */
const PHASE_TO_CELL = {
    0: 'A2',
    1: 'B3',
    2: 'A1',
    3: 'B1',
    4: 'C1',
    6: 'A3',
    7: 'C3',
    8: 'B2',
    9: 'C2',
};
const CELL_NAMES = {
    A1: 'Law',
    A2: 'Goal',
    A3: 'Fund',
    B1: 'Speed',
    B2: 'Deal',
    B3: 'Signal',
    C1: 'Grid',
    C2: 'Loop',
    C3: 'Flow',
};
/**
 * GridEventBridge — Emit grid events on task completions
 */
class GridEventBridge {
    constructor(dataDir = (0, path_1.join)(process.cwd(), 'data')) {
        this.dataDir = dataDir;
        this.eventsPath = (0, path_1.join)(dataDir, 'grid-events.jsonl');
        this.ensureDataDir();
    }
    /**
     * Ensure data directory exists
     */
    ensureDataDir() {
        if (!(0, fs_1.existsSync)(this.dataDir)) {
            (0, fs_1.mkdirSync)(this.dataDir, { recursive: true });
        }
    }
    /**
     * Handle task completion and emit POINTER_CREATE event to matching grid cell
     *
     * @param phase - Task phase (0-9)
     * @param taskText - Task description
     * @param metadata - Optional metadata
     */
    onTaskComplete(phase, taskText, metadata) {
        const cell = PHASE_TO_CELL[phase];
        if (!cell) {
            console.warn(`[GridEventBridge] No cell mapping for phase ${phase}`);
            return null;
        }
        const cellName = CELL_NAMES[cell] || 'Unknown';
        const event = {
            timestamp: new Date().toISOString(),
            type: 'POINTER_CREATE',
            cell,
            phase,
            task: taskText,
            intersection: `TASK:${cell}:${cellName}`,
            metadata,
        };
        this.emitEvent(event);
        return event;
    }
    /**
     * Emit a grid event (write to JSONL)
     */
    emitEvent(event) {
        try {
            const line = JSON.stringify(event) + '\n';
            (0, fs_1.appendFileSync)(this.eventsPath, line, 'utf8');
            console.log(`[GridEventBridge] Event emitted: ${event.type} → ${event.cell}:${CELL_NAMES[event.cell]}`);
        }
        catch (error) {
            console.error('[GridEventBridge] Failed to emit event:', error);
        }
    }
    /**
     * Batch emit multiple events
     */
    emitBatch(events) {
        try {
            const lines = events.map(e => JSON.stringify(e) + '\n').join('');
            (0, fs_1.appendFileSync)(this.eventsPath, lines, 'utf8');
            console.log(`[GridEventBridge] Batch emitted: ${events.length} events`);
        }
        catch (error) {
            console.error('[GridEventBridge] Failed to emit batch:', error);
        }
    }
    /**
     * Create a custom event (for manual triggers)
     */
    createEvent(type, cell, phase, task, metadata) {
        const cellName = CELL_NAMES[cell] || 'Unknown';
        const event = {
            timestamp: new Date().toISOString(),
            type,
            cell,
            phase,
            task,
            intersection: `CUSTOM:${cell}:${cellName}`,
            metadata,
        };
        this.emitEvent(event);
        return event;
    }
    /**
     * Get events file path
     */
    getEventsPath() {
        return this.eventsPath;
    }
}
exports.GridEventBridge = GridEventBridge;
/**
 * Singleton instance for easy import
 */
exports.gridEventBridge = new GridEventBridge();
