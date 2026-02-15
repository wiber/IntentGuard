/**
 * tesseract-playground.test.ts — Tests for Tesseract Playground Server
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TesseractPlayground, type PlaygroundConfig } from './tesseract-playground.js';

describe('TesseractPlayground', () => {
  let playground: TesseractPlayground;
  const testPort = 13456; // Different port to avoid conflicts

  const testConfig: Partial<PlaygroundConfig> = {
    port: testPort,
    host: '127.0.0.1',
    corsOrigins: ['http://localhost:3000'],
    rateLimit: {
      enabled: true,
      maxRequestsPerMinute: 100,
    },
  };

  beforeAll(async () => {
    playground = new TesseractPlayground(testConfig);
  });

  afterAll(async () => {
    if (playground.isRunning()) {
      await playground.stop();
    }
  });

  it('should create playground instance with config', () => {
    const config = playground.getConfig();
    expect(config.port).toBe(testPort);
    expect(config.host).toBe('127.0.0.1');
  });

  it('should start server successfully', async () => {
    await playground.start();
    expect(playground.isRunning()).toBe(true);
  });

  it('should respond to health check', async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/api/health`);
    expect(response.status).toBe(200);

    const data = await response.json() as { healthy: boolean; version: string };
    expect(data.healthy).toBe(true);
    expect(data.version).toBeDefined();
  });

  it('should return grid state', async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/api/grid/state`);
    expect(response.status).toBe(200);

    const data = await response.json() as {
      cellPressures: Record<string, number>;
      timestamp: string;
      version: string;
    };

    expect(data.cellPressures).toBeDefined();
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBe('1.0.0');

    // Check all 12 cells exist
    const expectedCells = [
      'A1', 'A2', 'A3', 'A4',
      'B1', 'B2', 'B3', 'B4',
      'C1', 'C2', 'C3', 'C4',
    ];

    for (const cell of expectedCells) {
      expect(cell in data.cellPressures).toBe(true);
      expect(typeof data.cellPressures[cell]).toBe('number');
    }
  });

  it('should accept pointer events', async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/api/grid/pointer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cellId: 'A1',
        eventType: 'test-event',
        data: { test: true },
      }),
    });

    // Request is processed - may return 200 (success) or 500 (external API unavailable)
    // Either way, we should get a structured JSON response
    expect([200, 500]).toContain(response.status);
    const data = await response.json() as { success?: boolean; error?: string };
    expect('success' in data || 'error' in data).toBe(true);
  });

  it('should reject invalid pointer events', async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/api/grid/pointer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cellId: 'INVALID',
        eventType: 'test-event',
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json() as { error: string };
    expect(data.error).toContain('Invalid cellId');
  });

  it('should serve playground HTML interface', async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/playground`);
    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).toContain('Tesseract.nu Playground');
    expect(html).toContain('IntentGuard');
    expect(html).toContain('API Documentation');
  });

  it('should handle CORS preflight', async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/api/grid/state`, {
      method: 'OPTIONS',
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
  });

  it('should return 404 for unknown routes', async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/unknown/route`);
    expect(response.status).toBe(404);

    const data = await response.json() as { error: string };
    expect(data.error).toBe('Not found');
  });

  it('should stop server successfully', async () => {
    await playground.stop();
    expect(playground.isRunning()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// Integration Test
// ═══════════════════════════════════════════════════════════════

describe('TesseractPlayground Integration', () => {
  it('should handle multiple concurrent requests', async () => {
    const playground = new TesseractPlayground({ port: 13457, host: '127.0.0.1' });
    await playground.start();

    try {
      const requests = Array.from({ length: 10 }, () =>
        fetch('http://127.0.0.1:13457/api/grid/state')
      );

      const responses = await Promise.all(requests);
      for (const response of responses) {
        expect(response.status).toBe(200);
      }
    } finally {
      await playground.stop();
    }
  });

  it('should handle batch pointer events', async () => {
    const playground = new TesseractPlayground({ port: 13458, host: '127.0.0.1' });
    await playground.start();

    try {
      const response = await fetch('http://127.0.0.1:13458/api/grid/pointer/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [
            { cellId: 'A1', eventType: 'test-1', data: {} },
            { cellId: 'B2', eventType: 'test-2', data: {} },
            { cellId: 'C3', eventType: 'test-3', data: {} },
          ],
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as { results: unknown[] };
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBe(3);
    } finally {
      await playground.stop();
    }
  });
});
