/**
 * grid-state-writer.ts — Push pointer events from bot actions
 * Phase: Phase 4 — Tesseract Grid Integration (Reality Bridge)
 *
 * NOTE: Implementation moved to src/grid/tesseract-client.ts and src/grid/event-bridge.ts
 * This file re-exports for backward compatibility.
 */
import { type PointerEvent, type PointerEventResponse, type GridEvent } from './grid/index.js';
export declare const MODULE_NAME = "grid-state-writer";
/**
 * Push a single pointer event to tesseract.nu
 */
export declare function writePointerEvent(cellId: string, eventType: string, data?: Record<string, unknown>): Promise<PointerEventResponse>;
/**
 * Push multiple pointer events as a batch
 */
export declare function writeBatchPointerEvents(events: Array<{
    cellId: string;
    eventType: string;
    data?: Record<string, unknown>;
}>): Promise<PointerEventResponse[]>;
/**
 * Record task completion to both local bridge and remote API
 */
export declare function recordTaskCompletion(phase: number, taskText: string, metadata?: Record<string, unknown>): Promise<{
    localEvent: GridEvent | null;
    remoteResponse: PointerEventResponse | null;
}>;
export type { PointerEvent, PointerEventResponse, GridEvent };
//# sourceMappingURL=grid-state-writer.d.ts.map