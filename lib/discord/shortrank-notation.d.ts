/**
 * src/discord/shortrank-notation.ts — Tesseract ShortRank Intersection Notation
 *
 * Every tweet, every update, every cognitive room message gets tagged with
 * its ShortRank intersection: `📡 B3 Tactics.Signal : 🔌 C1 Operations.Grid`
 *
 * The 12-cell grid (3x3 + 3 parents) maps to the 20 trust-debt categories.
 * ThetaSteer (Ollama) does the categorization; this module formats the output.
 *
 * CELLS:
 *   🏛️ A  Strategy         ⚡ B  Tactics          🔧 C  Operations
 *   ⚖️ A1 Strategy.Law     🏎️ B1 Tactics.Speed    🔌 C1 Operations.Grid
 *   🎯 A2 Strategy.Goal    🤝 B2 Tactics.Deal     🔄 C2 Operations.Loop
 *   💰 A3 Strategy.Fund    📡 B3 Tactics.Signal    🌊 C3 Operations.Flow
 *
 * INTERSECTION: source_cell : target_cell
 *   Means "this content connects [source] to [target]"
 *   Self-intersection (A1:A1) = pure category signal
 */
export interface TesseractCell {
    code: string;
    emoji: string;
    parent: string;
    name: string;
    fullName: string;
    trustCategories: string[];
    room: string;
}
export interface ShortRankIntersection {
    source: TesseractCell;
    target: TesseractCell;
    notation: string;
    compact: string;
    isSelfRef: boolean;
}
/** The 12-cell tesseract grid */
export declare const TESSERACT_CELLS: Record<string, TesseractCell>;
/**
 * Detect the best tesseract cell for a piece of text.
 * Returns the cell code (e.g., 'B3') and confidence.
 */
export declare function detectCell(text: string): {
    cell: string;
    confidence: number;
};
/**
 * Map trust-debt categories to the best tesseract cell.
 */
export declare function trustCategoriesToCell(categories: string[]): string;
/**
 * Build a ShortRank intersection from source and target cell codes.
 */
export declare function intersection(sourceCode: string, targetCode: string): ShortRankIntersection;
/**
 * Auto-detect intersection from text content.
 * Finds the two most relevant cells and creates the intersection.
 */
export declare function autoIntersection(text: string): ShortRankIntersection;
/**
 * Format a tweet with ShortRank intersection prefix.
 *
 * Example output:
 *   📡 B3 Tactics.Signal : 🔌 C1 Operations.Grid
 *   Pipeline complete. Sovereignty: 58% | Trust Debt: 35 units.
 *   🟡 S:58% | #IntentGuard
 */
export declare function formatTweetWithIntersection(text: string, sourceCode: string, targetCode: string, sovereignty: number): string;
/**
 * Generate a pivotal question for a cognitive room based on cell context.
 */
export declare function pivotalQuestion(cellCode: string, context: string): {
    question: string;
    predictedAnswer: string;
    room: string;
};
/**
 * Get the cognitive room a cell routes to.
 */
export declare function cellToRoom(cellCode: string): string;
/**
 * Get the cell for a cognitive room.
 */
export declare function roomToCell(room: string): TesseractCell | undefined;
//# sourceMappingURL=shortrank-notation.d.ts.map