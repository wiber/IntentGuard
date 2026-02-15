/**
 * event-bridge.ts — Tesseract Grid Event Bridge
 *
 * Wires task completions to grid cell events with POINTER_CREATE emissions.
 * Stores events in data/grid-events.jsonl for hot-cell pressure analysis.
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Grid event structure
 */
export interface GridEvent {
  timestamp: string;
  type: 'POINTER_CREATE' | 'PRESSURE_UPDATE' | 'CELL_ACTIVATE';
  cell: string;
  phase: number;
  task: string;
  intersection: string; // Format: 'SOURCE:TARGET'
  metadata?: Record<string, unknown>;
}

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
const PHASE_TO_CELL: Record<number, string> = {
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

const CELL_NAMES: Record<string, string> = {
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
export class GridEventBridge {
  private readonly eventsPath: string;
  private readonly dataDir: string;

  constructor(dataDir: string = join(process.cwd(), 'data')) {
    this.dataDir = dataDir;
    this.eventsPath = join(dataDir, 'grid-events.jsonl');
    this.ensureDataDir();
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDir(): void {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Handle task completion and emit POINTER_CREATE event to matching grid cell
   *
   * @param phase - Task phase (0-9)
   * @param taskText - Task description
   * @param metadata - Optional metadata
   */
  onTaskComplete(
    phase: number,
    taskText: string,
    metadata?: Record<string, unknown>
  ): GridEvent | null {
    const cell = PHASE_TO_CELL[phase];

    if (!cell) {
      console.warn(`[GridEventBridge] No cell mapping for phase ${phase}`);
      return null;
    }

    const cellName = CELL_NAMES[cell] || 'Unknown';
    const event: GridEvent = {
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
  private emitEvent(event: GridEvent): void {
    try {
      const line = JSON.stringify(event) + '\n';
      appendFileSync(this.eventsPath, line, 'utf8');
      console.log(`[GridEventBridge] Event emitted: ${event.type} → ${event.cell}:${CELL_NAMES[event.cell]}`);
    } catch (error) {
      console.error('[GridEventBridge] Failed to emit event:', error);
    }
  }

  /**
   * Batch emit multiple events
   */
  emitBatch(events: GridEvent[]): void {
    try {
      const lines = events.map(e => JSON.stringify(e) + '\n').join('');
      appendFileSync(this.eventsPath, lines, 'utf8');
      console.log(`[GridEventBridge] Batch emitted: ${events.length} events`);
    } catch (error) {
      console.error('[GridEventBridge] Failed to emit batch:', error);
    }
  }

  /**
   * Create a custom event (for manual triggers)
   */
  createEvent(
    type: GridEvent['type'],
    cell: string,
    phase: number,
    task: string,
    metadata?: Record<string, unknown>
  ): GridEvent {
    const cellName = CELL_NAMES[cell] || 'Unknown';
    const event: GridEvent = {
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
  getEventsPath(): string {
    return this.eventsPath;
  }
}

/**
 * Singleton instance for easy import
 */
export const gridEventBridge = new GridEventBridge();
