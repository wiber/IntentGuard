"use strict";
/**
 * tesseract-client.ts — HTTP Client for tesseract.nu API
 *
 * Communicates with the tesseract.nu backend to:
 * - Fetch current grid state (cell pressures)
 * - Push pointer events (bot actions → grid updates)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGridState = fetchGridState;
exports.pushPointerEvent = pushPointerEvent;
exports.pushPointerEvents = pushPointerEvents;
exports.checkHealth = checkHealth;
exports.getApiUrl = getApiUrl;
// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════
const DEFAULT_API_URL = 'https://tesseract.nu/api';
const API_TIMEOUT_MS = 10000; // 10 seconds
function getApiUrl() {
    return process.env.TESSERACT_API_URL || DEFAULT_API_URL;
}
// ═══════════════════════════════════════════════════════════════
// HTTP Utilities
// ═══════════════════════════════════════════════════════════════
async function fetchWithTimeout(url, options, timeoutMs = API_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    }
    catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
    }
}
async function handleApiResponse(response) {
    if (!response.ok) {
        let errorDetails;
        try {
            errorDetails = await response.json();
        }
        catch {
            errorDetails = await response.text();
        }
        const apiError = {
            error: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
            details: errorDetails,
        };
        throw new Error(JSON.stringify(apiError));
    }
    return await response.json();
}
// ═══════════════════════════════════════════════════════════════
// Grid State Operations
// ═══════════════════════════════════════════════════════════════
/**
 * Fetch current grid state from tesseract.nu
 * Returns cell pressures for all 12 cells
 */
async function fetchGridState() {
    const url = `${getApiUrl()}/grid/state`;
    try {
        const response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'IntentGuard/1.8.3',
            },
        });
        const gridState = await handleApiResponse(response);
        // Return just the cell pressures
        return gridState.cellPressures;
    }
    catch (error) {
        console.error('[TesseractClient] Failed to fetch grid state:', error);
        // Return default zeroed state on error
        return getDefaultGridState();
    }
}
/**
 * Returns a default grid state with all cells at 0 pressure
 */
function getDefaultGridState() {
    const cells = [
        'A1', 'A2', 'A3', 'A4',
        'B1', 'B2', 'B3', 'B4',
        'C1', 'C2', 'C3', 'C4',
    ];
    const state = {};
    for (const cell of cells) {
        state[cell] = 0;
    }
    return state;
}
// ═══════════════════════════════════════════════════════════════
// Pointer Event Operations
// ═══════════════════════════════════════════════════════════════
/**
 * Push a pointer event to tesseract.nu
 * Events represent bot actions that should update grid state
 */
async function pushPointerEvent(cellId, eventType, data) {
    const url = `${getApiUrl()}/grid/pointer`;
    const event = {
        cellId,
        eventType,
        data: data || {},
        timestamp: new Date().toISOString(),
        source: 'intentguard-bot',
    };
    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'IntentGuard/1.8.3',
            },
            body: JSON.stringify(event),
        });
        const result = await handleApiResponse(response);
        return result;
    }
    catch (error) {
        console.error('[TesseractClient] Failed to push pointer event:', error);
        // Return failure response
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Batch push multiple pointer events
 * More efficient than individual pushes
 */
async function pushPointerEvents(events) {
    const url = `${getApiUrl()}/grid/pointer/batch`;
    const batchEvents = events.map(e => ({
        cellId: e.cellId,
        eventType: e.eventType,
        data: e.data || {},
        timestamp: new Date().toISOString(),
        source: 'intentguard-bot',
    }));
    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'IntentGuard/1.8.3',
            },
            body: JSON.stringify({ events: batchEvents }),
        });
        const result = await handleApiResponse(response);
        return result.results;
    }
    catch (error) {
        console.error('[TesseractClient] Failed to push pointer events batch:', error);
        // Return failure responses for all events
        return events.map(() => ({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
        }));
    }
}
/**
 * Check if tesseract.nu API is reachable
 */
async function checkHealth() {
    const url = `${getApiUrl()}/health`;
    const startTime = Date.now();
    try {
        const response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'IntentGuard/1.8.3',
            },
        }, 5000); // Shorter timeout for health checks
        const latencyMs = Date.now() - startTime;
        if (response.ok) {
            const data = await response.json();
            return {
                healthy: true,
                version: data.version,
                timestamp: data.timestamp,
                latencyMs,
            };
        }
        return {
            healthy: false,
            latencyMs,
        };
    }
    catch (error) {
        const latencyMs = Date.now() - startTime;
        console.error('[TesseractClient] Health check failed:', error);
        return {
            healthy: false,
            latencyMs,
        };
    }
}
