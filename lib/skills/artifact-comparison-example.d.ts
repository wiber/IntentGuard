/**
 * src/skills/artifact-comparison-example.ts — Usage Examples
 *
 * Demonstrates how to integrate the artifact comparison system with
 * artifact generation workflow and Discord reporting.
 */
/**
 * Generate an artifact and save it to history.
 * Call this whenever a new artifact is generated.
 */
export declare function generateAndSaveArtifact(identityVector: number[], sovereignty: number): void;
/**
 * Compare the current sovereignty state against the most recent snapshot.
 * Use this to detect significant changes before generating a new artifact.
 */
export declare function checkForSignificantChange(identityVector: number[], sovereignty: number): {
    hasChanged: boolean;
    summary: string;
};
/**
 * Generate Discord-friendly report comparing two artifacts.
 * Post this to #trust-debt-public or #ops-board.
 */
export declare function generateDiscordReport(timestamp1: string, timestamp2: string): string;
/**
 * Generate a summary of recent artifact evolution.
 * Useful for weekly reports or #trust-debt-public posts.
 */
export declare function generateHistorySummary(limit?: number): string;
/**
 * CEO loop hook: Check if it's time to generate a new artifact.
 * Generate only if significant change has occurred.
 */
export declare function maybeGenerateArtifact(identityVector: number[], sovereignty: number, discordNotify: (message: string) => Promise<void>): Promise<boolean>;
/**
 * Discord command: !compare-artifacts
 * Compare any two artifacts from history.
 */
export declare function handleCompareCommand(args: string[]): string;
/**
 * Detect if sovereignty has been stable for N days.
 * Trigger special artifact generation on 30-day stability.
 */
export declare function checkStabilityMilestone(daysThreshold?: number): {
    isStable: boolean;
    duration: number;
    message: string;
};
//# sourceMappingURL=artifact-comparison-example.d.ts.map