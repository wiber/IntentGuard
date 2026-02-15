/**
 * src/runtime-sovereignty-integration.ts — Sovereignty Monitor Integration
 *
 * Connects sovereignty monitor to runtime, artifact generator, and Discord.
 *
 * INTEGRATION:
 *   - Binds monitor to artifact generator
 *   - Binds monitor to Discord notifications
 *   - Wires scheduler task to daily stability check
 *   - Records sovereignty from pipeline step 4
 *
 * USAGE:
 *   Import and call initializeSovereigntyMonitor(runtime) during startup.
 */
import { SovereigntyMonitor } from './auth/sovereignty-monitor.js';
import type { Logger } from './types.js';
/**
 * Initialize sovereignty monitor and bind to runtime.
 *
 * Call this during runtime startup to enable 30-day stability monitoring.
 *
 * @param log - Logger instance
 * @param artifactGenerator - Callback to generate artifact
 * @param discordNotify - Callback to send Discord message
 * @returns Configured SovereigntyMonitor instance
 */
export declare function initializeSovereigntyMonitor(log: Logger, artifactGenerator: (score: number, stableDays: number) => Promise<string>, discordNotify: (message: string) => Promise<void>): SovereigntyMonitor;
/**
 * Load latest sovereignty from pipeline and record to monitor.
 *
 * Call this after pipeline step 4 completes.
 *
 * @param monitor - SovereigntyMonitor instance
 * @param log - Logger instance
 */
export declare function recordSovereigntyFromPipeline(monitor: SovereigntyMonitor, log: Logger): void;
/**
 * Scheduler task handler for daily stability check.
 *
 * Call this from the scheduler when sovereignty-stability-check task triggers.
 *
 * @param monitor - SovereigntyMonitor instance
 * @param log - Logger instance
 * @returns Stability analysis result message
 */
export declare function handleStabilityCheck(monitor: SovereigntyMonitor, log: Logger): Promise<string>;
/**
 * Get sovereignty monitor status for dashboard/commands.
 *
 * @param monitor - SovereigntyMonitor instance
 * @returns Formatted status string
 */
export declare function getSovereigntyStatus(monitor: SovereigntyMonitor): string;
/**
 * Example integration with artifact generator.
 *
 * This shows how to wire the monitor to the artifact generation system.
 *
 * @param userId - User ID for artifact generation
 * @returns Path to generated artifact
 */
export declare function generateStabilityArtifact(userId: string, score: number, stableDays: number): Promise<string>;
/**
 * Example integration with Discord notifications.
 *
 * This shows how to format and send stability milestone messages.
 *
 * @param message - Message to send
 * @returns Promise that resolves when sent
 */
export declare function sendStabilityNotification(message: string): Promise<void>;
//# sourceMappingURL=runtime-sovereignty-integration.d.ts.map