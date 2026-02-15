/**
 * tesseract-client.ts — HTTP Client for tesseract.nu API
 *
 * Communicates with the tesseract.nu backend to:
 * - Fetch current grid state (cell pressures)
 * - Push pointer events (bot actions → grid updates)
 */

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const DEFAULT_API_URL = 'https://tesseract.nu/api';
const API_TIMEOUT_MS = 10000; // 10 seconds

function getApiUrl(): string {
  return process.env.TESSERACT_API_URL || DEFAULT_API_URL;
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// HTTP Utilities
// ═══════════════════════════════════════════════════════════════

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetails: unknown;
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = await response.text();
    }

    const apiError: ApiError = {
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
export async function fetchGridState(): Promise<Record<string, number>> {
  const url = `${getApiUrl()}/grid/state`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'IntentGuard/1.8.3',
      },
    });

    const gridState = await handleApiResponse<GridState>(response);

    // Return just the cell pressures
    return gridState.cellPressures;
  } catch (error) {
    console.error('[TesseractClient] Failed to fetch grid state:', error);

    // Return default zeroed state on error
    return getDefaultGridState();
  }
}

/**
 * Returns a default grid state with all cells at 0 pressure
 */
function getDefaultGridState(): Record<string, number> {
  const cells = [
    'A1', 'A2', 'A3', 'A4',
    'B1', 'B2', 'B3', 'B4',
    'C1', 'C2', 'C3', 'C4',
  ];

  const state: Record<string, number> = {};
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
export async function pushPointerEvent(
  cellId: string,
  eventType: string,
  data?: Record<string, unknown>
): Promise<PointerEventResponse> {
  const url = `${getApiUrl()}/grid/pointer`;

  const event: PointerEvent = {
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

    const result = await handleApiResponse<PointerEventResponse>(response);

    return result;
  } catch (error) {
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
export async function pushPointerEvents(
  events: Array<{ cellId: string; eventType: string; data?: Record<string, unknown> }>
): Promise<PointerEventResponse[]> {
  const url = `${getApiUrl()}/grid/pointer/batch`;

  const batchEvents: PointerEvent[] = events.map(e => ({
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

    const result = await handleApiResponse<{ results: PointerEventResponse[] }>(response);

    return result.results;
  } catch (error) {
    console.error('[TesseractClient] Failed to push pointer events batch:', error);

    // Return failure responses for all events
    return events.map(() => ({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
}

// ═══════════════════════════════════════════════════════════════
// Health Check
// ═══════════════════════════════════════════════════════════════

export interface HealthStatus {
  healthy: boolean;
  version?: string;
  timestamp?: string;
  latencyMs?: number;
}

/**
 * Check if tesseract.nu API is reachable
 */
export async function checkHealth(): Promise<HealthStatus> {
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
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error('[TesseractClient] Health check failed:', error);

    return {
      healthy: false,
      latencyMs,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

export { getApiUrl };
