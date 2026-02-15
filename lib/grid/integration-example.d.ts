/**
 * integration-example.ts — Complete Grid Module Integration
 *
 * Demonstrates how all grid modules work together:
 * - Event Bridge: Track task completions
 * - Hot Cell Router: Calculate pressures and route to rooms
 * - Tesseract Client: Sync with tesseract.nu API
 * - ASCII Renderer: Display grid in Discord
 * - Deep Linker: Generate navigation links
 */
export declare function handleTaskCompletion(phase: number, taskText: string, discordChannelId: string, discordMessageId: string): Promise<{
    gridEvent: import("./event-bridge.js").GridEvent;
    syncSuccess: boolean;
    hotCells: string[];
    deepLink: string;
} | undefined>;
export declare function handleGridStatusCommand(): Promise<{
    ascii: string;
    embed: import("./ascii-renderer.js").GridEmbed;
    pressures: {
        [x: string]: number;
    };
}>;
export declare function checkForHotCells(): Promise<{
    hasHotCells: boolean;
    alertMessage?: string;
    routing?: any;
}>;
export declare function processBatchTasks(tasks: Array<{
    phase: number;
    text: string;
}>): Promise<{
    processedCount: number;
    syncedCount: number;
    hotCells: string[];
    pressures: Record<string, number>;
}>;
export declare function generateTimelineView(cellId: string, hoursBack?: number): Promise<{
    message: string;
    timelineLink: string;
    cellData: import("./hot-cell-router.js").CellPressure | undefined;
}>;
export declare function compareHotCells(): Promise<{
    message: string;
    comparisonLink?: undefined;
    cellData?: undefined;
} | {
    message: string;
    comparisonLink: string;
    cellData: {
        cell: string;
        pressure: number;
        events: number;
        lastEvent: string | undefined;
    }[];
}>;
export declare function fullIntegrationDemo(): Promise<void>;
//# sourceMappingURL=integration-example.d.ts.map