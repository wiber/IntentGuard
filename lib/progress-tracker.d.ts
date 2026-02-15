/**
 * progress-tracker.ts — Sovereign Engine Progress Analytics
 *
 * Reads 08-implementation-plan.tsx and reports completion metrics
 * Wires task completions to POINTER_CREATE events on tesseract.nu grid
 */
export interface PhaseProgress {
    id: string;
    name: string;
    done: number;
    wip: number;
    todo: number;
    total: number;
    percent: number;
}
export interface ProgressReport {
    phases: PhaseProgress[];
    totalDone: number;
    totalWip: number;
    totalTodo: number;
    percentComplete: number;
}
export interface TodoItem {
    phase: string;
    text: string;
    priority: number;
}
export interface PointerEvent {
    cell: string;
    eventType: string;
}
export default class ProgressTracker {
    private specPath;
    constructor(specPath?: string);
    /**
     * Parse the TypeScript spec file and extract phases
     * Uses regex to parse object literals since it's a .tsx file
     */
    parseSpec(): PhaseProgress[];
    /**
     * Get comprehensive progress report
     */
    getProgress(): ProgressReport;
    /**
     * Format progress report as ASCII table for Discord
     */
    formatForDiscord(): string;
    /**
     * Format progress as 280-char tweet
     */
    formatForTweet(): string;
    /**
     * Get next N highest-priority unfinished tasks
     * Priority: earlier phases first, then wip before todo
     */
    getNextTodos(count: number): TodoItem[];
    /**
     * Wire task completion to POINTER_CREATE event for tesseract.nu grid
     * Maps phase to ShortRank cell and generates event
     */
    onTaskComplete(phase: string, taskText: string): PointerEvent | null;
    /**
     * Get current status of a specific phase
     */
    getPhaseStatus(phaseId: string): PhaseProgress | null;
    /**
     * Get summary stats for dashboard/heartbeat
     */
    getSummary(): string;
    /**
     * Check if a specific task is complete
     */
    isTaskComplete(taskText: string): boolean;
    /**
     * Helper: Pad string to the right
     */
    private padRight;
    /**
     * Helper: Pad string to the left
     */
    private padLeft;
}
//# sourceMappingURL=progress-tracker.d.ts.map