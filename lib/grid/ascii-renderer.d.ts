/**
 * ascii-renderer.ts — Discord ASCII Grid Renderer
 *
 * Renders the 12-cell tesseract grid with ANSI heat coloring for Discord.
 * Grid layout: 3 rows (Strategy, Tactics, Operations) x 4 columns
 * Heat mapping: green (cold 0-0.3), yellow (warm 0.3-0.7), red (hot 0.7-1.0)
 */
interface GridCell {
    id: string;
    label: string;
    row: number;
    col: number;
}
declare const GRID_CELLS: GridCell[];
declare const ROW_LABELS: string[];
export interface RecentEvent {
    cellId: string;
    type: string;
    timestamp: Date;
    description?: string;
}
export declare function renderGrid(cellPressures: Record<string, number>): string;
export interface GridEmbed {
    title: string;
    description: string;
    color: number;
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    footer?: {
        text: string;
    };
    timestamp?: string;
}
export declare function renderGridEmbed(cellPressures: Record<string, number>, recentEvents?: RecentEvent[]): GridEmbed;
export { GRID_CELLS, ROW_LABELS };
//# sourceMappingURL=ascii-renderer.d.ts.map