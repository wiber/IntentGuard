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
export interface PlaygroundConfig {
    port: number;
    host: string;
    corsOrigins: string[];
    rateLimit: {
        enabled: boolean;
        maxRequestsPerMinute: number;
    };
    authentication: {
        enabled: boolean;
        apiKeys?: string[];
    };
}
export declare class TesseractPlayground {
    private server;
    private config;
    constructor(config?: Partial<PlaygroundConfig>);
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
    getConfig(): PlaygroundConfig;
}
export declare function startPlaygroundServer(config?: Partial<PlaygroundConfig>): Promise<TesseractPlayground>;
//# sourceMappingURL=tesseract-playground.d.ts.map