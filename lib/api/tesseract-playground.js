/**
 * tesseract-playground.ts — Tesseract.nu Playground HTTP Server
 * Phase: Phase 5 — Open Playground
 *
 * Hosts a public HTTP API for the tesseract.nu playground:
 * - GET /api/grid/state → Fetch current grid cell pressures
 * - POST /api/grid/pointer → Push pointer event from external sources
 * - POST /api/grid/pointer/batch → Batch push multiple pointer events
 * - GET /api/health → Health check endpoint
 * - GET /playground → Interactive HTML playground interface
 *
 * This enables public visibility of the bot's tesseract grid state
 * and allows external integrations to interact with the grid.
 */
import { createServer } from 'http';
import { fetchGridState, pushPointerEvent } from '../grid/tesseract-client.js';
// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════
const DEFAULT_PORT = 3456;
const DEFAULT_HOST = '0.0.0.0';
const API_VERSION = '1.0.0';
const defaultConfig = {
    port: parseInt(process.env.TESSERACT_PLAYGROUND_PORT || `${DEFAULT_PORT}`),
    host: process.env.TESSERACT_PLAYGROUND_HOST || DEFAULT_HOST,
    corsOrigins: ['*'], // Allow all origins for public playground
    rateLimit: {
        enabled: true,
        maxRequestsPerMinute: 60,
    },
    authentication: {
        enabled: false, // Public playground, no auth required
    },
};
const rateLimitStore = new Map();
function checkRateLimit(ip, config) {
    if (!config.rateLimit.enabled)
        return true;
    const now = Date.now();
    const entry = rateLimitStore.get(ip);
    if (!entry || now > entry.resetTime) {
        rateLimitStore.set(ip, {
            requests: 1,
            resetTime: now + 60000, // 1 minute
        });
        return true;
    }
    if (entry.requests >= config.rateLimit.maxRequestsPerMinute) {
        return false;
    }
    entry.requests++;
    return true;
}
// ═══════════════════════════════════════════════════════════════
// HTTP Utilities
// ═══════════════════════════════════════════════════════════════
function setCorsHeaders(res, config) {
    const origin = config.corsOrigins.includes('*') ? '*' : config.corsOrigins[0];
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
}
function sendJson(res, statusCode, data, config) {
    setCorsHeaders(res, config);
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
}
function sendError(res, statusCode, message, config) {
    sendJson(res, statusCode, { error: message, timestamp: new Date().toISOString() }, config);
}
async function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            }
            catch (error) {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}
