/**
 * grid-state-writer.ts — Push pointer events from bot actions
 * Phase: Phase 4 — Tesseract Grid Integration (Reality Bridge)
 *
 * NOTE: Implementation moved to src/grid/tesseract-client.ts and src/grid/event-bridge.ts
 * This file re-exports for backward compatibility.
 */

import {
  pushPointerEvent,
  pushPointerEvents,
  gridEventBridge,
  type PointerEvent,
  type PointerEventResponse,
  type GridEvent,
} from './grid/index.js';

export const MODULE_NAME = 'grid-state-writer';

/**
 * Push a single pointer event to tesseract.nu
 */
export async function writePointerEvent(
  cellId: string,
  eventType: string,
  data?: Record<string, unknown>
): Promise<PointerEventResponse> {
  return await pushPointerEvent(cellId, eventType, data);
}

/**
 * Push multiple pointer events as a batch
 */
export async function writeBatchPointerEvents(
  events: Array<{ cellId: string; eventType: string; data?: Record<string, unknown> }>
): Promise<PointerEventResponse[]> {
  return await pushPointerEvents(events);
}

/**
 * Record task completion to both local bridge and remote API
 */
export async function recordTaskCompletion(
  phase: number,
  taskText: string,
  metadata?: Record<string, unknown>
): Promise<{ localEvent: GridEvent | null; remoteResponse: PointerEventResponse | null }> {
  // 1. Emit local event
  const localEvent = gridEventBridge.onTaskComplete(phase, taskText, metadata);

  if (!localEvent) {
    return { localEvent: null, remoteResponse: null };
  }

  // 2. Push to remote API
  const remoteResponse = await pushPointerEvent(localEvent.cell, 'task-complete', {
    phase,
    task: taskText,
    timestamp: localEvent.timestamp,
    ...metadata,
  });

  return { localEvent, remoteResponse };
}

// Re-export types
export type { PointerEvent, PointerEventResponse, GridEvent };
