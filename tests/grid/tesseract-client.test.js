"use strict";
/**
 * tesseract-client.test.ts — Tests for tesseract.nu HTTP Client
 *
 * Tests all API operations with mocked fetch responses:
 * - fetchGridState: GET /grid/state
 * - pushPointerEvent: POST /grid/pointer
 * - pushPointerEvents: POST /grid/pointer/batch
 * - checkHealth: GET /health
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tesseract_client_1 = require("./tesseract-client");
// ═══════════════════════════════════════════════════════════════
// Mock Setup
// ═══════════════════════════════════════════════════════════════
const mockFetch = jest.fn();
global.fetch = mockFetch;
// Mock console to suppress error logs during tests
const originalConsoleError = console.error;
beforeEach(() => {
    console.error = jest.fn();
    mockFetch.mockReset();
});
afterEach(() => {
    console.error = originalConsoleError;
    jest.clearAllTimers();
});
// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════
function mockSuccessResponse(data, status = 200) {
    return Promise.resolve({
        ok: true,
        status,
        statusText: 'OK',
        json: async () => data,
        text: async () => JSON.stringify(data),
    });
}
function mockErrorResponse(status, message, errorData) {
    return Promise.resolve({
        ok: false,
        status,
        statusText: message,
        json: async () => errorData || { error: message },
        text: async () => message,
    });
}
function mockNetworkError() {
    return Promise.reject(new Error('Network error'));
}
function mockTimeoutError() {
    return Promise.reject(Object.assign(new Error('AbortError'), { name: 'AbortError' }));
}
// ═══════════════════════════════════════════════════════════════
// Tests: fetchGridState
// ═══════════════════════════════════════════════════════════════
describe('fetchGridState', () => {
    it('should fetch grid state successfully', async () => {
        const mockGridState = {
            cellPressures: {
                A1: 0.8,
                A2: 0.6,
                A3: 0.4,
                A4: 0.2,
                B1: 0.9,
                B2: 0.7,
                B3: 0.5,
                B4: 0.3,
                C1: 1.0,
                C2: 0.8,
                C3: 0.6,
                C4: 0.4,
            },
            timestamp: '2026-02-15T10:00:00Z',
            version: '1.0.0',
        };
        mockFetch.mockReturnValue(mockSuccessResponse(mockGridState));
        const result = await (0, tesseract_client_1.fetchGridState)();
        expect(result).toEqual(mockGridState.cellPressures);
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/grid/state'), expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
                'Content-Type': 'application/json',
                'User-Agent': 'IntentGuard/1.8.3',
            }),
        }));
    });
    it('should return default state on HTTP error', async () => {
        mockFetch.mockReturnValue(mockErrorResponse(500, 'Internal Server Error'));
        const result = await (0, tesseract_client_1.fetchGridState)();
        // Should return zeroed grid state
        const expectedCells = [
            'A1', 'A2', 'A3', 'A4',
            'B1', 'B2', 'B3', 'B4',
            'C1', 'C2', 'C3', 'C4',
        ];
        for (const cell of expectedCells) {
            expect(result[cell]).toBe(0);
        }
    });
    it('should return default state on network error', async () => {
        mockFetch.mockReturnValue(mockNetworkError());
        const result = await (0, tesseract_client_1.fetchGridState)();
        // Should return zeroed grid state
        expect(Object.keys(result)).toHaveLength(12);
        expect(Object.values(result).every(v => v === 0)).toBe(true);
    });
    it('should return default state on timeout', async () => {
        mockFetch.mockReturnValue(mockTimeoutError());
        const result = await (0, tesseract_client_1.fetchGridState)();
        expect(Object.values(result).every(v => v === 0)).toBe(true);
    });
    it('should use custom API URL from environment', async () => {
        const originalUrl = process.env.TESSERACT_API_URL;
        process.env.TESSERACT_API_URL = 'https://custom.tesseract.nu/api';
        const mockGridState = {
            cellPressures: { A1: 0.5 },
            timestamp: '2026-02-15T10:00:00Z',
        };
        mockFetch.mockReturnValue(mockSuccessResponse(mockGridState));
        await (0, tesseract_client_1.fetchGridState)();
        expect(mockFetch).toHaveBeenCalledWith('https://custom.tesseract.nu/api/grid/state', expect.any(Object));
        // Restore
        if (originalUrl) {
            process.env.TESSERACT_API_URL = originalUrl;
        }
        else {
            delete process.env.TESSERACT_API_URL;
        }
    });
});
// ═══════════════════════════════════════════════════════════════
// Tests: pushPointerEvent
// ═══════════════════════════════════════════════════════════════
describe('pushPointerEvent', () => {
    it('should push pointer event successfully', async () => {
        const mockResponse = {
            success: true,
            message: 'Event processed',
            gridState: {
                cellPressures: { A1: 0.9 },
                timestamp: '2026-02-15T10:00:00Z',
            },
        };
        mockFetch.mockReturnValue(mockSuccessResponse(mockResponse));
        const result = await (0, tesseract_client_1.pushPointerEvent)('A1', 'click', { intensity: 0.9 });
        expect(result.success).toBe(true);
        expect(result.message).toBe('Event processed');
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/grid/pointer'), expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
                'Content-Type': 'application/json',
                'User-Agent': 'IntentGuard/1.8.3',
            }),
            body: expect.stringContaining('"cellId":"A1"'),
        }));
    });
    it('should include timestamp and source in event', async () => {
        mockFetch.mockReturnValue(mockSuccessResponse({ success: true }));
        await (0, tesseract_client_1.pushPointerEvent)('B2', 'hover');
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody).toHaveProperty('timestamp');
        expect(callBody.source).toBe('intentguard-bot');
        expect(callBody.cellId).toBe('B2');
        expect(callBody.eventType).toBe('hover');
    });
    it('should handle event with no data', async () => {
        mockFetch.mockReturnValue(mockSuccessResponse({ success: true }));
        await (0, tesseract_client_1.pushPointerEvent)('C3', 'tap');
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.data).toEqual({});
    });
    it('should return failure response on HTTP error', async () => {
        mockFetch.mockReturnValue(mockErrorResponse(403, 'Forbidden'));
        const result = await (0, tesseract_client_1.pushPointerEvent)('A1', 'click');
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
    });
    it('should return failure response on network error', async () => {
        mockFetch.mockReturnValue(mockNetworkError());
        const result = await (0, tesseract_client_1.pushPointerEvent)('A1', 'click');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Network error');
    });
});
// ═══════════════════════════════════════════════════════════════
// Tests: pushPointerEvents (batch)
// ═══════════════════════════════════════════════════════════════
describe('pushPointerEvents', () => {
    it('should push batch pointer events successfully', async () => {
        const mockResponse = {
            results: [
                { success: true, message: 'Event 1 processed' },
                { success: true, message: 'Event 2 processed' },
                { success: true, message: 'Event 3 processed' },
            ],
        };
        mockFetch.mockReturnValue(mockSuccessResponse(mockResponse));
        const events = [
            { cellId: 'A1', eventType: 'click', data: { intensity: 0.8 } },
            { cellId: 'B2', eventType: 'hover', data: { duration: 500 } },
            { cellId: 'C3', eventType: 'tap' },
        ];
        const results = await (0, tesseract_client_1.pushPointerEvents)(events);
        expect(results).toHaveLength(3);
        expect(results.every(r => r.success)).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/grid/pointer/batch'), expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"events"'),
        }));
    });
    it('should include timestamps for all events in batch', async () => {
        mockFetch.mockReturnValue(mockSuccessResponse({ results: [{ success: true }] }));
        const events = [{ cellId: 'A1', eventType: 'click' }];
        await (0, tesseract_client_1.pushPointerEvents)(events);
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.events[0]).toHaveProperty('timestamp');
        expect(callBody.events[0].source).toBe('intentguard-bot');
    });
    it('should return failure responses for all events on error', async () => {
        mockFetch.mockReturnValue(mockErrorResponse(500, 'Internal Server Error'));
        const events = [
            { cellId: 'A1', eventType: 'click' },
            { cellId: 'B2', eventType: 'hover' },
        ];
        const results = await (0, tesseract_client_1.pushPointerEvents)(events);
        expect(results).toHaveLength(2);
        expect(results.every(r => !r.success)).toBe(true);
    });
    it('should handle empty events array', async () => {
        mockFetch.mockReturnValue(mockSuccessResponse({ results: [] }));
        const results = await (0, tesseract_client_1.pushPointerEvents)([]);
        expect(results).toHaveLength(0);
    });
    it('should handle network error for batch', async () => {
        mockFetch.mockReturnValue(mockNetworkError());
        const events = [
            { cellId: 'A1', eventType: 'click' },
            { cellId: 'B2', eventType: 'hover' },
        ];
        const results = await (0, tesseract_client_1.pushPointerEvents)(events);
        expect(results).toHaveLength(2);
        expect(results.every(r => !r.success)).toBe(true);
    });
});
// ═══════════════════════════════════════════════════════════════
// Tests: checkHealth
// ═══════════════════════════════════════════════════════════════
describe('checkHealth', () => {
    it('should return healthy status with latency', async () => {
        const mockHealthData = {
            version: '1.0.0',
            timestamp: '2026-02-15T10:00:00Z',
        };
        mockFetch.mockReturnValue(mockSuccessResponse(mockHealthData));
        const result = await (0, tesseract_client_1.checkHealth)();
        expect(result.healthy).toBe(true);
        expect(result.version).toBe('1.0.0');
        expect(result.timestamp).toBe('2026-02-15T10:00:00Z');
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
    it('should return unhealthy on HTTP error', async () => {
        mockFetch.mockReturnValue(mockErrorResponse(503, 'Service Unavailable'));
        const result = await (0, tesseract_client_1.checkHealth)();
        expect(result.healthy).toBe(false);
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
    it('should return unhealthy on network error', async () => {
        mockFetch.mockReturnValue(mockNetworkError());
        const result = await (0, tesseract_client_1.checkHealth)();
        expect(result.healthy).toBe(false);
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
    it('should use shorter timeout for health checks', async () => {
        mockFetch.mockReturnValue(mockSuccessResponse({ version: '1.0.0' }));
        await (0, tesseract_client_1.checkHealth)();
        // Check that fetch was called with signal (indicates timeout setup)
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.objectContaining({
            signal: expect.any(Object),
        }));
    });
});
// ═══════════════════════════════════════════════════════════════
// Tests: Configuration
// ═══════════════════════════════════════════════════════════════
describe('Configuration', () => {
    it('should return default API URL', () => {
        const originalUrl = process.env.TESSERACT_API_URL;
        delete process.env.TESSERACT_API_URL;
        const url = (0, tesseract_client_1.getApiUrl)();
        expect(url).toBe('https://tesseract.nu/api');
        // Restore
        if (originalUrl) {
            process.env.TESSERACT_API_URL = originalUrl;
        }
    });
    it('should return custom API URL from environment', () => {
        const originalUrl = process.env.TESSERACT_API_URL;
        process.env.TESSERACT_API_URL = 'https://custom.tesseract.nu/api';
        const url = (0, tesseract_client_1.getApiUrl)();
        expect(url).toBe('https://custom.tesseract.nu/api');
        // Restore
        if (originalUrl) {
            process.env.TESSERACT_API_URL = originalUrl;
        }
        else {
            delete process.env.TESSERACT_API_URL;
        }
    });
});
// ═══════════════════════════════════════════════════════════════
// Tests: Error Handling
// ═══════════════════════════════════════════════════════════════
describe('Error Handling', () => {
    it('should handle malformed JSON response', async () => {
        mockFetch.mockReturnValue(Promise.resolve({
            ok: true,
            status: 200,
            json: async () => {
                throw new Error('Invalid JSON');
            },
        }));
        await expect((0, tesseract_client_1.fetchGridState)()).rejects.toThrow();
    });
    it('should handle error with details in response', async () => {
        const errorDetails = {
            error: 'Validation failed',
            fields: ['cellId'],
        };
        mockFetch.mockReturnValue(Promise.resolve({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: async () => errorDetails,
        }));
        const result = await (0, tesseract_client_1.pushPointerEvent)('INVALID', 'click');
        expect(result.success).toBe(false);
    });
    it('should handle timeout with AbortError', async () => {
        const abortError = new Error('AbortError');
        abortError.name = 'AbortError';
        mockFetch.mockRejectedValue(abortError);
        const result = await (0, tesseract_client_1.fetchGridState)();
        // Should return default state on timeout
        expect(Object.values(result).every(v => v === 0)).toBe(true);
    });
});
// ═══════════════════════════════════════════════════════════════
// Tests: Integration Scenarios
// ═══════════════════════════════════════════════════════════════
describe('Integration Scenarios', () => {
    it('should fetch grid state and push event sequentially', async () => {
        // First call: fetch grid state
        mockFetch.mockReturnValueOnce(mockSuccessResponse({
            cellPressures: { A1: 0.5 },
            timestamp: '2026-02-15T10:00:00Z',
        }));
        // Second call: push event
        mockFetch.mockReturnValueOnce(mockSuccessResponse({
            success: true,
            gridState: {
                cellPressures: { A1: 0.9 },
                timestamp: '2026-02-15T10:00:01Z',
            },
        }));
        const initialState = await (0, tesseract_client_1.fetchGridState)();
        expect(initialState.A1).toBe(0.5);
        const eventResult = await (0, tesseract_client_1.pushPointerEvent)('A1', 'click', { intensity: 0.9 });
        expect(eventResult.success).toBe(true);
        expect(eventResult.gridState?.cellPressures.A1).toBe(0.9);
    });
    it('should check health before operations', async () => {
        // Health check
        mockFetch.mockReturnValueOnce(mockSuccessResponse({
            version: '1.0.0',
            timestamp: '2026-02-15T10:00:00Z',
        }));
        // Grid state fetch
        mockFetch.mockReturnValueOnce(mockSuccessResponse({
            cellPressures: { A1: 0.7 },
            timestamp: '2026-02-15T10:00:00Z',
        }));
        const health = await (0, tesseract_client_1.checkHealth)();
        expect(health.healthy).toBe(true);
        if (health.healthy) {
            const state = await (0, tesseract_client_1.fetchGridState)();
            expect(state.A1).toBe(0.7);
        }
    });
    it('should handle partial batch success', async () => {
        const mockResponse = {
            results: [
                { success: true, message: 'Event 1 processed' },
                { success: false, message: 'Event 2 failed: invalid cell' },
                { success: true, message: 'Event 3 processed' },
            ],
        };
        mockFetch.mockReturnValue(mockSuccessResponse(mockResponse));
        const events = [
            { cellId: 'A1', eventType: 'click' },
            { cellId: 'INVALID', eventType: 'click' },
            { cellId: 'C3', eventType: 'tap' },
        ];
        const results = await (0, tesseract_client_1.pushPointerEvents)(events);
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(false);
        expect(results[2].success).toBe(true);
    });
});