// ═══════════════════════════════════════════════════════════════
// Route Handlers
// ═══════════════════════════════════════════════════════════════
async function handleGetGridState(req, res, config) {
    try {
        const cellPressures = await fetchGridState();
        sendJson(res, 200, {
            cellPressures,
            timestamp: new Date().toISOString(),
            version: API_VERSION,
        }, config);
    }
    catch (error) {
        console.error('[TesseractPlayground] Failed to fetch grid state:', error);
        sendError(res, 500, 'Failed to fetch grid state', config);
    }
}
async function handlePostPointerEvent(req, res, config) {
    try {
        const body = (await parseJsonBody(req));
        if (!body.cellId || !body.eventType) {
            sendError(res, 400, 'Missing required fields: cellId, eventType', config);
            return;
        }
        // Validate cellId format (A1-A4, B1-B4, C1-C4)
        const validCells = [
            'A1', 'A2', 'A3', 'A4',
            'B1', 'B2', 'B3', 'B4',
            'C1', 'C2', 'C3', 'C4',
        ];
        if (!validCells.includes(body.cellId)) {
            sendError(res, 400, `Invalid cellId: ${body.cellId}. Must be one of: ${validCells.join(', ')}`, config);
            return;
        }
        const result = await pushPointerEvent(body.cellId, body.eventType, body.data || {});
        sendJson(res, result.success ? 200 : 500, result, config);
    }
    catch (error) {
        console.error('[TesseractPlayground] Failed to push pointer event:', error);
        sendError(res, 500, error instanceof Error ? error.message : 'Failed to push pointer event', config);
    }
}
async function handlePostBatchPointerEvents(req, res, config) {
    try {
        const body = (await parseJsonBody(req));
        if (!body.events || !Array.isArray(body.events)) {
            sendError(res, 400, 'Missing or invalid events array', config);
            return;
        }
        const results = [];
        for (const event of body.events) {
            const result = await pushPointerEvent(event.cellId, event.eventType, event.data);
            results.push(result);
        }
        sendJson(res, 200, { results }, config);
    }
    catch (error) {
        console.error('[TesseractPlayground] Failed to push batch pointer events:', error);
        sendError(res, 500, error instanceof Error ? error.message : 'Failed to push batch events', config);
    }
}
function handleHealthCheck(req, res, config) {
    sendJson(res, 200, {
        healthy: true,
        version: API_VERSION,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    }, config);
}
function handlePlaygroundInterface(req, res, config) {
    const html = generatePlaygroundHtml(config);
    setCorsHeaders(res, config);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
}
// ═══════════════════════════════════════════════════════════════
// Playground HTML Interface
// ═══════════════════════════════════════════════════════════════
function generatePlaygroundHtml(config) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tesseract.nu Playground — IntentGuard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Monaco', 'Courier New', monospace;
      background: #0a0a0a;
      color: #e0e0e0;
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      color: #888;
      margin-bottom: 2rem;
      font-size: 0.9rem;
    }
    .grid-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin: 2rem 0;
      max-width: 600px;
    }
    .cell {
      background: #1a1a1a;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
      transition: all 0.3s ease;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    .cell:hover {
      border-color: #667eea;
      transform: translateY(-2px);
    }
    .cell-id {
      font-weight: bold;
      font-size: 1.2rem;
      margin-bottom: 0.5rem;
    }
    .cell-pressure {
      font-size: 2rem;
      font-weight: bold;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .pressure-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.5s ease;
    }
    .controls {
      background: #1a1a1a;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 1.5rem;
      margin: 2rem 0;
    }
    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9rem;
      cursor: pointer;
      transition: transform 0.2s ease;
      margin-right: 0.5rem;
    }
    button:hover { transform: translateY(-2px); }
    button:active { transform: translateY(0); }
    .status {
      background: #1a1a1a;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
      font-size: 0.85rem;
    }
    .status.success { border-color: #4ade80; }
    .status.error { border-color: #f87171; }
    .api-docs {
      background: #1a1a1a;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 1.5rem;
      margin: 2rem 0;
    }
    .api-docs h2 {
      color: #667eea;
      margin-bottom: 1rem;
      font-size: 1.5rem;
    }
    .endpoint {
      background: #0a0a0a;
      border-left: 3px solid #667eea;
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 4px;
    }
    .method {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: bold;
      margin-right: 0.5rem;
      font-size: 0.75rem;
    }
    .method.get { background: #4ade80; color: #0a0a0a; }
    .method.post { background: #60a5fa; color: #0a0a0a; }
    code {
      background: #0a0a0a;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      color: #667eea;
    }
    pre {
      background: #0a0a0a;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      margin: 0.5rem 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧊 Tesseract.nu Playground</h1>
    <div class="subtitle">
      Live IntentGuard Tesseract Grid State — Phase 5 Open Playground
    </div>

    <div class="grid-container" id="grid">
      <!-- Grid cells will be populated by JavaScript -->
    </div>

    <div class="controls">
      <button onclick="refreshGrid()">🔄 Refresh Grid</button>
      <button onclick="toggleAutoRefresh()">⏱️ <span id="auto-refresh-label">Enable</span> Auto-Refresh</button>
    </div>

    <div class="status" id="status">
      <strong>Status:</strong> <span id="status-text">Ready</span>
    </div>

    <div class="api-docs">
      <h2>📖 API Documentation</h2>

      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/grid/state</code>
        <p style="margin-top:0.5rem;">Fetch current grid cell pressures.</p>
        <pre>{
  "cellPressures": { "A1": 0, "A2": 0, ... },
  "timestamp": "2026-02-15T12:00:00.000Z",
  "version": "1.0.0"
}</pre>
      </div>

      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/api/grid/pointer</code>
        <p style="margin-top:0.5rem;">Push a pointer event to update grid state.</p>
        <pre>{
  "cellId": "A1",
  "eventType": "task-complete",
  "data": { "phase": 0, "task": "Example task" }
}</pre>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/health</code>
        <p style="margin-top:0.5rem;">Health check endpoint.</p>
      </div>
    </div>
  </div>

  <script>
    const API_BASE = window.location.origin;
    let autoRefreshInterval = null;

    const CELLS = [
      'A1', 'A2', 'A3', 'A4',
      'B1', 'B2', 'B3', 'B4',
      'C1', 'C2', 'C3', 'C4'
    ];

    function setStatus(text, success = true) {
      const statusDiv = document.getElementById('status');
      const statusText = document.getElementById('status-text');
      statusText.textContent = text;
      statusDiv.className = 'status ' + (success ? 'success' : 'error');
    }

    async function refreshGrid() {
      try {
        setStatus('Fetching grid state...', true);
        const response = await fetch(\`\${API_BASE}/api/grid/state\`);

        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }

        const data = await response.json();
        renderGrid(data.cellPressures);
        setStatus(\`Updated at \${new Date(data.timestamp).toLocaleTimeString()}\`, true);
      } catch (error) {
        setStatus(\`Error: \${error.message}\`, false);
        console.error('Failed to fetch grid state:', error);
      }
    }

    function renderGrid(cellPressures) {
      const gridContainer = document.getElementById('grid');
      gridContainer.innerHTML = '';

      CELLS.forEach(cellId => {
        const pressure = cellPressures[cellId] || 0;
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.innerHTML = \`
          <div class="cell-id">\${cellId}</div>
          <div class="cell-pressure">\${pressure.toFixed(2)}</div>
          <div class="pressure-bar" style="width: \${Math.min(pressure * 10, 100)}%"></div>
        \`;
        cell.onclick = () => sendPointerEvent(cellId);
        gridContainer.appendChild(cell);
      });
    }

    async function sendPointerEvent(cellId) {
      try {
        setStatus(\`Sending event to \${cellId}...\`, true);
        const response = await fetch(\`\${API_BASE}/api/grid/pointer\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cellId,
            eventType: 'playground-click',
            data: { source: 'playground', timestamp: new Date().toISOString() }
          })
        });

        const result = await response.json();
        if (result.success) {
          setStatus(\`Event sent to \${cellId} successfully!\`, true);
          setTimeout(refreshGrid, 500);
        } else {
          setStatus(\`Failed to send event: \${result.message}\`, false);
        }
      } catch (error) {
        setStatus(\`Error: \${error.message}\`, false);
        console.error('Failed to send pointer event:', error);
      }
    }

    function toggleAutoRefresh() {
      const label = document.getElementById('auto-refresh-label');
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        label.textContent = 'Enable';
      } else {
        autoRefreshInterval = setInterval(refreshGrid, 5000);
        label.textContent = 'Disable';
        refreshGrid();
      }
    }

    // Initial load
    refreshGrid();
  </script>
</body>
</html>`;
}
// ═══════════════════════════════════════════════════════════════
// Request Router
// ═══════════════════════════════════════════════════════════════
async function handleRequest(req, res, config) {
    const clientIp = getClientIp(req);
    const url = req.url || '/';
    const method = req.method || 'GET';
    // CORS preflight
    if (method === 'OPTIONS') {
        setCorsHeaders(res, config);
        res.writeHead(204);
        res.end();
        return;
    }
    // Rate limiting
    if (!checkRateLimit(clientIp, config)) {
        sendError(res, 429, 'Rate limit exceeded. Please try again later.', config);
        return;
    }
    console.log(`[TesseractPlayground] ${method} ${url} from ${clientIp}`);
    // Route requests
    if (url === '/api/grid/state' && method === 'GET') {
        await handleGetGridState(req, res, config);
    }
    else if (url === '/api/grid/pointer' && method === 'POST') {
        await handlePostPointerEvent(req, res, config);
    }
    else if (url === '/api/grid/pointer/batch' && method === 'POST') {
        await handlePostBatchPointerEvents(req, res, config);
    }
    else if (url === '/api/health' && method === 'GET') {
        handleHealthCheck(req, res, config);
    }
    else if (url === '/playground' || url === '/' || url === '/index.html') {
        handlePlaygroundInterface(req, res, config);
    }
    else {
        sendError(res, 404, 'Not found', config);
    }
}
// ═══════════════════════════════════════════════════════════════
// Server Management
// ═══════════════════════════════════════════════════════════════
export class TesseractPlayground {
    server = null;
    config;
    constructor(config) {
        this.config = { ...defaultConfig, ...config };
    }
    start() {
        return new Promise((resolve, reject) => {
            if (this.server) {
                reject(new Error('Server is already running'));
                return;
            }
            this.server = createServer((req, res) => {
                handleRequest(req, res, this.config).catch(error => {
                    console.error('[TesseractPlayground] Request handler error:', error);
                    sendError(res, 500, 'Internal server error', this.config);
                });
            });
            this.server.on('error', reject);
            this.server.listen(this.config.port, this.config.host, () => {
                console.log(`[TesseractPlayground] Server listening on http://${this.config.host}:${this.config.port}`);
                console.log(`[TesseractPlayground] Playground UI: http://${this.config.host}:${this.config.port}/playground`);
                console.log(`[TesseractPlayground] API endpoint: http://${this.config.host}:${this.config.port}/api/grid/state`);
                resolve();
            });
        });
    }
    stop() {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                resolve();
                return;
            }
            this.server.close(error => {
                if (error) {
                    reject(error);
                }
                else {
                    this.server = null;
                    console.log('[TesseractPlayground] Server stopped');
                    resolve();
                }
            });
        });
    }
    isRunning() {
        return this.server !== null;
    }
    getConfig() {
        return { ...this.config };
    }
}
// ═══════════════════════════════════════════════════════════════
// Standalone Server Mode
// ═══════════════════════════════════════════════════════════════
export async function startPlaygroundServer(config) {
    const playground = new TesseractPlayground(config);
    await playground.start();
    return playground;
}
// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    const playground = new TesseractPlayground();
    playground.start().catch(error => {
        console.error('[TesseractPlayground] Failed to start server:', error);
        process.exit(1);
    });
    process.on('SIGINT', () => {
        console.log('\n[TesseractPlayground] Received SIGINT, shutting down...');
        playground.stop().then(() => process.exit(0));
    });
    process.on('SIGTERM', () => {
        console.log('\n[TesseractPlayground] Received SIGTERM, shutting down...');
        playground.stop().then(() => process.exit(0));
    });
}
//# sourceMappingURL=tesseract-playground.js.map